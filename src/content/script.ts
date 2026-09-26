/**
 * Every player-facing line in the game, in both languages.
 *
 * Scenes never contain literal text. If you want to rewrite the game's voice,
 * or hand the Latvian to a proofreader, this is the only file that matters
 * (with `elder.ts` and `ticejumi.ts` beside it).
 *
 * THE RIDDLES are all traditional, and quoted (checked Sept 2026 — sources
 * in FOLKLORE.md and src/content/sources.ts, tested by lore.test.ts):
 *   velns.riddle          — the wind: I. Kalniņa, «Latviešu tautas mīklas –
 *                           lieliem un maziem» (Avots, 2015)
 *   velns.riddle2         — sweeter than honey: asked by the Devil himself in
 *                           Šmits, «Latviešu pasakas un teikas» X, «Velna
 *                           uzdotās mīklas» 2 (Valmiera district)
 *   velns.askBack.riddle  — the cock: «Latviešu bērnu folklora»
 * The earlier "faster than the wind — a thought" and "what sings, and the
 * night is over" were not traditional and are gone.
 *
 * Lines added in the September "fun pass" are marked NEW in a comment and have
 * not been through a proofreader yet.
 */

import { L } from '../core/i18n';

export const ui = {
  langSwitch: L('EN', 'LV'),
  begin: L('Sākt', 'Begin'),
  resume: L('Turpināt', 'Continue'),
  restart: L('Sākt no jauna', 'Start over'),
  subtitle: L('Latviešu folkloras spēle', 'A game of Latvian folklore'),
  /** The button that moves the narration on. */
  next: L('Tālāk', 'Next'),
  // Heading of the page that shows everything said so far (⟲ / H).
  history: L('Teiktais', 'Said so far'),
  loading: L('Ielādē', 'Loading'),
  loadFailed: L('Neizdevās ielādēt zīmējumus.', 'Some of the pictures did not load.'),
  retry: L('Mēģināt vēlreiz', 'Try again'),
};

/** NEW — the beliefs page and the note that a new one was found. */
export const loreUi = {
  heading: L('Ticējumi', 'Beliefs'),
  found: L('{} no {}', '{} of {}'),
  toast: L('Jauns ticējums', 'A new belief'),
  locked: L('Vēl nav atrasts.', 'Not found yet.'),
  source: L('Pēc P. Šmita «Latviešu tautas ticējumiem», Nr. {}', 'After P. Šmits, Latvian Folk Beliefs, no. {}'),
  /** For a legend rather than a belief: volume and tale. */
  sourceTale: L('Pēc P. Šmita «Latviešu pasakām un teikām», {}', 'After P. Šmits, Latvian Tales and Legends, {}'),
  close: L('Pieskaries ārpus grāmatas, lai aizvērtu', 'Touch outside the book to close'),
  /** Under the heading on the book's first page. */
  epigraph: L(
    'Ko vecie zināja, pierakstīts tā, kā tu to atradi.',
    'What the old people knew, written down as you came across it.',
  ),
  unfound: L('Vēl nav atrasts', 'Not yet found'),
};

/** The settings page. */
export const settingsUi = {
  heading: L('Iestatījumi', 'Settings'),
  textSize: L('Teksta lielums', 'Text size'),
  sizes: { small: L('Mazs', 'Small'), normal: L('Vidējs', 'Medium'), large: L('Liels', 'Large') },
  textSpeed: L('Teksta ātrums', 'Text speed'),
  speeds: {
    slow: L('Lēni', 'Slow'),
    normal: L('Vidēji', 'Normal'),
    fast: L('Ātri', 'Fast'),
    instant: L('Uzreiz', 'Instant'),
  },
  volume: L('Skaļums', 'Volume'),
  /** Shown in the chosen size and at the chosen speed, so the choice can be judged. */
  sample: L(
    '«Rudzi laukā stāv nopļaujami, un ciemā neviena jaunāka par mani nav palicis.»',
    '“The rye is standing out there waiting to be cut, and there is nobody younger than me left to do it.”',
  ),
  sizeNote: L('Jaunais izmērs — no nākamās vietas, kur ieej.', 'The new size applies from the next place you go.'),
  close: L('Pieskaries ārpusē, lai aizvērtu', 'Touch outside to close'),
};

/**
 * The map: the valley as the village knows it, and the reason for every place
 * it cannot get to. Drawn from `core/atlas.ts`.
 *
 * The notes matter more than the names. A place the player cannot reach yet is
 * only interesting if the map says what is in the way — a bridge that is not
 * there, a road the stream took — because that turns a locked door into the
 * next thing to do.
 */
export const mapUi = {
  heading: L('Kas zināms', 'What is known'),
  north: L('Z', 'N'),
  open: L('Karte', 'Map'),
  close: L('Pieskaries, lai aizvērtu', 'Touch to close'),
  /** Said under the panel when a way that was shut has opened. */
  newWay: L('Kartē atvēries ceļš', 'A way has opened on the map'),

  village: L('Ciems', 'The village'),
  field: L('Rudzu lauks', 'The rye field'),
  bog: L('Purvs', 'The bog'),
  bogShut: L('Tukšām rokām neiet', 'Not to be walked empty-handed'),
  fieldDone: L('Nopļauts', 'Harvested'),
  bogDone: L('Šķērsots', 'Crossed'),
  bridge: L('Jaunais tilts', 'The new bridge'),
  beyond: L('Aiz purva', 'Beyond the bog'),
  beyondShut: L('Nav pārejas', 'No crossing'),
  beyondOpen: L('Tur neviens nav gājis', 'Nobody has walked there'),
  mill: L('Mūra dzirnavas', 'The stone mill'),
  millShut: L('Ceļu aiznesa strauts', 'The stream took the road'),

  /** Said along the foot of the sheet when a place is touched. */
  hint: L('Pieskaries vietai kartē.', 'Touch a place on the map.'),
  go: L('Pieskaries vēlreiz, lai ietu.', 'Touch again to go.'),
  lines: {
    village: L('Mājas. Te tu esi.', 'Home. This is where you are.'),
    field: L(
      'Rudzu lauks. Vectēvs to pļāva, un viņa tēvs pirms viņa.',
      'The rye field. Your grandfather cut it, and his father before him.',
    ),
    bog: L(
      'Purvā naktīs deg ugunis. Vecie teica — neej tām pakaļ.',
      'Lights burn on the bog at night. The old people said: do not follow them.',
    ),
    beyondShut: L(
      'Kamēr tilts stāvēja, pa šo ceļu brauca uz tirgu. Tagad pa to neiet neviens.',
      'While the bridge stood, this was the road to market. Now nobody takes it.',
    ),
    beyondOpen: L(
      'Aiz tilta sākas zeme, kurā neviens nav gājis. Tur arī kaut kas ir.',
      'Beyond the bridge lies land nobody has walked. There is something out there too.',
    ),
    mill: L(
      'Dzirnavnieku neviens nav redzējis kopš pavasara. Saka, ka strauts viņu paņēma līdzi ceļam.',
      'Nobody has seen the miller since spring. They say the stream took him along with the road.',
    ),
  },
};

