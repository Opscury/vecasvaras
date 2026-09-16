import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { reckoning, ui } from '../content/script';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { SignMark, type SignKey } from './Sign';
import { ignoreKey, isAdvanceKey, markHandled } from './keys';

/**
 * The card shown after an encounter resolves, before the player walks home.
 *
 * Sequence, deliberately paced so each beat lands on its own:
 *   1. the scene darkens
 *   2. the mark is carved — whole, or stopping short
 *   3. the verdict lands
 *   4. what you gained
 *   5. (diminished only) what you should have done instead
 *      or (a good outcome with a price) what it cost
 *
 * Step 5 is the one that turns "I have no idea if that was right" into a
 * lesson. It is only ever shown on a poor outcome; telling a player who did
 * well what else they could have done just makes them second-guess a win.
 *
 * The pacing is for the first viewing. A click before the verdict is up does
 * not vanish: it snaps every beat to its end, and the next click moves on — so
 * a player on their third run is held for one click, not four seconds.
 */
export interface ReckoningOpts {
  sign: SignKey;
  good: boolean;
  verdict: Loc;
  gain: Loc;
  missed: Loc | null;
  /** A good outcome that was paid for: the cat, the granary's loaf. */
  cost?: Loc | null;
  onDone: () => void;
}

export class Reckoning {
  private scene: Phaser.Scene;
  private items: Array<Phaser.GameObjects.GameObject> = [];
  private mark: SignMark;
  private texts: Array<{ obj: Phaser.GameObjects.Text; loc: Loc }> = [];
  private veil: Phaser.GameObjects.Rectangle;
  private rule: Phaser.GameObjects.Graphics;
  private go: Phaser.GameObjects.Text;
  private hit: Phaser.GameObjects.Zone;
  private beat: Phaser.Time.TimerEvent | null = null;
  private offLang: () => void;
  private offKey: () => void;
  /** Set once the verdict is on screen; until then a press snaps rather than dismisses. */
  private ready = false;
  private snapped = false;
  private done = false;
  private onDone: () => void;

