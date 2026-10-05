import { MathfieldElement, convertLatexToMarkup } from 'mathlive';
import 'mathlive/fonts.css';
import 'mathlive/static.css';
import './style.css';
import { LEVELS, QUESTIONS, pickQuestion, getQuestion } from './questions.js';
import { checkAnswer } from './check-answer.js';
import { renderPlant } from './plant.js';
import { PLANTS } from './plants.js';
import { renderCollection, renderRewardToast } from './collection.js';
import { renderNamePrompt, renderLeaderboard, escapeHtml } from './leaderboard.js';
import { renderTutor } from './tutor.js';
import { askTutor } from './tutor-api.js';
import { getHintChoices, isGiveUpMessage } from './hints.js';
import { readCachedProfile, cacheProfile, getGuestProfile, createGuestProfile, fetchLeaderboard, sendProgress } from './leaderboard-api.js';
import { STORAGE_KEY, createProgress, submitResult, advanceQuestion, restoreProgress, giveUpQuestion, canRevealAnswer, useTutorHelp } from './progress.js';
import { ECON_LEVELS, ECON_QUESTIONS, getEconomicsQuestion, pickEconomicsQuestion } from './economics-questions.js';
import { renderEconomicsPanel } from './economics.js';
import { checkEconomicsAnswer } from './economics-answer.js';
import { gradeEconomics } from './economics-grading-api.js';
import { installEconomicsVoice } from './economics-voice.js';
import { reviewedWalkthrough } from './walkthrough.js';
import { ECON_STORAGE_KEY, createEconomicsProgress, submitEconomicsResult, giveUpEconomicsQuestion, advanceEconomicsQuestion, restoreEconomicsProgress, mergeModuleGardens, combinedScoreSnapshot } from './economics-progress.js';

MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;
const $ = (selector) => document.querySelector(selector);
const math = (latex) => convertLatexToMarkup(latex, { displayMode: true });
const MODULE_PATH = '/modules/differentiation';
const ECONOMICS_PATH = '/modules/economics';
const COLLECTION_PATH = '/collection';
const LEADERBOARD_PATH = '/leaderboard';
const icons = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  leaf: '<path d="M19 4c-8-2-15 2-14 9 1 5 7 7 11 3 3-3 3-8 3-12Z"/><path d="m5 20 9-10"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v5m-4 3h8m-6-3h4"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const brand = `<span class="brand-mark"><svg viewBox="0 0 40 46" fill="none" aria-hidden="true"><path d="M20 9v27M12 9l8 6 8-6M12 18l8 6 8-6M12 27l8 6 8-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/><path d="M11 36h18" stroke="currentColor" stroke-width="2.6"/></svg></span><span class="brand-wordmark">We Need<br>a Name<span class="brand-dot">.</span></span>`;
const sharedGarden = () => mergeModuleGardens(state.garden, economicsState.garden);
const allScores = () => combinedScoreSnapshot(state, economicsState);
const collectionLink = () => `<a href="${COLLECTION_PATH}" data-route class="collection-link ${window.location.pathname.replace(/\/$/, '') === COLLECTION_PATH ? 'active' : ''}" ${window.location.pathname.replace(/\/$/, '') === COLLECTION_PATH ? 'aria-current="page"' : ''} aria-label="Plant collection, ${sharedGarden().collection.length} of ${PLANTS.length} discovered">${icon('leaf')}<span>Collection</span><span class="collection-count">${sharedGarden().collection.length}<span aria-hidden="true">/${PLANTS.length}</span></span></a>`;
const leaderboardLink = () => `<a href="${LEADERBOARD_PATH}" data-route class="leaderboard-nav-link ${isLeaderboardPage() ? 'active' : ''}" ${isLeaderboardPage() ? 'aria-current="page"' : ''}>${icon('trophy')}<span>Leaderboard</span></a>`;
const guestBadge = () => profile ? `<span class="guest-badge" title="Remembered on this browser"><span>${escapeHtml(profile.name)}</span><span class="guest-tag">#${profile.tag}</span></span>` : '';
const siteHeader = (collection = false) => `<header class="site-header"><a href="/" data-route class="brand" aria-label="We Need a Name home">${brand}</a><nav class="home-nav" aria-label="Main navigation"><a href="/" data-route ${collection || isLeaderboardPage() ? '' : 'class="active" aria-current="page"'}>Your modules</a>${collectionLink()}${leaderboardLink()}</nav>${guestBadge()}</header>`;

let profile = readCachedProfile();
let checkingProfile = true;
let nameError = '';
let nameBusy = false;
let nameDraft = '';
let leaderboard = { entries: [], self: null, totalPlayers: 0, loading: false, loaded: false, error: '' };
let refreshQueued = false;
let syncInFlight = false;
let pendingScore = null;
let lastSynced = '';
let tutor = null;
let tutorController = null;
let economicsGrading = false;
let economicsGradeController = null;
let economicsGradeError = '';
let economicsVoiceCleanup = null;

