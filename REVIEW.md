# Vecās Varas — review

Played on `localhost:5174`, Chromium, desktop and at 390 px. Full loop run twice: once
`all` → poor granary, once through the bog with a correct riddle and the cat, to the tally.
Wrong answers, decoys, the locked bog path, the empty-handed states and a mid-expedition
refresh all exercised.

**The honest headline.** The atmosphere is the best thing here and it is not close — the
drifting fog, the chimney smoke, the wind shader on the rye, the Devil breathing on two
mismatched clocks. It does not read as a slideshow, which is the thing most single-screen
games fail at. The writing is strong and the Reckoning card is a genuinely good piece of
design. But the game is **silent**, and almost everything that happens in it happens as
text in the same panel at the bottom of the screen. You cut a whole field and the field
does not change. You send a cat across a bog and no cat moves. The panel that delivers all
this text covers the bottom 40% of every painting, including two of the things you are
meant to click. And there is one beat — the bargain at the bog — where the game asks you a
question and shows you no way to answer it, while the three answers sit written and unused
in `script.ts`.

Fix those and this is good. Right now it is a beautiful thing you read.

---

## Do these five first

1. **Show the bargain choices at the bog.** `velns.question`, `velns.choices.cat` and
   `velns.choices.bread` are written, translated, and never rendered. The game's hardest
   stick point is fixed with content you already have. — FUN-1, size M
2. **Get the hotspot rings and labels out from under the narration panel**, and move the
   two hotspots that live beneath it. Right now `Nojume` (the sickle) is a ring drawn
   *behind* a 90%-opaque black plate. — JUICE-2, size S
3. **Make the swing and the crossing change the picture.** The sickle beat and the cat
   beat are the two climaxes of the game and both resolve entirely in prose. — JUICE-3,
   size M
4. **Add the first five sound effects.** There is no audio at all. Ranked list in
   JUICE-1. — size M (S if you buy a pack)
5. **Fix the Latvian.** All 17 closing quotation marks are ASCII `"`, plus six outright
   errors (`palika virsroku`, `mizota nauda`, `turēja uz pusi`, `rudzus…neplūc`,
   `Velns ir samaksāts`, `tāds, kāda bija atbilde`). — TEXT-1 and TEXT-2, size S

If mobile is a target, QOL-1 (portrait is unplayable) belongs in this list too.

---

# 1. JUICINESS

### JUICE-1 — There is no audio. None.
- **What's wrong:** Zero sound files, zero `this.sound` calls, no audio in `BootScene`'s
  preload. A point-and-click where clicking makes no sound feels like a wireframe no
  matter how good the art is.
- **Where:** `src/scenes/BootScene.ts:30-46` (preload list), everywhere else by absence.
- **The fix:** Load an `audio` group in `BootScene.preload` and fire clips from the
  existing event points. Ranked by value per clip:
  1. **Ambient bed, one loop per scene** — village birdsong/wind, field wind + insects,
     bog night (frogs, distant water). Start in each scene's `create()` at ~0.25 volume,
     cross-fade over `Timing.fade` in `transition.ts`. This single item does more than
     the other nine combined.
  2. **Hotspot click** — a soft wooden tick, fired from `Hotspot.pointerdown`
     (`src/ui/Hotspot.ts:96`). Every click in the game goes through there.
  3. **The sickle swing** — on `JumisScene.cut()` at line 210, alongside the existing
     `cameras.main.flash`. A single scythe-through-straw whoosh.
  4. **Item into bag** — on `Bag.bump()` (`src/ui/Bag.ts:265`), a cloth/leather rustle.
  5. **The mark being carved** — on `SignMark.carve`, a stone-on-stone scrape per
     segment; the Reckoning card is already choreographed for it.
  6. **Hotspot hover** — a very quiet high tick on `setHover(true)`
     (`src/ui/Hotspot.ts:117`).
  7. **Page/line advance** — barely-there paper turn on `Narration.next()`.
  8. **The Devil's laugh** on `velns.riddleWrong`, and a single cock crow on the
     `breadGood` outcome line (the daina names it; hearing it is the payoff).
  9. **Bag open/close** on `Bag.setOpen`.
  10. **Bridge/granary settling in** on the `villageArt.place` tween.
  Add a mute toggle next to the `EN/LV` chip in `src/ui/Chrome.ts` and persist it in
  `localStorage` the way `i18n` does.
- **Size:** M

### JUICE-2 — The narration panel covers 40% of the frame, including hotspots and their own hover rings.
- **What's wrong:** The panel is 300 px plus a 150 px gradient ramp on a 1080 px frame, so
  it owns everything below y=630. The rings are drawn at depth 180 and the labels at 190;
  the panel container is depth 500. So the ring for the lean-to — which lives at y=880 —
  is drawn *underneath* a 90%-opaque black plate. I hovered it and got a faint rectangle
  and a half-legible tag. Same for the Jumis hint stone (y=906) and the two lowest decoys
  (y=800).
- **Where:** `src/ui/Narration.ts:58` (`rampH = 150`), `:84` (`setDepth(500)`);
  `src/ui/Hotspot.ts:66` and `:78` (depths 180/190); `src/scenes/VillageScene.ts:32`
  (`SHED = { x: 700, y: 880 }`); `src/scenes/JumisScene.ts:41` (`HINT_STONE y: 906`) and
  `:36-40` (decoys at y=800).
- **The fix:** Two parts. (a) Raise the hotspot ring and tag to depth 520 and 530 so they
  always sit above the panel — they are transient and only appear on hover, so they cannot
  clutter anything. (b) Move `SHED` up to roughly `{ x: 700, y: 760 }` and `HINT_STONE` to
  `{ x: 872, y: 800 }`, and lift the two low decoys to y≈720, so their ring centres are
  above the ramp. Leave the hit areas generous; only the centres need to clear the panel.
- **Size:** S

