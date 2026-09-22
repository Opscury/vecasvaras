/**
 * A scene change, caught half-way. (The very first frame a camera pass draws
 * in this harness comes out black, so there is one throwaway shot first.)
 */
export default [
  () => __h.start('Village'),
  { wait: 2600 },
  () => __h.scene('Village').leaveTo('Jumis'),
  { wait: 200 },
  { shot: 'warmup' },
  { wait: 180 },
  { shot: 'ink-coming' },
  { wait: 300 },
  { wait: 200 },
  { shot: 'ink-clearing' },
];
