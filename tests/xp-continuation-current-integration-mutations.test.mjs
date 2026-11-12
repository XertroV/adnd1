import test from 'node:test';
import {projectPass8PhbSourceJson,projectPass8PhbSourceBytes,decodePass8UaSourceHistory} from './helpers/pass8-s1-paladin-catalog-history-v1.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../tools/class-mapping-raw-git-v1.mjs';

const project=resolve(fileURLToPath(new URL('..',import.meta.url)));
const currentTest='tests/xp-continuation-current-integration.test.mjs';
const frozenFixture='tests/fixtures/pass8-xp-continuation-current-integration-before.json.gz';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const repoGit=createRawGitReader(project);
const currentMmCommit='a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
const currentMmDataBytes=repoGit.git('show',`${currentMmCommit}:dist/data.json`);
assert.equal(currentMmDataBytes.length,21151920,'exact original a29/MM data byte length');
assert.equal(sha(currentMmDataBytes),'2ab84cfe5e4234e5d0303b2062f941f7d8e1b93d798a7402c16e78d6d2e4672c','exact original a29/MM data bytes');
const currentMmBaselineData=JSON.parse(currentMmDataBytes);
assert.equal(currentMmBaselineData.rules.length,213,'exact original a29/MM owner cohort');
assert.equal(sha(Buffer.from(JSON.stringify(currentMmBaselineData,null,2)+'\n')),sha(currentMmDataBytes),'sandbox serialization retains the exact pinned a29/MM bytes');
const receipt=JSON.parse(gunzipSync(readFileSync(join(project,frozenFixture))));
const oldTestBytes=Buffer.from(receipt.capturedTest.base64,'base64');
assert.equal(sha(oldTestBytes),receipt.capturedTest.sha256,'preserved pre-fix test bytes');

const currentChildTestBytes=readFileSync(join(project,currentTest));
assert.equal(sha(currentChildTestBytes),'56df2ef849cd7aabf2a5f799c322216e089002a2d3e2c52adc5cef1afbc9e89b','exact unchanged current integration test before child-only import routing');
const singleQuote=String.fromCharCode(39),fromClause=' from ';
const importLine=(bindings,module)=>`import ${bindings}${fromClause}${singleQuote}${module}${singleQuote};`;
const transportImport=importLine('{readFileSync,execFileSync,spawnSync,readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort,readVersion29HistoricalSourceInputs}','./helpers/xp-mutation-child-transport-v1.mjs');
const originalChildImports=[
  importLine('{readFileSync}','../research/class-mapping-history-v1/mm-replay-fs-v1.mjs'),
  importLine('{execFileSync,spawnSync}','../research/class-mapping-history-v1/mm-replay-child-process-v1.mjs'),
  importLine('{readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort}','./helpers/class-mapping-historical-mm-test-inputs-v1.mjs'),
  importLine('{readVersion29HistoricalSourceInputs}','./helpers/version29-native-source-context.mjs'),
];
function currentChildBytesWithTransport(bytes){
  assert.equal(sha(bytes),'56df2ef849cd7aabf2a5f799c322216e089002a2d3e2c52adc5cef1afbc9e89b','child import rewrite input pin');
  const originalLines=bytes.toString('utf8').split('\n');
  for(const [index,line] of originalChildImports.entries()){
    const positions=originalLines.flatMap((value,i)=>value===line?[i]:[]);
    assert.equal(positions.length,1,`exact child import ${index} occurs once`);
  }
  const firstImportIndex=originalLines.indexOf(originalChildImports[0]);
  const rewrittenLines=originalLines.filter(line=>!originalChildImports.includes(line));
  rewrittenLines.splice(firstImportIndex,0,transportImport);
  assert.equal(rewrittenLines.filter(line=>line!==transportImport).join('\n'),originalLines.filter(line=>!originalChildImports.includes(line)).join('\n'),'child adapter rewrites imports only; every original assertion and callback body is byte-identical');
  return Buffer.from(rewrittenLines.join('\n'));
}

const baselineData=JSON.parse(readFileSync(join(project,'dist/data.json'),'utf8'));
const historicalBaselineData=projectPass8PhbSourceJson('dist/data.json',baselineData);
const guardPath='tools/class-xp-continuation-target-review.mjs';

