import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateWellnessScore } from '../utils/score.js';

const router = express.Router();

// Apply requireAuth middleware to all check-in endpoints
router.use(requireAuth);

// Zod validation schemas
const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
  sleep_hours: z.number({ invalid_type_error: 'Sleep hours must be a number' })
    .min(0, { message: 'Sleep hours cannot be negative' })
    .max(24, { message: 'Sleep hours cannot exceed 24' }),
  mood: z.number({ invalid_type_error: 'Mood must be a number' })
    .int({ message: 'Mood must be an integer' })
    .min(1, { message: 'Mood must be between 1 and 10' })
    .max(10, { message: 'Mood must be between 1 and 10' }),
  energy: z.number({ invalid_type_error: 'Energy must be a number' })
    .int({ message: 'Energy must be an integer' })
    .min(1, { message: 'Energy must be between 1 and 10' })
    .max(10, { message: 'Energy must be between 1 and 10' })
});

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date format' });

// Prepared statements for SQLite operations
const stmtUpsertCheckin = db.prepare(`
  INSERT INTO checkins (id, user_id, date, sleep_hours, mood, energy, wellness_score, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(user_id, date) DO UPDATE SET
    sleep_hours = excluded.sleep_hours,
    mood = excluded.mood,
    energy = excluded.energy,
    wellness_score = excluded.wellness_score,
    updated_at = CURRENT_TIMESTAMP
`);

const stmtGetTodayCheckin = db.prepare(`
  SELECT * FROM checkins WHERE user_id = ? AND date = ?
`);

const stmtGetRangeCheckins = db.prepare(`
  SELECT * FROM checkins 
  WHERE user_id = ? AND date >= ? AND date <= ? 
  ORDER BY date ASC
`);

/**
 * Helper function to generate an array of YYYY-MM-DD strings for the 7 days ending on targetDateStr
 */
function get7DayDateRange(targetDateStr) {
  const dates = [];
  const targetDate = new Date(`${targetDateStr}T00:00:00Z`);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(targetDate);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * POST /api/checkin
 * Save or update daily wellness check-in (atomic upsert)
 */
router.post('/', (req, res, next) => {
  try {
    const parseResult = checkinSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid input data';
      return res.status(400).json({ error: firstError });
    }

    const { date, sleep_hours, mood, energy } = parseResult.data;

    // Reject future dates based on server date + 1 day threshold
    const now = new Date();
    const maxAllowedDateStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (date > maxAllowedDateStr) {
      return res.status(400).json({ error: 'Cannot record check-in for a future date' });
    }

    // Calculate wellness score using pure score function
    const wellness_score = calculateWellnessScore(sleep_hours, mood, energy);
    const userId = req.session.userId;
    const checkinId = crypto.randomUUID();

    // Execute atomic upsert query scoped to session userId
    stmtUpsertCheckin.run(
      checkinId,
      userId,
      date,
      sleep_hours,
      mood,
      energy,
      wellness_score
    );

    const updatedRecord = stmtGetTodayCheckin.get(userId, date);

    return res.status(200).json({
      message: 'Check-in saved successfully',
      checkin: updatedRecord
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/checkin/today
 * Retrieve today's check-in for logged-in user
 */
router.get('/today', (req, res, next) => {
  try {
    let targetDate = req.query.date;
    if (targetDate && !dateQuerySchema.safeParse(targetDate).success) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (!targetDate) {
      targetDate = new Date().toISOString().split('T')[0];
    }

    const userId = req.session.userId;
    const checkin = stmtGetTodayCheckin.get(userId, targetDate);

    return res.json({ checkin: checkin || null });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/checkin/last7days
 * Retrieve 7-day trend for logged-in user with missing days set to null
 */
router.get('/last7days', (req, res, next) => {
  try {
    let endDate = req.query.date;
    if (endDate && !dateQuerySchema.safeParse(endDate).success) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }

    const dateRange = get7DayDateRange(endDate);
    const startDate = dateRange[0];
    const userId = req.session.userId;

    // Fetch existing records in date range
    const records = stmtGetRangeCheckins.all(userId, startDate, endDate);
    const recordsMap = new Map(records.map((r) => [r.date, r]));

    // Build complete 7-day array, filling missing days with null values
    const trend = dateRange.map((date) => {
      const record = recordsMap.get(date);
      if (record) {
        return {
          date,
          has_data: true,
          sleep_hours: record.sleep_hours,
          mood: record.mood,
          energy: record.energy,
          wellness_score: record.wellness_score
        };
      } else {
        return {
          date,
          has_data: false,
          sleep_hours: null,
          mood: null,
          energy: null,
          wellness_score: null
        };
      }
    });

    return res.json({ trend });
  } catch (error) {
    next(error);
  }
});

export default router;
