#!/usr/bin/env python3
"""Synthesised sounds for Vecās Varas -> public/audio/*.ogg + *.m4a.

Everything here is made from nothing — no samples, no generator service — so
there is no licence question to answer for any of it.

  mus_kokle_jumis   an original kokle line under the harvest verse (G mixolydian)
  mus_kokle_velns   the same instrument under the bog verse, slower (D dorian)
  sfx_frog          a low purring croak, for the plank that holds
  sfx_gust          a gust of wind through reeds, for the wind riddle
  sfx_splash        sinking to the knees in the bog
  sfx_sheaf         a sheaf of rye bound and set down
  sfx_chime         one kokle pluck and its fifth, for a belief found

The kokle is Karplus-Strong: a burst of noise in a delay line the length of
one period, averaged on every pass, which is a plucked string in about four
lines. A body resonance and a short room are added after.

The two melodies are written for this game in the idiom of Latvian
recitative song — narrow range, repeated notes, a falling cadence onto the
tonic — and are not transcriptions of any traditional tune.

    cd tools && python3 build_synth.py

Needs numpy, scipy and ffmpeg. Deterministic: the same script gives the same
files.
"""
import importlib.util, io, contextlib, os, sys
import numpy as np
from scipy.signal import lfilter, butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('ba', os.path.join(HERE, 'build_audio.py'))
ba = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(ba)
SR = ba.SR
OUT = os.path.join(HERE, '..', 'public', 'audio')

rng = np.random.default_rng(1888)


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------- the instrument ----------

def pluck(freq, dur, bright=0.55, decay=0.9985, seed=0):
    """One Karplus-Strong string. `bright` low-passes the initial burst, like
    plucking nearer the middle of the string; `decay` is the loss per pass."""
    n = int(SR * dur)
    period = max(2, int(round(SR / freq - 0.5)))
    r = np.random.default_rng(seed)
    burst = r.uniform(-1, 1, period)
    # soften the burst: a one-pole low-pass, brighter = less smoothing
    a = 1 - bright
    burst = lfilter([1 - a], [1, -a], burst)
    burst -= burst.mean()
    x = np.zeros(n)
    x[:period] = burst
    den = np.zeros(period + 2)
    den[0] = 1.0
    den[period] = -decay * 0.5
    den[period + 1] = -decay * 0.5
    y = lfilter([1.0], den, x)
    # a touch of pick noise at the very start, the "tsk" of a nail on metal
    tick = r.uniform(-1, 1, int(SR * 0.006)) * np.linspace(1, 0, int(SR * 0.006))
    y[: len(tick)] += tick * 0.25
    return y


def body(x):
    """A wooden box under the strings: two gentle resonances and a roll-off."""
    out = x.copy()
    for f, q, g in ((240, 2.2, 0.55), (880, 3.0, 0.35)):
        sos = butter(2, [f / (1 + 1 / q), f * (1 + 1 / q)], btype='band', fs=SR, output='sos')
        out += sosfilt(sos, x) * g
    sos = butter(2, 6500, btype='low', fs=SR, output='sos')
    return sosfilt(sos, out)


def room(x, seconds=1.1, wet=0.26, seed=7):
    """A small wooden room: decaying noise as an impulse response, different
    per side so the stereo image is wide without anything panned."""
    r = np.random.default_rng(seed)
    n = int(SR * seconds)
    t = np.arange(n) / SR
    env = np.exp(-t * 6.0 / seconds)
    outs = []
    for side in range(2):
        ir = r.standard_normal(n) * env
        sos = butter(2, 4200, btype='low', fs=SR, output='sos')
        ir = sosfilt(sos, ir)
        ir /= np.sqrt((ir ** 2).sum())
        w = np.convolve(x, ir)
        w = np.pad(w, (0, len(x) + n - len(w)))
        d = np.pad(x, (0, n))
        outs.append(d * (1 - wet) + w * wet * 1.6)
    return np.stack(outs, axis=1)


