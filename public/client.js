import { TILE, MSG, ACTION, SIGHT_RADIUS, PLAYER_RADIUS } from '/shared/constants.js';
import { createAmbientAudio } from '/audio.js';

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
let projectiles = new Map();
let battlePortal = null;
let linkPortals = new Map();
let movementSpeedScale = 1;

const audio = createAmbientAudio();
const prevOthersPos = new Map(); // player id -> {x,y}, used to detect movement for footstep audio

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // crisp stretched texture columns, not blurry
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

nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doJoin(); });
joinBtn.addEventListener('click', doJoin);

function doJoin() {
  audio.start(); // must happen inside this click handler — browsers require a user gesture to unlock audio
  const name = nameInput.value.trim() || 'Hunter';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: MSG.JOIN, name }));
  });
  ws.addEventListener('message', onMessage);
  ws.addEventListener('close', () => {
    if (inputTimer) clearInterval(inputTimer);
    inputTimer = null;
    log('Disconnected from server.', 'bad');
  });
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
  movementSpeedScale = msg.movementSpeedScale || 1;
  joinOverlay.classList.add('hidden');
  hud.classList.remove('hidden');
  log(`Dungeon seed ${msg.seed} — level ${msg.level + 1}/${msg.totalLevels}${msg.revealAll ? ' (full map test mode)' : ''}`, 'good');
  if (inputTimer) clearInterval(inputTimer);
  inputTimer = setInterval(() => pumpInput(performance.now()), 50);
  requestAnimationFrame(loop);
}

function onState(msg) {
  const rev = msg.reveal;
  for (let i = 0; i < rev.length; i += 2) map[rev[i]] = rev[i + 1];
  audio.setSoundPoints(msg.soundPoints || []);

  self = msg.self;
  if (!viewAngleInit) { viewAngle = self.aim; viewAngleInit = true; }

  others = new Map(msg.others.map((o) => [o.id, o]));
  if (msg.caches) caches = new Map(msg.caches.map((c) => [c.id, c]));
  if (msg.drops) drops = new Map(msg.drops.map((d) => [d.uid, d]));
  projectiles = new Map((msg.projectiles || []).map((p) => [p.id, p]));
  battlePortal = msg.battlePortal || null;
  linkPortals = new Map((msg.linkPortals || []).map((p) => [p.id, p]));

  updateOtherFootsteps(msg.others);

  for (const ev of msg.events) handleEvent(ev);

  updateHud();
}

// Footstep audio for other players is driven by snapshot-to-snapshot
// movement, not input state (we don't know their keys, only their
// position) — anything that moved more than float jitter since the last
// snapshot counts as "walking".
function updateOtherFootsteps(list) {
  const presentIds = new Set();
  for (const o of list) {
    presentIds.add(o.id);
    const prev = prevOthersPos.get(o.id);
    const moved = o.alive && prev && Math.hypot(o.x - prev.x, o.y - prev.y) > 0.02;
    audio.setMoving(o.id, moved, o.x, o.y, false);
    prevOthersPos.set(o.id, { x: o.x, y: o.y });
  }
  for (const id of Array.from(prevOthersPos.keys())) {
    if (!presentIds.has(id)) prevOthersPos.delete(id);
  }
  audio.clearMissing(presentIds);
}

// ---------------------------------------------------------------------
// look (pointer lock) + movement input
// ---------------------------------------------------------------------

const MOUSE_SENS = 0.0022;
let viewAngle = 0;
let locked = false;
let pointerLockTried = false;

canvas.addEventListener('mousedown', (e) => {
  if (!locked) {
    pointerLockTried = true;
    canvas.requestPointerLock();
    return;
  }
  if (e.button === 0) sendAction(ACTION.ATTACK, { hand: 'left' });
  if (e.button === 2) sendAction(ACTION.ATTACK, { hand: 'right' });
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
});

// Pointer lock isn't available in every embedding context (some in-app
// browser panes block it). If it fails, fall back silently to arrow-key
// turning below rather than leaving mouse-look looking broken.
document.addEventListener('pointerlockerror', () => {
  if (pointerLockTried) log('Mouse-look is not available here — hold left/right arrow to turn.', 'bad');
  pointerLockTried = false;
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

// Arrow left/right turn the view continuously while held (not a snap-turn —
// a discrete jump mid-corridor used to yank "forward" straight into a wall).
// This works whether or not the mouse-look pointer lock is available.
const KEY_TURN_RATE = Math.PI * 0.8; // ~144°/sec
function applyKeyTurn(dt) {
  let turn = 0;
  if (keys.has('arrowleft')) turn -= 1;
  if (keys.has('arrowright')) turn += 1;
  if (turn !== 0) viewAngle = normalizeAngle(viewAngle + turn * KEY_TURN_RATE * dt);
}

const keys = new Set();
const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown']);
window.addEventListener('keydown', (e) => {
  if (document.activeElement === nameInput) return;
  const key = e.key.toLowerCase();
  keys.add(key);
  if (!e.repeat && MOVEMENT_KEYS.has(key)) pumpInput(performance.now(), true);
  if (!e.repeat && (e.code === 'KeyZ' || e.code === 'KeyM')) {
    sendAction(ACTION.ATTACK, { hand: e.code === 'KeyZ' ? 'left' : 'right' });
    e.preventDefault();
  }
  if (e.key === 'e' || e.key === 'E' || e.key === 'o' || e.key === 'O') sendAction(ACTION.PICKUP);
  if (e.key === ' ') { sendAction(ACTION.CAST); e.preventDefault(); }
  const n = Number(e.key);
  if (n >= 1 && n <= 8) equipSlot(n - 1);
});
window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  keys.delete(key);
  if (MOVEMENT_KEYS.has(key)) pumpInput(performance.now(), true);
});
window.addEventListener('blur', () => {
  keys.clear();
  pumpInput(performance.now(), true);
});

function sendAction(action, extra) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type: MSG.ACTION, action, ...extra }));
}

let lastInputSent = 0;
let inputTimer = null;

