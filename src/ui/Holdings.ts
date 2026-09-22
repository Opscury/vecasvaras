import Phaser from 'phaser';
import { i18n, t } from '../core/i18n';
import { mapUi, village } from '../content/script';
import { BREAD_CAP, type Holdings as Held, type HoldingsSource, holdings } from '../core/holdings';
import { atlas, type PlaceId } from '../core/atlas';
import { state } from '../core/state';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { MapPanel } from './MapPanel';
import { CARD, keysOf, markHandled, wasHandled } from './keys';
import { audio } from '../core/audio';

/**
 * The village's standing, along the top edge, for the whole game.
 *
 * Two things, and only two, because the village only thinks about two things:
 * what there is to eat, and where it can get to.
 *
 *   bread   a gauge that fills. It used to be six little cells, and a row of
 *           cells is read as a score for the last errand rather than a store
 *           that fills and empties over a winter.
 *   the map the ways out, rolled up. Tap it and it unrolls. A row of dots
 *           could never say that the road east exists and wants a bridge.
 *
 * Top centre rather than a corner: both corners are spoken for — the errand on
 * the left, the chips on the right — and on a phone held sideways the middle
 * of the top edge is the one place nothing else wants.
 */
const BAR = { w: 186, h: 17 };
const ROLL = { w: 52, h: 30 };

export class Holdings {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private mapLabel: Phaser.GameObjects.Text;
  private bar: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private roll: Phaser.GameObjects.Graphics;
  private rollHit: Phaser.GameObjects.Zone;
  private news: Phaser.GameObjects.Text;
  private map: MapPanel;
  private shown: Held;
  /** Ways open as the player was last shown them, so a new one can announce itself. */
  private ways: number;
  /**
   * Whether the bread gauge is part of the strip.
   *
   * It is not, out at the field and the bog: the store cannot change while you
   * are away, the sheaf tally wants the middle of the screen, and an empty
   * gauge above a harvest that has not been brought home yet reads as a
   * scolding. The map stays, because the map is about where you are.
   */
  private withBread = true;
  /** How much of the gauge is painted, so a growing bar can pick up mid-tween. */
  private fillLen = 0;
  private w = 0;
  private barX = 0;
  private rollX = 0;
  private offLang: () => void;

  /**
   * `from` is the state the player was last shown here. Passing what they left
   * with means a loaf earned while they were away is still missing when they
   * walk back in, and arrives a moment later in front of them — which is the
   * whole reason for having it on screen.
   */
  constructor(
    scene: Phaser.Scene,
    from?: HoldingsSource,
    opts: { bread?: boolean; travel?: (id: PlaceId) => boolean } = {},
  ) {
    this.scene = scene;
    this.withBread = opts.bread ?? true;
    const src = from ?? state.get();
    this.shown = holdings(src);
    this.ways = atlas(src).open;
    this.map = new MapPanel(scene, { travel: opts.travel });

    this.plate = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.fill = scene.add.graphics();
    this.roll = scene.add.graphics();

    this.label = scene.add.text(0, 0, t(village.measures.grain).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: px(19),
      color: Hex.parchmentDim,
    });
    this.label.setLetterSpacing?.(scaled(2));