/**
 * The opening. Three short lines: what is owed, who stopped leaving it, and
 * what that has cost. The rest is out in the field.
 */
export const intro = {
  lines: [
    L(
      'Vecie ļaudis to nesauca par nodevu. Laukam pienākas savs, purvam savs — un to atstāj. Ne tāpēc, ka kāds liek.',
      'The old people never called it a tax. The field has its own coming to it, and the bog has its own — and you leave it. Not because anyone makes you.',
    ),
    L(
      'Vectēvs atstāja. Tēvs — pusi no tā. Tu ne reizi neesi par to domājis.',
      'Your grandfather left it. Your father left half of it. You have never once thought about it.',
    ),
    L(
      'Šogad rudzi plāni, tilta nav, un ciems ir sācis uz tevi skatīties.',
      'This year the rye is thin, the bridge is gone, and the village has begun to look at you.',
    ),
  ],
};

export const village = {
  /**
   * The two things the village has more or less of, shown in the corner.
   */
  /** The one standing number the village keeps: what there is to eat. */
  measures: {
    grain: L('Maize', 'Bread'),
  },
  stone: {
    label: L('Akmens', 'The stone'),
    lines: [
      L(
        'Pelēks akmens ciema vidū, vecāks par visām mājām ap to. Neviens vairs neatceras, kas tajā iekalts.',
        'A grey stone in the middle of the village, older than every house around it. Nobody remembers any more what was cut into it.',
      ),
      // Šmits 19325: the house spirit may dwell «pašu laukā kādā akmenī»;
      // 19340: the first bite of baked bread is his.
      L(
        'Vecie saka, ka tajā mīt mājas kungs, un pirmais kumoss no jaunās maizes pienākas viņam. Katru gadu. Nedomājot.',
        'The old people say the house spirit lives in it, and the first bite of the new bread is his. Every year. Without thinking.',
      ),
    ],
    // NEW — after the crumb.
    crumbThere: L(
      'Akmens pakājē guļ tava drupača. Putni to vēl nav aizkampuši.',
      'At the foot of the stone lies your crumb. The birds have not had it yet.',
    ),
  },
  /** NEW — the first bite, which the stone text has always described and nobody could do. */
  crumb: {
    give: [
      L(
        'Tu atlauz no klaipa pirmo kumosu un noliec to akmens pakājē — mājas kungam. Kā visi. Nedomājot.',
        'You break the first bite off the loaf and set it at the foot of the stone — for the house spirit. Like everyone. Without thinking.',
      ),
      L('Tikai šoreiz tu padomāji.', 'Only this time you did think.'),
    ],
    already: L('Pirmais kumoss jau ir akmenim.', 'The stone already has the first crumb.'),
  },
  granarySlot: {
    label: L('Pamati', 'The foundation'),
    empty: L(
      'Klēts pamati. Akmeņi salikti, sūnas starp tiem. Klēts te nav stāvējusi tavā mūžā.',
      'A granary foundation. The stones are laid, moss between them. No granary has stood here in your lifetime.',
    ),
    poor: L(
      'Uz veciem pamatiem uzmesta lāpīta būda. Graudi tajā ir. Daudz vietas paliek tukšas.',
      'A patched shed thrown up on the old foundation. There is grain in it. A great deal of the space stays empty.',
    ),
    good: L(
      'Klēts stāv uz saviem pamatiem, durvis platas, jumts jauns. Iekšā smaržo pēc rudziem un putekļiem.',
      'The granary stands on its own foundation, wide-doored, new-roofed. Inside it smells of rye and dust.',
    ),
    // NEW
    take: L(
      'Klēts stāv uz saviem pamatiem. Pie sijas karājas divvārpa, un zem tās neviens nestāv.',
      'The granary stands on its own foundation. The double ear hangs from the beam, and nobody stands under it.',
    ),
  },
  bridgeSlot: {
    label: L('Pāreja', 'The crossing'),
    empty: L(
      'Strauts un tiltiņa atliekas. Divi baļķi, pārējais aizpeldējis. Tālāk par to neviens neiet.',
      'The stream, and what is left of a bridge. Two beams; the rest floated away. Nobody goes further than this.',
    ),
    poor: L(
      'Divi baļķi un pāris dēļu pāri. Var tikt pāri, ja iet uzmanīgi un vienatnē.',
      'Two logs and a few planks across them. You can get over, carefully, one at a time.',
    ),
    good: L(
      'Akmens un ozola tilts. Pa to var vest ratus. Aiz tā sākas zeme, ko ciems vēl nav aiztaustījis.',
      'A bridge of stone and oak. A cart could go over it. Beyond it lies land the village has not yet put a hand on.',
    ),
  },
  pathField: {
    label: L('Ceļš uz lauku', 'The path to the field'),
    ready: L(
      'Ceļš uz rudzu lauku. Rudzi stāv gatavi jau trešo dienu, un neviens tos nav aizticis.',
      'The path to the rye field. The rye has stood ready three days now, and nobody has touched it.',
    ),
    // NEW — the field can be walked back out to now.
    done: L('Ceļš uz nopļauto lauku.', 'The path to the cut field.'),
  },
  pathBog: {
    label: L('Ceļš uz purvu', 'The path to the bog'),
    locked: L(
      'Ceļš uz purvu. Uz turieni tukšām rokām neiet — un tavas rokas ir tukšas.',
      'The path to the bog. You do not go that way empty-handed — and your hands are empty.',
    ),
    ready: L(
      'Ceļš uz purvu. Tev kulē ir rudzu maize, un pār purvu nav pārejas.',
      'The path to the bog. There is rye bread in your bag, and there is no crossing over the bog.',
    ),
    done: L(
      'Purva ceļš. Tur vairs nav nekā, kas tevi gaidītu.',
      'The bog road. There is nothing waiting out there for you any more.',
    ),
    // NEW
    gone: L(
      'Purva ceļš. Uz ciņa vairs neviens nesēž — ne šogad, ne citreiz.',
      'The bog road. Nobody sits on the hummock any more — not this year, not ever.',
    ),
  },
  /** NEW — the cat's doorstep, once the cat is not on it. */
  doorstep: {
    label: L('Slieksnis', 'The doorstep'),
    empty: L('Tukšs slieksnis. Kaķis te vairs nesēž.', 'An empty doorstep. The cat does not sit here any more.'),
    asleep: L(
      'Kaķis guļ uz sliekšņa, saritinājies. Pa miegam tas parausta ausi.',
      'The cat is asleep on the doorstep, curled up. In its sleep it twitches an ear.',
    ),
  },
  /**
   * NEW — something from the bag used on something in the village. Each
   * pairing that a player is likely to try gets its own answer; the genre
   * lives on these.
   */
  replies: {
    sickleOnAnna: L('«Ar to uz mani nevicini, puis.»', '“Do not wave that at me, lad.”'),
    catOnAnna: L(
      'Anna pakasa kaķim aiz auss. «Tas nav mans. Tas ir neviena.»',
      'Anna scratches the cat behind the ear. “It is not mine. It is nobody’s.”',
    ),
    breadOnAnna: L('«Tā ir tava. Es to cepu tev, ne sev.»', '“That one is yours. I baked it for you, not for me.”'),
    breadOnCat: L(
      'Kaķis apošņā klaipu un novēršas. Tas gaida ko labāku.',
      'The cat sniffs the loaf and turns away. It is holding out for something better.',
    ),
    sickleOnCat: L('Nē.', 'No.'),
    sickleOnStone: L(
      'Akmenī ar sirpi negriež. Tas cirsts sen, un ne ar sirpi.',
      'You do not cut stone with a sickle. It was carved long ago, and not with one.',
    ),
    catOnStone: L(
      'Kaķis nolec, apiet akmenim apkārt un ielec atpakaļ kulē.',
      'The cat jumps down, walks once round the stone, and hops back into the bag.',
    ),
    onFoundation: L(
      'Klēts vēl nav, kur ko likt.',
      'There is no granary yet to put anything in.',
    ),
    onGranary: L(
      'Klētī tas nav jānes. Tur tas nebūs vajadzīgs.',
      'That does not go in the granary. It will not be wanted there.',
    ),
    onStream: L('Strauts paņem visu, ko tam dod. To tu nedosi.', 'The stream takes whatever it is given. You will not give it that.'),
    onPath: L('Ceļš pats aizvedīs. Ej.', 'The path will take you itself. Go.'),
    // The Devil's hat, shown around the village.
    hatOnAnna: L(
      'Anna atkāpjas soli. «To tu man nerādi.» Tad, klusāk: «Bet glabā. Tādu dāvanu otrreiz nedod.»',
      'Anna steps back. “Don’t show me that.” Then, more quietly: “But keep it. That gift is not given twice.”',
    ),
    hatOnCat: L('Kaķis cepuri apošņā, nošņācas un aiziet.', 'The cat sniffs the hat, hisses, and walks off.'),
    hatOnStone: L(
      'Tu noliec cepuri pie akmens. Tā tur neguļ mierīgi — vējš to atgrūž atpakaļ pie tavām kājām.',
      'You set the hat by the stone. It will not lie there — the wind pushes it back to your feet.',
    ),
  },
  // A click on nothing in particular gets one of these, in rotation, rather
  // than silence — which in a click-the-picture game reads as broken.
  nothing: [
    L('Nekā.', 'Nothing.'),
    L('Ciema māja. Durvis aizvērtas.', 'A cottage. The door is shut.'),
    L('Zāle, dubļi, vistu pēdas.', 'Grass, mud, hen tracks.'),
    L('Te nav ko darīt.', 'Nothing to do here.'),
  ],
};

