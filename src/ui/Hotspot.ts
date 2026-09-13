import Phaser from 'phaser';
import { type Loc, t, i18n } from '../core/i18n';
import { Hex, Fonts, Palette } from '../core/theme';
import { audio } from '../core/audio';

/**
 * A clickable region on a painted background.
 *
 * There is no cursor sprite and no walking — the whole game is "look at the
 * picture, notice a thing, click it" — so the hotspot has to advertise itself
 * on hover without ruining the painting. It does that with a soft ring and a
 * floating label, both of which fade rather than pop.
 */

export interface HotspotOpts {
  x: number;
  y: number;
  /** Radius of the clickable circle. */
  r?: number;
  /** Or an explicit rectangle instead of a circle. */
  w?: number;
  h?: number;
  label: Loc;
  onClick: () => void;
  /** Hidden hotspots take a click but show no ring until found (search puzzles). */
  discreet?: boolean;
  /**
   * Return false to let the click fall through to the scene untouched.
   *
   * This matters more than it looks. A game object calling stopPropagation()
   * makes Phaser skip the scene-level pointerdown entirely — so a hotspot that
   * swallows a click also silently disables the bag's "use the held item here"
   * handler sitting underneath it. Guarding BEFORE stopPropagation is the only
   * way to have both.
   */
  guard?: () => boolean;
}

/**
 * Ring and label sit ABOVE the narration panel (500). Half the clickable world
 * is in the bottom third of these paintings, and a ring drawn under a
 * 90%-opaque plate is no ring at all. They only appear on hover or focus, so
 * they cannot clutter the text.
 */
const RING_DEPTH = 520;
const TAG_DEPTH = 530;

const registry = new WeakMap<Phaser.Scene, Hotspot[]>();

/** The scene's hotspots, in the order they were made — the keyboard's Tab order. */
export function hotspotsIn(scene: Phaser.Scene): Hotspot[] {
  return registry.get(scene) ?? [];
}

/**
 * Who else gets a say in a click on a hotspot. The narration registers here:
 * while it still has something to say, a click on a hotspot — very often the
 * same one, clicked again to move the text on — is a click on the text.
 * Returns true if it took the click.
 */
export type HotspotGate = (from: Hotspot) => boolean;

const gates = new WeakMap<Phaser.Scene, HotspotGate>();

export function setHotspotGate(scene: Phaser.Scene, gate: HotspotGate): void {
  gates.set(scene, gate);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => gates.delete(scene));
}

export class Hotspot {
  readonly zone: Phaser.GameObjects.Zone;
  private scene: Phaser.Scene;
  private ring: Phaser.GameObjects.Graphics;
  private tag: Phaser.GameObjects.Text;
  private opts: HotspotOpts;
  /** Guards the hover cue against a jittery cursor re-triggering on one object. */
  private hoverSounded = false;
  private offLang: () => void;
  private enabled = true;
  private hovered = false;
  private focused = false;

  constructor(scene: Phaser.Scene, opts: HotspotOpts) {
    this.scene = scene;
    this.opts = opts;
    const w = opts.w ?? (opts.r ?? 60) * 2;
    const h = opts.h ?? (opts.r ?? 60) * 2;

    this.zone = scene.add.zone(opts.x, opts.y, w, h).setOrigin(0.5);
    if (this.round) {
      // The ring is a circle, so the hit area is one too. A square zone
      // answered clicks in its corners, outside the ring the player can see.
      this.zone.setInteractive({
        hitArea: new Phaser.Geom.Circle(w / 2, h / 2, w / 2),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true,
      });
    } else {
      this.zone.setInteractive({ useHandCursor: true });
    }

    this.ring = scene.add.graphics().setDepth(RING_DEPTH).setAlpha(0);
    this.drawRing(w, h);

    this.tag = scene.add
      .text(opts.x, opts.y - h / 2 - 22, t(opts.label), {
        fontFamily: Fonts.body,
        fontSize: '24px',
        color: Hex.parchment,
        backgroundColor: 'rgba(20,22,26,0.78)',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setDepth(TAG_DEPTH)
      .setAlpha(0);

    this.zone.on('pointerover', () => {
      this.hovered = true;
      // Very quiet: this fires whenever the cursor crosses anything clickable.
      if (!this.hoverSounded) {
        audio.play('hover');
        this.hoverSounded = true;
      }
      this.refresh();
    });
    this.zone.on('pointerout', () => {
      this.hovered = false;
      this.hoverSounded = false;
      this.refresh();
    });
    this.zone.on(
      'pointerdown',
      (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        // Right-click belongs to the bag (put the held item back), never to the
        // world. Letting it through here means the bag's handler sees it.
        if (p.button !== 0) return;
        if (this.activate()) {
          audio.play('click');
          ev?.stopPropagation?.();
        }
      },
    );

    const list = registry.get(scene);
    if (list) list.push(this);
    else {
      registry.set(scene, [this]);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => registry.delete(scene));
    }

    this.offLang = i18n.onChange(() => this.tag.setText(t(this.opts.label)));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());
  }

