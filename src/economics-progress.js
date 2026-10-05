import {
  createProgress,
  submitResult,
  giveUpQuestion,
  advanceQuestion,
  scoreSnapshot,
} from './progress.js';
import { restoreGarden } from './garden.js';
import { collectionScore } from './rarities.js';
import { PLANTS } from './plants.js';
import { restoreEconomicsGrade } from './economics-grade.js';

export const ECON_STORAGE_KEY = 'wnam-economics-v1';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const isLevel = (value) => Number.isInteger(value) && value >= 1 && value <= 7;
const addCount = (first, second) => Math.min(Number.MAX_SAFE_INTEGER, first + second);

function validAnswer(answer) {
  if (!isRecord(answer)) return false;
  const entries = Object.entries(answer);
  return entries.length <= 16 && entries.every(([key, value]) => (
    /^[a-z][a-zA-Z0-9_-]{0,63}$/.test(key)
    && !['constructor', 'prototype'].includes(key)
    && typeof value === 'string'
    && value.length <= (key === 'explanation' ? 1600 : 128)
  ));
}

/** Pass only this module's previous garden and lifetime when restarting it. */
export function createEconomicsProgress(questionId, now = Date.now(), previousGarden = null, rng = Math.random, previousLifetime = null) {
  return {
    ...createProgress(questionId, now, previousGarden, rng, previousLifetime),
    answer: {},
  };
}

/** A complete scenario counts as one answer, regardless of its number of factors. */
export function submitEconomicsResult(state, correct, { now = Date.now() } = {}) {
  return submitResult(state, correct, { now });
}

export function giveUpEconomicsQuestion(state) {
  return giveUpQuestion(state);
}

/** All economics levels are untimed; moving on also clears the previous choices. */
export function advanceEconomicsQuestion(state, questionId, now = Date.now(), rng = Math.random) {
  const next = advanceQuestion(state, questionId, now, rng);
  if (next === state) return state;
  return { ...next, deadline: null, answer: {} };
}

export function economicsScoreSnapshot(state) {
  return scoreSnapshot(state);
}

/** Restore learning state strictly, repairing only optional garden/lifetime data. */
export function restoreEconomicsProgress(raw, questionExists, { rng = Math.random } = {}) {
  try {
    if (typeof raw !== 'string') return null;
    const state = JSON.parse(raw);
    if (!isRecord(state) || state.version !== 1 || !isLevel(state.level)) return null;
    if (!Number.isInteger(state.streak) || state.streak < 0 || state.streak > 3) return null;
    if (typeof state.questionId !== 'string' || !questionExists(state.questionId)) return null;
    if (!validAnswer(state.answer) || state.deadline !== null || typeof state.completed !== 'boolean') return null;
    if (!isCount(state.correct) || !isCount(state.attempts) || state.correct > state.attempts) return null;
    if (state.streak > state.correct) return null;
    if (!Array.isArray(state.history) || state.history.length > 12) return null;
    if (!state.history.every((id) => typeof id === 'string' && questionExists(id))) return null;

    if (state.result === null) {
      if (state.completed || state.streak === 3) return null;
    } else {
      const result = state.result;
      if (!isRecord(result) || !['correct', 'incorrect', 'given-up'].includes(result.kind)) return null;
      if (typeof result.levelUp !== 'boolean' || typeof result.finished !== 'boolean') return null;
      if (state.attempts === 0) return null;
      const correct = result.kind === 'correct';
      const helped = Object.hasOwn(result, 'streakBeforeHelp');
      if (helped && (!correct || state.streak !== 0 || !Number.isInteger(result.streakBeforeHelp)
        || result.streakBeforeHelp < 1 || result.streakBeforeHelp > 3 || result.streakBeforeHelp > state.correct)) return null;
      const earnedStreak = helped ? result.streakBeforeHelp : state.streak;
      if (correct ? earnedStreak === 0 : state.streak !== 0) return null;
      if (result.levelUp !== (correct && earnedStreak === 3 && state.level < 7)) return null;
      if (result.finished !== (correct && earnedStreak === 3 && state.level === 7)) return null;
      if (state.completed !== result.finished) return null;
    }

    const grade = restoreEconomicsGrade(state.result?.grade);
    const garden = restoreGarden(state.garden, state.level, rng, { preserveAwardedPlant: Boolean(state.result?.levelUp || state.result?.finished) });
    const lifetime = scoreSnapshot({ ...state, garden });
    return {
      version: 1,
      level: state.level,
      streak: state.streak,
      questionId: state.questionId,
      deadline: null,
      result: state.result === null ? null : {
        kind: state.result.kind,
        levelUp: state.result.levelUp,
        finished: state.result.finished,
        ...(grade ? { grade } : {}),
        ...(Object.hasOwn(state.result, 'streakBeforeHelp') ? { streakBeforeHelp: state.result.streakBeforeHelp } : {}),
      },
      completed: state.completed,
      correct: state.correct,
      attempts: state.attempts,
      history: [...state.history],
      answer: { ...state.answer },
      garden,
      lifetime: { correctAnswers: lifetime.correctAnswers, highestLevel: lifetime.highestLevel },
    };
  } catch {
    return null;
  }
}

/** A display-only union. Never save this merged garden back into either module. */
export function mergeModuleGardens(...gardens) {
  const repaired = gardens.filter(isRecord).map((garden) => restoreGarden(garden, 1, () => 0));
  const discoveries = new Map();
  for (const garden of repaired) {
    for (const item of garden.collection) {
      const previous = discoveries.get(item.plantId);
      discoveries.set(item.plantId, {
        plantId: item.plantId,
        count: addCount(previous?.count || 0, item.count),
        firstCollectedAt: previous ? Math.min(previous.firstCollectedAt, item.firstCollectedAt) : item.firstCollectedAt,
      });
    }
  }
  const collection = [...discoveries.values()];
  return {
    activePlantId: repaired[0]?.activePlantId || restoreGarden(null, 1, () => 0).activePlantId,
    collection,
    totalGrown: collection.reduce((total, item) => addCount(total, item.count), 0),
  };
}

/** Add independent module totals; discovering the same species counts once. */
export function combinedScoreSnapshot(...states) {
  const usable = states.filter(isRecord);
  const collection = mergeModuleGardens(...usable.map((state) => state.garden));
  const snapshots = usable.map((state) => scoreSnapshot({
    ...state,
    garden: restoreGarden(state.garden, state.level, () => 0),
  }));
  const collectedIds = new Set(collection.collection.map((entry) => entry.plantId));
  const plantIds = PLANTS.filter((plant) => collectedIds.has(plant.id)).map((plant) => plant.id);
  return {
    plantsGrown: collection.totalGrown,
    correctAnswers: snapshots.reduce((total, snapshot) => addCount(total, snapshot.correctAnswers), 0),
    uniquePlants: collection.collection.length,
    highestLevel: snapshots.reduce((highest, snapshot) => Math.max(highest, snapshot.highestLevel), 1),
    plantIds,
    collectionScore: collectionScore(plantIds),
  };
}
