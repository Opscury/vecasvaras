import Phaser from 'phaser';
import { type Loc, t, i18n } from '../core/i18n';
import { Hex, Fonts, Layout, Palette, Touch, px, scaled } from '../core/theme';
import { audio } from '../core/audio';

/**
 * A clickable region on a painted background.
 *
 * There is no cursor sprite and no walking — the whole game is "look at the
 * picture, notice a thing, click it" — so the hotspot has to advertise itself
 * on hover without ruining the painting. It does that with a soft ring and a
 * floating label, both of which fade rather than pop.
 */

/**
 * Fired on the scene whenever the narration panel starts or stops a run of
 * lines. It lives here rather than in `Narration` because both the bag and
 * every hotspot listen for it, and `Narration` already imports this module.
 */
export const SPEAKING = 'narration-speaking';

export interface HotspotOpts {
  /** What this is, for a scene deciding what an item used on it should do. */
  id?: string;
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
   * Where the standing touch mark goes, if not the middle of the hotspot. A
   * disc in the centre of a person reads as something they are holding; Anna
   * gets hers on the ground in front of her boots.
   */
  markAt?: { x: number; y: number };
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
/** Under the narration panel (500) — see `addMark`. */
const MARK_DEPTH = 490;

const registry = new WeakMap<Phaser.Scene, Hotspot[]>();

/** The scene's hotspots, in the order they were made — the keyboard's Tab order. */
export function hotspotsIn(scene: Phaser.Scene): Hotspot[] {
  return registry.get(scene) ?? [];
}

/**
 * The live hotspot under a point, if any — for "what did the player use this
 * item on". Later hotspots win, as they are drawn over earlier ones.
 */
export function hotspotAt(scene: Phaser.Scene, x: number, y: number): Hotspot | null {
  const list = hotspotsIn(scene);
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].live && list[i].contains(x, y)) return list[i];
  }
  return null;
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
  /**
   * The standing mark on a touch screen — see `addMark`. Null on a pointer
   * device, where hover does this job, and on discreet hotspots, which are
   * hidden on purpose.
   */
  private mark: Phaser.GameObjects.Graphics | null = null;
  private markTween: Phaser.Tweens.Tween | null = null;
  private onSpeak: ((on: boolean) => void) | null = null;
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

    // Kept clear of the narration panel. A label for something in the bottom
    // third of the painting used to land in the middle of a line of text.
    const tagY = Math.min(opts.y - h / 2 - scaled(22), Layout.height - Layout.panelH - scaled(12));
    this.tag = scene.add
      .text(opts.x, tagY, t(opts.label), {
        fontFamily: Fonts.body,
        fontSize: px(24),
        color: Hex.parchment,
        backgroundColor: 'rgba(20,22,26,0.78)',
        padding: { x: scaled(12), y: scaled(6) },
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

    this.addMark();

    this.offLang = i18n.onChange(() => this.tag.setText(t(this.opts.label)));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());
  }

  /**
   * A small breathing mark that sits on every live hotspot on a touch screen.
   *
   * The whole game's answer to "what can I touch" was hover, and a phone has no
   * hover. The first playtester got as far as the village and then simply
   * stopped, because nothing on the painting admitted to being a thing. This is
   * the fix: quiet enough not to turn the painting into a menu, present enough
   * that there is always somewhere to start.
   *
   * Discreet hotspots are left out — they are hidden as the puzzle.
   */
  private addMark(): void {
    if (!Touch || this.opts.discreet) return;
    const { x, y } = this.opts.markAt ?? this.opts;
    const r = scaled(8);
    // Below the narration panel, unlike the hover ring: a mark is up all the
    // time, and one sitting on top of a line of text reads as a stray dot.
    const m = this.scene.add.graphics().setDepth(MARK_DEPTH);
    // A dark wash under the gold. These paintings run from near-black bog to
    // pale summer path, and rye gold alone disappears into the light half.
    m.fillStyle(Palette.ink, 0.3).fillCircle(x, y, r * 2.1);
    m.fillStyle(Palette.ryeBright, 0.95).fillCircle(x, y, r);
    m.lineStyle(2, Palette.ryeBright, 0.45).strokeCircle(x, y, r * 2);
    m.setAlpha(0);
    this.mark = m;
    // Staggered, or every mark in the scene breathes in unison and the
    // painting starts to look like a control panel. Quiet at the top of the
    // breath as well: seven of these at full strength turned the village into
    // a board game.
    this.markTween = this.scene.tweens.add({
      targets: m,
      alpha: { from: 0.22, to: 0.58 },
      duration: 1600,
      delay: Math.random() * 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Nothing is worth touching while somebody is talking, and marks scattered
    // over a painting behind a conversation are the loudest kind of clutter.
    this.onSpeak = (on: boolean) => {
      if (!this.mark) return;
      if (on) {
        this.markTween?.pause();
        this.scene.tweens.add({ targets: this.mark, alpha: 0.06, duration: 260, ease: 'Quad.easeOut' });
      } else {
        // The breather picks the alpha back up from wherever it left off; no
        // need to fade in first, and killing tweens here would kill it too.
        this.markTween?.resume();
      }
    };
    this.scene.events.on(SPEAKING, this.onSpeak);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.onSpeak) this.scene.events.off(SPEAKING, this.onSpeak);
    });
  }

  /** Clickable right now. */
  get live(): boolean {
    return this.enabled;
  }

  get id(): string | undefined {
    return this.opts.id;
  }

  /** Whether a screen point is inside the clickable area. */
  contains(x: number, y: number): boolean {
    const w = this.opts.w ?? (this.opts.r ?? 60) * 2;
    const h = this.opts.h ?? (this.opts.r ?? 60) * 2;
    if (this.round) return Math.hypot(x - this.opts.x, y - this.opts.y) <= w / 2;
    return Math.abs(x - this.opts.x) <= w / 2 && Math.abs(y - this.opts.y) <= h / 2;
  }

  /** Changes what the label says, for a thing that has become something else. */
  setLabel(label: Loc): void {
    this.opts.label = label;
    this.tag.setText(t(label));
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
    // On a phone the label has never been seen — there was no hover to show it.
    // Naming the thing as it is touched is how the player learns the village.
    if (Touch) this.flashTag();
    this.opts.onClick();
    return true;
  }

  /** Shows the label for a moment, for a touch that had no hover before it. */
  private flashTag(): void {
    this.scene.tweens.killTweensOf(this.tag);
    this.tag.setAlpha(1);
    this.scene.tweens.add({
      targets: this.tag,
      alpha: 0,
      delay: 900,
      duration: 400,
      ease: 'Quad.easeIn',
    });
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
    // A mark on a dead hotspot is a lie, and the scene turns them off in bulk
    // on the way out of a room.
    this.mark?.setVisible(on);
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
    this.markTween?.remove();
    this.markTween = null;
    this.zone.destroy();
    this.ring.destroy();
    this.tag.destroy();
    this.mark?.destroy();
    this.mark = null;
  }
}
