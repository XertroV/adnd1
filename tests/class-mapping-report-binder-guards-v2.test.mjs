import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {readQualifierOptions,validateCurrentConsumerSealDocument,REPORT_CODE_PATHS,REPORT_OUTPUTS,REPORT_DATA_PATHS,REPORT_DATA_POINTER_EDGES,HISTORICAL_RAW_GIT_READS,NATIVE_INSTALLED_CODE_PATHS,PYTHON_DYNAMIC_LOCAL_EDGES,ASSEMBLY_DYNAMIC_LOCAL_EDGES,FIXED_DYNAMIC_IMPORT_GROUPS,REPORT_RECEIPT_PATH,POST_QCC_AUXILIARY_PATHS,CURRENT_CONSUMER_PINS_PATH,CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,CURRENT_CONSUMER_FINAL_SEAL_PATH,CURRENT_CONSUMER_CODE_STAGE_STATUS,CURRENT_CONSUMER_FINAL_STAGE_STATUS,SOURCE_BODY_COMMIT,SOURCE_BODY_TREE,SOURCE_BODY_FIXTURE_SHA256,SOURCE_SCAN_LEGACY_ALIAS,SOURCE_SCAN_FRESH_OUTPUT_PATH,CURRENT_REPORT_LEGACY_ALIASES,REPORT_OPTIONAL_DATA_PATHS} from '../tools/class-mapping-report-input-contract-v2.mjs';
import {controlledGitEnvironment,verifyRawCommit} from '../tools/class-mapping-raw-git-v1.mjs';

const valid='0123456789abcdef0123456789abcdef01234567';

test('options guard accepts only plain own JSON data and reads the data descriptor',()=>{
  assert.equal(readQualifierOptions({qualifierCodeCommit:valid}),valid);
  assert.equal(readQualifierOptions(Object.freeze({qualifierCodeCommit:valid})),valid);
  let getterRuns=0;
  const accessor={};
  Object.defineProperty(accessor,'qualifierCodeCommit',{enumerable:true,get(){getterRuns++;return valid;}});
  assert.throws(()=>readQualifierOptions(accessor),/own data property/);
  assert.equal(getterRuns,0,'guard must reject an accessor without invoking it');
});

test('options guard rejects proxies before proxy traps, inherited values, symbols and extra keys',()=>{
  let traps=0;
  const proxy=new Proxy({qualifierCodeCommit:valid},{getPrototypeOf(){traps++;return Object.prototype;},ownKeys(){traps++;return ['qualifierCodeCommit'];},getOwnPropertyDescriptor(){traps++;return {value:valid,enumerable:true,configurable:true};}});
  assert.equal(types.isProxy(proxy),true);
  assert.throws(()=>readQualifierOptions(proxy),/non-proxy/);
  assert.equal(traps,0,'no caller proxy trap may run');
  assert.throws(()=>readQualifierOptions(Object.assign(Object.create({qualifierCodeCommit:valid}),{})),/plain JSON object/);
  assert.throws(()=>readQualifierOptions({qualifierCodeCommit:valid,extra:true}),/exactly one/);
  assert.throws(()=>readQualifierOptions({qualifierCodeCommit:valid,[Symbol('hidden')]:true}),/exactly one/);
  assert.throws(()=>readQualifierOptions([]),/plain JSON object/);
  assert.throws(()=>readQualifierOptions(new Date()),/plain JSON object/);
  assert.throws(()=>readQualifierOptions(null),/plain non-proxy object/);
});

test('options guard rejects malformed commits before native qualification',()=>{
  for(const value of ['',null,42,'A'.repeat(40),'a'.repeat(39),'g'.repeat(40)]) {
    assert.throws(()=>readQualifierOptions({qualifierCodeCommit:value}),/full 40-character lowercase commit/);
  }
  const hidden={};
  Object.defineProperty(hidden,'qualifierCodeCommit',{value:valid,enumerable:false});
  assert.throws(()=>readQualifierOptions(hidden),/enumerable own data property/);
});

test('controlled Git environment drops inherited view selectors and disables replacement reads',()=>{
  const env=controlledGitEnvironment();
  assert.deepEqual(Object.keys(env).sort(),['GIT_CONFIG_GLOBAL','GIT_CONFIG_NOSYSTEM','GIT_CONFIG_SYSTEM','GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_OPTIONAL_LOCKS','GIT_TERMINAL_PROMPT','LANG','LC_ALL','PATH'].sort());
  for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES','GIT_INDEX_FILE','GIT_REPLACE_REF_BASE','GIT_CONFIG_PARAMETERS','GIT_SHALLOW_FILE']) assert.equal(Object.hasOwn(env,key),false,key);
  assert.equal(env.GIT_NO_REPLACE_OBJECTS,'1');
  assert.equal(env.GIT_OPTIONAL_LOCKS,'0');
});