let storageAvailable = true;
function load() {
  try {
    // Carry existing learners' progress across the rename.
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('deriva-progress-v1');
    return restoreProgress(raw, (id) => Boolean(getQuestion(id)));
  } catch { storageAvailable = false; return null; }
}
let state = load() || createProgress(QUESTIONS.easy[0].id);
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { storageAvailable = false; }
}
save();

function loadEconomics() {
  try {
    const restored = restoreEconomicsProgress(localStorage.getItem(ECON_STORAGE_KEY), (id) => Boolean(getEconomicsQuestion(id)));
    return restored && getEconomicsQuestion(restored.questionId)?.level === restored.level ? restored : null;
  } catch { storageAvailable = false; return null; }
}
let economicsState = loadEconomics() || createEconomicsProgress(ECON_QUESTIONS[0].id);
function saveEconomics() {
  try { localStorage.setItem(ECON_STORAGE_KEY, JSON.stringify(economicsState)); }
  catch { storageAvailable = false; }
}
saveEconomics();

function isPracticePage() {
  return window.location.pathname.replace(/\/$/, '') === MODULE_PATH;
}

function isLeaderboardPage() {
  return window.location.pathname.replace(/\/$/, '') === LEADERBOARD_PATH;
}

function isEconomicsPage() {
  return window.location.pathname.replace(/\/$/, '') === ECONOMICS_PATH;
}

function renderGuestEntry() {
  document.title = 'Welcome — We Need a Name';
  $('#app').innerHTML = `<div class="home-page"><header class="site-header"><a href="/" data-route class="brand" aria-label="We Need a Name home">${brand}</a></header>${checkingProfile ? '<main class="guest-loading" role="status">Opening your learning space…</main>' : renderNamePrompt({ busy: nameBusy, error: nameError })}</div>`;
  const form = $('#guest-name-form');
  if (form) {
    $('#guest-name').value = nameDraft;
    $('#guest-name').oninput = (event) => { nameDraft = event.target.value; };
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (nameBusy) return;
      nameDraft = $('#guest-name').value;
      nameBusy = true; nameError = ''; renderGuestEntry();
      try {
        profile = await createGuestProfile(nameDraft);
        cacheProfile(profile);
        leaderboard.loaded = false;
        render();
        void syncScores();
        $('main h1')?.focus();
      } catch (error) {
        nameError = error.message;
      } finally {
        nameBusy = false;
        if (!profile) { renderGuestEntry(); $('#guest-name')?.focus(); }
      }
    };
  }
}

async function initializeGuest() {
  try {
    profile = await getGuestProfile();
    cacheProfile(profile);
  } catch (error) {
    if (!profile) nameError = error.message;
  } finally {
    checkingProfile = false;
    render();
    if (profile) void syncScores();
    else $('#guest-name')?.focus();
  }
}

function updateLeaderboardView() {
  const target = $('#leaderboard-content');
  if (target) target.innerHTML = renderLeaderboard({ profile, ...leaderboard });
}

async function refreshLeaderboard() {
  if (leaderboard.loading) { refreshQueued = true; return; }
  leaderboard.loading = true; leaderboard.error = ''; updateLeaderboardView();
  try {
    const data = await fetchLeaderboard();
    leaderboard = { ...data, loading: false, loaded: true, error: '' };
  } catch (error) {
    leaderboard = { ...leaderboard, loading: false, loaded: true, error: error.message };
  }
  updateLeaderboardView();
  if (refreshQueued) { refreshQueued = false; void refreshLeaderboard(); }
}

async function syncScores() {
  if (!profile) return;
  pendingScore = allScores();
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    while (pendingScore && profile) {
      const score = pendingScore; pendingScore = null;
      const fingerprint = profile.id + JSON.stringify(score);
      if (fingerprint === lastSynced) continue;
      await sendProgress(score);
      lastSynced = fingerprint;
      leaderboard.loaded = false;
    }
    if (isLeaderboardPage()) void refreshLeaderboard();
  } catch (error) {
    pendingScore = allScores();
    if (error.status === 401) {
      profile = null; cacheProfile(null); nameError = 'Choose a name to join again on this browser.';
      render();
    } else {
      leaderboard.error = 'Your progress is saved on this device. Leaderboard syncing will retry when you’re connected.';
      updateLeaderboardView();
    }
  } finally { syncInFlight = false; }
}

function tutorContext() {
  if (isEconomicsPage()) return { module: 'economics', progress: economicsState, question: getEconomicsQuestion(economicsState.questionId) };
  if (isPracticePage()) return { module: 'math', progress: state, question: getQuestion(state.questionId) };
  return null;
}

function tutorHints(context) {
  return context.module === 'economics' ? context.question.hints : getHintChoices(context.question.id);
}

function tutorReview(context) {
  return { ...reviewedWalkthrough(context.question, context.module), isReview: true, source: 'guided' };
}

