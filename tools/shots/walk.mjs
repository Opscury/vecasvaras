/**
 * On foot in the village, at a real walking pace (run with WALK=1): out of the
 * intro, across to Anna, and the prints left in the dust behind.
 */
export default [
  () => {
    __vv.state.patch({ heroChosen: true, gender: 'm', name: 'Jānis', introSeen: true, scene: 'Village' });
    __h.start('Village');
  },
  { wait: 1500 },
  { shot: 'standing' },
  () => __h.spot('Village', 'stone').activate(),
  { wait: 900 },
  { shot: 'walking-round-the-stone' },
  { wait: 2600 },
  { shot: 'at-the-stone' },
  () => __h.drain('Village'),
  () => __h.spot('Village', 'anna').activate(),
  { wait: 1300 },
  { shot: 'prints' },
  { wait: 2500 },
  () => __h.assert(__h.scene('Village').narration.busy, 'Anna speaks once reached'),
  { shot: 'with-anna' },
  () => {
    __h.drain('Village');
    __vv.state.patch({ gender: 'f', name: 'Grieta' });
    __h.start('Village');
  },
  { wait: 800 },
  () => __h.spot('Village', 'cat').activate(),
  { wait: 1200 },
  { shot: 'her-walking' },
];
