import {Model,movement} from './model.js';
import {createScene} from './scene.js';
import {Combat} from './combat.js';
const $=id=>document.getElementById(id);
const model=new Model(), combat=new Combat(),keys=new Set(), frames=[];
let scene, socket, aim=0, last=performance.now(), lastInput=0, lastMetrics=0, connectedAt=0, snapshots=0, ready=false, inventoryKey='', connectionTimer;
const serverURL=new URL(location.href); serverURL.port='8080'; serverURL.protocol=location.protocol==='https:'?'wss:':'ws:'; serverURL.pathname='/'; serverURL.search='';
$('server').value=serverURL.href;
function links() {try { const u=new URL($('server').value);u.protocol=u.protocol==='wss:'?'https:':'http:';$('legacy').href=u.origin+'/';$('dm').href=u.origin+'/dm.html'; } catch {} }
links(); $('server').addEventListener('change',links);
function status(text) {$('status').textContent=text;}
function send(message) {if(socket?.readyState===WebSocket.OPEN) socket.send(JSON.stringify(message));}
function stopInput() {keys.clear();if(model.you)send(movement(keys,aim));}
function disconnect() {
  clearTimeout(connectionTimer);inventoryKey='';
  stopInput(); const old=socket; socket=null; old?.close(); model.reset();combat.reset();scene?.clear();
  $('combat').hidden=true;$('hurt').style.opacity=0;
  $('join').hidden=false;$('hud').hidden=true;$('crosshair').hidden=true;$('joinButton').disabled=!ready;
  if(document.pointerLockElement)document.exitPointerLock();
}
$('leave').onclick=()=>{disconnect();status('Disconnected. Join again for a fresh player.');};
$('connect').onsubmit=event=>{
  event.preventDefault();disconnect();links();
  try {const u=new URL($('server').value);if(!['ws:','wss:'].includes(u.protocol))throw new Error('Use ws:// or wss://');socket=new WebSocket(u);} catch(error){status(error.message);return;}
  const current=socket;$('joinButton').disabled=true;status('Connecting…');
  connectionTimer=setTimeout(()=>{if(socket===current&&!model.current){disconnect();status('No game state received. Check the server address and rejoin.');}},10000);
  current.onopen=()=>{if(socket===current)send({type:'join',name:$('name').value.trim()||'Estella Hunter'});};
  current.onmessage=event=>{
    if(socket!==current)return;
    try {
      const result=model.accept(JSON.parse(event.data));
      if(result==='welcome'){scene.clear();snapshots=0;connectedAt=performance.now();$('join').hidden=true;$('hud').hidden=false;$('crosshair').hidden=false;status('Connected · click scene for mouse look');}
      if(result==='state'){
        clearTimeout(connectionTimer);
        if(!snapshots)aim=model.current.self.aim;
        snapshots++;combat.accept(model.current.self,performance.now());scene.updateMap(model);updateHUD();$('combat').hidden=false;
      }
    }catch(error){disconnect();status(`Protocol error: ${error.message}. Rejoin to reset.`);}
  };
  current.onerror=()=>{if(socket===current)status('Connection failed. Start the game server on port 8080.');};
  current.onclose=()=>{if(socket===current){disconnect();status('Connection closed. Rejoin when the server is available.');}};
};
function action(action,extra={}) {
  if(!model.current?.self.alive)return;
  if(!combat.request(action,performance.now()))return;
  // Flush current aim first so a click immediately after turning uses that direction.
  if(action==='attack'||action==='cast')send(movement(keys,aim));
  send({type:'action',action,...extra});
}
$('attack').onclick=()=>action('attack');$('cast').onclick=()=>action('cast');
function updateHUD() {
  const s=model.current.self;
  $('vitals').textContent=s.alive?`Health ${s.health}/${s.maxHealth} · Mana ${s.mana}/${s.maxMana}`:`Fallen · respawn in ${(s.respawnIn/1000).toFixed(1)}s`;
  const nextKey=JSON.stringify([s.inventory,s.equippedWeaponUid,s.equippedSpellUid]);
  if(nextKey!==inventoryKey) {
    inventoryKey=nextKey;const inv=$('inventory');inv.replaceChildren();
    for(const item of s.inventory??[]) {
      const button=document.createElement('button');button.textContent=`${item.uid===s.equippedWeaponUid||item.uid===s.equippedSpellUid?'✓ ':''}${item.name}`;
      button.title=item.kind==='weapon'?`${item.damage} damage · ${item.range} tile reach · ${item.swingMs} ms swing`:`${item.manaCost} mana · ${item.cooldownMs} ms recovery`;
      button.onclick=()=>action('equip',{uid:item.uid});inv.append(button);
    }
  }
  if(model.current.events?.length)$('events').textContent=model.current.events.map(e=>e.text??e.message??`${e.kind}${e.name?`: ${e.name}`:''}${typeof e.hit==='boolean'?(e.hit?' — hit':' — no target'):''}`).join(' · ');
}
addEventListener('keydown',e=>{
  if(!model.you||e.target instanceof HTMLInputElement)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','Space','KeyE','KeyQ'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(!e.repeat){if(e.code==='Space')action('attack');if(e.code==='KeyE')action('pickup');if(e.code==='KeyQ')action('cast');}
  if(!e.repeat && /^Digit[1-8]$/.test(e.code)){const item=model.current?.self.inventory[Number(e.code.slice(-1))-1];if(item)action('equip',{uid:item.uid});}
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',stopInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
$('canvas').addEventListener('pointerdown',e=>{
  if(!model.you)return;
  if(e.button===2){action('cast');return;}
  if(e.button!==0)return;
  if(document.pointerLockElement===$('canvas') || !window.isSecureContext)action('attack');
  else $('canvas').requestPointerLock()?.catch(()=>status('Mouse lock unavailable. Use arrows and the Attack button.'));
});
$('canvas').addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerlockchange',stopInput);
addEventListener('mousemove',e=>{if(document.pointerLockElement=== $('canvas'))aim+=e.movementX*.0025;});
// Read-only diagnostics for repeatable acceptance capture; no state/position setter.
window.estellaDiagnostics=()=>({connected:!!model.you,snapshots,position:model.position(performance.now()),self:model.current?.self,combat:combat.frame(performance.now()),knownTiles:model.tiles.reduce((n,t)=>n+(t>=0),0),...scene?.counts(),wasmBytes:scene?.module.HEAPU8.byteLength,frames:[...frames]});
async function frame(now) {
  const frameMs=now-last,dt=Math.min(.1,frameMs/1000);last=now;
  if(model.you) {
    aim+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.8;
    if(now-lastInput>=50){send(movement(keys,aim));lastInput=now;}
    const feedback=combat.frame(now);
    const position=model.position(now);if(position){scene.look(position,aim);scene.updateEntities(model,now);scene.viewWeapon(position,aim,feedback,now);}
    $('weaponName').textContent=feedback.weapon?.name??'Unarmed';
    $('weaponStats').textContent=feedback.weapon?`${feedback.weapon.damage} damage · ${feedback.weapon.range} tile reach`:'';
    $('attack').disabled=!feedback.alive||!feedback.weapon||feedback.attackRemaining>0||feedback.swapRemaining>0;
    $('cast').disabled=!feedback.alive||!feedback.spell||feedback.castRemaining>0||(model.current?.self.mana??0)<(feedback.spell?.manaCost??0);
    $('cast').textContent=feedback.spell?`${feedback.spell.name} · Q`:'No spell';
    $('recovery').value=feedback.swapRemaining>0?0:1-feedback.attackRemaining/(feedback.weapon?.swingMs??1);
    $('combatState').textContent=feedback.notice||(!feedback.alive?'Waiting to respawn':feedback.swapRemaining>0?'Changing weapon…':feedback.attackRemaining>0?'Recovering…':'Ready');
    $('hurt').style.opacity=feedback.hurt.toFixed(2);
    if(now-model.received>3000 && model.current) {stopInput(); status('Waiting for server snapshots…');}
  }
  await scene.app.tick(dt);
  frames.push(frameMs);if(frames.length>1800)frames.shift();
  if(now-lastMetrics>1000){lastMetrics=now;const recent=frames.slice(-120);$('metrics').textContent=`${Math.round(1000/(recent.reduce((a,b)=>a+b,0)/recent.length))} FPS · ${(snapshots/Math.max(1,(now-connectedAt)/1000)).toFixed(1)} snapshots/s · ${scene.counts().tiles} known tiles`;}
  requestAnimationFrame(frame);
}
try {scene=await createScene($('canvas'));ready=true;$('joinButton').disabled=false;$('joinButton').textContent='Join dungeon';status('Estella ready · server-authoritative movement');last=performance.now();requestAnimationFrame(frame);}
catch(error){status(`Estella failed: ${error.message}`);console.error(error);}
