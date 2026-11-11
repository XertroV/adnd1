import {readBeforeJoFile} from './helpers/ua-source-batch6-jo-fixture.mjs';
import {after,test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {auditUa26MarkerReceiptWithHCurrentSourceEpoch} from '../tools/ua26-note-marker-audit-h-v2.mjs';
import {assertHistoricalHPreimage} from '../research/mm-source-history-v1/closed-version29-reader-current-mm-v1.mjs';

const root=path.resolve(process.cwd());
const read=rel=>JSON.parse(readBeforeJoFile(path.join(root,rel),'utf8'));
const bytes=rel=>readBeforeJoFile(path.join(root,rel));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const markerHPreimageCommit='5c6a57386af372c7c0d89e342003a7edf68ca0dd';
const markerTransitionRegistryPath='research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json';
const markerReceiptPath='research/source-audit-batch5-ua26-marker-correction.json';
const markerJoAppendPath='research/source-audit-batch6-jo-ua26-alias-append.json';
const markerCurrentAppendPath='research/source-audit-batch5-ua26-current-row-append.json';
const add=(set,rel)=>{if(typeof rel==='string'&&rel.length&&!path.isAbsolute(rel))set.add(rel);};
const rootJson=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const markerHPreimageRoot=(()=>{
  const proof=assertHistoricalHPreimage();
  assert.equal(proof.historicalHPreimageCommit,markerHPreimageCommit,'strict MM guard verifies the exact pinned H preimage');
  assert.equal(proof.historicalHPreimageTree,'391026a96811e7bcf0dfcb61c3753ff708308fe1');
  const receipt=rootJson(markerReceiptPath);
  const joAppend=rootJson(markerJoAppendPath);
  const currentAppend=rootJson(markerCurrentAppendPath);
  const nativeHFixture=rootJson('tests/fixtures/hirelings-source-current-cohort-v1.json');
  const historicalHInputHashes={...nativeHFixture.sourceRawInputs,'research/mechanics-audit-progress.json':'5627488c038354a15e4cc3ab1871dab02eb1f3eec9fa84a5ff3666cf253bcc43'};
  const required=new Set([
    markerReceiptPath,markerJoAppendPath,markerCurrentAppendPath,'dist/data.json','dist/books.js',
    'research/price-source-inventory.json','research/source-audit-input-dmg175-source-987a25d3ba2d.json',
    'research/source-audit-pass8-dmg175-source-body-handoff-transition-v1.json',
    'research/ua28-field-target-review-v1/independent-review-evidence-v1.json',
    'research/source-audit-pass8-ua28-caption-metadata-independent-review-v1.json',
    'research/source-audit-pass8-ua28-v7-row-caption-independent-review-v1.json',
    'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/validation/ua26-marker-full-catalog-diff-h-v1.json',
    'tools/ua26-note-marker-audit.mjs',markerTransitionRegistryPath
  ]);
  for(const ref of Object.values(receipt.frozenInputs||{}))add(required,ref?.path);
  for(const rel of Object.keys(receipt.currentCatalogHashes||{}))add(required,rel);
  for(const ref of [joAppend.sourcePeer,joAppend.frameDerivation,joAppend.catalog,
    joAppend.caltropCatalogExtension?.before,joAppend.caltropCatalogExtension?.after])add(required,ref?.path);
  add(required,currentAppend.row?.catalog?.path);
  add(required,'tests/helpers/ua-source-batch6-jo-fixture.mjs');
  add(required,'tests/fixtures/hirelings-source-current-cohort-v1.json');
  add(required,'tests/helpers/hirelings-source-current-cohort.mjs');
  add(required,'tests/helpers/hirelings-source-current-cohort-kernel-v1.mjs');
  add(required,'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json');
  add(required,'research/mechanics-audit-progress.json');
  add(required,'tools/ua26-note-marker-audit-h-v2.mjs');
  for(const rel of Object.keys(nativeHFixture.sourceRawInputs||{}))add(required,rel);
  const copiedPaths=new Set([
    'dist/scans/verified/equipment-ua-harpoon.json','dist/scans/verified/equipment-phb-hammer.json',
    'dist/scans/verified/equipment-phb-javelin.json','dist/scans/verified/equipment-ua-aklys-hurled.json',
    'tests/fixtures/hirelings-source-current-cohort-v1.json','tests/helpers/hirelings-source-current-cohort.mjs',
    'tests/helpers/hirelings-source-current-cohort-kernel-v1.mjs','tools/ua26-note-marker-audit-h-v2.mjs'
  ]);
  const result=fs.mkdtempSync(path.join(os.tmpdir(),'ua26-marker-h-preimage-'));
  try{
    for(const rel of required){
      const source=path.join(root,rel),destination=path.join(result,rel);
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      if(Object.hasOwn(historicalHInputHashes,rel)){
        const bytes=execFileSync('git',['show',`${markerHPreimageCommit}:${rel}`],{cwd:root,maxBuffer:64*1024*1024});
        assert.equal(sha(bytes),historicalHInputHashes[rel],`${rel}: exact H M1 Git blob`);
        fs.writeFileSync(destination,bytes);
      }else if(copiedPaths.has(rel))fs.copyFileSync(source,destination);
      else fs.symlinkSync(source,destination);
    }
    fs.symlinkSync(path.join(root,'.git'),path.join(result,'.git'),'file');
    return result;
  }catch(error){fs.rmSync(result,{recursive:true,force:true});throw error;}
})();
after(()=>fs.rmSync(markerHPreimageRoot,{recursive:true,force:true}));
const gitBytes=(commit,rel)=>execFileSync('git',['show',`${commit}:${rel}`]);
const before=read('tests/fixtures/ua26-context-before-679.json');
const ua75BeforePath='research/source-audit-batch5-ua75-secondary-occurrence-before.json';
const ua75ReviewPath='research/source-audit-batch5-ua75-secondary-occurrence-independent-review.json';
const ua75IntegrationPath='research/source-audit-batch5-ua75-secondary-occurrence-integration.json';
const ua75OwnerBeforePath='research/source-audit-batch5-ua75-review-owner-before.json';
const ua75Before=read(ua75BeforePath);
const ua75Review=read(ua75ReviewPath);
const ua75Integration=read(ua75IntegrationPath);
const ua75OwnerBefore=read(ua75OwnerBeforePath);
const markerJoAppend=read('research/source-audit-batch6-jo-ua26-alias-append.json');
const ua75ReceiptHashes={
  [ua75BeforePath]:'5d2f3bfd2d719cf8ae8d90308140d2a690d40fdde7b825ce8984dc831ec1992c',
  [ua75ReviewPath]:'5810e1a6c5ee2ce01f41fbe5d8d4248fd9867917a5c713687d13decfadff4a5b',
  [ua75IntegrationPath]:'22fbaff161df3cfb0d30ac7b5e490a2468dcd9bc092fcfd2b11e693c928bac01',
  [ua75OwnerBeforePath]:'0687ecc4545c43c8fbac5ae61d6780c7d5e3d17e5b8ee156a7c464df0f5e0f81',
};
function verifyUa75Receipts(){
  for(const [rel,expected] of Object.entries(ua75ReceiptHashes))assert.equal(sha(bytes(rel)),expected,`${rel}: immutable UA75 receipt identity`);
  assert.equal(ua75Integration.before.sha256,ua75ReceiptHashes[ua75BeforePath]);
  assert.equal(ua75Integration.independentReview.sha256,ua75ReceiptHashes[ua75ReviewPath]);
  assert.equal(ua75Integration.metadataOwnerCorrectionBefore.sha256,ua75ReceiptHashes[ua75OwnerBeforePath]);
  assert.equal(ua75Before.tableContract.rows.length,17);
  assert.equal(ua75Review.status,'approved');
  assert.equal(ua75Review.independent,true);
  assert.equal(ua75Review.regions.length,16);
  assert.equal(ua75Review.assessments.crop.status,'confirmed');
  assert.equal(ua75Review.assessments.context.status,'confirmed');
  assert.equal(ua75Review.assessments.highlight.status,'confirmed');
  assert.equal(ua75Review.assessments.sourceValue.status,'source-occurrence-checked; canonical price source and value review unchanged');
  assert.equal(ua75Integration.addedPriceOccurrenceReferences,16);
  assert.equal(ua75Integration.canonicalPricesChanged,0);
  assert.equal(ua75OwnerBefore.malformedOwnerRecords,16);
  assert.equal(ua75OwnerBefore.fullVisualReport.orphanedReviews,16);
}
function verifyCatalogIsOnlyExtendedByUa75(catalogAppend){
  const catalog=read(catalogAppend.path);
  assert.equal(sha(bytes(catalogAppend.path)),catalogAppend.afterSha256,`${catalogAppend.path}: current final catalog hash matches the exact UA75 append receipt`);
  const matches=catalog.regions.filter(region=>region.id===catalogAppend.regionId);
  assert.equal(matches.length,1,`${catalogAppend.regionId}: exactly one reviewed UA75 region is present`);
  assert.equal(catalog.regions.at(-1)?.id,catalogAppend.regionId,`${catalogAppend.regionId}: receipt-backed append remains the final region`);
  const before=structuredClone(catalog);
  before.regions=before.regions.filter(region=>region.id!==catalogAppend.regionId);
  const reconstructed=Buffer.from(JSON.stringify(before,null,2)+'\n');
  assert.equal(sha(reconstructed),catalogAppend.beforeSha256,`${catalogAppend.path}: removing only its UA75 row region reconstructs the sealed pre-append catalog bytes`);
  return catalogAppend.beforeSha256;
}

test('679 regression fixture pins the actual old row crops and missing facing-page links',()=>{
  assert.equal(before.baselineCommit,'679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.deepEqual(before.baselineCensus,{physicalSourceRows:79,weightDamageRows:68,armorClassLogicalRows:11,catalogRegionOccurrences:81,uniqueCatalogRegionIds:42,uniqueCatalogImages:26,weightDamageRowStripAssets:16,assetsWithNeighborOrSentinelFocus:4,legacyContinuationGroups:14,legacyUa26Groups:0});
  assert.equal(before.oldWeightDamageRowStrips.length,16);
  for(const snapshot of before.oldWeightDamageRowStrips){
    const catalog=JSON.parse(gitBytes(before.baselineCommit,snapshot.catalogPath).toString('utf8'));
    const region=catalog.regions.find(candidate=>candidate.id===snapshot.regionId);
    assert.ok(region,`${snapshot.catalogPath}#${snapshot.regionId} existed at 679`);
    assert.equal(region.image,snapshot.image);
    assert.equal(sha(gitBytes(before.baselineCommit,`dist/scans/verified/${snapshot.image}`)),snapshot.imageSha256);
    assert.deepEqual(region.focusRects,snapshot.focusRects);
    assert.deepEqual(region.normalizedPageRect,snapshot.normalizedPageRect);
    assert.equal(region.role??null,snapshot.role);
  }
  assert.equal(before.confirmedFocusRegressionExamples.length,4);
  assert.ok(before.confirmedFocusRegressionExamples.some(x=>x.defect==='focus-spans-neighboring-rows'));
  assert.ok(before.confirmedFocusRegressionExamples.some(x=>x.defect==='whole-image-sentinel-in-row-role'));
  for(const example of before.confirmedFocusRegressionExamples){
    const catalog=JSON.parse(gitBytes(before.baselineCommit,example.catalogPath).toString('utf8'));
    const region=catalog.regions.find(candidate=>candidate.id===example.regionId);
    assert.deepEqual(region.focusRects,example.focusRects);
    assert.equal(sha(gitBytes(before.baselineCommit,`dist/scans/verified/${example.image}`)),example.imageSha256);
  }
  const oldManifest=JSON.parse(gitBytes(before.baselineCommit,'research/citation-continuations.json').toString('utf8'));
  assert.equal(oldManifest.groups.length,14);
  assert.equal(oldManifest.groups.filter(group=>group.source?.book==='UA'&&group.source?.printedPage===26).length,0);
  assert.equal(before.missingFacingPageContinuation.matchingContinuationGroups,0);
  assert.equal(before.missingFacingPageContinuation.noteCropDidNotExistAtBaseline,true);
});

test('current UA26 catalog rows, p.27 notes and group proposals preserve reviewed scopes',()=>{
  const app=read('research/source-audit-batch5-ua26-catalog-application.json');
  const groupFile=read('research/source-audit-batch5-ua26-continuation-group-proposals.json');
  const proposal=read('research/source-audit-batch5-ua26-context-proposal.json');
  const markerCorrection=read('research/source-audit-batch5-ua26-marker-correction.json');
  assert.equal(app.status,'applied-awaiting-independent-review-of-implemented-hashes-and-links');
  assert.equal(app.proposal.sha256,sha(bytes(app.proposal.path)));
  assert.equal(app.independentReview.sha256,'35cf4ac55ac664c1187aeb3c1131870cf6e254b5a20135ed7e9646ec4a822c6b');
  assert.equal(sha(bytes(groupFile.proposal.path)),groupFile.proposal.sha256);
  assert.equal(app.continuationGroupProposals.sha256,sha(bytes(app.continuationGroupProposals.path)));
  assert.equal(app.counts.sourcePhysicalRows,79);
  assert.equal(app.counts.weightDamageRows,68);
  assert.equal(app.counts.armorClassLogicalRows,11);
  assert.equal(app.counts.confirmedWeightDamageOwners,66);
  assert.equal(app.counts.confirmedArmorClassOwnerEdges,24);
  assert.equal(app.counts.facingPageNoteAliases,66);
  assert.equal(app.counts.acGenericFieldAssignments,0);
  assert.equal(app.counts.fieldValuesPromoted,0);
  assert.equal(groupFile.status,'proposed-not-added-to-live-manifest');
  assert.equal(groupFile.groups.length,90);
  assert.equal(app.rowBindings.length,90);

  verifyUa75Receipts();
  const currentEpoch=auditUa26MarkerReceiptWithHCurrentSourceEpoch(markerHPreimageRoot);
  assert.equal(currentEpoch.ok,true);
  assert.deepEqual(currentEpoch.catalogReviewScope,{fieldTargetOwners:3,appendedUa28Regions:6,captionOnlySummaryEdits:6,sourceValueGrade:'NOT PROMOTED',contextualAdequacy:'NOT ASSESSED'});
  const qualifiedCatalogs=new Map(currentEpoch.currentEpoch.catalogTransitions.map(row=>[row.path,row]));
  assert.equal(qualifiedCatalogs.size,3,'only the three exact native-H UA28 append/caption transitions qualify');
  const checkpointBytes=catalogPath=>{
    const actual=bytes(catalogPath),qualified=qualifiedCatalogs.get(catalogPath);
    if(!qualified){
      const extension=markerJoAppend.caltropCatalogExtension;
      if(catalogPath===extension?.after?.path){
        assert.equal(sha(actual),extension.before.uncompressedSha256,`${catalogPath}: exact historical pre-Jo projection supplied by readBeforeJoFile`);
        const installedCurrent=fs.readFileSync(path.join(root,catalogPath));
        assert.equal(sha(installedCurrent),extension.after.sha256,`${catalogPath}: exact registered current Jo append bytes`);
        const before=gunzipSync(bytes(extension.before.path));
        assert.equal(sha(before),extension.before.uncompressedSha256,`${catalogPath}: exact frozen pre-Jo checkpoint bytes`);
        return before;
      }
      return actual;
    }
    assert.equal(sha(actual),qualified.currentSha256,`${catalogPath}: complete current catalog must match the qualified source epoch`);
    const checkpoint=gitBytes('386b08a4678ee033d6daabc0ffa2cc17265a7c1f',catalogPath);
    assert.equal(sha(checkpoint),qualified.previousReceiptSha256,`${catalogPath}: the whole immutable V28 catalog retains the old UA26 checkpoint`);
    return checkpoint;
  };
  const correctedCatalogs=new Map(markerCorrection.affectedCatalogs.map(change=>[change.catalogPath,change]));
  const ua26CatalogChanges=new Map(app.catalogChanges.map(change=>[change.catalogPath,change]));
  const ua75CatalogAppends=new Map(ua75Integration.catalogAppends.map(change=>[change.path,change]));
  assert.equal(ua75CatalogAppends.size,16,'only the 16 approved UA75 price rows append new catalog regions');
  for(const change of app.catalogChanges){
    assert.match(change.catalogPath,/^dist\/scans\/verified\/equipment-[^/]+\.json$/);
    const correction=correctedCatalogs.get(change.catalogPath);
    const checkpointHash=correction?.after.catalogSha256??change.afterSha256;
    if(correction)assert.equal(correction.before.catalogSha256,change.afterSha256,`${change.catalogPath} correction begins from the exact UA26 application hash`);
    const ua75Append=ua75CatalogAppends.get(change.catalogPath);
    if(ua75Append){
      const beforeUa75Hash=verifyCatalogIsOnlyExtendedByUa75(ua75Append);
      assert.equal(beforeUa75Hash,checkpointHash,`${change.catalogPath}: removing the exact UA75 row restores the UA26/marker-correction catalog checkpoint`);
    }else assert.equal(sha(checkpointBytes(change.catalogPath)),checkpointHash,`${change.catalogPath}: only the exact qualified UA28 append/caption transition may follow the frozen UA26 checkpoint`);
  }
  for(const append of ua75Integration.catalogAppends){
    if(ua26CatalogChanges.has(append.path))continue;
    const beforeUa75Hash=verifyCatalogIsOnlyExtendedByUa75(append);
    const frozenAt679=gitBytes(before.baselineCommit,append.path);
    assert.equal(beforeUa75Hash,sha(frozenAt679),`${append.path}: unchanged UA26 catalog reverts to its exact Git 679 bytes`);
  }
  const groupsById=new Map(groupFile.groups.map(group=>[group.id,group]));
  const allNoteAliases=new Set();
  const noteSource=app.source.facingPageNoteCrop;
  const rowImage=app.source.weightDamageTable;
  const acImage=app.source.armorClassTable;
  assert.equal(sha(bytes(rowImage.path)),rowImage.sha256);
  assert.equal(sha(bytes(acImage.path)),acImage.sha256);
  assert.equal(sha(bytes(noteSource.path)),noteSource.sha256);

  for(const binding of app.rowBindings){
    const catalog=read(binding.rowRegion.catalogPath);
    assert.equal(catalog.collection,'equipment');
    assert.equal(catalog.itemId,binding.itemId);
    assert.equal(catalog.sources?.UA?.sha256,app.source.sourcePdfSha256);
    const region=catalog.regions.find(candidate=>candidate.id===binding.rowRegion.regionId);
    assert.ok(region,`${binding.itemId} row region exists`);
    assert.equal(region.sha256,binding.table==='weightDamage'?rowImage.sha256:acImage.sha256);
    assert.equal(region.image,binding.table==='weightDamage'?path.basename(rowImage.path):path.basename(acImage.path));
    if(binding.rowRegion.preservedAklysProof){
      assert.deepEqual(region,app.aklysAdjudication.existingRowRegionBeforeAndAfter,'Aklys source anchor, image and focus stay unchanged');
    }else{
      assert.equal(region.sourceRowId,binding.sourceRowId);
      assert.equal(region.sourceTableId,binding.rowRegion.tableId);
      assert.equal(region.role,'row',`${binding.sourceRowId} row region`);
      assert.ok(region.focusRects.length>0);
      assert.ok(region.focusRects.every(rect=>rect.length===4&&rect.every(Number.isFinite)));
      assert.deepEqual(region.focusRects,[binding.rowRegion.normalizedFocus]);
      assert.deepEqual(region.normalizedPageRect,binding.table==='weightDamage'?proposal.imageSources.weightDamageTable.sourceCropNormalizedPageRect:proposal.imageSources.armorClassTable.sourceCropNormalizedPageRect);
      assert.equal(region.verificationScope,'source-excerpt');
      assert.match(region.summary,/no .*field-value grade|no equipment AC field\/value grade|no generic base AC field is assigned/i);
    }

    const group=groupsById.get(binding.groupId);
    assert.ok(group,`${binding.groupId} group proposal exists`);
    assert.equal(group.itemId,binding.itemId);
    assert.equal(group.sourceRowId,binding.sourceRowId);
    if(binding.table==='weightDamage'){
      const notes=catalog.regions.find(candidate=>candidate.id===binding.noteContextRegion.regionId);
      assert.ok(notes,`${binding.itemId} facing-note alias exists`);
      assert.equal(notes.role,'context');
      assert.equal(notes.book,'UA');
      assert.equal(notes.printedPage,27);
      assert.equal(notes.pdfPage,28);
      assert.equal(notes.sha256,noteSource.sha256);
      assert.equal(notes.sourceRowId,binding.sourceRowId);
      assert.equal(notes.contextForRegionId,binding.rowRegion.regionId);
      const correction=markerCorrection.affectedCatalogs.find(change=>change.sourceRowId===binding.sourceRowId);
      if(correction){
        assert.deepEqual(notes.focusRects,correction.after.focusRects,`${binding.sourceRowId} corrected note foci`);
        assert.deepEqual(notes.noteAssociation,correction.after.noteAssociation,`${binding.sourceRowId} corrected note IDs`);
      }else{
        assert.deepEqual(notes.focusRects,binding.noteContextRegion.focusRects);
        assert.deepEqual(notes.focusRects,binding.noteContextRegion.focus.rects);
      }
      assert.equal(allNoteAliases.has(notes.id),false);
      allNoteAliases.add(notes.id);
      assert.deepEqual(group.segments.map(segment=>[segment.order,segment.role,segment.book,segment.printedPage,segment.pdfPage,segment.regionId]),[
        [1,'opening','UA',26,27,binding.rowRegion.regionId],
        [2,'continuation','UA',27,28,binding.noteContextRegion.regionId],
      ]);
      assert.deepEqual(group.requiredRegionIds,[binding.rowRegion.regionId,binding.noteContextRegion.regionId]);
      assert.equal(group.continuationLink.openingRegionId,binding.rowRegion.regionId);
      assert.equal(group.continuationLink.continuationRegionId,binding.noteContextRegion.regionId);
      assert.equal(group.continuationLink.sourceRowId,binding.sourceRowId);
      assert.equal(group.continuationLink.generalNoteId,'general-note');
      if(correction){
        assert.equal(notes.noteAssociation.marker,correction.sourceMarkerRaw);
        assert.deepEqual(notes.noteAssociation.specificNoteIds,correction.specificNoteIds);
        assert.equal(notes.noteAssociation.generalNoteId,'general-note');
      } else if(binding.rowMarkerAssignmentStatus==='marker-glyph-unresolved'){
        assert.equal(group.continuationLink.specificNoteAssigned,false);
        assert.equal(notes.noteAssociation.specificNoteId,null);
        assert.equal(notes.focusRects.length,1,'unresolved row marker selects only the General Note');
      } else if(binding.rowMarker!==null){
        assert.equal(group.continuationLink.specificNoteAssigned,true);
        assert.equal(notes.focusRects.length,2,'explicit row marker selects its note and General Note');
      } else {
        assert.equal(group.continuationLink.specificNoteAssigned,false);
        assert.equal(notes.focusRects.length,1,'unmarked row selects only the General Note');
      }
    } else {
      assert.equal(binding.configurationOnly,true);
      assert.equal(binding.fieldAssignment,'none');
      assert.equal(group.explicitlyNoGenericBaseAcAssignment,true);
      assert.deepEqual(group.segments.map(segment=>[segment.order,segment.role,segment.printedPage,segment.regionId]),[[1,'opening',26,binding.rowRegion.regionId]]);
    }
  }
  assert.equal(allNoteAliases.size,66);
  const lanceAliases=app.rowBindings.filter(binding=>binding.itemId==='phb-lance').map(binding=>binding.noteContextRegion.regionId);
  assert.equal(lanceAliases.length,3);
  assert.equal(new Set(lanceAliases).size,3,'light/medium/heavy lance aliases remain deep-link distinct');
  assert.deepEqual(app.exclusionsAndUncertainty.unresolvedWeightDamageMarkers.map(row=>row.sourceRowId),[
    'ua26-weight-damage-21-glaive','ua26-weight-damage-23-guisarme','ua26-weight-damage-24-guisarme-voulge',
  ]);
  assert.deepEqual(app.exclusionsAndUncertainty.unownedWeaponRows.map(row=>row.sourceRowId),[
    'ua26-weight-damage-31-jo-stick','ua26-weight-damage-45-quarrel-or-bolt-hand',
  ]);
});

test('Aklys base-property proof is preserved through the independently reviewed source association',()=>{
  const app=read('research/source-audit-batch5-ua26-catalog-application.json');
  const proof=app.aklysAdjudication;
  assert.equal(proof.decision,'preserve-existing-three-p26-base-property-proof-and-grades');
  assert.equal(proof.existingRowRegionId,'ua-26-92697cf6b5d2d5ec');
  const catalog=read('dist/scans/verified/equipment-ua-aklys-hurled.json');
  const region=catalog.regions.find(candidate=>candidate.id===proof.existingRowRegionId);
  assert.deepEqual(region,proof.existingRowRegionBeforeAndAfter);
  const equipment=read('equipment.json').equipment.find(item=>item.id==='ua-aklys-hurled');
  assert.equal(proof.existingThreeFieldProofsPreserved.length,3);
  for(const field of proof.existingThreeFieldProofsPreserved){
    assert.equal(equipment.fields[field.field],field.value);
    assert.deepEqual(equipment.fieldSources[field.field],field.fieldSource);
    assert.deepEqual(field.manualBindingRegionIds,[[proof.existingRowRegionId]]);
  }
  assert.equal(region.sha256,proof.imageSha256);
  assert.equal(sha(Buffer.from(JSON.stringify(region.focusRects))),proof.focusSha256);
});
