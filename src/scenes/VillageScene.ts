import { applyGrade } from '../fx/GradePipeline';
import Phaser from 'phaser';
import { type Loc } from '../core/i18n';
import { arrival, items, jumis as jumisText, village } from '../content/script';
import { elder } from '../content/elder';
import { BOND_MAX, state, type Shown } from '../core/state';
import { currentStep, objectiveFor, type StepId } from '../core/quest';
import { breadFrom, loafFrom } from '../core/rules';
import { holdings, snapshot, type HoldingsSource } from '../core/holdings';
import { lore } from '../core/lore';
import { Narration } from '../ui/Narration';
import { Hotspot, hotspotAt } from '../ui/Hotspot';
import { Chrome } from '../ui/Chrome';
import { Objective } from '../ui/Objective';
import { Holdings } from '../ui/Holdings';
import { SheafTally } from '../ui/SheafTally';
import { Atmosphere } from '../fx/Atmosphere';
import { Bag } from '../ui/Bag';
import { Painting } from '../ui/Painting';
import { Portrait } from '../ui/Portrait';
import { Layout, Palette } from '../core/theme';
import { bag, type ItemId } from '../core/inventory';
import { textureFor } from '../core/itemArt';
import { fadeIn, goTo } from './transition';
import { CHIMNEYS, SHEAF_SLOTS, addDaylight, addEvening, addSheaf, addUpgrades } from './villageArt';
import { audio } from '../core/audio';
import { makeBlob } from '../fx/textures';
import { Walker } from '../ui/Walker';
import { PATHS, START, clampToYard, route, type Pt } from './villageGround';
import { keysOf } from '../ui/keys';
import { defineAnims } from './assets';
import { beloved } from '../content/beloved';
import { BondRibbon } from '../ui/BondRibbon';

/**
 * The hub. Nothing happens here mechanically — its whole job is to be the
 * place the player keeps coming back to and see it change.
 *
 * What it shows, and where it comes from:
 *   the granary and the bridge     what the two encounters built
 *   the chimneys and the windows   how much bread there is for the winter
 *   the light                      evening, once the bog is behind you
 *   the doorstep                   whether the cat came home
 *
 * The coordinates below were read off the painting. If the background art is
 * ever regenerated, these are the numbers to re-measure (and the ones in
 * `villageArt.ts`).
 */
const POS = {
  stone: { x: 970, y: 530 },
  granary: { x: 452, y: 600 },
  // Covers both the log crossing and the taller stone bridge.
  bridge: { x: 1560, y: 660 },
  pathField: { x: 150, y: 424 },
  pathBog: { x: 1792, y: 428 },
} as const;

/** Where the lean-to's sickle hangs, and the cat's doorstep. */
const SHED = { x: 812, y: 912 };
const CAT = { x: 1222, y: 522 };
/** Drawn height of the sitting cat, in step with the cottages at that depth. */
const CAT_H = 52;

/** Half a minute of the player touching nothing, and Anna says the line again. */
const NUDGE_MS = 30000;

/** Annas māte, in the yard outside her own door. */
const ELDER = { x: 706, y: 582, h: 104 };

/** Ilze or Krišs, by the woodpile at the Kalēji cottage, nearer the stream. */
const BELOVED = { x: 1392, y: 566, h: 106 };

/**
 * The foot of the stone, where the first crumb is left: on the grass ring,
 * clear of the stone's own touch marker.
 */
const STONE_FOOT = { x: 1022, y: 603 };

/** How long after arriving the "what changed" line is said: once the building has settled. */
const ARRIVAL_LINE_MS = 2600;

/** Before the village has shown anything. */
const NOTHING_SHOWN: Shown = { jumis: 'none', jumisPick: 'none', jumisPaid: false, sheaves: 0, velns: 'none' };

/**
 * Where the player stands to deal with each thing, and which way they face.
 * The two paths are walked to their mouths, past the edge of the yard.
 */
const APPROACH: Record<string, Pt & { face?: 'left' | 'right' }> = {
  stone: { x: 890, y: 652, face: 'right' },
  granary: { x: 610, y: 640, face: 'left' },
  bridge: { x: 1420, y: 642, face: 'right' },
  anna: { x: 790, y: 612, face: 'left' },
  // On the yard side of the front house. At y 702 the feet landed on its
  // roof ridge, and the villager stood on the roof to fetch the sickle.
  shed: { x: 780, y: 650 },
  cat: { x: 1180, y: 588, face: 'right' },
  beloved: { x: 1312, y: 600, face: 'right' },
};

export class VillageScene extends Phaser.Scene {
  private narration!: Narration;
  private bagUi!: Bag;
  private spots: Hotspot[] = [];
  private painting!: Painting;
  private catSprite: Phaser.GameObjects.Image | null = null;
  private catSpot: Hotspot | null = null;
  private objective!: Objective;
  /** Anna's face, beside the panel while she is the one talking. */
  private portrait!: Portrait;
  private holdings!: Holdings;
  private chimneys: Array<{ setLevel: (level: 0 | 1 | 2 | 3) => void } | null> = [];
  /** What the player was last shown here, so the changes can land in front of them. */
  private lastSeen: Shown = NOTHING_SHOWN;
  /** Sheaves standing against the granary — the store, counted, in the painting. */
  private sheaves = 0;
  /**
   * The cart is being counted and threshed in Anna's yard. The panel folds
   * away while the loaves fly, so the narration no longer holds the clicks —
   * and a second tap on her used to start the whole cart over on top of itself.
   */
  private threshing = false;
  /** The player, on foot. */
  private walker: Walker | null = null;
  /** Ilze's or Krišs's face, beside the panel while they are talking. */
  private belovedFace!: Portrait;
  private ribbon!: BondRibbon;
  /** When the player last touched anything, for Anna's nudge. */
  private lastTouch = 0;
  /** The step she has already nudged about, so she says it once and stops. */
  private nudged: StepId | null = null;

