// Deterministic inventory of structured citations in the assembled application data.
// Run `node tools/source-scan-inventory.mjs` after `node tools/assemble.mjs`.
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const require=createRequire(import.meta.url);
const citations=require('../dist/citations.js');
const books=require('../dist/books.js');
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const order=Object.keys(books.books);
const cmp=(a,b)=>order.indexOf(a.book)-order.indexOf(b.book)||a.page-b.page;
export const BATCH_SIZE=10;
function referencePaths(item){
 const refs=[];
 function walk(value,path){
  if(!value || typeof value!=='object')return;
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,`${path}/${i}`));return;}
  const book=books.code(value.book), info=books.books[book];
  if(info && Array.isArray(value.pages)){
   const pages=[...new Set(value.pages.filter(p=>Number.isInteger(p)&&p>=1&&p<=info.lastPage))];
   if(pages.length)refs.push({path:path||'/',book,pages,...(value.label?{label:value.label}:{}),...(value.status?{status:value.status}:{})});
  }
  for(const [key,child] of Object.entries(value))if(child&&typeof child==='object')walk(child,`${path}/${key.replaceAll('~','~0').replaceAll('/','~1')}`);
 }
 walk(item,'');return refs;
}
export function buildInventory(data, loadCatalog=read) {
 const records=[];
 for(const collection of ['rules','spells','equipment','matrices','classes']) for(const item of data[collection]||[]) {
  const pages=citations.pages(item);
  if(!pages.length)continue;
  records.push({collection,id:item.id,name:item.name||item.title||item.id,pages,references:referencePaths(item)});
 }
 // The explainer is a separate reference-bearing record, not a class.
 if(data.progressionExplainer){
  const pages=citations.pages(data.progressionExplainer);
  if(pages.length)records.push({collection:'progressionExplainer',id:'progression-explainer',name:'Progression explainer',pages,references:referencePaths(data.progressionExplainer)});
 }
 const byPage=new Map();
 for(const record of records) for(const page of record.pages){
  const key=`${page.book}:${page.page}`;
  if(!byPage.has(key))byPage.set(key,{book:page.book,page:page.page,pdfPage:page.pdfPage,missing:page.missing,records:[],suppliedCropPixels:false,scopedCropChecks:[]});
  byPage.get(key).records.push({collection:record.collection,id:record.id,labels:page.labels,statuses:page.statuses});
 }
 // Catalogs establish only that selected pixels and scoped checks exist.
 for(const item of data.equipment||[]){
  if(item.scanVerification?.state!=='selected-values-checked')continue;
  const path=item.scanVerification.catalog;
  if(!/^scans\/dagger\/(?:manifest|(?:phb|ua)-[a-z0-9-]+)\.json$/.test(path||''))throw Error(`Invalid catalog for ${item.id}`);
  const catalog=loadCatalog(`dist/${path}`);
  if(catalog.itemId!==item.id || !Array.isArray(catalog.regions) || catalog.regions.length!==item.scanVerification.regionCount)throw Error(`Invalid catalog contents for ${item.id}`);
  for(const region of catalog.regions){
   const page=byPage.get(`${region.book}:${region.printedPage}`);
   if(!page)throw Error(`Uncited catalog page for ${item.id}`);
   page.suppliedCropPixels=true;
   page.scopedCropChecks.push({itemId:item.id,regionId:region.id,fields:Object.keys(region.checkedFields||{}).sort()});
  }
 }
 // Preserve the two known gaps even when no current record cites them.
 for(const page of books.books.DMG.gaps){const key=`DMG:${page}`;if(!byPage.has(key))byPage.set(key,{book:'DMG',page,pdfPage:null,missing:true,records:[],suppliedCropPixels:false,scopedCropChecks:[]});}
 const pages=[...byPage.values()].sort(cmp);
 const available=pages.filter(p=>!p.missing), blocked=pages.filter(p=>p.missing);
 const batches=[];
 for(const book of order){
  const bookPages=available.filter(p=>p.book===book);
  for(let i=0;i<bookPages.length;i+=BATCH_SIZE)batches.push({id:`${book.toLowerCase()}-${String(i/BATCH_SIZE+1).padStart(3,'0')}`,book,pages:bookPages.slice(i,i+BATCH_SIZE).map(p=>p.page)});
 }
 return {schemaVersion:1,scope:'Structured citations in assembled records and progression explainer; crop presence and scoped catalog checks do not verify any other field or the full page. OCR statuses are retained as data, never upgraded.',input:{path:'dist/data.json',sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex'),hashFormat:'SHA-256 of JSON.stringify(parsed data)'},counts:{records:records.length,recordPagePairs:records.reduce((n,r)=>n+r.pages.length,0),citedPages:pages.filter(p=>p.records.length).length,knownGapPages:blocked.length,pagesWithSomeSuppliedCropPixels:pages.filter(p=>p.suppliedCropPixels).length,citedPagesWithoutSuppliedCropPixels:pages.filter(p=>p.records.length&&!p.suppliedCropPixels).length,batches:batches.length},records,pages,queue:{batchSize:BATCH_SIZE,batches,blocked:blocked.map(p=>({book:p.book,page:p.page,reason:'Missing from supplied scan; obtain a matching source before review.'}))}};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=buildInventory(read('dist/data.json'));
 const output=resolve(root,'tests/fixtures/source-scan-inventory.json');
 writeFileSync(output,JSON.stringify(result)+'\n');
 console.log(JSON.stringify(result.counts));
}
