import { describe, expect, it } from 'vitest';
import { COV, CROP_TOP, FieldCover, brushAlpha, cropBottom } from './field';

const TUFT = { x: 1596, y: 585, rx: 100, ry: 85 };

/** A sweep the way a thumb does it: stamps every 48px along a line. */
function sweep(f: FieldCover, y: number, from = 0, to = 1920) {
  for (let x = from; x <= to; x += 48) f.stamp(x, y, 330, 210);
}

describe('the field measure', () => {
  it('only counts the crop, not the sky or the verge', () => {
    const f = new FieldCover();
    sweep(f, 150);
    expect(f.cut).toBe(0);
    // The left verge is the same painting either way.
    for (let x = 0; x < 600; x += 40) f.stamp(x, 1040, 330, 210);
    expect(f.cut).toBe(0);
  });

  it('follows the bottom of the crop from the left to the right', () => {
    expect(cropBottom(0)).toBe(890);
    expect(cropBottom(1920)).toBe(1000);
    expect(cropBottom(880)).toBeGreaterThan(830);
    expect(cropBottom(880)).toBeLessThan(850);
    expect(CROP_TOP).toBeLessThan(cropBottom(0));
  });

  it('matches the brush: solid in the middle, gone at the rim', () => {
    expect(brushAlpha(0)).toBe(1);
    expect(brushAlpha(0.62)).toBe(1);
    expect(brushAlpha(0.82)).toBeCloseTo(0.55, 5);
    expect(brushAlpha(1)).toBe(0);
  });

  it('lets two soft edges add up to a cut, as the mask does', () => {
    const f = new FieldCover();
    // A stamp whose rim just reaches a cell leaves it standing...
    f.stamp(600, 500 + 88, 330, 210);
    const cellX = Math.floor(600 / COV.size);
    const cellY = Math.floor(500 / COV.size);
    expect(f.isCut(cellX, cellY)).toBe(false);
    // ...and a second from the other side brings it down.
    f.stamp(600, 500 - 88, 330, 210);
    expect(f.isCut(cellX, cellY)).toBe(true);
  });

  it('can be cut to nothing but the patch around the ear', () => {
    const f = new FieldCover([TUFT]);
    for (let y = 380; y <= 1020; y += 70) sweep(f, y);
    expect(f.cut).toBeGreaterThan(0.99);
  });

  it('reads a field swept four times as mostly down', () => {
    const f = new FieldCover([TUFT]);
    for (const y of [430, 560, 700, 840]) sweep(f, y);
    expect(f.cut).toBeGreaterThan(0.8);
  });

  it('reads half a field as half', () => {
    const f = new FieldCover([TUFT]);
    for (let y = 380; y <= 1020; y += 70) sweep(f, y, 0, 900);
    expect(f.cut).toBeGreaterThan(0.35);
    expect(f.cut).toBeLessThan(0.65);
  });

  it('points the keyboard at the next thing still standing', () => {
    const f = new FieldCover([TUFT]);
    const first = f.nextStanding();
    expect(first).not.toBeNull();
    expect(first!.y).toBeGreaterThanOrEqual(CROP_TOP);
    // Cutting wherever it points always makes progress, and gets there.
    let guard = 0;
    for (let p = f.nextStanding(); p && guard < 400; p = f.nextStanding(), guard++) {
      f.stamp(p.x, p.y, 330, 210);
    }
    expect(f.nextStanding()).toBeNull();
    expect(guard).toBeLessThan(400);
  });

  it('remembers a field exactly as it was left', () => {
    const a = new FieldCover([TUFT]);
    for (const y of [430, 700]) sweep(a, y, 0, 1300);
    const saved = a.encode();
    const b = new FieldCover([TUFT]);
    b.decode(saved);
    expect(b.cut).toBeCloseTo(a.cut, 10);
    for (let row = 0; row < COV.rows; row++) {
      for (let col = 0; col < COV.cols; col++) {
        const i = row * COV.cols + col;
        if (a.work[i]) expect(b.isCut(col, row)).toBe(a.isCut(col, row));
      }
    }
  });

  it('treats a missing or broken save as a standing field', () => {
    const f = new FieldCover([TUFT]);
    f.decode('');
    expect(f.cut).toBe(0);
    f.decode('%%% not base64 %%%');
    expect(f.cut).toBe(0);
  });
});
