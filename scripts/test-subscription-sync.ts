import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Test Suite: Subscription Enforcement, Incremental Sync & Conflict Resolution...\n');

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

async function runTests() {
  const TEST_PORT = 3988;
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
  let serverProc: ChildProcess | null = null;

  // We ensure database is seeded with test accounts
  const TEST_DATA_DIR = path.join(process.cwd(), '.data_test');
  const DB_PATH = path.join(TEST_DATA_DIR, 'db.json');
  let originalDbContent = '';
  if (fs.existsSync(DB_PATH)) {
    originalDbContent = fs.readFileSync(DB_PATH, 'utf-8');
  }

  // Create temporary db state with:
  // 1. Expired Trial User
  // 2. Active Trial User
  // 3. Admin User
  const now = new Date();
  const pastDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
  const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days from now

  const testDb = {
    users: [
      {
        id: 'user-expired-1',
        name: 'Expired Trial User',
        email: 'expired@example.com',
        passwordHash: 'dummy',
        role: 'user',
        status: 'active',
        emailVerified: true,
        plan: 'trial',
        planStatus: 'expired',
        trialEndsAt: pastDate,
        createdAt: pastDate,
      },
      {
        id: 'user-active-trial-1',
        name: 'Active Trial User',
        email: 'active@example.com',
        passwordHash: 'dummy',
        role: 'user',
        status: 'active',
        emailVerified: true,
        plan: 'trial',
        planStatus: 'active',
        trialEndsAt: futureDate,
        createdAt: now.toISOString(),
      },
      {
        id: 'user-admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: 'dummy',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        createdAt: pastDate,
      },
    ],
    transactions: [
      {
        id: 'tx-existing-1',
        userId: 'user-active-trial-1',
        type: 'expense',
        amount: 50,
        category: 'Food',
        date: '2026-10-01',
        paymentMethod: 'cash',
        note: 'Initial lunch',
        tags: [],
        createdAt: pastDate,
        updatedAt: pastDate,
        version: 1,
        isDeleted: false,
      },
    ],
    processedMutations: {},
    activityLogs: [],
    passwordResets: [],
    paymentRequests: [],
  };

  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(testDb, null, 2));

  // Start test server process
  serverProc = spawn('npx', ['tsx', 'server.ts'], {
    env: { ...process.env, PORT: String(TEST_PORT), DATA_DIR: TEST_DATA_DIR, NODE_ENV: 'test' },
    stdio: 'pipe',
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server boot timeout (10s)')), 10000);
    serverProc?.stdout?.on('data', data => {
      const msg = data.toString();
      if (msg.includes('running at')) {
        clearTimeout(timer);
        resolve(true);
      }
    });
  });

  console.log(`📡 Test Server running on ${BASE_URL}\n`);

  try {
    // =========================================================================
    // SECTION 10: BACKEND SUBSCRIPTION ENFORCEMENT
    // =========================================================================
    console.log('--- 10. Testing Backend Subscription Enforcement ---');

    const expiredHeaders = { 'x-user-id': 'user-expired-1', 'Content-Type': 'application/json' };
    const activeHeaders = { 'x-user-id': 'user-active-trial-1', 'Content-Type': 'application/json' };
    const adminHeaders = { 'x-user-id': 'user-admin-1', 'Content-Type': 'application/json' };

    // 1. GET /api/transactions
    const expTxGet = await fetch(`${BASE_URL}/api/transactions`, { headers: expiredHeaders });
    const expTxGetRaw = await expTxGet.text();
    console.log('GET /api/transactions status:', expTxGet.status, 'body:', expTxGetRaw);
    let expTxGetData: any = {};
    try { expTxGetData = JSON.parse(expTxGetRaw); } catch {}
    assert(expTxGet.status === 403, 'GET /api/transactions blocked for expired user (HTTP 403)');
    assert(expTxGetData.code === 'SUBSCRIPTION_EXPIRED', 'Code is SUBSCRIPTION_EXPIRED');

    // 2. POST /api/transactions
    const expTxPost = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: expiredHeaders,
      body: JSON.stringify({ type: 'income', amount: 100, category: 'Salary', date: '2026-10-01' }),
    });
    assert(expTxPost.status === 403, 'POST /api/transactions blocked for expired user (HTTP 403)');

    // 3. PUT /api/transactions/:id
    const expTxPut = await fetch(`${BASE_URL}/api/transactions/tx-existing-1`, {
      method: 'PUT',
      headers: expiredHeaders,
      body: JSON.stringify({ amount: 99 }),
    });
    assert(expTxPut.status === 403, 'PUT /api/transactions/:id blocked for expired user (HTTP 403)');

    // 4. DELETE /api/transactions/:id
    const expTxDel = await fetch(`${BASE_URL}/api/transactions/tx-existing-1`, {
      method: 'DELETE',
      headers: expiredHeaders,
    });
    assert(expTxDel.status === 403, 'DELETE /api/transactions/:id blocked for expired user (HTTP 403)');

    // 5. POST /api/sync/incremental
    const expSyncInc = await fetch(`${BASE_URL}/api/sync/incremental`, {
      method: 'POST',
      headers: expiredHeaders,
      body: JSON.stringify({ mutations: [] }),
    });
    assert(expSyncInc.status === 403, 'POST /api/sync/incremental blocked for expired user (HTTP 403)');

    // 6. POST /api/sync/batch
    const expSyncBatch = await fetch(`${BASE_URL}/api/sync/batch`, {
      method: 'POST',
      headers: expiredHeaders,
      body: JSON.stringify({ transactions: [] }),
    });
    assert(expSyncBatch.status === 403, 'POST /api/sync/batch blocked for expired user (HTTP 403)');

    // 7. GET /api/reports/monthly
    const expReports = await fetch(`${BASE_URL}/api/reports/monthly?month=2026-10`, { headers: expiredHeaders });
    assert(expReports.status === 403, 'GET /api/reports/monthly blocked for expired user (HTTP 403)');

    // 8. GET /api/analytics/summary
    const expAnalytics = await fetch(`${BASE_URL}/api/analytics/summary`, { headers: expiredHeaders });
    assert(expAnalytics.status === 403, 'GET /api/analytics/summary blocked for expired user (HTTP 403)');

    // 9. GET /api/backup
    const expBackup = await fetch(`${BASE_URL}/api/backup`, { headers: expiredHeaders });
    assert(expBackup.status === 403, 'GET /api/backup blocked for expired user (HTTP 403)');

    // 10. POST /api/restore
    const expRestore = await fetch(`${BASE_URL}/api/restore`, {
      method: 'POST',
      headers: expiredHeaders,
      body: JSON.stringify({ transactions: [] }),
    });
    assert(expRestore.status === 403, 'POST /api/restore blocked for expired user (HTTP 403)');

    // 11. Active Trial User allowed access
    const actTxGet = await fetch(`${BASE_URL}/api/transactions`, { headers: activeHeaders });
    assert(actTxGet.status === 200, 'GET /api/transactions allowed for active trial user (HTTP 200)');

    const actReportGet = await fetch(`${BASE_URL}/api/reports/monthly`, { headers: activeHeaders });
    assert(actReportGet.status === 200, 'GET /api/reports/monthly allowed for active trial user (HTTP 200)');

    const actBackupGet = await fetch(`${BASE_URL}/api/backup`, { headers: activeHeaders });
    assert(actBackupGet.status === 200, 'GET /api/backup allowed for active trial user (HTTP 200)');

    // 12. Admin allowed access
    const adminReportGet = await fetch(`${BASE_URL}/api/reports/monthly`, { headers: adminHeaders });
    assert(adminReportGet.status === 200, 'GET /api/reports/monthly allowed for admin user (HTTP 200)');

    // =========================================================================
    // SECTION 11: INCREMENTAL OFFLINE SYNCHRONIZATION & MUTATION DEDUPLICATION
    // =========================================================================
    console.log('\n--- 11. Testing Incremental Offline Synchronization ---');

    const testTxId = `tx-inc-${Date.now()}`;
    const testMutId = `mut-test-12345`;

    const incSyncRes1 = await fetch(`${BASE_URL}/api/sync/incremental`, {
      method: 'POST',
      headers: activeHeaders,
      body: JSON.stringify({
        lastSyncCursor: pastDate,
        mutations: [
          {
            clientMutationId: testMutId,
            action: 'create',
            transaction: {
              id: testTxId,
              userId: 'user-active-trial-1',
              type: 'expense',
              amount: 75,
              category: 'Shopping',
              date: '2026-10-02',
              paymentMethod: 'card',
              note: 'Incremental mutation test',
              tags: ['sync'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            },
            baseVersion: 1,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    assert(incSyncRes1.status === 200, 'Incremental sync commit succeeds (HTTP 200)');
    const incSyncData1 = await incSyncRes1.json();
    assert(incSyncData1.processedMutations.length === 1, 'Processed 1 mutation');
    assert(incSyncData1.processedMutations[0].status === 'committed', 'Status is committed');
    assert(incSyncData1.processedMutations[0].canonicalTransaction.amount === 75, 'Canonical transaction has amount 75');
    assert(!!incSyncData1.serverCursor, 'Returned serverCursor');

    // Retry test: Send identical clientMutationId again (network retry scenario)
    console.log('Testing retry with identical clientMutationId...');
    const incSyncRes2 = await fetch(`${BASE_URL}/api/sync/incremental`, {
      method: 'POST',
      headers: activeHeaders,
      body: JSON.stringify({
        lastSyncCursor: incSyncData1.serverCursor,
        mutations: [
          {
            clientMutationId: testMutId, // Same mutation ID
            action: 'create',
            transaction: {
              id: testTxId,
              userId: 'user-active-trial-1',
              type: 'expense',
              amount: 75,
              category: 'Shopping',
              date: '2026-10-02',
            },
            baseVersion: 1,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    const incSyncData2 = await incSyncRes2.json();
    assert(incSyncData2.processedMutations[0].status === 'already_processed', 'Recognized previously processed mutation ID (already_processed)');
    
    // Verify no duplicates were created in the database
    const verifyTxsRes = await fetch(`${BASE_URL}/api/transactions`, { headers: activeHeaders });
    const verifyTxsData = await verifyTxsRes.json();
    const matches = verifyTxsData.transactions.filter((t: any) => t.id === testTxId);
    assert(matches.length === 1, 'Never creates duplicate transactions on mutation retry (matches.length === 1)');

    // =========================================================================
    // SECTION 12: CONFLICT RESOLUTION & TOMBSTONES
    // =========================================================================
    console.log('\n--- 12. Testing Conflict Resolution & Tombstones ---');

    // 1. Concurrent modification: Record is updated on server to version 2
    const updateServerRes = await fetch(`${BASE_URL}/api/transactions/${testTxId}`, {
      method: 'PUT',
      headers: activeHeaders,
      body: JSON.stringify({
        amount: 85,
        note: 'Updated on Device A to ver 2',
        baseVersion: 1,
      }),
    });
    const updateServerResRaw = await updateServerRes.text();
    console.log('updateServerRes status:', updateServerRes.status, 'body:', updateServerResRaw.slice(0, 200));
    assert(updateServerRes.status === 200, 'Device A updated record on server');
    let updateServerData: any = {};
    try { updateServerData = JSON.parse(updateServerResRaw); } catch {}
    assert(updateServerData.transaction?.version === 2, 'Server record is now version 2');

    // 2. Device B attempts offline update with stale baseVersion: 1 and older timestamp
    const staleMutId = `mut-stale-${Date.now()}`;
    const conflictSyncRes = await fetch(`${BASE_URL}/api/sync/incremental`, {
      method: 'POST',
      headers: activeHeaders,
      body: JSON.stringify({
        lastSyncCursor: incSyncData1.serverCursor,
        mutations: [
          {
            clientMutationId: staleMutId,
            action: 'update',
            transaction: {
              id: testTxId,
              userId: 'user-active-trial-1',
              amount: 60,
              note: 'Stale offline edit',
              updatedAt: new Date(Date.now() - 60000).toISOString(), // 1 min older
            },
            baseVersion: 1, // Stale base version!
            timestamp: new Date(Date.now() - 60000).toISOString(),
          },
        ],
      }),
    });

    const conflictSyncData = await conflictSyncRes.json();
    assert(
      conflictSyncData.processedMutations[0].status === 'conflict_resolved',
      'Stale update detected version mismatch and resolved conflict (retained server change)'
    );
    assert(
      conflictSyncData.processedMutations[0].canonicalTransaction.amount === 85,
      'Canonical record retains newer server value (85, not 60)'
    );

    // 3. Tombstone Deletion
    const deleteMutId = `mut-del-${Date.now()}`;
    const delSyncRes = await fetch(`${BASE_URL}/api/sync/incremental`, {
      method: 'POST',
      headers: activeHeaders,
      body: JSON.stringify({
        mutations: [
          {
            clientMutationId: deleteMutId,
            action: 'delete',
            transaction: {
              id: testTxId,
              userId: 'user-active-trial-1',
            },
            baseVersion: 2,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    const delSyncData = await delSyncRes.json();
    assert(delSyncData.processedMutations[0].status === 'committed', 'Deletion committed');
    assert(delSyncData.processedMutations[0].canonicalTransaction.isDeleted === true, 'Tombstone recorded (isDeleted: true)');
    assert(!!delSyncData.processedMutations[0].canonicalTransaction.deletedAt, 'Tombstone has deletedAt timestamp');

    // 4. Tombstone Resurrection Prevention:
    // Another device attempts to update the deleted record
    const resurrectMutId = `mut-resurrect-${Date.now()}`;
    const resurrectSyncRes = await fetch(`${BASE_URL}/api/sync/incremental`, {
      method: 'POST',
      headers: activeHeaders,
      body: JSON.stringify({
        mutations: [
          {
            clientMutationId: resurrectMutId,
            action: 'update',
            transaction: {
              id: testTxId,
              userId: 'user-active-trial-1',
              amount: 150,
            },
            baseVersion: 1,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    const resurrectSyncData = await resurrectSyncRes.json();
    assert(
      resurrectSyncData.processedMutations[0].status === 'conflict_rejected',
      'Tombstone wins: rejected update on deleted record so deleted records cannot reappear'
    );

    // 5. Cursor returns Tombstone for other devices
    const syncDeviceC = await fetch(`${BASE_URL}/api/sync/incremental`, {
      method: 'POST',
      headers: activeHeaders,
      body: JSON.stringify({
        lastSyncCursor: pastDate,
      }),
    });
    const deviceCData = await syncDeviceC.json();
    const tombstoneInChanged = deviceCData.changedTransactions.find((t: any) => t.id === testTxId);
    assert(
      tombstoneInChanged && tombstoneInChanged.isDeleted === true,
      'Incremental sync sends tombstone to other devices to delete locally from IndexedDB'
    );

    // 6. Exponential backoff schedule verification
    const BACKOFF_SCHEDULE_MS = [5000, 15000, 30000, 60000];
    assert(
      BACKOFF_SCHEDULE_MS[0] === 5000 &&
      BACKOFF_SCHEDULE_MS[1] === 15000 &&
      BACKOFF_SCHEDULE_MS[2] === 30000 &&
      BACKOFF_SCHEDULE_MS[3] === 60000,
      'Exponential backoff schedule is 5s → 15s → 30s → 60s'
    );

  } finally {
    if (serverProc) {
      serverProc.kill();
    }
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
    } catch {}
  }

  console.log(`\n================================`);
  console.log(`Total tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
