// Independent structural calibrations only. Synthetic targets/reviews below do
// not approve source pixels, monetary values, precise highlights or defaults.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {
  auditMonetaryRowIdentity,collectMonetaryRowIdentityRecords,loadMonetaryRowIdentityAudit,
  monetaryRowIdentityInputs,hash,
} from '../tools/monetary-row-identity-audit.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const rawUa=gunzipSync(read('tests/fixtures/monetary-source-ua-583-before.json.gz'));
const rawPd=gunzipSync(read('tests/fixtures/monetary-source-phbdmg-179-before.json.gz'));
assert.equal(hash(rawUa),'8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a');
assert.equal(hash(rawPd),'b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9');
const calibrationBytes=read('research/source-audit-batch5-monetary-context-adapter-falsepasses-before.json');
assert.equal(hash(calibrationBytes),'12e49bbd00e91a042479937bdb07bcde41a013f3cd53bbfb21e2bb5e6416d950');
const calibration=JSON.parse(calibrationBytes);
const gpFinding=JSON.parse(read('research/source-audit-batch5-monetary-context-crop-findings-extension.json')).knownFindings.find(f=>f.requiredContextExtent);
const evidenceBytes=Buffer.from('Independent synthetic protocol fixture only; no actual source approval.');
const reviewEvidence=new Map([['synthetic-context-review',evidenceBytes]]);
const evidence={path:'synthetic-context-review',sha256:hash(evidenceBytes)};
function documents(){
 const bodies={canonical:{sourceInventories:[],siteClaims:[],sourcePageCensuses:[]},ua:JSON.parse(rawUa),phbDmg:JSON.parse(rawPd),passages:{records:[]},descriptions:{newSourceDescriptionRecords:[],pointerResolutionLinks:[]},receipts:{claimReceipts:[]},phbDmgCensus:{records:[]},uaCensus:{records:[]},monsterCensus:{claims:[]}};
 return new Map(monetaryRowIdentityInputs.map(c=>[c.key,{...c,sha256:c.key==='ua'?hash(rawUa):c.key==='phbDmg'?hash(rawPd):hash(bodies[c.key]),data:bodies[c.key]}]));
}
function normalized(docs){return auditMonetaryRowIdentity(collectMonetaryRowIdentityRecords(docs).records).records;}
function reference(r){return {uid:r.uid,rowIdentitySha256:r.rowIdentitySha256,focusGeometrySha256:r.focusGeometrySha256,focusPhysicalFingerprintVersion:r.focusPhysicalFingerprintVersion,focusPhysicalGeometrySha256:r.focusPhysicalGeometrySha256,contextGeometrySha256:r.contextGeometrySha256,recordSha256:r.recordSha256,...(r.contextEvidenceSha256?{contextEvidenceSha256:r.contextEvidenceSha256,contextPhysicalEvidenceSha256:r.contextPhysicalEvidenceSha256,contextPhysicalFingerprintVersion:r.contextPhysicalFingerprintVersion}: {})};}
function refreshSyntheticPhysicalWindow(record){
 for(const crop of record.contextEvidence.crops){
  const m=crop.metadata;
  crop.physicalWindow={source:{book:record.contextEvidence.sourceFrame.book,printedPage:record.contextEvidence.sourceFrame.printedPage,pdfPage:record.contextEvidence.sourceFrame.pdfPage,sourcePdfSha256:record.contextEvidence.sourceFrame.sourcePdfSha256},space:'normalized-source-render-page',bounds:m.cropBoundsPixelsLTRB.map((n,i)=>Number((n/m.sourceRenderDimensionsPx[i%2]).toFixed(6)))};
 }
}
function reviewContext(record,{mutate=null,requiredContextExtent=null}={}){
 const frozen=structuredClone(record);auditMonetaryRowIdentity([frozen]);
 const finding={id:'synthetic-context-finding',kind:'source-context-crop-defect',records:[reference(frozen)],...(requiredContextExtent?{requiredContextExtent}: {})};
 const current=structuredClone(record);if(mutate)mutate(current);auditMonetaryRowIdentity([current]);
 const review={id:'synthetic-context-repair',independent:true,disposition:'source-reviewed-repair',supersedes:finding.id,evidence,records:[reference(current)]};
 return auditMonetaryRowIdentity([current],{knownFindings:[finding],reviews:[review],reviewEvidence});
}
function pdRecord(docs=documents()){return normalized(docs).find(r=>r.surface==='phb-dmg-supplement-row');}
function uaFixture(){
 const docs=documents(),ua=docs.get('ua').data,group=ua.groupReviews[0],rows=ua.rowRecords.filter(r=>r.recordId.startsWith(group.groupId+'-')),row=rows[0];
 const make=(targetId,targetOrder,pdfPage=76,rowRecordIds=null)=>({targetId,targetOrder,role:targetOrder===1?'primary-table-context':'required-note-context',segmentId:'armor-costs',...(rowRecordIds?{rowRecordIds}:{}),source:{book:'UA',sourcePdfSha256:ua.source.sha256,printedPage:pdfPage-1,pdfPage},sourceRender:{sourceRenderId:'synthetic-native-render-'+pdfPage,sourceRenderSha256:targetOrder===1?row.evidence.pageImageSha256:'b'.repeat(64),sourceRenderDimensionsPx:[1488,1930],renderDpi:180,coordinateSpace:'source-render pixels; top-left; LTRB half-open'},crop:{cropBoundsPdfPagePointsTopLeftLTRB:[300,45,590,305],cropBoundsPixelsLTRB:[750,113,1475,763],cropDimensionsPx:[725,650],cropSha256:(targetOrder===1?'a':'c').repeat(64),renderDpi:180,coordinateSpace:'source-render pixels; top-left; LTRB half-open'},pixelReview:{status:'synthetic-protocol-only-no-source-approval'}});
 group.activeContextTargets=[make('synthetic-primary',1),make('synthetic-cross-page-note',2,85,[row.recordId])];
 const link=t=>({targetId:t.targetId,targetOrder:t.targetOrder,role:t.role,segmentId:t.segmentId});
 for(const r of rows)r.evidence.activeContextTargetLinks=[link(group.activeContextTargets[0])];
 row.evidence.activeContextTargetLinks.push(link(group.activeContextTargets[1]));
 return {docs,ua,group,rows,row,make,link,get:()=>normalized(docs).find(r=>r.id===row.recordId)};
}

