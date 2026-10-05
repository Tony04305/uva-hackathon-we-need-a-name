import test from 'node:test';
import assert from 'node:assert/strict';
import { ComputeEngine } from '@cortex-js/compute-engine';
import { QUESTIONS } from '../src/questions.js';

const engine = new ComputeEngine();
const points = [-1.3, -0.73, -0.27, 0.19, 0.47, 0.83, 1.17, 1.43, 1.79, 2.13];

function inDomain(domain, x) {
  switch (domain) {
    case 'x > 0': return x > 0;
    case 'x > 1': return x > 1;
    case '0 < x < π': return x > 0 && x < Math.PI;
    case 'x > −½': return x > -0.5;
    case 'x ≠ 0': return x !== 0;
    case 'x ≠ −1': return x !== -1;
    default: return true;
  }
}

function evaluate(expression, x) {
  const result = expression.subs({ x }).N();
  assert.ok(result.im === 0, `Expected a real value at x=${x}`);
  assert.ok(Number.isFinite(result.re), `Expected a finite value at x=${x}`);
  return result.re;
}

// These checks differentiate each question independently using a five-point
// finite difference. They do not use the answer checker's expression evaluator.
for (const question of Object.values(QUESTIONS).flat()) {
  test(`stored derivative for ${question.id} matches its function`, () => {
    const expression = engine.parse(question.latex);
    const derivative = engine.parse(question.answerLatex);
    let comparisons = 0;
    for (const x of points.filter((point) => inDomain(question.domain, point))) {
      const h = 1e-5 * Math.max(1, Math.abs(x));
      const numericalDerivative = (
        -evaluate(expression, x + 2 * h)
        + 8 * evaluate(expression, x + h)
        - 8 * evaluate(expression, x - h)
        + evaluate(expression, x - 2 * h)
      ) / (12 * h);
      const storedDerivative = evaluate(derivative, x);
      const tolerance = 2e-6 * Math.max(1, Math.abs(storedDerivative));
      assert.ok(
        Math.abs(numericalDerivative - storedDerivative) < tolerance,
        `${question.id} at x=${x}: finite difference ${numericalDerivative}, answer ${storedDerivative}`,
      );
      comparisons++;
    }
    assert.ok(comparisons >= 4, 'Each question must be checked at several valid points.');
  });
}
