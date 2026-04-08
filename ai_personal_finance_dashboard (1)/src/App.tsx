import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-plum-50">
      <Authenticated>
        <Dashboard />
      </Authenticated>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-plum-50 via-white to-lavender-50 px-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-plum-800 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-plum-900 mb-2">FinanceAI</h1>
          <p className="text-lavender-600 text-sm">Your intelligent personal finance dashboard</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-lavender-100">
          <SignInForm />
        </div>
        <p className="text-center text-xs text-lavender-400 mt-4">
          Demo data will be loaded automatically after sign-in
        </p>
      </div>
    </div>
  );
}
