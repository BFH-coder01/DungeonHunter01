import createModule from '../vendor/estella/esengine.js';
import {createWebApp, Assets, Transform, Camera, ProjectionType, MeshRenderer, Light, LightType, Renderer} from '../vendor/estella/sdk/index.lean.js';
import {toWorld,cameraRotation} from './model.js';
const color = (r,g,b) => ({r,g,b,a:1});
export async function createScene(canvas) {
  canvas.width=innerWidth; canvas.height=innerHeight;
  const module=await createModule({canvas,locateFile:file=>new URL(`../vendor/estella/${file}`,import.meta.url).href});
  const app=createWebApp(module,{getViewportSize:()=>({width:canvas.width,height:canvas.height}),depthLayers:1,msaaSamples:1});
  const world=app.world;
  Renderer.setClearColor(.025,.035,.05,1);
  const mesh=(await app.getResource(Assets).load('mesh','builtin:cube')).handle;
  const camera=world.spawn('First person camera');
  world.insert(camera,Transform,{position:{x:0,y:.62,z:0}});
  world.insert(camera,Camera,{projectionType:ProjectionType.Perspective,fov:75,nearPlane:.03,farPlane:70,isActive:true});
  const lamp=world.spawn('Hunter lantern');
  world.insert(lamp,Transform);
  world.insert(lamp,Light,{type:LightType.Point,color:color(1,.84,.62),intensity:1.8,radius:12,falloff:1,inverseSquare:false,enabled:true});
  const sun=world.spawn('Soft dungeon fill');
  world.insert(sun,Transform,{rotation:{x:-.4,y:.2,z:0,w:.8944}});
  world.insert(sun,Light,{type:LightType.Directional,color:color(.55,.65,.8),intensity:.5,enabled:true});
  const tiles=new Map(), entities=new Map();
  let knownTiles=0;
  function box(name,position,scale,tint) {
    const e=world.spawn(name);
    world.insert(e,Transform,{position,scale:{x:scale.x/100,y:scale.y/100,z:scale.z/100}});
    world.insert(e,MeshRenderer,{mesh,color:tint,opaque:true,cullBackfaces:true,lit:true,layer:0,enabled:true});
    return e;
  }
  function clear() {
    for (const e of [...tiles.values()].flat().concat([...entities.values()])) world.despawn(e);
    tiles.clear(); entities.clear(); knownTiles=0;
  }
  function updateMap(model) {
    // Merge known horizontal runs; rebuilding only changed rows keeps draw count low.
    for (const z of new Set(model.changed.map(i=>Math.floor(i/model.width)))) {
      for (const e of tiles.get(z)??[]) world.despawn(e);
      const row=[];
      for(let x=0;x<model.width;) {
        const t=model.tiles[z*model.width+x];
        if(t<0){x++;continue;}
        let end=x+1;while(end<model.width && model.tiles[z*model.width+end]===t)end++;
        const wall=t===0,shade=z%2===0;
        row.push(box(`Row ${z}:${x}`,{x:(x+end)/2,y:wall?.85:-.06,z:z+.5},{x:end-x,y:wall?1.7:.12,z:1},wall?color(.31,.36,.4):t>1?color(.35,.5,.48):shade?color(.2,.23,.26):color(.23,.26,.29)));
        x=end;
      }
      tiles.set(z,row);
    }
    knownTiles=model.tiles.reduce((n,t)=>n+(t>=0),0);
  }
  function updateEntities(model,now) {
    if (!model.current) return;
    const wanted=new Set();
    const t=Math.max(0,Math.min(1,(now-model.received)/50));
    for (const [kind,items] of [['hunter',model.current.others],['cache',model.current.caches],['drop',model.current.drops]]) {
      for (const item of items) {
        if (!model.known(item)) continue;
        const key=`${kind}:${item.id??item.uid}`; wanted.add(key);
        const hunter=kind==='hunter',height=hunter?(item.alive?.95:.18):.28;
        let x=item.x,z=item.y;
        if (hunter) {
          const old=model.previous?.others.find(p=>p.id===item.id);
          if (old && old.alive===item.alive && Math.hypot(old.x-x,old.y-z)<2) {x=old.x+(x-old.x)*t;z=old.y+(z-old.y)*t;}
        }
        if (!entities.has(key)) entities.set(key,box(kind,{x,y:height/2,z},{x:hunter?.36:.26,y:height,z:hunter?.36:.26},hunter?color(.62,.28,.26):kind==='cache'?color(.73,.52,.2):color(.3,.7,.7)));
        const e=entities.get(key);
        world.insert(e,Transform,{position:{x,y:height/2,z},scale:{x:(hunter?.36:.26)/100,y:height/100,z:(hunter?.36:.26)/100}});
      }
    }
    for (const [key,e] of entities) if (!wanted.has(key)) {world.despawn(e);entities.delete(key);}
  }
  function look(position,aim) {
    world.insert(camera,Transform,{position:toWorld(position.x,position.y,.62),rotation:cameraRotation(aim)});
    world.insert(lamp,Transform,{position:toWorld(position.x,position.y,.95)});
  }
  addEventListener('resize',()=>{canvas.width=innerWidth;canvas.height=innerHeight;Renderer.resize(canvas.width,canvas.height);});
  return {app,module,clear,updateMap,updateEntities,look,counts:()=>({tiles:knownTiles,meshes:[...tiles.values()].reduce((n,row)=>n+row.length,0),entities:entities.size})};
}
