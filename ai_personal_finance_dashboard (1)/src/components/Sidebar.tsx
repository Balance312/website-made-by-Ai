import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TabId } from "../Dashboard";
import { SignOutButton } from "../SignOutButton";
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Wallet, Sparkles, TrendingUp
} from "lucide-react";

const navItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { id: "transactions", label: "Transactions", icon: <ArrowLeftRight size={18} /> },
  { id: "budgets", label: "Budgets", icon: <PieChart size={18} /> },
  { id: "accounts", label: "Accounts", icon: <Wallet size={18} /> },
  { id: "insights", label: "AI Insights", icon: <Sparkles size={18} /> },
];

export default function Sidebar({ activeTab, onTabChange }: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const accounts = useQuery(api.finance.getAccounts) ?? [];
  const totalNetWorth = accounts.reduce((s, a) => s + (a.type === "credit" ? -a.balance : a.balance), 0);

  return (
    <div className="h-full bg-plum-900 flex flex-col text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-plum-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lavender-400 to-primary flex items-center justify-center shadow">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">FinanceAI</span>
            <p className="text-xs text-lavender-400">Smart Money Manager</p>
          </div>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className="mx-4 mt-5 mb-2 bg-plum-800/60 rounded-xl p-4 border border-plum-700">
        <p className="text-xs text-lavender-400 mb-1">Total Net Worth</p>
        <p className="text-2xl font-bold text-white">${totalNetWorth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-emerald-400">↑ 3.2%</span>
          <span className="text-xs text-lavender-500">this month</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === item.id
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-lavender-300 hover:bg-plum-800 hover:text-white"
            }`}
          >
            {item.icon}
            {item.label}
            {item.id === "insights" && (
              <span className="ml-auto text-xs bg-lavender-500/30 text-lavender-300 px-1.5 py-0.5 rounded-full">AI</span>
            )}
          </button>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-plum-800">
        <SignOutButton />
      </div>
    </div>
  );
}
