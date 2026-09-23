import Phaser from 'phaser';
import { Palette, Timing } from '../core/theme';
import { flags } from '../core/flags';
import { inkOff, inkOn } from '../fx/InkPipeline';
import { SCENE_NEEDS } from './assets';
import { StreamScene } from './StreamScene';

/** The ink ground every fade passes through. */
const INK = Phaser.Display.Color.IntegerToRGB(Palette.ink);

/**
 * How long the ink takes. Longer than the old fade on purpose — it has
 * somewhere to go, from the edges in — but the way in is quicker than the way
 * out, so leaving a place never feels like waiting.
 */
const INK_IN = 520;
const INK_OUT = 700;

const leaving = new WeakSet<Phaser.Scene>();
/** The ink tween running on each scene, so the way out can take over from the way in. */
const running = new WeakMap<Phaser.Scene, Phaser.Tweens.Tween>();

/**
 * Brings the scene up out of the ink: the middle of the picture clears first
 * and the edges last. Falls back to a camera fade on Canvas or with `?fx=off`.
 */
export function fadeIn(scene: Phaser.Scene, duration: number = Timing.fade): void {
  let ink: ReturnType<typeof inkOn> = null;
  try {
    ink = flags.fx ? inkOn(scene) : null;
  } catch {
    ink = null;
  }
  if (!ink) {
    scene.cameras.main.fadeIn(duration, INK.r, INK.g, INK.b);
    return;
  }
  ink.reseed();
  ink.progress = 1;
  const k = { v: 1 };
  running.get(scene)?.stop();
  const tw = scene.tweens.add({
    targets: k,
    v: 0,
    duration: Math.max(INK_OUT, duration * 1.4),
    ease: 'Sine.easeOut',
    onUpdate: () => {
      ink.progress = k.v;
    },
    onComplete: () => {
      // Only if nothing has started inking the frame out again meanwhile.
      if (!leaving.has(scene)) inkOff(scene);
    },
  });
  running.set(scene, tw);
}

/**
 * Inks the frame over and starts `key`.
 *
 * Safe to call more than once: a double-click on Begin, or a second hotspot
 * clicked while the frame is already going dark, is ignored instead of
 * queueing the next scene to start twice.
 */
export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  if (leaving.has(scene)) return;
  leaving.add(scene);
  // The next scene's art may still be streaming. The frame inks over as usual
  // and, if it has to, waits there under a loading line until the art is in.
  const needs = SCENE_NEEDS[key] ?? [];
  const stream = StreamScene.get(scene);
  // Ask now, not once the ink is down, so the group jumps the queue at once.
  let arrived = false;
  let covered = false;
  const start = () => scene.scene.start(key, data);
  if (needs.length) {
    stream.whenReady(needs, () => {
      arrived = true;
      if (covered) start();
    });
  } else {
    arrived = true;
  }
  const whenCovered = () => {
    covered = true;
    if (arrived) start();
  };
  // Phaser reuses scene instances, so the flag has to come off on the way out
  // or the next visit to this scene could never leave.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    leaving.delete(scene);
    inkOff(scene);
  });

  // If the ink pass cannot be built on this GPU, fall back to the plain fade
  // rather than throw — a throw here used to leave the scene marked as
  // leaving, so every later tap on Begin was ignored as a double-click.
  let ink: ReturnType<typeof inkOn> = null;
  if (flags.fx) {
    try {
      ink = inkOn(scene);
    } catch (err) {
      console.warn('[Vecās Varas] ink transition unavailable, using a fade:', err);
      ink = null;
    }
  }
  if (!ink) {
    const cam = scene.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, whenCovered);
    // Forced, because a fade-out requested while the fade-in is still running
    // is otherwise dropped — and then the completion event never comes.
    cam.fade(Timing.fade, INK.r, INK.g, INK.b, true);
    return;
  }

  // Whatever the ink was doing — still clearing from the way in — it turns
  // round from where it is rather than jumping.
  running.get(scene)?.stop();
  // A fresh pattern only if the frame is clear; mid-reveal it would jump.
  if (ink.progress <= 0) ink.reseed();
  const k = { v: ink.progress };
  const tw = scene.tweens.add({
    targets: k,
    v: 1,
    duration: INK_IN * (1 - k.v * 0.6),
    ease: 'Sine.easeIn',
    onUpdate: () => {
      ink.progress = k.v;
    },
    onComplete: whenCovered,
  });
  running.set(scene, tw);
}

/** True once `goTo` has been called and the scene is on its way out. */
export const isLeaving = (scene: Phaser.Scene): boolean => leaving.has(scene);
