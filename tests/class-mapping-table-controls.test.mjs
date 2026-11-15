import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const bytes=read('tests/fixtures/class-mapping-table-controls-before-v1.json.gz');
assert.equal(createHash('sha256').update(bytes).digest('hex'),'9fa3df3e9f46486b9536a2910e939fed8f88daba073cc9865981dbcc6fd1b24d');
const fixture=JSON.parse(gunzipSync(bytes));
const pointer=(owner,path)=>path.slice(1).split('/').reduce((at,key)=>at[key],owner);
function currentBlock(){const app=read('dist/app.js').toString();const start=app.indexOf('function displaySourceValue('),end=app.indexOf('function ruleTableHTML(',start);assert(start>=0&&end>start);return app.slice(start,end);}
function runtime(block){const context=vm.createContext({inlineSourceChip:()=>'<button class="recorded-source"></button>'});vm.runInContext(fixture.books,context);vm.runInContext(fixture.citations,context);vm.runInContext(fixture.sharedProductionHelpers+'\n'+block+'\nthis.renderFact=(owner,fact)=>tableFactSourceChip(owner,fact,"regression","recorded-source");',context);return context;}
const ownerFor=(data,row)=>data.find(owner=>owner.id===row.itemId);

test('preserved actual before renderer loses exactly29 new bound controls',()=>{
 assert.deepEqual(fixture.denominator,{ruleOwners:219,tableOwners:54,facts:555,bound:549,rendered:520,boundUnreachable:29,unbound:6});
 assert.equal(fixture.failures.length,29);const old=runtime(fixture.beforeHelperBlock);
 for(const row of fixture.failures){const owner=ownerFor(fixture.actualOwnerObjects,row),fact=pointer(owner,row.fieldPointer);assert.equal(fact.sourceReference.evidenceBindings.length,1);assert(!old.renderFact(owner,fact).includes('<button'),row.itemId+row.fieldPointer);}
});

test('current production helper exposes all29 captured controls and preserves pending evidence',()=>{
 const current=runtime(currentBlock()),owners=structuredClone(fixture.actualOwnerObjects),before=JSON.stringify(owners);
 for(const row of fixture.failures){const owner=ownerFor(owners,row),fact=pointer(owner,row.fieldPointer),binding=fact.sourceReference.evidenceBindings[0];assert(current.renderFact(owner,fact).includes('<button'),row.itemId+row.fieldPointer);assert.equal(binding.reviewStatus,'field-target-pending');assert.equal(binding.targetReview,null);assert.equal(binding.contextStatus,'context-not-assessed');assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');}
 assert.equal(JSON.stringify(owners),before,'renderer must not mutate reference or review evidence');
});

test('captured new source controls fail closed on owner/path/source/review/geometry mutations',()=>{
 const current=runtime(currentBlock());
 const mutations=[(owner,ref,b)=>{b.sourceOwner.itemId='wrong';},(owner,ref,b)=>{b.sourceObjectPointer='/references/999';},(owner,ref,b)=>{b.sourceSha256='0'.repeat(64);},(owner,ref,b)=>{b.pdfPage=null;},(owner,ref,b)=>{b.regionIds=['wrong'];},(owner,ref,b)=>{b.targetReview={scope:'unreviewed'};},(owner,ref,b)=>{b.reviewStatus='field-target-reviewed';},(owner,ref,b)=>{b.contextStatus='reviewed';},(owner,ref,b)=>{b.highlightCoordinates[0].rects=[[0,0,-1,1]];}];
 for(const row of fixture.failures)for(const [index,mutate]of mutations.entries()){const owner=structuredClone(ownerFor(fixture.actualOwnerObjects,row)),fact=pointer(owner,row.fieldPointer),ref=fact.sourceReference;mutate(owner,ref,ref.evidenceBindings[0]);assert(!current.renderFact(owner,fact).includes('<button'),`${row.itemId}${row.fieldPointer} mutation${index}`);}
});
