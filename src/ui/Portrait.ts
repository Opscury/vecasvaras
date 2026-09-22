import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { Fonts, Hex, Layout, Palette, px, scaled } from '../core/theme';
import { CARD } from './keys';
import type { Narration } from './Narration';

/**
 * A painted bust in an oval frame, above the left end of the narration panel,
 * for as long as someone in particular is talking.
 *
 * Anna stands a hundred pixels tall in the yard and the Devil is a figure on a
 * hummock; neither has a face you can read on a phone. The portrait is where
 * their faces are. It nods while a line is typing and goes still when it is
 * done, which is all the lip-sync a painting needs.
 *
 * `eyes`, in the texture's own pixels, gives it eyes that live: a slow glint,
 * and a blink now and then. The Devil has them. Anna does not need them.
 */
const W = 300;
const H = 400;

export interface PortraitOpts {
  key: string;
  name: Loc;
  /** Eye centres in texture pixels, for the glint and the blink. */
  eyes?: Array<{ x: number; y: number }>;
  /** Colour the lids close in — the face's own darkest tone. */
  lid?: number;
  /** A warm or cold light in the eyes. */
  glint?: number;
}

export class Portrait {
  private scene: Phaser.Scene;
  private narration: Narration;
  private root: Phaser.GameObjects.Container;
  private face: Phaser.GameObjects.Image;
  private lids: Phaser.GameObjects.Graphics | null = null;
  private glints: Phaser.GameObjects.Image[] = [];
  private nameText: Phaser.GameObjects.Text;
  private shown = false;
  private blinkAt = 0;
  private opts: PortraitOpts;
  private offLang: () => void;
  /** Frames the panel has been folded away while the portrait was up. */
  private idleFor = 0;

  constructor(scene: Phaser.Scene, narration: Narration, opts: PortraitOpts) {
    this.scene = scene;
    this.narration = narration;
    this.opts = opts;

    const frame = scene.add.graphics();
    // Dark wood, a hair of rye gilt inside it.
    frame.fillStyle(Palette.ink, 0.92).fillEllipse(0, 0, W + 34, H + 34);
    frame.lineStyle(10, Palette.timber, 1).strokeEllipse(0, 0, W + 22, H + 22);
    frame.lineStyle(2, Palette.rye, 0.8).strokeEllipse(0, 0, W + 6, H + 6);
    frame.lineStyle(1, Palette.ryeBright, 0.35).strokeEllipse(0, 0, W + 30, H + 30);

    this.face = scene.add.image(0, 0, opts.key);
    this.face.setScale(W / this.face.width);

    const parts: Phaser.GameObjects.GameObject[] = [frame, this.face];

    if (opts.eyes?.length) {
      const k = this.face.scaleX;
      const cx = this.face.width / 2;
      const cy = this.face.height / 2;
      opts.eyes.forEach((e) => {
        const g = scene.add
          .image((e.x - cx) * k, (e.y - cy) * k, 'fx-blob')
          .setTint(opts.glint ?? 0xffb060)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.22)
          .setAlpha(0);
        this.glints.push(g);
      });
      this.lids = scene.add.graphics();
      parts.push(...this.glints, this.lids);
    }

    this.nameText = scene.add
      .text(0, H / 2 + 26, t(opts.name), {
        fontFamily: Fonts.display,
        fontSize: px(22),
        color: Hex.parchment,
        backgroundColor: 'rgba(20,22,26,0.85)',
        padding: { x: scaled(16), y: scaled(6) },
      })
      .setOrigin(0.5, 0);
    parts.push(this.nameText);

    // Left, standing on the panel's top edge.
    const x = Layout.margin + W / 2 + 10;
    const y = Layout.height - Layout.panelH - H / 2 - 64;
    this.root = scene.add.container(x, y, parts).setDepth(640).setAlpha(0);
    this.root.setVisible(false);

    this.offLang = i18n.onChange(() => this.nameText.setText(t(opts.name)));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    scene.events.on(CARD, this.onCard, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offLang();
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
      scene.events.off(CARD, this.onCard, this);
    });
  }

  get isShown(): boolean {
    return this.shown;
  }

  show(): void {
    if (this.shown) return;
    this.shown = true;
    this.idleFor = 0;
    this.blinkAt = this.scene.time.now + 1800;
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(true).setAlpha(0).setScale(0.94);
    this.scene.tweens.add({ targets: this.root, alpha: 1, scale: 1, duration: 360, ease: 'Back.easeOut' });
    this.glints.forEach((g, i) =>
      this.scene.tweens.add({
        targets: g,
        alpha: { from: 0.1, to: 0.55 },
        duration: 1500 + i * 230,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );
  }

  hide(): void {
    if (!this.shown) return;
    this.shown = false;
    this.scene.tweens.killTweensOf(this.root);
    this.glints.forEach((g) => this.scene.tweens.killTweensOf(g));
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => this.root.setVisible(false),
    });
  }

  private onCard(up: boolean): void {
    if (up) this.hide();
  }

  private tick(time: number): void {
    if (!this.shown) return;
    // The conversation is over once the panel has folded away.
    if (this.narration.idle) {
      if (++this.idleFor > 12) this.hide();
      return;
    }
    this.idleFor = 0;

    // Speaking: a small nod while a line types. Still otherwise.
    const talking = this.narration.isTyping;
    const target = talking ? Math.sin(time / 170) * 1.3 : 0;
    this.face.setAngle(Phaser.Math.Linear(this.face.angle, target, 0.2));
    const bob = talking ? 1 + Math.abs(Math.sin(time / 130)) * 0.012 : 1;
    this.face.setScale(this.face.scaleX, Phaser.Math.Linear(this.face.scaleY, this.face.scaleX * bob, 0.3));

    this.drawLids(time);
  }

  /** A blink every few seconds: the lids close over the eyes and open again. */
  private drawLids(time: number): void {
    const lids = this.lids;
    if (!lids || !this.opts.eyes) return;
    lids.clear();
    if (time < this.blinkAt) return;
    const t0 = time - this.blinkAt;
    const dur = 170;
    if (t0 > dur) {
      this.blinkAt = time + Phaser.Math.Between(2400, 5200);
      return;
    }
    const shut = Math.sin((t0 / dur) * Math.PI);
    const k = this.face.scaleX;
    const cx = this.face.width / 2;
    const cy = this.face.height / 2;
    lids.fillStyle(this.opts.lid ?? 0x120d0c, 1);
    this.opts.eyes.forEach((e) => {
      const x = (e.x - cx) * k;
      const y = (e.y - cy) * k;
      const w = 30 * k;
      const h = 20 * k * shut;
      lids.fillEllipse(x, y - 10 * k + h / 2, w * 1.6, h * 1.6);
      this.glints.forEach((g) => g.setAlpha(g.alpha * (1 - shut)));
    });
  }
}
