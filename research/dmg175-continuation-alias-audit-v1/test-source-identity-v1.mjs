import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {buildContinuationAliasReport as buildBefore,loadContinuationAliasReport as loadBefore} from '../../tools/continuation-alias-audit.mjs';
import {buildContinuationAliasReportWithResolvedSourceIdentity as buildCandidate,loadResolvedContinuationAliasReport as loadCandidate,resolveAliasRegionIdentity} from './continuation-alias-audit-source-identity-v1.mjs';

const root=new URL('../../',import.meta.url),require=createRequire(import.meta.url),books=require('../../dist/books.js');
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=read('research/dmg175-continuation-alias-audit-v1/actual-before-and-controls-v1.json');
const fixtureBytes=readFileSync(new URL('research/dmg175-continuation-alias-audit-v1/actual-before-and-controls-v1.json',root));
const data=read('dist/data.json'),manifest=read('research/citation-continuations.json');
const recordCollections=['rules','spells','equipment','matrices','classes'];
function catalogInputs(){
 const catalogs=new Map();
 for(const collection of recordCollections)for(const item of data[collection]||[])for(const key of ['sourceExcerpts','scanVerification']){const path=item[key]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,read('dist/'+path));}
 if(data.progressionExplainer)for(const key of ['sourceExcerpts','scanVerification']){const path=data.progressionExplainer[key]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,read('dist/'+path));}
 return catalogs;
}
const catalogs=catalogInputs();
function probe({catalogPath,owner,groupId,segmentRegion,aliasRegions=[],regionOverrides=[],booksArg=books}){
 const sourceCatalog=catalogs.get(catalogPath),overrides=new Map(regionOverrides.map(r=>[r.id,r])),catalog={...sourceCatalog,regions:[...sourceCatalog.regions.map(r=>overrides.get(r.id)||r),...aliasRegions]};
 const probeManifest={groups:[{id:groupId,collection:'rules',itemId:owner.id,catalog:catalogPath,segments:[{state:'present',role:'context',regionId:segmentRegion.id}]}]};
 return buildCandidate({data,manifest:probeManifest,catalogs:new Map([[catalogPath,catalog]]),books:booksArg});
}

test('actual dirty source state is byte-identical for current alias report and preserves no-match DMG175 status',()=>{
 assert.equal(sha(fixtureBytes),'6166f40cb67a273c11225303ee1caee8baa355971ebd23fb663b52cc89509383');
 for(const input of Object.values(fixture.files))assert.equal(sha(readFileSync(new URL(input.path,root))),input.sha256,input.path);
 const before=loadBefore(),candidate=loadCandidate();
 assert.deepEqual(candidate,before,'valid ordinary-PDF alias rows, report shape, input pins and denominators remain exact');
 assert.equal(sha(Buffer.from(JSON.stringify(before))),fixture.actualCurrent.reportCanonicalSha256);
 assert.deepEqual(candidate.denominators,fixture.actualCurrent.denominators);
 assert.deepEqual(candidate.matches.filter(x=>fixture.actualCurrent.dmg175Groups.includes(x.groupId)),[]);
 assert.deepEqual(candidate.unassessableParts.filter(x=>fixture.actualCurrent.dmg175Groups.includes(x.groupId)),[]);
 assert.equal(candidate.structuralCheck.sourceSemanticsCertified,false);
});