  constructor() {
    super('Village');
  }

  create(data?: { seamless?: boolean }): void {
    audio.ambient('village');
    const seamless = data?.seamless === true;

    // Phaser reuses this instance on every visit, so every field starts over.
    this.spots = [];
    this.sheaves = 0;
    this.threshing = false;
    this.catSprite = null;
    this.catSpot = null;
    this.chimneys = [];
    this.nudged = null;
    // Where the player is coming from decides where they walk in.
    const cameFrom = state.get().scene;
    state.set('scene', 'Village');

    if (!seamless) fadeIn(this);
    makeBlob(this);
    this.painting = new Painting(this, 'bg-village');
    const painting = this.painting;
    const s = state.get();
    const news = this.readNews();
    // Home from the bog, a cat that was not given away belongs on its step.
    // The walk home plays that out in front of the player; on any later visit
    // — a reload in the middle of that walk, say — it is simply there, rather
    // than left in the bag for the rest of the year.
    if (s.velns !== 'none' && !news.bridge && bag.has('cat')) bag.remove('cat');
    const evening = s.velns !== 'none';
    // Before the harvest it is early: the mist lies heavier in the hollows.
    const morning = s.jumis === 'none';

    const air = new Atmosphere(this)
      .drift(painting.root, { scale: 1.03, duration: 40000 })
      .fog({ band: 0.12, height: 260, tint: evening ? 0x9aa3b0 : 0xe6ecef, alpha: 0.24, speed: 75000, layers: 2 })
      .fog({ band: 0.44, height: 330, tint: evening ? 0x8e97a2 : 0xdfe4e2, alpha: morning ? 0.27 : 0.16, speed: 95000, layers: 2 })
      .birds({ band: [0.06, 0.22], every: evening ? [12000, 24000] : [6000, 14000] })
      .motes({ tint: evening ? 0xc8c0b0 : 0xfff0cc, count: evening ? 18 : 40, driftX: 18, scale: 0.16, alpha: 0.6, band: [0.36, 0.92] })
      .breathe({ amount: 0.06, duration: 27000 });
    CHIMNEYS.forEach((c, i) => {
      this.chimneys.push(air.chimney(c.x, c.y, { scale: 0.58, rate: 620 + i * 140, tint: evening ? 0xa6aab0 : 0xcfd4d6 }));
    });

    // --- everything set into the painting, in drawing order
    addUpgrades(this, painting, s, { animate: true, seen: this.lastSeen });
    // The store as they left it. Anything earned while they were away arrives
    // in front of them, below.
    this.setSheaves(holdings(this.lastSeen).bread, false);
    this.addElder();
    this.addBeloved(evening);
    this.addCat();
    defineAnims(this);
    this.addWalker(cameFrom, seamless, evening);
    if (s.crumb) this.drawCrumb(false);
    if (evening) addEvening(this, painting, { lit: 1 + holdings().bread, arriving: news.bridge !== null });
    else addDaylight(this, painting, morning ? 'morning' : 'afternoon', { arriving: news.granary !== null });

    // Straight on from the intro, which was standing on this very painting:
    // the bare picture lies over everything set into it for a moment and
    // lifts, so Anna, the cat and the smoke come up out of it instead of
    // popping in.
    if (seamless) {
      const veil = this.add.image(Layout.width / 2, Layout.height / 2, 'bg-village').setDisplaySize(Layout.width, Layout.height);
      applyGrade(veil);
      veil.setDepth(850);
      this.tweens.add({ targets: veil, alpha: 0, delay: 120, duration: 700, ease: 'Sine.easeInOut', onComplete: () => veil.destroy() });
    }

    // --- the furniture
    this.narration = new Narration(this);
    this.portrait = new Portrait(this, this.narration, { key: 'portrait-anna', name: elder.label });
    this.belovedFace = new Portrait(this, this.narration, {
      key: state.get().gender === 'm' ? 'portrait-ilze' : 'portrait-kriss',
      name: beloved.name,
    });
    new Chrome(this, { log: () => this.narration.history });
    this.objective = new Objective(this);
    this.ribbon = new BondRibbon(
      this,
      () => this.objective.bottom,
      () => this.portrait.isShown || this.belovedFace.isShown,
    );
    // The map walks you somewhere exactly as the path there would.
    this.holdings = new Holdings(this, this.lastSeen, {
      travel: (id) => {
        const spot = this.spots.find((s) => s.id === (id === 'field' ? 'pathField' : id === 'bog' ? 'pathBog' : ''));
        if (!spot) return false;
        spot.activate();
        return true;
      },
    });
    this.setSmoke(this.lastSeen);

    // Registered before the bag's own handler, so it sees what was in hand at
    // the moment of the click rather than after the bag has put it back.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      if (holding || over.length) return;
      // Empty ground: walk there. The sky and the roofs are not ground.
      if (p.worldY > 470 && this.walker) {
        this.portrait.hide();
        this.walker.walkTo(route(this.walker.at, { x: p.worldX, y: p.worldY }));
      } else {
        this.narration.mutter(village.nothing);
      }
    });

    this.addSpots();

    this.bagUi = new Bag(this);
    this.bagUi.onUse = (id, x, y) => this.useItem(id, x, y);

    // Whatever changes while the player is here, changes in front of them.
    const offShown = state.onChange(() => this.rememberShown());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offShown);

    // A player who has stopped gets the line said out loud, once.
    this.lastTouch = this.time.now;
    const touched = () => {
      this.lastTouch = this.time.now;
    };
    this.input.on('pointerdown', touched);
    this.input.on('pointermove', touched);
    this.input.keyboard?.on('keydown', touched);
    this.events.on(Phaser.Scenes.Events.UPDATE, this.nudge, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, this.nudge, this));

    // Coming back from an encounter, the first thing said is what changed —
    // timed to land once the building has finished arriving.
    if (news.granary || news.bridge) {
      this.time.delayedCall(ARRIVAL_LINE_MS, () => {
        this.holdings.refresh(true);
        this.setSheaves(holdings().bread, true);
        if (this.narration.busy) return;
        if (news.granary) {
          this.narration.say([news.granary]);
          return;
        }
        this.narration.say([news.bridge!], () => this.bogHomecoming());
      });
    }
  }

  // --- what changed ------------------------------------------------------------

  /**
   * Compares the run against what the player was last shown here, so each
   * change is announced once, on the trip home from the encounter that made it.
   */
  private readNews(): { granary: Loc | null; bridge: Loc | null } {
    const s = state.get();
    // Kept with the run, not in the session: a reload must neither replay the
    // field's news nor lose the bog's.
    this.lastSeen = s.shown ?? NOTHING_SHOWN;
    this.rememberShown();

    if (s.jumis !== 'none' && this.lastSeen.jumis !== s.jumis) {
      const line =
        s.jumisPick === 'take'
          ? arrival.granaryTake
          : s.jumisPick === 'spare'
            ? arrival.granarySpare
            : s.jumis === 'good'
              ? arrival.granaryGood
              : arrival.granaryPoor;
      return { granary: line, bridge: null };
    }
    if (s.velns !== 'none' && this.lastSeen.velns !== s.velns) {
      return { granary: null, bridge: s.velns === 'good' ? arrival.bridgeGood : arrival.bridgePoor };
    }
    return { granary: null, bridge: null };
  }

  /** Everything on screen now counts as seen. */
  private rememberShown(): void {
    const s = state.get();
    state.markShown({ jumis: s.jumis, ...snapshot(s) });
  }

  /** Home from the bog: the cat back to its step and the lights. */
  private bogHomecoming(): void {
    const lines: Loc[] = [];
    if (bag.has('cat')) {
      lines.push(arrival.catHome);
      this.sendCatHome();
    }
    if (holdings().bread > 0) lines.push(arrival.evening);
    if (lines.length) this.narration.say(lines);
  }

  // --- the painting --------------------------------------------------------------

  /** Annas māte: the standing figure and everything she has to say. */
  private addElder(): void {
    // A soft patch of shade where she meets the ground.
    const shade = this.add.graphics();
    shade.fillStyle(Palette.ink, 0.28);
    shade.fillEllipse(ELDER.x, ELDER.y - 2, ELDER.h * 0.36, ELDER.h * 0.1);
    this.painting.add(shade);

    const anna = this.painting.add(this.add.image(ELDER.x, ELDER.y, 'elder').setOrigin(0.5, 1));
    anna.setScale(ELDER.h / anna.height);
    anna.setTint(0xdad9d2);
    this.tweens.add({ targets: anna, scaleY: anna.scaleY * 1.008, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: anna, angle: { from: -0.5, to: 0.5 }, duration: 7300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /**
   * The cat on its doorstep — unless it is in the bag, or went with the Devil.
   * Home from the bog, it is asleep.
   */
  private addCat(): void {
    const s = state.get();
    if (bag.has('cat') || s.catLost) return;
    const asleep = s.velns !== 'none';
    const cat = this.painting.add(this.add.image(CAT.x, CAT.y, 'item-cat').setOrigin(0.5, 1));
    const k = CAT_H / cat.height;
    cat.setScale(k, asleep ? k * 0.86 : k).setTint(asleep ? 0xb8bac0 : 0xd6d2c8);
    // Awake it sways; asleep it only breathes. (A tween given `angle:
    // undefined` does not skip the property — it throws.)
    const motion = asleep ? { scaleY: k * 0.83 } : { angle: { from: -1.2, to: 1.2 }, scaleY: k };
    this.tweens.add({
      targets: cat,
      ...motion,
      duration: asleep ? 2600 : 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.catSprite = cat;
  }

  /** Back from the bog with the cat: out of the bag and onto its step. */
  private sendCatHome(): void {
    this.bagUi.setAway('cat', true);
    audio.play('cat', { volume: 0.4 });
    this.bagUi.flyOut('item-cat', CAT.x, CAT.y - CAT_H / 2, {
      size: 70,
      onLanded: () => {
        bag.remove('cat');
        this.bagUi.setAway('cat', false);
        this.addCat();
        this.catSpot?.setLabel(village.doorstep.label);
      },
    });
  }

  /** The first crumb, at the foot of the stone. */
  private drawCrumb(animate: boolean): void {
    const g = this.add.graphics();
    g.fillStyle(0x8a6a42, 1).fillEllipse(STONE_FOOT.x, STONE_FOOT.y, 15, 8);
    g.fillStyle(0xb99466, 1).fillEllipse(STONE_FOOT.x - 2, STONE_FOOT.y - 1, 8, 4);
    this.painting.add(g);
    if (!animate) return;
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 300 });
    const glow = this.painting.add(
      this.add
        .image(STONE_FOOT.x, STONE_FOOT.y - 30, 'fx-blob')
        .setTint(0xffe0a0)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setScale(1.2, 1.8)
        .setAlpha(0),
    );
    this.tweens.add({
      targets: glow,
      alpha: 0.6,
      duration: 700,
      yoyo: true,
      hold: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => glow.destroy(),
    });
  }

  /**
   * Stands sheaves against the granary until there are as many as there are
   * loaves in the store. It only ever adds: a store does not empty inside one
   * year, and a sheaf vanishing between two visits would read as a bug.
   */
  private setSheaves(want: number, animate: boolean): void {
    const target = Math.min(SHEAF_SLOTS, want);
    while (this.sheaves < target) {
      addSheaf(this, this.painting, this.sheaves, animate);
      this.sheaves++;
    }
  }

  /** The chimneys follow the granary. */
  private setSmoke(src: HoldingsSource = state.get()): void {
    const bread = holdings(src).bread;
    const levels: Array<[0 | 1 | 2 | 3, 0 | 1 | 2 | 3]> = [
      [1, 0],
      [2, 1],
      [2, 2],
      [3, 3],
    ];
    const [a, b] = levels[Math.min(3, bread)];
    this.chimneys[0]?.setLevel(a);
    this.chimneys[1]?.setLevel(b);
  }

  // --- the hotspots ----------------------------------------------------------

  private addSpots(): void {
    const s = state.get();

    // --- the stone: flavour, the crumb, and the way out once both are done
    this.spot({
      id: 'stone',
      x: POS.stone.x,
      y: POS.stone.y,
      w: 150,
      h: 220,
      label: village.stone.label,
      markAt: { x: POS.stone.x, y: 618 },
      onClick: () => {
        const run = state.get();
        const lines = [...village.stone.lines];
        if (run.crumb) lines.push(village.stone.crumbThere);
        if (currentStep() === 'done') {
          this.narration.say(lines, () => this.leaveTo('Outro'));
        } else {
          this.narration.say(lines);
        }
      },
    });

    // --- the granary slot
    this.spot({
      id: 'granary',
      x: POS.granary.x,
      y: POS.granary.y,
      w: 340,
      h: 190,
      label: village.granarySlot.label,
      onClick: () => {
        const run = state.get();
        this.narration.flash(
          run.jumisPick === 'take'
            ? village.granarySlot.take
            : run.jumis === 'good'
              ? village.granarySlot.good
              : run.jumis === 'poor'
                ? village.granarySlot.poor
                : village.granarySlot.empty,
        );
      },
    });

    // --- the bridge slot
    this.spot({
      id: 'bridge',
      x: POS.bridge.x,
      y: POS.bridge.y,
      w: 320,
      h: 210,
      label: village.bridgeSlot.label,
      onClick: () => {
        const run = state.get();
        this.narration.flash(
          run.velns === 'good'
            ? village.bridgeSlot.good
            : run.velns === 'poor'
              ? village.bridgeSlot.poor
              : village.bridgeSlot.empty,
        );
      },
    });

    // --- left exit: the field, and after the harvest, the field as it was left
    this.spot({
      id: 'pathField',
      x: POS.pathField.x,
      y: POS.pathField.y,
      w: 220,
      h: 260,
      label: village.pathField.label,
      onClick: () => {
        const run = state.get();
        if (run.jumis !== 'none') {
          this.narration.say([village.pathField.done], () => this.leaveTo('Jumis', { after: true }));
          return;
        }
        if (!run.metElder) {
          this.narration.flash(elder.notAsked);
          return;
        }
        if (!bag.has('sickle')) {
          this.narration.flash(items.needSickle);
          return;
        }
        this.narration.say([village.pathField.ready], () => this.leaveTo('Jumis'));
      },
    });

    // --- right exit: the bog
    this.spot({
      id: 'pathBog',
      x: POS.pathBog.x,
      y: POS.pathBog.y,
      w: 220,
      h: 260,
      label: village.pathBog.label,
      onClick: () => {
        const run = state.get();
        if (run.velns !== 'none') {
          this.narration.flash(run.devilGone ? village.pathBog.gone : village.pathBog.done);
          return;
        }
        if (!state.bogOpen) {
          this.narration.flash(village.pathBog.locked);
          return;
        }
        if (!bag.has('bread')) {
          this.narration.flash(items.needOffering);
          return;
        }
        this.narration.say([village.pathBog.ready], () => this.leaveTo('Velns'));
      },
    });

    // --- Anna, who is the reason any of the rest of this happens
    this.spot({
      id: 'anna',
      x: ELDER.x,
      y: ELDER.y - ELDER.h / 2,
      w: 150,
      h: Math.max(ELDER.h + 30, 170),
      label: elder.label,
      markAt: { x: ELDER.x, y: ELDER.y + 6 },
      onClick: () => this.talkTo(),
    });

    // --- Ilze or Krišs
    this.spot({
      id: 'beloved',
      x: BELOVED.x,
      y: BELOVED.y - BELOVED.h / 2,
      w: 120,
      h: Math.max(BELOVED.h + 30, 170),
      label: beloved.name,
      markAt: { x: BELOVED.x, y: BELOVED.y + 6 },
      onClick: () => this.talkToBeloved(),
    });

    // --- the lean-to where the sickle hangs
    this.spot({
      id: 'shed',
      x: SHED.x,
      y: SHED.y,
      w: 210,
      h: 190,
      label: items.shed.label,
      onClick: () => {
        if (bag.has('sickle')) {
          this.narration.flash(items.shed.taken);
          return;
        }
        if (state.get().jumis !== 'none') {
          // The harvest is in; the sickle is hanging where it belongs.
          this.narration.flash(items.shed.withSickle);
          return;
        }
        this.narration.say([items.shed.withSickle, items.shed.tookIt], () => {
          this.bagUi.fly('item-sickle', SHED.x, SHED.y);
          bag.add('sickle');
          this.objective.refresh();
        });
      },
    });

    // --- the cat, and later its doorstep
    const catGone = s.catLost;
    this.catSpot = this.spot({
      id: 'cat',
      x: CAT.x,
      y: CAT.y - CAT_H / 2,
      w: 120,
      h: 110,
      label: catGone || s.velns !== 'none' ? village.doorstep.label : items.cat.label,
      onClick: () => this.touchCat(),
    });
  }

  private touchCat(): void {
    const run = state.get();
    if (run.catLost) {
      this.narration.flash(village.doorstep.empty);
      return;
    }
    if (bag.has('cat')) {
      this.narration.flash(items.cat.already);
      return;
    }
    if (run.velns !== 'none') {
      // Home from the bog. It has earned its sleep.
      this.narration.flash(village.doorstep.asleep);
      return;
    }
    this.narration.say([items.cat.there, items.cat.tookIt], () => {
      audio.play('cat');
      this.catSprite?.destroy();
      this.catSprite = null;
      this.bagUi.fly('item-cat', CAT.x, CAT.y - CAT_H / 2);
      bag.add('cat');
    });
  }

  private spot(o: ConstructorParameters<typeof Hotspot>[1]): Hotspot {
    // Anna's face comes up when she is spoken to, and goes when anything else is.
    const click = o.onClick;
    const id = o.id;
    const act = () => {
      this.faces(id);
      click();
    };
    const guard = o.guard;
    o = {
      ...o,
      // With something in hand, a tap on a person or a place is the item being
      // used on them, not a tap on them. Without this both ran: the reply to
      // the item covered whatever the tap had started, and a one-time talk
      // (Ilze's after the bog) was marked as had and never seen.
      guard: () => !this.bagUi.holding && (guard ? guard() : true),
      // The player walks over first, and the thing happens on arrival. Nothing
      // waits on them: a click elsewhere on the way simply changes their mind.
      onClick: () => {
        const way = id ? this.wayTo(id) : null;
        if (!way || !this.walker) {
          act();
          return;
        }
        this.portrait.hide();
        this.walker.walkTo(way.route, { face: way.face, onArrive: act });
      },
    };
    const h = new Hotspot(this, o);
    this.spots.push(h);
    return h;
  }

  // --- things from the bag, used on things ---------------------------------------

  /**
   * An item used on the village. Every pairing a player is likely to try gets
   * its own answer — the genre lives on these — and one of them is a secret:
   * the first crumb of the loaf, left at the stone.
   */
  private useItem(id: ItemId, x: number, y: number): boolean {
    const target = hotspotAt(this, x, y)?.id ?? null;
    this.faces(target);
    const r = village.replies;
    const run = state.get();
    let line: Loc = items.cutWrongTool;
    switch (target) {
      case 'beloved':
        if (id === 'bread') {
          this.giveBread();
          return false;
        }
        line = id === 'sickle' ? beloved.replies.sickle : id === 'cat' ? beloved.replies.cat : beloved.replies.hat;
        break;
      case 'anna':
        line =
          id === 'sickle' ? r.sickleOnAnna : id === 'cat' ? r.catOnAnna : id === 'hat' ? r.hatOnAnna : r.breadOnAnna;
        break;
      case 'cat':
        if (run.catLost) break;
        if (id === 'bread') line = r.breadOnCat;
        else if (id === 'sickle') line = r.sickleOnCat;
        else if (id === 'hat') line = r.hatOnCat;
        break;
      case 'stone':
        if (id === 'bread') {
          if (run.crumb) {
            line = village.crumb.already;
          } else {
            this.giveCrumb();
            return false;
          }
        } else if (id === 'sickle') {
          line = r.sickleOnStone;
        } else if (id === 'hat') {
          line = r.hatOnStone;
        } else if (id === 'cat') {
          this.bagUi.putBack();
          this.catAroundStone();
          this.narration.flash(r.catOnStone);
          return true;
        }
        break;
      case 'granary':
        line = run.jumis === 'none' ? r.onFoundation : id === 'hat' ? r.hatOnGranary : r.onGranary;
        break;
      case 'bridge':
        line = r.onStream;
        break;
      case 'pathField':
      case 'pathBog':
        line = r.onPath;
        break;
    }
    this.narration.flash(line);
    return false;
  }

  /** The first crumb of the first loaf, which everyone gives without thinking. */
  private giveCrumb(): void {
    state.set('crumb', true);
    this.narration.say(village.crumb.give);
    const loaf = textureFor('bread');
    this.bagUi.flyOut(loaf, STONE_FOOT.x, STONE_FOOT.y - 10, {
      size: 26,
      onLanded: () => {
        this.drawCrumb(true);
        lore.unlock('pirmaisKumoss');
        audio.play('chime', { volume: 0.25 });
      },
    });
  }

  /** The cat, let down at the stone, has a look round it and comes back. */
  private catAroundStone(): void {
    this.bagUi.setAway('cat', true);
    this.bagUi.flyOut('item-cat', POS.stone.x - 60, POS.stone.y + 70, {
      size: 44,
      onLanded: () => {
        const c = this.add
          .image(POS.stone.x - 60, POS.stone.y + 70, 'item-cat')
          .setOrigin(0.5, 1)
          .setTint(0xd6d2c8)
          .setDepth(8);
        c.setScale(46 / c.height);
        this.tweens.add({
          targets: c,
          x: POS.stone.x + 60,
          duration: 900,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onYoyo: () => c.setFlipX(true),
          onComplete: () => {
            c.destroy();
            this.bagUi.fly('item-cat', POS.stone.x - 60, POS.stone.y + 50);
            this.time.delayedCall(420, () => this.bagUi.setAway('cat', false));
          },
        });
      },
    });
  }

  /**
   * Half a minute of nothing, and Anna says the line again herself.
   *
   * The corner has said what to do since the first playtest, and it is still
   * easy to stop reading a corner. A face and a voice are not: she is the one
   * who sent you, and being nagged by her is in character. Once per errand —
   * she is bossy, not a klaxon — and never over a conversation, because
   * `flash` would replace whatever that conversation was going to do next.
   */
  private nudge(): void {
    if (this.time.now - this.lastTouch < NUDGE_MS) return;
    const step = currentStep();
    if (this.nudged === step) return;
    // Reading a card or talking to someone is not standing still. The clock
    // starts again from the end of it, so she never lands the moment it ends.
    const keys = keysOf(this);
    if (this.threshing || !this.narration.idle || keys.modal || keys.cards > 0) {
      this.lastTouch = this.time.now;
      return;
    }
    this.nudged = step;
    this.faces('anna');
    this.narration.flash(objectiveFor(step));
  }

  // --- Anna ------------------------------------------------------------------

  /** What Anna says, which depends entirely on where the run has got to. */
  private talkTo(): void {
    // She is busy with the cart; she will speak when the grain is in.
    if (this.threshing) return;
    switch (currentStep()) {
      case 'meetElder':
        return this.giveFieldErrand();
      case 'takeSickle':
        return this.narration.flash(elder.remind.takeSickle);
      case 'harvest':
        return this.narration.flash(elder.remind.harvest);
      case 'returnHarvest':
        return this.takeHarvestBack();
      case 'crossBog':
        return this.narration.flash(elder.remind.crossBog);
      case 'returnBog':
        return this.takeBogBack();
      case 'done':
        return this.narration.flash(elder.remind.done);
    }
  }

  /** The first errand, accepted out loud rather than assumed. */
  private giveFieldErrand(): void {
    const accept = () => {
      this.narration.say([elder.accepted], () => {
        state.set('metElder', true);
        this.objective.refresh();
      });
    };
    this.narration.say(elder.greet, () => {
      this.narration.ask(elder.ask, [
        { label: elder.choices.accept, onPick: accept },
        { label: elder.choices.why, onPick: () => this.narration.say([elder.why], accept) },
      ]);
    });
  }

  /**
   * The cart in Anna's yard. The sheaves are counted in front of the player,
   * then threshed — and only what the year was worth reaches the granary. The
   * greedy cart is the biggest and comes to the least; the tithed one is a
   * sheaf short and fills the row.
   */
  private takeHarvestBack(): void {
    const run = state.get();
    const pick = run.jumisPick === 'none' ? 'leave' : run.jumisPick;
    const bread = breadFrom(pick, run.sheaves);
    const loaf = loafFrom(pick);
    const cart = new SheafTally(this, { title: jumisText.sheaves, y: 250 });
    this.threshing = true;

    this.narration.say([elder.harvestBack.cart], () => {
      cart.show(250);
      cart.set(run.sheaves);
      this.time.delayedCall(700 + run.sheaves * 90, () => {
        this.portrait.show();
        this.narration.say(elder.harvestBack[pick], () => {
          this.narration.hide();
          this.holdings.pulse();
          cart.thresh(
            this.holdings.breadSlot,
            bread,
            () => {
              this.holdings.addLoaf();
              this.setSheaves(this.sheaves + 1, true);
            },
            () => {
              this.threshing = false;
              state.set('jumisPaid', true);
              // Deliberately not `refresh` here: that would quietly take note
              // of the bog road opening, and the road opening is the point of
              // Anna's next sentence. The gauge is already up to date — every
              // loaf was counted into it as the cart was threshed.
              this.setSmoke();
              cart.hide();
              this.handOverLoaf(loaf);
            },
          );
        });
      });
    });
  }

  private handOverLoaf(loaf: 'jumis' | 'good' | 'thin'): void {
    // The threshing folded the panel away; she is talking again.
    this.portrait.show();
    const line = elder.harvestBack.bread[loaf];
    this.narration.say([line], () => {
      this.bagUi.fly(textureFor('bread'), ELDER.x, ELDER.y - ELDER.h * 0.55);
      bag.add('bread');
      lore.unlock('maize');
      this.objective.refresh();
      // Straight on into the second errand: she has the player's attention.
      this.narration.say(elder.bog, () => {
        this.narration.ask(elder.bogAsk, [
          {
            label: elder.choices.accept,
            onPick: () => {
              this.narration.flash(elder.farewell);
              // She has just told them where to go; the map says the way is open.
              this.holdings.refresh(true);
            },
          },
        ]);
      });
    });
  }

  private takeBogBack(): void {
    const run = state.get();
    const lines = [...(run.velns === 'good' ? elder.bogBack.good : elder.bogBack.poor)];
    if (run.devilGone) lines.push(elder.bogBack.devilGone);
    if (run.velnsPick === 'dawn') lines.push(elder.bogBack.dawn);
    if (run.catLost) lines.push(elder.bogBack.catLost);
    if (bag.has('hat')) lines.push(elder.bogBack.hat);
    if (run.crumb) lines.push(elder.bogBack.crumb);
    lines.push(elder.toStone);
    this.narration.say(lines, () => {
      state.set('velnsPaid', true);
      this.objective.refresh();
    });
  }

  /** Every exit goes through here, so nothing else can be clicked on the way out. */
  private leaveTo(key: string, data?: object): void {
    this.spots.forEach((s) => s.setEnabled(false));
    this.narration.hide();
    // Out of the yard and on down the path, while the ink comes in.
    const away = key === 'Jumis' ? PATHS.field.away : key === 'Velns' ? PATHS.bog.away : null;
    if (away && this.walker) {
      this.walker.walkTo([...away]);
      this.time.delayedCall(500, () => goTo(this, key, data));
      return;
    }
    goTo(this, key, data);
  }

  // --- Ilze or Krišs ---------------------------------------------------------

  /** Whose face is beside the panel: the one spoken to, or nobody. */
  private faces(id: string | null | undefined): void {
    if (id === 'anna') this.portrait.show();
    else this.portrait.hide();
    if (id === 'beloved') this.belovedFace.show();
    else this.belovedFace.hide();
  }

  /** The figure, by the woodpile. In the evening, sitting it out in the dusk. */
  private addBeloved(evening: boolean): void {
    const key = state.get().gender === 'm' ? 'ilze' : 'kriss';
    if (!this.textures.exists(key)) return;
    const shade = this.add.graphics();
    shade.fillStyle(Palette.ink, 0.28);
    shade.fillEllipse(BELOVED.x, BELOVED.y - 2, BELOVED.h * 0.36, BELOVED.h * 0.1);
    this.painting.add(shade);
    const fig = this.painting.add(this.add.image(BELOVED.x, BELOVED.y, key).setOrigin(0.5, 1));
    fig.setScale(BELOVED.h / fig.height);
    fig.setTint(evening ? 0xb4b6bc : 0xdad9d2);
    this.tweens.add({ targets: fig, scaleY: fig.scaleY * 1.008, duration: 3100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: fig, angle: { from: -0.6, to: 0.6 }, duration: 6900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Moves the bond by `d`, within its five knots, and shows it. */
  private bond(d: number): void {
    if (!d) return;
    const now = Math.max(0, Math.min(BOND_MAX, state.get().bond + d));
    state.set('bond', now);
    this.ribbon.refresh(true);
    if (d > 0) audio.play('chime', { volume: 0.18, rate: 1.25 });
  }

  private had(talk: string): boolean {
    return state.get().talks.includes(talk);
  }

  private mark(talk: string): void {
    if (!this.had(talk)) state.set('talks', [...state.get().talks, talk]);
  }

  /** What they say, which depends on how far the year has got. */
  private talkToBeloved(): void {
    const run = state.get();
    if (!this.had('meet')) return this.meetBeloved();
    if (run.jumis !== 'none' && run.velns === 'none' && !this.had('harvest')) return this.harvestTalk();
    if (run.velns !== 'none' && !this.had('evening')) return this.eveningTalk();
    const idle = beloved.idle;
    this.narration.flash(
      run.jumis === 'none' ? (run.bond > 0 ? idle.beforeField : idle.beforeFieldCold) : run.velns === 'none' ? idle.beforeBog : idle.after,
    );
  }

  private meetBeloved(): void {
    const m = beloved.meet;
    const pick = (line: Loc, d: number) => () =>
      this.narration.say([line], () => {
        this.mark('meet');
        this.ribbon.refresh(false);
        this.bond(d);
      });
    this.narration.say([beloved.look, ...m.lines], () => {
      this.narration.ask(m.ask, [
        { label: m.choices.help, onPick: pick(m.help, 2) },
        { label: m.choices.bold, onPick: pick(m.bold, 1) },
        { label: m.choices.curt, onPick: pick(m.curt, 0) },
      ]);
    });
  }

  /**
   * After the field. How it was reaped matters to them; and whoever finds a
   * double ear, the old people say, will soon be married (Šmits 11991).
   */
  private harvestTalk(): void {
    const h = beloved.harvest;
    const pick = state.get().jumisPick === 'none' ? 'leave' : state.get().jumisPick;
    const said = pick === 'leave' ? h.leave : pick === 'take' ? h.take : pick === 'all' ? h.all : h.spare;
    const d = pick === 'leave' ? 1 : pick === 'all' ? -1 : 0;
    this.mark('harvest');
    this.narration.say([said], () => {
      this.bond(d);
      this.narration.say([h.omen], () => {
        this.narration.ask(h.ask, [
          { label: h.choices.warm, onPick: () => this.narration.say([h.warm], () => this.bond(1)) },
          { label: h.choices.shy, onPick: () => this.narration.say([h.shy], () => this.bond(1)) },
          { label: h.choices.flat, onPick: () => this.narration.say([h.flat]) },
        ]);
      });
    });
  }

  /** Home from the bog. What happened out there has reached them already. */
  private eveningTalk(): void {
    const e = beloved.evening;
    const run = state.get();
    const lines: Loc[] = [e.open];
    let d = 0;
    if (run.devilGone) {
      lines.push(e.devilGone);
      d += 1;
    }
    if (run.catLost) {
      lines.push(e.catLost);
      d -= 1;
    }
    if (bag.has('hat')) lines.push(e.hat);
    if (run.velnsPick === 'dawn') lines.push(e.dawn);
    if (lines.length === 1) lines.push(e.plain);
    this.mark('evening');
    this.narration.say(lines, () => {
      this.bond(d);
      if (state.get().bond < 3) {
        this.narration.say([e.goodnight]);
        return;
      }
      {
        this.narration.ask(e.invite, [
          {
            label: e.inviteChoices.yes,
            onPick: () =>
              this.narration.say([e.yes], () => {
                this.mark('invited');
                this.bond(1);
              }),
          },
          { label: e.inviteChoices.maybe, onPick: () => this.narration.say([e.maybe]) },
        ]);
      }
    });
  }

  /** The loaf, offered. A piece is kept and the loaf comes back: it is wanted on the bog. */
  private giveBread(): void {
    if (!this.had('meet')) {
      this.bagUi.putBack();
      this.meetBeloved();
      return;
    }
    if (this.had('gift')) {
      this.narration.flash(beloved.gift.again);
      return;
    }
    const loaf = loafFrom(state.get().jumisPick === 'none' ? 'leave' : state.get().jumisPick);
    this.mark('gift');
    this.narration.say([beloved.gift[loaf]], () => this.bond(1));
  }

  // --- on foot ---------------------------------------------------------------

  update(_time: number, delta: number): void {
    this.walker?.update(Math.min(delta, 50));
  }

  /**
   * The player, in from wherever they came: up the field path, up the bog
   * path, or standing in the yard at the start of the year.
   */
  private addWalker(cameFrom: string, seamless: boolean, evening: boolean): void {
    if (!this.textures.exists(`walk-${state.get().gender}`)) return;
    const g = state.get().gender;
    const from = cameFrom === 'Jumis' ? PATHS.field : cameFrom === 'Velns' ? PATHS.bog : null;
    if (!from || seamless) {
      this.walker = new Walker(this, this.painting, g, START, { evening, facing: 'right' });
      return;
    }
    const w = new Walker(this, this.painting, g, from.away[0], { evening });
    this.walker = w;
    const inside = clampToYard({ x: from.mouth.x + (from === PATHS.field ? 140 : -140), y: 618 });
    w.walkTo([from.mouth, inside]);
  }

  /** The way to a hotspot, or null if it is dealt with from where you stand. */
  private wayTo(id: string): { route: Pt[]; face?: 'left' | 'right' } | null {
    if (!this.walker) return null;
    const here = this.walker.at;
    if (id === 'pathField' || id === 'pathBog') {
      const mouth = id === 'pathField' ? PATHS.field.mouth : PATHS.bog.mouth;
      if (Math.hypot(mouth.x - here.x, mouth.y - here.y) < 24) return null;
      return { route: [...route(here, mouth), { ...mouth }] };
    }
    const a = APPROACH[id];
    if (!a) return null;
    if (Math.hypot(a.x - here.x, a.y - here.y) < 24) {
      if (a.face) this.walker.faceTowards(a.face === 'left' ? here.x - 1 : here.x + 1);
      return null;
    }
    return { route: route(here, a), face: a.face };
  }
}
