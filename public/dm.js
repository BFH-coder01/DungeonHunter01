import { TILE, MSG } from '/shared/constants.js';

// ---------------------------------------------------------------------
// The DungeonMaster has no character or fog and sees every player. In the
// trusted test build it can also update validated runtime balance settings.
// ---------------------------------------------------------------------

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const infoEl = document.getElementById('dmInfo');
const rosterEl = document.getElementById('dmRoster');
const controlsToggle = document.getElementById('dmControlsToggle');
const settingsForm = document.getElementById('dmSettingsForm');
const settingsReset = document.getElementById('dmSettingsReset');
const settingsStatus = document.getElementById('dmSettingsStatus');

let width = 0, height = 0;
let tiles = new Uint8Array(0);
let seed = 0, totalLevels = 0, level = 0;
let players = [];
let caches = [];
let drops = [];
let soundPoints = [];
let projectiles = [];
let battlePortal = null;
let linkPortals = [];
let staticMapCanvas = null;
let staticMapKey = '';

// Must match FOOTSTEP_MAX_DIST in public/audio.js — how far another
// player's footsteps are audible, used to draw the "who's making noise"
// range ring below.
const FOOTSTEP_RANGE = 16;
const prevPlayerPos = new Map(); // id -> {x,y}, used to infer "moving" for the audio-range ring
const movingIds = new Set();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  staticMapKey = '';
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
  if (msg.type === MSG.SETTINGS) return onSettings(msg);
});

controlsToggle.addEventListener('click', () => settingsForm.classList.toggle('hidden'));
settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!settingsForm.reportValidity() || ws.readyState !== WebSocket.OPEN) return;
  const settings = {};
  for (const input of settingsForm.querySelectorAll('[data-setting]')) {
    settings[input.dataset.setting] = Number(input.value) * Number(input.dataset.scale || 1);
  }
  settingsStatus.textContent = 'Applyingâ€¦';
  ws.send(JSON.stringify({ type: MSG.DM_SETTINGS, settings }));
});
settingsReset.addEventListener('click', () => {
  if (ws.readyState !== WebSocket.OPEN) return;
  settingsStatus.textContent = 'Resettingâ€¦';
  ws.send(JSON.stringify({ type: MSG.DM_SETTINGS, reset: true }));
});

function onWelcome(msg) {
  seed = msg.seed;
  totalLevels = msg.totalLevels;
  level = msg.level;
  width = msg.width;
  height = msg.height;
  tiles = Uint8Array.from(msg.tiles);
  soundPoints = msg.soundPoints || [];
  renderSettings(msg.settings);
  requestAnimationFrame(loop);
}

function onSettings(msg) {
  renderSettings(msg.settings);
  settingsStatus.textContent = msg.error || 'Live settings applied.';
  settingsStatus.classList.toggle('error', Boolean(msg.error));
}

function renderSettings(settings) {
  if (!settings) return;
  for (const input of settingsForm.querySelectorAll('[data-setting]')) {
    const value = settings[input.dataset.setting];
    if (Number.isFinite(value)) input.value = String(value / Number(input.dataset.scale || 1));
  }
}

function onState(msg) {
  level = msg.level;
  players = msg.players;
  if (msg.caches) caches = msg.caches;
  if (msg.drops) drops = msg.drops;
  projectiles = msg.projectiles || [];
  battlePortal = msg.battlePortal || null;
  linkPortals = msg.linkPortals || [];
  updateMoving();
  updateHeader();
}

