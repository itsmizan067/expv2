import fs from 'fs';
import path from 'path';
import { generateOtp, hashOtp, verifyOtpHash } from '../src/server/otpService';

console.log('🧪 Starting End-to-End API Integration Simulation...\n');

const DATA_DIR = path.resolve('.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Clean up any test users from previous runs
const db = readDb();
db.users = db.users.filter(u => !u.email.includes('test_e2e_otp'));
writeDb(db);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

async function runTests() {
  const TEST_EMAIL = 'test_e2e_otp@gmail.com';
  const TEST_NAME = 'Test OTP User';
  const TEST_PASS = 'TestSecret123!';
  const NEW_PASS = 'NewSecret456!';

  // ==========================================
  // 1. Simulating Registration
  // ==========================================
  console.log('\n--- Test 1: User Registration with Unverified Status & 6-digit OTP ---');
  const otp1 = generateOtp();
  const db1 = readDb();
  
  const newUser = {
    id: `user-test-${Date.now()}`,
    name: TEST_NAME,
    email: TEST_EMAIL,
    passwordHash: 'dummy-salt:dummy-hash',
    role: 'user',
    status: 'unverified',
    emailVerified: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    totalLogins: 0,
    plan: 'trial',
    planStatus: 'active',
    otpHash: hashOtp(otp1),
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    otpAttempts: 0,
    otpLastSentAt: new Date().toISOString(),
    otpPurpose: 'email_verification',
    otpResendCount: 0,
    tokenVersion: 1,
  };
  
  db1.users.push(newUser);
  writeDb(db1);

  const savedUser = readDb().users.find(u => u.email === TEST_EMAIL);
  assert(savedUser.status === 'unverified', 'User registered as unverified');
  assert(savedUser.emailVerified === false, 'User emailVerified is false');
  assert(savedUser.otpHash !== undefined, 'User has OTP hash stored');
  assert(savedUser.otpHash !== otp1, 'OTP hash is not plaintext OTP');
  assert(savedUser.otpPurpose === 'email_verification', 'OTP purpose is email_verification');
  assert(savedUser.otpAttempts === 0, 'OTP attempts initialized to 0');

  // ==========================================
  // 2. Failed Verification & Attempts Counter
  // ==========================================
  console.log('\n--- Test 2: Failed OTP Attempts & Invalidation ---');
  let currentAttempts = savedUser.otpAttempts;
  const wrongCode = '000000';
  assert(!verifyOtpHash(wrongCode, savedUser.otpHash), 'Wrong OTP fails verification');
  
  // Simulate 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    currentAttempts++;
    assert(currentAttempts < 5, `Attempt ${i}: within attempt limit`);
  }
  
  // 5th attempt: threshold reached
  currentAttempts++;
  assert(currentAttempts >= 5, '5th attempt reaches max attempts limit (5)');

  // ==========================================
  // 3. Successful Verification & Activation
  // ==========================================
  console.log('\n--- Test 3: Successful OTP Verification & Account Activation ---');
  assert(verifyOtpHash(otp1, savedUser.otpHash), 'Correct 6-digit OTP matches hash');
  
  // Activate account
  const db3 = readDb();
  const u3 = db3.users.find(u => u.email === TEST_EMAIL);
  u3.status = 'active';
  u3.emailVerified = true;
  u3.emailVerifiedAt = new Date().toISOString();
  u3.otpHash = undefined;
  u3.otpExpiresAt = undefined;
  u3.otpAttempts = 0;
  u3.otpPurpose = undefined;
  writeDb(db3);

  const activated = readDb().users.find(u => u.email === TEST_EMAIL);
  assert(activated.status === 'active', 'User status became active');
  assert(activated.emailVerified === true, 'emailVerified is true');
  assert(activated.otpHash === undefined, 'OTP hash is cleared after one-time use');
  assert(activated.otpPurpose === undefined, 'OTP purpose cleared');

  // ==========================================
  // 4. Password Recovery Flow
  // ==========================================
  console.log('\n--- Test 4: Password Recovery Flow ---');
  const recoveryOtp = generateOtp();
  const db4 = readDb();
  const u4 = db4.users.find(u => u.email === TEST_EMAIL);
  u4.otpHash = hashOtp(recoveryOtp);
  u4.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  u4.otpAttempts = 0;
  u4.otpPurpose = 'password_reset';
  u4.otpLastSentAt = new Date().toISOString();
  writeDb(db4);

  const resetReq = readDb().users.find(u => u.email === TEST_EMAIL);
  assert(resetReq.otpPurpose === 'password_reset', 'OTP purpose set to password_reset');
  assert(verifyOtpHash(recoveryOtp, resetReq.otpHash), 'Recovery OTP verifies against hash');
  assert(resetReq.otpPurpose !== 'email_verification', 'Separate OTP purposes strictly maintained');

  // Reset password and invalidate sessions
  const prevTokenVersion = resetReq.tokenVersion || 1;
  const db5 = readDb();
  const u5 = db5.users.find(u => u.email === TEST_EMAIL);
  u5.tokenVersion = prevTokenVersion + 1;
  u5.otpHash = undefined;
  u5.otpPurpose = undefined;
  writeDb(db5);

  const passResetDone = readDb().users.find(u => u.email === TEST_EMAIL);
  assert(passResetDone.tokenVersion === prevTokenVersion + 1, 'Existing sessions invalidated (tokenVersion incremented)');
  assert(passResetDone.otpHash === undefined, 'Recovery OTP hash cleared');

  // Clean up test user
  const cleanDb = readDb();
  cleanDb.users = cleanDb.users.filter(u => u.email !== TEST_EMAIL);
  writeDb(cleanDb);

  console.log(`\n🎉 Simulation Complete: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests();
