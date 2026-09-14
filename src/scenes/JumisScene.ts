import Phaser from 'phaser';
import { type Loc } from '../core/i18n';
import { items, jumis, reckoning } from '../content/script';
import { state } from '../core/state';
import { jumisOutcome, type JumisPick } from '../core/rules';
import { Layout, Palette } from '../core/theme';
import { Narration } from '../ui/Narration';
import { Hotspot } from '../ui/Hotspot';
import { Chrome } from '../ui/Chrome';
import { DainaCard } from '../ui/DainaCard';
import { Reckoning } from '../ui/Reckoning';
import { Atmosphere } from '../fx/Atmosphere';
import { Bag } from '../ui/Bag';
import { Painting } from '../ui/Painting';
import { Prompt } from '../ui/Prompt';
import { attachWind, type WindPipeline } from '../fx/WindPipeline';
import { makeSwathBrush } from '../fx/textures';
import { fadeIn, goTo } from './transition';
import { audio } from '../core/audio';

/**
 * Encounter one — Jumis, the harvest spirit, in a Zemgale rye field.
 *
 * This used to be: hunt five decoys for a hidden stem, read a line, pick one of
 * three options off a list, tap once to confirm. The playtester's verdict was
 * that it was boring, and she was right — the only verb was "read".
 *
 * So the harvest is a harvest now. You take your grandfather's sickle and sweep
 * it across the rye, and the field goes down under your hand, swath by swath.
 * The one thing standing in it is the double ear, and the whole encounter turns
 * on whether you cut through it or work around it — which is something you now
 * DO rather than something you pick off a list.
 *
 * Three endings, all physical:
 *   'all'   the blade goes through the double ear. It takes two passes: the
 *           first is a warning. Nobody loses the good ending to a clumsy thumb.
 *   'leave' the field comes down around it, leaving an island of standing rye,
 *           and you bend it into the stubble and tie it. The tithe.
 *   'take'  the same island, but you pull it up and carry it home. Attested
 *           practice, and still taking rather than leaving.
 *
 * There is no timer. Nothing here can fail you — the game has never had a fail
 * state, and a clock would be the wrong kind of pressure in a game about debts.
 */

/**
 * The cutting grid, over the whole frame.
 *
 * `field.jpg` and `field_cut.jpg` differ everywhere below the horizon — crop,
 * stubble, sheaves, and the grass verge in the foreground — so the swaths have
 * to cover all of it or the seam shows. Above the horizon the two paintings are
 * the same grey sky, so those rows are revealed together on the first stroke
 * and never counted as work.
 */
const GRID = { cols: 10, rows: 6 } as const;
const CELL_W = Layout.width / GRID.cols;
const CELL_H = Layout.height / GRID.rows;
/** Rows above the horizon. Revealed for free; not part of the day's work. */
const SKY_ROWS = 2;

/** How much of the field has to be down before the harvest is finished. */
const TARGET = 0.86;

/** Positions read off the painting. Re-measure if the art is regenerated. */
const TRUE_STALK = { x: 1596, y: 540 } as const;
/**
 * The two cells the double ear stands in, excluded from the day's work so the
 * harvest can be finished without touching it. The shape the player actually
 * sees and cuts against is the ellipse below, not these.
 */
const TITHE_CELLS = ['8,2', '8,3'];
/** The patch of rye left standing around the double ear. */
const TITHE_ISLAND = { x: 1596, y: 555, rx: 155, ry: 140 } as const;
/** One sweep of the blade, in canvas pixels. Wider than tall, like the swing. */
const SWATH_W = 330;
const SWATH_H = 210;
/**
 * The boundary stone: the box sits on the painted boulder itself. It carries
 * the rule the encounter turns on, so it stays readable with the blade in hand.
 */