export const jumis = {
  arrive: [
    L(
      'Rudzi stāv līdz krūtīm un negaida vairs neko. Vecmāmiņa nebūtu ļāvusi sākt, kamēr lauks nav apskatīts.',
      'The rye stands chest-high and is done waiting. Your grandmother would not have let anyone start before the field was read.',
    ),
    L(
      // Sirpis, not izkapts: the tool in the bag is a sickle, not a scythe.
      'Tur, labajā malā, viens stiebrs nes divas vārpas. To tu redzi jau no vārtiem.',
      'There, over on the right, one stem carries two ears. You can see it from the gate.',
    ),
  ],
  /** Said once the day's work is done and the one thing left standing is the point. */
  standing: [
    L(
      'Lauks nopļauts. Divvārpa stāv savā saliņā, tur, kur tu to atstāji.',
      'The field is down. The double ear stands in its island, where you left it.',
    ),
  ],
  /** NEW — the sheaf count above the field, and the way to say the day is done. */
  sheaves: L('Kūļi', 'Sheaves'),
  enough: L('Pietiek', 'That will do'),
  enoughHint: L('Pietiks tad, kad tu teiksi, ka pietiek.', 'It is enough when you say it is.'),
  notEnough: L('Vēl pat puse nav nopļauta.', 'Not even half of it is cut yet.'),
  /** NEW — stopping with a third of the field still standing. */
  spareAsk: L(
    'Trešdaļa lauka vēl stāv. Ar to, kas nopļauts, ciems ziemu nepārlaidīs.',
    'A third of the field is still standing. What is cut will not see the village through the winter.',
  ),
  spareChoices: {
    more: L('Pļaut tālāk.', 'Keep cutting.'),
    stop: L('Atstāt tā. Lai laukam paliek.', 'Leave it. Let the field keep it.'),
  },
  titheWarn: L(
    'Tur ir divvārpa. Nocērt to, un tā ir prom.',
    'The double ear is there. Cut it and it is gone.',
  ),
  /** NEW — what the double ear asks of the hand, once the field is down. */
  // The tithe as Šmits 11992 has it: the ears tied in a knot.
  gesturePrompt: L(
    'Sasien vārpas mezglā — velc uz leju. Vai izrauj ar saknēm — velc uz augšu.',
    'Tie its ears in a knot — drag down. Or pull it up by the roots — drag up.',
  ),
  gestureTap: L(
    'Velc, nevis spied: uz leju — sasiet, uz augšu — izraut.',
    'Drag, do not tap: down to tie it, up to pull it.',
  ),
  gestureNoBlade: L('Nocirst to var tikai ar sirpi.', 'Only the sickle will cut it.'),
  hintStone: {
    label: L('Lauka akmens', 'The field stone'),
    // Rewritten for the pass: the field is now judged by how much is left, so
    // the rule has to say "a little island", not just "a share".
    text: L(
      'Robežakmens, apaudzis ķērpjiem. Vecmāmiņas vārdi nāk paši: nopļauj visu, tikai divvārpai atstāj mazu saliņu, kur tā stāv. Pēdējo neņem. Un pusi neatstāj — laukam pienākas saliņa, ne puse lauka.',
      'A boundary stone, grown over with lichen. Your grandmother’s words come by themselves: cut it all, only leave the double ear a little island to stand in. Never take the last of it. And do not leave half — the field is owed an island, not half of itself.',
    ),
  },
  question: L('Ko tu dari ar to?', 'What do you do with it?'),
  // The list is the fallback now; the double ear is bent or pulled by hand.
  choices: {
    leave: L(
      'Sasiet tās vārpas mezglā un atstāt laukam.',
      'Tie its ears in a knot and leave it to the field.',
    ),
    take: L(
      'Izraut to ar saknēm un nest mājās klētī.',
      'Pull it up by the roots and carry it home to the granary.',
    ),
  },
  outcomes: {
    all: [
      L(
        'Tu nopļauj visu. Lauks noguļas vienā pēcpusdienā, un divvārpa aiziet kūlī kopā ar pārējiem.',
        'You cut everything. The field goes flat in one afternoon, and the double ear goes into the sheaf with the rest.',
      ),
      L(
        'Nekas nenotiek. Tieši tā ir tā nelaime — nekas nenotiek.',
        'Nothing happens. That is exactly the trouble — nothing happens.',
      ),
    ],
    leave: [
      L(
        'Tu sasien divvārpu mezglā, kā to darīja vecie, un atstāj to laukam.',
        'You tie the double ear in a knot, the way the old people did, and leave it to the field.',
      ),
      L(
        'Pār saliņu uz mirkli pārskrien vējš, lai gan citur lauks stāv mierā.',
        'For a moment a wind runs over the little island, though the rest of the field is still.',
      ),
    ],
    // NEW — the other good. Carrying Jumis home to the granary is attested
    // (Šmits 11992, 11998). That he then eats from the granary is the game's
    // own reading, and the records say otherwise — see FOLKLORE.md, «Open».
    take: [
      L(
        'Tu izrauj divvārpu ar visām saknēm. Zeme nāk līdzi, smaga un melna.',
        'You pull the double ear up, roots and all. The earth comes with it, heavy and black.',
      ),
      L(
        'Mājās tu to iekārsi klētī pie sijas, kā darīja vecie. Tad Jumis dzīvos klētī — un ēdīs no klēts, ne no lauka.',
        'At home you will hang it from the granary beam, the way the old people did. Then Jumis will live in the granary — and take his share from the granary, not from the field.',
      ),
    ],
    // NEW — the opposite mistake.
    spare: [
      L(
        'Tu noliec sirpi. Trešdaļa lauka paliek stāvam, un divvārpa kaut kur tās vidū.',
        'You put the sickle away. A third of the field is left standing, with the double ear somewhere in the middle of it.',
      ),
      L(
        'Laukam tas patīk. Ciemam — mazāk.',
        'The field likes that. The village, less so.',
      ),
    ],
  },
  /** NEW — the cart, said as it leaves the field. What it is worth is Anna's to say. */
  cart: {
    leave: L('Tu pārved mājās vezumu.', 'You bring the cart home.'),
    take: L('Tu pārved mājās vezumu, un Jumis brauc virsū.', 'You bring the cart home, with Jumis riding on top.'),
    all: L(
      'Tu pārved mājās lielāko vezumu, kādu ciems pēdējos gados redzējis. Tas ir savādi viegls.',
      'You bring home the biggest cart the village has seen in years. It is strangely light.',
    ),
    spare: L('Tu pārved mājās pusvezumu.', 'You bring half a cart home.'),
  },
  // A click on nothing in particular gets one of these, in rotation.
  nothing: [
    L('Tikai rudzi.', 'Only rye.'),
    L('Viena vārpa, un vēl viena. Katra uz sava stiebra.', 'One ear, and another. Each on its own stem.'),
    L('Rudzi šalc. Nekā.', 'The rye rustles. Nothing.'),
  ],
  /** NEW — something from the bag that is not the sickle. */
  replies: {
    cat: L('Kaķis nav pļāvējs.', 'The cat is not a reaper.'),
    bread: L('Maizi laukā atpakaļ nenes — lauks to jau zina.', 'You do not bring bread back to the field. The field knows it already.'),
  },
  /** NEW — walking back out to the field once it is cut. */
  after: {
    arrive: L(
      'Nopļautais lauks. Vējš norimis, un pa rugājiem staigā putni.',
      'The cut field. The wind has dropped, and birds are walking in the stubble.',
    ),
    exit: L('Atpakaļ uz ciemu', 'Back to the village'),
    earLabel: L('Divvārpa', 'The double ear'),
    holeLabel: L('Bedrīte', 'The hole'),
    patchLabel: L('Nenopļautais', 'The uncut rye'),
    bound: L(
      'Divvārpa guļ, vārpas sasietas mezglā. Kāds — ne tu — tai blakus nolicis graudu.',
      'The double ear lies with its ears tied in a knot. Someone — not you — has left a grain beside it.',
    ),
    hole: L(
      'Tur, kur stāvēja divvārpa, ir tukša bedrīte. Zeme vēl irdena.',
      'Where the double ear stood there is an empty little hole. The earth is still loose.',
    ),
    cut: L(
      'Rugāji. Neviena stiebra, kas atšķirtos no citiem.',
      'Stubble. Not one stem that stands out from the rest.',
    ),
    spare: L(
      'Nenopļautais šalc viens pats. Divvārpa kaut kur tā vidū.',
      'The uncut rye rustles on its own. The double ear is somewhere in the middle of it.',
    ),
  },
};

