/** Home from the bog: the first look at the map strikes the cross out and draws the bridge. */
export default [
  () => __h.start('Village'),
  { wait: 2400 },
  () => __h.key('k'),
  { wait: 700 },
  { shot: 'cross' },
  { wait: 700 },
  { shot: 'struck' },
  { wait: 1400 },
  { shot: 'bridge' },
];
