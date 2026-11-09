import test from 'node:test';
import {readBeforePass8CitationTargetCropFile,readBeforePass8PhbSourceFile as readBefore} from './helpers/pass8-citation-target-crop-history.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {decodePass8PhbSourceHistory,projectPass8PhbSourceJson as project,projectPass8PhbSourceBytes as projectBytes,projectPass8XpContinuationJson as xp,projectPass8CharacterReferenceJson as character,projectPass8XpContinuationBytes as xpBytes} from './helpers/pass8-phb-source-history.mjs';
import {projectPass8XpContinuationJson as originalXp} from './helpers/pass8-xp-continuation-history.mjs';
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
// Exercise the frozen PHB stage at its exact4aa predecessor to this citation batch.
const read=p=>readBeforePass8CitationTargetCropFile(new URL(p,root));
const zipped=read('tests/fixtures/pass8-phb-source-history-v2.json.gz'),contract=decodePass8PhbSourceHistory(zipped);
const git=(ref,p)=>execFileSync('git',['show',`${ref}:${p}`],{cwd:root,maxBuffer:100*1024*1024});

test('15 JSON and one raw-only PHB boundaries restore whole exact ae7 Git files',()=>{
  assert.equal(Object.keys(contract.files).length,15);assert.deepEqual(Object.keys(contract.rawFiles),['dist/books.js']);
  for(const [path,stage] of Object.entries({...contract.files,...contract.rawFiles})){
    const before=git(contract.beforeCommit,path),after=git(stage.afterCommit,path);
    assert.equal(sha(before),stage.beforeRawSha256);assert.equal(sha(after),stage.afterRawSha256);
    for(const bytes of [before,after]) assert.deepEqual(projectBytes(path,bytes),before,path);
    assert.deepEqual(readBefore(new URL(path,root)),before,path);
    if(contract.files[path]) for(const bytes of [before,after]) assert.deepEqual(project(path,JSON.parse(bytes)),JSON.parse(before),path);
  }
  assert.throws(()=>project('dist/books.js',{}),/no PHB history projection/);
  assert.throws(()=>xp('dist/books.js',{}),/raw-only PHB/);
});
test('every whole before/after file rejects extra values, omitted rows and raw whitespace',()=>{
  for(const [path,stage] of Object.entries(contract.files)) for(const ref of [contract.beforeCommit,stage.afterCommit]){
    const bytes=git(ref,path),value=JSON.parse(bytes);value.unapprovedHistoryCanary=true;
    assert.throws(()=>project(path,value),/exact complete PHB/);
    assert.throws(()=>projectBytes(path,Buffer.concat([bytes,Buffer.from(' ')])),/exact PHB/);
  }
  for(const ref of [contract.beforeCommit,contract.sourceCommit]) assert.throws(()=>projectBytes('dist/books.js',Buffer.concat([git(ref,'dist/books.js'),Buffer.from(' ')])),/exact PHB/);
});
test('PHB-only classes/mechanics and overlapping data reject unrelated, mixed and promoted states',()=>{
  for(const path of ['classes.json','research/mechanics-audit-progress.json','dist/data.json']){
    const after=JSON.parse(read(path));const candidate=structuredClone(after);candidate.unapprovedOwner='other';
    for(const fn of [project,xp,character])assert.throws(()=>fn(path,candidate));
  }
  const path='dist/data.json',after=JSON.parse(read(path)),before=JSON.parse(git(contract.beforeCommit,path));
  for(const mutate of [v=>v.classes[0].guidance=before.classes[0].guidance,v=>v.spells.find(s=>s.id==='phb-cleric-bless').fields.Duration='6 rounds',v=>v.equipment[0].name+=' changed',v=>v.classes.find(c=>c.id==='cleric').xpContinuation.evidenceBindings[0].sourceValueStatus='confirmed']){
    const bad=structuredClone(after);mutate(bad);assert.throws(()=>project(path,bad));assert.throws(()=>xp(path,bad));assert.throws(()=>character(path,bad));
  }
  assert.throws(()=>originalXp(path,after),'the original closed XP stage still rejects the PHB successor');
  assert.throws(()=>project(path,JSON.parse(readFileSync(new URL(path,root)))),'the unchanged PHB stage rejects the real citation successor');
});
test('hidden values, accessors, proxies, cycles and sparse arrays cannot disappear behind a fingerprint',()=>{
  for(const mutate of [v=>v.hidden=undefined,v=>v.hidden=NaN,v=>v.hidden=-0,v=>v[Symbol('hidden')]=true,v=>Object.defineProperty(v,'hidden',{value:1}),v=>Object.defineProperty(v,'hidden',{get(){throw Error('must not execute');},enumerable:true}),v=>delete v.classes[0],v=>Object.setPrototypeOf(v.classes[0],{hidden:true}),v=>v.self=v,v=>v.classes[0]=new Proxy(v.classes[0],{})]){
    const bad=JSON.parse(read('classes.json'));mutate(bad);assert.throws(()=>project('classes.json',bad));assert.throws(()=>xp('classes.json',bad));
  }
});
test('returned objects and buffers cannot poison caches or admit a changed current object',()=>{
  const path='classes.json',after=JSON.parse(read(path)),expected=JSON.parse(git(contract.beforeCommit,path));
  const first=project(path,after);first.classes[0].name='cache poison';assert.deepEqual(project(path,after),expected);
  const raw=projectBytes(path,read(path));raw[0]^=1;assert.deepEqual(projectBytes(path,read(path)),git(contract.beforeCommit,path));
  after.classes[0].name='changed after priming';assert.throws(()=>project(path,after));
});
test('all24 class guidance appends preserve ten complete owner prefixes and every other authored class value',()=>{
  const before=JSON.parse(git(contract.beforeCommit,'classes.json')),after=JSON.parse(read('classes.json'));let appends=0,owners=0;
  assert.deepEqual(after.classes.map(c=>c.id),before.classes.map(c=>c.id));
  for(const [i,current] of after.classes.entries()){
    const old=before.classes[i];assert.deepEqual({...current,guidance:old.guidance},old);
    assert.deepEqual(current.guidance.slice(0,old.guidance.length),old.guidance);
    if(current.guidance.length!==old.guidance.length){owners++;appends+=current.guidance.length-old.guidance.length;}
  }
  assert.equal(owners,10);assert.equal(appends,24);
});
test('1210 mechanics reviews preserve all1205 original records and exactly five seven-leaf corrections',()=>{
  const path='research/mechanics-audit-progress.json',before=JSON.parse(git(contract.beforeCommit,path)),after=JSON.parse(read(path));
  assert.equal(before.reviewRecords.length,1205);assert.equal(after.reviewRecords.length,1210);
  assert.deepEqual(after.reviewRecords.slice(0,1205),before.reviewRecords);
  const application=JSON.parse(read('research/source-audit-pass8-phb-spell-guidance-seven-leaf-mechanics-application.json'));
  assert.deepEqual(after.reviewRecords.slice(1205),application.appendedReviewRecords);
  assert.equal(application.appendedReviewRecords.flatMap(r=>r.changes).length,7);
  for(const mutate of [v=>v.reviewRecords.pop(),v=>v.reviewRecords.push(v.reviewRecords.at(-1)),v=>v.reviewRecords.reverse(),v=>v.reviewRecords[0].checker+=' modified',v=>v.reviewRecords.at(-1).changes[0].newValue='wrong']){
    const bad=structuredClone(after);mutate(bad);assert.throws(()=>project(path,bad));
  }
});
test('all4572 old full field-reference objects retain order and only two pending Druid references are added',()=>{
  const path='research/price-source-inventory.json',before=JSON.parse(git(contract.beforeCommit,path)).fieldEvidenceBindings,after=JSON.parse(read(path)).fieldEvidenceBindings;
  const newRows=after.filter(b=>b.collection==='rules'&&b.itemId==='phb-druid-mistletoe-spell-components');
  assert.equal(before.length,4572);assert.equal(after.length,4574);assert.equal(newRows.length,2);
  assert.deepEqual(after.filter(b=>!newRows.includes(b)),before);
  assert.deepEqual(newRows.map(b=>b.fieldPointer),['','/sourceReferences/0']);
  for(const row of newRows){assert.equal(row.reviewStatus,'field-target-pending');assert.equal(row.sourceValueStatus,'not-assessed-by-field-target-review');assert.equal(row.targetReview,null);}
});
test('earlier helpers/contracts and archived expectations stay exact; forged contract bytes reject',()=>{
  assert.equal(sha(read('tests/helpers/pass8-xp-continuation-history.mjs')),contract.preservation.oldXpHelperSha256);
  assert.equal(sha(read('tests/fixtures/pass8-xp-continuation-history-v1.json.gz')),contract.preservation.oldXpContractSha256);
  assert.equal(sha(read('tests/helpers/pass8-character-reference-history.mjs')),contract.preservation.oldCharacterHelperSha256);
  const capture=JSON.parse(gunzipSync(read('tests/fixtures/pass8-phb-history-callers-before-v2.json.gz')));
  assert.equal(capture.files.length,15);for(const file of capture.files){assert.equal(sha(file.utf8),file.sha256);assert.equal(sha(git(capture.commit,file.path)),file.sha256);}
  const corrupt=Buffer.from(zipped);corrupt[40]^=1;assert.throws(()=>decodePass8PhbSourceHistory(corrupt),/exact closed PHB/);
});
