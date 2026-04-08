import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  requireAuth,
  requireOwnership,
  validateAmount,
  validateCategory,
  validateCurrency,
  validateColor,
  validateDate,
  validateDescription,
  validateAccountName,
  validateBudgetLimit,
} from "./security";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getTransactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(Math.max(1, args.limit ?? 50), 200);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const getBudgets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getAiInsights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("aiInsights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addTransaction = mutation({
  args: {
    accountId: v.id("accounts"),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(),
    description: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Rate limit check
    const rl: { allowed: boolean; remaining: number; windowStart?: number } =
      await ctx.runQuery(internal.security.checkRateLimit, {
        userId,
        action: "addTransaction",
      });
    if (!rl.allowed) {
      await ctx.runMutation(internal.security.writeAuditLog, {
        userId,
        action: "addTransaction",
        resource: "transactions",
        success: false,
        errorMessage: "Rate limit exceeded",
      });
      throw new Error("Rate limit exceeded. Please slow down.");
    }

    // Validate & sanitize inputs
    const amount = validateAmount(args.amount);
    const category = validateCategory(args.category);
    const description = validateDescription(args.description);
    const date = validateDate(args.date);

    // Ownership: verify the account belongs to this user
    await requireOwnership(ctx, userId, "accounts", args.accountId);

    const txnId = await ctx.db.insert("transactions", {
      userId,
      accountId: args.accountId,
      amount,
      type: args.type,
      category,
      description,
      date,
    });

    // Update account balance
    const account = await ctx.db.get(args.accountId);
    if (account) {
      const delta = args.type === "income" ? amount : -amount;
      await ctx.db.patch(args.accountId, { balance: account.balance + delta });
    }

    await ctx.runMutation(internal.security.incrementRateLimit, {
      userId,
      action: "addTransaction",
      windowStart: rl.windowStart!,
    });

    await ctx.runMutation(internal.security.writeAuditLog, {
      userId,
      action: "addTransaction",
      resource: "transactions",
      resourceId: txnId,
      success: true,
    });

    return txnId;
  },
});

export const addAccount = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("checking"),
      v.literal("savings"),
      v.literal("credit"),
      v.literal("investment"),
    ),
    balance: v.number(),
    currency: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const rl: { allowed: boolean; remaining: number; windowStart?: number } =
      await ctx.runQuery(internal.security.checkRateLimit, {
        userId,
        action: "addAccount",
      });
    if (!rl.allowed) {
      await ctx.runMutation(internal.security.writeAuditLog, {
        userId,
        action: "addAccount",
        resource: "accounts",
        success: false,
        errorMessage: "Rate limit exceeded",
      });
      throw new Error("Rate limit exceeded. Please slow down.");
    }

    const name = validateAccountName(args.name);
    const currency = validateCurrency(args.currency);
    const color = validateColor(args.color);
    const absBalance = Math.abs(args.balance);
    const safeBalance = args.balance < 0 ? -absBalance : absBalance;

    // Cap total accounts per user at 20
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.length >= 20) {
      throw new Error("Account limit reached: maximum 20 accounts per user");
    }

    const accountId = await ctx.db.insert("accounts", {
      userId,
      name,
      type: args.type,
      balance: safeBalance,
      currency,
      color,
    });

    await ctx.runMutation(internal.security.incrementRateLimit, {
      userId,
      action: "addAccount",
      windowStart: rl.windowStart!,
    });

    await ctx.runMutation(internal.security.writeAuditLog, {
      userId,
      action: "addAccount",
      resource: "accounts",
      resourceId: accountId,
      success: true,
    });

    return accountId;
  },
});

