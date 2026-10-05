import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECON_STORAGE_KEY,
  createEconomicsProgress,
  submitEconomicsResult,
  giveUpEconomicsQuestion,
  advanceEconomicsQuestion,
  restoreEconomicsProgress,
  economicsScoreSnapshot,
  mergeModuleGardens,
  combinedScoreSnapshot,
} from '../src/economics-progress.js';
import { STORAGE_KEY, createProgress, submitResult, advanceQuestion, restoreProgress, scoreSnapshot, useTutorHelp } from '../src/progress.js';
import { PLANTS } from '../src/plants.js';

const rng = () => 0;
const exists = (id) => /^econ-\d+$/.test(id);
const create = () => createEconomicsProgress('econ-1', 1000, null, rng);
const restore = (state) => restoreEconomicsProgress(JSON.stringify(state), exists, { rng });
const next = (state, correct, id) => advanceEconomicsQuestion(submitEconomicsResult(state, correct, { now: 2000 }), id, 3000, rng);

test('economics starts independently with no score, discoveries, selections, or timer', () => {
  const state = create();
  assert.equal(ECON_STORAGE_KEY, 'wnam-economics-v1');
  assert.notEqual(ECON_STORAGE_KEY, STORAGE_KEY);
  assert.deepEqual(state.answer, {});
  assert.equal(state.deadline, null);
  assert.equal(state.level, 1);
  assert.equal(state.streak, 0);
  assert.deepEqual(economicsScoreSnapshot(state), { plantsGrown: 0, correctAnswers: 0, uniquePlants: 0, highestLevel: 1, plantIds: [], collectionScore: 0 });
  assert.deepEqual(restore(state), state);
});

test('a whole scenario increments the streak once; mistakes and giving up preserve its level', () => {
  let state = create();
  state = next(state, true, 'econ-2');
  state = next(state, true, 'econ-3');
  assert.equal(state.streak, 2);
  const wrong = submitEconomicsResult(state, false);
  assert.equal(wrong.streak, 0);
  assert.equal(wrong.correct, 2);
  assert.equal(wrong.attempts, 3);
  assert.equal(wrong.garden.totalGrown, 0);
  const levelFour = { ...state, level: 4, correct: 11, attempts: 11 };
  const givenUp = giveUpEconomicsQuestion(levelFour);
  assert.equal(givenUp.level, 4);
  assert.equal(givenUp.streak, 0);
  assert.equal(givenUp.correct, 11);
  assert.equal(givenUp.attempts, 12);
  assert.deepEqual(givenUp.result, { kind: 'given-up', levelUp: false, finished: false });
  assert.deepEqual(givenUp.garden, state.garden);
  assert.equal(giveUpEconomicsQuestion(givenUp), givenUp);
  assert.equal(submitEconomicsResult(givenUp, true), givenUp);
  assert.deepEqual(restore(givenUp), givenUp);
});

test('economics tutor help keeps scenario choices and lifetime totals while resetting the streak', () => {
  let state = next(next(create(), true, 'econ-2'), true, 'econ-3');
  state = { ...state, answer: { demand: 'right', price: 'up' } };
  const saved = structuredClone(state);
  const helped = useTutorHelp(state);
  assert.deepEqual(helped, { ...saved, streak: 0 });
  assert.deepEqual(state, saved);
  assert.deepEqual(restore(helped), helped);
  assert.deepEqual(economicsScoreSnapshot(helped), economicsScoreSnapshot(state));
  assert.equal(helped.deadline, null);
  assert.equal(submitEconomicsResult(helped, true).streak, 1);
});

test('economics help after correct answers preserves earned milestones across reloads', () => {
  for (const level of [1, 7]) {
    for (const priorStreak of [0, 2]) {
      const state = { ...create(), level, streak: priorStreak, correct: 20, attempts: 20, answer: { price: 'up' } };
      const answered = submitEconomicsResult(state, true, { now: 5000 });
      const helped = useTutorHelp(answered);
      assert.equal(helped.streak, 0);
      assert.equal(helped.result.streakBeforeHelp, priorStreak + 1);
      assert.deepEqual(restore(helped), helped);
      assert.deepEqual(helped.garden, answered.garden);
      assert.deepEqual(economicsScoreSnapshot(helped), economicsScoreSnapshot(answered));
      assert.equal(submitEconomicsResult(helped, true), helped);
      const nextState = advanceEconomicsQuestion(restore(helped), 'econ-2', 6000, rng);
      assert.equal(nextState.streak, 0);
      assert.equal(nextState.deadline, null);
      assert.equal(nextState.level, level + Number(answered.result.levelUp));
      assert.equal(nextState.garden.totalGrown, Number(priorStreak === 2));
      assert.equal(nextState.completed, level === 7 && priorStreak === 2);
    }
  }
});

