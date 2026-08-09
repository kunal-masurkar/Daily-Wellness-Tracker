import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import db from '../db.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Input validation schemas
const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }),
  password: z.string().min(10, { message: 'Password must be at least 10 characters long' })
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
});

// Prepared statements
const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtGetUserById = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
const stmtCreateUser = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
const stmtUpdateFailedLogin = db.prepare('UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?');
const stmtResetFailedLogin = db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?');

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req, res, next) => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors[0]?.message || 'Invalid registration input';
      return res.status(400).json({ error: errorMsg });
    }

    const { email, password } = parseResult.data;

    // Check if email already registered
    const existingUser = stmtGetUserByEmail.get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password with cost factor 10
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // Insert user into SQLite database
    stmtCreateUser.run(userId, email, passwordHash);

    // Create session & log in immediately
    req.session.userId = userId;
    req.session.email = email;

    return res.status(201).json({
      message: 'Account created successfully',
      user: { id: userId, email }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with rate limiting & account lockout
 */
router.post('/login', loginRateLimiter, async (req, res, next) => {
  const genericError = 'Invalid email or password';

  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(401).json({ error: genericError });
    }

    const { email, password } = parseResult.data;

    // Fetch user from database
    const user = stmtGetUserByEmail.get(email);
    if (!user) {
      // Return generic error without revealing user existence
      return res.status(401).json({ error: genericError });
    }

    // Check if account is currently locked
    const now = Date.now();
    if (user.locked_until && user.locked_until > now) {
      return res.status(423).json({ error: 'Too many attempts. Try again later.' });
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      const newFailedCount = (user.failed_login_count || 0) + 1;
      let newLockedUntil = null;

      // Lock account for 15 minutes after 5 consecutive failures
      if (newFailedCount >= 5) {
        newLockedUntil = now + 15 * 60 * 1000;
      }

      stmtUpdateFailedLogin.run(newFailedCount, newLockedUntil, user.id);
      return res.status(401).json({ error: genericError });
    }

    // Reset failed login counter on success
    stmtResetFailedLogin.run(user.id);

    // Initialize session
    req.session.userId = user.id;
    req.session.email = user.email;

    return res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Destroy user session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully' });
  });
});

/**
 * GET /api/auth/me
 * Check active session and return current user
 */
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = stmtGetUserById.get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ user });
});

export default router;
