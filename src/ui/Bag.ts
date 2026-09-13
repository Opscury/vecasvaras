import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { bag, ITEMS, type ItemId } from '../core/inventory';
import { textureFor } from '../core/itemArt';
import { state } from '../core/state';
import { items } from '../content/script';
import { Hex, Fonts, Layout, Palette } from '../core/theme';
import { ignoreKey, keysOf, markHandled } from './keys';
import { audio } from '../core/audio';

/** Registry flag: the one-line teach has been shown this session. */
const TAUGHT = 'bagTaught';

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
  /** True only while `take` is shutting the tray as a side effect. */
  private closingToTake = false;
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
    const x = Layout.width - 132;
    const y = Layout.height - 108;

    this.bagImg = scene.add
      .image(0, 0, 'item-bag')
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.baseScale = 122 / this.bagImg.height;
    this.bagImg.setScale(this.baseScale);

    // Name over note, anchored at the bag's right edge and growing up and to
    // the left, so a two-line note never runs off the side of the screen.
    this.labelPlate = scene.add.graphics();
    this.labelName = scene.add
      .text(0, 0, '', { fontFamily: Fonts.body, fontSize: '22px', color: Hex.parchment, align: 'right' })
      .setOrigin(1, 1);
    this.labelNote = scene.add
      .text(0, 0, '', {
        fontFamily: Fonts.body,
        fontSize: '18px',
        color: Hex.parchmentDim,
        fontStyle: 'italic',
        align: 'right',
        wordWrap: { width: 420 },
      })
      .setOrigin(1, 1);
    this.label = scene.add.container(64, -104, [this.labelPlate, this.labelName, this.labelNote]).setAlpha(0);

    this.teach = scene.add
      .text(64, -210, '', {
        fontFamily: Fonts.body,
        fontSize: '21px',
        color: Hex.parchment,
        backgroundColor: 'rgba(20,22,26,0.88)',
        padding: { x: 14, y: 9 },
        align: 'right',
        wordWrap: { width: 460 },
      })
      .setOrigin(1, 1)
      .setAlpha(0);

    this.tray = scene.add.container(0, 0);

    // A soft glow behind the bag, pulsed by `attention`.
    this.halo = scene.add.graphics();
    this.halo.fillStyle(Palette.ryeBright, 1).fillCircle(0, 0, 74);
    this.halo.setAlpha(0);

    this.root = scene.add.container(x, y, [this.halo, this.tray, this.bagImg, this.label, this.teach]);
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

    scene.input.mouse?.disableContextMenu();
    scene.input.keyboard?.on('keydown', this.onKey, this);

    this.offBag = bag.onChange(() => this.refresh());
    this.offLang = i18n.onChange(() => this.rebuildTray());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offBag();
      this.offLang();
      scene.input.keyboard?.off('keydown', this.onKey, this);
    });

    this.refresh(true);
  }

  /** What the player currently has in hand, if anything. */
  get holding(): ItemId | null {
    return this.held;
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
    const s = 110 / Math.max(img.width, img.height);
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
    this.setHeld(id);
    this.ghost?.destroy();
    this.ghost = this.scene.add
      .image(this.scene.input.activePointer.worldX, this.scene.input.activePointer.worldY, textureFor(id))
      .setAlpha(0.75)
      .setDepth(960);
    this.ghost.setScale(96 / this.ghost.height);
    this.showLabel(t(ITEMS[id].name), t(noteFor(id)));
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
    if (v) this.maybeTeach();
  }

  /**
   * The first time the bag is opened, one line on how it works. Said beside the
   * bag rather than in the narration panel, which may be holding a decision
   * that a flash would wipe.
   */
  private maybeTeach(): void {
    const reg = this.scene.registry;
    if (reg.get(TAUGHT)) return;
    reg.set(TAUGHT, true);
    this.teach.setText(t(items.teach));
    this.scene.tweens.add({ targets: this.teach, alpha: 1, duration: 300, ease: 'Quad.easeOut' });
    this.scene.time.delayedCall(4800, () => {
      this.scene.tweens.add({ targets: this.teach, alpha: 0, duration: 450, ease: 'Quad.easeIn' });
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
      const step = 92;
      const px = -100 - i * step;
      const py = -34 - Math.sin((i + 1) / (ids.length + 1) * Math.PI) * 26;

      // A warm timber ground rather than ink: the dark iron sickle vanished
      // against a near-black plate.
      const plate = this.scene.add.graphics();
      plate.fillStyle(Palette.timber, 0.35);
      plate.fillRoundedRect(px - 40, py - 40, 80, 80, 10);
      plate.lineStyle(1, Palette.timberLight, 0.6);
      plate.strokeRoundedRect(px - 40, py - 40, 80, 80, 10);

      const icon = this.scene.add
        .image(px, py, textureFor(id))
        .setInteractive({ useHandCursor: true });
      const size = 68 / Math.max(icon.width, icon.height);
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
      icon.setAlpha(0).setY(py + 14);
      this.scene.tweens.add({ targets: plate, alpha: 1, duration: 200, delay: i * 60, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: icon, alpha: 1, y: py, duration: 240, delay: i * 60, ease: 'Back.easeOut' });
    });
  }

  private showLabel(name: string, note = ''): void {
    this.labelName.setText(name);
    this.labelNote.setText(note);
    const gap = note ? 6 : 0;
    this.labelNote.setPosition(-12, -8);
    this.labelName.setPosition(-12, note ? -8 - this.labelNote.height - gap : -8);
    const w = Math.max(this.labelName.width, note ? this.labelNote.width : 0) + 24;
    const h = this.labelName.height + (note ? this.labelNote.height + gap : 0) + 16;
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
    const want = count > 0;
    if (instant) {
      this.shown = want;
      this.root.setAlpha(want ? 1 : 0);
    } else {
      if (want !== this.shown) {
        this.shown = want;
        this.scene.tweens.killTweensOf(this.root);
        this.scene.tweens.add({
          targets: this.root,
          alpha: want ? 1 : 0,
          duration: 500,
          ease: want ? 'Quad.easeOut' : 'Quad.easeIn',
        });
      }
      // A small nudge whenever something new lands in it — unless it is still
      // in the air, in which case `fly` bumps on arrival.
      if (count > this.lastCount && this.flying === 0) this.bump();
    }
    this.lastCount = count;
    if (this.open) this.rebuildTray();
  }

  private bump(): void {
    audio.play('bag');
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
