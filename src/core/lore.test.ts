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
      if (!b.verified) continue;
      if (b.book === 'ticejumi') expect(b.ref).toMatch(/^\d{3,5}(, \d{3,5})*$/);
      else expect(b.ref).toMatch(/^[IVX]+, .+$/);
    }
  });

  it('quotes records rather than inventing them: no belief is written from memory', () => {
    // A guard against drift: every verified entry points at the page it was
    // checked against, and every unverified one is hidden from players.
    for (const b of Object.values(beliefs)) {
      if (b.verified) expect(b.source).toMatch(/^https:\/\/valoda\.ailab\.lv\/folklora\/(ticejumi|pasakas)\/.+\.htm$/);
    }
  });

  it('gives every daina a specific source to check against', () => {
    for (const d of Object.values(dainas)) {
      if (!d.verified) continue;
      expect(d.source).not.toMatch(/^https:\/\/tautasdziesmas\.lv\/?$/);
      expect(d.ld).toMatch(/^LD \d+$/);
    }
  });
});

/**
 * Everything the game presents as folklore has to be IN its source. These
 * compare the game's text with the verbatim excerpts in `content/sources.ts`,
 * so a quote cannot quietly drift into something nobody ever said.
 */
describe('the folklore is quoted, not imagined', async () => {
  const { TICEJUMI, TEIKAS, MIKLAS } = await import('../content/sources');
  const { velns } = await import('../content/script');

  /** Spacing, dashes and quotation marks vary between print and screen. */
  const norm = (s: string) =>
    s
      .replace(/[„“”«»"]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/ ([.,:;?!])/g, '$1')
      .trim();

  /** The quoted runs of a text: split at […], editorial [insertions] dropped. */
  const runs = (s: string) =>
    s
      .split('[…]')
      .map((part) => norm(part.replace(/\[[^\]]*\]/g, '')))
      .filter((part) => part.length > 0);

  it('quotes every verified belief from the records it cites', () => {
    for (const [id, b] of Object.entries(beliefs)) {
      if (!b.verified) continue;
      const text =
        b.book === 'teikas'
          ? norm(Object.values(TEIKAS).join(' '))
          : norm(b.ref!.split(', ').map((n) => TICEJUMI[n] ?? '').join(' '));
      for (const run of runs(b.text.lv)) {
        expect(text, `${id}: «${run}»`).toContain(run);
      }
    }
  });

  it('quotes both dainas word for word from the records that print them', () => {
    const where: Record<string, string> = { 'LD 28543': '12002', 'LD 28994': '24910' };
    for (const d of Object.values(dainas)) {
      const record = TICEJUMI[where[d.ld]];
      expect(record, d.ld).toBeDefined();
      expect(norm(record)).toContain(norm(d.lv));
      expect(record).toContain(d.ld);
    }
  });

  it('takes every riddle the Devil asks, or is asked, from a riddle collection', () => {
    // Spoken aloud, a printed riddle's line breaks become commas and its
    // line-initial capitals go; neither is part of the words.
    const flat = (t: string) => norm(t).replace(/,/g, '').toLowerCase();
    const quoted = (loc: { lv: string }) => flat(loc.lv.replace(/\s*Kas tas ir\?/, '')).replace(/^"|"$/g, '');
    const books = flat([...MIKLAS.kalnina2015, ...MIKLAS.bernuFolklora, TEIKAS.devilsRiddles].join(' '));
    expect(books).toContain(quoted(velns.riddle));
    expect(books).toContain(quoted(velns.riddle2));
    expect(books).toContain(quoted(velns.askBack.riddle));
    // And the answers the game accepts are the printed ones.
    expect(MIKLAS.kalnina2015[0]).toContain(`(${velns.riddleChoices.wind.lv.replace('.', '').toLowerCase()})`);
    expect(TEIKAS.devilsRiddles).toContain(`"${velns.riddle2Choices.sleep.lv}"`);
  });
});
