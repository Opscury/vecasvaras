# Folklore ledger

Everything Vecās Varas presents as tradition, and what it rests on. Checked in
September 2026 against the full digital text of:

- **P. Šmits, «Latviešu tautas ticējumi»** I–IV (1940–41) —
  [valoda.ailab.lv/folklora/ticejumi](https://valoda.ailab.lv/folklora/ticejumi/), cited as *Šmits* + record number
- **P. Šmits, «Latviešu pasakas un teikas»** I–XV (1925–37) —
  [valoda.ailab.lv/folklora/pasakas](https://valoda.ailab.lv/folklora/pasakas/), cited as *LPT* + volume
- **I. Kalniņa, «Latviešu tautas mīklas – lieliem un maziem»** (Avots, 2015), as reprinted at e-biblioteka.lv
- **«Latviešu bērnu folklora»**, as reprinted in D. Kindzule, «Latviešu tautas mīklas» (Rēzeknes pamatskola, 2022)

The rule the game now follows: **a verse, belief or riddle is quoted from a
source, or it is not presented as folklore.** Story (Anna, the village, what
the Devil says) is fiction and says so by being story; anything the game
offers as *what the old people knew* is a quotation.

This is enforced, not remembered:

- `src/content/sources.ts` holds the source passages verbatim;
  `src/core/lore.test.ts` fails if any verse, belief or riddle in the game is
  not found, word for word, in the source it cites.
- An entry marked `verified: false` is left out of a production build
  altogether (`flags.draftFolklore`; `?folklore=draft` shows it for review).

**Not reachable from the build machine:** dainuskapis.lv and garamantas.lv sit
behind a bot check. Both dainas are therefore checked against Šmits, who prints
them with their Barons numbers; a human confirming LD 28543 and LD 28994 at
dainuskapis.lv would close the loop.

---

## Verses (the card that opens each encounter)

| Where | Status | Source |
|---|---|---|
| Jumis — «Kur, Jumīti, tu gulēji» | ✅ quoted | **LD 28543**, printed in Šmits 12002. Wording changed to Šmits' («Šo garo vasariņu», «Zem pelēku akmentiņu»); tautasdziesmas.lv has a variant («garaju», «pelēka akmentiņa»). |
| Velns — «Velniņš tiltu darināja…» | ❌ **invented** — removed | Not in any collection. |
| Velns — «Ēdat, govis, purva zāli» | ✅ quoted (new) | **LD 28994**, printed in Šmits 24910 (under «Purvs»). |

The card now shows the LD number under the verse.

## Beliefs (the book)

| Entry | Before | Now |
|---|---|---|
| Jumis | ✅ paraphrase of 11992 («saliņu») | Quoted: Šmits 11992 + 11991 («mazu pauguriņu … vārpas sasien mezglā»; two ears on one stalk are Jumis) |
| Jumja ķeršana | ⚠ **mislabelled** — in Šmits (11999, 12000) *Jumja ķeršana* is the end-of-harvest rite, not taking the ear home | Retitled **Jumis klētī**; quoted: Šmits 11998 (the ear kept behind the granary beam draws wealth in) |
| Maize | ✅ paraphrase | Quoted: Šmits 18623 |
| Pirmais kumoss | ❌ **not in any record** («the first crumb to those who came before») | Quoted: Šmits 19325 (the house spirit may live «pašu laukā kādā akmenī») + 19340 (the first bite of baked bread is his). The village stone and the crumb lines now say this. |
| Vadātājs | ⚠ cited 31472, which is a *spirit* leading astray, not a light | Retitled **Maldugunis**; quoted: Šmits 28643 (little lights over bogs — the Devil deceiving people «caur tādām svecēm»); the name as in 28650 |
| Velna tilts | ❌ **not Latvian** — «the first living thing to cross; send an animal» is the international Devil's-bridge tale | Quoted: LPT XV, «Kalni» 14 — the Devil promises a bridge over Lake Alauksts «vienā naktī, pirms gailis dziedās», and the cock crows. Unlocks when he starts to build. |
| Gailis | ✅ paraphrase | Quoted: Šmits 32406 |

## Riddles (the bog)

| Riddle | Before | Now |
|---|---|---|
| The Devil's first | «Bez rokām, bez kājām, bet durvis ver» — close, unsourced | «Bez kājām, bez rokām, bet durvis attaisa» — vējš. **Kalniņa 2015.** |
| The Devil's second | «Kas ir ātrāks par vēju?» — «Doma»: the question is in LPT X, but **not that answer** | «Kas ir saldāks par medu?» — «Miegs». **LPT X, «Velna uzdotās mīklas» 2**, where the Devil himself asks it. |
| The player's, asked back | «Kas dzied, un nakts ir galā?» — ❌ invented | «Vīrs niķu, niķiem, svārki stiķu, stiķiem, kaula deguns, gaļas bārda» — gailis. **Latviešu bērnu folklora.** He will not say the word: the cock is what drives him off (Šmits 32406). |

## Customs told in the story

| What the game says | Status | Source |
|---|---|---|
| Leave the double ear in a small uncut patch, ears tied in a knot | ✅ | Šmits 11992; 11989 («jāpamet arvien drusciņa labības, lai Jumi pielabinātu») |
| …«bent to the ground and tied with a twist of straw, the way the old women do» | ⚠ not in the records | Now «sasien mezglā, kā to darīja vecie». The art (stalks tied in a straw knot) already matched. |
| Cut it all and Jumis leaves | ✅ | Šmits 11989 («ja vienu vien reizi tīrums bija atstāts bez labības škumšķina, tad Jumītis bija sasirdīts un viņš vairs neatgriezās») |
| Never lay a loaf top-down | ✅ | Šmits 18623 (and 18627: then the Devil feeds on it) |
| The cocks end the Devil's night's work | ✅ | Šmits 32406; LPT XV «Kalni» 14; LPT VII «Pateicīgie kustoņi» 19 (the bridge falls at cockcrow) |
| Lights on the bog lead you astray | ✅ | Šmits 28643 |
| The first bite of new bread at the stone | ✅ (reworked) | Šmits 19325, 19340 |

## Open — needs a decision, because the fix changes the game

1. **Taking Jumis home costs a loaf.** The game says Jumis carried home «will
   eat from the granary», so the granary is one loaf lighter. Every record says
   the opposite: taken home and kept in the granary, Jumis brings «svētība,
   pilna klēts labības» (Šmits 11992), «dažādi labumi» (11997), wealth (11998);
   whoever finds him will be rich (12012) or married within the year
   (11997, 12018–12023). Related, and also the game's own: a loaf baked from
   that year sends the Devil off the bog for good.
2. **«The first living thing to cross is mine» — and the cat.** The Latvian
   legends have the Devil building a bridge in a night before the cock crows,
   but the price «first to cross», and cheating it with an animal, were not
   found in Latvian sources; they are the Central European *Teufelsbrücke*
   legend. The nearest Latvian bargain is «to atdot, kas tev mājā pirmais nāks
   pretim» — whatever first comes to meet you at home (LPT X 10015/1, 10016/1–2;
   ATU 810–812), where the man expects his old dog and it is his son.

Until these are decided, the lines stay as story — spoken by characters, not
put in the book — and nothing in the book claims them.

## Also the game's own, and presented as such

- **The crossing mark** on the reckoning card is invented (see README); the
  Jumis mark is the traditional Jumja zīme.
- **The Devil's hat**, the bread argument, Anna, the village and its people:
  fiction.

## Still to do by a human

- Confirm LD 28543 and LD 28994 at dainuskapis.lv (bot-checked from here).
- A native proofread of the lines marked `NEW` in `src/content/`.
