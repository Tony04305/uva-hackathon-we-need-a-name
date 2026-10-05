import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createProgress, submitResult, advanceQuestion, restoreProgress, scoreSnapshot, giveUpQuestion, canRevealAnswer, useTutorHelp } from '../src/progress.js';
import { PLANTS } from '../src/plants.js';
import { initGarden } from '../src/garden.js';

const exists = (id) => /^q\d+$/.test(id);
const restore = (state) => restoreProgress(JSON.stringify(state), exists);

test('solutions unlock only after submission or explicitly giving up, never a timeout alone', () => {
  const fresh = createProgress('q1');
  assert.equal(canRevealAnswer(fresh), false);
  assert.equal(canRevealAnswer(submitResult(fresh, true)), true);
  assert.equal(canRevealAnswer(submitResult(fresh, false)), true);
  const timeout = submitResult({ ...fresh, level: 2, deadline: 120000 }, false, { timedOut: true });
  assert.equal(canRevealAnswer(timeout), false);
  const revealed = giveUpQuestion(timeout);
  assert.equal(canRevealAnswer(revealed), true);
  assert.equal(revealed.attempts, timeout.attempts);
  assert.ok(restore(revealed));
});

test('giving up resets a streak without losing a level or awarding a plant', () => {
  const initial = { ...createProgress('q1'), level: 3, streak: 2, correct: 8, attempts: 8 };
  const revealed = giveUpQuestion(initial);
  assert.equal(revealed.result.kind, 'given-up');
  assert.equal(revealed.streak, 0);
  assert.equal(revealed.level, 3);
  assert.equal(revealed.correct, 8);
  assert.equal(revealed.attempts, 9);
  assert.deepEqual(revealed.garden, initial.garden);
  assert.equal(scoreSnapshot(revealed).correctAnswers, scoreSnapshot(initial).correctAnswers);
  assert.equal(giveUpQuestion(revealed), revealed);
  assert.equal(submitResult(revealed, true), revealed);
  const restored = restore(revealed);
  assert.equal(canRevealAnswer(restored), true);
  const next = advanceQuestion(restored, 'q2');
  assert.equal(canRevealAnswer(next), false);
  assert.equal(next.level, 3);
  assert.equal(next.streak, 0);
});

test('asking the tutor resets only the current streak and does not extend a timed question', () => {
  let state = createProgress('q1', 1000, null, () => 0);
  for (let id = 2; id <= 6; id += 1) state = answerAndAdvance(state, true, `q${id}`, 1000);
  state = { ...state, answer: '\\frac{1}{x}' };
  assert.equal(state.level, 2);
  assert.equal(state.streak, 2);
  const saved = structuredClone(state);
  const helped = useTutorHelp(state);
  assert.deepEqual(helped, { ...saved, streak: 0 });
  assert.deepEqual(state, saved, 'The previous state is not mutated');
  assert.deepEqual(restore(helped), helped);
  assert.equal(canRevealAnswer(helped), false, 'A hint does not reveal the solution');
  assert.equal(useTutorHelp(helped), helped, 'Repeated help at zero is idempotent');
  const answered = submitResult(helped, true);
  assert.equal(answered.streak, 1);
  assert.equal(answered.garden.totalGrown, state.garden.totalGrown);
});

test('help after a correct answer survives reload and the next question starts at zero', () => {
  const answered = submitResult(createProgress('q1', 1000, null, () => 0), true);
  const helped = useTutorHelp(answered);
  assert.equal(helped.streak, 0);
  assert.deepEqual(helped.result, { kind: 'correct', levelUp: false, finished: false, streakBeforeHelp: 1 });
  assert.deepEqual(scoreSnapshot(helped), scoreSnapshot(answered));
  assert.equal(canRevealAnswer(helped), true);
  assert.deepEqual(restore(helped), helped);
  assert.equal(submitResult(helped, true), helped, 'Help cannot make a submitted answer count twice');
  const next = advanceQuestion(restore(helped), 'q2', 2000);
  assert.equal(next.streak, 0);
  assert.equal(next.result, null);
  assert.equal(submitResult(next, true).streak, 1);
});

