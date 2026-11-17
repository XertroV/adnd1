import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {
 REPORT_CODE_PATHS,REPORT_DATA_PATHS,REPORT_OPTIONAL_DATA_PATHS,HISTORICAL_REPORT_DATA_PATHS,HISTORICAL_PIN_MODULE_CODE_PATHS,HISTORICAL_PIN_MODULE_EXPECTED_SHA256,PYTHON_DYNAMIC_LOCAL_EDGES,
 REPORT_BINDING_REVIEW_PATHS,REPORT_ALL_REQUIRED_DATA_PATHS,REPORT_DATA_POINTER_EDGES,
 REPORT_OUTPUTS,SOURCE_SCAN_FRESH_OUTPUT_PATH,SOURCE_SCAN_LEGACY_ALIAS,CURRENT_REPORT_LEGACY_ALIASES,
 CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,CURRENT_CONSUMER_FINAL_SEAL_PATH,CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,CURRENT_CONSUMER_PINS_PATH,
} from '../tools/class-mapping-report-input-contract-v3.mjs';

const proposalRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const producerPath=path.join(proposalRoot,'tools/class-mapping-report-producers-v3.mjs');
const verifierPath=path.join(proposalRoot,'tools/verify-class-mapping-current-reports-v3.mjs');
const ciPath=path.join(proposalRoot,'tools/source-raster-visual-coverage-ci-v2.mjs');
const readCandidate=relative=>readFileSync(path.join(proposalRoot,relative),'utf8');

test('producer is a fixed private materialization command with an exact source directory and interpreter',()=>{
 const source=readCandidate('tools/class-mapping-report-producers-v3.mjs');
 assert.match(source,/args\.length!==4/);
 assert.match(source,/args\[0\]!=='--source-dir'/);
 assert.match(source,/args\[2\]!=='--python-executable'/);
 assert.match(source,/source directory must be a physical non-symlink directory/);
 assert.match(source,/absolute-private-source-pdf-directory/);
 const geometryPreflight=source.indexOf('ensurePhysicalOutputDirectory(geometryDir)');
 const rasterPreflight=source.indexOf('ensurePhysicalOutputDirectory(rasterDir)');
 const continuationPreflight=source.indexOf('ensurePhysicalOutputDirectory(continuationDir)');
 const firstPython=source.indexOf('runPython(\'research/source-visual-audit-next-native-v3.py\'');
 assert.ok(geometryPreflight>=0&&rasterPreflight>geometryPreflight&&continuationPreflight>rasterPreflight&&firstPython>continuationPreflight,'all Python destinations are physical before the first subprocess');
 assert.match(source,/validateReportPythonExecutable\(args\[3\]\)/);
 assert.doesNotMatch(source,/process\.env\.(?:SOURCE_PDF|PDF_DIR)/);
 assert.doesNotMatch(source,/research\/sources\/.*\.pdf/);
});

test('producer verifies both consumer seal stages before loading adapters or emitting output',()=>{
 const source=readCandidate('tools/class-mapping-report-producers-v3.mjs');
 const code=source.indexOf('verifyCurrentConsumerCodeStageSeal()');
 const final=source.indexOf('verifyCurrentConsumerMaterializedStageSeal()');
 const runtime=source.indexOf("import('./class-mapping-current-consumer-runtime-v2.mjs')");
 const firstAdapter=source.indexOf("import('./source-visual-coverage-next-native-v3.mjs')");
 const outputWrite=source.indexOf('writeExclusive(relative,bytes)');
 assert.ok(code>=0&&final>code&&runtime>final&&firstAdapter>runtime&&outputWrite>=0);
 assert.match(source,/rawGit\.assertView\(\)/);
 assert.match(source,/semanticPass:false,sourceCompletenessCertified:false,visualReviewPromoted:false/);
 assert.match(source,/writeFileSync\(target,bytes,\{flag:'wx'\}\)/);
});

