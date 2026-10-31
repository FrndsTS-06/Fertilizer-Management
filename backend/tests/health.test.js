const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');

test('Backend Initialization & Health Check Suite', async (t) => {
  let server;
  let baseUrl;

  // Setup: start an ephemeral HTTP server using the Express app
  await t.test('Setup: HTTP server starts on an ephemeral port', async () => {
    await new Promise((resolve, reject) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
      server.on('error', reject);
    });
    assert.ok(baseUrl, 'Base URL should be established');
  });

  // Test GET /api/health
  await t.test('GET /api/health returns 200 with required JSON format', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200, 'Status should be 200');
    assert.ok(
      res.headers.get('content-type')?.includes('application/json'),
      'Content-Type should be JSON'
    );

    const data = await res.json();
    assert.deepStrictEqual(data, {
      success: true,
      message: 'Fertilizer Management API is running',
    });
  });

  // Test 404 for unknown endpoint
  await t.test('GET /api/nonexistent-route returns 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-route`);
    assert.strictEqual(res.status, 404, 'Status should be 404');

    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(
      data.message && data.message.includes('Resource not found'),
      'Error message should indicate resource not found'
    );
  });

  // Teardown: close server cleanly
  await t.test('Teardown: HTTP server closes cleanly', async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
});
