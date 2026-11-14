// Preserved exact a29/MM assertions; separate S1 companion tests own current behavior.
import test from 'node:test';
import {assertHistoricalMmTestStage,historicalMmTestRoot} from '../research/class-mapping-history-v1/mm-replay-fs-v2.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from '../research/class-mapping-history-v1/mm-replay-fs-v2.mjs';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {quantitySourceAbsenceInputs,buildQuantitySourceAbsenceReport,quantityUncertaintyPattern,lexicalAbsencePattern,numericSourceAbsencePattern} from '../research/class-mapping-history-v1/replay-tools/quantity-source-absence-audit.mjs';
import {normalizeMammothDerivedValuation} from '../research/class-mapping-history-v1/replay-tools/monetary-source-inventory.mjs';
import {hash} from '../research/class-mapping-history-v1/replay-tools/monetary-row-identity-audit.mjs';
import {validateCurrentMonetarySourceQuestionProjection,loadCurrentMonetarySourceQuestions} from '../research/class-mapping-history-v1/replay-tools/dmg175-current-monetary-source-questions-mm-v2.mjs';
assertHistoricalMmTestStage();
const root=historicalMmTestRoot,read=p=>JSON.parse(readFileSync(resolve(root,p))),sha=b=>createHash('sha256').update(b).digest('hex');
const before=read('tests/fixtures/mammoth-derived-valuation-before.json');
const raw=read('research/price-source-inventory-monster-books.json'),receipts=read('research/source-audit-batch5-price-discovery-reconciliation.json');
const mammoth=receipts.claimReceipts.find(r=>r.receiptId==='mm-mammoth-tusks-relative'),elephant=receipts.claimReceipts.find(r=>r.receiptId==='mm-elephant-tusks');
const synthetic=claim=>quantitySourceAbsenceInputs.map(config=>{const data=config.key==='monsterCensus'?{claims:[claim]}:{};const bytes=Buffer.from(JSON.stringify(data));return{...config,data,bytes,sha256:sha(bytes)};});

test('the original Mammoth condition was missed while notes were already a broad candidate',()=>{
 assert.equal(before.claim.conditions,'Source supplies no numeric multiplier; baseline elephant valuation is MM printed p.38 / PDF p.39.');
 assert.equal(lexicalAbsencePattern.test(before.claim.conditions),false);
 assert.equal(quantityUncertaintyPattern.test(before.claim.conditions),false);
 assert.equal(lexicalAbsencePattern.test(before.claim.notes[0]),true);
 assert.equal(numericSourceAbsencePattern.test(before.claim.conditions),true);
 assert.equal(before.legacyDetector.denominators.currentLexicalAbsenceCandidateLeaves,173);
 assert.equal(before.legacyDetector.denominators.monetaryQuantityContextCandidates,256);
 assert.equal(before.additiveNumericDetectorBefore.denominators.allScalarLeaves,531788);
 assert.equal(before.additiveNumericDetectorBefore.denominators.numericSourceAbsenceCandidateLeaves,309);
 assert.equal(before.additiveNumericDetectorBefore.mammothConditions.length,1);
 const report=buildQuantitySourceAbsenceReport({documents:synthetic(before.claim)});
 assert.ok(report.numericSourceAbsenceCandidates.some(c=>c.jsonPointer==='/claims/0/conditions'&&c.semanticErrorConfirmed===false));
 assert.ok(report.currentLexicalAbsenceCandidates.some(c=>c.jsonPointer==='/claims/0/notes/0'));
 assert.ok(!report.currentLexicalAbsenceCandidates.some(c=>c.jsonPointer==='/claims/0/conditions'));
});

test('numeric absence is a distinct all-string-leaf candidate class without a semantic grade',()=>{
 for(const text of ['Source supplies no numeric multiplier','ratio not specified','No amount is printed','percentage unknown','No numeric factor is given','The source does not provide a multiplier'])assert.equal(numericSourceAbsencePattern.test(text),true,text);
 for(const text of ['Mammoth tusks are 50% heavier and value is proportionately higher','Source review pending','No source image available'])assert.equal(numericSourceAbsencePattern.test(text),false,text);
 const docs=synthetic({id:'unusual',unrelatedProperty:'No numeric multiplier is supplied'}),report=buildQuantitySourceAbsenceReport({documents:docs});
 assert.equal(report.inputs.length,10);assert.equal(report.denominators.allScalarLeaves,2);
 assert.equal(report.numericSourceAbsenceCandidates.length,1);assert.equal(report.numericSourceAbsenceCandidates[0].semanticErrorConfirmed,false);
 assert.equal(report.numericSourceAbsenceCandidates[0].reviewState,'pending-human-classification-and-source-review');
 assert.equal(report.denominators.monetaryQuantityContextCandidates,0);
});

