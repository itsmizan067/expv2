import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, ActivityLog, Transaction, SyncQueueItem, UserRole, AccountStatus, PaymentRequest } from './src/types';

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// In ESM (tsx dev), __dirname is not available; derive it from import.meta.url.
// In production (esbuild → dist/server.cjs, CommonJS), esbuild injects __dirname
// automatically, but this branch is never reached there.
const __dirname_compat = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_BACKUP_FILE = path.join(DATA_DIR, 'db.json.bak');
const DB_TEMP_FILE = path.join(DATA_DIR, 'db.json.tmp');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ==========================================
// SUPABASE CLOUD PERSISTENCE ADAPTER
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://taesrkcpqujhkwvfsmke.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
    console.log('⚡ Supabase Client initialized successfully for project:', SUPABASE_URL);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
} else {
  console.log('ℹ️ Running in local JSON storage mode (SUPABASE_KEY not set).');
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
  paymentRequests: PaymentRequest[];
}

// ==========================================
// SUBSCRIPTION HELPERS
// ==========================================

/** 7-day trial end ISO string from now */
function trialEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

/** Plan expiry: 30 days from now */
function planExpiryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

/** Check if a user's subscription allows access */
function isSubscriptionActive(user: User): boolean {
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  if (user.plan === 'trial' && user.trialEndsAt && new Date() < new Date(user.trialEndsAt)) return true;
  if ((user.plan === 'standard' || user.plan === 'premium') && user.planStatus === 'active' && user.planExpiresAt && new Date() < new Date(user.planExpiresAt)) return true;
  return false;
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
    paymentRequests: [],
  };
}

// ==========================================
// DB READ / WRITE
// ==========================================

// Migrate DB to ensure paymentRequests array always exists
function migrateDb(db: any): DatabaseSchema {
  if (!db.paymentRequests) db.paymentRequests = [];
  return db as DatabaseSchema;
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const fresh = buildInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
      return fresh;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed: DatabaseSchema = migrateDb(JSON.parse(data));

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
    // Also auto-approve any user accounts with status 'pending' to 'active' with a 7-day trial.
    parsed.users = parsed.users.map(u => {
      let updated = { ...u };
      let changed = false;
      if (updated.status === 'pending') {
        updated.status = 'active';
        changed = true;
      }
      if (!updated.plan) {
        updated.plan = 'trial';
        changed = true;
      }
      if (!updated.planStatus) {
        updated.planStatus = 'active';
        changed = true;
      }
      if (updated.plan === 'trial' && !updated.trialEndsAt) {
        updated.trialEndsAt = trialEndDate();
        changed = true;
      }
      if (updated.passwordHash && !updated.passwordHash.includes(':')) {
        updated.passwordHash = hashPassword(updated.passwordHash);
        changed = true;
      }
      if (changed) dirty = true;
      return updated;
    });

    if (dirty) {
      writeDb(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading primary DB file:', err);
    // If db.json was corrupted, attempt automatic recovery from db.json.bak
    if (fs.existsSync(DB_BACKUP_FILE)) {
      try {
        const backupData = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
        const restored = migrateDb(JSON.parse(backupData));
        fs.copyFileSync(DB_BACKUP_FILE, DB_FILE);
        console.warn('⚠️ Primary database recovered safely from db.json.bak');
        return restored;
      } catch (backupErr) {
        console.error('Failed to restore from backup database:', backupErr);
      }
    }

    console.warn('⚠️ No valid backup found, rebuilding database from initial seed');
    const fresh = buildInitialDb();
    writeDb(fresh);
    return fresh;
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    const payload = JSON.stringify(data, null, 2);
    // 1. Write to temporary file first (atomic write pattern)
    fs.writeFileSync(DB_TEMP_FILE, payload, 'utf-8');

    // 2. Keep a rotating backup before overwriting the main file
    if (fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
      } catch {
        // Non-blocking if backup copy fails
      }
    }

    // 3. Atomically replace the main database file
    fs.renameSync(DB_TEMP_FILE, DB_FILE);
  } catch (err) {
    console.error('Error writing DB atomically:', err);
    // Fallback direct write if atomic rename is blocked (e.g. cross-volume in rare OS setups)
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (directErr) {
      console.error('Critical failure writing database directly:', directErr);
    }
  }

  // Real-time asynchronous cloud sync to Supabase (if configured)
  triggerSupabaseSync(data);
}

