import Phaser from 'phaser';
import { type Loc } from '../core/i18n';
import { arrival, items, village } from '../content/script';
import { elder } from '../content/elder';
import { state, type Outcome } from '../core/state';
import { currentStep } from '../core/quest';
import { scaled } from '../core/theme';
import { Narration } from '../ui/Narration';
import { Hotspot } from '../ui/Hotspot';
import { Chrome } from '../ui/Chrome';
import { Objective } from '../ui/Objective';
import { Measures } from '../ui/Measures';
import { Atmosphere } from '../fx/Atmosphere';
import { Bag } from '../ui/Bag';
import { Painting } from '../ui/Painting';
import { bag } from '../core/inventory';
import { textureFor } from '../core/itemArt';
import { fadeIn, goTo } from './transition';
import { CHIMNEYS, addUpgrades } from './villageArt';
import { audio } from '../core/audio';

/**
 * The hub. Nothing happens here mechanically — its whole job is to be the
 * place the player keeps coming back to and see it get better.
 *
 * The coordinates below were read off the painting. If the background art is
 * ever regenerated, these are the numbers to re-measure (and the ones in
 * `villageArt.ts`).
 */
const POS = {
  stone: { x: 970, y: 530 },
  granary: { x: 452, y: 600 },
  // Covers both the log crossing and the taller v2 stone bridge.
  bridge: { x: 1560, y: 660 },
  pathField: { x: 150, y: 424 },
  pathBog: { x: 1792, y: 428 },
} as const;

/**
 * Where the two takeable things sit in the painting.
 *
 * SHED is the plank-roofed lean-to on the front of the near cottage. CAT is the
 * porch step of the right-hand cottage — it used to be at (1180, 470), which
 * put a cat half the height of a house on top of the thatch.
 */
const SHED = { x: 812, y: 912 };
const CAT = { x: 1222, y: 522 };
/** Drawn height of the sitting cat, in step with the cottages at that depth. */
const CAT_H = 52;

/**
 * Vecā Anna, on the open ground between her cottage and the rune stone.
 * `y` is the ground her feet stand on; `h` is her drawn height, scaled to the
 * cottages at that depth (a little over three times the sitting cat).
 */
const ELDER = { x: 700, y: 596, h: 178 };

/** How long after arriving the "what changed" line is said: once the building has settled. */
const ARRIVAL_LINE_MS = 2600;

export class VillageScene extends Phaser.Scene {
  private narration!: Narration;
  private bagUi!: Bag;
  private spots: Hotspot[] = [];
  private catSprite: Phaser.GameObjects.Image | null = null;
  private objective!: Objective;
  private measures!: Measures;
  /** The outcomes the player was last shown here, so the marks can catch up on screen. */
  private lastSeen: { jumis: Outcome; velns: Outcome } = { jumis: 'none', velns: 'none' };

  constructor() {
    super('Village');
  }

