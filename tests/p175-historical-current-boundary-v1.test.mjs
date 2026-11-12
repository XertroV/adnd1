import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import * as current from '../tools/dmg175-availability-projection.mjs';
import {loadHistoricalHAvailabilityInputs} from './helpers/class-mapping-historical-test-inputs-v1.mjs';
import {loadHistoricalP175AvailabilityModule} from '../research/class-mapping-history-v1/p175-historical-module-v1.mjs';
import {P175_HISTORICAL_MODULE as pin} from '../research/class-mapping-history-v1/p175-historical-module-contract-v1.mjs';

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