// Debounced background sync to Supabase
let supabaseSyncTimeout: NodeJS.Timeout | null = null;
let pendingSupabaseDb: DatabaseSchema | null = null;

function triggerSupabaseSync(data: DatabaseSchema) {
  if (!supabase) return;
  pendingSupabaseDb = data;
  if (supabaseSyncTimeout) clearTimeout(supabaseSyncTimeout);
  supabaseSyncTimeout = setTimeout(async () => {
    if (!pendingSupabaseDb) return;
    const toSync = pendingSupabaseDb;
    pendingSupabaseDb = null;
    await syncAllToSupabase(toSync);
  }, 300);
}

async function syncAllToSupabase(db: DatabaseSchema) {
  if (!supabase) return;
  try {
    // 1. Sync Users
    if (db.users.length > 0) {
      const userRows = db.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password_hash: u.passwordHash,
        role: u.role,
        status: u.status,
        created_at: u.createdAt,
        last_login_at: u.lastLoginAt,
        last_active_at: u.lastActiveAt,
        total_logins: u.totalLogins,
        currency: u.currency || 'USD',
        monthly_budget_limit: u.monthlyBudgetLimit || 0,
        opening_balance: u.openingBalance || 0,
        phone: u.phone || '',
        profile_picture: u.profilePicture || '',
        plan: u.plan || 'trial',
        plan_status: u.planStatus || 'active',
        trial_ends_at: u.trialEndsAt,
        plan_expires_at: u.planExpiresAt,
      }));
      const { error: userErr } = await supabase.from('users').upsert(userRows, { onConflict: 'id' });
      if (userErr) console.warn('Supabase users upsert notice:', userErr.message);
    }

    // 2. Sync Transactions
    if (db.transactions.length > 0) {
      const txRows = db.transactions.map(t => ({
        id: t.id,
        user_id: t.userId,
        type: t.type,
        amount: t.amount,
        category: t.category,
        date: t.date,
        payment_method: t.paymentMethod,
        note: t.note || '',
        tags: t.tags || [],
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        is_deleted: t.isDeleted || false,
      }));
      const { error: txErr } = await supabase.from('transactions').upsert(txRows, { onConflict: 'id' });
      if (txErr) console.warn('Supabase transactions upsert notice:', txErr.message);
    }

    // 3. Sync Payment Requests
    if (db.paymentRequests && db.paymentRequests.length > 0) {
      const payRows = db.paymentRequests.map(p => ({
        id: p.id,
        user_id: p.userId,
        user_name: p.userName,
        user_email: p.userEmail,
        plan: p.plan,
        amount: p.amount,
        bkash_transaction_id: p.bkashTransactionId,
        screenshot_url: p.screenshotUrl,
        status: p.status,
        submitted_at: p.submittedAt,
        reviewed_at: p.reviewedAt,
        reviewed_by: p.reviewedBy,
        rejection_reason: p.rejectionReason,
      }));
      const { error: payErr } = await supabase.from('payment_requests').upsert(payRows, { onConflict: 'id' });
      if (payErr) console.warn('Supabase payment requests upsert notice:', payErr.message);
    }

    // 4. Sync Activity Logs (upsert latest 200 logs)
    if (db.logs && db.logs.length > 0) {
      const logRows = db.logs.slice(0, 200).map(l => ({
        id: l.id,
        user_id: l.userId,
        user_name: l.userName,
        user_email: l.userEmail,
        action: l.action,
        details: l.details,
        ip: l.ip,
        device: l.device,
        timestamp: l.timestamp,
      }));
      const { error: logErr } = await supabase.from('activity_logs').upsert(logRows, { onConflict: 'id' });
      if (logErr) console.warn('Supabase activity logs upsert notice:', logErr.message);
    }
  } catch (err) {
    console.error('Error during Supabase background sync:', err);
  }
}

