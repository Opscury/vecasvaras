import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { bag, ITEMS, type ItemId } from '../core/inventory';
import { textureFor } from '../core/itemArt';
import { state } from '../core/state';
import { items } from '../content/script';
import { Hex, Fonts, Layout, Palette, Touch, px, scaled } from '../core/theme';
import { SPEAKING } from './Narration';
import { Notice } from './Notice';
import { ignoreKey, keysOf, markHandled } from './keys';
import { audio } from '../core/audio';

/** Registry flag: the bag has introduced itself this session. */
const TAUGHT = 'bagTaught';

/** How far a finger must travel for a tray press to count as a drag rather than a tap. */
const DRAG_SLOP = 40;

/**
 * What an item's label says underneath its name. The loaf says what kind of
 * year it came from — the single fact the bread argument at the bog turns on,
 * and the one thing a player holding a weak card needs to know before the
 * Devil tells them.
 */
function noteFor(id: ItemId): Loc {
  const year = state.get().jumis;
  if (id === 'bread' && year !== 'none') return year === 'good' ? items.breadNote.good : items.breadNote.poor;
  return ITEMS[id].note;
}

/**
 * The bag: a linen shoulder bag hanging in the bottom-right corner.
 *
 * Interaction is the old point-and-click contract, because it is the one every
 * player already knows: click the bag to open it, click an item to take it in
 * hand, then click the thing in the world you want to use it on. Clicking the
 * bag again, or right-clicking anywhere, puts it back. On the keyboard: B opens
 * it, the number keys take an item, Enter uses it on the focused hotspot (or
 * the middle of the frame), Escape puts it back.
 *
 * Design notes:
 *   - The bag only appears once there is something in it. An empty bag in the
 *     corner of the opening scene is UI furniture advertising a system the
 *     player cannot use yet.
 *   - It sags open rather than popping a window. A panel with a border would be
 *     the first rectangle in the game that admits it is software.
 *   - The held item follows the cursor at half opacity so it is always obvious
 *     that the game is waiting for you to point at something.
 *   - Things travel: a pickup flies from the world into the bag, and an item
 *     put back flies home, so the causal link is on screen, not only in text.
 *   - It sits below the full-screen cards (the daina, the reckoning), so a card
 *     really is in front of it: nothing in the corner can be clicked through a
 *     verdict.
 */
export class Bag {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private bagImg: Phaser.GameObjects.Image;
  private baseScale: number;
  private tray: Phaser.GameObjects.Container;
  private halo: Phaser.GameObjects.Graphics;
  private attending = false;
  private label: Phaser.GameObjects.Container;
  private labelPlate: Phaser.GameObjects.Graphics;
  private labelName: Phaser.GameObjects.Text;
  private labelNote: Phaser.GameObjects.Text;
  private teach: Phaser.GameObjects.Text;
  /** The way out of holding something on a screen with no right mouse button. */
  private cancel: Phaser.GameObjects.Text;
  private held: ItemId | null = null;
  private ghost: Phaser.GameObjects.Image | null = null;
  private open = false;
  /** Whether the bag is meant to be on screen. Never read this off a mid-tween alpha. */
  private shown = false;
  /** How many items the bag held last time it looked, so it can tell when one arrives. */
  private lastCount = 0;
  /** Items still in the air on their way in; the bump waits for them to land. */
  private flying = 0;
  /** Guards against the click that took an item also spending it. */
  private tookAt = -9999;
  /** Where the finger was when the current item was taken, for drag-to-use. */
  private tookFrom = { x: 0, y: 0 };
  /** True only while `take` is shutting the tray as a side effect. */
  private closingToTake = false;
  /** Set while the narration is mid-sentence; the bag steps out of the corner. */
  private muted = false;
  private offBag: () => void;
  private offLang: () => void;

  /**
   * Fired when the player uses the held item on the world. Return true if the
   * scene took the click (the item may stay in hand, to aim again); false puts
   * the item back.
   */
  onUse: ((id: ItemId, x: number, y: number) => boolean) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Bottom-RIGHT, because the choice list runs along the bottom-left.
    const x = Layout.width - scaled(132);
    const y = Layout.height - scaled(108);

    this.bagImg = scene.add
      .image(0, 0, 'item-bag')
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.baseScale = scaled(122) / this.bagImg.height;
    this.bagImg.setScale(this.baseScale);

