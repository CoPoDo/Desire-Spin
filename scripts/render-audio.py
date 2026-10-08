#!/usr/bin/env python3
"""Original Desire Spin sampled score. Offline deterministic DSP; never runs in browser.
Requires numpy and ffmpeg. Voice cues are reproduced separately by render-olympus-voice.py.
"""
from pathlib import Path
import argparse, hashlib, json, subprocess, tempfile, wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/audio/v3'; SR=32000
rng=np.random.default_rng(271828)
THEMES={
 'olympus':(146.83,'bronze',.27), 'bonanza':(220.,'marimba',.12),
 'sugar':(261.63,'glass',.15), 'wanted':(110.,'string',.08),
 'wolf':(130.81,'wood',.28), 'pharaoh':(146.83,'string',.31),
 'juan':(196.,'string',.12), 'bass':(164.81,'wood',.15), 'lounge':(174.61,'marimba',.08)}

def noise(n,cut=1800):
 x=rng.normal(size=n); f=np.fft.rfftfreq(n,1/SR); y=np.fft.irfft(np.fft.rfft(x)*np.exp(-(f/cut)**4),n)
 return y/(np.std(y)+1e-8)

def note(f,d=.7,timbre='wood'):
 t=np.arange(int(d*SR))/SR; y=np.zeros(len(t)); attack=(1-np.exp(-t/0.006))
 if timbre=='glass': parts=[(1,1,3),(2.76,.18,5),(5.4,.035,9)]
 elif timbre=='bronze': parts=[(1,1,2.8),(2,.32,4),(3,.13,6),(4.1,.04,8)]
 elif timbre=='string': parts=[(h,1/h**1.55,2+h*.7) for h in range(1,9)]
 elif timbre=='marimba': parts=[(1,1,5),(3.99,.11,11),(9.9,.025,25)]
 else: parts=[(1,1,5),(2.72,.16,13),(5.18,.04,24)]
 for ratio,amp,decay in parts:
  y+=amp*np.sin(2*np.pi*f*ratio*t)*np.exp(-t*decay)
 y*=attack*np.minimum((d-t)/.045,1)
 return y*.22

def mix(dst,x,at=0,g=1):
 i=int(at*SR); n=min(len(x),len(dst)-i)
 if n>0:dst[i:i+n]+=x[:n]*g

def hit(d=.28,f=105,weight=.11):
 t=np.arange(int(d*SR))/SR
 return (noise(len(t),950)*np.exp(-t*40)*.048+np.sin(2*np.pi*(f*t+f*.012*(1-np.exp(-t/0.03))))*np.exp(-t*20)*weight)*(1-np.exp(-t/.002))*np.minimum((d-t)/.025,1)

def air(d=.5,cut=1100,level=.035):
 t=np.arange(int(d*SR))/SR
 return noise(len(t),cut)*np.sin(np.pi*t/d)**1.7*level

def finish(y,room,peak=.48):
 # Short stereo early reflections, not a smeared hall/echo. Preserve headroom.
 z=np.zeros((len(y)+int(SR*.28),2)); z[:len(y),:]=y[:,None]
 for delay,amount in [(0.027,.3),(0.053,.22),(0.089,.14),(0.137,.07),(0.211,.025)]:
  for ch in range(2):
   n=int((delay+ch*.006)*SR); z[n:n+len(y),ch]+=y*room*amount
 z-=z.mean(axis=0); p=np.max(np.abs(z));
 if p>peak:z*=peak/p
 z[-320:]*=np.linspace(1,0,320)[:,None]
 return z

