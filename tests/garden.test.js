import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANTS } from '../src/plants.js';
import { RARITIES, collectionScore } from '../src/rarities.js';
import { RARITY_WEIGHTS, initGarden, restoreGarden, collectActivePlant, getCollectedCount } from '../src/garden.js';

const rarity = (garden) => PLANTS.find((plant) => plant.id === garden.activePlantId).rarity;
const rolls = (...values) => { let index = 0; return () => values[index++ % values.length]; };
const ranks = ['common', 'uncommon', 'rare', 'epic', 'exotic'];

test('the catalogue adds twenty species while preserving the original ten and rarity gates', () => {
  assert.equal(PLANTS.length, 30);
  assert.equal(new Set(PLANTS.map((plant) => plant.id)).size, 30);
  assert.deepEqual(PLANTS.slice(0, 10).map((plant) => plant.id), [
    'solara-minima', 'lunaria-rotunda', 'spicula-pompom', 'campana-somnia', 'spiralis-curiosa',
    'fungia-lumilux', 'crystalia-lucens', 'plumaria-fanfara', 'nebula-pendula', 'aurelia-infinitum',
  ]);
  assert.deepEqual(ranks.map((tier) => PLANTS.filter((plant) => plant.rarity === tier).length), [8, 8, 6, 4, 4]);
  assert.deepEqual(RARITIES.map(({ id, minLevel, points }) => [id, minLevel, points]), [
    ['common', 1, 1], ['uncommon', 2, 3], ['rare', 3, 10], ['epic', 5, 30], ['exotic', 7, 100],
  ]);
  assert.equal(PLANTS.find((plant) => plant.id === 'aurelia-infinitum').rarity, 'exotic');
});

test('rarities cannot drop below their required current level', () => {
  const highestRarity = [1, 2, 3, 4, 5, 6, 7].map((level) => rarity(initGarden(level, null, () => 0.999)));
  assert.deepEqual(highestRarity, ['common', 'uncommon', 'rare', 'rare', 'epic', 'epic', 'exotic']);
  for (let level = 1; level <= 7; level++) {
    for (let index = 0; index <= 1000; index++) {
      const tier = rarity(initGarden(level, null, () => index / 1000));
      assert.ok(RARITIES.find((entry) => entry.id === tier).minLevel <= level);
    }
  }
});

test('each level uses its exact published percentages, including only 5% exotic at level seven', () => {
  const expected = [[100, 0, 0, 0, 0], [75, 25, 0, 0, 0], [65, 25, 10, 0, 0], [50, 35, 15, 0, 0], [40, 30, 25, 5, 0], [25, 35, 30, 10, 0], [10, 20, 40, 25, 5]];
  assert.deepEqual(RARITY_WEIGHTS, expected);
  let previousAverage = -1;
  for (let level = 1; level <= 7; level++) {
    const outcomes = Array.from({ length: 100 }, (_, index) => rarity(initGarden(level, null, rolls((index + 0.5) / 100, 0))));
    assert.deepEqual(ranks.map((rank) => outcomes.filter((tier) => tier === rank).length), expected[level - 1]);
    const average = outcomes.reduce((sum, tier) => sum + ranks.indexOf(tier), 0) / outcomes.length;
    assert.ok(average > previousAverage);
    previousAverage = average;
    let boundary = 0;
    for (let index = 0; index < ranks.length - 1; index++) {
      boundary += expected[level - 1][index];
      if (expected[level - 1][index] === 0 || boundary === 100) continue;
      assert.equal(rarity(initGarden(level, null, rolls(boundary / 100 - 1e-9, 0))), ranks[index]);
      assert.equal(rarity(initGarden(level, null, rolls(boundary / 100, 0))), ranks[index + 1]);
    }
  }
});

test('all available species can be selected with deterministic random rolls', () => {
  const selected = new Set();
  for (let level = 1; level <= 7; level++) {
    for (let rarityRoll = 0; rarityRoll < 100; rarityRoll++) {
      for (let speciesRoll = 0; speciesRoll < 10; speciesRoll++) {
        selected.add(initGarden(level, null, rolls((rarityRoll + 0.5) / 100, (speciesRoll + 0.5) / 10)).activePlantId);
      }
    }
  }
  assert.equal(selected.size, PLANTS.length);
});

