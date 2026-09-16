import { describe, it, expect } from 'vitest';
import {
  BREAD_CAP,
  breadFrom,
  catLost,
  devilGone,
  ending,
  judgeField,
  jumisOutcome,
  loafFrom,
  perfectYear,
  sheavesFrom,
  shortfalls,
  velnsMisses,
  velnsOutcome,
  type JumisPick,
  type VelnsPick,
} from './rules';

describe('the field', () => {
  it('counts both the tithe and carrying Jumis home as good', () => {
    expect(jumisOutcome('leave')).toBe('good');
    expect(jumisOutcome('take')).toBe('good');
  });

  it('counts taking everything and leaving too much as poor', () => {
    expect(jumisOutcome('all')).toBe('poor');
    expect(jumisOutcome('spare')).toBe('poor');
  });

  it('calls a third of the field left standing too much', () => {
    expect(judgeField(0.05)).toBe('share');
    expect(judgeField(0.32)).toBe('share');
    expect(judgeField(1 / 3)).toBe('spare');
    expect(judgeField(0.5)).toBe('spare');
  });

  it('makes the greedy cart the biggest', () => {
    const tithe = sheavesFrom(0.95, false);
    const greed = sheavesFrom(1, true);
    expect(greed).toBeGreaterThan(tithe);
    expect(greed).toBe(10);
    expect(sheavesFrom(0.6, false)).toBe(5);
  });

  it('and the greedy cart the one worth least', () => {
    expect(breadFrom('all', 10)).toBe(1);
    expect(breadFrom('leave', 7)).toBe(3);
    expect(breadFrom('leave', 7)).toBeGreaterThan(breadFrom('all', 10));
  });

  it('keeps a loaf back for Jumis when he is carried home', () => {
    expect(breadFrom('take', 7)).toBe(breadFrom('leave', 7) - 1);
  });

  it('never gives more than the granary holds, and nothing before the harvest', () => {
    for (const p of ['leave', 'take', 'all', 'spare'] as const) {
      for (const s of [0, 3, 6, 8, 10]) expect(breadFrom(p, s)).toBeLessThanOrEqual(BREAD_CAP);
    }
    expect(breadFrom('none', 8)).toBe(0);
  });

  it('bakes the loaf from the kind of year it was', () => {
    expect(loafFrom('leave')).toBe('good');
    expect(loafFrom('spare')).toBe('good');
    expect(loafFrom('take')).toBe('jumis');
    expect(loafFrom('all')).toBe('thin');
    expect(loafFrom('none')).toBe('thin');
  });
});

describe('the bog', () => {
  it('always diminishes crossing first yourself', () => {
    expect(velnsOutcome('self', true, 'good')).toBe('poor');
    expect(velnsOutcome('self', true, 'jumis')).toBe('poor');
  });

  it('always rewards the cat, whatever the loaf — and the cat never comes home', () => {
    expect(velnsOutcome('cat', true, 'good')).toBe('good');
    expect(velnsOutcome('cat', true, 'thin')).toBe('good');
    expect(catLost('cat')).toBe(true);
    expect(catLost('bread')).toBe(false);
    expect(catLost('dawn')).toBe(false);
  });

  it('makes the bread argument depend on the harvest', () => {
    expect(velnsOutcome('bread', true, 'good')).toBe('good');
    expect(velnsOutcome('bread', true, 'thin')).toBe('poor');
    expect(velnsOutcome('bread', true, 'none')).toBe('poor');
  });

  it('lets two wrong riddles cost the good bridge', () => {
    expect(velnsOutcome('cat', false, 'good')).toBe('poor');
    expect(velnsOutcome('bread', false, 'good')).toBe('poor');
  });

  it('lets a loaf with Jumis in it win regardless of the riddles, and see him off', () => {
    expect(velnsOutcome('bread', false, 'jumis')).toBe('good');
    expect(devilGone('bread', 'jumis')).toBe(true);
    expect(devilGone('bread', 'good')).toBe(false);
    expect(devilGone('cat', 'jumis')).toBe(false);
  });

  it('lets an unpaid bridge sink at dawn, and keeps everything in the bag', () => {
    expect(velnsOutcome('dawn', true, 'jumis')).toBe('poor');
    expect(catLost('dawn')).toBe(false);
  });
});

