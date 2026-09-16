/**
 * Run state + persistence.
 *
 * One year of the story is short enough to hold in one object. It is saved to
 * localStorage on every mutation so a player who closes the tab mid-bog comes
 * back where they were.
 *
 * What outlives a year — the marks on the stone, the beliefs found — is kept
 * elsewhere (`ledger.ts`, `lore.ts`), so starting a year over never wipes it.
 */

import { bag } from './inventory';
import { ledger } from './ledger';
import type { JumisPick, VelnsPick } from './rules';

export type Outcome = 'none' | 'poor' | 'good';

/** The places a run can be resumed into. */
export type Place = 'Village' | 'Jumis' | 'Velns';

export interface RunState {
  /** Which telling of the story this is. 1 on a fresh install. */
  year: number;
  /** How the Jumis encounter resolved. Drives the granary sprite. */
  jumis: Outcome;
  /** What exactly was done in the field — four endings share two outcomes. */
  jumisPick: 'none' | JumisPick;
  /** The cart the player brought home, in sheaves. */
  sheaves: number;
  /**
   * The field as it was left, one bit per piece of the crop, so the player can
   * walk back out and see it. Empty until the harvest is over.
   */
  fieldMask: string;
  /** How the Velns encounter resolved. Drives the bridge sprite. */
  velns: Outcome;
  /** How the bargain was settled. */
  velnsPick: 'none' | VelnsPick;
  /** The cat went with the Devil and will not be on its doorstep again this year. */
  catLost: boolean;
  /** The Devil was argued off the bog for good. */
  devilGone: boolean;
  /** The first crumb of the loaf was left at the stone. */
  crumb: boolean;
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
   * The harvest has been taken back to Anna and threshed into bread. This, not
   * the harvest itself, is what opens the bog: the reward is handed over by a
   * person, in front of the player.
   */
  jumisPaid: boolean;
  /** The crossing has been reported back. The stone then ends the run. */
  velnsPaid: boolean;
  /**
   * Where the player last was, so Continue can put them back there rather
   * than silently in the hub. Encounters resume from their opening.
   */
  scene: Place;
  /**
   * What the village last put in front of the player, so each change is
   * announced once — on the walk home from the encounter that made it, and
   * not again after a reload, a restart or in the next year.
   */
  shown: Shown | null;
}

/** The part of the run the village announces when it changes. */
export type Shown = Pick<RunState, 'jumis' | 'jumisPick' | 'jumisPaid' | 'sheaves' | 'velns'>;

const STORAGE_KEY = 'vecasvaras.save.v3';
/** Older saves, read once and carried forward. */
const STORAGE_KEY_V2 = 'vecasvaras.save.v2';
const STORAGE_KEY_V1 = 'vecasvaras.save.v1';

const blank = (): RunState => ({
  year: ledger.count + 1,
  jumis: 'none',
  jumisPick: 'none',
  sheaves: 0,
  fieldMask: '',
  velns: 'none',
  velnsPick: 'none',
  catLost: false,
  devilGone: false,
  crumb: false,
  introSeen: false,
  outroSeen: false,
  scene: 'Village',
  metElder: false,
  jumisPaid: false,
  velnsPaid: false,
  shown: null,
});

const OUTCOMES: readonly unknown[] = ['none', 'poor', 'good'];
const asOutcome = (v: unknown): Outcome => (OUTCOMES.includes(v) ? (v as Outcome) : 'none');

const PLACES: readonly unknown[] = ['Village', 'Jumis', 'Velns'];
const asPlace = (v: unknown): Place => (PLACES.includes(v) ? (v as Place) : 'Village');

const JUMIS_PICKS: readonly unknown[] = ['none', 'leave', 'take', 'all', 'spare'];
const asJumisPick = (v: unknown): RunState['jumisPick'] =>
  JUMIS_PICKS.includes(v) ? (v as RunState['jumisPick']) : 'none';

const VELNS_PICKS: readonly unknown[] = ['none', 'cat', 'bread', 'self', 'dawn'];
const asVelnsPick = (v: unknown): RunState['velnsPick'] =>
  VELNS_PICKS.includes(v) ? (v as RunState['velnsPick']) : 'none';

const asCount = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

