import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { User, ActivityLog, Transaction, SyncQueueItem, UserRole, AccountStatus } from './src/types';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// In ESM (tsx dev), __dirname is not available; derive it from import.meta.url.
// In production (esbuild → dist/server.cjs, CommonJS), esbuild injects __dirname
// automatically, but this branch is never reached there.
const __dirname_compat = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');


// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ==========================================
// PASSWORD HASHING (PBKDF2 via Node crypto)
// ==========================================

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, 'sha512')
    .toString('hex');
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

// ==========================================
// DATABASE SCHEMA & SEEDING
// ==========================================

interface DatabaseSchema {
  users: Array<User & { passwordHash?: string }>;
  transactions: Transaction[];
  logs: ActivityLog[];
}

// Seeded admin accounts — passwords are hashed at runtime so the seed is
// never stored with plaintext credentials.
const SEED_SUPER_ADMIN_EMAIL = 'mizan.boss@gmail.com';
const SEED_ADMIN_EMAIL = 'admin@gmail.com';

function buildInitialDb(): DatabaseSchema {
  return {
    users: [
      {
        id: 'super-admin-1',
        name: 'Mizan (Super Admin)',
        email: SEED_SUPER_ADMIN_EMAIL,
        passwordHash: hashPassword('Mizan123'),
        role: 'super_admin' as UserRole,
        status: 'active',
        createdAt: '2025-01-01T00:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalLogins: 0,
        currency: 'USD',
        monthlyBudgetLimit: 10000,
      },
      {
        id: 'admin-1',
        name: 'System Admin',
        email: SEED_ADMIN_EMAIL,
        passwordHash: hashPassword('admin123'),
        role: 'admin' as UserRole,
        status: 'active',
        createdAt: '2025-01-01T08:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalLogins: 0,
        currency: 'USD',
        monthlyBudgetLimit: 5000,
      },
    ],
    transactions: [],
    logs: [
      {
        id: 'log-seed-1',
        userId: 'super-admin-1',
        userName: 'Mizan (Super Admin)',
        userEmail: SEED_SUPER_ADMIN_EMAIL,
        action: 'LOGIN',
        details: 'Super Admin account seeded and initialized',
        ip: '127.0.0.1',
        device: 'System Seed',
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// ==========================================
// DB READ / WRITE
// ==========================================

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const fresh = buildInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
      return fresh;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed: DatabaseSchema = JSON.parse(data);

    // Migration: ensure seeded admin accounts always exist.
    // If the DB was created before the new seed, insert them now.
    let dirty = false;
    const hasSuperAdmin = parsed.users.some(u => u.email === SEED_SUPER_ADMIN_EMAIL);
    const hasAdmin = parsed.users.some(u => u.email === SEED_ADMIN_EMAIL);

    if (!hasSuperAdmin) {
      parsed.users.unshift({
        id: 'super-admin-1',
        name: 'Mizan (Super Admin)',
        email: SEED_SUPER_ADMIN_EMAIL,
        passwordHash: hashPassword('Mizan123'),
        role: 'super_admin' as UserRole,
        status: 'active',
        createdAt: '2025-01-01T00:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalLogins: 0,
        currency: 'USD',
        monthlyBudgetLimit: 10000,
      });
      dirty = true;
    }

    if (!hasAdmin) {
      parsed.users.push({
        id: 'admin-1',
        name: 'System Admin',
        email: SEED_ADMIN_EMAIL,
        passwordHash: hashPassword('admin123'),
        role: 'admin' as UserRole,
        status: 'active',
        createdAt: '2025-01-01T08:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalLogins: 0,
        currency: 'USD',
        monthlyBudgetLimit: 5000,
      });
      dirty = true;
    }

    // Migrate any user that still has a plaintext password (legacy seed).
    // A hashed password always contains a colon separator.
    parsed.users = parsed.users.map(u => {
      if (u.passwordHash && !u.passwordHash.includes(':')) {
        return { ...u, passwordHash: hashPassword(u.passwordHash) };
      }
      return u;
    });

    if (dirty) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }

    return parsed;
  } catch (err) {
    console.error('Error reading DB, rebuilding from seed:', err);
    const fresh = buildInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
    return fresh;
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// ==========================================
// ACTIVITY LOG HELPER
// ==========================================

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
  // Keep latest 500 logs
  if (db.logs.length > 500) {
    db.logs = db.logs.slice(0, 500);
  }
  writeDb(db);
}

// ==========================================
// EXPRESS SERVER
// ==========================================

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Personal Income Expense Management System Core API',
      time: new Date().toISOString(),
    });
  });

  // ==========================================
  // RBAC MIDDLEWARE
  // ==========================================

  /** Requires the caller to be admin OR super_admin */
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  };

  /** Requires the caller to be super_admin only */
  const requireSuperAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
    }
    next();
  };

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // Register
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, currency, monthlyBudgetLimit } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // All self-registered users start as 'user' with 'pending' status.
    // Only seeded admin accounts can have elevated roles.
    const role: UserRole = 'user';
    const status: AccountStatus = 'pending';

    const newUser: User & { passwordHash: string } = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      role,
      status,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      totalLogins: 0,
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
      `Registered new user account (Status: ${status} — awaiting admin approval)`,
      req
    );

    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({
      user: safeUser,
      message: 'Account registered successfully. Please wait for an Admin to approve your account before logging in.',
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
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (userIndex === -1) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = db.users[userIndex];

    // Verify password
    const passwordOk = user.passwordHash
      ? verifyPassword(password, user.passwordHash)
      : false;

    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        error: 'Your account is pending administrator approval. Please contact the administrator.',
        status: 'pending',
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Your account has been deactivated by the administrator.',
        status: 'disabled',
      });
    }

    // Update login stats
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
      token: `token-${user.id}-${Date.now()}`,
    });
  });

  // Update profile
  app.patch('/api/auth/profile', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, currency, monthlyBudgetLimit } = req.body;
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) db.users[userIndex].name = name.trim();
    if (currency) db.users[userIndex].currency = currency;
    if (monthlyBudgetLimit !== undefined) {
      db.users[userIndex].monthlyBudgetLimit = Number(monthlyBudgetLimit);
    }
    db.users[userIndex].lastActiveAt = new Date().toISOString();

    writeDb(db);
    const { passwordHash: _, ...safeUser } = db.users[userIndex];
    res.json({ user: safeUser });
  });

  // ==========================================
  // ADMIN ROUTES (admin + super_admin)
  // ==========================================

  // Get all users
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const db = readDb();
    const safeUsers = db.users.map(({ passwordHash: _, ...u }) => {
      const userTxCount = db.transactions.filter(t => t.userId === u.id && !t.isDeleted).length;
      return { ...u, transactionCount: userTxCount };
    });
    res.json({ users: safeUsers });
  });

  // Change user status: Approve, Enable, Disable
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

    // Protect super_admin accounts from being modified by regular admins
    if (targetUser.role === 'super_admin' && adminUser?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify a Super Admin account.' });
    }

    // Prevent self-demotion
    if (targetUser.id === adminUserId && status !== 'active') {
      return res.status(400).json({ error: 'Cannot change your own account status.' });
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
      `Changed status of ${targetUser.name} (${targetUser.email}) from ${oldStatus} → ${status}`,
      req
    );

    const { passwordHash: _, ...safeUser } = targetUser;
    res.json({ user: safeUser, message: `Account status updated to ${status}` });
  });

  // Delete user (admin can delete users; super_admin can delete admins too)
  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const adminUserId = req.headers['x-user-id'] as string;

    if (id === adminUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    const db = readDb();
    const adminUser = db.users.find(u => u.id === adminUserId);
    const targetUser = db.users.find(u => u.id === id);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only super_admin can delete admin or super_admin accounts
    if (
      (targetUser.role === 'admin' || targetUser.role === 'super_admin') &&
      adminUser?.role !== 'super_admin'
    ) {
      return res.status(403).json({ error: 'Only Super Admins can delete administrator accounts.' });
    }

    db.users = db.users.filter(u => u.id !== id);
    db.transactions = db.transactions.filter(t => t.userId !== id);
    writeDb(db);

    addActivityLog(
      adminUserId,
      adminUser?.name || 'Admin',
      adminUser?.email || 'admin',
      'ACCOUNT_DELETE',
      `Permanently deleted account of ${targetUser.name} (${targetUser.email})`,
      req
    );

    res.json({ message: 'User account and associated records deleted successfully.' });
  });

  // Get Activity Logs
  app.get('/api/admin/logs', requireAdmin, (req, res) => {
    const db = readDb();
    const { userId, action, limit } = req.query;

    let filtered = db.logs;
    if (userId) filtered = filtered.filter(l => l.userId === userId);
    if (action) filtered = filtered.filter(l => l.action === action);

    const maxLimit = Number(limit) || 100;
    res.json({ logs: filtered.slice(0, maxLimit) });
  });

  // Super-admin-only: promote/demote a user's role
  app.patch('/api/admin/users/:id/role', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { role } = req.body as { role: UserRole };
    const superAdminId = req.headers['x-user-id'] as string;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Can only promote to admin or demote to user.' });
    }

    if (id === superAdminId) {
      return res.status(400).json({ error: 'Cannot change your own role.' });
    }

    const db = readDb();
    const superAdminUser = db.users.find(u => u.id === superAdminId);
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const target = db.users[userIndex];
    if (target.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot change another Super Admin\'s role.' });
    }

    const oldRole = target.role;
    target.role = role;
    db.users[userIndex] = target;
    writeDb(db);

    addActivityLog(
      superAdminId,
      superAdminUser?.name || 'Super Admin',
      superAdminUser?.email || 'superadmin',
      'STATUS_CHANGE',
      `Role of ${target.name} (${target.email}) changed from ${oldRole} → ${role}`,
      req
    );

    const { passwordHash: _, ...safeUser } = target;
    res.json({ user: safeUser, message: `Role updated to ${role}` });
  });

  // ==========================================
  // TRANSACTION & OFFLINE CLOUD SYNC ROUTES
  // ==========================================

  // Get all transactions for current user
  app.get('/api/transactions', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = readDb();
    const userTx = db.transactions.filter(t => t.userId === userId && !t.isDeleted);
    res.json({ transactions: userTx });
  });

  // Create transaction
  app.post('/api/transactions', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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
      return res.status(401).json({ error: 'Unauthorized' });
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
      return res.status(401).json({ error: 'Unauthorized' });
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

  // BATCH SYNC ENDPOINT (Offline → Cloud sync)
  app.post('/api/sync/batch', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { queue, clientTransactions } = req.body as {
      queue?: SyncQueueItem[];
      clientTransactions?: Transaction[];
    };

    const db = readDb();
    let appliedChanges = 0;

    if (Array.isArray(queue) && queue.length > 0) {
      for (const item of queue) {
        const tx = item.transaction;
        if (!tx) continue;

        if (item.action === 'create') {
          const exists = db.transactions.some(t => t.id === tx.id);
          if (!exists) {
            db.transactions.unshift({ ...tx, userId, syncStatus: 'synced', updatedAt: new Date().toISOString() });
            appliedChanges++;
          }
        } else if (item.action === 'update') {
          const idx = db.transactions.findIndex(t => t.id === tx.id && t.userId === userId);
          if (idx !== -1) {
            db.transactions[idx] = { ...tx, userId, syncStatus: 'synced', updatedAt: new Date().toISOString() };
          } else {
            db.transactions.unshift({ ...tx, userId, syncStatus: 'synced', updatedAt: new Date().toISOString() });
          }
          appliedChanges++;
        } else if (item.action === 'delete') {
          db.transactions = db.transactions.filter(t => !(t.id === tx.id && t.userId === userId));
          appliedChanges++;
        }
      }
    }

    if (Array.isArray(clientTransactions)) {
      for (const clientTx of clientTransactions) {
        if (!clientTx.id) continue;
        const exists = db.transactions.some(t => t.id === clientTx.id && t.userId === userId);
        if (!exists && !clientTx.isDeleted) {
          db.transactions.unshift({
            ...clientTx,
            userId,
            syncStatus: 'synced',
            updatedAt: clientTx.updatedAt || new Date().toISOString(),
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

    const serverTransactions = db.transactions.filter(t => t.userId === userId && !t.isDeleted);
    res.json({
      status: 'success',
      appliedChanges,
      serverTransactions,
      syncedAt: new Date().toISOString(),
      message: `Sync completed: ${appliedChanges} modifications applied.`,
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
    // In production, server.cjs is inside dist/, so __dirname_compat IS the dist folder.
    const distPath = __dirname_compat;

    // Serve static assets with proper caching and MIME types
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
    }));

    // SPA fallback: only for non-file, non-API routes
    // This prevents returning index.html for .js/.css/.wasm requests
    app.get('*', (req, res) => {
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        // A file extension was requested but not found — return 404, not index.html
        return res.status(404).send('Not found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Income & Expense PWA Server running at http://0.0.0.0:${PORT}`);
    console.log(`   Seeded accounts: ${SEED_SUPER_ADMIN_EMAIL} (super_admin) | ${SEED_ADMIN_EMAIL} (admin)`);
  });
}

startServer();
