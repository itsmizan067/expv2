-- ==============================================================================
-- POCKET BALANCE / EXPV2 - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run this entire script in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard/project/taesrkcpqujhkwvfsmke
-- 2. Click "SQL Editor" on the left sidebar (icon `>_`)
-- 3. Click "New query", paste this content, and click "Run"
-- ==============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  total_logins INT DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  monthly_budget_limit NUMERIC DEFAULT 0,
  opening_balance NUMERIC DEFAULT 0,
  phone TEXT DEFAULT '',
  profile_picture TEXT DEFAULT '',
  plan TEXT DEFAULT 'trial',
  plan_status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INT DEFAULT 0,
  otp_last_sent_at TIMESTAMPTZ,
  otp_purpose TEXT,
  otp_verified_at TIMESTAMPTZ,
  token_version INT DEFAULT 1
);

-- Migration helpers if upgrading an existing Supabase table:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_last_sent_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_purpose TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

-- 2. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  note TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  version INT DEFAULT 1,
  client_mutation_id TEXT
);

-- Migration helpers if upgrading an existing Supabase transactions table:
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS client_mutation_id TEXT;


-- 3. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  device TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAYMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  plan TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  bkash_transaction_id TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Disable Row Level Security (RLS) for server-side managed API queries
-- (Security is enforced by your Node backend with hashed passwords and session checks)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests DISABLE ROW LEVEL SECURITY;
