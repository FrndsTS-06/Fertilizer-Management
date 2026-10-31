const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config');
const userRepository = require('../src/repositories/user.repository');
const { resetRateLimit } = require('../src/middleware/rateLimiter');
const { pool, closePool } = require('../src/config/db');

test('Phase 07 Authentication & Authorization Security Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let staffToken;

  await t.test('Setup: HTTP server starts on an ephemeral port', async () => {
    await new Promise((resolve, reject) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
      server.on('error', reject);
    });
    assert.ok(baseUrl);
    resetRateLimit('127.0.0.1');
  });

  // 1. Valid Admin Login
  await t.test('POST /api/auth/login succeeds with valid admin credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Login successful');
    assert.ok(body.data.token, 'Token should be issued');
    assert.strictEqual(body.data.user.email, 'admin@fertilizershop.local');
    assert.strictEqual(body.data.user.role, 'ADMIN');

    adminToken = body.data.token;
  });

  // 2. Valid Staff Login
  await t.test('POST /api/auth/login succeeds with valid staff credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cashier@fertilizershop.local',
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.role, 'STAFF');

    staffToken = body.data.token;
  });

  // 3. Invalid Password (OWASP Generic Error)
  await t.test('POST /api/auth/login returns 401 with generic error on incorrect password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'WrongPassword!456',
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Invalid email or password');
  });

  // 4. Non-existent Email (OWASP User Enumeration Prevention)
  await t.test('POST /api/auth/login returns identical 401 error on unknown email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user@fertilizershop.local',
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Invalid email or password');
  });

  // 5. Protected Profile (/api/auth/me) with Valid Token
  await t.test('GET /api/auth/me returns current user profile when valid token provided', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.email, 'admin@fertilizershop.local');
    assert.strictEqual(body.data.user.role, 'ADMIN');
  });

  // 6. Missing Authorization Token
  await t.test('GET /api/auth/me returns 401 when Authorization header is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('missing or malformed'));
  });

  // 7. Malformed Authorization Token
  await t.test('GET /api/auth/me returns 401 when token is corrupt or malformed', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('invalid'));
  });

  // 8. Expired Token Rejection
  await t.test('GET /api/auth/me returns 401 when token is expired', async () => {
    // Generate an intentionally expired token (0s lifespan)
    const expiredToken = jwt.sign(
      { id: '80daf063-ed13-4a82-b411-3c7eadcc5a81', email: 'admin@fertilizershop.local', role: 'ADMIN' },
      config.jwt.secret,
      { expiresIn: '-1s' }
    );

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('expired'));
  });

  // 9. Role-Based Permissions: Admin Access Allowed
  await t.test('GET /api/auth/admin-only allows ADMIN role access', async () => {
    const res = await fetch(`${baseUrl}/api/auth/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.role, 'ADMIN');
  });

  // 10. Role-Based Permissions: Staff Access Denied to Admin Route (403 Forbidden)
  await t.test('GET /api/auth/admin-only denies STAFF role with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/auth/admin-only`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Insufficient permissions'));
  });

  // 11. Role-Based Permissions: Staff Allowed on Staff Route
  await t.test('GET /api/auth/staff-only allows STAFF role access', async () => {
    const res = await fetch(`${baseUrl}/api/auth/staff-only`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 12. Deactivated User Rejection
  await t.test('Deactivated user is rejected from login and token verification', async () => {
    // Insert a dedicated deactivated user to avoid mutating shared cashier account during parallel runs
    const authService = require('../src/services/auth.service');
    const passwordHash = await authService.hashPassword('Password@123');
    await pool.query("DELETE FROM users WHERE email = 'deactivated.test@fertilizershop.local';");
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ('deactivated.test@fertilizershop.local', $1, 'Deactivated Account', 'STAFF', FALSE);`,
      [passwordHash]
    );

    // Login attempt should fail with 403
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'deactivated.test@fertilizershop.local',
        password: 'Password@123',
      }),
    });

    assert.strictEqual(loginRes.status, 403);
    const loginBody = await loginRes.json();
    assert.ok(loginBody.message.includes('deactivated'));

    // Clean up dedicated test user
    await pool.query("DELETE FROM users WHERE email = 'deactivated.test@fertilizershop.local';");
  });

  // 13. Login Rate Limiting (429 Too Many Requests)
  await t.test('Excessive failed login attempts trigger 429 rate limiter', async () => {
    resetRateLimit('127.0.0.1');

    // Perform failed attempts up to limit
    for (let i = 0; i < config.rateLimit.loginMaxAttempts; i++) {
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@fertilizershop.local',
          password: 'WrongPassword',
        }),
      });
    }

    // The next attempt must be blocked by rate limiter
    const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fertilizershop.local',
        password: 'WrongPassword',
      }),
    });

    assert.strictEqual(blockedRes.status, 429);
    assert.ok(blockedRes.headers.get('retry-after'));
    const blockedBody = await blockedRes.json();
    assert.strictEqual(blockedBody.error.code, 'TOO_MANY_REQUESTS');

    // Clean up rate limit state for client IP
    resetRateLimit('127.0.0.1');
  });

  // 14. Logout endpoint
  await t.test('POST /api/auth/logout succeeds with valid token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Logged out successfully');
  });

  // Teardown
  await t.test('Teardown: close server and database pool', async () => {
    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
