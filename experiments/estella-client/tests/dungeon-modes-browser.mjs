import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir, writeFile} from 'node:fs/promises';
import {checkCache} from './cache-fixture.mjs';
import {chromium} from 'playwright';

// Own only the Estella host created here. Never stop or restart the game server.
const origin = 'http://127.0.0.1:5173';
await fetch('http://127.0.0.1:8080');
try {
  await fetch(origin);
  throw new Error('Port 5173 is occupied. Stop the Estella host before this test.');
} catch (error) {
  if (error.cause?.code !== 'ECONNREFUSED') throw error;
}
await mkdir('evidence', {recursive:true});
let host, browser;
const reports = [], errors = [];
async function startHost(mode) {
  host = spawn(process.execPath, ['scripts/serve.mjs', `--dungeon-mode=${mode}`], {stdio:['ignore','pipe','pipe']});
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Host startup timed out')), 10000);
    host.once('error', error => {clearTimeout(timer);reject(error);});
    host.once('exit', code => {clearTimeout(timer);reject(new Error(`Host exited: ${code}`));});
    host.stdout.on('data', data => {if (String(data).includes('http://localhost:5173')) {clearTimeout(timer);resolve();}});
  });
}
async function stopHost() {
  if (!host || host.exitCode !== null) return;
  const stopped = once(host, 'exit');
  host.kill();
  await stopped;
  host = undefined;
}
try {
  browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL ?? 'msedge', headless:true});
  for (const mode of ['3d', 'basic']) {
    await startHost(mode);
    const page = await browser.newPage({viewport:{width:1280,height:720}});
    const kitRequests = [], failures = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if(message.type()==='error')errors.push(message.text());});
    page.on('request', request => {if(request.url().includes('/dungeon-kit/'))kitRequests.push(request.url());});
    page.on('requestfailed', request => failures.push(request.url()));
    await page.goto(`${origin}/?mode=${mode==='3d'?'basic':'3d'}`);
    await page.waitForFunction(() => !document.getElementById('joinButton').disabled);
    assert.equal(await page.evaluate(() => window.estellaDiagnostics().mode), mode);
    assert.deepEqual(await (await fetch(`${origin}/startup.json?mode=other`)).json(), {mode});
    await checkCache(page, mode);
    await page.locator('#server').fill('ws://127.0.0.1:8080');
    await page.locator('#joinButton').click();
    await page.waitForFunction(() => window.estellaDiagnostics().connected && window.estellaDiagnostics().tiles > 0 && window.estellaDiagnostics().snapshots > 10);
    const initial = await page.evaluate(() => window.estellaDiagnostics());
    assert.ok(initial.tiles > 0 && initial.meshes > 0);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(600);
    await page.keyboard.up('ArrowRight');
    await page.screenshot({path:`evidence/dungeon-${mode}.png`});
    if(mode === '3d') {
      for(const asset of ['wall.esmesh','floor.esmesh','stairs-down.esmesh','stairs-up.esmesh','wall.png','floor.png','cache.esmesh','cache.png']) {
        assert.ok(kitRequests.some(url => url.endsWith(`/${asset}`)), `Loaded ${asset}`);
      }
    } else assert.deepEqual(kitRequests, []);
    await page.locator('#leave').click();
    assert.equal(await page.evaluate(() => window.estellaDiagnostics().tiles), 0);
    await page.locator('#joinButton').click();
    await page.waitForFunction(() => window.estellaDiagnostics().connected && window.estellaDiagnostics().snapshots > 5);
    assert.equal(await page.evaluate(() => window.estellaDiagnostics().mode), mode);
    // Stopping the renderer host must not stop the authoritative WebSocket game.
    await stopHost();
    const before = await page.evaluate(() => window.estellaDiagnostics().snapshots);
    await page.waitForFunction(n => window.estellaDiagnostics().snapshots > n + 5, before);
    assert.deepEqual(failures, []);
    reports.push({mode, cacheVisibilityPickupAndReset:true, tiles:initial.tiles, meshes:initial.meshes, kitRequests, reconnect:true, queryCannotSwitchMode:true, gameContinuesWhileHostStopped:true});
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile('evidence/dungeon-modes-results.json', JSON.stringify({date:new Date().toISOString(), browser:browser.version(), errors, reports},null,2)+'\n');
  console.log('PASS: textured 3D, Basic, reconnect, startup-only mode selection, and uninterrupted game server');
} finally {
  await browser?.close();
  await stopHost();
}
