import './economics.css';

const escapeText = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const arrowIcon = '<svg class="econ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';

const isRevealed = (state) => ['correct', 'incorrect', 'given-up'].includes(state?.result?.kind);
const selectedLabel = (options, value, labelKey = 'label', valueKey = 'value') => options.find((option) => option[valueKey] === value)?.[labelKey] || 'No choice made';

function sourceLink(source) {
  try {
    const url = new URL(source.url);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return `<li><a href="${escapeText(url.href)}" target="_blank" rel="noopener noreferrer">${escapeText(source.title)} <span aria-hidden="true">↗</span></a></li>`;
  } catch {
    return '';
  }
}

function renderOutcome(outcome, index, answer, revealed, grading) {
  const options = Array.isArray(outcome.options) ? outcome.options : [];
  const selection = answer[outcome.id];
  const chosenCorrectly = selection === outcome.answer;
  return `<fieldset class="econ-outcome" ${revealed || grading ? 'disabled' : ''}>
    <legend><span class="econ-step" aria-hidden="true">${index + 1}</span>${escapeText(outcome.label)}</legend>
    <div class="econ-outcome-options">
      ${options.map((option, optionIndex) => {
        const chosen = selection === option.value;
        const expected = revealed && option.value === outcome.answer;
        return `<label class="econ-option${expected ? ' econ-option-correct' : revealed && chosen ? ' econ-option-incorrect' : ''}" for="econ-outcome-${index}-${optionIndex}">
          <input type="radio" id="econ-outcome-${index}-${optionIndex}" name="${escapeText(outcome.id)}" value="${escapeText(option.value)}" required ${chosen ? 'checked' : ''}>
          <span>${escapeText(option.label)}</span>${expected ? '<span class="econ-option-mark" aria-label="Expected answer">✓</span>' : ''}
        </label>`;
      }).join('')}
    </div>
    ${revealed ? `<div class="econ-outcome-review${chosenCorrectly ? ' econ-review-correct' : ''}"><p class="econ-review-choice">${chosenCorrectly ? `Your choice: ${escapeText(selectedLabel(options, selection))} · Correct` : `Your choice: ${escapeText(selectedLabel(options, selection))}<span>Expected: ${escapeText(selectedLabel(options, outcome.answer))}</span>`}</p><p>${escapeText(outcome.explanation)}</p></div>` : ''}
  </fieldset>`;
}

