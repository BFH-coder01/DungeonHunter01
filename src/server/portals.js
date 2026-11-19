import {makeRng} from '../shared/rng.js';

export const PORTAL_RADIUS = .6;
export const BATTLE_PORTAL_RADIUS = .65;
export const BATTLE_COOLDOWN_MS = 20000;
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const insideRoom = (p,r) => p.x>r.x && p.x<r.x+r.w && p.y>r.y && p.y<r.y+r.h;

// A separate stream, run AFTER every original level, leaves geometry, caches,
// ambient sources and the gameplay RNG unchanged.
export function placePortals(levels, seed) {
  for (const level of levels) {
    const rng=makeRng((seed ^ 0x706f7274 ^ Math.imul(level.depth+1,0x9e3779b9))>>>0);
    const start=level.spawnPoints[0];
    const reachable=new Set(), queue=start?[Math.floor(start.y)*level.width+Math.floor(start.x)]:[];
    for(let n=0;n<queue.length;n++){
      const i=queue[n]; if(reachable.has(i)||!level.tiles[i])continue; reachable.add(i);
      const x=i%level.width,y=Math.floor(i/level.width);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(x+dx>=0&&x+dx<level.width&&y+dy>=0&&y+dy<level.height)queue.push(i+dx+dy*level.width);
    }
    const reserved=[...level.spawnPoints,...level.caches,level.stairsUp,level.stairsDown].filter(Boolean);
    const candidates=rng.shuffle([...reachable].map(i=>({x:i%level.width+.5,y:Math.floor(i/level.width)+.5})))
      .filter(p=>reserved.every(r=>distance(p,r)>1.2));
    const rooms=level.rooms.slice().sort((a,b)=>b.w*b.h-a.w*a.h);
    const interior=(p,r)=>insideRoom(p,r)&&p.x>=r.x+1&&p.x<=r.x+r.w-1&&p.y>=r.y+1&&p.y<=r.y+r.h-1;
    level.battleRoom=rooms.find(r=>candidates.filter(p=>interior(p,r)).length>=4)??rooms[0];
    if(!level.battleRoom)throw new Error('Portal generation needs a connected room');
    const r=level.battleRoom, center={x:r.x+r.w/2,y:r.y+r.h/2};
    const landings=candidates.filter(p=>insideRoom(p,r)&&p.x>=r.x+1&&p.x<=r.x+r.w-1&&p.y>=r.y+1&&p.y<=r.y+r.h-1)
      .sort((a,b)=>distance(b,center)-distance(a,center));
    level.battleSpawns=[];
    while(landings.length){
      if(level.battleSpawns.length)landings.sort((a,b)=>Math.min(...level.battleSpawns.map(p=>distance(b,p)))-Math.min(...level.battleSpawns.map(p=>distance(a,p))));
      level.battleSpawns.push(landings.shift());
    }
    // Normal maps place all entrances outside the arena. Small-room fallback
    // reserves only actual landing spots, still retaining disjoint trigger disks.
    let pool=candidates.filter(p=>!insideRoom(p,r));
    if(pool.length<7)pool=candidates.filter(p=>!level.battleSpawns.includes(p));
    const chosen=[];
    for(let i=0;i<7;i++){
      let valid=pool.filter(p=>chosen.every(q=>distance(p,q)>BATTLE_PORTAL_RADIUS*2+.2));
      if(!valid.length)throw new Error('Dungeon cannot fit seven separated portal landmarks');
      if(i===0){const outer=valid.filter(p=>distance(p,{x:level.width/2,y:level.height/2})>=Math.min(level.width,level.height)*.25);if(outer.length)valid=outer;}
      const p=i%2===0&&chosen.length?valid.slice().sort((a,b)=>distance(b,chosen.at(-1))-distance(a,chosen.at(-1)))[0]:valid[0];
      chosen.push(p);
    }
    level.battlePortal={id:`bp${level.depth}`,color:'red',...chosen[0],cooldownUntil:0};
    level.linkPortals=[];
    for(const [i,color] of ['green','blue','yellow'].entries())for(const side of [0,1])level.linkPortals.push({
      id:`lp${level.depth}_${color}_${side}`,pairId:color,color,...chosen[1+i*2+side],toId:`lp${level.depth}_${color}_${1-side}`,
    });
  }
}
export const portalAt=(level,p)=>[level.battlePortal,...level.linkPortals??[]].find(q=>q&&distance(q,p)<=(q===level.battlePortal?BATTLE_PORTAL_RADIUS:PORTAL_RADIUS));
export function teleport(game,p,destination,kind,now,aim) {
  p.x=destination.x;p.y=destination.y;p.move={x:0,y:0};p.swingUntil=0;p.swapUntil=0;
  p.castVisualAfter=p.castReadyAt; // cancel flash, retain authoritative spell recovery
  p.teleportSequence=(p.teleportSequence??0)+1;p.teleportKind=kind;
  if(kind==='battle') {p.aim=aim;p.redFacingRevision=(p.redFacingRevision??0)+1;p.redFacingAim=aim;}
  p.portalContact=portalAt(game.levels[p.level],p)?.id??null;
  game.updateVision(p); // destination only; no ray along the teleport path
  if(kind!=='battle')game.emit(p,'linkportal',{color:kind,sequence:p.teleportSequence});
}
export function checkPortals(game,p,now) {
  if(!p.alive)return;
  const level=game.levels[p.level],inside=portalAt(level,p),previous=p.portalContact;
  p.portalContact=inside?.id??null;
  if(!inside||inside.id===previous)return;
  if(inside===level.battlePortal){
    if(now<inside.cooldownUntil)return;
    const fighters=[...game.players.values()].filter(q=>q.alive&&q.level===p.level);
    // Never stack excess players at a repeated fallback spawn. A too-large
    // gathering is declined atomically and does not consume its cooldown.
    if(fighters.length>level.battleSpawns.length){game.emit(p,'portalFull',{capacity:level.battleSpawns.length});return;}
    inside.cooldownUntil=now+BATTLE_COOLDOWN_MS;
    const r=level.battleRoom,center={x:r.x+r.w/2,y:r.y+r.h/2};
    fighters.forEach((q,i)=>{const spot=level.battleSpawns[i];teleport(game,q,spot,'battle',now,Math.atan2(center.y-spot.y,center.x-spot.x));game.emit(q,'battleportal',{by:p.name,fighters:fighters.length,sequence:q.teleportSequence});});
  } else {
    const destination=level.linkPortals.find(q=>q.id===inside.toId);
    if(destination)teleport(game,p,destination,inside.color,now);
  }
}
export const teleportState=p=>({teleportSequence:p.teleportSequence??0,teleportKind:p.teleportKind??null,redFacingRevision:p.redFacingRevision??0,redFacingAim:p.redFacingAim??0});