test('preserved actual-before probe reproduces the forged supplemental alias acceptance and mislabeled source SHA',()=>{
 const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
 const base=catalog.regions.find(r=>r.id===fixture.actualSupplement.regionId);
 const forged={...base,id:fixture.isolatedPreRepairControl.forgedAliasId,sourceArtifactId:'wrong-artifact',sourceSha256:'0'.repeat(64),sourceCropBoundsPx:[0,0,1,1]};
 const old=buildBefore({data,manifest:{groups:[{id:'research-only-dmg175-probe',collection:'rules',itemId:owner.id,catalog:path,segments:[{state:'present',role:'context',regionId:base.id}]}]},catalogs:new Map([[path,{...catalog,regions:[...catalog.regions,forged]}]])});
 assert.equal(old.matches.length,fixture.isolatedPreRepairControl.oldAuditMatchCount);
 assert.equal(old.unassessableParts.length,fixture.isolatedPreRepairControl.oldAuditUnassessableCount);
 assert.deepEqual(old.matches[0],fixture.isolatedPreRepairControl.oldAuditMatch);
 assert.equal(old.matches[0].sourceSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
 assert.equal(resolveAliasRegionIdentity(catalog,base).sourceIdentity.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');
});

test('a supplemental alias must pass the canonical Books source resolver before it is considered',()=>{
 const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
 const base=catalog.regions.find(r=>r.id===fixture.actualSupplement.regionId);
 for(const [name,edit] of [
  ['unknown artifact',r=>r.sourceArtifactId='unregistered-artifact'],
  ['wrong source crop',r=>r.sourceCropBoundsPx=[0,0,1,1]],
  ['forged output image',r=>r.sha256='0'.repeat(64)],
  ['imputed PDF page',r=>r.pdfPage=175],
 ]){
  const forged=structuredClone(base);edit(forged);
  const candidate=probe({catalogPath:path,owner,groupId:`research-only-invalid-${name.replaceAll(' ','-')}`,segmentRegion:forged,regionOverrides:[forged]});
  assert.equal(candidate.matches.length,0,name);
  assert.equal(candidate.unassessableParts.length,1,name);
  assert.equal(candidate.unassessableParts[0].regionId,forged.id,name);
 }
 const alias={...base,id:'research-only-unregistered-alias',sourceArtifactId:'wrong-artifact',sourceCropBoundsPx:[0,0,1,1]};
 const validPrimary=probe({catalogPath:path,owner,groupId:'research-only-invalid-alias-row',segmentRegion:base,aliasRegions:[alias]});
 assert.equal(validPrimary.matches.length,0,'an invalid alias candidate cannot be reported as an exact match');
 assert.equal(validPrimary.unassessableParts.length,0,'the valid declared primary remains independently assessable');
});

test('ordinary PDF aliases keep the existing row shape and exact report objects',()=>{
 const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
 const base=catalog.regions.find(r=>r.book==='DMG'&&r.printedPage===176),alias={...base,id:'research-only-pdf-alias'};
 const probeManifest={groups:[{id:'research-only-pdf-control',collection:'rules',itemId:owner.id,catalog:path,segments:[{state:'present',role:'continuation',regionId:base.id}]}]};
 const synthetic={...catalog,regions:[...catalog.regions,alias]},input=new Map([[path,synthetic]]);
 const before=buildBefore({data,manifest:probeManifest,catalogs:input});
 const candidate=buildCandidate({data,manifest:probeManifest,catalogs:input});
 assert.deepEqual(candidate.matches,before.matches);
 assert.equal(candidate.matches.length,1);
 assert.equal(Object.hasOwn(candidate.matches[0],'sourceKind'),false);
 assert.equal(Object.hasOwn(candidate.matches[0],'canonicalPdfSha256'),false);
});

test('supplemental match serialization carries distinct JPEG and canonical-PDF identities',()=>{
 const owner=data.rules.find(x=>x.id==='appendix-c-party-magic-distribution'),path=owner.sourceExcerpts.catalog,catalog=catalogs.get(path);
 const base=catalog.regions.find(r=>r.id===fixture.actualSupplement.regionId),alias={...base,id:'research-only-serializer-alias'};
 const trustedTestResolver={resolveRegionSourceIdentity(c,r){if(r.id==='research-only-serializer-alias')return books.resolveRegionSourceIdentity(c,base);return books.resolveRegionSourceIdentity(c,r);}};
 const result=probe({catalogPath:path,owner,groupId:'research-only-serializer-control',segmentRegion:base,aliasRegions:[alias],booksArg:trustedTestResolver});
 assert.equal(result.matches.length,1);
 const match=result.matches[0];
 assert.equal(match.sourceKind,'supplemental-image');
 assert.equal(match.sourceArtifactId,'dmg175-user-confirmed-supplement');
 assert.equal(match.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');
 assert.equal(match.canonicalPdfSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
 assert.equal(match.pdfPage,undefined);
 assert.deepEqual(match.sourceCropBoundsPx,[630,990,1329,1796]);
});
