import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Saves written by earlier builds have to keep working. These load the modules
 * fresh against a fake localStorage, so each case is a new page load.
 */

function fakeStorage(seed: Record<string, string>) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
    dump: () => Object.fromEntries(data),
  };
}

async function boot(seed: Record<string, string>) {
  vi.resetModules();
  const storage = fakeStorage(seed);
  vi.stubGlobal('localStorage', storage);
  const { state } = await import('./state');
  const { bag } = await import('./inventory');
  const { ledger } = await import('./ledger');
  const { holdings } = await import('./holdings');
  return { state, bag, ledger, holdings, storage };
}

describe('saves', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts a fresh install on year one', async () => {
    const { state } = await boot({});
    expect(state.get().year).toBe(1);
    expect(state.get().jumisPick).toBe('none');
  });

  it('carries a v2 save forward, reading the old two endings into the new four', async () => {
    const { state, storage } = await boot({
      'vecasvaras.save.v2': JSON.stringify({
        jumis: 'poor',
        velns: 'none',
        introSeen: true,
        outroSeen: false,
        metElder: true,
        jumisPaid: true,
        velnsPaid: false,
        scene: 'Village',
      }),
      'vecasvaras.bag.v1': JSON.stringify(['sickle', 'bread']),
    });
    const s = state.get();
    expect(s.jumisPick).toBe('all');
    expect(s.sheaves).toBe(10);
    expect(s.jumisPaid).toBe(true);
    expect(storage.getItem('vecasvaras.save.v2')).toBeNull();
    expect(storage.getItem('vecasvaras.save.v3')).not.toBeNull();
  });

  it('carries a v1 save forward, with Anna’s errands inferred', async () => {
    const { state } = await boot({
      'vecasvaras.save.v1': JSON.stringify({ jumis: 'good', velns: 'good', introSeen: true }),
    });
    const s = state.get();
    expect(s.metElder).toBe(true);
    expect(s.jumisPaid).toBe(true);
    expect(s.velnsPaid).toBe(true);
    expect(s.jumisPick).toBe('leave');
  });

  it('ignores values no scene knows how to draw', async () => {
    const { state } = await boot({
      'vecasvaras.save.v3': JSON.stringify({ jumis: 'golden', jumisPick: 'eat', sheaves: -4, scene: 'Moon' }),
    });
    const s = state.get();
    expect(s.jumis).toBe('none');
    expect(s.jumisPick).toBe('none');
    expect(s.sheaves).toBe(0);
    expect(s.scene).toBe('Village');
  });

  it('puts the loaf back for a player caught between Anna and the bog', async () => {
    const { bag } = await boot({
      'vecasvaras.save.v3': JSON.stringify({ jumis: 'good', jumisPick: 'leave', jumisPaid: true, velns: 'none' }),
      'vecasvaras.bag.v1': JSON.stringify(['sickle']),
    });
    expect(bag.has('bread')).toBe(true);
  });

  it('remembers what the village has shown across a reload, and forgets it with the year', async () => {
    const shown = { jumis: 'good' as const, jumisPick: 'leave' as const, jumisPaid: true, sheaves: 8, velns: 'none' as const };
    const first = await boot({});
    first.state.patch({ jumis: 'good', jumisPick: 'leave', sheaves: 8, jumisPaid: true });
    first.state.markShown(shown);
    const saved = first.storage.getItem('vecasvaras.save.v3')!;

    const again = await boot({ 'vecasvaras.save.v3': saved });
    expect(again.state.get().shown).toEqual(shown);
    again.state.nextYear();
    expect(again.state.get().shown).toBeNull();
  });

  it('reads a garbled record of what was shown as nothing shown yet', async () => {
    const { state } = await boot({
      'vecasvaras.save.v3': JSON.stringify({ jumis: 'good', shown: 'yes' }),
    });
    expect(state.get().shown).toBeNull();
  });

  it('counts bread only once Anna has threshed the cart', async () => {
    const { state, holdings } = await boot({});
    state.patch({ jumis: 'good', jumisPick: 'leave', sheaves: 7 });
    expect(holdings().bread).toBe(0);
    state.set('jumisPaid', true);
    expect(holdings().bread).toBe(3);
    expect(holdings().roads).toEqual(['sound', 'none']);
    state.set('velns', 'poor');
    expect(holdings().roads).toEqual(['sound', 'frail']);
  });
});

describe('years', () => {
  it('numbers the next year after the ones the stone remembers, and keeps them through a restart', async () => {
    const { state, ledger } = await boot({});
    ledger.record({
      year: 1,
      jumisPick: 'leave',
      jumis: 'good',
      velns: 'good',
      velnsPick: 'bread',
      catLost: false,
      devilGone: false,
      crumb: true,
      bread: 3,
    });
    state.nextYear();
    expect(state.get().year).toBe(2);
    state.reset();
    expect(state.get().year).toBe(2);
    expect(ledger.count).toBe(1);
  });

  it('writes each year once', async () => {
    const { ledger } = await boot({});
    const entry = {
      year: 3,
      jumisPick: 'all' as const,
      jumis: 'poor' as const,
      velns: 'poor' as const,
      velnsPick: 'dawn' as const,
      catLost: false,
      devilGone: false,
      crumb: false,
      bread: 1,
    };
    ledger.record(entry);
    ledger.record({ ...entry, jumisPick: 'leave' });
    expect(ledger.count).toBe(1);
    expect(ledger.last?.jumisPick).toBe('all');
  });

  it('survives a reload', async () => {
    const first = await boot({});
    first.ledger.record({
      year: 1,
      jumisPick: 'take',
      jumis: 'good',
      velns: 'good',
      velnsPick: 'bread',
      catLost: false,
      devilGone: true,
      crumb: false,
      bread: 2,
    });
    const saved = first.storage.dump();
    const second = await boot(saved);
    expect(second.ledger.count).toBe(1);
    expect(second.ledger.last?.devilGone).toBe(true);
    expect(second.state.get().year).toBe(2);
  });
});
