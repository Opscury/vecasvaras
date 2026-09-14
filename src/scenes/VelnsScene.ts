import Phaser from 'phaser';
import { velns, reckoning, items } from '../content/script';
import { state } from '../core/state';
import { velnsMisses, velnsOutcome, type VelnsMiss, type VelnsPick } from '../core/rules';
import { joinLoc, type Loc } from '../core/i18n';
import { Narration, type Choice } from '../ui/Narration';
import { Hotspot } from '../ui/Hotspot';
import { Chrome } from '../ui/Chrome';
import { Holdings } from '../ui/Holdings';
import { DainaCard } from '../ui/DainaCard';
import { Reckoning } from '../ui/Reckoning';
import { Atmosphere } from '../fx/Atmosphere';
import { Bag } from '../ui/Bag';
import { bag } from '../core/inventory';
import { Painting } from '../ui/Painting';
import { Prompt } from '../ui/Prompt';
import { fadeIn, goTo } from './transition';
import { CAT_PAW_SLIDE, CAT_WALK_ANIM, CAT_WALK_FPS, defineAnims } from './assets';
import { audio } from '../core/audio';
import { textureFor } from '../core/itemArt';

/**
 * Encounter two — the folk-tale Devil at the bog crossing.
 *
 * The mood is the inverse of the field: dusk, cold, and a negotiation instead
 * of a search. Two beats:
 *
 *   RIDDLE   a fair question with one right answer. Getting it wrong does not
 *            end anything — it just means the Devil is enjoying himself, and
 *            it downgrades the best possible bridge.
 *   BARGAIN  "the first living thing to cross is mine." Sending the cat is the
 *            classic Devil's-Bridge trick and always works. Sending the loaf is
 *            the cleverer answer, but it only holds if the bread is worth
 *            something — which depends on how the player handled Jumis.
 *
 * That last link is the point of the whole vertical slice: the first encounter
 * is not a separate level, it is the resource you argue with here.
 */
const VELNS_POS = { x: 1330, y: 700 } as const;

/**
 * The causeway out, read off bog.jpg. The three with an `order` sit on the
 * painted boards and run from the near bank towards him; the other two are
 * moss hummocks on either side, which look like somewhere to put a foot and
 * are not.
 */
const PLANKS: readonly { x: number; y: number; order?: number }[] = [
  { x: 880, y: 960, order: 0 },
  { x: 470, y: 620 },
  { x: 1080, y: 790, order: 1 },
  { x: 1500, y: 800 },
  { x: 1160, y: 630, order: 2 },
];
/** Same cooling as the Devil, so the cat walks in the bog's own light. */
const BOG_TINT = 0xa8b0b8;

/**
 * The cat's route over the planks, measured on bog.jpg (ART_NOTES): baseline
 * and drawn height at the near bank, mid-crossing, and arriving at the Devil.
 * The shrink is doing the depth work.
 */
const CAT_PATH = { xs: [760, 1010, 1250], ys: [790, 745, 706], hs: [120, 108, 96] };
/** Height of one frame of the cat sheet, which is what `hs` is scaled against. */
const CAT_FRAME_H = 150;
const CAT_FADE_MS = 400;

/**
 * The crossing, solved from the walk cycle.
 *
 * The legs run at a fixed frame rate, so the cat's ground speed is fixed too --
 * in its own body's units, not the screen's. Drawn a fifth smaller at the far
 * bank, it covers a fifth less screen distance per step. Two things fall out of
 * that and both are computed here rather than picked:
 *
 * `pace[i]` is the fraction of the crossing elapsed by the i-th of 64 equal
 * steps along the path. Time is distance over speed, with speed proportional to
 * the drawn height, so moving the cat by this table instead of linearly is what
 * stops the paws sliding over the second half.
 *
 * `ms` is how long the whole thing takes: 13.5 px of paw slide per frame,
 * scaled to how big the cat is drawn and integrated along the path, comes to
 * 50.6 frames of animation, which at `CAT_WALK_FPS` is a little over three
 * seconds. Pick the duration freely instead and the paws slide by the error.
 */