const HINT_STONE = { x: 888, y: 918, w: 300, h: 150 } as const;
/** jumis_bound.png, placed and tinted to sit on field_cut.jpg (see ART_NOTES). */
const BOUND = { x: 1596, y: 655, h: 190 } as const;
const STALK_TINT = 0xcdbf9b;
/** Below this line a swing meets rye; above it, sky. */
const HORIZON = Layout.height * 0.34;
/** How often the blade may be heard, however fast the hand moves. */
const SWISH_MS = 170;
/** A drag is sampled at least this often along its path, so fast strokes don't skip. */
const SAMPLE_PX = 48;

export class JumisScene extends Phaser.Scene {
  private narration!: Narration;
  private spots: Hotspot[] = [];
  private prompt!: Prompt;
  private bagUi!: Bag;
  private painting!: Painting;

  /**
   * The cut field, revealed by a mask the player paints with the blade.
   *
   * The first version of this cut the field in rectangles, and the result
   * looked exactly like what it was: a grid. The mask is a render texture
   * stamped with a soft brush, so the boundary between standing rye and
   * stubble is a swept edge rather than a staircase, and the tithe is left in
   * a round island instead of a square one.
   */
  private cutImg!: Phaser.GameObjects.Image;
  private maskRT!: Phaser.GameObjects.RenderTexture;
  /** A brush and an eraser, kept off the display list and reused every stamp. */
  private brush!: Phaser.GameObjects.Image;
  private island!: Phaser.GameObjects.Image;
  /** Grid cells are only the progress metric now; the picture comes from the mask. */
  private done = new Set<string>();
  /** Playable cells, tithe excluded — the denominator for "how much is down". */
  private workCells: string[] = [];
  /** The blade has been warned off the double ear at least once. */
  private titheWarned = false;
  /** Once true the island stops being protected — the player meant it. */
  private titheCut = false;
  private skyDone = false;
  /**
   * Where the current stroke began, or null between strokes.
   *
   * The double ear is only cut by a stroke that STARTS on it. A stroke that
   * merely passes over it is a hand sweeping across the field, and a sweep at
   * the wrong height crosses it twice in a row — which, with a simpler rule,
   * managed to warn and then immediately cut inside a single swipe. Putting
   * the blade down on the thing itself is the only way to mean it.
   */
  private strokeFrom: { x: number; y: number } | null = null;
  /** True only while the blade can actually cut something. */
  private cutting = false;
  private nudged = false;
  /**
   * Well before any clock the scene will ever report. `time.now` starts near
   * zero in a freshly started scene, so a plain 0 here silently swallowed the
   * first swing's sound and — worse — the first warning off the double ear.
   */
  private lastSwish = -99999;
  private lastWarn = -99999;
  private lastSample: { x: number; y: number } | null = null;

