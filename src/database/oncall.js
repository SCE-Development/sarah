const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(path.join(dbDir, 'oncall.sqlite'));

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS oncall_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL
  )`);
});

module.exports = {
  addOncallUser: (user, start_date, end_date) =>
    run(
      'INSERT INTO users (discord, start_date, end_date) VALUES (?, ?, ?)',
      [user, start_date, end_date]
    ),

  getOncallRotation: () => all('SELECT * FROM oncall_queue ORDER BY start_date ASC'),

  getNextOncall: async () => {
    const next = await get(
      'SELECT * FROM oncall_users ORDER BY start_date ASC LIMIT 1');
    if (next) {
      await run('DELETE FROM oncall_users WHERE id = ?', [next.id]);
    }
    return next;
  }
};