test('help after earning a plant preserves the reward and pending level-up through reload', () => {
  let state = createProgress('q1', 1000, null, () => 0);
  state = answerAndAdvance(state, true, 'q2');
  state = answerAndAdvance(state, true, 'q3');
  const awarded = submitResult(state, true, { now: 5000 });
  const helped = useTutorHelp(awarded);
  assert.equal(helped.streak, 0);
  assert.equal(helped.result.streakBeforeHelp, 3);
  assert.equal(helped.result.levelUp, true);
  assert.deepEqual(helped.garden, awarded.garden);
  assert.deepEqual(restore(helped), helped);
  assert.equal(useTutorHelp(helped), helped);
  const next = advanceQuestion(restore(helped), 'q4', 6000, () => 0);
  assert.equal(next.level, 2);
  assert.equal(next.streak, 0);
  assert.equal(next.deadline, 126000);
  assert.equal(next.garden.totalGrown, 1);
  assert.deepEqual(next.garden.collection, awarded.garden.collection);

  const oldSpecies = PLANTS.find((plant) => plant.rarity === 'exotic').id;
  const legacy = { ...helped, garden: {
    activePlantId: oldSpecies, collection: [{ plantId: oldSpecies, count: 1, firstCollectedAt: 5000 }], totalGrown: 1,
  } };
  assert.equal(restore(legacy).garden.activePlantId, oldSpecies, 'Previously awarded legacy species stays visible');
});

test('help after level-seven completion keeps completion and collected plants at zero streak', () => {
  const base = { ...createProgress('q1', 1000, null, () => 0), level: 7, streak: 2, correct: 20, attempts: 20 };
  const finished = submitResult(base, true, { now: 5000 });
  const helped = useTutorHelp(finished);
  assert.equal(helped.streak, 0);
  assert.equal(helped.completed, true);
  assert.equal(helped.result.finished, true);
  assert.deepEqual(restore(helped), helped);
  assert.deepEqual(scoreSnapshot(helped), scoreSnapshot(finished));
  assert.equal(advanceQuestion(helped, 'q2'), helped);
  assert.equal(submitResult(helped, true), helped);
});

test('restore rejects inconsistent help markers without accepting zero-streak correct results', () => {
  const helped = useTutorHelp(submitResult(createProgress('q1'), true));
  for (const streakBeforeHelp of [null, 0, 1.5, 2, 4, '1']) {
    assert.equal(restore({ ...helped, result: { ...helped.result, streakBeforeHelp } }), null);
  }
  assert.equal(restore({ ...helped, streak: 1 }), null);
  assert.equal(restore({ ...helped, result: { kind: 'correct', levelUp: false, finished: false } }), null);
  assert.equal(restore({ ...helped, result: { ...helped.result, kind: 'incorrect' } }), null);
  assert.equal(restore({ ...helped, result: { ...helped.result, levelUp: true } }), null);
});

function answerAndAdvance(state, correct, id, now = 1000) {
  return advanceQuestion(submitResult(state, correct), id, now);
}

test('new progress starts at level one with no timer', () => {
  assert.equal(STORAGE_KEY, 'wnam-differentiation-v1');
  const { garden, ...progress } = createProgress('q1', 1000, null, () => 0);
  assert.deepEqual(progress, {
    version: 1, level: 1, streak: 0, questionId: 'q1', deadline: null,
    result: null, completed: false, correct: 0, attempts: 0, history: [], answer: '',
    lifetime: { correctAnswers: 0, highestLevel: 1 },
  });
  assert.deepEqual(garden, { activePlantId: PLANTS.find((plant) => plant.rarity === 'common').id, collection: [], totalGrown: 0 });
});

test('incorrect answers reset a streak and next questions preserve an unfinished streak', () => {
  let state = createProgress('q1');
  state = answerAndAdvance(state, true, 'q2');
  state = answerAndAdvance(state, true, 'q3');
  assert.equal(state.streak, 2);
  state = submitResult(state, false);
  assert.equal(state.streak, 0);
  assert.equal(state.correct, 2);
  assert.equal(state.lifetime.correctAnswers, 2);
  assert.equal(state.attempts, 3);
  assert.equal(state.garden.totalGrown, 0);
  assert.deepEqual(state.result, { kind: 'incorrect', levelUp: false, finished: false });
});