### JUICE-3 — The two climax actions change nothing on screen.
- **What's wrong:** You choose "cut the whole field", take the sickle out, swing it — and
  the rye is still standing, the double ear is still there, unchanged, while the text says
  *"Tu nopļauj visu. Lauks noguļas vienā pēcpusdienā."* The picture contradicts the prose.
  At the bog you release the cat and nothing crosses. These are the two moments the whole
  vertical slice exists for and both are a 90 ms white flash and a paragraph.
- **Where:** `src/scenes/JumisScene.ts:210-218` (`cut()` — flash, shake, then straight to
  `narration.say`); `src/scenes/VelnsScene.ts:108-118` (`onUse` → `resolve('cat')` with no
  visual).
- **The fix:**
  - *Field:* in `cut()`, after the flash, tween the `stalk` sprite (held at
    `JumisScene.ts:66`) — for `all` and `take`, angle it to 80° and drop `y` by 40 over
    300 ms `Cubic.easeIn`, then fade to 0; for `leave`, tween it to angle ~70° and hold it
    there (it was bent and tied, not cut). Then tween the `painting.root` tint from
    `0xffffff` to `0xb9a87e` over 900 ms so the field visibly goes from standing gold to
    cut stubble. Also stop the wind pipeline: call `detach`/set `amp` to 0 on the handle
    returned by `attachWind` (`JumisScene.ts:92`) — a cut field that is still rippling is
    the tell.
  - *Bog:* keep the `item-cat` texture loaded, and on `resolve('cat')` spawn it at the
    near bank (~x 700, y 780), tween `x` to 1330 / `y` to 700 over 2200 ms `Sine.easeInOut`
    with a small 2-cycle vertical bob, then fade it out past the Devil, and only then run
    `narration.say`. Same treatment for the loaf: an arc tween from the player's side to
    the far bank, using the existing `item-bread` texture. Both use art you already have.
- **Size:** M

### JUICE-4 — Most of the screen is dead on click, and says so by saying nothing.
- **What's wrong:** Clicking anywhere that is not a hotspot produces literally no response —
  no sound, no cursor change, no "nothing there" line. In a game whose entire verb is
  "click the picture", most of the picture is a null. I spent a good while clicking the
  cottages, the trees and the stone circle in the village getting silence, which reads as
  "the game is broken" before it reads as "nothing there".
- **Where:** `src/scenes/VillageScene.ts:214` and the equivalent lines in `JumisScene.ts:104`
  / `VelnsScene.ts:120` — `this.input.on('pointerdown', () => this.narration.advance())`.
  `Narration.advance()` returns `false` when idle and nothing else happens.
- **The fix:** In each scene's scene-level `pointerdown`, if `advance()` returns false and
  the narration is idle, `flash` one of three or four rotating "nothing here" lines held in
  `script.ts` per scene (e.g. village: *"Ciema māja. Aizvērtas durvis."* / *"Nekā."*). Keep
  them short and rotate so they do not become a wall. Plus the hotspot click sound from
  JUICE-1 makes the difference between live and dead regions audible.
- **Size:** S

### JUICE-5 — Using an item on the wrong thing silently drops it back in the bag.
- **What's wrong:** Hold the sickle, click above the horizon: the item vanishes from your
  hand with no message. Hold anything during the riddle at the bog: same. The player has
  no way to distinguish "you aimed wrong" from "the game ate my click".
- **Where:** `src/ui/Bag.ts:113` — `if (!consumed) this.putBack();`, no message.
  `src/scenes/JumisScene.ts:115` — `if (y < Layout.height * 0.34) return false;`
  returns false with no narration. `src/scenes/VelnsScene.ts:109` — same for
  `!this.bargainOpen`.
- **The fix:** Give `Bag.onUse` a third return state, or simpler: in `JumisScene.ts:115`
  replace the bare `return false` with `this.narration.flash(items.cutWrongPlace); return true;`
  (new line: LV *"Sirpis rudziem, ne debesīm."* / EN *"The sickle is for the rye, not the sky."*)
  and in `VelnsScene.ts:109` with a flash of a new `items.notYet` line. And in `Bag.putBack()`,
  tween the ghost sprite back to the bag's position over 180 ms instead of destroying it —
  so even a legitimate cancel is visible.
- **Size:** S

### JUICE-6 — Scene changes cost 1.1 s of black, five times per run.
- **What's wrong:** `Timing.fade` is 550 ms and it is used for both the fade-out and the
  fade-in, so every hub↔encounter move is 1100 ms of nothing plus the Reckoning card's own
  420 ms dismiss fade before it. That is over your stated 500 ms ceiling and it is the
  main reason the loop feels slower than its content.
- **Where:** `src/core/theme.ts:52` (`fade: 550`), `src/scenes/transition.ts:12,29`.
- **The fix:** Drop `Timing.fade` to 340. Keep `IntroScene`/`OutroScene`'s deliberate
  `fade * 2` (they are meant to be slow). Net saving ≈ 2.1 s per full loop, and the hub
  stops feeling like a loading screen.
- **Size:** S

### JUICE-7 — 24 of 44 tweens have no easing, i.e. linear.
- **What's wrong:** You have `ease` on the ones that matter most (`Back.easeOut` on the
  granary settling in, `Sine.easeOut` on the title, the Reckoning veil), but everything in
  `ui/` is linear. The worst offenders are the ones the eye tracks: the hover ring, the bag
  label, the panel show/hide.
- **Where:** `src/ui/Hotspot.ts:121` (160 ms alpha, linear); `src/ui/Bag.ts:236,241`
  (140 ms label, linear), `:227` (tray items, 200 ms linear), `:255` (bag show, 500 ms
  linear); `src/ui/Narration.ts:168` (panel fade, linear both ways);
  `src/ui/Prompt.ts:50`; `src/ui/DainaCard.ts:78,111`; `src/ui/Reckoning.ts:120-145`.
