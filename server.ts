import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { User, ActivityLog, Transaction, SyncQueueItem, UserRole, AccountStatus } from './src/types';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: Array<User & { passwordHash?: string }>;
  transactions: Transaction[];
  logs: ActivityLog[];
}

// Initial seed data
const initialDb: DatabaseSchema = {
  users: [
    {
      id: 'admin-1',
      name: 'System Admin',
      email: 'admin@finance.app',
      passwordHash: 'admin123',
      role: 'admin',
      status: 'active',
      createdAt: '2025-01-01T08:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      totalLogins: 12,
      currency: 'USD',
      monthlyBudgetLimit: 5000,
    },
    {
      id: 'user-demo',
      name: 'Mizanur Rahman',
      email: 'user@finance.app',
      passwordHash: 'user123',
      role: 'user',
      status: 'active',
      createdAt: '2025-02-01T09:30:00.000Z',
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      totalLogins: 28,
      currency: 'USD',
      monthlyBudgetLimit: 3200,
    },
    {
      id: 'user-pending-1',
      name: 'Alex Johnson',
      email: 'alex@example.com',
      passwordHash: 'alex123',
      role: 'user',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
      lastLoginAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
      lastActiveAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
      totalLogins: 1,
      currency: 'USD',
      monthlyBudgetLimit: 2500,
    }
  ],
  transactions: [
    {
      id: 'tx-1',
      userId: 'user-demo',
      type: 'income',
      amount: 4500,
      category: 'Salary',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      note: 'Monthly Senior Engineer Compensation',
      tags: ['salary', 'primary'],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'tx-2',
      userId: 'user-demo',
      type: 'expense',
      amount: 1200,
      category: 'Rent & Housing',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'bank_transfer',
      note: 'Apartment Monthly Lease Payment',
      tags: ['housing', 'fixed'],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'tx-3',
      userId: 'user-demo',
      type: 'expense',
      amount: 185.50,
      category: 'Food & Dining',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'credit_card',
      note: 'Weekly Grocery Store run',
      tags: ['groceries'],
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'tx-4',
      userId: 'user-demo',
      type: 'income',
      amount: 850,
      category: 'Freelance',
      date: new Date(Date.now() - 86400000 * 4).toISOString().slice(0, 10),
      paymentMethod: 'mobile_wallet',
      note: 'React UI Design Client Project Milestone',
      tags: ['consulting'],
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'tx-5',
      userId: 'user-demo',
      type: 'expense',
      amount: 65.00,
      category: 'Utilities',
      date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
      paymentMethod: 'debit_card',
      note: 'High-speed Fiber Internet Subscription',
      tags: ['bills'],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      syncStatus: 'synced',
    },
    {
      id: 'tx-6',
      userId: 'user-demo',
      type: 'expense',
      amount: 120.00,
      category: 'Transportation',
      date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
      paymentMethod: 'credit_card',
      note: 'Monthly Metro Pass & Fuel refill',
      tags: ['commute'],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      syncStatus: 'synced',
    }
  ],
  logs: [
    {
      id: 'log-1',
      userId: 'admin-1',
      userName: 'System Admin',
      userEmail: 'admin@finance.app',
      action: 'LOGIN',
      details: 'Administrator logged into management console',
      ip: '127.0.0.1',
      device: 'Desktop Chrome 124 / macOS',
      timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    },
    {
      id: 'log-2',
      userId: 'user-demo',
      userName: 'Mizanur Rahman',
      userEmail: 'user@finance.app',
      action: 'LOGIN',
      details: 'User authenticated via mobile PWA client',
      ip: '192.168.1.45',
      device: 'PWA Mobile / Android 14',
      timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    },
    {
      id: 'log-3',
      userId: 'user-demo',
      userName: 'Mizanur Rahman',
      userEmail: 'user@finance.app',
      action: 'OFFLINE_SYNC',
      details: 'Synced 3 offline transactions from local cache successfully',
      ip: '192.168.1.45',
      device: 'PWA Mobile / Android 14',
      timestamp: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    }
  ]
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, using initial data:', err);
    return initialDb;
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

function addActivityLog(
  userId: string,
  userName: string,
  userEmail: string,
  action: ActivityLog['action'],
  details: string,
  req?: express.Request
) {
  const db = readDb();
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    userName,
    userEmail,
    action,
    details,
    ip: (req?.headers['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1',
    device: (req?.headers['user-agent'] as string) || 'Web Client',
    timestamp: new Date().toISOString(),
  };
  db.logs.unshift(newLog);
  // Keep latest 200 logs
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
  writeDb(db);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Request logger middleware
  app.use((req, res, next) => {
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Personal Income Expense Management System Core API',
      time: new Date().toISOString(),
    });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // Register
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, currency, monthlyBudgetLimit } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const isFirstUser = db.users.length === 0;
    const role: UserRole = isFirstUser ? 'admin' : 'user';
    // By default, users need Admin approval ('pending'). Admin is auto-active.
    const status: AccountStatus = role === 'admin' ? 'active' : 'pending';

    const newUser: User & { passwordHash: string } = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: password,
      role,
      status,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      totalLogins: 1,
      currency: currency || 'USD',
      monthlyBudgetLimit: Number(monthlyBudgetLimit) || 3000,
    };

    db.users.push(newUser);
    writeDb(db);

    addActivityLog(
      newUser.id,
      newUser.name,
      newUser.email,
      'ACCOUNT_REGISTER',
      `Registered new ${role} account (Status: ${status})`,
      req
    );

    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({
      user: safeUser,
      message: status === 'pending'
        ? 'Account registered successfully. Please wait for an Admin to approve your account before logging in.'
        : 'Account created successfully.',
    });
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = readDb();
    const userIndex = db.users.findIndex(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && (u.passwordHash === password || !u.passwordHash)
    );

    if (userIndex === -1) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = db.users[userIndex];

    // Check account status
    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Your account is currently pending administrator approval. Please contact the administrator.',
        status: 'pending'
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Your account has been deactivated by the administrator.',
        status: 'disabled'
      });
    }

    // Update login timestamp & active stats
    user.lastLoginAt = new Date().toISOString();
    user.lastActiveAt = new Date().toISOString();
    user.totalLogins = (user.totalLogins || 0) + 1;
    db.users[userIndex] = user;
    writeDb(db);

    addActivityLog(
      user.id,
      user.name,
      user.email,
      'LOGIN',
      `User signed in successfully (Role: ${user.role})`,
      req
    );

    const { passwordHash: _, ...safeUser } = user;
    res.json({
      user: safeUser,
      token: `token-${user.id}-${Date.now()}`
    });
  });

  // Update profile
  app.patch('/api/auth/profile', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const { name, currency, monthlyBudgetLimit } = req.body;
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) db.users[userIndex].name = name.trim();
    if (currency) db.users[userIndex].currency = currency;
    if (monthlyBudgetLimit !== undefined) db.users[userIndex].monthlyBudgetLimit = Number(monthlyBudgetLimit);
    db.users[userIndex].lastActiveAt = new Date().toISOString();

    writeDb(db);
    const { passwordHash: _, ...safeUser } = db.users[userIndex];
    res.json({ user: safeUser });
  });

  // ==========================================
  // ADMIN ROUTES (Strictly Role Moderation & Logs)
  // ==========================================

  // Middleware helper to ensure admin
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  };

  // Get all users (Admin only)
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const db = readDb();
    const safeUsers = db.users.map(({ passwordHash: _, ...u }) => {
      const userTxCount = db.transactions.filter(t => t.userId === u.id && !t.isDeleted).length;
      return {
        ...u,
        transactionCount: userTxCount,
      };
    });
    res.json({ users: safeUsers });
  });

  // Change user status: Approve, Enable, Disable (Admin only)
  app.patch('/api/admin/users/:id/status', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status: AccountStatus };
    const adminUserId = req.headers['x-user-id'] as string;

    if (!['pending', 'active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const db = readDb();
    const adminUser = db.users.find(u => u.id === adminUserId);
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = db.users[userIndex];

    // Prevent disabling or modifying self
    if (targetUser.id === adminUserId && status !== 'active') {
      return res.status(400).json({ error: 'Admin cannot change their own account status' });
    }

    const oldStatus = targetUser.status;
    targetUser.status = status;
    db.users[userIndex] = targetUser;
    writeDb(db);

    addActivityLog(
      adminUserId,
      adminUser?.name || 'Admin',
      adminUser?.email || 'admin',
      'STATUS_CHANGE',
      `Admin changed status of ${targetUser.name} (${targetUser.email}) from ${oldStatus} to ${status}`,
      req
    );

    const { passwordHash: _, ...safeUser } = targetUser;
    res.json({ user: safeUser, message: `Account status updated to ${status}` });
  });

  // Delete user (Admin only)
  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const adminUserId = req.headers['x-user-id'] as string;

    if (id === adminUserId) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const db = readDb();
    const adminUser = db.users.find(u => u.id === adminUserId);
    const targetUser = db.users.find(u => u.id === id);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.users = db.users.filter(u => u.id !== id);
    // Also remove their transactions
    db.transactions = db.transactions.filter(t => t.userId !== id);
    writeDb(db);

    addActivityLog(
      adminUserId,
      adminUser?.name || 'Admin',
      adminUser?.email || 'admin',
      'ACCOUNT_DELETE',
      `Admin permanently deleted account of ${targetUser.name} (${targetUser.email})`,
      req
    );

    res.json({ message: 'User account and associated records deleted successfully' });
  });

  // Get Activity Logs (Admin only)
  app.get('/api/admin/logs', requireAdmin, (req, res) => {
    const db = readDb();
    const { userId, action, limit } = req.query;

    let filtered = db.logs;
    if (userId) {
      filtered = filtered.filter(l => l.userId === userId);
    }
    if (action) {
      filtered = filtered.filter(l => l.action === action);
    }

    const maxLimit = Number(limit) || 100;
    res.json({ logs: filtered.slice(0, maxLimit) });
  });

  // ==========================================
  // TRANSACTION & OFFLINE CLOUD SYNC ROUTES
  // ==========================================

  // Get all transactions for current user
  app.get('/api/transactions', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const db = readDb();
    const userTx = db.transactions.filter(t => t.userId === userId && !t.isDeleted);
    res.json({ transactions: userTx });
  });

  // Create transaction
  app.post('/api/transactions', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const { type, amount, category, date, paymentMethod, note, tags, id } = req.body;
    if (!type || amount === undefined || !category || !date) {
      return res.status(400).json({ error: 'Type, amount, category, and date are required' });
    }

    const db = readDb();
    const newTx: Transaction = {
      id: id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type,
      amount: Number(amount),
      category: category.trim(),
      date,
      paymentMethod: paymentMethod || 'cash',
      note: (note || '').trim(),
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    db.transactions.unshift(newTx);
    writeDb(db);

    const user = db.users.find(u => u.id === userId);
    addActivityLog(
      userId,
      user?.name || 'User',
      user?.email || 'user',
      'TRANSACTION_ADD',
      `Added ${type} of $${newTx.amount} in category '${newTx.category}'`,
      req
    );

    res.status(201).json({ transaction: newTx });
  });

  // Update transaction
  app.put('/api/transactions/:id', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const db = readDb();
    const txIndex = db.transactions.findIndex(t => t.id === id && t.userId === userId);

    if (txIndex === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const { type, amount, category, date, paymentMethod, note, tags } = req.body;
    const existing = db.transactions[txIndex];

    db.transactions[txIndex] = {
      ...existing,
      type: type || existing.type,
      amount: amount !== undefined ? Number(amount) : existing.amount,
      category: category ? category.trim() : existing.category,
      date: date || existing.date,
      paymentMethod: paymentMethod || existing.paymentMethod,
      note: note !== undefined ? note.trim() : existing.note,
      tags: Array.isArray(tags) ? tags : existing.tags,
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    writeDb(db);

    const user = db.users.find(u => u.id === userId);
    addActivityLog(
      userId,
      user?.name || 'User',
      user?.email || 'user',
      'TRANSACTION_UPDATE',
      `Updated ${db.transactions[txIndex].type} transaction of $${db.transactions[txIndex].amount}`,
      req
    );

    res.json({ transaction: db.transactions[txIndex] });
  });

  // Delete transaction
  app.delete('/api/transactions/:id', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const db = readDb();
    const tx = db.transactions.find(t => t.id === id && t.userId === userId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.transactions = db.transactions.filter(t => !(t.id === id && t.userId === userId));
    writeDb(db);

    const user = db.users.find(u => u.id === userId);
    addActivityLog(
      userId,
      user?.name || 'User',
      user?.email || 'user',
      'TRANSACTION_DELETE',
      `Deleted transaction ID ${id} (${tx.type} of $${tx.amount})`,
      req
    );

    res.json({ message: 'Transaction deleted successfully' });
  });

  // BATCH SYNC ENDPOINT (Core Offline -> Cloud sync requirement)
  app.post('/api/sync/batch', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    const { queue, clientTransactions } = req.body as {
      queue?: SyncQueueItem[];
      clientTransactions?: Transaction[];
    };

    const db = readDb();
    let appliedChanges = 0;

    // Apply queue actions
    if (Array.isArray(queue) && queue.length > 0) {
      for (const item of queue) {
        const tx = item.transaction;
        if (!tx) continue;

        if (item.action === 'create') {
          const exists = db.transactions.some(t => t.id === tx.id);
          if (!exists) {
            db.transactions.unshift({
              ...tx,
              userId,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            });
            appliedChanges++;
          }
        } else if (item.action === 'update') {
          const idx = db.transactions.findIndex(t => t.id === tx.id && t.userId === userId);
          if (idx !== -1) {
            db.transactions[idx] = {
              ...tx,
              userId,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            };
            appliedChanges++;
          } else {
            // If doesn't exist, create it
            db.transactions.unshift({
              ...tx,
              userId,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            });
            appliedChanges++;
          }
        } else if (item.action === 'delete') {
          db.transactions = db.transactions.filter(t => !(t.id === tx.id && t.userId === userId));
          appliedChanges++;
        }
      }
    }

    // Double check any clientTransactions that may be missing on server
    if (Array.isArray(clientTransactions)) {
      for (const clientTx of clientTransactions) {
        if (!clientTx.id) continue;
        const exists = db.transactions.some(t => t.id === clientTx.id && t.userId === userId);
        if (!exists && !clientTx.isDeleted) {
          db.transactions.unshift({
            ...clientTx,
            userId,
            syncStatus: 'synced',
            updatedAt: clientTx.updatedAt || new Date().toISOString()
          });
          appliedChanges++;
        }
      }
    }

    writeDb(db);

    const user = db.users.find(u => u.id === userId);
    if (appliedChanges > 0) {
      addActivityLog(
        userId,
        user?.name || 'User',
        user?.email || 'user',
        'OFFLINE_SYNC',
        `Synchronized ${appliedChanges} pending transaction change(s) from offline storage`,
        req
      );
    }

    // Return unified transactions for this user
    const serverTransactions = db.transactions.filter(t => t.userId === userId && !t.isDeleted);

    res.json({
      status: 'success',
      appliedChanges,
      serverTransactions,
      syncedAt: new Date().toISOString(),
      message: `Sync completed: ${appliedChanges} modifications applied.`
    });
  });

  // ==========================================
  // VITE DEVELOPMENT / PRODUCTION SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Income & Expense PWA Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
