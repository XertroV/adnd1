// Pure protocol tests for the finite R7 old-test-source transition guard.
// Accepted-peer fixtures below are synthetic branch checks, never real review.
import test from 'node:test';
import vm from 'node:vm';
import {detachedArgvForChildV3,detachedChildOptionsForChildV3} from '../research/class-mapping-history-v1/mm-replay-io-contract-v3.mjs';
import {validateR8TransitionLineage,validateGlobalCodeProof} from '../tools/class-mapping-test-source-lineage-v2.mjs';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,copyFileSync,writeFileSync,symlinkSync,rmSync,mkdtempSync} from 'node:fs';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {validateR5TestSourceTransitions,parsePinnedTestSourceMigrationDocument,TEST_SOURCE_MIGRATIONS_SHA256,TEST_SOURCE_MIGRATIONS_SIZE_BYTES,TEST_SOURCE_MIGRATIONS_PATH} from '../tools/class-mapping-test-sharding-core-v2.mjs';

const proposedRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const r5=JSON.parse(readFileSync(resolve(proposedRoot,'research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json')));
const original200=JSON.parse(readFileSync(resolve(proposedRoot,'research/class-mapping-history-v1/original-top-level-test-entries-v1.json')));
const transitionBytes=readFileSync(resolve(proposedRoot,'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v9.json'));
const fixedDocument=parsePinnedTestSourceMigrationDocument(transitionBytes);
const parentDocument=JSON.parse(readFileSync(resolve(proposedRoot,'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v8.json')));
assert.equal(fixedDocument.accepted,true);
assert.equal(fixedDocument.status,'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITIONS');
assert.equal(parentDocument.transitionCount,18);
assert.equal(fixedDocument.transitionCount,fixedDocument.transitions.length);
assert(parentDocument.transitions.every(old=>fixedDocument.transitions.some(row=>row.id===old.id&&row.path===old.path)));
assert(fixedDocument.transitions.every(row=>row.candidateStatus==='ACCEPTED'&&row.acceptedPeer&&row.acceptedPeer.reviewerId&&/^[a-f0-9]{64}$/.test(row.acceptedPeer.receiptSha256)&&Number.isSafeInteger(row.acceptedPeer.receiptSizeBytes)));
assert.equal(fixedDocument.acceptanceTally.boundedSourcePeerAccepted,fixedDocument.transitionCount);
assert.equal(fixedDocument.acceptanceTally.boundedSourcePeerPending,0);
assert.equal(parentDocument.transitions.filter(row=>row.acceptedProofClosureRebind?.reviewerId==='root').length,11);
assert.equal(parentDocument.scopeBoundaries.dynamicNewTopLevelTests.countWithinThisTransitionPackage,3);
assert.equal(parentDocument.scopeBoundaries.dynamicNewTopLevelTests.globalDynamicCount,'PARENT_R6_INTEGRATION_PENDING');
// All old fail-closed branches below receive a separate in-memory test fixture.
// It is never written as the pinned V8 source ledger.
const pending=structuredClone(fixedDocument);
pending.status='PENDING_SYNTHETIC_TEST_ONLY';
pending.accepted=false;
pending.acceptanceTally={accepted:false,acceptedPeerReceipts:0,boundedSourcePeerAccepted:0,boundedSourcePeerPending:fixedDocument.transitionCount,reason:'Synthetic in-memory protocol fixture only'};
pending.currentR8Blockers.pendingIndependentIntegrationTransitions=pending.transitions.map(row=>({path:row.path,reason:'Synthetic in-memory protocol fixture only'}));
for(const row of pending.transitions){row.candidateStatus='PENDING_SYNTHETIC_TEST_ONLY';row.acceptedPeer=null;}
const system=pending.transitions.find(row=>row.path==='tests/source-frame-systemic-consumer.test.mjs');
const navigation=pending.transitions.find(row=>row.path==='tests/citation-navigation-inventory.test.mjs');
const readFixture=path=>readFileSync(resolve(proposedRoot,path));
const readCode=path=>readFileSync(resolve(proposedRoot,path));
function readEvidence(path,extra=new Map()){
 if(extra.has(path)) return extra.get(path);
 assert.match(path,/^research\/class-mapping-ci-sharding-v1\/test-source-transition-v1\//);
 return readFileSync(resolve(proposedRoot,path));
}
function currentBefore(){return structuredClone(r5.entries);}
function validate(currentEntries,doc=pending,readers={}){
 return validateR5TestSourceTransitions({r5Entries:r5.entries,currentEntries,transitionDocument:doc,readFixture:readers.readFixture??readFixture,readEvidence:readers.readEvidence??(path=>readEvidence(path,readers.extra)),readCode:readers.readCode??readCode});
}
function setAfter(rows,transition){const row=rows.find(candidate=>candidate.path===transition.path);assert(row);row.sha256=transition.after.sha256;row.sizeBytes=transition.after.sizeBytes;return rows;}
function syntheticAccepted(doc=pending,transition=system){
 const accepted=structuredClone(doc);
 accepted.status='ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITIONS';accepted.accepted=true;
 const row=accepted.transitions.find(candidate=>candidate.path===transition.path);
 row.candidateStatus='ACCEPTED';
 const receipt={schemaVersion:1,status:'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITION',reviewer:{id:'independent-reviewer-fixture',role:'independent'},authorId:row.authorId,subject:{path:row.path,before:row.before,after:row.after},beforeFixture:{path:row.before.fixturePath,sha256:row.before.fixtureSha256,sizeBytes:row.before.fixtureSizeBytes},proposal:row.proposal,proofScope:row.proofScope,codeProof:row.codeProof};
 const bytes=Buffer.from(JSON.stringify(receipt));
 row.acceptedPeer={reviewerId:receipt.reviewer.id,receiptPath:'research/class-mapping-ci-sharding-v1/test-source-transition-v1/peer-receipts/synthetic-only.json',receiptSha256:sha(bytes),receiptSizeBytes:bytes.length};
 return {doc:accepted,bytes};
}

test('unmodified R5 rows stay exact while pending migration rows remain inactive',()=>{
 const result=validate(currentBefore());
 assert.deepEqual(result.acceptedTransitions,[]);
 assert.deepEqual(result.pendingTransitions,pending.transitions.map(row=>row.path).sort());
});

test('a changed old R5 source fails closed when its peer receipt is null',()=>{
 const rows=setAfter(currentBefore(),system);
 assert.throws(()=>validate(rows),/accepted/);
});

test('only the pinned after SHA and size can activate a source transition',()=>{
 const rows=setAfter(currentBefore(),system);rows.find(row=>row.path===system.path).sha256='a'.repeat(64);
 const accepted=syntheticAccepted();
 assert.throws(()=>validate(rows,accepted.doc,{extra:new Map([[accepted.doc.transitions.find(row=>row.path===system.path).acceptedPeer.receiptPath,accepted.bytes]])}),/exact SHA-256 and byte size/);
});

test('unlisted old-test edits and missing original paths are rejected',()=>{
 const changed=currentBefore();const unrelated=changed.find(row=>row.path!=='tests/source-frame-systemic-consumer.test.mjs'&&row.path!=='tests/citation-navigation-inventory.test.mjs');unrelated.sha256='b'.repeat(64);
 assert.throws(()=>validate(changed),/unlisted R5 source change/);
 const missing=currentBefore().filter(row=>row.path!==r5.entries[0].path);
 assert.throws(()=>validate(missing),/R5 test source remains present/);
});

test('duplicate migration ids or paths are rejected before admission',()=>{
 const duplicate=structuredClone(pending);duplicate.transitions.push(structuredClone(duplicate.transitions[0]));duplicate.transitionCount++;
 assert.throws(()=>validate(currentBefore(),duplicate),/unique migration identifier/);
 const duplicatePath=structuredClone(pending);duplicatePath.transitions[1].path=duplicatePath.transitions[0].path;
 assert.throws(()=>validate(currentBefore(),duplicatePath),/unique transition/);
});

test('baseline fixture, proposed source and scoped code proof pins are mandatory',()=>{
 const badFixture=structuredClone(pending);badFixture.transitions[0].before.fixtureSha256='c'.repeat(64);
 assert.throws(()=>validate(currentBefore(),badFixture),/exact before fixture/);
 const accepted=syntheticAccepted();const transition=accepted.doc.transitions.find(row=>row.path===system.path);transition.codeProof[0].sha256='d'.repeat(64);
 const rows=setAfter(currentBefore(),system);
 assert.throws(()=>validate(rows,accepted.doc,{extra:new Map([[transition.acceptedPeer.receiptPath,accepted.bytes]])}),/peer reviewed exact code proof/);
});

test('a structurally accepted synthetic receipt binds reviewer, subject, scope and proof exactly',()=>{
 const accepted=syntheticAccepted();const row=accepted.doc.transitions.find(candidate=>candidate.path===system.path);
 const rows=setAfter(currentBefore(),system);
 const result=validate(rows,accepted.doc,{extra:new Map([[row.acceptedPeer.receiptPath,accepted.bytes]])});
 assert.deepEqual(result.acceptedTransitions,[system.path]);
 assert.deepEqual(result.pendingTransitions,pending.transitions.filter(row=>row.path!==system.path).map(row=>row.path).sort());
});

test('wrong reviewer identity and wrong reviewed source are rejected',()=>{
 const rows=setAfter(currentBefore(),system);
 const accepted=syntheticAccepted();let row=accepted.doc.transitions.find(candidate=>candidate.path===system.path);
 row.acceptedPeer.reviewerId=row.authorId;
 assert.throws(()=>validate(rows,accepted.doc,{extra:new Map([[row.acceptedPeer.receiptPath,accepted.bytes]])}),/reviewer is independent/);
 const second=syntheticAccepted();row=second.doc.transitions.find(candidate=>candidate.path===system.path);
 const wrong=JSON.parse(second.bytes.toString('utf8'));wrong.subject.path='tests/not-the-reviewed-test.test.mjs';
 const bytes=Buffer.from(JSON.stringify(wrong));row.acceptedPeer.receiptSha256=sha(bytes);row.acceptedPeer.receiptSizeBytes=bytes.length;
 assert.throws(()=>validate(rows,second.doc,{extra:new Map([[row.acceptedPeer.receiptPath,bytes]])}),/peer reviewed exact before\/after source/);
});

test('new test modules remain additive dynamic entries and cannot replace a missing R5 source',()=>{
 const rows=currentBefore();rows.push({path:'tests/new-dynamic-current.test.mjs',sha256:'e'.repeat(64),sizeBytes:123});
 assert.deepEqual(validate(rows).acceptedTransitions,[]);
 assert.throws(()=>validate(rows.filter(row=>row.path!==r5.entries[0].path)),/R5 test source remains present/);
});


test('the migration document is fixed by raw SHA and size and cannot be edited in place',()=>{
 assert.equal(transitionBytes.length,TEST_SOURCE_MIGRATIONS_SIZE_BYTES);
 assert.equal(sha(transitionBytes),TEST_SOURCE_MIGRATIONS_SHA256);
 assert.equal(TEST_SOURCE_MIGRATIONS_PATH,'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v9.json');
 assert.equal(pending.accepted,false);
 assert.equal(pending.status,'PENDING_SYNTHETIC_TEST_ONLY');
 assert(pending.transitions.every(row=>row.candidateStatus==='PENDING_SYNTHETIC_TEST_ONLY'&&row.acceptedPeer===null));
 const edited=Buffer.from(transitionBytes);edited[0]^=1;
 assert.throws(()=>parsePinnedTestSourceMigrationDocument(edited),/exact fixed R8 test-source migration document/);
});

test('unscoped migration paths, wrong peer receipt hashes and altered scope are rejected',()=>{
 const outOfScope=structuredClone(pending);outOfScope.transitions[0].path='tests/foreign.test.mjs';
 assert.throws(()=>validate(currentBefore(),outOfScope),/unique transition for an original R5 path/);
 const rows=setAfter(currentBefore(),system);
 const wrongHash=syntheticAccepted();let row=wrongHash.doc.transitions.find(candidate=>candidate.path===system.path);
 row.acceptedPeer.receiptSha256='f'.repeat(64);
 assert.throws(()=>validate(rows,wrongHash.doc,{extra:new Map([[row.acceptedPeer.receiptPath,wrongHash.bytes]])}),/peer receipt bytes/);
 const wrongScope=syntheticAccepted();row=wrongScope.doc.transitions.find(candidate=>candidate.path===system.path);
 const receipt=JSON.parse(wrongScope.bytes.toString('utf8'));receipt.proofScope.kind='unrelated scope';
 const changed=Buffer.from(JSON.stringify(receipt));row.acceptedPeer.receiptSha256=sha(changed);row.acceptedPeer.receiptSizeBytes=changed.length;
 assert.throws(()=>validate(rows,wrongScope.doc,{extra:new Map([[row.acceptedPeer.receiptPath,changed]])}),/peer reviewed exact bounded scope/);
});

test('peer-approved code pins are also checked against physical postimage bytes',()=>{
 const accepted=syntheticAccepted();const row=accepted.doc.transitions.find(candidate=>candidate.path===system.path);
 const rows=setAfter(currentBefore(),system);
 const wrongCode=path=>{const actual=readCode(path);return path===system.codeProof[0]?.path?Buffer.concat([actual,Buffer.from('changed')]):actual;};
 assert.throws(()=>validate(rows,accepted.doc,{extra:new Map([[row.acceptedPeer.receiptPath,accepted.bytes]]),readCode:wrongCode}),/scoped code proof bytes/);
});


test('all original 200 test names remain members of the immutable 217-entry R5 roster',()=>{
 assert.equal(original200.entries.length,200);
 assert.equal(new Set(original200.entries).size,200);
 const r5Names=new Set(r5.entries.map(row=>row.path));
 assert(original200.entries.every(path=>r5Names.has(path)));
 assert.equal(r5.entries.length,217);
});


// Explicit synthetic raw-parent/raw-child fixture. These local constants are
// patched exactly as the original test patched the single synthetic V8 pin.
// Production CoreV2 retains the genuine immutable V8 and final V9 constants.
function writeSyntheticV9Fixture(root,inputDocument){
 const evidenceDir='research/class-mapping-ci-sharding-v1/test-source-transition-v1';
 const write=(path,bytes)=>{const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);};
 const parent=structuredClone(inputDocument);
 parent.artifactType='finite R7 test-source transitions for immutable R5 roster';
 delete parent.ancestry;delete parent.revisions;delete parent.ledgerPath;
 const parentBytes=Buffer.from(JSON.stringify(parent,null,2)+'\n');
 const doc=structuredClone(inputDocument);
 doc.artifactType='finite R8 test-source transitions for immutable R5 roster';
 doc.ledgerPath=`${evidenceDir}/migrations-v9.json`;
 doc.ancestry={parent:{path:`${evidenceDir}/migrations-v8.json`,sha256:sha(parentBytes),sizeBytes:parentBytes.length},parentTransitionCount:parent.transitions.length,proofPreimages:[]};
 doc.revisions=[];
 const docBytes=Buffer.from(JSON.stringify(doc,null,2)+'\n');
 write(`${evidenceDir}/migrations-v8.json`,parentBytes);write(doc.ledgerPath,docBytes);
 let core=readFileSync(resolve(proposedRoot,'tools/class-mapping-test-sharding-core-v2.mjs'),'utf8');
 core=core.replace(/export const TEST_SOURCE_MIGRATIONS_SHA256 = '[a-f0-9]{64}';/,`export const TEST_SOURCE_MIGRATIONS_SHA256 = '${sha(docBytes)}';`)
  .replace(/export const TEST_SOURCE_MIGRATIONS_SIZE_BYTES = [0-9]+;/,`export const TEST_SOURCE_MIGRATIONS_SIZE_BYTES = ${docBytes.length};`)
  .replace(/export const R7_PARENT_MIGRATIONS_SHA256 = '[a-f0-9]{64}';/,`export const R7_PARENT_MIGRATIONS_SHA256 = '${sha(parentBytes)}';`)
  .replace(/export const R7_PARENT_MIGRATIONS_SIZE_BYTES = [0-9]+;/,`export const R7_PARENT_MIGRATIONS_SIZE_BYTES = ${parentBytes.length};`);
 const corePath=join(root,'tools/class-mapping-test-sharding-core-v2.mjs');
 write('tools/class-mapping-test-sharding-core-v2.mjs',core);
 write('tools/class-mapping-test-source-lineage-v2.mjs',readFileSync(resolve(proposedRoot,'tools/class-mapping-test-source-lineage-v2.mjs')));
 return corePath;
}

