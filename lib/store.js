'use strict';

/**
 * Transactional persistence layer for the UNLOS application.
 *
 * Supports two storage engines:
 * 1. Cloud Persistent SQLite (Turso / libSQL): Activated when TURSO_DATABASE_URL is set.
 *    Provides durable cross-region cloud storage that persists student accounts,
 *    course enrollments, and quiz progress across Vercel serverless cold starts.
 * 2. Embedded SQLite (node:sqlite / DatabaseSync): Zero-dependency local persistence.
 *    Used for local development, automated tests, and Docker.
 *    On Vercel without Turso credentials, falls back to os.tmpdir() (/tmp).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const entities = ['users', 'sessions', 'enrollments', 'completions', 'quizAttempts', 'courses'];

const keyFor = (kind, row, i) => {
  if (kind === 'users' || kind === 'courses') return row.id;
  if (kind === 'sessions') return row.tokenHash;
  if (kind === 'enrollments') return row.userId + ':' + row.courseId;
  if (kind === 'completions') return row.userId + ':' + row.lessonId;
  return String(i);
};

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS records (
    entity TEXT NOT NULL,
    record_key TEXT NOT NULL,
    subject TEXT,
    document TEXT NOT NULL,
    PRIMARY KEY (entity, record_key)
  );
  CREATE INDEX IF NOT EXISTS records_entity ON records(entity);
  CREATE UNIQUE INDEX IF NOT EXISTS unique_user_email ON records(subject) WHERE entity = 'users';
  CREATE UNIQUE INDEX IF NOT EXISTS unique_course_slug ON records(subject) WHERE entity = 'courses';
`;

/**
 * Lightweight HTTP client for Turso / libSQL over native fetch.
 * Used when @libsql/client is not installed or in minimal serverless environments.
 */
