/**
 * Where a person can walk in the village painting, and how they get from one
 * place to another. Read off village.jpg in its own 1920x1080 coordinates —
 * if the painting is ever regenerated, these are the numbers to re-measure.
 *
 * The yard is one open patch of trodden earth between the cottages, so it is
 * modelled as an ellipse; the stone stands in the middle of it and is walked
 * round, never through. The two paths leave the yard at its ends.
 */

export interface Pt {
  x: number;
  y: number;
}

/** The trodden yard. */
const YARD = { cx: 960, cy: 628, rx: 760, ry: 96 } as const;

/** The stone and its grass ring: walked round. */
const STONE = { cx: 975, cy: 590, rx: 92, ry: 44 } as const;

/** The ends of the yard, where the field and bog paths begin, and where they leave the frame. */
export const PATHS = {
  field: { mouth: { x: 300, y: 560 }, away: [{ x: 210, y: 500 }, { x: 70, y: 420 }] },
  bog: { mouth: { x: 1640, y: 560 }, away: [{ x: 1730, y: 500 }, { x: 1880, y: 420 }] },
} as const;

/** Where the player is standing when the village first opens. */
export const START: Pt = { x: 860, y: 680 };

/** A person's drawn height at a depth: Anna, 104 px at y 582, is the measure. */
export const heightAt = (y: number): number => 104 + (y - 582) * 0.14;

const inEllipse = (p: Pt, e: { cx: number; cy: number; rx: number; ry: number }, grow = 0): boolean =>
  ((p.x - e.cx) / (e.rx + grow)) ** 2 + ((p.y - e.cy) / (e.ry + grow)) ** 2 <= 1;

/** The nearest point of the yard (outside the stone) to `p`. */
export function clampToYard(p: Pt): Pt {
  let q = { ...p };
  if (!inEllipse(q, YARD)) {
    const a = Math.atan2((q.y - YARD.cy) / YARD.ry, (q.x - YARD.cx) / YARD.rx);
    q = { x: YARD.cx + Math.cos(a) * YARD.rx * 0.98, y: YARD.cy + Math.sin(a) * YARD.ry * 0.98 };
  }
  if (inEllipse(q, STONE, 6)) {
    const a = Math.atan2((q.y - STONE.cy) / STONE.ry, (q.x - STONE.cx) / STONE.rx);
    q = { x: STONE.cx + Math.cos(a) * (STONE.rx + 10), y: STONE.cy + Math.sin(a) * (STONE.ry + 10) };
  }
  return q;
}

/** True if the straight line a→b passes over the stone. */
function crossesStone(a: Pt, b: Pt): boolean {
  for (let i = 1; i < 20; i++) {
    const t = i / 20;
    if (inEllipse({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, STONE, 4)) return true;
  }
  return false;
}

/**
 * The way from `a` to `b` across the yard: straight, or round the front of
 * the stone (the side towards the viewer, so the walker is never hidden).
 */
export function route(a: Pt, b: Pt): Pt[] {
  const end = clampToYard(b);
  if (!crossesStone(a, end)) return [end];
  const below = STONE.cy + STONE.ry + 22;
  const left = { x: STONE.cx - STONE.rx - 8, y: below - 6 };
  const right = { x: STONE.cx + STONE.rx + 8, y: below - 6 };
  return a.x < end.x ? [left, right, end].filter((p, i) => i === 2 || Math.abs(p.x - a.x) > 4) : [right, left, end];
}

/** Total length of a route from `a`. */
export const routeLength = (a: Pt, pts: Pt[]): number =>
  pts.reduce((sum, p, i) => sum + Math.hypot(p.x - (i ? pts[i - 1].x : a.x), p.y - (i ? pts[i - 1].y : a.y)), 0);
