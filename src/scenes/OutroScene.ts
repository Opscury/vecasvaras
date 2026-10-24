import Phaser from 'phaser';
import { beloved } from '../content/beloved';
import { fillLoc, i18n, L, t, type Loc } from '../core/i18n';
import { feast, outro, tally, ui } from '../content/script';
import { CHAPTER_ONE, state } from '../core/state';
import { bag } from '../core/inventory';
import { holdings, BREAD_CAP } from '../core/holdings';
import { ending, loafFrom, loafGood, shortfalls } from '../core/rules';
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
import { stoneNote } from '../content/primer';
import { makeBlob } from '../fx/textures';

/**
 * The ending, in four movements:
 *
 *   1. APJUMĪBAS — the harvest-home feast, in Anna's house, on the evening
 *      the last swath went down: the wreath, what is or is not hanging over
 *      the table, who you end up sitting beside, and the year's first loaf
 *      going onto the shelf. There is no painting of the inside of her house
 *      and there will not be one before 18 Nov, so it plays over the dusk
 *      village under a vignette and a pool of lamplight — close enough to a
 *      doorway, and the words do the rest. The real painting is asked for in
 *      ART_NOTES.md.
 *   2. closing narration over the village as the player left it — at dusk,
 *      with as many lit windows as there is bread
 *   3. THE TALLY — both marks side by side, each whole or unfinished, a line
 *      for each share, the smaller facts under them, and the total said plainly
 *   4. the way on: another run, from the beginning
 *
 * The chapter used to go from the cart straight to the verdict. The tally is
 * a verdict and reads like one; the evening is what it is a verdict on.
 */