// The DM feed doesn't carry an explicit "moving" flag — inferred the same
// way client.js infers it for other players' footstep audio: a meaningful
// position delta since the last snapshot.
function updateMoving() {
  const presentIds = new Set();
  for (const p of players) {
    presentIds.add(p.id);
    const prev = prevPlayerPos.get(p.id);
    const moved = p.alive && prev && Math.hypot(p.x - prev.x, p.y - prev.y) > 0.02;
    if (moved) movingIds.add(p.id); else movingIds.delete(p.id);
    prevPlayerPos.set(p.id, { x: p.x, y: p.y });
  }
  for (const id of Array.from(prevPlayerPos.keys())) {
    if (!presentIds.has(id)) { prevPlayerPos.delete(id); movingIds.delete(id); }
  }
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

function drawMap(fit, targetCtx = ctx) {
  const { tile, offX, offY } = fit;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = tiles[y * width + x];
      const sx = offX + x * tile;
      const sy = offY + y * tile;
      if (v === TILE.WALL) {
        targetCtx.strokeStyle = '#14612f';
        targetCtx.lineWidth = 1;
        targetCtx.strokeRect(sx + 0.5, sy + 0.5, tile - 1, tile - 1);
      } else {
        targetCtx.strokeStyle = 'rgba(20, 97, 47, 0.3)';
        targetCtx.lineWidth = 1;
        targetCtx.strokeRect(sx + 0.5, sy + 0.5, tile - 1, tile - 1);
        if (v === TILE.STAIRS_DOWN || v === TILE.STAIRS_UP) {
          targetCtx.strokeStyle = '#ffcf4d';
          const mx = sx + tile / 2, my = sy + tile / 2, r = tile * 0.32;
          targetCtx.beginPath();
          targetCtx.moveTo(mx, my - r); targetCtx.lineTo(mx + r, my); targetCtx.lineTo(mx, my + r); targetCtx.lineTo(mx - r, my);
          targetCtx.closePath();
          targetCtx.stroke();
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
    const w = tile * 0.62 * pulse, h = tile * 0.5 * pulse;
    ctx.strokeStyle = '#ffcf4d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - w / 2, sy - h / 2, w, h);
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

function drawProjectiles(fit) {
  const { tile, offX, offY } = fit;
  for (const p of projectiles) {
    const sx = offX + p.x * tile, sy = offY + p.y * tile;
    ctx.fillStyle = p.style === 'ember' ? '#ff7a3d' : p.style === 'frost' ? '#9de8ff' : p.style === 'knife' ? '#e4ece8' : '#d6b4ff';
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(2, tile * 0.18 * p.energy), 0, Math.PI * 2);
    ctx.fill();
  }
}

function staticMapLayer(fit) {
  const key = `${canvas.width}:${canvas.height}:${width}:${height}:${fit.tile}:${fit.offX}:${fit.offY}`;
  if (staticMapCanvas && staticMapKey === key) return staticMapCanvas;
  staticMapCanvas = document.createElement('canvas');
  staticMapCanvas.width = canvas.width;
  staticMapCanvas.height = canvas.height;
  const staticCtx = staticMapCanvas.getContext('2d');
  drawMap(fit, staticCtx);
  staticMapKey = key;
  return staticMapCanvas;
}

function drawBattlePortal(fit) {
  if (!battlePortal) return;
  const { tile, offX, offY } = fit;
  const sx = offX + battlePortal.x * tile;
  const sy = offY + battlePortal.y * tile;
  const t = performance.now() / 1000;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#ff2038';
  ctx.shadowBlur = Math.max(5, tile * 1.5);
  for (let i = 0; i < 4; i++) {
    const phase = t * (1.3 + i * 0.2) + i;
    const r = Math.max(4, tile * (0.5 + i * 0.18));
    ctx.strokeStyle = battlePortal.active ? `rgba(255,32,56,${0.45 + i * 0.12})` : 'rgba(255,32,56,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx + Math.sin(phase) * tile * 0.16, sy + Math.cos(phase) * tile * 0.16, r, r * 0.58, phase * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLinkPortals(fit) {
  const { tile, offX, offY } = fit;
  const colors = { green: '#28ff7d', blue: '#329bff', yellow: '#ffdc2d' };
  const fills = { green: 'rgba(10,105,45,0.26)', blue: 'rgba(12,55,125,0.26)', yellow: 'rgba(120,92,5,0.26)' };
  const t = performance.now() / 1000;
  for (const portal of linkPortals) {
    const sx = offX + portal.x * tile;
    const sy = offY + portal.y * tile;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = colors[portal.color] || '#fff';
    ctx.shadowBlur = Math.max(7, tile * 1.8);
    for (let i = 0; i < 4; i++) {
      const phase = t * (1.3 + i * 0.2) + i;
      const r = Math.max(5, tile * (0.55 + i * 0.2));
      ctx.strokeStyle = colors[portal.color] || '#fff';
      ctx.globalAlpha = 0.55 + i * 0.13;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.ellipse(sx + Math.sin(phase) * tile * 0.16, sy + Math.cos(phase) * tile * 0.16, r, r * 0.58, phase * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = fills[portal.color] || 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(3, tile * 0.42), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSoundPoints(fit) {
  const { tile, offX, offY } = fit;
  const pulse = 1 + Math.sin(performance.now() / 450) * 0.1;
  for (const point of soundPoints) {
    const sx = offX + point.x * tile;
    const sy = offY + point.y * tile;
    const r = Math.max(3, tile * 0.3 * pulse);
    ctx.strokeStyle = '#4dc3ff';
    ctx.fillStyle = 'rgba(77,195,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.7, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
  }
}

function drawAudioRange(fit, p, sx, sy) {
  const { tile } = fit;
  const pulse = 1 + Math.sin(performance.now() / 500) * 0.04;
  const r = FOOTSTEP_RANGE * tile * pulse;
  const alpha = 0.12 + Math.sin(performance.now() / 500) * 0.04;
  ctx.strokeStyle = `rgba(77,195,255,${alpha.toFixed(3)})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([tile * 0.3, tile * 0.3]);
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlayers(fit) {
  const { tile, offX, offY } = fit;
  for (const p of players) {
    const sx = offX + p.x * tile, sy = offY + p.y * tile;
    const color = p.alive ? colorFor(p.id) : 'rgba(255,77,94,0.5)';
    const r = Math.max(4, tile * 0.4);

    if (p.alive && movingIds.has(p.id)) drawAudioRange(fit, p, sx, sy);

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
    ctx.drawImage(staticMapLayer(fit), 0, 0);
    drawSoundPoints(fit);
    drawCaches(fit);
    drawDrops(fit);
    drawBattlePortal(fit);
    drawLinkPortals(fit);
    drawProjectiles(fit);
    drawPlayers(fit);
  }

  requestAnimationFrame(loop);
}
