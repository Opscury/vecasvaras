/**
 * Annas māte — the old neighbour who gives the village its errands.
 *
 * She exists because the first playtester reached the village, was told once
 * in a line that vanished what she might do, and then had nothing to ask. A
 * hint that disappears is not a hint; a person standing by her door is one you
 * can go back to as many times as you like.
 *
 * She also holds the rewards. The field gives you a cart; she counts it and
 * turns it into bread in front of you, which is how a share actually gets
 * settled: in front of somebody.
 *
 * She reminds you of errands, never of answers. She does not tell you what to
 * send over the bog first.
 *
 * WHO SHE IS, and it has to come through in every line: all opinions and bad
 * knees. She bosses you into helping and starts teaching you the old ways
 * whether you asked or not. Bossy, practical, funny — «shut the gate, the
 * wind's not invited» — and never a calendar proverb.
 *
 * HER NAME is «Annas māte» in Latvian, in whatever case the sentence needs
 * (ar Annas māti, pie Annas mātes). In English she is «Mother Anna» when she
 * is first met and on her label, and «Old Anna» in later narration, once the
 * player knows her. Never «Anna's mother», which is what a literal rendering
 * gives and is a different woman. Her English is real, blunt English: not a
 * translated grandmother. Her pet name for the player is lad or lass, one
 * fixed choice each. (English style guide, Production notes.)
 */

import { L, type Loc } from '../core/i18n';

