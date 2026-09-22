/**
 * The bog played well: the wisps on the causeway, the right answer, a good
 * loaf over the bridge — and the Devil leaving his hat.
 */
export default [
  () => __h.start('Velns'),
  { wait: 2600 },
  () => __h.card('Velns'),
  { wait: 1400 },
  () => __h.next('Velns'),
  { wait: 700 },
  () => __h.next('Velns'),
  { wait: 1600 },
  { wait: 2600 },
  { shot: 'wisp-beckons' },
  { wait: 1500 },
  { shot: 'wisp-held' },
  () => __h.spot('Velns', 'plank0').activate(),
  { wait: 800 },
  () => __h.spot('Velns', 'plank1').activate(),
  { wait: 800 },
  () => __h.spot('Velns', 'plank2').activate(),
  { wait: 2600 },
  () => __h.next('Velns'),
  { wait: 600 },
  () => __h.next('Velns'),
  { wait: 900 },
  () => __h.pick('Velns', 1),
  { wait: 900 },
  () => __h.next('Velns'),
  { wait: 900 },
  () => __h.pick('Velns', 0),
  { wait: 900 },
  () => __h.drain('Velns'),
  { wait: 3000 },
  () => __h.use('Velns', 'bread', 'bridge'),
  { wait: 2400 },
  () => {
    for (let i = 0; i < 40; i++) {
      const n = __h.scene('Velns').narration;
      const txt = n.label?.text ?? '';
      if (txt.includes('cepuri') || txt.includes('hat')) return __h.log('hat line at', i);
      n.finishTyping();
      n.advance();
      window.__advance(500);
    }
    __h.log('no hat line', __h.nar('Velns'));
  },
  { wait: 400 },
  { shot: 'hat-left' },
  () => __h.next('Velns'),
  { wait: 1400 },
  { wait: 3000 },
  { shot: 'reckoning-hat' },
  () => __h.log('bag', localStorage.getItem('vecasvaras.bag.v1')),
];
