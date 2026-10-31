const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const { pool, checkConnection, closePool } = require('../src/config/db');

test('PostgreSQL Connection & Diagnostics Suite', async (t) => {
  let server;
  let baseUrl;

  // Setup: start HTTP test server
  await t.test('Setup: HTTP server starts on an ephemeral port', async () => {
    await new Promise((resolve, reject) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
      server.on('error', reject);
    });
    assert.ok(baseUrl, 'Base URL should be established');
  });

  // Test direct pool checkConnection
  await t.test('Direct checkConnection() executes read-only query successfully', async () => {
    const result = await checkConnection();
    assert.strictEqual(result.success, true, 'checkConnection should succeed');
    assert.strictEqual(result.database.status, 'connected');
    assert.strictEqual(result.database.name, 'fertilizer_management');
    assert.ok(
      result.database.version.includes('PostgreSQL 18.6'),
      `Expected PostgreSQL 18.6, received ${result.database.version}`
    );
    assert.strictEqual(result.database.user, 'postgres');
    assert.ok(result.database.serverTime);
    assert.strictEqual(result.database.password, undefined, 'Password must never be exposed');
  });

  // Test GET /api/health/db endpoint
  await t.test('GET /api/health/db returns 200 with sanitized database diagnostics', async () => {
    const res = await fetch(`${baseUrl}/api/health/db`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.database.status, 'connected');
    assert.strictEqual(body.database.name, 'fertilizer_management');
    assert.ok(body.database.version.includes('PostgreSQL 18.6'));
    // Ensure no password or sensitive credentials leaked
    const bodyStr = JSON.stringify(body);
    assert.strictEqual(bodyStr.includes('password'), false, 'Credentials must never be present in response');
  });

  // Test GET /api/health remains fast and lightweight
  await t.test('GET /api/health remains functional independently of database status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Fertilizer Management API is running');
  });

  // Teardown: close HTTP server and database pool
  await t.test('Teardown: HTTP server and database pool close cleanly', async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    await closePool();
  });
});

