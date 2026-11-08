import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLedger,validateLedger,dataHash,fieldsFor} from '../tools/mechanics-audit.mjs';
const data=()=>({spells:[{id:'s',class:'Cleric',level:1,fields:{Range:'6',Duration:null},effect:['old'],conditions:[],exceptions:['Gap: unknown']}],equipment:[{id:'e',price:null,fields:{Damage:'1'},summary:'Summary'}],rules:[],classes:[{id:'c',xpRows:[{level:1,xp:0,book:'PHB',pages:[20],label:'Novice'}]}],matrices:[],progressionExplainer:{description:'Description',sections:[{id:'a',label:'label',description:'Body',references:[{book:'PHB'}]}]}});
const proposals=()=>[{checker:'reviewer',records:[{id:'s',collection:'spells',checkedPaths:['/fields','/effect','/conditions'],sources:[{book:'PHB',page:1,pdfPage:2,sourceSha256:'a'}],unresolved:[{path:'/fields/Range',reason:'Not yet visually compared with source.'}],changes:[{path:'/effect/0',oldValue:'old',newValue:'new'}]},{id:'e',collection:'equipment',checkedPaths:['/price'],sources:[],changes:[{path:'/price',oldValue:null,newValue:{amount:2,currency:'gp'}}]}]}];
test('denominator excludes provenance and preserves empty and null mechanics',()=>{
 const f=fieldsFor('classes',data().classes[0]); assert.deepEqual(f.map(x=>x.path),['/xpRows/0/level','/xpRows/0/xp']);
 const ledger=buildLedger(data(),proposals()); assert.equal(ledger.counts.records,4);
 const s=ledger.records.find(r=>r.id==='s'); assert.equal(s.fields.find(x=>x.path==='/fields/Range').status,'unchecked');
 assert.equal(s.fields.find(x=>x.path==='/fields/Duration').status,'not-extracted');
 assert.equal(s.fields.find(x=>x.path==='/exceptions/0').status,'not-extracted');
 assert.equal(s.fields.find(x=>x.path==='/conditions').status,'source-checked');
 assert.equal(s.fields.find(x=>x.path==='/effect/0').status,'correction-proposed');
 assert.equal(ledger.records.find(r=>r.id==='e').fields.find(x=>x.path==='/price').status,'correction-proposed');
 assert.ok(ledger.counts.uncheckedFields>0); assert.ok(ledger.percentages.inspectedFields<100);
});
test('source-binding and region-review metadata do not inflate class mechanics leaves',()=>{
 const item={id:'c',xpRows:[{level:1,xp:0,book:'PHB',pages:[20],label:'Novice'}],levelChanges:[{level:2,changes:['gain proficiency'],book:'PHB',pages:[21]}]};
 const before=fieldsFor('classes',item);
 item.xpRows[0].evidenceBindings=[{fieldPointer:'/xpRows/0',sourceObjectPointer:'/xpRows/0',sourceOwner:{collection:'classes',itemId:'c'},book:'PHB',printedPage:20,regionIds:[],reviewStatus:'field-target-pending',sourcePages:[20]}];
 item.xpRows[0].regionReviews=[{regionId:'xp-row',status:'unreviewed',sourceSha256:'a'.repeat(64),imageSha256:'b'.repeat(64),review:{status:'pending'}}];
 item.levelChanges[0].evidenceBindings=[{fieldPointer:'/levelChanges/0',sourceObjectPointer:'/levelChanges/0',book:'PHB',printedPage:21,regionIds:[],reviewStatus:'field-target-pending'}];
 item.levelChanges[0].regionReviews=[{regionId:'level-change',status:'unreviewed',recordedReview:null}];
 assert.deepEqual(fieldsFor('classes',item),before);
 assert.deepEqual(before.map(field=>field.path),['/xpRows/0/level','/xpRows/0/xp','/levelChanges/0/level','/levelChanges/0/changes/0']);
});
test('transport metadata does not stale whole-object price or XP reviews, but game-value edits still do',()=>{
 const d=data();
 d.equipment[0].price={amount:2,currency:'gp',evidenceBindings:[{fieldPointer:'/price',regionIds:[],reviewStatus:'field-target-pending'}],regionReviews:[{regionId:'price-row',status:'unreviewed'}]};
 const priceLedger=buildLedger(d,proposals());
 assert.equal(priceLedger.records.find(r=>r.id==='e').fields.find(f=>f.path==='/price/amount').status,'corrected-and-checked');
 assert.deepEqual(validateLedger(priceLedger,d),[]);
 const priceChanged=structuredClone(d);priceChanged.equipment[0].price.amount=3;
 const stalePrice=buildLedger(priceChanged,priceLedger.reviewRecords,{alreadyNormalized:true});
 assert.equal(stalePrice.records.find(r=>r.id==='e').fields.find(f=>f.path==='/price/amount').status,'stale-proposal');

 const xpData=data();xpData.classes[0].xpRows=[{level:1,xp:100,book:'PHB',pages:[20],evidenceBindings:[{fieldPointer:'/xpRows/0',regionIds:[],reviewStatus:'field-target-pending'}],regionReviews:[{regionId:'xp-row',status:'unreviewed'}]}];
 const xpProposals=[{checker:'reviewer',records:[{id:'c',collection:'classes',checkedPaths:['/xpRows'],sources:[],changes:[{path:'/xpRows',oldValue:[{level:1,xp:0,book:'PHB',pages:[20]}],newValue:[{level:1,xp:100,book:'PHB',pages:[20]}]}]}]}];
 const xpLedger=buildLedger(xpData,xpProposals);
 assert.equal(xpLedger.records.find(r=>r.id==='c').fields.find(f=>f.path==='/xpRows/0/xp').status,'corrected-and-checked');
 assert.deepEqual(validateLedger(xpLedger,xpData),[]);
 const xpChanged=structuredClone(xpData);xpChanged.classes[0].xpRows[0].xp=101;
 const staleXp=buildLedger(xpChanged,xpLedger.reviewRecords,{alreadyNormalized:true});
 assert.equal(staleXp.records.find(r=>r.id==='c').fields.find(f=>f.path==='/xpRows/0/xp').status,'stale-proposal');
 assert.equal(dataHash(xpData),dataHash({...xpData,classes:[{...xpData.classes[0],xpRows:[{...xpData.classes[0].xpRows[0],evidenceBindings:[{regionIds:['other']}],regionReviews:[{status:'current-reviewed'}]}]}]}));
 assert.notEqual(dataHash(xpData),dataHash({...xpData,classes:[{...xpData.classes[0],xpRows:[{...xpData.classes[0].xpRows[0],xp:101}]}]}));
});
test('changed values are checked only if current equals proposed new value',()=>{
 const d=data(); d.spells[0].effect[0]='new'; const a=buildLedger(d,proposals());assert.equal(a.records[0].fields.find(x=>x.path==='/effect/0').status,'corrected-and-checked');
 d.spells[0].effect[0]='something else';const stale=buildLedger(d,proposals());assert.equal(stale.records[0].fields.find(x=>x.path==='/effect/0').status,'stale-proposal');assert.equal(stale.validation.staleChanges.length,1);
 assert.ok(validateLedger(stale,d).some(x=>x.includes('proposed changes')));
});
test('validation detects stale data hash and tampered counts',()=>{
 const d=data(), ledger=buildLedger(d,proposals());assert.deepEqual(validateLedger(ledger,d),[]);assert.equal(ledger.input.sha256,dataHash(d));
 const changed=data();changed.spells[0].level=2;assert.ok(validateLedger(ledger,changed).some(x=>x.includes('hash')));
 ledger.counts.totalFields++;assert.ok(validateLedger(ledger,d).some(x=>x.includes('counts')));
});
test('explicit printed contradiction is conflict; ordinary pending reason is not',()=>{
 const p=proposals();p[0].records[0].unresolved=[{path:'/fields/Range',reason:'Printed source tables disagree about range.'}];
 const a=buildLedger(data(),p);assert.equal(a.records[0].fields.find(x=>x.path==='/fields/Range').status,'source-conflict');
});