def phrase(notes, beat, drone, total=None, seed=0):
    """`notes` is a list of (midi or None, beats). The drone is re-plucked on
    every bar line (every 4 eighths), softly, the way a kokle player lets the
    low strings ring under the tune."""
    length = sum(b for _, b in notes) * beat
    total = total or length + 2.4
    buf = np.zeros(int(SR * total))
    t = 0.0
    k = 0
    for m, beats in notes:
        if m is not None:
            ring = beats * beat + 1.6
            s = pluck(midi_hz(m), ring, bright=0.62, decay=0.9982, seed=seed + k)
            # a slightly detuned second course, as on a strung instrument with
            # imperfect tuning — it is what makes the note shimmer
            s += 0.45 * pluck(midi_hz(m) * 1.0035, ring, bright=0.5, decay=0.998, seed=seed + 500 + k)
            env = np.ones(len(s))
            tail = int(SR * 0.08)
            env[-tail:] = np.linspace(1, 0, tail)
            s *= env
            i = int(SR * t)
            j = min(len(buf), i + len(s))
            buf[i:j] += s[: j - i] * (0.95 if k % 4 == 0 else 0.8)
            k += 1
        t += beats * beat
    bar = 0.0
    while bar < length:
        for dm, g in drone:
            s = pluck(midi_hz(dm), 4 * beat + 2.0, bright=0.35, decay=0.9992, seed=seed + 900 + int(bar * 10))
            i = int(SR * bar)
            j = min(len(buf), i + len(s))
            buf[i:j] += s[: j - i] * g
        bar += 4 * beat
    y = body(buf)
    y = room(y)
    # fade the very end so the file stops on silence, not on a cut
    fade = int(SR * 1.2)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return ba.peak_norm(y.astype(np.float32), -3.0)


G4, A4, B4, C5, D5, E5 = 67, 69, 71, 72, 74, 76
G3, D4 = 55, 62

JUMIS = [
    (D5, 1), (D5, 1), (B4, 1), (C5, 1),
    (D5, 1), (D5, 1), (B4, 1), (G4, 1),
    (A4, 1), (A4, 1), (B4, 1), (C5, 1),
    (B4, 1), (A4, 1), (G4, 2),
    (D5, 1), (E5, 1), (D5, 1), (C5, 1),
    (B4, 1), (C5, 1), (A4, 1), (G4, 1),
    (A4, 1), (B4, 1), (A4, 1), (G4, 1),
    (G4, 4),
]

D4v, E4v, F4v, G4v, A4v, C5v = 62, 64, 65, 67, 69, 72
D3, A3 = 50, 57

VELNS = [
    (A4v, 1), (A4v, 1), (F4v, 1), (G4v, 1),
    (A4v, 2), (F4v, 1), (D4v, 1),
    (E4v, 1), (E4v, 1), (F4v, 1), (G4v, 1),
    (F4v, 1), (E4v, 1), (D4v, 2),
    (A4v, 1), (C5v, 1), (A4v, 1), (G4v, 1),
    (F4v, 1), (G4v, 1), (E4v, 1), (D4v, 1),
    (D4v, 4),
]


# ---------- the one-shots ----------

def env_ar(n, attack, release):
    a = int(SR * attack)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    t = np.arange(n - a) / SR
    e[a:] = np.exp(-t / release)
    return e


def frog():
    """A common frog's low purr: a run of short resonant pulses, twice."""
    out = np.zeros(int(SR * 0.95))
    for start, pulses, rate in ((0.02, 9, 26.0), (0.47, 7, 24.0)):
        for p in range(pulses):
            t0 = start + p / rate
            n = int(SR * 0.03)
            tt = np.arange(n) / SR
            f = 420 + 60 * np.sin(p)
            ping = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 140)
            ping += 0.5 * np.sin(2 * np.pi * f * 2.1 * tt) * np.exp(-tt * 190)
            i = int(SR * t0)
            out[i : i + n] += ping * (0.6 + 0.4 * np.sin(np.pi * p / pulses))
    sos = butter(2, [180, 1600], btype='band', fs=SR, output='sos')
    out = sosfilt(sos, out)
    return ba.edges(ba.peak_norm(out[:, None].astype(np.float32)), out_ms=40)


