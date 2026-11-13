import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const fixture=spawn(process.execPath,['tests/fog-server.mjs'],{env:{...process.env,PORT:'8081'},stdio:['ignore','pipe','pipe']});
await once(fixture.stdout,'data');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],sent=[],received=[];
try {
  const p=await browser.newPage({viewport:{width:1280,height:720}});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('websocket',s=>{
    s.on('framesent',f=>sent.push(JSON.parse(f.payload)));
    s.on('framereceived',f=>received.push(JSON.parse(f.payload)));
  });
  await p.goto('http://127.0.0.1:5173');await p.waitForFunction(()=>!document.getElementById('joinButton').disabled);
  await p.locator('#server').fill('ws://127.0.0.1:8081');await p.locator('#joinButton').click();
  await p.waitForFunction(()=>window.estellaDiagnostics().snapshots>20);
  const first=await p.evaluate(()=>window.estellaDiagnostics());
  assert.ok(first.knownTiles>0 && first.knownTiles<2816);assert.equal(first.knownTiles,first.tiles);
  const revealed=new Map();for(const m of received)for(let i=0;i<(m.reveal?.length??0);i+=2)revealed.set(m.reveal[i],m.reveal[i+1]);
  assert.equal(revealed.size,first.knownTiles);
  assert.ok(!('tiles' in received.find(m=>m.type==='welcome')));
  assert.ok(sent.every(m=>m.type!=='spectate'));
  await p.screenshot({path:'evidence/fog.png'});
  // Hold movement, then blur: the last intent must stop movement.
  await p.keyboard.down('KeyW');await p.waitForTimeout(150);await p.evaluate(()=>dispatchEvent(new Event('blur')));await p.waitForTimeout(150);
  assert.ok(sent.filter(m=>m.type==='input').at(-1).mx===0);
  fixture.kill();await p.waitForFunction(()=>!window.estellaDiagnostics().connected);
  assert.equal(await p.evaluate(()=>window.estellaDiagnostics().tiles),0);
  // An adversarial server packet must reset the UI, never become a DM session.
  const malformed=await browser.newPage();malformed.on('pageerror',e=>errors.push(e.message));
  await malformed.routeWebSocket('ws://127.0.0.1:8082/',ws=>ws.onMessage(raw=>{
    const m=JSON.parse(raw);if(m.type==='join')ws.send(JSON.stringify({type:'welcome',dm:true,width:64,height:44,tiles:[]}));
  }));
  await malformed.goto('http://127.0.0.1:5173');await malformed.waitForFunction(()=>!document.getElementById('joinButton').disabled);
  await malformed.locator('#server').fill('ws://127.0.0.1:8082/');await malformed.locator('#joinButton').click();
  await malformed.waitForFunction(()=>document.getElementById('status').textContent.includes('Protocol error'));
  assert.equal(await malformed.evaluate(()=>window.estellaDiagnostics().connected),false);
  assert.deepEqual(errors,[]);
  await writeFile('evidence/security-results.json',JSON.stringify({date:new Date().toISOString(),fogTiles:first.knownTiles,mapTiles:2816,renderedTiles:first.tiles,meshes:first.meshes,playerOnlyProtocol:true,blurStopsMovement:true,serverDisconnectClearsScene:true,dmPayloadRejected:true,errors},null,2)+'\n');
  console.log('PASS: fog, disconnect, blur and malformed server acceptance');
}finally{fixture.kill();await browser.close();}
