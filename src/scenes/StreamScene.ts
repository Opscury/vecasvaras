import Phaser from 'phaser';
import { audio, queueAudio } from '../core/audio';
import { t } from '../core/i18n';
import { ui } from '../content/script';
import { Fonts, Hex, Layout, Palette, px, scaled } from '../core/theme';
import {
  ART_GROUPS,
  ART_ORDER,
  ART_SHEETS,
  type ArtGroup,
  defineAnims,
  missingFrom,
  queueMissing,
  queueMissingSheets,
  reportLoadErrors,
} from './assets';

/** How many times a group that came back incomplete is fetched again on its own. */
const AUTO_RETRIES = 2;

type Waiter = { groups: readonly ArtGroup[]; go: () => void };

/**
 * Streams the game's art in the background, a group at a time, and then its
 * sound. It outlives every other scene — a scene's own loader dies with it —
 * draws nothing unless someone is waiting, and takes no input unless it is
 * offering a retry.
 *
 * Why groups: Begin used to wait for every picture in the game, 10 MB of it
 * before WebP and 4 MB after, which on mobile data was the better part of a
 * minute. Now a scene waits only for its own group; the rest arrives while the
 * player is busy. If a player outruns the stream — walks to the bog while the
 * bog is still coming — `whenReady` holds them under the ink with a percentage,
 * and asks for that group next.
 */
export class StreamScene extends Phaser.Scene {
  static readonly KEY = 'Stream';

  private done = new Set<ArtGroup>();
  private failed = new Set<ArtGroup>();
  private tries = new Map<ArtGroup, number>();
  private queue: ArtGroup[] = [...ART_ORDER];
  private current: ArtGroup | null = null;
  private soundStarted = false;
  private waiters: Waiter[] = [];
  /** Set at the top of `create`. Not `sys.isActive()`: that is still false *during* create. */
  private running = false;

