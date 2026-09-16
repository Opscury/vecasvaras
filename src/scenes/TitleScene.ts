import Phaser from 'phaser';
import { t, i18n } from '../core/i18n';
import { ui } from '../content/script';
import { state } from '../core/state';
import { bag } from '../core/inventory';
import { Hex, Fonts, Layout, Palette, Compact, px, scaled } from '../core/theme';
import { Chrome } from '../ui/Chrome';
import { Atmosphere } from '../fx/Atmosphere';
import { padHit } from '../ui/hit';
import { ignoreKey, isAdvanceKey, markHandled } from '../ui/keys';
import { goTo, isLeaving } from './transition';
import {
  GAME_ASSETS,
  GAME_SHEETS,
  defineAnims,
  missingFrom,
  queueMissing,
  queueMissingSheets,
  reportLoadErrors,
} from './assets';
import { audio, queueAudio } from '../core/audio';

/**
 * The menu sits above every atmospheric layer. Without this the fog sheets
 * (depth 8+, SCREEN blend) and the drifting motes (depth 60) were drawn over
 * the title and washed it out to almost nothing against the pale sky — the
 * dark wash meant to back the text was underneath the very mist it was there
 * to cut through. Chrome is at 900, so the menu goes between.
 */
const MENU_DEPTH = 300;