export const updateBudget = mutation({
  args: {
    category: v.string(),
    limit: v.number(),
    period: v.union(v.literal("monthly"), v.literal("weekly")),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const rl: { allowed: boolean; remaining: number; windowStart?: number } =
      await ctx.runQuery(internal.security.checkRateLimit, {
        userId,
        action: "updateBudget",
      });
    if (!rl.allowed) throw new Error("Rate limit exceeded. Please slow down.");

    const category = validateCategory(args.category);
    const limit = validateBudgetLimit(args.limit);
    const color = validateColor(args.color);

    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("category"), category))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { limit, period: args.period, color });
    } else {
      const allBudgets = await ctx.db
        .query("budgets")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      if (allBudgets.length >= 20) {
        throw new Error("Budget limit reached: maximum 20 budgets per user");
      }
      await ctx.db.insert("budgets", { userId, category, limit, period: args.period, color });
    }

    await ctx.runMutation(internal.security.incrementRateLimit, {
      userId,
      action: "updateBudget",
      windowStart: rl.windowStart!,
    });

    await ctx.runMutation(internal.security.writeAuditLog, {
      userId,
      action: "updateBudget",
      resource: "budgets",
      metadata: JSON.stringify({ category }),
      success: true,
    });
  },
});

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const rl: { allowed: boolean; remaining: number; windowStart?: number } =
      await ctx.runQuery(internal.security.checkRateLimit, {
        userId,
        action: "seedDemoData",
      });
    if (!rl.allowed) return;

    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1);
    if (existing.length > 0) return;

    const checkingId = await ctx.db.insert("accounts", {
      userId, name: "Main Checking", type: "checking", balance: 4250.80, currency: "USD", color: "#6a4c93",
    });
    const savingsId = await ctx.db.insert("accounts", {
      userId, name: "Savings", type: "savings", balance: 12800.00, currency: "USD", color: "#10b981",
    });
    await ctx.db.insert("accounts", {
      userId, name: "Investment", type: "investment", balance: 31500.00, currency: "USD", color: "#8b5cf6",
    });

    const now = Date.now();
    const day = 86400000;

    const transactions = [
      { accountId: checkingId, amount: 4500, type: "income" as const, category: "Salary", description: "Monthly salary", date: now - 2 * day },
      { accountId: checkingId, amount: 1200, type: "expense" as const, category: "Housing", description: "Rent payment", date: now - 3 * day },
      { accountId: checkingId, amount: 85.50, type: "expense" as const, category: "Food", description: "Grocery store", date: now - 1 * day },
      { accountId: checkingId, amount: 45.00, type: "expense" as const, category: "Transport", description: "Gas station", date: now - 4 * day },
      { accountId: checkingId, amount: 120.00, type: "expense" as const, category: "Entertainment", description: "Netflix and Spotify", date: now - 5 * day },
      { accountId: checkingId, amount: 200.00, type: "expense" as const, category: "Food", description: "Restaurant dinner", date: now - 6 * day },
      { accountId: savingsId, amount: 500, type: "income" as const, category: "Transfer", description: "Monthly savings transfer", date: now - 2 * day },
      { accountId: checkingId, amount: 60.00, type: "expense" as const, category: "Health", description: "Gym membership", date: now - 7 * day },
      { accountId: checkingId, amount: 350.00, type: "expense" as const, category: "Shopping", description: "Clothing", date: now - 8 * day },
      { accountId: checkingId, amount: 95.00, type: "expense" as const, category: "Utilities", description: "Electric bill", date: now - 9 * day },
      { accountId: checkingId, amount: 750, type: "income" as const, category: "Freelance", description: "Design project", date: now - 10 * day },
      { accountId: checkingId, amount: 30.00, type: "expense" as const, category: "Transport", description: "Uber rides", date: now - 11 * day },
      { accountId: checkingId, amount: 180.00, type: "expense" as const, category: "Food", description: "Weekly groceries", date: now - 14 * day },
      { accountId: checkingId, amount: 55.00, type: "expense" as const, category: "Entertainment", description: "Movie tickets", date: now - 15 * day },
      { accountId: checkingId, amount: 4500, type: "income" as const, category: "Salary", description: "Monthly salary", date: now - 32 * day },
      { accountId: checkingId, amount: 1200, type: "expense" as const, category: "Housing", description: "Rent payment", date: now - 33 * day },
      { accountId: checkingId, amount: 420.00, type: "expense" as const, category: "Food", description: "Groceries and dining", date: now - 35 * day },
      { accountId: checkingId, amount: 90.00, type: "expense" as const, category: "Transport", description: "Monthly transit pass", date: now - 34 * day },
    ];

    for (const t of transactions) {
      await ctx.db.insert("transactions", { ...t, userId });
    }

    const budgets = [
      { category: "Food", limit: 600, period: "monthly" as const, color: "#f59e0b" },
      { category: "Housing", limit: 1300, period: "monthly" as const, color: "#6a4c93" },
      { category: "Transport", limit: 200, period: "monthly" as const, color: "#10b981" },
      { category: "Entertainment", limit: 150, period: "monthly" as const, color: "#b497bd" },
      { category: "Shopping", limit: 300, period: "monthly" as const, color: "#ec4899" },
      { category: "Health", limit: 100, period: "monthly" as const, color: "#14b8a6" },
    ];

    for (const b of budgets) {
      await ctx.db.insert("budgets", { ...b, userId });
    }

    await ctx.db.insert("aiInsights", {
      userId,
      content: "Your food spending is 77% of your monthly budget. Consider meal prepping to reduce dining out costs.",
      type: "alert",
      generatedAt: now,
    });
    await ctx.db.insert("aiInsights", {
      userId,
      content: "Great job! You saved $500 this month. At this rate, you will reach your emergency fund goal in 4 months.",
      type: "tip",
      generatedAt: now - day,
    });
    await ctx.db.insert("aiInsights", {
      userId,
      content: "Consider moving $200 from checking to your high-yield savings account to maximize interest earnings.",
      type: "recommendation",
      generatedAt: now - 2 * day,
    });

    await ctx.runMutation(internal.security.incrementRateLimit, {
      userId,
      action: "seedDemoData",
      windowStart: rl.windowStart!,
    });

    await ctx.runMutation(internal.security.writeAuditLog, {
      userId,
      action: "seedDemoData",
      resource: "accounts",
      success: true,
    });
  },
});

// ─── Read own audit log ───────────────────────────────────────────────────────

export const getMyAuditLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    return await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});
