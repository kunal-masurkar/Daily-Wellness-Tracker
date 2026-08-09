import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../wellness.db');

// Initialize WebAssembly SQLite
const SQL = await initSqlJs();

let dbInstance;
if (fs.existsSync(dbPath)) {
  const fileBuffer = fs.readFileSync(dbPath);
  dbInstance = new SQL.Database(fileBuffer);
} else {
  dbInstance = new SQL.Database();
}

/**
 * Save current SQLite database state to disk
 */
export function saveDbToDisk() {
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

// Initialize database schema
dbInstance.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    failed_login_count INTEGER DEFAULT 0,
    locked_until INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    sleep_hours REAL NOT NULL,
    mood INTEGER NOT NULL,
    energy INTEGER NOT NULL,
    wellness_score REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

saveDbToDisk();

/**
 * DB helper wrapper providing cleaner parameterized SQL methods
 */
const db = {
  exec(sql) {
    dbInstance.run(sql);
    saveDbToDisk();
  },
  prepare(sql) {
    return {
      run(...params) {
        dbInstance.run(sql, params);
        saveDbToDisk();
      },
      get(...params) {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },
      all(...params) {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }
};

export default db;
