import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {regionHashes,canonical} from '../../tools/source-visual-coverage.mjs';
import {validateContinuationManifest} from '../../tools/continuation-contract.mjs';
import {buildPublishedContinuations} from '../../tools/published-continuations.mjs';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const pkg='research/source-audit-pass8-last-six-crop-resolution-v2';
const proposalPath=`${pkg}/source-audit-pass8-last-six-crop-resolution-author-proposal-v2.json`;
const manifestPath=`${pkg}/prospective-continuation-manifest.json`;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashFile=relativePath=>sha(fs.readFileSync(path.join(root,relativePath)));
const readJson=relativePath=>JSON.parse(fs.readFileSync(path.join(root,relativePath),'utf8'));
const writeJson=(relativePath,value)=>fs.writeFileSync(path.join(root,relativePath),JSON.stringify(value,null,2)+'\n');
const proposal=readJson(proposalPath);
const manifest=readJson(manifestPath);
const data=readJson('dist/data.json');
const failures=[];
const checks={};
const assert=(name,ok,details=null)=>{checks[name]={passed:!!ok,...details?{details}:{}};if(!ok)failures.push(name);};
const activeDataSha=hashFile('dist/data.json');
const activeManifestSha=hashFile('research/citation-continuations.json');
const activeLedgerSha=hashFile('research/source-visual-reviews.json');
const activeOverridesSha=hashFile('citation-overrides.json');

assert('v1-package-proposal-still-frozen',hashFile('research/source-audit-pass8-last-six-crop-resolution/source-audit-pass8-last-six-crop-resolution-author-proposal.json')==='a33ec89690145e41e17078ea090f91975815edbce9719f573635c3f8f5ec6b79');
assert('v1-validator-output-and-script-still-frozen',hashFile('research/source-audit-pass8-last-six-crop-resolution/author-validation.json')==='6cc47c6abd2b03b140c77efb61b272a0b10fb262252a75e80cc027df1f002c4b'&&hashFile('research/source-audit-pass8-last-six-crop-resolution/validate-proposal.mjs')==='0424b0d6bdf52d75d27f0bae283acad9c1488435fb8aa832a799d6ba57962282');
assert('independent-pixel-recipe-receipt-pinned',hashFile('research/source-audit-pass8-last-six-crop-pixel-recipe-independent-review.json')==='7d1e5cded6c858769324e97649738f56ae30aa7c6975ef270bab8b9dd4210306');
assert('v1-focus-review-receipt-pinned',proposal.baseline.rootFocusReviewV1?.sha256==='aade310beb9e9d83b6d131a7010c628761243193ee8b667efae2dd36dd24e7c7'&&hashFile(proposal.baseline.rootFocusReviewV1.path)===proposal.baseline.rootFocusReviewV1.sha256);
assert('v2-proposal-research-only',proposal.status.startsWith('research-only')&&proposal.migrationPlan.activeFilesChanged===0&&proposal.migrationPlan.productionEditsProposed===0);
assert('six-replacement-and-one-new-candidate-assets',proposal.candidateRegions.length===7&&proposal.candidateRegions.filter(c=>c.regionId!=='phb-99-9ef97e132b0081e5').length===6);
assert('six-new-candidate-paths-unique',new Set(proposal.candidateRegions.filter(c=>c.regionId!=='phb-99-9ef97e132b0081e5').map(c=>c.region.image)).size===6);

