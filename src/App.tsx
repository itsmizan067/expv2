import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Transaction, SyncResult } from './types';
import { OfflineStorageManager } from './lib/offlineManager';
import { getStoredUser, setStoredUser, updateProfile } from './lib/api';
import { Header } from './components/Header';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { DashboardStats } from './components/DashboardStats';
import { ChartsView } from './components/ChartsView';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { BudgetModal } from './components/BudgetModal';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { ExportImportModal } from './components/ExportImportModal';
import { LandingPage } from './components/LandingPage';
import { SubscriptionWall } from './components/SubscriptionWall';
import { MonthlyReport } from './components/MonthlyReport';
import {
  Plus,
  BarChart3,
  ListOrdered,
  LayoutDashboard,
  FileText,
} from 'lucide-react';

export default function App() {
  // ─── Session State ────────────────────────────────────────────────────────
  // Start as null — the LandingPage is shown until the user signs in.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getStoredUser();
  });

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'analytics' | 'admin' | 'report'>('dashboard');

  // Subscription wall state
  const [showSubWall, setShowSubWall] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<'income' | 'expense'>('expense');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // PWA Install Prompt
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Returns true if the user has any elevated role (admin or super_admin). */
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // ─── Offline Storage Manager ──────────────────────────────────────────────
  const offlineManager = useMemo(() => {
    return new OfflineStorageManager(currentUser?.id || 'guest');
  }, [currentUser?.id]);

  // ─── Load local data on mount / user change ────────────────────────────────
  const refreshLocalData = useCallback(() => {
    const localTxs = offlineManager.getLocalTransactions();
    const queue = offlineManager.getPendingQueue();
    const lastSync = offlineManager.getLastSyncTime();
    setTransactions(localTxs);
    setPendingCount(queue.length);
    setLastSyncTime(lastSync);
  }, [offlineManager]);

  useEffect(() => {
    refreshLocalData();
  }, [refreshLocalData]);

  // ─── Cloud Sync ───────────────────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    if (!currentUser || isAdmin || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const result = await offlineManager.syncWithServer();
      setLastSyncResult(result);
      if (result.status === 'success') {
        refreshLocalData();
      }
    } catch (e: any) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, isAdmin, offlineManager, refreshLocalData]);

  // Keep a stable ref to triggerSync to avoid re-running the network
  // listener effect every time the callback identity changes.
  const triggerSyncRef = useRef(triggerSync);
  useEffect(() => {
    triggerSyncRef.current = triggerSync;
  }, [triggerSync]);

  // ─── Network Listeners & Auto-Sync ────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSyncRef.current();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine && currentUser && !isAdmin) {
      triggerSyncRef.current();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, isAdmin]);

  // ─── PWA Service Worker & Install Prompt ──────────────────────────────────
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration skipped:', err);
      });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
        setShowInstallBanner(false);
      }
    } else {
      setShowInstallBanner(true);
    }
  };

  // ─── Auth Actions ─────────────────────────────────────────────────────────

  const openSignIn = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setStoredUser(user);
    const userIsAdmin = user.role === 'admin' || user.role === 'super_admin';
    setActiveTab(userIsAdmin ? 'admin' : 'dashboard');
    // Check subscription for regular users
    if (!userIsAdmin) {
      const trialActive = user.plan === 'trial' && user.trialEndsAt && new Date() < new Date(user.trialEndsAt);
      const planActive = (user.plan === 'standard' || user.plan === 'premium') && user.planStatus === 'active' && user.planExpiresAt && new Date() < new Date(user.planExpiresAt);
      if (!trialActive && !planActive) {
        setShowSubWall(true);
      }
    }
    setTimeout(() => {
      refreshLocalData();
      if (navigator.onLine && !userIsAdmin) {
        triggerSync();
      }
    }, 100);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStoredUser(null);
    setTransactions([]);
    setPendingCount(0);
    setActiveTab('dashboard');
    setShowSubWall(false);
    setPendingPayment(null);
  };

  // ─── Transaction CRUD (Offline-First) ─────────────────────────────────────
  const handleSaveTransaction = (txData: Partial<Transaction>) => {
    if (!currentUser) return;

    if (txData.id) {
      const existing = transactions.find(t => t.id === txData.id);
      if (existing) {
        const updatedTx: Transaction = {
          ...existing,
          ...txData,
          type: txData.type || existing.type,
          amount: txData.amount || existing.amount,
          category: txData.category || existing.category,
          date: txData.date || existing.date,
          paymentMethod: txData.paymentMethod || existing.paymentMethod,
          note: txData.note !== undefined ? txData.note : existing.note,
          tags: txData.tags || existing.tags,
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending',
        };
        offlineManager.enqueueAction('update', updatedTx);
      }
    } else {
      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.id,
        type: txData.type || 'expense',
        amount: Number(txData.amount) || 0,
        category: txData.category || 'Miscellaneous',
        date: txData.date || new Date().toISOString().slice(0, 10),
        paymentMethod: txData.paymentMethod || 'cash',
        note: txData.note || '',
        tags: txData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      offlineManager.enqueueAction('create', newTx);
    }

    refreshLocalData();
    if (isOnline) triggerSync();
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    offlineManager.enqueueAction('delete', tx);
    refreshLocalData();
    if (isOnline) triggerSync();
  };

  const handleImportTransactions = (imported: Transaction[]) => {
    for (const tx of imported) {
      offlineManager.enqueueAction('create', tx);
    }
    refreshLocalData();
    if (isOnline) triggerSync();
  };

  const handleSaveBudgetPrefs = async (budget: number, currency: string) => {
    if (!currentUser) return;
    try {
      const updated = await updateProfile(currentUser.id, { monthlyBudgetLimit: budget, currency });
      setCurrentUser(updated);
    } catch {
      const updatedLocal = { ...currentUser, monthlyBudgetLimit: budget, currency };
      setCurrentUser(updatedLocal);
      setStoredUser(updatedLocal);
    }
  };

  // ─── Financial Stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    let monthInc = 0;
    let monthExp = 0;

    transactions.forEach(t => {
      if (t.isDeleted) return;
      if (t.type === 'income') {
        inc += t.amount;
        if (t.date.startsWith(currentMonthPrefix)) monthInc += t.amount;
      } else {
        exp += t.amount;
        if (t.date.startsWith(currentMonthPrefix)) monthExp += t.amount;
      }
    });

    const net = inc - exp;
    const rate = inc > 0 ? (Math.max(0, net) / inc) * 100 : 0;

    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: net,
      savingsRate: rate,
      transactionCount: transactions.filter(t => !t.isDeleted).length,
      thisMonthIncome: monthInc,
      thisMonthExpense: monthExp,
    };
  }, [transactions]);

  // Ensure admin users always land on the admin tab
  useEffect(() => {
    if (isAdmin && activeTab !== 'admin') {
      setActiveTab('admin');
    }
  }, [isAdmin, activeTab]);

  // ─── Render ───────────────────────────────────────────────────────────────

  // Show the landing page for unauthenticated visitors
  if (!currentUser) {
    return (
      <>
        {/* Header on the landing page (minimal — just branding + auth buttons) */}
        <Header
          user={null}
          isOnline={isOnline}
          isSyncing={false}
          pendingCount={0}
          onOpenNewTx={() => {}}
          onOpenBudget={() => {}}
          onOpenExport={() => {}}
          onOpenAuth={openSignIn}
          onSignUp={openSignUp}
          onLogout={() => {}}
          onInstallClick={handleInstallClick}
          canInstall={!!deferredInstallPrompt}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onManualSync={() => {}}
        />

        <LandingPage onSignIn={openSignIn} onSignUp={openSignUp} />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          initialMode={authModalMode}
        />

        <InstallPrompt
          deferredPrompt={deferredInstallPrompt}
          onInstall={handleInstallClick}
          isOpen={showInstallBanner}
          onClose={() => setShowInstallBanner(false)}
        />
      </>
    );
  }

  // ─── Authenticated App Shell ───────────────────────────────────────────────

  // Show subscription wall for expired/no plan users
  if (showSubWall && currentUser && currentUser.role === 'user') {
    return (
      <SubscriptionWall
        user={currentUser}
        pendingPayment={pendingPayment}
        onSubscriptionSuccess={() => setShowSubWall(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">

      <Header
        user={currentUser}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onOpenNewTx={() => {
          setEditingTransaction(null);
          setDefaultTxType('expense');
          setIsTxModalOpen(true);
        }}
        onOpenBudget={() => setIsBudgetModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenAuth={openSignIn}
        onSignUp={openSignUp}
        onLogout={handleLogout}
        onInstallClick={handleInstallClick}
        canInstall={!!deferredInstallPrompt || !showInstallBanner}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onManualSync={triggerSync}
      />

      {/* Offline/sync banner — only for regular users */}
      {!isAdmin && (
        <OfflineSyncBanner
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          lastSyncResult={lastSyncResult}
          lastSyncTime={lastSyncTime}
          onSyncNow={triggerSync}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">

        {/* ── Admin / Super-Admin Panel ── */}
        {isAdmin ? (
          <AdminPanel adminUser={currentUser} />
        ) : (
          /* ── Standard User Views ── */
          <div className="space-y-6">

            {activeTab === 'dashboard' && (
              <>
                <DashboardStats
                  totalIncome={stats.totalIncome}
                  totalExpense={stats.totalExpense}
                  netBalance={stats.netBalance}
                  savingsRate={stats.savingsRate}
                  monthlyBudgetLimit={currentUser.monthlyBudgetLimit || 3200}
                  currency={currentUser.currency || 'USD'}
                  onOpenNewIncome={() => {
                    setEditingTransaction(null);
                    setDefaultTxType('income');
                    setIsTxModalOpen(true);
                  }}
                  onOpenNewExpense={() => {
                    setEditingTransaction(null);
                    setDefaultTxType('expense');
                    setIsTxModalOpen(true);
                  }}
                  onOpenBudget={() => setIsBudgetModalOpen(true)}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                  <div className="lg:col-span-2">
                    <TransactionList
                      transactions={transactions}
                      currency={currentUser.currency || 'USD'}
                      onEdit={tx => {
                        setEditingTransaction(tx);
                        setIsTxModalOpen(true);
                      }}
                      onDelete={handleDeleteTransaction}
                      onAddNew={() => {
                        setEditingTransaction(null);
                        setDefaultTxType('expense');
                        setIsTxModalOpen(true);
                      }}
                    />
                  </div>
                  <div>
                    <ChartsView
                      transactions={transactions}
                      currency={currentUser.currency || 'USD'}
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'transactions' && (
              <TransactionList
                transactions={transactions}
                currency={currentUser.currency || 'USD'}
                onEdit={tx => {
                  setEditingTransaction(tx);
                  setIsTxModalOpen(true);
                }}
                onDelete={handleDeleteTransaction}
                onAddNew={() => {
                  setEditingTransaction(null);
                  setDefaultTxType('expense');
                  setIsTxModalOpen(true);
                }}
              />
            )}

            {activeTab === 'analytics' && (
              <ChartsView
                transactions={transactions}
                currency={currentUser.currency || 'USD'}
              />
            )}

            {activeTab === 'report' && (
              <MonthlyReport
                transactions={transactions}
                user={currentUser}
                currency={currentUser.currency || 'USD'}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav — only for regular users */}
      {!isAdmin && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white z-40 px-4 py-2 flex items-center justify-around"
        >
          <button
            id="mobile-nav-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition ${
              activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="mt-0.5">Overview</span>
          </button>

          <button
            id="mobile-nav-add"
            onClick={() => {
              setEditingTransaction(null);
              setDefaultTxType('expense');
              setIsTxModalOpen(true);
            }}
            className="flex flex-col items-center -mt-5 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-full shadow-lg border-4 border-slate-900 transition active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>

          <button
            id="mobile-nav-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition ${
              activeTab === 'transactions' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <ListOrdered className="w-5 h-5" />
            <span className="mt-0.5">History</span>
          </button>

          <button
            id="mobile-nav-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition ${
              activeTab === 'analytics' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="mt-0.5">Analytics</span>
          </button>

          <button
            id="mobile-nav-report"
            onClick={() => setActiveTab('report')}
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition ${
              activeTab === 'report' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="mt-0.5">Report</span>
          </button>
        </nav>
      )}

      {/* ── Modals ── */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        defaultType={defaultTxType}
        currency={currentUser.currency || 'USD'}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        monthlyBudgetLimit={currentUser.monthlyBudgetLimit || 3200}
        currentCurrency={currentUser.currency || 'USD'}
        onSave={handleSaveBudgetPrefs}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        onImport={handleImportTransactions}
      />

      <InstallPrompt
        deferredPrompt={deferredInstallPrompt}
        onInstall={handleInstallClick}
        isOpen={showInstallBanner}
        onClose={() => setShowInstallBanner(false)}
      />

    </div>
  );
}
