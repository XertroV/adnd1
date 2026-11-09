import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {buildSourceOwnerIdentityAudit} from '../tools/source-owner-identity-audit.mjs';
import {
  assertApprovedUaClassSource,
  assertCompiledWeaponBindingPreservation,
  assertCurrentUaSourceOwnerCohort,
  assertCurrentWeaponOwnerAdditions,
  assertUaSourceActivationEvidence,
  assertUaSourceContextBindingCohort,
  assertWeaponPendingBindingCohort,
  classifyUaSourceContextBinding,
  uaSourceCohortPins,
} from './helpers/ua-source-current-cohort.mjs';

const readJson=path=>JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const clone=value=>structuredClone(value);
const currentData=readJson('dist/data.json');
const rawClasses=readJson('classes.json').classes;
const currentInventory=readJson('research/price-source-inventory.json');
const classRows=currentData.classes.flatMap(owner=>(owner.references||[]).flatMap(reference=>reference.evidenceBindings||[]));
const uaRows=classRows.filter(row=>row.sourceCategory==='record-reference'&&row.book==='UA'&&row.contextStatus==='context-not-assessed');

function rejects(fn){assert.throws(fn);}
function classOwner(data,id){return data.classes.find(row=>row.id===id);}

test('pinned source-phase cohort is exact and remains ungraded',()=>{
  assert.deepEqual(assertCurrentUaSourceOwnerCohort(clone(currentData)),{
    spellBodyOwners:5,classGuidanceOwners:7,newGuidanceLeaves:21,newClassReferences:24,
    rules:152,equipment:192,matrices:4,classes:16,spells:638,weaponLiteralCells:555,releaseCounters:6,
  });
  assert.deepEqual(assertApprovedUaClassSource(clone(rawClasses)),{owners:7,guidanceLeaves:21,source:'raw classes.json'});
  assert.deepEqual(assertApprovedUaClassSource(clone(currentData)),{owners:7,guidanceLeaves:21,references:24});
  assert.deepEqual(assertCurrentWeaponOwnerAdditions(clone(currentData)),true);
  assert.deepEqual(assertUaSourceActivationEvidence(),{
    sourceCommit:'6b3cfc8cb421a2c1fc2379c38abebe2075634981',
    baseCommit:'6717c6f22bbf2f2b421327e4c8561b1d81df00d4',
    dataSha256:'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3',
    spellBodyOwners:5,classOwners:7,guidanceLeaves:21,newReferences:24,
    counters:{uniqueRegions:30,scopedRegions:32,referencedImages:18,fieldEvidenceBindings:24,classFieldEvidenceBindings:24,regionBoundBindings:24},
    mechanicsReviewRecords:1215,
  });
  assert.deepEqual(assertUaSourceActivationEvidence(),assertUaSourceActivationEvidence(),'active proof is re-read on each call');
  assert.deepEqual(uaSourceCohortPins,{v27Commit:'6717c6f22bbf2f2b421327e4c8561b1d81df00d4',sourceCommit:'6b3cfc8cb421a2c1fc2379c38abebe2075634981',v27DataSha256:'6643d7b58c90d982244f1d8f03b6f03a7587446ba25c402be8f9a81a8b701f8f',currentDataSha256:'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3',activationManifestSha256:'fd8ab259ca804a99417b5c9c975821d92b67b7fda5a423cce7944d746752f338',controlledDeltaSha256:'b72a2ece0a4be454903596ea537cd7e4ac74377911a6f58ec49e978e1716dec6'});
});

