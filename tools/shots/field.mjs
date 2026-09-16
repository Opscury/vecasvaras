/**
 * The harvest, start to finish: arrive, take the blade, sweep the field down,
 * and land on the one question the encounter asks.
 */
export default [
  // Straight into the field with the sickle already earned.
  () => {
    localStorage.setItem(
      'vecasvaras.save.v2',
      JSON.stringify({
        jumis: 'none',
        velns: 'none',
        introSeen: true,
        outroSeen: false,
        metElder: true,
        jumisPaid: false,
        velnsPaid: false,
        scene: 'Village',
      }),
    );
    localStorage.setItem('vecasvaras.bag.v1', JSON.stringify(['sickle']));
    localStorage.setItem('bagTaught', '1');
    const g = window.__game;
    g.scene.stop('Title');
    g.scene.start('Jumis');
  },
  { wait: 2200 },
  { shot: 'daina' },

  // Past the epigraph and the two arrival lines, the way a click would.
  () => {
    const j = window.__game.scene.getScene('Jumis');
    const hit = j.children.list.find((o) => o.type === 'Zone' && o.depth === 810);
    hit?.emit('pointerdown', { button: 0 }, 0, 0, {});
  },
  { wait: 1400 },
  () => {
    const n = window.__game.scene.getScene('Jumis').narration;
    n.finishTyping();
  },
  { wait: 400 },
  { shot: 'arrive' },
  () => {
    const n = window.__game.scene.getScene('Jumis').narration;
    n.advance();
  },
  { wait: 900 },
  () => {
    const n = window.__game.scene.getScene('Jumis').narration;
    n.finishTyping();
  },
  { wait: 300 },
  () => {
    const n = window.__game.scene.getScene('Jumis').narration;
    n.advance();
  },
  { wait: 1200 },
  { shot: 'standing-field' },

  // Blade in hand.
  () => {
    const j = window.__game.scene.getScene('Jumis');
    j.bagUi.take('sickle');
  },
  { wait: 600 },
  { shot: 'sickle-in-hand' },

  // Two strokes, to see a half-cut field with a live edge.
  () => {
    const j = window.__game.scene.getScene('Jumis');
    for (const y of [430, 600]) {
      j.strokeFrom = { x: 60, y };
      for (let x = 60; x <= 1900; x += 40) j.strike(x, y);
      j.strokeFrom = null;
    }
  },
  { wait: 700 },
  { shot: 'half-cut' },

  // A stroke straight through the double ear: it should refuse and say why.
  () => {
    const j = window.__game.scene.getScene('Jumis');
    j.strokeFrom = { x: 900, y: 555 };
    for (let x = 900; x <= 1900; x += 40) j.strike(x, 555);
    j.strokeFrom = null;
  },
  { wait: 500 },
  { shot: 'tithe-warned' },

  // The rest of the field.
  () => {
    const j = window.__game.scene.getScene('Jumis');
    for (const y of [730, 880, 1010, 500, 660]) {
      j.strokeFrom = { x: 60, y };
      for (let x = 60; x <= 1900; x += 40) j.strike(x, y);
      j.strokeFrom = null;
    }
  },
  { wait: 2400 },
  { shot: 'cut-with-island' },
  { wait: 1600 },
  () => {
    const n = window.__game.scene.getScene('Jumis').narration;
    n.finishTyping();
  },
  { wait: 600 },
  { shot: 'standing-line' },
  () => {
    const n = window.__game.scene.getScene('Jumis').narration;
    n.advance();
  },
  { wait: 900 },
  { shot: 'the-question' },
];
