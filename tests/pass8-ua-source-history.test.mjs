import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,historicalSourceDirectoryPaths,readHistoricalSourceDirectoryPath} from './helpers/ua-history-source-directory-v1.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import * as history from '../research/class-mapping-history-v1/source-postmetadata-facade-v2/pass8-ua-source-history-v2.proposed.mjs';
import * as prior from './helpers/pass8-weapon-source-history.mjs';
const root=new URL('../',import.meta.url),historicalPaths=new Set(historicalSourceDirectoryPaths()),read=p=>historicalPaths.has(p)?readHistoricalSourceDirectoryPath(p):readFileSync(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(ref,p)=>execFileSync('git',['show',`${ref}:${p}`],{cwd:root,maxBuffer:100*1024*1024});
const contractBytes=read('tests/fixtures/pass8-ua-source-history-v1.json.gz');
const contract=history.decodePass8UaSourceHistory(contractBytes);
const project=history.projectPass8UaSourceJson,projectBytes=history.projectPass8UaSourceBytes;
const composedJson=[history.projectPass8WeaponSourceJson,history.projectPass8CitationTargetCropJson,history.projectPass8PhbSourceJson,history.projectPass8XpContinuationJson,history.projectPass8CharacterReferenceJson];
const composedBytes=[history.projectPass8WeaponSourceBytes,history.projectPass8CitationTargetCropBytes,history.projectPass8PhbSourceBytes,history.projectPass8XpContinuationBytes,history.projectPass8CharacterReferenceBytes];

test('UA history restores whole actual merged V27 objects only from the declared source and M1 states',()=>{
 assert.equal(contract.sourcePaths.length,17);assert.equal(contract.metadataPaths.length,8);assert.deepEqual(contract.rawPaths,[]);
 for(const [path,stage]of Object.entries(contract.files)){
  const before=git(contract.beforeCommit,path),after=git(stage.afterCommit,path),expected=JSON.parse(before);
  assert.equal(sha(before),stage.beforeRawSha256);assert.equal(sha(after),stage.afterRawSha256);
  for(const bytes of [before,after]){assert.deepEqual(projectBytes(path,bytes),before,path);assert.deepEqual(project(path,JSON.parse(bytes)),expected,path);}
  assert.deepEqual(history.readBeforePass8UaSourceFile(new URL(path,root)),before,path);
 }
 for(const path of ['research/source-frame-coordinate-bridge-ua-source-v1.json','research/source-completeness-repairs-version27.json','research/citation-evidence-seals.json','dist/source-viewer.js'])assert.equal(history.isPass8UaSourceHistoryPath(path),false,'new paths, append-only seals and unchanged runtime files have no fabricated predecessor');
 assert.throws(()=>project('equipment.json',{}),/no UA-source history projection/);
});

test('all declared whole states reject unknown JSON mutations and raw whitespace through every composed boundary',()=>{
 for(const [path,stage]of Object.entries(contract.files))for(const ref of [contract.beforeCommit,stage.afterCommit]){
  const bytes=git(ref,path),bad=JSON.parse(bytes);bad.unapprovedUaCanary=true;
  for(const fn of [project,...composedJson])assert.throws(()=>fn(path,bad),path);
  for(const fn of [projectBytes,...composedBytes])assert.throws(()=>fn(path,Buffer.concat([bytes,Buffer.from(' ')])),path);
 }
});

test('older literal states still enter the unchanged weapon stage and current source cannot enter that old stage directly',()=>{
 const old=prior.decodePass8WeaponSourceHistory(read('tests/fixtures/pass8-weapon-source-history-v1.json.gz'));
 for(const [path,stage]of Object.entries(old.files))for(const ref of [old.beforeCommit,stage.afterCommit]){
  const bytes=git(ref,path);
  assert.deepEqual(history.projectPass8WeaponSourceBytes(path,bytes),prior.projectPass8WeaponSourceBytes(path,bytes),path);
  assert.deepEqual(history.projectPass8WeaponSourceJson(path,JSON.parse(bytes)),prior.projectPass8WeaponSourceJson(path,JSON.parse(bytes)),path);
 }
 assert.throws(()=>prior.projectPass8WeaponSourceJson('dist/data.json',JSON.parse(read('dist/data.json'))));
 for(const fn of composedJson)assert.deepEqual(fn('dist/data.json',JSON.parse(git(contract.sourceCommit,'dist/data.json'))),fn('dist/data.json',JSON.parse(git(contract.beforeCommit,'dist/data.json'))));
});

test('unknown owner values, grades, routing and mixed source stages fail closed',()=>{
 const path='dist/data.json',source=JSON.parse(git(contract.sourceCommit,path)),before=JSON.parse(git(contract.beforeCommit,path));
 const mutations=[v=>v.equipment[0].name+=' changed',v=>v.spells.find(r=>r.id==='ua-cleric-ceremony').effect[0]+=' changed',v=>v.classes.find(r=>r.id==='ua-cavalier').unapprovedMetadata=true,v=>v.rules.find(r=>r.id==='phb-hurled-weapons-and-missiles-table').table.rows[0].cells[0].raw='999',v=>v.rules.find(r=>r.id==='phb-hurled-weapons-and-missiles-table').table.rows[0].sourceReference.evidenceBindings[0].reviewStatus='field-target-reviewed',v=>v.rules.find(r=>r.id==='phb-hurled-weapons-and-missiles-table').table.rows[0].sourceReference.evidenceBindings[0].sourceOwner.itemId='ua-cavalier',v=>v.release=before.release];
 for(const mutate of mutations){const bad=structuredClone(source);mutate(bad);for(const fn of [project,...composedJson])assert.throws(()=>fn(path,bad));}
 const ledger=JSON.parse(read('research/mechanics-audit-progress.json'));ledger.reviewRecords.at(-1).checkedPaths=['/effect/0'];
 for(const fn of [project,...composedJson])assert.throws(()=>fn('research/mechanics-audit-progress.json',ledger),'pending registration cannot gain a check');
});

test('nonJSON values, proxies, hidden properties and serialization hooks cannot hide an unknown state',()=>{
 const path='dist/scans/verified/classes-ranger.json',clean=JSON.parse(read(path));let getterCalls=0,serializerCalls=0;
 const mutations=[v=>v.hidden=undefined,v=>v.hidden=NaN,v=>v.hidden=Infinity,v=>v.hidden=-0,v=>v.hidden=1n,v=>v.hidden=()=>1,v=>v.hidden=Symbol('hidden'),v=>v[Symbol('hidden')]=true,v=>Object.defineProperty(v,'hidden',{value:1}),v=>Object.defineProperty(v,'hidden',{enumerable:true,get(){getterCalls++;return 1;}}),v=>v.hidden=new Proxy({},{}),v=>v.hidden=new Date(),v=>v.hidden=Object.create({toJSON(){serializerCalls++;return {};}}),v=>v.hidden=[,1],v=>v.hidden=Object.assign([1],{hidden:true}),v=>v.self=v];
 for(const mutate of mutations){const bad=structuredClone(clean);mutate(bad);for(const fn of [project,...composedJson])assert.throws(()=>fn(path,bad));}
 for(const fn of [project,...composedJson])assert.throws(()=>fn(path,new Proxy(clean,{ownKeys(){throw Error('proxy trap must not run');}})));
 for(const prototype of [Object.prototype,Array.prototype]){
  Object.defineProperty(prototype,'toJSON',{configurable:true,value(){serializerCalls++;return {};}});
  try{for(const fn of [project,...composedJson])assert.throws(()=>fn(path,clean));}finally{delete prototype.toJSON;}
 }
 assert.equal(getterCalls,0);assert.equal(serializerCalls,0);
});

test('returned buffers and objects never expose cached predecessors and mutated inputs reject on reuse',()=>{
 const path='dist/scans/verified/classes-ranger.json',bytes=read(path),value=JSON.parse(bytes),expected=git(contract.beforeCommit,path);
 const one=project(path,value);one.unapprovedCacheMutation=true;assert.deepEqual(project(path,value),JSON.parse(expected));
 const first=projectBytes(path,bytes);first[0]^=1;assert.deepEqual(projectBytes(path,bytes),expected);
 value.unapprovedCallerMutation=true;assert.throws(()=>project(path,value));
 const composedPath='rules.json',composedInput=read(composedPath);for(const fn of composedJson){const input=JSON.parse(composedInput),result=fn(composedPath,input);result.unapprovedCacheMutation=true;assert.notDeepEqual(fn(composedPath,input),result);}
});

test('actual first failure, caller preimages, support twins and every old helper or contract remain exact',()=>{
 const bytes=read('tests/fixtures/pass8-ua-source-first-full-failure-v1.json.gz');assert.equal(sha(bytes),'3bda4c7858514b153fdd0cc71505c1b8238ae5c4a23ec8c42d8ec42b2dd55774');
 const failure=JSON.parse(gunzipSync(bytes));assert.equal(failure.inputCommit,contract.metadataCommit);assert.deepEqual([failure.reportedCounts.tests,failure.reportedCounts.pass,failure.reportedCounts.fail,failure.reportedCounts.skipped],[936,878,58,0]);assert.equal(sha(failure.fullOutputUtf8),contract.firstFullFailure.actualLogSha256);assert.equal(failure.trackedInputManifestSha256,contract.firstFullFailure.inputManifestSha256);
 const callers=JSON.parse(gunzipSync(read('tests/fixtures/pass8-ua-source-history-callers-before-v1.json.gz')));assert.equal(callers.files.length,44);for(const row of callers.files){assert.equal(sha(git(callers.commit,row.path)),row.sha256);assert.equal(sha(row.utf8),row.sha256);}
 const kernel=JSON.parse(read('research/ua-source-history-integration-v1/old-kernel-preservation-manifest-v1.json'));assert.equal(kernel.files.length,37);for(const row of kernel.files){assert.equal(sha(read(row.path)),row.sha256,row.path);assert.deepEqual(read(row.path),git(kernel.beforeCommit,row.path),row.path);}
 const twins={'batch6-jo-fixture.mjs':'ua-source-batch6-jo-fixture.mjs','batch6-xp-source-history.mjs':'ua-source-batch6-xp-source-history.mjs','dmg74-matrix-batch.mjs':'ua-source-dmg74-matrix-batch.mjs'};
 for(const [old,next]of Object.entries(twins)){
  let expected=read(`tests/helpers/${old}`).toString().replace("'./pass8-weapon-source-history.mjs'","'./pass8-ua-source-history.mjs'");
  for(const [a,b]of Object.entries(twins))expected=expected.replaceAll(`'./${a}'`,`'./${b}'`);
  assert.equal(read(`tests/helpers/${next}`).toString(),expected,'support twins change imports only');
 }
});

test('contract forgeries reject and unscoped runtime bytes retain their native identity',()=>{
 const changed=Buffer.from(contractBytes);changed[40]^=1;assert.throws(()=>history.decodePass8UaSourceHistory(changed));
 const forged=JSON.parse(gunzipSync(contractBytes));forged.files['dist/data.json'].afterObjectSha256='0'.repeat(64);assert.throws(()=>history.decodePass8UaSourceHistory(gzipSync(JSON.stringify(forged))));
 const bytes=read('dist/source-viewer.js');assert.deepEqual(history.readBeforePass8UaSourceFile(new URL('dist/source-viewer.js',root)),bytes);
 const expected=git(contract.beforeCommit,'classes.json').toString();assert.equal(history.readBeforePass8UaSourceFile(new URL('classes.json',root),{encoding:'utf8'}),expected);
 const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','dist','tools'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 for(const [literal,expected]of [['pass8-ua-source-history',['tools/build-pass8-ua-source-history-contract-v1.mjs']],['pass8-weapon-source-history',['tools/build-pass8-weapon-source-history-contract-v1.mjs']]])assert.deepEqual([...new Set(paths)].filter(path=>read(path).includes(literal)),expected,'tracked and prospective producers use neither historical stage; each test-only builder is explicit');
});
