import {
  Transaction,
  SyncQueueItem,
  SyncResult,
  IncrementalSyncResponse,
  ProcessedMutationResult,
} from '../types';
import { indexedDbService } from './indexedDb';
import { compareTransactionsDescending } from './dateUtils';

const BACKOFF_SCHEDULE_MS = [5000, 15000, 30000, 60000]; // 5s → 15s → 30s → 60s
const MAX_BACKOFF_MS = 60000;

export class OfflineStorageManager {
  private userId: string;
  private retryAttempt = 0;
  private backoffTimer: NodeJS.Timeout | null = null;
  private isSyncInProgress = false;
  private onSubscriptionExpiredCallback?: () => void;

  constructor(userId: string) {
    this.userId = userId;
  }

  public setOnSubscriptionExpired(cb: () => void) {
    this.onSubscriptionExpiredCallback = cb;
  }

  private getCursorKey(): string {
    return `sync_cursor_${this.userId}`;
  }

  private getLastSyncKey(): string {
    return `last_sync_time_${this.userId}`;
  }

  // Synchronous read from cache / localStorage for instant initial render
  getLocalTransactions(): Transaction[] {
    try {
      const raw = localStorage.getItem(`income_pwa_transactions_${this.userId}`);
      if (!raw) return [];
      return (JSON.parse(raw) || [])
        .filter((t: Transaction) => !t.isDeleted)
        .sort(compareTransactionsDescending);
    } catch {
      return [];
    }
  }

  // Asynchronous read from IndexedDB (authoritative client store)
  async getIndexedDbTransactions(): Promise<Transaction[]> {
    const txs = await indexedDbService.getAllTransactions(this.userId);
    // Keep localStorage mirror updated for synchronous fallbacks
    try {
      localStorage.setItem(`income_pwa_transactions_${this.userId}`, JSON.stringify(txs));
    } catch {}
    return txs;
  }

  // Synchronous read of pending queue
  getPendingQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem('income_pwa_pending_mutations');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async getLastSyncCursor(): Promise<string | null> {
    return await indexedDbService.getMetadata<string>(this.getCursorKey());
  }

  async setLastSyncCursor(cursor: string): Promise<void> {
    await indexedDbService.setMetadata(this.getCursorKey(), cursor);
    try {
      localStorage.setItem(this.getCursorKey(), cursor);
    } catch {}
  }

  getLastSyncTime(): string | null {
    return localStorage.getItem(this.getLastSyncKey());
  }

  setLastSyncTime(isoDate: string): void {
    localStorage.setItem(this.getLastSyncKey(), isoDate);
    indexedDbService.setMetadata(this.getLastSyncKey(), isoDate).catch(() => {});
  }

