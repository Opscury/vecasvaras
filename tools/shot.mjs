/**
 * Headless screenshot harness for Senciems.
 *
 * The browser pane on the dev machine throttles a backgrounded tab hard enough
 * that the asset loader takes a minute and the game clock barely ticks, which
 * makes looking at a scene a five-minute round trip. This runs the built game
 * in a real Chromium at a phone-shaped viewport, drives it through
 * `window.__game`, and writes PNGs.
 *
 *   node tools/shot.mjs <script-name>
 *
 * Each script is a list of steps; a step is either a function run in the page
 * or a { shot } marker. Add one per thing you want to look at.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'shots');
fs.mkdirSync(out, { recursive: true });

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(dist, rel === '/' ? 'index.html' : rel);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const PORT = Number(process.env.SHOT_PORT ?? 4173);
await new Promise((r) => server.listen(PORT, r));

// The sandbox this was written in keeps its Chromium here. Anywhere else,
// Playwright's own (`npx playwright install chromium`), or CHROMIUM_PATH.
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
  process.env.CHROMIUM_PATH ?? (fs.existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);

// PERF=1: a real clock in real Chrome on the real GPU, for hunting hitches and
// stray fades. Waits are wall time; the frame log is printed at the end.
const PERF = process.env.PERF === '1';
const browser = await chromium.launch({
  ...(PERF ? { channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'] } : {}),
  // On the dev PC there is no Playwright browser download: use the installed Chrome.
  ...(!PERF && !executablePath && process.platform === 'win32' ? { channel: 'chrome' } : {}),
  executablePath: PERF ? undefined : executablePath,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    // Without these the renderer is treated as backgrounded and rAF all but
    // stops between screenshots: a 700ms fade took the whole run, and any card
    // that waits for its own fade before accepting a click was unclickable.
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion',
  ],
});

// A phone held sideways, which is the case that mattered in the playtest.
const ctx = await browser.newContext(PERF ? { viewport: { width: 1280, height: 720 } } : {
  viewport: { width: 812, height: 375 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
});
// Seed any saved state a shot script wants BEFORE the bundle runs: the run
// state and the bag are singletons built at import time, so anything written
// into localStorage from a step has already been missed.
// Scripted clicks wait fixed times, so the player arrives at once unless a
// script is about the walking itself (WALK=1).
if (!process.env.WALK) await ctx.addInitScript(() => (window.__vvInstantWalk = true));
const seedPath = path.join(root, 'tools', 'shots', `${process.argv[2] ?? 'field'}.seed.json`);
if (fs.existsSync(seedPath)) {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  await ctx.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, seed);
}

const page = await ctx.newPage();
// A route fails if the page throws, as well as when one of its own checks does.
const failures = [];
page.on('pageerror', (e) => {
  console.log('PAGE ERROR:', e.message);
  failures.push(e.message);
});
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || t.startsWith('DBG')) console.log(t);
});

// PERF=1 also records a CPU profile of the whole run, for finding what a long
// frame was busy with (shots/perf.cpuprofile).
let cdp = null;
if (PERF) {
  cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  if (process.env.PERF_TRACE) await browser.startTracing(page, { path: path.join(out, 'perf-trace.json'), categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'blink', 'gpu', 'toplevel'] });
}
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => !!window.__game, { timeout: 30000 });
if (PERF) {
  await page.evaluate(() => {
    const g = window.__game;
    const t0 = performance.now();
    const log = (window.__perf = []);
    const at = () => Math.round(performance.now() - t0);
    const active = () => g.scene.getScenes(true).map((s) => s.scene.key).filter((k) => k !== 'Stream').join('+');
    g.scene.scenes.forEach((s) => {
      for (const ev of ['start', 'create', 'shutdown']) s.events.on(ev, () => log.push(`${at()} ${s.scene.key} ${ev}`));
    });
    let last = performance.now();
    const tick = (now) => {
      const d = now - last;
      if (d > 30) log.push(`${at()} LONG ${Math.round(d)}ms in ${active()}`);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Markers for what the game did, to line a long frame up with its cause.
    const wrap = (obj, fn, tag) => {
      const f = obj[fn].bind(obj);
      obj[fn] = (...a) => {
        log.push(`${at()} ${tag} ${a[0]}`);
        return f(...a);
      };
    };
    const vv = window.__vv;
    if (vv) {
      wrap(vv.lore, 'unlock', 'lore');
      if (vv.audio) {
        wrap(vv.audio, 'play', 'sfx');
        wrap(vv.audio, 'ambient', 'amb');
        wrap(vv.audio, 'music', 'music');
      }
    }
    window.__advance = () => {};
    window.__paint = () => {};
  });
}

// Every texture the game will use has to be in before any scene is entered by
// hand; the title scene fetches them while it is on screen.
if (!PERF) await page.waitForFunction(
  () => {
    const g = window.__game;
    if (!g) return false;
    return ['bg-village', 'bg-field', 'bg-field-cut', 'jumis-stalk', 'jumis-bound', 'item-sickle', 'elder', 'velns', 'bg-bog', 'cat-walk', 'item-hat', 'portrait-anna', 'portrait-velns', 'codex-gailis', 'codex-velnaTilts', 'sheaf-a', 'sheaf-b'].every(
      (k) => g.textures.exists(k),
    );
  },
  { timeout: 60000 },
);

// Only once the loader has finished: until then the game needs its own clock.
if (!PERF) await page.evaluate(() => {
  const g = window.__game;
  // Take the clock off requestAnimationFrame.
  //
  // Software WebGL in this sandbox renders a 1920x1080 Phaser canvas at two or
  // three frames a second, and it saturates the main thread badly enough that
  // a setInterval(50) fires three times in two seconds. Anything waited on in
  // wall time therefore means nothing here: a 700ms fade-in took the length of
  // the whole run, and every card that refuses clicks until it has finished
  // fading in was simply unclickable.
  //
  // So the game is stepped by hand instead. `__advance` runs the scene update
  // for a number of milliseconds of GAME time, in fixed slices, without
  // rendering; `__paint` renders one frame, just before a screenshot. A wait in
  // a shot script now means exactly what it says, and costs almost nothing.
  g.loop.stop();
  g.loop.smoothStep = false;
  window.__t = 1000;
  window.__step = 25;
  // Tweens keep their own clock — a GSAP-style ticker reading performance.now()
  // with lag smoothing — so stepping the scenes alone leaves every tween frozen
  // in wall time. Feed that ticker the synthetic slice instead.
  Object.getPrototypeOf(g.scene.getScene('Boot').tweens).getDelta = () => window.__step;
  // A full game step each slice, with every scene marked invisible so the
  // renderer skips the pixel work: camera effects — the fades scene changes
  // hang on — only advance inside a real frame, not inside a bare scene update.
  window.__advance = (ms, step = 25) => {
    const n = Math.max(1, Math.round(ms / step));
    window.__step = step;
    const was = g.scene.scenes.map((s) => s.sys.settings.visible);
    g.scene.scenes.forEach((s) => (s.sys.settings.visible = false));
    for (let i = 0; i < n; i++) {
      window.__t += step;
      // The frame counter normally ticks inside TimeStep, which is stopped:
      // the game compares frame numbers to tell one click from two, so leaving
      // it frozen makes every advance look like a double-click on the same one.
      g.loop.frame++;
      g.step(window.__t, step);
    }
    g.scene.scenes.forEach((s, i) => (s.sys.settings.visible = was[i]));
  };
  window.__paint = () => {
    window.__t += 16;
    window.__step = 16;
    g.loop.frame++;
    g.step(window.__t, 16);
  };
});

// Small helpers for the scripts, installed in the page. Scripts are
// serialised functions, so anything they share has to live over there.
await page.evaluate(() => {
  const g = window.__game;
  window.__h = {
    scene: (k) => g.scene.getScene(k),
    start: (k, data) => {
      g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key));
      g.scene.start(k, data);
    },
    type: (k) => g.scene.getScene(k).narration.finishTyping(),
    next: (k) => {
      const n = g.scene.getScene(k).narration;
      n.finishTyping();
      n.advance();
    },
    pick: (k, i) => {
      const n = g.scene.getScene(k).narration;
      n.pick(n.choices[i]);
    },
    /** Clicks the full-screen card on top: the verse, or the reckoning. */
    card: (k) => {
      const s = g.scene.getScene(k);
      const hit = s.children.list
        .filter((o) => o.type === 'Zone' && (o.depth === 810 || o.depth === 840))
        .pop();
      hit?.emit('pointerdown', { button: 0 }, 0, 0, { stopPropagation() {} });
    },
    spot: (k, id) => g.scene.getScene(k).spots.find((h) => h.id === id),
    sweep: (k, ys, x0 = 60, x1 = 1900) => {
      const j = g.scene.getScene(k);
      for (const y of ys) {
        j.strokeFrom = { x: x0, y };
        for (let x = x0; x <= x1; x += 40) j.strike(x, y);
        j.protectTuft();
        j.strokeFrom = null;
      }
    },
    /**
     * Reads on through every line queued — and whatever those lines start —
     * stopping at a decision or once the panel is empty. Returns lines read.
     */
    drain: (k, max = 30) => {
      for (let i = 0; i < max; i++) {
        const x = g.scene.getScene(k).narration;
        if (!g.scene.isActive(k) || !x || x.choices.length || (!x.current && !x.queue.length && !x.typing)) return i;
        x.finishTyping();
        x.advance();
        window.__advance(300);
      }
      return max;
    },
    /** Steps game time until the panel has something up, or `max` ms pass. */
    waitSay: (k, max = 8000) => {
      for (let t = 0; t < max; t += 250) {
        const x = g.scene.getScene(k).narration;
        if (x && (x.current || x.queue.length || x.typing || x.choices.length)) return t;
        window.__advance(250);
      }
      return -1;
    },
    /** Presses a text button by (part of) its label, in whichever language is up. */
    press: (k, ...labels) => {
      const s = g.scene.getScene(k);
      // Into containers too: a Notice keeps its button inside one.
      const all = [];
      const walk = (list) => list.forEach((o) => (o.type === 'Container' ? walk(o.list) : all.push(o)));
      walk(s.children.list);
      const btn = all
        .filter((o) => o.type === 'Text' && labels.some((l) => o.text.includes(l)))
        .pop();
      if (!btn) throw new Error(`no button "${labels.join('" / "')}" in ${k}`);
      btn.emit('pointerdown', { button: 0 }, 0, 0, { stopPropagation() {} });
    },
    /** Takes an item from the bag and offers it at a hotspot, as a tap would. */
    use: (k, item, spotId) => {
      const s = g.scene.getScene(k);
      const at = s.spots.find((h) => h.id === spotId).center;
      s.bagUi.take(item);
      s.bagUi.offer(at.x, at.y);
    },
    /** A key press, as the browser would deliver it. */
    key: (key) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      window.__advance(50);
      window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    },
    /** Downloads land in window.__grab as a data URL, for a { grab } step. */
    catchDownload: () => {
      window.__grab = null;
      URL.createObjectURL = (blob) => {
        const r = new FileReader();
        r.onload = () => (window.__grab = r.result);
        r.readAsDataURL(blob);
        return 'data:text/plain,x';
      };
    },
    /** Where the panel is: for DBG lines when a script loses its place. */
    nar: (k) => {
      const n = g.scene.getScene(k).narration;
      return { busy: n.busy, idle: n.idle, choices: n.choices.length, queue: n.queue.length, line: n.label?.text?.slice(0, 40) };
    },
    state: () => JSON.parse(localStorage.getItem('vecasvaras.save.v4') || '{}'),
    log: (...a) => console.log('DBG', ...a.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))),
    /** A check: throws, and so fails the route, unless `ok`. */
    assert: (ok, ...what) => {
      if (!ok) throw new Error('ASSERT ' + what.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' '));
      console.log('DBG ok', ...what.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))));
    },
  };
});

