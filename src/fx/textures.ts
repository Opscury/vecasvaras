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
 * The counterpart to the swath brush: what puts standing crop back.
 *
 * Much gentler than the brush it undoes. Erasing is multiplicative, so a stamp
 * that is opaque most of the way out cuts a hole with a hard rim — which in the
 * field read as a rectangle of rye sitting in the stubble. This ramps from the
 * middle so one pass leaves a patch with an edge you cannot point at.
 */
export function makeIslandEraser(scene: Phaser.Scene, key = 'fx-island', size = 256): string {
  const tex = canvas(scene, key, size, size);
  if (!tex) return key;
  const ctx = tex.getContext();
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.12)');
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

/**
 * A crow on the ground, side on: a body, a head, a beak, a tail. Drawn once,
 * tinted and flipped per bird. Small enough that three blobs are a bird.
 */
export function makeGroundBird(scene: Phaser.Scene, key = 'fx-groundbird'): string {
  const w = 40;
  const h = 26;
  const tex = canvas(scene, key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath();
  ctx.ellipse(18, 15, 11, 7, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(29, 9, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(33, 8);
  ctx.lineTo(39, 10);
  ctx.lineTo(33, 11);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, 13);
  ctx.lineTo(1, 11);
  ctx.lineTo(8, 18);
  ctx.fill();
  ctx.fillRect(16, 21, 1.5, 5);
  ctx.fillRect(21, 21, 1.5, 5);
  tex.refresh();
  return key;
}

/**
 * A fresh plank, for the bridge the Devil lays. Pale new wood with grain, so
 * it reads as just cut against the grey old causeway it is laid over.
 */
export function makePlank(scene: Phaser.Scene, key = 'fx-plank'): string {
  const w = 256;
  const h = 40;
  const tex = canvas(scene, key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#e7d7b6');
  g.addColorStop(0.55, '#cdb58b');
  g.addColorStop(1, '#8f7652');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(3, 4);
  ctx.lineTo(w - 2, 2);
  ctx.lineTo(w - 4, h - 3);
  ctx.lineTo(1, h - 2);
  ctx.closePath();
  ctx.fill();
  let s = 4242;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = 0; i < 14; i++) {
    const y = 5 + rnd() * (h - 10);
    ctx.strokeStyle = `rgba(90,66,40,${0.18 + rnd() * 0.2})`;
    ctx.lineWidth = 1 + rnd();
    ctx.beginPath();
    ctx.moveTo(2, y);
    ctx.bezierCurveTo(w * 0.3, y + rnd() * 4 - 2, w * 0.7, y + rnd() * 4 - 2, w - 2, y + rnd() * 3 - 1.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(70,50,30,0.55)';
  ctx.fillRect(1, 3, 5, h - 6);
  ctx.fillRect(w - 6, 3, 5, h - 6);
  tex.refresh();
  return key;
}

/**
 * A sheet of old paper, for the map.
 *
 * Drawn rather than shipped for the same reasons as everything else here, plus
 * one of its own: a map is the only surface in the game the player looks AT
 * rather than into, so it has to be lit like paper — warm, mottled, darker
 * where it has been handled, with a rubbed edge. Flat parchment-coloured
 * rectangle reads as a dialog box.
 */
export function makeParchment(scene: Phaser.Scene, key = 'fx-parchment'): string {
  const w = 1024;
  const h = 576;
  const tex = canvas(scene, key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();

  let s = 20260920;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  ctx.fillStyle = '#d8c39a';
  ctx.fillRect(0, 0, w, h);

  // Blotching: wide soft stains, warm and cool, so no two areas match.
  for (let i = 0; i < 90; i++) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const rad = 40 + rnd() * 200;
    const warm = rnd() > 0.45;
    const a = 0.03 + rnd() * 0.07;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, warm ? `rgba(168,131,80,${a})` : `rgba(236,222,192,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }

  // Fibres.
  ctx.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 6 + rnd() * 26;
    const ang = rnd() * Math.PI;
    ctx.strokeStyle = `rgba(150,118,72,${0.04 + rnd() * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  // Two old fold lines, because a map that has been folded has been carried.
  ctx.strokeStyle = 'rgba(126,98,58,0.16)';
  ctx.lineWidth = 2;
  [w / 3, (w * 2) / 3].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rnd() - 0.5) * 6, h);
    ctx.stroke();
  });

  // Rubbed edges: darker and thinner towards the border, on all four sides.
  const edge = ctx.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, 'rgba(92,70,42,0.42)');
  edge.addColorStop(0.16, 'rgba(92,70,42,0)');
  edge.addColorStop(0.84, 'rgba(92,70,42,0)');
  edge.addColorStop(1, 'rgba(92,70,42,0.42)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  const side = ctx.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, 'rgba(92,70,42,0.38)');
  side.addColorStop(0.12, 'rgba(92,70,42,0)');
  side.addColorStop(0.88, 'rgba(92,70,42,0)');
  side.addColorStop(1, 'rgba(92,70,42,0.38)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, w, h);

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
