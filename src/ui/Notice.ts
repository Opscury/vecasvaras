import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { audio } from '../core/audio';
import { ignoreKey, isAdvanceKey, markHandled } from './keys';

/**
 * A small card that stops the game to explain one thing, with one button.
 *
 * The game teaches by saying things in the narration panel, which works right
 * up until the thing being taught is not what the player is looking at. The
 * bag was the case that proved it: it introduced itself in a line beside
 * itself, on first OPEN, and a player who never opened it simply watched an
 * unexplained object appear in the corner and asked out loud what it was.
 *
 * So: deliberately modal, deliberately rare. One of these per system, at the
 * moment the system first appears, never again.
 */
export class Notice {
  private root: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private okText: Phaser.GameObjects.Text;
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
    const cardW = Math.min(width - scaled(160), scaled(1020));
    const cx = width / 2;
    const cy = height / 2;
    const padY = scaled(46);

    // Swallows everything underneath. Up from the first frame, so a click
    // already on its way cannot land on the world behind the card.
    const hit = scene.add.zone(cx, cy, width, height).setOrigin(0.5).setInteractive();

    const veil = scene.add.graphics();
    veil.fillStyle(Palette.ink, 0.72).fillRect(0, 0, width, height);

    const plate = scene.add.graphics();
    // The card itself, apart from the veil: a long card is scaled down to fit
    // the screen, and the veil must still cover all of it.
    const parts: Phaser.GameObjects.GameObject[] = [plate];

    // The thing being explained, drawn beside its own explanation.
    const hasIcon = !!opts.icon && scene.textures.exists(opts.icon);
    const textX = hasIcon ? cx + scaled(80) : cx;
    const wrap = cardW - (hasIcon ? scaled(320) : scaled(110));

    this.titleText = scene.add
      .text(textX, 0, t(opts.title), {
        fontFamily: Fonts.display,
        fontSize: px(34),
        color: Hex.parchment,
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.bodyText = scene.add
      .text(textX, 0, t(opts.body), {
        fontFamily: Fonts.body,
        fontSize: px(25),
        color: Hex.parchmentDim,
        align: 'center',
        lineSpacing: scaled(10),
        wordWrap: { width: wrap },
      })
      .setOrigin(0.5, 0);

    this.okText = scene.add
      .text(cx, 0, t(opts.ok), {
        fontFamily: Fonts.body,
        fontSize: px(26),
        color: Hex.rye,
        backgroundColor: 'rgba(107,88,66,0.55)',
        padding: { x: scaled(34), y: scaled(16) },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    const kickerText = opts.kicker
      ? scene.add
          .text(textX, 0, t(opts.kicker).toUpperCase(), {
            fontFamily: Fonts.body,
            fontSize: px(16),
            color: Hex.rye,
            align: 'center',
          })
          .setOrigin(0.5, 0)
      : null;
    kickerText?.setLetterSpacing?.(scaled(3));
    const noteText = opts.note
      ? scene.add
          .text(textX, 0, t(opts.note), {
            fontFamily: Fonts.body,
            fontSize: px(18),
            color: Hex.parchmentDim,
            fontStyle: 'italic',
            align: 'center',
            wordWrap: { width: wrap },
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.8)
      : null;

    // Measured, not guessed: the card is as tall as what is in it. A fixed
    // height leaves a two-line explanation floating in a half-empty box.
    const gapKicker = scaled(10);
    const gapTitle = scaled(20);
    const gapNote = scaled(18);
    const gapOk = scaled(34);
    const stackH =
      (kickerText ? kickerText.height + gapKicker : 0) +
      this.titleText.height +
      gapTitle +
      this.bodyText.height +
      (noteText ? gapNote + noteText.height : 0) +
      gapOk +
      this.okText.height;
    const cardH = Math.max(stackH + padY * 2, scaled(260));
    const top = cy - cardH / 2;

    plate.fillStyle(Palette.ink, 0.96);
    plate.fillRoundedRect(cx - cardW / 2, top, cardW, cardH, scaled(12));
    plate.lineStyle(2, Palette.rye, 0.7);
    plate.strokeRoundedRect(cx - cardW / 2, top, cardW, cardH, scaled(12));

    let y = top + (cardH - stackH) / 2;
    if (kickerText) {
      kickerText.setY(y);
      y += kickerText.height + gapKicker;
    }
    this.titleText.setY(y);
    y += this.titleText.height + gapTitle;
    this.bodyText.setY(y);
    y += this.bodyText.height;
    if (noteText) {
      y += gapNote;
      noteText.setY(y);
      y += noteText.height;
    }
    y += gapOk;
    this.okText.setY(y);

    if (hasIcon) {
      // The book's engravings are dark ink with no paper of their own; on the
      // dark card they need a disc of paper under them, or they vanish.
      const ink = /^(codex|primer)-/.test(opts.icon!);
      const ix = cx - cardW / 2 + scaled(ink ? 128 : 140);
      const size = Math.min(scaled(ink ? 190 : 170), cardH - padY * 2);
      if (ink) {
        const paper = scene.add.graphics();
        paper.fillStyle(Palette.parchment, 0.92).fillCircle(ix, cy, size * 0.56);
        paper.lineStyle(2, Palette.rye, 0.6).strokeCircle(ix, cy, size * 0.56);
        parts.push(paper);
      }
      const img = scene.add.image(ix, cy, opts.icon!);
      img.setScale(size / Math.max(img.width, img.height));
      parts.push(img);
    }

    parts.push(this.titleText, this.bodyText, this.okText);
    if (kickerText) parts.push(kickerText);
    if (noteText) parts.push(noteText);

    const card = scene.add.container(0, 0, parts);
    const fit = Math.min(1, (height - scaled(40)) / cardH);
    if (fit < 1) card.setScale(fit).setPosition(cx * (1 - fit), cy * (1 - fit));

    this.root = scene.add.container(0, 0, [veil, hit, card]).setDepth(880).setAlpha(0);
    // A click already on its way — the one that walked the player into the
    // field — must not dismiss a card before it can be read. The playtest
    // cards are longer than the bag's, so they hold a moment longer.
    let ready = false;
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 320, ease: 'Quad.easeOut' });
    scene.time.delayedCall(opts.note || opts.kicker ? 700 : 320, () => {
      ready = true;
    });

    const close = () => {
      if (this.done || !ready) return;
      this.done = true;
      scene.input.keyboard?.off('keydown', onKey);
      this.offLang();
      audio.play('click', { volume: 0.6 });
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

    this.okText.on('pointerover', () => {
      audio.play('hover');
      this.okText.setColor(Hex.ryeBright);
    });
    this.okText.on('pointerout', () => this.okText.setColor(Hex.rye));
    // Both the button and the veil close it; nothing here is a decision.
    const take = (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      close();
    };
    this.okText.on('pointerdown', take);
    hit.on('pointerdown', take);

    this.offLang = i18n.onChange(() => {
      this.titleText.setText(t(opts.title));
      this.bodyText.setText(t(opts.body));
      this.okText.setText(t(opts.ok));
      if (kickerText && opts.kicker) kickerText.setText(t(opts.kicker).toUpperCase());
      if (noteText && opts.note) noteText.setText(t(opts.note));
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());
  }
}