export const elder = {
  label: L('Annas māte', 'Mother Anna'),

  /**
   * First meeting. The intro already had her shouting over the fence about
   * the rye, so she does not say it twice: by the time you are in her yard
   * she has moved on to the gate, and to counting.
   */
  greet: [
    L(
      'Annas māte joprojām stāv pie durvīm. «Aizver vārtiņus. Vējš nav aicināts.»',
      'Mother Anna is still standing at her door. “Shut the gate. The wind is not invited.”',
    ),
    L(
      '«Tātad. Lauks, sirpis, tu. Trīs lietas, un divas no tām jau ir savā vietā.»',
      '“Right. The field, the sickle, you. Three things, and two of them are already where they should be.”',
    ),
  ],
  ask: L('«Aiziesi, {nameV}?»', '“Will you go, {name}?”'),
  choices: {
    accept: L('Aiziešu.', 'I will go.'),
    why: L('Kāpēc es?', 'Why me?'),
  },
  why: L(
    '«Tāpēc, ka visi citi ciemā ir vai nu par vecu, vai par gudru. Tu esi tieši pa vidu.»',
    '“Because everyone else in this village is either too old or too clever. You are exactly in between.”',
  ),
  accepted: L(
    '«Sirpis karājas zem nojumes. Es to tur neliku.»',
    '“The sickle is hanging under the lean-to. I did not put it there.”',
  ),

  /** The player heading out of the village before anyone has asked them to. */
  notAsked: L(
    'Nav ko iet. Vispirms parunā ar Annas māti.',
    'There is no reason to go yet. Speak to Mother Anna first.',
  ),

  /** Said when she is spoken to and there is nothing new to say. */
  remind: {
    takeSickle: L('«Vispirms sirpi, {puis|meit}. Ar rokām nerauj.»', '“The sickle first, {lad|lass}. You do not pull it up by hand.”'),
    harvest: L('«Lauks pats sevi nenopļaus.»', '“The field will not cut itself.”'),
    crossBog: L('«Pāreja pār purvu. Un neej tukšām rokām.»', '“The crossing over the bog. And do not go empty-handed.”'),
    done: L('«Tagad ej pie akmens. Tas atceras labāk par mani.»', '“Go to the stone now. It remembers better than I do.”'),
  },

  /** Coming back from the field: the cart, counted, then threshed into bread. */
  harvestBack: {
    // NEW — the cart arrives in her yard.
    cart: L(
      'Tu iebrauc Annas pagalmā ar vezumu. Viņa skaita kūļus.',
      'You drive the cart into Anna’s yard. She counts the sheaves.',
    ),
    leave: [
      L(
        '«Tu atstāji laukam savu daļu.» Viņa pamāj, it kā būtu par tevi derējusi un uzvarējusi.',
        '“You left the field its share.” She nods, like someone who bet on you and won.',
      ),
      L(
        '«Mazāk kūļu, nekā varēja būt.» Viņa paceļ vienu. «Un katrs smagāks, nekā tam pienāktos.»',
        '“Fewer sheaves than there could have been.” She lifts one. “And every one heavier than it has any right to be.”',
      ),
    ],
    // NEW
    take: [
      L(
        '«Jumi tu atvedi mājās.» Viņa ilgi skatās uz divvārpu. «Tā arī var. Tikai tagad viņš ēdīs no klēts.»',
        '“You brought Jumis home.” She looks at the double ear a long while. “That is one way. Only now he will eat from the granary.”',
      ),
    ],
    all: [
      L('«Tu paņēmi visu.» Viņa neko nepārmet. Tas ir sliktāk.', '“You took all of it.” She does not scold you. That is worse.'),
      L(
        'Kūļu ir daudz, bet tie ir viegli. Rijā kuļot, no tiem birst vairāk pelavu nekā graudu.',
        'There are plenty of sheaves, but they are light. Threshed in the barn, they give more chaff than grain.',
      ),
    ],
    // NEW
    spare: [
      L(
        '«Tu atstāji laukam pusi lauka.» Viņa nopūšas. «Laukam tas patiks. Ar ko ziemosim?»',
        '“You left the field half the field.” She sighs. “The field will like that. What will we winter on?”',
      ),
    ],
    /** The loaf, handed over — what it is like depends on the year. */
    bread: {
      good: L(
        'Viņa ienes klaipu no krāsns un iespiež tev rokās, vēl siltu. «Neliec to otrādi.»',
        'She brings a loaf from the oven and presses it into your hands, still warm. “Never lay it upside down.”',
      ),
      jumis: L(
        'Viņa ienes klaipu no krāsns, vēl siltu. «Šajā ir Jumis. Pret tādu neviens nestāv.»',
        'She brings a loaf from the oven, still warm. “There is Jumis in this one. Nothing stands against that.”',
      ),
      thin: L(
        'Viņa ienes klaipu no krāsns. Tas ir plakans un smags. «Kāds gads, tāda maize.»',
        'She brings a loaf from the oven. It is flat and heavy. “As the year, so the bread.”',
      ),
    },
  },

  /** The second errand, given once the first has been brought home. */
  bog: [
    // «Nelabais» — the old way of not saying «velns» out loud.
    L(
      '«Strauts aiznesa tiltu. Aiz purva sēž tas, kas to var uzcelt — nelabais. Vārdā es viņu nesaukšu.»',
      '“The stream took the bridge. Out past the bog sits the one who can build it — the Evil One. I will not say his name.”',
    ),
    // Used to add "And do not go alone" — which was the answer to the bog,
    // given before the question had been asked.
    L('«Neej tukšām rokām.»', '“Do not go empty-handed.”'),
  ],
  bogAsk: L('«Aiziesi arī turp?»', '“Will you go out there as well?”'),

  /** Coming back from the bog. */
  bogBack: {
    good: [
      L(
        '«Pa to tiltu var vest ratus.» Viņa ilgi skatās uz strautu. «Es to vairs necerēju redzēt.»',
        '“A cart could go over that bridge.” She looks at the stream for a long time. “I did not expect to see that again.”',
      ),
    ],
    poor: [
      L(
        '«Divi baļķi.» Viņa paraustās plecos. «Pa vienam. Uzmanīgi. Tā arī dzīvosim.»',
        '“Two logs.” She shrugs. “One at a time. Carefully. We will live like that too.”',
      ),
    ],
    // NEW — said after the lines above, when they apply.
    catLost: L(
      '«Un kaķis?» Viņa paskatās uz tukšo slieksni un neko vairs nesaka.',
      '“And the cat?” She looks at the empty doorstep and says nothing more.',
    ),
    devilGone: L(
      '«Aizgāja?» Viņa iesmejas — pirmo reizi, cik tu atceries. «Līdz Jāņiem. Tādi atgriežas.»',
      '“He went?” She laughs — for the first time you can remember. “Till Jāņi. That sort comes back.”',
    ),
    dawn: L(
      '«Gaidīji līdz gaiļiem.» Viņa pašūpo galvu. «Ar velnu nevilcinās.»',
      '“You waited for the cocks.” She shakes her head. “You do not dawdle with the Devil.”',
    ),
    hat: L(
      'Viņa ierauga cepuri tavā kulē un ilgi klusē. «Tātad viņš tevi cienīja.» Viņa nopūšas. «Pakar to klētī. Lai redz.»',
      'She sees the hat in your bag and says nothing for a long while. “So he respected you.” She sighs. “Hang it in the granary. Let it be seen.”',
    ),
    crumb: L(
      '«Un akmeni tu atcerējies.» Viņa to saka tā, it kā tas būtu pats svarīgākais.',
      '“And you remembered the stone.” She says it as if that mattered most of all.',
    ),
  },
  toStone: L('«Ej pie akmens. Tas atceras labāk par mani.»', '“Go to the stone. It remembers better than I do.”'),
  farewell: L('«Ej nu.»', '“Go on, then.”'),
};

