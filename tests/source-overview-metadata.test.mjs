import{readFileSync}from'node:fs';
import assert from'node:assert/strict';
import test from'node:test';
import{createRequire}from'node:module';
const require=createRequire(import.meta.url);
const books=require('../dist/books.js');
const citations=require('../dist/citations.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const rules=JSON.parse(readFileSync(new URL('../rules.json',import.meta.url),'utf8'));
const sources=rules.sources;

test('source registry names all five supplied PDFs and their physical page counts',()=>{
 assert.deepEqual(sources.map(source=>source.id),['PHB','UA','DMG','MM','MM2']);
 assert.equal(sources.reduce((sum,source)=>sum+source.pdfPages,0),776);
 assert.ok(sources.every(source=>source.sourceFile&&/^[a-f0-9]{64}$/.test(source.sourceSha256)));
 assert.deepEqual(sources.map(source=>source.pdfPages),[130,130,240,114,162]);
 assert.deepEqual(sources.map(source=>source.printedLastPage),[128,128,238,112,160]);
});

test('DMG p.175 remains a missing printed page with separate limited supplement evidence',()=>{
 const dmg=sources.find(source=>source.id==='DMG');
 assert.deepEqual(dmg.gaps,[175]);
 assert.equal(dmg.printedLastPage,238);
 assert.match(dmg.coverage,/exact printing is not established/i);
 assert.match(dmg.coverage,/limited excerpts are available as source evidence/i);
 assert.equal(books.supplementalEvidence('DMG',175).published,false,'the complete private JPEG remains unpublished');
 assert.equal(books.availability('DMG',175),'missing');
 assert.equal(books.evidenceAvailability('DMG',175),'supplemental');
 assert.deepEqual(books.pdfPage('DMG',175),null);
});

test('DMG PDF 239 and 240 are typed unnumbered leaves with no printed-page mapping',()=>{
 const dmg=sources.find(source=>source.id==='DMG');
 assert.deepEqual(dmg.unnumberedPdfLeaves.map(leaf=>[leaf.pdfPage,leaf.printedPage,leaf.kind]),[
  [239,null,'interior-reference-leaf'],[240,null,'rear-cover']
 ]);
 assert.equal(Object.hasOwn(dmg,'unverified'),false);
 assert.equal(books.books.DMG.lastPage,238);
 assert.deepEqual(citations.pages({references:[{book:'DMG',pages:[239,240]}]}),[]);
 for(const page of [239,240]){
  assert.equal(books.availability('DMG',page),'invalid');
  assert.equal(books.pdfPage('DMG',page),null);
 }
});

test('all printed pages retain their source PDF mappings, including displaced MM2 p.83',()=>{
 for(const book of ['PHB','UA'])for(let page=1;page<=128;page++)assert.equal(books.pdfPage(book,page),page+1,`${book} p.${page}`);
 for(let page=1;page<=174;page++)assert.equal(books.pdfPage('DMG',page),page+1,`DMG p.${page}`);
 for(let page=176;page<=238;page++)assert.equal(books.pdfPage('DMG',page),page,`DMG p.${page}`);
 for(let page=1;page<=112;page++)assert.equal(books.pdfPage('MM',page),page+1,`MM p.${page}`);
 for(let page=1;page<=82;page++)assert.equal(books.pdfPage('MM2',page),page+1,`MM2 p.${page}`);
 assert.equal(books.pdfPage('MM2',83),92);
 for(let page=84;page<=91;page++)assert.equal(books.pdfPage('MM2',page),page,`MM2 p.${page}`);
 for(let page=92;page<=160;page++)assert.equal(books.pdfPage('MM2',page),page+1,`MM2 p.${page}`);
 assert.equal(books.pdfPage('MM2',82),83);
 assert.equal(books.pdfPage('MM2',83),92);
 assert.equal(books.pdfPage('MM2',84),84);
 assert.equal(books.pdfPage('MM2',91),91);
 assert.equal(books.pdfPage('MM2',161),null);
 assert.equal(books.pdfPage('unregistered source',1),null);
});

test('MM and MM2 state unknown exact printings and selected, non-catalogue scope',()=>{
 for(const id of ['MM','MM2']){
  const source=sources.find(entry=>entry.id===id);
  assert.match(source.edition,/Exact printing.*not established/i);
  assert.match(source.coverage,/no searchable MM(?: II)? profile catalogue/i);
 }
 assert.match(sources.find(source=>source.id==='MM').edition,/Title page: 4th Edition, August 1979/);
 assert.match(sources.find(source=>source.id==='MM').edition,/AD&D first edition/);
 assert.equal(sources.find(source=>source.id==='MM2').printedLastPage,160);
 assert.match(sources.find(source=>source.id==='MM2').mapping,/Printed p\. 83 is displaced after p\. 91/i);
});

test('supporting-source counts count citing records once per book',()=>{
 const collections=['rules','spells','equipment','classes','matrices'];
 const owners=collections.flatMap(collection=>data[collection].map(item=>({collection,item})));
 if(data.progressionExplainer)owners.push({collection:'progressionExplainer',item:{...data.progressionExplainer,id:'progression-explainer'}});
 const supportingCounts=new Map();
 for(const {item}of owners){
  const primary=books.code(item.book);
  const citedBooks=new Set(citations.collect(item).map(group=>books.code(group.book)).filter(book=>book&&book!==primary));
  for(const book of citedBooks)supportingCounts.set(book,(supportingCounts.get(book)||0)+1);
 }
 assert.equal(supportingCounts.get('MM'),8);
 assert.equal(supportingCounts.get('MM2'),1);
 assert.ok(owners.some(({item})=>item.id==='phb-cleric-aerial-servant'&&citations.collect(item).some(group=>group.book==='MM')));
});

test('generated evidence bindings do not inflate supporting-source owner counts',()=>{
 const original=data.spells.find(item=>item.id==='phb-cleric-aerial-servant');
 const duplicate=structuredClone(original);
 const reference=duplicate.references.find(entry=>entry.book==='MM');
 reference.evidenceBindings=[...(reference.evidenceBindings||[]),...(reference.evidenceBindings||[])];
 const booksFor=item=>new Set(citations.collect(item).map(group=>group.book));
 assert.deepEqual(booksFor(duplicate),booksFor(original));
});
