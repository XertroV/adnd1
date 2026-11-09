// Current adjudications supplement, and never rewrite, the immutable question register.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMonetaryRowIdentityAudit,hash} from './monetary-row-identity-audit.mjs';
import {normalizeMammothDerivedValuation} from './monetary-source-inventory.mjs';

const root=resolve(import.meta.dirname,'..');
export const currentSourceQuestionRegistryPath='research/source-audit-pass8-ua-source-current-monetary-source-questions-v1.json';
const historicalPath='research/source-audit-batch5-monetary-retained-uncertainties.json';
const historicalSha256='93c9547479b8632bc8631c83a5e5496118b3580f516aa2c4cbb2a5515d19ee00';
const mammothId='relative-monetary-reading-mm-mammoth-tusks-relative';
const historicalIds=['relative-monetary-reading-ua-census-record-006','relative-monetary-reading-ua-census-record-038',mammothId,...['H1-cont-r030','H2-r070','H2-r071','H2-r072','H2-r073'].map(suffix=>`uncertain-scimitar-marker-ua-other-008-${suffix}`)];
const bytesHash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error(`Invalid current monetary source questions: ${message}`);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function validateCurrentMonetarySourceQuestionProjection(projection){
 if(projection?.schemaVersion!==1||projection.semanticPass!==false||projection.generalSourceReviewPending!==true||projection.historicalRegister?.path!==historicalPath||projection.historicalRegister.sha256!==historicalSha256)fail('historical identity or review boundary');
 const rows=projection.records;
 if(!Array.isArray(rows)||!same(rows.map(r=>r.id),historicalIds)||new Set(rows.map(r=>r.uid)).size!==8)fail('all eight historical identities must remain visible exactly once');
 const current=rows.filter(r=>r.currentDisposition==='unresolved-source-question'),derived=rows.filter(r=>r.currentDisposition==='source-backed-derived-valuation');
 if(current.length!==7||derived.length!==1||derived[0].id!==mammothId||projection.counts.historicalRegisteredQuestions!==8||projection.counts.currentUnresolvedQuestions!==7||projection.counts.derivedAdjudications!==1)fail('historical eight must equal current seven plus one derived adjudication');
 if(rows.some(r=>r.historicalQuestion?.id!==r.id||r.historicalQuestion.uid!==r.uid||hash(r.historicalQuestion)!==r.historicalQuestionSha256||(r.currentDisposition==='unresolved-source-question'&&r.beforeRecordSha256!==r.currentRecordSha256)))fail('original question identities or unchanged current unresolved records');
 const value=derived[0].derivedValue;if(value?.kind!=='range'||value.currency!=='gp'||value.minimumAmount!==150||value.maximumAmount!==900||value.unit!=='per tusk'||value.isSourcePrinted!==false||value.printedAsRange!==false||value.derivation?.factor!==1.5||value.derivationStatus!=='source-backed-derived-interpretation')fail('derived range is not a printed value');
 if(rows.some(r=>r.semanticPass!==false||!/^[a-f0-9]{64}$/.test(r.beforeRecordSha256)||!/^[a-f0-9]{64}$/.test(r.currentRecordSha256))||derived[0].printedValuePass!==false||derived[0].independentIntegrationReview!=='confirmed'||!derived[0].integrationReview?.path?.startsWith('research/')||!/^[a-f0-9]{64}$/.test(derived[0].integrationReview?.sha256??''))fail('record hashes or adjudication boundary');
 return true;
}