test('a third consecutive correct answer advances only when continuing and starts the timed level', () => {
  let state = createProgress('q1');
  state = answerAndAdvance(state, true, 'q2');
  state = answerAndAdvance(state, true, 'q3');
  const answered = submitResult(state, true);
  assert.equal(answered.level, 1);
  assert.equal(answered.streak, 3);
  assert.equal(answered.result.levelUp, true);
  assert.deepEqual(answered.lifetime, { correctAnswers: 3, highestLevel: 1 });
  assert.equal(answered.completed, false);
  assert.equal(answered.garden.activePlantId, state.garden.activePlantId);
  assert.equal(answered.garden.totalGrown, 1);
  assert.equal(state.garden.totalGrown, 0, 'Rewarding must not mutate the previous state');
  const next = advanceQuestion(answered, 'q4', 5000);
  assert.equal(next.level, 2);
  assert.deepEqual(next.lifetime, { correctAnswers: 3, highestLevel: 2 });
  assert.equal(next.streak, 0);
  assert.equal(next.deadline, 125000);
  assert.deepEqual(next.garden.collection, answered.garden.collection);
  assert.deepEqual(next.history, ['q1', 'q2', 'q3']);
});

test('submissions are pure and duplicate submissions do not award extra credit', () => {
  const original = Object.freeze({ ...createProgress('q1'), history: Object.freeze([]) });
  const answered = submitResult(original, true);
  assert.equal(original.attempts, 0);
  assert.equal(original.lifetime.correctAnswers, 0);
  assert.equal(answered.lifetime.correctAnswers, 1);
  assert.equal(submitResult(answered, true), answered);
  assert.equal(submitResult(answered, false, { timedOut: true }), answered);
  assert.equal(submitResult(answered, true).lifetime.correctAnswers, 1);
  assert.equal(advanceQuestion(original, 'q2', 1000), original);
});

test('timeouts reset the streak and a new timed question gets a fresh deadline', () => {
  const timed = { ...createProgress('q1'), level: 2, streak: 2, correct: 5, attempts: 5, deadline: 120000, lifetime: { correctAnswers: 15, highestLevel: 4 } };
  const expired = submitResult(timed, true, { timedOut: true });
  assert.deepEqual(expired.result, { kind: 'timeout', levelUp: false, finished: false });
  assert.equal(expired.streak, 0);
  assert.equal(expired.correct, 5);
  assert.equal(expired.attempts, 6);
  assert.deepEqual(expired.lifetime, timed.lifetime);
  const next = advanceQuestion({ ...expired, answer: 'x^2' }, 'q2', 150000);
  assert.equal(next.level, 2);
  assert.equal(next.deadline, 270000);
  assert.equal(next.answer, '');
  assert.deepEqual(next.garden, timed.garden, 'A failed streak keeps the same plant');
});

test('all seven levels alternate timers and complete after 21 consecutive correct answers', () => {
  let state = createProgress('q1');
  for (let index = 1; index <= 21; index += 1) {
    state = submitResult(state, true);
    assert.ok(restore(state));
    if (index < 21) {
      state = advanceQuestion(state, `q${index + 1}`, index * 1000);
      assert.equal(state.deadline, [2, 4, 6].includes(state.level) ? index * 1000 + 120000 : null);
      assert.ok(restore(state));
    }
  }
  assert.equal(state.level, 7);
  assert.equal(state.streak, 3);
  assert.equal(state.correct, 21);
  assert.deepEqual(state.lifetime, { correctAnswers: 21, highestLevel: 7 });
  assert.equal(state.attempts, 21);
  assert.equal(state.completed, true);
  assert.equal(state.garden.totalGrown, 7);
  assert.ok(PLANTS.some((plant) => plant.id === state.garden.activePlantId));
  assert.deepEqual(state.result, { kind: 'correct', levelUp: false, finished: true });
  assert.equal(advanceQuestion(state, 'q22', 50000), state);
  assert.equal(submitResult(state, true), state);
  assert.deepEqual(state.history, Array.from({ length: 12 }, (_, index) => `q${index + 9}`));
});

test('restore keeps saved input and expired timer deadlines without extending time', () => {
  const state = { ...createProgress('q1'), level: 2, deadline: 1000, answer: '\\frac{1}{x}', lifetime: { correctAnswers: 0, highestLevel: 2 } };
  assert.deepEqual(restore(state), state);
  const fresh = createProgress('q1');
  assert.deepEqual(restore(fresh), fresh);
});

test('restore rejects malformed storage and unrecognized questions safely', () => {
  for (const raw of [null, undefined, '', '{', 'null', '[]', '42']) {
    assert.equal(restoreProgress(raw, exists), null);
  }
  assert.equal(restore({ ...createProgress('q1'), questionId: 'missing' }), null);
  assert.equal(restoreProgress(JSON.stringify(createProgress('q1')), () => { throw new Error('unavailable'); }), null);
});