    // Name over note, anchored at the bag's right edge and growing up and to
    // the left, so a two-line note never runs off the side of the screen.
    this.labelPlate = scene.add.graphics();
    this.labelName = scene.add
      .text(0, 0, '', { fontFamily: Fonts.body, fontSize: px(22), color: Hex.parchment, align: 'right' })
      .setOrigin(1, 1);
    this.labelNote = scene.add
      .text(0, 0, '', {
        fontFamily: Fonts.body,
        fontSize: px(18),
        color: Hex.parchmentDim,
        fontStyle: 'italic',
        align: 'right',
        wordWrap: { width: scaled(420) },
      })
      .setOrigin(1, 1);
    this.label = scene.add
      .container(scaled(64), -scaled(104), [this.labelPlate, this.labelName, this.labelNote])
      .setAlpha(0);

    this.teach = scene.add
      .text(scaled(64), -scaled(210), '', {
        fontFamily: Fonts.body,
        fontSize: px(21),
        color: Hex.parchment,
        backgroundColor: 'rgba(20,22,26,0.88)',
        padding: { x: scaled(14), y: scaled(9) },
        align: 'right',
        wordWrap: { width: scaled(460) },
      })
      .setOrigin(1, 1)
      .setAlpha(0);

    // Right-click puts a held item back, and a phone has no right click. This
    // is the same escape, spelled out, and it only exists while something is
    // actually in hand.
    this.cancel = scene.add
      .text(scaled(64), -scaled(150), '✕  ' + t(items.putBack), {
        fontFamily: Fonts.body,
        fontSize: px(21),
        color: Hex.parchmentDim,
        backgroundColor: 'rgba(20,22,26,0.88)',
        padding: { x: scaled(16), y: scaled(12) },
      })
      .setOrigin(1, 1)
      .setAlpha(0);
    this.cancel.setInteractive({ useHandCursor: true });
    this.cancel.on('pointerover', () => this.cancel.setColor(Hex.ryeBright));
    this.cancel.on('pointerout', () => this.cancel.setColor(Hex.parchmentDim));
    this.cancel.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.putBack();
    });

    this.tray = scene.add.container(0, 0);

    // A soft glow behind the bag, pulsed by `attention`.
    this.halo = scene.add.graphics();
    this.halo.fillStyle(Palette.ryeBright, 1).fillCircle(0, 0, scaled(74));
    this.halo.setAlpha(0);

    this.root = scene.add.container(x, y, [
      this.halo,
      this.tray,
      this.bagImg,
      this.label,
      this.teach,
      this.cancel,
    ]);
    // Above the narration panel (500), below the full-screen cards (800+).
    this.root.setDepth(700).setAlpha(0);

    this.bagImg.on('pointerover', () => {
      if (this.held) return;
      this.bagImg.setTint(0xfff0d0);
      this.showLabel(t(this.open ? items.bag.close : items.bag.open));
    });
    this.bagImg.on('pointerout', () => {
      this.bagImg.clearTint();
      this.hideLabel();
    });
    this.bagImg.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      if (this.held) {
        this.putBack();
        return;
      }
      this.toggle();
    });

    // Holding an item and clicking the world: offer it to the scene.
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.held) return;
      // Right-click always cancels, which is what everyone tries first. It has
      // to be caught before the item is offered to the world.
      if (p.rightButtonDown()) {
        this.putBack();
        return;
      }
      if (scene.time.now - this.tookAt < 150) return;
      this.offer(p.worldX, p.worldY);
    });

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.ghost) this.ghost.setPosition(p.worldX, p.worldY);
    });

    // Drag straight out of the tray and onto the thing. With no cursor to
    // follow, pressing an item and letting go somewhere else is the gesture a
    // phone player reaches for first; a press and a separate tap still works.
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.held || p.button !== 0) return;
      const moved = Phaser.Math.Distance.Between(this.tookFrom.x, this.tookFrom.y, p.worldX, p.worldY);
      if (moved < scaled(DRAG_SLOP)) return;
      this.offer(p.worldX, p.worldY);
    });

    scene.input.mouse?.disableContextMenu();
    scene.input.keyboard?.on('keydown', this.onKey, this);

    this.offBag = bag.onChange(() => this.refresh());
    this.offLang = i18n.onChange(() => {
      this.cancel.setText('✕  ' + t(items.putBack));
      this.rebuildTray();
    });
    scene.events.on(SPEAKING, this.onSpeaking, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offBag();
      this.offLang();
      scene.events.off(SPEAKING, this.onSpeaking, this);
      scene.input.keyboard?.off('keydown', this.onKey, this);
    });

    this.refresh(true);
  }

  /** What the player currently has in hand, if anything. */
  get holding(): ItemId | null {
    return this.held;
  }

  /**
   * The narration panel started or stopped a run of lines.
   *
   * The Next button now sits in the bottom-right corner, which is where the bag
   * has always hung. Rather than move one of them somewhere worse, the bag
   * stands down while there are words on screen — there is nothing to do with
   * an item mid-sentence anyway. Holding something is the exception: the player
   * is already aiming, and having the bag vanish under their thumb would be
   * the game taking it out of their hand.
   */
  private onSpeaking(on: boolean): void {
    const want = on && !this.held;
    if (want === this.muted) return;
    this.muted = want;
    if (want && this.open) this.setOpen(false);
    this.applyVisibility();
  }

  /**
   * A slow glow behind the bag, for when the next step is "take something out
   * of it". Safe to call every frame; only a change of state does anything.
   */
  attention(on: boolean): void {
    if (on === this.attending) return;
    this.attending = on;
    this.scene.tweens.killTweensOf(this.halo);
    if (!on) {
      this.scene.tweens.add({ targets: this.halo, alpha: 0, duration: 200, ease: 'Quad.easeIn' });
      return;
    }
    this.halo.setAlpha(0);
    this.scene.tweens.add({
      targets: this.halo,
      alpha: 0.3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * An item flying from the world into the bag — call it just before the
   * `bag.add` it illustrates. The bag's bump waits for it to land, so the
   * pickup reads as one motion: there, then here.
   */
  fly(texture: string, fromX: number, fromY: number): void {
    this.flying++;
    const img = this.scene.add.image(fromX, fromY, texture).setDepth(960);
    const s = scaled(110) / Math.max(img.width, img.height);
    img.setScale(s);
    const toX = this.root.x;
    const toY = this.root.y;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 420,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        img.setPosition(
          Phaser.Math.Linear(fromX, toX, v),
          Phaser.Math.Linear(fromY, toY, v) - Math.sin(v * Math.PI) * 140,
        );
        img.setScale(s * (1 - 0.5 * v));
      },
      onComplete: () => {
        img.destroy();
        this.flying--;
        this.bump();
      },
    });
  }

  /** Puts the held item back. It visibly travels home, so even a cancel reads as one. */
  putBack(): void {
    const ghost = this.ghost;
    this.setHeld(null);
    this.ghost = null;
    this.hideLabel();
    if (!ghost) return;
    this.scene.tweens.add({
      targets: ghost,
      x: this.root.x,
      y: this.root.y,
      scale: ghost.scale * 0.5,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => ghost.destroy(),
    });
  }

  /** Consumes the held item entirely (it was given away), so it does not fly home. */
  consumeHeld(): void {
    if (!this.held) return;
    bag.remove(this.held);
    this.ghost?.destroy();
    this.ghost = null;
    this.setHeld(null);
    this.hideLabel();
  }

  /** Offers the held item to the scene at a point in the world. */
  private offer(x: number, y: number): void {
    if (!this.held) return;
    const consumed = this.onUse?.(this.held, x, y) ?? false;
    if (!consumed) this.putBack();
  }

  private setHeld(id: ItemId | null): void {
    this.held = id;
    keysOf(this.scene).holding = id !== null;
    this.scene.tweens.killTweensOf(this.cancel);
    this.scene.tweens.add({
      targets: this.cancel,
      alpha: id ? 1 : 0,
      duration: id ? 200 : 140,
      ease: 'Quad.easeOut',
    });
    if (id) this.cancel.setInteractive({ useHandCursor: true });
    else this.cancel.disableInteractive();
    // Putting something back is also the moment the bag may need to come back:
    // it stands down during narration, and holding an item overrode that.
    if (!id && this.muted) {
      this.muted = false;
      this.applyVisibility();
    }
  }

  /** A line beside the bag, for a few seconds. Used by the teach and by `take`. */
  private aside(line: Loc, ms = 3200): void {
    this.teach.setText(t(line));
    this.scene.tweens.killTweensOf(this.teach);
    this.scene.tweens.add({ targets: this.teach, alpha: 1, duration: 220, ease: 'Quad.easeOut' });
    this.scene.time.delayedCall(ms, () => {
      this.scene.tweens.add({ targets: this.teach, alpha: 0, duration: 420, ease: 'Quad.easeIn' });
    });
  }

  /** Takes an item out of the bag and into the player's hand. */
  private take(id: ItemId): void {
    if (!bag.has(id)) return;
    // Set after the guard: an early return here used to leave the flag stuck
    // true and silence every bag-close for the rest of the run.
    this.closingToTake = true;
    this.setOpen(false);
    this.closingToTake = false;
    this.tookAt = this.scene.time.now;
    const p = this.scene.input.activePointer;
    this.tookFrom = { x: p.worldX, y: p.worldY };
    this.setHeld(id);
    this.ghost?.destroy();
    this.ghost = this.scene.add
      .image(p.worldX, p.worldY, textureFor(id))
      .setAlpha(0.75)
      .setDepth(960);
    this.ghost.setScale(scaled(96) / this.ghost.height);
    this.showLabel(t(ITEMS[id].name), t(noteFor(id)));
    // On a phone nothing follows the finger once it lifts, so the only sign
    // that the game is waiting to be pointed at something has to be words.
    if (Touch) this.aside(items.inHand);
  }

  private onKey(ev: KeyboardEvent): void {
    if (ignoreKey(this.scene, ev) || bag.count === 0) return;
    const k = ev.key.toLowerCase();
    if (k === 'b') {
      if (this.held) this.putBack();
      else this.toggle();
      markHandled(ev);
    } else if (this.open && /^[1-9]$/.test(k)) {
      const id = bag.list()[Number(k) - 1];
      if (id) {
        this.take(id);
        // No pointer is involved, so the item waits at the focused thing, or mid-frame.
        const at = keysOf(this.scene).focus ?? { x: Layout.width / 2, y: Layout.height * 0.6 };
        this.ghost?.setPosition(at.x, at.y);
        markHandled(ev);
      }
    } else if (k === 'escape' && (this.held || this.open)) {
      if (this.held) this.putBack();
      else this.setOpen(false);
      markHandled(ev);
    } else if (k === 'enter' && this.held) {
      const at = keysOf(this.scene).focus ?? { x: Layout.width / 2, y: Layout.height * 0.6 };
      this.offer(at.x, at.y);
      markHandled(ev);
    }
  }

  private toggle(): void {
    this.setOpen(!this.open);
  }

  private setOpen(v: boolean): void {
    if (this.open === v) return;
    this.open = v;
    // Taking an item closes the tray on the way out. That close is not a
    // separate action the player took, and hearing it over the ghost item
    // appearing made one click sound like three.
    if (v || !this.closingToTake) audio.play(v ? 'bagOpen' : 'bagClose');
    keysOf(this.scene).bagOpen = v;
    this.rebuildTray();
    if (v) this.aside(items.teach, 4800);
  }

  /**
   * The bag's introduction, the first time anything lands in it.
   *
   * This used to be one line beside the bag on its first OPEN — which meant a
   * player who never thought to open it was never told the bag existed. The
   * first playtester watched it appear in the corner mid-sentence and asked
   * what it was. It is a system, it arrives once, and it gets a card.
   */
  private maybeIntroduce(): void {
    const reg = this.scene.registry;
    if (reg.get(TAUGHT)) return;
    reg.set(TAUGHT, true);
    new Notice(this.scene, {
      title: items.intro.title,
      body: items.intro.body,
      ok: items.intro.ok,
      icon: 'item-bag',
    });
  }

  /**
   * The open bag lays its contents out in a short arc above itself, like
   * things tipped out onto a bench.
   */
  private rebuildTray(): void {
    this.tray.removeAll(true);
    if (!this.open) return;

    const ids = bag.list();
    ids.forEach((id, i) => {
      const def = ITEMS[id];
      // The tray opens leftward, away from the screen edge the bag sits on.
      const step = scaled(92);
      const ix = -scaled(100) - i * step;
      const iy = -scaled(34) - Math.sin((i + 1) / (ids.length + 1) * Math.PI) * scaled(26);
      const half = scaled(40);

      // A warm timber ground rather than ink: the dark iron sickle vanished
      // against a near-black plate.
      const plate = this.scene.add.graphics();
      plate.fillStyle(Palette.timber, 0.35);
      plate.fillRoundedRect(ix - half, iy - half, half * 2, half * 2, scaled(10));
      plate.lineStyle(1, Palette.timberLight, 0.6);
      plate.strokeRoundedRect(ix - half, iy - half, half * 2, half * 2, scaled(10));

      const icon = this.scene.add
        .image(ix, iy, textureFor(id))
        .setInteractive({ useHandCursor: true });
      const size = scaled(68) / Math.max(icon.width, icon.height);
      icon.setScale(size);

      icon.on('pointerover', () => {
        icon.setScale(size * 1.12);
        this.showLabel(t(def.name), t(noteFor(id)));
      });
      icon.on('pointerout', () => {
        icon.setScale(size);
        this.hideLabel();
      });
      icon.on(
        'pointerdown',
        (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          if (p.button !== 0) return;
          ev?.stopPropagation?.();
          this.take(id);
        },
      );

      this.tray.add([plate, icon]);
      // Tipped out, not faded in: a slight overshoot as each lands.
      plate.setAlpha(0);
      icon.setAlpha(0).setY(iy + scaled(14));
      this.scene.tweens.add({ targets: plate, alpha: 1, duration: 200, delay: i * 60, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: icon, alpha: 1, y: iy, duration: 240, delay: i * 60, ease: 'Back.easeOut' });
    });
  }

  private showLabel(name: string, note = ''): void {
    this.labelName.setText(name);
    this.labelNote.setText(note);
    const gap = note ? scaled(6) : 0;
    const edge = scaled(12);
    const base = scaled(8);
    this.labelNote.setPosition(-edge, -base);
    this.labelName.setPosition(-edge, note ? -base - this.labelNote.height - gap : -base);
    const w = Math.max(this.labelName.width, note ? this.labelNote.width : 0) + scaled(24);
    const h = this.labelName.height + (note ? this.labelNote.height + gap : 0) + scaled(16);
    this.labelPlate.clear().fillStyle(Palette.ink, 0.82).fillRect(-w, -h, w, h);
    this.scene.tweens.killTweensOf(this.label);
    this.scene.tweens.add({ targets: this.label, alpha: 1, duration: 140, ease: 'Quad.easeOut' });
  }

  private hideLabel(): void {
    this.scene.tweens.killTweensOf(this.label);
    this.scene.tweens.add({ targets: this.label, alpha: 0, duration: 140, ease: 'Quad.easeIn' });
  }

  /** The bag is only on screen once it holds something. */
  private refresh(instant = false): void {
    const count = bag.count;
    const arrived = count > this.lastCount;
    this.shown = count > 0;
    this.applyVisibility(instant);
    // A small nudge whenever something new lands in it — unless it is still in
    // the air, in which case `fly` bumps on arrival.
    if (!instant && arrived && this.flying === 0) this.bump();
    this.lastCount = count;
    if (this.open) this.rebuildTray();
  }

  /**
   * One place that decides whether the bag is on screen, so the two reasons it
   * can be hidden — nothing in it, and the narration using the corner — cannot
   * fight over the same alpha tween and leave it stuck half-faded.
   */
  private applyVisibility(instant = false): void {
    const want = this.shown && !this.muted;
    this.scene.tweens.killTweensOf(this.root);
    if (instant) {
      this.root.setAlpha(want ? 1 : 0);
    } else {
      this.scene.tweens.add({
        targets: this.root,
        alpha: want ? 1 : 0,
        duration: want ? 400 : 220,
        ease: want ? 'Quad.easeOut' : 'Quad.easeIn',
      });
    }
    // An invisible bag must not still answer clicks: the Next button sits on
    // top of where it hangs.
    if (want) this.bagImg.setInteractive({ useHandCursor: true });
    else this.bagImg.disableInteractive();
  }

  private bump(): void {
    audio.play('bag');
    // Here rather than in `refresh`: with a pickup animation the item is still
    // in the air when the bag's contents change, and a card that interrupts a
    // thing mid-flight reads as a bug.
    this.maybeIntroduce();
    this.scene.tweens.killTweensOf(this.bagImg);
    this.bagImg.setScale(this.baseScale);
    this.scene.tweens.add({
      targets: this.bagImg,
      scale: this.baseScale * 1.12,
      duration: 220,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }
}
