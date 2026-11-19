import {writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
// Original soft radial sprite, following the local particle-demo's texture approach.
function chunk(name,data){
 const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);out.write(name,4);data.copy(out,8);
 let crc=-1;for(const b of out.subarray(4,-4)){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 out.writeUInt32BE((~crc)>>>0,out.length-4);return out;
}
export async function buildSpellTexture(directory){
 const size=64,raw=Buffer.alloc(size*(size*4+1));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*(size*4+1)+1+x*4,r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
  raw[i]=raw[i+1]=raw[i+2]=255;raw[i+3]=Math.round(255*Math.pow(Math.max(0,1-r*r),3));
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 await writeFile(`${directory}/spell-particle.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
