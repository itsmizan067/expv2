import { User, ActivityLog, Transaction, AccountStatus } from '../types';

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

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to login');
  }

  setStoredUser(data.user);
  return data;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  currency?: string;
  monthlyBudgetLimit?: number;
}): Promise<{ user: User; message: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to register');
  }

  return data;
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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }

  setStoredUser(data.user);
  return data.user;
}

// Admin APIs
export async function getAdminUsers(adminId: string): Promise<Array<User & { transactionCount: number }>> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: { 'x-user-id': adminId },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load user accounts');
  }
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update account status');
  }
  return data.user;
}

export async function deleteAdminUser(adminId: string, targetUserId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${targetUserId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': adminId },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete account');
  }
}

export async function getAdminActivityLogs(adminId: string, filters?: { userId?: string; action?: string }): Promise<ActivityLog[]> {
  const query = new URLSearchParams();
  if (filters?.userId) query.append('userId', filters.userId);
  if (filters?.action) query.append('action', filters.action);

  const res = await fetch(`${API_BASE}/admin/logs?${query.toString()}`, {
    headers: { 'x-user-id': adminId },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch activity logs');
  }
  return data.logs;
}
