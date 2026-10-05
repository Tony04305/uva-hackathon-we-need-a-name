import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Exercise the real renderer without introducing a browser or rewriting its
// source. CSS is irrelevant here; MathLive uses its real Node entry point.
const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../src/tutor.js', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  loader: { '.css': 'empty' },
  plugins: [{
    name: 'resolve-mathlive-for-data-url',
    setup(builder) {
      builder.onResolve({ filter: /^mathlive$/ }, () => ({
        path: import.meta.resolve('mathlive'),
        external: true,
      }));
    },
  }],
});
const { renderTutor } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

const review = Object.freeze({
  role: 'assistant',
  text: 'The secret derivative is 999x^17. Bring down the exponent.',
  answerLatex: '999x^{17}',
});
const hint = Object.freeze({ role: 'assistant', text: 'Start by identifying the exponent.' });

test('a locked tutor omits solution-bearing prose and mathematics, even in its hidden content', () => {
  for (const open of [false, true]) {
    const html = renderTutor({ open, unlocked: false, messages: [review, hint] });
    assert.ok(!html.includes('secret derivative'));
    assert.ok(!html.includes('Bring down the exponent'));
    assert.ok(!html.includes('999'));
    assert.ok(!html.includes('tutor-solution-math'));
    assert.ok(html.includes(hint.text), 'ordinary hints must remain available while locked');
  }
});

test('unlocking renders the trusted explanation and real mathematical markup', () => {
  const html = renderTutor({ open: true, unlocked: true, messages: [review] });
  assert.ok(html.includes(review.text));
  assert.ok(html.includes('class="tutor-solution-math"'));
  assert.ok(html.includes('ML__latex'), 'the formula should be typeset by MathLive');
  assert.ok(html.includes('999'));
  assert.ok(!html.includes('<code>'), 'a valid expression should not fall back to raw LaTeX');
});

test('relocking an existing conversation hides its review again without mutating messages', () => {
  const messages = Object.freeze([review, hint]);
  const unlocked = renderTutor({ open: true, unlocked: true, messages });
  const relocked = renderTutor({ open: true, unlocked: false, messages });
  assert.ok(unlocked.includes(review.text));
  assert.ok(!relocked.includes(review.text));
  assert.ok(!relocked.includes('999'));
  assert.deepEqual(messages, [review, hint]);
});

test('all untrusted text is escaped, including textarea-closing and HTML injection attempts', () => {
  const attack = '</textarea><img src=x onerror="alert(1)">&\'';
  const escaped = '&lt;/textarea&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;';
  const html = renderTutor({
    open: true,
    unlocked: true,
    messages: [{ role: 'user', text: attack }, { role: 'assistant', text: attack }],
    draft: attack,
    error: attack,
  });
  assert.equal(html.split(escaped).length - 1, 4, 'each text surface must escape the payload');
  assert.ok(!html.includes('<img'));
  assert.equal((html.match(/<textarea\b/g) || []).length, 1);
  assert.equal((html.match(/<\/textarea>/g) || []).length, 1, 'draft text must not close the textarea');
});

test('unsupported message roles are ignored and user messages cannot inject formatted solutions', () => {
  const html = renderTutor({
    open: true,
    unlocked: true,
    messages: [
      null, undefined, {},
      { role: 'system', text: 'SYSTEM MESSAGE MUST NOT APPEAR', answerLatex: '888x' },
      { role: 'tool', text: 'TOOL MESSAGE MUST NOT APPEAR' },
      { role: 'user', text: 'Can I use the power rule?', answerLatex: '777x' },
      hint,
    ],
  });
  assert.ok(!html.includes('MUST NOT APPEAR'));
  assert.ok(!html.includes('888x'));
  assert.ok(!html.includes('777'));
  assert.ok(!html.includes('tutor-solution-math'));
  assert.ok(html.includes('Can I use the power rule?'));
  assert.ok(html.includes(hint.text));
});

test('a minimal shared assistant warns about the streak cost before its labeled message form', () => {
  const html = renderTutor({ open: true, source: 'ai', contextLabel: 'Differentiation · Level 1' });
  assert.ok(!html.includes('What do you need help with?'));
  assert.ok(html.includes('Sending a message resets your streak to <strong>0 / 3</strong>.'));
  assert.ok(html.indexOf('id="tutor-streak-warning"') < html.indexOf('id="tutor-form"'));
  assert.match(html, /<textarea\b[^>]*aria-describedby="tutor-streak-warning"/);
  assert.ok(html.includes('role="dialog" aria-modal="false" aria-labelledby="tutor-title"'));
  assert.ok(html.includes('id="tutor-title" class="tutor-title">UVA AI</h2>'));
  assert.ok(html.includes('data-tutor-launcher'));
  assert.ok(html.includes('Differentiation · Level 1'));
  assert.ok(html.includes('data-tutor-prompt="Explain the concept behind this question."'));
  assert.ok(html.includes('aria-label="Close UVA AI assistant"'));
  assert.ok(html.includes('for="tutor-message">Message UVA AI</label>'));
  assert.ok(html.includes('aria-label="Send message"'));
  assert.equal((html.match(/<textarea\b/g) || []).length, 1);
  assert.equal((html.match(/type="submit"/g) || []).length, 1);
  for (const removed of ['Math helper', 'Hints for this question', 'This differentiation question', 'AI-assisted hint', 'Guided hint', 'data-tutor-hint', 'data-tutor-review', 'data-tutor-give-up', 'tutor-guidance']) {
    assert.ok(!html.includes(removed), `old inline UI must be absent: ${removed}`);
  }
});

