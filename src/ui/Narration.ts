import Phaser from 'phaser';
import { type Loc, t, i18n } from '../core/i18n';
import { Hex, Fonts, Layout, Palette, Timing, px, scaled } from '../core/theme';
import { ui } from '../content/script';
import { audio } from '../core/audio';
import { ignoreKey, isAdvanceKey, keysOf, markHandled } from './keys';
// SPEAKING is declared in Hotspot, which this module already depends on, so
// that the hotspots can listen for it without importing back into here.
import { SPEAKING, setHotspotGate } from './Hotspot';

/**
 * The bottom narration panel: a parchment band that types out a line, waits
 * for a click, and moves on. Also renders the choice list when a beat ends in
 * a decision.
 *
 * Everything it displays is held as a `Loc`, so a language switch mid-sentence
 * re-renders in place rather than losing the player's position.
 *
 * Keyboard: Space or Enter does what a click does, and the number keys pick
 * from a choice list in the order it is shown (unless the bag is open, which
 * then owns them).
 */

export interface Choice {
  label: Loc;
  onPick: () => void;
}

/** How many lines the history keeps. */
const HISTORY_CAP = 30;

export class Narration {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private plate: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  /** The "there is more" control — a real button, not a mark. See `buildNext`. */
  private nextBtn: Phaser.GameObjects.Container;
  private nextLabel: Phaser.GameObjects.Text;
  private nextPulse: Phaser.Tweens.Tween | null = null;
  private nextOn = false;
  private choiceBox: Phaser.GameObjects.Container;
  /** Last value broadcast on SPEAKING, so the event only fires on a change. */
  private spoke = false;

  private queue: Loc[] = [];
  private current: Loc | null = null;
  private onDone: (() => void) | null = null;
  private typer: Phaser.Time.TimerEvent | null = null;
  private typing = false;
  private choices: Choice[] = [];
  /**
   * Whether the panel is *meant* to be visible. Never read `root.alpha` to
   * decide this: alpha is mid-tween most of the time, and a show() that reads
   * an alpha still on its way down concludes the panel is already up, does
   * nothing, and lets the in-flight hide finish — the panel then speaks a whole
   * line invisibly. Reachable in normal play by clicking a hotspot within a
   * quarter second of the panel folding away.
   */
  private wantVisible = false;
  /** The game frame in which the panel last started saying something — see `advance`. */
  private openedFrame = -1;
  /** Where `mutter` is in its rotation. */
  private mutterAt = 0;
  /** The hotspot whose click opened the line on screen, if one did. */
  private speaker: unknown = null;
  /** A hotspot just let through by the gate, and the frame it happened in. */
  private caller: { from: unknown; frame: number } | null = null;
  private offLang: () => void;

  /** Every line shown in this scene, oldest first — read by the history panel. */
  readonly history: Loc[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width, height, panelH, panelPad } = Layout;
    const top = height - panelH;

    // The panel has no hard top edge — a straight black line cutting across a
    // painting is the fastest way to make a game look like a slideshow. Instead
    // the darkness ramps in over ~150px and the painting dissolves into it.
    this.plate = scene.add.graphics();
    this.drawPlate(0);

    this.label = scene.add.text(panelPad, top + scaled(44), '', {
      fontFamily: Fonts.body,
      fontSize: px(34),
      color: Hex.parchment,
      // The measure stops short of the bottom-right corner, where the Next
      // button and the bag live. Text that ran under either was unreadable.
      wordWrap: { width: width - panelPad * 2 - scaled(200) },
      lineSpacing: scaled(12),
    });

    this.nextLabel = scene.add.text(0, 0, '', {
      fontFamily: Fonts.body,
      fontSize: px(25),
      color: Hex.parchment,
    });
    this.nextBtn = this.buildNext();

    this.choiceBox = scene.add.container(0, 0);

    this.root = scene.add.container(0, 0, [this.plate, this.label, this.nextBtn, this.choiceBox]);
    this.root.setDepth(500).setAlpha(0);

    this.offLang = i18n.onChange(() => this.redraw());
    scene.input.keyboard?.on('keydown', this.onKey, this);
    setHotspotGate(scene, (from) => this.claimHotspotClick(from));

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /**
   * True while a run of lines or a decision is under way. Anything said on a
   * timer must check this first: `flash` replaces whatever is up, callback and
   * all, so a timed line landing mid-sequence silently cancels whatever that
   * sequence was going to do next. At the bog, that was the rest of the
   * encounter.
   */
  get busy(): boolean {
    return this.queue.length > 0 || this.onDone !== null || this.choices.length > 0;
  }

  /** True when the panel is folded away with nothing on it. */
  get idle(): boolean {
    return !this.wantVisible;
  }