  private overlay: Phaser.GameObjects.Container | null = null;
  private label: Phaser.GameObjects.Text | null = null;
  private bar: Phaser.GameObjects.Graphics | null = null;
  private retry: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(StreamScene.KEY);
  }

  /** The running streamer, launched on first use. */
  static get(from: Phaser.Scene): StreamScene {
    const plugin = from.scene;
    if (!plugin.isActive(StreamScene.KEY)) plugin.launch(StreamScene.KEY);
    return plugin.get(StreamScene.KEY) as StreamScene;
  }

  create(): void {
    this.running = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Stopped mid-download, the sound starts again next time (it skips
      // whatever already arrived).
      if (this.soundStarted && !this.current && this.load.isLoading()) this.soundStarted = false;
      this.running = false;
      this.current = null;
      this.hideWaiting();
    });
    this.input.enabled = false;
    reportLoadErrors(this);
    // Already-cached groups (a revisit, or Boot got there first) count as done.
    for (const g of ART_ORDER) if (this.complete(g)) this.done.add(g);
    // After a stop mid-load the loader was reset: whatever was in flight goes
    // back in the queue, in the usual order.
    this.queue = [...this.queue, ...ART_ORDER.filter((g) => !this.done.has(g) && !this.queue.includes(g))];
    // Anyone who asked before this scene was running.
    const early = this.waiters;
    this.waiters = [];
    early.forEach((w) => this.whenReady(w.groups, w.go));
    this.pump();
  }

  /** True once every group in `groups` has arrived. */
  has(groups: readonly ArtGroup[]): boolean {
    return groups.every((g) => this.done.has(g) || this.complete(g));
  }

  /**
   * Calls `go` once `groups` are in — at once if they already are. While it
   * waits, a loading line is drawn over whatever is on screen (the ink, as a
   * rule), and the groups asked for jump the queue.
   */
  whenReady(groups: readonly ArtGroup[], go: () => void): void {
    // Launched but not created yet (it starts on the next step): hold the
    // request, and `create` picks it up.
    if (!this.running) {
      this.waiters.push({ groups, go });
      return;
    }
    if (this.has(groups)) {
      go();
      return;
    }
    this.waiters.push({ groups, go });
    // What someone is standing waiting for comes before what nobody is.
    const wanted = groups.filter((g) => !this.done.has(g) && g !== this.current);
    this.queue = [...wanted, ...this.queue.filter((g) => !wanted.includes(g))];
    for (const g of groups) {
      if (this.failed.has(g)) {
        this.failed.delete(g);
        this.queue.unshift(g);
      }
    }
    this.showWaiting();
    this.pump();
  }

  /** How far along the current group is, 0–1, for anyone who wants to show it. */
  get progress(): number {
    return this.current ? this.load.progress : 1;
  }

  // ---------------------------------------------------------------------------

  private complete(g: ArtGroup): boolean {
    return missingFrom(this, ART_GROUPS[g]).length === 0 && missingFrom(this, ART_SHEETS[g]).length === 0;
  }

  private pump(): void {
    if (this.current || this.load.isLoading()) return;
    const next = this.queue.find((g) => !this.done.has(g) && !this.failed.has(g));
    if (!next) {
      this.startSound();
      return;
    }
    this.queue = this.queue.filter((g) => g !== next);
    const queued = queueMissing(this, ART_GROUPS[next]) + queueMissingSheets(this, ART_SHEETS[next]);
    if (!queued) {
      this.finished(next);
      return;
    }
    this.current = next;
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.current = null;
      if (this.complete(next)) {
        this.finished(next);
        return;
      }
      const n = (this.tries.get(next) ?? 0) + 1;
      this.tries.set(next, n);
      if (n <= AUTO_RETRIES) {
        this.queue.unshift(next);
      } else {
        console.warn('[Vecās Varas] art group did not load:', next);
        this.failed.add(next);
        if (this.waiters.some((w) => w.groups.includes(next))) this.showFailed();
      }
      this.pump();
    });
    this.load.start();
  }

  private finished(g: ArtGroup): void {
    this.done.add(g);
    if (g === 'bog') defineAnims(this);
    // The village is in, so the player can start. Sound goes next — the
    // village bed and the clicks matter from the first minute — and the field
    // and the bog, which are minutes away yet, follow it.
    const soundNext = g === 'village' && !this.soundStarted;
    this.events.emit('group', g);
    const ready = this.waiters.filter((w) => this.has(w.groups));
    this.waiters = this.waiters.filter((w) => !ready.includes(w));
    if (!this.waiters.length) this.hideWaiting();
    ready.forEach((w) => w.go());
    if (soundNext) this.startSound();
    else this.pump();
  }

  /** Sound never stands between the player and anything: nothing waits on it. */
  private startSound(): void {
    if (this.soundStarted) return;
    this.soundStarted = true;
    // A scene someone is waiting for goes before the sound.
    if (this.waiters.length) {
      this.soundStarted = false;
      this.pump();
      return;
    }
    // The art was queued under `load.setPath('art')`, and the path sticks to
    // the loader: without this reset every sound was fetched from art/audio/,
    // came back as the index page, and failed to decode.
    this.load.setPath('');
    if (!queueAudio(this)) {
      this.pump();
      return;
    }
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => audio.arrived(key));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.pump());
    this.load.start();
  }

  // --- the waiting line ------------------------------------------------------

  update(): void {
    if (!this.label || this.retry) return;
    const v = this.current ? this.load.progress : 0;
    this.label.setText(`${t(ui.loading)} ${Math.round(v * 100)}%`);
    const w = scaled(260);
    this.bar!.clear();
    this.bar!.fillStyle(Palette.timber, 0.5);
    this.bar!.fillRect(-w / 2, scaled(30), w, 3);
    this.bar!.fillStyle(Palette.rye, 1);
    this.bar!.fillRect(-w / 2, scaled(30), w * v, 3);
  }

  private showWaiting(): void {
    if (this.overlay) return;
    const { width, height } = Layout;
    this.scene.bringToTop();
    this.label = this.add
      .text(0, 0, '', { fontFamily: Fonts.body, fontSize: px(22), color: Hex.parchmentDim })
      .setOrigin(0.5);
    this.bar = this.add.graphics();
    this.overlay = this.add.container(width / 2, height * 0.5, [this.label, this.bar]).setAlpha(0);
    // Not for a quick wait: most waits are a second or two and a flash of text
    // would be noise over the ink.
    this.tweens.add({ targets: this.overlay, alpha: 1, duration: 300, delay: 400 });
  }

  private showFailed(): void {
    if (!this.overlay) this.showWaiting();
    this.overlay!.setAlpha(1);
    this.label!.setText(t(ui.loadFailed));
    this.bar!.clear();
    this.retry = this.add
      .text(0, scaled(70), t(ui.retry), { fontFamily: Fonts.body, fontSize: px(26), color: Hex.rye })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.overlay!.add(this.retry);
    this.input.enabled = true;
    this.retry.on('pointerdown', () => {
      this.retry?.destroy();
      this.retry = null;
      this.input.enabled = false;
      for (const g of this.failed) {
        this.tries.set(g, 0);
        this.queue.unshift(g);
      }
      this.failed.clear();
      this.pump();
    });
  }

  private hideWaiting(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.label = null;
    this.bar = null;
    this.retry = null;
    this.input.enabled = false;
  }
}
