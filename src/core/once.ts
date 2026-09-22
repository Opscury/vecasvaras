/**
 * Things the game only does once per install.
 *
 * The first run is paced for someone who has never seen any of it: the bag
 * explains itself on a card, each encounter opens on its verse. A second year
 * should not charge the full price again, so those moments are recorded here,
 * in localStorage, rather than in a session registry that forgets them on
 * every reload.
 */

const STORAGE_KEY = 'vecasvaras.seen.v1';

/** Older builds and the screenshot seeds wrote this for the bag card. */
const LEGACY: Record<string, string> = { bagIntro: 'bagTaught' };

class Once {
  private seen = new Set<string>();

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(list)) list.forEach((k) => typeof k === 'string' && this.seen.add(k));
      for (const [key, old] of Object.entries(LEGACY)) {
        if (localStorage.getItem(old)) this.seen.add(key);
      }
    } catch {
      /* private browsing — everything is new every time */
    }
  }

  has(key: string): boolean {
    return this.seen.has(key);
  }

  /**
   * Makes a moment new again. Used when a game is started over: the bag's
   * card is teaching, not content, and a player starting a fresh year — or a
   * stranger picking up a demo someone else has played — needs it again.
   */
  forget(key: string): void {
    this.seen.delete(key);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.seen]));
      const old = LEGACY[key];
      if (old) localStorage.removeItem(old);
    } catch {
      /* ignore */
    }
  }

  /** Marks it seen. Returns true if this was the first time. */
  mark(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.seen]));
    } catch {
      /* ignore */
    }
    return true;
  }
}

export const once = new Once();
