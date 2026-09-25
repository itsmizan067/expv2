import React, { useState, useRef } from 'react';
import {
  Crown,
  Zap,
  CheckCircle2,
  ArrowRight,
  Upload,
  Clock,
  AlertCircle,
  Sparkles,
  Star,
  BarChart3,
  FileText,
  Shield,
  TrendingUp,
  X,
} from 'lucide-react';
import { User, PaymentRequest } from '../types';
import { submitPaymentRequest } from '../lib/api';

interface SubscriptionWallProps {
  user: User;
  pendingPayment: PaymentRequest | null;
  onSubscriptionSuccess: (updatedUser?: User) => void;
}

const BKASH_NUMBER = '01XXXXXXXXX'; // Replace with actual bKash number

const plans = [
  {
    id: 'standard' as const,
    name: 'Standard',
    price: 100,
    color: 'from-sky-500 to-blue-600',
    border: 'border-sky-500/40',
    bg: 'bg-sky-950/30',
    icon: Zap,
    features: [
      'Unlimited transactions',
      'Cloud sync & offline mode',
      'Monthly budget tracking',
      'Basic charts & analytics',
      'CSV export',
      '30-day validity',
    ],
    notIncluded: ['Monthly statement report', 'Premium analytics', 'Priority support'],
  },
  {
    id: 'premium' as const,
    name: 'Premium',
    price: 250,
    color: 'from-amber-400 to-orange-500',
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/30',
    icon: Crown,
    badge: 'Best Value',
    features: [
      'Everything in Standard',
      'Monthly statement report',
      'Day-wise cash flow summary',
      'Advanced premium analytics',
      'Tag-based spending insights',
      'Priority admin support',
      '30-day validity',
    ],
    notIncluded: [],
  },
];