function buildAcceptedCollectRosterFixture(){
 const root=mkdtempSync(join(tmpdir(),'r7-codeproof-scope-'));
 try{
  const copy=(source,target)=>{mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);};
  const write=(path,bytes)=>{const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);};
  const beforePaths=new Map(fixedDocument.transitions.map(row=>[row.path,row.before.fixturePath]));
  for(const row of r5.entries){
   const source=resolve(proposedRoot,beforePaths.get(row.path)??row.path);
   const bytes=readFileSync(source);
   assert.equal(sha(bytes),row.sha256,`exact R5 setup source ${row.path}`);
   assert.equal(bytes.length,row.sizeBytes,`exact R5 setup size ${row.path}`);
   copy(source,join(root,row.path));
  }
  copy(resolve(proposedRoot,'research/class-mapping-history-v1/original-top-level-test-entries-v1.json'),join(root,'research/class-mapping-history-v1/original-top-level-test-entries-v1.json'));
  copy(resolve(proposedRoot,'research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json'),join(root,'research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json'));
  copy(resolve(proposedRoot,'tests/source-frame-systemic-consumer.test.mjs'),join(root,'tests/source-frame-systemic-consumer.test.mjs'));
  copy(resolve(proposedRoot,'tests/source-frame-systemic-native-s1-current-v1.test.mjs'),join(root,'tests/source-frame-systemic-native-s1-current-v1.test.mjs'));
  copy(resolve(proposedRoot,'tests/helpers/source-frame-systemic-mm-inputs-v1.mjs'),join(root,'tests/helpers/source-frame-systemic-mm-inputs-v1.mjs'));
  write('research/class-mapping-history-v1/synthetic-provider-v1.mjs',Buffer.from('export const fixtureProvider = true;\n'));
  write('research/class-mapping-history-v1/synthetic-typed-manifest-v1.json',Buffer.from('{"schemaVersion":1,"artifactType":"synthetic typed history proof"}\n'));
  const base=structuredClone(system);
  const evidenceDir='research/class-mapping-ci-sharding-v1/test-source-transition-v1';
  copy(resolve(proposedRoot,base.before.fixturePath),join(root,base.before.fixturePath));
  const localPin=path=>{const b=readFileSync(join(root,path));return {path,sha256:sha(b),sizeBytes:b.length};};
  const proof=[
   {...localPin('tests/source-frame-systemic-consumer.test.mjs'),role:'transformed historical test source'},
   {...localPin('tests/source-frame-systemic-native-s1-current-v1.test.mjs'),role:'current S1 companion source'},
   {...localPin('tests/helpers/source-frame-systemic-mm-inputs-v1.mjs'),role:'finite historical fixture reader'},
   {...localPin('research/class-mapping-history-v1/synthetic-provider-v1.mjs'),role:'synthetic historical provider'},
   {...localPin('research/class-mapping-history-v1/synthetic-typed-manifest-v1.json'),role:'synthetic typed JSON manifest'}
  ];
  base.candidateStatus='ACCEPTED';base.codeProof=proof;
  const doc=structuredClone(pending);doc.status='ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITIONS';doc.accepted=true;doc.transitions=[base];doc.transitionCount=1;
  const receipt={schemaVersion:1,status:'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITION',reviewer:{id:'synthetic-independent-peer',role:'independent'},authorId:base.authorId,subject:{path:base.path,before:base.before,after:base.after},beforeFixture:{path:base.before.fixturePath,sha256:base.before.fixtureSha256,sizeBytes:base.before.fixtureSizeBytes},proposal:base.proposal,proofScope:base.proofScope,codeProof:base.codeProof};
  const receiptPath=`${evidenceDir}/peer-receipts/synthetic-only.json`,receiptBytes=Buffer.from(JSON.stringify(receipt));
  base.acceptedPeer={reviewerId:receipt.reviewer.id,receiptPath,receiptSha256:sha(receiptBytes),receiptSizeBytes:receiptBytes.length};
  write(receiptPath,receiptBytes);
  const corePath=writeSyntheticV9Fixture(root,doc);
  return {root,corePath,document:doc,baseTransition:base,proof,cleanup:()=>rmSync(root,{recursive:true,force:true})};
 }catch(error){rmSync(root,{recursive:true,force:true});throw error;}
}
async function collectFromFixture(fixture){
 const mod=await import(`${pathToFileURL(fixture.corePath).href}?run=${randomUUID()}`);
 return mod.collectRoster(fixture.root);
}
function migrationWithProofPath(fixture,path,role,sha256,sizeBytes){
 const doc=structuredClone(fixture.document),row=doc.transitions[0];
 const index=row.codeProof.findIndex(item=>item.role===role);
 assert.notEqual(index,-1);
 row.codeProof[index]={path,role,sha256,sizeBytes};
 const receipt={schemaVersion:1,status:'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITION',reviewer:{id:'synthetic-independent-peer',role:'independent'},authorId:row.authorId,subject:{path:row.path,before:row.before,after:row.after},beforeFixture:{path:row.before.fixturePath,sha256:row.before.fixtureSha256,sizeBytes:row.before.fixtureSizeBytes},proposal:row.proposal,proofScope:row.proofScope,codeProof:row.codeProof};
 const bytes=Buffer.from(JSON.stringify(receipt)),receiptPath=row.acceptedPeer.receiptPath;
 row.acceptedPeer={reviewerId:receipt.reviewer.id,receiptPath,receiptSha256:sha(bytes),receiptSizeBytes:bytes.length};
 writeFileSync(join(fixture.root,receiptPath),bytes);
 writeSyntheticV9Fixture(fixture.root,doc);
}

