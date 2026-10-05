import { RARITIES } from './rarities.js';
import './leaderboard.css';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const icon = (content, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const leafIcon = () => icon('<path d="M12 20v-9m0 5c-5 0-8-3-8-7 5 0 8 3 8 7Zm0-4c0-5 3-8 8-8 0 5-3 8-8 8Z"/>');
const arrowIcon = () => icon('<path d="M5 12h14m-5-5 5 5-5 5"/>');
const retryIcon = () => icon('<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>');
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const formatCount = (value) => new Intl.NumberFormat('en').format(count(value));
const rankText = (value) => Number.isSafeInteger(value) && value > 0 ? formatCount(value) : '—';
const identity = (profile) => `<span class="leaderboard-display-name">${escapeHtml(profile?.name)}</span><span class="leaderboard-name-tag">#${escapeHtml(profile?.tag)}</span>`;
const progressDetail = (entry) => `<div class="leaderboard-person-progress">Level ${Math.max(1, Math.min(7, count(entry.highestLevel)))} <span aria-hidden="true">·</span> ${formatCount(entry.plantsGrown)} ${count(entry.plantsGrown) === 1 ? 'plant' : 'plants'} grown</div>`;

/** Full-page guest onboarding. The app owns submission, persistence, and errors. */
export function renderNamePrompt({ busy = false, error = '' } = {}) {
  return `<main class="name-prompt-page">
    <section class="name-prompt-panel" aria-labelledby="name-prompt-title">
      <div class="name-prompt-emblem" aria-hidden="true">${leafIcon()}</div>
      <p class="eyebrow">A LITTLE INTRODUCTION</p>
      <h1 id="name-prompt-title" tabindex="-1">Make yourself at home.</h1>
      <p class="name-prompt-intro">A little practice. A growing collection.<br>A place on the leaderboard, just for you.</p>
      <form id="guest-name-form" class="guest-name-form" aria-busy="${Boolean(busy)}">
        <label for="guest-name">What should we call you?</label>
        <input id="guest-name" name="name" type="text" maxlength="24" required autocomplete="nickname" autocapitalize="words" spellcheck="false" placeholder="Your name" aria-describedby="guest-name-hint${error ? ' guest-name-error' : ''}" ${busy ? 'disabled' : ''}>
        <p id="guest-name-hint" class="guest-name-hint">No account needed. We’ll add a random four-digit tag.</p>
        ${error ? `<p id="guest-name-error" class="guest-name-error" role="alert">${escapeHtml(error)}</p>` : ''}
        <button type="submit" class="primary-button guest-name-submit" ${busy ? 'disabled' : ''}>${busy ? '<span class="leaderboard-spinner" aria-hidden="true"></span>Making room for you…' : `Let’s grow ${arrowIcon()}`}</button>
      </form>
      <p class="name-prompt-visibility">Your name and progress appear on the leaderboard.</p>
      <p class="name-prompt-memory">Remembered on this browser.</p>
    </section>
  </main>`;
}

function renderRow(entry, profile) {
  const own = Boolean(profile?.id && entry.id === profile.id);
  const podium = Number.isSafeInteger(entry.rank) && entry.rank > 0 && entry.rank <= 3;
  return `<tr class="${own ? 'leaderboard-own-row' : ''}">
    <td class="leaderboard-rank-cell"><span class="leaderboard-rank ${podium ? `rank-${entry.rank}` : ''}">${rankText(entry.rank)}</span></td>
    <th scope="row" class="leaderboard-person"><div class="leaderboard-person-line">${identity(entry)}${own ? '<span class="leaderboard-you">You</span>' : ''}</div>${progressDetail(entry)}</th>
    <td class="leaderboard-score leaderboard-points">${formatCount(entry.collectionScore)}</td>
    <td class="leaderboard-score leaderboard-correct">${formatCount(entry.correctAnswers)}</td>
  </tr>`;
}

function renderSelf(self, profile) {
  return `<section class="leaderboard-self" aria-label="Your leaderboard position">
    <div class="leaderboard-self-rank"><span>Your rank</span><strong>${rankText(self.rank)}</strong></div>
    <div class="leaderboard-self-person"><span class="eyebrow">YOUR PLACE IN THE GARDEN</span><div>${identity({ ...profile, ...self })}<span class="leaderboard-you">You</span></div>${progressDetail(self)}</div>
    <div class="leaderboard-self-stat"><strong>${formatCount(self.collectionScore)}</strong><span>collection points</span></div>
    <div class="leaderboard-self-stat"><strong>${formatCount(self.correctAnswers)}</strong><span>correct answers</span></div>
  </section>`;
}

function renderRetry(error) {
  return `<div class="leaderboard-error-message" role="alert"><p>${escapeHtml(error)}</p><button type="button" class="leaderboard-retry" data-leaderboard-retry>${retryIcon()}Try again</button></div>`;
}

/** Presentation only: the app fetches live rankings and passes the current state. */
export function renderLeaderboard({ profile, entries = [], self = null, totalPlayers = 0, loading = false, error = '' } = {}) {
  const rows = Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object') : [];
  const ownRowVisible = Boolean(profile?.id && rows.some((entry) => entry.id === profile.id));
  let content;
  if (rows.length) {
    content = `${error ? renderRetry(error) : ''}
      <div class="leaderboard-table-panel" aria-busy="${Boolean(loading)}">
        <div class="leaderboard-table-heading"><h2>The growing list</h2><span>${loading ? '<span class="leaderboard-refreshing" role="status">Refreshing…</span>' : `${formatCount(totalPlayers)} ${count(totalPlayers) === 1 ? 'player' : 'players'}`}</span></div>
        <table class="leaderboard-table">
          <caption class="leaderboard-sr-only">Players ranked by collection points, then highest level, then correct answers. Your own row is marked You.</caption>
          <thead><tr><th scope="col" class="leaderboard-rank-heading">Rank</th><th scope="col">Name</th><th scope="col" class="leaderboard-number-heading">Collection <span>points</span></th><th scope="col" class="leaderboard-number-heading">Correct <span>answers</span></th></tr></thead>
          <tbody>${rows.map((entry) => renderRow(entry, profile)).join('')}</tbody>
        </table>
      </div>`;
  } else if (loading) {
    content = `<section class="leaderboard-state leaderboard-loading" role="status" aria-live="polite"><span class="leaderboard-spinner" aria-hidden="true"></span><h2>Finding the latest growth.</h2><p>Loading the leaderboard…</p></section>`;
  } else if (error) {
    content = `<section class="leaderboard-state leaderboard-unavailable"><div class="leaderboard-state-icon" aria-hidden="true">${leafIcon()}</div><h2>The leaderboard needs a moment.</h2>${renderRetry(error)}<p class="leaderboard-state-reassurance">You can keep practicing while we reconnect.</p><a href="/" class="leaderboard-practice-link" data-route>Choose a module ${arrowIcon()}</a></section>`;
  } else {
    content = `<section class="leaderboard-state leaderboard-empty"><div class="leaderboard-state-icon" aria-hidden="true">${leafIcon()}</div><h2>Every garden starts somewhere.</h2><p>No scores yet. Grow your first plant to get things started.</p><a href="/" class="primary-button" data-route>Choose a module ${arrowIcon()}</a></section>`;
  }
  return `<main class="leaderboard-page">
    <header class="leaderboard-page-heading">
      <div><p class="eyebrow">A LITTLE FRIENDLY COMPETITION</p><h1 tabindex="-1">Growing, together<span>.</span></h1></div>
      ${profile ? `<div class="leaderboard-identity"><span class="leaderboard-identity-label">YOU’RE GROWING AS</span><div>${identity(profile)}</div><p>Remembered on this browser</p></div>` : ''}
    </header>
    <div class="leaderboard-explainer">${leafIcon()}<p>Rarer discoveries earn more points. Each species scores once.<span class="leaderboard-rarity-points">${RARITIES.map((rarity) => `${escapeHtml(rarity.label)} ${rarity.points}`).join(' <span aria-hidden="true">·</span> ')}</span></p></div>
    ${content}
    ${self && !ownRowVisible && !loading ? renderSelf(self, profile) : ''}
    <p class="leaderboard-bottom-note">Ranked by collection points, then highest level, then correct answers.</p>
  </main>`;
}
