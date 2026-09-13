/**
 * The branch table for both encounters, as pure functions.
 *
 * These deliberately live outside the scenes. The scenes own presentation —
 * typewriter text, fades, sprites — and none of that is testable in any
 * reasonable amount of time. What actually needs to be right is *which outcome
 * a given set of player choices produces*, and that is all in here, where it
 * can be checked in milliseconds by `npm test`.
 */

import { type Outcome } from './state';

export type JumisPick = 'leave' | 'all' | 'take';
export type VelnsPick = 'cat' | 'bread' | 'self';

/**
 * Encounter one. Only the tithe — leave the double ear standing and bind it
 * into the stubble — counts as handled well.
 *
 * `take` (carrying Jumis home) is a real attested practice, but in this game's
 * reading it is still taking rather than leaving, so it is diminished. Both
 * wrong answers have their own outcome text; only the state is shared.
 */
export function jumisOutcome(pick: JumisPick): Outcome {
  return pick === 'leave' ? 'good' : 'poor';
}

/** One reason the bridge came out worse than it could have. */
export type VelnsMiss = 'riddle' | 'self' | 'bread';

/**
 * Every reason encounter two fell short, in the order they happened. Empty
 * means the bridge came out whole.
 *
 * - Fumbling the riddle costs the good bridge regardless. He said it would.
 * - Walking across first yourself is always the diminished outcome.
 * - Sending the cat is the classic Devil's-Bridge trick and always works.
 * - Sending the loaf is the cleverer answer, but the argument only holds if the
 *   bread is worth something — which is true exactly when the player left the
 *   field its share in encounter one. This is the link that makes the two
 *   encounters one system rather than two levels.
 *
 * The reckoning card builds its "what you should have done" line from this
 * list, and `velnsOutcome` is derived from it, so the advice can never
 * disagree with the verdict. When the player lost the bridge two ways at once,
 * naming only one of them would be advice that does not work.
 */
export function velnsMisses(pick: VelnsPick, riddleRight: boolean, jumis: Outcome): VelnsMiss[] {
  const misses: VelnsMiss[] = [];
  if (!riddleRight) misses.push('riddle');
  if (pick === 'self') misses.push('self');
  if (pick === 'bread' && jumis !== 'good') misses.push('bread');
  return misses;
}

/** Encounter two: whole only when nothing was missed. */
export function velnsOutcome(pick: VelnsPick, riddleRight: boolean, jumis: Outcome): Outcome {
  return velnsMisses(pick, riddleRight, jumis).length === 0 ? 'good' : 'poor';
}

/** Which set of closing lines the ending uses. */
export function ending(jumis: Outcome, velns: Outcome): 'both' | 'half' | 'neither' {
  const n = (jumis === 'good' ? 1 : 0) + (velns === 'good' ? 1 : 0);
  return n === 2 ? 'both' : n === 1 ? 'half' : 'neither';
}
