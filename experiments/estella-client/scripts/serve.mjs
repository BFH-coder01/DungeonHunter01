import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const root = path.resolve('dist');
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.wasm':'application/wasm','.json':'application/json'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(target);
    res.writeHead(200, {'content-type':types[path.extname(target)] || 'application/octet-stream','cache-control':'no-cache'}).end(data);
  } catch { res.writeHead(404).end('Not found; run npm run build first.'); }
}).listen(5173,'0.0.0.0',()=>console.log('Estella POC: http://localhost:5173 — game server stays on :8080'));