    // Named, not just drawn. An unlabelled icon in a corner is a thing players
    // never press, and the map is where half the game's promise lives.
    this.mapLabel = scene.add.text(0, 0, t(mapUi.open).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: px(19),
      color: Hex.parchmentDim,
    });
    this.mapLabel.setLetterSpacing?.(scaled(2));

    this.rollHit = scene.add
      .zone(0, 0, Math.max(scaled(ROLL.w) + scaled(24), Layout.tap), Math.max(scaled(46), Layout.tap))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.rollHit.on('pointerover', () => {
      this.drawRoll(true);
      this.mapLabel.setColor(Hex.ryeBright);
    });
    this.rollHit.on('pointerout', () => {
      this.drawRoll(false);
      this.mapLabel.setColor(Hex.parchmentDim);
    });
    this.rollHit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      audio.play('click');
      this.map.toggle();
    });

    this.news = scene.add
      .text(0, 0, '', {
        fontFamily: Fonts.body,
        fontSize: px(17),
        color: Hex.rye,
        // Its own plate: it lands over a painting, and gold on birch bark is
        // not something anyone reads.
        backgroundColor: 'rgba(20,22,26,0.78)',
        padding: { x: scaled(14), y: scaled(7) },
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);

    this.root = scene.add
      .container(Layout.width / 2, Layout.margin - scaled(46), [
        this.plate,
        this.label,
        this.mapLabel,
        this.bar,
        this.fill,
        this.roll,
        this.rollHit,
        this.news,
      ])
      .setDepth(880);

    scene.input.keyboard?.on('keydown', this.onKey, this);
    // A verse or a verdict takes the whole screen. The strip steps aside for
    // it rather than sitting on top of its heading.
    scene.events.on(CARD, this.onCard, this);
    this.offLang = i18n.onChange(() => {
      this.label.setText(t(village.measures.grain).toUpperCase());
      this.mapLabel.setText(t(mapUi.open).toUpperCase());
      this.layout();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offLang();
      scene.events.off(CARD, this.onCard, this);
      scene.input.keyboard?.off('keydown', this.onKey, this);
    });

    this.layout();
  }

  /** Screen y of the panel's bottom edge, for anything that wants to sit under it. */
  get bottom(): number {
    return this.root.y + this.plateH;
  }

  private get plateH(): number {
    return scaled(56);
  }

  /** Where a threshed loaf flies to: the end of what is filled so far. */
  get breadSlot(): { x: number; y: number } {
    const frac = Math.min(1, (this.shown.bread + 0.5) / BREAD_CAP);
    return {
      x: this.root.x + this.barX + scaled(BAR.w) * frac,
      y: this.root.y + scaled(34),
    };
  }

  /** Fills one more loaf's worth, in front of the player. */
  addLoaf(): void {
    if (this.shown.bread >= BREAD_CAP) return;
    this.shown = { bread: this.shown.bread + 1 };
    this.growBar();
    this.pulse();
    audio.play('tally', { volume: 0.5 });
  }

  /** A brief brightening of the whole panel, so the eye goes to it. */
  pulse(): void {
    this.scene.tweens.add({ targets: this.plate, alpha: { from: 0.35, to: 1 }, duration: 500, ease: 'Quad.easeOut' });
  }

  /**
   * Re-reads the run. `animate` fills whatever is new with a beat of its own —
   * the village saying, along its own top edge, what the walk was worth.
   */
  refresh(animate = false): void {
    const want = holdings();
    const gained = want.bread > this.shown.bread;
    this.shown = want;
    this.growBar(!animate);

    const ways = atlas().open;
    const opened = ways > this.ways;
    this.ways = ways;

    if (!animate) return;
    if (gained) audio.play('tally', { volume: 0.5 });
    if (opened) this.announceWay();
  }

  /**
   * K for karte. Not M — that is the mute chip, and a player who reaches for
   * the map should not silence the game.
   *
   * `modal` is checked by hand rather than through `ignoreKey`, because the
   * map sets it while it is up: the key that opens the sheet has to be allowed
   * to close it again.
   */
  private onCard(up: boolean): void {
    // An invisible strip must not still answer a tap: the card's own dismiss
    // zone covers the whole screen, including this corner of it.
    if (up) this.rollHit.disableInteractive();
    else this.rollHit.setInteractive({ useHandCursor: true });
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      alpha: up ? 0 : 1,
      duration: up ? 260 : 420,
      ease: up ? 'Quad.easeIn' : 'Quad.easeOut',
    });
  }

  private onKey(ev: KeyboardEvent): void {
    if (ev.repeat || wasHandled(ev)) return;
    const k = ev.key.toLowerCase();
    if (k === 'escape' && this.map.isOpen) {
      this.map.close();
      markHandled(ev);
      return;
    }
    if (k !== 'k' || (keysOf(this.scene).modal && !this.map.isOpen)) return;
    this.map.toggle();
    markHandled(ev);
  }

  /**
   * A road opened while the player was away. The roll shakes itself loose and
   * says so — otherwise the only place the news exists is inside a panel
   * nobody has been given a reason to open.
   */
  private announceWay(): void {
    this.news.setText(t(mapUi.newWay)).setAlpha(0);
    this.scene.tweens.add({ targets: this.news, alpha: 1, duration: 300, ease: 'Quad.easeOut' });
    this.scene.tweens.add({
      targets: this.roll,
      angle: { from: -7, to: 7 },
      duration: 140,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut',
      onComplete: () => this.roll.setAngle(0),
    });
    this.pulse();
    audio.play('chime', { volume: 0.4 });
    this.scene.time.delayedCall(3600, () => {
      this.scene.tweens.add({ targets: this.news, alpha: 0, duration: 500 });
    });
  }

  // --- drawing ---------------------------------------------------------------

  /** Lays the strip out around its own contents and centres it on the screen. */
  private layout(): void {
    const padX = scaled(20);
    const gap = scaled(16);
    const barW = scaled(BAR.w);
    const rollW = scaled(ROLL.w);
    const divide = scaled(22);

    const left = this.withBread ? this.label.width + gap + barW + divide : 0;
    this.w = padX + left + rollW + scaled(10) + this.mapLabel.width + padX;
    this.barX = padX + this.label.width + gap;
    this.rollX = this.w - padX - this.mapLabel.width - scaled(10) - rollW / 2;

    this.label.setPosition(padX, scaled(26) - this.label.height / 2);
    this.mapLabel.setPosition(this.w - padX - this.mapLabel.width, scaled(26) - this.mapLabel.height / 2);
    this.rollHit.setPosition(
      this.rollX + (this.mapLabel.width + scaled(10)) / 2,
      scaled(27),
    );
    this.rollHit.setSize(
      Math.max(rollW + scaled(20) + this.mapLabel.width, Layout.tap),
      Math.max(scaled(46), Layout.tap),
    );
    this.roll.setPosition(this.rollX, scaled(27));
    this.news.setPosition(this.w / 2, this.plateH + scaled(14));
    this.label.setVisible(this.withBread);
    this.bar.setVisible(this.withBread);
    this.fill.setVisible(this.withBread);

    this.plate
      .clear()
      .fillStyle(Palette.ink, 0.62)
      .fillRoundedRect(0, 0, this.w, this.plateH, scaled(8))
      .lineStyle(1, Palette.rye, 0.28)
      .strokeRoundedRect(0, 0, this.w, this.plateH, scaled(8));
    // The rule that separates what there is to eat from where you can go.
    if (this.withBread) {
      this.plate
        .lineStyle(1, Palette.timberLight, 0.4)
        .lineBetween(
          this.rollX - rollW / 2 - divide / 2,
          scaled(12),
          this.rollX - rollW / 2 - divide / 2,
          this.plateH - scaled(12),
        );
    }

    this.root.setX((Layout.width - this.w) / 2);
    this.drawBar();
    this.growBar(true);
    this.drawRoll(false);
  }

  /** The empty gauge: a trough with a mark at each loaf, quietly. */
  private drawBar(): void {
    const w = scaled(BAR.w);
    const h = scaled(BAR.h);
    const y = scaled(27) - h / 2;
    this.bar
      .clear()
      .fillStyle(Palette.peat, 0.55)
      .fillRoundedRect(this.barX, y, w, h, h / 2)
      .lineStyle(1, Palette.timberLight, 0.55)
      .strokeRoundedRect(this.barX, y, w, h, h / 2);
    this.bar.lineStyle(1, Palette.timberLight, 0.35);
    for (let i = 1; i < BREAD_CAP; i++) {
      const x = this.barX + (w * i) / BREAD_CAP;
      this.bar.lineBetween(x, y + scaled(3), x, y + h - scaled(3));
    }
  }

  /** The grain in it. Fills to the count, and grows there in front of the player. */
  private growBar(instant = false): void {
    const w = scaled(BAR.w);
    const h = scaled(BAR.h);
    const y = scaled(27) - h / 2;
    const target = (w * Math.min(BREAD_CAP, this.shown.bread)) / BREAD_CAP;
    const paint = (len: number): void => {
      this.fill.clear();
      if (len < 2) return;
      this.fill.fillStyle(Palette.rye, 0.95).fillRoundedRect(this.barX, y, len, h, h / 2);
      // A lighter crust along the top, so it reads as grain rather than a value.
      this.fill.fillStyle(Palette.ryeBright, 0.5).fillRoundedRect(this.barX + 2, y + 2, Math.max(0, len - 4), h * 0.32, h * 0.16);
    };
    this.scene.tweens.killTweensOf(this.fill);
    if (instant) {
      this.fillLen = target;
      paint(target);
      return;
    }
    const from = this.fillLen;
    this.scene.tweens.addCounter({
      from,
      to: target,
      duration: 620,
      ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        this.fillLen = tw.getValue() ?? target;
        paint(this.fillLen);
      },
    });
  }

  /**
   * The map, rolled: a sheet wound on itself, seen end on. Lit when the
   * pointer is over it, so it is obvious the thing can be picked up.
   */
  private drawRoll(lit: boolean): void {
    const w = scaled(ROLL.w);
    const h = scaled(ROLL.h);
    const g = this.roll;
    g.clear();
    const paper = lit ? 0xe8dcc0 : 0xcbbb98;
    g.fillStyle(paper, lit ? 1 : 0.9).fillRoundedRect(-w / 2, -h / 2, w, h, scaled(5));
    g.lineStyle(1, Palette.peat, 0.7).strokeRoundedRect(-w / 2, -h / 2, w, h, scaled(5));
    // The wound ends, and a hint of the ink inside.
    g.fillStyle(0xb3a179, 1).fillRoundedRect(-w / 2 - scaled(3), -h / 2 - scaled(3), scaled(9), h + scaled(6), scaled(4));
    g.fillStyle(0xb3a179, 1).fillRoundedRect(w / 2 - scaled(6), -h / 2 - scaled(3), scaled(9), h + scaled(6), scaled(4));
    g.lineStyle(1, Palette.peat, 0.45);
    g.lineBetween(-w / 2 + scaled(12), -scaled(4), w / 2 - scaled(12), -scaled(4));
    g.lineBetween(-w / 2 + scaled(12), scaled(3), w / 2 - scaled(16), scaled(3));
  }
}
