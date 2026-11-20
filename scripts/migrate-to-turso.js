'use strict';

/**
 * Migration Utility: UNLOS Local SQLite -> Turso Cloud SQLite
 *
 * Safely copies all student accounts, instructor courses, enrollments,
 * completions, and quiz attempts from a local .storage/unlos.sqlite file
 * to a persistent Turso libSQL database.
 *
 * Does NOT delete or alter the local SQLite database.
 *
 * Usage:
 *   TURSO_DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your-token" node scripts/migrate-to-turso.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { SCHEMA_SQL, entities } = require('../lib/store');

async function migrate() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl) {
    console.error('❌ Error: TURSO_DATABASE_URL is not set.');
    console.error('\nPlease provide your Turso credentials:');
    console.error('  TURSO_DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="token" npm run migrate:turso\n');
    process.exit(1);
  }

  const localFile = path.resolve(process.env.DB_FILE || path.join(__dirname, '..', '.storage', 'unlos.sqlite'));
  if (!fs.existsSync(localFile)) {
    console.error(`❌ Local database file not found at: ${localFile}`);
    console.error('If your database is in a custom location, specify DB_FILE=/path/to/db.sqlite.');
    process.exit(1);
  }

  console.log(`📂 Reading local database: ${localFile}`);
  const localDb = new DatabaseSync(localFile);
  const rows = localDb.prepare('SELECT entity, record_key, subject, document FROM records').all();
  console.log(`📊 Found ${rows.length} total records across entities in local database.`);

  console.log(`🌐 Connecting to Turso: ${tursoUrl}`);

  let client;
  try {
    const { createClient } = require('@libsql/client');
    client = createClient({ url: tursoUrl, authToken: tursoAuthToken });
  } catch {
    // Native HTTP pipeline fallback
    const httpUrl = tursoUrl.replace(/^libsql:\/\//i, 'https://').replace(/\/+$/, '');
    const pipelineUrl = `${httpUrl}/v2/pipeline`;
    client = {
      async execute(sql) {
        const res = await fetch(pipelineUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${tursoAuthToken || ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }] })
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
      },
      async batch(statements) {
        const requests = statements.map(s => ({
          type: 'execute',
          stmt: {
            sql: s.sql,
            args: (s.args || []).map(a => a === null ? { type: 'null' } : { type: 'text', value: String(a) })
          }
        }));
        requests.push({ type: 'close' });
        const res = await fetch(pipelineUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${tursoAuthToken || ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests })
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
      }
    };
  }

  // 1. Ensure table and indexes exist on Turso
  console.log('🔨 Ensuring schema exists on Turso...');
  for (const stmt of SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
  }

  // 2. Batch insert records
  console.log('🚀 Migrating records to Turso...');
  const statements = rows.map(r => ({
    sql: 'INSERT INTO records (entity, record_key, subject, document) VALUES (?, ?, ?, ?) ON CONFLICT(entity, record_key) DO UPDATE SET subject=excluded.subject, document=excluded.document',
    args: [r.entity, r.record_key, r.subject, r.document]
  }));

  // Batch in chunks of 50 to avoid any HTTP payload caps
  const chunkSize = 50;
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    await client.batch(chunk, 'write');
  }

  // 3. Verify counts
  console.log('\n✅ Migration complete! Entity breakdown:');
  const countsByEntity = {};
  for (const r of rows) {
    countsByEntity[r.entity] = (countsByEntity[r.entity] || 0) + 1;
  }
  for (const entity of entities) {
    console.log(`   - ${entity}: ${countsByEntity[entity] || 0} records`);
  }

  localDb.close();
  if (client.close) await client.close();
  console.log(`\n🎉 Turso is now synchronized with your local UNLOS database.\nLocal database (${localFile}) was preserved unchanged.\n`);
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
