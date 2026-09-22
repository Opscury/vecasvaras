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
 * The hour, before evening.
 *
 * The run is one day. It starts early — cool, the mist still lying in the
 * hollows, the sun low over the bog road in the east — and by the time the cart
 * is home from the field it is afternoon: the light warm and coming from the
 * west, where the field is. Evening (`addEvening`) follows the bog.
 *
 * Two layers each: the whole painting multiplied towards the hour's colour, and
 * a broad soft glow screened in from the side the sun is on. `arriving` turns
 * morning into afternoon in front of the player, on the walk home.
 */
export type Hour = 'morning' | 'afternoon';

const HOURS: Record<Hour, { wash: number; sun: number; at: { x: number; y: number }; sunAlpha: number }> = {
  morning: { wash: 0xdfe5ec, sun: 0xffe9c8, at: { x: 1780, y: 180 }, sunAlpha: 0.2 },
  afternoon: { wash: 0xf4e4c6, sun: 0xffc26e, at: { x: 150, y: 170 }, sunAlpha: 0.26 },
};

export function addDaylight(
  scene: Phaser.Scene,
  painting: Painting,
  hour: Hour,
  opts: { arriving?: boolean } = {},
): void {
  const make = (h: Hour, alpha: number) => {
    const def = HOURS[h];
    const wash = painting.add(
      scene.add.rectangle(960, 540, 1920, 1080, def.wash, 1).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(alpha),
    );
    const sun = painting.add(
      scene.add
        .image(def.at.x, def.at.y, 'fx-blob')
        .setTint(def.sun)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setScale(15, 11)
        .setAlpha(def.sunAlpha * alpha),
    );
    return { wash, sun, def };
  };

  if (!opts.arriving || hour === 'morning') {
    make(hour, 1);
    return;
  }
  // Morning going over into afternoon while the player watches.
  const from = make('morning', 1);
  const to = make('afternoon', 0);
  scene.tweens.add({ targets: [from.wash], alpha: 0, duration: 3200, delay: 600, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: [from.sun], alpha: 0, duration: 3200, delay: 600, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: [to.wash], alpha: 1, duration: 3200, delay: 600, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: [to.sun], alpha: to.def.sunAlpha, duration: 3200, delay: 600, ease: 'Sine.easeInOut' });
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

/**
 * The sheaves leaning on the granary's near wall — one per loaf in the store.
 *
 * The gauge along the top of the screen says how much bread there is; this is
 * the same fact standing in the painting, where the player is actually
 * looking. A store you can count from across the yard is worth more than a
 * number, and it is the difference between a building that changed once behind
 * a fade and a village that is visibly better off than it was this morning.
 *
 * Measured against the granary: it stands 235 tall on the old foundation, so a
 * sheaf at that depth is a little under a third of it.
 */
const SHEAVES = [
  // Middle first: a lean year stands one sheaf here, and one sheaf at the end
  // of the row reads as something left behind rather than as the store.
  { x: 474, y: 716, h: 120, angle: 4, key: 'sheaf-b' },
  { x: 392, y: 704, h: 112, angle: -7, key: 'sheaf-a' },
  { x: 556, y: 708, h: 108, angle: -3, key: 'sheaf-a' },
] as const;

/** How many can stand there. The bread gauge is capped to the same number. */
export const SHEAF_SLOTS = SHEAVES.length;

/**
 * Stands one sheaf against the wall. `animate` drops it in, for a sheaf that
 * arrives while the player is watching Anna thresh the cart.
 */
export function addSheaf(
  scene: Phaser.Scene,
  painting: Painting,
  index: number,
  animate: boolean,
): Phaser.GameObjects.Image | null {
  const spot = SHEAVES[index];
  if (!spot) return null;

  const shade = scene.add.graphics();
  shade.fillStyle(0x14161a, 0.3);
  shade.fillEllipse(spot.x, spot.y - 3, spot.h * 0.4, spot.h * 0.1);
  painting.add(shade);

  const img = painting.add(scene.add.image(spot.x, spot.y, spot.key).setOrigin(0.5, 1));
  // Lighter than the buildings take: straw catches what light there is, and at
  // the buildings' tint a sheaf on the dark ground read as a bush.
  img.setScale(spot.h / img.height).setAngle(spot.angle).setTint(0xe4e0d6);
  if (!animate) return img;

  shade.setAlpha(0);
  const rest = img.y;
  img.setY(rest - 40).setAlpha(0);
  scene.tweens.add({ targets: shade, alpha: 1, duration: 400, delay: 120 });
  scene.tweens.add({ targets: img, y: rest, alpha: 1, duration: 420, ease: 'Back.easeOut' });
  return img;
}

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