test('report output roster has 25 fresh v3 artifacts and one separate prerequisite receipt',()=>{
 assert.equal(REPORT_OUTPUTS.length,26);
 assert.equal(REPORT_OUTPUTS.filter(row=>row.stage!=='post-QCC-metadata-prerequisite').length,25);
 assert.equal(REPORT_OUTPUTS.filter(row=>row.stage==='post-QCC-metadata-prerequisite').length,1);
 const paths=REPORT_OUTPUTS.map(row=>row.path);
 assert.equal(new Set(paths).size,26);
 assert.ok(paths.filter(p=>p.startsWith('research/class-mapping-source-epoch-v2/reports/next-native-v3/')).length>=24);
 assert.equal(paths.filter(p=>p===SOURCE_SCAN_FRESH_OUTPUT_PATH).length,1);
 assert.equal(REPORT_OUTPUTS.find(row=>row.producerClass==='pre-seal-transition').path,'research/class-mapping-current-adapters-v2/source-body-handoff-transition-v2.json');
 assert.equal(REPORT_OUTPUTS.find(row=>row.producerClass==='pre-seal-transition').stage,'post-QCC-metadata-prerequisite');
});

test('all Source2 active, historical, optional and review inputs stay in the typed pointer universe',()=>{
 assert.equal(REPORT_DATA_PATHS.length,122);
 assert.equal(REPORT_OPTIONAL_DATA_PATHS.length,12);
 assert.equal(HISTORICAL_REPORT_DATA_PATHS.length,5);
 assert.equal(REPORT_BINDING_REVIEW_PATHS.length,4);
 assert.equal(REPORT_ALL_REQUIRED_DATA_PATHS.length,131);
 assert.ok(REPORT_DATA_PATHS.every(file=>REPORT_ALL_REQUIRED_DATA_PATHS.includes(file)));
 assert.ok(REPORT_OPTIONAL_DATA_PATHS.every(file=>!REPORT_ALL_REQUIRED_DATA_PATHS.includes(file)));
 assert.equal(new Set(REPORT_OPTIONAL_DATA_PATHS).size,12);
 assert.ok(REPORT_OPTIONAL_DATA_PATHS.every(file=>/^[A-Za-z0-9._/-]+$/.test(file)));
 assert.ok(HISTORICAL_REPORT_DATA_PATHS.every(file=>REPORT_ALL_REQUIRED_DATA_PATHS.includes(file)));
 assert.ok(REPORT_BINDING_REVIEW_PATHS.every(file=>REPORT_ALL_REQUIRED_DATA_PATHS.includes(file)));
 assert.equal(REPORT_DATA_POINTER_EDGES.length,291);
 assert.ok(REPORT_DATA_POINTER_EDGES.every(edge=>REPORT_ALL_REQUIRED_DATA_PATHS.includes(edge.sourcePath)&&REPORT_ALL_REQUIRED_DATA_PATHS.includes(edge.targetPath)));
 const binder=readCandidate('tools/bind-class-mapping-source-audit-input-commit-v3.mjs');
 const producer=readCandidate('tools/class-mapping-report-producers-v3.mjs');
 for(const token of ['REPORT_DATA_PATHS','HISTORICAL_REPORT_DATA_PATHS','REPORT_BINDING_REVIEW_PATHS','REPORT_OPTIONAL_DATA_PATHS','REPORT_DATA_POINTER_EDGES']){
  assert.ok(binder.includes(token),token+' binder closure');
  assert.ok(producer.includes(token),token+' producer closure');
 }
 assert.match(binder,/raw M blob/);
 assert.match(producer,/raw M blob/);
});

