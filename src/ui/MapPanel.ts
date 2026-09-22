import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { atlas, type Place, type PlaceId, type Way } from '../core/atlas';
import { once } from '../core/once';
import { mapUi } from '../content/script';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { makeParchment } from '../fx/textures';
import { keysOf } from './keys';
import { signEnd, walkSign, type SignKey } from './Sign';
import { audio } from '../core/audio';

/**
 * The map, unrolled.
 *
 * Everything on it is drawn rather than painted, and deliberately: this is the
 * one surface in the game the villager made himself. Ink on a rubbed sheet,
 * lines that wobble because a hand drew them, a mill in the north he has not
 * been able to reach since the spring.
 *
 * Its job is to answer the question the corner of the screen could not: not
 * "how many ways out are open" but "where do they go, and what is stopping
 * me". A place the player cannot reach yet carries the reason underneath it,
 * so a shut road reads as the next thing to do rather than as a wall.
 *
 * The sheet is a fixed size on the 1920x1080 canvas — it is a modal, so it can
 * have the whole screen — and only the lettering follows the device type
 * scale, which is what keeps it legible on a phone.
 */

/** The sheet, centred. */
const SHEET = { w: 1480, h: 830 };
/** The board coordinates `core/atlas.ts` works in. */
const BOARD = { w: 1000, h: 560 };

/** Where each name sits relative to its drawing: below when positive. */
const LABEL_AT: Record<string, number> = {
  village: 58,
  field: 48,
  bog: 76,
  mill: -62,
  beyond: -30,
};

/** The seal a finished errand is stamped with, and the ink of its note. */
const SEAL = 0x7e2f24;
const SEAL_HEX = '#7a2e22';
const PAPER = 0xd8c39a;

/** Which mark each place is stamped with once its encounter is behind you. */
const STAMP: Partial<Record<Place['id'], { sign: SignKey; dx: number; dy: number }>> = {
  field: { sign: 'jumis', dx: -96, dy: -34 },
  bog: { sign: 'crossing', dx: 140, dy: -34 },
};

const INK = 0x3a2a18;
const INK_HEX = '#3a2a18';
const INK_FAINT_HEX = '#7a6446';
const WATER = 0x51697a;

export class MapPanel {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container | null = null;
  private offLang: (() => void) | null = null;
  /** The seals on this sheet, so the unroll can press them in. */
  private stamps: Phaser.GameObjects.Container[] = [];
  /** True while the sheet being built is the one unrolling now, not a language redraw. */
  private unrolling = false;
  /** The line along the foot of the sheet: what a touched place is. */
  private caption: Phaser.GameObjects.Text | null = null;
  /** The place touched last, so a second touch on it can mean "go". */
  private armed: PlaceId | null = null;
  /**
   * Given in the village: walks the player to a place, as its path would.
   * Returns false if the place cannot be walked to from here.
   */
  private travel: ((id: PlaceId) => boolean) | null;

