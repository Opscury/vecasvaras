/**
 * What the village has to eat, as a number.
 *
 * The granary already says it — a full store, a patched shed, sheaves stacked
 * against the wall — but a building that changes once behind a fade is not
 * something a player can count, so the same fact is kept here plainly and
 * shown as a gauge that fills.
 *
 * Roads used to live here too, as a row of dots. They are a map now
 * (`core/atlas.ts`), because a dot cannot say why a road is shut.
 *
 * Bread is sized to what a year can actually give: a perfect year fills the
 * gauge. An earlier version left half of it empty as a promise of encounters
 * to come, and a first-timer read an unfillable meter beside "it cannot be
 * done better" as a failure. The promise of more is the map's job now, and the
 * beliefs page's.
 */

import { state, type RunState } from './state';
import { BREAD_CAP, breadFrom } from './rules';

export { BREAD_CAP };

export interface Holdings {
  /** Loaves in the granary, 0..BREAD_CAP. */
  bread: number;
}

/** The part of the run the HUD reads. */
export type HoldingsSource = Pick<RunState, 'jumisPick' | 'jumisPaid' | 'sheaves' | 'velns'>;

/**
 * Reads the run. Takes the state rather than always asking for it, so the HUD
 * can also be handed the state the player was last SHOWN — which is how the
 * gauge gets to fill in front of them instead of being already full when they
 * walk in.
 *
 * Bread only counts once Anna has threshed the cart. The harvest coming home
 * is a cart of sheaves; what it is worth is decided in her yard.
 */
export function holdings(s: HoldingsSource = state.get()): Holdings {
  return { bread: s.jumisPaid ? Math.min(BREAD_CAP, breadFrom(s.jumisPick, s.sheaves)) : 0 };
}

/** The slice of the run the HUD needs, copied, for remembering what was shown. */
export const snapshot = (s: HoldingsSource = state.get()): HoldingsSource => ({
  jumisPick: s.jumisPick,
  jumisPaid: s.jumisPaid,
  sheaves: s.sheaves,
  velns: s.velns,
});
