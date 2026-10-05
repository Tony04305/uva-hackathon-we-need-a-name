from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess,re
ROOT=Path(__file__).resolve().parent
FF=ROOT.parent/'demo-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
VIDEO=ROOT/'UVA-AI-Demo-58s.mp4'
OUT=ROOT/'review';OUT.mkdir(exist_ok=True)
config=json.loads((ROOT/'edit-timeline.json').read_text())
font=ImageFont.truetype(str(ROOT.parent/'demo-tools/fonts/NotoSans-Bold.ttf'),16)
card=Image.new('RGB',(1920,4*300),'#eeeae0')
t=0
frames=[]
for i,s in enumerate(config['segments']):
 pos=t+s['duration']/2
 path=OUT/f'{i:02d}-{s["name"]}.png'
 subprocess.run([str(FF),'-hide_banner','-loglevel','error','-y','-ss',str(pos),'-i',str(VIDEO),'-frames:v','1',str(path)],check=True)
 frame=Image.open(path).convert('RGB');assert frame.size==(1920,1080)
 x=(i%4)*480;y=(i//4)*300
 card.paste(frame.resize((480,270),Image.Resampling.LANCZOS),(x,y+30))
 ImageDraw.Draw(card).text((x+12,y+6),f'{t:02.0f}–{t+s["duration"]:02.0f}s  {s["name"]}',font=font,fill='#343c32')
 frames.append({'scene':s['name'],'start':t,'duration':s['duration'],'qa_frame':str(path)})
 t+=s['duration']
card.save(OUT/'contact-sheet.jpg',quality=95)
result=subprocess.run([str(FF),'-hide_banner','-i',str(VIDEO),'-f','null','-'],capture_output=True,text=True,check=True)
log=result.stderr
matches=re.findall(r'frame=\s*(\d+)',log)
frame_count=int(matches[-1])
assert frame_count==1740,(frame_count,log[-500:])
report={'duration_seconds':58,'frames':frame_count,'fps':30,'resolution':[1920,1080],'decode_passed':True,'size_bytes':VIDEO.stat().st_size,'scenes':frames}
(OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='scenes'}))
print(str(OUT/'contact-sheet.jpg'))
