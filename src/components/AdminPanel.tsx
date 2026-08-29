import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Trash2, 
  Clock, 
  Activity, 
  Calendar, 
  Smartphone, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  XCircle,
  Database,
  Users,
  ShieldAlert
} from 'lucide-react';
import { User, ActivityLog, AccountStatus } from '../types';
import { 
  getAdminUsers, 
  updateAdminUserStatus, 
  deleteAdminUser, 
  getAdminActivityLogs 
} from '../lib/api';

interface AdminPanelProps {
  adminUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ adminUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<Array<User & { transactionCount: number }>>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [logActionFilter, setLogActionFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, logsData] = await Promise.all([
        getAdminUsers(adminUser.id),
        getAdminActivityLogs(adminUser.id),
      ]);
      setUsers(usersData);
      setLogs(logsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adminUser.id]);

  const handleStatusChange = async (targetUserId: string, newStatus: AccountStatus) => {
    try {
      await updateAdminUserStatus(adminUser.id, targetUserId, newStatus);
      setSuccessMessage(`User status successfully changed to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to change status');
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    try {
      await deleteAdminUser(adminUser.id, targetUserId);
      setSuccessMessage('User account deleted successfully');
      setConfirmDeleteId(null);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    if (logActionFilter !== 'all' && l.action !== logActionFilter) return false;
    return true;
  });

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Admin Notice Banner */}
      <div className="bg-indigo-950/80 border border-indigo-800/80 p-5 rounded-2xl text-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">Administrator Control Console</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Moderation strictly allows approving new accounts, disabling/deleting users, and reviewing activity history.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="admin-refresh-data-btn"
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-700 text-indigo-100 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-indigo-800/60">
          <button
            id="admin-tab-users-btn"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-200 hover:text-white hover:bg-indigo-900/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts ({users.length})</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-950 font-extrabold rounded-full text-[10px]">
                {pendingCount} Pending
              </span>
            )}
          </button>

          <button
            id="admin-tab-logs-btn"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-200 hover:text-white hover:bg-indigo-900/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Audit Activity Logs ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-search-users-input"
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('disabled')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  statusFilter === 'disabled' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Activity Timeline</th>
                  <th className="py-3 px-4 text-center">Tx Count</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => {
                  const isSelf = u.id === adminUser.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                        <div className="text-slate-500 text-xs">{u.email}</div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {u.status === 'active' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        )}
                        {u.status === 'pending' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-bold text-[11px] animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Approval</span>
                          </span>
                        )}
                        {u.status === 'disabled' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Activity Timestamps */}
                      <td className="py-3 px-4 space-y-0.5 text-[11px]">
                        <div>
                          <strong className="text-slate-700">Since when using:</strong> {formatDate(u.createdAt)}
                        </div>
                        <div>
                          <strong className="text-slate-700">Last logged in:</strong> {formatDate(u.lastLoginAt)}
                        </div>
                        <div className="text-slate-400">
                          Total Logins: {u.totalLogins || 1}
                        </div>
                      </td>

                      {/* Transaction Count */}
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {u.transactionCount || 0}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isSelf ? (
                          <span className="text-[11px] text-slate-400 italic">Current Session</span>
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            
                            {/* Approve Button for pending */}
                            {u.status === 'pending' && (
                              <button
                                id={`admin-approve-user-${u.id}`}
                                onClick={() => handleStatusChange(u.id, 'active')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {/* Enable/Disable Toggle */}
                            {u.status === 'active' ? (
                              <button
                                id={`admin-disable-user-${u.id}`}
                                onClick={() => handleStatusChange(u.id, 'disabled')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Disable</span>
                              </button>
                            ) : u.status === 'disabled' ? (
                              <button
                                id={`admin-enable-user-${u.id}`}
                                onClick={() => handleStatusChange(u.id, 'active')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Enable</span>
                              </button>
                            ) : null}

                            {/* Delete User */}
                            {confirmDeleteId === u.id ? (
                              <div className="flex items-center space-x-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-slate-500 text-[10px] px-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                id={`admin-delete-user-${u.id}`}
                                onClick={() => setConfirmDeleteId(u.id)}
                                title="Delete user and all data"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">System Activity Audit Log</h3>
              <p className="text-xs text-slate-500">
                Tracking when users log in, when they sync offline data, and account modifications.
              </p>
            </div>

            {/* Filter by action */}
            <select
              id="admin-filter-log-action-select"
              value={logActionFilter}
              onChange={e => setLogActionFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">User Logins</option>
              <option value="OFFLINE_SYNC">Offline Sync Events</option>
              <option value="TRANSACTION_ADD">Transactions Added</option>
              <option value="ACCOUNT_REGISTER">New Registrations</option>
              <option value="STATUS_CHANGE">Admin Status Changes</option>
            </select>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No activity logs recorded yet.
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      log.action === 'LOGIN'
                        ? 'bg-blue-50 text-blue-600'
                        : log.action === 'OFFLINE_SYNC'
                        ? 'bg-emerald-50 text-emerald-600'
                        : log.action === 'STATUS_CHANGE'
                        ? 'bg-amber-50 text-amber-600'
                        : log.action === 'ACCOUNT_DELETE'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Activity className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="text-slate-900 font-bold">{log.userName}</strong>
                        <span className="text-slate-500">({log.userEmail})</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1">{log.details}</p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                        <span>IP: {log.ip || '127.0.0.1'}</span>
                        <span>•</span>
                        <span className="truncate max-w-xs">Client: {log.device || 'Browser'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
