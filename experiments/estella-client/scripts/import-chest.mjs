import {readGlb} from './read-glb.mjs';

export async function importChest() {
  const {model, accessor, view} = await readGlb('treasure-chest', 'd7cdf414965077491f887c57b8774d5e0d3f43fb5591830677dcdda9aa7a42d5');
  const vertices = [], indices = [];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const index of model.scenes[model.scene ?? 0].nodes) {
    const node = model.nodes[index];
    const [tx, ty, tz] = node.translation;
    for (const primitive of model.meshes[node.mesh].primitives) {
      const {POSITION, NORMAL, TEXCOORD_0} = primitive.attributes;
      const positions = accessor(POSITION, 3, Float32Array);
      const normals = accessor(NORMAL, 3, Float32Array);
      const uv = accessor(TEXCOORD_0, 2, Float32Array);
      const base = vertices.length / 8;
      for (let i = 0; i < positions.length / 3; i++) {
        const j = i * 3;
        // Model +Z faces the player at game aim zero (world -X).
        const point = [-(positions[j+2]+tz), positions[j+1]+ty, positions[j]+tx];
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], point[axis]);
          max[axis] = Math.max(max[axis], point[axis]);
        }
        vertices.push(...point, uv[i*2], 1-uv[i*2+1], -normals[j+2], normals[j+1], normals[j]);
      }
      for (const i of accessor(primitive.indices, 1, Uint16Array)) indices.push(base+i);
    }
  }
  const scale = .45 / Math.max(max[0]-min[0], max[2]-min[2]);
  const origin = [(min[0]+max[0])/2, min[1], (min[2]+max[2])/2];
  for (let i = 0; i < vertices.length; i += 8) {
    for (let axis = 0; axis < 3; axis++) vertices[i+axis] = (vertices[i+axis]-origin[axis])*scale;
  }
  const texture = model.materials[0].pbrMetallicRoughness.baseColorTexture.index;
  const baseColor = model.images[model.textures[texture].source];
  return {vertices, indices, min:min.map((v,i)=>(v-origin[i])*scale),
    max:max.map((v,i)=>(v-origin[i])*scale), png:view(baseColor.bufferView)};
}
