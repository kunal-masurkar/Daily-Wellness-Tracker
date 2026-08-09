import { Store } from 'express-session';
import db from '../db.js';

// Table for session storage
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
`);

const stmtGet = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > ?');
const stmtSet = db.prepare('INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired');
const stmtDestroy = db.prepare('DELETE FROM sessions WHERE sid = ?');
const stmtTouch = db.prepare('UPDATE sessions SET expired = ? WHERE sid = ?');
const stmtCleanup = db.prepare('DELETE FROM sessions WHERE expired <= ?');

export class SQLiteStore extends Store {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl || 86400 * 7; // Default 7 days in seconds
    
    // Periodic cleanup of expired sessions every hour
    setInterval(() => {
      try {
        stmtCleanup.run(Date.now());
      } catch (err) {
        console.error('Session cleanup error:', err);
      }
    }, 3600000).unref();
  }

  get(sid, callback) {
    try {
      const row = stmtGet.get(sid, Date.now());
      if (!row) return callback(null, null);
      const session = JSON.parse(row.sess);
      callback(null, session);
    } catch (err) {
      callback(err);
    }
  }

  set(sid, session, callback) {
    try {
      const maxAge = session.cookie && session.cookie.maxAge ? session.cookie.maxAge : this.ttl * 1000;
      const expired = Date.now() + maxAge;
      const sessStr = JSON.stringify(session);
      stmtSet.run(sid, sessStr, expired);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      stmtDestroy.run(sid);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  touch(sid, session, callback) {
    try {
      const maxAge = session.cookie && session.cookie.maxAge ? session.cookie.maxAge : this.ttl * 1000;
      const expired = Date.now() + maxAge;
      stmtTouch.run(expired, sid);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}
