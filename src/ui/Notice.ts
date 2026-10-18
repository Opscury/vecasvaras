import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { audio } from '../core/audio';
import { makeParchment } from '../fx/textures';
import { ignoreKey, isAdvanceKey, markHandled } from './keys';

/**
 * A card that stops the game to explain one thing, with one way on.
 *
 * Deliberately modal, deliberately rare: one per system, at the moment it
 * first appears (the bag), plus the playtest cards — what the game is, who
 * is waiting out there, and the belief behind what was just done.
 *
 * It is an open book, on the same paper as the beliefs book: the picture and
 * the name on the left leaf, the words in ink on the right. The first version
 * was a dark panel with a hairline border, and it looked like a web page's
 * cookie banner sitting on top of a painting.
 */
const SPREAD = { w: 1500, h: 800 };
const LEAF = SPREAD.w / 2;
const INK = 0x3a2a18;
const INK_HEX = '#3a2a18';
const INK_FAINT = '#7a6446';
const RED = 0x8a3b30;
const RED_HEX = '#8a3b30';
const RED_DARK = '#5e2620';

export class Notice {
  private root: Phaser.GameObjects.Container;
  private offLang: () => void;
  private done = false;

  constructor(
    scene: Phaser.Scene,
    opts: {
      title: Loc;
      body: Loc;
      ok: Loc;
      icon?: string;
      /** A small capitalised label above the title: «Pirms ceļa», «Ticējums». */
      kicker?: Loc;
      /** A small italic line under the body — a citation. */
      note?: Loc;
      onClose?: () => void;
    },
  ) {
    const { width, height } = Layout;

    // Swallows everything underneath. Up from the first frame, so a click
    // already on its way cannot land on the world behind the card.
    const hit = scene.add.zone(width / 2, height / 2, width, height).setOrigin(0.5).setInteractive();
    const veil = scene.add.rectangle(width / 2, height / 2, width, height, Palette.ink, 0.78);

    makeParchment(scene);
    const book = scene.add.container(width / 2, height / 2);
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.45).fillRoundedRect(-SPREAD.w / 2 + 14, -SPREAD.h / 2 + 18, SPREAD.w, SPREAD.h, 10);
    const cover = scene.add.graphics();
    cover.fillStyle(Palette.peat, 1).fillRoundedRect(-SPREAD.w / 2 - 16, -SPREAD.h / 2 - 16, SPREAD.w + 32, SPREAD.h + 32, 14);
    const left = scene.add.image(-LEAF / 2, 0, 'fx-parchment').setDisplaySize(LEAF, SPREAD.h).setFlipX(true);
    const right = scene.add.image(LEAF / 2, 0, 'fx-parchment').setDisplaySize(LEAF, SPREAD.h);
    const gutter = scene.add.graphics();
    for (let i = 0; i < 26; i++) {
      gutter.fillStyle(INK, 0.022 * (26 - i));
      gutter.fillRect(-i * 2 - 2, -SPREAD.h / 2, 4, SPREAD.h);
      gutter.fillRect(i * 2 - 2, -SPREAD.h / 2, 4, SPREAD.h);
    }
    book.add([shadow, cover, left, right, gutter]);

    // --- the left leaf: the picture, and what it is ---------------------------
    const lx = -LEAF / 2;
    const leftParts: Phaser.GameObjects.GameObject[] = [];
    let art: Phaser.GameObjects.Image | null = null;
    if (opts.icon && scene.textures.exists(opts.icon)) {
      art = scene.add.image(lx, 0, opts.icon);
      // The book's engravings are ink with no paper of their own; on this
      // paper they sit as printed. A painted portrait is kept a little smaller.
      const box = /^(codex|primer)-/.test(opts.icon) ? 400 : 330;
      art.setScale(box / Math.max(art.width, art.height));
      leftParts.push(art);
    }
    const kicker = opts.kicker
      ? scene.add
          .text(lx, 0, t(opts.kicker).toUpperCase(), { fontFamily: Fonts.body, fontSize: px(19), color: RED_HEX })
          .setOrigin(0.5, 0)
      : null;
    kicker?.setLetterSpacing?.(5);
    const title = scene.add
      .text(lx, 0, t(opts.title), {
        fontFamily: Fonts.display,
        fontSize: px(52),
        color: INK_HEX,
        align: 'center',
        wordWrap: { width: LEAF - 120 },
      })
      .setOrigin(0.5, 0);
    title.setLetterSpacing?.(2);
    const rule = scene.add.graphics();
    if (kicker) leftParts.push(kicker);
    leftParts.push(title, rule);
    const leftBox = scene.add.container(0, 0, leftParts);

