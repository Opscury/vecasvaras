import Phaser from 'phaser';
import { Layout, Palette } from './core/theme';
import { i18n } from './core/i18n';
import { audio } from './core/audio';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { IntroScene } from './scenes/IntroScene';
import { VillageScene } from './scenes/VillageScene';
import { JumisScene } from './scenes/JumisScene';
import { VelnsScene } from './scenes/VelnsScene';
import { OutroScene } from './scenes/OutroScene';

document.documentElement.lang = i18n.lang;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: Palette.ink,
  width: Layout.width,
  height: Layout.height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [BootScene, TitleScene, IntroScene, VillageScene, JumisScene, VelnsScene, OutroScene],
});

audio.attach(game);

// Where the browser allows it (an installed app, fullscreen), keep a phone
// sideways. Everywhere else the call rejects, which is fine: the CSS gate in
// index.html already asks the player to turn the device.
window.addEventListener(
  'pointerdown',
  () => {
    // Browsers refuse to make a sound before a real gesture. This is the
    // first one the page gets, so it is where the ambient bed can start.
    audio.unlock();
    const orientation = screen.orientation as unknown as { lock?: (o: string) => Promise<void> } | undefined;
    orientation?.lock?.('landscape').catch(() => {});
  },
  { once: true },
);

// Handy for debugging and for automated playtests.
(window as unknown as { __game: Phaser.Game }).__game = game;
