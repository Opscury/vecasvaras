import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { village } from '../content/script';
import { state, type Outcome } from '../core/state';
import { Hex, Fonts, Layout, Palette, px, scaled } from '../core/theme';
import { audio } from '../core/audio';

/**
 * What the village has, in two rows of marks.
 *
 * The granary and the bridge already change when an encounter goes well — but
 * a building that appears once, behind a fade, while a line of text is being
 * read, is not feedback. The first playtester came home from the field and
 * could not say what she had got out of it, or whether it could have gone
 * better. These can: two marks filled is everything the field or the crossing
 * had to give, one is what you settled for.
 *
 * Deliberately two rows and two marks each. This is a game about a debt, not a
 * game with a character sheet.
 */
const ROWS: { label: Loc; of: (s: ReturnType<typeof state.get>) => Outcome }[] = [
  { label: village.measures.grain, of: (s) => s.jumis },
  { label: village.measures.crossing, of: (s) => s.velns },
];

/** Marks per row. `poor` fills one, `good` fills both. */
const PIPS = 2;

const score = (o: Outcome): number => (o === 'good' ? 2 : o === 'poor' ? 1 : 0);

export class Measures {
  private scene: Phaser.Scene;
  private plate: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  /** [row][pip] — drawn rather than typed, so no font has to own a lozenge. */
  private pips: Phaser.GameObjects.Graphics[][] = [];
  private shown: number[] = [];
  private offLang: () => void;

  /**
   * `from` is what the player was last shown. Passing the state they left with
   * means the new mark is still empty when they walk back in, and fills in
   * front of them a moment later — which is the whole point of having it.
   */
  constructor(scene: Phaser.Scene, y: number, private from?: { jumis: Outcome; velns: Outcome }) {
    this.scene = scene;
    const rowH = scaled(34);
    const pipR = scaled(7);
    const pipGap = scaled(22);
    const padX = scaled(18);

    this.plate = scene.add.graphics();

    ROWS.forEach((row, i) => {
      const label = scene.add
        .text(padX, scaled(12) + i * rowH, t(row.label).toUpperCase(), {
          fontFamily: Fonts.body,
          fontSize: px(17),
          color: Hex.parchmentDim,
        })
        .setOrigin(0, 0);
      label.setLetterSpacing?.(scaled(2));
      this.labels.push(label);

      const marks: Phaser.GameObjects.Graphics[] = [];
      for (let p = 0; p < PIPS; p++) {
        marks.push(scene.add.graphics());
      }
      this.pips.push(marks);
      this.shown.push(0);
    });

    // The marks line up in one column whatever the two words are, in either
    // language, so the panel does not jump when the language is switched.
    const place = () => {
      const wordW = Math.max(...this.labels.map((l) => l.width));
      const left = padX + wordW + scaled(20);
      this.pips.forEach((marks, i) => {
        const cy = scaled(12) + i * rowH + this.labels[i].height / 2;
        marks.forEach((g, p) => g.setPosition(left + p * pipGap, cy));
      });
      const w = left + PIPS * pipGap + padX - scaled(6);
      const h = scaled(12) + ROWS.length * rowH + scaled(2);
      this.plate.clear();
      this.plate.fillStyle(Palette.ink, 0.62).fillRoundedRect(0, 0, w, h, scaled(8));
      this.plate.lineStyle(1, Palette.rye, 0.25).strokeRoundedRect(0, 0, w, h, scaled(8));
    };

    scene.add
      .container(Layout.margin - scaled(24), y, [this.plate, ...this.labels, ...this.pips.flat()])
      .setDepth(880);

    this.offLang = i18n.onChange(() => {
      this.labels.forEach((l, i) => l.setText(t(ROWS[i].label).toUpperCase()));
      place();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offLang());

    place();
    this.drawAll(pipR);
  }

  /**
   * Re-reads the run state. `animate` fills any newly earned mark with a beat
   * of its own and the tally sound — the village saying, in its own corner,
   * what the walk was worth.
   */
  refresh(animate = false): void {
    const s = state.get();
    const pipR = scaled(7);
    ROWS.forEach((row, i) => {
      const want = score(row.of(s));
      if (want === this.shown[i]) return;
      const from = this.shown[i];
      this.shown[i] = want;
      for (let p = 0; p < PIPS; p++) {
        this.paint(this.pips[i][p], p < want, pipR);
        if (!animate || p < from || p >= want) continue;
        const g = this.pips[i][p];
        g.setScale(0.2);
        this.scene.tweens.add({ targets: g, scale: 1, duration: 520, ease: 'Back.easeOut' });
      }
      if (animate && want > from) audio.play('tally', { volume: 0.5 });
    });
  }

  private drawAll(pipR: number): void {
    const s = this.from ?? state.get();
    ROWS.forEach((row, i) => {
      const want = score(row.of(s as ReturnType<typeof state.get>));
      this.shown[i] = want;
      for (let p = 0; p < PIPS; p++) this.paint(this.pips[i][p], p < want, pipR);
    });
  }

  /** A filled mark is something the village has; a hollow one is what it went without. */
  private paint(g: Phaser.GameObjects.Graphics, filled: boolean, r: number): void {
    g.clear();
    if (filled) {
      g.fillStyle(Palette.rye, 0.95).fillCircle(0, 0, r);
      g.lineStyle(1, Palette.ryeBright, 0.9).strokeCircle(0, 0, r);
    } else {
      g.lineStyle(2, Palette.timberLight, 0.55).strokeCircle(0, 0, r);
    }
  }
}