function renderReasoning(question, answer, revealed, grading) {
  return `<fieldset class="econ-reasoning" ${revealed || grading ? 'disabled' : ''}>
    <legend>What explains your prediction?</legend>
    <p class="econ-field-help" id="econ-reason-guidance">Explain the cause and effect in your own words. UVA AI grades your reasoning after you submit.</p>
    <div class="econ-explanation-box">
      <label class="econ-explanation-label" for="econ-explanation">Your explanation</label>
      <textarea id="econ-explanation" name="explanation" rows="4" maxlength="1600" required aria-describedby="econ-reason-guidance${revealed ? '' : ' econ-rubric-note'}" placeholder="I predict this because…">${escapeText(answer.explanation || '')}</textarea>
      ${!revealed ? `<div class="econ-explanation-tools"><span>Type or speak, then review.</span><button type="button" class="econ-voice-button" data-econ-voice aria-label="Start voice input" aria-pressed="false" aria-describedby="econ-voice-status" ${grading ? 'disabled' : ''}><svg class="econ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg><span data-econ-voice-label>Use voice</span></button></div>` : ''}
    </div>
    ${!revealed ? '<p class="econ-voice-status" id="econ-voice-status" role="status" aria-live="polite"></p><div class="econ-rubric" aria-label="UVA AI grading rubric"><span class="econ-rubric-title">UVA AI checks · 2 points each</span><span>Identify the shock</span><span>Explain cause and effect</span><span>Respect scenario assumptions</span></div><p id="econ-rubric-note" class="econ-field-help">Score at least 5 / 6 with both predictions correct to grow your streak.</p>' : ''}
  </fieldset>`;
}

function renderGrade(grade) {
  if (!grade || typeof grade !== 'object') return '';
  const score = Number(grade.score);
  const maxScore = Number(grade.maxScore);
  const criteria = Array.isArray(grade.criteria) ? grade.criteria : [];
  return `<section class="econ-grade" aria-label="UVA AI reasoning feedback">
    <div class="econ-grade-heading"><h3>UVA AI feedback</h3>${Number.isFinite(score) && Number.isFinite(maxScore) ? `<span class="econ-grade-score" aria-label="Reasoning score ${score} out of ${maxScore}">${score} <span>/ ${maxScore}</span></span>` : ''}</div>
    ${grade.feedback ? `<p>${escapeText(grade.feedback)}</p>` : ''}
    ${criteria.length ? `<ul class="econ-grade-criteria">${criteria.map((criterion) => `<li><div><strong>${escapeText(criterion.label || criterion.id)}</strong><span>${escapeText(criterion.score)} / ${escapeText(criterion.maxScore)}</span></div>${criterion.feedback ? `<p>${escapeText(criterion.feedback)}</p>` : ''}</li>`).join('')}</ul>` : ''}
    ${grade.improvement ? `<p class="econ-grade-improvement"><strong>Try this next</strong> ${escapeText(grade.improvement)}</p>` : ''}
  </section>`;
}

function renderFeedback(state, question) {
  if (!isRevealed(state)) return '';
  const correct = state.result.kind === 'correct';
  const complete = state.completed || state.result.finished;
  const headline = correct
    ? complete ? 'All seven levels. A world of connections.' : state.result.levelUp ? 'Three in a row. Your plant is fully grown!' : state.result.streakBeforeHelp ? 'You connected the dots. AI help reset your streak to 0 / 3.' : 'You connected the dots. A little more growth.'
    : state.result.kind === 'given-up' ? 'Let’s trace it through together.' : 'A fresh seed. A new way to see it.';
  const sources = (Array.isArray(question.sources) ? question.sources : []).map(sourceLink).join('');
  return `<section id="economics-feedback" class="econ-feedback${correct ? ' econ-feedback-correct' : ''}" role="status" tabindex="-1" aria-label="Your result">
    <h2>${headline}</h2>
    ${renderGrade(state.result.grade)}
    <p>${escapeText(question.explanation)}</p>
    ${!correct ? '<p class="econ-streak-note">Your streak starts fresh. Your level and collection stay with you.</p>' : complete ? '<p class="econ-streak-note">Practice again to discover more plants. Your collection stays with you.</p>' : ''}
  </section>
  ${sources ? `<details class="econ-sources"><summary>Explore the economics</summary><ul>${sources}</ul></details>` : ''}`;
}

/** Presentation only. The app owns progress, selections, and rewards. */
export function renderEconomicsPanel({ state = {}, question, level = {}, storageAvailable = true, grading = false } = {}) {
  if (!question) return '<section class="econ-panel econ-empty"><h1 tabindex="-1">Economic shocks</h1><p>Choose a module to start exploring.</p><a class="econ-secondary-link" href="/" data-route>Back to modules</a></section>';
  const revealed = isRevealed(state);
  const answer = state.answer && typeof state.answer === 'object' ? state.answer : {};
  const completed = Boolean(state.completed || state.result?.finished);
  const nextLabel = state.result?.levelUp ? `Start level ${Number(state.level) + 1}` : 'Next scenario';

  return `<section class="econ-panel" aria-label="Economic shocks practice">
    <div class="econ-topline"><span class="econ-level">Level ${escapeText(state.level || level.id || 1)} of 7</span><span class="econ-economy">${escapeText(level.economy || 'Economic shocks')}</span>${completed ? '<span class="econ-complete-label">Complete</span>' : ''}</div>
    <div class="econ-intro"><p class="econ-eyebrow">ECONOMIC SHOCKS${level.title ? ` · ${escapeText(level.title)}` : ''}</p><h1 tabindex="-1">${escapeText(question.title)}</h1><p class="econ-scenario">${escapeText(question.scenario)}</p></div>
    ${(question.assumptions || []).length ? `<section class="econ-assumptions" aria-label="Scenario assumptions"><h2>Assumptions</h2><ul>${question.assumptions.map((assumption) => `<li>${escapeText(assumption)}</li>`).join('')}</ul></section>` : ''}
    ${!storageAvailable ? '<p class="econ-storage-note" role="status">Progress is saved for this visit only because browser storage is unavailable.</p>' : ''}
    <form id="economics-form" class="econ-form" aria-busy="${grading ? 'true' : 'false'}">
      <div class="econ-prediction-heading"><h2>What changes?</h2><p>Predict each effect, then explain why.</p></div>
      ${(question.outcomes || []).map((outcome, index) => renderOutcome(outcome, index, answer, revealed, grading)).join('')}
      ${renderReasoning(question, answer, revealed, grading)}
      ${renderFeedback(state, question)}
      ${!revealed ? `<div class="econ-help">
        <button type="button" class="econ-give-up" data-econ-give-up aria-describedby="econ-reveal-note" ${grading ? 'disabled' : ''}>I don’t know — explain</button>
        <p id="econ-reveal-note" class="econ-reveal-note">Showing the explanation starts a fresh streak.</p>
      </div>` : ''}
      ${!revealed ? '<p id="economics-input-error" class="econ-input-error" role="alert"></p>' : ''}
      <div class="econ-submit-row">${revealed ? completed ? `<a href="/" class="econ-secondary-link" data-route>Back to modules</a><button type="button" class="econ-primary-button" data-econ-restart>Practice again ${arrowIcon}</button>` : `<span class="econ-submit-note">Take your time with the explanation.</span><button type="button" class="econ-primary-button" data-econ-next>${nextLabel} ${arrowIcon}</button>` : `<span class="econ-submit-note" ${grading ? 'role="status"' : ''}>${grading ? 'UVA AI is reading your reasoning…' : 'No timer. Think it through.'}</span><button type="submit" class="econ-primary-button" data-econ-submit ${grading ? 'disabled' : ''}>${grading ? 'Grading…' : 'Submit to UVA AI'} ${arrowIcon}</button>`}</div>
    </form>
  </section>`;
}
