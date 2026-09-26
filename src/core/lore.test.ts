import { afterEach, describe, expect, it, vi } from 'vitest';
import { beliefs } from '../content/ticejumi';
import { dainas } from '../content/dainas';

/**
 * The folklore gate. A production build shows only what has been checked
 * against a primary source; development shows everything, so the gaps stay
 * visible to whoever is working on them.
 */

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
  };
}

async function loreWith(draftFolklore: boolean) {
  vi.resetModules();
  vi.stubGlobal('localStorage', memoryStorage());
  vi.doMock('./flags', () => ({ flags: { fx: true, draftFolklore } }));
  return import('./lore');
}

describe('the folklore gate', () => {
  afterEach(() => {
    vi.doUnmock('./flags');
    vi.unstubAllGlobals();
  });

  it('shows only verified beliefs in a production build', async () => {
    const { lore, LORE_SHOWN } = await loreWith(false);
    const verified = Object.entries(beliefs).filter(([, b]) => b.verified);
    expect(lore.total).toBe(verified.length);
    for (const id of LORE_SHOWN) expect(beliefs[id].verified).toBe(true);
  });

  it('never unlocks an unverified belief in a production build', async () => {
    const { lore } = await loreWith(false);
    for (const [id, b] of Object.entries(beliefs)) {
      if (b.verified) continue;
      expect(lore.unlock(id as keyof typeof beliefs)).toBe(false);
      expect(lore.has(id as keyof typeof beliefs)).toBe(false);
    }
  });

  it('shows everything in a draft build', async () => {
    const { lore } = await loreWith(true);
    expect(lore.total).toBe(Object.keys(beliefs).length);
  });

  it('cites a record for every verified belief', () => {
    for (const b of Object.values(beliefs)) {
      if (b.verified) expect(b.ref).toMatch(/^\d+$/);
    }
  });

  it('gives every daina a specific source to check against', () => {
    for (const d of Object.values(dainas)) {
      if (d.verified) expect(d.source).not.toMatch(/^https:\/\/tautasdziesmas\.lv\/?$/);
    }
  });
});