- **The fix:** Add `ease: 'Quad.easeOut'` to every fade-*in* and `ease: 'Quad.easeIn'` to
  every fade-*out* in those files. Two specific timing changes while you are in there:
  `Hotspot` hover-in should be 110 ms (160 feels laggy under a moving cursor) and hover-out
  can stay 160; `Bag.rebuildTray`'s 200 ms with 60 ms stagger is fine but wants
  `Back.easeOut` so the items look tipped out rather than faded in.
- **Size:** S

### JUICE-8 — Picking something up has no anticipation and no payoff, only a settle.
- **What's wrong:** You take the sickle and a 122 px bag in the far corner scales up 12%
  for 220 ms. That is the entire reward moment. The item never travels from the world to
  the bag, so the causal link between "I clicked the lean-to" and "there is now a thing in
  my bag" is carried by text alone.
- **Where:** `src/ui/Bag.ts:265-277` (`bump()`), called from `refresh()` at `:259`.
  Pickups at `src/scenes/VillageScene.ts:163` (sickle) and `:203` (cat).
- **The fix:** Add a `Bag.fly(texture, fromX, fromY)` that spawns the item sprite at the
  world position, tweens it along a shallow arc to the bag over 420 ms with
  `Sine.easeInOut` while scaling 1.0 → 0.5, destroys it on complete and *then* calls
  `bump()`. Call it from the two `bag.add` sites with the hotspot's own coordinates, and
  from `JumisScene.cut()` for the loaf (spawn it centre-frame). Three lines at each call
  site, and it turns three flat moments into three small ones.
- **Size:** S

### JUICE-9 — The hover ring does not come back after you click the same hotspot.
- **What's wrong:** `pointerdown` calls `setHover(false)`, but `pointerover` will not fire
  again until the cursor leaves and re-enters the zone. So after reading a hotspot's line
  you are left hovering an object with no indication it is still live. This is why my first
  hover test on the village stone appeared to do nothing — I had just clicked it.
- **Where:** `src/ui/Hotspot.ts:100` — `this.setHover(false);` inside the `pointerdown`
  handler.
- **The fix:** Replace it with a brief pulse instead of a kill: tween the ring alpha to
  0.35 and back to 1 over 2×90 ms. That both acknowledges the click and leaves the ring up.
- **Size:** S

### JUICE-10 — The "there is more to read" hint is a 20 px glyph in the far corner.
- **What's wrong:** `▸` at `parchmentDim`, 20 px, bottom-right, 56 px in from the edge. On
  my first pass through the intro I sat through three screenshots convinced the game had
  hung, because nothing on screen said "click". The Daina and Reckoning cards get a pulsing
  30 px arrow in the centre; the panel that shows 90% of the game's text gets a dot.
- **Where:** `src/ui/Narration.ts:73-80` (creation), `:265` (`updateHint`).
- **The fix:** Bump to 26 px, colour `Hex.rye`, and give it the same yoyo alpha pulse the
  cards use (`alpha: 0.35, duration: 1100, yoyo, repeat: -1`), started in `updateHint` and
  killed when the hint clears. Keep the position.
- **Size:** S

### Idle life — this part is fine
Asked directly: yes, the screen moves when you don't. Two fog bands at different speeds and
directions, chimney smoke on two measured chimney positions, occasional birds, a 46-second
breathing drift, motes, the wind displacement shader on the rye, wandering wisps on the bog,
the Devil's two out-of-phase idle tweens, and the cat's 4.2 s weight shift. `Atmosphere.ts`
is the strongest file in the project and I would not touch it.

One small thing: `Atmosphere.breathe` (`src/fx/Atmosphere.ts:334`) sets the veil's
*fillAlpha* to `amount` via the `rectangle()` constructor but then tweens the object's
`alpha`, so the effective swing is `amount → amount²×0.15` rather than the intended
`amount → amount×0.15`. Not broken, but the bog's dark wash swings wider than you asked it
to. Tween `fillAlpha` to match how `Reckoning.ts:50` does it. Size S.

---

# 2. FUN FACTOR

### FUN-1 — At the bog the game asks a question and shows no answers. The answers are written and unused.
- **What's wrong:** After the terms, `askBargain()` puts *"Ko tu liec pirmo pāri?"* at the
  top of the screen and then offers: a bag in the corner, and an unmarked patch of empty
  bog that only reveals itself if you happen to hover it. Nothing tells you the bag is the
  answer. Meanwhile `velns.question` ("Kā tu to izkārto?") and `velns.choices.cat` /
  `.bread` are fully written in both languages and are referenced by *nothing* —
  `velns.choices.self` survives only as a hotspot label. This is where a first-time player
  stops. It is also the game's best beat and its cleverest rule (the bread argument only
  holds if you left the field its share), and it is currently hidden behind a guess.
- **Where:** `src/scenes/VelnsScene.ts:167-186` (`askBargain`), `src/content/script.ts`
  `velns.question` and `velns.choices` (dead). Contrast `JumisScene.offerChoice()` at
  `:196`, which does it right.
- **The fix:** Call `this.narration.ask(velns.question, [...])` with all three options, the
  way Jumis does. On `cat` / `bread`, have the pick auto-remove the item from `bag` and run
  the existing `resolve(pick)` — no item-dragging required. Grey out (or omit) the cat
  option when `!bag.has('cat')` and show `items.noCat` as the reason. **Keep the bag path
  working too**: a player who works out that they can hand the cat over directly should be
  rewarded, not blocked. Same for the field: keep `items.cutPrompt`, but also leave the
  three-option list on screen so there is always a visible way forward.
- **Size:** M

