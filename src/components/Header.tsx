import React from 'react';
import { 
  Plus, 
  Wifi, 
  WifiOff, 
  Download, 
  ShieldCheck, 
  User, 
  LogOut, 
  Sliders, 
  FileSpreadsheet,
  RefreshCw,
  UserPlus,
  LogIn,
  Crown,
  Star,
  FileText,
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
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <ellipse cx="16" cy="24" rx="10" ry="3.5" fill="rgba(255,255,255,0.15)"/>
                  <ellipse cx="16" cy="19" rx="10" ry="3.5" fill="rgba(255,255,255,0.20)"/>
                  <ellipse cx="16" cy="14" rx="10" ry="3.5" stroke="white" strokeWidth="1.2" fill="rgba(255,255,255,0.25)"/>
                  <path d="M6 14v10c0 1.93 4.48 3.5 10 3.5S26 25.93 26 24V14" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M6 19c0 1.93 4.48 3.5 10 3.5S26 20.93 26 19" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M16 10V7M14 9l2-2 2 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow border border-slate-900">
                <Star className="w-2.5 h-2.5 text-white fill-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-black tracking-tight text-white sm:text-lg leading-tight">
                  Pocket Balance
                </h1>
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Offline-First • Cloud Sync
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
              {user.role !== 'admin' && user.role !== 'super_admin' ? (
                <>
                  <button
                    id="nav-dashboard-btn"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTab === 'dashboard'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    id="nav-transactions-btn"
                    onClick={() => setActiveTab('transactions')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTab === 'transactions'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    Transactions
                  </button>
                  <button
                    id="nav-analytics-btn"
                    onClick={() => setActiveTab('analytics')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTab === 'analytics'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    Analytics & Budget
                  </button>
                  <button
                    id="nav-report-btn"
                    onClick={() => setActiveTab('report')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1 ${
                      activeTab === 'report'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Report</span>
                    {(user.plan !== 'premium' || user.planStatus !== 'active') && (
                      <Crown className="w-3 h-3 text-amber-400" />
                    )}
                  </button>
                </>
              ) : (
                <button
                  id="nav-admin-btn"
                  onClick={() => setActiveTab('admin')}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white shadow-sm flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Moderation & Logs</span>
                </button>
              )}
            </nav>
          )}

          {/* Right Action Icons & Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Network Status Badge & Sync Trigger */}
            <button
              id="header-network-sync-btn"
              onClick={onManualSync}
              title={isOnline ? 'Online - Click to force cloud sync' : 'Offline - Storing changes locally'}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isOnline
                  ? isSyncing
                    ? 'bg-sky-950/60 text-sky-300 border-sky-600/40'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900/60'
                  : 'bg-amber-950/70 text-amber-300 border-amber-600/50'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">Online</span>
                  {pendingCount > 0 ? (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full">
                      {pendingCount}
                    </span>
                  ) : null}
                  <RefreshCw className={`w-3 h-3 ml-0.5 text-slate-400 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Offline</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Install PWA Button */}
            {canInstall && (
              <button
                id="install-pwa-header-btn"
                onClick={onInstallClick}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Install App</span>
              </button>
            )}

            {/* User Logged In Actions */}
            {user ? (
              <div className="flex items-center space-x-2">
                {user.role !== 'admin' && (
                  <>
                    <button
                      id="header-add-tx-btn"
                      onClick={onOpenNewTx}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Record</span>
                    </button>

                    <button
                      id="header-budget-btn"
                      onClick={onOpenBudget}
                      title="Set Budget & Currency"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    <button
                      id="header-export-btn"
                      onClick={onOpenExport}
                      title="Export CSV & Backup"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Profile Pill & Role */}
                <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-800 space-x-2">
                  <button
                    id="header-profile-btn"
                    onClick={onOpenProfile}
                    className="flex items-center space-x-2 hover:bg-slate-800/60 rounded-xl px-2 py-1 transition group"
                    title="View Profile & Plan"
                  >
                    {/* Avatar */}
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-600" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold border border-slate-600">
                        {user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div className="text-right hidden lg:block">
                      <div className="text-xs font-bold text-slate-200 truncate max-w-[120px] group-hover:text-white">
                        {user.name}
                      </div>
                      {user.role === 'user' && (
                        <span className="text-[10px] text-slate-400 capitalize flex items-center justify-end space-x-1">
                          {user.plan === 'premium' && user.planStatus === 'active' ? (
                            <span className="text-amber-400 font-semibold flex items-center space-x-1"><Crown className="w-3 h-3" /><span>Premium</span></span>
                          ) : user.plan === 'standard' && user.planStatus === 'active' ? (
                            <span className="text-sky-400 font-semibold">Standard</span>
                          ) : user.plan === 'trial' ? (
                            <span className="text-emerald-400 font-semibold">Trial</span>
                          ) : (
                            <span>Standard User</span>
                          )}
                        </span>
                      )}
                      {(user.role === 'admin' || user.role === 'super_admin') && (
                        <span className="text-[10px] text-indigo-400 font-semibold">Administrator</span>
                      )}
                    </div>
                  </button>

                  <button
                    id="header-logout-btn"
                    onClick={onLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
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
