// Original procedural models; positions are relative to a grip or avatar feet.
// Local +Z faces forward, +X is the hunter's right, +Y is up.
const cloth=[.13,.19,.23],leather=[.22,.12,.07],metal=[.66,.73,.76],gold=[.64,.43,.16];
const part=(name,p,s,c,mesh='cube',group='body')=>({name,p,s,c,mesh,group});
export function hunterParts(){return [
  part('robe',[0,.46,0],[.4,.55,.28],cloth,'cone'),
  part('chest',[0,.63,0],[.29,.25,.2],cloth),
  part('belt',[0,.46,.01],[.31,.055,.23],leather),
  part('buckle',[0,.46,.133],[.065,.06,.025],gold),
  part('hood',[0,.86,0],[.32,.32,.29],cloth,'sphere'),
  part('hood crown',[0,1,0],[.23,.2,.23],cloth,'cone'),
  part('face shadow',[0,.845,.133],[.19,.17,.035],[.025,.032,.036]),
  part('left eye',[-.05,.87,.155],[.024,.018,.012],[.8,.65,.32]),
  part('right eye',[.05,.87,.155],[.024,.018,.012],[.8,.65,.32]),
  part('left sleeve',[-.205,.6,0],[.13,.31,.15],cloth,'capsule','leftArm'),
  part('right sleeve',[.205,.6,0],[.13,.31,.15],cloth,'capsule','rightArm'),
  part('left glove',[-.205,.43,.015],[.1,.11,.11],leather,'sphere','leftArm'),
  part('right glove',[.205,.43,.015],[.1,.11,.11],leather,'sphere','rightArm'),
  part('left boot',[-.1,.12,.04],[.12,.24,.19],leather,'cube','leftLeg'),
  part('right boot',[.1,.12,.04],[.12,.24,.19],leather,'cube','rightLeg'),
];}
export function weaponParts(name){
  const grip=part('wrapped grip',[0,0,0],[.045,.16,.045],leather,'cylinder');
  const pommel=part('pommel',[0,-.095,0],[.07,.04,.07],gold,'sphere');
  const guard=part('guard',[0,.1,0],[.2,.035,.055],gold);
  switch(name){
    case 'Short Sword': return [grip,pommel,guard,part('blade',[0,.32,0],[.065,.42,.025],metal),part('point',[0,.56,0],[.065,.1,.025],metal,'cone')];
    case 'War Axe':return [part('haft',[0,.17,0],[.04,.55,.04],leather,'cylinder'),part('axe head',[-.07,.4,0],[.24,.17,.05],metal),part('axe edge',[-.2,.4,0],[.035,.21,.055],[.86,.9,.92])];
    case 'Spear':return [part('shaft',[0,.27,0],[.035,.95,.035],leather,'cylinder'),part('binding',[0,.73,0],[.055,.1,.055],gold,'cylinder'),part('spear point',[0,.86,0],[.09,.21,.045],metal,'cone')];
    case 'Maul':return [part('haft',[0,.16,0],[.055,.55,.055],leather,'cylinder'),part('maul head',[0,.43,0],[.29,.18,.17],[.35,.4,.43]),part('left band',[-.11,.43,0],[.035,.19,.18],gold),part('right band',[.11,.43,0],[.035,.19,.18],gold)];
    case 'Rusted Dagger':return [grip,pommel,guard,part('blade',[0,.22,0],[.055,.23,.025],[.49,.43,.34]),part('point',[0,.36,0],[.055,.07,.025],metal,'cone')];
    default:return []; // Never invent another hunter's equipment on an older server.
  }
}
export function spellColor(name){return name==='Frost Lance'?[.3,.8,1]:name==='Ember Burst'?[1,.3,.07]:name==='Mend'?[.25,1,.5]:[.55,.55,1];}
export function transformPart(p,anchor,aim,roll=0,scale=1){
  const rx=(p[0]*Math.cos(roll)-p[1]*Math.sin(roll))*scale;
  const y=(p[0]*Math.sin(roll)+p[1]*Math.cos(roll))*scale;
  const forward=p[2]*scale;
  return {x:anchor.x-Math.sin(aim)*rx+Math.cos(aim)*forward,y:anchor.y+y,z:anchor.z+Math.cos(aim)*rx+Math.sin(aim)*forward};
}
export function partRotation(aim,roll=0){
  // Our visual offsets use screen-right with +Z forward; that reverses local roll
  // relative to the engine's right-handed mesh rotation.
  const yaw=(Math.PI/2-aim)/2,s=Math.sin(yaw),c=Math.cos(yaw),r=-roll/2;
  return {x:s*Math.sin(r),y:s*Math.cos(r),z:c*Math.sin(r),w:c*Math.cos(r)};
}
