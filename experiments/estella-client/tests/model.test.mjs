import test from 'node:test';
import assert from 'node:assert/strict';
import {Model,toWorld,toGame,cameraRotation,movement} from '../src/model.js';
import {Game} from '../../../src/server/game.js';
import {CONFIG} from '../../../src/shared/config.js';
const welcome={type:'welcome',you:'p1',width:4,height:3,level:0};
const state={type:'state',self:{x:1.5,y:1.5,aim:0,level:0,alive:true},others:[],caches:[],drops:[],reveal:[5,1]};
test('tile coordinates and camera cardinal directions agree with movement',()=>{
  for(const [x,y] of [[0,0],[1.5,4.5],[63.5,43.5]])assert.deepEqual(toGame(toWorld(x,y)),{x,y});
  for(const aim of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const q=cameraRotation(aim);
    // Rotation of the engine's local forward (0,0,-1) around Y.
    const forward={x:-2*q.y*q.w,z:-(1-2*q.y*q.y)};
    const input=movement(new Set(['KeyW']),aim);
    assert.ok(Math.abs(forward.x-input.mx)<1e-10);assert.ok(Math.abs(forward.z-input.my)<1e-10);
  }
});
test('unknown map starts empty; malformed packets are atomic; DM payloads rejected',()=>{
  const m=new Model();m.accept(welcome);assert.ok(m.tiles.every(t=>t===-1));
  assert.throws(()=>m.accept({...state,reveal:[5,1,99,0]}));assert.ok(m.tiles.every(t=>t===-1));
  assert.throws(()=>m.accept({...state,self:{...state.self,x:NaN}}));
  assert.throws(()=>m.accept({...welcome,dm:true,tiles:Array(12).fill(1)}));
  m.accept(state,100);assert.equal(m.tiles[5],1);assert.equal(m.known({x:1.5,y:1.5}),true);assert.equal(m.known({x:2.5,y:1.5}),false);
  m.accept({...state,reveal:[]},150);assert.deepEqual(m.changed,[]);
  m.reset();assert.equal(m.you,null);assert.equal(m.current,null);assert.equal(m.tiles.length,0);
});
test('interpolation converges without extrapolation and snaps on respawn',()=>{
  const m=new Model();m.accept(welcome);m.accept(state,0);
  m.accept({...state,self:{...state.self,x:1.7}},50);
  assert.equal(m.position(75).x,1.6);assert.equal(m.position(500).x,1.7);
  m.accept({...state,self:{...state.self,x:10}},100);assert.equal(m.position(100).x,10);
});
test('real Game fog deltas match DM tiles without disclosing unknown tiles or caches',()=>{
  const original=CONFIG.revealAll;
  try {
    CONFIG.revealAll=false;
    const game=new Game(12345),p=game.addPlayer('fixture','Fixture'),m=new Model();
    m.accept({type:'welcome',...game.welcomeFor(p)});
    assert.equal(m.tiles.length,2816);assert.ok(m.tiles.every(t=>t===-1));
    const packet={type:'state',...game.snapshotFor(p)};m.accept(packet);
    const full=game.dmWelcome().tiles;
    const revealed=[...m.tiles].filter(t=>t>=0).length;
    assert.ok(revealed>0 && revealed<m.tiles.length);
    for(let i=0;i<m.tiles.length;i++)if(m.tiles[i]>=0)assert.equal(m.tiles[i],full[i]);
    for(const c of packet.caches)assert.ok(m.known(c));
    assert.equal(game.snapshotFor(p).reveal.length,0);
    console.log(`Fog fixture: ${revealed}/${m.tiles.length} tiles disclosed`);
  } finally {CONFIG.revealAll=original;}
});
test('authoritative movement stops at walls; attack and pickup update only server state',()=>{
  const game=new Game(12345),p=game.addPlayer('a','A'),other=game.addPlayer('b','B'),level=game.levels[0];
  // Fixture places actors in a known corridor; application has no position setter.
  let index=level.tiles.findIndex((v,i)=>v===1&&level.tiles[i+1]===1&&i%level.width<level.width-2);
  p.x=index%level.width+.5;p.y=Math.floor(index/level.width)+.5;other.x=p.x+.5;other.y=p.y;p.aim=0;
  const before=other.health;
  game.handleAction(p,{action:'attack',health:9999,damage:9999},Date.now());
  assert.equal(other.health,before-p.inventory[0].damage);
  const cache=level.caches.find(c=>c.item.kind!=='boon');assert.ok(cache);
  p.x=cache.x;p.y=cache.y;const count=p.inventory.length;
  game.handleAction(p,{action:'pickup'},Date.now());
  assert.equal(cache.looted,true);assert.equal(p.inventory.length,count+1);
  p.move={x:1,y:0};for(let i=0;i<400;i++)game.tick(.05,Date.now()+i*50);
  assert.notEqual(level.tiles[Math.floor(p.y)*level.width+Math.floor(p.x)],0);
  assert.ok(p.x<level.width-1);
  const x=p.x;for(let i=0;i<20;i++)game.tick(.05,Date.now()+20000+i*50);
  assert.equal(p.x,x);
});
