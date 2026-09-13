# Credits and asset provenance — Vecās Varas

Every non-original asset in the build, with its source and what the licence requires.
Keep this current as assets are added; it is the document you will be asked for if a
funder or a store ever queries the art and audio.

---

## Audio — sound effects

All twelve one-shots in `public/audio/` were generated with **ElevenLabs SFX v2**, accessed
through **Picsart**, in September 2026, from text prompts written for this project. They were
then isolated, normalised and encoded locally with `build_audio.py` (ffmpeg + numpy).

`sfx_click` · `sfx_hover` · `sfx_sickle` · `sfx_bag` · `sfx_bag_open` · `sfx_bag_close` ·
`sfx_carve1` · `sfx_carve2` · `sfx_carve3` · `sfx_cat` · `sfx_cock` · `sfx_tally`

**Licence position:** Picsart states that AI-generated output is made available for commercial
purposes, while explicitly not guaranteeing that copyright can be claimed in it or that it does
not infringe third-party intellectual property. That wording was found on their page about
generated *images*; no audio-specific terms were located. **Treat the audio position as
unverified and confirm before a public release or a grant submission.**

No attribution is required by Picsart. Attribution is given here for the project's own records.

## Audio — ambient beds

Sourced from Freesound in September 2026, trimmed to their steadiest 30-second
stretch and made seamless with `tools/build_audio.py`. Two of the three are CC0 and need
no credit; one is CC-BY 4.0 and **must** be credited wherever the game is published.

| File | Source | Uploader | Licence | Credit required |
|---|---|---|---|---|
| `amb_village` | [freesound.org/s/523372](https://freesound.org/people/nickmaysoundmusic/sounds/523372/) — *Woods_ambience_summer_UK_birds_light_wind_through_trees* | nickmaysoundmusic | CC0 1.0 | No |
| `amb_field` | [freesound.org/s/81796](https://freesound.org/people/silencyo/sounds/81796/) — *Wind Mistral / dry grass / swifts* | silencyo | CC0 1.0 | No |
| `amb_bog` | [freesound.org/s/156448](https://freesound.org/people/BethanyFerrell/sounds/156448/) — *swamp_at_dusk.wav* | BethanyFerrell | **CC BY 4.0** | **Yes** |

### The one credit line you must ship

> Bog ambience: *swamp_at_dusk* by BethanyFerrell, licensed CC BY 4.0.
> https://freesound.org/people/BethanyFerrell/sounds/156448/

Put it wherever the game credits its assets — an in-game credits screen, the itch.io page,
the README. CC BY 4.0 requires the author, the licence, and a link.

Note: these were taken from Freesound's high-quality MP3 previews, not the original
uploads — downloading originals needs OAuth2. At 25% volume under the rest of the mix
that is inaudible, but if you ever want the masters the API credential already has the
right callback URL configured.

## Audio — still to commission

**The Devil's laugh.** Needs a performer, not a generated clip.

---

## Art — generated

Generated through **Picsart**, September 2026, from prompts written for this project, then
aligned, colour-matched, keyed and composited locally (ffmpeg + Pillow + NumPy/SciPy).

Images, **Flux 2 Pro**:

| File | What it is |
|---|---|
| `field_cut.jpg` | The rye field after the harvest. Composited over `field.jpg`'s own foreground, so the boulder, sickle and ditch in the lower third are from the original painting, not generated |
| `cat_walk.png` | The village cat in side profile, mid-stride |
| `jumis_bound.png` | The double ear bent down and tied with straw |
| `bridge_full_v2.png` | The stone-and-oak bridge, re-rendered to read at 200 px. Superseded, kept on disk |
| `bridge_full_v3.png` | The same bridge as a flat deck with a stone footing at each end. This is the one in the build |
| `item_bread_good.png` | A tall dark rye loaf — the bread from a good year |
| `item_bread_poor.png` | A flat pale slab — the bread from a stripped field |

Video, **Hailuo 2.3 Fast** (image-to-video):

| File | What it is |
|---|---|
| `tools/src/catwalk.mp4` | Six seconds of the cat walking on the spot, generated *from* `cat_walk.png` — same animal, same markings |
| `cat_walk_sheet.png` | Twelve frames cut from that take by `tools/build_catsheet.py`. Derived entirely from the two rows above; no new generation |

Same Picsart licence position as the audio above — commercial use permitted, no copyright or
non-infringement guarantee. The video model's terms were not separately located either; treat
the moving-image position as **unverified** alongside the audio.

## Art — pre-existing

`title.jpg` · `village.jpg` · `field.jpg` · `bog.jpg` · `granary_full.png` · `granary_poor.png` ·
`bridge_full.png` · `bridge_poor.png` · `jumis_stalk.png` · `velns.png` · `item_sickle.png` ·
`item_bread.png` · `item_cat.png` · `item_bag.png`

`item_bread.png` is no longer loaded by the build — the two new loaves replaced it — but it is
still on disk and still needs its provenance recorded.

**Provenance not recorded here — you need to fill this in.** These predate my involvement and I
do not know how they were made or under what terms. If any of them came from a model, a stock
library or a scanned painting, it belongs in this file with the same detail as the rows above.
`field.jpg` in particular reads as a nineteenth-century realist landscape; if it is a photograph
of a specific painting rather than an original generation, its copyright status needs checking
before release even though works of that period are usually public domain.

---

## Text

**Dainas** (`src/content/dainas.ts`) — traditional Latvian folk verse, public domain. Both
entries are currently marked `verified: false` and were written from memory. They must be checked
character-by-character against a primary source (dainuskapis.lv) before any public release, as
the file's own header says.

**The wind riddle** (`velns.riddle`) — traditional formula, public domain, also unverified against
a printed mīklu krājums.

All other text is original to this project.

---

*Last updated: 13 September 2026*
