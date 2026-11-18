// Original leather gauntlet in weapon-local space. Y runs along the handle.
import {writeFile} from 'node:fs/promises';

const unit = v => v.map(x => x / Math.hypot(...v));
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

function gauntlet(radius, encode) {
  const vertices = [], indices = [], min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
  // Sweep elliptical rings down a finger, palm, or cuff. Each row ends with its two radii.
  function sweep(rings, reference, material) {
    const count = 12, base = vertices.length / 8;
    for (let i=0; i<rings.length; i++) {
      const [x,y,z,a,b] = rings[i];
      const prev = rings[Math.max(0,i-1)], next = rings[Math.min(rings.length-1,i+1)];
      const tangent = unit(next.slice(0,3).map((n,j)=>n-prev[j]));
      const u = unit(cross(reference,tangent)), v = cross(tangent,u);
      for(let j=0; j<=count; j++) {
        const angle = 2*Math.PI*j/count, c=Math.cos(angle), s=Math.sin(angle);
        const pos = [x,y,z].map((n,k)=>n+a*c*u[k]+b*s*v[k]);
        const normal = unit(u.map((n,k)=>n*c/a+v[k]*s/b));
        for(let k=0;k<3;k++) { min[k]=Math.min(min[k],pos[k]); max[k]=Math.max(max[k],pos[k]); }
        vertices.push(...pos,(material+.03+.94*j/count)/3,.03+.94*i/(rings.length-1),...normal);
        if(i && j) {
          const p=base+i*(count+1)+j;
          indices.push(p-count-2,p-count-1,p, p-count-2,p,p-1);
        }
      }
    }
  }
  const up=[0,1,0];
  // The wrist extends toward the lower right of the first-person view.
  // Continue the sleeve beyond the viewport during the forward thrust.
  sweep([[-.31,-.32,-.58,.068,.069],[-.21,-.19,-.34,.059,.061],
    [-.125,-.099,-.17,.052,.054]],up,1);
  sweep([[-.14,-.11,-.19,.048,.052],[-.086,-.066,-.105,.045,.047],
    [-.046,-.027,-.046,.034,.05],[-.042,0,.002,.026,.057],
    [-.036,.004,.037,.018,.051],[-.033,.004,.047,.004,.037]],up,0);
  sweep([[-.147,-.116,-.20,.059,.061],[-.139,-.108,-.186,.06,.062],
    [-.081,-.06,-.096,.049,.052],[-.077,-.057,-.09,.047,.05]],up,1);
  sweep([[-.103,-.077,-.132,.055,.058],[-.094,-.07,-.118,.054,.057]],up,2);
  for(let i=0;i<4;i++) {
    const y=.042-i*.028, thickness=.0145-i*.0008;
    const path=[[-.039,.029],[-.025,radius+.013],[.003,radius+.017],
      [radius+.011,.014],[radius+.013,-.006],[radius+.001,-.023],[.008,-.027]];
    sweep(path.map(([x,z],j)=>[x,y-.0009*j,z,j===6?.004:thickness,j===6?.004:thickness]),up,0);
  }
  sweep([[-.045,.016,-.032,.02,.022],[-.031,.045,-.039,.022,.019],
    [-.006,.056,-.039,.019,.017],[.016,.047,-.033,.017,.016],
    [.025,.033,-.027,.013,.013],[.025,.028,-.024,.004,.004]], [0,0,1],0);
  return encode(vertices,indices,min,max);
}

export async function buildGloves(directory, encode, png) {
  const size=96, stride=1+3*size, pixels=Buffer.alloc(size*stride);
  const palette=[[117,75,48],[81,55,39],[161,122,70]];
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const band=Math.floor(x/32);
    const grain=(x*13+y*37+x*y*3)%13-6;
    const seam=(x%32===4 || x%32===27) && y%9<5 ? 28 : 0;
    const curve=11*Math.cos(2*Math.PI*(x%32)/32);
    pixels.set(palette[band].map(n=>Math.round(n+grain+seam+curve)),y*stride+1+x*3);
  }
  await Promise.all([
    writeFile(directory+'/glove.png',png(size,pixels)),
    writeFile(directory+'/glove-tight.esmesh',gauntlet(.017,encode)),
    writeFile(directory+'/glove-wide.esmesh',gauntlet(.026,encode)),
  ]);
}
