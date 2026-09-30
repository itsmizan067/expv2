import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Wifi, 
  WifiOff, 
  Download, 
  ShieldCheck, 
  LogOut, 
  Sliders, 
  FileSpreadsheet,
  RefreshCw,
  UserPlus,
  LogIn,
  Crown,
  Star,
  FileText,
  ChevronDown,
  LayoutDashboard,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  user: UserType | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onOpenNewTx: () => void;
  onOpenBudget: () => void;
  onOpenExport: () => void;
  onOpenAuth: () => void;
  onSignUp: () => void;
  onLogout: () => void;
  onInstallClick: () => void;
  canInstall: boolean;
  activeTab: 'dashboard' | 'transactions' | 'analytics' | 'admin' | 'report';
  setActiveTab: (tab: 'dashboard' | 'transactions' | 'analytics' | 'admin' | 'report') => void;
  onManualSync: () => void;
  onOpenProfile?: () => void;
  onOpenPlan?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isOnline,
  isSyncing,
  pendingCount,
  onOpenNewTx,
  onOpenBudget,
  onOpenExport,
  onOpenAuth,
  onSignUp,
  onLogout,
  onInstallClick,
  canInstall,
  activeTab,
  setActiveTab,
  onManualSync,
  onOpenProfile,
  onOpenPlan,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* ── Left: Logo & Brand Name ── */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="relative">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-6 sm:h-6" fill="none">
                  <ellipse cx="16" cy="24" rx="10" ry="3.5" fill="rgba(255,255,255,0.15)"/>
                  <ellipse cx="16" cy="19" rx="10" ry="3.5" fill="rgba(255,255,255,0.20)"/>
                  <ellipse cx="16" cy="14" rx="10" ry="3.5" stroke="white" strokeWidth="1.2" fill="rgba(255,255,255,0.25)"/>
                  <path d="M6 14v10c0 1.93 4.48 3.5 10 3.5S26 25.93 26 24V14" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M6 19c0 1.93 4.48 3.5 10 3.5S26 20.93 26 19" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M16 10V7M14 9l2-2 2 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow border border-slate-900">
                <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white fill-white" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg leading-none">
                Pocket Balance
              </h1>
            </div>
          </div>

          {/* ── Center: Clean Navigation Links (Desktop) ── */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
              {user.role !== 'admin' && user.role !== 'super_admin' ? (
                <>
                  <button
                    id="nav-dashboard-btn"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'dashboard'
                        ? 'bg-slate-700/80 text-emerald-400 shadow-sm border border-slate-600/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>
                  <button
                    id="nav-transactions-btn"
                    onClick={() => setActiveTab('transactions')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'transactions'
                        ? 'bg-slate-700/80 text-emerald-400 shadow-sm border border-slate-600/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Transactions</span>
                  </button>
                  <button
                    id="nav-analytics-btn"
                    onClick={() => setActiveTab('analytics')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'analytics'
                        ? 'bg-slate-700/80 text-emerald-400 shadow-sm border border-slate-600/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                  <button
                    id="nav-report-btn"
                    onClick={() => setActiveTab('report')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeTab === 'report'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Report</span>
                    {user.plan === 'premium' && (
                      <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                    )}
                  </button>
                </>
              ) : (
                <button
                  id="nav-admin-btn"
                  onClick={() => setActiveTab('admin')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Moderation & Logs</span>
                </button>
              )}
            </nav>
          )}

          {/* ── Right: Balanced Action Bar & Profile Menu ── */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            
            {/* Sync & Online Status Pill */}
            {user && (
              <button
                id="header-network-sync-btn"
                onClick={onManualSync}
                title={isOnline ? 'Online · Click to sync changes' : 'Offline · Saving locally'}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isOnline
                    ? isSyncing
                      ? 'bg-sky-950/60 text-sky-300 border-sky-600/40'
                      : 'bg-emerald-950/50 text-emerald-300 border-emerald-600/30 hover:bg-emerald-900/50'
                    : 'bg-amber-950/70 text-amber-300 border-amber-600/50'
                }`}
              >
                {isOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold">Online</span>
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full">
                        {pendingCount}
                      </span>
                    )}
                    <RefreshCw className={`w-3 h-3 text-slate-400 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span className="text-[11px] font-semibold">Offline</span>
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            )}

            {/* Primary Action Button: + Add Record */}
            {user && user.role !== 'admin' && (
              <button
                id="header-add-tx-btn"
                onClick={onOpenNewTx}
                title="Add Record"
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Record</span>
              </button>
            )}

            {/* User Profile & Unified Settings Dropdown */}
            {user ? (
              <div className="relative shrink-0" ref={profileMenuRef}>
                <button
                  id="header-profile-menu-trigger"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-800/80 transition border border-transparent hover:border-slate-700/60"
                  aria-expanded={isProfileMenuOpen}
                  aria-label="User menu"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-600 bg-slate-800 flex items-center justify-center">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[11px] font-bold">
                        {user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                  </div>

                  {/* Name and plan */}
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold text-slate-200 truncate max-w-[110px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                      {user.plan === 'premium' ? (
                        <span className="text-amber-400 font-semibold flex items-center space-x-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          <span>Premium</span>
                        </span>
                      ) : (
                        <span className="capitalize">{user.plan || 'Free'}</span>
                      )}
                    </div>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Profile Floating Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    
                    {/* User Summary Header */}
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <div className="text-sm font-bold text-white truncate">{user.name}</div>
                      <div className="text-xs text-slate-400 truncate">{user.email}</div>
                      <div className="mt-1.5 flex items-center space-x-1.5">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {user.role === 'admin' || user.role === 'super_admin' ? 'Administrator' : `${user.plan || 'Free'} Plan`}
                        </span>
                      </div>
                    </div>

                    {/* Quick Menu Options */}
                    <div className="py-1 text-xs">
                      {onOpenProfile && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenProfile();
                          }}
                          className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2.5 transition"
                        >
                          <Star className="w-4 h-4 text-emerald-400" />
                          <span>Profile & Account</span>
                        </button>
                      )}

                      {user.role !== 'admin' && onOpenPlan && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenPlan();
                          }}
                          className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2.5 transition"
                        >
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span>Subscription & Plans</span>
                        </button>
                      )}

                      {user.role !== 'admin' && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenBudget();
                          }}
                          className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2.5 transition"
                        >
                          <Sliders className="w-4 h-4 text-sky-400" />
                          <span>Budget & Currency</span>
                        </button>
                      )}

                      {user.role !== 'admin' && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenExport();
                          }}
                          className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2.5 transition"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                          <span>Export CSV & Backup</span>
                        </button>
                      )}

                      {canInstall && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onInstallClick();
                          }}
                          className="w-full px-4 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center space-x-2.5 transition"
                        >
                          <Download className="w-4 h-4 text-emerald-400" />
                          <span>Install Desktop/Mobile App</span>
                        </button>
                      )}
                    </div>

                    {/* Divider & Sign Out */}
                    <div className="border-t border-slate-800 pt-1 mt-1">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-2 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center space-x-2.5 text-xs font-semibold transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  id="header-signup-btn"
                  onClick={onSignUp}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Up</span>
                </button>
                <button
                  id="header-signin-btn"
                  onClick={onOpenAuth}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