test('frozen source adapters expose all344 PD and583 UA context bindings without source-completeness inference',()=>{
 const records=normalized(documents()),contexts=records.filter(r=>r.contextEvidence);
 assert.equal(contexts.length,927);
 assert.equal(contexts.filter(r=>r.surface==='phb-dmg-supplement-row').length,179);
 assert.equal(contexts.filter(r=>r.surface==='phb-reference-row-comparison').length,165);
 assert.equal(contexts.filter(r=>r.surface==='ua-supplement-row').length,583);
 assert.ok(contexts.filter(r=>r.surface==='ua-supplement-row').every(r=>r.contextEvidence.status==='legacy-declared-context-metadata;active-targets-unassessed'&&r.contextEvidence.activeTargetStatus==='active-context-target-array-missing'));
 assert.ok(contexts.filter(r=>r.surface==='ua-supplement-row').every(r=>r.contextEvidence.legacyProjection.sourceEvidenceIndex.length>0));
 assert.ok(contexts.filter(r=>r.surface==='ua-supplement-row').every(r=>/^[a-f0-9]{64}$/.test(r.contextEvidenceSha256)));
 const uaBefore=contexts.find(r=>r.surface==='ua-supplement-row');
 assert.deepEqual(uaBefore.contextEvidence.legacyProjection.rowContext.tableCropBounds,JSON.parse(rawUa).rowRecords[0].evidence.tableCropBounds);
 assert.equal(reviewContext(uaBefore).validation.valid,false,'legacy metadata projection is not a valid active context repair');
});

