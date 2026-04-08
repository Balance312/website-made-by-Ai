import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Plus, Edit2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Housing: "#6A4C93", Transport: "#10b981",
  Entertainment: "#B497BD", Shopping: "#ec4899", Health: "#14b8a6",
  Utilities: "#f97316", Other: "#94a3b8",
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

export default function BudgetsTab() {
  const budgets = useQuery(api.finance.getBudgets) ?? [];
  const transactions = useQuery(api.finance.getTransactions, { limit: 100 }) ?? [];
  const updateBudget = useMutation(api.finance.updateBudget);

  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "Food", limit: "", period: "monthly" as "monthly" | "weekly", color: "#f59e0b" });

  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const monthExpenses = transactions.filter(t => t.type === "expense" && t.date >= startOfMonth.getTime());

  const spentByCategory: Record<string, number> = {};
  monthExpenses.forEach(t => {
    spentByCategory[t.category] = (spentByCategory[t.category] ?? 0) + t.amount;
  });

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentByCategory[b.category] ?? 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBudget({
      category: form.category,
      limit: parseFloat(form.limit),
      period: form.period,
      color: CATEGORY_COLORS[form.category] ?? "#94a3b8",
    });
    setShowForm(false);
    setEditCategory(null);
    setForm({ category: "Food", limit: "", period: "monthly", color: "#f59e0b" });
  };

  const startEdit = (b: typeof budgets[0]) => {
    setForm({ category: b.category, limit: b.limit.toString(), period: b.period, color: b.color });
    setEditCategory(b.category);
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <p className="text-xs text-lavender-500 mb-1">Total Budget</p>
          <p className="text-2xl font-bold text-plum-900">${totalBudget.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <p className="text-xs text-lavender-500 mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-plum-900">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <p className="text-xs text-lavender-500 mb-1">Remaining</p>
          <p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            ${(totalBudget - totalSpent).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); setEditCategory(null); setForm({ category: "Food", limit: "", period: "monthly", color: "#f59e0b" }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-all shadow-sm"
        >
          <Plus size={16} /> Add Budget
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100 animate-fadeIn">
          <h3 className="text-sm font-semibold text-plum-800 mb-4">{editCategory ? "Edit Budget" : "New Budget"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Monthly Limit ($)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.limit}
                onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Period</label>
              <select
                value={form.period}
                onChange={e => setForm(f => ({ ...f, period: e.target.value as "monthly" | "weekly" }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-plum-600 border border-lavender-200 rounded-lg hover:bg-lavender-50 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-sm">
                {editCategory ? "Update" : "Create"} Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl p-10 text-center text-lavender-400 text-sm shadow-sm border border-lavender-100">
            No budgets set yet. Add one to start tracking!
          </div>
        )}
        {budgets.map(b => {
          const spent = spentByCategory[b.category] ?? 0;
          const pct = Math.min((spent / b.limit) * 100, 100);
          const over = spent > b.limit;
          return (
            <div key={b._id} className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[b.category] ?? "#94a3b8" }} />
                  <span className="text-sm font-semibold text-plum-800">{b.category}</span>
                </div>
                <button onClick={() => startEdit(b)} className="p-1 text-lavender-400 hover:text-primary transition-colors rounded">
                  <Edit2 size={13} />
                </button>
              </div>
              <div className="flex justify-between text-xs text-lavender-500 mb-2">
                <span>${spent.toFixed(2)} spent</span>
                <span>${b.limit.toFixed(2)} limit</span>
              </div>
              <div className="w-full bg-lavender-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: over ? "#f43f5e" : CATEGORY_COLORS[b.category] ?? "#6A4C93",
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className={`text-xs font-medium ${over ? "text-rose-500" : "text-emerald-600"}`}>
                  {over ? `$${(spent - b.limit).toFixed(2)} over` : `$${(b.limit - spent).toFixed(2)} left`}
                </span>
                <span className="text-xs text-lavender-400">{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