function ensureTutor() {
  const context = tutorContext();
  if (!context) return null;
  const progress = context.progress;
  // A submission keeps this conversation; a new question or module resets it.
  const key = `${context.module}:${progress.questionId}:${progress.attempts - Number(Boolean(progress.result))}`;
  const revealAllowed = canRevealAnswer(progress);
  if (!tutor || tutor.key !== key || (tutor.revealAllowed && !revealAllowed)) {
    tutorController?.abort();
    tutor = { key, module: context.module, questionId: progress.questionId, revealAllowed, open: false, messages: [], shownHintIds: [], busy: false, error: '', source: null, draft: '' };
  }
  tutor.revealAllowed = revealAllowed;
  return tutor;
}

function updateTutor() {
  const root = $('#tutor-root');
  if (!root || !ensureTutor()) return;
  const context = tutorContext();
  const contextLabel = context.module === 'economics' ? `Economics · ${context.question.title}` : `Differentiation · Level ${context.progress.level}`;
  root.innerHTML = renderTutor({ ...tutor, contextLabel, unlocked: canRevealAnswer(context.progress) });
  const field = $('#tutor-message');
  if (field) {
    field.value = tutor.draft;
    field.oninput = () => { tutor.draft = field.value; };
    field.onkeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault(); void sendTutorMessage(tutor.draft);
      }
    };
  }
  const form = $('#tutor-form');
  if (form) form.onsubmit = (event) => { event.preventDefault(); void sendTutorMessage(tutor.draft); };
}

function addTutorMessage(message) {
  tutor.messages = [...tutor.messages, message].slice(-40);
}


async function sendTutorMessage(rawMessage) {
  const context = tutorContext();
  if (!context || !profile || !ensureTutor()) return;
  const message = String(rawMessage).trim().slice(0, 800);
  if (!message || tutor.busy) return;
  if (context.module === 'economics' && economicsGrading) {
    tutor.error = 'Your explanation is being graded. You can ask a follow-up when it is ready.';
    tutor.open = true; updateTutor(); return;
  }
  // Charge the streak when a student sends, never on hover or opening the chat.
  if (context.module === 'economics') { economicsState = useTutorHelp(economicsState); saveEconomics(); }
  else { state = useTutorHelp(state); save(); }
  if (context.progress.result) render();
  else renderGrowth(tutorContext().progress);
  if (isGiveUpMessage(message) && !canRevealAnswer(tutorContext().progress)) {
    if (context.module === 'economics') { economicsState = giveUpEconomicsQuestion(economicsState); saveEconomics(); }
    else { state = giveUpQuestion(state); save(); }
    render(); void syncScores();
  }
  const session = tutor;
  const unlocked = canRevealAnswer(tutorContext().progress);
  const isCurrent = () => tutor === session && tutorContext()?.module === session.module && tutorContext()?.question.id === session.questionId && (!unlocked || canRevealAnswer(tutorContext().progress));
  session.open = true; session.busy = true; session.error = ''; session.draft = '';
  addTutorMessage({ role: 'user', text: message });
  updateTutor();
  const controller = new AbortController();
  tutorController = controller;
  const timeoutId = setTimeout(() => controller.abort('timeout'), 25000);
  try {
    const result = await askTutor({ questionId: session.questionId, message, shownHintIds: session.shownHintIds, mode: unlocked ? 'review' : 'hint', ...(unlocked ? { studentAnswer: context.module === 'economics' ? context.progress.answer?.explanation || '' : context.progress.answer || '' } : {}) }, controller.signal);
    if (!isCurrent() || controller.signal.aborted) return;
    session.source = result.source === 'ai' ? 'ai' : 'guided';
    // Equations come from the checked question; generated teaching text is escaped by the renderer.
    addTutorMessage({ role: 'assistant', text: result.text, source: session.source, ...(unlocked ? { isReview: true, steps: result.steps, answerText: reviewedWalkthrough(context.question, context.module).answerText, answerLatex: context.module === 'math' ? context.question.answerLatex : null } : {}) });
    if (tutorHints(context).some((choice) => choice.id === result.hintId)) session.shownHintIds = [...new Set([...session.shownHintIds, result.hintId])];
  } catch (error) {
    if (!isCurrent() || (controller.signal.aborted && controller.signal.reason !== 'timeout')) return;
    session.source = 'guided';
    if (unlocked) addTutorMessage({ role: 'assistant', ...tutorReview(context) });
    else {
      const choices = tutorHints(context);
      const hint = choices.find((choice) => !session.shownHintIds.includes(choice.id));
      if (hint) {
        addTutorMessage({ role: 'assistant', text: hint.text, source: 'guided' });
        session.shownHintIds = [...new Set([...session.shownHintIds, hint.id])];
      } else if (choices.length) addTutorMessage({ role: 'assistant', text: 'You’ve seen all three hints. Try an answer, or say “I don’t know” to review the solution.' });
      else session.error = 'The helper couldn’t connect. Please try again.';
    }
  } finally {
    clearTimeout(timeoutId);
    if (isCurrent() && tutorController === controller) {
      session.busy = false;
      const restoreInputFocus = session.open && (document.activeElement === document.body || $('#tutor-content')?.contains(document.activeElement));
      updateTutor();
      const log = $('#tutor-root [role="log"]');
      if (log) log.scrollTop = log.scrollHeight;
      if (restoreInputFocus) $('#tutor-message')?.focus({ preventScroll: true });
    }
  }
}