// Hydrate database state from Supabase on startup
async function loadFromSupabase(): Promise<DatabaseSchema | null> {
  if (!supabase) return null;
  try {
    console.log('🔄 Fetching authoritative state from Supabase cloud database...');
    const [usersRes, txsRes, logsRes, payRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('activity_logs').select('*'),
      supabase.from('payment_requests').select('*'),
    ]);

    if (usersRes.error) {
      console.warn('Supabase users query warning:', usersRes.error.message);
      return null;
    }

    const cloudUsers: Array<User & { passwordHash?: string }> = (usersRes.data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.password_hash,
      role: u.role,
      status: u.status === 'pending' ? 'active' : (u.status || 'active'),
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      lastActiveAt: u.last_active_at,
      totalLogins: u.total_logins,
      currency: u.currency,
      monthlyBudgetLimit: u.monthly_budget_limit ? Number(u.monthly_budget_limit) : undefined,
      openingBalance: u.opening_balance ? Number(u.opening_balance) : 0,
      phone: u.phone,
      profilePicture: u.profile_picture,
      plan: u.plan || 'trial',
      planStatus: u.plan_status || 'active',
      trialEndsAt: u.trial_ends_at || (u.plan === 'trial' || !u.plan ? trialEndDate() : undefined),
      planExpiresAt: u.plan_expires_at,
    }));

    const cloudTxs: Transaction[] = (txsRes.data || []).map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      amount: Number(t.amount),
      category: t.category,
      date: typeof t.date === 'string' ? t.date.slice(0, 10) : String(t.date || '').slice(0, 10),
      paymentMethod: t.payment_method,
      note: t.note,
      tags: Array.isArray(t.tags) ? t.tags : [],
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      syncStatus: 'synced',
      isDeleted: t.is_deleted,
    }));

    const cloudLogs: ActivityLog[] = (logsRes.data || []).map((l: any) => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      userEmail: l.user_email,
      action: l.action,
      details: l.details,
      ip: l.ip,
      device: l.device,
      timestamp: l.timestamp,
    }));

    const cloudPay: PaymentRequest[] = (payRes.data || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      userName: p.user_name,
      userEmail: p.user_email,
      plan: p.plan,
      amount: Number(p.amount),
      bkashTransactionId: p.bkash_transaction_id,
      screenshotUrl: p.screenshot_url,
      status: p.status,
      submittedAt: p.submitted_at,
      reviewedAt: p.reviewed_at,
      reviewedBy: p.reviewed_by,
      rejectionReason: p.rejection_reason,
    }));

    if (cloudUsers.length > 0) {
      const db: DatabaseSchema = {
        users: cloudUsers,
        transactions: cloudTxs,
        logs: cloudLogs,
        paymentRequests: cloudPay,
      };
      // Write locally so synchronous reads remain instantaneous
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
      } catch {}
      console.log(`✅ Successfully restored ${cloudUsers.length} users & ${cloudTxs.length} transactions from Supabase!`);
      return db;
    } else {
      console.log('ℹ️ Supabase tables are currently empty. Seeding initial admin users into Supabase...');
      const seed = buildInitialDb();
      await syncAllToSupabase(seed);
      return seed;
    }
  } catch (err) {
    console.error('Failed to load from Supabase:', err);
    return null;
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

  // Hydrate state from Supabase on startup (if connected)
  await loadFromSupabase();

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
    const { name, email, password, currency, monthlyBudgetLimit, openingBalance } = req.body;
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

    // All self-registered users start as 'user' with automatic 'active' status and a 7-day free trial.
    // Only seeded admin accounts can have elevated roles.
    const role: UserRole = 'user';
    const status: AccountStatus = 'active';
    const trialEnd = trialEndDate();

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
      openingBalance: Number(openingBalance) || 0,
      plan: 'trial',
      planStatus: 'active',
      trialEndsAt: trialEnd,
    };

    db.users.push(newUser);
    writeDb(db);

    addActivityLog(
      newUser.id,
      newUser.name,
      newUser.email,
      'ACCOUNT_REGISTER',
      `Registered new user account (Status: active — 7-day free trial started)`,
      req
    );

    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({
      user: safeUser,
      message: 'Account registered successfully with 7-day free trial.',
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

    // Auto-approve users who were registered with 'pending' status to 'active' with 7-day trial
    if (user.status === 'pending') {
      user.status = 'active';
      if (!user.plan) user.plan = 'trial';
      if (!user.planStatus) user.planStatus = 'active';
      if (!user.trialEndsAt && user.plan === 'trial') {
        user.trialEndsAt = trialEndDate();
      }
      writeDb(db);
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

    const { name, currency, monthlyBudgetLimit, openingBalance, phone, profilePicture } = req.body;
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
    if (openingBalance !== undefined) {
      db.users[userIndex].openingBalance = Number(openingBalance) || 0;
    }
    if (phone !== undefined) db.users[userIndex].phone = phone.trim();
    if (profilePicture !== undefined) db.users[userIndex].profilePicture = profilePicture;
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

  // Admin: update a user's subscription plan directly
  app.patch('/api/admin/users/:id/plan', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { plan, durationDays = 30 } = req.body as { plan: 'trial' | 'standard' | 'premium'; durationDays?: number };
    const adminUserId = req.headers['x-user-id'] as string;

    const db = readDb();
    const adminUser = db.users.find(u => u.id === adminUserId);
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = db.users[userIndex];
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (Number(durationDays) || 30));

    targetUser.plan = plan;
    targetUser.planStatus = 'active';
    if (plan === 'trial') {
      targetUser.trialEndsAt = expiry.toISOString();
    } else {
      targetUser.planExpiresAt = expiry.toISOString();
    }

    db.users[userIndex] = targetUser;
    writeDb(db);

    addActivityLog(
      adminUserId,
      adminUser?.name || 'Admin',
      adminUser?.email || 'admin',
      'USER_PLAN_UPDATE',
      `Updated plan of ${targetUser.name} (${targetUser.email}) to ${plan} (valid until ${expiry.toISOString().slice(0, 10)})`,
      req
    );

    const { passwordHash: _, ...safeUser } = targetUser;
    res.json({ user: safeUser, message: `User plan updated to ${plan}` });
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
          // Scope existence check to this user so restoring backups or migrating records
          // never gets dropped due to ID conflicts with other users.
          const exists = db.transactions.some(t => t.id === tx.id && t.userId === userId);
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

    if (appliedChanges > 0) {
      writeDb(db);
    }

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
  // SUBSCRIPTION & PAYMENT ROUTES
  // ==========================================

  // Get subscription status for current user
  app.get('/api/subscription/status', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash: _, ...safe } = user;
    const active = isSubscriptionActive(user);
    const pendingPayment = db.paymentRequests.find(p => p.userId === userId && p.status === 'pending');
    res.json({ user: safe, subscriptionActive: active, pendingPayment: pendingPayment || null });
  });

  // Submit a payment request (user sends bKash txid + screenshot)
  app.post('/api/subscription/payment', (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { plan, bkashTransactionId, screenshotUrl } = req.body as {
      plan: 'standard' | 'premium';
      bkashTransactionId: string;
      screenshotUrl?: string;
    };
    if (!plan || !bkashTransactionId) {
      return res.status(400).json({ error: 'Plan and bKash transaction ID are required.' });
    }
    if (!['standard', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose standard or premium.' });
    }
    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const alreadyPending = db.paymentRequests.some(p => p.userId === userId && p.status === 'pending');
    if (alreadyPending) {
      return res.status(409).json({ error: 'You already have a pending payment request. Please wait for admin approval.' });
    }
    const amount = plan === 'standard' ? 100 : 250;
    const newRequest: PaymentRequest = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userName: user.name,
      userEmail: user.email,
      plan,
      amount,
      bkashTransactionId: bkashTransactionId.trim(),
      screenshotUrl: screenshotUrl || undefined,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    db.paymentRequests.unshift(newRequest);
    writeDb(db);
    addActivityLog(userId, user.name, user.email, 'PAYMENT_SUBMIT',
      `Submitted payment for ${plan} plan (৳${amount}) — bKash TX: ${bkashTransactionId}`, req);
    res.status(201).json({ paymentRequest: newRequest, message: 'Payment submitted. Admin will review and activate your plan shortly.' });
  });

  // Admin: list all payment requests
  app.get('/api/admin/payments', requireAdmin, (_req, res) => {
    const db = readDb();
    res.json({ paymentRequests: db.paymentRequests });
  });

  // Admin: approve a payment
  app.post('/api/admin/payments/:id/approve', requireAdmin, (req, res) => {
    const { id } = req.params;
    const adminUserId = req.headers['x-user-id'] as string;
    const db = readDb();
    const adminUser = db.users.find(u => u.id === adminUserId);
    const idx = db.paymentRequests.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Payment request not found' });
    const pr = db.paymentRequests[idx];
    pr.status = 'approved';
    pr.reviewedAt = new Date().toISOString();
    pr.reviewedBy = adminUser?.name || 'Admin';
    const userIdx = db.users.findIndex(u => u.id === pr.userId);
    if (userIdx !== -1) {
      db.users[userIdx].plan = pr.plan;
      db.users[userIdx].planStatus = 'active';
      db.users[userIdx].planExpiresAt = planExpiryDate();
    }
    db.paymentRequests[idx] = pr;
    writeDb(db);
    addActivityLog(adminUserId, adminUser?.name || 'Admin', adminUser?.email || 'admin', 'PAYMENT_APPROVE',
      `Approved ${pr.plan} plan for ${pr.userName} (${pr.userEmail}) — TX: ${pr.bkashTransactionId}`, req);
    res.json({ paymentRequest: pr, message: `${pr.plan} plan activated for ${pr.userName}.` });
  });

  // Admin: reject a payment
  app.post('/api/admin/payments/:id/reject', requireAdmin, (req, res) => {
    const { id } = req.params;
    const adminUserId = req.headers['x-user-id'] as string;
    const { reason } = req.body as { reason?: string };
    const db = readDb();
    const adminUser = db.users.find(u => u.id === adminUserId);
    const idx = db.paymentRequests.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Payment request not found' });
    const pr = db.paymentRequests[idx];
    pr.status = 'rejected';
    pr.reviewedAt = new Date().toISOString();
    pr.reviewedBy = adminUser?.name || 'Admin';
    pr.rejectionReason = reason || 'Transaction could not be verified.';
    db.paymentRequests[idx] = pr;
    writeDb(db);
    addActivityLog(adminUserId, adminUser?.name || 'Admin', adminUser?.email || 'admin', 'PAYMENT_REJECT',
      `Rejected ${pr.plan} plan for ${pr.userName} — Reason: ${pr.rejectionReason}`, req);
    res.json({ paymentRequest: pr, message: 'Payment request rejected.' });
  });

  // ==========================================
  // VITE DEVELOPMENT / PRODUCTION SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/.data/**', '**/db.json', /[\/\\]\.data[\/\\]/, /\.data/],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is inside dist/, so __dirname_compat IS the dist folder.
    const distPath = __dirname_compat;

    // Serve static assets with proper caching and MIME types
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
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
