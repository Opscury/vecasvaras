/** Two deliberate strokes through the double ear: warned, then cut. */
export default [
  () => __h.start('Jumis'),
  { wait: 1500 },
  () => __h.next('Jumis'),
  { wait: 900 },
  () => __h.next('Jumis'),
  { wait: 1200 },
  () => __h.scene('Jumis').bagUi.take('sickle'),
  { wait: 400 },
  () => __h.sweep('Jumis', [430, 700]),
  { wait: 600 },
  () => {
    const j = __h.scene('Jumis');
    j.strokeFrom = { x: 1596, y: 540 };
    j.strike(1596, 540);
    j.strokeFrom = null;
  },
  { wait: 2600 },
  () => {
    const j = __h.scene('Jumis');
    j.strokeFrom = { x: 1596, y: 540 };
    j.strike(1596, 540);
    j.strokeFrom = null;
  },
  { wait: 900 },
  { shot: 'heavy-sheaf' },
  { wait: 1400 },
  () => __h.type('Jumis'),
  { shot: 'all-line' },
  () => __h.next('Jumis'),
  { wait: 500 },
  () => __h.next('Jumis'),
  { wait: 500 },
  () => __h.next('Jumis'),
  { wait: 6000 },
  { shot: 'reckoning-missed' },
  () => __h.log('state', __h.state()),
];
