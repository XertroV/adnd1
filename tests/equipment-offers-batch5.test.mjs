import {readBeforeJoFile as readFileSync} from '../research/mm-source-history-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-v1.proposed.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';

import {execFileSync} from 'node:child_process';
import {buildPriceSourceInventory,sourceVisualRegionHashes,validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';
import {batch5OfferEquipment,withoutBatch5OfferEquipment,withoutGeneratedCitationTransport} from './equipment-source-first-fixture.mjs';
import {validScanCatalogPath,validateScanCatalog} from '../tools/scan-catalog.mjs';
import books from '../dist/books.js';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const equipment=read('equipment.json').equipment;
const reviewPath='research/source-audit-batch5-price-independent-review.json';
const review=read(reviewPath);
const ua26CentralIntegrationPath='research/source-audit-batch5-ua26-central-integration.json';
const ua26CentralIntegration=read(ua26CentralIntegrationPath);
const ua26RowAppendPath='research/source-audit-batch5-ua26-current-row-append.json';
const ua26RowAppend=read(ua26RowAppendPath);
const ua26HandReviewPath='research/source-audit-batch5-ua26-hand-quarrel-independent-review.json';
const ua26HandReview=read(ua26HandReviewPath);
const assembledData=read('dist/data.json');
const citationOverrides=read('citation-overrides.json');
const fileHash=path=>createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex');

test('new offer catalog metadata uses its collection and preserves the rejected preimage',()=>{
  const receipt=read('research/source-audit-batch5-offer-metadata-repair.json');
  assert.equal(receipt.repairs.length,2);
  for(const repair of receipt.repairs){
    const item=equipment.find(item=>item.id===repair.itemId),verification=item.scanVerification;
    const frozenOffer=batch5OfferEquipment.find(candidate=>candidate.id===repair.itemId);
    assert.ok(frozenOffer,repair.itemId);
    const rejectedFixturePreimage=structuredClone(frozenOffer.scanVerification);
    delete rejectedFixturePreimage.collection;
    assert.deepEqual(repair.before,rejectedFixturePreimage,`${repair.itemId}: exact rejected metadata preimage remains recorded`);
    assert.equal(repair.afterCollection,'equipment');
    assert.equal(verification.collection,repair.afterCollection);
    assert.equal(frozenOffer.scanVerification.collection,repair.afterCollection);
    assert.equal(validScanCatalogPath(item.id,repair.before.catalog,repair.before),false);
    assert.equal(validScanCatalogPath(item.id,verification.catalog,verification),true);
    assert.doesNotThrow(()=>validateScanCatalog(read('dist/'+verification.catalog),item,books,verification));
  }
});

test('the actual pre-fix source-offer omission is preserved and both current offers are independently reviewed',()=>{
  const beforeBytes=execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:equipment.json']);
  assert.equal(createHash('sha256').update(beforeBytes).digest('hex'),'4897dfbd39d4f438b566091cf815ce3cd7d8fcbc0615f28581a072c8f73a7e28');
  const before=JSON.parse(beforeBytes).equipment;
  assert.equal(before.length,189);assert.equal(before.filter(item=>item.price).length,185);
  for(const fixture of batch5OfferEquipment)assert.equal(before.some(item=>item.id===fixture.id),false);
  assert.equal(equipment.length,191);assert.equal(equipment.filter(item=>item.price).length,187);
  assert.equal(withoutBatch5OfferEquipment(equipment).length,189);
  assert.equal(review.records.length,2);
  for(const record of review.records){
    const item=equipment.find(item=>item.id===record.itemId);
    assert.ok(item,record.itemId);assert.equal(record.independent,true);assert.equal(record.verdict,'confirmed');
    assert.deepEqual({amount:item.price.amount,currency:item.price.currency,unit:item.price.unit??null},record.expectedPrice);
    assert.deepEqual(item.fields,record.expectedFields);
    const catalogBytes=readFileSync(new URL('../dist/'+record.catalog,import.meta.url));
    if(record.itemId==='ua-quarrels-for-same'){
      assert.equal(record.catalogSha256,'17dbae4fb305e305fa0f1ec14212752c8acd310578ca805fcca3ba5d00ff7670','the historical price review names the original one-region catalog');
      assert.equal(ua26RowAppend.row.catalog.beforeSha256,record.catalogSha256);
      assert.equal(fileHash('dist/'+record.catalog),ua26RowAppend.row.catalog.afterSha256,'the current three-region catalog matches the append receipt');
      const expanded=JSON.parse(catalogBytes.toString('utf8'));
      const reconstructed=structuredClone(expanded);
      reconstructed.regions=reconstructed.regions.filter(region=>region.id==='ua26-quarrels-for-same-price');
      assert.equal(createHash('sha256').update(`${JSON.stringify(reconstructed,null,2)}\n`).digest('hex'),record.catalogSha256,'removing only the two receipt-backed context regions reconstructs the reviewed one-price catalog');
    }else assert.equal(fileHash('dist/'+record.catalog),record.catalogSha256);
    const catalog=read('dist/'+record.catalog),region=catalog.regions.find(region=>region.id===record.regionId);
    assert.equal(catalog.sources[record.book].sha256,record.sourceSha256);
    assert.equal(region.sha256,record.imageSha256);
    assert.deepEqual(sourceVisualRegionHashes(region),{focusSha256:record.focusSha256,contentSha256:record.contentSha256});
    assert.deepEqual(region.boundsPdfPoints,record.sourceCrop.rect);assert.deepEqual(region.focusRects,record.highlights.rects);
    assert.equal(fileHash('dist/scans/verified/'+region.image),region.sha256);
    assert.ok(region.focusRects.every(rect=>JSON.stringify(rect)!=='[0,0,1,1]'));
  }
});

test('UA26 hand-quarrel context appends exactly two approved source references while preserving the original 100 gp offer',()=>{
  assert.equal(fileHash(ua26CentralIntegrationPath),'aac6f093b31b10a0b9329e1075dad7cdcc0b7c4b5192cc4368aba8712d34fe1d');
  assert.equal(fileHash(ua26RowAppendPath),'622de82d1c7c44e0ef78612535d4bb4d5ce025ddf02fc8fffb0527cc8532c1ca');
  assert.equal(fileHash(ua26HandReviewPath),'89a4c19040b456488a4c018a0191cc0bfc77655c3befb9048b9cdc826324c83e');
  assert.equal(ua26RowAppend.row.catalog.beforeSha256,'17dbae4fb305e305fa0f1ec14212752c8acd310578ca805fcca3ba5d00ff7670');
  assert.equal(ua26RowAppend.row.catalog.afterRegionCount,3);
  assert.equal(ua26RowAppend.row.catalog.existingPriceRegion.exactObjectPreserved,true);
  assert.equal(ua26RowAppend.row.catalog.sourceMetadataUnchanged,true);
  assert.deepEqual(ua26HandReview.summary,{records:2,structuralErrors:0,oldPriceCatalogPrefixPreserved:true,fieldValuesPromoted:0,quantityInferred:false,priceGradePromoted:false});
  assert.ok(ua26HandReview.checks.every(check=>check.pass), 'independent current append review remains fully passing');

  const frozen=batch5OfferEquipment.find(item=>item.id==='ua-quarrels-for-same');
  const authored=equipment.find(item=>item.id==='ua-quarrels-for-same');
  const current=assembledData.equipment.find(item=>item.id==='ua-quarrels-for-same');
  assert.ok(frozen&&authored&&current);
  for(const item of [authored,current]){
    assert.deepEqual(withoutGeneratedCitationTransport(item.fields),frozen.fields,'row context leaves the printed quantity field unchanged');
    assert.deepEqual(withoutGeneratedCitationTransport(item.fieldSources),frozen.fieldSources,'row context does not promote field-source grades');
    assert.deepEqual(withoutGeneratedCitationTransport(item.price),frozen.price,'the 100 gp offer object remains unchanged');
    assert.equal(Object.hasOwn(item.price,'unit'),false,'no per-quarrel price unit is inferred');
  }

  const catalog=read('dist/'+ua26RowAppend.row.catalog.path.replace(/^dist\//,''));
  assert.equal(fileHash('dist/'+ua26RowAppend.row.catalog.path.replace(/^dist\//,'')),ua26RowAppend.row.catalog.afterSha256);
  assert.deepEqual(catalog.sources.UA,ua26RowAppend.row.catalog.sourceMetadataAfter.UA);
  assert.deepEqual(catalog.sources.UA,ua26RowAppend.row.catalog.sourceMetadataBefore.UA,'UA source identity and edition metadata remain unchanged');
  assert.deepEqual(catalog.regions.map(region=>region.id),[
    'ua26-quarrels-for-same-price','ua-26-wd-row-1a39b6171f135317','ua26-notes-45-ua-quarrels-for-same'
  ]);
  const priceRecord=review.records.find(record=>record.itemId==='ua-quarrels-for-same');
  const priceRegion=catalog.regions[0];
  assert.equal(createHash('sha256').update(JSON.stringify(priceRegion)).digest('hex'),ua26RowAppend.row.catalog.existingPriceRegion.serializedObjectSha256,'the complete old price-region object prefix remains unchanged');
  assert.equal(priceRegion.sha256,priceRecord.imageSha256);
  assert.equal(priceRegion.id,priceRecord.regionId);
  assert.deepEqual(priceRegion.boundsPdfPoints,priceRecord.sourceCrop.rect);
  assert.deepEqual(priceRegion.focusRects,priceRecord.highlights.rects);
  assert.deepEqual(sourceVisualRegionHashes(priceRegion),{focusSha256:priceRecord.focusSha256,contentSha256:priceRecord.contentSha256});
  assert.equal(fileHash(`dist/scans/verified/${priceRegion.image}`),priceRecord.imageSha256,'original offer PNG bytes remain unchanged');

  const currentOverride=citationOverrides.sourceExcerpts['equipment:ua-quarrels-for-same'];
  const receiptOverride=ua26CentralIntegration.sourceExcerptOverrides.find(row=>row.itemId==='ua-quarrels-for-same');
  assert.deepEqual(currentOverride,receiptOverride.metadata);
  assert.equal(current.sourceExcerpts.regionCount,3);
  assert.equal(current.scanVerification.regionCount,3);
  const independentByRegion=new Map(ua26HandReview.records.map(record=>[record.regionId,record]));
  const priceProof=priceRecord;
  const expectedRegionIds=[priceRecord.regionId,...ua26HandReview.records.map(record=>record.regionId)];
  assert.deepEqual(current.sourceExcerpts.regionReviews.map(row=>row.regionId),expectedRegionIds);
  for(const reviewRow of current.sourceExcerpts.regionReviews){
    const proof=independentByRegion.get(reviewRow.regionId)??priceProof;
    const region=catalog.regions.find(candidate=>candidate.id===reviewRow.regionId);
    assert.ok(region,`${reviewRow.regionId}: current region remains in catalog`);
    assert.equal(reviewRow.imageSha256,proof.imageSha256);
    assert.equal(reviewRow.focusSha256,proof.focusSha256);
    assert.equal(reviewRow.contentSha256,proof.contentSha256);
    assert.equal(reviewRow.review.status,'confirmed');
    assert.equal(reviewRow.recordedReview.hashesMatch,true);
  }

  const additions=ua26CentralIntegration.addedReferences.filter(entry=>entry.itemId==='ua-quarrels-for-same');
  assert.equal(additions.length,2);
  assert.deepEqual(additions.map(entry=>entry.fieldPointer),['/references/1','/references/2']);
  assert.equal(current.references.length,3,'one original offer reference plus exactly two reviewed context references');
  assert.deepEqual(current.references[0].evidenceBindings[0].regionIds,[priceRecord.regionId]);
  for(const entry of additions){
    const index=Number(entry.fieldPointer.split('/').at(-1));
    const ref=current.references[index];
    assert.deepEqual(withoutGeneratedCitationTransport(ref),entry.reference,`${entry.fieldPointer}: exact reference from central receipt`);
    const binding=ref.evidenceBindings.find(candidate=>candidate.fieldPointer===entry.fieldPointer);
    assert.ok(binding,`${entry.fieldPointer}: generated binding exists`);
    assert.equal(binding.collection,'equipment');
    assert.equal(binding.itemId,'ua-quarrels-for-same');
    assert.equal(binding.catalog,ua26RowAppend.row.catalog.path.replace(/^dist\//,''));
    assert.deepEqual(binding.regionIds,entry.reference.verification.regions);
    assert.equal(ref.pages[0],index===1?26:27);
  }
  assert.deepEqual(citationOverrides.items['ua-quarrels-for-same'].references.map(ref=>ref.verification.regions),[
    ['ua-26-wd-row-1a39b6171f135317'],['ua26-notes-45-ua-quarrels-for-same']
  ]);
  assert.equal(withoutBatch5OfferEquipment(assembledData.equipment).length,189,'exact append normalization preserves the older positive two-offer checkpoint');
});

test('source package distinctions and unknown quarrel quantity survive extraction and field citation binding',()=>{
  const inventory=buildPriceSourceInventory();validatePriceSourceInventory(inventory);
  assert.equal(inventory.sourceRowBindings.total,187);
  assert.deepEqual(inventory.sourceRowBindings.counts,{'reviewed-source-row-binding-current':187});
  const sling=equipment.find(item=>item.id==='phb-sling-bullets-dozen'),bullets=equipment.find(item=>item.id==='phb-sling-bullet'),quarrels=equipment.find(item=>item.id==='ua-quarrels-for-same');
  assert.deepEqual([sling.price.amount,sling.price.currency,sling.price.unit],[15,'sp','dozen']);
  assert.deepEqual([bullets.price.amount,bullets.price.currency,bullets.price.unit],[10,'sp','score of sling bullets']);
  assert.deepEqual([quarrels.price.amount,quarrels.price.currency],[100,'gp']);
  assert.equal(Object.hasOwn(quarrels.price,'unit'),false);
  assert.match(quarrels.fields['Printed quantity'],/Not stated/);
  assert.match(quarrels.priceNote,/without assigning a package size or per-quarrel price/);
  for(const record of review.records){
    const claim=inventory.siteClaims.find(claim=>claim.itemId===record.itemId),binding=claim.evidenceBindings.find(binding=>binding.fieldPointer==='/price');
    assert.equal(binding.reviewStatus,'field-target-reviewed');assert.equal(binding.sourceValueStatus,'source-value-independently-confirmed');
    assert.deepEqual(binding.regionIds,[record.regionId]);assert.equal(binding.valueReview.evidenceSha256,fileHash(reviewPath));
    assert.deepEqual(claim.sourceRowIds,[record.sourceRowId]);
  }
  const altered=structuredClone(equipment);altered.find(item=>item.id==='ua-quarrels-for-same').price.unit='single bolt';
  assert.throws(()=>withoutBatch5OfferEquipment(altered),/price/);
});
