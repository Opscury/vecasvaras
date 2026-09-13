/**
 * Run state + persistence.
 *
 * The vertical slice is short enough to hold in one object. It is saved to
 * localStorage on every mutation so a player who closes the tab mid-bog comes
 * back where they were.
 */

import { bag } from './inventory';

export type Outcome = 'none' | 'poor' | 'good';

/** The places a run can be resumed into. */
export type Place = 'Village' | 'Jumis' | 'Velns';

export interface RunState {
  /** How the Jumis encounter resolved. Drives the granary sprite. */
  jumis: Outcome;
  /** How the Velns encounter resolved. Drives the bridge sprite. */
  velns: Outcome;
  /** Set when the player has seen the opening narration. */
  introSeen: boolean;
  /** Set when the closing narration has played. */
  outroSeen: boolean;
  /**
   * Where the player last was, so Continue can put them back there rather
   * than silently in the hub. Encounters resume from their opening card.
   */
  scene: Place;
}

const STORAGE_KEY = 'vecasvaras.save.v1';

const blank = (): RunState => ({
  jumis: 'none',
  velns: 'none',
  introSeen: false,
  outroSeen: false,
  scene: 'Village',
});

const OUTCOMES: readonly unknown[] = ['none', 'poor', 'good'];
const asOutcome = (v: unknown): Outcome => (OUTCOMES.includes(v) ? (v as Outcome) : 'none');

const PLACES: readonly unknown[] = ['Village', 'Jumis', 'Velns'];
const asPlace = (v: unknown): Place => (PLACES.includes(v) ? (v as Place) : 'Village');

class GameState {
  private data: RunState = blank();

  constructor() {
    this.load();
    this.repair();
  }

  get(): Readonly<RunState> {
    return this.data;
  }

  set<K extends keyof RunState>(key: K, value: RunState[K]): void {
    this.data[key] = value;
    this.save();
  }

  reset(): void {
    this.data = blank();
    this.save();
    // Starting over means walking out of the house with nothing again.
    bag.clear();
  }

  /** True once both encounters have been resolved, either way. */
  get bothResolved(): boolean {
    return this.data.jumis !== 'none' && this.data.velns !== 'none';
  }

  /**
   * The bog only opens once the player has grain to bake with — the reward
   * from encounter one is the ticket into encounter two.
   */
  get bogOpen(): boolean {
    return this.data.jumis !== 'none';
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* saving is a nicety, not a requirement */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      // Read field by field: a stale or hand-edited save falls back to the
      // fresh-run value for anything it does not recognise, rather than
      // carrying an outcome no scene knows how to draw.
      const p = JSON.parse(raw) as Record<string, unknown> | null;
      if (!p || typeof p !== 'object') return;
      this.data = {
        jumis: asOutcome(p.jumis),
        velns: asOutcome(p.velns),
        introSeen: p.introSeen === true,
        outroSeen: p.outroSeen === true,
        scene: asPlace(p.scene),
      };
    } catch {
      this.data = blank();
    }
  }

  /**
   * Heals a save an earlier build could leave stuck. The offering left the bag
   * the moment it was handed over, but the bog result was only saved once the
   * outcome prose finished — reload in between and the bog stayed open,
   * unresolved, and impossible to enter without the bread. The encounters now
   * commit both at once; this puts the loaf back for anyone already caught.
   */
  private repair(): void {
    const { jumis, velns } = this.data;
    if (jumis !== 'none' && velns === 'none' && !bag.has('bread')) bag.add('bread');
  }
}

export const state = new GameState();
