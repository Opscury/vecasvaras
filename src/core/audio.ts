import Phaser from 'phaser';
import { flags } from './flags';
import { settings } from './settings';

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
  // Synthesised in tools/build_synth.py — see AUDIO_NOTES.
  frog: { key: 'sfx_frog', volume: 0.42 },
  gust: { key: 'sfx_gust', volume: 0.5 },
  splash: { key: 'sfx_splash', volume: 0.5 },
  sheaf: { key: 'sfx_sheaf', volume: 0.42 },
  chime: { key: 'sfx_chime', volume: 0.4 },
  // The map unrolling. tools/build_paper.py.
  paper: { key: 'sfx_paper', volume: 0.55 },
} as const;

/**
 * Longer pieces that play over a scene rather than on an event: the kokle
 * line under each encounter's verse, and — when someone records them — the
 * verse sung. They go through `music()`, which keeps hold of them so a mute
 * pressed halfway through actually silences them.
 */
const TUNES = {
  kokleJumis: { key: 'mus_kokle_jumis', volume: 0.5 },
  kokleVelns: { key: 'mus_kokle_velns', volume: 0.5 },
  voiceJumis: { key: 'voice_jumis', volume: 0.9 },
  voiceVelns: { key: 'voice_velns', volume: 0.9 },
} as const;

export type Tune = keyof typeof TUNES;

/**
 * Tunes whose files are actually in `public/audio/`. The sung verses need a
 * singer; until there is a recording, their keys stay out of this list so the
 * loader does not ask the server for files that are not there. Drop
 * `voice_jumis.ogg`/`.m4a` into the folder and add `'voiceJumis'` here.
 */
const SHIPPED_TUNES: readonly Tune[] = ['kokleJumis', 'kokleVelns'];

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
  /** Long pieces currently sounding, so mute can reach them. */
  private tunes = new Set<Phaser.Sound.BaseSound>();
  /** Multiplier on the bed's own volume: the dawn thins the frogs, a gust swells the wind. */
  private bedGain = 1;
  /** The bed's level change in progress, if any. */
  private levelTween: Phaser.Tweens.Tween | null = null;

  /** Called once from `main.ts` after the game exists. */
  attach(game: Phaser.Game): void {
    this.game = game;
    // The player's own level, over everything the game plays.
    game.sound.volume = settings.get().volume;
    settings.onChange((s) => {
      game.sound.volume = s.volume;
    });
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

  /**
   * A longer piece — the kokle under a verse, a sung verse. Returns false if it
   * could not play (muted, locked, or not in the build), so a caller can fall
   * back to silence without asking why.
   */
  music(tune: Tune, opts: { volume?: number; delay?: number } = {}): boolean {
    if (!this.enabled || this._muted || !this.unlocked) return false;
    if (!SHIPPED_TUNES.includes(tune)) return false;
    const def = TUNES[tune];
    if (!this.game!.cache.audio.exists(def.key)) return false;
    const snd = this.game!.sound.add(def.key, { volume: opts.volume ?? def.volume });
    this.tunes.add(snd);
    snd.once(Phaser.Sound.Events.COMPLETE, () => {
      this.tunes.delete(snd);
      snd.destroy();
    });
    snd.play({ delay: (opts.delay ?? 0) / 1000 });
    return true;
  }

  /** Fades out everything `music()` started. */
  stopMusic(fade = 600): void {
    this.tunes.forEach((snd) => {
      this.tunes.delete(snd);
      this.fadeSound(snd, 0, fade, () => snd.destroy());
    });
  }

  /**
   * Scales the ambient bed. 1 is the bed's own level; the bog at dawn goes
   * down towards 0.3 as the frogs stop, and a gust of wind briefly goes over 1.
   */
  bedLevel(gain: number, fade = 800): void {
    this.bedGain = gain;
    if (!this.current || !this.currentBed || this._muted) return;
    // One level change at a time: a new one replaces the last rather than
    // racing it for the same volume.
    this.levelTween?.stop();
    this.levelTween = this.fadeSound(this.current, BEDS[this.currentBed].volume * gain, fade);
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
    if (bed === this.currentBed) {
      // Same bed, but a scene that thinned it may have left it thin.
      if (this.bedGain !== 1) this.bedLevel(1, fade);
      return;
    }
    this.currentBed = bed;
    this.bedGain = 1;

    const old = this.current;
    this.levelTween?.stop();
    this.levelTween = null;
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
      const target = v ? 0 : BEDS[this.currentBed].volume * this.bedGain;
      this.fadeSound(this.current, target, 260);
    }
    if (v) this.stopMusic(260);
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
  ): Phaser.Tweens.Tween | null {
    const scene = this.game?.scene.getScenes(true)[0];
    const holder = snd as unknown as { volume: number };
    if (!scene) {
      holder.volume = to;
      onDone?.();
      return null;
    }
    return scene.tweens.add({
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
  const all = [
    ...Object.values(CUES),
    ...Object.values(BEDS),
    ...SHIPPED_TUNES.map((t) => TUNES[t]),
  ];
  let queued = 0;
  for (const { key } of all) {
    if (scene.cache.audio.exists(key)) continue;
    scene.load.audio(key, [`audio/${key}.ogg`, `audio/${key}.m4a`]);
    queued++;
  }
  return queued;
}
