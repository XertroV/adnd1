import assert from 'node:assert/strict';
import {readBeforePass8CharacterReferenceFile as readFileSync} from './helpers/pass8-citation-target-crop-history.mjs';
import test from 'node:test';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {dmg175HistoryContract,decodeDmg175HistoryContract as loadContract,projectDmg175Json as projectJson,projectDmg175Books as projectBooks} from './helpers/batch6-dmg175-source-history.mjs';
import {reverseDmg74MatrixBatchFromData,reverseDmg74MatrixBatchFromInventory,withoutDmg74MatrixSourceExcerptOverrides} from './helpers/dmg74-matrix-batch.mjs';
const contract=dmg175HistoryContract();
test('closed175-to-853 history projection retains all five literal inputs and rejects28 altered inputs plus forged books/capture bytes',()=>{
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),results=[];
function check(name,fn){fn();results.push({name,passed:true});}
for(const [path,pair]of Object.entries(contract.files)){
 check(path+': exact current projects to complete853 object',()=>assert.deepEqual(projectJson(path,pair.current),pair.before));
 check(path+': exact853 stage is an explicit no-op',()=>assert.equal(projectJson(path,pair.before),pair.before));
}
const reject=(name,path,mutate)=>check(name,()=>{const bad=structuredClone(contract.files[path].current);mutate(bad);assert.throws(()=>projectJson(path,bad));});
const data='dist/data.json',cat='dist/scans/verified/rules-encounter-types.json',over='citation-overrides.json',price='research/price-source-inventory.json',rules='rules.json';
const encounter=d=>d.rules.find(row=>row.id==='encounter-types');
for(const [name,edit]of [
 ['unrelated XP number',d=>d.classes[0].xpRows[0].xp=123],
 ['unrelated owner omission',d=>d.rules.pop()],
 ['unapproved encounter text',d=>encounter(d).bullets[2]+=' changed'],
 ['field grade promotion',d=>encounter(d).references[0].evidenceBindings[0].sourceValueStatus='verified'],
 ['fake physical PDF page',d=>encounter(d).references[0].evidenceBindings[0].pdfPage=175],
 ['supplement source forgery',d=>encounter(d).references[0].evidenceBindings[0].sourceSha256='a'.repeat(64)],
 ['missing second selected crop',d=>encounter(d).references[0].evidenceBindings[0].regionIds.pop()],
 ['changed source physical gap',d=>d.sources.find(s=>s.id==='DMG').gaps=[]],
 ['changed source mapping',d=>d.sources.find(s=>s.id==='DMG').mapping='pdf175'],
 ['invented release count',d=>d.release.excerpts.regions++],
 ])reject(name,data,edit);
for(const [name,edit]of [
 ['oldPHB103 focus changed',c=>c.regions[0].focusRects=[[0,0,0.1,0.1]]],
 ['wrong image hash',c=>c.regions[1].sha256='a'.repeat(64)],
 ['wrong crop frame',c=>c.regions[1].sourceCropBoundsPx[0]++],
 ['wrong artifact hash',c=>c.sourceArtifacts['dmg175-user-confirmed-supplement'].sha256='a'.repeat(64)],
 ['wrong canonical PDF',c=>c.sourceArtifacts['dmg175-user-confirmed-supplement'].canonicalPdfSha256='a'.repeat(64)],
 ['fake PDF availability',c=>c.regions[1].pdfPage=176],
 ['swapped crop order',c=>[c.regions[1],c.regions[2]]=[c.regions[2],c.regions[1]]],
 ['unapproved extra crop',c=>c.regions.push({...c.regions[2],id:'unapproved'})],
 ])reject(name,cat,edit);
for(const [name,edit]of [
 ['arbitrary override price',c=>c.items['encounter-types'].price={amount:2,currency:'gp'}],
 ['wrong reference page',c=>c.items['encounter-types'].references[0].pages=[176]],
 ['missing ordered note locator',c=>c.items['encounter-types'].references[0].verification.regions.pop()],
 ['unapproved excerpt count',c=>c.sourceExcerpts['rules:encounter-types'].regionCount=4],
 ])reject(name,over,edit);
for(const [name,edit]of [
 ['extra canonical claim',c=>c.siteClaims.push({...c.siteClaims[0],itemId:'unapproved'})],
 ['unrelated source binding',c=>c.fieldEvidenceBindings[0].sourceSha256='a'.repeat(64)],
 ['price metadata count masking',c=>c.counts.sourceRows--],
 ['wrong books mapping receipt hash',c=>c.sourcePageCensuses[0].pageCensus.pages[0].mappingBasis.fileSha256='a'.repeat(64)],
 ['omitted current source binding',c=>c.fieldEvidenceBindings.pop()],
 ])reject(name,price,edit);
reject('raw rule value alteration',rules,c=>c.rules[0].summary='changed');
check('current books→exact original books byte pin',()=>assert.equal(sha(projectBooks(contract.books.currentUtf8)),contract.books.beforeSha256));
check('original books stage no-op',()=>assert.equal(projectBooks(contract.books.beforeUtf8),contract.books.beforeUtf8));
check('modified books bytes reject',()=>assert.throws(()=>projectBooks(contract.books.currentUtf8+' ')));
check('modified literal capture bytes reject',()=>{const b=Buffer.from(readFileSync(new URL('./fixtures/dmg175-853-history-projection-contract-v1.json.gz',import.meta.url)));b[40]^=1;assert.throws(()=>loadContract(b));});
const loadBooks=source=>{const context={};vm.createContext(context);vm.runInContext(source,context);return context.FirstEditionBooks;};
const beforeBooks=loadBooks(contract.books.beforeUtf8),currentBooks=loadBooks(contract.books.currentUtf8);let mappings=0;
check('all five existing printed-page availability/PDF mappings unchanged',()=>{for(const book of ['PHB','DMG','UA','MM','MM2']){const max=beforeBooks.books[book].lastPage;for(let page=-1;page<=max+1;page++){assert.equal(currentBooks.availability(book,page),beforeBooks.availability(book,page),`${book}:${page}: availability`);assert.equal(currentBooks.pdfPage(book,page),beforeBooks.pdfPage(book,page),`${book}:${page}: PDF page`);mappings++;}}});
check('two declared supplemental identities resolve without PDF invention',()=>{for(const region of contract.files[cat].current.regions.slice(1)){const identity=currentBooks.resolveRegionSourceIdentity(contract.files[cat].current,region);assert.equal(identity.valid,true);assert.equal(identity.sourceKind,'supplemental-image');assert.equal(identity.sourceSha256,'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7');assert.equal(identity.canonicalPdfSha256,'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669');assert.equal(currentBooks.pdfPage('DMG',175),null);}});
assert.equal(results.length,44);assert.equal(mappings,783);
});

