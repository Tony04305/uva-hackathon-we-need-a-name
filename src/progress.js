import { initGarden, restoreGarden, collectActivePlant } from './garden.js';
import { PLANTS } from './plants.js';
import { collectionScore } from './rarities.js';

export const STORAGE_KEY = 'wnam-differentiation-v1';

const TIMED_LEVELS = new Set([2, 4, 6]);
const QUESTION_TIME_MS = 120_000;
const MAX_COUNT = Number.MAX_SAFE_INTEGER;
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isLevel = (value) => Number.isInteger(value) && value >= 1 && value <= 7;
const addCount = (count, amount) => Math.min(MAX_COUNT, count + amount);

// Old saves may have collections from several practice runs but no lifetime
// counters. Preserve the strongest evidence available without inventing a
// complete history: current correct answers and three answers per grown plant.
function readLifetime(value, correct = 0, level = 1, garden = null) {
  const saved = isRecord(value) ? value : {};
  const plants = isCount(garden?.totalGrown) ? garden.totalGrown : 0;
  return {
    correctAnswers: Math.max(
      isCount(saved.correctAnswers) ? saved.correctAnswers : 0,
      isCount(correct) ? correct : 0,
      Math.min(MAX_COUNT, plants * 3),
    ),
    highestLevel: Math.max(isLevel(saved.highestLevel) ? saved.highestLevel : 1, isLevel(level) ? level : 1),
  };
}

export function createProgress(questionId, now = Date.now(), previousGarden = null, rng = Math.random, previousLifetime = null) {
  const garden = initGarden(1, previousGarden, rng);
  return {
    version: 1,
    level: 1,
    streak: 0,
    questionId,
    deadline: null,
    result: null,
    completed: false,
    correct: 0,
    attempts: 0,
    history: [],
    answer: '',
    garden,
    lifetime: readLifetime(previousLifetime, 0, 1, garden),
  };
}

export function submitResult(state, correct, { timedOut = false, now = Date.now() } = {}) {
  if (state.result || state.completed) return state;

  const isCorrect = Boolean(correct) && !timedOut;
  const streak = isCorrect ? state.streak + 1 : 0;
  const finished = isCorrect && streak === 3 && state.level === 7;
  const levelUp = isCorrect && streak === 3 && state.level < 7;
  const correctAnswers = addCount(state.correct, Number(isCorrect));
  const garden = streak === 3 ? collectActivePlant(state.garden, now, state.level) : state.garden;
  const lifetime = readLifetime(state.lifetime, state.correct, state.level, state.garden);
  lifetime.correctAnswers = addCount(lifetime.correctAnswers, Number(isCorrect));

  return {
    ...state,
    streak,
    attempts: addCount(state.attempts, 1),
    correct: correctAnswers,
    completed: finished,
    garden,
    lifetime: readLifetime(lifetime, correctAnswers, state.level, garden),
    result: {
      kind: timedOut ? 'timeout' : isCorrect ? 'correct' : 'incorrect',
      levelUp,
      finished,
    },
  };
}

/** Revealing a solution ends the attempt without awarding streaks or plants. */
export function giveUpQuestion(state) {
  if (state.completed || (state.result && state.result.kind !== 'timeout')) return state;
  // A timeout already counted this attempt. Revealing it must not count twice.
  const ended = state.result ? state : submitResult(state, false);
  return { ...ended, result: { kind: 'given-up', levelUp: false, finished: false } };
}

export function canRevealAnswer(state) {
  return ['correct', 'incorrect', 'given-up'].includes(state?.result?.kind);
}

/** Asking the tutor costs the current streak, but keeps already-earned rewards. */
export function useTutorHelp(state) {
  if (state.streak === 0) return state;
  return {
    ...state,
    streak: 0,
    // Results still describe the submitted answer. Retain the achieved streak
    // so a pending level-up or completion remains valid after saving/reloading.
    result: state.result?.kind === 'correct'
      ? { ...state.result, streakBeforeHelp: state.streak }
      : state.result,
  };
}

export function advanceQuestion(state, questionId, now = Date.now(), rng = Math.random) {
  if (!state.result || state.completed) return state;

  const level = state.level + Number(state.result.levelUp);
  return {
    ...state,
    level,
    streak: state.result.levelUp ? 0 : state.streak,
    questionId,
    deadline: TIMED_LEVELS.has(level) ? now + QUESTION_TIME_MS : null,
    result: null,
    history: [...state.history, state.questionId].slice(-12),
    answer: '',
    garden: state.result.levelUp ? initGarden(level, state.garden, rng) : state.garden,
    lifetime: readLifetime(state.lifetime, state.correct, level, state.garden),
  };
}