test('all 24 class context references classify by exact owner and pointer',()=>{
  const selected=assertUaSourceContextBindingCohort(classRows);
  assert.equal(selected.length,24);
  assert.equal(uaRows.length,24);
  const classified=classifyUaSourceContextBinding(selected[0]);
  assert.equal(classified.kind,'ua-class-source-context-identity-match');
  assert.equal(classified.classificationScope,'owner-and-pointer-only; source evidence is not validated');
  const identityOnly=selected.map(({collection,itemId,fieldPointer})=>({collection,itemId,fieldPointer}));
  rejects(()=>assertUaSourceContextBindingCohort(identityOnly));
  const historicalFixtureBytes=readFileSync(new URL('./fixtures/ua-source-thin-context-bindings-before-v1.json.gz',import.meta.url));
  assert.equal(createHash('sha256').update(historicalFixtureBytes).digest('hex'),'4a412690b8c74ba858a7fc4f1ae20b22878516dc6992f65b9b1c8c47fc808061','preserved actual thin-row fixture bytes');
  const historicalProbe=JSON.parse(gunzipSync(historicalFixtureBytes));
  assert.equal(historicalProbe.helperPreimageSha256,'343d97709d9331a7c22b81639ea6c21211b803679f7130201fd11c795c08019a');
  assert.equal(createHash('sha256').update(Buffer.from(historicalProbe.helperPreimageUtf8,'utf8')).digest('hex'),historicalProbe.helperPreimageSha256,'preserved pre-fix helper source bytes');
  assert.equal(historicalProbe.actualProbe.accepted,true,'preserved actual pre-fix probe records the prior false acceptance');
  assert.equal(historicalProbe.actualProbe.resultCount,24);
  assert.equal(historicalProbe.newSourceApprovals,0);
  assert.equal(historicalProbe.activeDataChanges,0);
  rejects(()=>assertUaSourceContextBindingCohort(historicalProbe.actualProbe.inputRows));
  const reportBindings=buildSourceOwnerIdentityAudit().report.evidenceBindings.attachedBindingPaths;
  assert.equal(assertUaSourceContextBindingCohort(reportBindings,'bindingItemId').length,24,'exact native source-owner report projection is accepted');
  assert.equal(classifyUaSourceContextBinding({collection:'classes',itemId:'assassin',fieldPointer:'/references/0'}),null,'old PHB source reference is not reclassified');
  rejects(()=>assertUaSourceContextBindingCohort(selected.slice(1)));
  const duplicate=[...selected,selected[0]];
  rejects(()=>assertUaSourceContextBindingCohort(duplicate));
  for(const [key,value] of [['book','PHB'],['printedPage',999],['catalog','wrong.json'],['contextStatus','assessed'],['sourceValueStatus','checked'],['targetReview',{status:'pass'}],['reviewStatus','field-target-reviewed']]){
    const rows=clone(selected);rows[0][key]=value;
    rejects(()=>assertUaSourceContextBindingCohort(rows));
  }
  const wrongRegion=clone(selected);wrongRegion[0].regionIds=['forged-region'];
  rejects(()=>assertUaSourceContextBindingCohort(wrongRegion));
  const wrongPointer=clone(selected);wrongPointer[0].fieldPointer='/effect';
  rejects(()=>assertUaSourceContextBindingCohort(wrongPointer));
  const reportRow=clone(reportBindings).find(row=>row.bindingItemId==='fighter'&&row.fieldPointer==='/references/0');
  for(const mutate of [
    row=>{delete row.catalog;},
    row=>{row.extra='unreviewed';},
    row=>{row.bindingSha256='0'.repeat(64);},
    row=>{row.attachmentPath='/references/1/evidenceBindings/0';},
    row=>{row.attachmentOwner.itemId='ranger';},
    row=>{row.sourceObjectPointer='/effect';},
    row=>{row.book='PHB';},
    row=>{row.printedPage=999;},
    row=>{row.regionIds=['forged'];},
    row=>{row.reviewStatus='field-target-reviewed';},
    row=>{row.disposition='foreign-owner-binding';},
  ]){const malformed=clone(reportBindings);const target=malformed.find(row=>row.bindingItemId==='fighter'&&row.fieldPointer==='/references/0');mutate(target);rejects(()=>assertUaSourceContextBindingCohort(malformed,'bindingItemId'));}
  assert.ok(reportRow);
});

