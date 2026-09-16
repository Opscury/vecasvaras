import Phaser from 'phaser';
import { fillLoc, i18n, L, t } from '../core/i18n';
import { lore, LORE_ORDER, type LoreId } from '../core/lore';
import { beliefs } from '../content/ticejumi';
import { loreUi } from '../content/script';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { keysOf } from './keys';
import { audio } from '../core/audio';
import { walkSign } from './Sign';

const num = (n: number): { lv: string; en: string } => L(String(n), String(n));

/**
 * The beliefs the player has found, on one page — every rule the game runs on,
 * written down the way a collector would have written it.
 *
 * Found entries show the belief; the rest show where to look, so the page is
 * also the list of things still to try.
 */
export class LorePage {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container | null = null;
  private offLang: (() => void) | null = null;

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
    keysOf(this.scene).modal = true;
    this.build();
    this.offLang = i18n.onChange(() => {
      this.root?.destroy(true);
      this.build();
    });
  }

  close(): void {
    if (!this.root) return;
    this.root.destroy(true);
    this.root = null;
    this.offLang?.();
    this.offLang = null;
    keysOf(this.scene).modal = false;
  }

  private build(): void {
    const { width, height } = Layout;
    const veil = this.scene.add.rectangle(width / 2, height / 2, width, height, Palette.ink, 0.95);
    const hit = this.scene.add.zone(width / 2, height / 2, width, height).setInteractive();
    hit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.close();
    });

    const heading = this.scene.add
      .text(width / 2, scaled(60), t(loreUi.heading), {
        fontFamily: Fonts.display,
        fontSize: px(34),
        color: Hex.parchment,
      })
      .setOrigin(0.5, 0);
    heading.setLetterSpacing?.(scaled(3));
    const count = this.scene.add
      .text(width / 2, heading.y + heading.height + scaled(6), t(fillLoc(fillLoc(loreUi.found, num(lore.count)), num(lore.total))), {
        fontFamily: Fonts.body,
        fontSize: px(20),
        color: Hex.rye,
      })
      .setOrigin(0.5, 0);

    const parts: Phaser.GameObjects.GameObject[] = [heading, count];

    // Two columns; each entry a title and a paragraph.
    const top = count.y + count.height + scaled(30);
    const colW = Math.min(780, (width - scaled(200)) / 2);
    const gapX = scaled(80);
    const xs = [width / 2 - gapX / 2 - colW, width / 2 + gapX / 2];
    const ys = [top, top];
    LORE_ORDER.forEach((id, i) => {
      const col = i % 2;
      const found = lore.has(id);
      const b = beliefs[id];
      const x = xs[col];
      let y = ys[col];

      const mark = this.scene.add.graphics().setPosition(x + scaled(14), y + scaled(16));
      mark.lineStyle(2, found ? Palette.rye : Palette.timberLight, found ? 0.95 : 0.5);
      walkSign('jumis', found ? 1 : 0.35, (ax, ay, bx, by) => {
        const s = scaled(8);
        mark.lineBetween(ax * s, ay * s, bx * s, by * s);
      });
      parts.push(mark);

      const title = this.scene.add.text(x + scaled(40), y, found ? t(b.title) : '· · ·', {
        fontFamily: Fonts.display,
        fontSize: px(25),
        color: found ? Hex.ryeBright : Hex.parchmentDim,
      });
      parts.push(title);
      y += title.height + scaled(6);

      const body = this.scene.add.text(x + scaled(40), y, found ? t(b.text) : t(b.hint), {
        fontFamily: Fonts.body,
        fontSize: px(found ? 20 : 19),
        color: found ? Hex.parchment : Hex.mist,
        fontStyle: found ? 'normal' : 'italic',
        wordWrap: { width: colW - scaled(40) },
        lineSpacing: scaled(4),
      });
      parts.push(body);
      y += body.height;

      // A citation only for an entry that has actually been checked.
      if (found && b.verified && b.ref) {
        const src = this.scene.add.text(x + scaled(40), y + scaled(4), t(fillLoc(loreUi.source, num(Number(b.ref)))), {
          fontFamily: Fonts.body,
          fontSize: px(15),
          color: Hex.parchmentDim,
          fontStyle: 'italic',
        });
        parts.push(src);
        y += src.height + scaled(4);
      }
      ys[col] = y + scaled(26);
    });

    const foot = this.scene.add
      .text(width / 2, height - scaled(26), t(loreUi.close), {
        fontFamily: Fonts.body,
        fontSize: px(17),
        color: Hex.parchmentDim,
      })
      .setOrigin(0.5, 1);

    // Too tall for a phone at compact type? Scale the page, not the veil.
    const page = this.scene.add.container(0, 0, parts);
    const bottom = Math.max(...ys);
    const avail = height - scaled(64);
    if (bottom > avail) {
      const s = avail / bottom;
      page.setScale(s).setPosition((width * (1 - s)) / 2, 0);
    }
    // Over the corner panels (880), which otherwise sat on the page's text;
    // under the top buttons (900), so the chip and the language still work.
    const root = this.scene.add.container(0, 0, [veil, hit, page, foot]).setDepth(890);
    this.root = root;
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
