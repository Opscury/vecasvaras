"""Cut a steady window out of each sourced field recording and make it loop.

The window offsets came from analyse.py: for each candidate it found the 30s
stretch with the least variation in level, which is the best thing to loop —
a bed with a distinctive event in it announces its own period.
"""
import importlib.util, sys, io, contextlib, subprocess, os
import numpy as np

spec = importlib.util.spec_from_file_location('ba', 'build_audio.py')
ba = importlib.util.module_from_spec(spec); sys.modules['ba'] = spec and ba
with contextlib.redirect_stdout(io.StringIO()): spec.loader.exec_module(ba)
SR = ba.SR
OUT = '../public/audio/'

def window(src, start, length=30.0, extra_af=None):
    af = ['highpass=f=32']
    if extra_af: af += extra_af
    raw = subprocess.run(
        ['ffmpeg','-v','error','-ss',str(start),'-t',str(length),'-i',src,
         '-ac','2','-ar',str(SR),'-af',','.join(af),'-f','s16le','-'],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float32).reshape(-1,2)/32768.0

JOBS = [
    # key,          source,            start,  level,   extra filtering
    ('amb_village', 'cand/village_a.mp3',  90.0, -25.0, None),
    ('amb_field',   'cand/field_a.mp3',     6.0, -25.0, None),
    # 79% of this recording's energy is above 2kHz — lovely on its own, but it
    # reads as hiss in a cold twilight scene. Shelve the top down and give it a
    # little weight underneath so it sits in the bog's register.
    ('amb_bog',     'cand/bog_a.mp3',     168.0, -26.0,
     ['highshelf=f=4500:g=-5', 'lowshelf=f=200:g=2.5']),
]

for key, src, start, lvl, af in JOBS:
    x = window(src, start, 30.0, af)
    y = ba.rms_norm(ba.make_loop(x, fade_s=2.5), db=lvl)
    o, m4 = ba.encode(y, OUT + key, mono=False, bed=True)
    seam = float(np.abs(y[0]-y[-1]).max())
    print(f'{key:12s} {src.split("/")[-1]:16s} @{start:5.0f}s -> {len(y)/SR:5.2f}s loop  '
          f'ogg {o}KB  m4a {m4}KB  seam {seam:.4f}')