const asShown = (v: unknown): Shown | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return {
    jumis: asOutcome(o.jumis),
    jumisPick: asJumisPick(o.jumisPick),
    jumisPaid: o.jumisPaid === true,
    sheaves: asCount(o.sheaves, 0),
    velns: asOutcome(o.velns),
  };
};

type Listener = () => void;

class GameState {
  private data: RunState = blank();
  private listeners = new Set<Listener>();

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
    this.listeners.forEach((fn) => fn());
  }

  /** Several fields at once, saved once. */
  patch(values: Partial<RunState>): void {
    Object.assign(this.data, values);
    this.save();
    this.listeners.forEach((fn) => fn());
  }

  /**
   * Records what the village has put on screen. Quietly: this is bookkeeping
   * about the player's view, not a change anything should redraw for.
   */
  markShown(shown: Shown): void {
    this.data.shown = { ...shown };
    this.save();
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Throws this year away and starts it again. The stone keeps its marks. */
  reset(): void {
    this.data = blank();
    this.save();
    // Starting over means walking out of the house with nothing again.
    bag.clear();
    this.listeners.forEach((fn) => fn());
  }

  /**
   * The next telling. The finished year is already in the ledger by the time
   * this is called; the new one starts with the number after it.
   */
  nextYear(): void {
    this.reset();
  }

  /** True once both encounters have been resolved, either way. */
  get bothResolved(): boolean {
    return this.data.jumis !== 'none' && this.data.velns !== 'none';
  }

  /**
   * The bog only opens once the harvest has been threshed into bread — the
   * reward from encounter one is the ticket into encounter two.
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
        this.data = this.read(JSON.parse(raw));
        return;
      }
      if (this.migrate(STORAGE_KEY_V2) || this.migrate(STORAGE_KEY_V1)) return;
    } catch {
      this.data = blank();
    }
  }

  /**
   * Read field by field: a stale or hand-edited save falls back to the
   * fresh-run value for anything it does not recognise, rather than carrying
   * an outcome no scene knows how to draw.
   */
  private read(p: unknown): RunState {
    const fresh = blank();
    if (!p || typeof p !== 'object') return fresh;
    const o = p as Record<string, unknown>;
    const jumis = asOutcome(o.jumis);
    const velns = asOutcome(o.velns);
    return {
      year: Math.max(1, asCount(o.year, fresh.year)),
      jumis,
      jumisPick: asJumisPick(o.jumisPick),
      sheaves: asCount(o.sheaves, 0),
      fieldMask: typeof o.fieldMask === 'string' ? o.fieldMask : '',
      velns,
      velnsPick: asVelnsPick(o.velnsPick),
      catLost: o.catLost === true,
      devilGone: o.devilGone === true,
      crumb: o.crumb === true,
      introSeen: o.introSeen === true,
      outroSeen: o.outroSeen === true,
      metElder: o.metElder === true,
      jumisPaid: o.jumisPaid === true,
      velnsPaid: o.velnsPaid === true,
      scene: asPlace(o.scene),
      shown: asShown(o.shown),
    };
  }

  /**
   * A run saved by an earlier build. The field then had two endings, so a
   * good one was a tithe and a poor one was a cut ear; the cart is inferred to
   * match. A v1 save predates Anna, so everything she is supposed to have done
   * for that player has, by definition, already happened.
   */
  private migrate(key: string): boolean {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const p = JSON.parse(raw) as Record<string, unknown> | null;
    const d = this.read(p);
    if (d.jumisPick === 'none' && d.jumis !== 'none') {
      d.jumisPick = d.jumis === 'good' ? 'leave' : 'all';
      d.sheaves = d.jumis === 'good' ? 7 : 10;
    }
    if (key === STORAGE_KEY_V1 && p) {
      d.metElder = p.introSeen === true;
      d.jumisPaid = d.jumis !== 'none';
      d.velnsPaid = d.velns !== 'none';
    }
    this.data = d;
    this.save();
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return true;
  }

  /**
   * Heals a save an earlier build could leave stuck: the loaf gone with the
   * bog still unresolved, and no way into the bog without it.
   */
  private repair(): void {
    const { jumisPaid, velns } = this.data;
    if (jumisPaid && velns === 'none' && !bag.has('bread')) bag.add('bread');
  }
}

export const state = new GameState();
