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
  const { holdings } = await import('./holdings');
  const { atlas } = await import('./atlas');
  const { lore } = await import('./lore');
  return { state, bag, holdings, atlas, lore, storage };
}

describe('saves', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts a fresh install with nothing decided', async () => {
    const { state } = await boot({});
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
    expect(storage.getItem('vecasvaras.save.v4')).not.toBeNull();
  });

  it('carries a v3 save forward with the chapter, the jug and the loaf read off it', async () => {
    const { state, storage } = await boot({
      'vecasvaras.save.v3': JSON.stringify({
        gender: 'f',
        name: 'Marta',
        heroChosen: true,
        jumis: 'good',
        jumisPick: 'leave',
        sheaves: 7,
        jumisPaid: true,
        velns: 'poor',
        velnsPick: 'self',
        metElder: true,
        introSeen: true,
        scene: 'Village',
      }),
    });
    const s = state.get();
    // The slice is chapter one, and it is not over until the outro says so.
    expect(s.chapter).toBe(1);
    expect(s.chapterDone).toEqual([]);
    // Whatever he settled for, he went away owed a jug.
    expect(s.jugOwed).toBe(true);
    // Anna threshed the cart, so the loaf is on the shelf, and a tithed field bakes a good one.
    expect(s.loaves).toEqual([{ chapter: 1, good: true }]);
    // Nothing was ever typed into the name form's new field.
    expect(s.nameV).toBe('');
    // The run itself is untouched.
    expect(s).toMatchObject({ gender: 'f', name: 'Marta', jumisPick: 'leave', sheaves: 7, velnsPick: 'self' });
    expect(storage.getItem('vecasvaras.save.v3')).toBeNull();
    expect(storage.getItem('vecasvaras.save.v4')).not.toBeNull();
  });

  it('owes no jug and bakes no loaf for a v3 save that got nowhere', async () => {
    const { state } = await boot({
      'vecasvaras.save.v3': JSON.stringify({ heroChosen: true, metElder: true, jumis: 'none', velns: 'none' }),
    });
    expect(state.get()).toMatchObject({ chapter: 1, jugOwed: false, loaves: [], chapterDone: [] });
  });

  it('marks a finished v3 run as a chapter played out', async () => {
    const { state } = await boot({
      'vecasvaras.save.v3': JSON.stringify({
        jumis: 'poor',
        jumisPick: 'all',
        jumisPaid: true,
        velns: 'poor',
        velnsPaid: true,
        outroSeen: true,
      }),
    });
    expect(state.get().chapterDone).toEqual([1]);
    // A stripped field bakes a flat loaf, and the shelf says so.
    expect(state.get().loaves).toEqual([{ chapter: 1, good: false }]);
  });

  it('resumes a v4 run where the player left it', async () => {
    const first = await boot({});
    first.state.patch({ heroChosen: true, name: 'Oskars', metElder: true, jumisPaid: true, scene: 'Velns' });
    first.state.recordLoaf(1, true);
    const saved = first.storage.getItem('vecasvaras.save.v4')!;

    const again = await boot({ 'vecasvaras.save.v4': saved });
    expect(again.state.get()).toMatchObject({ scene: 'Velns', name: 'Oskars', jumisPaid: true });
    expect(again.state.get().loaves).toEqual([{ chapter: 1, good: true }]);
  });

  it('keeps one loaf per chapter, however often a chapter is played', async () => {
    const { state } = await boot({});
    state.recordLoaf(1, false);
    state.recordLoaf(1, true);
    expect(state.get().loaves).toEqual([{ chapter: 1, good: true }]);
    state.finishChapter(1);
    state.finishChapter(1);
    expect(state.get().chapterDone).toEqual([1]);
  });

  it('throws the shelf and the debt away with the rest of the run', async () => {
    const { state } = await boot({});
    state.patch({ jugOwed: true, nameV: 'Oskar' });
    state.recordLoaf(1, true);
    state.finishChapter(1);
    state.reset();
    expect(state.get()).toMatchObject({ jugOwed: false, nameV: '', loaves: [], chapterDone: [], chapter: 1 });
  });

  it('reads a hand-edited shelf as the loaves it can make sense of', async () => {
    const { state } = await boot({
      'vecasvaras.save.v4': JSON.stringify({
        chapter: 0,
        chapterDone: [2, 'x', 1, 1],
        loaves: [{ chapter: 2, good: true }, 'bread', { chapter: 1, good: 'yes' }, { chapter: 2, good: false }],
      }),
    });
    const s = state.get();
    // A chapter below the first is not a chapter.
    expect(s.chapter).toBe(1);
    expect(s.chapterDone).toEqual([1, 2]);
    // Sorted, deduplicated, and anything but `true` is a flat loaf.
    expect(s.loaves).toEqual([
      { chapter: 1, good: false },
      { chapter: 2, good: false },
    ]);
  });

  it('calls the player by the form they corrected, when they corrected one', async () => {
    const { state } = await boot({});
    const { personalise } = await import('./i18n');
    state.patch({ gender: 'm', name: 'Oskars', heroChosen: true });
    expect(personalise('{nameV}')).toBe('Oskar');
    state.set('nameV', 'Oskariņ');
    expect(personalise('{nameV}')).toBe('Oskariņ');
    // An override of nothing but spaces is no override.
    state.set('nameV', '   ');
    expect(personalise('{nameV}')).toBe('Oskar');
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
      'vecasvaras.save.v4': JSON.stringify({ jumis: 'golden', jumisPick: 'eat', sheaves: -4, scene: 'Moon' }),
    });
    const s = state.get();
    expect(s.jumis).toBe('none');
    expect(s.jumisPick).toBe('none');
    expect(s.sheaves).toBe(0);
    expect(s.scene).toBe('Village');
  });

  it('puts the loaf back for a player caught between Anna and the bog', async () => {
    const { bag } = await boot({
      'vecasvaras.save.v4': JSON.stringify({ jumis: 'good', jumisPick: 'leave', jumisPaid: true, velns: 'none' }),
      'vecasvaras.bag.v1': JSON.stringify(['sickle']),
    });
    expect(bag.has('bread')).toBe(true);
  });

  it('remembers what the village has shown across a reload, and forgets it on a restart', async () => {
    const shown = { jumis: 'good' as const, jumisPick: 'leave' as const, jumisPaid: true, sheaves: 8, velns: 'none' as const };
    const first = await boot({});
    first.state.patch({ jumis: 'good', jumisPick: 'leave', sheaves: 8, jumisPaid: true });
    first.state.markShown(shown);
    const saved = first.storage.getItem('vecasvaras.save.v4')!;

    const again = await boot({ 'vecasvaras.save.v4': saved });
    expect(again.state.get().shown).toEqual(shown);
    again.state.reset();
    expect(again.state.get().shown).toBeNull();
  });

  it('reads a garbled record of what was shown as nothing shown yet', async () => {
    const { state } = await boot({
      'vecasvaras.save.v4': JSON.stringify({ jumis: 'good', shown: 'yes' }),
    });
    expect(state.get().shown).toBeNull();
  });

  it('counts bread only once Anna has threshed the cart', async () => {
    const { state, holdings } = await boot({});
    state.patch({ jumis: 'good', jumisPick: 'leave', sheaves: 7 });
    expect(holdings().bread).toBe(0);
    state.set('jumisPaid', true);
    expect(holdings().bread).toBe(3);
  });

  it('opens the map one way at a time, as the run earns them', async () => {
    const { state, atlas } = await boot({});
    const way = (a: string, b: string) => atlas().ways.find((w) => w.from === a && w.to === b)!;
    // The cart track to the field was there before the player was.
    expect(atlas().open).toBe(1);
    expect(way('village', 'field').open).toBe(true);
    // Beyond the bog is on the map from the start, with the bridge missing.
    expect(way('village', 'beyond').breakAt).toBeDefined();

    state.set('jumisPaid', true);
    expect(way('village', 'bog').open).toBe(true);

    state.set('velns', 'good');
    expect(way('village', 'beyond')).toMatchObject({ open: true, kind: 'cart', breakAt: undefined });
    expect(atlas().open).toBe(3);
  });

  it('shows the bag card again after a new game', async () => {
    const { state } = await boot({ 'vecasvaras.seen.v1': JSON.stringify(['bagIntro', 'daina:jumis']) });
    const { once } = await import('./once');
    expect(once.has('bagIntro')).toBe(true);
    state.reset();
    expect(once.has('bagIntro')).toBe(false);
    // The verses stay seen: they are content, not instructions.
    expect(once.has('daina:jumis')).toBe(true);
  });

  it('stamps each place on the map once its encounter is met', async () => {
    const { state, atlas } = await boot({});
    const place = (id: string) => atlas().places.find((p) => p.id === id)!;
    expect(place('field').done).toBe(false);
    state.patch({ jumis: 'poor', jumisPaid: true });
    expect(place('field')).toMatchObject({ done: true, whole: false });
    state.set('velns', 'good');
    expect(place('bog')).toMatchObject({ done: true, whole: true });
    expect(atlas().ways.find((w) => w.to === 'beyond')!.bridge).toMatchObject({ sound: true });
  });

  it('starts a new game with an empty beliefs page', async () => {
    const { state, lore } = await boot({});
    lore.unlock('maize');
    expect(lore.count).toBe(1);
    state.reset();
    expect(lore.count).toBe(0);
  });

  it('asks a fresh run who the player is, and keeps the answer', async () => {
    const { state } = await boot({});
    expect(state.get()).toMatchObject({ heroChosen: false, gender: 'm', name: '', bond: 0, talks: [] });
    state.patch({ gender: 'f', name: 'Līze', heroChosen: true });
    const again = await boot({ 'vecasvaras.save.v4': localStorage.getItem('vecasvaras.save.v4')! });
    expect(again.state.get()).toMatchObject({ gender: 'f', name: 'Līze', heroChosen: true });
  });

  it('treats a run saved before the choice existed as already begun', async () => {
    const { state } = await boot({
      'vecasvaras.save.v3': JSON.stringify({ introSeen: true, metElder: true, jumis: 'none', velns: 'none', scene: 'Village' }),
    });
    expect(state.get()).toMatchObject({ heroChosen: true, gender: 'm', bond: 0 });
  });

  it('keeps the bond inside its five knots, whatever a save says', async () => {
    const { state } = await boot({ 'vecasvaras.save.v4': JSON.stringify({ bond: 99, talks: ['meet', 3] }) });
    expect(state.get().bond).toBe(5);
    expect(state.get().talks).toEqual(['meet']);
  });

  it('speaks to the player in their own grammar', async () => {
    const { state } = await boot({});
    const { t, L } = await import('./i18n');
    const line = L('Tu esi {gājis|gājusi}, {nameV}.', 'You went, {name}.');
    state.patch({ gender: 'f', name: 'Grieta', heroChosen: true });
    expect(t(line)).toMatch(/gājusi, Grieta|You went, Grieta/);
    state.patch({ gender: 'm', name: 'Jānis' });
    expect(t(line)).toMatch(/gājis, Jāni|You went, Jānis/);
  });
});