test('PD context fingerprint ignores unrelated artifact edits and shared membership but binds actual crop frames',()=>{
 const docs=documents(),before=pdRecord(docs),data=docs.get('phbDmg').data;
 data.review.sourceRowsOrClaims[1].objectOrSubject+=' unrelated synthetic edit';docs.get('phbDmg').sha256='f'.repeat(64);
 data.review.sourceRowsOrClaims.push({...structuredClone(data.review.sourceRowsOrClaims[0]),sourceRowOrClaimId:'synthetic-other-owner'});
 assert.equal(pdRecord(docs).contextEvidenceSha256,before.contextEvidenceSha256);
 const crop=data.review.evidenceCrops.find(c=>c.cropId===before.contextEvidence.crops[0].cropId);
 crop.cropSha256='d'.repeat(64);assert.notEqual(pdRecord(docs).contextEvidenceSha256,before.contextEvidenceSha256);
});

test('fresh exact reviews reject malformed, missing and stale-status PD contexts',()=>{
 const sample=pdRecord();
 assert.equal(reviewContext(sample).validation.valid,false,'unchanged confirmed bad context cannot be called repaired');
 assert.equal(reviewContext(sample,{mutate:r=>{const m=r.contextEvidence.crops[0].metadata;m.cropBoundsPixelsLTRB[0]--;m.cropDimensionsPx[0]++;m.cropSha256='d'.repeat(64);refreshSyntheticPhysicalWindow(r);}}).validation.valid,true,'changed-dimension synthetic positive control');
 const mutations=[
  ['width off by one',r=>r.contextEvidence.crops[0].metadata.cropDimensionsPx[0]++],
  ['fractional pixel bound',r=>{r.contextEvidence.crops[0].metadata.cropBoundsPixelsLTRB[0]+=.5;r.contextEvidence.crops[0].metadata.cropDimensionsPx[0]-=.5;}],
  ['reversed bound',r=>r.contextEvidence.crops[0].metadata.cropBoundsPixelsLTRB[2]=0],
  ['outside render',r=>r.contextEvidence.crops[0].metadata.cropBoundsPixelsLTRB[2]=999999],
  ['zero PDF page',r=>r.contextEvidence.sourceFrame.pdfPage=0],
  ['missing metadata',r=>r.contextEvidence.crops[0].metadata=null],
  ['unresolved status',r=>r.contextEvidence.status='declared-context-crop-unresolved'],
  ['evidence deleted with cached hash',r=>delete r.contextEvidence],
  ['evidence and cached hash deleted',r=>{delete r.contextEvidence;delete r.contextEvidenceSha256;delete r.contextFingerprintVersion;}],
  ['extra unresolved declared link',r=>r.contextEvidence.declaredLinks.push({field:'synthetic-extra',cropId:'unresolved-extra-target'})],
 ];
 for(const [label,mutate]of mutations)assert.equal(reviewContext(sample,{mutate}).validation.valid,false,label);
 assert.equal(calibration.cases.extraUnresolvedDeclaredLink.actualValid,true,'historical pre-fix false pass retained');
});

test('actual missing GP caption remains red under fresh review and synthetic containment grants no semantic pass',()=>{
 const sample=pdRecord(),requiredContextExtent=gpFinding.requiredContextExtent;
 assert.equal(sample.id,'phb-assassination-fees-row-01');
 assert.equal(reviewContext(sample,{requiredContextExtent}).validation.valid,false);
 const positive=reviewContext(sample,{requiredContextExtent,mutate:r=>{Object.assign(r.contextEvidence.crops[0].metadata,{cropBoundsPixelsLTRB:[25,1020,1175,1600],cropDimensionsPx:[1150,580],cropSha256:'d'.repeat(64)});refreshSyntheticPhysicalWindow(r);}});assert.equal(positive.validation.valid,true);assert.equal(positive.validation.semanticRowIdentityComplete,false);
});

