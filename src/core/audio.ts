import Phaser from 'phaser';
import { flags } from './flags';

/**
 * The game's one sound object.
 *
 * Design notes:
 *   - Scenes never touch `this.sound` directly. They say `audio.play('click')`
 *     and this decides volume, whether the player has muted, and whether the
 *     browser has let us make a noise yet.
 *   - There is exactly ONE ambient channel. Every scene asks for its bed on
 *     create and this cross-fades from whatever was playing, so walking from
 *     the village to the bog is a change of weather rather than a hard cut.
 *   - Browsers refuse to start audio before a real user gesture. Phaser hands
 *     us a locked sound manager in that case; `unlock()` is called from the
 *     first click the game receives and everything queued before then is
 *     simply dropped rather than throwing.
 *   - `?fx=off` silences this too. It already means "no ambient motion", and a
 *     playtest run that is visually quiet should be actually quiet.
 */

/** Every cue in the game, with the volume it wants relative to the others. */
const CUES = {
  click: { key: 'sfx_click', volume: 0.45 },
  hover: { key: 'sfx_hover', volume: 0.16 },
  sickle: { key: 'sfx_sickle', volume: 0.8 },
  bag: { key: 'sfx_bag', volume: 0.5 },
  bagOpen: { key: 'sfx_bag_open', volume: 0.38 },
  bagClose: { key: 'sfx_bag_close', volume: 0.34 },
  carve1: { key: 'sfx_carve1', volume: 0.55 },
  carve2: { key: 'sfx_carve2', volume: 0.55 },
  carve3: { key: 'sfx_carve3', volume: 0.55 },
  cat: { key: 'sfx_cat', volume: 0.55 },
  cock: { key: 'sfx_cock', volume: 0.6 },
  tally: { key: 'sfx_tally', volume: 0.6 },
} as const;

export type Cue = keyof typeof CUES;

/** Ambient beds. Absent files are tolerated — see `ambient()`. */
const BEDS = {
  village: { key: 'amb_village', volume: 0.3 },
  field: { key: 'amb_field', volume: 0.3 },
  bog: { key: 'amb_bog', volume: 0.34 },
} as const;

export type Bed = keyof typeof BEDS;

const STORAGE_KEY = 'vecasvaras.muted';
const CARVES: Cue[] = ['carve1', 'carve2', 'carve3'];

type Listener = (muted: boolean) => void;

class Audio {
  private game: Phaser.Game | null = null;
  private _muted = false;
  private listeners = new Set<Listener>();
  private current: Phaser.Sound.BaseSound | null = null;
  private currentBed: Bed | null = null;
  /** Set once a real gesture has reached us; before that, playing is a no-op. */
  private unlocked = false;
  /** A bed asked for while still locked, replayed the moment we unlock. */
  private pending: Bed | null = null;
  private carveIndex = 0;

  /** Called once from `main.ts` after the game exists. */
  attach(game: Phaser.Game): void {
    this.game = game;
    try {
      this._muted = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      /* private browsing — default to audible */
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  get enabled(): boolean {
    return flags.fx && this.game !== null;
  }

  /**
   * The first user gesture. Phaser's own unlock handling fires on its sound
   * manager, but the bed a scene asked for during `create()` is already lost by
   * then, so we keep it and start it here.
   */
  unlock(): void {
    if (this.unlocked || !this.game) return;
    this.unlocked = true;
    const bed = this.pending;
    this.pending = null;
    if (bed) this.ambient(bed);
  }

  play(cue: Cue, opts: { volume?: number; rate?: number } = {}): void {
    if (!this.enabled || this._muted || !this.unlocked) return;
    const def = CUES[cue];
    const mgr = this.game!.sound;
    // A cue whose file is not in the build is skipped, not thrown. The beds
    // are still being sourced and the game has to run without them.
    if (!this.game!.cache.audio.exists(def.key)) return;
    // Slight random detune so a sound that fires dozens of times — the click,
    // the carve — does not read as the same sample over and over.
    const rate = opts.rate ?? Phaser.Math.FloatBetween(0.94, 1.06);
    mgr.play(def.key, { volume: opts.volume ?? def.volume, rate });
  }

  /** Next carve stroke. Cycling beats random: no repeats back to back. */
  carve(): void {
    this.play(CARVES[this.carveIndex % CARVES.length]);
    this.carveIndex++;
  }

  /**
   * Cross-fade the ambient channel to `bed`. Calling it with the bed that is
   * already playing does nothing, so re-entering the village does not restart
   * the birdsong from the top.
   */
  ambient(bed: Bed | null, fade = 900): void {
    if (!this.enabled) return;
    if (!this.unlocked) {
      this.pending = bed;
      return;
    }
    if (bed === this.currentBed) return;
    this.currentBed = bed;

    const old = this.current;
    if (old) {
      // Tween the old bed out and destroy it, so beds never pile up.
      this.fadeSound(old, 0, fade, () => old.destroy());
    }
    this.current = null;
    if (!bed) return;

    const def = BEDS[bed];
    if (!this.game!.cache.audio.exists(def.key)) return; // bed not sourced yet
    const snd = this.game!.sound.add(def.key, { loop: true, volume: 0 });
    snd.play();
    this.current = snd;
    if (!this._muted) this.fadeSound(snd, def.volume, fade);
  }

  setMuted(v: boolean): void {
    if (this._muted === v) return;
    this._muted = v;
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.current && this.currentBed) {
      const target = v ? 0 : BEDS[this.currentBed].volume;
      this.fadeSound(this.current, target, 260);
    }
    this.listeners.forEach((fn) => fn(v));
  }

  toggleMute(): void {
    this.setMuted(!this._muted);
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Volume tweens have to run on a scene's tween manager, and the scene that
   * started a bed is usually gone by the time it fades out — so the tween goes
   * on whichever scene is alive now, and falls back to setting the value flat.
   */
  private fadeSound(
    snd: Phaser.Sound.BaseSound,
    to: number,
    duration: number,
    onDone?: () => void,
  ): void {
    const scene = this.game?.scene.getScenes(true)[0];
    const holder = snd as unknown as { volume: number };
    if (!scene) {
      holder.volume = to;
      onDone?.();
      return;
    }
    scene.tweens.add({
      targets: holder,
      volume: to,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => onDone?.(),
    });
  }
}

export const audio = new Audio();

/**
 * Queues every sound that is not already in the cache. Mirrors `queueMissing`
 * in `scenes/assets.ts`: returns how many were queued so the caller can skip
 * starting a loader with nothing in it.
 *
 * Audio rides along with the art during the title screen. It must never gate
 * the menu: a missing or slow sound file should cost you the sound, not the
 * game.
 */
export function queueAudio(scene: Phaser.Scene): number {
  if (!flags.fx) return 0;
  const all = [...Object.values(CUES), ...Object.values(BEDS)];
  let queued = 0;
  for (const { key } of all) {
    if (scene.cache.audio.exists(key)) continue;
    scene.load.audio(key, [`audio/${key}.ogg`, `audio/${key}.m4a`]);
    queued++;
  }
  return queued;
}
