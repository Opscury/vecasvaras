/**
 * Every player-facing line in the game, in both languages.
 *
 * Scenes never contain literal text. If you want to rewrite the game's voice,
 * or hand the Latvian to a proofreader, this is the only file that matters.
 *
 * NOTE ON THE RIDDLE (velns.riddle): the wind riddle is a traditional
 * formula, but like the dainas it should be checked against a primary source
 * (valoda.ailab.lv or a printed mīklu krājums) before public release.
 */

import { L } from '../core/i18n';

export const ui = {
  langSwitch: L('EN', 'LV'),
  begin: L('Sākt', 'Begin'),
  resume: L('Turpināt', 'Continue'),
  restart: L('Sākt no jauna', 'Start over'),
  subtitle: L('Latviešu folkloras spēle', 'A game of Latvian folklore'),
  clickAnywhere: L('Meklē. Aplūko lauku.', 'Search. Look the field over.'),
  /** The button that moves the narration on. */
  next: L('Tālāk', 'Next'),
  // Heading of the page that shows everything said so far (⟲ / H).
  history: L('Teiktais', 'Said so far'),
  loadFailed: L('Neizdevās ielādēt zīmējumus.', 'Some of the pictures did not load.'),
  retry: L('Mēģināt vēlreiz', 'Try again'),
  examine: L('Aplūkot', 'Look'),
};

export const intro = {
  lines: [
    L(
      'Vecie ļaudis to sauca vienā vārdā: parāds.',
      'The old people had one word for it: a debt.',
    ),
    L(
      'Ne naudā. Kaut kas vecāks — saprašana, ka nekas laukā vai purvā nav vienkārši tavs, ko ņemt.',
      'Not money. Something older — the understanding that nothing in the field or the bog is simply yours for the taking.',
    ),
    L(
      'Vectēvs to turēja. Tēvs — pa pusei. Tu par to neesi domājis nemaz.',
      'Your grandfather kept it. Your father half-kept it. You have not thought about it at all.',
    ),
    L(
      'Šogad rudzi izauga plāni, strauts aiznesa tiltu, un ciems ir sācis uz tevi skatīties.',
      'This year the rye came up thin, the stream took the bridge, and the village has begun to look at you.',
    ),
    L(
      'Tāpēc tu iesi aiz sētas — un uzzināsi, kas vēl ir parādā.',
      'So you will go out past the fence — and find out what is still owed.',
    ),
  ],
};

