import Phaser from 'phaser';
import { i18n, t } from '../core/i18n';
import { village } from '../content/script';
import {
  BREAD_CAP,
  ROAD_CAP,
  type Holdings as Held,
  type HoldingsSource,
  type RoadState,
  holdings,
  roadsOpen,
} from '../core/holdings';
import { state } from '../core/state';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { audio } from '../core/audio';

/**
 * The village's standing, in the top-right corner, for the whole game.
 *
 * Two rows, because the village only thinks about two things. Bread is what
 * the harvest came to once Anna threshed it; roads are the ways out of the
 * valley, drawn joined so it is obvious they lead somewhere. Both rows are
 * exactly as long as the year can fill.
 */
const BREAD_PITCH = 21;
const BREAD_W = 15;
const BREAD_H = 17;
const ROAD_PITCH = 34;
const ROAD_R = 7;

export class Holdings {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private counts: Phaser.GameObjects.Text[] = [];
  /** One graphic per cell and per road link, so each can be tweened on its own. */
  private cells: Phaser.GameObjects.Graphics[] = [];
  private nodes: Phaser.GameObjects.Graphics[] = [];
  private links: Phaser.GameObjects.Graphics;
  private shown: Held;
  private offLang: () => void;

  /**
   * `from` is the state the player was last shown here. Passing what they left
   * with means a mark earned while they were away is still empty when they
   * walk back in, and fills a moment later in front of them — which is the
   * whole reason for having it on screen.
   */
  constructor(scene: Phaser.Scene, from?: HoldingsSource) {
    this.scene = scene;
    this.shown = holdings(from ?? state.get());

    this.plate = scene.add.graphics();
    this.links = scene.add.graphics();

    [village.measures.grain, village.measures.roads].forEach((loc) => {
      const label = scene.add.text(0, 0, t(loc).toUpperCase(), {
        fontFamily: Fonts.body,
        fontSize: px(17),
        color: Hex.parchmentDim,
      });
      label.setLetterSpacing?.(scaled(2));
      this.labels.push(label);
      this.counts.push(
        scene.add
          .text(0, 0, '', { fontFamily: Fonts.display, fontSize: px(23), color: Hex.rye })
          .setOrigin(1, 0),
      );
    });

    for (let i = 0; i < BREAD_CAP; i++) this.cells.push(scene.add.graphics());
    for (let i = 0; i < ROAD_CAP; i++) this.nodes.push(scene.add.graphics());

    this.root = scene.add
      .container(0, Layout.margin + scaled(48), [
        this.plate,
        this.links,
        ...this.labels,
        ...this.counts,
        ...this.cells,
        ...this.nodes,
      ])
      .setDepth(880);

    this.offLang = i18n.onChange(() => {
      this.labels[0].setText(t(village.measures.grain).toUpperCase());
      this.labels[1].setText(t(village.measures.roads).toUpperCase());
      this.layout();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());

    this.layout();
    this.paintAll();
  }

  /** Screen y of the panel's bottom edge, for anything that wants to sit under it. */
  get bottom(): number {
    return this.root.y + this.plateH;
  }

  private get plateH(): number {
    return scaled(14) + 2 * scaled(38) + scaled(2);
  }

  /** Screen position of the next empty bread cell — where a threshed loaf flies to. */
  get breadSlot(): { x: number; y: number } {
    const i = Math.min(this.shown.bread, BREAD_CAP - 1);
    const g = this.cells[i];
    return { x: this.root.x + g.x + scaled(BREAD_W) / 2, y: this.root.y + g.y };
  }

  /** Fills one more bread cell, in front of the player: a loaf arriving. */
  addLoaf(): void {
    if (this.shown.bread >= BREAD_CAP) return;
    const i = this.shown.bread;
    this.shown = { ...this.shown, bread: i + 1 };
    this.layout();
    const g = this.cells[i];
    this.paintCell(g, true);
    g.setScale(0.2);
    this.scene.tweens.add({ targets: g, scale: 1, duration: 520, ease: 'Back.easeOut' });
    this.pulse();
    audio.play('tally', { volume: 0.5 });
  }

  /** A brief brightening of the whole panel, so the eye goes to it. */
  pulse(): void {
    this.scene.tweens.add({ targets: this.plate, alpha: { from: 0.4, to: 1 }, duration: 500, ease: 'Quad.easeOut' });
  }

  /**
   * Re-reads the run. `animate` fills whatever is new with a beat of its own
   * and the tally sound — the village saying, in its own corner, what the walk
   * was worth.
   */
  refresh(animate = false): void {
    const want = holdings();
    const gainedBread = want.bread > this.shown.bread;
    const openedRoad = roadsOpen(want) > roadsOpen(this.shown);
    const was = this.shown;
    this.shown = want;
    this.layout();
    this.paintAll();

    if (!animate) return;
    if (gainedBread) {
      for (let i = was.bread; i < want.bread; i++) {
        const g = this.cells[i];
        g.setScale(0.2);
        this.scene.tweens.add({
          targets: g,
          scale: 1,
          duration: 520,
          delay: (i - was.bread) * 110,
          ease: 'Back.easeOut',
        });
      }
    }
    if (openedRoad) {
      want.roads.forEach((r, i) => {
        if (r === 'none' || was.roads[i] !== 'none') return;
        const g = this.nodes[i];
        g.setScale(0.2);
        this.scene.tweens.add({ targets: g, scale: 1, duration: 520, ease: 'Back.easeOut' });
      });
    }
    if (gainedBread || openedRoad) audio.play('tally', { volume: 0.5 });
  }

  /**
   * Lays the panel out and hangs it off the right edge, mirroring the
   * objective's overhang on the left. Redone whenever the words change, so
   * switching language cannot leave the marks sitting on top of a label.
   */
  private layout(): void {
    const padX = scaled(18);
    const rowH = scaled(38);
    const top = scaled(14);
    const labelW = Math.max(...this.labels.map((l) => l.width));
    const marksLeft = padX + labelW + scaled(20);
    const marksW = Math.max(
      BREAD_CAP * scaled(BREAD_PITCH) - (scaled(BREAD_PITCH) - scaled(BREAD_W)),
      (ROAD_CAP - 1) * scaled(ROAD_PITCH) + 2 * scaled(ROAD_R),
    );

    this.counts.forEach((c, i) => {
      c.setText(String(i === 0 ? this.shown.bread : roadsOpen(this.shown)));
    });
    const numW = Math.max(...this.counts.map((c) => c.width));
    const w = marksLeft + marksW + scaled(22) + numW + padX;

    this.labels.forEach((l, i) => l.setPosition(padX, top + i * rowH + scaled(8)));
    this.counts.forEach((c, i) => c.setPosition(w - padX, top + i * rowH + scaled(3)));

    const breadY = top + scaled(19);
    this.cells.forEach((g, i) => g.setPosition(marksLeft + i * scaled(BREAD_PITCH), breadY));
    const roadY = top + rowH + scaled(19);
    this.nodes.forEach((g, i) =>
      g.setPosition(marksLeft + scaled(ROAD_R) + i * scaled(ROAD_PITCH), roadY),
    );

    const h = this.plateH;
    this.plate
      .clear()
      .fillStyle(Palette.ink, 0.62)
      .fillRoundedRect(0, 0, w, h, scaled(8))
      .lineStyle(1, Palette.rye, 0.28)
      .strokeRoundedRect(0, 0, w, h, scaled(8));

    // Hung past the screen edge by the same amount the objective hangs past the
    // left one, so the two corners read as one piece of furniture.
    this.root.setX(Layout.width - Layout.margin + scaled(24) - w);
  }

  private paintAll(): void {
    this.cells.forEach((g, i) => this.paintCell(g, i < this.shown.bread));
    this.shown.roads.forEach((r, i) => this.paintNode(this.nodes[i], r));
    this.paintLinks();
  }

  /** A filled cell is bread the village has; an empty one is room it still has. */
  private paintCell(g: Phaser.GameObjects.Graphics, filled: boolean): void {
    const w = scaled(BREAD_W);
    const h = scaled(BREAD_H);
    g.clear();
    if (filled) {
      g.fillStyle(Palette.rye, 0.92).fillRoundedRect(0, -h / 2, w, h, scaled(5));
      g.lineStyle(1, Palette.ryeBright, 0.85).strokeRoundedRect(0, -h / 2, w, h, scaled(5));
    } else {
      g.lineStyle(1, Palette.timberLight, 0.5).strokeRoundedRect(0, -h / 2, w, h, scaled(5));
    }
  }

  /** Sound roads are filled; a frail one is drawn open, because it can still give way. */
  private paintNode(g: Phaser.GameObjects.Graphics, r: RoadState): void {
    const rad = scaled(ROAD_R);
    g.clear();
    if (r === 'sound') {
      g.fillStyle(Palette.rye, 0.95).fillCircle(0, 0, rad);
      g.lineStyle(1, Palette.ryeBright, 0.9).strokeCircle(0, 0, rad);
    } else if (r === 'frail') {
      g.fillStyle(Palette.ink, 0.9).fillCircle(0, 0, rad);
      g.lineStyle(2, Palette.rye, 0.85).strokeCircle(0, 0, rad);
    } else {
      g.lineStyle(2, Palette.timberLight, 0.5).strokeCircle(0, 0, rad);
    }
  }

  /**
   * The chain between the roads. A link the player has walked is drawn solid;
   * one that leads to somewhere not yet opened is drawn thin, so the row reads
   * as a road that keeps going rather than a row of beads.
   */
  private paintLinks(): void {
    this.links.clear();
    for (let i = 0; i < ROAD_CAP - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const gap = scaled(ROAD_R) + scaled(3);
      const walked = this.shown.roads[i] !== 'none' && this.shown.roads[i + 1] !== 'none';
      this.links
        .lineStyle(walked ? 3 : 2, walked ? Palette.rye : Palette.timberLight, walked ? 0.8 : 0.35)
        .lineBetween(a.x + gap, a.y, b.x - gap, b.y);
    }
  }
}
