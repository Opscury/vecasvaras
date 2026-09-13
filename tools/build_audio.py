#!/usr/bin/env python3
"""Raw ElevenLabs SFX clip -> game-ready .ogg/.m4a.

Three things the raw output always needs:
  * one-shots arrive as several hits; isolate one
  * ambient beds have a hard start and end; make them loop on themselves
  * levels are all over the place; normalise so the mix is predictable

No module-level side effects: import it, call it, nothing happens on its own.
"""
import numpy as np, subprocess, wave, os, sys

SR = 44100
SCRATCH = '/tmp'          # the mounted folder refuses deletes, so scratch elsewhere

# ---------- io ----------

def decode(src, mono=False, highpass=38):
    ch = 1 if mono else 2
    af = f'highpass=f={highpass}' if highpass else 'anull'
    raw = subprocess.run(['ffmpeg','-v','error','-i',src,'-ac',str(ch),'-ar',str(SR),
                          '-af',af,'-f','s16le','-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float32).reshape(-1, ch) / 32768.0

def encode(x, stem, mono, bed=False):
    """One-shots stay crisp; beds are encoded hard.

    A bed is broadband noise at 25% volume under everything else, where vorbis
    q1 is indistinguishable from q5 and less than half the bytes. On a game that
    already ships 4MB of paintings, three beds at q5 would have been the
    single largest download after the backgrounds."""
    x = np.clip(x, -1, 1)
    wav = os.path.join(SCRATCH, os.path.basename(stem) + '.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(x.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    vq = '1' if bed else ('3' if mono else '5')
    ab = '56k' if bed else ('64k' if mono else '96k')
    subprocess.run(['ffmpeg','-v','error','-y','-i',wav,'-c:a','libvorbis',
                    '-q:a', vq, stem+'.ogg'], check=True)
    subprocess.run(['ffmpeg','-v','error','-y','-i',wav,'-c:a','aac',
                    '-b:a', ab, stem+'.m4a'], check=True)
    os.remove(wav)
    return os.path.getsize(stem+'.ogg')//1024, os.path.getsize(stem+'.m4a')//1024

# ---------- dsp ----------

def envelope(x, smooth_ms=3):
    e = np.abs(x).max(axis=1)
    k = max(1, int(SR*smooth_ms/1000))
    return np.convolve(e, np.ones(k)/k, mode='same')

def peak_norm(x, db=-2.0):
    p = np.abs(x).max()
    return x if p < 1e-6 else x * (10**(db/20) / p)

def rms_norm(x, db=-24.0, ceil_db=-3.0):
    r = float(np.sqrt((x.astype(np.float64)**2).mean()))
    if r > 1e-9: x = x * (10**(db/20) / r)
    p = np.abs(x).max(); lim = 10**(ceil_db/20)
    return x * (lim/p) if p > lim else x

def edges(x, in_ms=2, out_ms=14):
    fi, fo = int(SR*in_ms/1000), int(SR*out_ms/1000)
    x = x.copy()
    if fi: x[:fi]  *= np.linspace(0,1,fi,dtype=np.float32)[:,None]
    if fo: x[-fo:] *= np.linspace(1,0,fo,dtype=np.float32)[:,None]
    return x

def isolate_hit(x, pre_ms=14, decay_db=-50, hold_ms=70, max_ms=1200):
    """Take the loudest hit and let it ring out. Requires the envelope to STAY
    under the floor for hold_ms, or a momentary dip truncates the tail."""
    env = envelope(x); peak = int(np.argmax(env)); floor = env[peak]*10**(decay_db/20)
    s = peak
    while s > 0 and env[s] > floor: s -= 1
    s = max(0, s - int(SR*pre_ms/1000))
    hold = int(SR*hold_ms/1000); lim = min(len(env), peak + int(SR*max_ms/1000))
    e, quiet = peak, 0
    while e < lim-1:
        quiet = quiet+1 if env[e] <= floor else 0
        if quiet >= hold: break
        e += 1
    return x[s:e]

def window_hit(x, pre_ms=10, len_ms=110):
    """For a short percussive sound returned as a continuous rattle there is no
    gap to find — take a fixed window on the loudest peak."""
    env = envelope(x, 2); peak = int(np.argmax(env))
    s = max(0, peak - int(SR*pre_ms/1000))
    return x[s: s + int(SR*len_ms/1000)]

def make_loop(x, fade_s=2.5):
    n = len(x); N = int(SR*fade_s)
    if n <= 2*N: raise ValueError(f'{n/SR:.1f}s clip too short for a {fade_s}s crossfade')
    R = n - N
    head, tail = x[:R].copy(), x[R:]
    w = np.linspace(0,1,N,dtype=np.float32)[:,None]
    head[:N] = head[:N]*w + tail*(1-w)
    return head

# ---------- recipes ----------

def one_shot(src, stem, mode='isolate', **kw):
    x = decode(src, mono=True)
    y = window_hit(x, **kw) if mode == 'window' else isolate_hit(x, **kw)
    y = edges(peak_norm(y), out_ms=25 if mode == 'window' else 14)
    o, m4 = encode(y, stem, True)
    print(f'  {os.path.basename(stem):14s} {len(x)/SR:5.2f}s raw -> {len(y)/SR*1000:6.0f}ms   ogg {o}KB  m4a {m4}KB')

def ambient(src, stem, fade_s=2.5, db=-24.0):
    x = decode(src, mono=False)
    y = rms_norm(make_loop(x, fade_s), db)
    o, m4 = encode(y, stem, False)
    seam = float(np.abs(y[0]-y[-1]).max())
    print(f'  {os.path.basename(stem):14s} {len(x)/SR:5.2f}s raw -> {len(y)/SR:5.2f}s loop  ogg {o}KB  m4a {m4}KB  seam {seam:.4f}')

if __name__ == '__main__':
    print('one-shots:')
    one_shot('click_raw.mp3',  'sfx_click',  mode='window', len_ms=110)
    one_shot('sickle_raw.mp3', 'sfx_sickle', mode='isolate', max_ms=1200)
    print('ambient:')
    ambient('village_raw.mp3', 'amb_village', fade_s=2.5)
