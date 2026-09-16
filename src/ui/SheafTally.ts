import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { FULL_CART, HEAVY_SHEAF } from '../core/rules';
import { audio } from '../core/audio';

/**
 * The harvest, counted as it comes down.
 *
 * Leaving the field its share used to cost nothing the player could see: the
 * double ear's patch was protected for them and the greedy option was worse
 * in every way at once. Now each sheaf pops up here as it is cut, and leaving
 * the patch standing means walking home a sheaf short — by your own hand, in
 * front of you. That is what a tithe is.
 *
 * The same row is the cart in Anna's yard, where it is threshed into the
 * bread the village actually keeps.
 *
 * Optionally carries the "That will do" button, which is how the player ends
 * the harvest.
 */

const SLOTS = FULL_CART + HEAVY_SHEAF;
const PITCH = 20;
const GLYPH_W = 13;
const GLYPH_H = 26;

export class SheafTally {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private count: Phaser.GameObjects.Text;
  private glyphs: Phaser.GameObjects.Graphics[] = [];
  private enough: Phaser.GameObjects.Text | null = null;
  private enoughOn = false;
  private n = 0;
  private title: Loc;
  private offLang: () => void;
  private shown = false;

  constructor(scene: Phaser.Scene, opts: { title: Loc; y?: number; enough?: { label: Loc; onPress: () => void } }) {
    this.scene = scene;
    this.title = opts.title;

    this.plate = scene.add.graphics();
    this.label = scene.add.text(0, 0, t(opts.title).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: px(17),
      color: Hex.parchmentDim,
    });
    this.label.setLetterSpacing?.(scaled(2));
    this.count = scene.add
      .text(0, 0, '0', { fontFamily: Fonts.display, fontSize: px(24), color: Hex.rye })
      .setOrigin(1, 0.5);
    for (let i = 0; i < SLOTS; i++) this.glyphs.push(scene.add.graphics().setAlpha(0));

    const parts: Phaser.GameObjects.GameObject[] = [this.plate, this.label, this.count, ...this.glyphs];

