/**
 * Pass/fail: each moment that has broken before, set up directly through
 * `__vv` (the live run state) and checked with `__h.assert`. A failed check or
 * a page error fails the route with a non-zero exit, so this can gate a push.
 *
 *   npm run smoke
 */
const drain = () => __h.drain('Village', 40);

export default [
  // --- Anna, tapped again while the cart is threshed, does not start it over.
  () => {
    __vv.bag.clear();
    __vv.bag.add('sickle');
    __vv.state.patch({
      introSeen: true, metElder: true, jumis: 'good', jumisPick: 'leave', sheaves: 8,
      jumisPaid: false, velns: 'none', velnsPick: 'none', velnsPaid: false, catLost: false,
      shown: { jumis: 'good', jumisPick: 'leave', jumisPaid: false, sheaves: 8, velns: 'none' },
    });
    __h.start('Village');
  },
  { wait: 1500 },
  () => __h.spot('Village', 'anna').activate(),
  { wait: 600 },
  () => __h.next('Village'),
  { wait: 1800 },
  () => __h.next('Village'),
  { wait: 300 },
  () => __h.next('Village'),
  { wait: 300 },
  () => {
    const v = __h.scene('Village');
    __h.assert(v.threshing, 'the cart is being threshed');
    v.spots.find((s) => s.id === 'anna').activate();
  },
  { wait: 6000 },
  drain,
  { wait: 3000 },
  drain,
  () => {
    const carts = __h.scene('Village').narration.history.filter((l) => l.en.startsWith('You drive the cart')).length;
    __h.assert(carts === 1, 'the cart was counted once, not', carts);
    __h.assert(__h.state().jumisPaid, 'the harvest was paid for');
    __h.assert(__vv.bag.has('bread'), 'the loaf was handed over');
  },

  // --- Home from the bog, a reload mid-walk leaves the cat on its step.
  () => {
    __vv.bag.clear();
    ['sickle', 'cat'].forEach((i) => __vv.bag.add(i));
    __vv.state.patch({
      velns: 'good', velnsPick: 'bread', jumisPaid: true, velnsPaid: false, catLost: false,
      shown: { jumis: 'good', jumisPick: 'leave', jumisPaid: true, sheaves: 8, velns: 'none' },
    });
    __h.start('Village');
  },
  { wait: 800 },
  // What a reload does: the village is built again from the same saved run.
  () => __h.start('Village'),
  { wait: 1500 },
  () => {
    __h.assert(!__vv.bag.has('cat'), 'the cat is not left in the bag');
    __h.assert(!!__h.scene('Village').catSprite, 'the cat is on its doorstep');
  },

  // --- The night at the bog waits while the beliefs book is open.
  () => {
    __vv.bag.clear();
    ['sickle', 'bread'].forEach((i) => __vv.bag.add(i));
    __vv.state.patch({ velns: 'none', velnsPick: 'none', velnsPaid: false, jumisPaid: true, shown: null });
    __vv.lore.unlock('jumis');
    __h.start('Velns');
  },
  { wait: 1500 },
  () => __h.next('Velns'),
  { wait: 700 },
  () => __h.next('Velns'),
  { wait: 5000 },
  () => __h.spot('Velns', 'plank0').activate(),
  { wait: 2200 },
  () => __h.spot('Velns', 'plank1').activate(),
  { wait: 2600 },
  () => __h.spot('Velns', 'plank2').activate(),
  { wait: 5800 },
  () => __h.drain('Velns'),
  { wait: 800 },
  () => __h.pick('Velns', 1),
  { wait: 900 },
  () => __h.drain('Velns'),
  { wait: 300 },
  () => __h.pick('Velns', 1),
  { wait: 600 },
  () => __h.drain('Velns'),
  { wait: 600 },
  () => __h.assert(__h.scene('Velns').phase === 'night', 'the night has begun'),
  () => __h.key('t'),
  { wait: 75000 },
  () => {
    __h.assert(__h.scene('Velns').phase === 'night', 'the night waited for the book');
    __h.assert(__h.state().velns === 'none', 'nothing was settled behind it');
  },
  () => __h.key('Escape'),
  { wait: 75000 },
  () => __h.assert(__h.state().velnsPick === 'dawn', 'and it went on once the book was shut'),

  // --- The folklore in a production build is the checked folklore.
  () => {
    const g = window.__game;
    __h.assert(__vv.lore.total === 7, 'the book has all seven beliefs, now all checked', __vv.lore.total);
    __h.assert(g.textures.exists('velns'), 'the art streamed in');
  },
];