/** Stable lifetime totals for the leaderboard, independent of the current run. */
export function scoreSnapshot(state) {
  const lifetime = readLifetime(state?.lifetime, state?.correct, state?.level, state?.garden);
  const collectedIds = new Set((Array.isArray(state?.garden?.collection) ? state.garden.collection : [])
    .filter((entry) => entry && isCount(entry.count) && entry.count > 0)
    .map((entry) => entry.plantId));
  const plantIds = PLANTS.filter((plant) => collectedIds.has(plant.id)).map((plant) => plant.id);
  return {
    plantsGrown: isCount(state?.garden?.totalGrown) ? state.garden.totalGrown : 0,
    correctAnswers: lifetime.correctAnswers,
    uniquePlants: plantIds.length,
    highestLevel: lifetime.highestLevel,
    plantIds,
    collectionScore: collectionScore(plantIds),
  };
}

/** Return a validated saved session, or null so the caller can start afresh. */
export function restoreProgress(raw, questionExists, { rng = Math.random } = {}) {
  try {
    if (typeof raw !== 'string') return null;
    const state = JSON.parse(raw);
    if (!isRecord(state) || state.version !== 1) return null;
    if (!Number.isInteger(state.level) || state.level < 1 || state.level > 7) return null;
    if (!Number.isInteger(state.streak) || state.streak < 0 || state.streak > 3) return null;
    if (typeof state.questionId !== 'string' || !questionExists(state.questionId)) return null;
    if (typeof state.answer !== 'string' || typeof state.completed !== 'boolean') return null;
    if (!isCount(state.correct) || !isCount(state.attempts) || state.correct > state.attempts) return null;
    if (state.streak > state.correct) return null;
    if (!Array.isArray(state.history) || state.history.length > 12) return null;
    if (!state.history.every((id) => typeof id === 'string' && questionExists(id))) return null;

    // Keep expired deadlines intact: reloading must never grant extra time.
    if (TIMED_LEVELS.has(state.level)) {
      if (!isCount(state.deadline)) return null;
    } else if (state.deadline !== null) {
      return null;
    }

    if (state.result === null) {
      if (state.completed || state.streak === 3) return null;
    } else {
      const result = state.result;
      if (!isRecord(result) || !['correct', 'incorrect', 'timeout', 'given-up'].includes(result.kind)) return null;
      if (typeof result.levelUp !== 'boolean' || typeof result.finished !== 'boolean') return null;
      if (state.attempts === 0) return null;
      const isCorrect = result.kind === 'correct';
      const helped = Object.hasOwn(result, 'streakBeforeHelp');
      if (helped && (!isCorrect || state.streak !== 0 || !Number.isInteger(result.streakBeforeHelp)
        || result.streakBeforeHelp < 1 || result.streakBeforeHelp > 3 || result.streakBeforeHelp > state.correct)) return null;
      const earnedStreak = helped ? result.streakBeforeHelp : state.streak;
      if (isCorrect ? earnedStreak === 0 : state.streak !== 0) return null;
      if (result.kind === 'timeout' && !TIMED_LEVELS.has(state.level)) return null;
      if (result.levelUp !== (isCorrect && earnedStreak === 3 && state.level < 7)) return null;
      if (result.finished !== (isCorrect && earnedStreak === 3 && state.level === 7)) return null;
      if (state.completed !== result.finished) return null;
    }

    // Repair the new fields independently; malformed score data must never
    // discard a usable learning session or a valid plant collection.
    const garden = restoreGarden(state.garden, state.level, rng, {
      preserveAwardedPlant: Boolean(state.result?.levelUp || state.result?.finished),
    });
    return {
      version: 1,
      level: state.level,
      streak: state.streak,
      questionId: state.questionId,
      deadline: state.deadline,
      result: state.result === null ? null : {
        kind: state.result.kind,
        levelUp: state.result.levelUp,
        finished: state.result.finished,
        ...(Object.hasOwn(state.result, 'streakBeforeHelp') ? { streakBeforeHelp: state.result.streakBeforeHelp } : {}),
      },
      completed: state.completed,
      correct: state.correct,
      attempts: state.attempts,
      history: [...state.history],
      answer: state.answer,
      // Garden data was added to version 1. Preserve the entire learning session
      // and repair only garden data; legacy milestones do not mint retroactive rewards.
      garden,
      lifetime: readLifetime(state.lifetime, state.correct, state.level, garden),
    };
  } catch {
    return null;
  }
}
