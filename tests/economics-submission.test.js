import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { checkEconomicsAnswer } from '../src/economics-answer.js';
import { createEconomicsProgress, submitEconomicsResult } from '../src/economics-progress.js';
import { getEconomicsQuestion } from '../src/economics-questions.js';

// Run the actual async submission handler with a deferred network response.
// Keeping DOM/network adapters small lets us exercise cancellation and retry
// ordering without making real learner or leaderboard writes.
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const submissionSource = source.slice(source.indexOf('function cancelEconomicsGrading()'), source.indexOf('function nextEconomics()'));
const pageshowSource = source.split('\n').find((line) => line.startsWith("window.addEventListener('pageshow'"));
function harness() {
  let resolve, reject;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const calls = { requests: 0, renders: 0, saved: [], syncs: 0 };
  const draft = { demand: 'right', price: 'up', explanation: 'The campaign shifts demand right while supply stays fixed, raising equilibrium price.' };
  const form = { answer: draft };
  const economicsState = createEconomicsProgress('econ-1-a', 1, null, () => 0);
  economicsState.streak = 2; economicsState.correct = 2; economicsState.attempts = 2;
  economicsState.answer = { ...draft };
  const context = vm.createContext({
    economicsState, economicsGrading: false, economicsGradeController: null,
    economicsGradeError: '', economicsVoiceCleanup: null,
    AbortController, setTimeout, clearTimeout, checkEconomicsAnswer, getEconomicsQuestion, submitEconomicsResult,
    FormData: class { constructor(form) { return new Map(Object.entries(form.answer)); } },
    $: (selector) => selector === '#economics-form' ? form : null,
    isEconomicsPage: () => true,
    saveEconomics: () => calls.saved.push(JSON.parse(JSON.stringify(context.economicsState))),
    render: () => { calls.renders++; },
    renderEconomics: () => { calls.renders++; },
    gradeEconomics: () => { calls.requests++; return pending; },
    sharedGarden: () => context.economicsState.garden,
    syncScores: () => { calls.syncs++; }, showReward: () => {},
    window: { addEventListener: (_name, callback) => { context.onPageShow = callback; } },
  });
  vm.runInContext(submissionSource + '\n' + pageshowSource, context);
  return { context, calls, draft, resolve, reject };
}

test('a provider failure preserves the draft, streak and attempts and makes submission retryable', async () => {
  const { context, calls, draft, reject } = harness();
  const task = context.submitEconomics();
  assert.equal(context.economicsGrading, true);
  reject(new Error('UVA AI is temporarily unavailable.'));
  await task;
  assert.equal(context.economicsGrading, false);
  assert.equal(context.economicsGradeController, null);
  assert.equal(context.economicsState.streak, 2);
  assert.equal(context.economicsState.attempts, 2);
  assert.equal(context.economicsState.result, null);
  assert.deepEqual(JSON.parse(JSON.stringify(context.economicsState.answer)), draft);
  assert.match(context.economicsGradeError, /temporarily unavailable/);
  assert.equal(calls.syncs, 0);
});

test('a repeated submit while grading cannot award twice', async () => {
  const { context, calls, resolve } = harness();
  const task = context.submitEconomics();
  await context.submitEconomics();
  assert.equal(calls.requests, 1);
  resolve({ status: 'correct', grade: { score: 6, source: 'ai' } });
  await task;
  assert.equal(context.economicsState.attempts, 3);
  assert.equal(context.economicsState.streak, 3);
  assert.equal(context.economicsState.result.grade.score, 6);
  assert.equal(context.economicsState.garden.totalGrown, 1);
  assert.equal(calls.syncs, 1);
});

test('cancelled requests and responses for an old scenario cannot overwrite progress', async () => {
  for (const cancel of [true, false]) {
    const { context, resolve } = harness();
    const task = context.submitEconomics();
    if (cancel) context.cancelEconomicsGrading();
    else context.economicsState.questionId = 'econ-1-b';
    resolve({ status: 'correct', grade: { score: 6, source: 'ai' } });
    await task;
    assert.equal(context.economicsState.attempts, 2);
    assert.equal(context.economicsState.streak, 2);
    assert.equal(context.economicsState.result, null);
  }
});

test('returning through the back-forward cache redraws the cancelled grading form', () => {
  const { context, calls } = harness();
  context.economicsGrading = true;
  context.cancelEconomicsGrading();
  context.onPageShow({ persisted: false });
  assert.equal(calls.renders, 0);
  context.onPageShow({ persisted: true });
  assert.equal(calls.renders, 1);
  assert.equal(context.economicsGrading, false);
});
