import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { ui } from '../content/script';
import { Hex, Fonts, Layout, px, scaled } from '../core/theme';
import { History } from './History';
import { KeyNav } from './KeyNav';
import { markHandled, wasHandled } from './keys';
import { audio } from '../core/audio';

const CHIP = {
  fontFamily: Fonts.body,
  fontSize: px(24),
  color: Hex.parchmentDim,
  backgroundColor: 'rgba(20,22,26,0.6)',
  // Generous padding: the chip is a 17px target on a phone held sideways otherwise.
  padding: { x: scaled(26), y: scaled(18) },
};

/**
 * Persistent top-corner furniture: the language toggle and, in scenes that
 * talk, the ⟲ that opens everything said so far (H on the keyboard). Kept above
 * every card so the language can be switched while a daina or a verdict is up.
 *
 * Also gives the scene its keyboard path to hotspots (`KeyNav`).
 */
export class Chrome {
  private toggle: Phaser.GameObjects.Text;
  private logBtn: Phaser.GameObjects.Text | null = null;
  private muteBtn: Phaser.GameObjects.Text | null = null;
  private offLang: () => void;
  private offMute: () => void = () => {};

  constructor(scene: Phaser.Scene, opts: { log?: () => Loc[] } = {}) {
    const { width, margin } = Layout;

    this.toggle = scene.add
      .text(width - margin + 12, margin - 30, t(ui.langSwitch), CHIP)
      .setOrigin(1, 0)
      .setDepth(900)
      .setInteractive({ useHandCursor: true });
    this.chip(this.toggle, () => i18n.toggle());

    // Sound is only offered when there is sound to turn off.
    if (audio.enabled) {
      this.muteBtn = scene.add
        .text(0, margin - 30, audio.muted ? '♪̸' : '♪', CHIP)
        .setOrigin(1, 0)
        .setDepth(900)
        .setInteractive({ useHandCursor: true });
      this.chip(this.muteBtn, () => audio.toggleMute());
      this.offMute = audio.onChange((m) => this.muteBtn?.setText(m ? '♪̸' : '♪'));
      scene.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
        if (ev.repeat || wasHandled(ev)) return;
        if (ev.key === 'm' || ev.key === 'M') {
          audio.toggleMute();
          markHandled(ev);
        }
      });
    }

    if (opts.log) {
      const history = new History(scene, opts.log);
      this.logBtn = scene.add
        .text(0, margin - 30, '⟲', CHIP)
        .setOrigin(1, 0)
        .setDepth(900)
        .setInteractive({ useHandCursor: true });
      this.chip(this.logBtn, () => history.toggle());
      this.place();

      // Registered before KeyNav below, so Escape closes the page before it
      // can also drop the hotspot focus underneath.
      scene.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
        if (ev.repeat || wasHandled(ev)) return;
        if (ev.key === 'h' || ev.key === 'H') {
          history.toggle();
          markHandled(ev);
        } else if (ev.key === 'Escape' && history.isOpen) {
          history.close();
          markHandled(ev);
        }
      });
    }

    this.place();
    new KeyNav(scene);

    this.offLang = i18n.onChange(() => {
      this.toggle.setText(t(ui.langSwitch));
      this.place();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offLang();
      this.offMute();
    });
  }

  /** The chips stack leftward from the language one, whatever width it is. */
  private place(): void {
    let x = this.toggle.x - this.toggle.width - 10;
    if (this.logBtn) {
      this.logBtn.setX(x);
      x -= this.logBtn.width + 10;
    }
    this.muteBtn?.setX(x);
  }

  private chip(txt: Phaser.GameObjects.Text, onPress: () => void): void {
    txt.on('pointerover', () => {
      audio.play('hover');
      txt.setColor(Hex.ryeBright);
    });
    txt.on('pointerout', () => txt.setColor(Hex.parchmentDim));
    txt.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      audio.play('click');
      onPress();
    });
  }
}