function movementVector() {
  let fb = 0, lr = 0;
  if (keys.has('w') || keys.has('arrowup')) fb += 1;
  if (keys.has('s') || keys.has('arrowdown')) fb -= 1;
  if (keys.has('d')) lr += 1;
  if (keys.has('a')) lr -= 1;

  let mx = 0, my = 0;
  if (fb !== 0 || lr !== 0) {
    const fx = Math.cos(viewAngle), fy = Math.sin(viewAngle);
    const rx = Math.cos(viewAngle + Math.PI / 2), ry = Math.sin(viewAngle + Math.PI / 2);
    mx = fx * fb + rx * lr;
    my = fy * fb + ry * lr;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }
  }
  return { mx, my };
}

function pumpInput(now, force = false) {
  if (!ws || ws.readyState !== ws.OPEN || !self) return;
  if (!force && now - lastInputSent < 50) return;
  lastInputSent = now;
  const { mx, my } = movementVector();
  ws.send(JSON.stringify({ type: MSG.INPUT, mx, my, aim: viewAngle }));
}

// ---------------------------------------------------------------------
// inventory / HUD (unchanged from the DM-view build)
// ---------------------------------------------------------------------

const hpFill = document.getElementById('hpFill');
const hpText = document.getElementById('hpText');
const mpFill = document.getElementById('mpFill');
const mpText = document.getElementById('mpText');
const staminaFill = document.getElementById('staminaFill');
const staminaText = document.getElementById('staminaText');
const spdText = document.getElementById('spdText');
const lvlText = document.getElementById('lvlText');
const kdText = document.getElementById('kdText');
const deadBanner = document.getElementById('deadBanner');
const respawnIn = document.getElementById('respawnIn');
const swapBanner = document.getElementById('swapBanner');
const inventoryEl = document.getElementById('inventory');
const logEl = document.getElementById('log');
let inventorySignature = '';

function updateHud() {
  if (!self) return;
  hpFill.style.transform = `scaleX(${Math.max(0, self.health / self.maxHealth)})`;
  hpText.textContent = `HP ${self.health}/${self.maxHealth}`;
  mpFill.style.transform = `scaleX(${Math.max(0, self.mana / self.maxMana)})`;
  mpText.textContent = `MP ${self.mana}/${self.maxMana}`;
  staminaFill.style.transform = `scaleX(${Math.max(0, self.stamina / self.maxStamina)})`;
  staminaText.textContent = `STA ${self.stamina}/${self.maxStamina}`;
  spdText.textContent = `${self.speed.toFixed(1)}${self.moving ? ' RUN' : ''}`;
  lvlText.textContent = self.level + 1;
  kdText.textContent = `${self.kills}/${self.deaths}`;

  deadBanner.classList.toggle('hidden', self.alive);
  if (!self.alive) respawnIn.textContent = (self.respawnIn / 1000).toFixed(1);

  swapBanner.classList.toggle('hidden', self.swapRemaining <= 0);

  renderInventory();
}

function renderInventory() {
  const signature = JSON.stringify({
    items: self.inventory.map((item) => item
      ? [item.uid, item.durability, item.castsRemaining, item.lifeSeconds]
      : null),
    left: self.leftHandUid,
    right: self.rightHandUid,
    spell: self.equippedSpellUid,
  });
  if (signature === inventorySignature) return;
  inventorySignature = signature;
  inventoryEl.innerHTML = '';
  const size = 8;
  for (let i = 0; i < size; i++) {
    const item = self.inventory[i];
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.index = String(i);
    if (i === 4) slot.classList.add('right-bank-start');
    slot.classList.add(i < 4 ? 'left-bank' : 'right-bank');
    const k = document.createElement('div');
    k.className = 'k';
    k.textContent = String(i + 1);
    slot.appendChild(k);

    if (item) {
      slot.classList.add(item.kind);
      if (item.uid === self.leftHandUid) slot.classList.add('equipped', 'left-equipped');
      if (item.uid === self.rightHandUid) slot.classList.add('equipped', 'right-equipped');
      if (item.uid === self.equippedSpellUid) slot.classList.add('equipped', 'spell-equipped');
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = item.name;
      slot.appendChild(name);
      if (item.kind === 'weapon') {
        const d = document.createElement('div');
        d.textContent = `dmg ${item.damage}`;
        slot.appendChild(d);
        const s = document.createElement('div');
        s.textContent = `sta ${item.staminaCost}`;
        slot.appendChild(s);
      } else if (item.kind === 'spell') {
        const d = document.createElement('div');
        d.textContent = item.heal ? `heal ${item.heal}` : `dmg ${item.damage}`;
        slot.appendChild(d);
        const m = document.createElement('div');
        m.textContent = `mp ${item.manaCost} · sta ${item.staminaCost}`;
        slot.appendChild(m);
      } else if (item.kind === 'shield') {
        const d = document.createElement('div');
        d.textContent = `dodge ${item.dodgeDistance}`;
        slot.appendChild(d);
        const s = document.createElement('div');
        s.textContent = `sta ${item.staminaCost}`;
        slot.appendChild(s);
      }
      const lifecycle = [];
      if (Number.isFinite(item.durability)) lifecycle.push(`wear ${item.durability}/${item.maxDurability}`);
      if (Number.isFinite(item.castsRemaining)) lifecycle.push(`casts ${item.castsRemaining}/${item.maxCasts}`);
      if (Number.isFinite(item.lifeSeconds)) {
        const minutes = Math.floor(item.lifeSeconds / 60);
        const seconds = String(item.lifeSeconds % 60).padStart(2, '0');
        lifecycle.push(`life ${minutes}:${seconds}`);
      }
      if (lifecycle.length) {
        const life = document.createElement('div');
        life.className = 'lifecycle';
        life.textContent = lifecycle.join(' · ');
        slot.appendChild(life);
      }
      slot.addEventListener('click', () => sendAction(ACTION.EQUIP, { uid: item.uid }));
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        sendAction(ACTION.DROP, { uid: item.uid });
      });
      slot.draggable = true;
      slot.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(i));
        e.dataTransfer.effectAllowed = 'move';
      });
    } else {
      slot.classList.add('empty');
    }
    slot.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('text/plain'));
      if (Number.isInteger(from)) sendAction(ACTION.MOVE_SLOT, { from, to: i });
    });
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
    case 'nostamina': log(`not enough stamina for ${ev.name} (need ${ev.need})`, 'bad'); break;
    case 'broken': log(`${ev.name} broke from wear`, 'bad'); break;
    case 'expired': log(`${ev.name} expired`, 'bad'); break;
    case 'cacheregen':
      if (ev.level === self?.level) log('A chest reformed somewhere in the dungeon.', 'good');
      break;
    case 'battleportal':
      renderX = self.x;
      renderY = self.y;
      log(`${ev.by} opened the battle portal — ${ev.fighters} hunter(s) drawn into the arena!`, 'bad');
      break;
    case 'linkportal':
      renderX = self.x;
      renderY = self.y;
      log(`travelled through the ${ev.color} link portal`, 'good');
      break;
    case 'swap': log(`swapping to ${ev.name}…`); break;
    case 'unequip': log(`unequipped ${ev.name}`); break;
    case 'dodge': log(`${ev.name}: dodge`); break;
    case 'throw': log(`threw ${ev.name}`); break;
    case 'windup': break;
    default: break;
  }
}

