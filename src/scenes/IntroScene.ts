import { applyGrade } from '../fx/GradePipeline';
import Phaser from 'phaser';
import { intro } from '../content/script';
import { state } from '../core/state';
import { Layout, Palette, Timing } from '../core/theme';
import { Narration } from '../ui/Narration';
import { Chrome } from '../ui/Chrome';
import { Atmosphere } from '../fx/Atmosphere';
import { ignoreKey, markHandled } from '../ui/keys';
import { fadeIn, goTo, isLeaving } from './transition';
import { SCENE_NEEDS } from './assets';
import { StreamScene } from './StreamScene';
import { CHIMNEYS } from './villageArt';
import { audio } from '../core/audio';

/** Opening narration over a slow push into the village. */
export class IntroScene extends Phaser.Scene {
  private narration!: Narration;
  private bg!: Phaser.GameObjects.Image;
  private handingOver = false;

  constructor() {
    super('Intro');
  }

  create(): void {
    // One ambient channel for the whole game; this cross-fades from whatever
    // the last scene was playing.
    audio.ambient('village');

    const { width, height } = Layout;
    this.cameras.main.setBackgroundColor(Palette.ink);
    fadeIn(this, Timing.fade * 2);

    this.handingOver = false;
    const bg = this.add.image(width / 2, height / 2, 'bg-village').setDisplaySize(width, height);
    this.bg = bg;
    applyGrade(bg);
    bg.setScale(bg.scaleX * 1.06, bg.scaleY * 1.06).setAlpha(0.82);

    // A single slow settle into the village over the narration, plus enough
    // weather to stop the opening reading as a title card with text on it.
    this.tweens.add({
      targets: bg,
      scaleX: bg.scaleX * 0.98,
      scaleY: bg.scaleY * 0.98,
      alpha: 1,
      duration: 14000,
      ease: 'Sine.easeInOut',
    });

    const air = new Atmosphere(this).fog({
      band: 0.2,
      height: 300,
      tint: 0xd8e2e8,
      alpha: 0.24,
      speed: 75000,
      layers: 2,
    });
    CHIMNEYS.forEach((c, i) => air.smoke(c.x, c.y, { scale: 0.5, rate: 760 + i * 140 }));
    air
      .motes({ tint: 0xffeecc, count: 26, driftX: 16, scale: 0.15, alpha: 0.55, band: [0.35, 0.9] })
      .birds({ band: [0.07, 0.2], every: [9000, 17000] });

    // Space and Enter are handled by the narration panel itself.
    this.narration = new Narration(this);
    new Chrome(this, { log: () => this.narration.history });

    this.input.on('pointerdown', () => this.narration.advance());

    // There used to be a Skip control down here. The first playtester read it
    // as a third thing competing with the text and the Next button, and could
    // not tell what it would skip. Escape still does it for anyone impatient
    // with a keyboard; nothing on screen offers it.
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ignoreKey(this, ev) || ev.key !== 'Escape') return;
      markHandled(ev);
      this.leave();
    });

    this.narration.say(intro.lines, () => this.leave());
  }

  private leave(): void {
    state.set('introSeen', true);
    this.narration.dismiss();
    if (this.handingOver || isLeaving(this)) return;
    // The intro is already standing in the village. Inking the frame black
    // and opening it again on the very same painting was a fade to nowhere,
    // so the picture settles where the village draws it and the village takes
    // over without a cut — unless its people are not loaded yet, when the
    // ink (and its loading line) is still the honest way across.
    const needs = SCENE_NEEDS.Village ?? [];
    if (!StreamScene.get(this).has(needs)) {
      goTo(this, 'Village');
      return;
    }
    this.handingOver = true;
    const { width, height } = Layout;
    const sx = width / this.bg.width;
    const sy = height / this.bg.height;
    this.tweens.killTweensOf(this.bg);
    this.tweens.add({
      targets: this.bg,
      scaleX: sx,
      scaleY: sy,
      alpha: 1,
      duration: 650,
      ease: 'Sine.easeInOut',
      onComplete: () => this.scene.start('Village', { seamless: true }),
    });
  }
}
