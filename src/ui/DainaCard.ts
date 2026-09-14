import Phaser from 'phaser';
import { i18n, t } from '../core/i18n';
import { dainas, dainaText } from '../content/dainas';
import { ui } from '../content/script';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { ignoreKey, isAdvanceKey, markHandled } from './keys';

/**
 * The epigraph that opens each encounter: the daina in Latvian, with the
 * English sense underneath it.
 *
 * Both languages are always shown, whichever UI language is selected — the
 * original is the point, and the translation is a crutch for the player who
 * needs one. Only the ORDER changes with the language setting, so the reader's
 * own language comes first.
 */
export class DainaCard {
  private root: Phaser.GameObjects.Container;
  private primary: Phaser.GameObjects.Text;
  private secondary: Phaser.GameObjects.Text;
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

    this.primary = scene.add
      .text(width / 2, height * 0.38, '', {
        fontFamily: Fonts.display,
        fontSize: px(40),
        color: Hex.parchment,
        align: 'center',
        lineSpacing: scaled(16),
      })
      .setOrigin(0.5, 0);

    this.secondary = scene.add
      .text(width / 2, height * 0.62, '', {
        fontFamily: Fonts.body,
        fontSize: px(26),
        color: Hex.parchmentDim,
        align: 'center',
        lineSpacing: scaled(10),
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);

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
      .container(0, 0, [veil, rule, this.primary, this.secondary, go])
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

  /** Latvian on top when playing in Latvian; English on top when in English. */
  private refresh(): void {
    this.go.setText(t(ui.next) + '  ▸');
    const d = dainaText(this.key);
    if (i18n.lang === 'lv') {
      this.primary.setText(d.lv);
      this.secondary.setText(d.en);
    } else {
      this.primary.setText(d.en);
      this.secondary.setText(d.lv);
    }
    this.secondary.setY(this.primary.y + this.primary.height + scaled(46));
  }
}
