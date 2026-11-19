import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const root = path.resolve(process.env.ESTELLA_DIST ?? 'dist');
const [arg, ...extra] = process.argv.slice(2);
const mode = extra.length === 0 && /^--dungeon-mode=(basic|3d)$/.exec(arg)?.[1];
if (!mode) {
  console.error('Usage: npm start -- --dungeon-mode=basic  or  npm start -- --dungeon-mode=3d');
  process.exit(1);
}
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.wasm':'application/wasm','.json':'application/json','.png':'image/png'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if (url.pathname === '/startup.json') {
      res.writeHead(200, {'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({mode}));
      return;
    }
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(target);
    res.writeHead(200, {'content-type':types[path.extname(target)] || 'application/octet-stream','cache-control':'no-cache'}).end(data);
  } catch { res.writeHead(404).end('Not found; run npm run build first.'); }
}).listen(Number(process.env.ESTELLA_PORT ?? 5173),'0.0.0.0',()=>console.log(`Estella ${mode}: http://localhost:${process.env.ESTELLA_PORT ?? 5173} - game server stays on :8080`));
