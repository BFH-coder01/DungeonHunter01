// Deterministic acceptance arena using the real, unmodified combat/movement methods.
// Fixture placement/inventory is test-only; there is no equivalent application endpoint.
import {WebSocketServer} from 'ws';
import {Game} from '../../../src/server/game.js';
import {makeWeapon,makeSpell} from '../../../src/shared/items.js';
const game=new Game(12345),level=game.levels[0];
const floor=(x,y)=>level.tiles[y*level.width+x]>0;
let center;
for(let y=3;y<level.height-3&&!center;y++)for(let x=3;x<level.width-5;x++){
  if(Array.from({length:4},(_,dx)=>[-1,0,1].every(dy=>floor(x+dx,y+dy))).every(Boolean)){center={x:x+.5,y:y+.5};break;}
}
if(!center)throw new Error('Fixture requires a room');
const target=game.addPlayer('target','Training Hunter');target.x=center.x+2;target.y=center.y;target.aim=Math.PI;
target.inventory=[makeWeapon('war_axe')];target.equippedWeaponUid=target.inventory[0].uid;
const wss=new WebSocketServer({port:8081,host:'127.0.0.1'});let seq=0;
wss.on('connection',ws=>{
  let player;
  ws.on('message',raw=>{
    const m=JSON.parse(raw);
    if(m.type==='join'&&!player){
      player=game.addPlayer(`test${++seq}`,m.name);player.x=center.x;player.y=center.y;player.aim=0;
      player.inventory=['rusted_dagger','short_sword','war_axe','spear','maul'].map(makeWeapon).concat(['spark','ember_burst','mend'].map(makeSpell));
      player.equippedWeaponUid=player.inventory[0].uid;player.equippedSpellUid=player.inventory[5].uid;
      ws.send(JSON.stringify({type:'welcome',...game.welcomeFor(player)}));ws.player=player;
    }else if(player&&m.type==='input'){player.move.x=Number.isFinite(m.mx)?Math.max(-1,Math.min(1,m.mx)):0;player.move.y=Number.isFinite(m.my)?Math.max(-1,Math.min(1,m.my)):0;if(Number.isFinite(m.aim))player.aim=m.aim;}
    else if(player&&m.type==='action')game.handleAction(player,m,Date.now());
  });
  ws.on('close',()=>{if(player)game.removePlayer(player.id);});
});
let last=Date.now();setInterval(()=>{
  const now=Date.now();game.tick(Math.min(.25,(now-last)/1000),now);last=now;
  // Repeated misses show the replicated swing without fabricating a hit.
  if(now>target.swingUntil+600)game.handleAction(target,{action:'attack'},now);
  for(const ws of wss.clients)if(ws.player&&ws.readyState===1)ws.send(JSON.stringify({type:'state',...game.snapshotFor(ws.player)}));
},50);
wss.on('listening',()=>console.log('Combat fixture ready on 8081'));
