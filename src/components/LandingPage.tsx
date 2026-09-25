import React from 'react';
import {
  WifiOff,
  BarChart3,
  CloudUpload,
  Lock,
  Smartphone,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  LogIn,
  UserPlus,
  ArrowRight,
  Crown,
  Zap,
  FileText,
  Shield,
  Star,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const features = [
  {
    icon: WifiOff,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-950/40 border-emerald-800/40',
    title: 'Offline-First',
    desc: 'Works 100% offline. Changes sync automatically to the cloud when you reconnect.',
  },
  {
    icon: BarChart3,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-950/40 border-violet-800/40',
    title: 'Smart Analytics',
    desc: 'Interactive charts and spending breakdowns help you understand your money flow.',
  },
  {
    icon: CloudUpload,
    color: 'from-sky-500 to-cyan-600',
    bg: 'bg-sky-950/40 border-sky-800/40',
    title: 'Cloud Sync',
    desc: 'Your data is safely backed up in the cloud and accessible from any device.',
  },
  {
    icon: Lock,
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-950/40 border-rose-800/40',
    title: 'Secure & Private',
    desc: 'Role-based access control keeps your financial data protected and private.',
  },
  {
    icon: Smartphone,
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-950/40 border-amber-800/40',
    title: 'PWA Ready',
    desc: 'Install as a native app on any device — iOS, Android, or desktop.',
  },
  {
    icon: TrendingUp,
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-950/40 border-indigo-800/40',
    title: 'Budget Tracking',
    desc: 'Set monthly budgets and get real-time insights on your savings rate.',
  },
];

const premiumFeatures = [
  { icon: FileText, title: 'Monthly Statement', desc: 'Day-wise Cash In, Cash Out & Balance for any month or week' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Category trends, tag-level insights & spending velocity' },
  { icon: TrendingUp, title: 'Cash Flow View', desc: 'Visual daily running balance with exportable CSV report' },
  { icon: Shield, title: 'Priority Support', desc: 'Faster admin responses and dedicated account management' },
];

const plans = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '0',
    period: '7 days',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    border: 'border-slate-700',
    features: ['Track income & expenses', 'Cloud sync & offline mode', 'Basic charts', 'CSV export'],
    notIncluded: ['Monthly statement report', 'Advanced analytics', 'Priority support'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '100',
    period: '/ month',
    icon: Zap,
    color: 'from-sky-500 to-blue-600',
    border: 'border-sky-700/60',
    features: ['Unlimited transactions', 'Cloud sync & offline mode', 'Monthly budget tracking', 'Basic charts & analytics', 'CSV export'],
    notIncluded: ['Monthly statement report', 'Advanced analytics'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '250',
    period: '/ month',
    badge: 'Best Value',
    icon: Crown,
    color: 'from-amber-400 to-orange-500',
    border: 'border-amber-600/60',
    features: ['Everything in Standard', 'Monthly statement report', 'Day-wise cash flow summary', 'Advanced analytics', 'Tag-based insights', 'Priority support'],
    notIncluded: [],
  },
];

// Demo transaction data (static, for display only)
const demoTransactions = [
  { label: 'Sep 22 · Salary', type: 'income', amount: 35000 },
  { label: 'Sep 21 · Grocery', type: 'expense', amount: 1200 },
  { label: 'Sep 20 · Transport', type: 'expense', amount: 450 },
  { label: 'Sep 19 · Freelance', type: 'income', amount: 8000 },
  { label: 'Sep 18 · Rent', type: 'expense', amount: 12000 },
];

const demoStats = [
  { label: 'Balance', value: '৳29,350', color: 'text-emerald-400' },
  { label: 'Income', value: '৳43,000', color: 'text-sky-400' },
  { label: 'Expense', value: '৳13,650', color: 'text-rose-400' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onSignUp }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* ── Hero Section ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">

        {/* Decorative blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-3xl" />
          <div className="absolute top-10 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-teal-600/8 blur-3xl" />
        </div>

        {/* Badge */}
        <div className="relative inline-flex items-center space-x-2 px-4 py-1.5 mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Personal Finance · PWA · Offline-First</span>
        </div>

        {/* Logo Mark */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 blur-2xl opacity-40 scale-110" />
            <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-emerald-900/60 border border-emerald-400/20">
              {/* Coin stack icon */}
              <svg viewBox="0 0 48 48" className="w-14 h-14" fill="none">
                <ellipse cx="24" cy="36" rx="16" ry="5" fill="rgba(255,255,255,0.15)" />
                <ellipse cx="24" cy="28" rx="16" ry="5" fill="rgba(255,255,255,0.20)" />
                <ellipse cx="24" cy="20" rx="16" ry="5" fill="rgba(255,255,255,0.25)" />
                <path d="M8 20v16c0 2.76 7.16 5 16 5s16-2.24 16-5V20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 28c0 2.76 7.16 5 16 5s16-2.24 16-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <ellipse cx="24" cy="20" rx="16" ry="5" stroke="white" strokeWidth="1.5" />
                <path d="M24 16v-4M21 14l3-3 3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Premium badge */}
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg border-2 border-slate-950">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        </div>

        {/* App Name */}
        <h1 className="relative text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-3">
          <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Pocket
          </span>
          <span className="text-white"> Balance</span>
        </h1>
        <p className="relative text-slate-400 text-base sm:text-lg max-w-xl mb-10 leading-relaxed">
          Track income & expenses, visualise your spending, and sync to the cloud — all with an app that works even when you're offline.
        </p>

        {/* CTA Buttons */}
        <div className="relative flex flex-col sm:flex-row items-center gap-4">
          <button
            id="landing-signup-btn"
            onClick={onSignUp}
            className="group flex items-center space-x-2.5 px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-[1.03] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Start Free — 7 Days Trial</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            id="landing-signin-btn"
            onClick={onSignIn}
            className="flex items-center space-x-2.5 px-7 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-95 backdrop-blur-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Trust notes */}
        <div className="relative mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
          {['7-day free trial', 'No credit card required', 'Secure & encrypted', 'Install as PWA'].map(t => (
            <span key={t} className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Demo Preview ── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Demo Preview</span>
          <h2 className="text-2xl font-extrabold mt-1 mb-2">See It In Action</h2>
          <p className="text-slate-400 text-sm">This is what your dashboard looks like from day one.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {demoStats.map(s => (
            <div key={s.label} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center">
              <div className={`text-2xl font-extrabold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Transactions</div>
          {demoTransactions.map((tx, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/50 last:border-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="text-sm text-slate-300">{tx.label}</span>
              </div>
              <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tx.type === 'income' ? '+' : '-'}৳{tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="px-5 py-3 text-center">
            <button onClick={onSignUp} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition">
              Sign up to track your own transactions →
            </button>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Everything You Need</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Built for real people who want a simple, fast, and secure way to manage their finances.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`relative group p-6 rounded-2xl border ${f.bg} hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
              >
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${f.color} shadow-lg mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Premium Features ── */}
      <section className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-y border-amber-900/30 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5" />
              <span>Premium Plan — ৳250/month</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white">Unlock Premium Features</h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm">Take full control of your finances with our premium reporting and analytics tools.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {premiumFeatures.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-slate-900/60 border border-amber-800/30 rounded-2xl p-5 text-center hover:border-amber-600/40 transition">
                  <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-900/30 mb-4">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button onClick={onSignUp} className="inline-flex items-center space-x-2.5 px-7 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 rounded-2xl text-sm font-extrabold shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-95">
              <Crown className="w-4 h-4" />
              <span>Get Premium — ৳250/month</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing Plans ── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">Pay via bKash · Activated by admin within minutes · 30-day validity</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {plans.map(plan => {
            const Icon = plan.icon;
            return (
              <div key={plan.id} className={`relative bg-slate-900/60 border ${plan.border} rounded-2xl p-6 flex flex-col`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[11px] font-extrabold rounded-full uppercase tracking-wider shadow-lg">
                    {plan.badge}
                  </div>
                )}
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${plan.color} shadow-lg mb-4 self-start`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-lg font-extrabold text-white mb-1">{plan.name}</div>
                <div className="mb-5">
                  <span className="text-3xl font-black text-white">৳{plan.price}</span>
                  <span className="text-slate-500 text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start space-x-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map(f => (
                    <li key={f} className="flex items-start space-x-2 text-sm text-slate-600 line-through">
                      <X className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onSignUp}
                  className="mt-5 w-full py-2.5 rounded-xl text-sm font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  {plan.id === 'free' ? 'Start Free Trial' : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          All paid plans activate after bKash payment verification by admin · bKash personal number provided upon signup
        </p>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative max-w-4xl mx-auto px-4 pb-20">
        <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-800/60 to-slate-900 p-8 sm:p-12 text-center overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Ready to Take Control?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Join today with a free 7-day trial. No credit card needed. Upgrade anytime to unlock premium features.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="landing-cta-signup-btn"
              onClick={onSignUp}
              className="group flex items-center space-x-2.5 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-[1.03] active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              id="landing-cta-signin-btn"
              onClick={onSignIn}
              className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition font-medium"
            >
              <span>Already have an account?</span>
              <span className="text-emerald-400 font-semibold hover:underline">Sign In →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-bold text-slate-500">Pocket Balance</span>
          </div>
          <span>© {new Date().getFullYear()} · Offline-First · Cloud Sync · Secure · bKash Payments</span>
        </div>
      </footer>

    </div>
  );
};
