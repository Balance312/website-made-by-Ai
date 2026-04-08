import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Sparkles, RefreshCw, Lightbulb, AlertTriangle, Target } from "lucide-react";

export default function InsightsTab() {
  const insights = useQuery(api.finance.getAiInsights) ?? [];
  const transactions = useQuery(api.finance.getTransactions, { limit: 100 }) ?? [];
  const generateInsights = useAction(api.aiInsights.generateInsights);
  const [loading, setLoading] = useState(false);

  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const monthTxns = transactions.filter(t => t.date >= startOfMonth.getTime());
  const totalIncome = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const categoryMap: Record<string, number> = {};
  monthTxns.filter(t => t.type === "expense").forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
  });
  const topCategories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await generateInsights({ totalIncome, totalExpenses, topCategories, savingsRate });
    } finally {
      setLoading(false);
    }
  };

  const typeConfig = {
    tip: { icon: <Lightbulb size={18} />, label: "Smart Tip", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-800", iconBg: "bg-emerald-100 text-emerald-600" },
    alert: { icon: <AlertTriangle size={18} />, label: "Alert", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-800", iconBg: "bg-amber-100 text-amber-600" },
    recommendation: { icon: <Target size={18} />, label: "Recommendation", bg: "bg-plum-50", border: "border-lavender-100", text: "text-plum-800", iconBg: "bg-lavender-100 text-primary" },
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-br from-plum-900 to-primary rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} className="text-lavender-300" />
              <span className="text-sm font-medium text-lavender-300">AI Financial Advisor</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Personalized Insights</h2>
            <p className="text-sm text-lavender-300">Based on your spending patterns this month</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 backdrop-blur-sm border border-white/20"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Analyzing..." : "Refresh"}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/20">
          <div>
            <p className="text-xs text-lavender-300 mb-1">Monthly Income</p>
            <p className="text-lg font-bold">${totalIncome.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-lavender-300 mb-1">Monthly Expenses</p>
            <p className="text-lg font-bold">${totalExpenses.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-lavender-300 mb-1">Savings Rate</p>
            <p className={`text-lg font-bold ${savingsRate >= 20 ? "text-emerald-300" : savingsRate >= 10 ? "text-amber-300" : "text-rose-300"}`}>
              {savingsRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        {insights.length === 0 && !loading && (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-lavender-100">
            <Sparkles size={32} className="text-lavender-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-plum-700 mb-1">No insights yet</p>
            <p className="text-xs text-lavender-400 mb-4">Click "Refresh" to generate AI-powered insights based on your spending</p>
            <button onClick={handleGenerate} disabled={loading}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-all shadow-sm">
              Generate Insights
            </button>
          </div>
        )}
        {insights.map(insight => {
          const cfg = typeConfig[insight.type] ?? typeConfig.tip;
          return (
            <div key={insight._id} className={`${cfg.bg} ${cfg.border} border rounded-xl p-5 transition-all hover:shadow-sm`}>
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-xs text-lavender-400">
                      {new Date(insight.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${cfg.text}`}>{insight.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top spending */}
      {topCategories.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <h3 className="text-sm font-semibold text-plum-800 mb-4">Top Spending Categories This Month</h3>
          <div className="space-y-3">
            {topCategories.map((c, i) => {
              const maxAmt = topCategories[0].amount;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-xs text-lavender-400 w-4">{i + 1}</span>
                  <span className="text-sm text-plum-700 w-28 flex-shrink-0">{c.category}</span>
                  <div className="flex-1 bg-lavender-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-lavender-400 transition-all duration-700"
                      style={{ width: `${(c.amount / maxAmt) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-plum-800 w-20 text-right">${c.amount.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