// Lines shared by a clean bargain and the same bargain after a fumbled riddle.
// The trick works either way; only the bridge he leaves behind differs.
const catCrosses = L(
  'Tu palaid ciema kaķi. Tas aiziet pa jaunajiem dēļiem, nesteidzoties, un viņam pat nepaskatās virsū.',
  'You let the village cat go. It walks off along the new planks, unhurried, and does not so much as look at him.',
);
const breadThrown = L(
  'Tu pārlauz klaipu un aizsvied pusi pāri. Tā nokrīt otrā krastā, un viņš uzlec kājās. „Maize nav dzīva!“',
  'You break the loaf and throw half across. It lands on the far bank, and he leaps up. “Bread is not living!”',
);
const breadArgued = L(
  '„Tā ir cepta no rudziem, ko lauks man deva pats,“ tu saki. „Tajā ir viss lauks. Ja tas nav dzīvs, tad tu esi būvējis par velti.“',
  '“It is baked from rye the field gave me itself,” you say. “The whole field is in it. If that is not living, then you have built for nothing.”',
);

export const velns = {
  /** Under his portrait. */
  name: L('Velns', 'The Devil'),
  arrive: [
    L(
      'Laipa pār purvu beidzas pusceļā. Tur tā beidzas jau tik ilgi, cik vien kāds atceras.',
      'The causeway across the bog stops halfway. It has stopped halfway for as long as anyone remembers.',
    ),
    L(
      'Uz ciņa otrā pusē kāds sēž. Viņš tevi ir gaidījis.',
      'Someone is sitting on a hummock on the far side. He has been waiting for you.',
    ),
  ],
  // Two lines now, not three: the offer and the riddle.
  greet: [
    L(
      '„Labvakar, labvakar! Cilvēks uz maniem dēļiem. Tu gribi pāri — visi grib pāri. Es uzbūvēšu, akmenī un kokā, pirms gaiļi dzied. Un lēti.“',
      '“Good evening, good evening! A man on my planks. You want across — everybody wants across. I will build it, in stone and timber, before the cocks crow. And cheap.”',
    ),
    L(
      '„Bet vispirms — mīkla. Man garlaicīgi.“',
      '“But first — a riddle. I am bored.”',
    ),
  ],
  // NEW — he has noticed what is in the bag. Foreshadowing, and nothing more.
  catNoticed: L(
    '„Un kas tev tur kulē ņaud?“ Viņš pavelk nāsis. „Nu, labi. Vēlāk.“',
    '“And what is that mewing in your bag?” He sniffs. “Never mind. Later.”',
  ),
  /**
   * Getting out to him. The causeway is half rotten; three planks hold and
   * two hummocks do not.
   */
  wade: {
    // NEW wording — the lights are part of the puzzle now.
    prompt: L(
      'Ej pa laipu. Ne katrs dēlis tur, un ne katra uguns rāda ceļu.',
      'Walk out along the planks. Not every one will hold, and not every light shows the way.',
    ),
    plank: L('Dēlis', 'A plank'),
    hummock: L('Cinis', 'A hummock'),
    step: [
      L('Dēlis notur. Zem tā kaut kas mierīgi aizslīd.', 'The plank holds. Something slides away underneath it, unhurried.'),
      L('Ūdens ir melns un nekustīgs kā darva.', 'The water is black and as still as tar.'),
      L('Vēl viens. Tālāk laipa beidzas.', 'One more. After that the causeway stops.'),
    ],
    // NEW — a wrong step sends you back to the bank.
    rotten: L(
      'Tas neturēs. Tu iegrimsti līdz ceļiem un izrāpies atpakaļ krastā.',
      'That will not hold. You sink to the knees and crawl back to the bank.',
    ),
    lured: L(
      'Uguntiņa aizveda tevi sūnās. Tu iegrimsti līdz ceļiem un izrāpies atpakaļ krastā.',
      'The little light led you into the moss. You sink to the knees and crawl back to the bank.',
    ),
    tooFar: L(
      'Tik tālu nepārlēksi. Tu paslīdi un izrāpies atpakaļ krastā.',
      'You cannot jump that far. You slip and crawl back to the bank.',
    ),
    catAhead: L(
      'Kaķis izlec no kules un aiziet pa laipu tev pa priekšu.',
      'The cat jumps out of your bag and goes ahead of you along the planks.',
    ),
    catBack: L(
      'Ieraudzījis, kas sēž uz ciņa, kaķis ielec atpakaļ kulē.',
      'Seeing who sits on the hummock, the cat hops back into your bag.',
    ),
  },
  // Quoted: «Bez kājām, bez rokām, bet durvis attaisa. (vējš)» — Kalniņa 2015.
  riddle: L(
    '„Bez kājām, bez rokām, bet durvis attaisa. Kas tas ir?“',
    '“Without feet, without hands, and yet it opens doors. What is it?”',
  ),
  riddleChoices: {
    wind: L('Vējš.', 'The wind.'),
    thief: L('Zaglis.', 'A thief.'),
    bear: L('Lācis.', 'A bear.'),
  },
  riddleRight: L(
    '„Vējš,“ viņš saka un saviebjas. „Vējš, protams. Tu esi klausījies vecos ļaudīs.“',
    '“The wind,” he says, and pulls a face. “The wind, of course. You have been listening to old people.”',
  ),
  /** NEW — after a right answer, the player may give one back. */
  askBack: {
    lead: L('„Nu? Par tiltu?“', '“Well? The bridge?”'),
    ask: L('„Pagaidi. Tagad es tev vienu.“', '“Wait. Now one from me.”'),
    skip: L('„Par tiltu.“', '“The bridge.”'),
    // Quoted: the cock, from «Latviešu bērnu folklora». The Devil will not
    // name what drives him off (Šmits 32406).
    riddle: L(
      '„Vīrs niķu, niķiem, svārki stiķu, stiķiem, kaula deguns, gaļas bārda. Kas tas ir?“',
      '“A man all airs and graces, a coat all stitch on stitch, a nose of bone and a beard of flesh. What is it?”',
    ),
    stumped: L(
      '„Tas ir… tas…“ Viņš saviebjas un nesaka. „To vārdu es nesaukšu. Labi, tu esi viltīgs. Strādāšu ātri, lai tev neatliek laika vēl ko izdomāt.“',
      '“That is… that…” He grimaces and does not say it. “That word I will not say. All right, you are sly. I will work fast, so you have no time to think up anything else.”',
    ),
  },
  /** NEW — a wrong first answer is not the end of it: he wants to keep playing. */
  riddleWrong: L(
    'Viņš smejas tā, ka no ciņa nokrīt sūnas. „Nē! Vējš, muļķi, vējš! Labi, vēl vienu — man vienalga garlaicīgi.“',
    'He laughs so hard the moss falls off the hummock. “No! The wind, fool, the wind! All right, one more — I am bored anyway.”',
  ),
  // Quoted: the Devil's own riddle, and its answer, in Šmits LPT X, «Velna
  // uzdotās mīklas» 2 — «Kas ir saldāks par medu?» «Miegs.»
  riddle2: L('„Kas ir saldāks par medu?“', '“What is sweeter than honey?”'),
  riddle2Choices: {
    beer: L('Alus.', 'Beer.'),
    sleep: L('Miegs.', 'Sleep.'),
    berries: L('Ogas.', 'Berries.'),
  },
  riddle2Right: L(
    '„Miegs,“ viņš nopūšas. „Tātad tomēr esi dzirdējis vecos ļaudis. Labi. Tad par tiltu.“',
    '“Sleep,” he sighs. “So you have listened to the old people after all. Very well. The bridge, then.”',
  ),
  riddle2Wrong: L(
    '„Miegs, miegs! Nu, tad tilts būs tik labs, cik labas bija tavas atbildes.“',
    '“Sleep, sleep! Then the bridge will be as good as your answers were.”',
  ),
  terms: [
    L(
      '„Cena vienkārša,“ viņš saka. „Pirmais, kas pāri iet, ir mans. Pirmais dzīvais. Un nu — pie darba.“',
      '“The price is simple,” he says. “The first to cross is mine. The first living thing. And now — to work.”',
    ),
  ],
  /** NEW — the night, while he builds. */
  /** A Devil answered as an equal and paid in full leaves something behind. */
  hat: L(
    'Prom ejot, viņš noņem cepuri un noliek to uz laipas. „Tam, kas man atbildēja kā līdzīgs.“',
    'As he goes, he takes off his hat and leaves it on the planks. “For the one who answered me as an equal.”',
  ),
  night: {
    prompt: L(
      'Viņš būvē. Līdz gaiļiem viņam jādabū savs — dod to no kules.',
      'He is building. Before the cocks crow he must have what is his — give it from your bag.',
    ),
    built: L('Tilts gatavs. Viņš sēž un gaida.', 'The bridge is finished. He sits and waits.'),
    greying: L('Austrumos debess kļūst pelēka.', 'In the east the sky is turning grey.'),
    bridgeLabel: L('Jaunais tilts', 'The new bridge'),
    stepAsk: L('Iet pāri pašam?', 'Walk across yourself?'),
    stepYes: L('Iet.', 'Go.'),
    stepNo: L('Vēl ne.', 'Not yet.'),
  },
  question: L('Kā tu to izkārto?', 'How do you settle it?'),
  choices: {
    self: L(
      'Piekrist un iet pāri pašam.',
      'Agree, and walk across first yourself.',
    ),
    cat: L(
      'Piekrist un palaist pa priekšu ciema kaķi.',
      'Agree, and send the village cat over ahead of you.',
    ),
    bread: L(
      'Piekrist un aizsviest pāri rudzu klaipu — lai maize iet pirmā.',
      'Agree, and throw the rye loaf across — let the bread go first.',
    ),
  },
  outcomes: {
    self: [
      L(
        'Tu sper soli uz jaunajiem dēļiem, un viņš pieceļas tik ātri, ka tu atkāpies atpakaļ.',
        'You put a foot on the new planks, and he stands up so fast that you step back.',
      ),
      L(
        'Viņš smejas visu nakti. Rītā pār purvu ir divi baļķi un pāris dēļu — tik daudz, cik viņš uzbūvēja, pirms tu apjēdzi, ko esi solījis.',
        'He laughs all night. In the morning there are two logs and a few planks over the bog — as much as he built before you understood what you had promised.',
      ),
    ],
    cat: [
      catCrosses,
      L(
        '„Kaķis,“ viņš saka. „Kaķis.“ Viņš ilgi skatās tam pakaļ. Tad ceļas, iet kaķim līdzi, un tilts paliek — akmens un ozols, tieši tāds, kāds bija solīts.',
        '“A cat,” he says. “A cat.” He looks after it for a long time. Then he gets up and follows it, and the bridge stays — stone and oak, exactly as promised.',
      ),
    ],
    catFumbled: [
      catCrosses,
      L(
        '„Kaķis,“ viņš saka. „Kaķis.“ Viņš ilgi skatās tam pakaļ. Tad ceļas un iet kaķim līdzi. Rītā pār ūdeni guļ divi baļķi un pāris dēļu.',
        '“A cat,” he says. “A cat.” He looks after it for a long time. Then he gets up and follows it. In the morning two logs and a few planks lie over the water.',
      ),
    ],
    breadGood: [
      breadThrown,
      breadArgued,
      L(
        'Viņš atver muti. Aizver. Purvā kaut kur iebrēcas gailis — par agru, un tomēr. Tilts stāv gatavs, un viņa vairs nav.',
        'He opens his mouth. Closes it. Somewhere out in the bog a cock crows — too early, and yet. The bridge stands finished, and he is gone.',
      ),
    ],
    breadGoodFumbled: [
      breadThrown,
      breadArgued,
      L(
        'Viņš atver muti. Aizver. Purvā kaut kur iebrēcas gailis — par agru, un tomēr. Viņa vairs nav, un pār ūdeni guļ divi baļķi un pāris dēļu.',
        'He opens his mouth. Closes it. Somewhere out in the bog a cock crows — too early, and yet. He is gone, and two logs and a few planks lie over the water.',
      ),
    ],
    // NEW — a loaf with Jumis in it. No argument needed.
    breadJumis: [
      breadThrown,
      L(
        'Viņš paceļ maizi, paošņā un apsēžas atpakaļ. „Tajā ir Jumis,“ viņš čukst.',
        'He picks up the bread, sniffs it and sits back down. “There is Jumis in it,” he whispers.',
      ),
      L(
        'Viņš paklanās maizei — ne tev — un aiziet purvā. Kaut kur iebrēcas gailis, par agru. Tilts stāv gatavs, un šoreiz viņš neatgriezīsies.',
        'He bows to the bread — not to you — and walks off into the bog. Somewhere a cock crows, too early. The bridge stands finished, and this time he will not come back.',
      ),
    ],
    breadPoor: [
      L(
        'Tu pārlauz klaipu un aizsvied pusi pāri. Tas nokrīt smagi, kā akmens.',
        'You break the loaf and throw half across. It lands heavily, like a stone.',
      ),
      L(
        'Viņš to paceļ, pasver rokā un iesmejas. „Tas ir plāns gads, cilvēk. Tur iekšā nav nekā. Tā ir viltota nauda.“',
        'He picks it up, weighs it in his hand and laughs. “That is a thin year, man. There is nothing inside it. That is counterfeit coin.”',
      ),
      L(
        'Viņš tomēr uzbūvē — divus baļķus un dēļus. Tik daudz, cik tava maize bija vērta.',
        'He builds it anyway — two logs and some planks. As much as your bread was worth.',
      ),
    ],
    // NEW — the cocks crow with nothing paid.
    dawn: [
      L(
        'Austrumos debess kļūst gaiša. Kaut kur aiz purva iedziedas gailis.',
        'In the east the sky goes pale. Somewhere past the bog a cock crows.',
      ),
      L(
        '„Gaiļi,“ viņš saka un parausta plecus. „Nu, tad nekā.“ Viņš ieiet purvā, un neapmaksātie dēļi lēnām grimst.',
        '“Cocks,” he says, and shrugs. “Well, that is that.” He walks off into the bog, and the planks nobody paid for slowly sink.',
      ),
      L(
        'Rītā pār ūdeni guļ divi baļķi un pāris dēļu. Kulē tev viss, ar ko atnāci.',
        'In the morning two logs and a few planks lie over the water. Everything you came with is still in your bag.',
      ),
    ],
  },
  // A click on nothing in particular gets one of these, in rotation.
  nothing: [
    L('Melns ūdens.', 'Black water.'),
    L('Sūnas un ūdens. Tuvāk neej.', 'Moss and water. Do not go closer.'),
    L('Kaut kur kaut kas iešļakstās. Nekā nav redzams.', 'Something splashes somewhere. There is nothing to see.'),
  ],
  /** NEW */
  replies: {
    sickle: L('Ar sirpi te neko neizlīgsi.', 'You will not settle anything here with a sickle.'),
  },
};