const CAT_CROSSING = (() => {
  const N = 64;
  const cr = Phaser.Math.Interpolation.CatmullRom;
  const { xs, hs } = CAT_PATH;
  const t = [0];
  for (let i = 1; i <= N; i++) {
    const dx = cr(xs, i / N) - cr(xs, (i - 1) / N);
    const h = (cr(hs, (i - 1) / N) + cr(hs, i / N)) / 2;
    t.push(t[i - 1] + dx / h);
  }
  const frames = (CAT_FRAME_H / CAT_PAW_SLIDE) * t[N];
  return {
    pace: t.map((x) => x / t[N]) as readonly number[],
    ms: Math.round((frames / CAT_WALK_FPS) * 1000),
  };
})();

const CAT_WALK_MS = CAT_CROSSING.ms;

/** The path parameter to be at when `u` of the crossing has elapsed. */
function catAt(u: number): number {
  const { pace } = CAT_CROSSING;
  const N = pace.length - 1;
  let i = 1;
  while (i < N && pace[i] < u) i++;
  const a = pace[i - 1];
  const b = pace[i];
  return (i - 1 + (b > a ? (u - a) / (b - a) : 0)) / N;
}

/** The loaf's throw: from the near end of the planks to the far bank below the Devil. */
const THROW = { from: { x: 780, y: 800 }, to: { x: 1170, y: 712 }, peak: 170, ms: 950 };

export class VelnsScene extends Phaser.Scene {
  private narration!: Narration;
  private riddleRight = false;
  private bagUi!: Bag;
  private prompt!: Prompt;
  private painting!: Painting;
  private bargainOpen = false;
  private devil!: Phaser.GameObjects.Image;
  private spots: Hotspot[] = [];
  /** How many planks that hold have been stepped on. */
  private stepsTaken = 0;
  /** Set once the choice list has been offered as a way out of the bargain. */
  private listedBargain = false;

  constructor() {
    super('Velns');
  }

