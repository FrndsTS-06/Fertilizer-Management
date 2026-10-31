const express = require('express');
const cors = require('cors');
const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

// ==========================================
// 0. Baseline Security Headers & Hardening
// ==========================================
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
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
    if (allowed.includes('*') || allowed.includes(origin)) {
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
// 4. API Routes & Versioning Conventions
// ==========================================
// Primary API router (matches frontend baseURL: http://localhost:5000/api)
app.use('/api', apiRoutes);

// Forward-compatible versioned route alias (/api/v1/...)
app.use('/api/v1', apiRoutes);

// Top-level /health route alias for orchestrators & container probes
app.use('/health', healthRoutes);

// ==========================================
// 5. 404 Not Found Handler
// ==========================================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// 6. Centralized Error-Handling Middleware
// ==========================================
app.use(errorHandler);

module.exports = app;
