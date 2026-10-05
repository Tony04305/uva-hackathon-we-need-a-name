import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEconomicsAnswer } from '../src/economics-answer.js';

const scenario = { outcomes: [
  { id: 'demand', options: [{ value: 'right' }, { value: 'left' }], answer: 'right' },
  { id: 'price', options: [{ value: 'up' }, { value: 'uncertain' }], answer: 'uncertain' },
] };
const complete = { demand: 'right', price: 'uncertain', explanation: 'Competing effects leave the direction uncertain with these assumptions.' };

test('draft validation leaves correctness to the AI grading endpoint', () => {
  assert.equal(checkEconomicsAnswer(complete, scenario).status, 'ready');
  assert.equal(checkEconomicsAnswer({ ...complete, demand: 'left' }, scenario).status, 'ready');
  assert.equal(checkEconomicsAnswer({ ...complete, explanation: 'This is a different, incomplete economic argument.' }, scenario).status, 'ready');
});

test('both predictions and a substantive draft are needed before grading', () => {
  for (const answer of [{}, { demand: 'right' }, { ...complete, explanation: '   ' }, { ...complete, explanation: 'yes' }])
    assert.equal(checkEconomicsAnswer(answer, scenario).status, 'incomplete');
  assert.equal(checkEconomicsAnswer({ demand: 'right', price: 'uncertain', reason: 'mechanism' }, scenario).status, 'incomplete');
});

test('forged selections and oversized/control-character explanations are rejected', () => {
  assert.equal(checkEconomicsAnswer({ ...complete, price: 'anything' }, scenario).status, 'invalid');
  assert.equal(checkEconomicsAnswer({ ...complete, price: ['up'] }, scenario).status, 'invalid');
  assert.equal(checkEconomicsAnswer({ ...complete, explanation: 'a'.repeat(1601) }, scenario).status, 'invalid');
  assert.equal(checkEconomicsAnswer({ ...complete, explanation: 'An explanation with a\u0000character' }, scenario).status, 'invalid');
  for (const answer of [null, [], 'up']) assert.equal(checkEconomicsAnswer(answer, scenario).status, 'invalid');
});
