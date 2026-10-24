/**
 * Run state + persistence.
 *
 * One run of the story is short enough to hold in one object. It is saved to
 * localStorage on every mutation so a player who closes the tab mid-bog comes
 * back where they were.
 *
 * The beliefs found are kept in `lore.ts`, but they belong to the run: a new
 * game starts the page empty. Carrying them across read as a bug — a freshly
 * started game announcing four of seven beliefs already found — and it cost
 * the page its whole point, which is to be filled by playing.
 */

import { bag } from './inventory';
import { lore } from './lore';
import { once } from './once';
import { loafFrom, loafGood, type JumisPick, type VelnsPick } from './rules';
import { setPersona } from './i18n';

export type Outcome = 'none' | 'poor' | 'good';

export type Gender = 'm' | 'f';

/** The highest the bond with Ilze or Krišs can go: five knots on the ribbon. */
export const BOND_MAX = 5;

/** The places a run can be resumed into. */
export type Place = 'Village' | 'Jumis' | 'Velns';

/** The chapter the slice ships: the rye harvest, Apjumības. */
export const CHAPTER_ONE = 1;

/**
 * One of the year's named loaves. The year remembers every loaf baked in it,
 * so each chapter leaves one on the shelf — golden or flat.
 */
export interface Loaf {
  chapter: number;
  good: boolean;
}

export interface RunState {
  /**
   * Which chapter of the year the player is in. One for the whole of this
   * slice; chapter two reads it to know what came before it.
   */
  chapter: number;
  /** The chapters played to their end, so a later one can look back on them. */
  chapterDone: number[];
  /** Chosen at the start of a run. Drives the Latvian grammar of "you". */
  gender: Gender;
  /** The player's name, as typed. Empty until chosen. */
  name: string;
  /**
   * The name as it is called out, when the player has corrected it. Empty
   * means `vocative(name)` is good enough — which for most names it is.
   */
  nameV: string;
  /** Set once the player has picked who they are for this run. */
  heroChosen: boolean;
  /**
   * The bond with the one the player is courting — Ilze for a young man,
   * Krišs for a young woman — 0 to BOND_MAX.
   */
  bond: number;
  /** Which conversations with them have happened, by id, so each is had once. */
  talks: string[];
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
  /** The cat went with the Devil and will not be on its doorstep again. */
  catLost: boolean;
  /**
   * The Devil was argued off the bog — for this year. He said so himself:
   * he is back at Miķeļi, and the jug is still owed. Kept under the old name
   * because old saves have it.
   */
  devilGone: boolean;
  /**
   * The jug of beer he named at Jāņi. Every way the bargain ends leaves him
   * owed one, which is how he comes back in a later chapter to collect it.
   */
  jugOwed: boolean;
  /** The first crumb of the loaf was left at the stone. */
  crumb: boolean;
  /** The year's loaves, one per chapter, in the order they were baked. */
  loaves: Loaf[];
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
   * not again after a reload or a restart.
   */
  shown: Shown | null;
}

/** The part of the run the village announces when it changes. */
export type Shown = Pick<RunState, 'jumis' | 'jumisPick' | 'jumisPaid' | 'sheaves' | 'velns'>;

const STORAGE_KEY = 'vecasvaras.save.v4';
/** Older saves, read once and carried forward. */
const STORAGE_KEY_V3 = 'vecasvaras.save.v3';
const STORAGE_KEY_V2 = 'vecasvaras.save.v2';
const STORAGE_KEY_V1 = 'vecasvaras.save.v1';

const blank = (): RunState => ({
  chapter: CHAPTER_ONE,
  chapterDone: [],
  gender: 'm',
  name: '',
  nameV: '',
  heroChosen: false,
  bond: 0,
  talks: [],
  jumis: 'none',
  jumisPick: 'none',
  sheaves: 0,
  fieldMask: '',
  velns: 'none',
  velnsPick: 'none',
  catLost: false,
  devilGone: false,
  jugOwed: false,
  crumb: false,
  loaves: [],
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

const asChapters = (v: unknown): number[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0))].sort((a, b) => a - b)
    : [];

/**
 * The loaves on the shelf. One per chapter, newest last, and never two for
 * the same chapter — a replayed chapter overwrites its own loaf.
 */
const asLoaves = (v: unknown): Loaf[] => {
  if (!Array.isArray(v)) return [];
  const byChapter = new Map<number, Loaf>();
  for (const x of v) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (typeof o.chapter !== 'number' || !Number.isInteger(o.chapter) || o.chapter <= 0) continue;
    byChapter.set(o.chapter, { chapter: o.chapter, good: o.good === true });
  }
  return [...byChapter.values()].sort((a, b) => a.chapter - b.chapter);
};

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

