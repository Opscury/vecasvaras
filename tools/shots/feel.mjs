/**
 * The field answering the blade: arrive, take the blade, sweep the field down,
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

  // A stroke at speed: birds go up from where the blade went through.
  () => {
    const j = window.__game.scene.getScene('Jumis');
    j.lastBirds = -99999;
    const r = Math.random; Math.random = () => 0.1;
    __h.sweep('Jumis', [760], 620, 1300);
    Math.random = r;
    __h.log('boost while cutting', j.wind && j.wind.boost.toFixed(2), 'phase', j.phase);

  },
  { wait: 450 },
  { shot: 'birds-flushed' },
  // Then the blade stops, and the wind comes up over the rye.
  { wait: 4000 },
  () => __h.log('boost when still', __h.scene('Jumis').wind && __h.scene('Jumis').wind.boost.toFixed(2)),
  { shot: 'wind-up' },
];
