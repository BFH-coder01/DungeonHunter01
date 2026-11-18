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
  for (const [[x,y,z],[X,Y,Z], material] of boxes) {
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
      for (const [corner, point] of corners.entries()) {
        point.forEach((value, i) => { min[i] = Math.min(min[i], value); max[i] = Math.max(max[i], value); });
        const [px,py,pz] = point;
        // Use tile coordinates so adjacent stair blocks share the texture grid.
        let uv = normal[1] ? [px + .5, pz + .5] : [normal[0] ? pz + .5 : px + .5, py >= 0 ? py / 1.7 : -py];
        if (material !== undefined) {
          // Map each prop face inside its atlas column, inset to avoid texture bleed.
          const right = corner === 1 || corner === 2;
          uv = [(material + (right ? .96 : .04)) / 3, corner < 2 ? .04 : .96];
        }
        vertices.push(...point, ...uv, ...normal);
      }
      indices.push(start,start+1,start+2,start,start+2,start+3);
    }
  }
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

function stoneTexture(wall) {
  const size = 128, stride = size * 3 + 1;
  const pixels = Buffer.alloc(stride * size);
  let seed = 3479;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / 32), col = Math.floor((x + row % 2 * 32) / 64);
    const edge = Math.min((x + row % 2 * 32) % 64, y % 32);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const shade = edge < 2 ? 48 : 91 + (row * 13 + col * 7) % 22 + (seed >>> 28) + (edge === 2 ? 18 : 0);
    const offset = y * stride + 1 + x * 3;
    pixels.set([shade + (wall ? 5 : 12), shade + 3, shade + (wall ? 6 : -6)], offset);
  }
  return png(size, pixels);
}

function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Atlas columns: oak planks, forged iron, brass hardware.
function cacheTexture() {
  const size = 192, stride = size * 3 + 1;
  const pixels = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = Math.sin(y * .7 + Math.sin(x / 17) + Math.sin(y / 8));
    const noise = ((x * 37 + y * 73 + x * y) % 19) - 9;
    const plank = y % 48 < 3 ? -42 : 0;
    const shade = Math.round(13 * grain + noise + plank);
    const rgb = x < 64 ? [150 + shade, 86 + shade, Math.max(0, 43 + shade)]
      : x < 128 ? [68 + noise, 75 + noise, 82 + noise]
      : [205 + noise, 155 + noise, 63 + noise];
    pixels.set(rgb, y * stride + 1 + x * 3);
  }
  return png(size, pixels);
}

function cacheBoxes() {
  // Front is -X. The stepped lid sits above a recessed dark seam.
  const boxes = [
    [[-.143,0,-.218],[.143,.155,.218],0],
    [[-.14,.155,-.214],[.14,.166,.214],1],
    [[-.15,.166,-.225],[.15,.209,.225],0],
    [[-.125,.209,-.221],[.125,.237,.221],0],
    [[-.085,.237,-.216],[.085,.25,.216],0],
  ];
  for (const z of [-.145,.145]) {
    for (const [depth, bottom, top] of [[.146,.002,.156],[.153,.161,.212],[.128,.212,.24],[.088,.24,.253]]) {
      boxes.push([[-depth,bottom,z-.016],[depth,top,z+.016],1]);
    }
  }
  boxes.push([[-.156,.11,-.03],[-.149,.202,.03],2],
    [[-.161,.13,-.009],[-.156,.15,.009],1]);
  return boxes;
}

export async function buildDungeonKit(directory) {
  const floor = [[-.5,-.12,-.5],[.5,0,.5]];
  const stairs = rise => Array.from({length: 5}, (_, i) => {
    const step = rise ? i : 4 - i;
    const y = (step - 4) * .055;
    return [[-.5,-.34,-.5 + i / 5],[.5,y,-.5 + (i + 1) / 5]];
  });
  const models = {
    wall: [[[-.5,0,-.5],[.5,1.7,.5]]],
    floor: [floor],
    cache: cacheBoxes(),
    'stairs-down': stairs(false),
    'stairs-up': stairs(true),
  };
  await mkdir(directory, { recursive: true });
  await Promise.all([
    ...Object.entries(models).map(([name, boxes]) => writeFile(`${directory}/${name}.esmesh`, mesh(boxes))),
    writeFile(`${directory}/cache.png`, cacheTexture()),
    writeFile(`${directory}/wall.png`, stoneTexture(true)),
    writeFile(`${directory}/floor.png`, stoneTexture(false)),
  ]);
}
