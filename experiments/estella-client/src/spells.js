export const SPELL_LIFETIME=1100;
export const MAX_SPELL_EFFECTS=8;
export const PARTICLES_PER_SPELL=36;
export const spellPalette={spark:[.76,.32,1],ember_burst:[1,.28,.035],frost_lance:[.35,.85,1],mend:[.25,1,.48]};
export function validCast(c) {
  return c && Number.isSafeInteger(c.sequence) && c.sequence>0 && Number.isFinite(c.timestamp)
    && Number.isFinite(c.aim) && [c.origin?.x,c.origin?.y,c.endpoint?.x,c.endpoint?.y].every(Number.isFinite)
    && Object.hasOwn(spellPalette,c.spellKey) && ['hit','miss','wall','heal','clipped'].includes(c.result);
}
// Server time supplies initial age; only monotonic client time advances it thereafter.
export class SpellEffects {
  constructor(){this.reset();}
  reset(){this.highwater=new Map();this.active=new Map();this.accepted=0;this.dropped=0;this.lastSnapshot=null;this.travel=null;}
  update(model,now) {
    const snapshot=model.current;
    if(!snapshot)return [];
    if(snapshot!==this.lastSnapshot){
      this.lastSnapshot=snapshot;
      const travel=snapshot.self.teleportSequence??0;
      if(this.travel!==null&&travel!==this.travel)this.active.clear();
      this.travel=travel;
      const present=new Map([[model.you,snapshot.self],...snapshot.others.map(p=>[p.id,p])]);
      for(const [id,e] of this.active){const p=present.get(id);if(!snapshot.self.alive||!p?.alive||!p.castRecord||(p.teleportSequence??0)!==e.cast.teleportSequence)this.active.delete(id);}
      for(const [id,p] of present){
        const c=p.castRecord;if(!validCast(c))continue;
        const seen=this.highwater.get(id)??0;if(c.sequence<=seen)continue;
        this.highwater.set(id,c.sequence);
        const age=Math.max(0,snapshot.t-c.timestamp)+(now-model.received);
        if(!snapshot.self.alive||!p.alive||age>=SPELL_LIFETIME||(p.teleportSequence??0)!==c.teleportSequence){this.dropped++;continue;}
        if(!this.active.has(id)&&this.active.size>=MAX_SPELL_EFFECTS){this.dropped++;continue;}
        this.active.set(id,{id,cast:c,start:now-age});this.accepted++;
      }
    }
    for(const [id,e] of this.active)if(now-e.start>=SPELL_LIFETIME)this.active.delete(id);
    return [...this.active.values()].map(e=>({...e,age:now-e.start}));
  }
  counts(){return {spellEffects:this.active.size,spellAccepted:this.accepted,spellDropped:this.dropped,spellSeenCasters:this.highwater.size,spellEffectLimit:MAX_SPELL_EFFECTS,spellParticleLimit:MAX_SPELL_EFFECTS*PARTICLES_PER_SPELL};}
}
const noise=(i,seed)=>{const x=Math.sin(i*127.1+seed*311.7)*43758.5453;return x-Math.floor(x);};
// Closed-form drag and gravity keep resumed/tab-stalled frames stable, without simulation catch-up.
export function spellParticle(c,age,i){
  const key=c.spellKey,t=age/1000,n=noise(i,c.sequence),angle=n*Math.PI*2;
  const dx=c.endpoint.x-c.origin.x,dz=c.endpoint.y-c.origin.y,distance=Math.hypot(dx,dz);
  const ux=distance?dx/distance:Math.cos(c.aim),uz=distance?dz/distance:Math.sin(c.aim);
  const rgb=spellPalette[key];
  let x,y,z,size,shape='sphere',stretch=1;
  if(key==='mend'){
    const a=angle+t*3.4,r=.55+.08*Math.sin(i+t*3);
    x=c.origin.x+Math.cos(a)*r;z=c.origin.y+Math.sin(a)*r;
    y=.12+((i/PARTICLES_PER_SPELL+t*.65)%1)*.45;size=.008*(1-t/1.1);
  }else if(i<16){
    const flight=key==='ember_burst'?.30:key==='frost_lance'?.24:.18;
    const progress=Math.min(1,Math.max(0,(t-i*.004)/flight));
    const spread=key==='ember_burst'?Math.sin(i*2.4)*.25*progress:.018*Math.sin(i*2+t*30);
    // Release ahead of the left hand; never spawn a full-size bead at the camera.
    const release=Math.min(.45,distance*.3),side=-.14*Math.min(1,distance);
    const sx=c.origin.x+ux*release-uz*side,sz=c.origin.y+uz*release+ux*side;
    x=sx+(c.endpoint.x-sx)*progress-uz*spread;z=sz+(c.endpoint.y-sz)*progress+ux*spread;
    y=.51+Math.cos(i*2.1)*Math.abs(spread);
    size=t<i*.004?0:(key==='ember_burst'?.010:.008)*Math.max(0,1-(t-flight)/.16);
    shape=key==='frost_lance'?'cone':'sphere';stretch=key==='frost_lance'?2.8:1;
  }else{
    const delay=key==='ember_burst'?.25:.18,q=Math.max(0,t-delay),drag=(1-Math.exp(-3*q))/3;
    const speed=.7+n*1.5,gravity=key==='ember_burst'?2.6:key==='frost_lance'?1.8:.9;
    x=c.endpoint.x+Math.cos(angle)*speed*drag;z=c.endpoint.y+Math.sin(angle)*speed*drag;
    y=.5+(noise(i+50,c.sequence)*1.7)*drag-gravity*q*q/2;
    x+=Math.sin(q*9+i)*.035*q;z+=Math.cos(q*8+i)*.035*q;
    size=t<delay||c.result==='clipped'?0:.012*Math.max(0,1-q/.8);
    if(key==='frost_lance'){shape=i%2?'cone':'sphere';stretch=i%2?2:1;}
  }
  return {position:{x,y:Math.max(.035,y),z},size:Math.max(0,size),stretch,shape,rgb};
}
