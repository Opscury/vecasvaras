/** Cut it all, then pull the double ear up and carry it home. */
export default [
  () => __h.start('Jumis'),
  { wait: 1500 },
  () => __h.next('Jumis'),
  { wait: 900 },
  () => __h.next('Jumis'),
  { wait: 1200 },
  () => __h.scene('Jumis').bagUi.take('sickle'),
  { wait: 400 },
  () => __h.sweep('Jumis', [430, 560, 700, 840, 960]),
  { wait: 2500 },
  () => __h.next('Jumis'),
  { wait: 900 },
  () => {
    const j = __h.scene('Jumis');
    j.gestureFrom = { x: 1596, y: 560 };
    j.previewGesture(-4, -90);
  },
  { wait: 50 },
  { shot: 'pulling' },
  () => {
    const j = __h.scene('Jumis');
    j.gestureFrom = null;
    j.commitGesture(-4, -140);
  },
  { wait: 1500 },
  () => __h.type('Jumis'),
  { shot: 'pulled' },
  () => __h.next('Jumis'),
  { wait: 500 },
  () => __h.next('Jumis'),
  { wait: 500 },
  () => __h.next('Jumis'),
  { wait: 6000 },
  { shot: 'reckoning-cost' },
  () => __h.log('state', __h.state()),
];
