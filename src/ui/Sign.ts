import Phaser from 'phaser';
import { Palette } from '../core/theme';
import { audio } from '../core/audio';

/**
 * The carved marks used to report how an encounter went.
 *
 * The design problem: the player needs to know whether they did well, and a
 * score or a green tick would wreck the tone in one frame. The answer is that
 * the mark itself carries the verdict — a share left whole gets a whole sign,
 * cut deep and warm; a half share gets the same sign left unfinished, cold
 * and broken off mid-stroke. You do not need to be told which one is better.
 *
 * `jumis` is the Jumja zīme, a real and very well attested Latvian ornament:
 * a rhombus whose four sides overshoot the corners and cross. `crossing` is
 * NOT a traditional sign — it is an invented glyph for the bog bridge, built
 * in the same straight-line language so it sits beside the real one without
 * pretending to be folklore. Keep that distinction if you add more.
 *
 * The mark is drawn around its own origin and placed with the object's
 * position, so it can be moved and shrunk as one thing — which is how a mark
 * carved on the reckoning card comes to rest on the village stone.
 */

export type SignKey = 'jumis' | 'crossing';

export type SignPath = Array<[number, number]>;

/** Paths in a normalised -1..1 box around the mark's centre. */
export function signPaths(key: SignKey): SignPath[] {
  if (key === 'jumis') {
    // A rhombus with every side extended past the vertex, so the ends cross in
    // little horns at top and bottom — the standard Jumis form.
    const o = 1.0; // vertex
    const e = 0.42; // overshoot
    return [
      [
        [-o - e * 0.55, -e * 0.55],
        [0 + e * 0.55, -o - e * 0.55],
      ],
      [
        [o + e * 0.55, -e * 0.55],
        [0 - e * 0.55, -o - e * 0.55],
      ],
      [
        [-o - e * 0.55, e * 0.55],
        [0 + e * 0.55, o + e * 0.55],
      ],
      [
        [o + e * 0.55, e * 0.55],
        [0 - e * 0.55, o + e * 0.55],
      ],
    ];
  }

  // The crossing. Stroke ORDER matters: an unfinished mark simply stops when it
  // runs out of budget, so the water and the near bank go down first and the
  // span is drawn left to right. A half-carved mark is then literally a bridge
  // that stops in the middle of the river.
  return [
    [
      [-1.0, 0.52],
      [-0.5, 0.3],
      [0.0, 0.52],
      [0.5, 0.3],
      [1.0, 0.52],
    ],
    [
      [-0.8, 0.18],
      [-0.8, -0.2],
    ],
    [
      [-1.06, -0.2],
      [1.06, -0.2],
    ],
    [
      [0.8, 0.18],
      [0.8, -0.2],
    ],
    [
      [-1.06, -0.52],
      [-0.72, -0.2],
    ],
    [
      [1.06, -0.52],
      [0.72, -0.2],
    ],
  ];
}

export function pathLength(p: SignPath): number {
  let d = 0;
  for (let i = 1; i < p.length; i++) {
    d += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  }
  return d;
}

/** How much of the stroke a mark gets: all of it, or broken off past half. */
export const signEnd = (complete: boolean): number => (complete ? 1 : 0.56);

/**
 * Walks the first `t` of a mark's total stroke length, calling `seg` for each
 * straight piece. Shared by the Phaser mark and the share card's canvas.
 */
export function walkSign(key: SignKey, t: number, seg: (ax: number, ay: number, bx: number, by: number) => void): void {
  const all = signPaths(key);
  const total = all.reduce((n, p) => n + pathLength(p), 0);
  let budget = total * t;
  for (const p of all) {
    for (let i = 1; i < p.length; i++) {
      if (budget <= 0) return;
      const [ax, ay] = p[i - 1];
      const [bx, by] = p[i];
      const len = Math.hypot(bx - ax, by - ay);
      const f = Math.min(1, budget / len);
      seg(ax, ay, ax + (bx - ax) * f, ay + (by - ay) * f);
      budget -= len;
    }
  }
}

