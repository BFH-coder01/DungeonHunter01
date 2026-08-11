import { TILE, MSG } from '/shared/constants.js';

// ---------------------------------------------------------------------
// The DungeonMaster view is a pure observer: no character, no fog, whole
// level visible always, every living player shown at once. It fits the
// entire level into the viewport rather than following anyone.
// ---------------------------------------------------------------------

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const infoEl = document.getElementById('dmInfo');
const rosterEl = document.getElementById('dmRoster');

let width = 0, height = 0;
let tiles = new Uint8Array(0);
let seed = 0, totalLevels = 0, level = 0;
let players = [];
let caches = [];
let drops = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const proto = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${proto}://${location.host}`);
ws.addEventListener('open', () => ws.send(JSON.stringify({ type: MSG.SPECTATE })));
ws.addEventListener('close', () => { infoEl.textContent = 'disconnected from server'; });
ws.addEventListener('message', (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.type === MSG.WELCOME) return onWelcome(msg);
  if (msg.type === MSG.STATE) return onState(msg);
});

function onWelcome(msg) {
  seed = msg.seed;
  totalLevels = msg.totalLevels;
  level = msg.level;
  width = msg.width;
  height = msg.height;
  tiles = Uint8Array.from(msg.tiles);
  requestAnimationFrame(loop);
}

function onState(msg) {
  level = msg.level;
  players = msg.players;
  caches = msg.caches;
  drops = msg.drops;
  updateHeader();
}

function updateHeader() {
  const alive = players.filter((p) => p.alive).length;
  infoEl.textContent = `seed ${seed} — level ${level + 1}/${totalLevels} — ${players.length} adventurer(s), ${alive} alive`;
  rosterEl.innerHTML = '';
  for (const p of players) {
    const row = document.createElement('div');
    row.className = 'rosterRow' + (p.alive ? '' : ' dead');
    row.style.borderColor = colorFor(p.id);
    row.textContent = `${p.name} — ${p.alive ? `${p.health}/${p.maxHealth} hp` : 'down'} — ${p.kills}K/${p.deaths}D`;
    rosterEl.appendChild(row);
  }
}

// stable per-player color, cheap hash -> hue
function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 85%, 60%)`;
}

// ---------------------------------------------------------------------
// fit-to-screen tile grid, no camera/pan — this is a whole-dungeon overview
// ---------------------------------------------------------------------

function computeFit() {
  const margin = 60;
  const availW = window.innerWidth - margin * 2;
  const availH = window.innerHeight - margin * 2 - 90; // room for header
  const tile = Math.max(4, Math.floor(Math.min(availW / width, availH / height)));
  const offX = (window.innerWidth - width * tile) / 2;
  const offY = 90 + (window.innerHeight - 90 - height * tile) / 2;
  return { tile, offX, offY };
}

function drawMap(fit) {
  const { tile, offX, offY } = fit;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = tiles[y * width + x];
      const sx = offX + x * tile;
      const sy = offY + y * tile;
      if (v === TILE.WALL) {
        ctx.strokeStyle = '#14612f';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, tile - 1, tile - 1);
      } else {
        ctx.strokeStyle = 'rgba(20, 97, 47, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, tile - 1, tile - 1);
        if (v === TILE.STAIRS_DOWN || v === TILE.STAIRS_UP) {
          ctx.strokeStyle = '#ffcf4d';
          const mx = sx + tile / 2, my = sy + tile / 2, r = tile * 0.32;
          ctx.beginPath();
          ctx.moveTo(mx, my - r); ctx.lineTo(mx + r, my); ctx.lineTo(mx, my + r); ctx.lineTo(mx - r, my);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }
}

function drawCaches(fit) {
  const { tile, offX, offY } = fit;
  const pulse = 1 + Math.sin(performance.now() / 400) * 0.08;
  for (const c of caches) {
    const sx = offX + c.x * tile, sy = offY + c.y * tile;
    const r = tile * 0.34 * pulse;
    ctx.strokeStyle = '#ffcf4d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r, sy);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawDrops(fit) {
  const { tile, offX, offY } = fit;
  for (const d of drops) {
    const sx = offX + d.x * tile, sy = offY + d.y * tile;
    ctx.strokeStyle = d.kind === 'weapon' ? '#ff9f5a' : '#4dc3ff';
    ctx.lineWidth = 1.5;
    const s = tile * 0.28;
    ctx.strokeRect(sx - s / 2, sy - s / 2, s, s);
  }
}

function drawPlayers(fit) {
  const { tile, offX, offY } = fit;
  for (const p of players) {
    const sx = offX + p.x * tile, sy = offY + p.y * tile;
    const color = p.alive ? colorFor(p.id) : 'rgba(255,77,94,0.5)';
    const r = Math.max(4, tile * 0.4);

    ctx.strokeStyle = color;
    ctx.lineWidth = p.alive ? 2 : 1;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();

    if (p.alive) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(p.aim) * (r + tile * 0.5), sy + Math.sin(p.aim) * (r + tile * 0.5));
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.font = '11px Courier New, monospace';
    ctx.textAlign = 'center';
    const pct = Math.round((p.health / p.maxHealth) * 100);
    ctx.fillText(p.alive ? `${p.name} ${pct}%` : `${p.name} (down)`, sx, sy - r - 6);
  }
}

function loop() {
  ctx.fillStyle = '#04070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (width && height) {
    const fit = computeFit();
    drawMap(fit);
    drawCaches(fit);
    drawDrops(fit);
    drawPlayers(fit);
  }

  requestAnimationFrame(loop);
}
