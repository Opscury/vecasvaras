/**
 * What the village has, as numbers.
 *
 * The buildings already say it — a full granary, a bridge that holds a cart —
 * but a building that changes once behind a fade is not something a player
 * can count. So the same facts are kept here, plainly, in the two terms the
 * village thinks in: what there is to eat, and where you can get to.
 *
 * Both are sized to what the game can actually give. A perfect year fills
 * both rows. An earlier version left half of each row empty as a promise of
 * encounters to come, and a first-timer read an unfillable meter beside "it
 * cannot be done better" as a failure. The promise of more is the stone's job
 * now, and the beliefs page's.
 */

import { state, type Outcome, type RunState } from './state';
import { BREAD_CAP, ROAD_CAP, breadFrom } from './rules';

export { BREAD_CAP, ROAD_CAP };

/** A road is either not there, passable with care, or good for a cart. */
export type RoadState = 'none' | 'frail' | 'sound';

export interface Holdings {
  /** Loaves in the granary, 0..BREAD_CAP. */
  bread: number;
  /** One entry per way out, in the order they open. Length is ROAD_CAP. */
  roads: RoadState[];
}

/** How an outcome reads as a road: a whole share builds something that lasts. */
const ROAD_FROM: Record<Outcome, RoadState> = { none: 'none', poor: 'frail', good: 'sound' };

/** The part of the run the corner reads. */
export type HoldingsSource = Pick<RunState, 'jumisPick' | 'jumisPaid' | 'sheaves' | 'velns'>;

/**
 * Reads the run. Takes the state rather than always asking for it, so the HUD
 * can also be handed the state the player was last SHOWN — which is how a mark
 * gets to fill in front of them instead of being already full when they walk in.
 *
 * Bread only counts once Anna has threshed the cart. The harvest coming home
 * is a cart of sheaves; what it is worth is decided in her yard.
 */
export function holdings(s: HoldingsSource = state.get()): Holdings {
  const roads: RoadState[] = new Array(ROAD_CAP).fill('none');
  // The cart track out to the field. It was there before the player was.
  roads[0] = 'sound';
  roads[1] = ROAD_FROM[s.velns];
  return {
    bread: s.jumisPaid ? Math.min(BREAD_CAP, breadFrom(s.jumisPick, s.sheaves)) : 0,
    roads,
  };
}

/** Ways out that can actually be walked, for the count beside the row. */
export const roadsOpen = (h: Holdings): number => h.roads.filter((r) => r !== 'none').length;

/** The slice of the run `holdings` needs, copied, for remembering what was shown. */
export const snapshot = (s: HoldingsSource = state.get()): HoldingsSource => ({
  jumisPick: s.jumisPick,
  jumisPaid: s.jumisPaid,
  sheaves: s.sheaves,
  velns: s.velns,
});