test('the launcher reflects visibility and the streak warning remains during conversation', () => {
  const closed = renderTutor();
  assert.match(closed, /id="tutor-content"[^>]*\bhidden/);
  assert.match(closed, /class="tutor-launcher"[^>]*aria-expanded="false"/);
  const open = renderTutor({ open: true, messages: [hint] });
  assert.doesNotMatch(open, /id="tutor-content"[^>]*\bhidden/);
  assert.match(open, /class="tutor-launcher"[^>]*aria-expanded="true"/);
  assert.ok(!open.includes('What do you need help with?'));
  assert.equal((open.match(/id="tutor-streak-warning"/g) || []).length, 1);
  assert.ok(open.includes('Sending a message resets your streak'));
  assert.ok(open.includes('tutor-message-author">UVA AI</span>'));
});

test('both the streak warning and request error describe the message field', () => {
  const html = renderTutor({ open: true, error: 'Please try again.', messages: [hint] });
  assert.match(html, /<textarea\b[^>]*aria-describedby="tutor-streak-warning tutor-error"/);
  assert.ok(html.includes('id="tutor-error"'));
  assert.ok(html.includes('Sending a message resets your streak'));
});

test('economics review prose stays hidden until the current attempt unlocks', () => {
  const economicsReview = { role: 'assistant', isReview: true, text: 'The correct prediction is a leftward shift in demand.' };
  const messages = Object.freeze([hint, economicsReview]);
  for (const open of [false, true]) {
    const locked = renderTutor({ open, messages, unlocked: false });
    assert.ok(!locked.includes(economicsReview.text));
    assert.ok(locked.includes(hint.text));
  }
  assert.ok(renderTutor({ messages, unlocked: true }).includes(economicsReview.text));
  assert.deepEqual(messages, [hint, economicsReview]);
});

test('busy controls prevent duplicate requests while the collapse toggle remains usable', () => {
  for (const unlocked of [false, true]) {
    const html = renderTutor({ open: true, unlocked, busy: true });
    const buttons = html.match(/<button\b[^>]*>/g) || [];
    assert.ok(buttons.length > 1);
    for (const button of buttons) {
      assert.equal(/\bdisabled\b/.test(button), !button.includes('data-tutor-toggle'));
    }
    assert.match(html, /<textarea\b[^>]*\bdisabled\b/);
    assert.ok(html.includes('aria-busy="true"'));
  }
});

test('walkthrough actions explicitly surrender before submission and offer review afterwards', () => {
  const locked = renderTutor({ open: true });
  assert.ok(locked.includes('data-tutor-prompt="I don’t know — walk me through it."'));
  assert.ok(!locked.includes('data-tutor-prompt="Walk me through this question step by step."'));
  const unlocked = renderTutor({ open: true, unlocked: true });
  assert.ok(unlocked.includes('data-tutor-prompt="Walk me through this question step by step."'));
  assert.ok(unlocked.includes('Full walkthrough'));
});

test('structured walkthrough steps are escaped and hidden until the attempt is unlocked', () => {
  const message = { role: 'assistant', source: 'ai', isReview: true, text: 'Review intro', steps: [{ title: '<img>', text: 'Secret step <script>' }], answerText: 'Secret final answer' };
  assert.ok(!renderTutor({ messages: [message] }).includes('Secret'));
  const html = renderTutor({ unlocked: true, messages: [message], contextLabel: '<script>context</script>' });
  assert.ok(html.includes('tutor-walkthrough'));
  assert.ok(html.includes('&lt;img&gt;'));
  assert.ok(html.includes('Secret step &lt;script&gt;'));
  assert.ok(html.includes('Secret final answer'));
  assert.ok(html.includes('AI walkthrough · verified answer below'));
  assert.ok(!html.includes('<script>'));
  const fallback = renderTutor({ unlocked: true, messages: [{ ...message, source: 'guided' }] });
  assert.ok(fallback.includes('Reviewed walkthrough · AI unavailable'));
});