test('image-hash-only changes cannot repair a clipped context or an unchanged wrong focus',()=>{
 const preserved=read('research/source-audit-batch5-monetary-physical-dimension-protocol-before.json');
 assert.equal(hash(preserved),'d7f6da667c21390def776a20fc68de659e39ac14f19222fed9699fa6a7108bd4');
 const cropFindings=JSON.parse(read('research/source-audit-batch5-monetary-context-crop-findings-extension.json')).knownFindings;
 const feeFindings=JSON.parse(read('research/source-audit-batch5-monetary-assassination-focus-falsepasses-extension.json')).knownFindings;
 for(const finding of [cropFindings.find(f=>f.contextAsset.cropId==='crop-dmg-high-value-gems-01'),feeFindings[0]]){
  const docs=documents(),before=normalized(docs).find(r=>r.uid===finding.records[0].uid),cropId=before.contextEvidence.crops[0].cropId;
  docs.get('phbDmg').data.review.evidenceCrops.find(c=>c.cropId===cropId).cropSha256='f'.repeat(64);
  const current=normalized(docs).find(r=>r.uid===before.uid);
  assert.deepEqual(current.contextEvidence.crops[0].metadata.cropBoundsPixelsLTRB,before.contextEvidence.crops[0].metadata.cropBoundsPixelsLTRB);
  const review={id:'synthetic-image-only-'+finding.id,independent:true,disposition:'source-reviewed-repair',supersedes:finding.id,evidence,records:[reference(current)]};
  assert.equal(auditMonetaryRowIdentity([current],{knownFindings:[finding],reviews:[review],reviewEvidence}).validation.valid,false,finding.kind);
 }
});

test('all80 frozen PHB123 comparison owners can bind a changed context window',()=>{
 const finding=JSON.parse(read('research/source-audit-batch5-monetary-context-crop-findings-extension.json')).knownFindings.find(f=>f.contextAsset.cropId==='phb123-previous-p35-equipment-tables');
 assert.equal(finding.records.length,80);
 const docs=documents(),crop=docs.get('phbDmg').data.review.evidenceCrops.find(c=>c.cropId===finding.contextAsset.cropId);
 crop.cropBoundsPixelsLTRB[0]--;crop.cropDimensionsPx[0]++;crop.cropSha256='f'.repeat(64);
 const records=normalized(docs).filter(r=>finding.records.some(ref=>ref.uid===r.uid));
 const review={id:'synthetic-comparison-window-change',independent:true,disposition:'source-reviewed-repair',supersedes:finding.id,evidence,records:records.map(reference)};
 assert.equal(auditMonetaryRowIdentity(records,{knownFindings:[finding],reviews:[review],reviewEvidence}).validation.valid,true,'synthetic necessary-dimension positive; no source-semantic approval');
});

function orderedPartsFixture(){
 const docs=documents(),pd=docs.get('phbDmg').data,row=pd.review.sourceRowsOrClaims.find(r=>r.sourceRowOrClaimId==='dmg-deck-gem-card');
 const sourcePdfSha256='7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669';
 row.source={book:'DMG',printedPage:143,pdfPage:144,sourceFileSha256:sourcePdfSha256};
 row.typedValue={quantityChoice:'synthetic choice',gemBaseValueGpEach:1000};
 const crop=(id,n)=>({cropId:id,groupId:'synthetic-parts',label:id,sourceRender:`synthetic-page-${n}.png`,sourceRenderSha256:String(n).repeat(64),sourceRenderDimensionsPx:[1200,1600],cropBoundsPixelsLTRB:[100,200,300,400],cropBoundsPdfPagePointsTopLeftLTRB:[48,96,144,192],cropDimensionsPx:[200,200],cropSha256:String(n+3).repeat(64),renderDpi:150});
 pd.review.evidenceCrops.push(crop('synthetic-quantity',1),crop('synthetic-value',2),crop('synthetic-support',3));
 row.contextCropId='synthetic-value';row.focus={contextCropId:'synthetic-value',focusBoundsCropPixelsLTRB:[10,10,150,50],coordinateSpace:'crop-local 150-dpi source-render pixels'};
 const part=(id,order,cropId,pointer,page)=>({partId:id,order,role:'synthetic-fact-context',factPointers:pointer?[pointer]:[],contextCropId:cropId,source:{book:'DMG',printedPage:page-1,pdfPage:page,sourceFileSha256:sourcePdfSha256},focusBoundsCropPixelsLTRB:pointer?[10,10,150,50]:null});
 row.sourceContextParts=[part('choice',1,'synthetic-quantity','/typedValue/quantityChoice',143),part('value',2,'synthetic-value','/typedValue/gemBaseValueGpEach',144)];
 row.primaryPartIdByFact={'/typedValue/quantityChoice':'choice','/typedValue/gemBaseValueGpEach':'value'};
 const get=()=>collectMonetaryRowIdentityRecords(docs).records.find(r=>r.uid==='phb-dmg-supplement-row:dmg-deck-gem-card');
 return {docs,pd,row,part,get,run:()=>auditMonetaryRowIdentity([get()])};
}

