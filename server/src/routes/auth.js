import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const authSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }).transform((value) => value.trim().toLowerCase()),
  password: z
  .string()
  .min(10, {
    message: 'Password must be at least 10 characters long'
  })
  .regex(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter'
  })
  .regex(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter'
  })
  .regex(/[0-9]/, {
    message: 'Password must contain at least one number'
  })
  .regex(/[^A-Za-z0-9]/, {
    message: 'Password must contain at least one special character'
  })
});

const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtGetUserById = db.prepare('SELECT id, email FROM users WHERE id = ?');
const stmtInsertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, failed_login_count, locked_until)
  VALUES (?, ?, ?, 0, NULL)
`);
const stmtResetLoginState = db.prepare(`
  UPDATE users
  SET failed_login_count = 0, locked_until = NULL
  WHERE id = ?
`);
const stmtIncrementFailure = db.prepare(`
  UPDATE users
  SET failed_login_count = failed_login_count + 1,
      locked_until = CASE
        WHEN failed_login_count + 1 >= 5 THEN ?
        ELSE locked_until
      END
  WHERE id = ?
`);

function getSafeUser(userRow) {
  if (!userRow) {
    return null;
  }

  return {
    id: userRow.id,
    email: userRow.email
  };
}

router.post('/signup', async (req, res, next) => {
  try {
    const parseResult = authSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Invalid input data' });
    }

    const { email, password } = parseResult.data;
    const existingUser = stmtGetUserByEmail.get(email);

    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    stmtInsertUser.run(userId, email, passwordHash);

    req.session.userId = userId;

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: userId,
        email
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parseResult = authSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Invalid input data' });
    }

    const { email, password } = parseResult.data;
    const user = stmtGetUserByEmail.get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.locked_until && Number(user.locked_until) > Date.now()) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      const lockedUntil = Date.now() + 15 * 60 * 1000;
      stmtIncrementFailure.run(lockedUntil, user.id);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    stmtResetLoginState.run(user.id);
    req.session.userId = user.id;

    return res.json({
      message: 'Login successful',
      user: getSafeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res, next) => {
  const clearSession = () => {
    res.clearCookie('wellness.sid');
    res.json({ message: 'Logged out successfully' });
  };

  if (!req.session) {
    clearSession();
    return;
  }

  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    clearSession();
  });
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = stmtGetUserById.get(req.session.userId);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;