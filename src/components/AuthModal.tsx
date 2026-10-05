import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle,
  Wallet,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { User } from '../types';
import { 
  loginUser, 
  registerUser, 
  verifyEmailOtp, 
  resendOtp, 
  requestPasswordReset, 
  verifyPasswordResetOtp, 
  resetPasswordWithOtp,
  ApiError 
} from '../lib/api';
import { OtpInput } from './OtpInput';

export type AuthModalMode = 
  | 'login' 
  | 'register' 
  | 'verify-email' 
  | 'forgot-password' 
  | 'reset-password-otp' 
  | 'reset-password-new';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  /** Optional: open directly in a specific mode. Defaults to 'login'. */
  initialMode?: 'login' | 'register';
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialMode = 'login' 
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [otp, setOtp] = useState('');
  const [maskedEmailStr, setMaskedEmailStr] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Sync mode whenever initialMode or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccessNotice('');
      setOtp('');
      setAttemptsRemaining(null);
    }
  }, [isOpen, initialMode]);

  // Resend Cooldown Countdown Timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrency('USD');
    setOtp('');
    setError('');
    setSuccessNotice('');
    setAttemptsRemaining(null);
    setCooldown(0);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 1. Submit Registration or Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessNotice('');
    setAttemptsRemaining(null);

    try {
      if (mode === 'login') {
        const result = await loginUser(email, password);
        onSuccess(result.user);
        handleClose();
      } else if (mode === 'register') {
        const result = await registerUser({
          name,
          email,
          password,
          currency,
        });

        // Account created unverified -> transition to verify-email
        setMaskedEmailStr(result.maskedEmail || maskEmail(email));
        setCooldown(60);
        setOtp('');
        setMode('verify-email');
        setSuccessNotice(result.message || 'A 6-digit verification code has been sent to your Gmail inbox.');
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.requiresVerification) {
        // User attempted login but email is unverified
        setEmail(err.email || email);
        setMaskedEmailStr(err.maskedEmail || maskEmail(err.email || email));
        setCooldown(60);
        setOtp('');
        setMode('verify-email');
        if (err.message && err.message.includes('fresh 6-digit code')) {
          setSuccessNotice(err.message);
          setError('');
        } else {
          setError(err.message || 'Please verify your email address with the 6-digit code to activate your account.');
        }
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit 6-digit Email Verification OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    if (!code || code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');

    try {
      const result = await verifyEmailOtp(email, code);
      setSuccessNotice('Email verified successfully! Activating your account…');
      setTimeout(() => {
        onSuccess(result.user);
        handleClose();
      }, 700);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.attemptsRemaining !== undefined) {
          setAttemptsRemaining(err.attemptsRemaining);
        }
      }
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Resend OTP with cooldown
  const handleResendOtp = async (purpose: 'email_verification' | 'password_reset') => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError('');
    setSuccessNotice('');

    try {
      const res = await resendOtp(email, purpose);
      setCooldown(res.retryAfter || 60);
      setOtp('');
      setAttemptsRemaining(null);
      setSuccessNotice('A new 6-digit verification code has been sent to your email.');
    } catch (err: any) {
      if (err instanceof ApiError && err.retryAfter) {
        setCooldown(err.retryAfter);
      }
      setError(err.message || 'Failed to resend verification code. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  // 4. Forgot Password Step 1: Request OTP
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');

    try {
      const res = await requestPasswordReset(email);
      setMaskedEmailStr(res.maskedEmail || maskEmail(email));
      setCooldown(res.retryAfter || 60);
      setOtp('');
      setMode('reset-password-otp');
      setSuccessNotice('If an account exists for that email, a 6-digit recovery code has been sent.');
    } catch (err: any) {
      if (err instanceof ApiError && err.retryAfter) {
        setCooldown(err.retryAfter);
      }
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Password Reset Step 2: Verify Recovery OTP
  const handleVerifyResetOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    if (!code || code.length !== 6) {
      setError('Please enter the complete 6-digit recovery code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');

    try {
      await verifyPasswordResetOtp(email, code);
      setSuccessNotice('Code verified! Please create your new password.');
      setMode('reset-password-new');
    } catch (err: any) {
      if (err instanceof ApiError && err.attemptsRemaining !== undefined) {
        setAttemptsRemaining(err.attemptsRemaining);
      }
      setError(err.message || 'Invalid or expired recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Password Reset Step 3: Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');

    try {
      await resetPasswordWithOtp(email, newPassword, otp);
      setSuccessNotice('Your password has been successfully reset! All existing sessions were invalidated.');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
        setError('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currencies = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'CAD', 'AUD', 'SGD', 'JPY'];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
        
        {/* Sleek top brand accent gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                {mode === 'verify-email' ? (
                  <ShieldCheck className="w-5 h-5 text-white" />
                ) : mode.startsWith('reset-password') || mode === 'forgot-password' ? (
                  <KeyRound className="w-5 h-5 text-white" />
                ) : (
                  <Wallet className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {mode === 'login' && 'Welcome Back'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'verify-email' && 'Verify Your Email'}
                  {mode === 'forgot-password' && 'Reset Password'}
                  {mode === 'reset-password-otp' && 'Enter Recovery Code'}
                  {mode === 'reset-password-new' && 'Set New Password'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {mode === 'login' && 'Sign in to access your finances'}
                  {mode === 'register' && 'Includes 7-day free trial • Auto approval'}
                  {mode === 'verify-email' && 'Real 6-digit Gmail OTP verification'}
                  {mode === 'forgot-password' && 'We’ll email you a 6-digit recovery code'}
                  {mode === 'reset-password-otp' && 'Step 2 of 3: Enter 6-digit code'}
                  {mode === 'reset-password-new' && 'Step 3 of 3: Enter your new password'}
                </p>
              </div>
            </div>

            <button
              id="close-auth-modal-btn"
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              title="Close"
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all duration-200 hover:rotate-90 active:scale-90 shadow-2xs shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4 transition-transform" strokeWidth={2.2} />
            </button>
          </div>

          {/* Success Banner */}
          {successNotice && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-start space-x-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="flex-1">{successNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-400 font-medium flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                    Remaining attempts: {attemptsRemaining} / 5
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODE: LOGIN & REGISTER FORMS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Full Name (Register only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-name-input"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email-input"
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      id="forgot-password-link-btn"
                      onClick={() => {
                        setMode('forgot-password');
                        setError('');
                        setSuccessNotice('');
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={mode === 'register' ? 6 : 1}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="text-[11px] text-slate-400 mt-1 ml-1">Minimum 6 characters.</p>
                )}
              </div>

              {/* Currency (Register only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Default Currency
                  </label>
                  <select
                    id="auth-currency-select"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  >
                    {currencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                id="auth-submit-btn"
                disabled={loading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>
                  {loading
                    ? 'Please wait…'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Send 6-Digit Verification Code'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODE: VERIFY EMAIL OTP */}
          {/* ───────────────────────────────────────────────────────────── */}
          {mode === 'verify-email' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We sent a 6-digit verification code to
                </p>
                <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1">
                  {maskedEmailStr || maskEmail(email)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Code expires in 10 minutes. Check your Spam or Promotions folder if not in inbox.
                </p>
              </div>

              {/* 6-Digit OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  hasError={Boolean(error)}
                  onComplete={code => handleVerifyOtp(code)}
                />
              </div>

              {/* Verify Button */}
              <button
                type="button"
                id="verify-email-otp-btn"
                disabled={loading || otp.length !== 6}
                onClick={() => handleVerifyOtp()}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Verifying Code…' : 'Verify & Activate Account'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              {/* Resend & Countdown */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  id="resend-email-otp-btn"
                  disabled={cooldown > 0 || resending}
                  onClick={() => handleResendOtp('email_verification')}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resending
                      ? 'Sending…'
                      : cooldown > 0
                      ? `Resend Code (${cooldown}s)`
                      : 'Resend Verification Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    resetForm();
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODE: FORGOT PASSWORD (STEP 1) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 animate-in fade-in duration-200">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Enter your account email. If registered, we will send a secure 6-digit recovery code via Gmail SMTP.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="send-recovery-code-btn"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Sending Code…' : 'Send 6-Digit Recovery Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODE: RESET PASSWORD OTP (STEP 2) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {mode === 'reset-password-otp' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the 6-digit password recovery code sent to
                </p>
                <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1">
                  {maskedEmailStr || maskEmail(email)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Code expires in 10 minutes. Check Spam if not received.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                  6-Digit Recovery Code
                </label>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  hasError={Boolean(error)}
                  onComplete={code => handleVerifyResetOtp(code)}
                />
              </div>

              <button
                type="button"
                id="verify-reset-otp-btn"
                disabled={loading || otp.length !== 6}
                onClick={() => handleVerifyResetOtp()}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Verifying Code…' : 'Verify Recovery Code'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  id="resend-reset-otp-btn"
                  disabled={cooldown > 0 || resending}
                  onClick={() => handleResendOtp('password_reset')}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resending
                      ? 'Sending…'
                      : cooldown > 0
                      ? `Resend Code (${cooldown}s)`
                      : 'Resend Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    resetForm();
                  }}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MODE: SET NEW PASSWORD (STEP 3) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {mode === 'reset-password-new' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-in fade-in duration-200">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose a strong new password. Once updated, any other active sessions will be invalidated for your security.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="new-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 ml-1">Minimum 6 characters.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="set-new-password-btn"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Updating Password…' : 'Reset Password & Invalidate Sessions'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Mode Switch Footers for Login / Register */}
          {mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  id="switch-to-register-btn"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setSuccessNotice('');
                  }}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Sign Up — 7 Days Free
                </button>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  id="switch-to-login-btn"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccessNotice('');
                  }}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
