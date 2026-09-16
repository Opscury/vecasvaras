/** The harvest, the tithe way: cut most of it, say it will do, bend the ear down. */
export default [
  () => __h.start('Jumis'),
  { wait: 2200 },
  { shot: 'daina' },
  () => __h.card('Jumis'),
  { wait: 1400 },
  () => __h.next('Jumis'),
  { wait: 900 },
  () => __h.next('Jumis'),
  { wait: 1200 },
  () => __h.scene('Jumis').bagUi.take('sickle'),
  { wait: 500 },
  () => __h.sweep('Jumis', [430, 560]),
  { wait: 1200 },
  { shot: 'two-sweeps' },
  () => __h.log('cut after two', __h.scene('Jumis').cover.cut),
  () => __h.sweep('Jumis', [700, 840, 960]),
  { wait: 1500 },
  () => __h.log('cut after five', __h.scene('Jumis').cover.cut, __h.scene('Jumis').tally.value),
  { shot: 'most-cut-with-enough' },
  () => __h.scene('Jumis').finishCut(),
  { wait: 1400 },
  () => __h.type('Jumis'),
  { shot: 'standing-line' },
  () => __h.next('Jumis'),
  { wait: 900 },
  { shot: 'gesture-prompt' },
  () => {
    const j = __h.scene('Jumis');
    j.gestureFrom = { x: 1596, y: 540 };
    j.previewGesture(12, 80);
  },
  { wait: 50 },
  { shot: 'bending' },
  () => {
    const j = __h.scene('Jumis');
    j.gestureFrom = null;
    j.commitGesture(12, 130);
  },
  { wait: 1600 },
  () => __h.type('Jumis'),
  { shot: 'tied' },
  () => __h.next('Jumis'),
  { wait: 600 },
  () => __h.next('Jumis'),
  { wait: 600 },
  () => __h.next('Jumis'),
  { wait: 5200 },
  { shot: 'reckoning' },
  () => __h.log('state', __h.state()),
];