test('owned and previous species remain possible without any hidden odds adjustment', () => {
  for (const level of [1, 3, 5, 7]) {
    for (let index = 0; index < 100; index++) {
      const roll = (index + 0.5) / 100;
      const fresh = initGarden(level, null, rolls(roll, 0));
      const grown = collectActivePlant(fresh, 1000, level);
      const repeated = initGarden(level, grown, rolls(roll, 0));
      assert.equal(repeated.activePlantId, fresh.activePlantId, 'Already owned species must remain equally likely');
      assert.deepEqual(repeated.collection, grown.collection);
    }
  }
});

test('repeat discoveries preserve first discovery time and never add collection points', () => {
  const fresh = initGarden(1, null, () => 0);
  const first = collectActivePlant(fresh, 5000, 1);
  const second = collectActivePlant(first, 8000, 1);
  assert.equal(fresh.totalGrown, 0);
  assert.equal(first.collection[0].count, 1);
  assert.deepEqual(second.collection, [{ plantId: fresh.activePlantId, count: 2, firstCollectedAt: 5000 }]);
  assert.equal(second.totalGrown, 2);
  assert.equal(getCollectedCount(second), 1);
  assert.equal(collectionScore([fresh.activePlantId, fresh.activePlantId]), 1);
  assert.equal(collectionScore(PLANTS.slice(0, 10).map((plant) => plant.id)), 162);
  assert.equal(collectionScore(PLANTS.map((plant) => plant.id)), 612);
  assert.equal(collectionScore(['unknown', null, 'aurelia-infinitum', 'aurelia-infinitum']), 100);
  assert.equal(collectionScore(null), 0);
});

test('all thirty discoveries survive storage restoration without changing existing rewards', () => {
  const collection = PLANTS.map((plant, index) => ({ plantId: plant.id, count: index + 1, firstCollectedAt: 1000 + index }));
  const saved = { activePlantId: PLANTS[0].id, collection, totalGrown: 465 };
  const restored = restoreGarden(JSON.parse(JSON.stringify(saved)), 7, () => { throw new Error('An eligible saved cycle must not reroll'); });
  assert.deepEqual(restored, saved);
  assert.equal(getCollectedCount(restored), 30);
  assert.equal(collectionScore(restored.collection.map((entry) => entry.plantId)), 612);
});

test('restoration keeps an eligible cycle unchanged without rerolling or manufacturing rewards', () => {
  const garden = collectActivePlant(initGarden(7, null, () => 0.99), 5000, 7);
  assert.equal(rarity(garden), 'exotic', 'Collecting a level-seven specimen must not use level-one eligibility');
  assert.deepEqual(restoreGarden(garden, 7, () => { throw new Error('RNG must not be used'); }), garden);
});

test('ineligible legacy active seeds reroll but previous discoveries remain intact', () => {
  const garden = collectActivePlant(initGarden(7, null, () => 0.99), 5000, 7);
  const migrated = restoreGarden(garden, 1, () => 0);
  assert.equal(rarity(migrated), 'common');
  assert.deepEqual(migrated.collection, garden.collection);
  assert.equal(migrated.totalGrown, 1);
  assert.deepEqual(restoreGarden(garden, 1, () => { throw new Error('An awarded display must not reroll'); }, { preserveAwardedPlant: true }), garden);
  const unawarded = restoreGarden({ ...garden, collection: [] }, 1, () => 0, { preserveAwardedPlant: true });
  assert.equal(rarity(unawarded), 'common', 'Preserving a completed display requires a valid existing discovery');
  assert.equal(unawarded.totalGrown, 0);
});

test('damaged entries cannot corrupt valid discoveries or overflow the saved total', () => {
  const plantId = PLANTS[0].id;
  const garden = restoreGarden({
    activePlantId: plantId,
    totalGrown: Infinity,
    collection: [
      { plantId, count: 2, firstCollectedAt: 5000 },
      { plantId: PLANTS[1].id, count: 1, firstCollectedAt: 'bad' },
      { plantId: PLANTS[2].id, count: -1, firstCollectedAt: 1000 },
      { plantId: 'unknown', count: 9, firstCollectedAt: 1000 },
      { plantId: PLANTS[3].id, count: 0, firstCollectedAt: 1000 },
      { plantId: PLANTS[4].id, count: NaN, firstCollectedAt: 1000 },
    ],
  });
  assert.equal(garden.totalGrown, 3);
  assert.equal(garden.collection.length, 2);
  assert.equal(garden.collection[1].firstCollectedAt, 0);
  const full = restoreGarden({ activePlantId: plantId, collection: [{ plantId, count: Number.MAX_SAFE_INTEGER, firstCollectedAt: 1 }] });
  assert.equal(collectActivePlant(full, 2, 1).totalGrown, Number.MAX_SAFE_INTEGER);
});
