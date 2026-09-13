import Phaser from 'phaser';
import { type RunState } from '../core/state';
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
  opts: { animate: boolean; alpha?: number },
): void {
  const alpha = opts.alpha ?? 1;

  const place = (spot: Spot) => {
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
    if (!opts.animate) {
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

  if (run.jumis !== 'none') place(UPGRADES.granary[run.jumis]);
  if (run.velns !== 'none') place(UPGRADES.bridge[run.velns]);
}
