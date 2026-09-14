/**
 * Headless screenshot harness for Vecās Varas.
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

const PORT = 4173;
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
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
const ctx = await browser.newContext({
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
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || t.startsWith('DBG')) console.log(t);
});

await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => !!window.__game, { timeout: 30000 });
// Every texture the game will use has to be in before any scene is entered by
// hand; the title scene fetches them while it is on screen.
await page.waitForFunction(
  () => {
    const g = window.__game;
    if (!g) return false;
    return ['bg-village', 'bg-field', 'bg-field-cut', 'jumis-stalk', 'jumis-bound', 'item-sickle', 'elder', 'velns', 'bg-bog'].every(
      (k) => g.textures.exists(k),
    );
  },
  { timeout: 60000 },
);

// Only once the loader has finished: until then the game needs its own clock.
await page.evaluate(() => {
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

const name = process.argv[2] ?? 'field';
const steps = (await import(`./shots/${name}.mjs`)).default;

let n = 0;
for (const step of steps) {
  if (typeof step === 'function') {
    await page.evaluate(step);
  } else if (step.wait) {
    await page.evaluate((ms) => window.__advance(ms), step.wait);
  } else if (step.shot) {
    await page.evaluate(() => window.__paint());
    const file = path.join(out, `${name}-${String(++n).padStart(2, '0')}-${step.shot}.png`);
    await page.screenshot({ path: file });
    console.log('wrote', file);
  }
}

await browser.close();
server.close();
