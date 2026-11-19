import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:5178',reports=[],errors=[];
let fixture,host,browser;
async function start(script,args,env){
 const child=spawn(process.execPath,[script,...args],{env:{...process.env,...env},stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Startup timed out')),15000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.stderr.on('data',d=>console.error(String(d)));child.once('exit',code=>{clearTimeout(timer);reject(new Error('Exited '+code));});});return child;
}
async function stop(p){if(p&&p.exitCode===null){const done=once(p,'exit');p.kill();await done;}}
async function stage(data){const done=once(fixture,'message');fixture.send(data);await done;}
const inspect=p=>p.evaluate(()=>window.estellaDiagnostics());
async function join(p,name){await p.goto(origin);await p.waitForFunction(()=>!document.getElementById('joinButton').disabled);await p.locator('#server').fill('ws://127.0.0.1:8085');await p.locator('#name').fill(name);await p.locator('#joinButton').click();await p.waitForFunction(()=>window.estellaDiagnostics().connected&&window.estellaDiagnostics().snapshots>5);}
try{
 for(const u of [origin,'http://127.0.0.1:8085']){let free=false;try{await fetch(u);}catch(e){if(e.cause?.code==='ECONNREFUSED')free=true;else throw e;}assert.ok(free,'Port occupied '+u);}
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const mode of ['3d','basic']){
  fixture=await start('tests/spells-fixture-server.mjs',[],{SPELL_TEST_PORT:'8085'});
  host=await start('scripts/serve.mjs',[`--dungeon-mode=${mode}`],{ESTELLA_PORT:'5178',ESTELLA_DIST:'dist-spells'});
  const a=await browser.newPage({viewport:{width:1280,height:720}}),b=await browser.newPage({viewport:{width:1280,height:720}});
  for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  await join(a,'Caster');await join(b,'Observer');
  assert.equal((await inspect(a)).knownTiles,2816);
  await a.screenshot({path:`evidence/spells-${mode}-room.png`});
  for(const name of ['Spark','Ember Burst','Frost Lance','Mend']){
   await stage({kind:'stage',health:70});await a.waitForTimeout(120);
   await a.locator('#inventory button').filter({hasText:name}).click();
   await a.waitForFunction(n=>window.estellaDiagnostics().combat.spell?.name===n,name);
   await a.waitForFunction(()=>!document.getElementById('cast').disabled);
   const before=await inspect(a),remoteBefore=await inspect(b);
   await a.locator('#cast').click();
   await a.waitForFunction(n=>window.estellaDiagnostics().spellAccepted>n,before.spellAccepted);
   await b.waitForFunction(n=>window.estellaDiagnostics().spellAccepted>n,remoteBefore.spellAccepted);
   const after=await inspect(a);
   assert.equal(after.self.castRecord.name,name);assert.ok(after.self.mana<before.self.mana);
   if(name==='Mend')assert.ok(after.self.health>before.self.health);else assert.equal(after.self.castRecord.result,'hit');
   await a.screenshot({path:`evidence/spells-${mode}-${name.toLowerCase().replaceAll(' ','-')}.png`});
   assert.ok(after.spellParticles<=after.spellParticleLimit);assert.ok(after.spellEffects<=after.spellEffectLimit);
   await a.waitForTimeout(200);
   const impact=await inspect(a);assert.ok(impact.spellNativeParticles>0,'Native particle simulation is alive');assert.ok(impact.spellNativeParticles<=impact.spellNativeParticleLimit);
   await a.screenshot({path:`evidence/spells-${mode}-${name.toLowerCase().replaceAll(' ','-')}-impact.png`});
   await a.waitForTimeout(220);assert.equal((await inspect(a)).spellAccepted,after.spellAccepted,'Repeated snapshots do not replay');
  }
  // Equip during cooldown, then no-mana request over the actual action connection.
  await a.locator('#inventory button').filter({hasText:'Spark'}).click();await a.waitForTimeout(150);
  for(let i=0;i<6;i++){
   await stage({kind:'stage'});await a.waitForTimeout(80);await a.locator('#cast').click();await a.waitForTimeout(120);
   const d=await inspect(a);assert.ok(d.spellEffects<=8&&d.spellNativeParticles<=384&&d.spellParticles<=288);
  }
  await stage({kind:'wall'});await a.waitForTimeout(150);await a.locator('#cast').click();
  await a.waitForFunction(()=>window.estellaDiagnostics().self.castRecord?.result==='wall');
  await a.waitForTimeout(250);await a.screenshot({path:`evidence/spells-${mode}-wall.png`});
  await a.waitForTimeout(1200);
  await stage({kind:'legacy',enabled:true});await stage({kind:'stage'});await a.waitForTimeout(150);
  const oldAccepted=(await inspect(a)).spellAccepted;await a.locator('#cast').click();
  assert.ok((await inspect(a)).combat.castFlash>0);await a.waitForTimeout(200);assert.equal((await inspect(a)).spellAccepted,oldAccepted);
  await stage({kind:'legacy',enabled:false});await a.waitForTimeout(1200);
  await stage({kind:'stage',mana:0});await a.waitForTimeout(100);
  const accepted=(await inspect(a)).spellAccepted;await a.keyboard.press('KeyQ');await a.waitForTimeout(100);assert.equal((await inspect(a)).spellAccepted,accepted);
  await stage({kind:'stage'});await a.waitForTimeout(100);
  await a.locator('#cast').click();await a.waitForTimeout(100);await stage({kind:'teleport'});await a.waitForTimeout(150);assert.equal((await inspect(a)).spellEffects,0);
  await a.waitForTimeout(1400);assert.equal((await inspect(a)).spellParticles,0);
  await stage({kind:'stage'});await a.waitForTimeout(100);await a.locator('#cast').click();await a.waitForTimeout(100);await stage({kind:'death'});await a.waitForTimeout(150);assert.equal((await inspect(a)).spellEffects,0);
  await a.locator('#leave').click();await a.waitForTimeout(100);assert.equal((await inspect(a)).spellParticles,0);
  await a.locator('#joinButton').click();await a.waitForFunction(()=>window.estellaDiagnostics().connected&&window.estellaDiagnostics().snapshots>5);assert.equal((await inspect(a)).spellEffects,0);
  const final=await inspect(a),timings=final.frames.slice(-240).sort((a,b)=>a-b);
  reports.push({mode,knownTiles:final.knownTiles,backend:final.spellBackend,remainingEffects:final.spellEffects,remainingParticles:final.spellParticles,
   wasmBytes:final.wasmBytes,medianFrameMs:timings[Math.floor(timings.length*.5)],p95FrameMs:timings[Math.floor(timings.length*.95)],
   checks:['four distinct accepted spells','remote observer receives each cast','mana and healing','native particles alive and bounded','duplicate snapshots','repeated casting','wall impact','older server fallback','no mana rejection','teleport cleanup','death cleanup','disconnect and rejoin']});
  await a.close();await b.close();await stop(host);host=null;await stop(fixture);fixture=null;
 }
 assert.deepEqual(errors,[]);await writeFile('evidence/spells-browser.json',JSON.stringify({reports,errors},null,2));console.log(JSON.stringify({modes:reports.map(r=>r.mode),errors}));
}finally{await browser?.close();await stop(host);await stop(fixture);}
