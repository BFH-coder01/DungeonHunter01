import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],warnings=[],sent=[],states=[];
try {
  const p=await browser.newPage({viewport:{width:1280,height:720}});
  // Test-only observers wrap and delegate to real Web Audio methods unchanged.
  await p.addInitScript(()=>{
    window.audioEvidence={decoded:0,started:0};
    const decode=BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData=function(...args){return decode.apply(this,args).then(buffer=>{window.audioEvidence.decoded++;return buffer;});};
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){window.audioEvidence.started++;return start.apply(this,args);};
  });
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
  p.on('websocket',s=>{s.on('framesent',f=>sent.push(JSON.parse(f.payload)));s.on('framereceived',f=>{const m=JSON.parse(f.payload);if(m.type==='state')states.push(m);});});
  await p.goto('http://127.0.0.1:8080');await p.locator('#nameInput').fill('Legacy regression');await p.locator('#joinBtn').click();
  await p.waitForFunction(()=>window.audioEvidence.decoded>=1);
  await p.locator('#hud').waitFor({state:'visible'});
  await p.keyboard.down('w');await p.waitForTimeout(2000);await p.keyboard.up('w');
  await p.keyboard.press('1');await p.keyboard.press('e');await p.keyboard.press('Space');
  await p.mouse.click(650,350);await p.waitForTimeout(100);await p.mouse.click(650,350);await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  assert.equal(await p.locator('#inventory .slot').count(),8);
  for(const action of ['equip','pickup','cast','attack'])assert.ok(sent.some(m=>m.type==='action'&&m.action===action),action);
  assert.ok(sent.some(m=>m.type==='input'&&(m.mx||m.my)));
  assert.ok(states.at(-1).self.mana<states[0].self.mana,'cast consumed server mana');
  const audio=await p.evaluate(()=>window.audioEvidence);assert.ok(audio.decoded>0&&audio.started>0);
  assert.deepEqual(errors,[]);assert.ok(!warnings.some(w=>w.includes('[audio] failed')));
  await p.screenshot({path:'evidence/legacy-regression.png'});
  await writeFile('evidence/legacy-results.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),audio,movementIntents:true,inventorySlots:8,attackCastPickupEquipIntents:true,serverManaConsumed:true,errors,warnings,note:'Headless confirms audio decode and source start, not subjective listening quality.'},null,2)+'\n');
  console.log('PASS: legacy movement, inventory, actions and Web Audio smoke');
}finally{await browser.close();}
