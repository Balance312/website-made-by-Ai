import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Plus, CreditCard, PiggyBank, TrendingUp, Landmark } from "lucide-react";

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  checking: <Landmark size={20} />,
  savings: <PiggyBank size={20} />,
  credit: <CreditCard size={20} />,
  investment: <TrendingUp size={20} />,
};

const ACCOUNT_COLORS: Record<string, string> = {
  checking: "#6A4C93",
  savings: "#10b981",
  credit: "#f43f5e",
  investment: "#8b5cf6",
};

export default function AccountsTab() {
  const accounts = useQuery(api.finance.getAccounts) ?? [];
  const addAccount = useMutation(api.finance.addAccount);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "checking" as "checking" | "savings" | "credit" | "investment", balance: "", currency: "USD" });

  const totalAssets = accounts.filter(a => a.type !== "credit").reduce((s, a) => s + a.balance, 0);
  const totalDebt = accounts.filter(a => a.type === "credit").reduce((s, a) => s + a.balance, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAccount({
      name: form.name,
      type: form.type,
      balance: parseFloat(form.balance),
      currency: form.currency,
      color: ACCOUNT_COLORS[form.type],
    });
    setShowForm(false);
    setForm({ name: "", type: "checking", balance: "", currency: "USD" });
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <p className="text-xs text-lavender-500 mb-1">Total Assets</p>
          <p className="text-2xl font-bold text-plum-900">${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <p className="text-xs text-lavender-500 mb-1">Total Debt</p>
          <p className="text-2xl font-bold text-rose-500">${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100">
          <p className="text-xs text-lavender-500 mb-1">Net Worth</p>
          <p className="text-2xl font-bold text-emerald-600">${(totalAssets - totalDebt).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-all shadow-sm"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100 animate-fadeIn">
          <h3 className="text-sm font-semibold text-plum-800 mb-4">New Account</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Account Name</label>
              <input
                type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Chase Checking"
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit Card</option>
                <option value="investment">Investment</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Balance ($)</label>
              <input
                type="number" step="0.01"
                value={form.balance}
                onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-plum-600 mb-1 block">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-lavender-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white text-plum-800"
              >
                <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-plum-600 border border-lavender-200 rounded-lg hover:bg-lavender-50 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-sm">
                Add Account
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl p-10 text-center text-lavender-400 text-sm shadow-sm border border-lavender-100">
            No accounts yet. Add one to get started!
          </div>
        )}
        {accounts.map(a => (
          <div key={a._id} className="bg-white rounded-xl p-5 shadow-sm border border-lavender-100 hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-lavender-500 capitalize mb-0.5">{a.type}</p>
                <p className="text-sm font-semibold text-plum-800">{a.name}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ background: ACCOUNT_COLORS[a.type] }}>
                {ACCOUNT_ICONS[a.type]}
              </div>
            </div>
            <p className={`text-2xl font-bold ${a.type === "credit" ? "text-rose-500" : "text-plum-900"}`}>
              {a.type === "credit" ? "-" : ""}${a.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-lavender-400 mt-1">{a.currency}</p>
            <div className="mt-3 pt-3 border-t border-lavender-50">
              <div className="w-full bg-lavender-100 rounded-full h-1">
                <div className="h-1 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((a.balance / 50000) * 100, 100)}%`, background: ACCOUNT_COLORS[a.type] }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