describe('what the reckoning says was missed', () => {
  it('names nothing when the bridge came out whole', () => {
    expect(velnsMisses('cat', true, 'thin')).toEqual([]);
    expect(velnsMisses('bread', true, 'good')).toEqual([]);
    expect(velnsMisses('bread', false, 'jumis')).toEqual([]);
  });

  it('names a single reason on its own', () => {
    expect(velnsMisses('cat', false, 'good')).toEqual(['riddle']);
    expect(velnsMisses('self', true, 'good')).toEqual(['self']);
    expect(velnsMisses('bread', true, 'thin')).toEqual(['bread']);
    expect(velnsMisses('dawn', true, 'good')).toEqual(['dawn']);
  });

  it('names both when the bridge was lost two ways at once', () => {
    expect(velnsMisses('self', false, 'good')).toEqual(['riddle', 'self']);
    expect(velnsMisses('bread', false, 'thin')).toEqual(['riddle', 'bread']);
    expect(velnsMisses('dawn', false, 'good')).toEqual(['riddle', 'dawn']);
  });
});

describe('endings', () => {
  it('picks the closing text by how many were handled well', () => {
    expect(ending('good', 'good')).toBe('both');
    expect(ending('good', 'poor')).toBe('half');
    expect(ending('poor', 'good')).toBe('half');
    expect(ending('poor', 'poor')).toBe('neither');
  });

  it('only calls a year perfect when nothing was given up', () => {
    expect(perfectYear({ jumisPick: 'leave', velns: 'good', catLost: false, bread: 3 })).toBe(true);
    // Both shares whole, but the cat paid for the bridge.
    expect(shortfalls({ jumisPick: 'leave', velns: 'good', catLost: true, bread: 3 })).toEqual(['cat']);
    // Both shares whole, but Jumis eats from the granary.
    expect(shortfalls({ jumisPick: 'take', velns: 'good', catLost: false, bread: 2 })).toEqual(['bread']);
    // The granary is not worth mentioning while a share is still broken.
    expect(shortfalls({ jumisPick: 'all', velns: 'poor', catLost: false, bread: 1 })).toEqual([
      'field',
      'crossing',
    ]);
  });
});

describe('the whole year', () => {
  const PICKS: JumisPick[] = ['leave', 'take', 'all', 'spare'];
  const BARGAINS: VelnsPick[] = ['cat', 'bread', 'self', 'dawn'];

  // Every route a player can take, end to end, with the ending written out by
  // hand rather than recomputed — a branch table is only a check if it is not
  // the same code twice.
  const routes: Array<[JumisPick, boolean, VelnsPick, 'both' | 'half' | 'neither']> = [
    ['leave', true, 'cat', 'both'],
    ['leave', true, 'bread', 'both'],
    ['leave', true, 'self', 'half'],
    ['leave', true, 'dawn', 'half'],
    ['leave', false, 'cat', 'half'],
    ['leave', false, 'bread', 'half'],
    ['leave', false, 'self', 'half'],
    ['leave', false, 'dawn', 'half'],
    ['take', true, 'cat', 'both'],
    ['take', true, 'bread', 'both'],
    ['take', true, 'self', 'half'],
    ['take', true, 'dawn', 'half'],
    ['take', false, 'cat', 'half'],
    ['take', false, 'bread', 'both'],
    ['take', false, 'self', 'half'],
    ['take', false, 'dawn', 'half'],
    ['all', true, 'cat', 'half'],
    ['all', true, 'bread', 'neither'],
    ['all', true, 'self', 'neither'],
    ['all', true, 'dawn', 'neither'],
    ['all', false, 'cat', 'neither'],
    ['all', false, 'bread', 'neither'],
    ['all', false, 'self', 'neither'],
    ['all', false, 'dawn', 'neither'],
    ['spare', true, 'cat', 'half'],
    ['spare', true, 'bread', 'half'],
    ['spare', true, 'self', 'neither'],
    ['spare', true, 'dawn', 'neither'],
    ['spare', false, 'cat', 'neither'],
    ['spare', false, 'bread', 'neither'],
    ['spare', false, 'self', 'neither'],
    ['spare', false, 'dawn', 'neither'],
  ];

  it('covers every combination exactly once', () => {
    const keys = new Set(routes.map(([jp, rr, vp]) => `${jp}/${rr}/${vp}`));
    expect(keys.size).toBe(routes.length);
    expect(routes.length).toBe(PICKS.length * 2 * BARGAINS.length);
  });

  it.each(routes)('%s / riddle=%s / %s ends in "%s"', (jp, rr, vp, want) => {
    const j = jumisOutcome(jp);
    const v = velnsOutcome(vp, rr, loafFrom(jp));
    expect(ending(j, v)).toBe(want);
  });

  it('has exactly one kind of perfect year: tithe, and pay with the bread', () => {
    const perfect = routes.filter(([jp, rr, vp]) =>
      perfectYear({
        jumisPick: jp,
        velns: velnsOutcome(vp, rr, loafFrom(jp)),
        catLost: catLost(vp),
        bread: breadFrom(jp, jp === 'all' ? 10 : jp === 'spare' ? 5 : 7),
      }),
    );
    expect(perfect.map(([jp, rr, vp]) => `${jp}/${rr}/${vp}`)).toEqual(['leave/true/bread']);
  });
});
