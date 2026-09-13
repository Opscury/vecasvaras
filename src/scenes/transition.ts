import Phaser from 'phaser';
import { Palette, Timing } from '../core/theme';

/** The ink ground every fade passes through. */
const INK = Phaser.Display.Color.IntegerToRGB(Palette.ink);

const leaving = new WeakSet<Phaser.Scene>();

/** Fades the scene up out of the ink ground. */
export function fadeIn(scene: Phaser.Scene, duration: number = Timing.fade): void {
  scene.cameras.main.fadeIn(duration, INK.r, INK.g, INK.b);
}

/**
 * Fades to ink and starts `key`.
 *
 * Safe to call more than once: a double-click on Begin, or a second hotspot
 * clicked while the frame is already going dark, is ignored instead of
 * queueing the next scene to start twice.
 */
export function goTo(scene: Phaser.Scene, key: string): void {
  if (leaving.has(scene)) return;
  leaving.add(scene);
  // Phaser reuses scene instances, so the flag has to come off on the way out
  // or the next visit to this scene could never leave.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => leaving.delete(scene));
  const cam = scene.cameras.main;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key));
  // `fade` is fadeOut with a force flag. Forced, because a fade-out requested
  // while the fade-in is still running is otherwise dropped — and then the
  // completion event above never comes.
  cam.fade(Timing.fade, INK.r, INK.g, INK.b, true);
}

/** True once `goTo` has been called and the scene is on its way out. */
export const isLeaving = (scene: Phaser.Scene): boolean => leaving.has(scene);
