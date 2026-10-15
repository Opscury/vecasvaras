/**
 * The year with Ilze, start to finish, for a young man: met kindly, the
 * double ear talked over, bread shared, home from the bog to an invitation.
 * Then the same yard for a young woman, with Krišs.
 */

export default [
  () => {
    __vv.bag.clear();
    __vv.state.patch({ heroChosen: true, gender: 'm', name: 'Pēteris', introSeen: true, metElder: true, scene: 'Village' });
    __h.start('Village');
  },
  { wait: 1500 },
  { shot: 'ilze-in-the-yard' },
  () => __h.spot('Village', 'beloved').activate(),
  { wait: 600 },
  () => __h.drain('Village'),
  { wait: 300 },
  { shot: 'meet-choices' },
  () => __h.pick('Village', 0),
  { wait: 400 },
  () => __h.drain('Village'),
  { wait: 900 },
  () => __h.assert(__h.state().bond === 2, 'a kind first meeting is two knots', __h.state().bond),
  { shot: 'ribbon-two' },

  // Home from the field, tithe left, the loaf in the bag.
  () => {
    __vv.bag.add('sickle');
    __vv.bag.add('bread');
    __vv.state.patch({ jumis: 'good', jumisPick: 'leave', sheaves: 8, jumisPaid: true, shown: { jumis: 'good', jumisPick: 'leave', jumisPaid: true, sheaves: 8, velns: 'none' } });
    __h.start('Village');
  },
  { wait: 1500 },
  () => __h.spot('Village', 'beloved').activate(),
  { wait: 600 },
  () => __h.drain('Village'),
  { wait: 300 },
  { shot: 'the-omen' },
  () => __h.pick('Village', 0),
  { wait: 400 },
  () => __h.drain('Village'),
  { wait: 600 },
  () => __h.assert(__h.state().bond === 4, 'the tithe and a warm answer: four', __h.state().bond),
  () => __h.use('Village', 'bread', 'beloved'),
  { wait: 400 },
  { shot: 'bread-shared' },
  () => __h.drain('Village'),
  { wait: 600 },
  () => __h.assert(__h.state().bond === 5 && __vv.bag.has('bread'), 'bread shared and the loaf kept', __h.state().bond),

  // Home from the bog: the Devil gone for good.
  () => {
    __vv.state.patch({ velns: 'good', velnsPick: 'bread', devilGone: true, velnsPaid: true, shown: { jumis: 'good', jumisPick: 'leave', jumisPaid: true, sheaves: 8, velns: 'good' } });
    __h.start('Village');
  },
  { wait: 1500 },
  () => __h.spot('Village', 'beloved').activate(),
  { wait: 600 },
  () => __h.drain('Village'),
  { wait: 300 },
  { shot: 'invitation' },
  () => __h.pick('Village', 0),
  { wait: 400 },
  () => __h.drain('Village'),
  () => __h.assert(__h.state().talks.includes('invited'), 'invited to the dancing'),

  // A young woman, and Krišs.
  () => {
    __vv.state.reset();
    __vv.bag.clear();
    __vv.state.patch({ heroChosen: true, gender: 'f', name: 'Līze', introSeen: true, metElder: true, scene: 'Village' });
    __h.start('Village');
  },
  { wait: 1500 },
  () => __h.spot('Village', 'beloved').activate(),
  { wait: 600 },
  () => __h.drain('Village'),
  { wait: 300 },
  { shot: 'kriss-meet' },
];
