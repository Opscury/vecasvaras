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
  /**
   * A panel is covering the world (the history, the book, the map, the
   * settings); nothing under it may act. Set through `setModal`, never directly.
   */
  modal: boolean;
  /** Which panels are open — so closing one of two does not uncover the world. */
  overlays: Set<object>;
  /** The bag's tray is open, so the number keys belong to it. */
  bagOpen: boolean;
  /** Something is in hand, so Enter means "use it here". */
  holding: boolean;
  /** Screen position of the keyboard-focused hotspot, if any. */
  focus: { x: number; y: number } | null;
  /** How many full-screen cards are up. The corner furniture stands down above zero. */
  cards: number;
}

/** Fired on the scene when the last card goes up or comes down. */
export const CARD = 'vv-card';

/** Fired on the scene when the first panel opens over the world or the last one closes. */
export const MODAL = 'vv-modal';

/**
 * A panel has opened over the world, or closed.
 *
 * The world under it is not only deaf to keys: anything in it that runs on a
 * clock the player is racing — the night at the bog — has to stop while they
 * are reading, or the book about the Devil's bridge costs them the bridge.
 */
export function setModal(scene: Phaser.Scene, owner: object, on: boolean): void {
  const k = keysOf(scene);
  const was = k.modal;
  if (on) k.overlays.add(owner);
  else k.overlays.delete(owner);
  k.modal = k.overlays.size > 0;
  if (k.modal !== was) scene.events.emit(MODAL, k.modal);
}

/**
 * A full-screen card — a verse, a verdict — has appeared or gone.
 *
 * The strip along the top is the village's standing, and while a card is up
 * the village is not what is being said. Counted rather than set, so two cards
 * overlapping by a frame cannot leave the furniture hidden for good.
 */
export function setCard(scene: Phaser.Scene, on: boolean): void {
  const k = keysOf(scene);
  k.cards = Math.max(0, k.cards + (on ? 1 : -1));
  scene.events.emit(CARD, k.cards > 0);
}

const byScene = new WeakMap<Phaser.Scene, SceneKeys>();

export function keysOf(scene: Phaser.Scene): SceneKeys {
  let k = byScene.get(scene);
  if (!k) {
    k = { modal: false, overlays: new Set(), bagOpen: false, holding: false, focus: null, cards: 0 };
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
