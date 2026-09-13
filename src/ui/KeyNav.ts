import Phaser from 'phaser';
import { Hotspot, hotspotsIn } from './Hotspot';
import { ignoreKey, keysOf, markHandled } from './keys';

/**
 * A keyboard path to everything in the world.
 *
 * Tab and Shift+Tab walk the scene's live hotspots in the order the scene made
 * them, drawing the focused one's ring as if hovered; Enter uses it, Escape
 * lets go. With the bag (B, the number keys, Enter to use what is in hand) and
 * the narration (Space/Enter, number keys for choices), the whole game can be
 * finished without a mouse.
 */
export class KeyNav {
  private scene: Phaser.Scene;
  private focus: Hotspot | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    if (!kb) return;
    // Otherwise Tab moves the browser's focus off the canvas.
    kb.addCapture([Phaser.Input.Keyboard.KeyCodes.TAB]);
    kb.on('keydown', this.onKey, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off('keydown', this.onKey, this));
  }

  private onKey(ev: KeyboardEvent): void {
    if (ignoreKey(this.scene, ev)) return;
    if (ev.key === 'Tab') {
      ev.preventDefault();
      this.step(ev.shiftKey ? -1 : 1);
      markHandled(ev);
    } else if (ev.key === 'Enter' && this.focus?.live && !keysOf(this.scene).holding) {
      if (this.focus.activate()) markHandled(ev);
    } else if (ev.key === 'Escape' && this.focus) {
      this.setFocus(null);
      markHandled(ev);
    }
  }

  private step(dir: 1 | -1): void {
    const live = hotspotsIn(this.scene).filter((h) => h.live);
    if (!live.length) {
      this.setFocus(null);
      return;
    }
    const i = this.focus ? live.indexOf(this.focus) : -1;
    const next = i === -1 ? (dir > 0 ? 0 : live.length - 1) : (i + dir + live.length) % live.length;
    this.setFocus(live[next]);
  }

  private setFocus(h: Hotspot | null): void {
    this.focus?.setFocus(false);
    this.focus = h;
    h?.setFocus(true);
    keysOf(this.scene).focus = h ? h.center : null;
  }
}
