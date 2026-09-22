/** The map once the bridge is built: the road beyond the bog is a cart road. */
export default [
  () => __h.start('Village'),
  { wait: 2600 },
  () => __h.key('k'),
  { wait: 900 },
  { shot: 'map-crossed' },
  () => __h.key('Escape'),
  { wait: 400 },
  { shot: 'village-evening' },
]
