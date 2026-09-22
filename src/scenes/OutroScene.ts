import Phaser from 'phaser';
import { fillLoc, i18n, L, t, type Loc } from '../core/i18n';
import { outro, tally, ui } from '../content/script';
import { state } from '../core/state';
import { bag } from '../core/inventory';
import { holdings, BREAD_CAP } from '../core/holdings';
import { ending, shortfalls } from '../core/rules';
import { Hex, Fonts, Layout, Palette, Timing, px, scaled } from '../core/theme';
import { Narration } from '../ui/Narration';
import { Chrome } from '../ui/Chrome';
import { Atmosphere } from '../fx/Atmosphere';
import { Painting } from '../ui/Painting';
import { SignMark } from '../ui/Sign';
import { padHit } from '../ui/hit';
import { ignoreKey, isAdvanceKey, markHandled } from '../ui/keys';
import { fadeIn, goTo, isLeaving } from './transition';
import { CHIMNEYS, SHEAF_SLOTS, addEvening, addSheaf, addUpgrades } from './villageArt';
import { audio } from '../core/audio';
import { makeBlob } from '../fx/textures';

/**
 * The ending, in three movements:
 *
 *   1. closing narration over the village as the player left it — at dusk,
 *      with as many lit windows as there is bread
 *   2. THE TALLY — both marks side by side, each whole or unfinished, a line
 *      for each share, the smaller facts under them, and the total said plainly
 *   3. the way on: another run, from the beginning
 */
export class OutroScene extends Phaser.Scene {
  private narration!: Narration;
  /** The "start over" button is up and can be pressed. */
  private canGoOn = false;

  constructor() {
    super('Outro');
  }