function createHttpLibsqlClient(url, authToken) {
  const httpUrl = url.replace(/^libsql:\/\//i, 'https://').replace(/\/+$/, '');
  const pipelineUrl = `${httpUrl}/v2/pipeline`;

  async function executePipeline(statements) {
    const requests = statements.map(stmt => {
      const sql = typeof stmt === 'string' ? stmt : stmt.sql;
      const rawArgs = typeof stmt === 'object' && Array.isArray(stmt.args) ? stmt.args : [];
      const args = rawArgs.map(arg => {
        if (arg === null || arg === undefined) return { type: 'null' };
        if (typeof arg === 'number') {
          return Number.isInteger(arg) ? { type: 'integer', value: String(arg) } : { type: 'float', value: arg };
        }
        return { type: 'text', value: String(arg) };
      });
      return { type: 'execute', stmt: { sql, args } };
    });
    requests.push({ type: 'close' });

    const res = await fetch(pipelineUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Turso HTTP pipeline failed (${res.status}): ${text}`);
    }

    const body = await res.json();
    return (body.results || []).map(r => {
      if (r.type === 'error') throw new Error(r.error?.message || 'Turso statement execution error');
      const resData = r.response?.result;
      if (!resData) return { rows: [] };
      const cols = (resData.cols || []).map(c => c.name);
      const rows = (resData.rows || []).map(row => {
        const obj = {};
        cols.forEach((col, i) => {
          const val = row[i];
          obj[col] = val && typeof val === 'object' && 'value' in val ? val.value : val;
        });
        return obj;
      });
      return { rows };
    });
  }

  return {
    async execute(stmt) {
      const sql = typeof stmt === 'string' ? stmt : stmt.sql;
      const parts = sql.split(';').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        const results = await executePipeline(parts.map(p => ({ sql: p, args: [] })));
        return results[results.length - 1] || { rows: [] };
      }
      const results = await executePipeline([stmt]);
      return results[0] || { rows: [] };
    },
    async batch(statements) {
      return executePipeline(statements);
    },
    async close() {
      /* Stateless HTTP connection requires no cleanup */
    }
  };
}

/**
 * Creates a client for Turso / libSQL. Prefers @libsql/client/web (pure JS/fetch)
 * for serverless compatibility, falling back to @libsql/client or native HTTP.
 */
function getLibsqlClient(url, authToken) {
  try {
    const { createClient } = require('@libsql/client/web');
    return createClient({ url, authToken });
  } catch {
    try {
      const { createClient } = require('@libsql/client');
      return createClient({ url, authToken });
    } catch {
      return createHttpLibsqlClient(url, authToken);
    }
  }
}

/**
 * Turso / libSQL Store Implementation
 */
function createTursoStore({ tursoUrl, tursoAuthToken, seedCourses } = {}) {
  const client = getLibsqlClient(tursoUrl, tursoAuthToken);
  let data = {
    users: [],
    sessions: [],
    enrollments: [],
    completions: [],
    quizAttempts: [],
    courses: structuredClone(seedCourses || [])
  };

  async function sync() {
    const result = await client.execute('SELECT entity, document FROM records ORDER BY rowid');
    const fresh = Object.fromEntries(entities.map(e => [e, []]));
    for (const row of result.rows) {
      if (fresh[row.entity]) {
        try {
          fresh[row.entity].push(JSON.parse(row.document));
        } catch { /* skip corrupted record */ }
      }
    }
    data = fresh;
    return data;
  }

  async function save(next) {
    const statements = [{ sql: 'DELETE FROM records', args: [] }];
    for (const entity of entities) {
      (next[entity] || []).forEach((row, i) => {
        const subject = entity === 'users' ? row.email : entity === 'courses' ? row.slug : null;
        statements.push({
          sql: 'INSERT INTO records (entity, record_key, subject, document) VALUES (?, ?, ?, ?)',
          args: [entity, String(keyFor(entity, row, i)), subject, JSON.stringify(row)]
        });
      });
    }
    await client.batch(statements, 'write');
    data = next;
  }

  const ready = (async () => {
    // Initialize schema statement by statement for HTTP and serverless compatibility
    for (const stmt of SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean)) {
      await client.execute(stmt);
    }
    const countRes = await client.execute('SELECT COUNT(*) AS n FROM records');
    const firstRow = countRes.rows?.[0];
    const count = Number(firstRow?.n ?? firstRow?.[0] ?? 0);

    if (count > 0) {
      await sync();
    } else {
      await save(data);
    }
  })();

  return {
    type: 'turso',
    get data() { return data; },
    set data(val) { data = val; },
    ready,
    init: async () => { await ready; return data; },
    sync,
    save,
    close: async () => { if (client.close) await client.close(); },
    filename: tursoUrl
  };
}

/**
 * Native Node.js SQLite Store Implementation (node:sqlite)
 */
function createSqliteStore({ dbFile, dataFile, legacyFile, seedCourses } = {}) {
  const { DatabaseSync } = require('node:sqlite');
  const oldFile = path.resolve(legacyFile || dataFile || process.env.DATA_FILE || path.join(__dirname, '..', '.storage', 'unlos.json'));

  // If running in Vercel serverless without an explicit DB_FILE, use os.tmpdir() (/tmp)
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  let defaultDbPath;
  if (isVercel) {
    defaultDbPath = path.join(os.tmpdir(), 'unlos.sqlite');
    console.warn('[UNLOS] Notice: Running with ephemeral /tmp SQLite storage. For persistent student accounts and progress across serverless cold starts, configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  } else {
    defaultDbPath = path.join(__dirname, '..', '.storage', 'unlos.sqlite');
  }

  const filename = path.resolve(dbFile || process.env.DB_FILE || (dataFile ? oldFile.replace(/\.json$/i, '.sqlite') : defaultDbPath));
  if (filename === oldFile) throw new Error('SQLite and legacy JSON storage must use separate paths.');

  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const sql = new DatabaseSync(filename);
  sql.exec(`PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    ${SCHEMA_SQL}`);

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

  return {
    type: 'sqlite',
    data,
    ready: Promise.resolve(data),
    init: async () => data,
    save,
    close: () => sql.close(),
    filename
  };
}

/**
 * Universal Store Factory
 * Routes to Turso store if TURSO_DATABASE_URL is set, otherwise to native SQLite.
 *
 * Production Guardrail:
 * When running in a Vercel serverless environment (VERCEL=1 or AWS_LAMBDA_FUNCTION_NAME)
 * in production (NODE_ENV=production), TURSO_DATABASE_URL is strictly required to prevent
 * silent data loss from ephemeral /tmp storage.
 */
function createStore(opts = {}) {
  const tursoUrl = opts.tursoUrl || opts.tursoDatabaseUrl || process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = opts.tursoAuthToken || process.env.TURSO_AUTH_TOKEN;

  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const allowEphemeral = Boolean(process.env.ALLOW_EPHEMERAL_STORAGE || opts.allowEphemeralStorage);

  if (isVercel && isProduction && !tursoUrl && !allowEphemeral) {
    throw new Error(
      '[UNLOS] Fatal Database Configuration Error: Running in production on Vercel without persistent cloud storage.\n' +
      'Ephemeral /tmp SQLite storage is disabled in production to protect student accounts and progress from data loss.\n\n' +
      'Required Environment Variables:\n' +
      '  - TURSO_DATABASE_URL (e.g., libsql://your-database-name.turso.io)\n' +
      '  - TURSO_AUTH_TOKEN   (your Turso database authorization token)\n\n' +
      'Configure these in: Vercel Dashboard -> Project Settings -> Environment Variables.\n' +
      '(To explicitly allow ephemeral /tmp storage for throwaway testing, set ALLOW_EPHEMERAL_STORAGE=1).'
    );
  }

  if (tursoUrl) {
    return createTursoStore({ ...opts, tursoUrl, tursoAuthToken });
  }
  return createSqliteStore(opts);
}

module.exports = { createStore, entities, keyFor, SCHEMA_SQL };