    if (opts.enough) {
      const e = scene.add
        .text(0, 0, '✓  ' + t(opts.enough.label), {
          fontFamily: Fonts.body,
          fontSize: px(22),
          color: Hex.parchment,
          backgroundColor: 'rgba(107,88,66,0.85)',
          padding: { x: scaled(18), y: scaled(12) },
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);
      e.on('pointerover', () => {
        audio.play('hover');
        e.setColor(Hex.ryeBright);
      });
      e.on('pointerout', () => e.setColor(Hex.parchment));
      e.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
        ev?.stopPropagation?.();
        if (!this.enoughOn) return;
        audio.play('click');
        opts.enough!.onPress();
      });
      this.enough = e;
      parts.push(e);
    }

    this.root = scene.add
      .container(Layout.width / 2, opts.y ?? scaled(170), parts)
      .setDepth(420)
      .setAlpha(0);

    this.offLang = i18n.onChange(() => {
      this.label.setText(t(this.title).toUpperCase());
      if (this.enough && opts.enough) this.enough.setText('✓  ' + t(opts.enough.label));
      this.layout();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());

    this.layout();
  }

  get value(): number {
    return this.n;
  }

  /** Screen bounds of the "That will do" button, for the keyboard and for held items. */
  enoughContains(x: number, y: number): boolean {
    if (!this.enough || !this.enoughOn) return false;
    const b = this.enough.getBounds();
    return b.contains(x, y);
  }

  get enoughCenter(): { x: number; y: number } | null {
    if (!this.enough) return null;
    const b = this.enough.getBounds();
    return { x: b.centerX, y: b.centerY };
  }

  show(duration = 400): void {
    if (this.shown) return;
    this.shown = true;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration, ease: 'Quad.easeOut' });
  }

  hide(duration = 300): void {
    if (!this.shown) return;
    this.shown = false;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration, ease: 'Quad.easeIn' });
  }

  /** Offers — or withdraws — the button that ends the harvest. */
  setEnough(on: boolean): void {
    if (!this.enough || on === this.enoughOn) return;
    this.enoughOn = on;
    this.scene.tweens.killTweensOf(this.enough);
    if (on) {
      this.enough.setInteractive({ useHandCursor: true });
      this.enough.setAlpha(0).setScale(0.85);
      this.scene.tweens.add({ targets: this.enough, alpha: 1, scale: 1, duration: 360, ease: 'Back.easeOut' });
    } else {
      this.enough.disableInteractive();
      this.scene.tweens.add({ targets: this.enough, alpha: 0, duration: 200, ease: 'Quad.easeIn' });
    }
    this.layout();
  }

  /**
   * Sets the count. New sheaves pop in one after another; a jump of more than
   * one (the double ear's patch) gets a bigger pop. Fewer — threshing — is
   * `thresh`'s job, not this.
   */
  set(n: number, animate = true): void {
    const from = this.n;
    this.n = Math.max(0, Math.min(SLOTS, n));
    this.count.setText(String(this.n));
    this.layout();
    this.glyphs.forEach((g, i) => {
      const on = i < this.n;
      this.scene.tweens.killTweensOf(g);
      if (!on) {
        g.setAlpha(0);
        return;
      }
      const heavy = i >= FULL_CART;
      this.paintGlyph(g, heavy);
      if (!animate || i < from) {
        g.setAlpha(1).setScale(1);
        return;
      }
      const k = i - from;
      g.setAlpha(0).setScale(heavy ? 0.3 : 0.5);
      this.scene.tweens.add({
        targets: g,
        alpha: 1,
        scale: 1,
        duration: heavy ? 520 : 320,
        delay: k * 90,
        ease: 'Back.easeOut',
        onStart: () => audio.play('sheaf', { volume: heavy ? 0.6 : 0.4 }),
      });
    });
    if (animate && this.n > from) {
      this.scene.tweens.add({
        targets: this.count,
        scale: { from: 1.35, to: 1 },
        duration: 260,
        ease: 'Quad.easeOut',
      });
    }
  }

  /**
   * The cart threshed into bread: every sheaf lifts off and flies to `to`,
   * and only `keep` of them arrive — the rest crumble into chaff on the way.
   * `onLoaf(i)` fires as each surviving one lands; `done` when it is over.
   */
  thresh(to: { x: number; y: number }, keep: number, onLoaf: (i: number) => void, done: () => void): void {
    const n = this.n;
    if (n === 0) {
      done();
      return;
    }
    // Which sheaves make it: spread across the row, so the loss reads as the
    // whole cart being light rather than the end of it falling off.
    const survivors = new Set<number>();
    for (let k = 0; k < Math.min(keep, n); k++) survivors.add(Math.round(((k + 0.5) * n) / Math.max(1, keep) - 0.5));
    let landed = 0;
    let finished = 0;
    for (let i = 0; i < n; i++) {
      const g = this.glyphs[i];
      const start = g.getWorldTransformMatrix();
      const sx = start.tx;
      const sy = start.ty;
      const fly = this.scene.add.graphics().setDepth(960).setPosition(sx, sy);
      this.paintGlyph(fly, i >= FULL_CART);
      g.setAlpha(0);
      const lives = survivors.has(i);
      const delay = i * 110;
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: lives ? 620 : 520,
        delay,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          const v = tw.getValue() ?? 0;
          if (lives) {
            fly.setPosition(Phaser.Math.Linear(sx, to.x, v), Phaser.Math.Linear(sy, to.y, v) - Math.sin(v * Math.PI) * 80);
            fly.setScale(1 - 0.35 * v);
          } else {
            // Chaff: drifts a little way and blows apart.
            fly.setPosition(sx + v * 60, sy + v * 30 - Math.sin(v * Math.PI) * 30);
            fly.setAlpha(1 - v);
            fly.setScale(1 + v * 0.6, 1 - v * 0.7);
          }
        },
        onComplete: () => {
          fly.destroy();
          if (lives) onLoaf(landed++);
          if (++finished === n) {
            this.n = 0;
            this.count.setText('0');
            done();
          }
        },
      });
      if (!lives) this.chaff(sx, sy, delay);
    }
  }

  /** A puff of dust where a sheaf came to nothing. */
  private chaff(x: number, y: number, delay: number): void {
    for (let k = 0; k < 5; k++) {
      const d = this.scene.add
        .rectangle(x, y, scaled(3), scaled(3), Palette.rye, 0.9)
        .setDepth(961)
        .setAlpha(0);
      this.scene.tweens.add({
        targets: d,
        alpha: { from: 0.9, to: 0 },
        x: x + Phaser.Math.Between(10, 80),
        y: y + Phaser.Math.Between(-30, 40),
        duration: Phaser.Math.Between(500, 800),
        delay: delay + 250,
        ease: 'Quad.easeOut',
        onComplete: () => d.destroy(),
      });
    }
  }

  /** A bound sheaf, drawn: ears fanned at the top, a band, stalks below. */
  private paintGlyph(g: Phaser.GameObjects.Graphics, heavy: boolean): void {
    const w = scaled(GLYPH_W) * (heavy ? 1.25 : 1);
    const h = scaled(GLYPH_H) * (heavy ? 1.15 : 1);
    const colour = heavy ? Palette.ryeBright : Palette.rye;
    g.clear();
    g.fillStyle(colour, 1);
    // ears
    g.fillTriangle(-w / 2, -h / 2, w / 2, -h / 2, 0, -h * 0.04);
    // stalks
    g.fillTriangle(-w * 0.38, h / 2, w * 0.38, h / 2, 0, h * 0.02);
    // the band
    g.fillStyle(Palette.timber, 1);
    g.fillRect(-w * 0.22, -h * 0.07, w * 0.44, h * 0.14);
    if (heavy) {
      g.lineStyle(1, 0xfff0c8, 0.9);
      g.strokeTriangle(-w / 2, -h / 2, w / 2, -h / 2, 0, -h * 0.04);
    }
  }

  private layout(): void {
    const padX = scaled(18);
    const glyphLeft = padX + this.label.width + scaled(18);
    const rowW = SLOTS * scaled(PITCH);
    const numW = scaled(34);
    const w = glyphLeft + rowW + scaled(10) + numW + padX;
    const h = scaled(52);
    const left = -w / 2;

    this.label.setPosition(left + padX, -this.label.height / 2);
    this.glyphs.forEach((g, i) => g.setPosition(left + glyphLeft + scaled(PITCH) * (i + 0.5), 0));
    this.count.setPosition(left + w - padX, 0);

    this.plate
      .clear()
      .fillStyle(Palette.ink, 0.66)
      .fillRoundedRect(left, -h / 2, w, h, scaled(8))
      .lineStyle(1, Palette.rye, 0.3)
      .strokeRoundedRect(left, -h / 2, w, h, scaled(8));
    // The two heavy slots sit a little apart, so the row reads as "the field,
    // and then the double ear's patch".
    this.plate.lineStyle(1, Palette.timberLight, 0.5);
    const sep = left + glyphLeft + scaled(PITCH) * FULL_CART;
    this.plate.lineBetween(sep, -h * 0.3, sep, h * 0.3);

    if (this.enough) this.enough.setPosition(w / 2 + scaled(16), 0);
  }
}