test('collectRoster physically rehashes an allowed historical provider and typed JSON manifest',async()=>{
 const fixture=buildAcceptedCollectRosterFixture();
 try{
  const roster=await collectFromFixture(fixture);
  assert.equal(roster.topLevelFileCount,218);
  assert.equal(roster.mainFileCount,217);
  assert(roster.entries.some(row=>row.path==='tests/source-frame-systemic-native-s1-current-v1.test.mjs'));
  assert.equal(roster.entries.find(row=>row.path===system.path).sha256,system.after.sha256);
  assert(fixture.proof.some(row=>row.path==='research/class-mapping-history-v1/synthetic-provider-v1.mjs'));
  assert(fixture.proof.some(row=>row.path==='research/class-mapping-history-v1/synthetic-typed-manifest-v1.json'));
 }finally{fixture.cleanup();}
});

test('collectRoster rejects foreign research paths, traversal, and symlink codeproof files',async()=>{
 const fixture=buildAcceptedCollectRosterFixture();
 try{
  const provider=fixture.proof.find(row=>row.role==='synthetic historical provider');
  const foreignPath='research/foreign-scope/provider.mjs';
  const foreignBytes=readFileSync(join(fixture.root,provider.path));mkdirSync(dirname(join(fixture.root,foreignPath)),{recursive:true});writeFileSync(join(fixture.root,foreignPath),foreignBytes);
  migrationWithProofPath(fixture,foreignPath,provider.role,sha(foreignBytes),foreignBytes.length);
  await assert.rejects(()=>collectFromFixture(fixture),/allowed pinned proof path/);

  const traversal='research/class-mapping-history-v1/../../tests/source-frame-systemic-consumer.test.mjs';
  const testBytes=readFileSync(join(fixture.root,'tests/source-frame-systemic-consumer.test.mjs'));
  migrationWithProofPath(fixture,traversal,provider.role,sha(testBytes),testBytes.length);
  await assert.rejects(()=>collectFromFixture(fixture),/proof path is relative without traversal/);

  const linkPath='research/class-mapping-history-v1/provider-symlink.mjs';
  symlinkSync('synthetic-provider-v1.mjs',join(fixture.root,linkPath));
  const providerBytes=readFileSync(join(fixture.root,provider.path));
  migrationWithProofPath(fixture,linkPath,provider.role,sha(providerBytes),providerBytes.length);
  await assert.rejects(()=>collectFromFixture(fixture),/regular proof file/);
 }finally{fixture.cleanup();}
});

