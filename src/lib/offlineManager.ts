import { Transaction, SyncQueueItem, SyncResult } from '../types';

const STORAGE_PREFIX = 'income_pwa_';

export class OfflineStorageManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private getTxKey(): string {
    return `${STORAGE_PREFIX}transactions_${this.userId}`;
  }

  private getQueueKey(): string {
    return `${STORAGE_PREFIX}sync_queue_${this.userId}`;
  }

  private getLastSyncKey(): string {
    return `${STORAGE_PREFIX}last_sync_${this.userId}`;
  }

  // Get locally cached transactions
  getLocalTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(this.getTxKey());
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read local transactions', e);
      return [];
    }
  }

  // Save local transactions
  setLocalTransactions(transactions: Transaction[]): void {
    try {
      localStorage.setItem(this.getTxKey(), JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to write local transactions', e);
    }
  }

  // Get pending offline queue
  getPendingQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(this.getQueueKey());
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read sync queue', e);
      return [];
    }
  }

  private setPendingQueue(queue: SyncQueueItem[]): void {
    try {
      localStorage.setItem(this.getQueueKey(), JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to write sync queue', e);
    }
  }

  // Enqueue a create/update/delete action while offline
  enqueueAction(action: 'create' | 'update' | 'delete', transaction: Transaction): void {
    const queue = this.getPendingQueue();
    // Check if item is already in queue
    const existingIndex = queue.findIndex(q => q.transaction.id === transaction.id);
    const queueItem: SyncQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      transaction,
      queuedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // If we are deleting an item that was only created in queue, just remove it
      if (action === 'delete' && queue[existingIndex].action === 'create') {
        queue.splice(existingIndex, 1);
      } else {
        queue[existingIndex] = queueItem;
      }
    } else {
      queue.push(queueItem);
    }

    this.setPendingQueue(queue);

    // Also update local cached transactions immediately for instantaneous UI feedback
    const localTxs = this.getLocalTransactions();
    if (action === 'create') {
      localTxs.unshift({ ...transaction, syncStatus: 'pending' });
    } else if (action === 'update') {
      const idx = localTxs.findIndex(t => t.id === transaction.id);
      if (idx !== -1) {
        localTxs[idx] = { ...transaction, syncStatus: 'pending' };
      } else {
        localTxs.unshift({ ...transaction, syncStatus: 'pending' });
      }
    } else if (action === 'delete') {
      const idx = localTxs.findIndex(t => t.id === transaction.id);
      if (idx !== -1) {
        localTxs.splice(idx, 1);
      }
    }
    this.setLocalTransactions(localTxs);
  }

  // Clear queue
  clearQueue(): void {
    this.setPendingQueue([]);
  }

  // Get last sync time
  getLastSyncTime(): string | null {
    return localStorage.getItem(this.getLastSyncKey());
  }

  setLastSyncTime(isoDate: string): void {
    localStorage.setItem(this.getLastSyncKey(), isoDate);
  }

  // Perform synchronization with server
  async syncWithServer(): Promise<SyncResult> {
    const queue = this.getPendingQueue();
    const localTxs = this.getLocalTransactions();

    try {
      const response = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId,
        },
        body: JSON.stringify({
          queue,
          clientTransactions: localTxs,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with ${response.status}`);
      }

      const result = await response.json();
      const serverTxs: Transaction[] = result.serverTransactions || [];

      // Update local storage with fresh synced server list
      const markedTxs: Transaction[] = serverTxs.map(tx => ({
        ...tx,
        syncStatus: 'synced',
      }));

      this.setLocalTransactions(markedTxs);
      this.clearQueue();
      const now = new Date().toISOString();
      this.setLastSyncTime(now);

      return {
        syncedCount: queue.length,
        serverTotal: markedTxs.length,
        timestamp: now,
        status: 'success',
        message: result.message || 'Synced successfully',
      };
    } catch (err: any) {
      console.warn('Sync failed (offline or server error):', err);
      return {
        syncedCount: 0,
        serverTotal: localTxs.length,
        timestamp: new Date().toISOString(),
        status: 'error',
        message: err.message || 'Failed to connect to cloud server',
      };
    }
  }
}
