// All development addresses and port defaults live here. Override through the
// process environment; browser clients receive only public connection settings.
const profiles={
  game:{clientPort:5173,gamePort:8080,showGameLinks:true},
  portals:{clientPort:5174,gamePort:8082,showGameLinks:false},
  spells:{clientPort:5176,gamePort:8084,showGameLinks:false},
};
export function port(value,fallback,name='port'){
 const n=value===undefined?fallback:Number(value);
 if(value===''||!Number.isInteger(n)||n<0||n>65535)throw new Error(`Invalid ${name}: expected a port from 0 to 65535`);
 return n;
}
export function endpoint(protocol,host,portNumber){
 const hostname=host.includes(':')&&!host.startsWith('[')?`[${host}]`:host;
 return `${protocol}://${hostname}:${portNumber}`;
}
export function readNetwork(env={}){
 const profile=env.ESTELLA_PROFILE??'game',defaults=profiles[profile];
 if(!defaults)throw new Error('ESTELLA_PROFILE must be game, portals or spells');
 const gameURL=env.ESTELLA_GAME_URL??'';
 if(gameURL){const u=new URL(gameURL);if(!['ws:','wss:'].includes(u.protocol)||u.username||u.password)throw new Error('ESTELLA_GAME_URL must be a ws:// or wss:// URL without credentials');}
 const testHost=env.TEST_HOST??'127.0.0.1';
 const gameHost=env.HOST??'0.0.0.0',clientHost=env.ESTELLA_HOST??'0.0.0.0';
 const wildcard=host=>['0.0.0.0','::'].includes(host);
 const displayHost=host=>env.LOCAL_HOSTNAME??(wildcard(host)?'localhost':host);
 const tests={host:testHost,bindHost:env.TEST_BIND_HOST??testHost,
  clientPort:port(env.TEST_CLIENT_PORT,profiles.game.clientPort,'TEST_CLIENT_PORT'),
  gamePort:port(env.TEST_GAME_PORT,profiles.game.gamePort,'TEST_GAME_PORT'),
  auxGamePort:port(env.TEST_AUX_GAME_PORT,8081,'TEST_AUX_GAME_PORT'),
  malformedPort:port(env.TEST_MALFORMED_PORT,8082,'TEST_MALFORMED_PORT'),
  portalClientPort:port(env.TEST_PORTAL_CLIENT_PORT,5175,'TEST_PORTAL_CLIENT_PORT'),
  portalGamePort:port(env.TEST_PORTAL_GAME_PORT,8083,'TEST_PORTAL_GAME_PORT'),
  spellClientPort:port(env.TEST_SPELL_CLIENT_PORT,5178,'TEST_SPELL_CLIENT_PORT'),
  spellGamePort:port(env.TEST_SPELL_GAME_PORT,8085,'TEST_SPELL_GAME_PORT'),
 };
 tests.http=p=>endpoint('http',tests.host,p);tests.ws=p=>endpoint('ws',tests.host,p);
 return {
  urlParserBase:'http://request.invalid',
  game:{host:gameHost,displayHost:displayHost(gameHost),advertiseLAN:wildcard(gameHost),port:port(env.PORT,profiles.game.gamePort,'PORT')},
  client:{profile,host:clientHost,displayHost:displayHost(clientHost),port:port(env.ESTELLA_PORT,defaults.clientPort,'ESTELLA_PORT'),
   connection:{gameURL,gamePort:port(env.ESTELLA_GAME_PORT,defaults.gamePort,'ESTELLA_GAME_PORT'),showGameLinks:defaults.showGameLinks}},
  fixtures:{host:env.FIXTURE_HOST??tests.bindHost,
   combatPort:port(env.COMBAT_FIXTURE_PORT,8081,'COMBAT_FIXTURE_PORT'),
   portalPort:port(env.PORTAL_TEST_PORT,profiles.portals.gamePort,'PORTAL_TEST_PORT'),
   spellPort:port(env.SPELL_TEST_PORT,profiles.spells.gamePort,'SPELL_TEST_PORT')},
  tests,previewURL:env.PROBE_URL??`${endpoint('http',testHost,profiles.spells.clientPort)}/startup.json`,
 };
}
export const network=readNetwork(process.env);
