"""Converts the cut-out masters in art-src/ into the WebP files the game loads.

The game ships WebP (see src/scenes/assets.ts); the PNGs are the masters and
live in art-src/, outside public/, so they are never deployed. Run this after
adding or repainting a cut-out:

    python tools/build_webp.py            # every PNG that assets.ts asks for
    python tools/build_webp.py elder.png  # just the named ones

Quality 82 was compared side by side against the PNGs at full size (Sept 2026)
and is indistinguishable on the painted art while being 5–10x smaller. Alpha
is kept lossless.
"""
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src'
OUT = ROOT / 'public' / 'art'
QUALITY = 82


def wanted() -> list[str]:
    """Every .webp that assets.ts loads, as the PNG master it is made from."""
    assets = (ROOT / 'src' / 'scenes' / 'assets.ts').read_text(encoding='utf-8')
    return sorted({m[:-5] + '.png' for m in re.findall(r"'([\w]+\.webp)'", assets)})


def main() -> None:
    names = sys.argv[1:] or wanted()
    for name in names:
        src = SRC / name
        if not src.exists():
            print(f'  missing master: {src.relative_to(ROOT)}')
            continue
        dst = OUT / (src.stem + '.webp')
        Image.open(src).save(dst, 'WEBP', quality=QUALITY, method=6, alpha_quality=100)
        print(f'  {name:28} {src.stat().st_size // 1024:5} KB -> {dst.stat().st_size // 1024:4} KB')


if __name__ == '__main__':
    main()
