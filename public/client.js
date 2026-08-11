import { TILE, MSG, ACTION } from '/shared/constants.js';

// ---------------------------------------------------------------------
// connection state
// ---------------------------------------------------------------------

let ws = null;
let selfId = null;
let width = 0, height = 0;
let map = new Int8Array(0); // -1 unseen, else TILE.*
let self = null;
let others = new Map();
let caches = new Map();
let drops = new Map();
let lastServerTime = 0;

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------
// join flow
// ---------------------------------------------------------------------

const joinOverlay = document.getElementById('join');
const hud = document.getElementById('hud');
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');

nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doJoin(); });
joinBtn.addEventListener('click', doJoin);

function doJoin() {
  const name = nameInput.value.trim() || 'Hunter';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: MSG.JOIN, name }));
  });
  ws.addEventListener('message', onMessage);
  ws.addEventListener('close', () => log('Disconnected from server.', 'bad'));
  joinBtn.disabled = true;
  joinBtn.textContent = 'Connecting…';
}

function onMessage(evt) {
  const msg = JSON.parse(evt.data);
  if (msg.type === MSG.WELCOME) return onWelcome(msg);
  if (msg.type === MSG.STATE) return onState(msg);
}

function onWelcome(msg) {
  selfId = msg.you;
  width = msg.width;
  height = msg.height;
  map = new Int8Array(width * height).fill(-1);
  joinOverlay.classList.add('hidden');
  hud.classList.remove('hidden');
  log(`Dungeon seed ${msg.seed} — level ${msg.level + 1}/${msg.totalLevels}${msg.revealAll ? ' (full map test mode)' : ''}`, 'good');
  requestAnimationFrame(loop);
}

function onState(msg) {
  lastServerTime = msg.t;

  // apply newly revealed tiles
  const rev = msg.reveal;
  for (let i = 0; i < rev.length; i += 2) map[rev[i]] = rev[i + 1];

  self = msg.self;

  others = new Map(msg.others.map((o) => [o.id, o]));
  caches = new Map(msg.caches.map((c) => [c.id, c]));
  drops = new Map(msg.drops.map((d) => [d.uid, d]));

  for (const ev of msg.events) handleEvent(ev);

  updateHud();
}

// ---------------------------------------------------------------------
// input
// ---------------------------------------------------------------------

const keys = new Set();
let mouseScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let selectedSlot = 0;

window.addEventListener('keydown', (e) => {
  if (document.activeElement === nameInput) return;
  keys.add(e.key.toLowerCase());
  if (e.key === 'e' || e.key === 'E') sendAction(ACTION.PICKUP);
  if (e.key === ' ') { sendAction(ACTION.CAST); e.preventDefault(); }
  const n = Number(e.key);
  if (n >= 1 && n <= 8) equipSlot(n - 1);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener('mousemove', (e) => {
  mouseScreen = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) sendAction(ACTION.ATTACK);
  if (e.button === 2) sendAction(ACTION.CAST);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function sendAction(action, extra) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type: MSG.ACTION, action, ...extra }));
}

let lastInputSent = 0;
function pumpInput(now) {
  if (!ws || ws.readyState !== ws.OPEN || !self) return;
  if (now - lastInputSent < 50) return;
  lastInputSent = now;

  let mx = 0, my = 0;
  if (keys.has('w') || keys.has('arrowup')) my -= 1;
  if (keys.has('s') || keys.has('arrowdown')) my += 1;
  if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
  if (keys.has('d') || keys.has('arrowright')) mx += 1;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const aim = Math.atan2(mouseScreen.y - cy, mouseScreen.x - cx);

  ws.send(JSON.stringify({ type: MSG.INPUT, mx, my, aim }));
}

// ---------------------------------------------------------------------
// inventory / HUD
// ---------------------------------------------------------------------

