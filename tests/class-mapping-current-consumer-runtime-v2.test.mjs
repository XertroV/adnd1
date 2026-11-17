import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const repoRoot=process.env.NATIVE2_SOURCE_REPO_ROOT||resolve(import.meta.dirname,'..');
const gate=await import(pathToFileURL(resolve(repoRoot,'tools/class-mapping-current-source-gate-v2.mjs')).href);
const contract=await import(pathToFileURL(resolve(repoRoot,'tools/class-mapping-native-contract-v2.mjs')).href);
const fixtureBytes=readFileSync(resolve(repoRoot,'research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json'));
const fixture=JSON.parse(fixtureBytes.toString('utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expectedSummary={stage:fixture.sourceEpoch.stage,sourceCommit:fixture.sourceEpoch.sourceCommit,sourceTree:fixture.sourceEpoch.sourceTree,fixture:{path:'research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json',sha256:sha(fixtureBytes)},...fixture.expected};

test('Native2 consumer runtime exposes the accepted Source2 identity and all 3063 body inputs',()=>{
 const epoch=gate.assertClassMappingCurrentSourceEpoch();
 assert.deepEqual(epoch.summary,expectedSummary);
 assert.equal(epoch.summary.stage,'source2-body-native');
 assert.equal(epoch.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(epoch.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
 assert.equal(epoch.summary.fixture.path,'research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json');
 assert.equal(epoch.summary.fixture.sha256,sha(fixtureBytes));
 assert.deepEqual(epoch.inputs&&Object.keys(epoch.inputs).sort(),['data','inventory','manual','mechanics']);
 assert.equal(Object.keys(epoch.inputHashes.sourceBody).length,3063);
 assert.deepEqual(Object.entries(epoch.inputHashes.sourceBody).sort(([a],[b])=>a.localeCompare(b)),
  fixture.sourceInputs.map(row=>[row.path,row.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 assert.equal(epoch.summary.mechanics.totalFields,14241);
 assert.equal(epoch.summary.mechanics.uncheckedFields,939);
 assert.equal(epoch.summary.mechanics.inputMatchesCurrentData,true);
});

test('identity and snapshot APIs preserve zero-argument and exactly-one-snapshot contracts',()=>{
 const epoch=gate.assertClassMappingCurrentSourceEpoch();
 const identity=gate.assertClassMappingCurrentSourceIdentity();
 assert.deepEqual(identity,{summary:epoch.summary,inputHashes:epoch.inputHashes});
 assert.deepEqual(gate.assertClassMappingCurrentSnapshot(epoch.inputs),epoch.summary);
 assert.throws(()=>gate.assertClassMappingCurrentSourceEpoch('/tmp/other-repository'),/no caller overrides/);
 assert.throws(()=>gate.assertClassMappingCurrentSourceEpoch({expectedCounts:{owners:1}}),/no caller overrides/);
 assert.throws(()=>gate.assertClassMappingCurrentSourceIdentity({sourceCommit:'caller'}),/no caller overrides/);
 assert.throws(()=>gate.assertClassMappingCurrentSourceIdentity(undefined),/no caller overrides/);
 assert.throws(()=>gate.assertClassMappingCurrentSnapshot(),/exactly one snapshot/);
 assert.throws(()=>gate.assertClassMappingCurrentSnapshot(epoch.inputs,null),/exactly one snapshot/);
 const extra={...epoch.inputs,expectedCounts:{owners:1}};
 assert.throws(()=>gate.assertClassMappingCurrentSnapshot(extra),/snapshot|exact/i);
});

test('new Source2 body preserves old open mechanics and zero grade promotion',()=>{
 assert.deepEqual(fixture.expected.ownersByCollection,{rules:219,spells:638,equipment:192,classes:16,matrices:4,progressionExplainer:1});
 assert.equal(fixture.expected.owners,1070);
 assert.equal(fixture.expected.canonicalBindings,5851);
 assert.equal(fixture.expected.manualBindings,1391);
 assert.equal(fixture.expected.canonicalReviewStatuses['field-target-reviewed'],773);
 assert.equal(fixture.expected.mechanics.totalFields,14241);
 assert.equal(fixture.expected.mechanics.uncheckedFields,939);
 assert.equal(fixture.expected.mechanics.inputMatchesCurrentData,true);
 assert.deepEqual(contract.ZERO_GRADES,{fieldTargets:0,sourceValues:0,context:0,defaults:0,numeric:0,mechanics:0});
 assert.equal(fixture.gradePromotions?.fieldTargets??0,0);
 assert.equal(fixture.gradePromotions?.sourceValues??0,0);
 assert.equal(fixture.gradePromotions?.context??0,0);
 assert.equal(fixture.gradePromotions?.defaults??0,0);
 assert.equal(fixture.gradePromotions?.numeric??0,0);
 assert.equal(fixture.gradePromotions?.mechanics??0,0);
});

test('snapshot rejects accessors, proxies and symbols before evaluating caller code',()=>{
 const epoch=gate.assertClassMappingCurrentSourceEpoch();
 let getterCalls=0,proxyCalls=0;
 const accessor={...epoch.inputs};
 Object.defineProperty(accessor,'data',{enumerable:true,configurable:true,get(){getterCalls++;return epoch.inputs.data;}});
 assert.throws(()=>gate.assertClassMappingCurrentSnapshot(accessor),/accessor|plain|snapshot/i);
 const proxied=new Proxy(epoch.inputs,{get(){proxyCalls++;throw Error('unexpected getter');},ownKeys(){proxyCalls++;throw Error('unexpected ownKeys');},getOwnPropertyDescriptor(){proxyCalls++;throw Error('unexpected descriptor');}});
 assert.throws(()=>gate.assertClassMappingCurrentSnapshot(proxied),/proxy/i);
 const symbol={...epoch.inputs};symbol[Symbol('unadmitted')]=true;
 assert.throws(()=>gate.assertClassMappingCurrentSnapshot(symbol),/symbol|snapshot|key/i);
 assert.equal(getterCalls,0);
 assert.equal(proxyCalls,0);
});

test('detached snapshots cannot change current proof and later warm calls recheck identity',()=>{
 const cold=gate.assertClassMappingCurrentSourceEpoch();
 const detached=structuredClone(cold.inputs);
 detached.data.release.date='detached-native2-mutation';
 assert.throws(()=>gate.assertClassMappingCurrentSnapshot(detached),/snapshot|exact|current/i);
 const warm=gate.assertClassMappingCurrentSourceEpoch();
 assert.deepEqual(warm.summary,expectedSummary);
 assert.deepEqual(gate.assertClassMappingCurrentSnapshot(warm.inputs),expectedSummary);
 const detachedIdentity=gate.assertClassMappingCurrentSourceIdentity();
 detachedIdentity.summary.owners=-1;
 assert.deepEqual(gate.assertClassMappingCurrentSourceIdentity(),{summary:expectedSummary,inputHashes:cold.inputHashes});
});