test('legacy report aliases resolve once to the exact Source2 physical outputs',()=>{
 const source=readCandidate('tools/class-mapping-report-producers-v3.mjs');
 assert.ok(SOURCE_SCAN_FRESH_OUTPUT_PATH.startsWith('research/class-mapping-source-epoch-v2/reports/current/'));
 assert.equal(SOURCE_SCAN_LEGACY_ALIAS.physicalPath,SOURCE_SCAN_FRESH_OUTPUT_PATH);
 assert.equal(CURRENT_REPORT_LEGACY_ALIASES.length,2);
 for(const alias of CURRENT_REPORT_LEGACY_ALIASES){
  assert.ok(REPORT_OUTPUTS.some(row=>row.path===alias.physicalPath),alias.physicalPath);
  assert.notEqual(alias.logicalPath,alias.physicalPath);
  assert.ok(source.includes('CURRENT_REPORT_LEGACY_ALIASES.map'),alias.logicalPath);
 }
 assert.match(source,/loadSourceScanCatalogFromProducerPath\(relative,readJson,repoPath\)/);
});

test('producer command rejects missing arguments and symlink source directories before any report work',()=>{
 const repoRoot=process.env.NATIVE2_SOURCE_REPO_ROOT;
 assert.ok(repoRoot,'test requires the read-only current checkout path');
 const temp='/dev/shm/native2-producer-cli-'+process.pid;
 mkdirSync(path.join(temp,'tools'),{recursive:true});
 const gitDir=execFileSync('/usr/bin/git',['-C',repoRoot,'rev-parse','--absolute-git-dir'],{encoding:'utf8'}).trim();
 writeFileSync(path.join(temp,'.git'),'gitdir: '+gitDir+'\n');
 for(const name of ['class-mapping-report-producers-v3.mjs','class-mapping-report-runtime-guards-v2.mjs','class-mapping-report-input-contract-v3.mjs','class-mapping-report-input-contract-v2.mjs','class-mapping-raw-git-v1.mjs']){
  writeFileSync(path.join(temp,'tools',name),readFileSync(path.join(proposalRoot,'tools',name)));
 }
 const isolatedProducer=path.join(temp,'tools/class-mapping-report-producers-v3.mjs');
 const missing=spawnSync(process.execPath,[isolatedProducer],{cwd:temp,encoding:'utf8'});
 assert.notEqual(missing.status,0);
 assert.match(missing.stderr,/usage: node tools\/class-mapping-report-producers-v3\.mjs/);
 const target='/dev/shm/native2-report-pdf-source-'+process.pid;
 const link=target+'-link';
 mkdirSync(target,{recursive:true});
 try{
  symlinkSync(target,link);
  const result=spawnSync(process.execPath,[isolatedProducer,'--source-dir',link,'--python-executable','/usr/bin/python3'],{cwd:temp,encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/physical non-symlink directory/);
  assert.equal(existsSync(path.join(temp,'research/class-mapping-source-epoch-v2/reports/next-native-v3')),false);
 }finally{rmSync(link,{force:true});rmSync(target,{recursive:true,force:true});rmSync(temp,{recursive:true,force:true});}
});

test('post-commit verifier rebuilds report adapters and returns projections for CI artifacts',()=>{
 const source=readFileSync(verifierPath,'utf8');
 for(const token of [
  'buildCurrentClassMappingGapsHandoff','buildCurrentClassMappingMonetaryUnitProvenance',
  'buildCurrentClassMappingReportConsistency','auditUa26MarkerReceiptWithCurrentSourceEpoch',
  'loadCurrentMonetarySourceQuestions','validateCurrentMonetarySourceQuestionProjection',
  'selectedKinds','monetaryQuestions','unresolvedQuestionIds',
 ])assert.ok(source.includes(token),token);
 assert.match(source,/projection/);
 assert.match(source,/ua26/i);
 assert.match(source,/--kind/);
 assert.match(source,/receipt/i);
 assert.ok(REPORT_CODE_PATHS.includes('tools/verify-class-mapping-current-reports-v3.mjs'));
});

test('raster and visual CI wrapper verifies committed v3 outputs and retains prior artifact names',()=>{
 const source=readFileSync(ciPath,'utf8');
 assert.match(source,/next-native-v3/);
 assert.doesNotMatch(source,/class-mapping-report-producers-v3/);
 assert.doesNotMatch(source,/source-dir|sourceDirectory|private.*PDF/i);
 for(const name of [
  'report.json','report.md','dispositions.json','dispositions.md','price-source-inventory.json','price-source-inventory.md',
  'validation.json','validation-exit-status.txt','generation-error.txt',
 ])assert.ok(source.includes(name),name);
 assert.ok(REPORT_CODE_PATHS.includes('tools/source-raster-visual-coverage-ci-v2.mjs'));
});

test('seal and pin roles are distinct stages and the producer does not claim M/N/O',()=>{
 assert.notEqual(CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,CURRENT_CONSUMER_FINAL_SEAL_PATH);
 assert.notEqual(CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,CURRENT_CONSUMER_PINS_PATH);
 const producer=readCandidate('tools/class-mapping-report-producers-v3.mjs');
 assert.match(producer,/consumerSeals:/);
 assert.match(producer,/semanticPass:false/);
 assert.match(producer,/sourceCompletenessCertified:false/);
 assert.match(producer,/visualReviewPromoted:false/);
});


test('historical Native1 runtime pin modules are joined as raw-B/current/raw-M typed code witnesses',()=>{
 assert.equal(HISTORICAL_PIN_MODULE_CODE_PATHS.length,2);
 assert.equal(REPORT_CODE_PATHS.length,104);
 assert.deepEqual(HISTORICAL_PIN_MODULE_EXPECTED_SHA256,{
  'research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.mjs':'7ee70d26cd2e6267f3e959c6f75d512370f61478658f0a47213c49930853465c',
  'research/class-mapping-current-adapters-v1/current-consumer-pins-v1.mjs':'396ce633bbef29e90b3393c5c8bb3e44f304f0da27de1c37ce3e9b4e38229888',
 });
 assert.ok(HISTORICAL_PIN_MODULE_CODE_PATHS.every(path=>REPORT_CODE_PATHS.includes(path)));
 const binder=readCandidate('tools/bind-class-mapping-source-audit-input-commit-v3.mjs');
 assert.match(binder,/physical bytes, raw B and raw M/);
 assert.match(binder,/historicalPinModuleCodeWitnesses/);
 assert.match(binder,/historical pin-module B\/physical\/M witness changed during receipt collection/);
});

test('producer, binder, and verifier reject symlink output parents before any external write',async()=>{
 const sources=[readCandidate('tools/class-mapping-report-producers-v3.mjs'),readCandidate('tools/bind-class-mapping-source-audit-input-commit-v3.mjs'),readFileSync(verifierPath,'utf8')];
 const helper=source=>source.match(/export function ensurePhysicalOutputDirectory\([\s\S]*?\n}/)?.[0];
 assert.ok(helper(sources[0]));
 assert.equal(helper(sources[1]),helper(sources[0]));
 assert.equal(helper(sources[2]),helper(sources[0]));
 assert.ok(sources[0].includes('ensurePhysicalOutputDirectory(path.posix.dirname(relative))'));
 assert.ok(sources[1].includes('ensurePhysicalOutputDirectory(path.posix.dirname(REPORT_RECEIPT_PATH))'));
 assert.ok(sources[2].includes('ensurePhysicalOutputDirectory(relativeDir)'));
 const sourceRoot=process.env.NATIVE2_SOURCE_REPO_ROOT;assert.ok(sourceRoot);
 const root='/dev/shm/native2-output-guard-repo-'+process.pid,outside='/dev/shm/native2-output-guard-outside-'+process.pid;
 mkdirSync(path.join(root,'tools'),{recursive:true});mkdirSync(outside,{recursive:true});
 const gitDir=execFileSync('/usr/bin/git',['-C',sourceRoot,'rev-parse','--absolute-git-dir'],{encoding:'utf8'}).trim();
 writeFileSync(path.join(root,'.git'),'gitdir: '+gitDir+'\n');
 for(const name of ['class-mapping-report-producers-v3.mjs','class-mapping-report-runtime-guards-v2.mjs','class-mapping-report-input-contract-v3.mjs','class-mapping-report-input-contract-v2.mjs','class-mapping-raw-git-v1.mjs'])writeFileSync(path.join(root,'tools',name),readFileSync(path.join(proposalRoot,'tools',name)));
 mkdirSync(path.join(root,'research'),{recursive:true});symlinkSync(outside,path.join(root,'research','redirect'));
 try{
  const isolated=await import(pathToFileURL(path.join(root,'tools/class-mapping-report-producers-v3.mjs')).href+'?output-guard='+process.pid);
  for(const relative of [
   'research/redirect/child',
   'research/class-mapping-source-epoch-v2/reports/next-native-v3/geometry',
   'research/class-mapping-source-epoch-v2/reports/next-native-v3/raster',
   'research/class-mapping-source-epoch-v2/reports/next-native-v3/continuation',
  ]){
   const target=path.join(root,relative);
   if(relative!=='research/redirect/child')mkdirSync(path.dirname(target),{recursive:true});
   if(relative!=='research/redirect/child'&&!existsSync(target))symlinkSync(outside,target);
   assert.throws(()=>isolated.ensurePhysicalOutputDirectory(relative,root),/physical non-symlink directory/);
   assert.equal(existsSync(path.join(outside,'child')),false,relative+' must not create or write through the symlink');
   rmSync(target,{force:true});
  }
 }finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});


test('Jo unit report keeps distinct historical/current evidence references and null unknown-price state',()=>{
 const unit=readCandidate('tools/monetary-unit-provenance-audit-next-native-v3.mjs');
 const contract=JSON.parse(readCandidate('research/class-mapping-current-adapters-v2/jo-current-source-gap-contract-v3.json'));
 assert.equal(contract.materialized,true);
 assert.equal(contract.status,'qualified; Jo null/unextracted gap retained with review pending');
 assert.equal(contract.nativeSourceEpochBinding.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(contract.nativeSourceEpochBinding.fixtureSha256,'a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2');
 assert.equal(contract.retainedJoTarget.price,null);assert.equal(contract.retainedJoTarget.priceState,'unextracted');
 assert.equal(contract.retainedJoTarget.semanticPass,false);assert.equal(contract.retainedJoTarget.sourcePriceAbsenceReviewed,false);
 assert.ok(contract.currentEvidence.sourceBodyRefs.some(row=>row.path==='equipment.json'));
 assert.ok(contract.historicalEvidence.legacyJoRegistration.path==='research/source-audit-batch6-jo-unextracted-price.json');
 assert.match(unit,/historicalEvidenceRefs:registration\.historicalEvidenceRefs/);
 assert.match(unit,/currentSourceRefs:registration\.currentSourceRefs/);
 assert.match(unit,/registration:\{path:registration\.registryRef\.path/);
 assert.match(unit,/semanticPass:false/);
});

test('raster visual CI failure markers do not follow symlink leaves or hide secondary write errors',()=>{
 const source=readCandidate('tools/source-raster-visual-coverage-ci-v2.mjs');
 assert.match(source,/assertSafeFailureLeaf/);assert.match(source,/stat\.isSymbolicLink\(\)/);
 assert.match(source,/renameSync\(temporary,target\)/);
 assert.match(source,/markerErrors=writeFailureArtifacts/);
 assert.match(source,/Failure-marker write errors:/);
 assert.doesNotMatch(source,/catch\{\}\s*\}/);
});

test('new citation-navigation scanner and its parser are explicit report-code inputs',()=>{
 assert.ok(REPORT_CODE_PATHS.includes('tools/citation-navigation-coverage-v2.mjs'));
 assert.ok(REPORT_CODE_PATHS.includes('tools/citation-navigation-producer-call-scan-v3.mjs'));
 assert.ok(PYTHON_DYNAMIC_LOCAL_EDGES.every(edge=>REPORT_CODE_PATHS.includes(edge.to)));
});
