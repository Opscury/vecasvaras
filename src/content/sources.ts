/**
 * The printed sources the game quotes, copied verbatim from the digital
 * editions at valoda.ailab.lv/folklora/ (Sept 2026), with the print's
 * line-break hyphens joined — nothing else touched.
 *
 * The game never imports this. It is here so `lore.test.ts` can check that
 * every verse, belief and riddle the game presents as folklore really is in
 * the source it cites. Change a quote in the game and the test tells you if
 * it has drifted from its record; add a new one and it must be added here too.
 *
 * P. Šmits, «Latviešu tautas ticējumi», I–IV (Rīga, 1940–41):
 *   https://valoda.ailab.lv/folklora/ticejumi/
 * P. Šmits, «Latviešu pasakas un teikas», I–XV (Rīga, 1925–37):
 *   https://valoda.ailab.lv/folklora/pasakas/
 */

/** Šmits, «Latviešu tautas ticējumi», by record number. */
export const TICEJUMI: Record<string, string> = {
  '11991':
    "Beidzot pļaut, runā par Jumja saņemšanu, parasti tā runā, kad beidz rudzus pļaut. Par Jumi saukuši pēdējo kūlīti, arī tieši pašu pēdējo sauju. Divas vārpas, kas saaugušas uz viena salma, arī saukuši par Jumi. Jauni ļaudis centušies atrast tādas saaugušas vārpas, tā esot zīme, ka tādas vārpas atradējs ātri apprecēsies. Par Jumi saukuši arī tos dzīvnieciņus, kas bēguši ārā no pēdējā bara. Arī tārpiņus un visādus vagulīšus, kas bijuši zem pēdējā kūļa, saukuši par Jumi. Beidzamo bara daļu pļāvuši steidzīgi no visām pusēm, lai Jumis neizbēgtu. Bieži no pēdējā bara bēg peles, vardes un citi kustoņi, tos tad arī saukuši par Jumi. Ja atrastais kukainītis bijis skaists, tad meitas teikušas, viņām būšot skaisti vīri. Ja saka: \"Mēs jau sajēmām Jumi\", tad tas nozīmē, ka beiguši pļaut. /B. Eriņa, Latgale./",
  '11992':
    "Pļaujas beigās lauka vidū atstāj nenopļautu mazu pauguriņu. Atstātos rudzos pļāvēji izravē visas nezāles, un saimnieks vai vecākais puisis vārpas sasien mezglā. Katrs pļāvējs izvēlas sev vienu stiebru un vēro, vai kādi sabaidīti kukainīši pa to nerāpuļo. Ja atrod kādu kukainīti, kas kāpj uz augšu un paslēpjas sasējumā, tad neprecējies apprecēsies, precēts dabūs kādu mājas lopu. Pēc šī kukainīša izskata vēro par nākamo līgavu jeb dabūjamo mājas lopu; pēc gaitas par gaidāmā notikuma ātrumu. Ja kukainītis drīz atgriežas, viss paliks bez pārmaiņām. Ja kukainītis nokāpj zemē, kas notiek ļoti reti, tad zīlētājam jāmirst. Pēc katras pļāvas beigšanas apsēstas un piemin Jumi, lai nākošā gadā nesāpētu mugura. Jumi izrauj, nes mājā, vai noliek pie statiem. Viņu paglabā klētī, tad rodas svētība, pilna klēts labības. /P. Retelis, Latvis, 1930. g. 21. aug./",
  '11998':
    "Jumja vārpu vajagot glabāt klētī aiz sijas, tad tur guļot klāt pūķis, kas velk bagātību klētī. /Atpūta, 1932, 404, 21./",
  '12002':
    "Kur, Jumīti, tu gulēji Šo garo vasariņu? - Tīrumiņa vidiņā Zem pelēku akmentiņu. /LD 28543. Sal. 28513-59./",
  '18623':
    "Maizes kukuli nekad nedrīkst likt ar virsējo garozu uz leju, jo tad Dievs soda ar badu. /V. Bērziņa, Priekule./",
  '19325':
    "Pie mums [Vidzemē] citiem saimniekiem ir elkadievi, ko sauc par mājas kungiem. Šiem ir mājas vieta vai kādā kokā, vai kādā vecā krāsmatā, vai sētmalā, vai pašu laukā kādā akmenī. Šās vietas ir cienījamas saimniekam, kas mājas kungus tura, un tur citi nedrīkst pieiet klāt. Pats saimnieks tur tos mielo, upurus nesdams, Jurģa dienā, Miķēļa dienā un vēl daudz citās dienās. Brandavīns un jauns alus šiem gauži patīkot, un to izlej tai cienījamā vietā. Cits noslaktē gaili un ierok turpat līdzās, un cits atkal dzīvu gaili ierokot zemē. Blēņu ticīgi ļaudis saka: šie mājas kungi esot ļauni gari, ko vajagot apmielot, lai pie mājas nedarot nekādu skādi. /Latv. ļaužu draugs, 1836. 81./",
  '19340':
    "Katru reiz, kad liek uz galda bļodu, vajaga ar karoti drusku ēdiena nomest zemē Mājas kungam. Vecos laikos katrreiz, darbu sākot un beidzot, vajadzējis dot ziedu Mājas kungam, kuru cienājuši vai nu mājinieki mājā vai visi radinieki pie kāda koka. Ja saimniece vāra kādu ēdienu jeb cep maizi, pirmais kumoss arvien bijis jādod šim garam. Ja svinējuši Ziemassvētkus, Jāņa dienu jeb citus svētkus, jeb vīkšuši kādas bēres vai kristības, garam bijis jāatmet gardākais kumoss, labākais dzēriens. Ja tas nav ievērots jeb arī aizmirsts, tad Mājas kungs uzsūtījis lielu nelaimi, pat nāvi. /F. Brīvzemnieks, 1881, VI, 207./",
  '24910':
    "Ēdat, govis, purva zāli, Nedzeŗt purva ūdentiņu: Velna bērni piebradāj'ši Spalvainām kājiņām. /LD 28994./",
  '28643':
    "Kad dažkārt mazi uguntiņi purvu virsū rādās, tad saka, ka vells caur tādām svecēm ļaudis gribot pievilt. /W. Maczewski, Spred. gr. 1793, 698./",
  '28650':
    "Ja nakti purvainās vietās parādās maldugunis (spīgaiņi), tad sagaidāms pērkona negaiss. /V. Greble, Litene./",
  '32406':
    "Gaiļi ar dziedāšanu varot padzīt velnu un viņa garus . Tiklīdz gaiļi pret rītu sākot dziedāt, viņam jāejot projām . Tādēļ arī ļaudis tic, ka agrāki nevarot izceļot, kamēr vēl gaiļi neesot dziedājuši, jo tad varot būt droši no velniem un ļauniem gariem. /P. Einhorns, 1627./",
  '21224':
    "Ja mīklas min, tad velns aiz stūra klausās. /H. Siliņa, Penkule./",
};

