import Phaser from 'phaser';
import { velns, reckoning, items } from '../content/script';
import { state } from '../core/state';
import {
  NIGHT,
  catLost,
  devilGone,
  loafFrom,
  velnsMisses,
  velnsOutcome,
  type Loaf,
  type VelnsMiss,
  type VelnsPick,
} from '../core/rules';
import { joinLoc, type Loc } from '../core/i18n';
import { lore } from '../core/lore';
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
import { Portrait } from '../ui/Portrait';
import { Layout } from '../core/theme';
import { fadeIn, goTo } from './transition';
import { CAT_PAW_SLIDE, CAT_WALK_ANIM, CAT_WALK_FPS, defineAnims } from './assets';
import { audio } from '../core/audio';
import { textureFor } from '../core/itemArt';
import { attachWind, type WindPipeline } from '../fx/WindPipeline';
import { makeBlob, makePlank } from '../fx/textures';

/**
 * Encounter two — the folk-tale Devil at the bog crossing.
 *
 * The mood is the inverse of the field: dusk, cold, and a negotiation instead
 * of a harvest. Four beats:
 *
 *   WADE     out along a half-rotten causeway. A wrong step sends you back to
 *            the bank. A light hovers over a hummock that will not hold; a
 *            frog calls from the plank that will. The cat, if you brought it,
 *            goes first and only treads where it is safe.
 *   RIDDLE   a fair question. Get it wrong and he offers a second, harder one
 *            — he is bored and wants to keep playing. Get it right and you may
 *            ask him one back, which rattles him into working faster.
 *   NIGHT    once the terms are spoken he starts laying planks, and the sky
 *            starts, slowly, to grey. Whatever you give him ends the night.
 *   BARGAIN  "the first living thing to cross is mine." The cat always works,
 *            and never comes home. The loaf works when it was baked from a
 *            field that kept its share — and a loaf with Jumis in it sends him
 *            off the bog for good. Let the cocks crow with nothing paid and the
 *            unpaid bridge sinks by morning.
 *
 * The first encounter is not a separate level; it is the loaf you argue with
 * here.
 */
const VELNS_POS = { x: 1330, y: 700 } as const;

/**
 * The causeway out, read off bog.jpg. The three with an `order` sit on the
 * painted boards and run from the near bank towards him; the other two are
 * moss hummocks, which look like somewhere to put a foot and are not.
 */
const PLANKS: readonly { x: number; y: number; order?: number }[] = [
  { x: 880, y: 960, order: 0 },
  { x: 470, y: 620 },
  { x: 1080, y: 790, order: 1 },
  { x: 1500, y: 800 },
  { x: 1160, y: 630, order: 2 },
];
const STEPS = PLANKS.filter((p) => p.order !== undefined).length;
const HUMMOCKS = PLANKS.filter((p) => p.order === undefined);

/** Same cooling as the Devil, so everything set into the bog is in its light. */
const BOG_TINT = 0xa8b0b8;

/**
 * Where the cat waits, beside each plank that holds, and on the bank before
 * the first. Heights shrink with depth, read off the painted boards.
 */
const CAT_BANK = { x: 760, y: 1062, h: 150 };
const CAT_SPOTS = [
  { x: 968, y: 934, h: 132 },
  { x: 1004, y: 762, h: 106 },
  { x: 1104, y: 612, h: 84 },
];
/** Height of one frame of the cat sheet, which the drawn heights scale against. */
const CAT_FRAME_H = 150;

/**
 * The bridge he lays, one plank at a time, from the end of the causeway up to
 * the far bank — along the line of the painted boards.
 */
const BRIDGE = Array.from({ length: NIGHT.planks }, (_, i) => {
  const t = (i + 0.5) / NIGHT.planks;
  return { x: 1150 - 290 * t, y: 600 - 175 * t, w: 152 - 72 * t };
});
/** Where a player stepping onto the new bridge would put a foot. */
const BRIDGE_SPOT = { x: 1000, y: 515, w: 340, h: 210 } as const;

/** The loaf's throw: from the end of the causeway to the far end of the new bridge. */
const THROW = { from: { x: 1150, y: 640 }, to: { x: 890, y: 446 }, peak: 150, ms: 950 };

/** The cat's crossing, along the new bridge and away. */
const CAT_CROSS = { from: { x: 1128, y: 604, h: 86 }, to: { x: 862, y: 432, h: 50 } };

type Phase = 'arrive' | 'wade' | 'talk' | 'night' | 'resolved';

/**
 * The Devil's cutout came with a hummock of bright daylight-green moss under
 * him. The bog's moss is russet, and at night — with the narration panel down
 * and nothing dimming him — that green patch gave the whole figure away as
 * pasted in. This recolours the green in the lower part of the sprite towards
 * the painting's own rust, once, into a texture of its own.
 */
