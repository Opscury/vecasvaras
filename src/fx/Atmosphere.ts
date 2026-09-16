import Phaser from 'phaser';
import { Layout } from '../core/theme';
import { ensureFxTextures } from './textures';
import { flags } from '../core/flags';

/**
 * Ambient life for single-screen painted scenes.
 *
 * The whole game is still images, which is a deliberate constraint — no walk
 * cycles means no character-consistency problem. The cost of that constraint is
 * that a still image reads as a slide unless something in it moves. None of
 * these effects touch the painting itself; they sit over and under it, at
 * speeds slow enough that you notice the scene is alive without noticing why.
 *
 * Rules of thumb used throughout:
 *   - Nothing moves fast. If the eye can track it, it is too quick.
 *   - Layers move at different speeds, or the parallax reads as a single sheet.
 *   - Anything warm and bright gets used sparingly; it pulls focus hard.
 */
export class Atmosphere {
  private scene: Phaser.Scene;
  private objects = new Set<Phaser.GameObjects.GameObject>();
  /** Anything that is not a game object but still has to come down with the scene. */
  private teardown: Array<() => void> = [];
  /** Multiplier on how fast the mist moves; a gust raises it for a moment. */
  private windFactor = 1;
  /** The bog lights, so a gust can push them. */
  private wispList: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!flags.fx) return;
    ensureFxTextures(scene);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /**
   * A very slow push or pull on the background. Two or three percent over half
   * a minute — invisible as motion, but the frame stops feeling dead.
   *
   * Hand it the scene's `Painting` group rather than the bare background image
   * whenever anything is set into the painting, or the painting slides out
   * from under it.
   */
  drift(
    target: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
    opts: { scale?: number; duration?: number; x?: number; y?: number } = {},
  ): this {
    if (!flags.fx) return this;
    const { scale = 1.045, duration = 30000, x = 0, y = 0 } = opts;
    const sx = target.scaleX;
    const sy = target.scaleY;
    const ox = target.x;
    const oy = target.y;
    // A pan needs cover. At the far end of the drift the image sits (x, y) off
    // centre, so it must still be scaled up enough to fill the frame there, or
    // a strip of bare ground shows along the opposite edge.
    const cover = 1 + Math.max((2 * Math.abs(x)) / Layout.width, (2 * Math.abs(y)) / Layout.height);
    const from = Math.max(scale, cover);
    // Start slightly in so the drift has somewhere to go in both directions.
    target.setScale(sx * from, sy * from);
    this.scene.tweens.add({
      targets: target,
      scaleX: sx * cover,
      scaleY: sy * cover,
      x: ox + x,
      y: oy + y,
      duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    return this;
  }

  /**
   * Drifting sheets of mist. `band` is the vertical centre as a fraction of the
   * screen; `tint` should be sampled from the painting's own haze, not white.
   */
  fog(opts: {
    band: number;
    height?: number;
    tint?: number;
    alpha?: number;
    speed?: number;
    layers?: number;
    depth?: number;
  }): this {
    if (!flags.fx) return this;
    const {
      band,
      height = 340,
      tint = 0xdfe6ea,
      alpha = 0.16,
      speed = 90000,
      layers = 3,
      depth = 8,
    } = opts;
    const keys = ['fx-fog-a', 'fx-fog-b', 'fx-fog-c'];

    for (let i = 0; i < layers; i++) {
      // Each sheet is twice screen width so it can scroll a full screen and
      // wrap without a visible seam.
      const y = Layout.height * band + (i - (layers - 1) / 2) * height * 0.28;
      // The tile sprite is created at the texture's own height and then scaled
      // to the height we want. Creating it taller would tile vertically, which
      // repeats the feathered edge and puts the seam straight back.
      const TEX_H = 320;
      const img = this.scene.add
        .tileSprite(Layout.width / 2, y, Layout.width, TEX_H, keys[i % keys.length])
        .setTint(tint)
        .setAlpha(alpha * (1 - i * 0.18))
        .setDepth(depth + i)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      img.setScale(1, height / TEX_H);

      // Layers drift at different rates and directions — parallax is the whole
      // trick; matched speeds read as one flat sheet sliding.
      //
      // `speed` is HOW LONG ONE FULL SCREEN WIDTH OF DRIFT TAKES, in ms. Say
      // that out loud when changing it: at 110000 a wisp of mist crosses the
      // frame in just under two minutes, which is what fog does. An earlier
      // version multiplied by dt AND by 60, which made the same number mean
      // roughly 1500px a second and turned the title screen into a wind tunnel.
      const dir = i % 2 === 0 ? 1 : -1;
      const pxPerMs = (Layout.width / (speed * (0.7 + i * 0.35))) * dir;
      // Scene events outlive the scene's objects — Phaser does not clear them on
      // shutdown — so this listener has to be taken down by hand, or every visit
      // leaves another one scrolling a destroyed sprite for the rest of the game.
      const scroll = (_t: number, dt: number) => {
        img.tilePositionX += pxPerMs * dt * this.windFactor;
      };
      this.scene.events.on(Phaser.Scenes.Events.UPDATE, scroll);
      this.teardown.push(() => this.scene.events.off(Phaser.Scenes.Events.UPDATE, scroll));

      // Breathe the opacity so the mist thickens and thins — but only by a
      // third. Halving it meant the fog spent half its time barely there.
      this.scene.tweens.add({
        targets: img,
        alpha: img.alpha * 0.68,
        duration: 12000 + i * 4300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.objects.add(img);
    }
    return this;
  }

  /**
   * Fine dust, pollen or chaff hanging in the air. Emits across the whole
   * frame, drifts on a light diagonal, and never quite goes away.
   */
  motes(opts: {
    tint?: number;
    count?: number;
    alpha?: number;
    driftX?: number;
    scale?: number;
    depth?: number;
    band?: [number, number];
  } = {}): this {
    if (!flags.fx) return this;
    const {
      tint = 0xfff3d6,
      count = 26,
      alpha = 0.5,
      driftX = 14,
      scale = 0.055,
      depth = 60,
      band = [0.15, 0.95],
    } = opts;

    const em = this.scene.add.particles(0, 0, 'fx-blob', {
      x: { min: -80, max: Layout.width + 80 },
      y: { min: Layout.height * band[0], max: Layout.height * band[1] },
      lifespan: { min: 9000, max: 17000 },
      speedX: { min: driftX * 0.4, max: driftX },
      speedY: { min: -7, max: 5 },
      scale: { min: scale * 0.45, max: scale },
      // Fade up and back down across the particle's life — nothing should pop
      // into or out of existence. It has to be `{ values }`: a bare array is
      // Phaser's "pick one at random" form, which gave every mote one fixed
      // opacity for its whole life, a quarter of them zero.
      alpha: { values: [0, alpha, alpha * 0.8, 0] },
      tint,
      quantity: 1,
      frequency: 380,
      maxAliveParticles: count,
      // Normal blending, not SCREEN: screened onto bright rye or pale ground a
      // pale speck adds almost nothing, and measured it changed 0% of pixels —
      // the motes were there and nobody could see them.
    });
    em.setDepth(depth);
    this.objects.add(em);
    return this;
  }

  /**
   * A chimney. Slow, thin, cool-grey, leaning with the wind and thinning out
   * before it reaches the treeline. This is the single most effective thing you
   * can add to a painting of a village — smoke means somebody is home.
   */
  smoke(x: number, y: number, opts: { scale?: number; tint?: number; rate?: number } = {}): this {
    this.chimney(x, y, opts);
    return this;
  }

  /**
   * The same chimney, returned so a scene can turn it up or down: a village
   * with bread in the granary smokes more than one without.
   */
  chimney(
    x: number,
    y: number,
    opts: { scale?: number; tint?: number; rate?: number } = {},
  ): { setLevel: (level: 0 | 1 | 2 | 3) => void } | null {
    if (!flags.fx) return null;
    const { scale = 0.5, tint = 0xcfd4d6, rate = 620 } = opts;

    const em = this.scene.add.particles(x, y, 'fx-blob', {
      lifespan: 8600,
      speedY: { min: -16, max: -28 },
      speedX: { min: 3, max: 17 },
      // Grows as it rises and disperses.
      scale: { start: scale * 0.2, end: scale * 1.85, ease: 'Sine.easeOut' },
      // Swells quickly out of the chimney, then thins out over a long tail.
      // (`{ values }` to interpolate over the particle's life; see `motes`.)
      alpha: { values: [0, 0.52, 0.34, 0.12, 0] },
      tint,
      quantity: 1,
      frequency: rate,
      maxAliveParticles: 22,
      accelerationX: 5,
    });
    em.setDepth(12);
    this.objects.add(em);
    const base = rate;
    return {
      /** 0 cold, 1 a thin thread, 2 a lived-in chimney, 3 a busy one. */
      setLevel: (level) => {
        if (!em.active) return;
        if (level === 0) {
          em.stop();
          return;
        }
        if (!em.emitting) em.start();
        em.frequency = level === 1 ? base * 2.6 : level === 2 ? base : base * 0.66;
        em.setAlpha(level === 1 ? 0.55 : 1);
      },
    };
  }

  /**
   * Birds crossing the sky every so often, in loose ones and twos. Rare on
   * purpose — the point is that the player catches one out of the corner of
   * their eye, not that the sky is busy.
   */
  birds(opts: { band?: [number, number]; every?: [number, number]; tint?: number } = {}): this {
    if (!flags.fx) return this;
    const { band = [0.08, 0.3], every = [7000, 16000], tint = 0x2a2f33 } = opts;
    const scene = this.scene;

    const launch = () => {
      const n = Phaser.Math.Between(1, 3);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const baseY = Phaser.Math.FloatBetween(band[0], band[1]) * Layout.height;

      for (let i = 0; i < n; i++) {
        const s = Phaser.Math.FloatBetween(0.28, 0.46);
        const y = baseY + Phaser.Math.Between(-40, 40);
        const startX = dir > 0 ? -70 : Layout.width + 70;
        const bird = scene.add
          .image(startX, y, 'fx-bird')
          .setTint(tint)
          .setScale(s * dir, s)
          .setAlpha(0.55)
          .setDepth(6);
        this.objects.add(bird);

        // Wingbeat: squashing the sprite vertically is enough at this size.
        const flap = scene.tweens.add({
          targets: bird,
          scaleY: s * 0.45,
          duration: Phaser.Math.Between(220, 300),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        scene.tweens.add({
          targets: bird,
          x: dir > 0 ? Layout.width + 90 : -90,
          y: y + Phaser.Math.Between(-60, 60),
          duration: Phaser.Math.Between(11000, 17000),
          delay: i * Phaser.Math.Between(300, 900),
          ease: 'Sine.easeInOut',
          onComplete: () => {
            flap.stop();
            this.objects.delete(bird);
            bird.destroy();
          },
        });
      }
      scene.time.delayedCall(Phaser.Math.Between(every[0], every[1]), launch);
    };

    scene.time.delayedCall(Phaser.Math.Between(1200, 4000), launch);
    return this;
  }

  /**
   * Bog lights — the little flames folk tales put over standing water, and
   * the reason anybody in these stories is out on a bog after dark at all.
   * Warm, small, and they wander: they should look like they are deciding
   * where to go.
   */
  wisps(opts: { count?: number; band?: [number, number]; tint?: number } = {}): this {
    if (!flags.fx) return this;
    const { count = 5, band = [0.42, 0.72], tint = 0xffcf7a } = opts;
    const scene = this.scene;

    for (let i = 0; i < count; i++) {
      const w = scene.add
        .image(
          Phaser.Math.Between(120, Layout.width - 120),
          Phaser.Math.FloatBetween(band[0], band[1]) * Layout.height,
          'fx-blob',
        )
        .setTint(tint)
        .setAlpha(0)
        .setScale(Phaser.Math.FloatBetween(0.1, 0.2))
        .setDepth(14)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      this.objects.add(w);
      this.wispList.push(w);

      const wander = () => {
        if (!w.active) return;
        scene.tweens.add({
          targets: w,
          x: Phaser.Math.Clamp(w.x + Phaser.Math.Between(-180, 180), 80, Layout.width - 80),
          y: Phaser.Math.Clamp(
            w.y + Phaser.Math.Between(-70, 70),
            Layout.height * band[0],
            Layout.height * band[1],
          ),
          duration: Phaser.Math.Between(5000, 9000),
          ease: 'Sine.easeInOut',
          onComplete: wander,
        });
      };

      // Each one breathes on its own clock, so they never pulse in unison.
      scene.tweens.add({
        targets: w,
        alpha: Phaser.Math.FloatBetween(0.22, 0.5),
        duration: Phaser.Math.Between(2600, 5200),
        delay: Phaser.Math.Between(0, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.time.delayedCall(Phaser.Math.Between(0, 3000), wander);
    }
    return this;
  }

  /**
   * A slow swell of light across the whole frame — clouds passing over the sun
   * you cannot see. Very low amplitude; it should never be catchable.
   */
  breathe(opts: { amount?: number; duration?: number; tint?: number } = {}): this {
    if (!flags.fx) return this;
    const { amount = 0.07, duration = 21000, tint = 0x0d1014 } = opts;
    const veil = this.scene.add
      .rectangle(Layout.width / 2, Layout.height / 2, Layout.width, Layout.height, tint, amount)
      .setDepth(5);
    // Tween the fill, not the object: the constructor set fillAlpha to
    // `amount`, so tweening `alpha` multiplied the two and the swing went to
    // amount² × 0.15 — a wider dark swing than asked for, worst on the bog.
    this.scene.tweens.add({
      targets: veil,
      fillAlpha: amount * 0.15,
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.objects.add(veil);
    return this;
  }

  /**
   * A gust: the mist races for a moment and the lights are pushed along with
   * it. Used when the Devil asks what opens doors without hands — the bog
   * answers before the player does.
   */
  gust(strength = 9, duration = 2400): this {
    if (!flags.fx) return this;
    const holder = { v: 0 };
    this.scene.tweens.add({
      targets: holder,
      v: 1,
      duration,
      ease: 'Linear',
      onUpdate: () => {
        this.windFactor = 1 + (strength - 1) * Math.sin(Math.PI * holder.v);
      },
      onComplete: () => {
        this.windFactor = 1;
      },
    });
    for (const w of this.wispList) {
      if (!w.active) continue;
      this.scene.tweens.add({
        targets: w,
        x: Phaser.Math.Clamp(w.x + Phaser.Math.Between(90, 200), 80, Layout.width - 80),
        duration: duration * 0.6,
        ease: 'Sine.easeOut',
      });
    }
    return this;
  }

  private destroy(): void {
    this.teardown.forEach((fn) => fn());
    this.teardown = [];
    this.objects.forEach((o) => o.destroy());
    this.objects.clear();
  }
}