test('canonical inventory retains all 4,681 whole bindings and the exact 24 context additions',()=>{
  assert.deepEqual(assertCompiledWeaponBindingPreservation(),{priorWholeObjects:4681,addedUaContextReferences:24,total:4705,manualDeclarations:807,weaponDeclarations:50});
  const current=clone(currentInventory);
  const additions=current.fieldEvidenceBindings.filter(row=>row.collection==='classes'&&['fighter','ranger','ua-cavalier','ua-barbarian','ua-thief-acrobat','ua-paladin','ua-druid'].includes(row.itemId)&&row.fieldPointer.startsWith('/references/'));
  assert.equal(additions.length,24);
  assert.equal(assertUaSourceContextBindingCohort(current.fieldEvidenceBindings).length,24);
  assert.equal(assertWeaponPendingBindingCohort(currentInventory.fieldEvidenceBindings).length,107);
  const changed=clone(currentInventory);changed.fieldEvidenceBindings[0].book='UA';
  rejects(()=>assertCompiledWeaponBindingPreservation(changed));
  const weaponRows=clone(currentInventory.fieldEvidenceBindings);
  const pending=weaponRows.find(row=>row.collection==='rules'&&row.itemId==='ua-hurled-weapons-and-missiles-table');
  pending.reviewStatus='field-target-reviewed';
  rejects(()=>assertWeaponPendingBindingCohort(weaponRows));
});

test('data guard rejects edits outside the explicit UA source-only allowlist',()=>{
  const cases=[
    data=>{data.rules.find(x=>x.id==='phb-hurled-weapons-and-missiles-table').table.rows[0].cells[0]='forged';},
    data=>{data.equipment[0].name+=' changed';},
    data=>{data.matrices[0].unauthorized='changed';},
    data=>{data.progressionExplainer.description+=' unapproved';},
    data=>{classOwner(data,'fighter').unapproved='extra';},
    data=>{classOwner(data,'fighter').references.pop();},
    data=>{classOwner(data,'fighter').references[0].pages[0]=999;},
    data=>{const spell=data.spells.find(x=>x.id==='ua-magic-user-bind');spell.sourceValueStatus='approved';},
    data=>{data.release.excerpts.regions+=1;},
  ];
  for(const mutate of cases){const candidate=clone(currentData);mutate(candidate);rejects(()=>assertCurrentUaSourceOwnerCohort(candidate));}
});

test('raw class guard permits only the reviewed appended guidance leaves',()=>{
  const mutations=[
    rows=>{rows.find(x=>x.id==='fighter').hitDie='d20';},
    rows=>{rows.find(x=>x.id==='fighter').guidance[0]='changed earlier leaf';},
    rows=>{rows.find(x=>x.id==='fighter').unreviewed='extra';},
    rows=>{rows.find(x=>x.id==='ranger').guidance.pop();},
    rows=>{rows.find(x=>x.id==='ua-cavalier').guidance.push('extra');},
    rows=>{rows.find(x=>x.id==='assassin').guidance.push('unauthorized owner');},
  ];
  for(const mutate of mutations){const candidate=clone(rawClasses);mutate(candidate);rejects(()=>assertApprovedUaClassSource(candidate));}
});

test('strict JSON boundary rejects executable, hidden, cyclic, and non-finite inputs',()=>{
  const invalid=[];
  const accessor={};Object.defineProperty(accessor,'classes',{enumerable:true,get(){return currentData.classes;}});invalid.push(accessor);
  const hidden=clone(currentData);Object.defineProperty(hidden,'hidden',{value:true});invalid.push(hidden);
  const cycle={};cycle.self=cycle;invalid.push(cycle);
  const sparse=[];sparse.length=2;sparse[1]='gap';invalid.push(sparse);
  invalid.push(new Proxy({},{}));
  invalid.push({n:NaN});invalid.push({n:Infinity});invalid.push({n:-0});
  invalid.push({[Symbol('hidden')]:true});invalid.push({n:1n});invalid.push({fn(){}});
  for(const value of invalid)rejects(()=>assertApprovedUaClassSource(value));
});