  /** Play a run of lines, then call `after`. Clicking advances or skips typing. */
  say(lines: Loc[], after?: () => void): void {
    this.clearChoices();
    this.queue = [...lines];
    this.onDone = after ?? null;
    this.markOpened();
    this.show();
    // Say so now, not once the first line has finished typing: the bag stands
    // down for a run of lines, and waiting left it fading out under the Next
    // button just as that appeared.
    this.signal();
    this.next();
  }

  /** Show a decision. Lines are optional lead-in text shown above the options. */
  ask(prompt: Loc | null, choices: Choice[]): void {
    this.clearChoices();
    this.queue = [];
    this.onDone = null;
    this.markOpened();
    this.show();
    if (prompt) {
      this.current = prompt;
      this.renderLine(prompt, false);
    } else {
      this.current = null;
      this.label.setText('');
    }
    this.choices = choices;
    this.buildChoices();
    this.setHint(false);
  }

  /**
   * A single line with no click-through — the reply when the player looks at
   * or tries something. It replaces whatever is showing, pending callback
   * included, so lines on a timer should check `busy` or `idle` first.
   */
  flash(line: Loc): void {
    this.clearChoices();
    this.queue = [];
    this.onDone = null;
    this.markOpened();
    this.show();
    this.current = line;
    this.renderLine(line, false);
    this.setHint(false);
  }

  /**
   * One of a rotation of short asides, for a click on nothing in particular —
   * only when the panel has nothing else to say. In a game whose only verb is
   * "click the picture", silence reads as broken before it reads as "nothing
   * there".
   */
  mutter(lines: readonly Loc[]): void {
    if (!this.idle || !lines.length) return;
    this.flash(lines[this.mutterAt++ % lines.length]);
  }

  hide(): void {
    if (!this.wantVisible) return;
    this.wantVisible = false;
    this.fade(0, 260, 'Quad.easeIn');
  }

  /** Takes everything down — lines, choices, callback — and folds the panel away. */
  dismiss(): void {
    this.clearChoices();
    this.stopTyper();
    this.queue = [];
    this.onDone = null;
    this.current = null;
    this.typing = false;
    this.label.setText('');
    this.setHint(false);
    this.signal();
    this.hide();
  }

  private show(): void {
    if (this.wantVisible) return;
    this.wantVisible = true;
    this.fade(1, Timing.beat, 'Quad.easeOut');
  }

