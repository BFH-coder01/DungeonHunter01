import {network} from '../../../config/network.mjs';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:640,height:480}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(network.previewURL);
 await page.evaluate(async()=>{
  document.body.innerHTML='<canvas id="canvas" width="640" height="480"></canvas>';
  const {default:factory}=await import('/vendor/estella/esengine.js');
  const sdk=await import('/vendor/estella/sdk/index.lean.js');
  const canvas=document.querySelector('canvas');
  const module=await factory({canvas,locateFile:f=>'/vendor/estella/'+f});
  const app=sdk.createWebApp(module,{getViewportSize:()=>({width:640,height:480}),depthLayers:1,msaaSamples:1});
  const w=app.world;
  sdk.Renderer.setClearColor(0,0,0,1);
  const c=w.spawn();w.insert(c,sdk.Transform,{position:{x:0,y:0,z:0}});w.insert(c,sdk.Camera,{projectionType:sdk.ProjectionType.Perspective,fov:75,nearPlane:.03,farPlane:30,isActive:true});
  const emitter=w.spawn();w.insert(emitter,sdk.Transform,{position:{x:0,y:0,z:-4}});
  w.insert(emitter,sdk.ParticleEmitter,{rate:100,maxParticles:100,lifetimeMin:2,lifetimeMax:2,shape:sdk.EmitterShape.Sphere,shapeRadius:.2,speedMin:0,speedMax:0,startSizeMin:.3,startSizeMax:.3,endSizeMin:.3,endSizeMax:.3,startColor:{r:1,g:0,b:0,a:1},endColor:{r:1,g:0,b:0,a:1},layer:0});
  const mesh=(await app.getResource(sdk.Assets).load('mesh','builtin:cube')).handle;
  const wall=w.spawn();w.insert(wall,sdk.Transform,{position:{x:0,y:0,z:-3},scale:{x:.02,y:.02,z:.001}});w.insert(wall,sdk.MeshRenderer,{mesh,color:{r:0,g:.4,b:0,a:1},opaque:true,lit:false,enabled:false});
  window.probe={app,w,sdk,wall,emitter};
  for(let i=0;i<45;i++)await app.tick(1/60);
 });
 const visible=await page.evaluate(()=>probe.app.getResource(probe.sdk.Particle).getAliveCount(probe.emitter));
 assert.ok(visible>0,'Native particles must be simulated');
 const before=await page.screenshot({path:'evidence/particle-unoccluded.png'});
 await page.evaluate(async()=>{const {app,w,sdk,wall}=probe;w.set(wall,sdk.MeshRenderer,{...w.get(wall,sdk.MeshRenderer),enabled:true});for(let i=0;i<5;i++)await app.tick(1/60);});
 const after=await page.screenshot({path:'evidence/particle-occluded.png'});
 assert.ok(!before.equals(after));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({alive:visible,errors}));
 await writeFile('evidence/particle-probe.json',JSON.stringify({alive:visible,errors},null,2));
} finally {await browser.close();}

