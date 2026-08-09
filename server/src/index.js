import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { SQLiteStore } from './utils/sessionStore.js';
import { generalRateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.js';
import checkinRoutes from './routes/checkin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust first proxy (required for Render / reverse proxy setups)
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for easy local dev / external script loading if needed
}));

// Restricted CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || !isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser with size limit
app.use(express.json({ limit: '100kb' }));

// Express session setup with SQLite session store
app.use(session({
  store: new SQLiteStore({ ttl: 7 * 24 * 60 * 60 }), // 7 days TTL
  secret: process.env.SESSION_SECRET || 'dev_secret_wellness_tracker_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// General rate limiter on all API routes
app.use('/api/', generalRateLimiter);

// API route mounts
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);

// Serve client static assets in production
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const status = err.status || 500;
  const message = isProduction ? 'An unexpected server error occurred' : err.message;
  res.status(status).json({ error: message });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
});
