import Phaser from 'phaser';
import { fillLoc, i18n, L, t } from '../core/i18n';
import { lore, LORE_SHOWN, type LoreId } from '../core/lore';
import { beliefs } from '../content/ticejumi';
import { loreUi } from '../content/script';
import { Hex, Fonts, Layout, Palette, UI_SCALE, px, scaled } from '../core/theme';
import { keysOf, setModal } from './keys';
import { audio } from '../core/audio';
import { walkSign } from './Sign';
import { makeParchment } from '../fx/textures';

const num = (n: number): { lv: string; en: string } => L(String(n), String(n));

/**
 * The beliefs the player has found, as a book.
 *
 * It used to be a list on a dark page — accurate, and exactly what a settings
 * screen looks like. A collection is worth opening when it looks like one: two
 * leaves of the same old paper the map is drawn on, a contents page first, and
 * then one belief to a page with an ink engraving above it, the way a folklore
 * collector's book is laid out.
 *
 * A belief not yet found keeps its page. The engraving is an empty frame and
 * the text is where to look — so the book is also the list of things to try.
 *
 * Turn with the arrows, the arrow keys, or a swipe. Tapping a line on the
 * contents page opens that belief.
 */
const BOOK = { w: 1640, h: 900 };
const LEAF = BOOK.w / 2;
const INK_HEX = '#3a2a18';
const INK_FAINT = '#7a6446';
const INK = 0x3a2a18;

export class LorePage {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container | null = null;
  private spread: Phaser.GameObjects.Container | null = null;
  private book: Phaser.GameObjects.Container | null = null;
  private offLang: (() => void) | null = null;
  private offUnlock: (() => void) | null = null;
  /** Which pair of leaves is open. 0 is the contents and the first belief. */
  private at = 0;
  private downX: number | null = null;
  private onKey = (ev: KeyboardEvent): void => {
    if (!this.root || ev.repeat) return;
    if (ev.key === 'ArrowRight') this.turn(1);
    else if (ev.key === 'ArrowLeft') this.turn(-1);
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
    setModal(this.scene, this, true);
    audio.play('paper');
    this.at = 0;
    this.build();
    this.scene.input.keyboard?.on('keydown', this.onKey);
    this.offLang = i18n.onChange(() => {
      this.root?.destroy(true);
      this.build();
    });
    // A belief found while the book is open — the cocks crowing behind it —
    // goes onto its page at once, rather than the count reading one short.
    this.offUnlock = lore.onUnlock(() => {
      this.root?.destroy(true);
      this.build();
    });
  }

  close(): void {
    if (!this.root) return;
    this.root.destroy(true);
    this.root = null;
    this.book = null;
    this.spread = null;
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.offLang?.();
    this.offLang = null;
    this.offUnlock?.();
    this.offUnlock = null;
    setModal(this.scene, this, false);
  }

  /** Pages: the contents, then one per belief. Two to a spread. */
  private get spreads(): number {
    return Math.ceil((LORE_SHOWN.length + 1) / 2);
  }