function renderHome() {
  document.title = 'We Need a Name — Your learning space';
  const started = state.attempts > 0 || Boolean(state.answer);
  const economicsStarted = economicsState.attempts > 0 || Object.keys(economicsState.answer).length > 0;
  const garden = sharedGarden();
  $('#app').innerHTML = `
    <div class="home-page">
      ${siteHeader()}
      <main class="module-home">
        <section class="home-heading">
          <div class="eyebrow">YOUR LEARNING SPACE</div>
          <h1>What will you grow today?</h1>
          
        </section>
        <section class="module-grid" aria-label="Learning modules">
          <a class="module-card" href="${MODULE_PATH}" data-route aria-label="${state.completed ? 'Open' : started ? 'Continue' : 'Start'} differentiation module">
            <div class="module-illustration" aria-hidden="true">${renderPlant(3, PLANTS[0].id)}<div class="module-formula">${math('\\frac{d}{dx}x^2=2x')}</div></div>
            <div class="module-copy">
              <span class="module-tag">MATHEMATICS</span><h2>Differentiation</h2>
              <p>Practice differentiation with UVA AI hints and step-by-step walkthroughs. Three correct answers grow a plant.</p>
              <div class="module-meta"><span>${icon('leaf')} 3 in a row to level up</span><span>${LEVELS.length} levels</span></div>
              <div class="module-action"><span>${state.completed ? 'Module complete · Open module' : started ? 'Continue practicing' : 'Open module'}</span>${icon('arrow')}</div>
            </div>
          </a>
          <a class="module-card" href="${ECONOMICS_PATH}" data-route aria-label="${economicsState.completed ? 'Open' : economicsStarted ? 'Continue' : 'Start'} economics module">
            <div class="module-illustration economics-illustration" aria-hidden="true">${renderPlant(3, PLANTS[1].id)}<div class="economics-illustration-label">One shock.<br>Many connections.</div></div>
            <div class="module-copy">
              <span class="module-tag">ECONOMICS</span><h2>Qualitative</h2>
              <p>Predict economic shocks. Explain by text or voice, then get a reasoning grade and feedback from UVA AI.</p>
              <div class="module-meta"><span>${icon('leaf')} 3 in a row to level up</span><span>${ECON_LEVELS.length} levels</span><span>No timer</span></div>
              <div class="module-action"><span>${economicsState.completed ? 'Module complete · Open module' : economicsStarted ? `Continue level ${economicsState.level}` : 'Open module'}</span>${icon('arrow')}</div>
            </div>
          </a>
        </section>
        <a class="garden-invitation" href="${COLLECTION_PATH}" data-route><div class="garden-invitation-art" aria-hidden="true">${[PLANTS[3], PLANTS[6], PLANTS[9]].map((plant) => renderPlant(3, plant.id, { mystery: !garden.collection.some((entry) => entry.plantId === plant.id) })).join('')}</div><div><span class="eyebrow">A GARDEN OF POSSIBILITIES</span><h2>${PLANTS.length} plants to discover.</h2><p>Grow in either module. ${garden.collection.length} of ${PLANTS.length} discovered.</p></div>${icon('arrow')}</a>
      </main>
      <footer class="home-footer"><span>Room to learn. Space to grow.</span><span>${storageAvailable ? 'Your progress saves on this device.' : 'Progress is available for this session.'}</span></footer>
    </div>`;
}

function renderGrowth(progress = state) {
  const streak = Math.max(0, Math.min(3, progress.streak));
  const captions = ['A little seed. A fresh start.', 'Your first little sprout.', 'One more and you’re blooming.', 'Three in a row. Look at you grow.'];
  $('#momentum').innerHTML = `
    <div class="growth-visual">${renderPlant(streak, progress.garden.activePlantId)}</div>
    <div class="streak-label" aria-live="polite"><strong>${streak}<span> / 3</span></strong><span>correct in a row</span></div>
    <div class="streak-dots" aria-label="${streak} of 3 consecutive correct answers">${[1, 2, 3].map((n) => `<span class="streak-dot ${n <= streak ? 'filled' : ''}">${n <= streak ? icon('check') : n}</span>${n < 3 ? '<i></i>' : ''}`).join('')}</div>
    <p class="growth-caption">${captions[streak]}</p>
    <div class="growing-specimen">${streak === 3 ? `<span class="specimen-name">${PLANTS.find((plant) => plant.id === progress.garden.activePlantId).name}</span><a href="${COLLECTION_PATH}" data-route>View collection ${icon('arrow')}</a>` : '<span>A mystery plant is taking shape.</span>'}</div>`;
}

