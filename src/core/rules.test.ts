import { describe, it, expect } from 'vitest';
import {
  jumisOutcome,
  velnsOutcome,
  velnsMisses,
  ending,
  type JumisPick,
  type VelnsPick,
} from './rules';

describe('Jumis', () => {
  it('rewards the tithe', () => {
    expect(jumisOutcome('leave')).toBe('good');
  });
  it('diminishes both forms of taking', () => {
    expect(jumisOutcome('all')).toBe('poor');
    expect(jumisOutcome('take')).toBe('poor');
  });
});

describe('Velns', () => {
  it('always punishes crossing first yourself', () => {
    expect(velnsOutcome('self', true, 'good')).toBe('poor');
    expect(velnsOutcome('self', true, 'poor')).toBe('poor');
  });

  it('always rewards the cat, whatever happened in the field', () => {
    expect(velnsOutcome('cat', true, 'good')).toBe('good');
    expect(velnsOutcome('cat', true, 'poor')).toBe('good');
  });

  it('makes the bread argument depend on the harvest', () => {
    // The loaf is only worth something if the field was left its share.
    expect(velnsOutcome('bread', true, 'good')).toBe('good');
    expect(velnsOutcome('bread', true, 'poor')).toBe('poor');
  });

  it('lets a wrong riddle answer cost the good bridge', () => {
    expect(velnsOutcome('cat', false, 'good')).toBe('poor');
    expect(velnsOutcome('bread', false, 'good')).toBe('poor');
  });
});

describe('what the reckoning says was missed', () => {
  it('names nothing when the bridge came out whole', () => {
    expect(velnsMisses('cat', true, 'poor')).toEqual([]);
    expect(velnsMisses('bread', true, 'good')).toEqual([]);
  });

  it('names a single reason on its own', () => {
    expect(velnsMisses('cat', false, 'good')).toEqual(['riddle']);
    expect(velnsMisses('self', true, 'good')).toEqual(['self']);
    expect(velnsMisses('bread', true, 'poor')).toEqual(['bread']);
  });

  it('names both when the bridge was lost two ways at once', () => {
    // "Get the riddle right" alone would still have left these players with
    // two logs, so the card has to name the other half too.
    expect(velnsMisses('self', false, 'good')).toEqual(['riddle', 'self']);
    expect(velnsMisses('bread', false, 'poor')).toEqual(['riddle', 'bread']);
  });
});

describe('endings', () => {
  it('picks the closing text by how many were handled well', () => {
    expect(ending('good', 'good')).toBe('both');
    expect(ending('good', 'poor')).toBe('half');
    expect(ending('poor', 'good')).toBe('half');
    expect(ending('poor', 'poor')).toBe('neither');
  });
});

describe('the whole slice', () => {
  const JUMIS: JumisPick[] = ['leave', 'all', 'take'];
  const VELNS: VelnsPick[] = ['cat', 'bread', 'self'];

  // Every route a player can take, end to end, with the ending written out by
  // hand rather than recomputed — a branch table is only a check if it is not
  // the same code twice.
  const routes: Array<[JumisPick, boolean, VelnsPick, 'both' | 'half' | 'neither']> = [
    ['leave', true,  'cat',   'both'],
    ['leave', true,  'bread', 'both'],
    ['leave', true,  'self',  'half'],
    ['leave', false, 'cat',   'half'],
    ['leave', false, 'bread', 'half'],
    ['leave', false, 'self',  'half'],
    ['all',   true,  'cat',   'half'],
    ['all',   true,  'bread', 'neither'],
    ['all',   true,  'self',  'neither'],
    ['all',   false, 'cat',   'neither'],
    ['all',   false, 'bread', 'neither'],
    ['all',   false, 'self',  'neither'],
    ['take',  true,  'cat',   'half'],
    ['take',  true,  'bread', 'neither'],
    ['take',  true,  'self',  'neither'],
    ['take',  false, 'cat',   'neither'],
    ['take',  false, 'bread', 'neither'],
    ['take',  false, 'self',  'neither'],
  ];

  it('covers every combination exactly once', () => {
    const keys = new Set(routes.map(([jp, rr, vp]) => `${jp}/${rr}/${vp}`));
    expect(keys.size).toBe(routes.length);
    expect(routes.length).toBe(JUMIS.length * 2 * VELNS.length);
  });

  it.each(routes)('%s / riddle=%s / %s ends in "%s"', (jp, rr, vp, want) => {
    const j = jumisOutcome(jp);
    const v = velnsOutcome(vp, rr, j);
    expect(ending(j, v)).toBe(want);
  });

  it('never produces a dead end — every route resolves both encounters', () => {
    for (const [jp, rr, vp] of routes) {
      const j = jumisOutcome(jp);
      const v = velnsOutcome(vp, rr, j);
      expect(j).not.toBe('none');
      expect(v).not.toBe('none');
    }
  });
});
