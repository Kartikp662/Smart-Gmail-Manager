const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'app.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 google_id TEXT NOT NULL UNIQUE,
 email TEXT NOT NULL,
 name TEXT,
 picture TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tokens (
 user_id INTEGER PRIMARY KEY,
 access_token TEXT, refresh_token TEXT, scope TEXT, token_type TEXT, expiry_date INTEGER,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rules (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 field TEXT NOT NULL, match_type TEXT NOT NULL, value TEXT,
 action TEXT NOT NULL, label_name TEXT, is_active INTEGER DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS protected_senders (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 sender TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id, sender),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS protected_messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 gmail_message_id TEXT NOT NULL,
 sender TEXT,
 subject TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id, gmail_message_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS action_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 gmail_message_id TEXT NOT NULL, rule_id INTEGER, action TEXT NOT NULL,
 previous_label_ids TEXT, subject TEXT, sender TEXT, restored INTEGER DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);
// Safe migration from the original single-user database: legacy records are not assigned to a new user.
module.exports = db;