### FUN-2 — Time to first meaningful action: ~11 s absolute minimum, 30-40 s realistically, and none of it is skippable.
- **What's wrong:** Measured on localhost with everything cached:
  - 0.0 s page load starts; all **4.3 MB of art** preloads before the title renders
    (`BootScene` loads all 14 images up front; only `title.jpg` is needed to show a menu).
    On localhost that is ~0.5 s. On a 5 Mbps connection it is ~7 s of a dark screen with a
    3 px bar.
  - ~1.5 s title text finishes fading in (900 ms tween + 250 ms delay).
  - click `Sākt` → 550 ms fade out + 1100 ms fade in.
  - intro: **five lines, 346 characters, 6.2 s of typewriter** at 18 ms/char, each needing
    a click, with no skip.
  - 550 + 550 fade to the village, then a 700 ms delay before the first nudge.
  - First action that changes the run state: taking the sickle.
  Fastest possible = ~11 s of unskippable animation and typing. A first-timer actually
  *reading* the intro: 30-40 s. And the intro is genuinely good writing, which is exactly
  why it should not be the thing standing between a new player and the verb.
- **Where:** `src/scenes/BootScene.ts:30-46`; `src/scenes/IntroScene.ts:56`;
  `src/core/theme.ts:52-53`.
- **The fix:** Three cheap parts. (a) In `BootScene`, load `title.jpg` + `item_bag.png`
  first and start `Title` on their completion; queue the other twelve into a second
  `this.load` batch that runs during the title screen — by the time anyone clicks `Sākt`
  they are in. (b) Add a skip: a small `Izlaist` / `Skip` text in the bottom-left of
  `IntroScene` that calls `state.set('introSeen', true); goTo(this, 'Village')`. (c) The
  `Timing.fade` change in JUICE-6.
- **Size:** M

### FUN-3 — The payoff is real but it lands while the screen is still fading in.
- **What's wrong:** The loop's reward — the granary appearing on the foundation you have
  been looking at — is a 1100 ms `Back.easeOut` tween that starts 400 ms after
  `VillageScene.create()`. But `create()` also kicks off a 550 ms camera fade-in, and the
  arrival line is on an 1100 ms timer. So the building finishes settling at t=1500 ms,
  about when the player's eye arrives, and the line that explains it starts at t=1100 ms
  in a panel at the bottom of the screen. I saw the granary already in place and had to
  work out that it was new. The art itself is good — the poor granary is a genuinely sad
  collapsing shed and the full one is a proper log klēts — and that contrast is being
  thrown away on timing.
- **Where:** `src/scenes/villageArt.ts:62-70` (delay 400, duration 1100);
  `src/scenes/VillageScene.ts:232-238` (arrival line at 1100 ms).
- **The fix:** Push the upgrade tween's `delay` to 1400 so it starts *after* the camera
  fade has finished and the player is looking, and move the arrival-line timer to 2600 so
  the sentence lands on a building that has just finished arriving rather than racing it.
  While you are there: the bridge is drawn at `h: 135` on a 1080 px frame, in the darkest
  corner of the painting. Raise it to `h: 190` and nudge it left to x≈1520 so it is not
  half-lost in the treeline.
- **Size:** S

### FUN-4 — The harvest action is guess-the-verb.
- **What's wrong:** *"Ņem sirpi no kules un liec to klāt."* — put it to *what*? Nothing on
  screen is highlighted, the sky silently rejects the click (JUICE-5), and the player has
  had no prior teaching that the bag's contract is take-item-then-click-the-world. The
  hint text also lives at the top of the frame while the bag is at the bottom-right and the
  target is the middle. I got it because I read `onUse`; a player has to guess.
- **Where:** `src/content/script.ts` `items.cutPrompt`; `src/scenes/JumisScene.ts:107-121`.
- **The fix:** Three small things: (a) name the target in the line — see TEXT-11.
  (b) While `this.pending` is set and the player is holding the sickle, draw a faint
  `Palette.ryeBright` band across the valid strike zone (y from `Layout.height*0.34` down),
  alpha 0.06, pulsing — the same trick the hotspot ring uses, applied to a region.
  (c) The first time the bag is opened in a run, `flash` a one-line teach:
  LV *"Paņem lietu rokā, tad norādi, kur to likt."* / EN *"Take a thing in hand, then point
  at where it goes."* Gate it on a `registry` flag so it never repeats.
- **Size:** S

### FUN-5 — The field search is hunt-the-pixel, rescued (on desktop only) by one good decision.
- **What's wrong:** Five decoys and the true stalk are all `discreet: true`, so nothing has
  a hover ring; the prompt says *"Meklē. Klikšķini uz lauka."* and you click the picture
  until something happens. The one thing that saves it is that the double ear is genuinely
  painted into the scene and is findable by looking — I spotted it before I clicked
  anything. But it is tinted down to `0xcdbf9b` to blend in, and at 390 px it is about six
  pixels tall. The boundary stone carrying the rule is excellent and is the reason this
  phase works at all; it is also sitting under the narration panel (JUICE-2), so a player
  who clicks a decoy first has the hint buried.
- **Where:** `src/scenes/JumisScene.ts:36-41` (positions), `:60-70` (stalk tint/scale),
  `:141-160` (`discreet` hotspots).
- **The fix:** Keep the search honest but add a floor: after 25 s in the search phase with
  no find, start a very slow 6-second alpha pulse on the `stalk` sprite between 1.0 and
  0.85 — invisible if you are looking straight at it, catches the eye if you are lost. And
  give the hint stone a non-discreet ring (it already has one) *above* the panel, so it
  reads as the deliberate signpost it is.
- **Size:** S

### Puzzle-by-puzzle verdict
| Puzzle | Closest failure mode | Verdict |
|---|---|---|
| Find the double ear | hunt-the-pixel | Survives on desktop because the sprite is really there. Dies at 390 px. |
| What to do with it (cut all / leave / uproot) | — | **The best thing in the game.** The boundary stone states the rule, the three options map to it one-to-one, and the Reckoning tells you exactly what you missed. This is the model; make the other beats look like this. |
| Swing the sickle | guess-the-verb | Worst offender. Target unnamed, no highlight, silent rejection. |
| The wind riddle | — | Fair. One right answer, a real traditional formula, a real consequence, no dead end. Good. |
| What crosses first | guess-the-verb, no visible answers | The hardest stick point. The design underneath it (bread only works if you paid Jumis) is the smartest idea in the project and nobody will reach it. |

