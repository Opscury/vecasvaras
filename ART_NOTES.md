# New art — handoff

Nothing existing was overwritten. `bridge_full.png`, `bridge_full_v2.png`, `field.jpg`,
`jumis_stalk.png`, `cat_walk.png` and `item_bread.png` are all still on disk, so every
change below is a one-line revert.

| File | Size | Purpose |
|---|---|---|
| `field_cut.jpg` | 1920×1080, 617 KB | Second background for the Jumis scene — the field after the swing |
| `jumis_bound.png` | 562×420 | The double ear bent down and tied — the visible result of the tithe |
| `bridge_full_v3.png` | 755×420, 241 KB | The good bridge, flat with a footing at each end |
| `cat_walk_sheet.png` | 1200×450, 669 KB | Twelve-frame walk cycle, 4×3, 300×150 a frame |
| `item_bread_good.png` | 348×252, 174 KB | The loaf from a good year: tall, dark rye |
| `item_bread_poor.png` | 277×252, 84 KB | The loaf from a stripped field: flat, pale, grey |

All are in the same 19th-century realist oil register as the existing paintings, and all
are original images — not copies of any particular work.

`cat_walk_sheet.png` is the only one that is reproducible from source: run
`python3 tools/build_catsheet.py` and it rebuilds byte-for-byte from
`tools/src/catwalk.mp4`. The other files are one-off generations.

---

## `field_cut.jpg`

Built to cross-fade with `field.jpg`, so it is aligned to it rather than merely similar:

- **Horizon is on the same row** — y = 399 in both. That is what makes the dissolve read as
  the rye going down rather than the camera moving.
- **White-balanced off `field.jpg`'s sky.** The sky band means match to within one level per
  channel, so the light does not appear to change during the fade.
- **The land is deliberately paler and greyer** than the standing rye (that is the point),
  but pulled 45% back toward the reference's hue balance, luminance-preserving, so the
  stubble stays in the same palette family.
- **The foreground is the original painting.** The lichen boulder the `HINT_STONE` hotspot
  sits on (872, 906), the sickle in the stubble, and the ditch grass are composited
  straight out of `field.jpg` under a feathered mask, so they do not move, shift colour, or
  pop during the fade. Everything above and to the right of them is the new cut field.

### Wiring it

```ts
// BootScene.preload
this.load.image('bg-field-cut', 'field_cut.jpg');
```

In `JumisScene.create`, add the cut field as a second image inside the painting group at
alpha 0, directly above the background:

```ts
const cutBg = painting.add(
  this.add.image(Layout.width / 2, Layout.height / 2, 'bg-field-cut')
    .setDisplaySize(Layout.width, Layout.height)
    .setAlpha(0),
);
```

Then in `cut()`, after the existing `cameras.main.flash`, cross-fade it up over ~900 ms with
`Sine.easeInOut`, and drop the wind at the same time — a cut field that is still rippling is
the tell.

**One ordering note:** `Painting.add` appends to the container and depth has no effect
inside a group, so add `cutBg` immediately after constructing the `Painting` and *before*
the stalk, or the cut field will draw over the double ear.

---

## `jumis_bound.png`

The `leave` outcome is currently the only choice with no visual consequence at all. This is
the tithe as the old women actually left it: bent to the ground and tied with a twist of
straw.

Verified in place on `field_cut.jpg` at:

```ts
{ x: 1596, y: 655, h: 190, tint: 0xcdbf9b }   // same x as TRUE_STALK, same tint as the stalk
```

Show it only on `pick === 'leave'`, fading up with the cut field. For `all` and `take` the
stalk should simply go — angle it over and fade it out, and nothing replaces it.

---

## `cat_walk_sheet.png`

The static cat is gone. This is a real twelve-frame walk cycle, cut from an
image-to-video take made from `cat_walk.png`, so it is the same animal with the same
markings — it just has legs now.

Laid out 4 across, 3 down; 300×150 a frame; frames read left to right, then down. Loaded
with `load.spritesheet`, not `load.image` — see `GAME_SHEETS` in `scenes/assets.ts`.

Three things were solved rather than eyeballed, and all three are in the build script:

- **Which twelve frames.** The take is six seconds at 24 fps, sampled to 47 frames at 8.
  Scoring every candidate loop by how closely its two ends match puts the cleanest stride
  at frames 15–26, where the seam is about half as big a step as an ordinary frame change.
- **Registration.** Every frame sits on one canvas with one ground line and one horizontal
  centre. The footage also drifts right at 2.4 px a frame; that trend is removed, because
  a drift which resets at the loop point is a shunt backwards you can see. The residual
  sway is real animation and is kept.
