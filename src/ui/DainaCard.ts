import Phaser from 'phaser';
import { i18n, t } from '../core/i18n';
import { dainas, dainaText } from '../content/dainas';
import { ui } from '../content/script';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { ignoreKey, isAdvanceKey, markHandled } from './keys';

/**
 * The epigraph that opens each encounter: the verse, in the language being
 * played.
 *
 * It used to print the Latvian and the English together, on the argument that
 * the original is the point and the translation is a crutch. On a phone that
 * was two stacked blocks of verse before the encounter had started, and the
 * reader's eye had to find its own half first. One verse, in one language, is
 * the version people actually read.
 */
export class DainaCard {
  private root: Phaser.GameObjects.Container;
  private verse: Phaser.GameObjects.Text;
  /** "Next ▸" at the foot of the card — a word, because a lone glyph read as decoration. */
  private go!: Phaser.GameObjects.Text;
  private key: keyof typeof dainas;
  private offLang: () => void;

  constructor(scene: Phaser.Scene, key: keyof typeof dainas, onDone: () => void) {
    this.key = key;
    const { width, height } = Layout;

    const veil = scene.add.graphics();
    veil.fillStyle(Palette.ink, 0.72);
    veil.fillRect(0, 0, width, height);

    const rule = scene.add.graphics();
    rule.lineStyle(2, Palette.rye, 0.7);
    rule.lineBetween(width / 2 - 90, height * 0.32, width / 2 + 90, height * 0.32);

    // Centred on the card rather than hung from a fixed top, now that there is
    // only one block: a four-line verse and a two-line one both sit right.
    this.verse = scene.add
      .text(width / 2, height * 0.52, '', {
        fontFamily: Fonts.display,
        fontSize: px(40),
        color: Hex.parchment,
        align: 'center',
        lineSpacing: scaled(16),
      })
      .setOrigin(0.5, 0.5);

    const go = (this.go = scene.add
      .text(width / 2, height * 0.86, t(ui.next) + '  ▸', {
        fontFamily: Fonts.body,
        fontSize: px(26),
        color: Hex.rye,
        backgroundColor: 'rgba(20,22,26,0.6)',
        padding: { x: scaled(22), y: scaled(14) },
      })
      .setOrigin(0.5));

    this.root = scene.add
      .container(0, 0, [veil, rule, this.verse, go])
      .setDepth(800)
      .setAlpha(0);

    this.refresh();

    // Nothing dismisses the card until it has finished fading in. A player
    // double-clicking out of the village otherwise skipped the epigraph before
    // it was legible — the same click-through the reckoning card guards against.
    let ready = false;
    let done = false;
    scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => {
        ready = true;
      },
    });
    scene.tweens.add({
      targets: go,
      alpha: 0.35,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      delay: 900,
      ease: 'Sine.easeInOut',
    });

    // Any click anywhere dismisses the card. The zone is up from the start, so
    // nothing underneath can be clicked through it while it is still fading in.
    const hit = scene.add
      .zone(width / 2, height / 2, width, height)
      .setOrigin(0.5)
      .setDepth(810)
      .setInteractive({ useHandCursor: true });

    const onKey = (ev: KeyboardEvent) => {
      if (ignoreKey(scene, ev) || !isAdvanceKey(ev)) return;
      markHandled(ev);
      dismiss();
    };
    const dismiss = () => {
      if (!ready || done) return;
      done = true;
      hit.destroy();
      scene.input.keyboard?.off('keydown', onKey);
      scene.tweens.add({
        targets: this.root,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.root.destroy(true);
          onDone();
        },
      });
    };

    hit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      dismiss();
    });
    scene.input.keyboard?.on('keydown', onKey);

    this.offLang = i18n.onChange(() => this.refresh());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());
  }

  private refresh(): void {
    this.go.setText(t(ui.next) + '  ▸');
    this.verse.setText(t(dainaText(this.key)));
  }
}
