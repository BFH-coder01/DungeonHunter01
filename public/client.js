import { TILE, MSG, ACTION, SIGHT_RADIUS } from '/shared/constants.js';

// ---------------------------------------------------------------------
// connection state
// ---------------------------------------------------------------------

let ws = null;
let width = 0, height = 0;
let map = new Int8Array(0); // -1 unseen, else TILE.*
let self = null;
let others = new Map();
let caches = new Map();
let drops = new Map();

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const mctx = minimapCanvas.getContext('2d');

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
const lookHint = document.getElementById('lookHint');

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

let viewAngleInit = false;

function onWelcome(msg) {
  width = msg.width;
  height = msg.height;
  map = new Int8Array(width * height).fill(-1);
  joinOverlay.classList.add('hidden');
  hud.classList.remove('hidden');
  lookHint.classList.remove('hidden');
  log(`Dungeon seed ${msg.seed} — level ${msg.level + 1}/${msg.totalLevels}${msg.revealAll ? ' (full map test mode)' : ''}`, 'good');
  requestAnimationFrame(loop);
}

function onState(msg) {
  const rev = msg.reveal;
  for (let i = 0; i < rev.length; i += 2) map[rev[i]] = rev[i + 1];

  self = msg.self;
  if (!viewAngleInit) { viewAngle = self.aim; viewAngleInit = true; }

  others = new Map(msg.others.map((o) => [o.id, o]));
  caches = new Map(msg.caches.map((c) => [c.id, c]));
  drops = new Map(msg.drops.map((d) => [d.uid, d]));

  for (const ev of msg.events) handleEvent(ev);

  updateHud();
}

// ---------------------------------------------------------------------
// look (pointer lock) + movement input
// ---------------------------------------------------------------------

const MOUSE_SENS = 0.0022;
let viewAngle = 0;
let locked = false;

canvas.addEventListener('mousedown', (e) => {
  if (!locked) { canvas.requestPointerLock(); return; }
  if (e.button === 0) sendAction(ACTION.ATTACK);
  if (e.button === 2) sendAction(ACTION.CAST);
});
lookHint.addEventListener('click', () => canvas.requestPointerLock());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  lookHint.classList.toggle('hidden', locked);
});

document.addEventListener('mousemove', (e) => {
  if (!locked) return;
  viewAngle = normalizeAngle(viewAngle + e.movementX * MOUSE_SENS);
});

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (document.activeElement === nameInput) return;
  keys.add(e.key.toLowerCase());
  if (e.key === 'e' || e.key === 'E') sendAction(ACTION.PICKUP);
  if (e.key === ' ') { sendAction(ACTION.CAST); e.preventDefault(); }
  const n = Number(e.key);
  if (n >= 1 && n <= 8) equipSlot(n - 1);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function sendAction(action, extra) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type: MSG.ACTION, action, ...extra }));
}

let lastInputSent = 0;
function pumpInput(now) {
  if (!ws || ws.readyState !== ws.OPEN || !self) return;
  if (now - lastInputSent < 50) return;
  lastInputSent = now;

  let fb = 0, lr = 0;
  if (keys.has('w') || keys.has('arrowup')) fb += 1;
  if (keys.has('s') || keys.has('arrowdown')) fb -= 1;
  if (keys.has('d') || keys.has('arrowright')) lr += 1;
  if (keys.has('a') || keys.has('arrowleft')) lr -= 1;

  let mx = 0, my = 0;
  if (fb !== 0 || lr !== 0) {
    const fx = Math.cos(viewAngle), fy = Math.sin(viewAngle);
    const rx = Math.cos(viewAngle + Math.PI / 2), ry = Math.sin(viewAngle + Math.PI / 2);
    mx = fx * fb + rx * lr;
    my = fy * fb + ry * lr;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }
  }

  ws.send(JSON.stringify({ type: MSG.INPUT, mx, my, aim: viewAngle }));
}

// ---------------------------------------------------------------------
// inventory / HUD (unchanged from the DM-view build)
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
// first-person wireframe raycaster
// ---------------------------------------------------------------------

const FOV = 70 * Math.PI / 180;
const RAYS = 240;
const MAX_DIST = SIGHT_RADIUS;

let renderX = null, renderY = null;
let lastFrameT = performance.now();

function updateSmoothing(dt) {
  if (!self) return;
  if (renderX === null) { renderX = self.x; renderY = self.y; return; }
  const k = Math.min(1, dt * 14);
  renderX += (self.x - renderX) * k;
  renderY += (self.y - renderY) * k;
}

function tileBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= width || ty >= height) return true;
  const v = map[ty * width + tx];
  return v === -1 || v === TILE.WALL;
}