test('restore rejects malformed timers, counters, levels, history, and result flags', () => {
  const state = createProgress('q1');
  const invalid = [
    { version: 2 }, { level: 0 }, { level: 8 }, { level: 1.5 },
    { streak: -1 }, { streak: 3 }, { correct: 1 }, { attempts: -1 },
    { answer: null }, { deadline: 120000 }, { completed: true },
    { history: ['missing'] }, { history: Array(13).fill('q1') },
    { level: 2, deadline: null }, { level: 4, deadline: '120000' },
    { level: 6, deadline: -1 },
    { attempts: 1, result: { kind: 'incorrect', levelUp: true, finished: false } },
    { attempts: 1, result: { kind: 'timeout', levelUp: false, finished: false } },
  ];
  for (const patch of invalid) assert.equal(restore({ ...state, ...patch }), null, JSON.stringify(patch));
});

test('a plant is collected once at the third answer and never again on restore or repeated submission', () => {
  let state = createProgress('q1', 1000, null, () => 0);
  state = answerAndAdvance(state, true, 'q2');
  state = answerAndAdvance(state, true, 'q3');
  assert.equal(state.garden.totalGrown, 0);
  const grown = submitResult(state, true, { now: 8000 });
  assert.deepEqual(grown.garden.collection, [{ plantId: state.garden.activePlantId, count: 1, firstCollectedAt: 8000 }]);
  const reloaded = restore(grown);
  assert.equal(reloaded.lifetime.correctAnswers, 3);
  assert.equal(submitResult(reloaded, true), reloaded);
  assert.equal(submitResult(reloaded, false, { timedOut: true }), reloaded);
  const continued = advanceQuestion(reloaded, 'q4', 9000, () => 0);
  assert.equal(continued.garden.totalGrown, 1);
  assert.equal(continued.garden.activePlantId, PLANTS[0].id, 'Repeating a species is permitted at the next level');
});

test('practice again keeps discoveries and lifetime scores while resetting the module', () => {
  let state = createProgress('q1', 1000, null, () => 0);
  state = answerAndAdvance(state, true, 'q2');
  state = answerAndAdvance(state, true, 'q3');
  state = submitResult(state, true, { now: 5000 });
  state = advanceQuestion(state, 'q4', 6000, () => 0);
  state = answerAndAdvance(state, true, 'q5');
  const restarted = createProgress('q1', 10000, state.garden, () => 0, state.lifetime);
  assert.deepEqual(restarted.garden.collection, state.garden.collection);
  assert.equal(restarted.garden.totalGrown, 1);
  assert.equal(restarted.garden.activePlantId, PLANTS[0].id);
  assert.equal(restarted.level, 1);
  assert.equal(restarted.streak, 0);
  assert.equal(restarted.correct, 0);
  assert.equal(restarted.deadline, null);
  assert.deepEqual(restarted.lifetime, { correctAnswers: 4, highestLevel: 2 });
  assert.deepEqual(scoreSnapshot(restarted), { plantsGrown: 1, correctAnswers: 4, uniquePlants: 1, highestLevel: 2, plantIds: [PLANTS[0].id], collectionScore: 1 });
  const answered = submitResult(restarted, true);
  assert.equal(answered.correct, 1);
  assert.deepEqual(answered.lifetime, { correctAnswers: 5, highestLevel: 2 });
});

test('legacy saves retain their current level, typed answer, and deadline without retroactive rewards', () => {
  const { garden, lifetime, ...legacy } = { ...createProgress('q1'), level: 4, streak: 2, correct: 11, attempts: 13, deadline: 1000, answer: '2x' };
  const migrated = restoreProgress(JSON.stringify(legacy), exists, { rng: () => 0.99 });
  assert.deepEqual((( { garden, lifetime, ...progress }) => progress)(migrated), legacy);
  assert.deepEqual(migrated.lifetime, { correctAnswers: 11, highestLevel: 4 });
  assert.equal(migrated.garden.totalGrown, 0);
  assert.equal(PLANTS.find((plant) => plant.id === migrated.garden.activePlantId).rarity, 'rare');
  assert.deepEqual(restore(migrated), migrated, 'The migrated active plant persists');
});