test('raw commit verifier accepts only its raw single-parent tree/object identity',()=>{
  const tree='1111111111111111111111111111111111111111',parent='2222222222222222222222222222222222222222';
  const bytes=Buffer.from(`tree ${tree}\nparent ${parent}\nauthor A <a@b> 0 +0000\ncommitter A <a@b> 0 +0000\n\nmessage\n`);
  const oid=createHash('sha1').update(`commit ${bytes.length}\0`).update(bytes).digest('hex');
  assert.doesNotThrow(()=>verifyRawCommit(bytes,oid,tree,parent));
  assert.throws(()=>verifyRawCommit(bytes,oid,tree,'3333333333333333333333333333333333333333'),/raw single direct parent/);
  assert.throws(()=>verifyRawCommit(bytes,valid,tree,parent),/raw commit object hash/);
});

test('QCC code closure includes native helper, adapter kernels/runtime and declared Python imports',()=>{
  const code=new Set(REPORT_CODE_PATHS);
  for(const p of NATIVE_INSTALLED_CODE_PATHS) assert.equal(code.has(p),true,`native installed code omitted: ${p}`);
  for(const p of ['tools/class-mapping-raw-git-v1.mjs','tools/class-mapping-current-monetary-question-kernel-v1.mjs','tools/class-mapping-current-consumer-runtime-v1.mjs','tools/class-mapping-current-consumer-seal-verifier-v1.mjs','tools/class-mapping-current-head-commit-v1.mjs','tools/monetary-row-identity-audit.mjs','tools/monetary-context-extent-contract.mjs','tools/monetary-source-render-frames.mjs','tools/class-mapping-report-producers-v2.mjs','tools/refresh-gaps-handoff-next-native-v2-callshape-v1.mjs','tools/source-report-consistency-audit-next-native-v2.mjs','tools/monetary-unit-provenance-audit-next-native-v2.mjs','tools/source-raster-coverage-next-native-v2.mjs','tools/source-visual-coverage-next-native-v2.mjs','tools/source-frame-coordinate-bridge-next-native-v2.mjs','tools/source-table-citation-coverage.mjs','tools/source-discovery-group-reconciliation.mjs','tools/assemble-class-mapping-v1.mjs','tools/class-mapping-assembly-core-v1.mjs']) assert.equal(code.has(p),true,`transitive producer path omitted: ${p}`);
  for(const p of [CURRENT_CONSUMER_PINS_PATH,CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,CURRENT_CONSUMER_FINAL_SEAL_PATH])assert.equal(POST_QCC_AUXILIARY_PATHS.includes(p),true,`post-QCC typed metadata omitted: ${p}`);
  for(const edge of PYTHON_DYNAMIC_LOCAL_EDGES) { assert.equal(code.has(edge.from),true); assert.equal(code.has(edge.to),true); }
  for(const edge of ASSEMBLY_DYNAMIC_LOCAL_EDGES) { assert.equal(code.has(edge.from),true); assert.equal(code.has(edge.to),true); }
  for(const edge of FIXED_DYNAMIC_IMPORT_GROUPS) {assert.equal(code.has(edge.from),true);for(const p of edge.paths)assert.equal(code.has(p),true,`fixed dynamic import target omitted: ${p}`);}
  const outputs=new Set(REPORT_OUTPUTS.map(row=>row.path));
  assert.equal(outputs.has(REPORT_RECEIPT_PATH),false);
  assert.equal(outputs.size,REPORT_OUTPUTS.length,'output names must be unique');
  assert.equal(REPORT_OUTPUTS.length,26);
  assert.equal(REPORT_OUTPUTS.filter(row=>row.stage==='post-QCC-metadata').length,25);
  assert.equal(REPORT_OUTPUTS.filter(row=>row.producerClass==='core-native-report').length,21);
  assert.equal(REPORT_OUTPUTS.filter(row=>row.producerClass==='current-adapter-report').length,4);
  assert.ok(REPORT_OUTPUTS.some(row=>row.path==='research/class-mapping-source-epoch-v1/reports/next-native-v2/current/source-table-citation-coverage.json'));
  for(const p of ['research/source-table-citation-contracts.json','research/source-audit-batch5-ua-additional-prices.json','research/source-audit-batch5-phb-dmg-additional-prices.json','research/price-source-inventory-phb-dmg-other.json','research/price-source-inventory-ua-other.json','research/class-mapping-source-epoch-v1/next-native-source-frame-metadata-rebase-v2.json'])assert.ok(REPORT_DATA_PATHS.includes(p),`required current report input omitted: ${p}`);
  assert.equal(REPORT_DATA_PATHS.length,new Set(REPORT_DATA_PATHS).size,'required report data paths must be unique');
  for(const edge of REPORT_DATA_POINTER_EDGES){assert.ok(REPORT_DATA_PATHS.includes(edge.sourcePath));assert.ok(REPORT_DATA_PATHS.includes(edge.targetPath));}
  assert.deepEqual(HISTORICAL_RAW_GIT_READS.map(row=>[row.commit,row.path]),[
    ['679b15d1c580172e54314829c1c3c86dc78b65f3','dist/data.json'],
    ['679b15d1c580172e54314829c1c3c86dc78b65f3','research/gaps-limitations-next-task.json'],
    ['679b15d1c580172e54314829c1c3c86dc78b65f3','research/price-source-inventory.json'],
  ]);
  assert.deepEqual(REPORT_OUTPUTS.filter(row=>row.stage==='post-QCC-metadata-prerequisite').map(row=>row.path),['research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json']);
  for(const row of REPORT_OUTPUTS) {
    if(row.stage==='post-QCC-metadata-prerequisite') assert.equal(row.path,'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json');
    else if(row.path===SOURCE_SCAN_FRESH_OUTPUT_PATH)assert.equal(row.path,'research/class-mapping-source-epoch-v1/reports/current/source-scan-inventory-class-mapping-current-v1.json');
    else assert.equal(row.path.includes('/reports/next-native-v2/'),true,`nonfresh report target ${row.path}`);
  }
  assert.deepEqual(SOURCE_SCAN_LEGACY_ALIAS,{logicalPath:'tests/fixtures/source-scan-inventory.json',physicalPath:SOURCE_SCAN_FRESH_OUTPUT_PATH});
  assert.equal(CURRENT_REPORT_LEGACY_ALIASES.length,2);
  assert.equal(CURRENT_REPORT_LEGACY_ALIASES[0].logicalPath,'research/gaps-limitations-next-task.json');
  assert.equal(CURRENT_REPORT_LEGACY_ALIASES[0].physicalPath,'research/class-mapping-source-epoch-v1/reports/next-native-v2/current/gaps-handoff.json');
  assert.equal(CURRENT_REPORT_LEGACY_ALIASES[1].physicalPath,SOURCE_SCAN_FRESH_OUTPUT_PATH);
  assert.equal(REPORT_OPTIONAL_DATA_PATHS.includes('research/citation-continuations.json'),true);
});

