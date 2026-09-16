# Vecās Varas

A short point-and-click game about paying what you owe to the old powers of
Latvian folklore. You are a villager. You go out past the fence, you meet
something older than the village, and what you bring back — or fail to bring
back — changes the place you came from.

This repository is the **vertical slice**: one village hub and two complete
encounters, roughly 5–10 minutes of play, in Latvian and English.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # serve the production build
npm test         # the rules, the field model and old saves
node tools/shot.mjs <script>   # headless screenshots of a route — see tools/shots/README.md
```

Node 20.19+ (Vite 7).

## What is in the slice

**The village.** An elevated three-quarter view of a forest clearing with two
visible absences: a bare granary foundation and a broken bridge over the
stream. Those two holes are the whole design. Every encounter fills one, and
how well you fill it is visible from the moment you walk back in.

**Encounter one — Jumis, in the rye.** Daylight, flat Zemgale farmland, and a
day's work: the sickle comes out of the bag and goes across the rye, and a sheaf
count at the top of the frame rises as the field comes down. One stem carries two
ears. The player decides when the day is done (*Pietiek*), and the field is read
as it was left:

| What was done | Called | The year |
|---|---|---|
| cut around the double ear, then **bent it down and tied it** (drag down) | *leave* — the tithe | whole share, full granary, honest loaf |
| cut around it, then **pulled it up and carried it home** (drag up) | *take* — Jumja ķeršana | whole share, a granary one loaf lighter, **a loaf with Jumis in it** |
| **put the blade through it** (drag across, after one warning) | *all* | poor: the biggest cart, the least bread, a thin loaf |
| stopped with **a third of the field or more** still standing (asked once) | *spare* | poor the other way: good bread, too little of it |

The last choice is a gesture on the ear, not a menu; the list only appears after
a pause or two taps. Taking Jumis home is a real custom, so it is scored as a
different good rather than a lesser one. The cart is counted again in Anna's
yard and threshed into bread in front of the player (3 / 2 / 1 loaves), so the
tithed cart — a sheaf short — is the one that fills the row.

**Encounter two — Velns, at the bog.** Dusk, cold, and a negotiation. The
causeway first: three planks hold and two hummocks do not, a wrong step or a leap
puts you back on the bank, a bog light (*maldugunis*) settles over a hummock to
invite the wrong one, and a frog croaks from the plank that will hold. If the cat
came along it walks out ahead, on the right planks, and hops back into the bag
when it sees who is sitting there. He notices it.

Then the riddle, and the bog answers it first — a gust across the reeds. Get it
right and you may ask him one back, which rattles him into working faster; get
it wrong and he wants another go. Once the terms are spoken he starts building,
a plank at a time, while the bag is open and the bargain unsettled. The list of
options comes up after twenty seconds, the east greys after forty, and the cocks
crow at seventy-two whether or not anything was paid.

**The link between them.** Every way of settling has a price:

| Sent over first | The bridge | And |
|---|---|---|
| the cat | whole (poor if both riddles were fumbled) | the cat goes with him — an empty doorstep all year |
| bread from a field that kept its share | whole (poor if both riddles were fumbled) | the cat sleeps on its step |
| bread with Jumis in it | whole, riddles or not | he bows to the loaf and leaves the bog for good |
| bread from a stripped field | two logs and some planks | "viltota nauda" |
| yourself | two logs and some planks | |
| nothing, till dawn | two logs and some planks | the unpaid planks sink |

So the first encounter is a *resource* for the second: what you left in the
field decides which of your good answers costs something living.

No combat, no death, no failure state. The worst outcome is a poorer village.

**The bag.** A linen shoulder bag hangs in the bottom-right corner once there
is something in it. Click it to open, click an item to take it in hand, then
click the thing in the world you want to use it on — the old point-and-click
contract, because it is the one every player already knows. Right-click or
click the bag again to put it back, and the item visibly flies home. Pickups fly
from the world into the bag, and hovering an item shows what it is — for the
loaf, what kind of year it was baked in, which is the whole bog puzzle.

**Keyboard.** Space or Enter does what a click does; the number keys pick a
choice. Tab / Shift+Tab walk the hotspots and Enter uses the focused one. B opens
the bag, the number keys take an item, Enter uses it, Escape puts it back. H (or
the ⟲ chip) shows everything said so far in the scene, T (or the ◇ chip) the
beliefs, M mutes. In the field, with the sickle in hand, Enter cuts the next
piece still standing and P says the day is done; Tab to the double ear and Enter
gives the choice as a list, or cuts it if the sickle is in hand. Escape skips the
intro. The game can be finished without a mouse.

Three items, and each exists to make a moment concrete rather than to be a
subsystem:

- **The sickle** hangs under the lean-to in the village. You cannot walk to the
  field without it, and the harvest is done with it, stroke by stroke — the
  difference between picking an option and doing a day's work.
- **The rye loaf** is baked from the harvest and lands in your bag on the way
  home. It is the offering the bog demands, and its worth depends on how you
  handled Jumis.
- **The village cat** sits on a doorstep and can be picked up. Nothing forces
  you to, and nobody says what it is for. At the bog it goes ahead of you on the
  planks, and it is the classic Devil's-Bridge answer — which is exactly why
  giving it away is a decision.

At the bog the bargain is settled the way the field is: with your hands. Hand
the cat or the loaf over straight out of the bag, or step onto the new planks
yourself. The bag glows while he waits; the list of options (the cat only if you
brought it) is the fallback, not the first offer.

**How the game tells you how you did.** After each encounter the screen darkens
and a mark is carved: the Jumis sign, or the crossing. A debt paid in full gets
a whole mark, cut deep and warm gold. A debt half paid gets the *same* mark,
left unfinished — the crossing literally stops halfway over the water. Under it,
three lines: whether the spirit is satisfied, what you are walking home with,
and — only when you fell short — what you should have done instead and what it
would have got you. That last line is the important one. "You did badly" is not
feedback; *"the bread was thin because the field was left bare, with a full
granary behind it that argument would have held"* is. A good answer that still
cost something — the cat, or the loaf Jumis takes back out of the granary — says
its price on a fourth line.

The card cannot be clicked away until the verdict is on screen, because a
player who has been click-advancing narration for a minute will otherwise skip
straight past their own result.

Walking back into the village, the first line spoken names what changed, so the
choice you made three clicks ago is connected to the building that is suddenly
on the foundation. And the ending opens with a tally: both marks side by side,
each whole or broken, a line per debt, and the total said plainly.

**The village keeps the record.** On the walk home each new mark is carved
large above the rune stone and set into its face; earlier years' marks sit above
it, fainter. The granary and bridge settle in only when they are new. The
chimneys smoke as the granary allows, and after the bog it is evening, with one
lit window and one more per loaf. The cat goes back to its doorstep and
sleeps — or the doorstep stays empty. The field can be walked back out to and
looked at, exactly as it was cut. And the stone text says everyone gives it the
first crumb of the first loaf: bread used on the stone does just that. Items
used on the wrong thing get their own answers.

**Beliefs.** Each custom the game is built on is recorded as the player meets it
— the ◇ chip or T opens the page, *Ticējumi 4 / 7*, with a hint where each
missing one is found.

**The year.** The ending shows both marks, the bread and the cat, and the total
said plainly. *Nākamais gads* writes the year into the stone's ledger and starts
the next one with a short intro and a short greeting; the verse cards, the bag's
introduction and the beliefs found are kept. *Dalīties* renders the year as a
1200×630 picture for the system share sheet, or downloads it.

## Layout

```
src/
  main.ts              Phaser config and scene registry
  core/
    i18n.ts            the { lv, en } text layer and language switching
    flags.ts           query-string switches (?fx=off)
    inventory.ts       what the villager is carrying
    rules.ts           the encounter branch table — pure, tested
    rules.test.ts      every route a player can take, end to end
    field.ts           the field as a grid: how much is down, saved for the revisit
    holdings.ts        bread and roads, as the corner panel counts them
    ledger.ts          the stone's record of finished years
    lore.ts            which beliefs have been found
    once.ts            things shown once per install (verse cards, the bag's card)
    state.ts           run state + localStorage persistence (save.v3)
    theme.ts           palette, fonts, layout constants
  content/
    script.ts          every player-facing line, both languages
    elder.ts           everything Vecā Anna says
    ticejumi.ts        the beliefs page — SEE THE WARNING BELOW
    dainas.ts          the epigraphs — SEE THE WARNING BELOW
  scenes/              Boot, Title, Intro, Village, Jumis, Velns, Outro
    transition.ts      fade to the next scene, guarded so a double-click cannot start it twice
    villageArt.ts      chimneys and the granary/bridge upgrades, shared by hub, intro and ending
    assets.ts          what loads before the title (one image) and what loads behind it
  fx/
    Atmosphere.ts      fog, motes, chimney smoke, birds, bog lights, drift
    WindPipeline.ts    the shader that moves the rye
    textures.ts        every particle texture, drawn at boot rather than shipped
  ui/
    Bag.ts             the inventory: open it, take an item, use it on the world
    Narration.ts       the typewriter panel, choice list, and per-scene line history
    Hotspot.ts         clickable regions on painted backgrounds
    DainaCard.ts       the epigraph card that opens each encounter
    Reckoning.ts       the verdict card shown after an encounter
    Sign.ts            the carved marks, drawn as vector paths
    Chrome.ts          the language toggle, ♪, ⟲ history and the ◇ beliefs chip
    Lore.ts            the beliefs page, and the card when one is found
    SheafTally.ts      the sheaf count in the field and the threshing in Anna's yard
    Holdings.ts        the bread and roads panel in the corner
    ShareCard.ts       the year as a picture, for the share sheet
    History.ts         the page of everything said so far in a scene
    KeyNav.ts          Tab/Enter across hotspots — the keyboard path through the world
    keys.ts            who took a key: shared keyboard state for one scene
    hit.ts             fixed-size hit boxes for text buttons, so they survive a phone's scale
    Painting.ts        the background plus everything set into it, drifted as one
    Prompt.ts          the one-line instruction at the top of the frame
public/art/            backgrounds, scene sprites and item art
public/audio/          one-shots, beds and the kokle lines — see AUDIO_NOTES.md
tools/shot.mjs         the headless screenshot harness; routes in tools/shots/
tools/build_synth.py   the kokle lines and the synthesised one-shots
```

Two conventions worth keeping as this grows:

- **No literal strings in scenes.** Everything is a `Loc` from `content/`, so
  the game stays translatable and a proofreader only ever opens one file.
- **Rules are separate from presentation.** `core/rules.ts` decides outcomes and
  is unit-tested in milliseconds; the scenes only decide how that *looks*.
  Adding an encounter means adding a rule function and a test, then a scene.

## ⚠ Before any public release: verify the dainas

`src/content/dainas.ts` contains the two epigraphs, and **they have not been
checked against a primary source.** Traditional dainas are public domain, so
there is no clearance problem — the risk is purely accuracy, and a misquoted
daina in a VKKF application is the kind of thing a Latvian reviewer spots
immediately.

Open each entry's `source` URL, copy the stanza verbatim, paste it over the
`lv` field, adjust the English, and set `verified: true`. Nothing else needs to
change. While any entry is unverified the dev console prints a warning on every
boot, so it is hard to forget.

The riddles in `content/script.ts` deserve the same treatment: `velns.riddle`
(the wind), `velns.riddle2` (what is faster than the wind — thought) and
`velns.askBack.riddle` (what sings and the night is over — the cock, which he
will not name). The second and third were written for this game in the shape of
traditional *mīklas*; either find attested versions or keep them as the game's own.

**`src/content/ticejumi.ts` is under the same gate.** The seven beliefs are real
and widely attested, but the wording is this game's summary, not a quotation.
Match each to a record in Šmits, put the record number in `ref`, set
`verified: true`, and the page starts showing "after Šmits, no. …" for it.
Nothing unverified is ever shown as a citation.

**All of the new Latvian text wants a native proofread** before release —
the lines marked `// NEW` in `content/` especially.

Primary sources:

- [dainuskapis.lv](https://dainuskapis.lv) — the Barons cabinet, authoritative
- [tautasdziesmas.lv](https://tautasdziesmas.lv) — readable browsing by theme
- [valoda.ailab.lv/folklora/ticejumi](http://valoda.ailab.lv/folklora/ticejumi) — Šmits' folk beliefs, the source of the puzzle logic

## Rights

- Traditional dainas, ticējumi, pasakas, and the named folklore figures (Jumis,
  Velns) are public domain. No clearance needed.
- Modern authors and illustrators — Anna Sakse, Margarita Stāraste, Māra Zālīte
  — are **not**. Nothing from them is used here.
- Pumpurs' 1888 *Lāčplēsis* is public domain; the English translations are not.
  Neither is used in this slice.
- The backgrounds and sprites in `public/art/` are AI-generated for this
  project, styled after Latvian national-romantic landscape painting
  (Purvītis d. 1945, Rozentāls d. 1916 — both public domain) as a palette and
  brush reference, not as reused assets.

## Making stills feel alive

Every scene is one painted image, which is a deliberate constraint — no walk
cycles means no character-consistency problem across frames. The cost is that a
still image reads as a slide unless something in it moves, so each scene gets
ambient motion from `src/fx/`, tuned to its own mood:

| Scene | What moves |
| --- | --- |
| Title | mist rolling through the spruces at two speeds, slow push toward the stone, birds |
| Village | **chimney smoke**, high haze on the treeline, a lower haze over the common, birds, pollen |
| Field | **the rye itself**, via a displacement shader; chaff on the wind, the double ear swaying |
| Bog | mist sliding over black water, wandering bog lights, the Devil breathing |
| Outro | the village as you left it, still smoking |

`?fx=off` turns all of it off — useful for testing, for profiling, and as a
fallback on a machine that chokes on the full-screen blend passes.

One number worth calling out: `fog({ speed })` is **how long one full screen
width of drift takes, in milliseconds**. An early version multiplied by delta
*and* by 60, which made the same number mean about 1500px a second and turned
the title screen into a wind tunnel.

Three rules held throughout. Nothing moves fast — slow enough to read as weather,
not as an effect. (The first pass took that too far: fog that needed two minutes
to cross the frame, and dust screen-blended onto bright ground, measured as
almost no change in the picture, and a playtester saw only the chimney smoke.
Speeds, opacities, mote size and wind strength were all raised after that.) Layers move at different speeds and directions, or the parallax reads
as one flat sheet sliding. And anything warm and bright is used sparingly,
because it pulls focus hard.

Two implementation notes worth keeping:

- **The fog textures are generated at boot, not shipped.** Blobs are drawn
  three times (at x, x−w, x+w) so the band tiles horizontally with no seam, and
  the alpha is feathered top and bottom so the sheet has no straight edge. A fog
  layer with a hard edge reads as a grey rectangle laid over the painting, which
  is exactly what it is and exactly what the player must never notice.
- **The wind is a post-FX pipeline** (`WindPipeline.ts`), summing two
  non-harmonic travelling waves under a slow gust envelope, ramped in below a
  horizon line so the sky and treeline stay rock steady. It is WebGL-only and
  `attachWind` no-ops on a Canvas fallback, so the game still runs (just still)
  on a machine without it. It is attached to the scene's `Painting` group, not
  the camera, so the text and cards drawn over the field stay still.
- **The drift moves the painting and everything set into it together**
  (`ui/Painting.ts`). Drifting the bare background slid it out from under the
  granary, the bridge and the Devil by up to twenty pixels at the frame edges.

## Other deliberate constraints

- **Single-screen scenes, no character movement.** No walk cycle, no player
  avatar.
- **Painted stills with hotspots.** Sprites added on top are tinted into the
  painting's own light; untinted cutouts read as stickers immediately.
- **The panel folds away when nothing is being said.** Half the clickable world
  lives in the bottom third of these paintings.
- **`crossing` is not a traditional sign.** The Jumis mark is the real Jumja
  zīme. The crossing glyph is invented, built in the same straight-line language
  so it sits beside the real one without pretending to be folklore. Keep that
  distinction if you add more marks.

## Still open

- Final subdomain / repo name (`vecasvaras.protu.lv` assumed — it is also printed
  on the share card, in `OutroScene.ts`).
- The daina, riddle and ticējumi verification above, and a Latvian proofread.
- The sung verses: each verse card has a slot for one sung line over the kokle
  (`voiceJumis` / `voiceVelns` in `core/audio.ts`). It needs a singer.
- A playthrough on a real phone.
- A written design document covering the full game vision, for VKKF and
  publisher conversations — the demo is the proof, not the pitch.
