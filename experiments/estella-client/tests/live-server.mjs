import WebSocket from 'ws';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {Model} from '../src/model.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,timeout=10000){const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw new Error('Timed out waiting for server');await delay(20);}}
async function join(name){
  const model=new Model(),events=[],socket=new WebSocket('ws://127.0.0.1:8080');
  socket.on('open',()=>socket.send(JSON.stringify({type:'join',name})));
  socket.on('message',raw=>{const msg=JSON.parse(raw);model.accept(msg);events.push(...msg.events??[]);});
  await until(()=>model.current);
  return {model,events,socket,send:msg=>socket.send(JSON.stringify(msg))};
}
function route(model,target){
  const {width,height,tiles}=model;
  const index=p=>Math.floor(p.y)*width+Math.floor(p.x);
  const start=index(model.current.self),end=index(target),queue=[start],parents=new Map([[start,null]]);
  for(let n=0;n<queue.length;n++){
    const i=queue[n];if(i===end)break;
    const x=i%width,y=Math.floor(i/width);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,j=ny*width+nx;
      if(nx<0||ny<0||nx>=width||ny>=height||tiles[j]<=0||parents.has(j))continue;
      parents.set(j,i);queue.push(j);
    }
  }
  if(!parents.has(end))throw new Error('No known route to target');
  const result=[];for(let i=end;i!==null;i=parents.get(i))result.push({x:i%width+.5,y:Math.floor(i/width)+.5});
  return result.reverse();
}
async function walk(actor,points){
  const deadline=Date.now()+120000;
  for(const target of points){
    while(true){
      const p=actor.model.current.self,dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
      if(d<.13)break;
      if(Date.now()>deadline)throw new Error('Walking timed out');
      actor.send({type:'input',mx:dx/d,my:dy/d,aim:Math.atan2(dy,dx)});await delay(50);
    }
    actor.send({type:'input',mx:0,my:0,aim:0});
  }
  await delay(120);
}
const actors=[];
try{
  const a=await join('POC action test');actors.push(a);
  const cache=a.model.current.caches.map(c=>({c,path:route(a.model,c)})).sort((x,y)=>x.path.length-y.path.length)[0];
  assert.ok(cache,'server has a visible cache');
  await walk(a,cache.path);
  const beforePickup=a.model.current.self;
  a.send({type:'action',action:'pickup'});
  await until(()=>!a.model.current.caches.some(c=>c.id===cache.c.id));
  assert.ok(!a.model.current.caches.some(c=>c.id===cache.c.id));
  const afterPickup=a.model.current.self;
  const pickupFields=['maxHealth','maxMana','speed','manaRegenPerSec','inventory'];
  const changedFields=pickupFields.filter(k=>JSON.stringify(beforePickup[k])!==JSON.stringify(afterPickup[k]));
  assert.ok(changedFields.length,'pickup changed authoritative inventory or attributes');
  console.log('PASS: pickup confirmed by live server',changedFields);
  const b=await join('POC target test');actors.push(b);
  const center={x:Math.floor(a.model.current.self.x)+.5,y:Math.floor(a.model.current.self.y)+.5};
  await walk(b,route(b.model,center));
  await walk(a,[{x:center.x-.2,y:center.y}]);
  await walk(b,[{x:center.x+.2,y:center.y}]);
  const hp=b.model.current.self.health;
  const pa=a.model.current.self,pb=b.model.current.self;
  a.send({type:'input',mx:0,my:0,aim:Math.atan2(pb.y-pa.y,pb.x-pa.x)});await delay(100);
  a.send({type:'action',action:'attack'});
  await until(()=>b.model.current.self.health<hp);
  const report={date:new Date().toISOString(),pickup:{cacheId:cache.c.id,changedFields},targetHealthBefore:hp,targetHealthAfter:b.model.current.self.health,eventPackets:a.events.length,transport:'existing src/server/index.js on port 8080',clientPositionWrites:false};
  await writeFile('evidence/live-actions.json',JSON.stringify(report,null,2)+'\n');
  console.log('PASS: attack damage confirmed by live server');
}finally{for(const a of actors){a.send({type:'input',mx:0,my:0,aim:0});a.socket.close();}}