test('ordered parts allow split support and context-only passages without fake fact pointers',()=>{
 const nominal=orderedPartsFixture();assert.equal(nominal.run().validation.valid,true);
 const split=orderedPartsFixture();split.row.sourceContextParts.push(split.part('support',3,'synthetic-support','/typedValue/gemBaseValueGpEach',144));assert.equal(split.run().validation.valid,true,'same fact may require more than one passage');
 const context=orderedPartsFixture();context.row.sourceContextParts.push(context.part('owner-opening',3,'synthetic-support',null,144));assert.equal(context.run().validation.valid,true,'context-only passage needs no invented fact pointer or highlight');
});

test('ordered parts reject unresolved facts, unrelated primaries and contradictory frames',()=>{
 const rawCases=[
  ['unknown fact',f=>{f.row.sourceContextParts[0].factPointers=['/typedValue/notAuthored'];delete f.row.primaryPartIdByFact['/typedValue/quantityChoice'];f.row.primaryPartIdByFact['/typedValue/notAuthored']='choice';}],
  ['unrelated primary',f=>f.row.primaryPartIdByFact['/typedValue/quantityChoice']='value'],
  ['extra primary',f=>f.row.primaryPartIdByFact['/notAuthored']='choice'],
  ['context-only primary',f=>{f.row.sourceContextParts.push(f.part('owner-opening',3,'synthetic-support',null,144));f.row.primaryPartIdByFact['/typedValue/quantityChoice']='owner-opening';}],
  ['missing primary',f=>delete f.row.primaryPartIdByFact['/typedValue/quantityChoice']],
  ['duplicate order',f=>f.row.sourceContextParts[1].order=1],
  ['foreign source PDF',f=>f.row.sourceContextParts[1].source.sourceFileSha256='f'.repeat(64)],
  ['zero source page',f=>f.row.sourceContextParts[1].source.pdfPage=0],
 ];
 for(const [label,change]of rawCases){const f=orderedPartsFixture();change(f);assert.equal(f.run().validation.valid,false,label);}
 const normalizedCases=[
  ['part/render dimension contradiction',r=>{const s=r.contextEvidence.sourceContextParts[0].sourceRender;s.sourceRenderDimensionsPx=[s.sourceRenderDimensionsPx[0]+1,s.sourceRenderDimensionsPx[1]];}],
  ['part/render DPI contradiction',r=>r.contextEvidence.sourceContextParts[0].sourceRender.renderDpi++],
  ['part/crop source hash contradiction',r=>r.contextEvidence.sourceContextParts[0].crop.sourcePdfSha256='f'.repeat(64)],
 ];
 for(const [label,change]of normalizedCases){const r=orderedPartsFixture().get();change(r);assert.equal(auditMonetaryRowIdentity([r]).validation.valid,false,label);}
});

test('ordered parts preserve and validate a distinct supplemental row context',()=>{
 const f=orderedPartsFixture();f.row.contextCropId='synthetic-support';f.row.focus.contextCropId='synthetic-support';
 const r=f.run().records[0];assert.equal(f.run().validation.valid,true);
 assert.deepEqual(r.contextEvidence.supplementalContextCrops.map(c=>c.cropId),['synthetic-support']);
 const mutated=structuredClone(r);mutated.contextEvidence.supplementalContextCrops[0].metadata.cropDimensionsPx[0]++;
 assert.equal(auditMonetaryRowIdentity([mutated]).validation.valid,false,'supplemental frame contradiction is not ignored');
 const foreign=structuredClone(r);foreign.contextEvidence.supplementalContextCrops[0].source.sourcePdfSha256='f'.repeat(64);
 assert.equal(auditMonetaryRowIdentity([foreign]).validation.valid,false,'supplemental source identity remains bound');
});