function renderPanel() {
  const level = LEVELS[state.level - 1];
  const difficulty = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extreme: 'Extremely hard' }[level.difficulty];
  const levelHeader = `<div class="question-top"><div class="level-indicator"><span class="level-badge">Level ${state.level} of ${LEVELS.length}</span><span class="level-detail">${state.completed ? 'Complete' : difficulty + (level.timed ? ' · Timed' : '')}</span></div>${level.timed && !state.completed ? `<span class="timer is-timed" id="timer">${icon('clock')}<span>2:00</span></span>` : ''}</div>`;
  if (state.completed) {
    $('#practice-panel').innerHTML = `${levelHeader}<div class="completion"><div class="completion-icon">${icon('spark')}</div><div class="eyebrow">DIFFERENTIATION COMPLETE</div><h1>Look how far you’ve grown.</h1><p>All seven levels, and a garden of discoveries.<br>Play again to find more plants. Your collection stays with you.</p><button id="play-again" class="primary-button">Practice again ${icon('arrow')}</button><a class="completion-collection" href="${COLLECTION_PATH}" data-route>Explore your collection ${icon('leaf')}</a></div>`;
    $('#play-again').onclick = restart;
    return;
  }
  const question = getQuestion(state.questionId);
  if (!question) { restart(); return; }
  const result = state.result;
  const isCorrect = result?.kind === 'correct';
  $('#practice-panel').innerHTML = `
    ${levelHeader}
    <div class="question-intro"><h1>Find the derivative.</h1><p>Differentiate with respect to <em>x</em>.</p></div>
    <div class="equation" aria-label="Function to differentiate">${math('f(x) = ' + question.latex)}</div>
    ${question.domain ? `<div class="question-meta">${question.domain}</div>` : ''}
    <form id="answer-form" novalidate>
      <div class="answer-label-row"><label class="answer-label" for="answer">YOUR ANSWER</label></div>
      <div class="math-input-wrap ${result ? (isCorrect ? 'input-correct' : 'input-incorrect') : ''}"><span class="derivative-label">${math("f'(x) =")}</span><math-field id="answer" aria-label="Your derivative answer" math-virtual-keyboard-policy="manual" placeholder="\\text{Type your answer…}"></math-field></div>
      <div class="math-toolbar" role="toolbar" aria-label="Insert math notation"><div>${[
        ['fraction', '\\frac{#?}{#?}', '<span class="fraction-key"><span>a</span><span>b</span></span>'],
        ['power', '^{#?}', 'x<sup>n</sup>'],
        ['square root', '\\sqrt{#?}', '√'],
        ['parentheses', '\\left(#?\\right)', '( )'],
        ['sine', '\\sin\\left(#?\\right)', 'sin'],
        ['cosine', '\\cos\\left(#?\\right)', 'cos'],
        ['natural logarithm', '\\ln\\left(#?\\right)', 'ln'],
        ['exponential', 'e^{#?}', 'e<sup>x</sup>'],
      ].map(([label, latex, content]) => `<button type="button" class="math-key" data-insert="${latex}" aria-label="Insert ${label}" title="Insert ${label}" ${result ? 'disabled' : ''}>${content}</button>`).join('')}</div><button type="button" class="keyboard-button" id="keyboard" aria-label="Open full math keyboard" ${result ? 'disabled' : ''}>${icon('keyboard')}</button></div>
      <div id="input-error" class="input-error" role="alert"></div>
      ${result ? `<div class="answer-feedback ${isCorrect ? 'correct' : 'incorrect'}" role="status"><div class="feedback-icon">${isCorrect ? icon('check') : icon(result.kind === 'timeout' ? 'clock' : 'leaf')}</div><div><strong>${result.levelUp ? 'Three in a row. Your plant is fully grown!' : isCorrect ? (result.streakBeforeHelp ? 'That’s right. AI help reset your streak to 0 / 3.' : 'That’s right. A little more growth.') : result.kind === 'timeout' ? 'Time’s up. Let’s start a fresh streak.' : result.kind === 'given-up' ? 'Let’s learn from this one. Your streak starts fresh.' : 'Not quite. A fresh seed, a fresh start.'}</strong>${!isCorrect && canRevealAnswer(state) ? `<p>${question.explanation}</p><div class="correct-equation">${math("f'(x) = " + question.answerLatex)}</div>` : result.kind === 'timeout' ? '<p>You can ask for a hint, or choose “I don’t know” to see the solution.</p>' : ''}</div></div>` : ''}
      <div class="submit-row"><span>${result ? '' : '<kbd>↵</kbd> Enter to check'}</span><button type="${result ? 'button' : 'submit'}" id="submit-answer" class="primary-button">${result ? (result.levelUp ? `Start level ${state.level + 1}` : 'Next question') : 'Check answer'} ${icon('arrow')}</button></div>
    </form>`;

  const field = $('#answer');
  field.value = state.answer || '';
  field.readOnly = Boolean(result);
  field.smartFence = true;
  field.addEventListener('input', () => {
    if (!state.result) { state.answer = field.value; save(); $('#input-error').textContent = ''; }
  });
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); if (!state.result) submit(); }
  });
  $('#answer-form').onsubmit = (event) => { event.preventDefault(); submit(); };
  document.querySelectorAll('[data-insert]').forEach((button) => {
    button.onclick = () => { field.focus(); field.insert(button.dataset.insert, { selectionMode: 'placeholder' }); };
  });
  $('#keyboard').onclick = () => { field.focus(); window.mathVirtualKeyboard.show(); };
  if (result) $('#submit-answer').onclick = next;
}

