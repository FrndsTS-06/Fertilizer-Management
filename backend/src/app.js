const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Trust reverse proxy (e.g. AWS ELB, Nginx, Cloudflare, Heroku)
app.set('trust proxy', 1);

// ==========================================
// 0. Force HTTPS & Baseline Security Headers
// ==========================================
app.disable('x-powered-by');

// Force HTTPS in production & apply HSTS
app.use((req, res, next) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isForwardedHttps = forwardedProto
    ? forwardedProto.split(',')[0].trim().toLowerCase() === 'https'
    : false;
  const isSecure = Boolean(req.secure || isForwardedHttps);

  if (config.isProduction) {
    // Strict HSTS with preload and includeSubDomains
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    if (!isSecure) {
      const host = req.headers.host || req.hostname;
      return res.redirect(301, `https://${host}${req.originalUrl || req.url}`);
    }
  }

  // Baseline hardening headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

// ==========================================
// 1. HTTP Request Logging (Sanitized)
// ==========================================
app.use(requestLogger);

// ==========================================
// 2. CORS Configuration
// ==========================================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (e.g. tests, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = config.cors.allowedOrigins;
    if (
      config.isDevelopment ||
      allowed.includes('*') ||
      allowed.includes(origin) ||
      origin.includes('onrender.com') ||
      /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// ==========================================
// 3. Body Parsing Middlewares
// ==========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// 4. Static Files & Crawler / SEO Routes
// ==========================================
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Explicit route handlers for robots.txt, robust.txt, and sitemap.xml
app.get(['/robots.txt', '/robust.txt'], (req, res) => {
  const robotsPath = path.join(publicDir, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    return res.type('text/plain').sendFile(robotsPath);
  }
  res.type('text/plain').send(
    `# Robots.txt for Fertilizer Shop Management System\n` +
    `User-agent: *\n` +
    `Allow: /\n` +
    `Allow: /privacy-policy\n` +
    `Allow: /terms-and-conditions\n` +
    `Disallow: /api/\n` +
    `Disallow: /backend/\n\n` +
    `# Host and Sitemap\n` +
    `Sitemap: https://fertilizershop.local/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    return res.type('application/xml').sendFile(sitemapPath);
  }
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/</loc>\n` +
    `    <lastmod>2026-11-16</lastmod>\n` +
    `    <changefreq>daily</changefreq>\n` +
    `    <priority>1.0</priority>\n` +
    `  </url>\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/dashboard</loc>\n` +
    `    <lastmod>2026-11-16</lastmod>\n` +
    `    <changefreq>daily</changefreq>\n` +
    `    <priority>0.9</priority>\n` +
    `  </url>\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/products-stock</loc>\n` +
    `    <lastmod>2026-11-16</lastmod>\n` +
    `    <changefreq>daily</changefreq>\n` +
    `    <priority>0.8</priority>\n` +
    `  </url>\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/purchase-sales</loc>\n` +
    `    <lastmod>2026-11-16</lastmod>\n` +
    `    <changefreq>daily</changefreq>\n` +
    `    <priority>0.8</priority>\n` +
    `  </url>\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/customer-details</loc>\n` +
    `    <lastmod>2026-11-16</lastmod>\n` +
    `    <changefreq>daily</changefreq>\n` +
    `    <priority>0.8</priority>\n` +
    `  </url>\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/reports</loc>\n` +
    `    <changefreq>weekly</changefreq>\n` +
    `    <priority>0.7</priority>\n` +
    `  </url>\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/privacy-policy</loc>\n` +
    `    <changefreq>monthly</changefreq>\n` +
    `    <priority>0.5</priority>\n` +
    `  </url>\n` +
    `  <url>\n` +
    `    <loc>https://fertilizershop.local/terms-and-conditions</loc>\n` +
    `    <changefreq>monthly</changefreq>\n` +
    `    <priority>0.5</priority>\n` +
    `  </url>\n` +
    `</urlset>`
  );
});

// ==========================================
// 5. API Routes & Versioning Conventions
// ==========================================
// Primary API router (matches frontend baseURL: http://localhost:5000/api)
app.use('/api', apiRoutes);

// Forward-compatible versioned route alias (/api/v1/...)
app.use('/api/v1', apiRoutes);

// Top-level /health route alias for orchestrators & container probes
app.use('/health', healthRoutes);

// ==========================================
// 6. 404 Not Found Handler
// ==========================================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// 7. Centralized Error-Handling Middleware
// ==========================================
app.use(errorHandler);

module.exports = app;
