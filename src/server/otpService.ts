import crypto from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'pocketbalance-otp-secure-salt-2026';
export const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const MAX_ATTEMPTS = 5;
export const MAX_RESENDS_PER_WINDOW = 5;
export const RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export type OtpPurpose = 'email_verification' | 'password_reset';

/**
 * Generate a cryptographically random, exactly 6 numeric digits OTP.
 * Uses crypto.randomInt for uniform distribution and unpredictability.
 */
export function generateOtp(): string {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Securely hashes an OTP using HMAC-SHA256.
 * The raw OTP is NEVER stored in the database.
 */
export function hashOtp(otp: string): string {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(otp.trim())
    .digest('hex');
}

/**
 * Timing-safe comparison of user-entered OTP against the stored secure hash.
 */
export function verifyOtpHash(inputOtp: string, storedHash: string): boolean {
  if (!inputOtp || !storedHash) return false;
  // OTP must be exactly 6 numeric digits
  if (!/^\d{6}$/.test(inputOtp.trim())) return false;

  const candidate = hashOtp(inputOtp.trim());
  const candidateBuf = Buffer.from(candidate, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');

  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}

/**
 * Mask an email address for privacy-safe display in responses and UI
 * (e.g. "mizan.boss@gmail.com" -> "m***s@gmail.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}
