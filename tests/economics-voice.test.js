import test from 'node:test';
import assert from 'node:assert/strict';
import { installEconomicsVoice } from '../src/economics-voice.js';

function fixture({ supported = true, draft = '' } = {}) {
  const sessions = [];
  const transcripts = [];
  const listeners = new Map();
  class Recognition {
    constructor() { sessions.push(this); }
    start() { this.started = true; this.onstart?.(); }
    stop() { this.stopped = true; this.onend?.(); }
    abort() { this.aborted = true; }
    result(text, index = 0) {
      const results = Array.from({ length: index + 1 }, () => ({ isFinal: false }));
      results[index] = Object.assign([{ transcript: text }], { isFinal: true });
      this.onresult?.({ resultIndex: index, results });
    }
  }
  const input = { value: draft, disabled: false, closest: () => null, ownerDocument: { defaultView: supported ? { SpeechRecognition: Recognition } : {}, documentElement: { lang: 'en' } } };
  const button = { disabled: false, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); } };
  const status = { textContent: '' };
  const label = { textContent: '' };
  const root = { querySelector: (selector) => ({ '#econ-explanation': input, '[data-econ-voice]': button, '[data-econ-voice-label]': label, '#econ-voice-status': status })[selector] };
  const cleanup = installEconomicsVoice({ root, onTranscript: (text) => transcripts.push(text) });
  return { sessions, input, button, status, label, transcripts, cleanup, click: () => listeners.get('click')?.() };
}

test('microphone starts only on explicit voice click and stop preserves the editable draft', () => {
  const view = fixture({ draft: 'A storm reduces supply.' });
  assert.equal(view.sessions.length, 0);
  view.click();
  assert.equal(view.sessions.length, 1);
  assert.equal(view.button.attributes['aria-pressed'], 'true');
  assert.match(view.status.textContent, /browser processes voice/);
  view.sessions[0].result('Demand stays constant.');
  assert.equal(view.input.value, 'A storm reduces supply. Demand stays constant.');
  assert.deepEqual(view.transcripts, ['A storm reduces supply. Demand stays constant.']);
  view.input.value += ' I can edit this.';
  view.sessions[0].result('The price rises.', 1);
  assert.match(view.input.value, /I can edit this\. The price rises\.$/);
  view.click();
  assert.equal(view.sessions[0].stopped, true);
  assert.equal(view.button.attributes['aria-pressed'], 'false');
  assert.match(view.status.textContent, /edit your words/);
});

test('unsupported speech and denied microphone retain typing without sending a draft', () => {
  const unsupported = fixture({ supported: false, draft: 'Typed answer' });
  assert.equal(unsupported.button.disabled, true);
  assert.match(unsupported.status.textContent, /type your explanation/);
  assert.equal(unsupported.input.value, 'Typed answer');
  const denied = fixture({ draft: 'Typed answer' });
  denied.click();
  denied.sessions[0].onerror({ error: 'not-allowed' });
  denied.sessions[0].onend();
  assert.match(denied.status.textContent, /Microphone access was not allowed/);
  assert.equal(denied.input.value, 'Typed answer');
  assert.equal(denied.transcripts.length, 0);
});

test('cleanup aborts microphone and ignores queued speech after leaving the question', () => {
  const view = fixture();
  view.click();
  const pendingCallback = view.sessions[0].onresult;
  view.cleanup();
  assert.equal(view.sessions[0].aborted, true);
  pendingCallback({ resultIndex: 0, results: [Object.assign([{ transcript: 'Late result' }], { isFinal: true })] });
  assert.equal(view.input.value, '');
  assert.equal(view.transcripts.length, 0);
  view.click();
  assert.equal(view.sessions.length, 1);
});

test('duplicate final results are ignored and speech obeys the explanation length limit', () => {
  const view = fixture({ draft: 'x'.repeat(1590) });
  view.click();
  view.sessions[0].result('extra text longer than space');
  view.sessions[0].result('extra text longer than space');
  assert.equal(view.input.value.length, 1600);
  assert.equal(view.transcripts.length, 1);
  assert.equal(view.sessions[0].stopped, true);
});

test('disabled grading fields do not start a recording', () => {
  const view = fixture();
  view.input.closest = () => ({});
  view.click();
  assert.equal(view.sessions.length, 0);
});
