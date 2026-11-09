#!/usr/bin/env node
// Diagnostic replay of the exact PHB input migration from immutable Git inputs.
// It never replaces current CI validation or changes the active trusted policy.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,createReadStream} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';

const BASE='ae7f02c6a5aac9ac8da1f7bc5cf5152e422fcd58';
const DATA='416ebc32862105042904e40280034772a51640d1ccbba298b9b8bf5ccbf709fe';
const BOOKS='804deee6fffd2852bc6326e33046e888c10f8f5224835b29dceb42195a571a4f';
const PARENT='2899f53a9cfa1741d9fd9aed3c47ada0eb3a80fc842352c8c64deb3869986318';
const SUCCESSOR='a756ac336f14491aa6785615c869a6a9ed8b1cc1632773e468c72e327fa8b1bd';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const git=(ref,file)=>execFileSync('git',['show',`${ref}:${file}`],{cwd:root,maxBuffer:40*1024*1024});
const normal=value=>JSON.parse(JSON.stringify(value));
function books(bytes){const module={exports:{}};vm.runInNewContext(bytes.toString('utf8'),{module});return module.exports;}
function item(data,owner){return owner.collection==='progressionExplainer'?data.progressionExplainer:data[owner.collection].find(value=>value.id===owner.itemId);}

