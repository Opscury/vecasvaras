import { describe, expect, it } from 'vitest';
import { clampToYard, heightAt, route, START } from './villageGround';

describe('the village yard', () => {
  it('keeps a target inside the yard', () => {
    const q = clampToYard({ x: 960, y: 200 });
    expect(q.y).toBeGreaterThan(520);
  });
  it('never ends a walk on the stone', () => {
    const q = clampToYard({ x: 975, y: 590 });
    expect(Math.hypot(q.x - 975, (q.y - 590) * 2)).toBeGreaterThan(90);
  });
  it('walks round the stone rather than through it', () => {
    const pts = route({ x: 700, y: 590 }, { x: 1250, y: 590 });
    expect(pts.length).toBeGreaterThan(1);
    expect(pts.every((p) => p.y >= 590 || Math.abs(p.x - 975) > 90)).toBe(true);
  });
  it('goes straight when nothing is in the way', () => {
    expect(route(START, { x: 1000, y: 690 })).toHaveLength(1);
  });
  it('draws people smaller further back', () => {
    expect(heightAt(500)).toBeLessThan(heightAt(700));
  });
});