test('the captured historical pairs bind exact ancestor inputs without repinning source values or source PDFs',()=>{
 const data='dist/data.json',over='citation-overrides.json',price='research/price-source-inventory.json';
 for(const [path,pair]of Object.entries(contract.files)){
  const bytes=readFileSync(new URL('../'+path,import.meta.url)),current=JSON.parse(bytes.toString('utf8'));
  if([data,over,price].includes(path)){
   let historicalCurrent=current;
   if(path===data)historicalCurrent=reverseDmg74MatrixBatchFromData(current,pair.current);
   if(path===over)historicalCurrent=withoutDmg74MatrixSourceExcerptOverrides(current);
   if(path===price)historicalCurrent=reverseDmg74MatrixBatchFromInventory(current,pair.current);
   assert.deepEqual(historicalCurrent,pair.current,`${path}: exact reviewed matrix batch reversal restores the complete historical current object`);
   const historical=projectJson(path,historicalCurrent);
   assert.deepEqual(historical,pair.before,`${path}: exact historical p. 175 projection restores the complete before object`);
   const historicalBytes=Buffer.from(JSON.stringify(historical,null,2)+'\n');
   assert.equal(createHash('sha256').update(historicalBytes).digest('hex'),pair.beforeRawSha256,`${path}: reconstructed complete historical bytes retain the sealed raw hash`);
  }else{
   assert.equal(createHash('sha256').update(bytes).digest('hex'),pair.currentRawSha256,path+': unchanged raw-byte pin');
   assert.deepEqual(current,pair.current,path+': complete unchanged current object');
  }
 }
 assert.equal(createHash('sha256').update(readFileSync(new URL('../dist/books.js',import.meta.url))).digest('hex'),contract.books.currentSha256);
 assert.equal(contract.dataScope.unchangedOwnerHashes.length,996);assert.equal(contract.bindingScope.denominator,4566);assert.equal(contract.bindingScope.unchanged,4565);assert.equal(contract.bindingScope.metadataTransfers.length,233);assert.equal(contract.manifest.groups,250);assert.equal(contract.manifest.parts,490);assert.equal(contract.manifest.newGroups,0);
});
