/**
 * The years, as the stone remembers them.
 *
 * A finished year is written here once, when the tally is shown, and never
 * rewritten. Starting a year over does not touch it, which is the point: the
 * village resets, the record does not. The stone in the hub draws these as
 * marks, the next year's opening remembers the last one, and the share card
 * says which year it was.
 *
 * Kept apart from `state.ts` so that module can read the count for a new
 * year's number without the two importing each other.
 */

import type { JumisPick, VelnsPick } from './rules';

type Outcome = 'none' | 'poor' | 'good';

export interface YearEntry {
  /** 1-based; unique. A second write for the same year is ignored. */
  year: number;
  jumisPick: JumisPick;
  jumis: Outcome;
  velns: Outcome;
  velnsPick: VelnsPick;
  catLost: boolean;
  devilGone: boolean;
  crumb: boolean;
  bread: number;
}

const STORAGE_KEY = 'vecasvaras.ledger.v1';
/** More than this and the oldest marks have worn off the stone. */
const KEEP = 40;

const PICKS: readonly unknown[] = ['leave', 'take', 'all', 'spare'];
const VPICKS: readonly unknown[] = ['cat', 'bread', 'self', 'dawn'];
const OUTS: readonly unknown[] = ['poor', 'good'];

class Ledger {
  private entries: YearEntry[] = [];

  constructor() {
    this.load();
  }

  get count(): number {
    return this.entries.length;
  }

  /** Oldest first. */
  get years(): readonly YearEntry[] {
    return this.entries;
  }

  get last(): YearEntry | null {
    return this.entries[this.entries.length - 1] ?? null;
  }

  has(year: number): boolean {
    return this.entries.some((e) => e.year === year);
  }

  record(entry: YearEntry): void {
    if (this.has(entry.year)) return;
    this.entries.push({ ...entry });
    this.entries.sort((a, b) => a.year - b.year);
    if (this.entries.length > KEEP) this.entries.splice(0, this.entries.length - KEEP);
    this.save();
  }

  /** For tests and for a full wipe. */
  clear(): void {
    this.entries = [];
    this.save();
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      /* best effort */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as unknown;
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;
        if (typeof o.year !== 'number' || !PICKS.includes(o.jumisPick)) continue;
        this.entries.push({
          year: o.year,
          jumisPick: o.jumisPick as JumisPick,
          jumis: OUTS.includes(o.jumis) ? (o.jumis as Outcome) : 'poor',
          velns: OUTS.includes(o.velns) ? (o.velns as Outcome) : 'poor',
          velnsPick: VPICKS.includes(o.velnsPick) ? (o.velnsPick as VelnsPick) : 'self',
          catLost: o.catLost === true,
          devilGone: o.devilGone === true,
          crumb: o.crumb === true,
          bread: typeof o.bread === 'number' ? o.bread : 0,
        });
      }
    } catch {
      this.entries = [];
    }
  }
}

export const ledger = new Ledger();