export class TitleScene extends Phaser.Scene {
  /** The rest of the art has arrived. Begin waits for it. */
  private ready = false;
  /** Begin was pressed before the art arrived; go as soon as it does. */
  private wantBegin = false;
  private start!: Phaser.GameObjects.Text;
  /**
   * The slow breath on Begin while the art is still coming, and nothing else.
   * Held by reference because it must be stopped WITHOUT touching the menu's
   * fade-in — see `fetched`.
   */
  private pulse: Phaser.Tweens.Tween | null = null;
  private errorText: Phaser.GameObjects.Text | null = null;
  private retryText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Title');
  }

  create(): void {
    // One ambient channel for the whole game; this cross-fades from whatever
    // the last scene was playing.
    audio.ambient('village');

    this.ready = false;
    this.wantBegin = false;
    this.pulse = null;
    this.errorText = null;
    this.retryText = null;

    const { width, height } = Layout;
    const bg = this.add.image(width / 2, height / 2, 'bg-title').setDisplaySize(width, height);

    // The menu is the first thing anyone sees, and a still menu says "slideshow"
    // before a single line of the game has been read. Mist rolling through the
    // spruces at two speeds, a slow push toward the stone, and the odd bird.
    new Atmosphere(this)
      .drift(bg, { scale: 1.035, duration: 52000, x: -12 })
      .fog({ band: 0.66, height: 380, tint: 0xdfe7ec, alpha: 0.34, speed: 60000, layers: 3 })
      .fog({ band: 0.34, height: 300, tint: 0xcfdae2, alpha: 0.22, speed: 90000, layers: 2 })
      .motes({ tint: 0xe4eef4, count: 34, driftX: 16, scale: 0.17, alpha: 0.55, band: [0.3, 0.92] })
      .birds({ band: [0.07, 0.2], every: [8000, 18000], tint: 0x23282c })
      .breathe({ amount: 0.05, duration: 26000 });

    // A soft dark wash that ramps in from the middle, so the title reads over
    // the forest without a visible seam cutting across the painting.
    const wash = this.add.graphics().setDepth(MENU_DEPTH);
    wash.fillGradientStyle(Palette.ink, Palette.ink, Palette.ink, Palette.ink, 0, 0.78, 0, 0.78);
    wash.fillRect(width * 0.3, 0, width * 0.7, height);

    const titleX = width * 0.72;

    const title = this.add
      .text(titleX, height * 0.36, 'VECĀS VARAS', {
        fontFamily: Fonts.display,
        fontSize: Compact ? '112px' : '96px',
        color: Hex.parchment,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(MENU_DEPTH + 1);
    title.setLetterSpacing?.(10);
    // The sky behind the right-hand third is the brightest thing in the
    // painting. A soft shadow under the serifs keeps the edges from dissolving
    // into it wherever the mist happens to thin out.
    title.setShadow(0, 4, '#0b0d10', 18, false, true);

    const rule = this.add.graphics().setDepth(MENU_DEPTH + 1);
    rule.lineStyle(2, Palette.rye, 0.8);
    rule.lineBetween(titleX - 200, height * 0.36 + 76, titleX + 200, height * 0.36 + 76);
    rule.setAlpha(0);

    const sub = this.add
      .text(titleX, height * 0.36 + 116, t(ui.subtitle), {
        fontFamily: Fonts.body,
        fontSize: px(26),
        color: Hex.parchmentDim,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(MENU_DEPTH + 1);

    // Only a run in progress offers Continue and Start over. A finished year
    // is not something to continue: after the ending, the way on is the next
    // year, and the stone keeps the last one.
    const run = state.get();
    const hasRun = run.introSeen && !run.outroSeen;
    const startLabel = hasRun ? ui.resume : run.outroSeen ? ui.nextYear : ui.begin;

    const start = this.add
      .text(titleX, height * 0.62, t(startLabel), {
        fontFamily: Fonts.body,
        fontSize: px(34),
        color: Hex.rye,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(MENU_DEPTH + 1);
    this.start = start;
    const placeStart = padHit(start, 360, 64);

    let restart: Phaser.GameObjects.Text | null = null;
    let placeRestart: (() => void) | null = null;
    if (hasRun) {
      restart = this.add
        .text(titleX, height * 0.62 + scaled(70), t(ui.restart), {
          fontFamily: Fonts.body,
          fontSize: px(22),
          color: Hex.parchmentDim,
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(MENU_DEPTH + 1);
      placeRestart = padHit(restart, 360, 56);
    }

    // The menu, as a list the keyboard can walk: arrows or Tab move, Enter or
    // Space picks. The pointer and the keyboard share one highlight.
    const menu: Array<{ txt: Phaser.GameObjects.Text; idle: string; lit: string; act: () => void }> = [
      { txt: start, idle: Hex.rye, lit: Hex.ryeBright, act: () => this.begin() },
    ];
    if (restart) {
      menu.push({
        txt: restart,
        idle: Hex.parchmentDim,
        lit: Hex.parchment,
        act: () => {
          // Not while Continue is already fading the menu out.
          if (isLeaving(this)) return;
          state.reset();
          this.scene.restart();
        },
      });
    }
    let focus = -1;
    const paint = () => menu.forEach((m, i) => m.txt.setColor(i === focus ? m.lit : m.idle));
    menu.forEach((m, i) => {
      m.txt.on('pointerover', () => {
        focus = i;
        paint();
      });
      m.txt.on('pointerout', () => {
        focus = -1;
        paint();
      });
      m.txt.on('pointerdown', () => m.act());
    });
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ignoreKey(this, ev)) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Tab') {
        ev.preventDefault();
        const dir = ev.key === 'ArrowUp' || (ev.key === 'Tab' && ev.shiftKey) ? -1 : 1;
        focus = focus === -1 ? 0 : (focus + dir + menu.length) % menu.length;
        paint();
        markHandled(ev);
      } else if (isAdvanceKey(ev)) {
        markHandled(ev);
        menu[Math.max(0, focus)].act();
      }
    });

    const targets = [title, rule, sub, start, ...(restart ? [restart] : [])];
    this.tweens.add({ targets, alpha: 1, duration: 900, delay: 250, ease: 'Sine.easeOut' });

    new Chrome(this);

    const off = i18n.onChange(() => {
      sub.setText(t(ui.subtitle));
      start.setText(t(startLabel));
      placeStart();
      restart?.setText(t(ui.restart));
      placeRestart?.();
      this.errorText?.setText(t(ui.loadFailed));
      this.retryText?.setText(t(ui.retry));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);

    reportLoadErrors(this);
    this.fetchRest();
  }

  /** Pulls in the rest of the art behind the menu. Instant on a revisit. */
  private fetchRest(): void {
    this.hideLoadError();
    // Sound is queued with the art, never before the menu: it must not gate play.
    const sounds = queueAudio(this);
    const art = queueMissing(this, GAME_ASSETS) + queueMissingSheets(this, GAME_SHEETS);
    if (!art && !sounds) {
      this.fetched();
      return;
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.fetched());
    this.load.start();
  }

  private fetched(): void {
    const missing = [...missingFrom(this, GAME_ASSETS), ...missingFrom(this, GAME_SHEETS)];
    if (missing.length) {
      this.showLoadError(missing);
      return;
    }
    defineAnims(this);
    this.ready = true;
    // Stop the waiting-breath, and ONLY that.
    //
    // This used to be `killTweensOf(this.start)`, which was a much bigger
    // hammer than it looked: the menu fades in on a single tween whose targets
    // are the title, the rule, the subtitle and this button together, so
    // killing every tween on the button killed the fade for all four. The
    // button was then set to alpha 1 by hand and the other three were simply
    // abandoned at whatever alpha they had reached. How much of the title you
    // saw depended on a race — how long the art took against a 250ms delay and
    // a 900ms fade. Cold cache: a faint title. Warm cache: `fetched` beat the
    // delay, the fade never started, and the title, rule and subtitle stayed
    // at alpha 0 over a menu that otherwise looked finished.
    if (this.pulse) {
      this.pulse.remove();
      this.pulse = null;
      // Only now does the button need putting right by hand; the pulse left it
      // mid-breath. With no pulse the shared fade is still running and must be
      // left alone to finish.
      this.start.setAlpha(1);
    }
    if (this.wantBegin) this.begin();
  }

  private showLoadError(missing: string[]): void {
    const { width, height } = Layout;
    const x = width * 0.72;
    console.warn('[Vecās Varas] missing art:', missing.join(', '));
    this.errorText = this.add
      .text(x, height * 0.84, t(ui.loadFailed), {
        fontFamily: Fonts.body,
        fontSize: px(22),
        color: Hex.parchment,
      })
      .setOrigin(0.5)
      .setDepth(MENU_DEPTH + 1);
    this.retryText = this.add
      .text(x, height * 0.84 + scaled(50), t(ui.retry), {
        fontFamily: Fonts.body,
        fontSize: px(24),
        color: Hex.rye,
      })
      .setOrigin(0.5)
      .setDepth(MENU_DEPTH + 1);
    padHit(this.retryText, 320, 64);
    this.retryText.on('pointerdown', () => this.fetchRest());
  }

  private hideLoadError(): void {
    this.errorText?.destroy();
    this.retryText?.destroy();
    this.errorText = null;
    this.retryText = null;
  }

  private begin(): void {
    if (isLeaving(this)) return;
    if (!this.ready) {
      // The art is still coming. Say so by breathing the button, and go the
      // moment it lands rather than making the player press again.
      if (!this.wantBegin) {
        this.wantBegin = true;
        this.pulse = this.tweens.add({
          targets: this.start,
          alpha: 0.45,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
      return;
    }
    // After the ending, the way on is the next year, not a walk back into the old one.
    if (state.get().outroSeen) state.nextYear();
    goTo(this, this.resumeTarget());
  }

  /**
   * Where Continue puts the player. An encounter is resumed from its opening
   * card — nobody wants to come back mid-riddle — and only while it is still
   * unresolved and the player still carries what it takes to be there.
   */
  private resumeTarget(): string {
    const run = state.get();
    if (!run.introSeen) return 'Intro';
    if (run.scene === 'Jumis' && run.jumis === 'none' && bag.has('sickle')) return 'Jumis';
    if (run.scene === 'Velns' && run.velns === 'none' && bag.has('bread')) return 'Velns';
    return 'Village';
  }
}
