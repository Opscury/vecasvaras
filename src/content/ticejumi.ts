/**
 * ============================================================================
 *  TICĒJUMI — NEEDS HUMAN VERIFICATION BEFORE PUBLIC RELEASE
 * ============================================================================
 *
 *  The beliefs the game is built on, as the player collects them.
 *
 *  Each one is a real, widely attested Latvian belief or custom, but the
 *  wording below is this game's own summary, written from general knowledge —
 *  NOT copied from a collection. Before any public release, each entry should
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
      'Divvārpu — jumi — laukā nenocērt. To atstāj stāvam, pieliec pie zemes un piesien, lai Jumis paliek laukā un nākamgad atkal nes.',
      'The double ear — the jumis — is never cut. It is left standing, bent to the ground and tied, so that Jumis stays in the field and bears again next year.',
    ),
    hint: L('Laukā, pie robežakmens…', 'In the field, by the boundary stone…'),
    source: SMITS,
    ref: null,
    verified: false,
  },
  jumjaKersana: {
    title: L('Jumja ķeršana', 'Catching Jumis'),
    text: L(
      'Citviet jumi izrauj un nes mājās — iekar klētī vai istabā pie sijas, lai svētība paliek mājā.',
      'Elsewhere the double ear is pulled up and carried home — hung in the granary or from a beam in the house, so the blessing stays indoors.',
    ),
    hint: L('Laukā — citādi, nekā saka akmens…', 'In the field — otherwise than the stone says…'),
    source: SMITS,
    ref: null,
    verified: false,
  },
  maize: {
    title: L('Maize', 'Bread'),
    text: L(
      'Maizi neliek otrādi un nemet zemē. Kas ar maizi apietas nevērīgi, tam tā vairs neaug.',
      'Bread is never laid upside down or dropped on the ground. Whoever treats bread carelessly will find it stops growing for them.',
    ),
    hint: L('Pie Vecās Annas krāsns…', 'At Old Anna’s oven…'),
    source: SMITS,
    ref: null,
    verified: false,
  },
  pirmaisKumoss: {
    title: L('Pirmais kumoss', 'The first crumb'),
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
    title: L('Maldugunis', 'Will-o’-the-wisps'),
    text: L(
      'Purvā dzīvo mazas ugunis, kas rāda ceļu tur, kur ceļa nav. Kas tām seko, tas iestieg.',
      'On the bog live small lights that show a path where there is none. Whoever follows them sinks.',
    ),
    hint: L('Uz laipas…', 'On the causeway…'),
    source: SMITS,
    ref: null,
    verified: false,
  },
  velnaTilts: {
    title: L('Velna tilts', 'The Devil’s bridge'),
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
      'Kad gailis dzied, nakts darbiem beigas — velnam jāiet prom, lai kas būtu padarīts vai nepadarīts.',
      'When the cock crows, the night’s work is over — the Devil must go, whatever is finished or left undone.',
    ),
    hint: L('Purvā, rītausmā…', 'At the bog, at dawn…'),
    source: SMITS,
    ref: null,
    verified: false,
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