const currentCatalogPathMap=new Map();
function walkJson(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walkJson(p);else if(ent.isFile()&&ent.name.endsWith('.json'))yieldFile(p);}}
function yieldFile(p){
 try{const c=JSON.parse(fs.readFileSync(p,'utf8'));if(!Array.isArray(c.regions))return;const rel=path.relative(path.join(root,'dist'),p).split(path.sep).join('/');for(const r of c.regions)if(typeof r.image==='string')currentCatalogPathMap.set(`${path.posix.dirname(rel)}/${r.image}`,{catalog:rel,regionId:r.id,sha256:r.sha256});}catch{}
}
walkJson(path.join(root,'dist/scans/verified'));
const newAssetRows=proposal.candidateRegions.filter(c=>c.regionId!=='phb-99-9ef97e132b0081e5').map(c=>({regionId:c.regionId,path:`scans/verified/${c.region.image}`,liveCatalogReference:currentCatalogPathMap.get(`scans/verified/${c.region.image}`)||null,existsInLive:fs.existsSync(path.join(root,'dist/scans/verified',c.region.image))}));
assert('new-v2-assets-do-not-collide-with-any-live-catalog-path',newAssetRows.every(r=>!r.liveCatalogReference&&!r.existsInLive),newAssetRows);
assert('candidate-files-exact-and-region-hashes-official',proposal.candidateRegions.every(c=>{
 const b=fs.readFileSync(path.join(root,c.source.candidateAssetPath));
 return sha(b)===c.source.candidateFileSha256&&b.readUInt32BE(16)===c.region.width&&b.readUInt32BE(20)===c.region.height&&JSON.stringify(regionHashes(c.region))===JSON.stringify(c.regionHashes)&&c.source.focusOverlaySha256===hashFile(c.source.focusOverlayPath);
}));
assert('three-field-foci-stop-after-area',Object.entries({'phb-99-ae531be3faf0648b':0.29,'phb-99-4212306ab17751dc':0.32,'phb-99-d6ce0d52b23b9464':0.32}).every(([id,height])=>{
 const c=proposal.candidateRegions.find(x=>x.regionId===id);const [x,y,w,h]=c.region.focusRects[1];return Math.abs(h-height)<1e-9&&y+h<0.52&&x+w<=0.40;
}));
assert('all-foci-precise-and-in-bounds',proposal.candidateRegions.every(c=>c.region.focusRects.length>0&&!c.region.focusRects.some(r=>canonical(r)==='[0,0,1,1]')&&c.region.focusRects.every(([x,y,w,h])=>x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1)));
assert('old-live-catalogs-and-image-paths-unchanged',proposal.sourceOwnerImpacts.every(o=>hashFile(`dist/${o.catalog}`)===o.currentCatalogSha256&&JSON.parse(fs.readFileSync(path.join(root,'dist',o.catalog))).regions.filter(r=>o.changedOrAddedRegionIds.includes(r.id)).every(r=>{
 const review=o.oldRegionReviewHistory.find(x=>x.regionId===r.id);return review&&r.image===`${r.id}.png`&&r.sha256===review.imageSha256&&fs.existsSync(path.join(root,'dist/scans/verified',r.image))&&hashFile(`dist/scans/verified/${r.image}`)===review.imageSha256;
})));
assert('all-eight-owner-review-rows-reset-unreviewed',proposal.proposedSourceExcerptReviewRows.length===8&&proposal.proposedSourceExcerptReviewRows.every(r=>r.status==='unreviewed'&&!r.sentinel&&!r.review&&!r.recordedReview));
assert('default-region-ids-preserved-and-all-order-pins-recomputed',proposal.perPageDefaultOrderPins.length===13&&proposal.perPageDefaultOrderPins.every(pin=>pin.defaultRegionIdPreserved));
for(const pin of proposal.perPageDefaultOrderPins){
 const current=readJson(`dist/${pin.catalog}`);
 const draft=readJson(`${pkg}/draft-catalogs/${path.basename(pin.catalog)}`);
 const make=cat=>{
  const regs=[...cat.regions.filter(r=>r.book===pin.book&&r.printedPage===pin.printedPage)].sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
  return {orderedRegionIds:regs.map(r=>r.id),defaultRegionId:regs[0]?.id||null,defaultImageSha256:regs[0]?.sha256||null,defaultOrderSha256:sha(Buffer.from(canonical(regs.map(r=>({id:r.id,role:r.role||null,imageSha256:r.sha256,...regionHashes(r)})))))};
 };
 assert(`pin-current-${pin.itemId}-${pin.printedPage}`,JSON.stringify(make(current))===JSON.stringify({orderedRegionIds:pin.current.orderedRegionIds,defaultRegionId:pin.current.defaultRegionId,defaultImageSha256:pin.current.defaultImageSha256,defaultOrderSha256:pin.current.defaultOrderSha256}));
 assert(`pin-proposed-${pin.itemId}-${pin.printedPage}`,JSON.stringify(make(draft))===JSON.stringify({orderedRegionIds:pin.proposed.orderedRegionIds,defaultRegionId:pin.proposed.defaultRegionId,defaultImageSha256:pin.proposed.defaultImageSha256,defaultOrderSha256:pin.proposed.defaultOrderSha256}));
}

const illOwner=proposal.ownerPageGap;
assert('illusionist-owner-page-gap-distinct-and-source-bound',illOwner.owner.itemId==='ua-illusionist-ultravision'&&illOwner.owner.printedPage===68&&illOwner.owner.pdfPage===69&&illOwner.status==='bounded-owner-excerpt-pending'&&illOwner.currentCatalogRegionId==='ua-68-5bba115e88b7dfdf'&&illOwner.privateRenderSha256==='158cc5e56e00ce76021a2cd647f63dd960389ad5b9737a950ce0a76c53e3814c');
const illGroup=manifest.groups.find(g=>g.itemId==='ua-illusionist-ultravision');
assert('illusionist-group-is-related-context-not-own-header',illGroup.relationship?.kind==='related-source-rules'&&illGroup.relationship.ownerPage.book==='UA'&&illGroup.relationship.ownerPage.printedPage===68&&illGroup.source.printedPage===68&&illGroup.segments.length===2&&illGroup.segments.every(s=>s.role==='context'&&s.book==='UA'&&s.printedPage!==68)&&illGroup.currentCitationPages.some(p=>p.printedPage===68&&!p.regionIds));
assert('prospective-manifest-hash-pinned-outside-active-manifest',proposal.prospectiveProductionSchema.active===false&&proposal.prospectiveProductionSchema.manifestSha256===hashFile(manifestPath)&&activeManifestSha===proposal.baseline.currentContinuationManifestSha256);
assert('official-manifest-has-six-groups-and-twelve-segments',manifest.schemaVersion===1&&manifest.groups.length===6&&manifest.groups.reduce((n,g)=>n+g.segments.length,0)===12&&manifest.groups.every(g=>g.status==='segments-present-pending-deployment'));

