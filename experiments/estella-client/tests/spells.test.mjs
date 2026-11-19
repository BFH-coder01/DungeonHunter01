import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../../src/server/game.js';
import {makeSpell} from '../../../src/shared/items.js';
import {visibleCast} from '../../../src/server/spell-casts.js';
import {SpellEffects,spellParticle} from '../src/spells.js';
import {Combat} from '../src/combat.js';
function fixture(){
  const g=new Game(123),a=g.addPlayer('a','Caster'),b=g.addPlayer('b','Target');
  const level=g.levels[0];level.width=20;level.height=20;level.tiles=new Uint8Array(400).fill(1);
  Object.assign(a,{x:5.5,y:5.5,aim:0,mana:100,maxMana:100});Object.assign(b,{x:8.5,y:6.3,health:5});
  g.updateVision(a);g.updateVision(b);return {g,a,b,level};
}
test('accepted cast captures actual off-axis killing endpoint before damage; survives tick event drain',()=>{
 const {g,a,b}=fixture(),now=Date.now();g.doCast(a,now);
 assert.equal(b.alive,false);assert.deepEqual(a.latestCast.endpoint,{x:8.5,y:6.3});assert.equal(a.latestCast.result,'hit');
 assert.ok(Object.isFrozen(a.latestCast));assert.ok(Object.isFrozen(a.latestCast.endpoint));
 const record=a.latestCast;g.tick(.05,now+50);assert.equal(a.latestCast,record);assert.equal(g.snapshotFor(a).self.castRecord.sequence,1);
 assert.equal('targetId' in record,false);
});
test('cooldown, missing mana and spell switch do not manufacture accepted casts',()=>{
 const {g,a}=fixture(),now=Date.now();g.doCast(a,now);const record=a.latestCast;
 const mend=makeSpell('mend');a.inventory.push(mend);g.doEquip(a,mend.uid,now+10);g.doCast(a,now+10);assert.equal(a.latestCast,record);assert.equal(record.spellKey,'spark');
 a.mana=0;g.doCast(a,now+500);assert.equal(a.latestCast,record);
 a.mana=100;a.health=20;g.doCast(a,now+500);assert.equal(a.latestCast.sequence,2);assert.equal(a.latestCast.result,'heal');assert.equal(a.health,45);
});
test('miss trace ends before first wall and combat range/cone are unchanged',()=>{
 const {g,a,b,level}=fixture();b.x=17;level.tiles[5*20+7]=0;g.doCast(a,Date.now());
 assert.equal(a.latestCast.result,'wall');assert.ok(a.latestCast.endpoint.x<7&&a.latestCast.endpoint.x>6.9);assert.equal(b.health,5);
});
test('cast disclosure requires current visibility for entire path; death/travel/expiry suppress',()=>{
 const {g,a,b}=fixture(),now=Date.now();b.health=100;g.doCast(a,now);
 assert.ok(visibleCast(g,a,a,now));const saved=g.canSee;g.canSee=(_p,x)=>x<6||x>7;
 const clipped=visibleCast(g,a,a,now);assert.equal(clipped.result,'clipped');assert.ok(clipped.endpoint.x<6);assert.equal(clipped.endpoint.y,a.y);g.canSee=()=>false;assert.equal(visibleCast(g,a,a,now),null);g.canSee=saved;
 a.teleportSequence=1;assert.equal(visibleCast(g,a,a,now),null);a.teleportSequence=0;
 a.alive=false;assert.equal(visibleCast(g,a,a,now),null);a.alive=true;assert.equal(visibleCast(g,a,a,now+1101),null);
});
test('Frost beyond sight retains a visible aim ray without a hidden hit or bearing',()=>{
 const {g,a,b}=fixture(),now=Date.now(),frost=makeSpell('frost_lance');
 a.inventory.push(frost);a.equippedSpellUid=frost.uid;b.x=18;b.health=100;
 g.doCast(a,now);assert.equal(a.latestCast.result,'miss');assert.equal(a.latestCast.endpoint.x,a.x+9);
 g.canSee=(_viewer,x,y)=>Math.hypot(x-a.x,y-a.y)<8.5;
 const c=visibleCast(g,a,a,now);assert.equal(c.result,'clipped');assert.ok(c.endpoint.x>a.x+8&&c.endpoint.x<a.x+8.5);
 assert.equal(c.endpoint.y,a.y);assert.equal(spellParticle(c,500,20).size,0);
});
const cast=(sequence=1)=>({sequence,timestamp:1000,origin:{x:2,y:2},endpoint:{x:5,y:2},aim:0,spellKey:'spark',name:'Spark',result:'hit',teleportSequence:0});
function model(record=cast()){return {you:'a',received:20,current:{t:1050,self:{alive:true,teleportSequence:0,castRecord:null},others:[{id:'b',alive:true,teleportSequence:0,castRecord:record}]}};}
test('sequence highwater survives visibility churn; age follows server timestamp and monotonic elapsed',()=>{
 const fx=new SpellEffects(),m=model();assert.equal(fx.update(m,20)[0].age,50);
 assert.equal(fx.update(m,70)[0].age,100);assert.equal(fx.accepted,1);
 m.current={...m.current,others:[]};fx.update(m,80);assert.equal(fx.active.size,0);
 m.current=model().current;fx.update(m,100);assert.equal(fx.accepted,1);assert.equal(fx.active.size,0);
 fx.reset();m.current=model().current;assert.equal(fx.update(m,100).length,1);
 assert.equal(fx.update(m,1200).length,0);
});
test('stalled cosmetics drop; self death, travel and remote death clear live effects',()=>{
 for(const change of ['self-death','travel','remote-death']){
  const fx=new SpellEffects(),m=model();fx.update(m,20);const next=structuredClone(m.current);
  if(change==='self-death')next.self.alive=false;if(change==='travel')next.self.teleportSequence=1;if(change==='remote-death')next.others[0].alive=false;
  m.current=next;assert.equal(fx.update(m,30).length,0);
 }
 const fx=new SpellEffects(),m=model();assert.equal(fx.update(m,2000).length,0);assert.equal(fx.dropped,1);
});
test('effect cap is bounded and all four particle styles stay finite',()=>{
 const fx=new SpellEffects(),m=model();m.current.others=Array.from({length:20},(_,i)=>({...m.current.others[0],id:'p'+i}));
 assert.equal(fx.update(m,20).length,8);assert.equal(fx.dropped,12);
 for(const spellKey of ['spark','ember_burst','frost_lance','mend'])for(let age=0;age<1100;age+=33)for(let i=0;i<36;i++){
  const p=spellParticle({...cast(),spellKey},age,i);assert.ok([p.size,...Object.values(p.position)].every(Number.isFinite));assert.ok(p.size>=0);
 }
});
test('predicted hand flash is not replayed or recolored by cooldown spell swap',()=>{
 const combat=new Combat(),spark={uid:'s',name:'Spark',manaCost:8,cooldownMs:450},mend={uid:'m',name:'Mend',manaCost:20,cooldownMs:2000};
 const self={alive:true,mana:100,inventory:[spark,mend],equippedSpellUid:'s',castRemaining:0};
 combat.accept(self,0,1000);assert.equal(combat.request('cast',10),true);
 combat.accept({...self,castRemaining:400,castRecord:cast()},60,1050);assert.equal(combat.castStart,10);
 combat.accept({...self,equippedSpellUid:'m',castRemaining:300,castRecord:cast()},160,1150);
 assert.equal(combat.frame(160).castName,'Spark');assert.equal(combat.castStart,10);
});
