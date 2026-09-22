/**
 * ============================================================================
 *  DAINAS — NEEDS HUMAN VERIFICATION BEFORE PUBLIC RELEASE
 * ============================================================================
 *
 *  Traditional dainas from the Barons collection are public domain worldwide,
 *  so there is no clearance problem here. The problem is ACCURACY: the texts
 *  below were written from memory and have NOT been checked character-by-
 *  character against a primary source.
 *
 *  A misquoted daina in a VKKF application or a press build is the kind of
 *  mistake a Latvian reviewer notices immediately. Before you ship:
 *
 *    1. Open the `source` URL on each entry below.
 *    2. Copy the stanza verbatim, diacritics and punctuation included.
 *    3. Paste it over `lv`, adjust `en` to match, and set `verified: true`.
 *
 *  Nothing else in the codebase needs to change — the scenes read this file.
 *  `assertDainasVerified()` prints a console warning in dev while any entry
 *  is still unverified, so you cannot quietly forget.
 *
 *  Primary sources:
 *    dainuskapis.lv          — the Barons cabinet, searchable, authoritative
 *    tautasdziesmas.lv       — readable browsing by theme
 *    valoda.ailab.lv/folklora/ticejumi — Šmits' folk beliefs (the puzzle logic)
 * ============================================================================
 */

import { type Loc } from '../core/i18n';

export interface Daina {
  /** Latvian text, line-broken as printed. */
  lv: string;
  /** Working English rendering — plain sense, not a verse translation. */
  en: string;
  /** Where to check it. */
  source: string;
  /** Flip to true only after you have compared it to the source. */
  verified: boolean;
}

export const dainas: Record<'jumis' | 'velns', Daina> = {
  jumis: {
    // Checked Sept 2026 against tautasdziesmas.lv. The field and the grey stone
    // are the encounter's own: the boundary stone stands in the rye.
    // Still to add: its Barons (LD) number, from dainuskapis.lv.
    lv: 'Kur, Jumīti, tu gulēji\nŠo garaju vasariņu? –\nTīrumiņa vidiņā,\nZem pelēka akmentiņa.',
    en: 'Where, little Jumis, did you sleep\nall this long summer? –\nIn the middle of the field,\nunder a grey stone.',
    source: 'https://tautasdziesmas.lv/vasara/kur-jumiti-tu-guleji',
    verified: true,
  },
  // NOT A REAL DAINA. Written from memory for the prototype and not found in
  // any collection (searched Sept 2026). Replace it with an attested verse
  // before release — a devil, a bog or the cocks — or drop the card for this
  // encounter. dainuskapis.lv (search «velniņ*», «purv*») or ask LFK.
  velns: {
    lv: 'Velniņš tiltu darināja\nPurva vidū, naktiņā;\nGaiļi dzied, tilts nogrima,\nVelniņš sēž un noskatās.',
    en: 'The little devil built a bridge\nin the middle of the bog, by night;\nthe cocks crowed, the bridge sank,\nand the devil sat and watched.',
    source: 'https://tautasdziesmas.lv/',
    verified: false,
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
