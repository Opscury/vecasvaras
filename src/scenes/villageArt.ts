import Phaser from 'phaser';
import { type Outcome, type RunState } from '../core/state';
import { Painting } from '../ui/Painting';

/**
 * What the village painting looks like after each encounter. Shared by the
 * hub, the intro and the ending so they can never disagree about where the
 * granary stands.
 *
 * The coordinates were read off `village.jpg`. If the background art is ever
 * regenerated, these are the numbers to re-measure.
 */

/**
 * The two cottages in the painting that actually have chimneys. Smoke rising
 * from them is the single cheapest thing that turns a picture of some huts into
 * a place where people live, so it is worth measuring these properly.
 */
export const CHIMNEYS = [
  { x: 672, y: 300 },
  { x: 1358, y: 690 },
] as const;

/**
 * Windows that light up at dusk, in the order they come on. Anna's first;
 * each loaf in the granary lights one more. Read off `village.jpg`.
 */
export const WINDOWS = [
  { x: 650, y: 461, w: 12, h: 14 },
  { x: 909, y: 906, w: 15, h: 18 },
  { x: 1266, y: 907, w: 14, h: 22 },
  { x: 1323, y: 492, w: 12, h: 16 },
] as const;

/**
 * Evening over the village: the painting goes cool and dim, and `lit` windows
 * light — a fire inside, not a bulb. With `arriving`, it happens in front of
 * the player; otherwise it is already evening.
 *
 * Drawn inside the painting group, after everything else set into it, so the
 * drift carries the light with the houses.
 */
export function addEvening(
  scene: Phaser.Scene,
  painting: Painting,
  opts: { lit: number; arriving: boolean; depthAlpha?: number },
): void {
  const width = 1920;
  const height = 1080;
  const dim = opts.depthAlpha ?? 0.62;
  const dusk = painting.add(
    scene.add.rectangle(width / 2, height / 2, width, height, 0x56607a, 1).setBlendMode(Phaser.BlendModes.MULTIPLY),
  );
  dusk.setAlpha(opts.arriving ? 0 : dim);
  if (opts.arriving) scene.tweens.add({ targets: dusk, alpha: dim, duration: 2600, ease: 'Sine.easeInOut' });

  const lit = Math.max(0, Math.min(WINDOWS.length, opts.lit));
  WINDOWS.slice(0, lit).forEach((w, i) => {
    const pane = painting.add(
      scene.add.rectangle(w.x, w.y, w.w, w.h, 0xffc46a, 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0),
    );
    const glow = painting.add(
      scene.add
        .image(w.x, w.y, 'fx-blob')
        .setTint(0xffa850)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((w.w * 5) / 128, (w.h * 4) / 128)
        .setAlpha(0),
    );
    const delay = opts.arriving ? 1800 + i * 450 : 0;
    scene.tweens.add({ targets: pane, alpha: 0.85, duration: 500, delay });
    scene.tweens.add({ targets: glow, alpha: 0.45, duration: 700, delay });
    scene.tweens.add({
      targets: [pane, glow],
      alpha: '-=0.15',
      duration: Phaser.Math.Between(300, 700),
      delay: delay + 800,
      yoyo: true,
      repeat: -1,
      repeatDelay: Phaser.Math.Between(200, 1600),
      ease: 'Sine.easeInOut',
    });
  });
}

/**
 * A faint cool tint that knocks the generated sprites back into the painting's
 * own light; without it they read as stickers pasted on top.
 */
const BLEND = 0xd9d5cc;

/**
 * Where each upgrade stands and how big it is drawn.
 *
 * `x`/`y` is the point the sprite is pinned by, and `ox`/`oy` say which point
 * of the texture that is, as a fraction. Most things are pinned bottom-centre
 * (0.5, 1) and need nothing more.
 *
 * The good bridge is the exception, and the reason this is configurable. It is
 * a flat deck with a stone footing at each END, and it only reads as built
 * rather than floating if both footings land on solid ground. So it is pinned
 * by its NEAR footing — measured at (0.204, 0.754) of the texture — set down on
 * the village-side bank at (1448, 668), and rotated 12° so the far one comes
 * down on the path-side bank rather than out over the water.
 *
 * Two things worth knowing before touching these numbers. The sprite is drawn
 * at a steeper three-quarter angle (about 26°) than the crossing painted into
 * `village.jpg` (about 5°), so no single rotation puts both footings exactly on
 * the painted plank ends; 12° with a deck this long is the setting where both
 * stones are unambiguously on ground and the span still reads flat. And the
 * derelict planks are painted into the background, not a sprite, so they cannot
 * be removed — the good bridge is built over them, and a few old boards stay
 * visible under the right-hand half of the deck.
 */
const UPGRADES = {
  granary: {
    good: { key: 'granary-good', x: 470, y: 648, h: 235 },
    poor: { key: 'granary-poor', x: 470, y: 648, h: 200 },
  },
  bridge: {
    good: {
      key: 'bridge-good',
      x: 1448,
      y: 668,
      h: 185,
      ox: 0.204,
      oy: 0.754,
      angle: 12,
    },
    poor: { key: 'bridge-poor', x: 1575, y: 690, h: 85 },
  },
} as const;

interface Spot {
  key: string;
  x: number;
  y: number;
  h: number;
  /** Which point of the texture sits at (x, y). Defaults to bottom-centre. */
  ox?: number;
  oy?: number;
  /** Degrees clockwise, applied about that same point. */
  angle?: number;
}

/**
 * Drops the granary and bridge onto their slots at the quality the run earned.
 * `animate` settles them in on arrival; the ending shows them as already there.
 */
export function addUpgrades(
  scene: Phaser.Scene,
  painting: Painting,
  run: Readonly<RunState>,
  opts: { animate: boolean; alpha?: number; seen?: { jumis: Outcome; velns: Outcome } },
): void {
  const alpha = opts.alpha ?? 1;

  const place = (spot: Spot, fresh: boolean) => {
    const img = painting.add(
      scene.add
        .image(spot.x, spot.y, spot.key)
        .setOrigin(spot.ox ?? 0.5, spot.oy ?? 1)
        .setTint(BLEND),
    );
    // Rotation is about the origin, which is the whole point of pinning the
    // bridge by a footing rather than by its middle.
    if (spot.angle) img.setAngle(spot.angle);
    const scale = spot.h / img.height;
    // Only what is new settles in. A granary already seen on an earlier walk
    // through is simply standing there — it used to pop up on every return.
    if (!opts.animate || !fresh) {
      img.setScale(scale).setAlpha(alpha);
      return;
    }
    img.setScale(scale * 0.97).setAlpha(0);
    scene.tweens.add({
      targets: img,
      alpha,
      scale,
      duration: 1100,
      // After the camera has finished fading in and the player is looking —
      // at 400ms the building was already standing by the time the eye arrived.
      delay: 1400,
      ease: 'Back.easeOut',
    });
  };

  if (run.jumis !== 'none') place(UPGRADES.granary[run.jumis], opts.seen?.jumis !== run.jumis);
  if (run.velns !== 'none') place(UPGRADES.bridge[run.velns], opts.seen?.velns !== run.velns);
}