export const outro = {
  both: [
    L(
      'Klēts stāv pilna, un pār purvu ved tilts, kas turēs ratus.',
      'The granary stands full, and a bridge crosses the bog that will hold a cart.',
    ),
    L(
      'Ciems vēl neprot to pateikt, bet visi to redz: neviens šogad netika apkrāpts. Ne ar darbu. Ar to, ka kāds beidzot atcerējās, ko atstāt.',
      'The village has no words for it yet, but everyone can see it: nobody was short-changed this year. Not with labour. With somebody finally remembering what to leave behind.',
    ),
    L(
      'Aiz jaunā tilta sākas zeme, kurā neviens nav gājis. Tur arī kaut kas ir. Tur vienmēr kaut kas ir.',
      'Beyond the new bridge lies land nobody has walked. There is something out there too. There always is.',
    ),
  ],
  half: [
    L(
      'Vienu tu izdarīji pareizi. Otru — kā pratis.',
      'One of them you got right. The other you got through.',
    ),
    L(
      'Ciems dzīvos. Ne bagāti, bet dzīvos, un nākamgad kāds atcerēsies šo gadu un darīs labāk.',
      'The village will live. Not richly, but it will live, and next year somebody will remember this year and do better.',
    ),
    L(
      'Vecās varas nesoda. Tās tikai atceras, cik tu iedevi.',
      'The old powers do not punish. They only remember how much you gave.',
    ),
  ],
  neither: [
    L(
      'Tev ir būda un divi baļķi pār purvu, un ir ziema priekšā.',
      'You have a shed and two logs over the bog, and a winter ahead.',
    ),
    L(
      'Neviens tevi nenolādēja. Neviens nedusmojās. Tas ir pats ļaunākais — tu prasīji visu un tev iedeva tieši tik daudz, cik tu atstāji.',
      'Nobody cursed you. Nobody was angry. That is the worst of it — you asked for everything and were given exactly as much as you left behind.',
    ),
    L(
      'Nākamgad rudzi atkal stāvēs gatavi. Lauks gaida ilgi.',
      'Next year the rye will stand ready again. A field waits a long time.',
    ),
  ],
};

