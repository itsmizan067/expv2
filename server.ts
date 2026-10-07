import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, ActivityLog, Transaction, SyncQueueItem, UserRole, AccountStatus, PaymentRequest, OtpPurpose } from './src/types';
import { emailService } from './src/server/emailService';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  maskEmail,
  OTP_EXPIRATION_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  MAX_RESENDS_PER_WINDOW,
  RESEND_WINDOW_MS,
} from './src/server/otpService';

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
  users: Array<User & { passwordHash?: string; otpHash?: string }>;
  transactions: Transaction[];
  logs: ActivityLog[];
  paymentRequests: PaymentRequest[];
  processedMutations?: Record<
    string,
    {
      transactionId: string;
      action: 'create' | 'update' | 'delete';
      version: number;
      processedAt: string;
    }
  >;
}

/** Sanitize user object to never leak sensitive hashes over API */
function sanitizeUser(u: User & { passwordHash?: string; otpHash?: string }): User {
  const { passwordHash: _, otpHash: __, ...safeUser } = u;
  return safeUser;
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
        emailVerified: true,
        emailVerifiedAt: '2025-01-01T00:00:00.000Z',
        createdAt: '2025-01-01T00:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalLogins: 0,
        currency: 'USD',
        monthlyBudgetLimit: 10000,
        tokenVersion: 1,
      },
      {
        id: 'admin-1',
        name: 'System Admin',
        email: SEED_ADMIN_EMAIL,
        passwordHash: hashPassword('admin123'),
        role: 'admin' as UserRole,
        status: 'active',
        emailVerified: true,
        emailVerifiedAt: '2025-01-01T08:00:00.000Z',
        createdAt: '2025-01-01T08:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalLogins: 0,
        currency: 'USD',
        monthlyBudgetLimit: 5000,
        tokenVersion: 1,
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
    processedMutations: {},
  };
}

// ==========================================
// DB READ / WRITE
// ==========================================

