import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {readBeforeJoBytes,joIntegration} from './helpers/batch6-jo-fixture.mjs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {hash} from '../tools/monetary-row-identity-audit.mjs';
import {validateJoUnextractedPriceRegistration,loadJoUnextractedPriceRegistration} from '../tools/jo-unextracted-price-registration.mjs';
import {validateContinuationManifest} from '../tools/continuation-contract.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>JSON.parse(readFileSync(resolve(root,p))),unzip=p=>JSON.parse(gunzipSync(readFileSync(resolve(root,p))));
const old=unzip('tests/fixtures/equipment-before-jo.json.gz'),equipment=read('equipment.json'),data=read('dist/data.json'),inventory=read('research/price-source-inventory.json');
const before=read('tests/fixtures/jo-stick-mapping-proposal-v1-stale-after.json'),jo=equipment.equipment.find(e=>e.id==='ua-jo-stick'),catalog=read('dist/scans/verified/equipment-ua-jo-stick.json');

function runtimeGroupInventory(readBytes){
 const viewer=readBytes('dist/source-viewer.js').toString(),marker='  root.FirstEditionSourceViewer = Object.freeze({ open, close });';assert.ok(viewer.includes(marker));
 const context={document:{currentScript:{src:'https://unit.test/dist/source-viewer.js'},baseURI:'https://unit.test/dist/'},location:{origin:'https://unit.test'},URL};vm.createContext(context);
 vm.runInContext(readBytes('dist/books.js').toString(),context);
 vm.runInContext(viewer.replace(marker,`  root.__joRuntime={setState(value){excerptSource=value.source;excerptCatalog=value.catalog;root.FirstEditionSourceContinuations=value.manifest;},validatedContinuationParts};\n${marker}`),context);
 const manifest=JSON.parse(readBytes('dist/source-continuations.json'));
 return manifest.groups.map(group=>{const catalog=JSON.parse(readBytes(`dist/${group.catalog}`));context.__joRuntime.setState({source:group,catalog,manifest});return {id:group.id,itemId:group.itemId,catalog:group.catalog,segmentRoles:group.segments.map(s=>s.role),segments:group.segments.length,selections:group.segments.map(segment=>{const region=catalog.regions.find(r=>r.id===segment.regionId);assert.ok(region);const result=context.__joRuntime.validatedContinuationParts({book:segment.book,page:segment.printedPage},region);return JSON.parse(JSON.stringify({regionId:segment.regionId,book:segment.book,printedPage:segment.printedPage,expectedPdfPage:context.FirstEditionBooks.pdfPage(segment.book,segment.printedPage),linked:!!result,result:result?{groupId:result.group.id,parts:result.parts.map(p=>({regionId:p.region.id,selected:p.selected,role:p.segment.role}))}:null}));})};});
}

test('the full preserved production-function census reproduces only the Jo role rejection',()=>{
 const fixture=unzip('tests/fixtures/jo-stick-continuation-role-before.json.gz'),files=new Map(fixture.files.map(f=>[f.path,f]));
 const inventory=runtimeGroupInventory(path=>{const file=files.get(path);assert.ok(file,path);assert.equal(createHash('sha256').update(file.text).digest('hex'),file.sha256);return file.text;});
 assert.deepEqual(inventory,fixture.inventory);assert.equal(inventory.length,191);assert.equal(inventory.reduce((n,g)=>n+g.selections.length,0),358);
 assert.deepEqual(inventory.filter(g=>g.segments>1&&g.selections.some(s=>!s.linked)).map(g=>g.id),['ua26-wd-31-ua-jo-stick']);
 assert.equal(inventory.filter(g=>g.segments===1).length,24);assert.ok(inventory.filter(g=>g.segments===1).every(g=>g.selections.every(s=>!s.linked)));
 const dmg225=inventory.flatMap(g=>g.selections).filter(s=>s.book==='DMG'&&s.printedPage===225);assert.ok(dmg225.length>0);assert.ok(dmg225.every(s=>s.expectedPdfPage===225));
});

