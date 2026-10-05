import test from 'node:test';
import assert from 'node:assert/strict';
import { ECON_LEVELS, ECON_QUESTIONS, getEconomicsQuestion, pickEconomicsQuestion } from '../src/economics-questions.js';

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const unique = (values) => new Set(values).size === values.length;

test('economics progresses through seven levels with four complete scenarios each', () => {
  assert.deepEqual(ECON_LEVELS.map((level) => level.id), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(ECON_QUESTIONS.length, 28);
  assert.ok(unique(ECON_QUESTIONS.map((question) => question.id)));
  for (const level of ECON_LEVELS) {
    for (const key of ['title', 'subtitle', 'economy', 'description']) assert.ok(nonempty(level[key]), `${level.id}: ${key}`);
    assert.equal(ECON_QUESTIONS.filter((question) => question.level === level.id).length, 4);
    assert.notEqual(level.timed, true, 'Complexity, not a timer, defines these levels.');
  }
});

test('every economics question has two valid outcomes, one reasoning choice, hints and primary sources', () => {
  for (const question of ECON_QUESTIONS) {
    assert.match(question.id, new RegExp(`^econ-${question.level}-[a-d]$`));
    for (const key of ['title', 'scenario', 'explanation']) assert.ok(nonempty(question[key]), `${question.id}: ${key}`);
    assert.ok(question.assumptions.length >= 3, question.id);
    assert.ok(question.assumptions.every(nonempty));
    assert.equal(question.outcomes.length, 2, question.id);
    assert.ok(unique(question.outcomes.map((outcome) => outcome.id)));
    for (const outcome of question.outcomes) {
      assert.ok(nonempty(outcome.label));
      assert.ok(nonempty(outcome.explanation));
      assert.ok(unique(outcome.options.map((option) => option.value)));
      assert.ok(outcome.options.every((option) => nonempty(option.label)));
      assert.ok(outcome.options.some((option) => option.value === outcome.answer), `${question.id}: ${outcome.id}`);
      assert.ok(outcome.options.some((option) => option.value === 'uncertain'), 'Do not hide the possibility of an indeterminate outcome.');
    }
    assert.ok(question.reasonOptions.length >= 3 && question.reasonOptions.length <= 4);
    assert.ok(unique(question.reasonOptions.map((option) => option.id)));
    assert.ok(question.reasonOptions.every((option) => nonempty(option.text)));
    assert.equal(question.reasonOptions.filter((option) => option.id === question.reasonAnswer).length, 1);
    assert.deepEqual(question.hints.map((hint) => hint.id), ['start', 'method', 'check']);
    assert.ok(question.hints.every((hint) => nonempty(hint.text)));
    assert.ok(question.sources.length > 0);
    for (const source of question.sources) {
      assert.ok(nonempty(source.title));
      assert.match(new URL(source.url).hostname, /(^|\.)(stlouisfed\.org|federalreserve\.gov|rba\.gov\.au|ecb\.europa\.eu)$/);
    }
    assert.equal(getEconomicsQuestion(question.id), question);
  }
  assert.equal(getEconomicsQuestion('missing'), undefined);
});

test('reasoning answer positions vary and hint prose does not copy solution prose', () => {
  const positions = new Set(ECON_QUESTIONS.map((question) => question.reasonOptions.findIndex((option) => option.id === question.reasonAnswer)));
  assert.equal(positions.size, 4);
  for (const question of ECON_QUESTIONS) {
    for (const hint of question.hints) {
      assert.notEqual(hint.text, question.explanation);
      assert.ok(!question.outcomes.some((outcome) => outcome.explanation === hint.text));
      assert.doesNotMatch(hint.text, /correct answer|answer is|select (increases|decreases|unchanged|cannot determine)/i);
    }
  }
});

test('hardest scenarios include indeterminate outcomes with explicit missing information', () => {
  for (const question of ECON_QUESTIONS.filter((question) => question.level === 7)) {
    assert.ok(question.outcomes.some((outcome) => outcome.answer === 'uncertain'), question.id);
    assert.match(question.assumptions.join(' '), /not provided|not given|no information is provided/i);
  }
  assert.equal(getEconomicsQuestion('econ-3-d').outcomes.find((outcome) => outcome.id === 'stock').answer, 'unchanged', 'Expected good news is not automatically a valuation increase.');
  assert.equal(getEconomicsQuestion('econ-4-c').outcomes.find((outcome) => outcome.id === 'quantity').answer, 'up', 'A tariff-induced price change moves along domestic supply.');
  assert.equal(getEconomicsQuestion('econ-7-d').outcomes.find((outcome) => outcome.id === 'balance').answer, 'down', 'Fixed export receipts and a dearer foreign-currency import bill reduce the contracted trade balance.');
});

test('selection remains within level and avoids the previous and recent questions', () => {
  for (const level of ECON_LEVELS) {
    const bank = ECON_QUESTIONS.filter((question) => question.level === level.id);
    const history = bank.slice(0, 3).map((question) => question.id);
    assert.equal(pickEconomicsQuestion(level.id, history.at(-1), history, () => 0).id, bank[3].id);
    const fullHistory = bank.map((question) => question.id);
    assert.equal(pickEconomicsQuestion(level.id, bank[3].id, fullHistory, () => 0).id, bank[0].id);
    for (const random of [0, 0.5, 0.999999, 1, -1, NaN]) {
      const next = pickEconomicsQuestion(level.id, bank[0].id, [], () => random);
      assert.equal(next.level, level.id);
      assert.notEqual(next.id, bank[0].id);
    }
  }
});

test('selection handles repeated history, foreign-level history and invalid level safely', () => {
  const history = ['econ-1-a', 'econ-1-b', 'econ-1-a', 'econ-1-c', 'econ-1-d'];
  const before = [...history];
  assert.equal(pickEconomicsQuestion(1, 'econ-1-d', history, () => 0).id, 'econ-1-b');
  assert.deepEqual(history, before, 'Selection must not mutate saved progress.');
  assert.equal(pickEconomicsQuestion(2, 'econ-1-a', ['econ-1-b'], () => 0).id, 'econ-2-a');
  assert.equal(pickEconomicsQuestion(999, undefined, null, () => 0).id, 'econ-1-a');
});
