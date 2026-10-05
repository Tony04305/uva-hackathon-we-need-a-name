import { PLANTS } from './plants.js';

/** Unlocks apply to the current module level, not a student's lifetime best. */
export const RARITIES = Object.freeze([
  Object.freeze({ id: 'common', label: 'Common', minLevel: 1, points: 1 }),
  Object.freeze({ id: 'uncommon', label: 'Uncommon', minLevel: 2, points: 3 }),
  Object.freeze({ id: 'rare', label: 'Rare', minLevel: 3, points: 10 }),
  Object.freeze({ id: 'epic', label: 'Epic', minLevel: 5, points: 30 }),
  Object.freeze({ id: 'exotic', label: 'Exotic', minLevel: 7, points: 100 }),
]);

const POINTS_BY_PLANT = new Map(PLANTS.map((plant) => [
  plant.id,
  RARITIES.find((rarity) => rarity.id === plant.rarity)?.points || 0,
]));

/** One rarity reward per discovered species, regardless of duplicate specimens. */
export function collectionScore(plantIds) {
  return [...new Set(Array.isArray(plantIds) ? plantIds : [])]
    .reduce((total, id) => total + (POINTS_BY_PLANT.get(id) || 0), 0);
}
