import { User, ActivityLog, Transaction, AccountStatus, PaymentRequest } from '../types';

export const API_BASE = '/api';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('income_pwa_current_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (!user) {
    localStorage.removeItem('income_pwa_current_user');
  } else {
    localStorage.setItem('income_pwa_current_user', JSON.stringify(user));
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  requiresVerification?: boolean;
  email?: string;
  maskedEmail?: string;
  attemptsRemaining?: number;
  retryAfter?: number;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = data?.code;
    this.requiresVerification = data?.requiresVerification;
    this.email = data?.email;
    this.maskedEmail = data?.maskedEmail;
    this.attemptsRemaining = data?.attemptsRemaining;
    this.retryAfter = data?.retryAfter;
  }
}

/**
 * Safely parse JSON from a fetch Response, handling empty bodies and non-JSON responses gracefully.
 */
async function safeJson<T = any>(res: Response, fallbackError = 'Request failed'): Promise<T> {
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.error ||
      (res.status === 404
        ? 'Backend API not reachable. Please make sure the dev server is running (`npm run dev`).'
        : `${fallbackError} (HTTP ${res.status})`);
    throw new ApiError(errorMsg, res.status, data);
  }

  return (data || {}) as T;
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await safeJson<{ user: User; token: string }>(res, 'Failed to login');
  setStoredUser(data.user);
  return data;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  currency?: string;
  monthlyBudgetLimit?: number;
  openingBalance?: number;
}): Promise<{
  success: boolean;
  user: User;
  token: string;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await safeJson<{
    success: boolean;
    user: User;
    token: string;
    message?: string;
  }>(res, 'Failed to register');

  if (data.user) {
    setStoredUser(data.user);
  }
  return data;
}

export async function verifyEmailOtp(
  email: string,
  otp: string
): Promise<{ success: boolean; user: User; token: string; message: string }> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  const data = await safeJson<{ success: boolean; user: User; token: string; message: string }>(
    res,
    'Failed to verify email'
  );
  if (data.user) {
    setStoredUser(data.user);
  }
  return data;
}

export async function resendOtp(
  email: string,
  purpose: 'email_verification' | 'password_reset' = 'email_verification'
): Promise<{ success: boolean; message: string; retryAfter?: number; maskedEmail?: string; alreadyVerified?: boolean }> {
  const res = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose }),
  });

  return await safeJson(res, 'Failed to resend code');
}

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string; maskedEmail?: string; retryAfter?: number }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return await safeJson(res, 'Failed to request password reset');
}

export async function verifyPasswordResetOtp(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/verify-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  return await safeJson(res, 'Failed to verify recovery code');
}

export async function resetPasswordWithOtp(
  email: string,
  newPassword: string,
  otp?: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword, otp }),
  });

  return await safeJson(res, 'Failed to reset password');
}

export async function getEmailServiceStatus(): Promise<{
  configured: boolean;
  host: string;
  port: number;
  userMasked: string;
  from: string;
}> {
  const res = await fetch(`${API_BASE}/email/status`);
  return await safeJson(res, 'Failed to get email service status');
}

export async function updateProfile(userId: string, updates: Partial<User>): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify(updates),
  });

  const data = await safeJson<{ user: User }>(res, 'Failed to update profile');
  setStoredUser(data.user);
  return data.user;
}

// Admin APIs
export async function getAdminUsers(adminId: string): Promise<Array<User & { transactionCount: number }>> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: { 'x-user-id': adminId },
  });
  const data = await safeJson<{ users: Array<User & { transactionCount: number }> }>(res, 'Failed to load user accounts');
  return data.users;
}

