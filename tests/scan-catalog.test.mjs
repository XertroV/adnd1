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
test('legacy dagger admits only the pinned complete UA28 table asset and hash',()=>{
 const fullTable=JSON.parse(readFileSync(new URL('../dist/scans/dagger/manifest.json',import.meta.url),'utf8'));
 const dagger=data.equipment.find(x=>x.id==='phb-dagger'),v=dagger.scanVerification;
 assert.equal(validateScanCatalog(fullTable,dagger,books,v),fullTable);
 for(const edit of [c=>c.regions.find(r=>r.book==='UA').sha256='a'.repeat(64),c=>c.regions.find(r=>r.book==='UA').width=1129,c=>c.regions.find(r=>r.book==='UA').image='ua28-full-table-other.png']){
  const broken=structuredClone(fullTable);edit(broken);assert.throws(()=>validateScanCatalog(broken,dagger,books,v));
 }
});