test('economics restore rejects inconsistent help markers', () => {
  const helped = useTutorHelp(submitEconomicsResult(create(), true));
  for (const streakBeforeHelp of [null, 0, 1.5, 2, 4, '1']) {
    assert.equal(restore({ ...helped, result: { ...helped.result, streakBeforeHelp } }), null);
  }
  assert.equal(restore({ ...helped, streak: 1 }), null);
  assert.equal(restore({ ...helped, result: { kind: 'correct', levelUp: false, finished: false } }), null);
  assert.equal(restore({ ...helped, result: { ...helped.result, kind: 'given-up' } }), null);
  assert.equal(restore({ ...helped, result: { ...helped.result, levelUp: true } }), null);
});

test('third correct answer collects a plant once and advances only after continuing', () => {
  let state = next(next(create(), true, 'econ-2'), true, 'econ-3');
  state.answer = { demand: 'right', price: 'up', reason: 'a' };
  const answered = submitEconomicsResult(state, true, { now: 4000 });
  assert.equal(answered.level, 1);
  assert.equal(answered.streak, 3);
  assert.equal(answered.result.levelUp, true);
  assert.deepEqual(answered.garden.collection, [{ plantId: state.garden.activePlantId, count: 1, firstCollectedAt: 4000 }]);
  assert.equal(state.garden.totalGrown, 0, 'The prior state is unchanged');
  assert.equal(submitEconomicsResult(answered, true), answered);
  const reloaded = restore(answered);
  assert.deepEqual(reloaded, answered);
  assert.equal(submitEconomicsResult(reloaded, true), reloaded);
  const continued = advanceEconomicsQuestion(reloaded, 'econ-4', 5000, rng);
  assert.equal(continued.level, 2);
  assert.equal(continued.streak, 0);
  assert.equal(continued.deadline, null);
  assert.deepEqual(continued.answer, {});
  assert.equal(continued.garden.activePlantId, answered.garden.activePlantId, 'Independent rolls can repeat the previous species');
  assert.deepEqual(continued.garden.collection, answered.garden.collection);
});

test('all seven levels stay untimed, survive reload, and complete after 21 correct scenarios', () => {
  let state = create();
  for (let index = 1; index <= 21; index += 1) {
    assert.equal(state.deadline, null);
    state = submitEconomicsResult(state, true, { now: index * 1000 });
    assert.deepEqual(restore(state), state);
    assert.equal(state.deadline, null);
    if (index < 21) {
      state = advanceEconomicsQuestion(state, `econ-${index + 1}`, index * 1000, rng);
      assert.equal(state.level, Math.floor(index / 3) + 1);
      assert.equal(state.deadline, null);
      assert.deepEqual(restore(state), state);
    }
  }
  assert.equal(state.completed, true);
  assert.equal(state.streak, 3);
  assert.equal(state.garden.totalGrown, 7);
  assert.deepEqual(state.lifetime, { correctAnswers: 21, highestLevel: 7 });
  assert.equal(submitEconomicsResult(state, true), state);
  assert.equal(giveUpEconomicsQuestion(state), state);
  assert.equal(advanceEconomicsQuestion(state, 'econ-22'), state);
  assert.equal(state.history.length, 12);
});

test('restarting economics preserves only its own plants and lifetime achievements', () => {
  let state = next(next(next(create(), true, 'econ-2'), true, 'econ-3'), true, 'econ-4');
  state = next(state, true, 'econ-5');
  const restarted = createEconomicsProgress('econ-1', 10000, state.garden, rng, state.lifetime);
  assert.equal(restarted.level, 1);
  assert.equal(restarted.correct, 0);
  assert.equal(restarted.attempts, 0);
  assert.equal(restarted.streak, 0);
  assert.equal(restarted.deadline, null);
  assert.deepEqual(restarted.answer, {});
  assert.deepEqual(restarted.garden.collection, state.garden.collection);
  assert.deepEqual(economicsScoreSnapshot(restarted), { plantsGrown: 1, correctAnswers: 4, uniquePlants: 1, highestLevel: 2, plantIds: [PLANTS[0].id], collectionScore: 1 });
  assert.equal(economicsScoreSnapshot(submitEconomicsResult(restarted, true)).correctAnswers, 5);
});

