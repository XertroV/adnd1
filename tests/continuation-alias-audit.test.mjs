// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync as readRawFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v2.mjs';
import {execFileSync} from '../research/class-mapping-history-v1/mm-replay-child-process-v1.mjs';

import {gunzipSync} from 'node:zlib';
import {buildContinuationAliasReport,loadContinuationAliasReport} from '../research/class-mapping-history-v1/replay-tools/continuation-alias-audit-mm-v2.mjs';
import {projectPass8CitationTargetCropBytes} from './helpers/pass8-ua-source-history.mjs';
import {assertMmTreasureCurrentSourceCohort,readMmTreasureCurrentSourceInputs} from './helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
const read=p=>JSON.parse(readRawFileSync(p,'utf8'));
const before=read('research/source-audit-batch5-continuation-alias-before.json');
const integration=read('research/source-audit-batch5-continuation-alias-integration.json');
const manifest=read('research/citation-continuations.json');
const liveManifest=JSON.parse(readRawFileSync(new URL('../research/citation-continuations.json',import.meta.url),'utf8'));
const data=read('dist/data.json');
const liveData=JSON.parse(readRawFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const addedDmg74MatrixIds=[
 'dmg-cleric-druid-monk-attack-matrix',
 'dmg-magic-user-illusionist-attack-matrix',
 'dmg-thief-assassin-attack-matrix',
];
const addedDmg74MatrixCatalogs=addedDmg74MatrixIds.map(id=>`scans/verified/matrices-${id}.json`).sort();
const catalogs=new Map();
for(const collection of ['rules','spells','equipment','matrices','classes','progressionExplainer']){
 const values=Array.isArray(data[collection])?data[collection]:data[collection]?[data[collection]]:[];
 for(const item of values)for(const key of ['sourceExcerpts','scanVerification']){const path=item[key]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,read('dist/'+path));}
}
const oldManifestBytes=gunzipSync(readRawFileSync(integration.beforeManifestFixture));
const oldManifest=JSON.parse(oldManifestBytes);
const aliasBeforeCommit='d4229f438757ee2cad5ecbe8327e21731a38a3ed';
const aliasBeforeBytes=path=>execFileSync('git',['show',`${aliasBeforeCommit}:${path}`],{maxBuffer:32*1024*1024});
const aliasBeforeDataBytes=aliasBeforeBytes('dist/data.json');
assert.equal(createHash('sha256').update(aliasBeforeDataBytes).digest('hex'),before.inputHashes.data.sha256,'the exact 995-owner alias preimage is read from its immutable Git commit');
assert.equal(createHash('sha256').update(oldManifestBytes).digest('hex'),before.inputHashes.manifest.sha256,'the exact historical alias manifest is read from its sealed fixture');
const aliasBeforeData=JSON.parse(aliasBeforeDataBytes),aliasBeforeCatalogs=new Map();
for(const collection of ['rules','spells','equipment','matrices','classes','progressionExplainer']){
 const owners=Array.isArray(aliasBeforeData[collection])?aliasBeforeData[collection]:aliasBeforeData[collection]?[aliasBeforeData[collection]]:[];
 for(const owner of owners)for(const key of ['sourceExcerpts','scanVerification']){
  const path=owner[key]?.catalog;if(!path||aliasBeforeCatalogs.has(path))continue;
  const bytes=aliasBeforeBytes(`dist/${path}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),before.inputHashes.catalogs[path],`${path}: exact historical Git catalog preimage`);
  aliasBeforeCatalogs.set(path,JSON.parse(bytes));
 }
}
assert.equal(aliasBeforeCatalogs.size,before.denominators.referencedCatalogs,'the historical source preimage closes all1015 catalogs');
const currentHirelingRuleIds=JSON.parse(readRawFileSync(new URL('./fixtures/hirelings-source-current-cohort-v1.json',import.meta.url),'utf8')).newRuleIds;
const mmTreasureRuleIds=JSON.parse(readRawFileSync(new URL('./fixtures/mm-treasure-current-m1-cohort-v1.json',import.meta.url),'utf8')).mmSource.addedRuleIds;

test('the complete before universe detects the real unlinked Solid Fog region alias',()=>{
 const replay=buildContinuationAliasReport({data:aliasBeforeData,manifest:oldManifest,catalogs:aliasBeforeCatalogs});
 assert.deepEqual(replay.denominators,before.denominators,'exact XP catalog rollback composes with the exact Jo history stage to reproduce the complete historical universe');
 assert.equal(replay.denominators.exposedRecords,995);
 assert.equal(replay.denominators.referencedCatalogs,1015);
 assert.equal(replay.denominators.exactAliasMatches,23);
 assert.equal(replay.missingAliases.length,1);
 assert.deepEqual(replay.missingAliases,before.missingAliases);
 assert.equal(replay.missingAliases[0].aliasRegionId,'ua-69-b8b05ef9807ad0f8');
 assert.equal(replay.structuralCheck.valid,false);
});

test('the exact legacy alias keeps its source, focus and relationship and opens a declared pair',()=>{
 assert.deepEqual(manifest.groups.slice(0,oldManifest.groups.length),oldManifest.groups);
 const added=manifest.groups.find(group=>group.id===integration.addedGroup.id);
 assert.deepEqual(added,integration.addedGroup);
 const original=manifest.groups.find(group=>group.id===added.aliasOf);
 assert.deepEqual(added.relationship,original.relationship);
 const catalog=catalogs.get(added.catalog);
 const primary=catalog.regions.find(region=>region.id===original.segments[1].regionId);
 const alias=catalog.regions.find(region=>region.id===added.segments[1].regionId);
 for(const key of ['sha256','book','printedPage','pdfPage','normalizedPageRect','focusRects'])assert.deepEqual(alias[key],primary[key]);
 const addedMatrixOwners=liveData.matrices.filter(owner=>addedDmg74MatrixIds.includes(owner.id));
 assert.deepEqual(addedMatrixOwners.map(owner=>owner.id).sort(),[...addedDmg74MatrixIds].sort());
 assert.deepEqual(addedMatrixOwners.map(owner=>owner.sourceExcerpts.catalog).sort(),addedDmg74MatrixCatalogs);
 for(const owner of addedMatrixOwners){
  const catalog=read(`dist/${owner.sourceExcerpts.catalog}`);
  assert.ok(catalog,owner.id);
  assert.equal(catalog.collection,'matrices',owner.id);
  assert.equal(catalog.itemId,owner.id);
  assert.equal(catalog.regions.length,1,owner.id);
  assert.deepEqual([catalog.regions[0].book,catalog.regions[0].printedPage,catalog.regions[0].pdfPage],['DMG',74,75],owner.id);
 }
 const druid=liveData.rules.filter(owner=>owner.id==='phb-druid-mistletoe-spell-components');
 assert.equal(druid.length,1,'only the exact new Druid rule extends the current owner census');
 assert.deepEqual([druid[0].book,druid[0].pages,druid[0].sourceExcerpts.catalog],['PHB',[54],'scans/verified/rules-phb-druid-mistletoe-spell-components.json']);
 const druidCatalog=JSON.parse(readRawFileSync(new URL(`../dist/${druid[0].sourceExcerpts.catalog}`,import.meta.url),'utf8'));
 assert.deepEqual([druidCatalog.collection,druidCatalog.itemId],['rules',druid[0].id]);
 assert.deepEqual(druidCatalog.regions.map(region=>[region.id,region.book,region.printedPage,region.pdfPage]),[
  ['phb-54-druid-note-grid-ebfa1c01c47e3a9d','PHB',54,55],
  ['phb-54-druid-note-definitions-c98ac7d9d638ae45','PHB',54,55],
 ]);
 const current=loadContinuationAliasReport();
 const publishedData=JSON.parse(execFileSync('git',['show','cc9509047746d5e27a71cb5b1e0cfcb739a688c9:dist/data.json'],{maxBuffer:32*1024*1024}));
 const tableIds=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];
 const ownerRows=value=>['rules','spells','equipment','matrices','classes','progressionExplainer'].flatMap(collection=>(Array.isArray(value[collection])?value[collection]:value[collection]?[value[collection]]:[]).map(item=>({collection,itemId:item.id})));
 const nativeInputs=readMmTreasureCurrentSourceInputs(import.meta.dirname+'/..');assert.deepEqual(nativeInputs.data,liveData,'the alias census uses the complete actual current source');assertMmTreasureCurrentSourceCohort(nativeInputs);
 const appendixCIds=['appendix-c-character-subtable','appendix-c-party-size','appendix-c-character-levels','appendix-c-henchmen','appendix-c-character-guidance','appendix-c-party-magic-distribution','appendix-c-magic-table-i','appendix-c-magic-table-ii','appendix-c-magic-table-iii','appendix-c-magic-table-iv','appendix-c-magic-item-notes'];
 const publishedOwners=ownerRows(publishedData),nativeOwners=ownerRows(liveData);
 assert.equal(publishedOwners.length,1001);
 const publishedOwnerKeys=new Set(publishedOwners.map(row=>JSON.stringify(row)));
 assert.deepEqual(nativeOwners.filter(row=>publishedOwnerKeys.has(JSON.stringify(row))),publishedOwners,'all1001 published owner identities remain in exact relative order');
 assert.deepEqual(nativeOwners.filter(row=>!publishedOwnerKeys.has(JSON.stringify(row))),[...tableIds,...appendixCIds,...currentHirelingRuleIds,...mmTreasureRuleIds].map(itemId=>({collection:'rules',itemId})),'the two earlier tables, eleven prior Appendix C owners, 48 H owners and2 MM owners extend all1001 published identities');
 const catalogPaths=value=>[...new Set(['rules','spells','equipment','matrices','classes','progressionExplainer'].flatMap(collection=>(Array.isArray(value[collection])?value[collection]:value[collection]?[value[collection]]:[]).flatMap(item=>['sourceExcerpts','scanVerification'].flatMap(key=>item[key]?.catalog?[item[key].catalog]:[]))))].sort();
 const publishedPaths=catalogPaths(publishedData),nativePaths=catalogPaths(liveData);
 assert.equal(publishedPaths.length,1021);
 assert.deepEqual(nativePaths.filter(path=>publishedPaths.includes(path)),publishedPaths,'every published scoped catalog remains referenced');
 assert.deepEqual(nativePaths.filter(path=>!publishedPaths.includes(path)),[...tableIds,...appendixCIds,...currentHirelingRuleIds,...mmTreasureRuleIds].map(id=>`scans/verified/rules-${id}.json`).sort());
 for(const [index,itemId]of tableIds.entries()){
  const owner=liveData.rules.find(item=>item.id===itemId),catalog=JSON.parse(readRawFileSync(new URL(`../dist/${owner.sourceExcerpts.catalog}`,import.meta.url),'utf8'));
  assert.deepEqual([owner.book,owner.pages,owner.table.rows.length],index===0?['PHB',[38],15]:['UA',[28],24]);
  assert.deepEqual([catalog.collection,catalog.itemId,catalog.regions.length],['rules',itemId,index===0?21:31]);
 }
 assert.equal(current.denominators.exposedRecords,1064,'the native report counts all retained owners, two earlier tables, eleven prior Appendix C owners, 48 H owners, and2 MM owners');
 assert.equal(current.denominators.referencedCatalogs,1084,'the native report counts all retained catalogs plus63 native source catalogs');
 assert.equal(current.denominators.declaredGroups,284,'the current manifest has the preserved273-group prefix and repaired Hireling alias groups');
 assert.equal(current.denominators.declaredParts,560,'the current manifest has the preserved540-part prefix and repaired Hireling alias parts');
 assert.equal(current.denominators.declaredGroups,liveManifest.groups.length);
 assert.equal(current.denominators.declaredParts,liveManifest.groups.reduce((count,group)=>count+(group.segments?.length||0),0));
 assert.equal(current.denominators.exactAliasMatches,710);
 assert.equal(current.denominators.missingAliasLinks,0);
 assert.equal(current.denominators.unassessableDeclaredParts,27,'the 27 blocked or unassessable parts remain a separate source-context measure');
 assert.equal(current.missingAliases.length,0);
 assert.equal(current.structuralCheck.valid,true);
 assert.equal(current.structuralCheck.sourceSemanticsCertified,false);
});

test('an owner change cannot inherit alias coverage from the other collection',()=>{
 const changed=structuredClone(manifest);
 changed.groups.find(group=>group.id===integration.addedGroup.id).collection='rules';
 const report=buildContinuationAliasReport({data,manifest:changed,catalogs});
 assert.equal(report.invalidGroups.length,1);
 assert.equal(report.structuralCheck.valid,false);
 assert.equal(report.missingAliases.length,1);
});

// This exact whole-state replay preserves the published696 census separately
// from the two new reciprocal Tools list aliases in native current data.
test('all696 published alias objects remain exact beside two Tools aliases and twelve Hireling matches',()=>{
 const publishedCommit='6b3cfc8cb421a2c1fc2379c38abebe2075634981';
 const readPublished=p=>JSON.parse(projectPass8CitationTargetCropBytes(p,execFileSync('git',['show',`${publishedCommit}:${p}`],{maxBuffer:32*1024*1024}))),publishedData=readPublished('dist/data.json'),publishedManifest=readPublished('research/citation-continuations.json'),publishedCatalogs=new Map();
 for(const collection of ['rules','spells','equipment','matrices','classes','progressionExplainer'])for(const item of Array.isArray(publishedData[collection])?publishedData[collection]:publishedData[collection]?[publishedData[collection]]:[])for(const key of ['sourceExcerpts','scanVerification']){const path=item[key]?.catalog;if(path&&!publishedCatalogs.has(path))publishedCatalogs.set(path,readPublished('dist/'+path));}
 const published=buildContinuationAliasReport({data:publishedData,manifest:publishedManifest,catalogs:publishedCatalogs}),current=loadContinuationAliasReport();
 assert.equal(published.denominators.exactAliasMatches,696);assert.equal(current.denominators.exactAliasMatches,710);
 const old=new Set(published.matches.map(row=>JSON.stringify(row))),newRows=current.matches.filter(row=>!old.has(JSON.stringify(row)));
 assert.deepEqual(current.matches.filter(row=>old.has(JSON.stringify(row))),published.matches,'all696 whole old alias objects and order remain exact');
 const shared={collection:'equipment',itemId:'phb-thieves-tools',catalog:'scans/verified/equipment-phb-thieves-tools.json',role:'continuation',sourceSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',imageSha256:'90b02a4c3e47a923fbc5efe15895d55c8f286d73684b3339ce6905d6e7802690',sourceCropBounds:[0.52,0.04,0.46,0.055],focusSha256:'c88f7947c373297102cef0b0cc331111b64417eb4f10b932f102d43af57a2244',status:'alias-participates-in-declared-group'};
 const hirelingRows=newRows.filter(row=>row.groupId.startsWith('dmg-hireling-'));assert.equal(hirelingRows.length,12,'the repaired Hireling groups contribute twelve exact alias matches');
 assert.deepEqual(newRows.filter(row=>!row.groupId.startsWith('dmg-hireling-')),[{groupId:'batch5-cont-dmg-p225-phb-thieves-tools',...shared,segmentRegionId:'dmg-225-90b02a4c3e47a923',aliasRegionId:'pass8-dmg225-thieves-tools-exclusion-list-item'},{groupId:'pass8-dmg225-thieves-tools-exclusion-context',...shared,segmentRegionId:'pass8-dmg225-thieves-tools-exclusion-list-item',aliasRegionId:'dmg-225-90b02a4c3e47a923'}]);
 assert.equal(current.denominators.missingAliasLinks,0);
 assert.equal(current.denominators.unassessableDeclaredParts,27,'the 27 blocked or unassessable parts remain a separate source-context measure');assert.equal(current.structuralCheck.sourceSemanticsCertified,false);
});
