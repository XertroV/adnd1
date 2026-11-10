import test from 'node:test';
import {projectPass8PhbSourceJson,projectPass8PhbSourceBytes,decodePass8UaSourceHistory} from '../research/hirelings-source-epoch-proposal-v5/source-postmetadata-facade-v1/pass8-ua-source-history-v1.proposed.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const project=resolve(fileURLToPath(new URL('..',import.meta.url)));
const currentTest='tests/xp-continuation-current-integration.test.mjs';
const frozenFixture='tests/fixtures/pass8-xp-continuation-current-integration-before.json.gz';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt=JSON.parse(gunzipSync(readFileSync(join(project,frozenFixture))));
const oldTestBytes=Buffer.from(receipt.capturedTest.base64,'base64');
assert.equal(sha(oldTestBytes),receipt.capturedTest.sha256,'preserved pre-fix test bytes');

const baselineData=JSON.parse(readFileSync(join(project,'dist/data.json'),'utf8'));
const historicalBaselineData=projectPass8PhbSourceJson('dist/data.json',baselineData);
const guardPath='tools/class-xp-continuation-target-review.mjs';

const historicalCompanions=new Map(['citation-overrides.json','research/citation-continuations.json','dist/source-continuations.json','research/source-visual-reviews.json','research/price-source-inventory.json','research/field-evidence-bindings.json'].map(path=>[path,projectPass8PhbSourceBytes(path,readFileSync(join(project,path)))]));
const uaContract=decodePass8UaSourceHistory(readFileSync(join(project,'tests/fixtures/pass8-ua-source-history-v1.json.gz')));
const historicalCatalogs=new Map(uaContract.sourcePaths.filter(path=>path.startsWith('dist/scans/verified/')).map(path=>[path,projectPass8PhbSourceBytes(path,readFileSync(join(project,path)))]));
assert.equal(historicalCatalogs.size,8,'only eight changed existing catalog paths have a closed predecessor');
function sandbox(testBytes,data,{historical=false}={}){
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
        for(const entry of readdir(join(project,'dist/scans/verified'))){const path=`dist/scans/verified/${entry}`;if(historicalCatalogs.has(path))writeFileSync(join(root,path),historicalCatalogs.get(path));else symlinkSync(join(project,path),join(root,path));}
        continue;
      }
      symlinkSync(join(project,'dist',name),join(root,'dist',name),'dir');
    }
    writeFileSync(join(root,'dist/data.json'),JSON.stringify(data,null,2)+'\n');
    if(historical){
      mkdirSync(join(root,'research'));
      for(const name of readdir(join(project,'research')))if(!historicalCompanions.has(`research/${name}`))symlinkSync(join(project,'research',name),join(root,'research',name));
      for(const [path,bytes] of historicalCompanions)writeFileSync(join(root,path),bytes);
    }
    mkdirSync(join(root,'tests'));
    symlinkSync(join(project,'tests/fixtures'),join(root,'tests/fixtures'),'dir');
    symlinkSync(join(project,'tests/helpers'),join(root,'tests/helpers'),'dir');
    writeFileSync(join(root,currentTest),testBytes);
    mkdirSync(join(root,'tools'));
    copyFileSync(join(project,guardPath),join(root,guardPath));
    const childEnv={...process.env};
    delete childEnv.NODE_TEST_CONTEXT;
    const result=spawnSync(process.execPath,['--test',currentTest],{
      cwd:root,encoding:'utf8',timeout:30_000,env:childEnv,
    });
    return {status:result.status,signal:result.signal,output:`${result.stdout??''}${result.stderr??''}`};
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
function assertCurrentRejects(result,label,reason){
  assert.notEqual(result.status,0,`${label}: current integration test must reject the mutation`);
  assert.match(result.output,/AssertionError|error:/i,`${label}: report a real assertion failure`);
  assert.match(result.output,reason,`${label}: reject for the intended invariant`);
}

test('pre-fix integration test accepts generic class field and owner-pointer bypass; current test rejects it',()=>{
  const data=genericFieldOwnerBypass();
  assertFourPass(sandbox(oldTestBytes,genericFieldOwnerBypass(historicalBaselineData),{historical:true}),'preserved pre-fix test');
  const currentBytes=readFileSync(join(project,currentTest));
  assertCurrentRejects(sandbox(currentBytes,data),'current test',/actual continuation binding must enter the strict guard scope/);
});

test('pre-fix integration test hides unrelated edit to an old UA Paladin region review; current test rejects it',()=>{
  const data=unrelatedPriorReviewEdit();
  assertFourPass(sandbox(oldTestBytes,unrelatedPriorReviewEdit(historicalBaselineData),{historical:true}),'preserved pre-fix test');
  const currentBytes=readFileSync(join(project,currentTest));
  assertCurrentRejects(sandbox(currentBytes,data),'current test',/exact retained review prefix and single disclosed defect annotation/);
});
