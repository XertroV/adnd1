import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildSourceTableCitationCoverage,citationPages,loadSourceTableCitationCoverage} from '../tools/source-table-citation-coverage.mjs';

const sourceSha256='e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4';
const source={book:'UA',printedPage:28,pdfPage:29,sourceSha256};
function manifest(targets){return {schemaVersion:1,tables:[{id:'ua28-hurled-test',...source,rowCount:1,rows:[{id:'ua28-harpoon-test',label:'Harpoon',targets}]}]};}
const mapping={collection:'equipment',itemId:'ua-harpoon',applicability:'confirmed',evidence:'Explicit Harpoon source-row/item mapping; table semantics require separate review.'};

test('actual pre-repair Harpoon is detected even though its existing UA26 price citation passes',()=>{
  const bytes=execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:equipment.json']);
  const equipment=JSON.parse(bytes).equipment;
  const harpoon=equipment.find(item=>item.id==='ua-harpoon');
  assert.ok(harpoon);assert.ok(citationPages(harpoon).has('UA:26'));
  const before=buildSourceTableCitationCoverage({data:{equipment},priceInventory:{sourceInventories:[]},contracts:manifest([mapping])});
  assert.equal(before.rows[0].targets[0].status,'confirmed-missing-reference');
  const after=structuredClone(harpoon);after.references=[{book:'UA',pages:[28]}];after.sourceExcerpts={catalog:'harpoon.json'};
  const catalogs=new Map([['harpoon.json',{sources:{UA:{sha256:sourceSha256}},regions:[{id:'ua28-harpoon',...source,sha256:'a'.repeat(64)}]}]]);
  const checked=buildSourceTableCitationCoverage({data:{equipment:[after]},priceInventory:{sourceInventories:[]},contracts:manifest([mapping]),catalogs});
  assert.equal(checked.rows[0].targets[0].status,'reference-and-source-page-excerpt-present');
  assert.equal(checked.rows[0].targets[0].semanticTableContext,'not-proved-by-page-presence');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'4897dfbd39d4f438b566091cf815ce3cd7d8fcbc0615f28581a072c8f73a7e28');
});

test('name aliases never create automatic omissions and explicit variants/inapplicability remain separate',()=>{
  const data={equipment:[{id:'ua-harpoon',name:'Harpoon',aliases:['Whaling spear'],book:'UA',pages:[26]}]};
  const contracts=manifest([]);contracts.tables[0].rows[0].label='Whaling spear';
  const suggested=buildSourceTableCitationCoverage({data,priceInventory:{sourceInventories:[]},contracts});
  assert.deepEqual(suggested.rows[0].nameCandidates,['equipment:ua-harpoon']);assert.equal(suggested.rows[0].targets.length,0);
  contracts.tables[0].rows[0].targets=[{...mapping,applicability:'inapplicable',evidence:'Different variant explicitly reviewed.'},{...mapping,itemId:'unresolved-variant',applicability:'uncertain'}];
  const scoped=buildSourceTableCitationCoverage({data,priceInventory:{sourceInventories:[]},contracts});
  assert.deepEqual(scoped.rows[0].targets.map(target=>target.status),['explicitly-inapplicable','mapping-review-required']);
});

test('field citations count but generated evidence metadata cannot manufacture a reference',()=>{
  assert.deepEqual([...citationPages({book:'UA',pages:[28],price:{book:'UA',pages:[26]},references:[{book:'PHB',page:38}],evidenceBindings:[{book:'DMG',printedPage:175}]})].sort(),['PHB:38','UA:26','UA:28']);
});

test('a different excerpt on the same page cannot satisfy an explicit table-region obligation',()=>{
  const data={equipment:[{id:'ua-harpoon',book:'UA',pages:[28],sourceExcerpts:{catalog:'harpoon.json'}}]};
  const contracts=manifest([{...mapping,requiredRegionIds:['harpoon-row']}]);
  const catalogs=new Map([['harpoon.json',{sources:{UA:{sha256:sourceSha256}},regions:[{id:'unrelated-spell-list',...source}]}]]);
  const before=buildSourceTableCitationCoverage({data,priceInventory:{},contracts,catalogs});
  assert.equal(before.validation.valid,false);
  assert.equal(before.rows[0].targets[0].status,'required-table-region-absent');
  catalogs.get('harpoon.json').regions.push({id:'harpoon-row',...source});
  const after=buildSourceTableCitationCoverage({data,priceInventory:{},contracts,catalogs});
  assert.equal(after.validation.valid,true);
  assert.equal(after.rows[0].targets[0].status,'reference-and-source-page-excerpt-present');
});

