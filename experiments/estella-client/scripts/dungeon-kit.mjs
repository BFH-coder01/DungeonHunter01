import {buildGloves} from './glove.mjs';
import {buildWeapons} from './import-weapons.mjs';
import { importChest } from './import-chest.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { o as encodeMesh, i as decodeMesh } from '../vendor/estella/sdk/shared/meshFormat.js';

const channels = [
  { semantic: 0, components: 3, type: 0, offset: 0 }, // Position
  { semantic: 2, components: 2, type: 0, offset: 12 }, // UV
  { semantic: 3, components: 3, type: 0, offset: 20 }, // Normal
];

function mesh(boxes) {
  const vertices = [], indices = [];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const [[x,y,z],[X,Y,Z], surface] of boxes) {
    const faces = [
      [[0,0,-1],[[X,y,z],[x,y,z],[x,Y,z],[X,Y,z]]],
      [[0,0,1],[[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]]],
      [[-1,0,0],[[x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z]]],
      [[1,0,0],[[X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z]]],
      [[0,1,0],[[x,Y,Z],[X,Y,Z],[X,Y,z],[x,Y,z]]],
      [[0,-1,0],[[x,y,z],[X,y,z],[X,y,Z],[x,y,Z]]],
    ];
    for (const [normal, corners] of faces) {
      const start = vertices.length / 8;
      for (const point of corners) {
        point.forEach((value, i) => { min[i] = Math.min(min[i], value); max[i] = Math.max(max[i], value); });
        const [px,py,pz] = point;
        // Use tile coordinates so adjacent stair blocks share the texture grid.
        const uv = normal[1] ? [px + .5, pz + .5] : [normal[0] ? pz + .5 : px + .5, py >= 0 ? py / 1.7 : -py];
        // Floor/stair meshes share one atlas with the ceiling stone and oak ribs.
        if (surface !== undefined) {
          const v = normal[1] ? pz + .5 : (py-y)/(Y-y);
          uv[1] = (surface + .005 + .99 * v) / 3;
        }
        vertices.push(...point, ...uv, ...normal);
      }
      indices.push(start,start+1,start+2,start,start+2,start+3);
    }
  }
  return encode(vertices, indices, min, max);
}

function encode(vertices, indices, min, max) {
  const encoded = encodeMesh({
    channels, indices: Uint32Array.from(indices), vertices: new Uint8Array(Float32Array.from(vertices).buffer),
    vertexStride: 32, vertexCount: vertices.length / 8, aabbMin: min, aabbMax: max,
  });
  decodeMesh(encoded); // Check compatibility with the pinned Estella decoder.
  return encoded;
}

function chunk(name, data) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  result.write(name, 4, 'ascii');
  data.copy(result, 8);
  let crc = -1;
  for (const byte of result.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  result.writeUInt32BE((~crc) >>> 0, result.length - 4);
  return result;
}

// Periodic noise keeps opposite edges of each tile continuous.
function hash(x,y) {
  let n = Math.imul(x+71,374761393) + Math.imul(y+37,668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(u,v,count) {
  const x=u*count, y=v*count, i=Math.floor(x), j=Math.floor(y);
  const wrap=n=>((n%count)+count)%count;
  const h=(a,b)=>hash(wrap(a),wrap(b));
  const smooth=t=>t*t*(3-2*t);
  const mix=(a,b,t)=>a+(b-a)*t;
  return mix(mix(h(i,j),h(i+1,j),smooth(x-i)),mix(h(i,j+1),h(i+1,j+1),smooth(x-i)),smooth(y-j));
}

function masonry(u,v,wall) {
  const cloud=noise(u,v,5), fleck=noise(u,v,47);
  const warp=(noise(u,v,13)-.5)*.018;
  const courses=wall?6:2, columns=2;
  const y=(v+warp)*courses, row=Math.floor(y), fy=y-row;
  const x=(u+warp*.6)*columns + (row%2===0?0:.53);
  const col=Math.floor(x), fx=x-col;
  const face=hash((col+columns)%columns,(row+courses)%courses);
  const dx=Math.min(fx,1-fx)/columns, dy=Math.min(fy,1-fy)/courses;
  const joint=Math.min(dx,dy) - .32*Math.max(0,.026-Math.max(dx,dy));
  const relief=Math.max(0,Math.min(1,(joint-.003)/.014));
  const rim=joint<.019 && (fy>.5 || fx<.5) ? 13*(1-relief) : 0;
  const shade=(wall?75:80) + 29*face + 29*(cloud-.5) + 20*(fleck-.5) +
    11*(noise(u,v,112)-.5);
  const stone=34+(shade-34)*relief+rim;
  const damp=wall?Math.max(0,.23-v)*55:0;
  return [stone+(wall?1:-2)-damp,stone+4-damp*.58,stone+7-damp];
}

function stoneTexture(wall) {
  const width=256, height=wall?width:width*3, stride=width*3+1;
  const pixels=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const u=x/width, v=1-(y%width)/width;
    const surface=wall?0:2-Math.floor(y/width);
    let rgb;
    if(surface===2) {
      const grain=noise(u,v*.15,42)*22+6*Math.sin(u*190+3*Math.sin(v*12));
      rgb=[59+grain,43+grain*.8,32+grain*.6];
    } else {
      rgb=masonry(u,v,wall);
      if(surface===1) rgb=rgb.map(c=>c*.69);
    }
    pixels.set(rgb.map(Math.round), y*stride+1+x*3);
  }
  return png(width,pixels,height);
}

function png(size, pixels, height=size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

export async function buildDungeonKit(directory) {
  const floor = [[-.5,-.12,-.5],[.5,0,.5],0];
  const ceiling = [[-.5,1.7,-.5],[.5,1.82,.5],1];
  const joist = [[-.055,1.61,-.5],[.055,1.7,.5],2];
  const stairs = rise => Array.from({length: 5}, (_, i) => {
    const step = rise ? i : 4 - i;
    const y = (step - 4) * .055;
    return [[-.5,-.34,-.5 + i / 5],[.5,y,-.5 + (i + 1) / 5],0];
  });
  const models = {
    wall: [[[-.5,0,-.5],[.5,1.7,.5]]],
    floor: [floor,ceiling,joist],
    'stairs-down': [...stairs(false),ceiling,joist],
    'stairs-up': [...stairs(true),ceiling,joist],
  };
  const chest = await importChest();
  await mkdir(directory, { recursive: true });
  await Promise.all([
    buildWeapons(directory, encode),
    buildGloves(directory, encode, png),
    ...Object.entries(models).map(([name, boxes]) => writeFile(`${directory}/${name}.esmesh`, mesh(boxes))),
    writeFile(`${directory}/cache.esmesh`, encode(chest.vertices, chest.indices, chest.min, chest.max)),
    writeFile(`${directory}/cache.png`, chest.png),
    writeFile(`${directory}/wall.png`, stoneTexture(true)),
    writeFile(`${directory}/floor.png`, stoneTexture(false)),
  ]);
}