// At real speed the panel needs real time between lines: the same helpers,
// awaited in wall time (page.evaluate waits on a returned promise).
if (PERF) {
  await page.evaluate(() => {
    const g = window.__game;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__h.drain = async (k, max = 30) => {
      for (let i = 0; i < max; i++) {
        const x = g.scene.getScene(k).narration;
        if (!g.scene.isActive(k) || !x || x.choices.length || (!x.current && !x.queue.length && !x.typing)) return i;
        x.finishTyping();
        x.advance();
        await sleep(350);
      }
      return max;
    };
    // A sweep at the pace of a hand, not three hundred strokes in one frame.
    window.__h.sweep = async (k, ys, x0 = 60, x1 = 1900) => {
      const j = g.scene.getScene(k);
      for (const y of ys) {
        j.strokeFrom = { x: x0, y };
        for (let x = x0; x <= x1; x += 40) {
          j.strike(x, y);
          await sleep(16);
        }
        j.protectTuft();
        j.strokeFrom = null;
      }
    };
    const log = window.__h.log;
    window.__h.log = async (...a) => log(...(await Promise.all(a)));
    window.__h.waitSay = async (k, max = 8000) => {
      for (let t = 0; t < max; t += 250) {
        const x = g.scene.getScene(k).narration;
        if (x && (x.current || x.queue.length || x.typing || x.choices.length)) return t;
        await sleep(250);
      }
      return -1;
    };
  });
}

