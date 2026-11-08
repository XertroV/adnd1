import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {validScanCatalogPath,validateScanCatalog} from '../tools/scan-catalog.mjs';
const require=createRequire(import.meta.url),books=require('../dist/books.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const verification={state:'source-excerpt-checked',catalog:'scans/verified/test-item.json',regionCount:1};
const item={id:'test-item',scanVerification:verification};
const catalog={schemaVersion:1,itemId:'test-item',scope:'Passage only',sources:{DMG:{sha256:'a'.repeat(64),hashStatus:'computed-local'}},regions:[{id:'test-region',book:'DMG',printedPage:176,pdfPage:176,image:'dmg176-test.png',width:10,height:10,sha256:'b'.repeat(64),verification:'visually-checked-crop',verificationScope:'source-excerpt',focusRects:[[0,0,1,1]],title:'Passage',alt:'Passage',summary:'Passage checked',checkedFields:{}}]};
test('new catalog paths bind exactly to the item, legacy paths remain supported',()=>{
 assert.ok(validScanCatalogPath(item.id,verification.catalog));assert.ok(validScanCatalogPath('phb-dagger','scans/dagger/manifest.json'));assert.ok(validScanCatalogPath('phb-arrow','scans/dagger/phb-arrow.json'));
 for(const path of ['scans/verified/other.json','scans/verified/../other.json','https://example.test/test-item.json','scans/dagger/phb-arrow.json'])assert.equal(validScanCatalogPath(item.id,path),false);
});
test('collection-scoped catalogs require both collection and item match',()=>{
 const v={...verification,collection:'rules',catalog:'scans/verified/rules-test-item.json'};const c={...structuredClone(catalog),collection:'rules'};assert.ok(validScanCatalogPath(item.id,v.catalog,v));assert.equal(validScanCatalogPath(item.id,'scans/verified/equipment-test-item.json',v),false);validateScanCatalog(c,item,books,v);c.collection='equipment';assert.throws(()=>validateScanCatalog(c,item,books,v));
});
test('scoped metadata and book mapping are checked',()=>{
 assert.equal(validateScanCatalog(catalog,item,books),catalog);
 for(const edit of [c=>c.itemId='other',c=>c.regions[0].image='../escape.png',c=>c.regions[0].pdfPage=177,c=>c.regions[0].verificationScope='selected',c=>c.sources.DMG.hashStatus='unknown']){
  const broken=structuredClone(catalog);edit(broken);assert.throws(()=>validateScanCatalog(broken,item,books));
 }
});
test('the explicit DMG 175 supplement resolves to its JPEG frame without changing the canonical PDF identity',()=>{
 const c=JSON.parse(readFileSync(new URL('../dist/scans/verified/rules-encounter-types.json',import.meta.url),'utf8'));
 const v={...verification,collection:'rules',catalog:'scans/verified/rules-encounter-types.json',regionCount:3},entry={id:'encounter-types',scanVerification:v};
 const region=c.regions.find(r=>r.id==='dmg-175-party-table-context-78c4c383c38c7d10'),identity=books.resolveRegionSourceIdentity(c,region);
 assert.equal(identity.valid,true);assert.equal(identity.sourceKind,'supplemental-image');assert.equal(identity.sourceArtifactId,'dmg175-user-confirmed-supplement');assert.equal(identity.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');assert.equal(identity.canonicalPdfSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');assert.deepEqual(identity.sourceCropBoundsPx,[0,1145,635,1635]);
 assert.equal(books.pdfPage('DMG',175),null);assert.equal(c.sources.DMG.sha256,identity.canonicalPdfSha256);assert.equal(validateScanCatalog(c,entry,books,v),c);
});
test('invalid supplemental identities, page mappings and source-image bounds fail closed without PDF fallback',()=>{
 const supplementId='dmg175-user-confirmed-supplement';
 const make=()=>{const c=structuredClone(catalog);c.sourceArtifacts={[supplementId]:structuredClone(books.sourceArtifacts[supplementId])};c.sources.DMG={sha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',hashStatus:'computed-local'};c.regions[0]={...c.regions[0],id:'dmg-175-party-table-context-78c4c383c38c7d10',book:'DMG',printedPage:175,pdfPage:null,sourceArtifactId:supplementId,sourceCropBoundsPx:[0,1145,635,1635],sourceCoordinateSpace:'supplement-image pixels; top-left origin; LTRB half-open',image:'dmg-175-party-table-context-78c4c383c38c7d10.png',sha256:'78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89',width:635,height:490};return c;};
 const mutations=[
  ['unknown artifact id',c=>c.regions[0].sourceArtifactId='other'],
  ['missing artifact map',c=>delete c.sourceArtifacts[supplementId]],
  ['artifact page mismatch',c=>c.sourceArtifacts[supplementId].printedPage=174],
  ['wrong image hash',c=>c.sourceArtifacts[supplementId].sha256='a'.repeat(64)],
  ['wrong media type',c=>c.sourceArtifacts[supplementId].mediaType='image/png'],
  ['wrong native dimensions',c=>c.sourceArtifacts[supplementId].dimensionsPx=[1328,1796]],
  ['wrong canonical PDF identity',c=>c.sourceArtifacts[supplementId].canonicalPdfSha256='b'.repeat(64)],
  ['wrong canonical catalog PDF',c=>c.sources.DMG.sha256='b'.repeat(64)],
  ['claim PDF contains page',c=>c.sourceArtifacts[supplementId].originalPdfContainsPrintedPage=true],
  ['unexpected PDF page',c=>c.regions[0].pdfPage=176],
  ['missing PDF page field',c=>delete c.regions[0].pdfPage],
  ['missing crop bounds',c=>delete c.regions[0].sourceCropBoundsPx],
  ['out-of-frame crop bounds',c=>c.regions[0].sourceCropBoundsPx=[10,20,1330,30]],
  ['empty crop bounds',c=>c.regions[0].sourceCropBoundsPx=[10,20,10,30]],
  ['full native source image is not an approved crop',c=>c.regions[0].sourceCropBoundsPx=[0,0,1329,1796]],
  ['other in-frame crop is not approved',c=>c.regions[0].sourceCropBoundsPx=[1,1,634,489]],
  ['new crop must use its reviewed region identity',c=>c.regions[0].id='dmg-175-unreviewed-crop'],
  ['approved bounds with changed PNG bytes are rejected',c=>c.regions[0].sha256='d'.repeat(64)],
  ['coordinate label mismatch',c=>c.regions[0].sourceCoordinateSpace='PDF page pixels'],
  ['output dimensions mismatch',c=>c.regions[0].width=11],
  ['supplement frame without artifact identity',c=>delete c.regions[0].sourceArtifactId],
 ];
 for(const [label,mutate] of mutations){const c=make();mutate(c);assert.equal(books.resolveRegionSourceIdentity(c,c.regions[0]).valid,false,label);assert.throws(()=>validateScanCatalog(c,{...item,scanVerification:{...verification,regionCount:1}},books,{...verification,regionCount:1}),label);}
});
test('all active catalog regions preserve strict PDF identity while both supplemental crops resolve',()=>{
 const catalogs=new Map();
 for(const collection of ['rules','spells','equipment','matrices','classes','progressionExplainer']){
  const items=collection==='progressionExplainer'?(data[collection]?[data[collection]]:[]):data[collection]||[];
  for(const entry of items)for(const binding of ['sourceExcerpts','scanVerification']){
   const selected=entry[binding];if(!selected?.catalog||catalogs.has(selected.catalog))continue;
   catalogs.set(selected.catalog,{entry:{...entry,scanVerification:selected},verification:selected});
  }
 }
 let regionCount=0,pdfCount=0,supplementCount=0,stringPageRejected=0,lowerBookRejected=0,paddedBookRejected=0;
 for(const [catalogPath,{entry,verification:selected}] of catalogs){
  const c=JSON.parse(readFileSync(new URL(`../dist/${catalogPath}`,import.meta.url),'utf8'));
  assert.equal(validateScanCatalog(c,entry,books,selected),c,catalogPath);
  for(const region of c.regions){
   regionCount++;
   const identity=books.resolveRegionSourceIdentity(c,region);
   assert.equal(identity.valid,true,`${catalogPath}/${region.id}`);
   if(identity.sourceKind==='supplemental-image'){
    supplementCount++;
    assert.equal(region.book,'DMG');assert.equal(region.printedPage,175);assert.equal(region.pdfPage,null);
    continue;
   }
   pdfCount++;
   const stringPage=structuredClone(region);stringPage.printedPage=String(region.printedPage);
   const lowerBook=structuredClone(region);lowerBook.book=region.book.toLowerCase();
   const paddedBook=structuredClone(region);paddedBook.book=` ${region.book} `;
   assert.equal(books.resolveRegionSourceIdentity(c,stringPage).valid,false,`${catalogPath}/${region.id}: string page`);stringPageRejected++;
   assert.equal(books.resolveRegionSourceIdentity(c,lowerBook).valid,false,`${catalogPath}/${region.id}: lowercase book`);lowerBookRejected++;
   assert.equal(books.resolveRegionSourceIdentity(c,paddedBook).valid,false,`${catalogPath}/${region.id}: padded book`);paddedBookRejected++;
  }
 }
 assert.ok(catalogs.size>=1016);assert.equal(regionCount,pdfCount+supplementCount);assert.equal(supplementCount,2);
 assert.equal(stringPageRejected,pdfCount);assert.equal(lowerBookRejected,pdfCount);assert.equal(paddedBookRejected,pdfCount);
 assert.equal(books.pdfPage('phb','1'),2,'public page lookup remains alias-friendly');
});
test('legacy dagger admits only the pinned complete UA28 table asset and hash',()=>{
 const fullTable=JSON.parse(readFileSync(new URL('../dist/scans/dagger/manifest.json',import.meta.url),'utf8'));
 const dagger=data.equipment.find(x=>x.id==='phb-dagger'),v=dagger.scanVerification;
 assert.equal(validateScanCatalog(fullTable,dagger,books,v),fullTable);
 for(const edit of [c=>c.regions.find(r=>r.book==='UA').sha256='a'.repeat(64),c=>c.regions.find(r=>r.book==='UA').width=1129,c=>c.regions.find(r=>r.book==='UA').image='ua28-full-table-other.png']){
  const broken=structuredClone(fullTable);edit(broken);assert.throws(()=>validateScanCatalog(broken,dagger,books,v));
 }
});
