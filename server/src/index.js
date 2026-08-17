import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import checkinRouter from './routes/checkin.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5000;
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? null : 'dev-session-secret');
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && !sessionSecret) {
  throw new Error('SESSION_SECRET is required in production');
}

// Trust the Render proxy so secure cookies and client IPs behave correctly.
app.set('trust proxy', 0);

// Set up the API stack: security headers, JSON parsing, CORS, sessions, and rate limiting.
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(session({
  name: 'wellness.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// Lightweight health check for deployment probes and manual checks.
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Mount the auth and wellness check-in API routes.
app.use('/api/auth', authRouter);
app.use('/api/checkin', checkinRouter);

// Return a clear JSON response for unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Keep unexpected server errors from leaking stack traces to the client.
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the API server.
app.listen(port, () => {
  console.log(`Daily Wellness server listening on port ${port}`);
});