  constructor(scene: Phaser.Scene, opts: { travel?: (id: PlaceId) => boolean } = {}) {
    this.scene = scene;
    this.travel = opts.travel ?? null;
    makeParchment(scene);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.close());
  }

  get isOpen(): boolean {
    return this.root !== null;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    keysOf(this.scene).modal = true;
    audio.play('paper');
    this.armed = null;
    this.build(true);
    this.offLang = i18n.onChange(() => {
      this.root?.destroy(true);
      this.build(false);
    });
  }

  close(): void {
    if (!this.root) return;
    audio.play('paper', { volume: 0.25, rate: 1.4 });
    this.root.destroy(true);
    this.caption = null;
    this.root = null;
    this.offLang?.();
    this.offLang = null;
    keysOf(this.scene).modal = false;
  }

  // --- drawing ---------------------------------------------------------------

  private build(unroll: boolean): void {
    const { width, height } = Layout;
    const a = atlas();
    this.unrolling = unroll;

    const veil = this.scene.add.rectangle(width / 2, height / 2, width, height, Palette.ink, 0.88);
    const hit = this.scene.add.zone(width / 2, height / 2, width, height).setInteractive();
    hit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.close();
    });

    // The sheet, and everything drawn on it, in one container so the unroll
    // can scale the lot.
    const sheet = this.scene.add.container(width / 2, height / 2);
    const paper = this.scene.add.image(0, 0, 'fx-parchment').setDisplaySize(SHEET.w, SHEET.h);
    sheet.add(paper);

    // Board space -> sheet space. The board is inset so nothing runs into the
    // rubbed edge of the paper.
    const pad = 70;
    const k = Math.min((SHEET.w - pad * 2) / BOARD.w, (SHEET.h - pad * 2) / BOARD.h);
    const bx = (x: number): number => (x - BOARD.w / 2) * k;
    const by = (y: number): number => (y - BOARD.h / 2) * k + scaled(10);

    const ink = this.scene.add.graphics();
    sheet.add(ink);

    // A border ruled just inside the edge, the way a hand-drawn map is.
    ink.lineStyle(3, INK, 0.5);
    this.wobble(ink, rect(-SHEET.w / 2 + 30, -SHEET.h / 2 + 30, SHEET.w - 60, SHEET.h - 60), 2.2);
    ink.lineStyle(1, INK, 0.32);
    this.wobble(ink, rect(-SHEET.w / 2 + 38, -SHEET.h / 2 + 38, SHEET.w - 76, SHEET.h - 76), 1.6);

    this.drawForest(ink, a, bx, by);
    this.drawWater(ink, a.water.map(([x, y]) => [bx(x), by(y)]), a.bog, bx, by);
    this.stamps = [];
    const labels: Phaser.GameObjects.GameObject[] = [];
    a.ways.forEach((w) => labels.push(...this.drawWay(ink, w, bx, by)));

    a.places.forEach((p) => labels.push(...this.drawPlace(ink, p, bx, by)));
    sheet.add(labels);

    // What a place is, said along the foot of the sheet when it is touched.
    this.caption = this.scene.add
      .text(0, SHEET.h / 2 - 62, t(mapUi.hint), {
        fontFamily: Fonts.body,
        fontSize: px(24),
        color: INK_FAINT_HEX,
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: SHEET.w - 200 },
      })
      .setOrigin(0.5, 1);
    sheet.add(this.caption);
    a.places.forEach((p) => sheet.add(this.placeHit(p, bx(p.x), by(p.y))));

    // Heading, in the top-left of the sheet where a map's title belongs.
    const heading = this.scene.add
      .text(-SHEET.w / 2 + 62, -SHEET.h / 2 + 46, t(mapUi.heading), {
        fontFamily: Fonts.display,
        fontSize: px(30),
        color: INK_HEX,
      })
      .setOrigin(0, 0);
    heading.setLetterSpacing?.(scaled(3));
    const rule = this.scene.add.graphics();
    rule.lineStyle(2, INK, 0.45);
    rule.lineBetween(
      -SHEET.w / 2 + 62,
      -SHEET.h / 2 + 50 + heading.height,
      -SHEET.w / 2 + 62 + heading.width,
      -SHEET.h / 2 + 50 + heading.height,
    );
    sheet.add([heading, rule]);
    sheet.add(this.compass(SHEET.w / 2 - 118, -SHEET.h / 2 + 104));

    const foot = this.scene.add
      .text(width / 2, height - scaled(26), t(mapUi.close), {
        fontFamily: Fonts.body,
        fontSize: px(17),
        color: Hex.parchmentDim,
      })
      .setOrigin(0.5, 1);

    // Under the top chips (900) so the language can still be switched, over
    // the corner furniture (880).
    this.root = this.scene.add.container(0, 0, [veil, hit, sheet, foot]).setDepth(890);

    if (!unroll) return;
    // It unrolls: the sheet opens from a line, with a touch of overshoot.
    veil.setAlpha(0);
    foot.setAlpha(0);
    sheet.setScale(1, 0.04);
    this.scene.tweens.add({ targets: veil, alpha: 0.88, duration: 260 });
    this.scene.tweens.add({ targets: sheet, scaleY: 1, duration: 520, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: foot, alpha: 1, duration: 300, delay: 420 });
    // The seals are pressed on once the sheet is open, one after the other.
    this.stamps.forEach((st, i) => {
      st.setScale(1.6).setAlpha(0);
      this.scene.tweens.add({
        targets: st,
        scale: 1,
        alpha: 1,
        duration: 260,
        delay: 560 + i * 180,
        ease: 'Quad.easeIn',
      });
    });
  }

  // --- the pieces -------------------------------------------------------------

  /** The stream, and the bog it runs into. Blue-grey, under the roads. */
  private drawWater(
    g: Phaser.GameObjects.Graphics,
    stream: Array<[number, number]>,
    bog: { x: number; y: number; rx: number; ry: number },
    bx: (n: number) => number,
    by: (n: number) => number,
  ): void {
    g.lineStyle(3, WATER, 0.5);
    this.wobble(g, smooth(stream), 1.8, true);

    // The bog: an outline of tussocks with reed ticks inside it, not a puddle.
    const cx = bx(bog.x);
    const cy = by(bog.y);
    const rx = bog.rx * 1.2;
    const ry = bog.ry * 1.2;
    const ring: Array<[number, number]> = [];
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const wob = 0.93 + ((i * 37) % 13) / 96;
      ring.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
    }
    g.lineStyle(3, WATER, 0.6);
    this.wobble(g, smooth(ring, 3), 1.2);
    // Open water inside it, ruled the way a surveyor rules a marsh.
    g.lineStyle(2, WATER, 0.34);
    for (let i = -2; i <= 2; i++) {
      const y0 = cy + i * (ry * 0.34);
      const half = rx * 0.78 * Math.sqrt(Math.max(0, 1 - (i * 0.34) ** 2));
      g.lineBetween(cx - half, y0, cx + half, y0);
    }
  }

  /**
   * The forest, which is everything that is not the valley.
   *
   * Scattered rather than placed: little firs over the whole sheet, thrown out
   * wherever they would fall on a road, a place or the water. It fills the
   * corners the way a real map of a clearing in the woods is filled, and it is
   * what stops the sheet reading as four icons on blank paper.
   */
  private drawForest(
    g: Phaser.GameObjects.Graphics,
    a: ReturnType<typeof atlas>,
    bx: (n: number) => number,
    by: (n: number) => number,
  ): void {
    const road = a.ways.flatMap((w) => w.points);
    const clear = (x: number, y: number): boolean => {
      if (a.places.some((p) => Math.hypot(p.x - x, p.y - y) < 122)) return false;
      if (road.some(([rx, ry]) => Math.hypot(rx - x, ry - y) < 52)) return false;
      return !a.water.some(([wx, wy]) => Math.hypot(wx - x, wy - y) < 50);
    };

    let seed = 77771;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    g.lineStyle(2, INK, 0.34);
    for (let i = 0; i < 300; i++) {
      const x = 26 + rnd() * 948;
      const y = 26 + rnd() * 508;
      if (!clear(x, y)) continue;
      const h = 21 + rnd() * 13;
      const px0 = bx(x);
      const py0 = by(y);
      // A fir in four strokes: a trunk and three skirts, widest at the foot.
      g.lineBetween(px0, py0, px0, py0 - h * 0.26);
      [
        [0.26, 0.56, 0.62],
        [0.5, 0.8, 0.44],
        [0.74, 1, 0.26],
      ].forEach(([lo, hi, wide]) => {
        g.beginPath();
        g.moveTo(px0 - h * wide, py0 - h * lo);
        g.lineTo(px0, py0 - h * hi);
        g.lineTo(px0 + h * wide, py0 - h * lo);
        g.strokePath();
      });
    }
  }

  /**
   * A way, drawn as what it is underfoot: a cart road as two ruled lines, a
   * footpath as dashes. A way that cannot be walked is drawn faintly — it is
   * still there, which is the point — and a break in it gets a mark, because
   * the missing thing is the interesting thing.
   */
  private drawWay(
    g: Phaser.GameObjects.Graphics,
    w: Way,
    bx: (n: number) => number,
    by: (n: number) => number,
  ): Phaser.GameObjects.GameObject[] {
    const pts = smooth(w.points.map(([x, y]) => [bx(x), by(y)] as [number, number]));
    const alpha = w.open ? 0.88 : 0.3;

    // A road the player opened this year is gone over in gold underneath, the
    // way you would mark the road you had just walked on a map you kept.
    if (w.bridge) {
      g.lineStyle(22, Palette.rye, 0.5);
      this.wobble(g, pts, 0.8, true);
    }
    const gap = w.breakAt ? [bx(w.breakAt[0]), by(w.breakAt[1])] : null;
    const cut = (p: [number, number]): boolean =>
      gap !== null && Phaser.Math.Distance.Between(p[0], p[1], gap[0], gap[1]) < 26;

    if (w.kind === 'cart') {
      [-4, 4].forEach((off) => {
        g.lineStyle(w.open ? 2.5 : 2, INK, alpha);
        this.wobble(g, offsetPath(pts, off).filter((p) => !cut(p)), 1.4, true);
      });
    } else {
      g.lineStyle(3, INK, alpha);
      dashes(pts, 15, 11)
        .filter(([a, b]) => !cut(a) && !cut(b))
        .forEach(([a, b]) => g.lineBetween(a[0], a[1], b[0], b[1]));
    }

    if (w.bridge) {
      // The first time the sheet is opened with the bridge on it, the old
      // cross is struck out and the bridge drawn in, in front of the player.
      const reveal = this.unrolling && once.mark('map:bridge');
      return this.drawBridge(g, bx(w.bridge.at[0]), by(w.bridge.at[1]), w.bridge.sound, reveal);
    }
    if (!gap) return [];
    // The break: a short stroke across the way, the way you cross something
    // out on a map you keep.
    g.lineStyle(3, INK, 0.62);
    g.lineBetween(gap[0] - 13, gap[1] - 13, gap[0] + 13, gap[1] + 13);
    g.lineBetween(gap[0] + 13, gap[1] - 13, gap[0] - 13, gap[1] + 13);
    return [];
  }

  /**
   * The bridge the Devil built, drawn where the cross used to be. It has to be
   * unmissable: it is the one thing on the sheet the player made. A sound
   * bridge is a planked deck on stone footings; a poor one is two logs.
   */
  private drawBridge(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    sound: boolean,
    reveal: boolean,
  ): Phaser.GameObjects.GameObject[] {
    const half = 46;
    // Paper over the water and the ruts where the deck sits.
    g.fillStyle(PAPER, 1).fillRect(x - half - 4, y - 13, half * 2 + 8, 26);
    const gb = this.scene.add.graphics();
    if (sound) {
      gb.fillStyle(INK, 0.85);
      gb.fillRect(x - half - 8, y - 14, 10, 28);
      gb.fillRect(x + half - 2, y - 14, 10, 28);
      gb.lineStyle(3.5, INK, 0.95);
      gb.lineBetween(x - half, y - 10, x + half, y - 10);
      gb.lineBetween(x - half, y + 10, x + half, y + 10);
      gb.lineStyle(2, INK, 0.75);
      for (let px0 = x - half + 7; px0 < x + half; px0 += 9) gb.lineBetween(px0, y - 10, px0, y + 10);
    } else {
      gb.lineStyle(3, INK, 0.85);
      this.wobble(gb, [[x - half, y - 5], [x + half, y - 7]], 1.5, true);
      this.wobble(gb, [[x - half, y + 6], [x + half, y + 4]], 1.5, true);
    }
    const label = this.scene.add
      .text(x, y + 22, t(mapUi.bridge), {
        fontFamily: Fonts.body,
        fontSize: px(21),
        color: SEAL_HEX,
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);
    if (!reveal) return [gb, label];

    // The old cross, as it was the last time this sheet was opened...
    const cross = this.scene.add.graphics();
    cross.lineStyle(3, INK, 0.62);
    cross.lineBetween(x - 13, y - 13, x + 13, y + 13);
    cross.lineBetween(x + 13, y - 13, x - 13, y + 13);
    // ...struck through with one stroke of the pen, then gone...
    const strike = this.scene.add.graphics();
    gb.setAlpha(0);
    label.setAlpha(0);
    const k = { v: 0 };
    this.scene.tweens.add({
      targets: k,
      v: 1,
      delay: 900,
      duration: 380,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        strike.clear();
        strike.lineStyle(4, SEAL, 0.9);
        strike.lineBetween(x - 34, y + 6, x - 34 + 68 * k.v, y + 6 - 12 * k.v);
      },
      onComplete: () => {
        audio.carve();
        this.scene.tweens.add({ targets: [cross, strike], alpha: 0, duration: 420, delay: 200 });
        // ...and the bridge drawn in where it stood.
        this.scene.tweens.add({ targets: gb, alpha: 1, duration: 600, delay: 450, ease: 'Sine.easeOut' });
        this.scene.tweens.add({ targets: label, alpha: 1, duration: 500, delay: 900 });
      },
    });
    return [cross, strike, gb, label];
  }

  /**
   * A touch target over a place. The first touch says what it is along the foot
   * of the sheet; in the village, a place that can be walked to goes on a
   * second touch — so a player reading the map never walks off by accident.
   */
  private placeHit(p: Place, x: number, y: number): Phaser.GameObjects.Zone {
    const zone = this.scene.add.zone(x, y, 190, 150).setInteractive({ useHandCursor: true });
    const canGo = (): boolean => !!this.travel && (p.id === 'field' || p.id === 'bog') && p.state === 'open';
    const say = (): void => {
      if (!this.caption) return;
      const line = this.lineFor(p);
      this.caption.setText(canGo() ? `${t(line)}  ${t(mapUi.go)}` : t(line));
      this.caption.setColor(INK_HEX);
    };
    zone.on('pointerover', () => {
      // With a mouse, pointing is the first touch: one click then goes.
      this.armed = p.id;
      say();
    });
    zone.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      if (canGo() && this.armed === p.id) {
        audio.play('click');
        this.close();
        this.travel?.(p.id);
        return;
      }
      this.armed = p.id;
      audio.play('hover');
      say();
    });
    return zone;
  }

  private lineFor(p: Place): Loc {
    const l = mapUi.lines;
    switch (p.id) {
      case 'village':
        return l.village;
      case 'field':
        return l.field;
      case 'bog':
        return l.bog;
      case 'beyond':
        return p.state === 'open' ? l.beyondOpen : l.beyondShut;
      case 'mill':
        return l.mill;
    }
  }

  /**
   * The seal on a finished errand: a disc of red wax with the encounter's own
   * mark pressed into it — the same mark the reckoning carved.
   */
  private stamp(x: number, y: number, sign: SignKey, whole: boolean): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    const r = 34;
    // A wax edge is never a circle.
    const edge: Array<[number, number]> = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const k = 1 + (((i * 53) % 7) - 3) / 40;
      edge.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
    }
    g.fillStyle(SEAL, 0.92);
    g.fillPoints(edge.map(([ex, ey]) => new Phaser.Math.Vector2(ex, ey)), true);
    g.lineStyle(1.5, 0xe8c9a8, 0.45).strokeCircle(0, 0, r - 5);
    g.lineStyle(3.5, 0xf0dcc0, 0.95);
    walkSign(sign, signEnd(whole), (ax, ay, bx2, by2) => {
      const k = 14.5;
      g.lineBetween(ax * k, ay * k, bx2 * k, by2 * k);
    });
    return this.scene.add.container(x, y, [g]).setAngle(-8);
  }

  /** A place: its little drawing, its name, and the reason it is shut. */
  private drawPlace(
    g: Phaser.GameObjects.Graphics,
    p: Place,
    bx: (n: number) => number,
    by: (n: number) => number,
  ): Phaser.GameObjects.GameObject[] {
    const x = bx(p.x);
    const y = by(p.y);
    const shut = p.state === 'shut';
    const alpha = shut ? 0.4 : 0.92;
    g.lineStyle(3, INK, alpha);

    switch (p.id) {
      case 'village':
        hut(g, x - 38, y + 4, 36, 30);
        hut(g, x + 6, y - 8, 42, 36);
        hut(g, x + 52, y + 6, 30, 25);
        // The stone in the middle of it, which is where the run ends.
        g.fillStyle(INK, 0.65).fillCircle(x + 4, y + 22, 5);
        // Where you are. Nothing else on the sheet is ringed.
        g.lineStyle(2, INK, 0.5);
        this.wobble(
          g,
          circle(x + 4, y - 6, 74, 60),
          2.4,
        );
        break;
      case 'field':
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 3; j++) {
            const sx = x - 44 + i * 24;
            const sy = y - 20 + j * 20;
            g.lineBetween(sx, sy + 12, sx, sy);
            g.lineBetween(sx, sy, sx - 6, sy - 9);
            g.lineBetween(sx, sy, sx + 6, sy - 9);
          }
        }
        break;
      case 'bog':
        // The water is drawn by the pass before this one; these are the
        // tussocks you actually step on.
        g.lineStyle(3, INK, alpha * 0.85);
        [-40, -2, 38].forEach((o, i) => {
          const ty = y + (i === 1 ? -18 : 12);
          g.strokeEllipse(x + o, ty, 22, 11);
          g.lineBetween(x + o - 6, ty - 5, x + o - 9, ty - 19);
          g.lineBetween(x + o + 4, ty - 5, x + o + 9, ty - 17);
        });
        break;
      case 'mill':
        hut(g, x, y, 48, 42);
        // The wheel on its stream side.
        g.strokeCircle(x - 36, y - 8, 17);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.lineBetween(x - 36, y - 8, x - 36 + Math.cos(a) * 17, y - 8 + Math.sin(a) * 17);
        }
        break;
      case 'beyond': {
        // No drawing: a road running off the edge, which is the whole idea.
        g.lineStyle(4, INK, alpha);
        [0, 1, 2].forEach((i) => {
          const d = i * 20;
          g.lineBetween(x + d, y - d * 0.3, x + d + 13, y - d * 0.3 - 9);
        });
        break;
      }
    }

    const drop = LABEL_AT[p.id];
    const below = drop > 0;
    const name = this.scene.add
      .text(x, y + drop, t(p.name), {
        fontFamily: Fonts.display,
        fontSize: px(p.id === 'village' ? 30 : 27),
        color: shut ? INK_FAINT_HEX : INK_HEX,
        align: 'center',
      })
      .setOrigin(0.5, below ? 0 : 1);
    const out: Phaser.GameObjects.GameObject[] = [name];

    const seal = p.done ? STAMP[p.id] : undefined;
    if (seal) {
      const st = this.stamp(x + seal.dx, y + seal.dy, seal.sign, p.whole);
      this.stamps.push(st);
      out.push(st);
    }

    if (!p.note) return out;
    const note = this.scene.add
      .text(x, below ? name.y + name.height + scaled(2) : name.y - name.height - scaled(2), t(p.note), {
        fontFamily: Fonts.body,
        fontSize: px(21),
        color: p.done ? SEAL_HEX : INK_FAINT_HEX,
        fontStyle: 'italic',
        align: 'center',
      })
      .setOrigin(0.5, below ? 0 : 1);
    out.push(note);
    return out;
  }

  /** North, marked the way every old map marks it. */
  private compass(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    g.lineStyle(2, INK, 0.6);
    g.strokeCircle(0, 0, 30);
    g.lineStyle(2, INK, 0.75);
    g.lineBetween(0, 22, 0, -30);
    g.lineBetween(0, -30, -7, -18);
    g.lineBetween(0, -30, 7, -18);
    g.lineBetween(-16, 0, 16, 0);
    const n = this.scene.add
      .text(0, -40, t(mapUi.north), { fontFamily: Fonts.display, fontSize: px(19), color: INK_HEX })
      .setOrigin(0.5, 1);
    return this.scene.add.container(x, y, [g, n]);
  }

  /**
   * Strokes a path with a small deterministic waver, so every line on the
   * sheet looks drawn by a hand rather than ruled by a machine. The whole
   * character of the map is in this function.
   */
  private wobble(
    g: Phaser.GameObjects.Graphics,
    pts: Array<[number, number]>,
    amount: number,
    open = false,
  ): void {
    if (pts.length < 2) return;
    let s = Math.round(pts[0][0] * 7 + pts[0][1] * 13) + 9973;
    const jit = (): number => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return (s / 4294967296 - 0.5) * 2 * amount;
    };
    g.beginPath();
    g.moveTo(pts[0][0] + jit(), pts[0][1] + jit());
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + jit(), pts[i][1] + jit());
    if (!open) g.closePath();
    g.strokePath();
  }
}

