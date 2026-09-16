/** The closing tally, in the words the encounters are now described in. */
export default [
  () => { const g = window.__game; g.scene.stop('Title'); g.scene.start('Outro'); },
  { wait: 2600 },
  { shot: 'open' },
  () => { const n = window.__game.scene.getScene('Outro').narration; if (n) { n.finishTyping(); n.advance(); } },
  { wait: 1400 },
  { shot: 'line-2' },
  () => { const n = window.__game.scene.getScene('Outro').narration; if (n) { n.finishTyping(); n.advance(); } },
  { wait: 1600 },
  { shot: 'line-3' },
  () => { const n = window.__game.scene.getScene('Outro').narration; if (n) { n.finishTyping(); n.advance(); } },
  { wait: 4000 },
  { shot: 'tally' },
  { wait: 4000 },
  { shot: 'tally-2' },
];
