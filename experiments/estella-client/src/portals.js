export const portalColors={red:[1,.12,.2],green:[.1,1,.48],blue:[.18,.48,1],yellow:[1,.8,.12]};
export const landmarks=state=>[state?.battlePortal,...state?.linkPortals??[]].filter(Boolean);
export function reconcileTravel(previous,self,aim) {
  const travelled=!!previous && (previous.teleportSequence??0)!==(self.teleportSequence??0);
  const redChanged=!!previous && (self.redFacingRevision??0)>(previous?.redFacingRevision??0);
  return {travelled,aim:redChanged&&Number.isFinite(self.redFacingAim)?self.redFacingAim:aim};
}
// This overlay receives only the explicitly public portal landmarks. It never
// reads tiles or hidden entities. Nearby glow is intentionally visible through walls.
export function drawPortalLocator(canvas,state,position,aim,age=0) {
  const w=innerWidth,h=innerHeight;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
  if(!position)return;
  const f=h/(2*Math.tan(75*Math.PI/360));
  const ps=landmarks(state), lanes=[];
  for(const p of ps){
    const dx=p.x-position.x,dy=p.y-position.y,d=Math.hypot(dx,dy);
    const forward=Math.cos(aim)*dx+Math.sin(aim)*dy,side=-Math.sin(aim)*dx+Math.cos(aim)*dy;
    const bearing=Math.atan2(side,forward),rgb=portalColors[p.color??'red'].map(v=>Math.round(v*255));
    const css=`rgb(${rgb.join(',')})`, projected=w/2+side/Math.max(.15,forward)*f;
    if(d<10&&forward>.2&&projected>-80&&projected<w+80){
      const x=projected,y=h/2-.05*f/forward,r=Math.min(160,Math.max(14,f*.65/Math.max(1,d)));
      const glow=ctx.createRadialGradient(x,y,0,x,y,r);
      glow.addColorStop(0,`rgba(${rgb.join(',')},${.27*(1-d/12)})`);glow.addColorStop(1,`rgba(${rgb.join(',')},0)`);
      ctx.fillStyle=glow;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    // Compact top-edge compass, with vertically staggered colliding labels.
    const x=Math.max(52,Math.min(w-52,w/2+bearing/(Math.PI/2)*(w/2-52)));
    let row=lanes.findIndex(xs=>xs.every(q=>Math.abs(q-x)>=94));if(row<0){row=lanes.length;lanes.push([]);}lanes[row].push(x);
    const y=88+row*34,remaining=Math.max(0,(p.cooldownRemaining??0)-age);
    ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(5,10,17,.8)';ctx.fillRect(x-44,y-13,88,30);
    ctx.fillStyle=css;ctx.fillText(`${bearing<-.75?'◀ ':bearing>.75?'▶ ':''}${p.color??'red'} ${Math.round(d)}t`,x,y);
    ctx.font='10px system-ui';ctx.fillStyle='#e7ecf5';ctx.fillText(p.color==='red'||!p.color?(remaining?`${Math.ceil(remaining/1000)}s cooldown`:'Gather hunters'):'Paired portal',x,y+12);
  }
}