// ---------------------------------------------------------------------
// first-person raycaster — textured walls
// ---------------------------------------------------------------------

const FOV = 70 * Math.PI / 180;
const RAYS = 320;
const MAX_DIST = SIGHT_RADIUS;

// Procedurally-generated stone-block textures, drawn once to an offscreen
// canvas. No image assets, no build step — and no licensing question, unlike
// pulling real photos off a stock site. One tint per wall orientation bakes
// the N/S-vs-E/W shading straight into the texture instead of an extra pass.
function makeStoneTexture(size, tint, courses = 8, blocksPerRow = 5) {
  const tex = document.createElement('canvas');
  tex.width = size;
  tex.height = size;
  const tctx = tex.getContext('2d');

  tctx.fillStyle = `rgb(${tint.r},${tint.g},${tint.b})`;
  tctx.fillRect(0, 0, size, size);

  const courseH = size / courses;
  const blockW = size / blocksPerRow;

  for (let row = 0, y = 0; y < size; y += courseH, row++) {
    const offset = (row % 2) * (blockW / 2);
    for (let x = -blockW; x < size + blockW; x += blockW) {
      const bx = x + offset;
      const shade = 0.72 + Math.random() * 0.4;
      tctx.fillStyle = `rgb(${Math.min(255, tint.r * shade) | 0},${Math.min(255, tint.g * shade) | 0},${Math.min(255, tint.b * shade) | 0})`;
      tctx.fillRect(bx, y, blockW - 2, courseH - 2);

      if (Math.random() < 0.16) {
        const mx = bx + blockW * (0.3 + Math.random() * 0.4);
        const my = y + courseH * (0.3 + Math.random() * 0.4);
        const r = courseH * (0.5 + Math.random() * 0.4);
        const grad = tctx.createRadialGradient(mx, my, 0, mx, my, r);
        grad.addColorStop(0, 'rgba(40,70,35,0.5)');
        grad.addColorStop(1, 'rgba(40,70,35,0)');
        tctx.fillStyle = grad;
        tctx.fillRect(bx, y, blockW, courseH);
      }
    }
  }

  tctx.strokeStyle = 'rgba(0,0,0,0.55)';
  tctx.lineWidth = 2;
  for (let y = 0; y <= size; y += courseH) {
    tctx.beginPath();
    tctx.moveTo(0, y);
    tctx.lineTo(size, y);
    tctx.stroke();
  }
  for (let row = 0, y = 0; y < size; y += courseH, row++) {
    const offset = (row % 2) * (blockW / 2);
    for (let x = -blockW; x < size + blockW; x += blockW) {
      const bx = x + offset;
      tctx.beginPath();
      tctx.moveTo(bx, y);
      tctx.lineTo(bx, y + courseH);
      tctx.stroke();
    }
  }

  for (let i = 0; i < size * 6; i++) {
    tctx.fillStyle = `rgba(0,0,0,${(Math.random() * 0.25).toFixed(2)})`;
    tctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }

  return tex;
}

const WALL_TEX = {
  0: makeStoneTexture(256, { r: 60, g: 56, b: 50 }), // N/S faces
  1: makeStoneTexture(256, { r: 36, g: 34, b: 30 }), // E/W faces, darker
};

// Floor/ceiling casting samples raw pixels directly (see drawFloorCeiling),
// so it needs the texture's ImageData, not just a drawable canvas.
function extractPixels(texCanvas) {
  const tctx = texCanvas.getContext('2d');
  return { data: tctx.getImageData(0, 0, texCanvas.width, texCanvas.height).data, size: texCanvas.width };
}

const FLOOR_TEX = extractPixels(makeStoneTexture(256, { r: 50, g: 44, b: 36 }, 5, 4)); // big flagstones
const CEIL_TEX = extractPixels(makeStoneTexture(256, { r: 24, g: 23, b: 22 }, 9, 6)); // dark rough stone
const FOG_BG = { r: 3, g: 5, b: 7 }; // matches the old flat ceiling/floor fill

let renderX = null, renderY = null;
let lastFrameT = performance.now();
const CLIENT_PREDICTION_SECONDS = 0.075;

function updateSmoothing(dt) {
  if (!self) return;
  if (renderX === null) { renderX = self.x; renderY = self.y; return; }
  let targetX = self.x;
  let targetY = self.y;
  const { mx, my } = movementVector();
  let actionScale = 1;
  if (self.swapRemaining > 0 || self.dodgeRemaining > 0) actionScale = 0;
  else if (self.cast) actionScale = 0.4;
  else if (self.attack) actionScale = 0.7;
  if (self.alive && self.stamina > 0 && actionScale > 0 && Math.hypot(mx, my) > 0.001) {
    const lead = self.speed * movementSpeedScale * actionScale * CLIENT_PREDICTION_SECONDS;
    const predictedX = targetX + mx * lead;
    const predictedY = targetY + my * lead;
    if (!clientPositionBlocked(predictedX, targetY)) targetX = predictedX;
    if (!clientPositionBlocked(targetX, predictedY)) targetY = predictedY;
  }
  if (Math.hypot(targetX - renderX, targetY - renderY) > 1.25) {
    renderX = targetX;
    renderY = targetY;
    return;
  }
  const k = Math.min(1, dt * 14);
  renderX += (targetX - renderX) * k;
  renderY += (targetY - renderY) * k;
}

function tileBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= width || ty >= height) return true;
  const v = map[ty * width + tx];
  return v === -1 || v === TILE.WALL;
}

// Lode's DDA raycast: steps grid cells until a wall (or unexplored cell) is
// hit, returning the perpendicular (non-fisheye) distance directly, plus
// wallX — the 0..1 fractional position along the hit face, used to pick a
// texture column.
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
      return { dist: MAX_DIST, side, unknown: false, wallX: 0 };
    }
    const v = map[mapY * width + mapX];
    if (v === -1 || v === TILE.WALL) {
      const dist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
      const hitX = px + dist * dirX, hitY = py + dist * dirY;
      let wallX = side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);
      if (side === 0 && dirX > 0) wallX = 1 - wallX;
      if (side === 1 && dirY < 0) wallX = 1 - wallX;
      return { dist: Math.min(dist, MAX_DIST), side, unknown: v === -1, wallX };
    }
  }
  return { dist: MAX_DIST, side, unknown: false, wallX: 0 };
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

// Floor/ceiling casting (Lode's tutorial technique): for each screen row,
// every pixel in that row sits at the same world-space distance from the
// player (true for a flat, non-rolled camera), so distance is computed once
// per row and world position is stepped linearly across it. Sampled in 2x2
// blocks — quarters the pixel work and reads as consistently "chunky" with
// the wall columns, which are already rendered at reduced (RAYS) resolution
// rather than full pixel width.
let frameImage = null;

function drawFloorCeiling(horizon) {
  const w = canvas.width, h = canvas.height;
  if (!frameImage || frameImage.width !== w || frameImage.height !== h) {
    frameImage = ctx.createImageData(w, h);
  }
  const buf = frameImage.data;
  const posZ = h * 0.45; // matches wallHeightAt's (h*0.9)/dist, halved

  const a0 = viewAngle - FOV / 2, a1 = viewAngle + FOV / 2;
  const dir0x = Math.cos(a0), dir0y = Math.sin(a0);
  const dir1x = Math.cos(a1), dir1y = Math.sin(a1);

  const STEP = 2;

  for (let p = 0; p < h; p += STEP) {
    const isCeil = p < horizon;
    const vy = isCeil ? horizon - p : p - horizon;
    if (vy < 1) continue; // right at the horizon — leave as the thin dark seam
    const rowDist = posZ / vy;
    const fog = clamp(rowDist / MAX_DIST, 0, 1) * 0.95;
    const tex = isCeil ? CEIL_TEX : FLOOR_TEX;
    const mask = tex.size - 1;

    const stepX = (rowDist * (dir1x - dir0x) / w) * STEP;
    const stepY = (rowDist * (dir1y - dir0y) / w) * STEP;
    let fx = renderX + rowDist * dir0x;
    let fy = renderY + rowDist * dir0y;

    for (let x = 0; x < w; x += STEP) {
      const tx = Math.floor(fx * tex.size) & mask;
      const ty = Math.floor(fy * tex.size) & mask;
      const si = (ty * tex.size + tx) * 4;
      const r = tex.data[si] * (1 - fog) + FOG_BG.r * fog;
      const g = tex.data[si + 1] * (1 - fog) + FOG_BG.g * fog;
      const b = tex.data[si + 2] * (1 - fog) + FOG_BG.b * fog;

      for (let by = 0; by < STEP && p + by < h; by++) {
        let di = ((p + by) * w + x) * 4;
        for (let bx = 0; bx < STEP && x + bx < w; bx++) {
          buf[di] = r; buf[di + 1] = g; buf[di + 2] = b; buf[di + 3] = 255;
          di += 4;
        }
      }
      fx += stepX; fy += stepY;
    }
  }

  ctx.putImageData(frameImage, 0, 0);
}

function drawScene() {
  const w = canvas.width, h = canvas.height;
  const horizon = h / 2;
  const floorScale = h * 0.45; // matches drawFloorCeiling's posZ so billboards sit on the actual floor

  drawFloorCeiling(horizon);

  const colW = w / RAYS;
  const columns = new Array(RAYS);
  for (let i = 0; i < RAYS; i++) {
    const t = i / (RAYS - 1);
    const rayAngle = viewAngle - FOV / 2 + t * FOV;
    const res = castRay(renderX, renderY, rayAngle);
    const dist = Math.max(0.05, res.dist * Math.cos(rayAngle - viewAngle));
    const wallH = wallHeightAt(dist, h);
    columns[i] = { x: t * w, top: horizon - wallH / 2, bot: horizon + wallH / 2, dist, side: res.side, unknown: res.unknown, wallX: res.wallX };
  }

  // texture-mapped wall slices, distance-fogged with a translucent overlay
  for (const c of columns) {
    const fog = clamp(c.dist / MAX_DIST, 0, 1);
    const sliceH = c.bot - c.top;

    if (c.unknown) {
      // edge of explored territory, not a real wall — flag it, don't texture it
      ctx.fillStyle = `rgba(255,207,77,${(0.35 * (1 - fog)).toFixed(3)})`;
      ctx.fillRect(c.x, c.top, colW + 1, sliceH);
      continue;
    }

    const tex = WALL_TEX[c.side];
    const sx = clamp(Math.floor(c.wallX * tex.width), 0, tex.width - 1);
    ctx.drawImage(tex, sx, 0, 1, tex.height, c.x, c.top, colW + 1, sliceH);

    if (fog > 0) {
      ctx.fillStyle = `rgba(3,5,7,${(fog * 0.92).toFixed(3)})`;
      ctx.fillRect(c.x, c.top, colW + 1, sliceH);
    }
  }

  drawBillboards(horizon, floorScale, w, h);
}

