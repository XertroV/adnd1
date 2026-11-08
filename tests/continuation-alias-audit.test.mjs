import {readBeforeJoFile as readFileSync} from './helpers/batch6-jo-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readRawFileSync} from 'node:fs';

import {gunzipSync} from 'node:zlib';
import {buildContinuationAliasReport,loadContinuationAliasReport} from '../tools/continuation-alias-audit.mjs';
import {xpBeforeCatalogsForAliasReplay} from './helpers/batch6-xp-source-history.mjs';
const read=p=>JSON.parse(readFileSync(p));
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
const oldManifest=JSON.parse(gunzipSync(readFileSync(integration.beforeManifestFixture)));

test('the complete before universe detects the real unlinked Solid Fog region alias',()=>{
 const replay=buildContinuationAliasReport({data,manifest:oldManifest,catalogs:xpBeforeCatalogsForAliasReplay(catalogs)});
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
 const current=loadContinuationAliasReport();
 assert.equal(current.denominators.exposedRecords,997+addedDmg74MatrixIds.length,'the current source universe retains the prior published turning-table/Jo records plus exactly three DMG matrix owners');
 assert.equal(current.denominators.referencedCatalogs,1017+addedDmg74MatrixCatalogs.length,'each of the three named DMG matrix owners contributes its scoped catalog');
 assert.equal(current.denominators.declaredGroups,liveManifest.groups.length);
 assert.equal(current.denominators.declaredParts,liveManifest.groups.reduce((count,group)=>count+(group.segments?.length||0),0));
 assert.equal(current.denominators.exactAliasMatches,696);
 assert.equal(current.denominators.missingAliasLinks,0);
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