/** What the game calls a player who never typed a name (an older save). */
export const DEFAULT_NAME: Record<Gender, string> = { m: 'Jānis', f: 'Grieta' };

type Listener = () => void;

class GameState {
  private data: RunState = blank();
  private listeners = new Set<Listener>();

  constructor() {
    this.load();
    this.repair();
    setPersona(() => ({
      female: this.data.gender === 'f',
      name: this.data.name || DEFAULT_NAME[this.data.gender],
      nameV: this.data.nameV,
    }));
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

  /** Throws this run away and starts it again. */
  reset(): void {
    this.data = blank();
    this.save();
    // Starting over means walking out of the house with nothing again, and
    // knowing nothing again: an empty bag and an empty beliefs page.
    bag.clear();
    lore.clear();
    // The bag explains itself again. The verses stay skippable: they are the
    // game's content, not its instructions, and a second year should be quicker.
    once.forget('bagIntro');
    // So do the cards before each encounter: who Jumis is, who the Devil is.
    once.forget('being:jumis');
    once.forget('being:velns');
    // And the new bridge is struck onto the map again when it is built.
    once.forget('map:bridge');
    // The courting ribbon says what it is again on the first knot of the new
    // year, and the corner offers its «why» again. Both are teaching, like
    // the bag's card, so a second year starts without having been told.
    once.forget('bondWhat');
    once.forget('objWhy');
    this.listeners.forEach((fn) => fn());
  }

  /**
   * The loaf this chapter baked, put on the shelf. Replaying a chapter writes
   * over its own loaf rather than adding a second one.
   */
  recordLoaf(chapter: number, good: boolean): void {
    const loaves = this.data.loaves.filter((l) => l.chapter !== chapter);
    loaves.push({ chapter, good });
    loaves.sort((a, b) => a.chapter - b.chapter);
    this.patch({ loaves });
  }

  /** The chapter is over and can be looked back on. */
  finishChapter(chapter: number): void {
    if (this.data.chapterDone.includes(chapter)) return;
    this.patch({ chapterDone: [...this.data.chapterDone, chapter].sort((a, b) => a - b) });
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
      if (this.migrate(STORAGE_KEY_V3) || this.migrate(STORAGE_KEY_V2) || this.migrate(STORAGE_KEY_V1)) return;
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
      chapter: Math.max(CHAPTER_ONE, asCount(o.chapter, CHAPTER_ONE)),
      chapterDone: asChapters(o.chapterDone),
      gender: o.gender === 'f' ? 'f' : 'm',
      name: typeof o.name === 'string' ? o.name.slice(0, 24) : '',
      nameV: typeof o.nameV === 'string' ? o.nameV.slice(0, 24) : '',
      // A run saved before anyone could choose has, by definition, begun.
      heroChosen: o.heroChosen === true || o.introSeen === true,
      bond: Math.min(BOND_MAX, asCount(o.bond, 0)),
      talks: Array.isArray(o.talks) ? o.talks.filter((x): x is string => typeof x === 'string') : [],
      jumis,
      jumisPick: asJumisPick(o.jumisPick),
      sheaves: asCount(o.sheaves, 0),
      fieldMask: typeof o.fieldMask === 'string' ? o.fieldMask : '',
      velns,
      velnsPick: asVelnsPick(o.velnsPick),
      catLost: o.catLost === true,
      devilGone: o.devilGone === true,
      jugOwed: o.jugOwed === true,
      crumb: o.crumb === true,
      loaves: asLoaves(o.loaves),
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
   *
   * Every save older than v4 predates the chapter — the jug the Devil now
   * names, and the shelf of loaves — so both are read off what that run had
   * already done. A player mid-run gets back exactly the year they left, with
   * the debt they would have been told about if the line had existed yet.
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
    // However the bog went, he was owed his jug by the end of it.
    if (d.velns !== 'none') d.jugOwed = true;
    // The loaf was baked the moment Anna threshed the cart.
    if (d.jumisPaid && !d.loaves.length) {
      d.loaves = [{ chapter: CHAPTER_ONE, good: loafGood(loafFrom(d.jumisPick)) }];
    }
    if (d.outroSeen && !d.chapterDone.includes(CHAPTER_ONE)) d.chapterDone = [CHAPTER_ONE];
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
