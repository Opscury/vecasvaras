/**
 * Bilingual text layer.
 *
 * Every player-facing string in the game is a `Loc` — a { lv, en } pair.
 * Nothing in the scenes ever holds a bare string, so adding a third language
 * later means widening this type and the dictionaries, not touching scene code.
 */

export type Lang = 'lv' | 'en';

export interface Loc {
  lv: string;
  en: string;
}

/** Convenience constructor so content files read as `L('latviski', 'english')`. */
export const L = (lv: string, en: string): Loc => ({ lv, en });

/**
 * Fills a single `{}` slot in a line with another Loc, each language with its
 * own. For lines that have to name a thing — "Sirpis rokā." — without the
 * Latvian sentence ending up with the English word in it.
 */
export const fillLoc = (loc: Loc, value: Loc): Loc => ({
  lv: loc.lv.replace('{}', value.lv),
  en: loc.en.replace('{}', value.en),
});

/** Several lines run together as one sentence-run, in each language. */
export const joinLoc = (...parts: Loc[]): Loc => ({
  lv: parts.map((p) => p.lv).join(' '),
  en: parts.map((p) => p.en).join(' '),
});

const STORAGE_KEY = 'vecasvaras.lang';

type Listener = (lang: Lang) => void;

class I18n {
  private _lang: Lang = 'lv';
  private listeners = new Set<Listener>();

  constructor() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* private browsing — fall through to the default */
    }
    if (stored === 'lv' || stored === 'en') {
      this._lang = stored;
    } else {
      // First visit: guess from the browser, default to Latvian.
      const nav = typeof navigator !== 'undefined' ? navigator.language : '';
      this._lang = nav.toLowerCase().startsWith('lv') ? 'lv' : 'en';
    }
  }

  get lang(): Lang {
    return this._lang;
  }

  set lang(next: Lang) {
    if (next === this._lang) return;
    this._lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next;
    this.listeners.forEach((fn) => fn(next));
  }

  toggle(): void {
    this.lang = this._lang === 'lv' ? 'en' : 'lv';
  }

  /** Resolve a Loc in the current language. */
  t(loc: Loc): string {
    return loc[this._lang];
  }

  /**
   * Subscribe to language changes. Returns an unsubscribe function —
   * scenes must call it on shutdown or listeners leak across restarts.
   */
  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const i18n = new I18n();

/** Shorthand used throughout the scenes. */
export const t = (loc: Loc): string => i18n.t(loc);
