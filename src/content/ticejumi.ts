/**
 * ============================================================================
 *  TICĒJUMI — the beliefs the player collects, each one from a printed record
 * ============================================================================
 *
 *  Every entry quotes its source as printed, with the record number shown on
 *  the page. Checked in Sept 2026 against the full text of P. Šmits,
 *  «Latviešu tautas ticējumi» (1940–41) and «Latviešu pasakas un teikas»
 *  (1925–37), both at valoda.ailab.lv/folklora/. See FOLKLORE.md for the
 *  ledger: what each line of the game rests on, and what it replaced.
 *
 *  The rules:
 *    1. Quote the record; do not improve it. Cuts are marked […], words added
 *       for sense go in [square brackets].
 *    2. `ref` is what the page prints after "after Šmits": a record number,
 *       several, or a volume and tale for the legends.
 *    3. Nothing unchecked reaches players: an entry with `verified: false`
 *       is left out of a production build altogether (flags.draftFolklore).
 * ============================================================================
 */

import { type Loc, L } from '../core/i18n';
import type { LoreId } from '../core/lore';

export interface Belief {
  title: Loc;
  text: Loc;
  /** Where to look, shown in place of the text until it is found. */
  hint: Loc;
  /** The page it was checked against. */
  source: string;
  /** Which of Šmits' collections: the beliefs, or the tales and legends. */
  book: 'ticejumi' | 'teikas';
  /** What the page cites: record numbers, or volume and tale. */
  ref: string | null;
  verified: boolean;
}

const SMITS = 'https://valoda.ailab.lv/folklora/ticejumi/';
const TEIKAS = 'https://valoda.ailab.lv/folklora/pasakas/';