def export(path,y,bitrate='112k'):
 path.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(suffix='.wav') as f:
  with wave.open(f.name,'wb') as w:
   w.setnchannels(1 if y.ndim==1 else y.shape[1]); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y,-1,1)*32767).astype('<i2').tobytes())
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',f.name,'-codec:a','libmp3lame','-b:a',bitrate,str(path)],check=True)
 return {'file':str(path.relative_to(OUT)),'duration':round(len(y)/SR,3),'peakDb':round(20*np.log10(np.max(np.abs(y))+1e-10),2),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

def effects(music_only=False):
 manifest=[]
 if music_only:
  manifest=[x for x in json.loads((OUT/"manifest.json").read_text())["files"] if "/music-" not in x["file"]]
 for theme,(root,timbre,room) in THEMES.items():
  for event in ([] if music_only else ['click','tick','spin','drop','cascade-clear','cascade-fall','cascade-land','win','big-win','mega-win','multiplier','lightning-strike','thunder','scatter-land','free-spins-trigger','free-spins-end','coin','anticipation','switch']):
   duration={'click':.10,'tick':.09,'spin':.48,'drop':.22,'cascade-clear':.22,'cascade-fall':.34,'cascade-land':.26,'win':.62,'big-win':1.55,'mega-win':2.15,'multiplier':.9,'lightning-strike':.8,'thunder':1.2,'scatter-land':.65,'free-spins-trigger':2.3,'free-spins-end':1.6,'coin':.22,'anticipation':1.1,'switch':.95}[event]
   y=np.zeros(int(duration*SR))
   if event in ['click','tick']:
    mix(y,hit(duration,root*1.3,.035 if event=='tick' else .055)); mix(y,note(root*2,duration,'wood'),g=.17)
   elif event in ['drop','cascade-land']:
    mix(y,hit(duration,root*.65,.18));mix(y,note(root,duration,timbre),.018,.26)
   elif event=='cascade-clear':
    mix(y,air(.18,2100,.032));
    for i in range(3):mix(y,note(root*(2+i*.12),.13,timbre),i*.028,.19)
   elif event in ['spin','cascade-fall']:
    mix(y,air(duration,700 if theme=='olympus' else 1400,.055))
    if event=='spin':mix(y,hit(.18,root*.65,.10))
   elif event in ['thunder','lightning-strike']:
    t=np.arange(len(y))/SR
    y=noise(len(y),500)*(1-np.exp(-t/.012))*np.exp(-t*4)*.13
    mix(y,hit(.3,62,.20));mix(y,air(.13,1800,.035))
   else:
    sequences={'win':([0,7,12],.095),'coin':([12,19],.025),'multiplier':([0,7,12,19],.10),'scatter-land':([7,12],.06),'big-win':([0,4,7,12],.16),'mega-win':([0,7,12,16,19,24],.18),'free-spins-trigger':([0,7,12,7,16,19,24],.18),'free-spins-end':([19,16,12,7,0],.19),'anticipation':([0,7,10,14],.19),'switch':([0,7,12,19],.12)}
    seq,step=sequences[event]
    minor=theme in ['olympus','wolf','pharaoh','wanted']
    for i,semitone in enumerate(seq):
     if minor and semitone%12==4:semitone-=1
     mix(y,note(root*2**(semitone/12),min(.95,duration-i*step),timbre),i*step,.7 if event=='coin' else .9)
    if event in ['big-win','mega-win','free-spins-trigger','free-spins-end']:
     mix(y,hit(.35,root/2,.12));
     for semitone in [0,3 if minor else 4,7]:mix(y,note(root*2**(semitone/12),duration,'bronze'),.02,.32)
    if event in ['multiplier','scatter-land','switch']:mix(y,air(.4,1400,.023))
   manifest.append(export(OUT/theme/f'{event}.mp3',finish(y,room)))
  # An airy, sparse 16s bed, composed separately for each palette. No old buzz-pad.
  for intensity in ['base','free']:
   d=16.; y=np.zeros(int(d*SR)); t=np.arange(len(y))/SR
   for s in [0,7,15 if theme in ['olympus','wolf','pharaoh','wanted'] else 16]:
    f=root/2*2**(s/12);y+=np.sin(2*np.pi*f*t+0.07*np.sin(2*np.pi*.25*t))*.012*np.sin(np.pi*t/d)**2
   for i,s in enumerate([0,7,12,10,7,3,7,0] if intensity=='free' else [0,7,3,7]):
    mix(y,note(root*2**(s/12),2.4,timbre),.2+i*(1.85 if intensity=='free' else 3.6),.16)
   y[:1600]*=np.linspace(0,1,1600);y[-6400:]*=np.linspace(1,0,6400)
   manifest.append(export(OUT/theme/f'music-{intensity}.mp3',finish(y*6,room,peak=.58),'96k'))
 (OUT/'manifest.json').write_text(json.dumps({'version':3,'sampleRate':SR,'originalDSP':True,'files':manifest},indent=2)+'\n')
 print(f'Rendered {len(manifest)} original stereo assets',flush=True)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--music-only',action='store_true');a=p.parse_args()
 effects(a.music_only)
