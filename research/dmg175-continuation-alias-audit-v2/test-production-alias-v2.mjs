import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withFrozenBeforeAliasModule} from './frozen-before-adapter-v2.mjs';

const root=new URL('../../',import.meta.url),require=createRequire(import.meta.url),books=require('../../dist/books.js');
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const capture=read('research/dmg175-continuation-alias-audit-v1/actual-before-and-controls-v1.json');
const captureBytes=readFileSync(new URL('research/dmg175-continuation-alias-audit-v1/actual-before-and-controls-v1.json',root));
const frozenSourceBytes=readFileSync(new URL('./continuation-alias-audit-before-v1.mjs',import.meta.url));
assert.equal(sha(frozenSourceBytes),'8ecfbd80c303d6e9e1db505f930ed64d1a5a889e9ba513f483e06f32c4987911');
assert.equal(sha(captureBytes),'6166f40cb67a273c11225303ee1caee8baa355971ebd23fb663b52cc89509383');
const mode=process.env.DMG175_ALIAS_AUDIT_TARGET||'production';
const target=mode==='candidate'?await import('./production-api-candidate-v2.mjs'):mode==='production'?await import('../../tools/continuation-alias-audit.mjs'):(()=>{throw Error(`Unsupported DMG175_ALIAS_AUDIT_TARGET: ${mode}`)})();
assert.equal(typeof target.buildContinuationAliasReport,'function');
assert.equal(typeof target.loadContinuationAliasReport,'function');
const data=read('dist/data.json'),manifest=read('research/citation-continuations.json'),collectionNames=['rules','spells','equipment','matrices','classes'];
function catalogsFromLiveData(){
 const catalogs=new Map();
 for(const collection of collectionNames)for(const item of data[collection]||[])for(const field of ['sourceExcerpts','scanVerification']){const path=item[field]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,read('dist/'+path));}
 if(data.progressionExplainer)for(const field of ['sourceExcerpts','scanVerification']){const path=data.progressionExplainer[field]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,read('dist/'+path));}
 return catalogs;
}
const catalogs=catalogsFromLiveData();
function reportFor({path,owner,groupId,region,aliases=[],overrides=[],booksArg=books}){
 const raw=catalogs.get(path),byId=new Map(overrides.map(x=>[x.id,x]));
 const catalog={...raw,regions:[...raw.regions.map(x=>byId.get(x.id)||x),...aliases]};
 const probeManifest={groups:[{id:groupId,collection:'rules',itemId:owner.id,catalog:path,segments:[{state:'present',role:'context',regionId:region.id}]}]};
 return target.buildContinuationAliasReport({data,manifest:probeManifest,catalogs:new Map([[path,catalog]]),books:booksArg});
}

