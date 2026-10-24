/**
 * «Avoti» — every piece of folklore the game presents, where it comes from,
 * and every story element that is the game's own.
 *
 * One list, read by three places: the last spread of the beliefs book, the
 * small «Avoti» link on the title screen, and the standalone page at /avoti/
 * (avoti/index.html + src/avoti-render.ts, rendered at build time). The
 * folklore itself lives in ticejumi.ts, dainas.ts and the riddles in
 * script.ts; this file only reads them and says where each one is from.
 * FOLKLORE.md is the working ledger behind it.
 *
 * The house rule (FOLKLORE.md): a verse, belief or riddle is quoted from a
 * source, or it is not presented as folklore. So everything the game offers
 * as tradition is «as recorded». What is invented is listed too, as the
 * game's own — a folklorist reading this should be able to tell at a glance
 * which is which.
 */

import { type Loc, L, fillLoc } from '../core/i18n';
import type { LoreId } from '../core/lore';
import { beliefs } from './ticejumi';
import { dainas } from './dainas';
import { opening, velns as velnsScript } from './script';

export type SourceStatus = 'attested' | 'own';

export const STATUS_LABEL: Record<SourceStatus, Loc> = {
  attested: L('Pēc avota', 'As recorded'),
  own: L('Spēles izdomājums', 'The game’s own'),
};

export const STATUS_EXPLAIN: Record<SourceStatus, Loc> = {
  attested: L('citēts no pieraksta, ar numuru', 'quoted from the record, with its number'),
  own: L('spēles stāsts, nevis folklora', 'the game’s story, not folklore'),
};

export interface Work {
  id: 'smitsTic' | 'smitsLpt' | 'barons' | 'miklas' | 'lfk';
  /** A line short enough for the book. */
  short: Loc;
  cite: Loc;
  url: string;
  urlLabel: string;
}

/** The works the game draws on, as a short bibliography. */
export const WORKS: readonly Work[] = [
  {
    id: 'smitsTic',
    short: L('P. Šmits. Latviešu tautas ticējumi. 1940–1941', 'P. Šmits. Latvian Folk Beliefs. 1940–1941'),
    cite: L(
      'P. Šmits. Latviešu tautas ticējumi. 4 sējumi. Rīga, 1940–1941. Digitālā versija: LU MII Mākslīgā intelekta laboratorija.',
      'P. Šmits. Latviešu tautas ticējumi (Latvian Folk Beliefs). 4 vols. Riga, 1940–1941. Digital edition: Artificial Intelligence Laboratory, IMCS, University of Latvia.',
    ),
    url: 'https://valoda.ailab.lv/folklora/ticejumi/',
    urlLabel: 'valoda.ailab.lv/folklora/ticejumi',
  },
  {
    id: 'smitsLpt',
    short: L('P. Šmits. Latviešu pasakas un teikas. 1925–1937', 'P. Šmits. Latvian Tales and Legends. 1925–1937'),
    cite: L(
      'P. Šmits. Latviešu pasakas un teikas. 15 sējumi. Rīga, 1925–1937. Digitālā versija: LU MII Mākslīgā intelekta laboratorija.',
      'P. Šmits. Latviešu pasakas un teikas (Latvian Tales and Legends). 15 vols. Riga, 1925–1937. Digital edition: Artificial Intelligence Laboratory, IMCS, University of Latvia.',
    ),
    url: 'https://valoda.ailab.lv/folklora/pasakas/',
    urlLabel: 'valoda.ailab.lv/folklora/pasakas',
  },
  {
    id: 'barons',
    short: L('K. Barons. Latvju dainas. 1894–1915', 'K. Barons. Latvju dainas. 1894–1915'),
    cite: L(
      'K. Barons, H. Visendorfs. Latvju dainas. 6 sējumi, 1894–1915. Digitāli: Krišjāņa Barona Dainu skapis.',
      'K. Barons, H. Visendorfs. Latvju dainas (Latvian Dainas). 6 vols, 1894–1915. Digital: Krišjānis Barons’ Cabinet of Folksongs.',
    ),
    url: 'https://dainuskapis.lv/',
    urlLabel: 'dainuskapis.lv',
  },
  {
    id: 'miklas',
    short: L('Latviešu tautas mīklas. 2015, 2022', 'Latvian folk riddles. 2015, 2022'),
    cite: L(
      'I. Kalniņa. Latviešu tautas mīklas – lieliem un maziem. Avots, 2015. «Latviešu bērnu folklora», pārpublicēts D. Kindzules krājumā «Latviešu tautas mīklas» (2022).',
      'I. Kalniņa. Latviešu tautas mīklas – lieliem un maziem (Latvian folk riddles for young and old). Avots, 2015. «Latviešu bērnu folklora», reprinted in D. Kindzule, «Latviešu tautas mīklas» (2022).',
    ),
    url: 'https://e-biblioteka.lv/latviesu-miklas-berniem/miklas-par-dabu/',
    urlLabel: 'e-biblioteka.lv',
  },
  {
    id: 'lfk',
    short: L('Latviešu folkloras krātuve — garamantas.lv', 'Archives of Latvian Folklore — garamantas.lv'),
    cite: L(
      'LU Literatūras, folkloras un mākslas institūta Latviešu folkloras krātuve — digitālais arhīvs.',
      'Archives of Latvian Folklore, Institute of Literature, Folklore and Art, University of Latvia — digital archive.',
    ),
    url: 'https://garamantas.lv/',
    urlLabel: 'garamantas.lv',
  },
];

