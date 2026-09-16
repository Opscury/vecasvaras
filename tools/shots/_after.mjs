/**
 * Shared tail: past the field's reckoning, home, and back out to the field
 * to see it as it was left. Spread after a harvest route.
 */
export default [
  () => __h.card('Jumis'),
  { wait: 600 },
  () => __h.card('Jumis'),
  { wait: 2600 },
  () => __h.log('after: in', __h.scene('Village').sys.isActive()),
  { wait: 1800 },
  () => __h.next('Village'),
  { wait: 500 },
  () => __h.next('Village'),
  { wait: 500 },
  () => __h.next('Village'),
  { wait: 800 },
  () => __h.spot('Village', 'pathField').activate(),
  { wait: 700 },
  () => __h.next('Village'),
  { wait: 2600 },
  () => __h.log('after: field', __h.scene('Jumis').sys.isActive(), __h.scene('Jumis').phase),
  { shot: 'field-after' },
  () => __h.spot('Jumis', __h.scene('Jumis').spots.some((s) => s.id === 'ear') ? 'ear' : 'stubble').activate(),
  { wait: 900 },
  () => __h.type('Jumis'),
  { shot: 'field-after-ear' },
  () => __h.next('Jumis'),
  { wait: 400 },
  () => __h.spot('Jumis', 'exit').activate(),
  { wait: 2200 },
  () => __h.log('after: back', __h.scene('Village').sys.isActive(), __h.state().scene),
];