test('pending qualitative selections restore unchanged and cannot become a math session', () => {
  const state = { ...create(), answer: { demand: 'unchanged', supply: 'left', price: 'up', reason: 'b' } };
  const restored = restore(state);
  assert.deepEqual(restored, state);
  assert.notEqual(restored.answer, state.answer);
  assert.equal(restoreProgress(JSON.stringify(state), exists), null);
  assert.equal(restore(createProgress('econ-1')), null);
  assert.equal(restore({ ...create(), questionId: 'easy-1' }), null);
});

test('restore rejects corrupt or inconsistent learning state, including all timeout data', () => {
  for (const raw of [null, undefined, '', '{', 'null', '[]', '42']) {
    assert.equal(restoreEconomicsProgress(raw, exists), null);
  }
  const invalid = [
    { version: 2 }, { level: 0 }, { level: 8 }, { level: 1.5 },
    { streak: -1 }, { streak: 3 }, { correct: 1 }, { attempts: -1 },
    { answer: null }, { answer: [] }, { answer: '' }, { answer: { price: null } },
    { answer: { reason: {} } }, { answer: { reason: 'a'.repeat(129) } },
    { answer: { constructor: 'a' } },
    { deadline: 120000 }, { level: 2, deadline: 120000 }, { completed: true },
    { history: ['missing'] }, { history: Array(13).fill('econ-1') },
    { attempts: 1, result: { kind: 'incorrect', levelUp: true, finished: false } },
    { attempts: 1, result: { kind: 'timeout', levelUp: false, finished: false } },
    { attempts: 1, result: { kind: 'given-up', levelUp: false, finished: true } },
  ];
  for (const patch of invalid) assert.equal(restore({ ...create(), ...patch }), null, JSON.stringify(patch));
  assert.equal(restoreEconomicsProgress(JSON.stringify(create()), () => { throw new Error('unavailable'); }), null);
});

test('broken garden and lifetime fields are repaired independently of the saved scenario', () => {
  const state = { ...create(), level: 3, streak: 1, correct: 7, attempts: 9, answer: { price: 'down' } };
  const restored = restore({ ...state, lifetime: false, garden: {
    activePlantId: 'missing', totalGrown: 'broken', collection: [
      { plantId: PLANTS[0].id, count: 2, firstCollectedAt: 3000 },
      { plantId: PLANTS[0].id, count: 1, firstCollectedAt: 1000 },
      { plantId: 'missing', count: 90, firstCollectedAt: 0 }, null,
    ],
  } });
  assert.equal(restored.level, 3);
  assert.equal(restored.streak, 1);
  assert.equal(restored.deadline, null);
  assert.deepEqual(restored.answer, state.answer);
  assert.equal(restored.garden.totalGrown, 3);
  assert.deepEqual(restored.garden.collection, [{ plantId: PLANTS[0].id, count: 3, firstCollectedAt: 1000 }]);
  assert.deepEqual(restored.lifetime, { correctAnswers: 9, highestLevel: 3 });
  for (const garden of [null, false, [], 'broken']) {
    const repaired = restore({ ...state, garden });
    assert.equal(repaired.correct, 7);
    assert.equal(repaired.garden.totalGrown, 0);
  }
});

test('collection union sums duplicates, preserves earliest discoveries, and never mutates module gardens', () => {
  const one = { activePlantId: PLANTS[0].id, collection: [
    { plantId: PLANTS[0].id, count: 2, firstCollectedAt: 3000 },
    { plantId: PLANTS[1].id, count: 1, firstCollectedAt: 2000 },
  ], totalGrown: 3 };
  const two = { activePlantId: PLANTS[2].id, collection: [
    { plantId: PLANTS[0].id, count: 1, firstCollectedAt: 1000 },
    { plantId: PLANTS[2].id, count: 1, firstCollectedAt: 4000 },
  ], totalGrown: 2 };
  const originals = structuredClone([one, two]);
  const union = mergeModuleGardens(one, two, null);
  assert.equal(union.totalGrown, 5);
  assert.deepEqual(union.collection, [
    { plantId: PLANTS[0].id, count: 3, firstCollectedAt: 1000 },
    { plantId: PLANTS[1].id, count: 1, firstCollectedAt: 2000 },
    { plantId: PLANTS[2].id, count: 1, firstCollectedAt: 4000 },
  ]);
  assert.deepEqual([one, two], originals);
  assert.deepEqual(mergeModuleGardens().collection, []);
});

