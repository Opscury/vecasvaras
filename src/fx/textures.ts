import Phaser from 'phaser';

/**
 * Every particle and fog texture in the game is drawn at boot instead of
 * shipped as a file. Three reasons: none of it adds to the download, the
 * shapes can be retuned by changing a number instead of regenerating art, and
 * soft white masks tint cleanly to whatever a scene needs — the same blob is
 * chimney smoke, pollen, and a bog light.
 */

const made = new Set<string>();

function canvas(scene: Phaser.Scene, key: string, w: number, h: number) {
  if (made.has(key) || scene.textures.exists(key)) return null;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return null;
  made.add(key);
  return tex;
}

/** A soft round falloff — the workhorse behind smoke, motes and wisps. */
export function makeBlob(scene: Phaser.Scene, key = 'fx-blob', size = 128): string {
  const tex = canvas(scene, key, size, size);
  if (!tex) return key;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return key;
}

/**
 * The mark one sweep of a sickle leaves, as a mask stamp.
 *
 * Solid through the middle so overlapping strokes reach full opacity in one
 * pass, then falling away over the outer third — which is what stops a cut
 * field from looking like it was assembled out of rectangles.
 */
export function makeSwathBrush(scene: Phaser.Scene, key = 'fx-swath', size = 256): string {
  const tex = canvas(scene, key, size, size);
  if (!tex) return key;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.62, 'rgba(255,255,255,1)');
  g.addColorStop(0.82, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return key;
}

/**
 * A wide, lumpy, very soft band — one drifting sheet of mist. Several of these
 * at different speeds and opacities is what sells weather on a still painting.
 */
export function makeFogBand(scene: Phaser.Scene, key: string, seed: number): string {
  const w = 1024;
  const h = 320;
  const tex = canvas(scene, key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);

  // Deterministic per-key noise so a rebuild looks the same as the last one.
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  for (let i = 0; i < 46; i++) {
    const cx = rnd() * w;
    const cy = h * 0.25 + rnd() * h * 0.5;
    const rad = 90 + rnd() * 230;
    const a = 0.05 + rnd() * 0.09;

    // Draw every blob three times — at x, x-w and x+w — so anything crossing
    // the left or right edge reappears on the other side. Without this the
    // band scrolls with a visible vertical seam once per loop.
    for (const ox of [-w, 0, w]) {
      const g = ctx.createRadialGradient(cx + ox, cy, 0, cx + ox, cy, rad);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx + ox - rad, cy - rad, rad * 2, rad * 2);
    }
  }

  // Feather the top and bottom to nothing. A fog sheet with a straight edge
  // reads as a grey rectangle laid over the painting, which is exactly what it
  // is, and exactly what the player must never notice.
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  for (let y = 0; y < h; y++) {
    // Smooth bell across the band's height, flat-ish through the middle.
    const v = y / (h - 1);
    const fall = Math.pow(Math.sin(Math.PI * v), 0.85);
    for (let x = 0; x < w; x++) {
      px[(y * w + x) * 4 + 3] *= fall;
    }
  }
  ctx.putImageData(img, 0, 0);

  tex.refresh();
  return key;
}

/**
 * A bird, three pixels of intent: two swept wings. Drawn once, flipped and
 * scaled per bird. Nothing makes a painted landscape read as a live place
 * faster than something small crossing it.
 */
export function makeBird(scene: Phaser.Scene, key = 'fx-bird'): string {
  const w = 48;
  const h = 24;
  const tex = canvas(scene, key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4, 16);
  ctx.quadraticCurveTo(14, 4, 24, 13);
  ctx.quadraticCurveTo(34, 4, 44, 16);
  ctx.stroke();
  tex.refresh();
  return key;
}

/** Everything the atmosphere module needs, made once per scene. */
export function ensureFxTextures(scene: Phaser.Scene): void {
  makeBlob(scene);
  makeBird(scene);
  makeFogBand(scene, 'fx-fog-a', 12345);
  makeFogBand(scene, 'fx-fog-b', 98765);
  makeFogBand(scene, 'fx-fog-c', 24680);
}
