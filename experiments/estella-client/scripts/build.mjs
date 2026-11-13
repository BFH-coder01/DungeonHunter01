import { readFile, mkdir, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile('vendor/estella/manifest.json'));
for (const [file, hash] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(await readFile(`vendor/estella/${file}`)).digest('hex');
  if (actual !== hash) throw new Error(`Runtime integrity mismatch: ${file}`);
}
await mkdir('dist', {recursive:true});
for (const file of ['index.html','style.css','src','vendor']) await cp(file,`dist/${file}`,{recursive:true});
console.log(`Built isolated client with verified Estella ${manifest.release}`);
