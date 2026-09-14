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
   * Anna has given the first errand. Until she has, the player has no reason
   * to walk out of the village and the field path says so.
   */
  metElder: boolean;
  /**
   * The harvest has been taken back to Anna and paid for with the loaf. This,
   * not the harvest itself, is what opens the bog: the reward is handed over
   * by a person, in front of the player, rather than appearing in the bag
   * halfway through a sentence.
   */
  jumisPaid: boolean;
  /** The crossing has been reported back. The stone then ends the run. */
  velnsPaid: boolean;
  /**
   * Where the player last was, so Continue can put them back there rather
   * than silently in the hub. Encounters resume from their opening card.
   */
  scene: Place;
}

const STORAGE_KEY = 'vecasvaras.save.v2';
/** Read once, and only to carry a run in progress across the quest rework. */
const STORAGE_KEY_V1 = 'vecasvaras.save.v1';

const blank = (): RunState => ({
  jumis: 'none',
  velns: 'none',
  introSeen: false,
  outroSeen: false,
  scene: 'Village',
  metElder: false,
  jumisPaid: false,
  velnsPaid: false,
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
    return this.data.jumisPaid;
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
      if (raw) {
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
          metElder: p.metElder === true,
          jumisPaid: p.jumisPaid === true,
          velnsPaid: p.velnsPaid === true,
          scene: asPlace(p.scene),
        };
        return;
      }
      this.migrateV1();
    } catch {
      this.data = blank();
    }
  }

  /**
   * A run saved before Anna existed. Everything she is supposed to have done
   * for that player has, by definition, already happened: they were given the
   * errands by the old nudge lines, and the loaf arrived by itself. So the
   * errand flags are inferred from the outcomes rather than making somebody
   * mid-run walk back and re-accept a task they finished last week.
   */
  private migrateV1(): void {
    const raw = localStorage.getItem(STORAGE_KEY_V1);
    if (!raw) return;
    const p = JSON.parse(raw) as Record<string, unknown> | null;
    if (!p || typeof p !== 'object') return;
    const jumis = asOutcome(p.jumis);
    const velns = asOutcome(p.velns);
    this.data = {
      jumis,
      velns,
      introSeen: p.introSeen === true,
      outroSeen: p.outroSeen === true,
      // They have plainly met her if they were ever sent anywhere.
      metElder: p.introSeen === true,
      jumisPaid: jumis !== 'none',
      velnsPaid: velns !== 'none',
      scene: asPlace(p.scene),
    };
    this.save();
    localStorage.removeItem(STORAGE_KEY_V1);
  }

  /**
   * Heals a save an earlier build could leave stuck. The offering left the bag
   * the moment it was handed over, but the bog result was only saved once the
   * outcome prose finished — reload in between and the bog stayed open,
   * unresolved, and impossible to enter without the bread. The encounters now
   * commit both at once; this puts the loaf back for anyone already caught.
   */
  private repair(): void {
    const { jumisPaid, velns } = this.data;
    // The loaf is Anna's to give, so the test is whether she has given it —
    // not whether the field is cut. Without this a reload between the bog
    // opening and the bread being spent leaves the bog enterable and the
    // player with nothing to enter it with.
    if (jumisPaid && velns === 'none' && !bag.has('bread')) bag.add('bread');
  }
}

export const state = new GameState();