    const layoutLeft = () => {
      leftBox.setScale(1).setPosition(0, 0);
      const gapArt = 34;
      const gapKicker = 10;
      const stack =
        (art ? art.displayHeight + gapArt : 0) + (kicker ? kicker.height + gapKicker : 0) + title.height + 30;
      let y = -stack / 2;
      if (art) {
        art.setY(y + art.displayHeight / 2);
        y += art.displayHeight + gapArt;
      }
      if (kicker) {
        kicker.setY(y);
        y += kicker.height + gapKicker;
      }
      title.setY(y);
      y += title.height + 18;
      rule.clear();
      rule.lineStyle(1.5, RED, 0.6).lineBetween(lx - 60, y, lx + 60, y);
      const room = SPREAD.h - 100;
      if (stack > room) {
        const k = room / stack;
        leftBox.setScale(k).setPosition(lx * (1 - k), 0);
      }
    };

    // --- the right leaf: the words --------------------------------------------
    const rx = LEAF / 2;
    const textW = LEAF - 110;
    const body = scene.add
      .text(rx - textW / 2, 0, t(opts.body), {
        fontFamily: Fonts.body,
        fontSize: px(27),
        color: INK_HEX,
        lineSpacing: 7,
        wordWrap: { width: textW },
      })
      .setOrigin(0, 0);
    const note = opts.note
      ? scene.add
          .text(rx - textW / 2, 0, t(opts.note), {
            fontFamily: Fonts.body,
            fontSize: px(19),
            color: INK_FAINT,
            fontStyle: 'italic',
            wordWrap: { width: textW },
          })
          .setOrigin(0, 0)
      : null;
    const ok = scene.add
      .text(rx, 0, `${t(opts.ok)}  ▸`, { fontFamily: Fonts.display, fontSize: px(34), color: RED_HEX })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    const okRule = scene.add.graphics();
    const rightBox = scene.add.container(0, 0, [body, ...(note ? [note] : []), ok, okRule]);

    const layoutRight = () => {
      rightBox.setScale(1).setPosition(0, 0);
      const gapNote = 22;
      const gapOk = 46;
      const stack = body.height + (note ? gapNote + note.height : 0) + gapOk + ok.height + 8;
      let y = -stack / 2;
      body.setY(y);
      y += body.height;
      if (note) {
        y += gapNote;
        note.setY(y);
        y += note.height;
      }
      y += gapOk;
      ok.setY(y);
      okRule.clear();
      okRule.lineStyle(1.5, RED, 0.7).lineBetween(rx - ok.width / 2, y + ok.height + 4, rx + ok.width / 2, y + ok.height + 4);
      // At large type a long text is scaled down to the leaf, not clipped.
      const room = SPREAD.h - 110;
      if (stack > room) {
        const k = room / stack;
        rightBox.setScale(k).setPosition(rx * (1 - k), 0);
      }
    };

    book.add([leftBox, rightBox]);
    layoutLeft();
    layoutRight();

    // Fitted to the screen as the beliefs book is.
    const fit = Math.min(1, (height - scaled(60)) / (SPREAD.h + 40), (width - 40) / (SPREAD.w + 40));
    book.setScale(fit);

    this.root = scene.add.container(0, 0, [veil, hit, book]).setDepth(880).setAlpha(0);

    // A click already on its way — the one that walked the player into the
    // field — must not dismiss a card before it can be read.
    let ready = false;
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 320, ease: 'Quad.easeOut' });
    book.setY(height / 2 + 14);
    scene.tweens.add({ targets: book, y: height / 2, duration: 380, ease: 'Quad.easeOut' });
    audio.play('paper', { volume: 0.5 });
    scene.time.delayedCall(opts.note || opts.kicker ? 700 : 320, () => {
      ready = true;
    });

    const close = () => {
      if (this.done || !ready) return;
      this.done = true;
      scene.input.keyboard?.off('keydown', onKey);
      this.offLang();
      audio.play('paper', { volume: 0.35, rate: 1.25 });
      scene.tweens.add({
        targets: this.root,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.root.destroy(true);
          opts.onClose?.();
        },
      });
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ignoreKey(scene, ev) || !isAdvanceKey(ev)) return;
      markHandled(ev);
      close();
    };
    scene.input.keyboard?.on('keydown', onKey);

    ok.on('pointerover', () => {
      audio.play('hover');
      ok.setColor(RED_DARK);
    });
    ok.on('pointerout', () => ok.setColor(RED_HEX));
    // The word, the page, or the world around it all turn the page.
    const take = (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      close();
    };
    ok.on('pointerdown', take);
    hit.on('pointerdown', take);

    this.offLang = i18n.onChange(() => {
      title.setText(t(opts.title));
      kicker?.setText(t(opts.kicker!).toUpperCase());
      body.setText(t(opts.body));
      note?.setText(t(opts.note!));
      ok.setText(`${t(opts.ok)}  ▸`);
      layoutLeft();
      layoutRight();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());
  }
}
