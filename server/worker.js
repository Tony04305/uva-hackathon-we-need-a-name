// Cloudflare Pages advanced-mode worker. Scores are client-reported: validation
// prevents malformed updates, but this is a casual leaderboard, not anti-cheat.
import { parseTutorInput, tutorReply, TutorInputError } from './tutor.js';
import { parseEconomicsGradingInput, gradeEconomicsExplanation, EconomicsGradingInputError, EconomicsGradingUnavailableError } from './economics-grader.js';
import { PLANTS } from '../src/plants.js';
import { RARITIES } from '../src/rarities.js';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS guest_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,
  tag TEXT NOT NULL CHECK (length(tag) = 4 AND tag NOT GLOB '*[^0-9]*'),
  token_hash TEXT NOT NULL UNIQUE,
  plants_grown INTEGER NOT NULL DEFAULT 0 CHECK (plants_grown BETWEEN 0 AND 1000000),
  correct_answers INTEGER NOT NULL DEFAULT 0 CHECK (correct_answers BETWEEN 0 AND 10000000),
  -- Legacy aggregate stays capped at ten. Discoveries hold the full catalogue.
  unique_plants INTEGER NOT NULL DEFAULT 0 CHECK (unique_plants BETWEEN 0 AND 10),
  highest_level INTEGER NOT NULL DEFAULT 1 CHECK (highest_level BETWEEN 1 AND 7),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (name_key, tag),
  CHECK (plants_grown * 3 <= correct_answers),
  CHECK (unique_plants <= plants_grown)
);
CREATE INDEX IF NOT EXISTS guest_profiles_ranking
  ON guest_profiles (plants_grown DESC, correct_answers DESC, id ASC);
CREATE TABLE IF NOT EXISTS guest_plant_discoveries (
  profile_id TEXT NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  plant_id TEXT NOT NULL,
  PRIMARY KEY (profile_id, plant_id)
);
CREATE TABLE IF NOT EXISTS tutor_rate_limits (
  profile_id TEXT PRIMARY KEY REFERENCES guest_profiles(id) ON DELETE CASCADE,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count BETWEEN 1 AND 10)
);
`;

const COOKIE_NAME = '__Host-wnam_guest';
const MAX_BODY_BYTES = 4096;
const PLANT_IDS = new Set(PLANTS.map((plant) => plant.id));
// Keep the original schema usable without rebuilding profiles or foreign keys.
// Species rows are authoritative for collections larger than this old counter.
const LEGACY_UNIQUE_PLANT_LIMIT = 10;
const rarityPoints = new Map(RARITIES.map((rarity) => [rarity.id, rarity.points]));
// This CASE comes only from the checked-in catalogue, never from request data.
// A species contributes once through the discoveries table's composite key.
const PLANT_POINTS_SQL = PLANTS.map((plant) =>
  `WHEN '${plant.id.replaceAll("'", "''")}' THEN ${rarityPoints.get(plant.rarity)}`).join(' ');
const RANKED_QUERY = `WITH scored AS (
  SELECT p.id, p.name, p.tag, p.plants_grown AS plantsGrown,
    p.correct_answers AS correctAnswers, MAX(p.unique_plants, COUNT(d.plant_id)) AS uniquePlants,
    p.highest_level AS highestLevel,
    COALESCE(SUM(CASE d.plant_id ${PLANT_POINTS_SQL} ELSE 0 END), 0) AS collectionScore
  FROM guest_profiles p
  LEFT JOIN guest_plant_discoveries d ON d.profile_id = p.id
  GROUP BY p.id
), ranked AS (
  SELECT RANK() OVER (ORDER BY collectionScore DESC, highestLevel DESC, correctAnswers DESC) AS rank,
    id, name, tag, plantsGrown, correctAnswers, uniquePlants, highestLevel, collectionScore
  FROM scored
)`;

class ApiError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
      ...headers,
    },
  });
}