function renderPractice() {
  document.title = 'Differentiation — We Need a Name';
  $('#app').innerHTML = `
    <div class="focus-page">
      <header class="focus-header">
        <nav class="focus-links" aria-label="Main navigation"><a href="/" data-route class="back-link">${icon('back')}<span>Modules</span></a>${collectionLink()}${leaderboardLink()}</nav>
        <div class="focus-title">Differentiation</div>
        <a href="/" data-route class="brand focus-brand" aria-label="We Need a Name home">${brand}</a>
      </header>
      <main class="focus-main"><div class="focus-grid"><div class="practice-column"><section id="practice-panel" class="practice-panel" aria-label="Differentiation question"></section></div><aside id="momentum" class="growth-panel" aria-label="Your growing plant and answer streak"></aside></div></main>
      <div id="tutor-root"></div>
    </div>`;
  renderPanel();
  renderGrowth();
  updateTutor();
}

function renderEconomics() {
  document.title = 'Economic shocks — We Need a Name';
  const question = getEconomicsQuestion(economicsState.questionId);
  const level = ECON_LEVELS[economicsState.level - 1];
  $('#app').innerHTML = `<div class="focus-page">
    <header class="focus-header"><nav class="focus-links" aria-label="Main navigation"><a href="/" data-route class="back-link">${icon('back')}<span>Modules</span></a>${collectionLink()}${leaderboardLink()}</nav><div class="focus-title">Economic shocks</div><a href="/" data-route class="brand focus-brand" aria-label="We Need a Name home">${brand}</a></header>
    ${state.deadline && !state.result ? `<div class="collection-timer-note">Your differentiation timer is still running. <a href="${MODULE_PATH}" data-route>Return to differentiation</a></div>` : ''}
    <main class="focus-main"><div class="focus-grid"><div class="practice-column" id="economics-panel">${renderEconomicsPanel({ state: economicsState, question, level, storageAvailable, grading: economicsGrading })}</div><aside id="momentum" class="growth-panel" aria-label="Your growing plant and answer streak"></aside></div></main>
    <div id="tutor-root"></div>
  </div>`;
  renderGrowth(economicsState);
  updateTutor();
  const form = $('#economics-form');
  if (form) {
    const persistDraft = () => {
      if (economicsState.result || economicsGrading || $('#economics-form') !== form) return;
      economicsState.answer = Object.fromEntries(new FormData(form));
      saveEconomics();
      economicsGradeError = '';
      const error = $('#economics-input-error');
      if (error) error.textContent = '';
    };
    form.oninput = persistDraft;
    form.onchange = persistDraft;
    form.onsubmit = (event) => { event.preventDefault(); void submitEconomics(); };
    economicsVoiceCleanup = installEconomicsVoice({ root: form, onTranscript: persistDraft });
    const error = $('#economics-input-error');
    if (error) error.textContent = economicsGradeError;
  }
}

function cancelEconomicsGrading() {
  economicsGradeController?.abort('cancelled');
  economicsGradeController = null;
  economicsGrading = false;
}

async function submitEconomics() {
  if (!isEconomicsPage() || economicsGrading || economicsState.result || economicsState.completed) return;
  economicsVoiceCleanup?.(); economicsVoiceCleanup = null;
  economicsState.answer = Object.fromEntries(new FormData($('#economics-form')));
  const question = getEconomicsQuestion(economicsState.questionId);
  const verdict = checkEconomicsAnswer(economicsState.answer, question);
  saveEconomics();
  if (verdict.status !== 'ready') {
    economicsGradeError = verdict.message || 'Complete your predictions and explanation.';
    renderEconomics(); $('#economics-input-error')?.scrollIntoView({ block: 'nearest' }); return;
  }
  const questionId = economicsState.questionId;
  const attempts = economicsState.attempts;
  const controller = new AbortController();
  economicsGradeController = controller;
  economicsGrading = true; economicsGradeError = '';
  const input = { questionId, explanation: economicsState.answer.explanation.trim(),
    predictions: Object.fromEntries(question.outcomes.map(({ id }) => [id, economicsState.answer[id]])) };
  const isCurrent = () => economicsGradeController === controller && economicsState.questionId === questionId
    && economicsState.attempts === attempts && !economicsState.result;
  render();
  const timeout = setTimeout(() => controller.abort('timeout'), 25000);
  try {
    const verdict = await gradeEconomics(input, controller.signal);
    if (!isCurrent() || controller.signal.aborted) return;
    const previousTotal = economicsState.garden.totalGrown;
    const plantId = economicsState.garden.activePlantId;
    const isNew = !sharedGarden().collection.some((entry) => entry.plantId === plantId);
    economicsState = submitEconomicsResult(economicsState, verdict.status === 'correct');
    economicsState.result.grade = verdict.grade;
    economicsGrading = false; economicsGradeController = null;
    saveEconomics(); render(); void syncScores();
    $('#economics-feedback')?.focus();
    if (economicsState.garden.totalGrown > previousTotal) showReward(plantId, isNew);
  } catch (error) {
    if (!isCurrent()) return;
    economicsGradeError = controller.signal.aborted ? 'UVA AI is taking longer than expected. Your answer and streak are saved. Try submitting again.' : error.message;
  } finally {
    clearTimeout(timeout);
    if (economicsGradeController === controller) {
      economicsGrading = false; economicsGradeController = null;
      if (isEconomicsPage()) { render(); $('#economics-input-error')?.scrollIntoView({ block: 'nearest' }); }
    }
  }
}

