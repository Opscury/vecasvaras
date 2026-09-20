import Phaser from 'phaser';
import { type Loc } from '../core/i18n';
import { arrival, items, jumis as jumisText, village } from '../content/script';
import { elder } from '../content/elder';
import { state, type Shown } from '../core/state';
import { currentStep } from '../core/quest';
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
import { Palette } from '../core/theme';
import { bag, type ItemId } from '../core/inventory';
import { textureFor } from '../core/itemArt';
import { fadeIn, goTo } from './transition';
import { CHIMNEYS, addEvening, addUpgrades } from './villageArt';
import { audio } from '../core/audio';
import { makeBlob } from '../fx/textures';

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

/** Vecā Anna, in the yard outside her own door. */
const ELDER = { x: 706, y: 582, h: 104 };

/**
 * The foot of the stone, where the first crumb is left: on the grass ring,
 * clear of the stone's own touch marker.
 */
const STONE_FOOT = { x: 1022, y: 603 };

/** How long after arriving the "what changed" line is said: once the building has settled. */
const ARRIVAL_LINE_MS = 2600;

/** Before the village has shown anything. */
const NOTHING_SHOWN: Shown = { jumis: 'none', jumisPick: 'none', jumisPaid: false, sheaves: 0, velns: 'none' };

export class VillageScene extends Phaser.Scene {
  private narration!: Narration;
  private bagUi!: Bag;
  private spots: Hotspot[] = [];
  private painting!: Painting;
  private catSprite: Phaser.GameObjects.Image | null = null;
  private catSpot: Hotspot | null = null;
  private objective!: Objective;
  private holdings!: Holdings;
  private chimneys: Array<{ setLevel: (level: 0 | 1 | 2 | 3) => void } | null> = [];
  /** What the player was last shown here, so the changes can land in front of them. */
  private lastSeen: Shown = NOTHING_SHOWN;

  constructor() {
    super('Village');
  }

  create(): void {
    audio.ambient('village');

    // Phaser reuses this instance on every visit, so every field starts over.
    this.spots = [];
    this.catSprite = null;
    this.catSpot = null;
    this.chimneys = [];
    state.set('scene', 'Village');

    fadeIn(this);
    makeBlob(this);
    this.painting = new Painting(this, 'bg-village');
    const painting = this.painting;
    const s = state.get();
    const news = this.readNews();
    const evening = s.velns !== 'none';

    const air = new Atmosphere(this)
      .drift(painting.root, { scale: 1.03, duration: 40000 })
      .fog({ band: 0.12, height: 260, tint: evening ? 0x9aa3b0 : 0xe6ecef, alpha: 0.24, speed: 75000, layers: 2 })
      .fog({ band: 0.44, height: 330, tint: evening ? 0x8e97a2 : 0xdfe4e2, alpha: 0.16, speed: 95000, layers: 2 })
      .birds({ band: [0.06, 0.22], every: evening ? [12000, 24000] : [6000, 14000] })
      .motes({ tint: evening ? 0xc8c0b0 : 0xfff0cc, count: evening ? 18 : 40, driftX: 18, scale: 0.16, alpha: 0.6, band: [0.36, 0.92] })
      .breathe({ amount: 0.06, duration: 27000 });
    CHIMNEYS.forEach((c, i) => {
      this.chimneys.push(air.chimney(c.x, c.y, { scale: 0.58, rate: 620 + i * 140, tint: evening ? 0xa6aab0 : 0xcfd4d6 }));
    });

    // --- everything set into the painting, in drawing order
    addUpgrades(this, painting, s, { animate: true, seen: this.lastSeen });
    this.addElder();
    this.addCat();
    if (s.crumb) this.drawCrumb(false);
    if (evening) addEvening(this, painting, { lit: 1 + holdings().bread, arriving: news.bridge !== null });

    // --- the furniture
    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });
    this.objective = new Objective(this);
    this.holdings = new Holdings(this, this.lastSeen);
    this.setSmoke(this.lastSeen);

    // Registered before the bag's own handler, so it sees what was in hand at
    // the moment of the click rather than after the bag has put it back.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      if (!holding && !over.length) this.narration.mutter(village.nothing);
    });

    this.addSpots();

    this.bagUi = new Bag(this);
    this.bagUi.onUse = (id, x, y) => this.useItem(id, x, y);

    // Whatever changes while the player is here, changes in front of them.
    const offShown = state.onChange(() => this.rememberShown());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offShown);

    // Coming back from an encounter, the first thing said is what changed —
    // timed to land once the building has finished arriving.
    if (news.granary || news.bridge) {
      this.time.delayedCall(ARRIVAL_LINE_MS, () => {
        this.holdings.refresh(true);
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

  /** Vecā Anna: the standing figure and everything she has to say. */
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
    const r = village.replies;
    const run = state.get();
    let line: Loc = items.cutWrongTool;
    switch (target) {
      case 'anna':
        line = id === 'sickle' ? r.sickleOnAnna : id === 'cat' ? r.catOnAnna : r.breadOnAnna;
        break;
      case 'cat':
        if (run.catLost) break;
        if (id === 'bread') line = r.breadOnCat;
        else if (id === 'sickle') line = r.sickleOnCat;
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
        } else if (id === 'cat') {
          this.bagUi.putBack();
          this.catAroundStone();
          this.narration.flash(r.catOnStone);
          return true;
        }
        break;
      case 'granary':
        line = run.jumis === 'none' ? r.onFoundation : r.onGranary;
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

  // --- Anna ------------------------------------------------------------------

  /** What Anna says, which depends entirely on where the run has got to. */
  private talkTo(): void {
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

    this.narration.say([elder.harvestBack.cart], () => {
      cart.show(250);
      cart.set(run.sheaves);
      this.time.delayedCall(700 + run.sheaves * 90, () => {
        this.narration.say(elder.harvestBack[pick], () => {
          this.narration.hide();
          this.holdings.pulse();
          cart.thresh(
            this.holdings.breadSlot,
            bread,
            () => this.holdings.addLoaf(),
            () => {
              state.set('jumisPaid', true);
              this.holdings.refresh(false);
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
    const line = elder.harvestBack.bread[loaf];
    this.narration.say([line], () => {
      this.bagUi.fly(textureFor('bread'), ELDER.x, ELDER.y - ELDER.h * 0.55);
      bag.add('bread');
      lore.unlock('maize');
      this.objective.refresh();
      // Straight on into the second errand: she has the player's attention.
      this.narration.say(elder.bog, () => {
        this.narration.ask(elder.bogAsk, [
          { label: elder.choices.accept, onPick: () => this.narration.flash(elder.farewell) },
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
    goTo(this, key, data);
  }
}
