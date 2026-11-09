// Bounded test-only loader for the byte-exact pre-repair production module.
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const beforeUrl=new URL('./continuation-alias-audit-before-v1.mjs',import.meta.url);
const expectedSha256='8ecfbd80c303d6e9e1db505f930ed64d1a5a889e9ba513f483e06f32c4987911';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function replaceExactlyOnce(source,from,to,label){
 const first=source.indexOf(from);
 assert.ok(first>=0,`frozen-source adapter expected ${label}`);
 assert.equal(source.indexOf(from,first+from.length),-1,`frozen-source adapter found multiple ${label} sites`);
 return source.slice(0,first)+to+source.slice(first+from.length);
}

export async function withFrozenBeforeAliasModule({repoRoot},callback){
 const frozenBytes=readFileSync(beforeUrl);
 assert.equal(sha(frozenBytes),expectedSha256,'the before-module fixture must remain byte-exact');
 let source=frozenBytes.toString('utf8');
 source=replaceExactlyOnce(source,"import {sourceRect} from './citation-context-contract.mjs';",`import {sourceRect} from ${JSON.stringify(pathToFileURL(resolve(repoRoot,'tools/citation-context-contract.mjs')).href)};`,'sourceRect import');
 source=replaceExactlyOnce(source,"const root=resolve(import.meta.dirname,'..');",`const root=resolve(${JSON.stringify(repoRoot)});`,'repository root');
 // The original CLI block is unchanged. On dynamic import, process.argv[1] remains the
 // test runner; because it is not this temporary module, the original main guard stays off.
 const tempDir=mkdtempSync(join(tmpdir(),'dmg175-alias-before-adapter-'));
 const tempPath=join(tempDir,'continuation-alias-audit-before-adapted.mjs');
 try{
  writeFileSync(tempPath,source);
  const module=await import(`${pathToFileURL(tempPath).href}?fixture=${process.pid}-${Date.now()}`);
  return await callback(module,{frozenBytesSha256:sha(frozenBytes)});
 }finally{rmSync(tempDir,{recursive:true,force:true});}
}