// --- small drawing helpers ------------------------------------------------------

/** A gabled hut, seen from the side: four walls and a roof. */
function hut(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const half = w / 2;
  g.beginPath();
  g.moveTo(x - half, y);
  g.lineTo(x - half, y - h * 0.5);
  g.lineTo(x, y - h);
  g.lineTo(x + half, y - h * 0.5);
  g.lineTo(x + half, y);
  g.closePath();
  g.strokePath();
}

/** An ellipse as points, for the hand-drawn stroke. */
function circle(cx: number, cy: number, rx: number, ry: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

const rect = (x: number, y: number, w: number, h: number): Array<[number, number]> => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** Catmull-Rom through the control points, so a road bends instead of kinking. */
function smooth(pts: Array<[number, number]>, per = 8): Array<[number, number]> {
  if (pts.length < 3) return pts;
  const out: Array<[number, number]> = [];
  const at = (i: number): [number, number] => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let j = 0; j < per; j++) {
      const s = j / per;
      const s2 = s * s;
      const s3 = s2 * s;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** The same path, shifted sideways — the second rut of a cart road. */
function offsetPath(pts: Array<[number, number]>, by: number): Array<[number, number]> {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / len) * by, p[1] + (dx / len) * by] as [number, number];
  });
}

/** A path cut into dashes of roughly `on` length with `off` between them. */
function dashes(
  pts: Array<[number, number]>,
  on: number,
  off: number,
): Array<[[number, number], [number, number]]> {
  const out: Array<[[number, number], [number, number]]> = [];
  let carried = 0;
  let drawing = true;
  let start: [number, number] = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    let seg = Phaser.Math.Distance.Between(a[0], a[1], b[0], b[1]);
    let t0 = 0;
    while (seg - t0 > 0.001) {
      const want = (drawing ? on : off) - carried;
      const take = Math.min(want, seg - t0);
      const from: [number, number] = [
        Phaser.Math.Linear(a[0], b[0], t0 / seg),
        Phaser.Math.Linear(a[1], b[1], t0 / seg),
      ];
      const to: [number, number] = [
        Phaser.Math.Linear(a[0], b[0], (t0 + take) / seg),
        Phaser.Math.Linear(a[1], b[1], (t0 + take) / seg),
      ];
      if (drawing) out.push([i === 1 && t0 === 0 ? start : from, to]);
      t0 += take;
      carried += take;
      if (carried >= (drawing ? on : off) - 0.001) {
        carried = 0;
        drawing = !drawing;
        start = to;
      }
    }
  }
  return out;
}
