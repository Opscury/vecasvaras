import Phaser from 'phaser';
import { type Loc } from '../core/i18n';
import { items, jumis, reckoning } from '../content/script';
import { state } from '../core/state';
import {
  CLEAN_AT,
  DONE_AT,
  jumisOutcome,
  judgeField,
  sheavesFrom,
  type JumisPick,
} from '../core/rules';
import { COV, CROP_TOP, type Ellipse, FieldCover, inEllipse } from '../core/field';
import { lore } from '../core/lore';
import { Layout, Palette, Timing } from '../core/theme';
import { Narration } from '../ui/Narration';
import { Hotspot } from '../ui/Hotspot';
import { Chrome } from '../ui/Chrome';
import { Holdings } from '../ui/Holdings';
import { DainaCard } from '../ui/DainaCard';
import { Reckoning } from '../ui/Reckoning';
import { SheafTally } from '../ui/SheafTally';
import { Atmosphere } from '../fx/Atmosphere';
import { Bag } from '../ui/Bag';
import { Painting } from '../ui/Painting';
import { Prompt } from '../ui/Prompt';
import { ignoreKey, keysOf, markHandled } from '../ui/keys';
import { attachWind, type WindPipeline } from '../fx/WindPipeline';
import { makeBird, makeBlob, makeGroundBird, makeIslandEraser, makeSwathBrush } from '../fx/textures';
import { flags } from '../core/flags';
import { fadeIn, goTo } from './transition';
import { audio } from '../core/audio';

/**
 * Encounter one — Jumis, the harvest spirit, in a Zemgale rye field.
 *
 * You take your grandfather's sickle and sweep it across the rye, and the
 * field goes down under your hand, swath by swath, counted in sheaves above it.
 * The one thing standing in it is the double ear.
 *
 * The harvest ends when the player says it does. What they left decides it:
 *
 *   all    the blade went through the double ear. It takes a deliberate
 *          second stroke — nobody loses the good ending to a clumsy thumb.
 *   spare  a third of the field or more left standing. The field is content;
 *          the village goes short. The game asks once whether they mean it.
 *   leave  the ear standing in a little island, then bent to the ground by
 *          hand — a stroke downward from the ear. The tithe.
 *   take   the same, but pulled up by the roots — a stroke upward — and
 *          carried home. A real custom, and a different good.
 *
 * There is no timer, and nothing here can fail. A clock would be the wrong
 * kind of pressure in a game about what you leave standing.
 *
 * Started with `{ after: true }`, the scene is the same field on a later
 * visit: cut as it was left, the ear bound or gone, no work to do.
 */

/** Rows above this line are sky; a swing there meets nothing. */
const HORIZON = Layout.height * 0.34;

/**
 * The double ear. Positions read off the painting — re-measure if the art is
 * regenerated. `base` is the ground it grows out of.
 */
const TRUE_STALK = { x: 1596, base: 652, h: 192 } as const;
/** Where a stroke counts as being ON the ear. */
const EAR: Ellipse = { x: 1596, y: 556, rx: 62, ry: 105 };
/**
 * The little tuft of standing rye the ear grows from. Always left unless the
 * ear itself goes, so the ear never stands on bare stubble; everything beyond
 * it is the player's to cut or leave.
 */
const TUFT: Ellipse = { x: 1600, y: 578, rx: 138, ry: 104 };
const TUFT_LOBES = [
  { dx: 0, dy: 0, sx: 1, sy: 1 },
  { dx: -0.42, dy: -0.46, sx: 0.66, sy: 0.7 },
  { dx: 0.4, dy: -0.36, sx: 0.6, sy: 0.66 },
  { dx: 0.18, dy: 0.42, sx: 0.7, sy: 0.55 },
] as const;
/** The same patch, a little generous, left out of the harvest measure. */
const TUFT_MEASURE: Ellipse = { x: 1600, y: 566, rx: 160, ry: 126 };

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
const WIND_AMP = 0.0045;
/** How often the blade may be heard, however fast the hand moves. */
const SWISH_MS = 170;
/** A drag is sampled at least this often along its path, so fast strokes don't skip. */
const SAMPLE_PX = 48;
/** A gesture on the ear shorter than this is a tap. */
const GESTURE_MIN = 50;
/** How long the ear waits for a hand before the list is offered instead. */
const LIST_AFTER_MS = 20000;

type Phase = 'arrive' | 'cutting' | 'deciding' | 'gesture' | 'resolved' | 'after';

export class JumisScene extends Phaser.Scene {
  private narration!: Narration;
  private spots: Hotspot[] = [];
  private prompt!: Prompt;
  private bagUi!: Bag;
  private painting!: Painting;
  private tally!: SheafTally;
  private phase: Phase = 'arrive';

  /** The cut field, revealed by a mask the player paints with the blade. */
  private cutImg!: Phaser.GameObjects.Image;
  private maskRT!: Phaser.GameObjects.RenderTexture;
  private brush!: Phaser.GameObjects.Image;
  private eraser!: Phaser.GameObjects.Image;
  /** What the mask says, counted. */
  private cover!: FieldCover;
  private tuftDirty = false;
  private skyDone = false;
  private enoughSpot: Hotspot | null = null;

