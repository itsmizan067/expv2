import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, CloudUpload } from 'lucide-react';
import { SyncResult } from '../types';

interface OfflineSyncBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncResult: SyncResult | null;
  lastSyncTime: string | null;
  onSyncNow: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncResult,
  lastSyncTime,
  onSyncNow,
}) => {
  const formatTime = (iso: string | null) => {
    if (!iso) return 'Never';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          
          {/* Status message */}
          <div className="flex items-center space-x-2 text-slate-300">
            {!isOnline ? (
              <div className="flex items-center space-x-1.5 text-amber-400 font-medium">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Offline Mode:</strong> You are currently disconnected. All records are saved securely on your phone/device.
                </span>
              </div>
            ) : isSyncing ? (
              <div className="flex items-center space-x-1.5 text-sky-400 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Syncing offline records to the cloud database...</span>
              </div>
            ) : pendingCount > 0 ? (
              <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
                <CloudUpload className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>{pendingCount}</strong> pending local modification{pendingCount > 1 ? 's' : ''} waiting for cloud sync.
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Cloud Synced • Last verified at <span className="text-slate-300">{formatTime(lastSyncTime)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Sync actions & timestamp */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
            {lastSyncResult?.status === 'error' && isOnline && (
              <span className="text-rose-400 flex items-center space-x-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Sync retry scheduled</span>
              </span>
            )}

            {isOnline && (
              <button
                id="offline-sync-now-btn"
                disabled={isSyncing}
                onClick={onSyncNow}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
