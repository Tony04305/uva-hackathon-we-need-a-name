import { PLANTS } from './plants.js';
import { collectionScore, RARITIES } from './rarities.js';
import { renderPlant } from './plant.js';
import './collection.css';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const isPositiveCount = (value) => Number.isSafeInteger(value) && value > 0;
const rarityFor = (plant) => RARITIES.find((rarity) => rarity.id === plant.rarity);
const levelLabel = (rarity) => `Level ${rarity.minLevel}${rarity.minLevel === 7 ? '' : '+'}`;
const icon = (content, extraClass = '') => `<svg class="icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const leafIcon = () => icon('<path d="M19 4C11 2 4 6 5 13c1 5 7 7 11 3 3-3 3-8 3-12Z"/><path d="m5 20 9-10"/>');
const arrowIcon = () => icon('<path d="M5 12h14m-5-5 5 5-5 5"/>');
const lockIcon = () => icon('<rect x="6" y="10" width="12" height="10" rx="3"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/><path d="M12 14v2"/>');

function renderCard(plant, collected, index) {
  const unlocked = Boolean(collected);
  const name = escapeHtml(plant.name);
  const rarity = escapeHtml(plant.rarity);
  const rarityInfo = rarityFor(plant);
  const number = String(index + 1).padStart(2, '0');
  const headingId = `specimen-${plant.id}`;
  return `<li class="collection-card ${unlocked ? 'is-discovered' : 'is-mystery'} rarity-${rarity}">
    <article aria-labelledby="${headingId}">
      <div class="specimen-art" aria-hidden="true">
        <div class="specimen-card-top"><span class="rarity-badge">${escapeHtml(rarityInfo.label)}</span><span class="specimen-number">${number}</span></div>
        ${renderPlant(3, plant.id, { mystery: !unlocked })}
        ${unlocked ? '' : `<span class="specimen-lock">${lockIcon()}</span>`}
      </div>
      <div class="specimen-copy">
        <h2 id="${headingId}">${unlocked ? name : '<span aria-hidden="true">???</span><span class="collection-sr-only">Undiscovered ' + rarity + ' plant ' + number + '</span>'}</h2>
        <div class="specimen-foot">${unlocked
          ? `${leafIcon()}<span>Grown <strong>${collected.count}</strong> ${collected.count === 1 ? 'time' : 'times'}</span>`
          : `${lockIcon()}<span>${levelLabel(rarityInfo)}</span>`}<span class="specimen-points">${rarityInfo.points} ${rarityInfo.points === 1 ? 'point' : 'points'}</span></div>
      </div>
    </article>
  </li>`;
}

/** Render the collection's main content; the app supplies its shared navigation. */
export function renderCollection(garden = {}) {
  const collection = new Map();
  for (const entry of Array.isArray(garden.collection) ? garden.collection : []) {
    if (entry && PLANTS.some((plant) => plant.id === entry.plantId) && isPositiveCount(entry.count)) {
      collection.set(entry.plantId, entry);
    }
  }
  const discovered = collection.size;
  const collectionPoints = collectionScore([...collection.keys()]);
  const totalGrown = Number.isSafeInteger(garden.totalGrown) && garden.totalGrown >= 0
    ? garden.totalGrown
    : [...collection.values()].reduce((sum, entry) => sum + entry.count, 0);
  return `<main class="collection-page">
    <header class="collection-heading">
      <div class="collection-intro">
        <p class="eyebrow">A LITTLE PROGRESS, A LITTLE GROWTH</p>
        <h1 tabindex="-1">Your collection<span class="collection-heading-dot">.</span></h1>
        
      </div>
      <div class="collection-tally">
        <div><strong>${String(discovered).padStart(2, '0')}</strong><span> / ${PLANTS.length}</span></div>
        <p>plants discovered</p>
        <progress value="${discovered}" max="${PLANTS.length}" aria-label="Plants discovered">${discovered} of ${PLANTS.length}</progress>
      </div>
    </header>
    <section class="collection-rarities" aria-label="Plant rarities and unlock levels">
      <ul>${RARITIES.map((rarity) => `<li class="rarity-${rarity.id}"><span class="rarity-badge">${escapeHtml(rarity.label)}</span><span>${levelLabel(rarity)}</span></li>`).join('')}</ul>
      <p>Higher levels unlock rarer discoveries. Exotic plants have a 5% chance at level 7 only.</p>
    </section>
    <div class="collection-shelf-heading">
      <div class="collection-shelf-note">${leafIcon()}<p>${discovered === 0
        ? 'Your first discovery is one good streak away.'
        : `${totalGrown} ${totalGrown === 1 ? 'plant' : 'plants'} grown. Each one started with three in a row.`}</p></div>
      <a class="collection-practice-link" href="/" data-route>Choose a module ${arrowIcon()}</a>
    </div>
    <ul class="collection-grid" aria-label="Plant collection">${PLANTS.map((plant, index) => renderCard(plant, collection.get(plant.id), index)).join('')}</ul>
    <p class="collection-bottom-note">${leafIcon()}<span><strong>${collectionPoints} collection ${collectionPoints === 1 ? 'point' : 'points'}.</strong> Each species scores once. Growing it again adds no extra points.</span></p>
  </main>`;
}

/** A polite, nonblocking notification. The app owns dismissal and its lifetime. */
export function renderRewardToast(plantId, isNew) {
  const plant = PLANTS.find((item) => item.id === plantId);
  if (!plant) return '';
  const rarity = rarityFor(plant);
  return `<aside class="plant-reward-toast ${isNew ? 'is-new-discovery' : 'is-repeat-discovery'}" role="status" aria-live="polite" aria-atomic="true">
    <div class="reward-toast-art" aria-hidden="true">${renderPlant(3, plant.id)}</div>
    <div class="reward-toast-copy">
      <div class="reward-toast-kicker">${isNew ? 'Added to your collection' : 'Grown again'}<span class="reward-toast-badge">${isNew ? `+${rarity.points} ${rarity.points === 1 ? 'point' : 'points'}` : 'Repeat'}</span></div>
      <p class="reward-toast-name">${escapeHtml(plant.name)}</p>
      <a href="/collection" class="reward-toast-link" data-route>View collection ${arrowIcon()}</a>
    </div>
    <button type="button" class="reward-toast-close" data-dismiss-toast aria-label="Dismiss notification">${icon('<path d="m6 6 12 12M18 6 6 18"/>')}</button>
  </aside>`;
}
