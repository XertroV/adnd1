import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assertClassMappingCurrentSourceIdentity} from '../tools/class-mapping-current-source-gate-v2.mjs';
import {createRawGitReader} from '../tools/class-mapping-raw-git-v1.mjs';
import {buildContinuationAliasReport,loadContinuationAliasReport} from '../tools/continuation-alias-audit.mjs';

const root=new URL('../',import.meta.url),rootPath=fileURLToPath(root),books=createRequire(import.meta.url)('../dist/books.js'),search=createRequire(import.meta.url)('../dist/search.js');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),raw=createRawGitReader(rootPath);
const codePaths=Object.freeze(['tools/continuation-alias-audit.mjs','tools/citation-context-contract.mjs','dist/books.js','dist/search.js']);
const expected=Object.freeze({exposedRecords:1070,referencedCatalogs:1090,catalogRegionRows:4213,declaredGroups:284,declaredParts:560,exactAliasMatches:710,missingAliasLinks:0,unassessableDeclaredParts:27});
function currentInputs(){
 const proof=assertClassMappingCurrentSourceIdentity();
 assert.equal(proof.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(proof.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
 raw.assertView();
 const pinned=path=>{const expected=proof.inputHashes.sourceBody[path];assert.match(expected||'',/^[a-f0-9]{64}$/,'actual Native2 source-body role '+path);const bytes=readFileSync(new URL(path,root));assert.equal(sha(bytes),expected);return bytes;};
 for(const path of codePaths)assert.deepEqual(readFileSync(new URL(path,root)),raw.git('show',proof.summary.sourceCommit+':'+path),'CLI/Books code equals actual committed Source2 bytes');
 const dataBytes=pinned('dist/data.json'),manifestBytes=pinned('research/citation-continuations.json'),data=JSON.parse(dataBytes),manifest=JSON.parse(manifestBytes),catalogs=new Map();
 const owners=['rules','spells','equipment','matrices','classes'].flatMap(collection=>(data[collection]||[]));if(data.progressionExplainer)owners.push(data.progressionExplainer);
 assert.equal(owners.length,proof.summary.owners);assert.equal(owners.length,expected.exposedRecords);
 for(const item of owners)for(const key of ['sourceExcerpts','scanVerification']){const path=item[key]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,JSON.parse(pinned('dist/'+path)));}
 return {proof,pinned,data,manifest,catalogs,dataBytes,manifestBytes};
}
function unchanged(before){
 const after=assertClassMappingCurrentSourceIdentity();assert.deepEqual(after.summary,before.summary);assert.deepEqual(after.inputHashes,before.inputHashes);raw.assertView();
 for(const path of codePaths)assert.deepEqual(readFileSync(new URL(path,root)),raw.git('show',after.summary.sourceCommit+':'+path));
}

test('current Native2 --check CLI reports genuine qualified inputs and current denominators', {timeout:600_000},()=>{
 const current=currentInputs(),report=loadContinuationAliasReport();
 assert.equal(report.inputHashes.data.sha256,sha(current.dataBytes));assert.equal(report.inputHashes.manifest.sha256,sha(current.manifestBytes));
 assert.deepEqual(Object.keys(report.inputHashes.catalogs).sort(),[...current.catalogs.keys()].sort());
 for(const [path,digest]of Object.entries(report.inputHashes.catalogs))assert.equal(digest,current.proof.inputHashes.sourceBody['dist/'+path]);
 const output=execFileSync(process.execPath,['tools/continuation-alias-audit.mjs','--check'],{cwd:rootPath,encoding:'utf8'}),parsed=JSON.parse(output);
 assert.deepEqual(parsed.denominators,expected);
 assert.deepEqual(parsed.denominators,report.denominators);
 assert.deepEqual(parsed.structuralCheck,{valid:true,sourceSemanticsCertified:false});
 assert.deepEqual(parsed.structuralCheck,report.structuralCheck);
 assert.equal(report.invalidGroups.length,0);assert.equal(report.missingAliases.length,0);assert.equal(report.unassessableParts.length,27);
 unchanged(current.proof);
});

test('current Native2 alias identity preserves malformed-source negatives and JPEG/PDF provenance separation', {timeout:600_000},()=>{
 const current=currentInputs(),{data,catalogs}=current,owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution');assert.ok(owner);
 const path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path),base=catalog.regions.find(x=>x.sourceArtifactId==='dmg175-user-confirmed-supplement');assert.ok(base);
 function reportFor(region,{aliases=[],booksArg=books}={}){const c={...catalog,regions:[...catalog.regions.map(r=>r.id===region.id?region:r),...aliases]},manifest={groups:[{id:'current-s1-research-only-alias-control',collection:'rules',itemId:owner.id,catalog:path,segments:[{state:'present',role:'context',regionId:region.id}]}]};return buildContinuationAliasReport({data,manifest,catalogs:new Map([[path,c]]),books:booksArg});}
 for(const [label,mutate]of [
  ['unknown source artifact',x=>x.sourceArtifactId='not-registered'],
  ['wrong crop bounds',x=>x.sourceCropBoundsPx=[0,0,1,1]],
  ['wrong image hash',x=>x.sha256='0'.repeat(64)],
  ['invented PDF page',x=>x.pdfPage=175],
 ]){const invalid=structuredClone(base);mutate(invalid);const report=reportFor(invalid);assert.equal(report.matches.length,0,label);assert.equal(report.unassessableParts.length,1,label);assert.equal(report.unassessableParts[0].regionId,invalid.id,label);assert.equal(report.structuralCheck.sourceSemanticsCertified,false);}
 const forged={...base,id:'current-s1-research-only-forged-alias',sourceArtifactId:'not-registered',sourceCropBoundsPx:[0,0,1,1]},invalidAlias=reportFor(base,{aliases:[forged]});assert.equal(invalidAlias.matches.length,0);assert.equal(invalidAlias.unassessableParts.length,0);
 const alias={...base,id:'current-s1-research-only-serializer-alias'},resolver={resolveRegionSourceIdentity(c,r){return books.resolveRegionSourceIdentity(c,r.id===alias.id?base:r);}},supplement=reportFor(base,{aliases:[alias],booksArg:resolver});assert.equal(supplement.matches.length,1);
 const match=supplement.matches[0];assert.equal(match.sourceKind,'supplemental-image');assert.equal(match.sourceArtifactId,'dmg175-user-confirmed-supplement');assert.equal(match.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');assert.equal(match.canonicalPdfSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');assert.deepEqual(match.sourceCropBoundsPx,[630,990,1329,1796]);
 const pdf=catalog.regions.find(x=>x.book==='DMG'&&x.printedPage===176);assert.ok(pdf);const pdfAlias={...pdf,id:'current-s1-research-only-pdf-alias'},ordinary=reportFor(pdf,{aliases:[pdfAlias]});assert.equal(ordinary.matches.length,1);assert.equal(Object.hasOwn(ordinary.matches[0],'sourceKind'),false);assert.equal(Object.hasOwn(ordinary.matches[0],'canonicalPdfSha256'),false);
 unchanged(current.proof);
});