test('all 180 census claims and receipts preserve every unrelated record including Whale',()=>{
 assert.equal(before.allCensusClaimHashes.length,180);assert.equal(before.allReceiptHashes.length,180);
 const changed=[];
 for(const old of before.allCensusClaimHashes){const d=read(old.path),[key,index]=old.pointer.slice(1).split('/');if(hash(d[key][Number(index)])!==old.sha256)changed.push(old.id);}
 assert.deepEqual(changed,['mm-mammoth-tusks-relative']);
 assert.deepEqual(before.allReceiptHashes.filter(old=>hash(receipts.claimReceipts.find(r=>r.receiptId===old.id))!==old.sha256).map(r=>r.id),['mm-mammoth-tusks-relative']);
 const whale=before.allCensusClaimHashes.find(r=>r.id==='mm-whale-ambergris');assert.equal(hash(raw.claims[36]),whale.sha256);
 assert.deepEqual(mammoth.typedClaim,Object.fromEntries(['amountOrFormula','currency','unit','conditions','valuationDerivation'].map(k=>[k,raw.claims[18][k]])));
 const canonical=read('research/price-source-inventory.json').sourcePageCensuses.find(c=>c.id==='monster-books');
 assert.deepEqual(canonical.sourceArtifact,raw);assert.equal(canonical.sourceFileSha256,sha(readFileSync(resolve(root,'research/price-source-inventory-monster-books.json'))));
 assert.equal(receipts.inputArtifacts.monsterCensus.sha256,canonical.sourceFileSha256);
 assert.equal(receipts.inputArtifacts.originalSourceInventory710.sha256,'f2a02d1e990cf9bd30135f7dc2fcd2f10f9e1f2e172ee594e396677c32fb3852','original 710-row provenance stays historical rather than being repinned to the current canonical file');
 assert.deepEqual(raw.claims[18].sourcePages,before.claim.sourcePages);
 assert.ok(raw.claims[18].sourcePages.every(p=>p.sourceSha256==='c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81'));
});

test('the current index exposes arithmetic from the reviewed per-tusk baseline, never a printed range',()=>{
 const value=normalizeMammothDerivedValuation(mammoth,elephant)[0].value;
 assert.equal(value.kind,'range');assert.equal(value.minimumAmount,100*1.5);assert.equal(value.maximumAmount,600*1.5);
 assert.equal(value.currency,'gp');assert.equal(value.unit,'per tusk');assert.equal(value.printedAsRange,false);assert.equal(value.isSourcePrinted,false);
 assert.equal(value.derivationStatus,'source-backed-derived-interpretation');assert.equal(value.derivation.factor,1.5);
 assert.deepEqual(value.derivation.sourceDependencies.map(p=>[p.printedPage,p.pdfPage]),[[65,66],[38,39]]);
 const indexed=read('research/monetary-source-inventory.json').claims.find(c=>c.claimId==='price-discovery:mm-mammoth-tusks-relative#/typedClaim');
 assert.deepEqual(indexed.valueSemantics,value);
 assert.notEqual(value.normalizationStatus,'census-recorded-explicit-range');
});

test('a weight-only relation, altered arithmetic, pair unit or missing source binding cannot produce this derived range',()=>{
 const edits=[r=>r.typedClaim.valuationDerivation.factor=2,r=>r.typedClaim.valuationDerivation.baseline.minimumAmount=200,r=>r.typedClaim.valuationDerivation.derivedRange.maximumAmount=1800,r=>r.typedClaim.unit='per pair',r=>r.typedClaim.conditions='Mammoth tusks are 50% heavier.',r=>r.typedClaim.valuationDerivation.relation='weight-only',r=>r.typedClaim.valuationDerivation.printedAsRange=true,r=>r.typedClaim.valuationDerivation.sourceDependencies.pop(),r=>r.sourcePages[0].sourceSha256='0'.repeat(64),r=>r.typedClaim.valuationDerivation.sourceProofs[0].sha256='0'.repeat(64),r=>r.receiptId='another-creature'];
 for(const edit of edits){const bad=structuredClone(mammoth);edit(bad);assert.equal(normalizeMammothDerivedValuation(bad,elephant)[0].value.kind,'unassessable');}
 const badBaseline=structuredClone(elephant);badBaseline.typedClaim.unit='per pair';assert.equal(normalizeMammothDerivedValuation(mammoth,badBaseline)[0].value.kind,'unassessable');
});