function bogMossDevil(scene: Phaser.Scene): string {
  const key = 'velns-bog';
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get('velns').getSourceImage() as HTMLImageElement;
  const w = src.width;
  const h = src.height;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return 'velns';
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const from = Math.floor(h * 0.5);
  for (let y = from; y < h; y++) {
    // Fade the effect in over the top of the band, so nothing has a seam.
    const k = Math.min(1, (y - from) / (h * 0.08));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const green = g - Math.max(r, b);
      if (green <= 4) continue;
      const amt = Math.min(1, green / 40) * k;
      const l = 0.3 * r + 0.55 * g + 0.15 * b;
      d[i] = r + (l * 1.05 - r) * amt;
      d[i + 1] = g + (l * 0.6 - g) * amt;
      d[i + 2] = b + (l * 0.5 - b) * amt;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  return key;
}

export class VelnsScene extends Phaser.Scene {
  private narration!: Narration;
  private portrait!: Portrait;
  private riddleRight = false;
  private quick = false;
  private bagUi!: Bag;
  private prompt!: Prompt;
  private painting!: Painting;
  private air!: Atmosphere;
  private phase: Phase = 'arrive';
  private devil!: Phaser.GameObjects.Image;
  private spots: Hotspot[] = [];
  private bridgeSpot: Hotspot | null = null;
  /** How many planks that hold have been stepped on. */
  private stepsTaken = 0;
  /** Which hummock the false light is over. */
  private lureAt = 0;
  private lure: Phaser.GameObjects.Container | null = null;
  /** A second, dimmer light over the other hummock: the bog has more than one. */
  private lure2: Phaser.GameObjects.Container | null = null;
  private beckonTimer: Phaser.Time.TimerEvent | null = null;
  private sparkTimer: Phaser.Time.TimerEvent | null = null;
  private hintTimer: Phaser.Time.TimerEvent | null = null;

  /** The cat walking the causeway ahead of the player, if it came. */
  private scout: Phaser.GameObjects.Sprite | null = null;
  /** The walk under way, if any. A counter tween, so killTweensOf(cat) misses it. */
  private scoutWalk: Phaser.Tweens.Tween | null = null;
  private scoutBusy = false;

  /** The night. */
  private built: Phaser.GameObjects.Image[] = [];
  private nightTimers: Phaser.Time.TimerEvent[] = [];
  private dawn: Phaser.GameObjects.Graphics | null = null;
  private listedBargain = false;
  private greyed = false;
  private wind: WindPipeline | null = null;

  constructor() {
    super('Velns');
  }

  create(): void {
    audio.ambient('bog');

    // Phaser reuses this instance on every visit, so every bog starts over.
    this.riddleRight = false;
    this.quick = false;
    this.phase = 'arrive';
    this.listedBargain = false;
    this.greyed = false;
    this.stepsTaken = 0;
    this.lureAt = 0;
    this.lure = null;
    this.lure2 = null;
    this.beckonTimer = null;
    this.sparkTimer = null;
    this.hintTimer = null;
    this.scout = null;
    this.scoutWalk = null;
    this.scoutBusy = false;
    this.spots = [];
    this.bridgeSpot = null;
    this.built = [];
    this.nightTimers = [];
    this.dawn = null;
    this.wind = null;
    state.set('scene', 'Velns');

    fadeIn(this);
    this.painting = new Painting(this, 'bg-bog');
    makeBlob(this);
    makePlank(this);
    defineAnims(this);

    const devil = this.painting.add(
      this.add
        .image(VELNS_POS.x, VELNS_POS.y, bogMossDevil(this))
        .setOrigin(0.5, 1)
        // Cooled into the bog's twilight — the cutout's moss base is daylight
        // green otherwise, and it gives the whole figure away as pasted on.
        .setTint(BOG_TINT)
        .setAlpha(0),
    );
    devil.setScale(430 / devil.height);
    // He breathes, and shifts his weight now and then.
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
    this.devil = devil;

    this.air = new Atmosphere(this)
      .drift(this.painting.root, { scale: 1.025, duration: 52000 })
      .fog({ band: 0.46, height: 300, tint: 0x9fb0bb, alpha: 0.22, speed: 65000, layers: 3 })
      .fog({ band: 0.78, height: 260, tint: 0x7d8c96, alpha: 0.2, speed: 85000, layers: 2 })
      .wisps({ count: 5, band: [0.44, 0.74] })
      .breathe({ amount: 0.1, duration: 26000, tint: 0x060a10 });

    this.narration = new Narration(this);
    // His face, close: glinting eyes that blink, the grin that nods on every line.
    this.portrait = new Portrait(this, this.narration, {
      key: 'portrait-velns',
      name: velns.name,
      eyes: [
        { x: 209, y: 229 },
        { x: 294, y: 193 },
      ],
      lid: 0x0e0b0a,
      glint: 0xff9a40,
    });
    new Chrome(this, { log: () => this.narration.history });
    new Holdings(this, undefined, { bread: false });

    // Registered before the bag's own handler, so it sees what was in hand at
    // the moment of the click.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (p.button !== 0) return;
      const holding = this.bagUi?.holding ?? null;
      if (this.narration.advance()) return;
      // Poking at the bog with empty hands during the night is the shape of
      // someone who does not know what is wanted. Bring the list forward.
      if (!holding && !over.length) {
        if (this.phase === 'night') this.listBargain();
        else this.narration.mutter(velns.nothing);
      }
    });

    this.bagUi = new Bag(this);
    this.prompt = new Prompt(this);

    // The bargain is settled by handing something over out of the bag.
    this.bagUi.onUse = (id) => {
      if (id === 'sickle') {
        this.tell(velns.replies.sickle);
        return false;
      }
      if (this.phase !== 'night' || id === 'hat') {
        this.tell(items.notYet);
        return false;
      }
      this.offer(id);
      return true;
    };

    DainaCard.open(this, 'velns', () => {
      this.narration.say(velns.arrive, () => this.beginWade());
    });
  }

  update(): void {
    // The bag glows while he is waiting to be paid, so "how do you settle it"
    // has somewhere obvious to be looked for.
    this.bagUi?.attention(this.phase === 'night' && !this.listedBargain && !this.bagUi.holding && !this.narration.busy);
  }

  /**
   * A remark on something the player tried. In the panel when it is free; at
   * the top of the frame when the panel is holding a decision.
   */
  private tell(line: Loc): void {
    if (this.narration.busy) this.prompt.flash(line);
    else this.narration.flash(line);
  }

  // --- the causeway ----------------------------------------------------------

  /**
   * Getting out to him. Three planks hold and two hummocks do not; a wrong
   * step puts you back on the bank. Nothing drowns you — but the order is now
   * something worth remembering, and the bog has two ways of telling you it:
   * a light that lies, and a frog that does not.
   */
  private beginWade(): void {
    this.narration.hide();
    this.phase = 'wade';
    this.prompt.show(velns.wade.prompt);

    PLANKS.forEach((p) => {
      this.spots.push(
        new Hotspot(this, {
          id: p.order === undefined ? 'hummock' : `plank${p.order}`,
          x: p.x,
          y: p.y,
          r: 96,
          label: p.order === undefined ? velns.wade.hummock : velns.wade.plank,
          onClick: () => (p.order === undefined ? this.sink(p) : this.stepOut(p.order)),
        }),
      );
    });

    this.placeLure(0);
    this.hintTimer = this.time.addEvent({ delay: 4600, startAt: 3000, loop: true, callback: () => this.frogHint() });

    if (bag.has('cat')) this.releaseScout();
  }

  /**
   * Maldugunis: the lights that show a path where there is none.
   *
   * It used to sit over a hummock and pulse. Now it does what the belief says
   * they do: every few seconds it comes out over the water towards wherever the
   * player is standing, hangs there brightening, and draws back to its hummock
   * slowly, trailing sparks — follow me. A second, dimmer one idles over the
   * other hummock, so the bog never shows only one light to trust.
   */
  private placeLure(which: number): void {
    this.lureAt = which;
    const h = HUMMOCKS[which];
    if (!this.lure) {
      this.lure = this.makeWisp(h.x, h.y - 70, 1);
      this.lure2 = this.makeWisp(HUMMOCKS[1 - which].x, HUMMOCKS[1 - which].y - 60, 0.55);
      this.beckonTimer = this.time.addEvent({ delay: 5600, startAt: 2600, loop: true, callback: () => this.beckon() });
      this.sparkTimer = this.time.addEvent({ delay: 140, loop: true, callback: () => this.spark() });
    }
    this.tweens.killTweensOf(this.lure);
    this.showWisp(this.lure);
    this.tweens.add({
      targets: this.lure,
      x: h.x - Layout.width / 2,
      y: h.y - 70 - Layout.height / 2,
      duration: 1800,
      ease: 'Sine.easeInOut',
    });
    const other = HUMMOCKS[1 - which];
    if (this.lure2) {
      this.tweens.killTweensOf(this.lure2);
      this.showWisp(this.lure2);
      this.tweens.add({
        targets: this.lure2,
        x: other.x - Layout.width / 2,
        y: other.y - 60 - Layout.height / 2,
        duration: 2400,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** A halo and a hot core, breathing on their own. `power` dims the lesser one. */
  private makeWisp(x: number, y: number, power: number): Phaser.GameObjects.Container {
    const halo = this.add
      .image(0, 0, 'fx-blob')
      .setTint(0xffc860)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setScale(1.5 * power)
      .setAlpha(0.45 * power);
    const core = this.add
      .image(0, 0, 'fx-blob')
      .setTint(0xfff4c8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.3 * power)
      .setAlpha(0.95 * power);
    // Its light lying on the black water under it.
    const pool = this.add
      .image(0, 70, 'fx-blob')
      .setTint(0xffb040)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.3 * power, 0.28 * power)
      .setAlpha(0.3 * power);
    const w = this.painting.add(this.add.container(x, y, [pool, halo, core]).setAlpha(0));
    this.tweens.add({ targets: halo, alpha: { from: 0.25 * power, to: 0.55 * power }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: core, scale: 0.38 * power, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Never quite still.
    this.tweens.add({ targets: [halo, core], y: { from: -7, to: 7 }, x: { from: -4, to: 4 }, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return w;
  }

  /**
   * Fades a wisp up if it is not already lit. Every move starts by killing the
   * wisp's tweens, and the fade-in is one of them — killed half-way, it left
   * the light at nothing.
   */
  private showWisp(w: Phaser.GameObjects.Container): void {
    if (w.alpha < 1) this.tweens.add({ targets: w, alpha: 1, duration: 1000 });
  }

  /** Out over the water towards the player, a held breath, and slowly back. */
  private beckon(): void {
    const w = this.lure;
    if (!w || this.phase !== 'wade' || this.narration.busy) return;
    const home = HUMMOCKS[this.lureAt];
    const standing =
      this.stepsTaken === 0 ? { x: CAT_BANK.x + 60, y: 960 } : PLANKS.find((q) => q.order === this.stepsTaken - 1)!;
    const toward = {
      x: Phaser.Math.Linear(home.x, standing.x, 0.55),
      y: Phaser.Math.Linear(home.y - 70, standing.y - 90, 0.55),
    };
    this.tweens.killTweensOf(w);
    this.showWisp(w);
    this.tweens.chain({
      targets: w,
      tweens: [
        { x: toward.x - Layout.width / 2, y: toward.y - Layout.height / 2, scale: 1.25, duration: 1700, ease: 'Sine.easeInOut' },
        { scale: 1.45, duration: 700, yoyo: true, ease: 'Sine.easeInOut' },
        { x: home.x - Layout.width / 2, y: home.y - 70 - Layout.height / 2, scale: 1, duration: 2400, ease: 'Sine.easeInOut' },
      ],
    });
    audio.play('chime', { volume: 0.12, rate: 1.7 });
  }

  /** Sparks shed by the lead light as it moves, drifting up and out. */
  private spark(): void {
    const w = this.lure;
    if (!w || w.alpha < 0.5) return;
    const sp = this.painting.add(
      this.add
        .image(w.x + Layout.width / 2 + Phaser.Math.Between(-10, 10), w.y + Layout.height / 2 + Phaser.Math.Between(-8, 8), 'fx-blob')
        .setTint(0xffe0a0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.05)
        .setAlpha(0.7),
    );
    this.tweens.add({
      targets: sp,
      y: sp.y - Phaser.Math.Between(18, 40),
      x: sp.x + Phaser.Math.Between(-12, 12),
      alpha: 0,
      scale: 0.02,
      duration: Phaser.Math.Between(700, 1200),
      onComplete: () => sp.destroy(),
    });
  }

  /** A ring on the water and a croak, from the plank that will hold next. */
  private frogHint(): void {
    if (this.phase !== 'wade' || this.stepsTaken >= STEPS) return;
    const p = PLANKS.find((q) => q.order === this.stepsTaken)!;
    const x = p.x + 70;
    const y = p.y + 24;
    const ring = this.painting.add(this.add.graphics().setPosition(x, y));
    const k = { r: 0 };
    this.tweens.add({
      targets: k,
      r: 1,
      duration: 1400,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(2, 0xc9d3da, 0.55 * (1 - k.r));
        ring.strokeEllipse(0, 0, 20 + 90 * k.r, 6 + 26 * k.r);
      },
      onComplete: () => ring.destroy(),
    });
    audio.play('frog', { volume: 0.34 });
  }

  /** A foot on a hummock. */
  private sink(h: { x: number; y: number }): void {
    const lured = HUMMOCKS.indexOf(h) === this.lureAt;
    this.fallBack(lured ? velns.wade.lured : velns.wade.rotten);
    if (lured) {
      lore.unlock('maldugunis');
      // The light moves on, as they do.
      this.placeLure(1 - this.lureAt);
      // It flares — pleased with itself — as it moves on.
      if (this.lure) this.tweens.add({ targets: this.lure, scale: 1.9, duration: 260, yoyo: true, ease: 'Quad.easeOut' });
    }
  }

  /** One plank further out. They have to be taken in order; a leap is a fall. */
  private stepOut(order: number): void {
    if (order !== this.stepsTaken) {
      this.fallBack(velns.wade.tooFar);
      return;
    }
    this.stepsTaken++;
    audio.play('click', { volume: 0.5 });
    this.cameras.main.shake(90, 0.0015);
    // The plank you are standing on is no longer somewhere to go.
    this.spotFor(order)?.setEnabled(false);
    this.moveScout(this.stepsTaken);

    if (this.stepsTaken < STEPS) {
      this.prompt.flash(velns.wade.step[this.stepsTaken - 1], 2600);
      return;
    }
    this.prompt.hide(300);
    this.hintTimer?.remove(false);
    this.hintTimer = null;
    this.spots.forEach((s) => s.setEnabled(false));
    this.beckonTimer?.remove(false);
    this.sparkTimer?.remove(false);
    [this.lure, this.lure2].forEach((w) => {
      if (!w) return;
      this.tweens.killTweensOf(w);
      this.tweens.add({ targets: w, alpha: 0, duration: 900, onComplete: () => w.destroy() });
    });
    // He does not walk on. He is simply there, the way he always was.
    this.tweens.add({
      targets: this.devil,
      alpha: 1,
      duration: 1400,
      ease: 'Sine.easeOut',
      onComplete: () => this.recallScout(() => this.greet()),
    });
  }

  private spotFor(order: number): Hotspot | undefined {
    return this.spots.find((s) => s.id === `plank${order}`);
  }

  /** Into the water to the knees, and back to the bank. */
  private fallBack(line: Loc): void {
    audio.play('splash');
    this.cameras.main.shake(220, 0.004);
    // Up top, and briefly: the causeway is in the bottom half of the picture,
    // and a panel of text over it hides the very planks being read.
    this.prompt.flash(line, 3600);
    this.stepsTaken = 0;
    this.spots.forEach((s) => s.setEnabled(true));
    this.moveScout(0, true);
  }

  // --- the cat, going first ---------------------------------------------------

  private catHeight(y: number): number {
    const pts = [CAT_SPOTS[2], CAT_SPOTS[1], CAT_SPOTS[0], CAT_BANK];
    if (y <= pts[0].y) return pts[0].h;
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i].y) {
        const t = (y - pts[i - 1].y) / (pts[i].y - pts[i - 1].y);
        return Phaser.Math.Linear(pts[i - 1].h, pts[i].h, t);
      }
    }
    return CAT_BANK.h;
  }

  private releaseScout(): void {
    this.bagUi.setAway('cat', true);
    this.prompt.flash(velns.wade.catAhead, 3200);
    audio.play('cat');
    this.bagUi.flyOut('item-cat', CAT_BANK.x, CAT_BANK.y - 60, {
      onLanded: () => {
        const cat = this.painting.add(
          this.add.sprite(CAT_BANK.x, CAT_BANK.y, 'cat-walk').setOrigin(0.5, 1).setTint(BOG_TINT),
        );
        cat.setScale(CAT_BANK.h / CAT_FRAME_H);
        this.scout = cat;
        this.moveScout(this.stepsTaken);
      },
    });
  }

  /** Walks the cat to wait beside plank `n` — or back to the first, briskly. */
  private moveScout(n: number, back = false): void {
    const cat = this.scout;
    if (!cat) return;
    const to = CAT_SPOTS[Math.min(n, CAT_SPOTS.length - 1)];
    const at = this.screenOf(cat);
    // Two quick steps must not leave two walks pulling the cat two ways.
    this.haltScout(cat);
    const dx = to.x - at.x;
    const dy = to.y - at.y;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
    if (back) {
      // It looks round at the splash first.
      audio.play('cat', { volume: 0.4 });
      cat.setFlipX(!cat.flipX);
    }
    // The legs set the pace: ground covered is the paw slide at this size.
    const hAvg = (this.catHeight(at.y) + to.h) / 2;
    const ground = Math.hypot(dx, dy * 1.6);
    const frames = (CAT_FRAME_H / CAT_PAW_SLIDE) * (ground / hAvg);
    const ms = Math.max(350, (frames / CAT_WALK_FPS) * 1000 * (back ? 0.6 : 1));
    this.scoutBusy = true;
    cat.setFlipX(dx < 0);
    cat.play({ key: CAT_WALK_ANIM, frameRate: back ? CAT_WALK_FPS * 1.6 : CAT_WALK_FPS });
    const from = { ...at };
    this.scoutWalk = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      ease: 'Linear',
      onUpdate: (tw) => {
        if (!cat.active) return;
        const v = tw.getValue() ?? 0;
        const x = Phaser.Math.Linear(from.x, to.x, v);
        const y = Phaser.Math.Linear(from.y, to.y, v);
        this.painting.setScreenPosition(cat, x, y);
        cat.setScale(this.catHeight(y) / CAT_FRAME_H);
      },
      onComplete: () => {
        this.scoutWalk = null;
        this.scoutBusy = false;
        if (!cat.active) return;
        cat.stop();
        cat.setFrame(0);
        // It sits and looks back at you, which here means facing left.
        cat.setFlipX(true);
      },
    });
  }

  /** Stops the cat where it stands, mid-stride or not. */
  private haltScout(cat: Phaser.GameObjects.Sprite): void {
    this.scoutWalk?.stop();
    this.scoutWalk = null;
    this.scoutBusy = false;
    if (!cat.active) return;
    cat.stop();
    cat.setFrame(0);
  }

  /** Where a painting child is on screen. */
  private screenOf(obj: Phaser.GameObjects.Components.Transform): { x: number; y: number } {
    return { x: obj.x + Layout.width / 2, y: obj.y + Layout.height / 2 };
  }

  /** The cat sees who is sitting there and gets back into the bag. */
  private recallScout(then: () => void): void {
    const cat = this.scout;
    if (!cat) {
      then();
      return;
    }
    this.scout = null;
    const wasWalking = this.scoutBusy;
    this.haltScout(cat);
    const at = this.screenOf(cat);
    this.prompt.flash(velns.wade.catBack, 2600);
    audio.play('cat', { volume: 0.5 });
    this.time.delayedCall(wasWalking ? 500 : 250, () => {
      cat.destroy();
      this.bagUi.fly('item-cat', at.x, at.y - 40);
      this.time.delayedCall(450, () => {
        this.bagUi.setAway('cat', false);
        this.time.delayedCall(900, then);
      });
    });
  }

  // --- the talk -------------------------------------------------------------

  private greet(): void {
    this.phase = 'talk';
    this.portrait.show();
    const lines = bag.has('cat') ? [...velns.greet.slice(0, 1), velns.catNoticed, ...velns.greet.slice(1)] : velns.greet;
    this.narration.say(lines, () => this.askRiddle());
  }

  /** What opens doors without hands? The bog answers first, for anyone looking. */
  private askRiddle(): void {
    this.gust();
    this.narration.ask(velns.riddle, [
      { label: velns.riddleChoices.thief, onPick: () => this.answerFirst(false) },
      { label: velns.riddleChoices.wind, onPick: () => this.answerFirst(true) },
      { label: velns.riddleChoices.bear, onPick: () => this.answerFirst(false) },
    ]);
  }

  /** A gust across the bog: mist racing, lights pushed, the reeds bending. */
  private gust(): void {
    this.air.gust(8, 2600);
    audio.play('gust');
    audio.bedLevel(1.35, 400);
    this.time.delayedCall(1200, () => audio.bedLevel(1, 1600));
    this.wind = attachWind(this.painting.root, { amp: 0, horizon: 0.5, ground: 1.05 });
    const wind = this.wind;
    if (!wind) return;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2600,
      onUpdate: (tw) => {
        wind.amp = 0.0055 * Math.sin(Math.PI * (tw.getValue() ?? 0));
      },
      onComplete: () => {
        this.painting.root.resetPostPipeline();
        this.wind = null;
      },
    });
  }

  private answerFirst(correct: boolean): void {
    if (correct) {
      this.riddleRight = true;
      this.narration.say([velns.riddleRight], () => {
        this.narration.ask(velns.askBack.lead, [
          {
            label: velns.askBack.ask,
            onPick: () => {
              this.quick = true;
              this.devilFlinch();
              this.narration.say([velns.askBack.riddle, velns.askBack.stumped], () => this.speakTerms());
            },
          },
          { label: velns.askBack.skip, onPick: () => this.speakTerms() },
        ]);
      });
      return;
    }
    this.devilLaugh();
    this.narration.say([velns.riddleWrong], () => {
      this.narration.ask(velns.riddle2, [
        { label: velns.riddle2Choices.horse, onPick: () => this.answerSecond(false) },
        { label: velns.riddle2Choices.hawk, onPick: () => this.answerSecond(false) },
        { label: velns.riddle2Choices.thought, onPick: () => this.answerSecond(true) },
      ]);
    });
  }

  private answerSecond(correct: boolean): void {
    this.riddleRight = correct;
    if (!correct) this.devilLaugh();
    this.narration.say([correct ? velns.riddle2Right : velns.riddle2Wrong], () => this.speakTerms());
  }

  private devilLaugh(): void {
    this.tweens.add({ targets: this.devil, y: this.devil.y - 10, duration: 90, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
  }

  private devilFlinch(): void {
    this.tweens.add({ targets: this.devil, x: this.devil.x + 14, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
  }

  /**
   * The terms, and the night begins on the same breath: he is building before
   * he has finished the sentence, and the bag is already the thing to reach for.
   */
  private speakTerms(): void {
    this.beginNight();
    this.narration.say(velns.terms, () => {
      this.narration.hide();
      this.prompt.show(velns.night.prompt);
    });
  }

  // --- the night ------------------------------------------------------------

  private beginNight(): void {
    this.phase = 'night';
    const every = this.quick ? NIGHT.quickEveryMs : NIGHT.everyMs;

    this.nightTimers.push(
      this.time.addEvent({
        delay: every,
        repeat: NIGHT.planks - 1,
        startAt: every - 900,
        callback: () => this.layPlank(),
      }),
      this.time.addEvent({ delay: NIGHT.listAfterMs, callback: () => this.listBargain() }),
      this.time.addEvent({ delay: NIGHT.dawnFromMs, callback: () => this.greyDawn() }),
      this.time.addEvent({ delay: NIGHT.cockMs, callback: () => this.offer('dawn') }),
    );

    // The sky, slowly. Drawn over the painting's sky and nothing else.
    const g = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0);
    g.fillGradientStyle(0xaeb9c6, 0xb8c0cc, 0x3c4450, 0x3c4450, 1, 1, 0, 0);
    g.fillRect(0, 0, Layout.width, 470);
    this.dawn = g;
  }

  private stopNight(): void {
    this.nightTimers.forEach((t) => t.remove(false));
    this.nightTimers = [];
    this.bridgeSpot?.setEnabled(false);
  }

  /** One more plank, dropped into place with a knock and a ring on the water. */
  private layPlank(fast = false): void {
    const i = this.built.length;
    if (i >= NIGHT.planks) return;
    const b = BRIDGE[i];
    const img = this.painting.add(
      this.add
        .image(b.x, b.y - (fast ? 14 : 36), 'fx-plank')
        .setTint(BOG_TINT)
        .setAngle(4 + (i % 2 ? -2 : 2))
        .setAlpha(0),
    );
    img.setScale(b.w / img.width, (b.w * 0.17) / img.height);
    this.built.push(img);
    this.tweens.add({
      targets: img,
      y: img.y + (fast ? 14 : 36),
      alpha: 1,
      duration: fast ? 160 : 420,
      ease: fast ? 'Quad.easeIn' : 'Bounce.easeOut',
      onComplete: () => {
        audio.play('tally', { volume: fast ? 0.2 : 0.35, rate: 0.7 + i * 0.02 });
        if (!fast) this.ripple(b.x, b.y + 8, b.w);
      },
    });
    // He works with his hands: a small gesture each time.
    if (!fast) this.tweens.add({ targets: this.devil, angle: this.devil.angle - 3, duration: 160, yoyo: true, ease: 'Sine.easeInOut' });

    if (i === 0 && this.phase === 'night') this.addBridgeSpot();
    if (i === NIGHT.planks - 1 && this.phase === 'night') this.prompt.flash(velns.night.built, 2800);
  }

  private ripple(x: number, y: number, w: number): void {
    const ring = this.painting.add(this.add.graphics().setPosition(x, y));
    const k = { r: 0 };
    this.tweens.add({
      targets: k,
      r: 1,
      duration: 900,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(2, 0xc9d3da, 0.45 * (1 - k.r));
        ring.strokeEllipse(0, 0, w * (0.8 + 0.6 * k.r), 10 + 22 * k.r);
      },
      onComplete: () => ring.destroy(),
    });
  }

  /** Stepping onto the new bridge yourself — asked, not assumed. */
  private addBridgeSpot(): void {
    this.bridgeSpot = new Hotspot(this, {
      id: 'bridge',
      x: BRIDGE_SPOT.x,
      y: BRIDGE_SPOT.y,
      w: BRIDGE_SPOT.w,
      h: BRIDGE_SPOT.h,
      label: velns.night.bridgeLabel,
      guard: () => !this.bagUi.holding,
      onClick: () => {
        if (this.phase !== 'night') return;
        this.narration.ask(velns.night.stepAsk, [
          { label: velns.night.stepYes, onPick: () => this.offer('self') },
          { label: velns.night.stepNo, onPick: () => this.narration.hide() },
        ]);
      },
    });
    this.spots.push(this.bridgeSpot);
  }

  /** The first grey in the east, and the frogs falling quiet. */
  private greyDawn(): void {
    if (this.phase !== 'night' || this.greyed || !this.dawn) return;
    this.greyed = true;
    if (!this.narration.busy) this.prompt.flash(velns.night.greying, 3000);
    const rest = NIGHT.cockMs - NIGHT.dawnFromMs;
    this.tweens.add({ targets: this.dawn, alpha: 0.42, duration: rest, ease: 'Sine.easeIn' });
    // The frogs fall quiet over the same half-minute.
    audio.bedLevel(0.35, rest);
  }

  /** The bargain as a list of sentences — the fallback, not the first offer. */
  private listBargain(): void {
    if (this.phase !== 'night' || this.listedBargain || this.narration.busy) return;
    this.listedBargain = true;
    this.prompt.hide(250);
    const choices: Choice[] = [];
    if (bag.has('cat')) choices.push({ label: velns.choices.cat, onPick: () => this.offer('cat') });
    if (bag.has('bread')) choices.push({ label: velns.choices.bread, onPick: () => this.offer('bread') });
    choices.push({ label: velns.choices.self, onPick: () => this.offer('self') });
    this.narration.ask(velns.question, choices);
  }

  /** Settles the bargain — from the bag, the list, the bridge, or the cocks. */
  private offer(pick: VelnsPick): void {
    if (this.phase !== 'night') return;
    this.phase = 'resolved';
    this.stopNight();
    this.prompt.hide(250);
    if ((pick === 'cat' || pick === 'bread') && this.bagUi.holding === pick) {
      this.bagUi.consumeHeld();
    } else {
      this.bagUi.putBack();
      if (pick === 'cat' || pick === 'bread') bag.remove(pick);
    }
    this.resolve(pick);
  }

  // --- the outcome ------------------------------------------------------------

  private resolve(pick: VelnsPick): void {
    const run = state.get();
    const loaf: Loaf = loafFrom(run.jumisPick);
    const outcome = velnsOutcome(pick, this.riddleRight, loaf);
    const misses = velnsMisses(pick, this.riddleRight, loaf);
    const gone = devilGone(pick, loaf);
    const good = outcome === 'good';

    // Commit now, in the same moment the offering left the bag.
    state.patch({ velns: outcome, velnsPick: pick, catLost: catLost(pick), devilGone: gone });
    if (pick === 'cat') lore.unlock('velnaTilts');

    const o = velns.outcomes;
    const fumbled = !this.riddleRight;
    const lines =
      pick === 'self'
        ? o.self
        : pick === 'dawn'
          ? o.dawn
          : pick === 'cat'
            ? fumbled
              ? o.catFumbled
              : o.cat
            : loaf === 'jumis'
              ? o.breadJumis
              : loaf === 'thin'
                ? o.breadPoor
                : fumbled
                  ? o.breadGoodFumbled
                  : o.breadGood;

    this.narration.dismiss();

    // The cock is written into the last line of the winning bread outcomes and
    // the first of the dawn; the sound lands on the sentence.
    const crowsOnLast = lines === o.breadGood || lines === o.breadGoodFumbled || lines === o.breadJumis;
    const head = crowsOnLast ? lines.slice(0, -1) : [...lines];
    const tail = crowsOnLast ? lines.slice(-1) : [];

    const r = gone ? reckoning.velns.gone : good ? reckoning.velns.good : reckoning.velns.poor;
    const keptCat = pick !== 'cat' && bag.has('cat');
    // Answered as an equal and paid in full: he leaves his hat.
    const respect = good && this.riddleRight;
    let gain = keptCat ? joinLoc(r.gain, reckoning.velns.catKept) : r.gain;
    if (respect) gain = joinLoc(gain, reckoning.velns.hatKept);

    const reckon = () => {
      this.narration.hide();
      new Reckoning(this, {
        sign: 'crossing',
        good,
        verdict: r.verdict,
        gain,
        missed: this.missedLine(misses),
        cost: good && pick === 'cat' ? reckoning.velns.catCost : null,
        onDone: () => goTo(this, 'Village'),
      });
    };
    const finish = () => (respect ? this.leaveHat(reckon) : reckon());

    const crow = () => {
      audio.play('cock');
      lore.unlock('gailis');
    };

    const play = () =>
      this.narration.say(head, () => {
        if (!tail.length) return finish();
        crow();
        if (good) this.devilLeaves();
        this.narration.say(tail, finish);
      });

    switch (pick) {
      case 'cat':
        this.finishBridge(() => this.walkCat(() => {
          this.devilLeaves(-1);
          play();
        }));
        break;
      case 'bread':
        this.throwBread(loaf !== 'thin', () => {
          if (loaf === 'thin') play();
          else this.finishBridge(play);
        });
        break;
      case 'self':
        this.tweens.add({
          targets: this.devil,
          y: this.devil.y - 26,
          scaleY: this.devil.scaleY * 1.04,
          duration: 180,
          ease: 'Back.easeOut',
          onComplete: () => this.time.delayedCall(400, play),
        });
        break;
      case 'dawn':
        crow();
        if (this.dawn) {
          this.tweens.killTweensOf(this.dawn);
          this.tweens.add({ targets: this.dawn, alpha: 0.55, duration: 900 });
        }
        // The crow, then he shrugs and goes — on the line that says so.
        this.time.delayedCall(700, () =>
          this.narration.say(lines.slice(0, 1), () => {
            this.devilLeaves();
            this.sinkPlanks();
            this.narration.say(lines.slice(1), finish);
          }),
        );
        break;
    }
  }

  /**
   * The hat, set down on the planks where he sat, and into the bag. Said while
   * it happens, so the gift is seen before the verdict card covers the bog.
   */
  private leaveHat(then: () => void): void {
    const from = { x: VELNS_POS.x - 20, y: VELNS_POS.y - 360 };
    const rest = { x: 1170, y: 628 };
    const hat = this.painting.add(this.add.image(from.x, from.y, 'item-hat').setTint(BOG_TINT).setAlpha(0));
    hat.setScale(96 / hat.width);
    this.tweens.add({ targets: hat, alpha: 1, duration: 300 });
    this.tweens.add({
      targets: hat,
      x: rest.x - Layout.width / 2,
      y: rest.y - Layout.height / 2,
      angle: -14,
      duration: 900,
      ease: 'Quad.easeIn',
      onComplete: () => audio.play('bag', { volume: 0.3 }),
    });
    this.narration.say([velns.hat], () => {
      this.narration.hide();
      hat.destroy();
      this.bagUi.fly('item-hat', rest.x, rest.y);
      bag.add('hat');
      this.time.delayedCall(700, then);
    });
  }

  /** Whatever is still missing goes down in one breath: a kept bargain. */
  private finishBridge(then: () => void): void {
    const left = NIGHT.planks - this.built.length;
    for (let k = 0; k < left; k++) this.time.delayedCall(k * 110, () => this.layPlank(true));
    this.time.delayedCall(left * 110 + 450, then);
  }

  /** An unpaid bridge does not last till morning. */
  private sinkPlanks(): void {
    this.built.forEach((img, i) => {
      this.tweens.add({
        targets: img,
        y: img.y + 14 + i * 2,
        angle: img.angle + Phaser.Math.Between(-9, 9),
        alpha: 0.18,
        duration: 2600,
        delay: 300 + (this.built.length - i) * 180,
        ease: 'Sine.easeIn',
      });
    });
  }

  /** He gets up and goes into the bog. */
  private devilLeaves(dir = 1): void {
    this.tweens.add({
      targets: this.devil,
      alpha: 0,
      x: this.devil.x + 70 * dir,
      duration: 1600,
      ease: 'Sine.easeIn',
    });
  }

  /** The cat walks the new bridge, unhurried, and away. */
  private walkCat(done: () => void): void {
    audio.play('cat');
    const { from, to } = CAT_CROSS;
    this.bagUi.flyOut('item-cat', from.x, from.y - 40, {
      size: 90,
      onLanded: () => {
        const cat = this.painting.add(this.add.sprite(from.x, from.y, 'cat-walk').setOrigin(0.5, 1).setTint(BOG_TINT));
        cat.setFlipX(true);
        cat.play(CAT_WALK_ANIM);
        cat.setScale(from.h / CAT_FRAME_H);
        const hAvg = (from.h + to.h) / 2;
        const ground = Math.hypot(to.x - from.x, (to.y - from.y) * 1.6);
        const ms = ((CAT_FRAME_H / CAT_PAW_SLIDE) * (ground / hAvg) / CAT_WALK_FPS) * 1000;
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: ms,
          ease: 'Linear',
          onUpdate: (tw) => {
            const v = tw.progress;
            const y = Phaser.Math.Linear(from.y, to.y, v);
            this.painting.setScreenPosition(cat, Phaser.Math.Linear(from.x, to.x, v), y);
            cat.setScale(Phaser.Math.Linear(from.h, to.h, v) / CAT_FRAME_H);
            cat.setAlpha(v < 0.8 ? 1 : (1 - v) / 0.2);
          },
          onComplete: () => {
            cat.destroy();
            done();
          },
        });
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
        loaf.setScale(s * (1 - 0.3 * v));
        loaf.setAngle(v * 320);
      },
      onComplete: () => {
        if (good) {
          this.tweens.add({ targets: loaf, y: loaf.y - 8, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
          // He leaps up: "bread is not living!"
          this.tweens.add({ targets: this.devil, y: this.devil.y - 30, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
        } else {
          this.cameras.main.shake(160, 0.004);
        }
        this.time.delayedCall(650, done);
      },
    });
  }

  /**
   * What the player should have done, naming every reason that applies — a
   * bridge lost two ways at once gets both reasons.
   */
  private missedLine(misses: VelnsMiss[]): Loc | null {
    if (!misses.length) return null;
    const poor = reckoning.velns.poor;
    const why: Record<VelnsMiss, Loc> = {
      riddle: poor.missedRiddle,
      self: poor.missedSelf,
      bread: poor.missedBread,
      dawn: poor.missedDawn,
    };
    return joinLoc(...misses.map((m) => why[m]), misses.length > 1 ? poor.thenWholeBoth : poor.thenWhole);
  }
}
