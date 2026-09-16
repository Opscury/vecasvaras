/** The bottom-right corner while something is in hand: the line and the chip. */
export default [
  () => {
    const g = window.__game;
    g.scene.stop('Title');
    g.scene.start('Jumis');
  },
  { wait: 2200 },
  // Past the epigraph and the arrival lines.
  () => {
    const j = window.__game.scene.getScene('Jumis');
    const hit = j.children.list.find((o) => o.type === 'Zone' && o.depth === 810);
    hit?.emit('pointerdown', { button: 0 }, 0, 0, {});
  },
  { wait: 1200 },
  () => { const n = window.__game.scene.getScene('Jumis').narration; n.finishTyping(); n.advance(); },
  { wait: 900 },
  () => { const n = window.__game.scene.getScene('Jumis').narration; n.finishTyping(); n.advance(); },
  { wait: 1400 },
  { shot: 'field-ready' },
  // Open the bag the way a thumb would.
  () => { const j = window.__game.scene.getScene('Jumis'); j.bagUi.bagImg.emit('pointerdown', {}, 0, 0, {}); },
  { wait: 700 },
  { shot: 'bag-open' },
  () => {
    const j = window.__game.scene.getScene('Jumis');
    const icon = j.bagUi.tray.list.find((o) => o.type === 'Image');
    icon.emit('pointerdown', { button: 0 }, 0, 0, {});
  },
  { wait: 700 },
  { shot: 'in-hand' },
  { wait: 3000 },
  { shot: 'in-hand-settled' },
];
