/**
 * Vecā Anna — the woman who gives the village its errands.
 *
 * She exists because the first playtester reached the village, was told once
 * in a line that vanished what she might do, and then had nothing to ask. A
 * hint that disappears is not a hint; a person standing by her door is one you
 * can go back to as many times as you like.
 *
 * She also holds the rewards. The loaf used to appear in the bag the instant
 * the rye went down, in the middle of the outcome text, where nobody noticed
 * it. Now the field gives you a result and Anna gives you the bread, which is
 * how a debt actually gets settled: in front of somebody.
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
    done: L('«Tagad ej pie akmens. Tas zina rēķinu labāk par mani.»', '“Go to the stone now. It keeps the account better than I do.”'),
  },

  /** Coming back from the field. */
  harvestBack: {
    good: [
      L(
        '«Tu atstāji laukam savu daļu.» Viņa pamāj, it kā būtu par tevi derējusi un uzvarējusi.',
        '“You left the field its share.” She nods, like someone who bet on you and won.',
      ),
    ],
    poor: [
      L(
        '«Tu paņēmi visu.» Viņa neko nepārmet. Tas ir sliktāk.',
        '“You took all of it.” She does not scold you. That is worse.',
      ),
    ],
    /** The loaf, handed over rather than appearing in the bag by itself. */
    bread: L(
      'Viņa ienes klaipu no krāsns un iespiež tev rokās, vēl siltu.',
      'She fetches a loaf from the oven and presses it into your hands, still warm.',
    ),
  },

  /** The second errand, given once the first is paid. */
  bog: [
    L(
      '«Un vēl viens parāds. Strauts aiznesa tiltu, un aiz purva sēž tas, kas to var uzcelt.»',
      '“And one more debt. The stream took the bridge, and the one who can build it sits out past the bog.”',
    ),
    L('«Neej tukšām rokām. Un neej viens.»', '“Do not go empty-handed. And do not go alone.”'),
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
  },
  toStone: L(
    '«Ej pie akmens. Tas zina rēķinu labāk par mani.»',
    '“Go to the stone. It keeps the account better than I do.”',
  ),
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
  returnHarvest: L('Atgriezies pie Vecās Annas', 'Go back to Old Anna'),
  crossBog: L('Tiec pāri purvam', 'Get across the bog'),
  returnBog: L('Atgriezies pie Vecās Annas', 'Go back to Old Anna'),
  done: L('Ej pie akmens ciema vidū', 'Go to the stone in the village'),
  /** The word in front of whatever the line above says. */
  heading: L('Uzdevums', 'To do'),
};