test('cached windows and a scaled raster frame cannot fabricate repaired source coverage',()=>{
 const sample=pdRecord();
 assert.equal(reviewContext(sample,{mutate:r=>r.contextEvidence.crops[0].physicalWindow.bounds[0]-=.01}).validation.valid,false,'cached physical-window edit alone');
 const result=reviewContext(sample,{mutate:r=>{const m=r.contextEvidence.crops[0].metadata;m.cropBoundsPixelsLTRB=m.cropBoundsPixelsLTRB.map(n=>n*2);m.sourceRenderDimensionsPx=m.sourceRenderDimensionsPx.map(n=>n*2);m.cropDimensionsPx=m.cropDimensionsPx.map(n=>n*2);m.cropSha256='d'.repeat(64);m.sourceRenderSha256='e'.repeat(64);refreshSyntheticPhysicalWindow(r);}});
 assert.equal(result.validation.valid,false,'same PDF window rerendered at double resolution does not repair a known clipping defect');
});

test('UA targets consume ordered multi-page contexts while preserving legacy row focus',()=>{
 const f=uaFixture(),r=f.get(),legacy=normalized(documents()).find(r=>r.id===f.row.recordId);
 assert.equal(r.contextEvidence.status,'declared-active-context-targets-linked');
 assert.deepEqual(r.contextEvidence.crops.map(c=>c.source.pdfPage),[76,85]);
 assert.deepEqual(r.contextEvidence.crops.map(c=>c.cropId),['synthetic-primary','synthetic-cross-page-note']);
 assert.equal(r.focusGeometrySha256,legacy.focusGeometrySha256);assert.equal(r.contextGeometrySha256,legacy.contextGeometrySha256);
});

test('UA fingerprint binds every source/render/crop frame and excludes unrelated owners',()=>{
 const base=uaFixture().get().contextEvidenceSha256;
 const changes=[
  ['native source DPI',f=>f.group.activeContextTargets[1].sourceRender.renderDpi=150],
  ['source render ID',f=>f.group.activeContextTargets[1].sourceRender.sourceRenderId='different-frame'],
  ['source render hash',f=>f.group.activeContextTargets[1].sourceRender.sourceRenderSha256='d'.repeat(64)],
  ['source render dimensions',f=>f.group.activeContextTargets[1].sourceRender.sourceRenderDimensionsPx[0]++],
  ['source PDF page',f=>f.group.activeContextTargets[1].source.pdfPage++],
  ['crop image hash',f=>f.group.activeContextTargets[1].crop.cropSha256='d'.repeat(64)],
  ['crop PDF points',f=>f.group.activeContextTargets[1].crop.cropBoundsPdfPagePointsTopLeftLTRB[0]--],
  ['crop raster bounds',f=>{f.group.activeContextTargets[1].crop.cropBoundsPixelsLTRB[0]--;f.group.activeContextTargets[1].crop.cropDimensionsPx[0]++;}],
 ];
 for(const [label,change]of changes){const f=uaFixture();change(f);assert.notEqual(f.get().contextEvidenceSha256,base,label);}
 const stable=[
  ['unrelated typed row',f=>{f.rows[1].object+=' unrelated';f.docs.get('ua').sha256='f'.repeat(64);}],
  ['other owner membership',f=>f.group.activeContextTargets[1].rowRecordIds.push(f.rows[1].recordId)],
  ['other target definition',f=>f.group.activeContextTargets.push(f.make('synthetic-other-target',3,90,[f.rows[1].recordId]))],
  ['unrelated legacy segment',f=>f.group.sourceEvidenceIndex.push({segmentId:'unrelated-synthetic-segment',pageImageSha256:'d'.repeat(64)})],
 ];
 for(const [label,change]of stable){const f=uaFixture();change(f);assert.equal(f.get().contextEvidenceSha256,base,label);}
 assert.equal(calibration.cases.nativeSourceRenderDpiChangedWithoutFingerprintChange.recordedResult.actualStale,false,'historical native-DPI false pass retained');
});

