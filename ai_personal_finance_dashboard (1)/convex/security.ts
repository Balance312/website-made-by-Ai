import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  MutationCtx,
  QueryCtx,
  ActionCtx,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ─── Constants ────────────────────────────────────────────────────────────────

export const RATE_LIMITS: Record<string, { maxCount: number; windowMs: number }> = {
  addTransaction:   { maxCount: 60,  windowMs: 60_000 },       // 60/min
  addAccount:       { maxCount: 10,  windowMs: 60_000 },       // 10/min
  updateBudget:     { maxCount: 30,  windowMs: 60_000 },       // 30/min
  generateInsights: { maxCount: 5,   windowMs: 60_000 },       // 5/min
  seedDemoData:     { maxCount: 3,   windowMs: 3_600_000 },    // 3/hr
};

const MAX_STRING_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_AMOUNT = 1_000_000_000;
const VALID_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"];
const VALID_CATEGORIES = [
  "Food", "Housing", "Transport", "Entertainment", "Shopping",
  "Health", "Salary", "Freelance", "Utilities", "Transfer", "Other",
];
const VALID_COLORS = [
  "#f59e0b", "#6A4C93", "#10b981", "#B497BD", "#ec4899",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#f97316", "#94a3b8",
  "#f43f5e", "#64748b",
];

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/** Throws if not authenticated; returns userId. */
export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized: authentication required");
  return userId;
}

/** Verify that a document belongs to the authenticated user. */
export async function requireOwnership(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  tableName: "accounts" | "transactions" | "budgets" | "aiInsights",
  docId: Id<"accounts"> | Id<"transactions"> | Id<"budgets"> | Id<"aiInsights">,
): Promise<void> {
  const doc = await (ctx.db as any).get(docId);
  if (!doc) throw new Error("Not found");
  if (doc.userId !== userId) throw new Error("Forbidden: resource does not belong to you");
}

// ─── Input validation ─────────────────────────────────────────────────────────

export function validateString(value: string, fieldName: string, maxLen = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") throw new Error(`Invalid ${fieldName}: must be a string`);
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error(`Invalid ${fieldName}: must not be empty`);
  if (trimmed.length > maxLen) throw new Error(`Invalid ${fieldName}: exceeds max length of ${maxLen}`);
  // Strip null bytes and control characters
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return sanitized;
}

export function validateDescription(value: string): string {
  return validateString(value, "description", MAX_DESCRIPTION_LENGTH);
}

export function validateAmount(amount: number): number {
  if (typeof amount !== "number" || !isFinite(amount)) throw new Error("Invalid amount: must be a finite number");
  if (amount <= 0) throw new Error("Invalid amount: must be positive");
  if (amount > MAX_AMOUNT) throw new Error(`Invalid amount: exceeds maximum of ${MAX_AMOUNT}`);
  // Round to 2 decimal places to prevent floating-point abuse
  return Math.round(amount * 100) / 100;
}

export function validateCategory(category: string): string {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category: must be one of ${VALID_CATEGORIES.join(", ")}`);
  }
  return category;
}

export function validateCurrency(currency: string): string {
  if (!VALID_CURRENCIES.includes(currency)) {
    throw new Error(`Invalid currency: must be one of ${VALID_CURRENCIES.join(", ")}`);
  }
  return currency;
}

export function validateColor(color: string): string {
  // Accept any valid hex color or our known palette
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error("Invalid color: must be a 6-digit hex color (e.g. #6A4C93)");
  }
  return color.toLowerCase();
}

export function validateDate(date: number): number {
  if (typeof date !== "number" || !isFinite(date)) throw new Error("Invalid date");
  const now = Date.now();
  const tenYearsMs = 10 * 365 * 24 * 60 * 60 * 1000;
  if (date < now - tenYearsMs || date > now + 86_400_000) {
    throw new Error("Invalid date: must be within the last 10 years and not in the future");
  }
  return date;
}

export function validateAccountName(name: string): string {
  return validateString(name, "account name", 100);
}

export function validateBudgetLimit(limit: number): number {
  if (typeof limit !== "number" || !isFinite(limit)) throw new Error("Invalid budget limit");
  if (limit <= 0) throw new Error("Budget limit must be positive");
  if (limit > 10_000_000) throw new Error("Budget limit too large");
  return Math.round(limit * 100) / 100;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export const checkRateLimit = internalQuery({
  args: {
    userId: v.id("users"),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const cfg = RATE_LIMITS[args.action];
    if (!cfg) return { allowed: true, remaining: 999 };

    const windowStart = Math.floor(Date.now() / cfg.windowMs) * cfg.windowMs;

    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_and_action", (q) =>
        q.eq("userId", args.userId).eq("action", args.action),
      )
      .filter((q) => q.eq(q.field("windowStart"), windowStart))
      .unique();

    const count = record?.count ?? 0;
    return {
      allowed: count < cfg.maxCount,
      remaining: Math.max(0, cfg.maxCount - count),
      windowStart,
    };
  },
});

export const incrementRateLimit = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    windowStart: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_and_action", (q) =>
        q.eq("userId", args.userId).eq("action", args.action),
      )
      .filter((q) => q.eq(q.field("windowStart"), args.windowStart))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("rateLimits", {
        userId: args.userId,
        action: args.action,
        windowStart: args.windowStart,
        count: 1,
      });
    }
  },
});

// ─── Audit logging ────────────────────────────────────────────────────────────

export const writeAuditLog = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      userId: args.userId,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      metadata: args.metadata,
      success: args.success,
      errorMessage: args.errorMessage,
    });
  },
});

// ─── Stale rate-limit cleanup (called from cron) ──────────────────────────────

export const pruneStaleRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // older than 2 hours
    const stale = await ctx.db
      .query("rateLimits")
      .withIndex("by_window", (q) => q.lt("windowStart", cutoff))
      .collect();
    for (const r of stale) {
      await ctx.db.delete(r._id);
    }
  },
});