test('legacy pending and completed milestones never duplicate a plant reward during migration', () => {
  for (const level of [1, 7]) {
    const base = { ...createProgress('q1'), level, streak: 2, correct: level * 3 - 1, attempts: level * 3 - 1 };
    const { garden, lifetime, ...legacy } = submitResult(base, true);
    const migrated = restore(legacy);
    assert.equal(migrated.streak, 3);
    assert.equal(migrated.completed, level === 7);
    assert.equal(migrated.garden.totalGrown, 0);
    assert.deepEqual(migrated.lifetime, { correctAnswers: level * 3, highestLevel: level });
    assert.equal(submitResult(migrated, true), migrated);
    assert.deepEqual(restore(migrated), migrated);
  }
});

test('malformed garden data is repaired without resetting usable progress or discoveries', () => {
  const plant = PLANTS[0];
  const original = { ...createProgress('q1'), level: 2, streak: 1, correct: 4, attempts: 6, deadline: 50000, answer: 'x' };
  const restored = restore({ ...original, garden: {
    activePlantId: 'removed-plant',
    collection: [
      { plantId: plant.id, count: 2, firstCollectedAt: 5000 },
      { plantId: 'missing', count: 100, firstCollectedAt: 2000 },
      { plantId: plant.id, count: 1, firstCollectedAt: 3000 },
      null,
    ],
    totalGrown: 'broken',
  } });
  assert.equal(restored.level, 2);
  assert.equal(restored.streak, 1);
  assert.equal(restored.deadline, 50000);
  assert.equal(restored.answer, 'x');
  assert.equal(restored.garden.totalGrown, 3);
  assert.deepEqual(restored.lifetime, { correctAnswers: 9, highestLevel: 2 });
  assert.deepEqual(restored.garden.collection, [{ plantId: plant.id, count: 3, firstCollectedAt: 3000 }]);
  assert.ok(PLANTS.some((item) => item.id === restored.garden.activePlantId));
  for (const garden of [null, false, [], 'corrupt']) {
    const repaired = restore({ ...original, garden });
    assert.equal(repaired.level, original.level);
    assert.equal(repaired.garden.totalGrown, 0);
  }
});

test('legacy collections across practice runs set a minimum lifetime correct count', () => {
  const state = createProgress('q1', 1000, null, () => 0);
  delete state.lifetime;
  state.garden.collection = [{ plantId: PLANTS[0].id, count: 5, firstCollectedAt: 1000 }];
  state.garden.totalGrown = 5;
  state.correct = 2;
  state.attempts = 4;
  const migrated = restore(state);
  assert.deepEqual(migrated.lifetime, { correctAnswers: 15, highestLevel: 1 });
  assert.deepEqual(scoreSnapshot(migrated), { plantsGrown: 5, correctAnswers: 15, uniquePlants: 1, highestLevel: 1, plantIds: [PLANTS[0].id], collectionScore: 1 });
  const restarted = createProgress('q1', 2000, migrated.garden, () => 0);
  assert.deepEqual(restarted.lifetime, { correctAnswers: 15, highestLevel: 1 });
});

test('restored lifetime best level survives lower-level practice and malformed scores are repaired independently', () => {
  const state = { ...createProgress('q1'), level: 4, correct: 12, attempts: 14, deadline: 1000, answer: '2x' };
  const valid = restore({ ...state, lifetime: { correctAnswers: 50, highestLevel: 7 } });
  assert.deepEqual(valid.lifetime, { correctAnswers: 50, highestLevel: 7 });
  const restarted = createProgress('q1', 2000, valid.garden, () => 0, valid.lifetime);
  assert.equal(restarted.lifetime.highestLevel, 7);
  for (const lifetime of [null, [], false, 'bad', {}, { correctAnswers: -1, highestLevel: 8 }, { correctAnswers: '50', highestLevel: 2.5 }, { correctAnswers: Number.MAX_SAFE_INTEGER + 1, highestLevel: 0 }]) {
    const repaired = restore({ ...state, lifetime });
    assert.deepEqual(repaired.lifetime, { correctAnswers: 12, highestLevel: 4 });
    assert.equal(repaired.level, 4);
    assert.equal(repaired.answer, '2x');
    assert.equal(repaired.deadline, 1000);
    assert.deepEqual(repaired.garden, state.garden);
  }
  assert.deepEqual(restore({ ...state, lifetime: { correctAnswers: 40, highestLevel: 'bad' } }).lifetime, { correctAnswers: 40, highestLevel: 4 });
  assert.deepEqual(restore({ ...state, lifetime: { correctAnswers: 'bad', highestLevel: 7 } }).lifetime, { correctAnswers: 12, highestLevel: 7 });
});