### Where a first-timer gets stuck or bored — specifically
- **Stuck, hard:** bog, immediately after *"Ko tu liec pirmo pāri?"*. No visible answer.
- **Stuck, briefly:** field, at *"liec to klāt"*.
- **Bored:** the five unskippable intro lines on a first run; and the Reckoning card on the
  second and third viewings — it holds you for ~2.5 s before it will accept a click and
  ~4.5 s before the arrow appears, and that choreography does not shorten when you have
  seen it. Let the dismiss become live as soon as the *gain* line is up rather than the
  verdict, and let a second click inside that window snap all the remaining lines to
  visible instead of being swallowed.
- **Loop length, measured:** ~8 minutes for me knowing where everything was; 12-15 for a
  first-timer. The payoff (granary on the foundation) lands about 4 minutes in, which is
  about right.

### Cheapest change with the most pull-to-continue
FUN-1. The content exists, the rules function already exists and is unit-tested, and it
converts the game's dead end into its best scene. Second cheapest is FUN-3 — moving two
numbers so the reward lands when the player is looking at it.

---

# 3. TEXT — Latvian

Overall the register holds better than I expected. Short declarative sentences, present
tense, second person, concrete rural nouns, no adjective piles. It reads like someone who
has actually heard people talk this way, not like a translation. It drifts in exactly three
places, listed below. The `L(lv, en)` structure and the "all text in one file" discipline
is right and I would not change it.

**Character voice:** the Devil has a real voice — repetition (*"labvakar, labvakar"*,
*"visi grib pāri"*, *"Kaķis… Kaķis."*), exclamations, a salesman's register (*"Un lēti."*),
and one cruel joke. He is the best-written thing in the game. **Jumis has no voice at all**
— he never speaks and is only described by the narrator. That is defensible (he is a stalk
of rye, not a person) but it means encounter one is 100% narration and reads flatter than
encounter two. If you ever want them to feel like two beings rather than one, the answer is
not to give Jumis dialogue — it is to give him a *sound* and a *movement* (JUICE-1, JUICE-3)
rather than words.

### TEXT-1 — Every Latvian closing quotation mark is the wrong character.
- **What's wrong:** All 17 Latvian quoted passages open with the correct `„` (U+201E) and
  close with an ASCII `"` (U+0022). Latvian typographic convention is `„…"` — low-9 open,
  left-double-quote close (U+201C). The English strings are correct throughout, which makes
  the Latvian look like an afterthought. A Latvian reviewer sees this in the first
  screenshot.
- **Where:** `src/content/script.ts` — every string in `velns.greet`, `velns.riddle`,
  `velns.riddleRight`, `velns.riddleWrong`, `velns.terms`, `breadThrown`, `breadArgued`,
  and `velns.outcomes.*`.
- **The fix:** One sed pass over the `lv` side only. Every ASCII `"` inside a `L('…', …)`
  first argument becomes U+201C. Do not touch the second argument (English).
- **Size:** S

### TEXT-2 — Six outright errors
Original → proposed, with the reason.

1. `reckoning.velns.poor.verdict`
   **„Velns palika virsroku."** → **„Velns guva virsroku."**
   *`virsroku` only collocates with `gūt` / `ņemt` / `paņemt`. `palikt virsroku` is not
   Latvian — it reads like a typo for `palika virsū`.*

2. `reckoning.velns.good.verdict`
   **„Velns ir samaksāts."** → **„Velnam ir samaksāts."**
   *`samaksāt` takes the dative for the person paid. In the nominative the Devil becomes the
   thing that was bought, which is the opposite of what happened.*

3. `intro.lines[2]`
   **„Vectēvs to turēja. Tēvs turēja uz pusi. Tu par to neesi domājis nemaz."**
   → **„Vectēvs to turēja. Tēvs — pa pusei. Tu par to neesi domājis nemaz."**
   *`turēt uz pusi` means to halve something, not to half-keep it; `pa pusei` is the idiom.
   Dropping the repeated verb also tightens the three-generation rhythm the line is built on.*

4. `items.needSickle`
   **„Rudzus ar rokām neplūc. Bez sirpja uz lauku nav ko iet."**
   → **„Rudzus ar rokām nerauj. Bez sirpja laukā nav ko iet."**
   *`plūkt` is for berries and flowers. Grain is `pļauj`, or by hand `rauj`. `laukā iet` is
   also the more natural collocation than `uz lauku iet` here.*

5. `velns.outcomes.breadPoor[1]`
   **„Tas ir plāns gads, cilvēk. Tur iekšā nav nekā. Tā ir mizota nauda."**
   → **„Tas ir plāns gads, cilvēk. Tur iekšā nav nekā. Tā ir viltota nauda."**
   *`mizota nauda` is not an expression in Latvian; the reader stops on it. Counterfeit is
   `viltots`. The Devil is making an accusation, not a pun.*

6. `velns.riddleWrong`
   **„Nu, tad tilts būs tāds, kāda bija atbilde."**
   → **„Nu, tad tilts būs tik labs, cik laba bija atbilde."**
   *`tāds … kāda` mismatches gender across the correlative (`tilts` masc., `atbilde` fem.)
   and reads as a slip. `tik … cik` is the standard construction and keeps his mocking
   arithmetic intact.*

### TEXT-3 — Three lines where the voice drifts
1. `ui.clickAnywhere`
   **„Meklē. Klikšķini uz lauka."** → **„Meklē. Aplūko lauku."**
   *`Klikšķini` is the only line in the game that admits it is software; everything else is
   nineteenth-century village. `Aplūko` is already the verb on the hotspot labels, so it
   teaches the same word twice. Trade-off: it is less explicit about the input method — if
   you are worried, keep the mouse instruction but move it into the first-run teach line
   from FUN-4 rather than leaving it on screen for the whole search.*