test('UA malformed active arrays never silently fall back to legacy context',()=>{
 const cases=[
  ['missing target array',f=>delete f.group.activeContextTargets],
  ['empty target array',f=>f.group.activeContextTargets=[]],
  ['missing linked target',f=>f.group.activeContextTargets.pop()],
  ['duplicate target ID',f=>f.group.activeContextTargets[1].targetId='synthetic-primary'],
  ['duplicate row link',f=>f.row.evidence.activeContextTargetLinks.push({...f.row.evidence.activeContextTargetLinks[0]})],
  ['reversed row links',f=>f.row.evidence.activeContextTargetLinks.reverse()],
  ['foreign original PDF SHA',f=>f.group.activeContextTargets[0].source.sourcePdfSha256='d'.repeat(64)],
  ['wrong row owner',f=>f.group.activeContextTargets[1].rowRecordIds=[f.rows[1].recordId]],
  ['wrong declared role',f=>f.row.evidence.activeContextTargetLinks[0].role='different-role'],
  ['wrong crop dimensions',f=>f.group.activeContextTargets[0].crop.cropDimensionsPx[0]++],
 ];
 for(const [label,change]of cases){const f=uaFixture();change(f);assert.notEqual(f.get().contextEvidence.status,'declared-active-context-targets-linked',label);}
});

test('UA fact focus must lie in an actual primary context, with original legacy status unassessed',()=>{
 const f=uaFixture(),primary=f.group.activeContextTargets[0];
 primary.crop.cropBoundsPdfPagePointsTopLeftLTRB=[300,320,590,580];primary.crop.cropBoundsPixelsLTRB=[750,800,1475,1450];
 assert.equal(f.get().uaPrimaryContextContainment.status,'row-focus-exceeds-primary-context-window');
 assert.equal(auditMonetaryRowIdentity([f.get()]).validation.valid,false,'declared primary misses source fact');
 const supplemental=f.make('synthetic-row-context',3,76,[f.row.recordId]);supplemental.role='row-specific-table-context';f.group.activeContextTargets.push(supplemental);f.row.evidence.activeContextTargetLinks.push(f.link(supplemental));
 assert.equal(auditMonetaryRowIdentity([f.get()]).validation.valid,false,'correct supplemental crop does not rescue the wrong primary');
 const legacy=normalized(documents()).filter(r=>r.surface==='ua-supplement-row');assert.equal(legacy.length,583);assert.ok(legacy.every(r=>r.contextEvidence.status==='legacy-declared-context-metadata;active-targets-unassessed'));
});

test('unlinked authored UA target definitions and exact joins remain explicit inventory',()=>{
 const f=uaFixture();f.group.activeContextTargets.push(f.make('synthetic-unlinked-target',3,90,[f.rows[1].recordId]));
 const result=collectMonetaryRowIdentityRecords(f.docs),inventory=result.uaActiveContextTargetInventory;
 assert.ok(inventory);assert.equal(inventory.counts.targetDefinitions,3);
 const target=inventory.groups.flatMap(g=>g.targets).find(t=>t.targetId==='synthetic-unlinked-target');
 assert.equal(target.status,'unreferenced-active-target');assert.deepEqual(target.rowLinks,[]);
 assert.equal(target.source.pdfPage,90);assert.equal(target.crop.cropSha256,'c'.repeat(64));
 assert.equal(inventory.counts.malformedOrUnreferenced,1);
});

function provenanceFixture(){
 const finding=JSON.parse(read('research/source-audit-batch5-monetary-provenance-finding-extension.json')).knownFindings[0];
 const r=normalized(documents()).find(r=>r.uid===finding.records[0].uid);
 const path='research/synthetic-corrected-provenance.json',bytes=Buffer.from(JSON.stringify({anchor:finding.expectedValue}));
 const review={id:'synthetic-provenance-repair',independent:true,disposition:'source-reviewed-repair',supersedes:finding.id,evidence,records:[reference(r)],provenanceArtifact:{path,sha256:hash(bytes),pointer:'/anchor',value:finding.expectedValue}};
 const artifacts=new Map([[finding.provenanceArtifact.path,read(finding.provenanceArtifact.path)],[path,bytes]]);
 return {finding,r,review,artifacts,path,bytes,run:()=>auditMonetaryRowIdentity([r],{knownFindings:[finding],reviews:[review],reviewEvidence,provenanceArtifacts:artifacts})};
}