  /** Both directions go through here, killing the other so they never race. */
  private fade(to: number, duration: number, ease: string): void {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, alpha: to, duration, ease });
  }

  /**
   * The dark plate, grown upward by `extra` when a decision needs more room
   * than the panel has — a question and three answers at phone type size.
   */
  private drawPlate(extra: number): void {
    const { width, height, panelH } = Layout;
    const top = height - panelH - extra;
    const rampH = scaled(150);
    this.plate.clear();
    this.plate.fillGradientStyle(Palette.ink, Palette.ink, Palette.ink, Palette.ink, 0, 0, 0.9, 0.9);
    this.plate.fillRect(0, top - rampH, width, rampH);
    this.plate.fillStyle(Palette.ink, 0.9);
    this.plate.fillRect(0, top, width, panelH + extra + 2);
  }

  /** Called by the scene's global click handler. Returns true if it consumed the click. */
  advance(): boolean {
    // The click that opened a line is never also a click on it. Using an item
    // on the world starts the outcome text, and the scene's own click handler
    // may call this on the very same click — which used to skip the first
    // line's typing, or dismiss a one-line reply before it was ever on screen.
    if (this.scene.game.loop.frame === this.openedFrame) return true;
    if (this.choices.length) return false; // choices need a real button press
    if (this.typing) {
      this.finishTyping();
      return true;
    }
    if (this.current || this.queue.length) {
      this.next();
      return true;
    }
    return false;
  }

  private markOpened(): void {
    const frame = this.scene.game.loop.frame;
    this.openedFrame = frame;
    // If a hotspot's click opened this line, remember which one.
    this.speaker = this.caller && this.caller.frame === frame ? this.caller.from : null;
    this.caller = null;
  }

  /**
   * A click on a hotspot while text is up. The natural move after reading a
   * line is to click again where the mouse already is — usually on the very
   * thing that produced it — and that used to restart the same line instead of
   * moving on, until the player dragged the mouse off it. Returns true if the
   * click belongs to the text.
   */
  private claimHotspotClick(from: unknown): boolean {
    if (this.idle) {
      // Nothing up: let the hotspot speak, and remember that it did.
      this.caller = { from, frame: this.scene.game.loop.frame };
      return false;
    }
    // A decision is on screen: it wants one of its own answers.
    if (this.choices.length) return true;
    // Mid-run or still typing: the click is for the text, wherever it lands.
    if (this.typing || this.queue.length > 0 || this.onDone !== null) {
      this.advance();
      return true;
    }
    // A one-line reply. The same thing clicked again dismisses it; something
    // else answers for itself.
    if (this.current && from === this.speaker) {
      this.advance();
      return true;
    }
    this.caller = { from, frame: this.scene.game.loop.frame };
    return false;
  }

  private onKey(ev: KeyboardEvent): void {
    if (ignoreKey(this.scene, ev)) return;
    if (isAdvanceKey(ev)) {
      if (this.advance()) markHandled(ev);
      return;
    }
    if (keysOf(this.scene).bagOpen) return;
    const n = Number(ev.key);
    if (Number.isInteger(n) && n >= 1 && n <= this.choices.length) {
      markHandled(ev);
      this.pick(this.choices[n - 1]);
    }
  }

  private next(): void {
    const line = this.queue.shift();
    if (!line) {
      this.current = null;
      this.label.setText('');
      this.setHint(false);
      const cb = this.onDone;
      this.onDone = null;
      if (cb) {
        cb();
        // A callback that does something other than talk — refreshing the
        // objective, handing over an item — used to leave the panel sitting
        // empty over the bottom third of the painting, because only the
        // no-callback branch below ever folded it away.
        if (!this.queue.length && !this.onDone && !this.choices.length && !this.current) this.hide();
      } else {
        // Nothing follows: get the panel out of the way. Half the clickable
        // world lives in the bottom third of these paintings.
        this.hide();
      }
      // After the callback, not before: it very often starts the next run, and
      // announcing a stop the panel is about to contradict makes the bag flicker.
      this.signal();
      return;
    }
    this.current = line;
    this.renderLine(line, true);
  }

  private remember(line: Loc): void {
    if (this.history[this.history.length - 1] === line) return;
    this.history.push(line);
    if (this.history.length > HISTORY_CAP) this.history.shift();
  }

  private renderLine(line: Loc, animate: boolean): void {
    this.stopTyper();
    this.remember(line);
    const full = t(line);
    // An empty line cannot be typed: a timer with `repeat: -1` never stops.
    if (!animate || full.length === 0) {
      this.label.setText(full);
      this.typing = false;
      this.updateHint();
      return;
    }
    this.label.setText('');
    this.typing = true;
    let i = 0;
    this.typer = this.scene.time.addEvent({
      delay: Timing.typeSpeed,
      repeat: full.length - 1,
      callback: () => {
        i++;
        this.label.setText(full.slice(0, i));
        if (i >= full.length) {
          this.typing = false;
          this.typer = null;
          this.updateHint();
        }
      },
    });
    this.setHint(false);
  }

  private finishTyping(): void {
    this.stopTyper();
    if (this.current) this.label.setText(t(this.current));
    this.typing = false;
    this.updateHint();
  }

  private updateHint(): void {
    this.setHint(!this.choices.length && (this.queue.length > 0 || this.onDone !== null));
    this.signal();
  }

  /**
   * The button that moves the text on.
   *
   * This used to be a small pulsing ▸ in the corner. On a phone it was about
   * six real pixels of glyph, and the first playtester had no idea it was a
   * control at all — she waited for the game to continue by itself. A labelled
   * button in the corner where a thumb already rests is not elegant, but it is
   * the difference between a game and a screen that appears to have frozen.
   */
  private buildNext(): Phaser.GameObjects.Container {
    const { width, height } = Layout;
    const w = scaled(210);
    const h = Math.max(scaled(74), Layout.tap);
    const scene = this.scene;

    const plate = scene.add.graphics();
    plate.fillStyle(Palette.timber, 0.92).fillRoundedRect(-w, -h, w, h, scaled(9));
    plate.lineStyle(2, Palette.rye, 0.85).strokeRoundedRect(-w, -h, w, h, scaled(9));

    this.nextLabel.setText(t(ui.next) + '  ▸').setOrigin(0.5).setPosition(-w / 2, -h / 2);

    // A zone rather than the container's own hit area: it is laid out in the
    // container's local space and Phaser transforms it for free.
    const zone = scene.add.zone(-w / 2, -h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      audio.play('hover');
      this.nextLabel.setColor(Hex.ryeBright);
    });
    zone.on('pointerout', () => this.nextLabel.setColor(Hex.parchment));
    zone.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      if (p.button !== 0) return;
      // Without this the scene's own pointerdown advances a second time and
      // the player skips a line every time they use the button.
      ev?.stopPropagation?.();
      this.advance();
    });

    return scene.add
      .container(width - scaled(34), height - scaled(26), [plate, this.nextLabel, zone])
      .setAlpha(0);
  }

  private setHint(on: boolean): void {
    if (on === this.nextOn) return;
    this.nextOn = on;
    this.nextPulse?.remove();
    this.nextPulse = null;
    this.scene.tweens.killTweensOf(this.nextBtn);
    this.scene.tweens.add({
      targets: this.nextBtn,
      alpha: on ? 1 : 0,
      duration: on ? 180 : 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!on) return;
        this.nextPulse = this.scene.tweens.add({
          targets: this.nextBtn,
          alpha: 0.62,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });
  }

  /**
   * Tells the scene whether a run of lines is under way, so the bag can get out
   * of the corner the Next button needs. A decision does not count: the bag is
   * a legitimate way to answer one.
   */
  private signal(): void {
    const speaking = this.typing || this.queue.length > 0 || this.onDone !== null;
    if (speaking === this.spoke) return;
    this.spoke = speaking;
    this.scene.events.emit(SPEAKING, speaking);
  }

  private buildChoices(): void {
    const { width, height, panelPad } = Layout;
    // The lead-in sits at the top of the panel and the rows stack under it.
    // At phone type size a question and three thumb-sized rows are taller
    // than the panel, and the old layout pushed the first row up onto the
    // question. Now the rows give up some height first, down to a floor, and
    // if that is still not enough the plate grows upward to fit.
    const rows = this.choices.length;
    const bottomPad = scaled(10);
    const labelTop = height - Layout.panelH + scaled(26);
    const labelH = this.label.text ? this.label.height + scaled(16) : scaled(14);
    const room = height - bottomPad - labelTop;
    const floor = scaled(58);
    let gap = Math.max(floor, Layout.tap);
    if (labelH + rows * gap > room) gap = Math.max(floor, Math.floor((room - labelH) / Math.max(1, rows)));
    const extra = Math.max(0, labelH + rows * gap - room);
    this.drawPlate(extra);
    if (this.label.text) this.label.setY(labelTop - extra);
    const startY = labelTop - extra + labelH;
    // The hit area is the whole ROW, not the glyphs — a short option like "The
    // wind." is barely a hundred pixels of text. But it stops short of the bag
    // in the bottom-right corner, which used to catch clicks meant for the
    // third option. No option's text reaches that far.
    const rowW = width - panelPad * 2 - scaled(260);

    this.choices.forEach((c, idx) => {
      const rowTop = startY + idx * gap;
      const txt = this.scene.add.text(panelPad + scaled(26), rowTop, '— ' + t(c.label), {
        fontFamily: Fonts.body,
        fontSize: px(27),
        color: Hex.parchmentDim,
        wordWrap: { width: rowW - scaled(60) },
      });

      // Rows tile: each hit box is exactly one row tall, so there is no gap
      // between options to click into and no overlap to click the wrong one.
      const pad = Math.max(0, (gap - txt.height) / 2);
      txt.setY(rowTop + pad);
      txt.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-scaled(26), -pad, rowW, Math.max(gap, txt.height)),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

      // Hover changes the mark and nudges the row as well as the colour, so it
      // does not depend on telling two colours apart.
      txt.on('pointerover', () => {
        audio.play('hover');
        txt.setColor(Hex.ryeBright).setText('▸ ' + t(c.label)).setX(panelPad + scaled(34));
      });
      txt.on('pointerout', () => {
        txt.setColor(Hex.parchmentDim).setText('— ' + t(c.label)).setX(panelPad + scaled(26));
      });
      txt.on(
        'pointerdown',
        (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          // A right-click is the player putting something back, not choosing.
          if (p.button !== 0) return;
          ev?.stopPropagation?.();
          this.pick(c);
        },
      );
      this.choiceBox.add(txt);
    });
  }

  private pick(c: Choice): void {
    audio.play('click', { volume: 0.6 });
    const onPick = c.onPick;
    this.clearChoices();
    onPick();
  }

  private clearChoices(): void {
    const had = this.choices.length > 0 || this.choiceBox.length > 0;
    this.choices = [];
    this.choiceBox.removeAll(true);
    this.label.setY(Layout.height - Layout.panelH + scaled(44));
    if (had) this.drawPlate(0);
  }

  private redraw(): void {
    this.nextLabel.setText(t(ui.next) + '  ▸');
    // Language changed: re-render whatever is on screen right now.
    if (this.typing) this.finishTyping();
    else if (this.current) this.label.setText(t(this.current));
    if (this.choices.length) {
      const keep = this.choices;
      this.choiceBox.removeAll(true);
      this.choices = keep;
      this.buildChoices();
    }
  }

  private stopTyper(): void {
    this.typer?.remove(false);
    this.typer = null;
  }

  private destroy(): void {
    this.stopTyper();
    this.offLang();
    this.scene.input.keyboard?.off('keydown', this.onKey, this);
  }
}
