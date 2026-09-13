import numpy as np, subprocess, sys, os, glob
SR=22050
def load(f):
    raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','s16le','-'],
                       capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype='<i2').astype(np.float32)/32768.0

def db(x): return 20*np.log10(max(x,1e-9))

def report(f):
    x=load(f); n=len(x); dur=n/SR
    hop=SR//2                                  # half-second frames
    fr=x[:n//hop*hop].reshape(-1,hop)
    rms=np.sqrt((fr**2).mean(1)+1e-12)
    # spectral centroid on a coarse STFT
    win=1024
    m=x[:n//win*win].reshape(-1,win)*np.hanning(win)
    S=np.abs(np.fft.rfft(m,axis=1))+1e-9
    freqs=np.fft.rfftfreq(win,1/SR)
    cent=float((S*freqs).sum()/S.sum())
    band=lambda lo,hi: float(S[:,(freqs>=lo)&(freqs<hi)].sum()/S.sum())
    # steadiest 30s window = lowest std of frame RMS
    W=int(30/0.5)
    best=(1e9,0)
    if len(rms)>W:
        for i in range(0,len(rms)-W,4):
            s=float(rms[i:i+W].std()/max(rms[i:i+W].mean(),1e-9))
            if s<best[0]: best=(s,i*0.5)
    crest=db(float(np.abs(x).max()))-db(float(np.sqrt((x**2).mean())))
    print(f"{os.path.basename(f):14s} {dur:6.1f}s  rms {db(float(rms.mean())):6.1f}dB  "
          f"var {float(rms.std()/rms.mean()):4.2f}  crest {crest:4.1f}dB  cent {cent:5.0f}Hz  "
          f"lo{band(20,200):.2f} mid{band(200,2000):.2f} hi{band(2000,11000):.2f}  "
          f"steadiest30s@{best[1]:5.0f}s (var {best[0]:.2f})")

for f in sorted(glob.glob('*.mp3')):
    try: report(f)
    except Exception as e: print(f'{f}: {e}')
