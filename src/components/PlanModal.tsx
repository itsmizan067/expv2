import React, { useState, useRef, useEffect } from 'react';
import {
  X,
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
  ArrowLeft,
} from 'lucide-react';
import { User, PaymentRequest } from '../types';
import { submitPaymentRequest, getSubscriptionStatus } from '../lib/api';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (user: User) => void;
}

const BKASH_NUMBER = '01XXXXXXXXX'; // Replace with actual bKash number

const plans = [
  {
    id: 'standard' as const,
    name: 'Standard',
    price: 100,
    color: 'from-sky-500 to-blue-600',
    border: 'border-sky-500/40',
    bg: 'bg-sky-50',
    bgDark: 'bg-sky-950/30',
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
    bg: 'bg-amber-50',
    bgDark: 'bg-amber-950/30',
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
  { icon: FileText, title: 'Monthly Statement', desc: 'Day-wise Cash In / Cash Out / Balance' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Category trends & spending velocity' },
  { icon: TrendingUp, title: 'Cash Flow View', desc: 'Visual daily running balance' },
  { icon: Shield, title: 'Priority Support', desc: 'Faster admin responses' },
];

export const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, user, onUserUpdate }) => {
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'premium' | null>(null);
  const [step, setStep] = useState<'view' | 'choose' | 'pay' | 'done'>('view');
  const [txId, setTxId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingPayment, setPendingPayment] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('view');
      setSelectedPlan(null);
      setTxId('');
      setScreenshot(null);
      setError('');
      // Check if there's a pending payment
      setLoading(true);
      getSubscriptionStatus(user.id)
        .then(data => {
          setPendingPayment(data.pendingPayment);
          if (data.user) onUserUpdate(data.user);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, user.id]);

  if (!isOpen) return null;

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  const planDaysLeft = user.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  const isTrialActive = user.plan === 'trial' && trialDaysLeft > 0;
  const isPlanActive = (user.plan === 'standard' || user.plan === 'premium') && user.planStatus === 'active' && planDaysLeft > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Screenshot must be under 2 MB.');
      return;
    }
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
      const result = await submitPaymentRequest(user.id, {
        plan: selectedPlan,
        bkashTransactionId: txId.trim(),
        screenshotUrl: screenshot || undefined,
      });
      setPendingPayment(result.paymentRequest);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlanLabel = () => {
    if (user.plan === 'premium' && isPlanActive) return { label: 'Premium', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Crown };
    if (user.plan === 'standard' && isPlanActive) return { label: 'Standard', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', icon: Zap };
    if (isTrialActive) return { label: 'Free Trial', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: Sparkles };
    return { label: 'Expired', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: Clock };
  };

  const planLabel = getPlanLabel();
  const PlanLabelIcon = planLabel.icon;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Gradient top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-emerald-500 to-teal-500" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {step !== 'view' && step !== 'done' && (
                <button
                  onClick={() => setStep(step === 'pay' ? 'choose' : 'view')}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className="text-lg font-extrabold text-slate-900">
                {step === 'view' ? 'My Plan' : step === 'choose' ? 'Choose a Plan' : step === 'pay' ? 'Complete Payment' : 'Payment Submitted'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading plan info…</p>
            </div>
          ) : step === 'done' || pendingPayment ? (
            /* ── Payment Pending Review ── */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 mb-2">Payment Under Review</h4>
              <p className="text-sm text-slate-500 mb-4">
                Your <strong className="capitalize text-slate-800">{pendingPayment?.plan || selectedPlan}</strong> plan payment is awaiting admin verification.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-sm mb-4 max-w-xs mx-auto">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">bKash TX ID</span>
                  <span className="text-slate-900 font-mono font-bold">{pendingPayment?.bkashTransactionId || txId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount</span>
                  <span className="text-emerald-600 font-bold">৳{pendingPayment?.amount || (selectedPlan === 'standard' ? 100 : 250)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">You'll be notified once the admin approves your payment.</p>
            </div>
          ) : step === 'view' ? (
            /* ── Current Plan Overview ── */
            <div>
              {/* Current plan card */}
              <div className={`p-5 rounded-2xl border ${planLabel.bg} mb-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${
                      user.plan === 'premium' ? 'from-amber-400 to-orange-500' :
                      user.plan === 'standard' ? 'from-sky-500 to-blue-600' :
                      isTrialActive ? 'from-emerald-500 to-teal-600' :
                      'from-slate-400 to-slate-500'
                    } shadow-lg`}>
                      <PlanLabelIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-slate-900">{planLabel.label} Plan</div>
                      <div className="text-xs text-slate-500">
                        {isTrialActive && `${trialDaysLeft} days remaining in trial`}
                        {isPlanActive && `${planDaysLeft} days remaining · Expires ${new Date(user.planExpiresAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                        {!isTrialActive && !isPlanActive && 'Your plan has expired'}
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isTrialActive || isPlanActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isTrialActive || isPlanActive ? 'Active' : 'Expired'}
                  </div>
                </div>
              </div>

              {/* Premium features showcase */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Premium Features</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {premiumFeatures.map(f => {
                    const Icon = f.icon;
                    const isAvailable = user.plan === 'premium' && isPlanActive;
                    return (
                      <div key={f.title} className={`p-3 rounded-xl border text-center ${isAvailable ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className={`inline-flex p-2 rounded-lg mb-2 ${isAvailable ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          <Icon className={`w-3.5 h-3.5 ${isAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </div>
                        <div className={`text-xs font-bold mb-0.5 ${isAvailable ? 'text-emerald-800' : 'text-slate-600'}`}>{f.title}</div>
                        <div className="text-[11px] text-slate-400">{f.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upgrade / Switch / Renew button */}
              <button
                onClick={() => setStep('choose')}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {user.plan === 'premium' && isPlanActive ? 'Renew Plan' :
                   user.plan === 'standard' && isPlanActive ? 'Upgrade to Premium' :
                   'Choose a Plan'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : step === 'choose' ? (
            /* ── Plan Selection ── */
            <div>
              {/* Plan Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {plans.map(plan => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.id;
                  const isCurrent = user.plan === plan.id && isPlanActive;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${plan.bg} ${
                        isSelected
                          ? plan.border + ' ring-2 ring-offset-2 ring-offset-white ' + (plan.id === 'premium' ? 'ring-amber-500' : 'ring-sky-500')
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow">
                          {plan.badge}
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                          Current
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${plan.color} shadow-lg`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <div className="text-base font-extrabold text-slate-900 mb-1">{plan.name}</div>
                      <div className="mb-3">
                        <span className="text-2xl font-extrabold text-slate-900">৳{plan.price}</span>
                        <span className="text-slate-400 text-sm ml-1">/month</span>
                      </div>
                      <ul className="space-y-1.5">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center space-x-1.5 text-xs text-slate-600">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                        {plan.notIncluded.map(f => (
                          <li key={f} className="flex items-center space-x-1.5 text-xs text-slate-400 line-through">
                            <X className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!selectedPlan}
                onClick={() => setStep('pay')}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* ── Payment Form ── */
            <div>
              {/* Payment instruction card */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-5 mb-5">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-1">📱</div>
                  <div className="text-sm font-bold text-slate-900">Send via bKash</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-pink-600">bKash Number (Personal)</span>
                    <span className="text-slate-900 font-bold font-mono">{BKASH_NUMBER}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pink-600">Plan</span>
                    <span className="text-slate-900 font-bold capitalize">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between border-t border-pink-200 pt-2 mt-2">
                    <span className="text-pink-600 font-bold">Amount</span>
                    <span className="text-emerald-600 text-lg font-extrabold">৳{selectedPlan === 'standard' ? 100 : 250}</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">bKash Transaction ID *</label>
                  <input
                    type="text"
                    value={txId}
                    onChange={e => setTxId(e.target.value)}
                    placeholder="e.g. 8K6B3OI99R"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Payment Screenshot <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  {screenshot ? (
                    <div className="relative">
                      <img src={screenshot} alt="Screenshot" className="w-full rounded-xl border border-slate-200 max-h-40 object-cover" />
                      <button
                        onClick={() => setScreenshot(null)}
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-slate-400 hover:text-slate-700 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-5 text-center transition"
                    >
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-500">Click to upload screenshot</span>
                    </button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !txId.trim()}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
      </div>
    </div>
  );
};
