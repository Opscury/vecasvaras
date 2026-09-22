/**
 * What the villager is carrying.
 *
 * Kept deliberately tiny: three items, no stacks, no weight, no crafting. The
 * bag exists to make two moments concrete — you do not cut rye with your hands,
 * and you do not walk out to the bog with nothing to offer — not to be a
 * subsystem. If a fourth item ever earns its place, it goes in `ITEMS` and
 * nothing else has to change.
 */

import { type Loc, L } from './i18n';

export type ItemId = 'sickle' | 'bread' | 'cat' | 'hat';

export interface ItemDef {
  id: ItemId;
  /** Texture key loaded in BootScene. */
  texture: string;
  name: Loc;
  /** Shown in the bag when the item is looked at. */
  note: Loc;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  sickle: {
    id: 'sickle',
    texture: 'item-sickle',
    name: L('Sirpis', 'Sickle'),
    note: L(
      'Vectēva sirpis. Asmens plāns no daudzām pļaujām.',
      'Your grandfather’s sickle. The blade is thin from many harvests.',
    ),
  },
  bread: {
    id: 'bread',
    // Resolved at draw time by `textureFor` — there is one loaf per kind of
    // year. This is only the fallback, and it points at a texture that is
    // actually loaded: you cannot hold bread before the field is resolved, but
    // a missing key would draw a green box rather than fail loudly.
    texture: 'item-bread-poor',
    name: L('Rudzu klaips', 'Rye loaf'),
    note: L(
      'Cepts no šī gada graudiem. Cik labs gads, tik labs klaips.',
      'Baked from this year’s grain. As good as the year was.',
    ),
  },
  cat: {
    id: 'cat',
    texture: 'item-cat',
    name: L('Ciema kaķis', 'The village cat'),
    note: L(
      'Neviena kaķis. Iet, kur grib, un šobrīd grib iet ar tevi.',
      'Nobody’s cat. It goes where it likes, and just now it likes going with you.',
    ),
  },
  // Left on the planks by a Devil who was answered as an equal. It does
  // nothing; it is proof, and a thing to be asked about.
  hat: {
    id: 'hat',
    texture: 'item-hat',
    name: L('Velna cepure', 'The Devil’s hat'),
    note: L(
      'Veca filca cepure ar diviem caurumiem virsā. Smaržo pēc purva un dūmiem.',
      'An old felt hat with two holes in the crown. It smells of bog and smoke.',
    ),
  },
};

const STORAGE_KEY = 'vecasvaras.bag.v1';

type Listener = () => void;

class Inventory {
  private held = new Set<ItemId>();
  private listeners = new Set<Listener>();

  constructor() {
    this.load();
  }

  has(id: ItemId): boolean {
    return this.held.has(id);
  }

  list(): ItemId[] {
    // Stable order so the bag never reshuffles under the player's cursor.
    return (['sickle', 'bread', 'cat', 'hat'] as ItemId[]).filter((i) => this.held.has(i));
  }

  get count(): number {
    return this.held.size;
  }

  add(id: ItemId): void {
    if (this.held.has(id)) return;
    this.held.add(id);
    this.commit();
  }

  remove(id: ItemId): void {
    if (!this.held.delete(id)) return;
    this.commit();
  }

  clear(): void {
    this.held.clear();
    this.commit();
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.held]));
    } catch {
      /* best effort */
    }
    this.listeners.forEach((fn) => fn());
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as string[];
      arr.forEach((id) => {
        if (id in ITEMS) this.held.add(id as ItemId);
      });
    } catch {
      /* start empty */
    }
  }
}

export const bag = new Inventory();
