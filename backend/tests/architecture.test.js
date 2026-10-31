const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');
const config = require('../src/config');
const logger = require('../src/utils/logger');
const {
  AppError,
  BadRequestError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
} = require('../src/utils/appError');
const validators = require('../src/validators');
const BaseRepository = require('../src/repositories/base.repository');
const healthService = require('../src/services/health.service');
const { closePool } = require('../src/config/db');

test('Phase 06 Architecture Regression Suite', async (t) => {
  let server;
  let baseUrl;

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
  });

  // 1. Centralized Configuration
  await t.test('Config module exports valid environment properties', () => {
    assert.ok(config.server.port > 0);
    assert.ok(config.cors.allowedOrigins.length > 0);
    assert.ok(config.db.database === 'fertilizer_management');
  });

  // 2. Sensitive Data Redaction in Logger
  await t.test('Logger sanitizes sensitive keys and authorization headers', () => {
    const rawPayload = {
      username: 'test_user',
      password: 'super_secret_password',
      token: 'jwt_sample_token',
      nested: {
        apiKey: 'secret_key_123',
        normalField: 'visible_data',
      },
      authHeader: 'Bearer eyJhbGciOi...',
    };

    const sanitized = logger.sanitize(rawPayload);
    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.token, '[REDACTED]');
    assert.strictEqual(sanitized.nested.apiKey, '[REDACTED]');
    assert.strictEqual(sanitized.nested.normalField, 'visible_data');
    assert.strictEqual(sanitized.authHeader, 'Bearer [REDACTED]');
  });

  // 3. Error Hierarchy
  await t.test('AppError classes have correct status codes and operational flags', () => {
    const notFound = new NotFoundError('Item missing');
    assert.strictEqual(notFound.statusCode, 404);
    assert.strictEqual(notFound.code, 'NOT_FOUND');
    assert.strictEqual(notFound.isOperational, true);

    const badReq = new BadRequestError('Bad input', ['field required']);
    assert.strictEqual(badReq.statusCode, 400);
    assert.strictEqual(badReq.details.length, 1);

    const unauth = new UnauthorizedError();
    assert.strictEqual(unauth.statusCode, 401);

    const valErr = new ValidationError('Failed', ['invalid phone']);
    assert.strictEqual(valErr.statusCode, 422);
    assert.strictEqual(valErr.code, 'VALIDATION_ERROR');
  });

  // 4. Request Validators
  await t.test('Validators correctly check formats without external dependencies', () => {
    assert.strictEqual(validators.isUUID('00000000-0000-0000-0000-000000000000'), true);
    assert.strictEqual(validators.isUUID('invalid-uuid'), false);

    assert.strictEqual(validators.isGSTIN('27ABCDE1234F1Z5'), true);
    assert.strictEqual(validators.isGSTIN('INVALID_GSTIN'), false);

    assert.strictEqual(validators.isEmail('test@example.com'), true);
    assert.strictEqual(validators.isEmail('invalid-email'), false);

    assert.strictEqual(validators.isPhone('9822012345'), true);
    assert.strictEqual(validators.isPhone('12345'), false);

    assert.strictEqual(validators.validatePagination({ page: '0', limit: '200' }).length, 2);
    assert.strictEqual(validators.validatePagination({ page: '1', limit: '20' }).length, 0);
  });

  // 5. Base Repository Transactions
  await t.test('BaseRepository supports transactional execution', async () => {
    const repo = new BaseRepository();
    const result = await repo.withTransaction(async (clientQuery) => {
      const res = await clientQuery('SELECT 1 + 1 AS sum;');
      return res.rows[0].sum;
    });
    assert.strictEqual(parseInt(result, 10), 2);
  });

  // 6. Health Service & Database Status
  await t.test('HealthService returns both API status and DB diagnostic status', async () => {
    const apiStatus = healthService.getApiStatus();
    assert.strictEqual(apiStatus.status, 'ok');

    const dbStatus = await healthService.getDatabaseStatus();
    assert.strictEqual(dbStatus.success, true);
    assert.strictEqual(dbStatus.database.status, 'connected');
    assert.strictEqual(dbStatus.database.name, 'fertilizer_management');
  });

  // 7. Route /api/health and /api/v1/health both work
  await t.test('GET /api/health and /api/v1/health return consistent responses', async () => {
    const resV1 = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(resV1.status, 200);
    const bodyV1 = await resV1.json();
    assert.strictEqual(bodyV1.success, true);
    assert.strictEqual(bodyV1.message, 'Fertilizer Management API is running');

    const resPrimary = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(resPrimary.status, 200);
    const bodyPrimary = await resPrimary.json();
    assert.deepStrictEqual(bodyV1, bodyPrimary);
  });

  // 8. Top-level /health route alias works
  await t.test('GET /health route alias returns 200', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // Teardown
  await t.test('Teardown: close server and database pool', async () => {
    await new Promise((resolve) => server.close(resolve));
    await closePool();
  });
});
