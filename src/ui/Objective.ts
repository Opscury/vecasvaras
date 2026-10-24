import Phaser from 'phaser';
import { i18n, t } from '../core/i18n';
import { objectiveUi } from '../content/elder';
import { once } from '../core/once';
import { currentStep, signpostFor, type StepId } from '../core/quest';
import { audio } from '../core/audio';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';

/**
 * One line in the top-left corner saying what to do next, and under it, on a
 * tap, why.
 *
 * The game's entire answer to "what now" used to be a single narration line
 * that flashed once and was gone. The first playtester lost it the moment she
 * clicked anything, and from then on had no way back to it — she knew she had
 * a sickle and no idea what it was for. This is the standing answer.
 *
 * The line is short enough to read without stopping, which means it cannot
 * also carry the reason. So the reason is a second line, folded away until it
 * is asked for: a tap opens it, a tap or six seconds closes it. A player who
 * knows what they are doing never sees it; one who has put the game down for
 * a week gets it back in one touch. Until a reason has been opened once, a
 * small line says the corner can be asked — after that it never appears again.
 *
 * It reads the quest step rather than being told, so it can never claim
 * something different from what the exits will actually allow.
 */

/** The reason folds itself away again after this long unread. */
const WHY_MS = 6000;

/** Marked once a player has opened a reason, which retires the hint. */
const HINT_KEY = 'objWhy';

export class Objective {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private heading: Phaser.GameObjects.Text;
  private line: Phaser.GameObjects.Text;
  /** The reason, under the line, while it is open. */
  private why: Phaser.GameObjects.Text;
  /** The one-off "touch to see why", until a reason has been opened once. */
  private hint: Phaser.GameObjects.Text;
  /** The tap target, sized to the plate — the words are far too small to aim at. */
  private zone: Phaser.GameObjects.Zone;
  private step: StepId | null = null;
  private showingWhy = false;
  private whyTimer: Phaser.Time.TimerEvent | null = null;
  private offLang: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { margin } = Layout;

    this.plate = scene.add.graphics();

    this.heading = scene.add.text(scaled(18), scaled(12), t(objectiveUi.heading).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: px(19),
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

    this.why = scene.add
      .text(scaled(18), 0, '', {
        fontFamily: Fonts.body,
        fontSize: px(20),
        color: Hex.parchmentDim,
        fontStyle: 'italic',
        wordWrap: { width: scaled(520) },
        lineSpacing: scaled(3),
      })
      .setAlpha(0);

    this.hint = scene.add
      .text(scaled(18), 0, t(objectiveUi.tapForWhy), {
        fontFamily: Fonts.body,
        fontSize: px(16),
        color: Hex.mist,
        fontStyle: 'italic',
      })
      .setAlpha(0);

    this.zone = scene.add.zone(0, 0, 10, 10).setOrigin(0, 0);
    this.zone.setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0) return;
      audio.play('click', { volume: 0.3 });
      this.toggleWhy();
    });

    // Left edge, below the browser's own fullscreen button, which sits in the
    // page's top-left corner outside the canvas and overlaps it on a phone.
    this.root = scene.add
      .container(margin - scaled(24), margin + scaled(4), [
        this.plate,
        this.zone,
        this.heading,
        this.line,
        this.why,
        this.hint,
      ])
      .setDepth(880)
      .setAlpha(0);

    this.offLang = i18n.onChange(() => {
      this.heading.setText(t(objectiveUi.heading).toUpperCase());
      this.hint.setText(t(objectiveUi.tapForWhy));
      this.redraw();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());

    this.refresh(true);
  }

  /** Screen y of the panel's bottom edge, so the next thing can sit under it. */
  get bottom(): number {
    const last = this.lowest;
    return this.root.y + last.y + last.height + scaled(14);
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
    // A new errand is a new reason; whatever was open belonged to the old one.
    this.foldWhy();
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

  /** True while the one-off hint is standing in for the reason. */
  private get hintUp(): boolean {
    return !this.showingWhy && !once.has(HINT_KEY);
  }

  /** Whichever line is currently the bottom one on the plate. */
  private get lowest(): Phaser.GameObjects.Text {
    if (this.showingWhy) return this.why;
    return this.hintUp ? this.hint : this.line;
  }

  private toggleWhy(): void {
    if (this.showingWhy) {
      this.foldWhy();
      return;
    }
    // Asking once is enough to know the corner can be asked.
    once.mark(HINT_KEY);
    this.showingWhy = true;
    this.redraw();
    this.scene.tweens.killTweensOf(this.why);
    this.scene.tweens.add({ targets: this.why, alpha: 1, duration: 220, ease: 'Quad.easeOut' });
    this.whyTimer?.remove();
    this.whyTimer = this.scene.time.delayedCall(WHY_MS, () => this.foldWhy());
  }

  private foldWhy(): void {
    this.whyTimer?.remove();
    this.whyTimer = null;
    if (!this.showingWhy) return;
    this.showingWhy = false;
    this.scene.tweens.killTweensOf(this.why);
    this.why.setAlpha(0);
    this.redraw();
  }

  private redraw(): void {
    if (!this.step) return;
    const signpost = signpostFor(this.step);
    this.line.setText(t(signpost.line));
    this.why.setText(t(signpost.why));

    // Stacked by measured height: Latvian and English wrap differently, and
    // the large text setting changes both.
    const top = this.line.y + this.line.height + scaled(8);
    this.why.setY(top).setVisible(this.showingWhy);
    this.hint.setY(top).setVisible(this.hintUp).setAlpha(this.hintUp ? 1 : 0);

    const w =
      Math.max(
        this.heading.width,
        this.line.width,
        this.showingWhy ? this.why.width : 0,
        this.hintUp ? this.hint.width : 0,
      ) + scaled(36);
    const bottom = this.lowest;
    const h = bottom.y + bottom.height + scaled(14);
    this.plate.clear();
    this.plate.fillStyle(Palette.ink, 0.62).fillRoundedRect(0, 0, w, h, scaled(8));
    this.plate.lineStyle(1, Palette.rye, 0.35).strokeRoundedRect(0, 0, w, h, scaled(8));
    // The zone is the plate: both the size and the hit rectangle, which Phaser
    // keeps separately and does not resize with the object.
    this.zone.setSize(w, h);
    const hit = this.zone.input?.hitArea as Phaser.Geom.Rectangle | undefined;
    hit?.setTo(0, 0, w, h);
  }
}
