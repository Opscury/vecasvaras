/**
 * Ilze or Krišs — the one the player courts this year. A young man meets
 * Ilze; a young woman meets Krišs.
 *
 * Lines that differ between the two are written with `B(ilze, kriss, …)`:
 * both versions, chosen at the moment the line is shown. Because each of them
 * only ever speaks to one gender of player, their own lines are written to
 * that player directly (Ilze always says «puisi», Krišs «meitēn»), with no
 * further marks inside.
 *
 * Folklore rule (FOLKLORE.md): the one belief they speak of — that whoever
 * finds a double ear will soon marry — is retold from Šmits 11991 and listed
 * in «Avoti». Everything else here is the game's own story.
 */

import { L, type Loc } from '../core/i18n';

/** One line in two versions: Ilze's (for a young man) and Krišs's (for a young woman). */
const B = (ilzeLv: string, krissLv: string, ilzeEn: string, krissEn: string): Loc =>
  L(`{${ilzeLv}|${krissLv}}`, `{${ilzeEn}|${krissEn}}`);

/** The same words from either of them. */
const S = L;

export const beloved = {
  name: L('{Ilze|Krišs}', '{Ilze|Krišs}'),
  ribbon: L('Saticība', 'Closeness'),
  /**
   * Said under the ribbon the first time a knot fills, and then never again
   * this run. Five knots and a name is not self-explanatory, and the family
   * playtest read it as a score.
   */
  ribbonNote: L('Saticība — cik tuvu esat.', 'Closeness — how near you’ve come.'),

  /** What they are doing, seen from across the yard. */
  look: B(
    'Ilze no Kalējiem nes no strauta ūdeni. Pilnu spaini, un ne lāsītes pāri malai.',
    'Krišs no Kalējiem skalda malku. Pagale pēc pagales, un ne reizi nekļūdās.',
    'Ilze from Kalēji, the smithy farm, is carrying water up from the stream. A full bucket, and not a drop over the rim.',
    'Krišs from Kalēji, the smithy farm, is splitting wood. Log after log, and not one miss.',
  ),

  /** The first time. */
  meet: {
    lines: [
      B(
        'Ilze noliek spaini un nobīda matus no pieres. «Tātad tevi Anna sūta uz lauku. Visu vienu pašu.»',
        'Krišs atspiež cirvi pret bluķi. «Tātad tevi Anna sūta uz lauku. Visu vienu pašu.»',
        'Ilze sets the bucket down and pushes the hair off her brow. “So Anna is sending you to the field. All on your own.”',
        'Krišs leans the axe against the block. “So Anna is sending you to the field. All on your own.”',
      ),
      B(
        '«Mans tēvs saka, ka tavs vectēvs pļāva tā, ka vārpas pašas gūlās. Redzēsim, puisi.»',
        '«Mans tēvs saka, ka tava vecmāmiņa sēja tā, ka rudzi auga taisni. Redzēsim, meitēn.»',
        '“My father says your grandfather reaped so that the ears lay down on their own. We will see, lad.”',
        '“My father says your grandmother sowed so that the rye grew straight. We will see, girl.”',
      ),
    ],
    ask: S('«Nu?»', '“Well?”'),
    choices: {
      help: B(
        'Vispirms ļauj, es tev to spaini uznesīšu.',
        'Vispirms ļauj, es tev to malku sakrāšu.',
        'First let me carry that bucket up for you.',
        'First let me stack that wood for you.',
      ),
      bold: S('Redzēsi. Un tad tu man būsi parādā dziesmu.', 'You will. And then you owe me a song.'),
      curt: S('Man nav laika runāt.', 'I have no time to talk.'),
    },
    help: B(
      'Ilze tev spaini nedod. «Ej nu pļaut.» Bet viņa smaida, un smaids paliek ilgāk par vārdiem.',
      'Krišs tev cirvi nedod. «Ej nu pļaut.» Bet viņš smaida, un smaids paliek ilgāk par vārdiem.',
      'Ilze will not give you the bucket. “Go and reap.” But she is smiling, and the smile stays longer than the words.',
      'Krišs will not give you the axe. “Go and reap.” But he is smiling, and the smile stays longer than the words.',
    ),
    bold: B(
      '«Dziesmu?» Ilze iesmejas. «Pļauj vispirms. Dziesmas dzied pēc pļaujas.»',
      '«Dziesmu?» Krišs iesmejas. «Pļauj vispirms. Dziesmas dzied pēc pļaujas.»',
      '“A song?” Ilze laughs. “Reap first. Songs are sung after the harvest.”',
      '“A song?” Krišs laughs. “Reap first. Songs are sung after the harvest.”',
    ),
    curt: B(
      '«Nu tad ej.» Ilze paceļ spaini un vairs uz tevi neskatās.',
      '«Nu tad ej.» Krišs paceļ cirvi un vairs uz tevi neskatās.',
      '“Go, then.” Ilze picks up the bucket and does not look at you again.',
      '“Go, then.” Krišs picks up the axe and does not look at you again.',
    ),
  },

  /** After the field. They have heard how it went. */
  harvest: {
    leave: B(
      '«Tu atstāji Jumim saliņu.» Ilze to saka klusi, it kā tas būtu kas tāds, ko vairs neviens nedara. «Tā darīja mana vecmāmiņa.»',
      '«Tu atstāji Jumim saliņu.» Krišs to saka klusi, it kā tas būtu kas tāds, ko vairs neviens nedara. «Tā darīja mans vectēvs.»',
      '“You left Jumis his island.” Ilze says it quietly, as if it were something nobody does any more. “My grandmother did that.”',
      '“You left Jumis his island.” Krišs says it quietly, as if it were something nobody does any more. “My grandfather did that.”',
    ),
    take: S(
      '«Tu Jumi atvedi mājās? Ar visām saknēm?» Tas izklausās gan pēc brīnuma, gan pēc bažām.',
      '“You brought Jumis home? Roots and all?” It sounds like wonder and worry both.',
    ),
    all: S(
      '«Tu nopļāvi visu. Pat divvārpu.» Tas nav jautājums.',
      '“You cut it all. Even the double ear.” It is not a question.',
    ),
    spare: S(
      '«Trešdaļu atstāji stāvam?» Galva noliecas uz sāniem. «Lauks tev būs pateicīgs. Ciems — nezinu.»',
      '“You left a third of it standing?” A tilt of the head. “The field will thank you. The village, I do not know.”',
    ),
    /** The belief: retold from Šmits 11991. */
    omen: B(
      '«Bet tu to atradi — divas vārpas uz viena salma.» Ilze pietvīkst. «Vecie saka: kas tādas atrod, tas drīz apprecēsies.»',
      '«Bet tu to atradi — divas vārpas uz viena salma.» Krišs paskatās sānis. «Vecie saka: kas tādas atrod, tas drīz apprecēsies.»',
      '“But you found it — two ears on one stalk.” Ilze colours. “The old people say whoever finds one will soon be married.”',
      '“But you found it — two ears on one stalk.” Krišs looks away. “The old people say whoever finds one will soon be married.”',
    ),
    ask: S('Ko tu saki?', 'What do you say?'),
    choices: {
      warm: S('Varbūt vecajiem ir taisnība.', 'Perhaps the old people are right.'),
      shy: S('Es… par to nebiju {domājis|domājusi}.', 'I… had not thought about it.'),
      flat: S('Tās ir tikai vārpas.', 'They are only ears of rye.'),
    },
    warm: B(
      'Ilze neko neatbild. Tikai spainis viņas rokā pēkšņi kļūst ļoti interesants.',
      'Krišs neko neatbild. Tikai cirvja kāts viņa rokā pēkšņi kļūst ļoti interesants.',
      'Ilze says nothing. Only the bucket in her hand has suddenly become very interesting.',
      'Krišs says nothing. Only the axe handle in his hand has suddenly become very interesting.',
    ),
    shy: B(
      '«Nu tad padomā,» Ilze saka un aiziet, bet pie sliekšņa vēl atskatās.',
      '«Nu tad padomā,» Krišs saka un aiziet, bet pie šķūņa vēl atskatās.',
      '“Then think about it,” Ilze says, and goes — but at the doorstep she looks back.',
      '“Then think about it,” Krišs says, and goes — but at the shed he looks back.',
    ),
    flat: S('«Jā. Tikai vārpas.» Un saruna ir beigusies.', '“Yes. Only ears of rye.” And that is the end of that.'),
  },

  /** Bread from the bag. Given once; they keep a piece and give the loaf back. */
  gift: {
    jumis: B(
      'Ilze atlauž stūrīti, paošņā un aizver acis. «Tajā ir Jumis.» Klaipu viņa tev atdod. «Pārējo nes, kur tev jānes. Purvs ir tālu.»',
      'Krišs atlauž stūrīti, paošņā un aizver acis. «Tajā ir Jumis.» Klaipu viņš tev atdod. «Pārējo nes, kur tev jānes. Purvs ir tālu.»',
      'Ilze breaks off a corner, breathes it in, and closes her eyes. “There is Jumis in it.” She hands you the loaf back. “Take the rest where you have to. The bog is a long way.”',
      'Krišs breaks off a corner, breathes it in, and closes his eyes. “There is Jumis in it.” He hands you the loaf back. “Take the rest where you have to. The bog is a long way.”',
    ),
    good: B(
      'Ilze atlauž stūrīti un nogaršo. «Laba maize.» Klaipu viņa tev atdod. «Pārējo nes, kur tev jānes. Purvs ir tālu.»',
      'Krišs atlauž stūrīti un nogaršo. «Laba maize.» Klaipu viņš tev atdod. «Pārējo nes, kur tev jānes. Purvs ir tālu.»',
      'Ilze breaks off a corner and tastes it. “Good bread.” She hands you the loaf back. “Take the rest where you have to. The bog is a long way.”',
      'Krišs breaks off a corner and tastes it. “Good bread.” He hands you the loaf back. “Take the rest where you have to. The bog is a long way.”',
    ),
    thin: B(
      'Ilze atlauž stūrīti un ilgi košļā. «Smaga.» Bet viņa to apēd līdz galam, un tas ir vairāk, nekā tu gaidīji.',
      'Krišs atlauž stūrīti un ilgi košļā. «Smaga.» Bet viņš to apēd līdz galam, un tas ir vairāk, nekā tu gaidīji.',
      'Ilze breaks off a corner and chews a long time. “Heavy.” But she eats it to the last crumb, and that is more than you expected.',
      'Krišs breaks off a corner and chews a long time. “Heavy.” But he eats it to the last crumb, and that is more than you expected.',
    ),
    again: S('«Tu jau man devi. Glabā to.»', '“You have given me some already. Keep it.”'),
  },

  /** Home from the bog, in the evening. */
  evening: {
    open: B(
      'Ilze sēž uz sliekšņa, kas vēl silts no dienas. Ieraudzījusi tevi, viņa paceļas.',
      'Krišs sēž uz bluķa, kas vēl silts no dienas. Ieraudzījis tevi, viņš paceļas.',
      'Ilze is sitting on the doorstep, still warm from the day. When she sees you she gets up.',
      'Krišs is sitting on the chopping block, still warm from the day. When he sees you he gets up.',
    ),
    devilGone: S(
      '«Saka, ka viņš aizgāja no purva. Līdz Jāņiem, bet aizgāja. Tevis dēļ.» Acīs ir kas tāds, ko tu agrāk neesi redzējis.',
      '“They say he has gone off the bog. Till Jāņi, but gone. Because of you.” There is something in those eyes you have not seen before.',
    ),
    catLost: S(
      '«Kur kaķis?» Klusums. «Tu viņu atdevi.» Un tālāk saruna neiet tik viegli.',
      '“Where is the cat?” Silence. “You gave it away.” And after that the talk does not come so easily.',
    ),
    hat: S(
      '«Velna cepure?!» Smiekli, un tad roka pie mutes. «Tu ar viņu runāji kā ar līdzīgu.»',
      '“The Devil’s hat?!” A laugh, then a hand over the mouth. “You talked to him as an equal.”',
    ),
    dawn: S(
      '«Tu gaidīji līdz gaiļiem? Visu nakti purvā?» Galva papurinās. «Un tomēr pārnāci.»',
      '“You waited for the cocks? All night on the bog?” A shake of the head. “And still you came home.”',
    ),
    plain: S('«Tu pārnāci.» Ar to pietiek.', '“You came home.” That is enough.'),
    /** Close enough to be asked. */
    invite: B(
      '«Miķeļos pie Kalējiem būs danči.» Ilze to saka, skatīdamās uz strautu, ne uz tevi. «Ja tu nāktu…»',
      '«Miķeļos pie Kalējiem būs danči.» Krišs to saka, skatīdamies uz strautu, ne uz tevi. «Ja tu nāktu…»',
      '“On Miķeļi — Michaelmas — there’ll be dancing at Kalēji.” Ilze says it looking at the stream, not at you. “If you came…”',
      '“On Miķeļi — Michaelmas — there’ll be dancing at Kalēji.” Krišs says it looking at the stream, not at you. “If you came…”',
    ),
    inviteChoices: {
      yes: S('Nākšu.', 'I will come.'),
      maybe: S('Redzēs.', 'We will see.'),
    },
    yes: B('Ilze pamāj. Tikai vienreiz, bet ar to pietiek.', 'Krišs pamāj. Tikai vienreiz, bet ar to pietiek.', 'Ilze nods. Just once, but that is enough.', 'Krišs nods. Just once, but that is enough.'),
    maybe: S('«Redzēs,» atkārto. «Labi.»', '“We will see,” comes the echo. “All right.”'),
    /** Not close enough. */
    goodnight: S('«Ar labu nakti.» Durvis aizveras.', '“Good night.” The door closes.'),
  },

  /** Spoken to with nothing new to say, by where the year is. */
  idle: {
    beforeField: S('«Lauks gaida. Es arī gribu redzēt, kā tev ies.»', '“The field is waiting. And I want to see how you get on.”'),
    beforeFieldCold: S('«Ej nu, ej.»', '“Go on, then.”'),
    beforeBog: S('«Purvā naktīs deg ugunis. Neej tām pakaļ.»', '“Lights burn on the bog at night. Do not follow them.”'),
    after: S('«Rīt. Rīt parunāsim.»', '“Tomorrow. We will talk tomorrow.”'),
  },

  /** Things from the bag, shown to them. */
  replies: {
    sickle: S('«Ar sirpi pie manis nenāk.» Bet asmenim tiek uzmests vērtējošs skatiens. «Ass gan.»', '“You do not come to me with a sickle.” But the blade gets an appraising look. “Sharp, though.”'),
    cat: S('Kaķis ļauj sevi pakasīt aiz auss un izliekas, ka tas ir viņa labā.', 'The cat allows itself to be scratched behind the ear and pretends it is doing everyone a favour.'),
    hat: S('«Nes prom! Tā smird pēc purva.» Bet ziņkārība ir lielāka par riebumu.', '“Take it away! It reeks of the bog.” But curiosity is stronger than disgust.'),
  },

  /** At the stone, at the end of the year — by how close they came. */
  ending: {
    close: B(
      'Ilze stāv tev blakus pie akmens. Rudenī būs danči, un tu jau zini, ar ko dejosi.',
      'Krišs stāv tev blakus pie akmens. Rudenī būs danči, un tu jau zini, ar ko dejosi.',
      'Ilze is standing beside you at the stone. There will be dancing in the autumn, and you already know who you will dance with.',
      'Krišs is standing beside you at the stone. There will be dancing in the autumn, and you already know who you will dance with.',
    ),
    warm: B(
      'No sliekšņa tev pamāj Ilze. Varbūt nākamgad.',
      'No šķūņa durvīm tev pamāj Krišs. Varbūt nākamgad.',
      'From her doorstep, Ilze waves to you. Next year, perhaps.',
      'From the shed door, Krišs waves to you. Next year, perhaps.',
    ),
    cold: B(
      'Ilzes logs šovakar ir tumšs.',
      'Kalēju šķūņa durvis šovakar ir ciet.',
      'Ilze’s window is dark tonight.',
      'The door of the smithy shed is shut tonight.',
    ),
  },
};
