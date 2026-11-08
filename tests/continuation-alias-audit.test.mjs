import {readBeforeJoFile as readFileSync} from './helpers/batch6-jo-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {gunzipSync} from 'node:zlib';
import {buildContinuationAliasReport,loadContinuationAliasReport} from '../tools/continuation-alias-audit.mjs';
const read=p=>JSON.parse(readFileSync(p));
const before=read('research/source-audit-batch5-continuation-alias-before.json');
const integration=read('research/source-audit-batch5-continuation-alias-integration.json');
const manifest=read('research/citation-continuations.json');
const data=read('dist/data.json');
const catalogs=new Map();
for(const collection of ['rules','spells','equipment','matrices','classes','progressionExplainer']){
 const values=Array.isArray(data[collection])?data[collection]:data[collection]?[data[collection]]:[];
 for(const item of values)for(const key of ['sourceExcerpts','scanVerification']){const path=item[key]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,read('dist/'+path));}
}
const oldManifest=JSON.parse(gunzipSync(readFileSync(integration.beforeManifestFixture)));

test('the complete before universe detects the real unlinked Solid Fog region alias',()=>{
 const replay=buildContinuationAliasReport({data,manifest:oldManifest,catalogs});
 assert.deepEqual(replay.denominators,before.denominators);
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
 const current=loadContinuationAliasReport();
 assert.equal(current.missingAliases.length,0);
 assert.equal(current.structuralCheck.valid,true);
 assert.equal(current.structuralCheck.sourceSemanticsCertified,false);
});

test('an owner change cannot inherit alias coverage from the other collection',()=>{
 const changed=structuredClone(manifest);
 changed.groups.at(-1).collection='rules';
 const report=buildContinuationAliasReport({data,manifest:changed,catalogs});
 assert.equal(report.invalidGroups.length,1);
 assert.equal(report.structuralCheck.valid,false);
 assert.equal(report.missingAliases.length,1);
});
