import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { PLANTS } from '../src/plants.js';
import { RARITIES } from '../src/rarities.js';

async function loadRenderer(file) {
  const { outputFiles } = await build({
    entryPoints: [fileURLToPath(new URL(`../src/${file}.js`, import.meta.url))],
    bundle: true, write: false, platform: 'node', format: 'esm',
    loader: { '.css': 'empty' },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}
const { renderCollection, renderRewardToast } = await loadRenderer('collection');
const { renderLeaderboard } = await loadRenderer('leaderboard');

test('the collection hides undiscovered names and shows five level gates without the removed captions', () => {
  const html = renderCollection();
  for (const plant of PLANTS) assert.ok(!html.includes(plant.name));
  for (const rarity of RARITIES) assert.ok(html.includes(`>${rarity.label}</span>`));
  assert.match(html, /Exotic plants have a 5% chance at level 7 only/);
  assert.match(html, /Level 2\+/);
  assert.ok(!html.includes('Legendary'));
  assert.ok(!html.includes('Grow a plant at'));
  assert.ok(!html.includes('A little mystery'));
});

test('collection points count distinct discoveries instead of specimen counts', () => {
  const common = PLANTS.find((plant) => plant.rarity === 'common');
  const exotic = PLANTS.find((plant) => plant.rarity === 'exotic');
  const html = renderCollection({ collection: [
    { plantId: common.id, count: 100 },
    { plantId: exotic.id, count: 2 },
    { plantId: exotic.id, count: 2 },
    { plantId: 'bad-id', count: 100 },
  ] });
  assert.ok(html.includes(common.name));
  assert.ok(html.includes(exotic.name));
  assert.match(html, /<strong>101 collection points\.<\/strong>/);
  assert.match(html, /Each species scores once/);
});

test('new discoveries show their rarity points, while duplicate rewards claim no extra points', () => {
  const exotic = PLANTS.find((plant) => plant.rarity === 'exotic');
  const newToast = renderRewardToast(exotic.id, true);
  const repeatToast = renderRewardToast(exotic.id, false);
  assert.ok(newToast.includes('+100 points'));
  assert.ok(repeatToast.includes('Repeat'));
  assert.ok(!repeatToast.includes('+100'));
  assert.equal(renderRewardToast('unknown', true), '');
});

test('leaderboard puts collection points in the primary score and explains tie breaks', () => {
  const html = renderLeaderboard({ profile: { id: 'p1' }, entries: [
    { id: 'p1', name: 'A', tag: '1234', rank: 1, collectionScore: 101, plantsGrown: 12, highestLevel: 7, correctAnswers: 40 },
  ], totalPlayers: 1 });
  assert.match(html, /class="leaderboard-score leaderboard-points">101<\/td>/);
  assert.ok(html.includes('12 plants grown'));
  assert.ok(html.includes('Level 7'));
  assert.ok(html.includes('Collection <span>points</span>'));
  assert.ok(html.includes('collection points, then highest level, then correct answers'));
  assert.ok(html.includes('Each species scores once'));
  assert.ok(!html.includes('Ranked by plants grown'));
  for (const rarity of RARITIES) assert.ok(html.includes(`${rarity.label} ${rarity.points}`));
});

test('off-page self scores follow the same metric and guest data remains escaped', () => {
  const html = renderLeaderboard({
    profile: { id: 'p2', name: '<script>alert(1)</script>', tag: '1234' },
    entries: [{ id: 'p1', name: 'First', tag: '4321', rank: 1, collectionScore: 100 }],
    self: { rank: 101, collectionScore: 13, plantsGrown: 6, highestLevel: 3, correctAnswers: 20 },
  });
  assert.ok(html.includes('<strong>13</strong><span>collection points</span>'));
  assert.ok(html.includes('Level 3'));
  assert.ok(html.includes('6 plants grown'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
