// HTTP static host + WebSocket game server. Bind on 0.0.0.0 so anyone on the
// home wifi can join from a browser.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

import { MSG, TICK_MS } from '../shared/constants.js';
import { Game } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const SHARED_DIR = path.join(__dirname, '..', 'shared');
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  // The client imports the same constants/config the server uses.
  if (pathname.startsWith('/shared/')) {
    const rel = pathname.slice('/shared/'.length);
    const target = path.join(SHARED_DIR, rel);
    if (!target.startsWith(SHARED_DIR)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    serveFile(res, target);
    return;
  }

  const target = path.join(PUBLIC_DIR, pathname);
  if (!target.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  serveFile(res, target);
});

const game = new Game();
const wss = new WebSocketServer({ server });
let nextId = 1;

wss.on('connection', (ws) => {
  const id = `p${nextId++}`;
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === MSG.JOIN) {
      if (player) return;
      player = game.addPlayer(id, msg.name);
      ws.player = player;
      send(ws, { type: MSG.WELCOME, ...game.welcomeFor(player) });
      console.log(`[join] ${player.name} (${id}) — ${game.players.size} online`);
      return;
    }

    if (!player) return;

    if (msg.type === MSG.INPUT) {
      player.move.x = clampUnit(msg.mx);
      player.move.y = clampUnit(msg.my);
      if (Number.isFinite(msg.aim)) player.aim = msg.aim;
      return;
    }

    if (msg.type === MSG.ACTION) {
      game.handleAction(player, msg, Date.now());
    }
  });

  ws.on('close', () => {
    if (player) {
      console.log(`[left] ${player.name} (${id})`);
      game.removePlayer(id);
    }
  });

  ws.on('error', () => ws.terminate());
});

function clampUnit(v) {
  return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  game.tick(dt, now);

  for (const ws of wss.clients) {
    if (!ws.player || !game.players.has(ws.player.id)) continue;
    send(ws, { type: MSG.STATE, ...game.snapshotFor(ws.player) });
  }
}, TICK_MS);

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DungeonHunter01 — seed ${game.seed}, ${game.totalLevels} level(s)`);
  console.log('Open on this machine:  http://localhost:' + PORT);
  for (const addr of lanAddresses()) {
    console.log(`Open on the home wifi: http://${addr}:${PORT}`);
  }
});
