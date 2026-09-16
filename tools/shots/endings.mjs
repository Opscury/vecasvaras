/**
 * All four field reckonings, one after another: the tithe, Jumis carried
 * home, the field stripped, and the field given too much. The harvest is cut
 * the same way each time; only the ending is forced.
 */
const round = (pick, sweep) => [
  () => __h.start('Jumis'),
  { wait: 1500 },
  () => __h.drain('Jumis'),
  { wait: 600 },
  () => __h.scene('Jumis').bagUi.take('sickle'),
  { wait: 300 },
  sweep,
  { wait: 1500 },
  // A field cut clean goes on to the standing ear by itself; a part-cut one
  // is still being cut. Either way, the ending is forced from here.
  () => __h.drain('Jumis'),
  { wait: 300 },
  () => {
    const j = __h.scene('Jumis');
    if (j.phase === 'cutting') j.phase = 'gesture';
  },
  // The four endings go through the same door the gestures do.
  pick,
  { wait: 1200 },
  () => __h.drain('Jumis'),
  { wait: 5400 },
];

const most = () => __h.sweep('Jumis', [430, 520, 610, 700, 790, 880, 970]);
const part = () => __h.sweep('Jumis', [430, 560, 700], 60, 860);

export default [
  ...round(() => __h.scene('Jumis').resolve('leave'), most),
  { shot: 'leave' },
  ...round(() => __h.scene('Jumis').resolve('take'), most),
  { shot: 'take' },
  ...round(() => __h.scene('Jumis').resolve('all'), most),
  { shot: 'all' },
  ...round(() => __h.scene('Jumis').resolve('spare'), part),
  { shot: 'spare' },
  () => __h.log('last', __h.state().jumisPick, __h.state().sheaves),
];
