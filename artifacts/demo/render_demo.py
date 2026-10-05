from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from concurrent.futures import ThreadPoolExecutor
import json,subprocess
ROOT=Path(__file__).resolve().parent
FF=ROOT.parent/'demo-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
FONT=ROOT.parent/'demo-tools/fonts/NotoSans-Bold.ttf'
OUT=ROOT/'edit';OUT.mkdir(exist_ok=True)
source=ROOT/'raw/tab-demo-145617.webm'
captions=[
 ('Choose a name. Start learning.','A random four-digit tag. No account needed.'),
 ('Math and economics. Seven levels each.',''),
 ('Write answers in real math notation.',''),
 ('Build your streak. Watch your plant grow.',''),
 ('Three correct answers. A plant. A new level.',''),
 ('30 plants. Five rarities unlocked by level.','Exotic plants: 5% chance, only at level 7.'),
 ('Explore supply, demand and economic shocks.','Predict the effects. Explain why.'),
 ('UVA AI gives hints.','Asking resets your streak to zero.'),
 ('Live leaderboard.','Rarer discoveries earn more points.')]
for i,(main,detail) in enumerate(captions):
 im=Image.new('RGBA',(1920,1080),(0,0,0,0));d=ImageDraw.Draw(im)
 d.rectangle((0,890,1920,1080),fill='#222722')
 f=ImageFont.truetype(str(FONT),54);sub=ImageFont.truetype(str(FONT),48)
 d.text((960,934 if detail else 980),main,font=f,fill='white',anchor='mm')
 if detail:d.text((960,1011),detail,font=sub,fill='#d9e1d3',anchor='mm')
 im.save(OUT/f'caption-{i}.png')
segments=[
 ('welcome',ROOT/'raw/01-welcome.mov',4.8,5,0),
 ('modules',source,6,4,1),
 ('math-first',source,17.2,6,2),
 ('math-second',source,36,4,3),
 ('math-third',source,55.2,5,4),
 ('level-up',source,68.2,3,4),
 ('rarities',source,86,3,5),
 ('collection',source,95.5,3,5),
 ('econ-scenario',source,106,2.5,6),
 ('econ-predictions',source,110,2,6),
 ('econ-feedback',source,121,3.5,6),
 ('ai-helper',source,135,8,7),
 ('leaderboard',source,170,5,8),
 ('end-card',ROOT/'end-card.png',0,3,None)]
common=['-an','-r','30','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-video_track_timescale','90000','-movflags','+faststart']
def render(item):
 i,(name,src,start,dur,cap)=item
 path=OUT/f'{i:02d}-{name}.mp4'
 args=[str(FF),'-hide_banner','-loglevel','error','-y']
 if cap is None:
  args+=['-loop','1','-framerate','30','-i',str(src),'-t',str(dur),'-vf','setsar=1']
 else:
  args+=['-ss',str(start),'-i',str(src),'-loop','1','-framerate','30','-i',str(OUT/f'caption-{cap}.png'),'-t',str(dur),'-filter_complex','[0:v]scale=1920:870:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:10:color=0xf8f7f1,setsar=1,fps=30[v];[v][1:v]overlay=0:0:format=auto,format=yuv420p[out]','-map','[out]']
 args+=common+[str(path)]
 subprocess.run(args,check=True)
 print(f'Rendered {i:02d} {name}',flush=True)
 return path
with ThreadPoolExecutor(max_workers=3) as pool: paths=list(pool.map(render,enumerate(segments)))
concat=OUT/'join.txt';concat.write_text(''.join("file '"+p.name+"'\n" for p in paths))
final=ROOT/'We-Need-a-Name-Demo-57s.mp4'
subprocess.run([str(FF),'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart','-metadata','title=We Need a Name — 57-second demo',str(final)],check=True)

def ts(t):
 return f'{int(t)//3600:02d}:{int(t)//60%60:02d}:{int(t)%60:02d},{round((t-int(t))*1000):03d}'
items=[];t=0;lastcap=None
for name,src,start,dur,cap in segments:
 if cap is not None:
  if items and cap==lastcap:items[-1]['end']=t+dur
  else: items.append({'start':t,'end':t+dur,'text':'\n'.join(x for x in captions[cap] if x)})
 t+=dur;lastcap=cap
(ROOT/'We-Need-a-Name-Demo.srt').write_text('\n\n'.join(f"{i+1}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}" for i,c in enumerate(items))+'\n')
(ROOT/'edit-timeline.json').write_text(json.dumps({'duration':t,'segments':[{'name':x[0],'source':str(x[1]),'in':x[2],'duration':x[3],'caption':x[4]} for x in segments],'captions':items},indent=2))
print(f'COMPLETE {final} duration={t}',flush=True)