const historicalCompanions=new Map(['citation-overrides.json','research/citation-continuations.json','dist/source-continuations.json','research/source-visual-reviews.json','research/price-source-inventory.json','research/field-evidence-bindings.json'].map(path=>[path,projectPass8PhbSourceBytes(path,readFileSync(join(project,path)))]));
const uaContract=decodePass8UaSourceHistory(readFileSync(join(project,'tests/fixtures/pass8-ua-source-history-v1.json.gz')));
const historicalCatalogs=new Map(uaContract.sourcePaths.filter(path=>path.startsWith('dist/scans/verified/')).map(path=>[
  path,projectPass8PhbSourceBytes(path,readFileSync(join(project,path))),
]));
assert.equal(historicalCatalogs.size,8,'only eight changed existing catalog paths have a closed predecessor');
const historicalXpStageCatalogs=new Map([
  ...historicalCatalogs,
  ['dist/scans/verified/classes-paladin.json',projectPass8PhbSourceBytes(
    'dist/scans/verified/classes-paladin.json',
    readFileSync(join(project,'dist/scans/verified/classes-paladin.json')),
  )],
]);
assert.equal(historicalXpStageCatalogs.size,9,'the historical XP sandbox adds the separately changed S1 Paladin catalog to the closed UA-source eight');
const exactMutationAssertion='native PHB distribution retains all eleven strict continuation targets and exact old region-review prefixes';
function sandbox(testBytes,data,{historical=false,testNamePattern=null}={}){
  const root=mkdtempSync(join(tmpdir(),'xp-continuation-integration-mutation-'));
  try{
    for(const name of readdir(project)){
      if(['tests','tools','dist'].includes(name)||(historical&&(name==='research'||historicalCompanions.has(name))))continue;
      symlinkSync(join(project,name),join(root,name),'dir');
    }
    mkdirSync(join(root,'dist'));
    for(const name of readdir(join(project,'dist'))){
      if(name==='data.json'||(historical&&historicalCompanions.has(`dist/${name}`)))continue;
      if(historical&&name==='scans'){
        mkdirSync(join(root,'dist/scans/verified'),{recursive:true});
        for(const entry of readdir(join(project,'dist/scans')))if(entry!=='verified')symlinkSync(join(project,'dist/scans',entry),join(root,'dist/scans',entry));
        for(const entry of readdir(join(project,'dist/scans/verified'))){const path=`dist/scans/verified/${entry}`;if(historicalXpStageCatalogs.has(path))writeFileSync(join(root,path),historicalXpStageCatalogs.get(path));else symlinkSync(join(project,path),join(root,path));}
        continue;
      }
      symlinkSync(join(project,'dist',name),join(root,'dist',name),'dir');
    }
    const sandboxDataBytes=Buffer.from(JSON.stringify(data,null,2)+'\n');
    writeFileSync(join(root,'dist/data.json'),sandboxDataBytes);
    if(historical){
      mkdirSync(join(root,'research'));
      for(const name of readdir(join(project,'research')))if(!historicalCompanions.has(`research/${name}`))symlinkSync(join(project,'research',name),join(root,'research',name));
      for(const [path,bytes] of historicalCompanions)writeFileSync(join(root,path),bytes);
    }
    mkdirSync(join(root,'tests'));
    symlinkSync(join(project,'tests/fixtures'),join(root,'tests/fixtures'),'dir');
    symlinkSync(join(project,'tests/helpers'),join(root,'tests/helpers'),'dir');
    writeFileSync(join(root,currentTest),historical?testBytes:currentChildBytesWithTransport(testBytes));
    mkdirSync(join(root,'tools'));
    copyFileSync(join(project,guardPath),join(root,guardPath));
    const childEnv={...process.env};
    delete childEnv.NODE_TEST_CONTEXT;
    if(!historical){
      childEnv.ADND1_XP_MUTATION_CHILD_ROOT=root;
      childEnv.ADND1_XP_MUTATION_REPO_ROOT=project;
      childEnv.ADND1_XP_MUTATION_DATA_SHA256=sha(sandboxDataBytes);
    }
    const args=['--test'];
    if(testNamePattern!==null)args.push('--test-name-pattern',testNamePattern);
    args.push(currentTest);
    // The prior current test reached the MM stage gate at 78.7 s before
    // failing its unrelated CJS pin. Keep this finite cap above that observed
    // startup while preserving the original 30 s H/ae7 child cap.
    const result=spawnSync(process.execPath,args,{
      cwd:root,encoding:'utf8',timeout:historical?30_000:180_000,env:childEnv,
    });
    return {status:result.status,signal:result.signal,errorCode:result.error?.code??null,output:`${result.stdout??''}${result.stderr??''}`};
  }finally{
    rmSync(root,{recursive:true,force:true});
  }
}