test('combined leaderboard totals sum independent lifetimes and count shared species once', () => {
  const firstPlant = PLANTS[0].id;
  const math = { ...createProgress('easy-1'), level: 5, lifetime: { correctAnswers: 41, highestLevel: 7 }, garden: {
    activePlantId: firstPlant, collection: [{ plantId: firstPlant, count: 3, firstCollectedAt: 2000 }], totalGrown: 3,
  } };
  const economics = { ...create(), lifetime: { correctAnswers: 14, highestLevel: 4 }, garden: {
    activePlantId: firstPlant, collection: [{ plantId: firstPlant, count: 2, firstCollectedAt: 1000 }], totalGrown: 2,
  } };
  const originals = structuredClone([math, economics]);
  assert.deepEqual(combinedScoreSnapshot(math, economics), { plantsGrown: 5, correctAnswers: 55, uniquePlants: 1, highestLevel: 7, plantIds: [PLANTS[0].id], collectionScore: 1 });
  assert.deepEqual(combinedScoreSnapshot(math, null, create()), scoreSnapshot(math));
  assert.deepEqual(combinedScoreSnapshot(), { plantsGrown: 0, correctAnswers: 0, uniquePlants: 0, highestLevel: 1, plantIds: [], collectionScore: 0 });
  assert.deepEqual([math, economics], originals);
});

test('combined counters saturate safely and ignore malformed collection entries', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const state = { ...create(), lifetime: { correctAnswers: max, highestLevel: 7 }, garden: {
    activePlantId: PLANTS[0].id,
    collection: [{ plantId: PLANTS[0].id, count: max, firstCollectedAt: 1000 }, { plantId: 'missing', count: 10 }],
    totalGrown: max,
  } };
  assert.deepEqual(combinedScoreSnapshot(state, state), { plantsGrown: max, correctAnswers: max, uniquePlants: 1, highestLevel: 7, plantIds: [PLANTS[0].id], collectionScore: 1 });
  const otherSpecies = { ...create(), garden: {
    activePlantId: PLANTS[1].id,
    collection: [{ plantId: PLANTS[1].id, count: 1, firstCollectedAt: 2000 }],
    totalGrown: 1,
  } };
  assert.deepEqual(combinedScoreSnapshot(state, otherSpecies), { plantsGrown: max, correctAnswers: max, uniquePlants: 2, highestLevel: 7, plantIds: [PLANTS[0].id, PLANTS[1].id], collectionScore: 2 });
  assert.equal(mergeModuleGardens(state.garden, otherSpecies.garden).collection.length, 2);
});

test('economics gameplay leaves existing math timers, streaks, and storage untouched', () => {
  let math = createProgress('q1', 1000, null, rng);
  for (let index = 2; index <= 4; index += 1) math = advanceQuestion(submitResult(math, true), `q${index}`, 1000, rng);
  const savedMath = JSON.stringify(math);
  assert.equal(math.level, 2);
  assert.equal(math.deadline, 121000);
  let economics = create();
  for (let index = 2; index <= 4; index += 1) economics = next(economics, true, `econ-${index}`);
  assert.equal(economics.level, 2);
  assert.equal(economics.deadline, null);
  assert.equal(economics.garden.totalGrown, 1);
  assert.equal(math.garden.totalGrown, 1);
  combinedScoreSnapshot(math, economics);
  mergeModuleGardens(math.garden, economics.garden);
  assert.equal(JSON.stringify(math), savedMath);
  assert.deepEqual(restoreProgress(savedMath, (id) => /^q\d+$/.test(id)), math);
});


test('a shared discovery scores once across modules, including duplicate Exotic specimens', () => {
  const exotic = PLANTS.find((plant) => plant.rarity === 'exotic');
  const make = (count) => ({ ...create(), level: 7, garden: {
    activePlantId: exotic.id, totalGrown: count,
    collection: [{ plantId: exotic.id, count, firstCollectedAt: 1000 }],
  } });
  const merged = combinedScoreSnapshot(make(2), make(3));
  assert.equal(merged.plantsGrown, 5);
  assert.equal(merged.uniquePlants, 1);
  assert.equal(merged.collectionScore, 100);
  assert.deepEqual(merged.plantIds, [exotic.id]);
});

test('economics repairs an ineligible pending plant but preserves earned legacy discoveries', () => {
  const uncommon = PLANTS.find((plant) => plant.rarity === 'uncommon');
  const pending = { ...create(), garden: { activePlantId: uncommon.id, totalGrown: 1,
    collection: [{ plantId: uncommon.id, count: 1, firstCollectedAt: 1000 }],
  } };
  const repaired = restore(pending);
  assert.equal(PLANTS.find((plant) => plant.id === repaired.garden.activePlantId).rarity, 'common');
  assert.deepEqual(repaired.garden.collection, pending.garden.collection);
  const completed = { ...pending, correct: 3, attempts: 3, streak: 3, result: { kind: 'correct', levelUp: true, finished: false } };
  assert.equal(restore(completed).garden.activePlantId, uncommon.id);
});
