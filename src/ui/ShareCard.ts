import Phaser from 'phaser';
import { type Loc, t } from '../core/i18n';
import { type SignKey, signEnd, walkSign } from './Sign';

/**
 * The year, as a picture someone can post.
 *
 * Two marks, whole or broken, read on a phone in a feed without a word of
 * explanation — which makes the ending the one thing in the game worth
 * sending to somebody. This draws it on a plain 2D canvas at the size link
 * previews use, and hands it to the system share sheet where there is one,
 * or downloads it where there is not.
 *
 * Drawn from the same stroke data as the marks in the game, so the card can
 * never show a different verdict from the tally.
 */

export interface ShareMark {
  key: SignKey;
  complete: boolean;
  label: Loc;
}

export interface ShareSpec {
  title: string;
  subtitle: Loc;
  year: Loc | null;
  heading: Loc;
  marks: [ShareMark, ShareMark];
  verdict: Loc;
  note: Loc;
  url: string;
}

const W = 1200;
const H = 630;

const INK = '#14161a';
const PARCHMENT = '#e8dfcd';
const DIM = '#bfb49c';
const RYE = '#c9a24a';
const RYE_BRIGHT = '#e0bd68';
const COLD = '#7c8489';
const SERIF = 'Georgia, "Times New Roman", "Liberation Serif", serif';

export function renderShareCard(scene: Phaser.Scene, spec: ShareSpec): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // The village, darkened, as the ground.
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  const src = scene.textures.exists('bg-village')
    ? (scene.textures.get('bg-village').getSourceImage() as CanvasImageSource & { width: number; height: number })
    : null;
  if (src) {
    const s = Math.max(W / src.width, H / src.height);
    const dw = src.width * s;
    const dh = src.height * s;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, 'rgba(20,22,26,0.78)');
  veil.addColorStop(0.5, 'rgba(20,22,26,0.86)');
  veil.addColorStop(1, 'rgba(20,22,26,0.94)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);

  // A thin frame, the colour of the rye.
  ctx.strokeStyle = 'rgba(201,162,74,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Title block.
  ctx.fillStyle = PARCHMENT;
  ctx.font = `52px ${SERIF}`;
  spaced(ctx, spec.title, W / 2, 96, 8);
  ctx.fillStyle = DIM;
  ctx.font = `italic 22px ${SERIF}`;
  const sub = spec.year ? `${t(spec.subtitle)} · ${t(spec.year)}` : t(spec.subtitle);
  ctx.fillText(sub, W / 2, 132);

  ctx.fillStyle = DIM;
  ctx.font = `24px ${SERIF}`;
  ctx.fillText(t(spec.heading), W / 2, 196);

  // The two marks.
  const xs = [W * 0.32, W * 0.68];
  spec.marks.forEach((m, i) => {
    drawMark(ctx, m, xs[i], 300, 62);
    ctx.fillStyle = m.complete ? PARCHMENT : COLD;
    ctx.font = `24px ${SERIF}`;
    ctx.fillText(t(m.label), xs[i], 420);
  });

  ctx.fillStyle = PARCHMENT;
  ctx.font = `38px ${SERIF}`;
  ctx.fillText(t(spec.verdict), W / 2, 494);
  ctx.fillStyle = RYE;
  ctx.font = `italic 24px ${SERIF}`;
  ctx.fillText(t(spec.note), W / 2, 536);

  ctx.fillStyle = DIM;
  ctx.font = `20px ${SERIF}`;
  ctx.textAlign = 'right';
  ctx.fillText(spec.url, W - 48, H - 44);

  return canvas;
}

function drawMark(ctx: CanvasRenderingContext2D, m: ShareMark, x: number, y: number, size: number): void {
  const end = signEnd(m.complete);
  ctx.lineCap = 'round';
  if (m.complete) {
    ctx.strokeStyle = 'rgba(224,189,104,0.18)';
    ctx.lineWidth = 20;
    stroke(ctx, m.key, end, x, y, size);
    ctx.strokeStyle = RYE_BRIGHT;
    ctx.lineWidth = 8;
  } else {
    ctx.strokeStyle = COLD;
    ctx.lineWidth = 7;
  }
  stroke(ctx, m.key, end, x, y, size);
}

function stroke(ctx: CanvasRenderingContext2D, key: SignKey, end: number, x: number, y: number, size: number): void {
  ctx.beginPath();
  walkSign(key, end, (ax, ay, bx, by) => {
    ctx.moveTo(x + ax * size, y + ay * size);
    ctx.lineTo(x + bx * size, y + by * size);
  });
  ctx.stroke();
}

/** Letter-spaced text, centred, for the title. Canvas has no letter-spacing everywhere. */
function spaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, gap: number): void {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + gap;
  });
  ctx.textAlign = align;
}

/**
 * Shares the card if the device can, otherwise downloads it. Resolves to what
 * happened, so the caller can say so.
 */
export async function shareCard(canvas: HTMLCanvasElement, filename: string, text: string): Promise<'shared' | 'saved' | 'failed'> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text });
      return 'shared';
    }
  } catch (e) {
    // The player closing the share sheet is not an error worth reporting.
    if ((e as DOMException)?.name === 'AbortError') return 'shared';
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'saved';
  } catch {
    return 'failed';
  }
}