/** How close you have to have come for them to sit down beside you. */
const SEAT_BOND = 3;
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

    this.feast(() => {
      // Who is standing at the stone with the player, if anyone.
      const close = run.talks.includes('meet')
        ? [run.bond >= 4 ? beloved.ending.close : run.bond >= 2 ? beloved.ending.warm : beloved.ending.cold]
        : [];
      this.narration.say([...outro[ending(run.jumis, run.velns)], ...close], () => {
        this.narration.hide();
        this.time.delayedCall(500, () => this.showTally());
      });
    });
  }

  /**
   * The feast. The lines, then the loaf drawn onto its shelf while Anna's
   * line about it is still up, then on to the closing narration.
   *
   * The loaf is written to the save here rather than read from it: this is
   * the moment it is baked, and it is the chapter after this one that reads
   * the shelf.
   */
  private feast(then: () => void): void {
    const run = state.get();
    const pick = run.jumisPick === 'none' ? (run.jumis === 'good' ? 'leave' : 'all') : run.jumisPick;
    const good = loafGood(loafFrom(pick));
    state.recordLoaf(CHAPTER_ONE, good);

    const lamp = this.lampLight();

    const overTable = pick === 'take' ? feast.jumis.take : pick === 'leave' ? feast.jumis.leave : feast.jumis.none;
    // A seat beside them is only on offer to somebody who has met them.
    const seat = run.talks.includes('meet') && run.bond >= SEAT_BOND ? feast.seat.close : feast.seat.anna;
    const parting = run.talks.includes('invited') ? [feast.mikeli] : [];

    this.narration.say([...feast.open, overTable, seat, feast.anna], () => {
      this.shelveLoaf(good);
      this.narration.say([good ? feast.loaf.good : feast.loaf.flat, ...parting], () => {
        this.tweens.add({
          targets: lamp,
          alpha: 0,
          duration: 900,
          ease: 'Sine.easeInOut',
          onComplete: () => lamp.destroy(),
        });
        then();
      });
    });
  }

  /**
   * A doorway's worth of warmth over the dusk village: the frame darkened at
   * the edges, and one pool of lamplight where the table would be. It is not
   * the inside of a house and does not pretend to be — it is enough to say
   * "evening, indoors, people" over a painting of the village at dusk, which
   * is what the slice has to work with.
   */
  private lampLight(): Phaser.GameObjects.Container {
    const { width, height } = Layout;
    const root = this.add.container(0, 0).setDepth(600).setAlpha(0);

    // Darkened at the edges, so the eye goes to the light and not the roofs.
    const edges = this.add.graphics();
    const steps = 26;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const top = height * 0.3 * (1 - t) + 2;
      const foot = height * 0.34 * (1 - t) + 2;
      const side = width * 0.22 * (1 - t) + 2;
      edges.fillStyle(Palette.ink, 0.055);
      edges.fillRect(0, 0, width, top);
      edges.fillRect(0, height - foot, width, foot);
      edges.fillRect(0, 0, side, height);
      edges.fillRect(width - side, 0, side, height);
    }
    root.add(edges);

    // The lamp over the table, and a slow guttering in it.
    const glow = this.add
      .image(width * 0.5, height * 0.58, 'fx-blob')
      .setTint(0xffc679)
      .setBlendMode(Phaser.BlendModes.ADD);
    glow.setScale((width * 0.62) / glow.width);
    root.add(glow);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.26, to: 0.38 },
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({ targets: root, alpha: 1, duration: 1400, ease: 'Sine.easeOut' });
    return root;
  }

  /**
   * The year's first loaf, onto a shelf by the oven: tall and golden, or flat
   * and heavy. The same two pictures the bag uses for it, so the loaf on the
   * shelf is recognisably the one that was carried around all day.
   */
  private shelveLoaf(good: boolean): void {
    const { width, height } = Layout;
    const x = width * 0.5;
    const boardY = height * 0.56;
    const half = scaled(190);

    const shelf = this.add.graphics().setDepth(610).setAlpha(0);
    // A board with a front edge under it, rather than a rule across the frame.
    shelf.fillStyle(Palette.timberLight, 0.6).fillRect(x - half, boardY, half * 2, scaled(8));
    shelf.fillStyle(Palette.timber, 0.9).fillRect(x - half, boardY + scaled(8), half * 2, scaled(22));
    shelf.fillStyle(Palette.ink, 0.6).fillRect(x - half, boardY + scaled(30), half * 2, scaled(12));

    // The loaf stands ON the board: bottom origin, sunk far enough into it to
    // swallow the transparent skirt the bag icons are drawn with, which left
    // it hanging in the air above the plank.
    const loaf = this.add
      .image(x, boardY + scaled(26), good ? 'item-bread-good' : 'item-bread-poor')
      .setOrigin(0.5, 1)
      .setDepth(611)
      .setAlpha(0);
    loaf.setScale(scaled(170) / loaf.width);
    // A thin year's loaf sits lower and wider on the board; a good one stands.
    if (!good) loaf.setScale(loaf.scaleX * 1.12, loaf.scaleY * 0.72);

    // What it casts on the board, so it is standing there and not pasted on.
    const shade = this.add.graphics().setDepth(610).setAlpha(0);
    shade.fillStyle(Palette.ink, 0.45).fillEllipse(x, boardY + scaled(4), loaf.displayWidth * 0.86, scaled(16));

    this.tweens.add({ targets: [shelf, shade, loaf], alpha: 1, duration: 800, ease: 'Quad.easeOut' });
    audio.play('bag', { volume: 0.25 });
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
    // The chapter is over, and the next one can look back on it.
    state.finishChapter(CHAPTER_ONE);

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

    const heading = add(width / 2, height * 0.1, () => tally.heading, { size: px(30), colour: Hex.parchmentDim });
    // What this screen is. The family playtest asked: "what is this thing at
    // the end?" — so it says so, under its own heading.
    const what = add(width / 2, height * 0.1 + scaled(56), () => stoneNote, { size: px(20), colour: Hex.parchmentDim, italic: true });

    // The two marks, left and right. Whole or stopped short, warm or cold.
    const leftX = width * 0.34;
    const rightX = width * 0.66;
    // Lower than it was, to make room for the line saying what the marks are.
    const markY = height * 0.345;

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

    const verdict = add(width / 2, height * 0.64, () => tally[kind], {
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
    const note = add(width / 2, height * 0.64 + scaled(60), noteLoc, { size: px(24), colour: Hex.rye });

    // Stacked by measured height, not by fixed fractions of the frame. At phone
    // type size — or the large text setting — the Devil's column (the cat, then
    // the hat) ran down into the verdict when each line had a fixed place.
    const layout = () => {
      const below = (o: Phaser.GameObjects.Text, gap: number) => o.y + o.height / 2 + gap;
      const place = (o: Phaser.GameObjects.Text, top: number) => o.setY(top + o.height / 2);
      const subTop = Math.max(below(rowJ, scaled(8)), below(rowV, scaled(8)));
      place(subJ, subTop);
      place(subV, subTop);
      if (hatLine) place(hatLine, below(subV, scaled(4)));
      const lowest = Math.max(below(subJ, 0), below(hatLine ?? subV, 0));
      verdict.setY(Math.max(height * 0.64, lowest + scaled(34) + verdict.height / 2));
      place(note, below(verdict, scaled(14)));
    };
    layout();

    // The way on.
    const next = this.button(width / 2, height * 0.85, ui.restart, true);
    next.txt.on('pointerdown', () => this.playAgain());
    const placeNext = () =>
      next.txt.setY(Math.max(height * 0.85, note.y + note.height / 2 + scaled(28) + next.txt.height / 2));
    placeNext();

    // Carve the marks one after the other, then let the words follow.
    const fadeUp = (target: Phaser.GameObjects.GameObject, delay: number, duration = 700, onComplete?: () => void) =>
      this.tweens.add({ targets: target, alpha: 1, duration, delay, ease: 'Quad.easeOut', onComplete });
    fadeUp(heading, 300, 600);
    fadeUp(what, 500, 600);
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
      layout();
      next.refresh();
      placeNext();
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
