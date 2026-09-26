import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { settingsUi } from '../content/script';
import { settings, type TextSize, type TextSpeed } from '../core/settings';
import { Hex, Fonts, Layout, Palette, UI_SCALE, px, scaled } from '../core/theme';
import { setModal } from './keys';
import { audio } from '../core/audio';

/**
 * Text size, text speed and volume, on one card.
 *
 * Every row shows its own effect: the sample line is drawn in the chosen size
 * and typed at the chosen speed, and the volume answers with a click when the
 * knob is let go. A setting you cannot see or hear the effect of is a setting
 * people change twice.
 *
 * The page is rebuilt whenever something changes, which is what makes the
 * sample line pick up the new size: `px()` reads the setting at the moment the
 * text is made.
 */
const CARD = { w: 1180, h: 740 };

export class SettingsPage {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container | null = null;
  private offLang: (() => void) | null = null;
  private typer: Phaser.Time.TimerEvent | null = null;
  /** When set, a change of text size restarts this scene so it applies at once. */
  private restartOnSize: boolean;

  constructor(scene: Phaser.Scene, opts: { restartOnSize?: boolean } = {}) {
    this.scene = scene;
    this.restartOnSize = opts.restartOnSize ?? false;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.close());
  }

  get isOpen(): boolean {
    return this.root !== null;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    setModal(this.scene, this, true);
    this.build(true);
    this.offLang = i18n.onChange(() => this.rebuild());
  }

  close(): void {
    if (!this.root) return;
    this.typer?.remove(false);
    this.typer = null;
    this.root.destroy(true);
    this.root = null;
    this.offLang?.();
    this.offLang = null;
    setModal(this.scene, this, false);
  }

  private rebuild(): void {
    this.typer?.remove(false);
    this.typer = null;
    this.root?.destroy(true);
    this.build(false);
  }

  private build(appear: boolean): void {
    const { width, height } = Layout;
    const veil = this.scene.add.rectangle(width / 2, height / 2, width, height, Palette.ink, 0.8);
    const hit = this.scene.add.zone(width / 2, height / 2, width, height).setInteractive();
    hit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.close();
    });

    const card = this.scene.add.container(width / 2, height / 2);
    const plate = this.scene.add.graphics();
    plate
      .fillStyle(Palette.inkSoft, 0.98)
      .fillRoundedRect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, 14)
      .lineStyle(2, Palette.rye, 0.55)
      .strokeRoundedRect(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, 14);
    // Taps on the card itself must not fall through to the veil and close it.
    const guard = this.scene.add.zone(0, 0, CARD.w, CARD.h).setInteractive();
    guard.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) =>
      ev?.stopPropagation?.(),
    );
    card.add([plate, guard]);

    const left = -CARD.w / 2 + 70;
    let y = -CARD.h / 2 + 48;

    const heading = this.scene.add
      .text(0, y, t(settingsUi.heading), { fontFamily: Fonts.display, fontSize: px(32), color: Hex.parchment })
      .setOrigin(0.5, 0);
    heading.setLetterSpacing?.(scaled(3));
    card.add(heading);
    y += heading.height + 44;

    const s = settings.get();

    // --- text size
    y = this.row(card, left, y, settingsUi.textSize, [
      ...(['small', 'normal', 'large'] as TextSize[]).map((k) => ({
        label: settingsUi.sizes[k],
        on: s.textSize === k,
        pick: () => {
          settings.set('textSize', k);
          if (this.restartOnSize) {
            this.close();
            this.scene.scene.restart();
            return;
          }
          this.rebuild();
        },
      })),
    ]);

    // --- text speed
    y = this.row(card, left, y, settingsUi.textSpeed, [
      ...(['slow', 'normal', 'fast', 'instant'] as TextSpeed[]).map((k) => ({
        label: settingsUi.speeds[k],
        on: s.textSpeed === k,
        pick: () => {
          settings.set('textSpeed', k);
          this.rebuild();
        },
      })),
    ]);

    // --- volume
    y = this.slider(card, left, y);

    // --- the sample, in the chosen size, at the chosen speed
    y += 12;
    const rule = this.scene.add.graphics();
    rule.lineStyle(1, Palette.timberLight, 0.4).lineBetween(left, y, CARD.w / 2 - 70, y);
    card.add(rule);
    y += 26;
    // Sized by hand rather than through px(): the whole card is already scaled
    // up for the device, so only the player's own text size is applied here.
    const sample = this.scene.add.text(left, y, '', {
      fontFamily: Fonts.body,
      fontSize: `${Math.round(30 * settings.textScale)}px`,
      color: Hex.parchment,
      wordWrap: { width: CARD.w - 140 },
      lineSpacing: scaled(4),
    });
    card.add(sample);
    this.typeSample(sample, t(settingsUi.sample));

    if (!this.restartOnSize) {
      // Below the sample however many lines it takes at the chosen size.
      sample.setText(t(settingsUi.sample));
      const below = sample.y + sample.height + 22;
      sample.setText('');
      const note = this.scene.add
        .text(0, below, t(settingsUi.sizeNote), {
          fontFamily: Fonts.body,
          fontSize: '20px',
          color: Hex.mist,
          fontStyle: 'italic',
        })
        .setOrigin(0.5, 0);
      card.add(note);
    }

    const foot = this.scene.add
      .text(width / 2, height - scaled(26), t(settingsUi.close), {
        fontFamily: Fonts.body,
        fontSize: px(17),
        color: Hex.parchmentDim,
      })
      .setOrigin(0.5, 1);

    // A card taller than a phone at large type is scaled to fit, not clipped.
    // Grown for a phone like the rest of the UI, and fitted under the chips.
    const fit = Math.min(UI_SCALE, (height - scaled(150)) / CARD.h, (width - 60) / CARD.w);
    card.setScale(fit);

    card.setY(height / 2 + scaled(40));
    this.root = this.scene.add.container(0, 0, [veil, hit, card, foot]).setDepth(890);
    if (appear) {
      card.setAlpha(0).setScale(fit * 0.96);
      this.scene.tweens.add({ targets: card, alpha: 1, scale: fit, duration: 220, ease: 'Quad.easeOut' });
    }
  }

  /** A label and a row of choices, one of them lit. Returns the y below it. */
  private row(
    card: Phaser.GameObjects.Container,
    left: number,
    y: number,
    label: Loc,
    options: Array<{ label: Loc; on: boolean; pick: () => void }>,
  ): number {
    const name = this.scene.add.text(left, y, t(label).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: '20px',
      color: Hex.rye,
    });
    name.setLetterSpacing?.(3);
    card.add(name);
    let x = left;
    const top = y + name.height + 14;
    let h = 0;
    options.forEach((o) => {
      const btn = this.scene.add
        .text(x, top, t(o.label), {
          fontFamily: Fonts.body,
          fontSize: '28px',
          color: o.on ? Hex.ink : Hex.parchment,
          backgroundColor: o.on ? Hex.rye : 'rgba(255,255,255,0.06)',
          padding: { x: 26, y: 16 },
        })
        .setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => !o.on && btn.setColor(Hex.ryeBright));
      btn.on('pointerout', () => !o.on && btn.setColor(Hex.parchment));
      btn.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
        ev?.stopPropagation?.();
        audio.play('click');
        if (!o.on) o.pick();
      });
      card.add(btn);
      x += btn.width + 12;
      h = btn.height;
    });
    return top + h + 34;
  }

  /** A track and a knob. Drag anywhere on the track; the level applies live. */
  private slider(card: Phaser.GameObjects.Container, left: number, y: number): number {
    const name = this.scene.add.text(left, y, t(settingsUi.volume).toUpperCase(), {
      fontFamily: Fonts.body,
      fontSize: '20px',
      color: Hex.rye,
    });
    name.setLetterSpacing?.(3);
    card.add(name);

    const trackW = 620;
    const cy = y + name.height + 42;
    const x0 = left + 16;
    const g = this.scene.add.graphics();
    const knob = this.scene.add.graphics();
    const value = this.scene.add
      .text(x0 + trackW + 40, cy, '', { fontFamily: Fonts.display, fontSize: '28px', color: Hex.parchment })
      .setOrigin(0, 0.5);

    const paint = (v: number): void => {
      g.clear();
      g.fillStyle(Palette.peat, 0.8).fillRoundedRect(x0, cy - 7, trackW, 14, 7);
      g.fillStyle(Palette.rye, 0.95).fillRoundedRect(x0, cy - 7, Math.max(14, trackW * v), 14, 7);
      knob.clear();
      knob.fillStyle(Palette.parchment, 1).fillCircle(x0 + trackW * v, cy, 20);
      knob.lineStyle(3, Palette.rye, 1).strokeCircle(x0 + trackW * v, cy, 20);
      value.setText(`${Math.round(v * 100)}%`);
    };
    paint(settings.get().volume);

    // A tall hit strip: a thumb should not have to find a 14px line.
    const zone = this.scene.add
      .zone(x0 + trackW / 2, cy, trackW + 60, 90)
      .setInteractive({ useHandCursor: true, draggable: false });
    let dragging = false;
    const at = (p: Phaser.Input.Pointer): number => {
      const m = card.getWorldTransformMatrix();
      const local = m.applyInverse(p.x, p.y);
      return Phaser.Math.Clamp((local.x - x0) / trackW, 0, 1);
    };
    zone.on('pointerdown', (p: Phaser.Input.Pointer, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      dragging = true;
      const v = at(p);
      settings.set('volume', v);
      paint(v);
    });
    const move = (p: Phaser.Input.Pointer): void => {
      if (!dragging || !p.isDown) return;
      const v = at(p);
      settings.set('volume', v);
      paint(v);
    };
    const up = (): void => {
      if (!dragging) return;
      dragging = false;
      audio.play('click');
    };
    this.scene.input.on('pointermove', move);
    this.scene.input.on('pointerup', up);
    zone.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.scene.input.off('pointermove', move);
      this.scene.input.off('pointerup', up);
    });

    card.add([g, knob, value, zone]);
    return cy + 60;
  }

  /** Types the sample at the chosen speed, pauses, and types it again. */
  private typeSample(label: Phaser.GameObjects.Text, full: string): void {
    const ms = settings.typeMs;
    if (ms === 0) {
      label.setText(full);
      return;
    }
    let i = 0;
    label.setText('');
    this.typer = this.scene.time.addEvent({
      delay: ms,
      loop: true,
      callback: () => {
        i++;
        if (i <= full.length) label.setText(full.slice(0, i));
        // Hold the whole line for about two seconds, then start over.
        if (i > full.length + Math.round(2000 / ms)) i = 0;
      },
    });
  }
}
