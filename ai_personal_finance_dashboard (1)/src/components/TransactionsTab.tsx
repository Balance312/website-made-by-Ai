import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Plus, Search, Filter } from "lucide-react";

const CATEGORIES = ["Food", "Housing", "Transport", "Entertainment", "Shopping", "Health", "Salary", "Freelance", "Utilities", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", Housing: "#6A4C93", Transport: "#10b981",
  Entertainment: "#B497BD", Shopping: "#ec4899", Health: "#14b8a6",
  Salary: "#3b82f6", Freelance: "#8b5cf6", Utilities: "#f97316", Other: "#94a3b8",
};

function getCategoryEmoji(cat: string) {
  const map: Record<string, string> = {
    Food: "🍔", Housing: "🏠", Transport: "🚗", Entertainment: "🎬",
    Shopping: "🛍️", Health: "💪", Salary: "💼", Freelance: "💻",
    Transfer: "↔️", Utilities: "⚡", Other: "💰",
  };
  return map[cat] ?? "💰";
}

export default function TransactionsTab() {
  const transactions = useQuery(api.finance.getTransactions, { limit: 100 }) ?? [];
  const accounts = useQuery(api.finance.getAccounts) ?? [];
  const addTransaction = useMutation(api.finance.addTransaction);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    accountId: "" as Id<"accounts"> | "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "Food",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const filtered = transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.type === filterType;
    return matchSearch && matchType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.amount) return;
    await addTransaction({
      accountId: form.accountId as Id<"accounts">,
      amount: parseFloat(form.amount),
      type: form.type,
      category: form.category,
      description: form.description,
      date: new Date(form.date).getTime(),
    });
    setShowForm(false);
    setForm({ accountId: "", amount: "", type: "expense", category: "Food", description: "", date: new Date().toISOString().split("T")[0] });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lavender-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800 placeholder-lavender-400"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "income", "expense"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                  filterType === f ? "bg-primary text-white shadow-sm" : "bg-white text-plum-600 border border-lavender-200 hover:border-primary"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-all shadow-sm hover:shadow"
        >
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100 animate-fadeIn">
          <h3 className="text-sm font-semibold text-plum-800 mb-4">New Transaction</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Account</label>
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value as Id<"accounts"> }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
                required
              >
                <option value="">Select account</option>
                {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as "income" | "expense" }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
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
              <label className="text-xs font-medium text-plum-600 mb-1 block">Amount ($)</label>
              <input
                type="number" step="0.01" min="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What was this for?"
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-plum-600 border border-lavender-200 rounded-lg hover:bg-lavender-50 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-sm">
                Add Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-lavender-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-lavender-100 bg-plum-50/50">
                <th className="text-left text-xs font-semibold text-plum-500 px-5 py-3">Transaction</th>
                <th className="text-left text-xs font-semibold text-plum-500 px-5 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left text-xs font-semibold text-plum-500 px-5 py-3 hidden md:table-cell">Date</th>
                <th className="text-right text-xs font-semibold text-plum-500 px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center text-sm text-lavender-400 py-10">No transactions found</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t._id} className="border-b border-lavender-50 last:border-0 hover:bg-plum-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: (CATEGORY_COLORS[t.category] ?? "#94a3b8") + "22" }}>
                        {getCategoryEmoji(t.category)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-plum-800">{t.description}</p>
                        <p className="text-xs text-lavender-400 sm:hidden">{t.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: (CATEGORY_COLORS[t.category] ?? "#94a3b8") + "22", color: CATEGORY_COLORS[t.category] ?? "#94a3b8" }}>
                      {t.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-lavender-500 hidden md:table-cell">
                    {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                      {t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