  create(): void {
    // One ambient channel for the whole game; this cross-fades from whatever
    // the last scene was playing.
    audio.ambient('village');

    // Phaser reuses this instance on every visit, so every field starts over.
    this.spots = [];
    this.catSprite = null;
    state.set('scene', 'Village');

    fadeIn(this);
    const painting = new Painting(this, 'bg-village');

    const air = new Atmosphere(this)
      .drift(painting.root, { scale: 1.03, duration: 40000 })
      // High haze over the treeline, moving slowly enough to read as weather.
      .fog({ band: 0.12, height: 260, tint: 0xe6ecef, alpha: 0.24, speed: 75000, layers: 2 })
      // A second, lower haze over the common itself, otherwise all the motion
      // sits up in the treeline and the middle of the frame stays dead.
      .fog({ band: 0.44, height: 330, tint: 0xdfe4e2, alpha: 0.16, speed: 95000, layers: 2 })
      .birds({ band: [0.06, 0.22], every: [6000, 14000] })
      .motes({ tint: 0xfff0cc, count: 40, driftX: 18, scale: 0.16, alpha: 0.6, band: [0.36, 0.92] })
      .breathe({ amount: 0.06, duration: 27000 });

    CHIMNEYS.forEach((c, i) => air.smoke(c.x, c.y, { scale: 0.58, rate: 620 + i * 140 }));

    addUpgrades(this, painting, state.get(), { animate: true });

    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });
    this.objective = new Objective(this);
    // Read the arrival BEFORE the marks are drawn: the marks start at whatever
    // the player last saw, so the one they just earned is still empty when
    // they walk in and fills a moment later, in front of them.
    const news = this.arrivalLine();
    this.measures = new Measures(this, this.objective.bottom + scaled(10), this.lastSeen);

    // Registered before the bag's own handler, so it sees what was in hand at
    // the moment of the click rather than after the bag has put it back.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      if (!holding && !over.length) this.narration.mutter(village.nothing);
    });

    const s = state.get();

    // --- the stone: flavour, and the way out once both encounters are done
    this.spot({
      x: POS.stone.x,
      y: POS.stone.y,
      w: 150,
      h: 220,
      label: village.stone.label,
      onClick: () => {
        // The stone only ends the run once Anna has heard about both debts.
        // Walking straight from the bog into the ending skipped the only
        // person who had been keeping the account.
        if (currentStep() === 'done') {
          this.narration.say(village.stone.lines, () => this.leaveTo('Outro'));
        } else {
          this.narration.say(village.stone.lines);
        }
      },
    });

    // --- the granary slot
    this.spot({
      x: POS.granary.x,
      y: POS.granary.y,
      w: 340,
      h: 190,
      label: village.granarySlot.label,
      onClick: () =>
        this.narration.flash(
          s.jumis === 'good'
            ? village.granarySlot.good
            : s.jumis === 'poor'
              ? village.granarySlot.poor
              : village.granarySlot.empty,
        ),
    });

    // --- the bridge slot
    this.spot({
      x: POS.bridge.x,
      y: POS.bridge.y,
      w: 320,
      h: 210,
      label: village.bridgeSlot.label,
      onClick: () =>
        this.narration.flash(
          s.velns === 'good'
            ? village.bridgeSlot.good
            : s.velns === 'poor'
              ? village.bridgeSlot.poor
              : village.bridgeSlot.empty,
        ),
    });

    // --- left exit: the field
    this.spot({
      x: POS.pathField.x,
      y: POS.pathField.y,
      w: 220,
      h: 260,
      label: village.pathField.label,
      onClick: () => {
        if (state.get().jumis !== 'none') {
          this.narration.flash(village.pathField.done);
          return;
        }
        // Nobody has asked yet. Walking out to cut somebody else's rye
        // unprompted is not a thing a person does.
        if (!state.get().metElder) {
          this.narration.flash(elder.notAsked);
          return;
        }
        if (!bag.has('sickle')) {
          this.narration.flash(items.needSickle);
          return;
        }
        // `say` waits for a click before running its callback, so the player
        // finishes reading and then leaves.
        this.narration.say([village.pathField.ready], () => this.leaveTo('Jumis'));
      },
    });

    // --- right exit: the bog
    this.spot({
      x: POS.pathBog.x,
      y: POS.pathBog.y,
      w: 220,
      h: 260,
      label: village.pathBog.label,
      onClick: () => {
        if (state.get().velns !== 'none') {
          this.narration.flash(village.pathBog.done);
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

    this.bagUi = new Bag(this);

    // --- Anna, who is the reason any of the rest of this happens
    this.addElder(painting);

    // --- the lean-to where the sickle hangs
    this.spot({
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
        this.narration.say([items.shed.withSickle, items.shed.tookIt], () => {
          // Off the hook and into the bag, on screen.
          this.bagUi.fly('item-sickle', SHED.x, SHED.y);
          bag.add('sickle');
          // No follow-up line: the corner already says where the sickle is
          // meant to go, and says it for as long as the player needs.
          this.objective.refresh();
        });
      },
    });

    // --- the cat, optional but the difference between two good endings and one
    if (!bag.has('cat')) {
      const cat = painting.add(this.add.image(CAT.x, CAT.y, 'item-cat').setOrigin(0.5, 1));
      cat.setScale(CAT_H / cat.height).setTint(0xd6d2c8);
      // It shifts its weight now and then, which is most of what a sitting cat does.
      this.tweens.add({
        targets: cat,
        angle: { from: -1.2, to: 1.2 },
        duration: 4200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.catSprite = cat;
    }

    this.spot({
      x: CAT.x,
      y: CAT.y - CAT_H / 2,
      w: 120,
      h: 110,
      label: items.cat.label,
      onClick: () => {
        if (bag.has('cat')) {
          this.narration.flash(items.cat.already);
          return;
        }
        this.narration.say([items.cat.there, items.cat.tookIt], () => {
          audio.play('cat');
          this.catSprite?.destroy();
          this.catSprite = null;
          this.bagUi.fly('item-cat', CAT.x, CAT.y - CAT_H / 2);
          bag.add('cat');
        });
      },
    });

    // Coming back from an encounter, the first thing said is what changed —
    // timed to land once the building has finished arriving, not while it is
    // still settling in behind a fade.
    //
    // Both lines are on timers, so neither may replace something the player
    // has already asked for.
    //
    // There is deliberately no "what to do next" line any more. That used to
    // be `nudge()`, one flash that was gone the moment anything else was
    // clicked; the corner of the screen now says it permanently, and Anna
    // says it out loud to anyone who asks her.
    if (news) {
      this.time.delayedCall(ARRIVAL_LINE_MS, () => {
        this.measures.refresh(true);
        if (this.narration.busy) return;
        this.narration.say([news]);
      });
    }
  }

  /**
   * What just appeared in the village, if anything. Compares the run state
   * against what the player had already been shown, so the line only fires on
   * the trip home from the encounter that built it.
   */
  private arrivalLine(): Loc | null {
    const s = state.get();
    const seen = this.registry.get('villageSeen') as { jumis?: Outcome; velns?: Outcome } | undefined;
    const prev = seen ?? {};
    this.lastSeen = { jumis: prev.jumis ?? 'none', velns: prev.velns ?? 'none' };
    this.registry.set('villageSeen', { jumis: s.jumis, velns: s.velns });

    if (s.jumis !== 'none' && prev.jumis !== s.jumis) {
      return s.jumis === 'good' ? arrival.granaryGood : arrival.granaryPoor;
    }
    if (s.velns !== 'none' && prev.velns !== s.velns) {
      return s.velns === 'good' ? arrival.bridgeGood : arrival.bridgePoor;
    }
    return null;
  }

  /**
   * Vecā Anna: the standing figure and everything she has to say.
   *
   * She is the hint system with a face. Every branch below is reachable at any
   * time by walking over and touching her, which is the whole point — the
   * advice the game used to give once, in passing, is now a person who is
   * still there an hour later.
   */
  private addElder(painting: Painting): void {
    const anna = painting.add(this.add.image(ELDER.x, ELDER.y, 'elder').setOrigin(0.5, 1));
    anna.setScale(ELDER.h / anna.height);
    // Cooled a shade, the way the Devil is cooled into the bog. Straight out of
    // the generator she is lit warmer than the village she is standing in, and
    // that difference is exactly what makes a cutout look pasted on.
    anna.setTint(0xdad9d2);
    // The same two mismatched clocks the Devil has, so she reads as somebody
    // standing rather than a cutout leaning against the village.
    this.tweens.add({
      targets: anna,
      scaleY: anna.scaleY * 1.008,
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: anna,
      angle: { from: -0.5, to: 0.5 },
      duration: 7300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.spot({
      x: ELDER.x,
      y: ELDER.y - ELDER.h / 2,
      w: 150,
      h: ELDER.h + 30,
      label: elder.label,
      onClick: () => this.talkTo(),
    });
  }

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
        {
          label: elder.choices.why,
          onPick: () => this.narration.say([elder.why], accept),
        },
      ]);
    });
  }

  /**
   * Reporting the harvest. This is where the loaf comes from now: it used to
   * appear in the bag during the outcome text out at the field, where the
   * playtester never saw it arrive and could not say what it was for.
   */
  private takeHarvestBack(): void {
    const good = state.get().jumis === 'good';
    const lines = good ? elder.harvestBack.good : elder.harvestBack.poor;
    this.narration.say([...lines, elder.harvestBack.bread], () => {
      this.bagUi.fly(textureFor('bread'), ELDER.x, ELDER.y - ELDER.h * 0.55);
      bag.add('bread');
      state.set('jumisPaid', true);
      this.objective.refresh();
      // Straight on into the second errand: she has the player's attention and
      // a walk back across the village to ask again is not a puzzle.
      this.narration.say(elder.bog, () => {
        this.narration.ask(elder.bogAsk, [
          { label: elder.choices.accept, onPick: () => this.narration.flash(elder.farewell) },
        ]);
      });
    });
  }

  private takeBogBack(): void {
    const good = state.get().velns === 'good';
    const lines = good ? elder.bogBack.good : elder.bogBack.poor;
    this.narration.say([...lines, elder.toStone], () => {
      state.set('velnsPaid', true);
      this.objective.refresh();
    });
  }

  private spot(o: ConstructorParameters<typeof Hotspot>[1]): void {
    this.spots.push(new Hotspot(this, o));
  }

  /** Every exit goes through here, so nothing else can be clicked on the way out. */
  private leaveTo(key: string): void {
    this.spots.forEach((s) => s.setEnabled(false));
    this.narration.hide();
    goTo(this, key);
  }
}
