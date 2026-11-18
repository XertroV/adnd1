// Source2 current inventory, separate from the immutable historical MM fixture.
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {assertCurrentClassMappingSource2Identity} from '../../class-mapping-source-epoch-v2/closed-historical-reader-source2-v2.mjs';
import {createRawGitReader} from '../../../tools/class-mapping-raw-git-v1.mjs';
import {validScanCatalogPath,scanStates,validateScanCatalog} from './scan-catalog.mjs';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const require=createRequire(import.meta.url);
const SOURCE=Object.freeze({stage:'source2-body-native',commit:'400f6e9d123d8a654b9b9af48133a2533506e73d',tree:'664c02504efcece25669d2f9c3fdb26437cd5b09',fixturePath:'research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json',fixtureSha256:'a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2',bodyRows:3063,owners:1070,catalogs:1090,dataSha256:'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573'});
const CODE_STAGES=Object.freeze([
 Object.freeze({role:'current Source2 B raw code authority; outside Source2 sourceBody',commit:SOURCE.commit,tree:SOURCE.tree}),
 Object.freeze({role:'published T raw code alias; outside Source2 sourceBody',commit:'343ab90610a224786b4ce64c3e9e2ba928a3d6c8',tree:'af9f440cd871dc4285c2660149de39da87385b26'}),
 Object.freeze({role:'immutable a29 MM code role; never current qualification',commit:'a29d72d5147c497addd9e46f54ea3f8222f6e9c2',tree:'da1c64ea25f178a1155a79c4692964e9b17dd645'}),
]);
const SEPARATE_CODE=Object.freeze([
 Object.freeze({path:'dist/citations.js',historicalPath:'dist/citations.js',sha256:'63e1667cd93c773e950bf6c53d8cf56e6beb29490278cecdeeb952cfa2663032',sizeBytes:8056}),
 Object.freeze({path:'research/class-mapping-history-v1/replay-tools/scan-catalog.mjs',historicalPath:'tools/scan-catalog.mjs',sha256:'903e88c09682ac76807203d518ee82b8c23afafc636f325cfdc4e21be87c2273',sizeBytes:3335}),
]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error('Source2 source-scan inventory: '+message);};
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function physical(path){
 if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||/[\x00-\x1f\x7f:]/.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('-')))fail('closed repository path required');
 const absolute=resolve(root,path),stat=lstatSync(absolute);
 if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(absolute)!==absolute)fail(path+': regular physical non-symlink file required');
 return readFileSync(absolute);
}
function assertCurrentProof(proof){
 const summary=proof?.summary,groups=proof?.inputHashes;
 if(summary?.stage!==SOURCE.stage||summary.sourceCommit!==SOURCE.commit||summary.sourceTree!==SOURCE.tree||summary.fixture?.path!==SOURCE.fixturePath||summary.fixture?.sha256!==SOURCE.fixtureSha256||summary.owners!==SOURCE.owners)fail('exact genuine current Source2 identity required');
 if(!groups||JSON.stringify(Object.keys(groups).sort())!==JSON.stringify(['sourceBody','qualificationMetadata','protectedHistorical','installedCode'].sort()))fail('exact four typed Source2 proof groups required');
 for(const [group,rows]of Object.entries(groups)){
  if(!rows||typeof rows!=='object'||Array.isArray(rows))fail(group+': typed map required');
  for(const [path,sha]of Object.entries(rows))if(!digest(sha))fail(path+': proof digest required');
 }
 const body=groups.sourceBody;
 if(Object.keys(body).length!==SOURCE.bodyRows||body['dist/data.json']!==SOURCE.dataSha256)fail('exact3063 sourceBody rows and Source2 data pin required');
 for(const pin of SEPARATE_CODE)if(Object.hasOwn(body,pin.path))fail(pin.path+': separate code must not be relabeled as Source2 body');
 return body;
}
function authenticateSeparateCode(){
 const raw=createRawGitReader(root);raw.assertView();
 for(const stage of CODE_STAGES)if(raw.git('rev-parse',stage.commit+'^{tree}').toString('utf8').trim()!==stage.tree)fail('fixed separate code-stage tree differs');
 raw.git('merge-base','--is-ancestor',CODE_STAGES[2].commit,SOURCE.commit);
 raw.git('merge-base','--is-ancestor',SOURCE.commit,CODE_STAGES[1].commit);
 raw.git('merge-base','--is-ancestor',CODE_STAGES[1].commit,'HEAD');
 const authorities=[];
 for(const pin of SEPARATE_CODE){
  const bytes=physical(pin.path);
  if(bytes.length!==pin.sizeBytes||hash(bytes)!==pin.sha256)fail(pin.path+': separately typed physical code differs');
  const stages=CODE_STAGES.map((stage,index)=>({...stage,path:index===2?pin.historicalPath:pin.path}));
  for(const stage of stages){const blob=raw.git('show',stage.commit+':'+stage.path);if(blob.length!==pin.sizeBytes||hash(blob)!==pin.sha256||!blob.equals(bytes))fail(pin.path+': fixed B/T/MM raw code identity differs');}
  authorities.push({...pin,stages,excludedFrom:['Source2 sourceBody3063','Source2 installedCode7','old F1','report-code104']});
 }
 raw.assertView();return authorities;
}
export const BATCH_SIZE=10;
function authenticatedInventoryBuilder(citations,books){
 const order=Object.keys(books.books);
 const cmp=(a,b)=>order.indexOf(a.book)-order.indexOf(b.book)||a.page-b.page;
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
function buildInventory(data, loadCatalog) {
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
   if(!byPage.has(key))byPage.set(key,{book:page.book,page:page.page,pdfPage:page.pdfPage,missing:page.missing,availability:page.availability,evidenceAvailability:page.evidenceAvailability,records:[],suppliedCropPixels:false,scopedCropChecks:[]});
  byPage.get(key).records.push({collection:record.collection,id:record.id,labels:page.labels,statuses:page.statuses});
 }
 // Catalogs establish only that selected pixels and scoped checks exist.
 for(const item of [...['rules','spells','equipment','matrices','classes'].flatMap(key=>data[key]||[]),...(data.progressionExplainer?[{...data.progressionExplainer,id:'progression-explainer'}]:[])]){
  const verification=item.sourceExcerpts||item.scanVerification;
  if(!scanStates.has(verification?.state))continue;
  const path=verification.catalog;
  if(!validScanCatalogPath(item.id,path,verification))throw Error(`Invalid catalog for ${item.id}`);
  const catalog=loadCatalog(`dist/${path}`);
  validateScanCatalog(catalog,item,books,verification);
  for(const region of catalog.regions){
   const page=byPage.get(`${region.book}:${region.printedPage}`);
   if(!page || !page.records.some(record=>record.id===item.id&&(!verification.collection||record.collection===verification.collection)))throw Error(`Uncited catalog page for ${item.id}`);
   page.suppliedCropPixels=true;
   const state=region.verificationScope==='selected-values'?'selected-values-checked':region.verificationScope==='source-excerpt'?'source-excerpt-checked':verification.state;
   if(!page.scopedCropChecks.some(check=>check.itemId===item.id&&check.regionId===region.id&&check.state===state&&check.collection===(verification.collection||null)))page.scopedCropChecks.push({itemId:item.id,collection:verification.collection||null,regionId:region.id,state,fields:state==='selected-values-checked'?Object.keys(region.checkedFields||{}).sort():[]});
  }
 }
 // Preserve confirmed and unresolved unavailable pages even when uncited.
 for(const page of [...books.books.DMG.gaps,...(books.books.DMG.unverified||[])]){const key=`DMG:${page}`,availability=books.availability('DMG',page),evidenceAvailability=books.evidenceAvailability('DMG',page);if(!byPage.has(key))byPage.set(key,{book:'DMG',page,pdfPage:null,missing:availability==='missing',availability,evidenceAvailability,records:[],suppliedCropPixels:false,scopedCropChecks:[]});}
 const pages=[...byPage.values()].sort(cmp);
 for(const page of pages){const evidence=books.supplementalEvidence(page.book,page.page);if(evidence)page.supplementalEvidence=evidence;}
 const available=pages.filter(p=>p.availability==='available'), blocked=pages.filter(p=>p.availability!=='available');
 const batches=[];
 for(const book of order){
  const bookPages=available.filter(p=>p.book===book);
  for(let i=0;i<bookPages.length;i+=BATCH_SIZE)batches.push({id:`${book.toLowerCase()}-${String(i/BATCH_SIZE+1).padStart(3,'0')}`,book,pages:bookPages.slice(i,i+BATCH_SIZE).map(p=>p.page)});
 }
 return {schemaVersion:1,scope:'Structured citations in assembled records and progression explainer; crop presence and scoped catalog checks do not verify any other field or the full page. PDF page availability and accepted supplemental source evidence are separate dimensions. OCR statuses are retained as data, never upgraded.',input:{path:'dist/data.json',sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex'),hashFormat:'SHA-256 of JSON.stringify(parsed data)'},counts:{records:records.length,recordPagePairs:records.reduce((n,r)=>n+r.pages.length,0),citedPages:pages.filter(p=>p.records.length).length,knownGapPages:blocked.filter(p=>p.availability==='missing').length,pdfOmittedCitedPages:pages.filter(p=>p.records.length&&p.availability==='missing').length,supplementedCitedPages:pages.filter(p=>p.records.length&&p.evidenceAvailability==='supplemental').length,evidenceUnavailableCitedPages:pages.filter(p=>p.records.length&&p.evidenceAvailability==='missing').length,unverifiedPages:blocked.filter(p=>p.availability==='unverified').length,pagesWithSomeSuppliedCropPixels:pages.filter(p=>p.suppliedCropPixels).length,citedPagesWithoutSuppliedCropPixels:pages.filter(p=>p.records.length&&!p.suppliedCropPixels).length,batches:batches.length},records,pages,queue:{batchSize:BATCH_SIZE,batches,blocked:blocked.map(p=>({book:p.book,page:p.page,availability:p.availability,evidenceAvailability:p.evidenceAvailability,reason:p.supplementalEvidence?'The cited page remains absent from the supplied PDF. The user confirmed the separate image is from the correct edition, and bounded limited excerpts are available as source evidence; the full image is not published. Crop availability does not establish whole-page completeness.':p.availability==='missing'?'Missing from supplied scan; obtain a matching source before review.':'Page identity is unverified in supplied scan; obtain matching end matter before review.',...(p.supplementalEvidence?{supplementalEvidence:p.supplementalEvidence}:{})}))}};
}
 return buildInventory;
}
export function buildCurrentSource2Inventory(...args){
 if(args.length!==0)fail('current entry point accepts no caller data, root, fixture, loader, or pin overrides');
 const proof=assertCurrentClassMappingSource2Identity();
 const body=assertCurrentProof(proof),bodyReadHashes={};
 const readBody=path=>{
  if(!Object.hasOwn(body,path)||!digest(body[path]))fail(path+': explicit Source2 sourceBody membership required');
  const bytes=physical(path);if(hash(bytes)!==body[path])fail(path+': physical bytes differ from actual Source2 body proof');
  bodyReadHashes[path]=body[path];return bytes;
 };
 const separateCodeAuthorities=authenticateSeparateCode();
 readBody('dist/books.js');
 const books=require('../../../dist/books.js'),citations=require('../../../dist/citations.js');
 const catalogPaths=Object.keys(body).filter(path=>/^dist\/scans\/(dagger|verified)\/[^/]+\.json$/.test(path)).sort();
 if(catalogPaths.length!==SOURCE.catalogs)fail('exact1090 Source2 catalog body rows required');
 const catalogs=new Map(catalogPaths.map(path=>[path,JSON.parse(readBody(path).toString('utf8'))]));
 const data=JSON.parse(readBody('dist/data.json').toString('utf8'));
 const owners=['rules','spells','equipment','matrices','classes'].flatMap(key=>data[key]||[]).concat(data.progressionExplainer?[data.progressionExplainer]:[]);
 if(owners.length!==SOURCE.owners)fail('all1070 actual Source2 owners required');
 const used=new Set();
 const inventory=authenticatedInventoryBuilder(citations,books)(data,path=>{
  if(!catalogs.has(path))fail(path+': catalog is outside the exact1090 Source2 body closure');
  used.add(path);return catalogs.get(path);
 });
 if(inventory.counts.records!==SOURCE.owners)fail('every actual Source2 owner must retain a structured citation');
 for(const [path,sha]of Object.entries(bodyReadHashes))if(hash(physical(path))!==sha)fail(path+': authenticated input changed during inventory');
 for(const pin of SEPARATE_CODE){const bytes=physical(pin.path);if(bytes.length!==pin.sizeBytes||hash(bytes)!==pin.sha256)fail(pin.path+': separate code changed during inventory');}
 return {currentSource2Summary:structuredClone(proof.summary),inputHashes:structuredClone(proof.inputHashes),catalogClosure:{catalogJsonRows:catalogPaths.length,referencedCatalogRows:used.size},separateCodeAuthorities,inventory};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)fail('CLI accepts no arguments; current JSON is stdout only');
 console.log(JSON.stringify(buildCurrentSource2Inventory()));
}