def gust():
    """Wind through reeds: brown-ish noise under a band that sweeps up and
    back, swelling in and dying away, drifting from left to right."""
    n = int(SR * 2.4)
    white = rng.standard_normal(n)
    # brown noise: integrated white, with the drift taken out by a high-pass
    brown = sosfilt(butter(1, 40, btype='high', fs=SR, output='sos'), np.cumsum(white))
    t = np.arange(n) / SR
    out = np.zeros(n)
    hop = int(SR * 0.05)
    for i in range(0, n, hop):
        c = 350 + 900 * np.sin(np.pi * min(1, t[i] / 2.2)) ** 1.5
        sos = butter(2, [c * 0.6, c * 1.6], btype='band', fs=SR, output='sos')
        seg = sosfilt(sos, white[max(0, i - hop) : i + hop])[-(min(hop, n - i)) :]
        out[i : i + len(seg)] = seg
    out = 0.7 * out + 0.3 * brown / (np.abs(brown).max() + 1e-9)
    e = np.sin(np.pi * np.clip(t / 2.4, 0, 1)) ** 1.6
    out *= e
    pan = np.clip(t / 2.4, 0, 1)
    st = np.stack([out * np.cos(pan * np.pi / 2), out * np.sin(pan * np.pi / 2)], axis=1)
    return ba.edges(ba.peak_norm(st.astype(np.float32), -3.0), out_ms=60)


def splash():
    """Knee-deep in a bog: a wet slap, then a few bubbles coming up."""
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # the slap: noise under a falling low-pass
    for i in range(0, n, 512):
        c = max(300, 3800 * np.exp(-t[i] * 9))
        sos = butter(2, c, btype='low', fs=SR, output='sos')
        seg = sosfilt(sos, noise[i : i + 512])
        out[i : i + len(seg)] = seg
    out *= env_ar(n, 0.004, 0.16)
    # bubbles: short rising sines
    for k in range(5):
        t0 = 0.18 + k * 0.09 + rng.uniform(0, 0.04)
        m = int(SR * rng.uniform(0.02, 0.05))
        tt = np.arange(m) / SR
        f0 = rng.uniform(280, 420)
        f = f0 * (1 + tt * 18)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 60)
        i = int(SR * t0)
        out[i : i + m] += b * 0.35
    sos = butter(2, 60, btype='high', fs=SR, output='sos')
    out = sosfilt(sos, out)
    return ba.edges(ba.peak_norm(out[:, None].astype(np.float32)), out_ms=60)


def sheaf():
    """A bound sheaf set down: a soft thump and a spill of dry crackle."""
    n = int(SR * 0.34)
    t = np.arange(n) / SR
    thump = sosfilt(butter(2, 180, btype='low', fs=SR, output='sos'), rng.standard_normal(n))
    thump *= env_ar(n, 0.003, 0.03) * 2.5
    crackle = np.zeros(n)
    for _ in range(90):
        i = int(rng.uniform(0.004, 0.26) * SR)
        m = int(SR * 0.004)
        crackle[i : i + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / 30) * rng.uniform(0.2, 1)
    crackle = sosfilt(butter(2, 2200, btype='high', fs=SR, output='sos'), crackle)
    crackle *= np.exp(-t * 7)
    out = thump + crackle * 0.8
    return ba.edges(ba.peak_norm(out[:, None].astype(np.float32)), out_ms=30)


def chime():
    """One kokle note and its fifth, left to ring."""
    a = pluck(midi_hz(81), 2.2, bright=0.7, decay=0.9988, seed=31)
    e = pluck(midi_hz(88), 2.2, bright=0.7, decay=0.9985, seed=32)
    s = np.zeros(int(SR * 2.4))
    s[: len(a)] += a
    d = int(SR * 0.09)
    s[d : d + len(e)] += e * 0.7
    y = room(body(s), seconds=1.4, wet=0.3)
    fade = int(SR * 0.6)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return ba.peak_norm(y.astype(np.float32), -3.0)


def write(x, stem):
    mono = x.shape[1] == 1
    o, m4 = ba.encode(x, os.path.join(OUT, stem), mono)
    print(f'  {stem:18s} {len(x) / SR:5.2f}s  ogg {o}KB  m4a {m4}KB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    print('music:')
    write(phrase(JUMIS, 0.34, [(G3, 0.32), (D4, 0.18)], seed=100), 'mus_kokle_jumis')
    write(phrase(VELNS, 0.42, [(D3, 0.34), (A3, 0.2)], seed=200), 'mus_kokle_velns')
    print('one-shots:')
    write(frog(), 'sfx_frog')
    write(gust(), 'sfx_gust')
    write(splash(), 'sfx_splash')
    write(sheaf(), 'sfx_sheaf')
    write(chime(), 'sfx_chime')