  private build(): void {
    const { width, height } = Layout;
    // Opaque over a full-screen card, whose big pale lettering reads through anything less.
    const veil = this.scene.add.rectangle(width / 2, height / 2, width, height, Palette.ink, keysOf(this.scene).cards > 0 ? 1 : 0.9);
    const hit = this.scene.add.zone(width / 2, height / 2, width, height).setInteractive();
    hit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.close();
    });

    makeParchment(this.scene);
    const book = this.scene.add.container(width / 2, height / 2);
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.45).fillRoundedRect(-BOOK.w / 2 + 14, -BOOK.h / 2 + 18, BOOK.w, BOOK.h, 10);
    const cover = this.scene.add.graphics();
    cover.fillStyle(Palette.peat, 1).fillRoundedRect(-BOOK.w / 2 - 16, -BOOK.h / 2 - 16, BOOK.w + 32, BOOK.h + 32, 14);
    const left = this.scene.add.image(-LEAF / 2, 0, 'fx-parchment').setDisplaySize(LEAF, BOOK.h).setFlipX(true);
    const right = this.scene.add.image(LEAF / 2, 0, 'fx-parchment').setDisplaySize(LEAF, BOOK.h);
    // The gutter: the paper curving down into the spine.
    const gutter = this.scene.add.graphics();
    for (let i = 0; i < 26; i++) {
      gutter.fillStyle(0x3a2a18, 0.022 * (26 - i));
      gutter.fillRect(-i * 2 - 2, -BOOK.h / 2, 4, BOOK.h);
      gutter.fillRect(i * 2 - 2, -BOOK.h / 2, 4, BOOK.h);
    }
    // Taps on the book turn pages or open lines; they must not close it.
    const guard = this.scene.add.zone(0, 0, BOOK.w, BOOK.h).setInteractive();
    guard.on('pointerdown', (p: Phaser.Input.Pointer, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.downX = p.x;
    });
    guard.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.downX === null) return;
      const dx = p.x - this.downX;
      this.downX = null;
      if (Math.abs(dx) > 70) this.turn(dx < 0 ? 1 : -1);
    });
    book.add([shadow, cover, left, right, gutter, guard]);
    this.book = book;

    const prev = this.arrow(-BOOK.w / 2 + 60, BOOK.h / 2 - 50, -1);
    const next = this.arrow(BOOK.w / 2 - 60, BOOK.h / 2 - 50, 1);
    book.add([prev, next]);

    const foot = this.scene.add
      .text(width / 2, height - scaled(18), t(loreUi.close), {
        fontFamily: Fonts.body,
        fontSize: px(17),
        color: Hex.parchmentDim,
      })
      .setOrigin(0.5, 1);

    // The book is drawn at a fixed size and fitted to the screen.
    // Fitted between the chips along the top and the line along the bottom.
    const top = scaled(96);
    const bottom = height - scaled(34);
    const fit = Math.min(1, (bottom - top) / (BOOK.h + 40), (width - 40) / (BOOK.w + 40));
    book.setScale(fit).setY((top + bottom) / 2);

    // Over the corner panels (880); under the top buttons (900).
    this.root = this.scene.add.container(0, 0, [veil, hit, book, foot]).setDepth(890);
    this.fillSpread(0);
  }

  private arrow(x: number, y: number, dir: number): Phaser.GameObjects.Text {
    const a = this.scene.add
      .text(x, y, dir < 0 ? '‹' : '›', { fontFamily: Fonts.display, fontSize: px(64), color: INK_HEX })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    a.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.turn(dir);
    });
    a.setData('dir', dir);
    return a;
  }

  private turn(dir: number): void {
    const to = this.at + dir;
    if (to < 0 || to >= this.spreads) return;
    this.goTo(to, dir);
  }

  private goTo(to: number, dir: number): void {
    if (to === this.at) return;
    this.at = to;
    audio.play('paper', { volume: 0.35, rate: 1.25 });
    this.fillSpread(dir);
  }

  /** Lays out the open pair of leaves. `dir` slides the new one in from that side. */
  private fillSpread(dir: number): void {
    const book = this.book;
    if (!book) return;
    const old = this.spread;
    if (old) {
      this.scene.tweens.add({
        targets: old,
        alpha: 0,
        x: -dir * 60,
        duration: 200,
        ease: 'Quad.easeIn',
        onComplete: () => old.destroy(true),
      });
    }
    const spread = this.scene.add.container(0, 0);
    const pages = [this.at * 2, this.at * 2 + 1];
    pages.forEach((page, side) => {
      const cx = side === 0 ? -LEAF / 2 : LEAF / 2;
      if (page === 0) spread.add(this.contents(cx));
      else if (page - 1 < LORE_SHOWN.length) spread.add(this.beliefPage(cx, LORE_SHOWN[page - 1], page));
    });
    book.add(spread);
    // Arrows only where there is somewhere to go.
    book.list.forEach((o) => {
      const d = (o as Phaser.GameObjects.Text).getData?.('dir');
      if (d === undefined) return;
      const on = (d < 0 && this.at > 0) || (d > 0 && this.at < this.spreads - 1);
      (o as Phaser.GameObjects.Text).setAlpha(on ? 0.85 : 0.15);
      book.bringToTop(o as Phaser.GameObjects.Text);
    });
    this.spread = spread;
    if (dir !== 0) {
      spread.setAlpha(0).setX(dir * 60);
      this.scene.tweens.add({ targets: spread, alpha: 1, x: 0, duration: 260, delay: 120, ease: 'Quad.easeOut' });
    }
  }

  /** The first leaf: the heading, the count, and every belief as a line to tap. */
  private contents(cx: number): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const top = -BOOK.h / 2 + 70;
    const heading = this.scene.add
      .text(cx, top, t(loreUi.heading), { fontFamily: Fonts.display, fontSize: px(46), color: INK_HEX })
      .setOrigin(0.5, 0);
    heading.setLetterSpacing?.(4);
    const count = this.scene.add
      .text(cx, top + heading.height + 6, t(fillLoc(fillLoc(loreUi.found, num(lore.count)), num(lore.total))), {
        fontFamily: Fonts.body,
        fontSize: px(24),
        color: '#8a3b30',
      })
      .setOrigin(0.5, 0);
    const epi = this.scene.add
      .text(cx, count.y + count.height + 18, t(loreUi.epigraph), {
        fontFamily: Fonts.body,
        fontSize: px(21),
        color: INK_FAINT,
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: LEAF - 160 },
      })
      .setOrigin(0.5, 0);
    out.push(heading, count, epi);

    let y = epi.y + epi.height + 40;
    const rowH = Math.min(64, (BOOK.h / 2 - 100 - y) / LORE_SHOWN.length);
    LORE_SHOWN.forEach((id, i) => {
      const found = lore.has(id);
      const x0 = cx - LEAF / 2 + 110;
      const mark = this.scene.add.graphics().setPosition(x0, y + rowH / 2);
      mark.lineStyle(2.5, found ? 0x8a3b30 : INK, found ? 0.95 : 0.3);
      walkSign('jumis', found ? 1 : 0.35, (ax, ay, bx, by) => mark.lineBetween(ax * 9, ay * 9, bx * 9, by * 9));
      const line = this.scene.add
        .text(x0 + 34, y + rowH / 2, found ? t(beliefs[id].title) : t(loreUi.unfound), {
          fontFamily: Fonts.body,
          fontSize: px(29),
          color: found ? INK_HEX : INK_FAINT,
          fontStyle: found ? 'normal' : 'italic',
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      // Leader dots out to the page number, as in any old contents.
      const pageNo = this.scene.add
        .text(cx + LEAF / 2 - 110, y + rowH / 2, String(i + 1), { fontFamily: Fonts.display, fontSize: px(26), color: INK_FAINT })
        .setOrigin(1, 0.5);
      const dots = this.scene.add.graphics();
      dots.fillStyle(INK, 0.35);
      for (let dx = line.x + line.width + 16; dx < pageNo.x - pageNo.width - 12; dx += 12) dots.fillCircle(dx, y + rowH / 2 + 8, 1.6);
      line.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
        ev?.stopPropagation?.();
        const page = i + 1;
        this.goTo(Math.floor(page / 2), 1);
      });
      out.push(mark, line, dots, pageNo);
      y += rowH;
    });
    return out;
  }

  /** One belief: its engraving, its name, and what it says — or where to look. */
  private beliefPage(cx: number, id: LoreId, page: number): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const found = lore.has(id);
    const b = beliefs[id];
    const top = -BOOK.h / 2 + 50;
    // Smaller on a phone, where the words need the room more than the picture.
    const art = UI_SCALE > 1 ? 290 : 380;

    if (found && this.scene.textures.exists(`codex-${id}`)) {
      const img = this.scene.add.image(cx, top + art / 2, `codex-${id}`);
      img.setScale(art / img.height);
      out.push(img);
    } else {
      // An empty frame where the engraving will go.
      const frame = this.scene.add.graphics();
      frame.lineStyle(2, INK, 0.25).strokeEllipse(cx, top + art / 2, art * 0.9, art * 0.78);
      frame.lineStyle(1, INK, 0.18).strokeEllipse(cx, top + art / 2, art * 0.84, art * 0.72);
      const q = this.scene.add
        .text(cx, top + art / 2, '?', { fontFamily: Fonts.display, fontSize: '96px', color: INK_FAINT })
        .setOrigin(0.5)
        .setAlpha(0.35);
      out.push(frame, q);
    }

    let y = top + art + 24;
    const title = this.scene.add
      .text(cx, y, found ? t(b.title) : '· · ·', { fontFamily: Fonts.display, fontSize: px(40), color: found ? INK_HEX : INK_FAINT })
      .setOrigin(0.5, 0);
    out.push(title);
    y += title.height + 14;
    const rule = this.scene.add.graphics();
    rule.lineStyle(1.5, 0x8a3b30, 0.6).lineBetween(cx - 60, y, cx + 60, y);
    out.push(rule);
    y += 22;

    const body = this.scene.add
      .text(cx, y, found ? t(b.text) : t(b.hint), {
        fontFamily: Fonts.body,
        fontSize: px(found ? 33 : 31),
        color: found ? INK_HEX : INK_FAINT,
        fontStyle: found ? 'normal' : 'italic',
        align: 'center',
        wordWrap: { width: LEAF - 110 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);
    out.push(body);
    y += body.height;

    if (found && b.verified && b.ref) {
      const src = this.scene.add
        .text(cx, y + 14, t(fillLoc(b.book === 'teikas' ? loreUi.sourceTale : loreUi.source, L(b.ref, b.ref))), {
          fontFamily: Fonts.body,
          fontSize: px(19),
          color: INK_FAINT,
          fontStyle: 'italic',
        })
        .setOrigin(0.5, 0);
      out.push(src);
      // Counted in the page's height, or a long quote pushes its own
      // citation down onto the folio.
      y += 14 + src.height;
    }

    const folio = this.scene.add
      .text(cx, BOOK.h / 2 - 36, String(page), { fontFamily: Fonts.display, fontSize: px(22), color: INK_FAINT })
      .setOrigin(0.5, 1);
    out.push(folio);

    // A page too full for the leaf at large type is scaled down, not clipped.
    const bottom = y + 16;
    const room = BOOK.h / 2 - 70;
    if (bottom > room) {
      const k = (room - top) / (bottom - top);
      out.forEach((o) => {
        const g = o as unknown as Phaser.GameObjects.Components.Transform;
        if (o === folio) return;
        g.setScale((g.scaleX ?? 1) * k, (g.scaleY ?? 1) * k);
        g.setPosition(cx + (g.x - cx) * k, top + (g.y - top) * k);
      });
    }
    return out;
  }
}

