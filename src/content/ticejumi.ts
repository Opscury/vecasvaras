/**
 * ============================================================================
 *  TICĒJUMI — NEEDS HUMAN VERIFICATION BEFORE PUBLIC RELEASE
 * ============================================================================
 *
 *  The beliefs the game is built on, as the player collects them.
 *
 *  STATUS (Sept 2026): five of seven are matched to a Šmits record and set
 *  verified — jumis 11992, jumjaKersana 11998, maize 18623, maldugunis
 *  (shown as «Vadātājs») 31472, gailis 32406. The wording follows the record.
 *  Two are still open and say why beside them: pirmaisKumoss, velnaTilts. Before any public release, each entry should
 *  be matched to a specific record in P. Šmits, "Latviešu tautas ticējumi"
 *  (searchable at valoda.ailab.lv/folklora/ticejumi):
 *
 *    1. Find a record that says what the entry says.
 *    2. Put its number in `ref` and set `verified: true`.
 *    3. Adjust the wording if the record says it differently.
 *
 *  The beliefs page shows "after Šmits, no. ####" only for verified entries —
 *  nothing unverified is ever presented as a citation. While any entry is
 *  unverified, the dev console says so on boot, like the dainas do.
 * ============================================================================
 */

import { type Loc, L } from '../core/i18n';
import type { LoreId } from '../core/lore';

export interface Belief {
  title: Loc;
  text: Loc;
  /** Where to look, shown in place of the text until it is found. */
  hint: Loc;
  source: string;
  /** Record number in Šmits, once checked. */
  ref: string | null;
  verified: boolean;
}

const SMITS = 'https://valoda.ailab.lv/folklora/ticejumi/';

export const beliefs: Record<LoreId, Belief> = {
  jumis: {
    title: L('Jumis', 'Jumis'),
    text: L(
      'Pļaujas beigās lauka vidū atstāj nenopļautu mazu saliņu, un tās vārpas sasien mezglā. Divas vārpas, kas saaugušas uz viena salma, arī sauc par Jumi.',
      'At the end of the harvest a small patch is left uncut in the middle of the field, and its ears are tied in a knot. Two ears grown on one stalk are called Jumis too.',
    ),
    hint: L('Laukā, pie robežakmens…', 'In the field, by the boundary stone…'),
    // Šmits 11992 (P. Retelis, «Latvis», 1930) — the patch and the knot;
    // 11991 (B. Eriņa, Latgale) — two ears on one stalk are Jumis.
    source: SMITS + 'jumis.htm',
    ref: '11992',
    verified: true,
  },
  jumjaKersana: {
    title: L('Jumja ķeršana', 'Catching Jumis'),
    text: L(
      'Jumja vārpu glabā klētī aiz sijas — tad klētī nāk bagātība.',
      'The Jumis ear is kept in the granary, behind the beam — and then wealth comes into the granary.',
    ),
    hint: L('Laukā — citādi, nekā saka akmens…', 'In the field — otherwise than the stone says…'),
    // Šmits 11998 («Atpūta», 1932). The record says a pūķis lies by it and
    // drags wealth into the granary — kept out of the card, saved for later.
    source: SMITS + 'jumis.htm',
    ref: '11998',
    verified: true,
  },
  maize: {
    title: L('Maize', 'Bread'),
    text: L(
      'Maizes kukuli nekad neliek ar virsējo garozu uz leju — tad nāk bads.',
      'A loaf is never laid with its top crust down — that brings hunger to the house.',
    ),
    hint: L('Pie Vecās Annas krāsns…', 'At Old Anna’s oven…'),
    // Šmits 18623; the same belief in 18622, 18625, 18631.
    source: SMITS + 'maize.htm',
    ref: '18623',
    verified: true,
  },
  pirmaisKumoss: {
    title: L('Pirmais kumoss', 'The first crumb'),
    // NOT FOUND in Šmits' bread section (checked Sept 2026). The nearest real
    // customs: 18166 — a small loaf of the new bread is rolled and thrown back
    // into the grain bin «lai nekad netrūktu maizes»; 18168 — the first loaf
    // of the new rye is kept in the granary a whole year. Either rework the
    // crumb into one of those, or find a record in the veļi section.
    text: L(
      'No jaunās maizes pirmo kumosu neēd pats — to atdod tiem, kas bija pirms tevis.',
      'The first crumb of new bread is not eaten — it is given to those who came before you.',
    ),
    hint: L('Ciemā, ar maizi rokā…', 'In the village, with bread in hand…'),
    source: SMITS,
    ref: null,
    verified: false,
  },
  maldugunis: {
    title: L('Vadātājs', 'The one who leads astray'),
    text: L(
      'Naktī mežā un purvā cilvēku mēdz vadāt: vadātājs apmulsina prātu, ieved biezoknī vai ūdenī, līdz cilvēks vairs netiek ārā.',
      'At night, in the forest and on the bog, a person can be led astray: the vadātājs clouds the mind and leads them into the thicket or the water, until they cannot find their way out.',
    ),
    hint: L('Uz laipas…', 'On the causeway…'),
    // Šmits 31471–31472. Šmits' records have the vadātājs, not lights — the
    // bog lights on the causeway are this game's picture of it.
    source: SMITS + 'vadatajs.htm',
    ref: '31472',
    verified: true,
  },
  velnaTilts: {
    title: L('Velna tilts', 'The Devil’s bridge'),
    // NOT FOUND in Šmits' beliefs (checked Sept 2026): «the first living thing
    // to cross» is a tale motif (the international Devil's-bridge legend), so
    // it belongs to the teikas, not the ticējumi. Ask the Latvian Folklore
    // Archive (LFK) for an attested Latvian variant. Local lead: the teika
    // «Velna grava un tiltiņš» near Vilce manor (LTT 1991 : 134).
    text: L(
      'Par savu darbu velns prasa pirmo dzīvo, kas pāri ies. Gudrs cilvēks pa priekšu palaiž kādu dzīvnieku.',
      'For his work the Devil asks for the first living thing to cross. A clever man sends an animal ahead.',
    ),
    hint: L('Purvā, pie jaunā tilta…', 'At the bog, by the new bridge…'),
    source: SMITS,
    ref: null,
    verified: false,
  },
  gailis: {
    title: L('Gailis', 'The cock'),
    text: L(
      'Gaiļi ar dziedāšanu padzen velnu un viņa garus: tiklīdz gaiļi pret rītu sāk dziedāt, viņam jāiet projām.',
      'The cocks drive off the Devil and his spirits with their singing: as soon as they begin to crow towards morning, he has to go.',
    ),
    hint: L('Purvā, rītausmā…', 'At the bog, at dawn…'),
    source: SMITS + 'velns.htm',
    ref: '32406',
    verified: true,
  },
};

/** Shouts in the dev console while any belief is still unchecked. */
export function assertBeliefsVerified(): void {
  if (!import.meta.env.DEV) return;
  const pending = Object.entries(beliefs)
    .filter(([, b]) => !b.verified)
    .map(([k]) => `  • ${k}`);
  if (pending.length) {
    console.warn(
      '[Vecās Varas] Beliefs not yet matched to a Šmits record:\n' +
        pending.join('\n') +
        '\nSee src/content/ticejumi.ts before any public release.',
    );
  }
}
