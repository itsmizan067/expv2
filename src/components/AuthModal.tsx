import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { User } from '../types';
import { loginUser, registerUser } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPendingMessage('');

    try {
      if (mode === 'login') {
        const result = await loginUser(email, password);
        onSuccess(result.user);
        onClose();
      } else {
        const result = await registerUser({
          name,
          email,
          password,
          currency,
        });

        if (result.user.status === 'pending') {
          setPendingMessage(
            'Account registration successful! An administrator must approve your account before you can log in.'
          );
          setMode('login');
        } else {
          // Admin or auto-active
          const loginRes = await loginUser(email, password);
          onSuccess(loginRes.user);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Logins for easy testing
  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    setError('');
    setPendingMessage('');
    try {
      const result = await loginUser(demoEmail, demoPass);
      onSuccess(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === 'login' ? 'Sign In to Account' : 'Create New Account'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal Income &amp; Expense Management PWA
            </p>
          </div>
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Accounts Quick-Select Pill Box */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Test Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="quick-login-user-btn"
              onClick={() => handleQuickLogin('user@finance.app', 'user123')}
              className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition shadow-2xs group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center justify-between">
                <span>Standard User</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">Active</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">user@finance.app</div>
            </button>

            <button
              type="button"
              id="quick-login-admin-btn"
              onClick={() => handleQuickLogin('admin@finance.app', 'admin123')}
              className="p-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition shadow-2xs group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 flex items-center justify-between">
                <span>Admin Role</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded">Admin</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">admin@finance.app</div>
            </button>
          </div>
        </div>

        {/* Messages */}
        {pendingMessage && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-start space-x-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{pendingMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name-input"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email-input"
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Register Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

        {/* Mode Switch */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-slate-600">
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                id="switch-to-register-btn"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className="font-bold text-emerald-600 hover:underline"
              >
                Register Here
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Already registered?{' '}
              <button
                type="button"
                id="switch-to-login-btn"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="font-bold text-emerald-600 hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
