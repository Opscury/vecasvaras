/**
 * The beliefs the player has met, kept for good.
 *
 * Every rule the game runs on is a real one — leave the field its share, the
 * Devil's work ends at cockcrow, the lights on a bog lead you off the path —
 * and each is recorded here the first time the player runs into it, so the
 * folklore is something they collect rather than something the game lectures.
 *
 * Per run, not per install: `state.reset()` empties this, so a new game has
 * a new page to fill. That is the whole reward for playing again.
 */

import { beliefs } from '../content/ticejumi';
import { flags } from './flags';

export type LoreId =
  | 'jumis'
  | 'jumjaKersana'
  | 'pirmaisKumoss'
  | 'maize'
  | 'gailis'
  | 'velnaTilts'
  | 'maldugunis';

/** Display order. */
export const LORE_ORDER: readonly LoreId[] = [
  'jumis',
  'jumjaKersana',
  'maize',
  'pirmaisKumoss',
  'maldugunis',
  'velnaTilts',
  'gailis',
];

/**
 * The beliefs this build shows. One not yet matched to a Šmits record is left
 * out of a production build altogether — not listed, not counted, never
 * unlocked — so the page only ever presents checked folklore as folklore.
 * See `flags.draftFolklore`.
 */
export const LORE_SHOWN: readonly LoreId[] = LORE_ORDER.filter((id) => beliefs[id].verified || flags.draftFolklore);

const STORAGE_KEY = 'vecasvaras.lore.v1';

type Listener = (id: LoreId) => void;

class Lore {
  private found = new Set<LoreId>();
  private listeners = new Set<Listener>();

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(list)) {
        list.forEach((id) => {
          if ((LORE_SHOWN as readonly unknown[]).includes(id)) this.found.add(id as LoreId);
        });
      }
    } catch {
      /* start empty */
    }
  }

  has(id: LoreId): boolean {
    return this.found.has(id);
  }

  get count(): number {
    return this.found.size;
  }

  get total(): number {
    return LORE_SHOWN.length;
  }

  /** Records a belief. Returns true, and tells listeners, only the first time. */
  unlock(id: LoreId): boolean {
    if (this.found.has(id) || !LORE_SHOWN.includes(id)) return false;
    this.found.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.found]));
    } catch {
      /* best effort */
    }
    this.listeners.forEach((fn) => fn(id));
    return true;
  }

  onUnlock(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Emptied by `state.reset()` when a new game starts, and by the tests. */
  clear(): void {
    this.found.clear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const lore = new Lore();