  /** Clickable right now. */
  get live(): boolean {
    return this.enabled;
  }

  /** Screen position, for the keyboard's "use the held item here". */
  get center(): { x: number; y: number } {
    return { x: this.opts.x, y: this.opts.y };
  }

  /**
   * Does what a click does. Returns false if the hotspot declined — disabled,
   * or its guard wants the click to fall through to the scene.
   */
  activate(): boolean {
    if (!this.enabled) return false;
    // Decide whether we are taking this click BEFORE consuming it.
    if (this.opts.guard && !this.opts.guard()) return false;
    // The text on screen may want this click first — see setHotspotGate.
    if (gates.get(this.scene)?.(this)) return true;
    this.pulse();
    this.opts.onClick();
    return true;
  }

  /** Keyboard focus draws the hotspot as if the pointer were over it. */
  setFocus(on: boolean): void {
    this.focused = on;
    this.refresh();
  }

  /** Given a radius and no explicit width, the hotspot is a circle. */
  private get round(): boolean {
    return this.opts.r !== undefined && this.opts.w === undefined;
  }

  private drawRing(w: number, h: number): void {
    const { x, y } = this.opts;
    this.ring.clear();
    this.ring.lineStyle(3, Palette.ryeBright, 0.85);
    if (this.round) {
      this.ring.strokeCircle(x, y, w / 2);
    } else {
      this.ring.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    }
  }

  private get shown(): Phaser.GameObjects.GameObject[] {
    return this.opts.discreet ? [this.tag] : [this.ring, this.tag];
  }

  private refresh(): void {
    if (!this.enabled) return;
    const on = this.hovered || this.focused;
    const targets = this.shown;
    this.scene.tweens.killTweensOf(targets);
    // Quick in, slower out: 160ms felt laggy chasing a moving cursor.
    this.scene.tweens.add({
      targets,
      alpha: on ? 1 : 0,
      duration: on ? 110 : 160,
      ease: on ? 'Quad.easeOut' : 'Quad.easeIn',
    });
  }

  /**
   * Acknowledges a click without taking the ring away. The pointer is still
   * over the thing, and pointerover will not fire again until it leaves, so
   * killing the ring here left the player hovering something that looked dead.
   */
  private pulse(): void {
    if (!(this.hovered || this.focused)) return;
    const targets = this.shown;
    this.scene.tweens.killTweensOf(targets);
    // Dips to 0.35 and comes back up, 90ms each way.
    this.scene.tweens.add({
      targets,
      alpha: 0.35,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.zone.setVisible(on);
    if (on) {
      // Re-enables the existing hit area, circle or rectangle.
      this.zone.setInteractive();
    } else {
      this.zone.disableInteractive();
      this.hovered = false;
      this.focused = false;
      // Kill any hover fade still in flight, or it carries the label back up
      // after we have hidden it.
      this.scene.tweens.killTweensOf([this.ring, this.tag]);
      this.ring.setAlpha(0);
      this.tag.setAlpha(0);
    }
  }

  destroy(): void {
    this.offLang();
    const list = registry.get(this.scene);
    if (list) registry.set(this.scene, list.filter((h) => h !== this));
    this.scene.tweens.killTweensOf([this.ring, this.tag]);
    this.zone.destroy();
    this.ring.destroy();
    this.tag.destroy();
  }
}
