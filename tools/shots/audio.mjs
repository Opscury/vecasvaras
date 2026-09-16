/** Which sounds the build actually loaded and decoded. No screenshots. */
export default [
  () => __h.start('Village'),
  { wait: 3000 },
  () => {
    const g = window.__game;
    const want = [
      'sfx_click', 'sfx_hover', 'sfx_sickle', 'sfx_bag', 'sfx_bag_open', 'sfx_bag_close',
      'sfx_carve1', 'sfx_carve2', 'sfx_carve3', 'sfx_cat', 'sfx_cock', 'sfx_tally',
      'sfx_frog', 'sfx_gust', 'sfx_splash', 'sfx_sheaf', 'sfx_chime',
      'mus_kokle_jumis', 'mus_kokle_velns', 'amb_village', 'amb_field', 'amb_bog',
    ];
    const missing = want.filter((k) => !g.cache.audio.exists(k));
    const decoded = want.filter((k) => {
      const d = g.cache.audio.get(k);
      return d && typeof d.duration === 'number' && d.duration > 0;
    });
    __h.log('audio', { total: want.length, missing, decoded: decoded.length, durations: Object.fromEntries(decoded.filter((k) => /kokle|frog|gust|splash|sheaf|chime/.test(k)).map((k) => [k, +g.cache.audio.get(k).duration.toFixed(2)])) });
  },
];
