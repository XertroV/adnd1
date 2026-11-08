import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import test,{after} from 'node:test';
import {existsSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {attachEvidenceBindings, attachSourceVisualReviewMetadata, buildPriceSourceInventory, sourceVisualRegionHashes, validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';

const require=createRequire(import.meta.url);
const books=require('../dist/books.js');
const inventory=buildPriceSourceInventory();
const equipment=JSON.parse(readFileSync(new URL('../equipment.json',import.meta.url),'utf8')).equipment;
const classXpProofTempFiles=[
  `research/.price-source-inventory-xp-proof-test-${process.pid}.json`,
  `research/.price-source-inventory-xp-source-test-${process.pid}.json`,
  `research/.price-source-inventory-xp-peer-test-${process.pid}.json`,
];
after(()=>{for(const path of classXpProofTempFiles){const file=new URL(`../${path}`,import.meta.url);if(existsSync(file))rmSync(file);}});

const FROZEN_679='679b15d1c580172e54314829c1c3c86dc78b65f3';
function frozen679CatalogMap(){
  const paths=execFileSync('git',['ls-tree','-r','--name-only',FROZEN_679,'dist/scans'],{encoding:'utf8'}).trim().split('\n').filter(path=>path.endsWith('.json'));
  const requests=paths.map(path=>`${FROZEN_679}:${path}`).join('\n')+'\n';
  const batch=execFileSync('git',['cat-file','--batch'],{input:requests,maxBuffer:256*1024*1024});
  const catalogs=new Map();let offset=0;
  for(const path of paths){
    const headerEnd=batch.indexOf(0x0a,offset);assert.notEqual(headerEnd,-1,`${path}: Git batch header`);
    const [oid,type,sizeText]=batch.subarray(offset,headerEnd).toString('utf8').split(' ');
    const size=Number(sizeText),start=headerEnd+1,end=start+size;
    assert.equal(type,'blob',`${path}: frozen object type`);assert.ok(Number.isInteger(size)&&size>=0,`${path}: frozen object size`);
    catalogs.set(path.slice('dist/'.length),JSON.parse(batch.subarray(start,end).toString('utf8')));
    offset=end+1;
  }
  assert.equal(catalogs.size,paths.length);
  return catalogs;
}

test('source-first inventory covers every current equipment object without promoting estimates to printed prices',()=>{
  validatePriceSourceInventory(inventory);
  assert.equal(inventory.siteClaims.length,equipment.length);
  assert.equal(inventory.counts.siteEquipmentObjects,equipment.length);
  assert.equal(inventory.counts.sitePrintedPrices,equipment.filter(item=>item.price).length);
  assert.equal(inventory.counts.sitePriceGaps,equipment.filter(item=>item.price==null).length);
  assert.equal(inventory.counts.editorialEstimates,equipment.filter(item=>item.suggestedPrice).length);
  for(const claim of inventory.siteClaims.filter(value=>value.estimate)){
    assert.equal(claim.printedPrice,null,`${claim.itemId}: estimate must not be reported as a printed price`);
    assert.equal(claim.estimate.classification,'editorial-estimate');
    assert.ok(claim.estimate.value.rationale);
  }
  assert.ok(inventory.scope.includes('not an exhaustive inventory'));
  assert.equal(inventory.sourcePageDiscovery.exhaustive,false);
});

test('bounded source denominators keep table rows, cells, formulas, conditions and exclusions distinct',()=>{
  const get=id=>inventory.sourceInventories.find(source=>source.id===id);
  assert.deepEqual(get('phb35-equipment-purchase').denominator,[{kind:'source-table-row',count:80}]);
  assert.deepEqual(get('phb36-equipment-supplies').denominator,[{kind:'source-table-row',count:85}]);
  assert.deepEqual(get('ua26-equipment-supplies').denominator,[{kind:'source-table-row',count:23}]);
  assert.deepEqual(get('dmg28-standard-hireling-rates').denominator.slice(0,2),[
    {kind:'source-occupation-row',count:10},
    {kind:'printed-rate-cell',count:20},
  ]);
  assert.deepEqual(get('dmg29-expert-hireling-rates').denominator.slice(0,3),[
    {kind:'source-occupation-row',count:33},
    {kind:'numeric-source-row',count:25},
    {kind:'special-fee-source-row',count:8},
  ]);
  assert.equal(get('dmg-services-construction').rowCount,101);
  assert.equal(get('dmg-magic-item-sale-values').rowCount,373);
  assert.equal(get('dmg-magic-item-sale-values').formulas.length,2);
  assert.equal(get('dmg-magic-item-sale-values').qualifiers.length,11);
  assert.equal(get('dmg-post125-screening').rowCount,5);
  assert.equal(inventory.auxiliaryRecords.find(record=>record.file.endsWith('dmg-post125-survey.json'))?.checks?.length,0);
  assert.equal(inventory.sourcePageDiscovery.exhaustive,false);
  assert.ok(inventory.auxiliaryRecords.some(record=>record.file.endsWith('price-source-inventory-unmatched-semantic-review.json')&&record.status==='stale-reference'));
});

test('auxiliary book/page censuses preserve every page and discovery claim outside the 710-row denominator',()=>{
  assert.equal(inventory.counts.sourceRows,710);
  assert.equal(inventory.counts.sourcePageCensuses,3);
  assert.equal(inventory.counts.sourceCensusPdfPages,776);
  assert.equal(inventory.counts.sourceCensusClaims,180);
  assert.equal(inventory.counts.sourceCensusTableGroups,33);
  assert.deepEqual(inventory.sourcePageCensuses.map(census=>[census.id,census.pageCensus.pages.length]),[
    ['phb-dmg-other',370],['ua-other',130],['monster-books',276],
  ]);
  assert.equal(inventory.sourcePageCensuses.reduce((sum,census)=>sum+census.exclusions.length,0),36);
  assert.equal(inventory.sourcePageCensuses.reduce((sum,census)=>sum+census.unresolved.length,0),12);
  assert.deepEqual(inventory.sourcePageMappingAudit.boundedSourceRows,{total:710,assessable:710,consistent:710,inconsistent:0,unassessable:0,issues:[]});
  assert.deepEqual(inventory.sourcePageMappingAudit.pageCensusPages,{total:776,assessable:546,consistent:546,inconsistent:0,derivable:219,unassessable:11,byBook:{PHB:{total:130,observedPrintedPage:128,consistent:128,inconsistent:0,derivableNotVisuallyRead:0,unresolvedBoundaryOrUnverified:2},DMG:{total:240,observedPrintedPage:237,consistent:237,inconsistent:0,derivableNotVisuallyRead:0,unresolvedBoundaryOrUnverified:3},UA:{total:130,observedPrintedPage:128,consistent:128,inconsistent:0,derivableNotVisuallyRead:0,unresolvedBoundaryOrUnverified:2},MM:{total:114,observedPrintedPage:30,consistent:30,inconsistent:0,derivableNotVisuallyRead:82,unresolvedBoundaryOrUnverified:2},MM2:{total:162,observedPrintedPage:23,consistent:23,inconsistent:0,derivableNotVisuallyRead:137,unresolvedBoundaryOrUnverified:2}},issues:[]});
  const monsterCensus=inventory.sourcePageCensuses.find(census=>census.id==='monster-books');
  const derivedMonsterPage=monsterCensus.pageCensus.pages.find(page=>page.bookKey==='MM'&&page.pdfPage===3);
  assert.equal(derivedMonsterPage.printedPage,null,'source census preserves the null observed folio');
  assert.equal(derivedMonsterPage.derivedPrintedPage,2);
  assert.equal(derivedMonsterPage.printedPageMappingStatus,'mapping-derivable-not-visually-read');
  assert.equal(derivedMonsterPage.mappingBasis.kind,'inverse-books-js-page-map');
  assert.equal(monsterCensus.sourceArtifact.pageCensus.find(page=>page.bookKey==='MM'&&page.pdfPage===3).printedPage,null,'raw source artifact is not rewritten');
  const dmgCensus=inventory.sourcePageCensuses.find(census=>census.id==='phb-dmg-other');
  const dmgPdf175=dmgCensus.pageCensus.pages.find(page=>page.bookKey==='DMG'&&page.pdfPage===175);
  assert.equal(dmgPdf175.printedPage,174,'the missing DMG printed p. 175 must not be confused with PDF p. 175');
  assert.equal(dmgPdf175.printedPageMappingStatus,'mapping-consistent');
  assert.deepEqual(inventory.sourcePageMappingAudit.auxiliaryPageRecords,{total:6,assessable:6,consistent:6,inconsistent:0,unassessable:0,issues:[]});
  assert.equal(inventory.sourcePageCensuses[0].sourceArtifact.records.length,52);
  const stale=structuredClone(inventory);
  stale.sourcePageCensuses[0].pageCensus.pages.pop();
  assert.throws(()=>validatePriceSourceInventory(stale),/source-page census denominator does not match/);
});

test('DMG obsidian-vase page correction preserves the pinned failure and source receipt',()=>{
  const sourceFile='research/price-source-inventory-dmg-post125-survey.json';
  const baselineCommit='13783128ca5955ac707ed7ec6994d78d7c9a7cce';
  const baselineBytes=execFileSync('git',['show',`${baselineCommit}:${sourceFile}`]);
  const beforeSha=createHash('sha256').update(baselineBytes).digest('hex');
  assert.equal(beforeSha,'a4ab8806f4386adb2e6c377928b16200a22447f27e5c3d07d653cc8bc50f6756');
  const baseline=JSON.parse(baselineBytes);
  const originalRecord=baseline.unresolved[1];
  assert.equal(originalRecord.subject,'Obsidian vase in example trick described as worth 5,000 gp');
  assert.deepEqual([originalRecord.printedPage,originalRecord.pdfPage],[217,218]);

  const currentBytes=readFileSync(new URL('../research/price-source-inventory-dmg-post125-survey.json',import.meta.url));
  const current=JSON.parse(currentBytes);
  const currentRecord=current.unresolved.find(record=>record.subject===originalRecord.subject);
  assert.deepEqual([currentRecord.printedPage,currentRecord.pdfPage],[217,217]);
  assert.equal(books.pdfPage('DMG',currentRecord.printedPage),currentRecord.pdfPage);

  const corrections=JSON.parse(readFileSync(new URL('../research/price-source-corrections.json',import.meta.url),'utf8'));
  const receipt=corrections.records.find(record=>record.id==='dmg-obsidian-vase-page-mapping');
  assert.ok(receipt,'source-page correction receipt is retained');
  assert.equal(receipt.sourceFile,sourceFile);
  assert.equal(receipt.path,'/unresolved/1/pdfPage');
  assert.equal(receipt.beforeFileSha256,beforeSha);
  assert.equal(receipt.afterFileSha256,createHash('sha256').update(currentBytes).digest('hex'));
  assert.deepEqual(receipt.originalRecord,originalRecord,'the old page mapping is preserved verbatim in the receipt');
  assert.equal(receipt.sourcePdfSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');
  assert.deepEqual([receipt.printedPage,receipt.pdfPage,receipt.oldValue,receipt.newValue],[217,217,218,217]);
  assert.equal(receipt.sourcePageEvidence.printedFolio,'217');
  assert.equal(receipt.sourcePageEvidence.pdf217PrintedFolio,'217');
  assert.equal(receipt.sourcePageEvidence.pdf218PrintedFolio,'218');
  assert.equal(receipt.sourcePageEvidence.sourcePagePreviewSha256,'2b6609e5ae248d4e114e243f4bf7c4ea21bdf7599fdfbe084ec179296061c260');
  assert.deepEqual([receipt.sourcePageEvidence.previewRenderer,receipt.sourcePageEvidence.previewPdfPageIndexZeroBased,receipt.sourcePageEvidence.previewAlpha],['PyMuPDF',216,false]);
  assert.match(receipt.sourcePageEvidence.mappingBasis,/DMG printed pages 176–238 directly to PDF page N/);
});

test('optional equipment source-row overlay requires pinned identity and independent mapping review before exact current-price matching',()=>{
  const source=inventory.sourceInventories.find(entry=>entry.id==='phb35-equipment-purchase');
  const row=source.sourceRows[0];
  const sourceInventoryFile=source.sourceFiles[0];
  const sourceInventorySha256=inventory.integrity.sourceInventoryHashes[sourceInventoryFile];
  const independentReviewFile='tests/fixtures/equipment-source-row-binding-review.json';
  const independentReviewFileSha256='a'.repeat(64);
  const review={records:[{
    sourceInventoryFile,sourceInventorySha256,sourceRecordIndex:0,sourceObject:row.sourceObject,
    sourceSha256:row.source.sourceSha256,itemId:'phb-banded-mail',verdict:'confirmed',
  }]};
  const binding={sourceInventoryFile,sourceInventorySha256,sourceRecordIndex:0,sourceObject:row.sourceObject,
    sourceSha256:row.source.sourceSha256,itemId:'phb-banded-mail',independentReviewFile,
    independentReviewFileSha256,independentReviewRecordIndex:0};
  const build=overlay=>buildPriceSourceInventory({sourceRowBindings:{schemaVersion:1,bindings:[overlay]},sourceRowReviewFiles:new Map([[independentReviewFile,{document:review,sha256:independentReviewFileSha256}]])});
  const accepted=build(binding);
  const acceptedRow=accepted.sourceInventories.find(entry=>entry.id==='phb35-equipment-purchase').sourceRows[0];
  assert.equal(acceptedRow.sourceRowBinding.status,'reviewed-source-row-binding-current');
  assert.equal(acceptedRow.siteMatch.currentPriceCheck,'exact-amount-currency-page');
  assert.equal(accepted.sourceRowBindings.counts['reviewed-source-row-binding-current'],1);
  validatePriceSourceInventory(accepted);

  const stale=build({...binding,independentReviewFileSha256:'b'.repeat(64)});
  const staleRow=stale.sourceInventories.find(entry=>entry.id==='phb35-equipment-purchase').sourceRows[0];
  assert.equal(staleRow.sourceRowBinding.status,'stale-independent-review-hash');
  assert.equal(stale.sourceRowBindings.counts['stale-independent-review-hash'],1);

  const wrongIdentity={...binding,itemId:'phb-helmet-great'};
  const conflictingReview={records:[{...review.records[0],itemId:wrongIdentity.itemId}]};
  const conflict=buildPriceSourceInventory({
    equipment,data:null,manualBindings:{bindings:[]},
    sourceRowBindings:{schemaVersion:1,bindings:[wrongIdentity]},
    sourceRowReviewFiles:new Map([[independentReviewFile,{document:conflictingReview,sha256:independentReviewFileSha256}]]),
  });
  const conflictRow=conflict.sourceInventories.find(entry=>entry.id==='phb35-equipment-purchase').sourceRows[0];
  assert.equal(conflictRow.sourceRowBinding.status,'conflict-source-inventory-site-match');
});

test('pinned 189-item overlay baseline clears the identity-only conflicts without weakening price checks',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/equipment-source-row-overlay-prefx-189.json',import.meta.url),'utf8'));
  const overlayBytes=execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:research/equipment-source-row-bindings.json']);
  const rawEquipmentBytes=execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:equipment.json']);
  assert.equal(createHash('sha256').update(rawEquipmentBytes).digest('hex'),fixture.inputs.equipmentSha256);
  assert.equal(createHash('sha256').update(overlayBytes).digest('hex'),fixture.inputs.overlaySha256);
  for(const [file,expected] of Object.entries(fixture.inputs.independentReviewFileHashes)){
    assert.equal(createHash('sha256').update(readFileSync(new URL(`../${file}`,import.meta.url))).digest('hex'),expected,file);
  }
  assert.deepEqual([
    fixture.denominator.equipmentItems,fixture.denominator.printedPriceItems,
    fixture.denominator.reviewedCurrent,
    fixture.denominator.overlayBindings,fixture.denominator.falseConflict,
  ],[189,185,84,185,101]);

  const baselineData=JSON.parse(execFileSync('git',['show',`${FROZEN_679}:dist/data.json`],{maxBuffer:32*1024*1024}));
  const baselineBindings=JSON.parse(execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:research/field-evidence-bindings.json'],{maxBuffer:8*1024*1024}));
  const catalogs=frozen679CatalogMap();
  const current=buildPriceSourceInventory({equipment:baselineData.equipment,data:baselineData,catalogs,sourceRowBindings:JSON.parse(overlayBytes),manualBindings:baselineBindings});
  validatePriceSourceInventory(current,{equipment:baselineData.equipment,data:baselineData,catalogs});
  assert.equal(current.counts.siteEquipmentObjects,189);
  assert.equal(current.counts.sitePrintedPrices,185);
  assert.equal(current.sourceRowBindings.total,185);
  assert.deepEqual(current.integrity.sourceInventoryHashes,fixture.inputs.sourceInventoryHashes);
  assert.deepEqual(current.sourceRowBindings.counts,{'reviewed-source-row-binding-current':185});
  const currentRows=new Map();
  for(const source of current.sourceInventories) for(const row of source.sourceRows){
    currentRows.set(`${source.sourceFiles[0]}#${row.sourceRecordIndex}`,row);
  }
  const currentClaims=new Map(current.siteClaims.map(claim=>[claim.itemId,claim]));
  for(const baseline of fixture.falseConflictRows){
    const row=currentRows.get(`${baseline.sourceInventoryFile}#${baseline.sourceRecordIndex}`);
    assert.ok(row,`${baseline.sourceInventoryFile}[${baseline.sourceRecordIndex}] is still represented`);
    assert.equal(row.sourceRowBinding.status,'reviewed-source-row-binding-current',baseline.sourceRowId);
    assert.equal(row.sourceRowBinding.itemId,baseline.reviewedItemId);
    assert.equal(row.sourceObject,baseline.sourceObject);
    assert.equal(row.sourceValue.amount,baseline.sourceValue.amount);
    assert.equal(row.sourceValue.currency,baseline.sourceValue.currency);
    assert.equal(row.source.book,baseline.sourceBook);
    assert.equal(row.source.printedPage,baseline.sourcePrintedPage);
    const claim=currentClaims.get(baseline.reviewedItemId);
    assert.deepEqual(claim.printedPrice,baseline.reviewedCurrentPrice,baseline.reviewedItemId);
    assert.equal(String(row.sourceValue.amount),String(claim.printedPrice.amount),baseline.sourceRowId);
    assert.equal(row.sourceValue.currency,claim.printedPrice.currency,baseline.sourceRowId);
    assert.equal(row.source.book,claim.printedPrice.book,baseline.sourceRowId);
    assert.equal(row.source.printedPage,claim.printedPrice.pages?.[0],baseline.sourceRowId);
    assert.equal(row.siteMatch.legacyStatus,baseline.baselineLegacySiteMatch.status);
  }

  const changed=structuredClone(equipment);
  const target=changed.find(item=>item.id==='phb-helmet-great');
  assert.ok(target?.price);
  target.price.amount=Number(target.price.amount)+1;
  const mismatch=buildPriceSourceInventory({equipment:changed,manualBindings:{bindings:[]}});
  const helmetRow=mismatch.sourceInventories.flatMap(source=>source.sourceRows)
    .find(row=>row.sourceRowBinding?.itemId==='phb-helmet-great');
  assert.equal(helmetRow.sourceRowBinding.status,'source-site-price-conflict');
});

test('source claim geometry carries explicit coordinate spaces and nulls for unavailable catalog crops',()=>{
  for(const source of inventory.sourceInventories) for(const row of source.sourceRows){
    if(row.sourceRowCoordinates){
      assert.equal(row.sourceRowCoordinates.coordinateSpace,'rendered-source-page-normalized-top-left-xywh');
      assert.equal(row.sourceRowCoordinates.rect.length,4);
      assert.equal(typeof row.sourceRowCoordinates.status,'string');
      assert.ok(row.sourceRowCoordinates.rect.every(value=>Number.isFinite(value)&&value>=0&&value<=1));
      assert.ok(row.sourceRowCoordinates.rect[0]+row.sourceRowCoordinates.rect[2]<=1.001);
      assert.ok(row.sourceRowCoordinates.rect[1]+row.sourceRowCoordinates.rect[3]<=1.001);
    }
    assert.ok(row.cropCoordinates===null||row.cropCoordinates.every(value=>value.coordinateSpace));
    assert.ok(row.highlightCoordinates===null||row.highlightCoordinates.every(value=>value.coordinateSpace==='excerpt-image-normalized-top-left-xywh'));
  }
});

test('field target bindings preserve explicit multi-region evidence and resolve JSON Pointers',()=>{
  for(const binding of inventory.fieldEvidenceBindings){
    assert.ok(binding.fieldPointer===''||binding.fieldPointer.startsWith('/'));
    assert.ok(binding.book);
    assert.ok(Number.isInteger(binding.printedPage));
    assert.ok(Array.isArray(binding.regionIds));
    assert.ok(binding.reviewStatus);
    assert.ok(binding.contextStatus);
    if(binding.regionIds.length){
      assert.ok(binding.catalog);
      assert.equal(binding.regionEvidence.length,binding.regionIds.length);
      for(const region of binding.regionEvidence){
        assert.ok(region.sourceSha256);
        assert.ok(region.imageSha256);
        assert.ok(region.focusRectsSha256);
      }
    }
  }
  const aklysRate=inventory.fieldEvidenceBindings.find(binding=>binding.itemId==='ua-aklys-hurled'&&binding.fieldPointer==='/fields/Rate of fire (UA p.28)');
  assert.deepEqual(aklysRate.regionIds,['ua-aklys-hurled-ua28-thrown','ua28-missile-notes']);
});

test('validator rejects stale inventory files, broken field targets, missing regions and changed highlight hashes',()=>{
  const staleSource=structuredClone(inventory);
  staleSource.sourceInventories[0].integrity.sourceFileSha256='0'.repeat(64);
  assert.throws(()=>validatePriceSourceInventory(staleSource),/stale source inventory hash/);

  const badPointer=structuredClone(inventory);
  badPointer.fieldEvidenceBindings[0].fieldPointer='/no-such-field';
  assert.throws(()=>validatePriceSourceInventory(badPointer),/JSON Pointer does not resolve/);

  const regionBinding=inventory.fieldEvidenceBindings.find(binding=>binding.regionIds.length);
  assert.ok(regionBinding);
  const missingRegion=structuredClone(inventory);
  const bindingToChange=missingRegion.fieldEvidenceBindings.find(binding=>binding.itemId===regionBinding.itemId&&binding.fieldPointer===regionBinding.fieldPointer);
  bindingToChange.regionIds[0]='missing-region';
  for(const key of ['regionEvidence','cropCoordinates','highlightCoordinates']){
    bindingToChange[key][0].regionId='missing-region';
  }
  assert.throws(()=>validatePriceSourceInventory(missingRegion),/region missing-region missing/);

  const changedHash=structuredClone(inventory);
  const changedBinding=changedHash.fieldEvidenceBindings.find(binding=>binding.itemId===regionBinding.itemId&&binding.fieldPointer===regionBinding.fieldPointer);
  changedBinding.regionEvidence[0].focusRectsSha256='f'.repeat(64);
  assert.throws(()=>validatePriceSourceInventory(changedHash),/highlight geometry is stale/);
});

test('a non-equipment XP row carries its explicit pending region target end-to-end',()=>{
  const classRow={level:1,xp:0,book:'PHB',pages:[22],status:'OCR checked · visual review pending'};
  const data={rules:[],spells:[],classes:[{id:'fighter',name:'Fighter',xpRows:[classRow],sourceExcerpts:{catalog:'scans/verified/classes-fighter.json'}}],equipment:[],matrices:[]};
  const region={id:'fighter-xp-row',book:'PHB',printedPage:22,pdfPage:23,sha256:'b'.repeat(64),focusRects:[[0.1,0.2,0.3,0.1]],normalizedPageRect:{x:0.1,y:0.2,w:0.3,h:0.1},verificationScope:'source-excerpt'};
  const catalogs=new Map([['scans/verified/classes-fighter.json',{sources:{PHB:{sha256:'a'.repeat(64)}},regions:[region]}]]);
  const manualBindings={bindings:[{collection:'classes',itemId:'fighter',fieldPointer:'/xpRows/0',sourceObject:'Fighter level 1 XP threshold',sourceCategory:'class-xp-row',book:'PHB',printedPage:22,catalog:'scans/verified/classes-fighter.json',regionIds:[region.id],reviewStatus:'field-target-pending',contextStatus:'context-not-assessed',contextLimitations:['Pending independent field-location review.']}]};
  const inventory=buildPriceSourceInventory({equipment:[],data,manualBindings,catalogs});
  validatePriceSourceInventory(inventory,{equipment:[],data,catalogs});
  attachEvidenceBindings(data,inventory);
  assert.equal(data.classes[0].xpRows[0].evidenceBindings[0].fieldPointer,'/xpRows/0');
  assert.equal(data.classes[0].xpRows[0].evidenceBindings[0].reviewStatus,'field-target-pending');
  assert.deepEqual(data.classes[0].xpRows[0].evidenceBindings[0].regionIds,['fighter-xp-row']);
  const evidence=inventory.fieldEvidenceBindings[0].regionEvidence[0];
  assert.equal(evidence.contentSha256,sourceVisualRegionHashes(region).contentSha256);
  assert.deepEqual(inventory.fieldEvidenceBindings[0].cropCoordinates[0],{regionId:'fighter-xp-row',coordinateSpace:'rendered-source-page-normalized-top-left-xywh',format:'xywh',rect:[0.1,0.2,0.3,0.1]});
  assert.equal(inventory.counts.fieldEvidenceBindingsByCollection.classes,1);
  const lossyCrop=structuredClone(inventory);
  lossyCrop.fieldEvidenceBindings[0].cropCoordinates[0].rect=[0.1,0.2,null,null];
  assert.throws(()=>validatePriceSourceInventory(lossyCrop,{equipment:[],data,catalogs}),/exported crop geometry is missing, lossy, or stale/);
  region.summary='Changed catalog content after inventory build';
  assert.throws(()=>validatePriceSourceInventory(inventory,{equipment:[],data,catalogs}),/region content hash is stale/);
});

test('the default CLI inventory input supplies assembly-equivalent metadata for its singleton explainer',()=>{
  const current=buildPriceSourceInventory();
  const progressionBindings=current.fieldEvidenceBindings.filter(binding=>binding.collection==='progressionExplainer');
  assert.equal(progressionBindings.length,17);
  assert.ok(progressionBindings.every(binding=>binding.catalog==='scans/verified/progressionexplainer-progression-explainer.json'));
  assert.doesNotThrow(()=>validatePriceSourceInventory(current));
});

test('six pinned comparator bindings preserve their explicit nested source-object pointers',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/comparator-source-object-pointer-prefx.json',import.meta.url),'utf8'));
  assert.deepEqual(fixture.denominator,{comparatorBindings:6,missingSourceObjectPointer:6});
  assert.ok(fixture.records.every(record=>record.preFixSourceObjectPointer===null));
  const comparators=inventory.fieldEvidenceBindings.filter(binding=>binding.sourceCategory==='printed-price-comparator');
  assert.equal(comparators.length,fixture.records.length);
  for(const expected of fixture.records){
    const binding=comparators.find(candidate=>candidate.itemId===expected.itemId&&candidate.fieldPointer===expected.fieldPointer);
    assert.ok(binding,`${expected.itemId}${expected.fieldPointer}`);
    assert.equal(binding.sourceObjectPointer,expected.expectedSourceObjectPointer);
    assert.deepEqual(binding.sourceOwner,expected.sourceOwner);
    assert.equal(binding.book,expected.book);
    assert.equal(binding.printedPage,expected.printedPage);
  }
  const attached=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
  attachEvidenceBindings(attached,inventory);
  for(const expected of fixture.records){
    const parts=expected.fieldPointer.split('/').slice(1).map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
    const comparison=parts.reduce((value,key)=>value[key],attached.equipment.find(item=>item.id===expected.itemId));
    assert.deepEqual(comparison.evidenceBindings.map(binding=>binding.sourceObjectPointer),[expected.expectedSourceObjectPointer]);
    assert.deepEqual(comparison.evidenceBindings[0].sourceOwner,expected.sourceOwner);
  }
});

test('price and estimate snapshots stay semantic through attach and serialization, while value edits fail',()=>{
  const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
  const built=buildPriceSourceInventory({equipment:data.equipment,data});
  validatePriceSourceInventory(built,{equipment:data.equipment,data});
  const bandedClaim=built.siteClaims.find(claim=>claim.itemId==='phb-banded-mail');
  const boStickClaim=built.siteClaims.find(claim=>claim.itemId==='phb-bo-stick');
  const expectedPrice=structuredClone(bandedClaim.printedPrice);
  const expectedEstimate=structuredClone(boStickClaim.estimate.value);
  assert.equal(expectedPrice.amount,90);
  assert.ok(expectedEstimate.comparisons.length>0);

  attachEvidenceBindings(data,built);
  assert.deepEqual(bandedClaim.printedPrice,expectedPrice,'attaching generated bindings must not mutate the printed-price snapshot');
  assert.deepEqual(boStickClaim.estimate.value,expectedEstimate,'attaching generated bindings must not mutate estimate/comparator snapshots');
  const persisted=JSON.parse(JSON.stringify(built));
  validatePriceSourceInventory(persisted);
  validatePriceSourceInventory(persisted,{equipment:data.equipment,data});

  const changedClaim=structuredClone(persisted);
  changedClaim.siteClaims.find(claim=>claim.itemId==='phb-banded-mail').printedPrice.amount=1089;
  assert.throws(()=>validatePriceSourceInventory(changedClaim,{equipment:data.equipment,data}),/source claim drift/);

  const changedPriceData=structuredClone(data);
  changedPriceData.equipment.find(item=>item.id==='phb-banded-mail').price.amount=1089;
  assert.throws(()=>validatePriceSourceInventory(persisted,{equipment:changedPriceData.equipment,data:changedPriceData}),/price valueReview snapshot does not match current amount, currency, and unit/);

  const changedEstimateData=structuredClone(data);
  changedEstimateData.equipment.find(item=>item.id==='phb-bo-stick').suggestedPrice.comparisons[0].amount+=1;
  assert.throws(()=>validatePriceSourceInventory(persisted,{equipment:changedEstimateData.equipment,data:changedEstimateData}),/editorial estimate snapshot drift/);
});

test('structured citations get page-specific pending bindings across every exposed collection',()=>{
  const item=(id,extra={})=>({id,name:id,book:'PHB',pages:[20,21],sourceExcerpts:{catalog:`scans/verified/${id}.json`},...extra});
  const rules=[item('rule',{references:[{book:'PHB',pages:[20,21],label:'Rule note'}]})];
  const spells=[item('spell',{fields:{Range:'12 in'},fieldSources:{Range:{book:'PHB',pages:[20],status:'OCR checked'}}})];
  const classes=[item('class',{xpRows:[{level:1,xp:0,book:'PHB',pages:[20,21]}]})];
  const equipment=[];
  const matrices=[item('matrix',{rows:[{book:'PHB',pages:[21],label:'Attack matrix'}]})];
  const progressionExplainer=item('progression-explainer',{sections:[{id:'growth',references:[{book:'PHB',pages:[20,21],label:'Growth'}]}]});
  const data={rules,spells,classes,equipment,matrices,progressionExplainer};
  const catalogs=new Map(Object.values({rules,spells,classes,matrices}).flat().concat(progressionExplainer).map(record=>[record.sourceExcerpts.catalog,{sources:{PHB:{sha256:'a'.repeat(64)}},regions:[]}]));
  const inventory=buildPriceSourceInventory({equipment,data,manualBindings:{bindings:[]},catalogs});
  validatePriceSourceInventory(inventory,{equipment,data,catalogs});
  const byCollection=collection=>inventory.fieldEvidenceBindings.filter(binding=>binding.collection===collection);
  for(const collection of ['rules','spells','classes','matrices','progressionExplainer'])assert.ok(byCollection(collection).length>0,`${collection} gets structured citation bindings`);
  const rootRows=inventory.fieldEvidenceBindings.filter(binding=>binding.fieldPointer==='');
  assert.equal(rootRows.length,10);
  for(const binding of inventory.fieldEvidenceBindings){
    assert.deepEqual(binding.sourceOwner,{collection:binding.collection,itemId:binding.itemId});
    assert.equal(binding.reviewStatus,'field-target-pending');
    assert.deepEqual(binding.pages,[binding.printedPage]);
    assert.ok((binding.sourcePages||[]).includes(binding.printedPage));
  }
  const xp=byCollection('classes').find(binding=>binding.fieldPointer==='/xpRows/0');
  assert.deepEqual(xp.pages,[20]);
  assert.deepEqual(xp.sourcePages,[20,21]);
  const fieldRef=byCollection('spells').find(binding=>binding.fieldPointer==='/fields/Range');
  assert.equal(fieldRef.sourceObjectPointer,'/fieldSources/Range');
  attachEvidenceBindings(data,inventory);
  assert.equal(data.classes[0].xpRows[0].evidenceBindings.length,2);
  assert.equal(data.rules[0].evidenceBindings.length,2);
  assert.equal(data.spells[0].fieldSources.Range.evidenceBindings[0].fieldPointer,'/fields/Range');
});

test('unextracted field values retain their source object and explicit pending disposition',()=>{
  const sourceRef={book:'PHB',pages:[36],status:'OCR checked · visual verification pending'};
  const item={id:'missing-field-source',name:'Missing Field Fixture',book:'PHB',pages:[36],price:null,fields:{},fieldSources:{'Armor class without shield':sourceRef}};
  const data={rules:[],spells:[],classes:[],equipment:[item],matrices:[]};
  const inventory=buildPriceSourceInventory({equipment:data.equipment,data,manualBindings:{bindings:[]},catalogs:new Map()});
  validatePriceSourceInventory(inventory,{equipment:data.equipment,data,catalogs:new Map()});
  const binding=inventory.fieldEvidenceBindings.find(value=>value.itemId===item.id&&value.fieldPointer==='/fields/Armor class without shield');
  assert.equal(binding.sourceObjectPointer,'/fieldSources/Armor class without shield');
  assert.equal(binding.valuePathStatus,'value-path-missing');
  assert.equal(binding.reviewStatus,'field-target-pending');
  attachEvidenceBindings(data,inventory);
  assert.equal(sourceRef.evidenceBindings[0].fieldPointer,'/fields/Armor class without shield');
});

test('equipment field evidence attaches to its cited source object while preserving the semantic field pointer',()=>{
  const sourceRef={book:'PHB',pages:[42],status:'Source field citation pending'};
  const item={id:'equipment-field-fixture',name:'Fixture Armor',book:'PHB',pages:[42],price:null,fields:{Weight:'10 lb'},fieldSources:{Weight:sourceRef}};
  const data={rules:[],spells:[],classes:[],equipment:[item],matrices:[]};
  const inventory=buildPriceSourceInventory({equipment:data.equipment,data,manualBindings:{bindings:[]},catalogs:new Map()});
  validatePriceSourceInventory(inventory,{equipment:data.equipment,data,catalogs:new Map()});
  attachEvidenceBindings(data,inventory);
  assert.equal(sourceRef.evidenceBindings[0].fieldPointer,'/fields/Weight');
  assert.equal(sourceRef.evidenceBindings[0].sourceObjectPointer,'/fieldSources/Weight');
  assert.equal(data.equipment[0].fields.Weight,'10 lb');
  assert.ok(!Object.hasOwn(data.equipment[0].fields.Weight,'evidenceBindings'));
});

test('array source objects are rejected before JSON transport silently loses attached evidence',()=>{
  const data={equipment:[],spells:[{id:'source-array-fixture',exceptions:['A cited caution']}]};
  const synthetic={fieldEvidenceBindings:[{collection:'spells',itemId:'source-array-fixture',fieldPointer:'/exceptions/0',sourceObjectPointer:'/exceptions'}]};
  assert.throws(()=>attachEvidenceBindings(data,synthetic),/non-array source object/);
});

test('attaching rebuilt evidence bindings replaces stale catalog and owner transport idempotently',()=>{
  const selectedCatalog='scans/verified/equipment-current.json';
  const legacyCatalog='scans/dagger/equipment-legacy.json';
  const currentHash='c'.repeat(64),imageHash='d'.repeat(64);
  const priceRegion={id:'current-price-region',book:'PHB',printedPage:35,pdfPage:36,sha256:imageHash,focusRects:[[0.1,0.2,0.3,0.1]],normalizedPageRect:{x:0.1,y:0.2,w:0.3,h:0.1}};
  const rangeRegion={id:'current-range-region',book:'PHB',printedPage:39,pdfPage:40,sha256:'e'.repeat(64),focusRects:[[0.2,0.3,0.4,0.1]],normalizedPageRect:{x:0.2,y:0.3,w:0.4,h:0.1}};
  const oldRegion={id:'legacy-range-region',book:'PHB',printedPage:39,pdfPage:40,sha256:'f'.repeat(64),focusRects:[[0.5,0.3,0.4,0.1]],normalizedPageRect:{x:0.1,y:0.3,w:0.4,h:0.1}};
  const catalogs=new Map([
    [selectedCatalog,{sources:{PHB:{sha256:currentHash}},regions:[priceRegion,rangeRegion]}],
    [legacyCatalog,{sources:{PHB:{sha256:'a'.repeat(64)}},regions:[oldRegion]}],
  ]);
  const fieldRef={book:'PHB',pages:[39],status:'Source reference pending',verification:{regions:['current-range-region']},evidenceBindings:[{
    collection:'equipment',itemId:'stale-owner',fieldPointer:'/fields/Range scale (PHB p.39)',sourceObjectPointer:'/fieldSources/Range scale (PHB p.39)',
    sourceOwner:{collection:'equipment',itemId:'stale-owner'},catalog:legacyCatalog,regionIds:['legacy-range-region'],reviewStatus:'field-target-pending',
  }]};
  const item={id:'binding-idempotence-fixture',name:'Binding fixture',book:'PHB',pages:[35,39],
    sourceExcerpts:{catalog:selectedCatalog},scanVerification:{catalog:legacyCatalog},
    price:{amount:10,currency:'gp',book:'PHB',pages:[35],verification:{regions:['current-price-region']},evidenceBindings:[{
      collection:'equipment',itemId:'stale-owner',fieldPointer:'/price',sourceObjectPointer:'/price',
      sourceOwner:{collection:'equipment',itemId:'stale-owner'},catalog:legacyCatalog,regionIds:['legacy-range-region'],reviewStatus:'field-target-pending',
    }]},
    fields:{'Range scale (PHB p.39)':'6/12/18 in'},fieldSources:{'Range scale (PHB p.39)':fieldRef}};
  const data={rules:[],spells:[],classes:[],equipment:[item],matrices:[]};
  const manualBindings={bindings:[{collection:'equipment',itemId:item.id,fieldPointer:'/fields/Range scale (PHB p.39)',
    sourceObjectPointer:'/fieldSources/Range scale (PHB p.39)',sourceObject:'Range scale evidence',sourceCategory:'equipment-field',
    book:'PHB',printedPage:39,catalog:selectedCatalog,regionIds:['current-range-region'],reviewStatus:'field-target-pending',
    contextStatus:'context-not-assessed',contextLimitations:['Manual location review remains pending.']} ]};
  const manualSnapshot=structuredClone(manualBindings);
  const build=()=>buildPriceSourceInventory({equipment:data.equipment,data,manualBindings,catalogs});
  const first=build();
  validatePriceSourceInventory(first,{equipment:data.equipment,data,catalogs});
  attachEvidenceBindings(data,first);
  const firstPrice=structuredClone(item.price.evidenceBindings);
  const firstField=structuredClone(fieldRef.evidenceBindings);
  assert.equal(firstField.length,1);
  assert.equal(firstField[0].catalog,selectedCatalog);
  assert.deepEqual(firstField[0].sourceOwner,{collection:'equipment',itemId:item.id});
  assert.deepEqual(firstField[0].regionIds,['current-range-region']);
  assert.equal(firstPrice.length,1);
  assert.equal(firstPrice[0].catalog,selectedCatalog);
  assert.deepEqual(fieldRef.verification.regions,['current-range-region'],'source assertions remain intact');

  const second=build();
  validatePriceSourceInventory(second,{equipment:data.equipment,data,catalogs});
  attachEvidenceBindings(data,second);
  assert.deepEqual(item.price.evidenceBindings,firstPrice);
  assert.deepEqual(fieldRef.evidenceBindings,firstField);
  assert.deepEqual(manualBindings,manualSnapshot,'manual review ledger is not rewritten by transport attachment');
});

test('secondary field sources keep their origin object and per-page targets under one semantic field',()=>{
  const secondary={book:'UA',pages:[27,28],status:'Secondary source pending review'};
  const primary={book:'PHB',pages:[37],status:'Primary source pending review',additionalSources:[secondary]};
  const item={id:'multi-source-equipment',name:'Multi-source fixture',book:'PHB',pages:[37],price:null,fields:{Weight:'60 gp-weight'},fieldSources:{Weight:primary}};
  const data={rules:[],spells:[],classes:[],equipment:[item],matrices:[]};
  const inventory=buildPriceSourceInventory({equipment:data.equipment,data,manualBindings:{bindings:[]},catalogs:new Map()});
  validatePriceSourceInventory(inventory,{equipment:data.equipment,data,catalogs:new Map()});
  const nested=inventory.fieldEvidenceBindings.filter(binding=>binding.itemId===item.id&&binding.sourceObjectPointer.startsWith('/fieldSources/Weight/additionalSources/'));
  assert.equal(nested.length,2);
  assert.deepEqual(nested.map(binding=>binding.printedPage),[27,28]);
  assert.ok(nested.every(binding=>binding.fieldPointer==='/fields/Weight'&&binding.reviewStatus==='field-target-pending'));
  attachEvidenceBindings(data,inventory);
  assert.equal(secondary.evidenceBindings.length,2);
  assert.ok(secondary.evidenceBindings.every(binding=>binding.sourceObjectPointer==='/fieldSources/Weight/additionalSources/0'));
});

test('bindings resolve only through the viewer-selected catalog, including comparator source owners',()=>{
  const region=(sha,focus=[[0.2,0.3,0.2,0.1]])=>({id:'same-region-id',book:'PHB',printedPage:35,pdfPage:36,sha256:sha,focusRects:focus,normalizedPageRect:{x:0.1,y:0.2,w:0.5,h:0.3}});
  const selectedRegion=region('a'.repeat(64)), legacyRegion=region('b'.repeat(64),[[0.6,0.3,0.2,0.1]]);
  const selectedPath='scans/verified/equipment-selected.json', legacyPath='scans/verified/equipment-legacy.json';
  const catalogs=new Map([
    [selectedPath,{sources:{PHB:{sha256:'c'.repeat(64)}},regions:[selectedRegion]}],
    [legacyPath,{sources:{PHB:{sha256:'d'.repeat(64)}},regions:[legacyRegion]}],
  ]);
  const comparator={id:'comparator-item',name:'Comparator',book:'PHB',pages:[35],price:{amount:2,currency:'gp',book:'PHB',pages:[35],verification:{catalog:legacyPath,regions:[selectedRegion.id]}},sourceExcerpts:{catalog:selectedPath},scanVerification:{catalog:legacyPath}};
  const owner={id:'estimate-owner',name:'Estimate owner',book:'PHB',pages:[35],price:null,sourceExcerpts:{catalog:selectedPath},suggestedPrice:{amount:4,currency:'gp',comparisons:[{itemId:'comparator-item',label:'Comparator',book:'PHB',pages:[35]}]}};
  const data={rules:[],spells:[],classes:[],equipment:[owner,comparator],matrices:[]};
  const inventory=buildPriceSourceInventory({equipment:data.equipment,data,manualBindings:{bindings:[]},catalogs});
  validatePriceSourceInventory(inventory,{equipment:data.equipment,data,catalogs});
  const direct=inventory.fieldEvidenceBindings.find(binding=>binding.itemId==='comparator-item'&&binding.fieldPointer==='/price');
  assert.equal(direct.catalog,selectedPath);
  assert.equal(direct.regionEvidence[0].imageSha256,selectedRegion.sha256);
  assert.deepEqual(direct.cropCoordinates[0].rect,[0.1,0.2,0.5,0.3]);
  const estimate=inventory.fieldEvidenceBindings.find(binding=>binding.itemId==='estimate-owner'&&binding.fieldPointer==='/suggestedPrice/comparisons/0');
  assert.equal(estimate.catalog,selectedPath);
  assert.deepEqual(estimate.sourceOwner,{collection:'equipment',itemId:'comparator-item'});
  assert.deepEqual(estimate.regionIds,[selectedRegion.id]);
  assert.deepEqual(estimate.cropCoordinates[0].rect,[0.1,0.2,0.5,0.3]);

  const wrongReviewed={bindings:[{collection:'equipment',itemId:'comparator-item',fieldPointer:'/price',catalog:legacyPath,regionIds:[selectedRegion.id],reviewStatus:'field-target-reviewed'}]};
  assert.throws(()=>buildPriceSourceInventory({equipment:data.equipment,data,manualBindings:wrongReviewed,catalogs}),/not the viewer-selected catalog/);

  const detachedOwner=structuredClone(inventory);
  detachedOwner.fieldEvidenceBindings.find(binding=>binding.fieldPointer==='/suggestedPrice/comparisons/0').sourceOwner.itemId='estimate-owner';
  assert.throws(()=>validatePriceSourceInventory(detachedOwner,{equipment:data.equipment,data,catalogs}),/source owner does not match the cited comparator item/);
});

test('manual target review requires a persisted evidence-file digest and current source, image, focus and content hashes',()=>{
  const classRow={level:1,xp:0,book:'PHB',pages:[22],track:'main'};
  const catalogPath='scans/verified/classes-fighter.json';
  const data={rules:[],spells:[],classes:[{id:'fighter',name:'Fighter',xpRows:[classRow],sourceExcerpts:{catalog:catalogPath}}],equipment:[],matrices:[]};
  const region={id:'fighter-xp-row',book:'PHB',printedPage:22,pdfPage:23,sha256:'b'.repeat(64),focusRects:[[0.1,0.2,0.3,0.1]],normalizedPageRect:{x:0.1,y:0.2,width:0.3,height:0.1},verificationScope:'source-excerpt',role:'row',sourceTableId:'fighter-xp-test-table',sourceRowId:'fighter-xp-test-row-01'};
  const catalog={sources:{PHB:{sha256:'a'.repeat(64),hashStatus:'computed-local'}},regions:[region]};
  const catalogs=new Map([[catalogPath,catalog]]);
  const hashes=sourceVisualRegionHashes(region);
  const evidenceFile=classXpProofTempFiles[0],sourceEvidenceFile=classXpProofTempFiles[1],peerEvidenceFile=classXpProofTempFiles[2];
  const identity={kind:'class-xp-row',collection:'classes',itemId:'fighter',fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0',value:{level:1,xp:0,book:'PHB',pages:[22],track:'main'}};
  const regionEvidence=[{regionId:region.id,sourceSha256:catalog.sources.PHB.sha256,imageSha256:region.sha256,...hashes}];
  const sourceRecord=Buffer.from(`${JSON.stringify({rows:[{fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0'}]},null,2)}\n`);
  const peerRecord=Buffer.from(`${JSON.stringify({rows:[{fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0'}]},null,2)}\n`);
  writeFileSync(new URL(`../${sourceEvidenceFile}`,import.meta.url),sourceRecord);
  writeFileSync(new URL(`../${peerEvidenceFile}`,import.meta.url),peerRecord);
  const proofBytes=Buffer.from(`${JSON.stringify({schemaVersion:1,artifactType:'class-xp-row-target-review',reviewedTargets:[{expectedTargetIdentity:identity,status:'confirmed',independent:true,sourceEvidence:[{path:sourceEvidenceFile,sha256:createHash('sha256').update(sourceRecord).digest('hex'),pointer:'/rows/0'},{path:peerEvidenceFile,sha256:createHash('sha256').update(peerRecord).digest('hex'),pointer:'/rows/0'}],regionEvidence,sourceValueGrade:'NOT PROMOTED'}]},null,2)}\n`);
  writeFileSync(new URL(`../${evidenceFile}`,import.meta.url),proofBytes);
  const evidenceSha256=createHash('sha256').update(proofBytes).digest('hex');
  const manualBindings={bindings:[{collection:'classes',itemId:'fighter',fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0',sourceOwner:{collection:'classes',itemId:'fighter'},sourceObject:'Fighter level 1 XP threshold',sourceCategory:'class-xp-row',book:'PHB',printedPage:22,catalog:catalogPath,regionIds:[region.id],requiresRowEvidence:true,reviewStatus:'field-target-reviewed',contextStatus:'context-not-assessed',targetReview:{status:'confirmed',independent:true,evidence:evidenceFile,evidenceSha256,expectedTargetIdentity:identity},expectedRegionEvidence:regionEvidence}]};
  const inventory=buildPriceSourceInventory({equipment:[],data,manualBindings,catalogs});
  validatePriceSourceInventory(inventory,{equipment:[],data,catalogs});
  const wrongPdfPage=structuredClone(inventory);
  wrongPdfPage.fieldEvidenceBindings[0].pdfPage=24;
  assert.throws(()=>validatePriceSourceInventory(wrongPdfPage,{equipment:[],data,catalogs}),/does not match cited source page/);
  const assertInvalid=mutate=>{const changed=structuredClone(inventory);mutate(changed.fieldEvidenceBindings[0]);assert.throws(()=>validatePriceSourceInventory(changed,{equipment:[],data,catalogs}));};
  assertInvalid(binding=>{delete binding.targetReview.evidenceSha256;});
  assertInvalid(binding=>{binding.targetReview.evidenceSha256='0'.repeat(64);});
  assertInvalid(binding=>{binding.expectedRegionEvidence[0].sourceSha256='0'.repeat(64);});
  assertInvalid(binding=>{binding.expectedRegionEvidence[0].imageSha256='0'.repeat(64);});
  assertInvalid(binding=>{binding.expectedRegionEvidence[0].focusSha256='0'.repeat(64);});
  assertInvalid(binding=>{binding.expectedRegionEvidence[0].contentSha256='0'.repeat(64);});
});

test('independent printed-price value review is hash-bound to an exact amount currency and unit snapshot',()=>{
  const catalogPath='scans/verified/equipment-price-review-fixture.json';
  const region={id:'price-row',book:'PHB',printedPage:35,pdfPage:36,sha256:'b'.repeat(64),focusRects:[[0.1,0.2,0.4,0.1]],normalizedPageRect:{x:0.1,y:0.2,width:0.4,height:0.1}};
  const catalog={sources:{PHB:{sha256:'a'.repeat(64),hashStatus:'computed-local'}},regions:[region]};
  const catalogs=new Map([[catalogPath,catalog]]);
  const item={id:'reviewed-price-fixture',name:'Reviewed price fixture',book:'PHB',pages:[35],sourceExcerpts:{catalog:catalogPath},
    price:{amount:10,currency:'gp',book:'PHB',pages:[35],verification:{regions:[region.id]}}};
  const data={rules:[],spells:[],classes:[],equipment:[item],matrices:[]};
  const locationEvidence='research/source-visual-reviews.json';
  const locationHash=createHash('sha256').update(readFileSync(new URL(`../${locationEvidence}`,import.meta.url))).digest('hex');
  const valueEvidence='research/field-evidence-bindings.json';
  const valueHash=createHash('sha256').update(readFileSync(new URL(`../${valueEvidence}`,import.meta.url))).digest('hex');
  const manualBindings={bindings:[{
    collection:'equipment',itemId:item.id,fieldPointer:'/price',sourceObjectPointer:'/price',sourceObject:'Printed purchase price',sourceCategory:'equipment-purchase-price',
    book:'PHB',printedPage:35,pdfPage:36,catalog:catalogPath,regionIds:[region.id],reviewStatus:'field-target-reviewed',contextStatus:'context-not-assessed',
    targetReview:{status:'confirmed',independent:true,evidence:locationEvidence,evidenceSha256:locationHash},
    expectedRegionEvidence:[{regionId:region.id,sourceSha256:catalog.sources.PHB.sha256,imageSha256:region.sha256,...sourceVisualRegionHashes(region)}],
    sourceValueStatus:'source-value-independently-confirmed',
    valueReview:{scope:'equipment-printed-price',independent:true,expectedValue:{amount:10,currency:'gp',unit:null},evidence:valueEvidence,evidenceSha256:valueHash},
  }]};
  const inventory=buildPriceSourceInventory({equipment:data.equipment,data,manualBindings,catalogs});
  validatePriceSourceInventory(inventory,{equipment:data.equipment,data,catalogs});
  const binding=inventory.fieldEvidenceBindings.find(entry=>entry.itemId===item.id&&entry.fieldPointer==='/price');
  assert.equal(binding.sourceValueStatus,'source-value-independently-confirmed');
  assert.deepEqual(binding.valueReview.expectedValue,{amount:10,currency:'gp',unit:null});
  assert.equal(binding.regionEvidence[0].contentSha256,sourceVisualRegionHashes(region).contentSha256);

  item.price.amount=11;
  assert.throws(()=>validatePriceSourceInventory(inventory,{equipment:data.equipment,data,catalogs}),/valueReview snapshot does not match current amount, currency, and unit/);
  assert.throws(()=>buildPriceSourceInventory({equipment:data.equipment,data,manualBindings,catalogs}),/valueReview snapshot does not match current amount, currency, and unit/);
  assert.equal(sourceVisualRegionHashes(region).contentSha256,binding.expectedRegionEvidence[0].contentSha256,'the reviewed target hashes remain current while the value snapshot becomes stale');
});

test('whole-image highlight exceptions are exposed only after exact independent hashes and retain explicit scope',()=>{
  const wholeSpell={id:'whole-spell',book:'PHB',printedPage:45,pdfPage:46,sha256:'b'.repeat(64),focusRects:[[0,0,1,1]],verificationScope:'source-excerpt'};
  const confirmedSentinel={id:'confirmed-sentinel',book:'PHB',printedPage:46,pdfPage:47,sha256:'d'.repeat(64),focusRects:[[0,0,1,1]],verificationScope:'source-excerpt'};
  const catalog={sources:{PHB:{sha256:'a'.repeat(64),hashStatus:'computed-local'}},regions:[wholeSpell,confirmedSentinel]};
  const saved=(region,status,extra={})=>({collection:'spells',itemId:'example',binding:'sourceExcerpts',regionId:region.id,sourceSha256:catalog.sources.PHB.sha256,imageSha256:region.sha256,...sourceVisualRegionHashes(region),assessments:{highlight:{status,independent:true,evidence:'independent fixture review',...extra}}});
  const data={spells:[{id:'example',sourceExcerpts:{catalog:'scans/verified/example.json'}}],rules:[],classes:[],equipment:[],matrices:[]};
  attachSourceVisualReviewMetadata(data,{catalogs:new Map([['scans/verified/example.json',catalog]]),ledger:{reviews:[saved(wholeSpell,'exception',{scope:'whole-spell'}),saved(confirmedSentinel,'confirmed',{scope:'whole-spell'})]}});
  const reviews=new Map(data.spells[0].sourceExcerpts.regionReviews.map(review=>[review.regionId,review]));
  assert.equal(reviews.get(wholeSpell.id).status,'current-reviewed');
  assert.equal(reviews.get(wholeSpell.id).review.status,'exception');
  assert.equal(reviews.get(wholeSpell.id).review.scope,'whole-spell');
  assert.equal(reviews.get(confirmedSentinel.id).status,'unreviewed-full-image-sentinel');
  assert.equal(reviews.get(confirmedSentinel.id).review,null);
});
