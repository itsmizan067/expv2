import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { 
  Plus, 
  BarChart3, 
  ListOrdered, 
  LayoutDashboard, 
  ShieldCheck, 
  WifiOff, 
  Smartphone,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = getStoredUser();
    if (saved) return saved;
    // Default seed user for instant usability
    return {
      id: 'user-demo',
      name: 'Mizanur Rahman',
      email: 'user@finance.app',
      role: 'user',
      status: 'active',
      createdAt: '2025-02-01T09:30:00.000Z',
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      totalLogins: 28,
      currency: 'USD',
      monthlyBudgetLimit: 3200,
    };
  });

  // Navigation Tabs: 'dashboard' | 'transactions' | 'analytics' | 'admin'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'analytics' | 'admin'>('dashboard');

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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // PWA Install Prompt
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Offline Storage Manager instance
  const offlineManager = useMemo(() => {
    return new OfflineStorageManager(currentUser?.id || 'guest');
  }, [currentUser?.id]);

  // Load transactions and sync time from local storage on mount / user change
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

  // Perform Cloud Sync
  const triggerSync = useCallback(async () => {
    if (!currentUser || currentUser.role === 'admin' || !navigator.onLine) return;
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
  }, [currentUser, offlineManager, refreshLocalData]);

  // Network Listeners & Auto-Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync when connection returns
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check if online
    if (navigator.onLine && currentUser && currentUser.role !== 'admin') {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, triggerSync]);

  // PWA Service Worker & Install Prompt setup
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration skipped:', err);
      });
    }

    // Capture install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
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

  // User Auth Actions
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setStoredUser(user);
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
    // Refresh data for new user
    setTimeout(() => {
      refreshLocalData();
      if (navigator.onLine && user.role !== 'admin') {
        triggerSync();
      }
    }, 100);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStoredUser(null);
    setIsAuthModalOpen(true);
  };

  // Transaction CRUD handlers (Offline-First)
  const handleSaveTransaction = (txData: Partial<Transaction>) => {
    if (!currentUser) return;

    if (txData.id) {
      // Update
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
      // Create new
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

    // Trigger cloud sync if online
    if (isOnline) {
      triggerSync();
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    offlineManager.enqueueAction('delete', tx);
    refreshLocalData();

    if (isOnline) {
      triggerSync();
    }
  };

  const handleImportTransactions = (imported: Transaction[]) => {
    for (const tx of imported) {
      offlineManager.enqueueAction('create', tx);
    }
    refreshLocalData();
    if (isOnline) {
      triggerSync();
    }
  };

  const handleSaveBudgetPrefs = async (budget: number, currency: string) => {
    if (!currentUser) return;
    try {
      const updated = await updateProfile(currentUser.id, {
        monthlyBudgetLimit: budget,
        currency,
      });
      setCurrentUser(updated);
    } catch {
      // Update locally if offline
      const updatedLocal = { ...currentUser, monthlyBudgetLimit: budget, currency };
      setCurrentUser(updatedLocal);
      setStoredUser(updatedLocal);
    }
  };

  // Financial Stats Calculation
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

  // Set active tab based on user role if out of sync
  useEffect(() => {
    if (currentUser?.role === 'admin' && activeTab !== 'admin') {
      setActiveTab('admin');
    }
  }, [currentUser?.role, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
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
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onInstallClick={handleInstallClick}
        canInstall={!!deferredInstallPrompt || !showInstallBanner}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onManualSync={triggerSync}
      />

      {/* Offline Status & Cloud Synchronization Banner */}
      {currentUser && currentUser.role !== 'admin' && (
        <OfflineSyncBanner
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          lastSyncResult={lastSyncResult}
          lastSyncTime={lastSyncTime}
          onSyncNow={triggerSync}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        
        {/* If Admin Role */}
        {currentUser?.role === 'admin' ? (
          <AdminPanel adminUser={currentUser} />
        ) : (
          /* Standard User Views */
          <div className="space-y-6">
            
            {/* Overview / Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <>
                <DashboardStats
                  totalIncome={stats.totalIncome}
                  totalExpense={stats.totalExpense}
                  netBalance={stats.netBalance}
                  savingsRate={stats.savingsRate}
                  monthlyBudgetLimit={currentUser?.monthlyBudgetLimit || 3200}
                  currency={currentUser?.currency || 'USD'}
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
                      currency={currentUser?.currency || 'USD'}
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
                      currency={currentUser?.currency || 'USD'}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <TransactionList
                transactions={transactions}
                currency={currentUser?.currency || 'USD'}
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

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <ChartsView
                transactions={transactions}
                currency={currentUser?.currency || 'USD'}
              />
            )}

          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      {currentUser && currentUser.role !== 'admin' && (
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
        </nav>
      )}

      {/* Modals & Install Prompts */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        defaultType={defaultTxType}
        currency={currentUser?.currency || 'USD'}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        monthlyBudgetLimit={currentUser?.monthlyBudgetLimit || 3200}
        currentCurrency={currentUser?.currency || 'USD'}
        onSave={handleSaveBudgetPrefs}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
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
