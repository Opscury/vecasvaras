import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { Hex, Fonts, Layout, px, scaled } from '../core/theme';
import { CHROME_MOVED, chromeLeft } from './Chrome';

/**
 * The one-line instruction at the top of the frame while the player is meant
 * to act on the world rather than read — "Search. Look the field over.".
 *
 * It holds what it is currently saying as a `Loc`, so a language switch
 * re-renders the line that is actually up, not the first one it ever showed.
 *
 * It is also where a brief remark goes when the narration panel is holding a
 * decision: `flash` says it up here instead of wiping the choices, then puts
 * the standing instruction back.
 */
export class Prompt {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  /** What is on screen now. */
  private shown: Loc | null = null;
  /** The standing instruction, restored after a flash. */
  private standing: Loc | null = null;
  private flashTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.text = scene.add
      .text(Layout.width / 2, scaled(96), '', {
        fontFamily: Fonts.body,
        fontSize: px(23),
        color: Hex.parchment,
        backgroundColor: 'rgba(20,22,26,0.72)',
        padding: { x: scaled(18), y: scaled(9) },
        wordWrap: { width: Layout.width - scaled(560) },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(400)
      .setAlpha(0);

    const off = i18n.onChange(() => {
      if (this.shown) this.put(this.shown);
    });
    const refit = () => this.fit();
    scene.events.on(CHROME_MOVED, refit);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      scene.events.off(CHROME_MOVED, refit);
    });
  }

  show(loc: Loc, duration = 400): void {
    this.cancelFlash();
    this.standing = loc;
    this.put(loc);
    this.fade(1, duration, 'Quad.easeOut');
  }

  hide(duration = 250): void {
    this.cancelFlash();
    this.standing = null;
    this.fade(0, duration, 'Quad.easeIn');
  }

  /** A brief remark, then back to the standing instruction (or nothing). */
  flash(loc: Loc, ms = 2200): void {
    this.cancelFlash();
    this.put(loc);
    this.fade(1, 160, 'Quad.easeOut');
    this.flashTimer = this.scene.time.delayedCall(ms, () => {
      this.flashTimer = null;
      if (this.standing) this.put(this.standing);
      else this.fade(0, 250, 'Quad.easeIn');
    });
  }

  private put(loc: Loc): void {
    this.shown = loc;
    this.text.setText(t(loc));
    this.fit();
  }

  /**
   * Keeps the line clear of the chips in the top-right corner. Centred when
   * it fits; otherwise moved left just far enough, and wrapped narrower only
   * if moving is not enough. On a phone, at one and a half times the type
   * size, the night's instruction used to run under the beliefs chip.
   */
  private fit(): void {
    const full = Layout.width - scaled(560);
    const edge = chromeLeft(this.scene);
    if (edge === null) {
      this.text.setWordWrapWidth(full).setX(Layout.width / 2);
      return;
    }
    const gap = scaled(20);
    const padX = scaled(18);
    const room = edge - gap - Layout.margin;
    this.text.setWordWrapWidth(Math.min(full, room - padX * 2));
    // The object's width includes its padding.
    const half = this.text.width / 2;
    const x = Math.min(Layout.width / 2, edge - gap - half);
    this.text.setX(Math.max(Layout.margin + half, x));
  }

  private cancelFlash(): void {
    this.flashTimer?.remove(false);
    this.flashTimer = null;
  }

  private fade(to: number, duration: number, ease: string): void {
    this.scene.tweens.killTweensOf(this.text);
    this.scene.tweens.add({ targets: this.text, alpha: to, duration, ease });
  }
}