export async function updateAdminUserStatus(adminId: string, targetUserId: string, status: AccountStatus): Promise<User> {
  const res = await fetch(`${API_BASE}/admin/users/${targetUserId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': adminId,
    },
    body: JSON.stringify({ status }),
  });
  const data = await safeJson<{ user: User }>(res, 'Failed to update account status');
  return data.user;
}

export async function deleteAdminUser(adminId: string, targetUserId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${targetUserId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': adminId },
  });
  await safeJson(res, 'Failed to delete account');
}

export async function updateAdminUserPlan(
  adminId: string,
  targetUserId: string,
  plan: 'trial' | 'standard' | 'premium',
  durationDays = 30
): Promise<User> {
  const res = await fetch(`${API_BASE}/admin/users/${targetUserId}/plan`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': adminId,
    },
    body: JSON.stringify({ plan, durationDays }),
  });
  const data = await safeJson<{ user: User }>(res, 'Failed to update plan');
  return data.user;
}

export async function getAdminActivityLogs(adminId: string, filters?: { userId?: string; action?: string }): Promise<ActivityLog[]> {
  const query = new URLSearchParams();
  if (filters?.userId) query.append('userId', filters.userId);
  if (filters?.action) query.append('action', filters.action);

  const res = await fetch(`${API_BASE}/admin/logs?${query.toString()}`, {
    headers: { 'x-user-id': adminId },
  });
  const data = await safeJson<{ logs: ActivityLog[] }>(res, 'Failed to fetch activity logs');
  return data.logs;
}

// Subscription APIs
export async function getSubscriptionStatus(userId: string): Promise<{
  user: User;
  subscriptionActive: boolean;
  pendingPayment: PaymentRequest | null;
}> {
  const res = await fetch(`${API_BASE}/subscription/status`, {
    headers: { 'x-user-id': userId },
  });
  return await safeJson(res, 'Failed to get subscription status');
}

export async function submitPaymentRequest(
  userId: string,
  payload: { plan: 'standard' | 'premium'; bkashTransactionId: string; screenshotUrl?: string }
): Promise<{ paymentRequest: PaymentRequest; message: string }> {
  const res = await fetch(`${API_BASE}/subscription/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(payload),
  });
  return await safeJson(res, 'Failed to submit payment');
}

export async function getAdminPayments(adminId: string): Promise<PaymentRequest[]> {
  const res = await fetch(`${API_BASE}/admin/payments`, {
    headers: { 'x-user-id': adminId },
  });
  const data = await safeJson<{ paymentRequests: PaymentRequest[] }>(res, 'Failed to load payments');
  return data.paymentRequests;
}

export async function approvePayment(adminId: string, paymentId: string): Promise<PaymentRequest> {
  const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/approve`, {
    method: 'POST',
    headers: { 'x-user-id': adminId },
  });
  const data = await safeJson<{ paymentRequest: PaymentRequest }>(res, 'Failed to approve payment');
  return data.paymentRequest;
}

export async function rejectPayment(adminId: string, paymentId: string, reason?: string): Promise<PaymentRequest> {
  const res = await fetch(`${API_BASE}/admin/payments/${paymentId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
    body: JSON.stringify({ reason }),
  });
  const data = await safeJson<{ paymentRequest: PaymentRequest }>(res, 'Failed to reject payment');
  return data.paymentRequest;
}

// ─── Subscription-Protected Financial Services ────────────────────────────────

export async function fetchMonthlyReport(userId: string, month?: string): Promise<{
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  dayBreakdown: Record<string, { income: number; expense: number }>;
}> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const res = await fetch(`${API_BASE}/reports/monthly${query}`, {
    headers: { 'x-user-id': userId },
  });
  return await safeJson(res, 'Failed to fetch monthly report');
}

export async function fetchAnalyticsSummary(userId: string): Promise<{
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  monthlyBudgetLimit: number;
  budgetUsedPercentage: number;
  savingsRate: number;
  transactionCount: number;
  categoryTotals: Record<string, { income: number; expense: number }>;
}> {
  const res = await fetch(`${API_BASE}/analytics/summary`, {
    headers: { 'x-user-id': userId },
  });
  return await safeJson(res, 'Failed to fetch analytics summary');
}

export async function fetchServerBackup(userId: string): Promise<{
  version: number;
  appName: string;
  exportedAt: string;
  accountEmail?: string;
  userPreferences: {
    currency: string;
    monthlyBudgetLimit: number;
    openingBalance: number;
  };
  transactions: Transaction[];
}> {
  const res = await fetch(`${API_BASE}/backup`, {
    headers: { 'x-user-id': userId },
  });
  return await safeJson(res, 'Failed to download server backup');
}

export async function restoreServerBackup(
  userId: string,
  backup: { transactions: Partial<Transaction>[]; userPreferences?: any }
): Promise<{ message: string; restoredCount: number }> {
  const res = await fetch(`${API_BASE}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify(backup),
  });
  return await safeJson(res, 'Failed to restore backup to server');
}

