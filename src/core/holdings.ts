/**
 * What the village has, as numbers.
 *
 * The buildings already say it — a full granary, a bridge that holds a cart —
 * but a building that changes once behind a fade, while a line of prose is
 * being read, is not something a player can count. The first playtester came
 * home from the field and could not say what she had got out of it, or
 * whether it could have gone better.
 *
 * So the same facts are also kept here, plainly, in the two terms the village
 * actually thinks in: what there is to eat, and where you can get to. Both are
 * meant to run the length of the game — bread is a store that fills and
 * empties as the village is fed, roads are the ways out that get opened one at
 * a time — so both are sized with room left over. An empty cell is a promise,
 * not a bug.
 */

import { state, type Outcome, type RunState } from './state';

/** How much the granary holds when it is full. */
export const BREAD_CAP = 6;
/** Ways out of the valley, counting the one the village starts with. */
export const ROAD_CAP = 4;

/** A road is either not there, passable with care, or good for a cart. */
export type RoadState = 'none' | 'frail' | 'sound';

export interface Holdings {
  /** Loaves in the granary, 0..BREAD_CAP. */
  bread: number;
  /** One entry per way out, in the order they open. Length is ROAD_CAP. */
  roads: RoadState[];
}

/** What a finished encounter is worth in the granary. */
const BREAD_FROM: Record<Outcome, number> = { none: 0, poor: 1, good: 2 };

/** How an outcome reads as a road: a whole share builds something that lasts. */
const ROAD_FROM: Record<Outcome, RoadState> = { none: 'none', poor: 'frail', good: 'sound' };

/**
 * Reads the run. Takes the state rather than always asking for it, so the HUD
 * can also be handed the state the player was last SHOWN — which is how a mark
 * gets to fill in front of them instead of being already full when they walk in.
 */
export function holdings(s: Pick<RunState, 'jumis' | 'velns'> = state.get()): Holdings {
  const roads: RoadState[] = new Array(ROAD_CAP).fill('none');
  // The cart track out to the field. It was there before the player was.
  roads[0] = 'sound';
  roads[1] = ROAD_FROM[s.velns];
  return {
    bread: Math.min(BREAD_CAP, BREAD_FROM[s.jumis]),
    roads,
  };
}

/** Ways out that can actually be walked, for the count beside the row. */
export const roadsOpen = (h: Holdings): number => h.roads.filter((r) => r !== 'none').length;
