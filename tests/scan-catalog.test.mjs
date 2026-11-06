import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {validScanCatalogPath,validateScanCatalog} from '../tools/scan-catalog.mjs';
const require=createRequire(import.meta.url),books=require('../dist/books.js');
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