  /**
   * Enqueue a mutation while offline or online.
   * Generates a unique clientMutationId for deduplication & idempotency.
   * Saves immediately to IndexedDB for instant UI responsiveness.
   */
  async enqueueAction(action: 'create' | 'update' | 'delete', transaction: Transaction): Promise<SyncQueueItem> {
    const clientMutationId = `mut-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const preparedTx: Transaction = {
      ...transaction,
      userId: this.userId,
      updatedAt: now,
      version: transaction.version || 1,
      clientMutationId,
      syncStatus: 'pending',
      isDeleted: action === 'delete' ? true : false,
      deletedAt: action === 'delete' ? now : undefined,
    };

    const queueItem: SyncQueueItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientMutationId,
      action,
      transaction: preparedTx,
      baseVersion: transaction.version || 1,
      timestamp: now,
      queuedAt: now,
    };

    // 1. Save mutation to persistent IndexedDB queue
    await indexedDbService.enqueueMutation(queueItem);

    // 2. Save transaction immediately to IndexedDB
    if (action === 'delete') {
      await indexedDbService.putTransaction(preparedTx);
    } else {
      await indexedDbService.putTransaction(preparedTx);
    }

    // 3. Keep localStorage synchronous mirror updated for instant UI reactivity
    const currentList = this.getLocalTransactions();
    if (action === 'create') {
      currentList.unshift(preparedTx);
    } else if (action === 'update') {
      const idx = currentList.findIndex(t => t.id === preparedTx.id);
      if (idx !== -1) currentList[idx] = preparedTx;
      else currentList.unshift(preparedTx);
    } else if (action === 'delete') {
      const filtered = currentList.filter(t => t.id !== preparedTx.id);
      try {
        localStorage.setItem(`income_pwa_transactions_${this.userId}`, JSON.stringify(filtered));
      } catch {}
      return queueItem;
    }

    currentList.sort(compareTransactionsDescending);
    try {
      localStorage.setItem(`income_pwa_transactions_${this.userId}`, JSON.stringify(currentList));
    } catch {}

    // Reset backoff so next sync attempt fires promptly
    this.resetBackoff();

    return queueItem;
  }

  /**
   * Revert / restore a previously soft-deleted transaction
   */
  async restoreAction(transaction: Transaction): Promise<SyncQueueItem> {
    const restoredTx: Transaction = {
      ...transaction,
      isDeleted: false,
      deletedAt: undefined,
    };
    return await this.enqueueAction('update', restoredTx);
  }

  resetBackoff(): void {
    this.retryAttempt = 0;
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
  }

  /**
   * Schedule the next sync attempt with exponential backoff:
   * 5s → 15s → 30s → 60s (max 60s).
   */
  private scheduleRetry(): void {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);

    const delay =
      BACKOFF_SCHEDULE_MS[Math.min(this.retryAttempt, BACKOFF_SCHEDULE_MS.length - 1)] || MAX_BACKOFF_MS;

    console.log(`⏱️ [OfflineSync] Scheduling sync retry in ${delay / 1000}s (Attempt ${this.retryAttempt + 1})`);
    this.retryAttempt++;

    this.backoffTimer = setTimeout(() => {
      this.syncWithServer().catch(err => console.warn('Retry sync error:', err));
    }, delay);
  }

  /**
   * Incremental Change-Based Synchronization with Server:
   * 1. Sends pending mutations with clientMutationId (idempotent, safe on retries).
   * 2. Sends lastSyncCursor to only retrieve changes since last successful sync.
   * 3. Handles conflict resolution & tombstones.
   * 4. Updates local IndexedDB with canonical server state.
   */
  async syncWithServer(): Promise<SyncResult> {
    if (this.isSyncInProgress) {
      return {
        syncedCount: 0,
        serverTotal: this.getLocalTransactions().length,
        timestamp: new Date().toISOString(),
        status: 'partial',
        message: 'Sync already in progress',
      };
    }

    this.isSyncInProgress = true;

    try {
      let mutations = await indexedDbService.getPendingMutations();

      // Failsafe: If mutation queue is empty but local transactions have 'pending' status,
      // re-enqueue them automatically so they are never stranded on the client!
      if (mutations.length === 0) {
        const localTxs = await indexedDbService.getAllTransactions(this.userId);
        const pendingTxs = localTxs.filter(t => t.syncStatus === 'pending');
        for (const pTx of pendingTxs) {
          const item = await this.enqueueAction('create', pTx);
          mutations.push(item);
        }
      }

      const lastCursor = (await this.getLastSyncCursor()) || localStorage.getItem(this.getCursorKey()) || undefined;

      const response = await fetch('/api/sync/incremental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId,
        },
        body: JSON.stringify({
          lastSyncCursor: lastCursor,
          mutations,
        }),
      });

      // ─── Backend Subscription Enforcement Handling ────────────────────────
      if (response.status === 402 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === 'SUBSCRIPTION_EXPIRED') {
          console.warn('⚠️ [OfflineSync] Sync halted: Active subscription or trial required.');
          this.onSubscriptionExpiredCallback?.();
          return {
            syncedCount: 0,
            serverTotal: this.getLocalTransactions().length,
            timestamp: new Date().toISOString(),
            status: 'subscription_required',
            message: 'Active subscription or trial required to synchronize with cloud.',
          };
        }
      }

      if (!response.ok) {
        throw new Error(`Sync server responded with HTTP ${response.status}`);
      }

      const data: IncrementalSyncResponse = await response.json();

      // 1. Process mutation results: remove committed/already_processed from queue
      let conflictsResolved = 0;
      for (const res of data.processedMutations || []) {
        await indexedDbService.removeMutation(res.clientMutationId);

        if (res.status === 'conflict_resolved' || res.status === 'conflict_rejected') {
          conflictsResolved++;
          if (res.canonicalTransaction) {
            await indexedDbService.putTransaction({
              ...res.canonicalTransaction,
              syncStatus: 'synced',
            });
          }
        } else if (res.canonicalTransaction) {
          await indexedDbService.putTransaction({
            ...res.canonicalTransaction,
            syncStatus: 'synced',
          });
        }
      }

      // 2. Apply changed transactions received from server (including tombstones)
      for (const changed of data.changedTransactions || []) {
        if (changed.isDeleted) {
          // Tombstone: remove from local store so it cannot reappear
          await indexedDbService.deleteTransaction(changed.id, this.userId);
        } else {
          await indexedDbService.putTransaction({
            ...changed,
            syncStatus: 'synced',
          });
        }
      }

      // 3. Save new authoritative sync cursor and timestamp
      if (data.serverCursor) {
        await this.setLastSyncCursor(data.serverCursor);
      }
      const now = new Date().toISOString();
      this.setLastSyncTime(now);

      // 4. Refresh local transactions list in IndexedDB
      const allActive = await indexedDbService.getAllTransactions(this.userId);
      try {
        localStorage.setItem(`income_pwa_transactions_${this.userId}`, JSON.stringify(allActive));
      } catch {}

      // Reset backoff on success
      this.resetBackoff();

      return {
        syncedCount: (data.processedMutations || []).length,
        serverTotal: data.serverTotalCount || allActive.length,
        timestamp: now,
        status: 'success',
        message: `Synced ${data.processedMutations?.length || 0} change(s) successfully.`,
        conflictsResolved,
      };
    } catch (err: any) {
      console.warn('Sync failed (offline or server error):', err?.message || err);
      // Automatically schedule retry with exponential backoff (5s → 15s → 30s → 60s)
      this.scheduleRetry();

      return {
        syncedCount: 0,
        serverTotal: this.getLocalTransactions().length,
        timestamp: new Date().toISOString(),
        status: 'error',
        message: err?.message || 'Failed to sync with server. Offline changes preserved.',
      };
    } finally {
      this.isSyncInProgress = false;
    }
  }
}