test('fixed two-stage consumer seal schemas accept only exact S1/QCC pins',()=>{
  const code={schemaVersion:1,artifactType:'S2 next-native current-consumer code-stage seal',status:CURRENT_CONSUMER_CODE_STAGE_STATUS,
    sourceEpoch:{sourceCommit:SOURCE_BODY_COMMIT,sourceTree:SOURCE_BODY_TREE,fixture:{path:'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',sha256:SOURCE_BODY_FIXTURE_SHA256}},
    qualifierCode:{commit:'a'.repeat(40),tree:'b'.repeat(40),parent:SOURCE_BODY_COMMIT},
    currentConsumerPinModule:{path:CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,sha256:'c'.repeat(64)},
    transitionReceipt:{path:'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json',sha256:null}};
  assert.equal(validateCurrentConsumerSealDocument(code,'code-stage').status,CURRENT_CONSUMER_CODE_STAGE_STATUS);
  const final={schemaVersion:1,artifactType:'S2 next-native current-consumer materialized-stage seal',status:CURRENT_CONSUMER_FINAL_STAGE_STATUS,
    sourceEpoch:code.sourceEpoch,qualifierCode:code.qualifierCode,
    currentConsumerPinModule:{path:CURRENT_CONSUMER_PINS_PATH,sha256:'d'.repeat(64)},
    codeStagePinModule:{path:CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,sha256:code.currentConsumerPinModule.sha256},
    codeStageSeal:{path:CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,sha256:'e'.repeat(64)},
    transitionReceipt:{path:'research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json',sha256:'f'.repeat(64)}};
  assert.equal(validateCurrentConsumerSealDocument(final,'materialized-stage').status,CURRENT_CONSUMER_FINAL_STAGE_STATUS);
  assert.throws(()=>validateCurrentConsumerSealDocument({...final,unreviewed:true},'materialized-stage'),/non-exact field set/);
  let getterRuns=0;const hostile={...final};Object.defineProperty(hostile,'status',{enumerable:true,get(){getterRuns++;return CURRENT_CONSUMER_FINAL_STAGE_STATUS;}});
  assert.throws(()=>validateCurrentConsumerSealDocument(hostile,'materialized-stage'),/own JSON data/);assert.equal(getterRuns,0);
  let traps=0;const proxy=new Proxy(final,{ownKeys(){traps++;return Reflect.ownKeys(final);}});
  assert.throws(()=>validateCurrentConsumerSealDocument(proxy,'materialized-stage'),/non-proxy/);assert.equal(traps,0);
});
