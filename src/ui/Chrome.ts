import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { ui } from '../content/script';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { History } from './History';
import { LorePage, showLoreToast } from './Lore';
import { lore } from '../core/lore';
import { walkSign } from './Sign';
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
 * Also the beliefs chip — the Jumis sign and a count — which opens the page of
 * everything found so far (T on the keyboard), and the note that pops up when
 * a new one is found, wherever the player happens to be.
 *
 * Also gives the scene its keyboard path to hotspots (`KeyNav`).
 */
export class Chrome {
  private toggle: Phaser.GameObjects.Text;
  private logBtn: Phaser.GameObjects.Text | null = null;
  private muteBtn: Phaser.GameObjects.Text | null = null;
  private loreBtn: Phaser.GameObjects.Text | null = null;
  private loreGlyph: Phaser.GameObjects.Graphics | null = null;
  private offLang: () => void;
  private offMute: () => void = () => {};
  private offLore: () => void = () => {};

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

    // The beliefs, once there is at least one — or always in a scene where
    // one can be found, so the chip is not a surprise when it appears.
    const pages = new LorePage(scene);
    this.loreBtn = scene.add
      .text(0, margin - 30, this.loreText(), {
        ...CHIP,
        // Room on the left for the drawn sign. Phaser ignores `left` when `x`
        // is set, so all four sides are spelled out.
        padding: { left: scaled(60), right: scaled(22), top: scaled(18), bottom: scaled(18) },
      })
      .setOrigin(1, 0)
      .setDepth(900)
      .setInteractive({ useHandCursor: true });
    this.chip(this.loreBtn, () => pages.toggle());
    this.loreGlyph = scene.add.graphics().setDepth(901);
    this.loreGlyph.lineStyle(2, Palette.rye, 0.95);
    walkSign('jumis', 1, (ax, ay, bx, by) => {
      const k = scaled(9);
      this.loreGlyph!.lineBetween(ax * k, ay * k, bx * k, by * k);
    });
    this.setLoreVisible(lore.count > 0);
    this.offLore = lore.onUnlock((id) => {
      this.loreBtn?.setText(this.loreText());
      this.setLoreVisible(true);
      this.place();
      showLoreToast(scene, id);
    });
    scene.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.repeat || wasHandled(ev)) return;
      if ((ev.key === 't' || ev.key === 'T') && lore.count > 0) {
        pages.toggle();
        markHandled(ev);
      } else if (ev.key === 'Escape' && pages.isOpen) {
        pages.close();
        markHandled(ev);
      }
    });

    this.place();
    new KeyNav(scene);

    this.offLang = i18n.onChange(() => {
      this.toggle.setText(t(ui.langSwitch));
      this.place();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offLang();
      this.offMute();
      this.offLore();
    });
  }

  private loreText(): string {
    return `${lore.count}/${lore.total}`;
  }

  private setLoreVisible(on: boolean): void {
    this.loreBtn?.setVisible(on);
    this.loreGlyph?.setVisible(on);
    if (on) this.loreBtn?.setInteractive({ useHandCursor: true });
    else this.loreBtn?.disableInteractive();
  }

  /** The chips stack leftward from the language one, whatever width it is. */
  private place(): void {
    let x = this.toggle.x - this.toggle.width - 10;
    if (this.logBtn) {
      this.logBtn.setX(x);
      x -= this.logBtn.width + 10;
    }
    if (this.muteBtn) {
      this.muteBtn.setX(x);
      x -= this.muteBtn.width + 10;
    }
    if (this.loreBtn) {
      this.loreBtn.setX(x);
      this.loreGlyph?.setPosition(x - this.loreBtn.width + scaled(34), this.loreBtn.y + this.loreBtn.height / 2);
    }
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
