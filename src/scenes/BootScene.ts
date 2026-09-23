import Phaser from 'phaser';
import { t } from '../core/i18n';
import { ui } from '../content/script';
import { Palette, Hex, Fonts, Layout, px, scaled } from '../core/theme';
import { assertDainasVerified } from '../content/dainas';
import { assertBeliefsVerified } from '../content/ticejumi';
import { TITLE_ASSETS, missingFrom, queueMissing, reportLoadErrors } from './assets';
import { padHit } from '../ui/hit';

/**
 * Loads only what the title needs. The rest of the art is fetched by the title
 * scene while the player is reading it (see `assets.ts`).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = Layout;
    this.cameras.main.setBackgroundColor(Palette.ink);

    const bar = this.add.graphics();
    // Below the HTML "VECĀS VARAS" placeholder, not on top of it.
    const label = this.add
      .text(width / 2, height / 2 + 96, '', {
        fontFamily: Fonts.body,
        fontSize: px(20),
        color: Hex.parchmentDim,
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      bar.clear();
      bar.fillStyle(Palette.timber, 0.5);
      bar.fillRect(width / 2 - 220, height / 2 + 60, 440, 3);
      bar.fillStyle(Palette.rye, 1);
      bar.fillRect(width / 2 - 220, height / 2 + 60, 440 * v, 3);
      label.setText(`${Math.round(v * 100)}%`);
    });

    reportLoadErrors(this);
    queueMissing(this, TITLE_ASSETS);
  }

  create(): void {
    assertDainasVerified();
    assertBeliefsVerified();

    const missing = missingFrom(this, TITLE_ASSETS);
    if (missing.length) {
      this.showError(missing);
      return;
    }

    // Fade the HTML placeholder out — it has declared a transition all along.
    const el = document.getElementById('boot');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 600);
    }
    // The rest of the art starts streaming now, behind the title.
    this.scene.launch('Stream');
    this.scene.start('Title');
  }

  /** A 404 used to leave a black screen. Now it says so, and offers a retry. */
  private showError(missing: string[]): void {
    const { width, height } = Layout;
    this.children.removeAll(true);
    this.add
      .text(width / 2, height / 2, `${t(ui.loadFailed)} ${missing.join(', ')}`, {
        fontFamily: Fonts.body,
        fontSize: px(26),
        color: Hex.parchment,
        align: 'center',
        wordWrap: { width: 1200 },
      })
      .setOrigin(0.5);
    const retry = this.add
      .text(width / 2, height / 2 + scaled(80), t(ui.retry), {
        fontFamily: Fonts.body,
        fontSize: px(28),
        color: Hex.rye,
      })
      .setOrigin(0.5);
    padHit(retry, 360, 80);
    retry.on('pointerdown', () => this.scene.restart());
  }
}