  /** Warned off the double ear at least once. */
  private titheWarned = false;
  private lastWarn = -99999;
  private lastSwish = -99999;
  private lastSample: { x: number; y: number } | null = null;
  /** When the last sample of a stroke arrived, for its speed. */
  private lastSampleAt = 0;
  /** How fast the blade is moving, px/ms, smoothed. Sets the pitch of the swish. */
  private strokeSpeed = 0;
  /** When the blade last took any rye; the wind rises when it has been still a while. */
  private lastCutAt = 0;
  private lastGust = -99999;
  private lastBirds = -99999;
  /**
   * Where the current stroke began, or null between strokes. The double ear is
   * only cut by a stroke that STARTS on it: a sweep across the field at the
   * wrong height would otherwise warn and cut inside a single swipe.
   */
  private strokeFrom: { x: number; y: number } | null = null;

  /** A drag that started on the ear, once the field is down. */
  private gestureFrom: { x: number; y: number } | null = null;
  private gestureTaps = 0;
  /** When the last gesture ended, so the bag's own release does not answer it too. */
  private gestureEndedAt = -99999;
  private earSpot: Hotspot | null = null;
  private listTimer: Phaser.Time.TimerEvent | null = null;

  private stalk!: Phaser.GameObjects.Image;
  private bound!: Phaser.GameObjects.Image;
  private earGlow!: Phaser.GameObjects.Image;
  private wind: WindPipeline | null = null;
  /** The faint band over the rye that says "swing here" while the sickle is in hand. */
  private band!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Jumis');
  }

  create(data?: { after?: boolean }): void {
    const after = data?.after === true;
    audio.ambient('field');

    // Phaser reuses this instance on every visit, so every field starts over.
    this.spots = [];
    this.phase = after ? 'after' : 'arrive';
    this.tuftDirty = false;
    this.skyDone = false;
    this.enoughSpot = null;
    this.titheWarned = false;
    this.lastWarn = -99999;
    this.lastSwish = -99999;
    this.lastSample = null;
    this.strokeFrom = null;
    this.gestureFrom = null;
    this.gestureTaps = 0;
    this.gestureEndedAt = -99999;
    this.earSpot = null;
    this.listTimer = null;
    if (!after) state.set('scene', 'Jumis');

    const { width, height } = Layout;
    fadeIn(this);
    this.painting = new Painting(this, 'bg-field');
    this.cover = new FieldCover([TUFT_MEASURE]);
    this.buildCutLayer();

    // The double ear, painted in from the start: the player should see the
    // thing they will have to decide about while they work their way to it.
    this.stalk = this.add
      .image(TRUE_STALK.x, TRUE_STALK.base, 'jumis-stalk')
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setTint(STALK_TINT);
    this.stalk.setScale(TRUE_STALK.h / this.stalk.height);

    // The tithe, as the old women left it: bent to the ground and tied.
    this.bound = this.add
      .image(BOUND.x, BOUND.y, 'jumis-bound')
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setTint(STALK_TINT)
      .setAlpha(0);
    this.bound.setScale(BOUND.h / this.bound.height);

    // A warm breath of light behind the ear, when it is waiting for a hand.
    makeBlob(this);
    this.earGlow = this.add
      .image(EAR.x, EAR.y + 20, 'fx-blob')
      .setDepth(5.5)
      .setTint(0xffe2a0)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setScale(2.4, 3.2)
      .setAlpha(0);

    // Wind on the standing crop. The cut field sits over it and does not move.
    this.wind = attachWind(this.painting.root, { amp: after ? 0 : WIND_AMP, horizon: 0.4, ground: 0.78 });

    new Atmosphere(this)
      // Chaff blowing off the crop, left to right with the wind.
      .motes({
        tint: 0x7a5a30,
        count: after ? 18 : 48,
        driftX: after ? 30 : 70,
        scale: 0.1,
        alpha: 0.7,
        band: [0.34, 0.86],
      })
      .birds({ band: after ? [0.2, 0.34] : [0.1, 0.26], every: after ? [5000, 11000] : [9000, 20000], tint: 0x3a3d38 })
      .breathe({ amount: 0.05, duration: 24000 });

    const bandBottom = height - Layout.panelH;
    this.band = this.add
      .rectangle(width / 2, (HORIZON + bandBottom) / 2, width, bandBottom - HORIZON, Palette.ryeBright, 1)
      .setDepth(190)
      .setAlpha(0.03)
      .setVisible(false);
    this.tweens.add({ targets: this.band, alpha: 0.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });
    new Holdings(this, undefined, { bread: false });
    this.tally = new SheafTally(this, {
      title: jumis.sheaves,
      enough: { label: jumis.enough, onPress: () => this.finishCut() },
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      // The double ear, once the field is down: a hand on it starts a gesture.
      if (this.phase === 'gesture' && !this.narration.busy && inEllipse(EAR, p.worldX, p.worldY)) {
        this.gestureFrom = { x: p.worldX, y: p.worldY };
        this.cancelList();
        return;
      }
      if (!holding && !over.length) {
        this.narration.mutter(this.phase === 'cutting' ? [items.cutPrompt] : jumis.nothing);
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.gestureFrom) {
        if (p.isDown) this.previewGesture(p.worldX - this.gestureFrom.x, p.worldY - this.gestureFrom.y);
        return;
      }
      // The stroke itself. Every sample along a drag is a swing of the blade.
      if (this.phase !== 'cutting' || this.bagUi?.holding !== 'sickle' || !p.isDown) {
        this.lastSample = null;
        return;
      }
      this.sweep(p.worldX, p.worldY);
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.lastSample = null;
      this.strokeFrom = null;
      if (this.gestureFrom) {
        const from = this.gestureFrom;
        this.gestureFrom = null;
        this.gestureEndedAt = this.time.now;
        this.commitGesture(p.worldX - from.x, p.worldY - from.y);
      }
    });

    // The keyboard harvest: with the sickle in hand and nothing focused, Enter
    // or Space cuts the next piece still standing, so the field can be
    // brought in without a pointer. Registered before the bag, so it gets the
    // key first.
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ignoreKey(this, ev)) return;
      const k = ev.key;
      if (this.phase === 'cutting' && (k === 'p' || k === 'P')) {
        markHandled(ev);
        if (this.cover.cut >= DONE_AT) this.finishCut();
        else this.prompt.flash(jumis.notEnough, 2000);
        return;
      }
      if (this.phase !== 'cutting' || this.bagUi.holding !== 'sickle') return;
      if ((k !== 'Enter' && k !== ' ') || keysOf(this).focus) return;
      markHandled(ev);
      const at = this.cover.nextStanding();
      if (!at) return;
      this.strokeFrom = null;
      this.strike(at.x, at.y);
      this.protectTuft();
    });

    this.bagUi = new Bag(this);
    this.bagUi.onUse = (id, x, y) => this.useItem(id, x, y);

    this.prompt = new Prompt(this);

    if (after) {
      this.buildAfter();
      return;
    }

    this.swayStalk();
    DainaCard.open(this, 'jumis', () => {
      this.narration.say(jumis.arrive, () => this.beginCut());
    });
  }

  update(): void {
    this.band?.setVisible(this.phase === 'cutting' && this.bagUi?.holding === 'sickle');
    this.breeze();
    this.bagUi?.attention(this.phase === 'cutting' && !this.bagUi.holding && !this.narration.busy);
  }

  /** Something from the bag, used on a point in the field. */
  private useItem(id: string, x: number, y: number): boolean {
    if (this.gestureFrom || this.time.now - this.gestureEndedAt < 120) return true;
    if (this.tally.enoughContains(x, y)) {
      this.finishCut();
      return false;
    }
    if (id === 'cat') {
      this.tell(jumis.replies.cat);
      return false;
    }
    if (id === 'bread') {
      this.tell(jumis.replies.bread);
      return false;
    }
    if (this.phase === 'gesture') {
      // With the blade in hand, a press on the ear starts a stroke like any
      // other; anywhere else, there is nothing left to cut.
      if (inEllipse(EAR, x, y)) {
        this.cancelList();
        if (!this.input.activePointer.isDown) {
          // Enter, with the blade on the focused ear. There is no stroke to
          // follow from a key, so this is the deliberate cut itself — under
          // the same warning a swipe gets first.
          if (!this.titheWarned) this.warnOffEar();
          else this.cutEar();
          return true;
        }
        this.gestureFrom = { x, y };
        return true;
      }
      this.tell(jumis.gesturePrompt);
      return true;
    }
    if (this.phase !== 'cutting') {
      this.tell(items.notYet);
      return false;
    }
    if (y < HORIZON) {
      this.tell(items.cutWrongPlace);
      return true;
    }
    // A press opens a stroke — which is what lets a deliberate press on the
    // double ear cut it while a sweep across it never can.
    this.strokeFrom = { x, y };
    this.strike(x, y);
    this.protectTuft();
    // Always keep the blade in hand: a harvest is not one swing.
    return true;
  }

  // --- the field ------------------------------------------------------------

  /**
   * The cut field and the mask that lets it through. It sits OUTSIDE the
   * painting group: a bitmap mask is evaluated in camera space, so anything
   * that moves the masked image without moving the mask — the drift, the wind
   * — slides the picture out from under its own outline.
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
    makeIslandEraser(this);
    this.brush = this.make.image({ key: 'fx-swath' }, false).setOrigin(0.5).setDisplaySize(SWATH_W, SWATH_H);
    this.eraser = this.make.image({ key: 'fx-island' }, false).setOrigin(0.5);
  }

  /** One swept mark of the blade, in the picture. */
  private paint(x: number, y: number): void {
    this.maskRT.draw(this.brush, x, y);
    if (Math.abs(x - TUFT.x) < SWATH_W / 2 + TUFT.rx * 1.4 && Math.abs(y - TUFT.y) < SWATH_H / 2 + TUFT.ry * 1.4) {
      this.tuftDirty = true;
    }
  }

  /**
   * Puts the ear's tuft back after a stroke has swept past it. Three
   * overlapping soft stamps, twice over, so what is left is a patch somebody
   * worked around rather than a perfect oval punched in the stubble.
   */
  private protectTuft(force = false): void {
    if (!this.tuftDirty && !force) return;
    this.tuftDirty = false;
    for (let pass = 0; pass < 2; pass++) {
      for (const lobe of TUFT_LOBES) {
        this.eraser.setDisplaySize(TUFT.rx * 2 * lobe.sx, TUFT.ry * 2 * lobe.sy);
        this.maskRT.erase(this.eraser, TUFT.x + TUFT.rx * lobe.dx, TUFT.y + TUFT.ry * lobe.dy);
      }
    }
  }

  /** The tuft goes too — the ear was cut or pulled. */
  private clearTuft(): void {
    this.brush.setDisplaySize(TUFT.rx * 2.6, TUFT.ry * 2.8);
    this.maskRT.draw(this.brush, TUFT.x, TUFT.y - 20);
    this.brush.setDisplaySize(SWATH_W, SWATH_H);
  }

  /**
   * The sky and treeline are all but the same painting either way; they go
   * together on the first stroke, faded out well before the crop, so the two
   * horizons never meet along whatever line the highest stroke reached.
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
    this.narration.hide();
    this.phase = 'cutting';
    this.prompt.show(items.cutPrompt);
    this.tally.set(0, false);
    this.tally.show();

    this.spots.push(
      new Hotspot(this, {
        id: 'stone',
        x: HINT_STONE.x,
        y: HINT_STONE.y,
        w: HINT_STONE.w,
        h: HINT_STONE.h,
        label: jumis.hintStone.label,
        guard: () => !this.bagUi.holding,
        onClick: () => {
          this.narration.flash(jumis.hintStone.text);
          lore.unlock('jumis');
        },
      }),
    );
  }

  /**
   * A drag, sampled along its path. A fast flick across the frame arrives as
   * two pointermove events far apart; without interpolating between them it
   * would cut two swaths and skip the ones in between.
   */
  private sweep(x: number, y: number): void {
    const from = this.lastSample;
    this.lastSample = { x, y };
    const now = this.time.now;
    if (from) {
      const dt = Math.max(8, now - this.lastSampleAt);
      const v = Phaser.Math.Distance.Between(from.x, from.y, x, y) / dt;
      this.strokeSpeed = Phaser.Math.Linear(this.strokeSpeed, v, 0.5);
    }
    this.lastSampleAt = now;
    if (!from) {
      this.strike(x, y);
      this.protectTuft();
      return;
    }
    const dist = Phaser.Math.Distance.Between(from.x, from.y, x, y);
    const steps = Math.max(1, Math.ceil(dist / SAMPLE_PX));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.strike(Phaser.Math.Linear(from.x, x, t), Phaser.Math.Linear(from.y, y, t));
      if (this.phase !== 'cutting') break;
    }
    this.protectTuft();
  }

  /** One swing of the blade at a point in the field. */
  private strike(x: number, y: number): void {
    if (this.phase !== 'cutting' || y < HORIZON) return;
    if (inEllipse(EAR, x, y)) {
      this.strikeEar();
      return;
    }
    this.revealSky();
    this.paint(x, y);
    if (this.cover.stamp(x, y, SWATH_W, SWATH_H) > 0) {
      this.lastCutAt = this.time.now;
      this.swish();
      this.scatter(x, y);
      this.onProgress();
    }
  }

  private onProgress(): void {
    const cut = this.cover.cut;
    // The rye stops moving as it comes down, under the player's own hand.
    if (this.wind) this.wind.amp = WIND_AMP * Math.max(0.12, 1 - cut);
    this.tally.set(sheavesFrom(cut, false));
    if (cut >= DONE_AT && !this.enoughSpot) this.offerEnough();
    if (cut >= CLEAN_AT) this.finishCut();
  }

  /** The harvest can be called finished from here on. */
  private offerEnough(): void {
    this.tally.setEnough(true);
    this.prompt.flash(jumis.enoughHint, 2800);
    const at = this.tally.enoughCenter;
    if (!at) return;
    // For the keyboard: Tab reaches the button like any other thing.
    this.enoughSpot = new Hotspot(this, {
      id: 'enough',
      x: at.x,
      y: at.y,
      w: 250,
      h: 80,
      label: jumis.enough,
      discreet: true,
      onClick: () => this.finishCut(),
    });
    this.enoughSpot.zone.disableInteractive();
    this.spots.push(this.enoughSpot);
  }

  /**
   * The blade reaching the double ear. A stroke that merely passes over it
   * shakes the stem and says so. Only a stroke that STARTED on it goes
   * through, and only after the player has been warned at least once.
   */
  private strikeEar(): void {
    const from = this.strokeFrom;
    const deliberate = this.titheWarned && !!from && inEllipse(EAR, from.x, from.y);
    if (!deliberate) {
      this.warnOffEar();
      return;
    }
    this.cutEar();
  }

  private warnOffEar(): void {
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

  /** The blade goes through the double ear, and everything else goes with it. */
  private cutEar(): void {
    const wasCutting = this.phase === 'cutting';
    this.phase = 'deciding';
    this.bagUi.putBack();
    this.swish();
    this.clearTuft();
    if (wasCutting) this.fellTheRest();
    this.cover.fellAll();
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
    this.tally.setEnough(false);
    this.enoughSpot?.setEnabled(false);
    this.prompt.hide(200);
    // The heaviest sheaf in the field, and the one jump in the count that is
    // bigger than the rest — which is exactly why it tempts.
    this.tally.set(sheavesFrom(1, true));
    this.calmWind();
    this.time.delayedCall(wasCutting ? 1400 : 500, () => this.resolve('all'));
  }

  /**
   * Everything still standing goes down, spread over a second and a bit so the
   * end of the harvest reads as a sweep rather than a cut to a new picture.
   */
  private fellTheRest(totalMs = 1100): void {
    const left: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < COV.rows; row += 3) {
      for (let col = 0; col < COV.cols; col += 4) {
        const x = col * COV.size + COV.size * 2;
        const y = row * COV.size + COV.size * 1.5;
        if (y >= HORIZON) left.push({ x, y });
      }
    }
    const step = totalMs / left.length;
    left.forEach((p, i) => this.time.delayedCall(step * i, () => this.maskRT.draw(this.brush, p.x, p.y)));
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
    // A lazy stroke hisses low; a fast one sings. The volume follows too.
    const v = Math.min(3, this.strokeSpeed);
    audio.play('sickle', {
      volume: 0.34 + v * 0.1,
      rate: Phaser.Math.Clamp(0.8 + v * 0.17, 0.8, 1.32) * Phaser.Math.FloatBetween(0.97, 1.03),
    });
  }

  /**
   * The wind rises when the blade stops. While the player is cutting, the rye
   * they are standing in is what moves least; give them a breath and the whole
   * field starts to lean — which is the moment they actually look at it.
   */
  private breeze(): void {
    const wind = this.wind;
    if (!wind) return;
    const now = this.time.now;
    const cutting = this.phase === 'cutting';
    const still = cutting && this.lastCutAt > 0 && now - this.lastCutAt > 1500;
    const want = still ? 2.3 : 1;
    const was = wind.boost;
    wind.boost = Phaser.Math.Linear(wind.boost, want, still ? 0.012 : 0.06);
    if (was < 1.5 && wind.boost >= 1.5 && now - this.lastGust > 8000) {
      this.lastGust = now;
      audio.play('gust', { volume: 0.36 });
    }
  }

  /**
   * Birds that were down in the rye, flushed by the blade. Not every swath has
   * them, and never twice in a second.
   */
  private scatter(x: number, y: number): void {
    const now = this.time.now;
    if (now - this.lastBirds < 1300 || Math.random() > 0.45) return;
    this.lastBirds = now;
    const key = makeBird(this);
    const n = Phaser.Math.Between(3, 5);
    const away = x < Layout.width / 2 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const b = this.add
        .image(x + Phaser.Math.Between(-40, 40), y - 10 + Phaser.Math.Between(-12, 12), key)
        .setTint(0x2c2b26)
        .setDepth(185)
        // Close to the viewer, so big: these are the birds at your feet.
        .setScale(1.9 + Math.random() * 0.8)
        .setFlipX(away < 0)
        .setAlpha(0.95);
      const base = b.scaleY;
      // Wings, beating.
      this.tweens.add({ targets: b, scaleY: base * 0.35, duration: 90 + i * 12, yoyo: true, repeat: -1 });
      this.tweens.add({
        targets: b,
        x: b.x + away * Phaser.Math.Between(150, 420),
        y: b.y - Phaser.Math.Between(320, 560),
        scaleX: b.scaleX * 0.45,
        alpha: 0,
        duration: Phaser.Math.Between(1400, 2100),
        delay: i * 70,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tweens.killTweensOf(b);
          b.destroy();
        },
      });
    }
  }

  /** What is left of the wind goes with the last of the crop. */
  private calmWind(to = 0): void {
    const wind = this.wind;
    if (!wind || wind.amp === to) return;
    this.tweens.addCounter({
      from: wind.amp,
      to,
      duration: 700,
      ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        wind.amp = tw.getValue() ?? 0;
      },
    });
  }

  /**
   * The player says the day is done — or the field is so nearly down that
   * there is nothing left worth chasing.
   */
  private finishCut(): void {
    if (this.phase !== 'cutting') return;
    this.phase = 'deciding';
    this.bagUi.putBack();
    this.prompt.hide(250);
    this.tally.setEnough(false);
    this.enoughSpot?.setEnabled(false);
    this.lastSample = null;

    if (judgeField(this.cover.left) === 'spare') {
      // Leaving a third standing is a choice, not a slip — but it should be
      // made knowingly, once.
      this.narration.ask(jumis.spareAsk, [
        {
          label: jumis.spareChoices.more,
          onPick: () => {
            this.narration.hide();
            this.phase = 'cutting';
            this.prompt.show(items.cutPrompt);
            this.tally.setEnough(true);
            this.enoughSpot?.setEnabled(true);
            this.enoughSpot?.zone.disableInteractive();
          },
        },
        { label: jumis.spareChoices.stop, onPick: () => this.resolve('spare') },
      ]);
      return;
    }

    this.calmWind(this.cover.left > 0.08 ? WIND_AMP * 0.25 : 0);
    this.spots.forEach((s) => s.id === 'stone' && s.setEnabled(false));
    this.time.delayedCall(900, () => {
      // Only if nothing has settled the field in the meantime.
      if (this.phase !== 'deciding') return;
      this.narration.say(jumis.standing, () => this.beginGesture());
    });
  }

  // --- the double ear -------------------------------------------------------

  private beginGesture(): void {
    this.narration.hide();
    this.phase = 'gesture';
    this.prompt.show(jumis.gesturePrompt);
    this.tweens.killTweensOf(this.earGlow);
    this.earGlow.setAlpha(0);
    this.tweens.add({ targets: this.earGlow, alpha: 0.3, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The keyboard's way in: Tab to the ear, Enter for the list. A pointer
    // press falls through to the gesture instead.
    this.earSpot = new Hotspot(this, {
      id: 'ear',
      x: EAR.x,
      y: EAR.y,
      w: EAR.rx * 2,
      h: EAR.ry * 2,
      label: jumis.after.earLabel,
      guard: () => !this.input.activePointer.isDown,
      onClick: () => this.listEar(),
    });
    this.spots.push(this.earSpot);
    this.listTimer = this.time.delayedCall(LIST_AFTER_MS, () => this.listEar());
  }

  private cancelList(): void {
    this.listTimer?.remove(false);
    this.listTimer = null;
  }

  /** The two hand-choices as a list — the fallback, not the first offer. */
  private listEar(): void {
    if (this.phase !== 'gesture') return;
    this.cancelList();
    this.narration.ask(jumis.question, [
      { label: jumis.choices.leave, onPick: () => this.resolve('leave') },
      { label: jumis.choices.take, onPick: () => this.resolve('take') },
    ]);
  }

  /** The ear follows the hand before anything is decided. */
  private previewGesture(dx: number, dy: number): void {
    const base = TRUE_STALK.h / this.stalk.height;
    this.tweens.killTweensOf(this.stalk);
    if (dy > 0 && dy >= Math.abs(dx) * 0.8) {
      const side = dx < -8 ? -1 : 1;
      this.stalk.setAngle(side * Math.min(72, dy * 0.6));
      this.stalk.setScale(base).setY(TRUE_STALK.base);
    } else if (dy < 0 && -dy >= Math.abs(dx) * 0.8) {
      const pull = Math.min(1, -dy / 160);
      this.stalk.setAngle(Math.sin(this.time.now / 30) * pull * 3);
      this.stalk.setScale(base, base * (1 + 0.14 * pull)).setY(TRUE_STALK.base - 18 * pull);
    } else {
      this.stalk.setAngle(Phaser.Math.Clamp(dx * 0.15, -12, 12));
      this.stalk.setScale(base).setY(TRUE_STALK.base);
    }
  }

  private springBack(): void {
    const base = TRUE_STALK.h / this.stalk.height;
    this.tweens.killTweensOf(this.stalk);
    this.tweens.add({
      targets: this.stalk,
      angle: 0,
      y: TRUE_STALK.base,
      scaleX: base,
      scaleY: base,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => this.swayStalk(),
    });
  }

  private commitGesture(dx: number, dy: number): void {
    if (this.phase !== 'gesture') return;
    const dist = Math.hypot(dx, dy);
    if (dist < GESTURE_MIN) {
      this.springBack();
      this.gestureTaps++;
      if (this.gestureTaps >= 2) this.listEar();
      else this.prompt.flash(jumis.gestureTap, 2800);
      return;
    }
    if (dy > 0 && dy >= Math.abs(dx) * 0.8) {
      this.resolve('leave');
      return;
    }
    if (dy < 0 && -dy >= Math.abs(dx) * 0.8) {
      this.resolve('take');
      return;
    }
    // Across. Only the blade does that, and only on purpose.
    this.springBack();
    if (this.bagUi.holding !== 'sickle') {
      this.prompt.flash(jumis.gestureNoBlade, 2400);
      return;
    }
    if (!this.titheWarned) {
      this.warnOffEar();
      return;
    }
    this.cutEar();
  }

  // --- the reckoning --------------------------------------------------------

  private resolve(pick: JumisPick): void {
    if (this.phase === 'resolved' || this.phase === 'after') return;
    this.phase = 'resolved';
    this.cancelList();
    this.narration.dismiss();
    this.prompt.hide(250);
    this.bagUi.putBack();
    this.earSpot?.setEnabled(false);
    this.enoughSpot?.setEnabled(false);
    this.tally.setEnough(false);
    this.tweens.killTweensOf(this.earGlow);
    this.tweens.add({ targets: this.earGlow, alpha: 0, duration: 400 });

    const earCut = pick === 'all';
    const sheaves = sheavesFrom(earCut ? 1 : this.cover.cut, earCut);
    this.tally.set(sheaves);
    const outcome = jumisOutcome(pick);

    // Commit now, before the prose plays: a player who closes the tab
    // mid-sentence comes back to a harvested field, not a half-finished one.
    state.patch({
      jumis: outcome,
      jumisPick: pick,
      sheaves,
      fieldMask: this.cover.encode(),
    });

    const base = TRUE_STALK.h / this.stalk.height;
    if (pick === 'leave') {
      lore.unlock('jumis');
      this.tweens.killTweensOf(this.stalk);
      this.tweens.add({ targets: this.stalk, angle: 78, alpha: 0, duration: 700, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: this.bound, alpha: 1, duration: 900, delay: 250, ease: 'Sine.easeInOut' });
      audio.play('sheaf', { volume: 0.5 });
      // Jumis noticing: a warm light on the bound ear, and a breath of wind
      // over the island while the rest of the field stands still.
      const glow = this.add
        .image(BOUND.x, BOUND.y - 50, 'fx-blob')
        .setDepth(7)
        .setTint(0xffd98a)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setScale(2.2)
        .setAlpha(0);
      this.tweens.add({ targets: glow, alpha: 0.55, duration: 900, delay: 700, yoyo: true, hold: 600, onComplete: () => glow.destroy() });
      const wind = this.wind;
      if (wind) {
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 2200,
          delay: 800,
          onUpdate: (tw) => {
            wind.amp = WIND_AMP * 0.9 * Math.sin(Math.PI * (tw.getValue() ?? 0));
          },
        });
      }
    } else if (pick === 'take') {
      lore.unlock('jumjaKersana');
      this.tweens.killTweensOf(this.stalk);
      this.tweens.add({
        targets: this.stalk,
        y: TRUE_STALK.base - 70,
        scaleY: base * 1.05,
        alpha: 0,
        duration: 620,
        ease: 'Quad.easeIn',
      });
      this.time.delayedCall(200, () => {
        this.clearTuft();
        this.addHole(0);
      });
      audio.play('splash', { volume: 0.25, rate: 1.6 });
      this.calmWind();
    }

    const lines = [...jumis.outcomes[pick], jumis.cart[pick]];
    this.time.delayedCall(pick === 'all' ? 0 : 700, () => {
      this.narration.say(lines, () => {
        this.narration.hide();
        this.tally.hide();
        const r = reckoning.jumis[pick];
        new Reckoning(this, {
          sign: 'jumis',
          good: outcome === 'good',
          verdict: r.verdict,
          gain: r.gain,
          missed: 'missed' in r ? r.missed : null,
          cost: 'cost' in r ? r.cost : null,
          onDone: () => goTo(this, 'Village'),
        });
      });
    });
  }

  /** Where the ear was pulled from: a little torn-up earth. */
  private addHole(alpha = 1): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setDepth(6).setAlpha(alpha);
    g.fillStyle(0x3a2c1e, 0.85).fillEllipse(TRUE_STALK.x, TRUE_STALK.base - 4, 58, 18);
    g.fillStyle(0x5a4630, 0.9).fillEllipse(TRUE_STALK.x - 18, TRUE_STALK.base - 9, 16, 7);
    g.fillStyle(0x5a4630, 0.9).fillEllipse(TRUE_STALK.x + 20, TRUE_STALK.base - 7, 12, 6);
    if (alpha === 0) this.tweens.add({ targets: g, alpha: 1, duration: 500 });
    return g;
  }

  /**
   * A remark on something the player tried. In the panel when it is free; at
   * the top of the frame when the panel is holding a decision.
   */
  private tell(line: Loc): void {
    if (this.narration.busy) this.prompt.flash(line);
    else this.narration.flash(line);
  }

  // --- the field, afterwards -----------------------------------------------

  /** The same field on a later visit, exactly as it was left. */
  private buildAfter(): void {
    const run = state.get();
    const pick = run.jumisPick;

    // Cut again the way it was cut: the sky as on the first stroke, then each
    // piece that came down, under a soft edge about a piece wide. Filling the
    // whole mask and putting the standing crop back instead left the far
    // stubble's haze hanging over the standing rye along the horizon.
    this.cover.decode(run.fieldMask);
    this.maskRT.clear();
    this.revealSky();
    if (this.cover.left <= 0) {
      this.maskRT.fill(0xffffff, 1);
    } else {
      // Along the top of the crop a swath reached up into the haze.
      const topBand = CROP_TOP + COV.size * 2;
      const piece = COV.size * 2.2;
      this.maskRT.beginDraw();
      for (let row = 0; row < COV.rows; row++) {
        for (let col = 0; col < COV.cols; col++) {
          const i = row * COV.cols + col;
          if (!this.cover.work[i] || !this.cover.isCut(col, row)) continue;
          const cy = row * COV.size + COV.size / 2;
          this.brush.setDisplaySize(piece, cy < topBand ? SWATH_H : piece);
          this.maskRT.batchDraw(this.brush, col * COV.size + COV.size / 2, cy);
        }
      }
      this.maskRT.endDraw();
      this.brush.setDisplaySize(SWATH_W, SWATH_H);
    }
    if (pick === 'take' || pick === 'all') this.clearTuft();
    if (pick === 'leave' || pick === 'spare') this.protectTuft(true);

    const left = this.cover.left;
    if (this.wind) this.wind.amp = WIND_AMP * Math.min(1, left * 1.6);

    this.stalk.setVisible(pick === 'spare');
    if (pick === 'spare') this.swayStalk();
    this.bound.setAlpha(pick === 'leave' ? 1 : 0);
    if (pick === 'take') this.addHole();
    this.groundBirds();

    const earLine = pick === 'leave' ? jumis.after.bound : pick === 'take' ? jumis.after.hole : pick === 'spare' ? jumis.after.spare : jumis.after.cut;
    const earLabel = pick === 'take' ? jumis.after.holeLabel : pick === 'spare' ? jumis.after.patchLabel : jumis.after.earLabel;
    if (pick !== 'all') {
      this.spots.push(
        new Hotspot(this, {
          id: 'ear',
          x: EAR.x,
          y: EAR.y + 30,
          w: 200,
          h: 220,
          label: earLabel,
          onClick: () => this.narration.flash(earLine),
        }),
      );
    } else {
      this.spots.push(
        new Hotspot(this, {
          id: 'stubble',
          x: EAR.x,
          y: EAR.y + 60,
          w: 260,
          h: 200,
          label: jumis.after.earLabel,
          onClick: () => this.narration.flash(earLine),
        }),
      );
    }
    this.spots.push(
      new Hotspot(this, {
        id: 'stone',
        x: HINT_STONE.x,
        y: HINT_STONE.y,
        w: HINT_STONE.w,
        h: HINT_STONE.h,
        label: jumis.hintStone.label,
        onClick: () => this.narration.flash(jumis.hintStone.text),
      }),
    );
    this.spots.push(
      new Hotspot(this, {
        id: 'exit',
        x: 110,
        y: 640,
        w: 200,
        h: 320,
        label: jumis.after.exit,
        onClick: () => {
          this.spots.forEach((s) => s.setEnabled(false));
          this.narration.hide();
          goTo(this, 'Village');
        },
      }),
    );

    this.time.delayedCall(Timing.fade + 300, () => {
      if (!this.narration.busy) this.narration.flash(jumis.after.arrive);
    });
  }

  /** A few crows walking the stubble, where the field is cut. */
  private groundBirds(): void {
    if (!flags.fx) return;
    makeGroundBird(this);
    const spots: Array<{ x: number; y: number }> = [];
    for (let tries = 0; tries < 200 && spots.length < 5; tries++) {
      const col = Phaser.Math.Between(2, COV.cols - 3);
      const row = Phaser.Math.Between(11, 21);
      const x = col * COV.size + COV.size / 2;
      const y = row * COV.size + COV.size / 2;
      if (!this.cover.work[row * COV.cols + col] || !this.cover.isCut(col, row)) continue;
      if (inEllipse(TUFT_MEASURE, x, y) || spots.some((s) => Math.abs(s.x - x) < 120)) continue;
      spots.push({ x, y });
    }
    for (const s of spots) {
      const scale = 0.55 + (s.y - 400) / 900;
      const bird = this.add
        .image(s.x, s.y, 'fx-groundbird')
        .setOrigin(0.5, 1)
        .setDepth(6)
        .setTint(0x26282a)
        .setScale(scale * (Math.random() < 0.5 ? -1 : 1), scale);
      const hop = () => {
        if (!bird.active) return;
        const dx = Phaser.Math.Between(-40, 40);
        bird.setScale(Math.abs(bird.scaleX) * (dx < 0 ? -1 : 1), bird.scaleY);
        this.tweens.add({
          targets: bird,
          x: Phaser.Math.Clamp(bird.x - dx, 40, Layout.width - 40),
          y: { value: bird.y - 8, yoyo: true, duration: 110 },
          duration: 220,
          ease: 'Quad.easeOut',
          onComplete: () => this.time.delayedCall(Phaser.Math.Between(900, 3200), hop),
        });
      };
      // Pecking in between.
      this.tweens.add({
        targets: bird,
        angle: { from: 0, to: 18 },
        duration: 160,
        yoyo: true,
        repeat: -1,
        repeatDelay: Phaser.Math.Between(700, 1800),
      });
      this.time.delayedCall(Phaser.Math.Between(300, 2000), hop);
    }
  }
}
