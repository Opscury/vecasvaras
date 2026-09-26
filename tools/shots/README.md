# Screenshot scripts

One file per thing worth looking at. `node tools/shot.mjs <name>` runs
`<name>.mjs` against the built game (`npm run build` first) in a headless
Chromium at phone size — 812×375 at 2×, touch — and drops PNGs in `shots/`.
`SHOT_PORT` picks the local port (default 4173).

A script is a list of steps. A step is one of:

- a function — serialised and run inside the page, so it can close over nothing
  in the file and has to look the live scene up for itself (through `__h`);
- `{ wait: ms }` — advances the game clock by exactly that much;
- `{ shot: 'name' }` — renders one frame and saves it;
- `{ grab: 'name' }` — saves the next download the page makes (the share card).

The game clock is stepped by hand, not by requestAnimationFrame: software WebGL
in a sandbox renders at a few frames a second, so wall time means nothing.

`<name>.seed.json` beside a script, if present, is written into localStorage
*before the bundle runs*. That matters: the run state and the bag are
singletons built at import time, so anything a step writes into localStorage
has already been missed. A script can also import another's steps and add its
own (`after.mjs` = `spare.mjs` + `_after.mjs`); files starting with `_` are
parts, not routes. `<name>-en.mjs` re-runs a route with an English seed.

## `__h`, the page-side helpers

| Helper | Does |
|---|---|
| `start(key, data?)` | stops every running scene and starts `key` |
| `scene(key)` | the live scene, private fields and all |
| `next(key)` / `type(key)` | finish the typing and advance / only finish it |
| `drain(key, max?)` | read on through every queued line (and whatever they start) until a decision or silence |
| `waitSay(key, max?)` | step the clock until the panel has something on it |
| `pick(key, i)` | choose the i-th option on screen |
| `card(key)` | tap the full-screen card on top (the verse, the reckoning) |
| `spot(key, id)` | a hotspot by id — `.activate()` is a tap on it |
| `use(key, item, spotId)` | take an item from the bag and use it on a hotspot |
| `press(key, ...labels)` | tap a text button by its label, in either language |
| `key(k)` | a key press, as the browser would send it |
| `sweep(key, ys, x0?, x1?)` | a sickle stroke along each row |
| `catchDownload()` | route the next download to a `{ grab }` step |
| `state()` / `nar(key)` / `log(...)` | the saved run, the panel's state, a `DBG` line in the output |
| `assert(ok, ...what)` | a check: fails the route (exit code 1) unless `ok` |

The page also exposes `__vv` — `{ state, bag, lore }`, the live run — so a
route can set a moment up directly (`__vv.state.patch({...})`, `__vv.bag.add('cat')`)
instead of playing up to it. A page error or a failed `assert` stops the route
and exits non-zero, so a route can gate a push.

## Routes

| Script | Covers |
|---|---|
| `smoke` | **pass/fail** — `npm run smoke`: Anna tapped mid-threshing, the cat after a reload, the night waiting for the book, the folklore in a production build |
| `run` | a whole first year from a fresh install, into the next year |
| `tithe`, `spare`, `take`, `greed`, `jumisloaf` | the four field endings, and the Jumis loaf at the bog |
| `endings` | all four field reckoning cards in a row |
| `keys`, `keys-all` | the field by keyboard only, including the cut ear |
| `yard` | home from the field: the granary, the carving, Anna threshing the cart |
| `after`, `after-take` | walking back out to the field as it was left |
| `bog`, `bog2`, `catpay`, `dawn` | the causeway, both riddles, the night, and four ways to settle |
| `evening` | home from the bog → Anna → the stone → the tally → share card → year two |
| `crumb` | the first crumb, the item replies, the beliefs page in both languages |
| `field`, `hold`, `outro` | older single-screen checks |
| `audio` | which sounds loaded and decoded (no screenshots) |

Needs `npm i -D playwright` and a Chromium; see the header of `shot.mjs`.

## Added in the HUD-and-map pass (Sept 2026)

| script | what it is for |
|---|---|
| `map` | The map at two stages: the bog road open, the crossing still missing |
| `map2` | The map once the bridge is built, and the village that evening |
| `pages` | The title, the bog under a daina card, the beliefs page, the log |
| `errand` | `yard` plus Anna's second errand, to catch the "a way has opened" beat |
