from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
import json, subprocess
ROOT=Path(__file__).resolve().parent
FF=ROOT.parent/'demo-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
OUT=ROOT/'edit';OUT.mkdir(exist_ok=True)
config=json.loads((ROOT/'edit-timeline.json').read_text())
common=['-an','-r','30','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-video_track_timescale','90000','-movflags','+faststart']
def render(item):
 i,s=item; path=OUT/f'{i:02d}-{s["name"]}.mp4'; src=Path(s['source']); dur=s['duration']
 args=[str(FF),'-hide_banner','-loglevel','error','-y']
 if s.get('still'):
  args+=['-loop','1','-framerate','30','-i',str(src),'-t',str(dur),'-vf','setsar=1']
 else:
  if s.get('capture'):
   args+=['-loop','1','-framerate','30','-i',str(src)]
  else:
   args+=['-ss',str(s['in']),'-i',str(src)]
  args+=['-loop','1','-framerate','30','-i',str(ROOT/s['overlay']),'-t',str(dur)]
  crop=s.get('crop','')
  if crop:crop+=','
  vf=f'[0:v]{crop}scale=1920:870:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:10:color=0xf8f7f1,setsar=1,fps=30[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p[out]'
  args+=['-filter_complex',vf,'-map','[out]']
 args+=common+[str(path)];subprocess.run(args,check=True);print('Rendered '+s['name'],flush=True);return path
with ThreadPoolExecutor(max_workers=3) as pool:paths=list(pool.map(render,enumerate(config['segments'])))
concat=OUT/'join.txt';concat.write_text(''.join("file '"+p.name+"'\n" for p in paths))
final=ROOT/'UVA-AI-Demo-58s.mp4'
subprocess.run([str(FF),'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart','-metadata','title=We Need a Name — UVA AI demo',str(final)],check=True)
print(str(final),flush=True)
