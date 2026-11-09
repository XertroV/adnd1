import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {canonical,regionHashes} from '../../tools/source-visual-coverage.mjs';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const pkg='research/source-audit-pass8-last-six-crop-resolution';
const proposalPath=`${pkg}/source-audit-pass8-last-six-crop-resolution-author-proposal.json`;
const proposal=JSON.parse(fs.readFileSync(path.join(root,proposalPath)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const hashFile=p=>sha(fs.readFileSync(path.join(root,p)));
const data=JSON.parse(fs.readFileSync(path.join(root,'dist/data.json')));
const failures=[];const checks={};
const assert=(name,ok,details=null)=>{checks[name]={passed:!!ok,...details?{details}:{} };if(!ok)failures.push(name);};
assert('proposal-research-only',proposal.status.includes('research-only')&&proposal.migrationPlan.productionEditsProposed===0);
assert('candidate-object-count',proposal.candidateRegions.length===7);
assert('owner-catalog-count',proposal.sourceOwnerImpacts.length===7&&proposal.draftCatalogs.length===7);
assert('owner-region-review-binding-count',proposal.proposedSourceExcerptReviewRows.length===8);
assert('historical-input-seal',proposal.baseline.sealedHistoricalInput.sha256==='1d3d6a9100dc21e15d46d86f05cfbab7afc58fe4a43ec383b7a8b92b2aa3caf1');
assert('root-independent-receipt-seal',hashFile(proposal.baseline.rootIndependentReview.path)===proposal.baseline.rootIndependentReview.sha256);
assert('all-candidate-files-and-foci',proposal.candidateRegions.every(c=>{
 const p=path.join(root,c.source.candidateAssetPath),b=fs.readFileSync(p);return sha(b)===c.source.candidateFileSha256&&b.readUInt32BE(16)===c.region.width&&b.readUInt32BE(20)===c.region.height&&c.region.focusRects.length>0&&c.region.focusRects.every(([x,y,w,h])=>x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1)&&!c.region.focusRects.some(r=>JSON.stringify(r)==='[0,0,1,1]')&&JSON.stringify(regionHashes(c.region))===JSON.stringify(c.regionHashes);
}));
assert('all-focus-overlays-match',proposal.candidateRegions.every(c=>{const p=path.join(root,c.source.focusOverlayPath),b=fs.readFileSync(p);return sha(b)===c.source.focusOverlaySha256&&b.readUInt32BE(16)===c.region.width&&b.readUInt32BE(20)===c.region.height;}));
assert('cold-replay-bound',proposal.candidateRegions.every(c=>c.source.coldReplay?.coldDirectClipExact===true)&&proposal.candidateRegions.filter(c=>c.source.coldReplay?.warmupThenClipExact===false).length===4);
assert('historical-focus-grades-not-transferred',proposal.candidateRegions.every(c=>!['verification','verificationScope','checkedOn','checkedFields'].some(k=>Object.hasOwn(c.region,k)))&&proposal.sourceOwnerImpacts.every(o=>o.oldRegionReviewHistory.every(r=>r.status==='unreviewed-full-image-sentinel')));
assert('old-review-history-includes-two-ultravision-owners',proposal.sourceOwnerImpacts.find(o=>o.itemId==='ua-magic-user-ultravision').oldRegionReviewHistory.some(r=>r.regionId==='ua-58-6a839b9d9141f495')&&proposal.sourceOwnerImpacts.find(o=>o.itemId==='ua-illusionist-ultravision').oldRegionReviewHistory.some(r=>r.regionId==='ua-58-6a839b9d9141f495'));
assert('new-demi-region-is-passage-and-default-stays-opening',proposal.candidateRegions.find(c=>c.regionId==='phb-99-9ef97e132b0081e5')?.region.role==='passage'&&proposal.perPageDefaultOrderPins.find(p=>p.itemId==='phb-illusionist-demi-shadow-magic'&&p.printedPage===99)?.proposed.defaultRegionId==='phb-99-4212306ab17751dc');
assert('six-boundary-groups-and-12-page-pins',proposal.proposedContinuationGroups.length===6&&proposal.perPageDefaultOrderPins.length===12&&proposal.proposedContinuationGroups.every(g=>/^[a-f0-9]{64}$/.test(g.orderedSegmentSha256)));
assert('all-default-region-ids-preserved',proposal.perPageDefaultOrderPins.every(p=>p.defaultRegionIdPreserved));
assert('seven-default-order-hashes-recomputed',proposal.perPageDefaultOrderPins.filter(p=>p.defaultOrderHashChanged).length===7);
assert('all-eight-review-rows-unreviewed-nonsentinel',proposal.proposedSourceExcerptReviewRows.length===8&&proposal.proposedSourceExcerptReviewRows.every(r=>r.status==='unreviewed'&&!r.sentinel&&!r.review&&!r.recordedReview));
assert('only-three-context-defects-and-three-bounded-negative-scopes',proposal.contextFindings.items.length===3&&proposal.geometryOnlyFindings.items.length===3);
assert('no-private-full-pages-or-pdfs-in-package',!fs.readdirSync(path.join(root,pkg),{recursive:true}).some(p=>/fullpage|\.pdf$/i.test(p)));
assert('active-baseline-input-hashes-unchanged',hashFile('dist/data.json')===proposal.baseline.currentDataSha256&&hashFile('citation-overrides.json')===proposal.baseline.citationOverridesSha256&&hashFile('research/citation-continuations.json')===proposal.baseline.currentContinuationManifestSha256&&hashFile('research/source-visual-reviews.json')===proposal.baseline.currentVisualReviewLedgerSha256);
for(const pin of proposal.perPageDefaultOrderPins){
 const current=JSON.parse(fs.readFileSync(path.join(root,'dist',pin.catalog)));
 const draftPath=proposal.draftCatalogs.find(x=>x.catalog===pin.catalog)?.path;
 const draft=JSON.parse(fs.readFileSync(path.join(root,draftPath)));
 for(const [state,catalog] of [['current',current],['proposed',draft]]){
  const regions=catalog.regions.filter(r=>r.book===pin.book&&r.printedPage===pin.printedPage).sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
  const order=sha(Buffer.from(canonical(regions.map(r=>({id:r.id,role:r.role||null,imageSha256:r.sha256,...regionHashes(r)})))));
  assert(`pin-${pin.itemId}-${pin.printedPage}-${state}`,order===pin[state].defaultOrderSha256&&regions[0]?.id===pin[state].defaultRegionId);
 }
}
const result={schemaVersion:1,artifactType:'last-six-crop-proposal-bounded-validation',status:failures.length?'failed':'passed',proposalPath,proposalSha256:hashFile(proposalPath),command:'node research/source-audit-pass8-last-six-crop-resolution/validate-proposal.mjs',scope:'Proposal artifacts, crop/focus/hash bindings, owner coverage, default order, continuation group pins, historical review preservation, and no active-input mutation. Does not independently approve source values, focus suitability, or deployment.',checks,failedChecks:failures};
const out=`${pkg}/author-validation.json`;fs.writeFileSync(path.join(root,out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,passed:Object.values(checks).filter(x=>x.passed).length,failed:failures.length,proposalSha256:result.proposalSha256,validationPath:out},null,2));
if(failures.length)process.exitCode=1;
