import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {companionInventories} from '../tools/citation-systemic-inventory.mjs';
import {validateReportDependencies} from '../tools/refresh-gaps-handoff-next-native-v2-callshape-v1.mjs';
import {buildVisualCoverageCore} from '../tools/source-visual-coverage-next-native-v2.mjs';
import {buildClosedReader} from '../tools/class-mapping-assembly-core-v1.mjs';

const root=resolve(import.meta.dirname,'..'),sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(resolve(root,p)),json=p=>JSON.parse(read(p));
const before=json('tests/fixtures/class-mapping-current-report-phase-before-v1.json');
const catalogs=before.catalogStringCases.map(c=>{const bytes=read(c.path),catalog=JSON.parse(bytes);assert.equal(catalog.catalog,c.catalogProperty);assert.equal(catalog.regions.length,c.regionCount);return {path:c.path,catalog,sha256:sha(bytes)};});
const data={rules:catalogs.map(c=>({id:c.catalog.itemId,sourceExcerpts:{catalog:c.catalog.catalog}})),spells:[],equipment:[],classes:[],matrices:[]};
const dataBytes=Buffer.from(JSON.stringify(data,null,2)+'\n'),dataHash=sha(Buffer.from(JSON.stringify(data))),rawDataHash=sha(dataBytes);
const hashFile=p=>p==='dist/data.json'?rawDataHash:sha(read(p)),readJson=p=>{const bytes=read(p);return {bytes,json:JSON.parse(bytes),sha256:sha(bytes)};};
const validInputs={data:rawDataHash,independentReviewLedger:hashFile('research/source-visual-reviews.json'),triage:{},geometry:{file:'tests/fixtures/class-mapping-current-report-phase-before-v1.json',sha256:hashFile('tests/fixtures/class-mapping-current-report-phase-before-v1.json')},priceInventory:{file:'research/price-source-inventory.json',sha256:hashFile('research/price-source-inventory.json')},continuationManifest:{file:'research/citation-continuations.json',sha256:hashFile('research/citation-continuations.json')},contextContractManifest:{file:'research/citation-context-contracts.json',sha256:hashFile('research/citation-context-contracts.json')}};
const loadCatalog=p=>{const c=catalogs.find(c=>c.catalog.catalog===p);assert.ok(c);return {catalog:c.catalog,sha256:c.sha256};};
const visual=buildVisualCoverageCore(data,loadCatalog,{reviews:[]},null,{dataFileHash:rawDataHash,inputHashes:validInputs,loadImage:(catalog,image)=>read('dist/'+catalog.slice(0,catalog.lastIndexOf('/')+1)+image)});
const checkVisual=report=>validateReportDependencies({report,type:'visual',data,dataHash,rawDataHash,readJson,hashFile});