// Migrate DB to ensure paymentRequests, logs, and processedMutations always exist
function migrateDb(db: any): DatabaseSchema {
  if (!db.users) db.users = [];
  if (!db.transactions) db.transactions = [];
  if (!db.logs) db.logs = [];
  if (!db.paymentRequests) db.paymentRequests = [];
  if (!db.processedMutations) db.processedMutations = {};
  if (Array.isArray(db.transactions)) {
    db.transactions = db.transactions.map((t: any) => ({
      ...t,
      version: t.version || 1,
      isDeleted: Boolean(t.isDeleted),
    }));
  }
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
      if (updated.status === 'active' && updated.emailVerified === undefined) {
        updated.emailVerified = true;
        updated.emailVerifiedAt = updated.createdAt || new Date().toISOString();
        changed = true;
      }
      if (!updated.tokenVersion) {
        updated.tokenVersion = 1;
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
        email_verified: u.emailVerified ?? (u.status === 'active'),
        email_verified_at: u.emailVerifiedAt || null,
        otp_hash: u.otpHash || null,
        otp_expires_at: u.otpExpiresAt || null,
        otp_attempts: u.otpAttempts || 0,
        otp_last_sent_at: u.otpLastSentAt || null,
        otp_purpose: u.otpPurpose || null,
        otp_verified_at: u.otpVerifiedAt || null,
        token_version: u.tokenVersion || 1,
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
        is_deleted: Boolean(t.isDeleted),
        deleted_at: t.deletedAt || null,
        version: t.version || 1,
        client_mutation_id: t.clientMutationId || null,
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
      emailVerified: u.email_verified ?? (u.status === 'active'),
      emailVerifiedAt: u.email_verified_at,
      otpHash: u.otp_hash,
      otpExpiresAt: u.otp_expires_at,
      otpAttempts: u.otp_attempts || 0,
      otpLastSentAt: u.otp_last_sent_at,
      otpPurpose: u.otp_purpose,
      otpVerifiedAt: u.otp_verified_at,
      tokenVersion: u.token_version || 1,
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
      isDeleted: Boolean(t.is_deleted),
      deletedAt: t.deleted_at,
      version: Number(t.version) || 1,
      clientMutationId: t.client_mutation_id,
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
  // RBAC & BACKEND SUBSCRIPTION ENFORCEMENT MIDDLEWARE
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

  /**
   * Backend Subscription Enforcement Middleware
   * Authoritatively determines the user's trial/subscription status from trusted database data.
   * Expired trial or subscription users cannot bypass through direct API requests.
   * Admins and Super Admins always have access.
   */
  const requireActiveSubscription = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized: Missing user authentication credentials.',
        code: 'UNAUTHORIZED',
      });
    }

    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        error: 'User account not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const active = isSubscriptionActive(user);
    if (!active) {
      return res.status(403).json({
        error: 'Active subscription required. Your 7-day free trial or subscription plan has expired. Please upgrade or submit payment to access this service.',
        code: 'SUBSCRIPTION_EXPIRED',
        plan: user.plan || 'trial',
        planStatus: user.planStatus || 'expired',
        trialEndsAt: user.trialEndsAt,
        planExpiresAt: user.planExpiresAt,
        subscriptionActive: false,
      });
    }

    (req as any).user = user;
    next();
  };

  // ==========================================
  // AUTHENTICATION ROUTES WITH GMAIL OTP & EMAIL VERIFICATION
  // ==========================================

  // Email status inspection endpoint
  app.get('/api/email/status', (_req, res) => {
    res.json(emailService.getStatus());
  });

  // Live SMTP connection & auth test endpoint
  app.get('/api/email/verify', async (_req, res) => {
    const result = await emailService.testConnection();
    res.status(result.success ? 200 : 400).json(result);
  });

  // Live test email dispatch endpoint
  app.get('/api/email/test-send', async (req, res) => {
    const targetEmail = String(req.query.email || process.env.SMTP_USER || 'pocket.balance.exp@gmail.com').trim();
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await emailService.sendVerificationOtp(targetEmail, testOtp, 'PocketBalance Tester');
    if (result.success) {
      res.json({
        success: true,
        message: `Real test OTP email sent to ${targetEmail}! Check your inbox (or spam folder).`,
        otpDispatched: testOtp,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  });

  // 1. Register: creates unverified account, generates 6-digit OTP, sends via Gmail SMTP
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, currency, monthlyBudgetLimit, openingBalance } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();

    const db = readDb();
    const existingIndex = db.users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (existingIndex !== -1) {
      const existingUser = db.users[existingIndex];
      // If already active/verified
      if (existingUser.status === 'active' || existingUser.emailVerified) {
        return res.status(409).json({
          error: 'An account with this email address already exists. Please sign in.',
          code: 'EMAIL_ALREADY_EXISTS',
        });
      }

      // Existing unverified account: regenerate OTP and dispatch fresh code
      const otp = generateOtp();
      existingUser.name = cleanName;
      existingUser.passwordHash = hashPassword(password);
      existingUser.otpHash = hashOtp(otp);
      existingUser.otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS).toISOString();
      existingUser.otpAttempts = 0;
      existingUser.otpLastSentAt = new Date().toISOString();
      existingUser.otpPurpose = 'email_verification';
      existingUser.status = 'unverified';
      existingUser.emailVerified = false;
      db.users[existingIndex] = existingUser;
      writeDb(db);

      const sendResult = await emailService.sendVerificationOtp(cleanEmail, otp, cleanName);
      if (!sendResult.success) {
        return res.status(502).json({
          error: sendResult.error || 'Failed to dispatch verification email via Gmail. Please check SMTP credentials.',
          code: 'EMAIL_DELIVERY_FAILED',
        });
      }

      addActivityLog(
        existingUser.id,
        existingUser.name,
        existingUser.email,
        'ACCOUNT_REGISTER',
        'Refreshed unverified account; 6-digit verification code sent to Gmail',
        req
      );

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        email: cleanEmail,
        maskedEmail: maskEmail(cleanEmail),
        message: 'A 6-digit verification code has been sent to your Gmail inbox.',
      });
    }

    // New unverified registration
    const otp = generateOtp();
    const newUser: User & { passwordHash: string; otpHash?: string } = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      role: 'user',
      status: 'unverified',
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      totalLogins: 0,
      currency: currency || 'USD',
      monthlyBudgetLimit: Number(monthlyBudgetLimit) || 3000,
      openingBalance: Number(openingBalance) || 0,
      plan: 'trial',
      planStatus: 'active',
      otpHash: hashOtp(otp),
      otpExpiresAt: new Date(Date.now() + OTP_EXPIRATION_MS).toISOString(),
      otpAttempts: 0,
      otpLastSentAt: new Date().toISOString(),
      otpPurpose: 'email_verification',
      otpResendCount: 0,
      tokenVersion: 1,
    };

    db.users.push(newUser);
    writeDb(db);

    // Send real Gmail verification code
    const sendResult = await emailService.sendVerificationOtp(cleanEmail, otp, cleanName);
    if (!sendResult.success) {
      return res.status(502).json({
        error: sendResult.error || 'Failed to dispatch verification email via Gmail. Please check SMTP credentials.',
        code: 'EMAIL_DELIVERY_FAILED',
      });
    }

    addActivityLog(
      newUser.id,
      newUser.name,
      newUser.email,
      'ACCOUNT_REGISTER',
      'Registered unverified account; 6-digit verification code sent to Gmail',
      req
    );

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      maskedEmail: maskEmail(cleanEmail),
      message: 'Registration successful! A 6-digit verification code has been sent to your Gmail inbox.',
    });
  });

  // 2. Verify Registration OTP: validates 6-digit OTP, marks email verified, activates account & trial
  app.post('/api/auth/verify-email', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: 'Verification code must be exactly 6 digits.' });
    }

    const db = readDb();
    const userIndex = db.users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const user = db.users[userIndex];

    // Already active and verified
    if (user.emailVerified && user.status === 'active') {
      const safeUser = sanitizeUser(user);
      return res.json({
        success: true,
        message: 'Email is already verified. You can sign in now.',
        user: safeUser,
        token: `token-${user.id}-${Date.now()}`,
      });
    }

    // Verify OTP Purpose
    if (user.otpPurpose !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Security: Check max attempts (limit 5)
    if ((user.otpAttempts || 0) >= MAX_ATTEMPTS) {
      // Invalidate current OTP
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      writeDb(db);
      return res.status(400).json({
        error: 'Maximum verification attempts (5) exceeded. This code has expired. Please request a new code.',
        code: 'TOO_MANY_ATTEMPTS',
      });
    }

    // Security: Check expiration (10 minutes)
    if (!user.otpExpiresAt || new Date(user.otpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.',
        code: 'EXPIRED',
      });
    }

    // Security: Timing-safe hash comparison
    const isValid = verifyOtpHash(cleanOtp, user.otpHash || '');

    if (!isValid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      const remaining = Math.max(0, MAX_ATTEMPTS - user.otpAttempts);
      writeDb(db);

      if (remaining === 0) {
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        writeDb(db);
        return res.status(400).json({
          error: 'Maximum verification attempts exceeded. This code has been invalidated. Please request a new code.',
          code: 'TOO_MANY_ATTEMPTS',
          attemptsRemaining: 0,
        });
      }

      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        code: 'INVALID_CODE',
        attemptsRemaining: remaining,
      });
    }

    // Success: Mark email verified & activate account
    user.emailVerified = true;
    user.emailVerifiedAt = new Date().toISOString();
    user.status = 'active';
    user.plan = 'trial';
    user.planStatus = 'active';
    user.trialEndsAt = trialEndDate();

    // Clear one-time OTP
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.otpPurpose = undefined;
    user.otpVerifiedAt = new Date().toISOString();

    // Login stats
    user.lastLoginAt = new Date().toISOString();
    user.lastActiveAt = new Date().toISOString();
    user.totalLogins = (user.totalLogins || 0) + 1;

    db.users[userIndex] = user;
    writeDb(db);

    addActivityLog(
      user.id,
      user.name,
      user.email,
      'EMAIL_VERIFY',
      'Email address verified successfully with 6-digit OTP. 7-day trial activated.',
      req
    );

    const safeUser = sanitizeUser(user);
    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to PocketBalance.',
      user: safeUser,
      token: `token-${user.id}-${Date.now()}`,
    });
  });

  // 3. Resend OTP: 60-second cooldown, hourly rate limit, never leaks account existence
  app.post('/api/auth/resend-otp', async (req, res) => {
    const { email, purpose = 'email_verification' } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPurpose: OtpPurpose = purpose === 'password_reset' ? 'password_reset' : 'email_verification';

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    // Generic response if account doesn't exist
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists for that email, a verification code has been sent.',
        retryAfter: 60,
      });
    }

    // If user is already active and purpose is verification
    if (cleanPurpose === 'email_verification' && user.emailVerified && user.status === 'active') {
      return res.json({
        success: true,
        message: 'Email is already verified. Please sign in to your account.',
        alreadyVerified: true,
      });
    }

    // Security: 60-second cooldown check
    if (user.otpLastSentAt) {
      const elapsed = Date.now() - new Date(user.otpLastSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          error: `Please wait ${retryAfter} second${retryAfter === 1 ? '' : 's'} before requesting another code.`,
          retryAfter,
          code: 'COOLDOWN_ACTIVE',
        });
      }
    }

    // Security: Repeated resend request limiting (5 per hour)
    const now = Date.now();
    const windowStart = user.otpResendWindowStart ? new Date(user.otpResendWindowStart).getTime() : 0;
    if (now - windowStart < RESEND_WINDOW_MS) {
      if ((user.otpResendCount || 0) >= MAX_RESENDS_PER_WINDOW) {
        return res.status(429).json({
          error: 'Maximum resend limit reached for this hour. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }
      user.otpResendCount = (user.otpResendCount || 0) + 1;
    } else {
      user.otpResendWindowStart = new Date().toISOString();
      user.otpResendCount = 1;
    }

    // Generate fresh 6-digit OTP
    const otp = generateOtp();
    user.otpHash = hashOtp(otp);
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS).toISOString();
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date().toISOString();
    user.otpPurpose = cleanPurpose;
    writeDb(db);

    // Send email (never log OTP value!)
    const sendResult =
      cleanPurpose === 'email_verification'
        ? await emailService.sendVerificationOtp(user.email, otp, user.name)
        : await emailService.sendPasswordResetOtp(user.email, otp, user.name);

    if (!sendResult.success) {
      return res.status(502).json({
        error: sendResult.error || 'Failed to dispatch verification code via Gmail. Please check SMTP settings.',
        code: 'EMAIL_DELIVERY_FAILED',
      });
    }

    addActivityLog(
      user.id,
      user.name,
      user.email,
      'OTP_SENT',
      `Dispatched new 6-digit OTP for ${cleanPurpose}`,
      req
    );

    res.json({
      success: true,
      message: 'If an account exists for that email, a verification code has been sent.',
      retryAfter: 60,
      maskedEmail: maskEmail(user.email),
    });
  });

  // 4. Password Recovery: Step 1 - Request 6-digit OTP (Do not reveal account existence)
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (user) {
      // 60s cooldown check
      if (user.otpLastSentAt) {
        const elapsed = Date.now() - new Date(user.otpLastSentAt).getTime();
        if (elapsed < RESEND_COOLDOWN_MS) {
          const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
          return res.status(429).json({
            error: `Please wait ${retryAfter} second${retryAfter === 1 ? '' : 's'} before requesting another code.`,
            retryAfter,
            code: 'COOLDOWN_ACTIVE',
          });
        }
      }

      // Generate 6-digit recovery OTP
      const otp = generateOtp();
      user.otpHash = hashOtp(otp);
      user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_MS).toISOString();
      user.otpAttempts = 0;
      user.otpLastSentAt = new Date().toISOString();
      user.otpPurpose = 'password_reset';
      writeDb(db);

      // Send via Gmail SMTP (never log OTP!)
      const sendResult = await emailService.sendPasswordResetOtp(user.email, otp, user.name);
      if (!sendResult.success) {
        return res.status(502).json({
          error: sendResult.error || 'Failed to dispatch password recovery code via Gmail. Please check SMTP settings.',
          code: 'EMAIL_DELIVERY_FAILED',
        });
      }

      addActivityLog(
        user.id,
        user.name,
        user.email,
        'PASSWORD_RESET_REQUEST',
        'Password recovery 6-digit OTP dispatched',
        req
      );
    }

    // Generic response: Do not reveal account existence
    res.json({
      success: true,
      message: 'If an account exists for that email, a verification code has been sent.',
      maskedEmail: maskEmail(cleanEmail),
      retryAfter: 60,
    });
  });

  // 5. Password Recovery: Step 2 - Verify Reset OTP
  app.post('/api/auth/verify-reset-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 6-digit recovery code are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: 'Recovery code must be exactly 6 digits.' });
    }

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code.', code: 'INVALID_CODE' });
    }

    if (user.otpPurpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Max attempts check (limit 5)
    if ((user.otpAttempts || 0) >= MAX_ATTEMPTS) {
      user.otpHash = undefined;
      writeDb(db);
      return res.status(400).json({
        error: 'Maximum verification attempts exceeded. This code has expired. Please request a new code.',
        code: 'TOO_MANY_ATTEMPTS',
      });
    }

    // Expiry check (10 min)
    if (!user.otpExpiresAt || new Date(user.otpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.',
        code: 'EXPIRED',
      });
    }

    // Timing-safe comparison
    const isValid = verifyOtpHash(cleanOtp, user.otpHash || '');

    if (!isValid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      const remaining = Math.max(0, MAX_ATTEMPTS - user.otpAttempts);
      writeDb(db);

      if (remaining === 0) {
        user.otpHash = undefined;
        writeDb(db);
        return res.status(400).json({
          error: 'Maximum verification attempts exceeded. Please request a new code.',
          code: 'TOO_MANY_ATTEMPTS',
          attemptsRemaining: 0,
        });
      }

      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        code: 'INVALID_CODE',
        attemptsRemaining: remaining,
      });
    }

    // Mark OTP verified for password reset (valid for 15 minutes)
    user.otpVerifiedAt = new Date().toISOString();
    writeDb(db);

    res.json({
      success: true,
      message: 'Code verified successfully. Please enter your new password.',
    });
  });

  // 6. Password Recovery: Step 3 - Set New Password & Invalidate Existing Sessions
  app.post('/api/auth/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return res.status(400).json({ error: 'Invalid or expired password reset session.' });
    }

    const user = db.users[userIndex];

    if (user.otpPurpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid password reset request.' });
    }

    // Verify either recent verification timestamp (within 15 min) or valid OTP provided
    const isFreshVerified =
      user.otpVerifiedAt && Date.now() - new Date(user.otpVerifiedAt).getTime() < 15 * 60 * 1000;
    const isValidOtp = otp ? verifyOtpHash(String(otp).trim(), user.otpHash || '') : false;

    if (!isFreshVerified && !isValidOtp) {
      return res.status(400).json({
        error: 'Password reset session has expired or is invalid. Please request a new verification code.',
        code: 'SESSION_EXPIRED',
      });
    }

    // Update password
    user.passwordHash = hashPassword(newPassword);

    // Invalidate existing sessions: increment tokenVersion & refresh active timestamp
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.lastActiveAt = new Date().toISOString();

    // Mark email verified if it wasn't already
    user.emailVerified = true;
    if (user.status === 'unverified') {
      user.status = 'active';
    }

    // Clear all OTP fields (one-time use)
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.otpPurpose = undefined;
    user.otpVerifiedAt = undefined;

    db.users[userIndex] = user;
    writeDb(db);

    addActivityLog(
      user.id,
      user.name,
      user.email,
      'PASSWORD_RESET_SUCCESS',
      'Password successfully reset. All previous sessions invalidated.',
      req
    );

    res.json({
      success: true,
      message: 'Your password has been reset successfully. Please sign in with your new password.',
    });
  });

  // 7. Login: validates credentials, verifies email status, rejects unverified or disabled accounts
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = db.users[userIndex];

    // Verify password
    const passwordOk = user.passwordHash ? verifyPassword(password, user.passwordHash) : false;

    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Block unverified accounts & send fresh OTP if needed
    if (user.status === 'unverified' || user.emailVerified === false) {
      const now = Date.now();
      const isExpired = !user.otpExpiresAt || new Date(user.otpExpiresAt).getTime() < now;
      const lastSent = user.otpLastSentAt ? new Date(user.otpLastSentAt).getTime() : 0;
      const cooldownElapsed = now - lastSent >= RESEND_COOLDOWN_MS;

      let dispatchedNewCode = false;
      if (isExpired || cooldownElapsed) {
        const otp = generateOtp();
        user.otpHash = hashOtp(otp);
        user.otpExpiresAt = new Date(now + OTP_EXPIRATION_MS).toISOString();
        user.otpAttempts = 0;
        user.otpLastSentAt = new Date(now).toISOString();
        user.otpPurpose = 'email_verification';
        writeDb(db);

        const sendResult = await emailService.sendVerificationOtp(user.email, otp, user.name);
        if (sendResult.success) {
          dispatchedNewCode = true;
          addActivityLog(
            user.id,
            user.name,
            user.email,
            'OTP_SENT',
            'Dispatched fresh 6-digit OTP upon sign-in attempt for unverified account',
            req
          );
        }
      }

      return res.status(403).json({
        error: dispatchedNewCode
          ? 'Your email address is not verified yet. A fresh 6-digit code has been sent to your Gmail inbox.'
          : 'Please enter the 6-digit verification code sent to your Gmail to activate your account.',
        requiresVerification: true,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Auto-approve users who were registered with legacy 'pending' status to 'active'
    if (user.status === 'pending') {
      user.status = 'active';
      user.emailVerified = true;
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

    const safeUser = sanitizeUser(user);
    res.json({
      user: safeUser,
      token: `token-${user.id}-${user.tokenVersion || 1}-${Date.now()}`,
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
    res.json({ user: sanitizeUser(db.users[userIndex]) });
  });

  // ==========================================
  // ADMIN ROUTES (admin + super_admin)
  // ==========================================

  // Get all users
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const db = readDb();
    const safeUsers = db.users.map(u => {
      const userTxCount = db.transactions.filter(t => t.userId === u.id && !t.isDeleted).length;
      return { ...sanitizeUser(u), transactionCount: userTxCount };
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

    res.json({ user: sanitizeUser(targetUser), message: `Account status updated to ${status}` });
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

    res.json({ user: sanitizeUser(targetUser), message: `User plan updated to ${plan}` });
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

    res.json({ user: sanitizeUser(target), message: `Role updated to ${role}` });
  });

  // ==========================================
  // TRANSACTION & SUBSCRIPTION-PROTECTED ROUTES
  // ==========================================

  // 1. Get all active transactions for current user (Subscription Protected)
  app.get('/api/transactions', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const db = readDb();
    const userTx = db.transactions.filter(t => t.userId === userId && !t.isDeleted);
    res.json({ transactions: userTx });
  });

  // 2. Create transaction (Subscription Protected)
  app.post('/api/transactions', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { type, amount, category, date, paymentMethod, note, tags, id, clientMutationId } = req.body;
    if (!type || amount === undefined || !category || !date) {
      return res.status(400).json({ error: 'Type, amount, category, and date are required' });
    }

    const db = readDb();
    const mutId = clientMutationId || `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Idempotency: Deduplicate if clientMutationId was already processed
    if (clientMutationId && db.processedMutations && db.processedMutations[clientMutationId]) {
      const existing = db.transactions.find(t => t.id === db.processedMutations![clientMutationId].transactionId);
      if (existing) {
        return res.status(200).json({ transaction: existing, alreadyProcessed: true });
      }
    }

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
      isDeleted: false,
      version: 1,
      clientMutationId: mutId,
    };

    db.transactions.unshift(newTx);
    if (!db.processedMutations) db.processedMutations = {};
    db.processedMutations[mutId] = {
      transactionId: newTx.id,
      action: 'create',
      version: 1,
      processedAt: new Date().toISOString(),
    };
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

  // 3. Update transaction (Subscription Protected & Concurrency Checked)
  app.put('/api/transactions/:id', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const db = readDb();
    const txIndex = db.transactions.findIndex(t => t.id === id && t.userId === userId);

    if (txIndex === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const existing = db.transactions[txIndex];
    const { type, amount, category, date, paymentMethod, note, tags, clientMutationId, baseVersion } = req.body;

    // Concurrency conflict check
    if (baseVersion !== undefined && (existing.version || 1) > baseVersion) {
      return res.status(409).json({
        error: 'Conflict: Record was modified on another device.',
        canonicalTransaction: existing,
        code: 'VERSION_CONFLICT',
      });
    }

    const newVersion = (existing.version || 1) + 1;
    const mutId = clientMutationId || `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.transactions[txIndex] = {
      ...existing,
      type: type || existing.type,
      amount: amount !== undefined ? Number(amount) : existing.amount,
      category: category ? category.trim() : existing.category,
      date: date || existing.date,
      paymentMethod: paymentMethod || existing.paymentMethod,
      note: note !== undefined ? note.trim() : existing.note,
      tags: Array.isArray(tags) ? tags : existing.tags,
      updatedAt: now,
      version: newVersion,
      clientMutationId: mutId,
      syncStatus: 'synced',
    };

    if (!db.processedMutations) db.processedMutations = {};
    db.processedMutations[mutId] = {
      transactionId: existing.id,
      action: 'update',
      version: newVersion,
      processedAt: now,
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

  // 4. Delete transaction with Tombstone marker (Subscription Protected)
  app.delete('/api/transactions/:id', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { clientMutationId } = req.body || {};
    const db = readDb();
    const txIndex = db.transactions.findIndex(t => t.id === id && t.userId === userId);

    if (txIndex === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const existing = db.transactions[txIndex];
    const now = new Date().toISOString();
    const newVersion = (existing.version || 1) + 1;
    const mutId = clientMutationId || `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Set Tombstone marker so deleted record cannot reappear during later sync on other devices
    existing.isDeleted = true;
    existing.deletedAt = now;
    existing.updatedAt = now;
    existing.version = newVersion;
    existing.clientMutationId = mutId;

    db.transactions[txIndex] = existing;
    if (!db.processedMutations) db.processedMutations = {};
    db.processedMutations[mutId] = {
      transactionId: existing.id,
      action: 'delete',
      version: newVersion,
      processedAt: now,
    };
    writeDb(db);

    const user = db.users.find(u => u.id === userId);
    addActivityLog(
      userId,
      user?.name || 'User',
      user?.email || 'user',
      'TRANSACTION_DELETE',
      `Deleted transaction ID ${id} (${existing.type} of $${existing.amount}) with tombstone`,
      req
    );

    res.json({ message: 'Transaction deleted successfully (tombstone recorded)', transaction: existing });
  });

  // 5. INCREMENTAL CHANGE-BASED SYNCHRONIZATION (Subscription Protected)
  app.post('/api/sync/incremental', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { lastSyncCursor, mutations = [] } = req.body as {
      lastSyncCursor?: string;
      mutations?: SyncQueueItem[];
    };

    const db = readDb();
    if (!db.processedMutations) db.processedMutations = {};

    const now = new Date().toISOString();
    const processedResults: Array<{
      clientMutationId: string;
      transactionId: string;
      action: 'create' | 'update' | 'delete';
      status: 'committed' | 'already_processed' | 'conflict_rejected' | 'conflict_resolved';
      canonicalTransaction?: Transaction;
    }> = [];

    const committedMutationIds = new Set<string>();
    let conflictsResolvedCount = 0;

    // Process incoming mutations
    for (const item of mutations) {
      const mutId = item.clientMutationId;
      const targetTx = item.transaction;
      if (!mutId || !targetTx || !targetTx.id) continue;

      // Deduplication: Has mutation already been committed?
      if (db.processedMutations[mutId]) {
        const canonical = db.transactions.find(t => t.id === targetTx.id && t.userId === userId);
        processedResults.push({
          clientMutationId: mutId,
          transactionId: targetTx.id,
          action: item.action,
          status: 'already_processed',
          canonicalTransaction: canonical,
        });
        continue;
      }

      if (item.action === 'create') {
        const existing = db.transactions.find(t => t.id === targetTx.id && t.userId === userId);
        if (existing) {
          // Record with same ID already exists on server
          conflictsResolvedCount++;
          db.processedMutations[mutId] = {
            transactionId: existing.id,
            action: 'create',
            version: existing.version || 1,
            processedAt: now,
          };
          processedResults.push({
            clientMutationId: mutId,
            transactionId: existing.id,
            action: 'create',
            status: 'conflict_resolved',
            canonicalTransaction: existing,
          });
        } else {
          const freshTx: Transaction = {
            ...targetTx,
            userId,
            version: 1,
            createdAt: targetTx.createdAt || now,
            updatedAt: now,
            isDeleted: false,
            clientMutationId: mutId,
            syncStatus: 'synced',
          };
          db.transactions.unshift(freshTx);
          db.processedMutations[mutId] = {
            transactionId: freshTx.id,
            action: 'create',
            version: 1,
            processedAt: now,
          };
          committedMutationIds.add(mutId);
          processedResults.push({
            clientMutationId: mutId,
            transactionId: freshTx.id,
            action: 'create',
            status: 'committed',
            canonicalTransaction: freshTx,
          });
        }
      } else if (item.action === 'update') {
        const idx = db.transactions.findIndex(t => t.id === targetTx.id && t.userId === userId);
        if (idx === -1) {
          // If transaction does not exist on server, create it
          const freshTx: Transaction = {
            ...targetTx,
            userId,
            version: 1,
            createdAt: targetTx.createdAt || now,
            updatedAt: now,
            isDeleted: false,
            clientMutationId: mutId,
            syncStatus: 'synced',
          };
          db.transactions.unshift(freshTx);
          db.processedMutations[mutId] = {
            transactionId: freshTx.id,
            action: 'update',
            version: 1,
            processedAt: now,
          };
          committedMutationIds.add(mutId);
          processedResults.push({
            clientMutationId: mutId,
            transactionId: freshTx.id,
            action: 'update',
            status: 'committed',
            canonicalTransaction: freshTx,
          });
        } else {
          const existing = db.transactions[idx];

          if (existing.isDeleted) {
            // Tombstone wins: rejected update to deleted item
            conflictsResolvedCount++;
            db.processedMutations[mutId] = {
              transactionId: existing.id,
              action: 'update',
              version: existing.version,
              processedAt: now,
            };
            processedResults.push({
              clientMutationId: mutId,
              transactionId: existing.id,
              action: 'update',
              status: 'conflict_rejected',
              canonicalTransaction: existing,
            });
          } else if ((existing.version || 1) > (item.baseVersion || 0)) {
            // Concurrent modification conflict: compare timestamps
            const serverTime = new Date(existing.updatedAt).getTime();
            const clientTime = new Date(item.timestamp || targetTx.updatedAt).getTime();

            if (serverTime > clientTime) {
              // Server has newer change: retain server record
              conflictsResolvedCount++;
              db.processedMutations[mutId] = {
                transactionId: existing.id,
                action: 'update',
                version: existing.version,
                processedAt: now,
              };
              processedResults.push({
                clientMutationId: mutId,
                transactionId: existing.id,
                action: 'update',
                status: 'conflict_resolved',
                canonicalTransaction: existing,
              });
            } else {
              // Client modification is newer: apply update and increment version
              const nextVer = (existing.version || 1) + 1;
              db.transactions[idx] = {
                ...existing,
                ...targetTx,
                userId,
                version: nextVer,
                updatedAt: now,
                clientMutationId: mutId,
                syncStatus: 'synced',
              };
              db.processedMutations[mutId] = {
                transactionId: existing.id,
                action: 'update',
                version: nextVer,
                processedAt: now,
              };
              committedMutationIds.add(mutId);
              processedResults.push({
                clientMutationId: mutId,
                transactionId: existing.id,
                action: 'update',
                status: 'committed',
                canonicalTransaction: db.transactions[idx],
              });
            }
          } else {
            // Clean update
            const nextVer = (existing.version || 1) + 1;
            db.transactions[idx] = {
              ...existing,
              ...targetTx,
              userId,
              version: nextVer,
              updatedAt: now,
              clientMutationId: mutId,
              syncStatus: 'synced',
            };
            db.processedMutations[mutId] = {
              transactionId: existing.id,
              action: 'update',
              version: nextVer,
              processedAt: now,
            };
            committedMutationIds.add(mutId);
            processedResults.push({
              clientMutationId: mutId,
              transactionId: existing.id,
              action: 'update',
              status: 'committed',
              canonicalTransaction: db.transactions[idx],
            });
          }
        }
      } else if (item.action === 'delete') {
        const idx = db.transactions.findIndex(t => t.id === targetTx.id && t.userId === userId);
        if (idx !== -1) {
          const existing = db.transactions[idx];
          const nextVer = (existing.version || 1) + 1;
          existing.isDeleted = true;
          existing.deletedAt = now;
          existing.updatedAt = now;
          existing.version = nextVer;
          existing.clientMutationId = mutId;
          db.transactions[idx] = existing;

          db.processedMutations[mutId] = {
            transactionId: existing.id,
            action: 'delete',
            version: nextVer,
            processedAt: now,
          };
          committedMutationIds.add(mutId);
          processedResults.push({
            clientMutationId: mutId,
            transactionId: existing.id,
            action: 'delete',
            status: 'committed',
            canonicalTransaction: existing,
          });
        } else {
          db.processedMutations[mutId] = {
            transactionId: targetTx.id,
            action: 'delete',
            version: 1,
            processedAt: now,
          };
          processedResults.push({
            clientMutationId: mutId,
            transactionId: targetTx.id,
            action: 'delete',
            status: 'committed',
          });
        }
      }
    }

    // Persist mutation modifications
    if (mutations.length > 0) {
      writeDb(db);
    }

    // Fetch incremental changes since lastSyncCursor
    let changedTransactions: Transaction[] = [];
    if (lastSyncCursor) {
      const cursorTime = new Date(lastSyncCursor).getTime();
      changedTransactions = db.transactions.filter(t => {
        if (t.userId !== userId) return false;
        // Exclude mutations that were just committed by this client
        if (t.clientMutationId && committedMutationIds.has(t.clientMutationId)) return false;
        return new Date(t.updatedAt).getTime() > cursorTime;
      });
    } else {
      // First sync: return all active transactions + any active tombstones
      changedTransactions = db.transactions.filter(t => {
        if (t.userId !== userId) return false;
        if (t.clientMutationId && committedMutationIds.has(t.clientMutationId)) return false;
        return !t.isDeleted;
      });
    }

    const totalActiveCount = db.transactions.filter(t => t.userId === userId && !t.isDeleted).length;

    res.json({
      serverCursor: now,
      processedMutations: processedResults,
      changedTransactions,
      serverTotalCount: totalActiveCount,
      conflictsResolved: conflictsResolvedCount,
    });
  });

  // 6. Legacy / Batch Sync route (Subscription Protected)
  app.post('/api/sync/batch', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { queue, clientTransactions } = req.body as {
      queue?: SyncQueueItem[];
      clientTransactions?: Transaction[];
    };

    const db = readDb();
    if (!db.processedMutations) db.processedMutations = {};
    let appliedChanges = 0;
    const now = new Date().toISOString();

    if (Array.isArray(queue) && queue.length > 0) {
      for (const item of queue) {
        const tx = item.transaction;
        if (!tx) continue;
        const mutId = item.clientMutationId || item.id;

        // Skip if already processed
        if (mutId && db.processedMutations[mutId]) continue;

        if (item.action === 'create') {
          const exists = db.transactions.some(t => t.id === tx.id && t.userId === userId);
          if (!exists) {
            db.transactions.unshift({
              ...tx,
              userId,
              version: 1,
              isDeleted: false,
              syncStatus: 'synced',
              updatedAt: now,
            });
            if (mutId) {
              db.processedMutations[mutId] = { transactionId: tx.id, action: 'create', version: 1, processedAt: now };
            }
            appliedChanges++;
          }
        } else if (item.action === 'update') {
          const idx = db.transactions.findIndex(t => t.id === tx.id && t.userId === userId);
          const nextVer = idx !== -1 ? (db.transactions[idx].version || 1) + 1 : 1;
          if (idx !== -1) {
            db.transactions[idx] = {
              ...db.transactions[idx],
              ...tx,
              userId,
              version: nextVer,
              syncStatus: 'synced',
              updatedAt: now,
            };
          } else {
            db.transactions.unshift({ ...tx, userId, version: 1, syncStatus: 'synced', updatedAt: now });
          }
          if (mutId) {
            db.processedMutations[mutId] = { transactionId: tx.id, action: 'update', version: nextVer, processedAt: now };
          }
          appliedChanges++;
        } else if (item.action === 'delete') {
          const idx = db.transactions.findIndex(t => t.id === tx.id && t.userId === userId);
          if (idx !== -1) {
            db.transactions[idx].isDeleted = true;
            db.transactions[idx].deletedAt = now;
            db.transactions[idx].updatedAt = now;
            db.transactions[idx].version = (db.transactions[idx].version || 1) + 1;
          }
          if (mutId) {
            db.processedMutations[mutId] = { transactionId: tx.id, action: 'delete', version: 1, processedAt: now };
          }
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
            version: 1,
            isDeleted: false,
            syncStatus: 'synced',
            updatedAt: clientTx.updatedAt || now,
          });
          appliedChanges++;
        }
      }
    }

    if (appliedChanges > 0) {
      writeDb(db);
    }

    const serverTransactions = db.transactions.filter(t => t.userId === userId && !t.isDeleted);
    res.json({
      status: 'success',
      appliedChanges,
      serverTransactions,
      syncedAt: now,
      message: `Sync completed: ${appliedChanges} modifications applied.`,
    });
  });

  // 7. Monthly Financial Report (Subscription Protected)
  app.get('/api/reports/monthly', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const requestedMonth = (req.query.month as string) || new Date().toISOString().slice(0, 7); // YYYY-MM
    const db = readDb();

    const monthTxs = db.transactions.filter(
      t => t.userId === userId && !t.isDeleted && typeof t.date === 'string' && t.date.startsWith(requestedMonth)
    );

    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    const dayBreakdown: Record<string, { income: number; expense: number }> = {};

    for (const tx of monthTxs) {
      const day = tx.date;
      if (!dayBreakdown[day]) dayBreakdown[day] = { income: 0, expense: 0 };

      if (tx.type === 'income') {
        totalIncome += tx.amount;
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
        dayBreakdown[day].income += tx.amount;
      } else {
        totalExpense += tx.amount;
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
        dayBreakdown[day].expense += tx.amount;
      }
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Number(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

    res.json({
      month: requestedMonth,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      transactionCount: monthTxs.length,
      incomeByCategory,
      expenseByCategory,
      dayBreakdown,
    });
  });

  // 8. Financial Analytics Summary (Subscription Protected)
  app.get('/api/analytics/summary', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const db = readDb();
    const user = db.users.find(u => u.id === userId);

    const userTxs = db.transactions.filter(t => t.userId === userId && !t.isDeleted);
    const currentMonth = new Date().toISOString().slice(0, 7);

    let totalIncome = 0;
    let totalExpense = 0;
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    const categoryTotals: Record<string, { income: number; expense: number }> = {};

    for (const tx of userTxs) {
      const isCurrent = typeof tx.date === 'string' && tx.date.startsWith(currentMonth);

      if (!categoryTotals[tx.category]) {
        categoryTotals[tx.category] = { income: 0, expense: 0 };
      }

      if (tx.type === 'income') {
        totalIncome += tx.amount;
        categoryTotals[tx.category].income += tx.amount;
        if (isCurrent) thisMonthIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        categoryTotals[tx.category].expense += tx.amount;
        if (isCurrent) thisMonthExpense += tx.amount;
      }
    }

    const netBalance = (user?.openingBalance || 0) + totalIncome - totalExpense;
    const budgetLimit = user?.monthlyBudgetLimit || 3000;
    const budgetUsedPct = budgetLimit > 0 ? Number(((thisMonthExpense / budgetLimit) * 100).toFixed(1)) : 0;
    const savingsRate = totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)) : 0;

    res.json({
      totalIncome,
      totalExpense,
      netBalance,
      thisMonthIncome,
      thisMonthExpense,
      monthlyBudgetLimit: budgetLimit,
      budgetUsedPercentage: budgetUsedPct,
      savingsRate,
      transactionCount: userTxs.length,
      categoryTotals,
    });
  });

  // 9. Complete Server Backup (Subscription Protected)
  app.get('/api/backup', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const db = readDb();
    const user = db.users.find(u => u.id === userId);
    const userTxs = db.transactions.filter(t => t.userId === userId && !t.isDeleted);

    const backupPayload = {
      version: 2,
      appName: 'PocketBalance',
      exportedAt: new Date().toISOString(),
      accountEmail: user?.email,
      userPreferences: {
        currency: user?.currency || 'USD',
        monthlyBudgetLimit: user?.monthlyBudgetLimit || 0,
        openingBalance: user?.openingBalance || 0,
      },
      transactions: userTxs,
    };

    addActivityLog(
      userId,
      user?.name || 'User',
      user?.email || 'user',
      'BACKUP_EXPORT',
      `Exported full backup of ${userTxs.length} transactions`,
      req
    );

    res.json(backupPayload);
  });

  // 10. Complete Server Restore (Subscription Protected)
  app.post('/api/restore', requireActiveSubscription, (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { transactions, userPreferences } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Invalid backup format: transactions array required.' });
    }

    const db = readDb();
    const now = new Date().toISOString();
    let restoredCount = 0;

    for (const item of transactions) {
      if (!item.type || item.amount === undefined || !item.category || !item.date) continue;

      const newTx: Transaction = {
        id: `tx-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${restoredCount}`,
        userId,
        type: item.type,
        amount: Number(item.amount),
        category: String(item.category).trim(),
        date: String(item.date).slice(0, 10),
        paymentMethod: item.paymentMethod || 'cash',
        note: (item.note || '').trim(),
        tags: Array.isArray(item.tags) ? item.tags : [],
        createdAt: item.createdAt || now,
        updatedAt: now,
        isDeleted: false,
        version: 1,
        syncStatus: 'synced',
      };

      db.transactions.unshift(newTx);
      restoredCount++;
    }

    // Apply restored preferences if present
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex !== -1 && userPreferences) {
      if (userPreferences.currency) db.users[userIndex].currency = userPreferences.currency;
      if (userPreferences.monthlyBudgetLimit !== undefined) {
        db.users[userIndex].monthlyBudgetLimit = Number(userPreferences.monthlyBudgetLimit);
      }
      if (userPreferences.openingBalance !== undefined) {
        db.users[userIndex].openingBalance = Number(userPreferences.openingBalance);
      }
    }

    writeDb(db);

    const user = db.users.find(u => u.id === userId);
    addActivityLog(
      userId,
      user?.name || 'User',
      user?.email || 'user',
      'BACKUP_RESTORE',
      `Restored ${restoredCount} transactions from backup`,
      req
    );

    res.json({
      success: true,
      message: `Successfully restored ${restoredCount} transaction(s).`,
      restoredCount,
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
    const active = isSubscriptionActive(user);
    const pendingPayment = db.paymentRequests.find(p => p.userId === userId && p.status === 'pending');
    res.json({ user: sanitizeUser(user), subscriptionActive: active, pendingPayment: pendingPayment || null });
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
