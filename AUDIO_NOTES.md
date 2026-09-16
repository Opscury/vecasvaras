# Audio — implemented

Sound is in and working. Seventeen one-shots, two kokle lines, three ambient beds, one audio
system, wired to every place in the game that should make a noise. About **2.6 MB total** in
`public/audio/` (ogg + m4a, so a browser downloads about half that).

Twelve of the one-shots are generated and processed (below); five, and both kokle lines, are
synthesised from nothing by `tools/build_synth.py`, so there is no licence question for them.

## The system — `src/core/audio.ts`

One module, one singleton, `audio`. Scenes never touch `this.sound`; they say
`audio.play('click')` or `audio.ambient('bog')` and it decides volume, mute and whether the
browser has allowed sound yet.

Four decisions worth knowing about:

- **Relative volumes live in one table**, at the top of the file, next to the cue names. When
  the click is too loud that is one number in one place, not a hunt through ten scenes.
- **There is exactly one ambient channel.** Every scene asks for its bed in `create()` and the
  bus cross-fades from whatever was playing over 900 ms. Asking for the bed that is already
  playing does nothing, so walking back into the village does not restart the birdsong from
  the top. The old bed is destroyed once it has faded, so beds cannot pile up across a long run.
- **Browsers refuse audio before a real gesture.** A bed requested during `create()` is held
  and started by `audio.unlock()`, which hangs off the one-shot `pointerdown` listener already
  in `main.ts`. Before that, `play()` is a silent no-op rather than a throw.
- **A missing file costs you the sound, not the game.** Every cue checks the cache first. This
  is not defensive padding — the game ran correctly for an hour with the beds absent, and
  that is the state you want if a file ever 404s in production.

`?fx=off` silences everything too. It already meant "no ambient motion"; a quiet playtest
should be actually quiet.

## Where the cues fire

| Cue | Fires from |
|---|---|
| `click` / `hover` | `Hotspot` (every clickable thing in the world), `hit.ts` `padHit` (every text button — Begin, Continue, Skip, Retry, Start over), `Narration` choice rows, `Chrome` chips |
| `sickle` | `JumisScene.cut()`, on the same frame as the blade-flash |
| `bag` | `Bag.bump()` — something new landed in the bag |
| `bagOpen` / `bagClose` | `Bag.setOpen()` |
| `carve1/2/3` | `SignMark.carve()`, one stroke per stroke of the mark, cycled so no two repeat back to back |
| `cat` | Picking the cat up in the village, and again when it walks the planks |
| `cock` | The last line of the winning bread outcomes; the dawn, when nothing was paid |
| `tally` | `OutroScene.showTally()`, one knock as each debt is scored; each plank the Devil lays; a loaf reaching the bread row |
| `frog` | `VelnsScene.frogHint()` — a croak and a ring on the water from the plank that will hold |
| `splash` | A wrong step on the causeway; the Jumis ear pulled from the ground, pitched up |
| `gust` | The wind riddle — with the reed shader, the mist and a two-second swell of the bed |
| `sheaf` | The double ear bent down and tied |
| `chime` | A belief found (`Lore.showLoreToast`); the crumb landing at the stone |

And two longer pieces, through `audio.music()` rather than `play()`, so mute reaches them
mid-phrase:

| Tune | Plays |
|---|---|
| `kokleJumis` | as the harvest starts, under the verse card — the card is shown once per install, the tune every time |
| `kokleVelns` | the same, at the bog |
| `voiceJumis` / `voiceVelns` | **empty slots** — a sung line over the kokle, 600 ms in. See below. |

`audio.bedLevel(gain, ms)` scales the current bed without changing it: the gust swells the
bog to 1.35 for a moment, and from the first grey in the east the frogs thin to 0.35 over the
thirty seconds before the cocks. A new level replaces the one in progress rather than racing
it, and changing beds resets it.

Two implementation notes on those:

`hit.ts` was the right place for the button sounds because it is the only thing every text
button in the game already shares. Doing it per caller means the next button someone adds is
silent by default.