test('the systemic companion helper emits all three exact local inputs and strict missing/stale detectors remain active',()=>{
 const current={input:{path:'dist/data.json',sha256:dataHash,rawFileSha256:rawDataHash}},seen=[];
 const companions=companionInventories(current,p=>{seen.push(p);return read(p);});
 assert.deepEqual(seen,['research/citation-binding-scope-audit.json','research/equipment-price-context-baseline.json','research/citation-navigation-coverage.json']);
 for(const ref of companions)assert.equal(ref.sha256,hashFile(ref.path));
 const report={...current,companionInventories:companions,selectedOwnerCatalogs:{denominator:catalogs.length,usages:catalogs.map(c=>({collection:'rules',itemId:c.catalog.itemId,selectedBinding:'sourceExcerpts',selectedCatalog:c.catalog.catalog,catalogBytesSha256:c.sha256}))}};
 const check=report=>validateReportDependencies({report,type:'systemic',data,dataHash,rawDataHash,hashFile});
 assert.equal(before.reports[0].companionInventoriesPresent,false);assert.doesNotThrow(()=>check(report));
 const omitted=structuredClone(report);delete omitted.companionInventories;assert.throws(()=>check(omitted),/lacks its companion inventory input list/);
 const stale=structuredClone(report);stale.companionInventories[0].sha256='0'.repeat(64);assert.throws(()=>check(stale));
 const unavailable=structuredClone(report);unavailable.companionInventories[0].available=false;assert.throws(()=>check(unavailable),/unavailable/);
});
test('both actual plain catalogs with a catalog string validate all generated visual region dependencies',()=>{
 assert.equal(visual.usages.length,28);assert.notEqual(dataHash,rawDataHash);assert.doesNotThrow(()=>checkVisual(visual));
 const stale=structuredClone(visual);stale.usages[0].imageSha256='0'.repeat(64);assert.throws(()=>checkVisual(stale),/stale imageSha256/);
});
test('the exact seven visual input roles reject the preserved extra keys, missing descriptors and mixed hash domains',()=>{
 assert.deepEqual(Object.keys(visual.inputs).sort(),['data','independentReviewLedger','triage','geometry','priceInventory','continuationManifest','contextContractManifest'].sort());
 const actualBefore=before.reports[1];assert.ok(Object.hasOwn(actualBefore.inputs,'rasterBoundary'));assert.ok(Object.hasOwn(actualBefore.inputs,'sourceFrameBridgeContract'));
 const extra=structuredClone(visual);extra.inputs.rasterBoundary=actualBefore.inputs.rasterBoundary;assert.throws(()=>checkVisual(extra),/unsupported dependency input rasterBoundary/);
 for(const key of ['priceInventory','continuationManifest','contextContractManifest']){const missing=structuredClone(visual);delete missing.inputs[key];assert.throws(()=>checkVisual(missing),/omits dependency input/);}
 const wrongDescriptor=structuredClone(visual);wrongDescriptor.inputs.geometry={path:validInputs.geometry.file,sha256:validInputs.geometry.sha256};assert.throws(()=>checkVisual(wrongDescriptor));
 const wrongDomain=structuredClone(visual);wrongDomain.inputs.data=dataHash;assert.throws(()=>checkVisual(wrongDomain),/stale for current data/);
});
test('the assembly row expression binds exactly the qualified native fixture and the closed reader keeps its negatives',()=>{
 const source=read('tools/assemble-class-mapping-v1.mjs').toString('utf8'),module={exports:{}};runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{module,exports:module.exports});const ast=module.exports.parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const walk=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const value of Object.values(node)){if(Array.isArray(value)){for(const child of value){const found=walk(child,predicate);if(found)return found;}}else if(value&&typeof value==='object'){const found=walk(value,predicate);if(found)return found;}}return null;};
 const declaration=walk(ast,n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id?.name==='rows'));
 const start=source.indexOf(' const nativeFixture='),guard=source.slice(start,declaration.start),validate=new Function('receipt','stage',guard+'return nativeFixture;');
 const path='research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',ref={path,sha256:sha(read(path)),sizeBytes:read(path).length},stage={summary:{fixture:ref}},receipt={outputs:[],qualifierProducer:{codeClosure:[],staticAdapterData:[],nativeQualificationMetadata:[],nativeFixture:ref}},native={inputHashes:{sourceBody:{},protectedHistorical:{}}};
 assert.deepEqual(validate(receipt,stage),ref);const rows=new Function('native','receipt','nativeFixture',source.slice(declaration.start,declaration.end)+'return rows;')(native,receipt,ref);
 assert.deepEqual(buildClosedReader(rows,read).read(path),read(path));assert.throws(()=>buildClosedReader([],read).read(path),/outside the closed/);
 assert.throws(()=>buildClosedReader(rows,read).read('research/undeclared-report-input.json'),/outside the closed/);
 assert.throws(()=>buildClosedReader([{...ref,sha256:'0'.repeat(64)}],read).read(path),/changed/);
 assert.throws(()=>validate({...receipt,qualifierProducer:{...receipt.qualifierProducer,nativeFixture:{...ref,sha256:'0'.repeat(64)}}},stage),/differs/);
 assert.throws(()=>validate({...receipt,qualifierProducer:{...receipt.qualifierProducer,nativeFixture:{...ref,path:'classes.json'}}},stage),/differs/);
});
