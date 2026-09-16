/**
 * The branch table for both encounters, as pure functions.
 *
 * These deliberately live outside the scenes. The scenes own presentation —
 * typewriter text, fades, sprites — and none of that is testable in any
 * reasonable amount of time. What actually needs to be right is *which outcome
 * a given set of player choices produces*, and that is all in here, where it
 * can be checked in milliseconds by `npm test`.
 *
 * The game's subject is what you leave behind, so the rules are about amounts
 * and prices rather than right and wrong buttons:
 *
 *   the field    how much you cut, and what you do with the double ear
 *   the loaf     what kind of year it was baked from, which is what the bog
 *                argument turns on
 *   the bog      what you give up to cross, and whether you gave it in time
 */

import type { Outcome } from './state';

// --- the field --------------------------------------------------------------

/**
 * What became of the double ear, and of the field around it.
 *
 *   leave  cut around it, bent it to the ground and tied it. The tithe.
 *   take   pulled it up and carried it home to the granary — Jumja ķeršana,
 *          a real custom, and a different good rather than a lesser one.
 *   all    put the blade through it. Everything taken.
 *   spare  stopped with a third of the field or more still standing. The
 *          field is content; the village goes short. The opposite mistake.
 */
export type JumisPick = 'leave' | 'take' | 'all' | 'spare';

/** What kind of loaf a year gives. The bog argument depends on it. */
export type Loaf = 'jumis' | 'good' | 'thin';

/** Left standing at or above this, the field has been given too much. */
export const SPARE_AT = 1 / 3;
/** "That will do" is offered once this much of the field is down. */
export const DONE_AT = 0.5;
/** Past this there is nothing left worth chasing; the harvest ends itself. */
export const CLEAN_AT = 0.97;
/** Sheaves in a whole field. */
export const FULL_CART = 8;
/** The patch the double ear stands in is the heaviest sheaf in the field. */
export const HEAVY_SHEAF = 2;

/** How much bread the village can hold. Sized to what the game can give. */
export const BREAD_CAP = 3;
/** Ways out of the valley: the cart track, and the crossing. */
export const ROAD_CAP = 2;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Leaving the ear is the tithe; taking it home is the other good. */
export function jumisOutcome(pick: JumisPick): Outcome {
  return pick === 'leave' || pick === 'take' ? 'good' : 'poor';
}

/** The field as the player left it: given too much, or given its share. */
export function judgeField(left: number): 'spare' | 'share' {
  return left >= SPARE_AT ? 'spare' : 'share';
}

/**
 * The cart, counted. Every eighth of the field is a sheaf; the double ear's
 * patch is worth two more, which is exactly why cutting it is tempting.
 */
export function sheavesFrom(cut: number, earCut: boolean): number {
  return Math.round(FULL_CART * clamp01(cut)) + (earCut ? HEAVY_SHEAF : 0);
}

/**
 * What the year's loaf is made of.
 *
 * A field that kept its share — or more than its share — bakes honest bread.
 * A stripped one bakes a loaf with nothing in it. Bread from grain that lay
 * beside Jumis in the granary carries him.
 */
export function loafFrom(pick: JumisPick | 'none'): Loaf {
  if (pick === 'take') return 'jumis';
  if (pick === 'leave' || pick === 'spare') return 'good';
  return 'thin';
}

/**
 * How much bread the cart comes to, once threshed.
 *
 * The greedy cart is the biggest and gives the least: the grain "dries light".
 * Jumis in the granary takes his share from the granary instead of the field,
 * so a taken year is one loaf short of a tithed one.
 */
export function breadFrom(pick: JumisPick | 'none', sheaves: number): number {
  switch (pick) {
    case 'leave':
      return sheaves >= 6 ? 3 : 2;
    case 'take':
      return sheaves >= 6 ? 2 : 1;
    case 'spare':
    case 'all':
      return 1;
    default:
      return 0;
  }
}

// --- the bog ----------------------------------------------------------------

/**
 * How the bargain was settled.
 *
 *   cat    sent the village cat over first. The classic trick.
 *   bread  threw the loaf over first. Only as good as the loaf.
 *   self   walked over first yourself.
 *   dawn   did nothing until the cocks crowed.
 */