/**
 * The reckoning: what the player is told after each encounter.
 *
 *   verdict — did the spirit accept it, yes or no
 *   gain    — what you are actually walking home with
 *   cost    — NEW, only on a good outcome that had a price: what it cost
 *   missed  — only on a diminished outcome: what you should have done, and
 *             what it would have got you
 */
export const reckoning = {
  title: L('Kā palika', 'How it was left'),
  jumis: {
    leave: {
      verdict: L('Jumis ir mierā.', 'Jumis is satisfied.'),
      gain: L('Klēts: pilna. Lauks: atstāts, kā pieklājas.', 'Granary: full. The field: left as it should be.'),
    },
    take: {
      verdict: L('Jumis brauc uz klēti.', 'Jumis rides home to the granary.'),
      gain: L('Klēts: stāv, un Jumis tajā. Maize: Jumja klaips.', 'Granary: standing, with Jumis in it. Bread: a Jumis loaf.'),
      cost: L('Cena: Jumis tagad ēdīs no klēts.', 'The price: Jumis will eat from the granary now.'),
    },
    all: {
      verdict: L('Jumis nav mierā.', 'Jumis is not satisfied.'),
      gain: L('Klēts: lāpīta būda. Maize: viens smags klaips.', 'Granary: a patched shed. Bread: one heavy loaf.'),
      missed: L(
        'Divvārpu nenocērt. Pļauj apkārt un atstāj to stāvam mazā saliņā — tad klēts būtu pilna.',
        'Never cut the double ear. Cut around it and leave it standing in a little island — then the granary would have been full.',
      ),
    },
    spare: {
      verdict: L('Jumis ir mierā. Ciems — ne.', 'Jumis is content. The village is not.'),
      gain: L('Klēts: lāpīta būda. Maize: laba, bet maz.', 'Granary: a patched shed. Bread: good, but little of it.'),
      missed: L(
        'Laukam pienākas saliņa, ne trešdaļa lauka. Nopļauj visu, tikai divvārpai atstāj, kur stāvēt.',
        'The field is owed an island, not a third of itself. Cut it all, and leave the double ear somewhere to stand.',
      ),
    },
  },
  velns: {
    good: {
      verdict: L('Velns dabūja, ko gribēja.', 'The Devil got what he wanted.'),
      gain: L(
        'Pāreja: akmens un ozola tilts. Aiz tā — jauna zeme.',
        'Crossing: a bridge of stone and oak. Beyond it, new ground.',
      ),
    },
    // NEW
    gone: {
      verdict: L('Velns aizgāja no purva.', 'The Devil has left the bog.'),
      gain: L(
        'Pāreja: akmens un ozola tilts. Uz ciņa vairs neviens nesēž.',
        'Crossing: a bridge of stone and oak. Nobody sits on the hummock any more.',
      ),
    },
    // NEW
    catCost: L('Cena: ciema kaķis.', 'The price: the village cat.'),
    catKept: L('Kaķis — tev kulē.', 'The cat — still in your bag.'),
    hatKept: L('Velna cepure — tev kulē.', 'The Devil’s hat — in your bag.'),
    poor: {
      verdict: L('Velns guva virsroku.', 'The Devil came out ahead.'),
      gain: L(
        'Pāreja: divi baļķi un daži dēļi.',
        'Crossing: two logs and a few planks.',
      ),
      // Every reason that applies is shown, in the order it happened, then one
      // closing line.
      missedRiddle: L(
        'Pareiza atbilde — kaut viena no divām — un viņš būtu runājis ar tevi kā ar līdzīgu.',
        'One right answer — either of the two — and he would have dealt with you as an equal.',
      ),
      // Reworded so it no longer names the cat: the reckoning may teach, but
      // the bargain is still the player's to work out.
      missedSelf: L(
        'Nekad neej pāri pirmais. Pirmajam jābūt kaut kam dzīvam, kas nav tu — vai kaut kam, kas reiz bija dzīvs.',
        'Never cross first yourself. The first across must be something living that is not you — or something that once was.',
      ),
      missedBread: L(
        'Maize bija plāna, jo lauks tika nopļauts līdz pēdējam. Ja laukam būtu atstāts savs, tas arguments būtu turējis.',
        'The bread was thin because the field was cut to the last stem. Had the field been left its own, that argument would have held.',
      ),
      missedDawn: L(
        'Tu vilcinājies līdz gaiļiem. Tilts, par kuru nav samaksāts, rītu nesagaida.',
        'You waited for the cocks. A bridge nobody paid for does not last till morning.',
      ),
      thenWhole: L('Izlabo to, un tilts būs vesels.', 'Put that right and the bridge comes out whole.'),
      thenWholeBoth: L('Izlabo abus, un tilts būs vesels.', 'Put both right and the bridge comes out whole.'),
    },
  },
};