/**
 * The note that a new belief was found: a small plaque that slides in under
 * the corner furniture, with a single kokle note, and goes again.
 */
export function showLoreToast(scene: Phaser.Scene, id: LoreId): void {
  const b = beliefs[id];
  const { width } = Layout;
  const x = width / 2;
  const y = scaled(250);

  const head = scene.add
    .text(0, -scaled(14), t(loreUi.toast).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: px(15),
      color: Hex.rye,
    })
    .setOrigin(0.5, 1);
  head.setLetterSpacing?.(scaled(3));
  const name = scene.add
    .text(0, -scaled(10), t(b.title), {
      fontFamily: Fonts.display,
      fontSize: px(28),
      color: Hex.parchment,
    })
    .setOrigin(0.5, 0);
  // The mark leads the name, and the two are centred together: pinned to the
  // plate's edge instead, a long name ran into it.
  const glyphW = scaled(18);
  const gap = scaled(16);
  const line = glyphW + gap + name.width;
  name.setX((glyphW + gap) / 2);
  const w = Math.max(head.width, line) + scaled(64);
  const h = head.height + name.height + scaled(34);
  const plate = scene.add.graphics();
  plate.fillStyle(Palette.ink, 0.9).fillRoundedRect(-w / 2, -h / 2 - scaled(4), w, h, scaled(10));
  plate.lineStyle(1, Palette.rye, 0.7).strokeRoundedRect(-w / 2, -h / 2 - scaled(4), w, h, scaled(10));
  const mark = scene.add.graphics().setPosition(-line / 2 + glyphW / 2, -scaled(10) + name.height / 2);
  mark.lineStyle(2, Palette.ryeBright, 1);
  walkSign('jumis', 1, (ax, ay, bx, by) => {
    const s = scaled(9);
    mark.lineBetween(ax * s, ay * s, bx * s, by * s);
  });

  const box = scene.add
    .container(x, y - scaled(30), [plate, mark, head, name])
    .setDepth(905)
    .setAlpha(0);
  audio.play('chime');
  scene.tweens.add({
    targets: box,
    alpha: 1,
    y,
    duration: 420,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: box,
        alpha: 0,
        y: y - scaled(20),
        delay: 2600,
        duration: 420,
        ease: 'Quad.easeIn',
        onComplete: () => box.destroy(true),
      });
    },
  });
}
