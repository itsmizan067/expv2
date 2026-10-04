import { Transaction, SyncQueueItem } from '../types';

const DB_NAME = 'PocketBalance_DB';
const DB_VERSION = 2;

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isAvailable) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('userId', 'userId', { unique: false });
          txStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. Offline Mutations queue store
        if (!db.objectStoreNames.contains('mutations')) {
          const mutStore = db.createObjectStore('mutations', { keyPath: 'clientMutationId' });
          mutStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 3. Metadata store (sync cursors, last sync time, versions)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('Failed to open IndexedDB, falling back to localStorage');
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async getAllTransactions(userId: string): Promise<Transaction[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('transactions', 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('userId');
        const request = index.getAll(userId);

        request.onsuccess = () => {
          // Filter out deleted/tombstone records from active display list
          const activeTxs = (request.result || []).filter((t: Transaction) => !t.isDeleted);
          // Sort descending by date, then createdAt
          activeTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          resolve(activeTxs);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      // LocalStorage fallback
      try {
        const raw = localStorage.getItem(`income_pwa_transactions_${userId}`);
        if (!raw) return [];
        return (JSON.parse(raw) || []).filter((t: Transaction) => !t.isDeleted);
      } catch {
        return [];
      }
    }
  }

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('transactions', 'readwrite');
        const store = tx.objectStore('transactions');

        for (const item of transactions) {
          store.put(item);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // LocalStorage fallback
      if (transactions.length > 0) {
        const userId = transactions[0].userId;
        try {
          localStorage.setItem(`income_pwa_transactions_${userId}`, JSON.stringify(transactions));
        } catch {}
      }
    }
  }

  async putTransaction(transaction: Transaction): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('transactions', 'readwrite');
        const store = tx.objectStore('transactions');
        store.put(transaction);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // LocalStorage fallback
      try {
        const key = `income_pwa_transactions_${transaction.userId}`;
        const raw = localStorage.getItem(key);
        const list: Transaction[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(t => t.id === transaction.id);
        if (idx !== -1) {
          list[idx] = transaction;
        } else {
          list.unshift(transaction);
        }
        localStorage.setItem(key, JSON.stringify(list));
      } catch {}
    }
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('transactions', 'readwrite');
        const store = tx.objectStore('transactions');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      try {
        const key = `income_pwa_transactions_${userId}`;
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const list: Transaction[] = JSON.parse(raw);
        localStorage.setItem(key, JSON.stringify(list.filter(t => t.id !== id)));
      } catch {}
    }
  }

  // ─── Mutations Queue ──────────────────────────────────────────────────────

  async getPendingMutations(): Promise<SyncQueueItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('mutations', 'readonly');
        const store = tx.objectStore('mutations');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      try {
        const raw = localStorage.getItem('income_pwa_pending_mutations');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  }

  async enqueueMutation(mutation: SyncQueueItem): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('mutations', 'readwrite');
        const store = tx.objectStore('mutations');
        store.put(mutation);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      try {
        const raw = localStorage.getItem('income_pwa_pending_mutations');
        const list: SyncQueueItem[] = raw ? JSON.parse(raw) : [];
        list.push(mutation);
        localStorage.setItem('income_pwa_pending_mutations', JSON.stringify(list));
      } catch {}
    }
  }

  async removeMutation(clientMutationId: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('mutations', 'readwrite');
        const store = tx.objectStore('mutations');
        store.delete(clientMutationId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      try {
        const raw = localStorage.getItem('income_pwa_pending_mutations');
        if (!raw) return;
        const list: SyncQueueItem[] = JSON.parse(raw);
        localStorage.setItem(
          'income_pwa_pending_mutations',
          JSON.stringify(list.filter(m => m.clientMutationId !== clientMutationId))
        );
      } catch {}
    }
  }

  async clearMutations(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('mutations', 'readwrite');
        const store = tx.objectStore('mutations');
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      try {
        localStorage.removeItem('income_pwa_pending_mutations');
      } catch {}
    }
  }

  // ─── Metadata (Sync Cursor, Timestamps) ───────────────────────────────────

  async getMetadata<T = any>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('metadata', 'readonly');
        const store = tx.objectStore('metadata');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      try {
        const raw = localStorage.getItem(`income_pwa_meta_${key}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  }

  async setMetadata(key: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        store.put({ key, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      try {
        localStorage.setItem(`income_pwa_meta_${key}`, JSON.stringify(value));
      } catch {}
    }
  }
}

export const indexedDbService = new IndexedDbService();