/** The closing tally — the player's whole record, said plainly. */
export const tally = {
  heading: L('Vecās varas', 'The old powers'),
  both: L('Abas godā pavadītas.', 'Both were seen off with honour.'),
  half: L('Viena godā. Otra ne.', 'One with honour. One not.'),
  neither: L('Neviena nav godā pavadīta.', 'Neither was seen off with honour.'),
  rowJumis: {
    leave: L('Jumis — palika mierā', 'Jumis — left content'),
    take: L('Jumis — klētī', 'Jumis — in the granary'),
    all: L('Jumis — paņemts viss', 'Jumis — everything taken'),
    spare: L('Jumis — atstāts par daudz', 'Jumis — too much left'),
  },
  rowVelns: {
    good: L('Velns — tilts vesels', 'The Devil — a whole bridge'),
    gone: L('Velns — aizgājis no purva', 'The Devil — gone from the bog'),
    poor: L('Velns — divi baļķi', 'The Devil — two logs'),
  },
  // NEW — the smaller facts under the two marks.
  bread: L('Maize ziemai: {}', 'Bread for the winter: {}'),
  catLost: L('Kaķis palika purvā.', 'The cat stayed at the bog.'),
  catHome: L('Kaķis guļ uz sliekšņa.', 'The cat is asleep on its doorstep.'),
  hat: L('Velna cepure karājas klētī pie sijas.', 'The Devil’s hat hangs from the granary beam.'),
  again: L('Otrā reizē var labāk.', 'It can be done better a second time.'),
  perfect: L('Labāk vairs nevar.', 'It cannot be done better than that.'),
  // NEW — what stood between this year and a perfect one, when both shares
  // are whole but something was still given up.
  shortBread: L('Klēts varēja būt pilnāka.', 'The granary could have been fuller.'),
  shortCat: L('Kaķa uz sliekšņa nav.', 'There is no cat on the doorstep.'),
};

