import { PLANTS } from './plants.js';
import { RARITIES } from './rarities.js';

const PLANT_IDS = new Set(PLANTS.map((plant) => plant.id));

// Exact percentages for every cycle. Owning a plant never changes these odds;
// exotic specimens can only grow at level 7, with a 5% chance per cycle.
export const RARITY_WEIGHTS = Object.freeze([
  Object.freeze([100, 0, 0, 0, 0]),
  Object.freeze([75, 25, 0, 0, 0]),
  Object.freeze([65, 25, 10, 0, 0]),
  Object.freeze([50, 35, 15, 0, 0]),
  Object.freeze([40, 30, 25, 5, 0]),
  Object.freeze([25, 35, 30, 10, 0]),
  Object.freeze([10, 20, 40, 25, 5]),
]);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

function randomUnit(rng) {
  const value = Number(rng());
  return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0;
}

/** Keep usable discoveries even when one entry or the derived total is damaged. */
function readCollection(value) {
  const entries = new Map();
  let totalGrown = 0;
  for (const item of Array.isArray(value) ? value : []) {
    if (!isRecord(item) || !PLANT_IDS.has(item.plantId) || !isCount(item.count) || item.count === 0) continue;
    const count = Math.min(item.count, Number.MAX_SAFE_INTEGER - totalGrown);
    if (count === 0) continue;
    const firstCollectedAt = isCount(item.firstCollectedAt) ? item.firstCollectedAt : 0;
    const previous = entries.get(item.plantId);
    entries.set(item.plantId, {
      plantId: item.plantId,
      count: (previous?.count || 0) + count,
      firstCollectedAt: previous ? Math.min(previous.firstCollectedAt, firstCollectedAt) : firstCollectedAt,
    });
    totalGrown += count;
  }
  return { collection: [...entries.values()], totalGrown };
}

const readLevel = (level) => Number.isFinite(Number(level)) ? Math.max(1, Math.min(7, Math.trunc(Number(level)))) : 1;

function isEligible(plantId, level) {
  const plant = PLANTS.find((candidate) => candidate.id === plantId);
  return Boolean(plant && RARITIES.find((rarity) => rarity.id === plant.rarity)?.minLevel <= readLevel(level));
}

function choosePlant(level, rng) {
  const weights = RARITY_WEIGHTS[readLevel(level) - 1];
  let roll = randomUnit(rng) * weights.reduce((sum, weight) => sum + weight, 0);
  let rarityIndex = weights.length - 1;
  for (let index = 0; index < weights.length; index++) {
    if (roll < weights[index]) { rarityIndex = index; break; }
    roll -= weights[index];
  }
  const candidates = PLANTS.filter((plant) => plant.rarity === RARITIES[rarityIndex].id);
  return candidates[Math.floor(randomUnit(rng) * candidates.length)].id;
}

/** Start a new growth cycle, preserving discoveries from previous cycles. */
export function initGarden(level = 1, previousGarden = null, rng = Math.random) {
  const { collection, totalGrown } = readCollection(previousGarden?.collection);
  return {
    activePlantId: choosePlant(level, rng),
    collection,
    totalGrown,
  };
}

/** Keep eligible saved cycles and all discoveries; migrate old, ineligible seeds. */
export function restoreGarden(value, level = 1, rng = Math.random, { preserveAwardedPlant = false } = {}) {
  const { collection, totalGrown } = readCollection(value?.collection);
  // A completed, previously rewarded cycle is only being displayed; retaining
  // it must never reroll or mint another plant during migration.
  const isAwarded = preserveAwardedPlant && collection.some((item) => item.plantId === value?.activePlantId);
  return {
    activePlantId: isEligible(value?.activePlantId, level) || isAwarded
      ? value.activePlantId
      : choosePlant(level, rng),
    collection,
    totalGrown,
  };
}

/** Reward one completed growth cycle. The progression state guards re-submission. */
export function collectActivePlant(garden, now = Date.now(), level = 1) {
  const restored = restoreGarden(garden, level);
  const alreadyCollected = restored.collection.find((item) => item.plantId === restored.activePlantId);
  if (restored.totalGrown === Number.MAX_SAFE_INTEGER) return restored;
  return {
    ...restored,
    collection: alreadyCollected
      ? restored.collection.map((item) => item.plantId === restored.activePlantId ? { ...item, count: item.count + 1 } : item)
      : [...restored.collection, { plantId: restored.activePlantId, count: 1, firstCollectedAt: isCount(now) ? now : Date.now() }],
    totalGrown: restored.totalGrown + 1,
  };
}

/** Number of distinct species discovered; totalGrown also counts duplicates. */
export function getCollectedCount(garden) {
  return readCollection(garden?.collection).collection.length;
}