  create(): void {
    audio.ambient('village');

    this.canGoOn = false;
    fadeIn(this, Timing.fade * 2);
    makeBlob(this);

    const painting = new Painting(this, 'bg-village');
    painting.bg.setAlpha(0.9);

    const run = state.get();
    const bread = holdings().bread;

    // The village as the player left it, at the end of the day.
    addUpgrades(this, painting, run, { animate: false, alpha: 0.9 });
    // The store, still standing against the granary wall on the last evening.
    for (let i = 0; i < Math.min(SHEAF_SLOTS, bread); i++) addSheaf(this, painting, i, false);
    addEvening(this, painting, { lit: 1 + bread, arriving: false });

    const air = new Atmosphere(this)
      .drift(painting.root, { scale: 1.05, duration: 60000 })
      .fog({ band: 0.14, height: 280, tint: 0x9aa3b0, alpha: 0.2, speed: 80000, layers: 2 });
    CHIMNEYS.forEach((c, i) => {
      if (i === 0 || bread >= 2) air.smoke(c.x, c.y, { scale: 0.52, rate: 720 + i * 160, tint: 0xa6aab0 });
    });
    air.birds({ band: [0.06, 0.2], every: [9000, 17000] }).breathe({ amount: 0.07, duration: 28000 });

    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });
    this.input.on('pointerdown', () => this.narration.advance());

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ignoreKey(this, ev) || !isAdvanceKey(ev) || !this.canGoOn) return;
      markHandled(ev);
      this.playAgain();
    });

    this.narration.say(outro[ending(run.jumis, run.velns)], () => {
      this.narration.hide();
      this.time.delayedCall(500, () => this.showTally());
    });
  }

  private playAgain(): void {
    if (isLeaving(this)) return;
    state.reset();
    goTo(this, 'Intro');
  }

  /** Both shares, marked and named, and what the run came to. */
  private showTally(): void {
    const { width, height } = Layout;
    const run = state.get();
    const pick = run.jumisPick === 'none' ? (run.jumis === 'good' ? 'leave' : 'all') : run.jumisPick;
    const jGood = run.jumis === 'good';
    const vGood = run.velns === 'good';
    const kind = ending(run.jumis, run.velns);
    const bread = holdings().bread;
    const summary = { jumisPick: pick, velns: run.velns, catLost: run.catLost, bread };
    const short = shortfalls(summary);
    const perfect = short.length === 0;

    state.set('outroSeen', true);

    const veil = this.add.rectangle(width / 2, height / 2, width, height, Palette.ink, 0).setDepth(700);
    this.tweens.add({ targets: veil, fillAlpha: 0.9, duration: 800, ease: 'Sine.easeOut' });

    const texts: Array<{ obj: Phaser.GameObjects.Text; loc: () => Loc }> = [];
    const add = (x: number, y: number, loc: () => Loc, o: { size: string; colour: string; italic?: boolean }) => {
      const obj = this.add
        .text(x, y, t(loc()), {
          fontFamily: Fonts.body,
          fontSize: o.size,
          color: o.colour,
          align: 'center',
          fontStyle: o.italic ? 'italic' : 'normal',
        })
        .setOrigin(0.5, 0.5)
        .setDepth(720)
        .setAlpha(0);
      texts.push({ obj, loc });
      return obj;
    };

    const heading = add(width / 2, height * 0.12, () => tally.heading, { size: px(30), colour: Hex.parchmentDim });

    // The two marks, left and right. Whole or stopped short, warm or cold.
    const leftX = width * 0.34;
    const rightX = width * 0.66;
    const markY = height * 0.3;

    const mJ = new SignMark(this, { x: leftX, y: markY, size: 80, key: 'jumis', complete: jGood, depth: 720 });
    const mV = new SignMark(this, { x: rightX, y: markY, size: 80, key: 'crossing', complete: vGood, depth: 720 });

    const rowY = markY + scaled(142);
    const velnsRow = run.devilGone ? tally.rowVelns.gone : vGood ? tally.rowVelns.good : tally.rowVelns.poor;
    const rowJ = add(leftX, rowY, () => tally.rowJumis[pick], { size: px(26), colour: jGood ? Hex.parchment : Hex.mist });
    const rowV = add(rightX, rowY, () => velnsRow, { size: px(26), colour: vGood ? Hex.parchment : Hex.mist });

    // The smaller facts under each share.
    const subY = rowY + scaled(40);
    const breadLoc = (): Loc => fillLoc(tally.bread, L(`${bread}/${BREAD_CAP}`, `${bread}/${BREAD_CAP}`));
    const subJ = add(leftX, subY, breadLoc, { size: px(21), colour: bread >= BREAD_CAP ? Hex.rye : Hex.parchmentDim, italic: true });
    const subV = add(rightX, subY, () => (run.catLost ? tally.catLost : tally.catHome), {
      size: px(21),
      colour: run.catLost ? Hex.mist : Hex.parchmentDim,
      italic: true,
    });
    // The Devil's hat, if he left it: the rarest thing a year can end with.
    const hatLine = bag.has('hat')
      ? add(rightX, subY + scaled(32), () => tally.hat, { size: px(21), colour: Hex.rye, italic: true })
      : null;

    const verdictY = height * 0.64;
    const verdict = add(width / 2, verdictY, () => tally[kind], {
      size: px(42),
      colour: kind === 'both' ? Hex.parchment : Hex.parchmentDim,
    });

    const noteLoc = (): Loc => {
      if (perfect) return tally.perfect;
      // Both shares whole, and still something given up: say what.
      const parts: Loc[] = [];
      if (kind === 'both') {
        if (short.includes('bread')) parts.push(tally.shortBread);
        if (short.includes('cat')) parts.push(tally.shortCat);
      }
      parts.push(tally.again);
      return { lv: parts.map((p) => p.lv).join(' '), en: parts.map((p) => p.en).join(' ') };
    };
    const note = add(width / 2, verdictY + scaled(60), noteLoc, { size: px(24), colour: Hex.rye });

    // The way on.
    const next = this.button(width / 2, height * 0.85, ui.restart, true);
    next.txt.on('pointerdown', () => this.playAgain());

    // Carve the marks one after the other, then let the words follow.
    const fadeUp = (target: Phaser.GameObjects.GameObject, delay: number, duration = 700, onComplete?: () => void) =>
      this.tweens.add({ targets: target, alpha: 1, duration, delay, ease: 'Quad.easeOut', onComplete });
    fadeUp(heading, 300, 600);
    this.time.delayedCall(700, () => {
      mJ.carve(this, () => {
        audio.play('tally');
        fadeUp(rowJ, 0, 500);
        fadeUp(subJ, 250, 500);
      });
    });
    this.time.delayedCall(1700, () => {
      mV.carve(this, () => {
        audio.play('tally');
        fadeUp(rowV, 0, 500);
        fadeUp(subV, 250, 500);
        if (hatLine) fadeUp(hatLine, 700, 500);
      });
    });
    fadeUp(verdict, 3400);
    fadeUp(note, 4100);
    fadeUp(next.txt, 4800, 600, () => {
      this.canGoOn = true;
    });

    const off = i18n.onChange(() => {
      texts.forEach((x) => x.obj.setText(t(x.loc())));
      next.refresh();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private button(x: number, y: number, label: Loc, primary: boolean): { txt: Phaser.GameObjects.Text; refresh: () => void } {
    const txt = this.add
      .text(x, y, t(label) + (primary ? '  ▸' : ''), {
        fontFamily: Fonts.body,
        fontSize: px(primary ? 28 : 24),
        color: primary ? Hex.rye : Hex.parchmentDim,
        backgroundColor: primary ? 'rgba(107,88,66,0.55)' : 'rgba(20,22,26,0.5)',
        padding: { x: scaled(26), y: scaled(14) },
      })
      .setOrigin(0.5)
      .setDepth(720)
      .setAlpha(0);
    const place = padHit(txt, 300, 80);
    const idle = primary ? Hex.rye : Hex.parchmentDim;
    txt.on('pointerover', () => txt.setColor(Hex.ryeBright));
    txt.on('pointerout', () => txt.setColor(idle));
    return {
      txt,
      refresh: () => {
        txt.setText(t(label) + (primary ? '  ▸' : ''));
        place();
      },
    };
  }
}