export const village = {
  stone: {
    label: L('Akmens', 'The stone'),
    lines: [
      L(
        'Pelēks akmens ciema vidū, vecāks par visām mājām ap to. Neviens vairs neatceras, kas tajā iekalts.',
        'A grey stone in the middle of the village, older than every house around it. Nobody remembers any more what was cut into it.',
      ),
      L(
        'Bet visi joprojām met tam pirmo graudu no pirmās maizes. Katru gadu. Nedomājot.',
        'But everyone still throws it the first crumb of the first loaf. Every year. Without thinking.',
      ),
    ],
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
    done: L(
      'Lauks nopļauts. Rugāji un vēss vējš pāri tiem.',
      'The field is cut. Stubble, and a cold wind over it.',
    ),
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
  },
  nudgeFirst: L(
    'Ej aiz sētas. Sāc ar lauku.',
    'Go out past the fence. Start with the field.',
  ),
  nudgeBog: L(
    'Ar maizi kulē vari iet uz purvu.',
    'With bread in your bag you can go to the bog.',
  ),
  nudgeDone: L(
    'Abi parādi nokārtoti. Ej pie akmens.',
    'Both debts are settled. Go to the stone.',
  ),
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
      'Kaut kur šeit viens stiebrs nes divas vārpas. Atrodi to, pirms liec sirpi klāt.',
      'Somewhere in here one stem carries two ears. Find it before you put a blade to anything.',
    ),
  ],
  hintStone: {
    label: L('Lauka akmens', 'The field stone'),
    text: L(
      'Robežakmens, apaudzis ķērpjiem. Vecmāmiņas vārdi nāk paši: ko lauks dod, no tā laukam atstāj daļu. Pēdējo nekad neņem.',
      'A boundary stone, grown over with lichen. Your grandmother’s words come by themselves: of what the field gives, leave the field a share. Never take the last of it.',
    ),
  },
  decoys: [
    L(
      'Smaga, laba vārpa. Viena vārpa. Tu to atstāj mierā.',
      'A good heavy ear. One ear. You leave it be.',
    ),
    L(
      'Lietus to noguldījis gar zemi. Te nekā nav.',
      'The rain has laid this one flat. Nothing here.',
    ),
    L(
      'Dadzis, izziedējis rudzu vidū. Ne tas, ko tu meklē.',
      'A thistle, gone to seed in the middle of the rye. Not what you are after.',
    ),
    L(
      'Divi stiebri saslējušies kopā. No tālienes gandrīz. Gandrīz nav tas pats.',
      'Two stems leaning together. From a distance, almost. Almost is not it.',
    ),
    L(
      'Tīteņi uzkāpuši pa stiebru augšā. Zem tiem — viena vārpa.',
      'Bindweed has climbed this stem. Under it, one ear.',
    ),
  ],
  found: [
    L(
      'Tur. Viens stiebrs, un tas izdzinis divas vārpas, abas pilnas, viena pret otru kā pāris vēršu jūgā.',
      'There. One stem, and it has put out two ears, both full, leaning on each other like a pair of oxen in a yoke.',
    ),
    L(
      'Jumis. Lauka laime, sēž tieši tajā, ko tu būtu nopļāvis pēdējo un nemaz nepamanījis.',
      'Jumis. The luck of the field, sitting in the very thing you would have cut last and never noticed.',
    ),
  ],
  question: L('Ko tu dari?', 'What do you do?'),
  choices: {
    all: L(
      'Pļaut visu lauku, arī šo stiebru. Graudi ir graudi.',
      'Cut the whole field, this stem with it. Grain is grain.',
    ),
    leave: L(
      'Pļaut apkārt. Divvārpu atstāt stāvam un pieliekt pie rugājiem.',
      'Cut around it. Leave the double ear standing and bind it down into the stubble.',
    ),
    take: L(
      'Izraut to ar visām saknēm un nest mājās klētī.',
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
      L(
        'Graudi izžūst viegli. Pietiek, lai tiem uzmestu jumtu. Nepietiek, lai to piepildītu.',
        'The grain dries light. Enough to throw a roof over it. Not enough to fill one.',
      ),
    ],
    leave: [
      L(
        'Tu pļauj platā lokā apkārt un atstāj divvārpu stāvam mazā nenopļautā saliņā.',
        'You cut in a wide arc around it and leave the double ear standing in a little island of uncut rye.',
      ),
      L(
        'Tad pieliec to pie zemes un piesien ar salmu grīsti, kā to dara vecās sievas.',
        'Then you bend it to the ground and tie it with a twist of straw, the way the old women do.',
      ),
      L(
        'Pēdējais kūlis ir smagāks, nekā tam vajadzētu būt. Klēts paņem visu, ko tu atnes, un prasa vēl vietu.',
        'The last sheaf is heavier than it has any right to be. The granary takes everything you bring and asks for more room.',
      ),
    ],
    take: [
      L(
        'Tu izrauj to ar saknēm un nes mājās. Klētī tas izskatās mazs. Rīt tas būs sauss salmu kušķis pie sijas.',
        'You pull it up by the roots and carry it home. In the granary it looks small. By tomorrow it will be a dry wisp of straw on a beam.',
      ),
      L(
        'Lauks paliek tukšs līdz pēdējam stiebram. Tu paņēmi Jumi — bet paņemts nav tas pats, kas dots.',
        'The field is left bare to the last stem. You took Jumis — but taken is not the same as given.',
      ),
    ],
  },
  reward: {
    good: L(
      'Tu pārnāc ar pilnu vezumu un ar maizi, kas cepta no pirmajiem graudiem.',
      'You come home with a full cart, and with bread baked from the first of the grain.',
    ),
    poor: L(
      'Tu pārnāc ar plānu vezumu un ar vienu klaipu, kas smags kā akmens.',
      'You come home with a thin cart, and with one loaf as heavy as a stone.',
    ),
  },
  // A click on nothing in particular gets one of these, in rotation, rather
  // than silence — which in a click-the-picture game reads as broken.
  nothing: [
    L('Tikai rudzi.', 'Only rye.'),
    L('Viena vārpa, un vēl viena. Katra uz sava stiebra.', 'One ear, and another. Each on its own stem.'),
    L('Rudzi šalc. Nekā.', 'The rye rustles. Nothing.'),
  ],
};