test('page identity, absent excerpts, unreviewed rows and unknown discovery denominators remain distinct',()=>{
  const data={equipment:[{id:'ua-harpoon',book:'UA',pages:[28],sourceExcerpts:{catalog:'harpoon.json'}}]};
  const catalogs=new Map([['harpoon.json',{sources:{UA:{sha256:'b'.repeat(64)}},regions:[{id:'wrong-edition',...source}]}]]);
  const priceInventory={sourceInventories:[{id:'unmapped-table',sourceRows:[{id:'unmapped',sourceObject:'Harpoon',source}]}],sourcePageCensuses:[{id:'census',sourceArtifact:{tableGroups:[{title:'Unknown rows',rowTranscriptionComplete:false}]}}]};
  const report=buildSourceTableCitationCoverage({data,priceInventory,contracts:manifest([mapping]),catalogs});
  assert.equal(report.rows[0].status,'row-item-mapping-unreviewed');
  assert.equal(report.rows[1].targets[0].status,'source-identity-review-required');
  assert.equal(report.validation.valid,false);
  assert.equal(report.counts.unknownDiscoveryRowDenominators,1);
  catalogs.clear();
  const missing=buildSourceTableCitationCoverage({data,priceInventory,contracts:manifest([mapping]),catalogs});
  assert.equal(missing.rows[1].targets[0].status,'reference-without-source-excerpt');assert.equal(missing.validation.valid,false);
  assert.throws(()=>buildSourceTableCitationCoverage({data,priceInventory,contracts:manifest([{...mapping,evidence:''}])}),/lacks evidence/);
});

test('production loading cannot silently discard the declared table-row contract',()=>{
  const repoRoot=mkdtempSync(join(tmpdir(),'adnd-table-contract-'));
  try{
    mkdirSync(join(repoRoot,'dist'));mkdirSync(join(repoRoot,'research'));
    writeFileSync(join(repoRoot,'dist/data.json'),JSON.stringify({equipment:[]}));
    writeFileSync(join(repoRoot,'research/price-source-inventory.json'),JSON.stringify({sourceInventories:[]}));
    assert.throws(()=>loadSourceTableCitationCoverage({repoRoot}),/source-table-citation-contracts/);
    const historical=loadSourceTableCitationCoverage({repoRoot,contractsPath:null});
    assert.equal(historical.counts.explicitContractRows,0);
    assert.equal(historical.contractInputStatus,'explicitly-unavailable-historical-input');
  }finally{rmSync(repoRoot,{recursive:true,force:true});}
});

test('the production loader retains the source-first UA row denominator and Harpoon contract',()=>{
  const current=loadSourceTableCitationCoverage();
  assert.ok(current.counts.explicitContractRows>=84);
  assert.equal(current.rows.filter(row=>row.tableId==='ua-p27-weapon-table').length,60);
  assert.equal(current.rows.filter(row=>row.tableId==='ua-p28-weapon-table').length,24);
  const harpoon=current.rows.find(row=>row.id==='ua-p28-weapon-row-harpoon');
  assert.ok(harpoon.targets.some(target=>target.owner==='equipment:ua-harpoon'&&target.applicability==='confirmed'));
  assert.equal(current.contractInputStatus,'loaded');
  assert.equal(current.counts.discoveryGroupsWithTypedOutput,33);
  assert.equal(current.counts.baselineUnknownDiscoveryRowDenominators,33);
  assert.equal(current.counts.unknownDiscoveryRowDenominators,6);
  assert.ok(current.discoveryGroups.every(group=>group.itemCitationMappingStatus==='not-assessed-by-typed-source-join'));
  assert.equal(current.discoverySupplementSummary.sourceReports.ua.structuredCells.xpReferenceCells,566);
});

test('malformed contracts and deleted source rows cannot produce a false complete denominator',()=>{
  const data={equipment:[]},priceInventory={sourceInventories:[]};
  assert.throws(()=>buildSourceTableCitationCoverage({data,priceInventory,contracts:{schemaVersion:1}}),/contract schema/);
  const missing=manifest([]);missing.tables[0].rows=[];
  assert.throws(()=>buildSourceTableCitationCoverage({data,priceInventory,contracts:missing}),/row denominator/);
  assert.throws(()=>buildSourceTableCitationCoverage({data:{equipment:[{id:'ua-harpoon'}]},priceInventory,contracts:manifest([{...mapping,requiredEvidenceRole:'row'}])}),/explicit region IDs/);
});

