#!/usr/bin/env python3
"""Builds public/art/cat_walk_sheet.png from tools/src/catwalk.mp4.

The cat that crosses the planks in the bog used to be one still image slid
across the screen. This turns the image-to-video take it was made from into a
real twelve-frame walk cycle.

Four things here are not obvious and all four are the difference between a
sprite sheet and a twitching mess:

1.  KEYING. A flood fill from the border leaves the white pockets between the
    cat's legs behind, because they are enclosed. Those are found separately as
    tight-white regions that do not touch the border.
2.  EDGES. The flood fill classifies the source's own anti-aliased edge pixels
    as cat, and their colour is a blend of fur and white paper. Left opaque they
    draw a pale outline round the animal, which over a bog this dark is the
    first thing you see. So the blend is solved instead: observed = a*fur +
    (1-a)*white, with fur taken from the nearest fully-interior pixel.
3.  REGISTRATION. Every frame must share one canvas, one ground line and one
    horizontal centre, or the cat shivers. The footage also drifts right at
    2.4 px a frame; that trend is removed, because a drift that resets at the
    loop boundary is a visible shunt backwards. The residual sway is real
    animation and is kept.
4.  THE CYCLE. Twelve frames is one whole stride, chosen by scoring the loop
    seam: frame 15 to frame 26 is the run whose ends match most closely.

Run from anywhere:  python3 tools/build_catsheet.py
Needs ffmpeg, numpy, scipy and Pillow.
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
SOURCE = ROOT / 'tools' / 'src' / 'catwalk.mp4'
REFERENCE = ROOT / 'public' / 'art' / 'cat_walk.png'
OUT = ROOT / 'public' / 'art' / 'cat_walk_sheet.png'

SAMPLE_FPS = 8          # the take is 24 fps; every third frame is plenty
FRAMES = range(15, 27)  # one stride, ends matched -- see note 4
COLS, ROWS = 4, 3
FRAME_H = 150           # the cat is drawn 120 px tall in the bog
KEY_TOL = 34


def extract(into: Path) -> None:
    subprocess.run(
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(SOURCE),
         '-vf', f'fps={SAMPLE_FPS}', str(into / 'f%02d.png')],
        check=True,
    )


def background(rgb: np.ndarray) -> np.ndarray:
    """Every white pixel the flood fill can reach from the border."""
    a = rgb.astype(np.int16)
    near = np.abs(a - a[0, 0].astype(np.int16)).max(axis=2) <= KEY_TOL
    lab, _ = nd.label(near)
    edge = set(lab[0, :].tolist()) | set(lab[-1, :].tolist())
    edge |= set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    edge.discard(0)
    return np.isin(lab, list(edge))


def pockets(rgb: np.ndarray, biggest: int = 30000) -> np.ndarray:
    """Enclosed white it cannot reach: the gaps between the legs."""
    a = rgb.astype(np.int16)
    mn, mx = a.min(axis=2), a.max(axis=2)
    white = (mn >= 242) & ((mx - mn) <= 8)
    lab, n = nd.label(white)
    edge = set(lab[0, :].tolist()) | set(lab[-1, :].tolist())
    edge |= set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    sizes = nd.sum(white, lab, range(1, n + 1))
    keep = [i for i in range(1, n + 1) if i not in edge and 40 <= sizes[i - 1] <= biggest]
    if not keep:
        return np.zeros_like(white)
    return nd.binary_dilation(np.isin(lab, keep), iterations=2)


def cut_out(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """RGBA with solved edge alpha and no white fringe, plus the hard mask."""
    rgb = np.asarray(Image.open(path).convert('RGB'))
    bg = background(rgb) | pockets(rgb)
    mask = ~bg
    rgb_f = rgb.astype(np.float32)
    white = float(np.median(rgb_f[bg]))

    core = nd.binary_erosion(mask, iterations=2)
    idx = nd.distance_transform_edt(~core, return_distances=False, return_indices=True)
    fur = rgb_f[idx[0], idx[1]]

    span = white - fur
    pick = np.abs(span).argmax(axis=2)
    take = lambda arr: np.take_along_axis(arr, pick[..., None], axis=2)[..., 0]
    denom = np.where(np.abs(take(span)) < 6.0, np.nan, take(span))
    alpha = np.clip((white - take(rgb_f)) / denom, 0.0, 1.0)
    alpha = np.where(np.isnan(alpha), mask.astype(np.float32), alpha)
    alpha[core] = 1.0
    alpha[~nd.binary_dilation(mask, iterations=1)] = 0.0
    return np.dstack([fur, alpha * 255]).astype(np.uint8), mask


def anchor_x(mask: np.ndarray) -> float:
    """Mean x of the upper 40% of the body: back, shoulders and head.

    Excludes the legs and most of the tail, so it does not swing with the
    stride and can be trusted to measure drift.
    """
    ys, xs = np.nonzero(mask)
    cut = ys.min() + int((ys.max() - ys.min()) * 0.40)
    return float(xs[ys <= cut].mean())


def bbox(im: Image.Image) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(np.asarray(im)[..., 3] > 16)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def match_colour(frames: dict[int, np.ndarray]) -> None:
    """Pull the sheet onto cat_walk.png, which is already in the paintings.

    The video came back about a stop brighter and harder than the still it was
    made from. One transform is fitted over the whole cycle at once -- per-frame
    matching would make the cat flicker -- over cat pixels only, since the
    transparent surround would drag both mean and spread.
    """
    ref = np.asarray(Image.open(REFERENCE).convert('RGBA')).astype(np.float32)
    rm = ref[..., 3] > 200
    stack = np.concatenate([f.reshape(-1, 4) for f in frames.values()])
    sm = stack[:, 3] > 200
    for c in range(3):
        a = stack[:, c][sm].astype(np.float32)
        b = ref[..., c][rm]
        gain = (b.std() or 1.0) / (a.std() or 1.0)
        offset = b.mean() - a.mean() * gain
        for f in frames.values():
            f[..., c] = np.clip(f[..., c].astype(np.float32) * gain + offset, 0, 255)
        print(f'  channel {c}: gain {gain:.3f} offset {offset:+.1f}')


def paw_slide(sheet: Image.Image, fw: int, fh: int) -> float:
    """How far a planted paw slides backwards per frame.

    In the sheet the cat walks on the spot, so this is the speed it is really
    travelling -- which is what sets the frame rate and the crossing time in
    VelnsScene. A jump of more than 40 px is a different paw landing, not a
    slide, so those pairs are dropped.
    """
    px = np.asarray(sheet)

    def contacts(n: int) -> list[float]:
        cx, cy = (n % COLS) * fw, (n // COLS) * fh
        m = px[cy:cy + fh, cx:cx + fw, 3] > 40
        ys, xs = np.nonzero(m)
        band = ys >= ys.max() - 5
        cols = np.zeros(fw, bool)
        cols[xs[band]] = True
        lab, k = nd.label(cols)
        out = []
        for i in range(1, k + 1):
            where = np.nonzero(lab == i)[0]
            if len(where) >= 6:
                out.append(float(where.mean()))
        return sorted(out)

    seq = [contacts(n) for n in range(COLS * ROWS)]
    slides = []
    for a, b in zip(seq, seq[1:] + seq[:1]):
        for x in a:
            if not b:
                continue
            d = min(b, key=lambda y: abs(y - x)) - x
            if -40 < d < 6:
                slides.append(d)
    return float(np.median(slides))


def main() -> int:
    if not SOURCE.exists():
        print(f'missing {SOURCE}', file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        extract(work)

        rgba, masks = {}, {}
        for i in FRAMES:
            rgba[i], masks[i] = cut_out(work / f'f{i:02d}.png')

        print('colour match to cat_walk.png:')
        match_colour(rgba)

        # Take out the linear drift; keep the sway.
        xs = np.array([anchor_x(masks[i]) for i in FRAMES])
        t = np.arange(len(xs), dtype=np.float64)
        trend = np.polyval(np.polyfit(t, xs, 1), t)
        shift = trend.mean() - trend
        floor = max(np.nonzero(masks[i])[0].max() for i in FRAMES)
        print(f'drift {np.polyfit(t, xs, 1)[0]:.2f} px/frame, removed')

        placed = {}
        for n, i in enumerate(FRAMES):
            im = Image.fromarray(rgba[i], 'RGBA')
            dy = float(floor - np.nonzero(masks[i])[0].max())
            placed[i] = im.transform(
                im.size, Image.AFFINE,
                (1, 0, -float(shift[n]), 0, 1, -dy),
                resample=Image.BICUBIC,
            )

        boxes = [bbox(placed[i]) for i in FRAMES]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        fw = int(round((x1 - x0) * FRAME_H / (y1 - y0)))
        print(f'union bbox {x1 - x0}x{y1 - y0} -> frame {fw}x{FRAME_H}, sheet {fw * COLS}x{FRAME_H * ROWS}')

        sheet = Image.new('RGBA', (fw * COLS, FRAME_H * ROWS), (0, 0, 0, 0))
        for n, i in enumerate(FRAMES):
            cell = placed[i].crop((x0, y0, x1, y1)).resize((fw, FRAME_H), Image.LANCZOS)
            sheet.paste(cell, ((n % COLS) * fw, (n // COLS) * FRAME_H))

        OUT.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(OUT, optimize=True)
        print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)')
        print(f'planted paw slides {paw_slide(sheet, fw, FRAME_H):.1f} px/frame'
              f'  -> assets.ts CAT_PAW_SLIDE, frameWidth {fw}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
