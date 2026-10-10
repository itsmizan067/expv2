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
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 text-xs py-1.5 px-4 sm:px-8 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Status text */}
        <div className="flex items-center space-x-2 min-w-0">
          {!isOnline ? (
            <div className="flex items-center space-x-1.5 text-rose-400 font-medium truncate">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <strong className="font-semibold">Offline Mode:</strong> All records saved on device
              </span>
            </div>
          ) : isSyncing ? (
            <div className="flex items-center space-x-1.5 text-sky-400 font-medium truncate">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="truncate">Syncing to cloud database...</span>
            </div>
          ) : lastSyncResult?.status === 'subscription_required' ? (
            <div className="flex items-center space-x-1.5 text-amber-400 font-medium truncate">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">
                <strong>Cloud Sync Paused:</strong> Trial ended. Records saved safely on device. Please upgrade.
              </span>
            </div>
          ) : pendingCount > 0 ? (
            <div className="flex items-center space-x-1.5 text-amber-300 font-medium truncate">
              <CloudUpload className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">
                <strong>{pendingCount}</strong> pending update{pendingCount > 1 ? 's' : ''} waiting to sync
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-slate-300 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs truncate">
                <span className="text-slate-400">Last Cloud Synced at </span>
                <span className="text-emerald-400 font-mono font-semibold">{formatTime(lastSyncTime)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Sync Action Button & Error Notice */}
        <div className="flex items-center space-x-2 shrink-0">
          {lastSyncResult?.status === 'error' && isOnline && (
            <span className="text-rose-400 hidden sm:inline-flex items-center space-x-1 text-[10px]">
              <AlertCircle className="w-3 h-3" />
              <span>Retry scheduled</span>
            </span>
          )}

          {isOnline && (
            <button
              id="offline-sync-now-btn"
              disabled={isSyncing}
              onClick={onSyncNow}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-slate-900 border border-slate-700/70 text-slate-200 hover:text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 text-emerald-400 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
