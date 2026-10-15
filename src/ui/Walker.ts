import Phaser from 'phaser';
import { Layout, Palette } from '../core/theme';
import type { Painting } from './Painting';
import { WALK_ANIM, WALK_STAND } from '../scenes/assets';
import { heightAt, type Pt } from '../scenes/villageGround';
import type { Gender } from '../core/state';

/** Ground covered per second by someone drawn Anna's height (104 px). */
const PACE = 200;
/** A second click on where you are already going: hurry. */
const HURRY = 1.8;
/** Frame height of the walk sheets, minus the few pixels of air above the head. */
const SHEET_FIGURE_H = 236;
/** How long a footprint stays in the dust. */
const PRINT_MS = 7000;

export interface WalkOpts {
  /** Called on arrival — not if the walk is replaced by another first. */
  onArrive?: () => void;
  /** Which way to face once there, if it matters (towards whoever is spoken to). */
  face?: 'left' | 'right';
  hurry?: boolean;
}

/**
 * The player, in the village: walks where they are sent and leaves prints in
 * the dust behind them.
 *
 * Lives inside the painting, so the wind and the slow drift move them with
 * the ground. Positions are in the painting's 1920x1080 screen space.
 */
export class Walker {
  readonly sprite: Phaser.GameObjects.Sprite;
  private shade: Phaser.GameObjects.Graphics;
  private path: Pt[] = [];
  private opts: WalkOpts = {};
  private hurrying = false;
  private pos: Pt;
  private sincePrint = 0;
  private printSide = 1;
  private evening: boolean;

  constructor(
    private scene: Phaser.Scene,
    private painting: Painting,
    private gender: Gender,
    at: Pt,
    opts: { facing?: 'left' | 'right'; evening?: boolean } = {},
  ) {
    this.pos = { ...at };
    this.evening = opts.evening ?? false;
    // A soft patch of shade where they meet the ground, as under Anna. Drawn
    // at unit size and scaled with the walker.
    this.shade = painting.add(scene.add.graphics({ x: at.x, y: at.y }));
    this.shade.fillStyle(Palette.ink, 0.28).fillEllipse(0, 0, 1, 0.24);
    this.sprite = painting.add(scene.add.sprite(at.x, at.y, `walk-${gender}`, WALK_STAND[gender]).setOrigin(0.5, 1));
    this.sprite.setTint(this.evening ? 0xb4b6bc : 0xdcd8cf);
    this.sprite.setFlipX(opts.facing === 'left');
    this.place();
  }

  /** Where the player is standing, in screen space. */
  get at(): Pt {
    return { ...this.pos };
  }

  get walking(): boolean {
    return this.path.length > 0;
  }

  /**
   * Sets off along `route`. A new walk replaces the one under way — its
   * arrival never fires — and a repeat of the same destination hurries.
   */
  walkTo(route: Pt[], opts: WalkOpts = {}): void {
    const end = route[route.length - 1];
    const was = this.path[this.path.length - 1];
    const same = !!was && !!end && Math.hypot(was.x - end.x, was.y - end.y) < 30;
    this.hurrying = opts.hurry ?? (same ? true : this.walking && this.hurrying);
    this.path = route.filter((p, i) => i > 0 || Math.hypot(p.x - this.pos.x, p.y - this.pos.y) > 2);
    this.opts = opts;
    // The screenshot harness steps the clock by hand and scripts its clicks
    // with fixed waits; there the player arrives at once.
    if ((window as unknown as { __vvInstantWalk?: boolean }).__vvInstantWalk && this.path.length) {
      this.pos = { ...this.path[this.path.length - 1] };
      this.path = [];
      this.place();
    }
    if (!this.path.length) {
      this.arrive();
      return;
    }
    this.sprite.play({ key: WALK_ANIM[this.gender], frameRate: 16 * (this.hurrying ? 1.5 : 1) }, true);
  }

  /** Stops where they stand, dropping whatever they were walking to. */
  halt(): void {
    this.path = [];
    this.opts = {};
    this.standStill();
  }

  /** Turns to face a point without moving. */
  faceTowards(x: number): void {
    this.sprite.setFlipX(x < this.pos.x);
  }

  update(dtMs: number): void {
    if (!this.path.length) return;
    const h = heightAt(this.pos.y);
    let left = (PACE * (h / 104) * (this.hurrying ? HURRY : 1) * dtMs) / 1000;
    while (left > 0 && this.path.length) {
      const next = this.path[0];
      const dx = next.x - this.pos.x;
      const dy = next.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0);
      if (d <= left) {
        this.pos = { ...next };
        this.path.shift();
        left -= d;
        this.stepped(d, h);
      } else {
        this.pos = { x: this.pos.x + (dx / d) * left, y: this.pos.y + (dy / d) * left };
        this.stepped(left, h);
        left = 0;
      }
    }
    this.place();
    if (!this.path.length) this.arrive();
  }

  destroy(): void {
    this.sprite.destroy();
    this.shade.destroy();
  }

  // ---------------------------------------------------------------------------

  private arrive(): void {
    const { onArrive, face } = this.opts;
    this.opts = {};
    this.standStill();
    if (face) this.sprite.setFlipX(face === 'left');
    onArrive?.();
  }

  private standStill(): void {
    this.sprite.stop();
    this.sprite.setFrame(WALK_STAND[this.gender]);
    this.hurrying = false;
  }

  private place(): void {
    const h = heightAt(this.pos.y);
    this.painting.setScreenPosition(this.sprite, this.pos.x, this.pos.y);
    this.sprite.setScale(h / SHEET_FIGURE_H);
    this.painting.setScreenPosition(this.shade, this.pos.x, this.pos.y - 1);
    this.shade.setScale(h * 0.4);
  }

  /** A print every half stride, left and right of the line walked. */
  private stepped(d: number, h: number): void {
    this.sincePrint += d;
    const every = h * 0.42;
    if (this.sincePrint < every) return;
    this.sincePrint = 0;
    this.printSide *= -1;
    this.print(h);
  }

  private print(h: number): void {
    const root = this.painting.root;
    const facingLeft = this.sprite.flipX;
    const x = this.pos.x + (facingLeft ? 4 : -4);
    const y = this.pos.y + this.printSide * h * 0.025;
    const mark = this.scene.add.graphics();
    mark.fillStyle(this.evening ? 0x2a2620 : 0x4a3f30, this.evening ? 0.5 : 0.42).fillEllipse(0, 0, h * 0.1, h * 0.04);
    mark.setPosition(x - Layout.width / 2, y - Layout.height / 2);
    // Under the walker and their shade, over the ground.
    root.addAt(mark, Math.max(0, root.getIndex(this.shade)));
    this.scene.tweens.add({ targets: mark, alpha: 0, delay: PRINT_MS * 0.4, duration: PRINT_MS * 0.6, onComplete: () => mark.destroy() });
  }
}