2. `village.nudgeDone`
   **„Abas lietas nokārtotas. Ej pie akmens."** → **„Abi parādi nokārtoti. Ej pie akmens."**
   *`lietas` is office Latvian. The game has spent ten minutes teaching the word `parāds`
   and this is the line where it should pay off.*

3. `arrival.granaryPoor`
   **„Uz pamatiem stāv būda. Tā tur vietu, un tas ir viss."**
   → **„Uz pamatiem stāv būda. Vietu tā aizņem, un tas arī viss."**
   *`Tā tur vietu` reads first as `tur` the adverb ("it there place") before it resolves as
   `turēt`. `aizņem` removes the garden path, and `tas arī viss` is the more natural
   dismissal.*

### TEXT-4 — Two lines where the meaning is off
1. `jumis.arrive[0]`
   **„…Vecmāmiņa nebūtu ļāvusi sākt, kamēr lauks nav izlasīts."**
   → **„…Vecmāmiņa nebūtu ļāvusi sākt, kamēr lauks nav apskatīts."**
   *The English pun on "read" does not survive: `izlasīt lauku` in Latvian means to pick it
   over, which is the harvest itself — so the line says you may not start until you have
   finished. `apskatīts` keeps the instruction (look before you cut) and is what the puzzle
   actually asks for.*

2. `velns.arrive[0]`
   **„Laipa pār purvu beidzas pusceļā. Tā beidzas pusceļā tik ilgi, cik kāds atceras."**
   → **„Laipa pār purvu beidzas pusceļā. Tur tā beidzas jau tik ilgi, cik vien kāds atceras."**
   *The whole phrase `beidzas pusceļā` repeats verbatim, which reads as an editing accident
   rather than a device. And `tik ilgi, cik kāds atceras` needs `vien` to carry "as long as
   anyone can remember".*

### TEXT-5 — Line lengths
The panel wraps at 1808 px at 34 px, which is about 105 characters. Twenty of the 138
Latvian strings run past that and wrap to two lines. That is fine at desktop. At 390 px the
same text renders about 7 px tall (see QOL-1), so length is not really the mobile problem —
the scale is. Still, these five are long enough to be worth cutting even on desktop, in
descending order:

| Chars | Key | Note |
|---|---|---|
| 179 | `velns.outcomes.catFumbled[1]` | Two sentences of bridge-quality bookkeeping after the good line has already landed. Cut the clause after the dash. |
| 177 | `velns.outcomes.breadGoodFumbled[2]` | Same problem, same fix. |
| 158 | `velns.outcomes.cat[1]` | Fine as written — this one is the payoff and earns its length. |
| 154 | `jumis.outcomes.leave[0]` | The best sentence in the game and the longest. I would split it at `saliņā,` into two `L()` entries so it gets two beats instead of one wall. |
| 141 | `jumis.outcomes.all[1]` | Already has four short sentences inside it; split after the second `nekas nenotiek.` |

### TEXT-6 — Dead strings
`velns.question`, `velns.choices.cat`, `velns.choices.bread` and `reckoning.title` are
written, translated, and referenced by nothing (see FUN-1 for the first three —
they should be brought back, not deleted). `reckoning.title` ("Aprēķins") is genuinely
unused; either put it at the top of the Reckoning card or delete it. Also every
`ITEMS[*].note` in `src/core/inventory.ts` — see QOL-6.

### TEXT-7 — The dainas are still marked unverified
`src/content/dainas.ts` has `verified: false` on both entries, and your own header comment
says why that matters. Restating it here because it is a release gate, not a polish item:
both stanzas were written from memory and need to be checked character-by-character
against dainuskapis.lv before anything public. The `assertDainasVerified()` warning is a
good mechanism; act on it.

Diacritics elsewhere: I checked every string. Clean. `ķērpjiem`, `divvārpu`, `rugājiem`,
`sliekšņa`, `saviebjas`, `iebrēcas` all correct.

---

# 4. QUALITY OF LIFE

### QOL-1 — Portrait mobile is unplayable, and nothing tells the player to rotate.
- **What's wrong:** `Phaser.Scale.FIT` on a fixed 1920×1080 canvas. At 390×844 that gives a
  **390×219 strip** floating in the middle of a black page — 74% of the screen is letterbox.
  Body text renders at 34/1920 × 390 ≈ **7 px**. I took a screenshot at 390 px and could
  not read a single line. The `Sākt` button is about 7 px tall and 12 px wide. It is not
  "cramped", it is not usable. In landscape (844×390) it is fine — text is legible, taps
  land. So the game *works* on a phone held sideways and there is nothing anywhere that
  says so.
- **Where:** `src/main.ts:17-22` (scale config), `src/core/theme.ts:44-45`
  (`width: 1920, height: 1080`).
- **The fix:** Add a portrait gate. In `index.html`, a CSS-only overlay is enough and costs
  nothing at runtime: a fixed div with `@media (orientation: portrait) and (max-width: 900px)
  { display:flex }`, otherwise `display:none`, containing a rotate icon and one line
  (LV *"Pagriez ierīci"* / EN *"Turn your device"*). Keep it outside Phaser so it works
  before boot. Optionally also request `screen.orientation.lock('landscape')` on first
  interaction, ignoring the rejection.
- **Size:** S

### QOL-2 — Tap targets
- **What's wrong:** Everything is sized in the 1920-wide design space and shrinks with the
  canvas. In landscape at 844 px (scale 0.44): bag icon 122 → **54 px** (fine), choice rows
  44 → **19 px** tall (under), title menu items 34 → **15 px** (under), the `EN/LV` chip
  → about **17 px** (under), hotspot rings are mostly large enough. The choice rows are the
  one place you already did the right thing — the hit area is the whole row width, not the
  glyphs — so they are wide but short.
