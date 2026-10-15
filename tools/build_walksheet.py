#!/usr/bin/env python3
"""Builds a player walk sheet from an image-to-video take of a figure walking.

The same method as build_catsheet.py (read that one's notes): key out the white
paper with solved edge alpha, register every frame on one ground line with the
drift taken out, and cut exactly one step. The step is read off a contact
sheet of the feet (see TAKES) and sampled to CYCLE evenly spaced frames: the
takes walk at about half speed, and sampling absorbs that.

    python3 tools/build_walksheet.py man
    python3 tools/build_walksheet.py woman

Needs ffmpeg, numpy, scipy and Pillow. Writes art-src/walk_<who>.png and
prints the frame size for scenes/assets.ts.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parent.parent
TAKES = {
    # who: (video, still it was made from, seconds to read, one step: first and
    # last frame at 24 fps, both in the same stance). Read off a contact sheet of
    # the feet; both takes walk at about half speed, which the sampling absorbs.
    # One step, not two: the legs swap sides at the seam, which at the size the
    # figure is drawn (and under a skirt) does not show, and these takes do not
    # hold a clean full stride.
    'man': ('walk_man.mp4', 'player_man.jpg', 5.9, (0, 54)),
    'woman': ('walk_woman.mp4', 'player_woman.jpg', 3.2, (2, 46)),
}
SAMPLE_FPS = 24          # the take's own rate: the stride is found to the frame
CYCLE = 10               # frames kept from one step, evenly spaced
WORK_H = 900            # frames are analysed at this height
FRAME_H = 240           # the figure is drawn ~110 px tall in the village; 2x for sharp phones
COLS = 4
KEY_TOL = 30


def extract(src: Path, into: Path, secs: float) -> list[Path]:
    subprocess.run(
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src), '-t', str(secs),
         '-vf', f'fps={SAMPLE_FPS},scale=-1:{WORK_H}', str(into / 'f%03d.png')],
        check=True,
    )
    return sorted(into.glob('f*.png'))


def background(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.int16)
    corner = np.median(np.concatenate([a[0, :], a[-1, :], a[:, 0], a[:, -1]]), axis=0)
    near = np.abs(a - corner.astype(np.int16)).max(axis=2) <= KEY_TOL
    lab, _ = nd.label(near)
    edge = set(lab[0, :].tolist()) | set(lab[-1, :].tolist()) | set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    edge.discard(0)
    return np.isin(lab, list(edge))


def pockets(rgb: np.ndarray) -> np.ndarray:
    """Enclosed paper the fill cannot reach: between the legs, under an arm."""
    a = rgb.astype(np.int16)
    mn, mx = a.min(axis=2), a.max(axis=2)
    white = (mn >= 236) & ((mx - mn) <= 10)
    lab, n = nd.label(white)
    if n == 0:
        return np.zeros_like(white)
    edge = set(lab[0, :].tolist()) | set(lab[-1, :].tolist()) | set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    sizes = nd.sum(white, lab, range(1, n + 1))
    keep = [i for i in range(1, n + 1) if i not in edge and 30 <= sizes[i - 1] <= 40000]
    if not keep:
        return np.zeros_like(white)
    return nd.binary_dilation(np.isin(lab, keep), iterations=1)


def cut_out(path: Path) -> tuple[np.ndarray, np.ndarray]:
    rgb = np.asarray(Image.open(path).convert('RGB'))
    bg = background(rgb) | pockets(rgb)
    mask = ~bg
    # Only the biggest piece is the figure; specks of paper grain are not.
    lab, n = nd.label(mask)
    if n > 1:
        sizes = nd.sum(mask, lab, range(1, n + 1))
        mask = lab == (int(np.argmax(sizes)) + 1)
    rgb_f = rgb.astype(np.float32)
    white = float(np.median(rgb_f[~mask]))
    core = nd.binary_erosion(mask, iterations=2)
    idx = nd.distance_transform_edt(~core, return_distances=False, return_indices=True)
    body = rgb_f[idx[0], idx[1]]
    span = white - body
    pick = np.abs(span).argmax(axis=2)
    take = lambda arr: np.take_along_axis(arr, pick[..., None], axis=2)[..., 0]
    denom = np.where(np.abs(take(span)) < 6.0, np.nan, take(span))
    alpha = np.clip((white - take(rgb_f)) / denom, 0.0, 1.0)
    alpha = np.where(np.isnan(alpha), mask.astype(np.float32), alpha)
    alpha[core] = 1.0
    alpha[~nd.binary_dilation(mask, iterations=1)] = 0.0
    return np.dstack([body, alpha * 255]).astype(np.uint8), mask


def anchor_x(mask: np.ndarray) -> float:
    """Mean x of head and shoulders, which do not swing with the stride."""
    ys, xs = np.nonzero(mask)
    cut = ys.min() + int((ys.max() - ys.min()) * 0.30)
    return float(xs[ys <= cut].mean())


def legs(mask: np.ndarray, ax: float) -> np.ndarray:
    """The feet and shins (lowest fifth), centred on the shoulders: under a skirt
    the feet are all that move."""
    ys, xs = np.nonzero(mask)
    top = ys.min() + int((ys.max() - ys.min()) * 0.80)
    w = 220
    out = np.zeros((ys.max() - top + 1, 2 * w), bool)
    sel = ys >= top
    yy = ys[sel] - top
    xx = (xs[sel] - ax + w).astype(int)
    ok = (xx >= 0) & (xx < 2 * w)
    out[yy[ok], xx[ok]] = True
    return out


def iou(a: np.ndarray, b: np.ndarray) -> float:
    h = min(a.shape[0], b.shape[0])
    a, b = a[-h:], b[-h:]
    return float((a & b).sum() / max(1, (a | b).sum()))


def match_colour(frames: list[np.ndarray], ref_path: Path) -> None:
    ref = np.asarray(Image.open(ref_path).convert('RGBA')).astype(np.float32)
    if ref[..., 3].min() == 255:
        # A still on paper: the figure is what is not paper.
        _, m = cut_out(ref_path)
        rm = m
    else:
        rm = ref[..., 3] > 200
    stack = np.concatenate([f.reshape(-1, 4) for f in frames])
    sm = stack[:, 3] > 200
    for c in range(3):
        a = stack[:, c][sm].astype(np.float32)
        b = ref[..., c][rm]
        gain = (b.std() or 1.0) / (a.std() or 1.0)
        offset = b.mean() - a.mean() * gain
        for f in frames:
            f[..., c] = np.clip(f[..., c].astype(np.float32) * gain + offset, 0, 255)


def foot_slide(frames: list[Image.Image]) -> float:
    """Median backward slide of a planted foot per frame, in sheet pixels."""
    def contacts(im: Image.Image) -> list[float]:
        a = np.asarray(im)[..., 3] > 60
        ys, xs = np.nonzero(a)
        band = ys >= ys.max() - 4
        cols = np.zeros(a.shape[1], bool)
        cols[xs[band]] = True
        lab, k = nd.label(cols)
        return sorted(float(np.nonzero(lab == i)[0].mean()) for i in range(1, k + 1) if (lab == i).sum() >= 4)
    seq = [contacts(f) for f in frames]
    slides = []
    for a, b in zip(seq, seq[1:] + seq[:1]):
        for x in a:
            if b:
                d = min(b, key=lambda y: abs(y - x)) - x
                if -30 < d < 3:
                    slides.append(d)
    return float(-np.median(slides)) if slides else 0.0


def main(who: str) -> int:
    video, still, secs, (first, last) = TAKES[who]
    src = ROOT / 'tools' / 'src' / video
    with tempfile.TemporaryDirectory() as tmp:
        files = extract(src, Path(tmp), secs)
        cut = [cut_out(f) for f in files]
        s, period = first, last - first
        print(f'step: frames {first}..{last}, seam IoU {iou(legs(cut[first][1], anchor_x(cut[first][1])), legs(cut[last][1], anchor_x(cut[last][1]))):.3f}')
        pick = [s + int(round(k * period / CYCLE)) for k in range(CYCLE)]
        n = CYCLE
        rgba = [cut[i][0].copy() for i in pick]
        masks = [cut[i][1] for i in pick]
        close = s + period
        match_colour(rgba, ROOT / 'art-src' / still)

        xs = np.array([anchor_x(m) for m in masks])
        t = np.arange(n, dtype=np.float64)
        # Fit the drift over the cycle plus the frame that closes it, so the
        # loop does not shunt at the seam.
        x_close = anchor_x(cut[close][1])
        slope = np.polyfit(np.append(t, n), np.append(xs, x_close), 1)[0]
        shift = -slope * t
        floor = max(np.nonzero(m)[0].max() for m in masks)
        print(f'drift {slope:.2f} px/frame removed')

        placed = []
        for k in range(n):
            im = Image.fromarray(rgba[k], 'RGBA')
            dy = float(floor - np.nonzero(masks[k])[0].max())
            placed.append(im.transform(im.size, Image.AFFINE, (1, 0, -float(shift[k]), 0, 1, -dy), resample=Image.BICUBIC))

        boxes = []
        for im in placed:
            ys, xs_ = np.nonzero(np.asarray(im)[..., 3] > 16)
            boxes.append((xs_.min(), ys.min(), xs_.max() + 1, ys.max() + 1))
        x0 = min(b[0] for b in boxes) - 4; y0 = min(b[1] for b in boxes) - 4
        x1 = max(b[2] for b in boxes) + 4; y1 = max(b[3] for b in boxes)
        fw = int(round((x1 - x0) * FRAME_H / (y1 - y0)))
        rows = (n + COLS - 1) // COLS
        cells = [im.crop((x0, y0, x1, y1)).resize((fw, FRAME_H), Image.LANCZOS) for im in placed]
        sheet = Image.new('RGBA', (fw * COLS, FRAME_H * rows), (0, 0, 0, 0))
        for k, c in enumerate(cells):
            sheet.paste(c, ((k % COLS) * fw, (k // COLS) * FRAME_H))
        out = ROOT / 'art-src' / f'walk_{who}.png'
        sheet.save(out, optimize=True)
        print(f'wrote {out.relative_to(ROOT)}: {n} frames of {fw}x{FRAME_H}, {COLS}x{rows}')
        # Ground covered per stride, in frame heights: the drift the camera
        # tracked out, over one period, at sheet scale.
        idle = int(np.argmin([np.ptp(np.nonzero(np.asarray(c)[..., 3][-30:] > 60)[1]) for c in cells]))
        print(f'feet closest together in frame {idle} -> the standing frame in ui/Walker.ts')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else 'man'))
