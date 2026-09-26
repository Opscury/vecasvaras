import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { ui } from '../content/script';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { History } from './History';
import { LorePage, showLoreToast } from './Lore';
import { SettingsPage } from './SettingsPage';
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

/** Fired on the scene when the chips move or change width. */
export const CHROME_MOVED = 'vv-chrome-moved';

const edges = new WeakMap<Phaser.Scene, number>();

/**
 * Where the row of chips begins, from the left — so a line at the top of the
 * frame can keep clear of it. Null in a scene without chips.
 */
export function chromeLeft(scene: Phaser.Scene): number | null {
  return edges.get(scene) ?? null;
}

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
  private setBtn: Phaser.GameObjects.Text;
  private setGlyph: Phaser.GameObjects.Graphics;
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

    // Settings: drawn rather than a glyph, because the gear character comes
    // out as a colour emoji on half the phones this runs on.
    const page = new SettingsPage(scene, { restartOnSize: scene.scene.key === 'Title' });
    this.setBtn = scene.add
      .text(0, margin - 30, '\u2003', CHIP)
      .setOrigin(1, 0)
      .setDepth(900)
      .setInteractive({ useHandCursor: true });
    this.chip(this.setBtn, () => page.toggle());
    this.setGlyph = scene.add.graphics().setDepth(901);
    const k = scaled(1);
    this.setGlyph.lineStyle(2 * k, Palette.parchmentDim, 1);
    [-8, 0, 8].forEach((dy, i) => {
      this.setGlyph.lineBetween(-12 * k, dy * k, 12 * k, dy * k);
      const kx = [-5, 5, -1][i] * k;
      this.setGlyph.fillStyle(Palette.parchmentDim, 1).fillCircle(kx, dy * k, 3.4 * k);
    });
    scene.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && page.isOpen && !wasHandled(ev)) {
        page.close();
        markHandled(ev);
      }
    });

    // Sound. The chip went when the settings page came — its volume slider is
    // the control now, and the top edge only has room for so many chips on a
    // phone. M still mutes.
    if (audio.enabled) {
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
    this.publishEdge();
  }

  /** Tells the rest of the scene where the chips now begin. */
  private publishEdge(): void {
    const scene = this.toggle.scene;
    if (!scene) return;
    const chips = [this.toggle, this.setBtn, this.logBtn, this.muteBtn, this.loreBtn].filter(
      (c): c is Phaser.GameObjects.Text => !!c && c.visible,
    );
    // Every chip hangs from its top-right corner.
    const left = Math.min(...chips.map((c) => c.x - c.width));
    if (edges.get(scene) === left) return;
    if (!edges.has(scene)) scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => edges.delete(scene));
    edges.set(scene, left);
    scene.events.emit(CHROME_MOVED);
  }

  /** The chips stack leftward from the language one, whatever width it is. */
  private place(): void {
    let x = this.toggle.x - this.toggle.width - 10;
    this.setBtn.setX(x);
    this.setGlyph.setPosition(x - this.setBtn.width / 2, this.setBtn.y + this.setBtn.height / 2);
    x -= this.setBtn.width + 10;
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
    this.publishEdge();
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
