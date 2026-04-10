const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(path.join(dbDir, 'qotd.sqlite'));

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
  db.run(`CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    added_by TEXT NOT NULL,
    priority INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS past_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    added_by TEXT NOT NULL,
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = {
  addQuestion: (q, user, isPriority) =>
    run(
      'INSERT INTO queue (question, added_by, priority) VALUES (?, ?, ?)',
      [q, user, isPriority ? 1 : 0]),

  getQueue: () => all('SELECT * FROM queue ORDER BY priority DESC, id ASC'),

  getPast: () => all(
    'SELECT * FROM past_questions ORDER BY posted_at DESC LIMIT 10'),

  removeQuestion: (id) => run('DELETE FROM queue WHERE id = ?', [id]),

  popNext: async () => {
    const next = await get(
      'SELECT * FROM queue ORDER BY priority DESC, id ASC LIMIT 1');
    if (next) {
      await run('INSERT INTO past_questions (question, added_by) VALUES (?, ?)',
        [next.question, next.added_by]);
      await run('DELETE FROM queue WHERE id = ?', [next.id]);
    }
    return next;
  }
};