test('collectRoster rejects physical tampering of either pinned history-prefix dependency',async()=>{
 const fixture=buildAcceptedCollectRosterFixture();
 try{
  const providerPath=join(fixture.root,'research/class-mapping-history-v1/synthetic-provider-v1.mjs');
  const manifestPath=join(fixture.root,'research/class-mapping-history-v1/synthetic-typed-manifest-v1.json');
  const provider=readFileSync(providerPath),manifest=readFileSync(manifestPath);
  writeFileSync(providerPath,Buffer.concat([provider,Buffer.from('\n')]));
  await assert.rejects(()=>collectFromFixture(fixture),/scoped code proof bytes research\/class-mapping-history-v1\/synthetic-provider-v1\.mjs/);
  writeFileSync(providerPath,provider);
  writeFileSync(manifestPath,Buffer.concat([manifest,Buffer.from(' ')]));
  await assert.rejects(()=>collectFromFixture(fixture),/scoped code proof bytes research\/class-mapping-history-v1\/synthetic-typed-manifest-v1\.json/);
 }finally{fixture.cleanup();}
});

// Additional current R8 lineage/global-closure controls; original 16 names above remain.
{
const root=proposedRoot;
const fixture=proposedRoot;
const evidenceDir='research/class-mapping-ci-sharding-v1/test-source-transition-v1';
const parent=parentDocument;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const rowHash=row=>sha(Buffer.from(canonical(row)));
const currentRead=path=>readFileSync(resolve(fixture,path));
const oldProofFixtures=new Map(fixedDocument.ancestry.proofPreimages.map(pin=>[pin.path,pin.fixturePath]));
const read=path=>currentRead(oldProofFixtures.get(path)??path);
function inherited(){return {...structuredClone(parent),artifactType:'finite R8 test-source transitions for immutable R5 roster',ledgerPath:`${evidenceDir}/migrations-v9.json`,ancestry:{parent:{path:`${evidenceDir}/migrations-v8.json`},parentTransitionCount:parent.transitions.length,proofPreimages:structuredClone(fixedDocument.ancestry.proofPreimages)},revisions:[]};}
function validate(doc,extra=new Map()){
 const reader=path=>extra.has(path)?extra.get(path):read(path);
 return validateR8TransitionLineage({document:doc,parentDocument:parent,readFixture:reader,readEvidence:reader,readCode:currentRead});
}
function receiptFor(row,revision){return {schemaVersion:1,status:'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITION',reviewer:{id:'synthetic-independent-lineage-reviewer',role:'independent'},authorId:row.authorId,subject:{path:row.path,before:row.before,after:row.after},beforeFixture:{path:row.before.fixturePath,sha256:row.before.fixtureSha256,sizeBytes:row.before.fixtureSizeBytes},proposal:row.proposal,proofScope:row.proofScope,codeProof:row.codeProof,revision:Object.fromEntries(Object.entries(revision).filter(([key])=>key!=='effectiveRowSha256'))};}
function attach(doc,row,revision,extra,mutateReceipt=()=>{}){
 const receipt=structuredClone(receiptFor(row,revision));mutateReceipt(receipt);
 const bytes=Buffer.from(JSON.stringify(receipt));
 const path=`${evidenceDir}/receipts/synthetic-lineage-only.json`;
 row.acceptedPeer={reviewerId:receipt.reviewer.id,receiptPath:path,receiptSha256:sha(bytes),receiptSizeBytes:bytes.length};
 revision.effectiveRowSha256=rowHash(row);extra.set(path,bytes);
 if(!doc.revisions.includes(revision))doc.revisions.push(revision);
}
function rebind(){
 const doc=inherited(),row=doc.transitions[0],old=parent.transitions[0],extra=new Map();
 row.codeProof.at(-1).sha256='a'.repeat(64);
 const revision={transitionId:row.id,parentTransitionId:row.id,parentRowSha256:rowHash(old),kind:'code-proof-rebind',authorId:'synthetic-integration-author',previousAfter:structuredClone(old.after)};
 attach(doc,row,revision,extra);
 return {doc,row,revision,extra,old};
}

test('genuine immutable V8 ancestry retains all 18 original accepted receipts',()=>{
 assert.deepEqual(validate(inherited()),{parentTransitions:18,effectiveTransitions:18,unchangedInheritedTransitions:18,revisedTransitions:0});
});
test('an explicitly bound synthetic shared-proof rebind is admitted once',()=>{
 const f=rebind();assert.equal(validate(f.doc,f.extra).revisedTransitions,1);
});
test('a missing parent row, changed original before pin and fabricated unchanged revision are rejected',()=>{
 const missing=inherited();missing.transitions.shift();missing.transitionCount--;assert.throws(()=>validate(missing),/preserved original R7 row/);
 const before=inherited();before.transitions[0].before.sha256='b'.repeat(64);assert.throws(()=>validate(before),/preserved original R7 row/);
 const fake=inherited();fake.revisions=[{transitionId:fake.transitions[0].id}];assert.throws(()=>validate(fake),/unchanged row has no fabricated revision/);
});
test('unlisted revisions and wrong parent/effective row hashes fail closed',()=>{
 const f=rebind();f.doc.revisions=[];assert.throws(()=>validate(f.doc,f.extra),/requires explicit revision/);
 const wrong=rebind();wrong.revision.parentRowSha256='c'.repeat(64);assert.throws(()=>validate(wrong.doc,wrong.extra),/exact original R7 row predecessor/);
 const after=rebind();after.revision.effectiveRowSha256='d'.repeat(64);assert.throws(()=>validate(after.doc,after.extra),/exact effective revised row/);
});
test('proof-only revisions cannot change test bytes or semantic proof scope',()=>{
 const f=rebind();f.row.after.sha256='e'.repeat(64);attach(f.doc,f.row,f.revision,f.extra);assert.throws(()=>validate(f.doc,f.extra),/preserves test bytes/);
 const scope=rebind();scope.row.proofScope.kind='unrelated changed semantics';attach(scope.doc,scope.row,scope.revision,scope.extra);assert.throws(()=>validate(scope.doc,scope.extra),/preserves source subject and semantic scope/);
});
test('source revisions require genuine R7 predecessor bytes independently of the R5 fixture',()=>{
 const f=rebind();f.row.after={sha256:'f'.repeat(64),sizeBytes:11};f.revision.kind='source-revision';
 const bytes=read(f.old.path);const path=`${evidenceDir}/fixtures/synthetic-r7-predecessor.mjs`;
 f.revision.beforeFixture={path,sha256:sha(bytes),sizeBytes:bytes.length};f.extra.set(path,bytes);attach(f.doc,f.row,f.revision,f.extra);
 assert.equal(validate(f.doc,f.extra).revisedTransitions,1);
 f.extra.set(path,Buffer.concat([bytes,Buffer.from('changed')]));assert.throws(()=>validate(f.doc,f.extra),/exact R7 predecessor fixture bytes/);
});
test('revision reviewers are independent and their receipts bind the exact lineage',()=>{
 const f=rebind();attach(f.doc,f.row,f.revision,f.extra,receipt=>{receipt.revision.previousAfter.sha256='0'.repeat(64);});
 assert.throws(()=>validate(f.doc,f.extra),/peer binds exact revision lineage/);
 const author=rebind();author.revision.authorId=author.row.acceptedPeer.reviewerId;attach(author.doc,author.row,author.revision,author.extra);assert.throws(()=>validate(author.doc,author.extra),/independent revision reviewer/);
});
test('historical peer bytes remain required after a current proof rebind',()=>{
 const f=rebind();const path=f.old.acceptedPeer.receiptPath;f.extra.set(path,Buffer.concat([read(path),Buffer.from(' ')]));assert.throws(()=>validate(f.doc,f.extra),/historical peer receipt bytes/);
});
test('parent cycles and duplicate revision IDs are rejected',()=>{
 const cycle=inherited();cycle.ancestry.parent.path=cycle.ledgerPath;assert.throws(()=>validate(cycle),/parent cycle/);
 const duplicate=rebind();duplicate.doc.revisions.push(structuredClone(duplicate.revision));assert.throws(()=>validate(duplicate.doc,duplicate.extra),/unique explicit revision/);
});
test('all genuine V8 global proof pins match their actual R7 physical bytes',()=>{
 const result=validateGlobalCodeProof({transitions:parent.transitions,readCode:read});assert.equal(result.transitionCount,18);assert(result.distinctPhysicalProofPaths>30);
});
test('simultaneous conflicts, duplicate row paths and stale current bytes are rejected',()=>{
 const conflict=structuredClone(parent.transitions);const shared='research/class-mapping-history-v1/replay-tools/mm-current-cli-replay-v1.mjs';
 const consumers=conflict.filter(row=>row.codeProof.some(pin=>pin.path===shared));assert.equal(consumers.length,11);consumers[0].codeProof.find(pin=>pin.path===shared).sha256='1'.repeat(64);
 assert.throws(()=>validateGlobalCodeProof({transitions:conflict,readCode:read}),/conflicting simultaneous proof pin/);
 const duplicate=structuredClone(parent.transitions);duplicate[0].codeProof.push({...duplicate[0].codeProof[0]});assert.throws(()=>validateGlobalCodeProof({transitions:duplicate,readCode:read}),/duplicate proof path/);
 assert.throws(()=>validateGlobalCodeProof({transitions:parent.transitions,readCode:path=>path===shared?currentRead(path):read(path)}),/current global proof bytes/);
});

test('a changed shared path cannot lose its genuine R7 proof preimage',()=>{
 const doc=inherited();assert(doc.ancestry.proofPreimages.length>0);
 doc.ancestry.proofPreimages.shift();
 assert.throws(()=>validate(doc),/current global proof bytes/);
 const tampered=inherited();
 const pin=tampered.ancestry.proofPreimages[0];pin.sha256='2'.repeat(64);
 assert.throws(()=>validate(tampered),/unique exact parent proof preimage/);
});
test('the complete effective current proof set matches all actual R8 physical bytes',()=>{
 const result=validateGlobalCodeProof({transitions:fixedDocument.transitions,readCode:currentRead});
 assert.equal(result.transitionCount,fixedDocument.transitionCount);
 assert.equal(result.distinctPhysicalProofPaths,new Set(fixedDocument.transitions.flatMap(row=>row.codeProof.map(pin=>pin.path))).size);
});
test('a newly admitted original row binds its exact unchanged R5 and genuine R7 predecessor roles',()=>{
 const parentIds=new Set(parent.transitions.map(row=>row.id));
 const source=fixedDocument.transitions.find(row=>!parentIds.has(row.id));
 assert(source,'the reviewed support-twin correction is a new original-source admission');
 const doc=inherited(),row=structuredClone(source),extra=new Map();
 const originalRevision=fixedDocument.revisions.find(revision=>revision.transitionId===row.id);
 const revision=structuredClone(originalRevision);
 doc.transitions.push(row);doc.transitionCount=doc.transitions.length;
 attach(doc,row,revision,extra);
 assert.deepEqual(revision.previousAfter,{sha256:row.before.sha256,sizeBytes:row.before.sizeBytes});
 assert.equal(validate(doc,extra).effectiveTransitions,parent.transitions.length+1);
});
test('a new original row cannot invent a distinct unlisted R7 predecessor',()=>{
 const parentIds=new Set(parent.transitions.map(row=>row.id));
 const source=fixedDocument.transitions.find(row=>!parentIds.has(row.id));
 assert(source);
 const doc=inherited(),row=structuredClone(source),extra=new Map();
 const revision=structuredClone(fixedDocument.revisions.find(revision=>revision.transitionId===row.id));
 revision.previousAfter={sha256:'3'.repeat(64),sizeBytes:row.before.sizeBytes};
 doc.transitions.push(row);doc.transitionCount=doc.transitions.length;
 attach(doc,row,revision,extra);
 assert.throws(()=>validate(doc,extra),/new original row predecessor equals unchanged R5 source/);
});

}