  create(): void {
    // One ambient channel for the whole game; this cross-fades from whatever
    // the last scene was playing.
    audio.ambient('bog');

    // Phaser reuses this instance on every visit, so every field starts over.
    this.riddleRight = false;
    this.bargainOpen = false;
    this.listedBargain = false;
    this.stepsTaken = 0;
    this.spots = [];
    state.set('scene', 'Velns');

    fadeIn(this);
    this.painting = new Painting(this, 'bg-bog');

    const devil = this.painting.add(
      this.add
        .image(VELNS_POS.x, VELNS_POS.y, 'velns')
        .setOrigin(0.5, 1)
        // Cooled into the bog's twilight — the cutout's moss base is daylight
        // green otherwise, and it gives the whole figure away as pasted on.
        .setTint(BOG_TINT)
        .setAlpha(0),
    );
    devil.setScale(430 / devil.height);
    // He breathes, and shifts his weight now and then. Two tweens on slightly
    // mismatched clocks are enough to stop a cutout reading as cardboard.
    this.tweens.add({
      targets: devil,
      scaleY: devil.scaleY * 1.012,
      duration: 2900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: devil,
      angle: { from: -0.5, to: 0.7 },
      duration: 6100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // The bog is the opposite of the field in every register, motion included:
    // no wind, nothing crossing the sky, just mist sliding over black water and
    // the little lights that are the whole reason anyone tells stories about
    // being out here after dark.
    new Atmosphere(this)
      .drift(this.painting.root, { scale: 1.025, duration: 52000 })
      .fog({ band: 0.46, height: 300, tint: 0x9fb0bb, alpha: 0.22, speed: 65000, layers: 3 })
      .fog({ band: 0.78, height: 260, tint: 0x7d8c96, alpha: 0.2, speed: 85000, layers: 2 })
      .wisps({ count: 6, band: [0.44, 0.74] })
      .breathe({ amount: 0.1, duration: 26000, tint: 0x060a10 });

    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });
    // The village's standing rides along into the encounter: it is what the
    // walk is for, and seeing it sit unchanged while the field is still
    // standing is the argument for cutting it properly.
    new Holdings(this);

    // Registered before the bag's own handler, so it sees what was in hand at
    // the moment of the click.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      // Poking at the bog with empty hands during the bargain is the shape of
      // someone who does not know what is wanted. Bring the list forward.
      if (!holding && !over.length) {
        if (this.bargainOpen) this.listBargain();
        else this.narration.mutter(velns.nothing);
      }
    });

    this.bagUi = new Bag(this);
    this.prompt = new Prompt(this);

    // The bargain can also be settled the old way, by handing something over
    // out of the bag. A player who works that out is rewarded, not blocked.
    this.bagUi.onUse = (id) => {
      if (!this.bargainOpen) {
        this.tell(items.notYet);
        return false;
      }
      if (id === 'cat' || id === 'bread') {
        this.offer(id);
        return true;
      }
      this.tell(items.cutWrongTool);
      return false;
    };

    this.devil = devil;

    new DainaCard(this, 'velns', () => {
      this.narration.say(velns.arrive, () => this.beginWade());
    });
  }

  /**
   * Getting out to him.
   *
   * The encounter used to open with the player already standing in front of
   * the Devil, having done nothing to get there — a conversation you arrived
   * in the middle of. Now the half-rotten causeway is the way in: three planks
   * hold and two do not, the camera creeps a little further out into the water
   * with each one that does, and the Devil is only close enough to talk to
   * once you have walked out to him.
   *
   * Nothing here can go wrong. Standing on a rotten plank costs a line and a
   * splash, because a bog that drowns you would be a different game.
   */
  private beginWade(): void {
    this.narration.hide();
    this.prompt.show(velns.wade.prompt);

    PLANKS.forEach((p) => {
      this.spots.push(
        new Hotspot(this, {
          x: p.x,
          y: p.y,
          r: 96,
          label: p.order === undefined ? velns.wade.hummock : velns.wade.plank,
          onClick: () => (p.order === undefined ? this.rottenPlank() : this.stepOut(p.order)),
        }),
      );
    });
  }

  private rottenPlank(): void {
    audio.play('bag', { volume: 0.4 });
    this.cameras.main.shake(140, 0.003);
    this.tell(velns.wade.rotten);
  }

  /** One plank further out. They have to be taken in order; the bog is not a maze. */
  private stepOut(order: number): void {
    if (order !== this.stepsTaken) {
      this.rottenPlank();
      return;
    }
    this.stepsTaken++;
    audio.play('click', { volume: 0.5 });
    this.cameras.main.shake(90, 0.0015);
    // The plank you are standing on is no longer somewhere to go. Deliberately
    // not a camera push: this camera draws the narration panel and the corner
    // chips as well, and zooming it walks them off the edge of the screen.
    this.spots[PLANKS.findIndex((p) => p.order === order)]?.setEnabled(false);

    const last = this.stepsTaken >= PLANKS.filter((p) => p.order !== undefined).length;
    if (!last) {
      this.prompt.flash(velns.wade.step[this.stepsTaken - 1], 2600);
      return;
    }
    this.prompt.hide(300);
    this.spots.forEach((s) => s.setEnabled(false));
    // He does not walk on. He is simply there, the way he always was.
    this.tweens.add({
      targets: this.devil,
      alpha: 1,
      duration: 1400,
      ease: 'Sine.easeOut',
      onComplete: () => this.greet(),
    });
  }

  update(): void {
    // The bag glows while he is waiting to be paid, so the answer to "how do
    // you settle it" has somewhere obvious to be looked for.
    this.bagUi?.attention(this.bargainOpen && !this.listedBargain && !this.bagUi.holding);
  }

  /**
   * A remark on something the player tried. In the panel when it is free; at
   * the top of the frame when the panel is holding the riddle or the bargain,
   * so the choices are not wiped.
   */
  private tell(line: Loc): void {
    if (this.narration.busy) this.prompt.flash(line);
    else this.narration.flash(line);
  }

  private greet(): void {
    this.narration.say(velns.greet, () => this.askRiddle());
  }

  private askRiddle(): void {
    this.narration.ask(velns.riddle, [
      { label: velns.riddleChoices.thief, onPick: () => this.answerRiddle(false) },
      { label: velns.riddleChoices.wind, onPick: () => this.answerRiddle(true) },
      { label: velns.riddleChoices.bear, onPick: () => this.answerRiddle(false) },
    ]);
  }

  private answerRiddle(correct: boolean): void {
    this.riddleRight = correct;
    this.narration.say([correct ? velns.riddleRight : velns.riddleWrong, ...velns.terms], () =>
      this.askBargain(),
    );
  }

  /**
   * The bargain, asked the way the field asks its question: the options on
   * screen. It used to be a question with no visible answer — a bag in the
   * corner and an unmarked patch of bog — at the game's best beat.
   *
   * Without the cat, its option is simply not there, and the lead-in says why.
   */
  private askBargain(): void {
    this.bargainOpen = true;
    this.listedBargain = false;
    // The bag first. The whole beat is "outwit him with what you are carrying",
    // and taking the cat out and putting it on his planks IS the trick — a
    // list of three sentences describing the trick is a summary of the best
    // moment in the game rather than the moment itself.
    this.narration.hide();
    this.prompt.show(velns.bargainPrompt);
    // But it must not become a guessing game about what the game wants. If the
    // player has not worked it out in twenty seconds, the old list comes up.
    this.time.delayedCall(20000, () => {
      if (this.bargainOpen) this.listBargain();
    });
  }

  /** The bargain as a list of sentences — the fallback, not the first offer. */
  private listBargain(): void {
    if (!this.bargainOpen || this.listedBargain) return;
    this.listedBargain = true;
    this.prompt.hide(250);
    const hasCat = bag.has('cat');
    const choices: Choice[] = [];
    if (hasCat) choices.push({ label: velns.choices.cat, onPick: () => this.offer('cat') });
    if (bag.has('bread')) choices.push({ label: velns.choices.bread, onPick: () => this.offer('bread') });
    choices.push({ label: velns.choices.self, onPick: () => this.offer('self') });
    this.narration.ask(hasCat ? velns.question : joinLoc(velns.question, items.noCat), choices);
  }

  /** Settles the bargain, from the list or from the bag. */
  private offer(pick: VelnsPick): void {
    if (!this.bargainOpen) return;
    this.bargainOpen = false;
    this.prompt.hide(250);
    if (pick !== 'self' && this.bagUi.holding === pick) {
      this.bagUi.consumeHeld();
    } else {
      this.bagUi.putBack();
      if (pick !== 'self') bag.remove(pick);
    }
    this.resolve(pick);
  }

  private resolve(pick: VelnsPick): void {
    const jumisState = state.get().jumis;
    const outcome = velnsOutcome(pick, this.riddleRight, jumisState);
    const misses = velnsMisses(pick, this.riddleRight, jumisState);

    // Commit now, in the same moment the offering left the bag. Saving only
    // after the prose meant a reload in between kept the bog unresolved with
    // the bread already gone — and without bread the bog cannot be entered.
    state.set('velns', outcome);

    // The narration follows the bargain the player actually made. A sound
    // bargain after a fumbled riddle still works as a trick, but he only builds
    // as well as the player answered, and the prose has to say so.
    const o = velns.outcomes;
    const fumbled = !this.riddleRight;
    const lines =
      pick === 'self'
        ? o.self
        : pick === 'cat'
          ? fumbled
            ? o.catFumbled
            : o.cat
          : jumisState !== 'good'
            ? o.breadPoor
            : fumbled
              ? o.breadGoodFumbled
              : o.breadGood;

    // Clear the panel so the crossing can be seen.
    this.narration.dismiss();

    // The cock crow is written into the last line of both winning bread
    // outcomes ("Purvā kaut kur iebrēcas gailis"). Splitting the run lets the
    // sound land on that line instead of guessing at a delay.
    const crowsOnLast = lines === o.breadGood || lines === o.breadGoodFumbled;
    const head = crowsOnLast ? lines.slice(0, -1) : [...lines];
    const tail = crowsOnLast ? lines.slice(-1) : [];

    const finish = () => {
      this.narration.hide();

      const good = outcome === 'good';
      const r = good ? reckoning.velns.good : reckoning.velns.poor;
      new Reckoning(this, {
        sign: 'crossing',
        good,
        verdict: r.verdict,
        gain: r.gain,
        missed: this.missedLine(misses),
        onDone: () => goTo(this, 'Village'),
      });
    };

    const play = () =>
      this.narration.say(head, () => {
        if (!tail.length) return finish();
        audio.play('cock');
        this.narration.say(tail, finish);
      });

    // The two climaxes happen on screen before a word is said about them.
    if (pick === 'cat') this.walkCat(play);
    else if (pick === 'bread') this.throwBread(jumisState === 'good', play);
    else play();
  }

  /** The cat crosses the planks, unhurried, and passes the Devil without stopping. */
  private walkCat(done: () => void): void {
    audio.play('cat');
    defineAnims(this);
    const { xs, ys, hs } = CAT_PATH;
    const cat = this.painting.add(
      this.add.sprite(xs[0], ys[0], 'cat-walk').setOrigin(0.5, 1).setTint(BOG_TINT),
    );
    cat.play(CAT_WALK_ANIM);
    const texH = cat.height;
    cat.setScale(hs[0] / texH);
    const fadeFrom = 1 - CAT_FADE_MS / CAT_WALK_MS;
    const path = Phaser.Math.Interpolation.CatmullRom;

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: CAT_WALK_MS,
      // Linear, not eased. The legs run at a fixed frame rate, so any easing of
      // the ground speed shows up as the paws sliding -- and a cat that is
      // already walking when it reaches the planks does not start from nothing.
      ease: 'Linear',
      onUpdate: (tw) => {
        const lin = tw.progress;
        const v = catAt(lin);
        // The rise and fall of the body is in the frames now, pinned to a shared
        // ground line, so there is no bob to fake here.
        this.painting.setScreenPosition(cat, path(xs, v), path(ys, v));
        cat.setScale(path(hs, v) / texH);
        cat.setAlpha(lin < fadeFrom ? 1 : Math.max(0, (1 - lin) / (1 - fadeFrom)));
      },
      onComplete: () => {
        cat.destroy();
        done();
      },
    });
  }

  /**
   * Half the loaf, thrown across. A good year's bread lands like bread; a thin
   * year's lands like a stone.
   */
  private throwBread(good: boolean, done: () => void): void {
    const { from, to, peak, ms } = THROW;
    const loaf = this.painting.add(this.add.image(from.x, from.y, textureFor('bread')).setTint(BOG_TINT));
    const s = 64 / Math.max(loaf.width, loaf.height);
    loaf.setScale(s);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      ease: 'Linear',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        this.painting.setScreenPosition(
          loaf,
          Phaser.Math.Linear(from.x, to.x, v),
          Phaser.Math.Linear(from.y, to.y, v) - Math.sin(v * Math.PI) * peak,
        );
        loaf.setScale(s * (1 - 0.15 * v));
        loaf.setAngle(v * 320);
      },
      onComplete: () => {
        if (good) {
          this.tweens.add({ targets: loaf, y: loaf.y - 8, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        } else {
          this.cameras.main.shake(160, 0.004);
        }
        this.time.delayedCall(650, done);
      },
    });
  }

  /**
   * What the player should have done, naming every reason that applies. "You
   * did badly" is not feedback; "the bread was thin because you stripped the
   * field" is — but only if it is the whole story, so a bridge lost two ways
   * at once gets both reasons.
   */
  private missedLine(misses: VelnsMiss[]): Loc | null {
    if (!misses.length) return null;
    const poor = reckoning.velns.poor;
    const why: Record<VelnsMiss, Loc> = {
      riddle: poor.missedRiddle,
      self: poor.missedSelf,
      bread: poor.missedBread,
    };
    return joinLoc(...misses.map((m) => why[m]), misses.length > 1 ? poor.thenWholeBoth : poor.thenWhole);
  }
}
