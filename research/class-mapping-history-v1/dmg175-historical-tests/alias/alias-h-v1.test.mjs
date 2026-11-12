import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withFrozenBeforeAliasModule} from '../../../dmg175-continuation-alias-audit-v2/frozen-before-adapter-v2.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadHistoricalHAliasInputs} from '../../../../tests/helpers/class-mapping-historical-test-inputs-v1.mjs';

const root=new URL('../../../../',import.meta.url),rootPath=fileURLToPath(root),require=createRequire(import.meta.url),books=require(fileURLToPath(new URL('dist/books.js',root)));
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
function assertCurrentMmAndHistoricalH(){const proof=hInputs.proof;assert.deepEqual(proof.currentMmSummary,{sourceCommit:'0f2d70a135e3ad486152bf00f21387d60a1a97ef',sourceTree:'08010faf457df22cdb0a5ec35d2dcf79e622ade9',owners:1064,canonicalBindings:5731,retainedCanonicalBindings:5655,addedCanonicalBindings:76,manualBindings:1293,addedManualBindings:42,addedOwners:2,tableRows:26,tableCells:208,historicalMechanicsReviewRecords:1215,mechanicsOwnerRecords:1064,mechanicsFormalFields:14201,mechanicsUncheckedFields:899},'actual strict current-MM cohort');assert.deepEqual(proof.historicalHSummary,{sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',owners:1062,canonicalBindings:5655,priorWholeBindings:4931,addedBindings:724,manualAdditions:321,newRules:48,sourceTableRows:244,sourceCells:343,historicalMechanicsReviews:1215},'exact historical H preimage summary');return proof;}
const hInputs=loadHistoricalHAliasInputs();
const capture=read('research/hirelings-source-epoch-proposal-v5/dmg175-current-h-successors-v2/alias/current-h-alias-capture-v1.json');
const captureBytes=readFileSync(new URL('research/hirelings-source-epoch-proposal-v5/dmg175-current-h-successors-v2/alias/current-h-alias-capture-v1.json',root));
const frozenSourceBytes=readFileSync(new URL('research/dmg175-continuation-alias-audit-v2/continuation-alias-audit-before-v1.mjs',root));
assert.equal(sha(frozenSourceBytes),'8ecfbd80c303d6e9e1db505f930ed64d1a5a889e9ba513f483e06f32c4987911');
assert.equal(sha(captureBytes),'a7726d6632d93a1a03c1efb279c73354e349f8568e68713fc135c3efc264594b');
const mode=process.env.DMG175_ALIAS_AUDIT_TARGET||'production';
const candidateApi=pathToFileURL(resolve(rootPath,'research/dmg175-continuation-alias-audit-v2/production-api-candidate-v2.mjs')).href,productionApi=pathToFileURL(resolve(rootPath,'tools/continuation-alias-audit.mjs')).href;
const target=mode==='candidate'?await import(candidateApi):mode==='production'?await import(productionApi):(()=>{throw Error(`Unsupported DMG175_ALIAS_AUDIT_TARGET: ${mode}`)})();
assert.equal(typeof target.buildContinuationAliasReport,'function');
assert.equal(typeof target.loadContinuationAliasReport,'function');
const {data,manifest,catalogs,inputHashes}=hInputs;
function reportFor({path,owner,groupId,region,aliases=[],overrides=[],booksArg=books}){
 const raw=catalogs.get(path),byId=new Map(overrides.map(x=>[x.id,x]));
 const catalog={...raw,regions:[...raw.regions.map(x=>byId.get(x.id)||x),...aliases]};
 const probeManifest={groups:[{id:groupId,collection:'rules',itemId:owner.id,catalog:path,segments:[{state:'present',role:'context',regionId:region.id}]}]};
 return target.buildContinuationAliasReport({data,manifest:probeManifest,catalogs:new Map([[path,catalog]]),books:booksArg});
}

test('actual MM and exact historical-H source identities are separately explicit',()=>{assert.deepEqual(assertCurrentMmAndHistoricalH().historicalHSummary,{sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',owners:1062,canonicalBindings:5655,priorWholeBindings:4931,addedBindings:724,manualAdditions:321,newRules:48,sourceTableRows:244,sourceCells:343,historicalMechanicsReviews:1215});assert.deepEqual(capture.sourceEpoch,{nativeFixture:{path:'tests/fixtures/hirelings-source-current-cohort-v1.json',sha256:'62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f'},sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',sourceTree:'e6bc420f70656825a926297b959bc6d98758bfcd',currentData:{path:'dist/data.json',sha256:'2cddb11a82ecc3b9d77cb3fa2ae49eef5623a5470ac85a540d1baf483e096a95'},currentManifest:{path:'research/citation-continuations.json',sha256:'a47bd2c4c2b8d5e9066ec35a9d44c37fc3c8cda2c363406a9aa00c522c0d9231'}});});

test('byte-exact frozen old source reproduces the historical-H report and the historical forged-alias failure',async()=>{
 await withFrozenBeforeAliasModule({repoRoot:rootPath},async before=>{
  assert.equal(before.buildContinuationAliasReport instanceof Function,true);
  const actual=before.buildContinuationAliasReport({data,manifest,catalogs,inputHashes});
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

test('production API preserves the exact historical-H ordinary-PDF report and truthful zero-H-DMG175 result',async()=>{
 await withFrozenBeforeAliasModule({repoRoot:rootPath},async before=>{
  const expected=before.buildContinuationAliasReport({data,manifest,catalogs,inputHashes});
  const actual=target.buildContinuationAliasReport({data,manifest,catalogs,inputHashes,books});
  assert.deepEqual(actual,expected,'all H-era rows, hashes, order and report denominators stay exact when both kernels receive exact H inputs');
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
 await withFrozenBeforeAliasModule({repoRoot:rootPath},async before=>{
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

test('current-MM production --check CLI reports actual MM inputs and exits successfully',()=>{
 assertCurrentMmAndHistoricalH();
 const output=execFileSync(process.execPath,['tools/continuation-alias-audit.mjs','--check'],{cwd:rootPath,encoding:'utf8'});
 const parsed=JSON.parse(output);
 assert.deepEqual(parsed.denominators,{exposedRecords:1064,referencedCatalogs:1084,catalogRegionRows:4114,declaredGroups:284,declaredParts:560,exactAliasMatches:710,missingAliasLinks:0,unassessableDeclaredParts:27});
 assert.deepEqual(parsed.structuralCheck,{valid:true,sourceSemanticsCertified:false});
});