const premiumFeatures = [
  { icon: FileText, title: 'Monthly Statement', desc: 'Day-wise Cash In / Cash Out / Balance report for any month or week' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Category trends, tag insights, and spending velocity charts' },
  { icon: TrendingUp, title: 'Cash Flow Summary', desc: 'Visual daily balance tracking with running totals' },
  { icon: Shield, title: 'Priority Support', desc: 'Faster admin responses and account management' },
];

export const SubscriptionWall: React.FC<SubscriptionWallProps> = ({ user, pendingPayment, onSubscriptionSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'premium' | null>(null);
  const [step, setStep] = useState<'choose' | 'pay' | 'done'>('choose');
  const [txId, setTxId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Screenshot must be under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !txId.trim()) {
      setError('Please enter your bKash transaction ID.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitPaymentRequest(user.id, {
        plan: selectedPlan,
        bkashTransactionId: txId.trim(),
        screenshotUrl: screenshot || undefined,
      });
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Already has a pending payment
  if (pendingPayment || step === 'done') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-3">Payment Under Review</h2>
          <p className="text-slate-400 mb-4 leading-relaxed">
            Your <strong className="text-white capitalize">{(pendingPayment?.plan || selectedPlan)} plan</strong> payment
            request has been submitted and is awaiting admin verification.
          </p>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-left text-sm mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">bKash TX ID</span>
              <span className="text-white font-mono font-bold">{pendingPayment?.bkashTransactionId || txId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Amount</span>
              <span className="text-emerald-400 font-bold">৳{pendingPayment?.amount || (selectedPlan === 'standard' ? 100 : 250)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">You'll be notified once the admin approves your payment. Please check back soon.</p>
          <button
            onClick={() => onSubscriptionSuccess()}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition underline"
          >
            Continue with limited access →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-y-auto">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Star className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Pocket Balance</span>
        </div>
        {trialDaysLeft > 0 && (
          <span className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 px-3 py-1 rounded-full">
            ⏳ {trialDaysLeft}d trial left
          </span>
        )}
        <button onClick={() => onSubscriptionSuccess()} className="text-slate-500 hover:text-slate-300 transition p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {step === 'choose' && (
        <div className="max-w-4xl mx-auto px-4 py-12">

          {/* Trial expired notice */}
          {trialDaysLeft === 0 && (
            <div className="flex items-start space-x-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-2xl p-4 mb-8 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong>Your 7-day free trial has ended.</strong> Choose a plan below to continue using Pocket Balance.
              </div>
            </div>
          )}

          <div className="text-center mb-10">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrade Your Plan</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Choose Your Plan</h1>
            <p className="text-slate-400 max-w-lg mx-auto">Send payment via bKash and your account gets activated within minutes after admin approval.</p>
          </div>

          {/* Premium Features Showcase */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {premiumFeatures.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="inline-flex p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg mb-3">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-bold text-white mb-1">{f.title}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">{f.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {plans.map(plan => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 ${plan.bg} ${isSelected ? plan.border + ' ring-2 ring-offset-2 ring-offset-slate-950 ' + (plan.id === 'premium' ? 'ring-amber-500' : 'ring-sky-500') : 'border-slate-800 hover:border-slate-600'}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[11px] font-extrabold rounded-full uppercase tracking-wider shadow-lg">
                      {plan.badge}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${plan.color} shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div className="mb-1 text-lg font-extrabold text-white">{plan.name}</div>
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-white">৳{plan.price}</span>
                    <span className="text-slate-400 text-sm ml-1">/month</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center space-x-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map(f => (
                      <li key={f} className="flex items-center space-x-2 text-sm text-slate-600 line-through">
                        <X className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="text-center">
            <button
              disabled={!selectedPlan}
              onClick={() => setStep('pay')}
              className="inline-flex items-center space-x-2.5 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span>Continue to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="mt-3 text-xs text-slate-600">
              Payment via bKash personal number. Activated within minutes after admin review.
            </p>
          </div>
        </div>
      )}

      {step === 'pay' && selectedPlan && (
        <div className="max-w-lg mx-auto px-4 py-12">
          <button onClick={() => setStep('choose')} className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm mb-8 transition">
            <ArrowRight className="w-4 h-4 rotate-180" /><span>Back to plans</span>
          </button>

          <h2 className="text-2xl font-extrabold text-white mb-2">Complete Payment</h2>
          <p className="text-slate-400 text-sm mb-8">Send payment via bKash and enter the transaction ID below.</p>

          {/* Payment instruction card */}
          <div className="bg-gradient-to-br from-pink-950/60 to-rose-950/40 border border-pink-800/40 rounded-2xl p-6 mb-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📱</div>
              <div className="text-base font-bold text-white">Send via bKash</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-pink-300">bKash Number (Personal)</span>
                <span className="text-white font-bold font-mono">{BKASH_NUMBER}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-300">Plan</span>
                <span className="text-white font-bold capitalize">{selectedPlan}</span>
              </div>
              <div className="flex justify-between border-t border-pink-800/40 pt-2 mt-2">
                <span className="text-pink-300 font-bold">Amount</span>
                <span className="text-emerald-400 text-lg font-extrabold">৳{selectedPlan === 'standard' ? 100 : 250}</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">bKash Transaction ID *</label>
              <input
                type="text"
                value={txId}
                onChange={e => setTxId(e.target.value)}
                placeholder="e.g. 8K6B3OI99R"
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Payment Screenshot <span className="text-slate-500 font-normal">(optional but recommended)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {screenshot ? (
                <div className="relative">
                  <img src={screenshot} alt="Screenshot" className="w-full rounded-xl border border-slate-700 max-h-48 object-cover" />
                  <button onClick={() => setScreenshot(null)} className="absolute top-2 right-2 p-1 bg-slate-900/80 rounded-full text-slate-400 hover:text-white transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl p-6 text-center transition"
                >
                  <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                  <span className="text-sm text-slate-500">Click to upload screenshot</span>
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-rose-400 text-sm bg-rose-950/40 border border-rose-800/50 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !txId.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Submitting…</span></>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /><span>Submit Payment Request</span></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
