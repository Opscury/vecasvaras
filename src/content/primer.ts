/**
 * The cards that explain — added after the family playtest of 18 Oct 2026.
 *
 * What the playtest showed: players finished the demo without knowing what
 * the game was, who Jumis is, why the double ear mattered, what could be
 * offered at the bog, or what the marks at the stone meant. Every one of
 * those is a missing sentence, not a missing mechanic. So:
 *
 *   howTo   — one card before the opening narration: what the game is
 *   beings  — one card before each encounter: who you are about to meet,
 *             what people believed about them, and what the choice is
 *   belief  — after each encounter, the ticējums that fits what you did,
 *             shown as a card rather than only a toast
 *   confirm — the double ear asks before it is tied or pulled
 *   stone   — one line under the tally saying what the marks are
 *
 * The «beings» cards SUMMARISE the records — they are the game talking, not
 * a quotation — and each cites what it summarises (FOLKLORE.md, «Cards»).
 *
 * They are also where an English player is told who these two are, so the
 * English titles and opening sentences carry the glosses the style guide
 * fixes: Jumis is the harvest spirit, Velns is the bog devil, more fool than
 * fiend. Both names keep their diacritics, and after this card the English
 * uses the name. The Latvian says the same thing in its own words rather
 * than in a translation of these.
 */

import { L } from '../core/i18n';

export const howTo = {
  kicker: L('Kā tas notiek', 'How it works'),
  title: L('Senciems', 'Senciems'),
  body: L(
    'Viens gads senā latviešu ciemā, no vieniem svētkiem līdz nākamajiem. Svētkos tu dodies pie kādas no vecajām varām: gariem, ar kuriem tavi senči rēķinājās.\n\nKo tu tām atstāj, to ciems pēc tam redzēs. Nodaļas beigās ciema akmens parāda, kā tev gāja.\n\nŠī nodaļa ir par rudzu pļauju. Pieskaries lietām, lai tās apskatītu. Stūrī vienmēr rakstīts, kas jādara.',
    'A year in an old Latvian village, one festival at a time. At each festival you go out to meet one of the old powers, the spirits your forefathers had to reckon with.\n\nThe village will see what you leave them. At the end of each chapter, the stone in the village shows how it went.\n\nThis chapter: the rye harvest. Touch things to look at them. The corner always says what to do next.',
  ),
  ok: L('Sākam', 'Let’s begin'),
};

export const beings = {
  kicker: L('Pirms ceļa', 'Before you go'),
  ok: L('Iet', 'Go'),
  jumis: {
    title: L('Jumis', 'Jumis, the harvest spirit'),
    body: L(
      'Latviešu ticējumos Jumis ir labības svētība, gars, kas dzīvo laukā. Divas vārpas uz viena stiebra arī sauca par Jumi.\n\nPļaujas beigās Jumim atstāja mazu nenopļautu saliņu un vārpas sasēja mezglā. Pēc tam Jumja vārpu nesa mājās un glabāja klētī.\n\nPierakstos dara abus, vienu pēc otra. Te tev būs jāizvēlas viens: atstāt viņu laukam vai ņemt līdzi.',
      'In Latvian folk belief Jumis is the blessing of the grain, a spirit that lives in the field. Two ears grown on one stalk were called Jumis too.\n\nAt the end of the harvest the reapers left him a small uncut patch and tied its ears in a knot. Then the Jumis ear was carried home and kept in the granary.\n\nThe records do both, one after the other. Here you have to choose one: leave him to the field, or take him home.',
    ),
    note: L(
      'Pēc P. Šmita «Latviešu tautas ticējumiem», Nr. 11989, 11991, 11992, 11998',
      'After P. Šmits, Latvian Folk Beliefs, nos. 11989, 11991, 11992, 11998',
    ),
  },
  velns: {
    title: L('Velns', 'Velns, the Devil'),
    body: L(
      'Latviešu teikās velns nav nekāds briesmonis. Viņš ir viltnieks, kas mīl darījumus un mīklas, un gudrs cilvēks viņu var apmānīt.\n\nViņš sola uzcelt tiltu vienā naktī, bet gaiļa dziesma viņu pārtrauc un padzen.\n\nNeej tukšām rokām. Ar to, kas tev kulē, var samaksāt, un ne tikai vienā veidā.',
      'In Latvian legend Velns, the Devil, is more fool than fiend. He loves bargains and riddles, and a clever person can beat him at both.\n\nHe promises to build a bridge in a single night, but the cock crows before he is done, and the crowing drives him off.\n\nDo not go empty-handed. What is in your bag can pay him, in more than one way.',
    ),
    note: L(
      'Pēc P. Šmita «Latviešu pasakām un teikām» X, XV un «Ticējumiem», Nr. 21224, 32406',
      'After P. Šmits, Latvian Tales and Legends X, XV, and Folk Beliefs nos. 21224, 32406',
    ),
  },
};

/** The ticējums card after an encounter. */
export const beliefCard = {
  kicker: L('Ticējums', 'A folk belief'),
  ok: L('Tālāk', 'Next'),
};

/** The double ear, before it is settled by a drag. */
export const earConfirm = {
  leave: L(
    'Sasiet divvārpu un atstāt laukam? Jumis paliks laukā un nākamgad atkal būs klāt.',
    'Tie the double ear and leave it to the field? Jumis stays in the field and comes back next year.',
  ),
  take: L(
    'Izraut divvārpu un nest mājās? Jumis dzīvos tavā klētī, nevis laukā.',
    'Pull the double ear up and carry it home? Jumis will live in your granary, not the field.',
  ),
  yes: L('Jā, tā.', 'Yes, do it.'),
  back: L('Nē, vēl padomāšu.', 'No, let me think.'),
};

/** Under the tally's heading. */
export const stoneNote = L(
  'Akmens atceras, kā tu šogad izturējies pret vecajām varām.\nVesela zīme: godā pavadīta. Nepabeigta: dabūja mazāk, nekā pienācās.',
  'The stone remembers how you treated the old powers this year.\nA whole mark: honoured as it should be. A broken one: given less than its share.',
);
