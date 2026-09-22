/** The map in the village: a touch says what a place is, a second goes there. */
export default [
  () => __h.start('Village'),
  { wait: 2400 },
  () => __h.key('k'),
  { wait: 1200 },
  () => {
    const s = __h.scene('Village');
    const zones = [];
    const walk = (list) => list.forEach((o) => { if (o.type === 'Zone' && o.width === 190) zones.push(o); if (o.list) walk(o.list); });
    walk(s.children.list);
    window.__zones = zones;
    __h.log('place zones', zones.length);
    // The mill: a rumour.
    zones[4].emit('pointerdown', { button: 0 }, 0, 0, { stopPropagation() {} });
  },
  { wait: 300 },
  { shot: 'rumour-mill' },
  () => window.__zones[1].emit('pointerdown', { button: 0 }, 0, 0, { stopPropagation() {} }),
  { wait: 300 },
  { shot: 'field-armed' },
  () => window.__zones[1].emit('pointerdown', { button: 0 }, 0, 0, { stopPropagation() {} }),
  { wait: 900 },
  () => __h.log('narration after travel', __h.nar('Village')),
  { shot: 'walking-off' },
];
