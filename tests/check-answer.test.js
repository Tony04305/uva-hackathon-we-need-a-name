import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAnswer } from '../src/check-answer.js';

const cases = [
  ['combined like terms', '2x+2x', '4x'],
  ['reordered multiplication', 'x\\cdot6', '6x'],
  ['expanded polynomial', '6x^2+12x+6', '6(x+1)^2'],
  ['chain rule', '6x(x^2+1)^2', '3(x^2+1)^2(2x)'],
  ['product rule', '\\sin(x)+x\\cos(x)', 'x\\cos(x)+\\sin(x)'],
  ['quotient rule', '\\frac{x^2-2x^2-1}{(x^2+1)^2}', '-\\frac{x^2+1}{(x^2+1)^2}'],
  ['trig identity', '\\frac{1}{\\cos^2(x)}', '1+\\tan^2(x)'],
  ['exponential', '2e^{2x}', '2\\exp(2x)'],
  ['natural logarithm', '\\frac{2x}{x^2+1}', '2x(x^2+1)^{-1}'],
  ['root', '\\frac{1}{2\\sqrt{x}}', '\\frac{1}{2}x^{-0.5}'],
  ['variable power', 'x^x(1+\\ln(x))', 'x^x+x^x\\ln(x)'],
  ['zero derivative', '0', '0'],
  ['rational number', '\\frac{1}{2}', '0.5'],
];
for (const [name, actual, expected] of cases) {
  test(`accepts ${name}`, () => assert.equal(checkAnswer(actual, expected).status, 'correct'));
}

for (const actual of ['', ' ', 'x+', '\\frac{}{}', '(x+1', 'x^{}', 'y', '0y+2x', 'x=2', 'f(x)', '\\infty', '\\frac{1}{0}', '\\sqrt{-1}', 'NaN', '\\operatorname{random}()', '2x;3']) {
  test(`rejects invalid expression ${JSON.stringify(actual)}`, () => assert.equal(checkAnswer(actual, '2x').status, 'invalid'));
}

for (const [actual, expected] of [
  ['x', '2x'], ['2x+1', '2x'], ['2\\sin(x)', '2\\cos(x)'],
  ['e^x', '2e^x'], ['\\ln(x)', '1/x'], ['0', 'x'],
  ['\\sqrt{x^2}', 'x'], ['\\log(x)', '\\ln(x)'],
  ['2x+0.0000000001', '2x'], ['10^{-1000}', '0'],
]) {
  test(`rejects incorrect ${actual} for ${expected}`, () => assert.equal(checkAnswer(actual, expected).status, 'incorrect'));
}

test('respects a question restricted to positive x', () => {
  assert.equal(checkAnswer('1/\\sqrt{x^2}', '1/x', 'x > 0').status, 'correct');
  assert.equal(checkAnswer('\\sqrt{x^2}', 'x', 'x > 0').status, 'correct');
  assert.equal(checkAnswer('-1/x', '1/x', 'x > 0').status, 'incorrect');
});
