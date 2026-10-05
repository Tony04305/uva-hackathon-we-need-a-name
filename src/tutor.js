import { convertLatexToMarkup } from 'mathlive';
import './tutor.css';

/** Escape all chat and user-entered text before inserting it into HTML. */
export const escapeTutorText = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const icon = (content) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const helperIcon = () => icon('<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>');
const sendIcon = () => icon('<path d="M12 19V5m-6 6 6-6 6 6"/>');
const closeIcon = () => icon('<path d="m6 6 12 12M6 18 18 6"/>');

function solutionMarkup(answerLatex) {
  if (typeof answerLatex !== 'string' || !answerLatex.trim()) return '';
  let formula;
  try {
    // Only the trusted current-question answer enters the math renderer.
    formula = convertLatexToMarkup(answerLatex, { displayMode: true });
  } catch {
    formula = `<code>${escapeTutorText(answerLatex)}</code>`;
  }
  return `<div class="tutor-solution"><div class="tutor-solution-math">${formula}</div></div>`;
}

function renderMessage(message, unlocked) {
  if (!message || !['user', 'assistant'].includes(message.role)) return '';
  const assistant = message.role === 'assistant';
  // Reviews in either module can reveal an answer entirely in prose.
  if (assistant && (message.answerLatex || message.answerText || message.steps || message.isReview) && !unlocked) return '';
  const steps = assistant && unlocked && Array.isArray(message.steps) ? message.steps.slice(0, 5).filter((step) => step && typeof step.title === 'string' && typeof step.text === 'string') : [];
  const source = assistant && message.source === 'guided' ? (message.isReview ? 'Reviewed walkthrough · AI unavailable' : 'Reviewed teaching hint') : assistant && message.source === 'ai' ? (message.isReview ? 'AI walkthrough · verified answer below' : 'AI-selected teaching hint') : '';
  return `<li class="tutor-message ${assistant ? 'tutor-assistant-message' : 'tutor-user-message'}">
    <span class="tutor-message-author">${assistant ? 'UVA AI' : 'You'}</span>
    <div class="tutor-message-content"><p>${escapeTutorText(message.text)}</p>
      ${steps.length ? `<ol class="tutor-walkthrough">${steps.map((step) => `<li><strong>${escapeTutorText(step.title)}</strong><p>${escapeTutorText(step.text)}</p></li>`).join('')}</ol>` : ''}
      ${assistant && unlocked && message.answerText ? `<div class="tutor-answer-text"><strong>Answer</strong><p>${escapeTutorText(message.answerText)}</p></div>` : ''}
      ${assistant && unlocked ? solutionMarkup(message.answerLatex) : ''}
      ${source ? `<span class="tutor-source">${source}</span>` : ''}
    </div>
  </li>`;
}

/** Shared floating presentation. The app owns requests, drafts, and unlocking. */
export function renderTutor({ open = false, messages = [], busy = false, error = '', unlocked = false, draft = '', contextLabel = 'Your current question' } = {}) {
  const messageMarkup = (Array.isArray(messages) ? messages : []).map((message) => renderMessage(message, unlocked)).join('');
  const disabled = busy ? 'disabled' : '';
  return `<aside class="tutor-card ${open ? 'is-open' : 'is-collapsed'}" aria-label="UVA AI assistant">
    <div id="tutor-content" class="tutor-content" role="dialog" aria-modal="false" aria-labelledby="tutor-title" ${open ? '' : 'hidden'}>
      <header class="tutor-heading">
        <h2 id="tutor-title" class="tutor-title">UVA AI</h2>
        <button type="button" class="tutor-close" data-tutor-toggle aria-label="Close UVA AI assistant" aria-expanded="${Boolean(open)}" aria-controls="tutor-content">${closeIcon()}</button>
      </header>
      <p class="tutor-context">${escapeTutorText(contextLabel)}</p>
      <p id="tutor-streak-warning" class="tutor-streak-warning">Sending a message resets your streak to <strong>0 / 3</strong>.</p>
      <div class="tutor-conversation">
        <ol id="tutor-chat-log" class="tutor-chat-log" role="log" aria-label="Conversation with UVA AI" aria-live="polite" aria-relevant="additions text" ${messageMarkup ? 'tabindex="0"' : ''}>
          ${messageMarkup}
          ${busy ? '<li class="tutor-thinking"><span class="tutor-thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="tutor-visually-hidden">Thinking…</span></li>' : ''}
        </ol>
      </div>
      <div class="tutor-quick-actions" aria-label="Ask about this question">
        <button type="button" data-tutor-prompt="Give me a hint for this question." ${disabled}>Give me a hint</button>
        <button type="button" data-tutor-prompt="Explain the concept behind this question." ${disabled}>Explain the concept</button>
        <button type="button" data-tutor-prompt="${unlocked ? 'Walk me through this question step by step.' : 'I don’t know — walk me through it.'}" ${disabled}>${unlocked ? 'Full walkthrough' : 'I don’t know — walkthrough'}</button>
      </div>
      ${error ? `<p id="tutor-error" class="tutor-error" role="alert">${escapeTutorText(error)}</p>` : ''}
      <form id="tutor-form" class="tutor-form" aria-busy="${Boolean(busy)}">
        <label class="tutor-visually-hidden" for="tutor-message">Message UVA AI</label>
        <textarea id="tutor-message" name="message" rows="1" maxlength="800" required wrap="soft" placeholder="Ask about this question…" aria-describedby="tutor-streak-warning${error ? ' tutor-error' : ''}" ${disabled}>${escapeTutorText(draft)}</textarea>
        <button type="submit" class="tutor-send-button" aria-label="Send message" ${disabled}>${sendIcon()}</button>
      </form>
    </div>
    <button type="button" class="tutor-launcher" data-tutor-toggle data-tutor-launcher aria-label="Open UVA AI assistant" aria-expanded="${Boolean(open)}" aria-controls="tutor-content">${helperIcon()}<span>UVA AI</span></button>
  </aside>`;
}