// Exact nine independently reviewed child-IO V3 control bodies, active in current CI.
{

test('detaches local and genuine foreign-realm plain argv/options into local snapshots',()=>{
 const foreign=vm.runInNewContext('({argv:["git","show","a29:path"],options:{cwd:"/repo",encoding:"utf8",maxBuffer:33554432}})');
 const argv=detachedArgvForChildV3(foreign.argv),options=detachedChildOptionsForChildV3(foreign.options);
 assert.deepEqual(argv,['git','show','a29:path']);assert.equal(Object.getPrototypeOf(argv),Array.prototype);
 assert.deepEqual(options,{cwd:'/repo',encoding:'utf8',maxBuffer:33554432});assert.equal(Object.getPrototypeOf(options),Object.prototype);
 foreign.argv[0]='node';foreign.options.cwd='/changed';assert.equal(argv[0],'git');assert.equal(options.cwd,'/repo');
 assert.deepEqual(detachedArgvForChildV3(['git','show','a29:path']),['git','show','a29:path']);
 assert.deepEqual(detachedChildOptionsForChildV3({cwd:'/repo',stdio:'ignore',input:'abc'}),{cwd:'/repo',stdio:'ignore',input:'abc'});
});

test('accepts only an undecorated file URL for cwd and detaches it to a path string',()=>{
 const url=pathToFileURL('/tmp/mm-r7-root');assert.equal(detachedChildOptionsForChildV3({cwd:url}).cwd,fileURLToPath(url));
 const decorated=pathToFileURL('/tmp/mm-r7-root');decorated.extra='x';
 assert.throws(()=>detachedChildOptionsForChildV3({cwd:decorated}),/Typed historical child option required/);
 assert.throws(()=>detachedChildOptionsForChildV3({cwd:new URL('https://example.invalid/root')}),/Typed historical child option required/);
});

test('keeps array prototype, density, own-data and closed-size checks',()=>{
 assert.throws(()=>detachedArgvForChildV3(new Proxy(['git'],{getOwnPropertyDescriptor(){throw Error('trap executed');}})),/Plain bounded historical argv required/);
 const sparse=['git'];delete sparse[0];assert.throws(()=>detachedArgvForChildV3(sparse),/Dense bounded historical argv required/);
 const accessor=['git'];Object.defineProperty(accessor,'0',{get(){throw Error('getter executed');},enumerable:true,configurable:true});
 assert.throws(()=>detachedArgvForChildV3(accessor),/Own historical argv string data required/);
 const extra=['git'];extra.extra='x';assert.throws(()=>detachedArgvForChildV3(extra),/Dense bounded historical argv required/);
 const symbol=['git'];symbol[Symbol('hidden')]='x';assert.throws(()=>detachedArgvForChildV3(symbol),/Dense bounded historical argv required/);
 const subclass=vm.runInNewContext('class ChildArgs extends Array {}; const value=new ChildArgs(); value.push("git"); value');
 assert.throws(()=>detachedArgvForChildV3(subclass),/Plain bounded historical argv required/);
 const custom=['git'];Object.setPrototypeOf(custom,Object.create(Array.prototype));
 assert.throws(()=>detachedArgvForChildV3(custom),/Plain bounded historical argv required/);
 assert.throws(()=>detachedArgvForChildV3([]),/Dense bounded historical argv required/);
 assert.throws(()=>detachedArgvForChildV3(Array.from({length:17},()=> 'x')),/Dense bounded historical argv required/);
});

test('keeps child-option realm/proxy/prototype/descriptor/closed-key guards',()=>{
 let proxyTraps=0;const proxy=new Proxy({cwd:'/repo'},{ownKeys(){proxyTraps++;throw Error('trap executed');}});
 assert.throws(()=>detachedChildOptionsForChildV3(proxy),/Plain historical child options required/);assert.equal(proxyTraps,0);
 const accessor={};Object.defineProperty(accessor,'cwd',{get(){throw Error('getter executed');},enumerable:true});
 assert.throws(()=>detachedChildOptionsForChildV3(accessor),/Closed historical child data options required/);
 assert.throws(()=>detachedChildOptionsForChildV3(null),/Plain historical child options required/);
 assert.throws(()=>detachedChildOptionsForChildV3(Object.create(null)),/Plain historical child options required/);
 assert.throws(()=>detachedChildOptionsForChildV3(Object.assign(Object.create({}),{cwd:'/repo'})),/Plain historical child options required/);
 assert.throws(()=>detachedChildOptionsForChildV3(new (class ChildOptions {constructor(){this.cwd='/repo';}})()),/Plain historical child options required/);
 const forgedProto=Object.create(null);Object.defineProperty(forgedProto,'constructor',{value:Object,writable:true,configurable:true});
 const forged=Object.assign(Object.create(forgedProto),{cwd:'/repo'});
 assert.throws(()=>detachedChildOptionsForChildV3(forged),/Plain historical child options required/);
 const extra={cwd:'/repo'};extra[Symbol('hidden')]='x';assert.throws(()=>detachedChildOptionsForChildV3(extra),/Closed historical child data options required/);
 assert.throws(()=>detachedChildOptionsForChildV3({cwd:'/repo',env:{PATH:'/tmp'}}),/Closed historical child data options required/);
});

test('preserves option value bounds and safe I/O subset',()=>{
 assert.equal(detachedChildOptionsForChildV3({maxBuffer:1}).maxBuffer,1);
 assert.equal(detachedChildOptionsForChildV3({maxBuffer:150*1024*1024}).maxBuffer,150*1024*1024);
 for(const maxBuffer of [0,-1,1.5,Number.MAX_SAFE_INTEGER,150*1024*1024+1])assert.throws(()=>detachedChildOptionsForChildV3({maxBuffer}),/Typed historical child option required/);
 for(const encoding of ['utf8','utf-8'])assert.equal(detachedChildOptionsForChildV3({encoding}).encoding,encoding);
 assert.throws(()=>detachedChildOptionsForChildV3({encoding:'latin1'}),/UTF8 historical child encoding required/);
 for(const stdio of ['pipe','ignore'])assert.equal(detachedChildOptionsForChildV3({stdio}).stdio,stdio);
 for(const stdio of ['inherit','ipc',[]])assert.throws(()=>detachedChildOptionsForChildV3({stdio}),/Typed historical child option required/);
 for(const input of ['abc',''])assert.equal(detachedChildOptionsForChildV3({input}).input,input);
 assert.throws(()=>detachedChildOptionsForChildV3({input:Buffer.from('abc')}),/Typed historical child option required/);
});

function fakeConstructorWithAccessors(getters){
 const fake=()=>{};
 for(const key of ['name','length','prototype']){
  Object.defineProperty(fake,key,{configurable:true,get(){getters[key]++;return key==='name'?'Object':key==='length'?1:Object.prototype;}});
 }
 return fake;
}

test('rejects forged Object.prototype-like inputs without evaluating name, length, or prototype accessors',()=>{
 const getters={name:0,length:0,prototype:0};
 const forgedPrototype=Object.create(null);
 Object.defineProperty(forgedPrototype,'constructor',{value:fakeConstructorWithAccessors(getters),writable:true,configurable:true,enumerable:false});
 const options=Object.assign(Object.create(forgedPrototype),{cwd:'/repo'});
 assert.throws(()=>detachedChildOptionsForChildV3(options),/Plain historical child options required/);
 assert.deepEqual(getters,{name:0,length:0,prototype:0});
});

test('rejects forged Array.prototype-like inputs without evaluating constructor accessors',()=>{
 const getters={name:0,length:0,prototype:0};
 const forgedArrayPrototype=[];
 Object.setPrototypeOf(forgedArrayPrototype,Object.prototype);
 Object.defineProperty(forgedArrayPrototype,'constructor',{value:fakeConstructorWithAccessors(getters),writable:true,configurable:true,enumerable:false});
 const args=['git','show','a29:path'];
 Object.setPrototypeOf(args,forgedArrayPrototype);
 assert.throws(()=>detachedArgvForChildV3(args),/Plain bounded historical argv required/);
 assert.deepEqual(getters,{name:0,length:0,prototype:0});
});

test('still accepts genuine foreign-realm Object and Array intrinsics',()=>{
 const foreign=vm.runInNewContext('({options:{cwd:"/repo"},argv:["git","show","a29:path"]})');
 assert.deepEqual(detachedChildOptionsForChildV3(foreign.options),{cwd:'/repo'});
 assert.deepEqual(detachedArgvForChildV3(foreign.argv),['git','show','a29:path']);
});

test('rejects a forged realm prototype without evaluating constructor accessors',()=>{
  let nameGets=0;
  const forgedConstructor=function fakeObject(){};
  Object.defineProperty(forgedConstructor,'name',{configurable:true,get(){nameGets++;return 'Object';}});
  const forgedPrototype=Object.create(null);
  Object.defineProperty(forgedPrototype,'constructor',{value:forgedConstructor,writable:true,configurable:true,enumerable:false});
  const options=Object.assign(Object.create(forgedPrototype),{cwd:'/repo'});
  assert.throws(()=>detachedChildOptionsForChildV3(options),/Plain historical child options required/);
  assert.equal(nameGets,0,'Caller-supplied constructor name accessor must not execute while rejecting an input');
});
}
