"""
sfx_paper — the map unrolling.

Made from nothing, like the rest of build_synth.py: no samples, no service.
A sheet of old paper being opened is three things at once, and each is a
layer here:

  friction   a continuous hiss of fibre on fibre, band-limited, swelling
             as the sheet moves and dying as it settles
  crackle    the stiff folds giving way: short, uneven clicks of high noise,
             bunched at the start where the sheet is tightest
  flap       the sheet landing flat — a soft low thump at the end

Run:  python3 tools/build_paper.py   (writes public/audio/sfx_paper.{ogg,m4a})
Needs numpy, scipy and ffmpeg.
"""
import os, subprocess, tempfile
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 44100
DUR = 0.95
rng = np.random.default_rng(20260922)
n = int(SR * DUR)
t = np.arange(n) / SR


def band(x, lo, hi, order=4):
    sos = butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return sosfilt(sos, x)


def low(x, hi, order=4):
    sos = butter(order, hi, btype='low', fs=SR, output='sos')
    return sosfilt(sos, x)


# friction: swells over the first half, settles by the end
fr = band(rng.standard_normal(n), 900, 5200)
env = np.clip(t / 0.22, 0, 1) * np.clip((0.78 - t) / 0.5, 0, 1) ** 1.4
wobble = 0.7 + 0.3 * np.sin(2 * np.pi * 7.5 * t + rng.uniform(0, 6))
friction = fr * env * wobble * 0.22

# crackle: bunched towards the start
crackle = np.zeros(n)
times = np.sort(np.concatenate([rng.uniform(0.02, 0.35, 16), rng.uniform(0.35, 0.72, 7)]))
for s in times:
    i = int(s * SR)
    ln = int(SR * rng.uniform(0.004, 0.022))
    if i + ln >= n:
        continue
    burst = band(rng.standard_normal(ln), 1800, 8500, 2)
    burst *= np.exp(-np.linspace(0, rng.uniform(4, 9), ln))
    crackle[i:i + ln] += burst * rng.uniform(0.25, 0.9)
crackle *= 0.5

# flap: the sheet landing
flap = np.zeros(n)
i = int(0.74 * SR)
ln = int(0.16 * SR)
thump = low(rng.standard_normal(ln), 240) * np.exp(-np.linspace(0, 7, ln))
flap[i:i + ln] = thump * 1.6

mix = friction + crackle + flap
# a touch of room, so it is not glued to the ear
room = np.zeros_like(mix)
for d, g in [(0.011, 0.28), (0.023, 0.18), (0.041, 0.1)]:
    k = int(d * SR)
    room[k:] += mix[:-k] * g
mix = mix + room
mix *= 10 ** (-3 / 20) / np.max(np.abs(mix))
# fade the very ends so nothing clicks
f = int(0.006 * SR)
mix[:f] *= np.linspace(0, 1, f)
mix[-f:] *= np.linspace(1, 0, f)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.environ.get('OUT_DIR', os.path.join(root, 'public', 'audio'))
os.makedirs(out, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    wav = os.path.join(tmp, 'p.wav')
    wavfile.write(wav, SR, (mix * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5',
                    os.path.join(out, 'sfx_paper.ogg')], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k',
                    os.path.join(out, 'sfx_paper.m4a')], check=True)
print('wrote', out)
