import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat,attackPose} from '../src/combat.js';
import {weaponParts,transformPart,hunterParts,partRotation} from '../src/figures.js';
import {Game} from '../../../src/server/game.js';
import {CONFIG} from '../../../src/shared/config.js';
const weapon={uid:'w',kind:'weapon',name:'War Axe',swingMs:820},spell={uid:'s',kind:'spell',name:'Spark',manaCost:8,cooldownMs:450};
const self={alive:true,inventory:[weapon,spell],equippedWeaponUid:'w',equippedSpellUid:'s',health:100,maxHealth:100,mana:20,swapRemaining:0,swingRemaining:0,castRemaining:0,kills:0};
test('presentation cooldowns gate repeated input and reconcile with server state',()=>{
  const c=new Combat();c.accept(self,100);
  assert.equal(c.request('attack',100),true);assert.equal(c.request('attack',101),false);
  c.accept({...self,swingRemaining:700},150);assert.equal(c.frame(200).attackRemaining,650);
  c.accept({...self,swapRemaining:500},250);assert.equal(c.request('attack',260),false);
  assert.equal(c.request('cast',260),true);
  c.accept({...self,mana:0},300);assert.equal(c.request('cast',800),false);
  c.accept({...self,alive:false},400);assert.equal(c.request('attack',401),false);assert.equal(c.frame(401).alive,false);
  c.reset();assert.equal(c.frame(500).weapon,undefined);
});
test('weapon models, pose bounds and cardinal offsets use finite original geometry',()=>{
  const signatures=new Set();
  for(const name of ['Rusted Dagger','Short Sword','War Axe','Spear','Maul']){
    const parts=weaponParts(name);assert.ok(parts.length>=3);signatures.add(JSON.stringify(parts));
    for(const p of parts)assert.ok([...p.p,...p.s].every(Number.isFinite));
    for(const t of [0,.2,.5,1])assert.ok(Object.values(attackPose(t,name)).every(Number.isFinite));
  }
  assert.equal(signatures.size,5);assert.deepEqual(weaponParts(undefined),[]);
  assert.ok(hunterParts().length>10);
  assert.deepEqual(transformPart([0,0,1],{x:2,y:0,z:3},0),{x:3,y:0,z:3});
  for(const aim of [0,1,Math.PI])for(const roll of [-.8,.2,1.3]){
    const q=partRotation(aim,roll),p=transformPart([0,1,0],{x:0,y:0,z:0},aim,roll);
    const rotated={x:2*(q.x*q.y-q.z*q.w),y:1-2*(q.x*q.x+q.z*q.z),z:2*(q.y*q.z+q.x*q.w)};
    for(const axis of ['x','y','z'])assert.ok(Math.abs(rotated[axis]-p[axis])<1e-10,'mesh orientation matches assembled part positions');
  }
});
test('display metadata follows visibility and real server cooldowns without changing combat',()=>{
  const game=new Game(12345),a=game.addPlayer('a','A'),b=game.addPlayer('b','B');
  const before=game.snapshotFor(a);assert.equal(before.self.swingRemaining,0);
  game.handleAction(b,{action:'attack'},Date.now());
  const other=game.snapshotFor(a).others.find(p=>p.id==='b');
  assert.equal(other.weapon.name,'Rusted Dagger');assert.ok(other.swingRemaining>0&&other.swingRemaining<=320);
  assert.ok(!('inventory' in other)&&!('mana' in other));
  const until=b.swingUntil;game.handleAction(b,{action:'attack'},Date.now());assert.equal(b.swingUntil,until);
  const original=CONFIG.revealAll;try{CONFIG.revealAll=false;a.visible.clear();assert.equal(game.snapshotFor(a).others.length,0);}finally{CONFIG.revealAll=original;}
});
