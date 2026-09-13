import Phaser from 'phaser';
import { type Loc, i18n, t } from '../core/i18n';
import { ui } from '../content/script';
import { Hex, Fonts, Layout, Palette } from '../core/theme';
import { keysOf } from './keys';

/**
 * Everything said so far in this scene, on one page.
 *
 * Lines are consumed on click, and two of them — the field stone's rule and
 * the Devil's terms — are what the puzzles turn on. A player who skimmed one
 * needs a way back to it that does not depend on the thing being clickable
 * twice.
 */
export class History {
  private scene: Phaser.Scene;
  private lines: () => Loc[];
  private root: Phaser.GameObjects.Container | null = null;
  private offLang: (() => void) | null = null;

  constructor(scene: Phaser.Scene, lines: () => Loc[]) {
    this.scene = scene;
    this.lines = lines;
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
    keysOf(this.scene).modal = true;
    this.build();
    this.offLang = i18n.onChange(() => {
      this.root?.destroy(true);
      this.build();
    });
  }

  close(): void {
    if (!this.root) return;
    this.root.destroy(true);
    this.root = null;
    this.offLang?.();
    this.offLang = null;
    keysOf(this.scene).modal = false;
  }

  private build(): void {
    const { width, height } = Layout;
    const veil = this.scene.add.rectangle(width / 2, height / 2, width, height, Palette.ink, 0.93);

    // Swallows every click under the page; a click anywhere closes it.
    const hit = this.scene.add.zone(width / 2, height / 2, width, height).setInteractive();
    hit.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.close();
    });

    const heading = this.scene.add
      .text(width / 2, 70, t(ui.history), {
        fontFamily: Fonts.body,
        fontSize: '28px',
        color: Hex.parchmentDim,
      })
      .setOrigin(0.5, 0);

    const parts: Phaser.GameObjects.GameObject[] = [veil, hit, heading];

    // Newest at the bottom, stacking upward until the page is full.
    const all = this.lines();
    let y = height - 70;
    for (let i = all.length - 1; i >= 0; i--) {
      const line = this.scene.add
        .text(width / 2, y, t(all[i]), {
          fontFamily: Fonts.body,
          fontSize: '26px',
          color: i === all.length - 1 ? Hex.parchment : Hex.parchmentDim,
          align: 'center',
          wordWrap: { width: 1400 },
          lineSpacing: 6,
        })
        .setOrigin(0.5, 1);
      if (y - line.height < 130) {
        line.destroy();
        break;
      }
      parts.push(line);
      y -= line.height + 18;
    }

    this.root = this.scene.add.container(0, 0, parts).setDepth(850);
  }
}
