# Folklore ledger

Everything Senciems presents as tradition, and what it rests on. Checked in
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

**Shown to players** as «Avoti»: the last spread of the beliefs book, a small
link on the title screen, and the static page at `/avoti/` (rendered at build
time from `src/content/avoti.ts`, Latvian first, `?lang=en` for English). It
lists every item below with its citation, and names the story's own
inventions — the open questions further down — as the game's own.

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

## Apjumības — the feast at the end of chapter one (October 2026)

The outro now plays a short harvest-home feast before the tally. The brief
asked for the Jumis sheaf to go up over the table, and for that custom to be
**checked against Šmits before being written as tradition**. It was checked,
against the full Jumis section of «Latviešu tautas ticējumi»
([jumis.htm](https://valoda.ailab.lv/folklora/ticejumi/jumis.htm), read 24 Oct
2026, windows-1257).

| What the feast says | Status | Source |
|---|---|---|
| A wreath of ears is woven from the last of the rye | ✅ | Šmits **11989**: «Pļāvējam bija jānovij vaiņagi no pļaujamās labības, Jumja ņemot.» |
| …and goes to whoever the house belongs to | ✅ | Šmits **11990**: «Mājas saimniekam pasniedz vārpu vaiņagu un jostu.» In the game the house is Anna's, so she wears it. |
| The last stalks stay standing in the field, decked | ✅ | Šmits **11990**: «Atstāj tīrumā pēdējos rudzu steibrus un appušķo to ar puķēm.» |
| The Jumis ear is kept in the granary | ✅ | Šmits **11998** (already quoted, and already the granary sprite) |
| **The double ear hung over the feast table** | ❌ **not found** — the game's own | Not in 11989–12035. The records keep it in the granary behind a beam (11998), wedge it into a crack in the wall (11997), or weave it into the wreath (11989, 11990). Listed in «Avoti» as `stasts:overTable`. |

Both new records are in `sources.ts` verbatim, line-break hyphens joined.
**11989** is kept whole for the sake of its last sentence.

Also found and **deliberately not used**: Šmits **11995** is the fullest feast
record there is — the host at the head of the table in a wreath of ears, the
first drop and the first bites of meat and flatbread poured under the table
for Jumis, «apēda, zināms, suņi». It is a record of **Miķeļa diena**, not of
the end of the rye harvest, so it belongs to chapter two and is left for it.
Using it here would be the same mistake as the mislabelled *Jumja ķeršana*
further up this file.

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
- **The jug of beer owed at Jāņi** (`velns.jug`, Nov 2026). He names it at
  every ending of the bargain, and it is the game's own: the records have him
  striking bargains and losing them, but no debt of beer, and no legend that
  sends him back for payment at midsummer. Listed in «Avoti» as `stasts:jug`.
  It exists so that nothing in chapter one can say he is gone for good — he is
  a comic rogue who comes back every chapter, and a loaf with Jumis in it
  chases him off **until Jāņi**, not for ever.

## Still to do by a human

- Confirm LD 28543 and LD 28994 at dainuskapis.lv (bot-checked from here).
- A native proofread of the lines marked `NEW` in `src/content/`.

---

## Spoken in the story (October 2026)

- **The double ear and marriage** — Ilze or Krišs, after the harvest: *«Vecie
  saka: kas tādas atrod, tas drīz apprecēsies.»* Retold in dialogue from
  **Šmits 11991** (B. Eriņa, Latgale): «Jauni ļaudis centušies atrast tādas
  saaugušas vārpas, tā esot zīme, ka tādas vārpas atradējs ātri
  apprecēsies.» Listed in «Avoti» with the record quoted in the note.
- **Ilze's woven crown** is part of her costume only. The game says nothing
  about what it means, so it makes no claim to source.
- **Ilze, Krišs, the dancing after Michaelmas** — the game's own story; listed
  as such.

---

## Cards (October 2026, after the family playtest)

Players finished the demo without knowing who Jumis or the Devil were. Each
encounter now opens with a «Pirms ceļa» card (`src/content/primer.ts`) that
**retells** the records in plain words — it is the game talking, not a
quotation, and it says so in «Avoti» (`karte:jumis`, `karte:velns`).

| Card | Rests on | The game's own wording |
|---|---|---|
| Jumis | Šmits 11991 (double ear is Jumis), 11992 (uncut patch, ears tied in a knot), 11998 (kept in the granary); LD 28543 (he sleeps in the field) | «labības svētība» / “the blessing of the grain” |
| Velns | LPT X «Velna uzdotās mīklas» (riddles, bargains), LPT XV «Kalni» 14 (bridge in one night before cockcrow), Šmits 32406 (cockcrow drives him off) | «purva viltnieks, nevis ļaunuma valdnieks» / “the bog devil — more fool than fiend” (the English style guide's wording, not a translation of the Latvian) |

After each encounter the matching **ticējums** is shown in full on a card
(quoted from `ticejumi.ts`, unchanged): Jumis or Jumis klētī after the field,
Gailis or Velna tilts after the bog.