const stage=path.join(os.tmpdir(),'adnd1-last-six-v2-official-overlay');
fs.rmSync(stage,{recursive:true,force:true});
const catalogRoot=path.join(stage,'dist');
fs.mkdirSync(path.join(catalogRoot,'scans/verified'),{recursive:true});
for(const owner of proposal.sourceOwnerImpacts){
 const catPath=`${pkg}/draft-catalogs/${path.basename(owner.catalog)}`;
 fs.copyFileSync(path.join(root,catPath),path.join(catalogRoot,owner.catalog));
}
const candidateById=new Map(proposal.candidateRegions.map(c=>[c.regionId,c]));
for(const group of manifest.groups){
 const cat=JSON.parse(fs.readFileSync(path.join(catalogRoot,group.catalog),'utf8'));
 for(const segment of group.segments){
  const region=cat.regions.find(r=>r.id===segment.regionId);
  const candidate=candidateById.get(segment.regionId);
  const src=candidate?path.join(root,candidate.source.candidateAssetPath):path.join(root,'dist',group.catalog.slice(0,group.catalog.lastIndexOf('/')+1),region.image);
  const dst=path.join(catalogRoot,group.catalog.slice(0,group.catalog.lastIndexOf('/')+1),region.image);
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.copyFileSync(src,dst);
 }
}
let officialValidation=null,projection=null,officialError=null;
try{
 officialValidation=validateContinuationManifest(manifest,{data,catalogRoot});
 projection=buildPublishedContinuations({manifest,data,catalogRoot});
}catch(e){officialError=e.message;}
assert('official-continuation-manifest-validator',!officialError&&officialValidation?.groups===6&&officialValidation.segments===12&&officialValidation.presentSegments===12&&officialValidation.blockedSegments===0,{officialValidation,officialError});
if(projection){
 writeJson(`${pkg}/prospective-published-continuations.json`,projection);
 assert('official-published-projection-preserves-six-group-scope',projection.groups.length===6&&projection.counts.groups===6&&projection.groups.find(g=>g.itemId==='ua-illusionist-ultravision')?.relationship?.ownerPage?.printedPage===68);
}else fs.rmSync(path.join(root,`${pkg}/prospective-published-continuations.json`),{force:true});

assert('active-source-inputs-unchanged',activeDataSha===proposal.baseline.currentDataSha256&&activeManifestSha===proposal.baseline.currentContinuationManifestSha256&&activeLedgerSha===proposal.baseline.currentVisualReviewLedgerSha256&&activeOverridesSha===proposal.baseline.citationOverridesSha256);
const result={schemaVersion:1,artifactType:'last-six-crop-v2-official-continuation-projection-validation',status:failures.length?'failed':'passed',proposalPath,proposalSha256:hashFile(proposalPath),manifestPath,manifestSha256:hashFile(manifestPath),projectionPath:projection?`${pkg}/prospective-published-continuations.json`:null,projectionSha256:projection?hashFile(`${pkg}/prospective-published-continuations.json`):null,command:`node ${pkg}/validate-v2-projection.mjs`,scope:'V2 proposal assets, unique filename/no-overwrite guard, focus/order/content hashes, owner gap/relationship semantics, and official continuation contract plus publication projection against an isolated catalog overlay. No production file or catalog was modified; this is not independent focus/default/source-value approval.',isolatedOverlay:{path:stage,catalogs:proposal.sourceOwnerImpacts.length,segmentImages:manifest.groups.reduce((n,g)=>n+g.segments.length,0)},officialValidation,checks,failedChecks:failures};
writeJson(`${pkg}/official-projection-validation-v2.json`,result);
console.log(JSON.stringify({status:result.status,passed:Object.values(checks).filter(x=>x.passed).length,failed:failures.length,officialValidation,proposalSha256:result.proposalSha256,manifestSha256:result.manifestSha256,projectionSha256:result.projectionSha256,validationPath:`${pkg}/official-projection-validation-v2.json`,officialError},null,2));
if(failures.length)process.exitCode=1;