async function main(){
 const args=new Map();
 for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i],value=process.argv[i+1];assert.ok(['--after-ref','--source-dir','--output'].includes(key)&&value&&!args.has(key),'usage: --after-ref FULL_COMMIT [--source-dir PRIVATE_PDFS] --output REPORT.json');args.set(key,value);}
 const afterRef=args.get('--after-ref'),output=args.get('--output');assert.match(afterRef||'',/^[a-f0-9]{40}$/);assert.ok(output);assert.equal(execFileSync('git',['rev-parse','--verify',`${afterRef}^{commit}`],{cwd:root,encoding:'utf8'}).trim(),afterRef);
 const oldRegistryBytes=git(BASE,'research/source-frame-coordinate-bridge.json'),newRegistryBytes=git(afterRef,'research/source-frame-coordinate-bridge-phb-source-v1.json');assert.equal(sha(oldRegistryBytes),PARENT);assert.equal(sha(newRegistryBytes),SUCCESSOR);
 const beforeRegistry=JSON.parse(oldRegistryBytes),afterRegistry=JSON.parse(newRegistryBytes);assert.deepEqual(afterRegistry.frames,beforeRegistry.frames);assert.deepEqual(afterRegistry.counts,beforeRegistry.counts);
 const oldDataBytes=git(BASE,'dist/data.json'),newDataBytes=git(afterRef,'dist/data.json'),oldBooksBytes=git(BASE,'dist/books.js'),newBooksBytes=git(afterRef,'dist/books.js');assert.equal(sha(oldDataBytes),'a4225fbd2015c5ba7d225738ec1a9bf4658f4a9a9700e340a37dde79317119f3');assert.equal(sha(newDataBytes),DATA);assert.equal(sha(oldBooksBytes),'6284977531e38b3184a15939bb8a68e31b37d1dad61c91392bb57d443045d98d');assert.equal(sha(newBooksBytes),BOOKS);
 const before=JSON.parse(oldDataBytes),after=JSON.parse(newDataBytes),oldBooks=books(oldBooksBytes),newBooks=books(newBooksBytes),catalogs=new Map(),images=new Map();
 const loadCatalog=rel=>{if(!catalogs.has(rel)){const a=git(BASE,'dist/'+rel),b=git(afterRef,'dist/'+rel);assert.deepEqual(a,b);catalogs.set(rel,{catalog:JSON.parse(b),sha256:sha(b)});}return catalogs.get(rel);};
 const loadImage=(catalog,image)=>{const rel=path.posix.join('dist',path.posix.dirname(catalog),image);if(!images.has(rel)){const a=git(BASE,rel),b=git(afterRef,rel);assert.deepEqual(a,b);images.set(rel,b);}return images.get(rel);};
 for(const [rel,expected]of Object.entries(beforeRegistry.provenance.catalogHashes))assert.equal(loadCatalog(rel).sha256,expected);
 let joins=0;
 for(const frame of beforeRegistry.frames)for(const row of frame.regions){
  assert.deepEqual(item(after,row.owner)[row.owner.binding],item(before,row.owner)[row.owner.binding]);const loaded=loadCatalog(row.catalog),region=loaded.catalog.regions.find(value=>value.id===row.regionId);assert.ok(region);assert.equal(loaded.sha256,row.catalogSha256);const bytes=loadImage(row.catalog,row.image);assert.equal(sha(bytes),row.imageSha256);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],row.imageDimensionsPx);const old=normal(oldBooks.resolveRegionSourceIdentity(loaded.catalog,region)),now=normal(newBooks.resolveRegionSourceIdentity(loaded.catalog,region));assert.equal(old.valid,true);assert.deepEqual(now,old);joins++;
 }
 assert.equal(joins,102);assert.equal(newBooks.evidenceAvailability('DMG',175),'supplemental');assert.equal(newBooks.availability('DMG',175),'missing');assert.equal(newBooks.pdfPage('DMG',175),null);
 const temporary=mkdtempSync(path.join(tmpdir(),'phb-frame-git-replay-'));let oldValidation,newValidation;
 try{
  mkdirSync(path.join(temporary,'research'));mkdirSync(path.join(temporary,'dist'));writeFileSync(path.join(temporary,'research/source-frame-coordinate-bridge.json'),oldRegistryBytes);writeFileSync(path.join(temporary,'research/source-frame-coordinate-bridge-phb-source-v1.json'),newRegistryBytes);writeFileSync(path.join(temporary,'dist/books.js'),newBooksBytes);
  const oldCode=git(BASE,'tools/source-frame-coordinate-bridge.mjs'),newCode=git(afterRef,'tools/source-frame-coordinate-bridge.mjs');assert.equal(sha(oldCode),'f9ca885508b8d32e4d7603d0a327a239b3acd6b93a7e981aaef663a83c04d4cc');assert.equal(sha(newCode),'6276007d03bdfdf01d74acf84141a426e550e9a14d44f568748e56a9e24d1150');const oldPath=path.join(temporary,'before-guard.mjs'),newPath=path.join(temporary,'after-guard.mjs');writeFileSync(oldPath,oldCode);writeFileSync(newPath,newCode);const oldGuard=await import(pathToFileURL(oldPath)),newGuard=await import(pathToFileURL(newPath));oldValidation=oldGuard.validateLiveSourceFrameBridge({repoRoot:temporary,data:after,loadCatalog,loadImage}).validation;newValidation=newGuard.validateLiveSourceFrameBridge({repoRoot:temporary,data:after,loadCatalog,loadImage}).validation;assert.deepEqual(oldValidation.mismatches,[{frameId:null,fields:['booksJsSha256']}]);assert.equal(newValidation.status,'current-pins-match');assert.equal(newValidation.ownerJoinsValidated,102);assert.equal(newValidation.mismatchCount,0);
 }finally{rmSync(temporary,{recursive:true});}
 const pdfs=[];
 for(const [book,source]of Object.entries(beforeRegistry.provenance.sourcePdfs)){
  let replayed=false;
  if(args.has('--source-dir')){const h=createHash('sha256');for await(const chunk of createReadStream(path.join(args.get('--source-dir'),source.fileName)))h.update(chunk);assert.equal(h.digest('hex'),source.sha256);replayed=true;}
  pdfs.push({book,filename:source.fileName,sha256:source.sha256,privateSourceBytesReplayed:replayed});
 }
 const report={schemaVersion:1,artifactType:'portable-exact-Git-PHB-frame-input-migration-replay',status:'diagnostic-Git-input-replay; cannot substitute for current CI validation',beforeCommit:BASE,afterInputCommit:afterRef,sourceInputs:{beforeDataSha256:sha(oldDataBytes),afterDataSha256:DATA,beforeBooksSha256:sha(oldBooksBytes),afterBooksSha256:BOOKS,parentRegistrySha256:PARENT,successorRegistrySha256:SUCCESSOR},counts:{frameGroups:9,physicalPdfPages:7,ownerJoins:102,recordedCatalogs:catalogs.size,registeredImageFiles:images.size},allFrameRowsSourceLinksCatalogBytesImagesAndFullResolverIdentitiesExact:true,oldGuardCapturedRejection:oldValidation,newGuardInputReplay:newValidation,privatePdfHashes:pdfs,privatePdfReplayMeaning:args.has('--source-dir')?'All five actual private PDF byte hashes matched.':'Private PDF bytes were not opened; supply --source-dir for that separate replay.',newThiefFrameOr103rdJoin:false,semanticPass:false,privacy:'No PDF, page, source pixel, JPEG or OCR payload is exported.'};
 const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n'),target=path.resolve(output);mkdirSync(path.dirname(target),{recursive:true});try{assert.deepEqual(readFileSync(target),bytes,'existing immutable replay output differs');}catch(error){if(error.code==='ENOENT')writeFileSync(target,bytes);else throw error;}console.log(JSON.stringify({output:target,sha256:sha(bytes),afterInputCommit:afterRef,joins,privatePdfBytesReplayed:args.has('--source-dir')}));
}
await main();