function nextEconomics() {
  if (economicsGrading) return;
  economicsGradeError = '';
  if (!economicsState.result || economicsState.completed) return;
  const level = economicsState.level + Number(economicsState.result.levelUp);
  const question = pickEconomicsQuestion(level, economicsState.questionId, economicsState.history);
  economicsState = advanceEconomicsQuestion(economicsState, question.id);
  saveEconomics(); render(); void syncScores();
  $('main h1')?.focus();
}

function restartEconomics() {
  cancelEconomicsGrading(); economicsGradeError = '';
  dismissReward(); tutorController?.abort(); tutor = null;
  economicsState = createEconomicsProgress(ECON_QUESTIONS[0].id, Date.now(), economicsState.garden, Math.random, economicsState.lifetime);
  saveEconomics(); render(); void syncScores();
  $('main h1')?.focus();
}

function render() {
  economicsVoiceCleanup?.(); economicsVoiceCleanup = null;
  if (!isEconomicsPage() || checkingProfile || !profile) cancelEconomicsGrading();
  if (!tutorContext() || checkingProfile || !profile) { tutorController?.abort(); tutor = null; }
  if (checkingProfile || !profile) { renderGuestEntry(); return; }
  if (isPracticePage()) renderPractice();
  else if (isEconomicsPage()) renderEconomics();
  else if (isLeaderboardPage()) {
    document.title = 'Leaderboard — We Need a Name';
    $('#app').innerHTML = `<div class="home-page">${siteHeader()}<div id="leaderboard-content">${renderLeaderboard({ profile, ...leaderboard })}</div><footer class="home-footer"><span>Room to learn. Space to grow.</span><span>Your nickname is remembered on this browser.</span></footer></div>`;
    dismissReward();
    if (!leaderboard.loaded && !leaderboard.loading) void refreshLeaderboard();
  }
  else if (window.location.pathname.replace(/\/$/, '') === COLLECTION_PATH) {
    document.title = 'Your collection — We Need a Name';
    $('#app').innerHTML = `<div class="home-page collection-shell">${siteHeader(true)}${state.deadline && !state.result ? `<div class="collection-timer-note">Your question timer is still running. <a href="${MODULE_PATH}" data-route>Return to practice ${icon('arrow')}</a></div>` : ''}${renderCollection(sharedGarden())}<footer class="home-footer"><span>A little knowledge. A growing collection.</span><span>${storageAvailable ? 'Your collection saves on this device.' : 'Collection available for this session.'}</span></footer></div>`;
    dismissReward();
  }
  else renderHome();
  tick();
}

let rewardTimer;
function dismissReward() {
  clearTimeout(rewardTimer);
  $('#toast-root').innerHTML = '';
}
function showReward(plantId, isNew) {
  dismissReward();
  $('#toast-root').innerHTML = renderRewardToast(plantId, isNew);
  const toast = $('#toast-root').firstElementChild;
  const scheduleDismiss = () => {
    clearTimeout(rewardTimer);
    if (!toast.matches(':hover') && !toast.contains(document.activeElement)) rewardTimer = setTimeout(dismissReward, 10000);
  };
  toast.addEventListener('mouseenter', () => clearTimeout(rewardTimer));
  toast.addEventListener('mouseleave', scheduleDismiss);
  toast.addEventListener('focusin', () => clearTimeout(rewardTimer));
  toast.addEventListener('focusout', () => setTimeout(scheduleDismiss, 0));
  scheduleDismiss();
}

let checking = false;
function submit() {
  if (checking || state.result || state.completed || !isPracticePage()) return;
  if (state.deadline && Date.now() >= state.deadline) { timeout(); return; }
  state.answer = $('#answer').value;
  checking = true;
  try {
    const question = getQuestion(state.questionId);
    const verdict = checkAnswer(state.answer, question.answerLatex, question.domain);
    if (verdict.status === 'invalid') {
      $('#input-error').textContent = verdict.message || 'Finish your expression before checking your answer.';
      $('#answer').focus(); save(); return;
    }
    if (state.deadline && Date.now() >= state.deadline) { timeout(); return; }
    const previousTotal = state.garden.totalGrown;
    const isNewPlant = !sharedGarden().collection.some((entry) => entry.plantId === state.garden.activePlantId);
    state = submitResult(state, verdict.status === 'correct');
    save(); render();
    void syncScores();
    $('#submit-answer')?.focus();
    if (state.garden.totalGrown > previousTotal) showReward(state.garden.activePlantId, isNewPlant);
  } catch (error) {
    console.error('Answer checking failed', error);
    $('#input-error').textContent = 'We couldn’t read that expression. Check the notation and try again.';
  } finally { checking = false; }
}

