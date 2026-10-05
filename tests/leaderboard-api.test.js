import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createWorker, SCHEMA_SQL } from '../server/worker.js';
import { PLANTS } from '../src/plants.js';

// This adapter runs the worker's real prepared SQL and transactions in SQLite.
// It mimics D1's transport shapes rather than mocking individual query results.
function memoryD1() {
  const sqlite = new DatabaseSync(':memory:');
  const binding = {
    sqlite,
    batches: 0,
    prepare(sql) {
      function statement(parameters = []) {
        return {
          bind(...values) { return statement(values); },
          async first() { return sqlite.prepare(sql).get(...parameters) || null; },
          async run() { return this.execute(); },
          execute() {
            const query = sqlite.prepare(sql);
            if (query.columns().length) return { success: true, results: query.all(...parameters), meta: { changes: 0 } };
            const result = query.run(...parameters);
            return { success: true, results: [], meta: { changes: Number(result.changes) } };
          },
        };
      }
      return statement();
    },
    async batch(statements) {
      binding.batches++;
      sqlite.exec('BEGIN');
      try {
        const results = statements.map((statement) => statement.execute());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return binding;
}

function fixture(t, options = {}) {
  const db = memoryD1();
  t.after(() => db.sqlite.close());
  const worker = createWorker(options);
  const env = { LEADERBOARD_DB: db, ASSETS: { fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`) } };
  const request = (path, { method = 'GET', body, cookie, headers = {} } = {}) => {
    const requestHeaders = new Headers(headers);
    if (body !== undefined && !requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json');
    if (cookie) requestHeaders.set('Cookie', cookie);
    return worker.fetch(new Request(`https://wnam.pages.dev${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    }), env);
  };
  const create = async (name = 'Alex', headers = {}) => {
    const response = await request('/api/profile', { method: 'POST', body: { name }, headers });
    const data = await response.json();
    return { response, ...data, cookie: response.headers.get('Set-Cookie')?.split(';')[0] };
  };
  return { db, worker, env, request, create };
}

const score = (plantsGrown = 3, correctAnswers = plantsGrown * 3, uniquePlants = Math.min(10, plantsGrown), highestLevel = 1) => ({ plantsGrown, correctAnswers, uniquePlants, highestLevel });

function seed(db, id, counters) {
  db.sqlite.prepare(`INSERT INTO guest_profiles
    (id, name, name_key, tag, token_hash, plants_grown, correct_answers, unique_plants, highest_level, created_at, updated_at)
    VALUES (?, ?, ?, '0001', ?, ?, ?, ?, ?, 0, 0)`)
    .run(id, `Player ${id}`, `player ${id}`, `seed-hash-${id}`, counters.plantsGrown, counters.correctAnswers, counters.uniquePlants, counters.highestLevel);
}

function seedDiscoveries(db, profileId, plantIds) {
  const statement = db.sqlite.prepare('INSERT INTO guest_plant_discoveries (profile_id, plant_id) VALUES (?, ?)');
  for (const id of plantIds) statement.run(profileId, id);
}

function controlledTags(...tags) {
  let index = 0;
  return {
    subtle: globalThis.crypto.subtle,
    randomUUID: () => globalThis.crypto.randomUUID(),
    getRandomValues(array) {
      if (array instanceof Uint32Array) { array[0] = tags[Math.min(index++, tags.length - 1)]; return array; }
      return globalThis.crypto.getRandomValues(array);
    },
  };
}

test('the checked-in schema matches bootstrap and bootstrap runs once per binding', async (t) => {
  assert.equal(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8').trim(), SCHEMA_SQL.trim());
  const { request, db } = fixture(t);
  const responses = await Promise.all([request('/api/profile'), request('/api/profile')]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(db.batches, 1);
  db.sqlite.exec(SCHEMA_SQL);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM guest_profiles').get().count, 0);
});

test('an existing database gains discovery storage without erasing profiles or progress', async (t) => {
  const { request, db } = fixture(t);
  const legacySchema = SCHEMA_SQL.replace(/CREATE TABLE IF NOT EXISTS guest_plant_discoveries[\s\S]*?;\n/, '');
  assert.ok(!legacySchema.includes('guest_plant_discoveries'));
  db.sqlite.exec(legacySchema);
  seed(db, 'legacy-player', score(24, 80, 8, 7));
  const previous = { ...db.sqlite.prepare('SELECT * FROM guest_profiles').get() };
  const board = await (await request('/api/leaderboard')).json();
  assert.deepEqual({ ...db.sqlite.prepare('SELECT * FROM guest_profiles').get() }, previous);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM guest_plant_discoveries').get().count, 0);
  assert.equal(board.entries[0].collectionScore, 0);
  assert.equal(board.entries[0].plantsGrown, 24);
});

test('non-API routes still use Pages assets even without a database binding', async (t) => {
  const { worker, env } = fixture(t);
  delete env.LEADERBOARD_DB;
  const response = await worker.fetch(new Request('https://wnam.pages.dev/modules/differentiation'), env);
  assert.equal(await response.text(), 'asset:/modules/differentiation');
});

test('anonymous profile is null and API responses cannot be cached or read through CORS', async (t) => {
  const { request } = fixture(t);
  const response = await request('/api/profile');
  assert.deepEqual(await response.json(), { profile: null });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(response.headers.get('Set-Cookie'), null);
});

test('creating a Unicode guest stores only a token hash and sets a persistent protected cookie', async (t) => {
  const { create, request, db } = fixture(t, { now: () => 12345 });
  const guest = await create("  Élodie   O'Neil  ");
  assert.equal(guest.response.status, 201);
  assert.equal(guest.profile.name, "Élodie O'Neil");
  assert.match(guest.profile.tag, /^\d{4}$/);
  assert.deepEqual(Object.keys(guest.profile).sort(), ['id', 'name', 'tag']);
  const cookie = guest.response.headers.get('Set-Cookie');
  assert.match(cookie, /^__Host-wnam_guest=[a-f0-9]{64};/);
  for (const flag of ['Path=/', 'Max-Age=31536000', 'HttpOnly', 'Secure', 'SameSite=Lax']) assert.ok(cookie.includes(flag));
  const token = guest.cookie.split('=')[1];
  const row = db.sqlite.prepare('SELECT * FROM guest_profiles').get();
  assert.match(row.token_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(row.token_hash, token);
  assert.ok(!JSON.stringify(row).includes(token));
  assert.equal(row.created_at, 12345);
  const restored = await request('/api/profile', { cookie: guest.cookie });
  assert.deepEqual(await restored.json(), { profile: guest.profile });
});

test('POST with an authenticated cookie returns the existing profile without renaming or duplication', async (t) => {
  const { create, request, db } = fixture(t);
  const guest = await create('Original');
  const response = await request('/api/profile', { method: 'POST', cookie: guest.cookie, body: { name: 'Different' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { profile: guest.profile });
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM guest_profiles').get().count, 1);
});

test('case-insensitive name/tag collisions retry atomically and tags include leading zeroes', async (t) => {
  const { create, db } = fixture(t, { cryptoImpl: controlledTags(7, 7, 8) });
  const first = await create('ALEx');
  const second = await create('alex');
  assert.equal(first.profile.tag, '0007');
  assert.equal(second.profile.tag, '0008');
  assert.notEqual(first.profile.id, second.profile.id);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM guest_profiles WHERE name_key = ?').get('alex').count, 2);
});

test('repeated tag collisions fail cleanly without a partial profile or leaked cookie', async (t) => {
  const { create, db } = fixture(t, { cryptoImpl: controlledTags(42) });
  assert.equal((await create('Same')).response.status, 201);
  const second = await create('SAME');
  assert.equal(second.response.status, 409);
  assert.equal(second.cookie, undefined);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM guest_profiles').get().count, 1);
});

test('names reject markup, controls, invisible overrides, empty names, and excessive length', async (t) => {
  const { create } = fixture(t);
  for (const name of ['', '   ', '<img src=x>', 'Line\nBreak', 'Tab\tName', 'Bidi\u202EName', 'x'.repeat(25), '😀', null, 123, '---']) {
    const response = (await create(name)).response;
    assert.equal(response.status, 400, String(name));
  }
  for (const name of ['Zoë', '王 小明', 'A_B-2.0', 'O’Neil', "'OR TRUE--"]) {
    assert.equal((await create(name)).response.status, 201, name);
  }
});

test('JSON requests are size-limited and invalid request shapes get specific errors', async (t) => {
  const { request } = fixture(t);
  for (const body of ['{', 'null', '[]', '3']) {
    assert.equal((await request('/api/profile', { method: 'POST', body })).status, 400);
  }
  assert.equal((await request('/api/profile', { method: 'POST', body: { name: 'A' }, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await request('/api/profile', { method: 'POST', body: { name: 'A' }, headers: { 'Content-Length': '9000' } })).status, 413);
  assert.equal((await request('/api/profile', { method: 'POST', body: JSON.stringify({ name: 'x'.repeat(5000) }) })).status, 413);
});

test('cross-origin and sibling-origin writes are rejected while same-origin requests work', async (t) => {
  const { request } = fixture(t);
  for (const headers of [
    { Origin: 'https://evil.example' }, { Origin: 'null' }, { Origin: 'http://wnam.pages.dev' },
    { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'same-site' }, { Referer: 'https://evil.example/form' },
  ]) {
    const response = await request('/api/profile', { method: 'POST', body: { name: 'Alex' }, headers });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal((await request('/api/profile', { method: 'POST', body: { name: 'Alex' }, headers: { Origin: 'https://wnam.pages.dev', 'Sec-Fetch-Site': 'same-origin' } })).status, 201);
});

test('progress requires the secret cookie; a public profile id cannot authenticate another player', async (t) => {
  const { create, request } = fixture(t);
  const guest = await create();
  for (const cookie of [undefined, `__Host-wnam_guest=${guest.profile.id}`, `__Host-wnam_guest=${'a'.repeat(64)}`]) {
    const response = await request('/api/progress', { method: 'PUT', body: score(), cookie });
    assert.equal(response.status, 401);
  }
});

test('progress updates only its authenticated guest and returns the public ranked entry', async (t) => {
  const { create, request } = fixture(t);
  const alice = await create('Alice');
  const bob = await create('Bob');
  const response = await request('/api/progress', { method: 'PUT', cookie: alice.cookie, body: { ...score(4, 15, 3, 5), id: bob.profile.id } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { entry: { rank: 1, ...alice.profile, ...score(4, 15, 3, 5), collectionScore: 0 } });
  const bobBoard = await (await request('/api/leaderboard', { cookie: bob.cookie })).json();
  assert.equal(bobBoard.self.plantsGrown, 0);
  assert.equal(bobBoard.self.id, bob.profile.id);
});

test('repeated and out-of-order score updates are idempotent and monotonic', async (t) => {
  const { create, request } = fixture(t);
  const { cookie } = await create();
  const put = async (body) => (await (await request('/api/progress', { method: 'PUT', body, cookie })).json()).entry;
  const first = await put(score(7, 24, 5, 7));
  assert.deepEqual(await put(score(7, 24, 5, 7)), first);
  assert.deepEqual(await put(score(1, 3, 1, 2)), first);
  await Promise.all([put(score(8, 24, 6, 7)), put(score(3, 40, 3, 2))]);
  const final = (await (await request('/api/leaderboard', { cookie })).json()).self;
  assert.deepEqual({ plantsGrown: final.plantsGrown, correctAnswers: final.correctAnswers, uniquePlants: final.uniquePlants, highestLevel: final.highestLevel }, score(8, 40, 6, 7));
});

test('impossible, oversized, fractional, and incomplete score data is rejected', async (t) => {
  const { create, request } = fixture(t);
  const { cookie } = await create();
  const invalid = [
    {}, { ...score(), plantsGrown: -1 }, { ...score(), plantsGrown: 1.5 },
    { ...score(), plantsGrown: '3' }, { ...score(), plantsGrown: 1000001 },
    { ...score(), correctAnswers: 10000001 }, { ...score(), correctAnswers: Number.MAX_SAFE_INTEGER + 1 },
    { ...score(), uniquePlants: PLANTS.length + 1 }, score(11, 33, 11), { ...score(), highestLevel: 0 }, { ...score(), highestLevel: 8 },
    score(2, 5, 1), score(1, 3, 2), score(0, 0, 1),
  ];
  for (const body of invalid) assert.equal((await request('/api/progress', { method: 'PUT', body, cookie })).status, 400, JSON.stringify(body));
  assert.equal((await request('/api/progress', { method: 'PUT', body: score(0, 0, 0, 1), cookie })).status, 200);
});

test('rarity collection score outranks easy farming, followed by level and correct answers with shared ties', async (t) => {
  const { request, db } = fixture(t);
  await request('/api/profile');
  seed(db, 'a', score(3, 12, 2, 3));
  seed(db, 'b', score(3, 12, 2, 7));
  seed(db, 'c', score(3, 12, 3, 4));
  seed(db, 'd', score(3, 9, 3, 5));
  seed(db, 'e', score(2, 100, 2, 7));
  seed(db, 'f', score(400, 1200, 2, 5));
  seed(db, 'g', score(1, 6, 1, 7));
  seed(db, 'h', score(2, 6, 1, 7));
  const common = ['solara-minima', 'lunaria-rotunda', 'spicula-pompom'];
  for (const id of ['a', 'b', 'f']) seedDiscoveries(db, id, common.slice(0, 2));
  for (const id of ['c', 'd']) seedDiscoveries(db, id, common);
  seedDiscoveries(db, 'e', ['crystalia-lucens', common[0]]);
  for (const id of ['g', 'h']) seedDiscoveries(db, id, ['aurelia-infinitum']);
  const board = await (await request('/api/leaderboard')).json();
  assert.deepEqual(board.entries.map((entry) => [entry.id, entry.rank, entry.collectionScore]),
    [['g', 1, 100], ['h', 1, 100], ['e', 3, 11], ['d', 4, 3], ['c', 5, 3], ['b', 6, 2], ['f', 7, 2], ['a', 8, 2]]);
  assert.equal(board.self, null);
  assert.equal(board.totalPlayers, 8);
  assert.ok(board.entries.every((entry) => Object.keys(entry).sort().join(',') === 'collectionScore,correctAnswers,highestLevel,id,name,plantsGrown,rank,tag,uniquePlants'));
});

test('discovery updates derive score from known species and duplicates never earn more points', async (t) => {
  const { create, request, db } = fixture(t);
  const { cookie } = await create();
  const put = async (body) => (await (await request('/api/progress', { method: 'PUT', body, cookie })).json()).entry;
  const plantIds = ['solara-minima', 'campana-somnia', 'crystalia-lucens', 'nebula-pendula', 'aurelia-infinitum'];
  const first = await put({ ...score(5, 15, 5, 7), plantIds, collectionScore: 999999 });
  assert.equal(first.collectionScore, 144);
  assert.deepEqual(await put({ ...score(5, 15, 5, 7), plantIds, collectionScore: -100 }), first);
  const repeated = await put({ ...score(100, 300, 5, 7), plantIds });
  assert.equal(repeated.collectionScore, 144);
  assert.equal(repeated.plantsGrown, 100);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM guest_plant_discoveries').get().count, 5);
});

test('all thirty species save and reload against the original ten-count schema without a table rebuild', async (t) => {
  const { create, request, db, env } = fixture(t);
  const { cookie, profile } = await create();
  seed(db, 'existing-player', score(24, 80, 8, 7));
  const existing = { ...db.sqlite.prepare('SELECT * FROM guest_profiles WHERE id = ?').get('existing-player') };
  db.sqlite.prepare('INSERT INTO tutor_rate_limits VALUES (?, ?, ?)').run(profile.id, 1000, 2);
  const originalTables = db.sqlite.prepare("SELECT name, rootpage, sql FROM sqlite_schema WHERE type = 'table' ORDER BY name").all();
  assert.match(originalTables.find((table) => table.name === 'guest_profiles').sql, /unique_plants BETWEEN 0 AND 10/);

  const put = async (body) => {
    const response = await request('/api/progress', { method: 'PUT', body, cookie });
    assert.equal(response.status, 200);
    return (await response.json()).entry;
  };
  const originalIds = PLANTS.slice(0, 10).map((plant) => plant.id);
  const oldCollection = await put({ ...score(10, 30, 10, 7), plantIds: originalIds });
  assert.equal(oldCollection.collectionScore, 162);
  const plantIds = PLANTS.map((plant) => plant.id);
  const expanded = await put({ ...score(30, 90, 30, 7), plantIds });
  assert.equal(expanded.uniquePlants, 30);
  assert.equal(expanded.collectionScore, 612);
  assert.deepEqual(await put({ ...score(30, 90, 30, 7), plantIds }), expanded);
  assert.deepEqual(await put(score(10, 30, 10, 7)), expanded, 'An old client must not erase newer discoveries');
  assert.equal(db.sqlite.prepare('SELECT unique_plants FROM guest_profiles WHERE id = ?').get(profile.id).unique_plants, 10);
  assert.deepEqual(db.sqlite.prepare('SELECT plant_id FROM guest_plant_discoveries WHERE profile_id = ? ORDER BY plant_id').all(profile.id).map((row) => row.plant_id), [...plantIds].sort());

  const reopenedWorker = createWorker();
  const reopened = await reopenedWorker.fetch(new Request('https://wnam.pages.dev/api/leaderboard', { headers: { Cookie: cookie } }), env);
  assert.equal(reopened.status, 200);
  assert.deepEqual((await reopened.json()).self, expanded);
  assert.deepEqual(db.sqlite.prepare("SELECT name, rootpage, sql FROM sqlite_schema WHERE type = 'table' ORDER BY name").all(), originalTables);
  assert.deepEqual({ ...db.sqlite.prepare('SELECT * FROM guest_profiles WHERE id = ?').get('existing-player') }, existing);
  assert.equal(db.sqlite.prepare('SELECT request_count FROM tutor_rate_limits WHERE profile_id = ?').get(profile.id).request_count, 2);
});

test('legacy and partial updates preserve discovered species and existing progress', async (t) => {
  const { create, request } = fixture(t);
  const { cookie } = await create();
  const put = async (body) => (await (await request('/api/progress', { method: 'PUT', body, cookie })).json()).entry;
  await put(score(12, 40, 5, 7));
  // Backfill a preserved pre-gate collection even if its old level was low.
  const backfill = await put({ ...score(1, 3, 1, 1), plantIds: ['aurelia-infinitum'] });
  assert.equal(backfill.collectionScore, 100);
  assert.equal(backfill.plantsGrown, 12);
  const olderClient = await put(score(1, 3, 1, 1));
  assert.deepEqual(olderClient, backfill);
  assert.deepEqual(await put({ ...score(0, 0, 0, 1), plantIds: [] }), backfill);
  await Promise.all([
    put({ ...score(1, 3, 1, 1), plantIds: ['solara-minima'] }),
    put({ ...score(1, 3, 1, 1), plantIds: ['lunaria-rotunda'] }),
  ]);
  const final = (await (await request('/api/leaderboard', { cookie })).json()).self;
  assert.equal(final.collectionScore, 102);
  assert.equal(final.uniquePlants, 5);
  assert.equal(final.highestLevel, 7);
});

test('disjoint saved collections merge without inflating lifetime counters', async (t) => {
  const { create, request } = fixture(t);
  const { cookie } = await create();
  for (const id of ['solara-minima', 'lunaria-rotunda']) {
    assert.equal((await request('/api/progress', {
      method: 'PUT', cookie, body: { ...score(1, 3, 1, 1), plantIds: [id] },
    })).status, 200);
  }
  const final = (await (await request('/api/leaderboard', { cookie })).json()).self;
  assert.equal(final.uniquePlants, 2);
  assert.equal(final.collectionScore, 2);
  assert.equal(final.plantsGrown, 1);
  assert.equal(final.correctAnswers, 3);
});

test('unknown, repeated, excessive, and inconsistent discovery IDs are rejected', async (t) => {
  const { create, request, db } = fixture(t);
  const { cookie } = await create();
  const invalid = [
    { ...score(1, 3, 1), plantIds: ['invented-plant'] },
    { ...score(1, 3, 1), plantIds: [null] },
    { ...score(1, 3, 1), plantIds: 'solara-minima' },
    { ...score(1, 3, 1), plantIds: null },
    { ...score(1, 3, 1), plantIds: [] },
    { ...score(0, 0, 0), plantIds: ['solara-minima'] },
    { ...score(2, 6, 2), plantIds: ['solara-minima', 'solara-minima'] },
    { ...score(11, 33, 10), plantIds: Array(11).fill('solara-minima') },
    { ...score(PLANTS.length + 1, (PLANTS.length + 1) * 3, PLANTS.length + 1), plantIds: [...PLANTS.map((plant) => plant.id), 'invented-plant'] },
    { ...score(1, 3, 1), plantIds: ["solara-minima'); DROP TABLE guest_profiles;--"] },
  ];
  for (const body of invalid) {
    assert.equal((await request('/api/progress', { method: 'PUT', body, cookie })).status, 400, JSON.stringify(body));
  }
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM guest_plant_discoveries').get().count, 0);
});

test('top 100 limits the public list while still returning the guest below it', async (t) => {
  const { create, request, db } = fixture(t);
  const guest = await create('Outside top 100');
  for (let index = 1; index <= 110; index++) seed(db, String(index), score(index));
  const board = await (await request('/api/leaderboard', { cookie: guest.cookie })).json();
  assert.equal(board.entries.length, 100);
  assert.equal(board.totalPlayers, 111);
  assert.equal(board.self.id, guest.profile.id);
  assert.equal(board.self.rank, 111);
  assert.ok(!board.entries.some((entry) => entry.id === guest.profile.id));
});

test('unsupported routes and methods return JSON, and missing database binding returns 503', async (t) => {
  const { request, worker, env } = fixture(t);
  assert.equal((await request('/api/unknown')).status, 404);
  const response = await request('/api/profile', { method: 'DELETE' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, POST');
  assert.equal((await request('/api/profile', { method: 'OPTIONS' })).status, 405);
  delete env.LEADERBOARD_DB;
  const unavailable = await worker.fetch(new Request('https://wnam.pages.dev/api/leaderboard'), env);
  assert.equal(unavailable.status, 503);
  assert.equal(typeof (await unavailable.json()).error, 'string');
});

test('database failures disclose no query or secret and a failed bootstrap can retry', async (t) => {
  const { request, db } = fixture(t);
  const batch = db.batch;
  let fail = true;
  db.batch = async (statements) => {
    if (fail) { fail = false; throw new Error('SELECT SECRET token_hash=private'); }
    return batch(statements);
  };
  const first = await request('/api/profile');
  assert.equal(first.status, 503);
  assert.ok(!(await first.text()).includes('SECRET'));
  assert.equal((await request('/api/profile')).status, 200);
});

test('profile creation has bounded best-effort rate protection without locking out existing guests', async (t) => {
  let clock = 1000;
  const { create, request } = fixture(t, { now: () => clock });
  const headers = { 'CF-Connecting-IP': '192.0.2.1' };
  const first = await create('First', headers);
  for (let index = 1; index < 60; index++) assert.equal((await create(`Guest ${index}`, headers)).response.status, 201);
  const limited = await create('Too many', headers);
  assert.equal(limited.response.status, 429);
  assert.equal(limited.response.headers.get('Retry-After'), '60');
  assert.equal((await request('/api/profile', { method: 'POST', cookie: first.cookie, headers, body: { name: 'Ignored' } })).status, 200);
  clock += 60001;
  assert.equal((await create('After a minute', headers)).response.status, 201);
});