function collectBillboards() {
  const list = [];
  for (const o of others.values()) list.push({ kind: 'player', ref: o, x: o.x, y: o.y });
  for (const c of caches.values()) list.push({ kind: 'cache', ref: c, x: c.x, y: c.y });
  for (const d of drops.values()) list.push({ kind: 'drop', ref: d, x: d.x, y: d.y });
  for (const p of projectiles.values()) list.push({ kind: 'projectile', ref: p, x: p.x, y: p.y });
  if (battlePortal) list.push({ kind: 'battlePortal', ref: battlePortal, x: battlePortal.x, y: battlePortal.y });
  for (const p of linkPortals.values()) list.push({ kind: 'linkPortal', ref: p, x: p.x, y: p.y });

  const visible = [];
  for (const item of list) {
    const dx = item.x - renderX, dy = item.y - renderY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.05 || dist > MAX_DIST) continue;
    const diff = normalizeAngle(Math.atan2(dy, dx) - viewAngle);
    if (Math.abs(diff) > FOV / 2 + 0.3) continue;
    const isPortal = item.kind === 'battlePortal' || item.kind === 'linkPortal';
    // Portal glow is a supernatural landmark: nearby rings remain visible
    // through intervening walls, unlike ordinary physical billboards.
    if (!isPortal && !clientHasLineOfSight(renderX, renderY, item.x, item.y)) continue;
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
    else if (item.kind === 'drop') drawDropGlyph(item.ref, sx, feetY, fullH);
    else if (item.kind === 'projectile') drawProjectileGlyph(item.ref, sx, feetY, fullH);
    else if (item.kind === 'battlePortal') drawBattlePortalGlyph(item.ref, sx, feetY, fullH);
    else drawLinkPortalGlyph(item.ref, sx, feetY, fullH);
  }
}

function clientPositionBlocked(x, y) {
  const r = PLAYER_RADIUS;
  return tileBlocked(Math.floor(x - r), Math.floor(y - r)) ||
    tileBlocked(Math.floor(x + r), Math.floor(y - r)) ||
    tileBlocked(Math.floor(x - r), Math.floor(y + r)) ||
    tileBlocked(Math.floor(x + r), Math.floor(y + r));
}

