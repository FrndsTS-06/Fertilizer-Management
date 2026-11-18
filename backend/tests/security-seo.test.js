const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const config = require('../src/config');
const app = require('../src/app');

test('Security & SEO Suite: HTTPS Redirection, HSTS & Crawler Routes', async (t) => {
  let server;
  let baseUrl;

  await t.test('Setup: Start ephemeral test server', async () => {
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

  // 1. Baseline Security Headers in non-production
  await t.test('Baseline security headers are present on normal responses', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(res.headers.get('x-xss-protection'), '1; mode=block');
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  // 2. Crawler routes: GET /robots.txt
  await t.test('GET /robots.txt serves plain text crawler directives', async () => {
    const res = await fetch(`${baseUrl}/robots.txt`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/plain'), 'Content-Type should be text/plain');
    const text = await res.text();
    assert.ok(text.includes('User-agent: *'), 'Should specify User-agent: *');
    assert.ok(text.includes('Disallow: /api/'), 'Should disallow /api/');
    assert.ok(text.includes('Sitemap:'), 'Should reference sitemap.xml');
  });

  // 3. Crawler routes: GET /sitemap.xml
  await t.test('GET /sitemap.xml serves valid sitemap XML', async () => {
    const res = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(res.status, 200);
    assert.ok(
      res.headers.get('content-type')?.includes('xml'),
      'Content-Type should be xml'
    );
    const xml = await res.text();
    assert.ok(xml.includes('<urlset'), 'Should contain <urlset>');
    assert.ok(xml.includes('https://fertilizershop.local/'), 'Should contain base URL');
  });

  // 4. Force HTTPS & HSTS behavior in production simulation
  await t.test('Production HTTPS redirection and strict HSTS behavior', async () => {
    const originalIsProduction = config.isProduction;
    config.isProduction = true;

    try {
      // Insecure request (HTTP without forwarded proto) -> 301 redirect
      const redirectRes = await fetch(`${baseUrl}/health`, {
        redirect: 'manual',
      });
      assert.strictEqual(redirectRes.status, 301);
      assert.ok(redirectRes.headers.get('location')?.startsWith('https://'));
      assert.strictEqual(
        redirectRes.headers.get('strict-transport-security'),
        'max-age=31536000; includeSubDomains; preload'
      );

      // Secure request (with X-Forwarded-Proto: https) -> 200 OK + HSTS
      const secureRes = await fetch(`${baseUrl}/health`, {
        headers: {
          'x-forwarded-proto': 'https',
        },
      });
      assert.strictEqual(secureRes.status, 200);
      assert.strictEqual(
        secureRes.headers.get('strict-transport-security'),
        'max-age=31536000; includeSubDomains; preload'
      );
    } finally {
      config.isProduction = originalIsProduction;
    }
  });

  // Teardown
  await t.test('Teardown: Close test server', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
