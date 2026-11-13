// Pure protocol tests for the finite R7 old-test-source transition guard.
// Accepted-peer fixtures below are synthetic branch checks, never real review.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,copyFileSync,writeFileSync,symlinkSync,rmSync,mkdtempSync} from 'node:fs';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {validateR5TestSourceTransitions,parsePinnedTestSourceMigrationDocument,TEST_SOURCE_MIGRATIONS_SHA256,TEST_SOURCE_MIGRATIONS_SIZE_BYTES,TEST_SOURCE_MIGRATIONS_PATH} from '../tools/class-mapping-test-sharding-core-v1.mjs';

const proposedRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const r5=JSON.parse(readFileSync(resolve(proposedRoot,'research/class-mapping-ci-sharding-v1/r5-test-roster-v1.json')));
const original200=JSON.parse(readFileSync(resolve(proposedRoot,'research/class-mapping-history-v1/original-top-level-test-entries-v1.json')));
const transitionBytes=readFileSync(resolve(proposedRoot,'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v8.json'));
const fixedDocument=parsePinnedTestSourceMigrationDocument(transitionBytes);
assert.equal(fixedDocument.accepted,true);
assert.equal(fixedDocument.status,'ACCEPTED_BOUNDED_TEST_SOURCE_TRANSITIONS');
assert.equal(fixedDocument.transitionCount,18);
assert.equal(fixedDocument.transitions.length,18);
assert(fixedDocument.transitions.every(row=>row.candidateStatus==='ACCEPTED'&&row.acceptedPeer&&row.acceptedPeer.reviewerId&&/^[a-f0-9]{64}$/.test(row.acceptedPeer.receiptSha256)&&Number.isSafeInteger(row.acceptedPeer.receiptSizeBytes)));
assert.equal(fixedDocument.acceptanceTally.boundedSourcePeerAccepted,18);
assert.equal(fixedDocument.acceptanceTally.boundedSourcePeerPending,0);
assert.equal(fixedDocument.transitions.filter(row=>row.acceptedProofClosureRebind?.reviewerId==='root').length,11);
assert.equal(fixedDocument.scopeBoundaries.dynamicNewTopLevelTests.countWithinThisTransitionPackage,3);
assert.equal(fixedDocument.scopeBoundaries.dynamicNewTopLevelTests.globalDynamicCount,'PARENT_R6_INTEGRATION_PENDING');
// All old fail-closed branches below receive a separate in-memory test fixture.
// It is never written as the pinned V8 source ledger.
const pending=structuredClone(fixedDocument);
pending.status='PENDING_SYNTHETIC_TEST_ONLY';
pending.accepted=false;
pending.acceptanceTally={accepted:false,acceptedPeerReceipts:0,boundedSourcePeerAccepted:0,boundedSourcePeerPending:18,reason:'Synthetic in-memory protocol fixture only'};
pending.globalR7ScopeBlockers.pendingIndependentPeerTransitions=pending.transitions.map(row=>({path:row.path,reason:'Synthetic in-memory protocol fixture only'}));
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
 assert.equal(TEST_SOURCE_MIGRATIONS_PATH,'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v8.json');
 assert.equal(pending.accepted,false);
 assert.equal(pending.status,'PENDING_SYNTHETIC_TEST_ONLY');
 assert(pending.transitions.every(row=>row.candidateStatus==='PENDING_SYNTHETIC_TEST_ONLY'&&row.acceptedPeer===null));
 const edited=Buffer.from(transitionBytes);edited[0]^=1;
 assert.throws(()=>parsePinnedTestSourceMigrationDocument(edited),/exact fixed R7 test-source migration document/);
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
  const documentBytes=Buffer.from(JSON.stringify(doc,null,2)+'\n');write(`${evidenceDir}/migrations-v8.json`,documentBytes);
  const coreSource=readFileSync(resolve(proposedRoot,'tools/class-mapping-test-sharding-core-v1.mjs'),'utf8');
  const documentHash=sha(documentBytes),documentSize=documentBytes.length;
  const patchedCore=coreSource
   .replace(/export const TEST_SOURCE_MIGRATIONS_SHA256 = '[a-f0-9]{64}';/,`export const TEST_SOURCE_MIGRATIONS_SHA256 = '${documentHash}';`)
   .replace(/export const TEST_SOURCE_MIGRATIONS_SIZE_BYTES = \d+;/,`export const TEST_SOURCE_MIGRATIONS_SIZE_BYTES = ${documentSize};`);
  const corePath=join(root,'tools/class-mapping-test-sharding-core-v1.mjs');mkdirSync(dirname(corePath),{recursive:true});writeFileSync(corePath,patchedCore);
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
 const docBytes=Buffer.from(JSON.stringify(doc,null,2)+'\n');writeFileSync(join(fixture.root,'research/class-mapping-ci-sharding-v1/test-source-transition-v1/migrations-v8.json'),docBytes);writeFileSync(join(fixture.root,receiptPath),bytes);
 let source=readFileSync(resolve(proposedRoot,'tools/class-mapping-test-sharding-core-v1.mjs'),'utf8');
 source=source.replace(/export const TEST_SOURCE_MIGRATIONS_SHA256 = '[a-f0-9]{64}';/,`export const TEST_SOURCE_MIGRATIONS_SHA256 = '${sha(docBytes)}';`).replace(/export const TEST_SOURCE_MIGRATIONS_SIZE_BYTES = \d+;/,`export const TEST_SOURCE_MIGRATIONS_SIZE_BYTES = ${docBytes.length};`);
 writeFileSync(fixture.corePath,source);
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
