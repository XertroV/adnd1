// Historical MM replay: preserved a29 assertions run against the fixed historical stage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,symlinkSync,writeFileSync,rmSync,historicalMmTestRoot,assertHistoricalMmTestStage} from '../research/class-mapping-history-v1/mm-replay-fs-source2-v3.mjs';
import {spawnSync} from '../research/class-mapping-history-v1/mm-replay-child-process-historical-v2-source2-v1.mjs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadCurrentMonetarySourceQuestions} from '../research/class-mapping-history-v1/replay-tools/dmg175-current-monetary-source-questions-mm-source2-v3.mjs';
import {runOrdinal10PairedControlsSource2} from './helpers/phb-monetary-old-loader-paired-controls-source2-v1.mjs';
assertHistoricalMmTestStage();
const root=pathToFileURL(historicalMmTestRoot+'/'),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=JSON.parse(gunzipSync(read('tests/fixtures/pass8-phb-stale-monetary-input-before.json.gz')));
test('actual old monetary loader rejects PHB input drift; current-MM successor retains historical8/7/1 dispositions and records current scope questions',()=>{
  assert.equal(fixture.exitCode,1);assert.match(fixture.output,/stale input research\/price-source-inventory.json/);
  assert.equal(sha(fixture.loaderBefore.utf8),fixture.loaderBefore.sha256);assert.equal(sha(fixture.registryBefore.utf8),fixture.registryBefore.sha256);
  const temp=mkdtempSync(join(tmpdir(),'phb-monetary-before-'));
  try{
    for(const name of readdirSync(root))if(name!=='tools')symlinkSync(new URL(name,root),join(temp,name));
    mkdirSync(join(temp,'tools'));
    for(const name of readdirSync(new URL('tools/',root)))if(name!=='monetary-current-source-questions.mjs')symlinkSync(new URL(`tools/${name}`,root),join(temp,'tools',name));
    writeFileSync(join(temp,'tools/monetary-current-source-questions.mjs'),fixture.loaderBefore.utf8);
    const child=spawnSync(process.execPath,['tools/monetary-current-source-questions.mjs','--check'],{cwd:temp,encoding:'utf8'});
    assert.equal(child.status,1);assert.match(child.stderr,/stale input research\/price-source-inventory.json/);
  }finally{rmSync(temp,{recursive:true,force:true});}
  const before=JSON.parse(fixture.registryBefore.utf8),after=JSON.parse(read('research/source-audit-pass8-phb-current-monetary-source-questions-v1.json'));
  const normalized=structuredClone(after);delete normalized.inputMigration;
  for(const key of ['canonical','monetaryIndex'])normalized.currentInputs[key]=before.currentInputs[key];
  assert.deepEqual(normalized,before,'all question/disposition/source evidence remains exact');
  assert.deepEqual(read(fixture.registryBefore.path),Buffer.from(fixture.registryBefore.utf8),'original registry bytes remain frozen');
  const report=loadCurrentMonetarySourceQuestions();
  assert.deepEqual(report.counts,{historicalRegisteredQuestions:8,currentUnresolvedQuestions:7,derivedAdjudications:1});
  assert.deepEqual(report.questionCounts,{currentInterpretationQuestions:7,independentSourceScopeQuestions:2,distinctScopeRows:9,currentUnresolvedQuestions:9});
  assert.equal(report.currentInputs.nativeSourceEpoch.sourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(report.semanticPass,false);assert.equal(report.generalSourceReviewPending,true);
  assert.deepEqual(report.records.map(r=>r.id),before.dispositions.map(r=>r.id));
  for(const row of report.records){assert.equal(row.semanticPass,false);if(row.derivedValue){assert.equal(row.printedValuePass,false);assert.equal(row.derivedValue.isSourcePrinted,false);}}
});
test('same exact old monetary loader accepts pinned healthy inputs and rejects only canonical-input drift',()=>{
  const control=runOrdinal10PairedControlsSource2();
  assert.deepEqual(control,{healthyStatus:0,staleStatus:1,loaderSha256:'3e81d85e3ae0f6989ecca05655af780ecc8d2a4347f3e0cdfdd7a328ffe17a5c',mutatedPath:'research/price-source-inventory.json'});
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
