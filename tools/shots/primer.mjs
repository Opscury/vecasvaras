/**
 * The family-playtest cards (Oct 2026): what the game is, who Jumis and the
 * Devil are, the double ear asking before it settles, the belief after the
 * field, and the line under the tally that says what the stone is.
 */
export default [
  () => __h.start('Intro'),
  { wait: 1200 },
  { shot: 'howto' },
  () => __h.press('Intro', 'Sākam', 'Let’s begin'),
  { wait: 800 },

  () => __h.start('Jumis'),
  { wait: 2200 },
  { shot: 'being-jumis' },
  () => __h.press('Jumis', 'Iet', 'Go'),
  { wait: 900 },
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
    j.previewGesture(4, 120);
    j.gestureFrom = null;
    j.commitGesture(4, 140);
  },
  { wait: 900 },
  () => __h.type('Jumis'),
  { shot: 'confirm-leave' },
  () => __h.pick('Jumis', 0),
  { wait: 1500 },
  () => __h.drain('Jumis'),
  { wait: 6000 },
  { shot: 'reckoning' },
  () => __h.card('Jumis'),
  { wait: 1500 },
  { shot: 'belief-after-field' },
  () => __h.press('Jumis', 'Tālāk', 'Next'),
  { wait: 1500 },

  () => __h.start('Velns'),
  { wait: 2200 },
  { shot: 'being-velns' },

  () => {
    __vv.state.patch({ jumis: 'good', jumisPick: 'leave', velns: 'good', velnsPick: 'bread', jumisPaid: true, velnsPaid: true });
    __h.start('Outro');
  },
  { wait: 1500 },
  () => __h.drain('Outro'),
  { wait: 7000 },
  { shot: 'tally' },
];