// Lode's DDA raycast: steps grid cells until a wall (or unexplored cell) is
// hit, returning the perpendicular (non-fisheye) distance directly.
function castRay(px, py, angle) {
  const dirX = Math.cos(angle), dirY = Math.sin(angle);
  let mapX = Math.floor(px), mapY = Math.floor(py);
  const deltaDistX = dirX === 0 ? 1e30 : Math.abs(1 / dirX);
  const deltaDistY = dirY === 0 ? 1e30 : Math.abs(1 / dirY);
  let stepX, stepY, sideDistX, sideDistY;
  if (dirX < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
  else { stepX = 1; sideDistX = (mapX + 1 - px) * deltaDistX; }
  if (dirY < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
  else { stepY = 1; sideDistY = (mapY + 1 - py) * deltaDistY; }

  let side = 0;
  const maxSteps = Math.ceil(MAX_DIST * 2) + 6;
  for (let i = 0; i < maxSteps; i++) {
    if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
    else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
    if (mapX < 0 || mapY < 0 || mapX >= width || mapY >= height) {
      return { dist: MAX_DIST, side, unknown: false };
    }
    const v = map[mapY * width + mapX];
    if (v === -1 || v === TILE.WALL) {
      const dist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
      return { dist: Math.min(dist, MAX_DIST), side, unknown: v === -1 };
    }
  }
  return { dist: MAX_DIST, side, unknown: false };
}

function clientHasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.ceil(Math.hypot(dx, dy) * 2);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (tileBlocked(Math.floor(x0 + dx * t), Math.floor(y0 + dy * t))) return false;
  }
  return true;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function wallHeightAt(dist, h) {
  return Math.min(h * 4, (h * 0.9) / Math.max(0.05, dist));
}

function drawScene() {
  const w = canvas.width, h = canvas.height;
  const horizon = h / 2;
  const floorScale = h * 0.62;

  ctx.fillStyle = '#030507';
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = '#050a06';
  ctx.fillRect(0, horizon, w, h - horizon);

  // floor perspective bands — cheap depth cue, not per-tile accurate
  for (const d of [1, 1.5, 2, 3, 4, 6, MAX_DIST]) {
    const y = horizon + floorScale / d;
    if (y > h) continue;
    const alpha = Math.max(0.04, (1 - d / MAX_DIST) * 0.35);
    ctx.strokeStyle = `rgba(20,97,47,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const columns = new Array(RAYS);
  for (let i = 0; i < RAYS; i++) {
    const t = i / (RAYS - 1);
    const rayAngle = viewAngle - FOV / 2 + t * FOV;
    const res = castRay(renderX, renderY, rayAngle);
    const dist = Math.max(0.05, res.dist * Math.cos(rayAngle - viewAngle));
    const wallH = wallHeightAt(dist, h);
    columns[i] = { x: t * w, top: horizon - wallH / 2, bot: horizon + wallH / 2, dist, side: res.side, unknown: res.unknown };
  }

  // connective skyline top/bottom — the "wireframe mesh" read of the corridor
  ctx.strokeStyle = 'rgba(53,255,138,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  columns.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.top) : ctx.lineTo(c.x, c.top)));
  ctx.stroke();
  ctx.beginPath();
  columns.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.bot) : ctx.lineTo(c.x, c.bot)));
  ctx.stroke();

  // individual wall slices, spaced with visible gaps for a vector-scanline look
  for (const c of columns) {
    const fog = Math.max(0, 1 - c.dist / MAX_DIST);
    const brightness = c.side === 0 ? 1 : 0.55;
    const alpha = Math.max(0.05, fog * brightness);
    ctx.strokeStyle = c.unknown
      ? `rgba(255,207,77,${(alpha * 0.5).toFixed(3)})`
      : `rgba(53,255,138,${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(c.x, c.top);
    ctx.lineTo(c.x, c.bot);
    ctx.stroke();
  }

  drawBillboards(horizon, floorScale, w, h);
}

function collectBillboards() {
  const list = [];
  for (const o of others.values()) list.push({ kind: 'player', ref: o, x: o.x, y: o.y });
  for (const c of caches.values()) list.push({ kind: 'cache', ref: c, x: c.x, y: c.y });
  for (const d of drops.values()) list.push({ kind: 'drop', ref: d, x: d.x, y: d.y });

  const visible = [];
  for (const item of list) {
    const dx = item.x - renderX, dy = item.y - renderY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.05 || dist > MAX_DIST) continue;
    const diff = normalizeAngle(Math.atan2(dy, dx) - viewAngle);
    if (Math.abs(diff) > FOV / 2 + 0.3) continue;
    if (!clientHasLineOfSight(renderX, renderY, item.x, item.y)) continue;
    item.dist = dist * Math.cos(diff);
    item.diff = diff;
    visible.push(item);
  }
  visible.sort((a, b) => b.dist - a.dist); // painter's algorithm: far first
  return visible;
}

function drawBillboards(horizon, floorScale, w, h) {
  for (const item of collectBillboards()) {
    const sx = w * (0.5 + item.diff / FOV);
    const feetY = Math.min(h, horizon + floorScale / Math.max(0.2, item.dist));
    const fullH = wallHeightAt(item.dist, h);

    if (item.kind === 'player') drawPlayerGlyph(item.ref, sx, feetY, fullH, item.dist);
    else if (item.kind === 'cache') drawCacheGlyph(sx, feetY, fullH);
    else drawDropGlyph(item.ref, sx, feetY, fullH);
  }
}

function drawPlayerGlyph(o, sx, feetY, fullH, dist) {
  const fog = Math.max(0.12, 1 - dist / MAX_DIST);
  const bodyH = clamp(fullH * 0.62, 10, canvas.height * 1.6);
  const bodyW = bodyH * 0.4;
  const headR = bodyW * 0.5;
  const color = `rgba(53,255,138,${fog.toFixed(3)})`;
  const topY = feetY - bodyH;

  ctx.strokeStyle = color;
  ctx.lineWidth = clamp(bodyW * 0.06, 1, 3);
  ctx.beginPath();
  ctx.moveTo(sx - bodyW / 2, feetY);
  ctx.lineTo(sx - bodyW / 2, topY + headR);
  ctx.arc(sx, topY + headR, headR, Math.PI, 0);
  ctx.lineTo(sx + bodyW / 2, feetY);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `${clamp(bodyH * 0.09, 10, 18)}px Courier New, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`${o.name} ${o.hp}%`, sx, topY - 6);
}

function drawCacheGlyph(sx, feetY, fullH) {
  const size = clamp(fullH * 0.3, 8, canvas.height * 0.5);
  const cy = feetY - size / 2;
  const pulse = 1 + Math.sin(performance.now() / 400) * 0.08;
  ctx.strokeStyle = '#ffcf4d';
  ctx.lineWidth = clamp(size * 0.05, 1, 3);
  ctx.beginPath();
  ctx.moveTo(sx, cy - size * pulse); ctx.lineTo(sx + size * pulse, cy);
  ctx.lineTo(sx, cy + size * pulse); ctx.lineTo(sx - size * pulse, cy);
  ctx.closePath();
  ctx.stroke();
}

function drawDropGlyph(d, sx, feetY, fullH) {
  const size = clamp(fullH * 0.22, 6, canvas.height * 0.4);
  ctx.strokeStyle = d.kind === 'weapon' ? '#ff9f5a' : '#4dc3ff';
  ctx.lineWidth = clamp(size * 0.08, 1, 3);
  ctx.strokeRect(sx - size / 2, feetY - size, size, size);
}

// ---------------------------------------------------------------------
// minimap — small corner HUD, only the tiles this player has explored
// ---------------------------------------------------------------------

function drawMinimap() {
  const size = minimapCanvas.width;
  mctx.clearRect(0, 0, size, size);
  if (!self) return;

  const tilePx = 6;
  const radiusTiles = size / tilePx / 2;
  const cx = self.x, cy = self.y;

  for (let dy = -Math.ceil(radiusTiles); dy <= radiusTiles; dy++) {
    for (let dx = -Math.ceil(radiusTiles); dx <= radiusTiles; dx++) {
      const tx = Math.floor(cx + dx), ty = Math.floor(cy + dy);
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
      const v = map[ty * width + tx];
      if (v === -1) continue;
      const sx = size / 2 + (tx - cx) * tilePx;
      const sy = size / 2 + (ty - cy) * tilePx;
      mctx.fillStyle = v === TILE.WALL ? '#14612f' : 'rgba(20,97,47,0.4)';
      mctx.fillRect(sx, sy, tilePx - 0.5, tilePx - 0.5);
    }
  }

  mctx.fillStyle = '#ffcf4d';
  for (const c of caches.values()) {
    const sx = size / 2 + (c.x - cx) * tilePx, sy = size / 2 + (c.y - cy) * tilePx;
    if (sx < 0 || sx > size || sy < 0 || sy > size) continue;
    mctx.fillRect(sx - 2, sy - 2, 4, 4);
  }

  mctx.fillStyle = '#35ff8a';
  for (const o of others.values()) {
    const sx = size / 2 + (o.x - cx) * tilePx, sy = size / 2 + (o.y - cy) * tilePx;
    if (sx < 0 || sx > size || sy < 0 || sy > size) continue;
    mctx.beginPath();
    mctx.arc(sx, sy, 3, 0, Math.PI * 2);
    mctx.fill();
  }

  mctx.fillStyle = '#ffffff';
  mctx.strokeStyle = '#ffffff';
  mctx.lineWidth = 1.5;
  mctx.beginPath();
  mctx.arc(size / 2, size / 2, 3.5, 0, Math.PI * 2);
  mctx.fill();
  mctx.beginPath();
  mctx.moveTo(size / 2, size / 2);
  mctx.lineTo(size / 2 + Math.cos(viewAngle) * 11, size / 2 + Math.sin(viewAngle) * 11);
  mctx.stroke();
}

function loop(now) {
  const dt = Math.min(0.1, (now - lastFrameT) / 1000);
  lastFrameT = now;

  pumpInput(now);
  updateSmoothing(dt);

  ctx.fillStyle = '#04070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (self) {
    drawScene();
    drawMinimap();
  }

  requestAnimationFrame(loop);
}
