import {readBeforeJoFile as readFileSync} from './helpers/batch6-jo-fixture.mjs';
import {frozenDmgBeforeManifest,dmgContextBefore} from './helpers/dmg-context-frozen-manifest.mjs';
import {withoutGeneratedCitationTransport,withoutBatch5OfferEquipment,withoutPriceCompletionEquipment, withoutSourceFirstEquipment} from './equipment-source-first-fixture.mjs';
import {ambiguousItemOverrideIds, collectionReferenceOverrides} from '../tools/citation-override-identity.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';

const root = new URL('../', import.meta.url);
const load = name => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const authoredGear = load('equipment.json').equipment;
const authoredMatrices = load('attack-matrices.json').matrices;
const assembled = load('dist/data.json');
const citationOverrides = load('citation-overrides.json');
const cropCatalogs = readdirSync(new URL('dist/scans/dagger/', root)).filter(name=>name.endsWith('.json')).map(name=>load('dist/scans/dagger/'+name));
const cropRegions=cropCatalogs.flatMap(catalog=>catalog.regions);
const require = createRequire(import.meta.url);
const combat = require('../dist/combat.js');
const independentMatrix = load('tests/fixtures/dmg74-matrix-independent.json');
const reviewedOffers = load('research/source-audit-batch5-price-independent-review.json').records;
const locationReferenceIntegrationPath='research/source-audit-batch5-table-reference-integration.json';
const tableCatalogPatchPath='research/source-audit-batch5-phb-dmg-table-catalog-patch.json';
const currentTableContractsPath='research/source-table-citation-contracts.json';
const dmg225IntegrationPath='research/source-audit-batch5-dmg225-contract-integration.json';
const tableIndependentReviewPath='research/source-audit-batch5-table-independent-review-v2.json';
const ua27ReferenceIntegrationPath='research/source-audit-batch5-ua27-reference-integration.json';
const ua27IndependentReviewPath='research/source-audit-batch5-ua27-independent-review.json';
const ua28ThreeRowReviewPath='research/source-audit-batch5-ua28-three-row-review.json';
const ua28SelectorIndependentReviewPath='research/source-audit-batch5-ua28-selector-independent-review.json';
const ua26CentralIntegrationPath='research/source-audit-batch5-ua26-central-integration.json';
const ua26CentralProposalPath='research/source-audit-batch5-ua26-central-proposal.json';
const ua26IndependentReviewPath='research/source-audit-batch5-ua26-independent-review.json';
const ua26MarkerReviewPath='research/source-audit-batch5-ua26-marker-independent-review.json';
const ua26ReviewIntegrationPath='research/source-audit-batch5-ua26-review-integration.json';
const ua26HandQuarrelReviewPath='research/source-audit-batch5-ua26-hand-quarrel-independent-review.json';
const ua26HandQuarrelAppendPath='research/source-audit-batch5-ua26-current-row-append.json';
const ua26HandQuarrelGroupAppendPath='research/source-audit-batch5-ua26-current-group-append.json';
const ua75SecondaryBeforePath='research/source-audit-batch5-ua75-secondary-occurrence-before.json';
const ua75SecondaryReviewPath='research/source-audit-batch5-ua75-secondary-occurrence-independent-review.json';
const ua75SecondaryIntegrationPath='research/source-audit-batch5-ua75-secondary-occurrence-integration.json';
const ua75OwnerCorrectionBeforePath='research/source-audit-batch5-ua75-review-owner-before.json';
const locationReferenceIntegration=load(locationReferenceIntegrationPath);
const tableCatalogPatch=load(tableCatalogPatchPath);
const currentTableContracts=load(currentTableContractsPath);
const dmg225Integration=load(dmg225IntegrationPath);
const tableIndependentReview=load(tableIndependentReviewPath);
const locationOnlyReferenceStatus='Source row/table visually reviewed; citation region proposal; semantic field review remains separate.';
const ua27LocationOnlyReferenceStatus='Source-row context independently located; printed variants and existing value grades remain separate.';
const ua26LocationOnlyReferenceStatus='Source identity and row/note context independently reviewed; existing field-value grades and purchase-price quantities remain separate.';
const ua27ReferenceIntegration=load(ua27ReferenceIntegrationPath);
const ua27IndependentReview=load(ua27IndependentReviewPath);
const ua28ThreeRowReview=load(ua28ThreeRowReviewPath);
const ua26CentralIntegration=load(ua26CentralIntegrationPath);
const ua26CentralProposal=load(ua26CentralProposalPath);
const ua26IndependentReview=load(ua26IndependentReviewPath);
const ua26MarkerReview=load(ua26MarkerReviewPath);
const ua26ReviewIntegration=load(ua26ReviewIntegrationPath);
const ua26HandQuarrelReview=load(ua26HandQuarrelReviewPath);
const ua26HandQuarrelAppend=load(ua26HandQuarrelAppendPath);
const ua26HandQuarrelGroupAppend=load(ua26HandQuarrelGroupAppendPath);
const ua75SecondaryBefore=load(ua75SecondaryBeforePath);
const ua75SecondaryReview=load(ua75SecondaryReviewPath);
const ua75SecondaryIntegration=load(ua75SecondaryIntegrationPath);
const ua75OwnerCorrectionBefore=load(ua75OwnerCorrectionBeforePath);
const finalContinuationIntegrationPath='research/source-audit-batch5-continuation-final-integration.json';
const finalContinuationIntegration=load(finalContinuationIntegrationPath);
const expectedEvidenceFileHashes={
  [locationReferenceIntegrationPath]:'08981485255dc4bac157283a85e01607d382bbed2313697ca5e73c365b8e866c',
  [tableCatalogPatchPath]:'4d9a0b6859c1841d9d3a4b707ac1c3219d82667af3265c29534a17ae14669e09',
  [dmg225IntegrationPath]:'10e310bbf6c492e6c90d9fedb0f7709138929b98e5a130b7c130dbf78f74f38d',
  [tableIndependentReviewPath]:'527cb31ff57b6206175fa1f499253b1ca896833d5dc839dcb9e5b31deed8804c',
  [ua27ReferenceIntegrationPath]:'daf4d26e1576520d4735ba30b863d1e919d7a376478a70259f0a9ed01f7f9cc8',
  [ua27IndependentReviewPath]:'cd1b350bccb8938dc3561d0850a4e6fa84d530baa0d656a7df9aa812294542c2',
  [ua28ThreeRowReviewPath]:'061f814270e7325b7951d64d485ee83a18143e80f47811cb840760140ac4abad',
  [ua28SelectorIndependentReviewPath]:'c9c97d885158d0bec7aced77c44645430bc96825dcf6d2b0057830978558707f',
  [ua26CentralIntegrationPath]:'aac6f093b31b10a0b9329e1075dad7cdcc0b7c4b5192cc4368aba8712d34fe1d',
  [ua26CentralProposalPath]:'7468a13679ffdbdbf8ca46a92a52ac47972a659aec68a5880a1709995d66fd58',
  [ua26IndependentReviewPath]:'afc6aed5a73e81388c64a70dfaf281ead5f010b8619f3c9f77d797cfb2139c3b',
  [ua26MarkerReviewPath]:'be82b8bf97df1897ad0ac0420becdb67003e6ad45b313ab8691652c3186aeeff',
  [ua26ReviewIntegrationPath]:'9839c52f2b8c0647b5d2ddfbbdcb4d8689479547c9e97911277f850d73f09466',
  [ua26HandQuarrelReviewPath]:'89a4c19040b456488a4c018a0191cc0bfc77655c3befb9048b9cdc826324c83e',
  [ua26HandQuarrelAppendPath]:'622de82d1c7c44e0ef78612535d4bb4d5ce025ddf02fc8fffb0527cc8532c1ca',
  [ua26HandQuarrelGroupAppendPath]:'49ee5270c393d818dc9f8682f76fc40b7495e798b7365f43376e981788f4ebb3',
  [ua75SecondaryBeforePath]:'5d2f3bfd2d719cf8ae8d90308140d2a690d40fdde7b825ce8984dc831ec1992c',
  [ua75SecondaryReviewPath]:'5810e1a6c5ee2ce01f41fbe5d8d4248fd9867917a5c713687d13decfadff4a5b',
  [ua75SecondaryIntegrationPath]:'22fbaff161df3cfb0d30ac7b5e490a2468dcd9bc092fcfd2b11e693c928bac01',
  [ua75OwnerCorrectionBeforePath]:'0687ecc4545c43c8fbac5ae61d6780c7d5e3d17e5b8ee156a7c464df0f5e0f81',
};
function verifyEvidenceFileHashes(paths){
  for(const path of paths){
    const bytes=readFileSync(new URL(`../${path}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),expectedEvidenceFileHashes[path],`${path}: exact reviewed evidence identity`);
  }
}
function withoutCollectionOwnerMetadata(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const {collection,...resolved}=value;
  return resolved;
}
function verifyUa75ContractCheckpoint(){
  verifyEvidenceFileHashes([ua75SecondaryBeforePath,ua75SecondaryReviewPath,ua75SecondaryIntegrationPath,ua75OwnerCorrectionBeforePath]);
  assert.equal(ua75SecondaryIntegration.before.sha256,expectedEvidenceFileHashes[ua75SecondaryBeforePath]);
  assert.equal(ua75SecondaryIntegration.independentReview.sha256,expectedEvidenceFileHashes[ua75SecondaryReviewPath]);
  assert.equal(ua75SecondaryIntegration.metadataOwnerCorrectionBefore.sha256,expectedEvidenceFileHashes[ua75OwnerCorrectionBeforePath]);
  assert.equal(ua75SecondaryBefore.status,'sealed');
  assert.equal(ua75SecondaryReview.status,'approved');
  assert.equal(ua75SecondaryReview.independent,true);
  assert.equal(ua75SecondaryReview.regions.length,16);
  assert.equal(ua75SecondaryReview.assessments.crop.status,'confirmed');
  assert.equal(ua75SecondaryReview.assessments.context.status,'confirmed');
  assert.equal(ua75SecondaryReview.assessments.highlight.status,'confirmed');
  assert.equal(ua75SecondaryReview.assessments.sourceValue.status,'source-occurrence-checked; canonical price source and value review unchanged');
  assert.equal(ua75SecondaryIntegration.sourceRows,17);
  assert.equal(ua75SecondaryIntegration.addedPriceOccurrenceReferences,16);
  assert.equal(ua75SecondaryIntegration.availabilityOnlyExclusions,1);
  assert.equal(ua75SecondaryIntegration.canonicalPricesChanged,0);
  assert.equal(ua75SecondaryIntegration.pricePreservation.mutationsOnCanonicalPriceBindings,0);
  assert.deepEqual(ua75SecondaryIntegration.pricePreservation.allItemPriceObjectsUnchanged,ua75SecondaryReview.pricePreservation.allItemPriceObjectsUnchanged,
    'the independent review carries forward the exact before-receipt canonical-price snapshots');
  assert.deepEqual(ua75SecondaryIntegration.pricePreservation.onlyAppendedReferencePointers,
    ua75SecondaryIntegration.referenceAppends.map(entry=>entry.fieldPointer));

  const currentTable= currentTableContracts.tables.filter(table=>table.id===ua75SecondaryBefore.tableContract.id);
  assert.equal(currentTable.length,1,'the only post-UA26/27/28 table-contract addition is the reviewed UA75 table');
  assert.deepEqual(currentTable[0],ua75SecondaryBefore.tableContract,'UA75 table contract matches the sealed 17-row before/independent review contract exactly');
  const preUa75Contracts=structuredClone(currentTableContracts);
  preUa75Contracts.tables=preUa75Contracts.tables.filter(table=>table.id!==ua75SecondaryBefore.tableContract.id);
  const preUa75Bytes=Buffer.from(JSON.stringify(preUa75Contracts,null,2)+'\n');
  assert.equal(createHash('sha256').update(preUa75Bytes).digest('hex'),'d1679f342a08dad1388bb29f04b7d51350c00f5b5874d79a16ce4fe27b5b957e',
    'removing only the exact receipt-backed UA75 table reconstructs the frozen UA26/27/28 table-contract bytes');
}
const frozenBaselineEquipment=JSON.parse(execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:equipment.json'],{encoding:'utf8'})).equipment;
const frozenEquipmentById=new Map(frozenBaselineEquipment.map(item=>[item.id,item]));
const authoredEquipmentById=new Map(authoredGear.map(item=>[item.id,item]));

function verifySupplementalLocationOnlyReference(ref,context){
  const itemId=context.split(':')[0];
  verifyEvidenceFileHashes([locationReferenceIntegrationPath,tableCatalogPatchPath,dmg225IntegrationPath,tableIndependentReviewPath]);
  const integrated=locationReferenceIntegration.references.filter(entry=>entry.collection==='equipment'&&entry.itemId===itemId&&JSON.stringify(entry.reference)===JSON.stringify(withoutGeneratedCitationTransport(ref)));
  assert.equal(integrated.length,1,`${itemId}: supplemental reference has one exact location-integration receipt`);
  const receipt=integrated[0];
  assert.equal(receipt.fieldPointer.startsWith('/references/'),true,`${itemId}: source-only reference pointer`);
  assert.ok(receipt.tableRows.length&&receipt.tableIds.length,`${itemId}: explicit table-row binding`);
  assert.equal(ref.status,locationOnlyReferenceStatus,`${itemId}: citation stays source-location-only`);

  const baseline=frozenEquipmentById.get(itemId),authored=authoredEquipmentById.get(itemId);
  assert.ok(baseline&&authored,`${itemId}: frozen pre-reference item exists`);
  assert.deepEqual(authored.fields,baseline.fields,`${itemId}: source-location citation did not change field values`);
  assert.deepEqual(authored.fieldSources,baseline.fieldSources,`${itemId}: original field source/grade remains exactly at the frozen OCR checkpoint`);

  const allowedRegions=new Set(),requiredRows=[];
  for(const [index,rowId] of receipt.tableRows.entries()){
    const tableId=receipt.tableIds[index]??receipt.tableIds[0];
    const table=currentTableContracts.tables.find(candidate=>candidate.id===tableId);
    const row=table?.rows.find(candidate=>candidate.id===rowId);
    const target=row?.targets.find(candidate=>candidate.collection==='equipment'&&candidate.itemId===itemId);
    assert.ok(target&&target.applicability==='confirmed',`${itemId}: exact source-row target is confirmed`);
    for(const id of target.requiredRegionIds){allowedRegions.add(id);requiredRows.push({id,tableId,target});}
    for(const id of target.companionContextRegionIds||[])allowedRegions.add(id);
    const proposal=tableCatalogPatch.bindings.find(binding=>binding.tableId===tableId&&binding.rowId===rowId&&binding.collection==='equipment'&&binding.itemId===itemId);
    assert.ok(proposal,`${itemId}: source-row identity proposal is traceable`);
    assert.equal(proposal.applicability,'confirmed');
  }
  const regionIds=ref.verification?.regions||[];
  assert.ok(regionIds.length,`${itemId}: exact current row/context region IDs`);
  assert.ok(requiredRows.every(row=>regionIds.includes(row.id)),`${itemId}: every required source row is linked`);
  assert.ok(regionIds.every(id=>allowedRegions.has(id)),`${itemId}: citation selects only row and declared companion-context regions`);
  const catalogPath=citationOverrides.sourceExcerpts[`equipment:${itemId}`]?.catalog;
  assert.ok(catalogPath,`${itemId}: viewer-selected catalog exists`);
  const catalog=load(`dist/${catalogPath}`);
  for(const id of regionIds){
    const region=catalog.regions.find(candidate=>candidate.id===id);
    assert.ok(region,`${itemId}: selected region ${id} is current`);
    if(requiredRows.some(row=>row.id===id)){
      const row=requiredRows.find(candidate=>candidate.id===id);
      assert.equal(region.role,'row',`${itemId}/${id}: primary source evidence is a row`);
      assert.equal(region.sourceTableId,row.tableId,`${itemId}/${id}: current table identity`);
      assert.equal(region.sha256,row.target.requiredTableImageSha256,`${itemId}/${id}: current table image identity`);
    }else{
      assert.equal(region.role,'context',`${itemId}/${id}: companion region remains context only`);
      assert.equal(region.sha256,'b2576ee304734e9bbdae553a7d7577fac22df69a73e08102316e08a6ace6f565',`${itemId}/${id}: approved DMG p.225 note image`);
      const review=tableIndependentReview.records.find(entry=>entry.collection==='equipment'&&entry.itemId===itemId&&entry.regionId===id);
      assert.ok(review,`${itemId}/${id}: current independent note review exists`);
      const hashes=sourceVisualRegionHashes(region);
      assert.equal(review.catalogSha256,createHash('sha256').update(readFileSync(new URL(`../dist/${catalogPath}`,import.meta.url))).digest('hex'));
      assert.equal(review.imageSha256,region.sha256);
      assert.equal(review.focusSha256,hashes.focusSha256);
      assert.equal(review.contentSha256,hashes.contentSha256);
      assert.equal(review.decision,'approved-crop-context-relevance-only');
      assert.equal(review.fieldValueGrade,'not-assessed-or-promoted');
      assert.equal(review.assessments.crop.status,'confirmed');
      assert.equal(review.assessments.context.status,'confirmed');
      assert.equal(review.assessments.relevance.status,'confirmed');
      assert.equal(review.assessments.highlight.status,'unassessed');
      assert.equal(review.assessments.default.status,'unassessed');
    }
  }
  if(ref.book==='DMG'){
    assert.ok(receipt.tableRows.every(rowId=>dmg225Integration.changes.some(change=>change.rowId===rowId&&change.itemId===itemId)),`${itemId}: current DMG p.225 contract integration is recorded`);
  }
}

function verifyUa27LocationOnlyReference(ref,context){
  const itemId=context.split(':')[0];
  verifyEvidenceFileHashes([ua27ReferenceIntegrationPath,ua27IndependentReviewPath]);
  const integrated=ua27ReferenceIntegration.references.filter(entry=>entry.collection==='equipment'&&entry.itemId===itemId&&JSON.stringify(entry.reference)===JSON.stringify(withoutGeneratedCitationTransport(ref)));
  assert.equal(integrated.length,1,`${itemId}: exact UA27 source-location integration receipt`);
  const receipt=integrated[0];
  assert.equal(receipt.fieldPointer.startsWith('/references/'),true,`${itemId}: reference-only pointer`);
  assert.equal(ref.book,'UA',`${itemId}: exact UA source`);
  assert.deepEqual(ref.pages,[27],`${itemId}: exact UA printed page`);
  assert.equal(ref.status,ua27LocationOnlyReferenceStatus,`${itemId}: source location remains separate from field grades`);
  assert.deepEqual(ref.verification.regions,receipt.reference.verification.regions,`${itemId}: exact reviewed region selection`);
  assert.ok(receipt.sourceRows.length>0,`${itemId}: explicit source row identities`);
  assert.equal(receipt.sourceRows.length,receipt.variantContexts.length,`${itemId}: row/variant association denominator`);

  const baseline=frozenEquipmentById.get(itemId),authored=authoredEquipmentById.get(itemId);
  assert.ok(baseline&&authored,`${itemId}: frozen pre-reference item exists`);
  assert.deepEqual(authored.fields,baseline.fields,`${itemId}: UA27 source-location reference did not change field values`);
  assert.deepEqual(authored.fieldSources,baseline.fieldSources,`${itemId}: UA27 location review did not promote field grades`);

  const excerpt=citationOverrides.sourceExcerpts[`equipment:${itemId}`];
  assert.ok(excerpt?.catalog,`${itemId}: current source catalog exists`);
  const catalogPath=`dist/${excerpt.catalog}`;
  const catalog=load(catalogPath);
  for(const [index,regionId] of ref.verification.regions.entries()){
    const proof=ua27IndependentReview.records.find(record=>record.collection==='equipment'&&record.itemId===itemId&&record.regionId===regionId);
    assert.ok(proof,`${itemId}/${regionId}: exact independent row proof exists`);
    assert.equal(proof.catalog,`dist/${excerpt.catalog}`,`${itemId}/${regionId}: current owner catalog`);
    assert.equal(proof.sourceRowId,receipt.sourceRows[index],`${itemId}/${regionId}: source-row ID association`);
    assert.equal(proof.decision,'approved-current-source-excerpt-dimensions-only');
    assert.equal(proof.fieldValueGrade,'not-assessed-or-promoted');
    assert.equal(proof.regionSnapshot.role,'row');
    assert.equal(proof.regionSnapshot.sourceRowId,receipt.sourceRows[index]);
    assert.equal(proof.regionSnapshot.sourceTableId,'ua-p27-weapon-table');
    assert.equal(proof.assessments.sourceLocation.status,'confirmed');
    assert.equal(proof.assessments.crop.status,'confirmed');
    assert.equal(proof.assessments.context.status,'confirmed');
    assert.equal(proof.assessments.relevance.status,'confirmed');
    assert.equal(proof.assessments.highlight.status,'confirmed');
    assert.equal(proof.assessments.default.status,'unassessed');
    const region=catalog.regions.find(candidate=>candidate.id===regionId);
    assert.ok(region,`${itemId}/${regionId}: current row region exists`);
    assert.equal(region.role,'row');
    assert.equal(region.sourceRowId,receipt.sourceRows[index]);
    assert.equal(region.sourceTableId,'ua-p27-weapon-table');
    const hashes=sourceVisualRegionHashes(region);
    const historicalCatalogReceipt=ua27IndependentReview.catalogReceipts.find(entry=>entry.catalog===proof.catalog);
    assert.ok(historicalCatalogReceipt,`${itemId}/${regionId}: independent review has a pinned catalog receipt`);
    assert.equal(proof.catalogSha256,historicalCatalogReceipt.applicationAfterSha256,`${itemId}/${regionId}: independent review's captured catalog identity`);
    assert.deepEqual(region,proof.regionSnapshot,`${itemId}/${regionId}: current row region remains byte-for-byte equal to reviewed geometry and metadata`);
    assert.equal(proof.imageSha256,region.sha256,`${itemId}/${regionId}: current image hash`);
    assert.equal(proof.focusSha256,hashes.focusSha256,`${itemId}/${regionId}: current focus hash`);
    assert.equal(proof.contentSha256,hashes.contentSha256,`${itemId}/${regionId}: current content hash`);
    assert.equal(region.sha256,'ac5c72afd1d4dae7712c0d95b0c4004b009f27c366a24208b8a0d924102d1c9f',`${itemId}/${regionId}: independently reviewed complete UA27 table image`);
  }
}

function verifyUa28ThreeRowLocationOnlyReference(ref,context){
  const itemId=context.split(':')[0];
  verifyEvidenceFileHashes([ua28ThreeRowReviewPath,ua28SelectorIndependentReviewPath]);
  const expectedRows={
    'ua-harpoon':{rowId:'ua-p28-weapon-row-harpoon',regionId:'ua-harpoon-ua28-row',label:'Hurled Weapon and Missile Types table — Harpoon row',rowLabel:'Harpoon'},
    'phb-hammer':{rowId:'ua-p28-weapon-row-hammer',regionId:'phb-hammer-ua28-row',label:'Hurled Weapon and Missile Types table — Hammer row',rowLabel:'Hammer'},
    'phb-javelin':{rowId:'ua-p28-weapon-row-javelin',regionId:'phb-javelin-ua28-row',label:'Hurled Weapon and Missile Types table — Javelin row',rowLabel:'Javelin'},
  };
  const expected=expectedRows[itemId];
  assert.ok(expected,`${itemId}: only the three explicitly reviewed UA28 row references are covered`);
  assert.deepEqual(withoutGeneratedCitationTransport(ref),{
    book:'UA',pages:[28],label:expected.label,
    status:'Source table row independently located; no new value extraction implied',
  },`${itemId}: exact source-location-only citation`);

  const baseline=frozenEquipmentById.get(itemId),authored=authoredEquipmentById.get(itemId);
  assert.ok(baseline&&authored,`${itemId}: frozen pre-reference item exists`);
  assert.deepEqual(authored.fields,baseline.fields,`${itemId}: UA28 source-row reference did not change field values`);
  assert.deepEqual(authored.fieldSources,baseline.fieldSources,`${itemId}: UA28 source-row review did not promote field grades`);

  const sourceTable=currentTableContracts.tables.find(table=>table.id==='ua-p28-weapon-table');
  assert.ok(sourceTable,`${itemId}: current UA28 weapon-table contract exists`);
  assert.deepEqual([sourceTable.book,sourceTable.printedPage,sourceTable.pdfPage,sourceTable.sourceSha256,sourceTable.rowCount],['UA',28,29,'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4',24]);
  const row=sourceTable.rows.find(candidate=>candidate.id===expected.rowId);
  assert.ok(row,`${itemId}: exact UA28 row identity exists in current contract`);
  assert.equal(row.label,expected.rowLabel);
  const target=row.targets.find(candidate=>candidate.collection==='equipment'&&candidate.itemId===itemId);
  assert.ok(target,`${itemId}: exact equipment owner target exists`);
  assert.equal(target.applicability,'confirmed');
  assert.deepEqual(target.requiredRegionIds,[expected.regionId]);
  assert.equal(target.requiredTableImageSha256,'f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b');
  assert.equal(target.requiredEvidenceRole,'row');
  assert.equal(target.sourceRowIdentityEvidence,ua28SelectorIndependentReviewPath);

  const reviewed=ua28ThreeRowReview.reviews.filter(record=>record.itemId===itemId&&record.regionId===expected.regionId);
  assert.equal(reviewed.length,1,`${itemId}: unique independent crop-and-focus review`);
  const proof=reviewed[0];
  assert.equal(proof.reviewOutcome,'confirmed-context-row-location-and-highlight');
  assert.equal(proof.sourceSha256,sourceTable.sourceSha256);
  const catalogPath=citationOverrides.sourceExcerpts[`equipment:${itemId}`]?.catalog;
  assert.ok(catalogPath,`${itemId}: current viewer-selected source catalog exists`);
  const catalog=load(`dist/${catalogPath}`);
  const region=catalog.regions.find(candidate=>candidate.id===expected.regionId);
  assert.ok(region,`${itemId}/${expected.regionId}: current row region exists`);
  assert.deepEqual([region.book,region.printedPage,region.pdfPage],['UA',28,29]);
  assert.equal(region.title,`UA p. 28 · ${expected.rowLabel} missile-table row`);
  assert.equal(region.alt,`The complete UA p. 28 Hurled Weapon and Missile Types table with the ${expected.rowLabel} row highlighted.`);
  assert.equal(region.checkedFields.sourceLocation,`UA printed p. 28, Hurled Weapon and Missile Types table, row ${expected.rowLabel}.`);
  assert.equal(region.sha256,proof.imageSha256);
  assert.equal(region.sha256,target.requiredTableImageSha256);
  assert.deepEqual(region.normalizedPageRect,proof.crop,`${itemId}: reviewed full-table context crop is retained`);
  assert.deepEqual(region.focusRects,proof.focusRects,`${itemId}: reviewed precise row highlight is retained`);
  const hashes=sourceVisualRegionHashes(region);
  assert.equal(hashes.focusSha256,proof.focusSha256);
  assert.equal(hashes.contentSha256,proof.contentSha256);
  assert.equal(catalog.sources.UA.sha256,proof.sourceSha256);
  const imageBytes=readFileSync(new URL(`../dist/scans/verified/${region.image}`,import.meta.url));
  assert.equal(createHash('sha256').update(imageBytes).digest('hex'),proof.imageSha256,`${itemId}: actual supplied source crop pixels match independent review`);
}

function decodePointerPart(part){return part.replaceAll('~1','/').replaceAll('~0','~');}
function pointerValue(object,pointer){
  let value=object;
  for(const part of pointer.split('/').slice(1)){
    const key=decodePointerPart(part);
    assert.ok(value&&typeof value==='object'&&Object.hasOwn(value,key),`${pointer}: pointer segment ${key} exists`);
    value=value[key];
  }
  return value;
}
function ua26CurrentProofFor(itemId,regionId){
  const imports=ua26ReviewIntegration.imports.filter(entry=>entry.current.some(current=>current.itemId===itemId&&current.regionId===regionId));
  assert.equal(imports.length,1,`${itemId}/${regionId}: exactly one current proof lineage is registered`);
  const receipt=imports[0];
  const document=receipt.path===ua26IndependentReviewPath?ua26IndependentReview:receipt.path===ua26MarkerReviewPath?ua26MarkerReview:receipt.path===ua26HandQuarrelReviewPath?ua26HandQuarrelReview:null;
  assert.ok(document,`${itemId}/${regionId}: registered proof document exists`);
  const proof=document.records.find(candidate=>candidate.collection==='equipment'&&candidate.itemId===itemId&&candidate.regionId===regionId);
  assert.ok(proof,`${itemId}/${regionId}: proof document contains the registered exact region`);
  return {receipt,proof};
}
function ua26RowsFor(receipt){
  const itemId=receipt.itemId;
  const sourceRows=receipt.sourceRows||receipt.plan?.sourceRows||[];
  const sourceTableIds=receipt.sourceTableIds||receipt.plan?.sourceTableIds||[];
  return sourceRows.map(sourceRowId=>{
    const sourceTables=sourceTableIds.length?currentTableContracts.tables.filter(candidate=>sourceTableIds.includes(candidate.id)):currentTableContracts.tables;
    for(const table of sourceTables){
      const row=table?.rows.find(candidate=>candidate.id===sourceRowId);
      if(row)return {table,row,target:row.targets.find(candidate=>candidate.collection==='equipment'&&candidate.itemId===itemId)};
    }
    assert.fail(`${itemId}: source row ${sourceRowId} is present in its cited UA26 table`);
  });
}
function verifyUa26NormalizedReference(receipt,isReused=false){
  const itemId=receipt.itemId;
  const item=assembled.equipment.find(candidate=>candidate.id===itemId);
  assert.ok(item,`${itemId}: current data record exists`);
  const reference=pointerValue(item,receipt.fieldPointer);
  const expected=receipt.reference||receipt.plan.reference;
  assert.deepEqual(withoutGeneratedCitationTransport(reference),expected,`${itemId}${receipt.fieldPointer}: exact normalized source-purpose reference`);
  const binding=reference.evidenceBindings?.find(candidate=>candidate.fieldPointer===receipt.fieldPointer);
  assert.ok(binding,`${itemId}${receipt.fieldPointer}: exact generated citation binding exists`);
  const selectedRegionIds=isReused?receipt.applied.regionIds:expected.verification?.regions;
  assert.ok(Array.isArray(selectedRegionIds)&&selectedRegionIds.length,`${itemId}${receipt.fieldPointer}: exact selected region IDs are recorded`);
  assert.deepEqual(binding.regionIds,selectedRegionIds,`${itemId}${receipt.fieldPointer}: applied regions exactly match the receipt`);
  assert.equal(binding.catalog,citationOverrides.sourceExcerpts[`equipment:${itemId}`]?.catalog,`${itemId}${receipt.fieldPointer}: binding uses the current owner catalog`);
  assert.equal(binding.collection,'equipment');assert.equal(binding.itemId,itemId);

  const sourceRows=ua26RowsFor(receipt);
  const allowedIds=new Set();
  for(const {target} of sourceRows){
    assert.ok(target&&target.applicability==='confirmed',`${itemId}${receipt.fieldPointer}: confirmed source row target`);
    for(const id of target.requiredRegionIds||[])allowedIds.add(id);
    for(const id of target.companionNoteRegionIds||[])allowedIds.add(id);
  }
  const catalog=load(`dist/${binding.catalog}`);
  for(const regionId of selectedRegionIds){
    assert.ok(allowedIds.has(regionId),`${itemId}${receipt.fieldPointer}/${regionId}: source-purpose region is permitted by its row target`);
    const region=catalog.regions.find(candidate=>candidate.id===regionId);
    assert.ok(region,`${itemId}${receipt.fieldPointer}/${regionId}: current owner region exists`);
    assert.ok(region.sha256,`${itemId}${receipt.fieldPointer}/${regionId}: current image identity is present`);
    if(reference.pages.includes(26)){
      assert.ok(region.role==='row'||(itemId==='ua-aklys-hurled'&&region.role===undefined&&regionId==='ua-26-92697cf6b5d2d5ec'),`${itemId}${receipt.fieldPointer}/${regionId}: p.26 purpose selects its exact row`);
    }else{
      assert.equal(region.role,'context',`${itemId}${receipt.fieldPointer}/${regionId}: p.27 facing notes remain context, not a fact row`);
    }
    const {proof}=ua26CurrentProofFor(itemId,regionId);
    assert.ok(proof,`${itemId}${receipt.fieldPointer}/${regionId}: exact independent region proof exists`);
    assert.equal(proof.catalog,binding.catalog,`${itemId}${receipt.fieldPointer}/${regionId}: reviewed catalog matches current owner`);
    assert.equal(proof.imageSha256,region.sha256,`${itemId}${receipt.fieldPointer}/${regionId}: current image matches independent review`);
    const hashes=sourceVisualRegionHashes(region);
    assert.equal(proof.focusSha256,hashes.focusSha256,`${itemId}${receipt.fieldPointer}/${regionId}: current focus matches independent review`);
    assert.equal(proof.contentSha256,hashes.contentSha256,`${itemId}${receipt.fieldPointer}/${regionId}: current content matches independent review`);
    assert.equal(proof.assessments.crop.status,'confirmed');
    assert.equal(proof.assessments.context.status,'confirmed');
    assert.equal(proof.assessments.relevance.status,'confirmed');
    if(proof.kind==='source-row'){
      if(itemId==='ua-aklys-hurled'&&regionId==='ua-26-92697cf6b5d2d5ec')assert.equal(region.role,undefined,'the preserved Aklys row predates catalog role annotations');
      else assert.equal(region.role,'row');
    }
    if(proof.kind==='facing-note-context')assert.equal(region.role,'context');
    if(!isReused&&region.sourceRowId){
      assert.ok(sourceRows.some(({row})=>row.id===region.sourceRowId),`${itemId}${receipt.fieldPointer}/${regionId}: row identity matches its normalized purpose plan`);
    }
  }
}

function verifyUa26FieldBinding(receipt){
  const itemId=receipt.itemId;
  const current=authoredEquipmentById.get(itemId);
  const frozen=frozenEquipmentById.get(itemId);
  assert.ok(current&&frozen,`${itemId}: old 679 record remains in the current authored catalog`);
  assert.deepEqual(current.fields,frozen.fields,`${itemId}: UA26 row focus did not change any field value`);
  assert.deepEqual(current.fieldSources,frozen.fieldSources,`${itemId}: original source-value grades remain byte-for-byte the 679 baseline`);
  const fieldValue=pointerValue(current,receipt.fieldPointer);
  assert.equal(fieldValue,pointerValue(frozen,receipt.fieldPointer),`${itemId}${receipt.fieldPointer}: exact value unchanged`);
  const source=pointerValue(assembled.equipment.find(candidate=>candidate.id===itemId),receipt.sourceObjectPointer);
  assert.equal(source.status,pointerValue(frozen,receipt.sourceObjectPointer).status,`${itemId}${receipt.sourceObjectPointer}: authored grade unchanged`);
  const binding=source.evidenceBindings?.find(candidate=>candidate.fieldPointer===receipt.fieldPointer);
  assert.ok(binding,`${itemId}${receipt.fieldPointer}: exact field target binding exists`);
  assert.equal(binding.requiresRowEvidence,true);
  assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
  assert.equal(binding.status,'Exact source-row location and focus independently reviewed; authored field value and original source-value grade unchanged.');
  assert.deepEqual(binding.regionIds,receipt.applied.regionIds);
  const rowRecord=ua26RowsFor({...receipt,sourceRows:[receipt.sourceRowId]})[0];
  assert.ok(rowRecord.target&&rowRecord.target.applicability==='confirmed');
  assert.equal(rowRecord.target.requiredEvidenceRole,'row');
  const region=load(`dist/${receipt.applied.catalog}`).regions.find(candidate=>candidate.id===receipt.applied.regionIds[0]);
  assert.equal(region.role,'row');
  assert.equal(region.sourceRowId,receipt.sourceRowId);
  assert.equal(region.sourceTableId,rowRecord.table.evidence.sourceTableId);
  assert.equal(region.sha256,receipt.applied.evidence[0].imageSha256);
  const {proof}=ua26CurrentProofFor(itemId,region.id);
  assert.ok(proof,`${itemId}/${region.id}: independent current row proof exists`);
  assert.equal(proof.kind,'source-row');
  assert.equal(proof.sourceRowId,receipt.sourceRowId);
  assert.deepEqual(proof.assessments.crop.status,'confirmed');
  assert.deepEqual(proof.assessments.highlight.status,'confirmed');
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../dist/scans/verified/${region.image}`,import.meta.url))).digest('hex'),region.sha256);
}

function source(ref, context) {
  assert.ok(ref && typeof ref === 'object', `${context}: source is required`);
  assert.ok(['PHB', 'UA', 'DMG'].includes(ref.book), `${context}: source book`);
  assert.ok(Array.isArray(ref.pages) && ref.pages.length > 0, `${context}: printed pages`);
  for (const page of ref.pages) {
    assert.ok(Number.isInteger(page) && page > 0 && page <= ({PHB:128, UA:128, DMG:240}[ref.book]), `${context}: valid printed page`);
    if (ref.book === 'DMG') assert.ok(![175, 239, 240].includes(page), `${context}: missing or unverified DMG page`);
  }
  const offerReview=reviewedOffers.find(record=>record.itemId===context.split(':')[0]&&ref.status!==ua26LocationOnlyReferenceStatus);
  if(offerReview){
    assert.equal(ref.book,offerReview.book,`${context}: independently reviewed offer source`);
    assert.ok(ref.pages.includes(offerReview.printedPage),`${context}: reviewed printed page`);
    const catalog=load('dist/'+offerReview.catalog);
    assert.equal(catalog.itemId,offerReview.itemId);
    assert.ok(catalog.regions.some(region=>region.id===offerReview.regionId&&region.sha256===offerReview.imageSha256),`${context}: exact independently reviewed row excerpt`);
  }else if(ref.verification?.method==='supplied-scan-crop'){
    assert.ok(ref.verification.regions?.length,`${context}: crop evidence required`);
    for(const id of ref.verification.regions){
      const region=cropRegions.find(region=>region.id===id);
      assert.ok(region,`${context}: known region`);
      assert.equal(region.book,ref.book,`${context}: evidence retains book identity`);
      assert.ok(ref.pages.includes(region.printedPage),`${context}: evidence retains printed page`);
    }
    assert.match(ref.status || '', /checked/i, `${context}: selected values checked`);
  }else if(ref.scanVerification?.state==='selected-values-checked'){
    const catalog=cropCatalogs.find(catalog=>catalog.itemId===ref.id);
    assert.ok(catalog,`${context}: item-specific catalog required`);
    assert.equal(ref.scanVerification.regionCount,catalog.regions.length);
    assert.equal(ref.incomplete,true);
  }else if (['Selected numeric value visually checked','Selected value visually checked','Source passage visually checked; interpretation unresolved'].includes(ref.status)) {
    const id=context.split(':')[0];
    const catalog=load(`dist/${citationOverrides.sourceExcerpts[`equipment:${id}`].catalog}`);
    assert.ok(catalog.regions.some(region=>region.book===ref.book && ref.pages.includes(region.printedPage)), `${context}: cited source excerpt`);
  }else if (ref.status === 'Price visually checked; other mechanics not extracted') {
    assert.ok(citationOverrides.sourceExcerpts[`equipment:${ref.id}`], `${context}: reviewed source excerpt`);
  }else if(ref.status==='Source context independently reviewed; no Aklys-specific numbered footnote inferred'){
    assert.equal(context,'ua-aklys-hurled: related reference');
    assert.deepEqual([ref.book,ref.pages,ref.label],['UA',[27],'Facing-page General Data table and notes (context only)']);
  }else if(ref.status===locationOnlyReferenceStatus){
    verifySupplementalLocationOnlyReference(ref,context);
  }else if(ref.status===ua27LocationOnlyReferenceStatus){
    verifyUa27LocationOnlyReference(ref,context);
  }else if(ref.status==='Source table row independently located; no new value extraction implied'){
    verifyUa28ThreeRowLocationOnlyReference(ref,context);
  }else if(ref.status===ua26LocationOnlyReferenceStatus){
    const itemId=context.split(':')[0];
    const normalized=withoutGeneratedCitationTransport(ref);
    const candidates=[...ua26CentralIntegration.addedReferences,...ua26CentralIntegration.reusedReferences].filter(receipt=>
      receipt.itemId===itemId&&JSON.stringify(receipt.reference||receipt.plan.reference)===JSON.stringify(normalized)
    );
    assert.equal(candidates.length,1,`${context}: exact UA26 central source-purpose receipt`);
    verifyUa26NormalizedReference(candidates[0],ua26CentralIntegration.reusedReferences.includes(candidates[0]));
  }else if(ref.status==='Additional source price occurrence; does not change the canonical price source or field grade.'){
    const itemId=context.split(':')[0];
    const candidates=ua75SecondaryIntegration.referenceAppends.filter(receipt=>receipt.itemId===itemId&&JSON.stringify(receipt.appendReference)===JSON.stringify(withoutGeneratedCitationTransport(ref)));
    assert.equal(candidates.length,1,`${context}: exact UA75 secondary-occurrence receipt`);
    assert.equal(ref.book,'UA');
    assert.deepEqual(ref.pages,[75]);
    const regionId=ref.verification?.regions?.[0];
    assert.equal(candidates[0].appendReference.verification.regions[0],regionId);
    const proof=ua75SecondaryReview.regions.find(record=>record.regionId===regionId);
    assert.ok(proof?.independent&&proof.status==='confirmed',`${context}: exact independent UA75 source-pixel review`);
  }else if (/purchase price$/.test(context) && ref.status === 'Selected purchase-price row visually checked') {
    assert.equal(ref.status, 'Selected purchase-price row visually checked');
    const id=context.split(':')[0];
    const catalog=load(`dist/${citationOverrides.sourceExcerpts[`equipment:${id}`].catalog}`);
    assert.ok(catalog.regions.some(region=>region.book===ref.book && ref.pages.includes(region.printedPage) && !/table headings/i.test(region.title)), `${context}: source excerpt`);
  }else{
    assert.match(ref.status || '', /OCR checked/, `${context}: verification state`);
    assert.match(ref.status || '', /visual.*pending/i, `${context}: visual verification is pending`);
  }
  assert.doesNotMatch(ref.status || '', /visually verified/i, `${context}: unsupported visual claim`);
}

test('all 50 supplemental table references remain source-location-only and preserve frozen field values and grades',()=>{
  assert.equal(locationReferenceIntegration.references.length,50);
  assert.equal(dmg225Integration.sourceValueGradesChanged,false);
  for(const receipt of locationReferenceIntegration.references){
    const itemId=receipt.itemId;
    const reference=(citationOverrides.items[itemId]?.references||[]).find(candidate=>JSON.stringify(candidate)===JSON.stringify(receipt.reference));
    assert.ok(reference,`${itemId}: exact source-location reference is present in citation overrides`);
    verifySupplementalLocationOnlyReference(reference,`${itemId}: related reference`);
  }
});

test('all 25 UA27 row references remain source-location-only and bind to exact independent row proofs',()=>{
  assert.equal(ua27ReferenceIntegration.references.length,25);
  assert.equal(new Set(ua27ReferenceIntegration.references.map(entry=>entry.itemId)).size,25);
  for(const receipt of ua27ReferenceIntegration.references){
    const reference=(citationOverrides.items[receipt.itemId]?.references||[]).find(candidate=>JSON.stringify(candidate)===JSON.stringify(receipt.reference));
    assert.ok(reference,`${receipt.itemId}: exact UA27 source-location reference is present in citation overrides`);
    verifyUa27LocationOnlyReference(reference,`${receipt.itemId}: related reference`);
  }
});

test('UA75 native price occurrences add only 16 receipt-backed source references after the UA26/27/28 checkpoint',()=>{
  verifyUa75ContractCheckpoint();
  assert.equal(ua75SecondaryBefore.knownMissingPriceRowRegions.length,16);
  assert.equal(ua75SecondaryBefore.sourcePageCitationsBefore.length,16);
  assert.ok(ua75SecondaryBefore.sourcePageCitationsBefore.every(entry=>entry.status==='required-table-region-absent'));
  assert.equal(ua75SecondaryIntegration.referenceAppends.length,16);
  assert.equal(ua75SecondaryIntegration.catalogAppends.length,16);
  assert.equal(ua75SecondaryReview.tableContract.confirmed,16);
  assert.equal(ua75SecondaryReview.tableContract.inapplicable,1);
  assert.equal(ua75SecondaryBefore.availabilityOnlyRow.id,'ua-other-001-armor-r04');
  const table=ua75SecondaryBefore.tableContract;
  assert.equal(table.rows.length,17);
  const byRowId=new Map(table.rows.map(row=>[row.id,row]));
  const reviewByRegion=new Map(ua75SecondaryReview.regions.map(region=>[region.regionId,region]));
  const catalogAppendByRegion=new Map(ua75SecondaryIntegration.catalogAppends.map(entry=>[entry.regionId,entry]));
  const ids=new Set();
  const expectedUnchangedPriceHashes=ua75SecondaryIntegration.pricePreservation.allItemPriceObjectsUnchanged;
  for(const receipt of ua75SecondaryIntegration.referenceAppends){
    const itemId=receipt.itemId;
    const item=assembled.equipment.find(candidate=>candidate.id===itemId);
    const authored=authoredEquipmentById.get(itemId);
    const frozen=frozenEquipmentById.get(itemId);
    assert.ok(item&&authored&&frozen,`${itemId}: pre-existing item remains in the reconstructed checkpoint`);
    assert.equal(Object.hasOwn(item,'collection'),false,`${itemId}: override collection owner metadata is routing-only`);
    assert.deepEqual(authored.fields,frozen.fields,`${itemId}: UA75 occurrence does not change old field values`);
    assert.deepEqual(authored.fieldSources,frozen.fieldSources,`${itemId}: UA75 occurrence does not promote old field grades`);
    assert.deepEqual(withoutGeneratedCitationTransport(item.price),authored.price,`${itemId}: assembled canonical price remains the authored price object`);
    assert.deepEqual(authored.price,frozen.price,`${itemId}: canonical price object remains the frozen pre-UA26/27/28 value/grade`);
    assert.ok(expectedUnchangedPriceHashes[itemId],`${itemId}: the UA75 before receipt retains a canonical-price hash`);

    const override=citationOverrides.items[receipt.scopedKey];
    assert.ok(override,`${itemId}: exact scoped override exists`);
    if(receipt.beforeScopedKeyPresent){
      assert.deepEqual(override.collection,receipt.beforeScopedEntry.collection,`${itemId}: existing collection-owner metadata is preserved exactly`);
      assert.deepEqual(override.references,[...receipt.beforeScopedEntry.references,receipt.appendReference],`${itemId}: pre-existing scoped references remain and only the approved occurrence is appended`);
    }else{
      assert.equal(override.collection,'equipment',`${itemId}: new scoped override declares its collection owner`);
      assert.deepEqual(override.references,[receipt.appendReference],`${itemId}: new scoped metadata contains exactly the approved extra occurrence`);
    }
    const index=Number(receipt.fieldPointer.match(/^\/references\/(\d+)$/)?.[1]);
    assert.ok(Number.isInteger(index),`${itemId}: receipt uses an exact reference pointer`);
    assert.equal(item.references.length,receipt.expectedResolvedReferenceCountAfter,`${itemId}: effective reference count is exactly the reviewed append`);
    assert.deepEqual(withoutGeneratedCitationTransport(item.references[index]),receipt.appendReference,`${itemId}${receipt.fieldPointer}: exact additional UA75 occurrence`);
    assert.deepEqual([item.references[index].book,item.references[index].pages,item.references[index].status],['UA',[75],'Additional source price occurrence; does not change the canonical price source or field grade.']);
    const remainingReferences=item.references.filter((_,referenceIndex)=>referenceIndex!==index);
    assert.equal(remainingReferences.length,receipt.existingResolvedReferencesCount,`${itemId}: every old UA26/27/28 reference remains before the one exact append`);
    assert.equal(ids.has(itemId),false,`${itemId}: unique UA75 price-occurrence owner`);
    ids.add(itemId);

    const row=table.rows.find(candidate=>candidate.targets.some(target=>target.collection==='equipment'&&target.itemId===itemId));
    assert.ok(row,`${itemId}: reviewed UA75 price row exists`);
    assert.equal(row.targets.length,1,`${itemId}: only one exact equipment mapping is recorded`);
    const target=row.targets[0];
    assert.equal(target.applicability,'confirmed');
    assert.equal(target.fieldPointer,receipt.fieldPointer);
    assert.deepEqual(target.requiredRegionIds,receipt.appendReference.verification.regions);
    assert.equal(target.requiredTableImageSha256,ua75SecondaryReview.regions.find(entry=>entry.regionId===target.requiredRegionIds[0])?.imageSha256);
    const regionId=target.requiredRegionIds[0];
    assert.equal(ids.has(regionId),false,`${regionId}: unique UA75 row region`);
    ids.add(regionId);
    const proof=reviewByRegion.get(regionId);
    assert.ok(proof?.independent&&proof.status==='confirmed',`${regionId}: exact independent source-pixel proof`);
    const catalogAppend=catalogAppendByRegion.get(regionId);
    assert.ok(catalogAppend,`${regionId}: exact catalog append receipt`);
    assert.equal(catalogAppend.itemId,itemId);
    assert.deepEqual(catalogAppend.regionEvidence,{regionId,sourceSha256:proof.sourceSha256,imageSha256:proof.imageSha256,focusSha256:proof.focusSha256,contentSha256:proof.contentSha256});
    const catalog=load(`dist/${citationOverrides.sourceExcerpts[`equipment:${itemId}`].catalog}`);
    const region=catalog.regions.find(candidate=>candidate.id===regionId);
    assert.ok(region,`${itemId}: current catalog carries the reviewed UA75 row`);
    assert.equal(region.role,'row');
    assert.equal(region.sha256,proof.imageSha256);
    assert.equal(region.sourceRowId,row.id);
    assert.deepEqual([region.book,region.printedPage,region.pdfPage],['UA',75,76]);
    assert.equal(region.title,`UA p. 75 · Expanded armor costs — ${row.label}`);
    const hashes=sourceVisualRegionHashes(region);
    assert.equal(hashes.focusSha256,proof.focusSha256);
    assert.equal(hashes.contentSha256,proof.contentSha256);
    const image=readFileSync(new URL(`../dist/scans/verified/${region.image}`,import.meta.url));
    assert.equal(createHash('sha256').update(image).digest('hex'),proof.imageSha256,`${regionId}: shipped image bytes match independent pixel review`);
  }
  assert.equal(ids.size,32,'exactly16 owners and16 distinct row regions are added');
  const unavailable=byRowId.get('ua-other-001-armor-r04');
  assert.equal(unavailable?.targets.length,0,'Elfin Chain remains unavailable with no invented owner or numeric price');
});

test('the three UA28 missing-row references bind only to their reviewed rows and preserve frozen field grades',()=>{
  const itemIds=['ua-harpoon','phb-hammer','phb-javelin'];
  assert.deepEqual(ua28ThreeRowReview.reviews.map(record=>record.itemId),itemIds);
  for(const itemId of itemIds){
    const reference=(citationOverrides.items[itemId]?.references||[]).find(candidate=>candidate.status==='Source table row independently located; no new value extraction implied');
    assert.ok(reference,`${itemId}: exact UA28 source-location reference exists`);
    verifyUa28ThreeRowLocationOnlyReference(reference,`${itemId}: related reference`);
  }
});

test('UA26 central integration contains 140 normalized source purposes, keeps all 25 foreign HH plans separate, and preserves older references',()=>{
  verifyEvidenceFileHashes([ua26CentralIntegrationPath,ua26CentralProposalPath,ua26IndependentReviewPath,ua26HandQuarrelReviewPath,ua26HandQuarrelAppendPath,ua26HandQuarrelGroupAppendPath]);
  assert.equal(ua26CentralIntegration.addedReferences.length,136);
  assert.equal(ua26CentralIntegration.reusedReferences.length,4);
  assert.equal(ua26CentralIntegration.addedFieldBindings.length,45);
  assert.equal(ua26CentralIntegration.addedGroups.length,91);
  assert.deepEqual(ua26CentralIntegration.referencePurposeBaseline.draftPlanDenominator,141);
  assert.equal(ua26CentralIntegration.referencePurposeBaseline.normalizedPurposePlans,140);
  const foreignPlans=ua26CentralIntegration.referencePurposeBaseline.draftForeignPurposeRegions;
  assert.equal(foreignPlans.length,25,'all purpose-normalization exceptions remain explicit');
  const foreignRegions=new Set(foreignPlans.flatMap(plan=>plan.foreignRegionIds));
  assert.equal(foreignRegions.size,27,'all foreign hand-held region IDs are explicitly identified');

  const normalizedReceipts=[...ua26CentralIntegration.addedReferences,...ua26CentralIntegration.reusedReferences];
  assert.equal(normalizedReceipts.length,140);
  const newSelectedRegions=new Set();
  for(const receipt of ua26CentralIntegration.addedReferences){
    const ids=receipt.reference.verification?.regions||[];
    for(const id of ids)newSelectedRegions.add(id);
    verifyUa26NormalizedReference(receipt,false);
  }
  for(const receipt of ua26CentralIntegration.reusedReferences){
    for(const id of receipt.applied.regionIds)newSelectedRegions.add(id);
    verifyUa26NormalizedReference(receipt,true);
  }
  for(const regionId of foreignRegions){
    assert.equal(newSelectedRegions.has(regionId),false,`${regionId}: excluded from new UA26 context purposes`);
  }
  for(const plan of foreignPlans){
    const itemId=plan.owner.split(':')[1];
    const currentItem=assembled.equipment.find(item=>item.id===itemId);
    const citationItem=citationOverrides.items[itemId];
    assert.ok(currentItem&&citationItem,`${itemId}: existing hand-held reference owner remains present`);
    const retained=currentItem.references.find(reference=>reference.book==='UA'&&reference.pages?.includes(27)&&plan.foreignRegionIds.every(id=>reference.verification?.regions?.includes(id)));
    assert.ok(retained,`${itemId}: original UA27 hand-held reference retains each excluded region`);
    assert.ok(citationItem.references.some(reference=>JSON.stringify(withoutGeneratedCitationTransport(reference))===JSON.stringify(withoutGeneratedCitationTransport(retained))),`${itemId}: separate older reference remains in citation overrides`);
  }
});

test('UA26 row bindings, 91 ordered groups, and historical source grades remain distinct',()=>{
  verifyEvidenceFileHashes([ua26CentralIntegrationPath,ua26IndependentReviewPath,ua26MarkerReviewPath,ua26ReviewIntegrationPath,ua26HandQuarrelReviewPath,ua26HandQuarrelAppendPath,ua26HandQuarrelGroupAppendPath]);
  verifyUa75ContractCheckpoint();
  const sourceTable=currentTableContracts.tables.find(table=>table.id==='ua-p26-weight-damage-by-weapon-type');
  assert.ok(sourceTable);
  assert.equal(sourceTable.rowCount,68);
  assert.equal(ua26IndependentReview.summary.rowBindings,90);
  assert.equal(ua26IndependentReview.summary.facingNoteBindings,66);
  assert.equal(ua26IndependentReview.summary.totalRecords,156);
  assert.equal(ua26IndependentReview.summary.fieldValuesPromoted,0);
  assert.equal(ua26HandQuarrelReview.summary.records,2);
  assert.equal(ua26HandQuarrelReview.summary.fieldValuesPromoted,0);
  const baseImport=ua26ReviewIntegration.imports.find(entry=>entry.path===ua26IndependentReviewPath);
  const markerImport=ua26ReviewIntegration.imports.find(entry=>entry.path===ua26MarkerReviewPath);
  const handImport=ua26ReviewIntegration.imports.find(entry=>entry.path===ua26HandQuarrelReviewPath);
  assert.deepEqual([baseImport.current.length,baseImport.supersededBeforeCorrection.length,markerImport.current.length,handImport.current.length],[151,5,5,2]);
  assert.equal(ua26ReviewIntegration.imports.reduce((sum,entry)=>sum+entry.current.length,0),158);
  assert.equal(ua26MarkerReview.records.length,5);
  for(const superseded of baseImport.supersededBeforeCorrection){
    const old=ua26IndependentReview.records.find(record=>record.itemId===superseded.itemId&&record.regionId===superseded.regionId);
    const current=ua26MarkerReview.records.find(record=>record.itemId===superseded.itemId&&record.regionId===superseded.regionId);
    assert.ok(old&&current,`${superseded.itemId}/${superseded.regionId}: old evidence and corrected review remain separately recorded`);
    assert.deepEqual(superseded.oldEvidence,old,`${superseded.itemId}/${superseded.regionId}: superseded snapshot preserves the exact old review`);
    assert.equal(current.supersedes.priorRegionFocusSha256,old.focusSha256,`${superseded.itemId}/${superseded.regionId}: correction identifies its exact prior focus`);
    assert.equal(current.supersedes.priorRegionContentSha256,old.contentSha256,`${superseded.itemId}/${superseded.regionId}: correction identifies its exact prior content`);
    assert.equal(current.supersedes.priorDisposition,old.markerAssociationAssessment.status==='defect'?'confirmed-note-association-defect':'specific-marker-association-pending');
    const {proof}=ua26CurrentProofFor(current.itemId,current.regionId);
    const region=load(`dist/${current.catalog}`).regions.find(candidate=>candidate.id===current.regionId);
    assert.equal(proof.focusSha256,sourceVisualRegionHashes(region).focusSha256,`${current.itemId}/${current.regionId}: current marker proof matches current catalog focus`);
    assert.equal(proof.contentSha256,sourceVisualRegionHashes(region).contentSha256,`${current.itemId}/${current.regionId}: current marker proof matches current catalog content`);
    assert.equal(createHash('sha256').update(readFileSync(new URL(`../dist/${current.catalog}`,import.meta.url))).digest('hex'),current.catalogSha256,`${current.itemId}/${current.regionId}: marker review catalog hash is current`);
  }

  assert.equal(frozenBaselineEquipment.length,189,'Git 679 equipment baseline remains the 189-record checkpoint');
  assert.equal(authoredGear.length,191,'current authored equipment adds only the separately reviewed two offer records');
  for(const frozen of frozenBaselineEquipment){
    const current=authoredEquipmentById.get(frozen.id);
    assert.ok(current,`${frozen.id}: current authored record exists`);
    assert.deepEqual(current.fields,frozen.fields,`${frozen.id}: all old field values remain unchanged from Git 679`);
    assert.deepEqual(current.fieldSources,frozen.fieldSources,`${frozen.id}: all old source-value grades remain unchanged from Git 679`);
  }
  assert.equal(frozenEquipmentById.has('ua-quarrels-for-same'),false,'new hand-quarrel context target was not part of Git 679');
  const handQuarrelOffer=load('tests/fixtures/equipment-offers-batch5.json').records.find(item=>item.id==='ua-quarrels-for-same');
  assert.ok(handQuarrelOffer,'current hand-quarrel record is checked against the newer two-offer checkpoint');
  const handQuarrel=authoredEquipmentById.get('ua-quarrels-for-same');
  assert.deepEqual(handQuarrel.fields,handQuarrelOffer.fields);
  assert.deepEqual(handQuarrel.fieldSources,handQuarrelOffer.fieldSources);

  const bindings=ua26CentralIntegration.addedFieldBindings;
  assert.equal(bindings.length,45);
  for(const binding of bindings)verifyUa26FieldBinding(binding);

  const manifest=load('research/citation-continuations.json');
  assert.equal(finalContinuationIntegration.before.groups,151,'the final receipt preserves the UA26-era manifest checkpoint');
  assert.equal(finalContinuationIntegration.before.segments,278,'the final receipt preserves the UA26-era segment checkpoint');
  assert.equal(finalContinuationIntegration.added.length,36,'the final manifest adds only its exact 36 reviewed groups');
  const laterGroups=[...load('research/source-audit-batch5-ua10-crop-integration.json').addedGroups,load('research/source-audit-batch5-continuation-alias-integration.json').addedGroup];
  assert.deepEqual(frozenDmgBeforeManifest.groups.slice(finalContinuationIntegration.after.groups),laterGroups);
  const ua10Inputs=JSON.parse(gunzipSync(readFileSync(load('research/source-audit-batch5-ua10-crop-integration.json').before.additionalExactInputs.path)));
  const activatedManifest=JSON.parse(ua10Inputs.files['research/citation-continuations.json'].utf8);
  assert.deepEqual(manifest.groups.slice(0,finalContinuationIntegration.after.groups),activatedManifest.groups);
  assert.ok(manifest.scope.startsWith(activatedManifest.scope),'later Drow context scope retains the historical text');
  const restoredPrefix=structuredClone(activatedManifest);
  const addedGroupIds=new Set(finalContinuationIntegration.added.map(group=>group.id));
  restoredPrefix.groups=restoredPrefix.groups.filter(group=>!addedGroupIds.has(group.id));
  for(const replacement of finalContinuationIntegration.replacements){
    const index=restoredPrefix.groups.findIndex(group=>group.id===replacement.groupId);
    assert.notEqual(index,-1,`${replacement.groupId}: receipt replacement remains in the prior prefix`);
    assert.deepEqual(restoredPrefix.groups[index],replacement.after,`${replacement.groupId}: exact recorded after-state is active`);
    restoredPrefix.groups[index]=replacement.before;
  }
  const restoredPrefixBytes=(JSON.stringify(restoredPrefix,null,2)+'\n').replace(/[\u007f-\uffff]/g,character=>'\\u'+character.charCodeAt(0).toString(16).padStart(4,'0'));
  assert.equal(createHash('sha256').update(restoredPrefixBytes).digest('hex'),finalContinuationIntegration.priorManifestSha256,
    'reversing only exact later additions and five recorded replacements recreates the frozen 151-group manifest bytes');
  assert.equal(restoredPrefix.groups.length,151);
  assert.equal(restoredPrefix.groups.reduce((sum,group)=>sum+group.segments.length,0),278);
  assert.equal(activatedManifest.groups.length,finalContinuationIntegration.after.groups);
  assert.equal(activatedManifest.groups.reduce((sum,group)=>sum+group.segments.length,0),finalContinuationIntegration.after.segments);
  const currentAppendedGroups=activatedManifest.groups.slice(151);
  assert.deepEqual(currentAppendedGroups.map(group=>group.id),finalContinuationIntegration.added.map(group=>group.id),'all post-checkpoint groups match exact receipt order and IDs');
  for(const [index,receipt] of finalContinuationIntegration.added.entries()){
    const group=currentAppendedGroups[index];
    assert.equal(group.itemId,receipt.itemId,`${receipt.id}: exact receipt owner`);
    assert.equal(group.segments.length,receipt.segments,`${receipt.id}: exact receipt segment count`);
    assert.deepEqual(group.relationship??null,receipt.relationship,`${receipt.id}: exact receipt relationship`);
  }
  const manifestById=new Map(manifest.groups.map(group=>[group.id,group]));
  for(const receipt of ua26CentralIntegration.addedGroups){
    const group=manifestById.get(receipt.id);
    assert.ok(group,`${receipt.id}: central context group is active in the manifest`);
    assert.equal(group.itemId,receipt.itemId);
    assert.equal(group.segments.length,receipt.segments);
  }
  const handGroup=manifestById.get('ua26-wd-45-ua-quarrels-for-same');
  assert.ok(handGroup);
  assert.deepEqual(handGroup.segments.map(segment=>[segment.order,segment.role,segment.book,segment.printedPage,segment.pdfPage,segment.regionId]),[
    [1,'opening','UA',26,27,'ua-26-wd-row-1a39b6171f135317'],
    [2,'continuation','UA',27,28,'ua26-notes-45-ua-quarrels-for-same']
  ]);
  assert.equal(handGroup.sourceRowTarget.applicability,'confirmed');
  assert.equal(handGroup.sourceRowTarget.requiredEvidenceRole,'row');
  assert.deepEqual(handGroup.sourceValueScope,{fieldsPromoted:0,priceOrQuantityChanged:false,perQuarrelPriceInferred:false,launcherStatisticsAssigned:false,quantityRemainsUnspecified:true});
  assert.equal(ua26HandQuarrelGroupAppend.group.id,handGroup.id);
});

test('assembly preserves every equipment and matrix field from the author checkpoints', () => {
  assert.ok(Array.isArray(assembled.equipment), 'assembled equipment collection is required');
  assert.ok(Array.isArray(assembled.matrices), 'assembled matrices collection is required');
  const ambiguousIds=ambiguousItemOverrideIds({equipment:authoredGear});
  const expected=authoredGear.map(item=>{
    const referenceOverrides=collectionReferenceOverrides(citationOverrides.items,'equipment',item.id,ambiguousIds);
    const references=referenceOverrides.flatMap(override=>override.references||[]);
    return {...item,...withoutCollectionOwnerMetadata(citationOverrides.items[item.id]),...withoutCollectionOwnerMetadata(citationOverrides.items[`equipment:${item.id}`]),...(citationOverrides.priceStates?.[item.id]?{priceState:citationOverrides.priceStates[item.id]}:{}),...(references.length?{references:[...(item.references||[]),...references]}:{})};
  });
  assert.deepEqual(withoutGeneratedCitationTransport(assembled.equipment.map(({sourceExcerpts,...item})=>item)), withoutGeneratedCitationTransport(expected), 'equipment and reviewed reference additions must not be omitted or flattened');
  assert.deepEqual(withoutGeneratedCitationTransport(assembled.matrices.map(({sourceExcerpts,...matrix})=>matrix)), withoutGeneratedCitationTransport(authoredMatrices), 'matrix nulls and source notes must survive assembly');
});

for (const [name, gear] of [['authored', authoredGear], ['assembled', assembled.equipment]]) {
  test(`${name} catalogue keeps baseline and 73 completion prices distinct`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    assert.equal(withoutPriceCompletionEquipment(gear).length, 116, 'the completion fixture reverses to the pinned baseline population');
    assert.equal(withoutSourceFirstEquipment(gear).length, 88);
    assert.equal(new Set(withoutBatch5OfferEquipment(gear).map(item => item.id)).size, 189, 'the exact earlier checkpoint remains189 unique entries');
    assert.equal(new Set(gear.map(item => item.id)).size, 191, 'current catalogue also includes the two separately reviewed offers');
    assert.equal(withoutPriceCompletionEquipment(gear).filter(item => item.price !== null).length, 112, 'the pinned baseline contains 112 purchase prices');
    assert.equal(withoutBatch5OfferEquipment(gear).filter(item => item.price !== null).length, 185, '112 baseline prices plus 73 reviewed prices');
    assert.equal(gear.filter(item => item.price !== null).length, 187, 'the two source offers add two distinct printed prices');
    assert.equal(withoutSourceFirstEquipment(gear).filter(item => item.price !== null).length, 84);
    assert.equal(gear.filter(item => item.price === null).length, 4);
    for (const item of gear) {
      source(item, item.id);
      assert.equal(item.incomplete, true, `${item.id}: catalogue remains a partial transcription`);
      if (item.price === null) {
        assert.ok(typeof item.priceNote === 'string' && item.priceNote.trim(), `${item.id}: explain the unavailable price`);
      } else {
        assert.ok(Number.isFinite(item.price.amount) && item.price.amount > 0, `${item.id}: positive source price`);
        assert.ok(['gp', 'sp', 'cp', 'ep'].includes(item.price.currency), `${item.id}: purchase currency`);
        source(item.price, `${item.id}: purchase price`);
      }
    }
  });

  test(`${name} equipment gives each attribute and related reference its own printed source`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    for (const item of gear) {
      assert.deepEqual(Object.keys(item.fieldSources || {}).sort(), Object.keys(item.fields || {}).sort(), `${item.id}: no orphaned or uncited attribute`);
      for (const [label, value] of Object.entries(item.fields || {})) {
        assert.ok(value !== null && value !== undefined && value !== '', `${item.id}: ${label} must not imply an unknown number`);
        const ref = item.fieldSources[label];
        source(ref, `${item.id}: ${label}`);
        const namedSource = label.match(/\((PHB|UA|DMG) p\.(\d+)\)/);
        if (namedSource) {
          assert.equal(ref.book, namedSource[1], `${item.id}: field label/source agreement`);
          assert.ok(ref.pages.includes(Number(namedSource[2])), `${item.id}: labeled printed page`);
        }
      }
      for (const ref of item.references || []) source(ref, `${item.id}: related reference`);
    }
  });

  test(`${name} equipment never converts gp-weight into a purchase price or loses package quantities`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    const weighted = gear.filter(item => Object.keys(item.fields).some(label => /weight/i.test(label)));
    assert.ok(weighted.length > 0, 'weight-unit regression requires weighted items');
    for (const item of weighted) {
      for (const [label, value] of Object.entries(item.fields)) if (/weight/i.test(label)) {
        if (label === 'Weight' && item.fieldSources[label]?.book === 'UA' && item.fieldSources[label]?.pages.includes(75)) {
          assert.match(String(value), /lb.*human-sized/i, `${item.id}: human-sized armor weight units`);
        } else {
          assert.match(String(value), /gp-weight/, `${item.id}: encumbrance unit must be explicit`);
          assert.match(String(value), /not (?:purchase )?cost/i, `${item.id}: weight is not currency`);
        }
      }
      assert.ok(item.price === null || item.price.currency !== 'gp-weight');
    }
    const axe = gear.find(item => item.id === 'phb-battle-axe');
    assert.equal(axe.price.amount, 5, 'the separately checked PHB p.35 price is 5 gp, not 75 gp-weight');
    assert.equal(axe.price.currency,'gp');
    assert.deepEqual(axe.price.pages,[35]);
    assert.match(axe.fields['Approx. weight'], /^75 gp-weight/);
    for (const [id, amount, currency, unit] of [
      ['phb-rope-50', 4, 'sp', '50-foot length'],
      ['phb-oil-flask', 1, 'gp', 'flask'],
      ['phb-holy-water', 25, 'gp', 'vial'],
      ['phb-standard-rations', 3, 'gp', '1 week'],
    ]) {
      const item = gear.find(item => item.id === id);
      assert.deepEqual([item.price.amount, item.price.currency, item.price.unit], [amount, currency, unit], `${id}: source package price`);
      assert.deepEqual([item.price.book, item.price.pages], ['PHB', [36]]);
    }
  });

  test(`${name} crossbows preserve UA statistics, PHB range units and reviewed costs`, () => {
    assert.ok(Array.isArray(gear), 'equipment collection must be assembled');
    for (const [id, rate, ranges] of [
      ['phb-light-crossbow', '1 (tabletop-miniatures turn or melee round)', '6 / 12 / 18 (numeric bands)'],
      ['phb-heavy-crossbow', '½ (tabletop-miniatures turn or melee round)', '8 / 16 / 24 (numeric bands)'],
      ['ua-hand-crossbow', '1 (tabletop-miniatures turn or melee round)', '2 / 4 / 6 (numeric bands)'],
    ]) {
      const item = gear.find(item => item.id === id);
      assert.ok(item, id);
      if (id === 'ua-hand-crossbow') assert.deepEqual([item.price.amount,item.price.currency,item.price.book,item.price.pages], [300,'gp','UA',[26]]);
      else { assert.equal(item.price.amount, id === 'phb-light-crossbow' ? 12 : 20); assert.equal(item.price.currency, 'gp'); assert.deepEqual(item.price.pages, [35]); }
      assert.equal(item.fields['Rate of fire (UA p.28)'], rate);
      assert.equal(item.fields['Range S / M / L (UA p.28)'], ranges);
      assert.deepEqual([item.fieldSources['Rate of fire (UA p.28)'].book, item.fieldSources['Rate of fire (UA p.28)'].pages], ['UA', [28]]);
      assert.deepEqual([item.fieldSources['Range S / M / L (UA p.28)'].book, item.fieldSources['Range S / M / L (UA p.28)'].pages], ['UA', [28]]);
      assert.match(item.fields['Range scale (PHB p.39)'], /10 feet indoors; 10 yards outdoors/);
      assert.deepEqual([item.fieldSources['Range scale (PHB p.39)'].book, item.fieldSources['Range scale (PHB p.39)'].pages], ['PHB', [39]]);
      assert.ok(item.references.some(ref => ref.book === 'UA' && ref.pages.includes(28)));
      assert.ok(item.references.some(ref => ref.book === 'PHB' && ref.pages.includes(39)));
    }
  });
}

for (const [name, matrices] of [['authored', authoredMatrices], ['assembled', assembled.matrices]]) {
  test(`${name} original matrix preserves all 210 independently checked source cells`, () => {
    assert.ok(Array.isArray(matrices) && matrices.length === 1);
    const matrix = matrices[0];
    source(matrix, matrix.id);
    assert.deepEqual([matrix.book, matrix.pages], ['DMG', [74]]);
    assert.equal(matrix.incomplete, true, 'other combat mechanics retain their review status');
    assert.deepEqual(matrix.armorClasses, Array.from({length:21}, (_, i) => 10 - i));
    assert.equal(matrix.rows.length, 10);
    matrix.rows.forEach((row, band) => {
      assert.equal(row.targets.length, 21);
      matrix.armorClasses.forEach((ac, column) => {
        const sourceRow = independentMatrix.armorClasses.indexOf(ac);
        assert.equal(row.targets[column], independentMatrix.rows[sourceRow][band], `${row.label}, AC ${ac}`);
      });
    });
    assert.deepEqual(combat.coverage(matrix), {known:210, total:210, missing:0});
    assert.deepEqual([matrix.coverage.knownCells, matrix.coverage.totalCells, matrix.coverage.missingCells], [210, 210, 0]);
    assert.deepEqual(matrix.coverage.completeArmorClassRows, matrix.armorClasses);
    assert.deepEqual(matrix.coverage.unreadableArmorClassRows, []);
    assert.deepEqual([matrix.cellVerification.book, matrix.cellVerification.printedPage, matrix.cellVerification.pdfPage, matrix.cellVerification.cellCount], ['DMG',74,75,210]);
    assert.equal(matrix.cellVerification.sourceSha256, '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
    assert.match(matrix.cellVerification.scope, /cells only.*other combat mechanics/i);
  });

  test(`${name} source AC-zero progression retains official bands and separate optional rules`, () => {
    assert.ok(Array.isArray(matrices) && matrices.length === 1);
    const matrix = matrices[0];
    assert.deepEqual(matrix.rows.map(row => [row.levelMin, row.levelMax ?? null]), [[0,0],[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,null]]);
    assert.deepEqual(matrix.rows.map(row => row.targets[matrix.armorClasses.indexOf(0)]), [20,20,18,16,14,12,10,8,6,4]);
    assert.match(matrix.rows[0].label, /halflings and humans/, 'level zero is not a generic fighter row');
    for (const ref of [...matrix.ruleNotes, ...matrix.comparisonExamples]) source(ref, `${matrix.id}: ${ref.id || ref.armorClass}`);
    const perLevel = matrix.ruleNotes.find(note => note.id === 'dmg-fighter-per-level-attack-option');
    assert.deepEqual([perLevel.book, perLevel.pages, perLevel.optional], ['DMG', [74], true]);
    const naturalTwenty = matrix.ruleNotes.find(note => note.id === 'dmg-repeated-twenties');
    assert.deepEqual([naturalTwenty.book, naturalTwenty.pages, naturalTwenty.optional], ['DMG', [82], true]);
    assert.match(naturalTwenty.text, /optional amendment/i);
  });
}

test('fighter Alt uses the sourced first-level AC-zero anchor rather than the special level-zero column', () => {
  const matrix = assembled.matrices?.[0];
  assert.ok(matrix, 'matrix must be assembled before comparing progression');
  const acZero = matrix.armorClasses.indexOf(0);
  const fixture = {...matrix, rows:matrix.rows.map(row => ({...row, targets:row.targets.map((value, index) => row.levelMin === 0 && index === acZero ? 99 : value)}))};
  const alt = combat.fighterAltTransition(fixture, 4, 5);
  assert.deepEqual([alt.anchorLevel, alt.anchorArmorClass, alt.anchorTarget], [1, 0, 20]);
  assert.deepEqual([alt.from, alt.to, alt.houseRule, alt.book, alt.pages], [17, 16, true, 'DMG', [74]]);
  const standard = combat.standardTransition(matrix, 4, 5);
  assert.deepEqual([standard.from, standard.to, standard.book, standard.pages], [18, 16, 'DMG', [74]]);
});
