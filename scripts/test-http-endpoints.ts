import http from 'http';
import express from 'express';
import { emailService } from '../src/server/emailService';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  maskEmail,
  OTP_EXPIRATION_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
} from '../src/server/otpService';

console.log('🚀 Testing Real Express API HTTP Endpoints...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

async function testHttp() {
  const TEST_PORT = 3899;
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  // We can launch tsx server.ts with PORT=3899 in a child process
  const { spawn } = await import('child_process');
  const serverProc = spawn('npx', ['tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'test' },
    stdio: 'pipe',
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server failed to start within 10s')), 10000);
    serverProc.stdout.on('data', data => {
      const msg = data.toString();
      if (msg.includes('running at')) {
        clearTimeout(timeout);
        resolve(true);
      }
    });
    serverProc.stderr.on('data', err => {
      // ignore warnings
    });
  });

  console.log(`⚡ Server online on ${BASE_URL}\n`);

  try {
    // 1. Email Status Check
    const statusRes = await fetch(`${BASE_URL}/api/email/status`);
    const statusData = await statusRes.json();
    assert(statusRes.ok, 'GET /api/email/status returns 200 OK');
    assert('configured' in statusData, 'Status reports configured flag');
    assert(statusData.host === 'smtp.gmail.com', 'Default host is smtp.gmail.com');
    assert('userMasked' in statusData, 'Masks SMTP user for security');

    // 2. Register New User
    const uniqueEmail = `realtest_${Date.now()}@domain.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Real Test User',
        email: uniqueEmail,
        password: 'Password123!',
        currency: 'USD',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created');
    assert(regData.requiresVerification === true, 'Registration flags requiresVerification = true');
    assert(regData.maskedEmail !== undefined, 'Returns privacy-masked email');
    assert(regData.maskedEmail.includes('***'), 'Email is properly masked');

    // 3. Login blocked for unverified account
    const unverifiedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'Password123!',
      }),
    });
    const unverifiedLoginData = await unverifiedLoginRes.json();
    assert(unverifiedLoginRes.status === 403, 'Login returns 403 for unverified user');
    assert(unverifiedLoginData.requiresVerification === true, 'Login specifies requiresVerification = true');

    // 4. Test wrong OTP rejection & attempts counter
    const wrongVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        otp: '999999',
      }),
    });
    const wrongVerifyData = await wrongVerifyRes.json();
    assert(wrongVerifyRes.status === 400, 'Invalid OTP returns 400 Bad Request');
    assert(wrongVerifyData.attemptsRemaining === 4, 'Remaining attempts decremented to 4');

    // 5. Test Resend Cooldown
    const cooldownRes = await fetch(`${BASE_URL}/api/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        purpose: 'email_verification',
      }),
    });
    const cooldownData = await cooldownRes.json();
    assert(cooldownRes.status === 429, 'Resend within 60s returns 429 Cooldown Active');
    assert(cooldownData.code === 'COOLDOWN_ACTIVE', 'Reports COOLDOWN_ACTIVE');
    assert(cooldownData.retryAfter > 0, `retryAfter is positive: ${cooldownData.retryAfter}s`);

    // 6. Test Forgot Password does not reveal account existence
    const forgotUnknownRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'definitely_does_not_exist_98234@unknown.com',
      }),
    });
    const forgotUnknownData = await forgotUnknownRes.json();
    assert(forgotUnknownRes.ok, 'Forgot password returns 200 for non-existent email');
    assert(
      forgotUnknownData.message.includes('If an account exists'),
      'Generic response prevents account enumeration'
    );

  } finally {
    serverProc.kill();
  }

  console.log(`\n🎉 HTTP Endpoint Tests Finished: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

testHttp().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
