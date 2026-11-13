// Import only the lean SDK's reachable JS modules, plus the matching WASM core.
// Usage: node scripts/import-runtime.mjs <extracted app.asar.unpacked> <upstream source>
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [archive, source] = process.argv.slice(2);
if (!archive || !source) throw new Error('Supply extracted release and pinned source directories');
const root = path.resolve('vendor/estella');
const sdk = path.resolve(archive, 'node_modules/esengine/dist');
const seen = new Set();
async function copyModule(rel) {
  if (seen.has(rel)) return;
  seen.add(rel);
  const code = await readFile(path.join(sdk, rel), 'utf8');
  await mkdir(path.dirname(path.join(root, 'sdk', rel)), {recursive:true});
  await writeFile(path.join(root, 'sdk', rel), code);
  for (const m of code.matchAll(/(?:from\s*|import\s*\(?\s*)["'](\.[^"']+\.js)["']/g)) {
    await copyModule(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  }
}
await copyModule('index.lean.js');
for (const name of ['esengine.js', 'esengine.wasm']) await copyFile(path.join(archive, 'dist/wasm', name), path.join(root, name));
for (const name of ['LICENSE', 'NOTICE']) await copyFile(path.join(source, name), path.join(root, name));
const licenses = await readdir(path.join(root,'licenses'));
const files = [...seen].map(p => `sdk/${p}`).concat(['esengine.js','esengine.wasm','LICENSE','NOTICE'],licenses.map(p=>`licenses/${p}`));
const hashes = {};
for (const file of files.sort()) hashes[file] = createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
await writeFile(path.join(root,'manifest.json'), JSON.stringify({release:'v0.104.1',commit:'aed656a66def98a47f136ef5384c008f108757e0',files:hashes},null,2)+'\n');
console.log(`Imported ${files.length} pinned runtime files`);
