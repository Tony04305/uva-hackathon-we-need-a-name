import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../src/economics.js', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  loader: { '.css': 'empty' },
});
const { renderEconomicsPanel } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

const question = {
  id: 'econ-fixture', level: 1, title: 'A harvest setback',
  scenario: 'An unexpected storm damages the domestic harvest.',
  assumptions: ['No international trade.', 'Preferences and income stay constant.'],
  outcomes: [{
    id: 'price', label: 'Market price',
    options: [{ value: 'up', label: 'Rises' }, { value: 'down', label: 'Falls' }, { value: 'same', label: 'Unchanged' }],
    answer: 'up', explanation: 'SUPPLY EXPLANATION SENTINEL',
  }, {
    id: 'quantity', label: 'Quantity traded',
    options: [{ value: 'up', label: 'Rises' }, { value: 'down', label: 'Falls' }, { value: 'same', label: 'Unchanged' }],
    answer: 'down', explanation: 'QUANTITY EXPLANATION SENTINEL',
  }],
  reasonOptions: [{ id: 'supply', text: 'A lower supply shifts the market equilibrium.' }, { id: 'demand', text: 'Demand rises because preferences change.' }],
  reasonAnswer: 'supply', explanation: 'FULL EXPLANATION SENTINEL',
  hints: [{ id: 'first', text: 'Think about which curve the storm affects.' }, { id: 'second', text: 'Hold the other curve in place.' }],
  sources: [{ title: 'Read the source', url: 'https://example.org/economics' }],
};
const level = { id: 1, title: 'One moving part', economy: 'Closed economy' };
const state = { level: 1, streak: 0, answer: { price: 'down', quantity: 'down', explanation: 'The harvest affects supply.' }, result: null };

test('unsubmitted questions never label correct choices or reveal explanations', () => {
  const html = renderEconomicsPanel({ state, level, question });
  assert.ok(!html.includes('EXPLANATION SENTINEL'));
  assert.ok(!html.includes('econ-option-correct'));
  assert.ok(!html.includes('Expected answer'));
  assert.ok(!html.includes('Expected reasoning'));
  assert.ok(!html.includes('Read the source'));
  assert.ok(!html.includes('economics-feedback'));
  assert.match(html, /id="economics-input-error"[^>]*role="alert"/);
  assert.ok(html.includes('data-econ-submit'));
});

test('predictions retain radio choices and reasoning is an editable accessible draft', () => {
  const html = renderEconomicsPanel({ state, level, question });
  const inputs = html.match(/<input\b[^>]*>/g) || [];
  assert.equal(inputs.length, 6);
  assert.equal(inputs.filter((input) => input.includes(' checked')).length, 2);
  for (const name of ['price', 'quantity']) {
    assert.ok(inputs.some((input) => input.includes(`name="${name}"`) && input.includes('required')));
  }
  assert.match(html, /name="price" value="down" required checked/);
  assert.match(html, /<textarea id="econ-explanation" name="explanation"[^>]*maxlength="1600"[^>]*required/);
  assert.ok(html.includes('The harvest affects supply.</textarea>'));
  assert.ok(html.includes('aria-label="Start voice input"'));
  assert.ok(html.includes('Submit to UVA AI'));
  assert.ok(!html.includes('name="reason"'));
  assert.ok(!html.includes('A lower supply shifts the market equilibrium.'));
  assert.equal((html.match(/<legend>/g) || []).length, 3);
  assert.match(html, /<h1 tabindex="-1">/);
});

test('grading locks answers and repeat submission while announcing pending feedback', () => {
  const html = renderEconomicsPanel({ state, level, question, grading: true });
  assert.equal((html.match(/<fieldset\b[^>]*disabled/g) || []).length, 3);
  assert.match(html, /data-econ-submit disabled/);
  assert.match(html, /data-econ-give-up[^>]*disabled/);
  assert.match(html, /data-econ-voice[^>]*disabled/);
  assert.ok(html.includes('aria-busy="true"'));
  assert.ok(html.includes('UVA AI is reading your reasoning…'));
  assert.ok(!html.includes('EXPLANATION SENTINEL'));
});