export type EntryKind = 'ticejums' | 'daina' | 'teika' | 'mikla' | 'stasts';

export const KIND_LABEL: Record<EntryKind, Loc> = {
  ticejums: L('Ticējums', 'Belief'),
  daina: L('Tautasdziesma', 'Folk song'),
  teika: L('Teika', 'Legend'),
  mikla: L('Mīkla', 'Riddle'),
  stasts: L('Stāsts', 'Story'),
};

export interface SourceEntry {
  key: string;
  kind: EntryKind;
  /** What the player meets, by name or first line. */
  title: Loc;
  /** Where in the game. */
  where: Loc;
  status: SourceStatus;
  /** The citation itself, or null for the game's own. */
  cite: Loc | null;
  /** A page to check it against, where there is one online. */
  url: string | null;
  note?: Loc;
}

const WHERE: Record<LoreId, Loc> = {
  jumis: L('Laukā', 'The field'),
  jumjaKersana: L('Laukā', 'The field'),
  maize: L('Ciemā', 'The village'),
  pirmaisKumoss: L('Ciemā', 'The village'),
  maldugunis: L('Purvā', 'The bog'),
  velnaTilts: L('Purvā', 'The bog'),
  gailis: L('Purvā', 'The bog'),
};

const TIC = L('P. Šmits, «Latviešu tautas ticējumi», Nr. {}', 'P. Šmits, Latviešu tautas ticējumi, no. {}');
const LPT = L('P. Šmits, «Latviešu pasakas un teikas», {}', 'P. Šmits, Latviešu pasakas un teikas, {}');
const same = (s: string): Loc => L(s, s);
const RIDDLE_URL = 'https://valoda.ailab.lv/folklora/pasakas/gr10/1001602.htm';
const TEIKAS_URL = 'https://valoda.ailab.lv/folklora/pasakas/gr15/15H0514.htm';

/** A belief's citation, as the book and the page both print it. */
export function beliefCite(id: LoreId): Loc | null {
  const b = beliefs[id];
  if (!b.ref) return null;
  return fillLoc(b.book === 'teikas' ? LPT : TIC, same(b.ref));
}

