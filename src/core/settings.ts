/**
 * The player's own preferences: how big the words are, how fast they come,
 * how loud the game is.
 *
 * Kept apart from the run (`state.ts`) because they belong to the person, not
 * to the year: starting over must never reset a player's text size.
 *
 * Read synchronously at import, like everything else stored, so the very first
 * text the game draws is already the right size.
 */

export type TextSize = 'small' | 'normal' | 'large';
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Settings {
  textSize: TextSize;
  textSpeed: TextSpeed;
  /** Master volume, 0..1. Mute is separate — it is a chip, and remembers this. */
  volume: number;
}

/** How much bigger than the device default each text size is. */
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.88, normal: 1, large: 1.16 };

/** Milliseconds per character. Instant shows each line whole. */
export const TYPE_MS: Record<TextSpeed, number> = { slow: 34, normal: 18, fast: 8, instant: 0 };

const STORAGE_KEY = 'vecasvaras.settings.v1';

const DEFAULTS: Settings = { textSize: 'normal', textSpeed: 'normal', volume: 0.8 };

type Listener = (s: Settings) => void;

class SettingsStore {
  private data: Settings = { ...DEFAULTS };
  private listeners = new Set<Listener>();

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const p = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
      if (p.textSize && p.textSize in TEXT_SCALE) this.data.textSize = p.textSize;
      if (p.textSpeed && p.textSpeed in TYPE_MS) this.data.textSpeed = p.textSpeed;
      if (typeof p.volume === 'number' && Number.isFinite(p.volume)) {
        this.data.volume = Math.max(0, Math.min(1, p.volume));
      }
    } catch {
      /* defaults */
    }
  }

  get(): Readonly<Settings> {
    return this.data;
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    if (this.data[key] === value) return;
    this.data[key] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* best effort */
    }
    this.listeners.forEach((fn) => fn(this.data));
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get textScale(): number {
    return TEXT_SCALE[this.data.textSize];
  }

  get typeMs(): number {
    return TYPE_MS[this.data.textSpeed];
  }
}

export const settings = new SettingsStore();
