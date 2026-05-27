const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./users.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      usage_count INTEGER DEFAULT 0,
      last_reset TEXT,
      is_pro INTEGER DEFAULT 0
    )
  `);
});

module.exports = db;
