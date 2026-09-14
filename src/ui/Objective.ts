import Phaser from 'phaser';
import { i18n, t } from '../core/i18n';
import { objectives } from '../content/elder';
import { currentStep, objectiveFor, type StepId } from '../core/quest';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';

/**
 * One line in the top-left corner saying what to do next.
 *
 * The game's entire answer to "what now" used to be a single narration line
 * that flashed once and was gone. The first playtester lost it the moment she
 * clicked anything, and from then on had no way back to it — she knew she had
 * a sickle and no idea what it was for. This is the standing answer.
 *
 * It reads the quest step rather than being told, so it can never claim
 * something different from what the exits will actually allow.
 */
export class Objective {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private heading: Phaser.GameObjects.Text;
  private line: Phaser.GameObjects.Text;
  private step: StepId | null = null;
  private offLang: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { margin } = Layout;

    this.plate = scene.add.graphics();

    this.heading = scene.add.text(scaled(18), scaled(12), t(objectives.heading).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: px(17),
      color: Hex.rye,
    });
    this.heading.setLetterSpacing?.(scaled(3));

    this.line = scene.add.text(scaled(18), scaled(40), '', {
      fontFamily: Fonts.body,
      fontSize: px(25),
      color: Hex.parchment,
      wordWrap: { width: scaled(520) },
      lineSpacing: scaled(4),
    });

    // Left edge, below the browser's own fullscreen button, which sits in the
    // page's top-left corner outside the canvas and overlaps it on a phone.
    this.root = scene.add
      .container(margin - scaled(24), margin + scaled(4), [this.plate, this.heading, this.line])
      .setDepth(880)
      .setAlpha(0);

    this.offLang = i18n.onChange(() => {
      this.heading.setText(t(objectives.heading).toUpperCase());
      this.redraw();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());

    this.refresh(true);
  }

  /**
   * Re-reads the quest step. Cheap, and safe to call after anything that could
   * have moved the run on — which is why the scenes just call it rather than
   * reasoning about whether it was needed.
   */
  refresh(instant = false): void {
    const step = currentStep();
    if (step === this.step) return;
    const first = this.step === null;
    this.step = step;
    this.redraw();

    if (instant || first) {
      this.scene.tweens.killTweensOf(this.root);
      this.root.setAlpha(1);
      return;
    }
    // A changed objective is the game answering something the player just did,
    // so it gets a beat of attention rather than silently swapping text.
    this.scene.tweens.killTweensOf(this.root);
    this.root.setAlpha(0.2);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 420, ease: 'Quad.easeOut' });
  }

  private redraw(): void {
    if (!this.step) return;
    this.line.setText(t(objectiveFor(this.step)));
    const w = Math.max(this.heading.width, this.line.width) + scaled(36);
    const h = this.line.y + this.line.height + scaled(14);
    this.plate.clear();
    this.plate.fillStyle(Palette.ink, 0.62).fillRoundedRect(0, 0, w, h, scaled(8));
    this.plate.lineStyle(1, Palette.rye, 0.35).strokeRoundedRect(0, 0, w, h, scaled(8));
  }
}
