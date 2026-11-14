import {spawn} from 'node:child_process';
import {once} from 'node:events';
const server=spawn(process.execPath,['../../src/server/index.js'],{env:{...process.env,PORT:'8081'},stdio:['ignore','pipe','inherit']});
try{
  await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw new Error(`Server exited: ${code}`);})]);
  const check=spawn(process.execPath,['tests/legacy-browser.mjs'],{env:{...process.env,GAME_URL:'http://127.0.0.1:8081',REPORT_FILE:'evidence/combat-legacy-results.json'},stdio:'inherit'});
  const [code]=await once(check,'exit');if(code!==0)throw new Error(`Legacy compatibility check failed: ${code}`);
}finally{server.kill();}
