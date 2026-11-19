import { readFile, mkdir, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildDungeonKit } from './dungeon-kit.mjs';
const manifest = JSON.parse(await readFile('vendor/estella/manifest.json'));
for (const [file, hash] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(await readFile(`vendor/estella/${file}`)).digest('hex');
  if (actual !== hash) throw new Error(`Runtime integrity mismatch: ${file}`);
}
const output=process.env.ESTELLA_DIST ?? 'dist';
await mkdir(output, {recursive:true});
for (const file of ['index.html','style.css','src','vendor']) await cp(file,`${output}/${file}`,{recursive:true});
await buildDungeonKit(`${output}/dungeon-kit`);
console.log(`Built isolated client with verified Estella ${manifest.release}`);
