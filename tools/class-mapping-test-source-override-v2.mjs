import {createHash} from 'node:crypto';
import {validateFiniteR9CallbackOverride} from './class-mapping-test-source-override-v1.mjs';

const PREFIX='research/class-mapping-ci-sharding-v1/test-source-transition-v1/';
const TEST='tests/pass8-citation-target-crop-history.test.mjs';
const UA='research/class-mapping-history-v1/ua-support-twin-history-v1.mjs';
const ADDED='research/class-mapping-history-v1/replay-tools/monetary-current-source-questions-mm-v2.mjs';
const PROTECTED='research/class-mapping-history-v1/replay-tools/monetary-current-source-questions.mjs';
const TEST_ID='mm-transport-pass8-citation-target-crop-history';
const ACCEPTED='ACCEPTED_FINITE_R9_EXPANDED_SOURCE_AND_PROOF_OVERRIDE';
const ARTIFACT='finite R9 expanded source and shared-proof override';
export const R9_V2_IMMUTABLE_DEPENDENCY_PROOF_ROLE='exact immutable dependency of reviewed legacy monetary callback';
export const R9_V2_ADDED_RUNTIME_PROOF_ROLE='exact added versioned dependency of reviewed legacy monetary callback';
const PRIOR={
companion:{path:PREFIX+'r9-callback-override-v1.json',sha256:'903189ff2adcb1b9b232a802fdb3138780db3703d0976f24bcc0baf277bd1ea1',sizeBytes:9059},
receipt:{path:PREFIX+'receipts/r9-independent-callback-override-v1.json',sha256:'df99d1103125a1a06703504237d70111f1dc9510055763f9ecc8d7b4d451c6c3',sizeBytes:9282},
helper:{path:'tools/class-mapping-test-source-override-v1.mjs',sha256:'6a6418f9b89eac8ed705f51e8dd99e150459755d9516b5602408f814f0c90409',sizeBytes:10789}
};
const PARENT={
commit:'a15b84838439562ea380c444caa15205d3c8e680',tree:'9f3fc84368ae4f38ab1b0d6905db7fbd7007a6b4',
ledger:{path:PREFIX+'migrations-v9.json',sha256:'a0622ae8c713abaa6c31f17563c02f01e4f94313f2ec9e6feb23c3731d431e10',sizeBytes:353215},
core:{path:'tools/class-mapping-test-sharding-core-v2.mjs',sha256:'9f389ea215ebf14525e202265ec4acc5bc2c098c6e3a3fab46144eac264de951',sizeBytes:25673},
registry:{path:'research/class-mapping-ci-sharding-v1/code-pins-v2.json',sha256:'bbe795bc1be7d4d542e32f8d4d99d5f4903a21c04efeaa00fc5c74639f87e6bd',sizeBytes:139300}
};
const DERIVED_FROM={path:PROTECTED,sha256:'f93fa8141ff8fb5edf7930e0b7052ae0ce3e6b1e9cb50fccde974f11a41d5d7f',sizeBytes:11446};
const DEPENDENCIES=[
{path:'research/class-mapping-history-v1/replay-tools/monetary-source-geometry.mjs',sha256:'a89f9681bf5e9ea24537a444ff5f3cdde0659eef90bd78ac4163b2b2ec2b8274',sizeBytes:2141},
{path:'research/class-mapping-history-v1/replay-tools/monetary-source-inventory.mjs',sha256:'3ca54d389e55efdb2c225c0e5da4564e1ce1831b641c7a02fac911a8c568f0be',sizeBytes:211101}
];
const SUPPORT=[{path:'research/class-mapping-source-epoch-v1/native-qualification-pins-v1.mjs',sha256:'c418e9deca9013edefdd57a76555886a944de2cd730cefecdb70224f1bee0c4b',sizeBytes:1533}];
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>sha(Buffer.from(canonical(x)));
const same=(a,b)=>canonical(a)===canonical(b);
const fail=(ok,message)=>{if(!ok)throw Error('Finite R9 expanded override: '+message);};
const pin=(a,b)=>a?.sha256===b?.sha256&&a?.sizeBytes===b?.sizeBytes;
const validPin=p=>p&&/^[a-f0-9]{64}$/.test(p.sha256)&&Number.isSafeInteger(p.sizeBytes)&&p.sizeBytes>0;
const exactKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&same(Object.keys(x).sort(),[...keys].sort());
const safeEvidence=p=>typeof p==='string'&&p.startsWith(PREFIX)&&!p.includes('\\')&&!p.split('/').some(s=>!s||s==='.'||s==='..');
function checkedBytes(read,path,expected,label){
const bytes=read(path);
fail(Buffer.isBuffer(bytes)&&validPin(expected)&&bytes.length===expected.sizeBytes&&sha(bytes)===expected.sha256,label+' bytes: '+path);
return bytes;
}
function authorAndScope(rev){
fail(typeof rev.authorId==='string'&&rev.authorId.trim()&&rev.proposal&&typeof rev.proposal.id==='string'&&rev.proposal.id.trim()&&/^[a-f0-9]{64}$/.test(rev.proposal.manifestSha256),'explicit author and proposal pin');
fail(rev.proofScope&&typeof rev.proofScope.kind==='string'&&rev.proofScope.kind.trim(),'explicit bounded proof scope');
}
export function getR9V2AcceptanceSubject(companion){
return structuredClone({
schemaVersion:companion.schemaVersion,artifactType:companion.artifactType,parent:companion.parent,
priorAcceptedOverride:companion.priorAcceptedOverride,sourceRevisions:companion.sourceRevisions,
addedRuntime:companion.addedRuntime,proofDependencies:companion.proofDependencies,parentSupportPins:companion.parentSupportPins,proofRebindings:companion.proofRebindings
});
}
export function deriveFiniteR9ExpandedView({r5Entries,currentEntries,r8Document,companion,readFixture,readEvidence,readCode,readParentSupport,checkTreeAbsence}){
fail(typeof readFixture==='function'&&typeof readEvidence==='function'&&typeof readCode==='function'&&typeof readParentSupport==='function'&&typeof checkTreeAbsence==='function','closed physical, fixture, evidence, parent-support and parent-tree readers');
fail(exactKeys(companion,['schemaVersion','artifactType','status','accepted','parent','priorAcceptedOverride','sourceRevisions','addedRuntime','proofDependencies','parentSupportPins','proofRebindings','acceptedPeer']),'closed companion shape');
fail(companion.schemaVersion===2&&companion.artifactType===ARTIFACT,'fixed expanded companion schema');
fail(same(companion.parent,PARENT)&&same(companion.priorAcceptedOverride,PRIOR),'exact R8 and accepted v1 anchors');
fail(same(companion.proofDependencies,DEPENDENCIES)&&same(companion.parentSupportPins,SUPPORT),'exact finite immutable dependencies and separate parent support');
const registry=JSON.parse(checkedBytes(readEvidence,PARENT.registry.path,PARENT.registry,'immutable parent Registry2').toString('utf8'));
fail(Array.isArray(registry.allCodePins)&&registry.historicalPrefixCount===175,'parent Registry2 original175 prefix');
for(const entry of [...DEPENDENCIES,...SUPPORT]){
fail(registry.allCodePins.filter(p=>p.path===entry.path).length===1&&pin(registry.allCodePins.find(p=>p.path===entry.path),entry),'dependency/support pin in immutable Registry2: '+entry.path);
}
for(const entry of DEPENDENCIES)fail(registry.allCodePins.slice(0,registry.historicalPrefixCount).some(p=>p.path===entry.path&&pin(p,entry)),'dependency remains in original175 prefix: '+entry.path);
for(const entry of SUPPORT)checkedBytes(readParentSupport,entry.path,entry,'separate parent module lineage support, not Native qualification');
const priorBytes=checkedBytes(readEvidence,PRIOR.companion.path,PRIOR.companion,'immutable accepted v1 companion');
const v1Doc=JSON.parse(priorBytes.toString('utf8'));
checkedBytes(readEvidence,PRIOR.receipt.path,PRIOR.receipt,'immutable accepted v1 receipt');
checkedBytes(readCode,PRIOR.helper.path,PRIOR.helper,'immutable v1 helper');
fail(same(v1Doc.parent,PARENT)&&v1Doc.acceptedPeer?.receiptPath===PRIOR.receipt.path&&v1Doc.acceptedPeer.receiptSha256===PRIOR.receipt.sha256&&v1Doc.acceptedPeer.receiptSizeBytes===PRIOR.receipt.sizeBytes,'v1 names its exact accepted receipt');
fail(Array.isArray(r8Document?.transitions),'immutable R8 transition array');
const rows=r8Document.transitions,r8Pins=new Map();
for(const row of rows)for(const p of row.codeProof){
fail(!r8Pins.has(p.path)||pin(r8Pins.get(p.path),p),'consistent immutable R8 proof pin: '+p.path);
r8Pins.set(p.path,p);
}
const oldTest=rows.find(row=>row.path===TEST&&row.id===TEST_ID);
fail(oldTest,'existing original PASS8 source transition retained');
const late=companion.sourceRevisions;
fail(Array.isArray(late)&&same(late.map(r=>r?.path),[TEST,UA].sort()),'exact sorted late source rev set');
const byPath=new Map();
for(const rev of late){
fail(exactKeys(rev,['id','path','kind','r8TransitionId','r8RowSha256','before','after','authorId','proposal','proofScope']),'closed late source rev');
const isTest=rev.path===TEST;
fail(isTest?(rev.id==='r9-legacy-monetary-stale-guard-v5'&&rev.kind==='original-test-source'&&rev.r8TransitionId===TEST_ID&&rev.r8RowSha256===digest(oldTest)):(rev.id==='r9-ua-support-twin-blob-oid'&&rev.path===UA&&rev.kind==='runtime-code'&&rev.r8TransitionId===null&&rev.r8RowSha256===null),'fixed late source identity and kind');
const expected=isTest?oldTest.after:r8Pins.get(UA),before=rev.before;
fail(exactKeys(before,['sha256','sizeBytes','fixturePath','fixtureSha256','fixtureSizeBytes','fixtureEncoding','fixtureFileSha256','fixtureFileSizeBytes'])&&validPin(before)&&pin(before,expected)&&pin(before,r8Pins.get(rev.path)),'exact late source predecessor');
const fixture=PREFIX+'fixtures/r9-v2-r8-predecessor-sources/'+(isTest?'pass8-citation-target-crop-history.test.mjs.gz':'ua-support-twin-history-v1.mjs.gz');
fail(before.fixturePath===fixture&&before.fixtureEncoding==='gzip'&&before.fixtureSha256===expected.sha256&&before.fixtureSizeBytes===expected.sizeBytes&&validPin({sha256:before.fixtureFileSha256,sizeBytes:before.fixtureFileSizeBytes}),'fixed late gzip predecessor fixture');
checkedBytes(readFixture,fixture,expected,'late R8 predecessor fixture');
fail(exactKeys(rev.after,['sha256','sizeBytes'])&&validPin(rev.after)&&!pin(rev.after,expected),'changed exact late source postimage');
authorAndScope(rev);byPath.set(rev.path,rev);
}
// Only late paths use old fixtures for v1; final physical bytes are checked below.
const readV1Code=path=>byPath.has(path)?checkedBytes(readFixture,byPath.get(path).before.fixturePath,byPath.get(path).before,'v1 historical predecessor'):readCode(path);
fail(Array.isArray(currentEntries),'physical current source roster');
const v1Entries=currentEntries.map(row=>byPath.has(row?.path)?{...row,sha256:byPath.get(row.path).before.sha256,sizeBytes:byPath.get(row.path).before.sizeBytes}:row);
const prior=validateFiniteR9CallbackOverride({r5Entries,currentEntries:v1Entries,r8Document,companion:v1Doc,readFixture,readEvidence,readCode:readV1Code});
const priorPins=new Map();
for(const row of prior.effectiveProofRows)for(const p of row.codeProof)priorPins.set(p.path,p);
const additions=companion.addedRuntime;
fail(Array.isArray(additions)&&additions.length===1,'one exact added runtime dependency');
const added=additions[0];
fail(exactKeys(added,['id','path','kind','before','after','derivedFrom','beforeTree','consumerIds','authorId','proposal','proofScope'])&&added.id==='r9-legacy-monetary-current-questions-fsv5-twin'&&added.path===ADDED&&added.kind==='additive-runtime-code'&&added.before===null,'fixed added versioned runtime identity and null predecessor');
fail(same(added.derivedFrom,DERIVED_FROM)&&!priorPins.has(ADDED),'exact immutable175 source of the added sibling');
checkedBytes(readCode,PROTECTED,DERIVED_FROM,'protected immutable175 module');
const absence={commit:PARENT.commit,tree:PARENT.tree,path:ADDED,absent:true};
fail(same(added.beforeTree,absence),'fixed parent-tree absence declaration');
fail(checkTreeAbsence(structuredClone(absence))===true,'actual fixed parent-tree absence check required');
fail(exactKeys(added.after,['sha256','sizeBytes'])&&validPin(added.after),'exact added runtime postimage');
authorAndScope(added);
const consumers=rows.filter(row=>row.codeProof.some(p=>p.path===TEST)).map(row=>row.id).sort();
fail(consumers.length>0&&same(added.consumerIds,consumers),'exact derived consumers of the added test dependency');
fail(DEPENDENCIES.every(p=>!priorPins.has(p.path)),'only explicitly missing immutable closure paths added');
const addSet=new Set(consumers);
const effectiveViews=prior.effectiveViews.map(view=>({
...structuredClone(view),
sourceAfter:structuredClone(byPath.get(view.path)?.after??view.sourceAfter),
codeProof:[
...view.codeProof.map(p=>byPath.has(p.path)?{...structuredClone(p),sha256:byPath.get(p.path).after.sha256,sizeBytes:byPath.get(p.path).after.sizeBytes}:structuredClone(p)),
...(addSet.has(view.transitionId)?[...DEPENDENCIES.map(p=>({...structuredClone(p),role:R9_V2_IMMUTABLE_DEPENDENCY_PROOF_ROLE})),{path:ADDED,sha256:added.after.sha256,sizeBytes:added.after.sizeBytes,role:R9_V2_ADDED_RUNTIME_PROOF_ROLE}]:[])
]
}));
const affectedConsumerIds=[...new Set([
...prior.affectedConsumerIds,
...rows.filter(row=>row.codeProof.some(p=>byPath.has(p.path))).map(row=>row.id),
...consumers
])].sort();
fail(Array.isArray(companion.proofRebindings)&&same(companion.proofRebindings.map(x=>x?.transitionId),affectedConsumerIds),'exact expanded consumer rebinding set');
const viewById=new Map(effectiveViews.map(view=>[view.transitionId,view]));
for(const binding of companion.proofRebindings){
const view=viewById.get(binding.transitionId);
fail(exactKeys(binding,['transitionId','r8RowSha256','effectiveViewSha256'])&&binding.r8RowSha256===view.r8RowSha256,'exact immutable expanded consumer row hash: '+binding.transitionId);
fail(binding.effectiveViewSha256===digest(view),'exact expanded effective view hash: '+binding.transitionId);
}
const actual=new Map();
for(const row of currentEntries){fail(row&&typeof row.path==='string'&&!actual.has(row.path)&&validPin(row),'unique exact physical current source path');actual.set(row.path,row);}
const effectiveSourcePins=prior.effectiveSourcePins.map(p=>byPath.has(p.path)?{path:p.path,...byPath.get(p.path).after}:structuredClone(p));
for(const expected of effectiveSourcePins){fail(pin(actual.get(expected.path),expected),'unlisted or incorrect expanded original source change: '+expected.path);checkedBytes(readCode,expected.path,expected,'expanded physical original source');}
const effectiveProofRows=effectiveViews.map(view=>({id:view.transitionId,codeProof:structuredClone(view.codeProof)}));
const proofPins=new Map();
for(const row of effectiveProofRows){
const local=new Set();
for(const p of row.codeProof){
fail(p&&typeof p.path==='string'&&validPin(p)&&!local.has(p.path),'unique exact expanded proof path in row: '+row.id);local.add(p.path);
fail(!proofPins.has(p.path)||pin(proofPins.get(p.path),p),'simultaneous expanded proof conflict: '+p.path);proofPins.set(p.path,p);
}
}
fail(same([...proofPins.keys()].sort(),[...priorPins.keys(),...DEPENDENCIES.map(p=>p.path),ADDED].sort()),'prior proof paths retained with exact added closure');
for(const [path,p]of proofPins)checkedBytes(readCode,path,p,'expanded physical proof');
const authorIds=[...new Set([...v1Doc.sourceRevisions,...late,added].map(r=>r.authorId))].sort();
return {effectiveViews,effectiveProofRows,effectiveSourcePins,affectedConsumerIds,acceptanceSubject:getR9V2AcceptanceSubject(companion),authorIds,priorViewSummary:{qualification:'historical accepted v1 projection; not current qualification',effectiveViews:prior.effectiveViews.length,affectedConsumers:prior.affectedConsumerIds.length,originalSourcePaths:prior.effectiveSourcePins.length,proofPaths:priorPins.size},parentSupportSummary:{qualification:'exact parent module lineage; not Native qualification',paths:SUPPORT.map(p=>p.path)}};
}
export function validateFiniteR9ExpandedOverride(args){
const {companion,readEvidence}=args;
fail(companion?.accepted===true&&companion.status===ACCEPTED,'independent expanded acceptance required; pending override rejected');
const derived=deriveFiniteR9ExpandedView(args),peer=companion.acceptedPeer;
fail(exactKeys(peer,['reviewerId','receiptPath','receiptSha256','receiptSizeBytes'])&&typeof peer.reviewerId==='string'&&peer.reviewerId.trim()&&!derived.authorIds.includes(peer.reviewerId),'independent expanded reviewer required');
fail(safeEvidence(peer.receiptPath)&&/^[a-f0-9]{64}$/.test(peer.receiptSha256)&&Number.isSafeInteger(peer.receiptSizeBytes)&&peer.receiptSizeBytes>0,'exact expanded receipt pin');
const bytes=checkedBytes(readEvidence,peer.receiptPath,{sha256:peer.receiptSha256,sizeBytes:peer.receiptSizeBytes},'accepted expanded receipt');
const receipt=JSON.parse(bytes.toString('utf8'));
fail(exactKeys(receipt,['schemaVersion','status','reviewer','authorIds','subject'])&&receipt.schemaVersion===2&&receipt.status===ACCEPTED,'accepted expanded receipt schema and status');
fail(exactKeys(receipt.reviewer,['id','role'])&&receipt.reviewer.id===peer.reviewerId&&receipt.reviewer.role==='independent'&&same(receipt.authorIds,derived.authorIds),'accepted expanded receipt identities');
fail(same(receipt.subject,derived.acceptanceSubject),'accepted expanded receipt binds exact sources, prior acceptance and proof views');
return derived;
}
