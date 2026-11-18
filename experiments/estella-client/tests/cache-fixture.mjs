import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocketServer} from 'ws';
import {Game} from '../../../src/server/game.js';
import {makeWeapon} from '../../../src/shared/items.js';

// Ordinary player protocol, isolated game state, repeatable camera and loot.
export async function checkCache(page, mode) {
  const server = new WebSocketServer({host:'127.0.0.1', port:0});
  await once(server, 'listening');
  let reveal, pickedSnapshot;
  server.on('connection', socket => {
    const game = new Game(12345);
    const level = game.levels[0];
    let player, cache, interval;
    function state() {
      const snapshot = game.snapshotFor(player);
      socket.send(JSON.stringify({type:'state', ...snapshot}));
      return snapshot;
    }
    socket.on('message', raw => {
      const message = JSON.parse(raw);
      if (message.type === 'join') {
        player = game.addPlayer('tester', 'Cache test');
        const i = level.tiles.findIndex((tile, i) => tile === 1 && i % level.width > 1 &&
          level.tiles[i-1] === 1 && level.tiles[i+1] === 1);
        assert.ok(i >= 0);
        player.x = i % level.width + .5;
        player.y = Math.floor(i / level.width) + .5;
        player.aim = 0;
        cache = {id:'fixture', x:player.x+1, y:player.y, item:makeWeapon('war_axe'), looted:false};
        level.caches = [cache];
        // Hold the chest tile outside the explored set until the test reveals it.
        player.explored.delete(i+1);
        const delta = player.newlyExplored;
        const offset = delta.findIndex((index, j) => j % 2 === 0 && index === i+1);
        assert.ok(offset >= 0);
        delta.splice(offset, 2);
        reveal = () => game.revealEntireLevel(player);
        socket.send(JSON.stringify({type:'welcome', ...game.welcomeFor(player)}));
        state();
        interval = setInterval(state, 50);
      } else if (player && message.type === 'action' && message.action === 'pickup') {
        game.handleAction(player, message, Date.now());
        pickedSnapshot = state();
      }
    });
    socket.on('close', () => clearInterval(interval));
  });
  try {
    await page.locator('#server').fill(`ws://127.0.0.1:${server.address().port}`);
    for (const pickup of [false, true]) {
      await page.locator('#joinButton').click();
      await page.waitForFunction(() => window.estellaDiagnostics().snapshots > 4 && window.estellaDiagnostics().heldWeapon);
      assert.deepEqual(await page.evaluate(() => window.estellaDiagnostics().cacheIds), []);
      reveal();
      await page.waitForFunction(() => window.estellaDiagnostics().cacheIds.includes('fixture'));
      const before = await page.evaluate(() => window.estellaDiagnostics().snapshots);
      await page.waitForFunction(n => window.estellaDiagnostics().snapshots > n+5, before);
      assert.deepEqual(await page.evaluate(() => window.estellaDiagnostics().cacheIds), ['fixture']);
      if (pickup) {
        await page.screenshot({path:`evidence/cache-${mode}.png`});
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => {
          const d = window.estellaDiagnostics();
          return d.cacheIds.length === 0 && d.self.inventory.some(item => item.name === 'War Axe');
        });
        assert.deepEqual(pickedSnapshot.caches, []);
        assert.ok(pickedSnapshot.self.inventory.some(item => item.name === 'War Axe'));
      }
      await page.locator('#leave').click();
      assert.deepEqual(await page.evaluate(() => window.estellaDiagnostics().cacheIds), []);
    }
  } finally {
    for (const socket of server.clients) socket.terminate();
    await new Promise(resolve => server.close(resolve));
  }
}