- **Where:** `src/ui/Narration.ts:285-289` (row hit rect, `Math.max(44, …)`);
  `src/ui/Chrome.ts:20-28`; `src/scenes/TitleScene.ts:79,89`.
- **The fix:** Raise the design-space minimum so it survives the scale-down: choice rows
  `Math.max(96, txt.height + 40)`; give the `Chrome` toggle `padding: { x: 26, y: 18 }`;
  give the title's `Sākt` / `Sākt no jauna` / the outro's `Sākt no jauna` an explicit
  `setInteractive(new Phaser.Geom.Rectangle(-160, -44, 320, 88), Rectangle.Contains)`
  instead of relying on the glyph bounds.
- **Size:** S

### QOL-3 — The bag steals clicks from the third choice.
- **What's wrong:** Reproduced: at the Jumis choice, clicking the third option
  (*"Izraut to ar visām saknēm…"*) anywhere near the right-hand side opens the bag instead.
  The choice rows span nearly the full width (`rowW = width - panelPad*2`, so x 56→1864)
  and row 3 sits at y 984 with a 44 px hit box; the bag sits at (1788, 972) with a 122 px
  sprite at depth 700, above the narration's 500. The comment at `Bag.ts:51` says the bag
  was moved to the right *because* the choices run along the left — but the hit area was
  never narrowed to match.
- **Where:** `src/ui/Bag.ts:53-54`; `src/ui/Narration.ts:283-287`.
- **The fix:** Narrow the choice row hit rect to stop clear of the bag:
  `const rowW = width - panelPad * 2 - 260;` — the text never reaches that far anyway
  (longest option is ~700 px). Alternatively disable the bag's pointer input while
  `narration.choices.length > 0`. The first is one number.
- **Size:** S

### QOL-4 — No way to re-read a line, and no history.
- **What's wrong:** Lines are consumed on click and gone. The Jumis hint stone and the
  Devil's terms are the two pieces of information the puzzles depend on, and both are
  one-shot. A player who skims the hint stone and then clicks a decoy has lost the rule
  with no way back — except that the stone is re-clickable, which is good luck rather than
  design, and the Devil's terms are not.
- **Where:** `src/ui/Narration.ts` — `queue` shifts and discards; nothing retains.
- **The fix:** Keep a `history: Loc[]` on `Narration`, push every line rendered, cap it at
  30. Add a small `⟲` next to the `EN/LV` chip in `Chrome.ts` that opens a scrollable
  panel of the current scene's lines at depth 850. The fast version, if you want to spend
  ten minutes instead of two hours: make `advance()` on an already-finished line with an
  empty queue re-show the *previous* line once, so a single extra click walks you back one.
- **Size:** M (S for the cheap version)

### QOL-5 — Resume always drops you in the hub, even if you were mid-expedition.
- **What's wrong:** `RunState` stores outcomes, not location. Refresh while standing in the
  rye field and `Turpināt` puts you back in the village; everything you did inside the
  encounter (found the stalk, answered the riddle) is gone with no warning. To be clear:
  this is *safe* — `state.set` and `bag.add` are committed together at the decisive moment
  in both encounters, and `repair()` heals the one historical case where they weren't, so
  you can never end up in an unwinnable save. It is just silently lossy, and the player is
  not told.
- **Where:** `src/core/state.ts:15-24` (`RunState`), `src/scenes/TitleScene.ts:118-123`.
- **The fix:** Either (a) accept it and say so — change `ui.resume` to
  LV *"Turpināt (no ciema)"* / EN *"Continue (from the village)"*; or (b) add
  `scene: 'Village' | 'Jumis' | 'Velns'` to `RunState`, set it in each scene's `create()`,
  and have `begin()` resume there. (b) restarts the encounter from its daina card, which is
  the right granularity — nobody wants to resume mid-riddle. I would do (b).
- **Size:** S for (a), M for (b)

### QOL-6 — You can see what you are carrying but not why it matters, and the text explaining why is dead code.
- **What's wrong:** The open bag shows an icon and, on hover, a name. `ItemDef.note` — *"Cepts
  no šī gada graudiem. Cik labs gads, tik labs klaips."* for the loaf, which is the single
  most load-bearing fact in the whole game, because the bread argument at the bog only works
  if the year was good — is defined for all three items and **rendered nowhere**. A player
  holding a heavy poor-year loaf has no way to know it is a weak card until the Devil laughs
  at them.
- **Where:** `src/core/inventory.ts:27` (`note` declared), `:33,42,51` (three notes
  written); `src/ui/Bag.ts:167-217` (`rebuildTray` uses only `def.name`).
- **The fix:** In `Bag.showLabel`, take two lines instead of one: name in `Hex.parchment` at
  22 px, note underneath in `Hex.parchmentDim` at 18 px with `wordWrap: { width: 420 }`,
  origin `(0.5, 1)` so it grows upward from the bag. Make the loaf's note reflect the run:
  swap `ITEMS.bread.note` for a getter that reads `state.get().jumis` and returns the "good
  year" or "thin year" text. That turns the inventory into the thing that telegraphs the
  bog puzzle.
- **Size:** S

### QOL-7 — The sickle icon is invisible in the bag.
- **What's wrong:** `item_sickle.png` is a dark iron blade with a pale handle on
  transparency, drawn at 58 px on an `ink` plate at 0.72 alpha. In the tray it reads as a
  faint smudge — I had to check the source to be sure which item I was clicking. The cat and
  the loaf are fine.
- **Where:** `src/ui/Bag.ts:193-196` (plate fill `Palette.ink, 0.72`), `:200`
  (icon scaled to 58).
- **The fix:** Fill the plate with `Palette.timber` at 0.35 instead of `ink` at 0.72, and
  add `.setTint(0xd8d2c4)` to the tray icon so the blade lifts off the ground. Cheaper still:
  keep the plate and raise the icon to 68 px.