const name = process.argv[2] ?? 'field';
const steps = (await import(`./shots/${name}.mjs`)).default;

let n = 0;
for (const step of steps) {
  if (typeof step === 'function') {
    try {
      await page.evaluate(step);
    } catch (e) {
      const msg = String(e.message ?? e).split('\n')[0];
      console.log('FAIL:', msg);
      failures.push(msg);
      break;
    }
  } else if (step.wait) {
    if (PERF) await page.waitForTimeout(step.wait);
    else await page.evaluate((ms) => window.__advance(ms), step.wait);
  } else if (step.grab) {
    const handle = await page.waitForFunction(() => window.__grab, null, { timeout: 15000 });
    const url = await handle.jsonValue();
    const file = path.join(out, `${name}-${String(++n).padStart(2, '0')}-${step.grab}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    await page.evaluate(() => (window.__grab = null));
    console.log('wrote', file);
  } else if (step.shot && PERF) {
    continue;
  } else if (step.shot) {
    await page.evaluate(() => window.__paint());
    const file = path.join(out, `${name}-${String(++n).padStart(2, '0')}-${step.shot}.png`);
    await page.screenshot({ path: file });
    console.log('wrote', file);
  }
}

if (PERF) {
  await page.waitForTimeout(1500);
  console.log((await page.evaluate(() => window.__perf)).join('\n'));
  const { profile } = await cdp.send('Profiler.stop');
  fs.writeFileSync(path.join(out, 'perf.cpuprofile'), JSON.stringify(profile));
  if (process.env.PERF_TRACE) await browser.stopTracing();
  // performance.now() at the moment the frame log started, to line the two up.
  console.log('T0', await page.evaluate(() => performance.timeOrigin));
}

await browser.close();
server.close();
if (failures.length) {
  console.log(`\n${failures.length} failure(s) in ${name}.`);
  process.exit(1);
}
