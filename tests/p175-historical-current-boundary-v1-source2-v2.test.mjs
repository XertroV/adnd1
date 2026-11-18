// Additive Source2 family successor; original case and historical-role assertions are preserved.
// Current Source2 admission remains a separate genuine zero-argument identity case.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import * as current from '../tools/dmg175-availability-projection.mjs';
import {loadHistoricalHAvailabilityInputs} from "./helpers/class-mapping-historical-test-inputs-source2-v2.mjs";
import {loadHistoricalP175AvailabilityModule} from "../research/class-mapping-history-v1/p175-historical-module-source2-v2.mjs";
import {P175_HISTORICAL_MODULE as pin} from "../research/class-mapping-history-v1/p175-historical-module-contract-source2-v2.mjs";

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('historical p175 module preserves a separately qualified current source and rejects caller overrides',async()=>{
  let hooks=0;const bad=Object.defineProperty({},'root',{get(){hooks++;throw Error('caller root hook');}});
  await assert.rejects(loadHistoricalP175AvailabilityModule(bad),/no caller overrides/);assert.equal(hooks,0);
  const loaded=await loadHistoricalP175AvailabilityModule();
  assert.equal(loaded.proof.currentSourceCommit,pin.currentSourceCommit);
  assert.equal(sha(loaded.moduleBytes),pin.sha256);
  assert.notEqual(sha(readFileSync(resolve(pin.path))),pin.sha256,'physical current projector is not replaced by the H test view');
  loaded.moduleBytes[0]^=1;
  assert.equal(sha((await loadHistoricalP175AvailabilityModule()).moduleBytes),pin.sha256,'caller mutation cannot poison cached historical bytes');
});
test('current S1 projector rejects actual H catalog bytes while the historical module retains its original result',async()=>{
  const loaded=await loadHistoricalP175AvailabilityModule();
  const inputs=loadHistoricalHAvailabilityInputs(Object.values(loaded.production.DMG175_OWNER_CATALOGS));
  const baselineData=JSON.parse(execFileSync('/usr/bin/git',['show','386b08a4678ee033d6daabc0ffa2cc17265a7c1f:dist/data.json'],{maxBuffer:128*1024*1024}));
  const targetPlan=JSON.parse(readFileSync(resolve('research/dmg175-current-content-projection-v1/inputs/target-plan-manifest-v2.json')));
  const derive=module=>module.deriveDmg175Availability({data:inputs.data,baselineData,handoff:inputs.handoff,targetPlan,loadCatalog:relative=>{
    const key=relative.startsWith('dist/')?relative.slice(5):relative;
    const template=inputs.catalogs.get(key);assert.ok(template,'exact closed H catalog path');return structuredClone(template);
  }});
  const historical=derive(loaded.production);
  assert.equal(historical.availability.distinctSupplementalCropImages,8);
  assert.equal(historical.availability.distinctP175RegionIds,34);
  assert.equal(historical.content.pendingFieldTargets,120);
  assert.equal(historical.content.mechanicsGradesPromoted,false);
  assert.throws(()=>derive(current),/catalog content changed/,'current projector never accepts the older H party-magic catalog as current evidence');
});


// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
