import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./security";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const generateInsights = action({
  args: {
    totalIncome: v.number(),
    totalExpenses: v.number(),
    topCategories: v.array(v.object({ category: v.string(), amount: v.number() })),
    savingsRate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Rate limit check
    const rl: { allowed: boolean; remaining: number; windowStart?: number } =
      await ctx.runQuery(internal.security.checkRateLimit, {
        userId,
        action: "generateInsights",
      });
    if (!rl.allowed) {
      await ctx.runMutation(internal.security.writeAuditLog, {
        userId,
        action: "generateInsights",
        resource: "aiInsights",
        success: false,
        errorMessage: "Rate limit exceeded",
      });
      throw new Error("Rate limit exceeded: you can generate insights at most 5 times per minute.");
    }

    // Validate numeric inputs to prevent prompt injection via numbers
    const totalIncome = isFinite(args.totalIncome) ? Math.max(0, args.totalIncome) : 0;
    const totalExpenses = isFinite(args.totalExpenses) ? Math.max(0, args.totalExpenses) : 0;
    const savingsRate = isFinite(args.savingsRate) ? Math.min(100, Math.max(-100, args.savingsRate)) : 0;

    // Validate and sanitize category names (whitelist)
    const VALID_CATEGORIES = [
      "Food", "Housing", "Transport", "Entertainment", "Shopping",
      "Health", "Salary", "Freelance", "Utilities", "Transfer", "Other",
    ];
    const topCategories = args.topCategories
      .filter((c) => VALID_CATEGORIES.includes(c.category) && isFinite(c.amount) && c.amount >= 0)
      .slice(0, 5); // max 5 categories

    const categoryList = topCategories
      .map((c) => `${c.category}: $${c.amount.toFixed(2)}`)
      .join(", ");

    // Prompt is constructed entirely from server-validated data — no user-supplied free text
    const prompt =
      `You are a personal finance advisor. Based on this month's data:\n` +
      `- Total Income: $${totalIncome.toFixed(2)}\n` +
      `- Total Expenses: $${totalExpenses.toFixed(2)}\n` +
      `- Savings Rate: ${savingsRate.toFixed(1)}%\n` +
      `- Top spending categories: ${categoryList}\n\n` +
      `Give exactly 3 short, actionable financial insights (one tip, one alert if spending is high, one recommendation). ` +
      `Each should be 1-2 sentences max. Format as JSON object with key "insights" containing an array of objects ` +
      `with "content" (string) and "type" ("tip"|"alert"|"recommendation") fields.`;

    let insights: Array<{ content: string; type: "tip" | "alert" | "recommendation" }> = [];
    let success = false;
    let errorMessage: string | undefined;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const raw = response.choices[0].message.content ?? "{}";
      const parsed = JSON.parse(raw);
      const rawInsights: unknown[] = parsed.insights ?? parsed.data ?? [];

      // Validate each insight from the AI response
      insights = rawInsights
        .filter(
          (i): i is { content: string; type: string } =>
            typeof i === "object" &&
            i !== null &&
            typeof (i as any).content === "string" &&
            ["tip", "alert", "recommendation"].includes((i as any).type),
        )
        .map((i) => ({
          content: String(i.content).slice(0, 500), // cap length
          type: i.type as "tip" | "alert" | "recommendation",
        }))
        .slice(0, 5); // max 5 insights

      success = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error";
      insights = [];
    }

    await ctx.runMutation(internal.aiInsights.saveInsights, { userId, insights });

    // Increment rate limit
    await ctx.runMutation(internal.security.incrementRateLimit, {
      userId,
      action: "generateInsights",
      windowStart: rl.windowStart!,
    });

    // Audit log
    await ctx.runMutation(internal.security.writeAuditLog, {
      userId,
      action: "generateInsights",
      resource: "aiInsights",
      success,
      errorMessage,
    });

    return insights;
  },
});

export const saveInsights = internalMutation({
  args: {
    userId: v.id("users"),
    insights: v.array(
      v.object({
        content: v.string(),
        type: v.union(v.literal("tip"), v.literal("alert"), v.literal("recommendation")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Delete old insights for this user
    const existing = await ctx.db
      .query("aiInsights")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const e of existing) {
      await ctx.db.delete(e._id);
    }
    for (const insight of args.insights) {
      await ctx.db.insert("aiInsights", {
        userId: args.userId,
        content: insight.content,
        type: insight.type,
        generatedAt: Date.now(),
      });
    }
  },
});
