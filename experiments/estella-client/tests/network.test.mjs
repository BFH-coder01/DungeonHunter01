import test from 'node:test';
import assert from 'node:assert/strict';
import {readNetwork,endpoint} from '../../../config/network.mjs';
import {gameConnection} from '../src/connection.js';
test('profiles and overrides supply host configuration without client port inference',()=>{
 const n=readNetwork({ESTELLA_PROFILE:'spells',ESTELLA_HOST:'::1',ESTELLA_PORT:'19100',ESTELLA_GAME_PORT:'19200',HOST:'192.0.2.10',PORT:'19300'});
 assert.equal(n.client.port,19100);assert.equal(n.client.host,'::1');assert.equal(n.game.port,19300);assert.equal(n.game.host,'192.0.2.10');
 assert.deepEqual(gameConnection('http://dungeon.example:19100/?x=1#part',n.client.connection),{url:'ws://dungeon.example:19200/',showGameLinks:false});
 assert.equal(gameConnection('https://dungeon.example/',n.client.connection).url,'wss://dungeon.example:19200/');
 assert.equal(gameConnection('http://[::1]:19100/',n.client.connection).url,'ws://[::1]:19200/');
});
test('explicit WebSocket URL preserves proxy path and overrides page hostname',()=>{
 const n=readNetwork({ESTELLA_GAME_URL:'wss://game.example/session?room=test'});
 assert.equal(gameConnection('https://client.example/',n.client.connection).url,'wss://game.example/session?room=test');
 assert.equal(gameConnection('https://client.example/',n.client.connection).showGameLinks,true);
});
test('test addresses and ports are configurable together, including IPv6 URL formatting',()=>{
 const n=readNetwork({TEST_HOST:'::1',TEST_SPELL_GAME_PORT:'19400',TEST_SPELL_CLIENT_PORT:'19500',FIXTURE_HOST:'::'});
 assert.equal(n.tests.ws(n.tests.spellGamePort),'ws://[::1]:19400');assert.equal(n.tests.http(n.tests.spellClientPort),'http://[::1]:19500');
 assert.equal(n.fixtures.host,'::');assert.equal(endpoint('http','[::1]',19400),'http://[::1]:19400');
});
test('invalid configuration fails clearly rather than silently using a different port',()=>{
 for(const env of [{PORT:'abc'},{ESTELLA_PORT:'65536'},{PORT:''},{ESTELLA_PROFILE:'unknown'},{ESTELLA_GAME_URL:'https://game.example'},{ESTELLA_GAME_URL:'ws://user:password@game.example'}])assert.throws(()=>readNetwork(env));
 assert.throws(()=>gameConnection('http://client.example/',undefined),/Restart/);
});
