/** The settings card, then large text and instant speed chosen. */
export default [
  () => __h.start('Village'),
  { wait: 2400 },
  () => {
    const s = __h.scene('Village');
    const chip = s.children.list.filter((o) => o.type === 'Text' && o.text === ' ').pop();
    chip.emit('pointerdown', { button: 0 }, 0, 0, { stopPropagation() {} });
  },
  { wait: 1200 },
  { shot: 'settings' },
  () => {
    const s = __h.scene('Village');
    const find = (label) => {
      const walk = (list) => {
        for (const o of list) {
          if (o.type === 'Text' && o.text === label) return o;
          if (o.list) {
            const r = walk(o.list);
            if (r) return r;
          }
        }
        return null;
      };
      return walk(s.children.list);
    };
    find('Liels').emit('pointerdown', { button: 0 }, 0, 0, { stopPropagation() {} });
  },
  { wait: 1500 },
  { shot: 'settings-large' },
];
