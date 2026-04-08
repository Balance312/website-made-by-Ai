import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.union(v.literal("checking"), v.literal("savings"), v.literal("credit"), v.literal("investment")),
    balance: v.number(),
    currency: v.string(),
    color: v.string(),
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(),
    description: v.string(),
    date: v.number(),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_account", ["accountId"]),

  budgets: defineTable({
    userId: v.id("users"),
    category: v.string(),
    limit: v.number(),
    period: v.union(v.literal("monthly"), v.literal("weekly")),
    color: v.string(),
  }).index("by_user", ["userId"]),

  aiInsights: defineTable({
    userId: v.id("users"),
    content: v.string(),
    type: v.union(v.literal("tip"), v.literal("alert"), v.literal("recommendation")),
    generatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Rate limiting: track action counts per user per window
  rateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(),
    windowStart: v.number(),
    count: v.number(),
  })
    .index("by_user_and_action", ["userId", "action"])
    .index("by_window", ["windowStart"]),

  // Audit log: immutable record of sensitive operations
  auditLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON-encoded extra info
    ip: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