test('declared continuation owners remain findable and outrank body-only references in actual search', {timeout:600_000},()=>{
 const current=currentInputs(),seen=new Set();
 for(const group of current.manifest.groups){
  const key=group.collection+':'+group.itemId;if(seen.has(key))continue;seen.add(key);
  const rows=Array.isArray(current.data[group.collection])?current.data[group.collection]:[current.data[group.collection]],owner=rows.find(row=>row?.id===group.itemId);
  assert.ok(owner,'declared continuation has its exact public owner '+key);
  const title=owner.name||owner.title;assert.equal(typeof title,'string',key+' has a public search title');assert.ok(title.trim());
  const prepared=search.prepare({...owner,_view:group.collection,_title:title}),reference=search.prepare({_view:'spells',_title:'Unrelated continuation search canary',description:title+' is only a cross reference.'});
  assert.ok(Number.isFinite(search.score(prepared,title)),key+' is found through the actual search implementation');
  assert.ok(search.score(prepared,title)<search.score(reference,title),key+' exact title outranks an unrelated body-only reference');
 }
 assert.ok(seen.size>0,'nonempty declared continuation-owner fixture');unchanged(current.proof);
});


import {assertClassMappingCurrentSourceIdentity as assertSource2IdentityFromV8ContinuationSearch} from '../tools/class-mapping-current-source-gate-v2.mjs';

test('v8 Source2 identity gate regression: continuation-search successor',()=>{
 const identity=assertSource2IdentityFromV8ContinuationSearch();
 assert.equal(identity.summary.stage,'source2-body-native');
 assert.equal(identity.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(identity.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
});
