// V10 overlays every complete immutable v9 admission check.
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {lstatSync,readFileSync,realpathSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {isDeepStrictEqual as equal} from 'node:util';
import {loadSource2MigrationDocument as loadV9,readSource2TestRoster as readV9} from './class-mapping-source2-test-roster-v2.mjs';
import {SOURCE2_V10_REPO_ROOT as root,SOURCE2_V10_MANIFEST_PIN,readAcceptedSource2V10Manifest} from './class-mapping-source2-v10-accepted-manifest-v1.mjs';
import {assertVerifiedSource2OJoinProof,legacySource2V9OJoinProof} from './class-mapping-source2-o-receipt-join-v2.mjs';
export * from './class-mapping-source2-test-roster-v2.mjs';
export const SOURCE2_MIGRATION_PATH=SOURCE2_V10_MANIFEST_PIN.path;
const check=(ok,m)=>{if(!ok)throw Error('Source2 v10 roster: '+m);},sha=b=>createHash('sha256').update(b).digest('hex');
const pin=r=>({path:r.successorPath,sha256:r.successorSha256,sizeBytes:r.successorSizeBytes});
const same=(a,b)=>a?.path===b?.path&&a?.sha256===b?.sha256&&a?.sizeBytes===b?.sizeBytes;
function bytes(p){
 check(p&&typeof p.path==='string'&&!p.path.startsWith('/')&&p.path.split('/').every(x=>x&&x!=='.'&&x!=='..')&&/^[a-f0-9]{64}$/.test(p.sha256??'')&&Number.isSafeInteger(p.sizeBytes)&&p.sizeBytes>0,'closed safe pin');
 const path=resolve(root,p.path),s=lstatSync(path);check(relative(root,path)===p.path&&s.isFile()&&!s.isSymbolicLink()&&realpathSync(path)===path,'regular nonsymlink target');
 const b=readFileSync(path);check(b.length===p.sizeBytes&&sha(b)===p.sha256,'exact target/proof '+p.path);return b;
}
function review(proof,from,to){
 check(proof?.status==='INDEPENDENT_ASSERTION_COVERAGE_REVIEWED'&&proof.allPredecessorAssertionsRetained===true&&proof.removedAssertions===0&&proof.skippedPredecessorCases===0,'no old assertion removal or case skip');
 check(proof.preimageSha256===from.sha256&&proof.postimageSha256===to.sha256,'review binds exact source pair');bytes(proof.receipt);
}
function verifyV10WholeWorkflow(d,s){
 const w=s.workflowIntegration;
 check(w?.status==='INDEPENDENTLY_REVIEWED_V10_WHOLE_WORKFLOW_TRANSITION','closed whole-workflow transition');
 const expectedFixture={"path":"research/class-mapping-ci-sharding-v1/source2-test-transition-v1/predecessor-pages-v9.yml.gz","sha256":"dbec8cbd36850cb591083485cf816ccffae3bdd54daac43aadb87708e47baf05","sizeBytes":4955},expectedCurrent={"path":".github/workflows/pages.yml","sha256":"d1c7c8d1710684cdc9343a0548832460f6c2f3db3f8bd111151553b392621430","sizeBytes":29180},expectedTransition={"path":"research/class-mapping-ci-sharding-v1/source2-test-transition-v1/v10-whole-workflow-transition-v2.json","sha256":"17d0275e43c06e416e9b85de4a8a59cd131cf5c7dbf4c28f8cc889da9d9ecf43","sizeBytes":50946};
 check(same(w.frozenV9WorkflowFixture,expectedFixture)&&same(w.currentWorkflow,expectedCurrent)&&same(w.transition,expectedTransition),'exact historical/current full workflow and transition pins');
 const historical=gunzipSync(bytes(w.frozenV9WorkflowFixture),{maxOutputLength:29180});check(historical.length===29180&&sha(historical)==='8f0a07d808ddd2e3be751bf7beaa261708143893cecce96b655eff34e038b959','complete preserved v9 workflow');
 const swaps=[['tools/run-class-mapping-tests-source2-shard-v1.mjs','tools/run-class-mapping-tests-source2-shard-v2.mjs'],['tools/run-historical-mm-replay-source2-receipt-v1.mjs','tools/run-historical-mm-replay-source2-receipt-v2.mjs'],['tools/reduce-class-mapping-test-source2-shards-v1.mjs','tools/reduce-class-mapping-test-source2-shards-v2.mjs'],['node tools/verify-class-mapping-current-reports-v3.mjs --kind all','node tools/verify-class-mapping-current-reports-v4.mjs --kind all',2]];
 let expected=historical.toString('utf8');for(const [before,after,count=1] of swaps){check(expected.split(before).length===count+1&&expected.split(after).length===1,'exact reviewed runner/date command replacement count');expected=expected.replaceAll(before,after);}
 check(bytes(w.currentWorkflow).equals(Buffer.from(expected)),'all other full workflow bytes/guards/routes retained');
 const transition=JSON.parse(bytes(w.transition));check(equal(transition.onlyExactReplacements,swaps.map(([before,after,occurrences=1])=>({before,after,occurrences}))),'closed runner/date command transition evidence');
 const roleMap=JSON.parse(bytes(transition.preserved24RoleMapPin));check(roleMap.rows.length===24&&transition.preservedOrderedRoleCount===24&&equal(transition.preservedOrderedRoles,roleMap.rows.map(row=>row.role))&&equal(transition.changedMappedOrdinals,[21]),'all24 ordered roles and exact mapped date transition');for(const row of roleMap.rows){const current=row.ordinal===21?row.after.utf8.replaceAll('node tools/verify-class-mapping-current-reports-v3.mjs --kind all','node tools/verify-class-mapping-current-reports-v4.mjs --kind all'):row.after.utf8;check(expected.split(current).length===2,'each preserved current role occurs exactly once');}check(equal(transition.preservedAssemblerRole1,roleMap.rows[1].after),'assembler role1 remains exact');check(transition.unmappedReportClosureStep?.notAnAdditionalMappedRole===true&&transition.unmappedReportClosureStep.after.sha256==='dba15636a020a8815143bd763990a1b322b4c9e11d48317a4f149bfa5ad51a67'&&transition.unmappedReportClosureStep.after.sizeBytes===939,'separate exact unmapped Source2 closure-step transition');
 const family=d.testFamilies.find(row=>row.familyKind==='current-workflow-contract');check(family&&same(w.currentContractTest,pin(family)),'same workflow family retains the reviewed historical and actual current assertions');
}
export function validateSource2V10OverlayDocument(d){
 const base=loadV9(root),old=base.document,s=d?.v10Integration;
 check(d?.schemaVersion===1&&d.artifactVersion===10&&d.status==='READY_FOR_SOURCE2_QUALIFICATION'&&s?.status==='CLOSED_ACCEPTED_FOR_RUNTIME_QUALIFICATION'&&Array.isArray(s.pending)&&s.pending.length===0,'closed v10; no pending targets/code');
 check(same(s.frozenV9,{path:'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v9.json',sha256:base.sha256,sizeBytes:base.sizeBytes}),'exact frozen v9 manifest');
 check(equal(d.predecessor,old.predecessor)&&equal(d.sourceEpoch,old.sourceEpoch)&&equal(d.historicalMmReplayTarget,old.historicalMmReplayTarget),'unchanged225/source3063/MM identities');
 check(equal(d.workflowTransition,old.workflowTransition)&&equal(d.predecessorWorkflowFixture,old.predecessorWorkflowFixture),'frozen24-role workflow/old callback artifacts preserved');
 check(Array.isArray(d.testFamilies)&&d.testFamilies.length===225,'exact225 families');const ids=new Set(),targets=new Set();
 for(let i=0;i<225;i++){
  const x=d.testFamilies[i],b=old.testFamilies[i];check(x.predecessorPath===b.predecessorPath&&x.predecessorSha256===b.predecessorSha256&&x.predecessorSizeBytes===b.predecessorSizeBytes,'one-to-one ordered predecessor IDs/pins');
  check(!ids.has(x.predecessorPath)&&!targets.has(x.successorPath),'unique family/target');ids.add(x.predecessorPath);targets.add(x.successorPath);check(x.executionLane===b.executionLane,'224main+1MM');
  if(!same(pin(x),pin(b))){check(x.successorPath!==b.successorPath&&x.executionLane!=='separate-historical-a29-capsule','versioned path; exact MM retained');review(x.v10AssertionCoverage,pin(b),pin(x));check(x.v10DirectSource2Admission?.fresh===true&&x.v10DirectSource2Admission.zeroArgument===true,'fresh zero-argument Source2 admission');bytes(x.v10DirectSource2Admission.evidence);}
 }
 check(Array.isArray(s.stableSupportMappings)&&s.stableSupportMappings.length===15&&Array.isArray(s.additionalSupportTests),'stable15 plus explicit additions');
 for(let i=0;i<15;i++){const x=s.stableSupportMappings[i],b=old.currentSuiteSemantics.source2SupportTests[i],p={path:b.path,sha256:b.sha256,sizeBytes:b.sizeBytes};check(x.baselinePath===b.path&&same(x.baselinePin,p),'stable15 original IDs/pins');if(!same(x.target,p)){check(x.target.path!==p.path,'versioned support path');review(x.assertionCoverage,p,x.target);}}
 for(const x of s.additionalSupportTests){check(x.acceptance==='INDEPENDENTLY_REVIEWED_ADDITIONAL_SUPPORT','explicit reviewed support addition');bytes(x.reviewReceipt);}
 const supports=[...s.stableSupportMappings.map(x=>x.target),...s.additionalSupportTests.map(x=>x.target)];check(new Set(supports.map(x=>x.path)).size===supports.length&&!supports.some(x=>targets.has(x.path)),'supports disjoint; no collision filtered');
 const expected={mainCurrentFamilyCount:224,historicalMmFamilyCount:1,supportTestCount:supports.length,mainCurrentTestFileCount:224+supports.length,logicalTargetCount:225+supports.length};check(equal(s.executionCounts,expected),'exact224+S/225+S formulas');
 check(d.currentSuiteSemantics.source2SupportTestCountExpected===supports.length&&equal(d.currentSuiteSemantics.source2SupportTests.map(x=>({path:x.path,sha256:x.sha256,sizeBytes:x.sizeBytes})),supports),'all closed support targets in exact declared order');
 check(d.currentSuiteSemantics.expectedCurrentTestFileCount===expected.logicalTargetCount,'all225+S logical targets');
 check(d.currentSuiteSemantics.expectedMainCurrentTestFileCount===expected.mainCurrentTestFileCount&&d.currentSuiteSemantics.expectedLogicalTargetCount===expected.logicalTargetCount&&d.currentSuiteSemantics.expectedHistoricalMmTargetCount===1,'closed execution totals');check(equal(d.currentSuiteSemantics.reportOutputJoin,old.currentSuiteSemantics.reportOutputJoin),'rawO/188assertions preserved');
 verifyV10WholeWorkflow(d,s);
 const reviewRoles=['family-assertion-preservation','runtime-loaded-code-closure','runner-workflow-integration'];
 check(Array.isArray(s.independentReviewReceipts)&&s.independentReviewReceipts.length===reviewRoles.length,'three closed independent review receipt roles');
 for(const role of reviewRoles){const rows=s.independentReviewReceipts.filter(x=>x.role===role);check(rows.length===1&&rows[0].status==='INDEPENDENTLY_REVIEWED_ACCEPTED','independent accepted review: '+role);bytes(rows[0].pin);}
 check(s.boundaries?.sourceBodyRows===3063&&s.boundaries.frozenReportCodeRows===104&&s.boundaries.frozenNative1ReaderCodeRows===175,'3063/old104/old175 separate');
 check(s.runtimeCodeAuthority?.schema==='source2-typed-loaded-code-authority-v1'&&s.runtimeCodeAuthority.status==='CLOSED_ACCEPTED_TYPED_SOURCE_AND_RECIPE_AUTHORITY'&&Array.isArray(s.runtimeCodeAuthority.physicalHeadCodeRows)&&s.runtimeCodeAuthority.physicalHeadCodeRows.length>0&&Array.isArray(s.runtimeCodeAuthority.unresolved)&&s.runtimeCodeAuthority.unresolved.length===0,'closed actual-helper/template authority');
 return {baseline:base,supports,expected};
}
export function loadSource2MigrationDocument(repositoryRoot=root){check(realpathSync(repositoryRoot)===root,'no caller root override');const loaded=readAcceptedSource2V10Manifest();return Object.freeze({...loaded,...validateSource2V10OverlayDocument(loaded.document),repositoryRoot:root});}
export function readSource2TestRoster(repositoryRoot,receipt,proof){
 check(realpathSync(repositoryRoot)===root,'fixed root');assertVerifiedSource2OJoinProof(proof);const loaded=loadSource2MigrationDocument(),d=loaded.document;check(proof.manifestSha256===loaded.sha256&&proof.reportReceiptSha256===receipt.sha256,'actual O/v10 proof');
 // Every v9 physical-byte, prefix, semantic and workflow check still executes.
 const legacy=readV9(root,receipt,legacySource2V9OJoinProof(proof)),entries=[];let mm=null;
 for(const r of d.testFamilies){bytes(pin(r));check(r.successorPath.startsWith('tests/'),'test path');const x={...pin(r),kind:'predecessor-family',predecessorPath:r.predecessorPath,familyKind:r.familyKind};if(r.executionLane==='separate-historical-a29-capsule')mm={...legacy.historicalMmTarget,...x};else entries.push(x);}
 for(const p of loaded.supports){bytes(p);check(p.path.startsWith('tests/'),'support path');entries.push({...p,kind:'source2-v10-closed-support'});}entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);const logical=[...entries.map(x=>x.path),mm.path].sort();check(entries.length===loaded.expected.mainCurrentTestFileCount&&new Set(logical).size===loaded.expected.logicalTargetCount,'all225+S selected once');
 const changed=(r,i)=>!same(pin(r),pin(loaded.baseline.document.testFamilies[i])),versioned=d.testFamilies.filter((r,i)=>changed(r,i)||loaded.baseline.document.testFamilies[i].migrationKind==='versioned-current-source-successor').length,prefix=d.testFamilies.filter((r,i)=>!changed(r,i)&&loaded.baseline.document.testFamilies[i].predecessorAssertionProof?.kind==='exact-predecessor-prefix').length;
 const familyCounts={frozenV9:legacy.familyCounts,v10:{versioned,unchanged:225-versioned,exactPrefix:prefix,semantic:versioned-prefix}};
 return Object.freeze({...legacy,...loaded.expected,familyCounts,sourceRosterSha256:loaded.sha256,sourceRosterBytes:loaded.sizeBytes,migrationPath:SOURCE2_MIGRATION_PATH,entries:Object.freeze(entries.map(Object.freeze)),historicalMmTarget:Object.freeze(mm),logicalTargetPaths:Object.freeze(logical),document:d,outputJoinProof:proof,integrationVersion:10,legacyV9SourceRosterSha256:legacy.sourceRosterSha256});
}