- **Size:** S

### QOL-8 — No keyboard path to anything in the world.
- **What's wrong:** `Narration` handles Space/Enter and the number keys for choices, and the
  Daina and Reckoning cards take Space/Enter. That is genuinely good and more than most
  Phaser games do. But every `Hotspot`, the bag, the bag's items and the title/outro menu
  items are pointer-only, so the game cannot be finished without a mouse.
- **Where:** `src/ui/Hotspot.ts` (no key handling), `src/ui/Bag.ts` (same),
  `src/scenes/TitleScene.ts:79-101`.
- **The fix:** Give each scene an ordered `Hotspot[]` (`VillageScene` already keeps
  `this.spots`) and add Tab / Shift+Tab to move a focus index, drawing the focused
  hotspot's ring at full alpha and firing `onClick` on Enter. `B` toggles the bag, `1-3`
  picks a bag item. That covers the whole game with about 40 lines in one place. This is
  the largest QoL item here and the only one I would call L.
- **Size:** L

### QOL-9 — Missing states: loading, error, first-run.
- **What's wrong:** Three gaps.
  - *Loading:* the HTML `#boot` div says "VECĀS VARAS" and Phaser then draws its percentage
    label at `height/2 + 48` directly over it — at 390 px the two overlap into mush. The
    `#boot` div has a `transition: opacity .6s ease` that is never used, because
    `BootScene.create` calls `.remove()` outright.
  - *Error:* no `this.load.on('loaderror')` handler. A 404 on any art file leaves you on a
    black screen with no message.
  - *First run:* nothing teaches the bag contract (covered in FUN-4).
- **Where:** `index.html:20-27` (`#boot`); `src/scenes/BootScene.ts:22-28, 49-51`.
- **The fix:** (a) Move the Phaser progress label to `height/2 + 96` and fade `#boot` out
  (`el.style.opacity = '0'; setTimeout(() => el.remove(), 600)`) so the transition it
  already declares gets used. (b) Add
  `this.load.on('loaderror', (f) => { /* show a parchment line: "Neizdevās ielādēt: " + f.key */ })`
  and a retry that re-runs `this.load.start()`.
- **Size:** S

### QOL-10 — Accessibility
- **Contrast:** the type colours are fine. `parchment #e8dfcd` on the `ink` panel at 0.9 is
  roughly 13:1; `parchmentDim #bfb49c` about 9:1; `rye #c9a24a` about 7:1. All comfortably
  past AA. The problem is not colour, it is **size**: 20 px for the continue hint and 18-22 px
  for labels, in a design space that gets scaled down by 0.4 on a phone.
- **Colour alone:** you are mostly clear of this. The Reckoning and the tally distinguish good
  from poor by three redundant channels — the mark's shape (complete vs. broken off
  mid-stroke), the colour, and the text. That is exactly right and it was clearly deliberate.
  The one place that leans on colour alone is the choice-row hover (`parchmentDim` →
  `ryeBright`, `src/ui/Narration.ts:295-296`); add a `—` → `▸` bullet swap or a small x-offset
  so the hover is visible without colour.
- **Text scaling:** browser zoom and OS font scaling do nothing — everything is canvas text.
  Nothing to fix cheaply; worth knowing it is a hard limit of the approach.
- **Keyboard:** see QOL-8.
- **Size:** S for the hover marker; the rest is QOL-8 and QOL-2.

---

# Needs new assets (commission list)

Nothing below is implementable from the current repo — keeping it out of the list above on
purpose.

**Audio (the big one).** Everything in JUICE-1. Concretely:
- 3 ambient loops, 60-90 s seamless: summer village day (birds, distant dog, faint wind),
  open rye field (wind through grain, crickets, a lark), bog at dusk (frogs, water, one
  distant unexplained sound). These three carry the whole game.
- 10-12 one-shots: wooden click, softer hover tick, cloth/leather rustle, sickle through
  straw, stone-on-stone scrape (×3 short variants for the carve), bag open, bag close, a
  cat's single short mrrp, a cock crow, a low male laugh (the Devil — needs a performer,
  not a library clip), a single struck-wood "debt paid" tone for the tally.
- A mute control is code, not an asset.

**Art.**
- *A cut field.* JUICE-3 gets most of the way with a tint and the stalk animating out, but
  the honest version is a second background — `field_cut.jpg`, same camera, stubble and
  sheaves — cross-faded on the swing. This is the single highest-value new image.
- *A cat walking, 3-4 frames or one side-profile sprite.* `item_cat.png` is a front-facing
  sitting cat; it cannot cross a bog convincingly.
- *A bigger bridge read.* `bridge_full.png` is good art rendered at 135 px in the darkest
  corner of the village. Either re-render the village background with a wider, lighter
  crossing area, or commission the bridge at a shallower angle so it reads at that size.
- *Loading/rotate art:* a rotate-device glyph for QOL-1 (or use a CSS-drawn one; free).
- *Optional:* a Jumis "presence" — not a character, but something that visually acknowledges
  the tithe when you bind the double ear down. A brief warm light on the sheaf would do it,
  and that can be done with the existing particle system rather than new art.

**Text (human, not code).** Both dainas verified character-by-character against
dainuskapis.lv, and the wind riddle checked against a printed mīklu krājums —
your own note in `dainas.ts` already says so. Budget an hour of a Latvian proofreader's
time for the whole `script.ts` after the TEXT fixes above land; the errors I found are the
ones a careful reader catches, not the ones a native speaker catches.

---

## One thing I could not localise
The bog scene is noticeably darker than the other two. `Atmosphere.breathe` is called there
with `amount: 0.1` and a near-black tint, which combined with the `fillAlpha`/`alpha` mix-up
noted under JUICE-8 gives a wider dark swing than the code appears to intend — but I could
not tell by eye how much of the darkness is that bug and how much is `bog.jpg` itself.
Worth checking with `?fx=off` side by side before changing anything.
