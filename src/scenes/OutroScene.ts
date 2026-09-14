import Phaser from 'phaser';
import { i18n, t, type Loc } from '../core/i18n';
import { outro, tally, ui } from '../content/script';
import { state } from '../core/state';
import { ending } from '../core/rules';
import { Hex, Fonts, Layout, Palette, Timing, px, scaled } from '../core/theme';
import { Narration } from '../ui/Narration';
import { Chrome } from '../ui/Chrome';
import { Atmosphere } from '../fx/Atmosphere';
import { Painting } from '../ui/Painting';
import { SignMark } from '../ui/Sign';
import { padHit } from '../ui/hit';
import { ignoreKey, isAdvanceKey, markHandled } from '../ui/keys';
import { fadeIn, goTo, isLeaving } from './transition';
import { CHIMNEYS, addUpgrades } from './villageArt';
import { audio } from '../core/audio';

/**
 * The ending, in three movements:
 *
 *   1. closing narration over the village as the player actually left it
 *   2. THE TALLY — both marks side by side, each whole or unfinished, with a
 *      one-line record of each debt and a plain statement of the total
 *   3. the title card
 *
 * Movement 2 is the part that was missing. A player who reaches the end of a
 * game about paying debts should not have to guess whether they paid them, and
 * the two marks answer that in a single glance before a word is read.
 */
export class OutroScene extends Phaser.Scene {
  private narration!: Narration;
  /** The "start over" line is up and can be pressed. */
  private canRestart = false;

  constructor() {
    super('Outro');
  }

  create(): void {
    // One ambient channel for the whole game; this cross-fades from whatever
    // the last scene was playing.
    audio.ambient('village');

    this.canRestart = false;
    fadeIn(this, Timing.fade * 2);

    const painting = new Painting(this, 'bg-village');
    painting.bg.setAlpha(0.9);

    const run = state.get();

    // Show the village as the player left it. Closing on the empty foundation
    // they just filled would undo the whole point of the hub.
    addUpgrades(this, painting, run, { animate: false, alpha: 0.9 });

    const air = new Atmosphere(this)
      .drift(painting.root, { scale: 1.05, duration: 60000 })
      .fog({ band: 0.14, height: 280, tint: 0xe6ecef, alpha: 0.2, speed: 80000, layers: 2 });
    CHIMNEYS.forEach((c, i) => air.smoke(c.x, c.y, { scale: 0.52, rate: 720 + i * 160 }));
    air.birds({ band: [0.06, 0.2], every: [7000, 15000] }).breathe({ amount: 0.07, duration: 28000 });

    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });
    this.input.on('pointerdown', () => this.narration.advance());

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ignoreKey(this, ev) || !isAdvanceKey(ev) || !this.canRestart) return;
      markHandled(ev);
      this.restart();
    });

    this.narration.say(outro[ending(run.jumis, run.velns)], () => {
      this.narration.hide();
      this.time.delayedCall(500, () => this.showTally());
    });
  }

  private restart(): void {
    if (isLeaving(this)) return;
    state.reset();
    goTo(this, 'Title');
  }

  /** Both debts, marked and named. */
  private showTally(): void {
    const { width, height } = Layout;
    const run = state.get();
    const jGood = run.jumis === 'good';
    const vGood = run.velns === 'good';
    const kind = ending(run.jumis, run.velns);

    const veil = this.add
      .rectangle(width / 2, height / 2, width, height, Palette.ink, 0)
      .setDepth(700);
    this.tweens.add({ targets: veil, fillAlpha: 0.9, duration: 800, ease: 'Sine.easeOut' });

    const texts: Array<{ obj: Phaser.GameObjects.Text; loc: Loc }> = [];
    const add = (
      x: number,
      y: number,
      loc: Loc,
      o: { size: string; colour: string; origin?: number },
    ) => {
      const obj = this.add
        .text(x, y, t(loc), {
          fontFamily: Fonts.body,
          fontSize: o.size,
          color: o.colour,
          align: 'center',
        })
        .setOrigin(o.origin ?? 0.5, 0.5)
        .setDepth(720)
        .setAlpha(0);
      texts.push({ obj, loc });
      return obj;
    };

    const heading = add(width / 2, height * 0.16, tally.heading, {
      size: px(30),
      colour: Hex.parchmentDim,
    });

    // The two marks, left and right. Whole or stopped short, warm or cold.
    const leftX = width * 0.34;
    const rightX = width * 0.66;
    const markY = height * 0.36;

    const mJ = new SignMark(this, {
      x: leftX,
      y: markY,
      size: 80,
      key: 'jumis',
      complete: jGood,
      depth: 720,
    });
    const mV = new SignMark(this, {
      x: rightX,
      y: markY,
      size: 80,
      key: 'crossing',
      complete: vGood,
      depth: 720,
    });

    const rowJ = add(leftX, markY + scaled(150), jGood ? tally.rowJumis.good : tally.rowJumis.poor, {
      size: px(26),
      colour: jGood ? Hex.parchment : Hex.mist,
    });
    const rowV = add(rightX, markY + scaled(150), vGood ? tally.rowVelns.good : tally.rowVelns.poor, {
      size: px(26),
      colour: vGood ? Hex.parchment : Hex.mist,
    });

    const verdict = add(width / 2, height * 0.63, tally[kind], {
      size: px(42),
      colour: kind === 'both' ? Hex.parchment : Hex.parchmentDim,
    });

    const note = add(width / 2, height * 0.63 + scaled(62), kind === 'both' ? tally.perfect : tally.again, {
      size: px(24),
      colour: Hex.rye,
    });

    const again = this.add
      .text(width / 2, height * 0.82, t(ui.restart), {
        fontFamily: Fonts.body,
        fontSize: px(28),
        color: Hex.rye,
      })
      .setOrigin(0.5)
      .setDepth(720)
      .setAlpha(0);
    const placeAgain = padHit(again, 380, 88);
    texts.push({ obj: again, loc: ui.restart });
    again.on('pointerover', () => again.setColor(Hex.ryeBright));
    again.on('pointerout', () => again.setColor(Hex.rye));
    again.on('pointerdown', () => this.restart());

    // Carve the marks one after the other, then let the words follow. Staggering
    // them means the player watches each debt being scored rather than reading
    // a results table.
    const fadeUp = (target: Phaser.GameObjects.Text, delay: number, duration = 700, onComplete?: () => void) =>
      this.tweens.add({ targets: target, alpha: 1, duration, delay, ease: 'Quad.easeOut', onComplete });
    fadeUp(heading, 300, 600);
    // One knock per mark, on the beat the row appears: the sound of a debt
    // being written off, twice.
    this.time.delayedCall(700, () => {
      mJ.carve(this, () => {
        audio.play('tally');
        fadeUp(rowJ, 0, 500);
      });
    });
    this.time.delayedCall(1600, () => {
      mV.carve(this, () => {
        audio.play('tally');
        fadeUp(rowV, 0, 500);
      });
    });
    fadeUp(verdict, 3200);
    fadeUp(note, 3900);
    fadeUp(again, 4600, 600, () => {
      this.canRestart = true;
    });

    state.set('outroSeen', true);

    const off = i18n.onChange(() => {
      texts.forEach((x) => x.obj.setText(t(x.loc)));
      placeAgain();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }
}
