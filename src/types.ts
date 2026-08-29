export type UserRole = 'admin' | 'user';
export type AccountStatus = 'pending' | 'active' | 'disabled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt: string;
  lastActiveAt: string;
  totalLogins: number;
  currency?: string;
  monthlyBudgetLimit?: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'LOGIN' | 'LOGOUT' | 'TRANSACTION_ADD' | 'TRANSACTION_UPDATE' | 'TRANSACTION_DELETE' | 'OFFLINE_SYNC' | 'ACCOUNT_REGISTER' | 'STATUS_CHANGE' | 'ACCOUNT_DELETE';
  details: string;
  ip?: string;
  device?: string;
  timestamp: string;
}

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 
  | 'cash' 
  | 'credit_card' 
  | 'debit_card' 
  | 'bank_transfer' 
  | 'mobile_wallet' 
  | 'other';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  note: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending';
  isDeleted?: boolean;
}

export interface CategoryBudget {
  category: string;
  limit: number;
  spent: number;
}

export interface SyncResult {
  syncedCount: number;
  serverTotal: number;
  timestamp: string;
  status: 'success' | 'partial' | 'error';
  message: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  transaction: Transaction;
  queuedAt: string;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  transactionCount: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
}
