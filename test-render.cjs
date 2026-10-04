const fs = require('fs');
require.extensions['.css'] = () => { };

global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; }
};

global.window = {
  addEventListener() { },
  removeEventListener() { },
  innerWidth: 1024,
  innerHeight: 768,
};
global.navigator = { onLine: true };
global.document = {
  createElement() {
    return {
      setAttribute() { },
      click() { },
    };
  },
  body: {
    appendChild() { },
    removeChild() { }
  }
};

const React = require('react');
const ReactDOMServer = require('react-dom/server');

async function run() {
  const App = (await import('./src/App.tsx')).default;

  // Test 1: null user (landing page)
  console.log('Testing null user...');
  try {
    const html1 = ReactDOMServer.renderToString(React.createElement(App));
    console.log('Test 1 OK, length:', html1.length);
  } catch (e) {
    console.error('Test 1 failed:', e);
  }

  // Test 2: Admin user
  console.log('Testing admin user...');
  global.localStorage.setItem('income_pwa_current_user', JSON.stringify({
    id: 'admin-1',
    name: 'System Admin',
    email: 'admin@gmail.com',
    role: 'admin',
    status: 'active',
  }));
  try {
    const html2 = ReactDOMServer.renderToString(React.createElement(App));
    console.log('Test 2 OK, length:', html2.length);
  } catch (e) {
    console.error('Test 2 failed:', e);
  }

  // Test 3: Standard user with active premium plan
  console.log('Testing standard user (miz123)...');
  global.localStorage.setItem('income_pwa_current_user', JSON.stringify({
    id: 'user-1790358181048-arekc',
    name: 'Mizan',
    email: 'miz123@gmail.com',
    role: 'user',
    status: 'active',
    currency: 'BDT',
    monthlyBudgetLimit: 3000,
    plan: 'premium',
    planStatus: 'active',
    trialEndsAt: '2026-10-02T17:43:01.048Z',
    planExpiresAt: '2026-10-25T19:36:15.340Z'
  }));
  try {
    const html3 = ReactDOMServer.renderToString(React.createElement(App));
    console.log('Test 3 OK, length:', html3.length);
  } catch (e) {
    console.error('Test 3 failed:', e);
  }

  // Test 4: User with cached transactions
  console.log('Testing standard user with cached transactions...');
  global.localStorage.setItem('income_pwa_transactions_user-1790358181048-arekc', JSON.stringify([
    {
      id: 'tx-1',
      userId: 'user-1790358181048-arekc',
      type: 'income',
      amount: 8000,

      category: 'Freelance',
      date: '2026-09-25',
      paymentMethod: 'cash',
      note: '',
      tags: [],
      createdAt: '2026-09-25T19:38:59.561Z',
      updatedAt: '2026-09-25T19:38:59.570Z',
    }
  ]));
  try {
    const html4 = ReactDOMServer.renderToString(React.createElement(App));
    console.log('Test 4 OK, length:', html4.length);
  } catch (e) {
    console.error('Test 4 failed:', e);
  }

  // Test 5: Subscription Wall component
  console.log('Testing SubscriptionWall component directly...');
  const { SubscriptionWall } = await import('./src/components/SubscriptionWall.tsx');
  try {
    const htmlSub = ReactDOMServer.renderToString(React.createElement(SubscriptionWall, {
      user: {
        id: 'user-new',
        name: 'New User',
        email: 'new@example.com',
        role: 'user',
        status: 'active',
        plan: 'trial',
        trialEndsAt: '2026-01-01T00:00:00.000Z' // expired
      },
      pendingPayment: null,
      onSubscriptionSuccess: () => { }
    }));
    console.log('Test 5 SubWall OK, length:', htmlSub.length);
  } catch (e) {
    console.error('Test 5 SubWall failed:', e);
  }
}

run();