test('byte-exact frozen old source reproduces actual current baseline and the historical forged-alias failure',async()=>{
 await withFrozenBeforeAliasModule({repoRoot:new URL('../../',import.meta.url).pathname},async before=>{
  assert.equal(before.buildContinuationAliasReport instanceof Function,true);
  const actual=before.loadContinuationAliasReport();
  assert.deepEqual(actual.denominators,capture.actualCurrent.denominators);
  assert.equal(sha(Buffer.from(JSON.stringify(actual))),capture.actualCurrent.reportCanonicalSha256);
  assert.deepEqual(actual.matches.filter(x=>capture.actualCurrent.dmg175Groups.includes(x.groupId)),[]);
  assert.deepEqual(actual.unassessableParts.filter(x=>capture.actualCurrent.dmg175Groups.includes(x.groupId)),[]);
  const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
  const base=catalog.regions.find(x=>x.id===capture.actualSupplement.regionId);
  const forged={...base,id:capture.isolatedPreRepairControl.forgedAliasId,sourceArtifactId:'wrong-artifact',sourceSha256:'0'.repeat(64),sourceCropBoundsPx:[0,0,1,1]};
  const output=before.buildContinuationAliasReport({data,manifest:{groups:[{id:'research-only-dmg175-probe',collection:'rules',itemId:owner.id,catalog:path,segments:[{state:'present',role:'context',regionId:base.id}]}]},catalogs:new Map([[path,{...catalog,regions:[...catalog.regions,forged]}]])});
  assert.deepEqual(output.matches[0],capture.isolatedPreRepairControl.oldAuditMatch);
  assert.equal(output.matches[0].sourceSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
  assert.equal(output.unassessableParts.length,0);
 });
});

test('production API preserves the entire live ordinary-PDF report and truthful zero-current-DMG175 result',async()=>{
 await withFrozenBeforeAliasModule({repoRoot:new URL('../../',import.meta.url).pathname},async before=>{
  const expected=before.loadContinuationAliasReport(),actual=target.loadContinuationAliasReport();
  assert.deepEqual(actual,expected,'after integration, all existing ordinary-PDF rows, hashes, order and report denominators stay exact');
  assert.deepEqual(actual.denominators,capture.actualCurrent.denominators);
  assert.deepEqual(actual.matches.filter(x=>capture.actualCurrent.dmg175Groups.includes(x.groupId)),[]);
  assert.deepEqual(actual.unassessableParts.filter(x=>capture.actualCurrent.dmg175Groups.includes(x.groupId)),[]);
  assert.equal(actual.structuralCheck.sourceSemanticsCertified,false);
 });
});

test('production API rejects malformed supplemental identity before matching or assessment',()=>{
 const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
 const base=catalog.regions.find(x=>x.id===capture.actualSupplement.regionId);
 for(const [label,mutate]of [
  ['unknown source artifact',x=>x.sourceArtifactId='not-registered'],
  ['wrong crop bounds',x=>x.sourceCropBoundsPx=[0,0,1,1]],
  ['wrong image hash',x=>x.sha256='0'.repeat(64)],
  ['invented PDF page',x=>x.pdfPage=175],
 ]){
  const invalid=structuredClone(base);mutate(invalid);
  const report=reportFor({path,owner,groupId:`research-only-${label.replaceAll(' ','-')}`,region:invalid,overrides:[invalid]});
  assert.equal(report.matches.length,0,label);
  assert.equal(report.unassessableParts.length,1,label);
  assert.equal(report.unassessableParts[0].regionId,invalid.id,label);
 }
 const invalidAlias={...base,id:'research-only-invalid-alias',sourceArtifactId:'not-registered',sourceCropBoundsPx:[0,0,1,1]};
 const report=reportFor({path,owner,groupId:'research-only-invalid-alias-row',region:base,aliases:[invalidAlias]});
 assert.equal(report.matches.length,0,'forged supplemental alias rows are excluded');
 assert.equal(report.unassessableParts.length,0,'the valid declared primary remains independently assessable');
});

test('production API preserves ordinary-PDF alias row objects exactly',async()=>{
 const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
 const base=catalog.regions.find(x=>x.book==='DMG'&&x.printedPage===176),alias={...base,id:'research-only-pdf-alias'};
 const synthetic={...catalog,regions:[...catalog.regions,alias]},probeManifest={groups:[{id:'research-only-pdf-control',collection:'rules',itemId:owner.id,catalog:path,segments:[{state:'present',role:'continuation',regionId:base.id}]}]},input=new Map([[path,synthetic]]);
 await withFrozenBeforeAliasModule({repoRoot:new URL('../../',import.meta.url).pathname},async before=>{
  const expected=before.buildContinuationAliasReport({data,manifest:probeManifest,catalogs:input});
  const actual=target.buildContinuationAliasReport({data,manifest:probeManifest,catalogs:input});
  assert.deepEqual(actual.matches,expected.matches);
  assert.equal(actual.matches.length,1);
  assert.equal(Object.hasOwn(actual.matches[0],'sourceKind'),false);
  assert.equal(Object.hasOwn(actual.matches[0],'canonicalPdfSha256'),false);
 });
});

test('production supplemental match fields separate JPEG provenance from canonical PDF provenance',()=>{
 const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
 const base=catalog.regions.find(x=>x.id===capture.actualSupplement.regionId),alias={...base,id:'research-only-serializer-alias'};
 const resolver={resolveRegionSourceIdentity(c,r){if(r.id===alias.id)return books.resolveRegionSourceIdentity(c,base);return books.resolveRegionSourceIdentity(c,r);}};
 const output=reportFor({path,owner,groupId:'research-only-serializer-control',region:base,aliases:[alias],booksArg:resolver});
 assert.equal(output.matches.length,1);
 const match=output.matches[0];
 assert.equal(match.sourceKind,'supplemental-image');
 assert.equal(match.sourceArtifactId,'dmg175-user-confirmed-supplement');
 assert.equal(match.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');
 assert.equal(match.canonicalPdfSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
 assert.deepEqual(match.sourceCropBoundsPx,[630,990,1329,1796]);
});

test('original production --check CLI remains available and exits successfully',()=>{
 const output=execFileSync(process.execPath,['tools/continuation-alias-audit.mjs','--check'],{cwd:new URL('../../',import.meta.url).pathname,encoding:'utf8'});
 const parsed=JSON.parse(output);
 assert.deepEqual(parsed.denominators,capture.actualCurrent.denominators);
 assert.deepEqual(parsed.structuralCheck,{valid:true,sourceSemanticsCertified:false});
});
