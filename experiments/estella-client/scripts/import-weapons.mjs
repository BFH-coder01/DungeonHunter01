import {readGlb} from './read-glb.mjs';
import {writeFile} from 'node:fs/promises';

const weapons = [
  [
    "Rusted Dagger",
    "i-hilt-baselard",
    0.49,
    "bef5abb53f836b5a4a4bb9e50ed78c275485bd358af4385c163a787691f0717e"
  ],
  [
    "Short Sword",
    "arming-sword",
    0.72,
    "def24f7176601564e38ae67494eeca61984e59ec93480e7e42acc447d0ceb693"
  ],
  [
    "War Axe",
    "high-crescent-battle-axe",
    0.65,
    "dbc91b1879c4c1c3fab5bcfebdf06550bf4f1dbd59d6e62e9b256095c7461078"
  ],
  [
    "Spear",
    "leaf-spear",
    1.2,
    "9eac3857ed09f2638df56cc14d206c98dcc6057b5e98deaa0ddf454e1b9cf3dc"
  ],
  [
    "Maul",
    "iron-bound-wooden-maul",
    0.66,
    "79a0e8fad5a2f6400925135ec43090365734ab0559d512e6e5af9b8bbd9a9623"
  ]
];

// Each model is authored upright around its grip. Keep the grip at the origin
// and retain distinct base-color images (the battle axe uses two).
export async function buildWeapons(directory, encode) {
  const manifest = {};
  for (const [name, slug, height, hash] of weapons) {
    const {model, accessor, view} = await readGlb(slug, hash);
    const groups = new Map();
    let bottom = Infinity, top = -Infinity;
    for (const node of model.nodes) {
      if (node.mesh === undefined) continue;
      const [tx,ty,tz] = node.translation ?? [0,0,0];
      for (const primitive of model.meshes[node.mesh].primitives) {
        const texture = model.materials[primitive.material].pbrMetallicRoughness.baseColorTexture.index;
        const image = model.textures[texture].source;
        if (!groups.has(image)) groups.set(image, {vertices:[], indices:[]});
        const {vertices, indices} = groups.get(image);
        const attributes = primitive.attributes;
        const positions = accessor(attributes.POSITION, 3, Float32Array);
        const normals = accessor(attributes.NORMAL, 3, Float32Array);
        const uv = accessor(attributes.TEXCOORD_0, 2, Float32Array);
        const base = vertices.length / 8;
        for (let j = 0; j < positions.length; j += 3) {
          const y = positions[j+1]+ty;
          bottom = Math.min(bottom, y);
          top = Math.max(top, y);
          const k = j / 3 * 2;
          vertices.push(positions[j]+tx, y, positions[j+2]+tz, uv[k], 1-uv[k+1], normals[j], normals[j+1], normals[j+2]);
        }
        for (const i of accessor(primitive.indices, 1, Uint16Array)) indices.push(base+i);
      }
    }
    const scale = height / (top-bottom);
    manifest[name] = [];
    for (const [image, {vertices, indices}] of groups) {
      const min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
      for (let j=0; j<vertices.length; j+=8) for (let axis=0; axis<3; axis++) {
        const value = vertices[j+axis] *= scale;
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      }
      const id = slug+'-'+image;
      manifest[name].push(id);
      await writeFile(directory+'/'+id+'.esmesh', encode(vertices,indices,min,max));
      await writeFile(directory+'/'+id+'.png', view(model.images[image].bufferView));
    }
  }
  await writeFile(directory+'/weapons.json', JSON.stringify(manifest));
}