The cock crow is written into the third line of `breadGood` / `breadGoodFumbled` ("Purvā kaut
kur iebrēcas gailis"). Rather than guess a delay, `VelnsScene.resolve` now splits that run:
says the first lines, plays the crow, says the last one. The sound lands on the sentence.

## Keyboard and controls

`M` toggles mute, and there is a `♪` chip to the left of `⟲` and `EN`. Mute persists in
`localStorage` under `vecasvaras.muted` and fades the bed rather than cutting it.

## The one-shots

Generated with ElevenLabs SFX v2 via Picsart, then processed with `tools/build_audio.py`.
110 ms to 1.2 s, mono, all peak-normalised to −2 dBFS so relative volume is set in code.

What the script exists for, because it is not obvious: **ElevenLabs gets the material right
and the count wrong.** Asked for one knock on wood it returns six; the sickle came back as two
swings. `isolate_hit()` takes the loudest transient and lets it ring out, requiring the
envelope to *stay* below the floor for 70 ms — without that hold, a momentary dip clipped the
sickle's shear tail off at 170 ms. And five of the twelve — all three carves, the mallet and
the crow — came back as continuous textures with no gap to find at all, so those use
`window_hit()`, a fixed window on the loudest peak.

## The synthesised sounds — `tools/build_synth.py`

    cd tools && python3 build_synth.py      # numpy, scipy, ffmpeg; deterministic

**The kokle** is Karplus-Strong: a burst of noise in a delay line one period long, averaged on
every pass — a plucked string in a few lines — with a body resonance and a short room after.
The two lines are written for this game in the idiom of Latvian recitative song (narrow range,
repeated notes, a falling cadence onto the tonic): G mixolydian for the harvest, D dorian and
slower for the bog. **They are not transcriptions of any traditional tune** — if a real
melody is wanted, the dainas' own tunes are public domain and a recording can replace these
files without a code change.

The five one-shots are built from the same kit: the frog is two runs of short resonant
pings (a common frog's purr), band-passed; the gust is noise under a band that sweeps up and
back, with some brown noise under it, panned left to right; the splash is a noise slap under
a falling low-pass with a few rising-sine bubbles after; the sheaf is a soft low thump and a
spill of dry crackle; the chime is one kokle pluck and its fifth, left to ring. Peaks sit at
−2 dBFS (−3 for the stereo gust, the chime and the kokle lines) and the encoding is
`build_audio.py`'s.

## The beds

Real field recordings from Freesound, not generated. A 10-second AI take gave a 7.5-second
loop, and a distinctive bird phrase eight times a minute is worse than silence.

`tools/analyse_ambience.py` scores candidates on level variation, crest factor and spectral
balance, and finds the **steadiest 30-second window** in each — a bed with a distinctive event
in it announces its own period. Those offsets are what `tools/build_beds.py` cuts:

| Bed | Source | Window | Result |
|---|---|---|---|
| `amb_village` | 523372 *Woods ambience summer, birds, light wind* | @90 s | 27.5 s loop, CC0 |
| `amb_field` | 81796 *Wind / dry grass / swifts* | @6 s | 27.5 s loop, CC0 |
| `amb_bog` | 156448 *swamp_at_dusk* | @168 s | 27.5 s loop, **CC BY** |

The bog needed a mix move: 79% of that recording's energy sits above 2 kHz, which is lovely
on its own but reads as hiss in a cold twilight scene. It gets a −5 dB shelf above 4.5 kHz and
+2.5 dB below 200 Hz so it sits in the bog's register instead of over it.

`make_loop()` mixes each clip's own tail over its own head under a linear crossfade, so the
wrap is a normal sample-to-sample step rather than a click.

Beds encode at vorbis q1 / AAC 56k rather than the one-shot settings — broadband noise at 25%
volume is indistinguishable at that rate and it is less than half the bytes. That took the
three beds from 1.6 MB to 800 KB of ogg, which matters on a game already shipping 5.6 MB of
paintings.

## Verified in the browser

Played through with the sound manager instrumented. Confirmed: all 15 files decode; the
village bed starts on the first click and loops at its target volume; walking to the field
cross-fades to `amb_field` and **destroys** the village bed rather than leaving it running;
`hover`, `click`, `bag`, `bagOpen`, `bagClose`, `cat` and `sickle` all fire at the right
moments; mute persists and fades the bed to zero. `tsc` clean, `vite build` clean, 30 tests
pass.

One thing fixed during testing: taking an item out of the bag fired `bagOpen` then
`bagClose` then the action, so one click sounded like three. The close is now suppressed when
the tray is shutting as a side effect of `take()` rather than because the player closed it.

## Still open

**The sung verses.** The biggest atmosphere upgrade left, and it wants a person: one sung line
per verse card, unaccompanied or over the kokle, recorded on a phone in a quiet room is enough.
Save it as `public/audio/voice_jumis.ogg` + `.m4a` (and `voice_velns`), then add `'voiceJumis'`
/ `'voiceVelns'` to `SHIPPED_TUNES` in `core/audio.ts` — nothing else changes. Until then the
loader does not ask for the files.

**The Devil's laugh.** Unchanged: it wants a person. Generated laughter lands cartoonish or
uncanny, and it is the one sound in the game with a character behind it. There is no cue slot
for it yet — add `laugh` to `CUES` in `audio.ts` and fire it from `velns.riddleWrong` when you
have a recording.

**Rotate the Freesound credential.** The key was posted into the chat as a screenshot, so it
is in the conversation log and two image files. Delete it on Freesound and make a new one.
`.freesound-key` is now in `.gitignore` for when you do.

## Credit you must ship

One of the three beds is CC BY 4.0 and requires attribution wherever the game is published:

> Bog ambience: *swamp_at_dusk* by BethanyFerrell, licensed CC BY 4.0.
> https://freesound.org/people/BethanyFerrell/sounds/156448/

The other two beds are CC0 and the one-shots are generated, so that is the only line legally
required. `CREDITS.md` has the full record.

The AI-disclosure question from before still stands and now covers twelve sounds as well as
four images: find out what VKKF asks before the package grows.
