// Isolated test server: real Game authority, optional test fog, deterministic starting
// position near a portal. No browser-accessible fixture controls exist.
import http from 'node:http';
import {WebSocketServer} from 'ws';
import {Game} from '../../../src/server/game.js';
import {CONFIG} from '../../../src/shared/config.js';
CONFIG.revealAll=process.env.PORTAL_TEST_FOG !== '1';
const game=new Game(12345),level=game.levels[0];
const port=Number(process.env.PORTAL_TEST_PORT??8082);
const server=http.createServer((req,res)=>res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({preview:'Portals',seed:game.seed,players:game.players.size,arenaCapacity:level.battleSpawns.length})));
const wss=new WebSocketServer({server});let seq=0;
function stage(p,portal=level.linkPortals[0]){
  const offsets=[[1.3,0],[-1.3,0],[0,1.3],[0,-1.3]];
  const offset=offsets.find(([x,y])=>!game.blocked(level,portal.x+x,portal.y+y));
  if(!offset)throw new Error('Fixture portal needs a clear approach');
  p.x=portal.x+offset[0];p.y=portal.y+offset[1];p.aim=Math.atan2(-offset[1],-offset[0]);p.move={x:0,y:0};p.portalContact=null;
  p.explored.clear();p.newlyExplored=[];if (CONFIG.revealAll) game.revealEntireLevel(p);
  game.updateVision(p);
}
wss.on('connection',ws=>{
  let player;
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw);}catch{return;}
    if(m.type==='spectate'&&!player){ws.spectator=true;ws.send(JSON.stringify({type:'welcome',dm:true,...game.dmWelcome()}));return;}
    if(m.type==='join'&&!player&&!ws.spectator){player=game.addPlayer('preview'+(++seq),typeof m.name==='string'?m.name:'Hunter');stage(player);ws.player=player;ws.send(JSON.stringify({type:'welcome',...game.welcomeFor(player)}));}
    else if(player&&m.type==='input'){
      player.move={x:Number.isFinite(m.mx)?Math.max(-1,Math.min(1,m.mx)):0,y:Number.isFinite(m.my)?Math.max(-1,Math.min(1,m.my)):0};if(Number.isFinite(m.aim))player.aim=m.aim;
    }else if(player&&m.type==='action')game.handleAction(player,m,Date.now());
  });
  ws.on('close',()=>{if(player)game.removePlayer(player.id);});ws.on('error',()=>ws.terminate());
});
// The browser test's parent process alone can stage a fixture over Node IPC.
process.on('message',message=>{
  if(message.kind==='stage-color'){const portal=level.linkPortals.find(p=>p.color===message.color);for(const p of game.players.values())stage(p,portal);process.send?.({kind:'color-staged',aim:[...game.players.values()][0]?.aim});}
  if(message.kind==='stage-red'){for(const p of game.players.values())stage(p,level.battlePortal);process.send?.({kind:'red-staged',aim:[...game.players.values()][0]?.aim});}
  if(message.kind==='inspect')process.send?.({kind:'inspection',players:[...game.players.values()].map(p=>({id:p.id,x:p.x,y:p.y,aim:p.aim,teleportSequence:p.teleportSequence??0,redFacingRevision:p.redFacingRevision??0})),portals:game.portalSnapshot(level,Date.now())});
});
let last=Date.now();setInterval(()=>{
  const now=Date.now();game.tick(Math.min(.25,(now-last)/1000),now);last=now;
  for(const ws of wss.clients)if(ws.readyState===1){if(ws.player)ws.send(JSON.stringify({type:'state',...game.snapshotFor(ws.player)}));else if(ws.spectator)ws.send(JSON.stringify({type:'state',dm:true,...game.dmSnapshot()}));}
},50);
server.listen(port,'0.0.0.0',()=>console.log(`Portal fixture ready on ${port}; arena capacity ${level.battleSpawns.length}`));