test('validation rejects altered field statuses even if totals remain unchanged',()=>{
 const d=data(), ledger=buildLedger(d,proposals());ledger.records[0].fields[0].status='source-checked';
 assert.ok(validateLedger(ledger,d).some(x=>x.includes('field values')));
});

test('saved checks cannot silently bless later unreviewed value changes',()=>{
 const d=data(), ledger=buildLedger(d,proposals());d.spells[0].fields.Range='999';
 const rebuilt=buildLedger(d,ledger.reviewRecords,{alreadyNormalized:true});
 assert.equal(rebuilt.records[0].fields.find(f=>f.path==='/fields/Range').status,'stale-proposal');
 assert.ok(validateLedger(rebuilt,d).some(e=>e.includes('changed without')));
});

test('reviewed editorial advice is tracked without counting as source-checked mechanics',()=>{
 const d=data(), p=proposals();p[0].records[1].reviewedPaths=[{path:'/summary',result:'Editorial advice rather than source mechanics'}];
 const ledger=buildLedger(d,p);assert.equal(ledger.records.find(r=>r.id==='e').fields.find(f=>f.path==='/summary').status,'editorial-reviewed');assert.equal(ledger.counts.editorialReviewedFields,1);
});

test('committed audit snapshot matches current assembled values and its stored evidence',async()=>{
 const {readFile}=await import('node:fs/promises');
 const ledger=JSON.parse(await readFile(new URL('../research/mechanics-audit-progress.json',import.meta.url)));
 const current=JSON.parse(await readFile(new URL('../dist/data.json',import.meta.url)));
 assert.deepEqual(validateLedger(ledger,current),[]);
 const expected=['rules','spells','equipment','matrices','classes'].flatMap(collection=>(current[collection]||[]).map(item=>`${collection}:${item.id}`));
 if(current.progressionExplainer)expected.push(`progressionExplainer:${current.progressionExplainer.id||'progression-explainer'}`);
 assert.equal(ledger.counts.records,expected.length);
 assert.deepEqual(ledger.records.map(record=>`${record.collection}:${record.id}`).sort(),expected.sort());
});

