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
 */

import { L } from '../core/i18n';

export const howTo = {
  kicker: L('Kā tas notiek', 'How it works'),
  title: L('Senciems', 'Senciems'),
  body: L(
    'Gads senā latviešu ciemā, svētkiem ejot pa vieniem. Katros svētkos tu dodies pie kādas no vecajām varām — gariem, ko godāja tavi senči.\n\nKo tu tām atstāj, to ciems pēc tam redzēs. Nodaļas beigās ciema akmens parāda, kā tev gāja.\n\nŠī nodaļa — rudzu pļauja. Pieskaries lietām, lai tās apskatītu. Stūrī vienmēr rakstīts, kas jādara.',
    'A year in an old Latvian village, one festival at a time. At each festival you go out to meet one of the old powers — the spirits your forefathers honoured.\n\nWhat you leave them, the village will see. At the end of each chapter, the stone in the village shows how it went.\n\nThis chapter: the rye harvest. Touch things to look at them. The corner always says what to do next.',
  ),
  ok: L('Sākam', 'Let’s begin'),
};

export const beings = {
  kicker: L('Pirms ceļa', 'Before you go'),
  ok: L('Iet', 'Go'),
  jumis: {
    title: L('Jumis', 'Jumis'),
    body: L(
      'Latviešu ticējumos Jumis ir labības svētība — gars, kas dzīvo laukā. Divas vārpas uz viena stiebra arī sauca par Jumi.\n\nPļaujas beigās Jumim atstāja mazu nenopļautu saliņu un vārpas sasēja mezglā. Citi Jumja vārpu nesa mājās un glabāja klētī.\n\nTev būs jāizvēlas: atstāt viņu laukam vai ņemt līdzi.',
      'In Latvian folk belief Jumis is the blessing of the grain — a spirit that lives in the field. Two ears grown on one stalk were called Jumis too.\n\nAt the end of the harvest the reapers left him a small uncut patch and tied its ears in a knot. Others carried the Jumis ear home and kept it in the granary.\n\nYou will have to choose: leave him to the field, or take him home.',
    ),
    note: L(
      'Pēc P. Šmita «Latviešu tautas ticējumiem», Nr. 11991, 11992, 11998',
      'After P. Šmits, Latvian Folk Beliefs, nos. 11991, 11992, 11998',
    ),
  },
  velns: {
    title: L('Velns', 'Velns, the Devil'),
    body: L(
      'Latviešu teikās velns ir drīzāk purva viltnieks nekā ļaunuma valdnieks. Viņš mīl darījumus un mīklas — un viņu var pārspēt.\n\nTiltu viņš var uzcelt vienā naktī, bet tikai pirms gailis dzied. Gaiļa dziesma viņu padzen.\n\nNeej tukšām rokām. Ar to, kas tev kulē, var samaksāt — un ne tikai vienā veidā.',
      'In Latvian legends the Devil is more a trickster of the bog than a lord of evil. He loves bargains and riddles — and he can be outwitted.\n\nHe can build a bridge in a single night, but only before the cock crows. The cock’s crow drives him off.\n\nDo not go empty-handed. What is in your bag can pay him — and there is more than one way to pay.',
    ),
    note: L(
      'Pēc P. Šmita «Latviešu pasakām un teikām» X, XV un «Ticējumiem», Nr. 32406',
      'After P. Šmits, Latvian Tales and Legends X, XV, and Folk Beliefs no. 32406',
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
    'Sasiet divvārpu un atstāt laukam? Jumis paliks laukā — un nākamgad atkal būs.',
    'Tie the double ear and leave it to the field? Jumis stays in the field — and comes back next year.',
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
  'Akmens atceras, kā tu šogad izturējies pret vecajām varām.\nVesela zīme — godā pavadīta. Iesākta — palikusi parādā.',
  'The stone remembers how you treated the old powers this year.\nA whole mark: seen off with honour. A broken one: left owing.',
);