function drawBattlePortalGlyph(portal, sx, feetY, fullH) {
  const t = performance.now() / 1000;
  const portalH = clamp(fullH * 0.78, 26, canvas.height * 1.25);
  const portalW = portalH * 0.48;
  const cy = feetY - portalH * 0.48;
  const activeAlpha = portal.active ? 1 : 0.28;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#ff2038';
  ctx.shadowBlur = clamp(portalW * 0.22, 5, 28);
  ctx.lineWidth = clamp(portalW * 0.045, 1.5, 5);
  for (let i = 0; i < 5; i++) {
    const phase = t * (1.2 + i * 0.17) + i * 1.1;
    const wobbleX = Math.sin(phase) * portalW * 0.09;
    const wobbleY = Math.cos(phase * 1.3) * portalH * 0.035;
    const scale = 0.55 + i * 0.12 + Math.sin(phase * 1.7) * 0.035;
    ctx.strokeStyle = `rgba(255,${25 + i * 10},${45 + i * 8},${activeAlpha * (0.45 + i * 0.1)})`;
    ctx.beginPath();
    ctx.ellipse(sx + wobbleX, cy + wobbleY, portalW * scale, portalH * scale * 0.5, phase * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(120,0,12,${activeAlpha * 0.22})`;
  ctx.beginPath();
  ctx.ellipse(sx, cy, portalW * 0.5, portalH * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const LINK_PORTAL_COLORS = {
  green: [40, 255, 125],
  blue: [50, 155, 255],
  yellow: [255, 220, 45],
};

function drawLinkPortalGlyph(portal, sx, feetY, fullH) {
  const rgb = LINK_PORTAL_COLORS[portal.color] || [255, 255, 255];
  const t = performance.now() / 1000;
  const portalH = clamp(fullH * 0.78, 26, canvas.height * 1.25);
  const portalW = portalH * 0.48;
  const cy = feetY - portalH * 0.48;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = `rgb(${rgb.join(',')})`;
  ctx.shadowBlur = clamp(portalW * 0.22, 5, 28);
  ctx.lineWidth = clamp(portalW * 0.045, 1.5, 5);
  for (let i = 0; i < 5; i++) {
    const phase = t * (1.2 + i * 0.17) + i * 1.1;
    const wobbleX = Math.sin(phase) * portalW * 0.09;
    const wobbleY = Math.cos(phase * 1.3) * portalH * 0.035;
    const scale = 0.55 + i * 0.12 + Math.sin(phase * 1.7) * 0.035;
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.45 + i * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(sx + wobbleX, cy + wobbleY, portalW * scale, portalH * scale * 0.5, phase * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(${Math.round(rgb[0] * 0.45)},${Math.round(rgb[1] * 0.45)},${Math.round(rgb[2] * 0.45)},0.22)`;
  ctx.beginPath();
  ctx.ellipse(sx, cy, portalW * 0.5, portalH * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerGlyph(o, sx, feetY, fullH, dist) {
  const fog = Math.max(0.12, 1 - dist / MAX_DIST);
  const bodyH = clamp(fullH * 0.68, 12, canvas.height * 1.6);
  const bodyW = bodyH * 0.42;
  const topY = feetY - bodyH;
  const lineW = clamp(bodyW * 0.055, 1, 3.5);

  ctx.save();
  ctx.globalAlpha = fog;

  if (!o.alive) {
    const corpseH = bodyH * 0.18;
    const corpseW = bodyH * 0.72;
    const cy = feetY - corpseH * 0.45;

    // Fallen cloak and collapsed hood.
    ctx.fillStyle = '#07100b';
    ctx.strokeStyle = '#ff5a68';
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.moveTo(sx - corpseW * 0.5, cy);
    ctx.quadraticCurveTo(sx - corpseW * 0.15, cy - corpseH, sx + corpseW * 0.42, cy - corpseH * 0.35);
    ctx.lineTo(sx + corpseW * 0.5, cy + corpseH * 0.25);
    ctx.quadraticCurveTo(sx, cy + corpseH * 0.5, sx - corpseW * 0.5, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx - corpseW * 0.34, cy - corpseH * 0.18, corpseH * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = Math.max(0.45, fog);
    ctx.fillStyle = '#ff7a86';
    ctx.font = `${clamp(bodyH * 0.1, 10, 18)}px Courier New, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(o.name, sx, cy - corpseH * 1.25);
    ctx.restore();
    return;
  }

  const shoulderY = topY + bodyH * 0.34;
  const hoodBottomY = topY + bodyH * 0.39;

  // Deep cloak: a solid silhouette makes the figure readable against the
  // textured dungeon while the bright edge preserves the wireframe style.
  const cloak = ctx.createLinearGradient(sx, shoulderY, sx, feetY);
  cloak.addColorStop(0, '#10251a');
  cloak.addColorStop(1, '#030706');
  ctx.fillStyle = cloak;
  ctx.strokeStyle = '#35ff8a';
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.moveTo(sx - bodyW * 0.33, shoulderY);
  ctx.quadraticCurveTo(sx - bodyW * 0.5, topY + bodyH * 0.62, sx - bodyW * 0.55, feetY);
  ctx.lineTo(sx + bodyW * 0.55, feetY);
  ctx.quadraticCurveTo(sx + bodyW * 0.5, topY + bodyH * 0.62, sx + bodyW * 0.33, shoulderY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pointed hood and dark face opening.
  ctx.fillStyle = '#0b1b12';
  ctx.beginPath();
  ctx.moveTo(sx, topY);
  ctx.bezierCurveTo(sx - bodyW * 0.38, topY + bodyH * 0.06, sx - bodyW * 0.42, hoodBottomY, sx, hoodBottomY);
  ctx.bezierCurveTo(sx + bodyW * 0.42, hoodBottomY, sx + bodyW * 0.38, topY + bodyH * 0.06, sx, topY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#010302';
  ctx.beginPath();
  ctx.ellipse(sx, topY + bodyH * 0.23, bodyW * 0.2, bodyH * 0.105, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes remain subtle at range and disappear naturally with fog.
  if (bodyH > 20) {
    ctx.fillStyle = '#9dffd0';
    const eyeR = clamp(bodyW * 0.025, 0.6, 2.2);
    ctx.beginPath();
    ctx.arc(sx - bodyW * 0.07, topY + bodyH * 0.225, eyeR, 0, Math.PI * 2);
    ctx.arc(sx + bodyW * 0.07, topY + bodyH * 0.225, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  // A raised amber weapon telegraphs an incoming attack; after release it
  // follows through across the cloak. Idle hunters keep the subtle blade.
  const attackMotion = o.attack
    ? (o.attack.phase === 'windup' ? -0.35 - o.attack.progress * 0.55 : -0.9 + o.attack.progress * 1.45)
    : 0;
  const weaponSide = o.attack?.hand === 'left' ? -1 : 1;
  ctx.strokeStyle = o.attack?.phase === 'windup' ? '#ffcf4d' : '#b8d8c6';
  ctx.lineWidth = clamp(lineW * 0.65, 1, 2.5);
  const gripX = sx + weaponSide * bodyW * 0.24;
  const gripY = topY + bodyH * 0.55;
  const bladeAngle = weaponSide > 0 ? 0.55 + attackMotion : Math.PI - 0.55 - attackMotion;
  const bladeLen = bodyW * 0.42;
  const tipX = gripX + Math.cos(bladeAngle) * bladeLen;
  const tipY = gripY + Math.sin(bladeAngle) * bladeLen;
  ctx.beginPath();
  ctx.moveTo(gripX, gripY);
  ctx.lineTo(tipX, tipY);
  ctx.moveTo(gripX - weaponSide * bodyW * 0.08, gripY - bodyH * 0.015);
  ctx.lineTo(gripX + weaponSide * bodyW * 0.08, gripY + bodyH * 0.015);
  ctx.stroke();

  if (o.cast) drawConvergingSparkles(sx, topY + bodyH * 0.3, bodyW * 1.25, o.cast.progress, o.cast.style, fog);

  ctx.restore();
}

// A wireframe box (front face + offset back face + connecting edges) reads
// as an actual 3D chest; a single rect plus a seam line just looked like two
// flat rectangles stacked on top of each other.
// Amber = chest material (matches the caches' colour everywhere else in the
// HUD); blue = the magic in it (matches the existing spell/blue convention
// used for spell drops), so the glow reads as "enchanted" rather than just
// "a different colour for no reason."
function drawCacheGlyph(sx, feetY, fullH) {
  const t = performance.now();
  const pulse = 1 + Math.sin(t / 400) * 0.06;
  const glow = 0.5 + Math.sin(t / 260) * 0.5;

  const rh = clamp(fullH * 0.26, 7, canvas.height * 0.45) * pulse;
  const rw = rh * 1.25;
  const depth = rw * 0.34;
  const bx = depth * 0.75, by = -depth * 0.55; // back face recedes up-and-right

  const left = sx - rw / 2, right = sx + rw / 2;
  const top = feetY - rh, bottom = feetY;
  const gemY = top + rh * 0.5;

  // soft magical aura behind the whole chest
  const auraR = rw * (1.5 + glow * 0.35);
  const aura = ctx.createRadialGradient(sx, gemY, 0, sx, gemY, auraR);
  aura.addColorStop(0, `rgba(77,195,255,${(0.16 + glow * 0.12).toFixed(2)})`);
  aura.addColorStop(1, 'rgba(77,195,255,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(sx - auraR, gemY - auraR, auraR * 2, auraR * 2);

  // solid wood chest body: front + oblique top/side faces, shaded as if lit
  // from above (top lighter, side in shadow) so the fill still reads as 3D
  // instead of a flat rectangle. Only the 9 edges actually visible from this
  // angle get drawn — the old version stroked the full hidden back face too,
  // which was fine as a see-through cage but wrong once solid.
  ctx.fillStyle = '#3a2614';
  ctx.fillRect(left, top, rw, rh); // front

  ctx.fillStyle = '#5a3c1c';
  ctx.beginPath();
  ctx.moveTo(left, top); ctx.lineTo(left + bx, top + by);
  ctx.lineTo(right + bx, top + by); ctx.lineTo(right, top);
  ctx.closePath();
  ctx.fill(); // top

  ctx.fillStyle = '#241608';
  ctx.beginPath();
  ctx.moveTo(right, top); ctx.lineTo(right + bx, top + by);
  ctx.lineTo(right + bx, bottom + by); ctx.lineTo(right, bottom);
  ctx.closePath();
  ctx.fill(); // side (shadow)

  ctx.strokeStyle = '#ffcf4d';
  ctx.lineWidth = clamp(rh * 0.06, 1, 3);
  ctx.strokeRect(left, top, rw, rh);
  ctx.beginPath();
  ctx.moveTo(left, top); ctx.lineTo(left + bx, top + by);
  ctx.lineTo(right + bx, top + by); ctx.lineTo(right, top);
  ctx.moveTo(right, top); ctx.lineTo(right + bx, top + by);
  ctx.lineTo(right + bx, bottom + by); ctx.lineTo(right, bottom);
  ctx.stroke();

  // iron banding straps across the front face
  ctx.lineWidth = clamp(rh * 0.045, 1, 2);
  ctx.strokeStyle = 'rgba(255,207,77,0.65)';
  for (const f of [0.32, 0.68]) {
    ctx.beginPath();
    ctx.moveTo(left, top + rh * f);
    ctx.lineTo(right, top + rh * f);
    ctx.stroke();
  }

  // glowing gem/lock centrepiece
  const gemR = rh * 0.14 * (0.85 + glow * 0.3);
  const gemGlow = ctx.createRadialGradient(sx, gemY, 0, sx, gemY, gemR * 2.2);
  gemGlow.addColorStop(0, `rgba(140,220,255,${(0.7 + glow * 0.3).toFixed(2)})`);
  gemGlow.addColorStop(1, 'rgba(140,220,255,0)');
  ctx.fillStyle = gemGlow;
  ctx.beginPath();
  ctx.arc(sx, gemY, gemR * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9ecff';
  ctx.lineWidth = clamp(gemR * 0.3, 1, 2);
  ctx.beginPath();
  ctx.moveTo(sx, gemY - gemR); ctx.lineTo(sx + gemR, gemY);
  ctx.lineTo(sx, gemY + gemR); ctx.lineTo(sx - gemR, gemY);
  ctx.closePath();
  ctx.stroke();

  // twinkling sparkles at fixed offsets, each on its own phase
  const sparkles = [
    { ox: -rw * 0.55, oy: -rh * 0.15, phase: 0 },
    { ox: rw * 0.6, oy: -rh * 0.35, phase: 2.1 },
    { ox: rw * 0.05, oy: -rh * 0.75, phase: 4.2 },
  ];
  for (const s of sparkles) {
    const tw = 0.5 + 0.5 * Math.sin(t / 260 + s.phase);
    if (tw < 0.35) continue;
    const px = sx + s.ox, py = top + s.oy, r = rh * 0.09 * tw;
    ctx.strokeStyle = `rgba(190,230,255,${tw.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - r, py); ctx.lineTo(px + r, py);
    ctx.moveTo(px, py - r); ctx.lineTo(px, py + r);
    ctx.stroke();
  }
}

function drawDropGlyph(d, sx, feetY, fullH) {
  const size = clamp(fullH * 0.22, 6, canvas.height * 0.4);
  ctx.strokeStyle = d.kind === 'weapon' ? '#ff9f5a' : '#4dc3ff';
  ctx.lineWidth = clamp(size * 0.08, 1, 3);
  ctx.strokeRect(sx - size / 2, feetY - size, size, size);
}

function spellColor(style) {
  if (style === 'knife') return '#e4ece8';
  if (style === 'frost') return '#9de8ff';
  if (style === 'ember') return '#ff7a3d';
  if (style === 'mend') return '#76ff9f';
  return '#d6b4ff';
}

function drawConvergingSparkles(cx, cy, radius, progress, style, alpha = 1) {
  const color = spellColor(style);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI * 2 / 12 + performance.now() / 900;
    const wobble = 0.82 + 0.18 * Math.sin(performance.now() / 130 + i * 2.3);
    const r = radius * (1 - progress * 0.88) * wobble;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.65;
    const size = clamp(radius * 0.035 * (0.7 + progress), 1, 4);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawProjectileGlyph(projectile, sx, feetY, fullH) {
  const r = clamp(fullH * 0.11 * projectile.energy, 3, 30);
  const cy = feetY - fullH * 0.42;
  const color = spellColor(projectile.style);
  if (projectile.style === 'knife') {
    ctx.strokeStyle = color;
    ctx.lineWidth = clamp(r * 0.45, 1.5, 4);
    ctx.beginPath();
    ctx.moveTo(sx - r * 1.8, cy + r * 0.8);
    ctx.lineTo(sx + r * 1.8, cy - r * 0.8);
    ctx.stroke();
    return;
  }
  const glow = ctx.createRadialGradient(sx, cy, 0, sx, cy, r * 3.2);
  glow.addColorStop(0, color);
  glow.addColorStop(0.35, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// First-person hand equipment. The authoritative attack phase comes from the
// server snapshot; this layer only turns it into readable stab/swing motion.
function drawFirstPersonLoadout() {
  if (!self?.alive) return;
  const left = self.inventory.find((item) => item?.uid === self.leftHandUid);
  const right = self.inventory.find((item) => item?.uid === self.rightHandUid);
  if (left) drawFirstPersonItem(left, 'left', self.attack?.hand === 'left' ? self.attack : null);
  if (right) drawFirstPersonItem(right, 'right', self.attack?.hand === 'right' ? self.attack : null);
}

function drawFirstPersonSpellConvergence() {
  if (!self?.cast) return;
  const radius = Math.min(canvas.width, canvas.height) * 0.24;
  drawConvergingSparkles(canvas.width / 2, canvas.height / 2, radius, self.cast.progress, self.cast.style, 0.9);
}

function drawFirstPersonItem(item, hand, attack) {
  const w = canvas.width, h = canvas.height;
  const side = hand === 'left' ? -1 : 1;
  const baseX = hand === 'left' ? w * 0.22 : w * 0.78;
  const baseY = h * 0.96;

  if (item.kind === 'shield') {
    const lift = self.dodgeRemaining > 0 ? h * 0.09 : 0;
    const sw = clamp(w * 0.1, 55, 150);
    const sh = sw * 0.82;
    ctx.fillStyle = 'rgba(18,28,32,0.88)';
    ctx.strokeStyle = self.dodgeRemaining > 0 ? '#9dffd0' : '#b8c7cf';
    ctx.lineWidth = clamp(sw * 0.025, 2, 4);
    ctx.beginPath();
    ctx.moveTo(baseX - sw / 2, baseY - lift - sh * 0.8);
    ctx.lineTo(baseX + sw / 2, baseY - lift - sh * 0.8);
    ctx.lineTo(baseX + sw * 0.42, baseY - lift - sh * 0.2);
    ctx.lineTo(baseX, baseY - lift);
    ctx.lineTo(baseX - sw * 0.42, baseY - lift - sh * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(baseX, baseY - lift - sh * 0.72);
    ctx.lineTo(baseX, baseY - lift - sh * 0.12);
    ctx.stroke();
    return;
  }
  if (item.kind !== 'weapon') return;

  let gripX = baseX;
  let gripY = baseY;
  let angle = hand === 'left' ? -1.02 : -2.12;
  const style = item.attackStyle || 'swing';
  if (attack) {
    const p = attack.progress;
    if (style === 'stab' || style === 'thrust') {
      const reach = attack.phase === 'windup' ? -p * 0.12 : Math.sin(p * Math.PI) * (style === 'thrust' ? 0.34 : 0.25);
      gripX += side * w * (attack.phase === 'windup' ? 0.04 * p : -0.12 * Math.sin(p * Math.PI));
      gripY -= h * reach;
      angle = hand === 'left' ? -1.18 : -1.96;
    } else if (style === 'throw') {
      const throwReach = attack.phase === 'windup' ? -p * 0.45 : -0.45 + p * 1.15;
      angle += side * throwReach;
      gripY -= h * 0.08 * Math.sin(p * Math.PI);
    } else {
      const sweep = attack.phase === 'windup' ? p * -0.75 : -0.75 + p * (style === 'cleave' ? 2.2 : 1.7);
      angle += side * sweep;
      gripY -= h * 0.04 * Math.sin(p * Math.PI);
      if (style === 'cleave' && attack.phase === 'release') {
        ctx.strokeStyle = `rgba(255,159,90,${(0.42 * (1 - p)).toFixed(2)})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.72, w * 0.23, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
    }
  }

  const weaponLen = clamp(h * (style === 'thrust' ? 0.42 : 0.31), 100, 360);
  const handleLen = weaponLen * 0.25;
  const tipX = gripX + Math.cos(angle) * weaponLen;
  const tipY = gripY + Math.sin(angle) * weaponLen;
  const handleX = gripX - Math.cos(angle) * handleLen;
  const handleY = gripY - Math.sin(angle) * handleLen;

  ctx.strokeStyle = attack?.phase === 'windup' ? '#ffcf4d' : '#d6e2dc';
  ctx.lineWidth = clamp(h * 0.008, 3, 8);
  ctx.beginPath();
  ctx.moveTo(handleX, handleY);
  ctx.lineTo(gripX, gripY);
  ctx.stroke();
  ctx.strokeStyle = '#eef7f2';
  ctx.lineWidth = clamp(h * 0.005, 2, 6);
  ctx.beginPath();
  ctx.moveTo(gripX, gripY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = '#ff9f5a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gripX - Math.sin(angle) * 18, gripY + Math.cos(angle) * 18);
  ctx.lineTo(gripX + Math.sin(angle) * 18, gripY - Math.cos(angle) * 18);
  ctx.stroke();
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

  if (battlePortal) drawPortalMinimapMarker(
    battlePortal,
    battlePortal.active ? '#ff2038' : 'rgba(255,32,56,0.35)',
    cx,
    cy,
    tilePx,
    size,
  );

  for (const portal of linkPortals.values()) {
    const rgb = LINK_PORTAL_COLORS[portal.color] || [255, 255, 255];
    drawPortalMinimapMarker(portal, `rgb(${rgb.join(',')})`, cx, cy, tilePx, size);
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

function drawPortalMinimapMarker(portal, color, cx, cy, tilePx, size) {
  const margin = 8;
  const rawX = size / 2 + (portal.x - cx) * tilePx;
  const rawY = size / 2 + (portal.y - cy) * tilePx;
  const offscreen = rawX < margin || rawX > size - margin || rawY < margin || rawY > size - margin;
  let sx = rawX;
  let sy = rawY;
  if (offscreen) {
    const dx = rawX - size / 2;
    const dy = rawY - size / 2;
    const scale = Math.min(
      (size / 2 - margin) / Math.max(Math.abs(dx), 0.001),
      (size / 2 - margin) / Math.max(Math.abs(dy), 0.001),
    );
    sx = size / 2 + dx * scale;
    sy = size / 2 + dy * scale;
  }
  mctx.save();
  mctx.strokeStyle = color;
  mctx.fillStyle = color;
  mctx.lineWidth = offscreen ? 2.5 : 1.75;
  if (offscreen) mctx.setLineDash([2, 2]);
  mctx.beginPath();
  mctx.arc(sx, sy, (offscreen ? 5 : 4) + Math.sin(performance.now() / 220), 0, Math.PI * 2);
  mctx.stroke();
  mctx.setLineDash([]);
  mctx.globalAlpha = 0.65;
  mctx.beginPath();
  mctx.arc(sx, sy, 2, 0, Math.PI * 2);
  mctx.fill();
  mctx.restore();
}

function loop(now) {
  const dt = Math.min(0.1, (now - lastFrameT) / 1000);
  lastFrameT = now;

  applyKeyTurn(dt);
  updateSmoothing(dt);

  ctx.fillStyle = '#04070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (self) {
    drawScene();
    drawFirstPersonSpellConvergence();
    drawFirstPersonLoadout();
    drawMinimap();
    audio.updateListener(renderX, renderY, viewAngle);
    const selfMoving = self.alive && self.moving;
    audio.setMoving('self', selfMoving, renderX, renderY, true);
  }

  requestAnimationFrame(loop);
}