test('submitted AI rubric feedback shows the score, specific comments, and next step safely', () => {
  const html = renderEconomicsPanel({ state: { ...state, result: { kind: 'incorrect', grade: {
    score: 4, maxScore: 6, source: 'ai', feedback: 'A good start.', improvement: 'Keep demand fixed.',
    criteria: [{ id: 'shock', label: 'Identify the shock', score: 2, maxScore: 2, feedback: '<script>bad</script>' }],
  } } }, level, question });
  assert.ok(html.includes('UVA AI feedback'));
  assert.ok(html.includes('Reasoning score 4 out of 6'));
  assert.ok(html.includes('Identify the shock'));
  assert.ok(html.includes('Keep demand fixed.'));
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('submitted feedback compares selections, reveals causal explanations, and locks previous choices', () => {
  const html = renderEconomicsPanel({ state: { ...state, result: { kind: 'incorrect' } }, level, question });
  assert.ok(html.includes('SUPPLY EXPLANATION SENTINEL'));
  assert.ok(html.includes('FULL EXPLANATION SENTINEL'));
  assert.ok(html.includes('Your choice: Falls<span>Expected: Rises</span>'));
  assert.ok(html.includes('Your choice: Falls · Correct'));
  assert.equal((html.match(/<fieldset\b[^>]*disabled/g) || []).length, 3);
  assert.match(html, /id="economics-feedback"[^>]*tabindex="-1"/);
  assert.ok(html.includes('data-econ-next'));
  assert.ok(!html.includes('data-econ-submit'));
  assert.ok(!html.includes('data-econ-give-up'));
  assert.ok(html.includes('Read the source'));
});

test('giving up explains without inventing a student selection or rewarding a correct streak', () => {
  const html = renderEconomicsPanel({ state: { ...state, answer: {}, result: { kind: 'given-up' } }, level, question });
  assert.ok(html.includes('Your choice: No choice made'));
  assert.ok(html.includes('Let’s trace it through together.'));
  assert.ok(html.includes('Your streak starts fresh.'));
  assert.ok(!html.includes('Your plant is fully grown!'));
});

test('the practice form has no inline hint UI and retains its explicit answer reveal action', () => {
  const html = renderEconomicsPanel({ state, level, question, hintIndex: 99 });
  assert.ok(question.hints.every((hint) => !html.includes(hint.text)));
  assert.ok(!html.includes('data-econ-hint'));
  assert.ok(!html.includes('econ-hint-list'));
  assert.ok(!html.includes('Give me a hint'));
  assert.match(html, /data-econ-give-up[^>]*aria-describedby="econ-reveal-note"/);
  assert.ok(html.includes('I don’t know — explain'));
  assert.ok(html.includes('Showing the explanation starts a fresh streak.'));
});

test('level-up and final completion controls preserve the final question review', () => {
  const next = renderEconomicsPanel({ state: { ...state, result: { kind: 'correct', levelUp: true } }, level, question });
  assert.ok(next.includes('Start level 2'));
  assert.ok(next.includes('Your plant is fully grown!'));
  const complete = renderEconomicsPanel({ state: { ...state, level: 7, completed: true, result: { kind: 'correct', finished: true } }, level, question });
  assert.ok(complete.includes('Level 7 of 7'));
  assert.ok(complete.includes('FULL EXPLANATION SENTINEL'));
  assert.ok(complete.includes('data-econ-restart'));
  assert.ok(!complete.includes('data-econ-next'));
});

test('text is escaped and invalid source protocols cannot enter review links', () => {
  const attack = '<img src=x onerror="alert(1)">';
  const html = renderEconomicsPanel({
    state: { ...state, result: { kind: 'given-up' } }, level,
    question: { ...question, title: attack, scenario: attack, explanation: attack, sources: [{ title: attack, url: 'javascript:alert(1)' }, { title: attack, url: 'https://example.org/?q=<a>' }] },
  });
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});
