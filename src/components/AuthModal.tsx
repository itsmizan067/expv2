import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle,
  Wallet,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  ShieldCheck
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

        if (result.requiresVerification) {
          // Transition to OTP verification screen
          setMaskedEmailStr(result.maskedEmail || maskEmail(email));
          setCooldown(60);
          setOtp('');
          setMode('verify-email');
          setSuccessNotice(result.message || 'A 6-digit verification code has been sent to your Gmail inbox.');
        } else if (result.user) {
          onSuccess(result.user);
          handleClose();
        }
      }
    } catch (err: any) {
      // If login succeeded but email is not verified yet, show as guidance, not an error
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setMaskedEmailStr(err.maskedEmail || maskEmail(email));
        setCooldown(60);
        setOtp('');
        setMode('verify-email');
        setError('');
        setSuccessNotice(err.message || 'A 6-digit verification code has been sent to your Gmail inbox.');
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials.');
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
      setSuccessNotice('Email verified successfully! Welcome aboard.');
      setTimeout(() => {
        onSuccess(result.user);
        handleClose();
      }, 700);
    } catch (err: any) {
      if (err instanceof ApiError && typeof err.attemptsRemaining === 'number') {
        setAttemptsRemaining(err.attemptsRemaining);
      }
      setError(err?.message || 'Verification failed. Please check the code.');
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
      setSuccessNotice(res.message || 'A new 6-digit verification code has been dispatched to your Gmail inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again shortly.');
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
      setSuccessNotice(res.message || 'If an account exists, a 6-digit password recovery code has been sent.');
    } catch (err: any) {
      setError(err?.message || 'Failed to request recovery code.');
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
      setSuccessNotice('Code verified! Please choose a new password.');
      setMode('reset-password-new');
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Password Reset Step 3: Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length === 0) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');

    try {
      await resetPasswordWithOtp(email, newPassword, otp);
      setSuccessNotice('Your password has been reset successfully! You can now sign in.');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. The recovery session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AuthModalMode) => {
    setMode(next);
    setError('');
    setSuccessNotice('');
    setAttemptsRemaining(null);
  };

  const currencies = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'CAD', 'AUD', 'SGD', 'JPY'];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Accent Top Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                {mode === 'verify-email' ? (
                  <ShieldCheck className="w-5 h-5 text-white" />
                ) : mode.startsWith('reset-password') || mode === 'forgot-password' ? (
                  <KeyRound className="w-5 h-5 text-white" />
                ) : (
                  <Wallet className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 id="auth-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {mode === 'login' && 'Welcome Back'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'verify-email' && 'Verify Your Gmail'}
                  {mode === 'forgot-password' && 'Reset Password'}
                  {mode === 'reset-password-otp' && 'Enter Recovery Code'}
                  {mode === 'reset-password-new' && 'Set New Password'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {mode === 'login' && 'Sign in to access your finances'}
                  {mode === 'register' && '7-Day Free Trial • Verified via Gmail OTP'}
                  {mode === 'verify-email' && 'Enter 6-digit OTP code sent to your inbox'}
                  {mode === 'forgot-password' && 'Enter your email to receive a recovery code'}
                  {mode === 'reset-password-otp' && 'Enter the 6-digit code sent to your email'}
                  {mode === 'reset-password-new' && 'Create a strong, secure new password'}
                </p>
              </div>
            </div>
            <button
              id="close-auth-modal-btn"
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              title="Close"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-all duration-200 hover:rotate-90 active:scale-90 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>

          {/* Success Notice */}
          {successNotice && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-400 font-medium flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {attemptsRemaining !== null && (
                  <p className="mt-1 font-bold text-[11px] text-rose-600 dark:text-rose-400">
                    {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before this code expires.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* MODE: LOGIN or REGISTER */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="auth-name-input"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email-input"
                    type="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      id="forgot-password-link"
                      onClick={() => switchMode('forgot-password')}
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={1}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Currency (register only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Default Currency
                  </label>
                  <select
                    id="auth-currency-select"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition cursor-pointer"
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
                className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
              >
                <span>
                  {loading
                    ? 'Please wait…'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Send Verification Code'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MODE: VERIFY EMAIL OTP */}
          {mode === 'verify-email' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verification code dispatched to:
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {maskedEmailStr || maskEmail(email)}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  ⏱️ Valid for 10 minutes
                </p>
              </div>

              {/* 6-Digit OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  hasError={Boolean(error)}
                  onComplete={code => handleVerifyOtp(code)}
                />
              </div>

              <button
                type="button"
                id="verify-email-otp-btn"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
              >
                <span>{loading ? 'Verifying…' : 'Verify & Activate Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Resend Code Button & Timer */}
              <div className="pt-2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  id="resend-otp-btn"
                  onClick={() => handleResendOtp('email_verification')}
                  disabled={cooldown > 0 || resending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {cooldown > 0
                    ? `Resend Code in ${cooldown}s`
                    : resending
                    ? 'Sending fresh code…'
                    : 'Resend Verification Code'}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                >
                  Entered wrong email? Change email address
                </button>
              </div>
            </div>
          )}

          {/* MODE: FORGOT PASSWORD (STEP 1: Request Email) */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="send-recovery-code-btn"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Sending code…' : 'Send Recovery Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          )}

          {/* MODE: RESET PASSWORD (STEP 2: Enter OTP) */}
          {mode === 'reset-password-otp' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Recovery code sent to:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {maskedEmailStr || maskEmail(email)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Recovery Code
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
                id="verify-recovery-otp-btn"
                onClick={() => handleVerifyResetOtp()}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Verifying…' : 'Verify Recovery Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResendOtp('password_reset')}
                  disabled={cooldown > 0 || resending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Recovery Code'}
                </button>
              </div>
            </div>
          )}

          {/* MODE: RESET PASSWORD (STEP 3: Set New Password) */}
          {mode === 'reset-password-new' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={1}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={1}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="save-new-password-btn"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{loading ? 'Saving…' : 'Set New Password & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Footer Mode Switch */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              {mode === 'login' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    id="switch-to-register-btn"
                    onClick={() => switchMode('register')}
                    className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Sign Up — 7 Days Free
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    id="switch-to-login-btn"
                    onClick={() => switchMode('login')}
                    className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
