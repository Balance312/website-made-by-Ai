import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Sidebar from "./components/Sidebar";
import OverviewTab from "./components/OverviewTab";
import TransactionsTab from "./components/TransactionsTab";
import BudgetsTab from "./components/BudgetsTab";
import AccountsTab from "./components/AccountsTab";
import InsightsTab from "./components/InsightsTab";
import { Menu, X } from "lucide-react";

export type TabId = "overview" | "transactions" | "budgets" | "accounts" | "insights";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const seedDemoData = useMutation(api.finance.seedDemoData);

  useEffect(() => {
    seedDemoData();
  }, []);

  const tabs: Record<TabId, React.ReactNode> = {
    overview: <OverviewTab onNavigate={setActiveTab} />,
    transactions: <TransactionsTab />,
    budgets: <BudgetsTab />,
    accounts: <AccountsTab />,
    insights: <InsightsTab />,
  };

  return (
    <div className="flex h-screen bg-plum-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-plum-900/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-lavender-100 px-4 lg:px-8 h-16 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-plum-600 hover:bg-plum-50 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-plum-900 capitalize">{activeTab}</h1>
              <p className="text-xs text-lavender-600 hidden sm:block">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <UserBadge />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="animate-fadeIn">
            {tabs[activeTab]}
          </div>
        </main>
      </div>
    </div>
  );
}

function UserBadge() {
  const user = useQuery(api.auth.loggedInUser);
  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium text-plum-800">{user?.name ?? user?.email?.split("@")[0] ?? "User"}</p>
        <p className="text-xs text-lavender-500">{user?.email}</p>
      </div>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-plum-800 flex items-center justify-center text-white text-sm font-bold shadow-sm">
        {(user?.name ?? user?.email ?? "U")[0].toUpperCase()}
      </div>
    </div>
  );
}