// Lines shared by a clean bargain and the same bargain after a fumbled riddle.
// The trick works either way; only the bridge he leaves behind differs.
const catCrosses = L(
  'Tu palaid ciema kaķi. Tas aiziet pāri, nesteidzoties, un pat neapstājas viņa priekšā.',
  'You let the village cat go. It crosses without hurrying, and does not even stop in front of him.',
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
  greet: [
    L(
      '„Labvakar, labvakar! Cilvēks uz maniem dēļiem. Tu gribi pāri — protams, ka gribi pāri, visi grib pāri.“',
      '“Good evening, good evening! A man on my planks. You want across — of course you want across, everybody wants across.”',
    ),
    L(
      '„Es uzbūvēšu. Visu, akmenī un kokā, pirms gaiļi dzied. Un lēti.“',
      '“I will build it. The whole thing, in stone and timber, before the cocks crow. And cheap.”',
    ),
    L(
      '„Bet vispirms — mīkla. Man garlaicīgi. Ja atmini, runāsim kā vīrs ar vīru.“',
      '“But first — a riddle. I am bored. Get it right and we will talk man to man.”',
    ),
  ],
  riddle: L(
    '„Bez rokām, bez kājām, bet durvis ver. Kas tas ir?“',
    '“Without hands, without feet, and yet it opens doors. What is it?”',
  ),
  riddleChoices: {
    wind: L('Vējš.', 'The wind.'),
    thief: L('Zaglis.', 'A thief.'),
    bear: L('Lācis.', 'A bear.'),
  },
  riddleRight: L(
    '„Vējš,“ viņš saka un saviebjas. „Vējš, protams. Tu esi klausījies vecos ļaudīs. Nu labi. Tad par tiltu.“',
    '“The wind,” he says, and pulls a face. “The wind, of course. You have been listening to old people. Very well. The bridge, then.”',
  ),
  riddleWrong: L(
    'Viņš smejas tā, ka no ciņa nokrīt sūnas. „Nē! Vējš, muļķi, vējš! Nu, tad tilts būs tik labs, cik laba bija atbilde.“',
    'He laughs so hard the moss falls off the hummock. “No! The wind, fool, the wind! Then the bridge will be the quality of your answer.”',
  ),
  terms: [
    L(
      '„Cena vienkārša,“ viņš saka. „Pirmais, kas pāri iet, ir mans. Pirmais dzīvais. Tas viss.“',
      '“The price is simple,” he says. “The first to cross is mine. The first living thing. That is all.”',
    ),
  ],
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
        'Tu sper soli uz jaunajiem dēļiem, un viņš pieceļas tik ātri, ka tu atkāpies atpakaļ krastā.',
        'You put a foot on the new planks, and he stands up so fast that you step back onto the bank.',
      ),
      L(
        'Viņš smejas visu nakti. Rītā pār purvu ir divi baļķi un pāris dēļu — tik daudz, cik viņš uzbūvēja, pirms tu apjēdzi, ko esi solījis.',
        'He laughs all night. In the morning there are two logs and a few planks over the bog — as much as he built before you understood what you had promised.',
      ),
    ],
    cat: [
      catCrosses,
      L(
        '„Kaķis,“ viņš saka. „Kaķis.“ Viņš sēž un skatās uz kaķi ļoti ilgi. Tad ceļas un aiziet purvā, un tilts paliek — akmens un ozols, tieši tāds, kāds bija solīts.',
        '“A cat,” he says. “A cat.” He sits looking at the cat for a long time. Then he gets up and walks off into the bog, and the bridge stays — stone and oak, exactly as promised.',
      ),
    ],
    // The same trick after a fumbled riddle. Without these the prose promised
    // stone and oak, and the reckoning card one click later said two logs.
    // (New lines — include them in the proofreading pass.)
    catFumbled: [
      catCrosses,
      L(
        '„Kaķis,“ viņš saka. „Kaķis.“ Viņš sēž un skatās uz kaķi ļoti ilgi. Tad ceļas un aiziet purvā. Rītā pār ūdeni guļ divi baļķi un pāris dēļu.',
        '“A cat,” he says. “A cat.” He sits looking at the cat for a long time. Then he gets up and walks off into the bog. In the morning two logs and a few planks lie over the water.',
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
  },
  // A click on nothing in particular gets one of these, in rotation, rather
  // than silence — which in a click-the-picture game reads as broken.
  nothing: [
    L('Melns ūdens.', 'Black water.'),
    L('Sūnas un ūdens. Tuvāk neej.', 'Moss and water. Do not go closer.'),
    L('Kaut kur kaut kas iešļakstās. Nekā nav redzams.', 'Something splashes somewhere. There is nothing to see.'),
  ],
};