test('current-MM projection retains the eight historical questions and all 195 known reviews without promotion',()=>{
 const projection=loadCurrentMonetarySourceQuestions();
 assert.deepEqual(projection.counts,{historicalRegisteredQuestions:8,currentUnresolvedQuestions:7,derivedAdjudications:1});
 assert.deepEqual(projection.questionCounts,{currentInterpretationQuestions:7,independentSourceScopeQuestions:2,distinctScopeRows:9,currentUnresolvedQuestions:9});
 assert.equal(projection.currentInputs.nativeSourceEpoch.sourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');
 assert.equal(projection.currentInputs.nativeSourceEpoch.sourceTree,'08010faf457df22cdb0a5ec35d2dcf79e622ade9');
 assert.equal(projection.currentInputs.nativeSourceEpoch.cohortSummary.owners,1064);
 assert.equal(projection.currentInputs.nativeSourceEpoch.cohortSummary.addedCanonicalBindings,76);
 assert.equal(projection.currentInputs.canonical.sha256,'e48c221347b1bac7a1dc4dd882317b22f20a4df151273157bb030b350eb43690');
 assert.ok(projection.records.every(r=>r.historicalQuestion.id===r.id&&r.semanticPass===false));
 const derived=projection.records.find(r=>r.currentDisposition==='source-backed-derived-valuation');assert.equal(derived.printedValuePass,false);assert.equal(derived.independentIntegrationReview,'confirmed');assert.equal(derived.integrationReview.path,'research/source-audit-batch6-mammoth-root-independent-review.json');
 assert.equal(derived.beforeRecordSha256,'83d6e640a62f7bb008cd115c73383e9d1ff0a23d5b9883a6acbe8fca80904ed9');assert.notEqual(derived.currentRecordSha256,derived.beforeRecordSha256);
 assert.equal(read('research/monetary-row-identity-reviews.json').reviews.length,195);
 assert.equal(sha(readFileSync(resolve(root,'research/source-audit-batch5-monetary-retained-uncertainties.json'))),'93c9547479b8632bc8631c83a5e5496118b3580f516aa2c4cbb2a5515d19ee00');
 for(const edit of [p=>p.records.pop(),p=>p.records[0].id=p.records[1].id,p=>p.records.find(r=>r.currentDisposition==='source-backed-derived-valuation').printedValuePass=true,p=>p.records.find(r=>r.currentDisposition==='source-backed-derived-valuation').independentIntegrationReview='pending',p=>p.records.find(r=>r.currentDisposition==='source-backed-derived-valuation').integrationReview.sha256='not-a-hash',p=>p.semanticPass=true,p=>p.counts.currentUnresolvedQuestions=0]){const bad=structuredClone(projection);edit(bad);assert.throws(()=>validateCurrentMonetarySourceQuestionProjection(bad));}
});

test('gaps entries expose all eight retained monetary identities and link the current-MM registry plus immutable history',async()=>{
 const {currentMonetarySourceQuestionEntries}=await import('../research/class-mapping-history-v1/replay-tools/coverage-gaps-mm-v2.mjs');
 const projection=loadCurrentMonetarySourceQuestions(),entries=currentMonetarySourceQuestionEntries(projection);
 assert.equal(entries.length,8);assert.equal(entries.filter(e=>e.status==='unresolved-source-question').length,7);
 const derived=entries.find(e=>e.status==='source-backed-derived-valuation');
 assert.match(derived.description,/150–900 gp/);assert.match(derived.description,/not a printed range/);assert.match(derived.description,/bounded independent source and integration review/);
 assert.ok(entries.every((e,i)=>e.handoffPointers[0]===`/currentMonetarySourceQuestions/records/${i}`&&e.sourceArtifacts.length===2));
});


test('the pending author candidate is preserved before independently reviewed activation',()=>{
 const bytes=readFileSync(resolve(root,'tests/fixtures/mammoth-current-review-activation-before.json.gz'));
 assert.equal(sha(bytes),'a030ca7d22a3bcf54a463994073b61c76a073299320a493b51d5f00655722291');
 const frozen=JSON.parse(gunzipSync(bytes));
 assert.equal(frozen.files.length,3);
 for(const entry of frozen.files)assert.equal(sha(Buffer.from(entry.bytesUtf8)),entry.sha256);
 const old=JSON.parse(frozen.files.find(entry=>entry.path==='research/source-audit-batch6-current-monetary-source-questions.json').bytesUtf8);
 assert.equal(old.status,'derived-adjudication-awaiting-independent-integration-review');
 assert.equal(old.integrationReview,undefined);
 assert.ok(old.limits.some(text=>/Independent integration review remains pending/.test(text)));
 const current=read('research/source-audit-batch6-current-monetary-source-questions.json');
 assert.equal(current.status,'bounded-derived-adjudication-independently-reviewed');
 const proof=read(current.integrationReview.path);
 assert.equal(sha(readFileSync(resolve(root,current.integrationReview.path))),current.integrationReview.sha256);
 assert.equal(proof.status,'confirmed-bounded-source-and-integration-review');
 assert.ok(!current.limits.some(text=>/Independent integration review remains pending/.test(text)));
});