- **The white fringe.** The source is a cat on white paper. A flood fill marks the
  anti-aliased edge pixels as cat, and their colour is half paper — left opaque they draw
  a pale outline round the animal, which over the bog is the first thing the eye lands on.
  The blend is solved instead (`observed = a·fur + (1−a)·white`, fur from the nearest
  interior pixel), so the edge carries fur colour and the softness lives in the alpha.

### Frame rate and crossing time are one decision

This is the part worth reading before touching `CAT_PATH`.

In the sheet the cat walks on the spot, so a planted paw slides backwards through the
frame — measured at **13.5 px per frame** in a 300 px frame, consistent across the whole
cycle. That is the speed the cat is actually travelling. Scale it to how big the cat is
drawn and integrate along its path and the crossing comes to **50.6 frames of animation**.

So the frame rate fixes the crossing time and the crossing time fixes the frame rate. Pick
either one freely and the paws slide by the error. `CAT_WALK_FPS = 16` (1.33 cycles a
second, which is a cat walking) gives 3168 ms, and `VelnsScene` computes that duration
rather than storing it.

Two smaller consequences:

- The tween is **linear**, not `Sine.easeInOut`. The legs run at a fixed rate, so easing
  the ground speed is skating, and a cat that reaches the planks is already walking.
- The cat is drawn a fifth smaller at the far bank, so it covers a fifth less screen
  distance per step. `CAT_CROSSING.pace` maps time onto the path so that happens; without
  it the paws slide by 20% over the second half. Verified in the running game: ground
  distance and leg distance agree to 0.2% across the whole crossing.

The artificial bob is gone. The rise and fall of the body is in the frames, pinned to a
shared ground line.

## `bridge_full_v3.png`

My review said to re-render this at a *shallower* angle. Looking at `village.jpg`
properly, that was wrong — the village is a high three-quarter view looking down on the
roofs, and a side-on elevation would have stood up like a cardboard cutout. v2 fixed the
camera but was a free-standing bridge whose deck hung in mid-air over the path.

v3 is a flat deck with a stone footing at each END, which is what lets it read as built:

```ts
bridge: {
  good: {
    key: 'bridge-good',
    x: 1448, y: 668, h: 185,
    ox: 0.204, oy: 0.754,   // pinned by the NEAR footing, not bottom-centre
    angle: 12,
  },
  poor: { key: 'bridge-poor', x: 1575, y: 690, h: 85 },   // unchanged
}
```

`ox`/`oy` are new in `villageArt.ts` and exist for this sprite. It is pinned by its near
footing — measured at (0.204, 0.754) of the texture — set down on the village-side bank,
and rotated 12° so the far footing comes down on the path-side bank rather than out over
the water.

Two things to know before changing those numbers:

- The sprite is drawn at a steeper three-quarter angle (about 26°) than the crossing
  painted into `village.jpg` (about 5°), so **no single rotation puts both footings exactly
  on the painted plank ends.** 12° with a deck this long is the setting where both stones
  are unambiguously on ground and the span still reads flat. Four placements were
  composited at the exact Phaser transform before picking this one.
- The derelict planks are **painted into the background**, not a sprite, so they cannot be
  removed. The good bridge is built over them and a few old boards stay visible under the
  right-hand half of the deck. It reads as a proper bridge laid over the old ford. If you
  ever want them gone it needs a small inpainted patch drawn under the bridge, not a
  placement change.

---

## `item_bread_good.png` / `item_bread_poor.png`

The loaf used to be one picture regardless of how the field went, so the player could not
tell which card they were holding until the Devil told them. Now there are two, and
`core/itemArt.ts` picks between them off `state.jumis`:

```ts
textureFor('bread')   // 'item-bread-good' | 'item-bread-poor'
```

It lives in its own module because `state.ts` imports the bag, so `inventory.ts` cannot
import the state back without a cycle. All five draw sites in `Bag.ts` go through it, and
`ITEMS.bread.texture` now falls back to the poor loaf so a pre-resolution draw cannot show
a missing-texture box.

They differ in **silhouette first**: a tall dark dome against a flat pale slab, which is
what survives being drawn at 68 px in the bag. Sizes are deliberate. The bag scales items
by their larger dimension and the ghost by height, so the poor loaf's canvas keeps
transparent padding above and below the bread — that is what makes it draw smaller in the
ghost while staying centred in the tray slot. Trim that padding and the poor loaf starts
drawing *bigger* than the good one.

## Still needs commissioning

The audio is done — twelve one-shots and three ambient beds are in and wired; see
`AUDIO_NOTES.md`. What is left of that gap is **the Devil's laugh**, which wants a
performer rather than a library clip or a generated take. There is no cue slot for it yet.

## Rebuilding

```
python3 tools/build_catsheet.py     # cat_walk_sheet.png from tools/src/catwalk.mp4
```

The other files here were one-off generations and have no build step. If `cat_walk.png`
is ever recoloured, re-run the script — it colour-matches the sheet to that file, so the
two cannot drift apart.
