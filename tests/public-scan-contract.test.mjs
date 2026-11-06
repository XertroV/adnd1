import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {validScanCatalogPath,validateScanCatalog,scanStates} from '../tools/scan-catalog.mjs';
const require=createRequire(import.meta.url),books=require('../dist/books.js'),citations=require('../dist/citations.js');
const data=JSON.parse(readFileSync('dist/data.json','utf8'));
const records=[...['rules','spells','classes','equipment','matrices'].flatMap(k=>data[k]||[]),...(data.progressionExplainer?[{...data.progressionExplainer,id:'progression-explainer'}]:[])];
test('every current cited record and available page has a scoped source excerpt',()=>{
 let pairs=0;
 for(const item of records){
  const pages=citations.pages(item).filter(page=>!page.missing);
  if(!pages.length)continue;
  assert.equal(item.sourceExcerpts?.state,'source-excerpt-checked',item.id);
  const catalog=JSON.parse(readFileSync(path.join('dist',item.sourceExcerpts.catalog),'utf8'));
  for(const page of pages){
   assert.ok(catalog.regions.some(region=>region.book===page.book&&region.printedPage===page.page),`${item.id}: missing ${page.book} ${page.page}`);
   pairs++;
  }
 }
 assert.equal(pairs,1851);
});
test('all public catalogs bind to cited pages and checked PNG bytes',()=>{
 const checked=new Map();let regions=0;
 for(const item of records)for(const v of [item.scanVerification,item.sourceExcerpts].filter(v=>scanStates.has(v?.state))){
  assert.ok(validScanCatalogPath(item.id,v.catalog,v));const c=JSON.parse(readFileSync(path.join('dist',v.catalog),'utf8'));validateScanCatalog(c,item,books,v);
  const pages=citations.pages(item);for(const r of c.regions){assert.ok(pages.some(p=>p.book===r.book&&p.page===r.printedPage),`${item.id}: ${r.book} ${r.printedPage} is uncited`);const image=path.join('dist',path.dirname(v.catalog),r.image);let meta=checked.get(image);if(!meta){const bytes=readFileSync(image);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');meta={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),hash:createHash('sha256').update(bytes).digest('hex')};checked.set(image,meta);}assert.equal(r.width,meta.width);assert.equal(r.height,meta.height);assert.equal(r.sha256,meta.hash);regions++;}
 }
 assert.ok(regions>0);
});
test('the public distribution contains no PDF files',()=>{function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else assert.doesNotMatch(entry.name,/\.pdf$/i,p);}}walk('dist');});