/** Said in the village the moment the player walks back in and sees the change. */
export const arrival = {
  granaryGood: L('Klēts stāv uz veciem pamatiem. Pilna.', 'The granary stands on the old foundation. Full.'),
  // NEW
  granaryTake: L(
    'Klēts stāv uz veciem pamatiem. Pie sijas karājas Jumis.',
    'The granary stands on the old foundation. Jumis hangs from the beam.',
  ),
  granaryPoor: L(
    'Uz pamatiem stāv būda. Vietu tā aizņem, un tas arī viss.',
    'A shed stands on the foundation. It holds the space, and that is all.',
  ),
  // NEW
  granarySpare: L(
    'Uz pamatiem stāv būda. Tas, kas tajā ir, ir labs — tikai tā ir maz.',
    'A shed stands on the foundation. What is in it is good — there is only little of it.',
  ),
  bridgeGood: L(
    'Pār strautu ved akmens tilts. Pa to var vest ratus.',
    'A stone bridge crosses the stream. A cart could go over it.',
  ),
  bridgePoor: L(
    'Pār strautu guļ divi baļķi. Pa vienam, uzmanīgi.',
    'Two logs lie across the stream. One at a time, carefully.',
  ),
  // NEW
  catHome: L(
    'Kaķis izlec no kules, aiziet uz savu slieksni un tūlīt aizmieg.',
    'The cat jumps out of your bag, goes back to its doorstep and falls asleep at once.',
  ),
  evening: L(
    'Pār ciemu nāk vakars, un logos iedegas gaisma.',
    'Evening comes over the village, and lights come on in the windows.',
  ),
};

/**
 * Lines for the bag and the two things it makes concrete: you do not cut rye
 * with your hands, and you do not walk out to a bog with nothing to offer.
 */
export const items = {
  bag: {
    open: L('Kule', 'Your bag'),
    close: L('Aizvērt kuli', 'Close the bag'),
  },
  shed: {
    label: L('Nojume', 'The lean-to'),
    withSickle: L(
      'Zem nojumes karājas vectēva sirpis. Asmens plāns no daudzām pļaujām, bet ass.',
      'Your grandfather’s sickle hangs under the lean-to. The blade is thin from many harvests, but sharp.',
    ),
    taken: L('Tukšs āķis. Sirpis ir tavā kulē.', 'An empty hook. The sickle is in your bag.'),
    tookIt: L('Tu noņem sirpi no āķa un ieliec kulē.', 'You lift the sickle off its hook and put it in your bag.'),
  },
  cat: {
    label: L('Kaķis', 'The cat'),
    there: L(
      'Pelēks kaķis sēž uz sliekšņa un skatās uz tevi tā, it kā tu būtu aizkavējies.',
      'A grey cat sits on a doorstep, looking at you as though you were late.',
    ),
    tookIt: L(
      'Tu paņem kaķi. Tas neiebilst. Kaķi nekad neiebilst, kad tie paši tā grib.',
      'You pick the cat up. It does not object. Cats never object when it was their idea.',
    ),
    already: L('Kaķis jau nāk tev līdzi.', 'The cat is already coming with you.'),
  },
  needSickle: L(
    'Rudzus ar rokām nerauj. Bez sirpja laukā nav ko iet.',
    'You do not pull rye up by hand. There is no going to the field without a sickle.',
  ),
  // No longer says "and do not go alone": that was the bog's answer, given
  // away before the question.
  needOffering: L(
    'Uz purvu tukšām rokām neiet. Paņem maizi.',
    'You do not go to the bog empty-handed. Take the bread.',
  ),
  // Field: the harvest is an action, not a menu entry. The wording has to say
  // "sweep", not "tap".
  cutPrompt: L(
    'Ņem sirpi no kules un velc to pāri rudziem.',
    'Take the sickle from your bag and sweep it across the rye.',
  ),
  cutWrongTool: L('Ar to te nav ko darīt.', 'That is no use here.'),
  // Replies to an item used in the wrong place or at the wrong time.
  cutWrongPlace: L('Sirpis rudziem, ne debesīm.', 'The sickle is for the rye, not the sky.'),
  notYet: L('Vēl ne.', 'Not yet.'),
  // Said beside the bag when it is opened.
  teach: L(
    'Paņem lietu rokā, tad norādi, kur to likt.',
    'Take a thing in hand, then point at where it goes.',
  ),
  // Said every time something is taken in hand.
  inHand: L('{} rokā. Pieskaries tam, uz ko to lietot.', '{} in hand. Touch what to use it on.'),
  // The way back out of holding something, for a screen with no right button.
  putBack: L('Nolikt atpakaļ', 'Put it back'),
  /** The bag's own introduction, shown as a card the first time something goes into it. */
  intro: {
    title: L('Tava kule', 'Your bag'),
    body: L(
      'Viss, ko atrodi, nonāk šeit. Pieskaries kulei, lai to atvērtu, tad paņem lietu rokā un norādi, kur to likt.',
      'Everything you find goes in here. Touch the bag to open it, take a thing in hand, then point at where it goes.',
    ),
    ok: L('Sapratu', 'Got it'),
  },
  // The loaf says what kind of year it came from — the one fact the bread
  // argument at the bog turns on. Shown under its name in the bag.
  breadNote: {
    good: L(
      'Cepts no gada, kurā laukam netika paņemts viss. Smaržo pēc visa lauka.',
      'Baked from a year in which the field was not taken to the last stem. It smells of the whole field.',
    ),
    jumis: L(
      'Cepts no graudiem, kas gulēja blakus Jumim. Smags un silts, kā dzīvs.',
      'Baked from grain that lay beside Jumis. Heavy and warm, as if alive.',
    ),
    poor: L(
      'Cepts no plāna gada graudiem. Smags kā akmens, un iekšā maz.',
      'Baked from a thin year’s grain. Heavy as a stone, with little inside it.',
    ),
  },
};
