import createModule from '../vendor/estella/esengine.js';
import {createWebApp, Assets, Transform, Camera, ProjectionType, MeshRenderer, Light, LightType, Renderer, ParticleEmitter, Particle, EmitterShape} from '../vendor/estella/sdk/index.lean.js';
import {toWorld,cameraRotation} from './model.js';
import {hunterParts,weaponParts,spellColor,transformPart,partRotation} from './figures.js';
import {attackPose,clamp} from './combat.js';
import {SpellEffects,spellParticle,PARTICLES_PER_SPELL} from './spells.js';
import {landmarks,portalColors} from './portals.js';
const color = (r,g,b) => ({r,g,b,a:1});
export async function createScene(canvas, mode) {
  canvas.width=innerWidth; canvas.height=innerHeight;
  const module=await createModule({canvas,locateFile:file=>new URL(`../vendor/estella/${file}`,import.meta.url).href});
  const app=createWebApp(module,{getViewportSize:()=>({width:canvas.width,height:canvas.height}),depthLayers:1,msaaSamples:1});
  const world=app.world;
  const particleTexture=(await app.getResource(Assets).loadTexture('/spell-particle.png')).handle;
  Renderer.setClearColor(.025,.035,.05,1);
  const mesh=(await app.getResource(Assets).load('mesh','builtin:cube')).handle;
  const shapes={cube:mesh};
  for(const name of ['sphere','cone','capsule','cylinder'])shapes[name]=(await app.getResource(Assets).load('mesh',`builtin:${name}`)).handle;
  const importedWeapons = new Map();
  const gloves = {};
  let kit, cacheAsset;
  if (mode === '3d') {
    const assets = app.getResource(Assets);
    const loadAsset = async (name, textureName) => {
      try {
        const geometry = await assets.load('mesh', `/dungeon-kit/${name}.esmesh`);
        const texture = await assets.loadTexture(`/dungeon-kit/${textureName}.png`);
        if (!geometry.handle || !texture.handle) throw new Error('Missing GPU asset handle');
        return {mesh: geometry.handle, texture: texture.handle};
      } catch (error) {
        throw new Error(`3D dungeon kit (${name}, ${textureName}.png): ${error.message}. Run npm run build, then reload.`, {cause: error});
      }
    };
    const response = await fetch('/dungeon-kit/weapons.json');
    if (!response.ok) throw new Error('Missing weapon manifest');
    for (const [weapon, ids] of Object.entries(await response.json())) {
      const definitions = await Promise.all(ids.map(async id => {
        const asset = await loadAsset(id, id);
        return {name:id, p:[0,0,0], s:[100,100,100], c:[1,1,1], asset};
      }));
      importedWeapons.set(weapon, definitions);
    }
    for (const grip of ['tight','wide']) {
      gloves[grip] = {name:'glove-'+grip, p:[0,0,0], s:[100,100,100], c:[1,1,1],
        asset:await loadAsset('glove-'+grip, 'glove')};
    }
    cacheAsset = await loadAsset('cache', 'cache');
    kit = [];
    for (const name of ['wall', 'floor', 'stairs-down', 'stairs-up']) {
      kit.push(await loadAsset(name, name === 'wall' ? 'wall' : 'floor'));
    }
  }
  const camera=world.spawn('First person camera');
  world.insert(camera,Transform,{position:{x:0,y:.62,z:0}});
  world.insert(camera,Camera,{projectionType:ProjectionType.Perspective,fov:75,nearPlane:.03,farPlane:70,isActive:true});
  const lamp=world.spawn('Hunter lantern');
  world.insert(lamp,Transform);
  world.insert(lamp,Light,{type:LightType.Point,color:color(1,.84,.62),intensity:1.8,radius:12,falloff:1,inverseSquare:false,enabled:true});
  const sun=world.spawn('Soft dungeon fill');
  world.insert(sun,Transform,{rotation:{x:-.4,y:.2,z:0,w:.8944}});
  world.insert(sun,Light,{type:LightType.Directional,color:color(.55,.65,.8),intensity:.5,enabled:true});
  const tiles=new Map(), entities=new Map(), portals=new Map();
  let held=[],heldName=null,castOrb=null,castHand=[];
  const spellEffects=new SpellEffects(),spellMeshes=new Map(),spellEmitters=new Map();
  let knownTiles=0;
  function box(name,position,scale,tint,shape='cube',layer=0) {
    const e=world.spawn(name);
    world.insert(e,Transform,{position,scale:{x:scale.x/100,y:scale.y/100,z:scale.z/100}});
    world.insert(e,MeshRenderer,{mesh:shapes[shape],color:tint,opaque:true,cullBackfaces:true,lit:layer===0,layer,enabled:true});
    return e;
  }
  function clear() {
    for(const e of spellEmitters.values())world.despawn(e.entity);spellEmitters.clear();
    for(const group of spellMeshes.values())for(const e of group)world.despawn(e);spellMeshes.clear();spellEffects.reset();
    for(const p of castHand)world.despawn(p.entity);castHand=[];
    for (const e of [...tiles.values()].flat()) world.despawn(e);
    for(const entry of entities.values())destroy(entry);
    for(const part of held)world.despawn(part.entity);
    held=[];heldName=null;if(castOrb!==null)world.despawn(castOrb);castOrb=null;
    for(const ring of portals.values())for(const e of ring)world.despawn(e);portals.clear();
    tiles.clear(); entities.clear(); knownTiles=0;
  }
  function weaponModel(name) {
    return importedWeapons.get(name) ?? weaponParts(name);
  }
  function parts(definitions, layer=0) {
    return definitions.map(part => {
      if (!part.asset) return {...part, entity:box(part.name,{x:0,y:-100,z:0},{x:1,y:1,z:1},color(...part.c),part.mesh,layer)};
      const entity = world.spawn(part.name);
      world.insert(entity, Transform, {position:{x:0,y:-100,z:0}});
      world.insert(entity, MeshRenderer, {...part.asset, color:color(1,1,1), opaque:true, cullBackfaces:true, lit:layer===0, layer, enabled:true});
      return {...part, entity};
    });
  }
  function pose(parts,anchor,aim,roll=0,scale=1,offset=()=>[0,0,0],flash=0){
    for(const part of parts){
      const d=offset(part),p=part.p.map((v,i)=>v+d[i]);
      world.insert(part.entity,Transform,{position:transformPart(p,anchor,aim,roll,scale),rotation:partRotation(aim,roll),scale:{x:part.s[0]*scale/100,y:part.s[1]*scale/100,z:part.s[2]*scale/100}});
      world.set(part.entity,MeshRenderer,{...world.get(part.entity,MeshRenderer),color:flash?color(.85,.2,.12):color(...part.c)});
    }
  }
  function destroy(entry){for(const p of [...entry.body??[],...entry.weapon??[]])world.despawn(p.entity);if(entry.entity!==undefined)world.despawn(entry.entity);if(entry.orb!==undefined)world.despawn(entry.orb);}
  function updateHunter(entry,item,x,z,model,now){
    if(entry.name!==item.weapon?.name){for(const p of entry.weapon??[])world.despawn(p.entity);entry.weapon=parts(weaponModel(item.weapon?.name));entry.name=item.weapon?.name;}
    const distance=entry.last?Math.hypot(x-entry.last.x,z-entry.last.z):0;
    if(distance<1)entry.stride=(entry.stride??0)+distance*16;
    entry.last={x,z};
    const gait=distance>.0001?Math.sin(entry.stride)*.075:0;
    if(entry.hp!==undefined&&item.hp<entry.hp)entry.hurt=now+160;entry.hp=item.hp;
    const remaining=Math.max(0,(item.swingRemaining??0)-(now-model.received));
    const swing=remaining>0?attackPose(1-remaining/(item.weapon?.swingMs??320),item.weapon?.name):{roll:-.2,forward:0,side:0,lift:0};
    const facing=Number.isFinite(item.aim)?item.aim:0;
    const castAge=item.castRecord?model.current.t-item.castRecord.timestamp+(now-model.received):
      !Object.hasOwn(item,'castRecord')&&item.cast?item.cast.cooldownMs-item.cast.remaining+(now-model.received):Infinity;
    const castPulse=item.alive?clamp(1-castAge/350):0;
    pose(entry.body,{x,y:item.alive?0:.25,z},facing,item.alive?0:Math.PI/2,1,part=>{
      if(!item.alive)return [0,-.5,0];
      if(part.group==='leftLeg')return [0,Math.abs(gait)*.25,gait];
      if(part.group==='rightLeg')return [0,Math.abs(gait)*.25,-gait];
      if(part.group==='rightArm')return [swing.side,swing.lift,swing.forward-gait*.4];
      if(part.group==='leftArm')return [0,castPulse*.08,gait*.4+castPulse*.13];
      return [0,Math.abs(gait)*.1,0];
    },now<(entry.hurt??0));
    const grip=transformPart(item.alive?[.23+swing.side,.43+swing.lift,.08+swing.forward]:[.35,.12,.1],{x,y:0,z},facing);
    pose(entry.weapon,grip,facing,item.alive?swing.roll:Math.PI/2);
    const flash=castPulse;
    world.insert(entry.orb,Transform,{position:transformPart([-.24,.48,.15],{x,y:0,z},facing),scale:{x:flash*.0015,y:flash*.0015,z:flash*.0015}});
    world.set(entry.orb,MeshRenderer,{...world.get(entry.orb,MeshRenderer),enabled:flash>0,color:color(...spellColor(item.castRecord?.name??item.cast?.name))});
  }
  function updateMap(model) {
    // Merge known horizontal runs; rebuilding only changed rows keeps draw count low.
    for (const z of new Set(model.changed.map(i=>Math.floor(i/model.width)))) {
      for (const e of tiles.get(z)??[]) world.despawn(e);
      const row=[];
      for(let x=0;x<model.width;) {
        const t=model.tiles[z*model.width+x];
        if(t<0){x++;continue;}
        if (kit) {
          const entity = world.spawn(`Tile ${z}:${x}`);
          world.insert(entity, Transform, {position:{x:x+.5,y:0,z:z+.5}});
          world.insert(entity, MeshRenderer, {
            ...kit[t], color:color(1,1,1), opaque:true, cullBackfaces:true, lit:true, enabled:true,
          });
          row.push(entity);
          x++;
          continue;
        }
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
    const effects=spellEffects.update(model,now),wantedEffects=new Set(effects.map(e=>e.id));
    for(const [id,group] of spellMeshes)if(!wantedEffects.has(id)){for(const e of group)world.despawn(e);spellMeshes.delete(id);}
    for(const [id,e] of spellEmitters)if(!wantedEffects.has(id)||effects.find(f=>f.id===id)?.cast.sequence!==e.sequence){world.despawn(e.entity);spellEmitters.delete(id);}
    for(const effect of effects){
      const c=effect.cast,heal=c.spellKey==='mend',delay=0;
      if(!spellEmitters.has(effect.id)&&effect.age>=delay&&effect.age<delay+180){
        const entity=world.spawn('Native spell sparks'),rgb=spellParticle(c,0,0).rgb;
        world.insert(entity,Transform,{position:toWorld(c.endpoint.x+(heal?.6*Math.cos(c.aim):0),c.endpoint.y+(heal?.6*Math.sin(c.aim):0),heal?.22:.5)});
        const emissionEnd=c.result==='clipped'?(c.spellKey==='frost_lance'?240:c.spellKey==='ember_burst'?300:180):350;
        world.insert(entity,ParticleEmitter,{texture:particleTexture,gpuSimulation:false,rate:150,maxParticles:48,duration:Math.max(.01,(emissionEnd-effect.age)/1000),looping:false,
          lifetimeMin:.25,lifetimeMax:.65,shape:EmitterShape.Sphere,shapeRadius:heal?.12:.045,speedMin:heal?.03:.2,speedMax:heal?.10:.8,
          startSizeMin:.025,startSizeMax:c.spellKey==='ember_burst'?.09:.045,endSizeMin:0,endSizeMax:.004,
          startColor:color(...rgb),endColor:{...color(...rgb),a:0},gravity:{x:0,y:heal?.3:c.spellKey==='ember_burst'?-2:-.8,z:0},
          addedVelocityMin:{x:0,y:heal?.08:.2,z:0},addedVelocityMax:{x:0,y:heal?.15:.5,z:0},damping:1.8,
          noiseStrength:heal?.15:.25,noiseFrequency:2,noiseScrollSpeed:.7,collisionEnabled:true,collisionFloor:.035,collisionBounce:.15,collisionFriction:.6,layer:0});
        spellEmitters.set(effect.id,{entity,sequence:c.sequence});
      }
      const native=spellEmitters.get(effect.id);
      if(native&&!heal){
        const flight=c.spellKey==='ember_burst'?300:c.spellKey==='frost_lance'?240:180;
        const progress=Math.min(1,effect.age/flight),release=spellParticle(c,0,0).position;
        world.insert(native.entity,Transform,{position:{x:release.x+(c.endpoint.x-release.x)*progress,y:.5,z:release.z+(c.endpoint.y-release.z)*progress}});
      }
      if(!spellMeshes.has(effect.id))spellMeshes.set(effect.id,Array.from({length:PARTICLES_PER_SPELL},()=>box('Spell particle',{x:0,y:-100,z:0},{x:0,y:0,z:0},color(1,1,1))));
      const group=spellMeshes.get(effect.id);
      for(let i=0;i<group.length;i++){
        const p=spellParticle(effect.cast,effect.age,i),e=group[i];
        const tile=model.tiles[Math.floor(p.position.z)*model.width+Math.floor(p.position.x)];
        const size=tile>0&&Math.hypot(p.position.x-model.current.self.x,p.position.z-model.current.self.y)>.25?p.size:0;
        world.insert(e,Transform,{position:p.position,rotation:partRotation(effect.cast.aim,Math.PI/2),scale:{x:size/100,y:size*p.stretch/100,z:size/100}});
        world.set(e,MeshRenderer,{...world.get(e,MeshRenderer),mesh:shapes[p.shape],color:color(...p.rgb),enabled:size>0,lit:false,layer:0});
      }
    }
    const portalWanted=new Set();
    for(const p of landmarks(model.current)){
      portalWanted.add(p.id);
      if(!portals.has(p.id))portals.set(p.id,Array.from({length:32},(_,i)=>box(`Portal ${p.color??'red'} ${i}`,toWorld(p.x,p.y,.7),{x:.07,y:.07,z:.07},color(...portalColors[p.color??'red']),'sphere',1)));
      const ring=portals.get(p.id),rgb=portalColors[p.color??'red'];
      const active=p.active!==false,phase=now*.001*(active?1:.35);
      for(let i=0;i<ring.length;i++){
        const a=i/16*Math.PI*2+phase*(i<16?1:-1),radius=i<16?.48:.34;
        const px=p.x+(i<16?Math.cos(a)*radius:0),py=p.y+(i>=16?Math.cos(a)*radius:0),height=.65+Math.sin(a)*radius;
        world.insert(ring[i],Transform,{position:toWorld(px,py,height),scale:{x:.00065,y:.00065,z:.00065}});
        world.set(ring[i],MeshRenderer,{...world.get(ring[i],MeshRenderer),color:color(...rgb.map(v=>v*(active?1:.35)))});
      }
    }
    for(const [id,ring] of portals)if(!portalWanted.has(id)){for(const e of ring)world.despawn(e);portals.delete(id);}
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
          if (old && (old.teleportSequence??0)===(item.teleportSequence??0) && old.alive===item.alive && Math.hypot(old.x-x,old.y-z)<2) {x=old.x+(x-old.x)*t;z=old.y+(z-old.y)*t;}
        }
        if (kind === 'cache' && cacheAsset) {
          let chest = entities.get(key);
          if (!chest) {
            chest = {entity:world.spawn(key)};
            world.insert(chest.entity, MeshRenderer, {
              ...cacheAsset, color:color(1,1,1), opaque:true, cullBackfaces:true, lit:true, enabled:true,
            });
            entities.set(key, chest);
          }
          if (chest.x !== x || chest.z !== z) {
            world.insert(chest.entity, Transform, {position:{x,y:0,z}});
            chest.x = x;
            chest.z = z;
          }
          continue;
        }
        if (!entities.has(key)) entities.set(key,hunter?{body:parts(hunterParts()),weapon:[],orb:box('spell glow',{x:0,y:-100,z:0},{x:.1,y:.1,z:.1},color(.5,.5,1),'sphere')}:{entity:box(kind,{x,y:height/2,z},{x:.26,y:height,z:.26},kind==='cache'?color(.73,.52,.2):color(.3,.7,.7))});
        const entry=entities.get(key);
        if(hunter)updateHunter(entry,item,x,z,model,now);
        else world.insert(entry.entity,Transform,{position:{x,y:height/2,z},scale:{x:.0026,y:height/100,z:.0026}});
      }
    }
    for (const [key,e] of entities) if (!wanted.has(key)) {destroy(e);entities.delete(key);}
  }
  function viewWeapon(position,aim,combat,now){
    const name=combat.alive?combat.weapon?.name:null;
    if (name !== heldName) {
      for (const part of held) world.despawn(part.entity);
      const grip = name === 'Rusted Dagger' || name === 'Short Sword' ? 'tight' : 'wide';
      const hand = gloves[grip] ?? {name:'gloved hand',p:[0,-.02,0],s:[.09,.1,.1],c:[.26,.15,.09],mesh:'sphere'};
      held = name ? parts([...weaponModel(name), hand], 1) : [];
      heldName = name;
    }
    const swing=combat.attack===null?{roll:-.2,forward:0,side:0,lift:0}:attackPose(combat.attack,name);
    const lower=combat.swapRemaining>0?.2:0;
    const anchor=transformPart([.16+swing.side,-.20-lower+swing.lift,.45+swing.forward],toWorld(position.x,position.y,.62),aim);
    pose(held,anchor,aim,swing.roll,.48);
    if(castOrb===null)castOrb=box('First person spell',{x:0,y:-100,z:0},{x:.1,y:.1,z:.1},color(.5,.5,1),'sphere',1);
    const flash=combat.alive?combat.castFlash:0;
    if(!castHand.length)castHand=parts(gloves.wide?[gloves.wide]:[{name:'Casting glove',p:[0,0,0],s:[.1,.12,.12],c:[.26,.15,.09],mesh:'sphere'}],1);
    pose(castHand,transformPart([-.20,-.29+flash*.12,.34+flash*.10],toWorld(position.x,position.y,.62),aim),aim,-.18-flash*.3,.48);
    for(const p of castHand)world.set(p.entity,MeshRenderer,{...world.get(p.entity,MeshRenderer),enabled:combat.alive});
    world.insert(castOrb,Transform,{position:transformPart([-.19,-.12,.3],toWorld(position.x,position.y,.62),aim),scale:{x:flash*.00035,y:flash*.00035,z:flash*.00035}});
    world.set(castOrb,MeshRenderer,{...world.get(castOrb,MeshRenderer),enabled:flash>0,color:color(...spellColor(combat.castName??combat.spell?.name))});
  }
  function look(position,aim) {
    world.insert(camera,Transform,{position:toWorld(position.x,position.y,.62),rotation:cameraRotation(aim)});
    world.insert(lamp,Transform,{position:toWorld(position.x,position.y,.95)});
  }
  addEventListener('resize',()=>{canvas.width=innerWidth;canvas.height=innerHeight;Renderer.resize(canvas.width,canvas.height);});
  return {app,module,clear,updateMap,updateEntities,look,viewWeapon,counts:()=>({...spellEffects.counts(),spellParticles:[...spellMeshes.values()].reduce((n,g)=>n+g.length,0),spellEmitters:spellEmitters.size,spellNativeParticles:[...spellEmitters.values()].reduce((n,e)=>n+(app.getResource(Particle).getAliveCount(e.entity)??0),0),spellNativeParticleLimit:384,spellBackend:'native-particles-and-world-mesh',mode,portalCount:portals.size,portalMeshes:[...portals.values()].reduce((n,r)=>n+r.length,0),tiles:knownTiles,meshes:[...tiles.values()].reduce((n,row)=>n+row.length,0),entities:entities.size,cacheIds:[...entities.keys()].filter(k=>k.startsWith('cache:')).map(k=>k.slice(6)),avatars:[...entities.keys()].filter(k=>k.startsWith('hunter:')).length,heldWeapon:heldName})};
}
