import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const duration=Number(process.env.SOAK_SECONDS??30);
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'msedge',headless:true});
const errors=[], messages=[], samples=[];
const context=await browser.newContext({viewport:{width:1280,height:720}});
const poc=await context.newPage(),legacy=await context.newPage(),dm=await context.newPage();
for(const page of [poc,legacy,dm])page.on('pageerror',error=>errors.push(error.message));
poc.on('websocket',socket=>socket.on('framesent',f=>messages.push(JSON.parse(f.payload))));
const start=Date.now();
try {
  await poc.goto('http://127.0.0.1:5173');
  await poc.waitForFunction(()=>!document.getElementById('joinButton').disabled);
  const loadMs=Date.now()-start;
  await poc.locator('#joinButton').click();
  await poc.waitForFunction(()=>window.estellaDiagnostics().snapshots>10);
  await legacy.goto('http://127.0.0.1:8080');
  await legacy.locator('#nameInput').fill('Legacy Test');await legacy.locator('#joinBtn').click();
  await dm.goto('http://127.0.0.1:8080/dm.html');
  await dm.waitForFunction(()=>document.getElementById('dmRoster').textContent.includes('Legacy Test')&&document.getElementById('dmRoster').textContent.includes('Estella Hunter'));
  await poc.bringToFront();
  const initial=await poc.evaluate(()=>window.estellaDiagnostics());
  await poc.keyboard.down('KeyW');await poc.waitForTimeout(4000);await poc.keyboard.up('KeyW');await poc.waitForTimeout(300);
  const moved=await poc.evaluate(()=>window.estellaDiagnostics());
  assert.ok(Math.hypot(moved.position.x-moved.self.x,moved.position.y-moved.self.y)<.25,'settled camera matches authority');
  await poc.keyboard.press('Space');await poc.keyboard.press('KeyE');await poc.keyboard.press('KeyQ');
  const soakStart=Date.now();
  while(Date.now()-soakStart<duration*1000){
    await poc.waitForTimeout(Math.min(10000,duration*1000));
    const data=await poc.evaluate(()=>window.estellaDiagnostics());
    assert.ok(data.connected && data.snapshots>moved.snapshots);
    const sorted=data.frames.slice(120).sort((a,b)=>a-b);
    samples.push({elapsed:Date.now()-soakStart,snapshots:data.snapshots,wasmBytes:data.wasmBytes,jsHeap:await poc.evaluate(()=>performance.memory?.usedJSHeapSize??null),medianFPS:1000/sorted[Math.floor(sorted.length*.5)],onePercentLowFPS:1000/sorted[Math.floor(sorted.length*.99)],meshes:data.meshes});
    console.log(JSON.stringify(samples.at(-1)));
  }
  await poc.screenshot({path:'evidence/estella.png'});await legacy.screenshot({path:'evidence/legacy.png'});await dm.screenshot({path:'evidence/dm.png'});
  assert.ok(messages.some(m=>m.type==='action'&&m.action==='attack'));
  assert.ok(messages.some(m=>m.type==='action'&&m.action==='pickup'));
  assert.ok(messages.every(m=>['join','input','action'].includes(m.type)));
  assert.ok(messages.every(m=>!('health'in m)&&!('position'in m)));
  await poc.locator('#leave').click();
  assert.equal(await poc.evaluate(()=>window.estellaDiagnostics().tiles),0);
  await poc.locator('#joinButton').click();await poc.waitForFunction(()=>window.estellaDiagnostics().snapshots>5);
  assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),browser:browser.version(),loadMs,durationSeconds:duration,initialPosition:initial.position,movedPosition:moved.position,settledDrift:Math.hypot(moved.position.x-moved.self.x,moved.position.y-moved.self.y),errors,samples,results:{threeClients:true,actions:true,reconnect:true,noPrivilegedMessages:true}};
  await writeFile(process.env.REPORT_FILE??'evidence/browser-results.json',JSON.stringify(report,null,2)+'\n');
  console.log('PASS: browser acceptance');
} finally {await browser.close();}