export type VelnsPick = 'cat' | 'bread' | 'self' | 'dawn';

/** One reason the bridge came out worse than it could have. */
export type VelnsMiss = 'riddle' | 'self' | 'bread' | 'dawn';

/**
 * The night, in numbers. He lays a plank every `everyMs` — faster if the
 * player out-riddled him — and the cocks crow at `cockMs` whatever he has
 * done. A good bargain finishes the bridge on the spot, so paying early never
 * costs anything; waiting past dawn does.
 */
export const NIGHT = {
  planks: 8,
  everyMs: 5200,
  quickEveryMs: 3600,
  /** The bargain list comes up if the bag has not been reached for. */
  listAfterMs: 20000,
  dawnFromMs: 42000,
  cockMs: 72000,
} as const;

/**
 * Every reason encounter two fell short, in the order they happened. Empty
 * means the bridge came out whole.
 *
 * - Fumbling both riddles costs the good bridge — unless the loaf carries
 *   Jumis, against which no argument of his holds.
 * - Walking across first yourself is always the diminished outcome.
 * - The cat always works. It also never comes home.
 * - Bread works exactly when it was baked from a field that kept its share.
 *   That is the link that makes the two encounters one system.
 * - Letting the cocks crow with nothing paid leaves an unpaid bridge, and an
 *   unpaid bridge does not last till morning.
 *
 * The reckoning builds its "what you should have done" line from this list,
 * and `velnsOutcome` is derived from it, so the advice can never disagree with
 * the verdict.
 */
export function velnsMisses(pick: VelnsPick, riddleRight: boolean, loaf: Loaf | 'none'): VelnsMiss[] {
  const misses: VelnsMiss[] = [];
  const jumisLoaf = pick === 'bread' && loaf === 'jumis';
  if (!riddleRight && !jumisLoaf) misses.push('riddle');
  if (pick === 'self') misses.push('self');
  if (pick === 'bread' && loaf !== 'good' && loaf !== 'jumis') misses.push('bread');
  if (pick === 'dawn') misses.push('dawn');
  return misses;
}

/** Encounter two: whole only when nothing was missed. */
export function velnsOutcome(pick: VelnsPick, riddleRight: boolean, loaf: Loaf | 'none'): Outcome {
  return velnsMisses(pick, riddleRight, loaf).length === 0 ? 'good' : 'poor';
}

/** The cat goes with him, whether or not the bridge came out whole. */
export const catLost = (pick: VelnsPick): boolean => pick === 'cat';

/** Against a loaf with Jumis in it he does not argue; he leaves the bog. */
export const devilGone = (pick: VelnsPick, loaf: Loaf | 'none'): boolean =>
  pick === 'bread' && loaf === 'jumis';

// --- the year ---------------------------------------------------------------

/** Which set of closing lines the ending uses. */
export function ending(jumis: Outcome, velns: Outcome): 'both' | 'half' | 'neither' {
  const n = (jumis === 'good' ? 1 : 0) + (velns === 'good' ? 1 : 0);
  return n === 2 ? 'both' : n === 1 ? 'half' : 'neither';
}

/** Everything the tally needs to say how the year went. */
export interface YearSummary {
  jumisPick: JumisPick;
  velns: Outcome;
  catLost: boolean;
  bread: number;
}

/** What still stood between this year and a perfect one, in the order the tally names them. */
export type Shortfall = 'field' | 'crossing' | 'bread' | 'cat';

export function shortfalls(y: YearSummary): Shortfall[] {
  const out: Shortfall[] = [];
  if (jumisOutcome(y.jumisPick) !== 'good') out.push('field');
  if (y.velns !== 'good') out.push('crossing');
  // Only worth naming once both shares are whole — before that the granary
  // is the least of it.
  if (!out.length && y.bread < BREAD_CAP) out.push('bread');
  if (y.catLost) out.push('cat');
  return out;
}

/** A year that cannot be done better. */
export const perfectYear = (y: YearSummary): boolean => shortfalls(y).length === 0;
