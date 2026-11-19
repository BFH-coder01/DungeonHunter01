// Local acceptance/playtest fixture. Uses real Game rules; controls only via parent IPC.
import http from 'node:http';
import {WebSocketServer} from 'ws';
import {Game} from '../../../src/server/game.js';
import {CONFIG} from '../../../src/shared/config.js';
import {makeWeapon,makeSpell} from '../../../src/shared/items.js';
CONFIG.revealAll=true;
const game=new Game(12345),level=game.levels[0];
let center;
for(let y=3;y<level.height-3&&!center;y++)for(let x=3;x<level.width-6;x++){
 if(Array.from({length:5},(_,dx)=>[-1,0,1].every(dy=>level.tiles[(y+dy)*level.width+x+dx]>0)).every(Boolean)){center={x:x+.5,y:y+.5};break;}
}
if(!center)throw new Error('No training room');
const target=game.addPlayer('training','Training Hunter');target.x=center.x+3;target.y=center.y;target.aim=Math.PI;target.health=target.maxHealth=10000;target.move={x:0,y:0};
function setup(p,index=0){
 p.x=center.x;p.y=center.y+index*.65;p.aim=0;p.move={x:0,y:0};
 p.inventory=[makeWeapon('rusted_dagger'),...['spark','ember_burst','frost_lance','mend'].map(makeSpell)];
 p.equippedWeaponUid=p.inventory[0].uid;p.equippedSpellUid=p.inventory[1].uid;
 p.health=80;p.maxMana=p.mana=200;p.manaRegenPerSec=30;game.revealEntireLevel(p);game.updateVision(p);
}
const server=http.createServer((req,res)=>res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({preview:'Spells',players:game.players.size-1})));
const wss=new WebSocketServer({server});let seq=0,legacy=false;
wss.on('connection',ws=>{
 ws.on('error',()=>ws.terminate());
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw);}catch{return;}
  if(m.type==='join'&&!ws.player){const p=game.addPlayer('spelltest'+(++seq),String(m.name??'Spellcaster').slice(0,30));setup(p,(seq-1)%2);ws.player=p;ws.send(JSON.stringify({type:'welcome',...game.welcomeFor(p)}));}
  else if(ws.player&&m.type==='input'){const p=ws.player;p.move={x:Number.isFinite(m.mx)?Math.max(-1,Math.min(1,m.mx)):0,y:Number.isFinite(m.my)?Math.max(-1,Math.min(1,m.my)):0};if(Number.isFinite(m.aim))p.aim=m.aim;}
  else if(ws.player&&m.type==='action')game.handleAction(ws.player,m,Date.now());
 });
 ws.on('close',()=>{if(ws.player)game.removePlayer(ws.player.id);});
});
process.on('message',m=>{
 const ps=[...wss.clients].map(w=>w.player).filter(Boolean);
 if(m.kind==='stage')for(const p of ps){p.castReadyAt=0;p.mana=m.mana??200;p.health=m.health??80;if(m.aim!==undefined)p.aim=m.aim;}
 if(m.kind==='remote-cast'){const p=ps.at(-1);if(p){p.castReadyAt=0;p.equippedSpellUid=p.inventory.find(i=>i.key===m.key).uid;game.handleAction(p,{action:'cast'},Date.now());}}
 if(m.kind==='wall')for(const p of ps){
  p.x=center.x;p.y=center.y;p.aim=-Math.PI/2;p.move={x:0,y:0};p.castReadyAt=0;p.mana=200;
  p.redFacingRevision=(p.redFacingRevision??0)+1;p.redFacingAim=p.aim;
 }
 if(m.kind==='legacy')legacy=!!m.enabled;
 if(m.kind==='teleport')for(const p of ps){p.x=center.x;p.y=center.y;p.teleportSequence=(p.teleportSequence??0)+1;}
 if(m.kind==='death')for(const p of ps){p.alive=false;p.health=0;p.respawnAt=Date.now()+10000;}
 process.send?.({kind:'ack',request:m.kind});
});
let last=Date.now();const timer=setInterval(()=>{
 const now=Date.now();game.tick(Math.min(.25,(now-last)/1000),now);last=now;
 for(const ws of wss.clients)if(ws.player&&ws.readyState===1){
  const state=game.snapshotFor(ws.player);if(legacy){delete state.self.castRecord;for(const p of state.others)delete p.castRecord;}
  ws.send(JSON.stringify({type:'state',...state}));
 }
},50);
server.listen(Number(process.env.SPELL_TEST_PORT??8084),'127.0.0.1',()=>console.log('Spell fixture ready '+server.address().port));
process.on('SIGTERM',()=>{clearInterval(timer);wss.close();server.close();process.exit(0);});
