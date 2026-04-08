import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TabId } from "../Dashboard";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Sparkles } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Housing: "#6A4C93", Transport: "#10b981",
  Entertainment: "#B497BD", Shopping: "#ec4899", Health: "#14b8a6",
  Salary: "#3b82f6", Freelance: "#8b5cf6", Transfer: "#64748b", Other: "#94a3b8",
};

export default function OverviewTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const accounts = useQuery(api.finance.getAccounts) ?? [];
  const transactions = useQuery(api.finance.getTransactions, { limit: 100 }) ?? [];
  const insights = useQuery(api.finance.getAiInsights) ?? [];

  const now = Date.now();
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const monthTxns = transactions.filter(t => t.date >= startOfMonth.getTime());
  const totalIncome = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netWorth = accounts.reduce((s, a) => s + (a.type === "credit" ? -a.balance : a.balance), 0);

  // Spending by category
  const categoryMap: Record<string, number> = {};
  monthTxns.filter(t => t.type === "expense").forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Cash flow last 7 days
  const cashFlowData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    d.setHours(0, 0, 0, 0);
    const end = d.getTime() + 86400000;
    const dayTxns = transactions.filter(t => t.date >= d.getTime() && t.date < end);
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      income: dayTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expenses: dayTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });

  const recentTxns = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Net Worth"
          value={`$${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={<Wallet size={20} />}
          trend="+3.2%"
          trendUp
          color="from-plum-600 to-primary"
        />
        <StatCard
          label="Monthly Income"
          value={`$${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp size={20} />}
          trend="+12%"
          trendUp
          color="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Monthly Expenses"
          value={`$${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={<TrendingDown size={20} />}
          trend="-5%"
          trendUp={false}
          color="from-rose-400 to-rose-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Cash flow */}
        <div className="lg:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <h3 className="text-sm font-semibold text-plum-800 mb-4">Cash Flow — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cashFlowData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebf5" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9e7daa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9e7daa" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e6d9ef", fontSize: 12 }}
                formatter={(v) => [`${Number(v).toFixed(2)}`, ""]}
              />
              <Bar dataKey="income" fill="#6A4C93" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#B497BD" radius={[4, 4, 0, 0]} name="Expenses" />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending pie */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <h3 className="text-sm font-semibold text-plum-800 mb-4">Spending by Category</h3>
          {categoryData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-lavender-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e6d9ef", fontSize: 12 }}
                  formatter={(v) => [`${Number(v).toFixed(2)}`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {categoryData.slice(0, 4).map(c => (
              <div key={c.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: CATEGORY_COLORS[c.name] ?? "#94a3b8" }} />
                <span className="text-xs text-plum-600">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-plum-800">Recent Transactions</h3>
            <button onClick={() => onNavigate("transactions")} className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentTxns.length === 0 && <p className="text-sm text-lavender-400 text-center py-4">No transactions yet</p>}
            {recentTxns.map(t => (
              <div key={t._id} className="flex items-center justify-between py-2 border-b border-lavender-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: (CATEGORY_COLORS[t.category] ?? "#94a3b8") + "22" }}>
                    {getCategoryEmoji(t.category)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-plum-800">{t.description}</p>
                    <p className="text-xs text-lavender-500">{t.category} · {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                  {t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights preview */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-plum-800 flex items-center gap-2">
              <Sparkles size={14} className="text-primary" /> AI Insights
            </h3>
            <button onClick={() => onNavigate("insights")} className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {insights.length === 0 && <p className="text-sm text-lavender-400 text-center py-4">No insights yet</p>}
            {insights.slice(0, 3).map(i => (
              <InsightChip key={i._id} type={i.type} content={i.content} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, trendUp, color }: {
  label: string; value: string; icon: React.ReactNode;
  trend: string; trendUp: boolean; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-lavender-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-plum-900">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm`}>
          {icon}
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trendUp ? "text-emerald-600" : "text-rose-500"}`}>
        {trendUp ? "↑" : "↓"} {trend}
        <span className="text-lavender-400 font-normal ml-1">vs last month</span>
      </div>
    </div>
  );
}

function InsightChip({ type, content }: { type: string; content: string }) {
  const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    tip: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-400", label: "Tip" },
    alert: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-400", label: "Alert" },
    recommendation: { bg: "bg-plum-50", text: "text-plum-800", dot: "bg-primary", label: "Suggestion" },
  };
  const s = styles[type] ?? styles.tip;
  return (
    <div className={`${s.bg} rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
      </div>
      <p className={`text-xs ${s.text} leading-relaxed`}>{content}</p>
    </div>
  );
}

function getCategoryEmoji(cat: string) {
  const map: Record<string, string> = {
    Food: "🍔", Housing: "🏠", Transport: "🚗", Entertainment: "🎬",
    Shopping: "🛍️", Health: "💪", Salary: "💼", Freelance: "💻",
    Transfer: "↔️", Utilities: "⚡",
  };
  return map[cat] ?? "💰";
}
