/**
 * The map, at three stages of a run: nothing crossed, the bog open, and the
 * bridge built. The seed is a run with the harvest home, so the bog road is
 * open and the crossing is still missing.
 */
export default [
  () => __h.start('Village'),
  { wait: 2600 },
  { shot: 'village' },
  () => __h.key('k'),
  { wait: 900 },
  { shot: 'map-bog-open' },
  () => __h.key('Escape'),
  { wait: 400 },
  // As it looks before Anna has sent you anywhere.
  () => __h.scene('Village').scene.get('Village') && window.__game.scene.getScene('Village'),
  () => {
    const st = JSON.parse(localStorage.getItem('vecasvaras.save.v3'));
    st.jumisPaid = false;
    localStorage.setItem('vecasvaras.save.v3', JSON.stringify(st));
  },
  () => __h.key('k'),
  { wait: 900 },
  { shot: 'map-nothing-open' },
  () => __h.key('Escape'),
  { wait: 400 },
  () => __h.log('state', __h.state()),
]