test('every current group member retains its real runtime result while both Jo members now join',()=>{
 const fixture=unzip('tests/fixtures/jo-stick-continuation-role-before.json.gz'),inventory=runtimeGroupInventory(path=>readFileSync(resolve(root,path)));
 const upstreamRef=joIntegration.upstreamIntegration.runtimeBefore,upstreamBytes=readFileSync(resolve(root,upstreamRef.path));assert.equal(createHash('sha256').update(upstreamBytes).digest('hex'),upstreamRef.sha256);const published=JSON.parse(gunzipSync(upstreamBytes)),publishedFiles=new Map(published.files.map(file=>[file.path,file]));
 assert.deepEqual(runtimeGroupInventory(path=>{const file=publishedFiles.get(path);assert.ok(file,path);assert.equal(createHash('sha256').update(file.text).digest('hex'),file.sha256);return file.text;}),published.inventory,'all207 published group-member results reproduce from exact Git master inputs');const oldById=new Map(published.inventory.map(g=>[g.id,g]));
 const captured=new Map(fixture.files.map(f=>[f.path,f]));for(const path of ['dist/source-viewer.js','dist/books.js','dist/scans/verified/equipment-ua-jo-stick.json'])assert.equal(createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex'),captured.get(path).sha256,`${path}: runtime correction does not change viewer, mappings, catalog or source pixels`);
 const beforeJo=JSON.parse(captured.get('equipment.json').text).equipment.find(item=>item.id==='ua-jo-stick');assert.deepEqual(jo,beforeJo,'the Jo source values and field proofs remain unchanged by the role correction');
 const additions=joIntegration.upstreamIntegration.groupAdditions.map(ref=>ref.group);
 const expectedManifest=JSON.parse(captured.get('research/citation-continuations.json').text);expectedManifest.groups.find(g=>g.id==='ua26-wd-31-ua-jo-stick').segments[1].role='continuation';expectedManifest.groups.splice(190,0,...additions);assert.deepEqual(read('research/citation-continuations.json'),expectedManifest,'preserve the exact Jo role repair and separately reviewed master groups');
 assert.equal(inventory.length,joIntegration.currentRuntimeCounts.groups);assert.equal(inventory.reduce((n,g)=>n+g.selections.length,0),joIntegration.currentRuntimeCounts.members);assert.equal(inventory.filter(g=>g.segments===1).length,24);assert.equal(inventory.filter(g=>g.segments>1).length,joIntegration.currentRuntimeCounts.multiPartGroups);
 for(const group of inventory){if(group.segments===1)assert.ok(group.selections.every(s=>!s.linked),`${group.id}: single-part groups intentionally do not join`);else for(const selected of group.selections){assert.equal(selected.linked,true,`${group.id}: ${selected.regionId}`);assert.deepEqual(selected.result.parts.filter(p=>p.selected).map(p=>p.regionId),[selected.regionId]);if(group.id==='ua26-wd-31-ua-jo-stick'){assert.equal(selected.result.groupId,group.id);assert.deepEqual(selected.result.parts.map(p=>p.regionId),group.selections.map(s=>s.regionId));}}if(group.id!=='ua26-wd-31-ua-jo-stick')assert.deepEqual(group,oldById.get(group.id),'every published runtime result, including old aliases and all fourteen matrix groups, remains unchanged');}
 const note=catalog.regions.find(r=>r.id==='jo-stick-ua26-facing-general-note');assert.equal(note.role,'context');
 const receipt=joIntegration,previous=readFileSync(resolve(root,receipt.supersedes.path));assert.equal(createHash('sha256').update(previous).digest('hex'),receipt.supersedes.sha256);assert.deepEqual(receipt.addedContinuationGroup,read('research/citation-continuations.json').groups.at(-1));
});

test('V1 stale current-owner assertions remain a five-field regression fixture while current rows name the distinct owner',()=>{
 assert.equal(hash(before.v1Operations),'97b77b89705502e39567f087d8be2470d4b9bae169254761012da19eb407f32e','canonical content of exact ba2b49 V1 source proposal is preserved');
 assert.equal(before.staleAfterTextFields.length,5);
 assert.equal(new Set(before.staleAfterTextFields.map(r=>r.pointer.split('/').slice(0,-1).join('/'))).size,3);
 for(const failure of before.staleAfterTextFields){assert.match(failure.value,/no .*distinct|no distinct|without-current-item-owner/);const current=failure.pointer.slice(1).split('/').reduce((v,k)=>v[k],read(failure.file));assert.notEqual(current,failure.value);assert.doesNotMatch(current,/no .*distinct|no distinct|without-current-item-owner/);}
});

test('the distinct Jo owner preserves all fourteen approved source-specific values and every original equipment record',()=>{
 assert.equal(old.equipment.length,191);assert.equal(equipment.equipment.length,192);assert.deepEqual(equipment.equipment.slice(0,191),old.equipment);
 assert.deepEqual(jo.fields,before.v1Operations[0].after.fields);assert.equal(Object.keys(jo.fields).length,14);
 assert.equal(jo.price,null);assert.equal(jo.priceState,'unextracted');assert.equal(Object.hasOwn(jo,'suggestedPrice'),false);
 assert.deepEqual(equipment.equipment.find(e=>e.id==='phb-bo-stick'),old.equipment.find(e=>e.id==='phb-bo-stick'));
 assert.match(jo.fields['Hand-held AC adjustments (UA p.27)'],/AC 0 through 10/);assert.match(jo.fields['Hand-held AC adjustments (PHB p.38)'],/AC 2 through 10/);
 assert.match(jo.fields['Approx. weight (UA p.26)'],/gp-weight/);
});

test('all fourteen field targets stay page-bound while the separately cited note remains ordered context',()=>{
 const bindings=inventory.fieldEvidenceBindings.filter(b=>b.itemId==='ua-jo-stick'&&b.sourceCategory==='equipment-field');assert.equal(bindings.length,14);assert.equal(catalog.regions.length,5);
 for(const binding of bindings){assert.equal(binding.regionIds.length,1);const region=catalog.regions.find(r=>r.id===binding.regionIds[0]);assert.equal(region.book,binding.book);assert.equal(region.printedPage,binding.printedPage);assert.equal(region.pdfPage,binding.pdfPage);assert.equal(region.role,'row');}
 const oldManifest=unzip('tests/fixtures/citation-continuations-before-jo.json.gz'),manifest=read('research/citation-continuations.json');assert.deepEqual(manifest.groups.slice(0,190),oldManifest.groups);assert.equal(manifest.groups.length,joIntegration.currentRuntimeCounts.groups);
 const group=manifest.groups.at(-1);assert.equal(group.itemId,'ua-jo-stick');assert.deepEqual(group.segments.map(s=>[s.order,s.role,s.printedPage]),[[1,'opening',26],[2,'continuation',27]]);
 assert.ok(jo.references.some(ref=>ref.book==='UA'&&ref.pages.includes(27)&&ref.role==='supporting-context'&&ref.continuationGroupId===group.id));
 const note=catalog.regions.find(r=>r.id==='jo-stick-ua26-facing-general-note');assert.equal(note.contextForRegionId,'jo-stick-ua26-row');assert.doesNotMatch(note.checkedFields.sourceExcerpt,/caltrop/i);
 const validation=validateContinuationManifest(manifest,{data,catalogRoot:resolve(root,'dist')});assert.equal(validation.groups,joIntegration.currentRuntimeCounts.groups);assert.equal(validation.segments,joIntegration.currentRuntimeCounts.members);
});

test('redundant Jo locators use explicit XYWH and the bound crop/page frame without changing the approved focus',()=>{
 const historical=read('tests/fixtures/jo-stick-page-bound-fields-before.json'),proof=read('research/source-audit-batch6-jo-locator-frame-derivation.json'),region=catalog.regions[0];
 assert.deepEqual(region.focusRects,historical.catalog.regions[0].focusRects);assert.equal(region.sha256,historical.catalog.regions[0].sha256);
 assert.deepEqual(region.sourceRowImagePixels,{x:5,y:674,width:518,height:22});assert.equal(region.sourcePageCoordinate.format,'xywh');
 const [x,y,w,h]=region.focusRects[0];assert.ok(Math.abs(region.sourceRowImagePixels.y-y*region.height)<1e-9);
 assert.equal(proof.imagePixelsPerPdfPoint,2);assert.deepEqual(proof.sourcePdf.pageRectPoints,proof.sourcePdf.cropBoxPoints);assert.deepEqual(proof.sourcePdf.pageRectPoints,proof.sourcePdf.mediaBoxPoints);
 const [l,t,r,b]=region.boundsPdfPoints,[,,pw,ph]=proof.sourcePdf.pageRectPoints;const expected={x:(l+x*(r-l))/pw,y:(t+y*(b-t))/ph,width:w*(r-l)/pw,height:h*(b-t)/ph};for(const key of Object.keys(expected))assert.ok(Math.abs(expected[key]-region.sourcePageCoordinate.rect[key])<1e-12,key);
});

test('the fifth unextracted price preserves the exact historical four and cannot become source absence or a Bo estimate',()=>{
 const registration=read('research/source-audit-batch6-jo-unextracted-price.json'),historicalReceipt=read('research/source-audit-batch5-null-price-notes.json');
 const args={registration,beforeEquipment:old,currentEquipment:equipment,historicalReceipt,data,inventory};
 const addition=validateJoUnextractedPriceRegistration(args);assert.equal(addition.itemId,'ua-jo-stick');assert.equal(addition.sourceAbsence,false);assert.equal(addition.valueReviewed,false);assert.equal(loadJoUnextractedPriceRegistration({repoRoot:root,data,inventory}).recordSha256,hash(jo));
 for(const edit of [a=>a.registration.owner.itemId='phb-bo-stick',a=>a.registration.sourcePriceAbsenceReviewed=true,a=>a.registration.extractedPriceReviewed=true,a=>a.registration.semanticPass=true,a=>a.data.equipment.find(e=>e.id==='ua-jo-stick').price={amount:40,currency:'gp'},a=>a.data.equipment.find(e=>e.id==='ua-jo-stick').suggestedPrice={amount:5,currency:'sp'},a=>a.inventory.siteClaims.find(c=>c.itemId==='phb-club').itemId='another-unknown',a=>a.registration.currentUnextractedIds[0]='another-unknown',a=>a.beforeEquipment.equipment.push(structuredClone(jo))]){const bad=structuredClone(args);edit(bad);assert.throws(()=>validateJoUnextractedPriceRegistration(bad));}
});


test('fourteen value activations bind exact source rows and the peer receipt while unrelated current data reverses byte-for-byte',()=>{
 const activationPath='research/source-audit-batch6-jo-field-value-activation.json',activationBytes=readFileSync(resolve(root,activationPath)),activation=JSON.parse(activationBytes),activationSha=createHash('sha256').update(activationBytes).digest('hex');
 assert.equal(createHash('sha256').update(readFileSync(resolve(root,activation.sourcePeer.path))).digest('hex'),activation.sourcePeer.sha256);assert.equal(activation.records.length,14);assert.equal(activation.sourcePeer.sha256,'2393845114b9a2b9d29518c8464374b1e7312efd61dfbf68ace17afd4e3ed95c');
 for(const record of activation.records){const name=record.fieldPointer.slice('/fields/'.length).replaceAll('~1','/').replaceAll('~0','~');assert.equal(jo.fields[name],record.expectedValue);assert.equal(hash(jo.fields[name]),record.valueSha256);const source=jo.fieldSources[name];assert.equal(source.book,record.source.book);assert.ok(source.pages.includes(record.source.printedPage));assert.equal(source.verification.sourceValueReview.evidence,activationPath);assert.equal(source.verification.sourceValueReview.evidenceSha256,activationSha);const region=catalog.regions.find(region=>region.id===record.source.regionId);assert.equal(region.sourceRowId,record.source.rowId);assert.equal(region.sha256,record.source.imageSha256);assert.equal(hash(region.focusRects),record.source.focusSha256);assert.equal(catalog.sources[record.source.book].sha256,record.source.sourcePdfSha256);assert.equal(source.verification.sourceValueReview.status,'confirmed');assert.equal(source.verification.sourceValueReview.scope,'extracted-equipment-field-value');for(const flag of ['priceReview','contextReview','defaultSelectionReview','wholeItemReview'])assert.equal(record[flag],false);}
 assert.equal(createHash('sha256').update(readBeforeJoBytes('dist/data.json')).digest('hex'),'2b803d29cccd83ffd8418818abddf04b66204c82cebb8afba13f7a8226c6583c');
 assert.equal(jo.incomplete,true);assert.match(jo.status,/metadata review remains pending/);assert.equal(jo.price,null);
});

test('all4545 published source bindings remain exact while only the registered twenty Jo/Caltrop bindings are added',()=>{
 const before=unzip('tests/fixtures/jo-search079-field-binding-universe-before.json.gz');assert.equal(before.masterCommit,'079f4ec03924b32d8b340ee349012c9a8237066e');assert.equal(before.denominator,4545);assert.equal(before.bindings.length,4545);assert.equal(inventory.fieldEvidenceBindings.length,4565);
 const remaining=new Map();for(const row of before.bindings){const key=hash(row);remaining.set(key,(remaining.get(key)||0)+1);}const additions=[];for(const row of inventory.fieldEvidenceBindings){const key=hash(row),count=remaining.get(key)||0;if(count)remaining.set(key,count-1);else additions.push(row);}assert.ok([...remaining.values()].every(count=>count===0),'all incoming matrix/class bindings and their exact review/source metadata remain');
 assert.equal(additions.length,20);assert.equal(additions.filter(row=>row.itemId==='ua-jo-stick').length,19);assert.equal(additions.filter(row=>row.itemId==='ua-caltrop').length,1);assert.ok(additions.every(row=>row.collection==='equipment'&&row.sourceOwner.collection==='equipment'&&row.sourceOwner.itemId===row.itemId));
 const handoff=read('research/gaps-limitations-next-task.json'),gaps=read('dist/coverage-gaps.json'),queue=handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues,counts=gaps.coverage.counts;
 assert.equal(queue.fieldEvidenceBindingsDenominator,4565);assert.equal(queue.recordTargetResolvedBindings,2);assert.equal(counts.recordTargetResolvedBindings,2);assert.equal(queue.emptyRegionTargetBindings+queue.regionTargetResolvedBindings+queue.recordTargetResolvedBindings,4565);assert.equal(queue.fieldTargetsReviewed+queue.fieldTargetsPending,4565);assert.equal(counts.fieldEvidenceBindingDenominator,4565);assert.equal(counts.reviewedFieldTargets+counts.pendingFieldTargets,4565);
 assert.equal(jo.price,null);assert.equal(Object.hasOwn(jo,'suggestedPrice'),false);
});
