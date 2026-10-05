/** Voice only produces an editable draft. Submission remains an explicit student action. */
export function installEconomicsVoice({ root, onTranscript = () => {}, onStatus = () => {} } = {}) {
  const input = root?.querySelector('#econ-explanation');
  const button = root?.querySelector('[data-econ-voice]');
  const label = root?.querySelector('[data-econ-voice-label]');
  const status = root?.querySelector('#econ-voice-status');
  if (!input || !button) return () => {};

  const view = input.ownerDocument?.defaultView || globalThis;
  const Recognition = view.SpeechRecognition || view.webkitSpeechRecognition;
  let recognition = null;
  let active = false;
  let disposed = false;
  let hadError = false;
  let receivedSpeech = false;

  const report = (message) => {
    if (disposed) return;
    if (status) status.textContent = message;
    onStatus(message);
  };
  const showActive = (value) => {
    active = value;
    button.setAttribute('aria-pressed', String(value));
    button.setAttribute('aria-label', value ? 'Stop voice input' : 'Start voice input');
    if (label) label.textContent = value ? 'Stop recording' : 'Use voice';
  };
  if (!Recognition) {
    button.disabled = true;
    button.setAttribute('aria-label', 'Voice input is unavailable in this browser');
    report('Voice is unavailable in this browser. You can type your explanation.');
    return () => { disposed = true; };
  }

  const onClick = () => {
    if (disposed || button.disabled || input.disabled || input.closest?.('fieldset:disabled')) return;
    if (active) {
      try { recognition?.stop(); } catch { showActive(false); }
      return;
    }
    hadError = false;
    receivedSpeech = false;
    const acceptedResults = new Set();
    try {
      if (recognition) {
        recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
        try { recognition.abort(); } catch { /* Previous session already stopped. */ }
      }
      recognition = new Recognition();
      recognition.lang = input.ownerDocument?.documentElement?.lang || 'en-GB';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onstart = () => {
        if (disposed) return;
        showActive(true);
        report('Listening. Your browser processes voice into text. Review your words before submitting.');
      };
      recognition.onresult = (event) => {
        if (disposed) return;
        for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (!result.isFinal || acceptedResults.has(index)) continue;
          acceptedResults.add(index);
          const transcript = String(result[0]?.transcript || '').trim();
          if (!transcript) continue;
          receivedSpeech = true;
          const draft = `${input.value.trimEnd()}${input.value.trim() ? ' ' : ''}${transcript}`;
          input.value = draft.slice(0, 1600);
          onTranscript(input.value);
          if (draft.length > 1600) {
            report('Your explanation reached 1,600 characters. Review your draft before submitting.');
            recognition.stop();
          }
        }
      };
      recognition.onerror = (event) => {
        if (disposed) return;
        hadError = true;
        showActive(false);
        const messages = {
          'not-allowed': 'Microphone access was not allowed. You can type your explanation or allow access and try again.',
          'service-not-allowed': 'Voice input is unavailable here. You can type your explanation.',
          'audio-capture': 'No microphone was found. You can type your explanation.',
          'no-speech': 'No speech was heard. Try voice again or type your explanation.',
          network: 'Voice input could not connect. Your draft is safe; type or try again.',
          aborted: 'Voice input stopped. Review your draft before submitting.',
        };
        report(messages[event.error] || 'Voice input stopped. You can continue typing your explanation.');
      };
      recognition.onend = () => {
        if (disposed) return;
        showActive(false);
        if (!hadError) report(receivedSpeech ? 'Voice input stopped. You can edit your words before submitting.' : 'Voice input stopped. Type or try again when ready.');
      };
      showActive(true);
      report('Starting voice input. Your browser processes voice into text.');
      recognition.start();
    } catch {
      hadError = true;
      showActive(false);
      report('Voice input could not start. You can type your explanation.');
    }
  };
  button.addEventListener('click', onClick);
  return () => {
    disposed = true;
    button.removeEventListener('click', onClick);
    if (recognition) {
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.abort(); } catch { /* Already stopped. */ }
    }
  };
}