function readdir(path){return readdirSync(path);}

function genericFieldOwnerBypass(base=baselineData){
  const data=structuredClone(base);
  const owner=data.classes.find(item=>item.id==='ua-paladin');
  const binding=owner.xpContinuation.evidenceBindings[0];
  binding.sourceCategory='class-reference-rule';
  binding.fieldPointer='/socialClass';
  binding.sourceObjectPointer='/socialClass';
  binding.targetReview.expectedTargetIdentity.kind='class-reference-rule';
  binding.targetReview.expectedTargetIdentity.fieldPointer='/socialClass';
  binding.targetReview.expectedTargetIdentity.sourceObjectPointer='/socialClass';
  return data;
}

function unrelatedPriorReviewEdit(base=baselineData){
  const data=structuredClone(base);
  const owner=data.classes.find(item=>item.id==='ua-paladin');
  const row=owner.sourceExcerpts.regionReviews.find(review=>review.regionId==='phb-24-ua-paladin-xp-level-01');
  row.recordedReview.evidence='test-only-unrelated-review-change';
  return data;
}

function assertFourPass(result,label){
  assert.equal(result.status,0,`${label}: pre-fix test should accept the mutation\n${result.output}`);
  assert.match(result.output,/ℹ tests 4/);
  assert.match(result.output,/ℹ pass 4/);
  assert.match(result.output,/ℹ fail 0/);
}
function assertSixPass(result,label){
  assert.equal(result.status,0,`${label}: unmutated exact a29/MM child should pass all preserved current assertions\n${result.output}`);
  assert.match(result.output,/ℹ tests 6/);
  assert.match(result.output,/ℹ pass 6/);
  assert.match(result.output,/ℹ fail 0/);
}
function assertCurrentRejects(result,label,reason){
  assert.notEqual(result.status,0,`${label}: current integration test must reject the mutation`);
  assert.match(result.output,/AssertionError|error:/i,`${label}: report a real assertion failure`);
  assert.match(result.output,reason,`${label}: reject for the intended invariant`);
  assert.equal(result.status,1,`${label}: mutation must exit with the test runner's failure status; got status=${result.status}, signal=${result.signal}, errorCode=${result.errorCode}`);
  assert.equal(result.signal,null,`${label}: mutation failure must not be a timeout or signal termination; errorCode=${result.errorCode}`);
}

test('current integration child passes all six original assertions with the exact unmutated a29/MM input cohort',()=>{
  assertSixPass(sandbox(currentChildTestBytes,currentMmBaselineData),'exact a29/MM clean control');
});

test('pre-fix integration test accepts generic class field and owner-pointer bypass; current test rejects it',()=>{
  const data=genericFieldOwnerBypass(currentMmBaselineData);
  assertFourPass(sandbox(oldTestBytes,genericFieldOwnerBypass(historicalBaselineData),{historical:true}),'preserved pre-fix test');
  assertCurrentRejects(sandbox(currentChildTestBytes,data,{testNamePattern:exactMutationAssertion}),'current test',/actual continuation binding must enter the strict guard scope/);
});

test('pre-fix integration test hides unrelated edit to an old UA Paladin region review; current test rejects it',()=>{
  const data=unrelatedPriorReviewEdit(currentMmBaselineData);
  assertFourPass(sandbox(oldTestBytes,unrelatedPriorReviewEdit(historicalBaselineData),{historical:true}),'preserved pre-fix test');
  assertCurrentRejects(sandbox(currentChildTestBytes,data,{testNamePattern:exactMutationAssertion}),'current test',/exact retained review prefix and single disclosed defect annotation/);
});
