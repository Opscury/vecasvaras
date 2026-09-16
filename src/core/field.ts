/**
 * How much of the rye field is down, measured the way the player sees it.
 *
 * The picture comes from a soft mask painted into a render texture, and
 * reading that back every stroke is not something a phone should be asked to
 * do. So the same strokes are stamped into this grid as well, with the same
 * brush shape and the same way two soft edges add up, and the grid is what
 * gets counted.
 *
 * Only the crop counts. `field.jpg` and `field_cut.jpg` were compared column
 * by column, and they differ from just under the horizon down to a line that
 * runs from about y 880 on the left to 1000 on the right; the verge below it
 * is the same painting either way. Counting the verge meant a player who cut
 * every stalk they could see was told a fifth of the field still stood.
 *
 * Pure: no Phaser, so it is tested in milliseconds.
 */

export const COV = { cols: 48, rows: 27, size: 40 } as const;

/** Top of the crop, just under the treeline. */
export const CROP_TOP = 380;

/** Bottom of the crop at a given x, read off the two paintings. */
const BOTTOM: ReadonlyArray<readonly [number, number]> = [
  [0, 890],
  [480, 920],
  [640, 880],
  [800, 840],
  [960, 845],
  [1120, 1000],
  [1440, 980],
  [1600, 1020],
  [1920, 1000],
];

export function cropBottom(x: number): number {
  for (let i = 1; i < BOTTOM.length; i++) {
    const [x1, y1] = BOTTOM[i];
    if (x <= x1) {
      const [x0, y0] = BOTTOM[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return BOTTOM[BOTTOM.length - 1][1];
}

/** An ellipse in canvas pixels. */
export interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export const inEllipse = (e: Ellipse, x: number, y: number): boolean => {
  const dx = (x - e.x) / e.rx;
  const dy = (y - e.y) / e.ry;
  return dx * dx + dy * dy <= 1;
};

/**
 * Alpha of the swath brush at a normalised radius — the same falloff as
 * `makeSwathBrush`: solid to 0.62, 0.55 at 0.82, gone at 1.
 */
export function brushAlpha(r: number): number {
  if (r <= 0.62) return 1;
  if (r <= 0.82) return 1 - ((r - 0.62) / 0.2) * 0.45;
  if (r < 1) return 0.55 * (1 - (r - 0.82) / 0.18);
  return 0;
}

/** A cell reads as cut once the mask over it is this opaque. */
export const CUT_ALPHA = 0.6;

export class FieldCover {
  /** Accumulated mask alpha per cell, row by row. */
  readonly alpha: Float32Array;
  /** Cells that are part of the crop and not the protected patch. */
  readonly work: Uint8Array;
  private workCount = 0;
  private cutCount = 0;

  constructor(exclude: Ellipse[] = []) {
    const n = COV.cols * COV.rows;
    this.alpha = new Float32Array(n);
    this.work = new Uint8Array(n);
    for (let row = 0; row < COV.rows; row++) {
      for (let col = 0; col < COV.cols; col++) {
        const cx = col * COV.size + COV.size / 2;
        const cy = row * COV.size + COV.size / 2;
        const crop = cy >= CROP_TOP && cy <= cropBottom(cx);
        const excluded = exclude.some((e) => inEllipse(e, cx, cy));
        if (crop && !excluded) {
          this.work[row * COV.cols + col] = 1;
          this.workCount++;
        }
      }
    }
  }

  get total(): number {
    return this.workCount;
  }

  /** Fraction of the crop that is down, 0..1. */
  get cut(): number {
    return this.workCount ? this.cutCount / this.workCount : 0;
  }

  /** Fraction still standing. */
  get left(): number {
    return 1 - this.cut;
  }

  /**
   * One brush stamp, `w` by `h`, centred on (x, y). Returns how many cells of
   * the crop it newly brought down.
   */
  stamp(x: number, y: number, w: number, h: number): number {
    const rx = w / 2;
    const ry = h / 2;
    const c0 = Math.max(0, Math.floor((x - rx) / COV.size));
    const c1 = Math.min(COV.cols - 1, Math.floor((x + rx) / COV.size));
    const r0 = Math.max(0, Math.floor((y - ry) / COV.size));
    const r1 = Math.min(COV.rows - 1, Math.floor((y + ry) / COV.size));
    let fresh = 0;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const i = row * COV.cols + col;
        const cx = col * COV.size + COV.size / 2;
        const cy = row * COV.size + COV.size / 2;
        const dx = (cx - x) / rx;
        const dy = (cy - y) / ry;
        const a = brushAlpha(Math.sqrt(dx * dx + dy * dy));
        if (a <= 0) continue;
        const was = this.alpha[i];
        // "Normal" blending: two soft edges add up the way the mask does.
        const now = was + a * (1 - was);
        this.alpha[i] = now;
        if (this.work[i] && was < CUT_ALPHA && now >= CUT_ALPHA) {
          this.cutCount++;
          fresh++;
        }
      }
    }
    return fresh;
  }

  /** Everything down, for a field felled in one go. */
  fellAll(): void {
    this.alpha.fill(1);
    this.cutCount = this.workCount;
  }

  isCut(col: number, row: number): boolean {
    return this.alpha[row * COV.cols + col] >= CUT_ALPHA;
  }

  /** The first piece of crop still standing, scanning in rows — for the keyboard. */
  nextStanding(): { x: number; y: number } | null {
    for (let row = 0; row < COV.rows; row++) {
      for (let col = 0; col < COV.cols; col++) {
        const i = row * COV.cols + col;
        if (this.work[i] && this.alpha[i] < CUT_ALPHA) {
          return { x: col * COV.size + COV.size / 2, y: row * COV.size + COV.size / 2 };
        }
      }
    }
    return null;
  }

  /** The crop as left: one bit per work cell, base64. */
  encode(): string {
    const bits: number[] = [];
    for (let i = 0; i < this.work.length; i++) {
      if (this.work[i]) bits.push(this.alpha[i] >= CUT_ALPHA ? 1 : 0);
    }
    return packBits(bits);
  }

  /** Restores a field from `encode`. Unknown or short input leaves it standing. */
  decode(s: string): void {
    const bits = unpackBits(s, this.workCount);
    let k = 0;
    this.cutCount = 0;
    for (let i = 0; i < this.work.length; i++) {
      if (!this.work[i]) continue;
      const cut = bits[k++] === 1;
      this.alpha[i] = cut ? 1 : 0;
      if (cut) this.cutCount++;
    }
  }
}

function packBits(bits: number[]): string {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((b, i) => {
    if (b) bytes[i >> 3] |= 1 << (i & 7);
  });
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function unpackBits(s: string, n: number): number[] {
  const out = new Array<number>(n).fill(0);
  if (!s) return out;
  let bin = '';
  try {
    bin = atob(s);
  } catch {
    return out;
  }
  for (let i = 0; i < n; i++) {
    const byte = bin.charCodeAt(i >> 3);
    if (Number.isNaN(byte)) break;
    out[i] = (byte >> (i & 7)) & 1;
  }
  return out;
}
