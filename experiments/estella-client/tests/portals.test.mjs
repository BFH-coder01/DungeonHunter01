import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../../src/server/game.js';
import {generateDungeon} from '../../../src/server/dungeon.js';
import {makeRng} from '../../../src/shared/rng.js';
import {CONFIG} from '../../../src/shared/config.js';
import {checkPortals,placePortals,teleport} from '../../../src/server/portals.js';
import {reconcileTravel} from '../src/portals.js';
import {Model} from '../src/model.js';
import {Combat} from '../src/combat.js';
const enter=(g,p,q,now=Date.now())=>{p.portalContact=null;p.x=q.x;p.y=q.y;checkPortals(g,p,now);};
test('separate seeded placement preserves dungeon and gameplay RNG; seven clear landmarks on 100 seeds',()=>{
  for(let seed=0;seed<100;seed++){
    const rng=makeRng(seed),original=generateDungeon(rng),game=new Game(seed);
    assert.equal(game.rng(),rng());
    for(const [i,l] of game.levels.entries()){
      assert.deepEqual(l.tiles,original.levels[i].tiles);assert.deepEqual(l.spawnPoints,original.levels[i].spawnPoints);
      assert.deepEqual(l.caches.map(c=>[c.x,c.y,c.item.name]),original.levels[i].caches.map(c=>[c.x,c.y,c.item.name]));
      const ps=[l.battlePortal,...l.linkPortals];assert.equal(ps.length,7);assert.ok(l.battleSpawns.length>=8);
      for(const p of [...ps,...l.battleSpawns])assert.equal(game.blocked(l,p.x,p.y),false);
      for(let a=0;a<7;a++)for(let b=a+1;b<7;b++)assert.ok(Math.hypot(ps[a].x-ps[b].x,ps[a].y-ps[b].y)>1.3);
      for(const p of l.linkPortals)assert.equal(l.linkPortals.find(q=>q.id===p.toId).toId,p.id);
    }
  }
});
test('five-tile rooms and multiple levels retain all pairs and reachable landings',()=>{
  const old={...CONFIG.dungeon},fixed=CONFIG.levels.fixed;
  try{CONFIG.dungeon.roomMin=5;CONFIG.dungeon.roomMax=5;CONFIG.levels.fixed=3;
    for(let seed=0;seed<20;seed++){
      const g=new Game(seed);assert.equal(g.levels.length,3);
      for(const l of g.levels){assert.equal(l.linkPortals.length,6);assert.ok(l.battleSpawns.length);}
    }
  }finally{Object.assign(CONFIG.dungeon,old);CONFIG.levels.fixed=fixed;}
});
test('colored travel affects entrant only, preserves aim and cooldown, locks arrival until exit',()=>{
  const g=new Game(12345),a=g.addPlayer('a','A'),b=g.addPlayer('b','B'),l=g.levels[0],source=l.linkPortals[0],dest=l.linkPortals[1];
  const before=[b.x,b.y];a.aim=1.7;a.move={x:1,y:1};a.swingUntil=999;a.swapUntil=999;a.castReadyAt=Date.now()+1000;
  const cast=a.castReadyAt;enter(g,a,source);
  assert.deepEqual([a.x,a.y],[dest.x,dest.y]);assert.deepEqual([b.x,b.y],before);assert.equal(a.aim,1.7);
  assert.equal(a.teleportSequence,1);assert.equal(a.castReadyAt,cast);assert.equal(a.swingUntil,0);assert.equal(a.swapUntil,0);assert.deepEqual(a.move,{x:0,y:0});
  for(let i=0;i<30;i++)checkPortals(g,a,Date.now()+i*50);assert.equal(a.teleportSequence,1);
  a.x+=1;checkPortals(g,a,Date.now());enter(g,a,dest);assert.equal(a.teleportSequence,2);assert.equal(a.x,source.x);
  const s=g.snapshotFor(a);assert.equal(s.self.castVisualSuppressed,true);assert.ok(s.self.castRemaining>0);
});
test('red gathers living same-level players at spread spots, faces inward, cooldown is enter-only',()=>{
  const g=new Game(80),l=g.levels[0],fighters=Array.from({length:8},(_,i)=>g.addPlayer('p'+i,'P'));
  const dead=g.addPlayer('dead','Dead');dead.alive=false;const deadPos=[dead.x,dead.y];
  const other=g.addPlayer('other','Other');other.level=1;const otherPos=[other.x,other.y];
  const now=Date.now();enter(g,fighters[0],l.battlePortal,now);
  assert.equal(l.battlePortal.cooldownUntil,now+20000);
  for(const [i,p] of fighters.entries()){
    assert.deepEqual([p.x,p.y],[l.battleSpawns[i].x,l.battleSpawns[i].y]);assert.equal(p.teleportKind,'battle');assert.equal(p.redFacingRevision,1);
    const r=l.battleRoom;assert.equal(p.aim,Math.atan2(r.y+r.h/2-p.y,r.x+r.w/2-p.x));
  }
  assert.ok(Math.hypot(fighters[0].x-fighters[1].x,fighters[0].y-fighters[1].y)>4);
  assert.deepEqual([dead.x,dead.y],deadPos);assert.deepEqual([other.x,other.y],otherPos);
  enter(g,fighters[0],l.battlePortal,now+100);checkPortals(g,fighters[0],now+21000);assert.equal(fighters[0].teleportSequence,1);
  fighters[0].x+=1;checkPortals(g,fighters[0],now+21001);enter(g,fighters[0],l.battlePortal,now+21002);assert.equal(fighters[0].teleportSequence,2);
});
test('oversized gathering declines atomically without reusing landing spots',()=>{
  const g=new Game(12345),l=g.levels[0],a=g.addPlayer('a','A');g.addPlayer('b','B');l.battleSpawns=l.battleSpawns.slice(0,1);
  enter(g,a,l.battlePortal);assert.equal(a.teleportSequence,undefined);assert.equal(l.battlePortal.cooldownUntil,0);assert.equal(g.drainEvents(a.id).at(-1).kind,'portalFull');
});
test('all three colors round-trip through their own pair without affecting other hunters',()=>{
  const g=new Game(12345),p=g.addPlayer('a','A'),b=g.addPlayer('b','B'),l=g.levels[0];
  const untouched=[b.x,b.y];
  for(const color of ['green','blue','yellow']){
    const [a,z]=l.linkPortals.filter(q=>q.color===color);p.aim=-.77;
    enter(g,p,a);assert.deepEqual([p.x,p.y],[z.x,z.y]);assert.equal(p.aim,-.77);
    p.x+=1;checkPortals(g,p,Date.now());enter(g,p,z);assert.deepEqual([p.x,p.y],[a.x,a.y]);assert.equal(p.aim,-.77);
  }
  assert.equal(p.teleportSequence,6);assert.deepEqual([b.x,b.y],untouched);
});
test('fog reveals only destination sight, landmarks do not disclose unknown ordinary entities',()=>{
  const old=CONFIG.revealAll;CONFIG.revealAll=false;
  try{
    const g=new Game(12345),a=g.addPlayer('a','A'),b=g.addPlayer('b','B'),l=g.levels[0];
    a.explored.clear();a.newlyExplored=[];enter(g,a,l.linkPortals[0]);
    assert.deepEqual(a.explored,a.visible);
    const hidden=l.spawnPoints.find(p=>!g.canSee(a,p.x,p.y));b.x=hidden.x;b.y=hidden.y;
    const s=g.snapshotFor(a);assert.equal(s.linkPortals.length,6);assert.ok(s.battlePortal);assert.equal(s.others.some(p=>p.id==='b'),false);
    for(const c of s.caches)assert.ok(a.explored.has(Math.floor(c.y)*l.width+Math.floor(c.x)));
    assert.ok(a.explored.size<l.tiles.length/2);
  }finally{CONFIG.revealAll=old;}
});
test('persistent revisions snap short travel and preserve red facing across skipped link snapshot',()=>{
  const m=new Model();m.accept({type:'welcome',you:'a',width:4,height:4,level:0});
  const packet={type:'state',self:{x:1.5,y:1.5,aim:0,level:0,alive:true,teleportSequence:0},others:[],caches:[],drops:[],reveal:[]};m.accept(packet,0);
  const after={...packet,self:{...packet.self,x:1.7,teleportSequence:2,teleportKind:'green',redFacingRevision:1,redFacingAim:2.1}};m.accept(after,50);
  assert.equal(m.position(50).x,1.7);assert.deepEqual(reconcileTravel(packet.self,after.self,.3),{travelled:true,aim:2.1});
  assert.equal(reconcileTravel(after.self,after.self,.7).aim,.7);
  assert.throws(()=>m.accept({...packet,linkPortals:[{id:'bad',color:'invalid',x:1,y:1}]}));
  const c=new Combat();c.accept({inventory:[],alive:true,castRemaining:400,castVisualSuppressed:true},100);assert.equal(c.frame(100).castFlash,0);assert.equal(c.frame(100).castRemaining,400);
});
