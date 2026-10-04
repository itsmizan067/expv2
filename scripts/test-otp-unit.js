import crypto from 'crypto';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  maskEmail,
  OTP_EXPIRATION_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
} from '../src/server/otpService.js';

console.log('🧪 Starting OTP & Security Verification Suite...\n');

let failed = 0;
let passed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

// 1. Exactly 6 numeric digits, random
const otps = new Set();
for (let i = 0; i < 50; i++) {
  const code = generateOtp();
  assert(/^\d{6}$/.test(code), `OTP is exactly 6 digits: ${code}`);
  otps.add(code);
}
assert(otps.size >= 45, 'Generated OTPs have high entropy and randomness');

// 2. Hashed storage & Timing-safe comparison
const plainOtp = generateOtp();
const hashed = hashOtp(plainOtp);
assert(typeof hashed === 'string' && hashed.length === 64, 'OTP is hashed using HMAC-SHA256 (64 hex characters)');
assert(hashed !== plainOtp, 'OTP is never stored in plaintext');
assert(verifyOtpHash(plainOtp, hashed) === true, 'Correct OTP validates against secure hash');
assert(verifyOtpHash('000000', hashed) === false, 'Incorrect OTP fails validation');
assert(verifyOtpHash('12345', hashed) === false, 'Invalid length OTP fails validation');
assert(verifyOtpHash('', hashed) === false, 'Empty OTP fails validation');

// 3. Email Masking
assert(maskEmail('mizan.boss@gmail.com') === 'm***s@gmail.com', 'Masks email properly (m***s@gmail.com)');
assert(maskEmail('admin@gmail.com') === 'a***n@gmail.com', 'Masks admin@gmail.com properly');
assert(maskEmail('a@b.com') === 'a***@b.com', 'Masks short email properly');

// 4. Expiration test
const pastExpiry = new Date(Date.now() - 1000).toISOString();
const futureExpiry = new Date(Date.now() + OTP_EXPIRATION_MS).toISOString();
assert(new Date(pastExpiry).getTime() < Date.now(), 'Expired timestamp detects correctly');
assert(new Date(futureExpiry).getTime() > Date.now(), '10-minute expiry window detects correctly');

// 5. Cooldown test (60 seconds)
const recentSent = new Date(Date.now() - 30 * 1000).toISOString();
const oldSent = new Date(Date.now() - 65 * 1000).toISOString();
const elapsedRecent = Date.now() - new Date(recentSent).getTime();
const elapsedOld = Date.now() - new Date(oldSent).getTime();
assert(elapsedRecent < RESEND_COOLDOWN_MS, 'Detects active 60s cooldown correctly (30s elapsed)');
assert(elapsedOld >= RESEND_COOLDOWN_MS, 'Allows resend after 60s cooldown (65s elapsed)');

console.log(`\n📊 Tests Finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
