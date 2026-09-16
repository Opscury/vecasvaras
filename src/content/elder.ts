/**
 * Vecā Anna — the woman who gives the village its errands.
 *
 * She exists because the first playtester reached the village, was told once
 * in a line that vanished what she might do, and then had nothing to ask. A
 * hint that disappears is not a hint; a person standing by her door is one you
 * can go back to as many times as you like.
 *
 * She also holds the rewards. The field gives you a cart; Anna counts it and
 * turns it into bread in front of you, which is how a share actually gets
 * settled: in front of somebody.
 *
 * She reminds you of errands, never of answers. She does not tell you what to
 * send over the bog first.
 */

import { L } from '../core/i18n';

export const elder = {
  label: L('Vecā Anna', 'Old Anna'),

  /** First meeting: the errand that starts the game. */
  greet: [
    L(
      'Vecā Anna stāv pie durvīm, it kā būtu tevi gaidījusi visu rītu.',
      'Old Anna is standing at her door, as though she had been waiting for you all morning.',
    ),
    L(
      '«Rudzi laukā stāv nopļaujami, un ciemā neviena jaunāka par mani nav palicis.»',
      '“The rye is standing out there waiting to be cut, and there is nobody in this village younger than me left to do it.”',
    ),
  ],
  // NEW — a second year onwards. She knows you know.
  greetAgain: [
    L('Vecā Anna stāv pie durvīm. «Atkal rudens.»', 'Old Anna is standing at her door. “Autumn again.”'),
    L(
      '«Rudzi stāv. Tu zini, kur sirpis, un zini, kas jādara.»',
      '“The rye is standing. You know where the sickle is, and you know what needs doing.”',
    ),
  ],
  ask: L('«Aiziesi?»', '“Will you go?”'),
  choices: {
    accept: L('Aiziešu.', 'I will go.'),
    why: L('Kāpēc es?', 'Why me?'),
  },
  why: L(
    '«Tāpēc, ka tavs vectēvs gāja. Un pirms viņa — viņa tēvs.»',
    '“Because your grandfather went. And before him, his father.”',
  ),
  accepted: L(
    '«Sirpis karājas zem nojumes. Kur tu to atstāji.»',
    '“The sickle is under the lean-to. Where you left it.”',
  ),

  /** The player heading out of the village before anyone has asked them to. */
  notAsked: L(
    'Nav ko iet. Vispirms parunā ar Veco Annu.',
    'There is no reason to go yet. Speak to Old Anna first.',
  ),

  /** Said when she is spoken to and there is nothing new to say. */
  remind: {
    takeSickle: L('«Vispirms sirpi, puis. Ar rokām nerauj.»', '“The sickle first. You do not pull it up by hand.”'),
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
        'Kūļu ir daudz, bet tie ir viegli. Kuļot no tiem birst vairāk pelavu nekā graudu.',
        'There are plenty of sheaves, but they are light. Threshed, they give more chaff than grain.',
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
    L(
      '«Un vēl viena daļa jāatstāj. Strauts aiznesa tiltu, un aiz purva sēž tas, kas to var uzcelt.»',
      '“And one more share to leave. The stream took the bridge, and the one who can build it sits out past the bog.”',
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
      '«Aizgāja? Pavisam?» Viņa iesmejas — pirmo reizi, cik tu atceries.',
      '“Gone? For good?” She laughs — for the first time you can remember.',
    ),
    dawn: L(
      '«Gaidīji līdz gaiļiem.» Viņa pašūpo galvu. «Ar velnu nevilcinās.»',
      '“You waited for the cocks.” She shakes her head. “You do not dawdle with the Devil.”',
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
 * game. Kept to a handful of words each: it is a signpost, not prose.
 */
export const objectives = {
  meetElder: L('Parunā ar Veco Annu', 'Speak to Old Anna'),
  takeSickle: L('Paņem sirpi no nojumes', 'Take the sickle from the lean-to'),
  harvest: L('Nopļauj rudzu lauku', 'Cut the rye field'),
  returnHarvest: L('Aizved vezumu pie Vecās Annas', 'Take the cart to Old Anna'),
  crossBog: L('Tiec pāri purvam', 'Get across the bog'),
  returnBog: L('Atgriezies pie Vecās Annas', 'Go back to Old Anna'),
  done: L('Ej pie akmens ciema vidū', 'Go to the stone in the village'),
  /** The word in front of whatever the line above says. */
  heading: L('Uzdevums', 'To do'),
};