export const beliefs: Record<LoreId, Belief> = {
  jumis: {
    title: L('Jumis', 'Jumis'),
    // 11992 (P. Retelis, «Latvis», 1930), its first two sentences, and the
    // last sentence of 11991 (B. Eriņa, Latgale).
    text: L(
      'Pļaujas beigās lauka vidū atstāj nenopļautu mazu pauguriņu. Atstātos rudzos pļāvēji izravē visas nezāles, un saimnieks vai vecākais puisis vārpas sasien mezglā. […] Divas vārpas, kas saaugušas uz viena salma, arī saukuši par Jumi.',
      'At the end of the harvest a small mound is left uncut in the middle of the field. The reapers weed out the rye that is left, and the master or the eldest lad ties the ears in a knot. […] Two ears grown together on one stalk were called Jumis too.',
    ),
    hint: L('Laukā, pie robežakmens…', 'In the field, by the boundary stone…'),
    source: SMITS + 'jumis.htm',
    book: 'ticejumi',
    ref: '11992, 11991',
    verified: true,
  },
  // The id is kept for old saves; the title is not. «Jumja ķeršana» in Šmits
  // (11999, 12000) is the end-of-harvest rite — tumbling and shouting, the last
  // patch cut from three sides — not carrying the ear home, which is this.
  jumjaKersana: {
    title: L('Jumis klētī', 'Jumis in the granary'),
    // 11998 («Atpūta», 1932), whole.
    text: L(
      'Jumja vārpu vajagot glabāt klētī aiz sijas, tad tur guļot klāt pūķis, kas velk bagātību klētī.',
      'The Jumis ear should be kept in the granary behind the beam: then a pūķis lies beside it there, and drags wealth into the granary.',
    ),
    hint: L('Laukā — citādi, nekā saka akmens…', 'In the field — otherwise than the stone says…'),
    source: SMITS + 'jumis.htm',
    book: 'ticejumi',
    ref: '11998',
    verified: true,
  },
  maize: {
    title: L('Maize', 'Bread'),
    // 18623 (V. Bērziņa, Priekule), whole. The same in 18622, 18625, 18631.
    text: L(
      'Maizes kukuli nekad nedrīkst likt ar virsējo garozu uz leju, jo tad Dievs soda ar badu.',
      'A loaf must never be laid with its top crust down, for then God punishes with famine.',
    ),
    hint: L('Pie Vecās Annas krāsns…', 'At Old Anna’s oven…'),
    source: SMITS + 'maize.htm',
    book: 'ticejumi',
    ref: '18623',
    verified: true,
  },
  // The id is kept for old saves. The earlier text («the first crumb is given
  // to those who came before you») is in no record. What the records do say
  // is that the first bite of new bread belongs to the house spirit, and that
  // the house spirit may live in a stone in the field — which is the stone.
  pirmaisKumoss: {
    title: L('Pirmais kumoss', 'The first bite'),
    // 19325 («Latv. ļaužu draugs», of the mājas kungi in Vidzeme), one
    // sentence; 19340 (F. Brīvzemnieks, 1881), one sentence.
    text: L(
      '[Mājas kungiem] ir mājas vieta vai kādā kokā, vai kādā vecā krāsmatā, vai sētmalā, vai pašu laukā kādā akmenī. […] Ja saimniece vāra kādu ēdienu jeb cep maizi, pirmais kumoss arvien bijis jādod šim garam.',
      '[The house spirits] have their dwelling in a tree, or an old hearth-site, or by the fence, or in a stone in the field itself. […] Whenever the housewife cooked a meal or baked bread, the first bite always had to be given to this spirit.',
    ),
    hint: L('Ciemā, ar maizi rokā…', 'In the village, with bread in hand…'),
    source: SMITS + 'majask.htm',
    book: 'ticejumi',
    ref: '19325, 19340',
    verified: true,
  },
  // Was the vadātājs (31472), which is a spirit, not a light. Šmits has the
  // lights themselves under «Spīgainis», and ties them to the Devil.
  maldugunis: {
    title: L('Maldugunis', 'The bog lights'),
    // 28643 (W. Maczewski, 1793), whole; the name as in 28650.
    text: L(
      'Kad dažkārt mazi uguntiņi purvu virsū rādās, tad saka, ka vells caur tādām svecēm ļaudis gribot pievilt.',
      'When little lights sometimes show over the bogs, it is said that the Devil means to deceive people with such candles.',
    ),
    hint: L('Uz laipas…', 'On the causeway…'),
    source: SMITS + 'spigaini.htm',
    book: 'ticejumi',
    ref: '28643',
    verified: true,
  },
  // Not a belief but a legend, so it cites the legends. The earlier text — the
  // Devil asks for the first living thing to cross, and a clever man sends an
  // animal — is the international Devil's-bridge tale and was not found in any
  // Latvian record. The Latvian one is about the night and the cock.
  velnaTilts: {
    title: L('Velna tilts', 'The Devil’s bridge'),
    // «Naudas kalns» by Vecpiebalga (Dzintariņš, «Balss», 1896, 16): the end
    // of one sentence, then the three that end the building.
    text: L(
      '[…] velns apsolījies vienā naktī, pirms gailis dziedās, tiltu uztaisīt. […] Pielasījis vienu klēpi akmeņu un iebēris ezerā. Tāpat arī otru. Ar trešo jau bijis ezera tuvumā, tad gailis dziedājis.',
      '[…] the Devil promised to build the bridge in one night, before the cock crowed. […] He gathered an armful of stones and tipped it into the lake. The same with a second. With the third he was already near the lake — and then the cock crowed.',
    ),
    hint: L('Purvā, kad viņš sāk būvēt…', 'At the bog, when he starts to build…'),
    source: TEIKAS + 'gr15/15H0514.htm',
    book: 'teikas',
    ref: 'XV, «Kalni» 14',
    verified: true,
  },
  gailis: {
    title: L('Gailis', 'The cock'),
    // 32406 (P. Einhorns, 1627), its first two sentences.
    text: L(
      'Gaiļi ar dziedāšanu varot padzīt velnu un viņa garus. Tiklīdz gaiļi pret rītu sākot dziedāt, viņam jāejot projām.',
      'The cocks, by their crowing, can drive off the Devil and his spirits. As soon as the cocks begin to crow towards morning, he has to go.',
    ),
    hint: L('Purvā, rītausmā…', 'At the bog, at dawn…'),
    source: SMITS + 'velns.htm',
    book: 'ticejumi',
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
