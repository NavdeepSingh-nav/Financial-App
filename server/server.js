require('dotenv').config();

// Validate required env vars before anything else
const REQUIRED = ['MONGO_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Set them in .env (local) or the Render dashboard (production).');
  process.exit(1);
}
if (process.env.ENCRYPTION_KEY.length !== 64) {
  console.error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const swaggerDocs = require('./docs/swagger');

const app = express();

connectDB();

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    // Return 403 instead of letting the error bubble to the 500 handler
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/financial', require('./routes/financial'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/passwords', require('./routes/passwords'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/docs', swaggerDocs.serve, swaggerDocs.setup);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[server error]', err.name, err.message);

  // MongoDB not yet connected / command buffer timed out (Render free-tier cold start).
  // MongooseError is the base class Mongoose uses for buffering timeouts;
  // the driver-level errors come in as MongoServerSelectionError / MongoNetworkError.
  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongooseError'
  ) {
    return res.status(503).json({
      message: 'Server is starting up — please try again in a few seconds.',
    });
  }

  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);

  // Keep Render free-tier alive — ping self every 14 min
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
      fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`).catch(() => {});
    }, 14 * 60 * 1000);
  }
});
