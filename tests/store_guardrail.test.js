'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { createStore } = require('../lib/store');

test('Store Production Guardrail & Environment Behavior', async t => {
  const origEnv = { ...process.env };

  t.afterEach(() => {
    // Restore environment after each subtest
    for (const key of ['VERCEL', 'AWS_LAMBDA_FUNCTION_NAME', 'NODE_ENV', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ALLOW_EPHEMERAL_STORAGE', 'DB_FILE']) {
      if (origEnv[key] !== undefined) {
        process.env[key] = origEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  await t.test('Local development mode initializes embedded SQLite store', () => {
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    delete process.env.TURSO_DATABASE_URL;
    process.env.NODE_ENV = 'development';

    const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'unlos-guardrail-'));
    const tempDb = path.join(tempFolder, 'test.sqlite');

    try {
      const store = createStore({ dbFile: tempDb, seedCourses: [] });
      assert.equal(store.type, 'sqlite');
      assert.ok(Array.isArray(store.data.courses));
      store.close();
    } finally {
      fs.rmSync(tempFolder, { recursive: true, force: true });
    }
  });

  await t.test('Vercel production mode throws error when TURSO_DATABASE_URL is missing', () => {
    process.env.VERCEL = '1';
    process.env.NODE_ENV = 'production';
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.ALLOW_EPHEMERAL_STORAGE;

    assert.throws(
      () => createStore({ seedCourses: [] }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Fatal Database Configuration Error/);
        assert.match(err.message, /TURSO_DATABASE_URL/);
        assert.match(err.message, /TURSO_AUTH_TOKEN/);
        return true;
      }
    );
  });

  await t.test('Vercel production mode allows Turso store when TURSO_DATABASE_URL is set', async () => {
    process.env.VERCEL = '1';
    process.env.NODE_ENV = 'production';
    process.env.TURSO_DATABASE_URL = 'libsql://dummy-db.turso.io';
    process.env.TURSO_AUTH_TOKEN = 'dummy-token';

    const store = createStore({ seedCourses: [] });
    assert.equal(store.type, 'turso');
    // Catch dummy network resolution error for offline test
    await store.ready.catch(() => {});
    await store.close();
  });

  await t.test('Vercel production mode allows explicit ephemeral override when configured', () => {
    process.env.VERCEL = '1';
    process.env.NODE_ENV = 'production';
    delete process.env.TURSO_DATABASE_URL;
    process.env.ALLOW_EPHEMERAL_STORAGE = '1';

    const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'unlos-ephemeral-'));
    const tempDb = path.join(tempFolder, 'ephemeral.sqlite');

    try {
      const store = createStore({ dbFile: tempDb, seedCourses: [] });
      assert.equal(store.type, 'sqlite');
      store.close();
    } finally {
      fs.rmSync(tempFolder, { recursive: true, force: true });
    }
  });
});