function next() {
  if (!state.result || state.completed) return;
  const nextLevel = state.level + (state.result.levelUp ? 1 : 0);
  const question = pickQuestion(nextLevel, [...state.history, state.questionId]);
  state = advanceQuestion(state, question.id);
  save(); render();
  void syncScores();
  if (window.innerWidth > 700) $('#answer')?.focus();
}

function timeout() {
  if (state.result || state.completed) return;
  state = submitResult(state, false, { timedOut: true });
  save(); render();
}

function tick() {
  if (!profile || checkingProfile || state.completed || !state.deadline) return;
  const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  const timer = $('#timer');
  if (timer) {
    timer.querySelector('span').textContent = state.result ? 'Timer stopped' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    timer.classList.toggle('timer-urgent', !state.result && seconds <= 20);
    timer.setAttribute('aria-label', state.result ? 'Timer stopped' : `${seconds} seconds remaining`);
  }
  if (seconds === 0 && !state.result) timeout();
}

function restart() { dismissReward(); tutorController?.abort(); tutor = null; state = createProgress(QUESTIONS.easy[0].id, Date.now(), state.garden, Math.random, state.lifetime); save(); render(); void syncScores(); }

document.addEventListener('click', (event) => {
  if (isEconomicsPage()) {
    if (event.target.closest('[data-econ-next]')) { nextEconomics(); return; }
    if (event.target.closest('[data-econ-restart]')) { restartEconomics(); return; }
    if (event.target.closest('[data-econ-give-up]')) {
      if (!economicsGrading) void sendTutorMessage('I don’t know — walk me through it.');
      return;
    }
  }
  const prompt = event.target.closest('[data-tutor-prompt]');
  if (prompt) { void sendTutorMessage(prompt.dataset.tutorPrompt); return; }
  if (event.target.closest('[data-tutor-toggle]') && ensureTutor()) {
    const launcher = event.target.closest('[data-tutor-launcher]');
    tutor.open = launcher ? true : !tutor.open;
    window.mathVirtualKeyboard?.hide();
    updateTutor();
    $(tutor.open ? '#tutor-message' : '[data-tutor-launcher]')?.focus({ preventScroll: true });
    return;
  }
  if (event.target.closest('[data-leaderboard-retry]')) { void syncScores(); void refreshLeaderboard(); return; }
  if (event.target.closest('[data-dismiss-toast]')) { dismissReward(); return; }
  const link = event.target.closest('a[data-route]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.mathVirtualKeyboard?.hide();
  const path = link.getAttribute('href');
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  const heading = $('main h1');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
});
// Hover is a convenient desktop entry; clicking and keyboard access work everywhere.
document.addEventListener('pointerover', (event) => {
  if (!event.target.closest('[data-tutor-launcher]') || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || !ensureTutor() || tutor.open) return;
  tutor.open = true; updateTutor();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !tutor?.open || !$('#tutor-root')) return;
  event.preventDefault(); tutor.open = false; updateTutor();
  $('[data-tutor-launcher]')?.focus({ preventScroll: true });
});
window.addEventListener('popstate', () => { window.mathVirtualKeyboard?.hide(); render(); });
window.addEventListener('storage', (event) => {
  if (event.key === ECON_STORAGE_KEY && event.newValue) {
    const updated = restoreEconomicsProgress(event.newValue, (id) => Boolean(getEconomicsQuestion(id)));
    if (updated && getEconomicsQuestion(updated.questionId)?.level === updated.level) { cancelEconomicsGrading(); economicsState = updated; render(); void syncScores(); }
    return;
  }
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  const updated = restoreProgress(event.newValue, (id) => Boolean(getQuestion(id)));
  if (updated) { state = updated; render(); void syncScores(); }
});
window.addEventListener('pagehide', () => { economicsVoiceCleanup?.(); cancelEconomicsGrading(); tutorController?.abort(); });
// A bfcache restore retains the old DOM, including a cancelled grading spinner.
// Rebuild it from the saved draft so answers are editable and retryable again.
window.addEventListener('pageshow', (event) => { if (event.persisted) render(); });
window.addEventListener('focus', tick);
document.addEventListener('visibilitychange', tick);
setInterval(tick, 250);
window.addEventListener('online', () => { if (profile) void syncScores(); });
setInterval(() => { if (document.visibilityState === 'visible' && profile) { void syncScores(); if (isLeaderboardPage()) void refreshLeaderboard(); } }, 30000);
render();
void initializeGuest();
