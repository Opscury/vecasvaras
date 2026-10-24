import Phaser from 'phaser';
import { i18n, t } from '../core/i18n';
import { beloved } from '../content/beloved';
import { BOND_MAX, state } from '../core/state';
import { once } from '../core/once';
import { Fonts, Hex, Layout, Palette, px, scaled } from '../core/theme';

/**
 * How close the player has come to Ilze or Krišs: a woven band of five knots
 * under the objective, filled one by one. It only appears once they have met.
 *
 * The first time a knot fills it says, once, what it is. A row of five knots
 * with a name over it is not self-explanatory — the family playtest read it
 * as a score — and one line is enough: «Saticība — cik tuvu esat.»
 */

/** The line under the ribbon folds away again after this long. */
const NOTE_MS = 6000;

/** Marked when the line has been said; `state.reset` forgets it, so it is once a run. */
const BOND_NOTE_KEY = 'bondWhat';
export class BondRibbon {
  private root: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private knots: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  /** The one-off line saying what the band is. */
  private note: Phaser.GameObjects.Text;
  private noteUp = false;
  private shown = -1;
  private met = false;
  /** A change not yet seen: shown as soon as the ribbon is back in view. */
  private pending = false;

  constructor(
    private scene: Phaser.Scene,
    private below: () => number,
    /** True while something else wants that corner — a face beside the panel. */
    private quiet: () => boolean = () => false,
  ) {
    this.plate = scene.add.graphics();
    this.knots = scene.add.graphics();
    this.label = scene.add.text(scaled(18), scaled(10), '', {
      fontFamily: Fonts.body,
      fontSize: px(17),
      color: Hex.rye,
    });
    this.label.setLetterSpacing?.(scaled(2));
    this.note = scene.add
      .text(scaled(18), 0, '', {
        fontFamily: Fonts.body,
        fontSize: px(17),
        color: Hex.parchmentDim,
        fontStyle: 'italic',
        wordWrap: { width: scaled(420) },
      })
      .setAlpha(0)
      .setVisible(false);
    this.root = scene.add
      .container(Layout.margin - scaled(24), below() + scaled(10), [this.plate, this.label, this.knots, this.note])
      .setDepth(880)
      .setAlpha(0);
    const off = i18n.onChange(() => this.redraw(this.shown));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.follow, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.follow, this);
    });
    this.refresh(false);
  }

  /** Re-reads the bond; a change is shown knot by knot. */
  refresh(animate = true): void {
    const run = state.get();
    this.met = run.talks.includes('meet');
    if (!this.met) {
      this.root.setAlpha(0);
      return;
    }
    const was = this.shown;
    const now = run.bond;
    this.redraw(now);
    if (now !== was && was >= 0 && animate) this.pending = true;
    this.shown = now;
    // The first knot of the run — whether it fills in front of the player or
    // arrives with the ribbon itself, which is what the first talk does.
    if (animate && now > 0 && once.mark(BOND_NOTE_KEY)) this.sayWhat();
  }

  /** What the band is, said once and then folded away. */
  private sayWhat(): void {
    this.noteUp = true;
    this.redraw(this.shown);
    this.scene.tweens.killTweensOf(this.note);
    this.scene.tweens.add({ targets: this.note, alpha: 1, duration: 420, delay: 500, ease: 'Quad.easeOut' });
    this.scene.time.delayedCall(NOTE_MS, () => {
      this.scene.tweens.add({
        targets: this.note,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.noteUp = false;
          this.redraw(this.shown);
        },
      });
    });
  }

  private follow(_t: number, dt: number): void {
    this.root.y = this.below() + scaled(10);
    // Out of the way while a face is up beside the panel; back after.
    const want = this.met && !this.quiet() ? 1 : 0;
    const a = this.root.alpha;
    if (a !== want) this.root.setAlpha(Phaser.Math.Clamp(a + Math.sign(want - a) * (dt / 250), 0, 1));
    if (this.pending && this.root.alpha === 1) {
      this.pending = false;
      this.scene.tweens.add({ targets: this.root, scale: { from: 1.14, to: 1 }, duration: 560, ease: 'Back.easeOut' });
    }
  }

  private redraw(n: number): void {
    this.label.setText(`${t(beloved.ribbon).toUpperCase()} · ${t(beloved.name)}`);
    const size = scaled(13);
    const gap = scaled(9);
    const y = this.label.y + this.label.height + scaled(10) + size;
    this.knots.clear();
    for (let i = 0; i < BOND_MAX; i++) {
      const cx = scaled(18) + size + i * (size * 2 + gap);
      // The band itself, under the knots.
      if (i < BOND_MAX - 1) {
        this.knots.lineStyle(scaled(3), Palette.rye, 0.35).lineBetween(cx + size, y, cx + size + gap, y);
      }
      const pts = [
        new Phaser.Math.Vector2(cx, y - size),
        new Phaser.Math.Vector2(cx + size, y),
        new Phaser.Math.Vector2(cx, y + size),
        new Phaser.Math.Vector2(cx - size, y),
      ];
      if (i < n) {
        this.knots.fillStyle(0xb8564a, 1).fillPoints(pts, true);
        this.knots.lineStyle(scaled(2), Palette.rye, 0.9).strokePoints(pts, true);
      } else {
        this.knots.lineStyle(scaled(2), Palette.rye, 0.45).strokePoints(pts, true);
      }
    }
    this.note.setText(t(beloved.ribbonNote)).setY(y + size + scaled(12)).setVisible(this.noteUp);
    const w = Math.max(
      this.label.width + scaled(36),
      scaled(18) * 2 + BOND_MAX * (size * 2 + gap) - gap,
      this.noteUp ? this.note.width + scaled(36) : 0,
    );
    const h = this.noteUp ? this.note.y + this.note.height + scaled(14) : y + size + scaled(14);
    this.plate.clear();
    this.plate.fillStyle(Palette.ink, 0.62).fillRoundedRect(0, 0, w, h, scaled(8));
    this.plate.lineStyle(1, Palette.rye, 0.35).strokeRoundedRect(0, 0, w, h, scaled(8));
  }
}