function guardWriteOrigin(request, url) {
  const origin = request.headers.get('Origin');
  if (origin !== null && origin !== url.origin) {
    throw new ApiError(403, 'Open WNAM on this website before making changes.');
  }
  const site = request.headers.get('Sec-Fetch-Site');
  if (site === 'cross-site' || site === 'same-site') {
    throw new ApiError(403, 'Open WNAM on this website before making changes.');
  }
  // Command-line clients may omit Origin. A browser referrer, when present,
  // must still match this origin; no cross-origin writes or CORS are enabled.
  if (origin === null && request.headers.has('Referer')) {
    try {
      if (new URL(request.headers.get('Referer')).origin !== url.origin) throw new Error();
    } catch {
      throw new ApiError(403, 'Open WNAM on this website before making changes.');
    }
  }
}

async function readJson(request, maxBodyBytes = MAX_BODY_BYTES) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiError(415, 'Send this request as JSON.');
  }
  const advertisedLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(advertisedLength) && advertisedLength > maxBodyBytes) {
    throw new ApiError(413, 'This request is too large.');
  }
  if (!request.body) throw new ApiError(400, 'A JSON object is required.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maxBodyBytes) {
        await reader.cancel();
        throw new ApiError(413, 'This request is too large.');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'A valid JSON object is required.');
  } finally {
    reader.releaseLock();
  }
}

function cleanName(value) {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(value)) {
    throw new ApiError(400, 'Choose a name using letters, numbers, spaces, or . _ - apostrophes.');
  }
  const name = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (Array.from(name).length < 1 || Array.from(name).length > 24
      || !/^[\p{L}\p{M}\p{N} ._'’\-]+$/u.test(name)
      || !/[\p{L}\p{N}]/u.test(name)) {
    throw new ApiError(400, 'Use 1–24 characters: letters, numbers, spaces, or . _ - apostrophes.');
  }
  return name;
}

function progressInput(value) {
  const limits = { plantsGrown: [0, 1000000], correctAnswers: [0, 10000000], uniquePlants: [0, PLANTS.length], highestLevel: [1, 7] };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value[key]) || value[key] < min || value[key] > max) {
      throw new ApiError(400, 'Progress must contain valid whole-number plant, answer, and level counts.');
    }
  }
  if (value.plantsGrown * 3 > value.correctAnswers || value.uniquePlants > value.plantsGrown) {
    throw new ApiError(400, 'Plant totals must match your completed answer streaks.');
  }
  if (value.uniquePlants > LEGACY_UNIQUE_PLANT_LIMIT && !Object.hasOwn(value, 'plantIds')) {
    throw new ApiError(400, 'Include your collected species when saving more than ten discoveries.');
  }
  if (Object.hasOwn(value, 'plantIds')) {
    if (!Array.isArray(value.plantIds) || value.plantIds.length > PLANTS.length
        || value.plantIds.length !== value.uniquePlants
        || new Set(value.plantIds).size !== value.plantIds.length
        || value.plantIds.some((id) => typeof id !== 'string' || !PLANT_IDS.has(id))) {
      throw new ApiError(400, 'Plant discoveries must list each known collected species once.');
    }
    // Collections earned before rarity gates existed remain valid. As with the
    // other progress counters, this casual leaderboard accepts reported history.
  }
  return value;
}