export interface SignOpts {
  x: number;
  y: number;
  size: number;
  key: SignKey;
  /** A whole mark, or one that stops partway. */
  complete: boolean;
  depth?: number;
  /** Line weights, for marks drawn small (on the stone). */
  width?: number;
  /** Override colours — the stone's marks are cut into grey rock. */
  colour?: number;
  alpha?: number;
  /** Quiet the carving sound. */
  silent?: boolean;
}

export class SignMark {
  private g: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private opts: SignOpts;
  private all: SignPath[];
  private total: number;
  private carving: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, opts: SignOpts) {
    this.opts = opts;
    this.all = signPaths(opts.key);
    this.total = this.all.reduce((n, p) => n + pathLength(p), 0);

    this.glow = scene.add
      .graphics()
      .setDepth((opts.depth ?? 820) - 1)
      .setPosition(opts.x, opts.y);
    this.g = scene.add
      .graphics()
      .setDepth(opts.depth ?? 820)
      .setPosition(opts.x, opts.y);
    this.render(0);
  }

  /**
   * Animates the mark being cut. A whole share draws all the way and then
   * warms; an unfinished one stops short and stays cold — the stroke that never
   * arrives is the whole message.
   */
  carve(scene: Phaser.Scene, onDone?: () => void, duration?: number): void {
    const target = this.end;
    const state = { t: 0 };
    const starts: number[] = [];
    let run = 0;
    for (const p of this.all) {
      starts.push(run / this.total);
      run += pathLength(p);
    }
    let struck = 0;
    const strike = (t: number) => {
      while (struck < starts.length && t >= starts[struck]) {
        if (!this.opts.silent) audio.carve();
        struck++;
      }
    };
    this.carving = scene.tweens.add({
      targets: state,
      t: target,
      duration: duration ?? (this.opts.complete ? 1250 : 900),
      ease: this.opts.complete ? 'Cubic.easeInOut' : 'Cubic.easeOut',
      onUpdate: () => {
        strike(state.t);
        this.render(state.t);
      },
      onComplete: () => {
        this.carving = null;
        if (this.opts.complete) {
          // A slow warm bloom on the finished mark, once.
          scene.tweens.add({
            targets: this.glow,
            alpha: { from: 0, to: 0.85 },
            duration: 700,
            yoyo: true,
            hold: 500,
            ease: 'Sine.easeInOut',
          });
        } else {
          // A failed stroke twitches once, like a chisel slipping.
          scene.tweens.add({
            targets: this.g,
            x: this.g.x + 3,
            duration: 55,
            yoyo: true,
            repeat: 1,
          });
        }
        onDone?.();
      },
    });
  }

  /** Draws the first `t` of the mark's total stroke length. */
  private render(t: number): void {
    const { size, complete } = this.opts;
    const colour = this.opts.colour ?? (complete ? Palette.rye : 0x7c8489);
    const width = this.opts.width ?? (complete ? 7 : 6);
    const alpha = this.opts.alpha ?? (complete ? 0.95 : 0.7);

    this.g.clear();
    this.glow.clear();
    this.g.lineStyle(width, colour, alpha);
    this.glow.lineStyle(width + Math.max(4, width * 1.7), Palette.ryeBright, 0.1);
    this.glow.setAlpha(0);

    walkSign(this.opts.key, t, (ax, ay, bx, by) => {
      this.g.lineBetween(ax * size, ay * size, bx * size, by * size);
      if (complete) this.glow.lineBetween(ax * size, ay * size, bx * size, by * size);
    });
  }

  private get end(): number {
    return signEnd(this.opts.complete);
  }

  /**
   * Jumps straight to the finished carving — whole, or broken off — skipping
   * the animation and the bloom. For a player who has seen it before.
   */
  snap(): void {
    this.carving?.remove();
    this.carving = null;
    this.render(this.end);
  }

  /** A gentle standing glow, for a mark that has just arrived somewhere. */
  shine(scene: Phaser.Scene, to = 0.9, duration = 900): void {
    scene.tweens.add({ targets: this.glow, alpha: { from: 0, to }, duration, yoyo: true, hold: 700, ease: 'Sine.easeInOut' });
  }

  /** The drawn layers, for a caller that fades, moves or reparents the mark. */
  get parts(): Phaser.GameObjects.Graphics[] {
    return [this.g, this.glow];
  }

  destroy(): void {
    this.g.destroy();
    this.glow.destroy();
  }
}