export function loadCurrentMonetarySourceQuestions({repoRoot=root,audit=null}={}){
 const inputs=[];
 const readRef=ref=>{
  if(!ref||typeof ref.path!=='string'||ref.path.startsWith('/')||ref.path.includes('\\')||ref.path.split('/').some(p=>!p||p==='.'||p==='..'))fail('non-repository evidence path');
  const bytes=readFileSync(resolve(repoRoot,ref.path)),sha256=bytesHash(bytes);
  if(sha256!==ref.sha256)fail(`stale input ${ref.path}`);
  inputs.push({path:ref.path,sha256});return JSON.parse(bytes);
 };
 const registryBytes=readFileSync(resolve(repoRoot,currentSourceQuestionRegistryPath)),registry=JSON.parse(registryBytes);
 const registryRef={path:currentSourceQuestionRegistryPath,sha256:bytesHash(registryBytes)};
 if(registry.schemaVersion!==1||registry.historicalRegister?.path!==historicalPath||registry.historicalRegister.sha256!==historicalSha256)fail('registry historical binding');
 if(registry.status!=='bounded-derived-adjudication-independently-reviewed'||registry.limits.some(text=>/independent integration review remains pending/i.test(text)))fail('registry current review status is stale');
 readRef(registry.detectorClarification);
 const historical=readRef(registry.historicalRegister),before=readRef(registry.beforeFixture),beforeQuestions=readRef(registry.beforeQuestionRecords);
 if(historical.uncertainties.length!==8||registry.dispositions?.length!==8||!same(registry.dispositions.map(r=>r.id),historical.uncertainties.map(r=>r.id)))fail('historical identity/order union');
 const expectedInputs={monsterCensus:'research/price-source-inventory-monster-books.json',receipts:'research/source-audit-batch5-price-discovery-reconciliation.json',canonical:'research/price-source-inventory.json',monetaryIndex:'research/monetary-source-inventory.json'};
 if(!same(Object.keys(registry.currentInputs??{}),Object.keys(expectedInputs))||Object.entries(expectedInputs).some(([key,path])=>registry.currentInputs[key]?.path!==path))fail('current input identity universe');
 const raw=readRef(registry.currentInputs.monsterCensus),receipts=readRef(registry.currentInputs.receipts),canonical=readRef(registry.currentInputs.canonical),index=readRef(registry.currentInputs.monetaryIndex);
 const claim=raw.claims[18],receipt=receipts.claimReceipts.find(r=>r.receiptId==='mm-mammoth-tusks-relative'),baseline=receipts.claimReceipts.find(r=>r.receiptId==='mm-elephant-tusks');
 if(claim?.id!=='mm-mammoth-tusks-relative'||hash(before.claim)!==historical.uncertainties.find(r=>r.id===mammothId).recordSha256||before.rawInput.sha256!=='5b18323c4817c7c99a38cd058015f862bbc588237b655ec6c7e8375f60f8248f')fail('exact original claim history');
 if(!same(receipt.typedClaim,Object.fromEntries(['amountOrFormula','currency','unit','conditions','valuationDerivation'].map(k=>[k,claim[k]])))||!same(canonical.sourcePageCensuses.find(c=>c.id==='monster-books').sourceArtifact,raw))fail('raw/canonical/receipt mirror');
 const value=normalizeMammothDerivedValuation(receipt,baseline)[0].value;
 if(value.normalizationStatus!=='source-backed-derived-range-not-printed')fail('derived arithmetic/source dependencies');
 const indexed=index.claims.find(c=>c.claimId==='price-discovery:mm-mammoth-tusks-relative#/typedClaim');
 if(!same(indexed?.valueSemantics,value))fail('current monetary index must expose the derived range');
 const integrationReview=readRef(registry.integrationReview);
 const registeredMammoth=registry.dispositions.find(row=>row.id===mammothId);
 if(integrationReview.schemaVersion!==1||integrationReview.artifactType!=='independent-mammoth-derived-valuation-integration-review'||integrationReview.status!=='confirmed-bounded-source-and-integration-review'||integrationReview.independentOfSourceAuthor!==true||integrationReview.independentOfImplementationAuthor!==true||integrationReview.questionId!==mammothId||integrationReview.beforeRecordSha256!==registeredMammoth?.beforeRecordSha256||integrationReview.currentRecordSha256!==registeredMammoth?.currentRecordSha256||integrationReview.sourcePdfSha256!==claim.valuationDerivation.sourceDependencies[0].sourcePdfSha256||!same(integrationReview.derivedRange,{minimumAmount:150,maximumAmount:900,currency:'gp',unit:'per tusk',factor:1.5,printedAsRange:false,isSourcePrinted:false})||integrationReview.reviewBoundary?.semanticPass!==false||integrationReview.reviewBoundary?.printedValuePass!==false||integrationReview.reviewBoundary?.generalSourceReviewPending!==true)fail('bounded independent integration review does not match the exact current derived record');
 if(!same(registry.sourceProofs,claim.valuationDerivation.sourceProofs))fail('source proof identity');
 for(const proof of registry.sourceProofs)readRef(proof);
 if(!same(raw.claims[18].sourcePages,before.claim.sourcePages)||raw.sources.find(s=>s.book==='Monster Manual').sourceSha256!==claim.valuationDerivation.sourceDependencies[0].sourcePdfSha256)fail('unchanged source PDF/page evidence');
 const currentAudit=audit??loadMonetaryRowIdentityAudit({repoRoot});
 if(currentAudit.retainedUncertainties?.length!==8)fail('legacy adapter question inventory changed');
 if(beforeQuestions.records?.length!==8||!same(beforeQuestions.records.map(r=>r.uid),historical.uncertainties.map(r=>r.uid)))fail('complete before-question record inventory');
 const records=registry.dispositions.map((row,i)=>{
  const old=historical.uncertainties[i],original=beforeQuestions.records[i],current=currentAudit.records.find(r=>r.uid===old.uid),isMammoth=old.id===mammothId;
  if((isMammoth&&(original.rowIdentitySha256!==old.rowIdentitySha256||original.recordSha256!==old.recordSha256))||row.historicalQuestionSha256!==hash(old))fail(`original question/record binding ${old.id}`);
  if(!current||row.uid!==old.uid||row.beforeRecordSha256!==original.recordSha256||row.currentRecordSha256!==current.recordSha256||row.currentRowIdentitySha256!==current.rowIdentitySha256||row.currentDisposition!==(isMammoth?'source-backed-derived-valuation':'unresolved-source-question'))fail(`record-bound disposition ${old.id}`);
  if(!isMammoth&&current.recordSha256!==original.recordSha256)fail(`changed unresolved record ${old.id}`);
  return {...row,historicalQuestion:old,legacyAdapterStatus:currentAudit.retainedUncertainties.find(r=>r.id===old.id)?.status,semanticPass:false,...(isMammoth?{derivedValue:value,sourceProofs:registry.sourceProofs,printedValuePass:false,independentIntegrationReview:'confirmed',integrationReview:registry.integrationReview}:{})};
 });
 const projection={schemaVersion:1,artifactType:'current-monetary-source-question-projection',registry:registryRef,historicalRegister:registry.historicalRegister,beforeQuestionRecords:registry.beforeQuestionRecords,counts:{historicalRegisteredQuestions:8,currentUnresolvedQuestions:7,derivedAdjudications:1},records,semanticPass:false,generalSourceReviewPending:true,legacyQuestionPolicy:'The sealed register and raw row-adapter flags are historical registered questions, not current semantic verdicts. Every original question remains visible beside its current record-bound disposition.',inputs:[registryRef,...inputs]};
 validateCurrentMonetarySourceQuestionProjection(projection);return projection;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.some((arg,i)=>!['--check','--output'].includes(arg)&&args[i-1]!=='--output'))throw Error('Usage: monetary-current-source-questions.mjs [--check] [--output path]');
 const report=loadCurrentMonetarySourceQuestions(),out=args.indexOf('--output');
 if(out>=0){if(!args[out+1])throw Error('--output requires a path');writeFileSync(resolve(args[out+1]),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({status:'record-bound-current-projection-valid',...report.counts,semanticPass:false,independentIntegrationReview:'confirmed'}));
}
