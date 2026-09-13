import Phaser from 'phaser';

/**
 * Shared keyboard state for one scene.
 *
 * Several components listen to the same keydown — the narration panel, the
 * hotspot focus, the bag, the history panel, the full-screen cards — and each
 * one acting on it independently is how a single Enter both dismisses a line
 * and opens the next door. This is how they agree who took a key, without
 * importing one another.
 */
export interface SceneKeys {
  /** A panel is covering the world (the history); nothing under it may act. */
  modal: boolean;
  /** The bag's tray is open, so the number keys belong to it. */
  bagOpen: boolean;
  /** Something is in hand, so Enter means "use it here". */
  holding: boolean;
  /** Screen position of the keyboard-focused hotspot, if any. */
  focus: { x: number; y: number } | null;
}

const byScene = new WeakMap<Phaser.Scene, SceneKeys>();

export function keysOf(scene: Phaser.Scene): SceneKeys {
  let k = byScene.get(scene);
  if (!k) {
    k = { modal: false, bagOpen: false, holding: false, focus: null };
    byScene.set(scene, k);
    // Scene instances are reused, so the state has to be dropped on the way out.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => byScene.delete(scene));
  }
  return k;
}

const handled = new WeakSet<KeyboardEvent>();

/** Claims a key event, so listeners later in the chain leave it alone. */
export const markHandled = (ev: KeyboardEvent): void => {
  handled.add(ev);
};

export const wasHandled = (ev: KeyboardEvent): boolean => handled.has(ev);

/** Space and Enter do what a click does. */
export const isAdvanceKey = (ev: KeyboardEvent): boolean => ev.key === ' ' || ev.key === 'Enter';

/** The common opening check for any key listener that acts on the world. */
export const ignoreKey = (scene: Phaser.Scene, ev: KeyboardEvent): boolean =>
  ev.repeat || wasHandled(ev) || keysOf(scene).modal;