/** Šmits, «Latviešu pasakas un teikas»: the passages quoted or drawn on. */
export const TEIKAS = {
  /** XV, «Kalni» 14, «Naudas kalns» by Vecpiebalga (Dzintariņš, «Balss», 1896, 16). */
  alauksts: "Jau agrāk velns bijis nodomājis pār Alauksta ezeru tiltu taisīt, bet tikai ar tādu nolīgumu, ka deviņi pār to var pāriet, bet desmitam Dievs to neļāvis. Tagad Dievs bijis mierā un velns apsolījies vienā naktī, pirms gailis dziedās, tiltu uztaisīt. Naudas mucu atstājis uz krasta, bet lai Dievs to nepamanītu, uzbēris vienu cepuri zemes un tad aizsteidzies pie darba. Dievs, redzēdams, ka viņa nodoms, velna naudu paņemt, neizdosies, apaudzējis tās zemes, kuras velns uzbēris uz naudas mucas, ar kokiem un zāli tā, kā to vietu vairs nekā nevarējis pazīt, un tad lai velns nevarētu tiltu uztaisīt, gājis gaili celt. Velns pa to laiku strādājis vienos sviedros. Pielasījis vienu klēpi akmeņu un iebēris ezerā. Tāpat arī otru. Ar trešo jau bijis ezera tuvumā, tad gailis dziedājis.",
  /** X, «Velna uzdotās mīklas» 2 (A. 812), Valtenberga parish, Valmiera district. */
  devilsRiddles: "Došu jums abiem mīklas minēt, un kurš nevarēs atminēt manas mīklas, to ņemšu līdz. Kas ir saldāks par medu?\" jautā viņš dēlam. \"Miegs.\" \"Jā, bet kas ir mīkstāks par spilvenu?\" \"Mātes klēpis.\" \"Arī pareizi. Tu esi brīvs un vari iet.\" Tagad melnais kungs liek čigānam minēt. \"Kas skrien ātrāki par vēju?\" jautā melnais kungs čigānam. Tas paskatas uz savu veco, stīvo zirgu un uz to ar džindžālu rādīdams saka: \"Mans zirgs.\"",
  /** VII, «Pateicīgie kustoņi» 19 (A. 554): the Devil's bridge falls at cockcrow. */
  bridgeAtCockcrow: "Noskārta velns: pāri gan netiks šai jūŗai, loba tad atpakaļ, atvilka visu nocirsto mežu un sāks tikai tiltu celt jūŗai pāri. Uzcēla tiltu, dzinās krauklim pa jūŗu pakaļ, te itin piepēži gailis iedziedājās. Tūliņ sabruka tilts un velns vidū jūŗā noslīka.",
} as const;

/** Riddle collections, each riddle as printed with its answer. */
export const MIKLAS = {
  /**
   * I. Kalniņa, «Latviešu tautas mīklas – lieliem un maziem» (Avots, 2015), as
   * reprinted at e-biblioteka.lv/latviesu-miklas-berniem/miklas-par-dabu/.
   */
  kalnina2015: ['Bez kājām, bez rokām, bet durvis attaisa. (vējš)'],
  /**
   * «Latviešu bērnu folklora», as reprinted in D. Kindzule, «Latviešu tautas
   * mīklas» (Rēzeknes pamatskola, 2022), riac.lv — nos. 11, 23 and 40.
   */
  bernuFolklora: [
    'Bez roku, bez kāju Tiltu taisa. Sals',
    'Vīrs niķu, niķiem, Svārki stiķu, stiķiem, Kaula deguns, gaļas bārda. Gailis',
    'Kas saldāks par medu un stiprāks par lauvu? Miegs',
  ],
} as const;
