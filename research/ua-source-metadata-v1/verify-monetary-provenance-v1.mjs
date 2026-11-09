import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadMonetaryRowIdentityAudit} from '../../tools/monetary-row-identity-audit.mjs';
import {loadCurrentMonetarySourceQuestions} from '../../tools/monetary-current-source-questions.mjs';
const root=path.resolve(import.meta.dirname,'../..'),base='6b3cfc8cb421a2c1fc2379c38abebe2075634981',read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const git=p=>execFileSync('git',['show',`${base}:${p}`],{cwd:root,maxBuffer:60*1024*1024});
const canonicalPath='research/price-source-inventory.json',indexPath='research/monetary-source-inventory.json',before=JSON.parse(git(indexPath)),after=json(indexPath);
const beforeCanonicalSha='4e4085911f6df1926f3b7152df2cb48071112b2f6ff4448a2608270ea13e9727',afterCanonicalSha=sha(read(canonicalPath));
assert.equal(afterCanonicalSha,'2d050385af4b5ce68152ed1cef9c7f1cc7774612a291db910c5e44d26509d210');
function differences(a,b,p=''){
 if(Object.is(a,b))return[];
 if(a&&b&&typeof a==='object'&&typeof b==='object'){
  assert.equal(Array.isArray(a),Array.isArray(b),p);assert.deepEqual(Object.keys(a),Object.keys(b),p);
  return Object.keys(a).flatMap(k=>differences(a[k],b[k],p+'/'+k.replaceAll('~','~0').replaceAll('/','~1')));
 }
 return[{path:p,before:a,after:b}];
}
const changes=differences(before,after),canonicalChanges=[],validationChanges=[];
const expected=structuredClone(before);
for(const c of changes){
 let matched;
 if(c.path==='/inputArtifacts/0/sha256'){
  assert.equal(before.inputArtifacts[0].path,canonicalPath);expected.inputArtifacts[0].sha256=afterCanonicalSha;matched=true;
 }else{
  const m=c.path.match(/^\/(sourceOccurrences|claims)\/(\d+)\/provenance\/inputArtifact\/sha256$/);
  if(m){const row=before[m[1]][Number(m[2])];assert.equal(row.provenance.inputArtifact.path,canonicalPath);expected[m[1]][Number(m[2])].provenance.inputArtifact.sha256=afterCanonicalSha;matched=true;}
 }
 if(matched){assert.equal(c.before,beforeCanonicalSha);assert.equal(c.after,afterCanonicalSha);canonicalChanges.push(c);continue;}
 const m=c.path.match(/^\/currentInputValidation\/validationArtifacts\/(\d+)\/sha256$/);assert(m,`unapproved monetary change ${c.path}`);
 const i=Number(m[1]),a=before.currentInputValidation.validationArtifacts[i],b=after.currentInputValidation.validationArtifacts[i];
 assert.equal(a.path,b.path);assert.equal(sha(read(b.path)),c.after);assert.equal(sha(git(b.path)),c.after,'current source input must equal committed6b bytes');
 expected.currentInputValidation.validationArtifacts[i].sha256=c.after;validationChanges.push({...c,inputPath:b.path});
}
assert.equal(canonicalChanges.length,1439);assert.equal(validationChanges.length,10);assert.deepEqual(after,expected);
assert.equal(after.sourceOccurrences.length,1871);assert.equal(after.claims.length,2317);
assert.deepEqual(after.counts,before.counts);assert.deepEqual(after.denominators,before.denominators);
const oldRegistryPath='research/source-audit-pass8-weapon-source-current-monetary-source-questions-v1.json',newRegistryPath='research/source-audit-pass8-ua-source-current-monetary-source-questions-v1.json',oldRegistry=JSON.parse(git(oldRegistryPath)),registry=json(newRegistryPath),expectedRegistry=structuredClone(oldRegistry);
expectedRegistry.currentInputs.canonical.sha256=afterCanonicalSha;expectedRegistry.currentInputs.monetaryIndex.sha256=sha(read(indexPath));expectedRegistry.uaSourceInputMigration=registry.uaSourceInputMigration;
assert.deepEqual(registry,expectedRegistry);assert.equal(registry.uaSourceInputMigration.sourceInputCommit,base);assert.equal(registry.uaSourceInputMigration.predecessor.sha256,sha(git(oldRegistryPath)));
assert.deepEqual(read(oldRegistryPath),git(oldRegistryPath));
const audit=loadMonetaryRowIdentityAudit({repoRoot:root}),questions=loadCurrentMonetarySourceQuestions({repoRoot:root,audit});
assert.deepEqual(questions.counts,{historicalRegisteredQuestions:8,currentUnresolvedQuestions:7,derivedAdjudications:1});
const scope=audit.knownFindings.filter(f=>f.kind==='unresolved-source-scope');assert.equal(scope.length,2);assert.equal(new Set(scope.flatMap(f=>f.records.map(r=>r.uid))).size,9);
const passages=[1743,1745].map(i=>{assert.deepEqual(after.sourceOccurrences[i],before.sourceOccurrences[i]);const r=after.sourceOccurrences[i];assert.equal(r.siteMapping.status,'unmapped');assert.equal(r.reviewStatus.independentSemanticReview,'pending-independent-review');assert.equal(r.reviewStatus.independentOverlayReview,'pending-independent-review');return{index:i,sourceOccurrenceId:r.sourceOccurrenceId,siteMapping:r.siteMapping,reviewStatus:r.reviewStatus};});
const canary=structuredClone(after);canary.claims[0].valueSemantics.kind='unapproved-canary';assert.throws(()=>{const d=differences(before,canary);assert(d.every(c=>changes.some(v=>v.path===c.path&&v.before===c.before&&v.after===c.after)));});
const report={schemaVersion:1,artifactType:'bounded UA monetary current-input provenance migration proof',sourceInputCommit:base,beforeIndex:{path:indexPath,gitCommit:base,sha256:sha(git(indexPath))},afterIndex:{path:indexPath,sha256:sha(read(indexPath))},beforeRegistry:{path:oldRegistryPath,sha256:sha(git(oldRegistryPath))},afterRegistry:{path:newRegistryPath,sha256:sha(read(newRegistryPath))},sourceOccurrences:1871,claims:2317,canonicalProvenanceOnlyChanges:canonicalChanges,sourceValidationHashChanges:validationChanges,allOtherWholePayloadsExact:true,allCountsAndDenominatorsExact:true,currentQuestionCounts:questions.counts,currentQuestionDispositionsExact:true,independentSourceAndIntegrationReviewUnchanged:true,unresolvedScopeFindings:scope.map(f=>({id:f.id,status:f.status,records:f.records})),unresolvedScopeRows:9,existingUnmappedBodyPassages:passages,acrobatGpWeightObservation:{path:'research/ua-mechanics-withdrawal-proposal-v1/additional-acrobat-weight-scanner-match-v1.json',sha256:sha(read('research/ua-mechanics-withdrawal-proposal-v1/additional-acrobat-weight-scanner-match-v1.json')),newMonetarySourceOccurrences:0,priceValueApproval:false},negativeControl:{monetaryValueMutationRejected:true},semanticPass:false,generalSourceReviewPending:true,newMonetaryOrSourceValueGrades:0};
fs.writeFileSync(path.join(import.meta.dirname,'monetary-provenance-migration-proof-v1.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({changes:changes.length,canonicalProvenance:1439,validationHashes:10,sourceOccurrences:1871,claims:2317,questions:questions.counts,scopeQuestions:2,scopeRows:9,semanticPass:false}));
