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
 */

export type SignKey = 'jumis' | 'crossing';

type Path = Array<[number, number]>;

/** Paths in a normalised -1..1 box, drawn top-left origin at (-1,-1). */
function paths(key: SignKey): Path[] {
  if (key === 'jumis') {
    // A rhombus with every side extended past the vertex, so the ends cross in
    // little horns at top and bottom — the standard Jumis form.
    const o = 1.0; // vertex
    const e = 0.42; // overshoot
    return [
      // top-left edge, extended at both ends
      [
        [-o - e * 0.55, -e * 0.55],
        [0 + e * 0.55, -o - e * 0.55],
      ],
      // top-right edge
      [
        [o + e * 0.55, -e * 0.55],
        [0 - e * 0.55, -o - e * 0.55],
      ],
      // bottom-left edge
      [
        [-o - e * 0.55, e * 0.55],
        [0 + e * 0.55, o + e * 0.55],
      ],
      // bottom-right edge
      [
        [o + e * 0.55, e * 0.55],
        [0 - e * 0.55, o + e * 0.55],
      ],
    ];
  }

  // The crossing. Two things drove this shape:
  //
  //  - Stroke ORDER. An unfinished mark simply stops when it runs out of
  //    budget, so the water and the near bank go down first and the span is
  //    drawn left to right. A half-carved mark is then literally a bridge that
  //    stops in the middle of the river, which is exactly what the player got.
  //  - Family resemblance. The end ticks echo the crossed overshoots of the
  //    Jumis sign, so the two marks read as the same carver's hand. An earlier
  //    version had a full handrail and looked like a table.
  return [
    // the water it has to cross
    [
      [-1.0, 0.52],
      [-0.5, 0.3],
      [0.0, 0.52],
      [0.5, 0.3],
      [1.0, 0.52],
    ],
    // near bank
    [
      [-0.8, 0.18],
      [-0.8, -0.2],
    ],
    // the span, left to right — the stroke that runs out
    [
      [-1.06, -0.2],
      [1.06, -0.2],
    ],
    // far bank
    [
      [0.8, 0.18],
      [0.8, -0.2],
    ],
    // raised ends, cut last: the finish a half share never gets
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

function pathLength(p: Path): number {
  let d = 0;
  for (let i = 1; i < p.length; i++) {
    d += Phaser.Math.Distance.Between(p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]);
  }
  return d;
}

export interface SignOpts {
  x: number;
  y: number;
  size: number;
  key: SignKey;
  /** A whole mark, or one that stops partway. */
  complete: boolean;
  depth?: number;
}

export class SignMark {
  private g: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private opts: SignOpts;
  private all: Path[];
  private total: number;
  private carving: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, opts: SignOpts) {
    this.opts = opts;
    this.all = paths(opts.key);
    this.total = this.all.reduce((n, p) => n + pathLength(p), 0);

    this.glow = scene.add.graphics().setDepth((opts.depth ?? 820) - 1);
    this.g = scene.add.graphics().setDepth(opts.depth ?? 820);
    this.render(0);
  }

  /**
   * Animates the mark being cut. A whole share draws all the way and then
   * warms; an unfinished one stops short and stays cold — the stroke that never
   * arrives is the whole message.
   */
  carve(scene: Phaser.Scene, onDone?: () => void): void {
    const target = this.end;
    const state = { t: 0 };
    // Where each stroke of the mark begins, as a distance along the whole path.
    // The tween animates one continuous distance, so this is how we know a new
    // stroke has started and can scrape once for it rather than per frame.
    const starts: number[] = [];
    let run = 0;
    for (const p of this.all) {
      starts.push(run);
      run += pathLength(p);
    }
    let struck = 0;
    const strike = (t: number) => {
      while (struck < starts.length && t >= starts[struck]) {
        audio.carve();
        struck++;
      }
    };
    this.carving = scene.tweens.add({
      targets: state,
      t: target,
      duration: this.opts.complete ? 1250 : 900,
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
            x: '+=3',
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
    const { x, y, size, complete } = this.opts;
    const colour = complete ? Palette.rye : 0x7c8489;
    const width = complete ? 7 : 6;

    this.g.clear();
    this.glow.clear();
    this.g.lineStyle(width, colour, complete ? 0.95 : 0.7);
    this.glow.lineStyle(width + 12, Palette.ryeBright, 0.1);
    this.glow.setAlpha(0);

    let budget = this.total * t;

    for (const p of this.all) {
      for (let i = 1; i < p.length; i++) {
        if (budget <= 0) break;
        const [ax, ay] = p[i - 1];
        const [bx, by] = p[i];
        const seg = Phaser.Math.Distance.Between(ax, ay, bx, by);
        const f = Math.min(1, budget / seg);
        const ex = ax + (bx - ax) * f;
        const ey = ay + (by - ay) * f;

        const X = (v: number) => x + v * size;
        const Y = (v: number) => y + v * size;

        this.g.lineBetween(X(ax), Y(ay), X(ex), Y(ey));
        if (complete) this.glow.lineBetween(X(ax), Y(ay), X(ex), Y(ey));
        budget -= seg;
      }
    }
  }

  /** How much of the stroke a mark gets: all of it, or broken off past half. */
  private get end(): number {
    return this.opts.complete ? 1 : 0.56;
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

  /** The drawn layers, for a caller that fades the mark out with its card. */
  get parts(): Phaser.GameObjects.Graphics[] {
    return [this.g, this.glow];
  }

  destroy(): void {
    this.g.destroy();
    this.glow.destroy();
  }
}