const hpFill = document.getElementById('hpFill');
const hpText = document.getElementById('hpText');
const mpFill = document.getElementById('mpFill');
const mpText = document.getElementById('mpText');
const spdText = document.getElementById('spdText');
const lvlText = document.getElementById('lvlText');
const kdText = document.getElementById('kdText');
const deadBanner = document.getElementById('deadBanner');
const respawnIn = document.getElementById('respawnIn');
const swapBanner = document.getElementById('swapBanner');
const inventoryEl = document.getElementById('inventory');
const logEl = document.getElementById('log');

function updateHud() {
  if (!self) return;
  hpFill.style.transform = `scaleX(${Math.max(0, self.health / self.maxHealth)})`;
  hpText.textContent = `HP ${self.health}/${self.maxHealth}`;
  mpFill.style.transform = `scaleX(${Math.max(0, self.mana / self.maxMana)})`;
  mpText.textContent = `MP ${self.mana}/${self.maxMana}`;
  spdText.textContent = self.speed.toFixed(1);
  lvlText.textContent = self.level + 1;
  kdText.textContent = `${self.kills}/${self.deaths}`;

  deadBanner.classList.toggle('hidden', self.alive);
  if (!self.alive) respawnIn.textContent = (self.respawnIn / 1000).toFixed(1);

  swapBanner.classList.toggle('hidden', self.swapRemaining <= 0);

  renderInventory();
}

function renderInventory() {
  inventoryEl.innerHTML = '';
  const size = 8;
  for (let i = 0; i < size; i++) {
    const item = self.inventory[i];
    const slot = document.createElement('div');
    slot.className = 'slot';
    const k = document.createElement('div');
    k.className = 'k';
    k.textContent = String(i + 1);
    slot.appendChild(k);

    if (item) {
      slot.classList.add(item.kind);
      const equipped = item.uid === self.equippedWeaponUid || item.uid === self.equippedSpellUid;
      if (equipped) slot.classList.add('equipped');
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = item.name;
      slot.appendChild(name);
      if (item.kind === 'weapon') {
        const d = document.createElement('div');
        d.textContent = `dmg ${item.damage}`;
        slot.appendChild(d);
      } else if (item.kind === 'spell') {
        const d = document.createElement('div');
        d.textContent = item.heal ? `heal ${item.heal}` : `dmg ${item.damage}`;
        slot.appendChild(d);
        const m = document.createElement('div');
        m.textContent = `mp ${item.manaCost}`;
        slot.appendChild(m);
      }
      slot.addEventListener('click', () => sendAction(ACTION.EQUIP, { uid: item.uid }));
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        sendAction(ACTION.DROP, { uid: item.uid });
      });
    } else {
      slot.classList.add('empty');
    }
    inventoryEl.appendChild(slot);
  }
}

function equipSlot(i) {
  const item = self && self.inventory[i];
  if (item) sendAction(ACTION.EQUIP, { uid: item.uid });
}

function log(text, cls) {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = text;
  logEl.prepend(div);
  while (logEl.children.length > 8) logEl.removeChild(logEl.lastChild);
}

function handleEvent(ev) {
  switch (ev.kind) {
    case 'hurt': log(`-${ev.amount} from ${ev.by} (${ev.with})`, 'bad'); break;
    case 'dealt': log(`hit ${ev.to} for ${ev.amount} (${ev.with})`, 'good'); break;
    case 'death':
      if (ev.victim === self?.name) log(`You were slain by ${ev.killer}.`, 'bad');
      else if (ev.killer === self?.name) log(`You slew ${ev.victim}.`, 'good');
      break;
    case 'pickup': log(`picked up ${ev.name}`); break;
    case 'boon': log(`${ev.name}: ${ev.attr} ${ev.delta > 0 ? '+' : ''}${ev.delta}`, ev.delta > 0 ? 'good' : 'bad'); break;
    case 'drop': log(`dropped ${ev.name}`); break;
    case 'full': log(`inventory full — can't pick up ${ev.name}`, 'bad'); break;
    case 'nomana': log(`not enough mana for ${ev.name} (need ${ev.need})`, 'bad'); break;
    case 'swap': log(`swapping to ${ev.name}…`); break;
    default: break;
  }
}