/**
 * The one line that says what to do next, shown in the corner for the whole
 * game — and, under it when the player asks, why.
 *
 * The line is hers, not the game's: she is the one who sent you, so a
 * signpost written as a menu item («Paņem sirpi no nojumes») was the one
 * place in the village where somebody else was talking. A handful of words
 * each, under eight; the sentence that explains itself is the `why`, which
 * stays out of the corner until it is wanted.
 */
export interface Signpost {
  /** The signpost itself, in her words. */
  line: Loc;
  /** One sentence under it on a tap: why this, and why now. */
  why: Loc;
}

const O = (line: Loc, why: Loc): Signpost => ({ line, why });

export const objectives = {
  meetElder: O(
    L('Ej pie Annas mātes. Viņa gaida.', 'Go to Mother Anna. She is waiting.'),
    L(
      'Viņa pateiks, kas šodien darāms — un tad vēl daudz ko citu.',
      'She will tell you what the day needs, and then a good deal more.',
    ),
  ),
  takeSickle: O(
    L('Sirpis zem nojumes. Kur tu to atstāji.', 'Sickle’s under the lean-to. Where you left it.'),
    L(
      'Rudzus ar rokām nerauj. Vectēva sirpis to zina.',
      'Rye does not come up by hand. Your grandfather’s sickle knows that.',
    ),
  ),
  harvest: O(
    L('Nopļauj rudzus. Trešo dienu stāv gatavi.', 'Cut the rye. It has stood ready three days.'),
    L(
      'Un atstāj laukam savu daļu — tā, kā tev teica.',
      'And leave the field its share, the way you were told.',
    ),
  ),
  returnHarvest: O(
    L('Vezumu pie Annas mātes. Viņa skaitīs.', 'The cart to Old Anna. She will count it.'),
    L(
      'Kūļi nav maize. Maize top viņas krāsnī, un to viņa iedos tev rokā.',
      'Sheaves are not bread. Bread happens in her oven, and she hands it over herself.',
    ),
  ),
  crossBog: O(
    L('Pāri purvam. Un ne tukšām rokām.', 'Across the bog. And not empty-handed.'),
    L(
      'Strauts aiznesa tiltu. Uzcelt to var tikai tas, kas sēž aiz purva.',
      'The stream took the bridge. The only one who can build it sits out past the bog.',
    ),
  ),
  returnBog: O(
    L('Atpakaļ pie Annas mātes. Pastāsti.', 'Back to Old Anna. Tell her.'),
    L(
      'Viņa tevi sūtīja, tāpēc viņa arī uzklausīs, kā gāja.',
      'She sent you, so she is the one who hears how it went.',
    ),
  ),
  done: O(
    L('Akmens ciema vidū. Tas tevi gaida.', 'The stone in the village. It is waiting.'),
    L(
      'Akmens atceras, kā tu izturējies pret vecajām varām. Šovakar tas pateiks.',
      'The stone remembers how you treated the old powers. Tonight it says so.',
    ),
  ),
};

/** The furniture around the line. */
export const objectiveUi = {
  /** The word in front of whatever the line says. */
  heading: L('Uzdevums', 'To do'),
  /** Said under the line the first time, so the «why» is findable at all. */
  tapForWhy: L('Pieskaries, lai uzzinātu, kāpēc', 'Touch to see why'),
};
