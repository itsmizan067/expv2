export type UserRole = 'super_admin' | 'admin' | 'user';
export type AccountStatus = 'unverified' | 'pending' | 'active' | 'disabled';
export type SubscriptionPlan = 'trial' | 'standard' | 'premium' | 'expired';
export type PlanStatus = 'active' | 'expired' | 'pending_payment';
export type OtpPurpose = 'email_verification' | 'password_reset';

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
  openingBalance?: number;
  phone?: string;
  profilePicture?: string; // base64 data URL
  // Subscription
  plan?: SubscriptionPlan;
  planStatus?: PlanStatus;
  trialEndsAt?: string;
  planExpiresAt?: string;
  // Email verification & OTP security
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  otpHash?: string;
  otpExpiresAt?: string;
  otpAttempts?: number;
  otpLastSentAt?: string;
  otpPurpose?: OtpPurpose;
  otpVerifiedAt?: string;
  otpResendCount?: number;
  otpResendWindowStart?: string;
  tokenVersion?: number;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: 'standard' | 'premium';
  amount: number;
  bkashTransactionId: string;
  screenshotUrl?: string; // base64 data URL
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'TRANSACTION_ADD'
    | 'TRANSACTION_UPDATE'
    | 'TRANSACTION_DELETE'
    | 'OFFLINE_SYNC'
    | 'ACCOUNT_REGISTER'
    | 'STATUS_CHANGE'
    | 'ACCOUNT_DELETE'
    | 'PAYMENT_SUBMIT'
    | 'PAYMENT_APPROVE'
    | 'PAYMENT_REJECT'
    | 'USER_PLAN_UPDATE'
    | 'EMAIL_VERIFY'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_SUCCESS'
    | 'OTP_SENT'
    | 'BACKUP_EXPORT'
    | 'BACKUP_RESTORE';
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
  deletedAt?: string; // Tombstone deletion timestamp
  version: number; // Monotonically increasing version counter
  clientMutationId?: string; // Idempotency key from last mutation
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
  status: 'success' | 'partial' | 'error' | 'subscription_required';
  message: string;
  conflictsResolved?: number;
}

export interface SyncQueueItem {
  id: string;
  clientMutationId: string; // Cryptographically random UUID for idempotency
  action: 'create' | 'update' | 'delete';
  transaction: Transaction;
  baseVersion: number; // Version the client was modifying
  timestamp: string; // Mutation ISO creation timestamp
  queuedAt: string;
}

export interface ProcessedMutationResult {
  clientMutationId: string;
  transactionId: string;
  action: 'create' | 'update' | 'delete';
  status: 'committed' | 'already_processed' | 'conflict_rejected' | 'conflict_resolved';
  canonicalTransaction?: Transaction;
}

export interface IncrementalSyncRequest {
  lastSyncCursor?: string;
  mutations?: SyncQueueItem[];
}

export interface IncrementalSyncResponse {
  serverCursor: string;
  processedMutations: ProcessedMutationResult[];
  changedTransactions: Transaction[];
  serverTotalCount: number;
  conflictsResolved: number;
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

export interface BackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  userPreferences?: {
    currency?: string;
    monthlyBudgetLimit?: number;
    openingBalance?: number;
  };
  transactions: Transaction[];
}
