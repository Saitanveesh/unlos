'use strict';

/** Transactional, single-instance SQLite persistence for the UNLOS application.
 * Each entity is stored as a keyed JSON document. SQLite provides atomic writes,
 * constraints and a portable database file without an external service.
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const entities = ['users', 'sessions', 'enrollments', 'completions', 'quizAttempts', 'courses'];
const keyFor = (kind, row, i) => {
  if (kind === 'users' || kind === 'courses') return row.id;
  if (kind === 'sessions') return row.tokenHash;
  if (kind === 'enrollments') return row.userId + ':' + row.courseId;
  if (kind === 'completions') return row.userId + ':' + row.lessonId;
  return String(i);
};

function createStore({ dbFile, dataFile, legacyFile, seedCourses } = {}) {
  const oldFile = path.resolve(legacyFile || dataFile || process.env.DATA_FILE || path.join(__dirname, '..', '.storage', 'unlos.json'));
  const filename = path.resolve(dbFile || process.env.DB_FILE || (dataFile ? oldFile.replace(/\.json$/i, '.sqlite') : path.join(__dirname, '..', '.storage', 'unlos.sqlite')));
  if (filename === oldFile) throw new Error('SQLite and legacy JSON storage must use separate paths.');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const sql = new DatabaseSync(filename);
  sql.exec(`PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS records (
      entity TEXT NOT NULL,
      record_key TEXT NOT NULL,
      subject TEXT,
      document TEXT NOT NULL,
      PRIMARY KEY (entity, record_key)
    );
    CREATE INDEX IF NOT EXISTS records_entity ON records(entity);
    CREATE UNIQUE INDEX IF NOT EXISTS unique_user_email ON records(subject) WHERE entity = 'users';
    CREATE UNIQUE INDEX IF NOT EXISTS unique_course_slug ON records(subject) WHERE entity = 'courses';`);
  const count = sql.prepare('SELECT COUNT(*) AS n FROM records').get().n;
  let data;
  if (count) {
    data = Object.fromEntries(entities.map(entity => [
      entity, sql.prepare('SELECT document FROM records WHERE entity = ? ORDER BY rowid')
        .all(entity).map(row => JSON.parse(row.document))
    ]));
  } else {
    try { data = JSON.parse(fs.readFileSync(oldFile, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') { sql.close(); throw error; }
      data = { users: [], sessions: [], enrollments: [], completions: [], quizAttempts: [], courses: structuredClone(seedCourses) };
    }
  }
  for (const entity of entities) {
    if (!Array.isArray(data[entity])) { sql.close(); throw new Error('Invalid stored data: ' + entity); }
  }
  const insert = sql.prepare('INSERT INTO records (entity, record_key, subject, document) VALUES (?, ?, ?, ?)');
  function save(next) {
    sql.exec('BEGIN IMMEDIATE');
    try {
      sql.exec('DELETE FROM records');
      for (const entity of entities) {
        next[entity].forEach((row, i) => {
          const subject = entity === 'users' ? row.email : entity === 'courses' ? row.slug : null;
          insert.run(entity, String(keyFor(entity, row, i)), subject, JSON.stringify(row));
        });
      }
      sql.exec('COMMIT');
    } catch (error) {
      sql.exec('ROLLBACK');
      throw error;
    }
  }
  if (!count) save(data);
  return { data, save, close: () => sql.close(), filename };
}
module.exports = { createStore };
