import {network} from '../../../config/network.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=network.tests.http(network.tests.portalClientPort),errors=[],reports=[];
let host,fixture,browser;
async function start(script,args,env,ready){
  const p=spawn(process.execPath,[script,...args],{env:{...process.env,...env},stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Startup timed out')),10000);p.stdout.on('data',d=>{if(String(d).includes(ready)){clearTimeout(timer);resolve();}});p.stderr.on('data',d=>console.error(String(d)));p.once('exit',code=>{clearTimeout(timer);reject(new Error('Child exited '+code));});});return p;
}
async function stop(p){if(p&&p.exitCode===null){const done=once(p,'exit');p.kill();await done;}}
const inspect=page=>page.evaluate(()=>window.estellaDiagnostics());
async function join(page,name){await page.goto(origin);await page.waitForFunction(()=>!document.getElementById('joinButton').disabled);assert.equal(await page.locator('#server').inputValue(),network.tests.ws(network.tests.portalGamePort)+'/');await page.locator('#name').fill(name);await page.locator('#joinButton').click();await page.waitForFunction(()=>window.estellaDiagnostics().snapshots>10&&window.estellaDiagnostics().portalCount===7);}
async function walkThrough(page){const seq=(await inspect(page)).self.teleportSequence;await page.keyboard.down('KeyW');await page.waitForFunction(n=>window.estellaDiagnostics().self.teleportSequence>n,seq,{timeout:4000});await page.keyboard.up('KeyW');}
async function faceServerAim(page,desired){const d=await inspect(page),delta=Math.atan2(Math.sin(desired-d.aim),Math.cos(desired-d.aim));if(Math.abs(delta)>.03){const key=delta>0?'ArrowRight':'ArrowLeft';await page.keyboard.down(key);await page.waitForTimeout(Math.abs(delta)/1.8*1000);await page.keyboard.up(key);}}
try{
  for(const url of [origin,network.tests.http(network.tests.portalGamePort)]){let free=false;try{await fetch(url);}catch(e){if(e.cause?.code==='ECONNREFUSED')free=true;else throw e;}assert.ok(free,`Refuse to replace occupied ${url}`);}
  fixture=await start('tests/portal-preview-server.mjs',[],{PORTAL_TEST_PORT:String(network.tests.portalGamePort),PORTAL_TEST_FOG:'1'},'ready on');
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'msedge',headless:true});
  for(const mode of ['3d','basic']){
    host=await start('scripts/serve.mjs',[`--dungeon-mode=${mode}`],{ESTELLA_DIST:'dist-portals',ESTELLA_PORT:String(network.tests.portalClientPort),ESTELLA_HOST:network.tests.bindHost,ESTELLA_PROFILE:'portals',ESTELLA_GAME_PORT:String(network.tests.portalGamePort)},'Estella ');
    const a=await browser.newPage({viewport:{width:1280,height:720}}),b=await browser.newPage({viewport:{width:1280,height:720}});
    for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
    await join(a,'First');await join(b,'Second');
    const initial=await inspect(a),other=await inspect(b);assert.equal(initial.mode,mode);assert.equal(initial.portalMeshes,224);assert.ok(initial.knownTiles<2816);
    await a.screenshot({path:`evidence/portal-${mode}-entrance.png`});
    await walkThrough(a);await a.waitForTimeout(500);
    const linked=await inspect(a),unmoved=await inspect(b);
    assert.equal(linked.self.teleportKind,'green');assert.equal(linked.self.teleportSequence,1);assert.equal(linked.aim,initial.aim);
    assert.equal(unmoved.self.x,other.self.x);assert.equal(unmoved.self.y,other.self.y);assert.equal(unmoved.self.teleportSequence,0);
    await a.waitForTimeout(700);assert.equal((await inspect(a)).self.teleportSequence,1);
    for(const color of ['blue','yellow']){
      const prepared=once(fixture,'message');fixture.send({kind:'stage-color',color});const [data]=await prepared;await a.waitForTimeout(200);await faceServerAim(a,data.aim);
      const beforeA=await inspect(a),beforeB=await inspect(b);await walkThrough(a);await a.waitForTimeout(100);const afterA=await inspect(a),afterB=await inspect(b);
      assert.equal(afterA.self.teleportKind,color);assert.ok(Math.abs(afterA.aim-beforeA.aim)<1e-9);assert.equal(afterB.self.teleportSequence,beforeB.self.teleportSequence);
    }
    const staged=once(fixture,'message');fixture.send({kind:'stage-red'});const [stageData]=await staged;await a.waitForTimeout(200);await faceServerAim(a,stageData.aim);
    // Red cooldown is shared across mode runs. Recreate only this owned fixture
    // below, so each mode starts from an identical seeded world.
    await walkThrough(a);await a.waitForTimeout(300);
    const redA=await inspect(a),redB=await inspect(b);
    assert.equal(redA.self.teleportKind,'battle');assert.equal(redB.self.teleportKind,'battle');
    assert.ok(Math.hypot(redA.self.x-redB.self.x,redA.self.y-redB.self.y)>4);
    assert.ok(Math.abs(redA.aim-redA.self.redFacingAim)<1e-9);assert.ok(Math.abs(redB.aim-redB.self.redFacingAim)<1e-9);
    assert.ok(redA.portals.find(p=>p.color==='red').cooldownRemaining>18000);
    await a.screenshot({path:`evidence/portal-${mode}-gathering.png`});
    await a.locator('#leave').click();assert.equal((await inspect(a)).portalCount,0);await a.locator('#joinButton').click();await a.waitForFunction(()=>window.estellaDiagnostics().snapshots>8&&window.estellaDiagnostics().portalCount===7);
    const reset=await inspect(a);assert.equal(reset.self.teleportSequence,0);assert.equal(reset.portalMeshes,224);
    reports.push({mode,landmarks:7,portalMeshes:224,knownTiles:initial.knownTiles,colors:['green','blue','yellow'],entrantOnly:true,arrivalLock:true,aimPreserved:true,twoPlayerGathering:true,inwardAim:true,cooldown:true,reconnect:true});
    await a.close();await b.close();await stop(host);host=null;await stop(fixture);fixture=null;
    if(mode==='3d')fixture=await start('tests/portal-preview-server.mjs',[],{PORTAL_TEST_PORT:String(network.tests.portalGamePort),PORTAL_TEST_FOG:'1'},'ready on');
  }
  assert.deepEqual(errors,[]);await writeFile('evidence/portal-browser.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),errors,reports},null,2));console.log('PASS portals: both modes, multiplayer, travel, gathering, fog and reconnect');
}finally{await browser?.close();await stop(host);await stop(fixture);}
