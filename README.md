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
npm test         # the encounter branch table
```

Node 20.19+ (Vite 7).

## What is in the slice

**The village.** An elevated three-quarter view of a forest clearing with two
visible absences: a bare granary foundation and a broken bridge over the
stream. Those two holes are the whole design. Every encounter fills one, and
how well you fill it is visible from the moment you walk back in.

**Encounter one — Jumis, in the rye.** Daylight, flat Zemgale farmland. One
stem in the field carries two ears. Find it, then decide what to do with it.
Leaving it standing and binding it into the stubble is the tithe; cutting the
whole field or carrying Jumis home are both diminished — not failures, just
a smaller barn. The boundary stone carries the folk rule that makes the right
answer knowable rather than a guess.

**Encounter two — Velns, at the bog.** Dusk, cold, and a negotiation instead of
a search. The comic folk-tale devil, not the soul-bargain one. He offers to
build the crossing before the cocks crow, and the price is "the first living
thing across." A riddle first, then the bargain.

**The link between them.** Sending the village cat across is the classic
Devil's-Bridge trick and always works. Sending the loaf of rye bread is the
cleverer answer — but the argument only holds if the bread is worth something,
which is true exactly when you left the field its share in encounter one. That
is the point of shipping two encounters instead of one: it demonstrates that
the first is a *resource* for the second, not a separate level.

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
the ⟲ chip) shows everything said so far in the scene. Escape skips the intro.
The game can be finished without a mouse.

Three items, and each exists to make a moment concrete rather than to be a
subsystem:

- **The sickle** hangs under the lean-to in the village. You cannot walk to the
  field without it, and choosing what to do with the double ear no longer
  *resolves* the encounter — it loads the sickle. You still have to take it out
  and put it to the rye. That is the difference between picking an option and
  doing a day's work.
- **The rye loaf** is baked from the harvest and lands in your bag on the way
  home. It is the offering the bog demands, and its worth depends on how you
  handled Jumis.
- **The village cat** sits on a doorstep and can be picked up. Nothing forces
  you to. But the cat is the classic Devil's-Bridge answer, and leaving it
  behind quietly closes off one of the two good endings at the bog — which is
  what makes looking around the village worth doing.

At the bog the bargain is put the way the field puts its question: the options on
screen — the cat (only if you brought it; otherwise the lead-in says why it is
missing), the loaf, or stepping onto the planks yourself. Handing the cat or the
loaf over straight out of the bag works too. The field deliberately does not
offer the cut as a menu line: once you have chosen, the sickle has to come out
of the bag and go to the rye — the bag pulses and a faint band marks the crop
until you do.

**How the game tells you how you did.** After each encounter the screen darkens
and a mark is carved: the Jumis sign, or the crossing. A debt paid in full gets
a whole mark, cut deep and warm gold. A debt half paid gets the *same* mark,
left unfinished — the crossing literally stops halfway over the water. Under it,
three lines: whether the spirit is satisfied, what you are walking home with,
and — only when you fell short — what you should have done instead and what it
would have got you. That last line is the important one. "You did badly" is not
feedback; *"the bread was thin because the field was left bare, with a full
granary behind it that argument would have held"* is.

The card cannot be clicked away until the verdict is on screen, because a
player who has been click-advancing narration for a minute will otherwise skip
straight past their own result.

Walking back into the village, the first line spoken names what changed, so the
choice you made three clicks ago is connected to the building that is suddenly
on the foundation. And the ending opens with a tally: both marks side by side,
each whole or broken, a line per debt, and the total said plainly.

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
    state.ts           run state + localStorage persistence
    theme.ts           palette, fonts, layout constants
  content/
    script.ts          every player-facing line, both languages
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
    Chrome.ts          the language toggle and the ⟲ history button
    History.ts         the page of everything said so far in a scene
    KeyNav.ts          Tab/Enter across hotspots — the keyboard path through the world
    keys.ts            who took a key: shared keyboard state for one scene
    hit.ts             fixed-size hit boxes for text buttons, so they survive a phone's scale
    Painting.ts        the background plus everything set into it, drifted as one
    Prompt.ts          the one-line instruction at the top of the frame
public/art/            backgrounds, scene sprites and item art
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

The riddle in `content/script.ts` (`velns.riddle`) deserves the same treatment.

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

- Final subdomain / repo name (`vecasvaras.protu.lv` assumed).
- The daina and riddle verification above.
- A written design document covering the full game vision, for VKKF and
  publisher conversations — the demo is the proof, not the pitch.