/** The verse on an encounter's opening card: LD number, and where Šmits prints it. */
function dainaEntry(key: keyof typeof dainas, title: Loc, where: Loc, smitsNo: string): SourceEntry {
  const d = dainas[key];
  return {
    key: `daina:${key}`,
    kind: 'daina',
    title,
    where,
    status: d.verified ? 'attested' : 'own',
    cite: fillLoc(L(`Latvju dainas, ${d.ld}; iespiesta P. Šmita «Latviešu tautas ticējumos», Nr. {}`, `Latvju dainas, ${d.ld}; printed in P. Šmits, Latviešu tautas ticējumi, no. {}`), same(smitsNo)),
    url: d.source,
  };
}

function beliefEntry(id: LoreId): SourceEntry {
  const b = beliefs[id];
  return {
    key: `ticejums:${id}`,
    kind: b.book === 'teikas' ? 'teika' : 'ticejums',
    title: b.title,
    where: WHERE[id],
    status: b.verified ? 'attested' : 'own',
    cite: beliefCite(id),
    url: b.source,
  };
}

/** Everything, in the order the player meets it. */
export function allEntries(): SourceEntry[] {
  const out: SourceEntry[] = [];

  out.push(dainaEntry('jumis', L('«Kur, Jumīti, tu gulēji…»', '“Where, little Jumis, did you sleep…”'), L('Lauka sākumā', 'Opening the field'), '12002'));
  out.push({
    key: 'karte:jumis',
    kind: 'ticejums',
    title: L('«Pirms ceļa»: Jumis', '“Before you go”: Jumis'),
    where: L('Kartīte pirms lauka', 'The card before the field'),
    status: 'attested',
    cite: fillLoc(TIC, same('11991, 11992, 11998')),
    url: beliefs.jumis.source,
    note: L(
      'Pārstāstīts, ne citēts: saliņa un mezgls (11992), divvārpa ir Jumis (11991), Jumis klētī (11998). «Labības svētība» ir spēles kopsavilkums.',
      'Retold, not quoted: the patch and the knot (11992), the double ear is Jumis (11991), Jumis in the granary (11998). “The blessing of the grain” is the game’s summary.',
    ),
  });
  (['jumis', 'jumjaKersana', 'maize', 'pirmaisKumoss'] as LoreId[]).forEach((id) => out.push(beliefEntry(id)));
  out.push({
    key: 'ticejums:divvarpaPrecibas',
    kind: 'ticejums',
    title: L('Kas atrod divvārpu, tas drīz apprecēsies', 'Whoever finds a double ear will soon be married'),
    where: L('Ciemā, pēc pļaujas', 'The village, after the harvest'),
    status: 'attested',
    cite: fillLoc(TIC, same('11991')),
    url: beliefs.jumis.source,
    note: L(
      'Pārstāstīts sarunā. Pierakstā: «Jauni ļaudis centušies atrast tādas saaugušas vārpas, tā esot zīme, ka tādas vārpas atradējs ātri apprecēsies.»',
      'Retold in conversation. The record: young people tried to find such grown-together ears, as a sign that the finder would soon marry.',
    ),
  });
  out.push({
    key: 'svetki:apjumibas',
    kind: 'ticejums',
    title: L('Apjumības: vārpu vaiņags', 'Apjumības: the wreath of ears'),
    where: L('Svētkos pēc pļaujas', 'The feast after the harvest'),
    status: 'attested',
    cite: fillLoc(TIC, same('11989, 11990')),
    url: beliefs.jumis.source,
    note: L(
      'Pārstāstīts, ne citēts: vaiņagu vij no pļaujamās labības, Jumi ņemot (11989), un to pasniedz tam, kam pieder nams (11990). Pēdējie stiebri paliek tīrumā un tiek appušķoti (11990). Spēlē vaiņagu nes Annas māte.',
      'Retold, not quoted: the wreath is woven from the grain being reaped, as Jumis is taken (11989), and handed to whoever the house belongs to (11990). The last stalks are left standing in the field and decked with flowers (11990). In the game it is Mother Anna who wears the wreath.',
    ),
  });
  out.push(dainaEntry('velns', L('«Ēdat, govis, purva zāli…»', '“Eat, cows, the grass of the bog…”'), L('Purva sākumā', 'Opening the bog'), '24910'));
  out.push({
    key: 'karte:velns',
    kind: 'teika',
    title: L('«Pirms ceļa»: velns', '“Before you go”: the Devil'),
    where: L('Kartīte pirms purva', 'The card before the bog'),
    status: 'attested',
    cite: L(
      'P. Šmits, «Latviešu pasakas un teikas», X («Velna uzdotās mīklas»), XV («Kalni» 14); «Latviešu tautas ticējumi», Nr. 32406',
      'P. Šmits, Latviešu pasakas un teikas, X («Velna uzdotās mīklas»), XV («Kalni» 14); Latviešu tautas ticējumi, no. 32406',
    ),
    url: TEIKAS_URL,
    note: L(
      'Pārstāstīts, ne citēts: velns uzdod mīklas un slēdz darījumus, ceļ tiltu vienā naktī līdz gaiļiem, gaiļa dziesma viņu padzen. «Purva viltnieks, nevis ļaunuma valdnieks» ir spēles kopsavilkums.',
      'Retold, not quoted: the Devil asks riddles and strikes bargains, builds a bridge in one night until the cock crows, and cockcrow drives him off. “A trickster of the bog, not a lord of evil” is the game’s summary.',
    ),
  });
  out.push(beliefEntry('maldugunis'));

  // Every riddle he can open with — one is drawn per run, so all of them are
  // listed, and adding one to the pool lists it here without touching this.
  opening.forEach((r, i) =>
    out.push({
      key: `mikla:opening${i}`,
      kind: 'mikla',
      title: r.ask,
      where: r.where,
      status: 'attested',
      cite: r.cite,
      url: r.url,
      note:
        opening.length > 1
          ? L('Velns vienā spēlē uzdod vienu no šīm mīklām.', 'He asks one of these in any one run of the game.')
          : undefined,
    }),
  );
  out.push({
    key: 'mikla:sweeterThanHoney',
    kind: 'mikla',
    title: velnsScript.riddle2,
    where: L('Velna otrā mīkla', 'The Devil’s second riddle'),
    status: 'attested',
    cite: fillLoc(LPT, L('X, «Velna uzdotās mīklas», Nr. 2 (A. 812). Atminējums: miegs.', 'X, «Velna uzdotās mīklas», no. 2 (A. 812). Answer: sleep.')),
    url: RIDDLE_URL,
    note: L('Pasakā šo mīklu uzdod pats velns.', 'In the tale it is the Devil himself who asks it.'),
  });
  out.push({
    key: 'mikla:cock',
    kind: 'mikla',
    title: velnsScript.askBack.riddle,
    where: L('Tava mīkla velnam', 'Your riddle for the Devil'),
    status: 'attested',
    cite: L('«Latviešu bērnu folklora» (D. Kindzule, «Latviešu tautas mīklas», 2022). Atminējums: gailis.', '«Latviešu bērnu folklora» (D. Kindzule, Latviešu tautas mīklas, 2022). Answer: the cock.'),
    url: null,
    note: L('Velns to vārdu nesaka: gailis ir tas, kas viņu padzen (Šmits, Nr. 32406).', 'The Devil will not say the word: the cock is what drives him off (Šmits, no. 32406).'),
  });

  (['velnaTilts', 'gailis'] as LoreId[]).forEach((id) => out.push(beliefEntry(id)));

  // Nothing in the book may be missing from the list. (Read from the beliefs
  // themselves, not core/lore: this file also runs inside vite.config, where
  // the game's runtime flags do not exist.)
  (Object.keys(beliefs) as LoreId[]).forEach((id) => {
    if (!out.some((e) => e.key === `ticejums:${id}`)) out.push(beliefEntry(id));
  });

  // The story's own inventions, named so nobody mistakes them for tradition.
  out.push({
    key: 'stasts:firstToCross',
    kind: 'stasts',
    title: L('Velna cena: «pirmais, kas pāri ies»', 'The Devil’s price: “the first to cross”'),
    where: L('Purvā', 'The bog'),
    status: 'own',
    cite: null,
    url: null,
    note: L(
      'Latviešu teikās velns ceļ tiltu vienā naktī līdz gaiļiem, bet maksa ar pirmo, kas pāri ies, un viltība ar dzīvnieku nāk no Viduseiropas teikas par velna tiltu. Latviešu pierakstos to neatradām. Tuvākais latviešu motīvs: velnam apsolīts tas, kas mājās gaida (piemēram, «Latviešu pasakas un teikas», X, «Velna uzdotās mīklas», Nr. 1–2).',
      'In the Latvian legends the Devil builds a bridge in one night, until the cock crows; but the price of the first to cross, and cheating it with an animal, come from the Central European Devil’s-bridge legend. We did not find them in Latvian records. The nearest Latvian motif: the Devil is promised whatever waits at home (e.g. Latviešu pasakas un teikas, X, «Velna uzdotās mīklas», nos. 1–2).',
    ),
  });
  out.push({
    key: 'stasts:jumisEats',
    kind: 'stasts',
    title: L('Mājās aiznests Jumis ēd no klēts', 'Jumis taken home eats from the granary'),
    where: L('Laukā un klētī', 'The field and the granary'),
    status: 'own',
    cite: null,
    url: null,
    note: L(
      'Spēles noteikums. Pierakstos ir otrādi: klētī glabāts Jumis nes svētību un bagātību (Šmits, Nr. 11992, 11998).',
      'A rule of the game. The records say the opposite: Jumis kept in the granary brings blessing and wealth (Šmits, nos. 11992, 11998).',
    ),
  });
  out.push({
    key: 'stasts:courting',
    kind: 'stasts',
    title: L('Ilze, Krišs un danči Miķeļos', 'Ilze, Krišs and the dancing on Miķeļi'),
    where: L('Ciemā', 'The village'),
    status: 'own',
    cite: null,
    url: null,
    note: L(
      'Spēles stāsts. Ilzes vainags apģērbā ir meitas galvas rota, bet par to spēle neko neapgalvo. Danči Miķeļos ir izdomāti; Miķeļi kā rudens svētki, protams, nav.',
      'The game’s story. Ilze’s woven crown is a maiden’s headdress in her costume; the game makes no claim about it. The dancing on Miķeļi is invented; Miķeļi itself, as the autumn feast, of course is not.',
    ),
  });
  out.push({
    key: 'stasts:bread',
    kind: 'stasts',
    title: L('Maize, kurā ir viss lauks', 'Bread with the whole field in it'),
    where: L('Purvā', 'The bog'),
    status: 'own',
    cite: null,
    url: null,
    note: L('Strīds ar velnu par maizi un to, ka šī gada klaips viņu padzen, ir spēles stāsts.', 'The argument with the Devil about bread, and the loaf of this year’s rye that sends him off, are the game’s story.'),
  });
  out.push({
    key: 'stasts:overTable',
    kind: 'stasts',
    title: L('Divvārpa pakārta virs galda', 'The double ear hung over the table'),
    where: L('Apjumībās', 'At the harvest feast'),
    status: 'own',
    cite: null,
    url: null,
    note: L(
      'Spēles izdomājums. Pierakstos Jumja vārpu glabā klētī aiz sijas (Šmits, Nr. 11998), iesprauž sienas spraugā (11997) vai ietin vaiņagā (11989, 11990); ka to pakārtu virs svētku galda, mēs neatradām. Pats vaiņags un appušķotie pēdējie stiebri ir no avota.',
      'The game’s own. In the records the Jumis ear is kept in the granary behind a beam (Šmits, no. 11998), wedged into a crack in the wall (11997), or woven into the wreath (11989, 11990); hanging it over the feast table we could not find. The wreath itself, and the last stalks left decked with flowers, are from the record.',
    ),
  });
  out.push({
    key: 'stasts:jug',
    kind: 'stasts',
    title: L('Velna parāds: krūze alus Jāņos', 'The Devil’s debt: a jug of beer at Jāņi'),
    where: L('Purvā', 'The bog'),
    status: 'own',
    cite: null,
    url: null,
    note: L(
      'Spēles stāsts. Pierakstos velns slēdz darījumus un tos zaudē, bet neviens no tiem nav alus parāds, un neviena mums zināma teika viņu nesūta pēc samaksas Jāņos. Spēlē tas ir veids, kā viltnieks atgriežas nākamajā nodaļā: padzīts viņš ir tikai līdz Jāņiem.',
      'The game’s story. In the records the Devil strikes bargains and loses them, but none of them is a debt of beer, and no legend we know sends him back for payment at Jāņi. In the game it is how the trickster gets to return in a later chapter: he is only ever chased off until midsummer.',
    ),
  });
  return out;
}

