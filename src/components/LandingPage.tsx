import React from 'react';
import {
  Wallet,
  ShieldCheck,
  WifiOff,
  BarChart3,
  ArrowRight,
  Smartphone,
  CloudUpload,
  Lock,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  LogIn,
  UserPlus,
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

const stats = [
  { label: 'Transaction Types', value: '2', suffix: '', note: 'Income & Expense' },
  { label: 'Payment Methods', value: '6', suffix: '+', note: 'Cash, Card, Wallet…' },
  { label: 'Analytics Charts', value: '4', suffix: '', note: 'Always up to date' },
  { label: 'Data Security', value: '100', suffix: '%', note: 'PBKDF2 hashed' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onSignUp }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* ── Hero Section ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">

        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-3xl" />
          <div className="absolute top-10 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-teal-600/8 blur-3xl" />
        </div>

        {/* Badge */}
        <div className="relative inline-flex items-center space-x-2 px-4 py-1.5 mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Personal Finance · PWA · Offline-First</span>
        </div>

        {/* Headline */}
        <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6 max-w-3xl">
          Your Money,{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Under Control
          </span>
          <br />— Anytime, Anywhere.
        </h1>

        <p className="relative text-slate-400 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
          Track income and expenses, visualise your spending, and sync to the cloud
          — all with an app that works even when you're offline.
        </p>

        {/* CTA Buttons */}
        <div className="relative flex flex-col sm:flex-row items-center gap-4">
          <button
            id="landing-signup-btn"
            onClick={onSignUp}
            className="group flex items-center space-x-2.5 px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-[1.03] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Free Account</span>
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
          {['No credit card required', 'Free to use', 'Secure & encrypted', 'Install as PWA'].map(t => (
            <span key={t} className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-slate-900/60 border-y border-slate-800/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-emerald-400">
                {s.value}
                <span className="text-lg">{s.suffix}</span>
              </div>
              <div className="text-xs font-bold text-white mt-1">{s.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
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

      {/* ── App Preview Section ── */}
      <section className="relative max-w-4xl mx-auto px-4 pb-20">
        <div className="relative rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-800/60 to-slate-900 p-8 sm:p-12 text-center overflow-hidden">
          {/* Background shimmer */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          </div>

          {/* Wallet icon cluster */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-900/50">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 h-7 w-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Ready to Take Control?
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Join today and start tracking your income and expenses with a beautifully
            simple and powerful app — completely free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="landing-cta-signup-btn"
              onClick={onSignUp}
              className="group flex items-center space-x-2.5 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-[1.03] active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Get Started — It's Free</span>
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
            <Wallet className="w-4 h-4 text-emerald-700" />
            <span className="font-semibold text-slate-500">Personal Income &amp; Expense PWA</span>
          </div>
          <span>© {new Date().getFullYear()} · Offline-First · Cloud Sync · Secure</span>
        </div>
      </footer>

    </div>
  );
};