test('lifetime and session counters saturate safely without invalidating saved progress', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const state = {
    ...createProgress('q1'),
    correct: max,
    attempts: max,
    lifetime: { correctAnswers: max, highestLevel: 7 },
  };
  const answered = submitResult(state, true);
  assert.equal(answered.correct, max);
  assert.equal(answered.attempts, max);
  assert.equal(answered.lifetime.correctAnswers, max);
  assert.ok(restore(answered));
  const garden = { activePlantId: PLANTS[0].id, collection: [{ plantId: PLANTS[0].id, count: max, firstCollectedAt: 1000 }], totalGrown: max };
  const restarted = createProgress('q1', 2000, garden, () => 0);
  assert.equal(restarted.lifetime.correctAnswers, max);
  assert.ok(restore(restarted));
});

test('incorrect answers and duplicate restored answers never increase lifetime scores', () => {
  const state = createProgress('q1', 1000, null, () => 0, { correctAnswers: 25, highestLevel: 6 });
  const incorrect = submitResult(state, false);
  assert.deepEqual(incorrect.lifetime, state.lifetime);
  const correct = submitResult(state, true);
  const saved = restore(correct);
  assert.equal(saved.lifetime.correctAnswers, 26);
  assert.equal(submitResult(saved, true), saved);
  assert.equal(submitResult(saved, true).lifetime.correctAnswers, 26);
});

test('level-seven exotic rewards retain their species through collection and restoration', () => {
  const state = {
    ...createProgress('q1', 1000, null, () => 0),
    level: 7, streak: 2, correct: 20, attempts: 20,
    garden: initGarden(7, null, () => 0.99),
  };
  const selectedPlantId = state.garden.activePlantId;
  assert.equal(PLANTS.find((plant) => plant.id === selectedPlantId).rarity, 'exotic');
  const finished = submitResult(state, true, { now: 5000 });
  assert.equal(finished.garden.activePlantId, selectedPlantId);
  assert.deepEqual(finished.garden.collection, [{ plantId: selectedPlantId, count: 1, firstCollectedAt: 5000 }]);
  assert.equal(finished.completed, true);
  assert.deepEqual(restore(finished), finished);
  assert.equal(scoreSnapshot(finished).collectionScore, 100);
  assert.deepEqual(scoreSnapshot(finished).plantIds, [selectedPlantId]);
  const restarted = createProgress('q1', 6000, finished.garden, () => 0.99, finished.lifetime);
  assert.equal(PLANTS.find((plant) => plant.id === restarted.garden.activePlantId).rarity, 'common');
  assert.equal(scoreSnapshot(restarted).collectionScore, 100);
});

test('restoration migrates unfinished ineligible seeds while preserving earned legacy rewards', () => {
  const seed = {
    ...createProgress('q1', 1000, null, () => 0),
    streak: 2, correct: 2, attempts: 2, answer: '2x',
    garden: { activePlantId: 'campana-somnia', collection: [], totalGrown: 0 },
  };
  const migrated = restoreProgress(JSON.stringify(seed), exists, { rng: () => 0 });
  assert.equal(migrated.garden.activePlantId, PLANTS[0].id);
  assert.equal(migrated.streak, 2);
  assert.equal(migrated.answer, '2x');
  assert.equal(migrated.garden.totalGrown, 0);
  const legacyAward = {
    ...seed, streak: 3, correct: 3, attempts: 3,
    result: { kind: 'correct', levelUp: true, finished: false },
    garden: { activePlantId: 'campana-somnia', collection: [{ plantId: 'campana-somnia', count: 1, firstCollectedAt: 2000 }], totalGrown: 1 },
  };
  const preserved = restoreProgress(JSON.stringify(legacyAward), exists, { rng: () => { throw new Error('A completed reward should remain visible'); } });
  assert.equal(preserved.garden.activePlantId, 'campana-somnia');
  assert.deepEqual(preserved.garden.collection, legacyAward.garden.collection);
  assert.equal(scoreSnapshot(preserved).collectionScore, 3);
  assert.equal(submitResult(preserved, true), preserved);
});