function hex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function cookieToken(request) {
  const cookie = request.headers.get('Cookie') || '';
  if (cookie.length > 8192) return null;
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = match?.slice(COOKIE_NAME.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

/** Injectable platform primitives let tests execute the actual SQL in SQLite. */
export function createWorker({ cryptoImpl = globalThis.crypto, now = () => Date.now() } = {}) {
  const schemas = new WeakMap();
  const creationBuckets = new Map();

  async function ensureSchema(db) {
    if (!schemas.has(db)) {
      const statements = SCHEMA_SQL.split(';').map((statement) => statement.trim()).filter(Boolean);
      const pending = db.batch(statements.map((statement) => db.prepare(statement)));
      schemas.set(db, pending);
      pending.catch(() => schemas.delete(db));
    }
    await schemas.get(db);
  }

  async function hashToken(token) {
    return hex(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(token))));
  }

  async function profileFor(request, db) {
    const token = cookieToken(request);
    if (!token) return null;
    return db.prepare('SELECT id, name, tag FROM guest_profiles WHERE token_hash = ?').bind(await hashToken(token)).first();
  }

  function newTag() {
    // Rejection sampling avoids modulo bias in the four-digit discriminator.
    const ceiling = Math.floor(0x100000000 / 10000) * 10000;
    let value;
    do { value = cryptoImpl.getRandomValues(new Uint32Array(1))[0]; } while (value >= ceiling);
    return String(value % 10000).padStart(4, '0');
  }

  function guardCreationRate(request) {
    // Best-effort per-isolate protection. Cloudflare provides this header;
    // no IP address is stored in the database or returned to clients.
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return;
    const time = now();
    const previous = creationBuckets.get(ip);
    const bucket = previous && time - previous.started < 60000 ? previous : { started: time, count: 0 };
    if (bucket.count >= 60) throw new ApiError(429, 'Too many new profiles. Wait a minute and try again.', { 'Retry-After': '60' });
    bucket.count++;
    creationBuckets.delete(ip);
    creationBuckets.set(ip, bucket);
    if (creationBuckets.size > 2000) creationBuckets.delete(creationBuckets.keys().next().value);
  }

  async function createProfile(request, db) {
    const existing = await profileFor(request, db);
    if (existing) return json({ profile: existing });
    const name = cleanName((await readJson(request)).name);
    guardCreationRate(request);
    const nameKey = name.toUpperCase().toLowerCase();
    const token = hex(cryptoImpl.getRandomValues(new Uint8Array(32)));
    const tokenHash = await hashToken(token);
    const id = cryptoImpl.randomUUID();
    const timestamp = now();
    for (let attempt = 0; attempt < 12; attempt++) {
      const tag = newTag();
      const result = await db.prepare(`INSERT INTO guest_profiles
        (id, name, name_key, tag, token_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name_key, tag) DO NOTHING`)
        .bind(id, name, nameKey, tag, tokenHash, timestamp, timestamp).run();
      if (result.meta.changes === 1) {
        return json({ profile: { id, name, tag } }, 201, {
          'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
        });
      }
    }
    throw new ApiError(409, 'That name is popular. Try again or choose a different name.');
  }

  async function leaderboard(request, db) {
    const profile = await profileFor(request, db);
    const results = await db.batch([
      db.prepare(`${RANKED_QUERY} SELECT * FROM ranked ORDER BY collectionScore DESC, highestLevel DESC, correctAnswers DESC, id ASC LIMIT 100`),
      db.prepare(`${RANKED_QUERY} SELECT * FROM ranked WHERE id = ?`).bind(profile?.id || ''),
      db.prepare('SELECT COUNT(*) AS totalPlayers FROM guest_profiles'),
    ]);
    return json({ entries: results[0].results, self: results[1].results[0] || null, totalPlayers: results[2].results[0].totalPlayers });
  }

  async function updateProgress(request, db) {
    const profile = await profileFor(request, db);
    if (!profile) throw new ApiError(401, 'Choose a guest name before saving leaderboard progress.');
    const value = progressInput(await readJson(request));
    const results = await db.batch([
      ...(value.plantIds || []).map((id) => db.prepare(`INSERT INTO guest_plant_discoveries
        (profile_id, plant_id) VALUES (?, ?) ON CONFLICT(profile_id, plant_id) DO NOTHING`).bind(profile.id, id)),
      db.prepare(`UPDATE guest_profiles SET
        plants_grown = MAX(plants_grown, ?), correct_answers = MAX(correct_answers, ?),
        unique_plants = MAX(unique_plants, ?), highest_level = MAX(highest_level, ?), updated_at = ?
        WHERE id = ?`)
        .bind(value.plantsGrown, value.correctAnswers, Math.min(value.uniquePlants, LEGACY_UNIQUE_PLANT_LIMIT), value.highestLevel, now(), profile.id),
      db.prepare(`${RANKED_QUERY} SELECT * FROM ranked WHERE id = ?`).bind(profile.id),
    ]);
    return json({ entry: results.at(-1).results[0] });
  }

  async function consumeAiQuota(profile, db) {
    const timestamp = now();
    // The conditional upsert consumes a request atomically across isolates.
    // Keeping one row per guest also bounds storage without a cleanup job.
    const results = await db.batch([
      db.prepare(`INSERT INTO tutor_rate_limits (profile_id, window_started_at, request_count)
        VALUES (?, ?, 1) ON CONFLICT(profile_id) DO UPDATE SET
          window_started_at = CASE WHEN tutor_rate_limits.window_started_at <= excluded.window_started_at - 60000
            THEN excluded.window_started_at ELSE tutor_rate_limits.window_started_at END,
          request_count = CASE WHEN tutor_rate_limits.window_started_at <= excluded.window_started_at - 60000
            THEN 1 ELSE tutor_rate_limits.request_count + 1 END
        WHERE tutor_rate_limits.window_started_at <= excluded.window_started_at - 60000 OR tutor_rate_limits.request_count < 10`)
        .bind(profile.id, timestamp),
      db.prepare('SELECT window_started_at FROM tutor_rate_limits WHERE profile_id = ?').bind(profile.id),
    ]);
    if (results[0].meta.changes !== 1) {
      const retryAfter = Math.max(1, Math.ceil((results[1].results[0].window_started_at + 60000 - timestamp) / 1000));
      throw new ApiError(429, 'You have used 10 AI requests this minute. Try again shortly.', { 'Retry-After': String(retryAfter) });
    }
  }

  async function tutor(request, db, ai) {
    const profile = await profileFor(request, db);
    if (!profile) throw new ApiError(401, 'Choose a guest name before asking the tutor.');
    const input = parseTutorInput(await readJson(request));
    await consumeAiQuota(profile, db);
    return json(await tutorReply(input, ai));
  }

  async function economicsGrade(request, db, ai) {
    const profile = await profileFor(request, db);
    if (!profile) throw new ApiError(401, 'Choose a guest name before submitting your explanation.');
    // 1,600 Unicode characters plus the two predictions fit in this bound.
    const input = parseEconomicsGradingInput(await readJson(request, 8192));
    if (!ai || typeof ai.run !== 'function') throw new EconomicsGradingUnavailableError();
    await consumeAiQuota(profile, db);
    return json(await gradeEconomicsExplanation(input, ai));
  }

  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      try {
        const path = url.pathname.replace(/\/$/, '');
        const allowed = { '/api/profile': ['GET', 'POST'], '/api/leaderboard': ['GET'], '/api/progress': ['PUT'], '/api/tutor': ['POST'], '/api/economics/grade': ['POST'] }[path];
        if (!allowed) throw new ApiError(404, 'This API endpoint does not exist.');
        if (!allowed.includes(request.method)) throw new ApiError(405, 'This request method is not supported.', { Allow: allowed.join(', ') });
        if (request.method !== 'GET') guardWriteOrigin(request, url);
        const db = env.LEADERBOARD_DB;
        if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
          throw new ApiError(503, 'The shared leaderboard is being set up. Please try again shortly.');
        }
        await ensureSchema(db);
        if (path === '/api/profile') return request.method === 'GET' ? json({ profile: await profileFor(request, db) }) : await createProfile(request, db);
        if (path === '/api/leaderboard') return await leaderboard(request, db);
        if (path === '/api/tutor') return await tutor(request, db, env.AI);
        if (path === '/api/economics/grade') return await economicsGrade(request, db, env.AI);
        return await updateProgress(request, db);
      } catch (error) {
        if (error instanceof ApiError) return json({ error: error.message }, error.status, error.headers);
        if (error instanceof TutorInputError || error instanceof EconomicsGradingInputError) return json({ error: error.message }, 400);
        if (error instanceof EconomicsGradingUnavailableError) return json({ error: error.message }, 503);
        return json({ error: 'The shared leaderboard is temporarily unavailable. Please try again.' }, 503);
      }
    },
  };
}

export default createWorker();
