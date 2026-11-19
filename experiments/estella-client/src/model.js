export const toWorld = (x, y, elevation = 0) => ({x, y:elevation, z:y});
export const toGame = ({x,z}) => ({x,y:z});
// Estella's perspective camera looks down local -Z. Game aim zero faces +X.
export const cameraRotation = aim => ({x:0,y:Math.sin((-aim-Math.PI/2)/2),z:0,w:Math.cos((-aim-Math.PI/2)/2)});
const finite = Number.isFinite;
const point = p => p && finite(p.x) && finite(p.y);
export class Model {
  constructor() { this.reset(); }
  reset() { this.you=null; this.tiles=new Int8Array(); this.current=null; this.previous=null; this.received=0; this.changed=[]; }
  accept(msg, now=performance.now()) {
    if (!msg || msg.dm) throw new Error('Not a player message');
    if (msg.type === 'welcome') {
      if (typeof msg.you !== 'string' || !Number.isInteger(msg.width) || !Number.isInteger(msg.height) || msg.width<1 || msg.height<1 || msg.width*msg.height>65536) throw new Error('Invalid welcome');
      this.reset(); this.you=msg.you; this.width=msg.width; this.height=msg.height; this.level=msg.level;
      this.tiles=new Int8Array(msg.width*msg.height).fill(-1);
      return 'welcome';
    }
    if (msg.type !== 'state') return null;
    if (!this.you || !point(msg.self) || !finite(msg.self.aim) || msg.self.level !== this.level || !Array.isArray(msg.reveal) || msg.reveal.length%2) throw new Error('Invalid state');
    for (const field of ['others','caches','drops']) {
      if (!Array.isArray(msg[field]) || msg[field].some(p => !point(p))) throw new Error(`Invalid ${field}`);
    }
    const portalValid=p=>point(p)&&typeof p.id==='string'&&['red','green','blue','yellow'].includes(p.color??'red');
    if(msg.battlePortal!=null&&!portalValid(msg.battlePortal))throw new Error('Invalid battle portal');
    if(msg.linkPortals!==undefined&&(!Array.isArray(msg.linkPortals)||msg.linkPortals.length>6||msg.linkPortals.some(p=>!portalValid(p))))throw new Error('Invalid link portals');
    for (let i=0;i<msg.reveal.length;i+=2) {
      const index=msg.reveal[i], value=msg.reveal[i+1];
      if (!Number.isInteger(index)||index<0||index>=this.tiles.length||!Number.isInteger(value)||value<0||value>3) throw new Error('Invalid reveal');
    }
    // Validate the complete packet before applying any mutation.
    this.changed=[];
    for (let i=0;i<msg.reveal.length;i+=2) {
      const index=msg.reveal[i], value=msg.reveal[i+1];
      if (this.tiles[index]!==value) { this.tiles[index]=value; this.changed.push(index); }
    }
    this.previous=this.current; this.current=msg; this.received=now;
    return 'state';
  }
  position(now) {
    if (!this.current) return null;
    const b=this.current.self, a=this.previous?.self;
    if (!a || (a.teleportSequence??0)!==(b.teleportSequence??0) || a.alive!==b.alive || Math.hypot(a.x-b.x,a.y-b.y)>2) return b;
    const t=Math.max(0,Math.min(1,(now-this.received)/50));
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  known(p) {
    const x=Math.floor(p.x),y=Math.floor(p.y);
    return x>=0 && y>=0 && x<this.width && y<this.height && this.tiles[y*this.width+x]>0;
  }
}
export function movement(keys, aim) {
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  return {type:'input',mx:Math.cos(aim)*forward-Math.sin(aim)*side,my:Math.sin(aim)*forward+Math.cos(aim)*side,aim};
}