  private stalk!: Phaser.GameObjects.Image;
  private bound!: Phaser.GameObjects.Image;
  private wind: WindPipeline | null = null;
  /** The faint band over the rye that says "swing here" while the sickle is in hand. */
  private band!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Jumis');
  }

  create(): void {
    audio.ambient('field');

    // Phaser reuses this instance on every visit, so every field starts over.
    this.spots = [];
    this.done = new Set();
    this.workCells = [];
    this.titheWarned = false;
    this.titheCut = false;
    this.skyDone = false;
    this.strokeFrom = null;
    this.cutting = false;
    this.nudged = false;
    this.lastSwish = -99999;
    this.lastWarn = -99999;
    this.lastSample = null;
    state.set('scene', 'Jumis');

    const { width, height } = Layout;
    fadeIn(this);
    this.painting = new Painting(this, 'bg-field');

    this.buildCutLayer();

    // The double ear, painted in from the start. It is no longer hidden: the
    // hunt was the least interesting minute in the game, and the encounter is
    // better when the player can see the thing they will have to decide about
    // while they work their way towards it.
    // Above the cut layer rather than inside the painting: the stubble is
    // revealed over the standing crop, and the one stem that survives it has
    // to be drawn on top of both.
    this.stalk = this.add
      .image(TRUE_STALK.x, TRUE_STALK.y + 84, 'jumis-stalk')
      .setOrigin(0.5, 1)
      .setDepth(6)
      // Tinted into the field's own washed-out gold, so it reads as a plant
      // rather than as a marker.
      .setTint(STALK_TINT);
    this.stalk.setScale(158 / this.stalk.height);
    this.swayStalk();

    // The tithe, as the old women left it: bent to the ground and tied.
    this.bound = this.add
      .image(BOUND.x, BOUND.y, 'jumis-bound')
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setTint(STALK_TINT)
      .setAlpha(0);
    this.bound.setScale(BOUND.h / this.bound.height);

    // Wind. The displacement pass on the standing crop is what makes the rye
    // move; it goes on the painting, so the text drawn over it stays still.
    // Both lines are read off field.jpg: the crop starts under the treeline at
    // 0.4, and the near foreground — stubble, verge, stone, the sickle lying
    // across it — starts around 0.78.
    this.wind = attachWind(this.painting.root, { amp: 0.0045, horizon: 0.4, ground: 0.78 });

    // No slow drift here, unlike the other two scenes. The cut field is
    // revealed through a camera-space mask, and scaling the painting under a
    // mask that does not scale with it slides the harvested edge across the
    // crop by up to thirty pixels over a minute.
    new Atmosphere(this)
      // Chaff blowing off the crop, left to right with the wind. Brown flecks,
      // not pale ones: cream on pale-gold rye could not be seen at all.
      .motes({ tint: 0x7a5a30, count: 48, driftX: 70, scale: 0.1, alpha: 0.7, band: [0.34, 0.86] })
      .birds({ band: [0.1, 0.26], every: [9000, 20000], tint: 0x3a3d38 })
      .breathe({ amount: 0.05, duration: 24000 });

    const bandBottom = height - Layout.panelH;
    this.band = this.add
      .rectangle(width / 2, (HORIZON + bandBottom) / 2, width, bandBottom - HORIZON, Palette.ryeBright, 1)
      .setDepth(190)
      .setAlpha(0.03)
      .setVisible(false);
    this.tweens.add({
      targets: this.band,
      alpha: 0.08,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      if (!holding && !over.length) {
        this.narration.mutter(this.cutting ? [items.cutPrompt] : jumis.nothing);
      }
    });

    // The stroke itself. Every sample along a drag is a swing of the blade.
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.cutting || this.bagUi?.holding !== 'sickle' || !p.isDown) {
        this.lastSample = null;
        return;
      }
      this.sweep(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => {
      this.lastSample = null;
      this.strokeFrom = null;
    });

    this.bagUi = new Bag(this);

    // A tap with the sickle cuts the one swath under it. The drag above is the
    // real verb; this is here so a player who taps rather than sweeps still
    // gets somewhere, and so the very first touch teaches what the tool does.
    this.bagUi.onUse = (id, x, y) => {
      if (!this.cutting) {
        this.tell(items.notYet);
        return false;
      }
      if (id !== 'sickle') {
        this.tell(items.cutWrongTool);
        return false;
      }
      if (y < HORIZON) {
        // Say so, and keep the sickle in hand to aim again.
        this.tell(items.cutWrongPlace);
        return true;
      }
      // This is a press, so it opens a stroke — which is what lets a deliberate
      // tap on the double ear cut it while a sweep across it never can.
      this.strokeFrom = { x, y };
      this.strike(x, y);
      // Always keep the blade in hand: a harvest is not one swing.
      return true;
    };

    this.prompt = new Prompt(this);

    new DainaCard(this, 'jumis', () => {
      this.narration.say(jumis.arrive, () => this.beginCut());
    });
  }

  update(): void {
    this.band?.setVisible(this.cutting && this.bagUi?.holding === 'sickle');
    this.bagUi?.attention(this.cutting && !this.bagUi.holding);
  }

  // --- the field, as sixty pieces -------------------------------------------

  /**
   * The cut field and the mask that lets it through.
   *
   * It sits OUTSIDE the painting group, unlike everything else in this scene.
   * A bitmap mask is evaluated in camera space, so anything that moves the
   * thing being masked without moving the mask — the group's slow drift, the
   * wind shader — slides the picture out from under its own outline. The
   * standing rye keeps the wind; the stubble underneath it does not need it.
   */
  private buildCutLayer(): void {
    const { width, height } = Layout;

    this.maskRT = this.make.renderTexture({ x: 0, y: 0, width, height }, false).setOrigin(0, 0);

    this.cutImg = this.add
      .image(width / 2, height / 2, 'bg-field-cut')
      .setDisplaySize(width, height)
      .setDepth(5);
    this.cutImg.setMask(new Phaser.Display.Masks.BitmapMask(this, this.maskRT));

    makeSwathBrush(this);
    this.brush = this.make.image({ key: 'fx-swath' }, false).setOrigin(0.5).setDisplaySize(SWATH_W, SWATH_H);
    this.island = this.make
      .image({ key: 'fx-swath' }, false)
      .setOrigin(0.5)
      .setDisplaySize(TITHE_ISLAND.rx * 2, TITHE_ISLAND.ry * 2);

    for (let row = SKY_ROWS; row < GRID.rows; row++) {
      for (let col = 0; col < GRID.cols; col++) {
        const key = `${col},${row}`;
        if (!TITHE_CELLS.includes(key)) this.workCells.push(key);
      }
    }
  }

  /** Is this point on the standing patch the double ear grows in? */
  private inIsland(x: number, y: number): boolean {
    const dx = (x - TITHE_ISLAND.x) / TITHE_ISLAND.rx;
    const dy = (y - TITHE_ISLAND.y) / TITHE_ISLAND.ry;
    return dx * dx + dy * dy <= 1;
  }

  private cellKey(x: number, y: number): string | null {
    const col = Math.floor(x / CELL_W);
    const row = Math.floor(y / CELL_H);
    if (col < 0 || col >= GRID.cols || row < SKY_ROWS || row >= GRID.rows) return null;
    return `${col},${row}`;
  }

  /** Fraction of the day's work that is down. */
  private get progress(): number {
    if (!this.workCells.length) return 0;
    let n = 0;
    for (const key of this.workCells) if (this.done.has(key)) n++;
    return n / this.workCells.length;
  }

  /** One swept mark of the blade painted into the mask. */
  private paint(x: number, y: number): void {
    this.maskRT.draw(this.brush, x, y);
    // The island is restored after every stroke that came near it, so a soft
    // brush sweeping past cannot nibble the tithe away a few pixels at a time.
    if (!this.titheCut && Math.abs(x - TITHE_ISLAND.x) < SWATH_W + TITHE_ISLAND.rx) {
      this.maskRT.erase(this.island, TITHE_ISLAND.x, TITHE_ISLAND.y);
    }
  }

  /**
   * The sky and the treeline, which are all but the same painting either way,
   * go together on the first stroke.
   *
   * Without this the two horizons — they sit about twenty pixels apart — would
   * meet along whatever line the player's highest stroke happened to reach. A
   * single very soft stamp fades the swap out well before the crop starts, so
   * the seam has nowhere to be.
   */
  private revealSky(): void {
    if (this.skyDone) return;
    this.skyDone = true;
    const wide = this.make.image({ key: 'fx-swath' }, false).setOrigin(0.5).setDisplaySize(2600, 700);
    this.maskRT.draw(wide, Layout.width / 2, 110);
    wide.destroy();
  }

  // --- cutting --------------------------------------------------------------

  private beginCut(): void {
    // Clear the panel: the sickle, the stubble and the boundary stone all live
    // in the bottom third of this painting, and the player needs to see them.
    this.narration.hide();
    this.cutting = true;
    this.prompt.show(items.cutPrompt);

    this.spots.push(
      new Hotspot(this, {
        x: HINT_STONE.x,
        y: HINT_STONE.y,
        w: HINT_STONE.w,
        h: HINT_STONE.h,
        label: jumis.hintStone.label,
        // Readable with the blade in hand as well. The rule is the point of the
        // encounter, and a player halfway through the field is exactly the one
        // who wants to check it.
        guard: () => !this.bagUi.holding,
        onClick: () => this.narration.flash(jumis.hintStone.text),
      }),
    );
  }

  /**
   * A drag, sampled along its path. A fast flick across the frame arrives as
   * two pointermove events fifteen hundred pixels apart; without interpolating
   * between them it would cut two swaths and skip the eight in between.
   */
  private sweep(x: number, y: number): void {
    const from = this.lastSample;
    this.lastSample = { x, y };
    if (!from) {
      this.strike(x, y);
      return;
    }
    const dist = Phaser.Math.Distance.Between(from.x, from.y, x, y);
    const steps = Math.max(1, Math.ceil(dist / SAMPLE_PX));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.strike(Phaser.Math.Linear(from.x, x, t), Phaser.Math.Linear(from.y, y, t));
    }
  }

  /** One swing of the blade at a point in the field. */
  private strike(x: number, y: number): void {
    if (!this.cutting || y < HORIZON) return;

    // The tithe is a shape in the painting, not a cell in a grid — the blade
    // has to be actually on the double ear for this to be about the double ear.
    if (!this.titheCut && this.inIsland(x, y)) {
      this.strikeTithe();
      return;
    }

    const key = this.cellKey(x, y);
    if (!key) return;

    this.revealSky();
    this.paint(x, y);
    if (this.done.has(key)) return;
    this.done.add(key);
    this.swish();
    // The rye stops moving as it comes down. Tying the wind to the progress
    // rather than snapping it off at the end means the field goes quiet under
    // the player's own hand.
    if (this.wind) this.wind.amp = 0.0045 * (1 - this.progress);

    if (this.progress >= TARGET) {
      this.finishCut();
    } else if (!this.nudged && this.progress >= 0.55) {
      this.nudged = true;
      this.prompt.show(jumis.almost, 250);
    }
  }

  /**
   * The blade reaching the double ear.
   *
   * A stroke that merely passes over it shakes the stem and says so. Only a
   * stroke that STARTED on it goes through, and only after the player has been
   * warned at least once.
   *
   * Without this, the good ending could be lost to a thumb sweeping a little
   * too far right — in a game whose whole subject is deliberate choices about
   * what you take. Cutting it has to be something the player did on purpose.
   */
  private strikeTithe(): void {
    const from = this.strokeFrom;
    const deliberate = this.titheWarned && !!from && this.inIsland(from.x, from.y);
    if (!deliberate) {
      this.warnOffTithe();
      return;
    }
    this.cutting = false;
    this.titheCut = true;
    this.paint(TITHE_ISLAND.x, TITHE_ISLAND.y);
    this.paint(TITHE_ISLAND.x, TITHE_ISLAND.y - TITHE_ISLAND.ry * 0.6);
    this.swish();
    this.cameras.main.flash(90, 240, 232, 208, false);
    this.cameras.main.shake(140, 0.002);
    this.tweens.killTweensOf(this.stalk);
    this.tweens.add({
      targets: this.stalk,
      angle: 80,
      y: this.stalk.y + 40,
      duration: 300,
      ease: 'Cubic.easeIn',
      onComplete: () => this.tweens.add({ targets: this.stalk, alpha: 0, duration: 250 }),
    });
    this.settle(() => this.resolve('all'));
  }

  /** The stem shrugs the blade off, and says why, at most once every few seconds. */
  private warnOffTithe(): void {
    const now = this.time.now;
    if (now - this.lastWarn < 2400) return;
    this.lastWarn = now;
    this.titheWarned = true;
    this.prompt.flash(jumis.titheWarn, 2400);
    this.tweens.killTweensOf(this.stalk);
    this.tweens.add({
      targets: this.stalk,
      angle: { from: -9, to: 9 },
      duration: 90,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.stalk.setAngle(0);
        this.swayStalk();
      },
    });
  }

  private swayStalk(): void {
    this.tweens.add({
      targets: this.stalk,
      angle: { from: -2.4, to: 2.4 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private swish(): void {
    const now = this.time.now;
    if (now - this.lastSwish < SWISH_MS) return;
    this.lastSwish = now;
    audio.play('sickle', { volume: 0.5 });
  }

  /**
   * The day's work is done and the double ear is still standing. Whatever is
   * left over goes down on its own — chasing the last two swaths around the
   * frame is not a puzzle — and then the encounter asks its one question.
   */
  private finishCut(): void {
    this.cutting = false;
    // Everything left over goes down on its own. A player hunting the last two
    // patches around the frame is doing bookkeeping, not harvesting.
    for (const key of this.workCells) {
      if (this.done.has(key)) continue;
      this.done.add(key);
      const [col, row] = key.split(',').map(Number);
      this.paint(col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2);
    }
    this.settle(() => {
      this.narration.say(jumis.standing, () => {
        this.narration.ask(jumis.question, [
          { label: jumis.choices.leave, onPick: () => this.resolve('leave') },
          { label: jumis.choices.take, onPick: () => this.resolve('take') },
        ]);
      });
    });
  }

  /** Puts the blade away, clears the frame, and lets the picture land first. */
  private settle(after: () => void): void {
    this.bagUi.putBack();
    this.prompt.hide(250);
    this.spots.forEach((s) => s.setEnabled(false));
    // Whatever is left of the wind goes with the last of the standing crop.
    const wind = this.wind;
    if (wind && wind.amp > 0) {
      this.tweens.addCounter({
        from: wind.amp,
        to: 0,
        duration: 700,
        ease: 'Sine.easeOut',
        onUpdate: (tw) => {
          wind.amp = tw.getValue() ?? 0;
        },
      });
    }
    this.time.delayedCall(900, after);
  }

  /**
   * A remark on something the player tried. In the panel when it is free; at
   * the top of the frame when the panel is holding a decision, so the choices
   * are not wiped.
   */
  private tell(line: Loc): void {
    if (this.narration.busy) this.prompt.flash(line);
    else this.narration.flash(line);
  }

  // --- the reckoning --------------------------------------------------------

  private resolve(pick: JumisPick): void {
    const outcome = jumisOutcome(pick);
    const good = outcome === 'good';

    // Commit now, before the prose plays: a player who closes the tab
    // mid-sentence comes back to a harvested field, not a half-finished one.
    // The loaf that follows from this is Anna's to hand over back in the
    // village, so there is nothing else to save here.
    state.set('jumis', outcome);

    if (pick === 'leave') {
      this.tweens.add({ targets: this.stalk, alpha: 0, duration: 600, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: this.bound, alpha: 1, duration: 900, ease: 'Sine.easeInOut' });
    } else if (pick === 'take') {
      this.tweens.killTweensOf(this.stalk);
      this.tweens.add({
        targets: this.stalk,
        y: this.stalk.y - 60,
        alpha: 0,
        duration: 520,
        ease: 'Quad.easeIn',
      });
    }

    const lines = [...jumis.outcomes[pick], good ? jumis.reward.good : jumis.reward.poor];
    this.narration.say(lines, () => {
      this.narration.hide();
      // The prose says what happened. This says what it was worth.
      const r = good ? reckoning.jumis.good : reckoning.jumis.poor;
      new Reckoning(this, {
        sign: 'jumis',
        good,
        verdict: r.verdict,
        gain: r.gain,
        missed: r.missed,
        onDone: () => goTo(this, 'Village'),
      });
    });
  }
}
