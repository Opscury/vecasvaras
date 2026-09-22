/** The beliefs book: contents, a found page, an unfound one. */
export default [
  () => __h.start('Village'),
  { wait: 2400 },
  () => __h.key('t'),
  { wait: 900 },
  { shot: 'contents' },
  () => __h.key('ArrowRight'),
  { wait: 800 },
  { shot: 'spread-2' },
  () => __h.key('ArrowRight'),
  { wait: 800 },
  { shot: 'spread-3' },
  () => __h.key('Escape'),
  { wait: 400 },
];
