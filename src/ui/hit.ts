import Phaser from 'phaser';
import { audio } from '../core/audio';
import { scaled } from '../core/theme';

/**
 * Gives a text button a fixed-size hit area centred on its glyphs.
 *
 * Everything is laid out on a 1920-wide canvas and scaled down to the screen,
 * so a 34px word on a phone held sideways is a 15px target. A generous box in
 * design space survives the scale-down; the glyph bounds do not.
 *
 * Returns a function to call after the text changes (a language switch), since
 * the box is placed relative to the text's own frame.
 *
 * Also where text buttons get their click, because this is the only thing every
 * one of them already shares — Begin, Continue, Start over, Skip, Retry. Doing
 * it per caller means the next button someone adds is silent.
 */
export function padHit(txt: Phaser.GameObjects.Text, w: number, h: number): () => void {
  const rect = new Phaser.Geom.Rectangle(0, 0, scaled(w), scaled(h));
  const place = () => {
    // The box has to be at least as big as the words inside it. Compact type is
    // half again as wide, and a fixed box quietly clipped the ends of the
    // longer Latvian labels.
    rect.width = Math.max(scaled(w), txt.width + scaled(40));
    rect.height = Math.max(scaled(h), txt.height + scaled(24));
    rect.setPosition(txt.width / 2 - rect.width / 2, txt.height / 2 - rect.height / 2);
  };
  place();
  txt.setInteractive({
    hitArea: rect,
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
  txt.on('pointerover', () => audio.play('hover'));
  txt.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if (p.button === 0) audio.play('click');
  });
  return place;
}
