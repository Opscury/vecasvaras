/**
 * Where the player is in the run, as one value.
 *
 * The game already knew all of this — it was just spread across `state.jumis`,
 * `state.velns` and what happened to be in the bag, and every scene worked it
 * out again with its own `if`. That was survivable while nothing displayed it.
 * Now the corner of the screen says what to do next, Anna says the same thing
 * when asked, and the two exits open on it, so it has to be derived in exactly
 * one place or they will disagree.
 *
 * Nothing here is stored. The step is a function of the run state and the bag,
 * which means it cannot drift out of step with a save.
 */

import { type Loc } from './i18n';
import { bag } from './inventory';
import { state } from './state';
import { objectives } from '../content/elder';

export type StepId =
  | 'meetElder'
  | 'takeSickle'
  | 'harvest'
  | 'returnHarvest'
  | 'crossBog'
  | 'returnBog'
  | 'done';

/** What the player should be doing right now. */
export function currentStep(): StepId {
  const s = state.get();
  if (!s.metElder) return 'meetElder';
  if (s.jumis === 'none') return bag.has('sickle') ? 'harvest' : 'takeSickle';
  if (!s.jumisPaid) return 'returnHarvest';
  if (s.velns === 'none') return 'crossBog';
  if (!s.velnsPaid) return 'returnBog';
  return 'done';
}

/** The line for the corner of the screen. */
export function objectiveFor(step: StepId): Loc {
  return objectives[step];
}

/** True while the field is the thing to be doing. */
export const fieldOpen = (): boolean => currentStep() === 'harvest';

/** True while the bog is the thing to be doing. */
export const bogReady = (): boolean => currentStep() === 'crossBog';

/** True once both debts are settled and reported. */
export const runComplete = (): boolean => currentStep() === 'done';
