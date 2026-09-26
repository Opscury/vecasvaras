/**
 * ============================================================================
 *  DAINAS — every verse here is checked against a printed collection
 * ============================================================================
 *
 *  Traditional dainas from the Barons collection are public domain worldwide,
 *  so there is no clearance problem here. The problem is ACCURACY: a
 *  misquoted daina in a VKKF application or a press build is the kind of
 *  mistake a Latvian reviewer notices immediately. So:
 *
 *    1. Every verse is copied verbatim from a printed source, diacritics and
 *       punctuation included, with its Barons (LD) number.
 *    2. Nothing is written from memory. An entry that cannot be checked is
 *       `verified: false`, and a production build does not show it at all
 *       (see `flags.draftFolklore`).
 *
 *  See FOLKLORE.md for the full ledger of what was checked and where.
 *
 *  Primary sources:
 *    dainuskapis.lv          — the Barons cabinet, searchable, authoritative
 *    tautasdziesmas.lv       — readable browsing by theme
 *    valoda.ailab.lv/folklora/ticejumi — Šmits' folk beliefs (the puzzle logic)
 * ============================================================================
 */

import { type Loc } from '../core/i18n';

export interface Daina {
  /** Latvian text, line-broken as printed in the source. */
  lv: string;
  /** Working English rendering — plain sense, not a verse translation. */
  en: string;
  /** The Barons number, shown under the verse. */
  ld: string;
  /** Where the text was checked. */
  source: string;
  /** Flip to true only after you have compared it to the source. */
  verified: boolean;
}

export const dainas: Record<'jumis' | 'velns', Daina> = {
  jumis: {
    // Checked Sept 2026, word for word, against P. Šmits, «Latviešu tautas
    // ticējumi» no. 12002, which prints it with its Barons number (the web
    // edition's hyphen before the answer is set here as a dash).
    // tautasdziesmas.lv has a variant («Šo garaju vasariņu», «Zem pelēka
    // akmentiņa»); Šmits' text is used because it carries the LD citation.
    // dainuskapis.lv (behind a bot check from here) is the place to confirm
    // LD 28543 itself.
    lv: 'Kur, Jumīti, tu gulēji\nŠo garo vasariņu?\n– Tīrumiņa vidiņā\nZem pelēku akmentiņu.',
    en: 'Where, little Jumis, did you sleep\nall this long summer?\n– In the middle of the field,\nunder a grey stone.',
    ld: 'LD 28543',
    source: 'https://valoda.ailab.lv/folklora/ticejumi/jumis.htm',
    verified: true,
  },
  // The earlier Devil verse was written from memory and is in no collection;
  // it has been dropped. This one is real: a herding song about the bog,
  // printed by Šmits under «Purvs» (no. 24910) with its Barons number, checked
  // character by character in Sept 2026. The spelling (ŗ, the elided
  // «piebradāj'ši») is kept as printed.
  velns: {
    lv: "Ēdat, govis, purva zāli,\nNedzeŗt purva ūdentiņu:\nVelna bērni piebradāj'ši\nSpalvainām kājiņām.",
    en: 'Eat, cows, the grass of the bog,\ndo not drink the bog water:\nthe Devil’s children have waded in it\nwith their hairy little feet.',
    ld: 'LD 28994',
    source: 'https://valoda.ailab.lv/folklora/ticejumi/purvs.htm',
    verified: true,
  },
};

/** Loc-shaped accessor so scenes can hand a daina to the normal text pipeline. */
export const dainaText = (key: keyof typeof dainas): Loc => ({
  lv: dainas[key].lv,
  en: dainas[key].en,
});

/** Shouts in the dev console while any daina is still unchecked. */
export function assertDainasVerified(): void {
  if (!import.meta.env.DEV) return;
  const pending = Object.entries(dainas)
    .filter(([, d]) => !d.verified)
    .map(([k, d]) => `  • ${k} — verify against ${d.source}`);
  if (pending.length) {
    console.warn(
      '[Vecās Varas] Unverified daina text still in the build:\n' +
        pending.join('\n') +
        '\nSee src/content/dainas.ts before any public release.',
    );
  }
}
