from http.server import HTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import os,time
root=Path(__file__).resolve().parent
os.chdir(root)
class Handler(SimpleHTTPRequestHandler):
 def do_POST(self):
  if self.path!='/save': self.send_error(404); return
  target=root.parent/'raw'/('tab-demo-'+time.strftime('%H%M%S')+'.webm')
  remaining=int(self.headers['Content-Length'])
  with target.open('wb') as f:
   while remaining:
    chunk=self.rfile.read(min(1048576,remaining));f.write(chunk);remaining-=len(chunk)
  self.send_response(200);self.end_headers();self.wfile.write(('Saved '+target.name).encode())
HTTPServer(('127.0.0.1',8766),Handler).serve_forever()