  constructor(scene: Phaser.Scene, opts: ReckoningOpts) {
    this.scene = scene;
    this.onDone = opts.onDone;
    const { width, height } = Layout;

    this.veil = scene.add
      .rectangle(width / 2, height / 2, width, height, Palette.ink, 0)
      .setDepth(800);
    this.items.push(this.veil);
    scene.tweens.add({ targets: this.veil, fillAlpha: 0.88, duration: 700, ease: 'Sine.easeOut' });

    const heading = this.line(width / 2, height * 0.07, reckoning.title, {
      size: '24px',
      colour: Hex.parchmentDim,
    });
    scene.tweens.add({ targets: heading, alpha: 1, duration: 600, delay: 200, ease: 'Quad.easeOut' });

    this.mark = new SignMark(scene, {
      x: width / 2,
      y: height * 0.31,
      size: 112,
      key: opts.sign,
      complete: opts.good,
      depth: 820,
    });

    // The zone goes up at once, so nothing under the card — the bag, a hotspot,
    // the scene's own click handler — can be clicked through it.
    this.hit = scene.add
      .zone(width / 2, height / 2, width, height)
      .setOrigin(0.5)
      .setDepth(840)
      .setInteractive();
    this.items.push(this.hit);
    this.hit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.press();
    });

    const verdict = this.line(width / 2, height * 0.52, opts.verdict, {
      size: px(46),
      colour: opts.good ? Hex.parchment : Hex.mist,
    });

    const gain = this.line(width / 2, height * 0.52 + scaled(74), opts.gain, {
      size: px(27),
      colour: Hex.parchmentDim,
    });

    const after = gain.y + gain.height + scaled(26);
    const missed = opts.missed
      ? this.line(width / 2, after, opts.missed, {
          size: px(25),
          colour: Hex.rye,
          italic: true,
          wrap: 980,
        })
      : opts.cost
        ? this.line(width / 2, after, opts.cost, {
            size: px(24),
            colour: Hex.mist,
            italic: true,
            wrap: 980,
          })
        : null;

    this.go = scene.add
      .text(width / 2, height * 0.88, t(ui.next) + '  ▸', {
        fontFamily: Fonts.body,
        fontSize: px(26),
        color: Hex.rye,
        backgroundColor: 'rgba(20,22,26,0.6)',
        padding: { x: scaled(22), y: scaled(14) },
      })
      .setOrigin(0.5)
      .setDepth(830)
      .setAlpha(0);
    this.items.push(this.go);

    // A short rule under the mark, drawn only once the mark is finished.
    this.rule = scene.add.graphics().setDepth(820).setAlpha(0);
    this.rule.lineStyle(1, opts.good ? Palette.rye : 0x6a7176, 0.6);
    this.rule.lineBetween(width / 2 - 130, height * 0.455, width / 2 + 130, height * 0.455);
    this.items.push(this.rule);

    // Beat 2 → 5. Each fades up in turn rather than all at once; the pause
    // between the verdict and the missed line is doing real work.
    this.beat = scene.time.delayedCall(500, () => {
      this.beat = null;
      this.mark.carve(scene, () => {
        scene.tweens.add({ targets: this.rule, alpha: 1, duration: 400, ease: 'Quad.easeOut' });
        scene.tweens.add({
          targets: verdict,
          alpha: 1,
          duration: 600,
          delay: 120,
          ease: 'Quad.easeOut',
          // The card cannot be dismissed until the verdict is actually on
          // screen: a player who has been click-advancing narration for a
          // minute will otherwise click straight through their own result.
          onComplete: () => this.setReady(),
        });
        scene.tweens.add({ targets: gain, alpha: 1, duration: 600, delay: 620, ease: 'Quad.easeOut' });
        if (missed) {
          scene.tweens.add({ targets: missed, alpha: 1, duration: 700, delay: 1250, ease: 'Quad.easeOut' });
        }
        scene.tweens.add({
          targets: this.go,
          alpha: 1,
          duration: 500,
          delay: missed ? 2100 : 1400,
          ease: 'Quad.easeOut',
          onComplete: () => this.pulseGo(),
        });
      });
    });

    const onKey = (ev: KeyboardEvent) => {
      if (ignoreKey(scene, ev) || !isAdvanceKey(ev)) return;
      markHandled(ev);
      this.press();
    };
    scene.input.keyboard?.on('keydown', onKey);
    this.offKey = () => scene.input.keyboard?.off('keydown', onKey);

    this.offLang = i18n.onChange(() => {
      this.texts.forEach((x) => x.obj.setText(t(x.loc)));
      this.go.setText(t(ui.next) + '  ▸');
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offLang();
      this.offKey();
    });
  }

  private line(
    x: number,
    y: number,
    loc: Loc,
    o: { size: string; colour: string; italic?: boolean; wrap?: number },
  ): Phaser.GameObjects.Text {
    const obj = this.scene.add
      .text(x, y, t(loc), {
        fontFamily: Fonts.body,
        fontSize: o.size,
        color: o.colour,
        align: 'center',
        fontStyle: o.italic ? 'italic' : 'normal',
        wordWrap: { width: o.wrap ?? 1300 },
        lineSpacing: scaled(8),
      })
      .setOrigin(0.5, 0)
      .setDepth(825)
      .setAlpha(0);
    this.items.push(obj);
    this.texts.push({ obj, loc });
    return obj;
  }

  private setReady(): void {
    this.ready = true;
    if (this.hit.input) this.hit.input.cursor = 'pointer';
  }

  private pulseGo(): void {
    this.scene.tweens.add({
      targets: this.go,
      alpha: 0.35,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** A click or key on the card. */
  private press(): void {
    if (this.done) return;
    if (this.ready) {
      this.finish();
      return;
    }
    if (this.snapped) return;
    this.snap();
  }

  /** Everything to its end state at once: the whole mark, every line, the arrow. */
  private snap(): void {
    this.snapped = true;
    this.beat?.remove(false);
    this.beat = null;
    this.mark.snap();
    const parts = [this.veil, this.rule, this.go, ...this.texts.map((x) => x.obj)];
    this.scene.tweens.killTweensOf(parts);
    this.veil.setFillStyle(Palette.ink, 0.88);
    [this.rule, this.go, ...this.texts.map((x) => x.obj)].forEach((o) => o.setAlpha(1));
    this.pulseGo();
    // A short beat before the next press counts, so one double-click cannot
    // both snap the card and dismiss it unread.
    this.scene.time.delayedCall(450, () => this.setReady());
  }

  private finish(): void {
    this.done = true;
    this.offKey();
    // The mark fades with the rest of the card rather than holding at full
    // strength and vanishing in a single frame.
    const marks = this.mark.parts;
    this.scene.tweens.killTweensOf([...this.items, ...marks]);
    const targets = [...this.items, ...marks];
    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.mark.destroy();
        this.items.forEach((o) => o.destroy());
        this.onDone();
      },
    });
  }
}