export const AVOTI_TEXT = {
  heading: L('Avoti', 'Sources'),
  intro: L(
    'Viss, ko spēle piedāvā kā veco ļaužu zināšanas, ir citēts no pierakstītas latviešu folkloras. Šeit ir katra tautasdziesma, ticējums, teika un mīkla, ko spēlē sastopi, ar avotu un numuru — un arī tas, ko spēle ir izdomājusi pati.',
    'Everything the game offers as what the old people knew is quoted from recorded Latvian folklore. Here is every folk song, belief, legend and riddle you meet in the game, with its source and number — and also what the game has made up.',
  ),
  fiction: L(
    'Ciems, Annas māte, akmens ciema vidū un spēles notikumi ir izdomāti. Folklora tajos ir īsta.',
    'The village, Mother Anna, the stone in the middle of the village and the events of the game are invented. The folklore in them is real.',
  ),
  works: L('Izmantotie darbi', 'Works drawn on'),
  entries: L('Spēlē sastopamā folklora', 'The folklore in the game'),
  more: L('Uzzini vairāk un piedalies', 'Learn more and take part'),
  moreText: L(
    'Latviešu folkloras krātuvē glabājas ap trīs miljoniem folkloras vienību. Vietnē garamantas.lv tās var brīvi lasīt un klausīties, un ikviens var palīdzēt atšifrēt rokrakstus, lai tajos rakstīto varētu meklēt.',
    'The Archives of Latvian Folklore hold around three million items of folklore. On garamantas.lv they are free to read and listen to, and anyone can help transcribe the manuscripts so that what is written in them can be searched.',
  ),
  moreLink: L('Atvērt garamantas.lv', 'Open garamantas.lv'),
  art: L('Par zīmējumiem un skaņām', 'About the pictures and sounds'),
  artText: L(
    'Gleznas un daļa skaņu radītas ar mākslīgā intelekta rīkiem autora vadībā un pēc tam apstrādātas. Folkloras teksti ņemti no šeit minētajiem avotiem.',
    'The paintings and some of the sounds were made with AI tools under the author’s direction and then edited. The folklore texts are taken from the sources listed here.',
  ),
  corrections: L('Ja pamani kļūdu vai zini labāku avotu, lūdzu, raksti:', 'If you spot a mistake or know a better source, please write:'),
  /** The book's last spread. */
  bookLeft: L('Kas citēts un kas izdomāts:', 'What is quoted and what is invented:'),
  bookFull: L('Visi avoti ar numuriem un saitēm:', 'Every source, with numbers and links:'),
  bookCount: L('{} folkloras vienības, katra citēta no avota', '{} items of folklore, each quoted from its source'),
};

/** Where the standalone page lives, relative to the game's own page. */
export const AVOTI_PATH = './avoti/';
export const AVOTI_URL_LABEL = 'vecasvaras.protu.lv/avoti';
export const GARAMANTAS_URL = 'https://garamantas.lv/';
/** Shown under «corrections» on the web page once set. Null hides the line. */
export const CONTACT_EMAIL: string | null = null;
