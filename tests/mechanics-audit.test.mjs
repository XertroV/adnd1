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
 assert.equal(ledger.counts.records,892);
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