// ---------------------------------------------------------------------
// rendering — wireframe / vector style
// ---------------------------------------------------------------------

const TILE_PX = 26;
const INK = '#35ff8a';
const INK_DIM = '#14612f';

function worldToScreen(wx, wy) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  return {
    x: cx + (wx - self.x) * TILE_PX,
    y: cy + (wy - self.y) * TILE_PX,
  };
}

function drawMap() {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const tilesX = Math.ceil(window.innerWidth / TILE_PX) + 2;
  const tilesY = Math.ceil(window.innerHeight / TILE_PX) + 2;
  const startX = Math.floor(self.x - tilesX / 2);
  const startY = Math.floor(self.y - tilesY / 2);

  for (let ty = startY; ty < startY + tilesY; ty++) {
    if (ty < 0 || ty >= height) continue;
    for (let tx = startX; tx < startX + tilesX; tx++) {
      if (tx < 0 || tx >= width) continue;
      const v = map[ty * width + tx];
      if (v === -1) continue; // unexplored — fog, draw nothing

      const sx = cx + (tx - self.x) * TILE_PX;
      const sy = cy + (ty - self.y) * TILE_PX;

      if (v === TILE.WALL) {
        ctx.strokeStyle = INK_DIM;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_PX - 1, TILE_PX - 1);
      } else {
        // floor: faint corner ticks only, keeps the wireframe feel light
        ctx.strokeStyle = 'rgba(20, 97, 47, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_PX - 1, TILE_PX - 1);
        if (v === TILE.STAIRS_DOWN || v === TILE.STAIRS_UP) {
          ctx.strokeStyle = '#ffcf4d';
          ctx.beginPath();
          const mx = sx + TILE_PX / 2, my = sy + TILE_PX / 2, r = TILE_PX * 0.3;
          ctx.moveTo(mx, my - r); ctx.lineTo(mx + r, my); ctx.lineTo(mx, my + r); ctx.lineTo(mx - r, my);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }
}

function drawDiamond(sx, sy, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r, sy);
  ctx.closePath();
  ctx.stroke();
}

function drawCaches() {
  const t = performance.now() / 400;
  for (const c of caches.values()) {
    const p = worldToScreen(c.x, c.y);
    const pulse = 1 + Math.sin(t) * 0.08;
    drawDiamond(p.x, p.y, 9 * pulse, '#ffcf4d');
  }
}

function drawDrops() {
  for (const d of drops.values()) {
    const p = worldToScreen(d.x, d.y);
    ctx.strokeStyle = d.kind === 'weapon' ? '#ff9f5a' : '#4dc3ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x - 6, p.y - 6, 12, 12);
  }
}

function drawPlayer(p, isSelf) {
  const pos = isSelf ? { x: window.innerWidth / 2, y: window.innerHeight / 2 } : worldToScreen(p.x, p.y);
  const r = 11;
  const color = isSelf ? '#ffffff' : INK;

  ctx.strokeStyle = color;
  ctx.lineWidth = isSelf ? 2 : 1.5;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.stroke();

  // facing line
  const aim = isSelf ? self.aim : (p.aim || 0);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x + Math.cos(aim) * (r + 10), pos.y + Math.sin(aim) * (r + 10));
  ctx.stroke();

  // name + hp
  ctx.fillStyle = color;
  ctx.font = '11px Courier New, monospace';
  ctx.textAlign = 'center';
  const label = isSelf ? '' : `${p.name} ${p.hp}%`;
  if (label) ctx.fillText(label, pos.x, pos.y - r - 8);
}

function drawCrosshair() {
  if (!self.alive) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  const { x, y } = mouseScreen;
  ctx.beginPath();
  ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
  ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
  ctx.stroke();
}

function loop(now) {
  pumpInput(now);

  ctx.fillStyle = '#04070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (self) {
    drawMap();
    drawCaches();
    drawDrops();
    for (const o of others.values()) drawPlayer(o, false);
    drawPlayer(self, true);
    drawCrosshair();
  }

  requestAnimationFrame(loop);
}
