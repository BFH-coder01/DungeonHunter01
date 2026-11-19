import {network} from '../../../config/network.mjs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const fixture=spawn(process.execPath,['tests/combat-fixture-server.mjs'],{stdio:['ignore','pipe','pipe'],env:{...process.env,COMBAT_FIXTURE_PORT:'0'}});
fixture.stderr.on('data',data=>process.stderr.write(data));
const [ready]=await Promise.race([once(fixture.stdout,'data'),once(fixture,'exit').then(([code])=>{throw new Error(`Fixture exited: ${code}`);})]);
const port = Number(String(ready).trim().split(' ').at(-1));
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],sent=[],states=[];
try{
  const p=await browser.newPage({viewport:{width:1280,height:720}});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('websocket',s=>{s.on('framesent',f=>sent.push(JSON.parse(f.payload)));s.on('framereceived',f=>{const m=JSON.parse(f.payload);if(m.type==='state')states.push(m);});});
  await p.goto(network.tests.http(network.tests.clientPort));await p.waitForFunction(()=>!document.getElementById('joinButton').disabled);
  await p.locator('#server').fill(network.tests.ws(port));await p.locator('#joinButton').click();
  await p.waitForFunction(()=>window.estellaDiagnostics().snapshots>25);
  assert.equal(await p.evaluate(()=>window.estellaDiagnostics().avatars),1);
  assert.equal(await p.evaluate(()=>window.estellaDiagnostics().heldWeapon),'Rusted Dagger');
  assert.ok(states.some(s=>s.others.some(o=>o.weapon?.name==='War Axe'&&o.swingRemaining>0)));
  await p.waitForTimeout(1500);
  await p.screenshot({path:'evidence/combat-dagger.png'});
  const weaponNames=['Rusted Dagger','Short Sword','War Axe','Spear','Maul'];
  for(let i=0;i<weaponNames.length;i++){
    await p.keyboard.press(String(i+1));
    await p.waitForFunction(name=>window.estellaDiagnostics().heldWeapon===name,weaponNames[i]);
    await p.waitForFunction(()=>!document.getElementById('attack').disabled);
    await p.screenshot({path:`evidence/combat-weapon-${i+1}.png`});
    await p.locator('#attack').click();
    await p.waitForFunction(()=>window.estellaDiagnostics().self.swingRemaining>0);
    assert.equal(await p.locator('#attack').isDisabled(),true);
    await p.screenshot({path:`evidence/combat-swing-${i+1}.png`});
    await p.waitForFunction(()=>!document.getElementById('attack').disabled);
  }
  const mana=states.at(-1).self.mana;
  await p.locator('#cast').click();await p.waitForTimeout(100);
  assert.ok(states.at(-1).self.mana<mana);
  await p.screenshot({path:'evidence/combat-cast.png'});
  // At two tiles the spear reaches the visible target; all damage is Game.doAttack.
  await p.keyboard.press('4');await p.waitForFunction(()=>!document.getElementById('attack').disabled);
  for(let i=0;i<12 && states.at(-1).others.find(o=>o.id==='target')?.alive;i++){
    await p.keyboard.press('Space');await p.waitForTimeout(760);
  }
  assert.ok(states.at(-1).self.kills>0,'server confirms the kill');
  await p.screenshot({path:'evidence/combat-fallen.png'});
  assert.ok(sent.filter(m=>m.type==='action'&&m.action==='attack').length>=5);
  assert.ok(sent.every(m=>!('damage'in m)&&!('health'in m)&&!('position'in m)));
  assert.deepEqual(errors,[]);
  const frames=await p.evaluate(()=>window.estellaDiagnostics().frames.slice(-300).sort((a,b)=>a-b));
  const performance={medianFPS:1000/frames[Math.floor(frames.length*.5)],onePercentLowFPS:1000/frames[Math.floor(frames.length*.99)]};
  await p.locator('#leave').click();assert.equal(await p.evaluate(()=>window.estellaDiagnostics().avatars),0);
  assert.equal(await p.evaluate(()=>window.estellaDiagnostics().heldWeapon),null);
  await writeFile('evidence/combat-results.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),weapons:weaponNames,remoteAvatar:true,remoteWeaponAndSwing:true,serverCooldowns:true,serverManaConsumed:true,serverKillConfirmed:true,cleanup:true,performance,errors},null,2)+'\n');
  console.log('PASS: five weapons, avatars, swing/cast, cooldown, kill and cleanup');
}finally{fixture.kill();await browser.close();}