test('provenance repair requires actual corrected bytes and exact target/current-record hashes',()=>{
 const positive=provenanceFixture().run();assert.equal(positive.validation.valid,true);assert.equal(positive.knownFindings[0].status,'explicit-source-reviewed-provenance-repair');assert.equal(positive.validation.semanticRowIdentityComplete,false);
 const cases=[
  ['corrected bytes unavailable',f=>f.artifacts.delete(f.path)],
  ['corrected bytes mutated',f=>f.artifacts.set(f.path,Buffer.from('{}'))],
  ['wrong corrected path',f=>f.review.provenanceArtifact.path='research/missing-corrected.json'],
  ['wrong corrected pointer',f=>f.review.provenanceArtifact.pointer='/missing'],
  ['wrong review value',f=>f.review.provenanceArtifact.value='five'],
  ['missing current record hash',f=>delete f.review.records[0].recordSha256],
  ['missing current context hash',f=>delete f.review.records[0].contextEvidenceSha256],
  ['wrong current focus hash',f=>f.review.records[0].focusGeometrySha256='f'.repeat(64)],
  ['wrong target hash',f=>f.review.provenanceArtifact.sha256='f'.repeat(64)],
  ['coordinated hash/value still wrong',f=>{const bytes=Buffer.from(JSON.stringify({anchor:'five'}));f.artifacts.set(f.path,bytes);f.review.provenanceArtifact.sha256=hash(bytes);f.review.provenanceArtifact.value='five';}],
 ];
 for(const [label,change]of cases){const f=provenanceFixture();change(f);assert.equal(f.run().validation.valid,false,label);}
});

test('provenance metadata review cannot waive another source dimension on the same row',()=>{
 const f=provenanceFixture(),ref=reference(f.r);
 const others=[{id:'synthetic-other-context',kind:'source-context-crop-defect',records:[ref]},{id:'synthetic-other-content',kind:'typed-content-mismatch',records:[ref]},{id:'synthetic-other-focus',kind:'wrong-row-focus-independent-source-review',records:[ref]}];
 const report=auditMonetaryRowIdentity([f.r],{knownFindings:[f.finding,...others],reviews:[f.review],reviewEvidence,provenanceArtifacts:f.artifacts});
 assert.equal(report.knownFindings[0].status,'explicit-source-reviewed-provenance-repair');
 assert.deepEqual(report.validation.unresolvedKnownFindingIds,others.map(f=>f.id));assert.equal(report.validation.valid,false);
});

test('loader reads corrected provenance target bytes rather than trusting a review reference',()=>{
 const repoRoot=mkdtempSync(join(tmpdir(),'monetary-provenance-protocol-'));
 try{
  const f=provenanceFixture(),docs=documents(),save=(path,bytes)=>{const target=join(repoRoot,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);};
  for(const [,doc]of docs)save(doc.path,JSON.stringify(doc.data));
  const baselinePath='research/synthetic-finding-baseline.json',baselineBytes=Buffer.from(JSON.stringify({schemaVersion:1,reviewDispositions:{knownFindings:[f.finding]}}));save(baselinePath,baselineBytes);
  save('research/monetary-row-identity-findings.json',JSON.stringify({schemaVersion:1,baseline:{path:baselinePath,sha256:hash(baselineBytes)},extensions:[]}));
  save('research/monetary-row-identity-reviews.json',JSON.stringify({reviews:[f.review]}));save(evidence.path,evidenceBytes);
  for(const [path,bytes]of f.artifacts)save(path,bytes);
  assert.equal(loadMonetaryRowIdentityAudit({repoRoot}).validation.valid,true,'actual corrected bytes positive');
  save(f.path,'{}');assert.equal(loadMonetaryRowIdentityAudit({repoRoot}).validation.valid,false,'mutated corrected file cannot reuse review');
  rmSync(join(repoRoot,f.path));assert.equal(loadMonetaryRowIdentityAudit({repoRoot}).validation.valid,false,'missing corrected file stays pending');
 }finally{rmSync(repoRoot,{recursive:true,force:true});}
});
