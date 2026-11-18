import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

// Reader for the pinned assets, which use tightly packed float attributes and uint16 indices.
export async function readGlb(slug, sha) {
  const file = await readFile(new URL(`../assets/${slug}.glb`, import.meta.url));
  if (createHash('sha256').update(file).digest('hex') !== sha) throw new Error(`Integrity mismatch: ${slug}`);
  const jsonEnd = 20 + file.readUInt32LE(12);
  const model = JSON.parse(file.toString('utf8', 20, jsonEnd));
  const binary = file.subarray(jsonEnd + 8);
  function view(index) {
    const {byteOffset = 0, byteLength} = model.bufferViews[index];
    return binary.subarray(byteOffset, byteOffset + byteLength);
  }
  function accessor(index, components, ArrayType) {
    const a = model.accessors[index];
    const data = view(a.bufferView);
    return new ArrayType(data.buffer, data.byteOffset + (a.byteOffset ?? 0), a.count * components);
  }
  return {model, accessor, view};
}
