// Finite current callback admission; frozen R8 rows and receipts remain unchanged.
import {createHash} from 'node:crypto';

const SOURCE='tests/coverage-gaps.test.mjs';
const TRANSITION='mm-transport-coverage-gaps';
const RUNTIME='research/class-mapping-history-v1/replay-tools/refresh-gaps-handoff-mm-v2.mjs';
const PREFIX='research/class-mapping-ci-sharding-v1/test-source-transition-v1/';
const ACCEPTED='ACCEPTED_FINITE_R9_CALLBACK_SOURCE_AND_PROOF_OVERRIDE';
const ARTIFACT='finite R9 callback source and shared-proof override';
const R8_CANONICAL='6171bdac2feb2361474d5e895780a19c9a4c1820fd5ab5f29d805619d2cb0e6e';
const R5_ENTRIES_CANONICAL='a0def9dba24caccd59baa11fd5dc621f35e807fb2d4b5dfdd0381567cc313807';
const PARENT={
 commit:'a15b84838439562ea380c444caa15205d3c8e680',
 tree:'9f3fc84368ae4f38ab1b0d6905db7fbd7007a6b4',
 ledger:{path:PREFIX+'migrations-v9.json',sha256:'a0622ae8c713abaa6c31f17563c02f01e4f94313f2ec9e6feb23c3731d431e10',sizeBytes:353215},
 core:{path:'tools/class-mapping-test-sharding-core-v2.mjs',sha256:'9f389ea215ebf14525e202265ec4acc5bc2c098c6e3a3fab46144eac264de951',sizeBytes:25673},
 registry:{path:'research/class-mapping-ci-sharding-v1/code-pins-v2.json',sha256:'bbe795bc1be7d4d542e32f8d4d99d5f4903a21c04efeaa00fc5c74639f87e6bd',sizeBytes:139300}
};
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>sha(Buffer.from(canonical(x)));
const same=(a,b)=>canonical(a)===canonical(b);
const fail=(ok,message)=>{if(!ok)throw Error('Finite R9 callback override: '+message);};
const pin=(a,b)=>a?.sha256===b?.sha256&&a?.sizeBytes===b?.sizeBytes;
const validPin=p=>p&&/^[a-f0-9]{64}$/.test(p.sha256)&&Number.isSafeInteger(p.sizeBytes)&&p.sizeBytes>0;
const exactKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&same(Object.keys(x).sort(),[...keys].sort());
const safeEvidence=p=>typeof p==='string'&&p.startsWith(PREFIX)&&!p.split('/').some(s=>!s||s==='.'||s==='..');
function checkedBytes(read,path,expected,label){
 const bytes=read(path);
 fail(Buffer.isBuffer(bytes)&&validPin(expected)&&bytes.length===expected.sizeBytes&&sha(bytes)===expected.sha256,label+' bytes: '+path);
 return bytes;
}
export function getR9AcceptanceSubject(companion){
 return structuredClone({
  schemaVersion:companion.schemaVersion,artifactType:companion.artifactType,
  parent:companion.parent,sourceRevisions:companion.sourceRevisions,proofRebindings:companion.proofRebindings
 });
}
export function deriveFiniteR9CallbackView({r5Entries,currentEntries,r8Document,companion,readFixture,readCode}){
 fail(typeof readFixture==='function'&&typeof readCode==='function','closed fixture and physical code readers');
 fail(exactKeys(companion,['schemaVersion','artifactType','status','accepted','parent','sourceRevisions','proofRebindings','acceptedPeer']),'closed companion shape');
 fail(companion.schemaVersion===1&&companion.artifactType===ARTIFACT,'fixed companion schema');
 fail(same(companion.parent,PARENT),'exact immutable R8 parent anchors');
 fail(Array.isArray(r5Entries)&&r5Entries.length===217&&digest(r5Entries)===R5_ENTRIES_CANONICAL,'exact immutable 217-entry R5 source roster');
 fail(r8Document&&digest(r8Document)===R8_CANONICAL,'exact immutable R8 document content');
 const rows=r8Document.transitions;
 fail(Array.isArray(rows)&&rows.length===19&&r8Document.transitionCount===19,'exact 19 R8 rows');
 const old=rows.find(row=>row.path===SOURCE&&row.id===TRANSITION);
 const revisions=companion.sourceRevisions;
 fail(Array.isArray(revisions)&&revisions.length>=1&&revisions.length<=2,'one mandatory coverage revision and optional fixed runtime revision');
 const revisionByPath=new Map(),ids=new Set();
 const oldProofPins=new Map();
 for(const row of rows)for(const p of row.codeProof){
  fail(!oldProofPins.has(p.path)||pin(oldProofPins.get(p.path),p),'consistent immutable R8 proof pin: '+p.path);
  oldProofPins.set(p.path,p);
 }
 for(const revision of revisions){
  fail(revision&&[SOURCE,RUNTIME].includes(revision.path)&&!revisionByPath.has(revision.path)&&typeof revision.id==='string'&&revision.id.trim()&&!ids.has(revision.id),'unique fixed finite source revisions');
  ids.add(revision.id);revisionByPath.set(revision.path,revision);
  const isTest=revision.path===SOURCE;
  fail(revision.kind===(isTest?'original-test-source':'runtime-code'),'exact revision kind');
  fail(isTest?(revision.id==='r9-coverage-gaps-readfile-v5'&&revision.r8TransitionId===TRANSITION&&revision.r8RowSha256===digest(old)):(revision.r8TransitionId===null&&revision.r8RowSha256===null),'exact R8 source row identity or explicit runtime role');
  const expected=isTest?old.after:oldProofPins.get(RUNTIME);
  fail(validPin(revision.before)&&pin(revision.before,expected)&&pin(revision.before,oldProofPins.get(revision.path)),'exact R8 source predecessor');
  const fixture=PREFIX+'fixtures/r9-r8-predecessor-sources/'+(isTest?'coverage-gaps.test.mjs.gz':'refresh-gaps-handoff-mm-v2.mjs.gz');
  fail(revision.before.fixturePath===fixture&&revision.before.fixtureEncoding==='gzip'&&validPin({sha256:revision.before.fixtureFileSha256,sizeBytes:revision.before.fixtureFileSizeBytes})&&revision.before.fixtureSha256===expected.sha256&&revision.before.fixtureSizeBytes===expected.sizeBytes,'exact fixed R8 predecessor fixture pin');
  checkedBytes(readFixture,fixture,expected,'R8 predecessor fixture');
  fail(exactKeys(revision.after,['sha256','sizeBytes'])&&validPin(revision.after)&&!pin(revision.after,expected),'changed exact source postimage');
  fail(typeof revision.authorId==='string'&&revision.authorId.trim()&&revision.proposal&&typeof revision.proposal.id==='string'&&revision.proposal.id.trim()&&/^[a-f0-9]{64}$/.test(revision.proposal.manifestSha256),'explicit author and proposal pin');
  fail(revision.proofScope&&typeof revision.proofScope.kind==='string'&&revision.proofScope.kind.trim(),'explicit bounded proof scope');
 }
 fail(revisionByPath.has(SOURCE),'mandatory coverage callback source revision');
 fail(same(revisions.map(r=>r.path),[...revisionByPath.keys()].sort()),'source revisions sorted by exact path');
 const revision=revisionByPath.get(SOURCE);
 fail(Array.isArray(currentEntries),'physical current source roster');
 const current=new Map();
 for(const row of currentEntries){
  fail(row&&typeof row.path==='string'&&!current.has(row.path)&&validPin(row),'unique exact physical current source path');
  current.set(row.path,row);
 }
 const oldByPath=new Map(rows.map(row=>[row.path,row]));
 const effectiveSourcePins=[];
 for(const r5 of r5Entries){
  const actual=current.get(r5.path);
  fail(actual,'original source remains present: '+r5.path);
  const expected=r5.path===SOURCE?revision.after:(oldByPath.get(r5.path)?.after??r5);
  fail(pin(actual,expected),'unlisted or incorrect original source change: '+r5.path);
  checkedBytes(readCode,r5.path,expected,'physical original source');
  effectiveSourcePins.push({path:r5.path,sha256:expected.sha256,sizeBytes:expected.sizeBytes});
 }
 const affectedConsumerIds=rows.filter(row=>row.codeProof.some(p=>revisionByPath.has(p.path))).map(row=>row.id).sort();
 fail(affectedConsumerIds.length>0,'derived finite R8 proof consumers');
 const effectiveViews=rows.map(row=>({
  transitionId:row.id,path:row.path,r8RowSha256:digest(row),
  sourceAfter:structuredClone(row.path===SOURCE?revision.after:row.after),
  codeProof:row.codeProof.map(p=>revisionByPath.has(p.path)?{...structuredClone(p),sha256:revisionByPath.get(p.path).after.sha256,sizeBytes:revisionByPath.get(p.path).after.sizeBytes}:structuredClone(p))
 }));
 fail(Array.isArray(companion.proofRebindings)&&same(companion.proofRebindings.map(x=>x?.transitionId),affectedConsumerIds),'exact sorted finite consumer rebinding set');
 const byId=new Map(effectiveViews.map(view=>[view.transitionId,view]));
 for(const binding of companion.proofRebindings){
  const view=byId.get(binding.transitionId);
  fail(exactKeys(binding,['transitionId','r8RowSha256','effectiveViewSha256'])&&binding.r8RowSha256===view.r8RowSha256,'exact immutable consumer row hash: '+binding.transitionId);
  fail(binding.effectiveViewSha256===digest(view),'exact effective consumer view hash: '+binding.transitionId);
 }
 const effectiveProofRows=effectiveViews.map(view=>({id:view.transitionId,codeProof:structuredClone(view.codeProof)}));
 const proofPins=new Map();
 for(const row of effectiveProofRows){
  const local=new Set();
  fail(Array.isArray(row.codeProof)&&row.codeProof.length>0,'nonempty effective proof');
  for(const p of row.codeProof){
   fail(p&&typeof p.path==='string'&&validPin(p)&&!local.has(p.path),'unique exact proof path in row: '+row.id);
   local.add(p.path);
   fail(!proofPins.has(p.path)||pin(proofPins.get(p.path),p),'simultaneous effective proof conflict: '+p.path);
   proofPins.set(p.path,p);
  }
 }
 fail(proofPins.size===168,'exact 168 effective physical proof paths');
 for(const [path,expected] of proofPins)checkedBytes(readCode,path,expected,'effective physical proof');
 return {effectiveViews,effectiveProofRows,effectiveSourcePins,affectedConsumerIds,acceptanceSubject:getR9AcceptanceSubject(companion)};
}
export function validateFiniteR9CallbackOverride(args){
 const {companion,readEvidence}=args;
 fail(companion?.accepted===true&&companion.status===ACCEPTED,'independent acceptance required; pending override rejected');
 const derived=deriveFiniteR9CallbackView(args),peer=companion.acceptedPeer;
 fail(typeof readEvidence==='function'&&peer&&typeof peer.reviewerId==='string'&&peer.reviewerId.trim()&&!companion.sourceRevisions.some(r=>r.authorId===peer.reviewerId),'independent acceptance reviewer required');
 fail(safeEvidence(peer.receiptPath)&&/^[a-f0-9]{64}$/.test(peer.receiptSha256)&&Number.isSafeInteger(peer.receiptSizeBytes)&&peer.receiptSizeBytes>0,'exact accepted receipt pin');
 const bytes=checkedBytes(readEvidence,peer.receiptPath,{sha256:peer.receiptSha256,sizeBytes:peer.receiptSizeBytes},'accepted receipt');
 const receipt=JSON.parse(bytes.toString('utf8'));
 fail(exactKeys(receipt,['schemaVersion','status','reviewer','authorIds','subject'])&&receipt.schemaVersion===1&&receipt.status===ACCEPTED,'accepted receipt schema and status');
 fail(exactKeys(receipt.reviewer,['id','role'])&&receipt.reviewer.id===peer.reviewerId&&receipt.reviewer.role==='independent'&&same(receipt.authorIds,[...new Set(companion.sourceRevisions.map(r=>r.authorId))].sort()),'accepted receipt reviewer and author identity');
 fail(same(receipt.subject,derived.acceptanceSubject),'accepted receipt binds exact finite source and all affected proof views');
 return derived;
}