export const outro = {
  both: [
    L(
      'Klēts stāv pilna, un pār purvu ved tilts, kas turēs ratus.',
      'The granary stands full, and a bridge crosses the bog that will hold a cart.',
    ),
    L(
      'Ciems vēl neprot to pateikt, bet visi to redz: parāds ir samaksāts pareizā valūtā. Ne ar darbu. Ar to, ka kāds beidzot atcerējās, ko atstāt.',
      'The village has no words for it yet, but everyone can see it: the debt was paid in the right currency. Not with labour. With somebody finally remembering what to leave behind.',
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
 * The rule for these lines is that they must be unambiguous. The outcome prose
 * above is descriptive — "the grain dries light" — and a player clicking
 * through it has no way to know whether that is a good result. These lines are
 * the evaluation, and they say the quiet part out loud:
 *
 *   verdict — did the spirit accept it, yes or no
 *   gain    — what you are actually walking home with
 *   missed  — ONLY on a diminished outcome: what you should have done, and
 *             what it would have got you
 *
 * That last field is the important one. Without it the player knows they did
 * badly but not why, which is worse than no feedback at all.
 */
export const reckoning = {
  title: L('Aprēķins', 'The reckoning'),
  jumis: {
    good: {
      verdict: L('Jumis ir mierā.', 'Jumis is satisfied.'),
      gain: L(
        'Klēts: pilna. Maize: cepta no pirmajiem graudiem.',
        'Granary: full. Bread: baked from the first of the grain.',
      ),
      missed: null,
    },
    poor: {
      verdict: L('Jumis nav mierā.', 'Jumis is not satisfied.'),
      gain: L(
        'Klēts: lāpīta būda. Maize: viens smags klaips.',
        'Granary: a patched shed. Bread: one heavy loaf.',
      ),
      missed: L(
        'Vajadzēja pļaut apkārt un atstāt divvārpu stāvam. Tad klēts būtu pilna.',
        'You should have cut around the double ear and left it standing. Then the granary would have been full.',
      ),
    },
  },
  velns: {
    good: {
      verdict: L('Velnam ir samaksāts.', 'The Devil has been paid.'),
      gain: L(
        'Pāreja: akmens un ozola tilts. Aiz tā — jauna zeme.',
        'Crossing: a bridge of stone and oak. Beyond it, new ground.',
      ),
      missed: null,
    },
    poor: {
      verdict: L('Velns guva virsroku.', 'The Devil came out ahead.'),
      gain: L(
        'Pāreja: divi baļķi un daži dēļi.',
        'Crossing: two logs and a few planks.',
      ),
      // Every reason that applies is shown, in the order it happened, then one
      // closing line. Each reason used to promise a whole bridge on its own,
      // which was false for a player who lost it two ways at once — see
      // `velnsMisses` in core/rules.ts. (Reworded — include in proofreading.)
      missedRiddle: L(
        'Atbilde bija vējš. Ar to viņš būtu bijis jāuzrunā kā līdzīgam.',
        'The answer was the wind. Get it right and he deals with you as an equal.',
      ),
      missedSelf: L(
        'Nekad neej pāri pirmais — palaid pa priekšu ciema kaķi.',
        'Never cross first yourself. Send the village cat ahead of you.',
      ),
      missedBread: L(
        'Maize bija plāna, jo lauks palika tukšs. Ar pilnu klēti tas arguments būtu turējis.',
        'The bread was thin because the field was left bare. With a full granary behind it, that argument would have held.',
      ),
      thenWhole: L('Izlabo to, un tilts būs vesels.', 'Put that right and the bridge comes out whole.'),
      thenWholeBoth: L('Izlabo abus, un tilts būs vesels.', 'Put both right and the bridge comes out whole.'),
    },
  },
};

/** The closing tally — the player's whole record, said plainly. */
export const tally = {
  heading: L('Divi parādi', 'Two debts'),
  both: L(
    'Abi samaksāti pilnā mērā.',
    'Both paid in full.',
  ),
  half: L(
    'Viens samaksāts pilnā mērā. Viens ne.',
    'One paid in full. One not.',
  ),
  neither: L(
    'Neviens nav samaksāts pilnā mērā.',
    'Neither paid in full.',
  ),
  rowJumis: {
    good: L('Jumis — pilnā mērā', 'Jumis — paid in full'),
    poor: L('Jumis — pa daļai', 'Jumis — part paid'),
  },
  rowVelns: {
    good: L('Pāreja — pilnā mērā', 'The crossing — paid in full'),
    poor: L('Pāreja — pa daļai', 'The crossing — part paid'),
  },
  again: L(
    'Otrā reizē var labāk.',
    'It can be done better a second time.',
  ),
  perfect: L(
    'Labāk vairs nevar.',
    'It cannot be done better than that.',
  ),
};

/** Said in the village the moment the player walks back in and sees the change. */
export const arrival = {
  granaryGood: L(
    'Klēts stāv uz veciem pamatiem. Pilna.',
    'The granary stands on the old foundation. Full.',
  ),
  granaryPoor: L(
    'Uz pamatiem stāv būda. Vietu tā aizņem, un tas arī viss.',
    'A shed stands on the foundation. It holds the space, and that is all.',
  ),
  bridgeGood: L(
    'Pār strautu ved akmens tilts. Pa to var vest ratus.',
    'A stone bridge crosses the stream. A cart could go over it.',
  ),
  bridgePoor: L(
    'Pār strautu guļ divi baļķi. Pa vienam, uzmanīgi.',
    'Two logs lie across the stream. One at a time, carefully.',
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
    taken: L(
      'Tukšs āķis. Sirpis ir tavā kulē.',
      'An empty hook. The sickle is in your bag.',
    ),
    tookIt: L(
      'Tu noņem sirpi no āķa un ieliec kulē.',
      'You lift the sickle off its hook and put it in your bag.',
    ),
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
    already: L(
      'Kaķis jau nāk tev līdzi.',
      'The cat is already coming with you.',
    ),
  },
  needSickle: L(
    'Rudzus ar rokām nerauj. Bez sirpja laukā nav ko iet.',
    'You do not pull rye up by hand. There is no going to the field without a sickle.',
  ),
  needOffering: L(
    'Uz purvu tukšām rokām neiet. Paņem maizi — un neej viens.',
    'You do not go to the bog empty-handed. Take the bread — and do not go alone.',
  ),
  // Field: the harvest is an action, not a menu entry.
  cutPrompt: L(
    'Ņem sirpi no kules un sāc pļaut rudzus.',
    'Take the sickle from your bag and start on the standing rye.',
  ),
  cutWrongTool: L(
    'Ar to te nav ko darīt.',
    'That is no use here.',
  ),
  noCat: L(
    'Kaķa tev līdzi nav. Būtu vajadzējis paņemt to no sliekšņa.',
    'You have no cat with you. You should have picked the one off the doorstep.',
  ),
  // Replies to an item used in the wrong place or at the wrong time. The
  // item used to go back into the bag without a word.
  cutWrongPlace: L('Sirpis rudziem, ne debesīm.', 'The sickle is for the rye, not the sky.'),
  notYet: L('Vēl ne.', 'Not yet.'),
  // Said once, beside the bag, the first time it is opened.
  teach: L(
    'Paņem lietu rokā, tad norādi, kur to likt.',
    'Take a thing in hand, then point at where it goes.',
  ),
  // Said every time something is taken in hand. Without a mouse cursor there is
  // nothing on screen that says the game is now waiting for you to point.
  inHand: L(
    'Rokā. Tagad pieskaries tam, uz ko to lietot.',
    'In hand. Now touch what to use it on.',
  ),
  // The way back out of holding something, for a screen with no right button.
  putBack: L('Nolikt atpakaļ', 'Put it back'),
  /**
   * The bag's own introduction, shown as a card the first time something goes
   * into it. It used to be one line beside the bag on first OPEN — which the
   * first playtester never did, so she met the bag as an unexplained object
   * appearing in the corner and asked out loud what it was.
   */
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
      'Cepts no pilna gada pirmajiem graudiem. Smaržo pēc visa lauka.',
      'Baked from the first grain of a full year. It smells of the whole field.',
    ),
    poor: L(
      'Cepts no plāna gada graudiem. Smags kā akmens, un iekšā maz.',
      'Baked from a thin year’s grain. Heavy as a stone, with little inside it.',
    ),
  },
};