test('actual 679 Spear hand-held evidence cannot satisfy a same-page missile-table contract',()=>{
  const data=JSON.parse(execFileSync('git',['show','679b15d:dist/data.json'],{maxBuffer:32*1024*1024}));
  const item=data.equipment.find(i=>i.id==='phb-spear'),path=item.sourceExcerpts.catalog;
  const catalog=JSON.parse(execFileSync('git',['show','679b15d:dist/'+path],{maxBuffer:4*1024*1024}));
  const wrong=catalog.regions.find(r=>r.id==='phb-38-81fb44d169458fe2');
  assert.equal(wrong.sha256,'81fb44d169458fe206d33bfeba35ad0deede44f72ab6d0ff1f31d1323d6978ca');
  const contracts={schemaVersion:1,tables:[{id:'phb38-missile',book:'PHB',printedPage:38,sourceSha256:catalog.sources.PHB.sha256,rowCount:1,rows:[{id:'spear-missile',label:'Spear',targets:[{collection:'equipment',itemId:'phb-spear',applicability:'confirmed',evidence:'Independent source-table identity review',requiredRegionIds:[wrong.id],requiredTableImageSha256:'a3662691c2417e557f8530c84cda1c77df67d7140fd934aa4de7a013bdafad32'}]}]}]};
  const report=buildSourceTableCitationCoverage({data:{equipment:[item]},priceInventory:{sourceInventories:[]},contracts,catalogs:new Map([[path,catalog]])});
  assert.equal(report.rows[0].targets[0].status,'required-table-image-mismatch');
  assert.equal(report.validation.valid,false);
});

test('actual Sling Bullet header cannot satisfy a row contract even with the correct table image',()=>{
 const data=JSON.parse(execFileSync('git',['show','679b15d:dist/data.json'],{maxBuffer:32*1024*1024})),item=data.equipment.find(i=>i.id==='phb-sling-bullet'),path=item.sourceExcerpts.catalog;
 const catalog=JSON.parse(readFileSync(new URL('../dist/'+path,import.meta.url))),header=catalog.regions.find(r=>r.id==='ua-28-73a3e8aed178e52a');
 const contracts={schemaVersion:1,tables:[{id:'ua28-row-role-calibration',...source,rowCount:1,rows:[{id:'sling-bullet-row',label:'Sling (bullet)',targets:[{collection:'equipment',itemId:item.id,applicability:'confirmed',evidence:'Exact source row association; heading is context only',requiredRegionIds:[header.id],requiredTableImageSha256:header.sha256,requiredEvidenceRole:'row'}]}]}]};
 const report=buildSourceTableCitationCoverage({data:{equipment:[item]},priceInventory:{sourceInventories:[]},contracts,catalogs:new Map([[path,catalog]])});
 assert.equal(report.rows[0].targets[0].status,'required-table-row-role-mismatch');assert.equal(report.validation.valid,false);
});

test('preferred citation catalog controls the row contract while superseded catalog conflicts remain inventoried',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/table-catalog-precedence-before.json',import.meta.url)));
 assert.equal(fixture.rowDenominator,976);assert.equal(fixture.cases.length,26);
 const contract=manifest([{...mapping,requiredRegionIds:['same-id'],requiredTableImageSha256:'a'.repeat(64),requiredEvidenceRole:'row'}]);
 const item={id:'ua-harpoon',book:'UA',pages:[28],sourceExcerpts:{catalog:'preferred.json'},scanVerification:{catalog:'older.json'}};
 const region=sha256=>({id:'same-id',...source,sha256,role:'row'});
 const catalogs=new Map([['preferred.json',{sources:{UA:{sha256:sourceSha256}},regions:[region('a'.repeat(64))]}],['older.json',{sources:{UA:{sha256:sourceSha256}},regions:[region('b'.repeat(64))]}]]);
 const report=buildSourceTableCitationCoverage({data:{equipment:[item]},priceInventory:{},contracts:contract,catalogs});
 assert.equal(report.validation.valid,true);
 const target=report.rows[0].targets[0];assert.equal(target.sourcePageExcerpts.length,2);
 assert.equal(target.supersededCatalogConflicts.length,1);assert.equal(target.supersededCatalogConflicts[0].catalog,'older.json');
 catalogs.get('preferred.json').regions=[region('b'.repeat(64))];catalogs.get('older.json').regions=[region('a'.repeat(64))];
 const wrongPreferred=buildSourceTableCitationCoverage({data:{equipment:[item]},priceInventory:{},contracts:contract,catalogs});
 assert.equal(wrongPreferred.validation.valid,false);assert.equal(wrongPreferred.rows[0].targets[0].status,'required-table-image-mismatch');
});

test('production reconciliation rejects viewer-ineligible state, owner path, and region count',()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/source-table-viewer-eligibility-before.json',import.meta.url)));
 const build=item=>buildSourceTableCitationCoverage({data:{equipment:[item]},priceInventory:{},contracts:f.contracts,catalogs:new Map([[item.sourceExcerpts.catalog,f.baseline.catalog]]),strictViewerMetadata:true});
 assert.equal(build(f.baseline.item).validation.valid,true);
 for(const c of f.negativeCases){assert.equal(c.detectorValid,true,'preserved pre-fix false pass');const r=build(c.item);assert.equal(r.validation.valid,false,c.kind);assert.equal(r.rows[0].targets[0].status,'viewer-catalog-metadata-invalid');}
});