test('rewriting a source-conflict or editorial note does not count it as verified mechanics',()=>{
 const d=data(),p=proposals();d.spells[0].effect[0]='new';
 p[0].records[0].unresolved=[{path:'/effect/0',reason:'Printed source tables still conflict.'}];
 let ledger=buildLedger(d,p);assert.equal(ledger.records[0].fields.find(f=>f.path==='/effect/0').status,'source-conflict');
 p[0].records[0].unresolved=[];p[0].records[0].reviewedPaths=[{path:'/effect/0',result:'Editorial audit-status wording'}];
 ledger=buildLedger(d,p);assert.equal(ledger.records[0].fields.find(f=>f.path==='/effect/0').status,'editorial-reviewed');
});

test('a conflict flag cannot conceal an unreviewed change to a saved value',()=>{
 const d=data(),p=proposals();p[0].records[0].unresolved=[{path:'/fields/Range',reason:'Printed source tables conflict.'}];
 const initial=buildLedger(d,p);d.spells[0].fields.Range='unreviewed';
 const ledger=buildLedger(d,initial.reviewRecords,{alreadyNormalized:true});
 assert.equal(ledger.records[0].fields.find(f=>f.path==='/fields/Range').status,'stale-proposal');
});

test('an accepted parent correction cannot promote a retained extraction gap',()=>{
 const d=data(),p=proposals();
 d.spells[0].exceptions=['Gap: schedule not reproduced'];
 p[0].records[0].changes.push({path:'/exceptions',oldValue:['Gap: unreadable range','Gap: schedule not reproduced'],newValue:['Gap: schedule not reproduced']});
 p[0].records[0].changes.push({path:'/fields/Duration',oldValue:'uncertain',newValue:null});
 const ledger=buildLedger(d,p),fields=ledger.records.find(r=>r.id==='s').fields;
 for(const path of ['/exceptions/0','/fields/Duration']) {
  const f=fields.find(f=>f.path===path);assert.equal(f.status,'not-extracted');assert.equal(f.inspected,true);
 }
 d.spells[0].exceptions=['Gap: changed without review'];
 assert.equal(buildLedger(d,p).records.find(r=>r.id==='s').fields.find(f=>f.path==='/exceptions/0').status,'stale-proposal');
});

test('suggested prices are editorial even when checked, and later edits lose review',()=>{
 const d=data(),p=proposals();
 d.equipment[0].suggestedPrice={amount:2,currency:'sp',unit:'one item',rationale:'Editorial comparison',comparisons:[{amount:1,currency:'gp',book:'PHB',pages:[35]}]};
 p[0].records[1].checkedPaths.push('/suggestedPrice');
 const ledger=buildLedger(d,p),fields=ledger.records.find(r=>r.id==='e').fields.filter(f=>f.path.startsWith('/suggestedPrice'));
 assert.equal(fields.length,4);assert.ok(fields.every(f=>f.status==='editorial-reviewed'));
 d.equipment[0].suggestedPrice.amount=200;
 const changed=buildLedger(d,ledger.reviewRecords,{alreadyNormalized:true});
 assert.equal(changed.records.find(r=>r.id==='e').fields.find(f=>f.path==='/suggestedPrice/amount').status,'stale-proposal');
 assert.ok(validateLedger(changed,d).some(e=>e.includes('changed without')));
});
