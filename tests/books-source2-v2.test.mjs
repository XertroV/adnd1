import{createRequire}from'node:module';
import assert from'node:assert/strict';
import test from'node:test';
const require=createRequire(import.meta.url);const books=require('../dist/books.js');
test('PHB and original UA printed pages map to the next one-based PDF page',()=>{for(const book of['PHB','UA'])for(const p of[1,43,74,128])assert.equal(books.pdfPage(book,p),p+1);});
test('DMG distinguishes its PDF omission and supplemental evidence from unnumbered physical leaves',()=>{for(const[p,pdf]of[[1,2],[174,175],[175,null],[176,176],[238,238],[239,null],[240,null]])assert.equal(books.pdfPage('DMG',p),pdf);assert.equal(books.availability('DMG',175),'missing');assert.equal(books.evidenceAvailability('DMG',175),'supplemental');assert.deepEqual(books.supplementalEvidence('DMG',175),{available:true,medium:'supplemental-image',editionStatus:'user-confirmed-correct-edition',printingStatus:'not-specified',originalPdfContainsPrintedPage:false,originalPdfSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',imageSha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',imageDimensionsPx:[1329,1796],published:false});assert.equal(books.privateEvidence('DMG',175).editionStatus,'user-confirmed-correct-edition');assert.deepEqual(books.books.DMG.unnumberedPdfLeaves.map(({pdfPage,printedPage,kind})=>[pdfPage,printedPage,kind]),[[239,null,'interior-reference-leaf'],[240,null,'rear-cover']]);for(const p of [239,240]){assert.equal(books.availability('DMG',p),'invalid');assert.equal(books.evidenceAvailability('DMG',p),'invalid');}});
test('Monster Manual printed pages use the supplied single-cover offset',()=>{assert.equal(books.pdfPage('MM',1),2);assert.equal(books.pdfPage('MM',112),113);});
test('Monster Manual II misplaced83 uses all four supplied mapping regions',()=>{for(const[p,pdf]of[[1,2],[82,83],[83,92],[84,84],[91,91],[92,93],[160,161]])assert.equal(books.pdfPage('MM2',p),pdf);});
test('ambiguous book-name prefixes never collapse Monster Manual II into the first volume',()=>{assert.equal(books.code('Monster Manual II'),'MM2');assert.equal(books.code('MMII'),'MM2');assert.equal(books.code('Monster Manual'),'MM');});
test('invalid, missing and out-of-range pages are never invented',()=>{for(const input of[0,-1,2.3,'oops',null])assert.equal(books.pdfPage('PHB',input),null);assert.equal(books.pdfPage('MM',113),null);assert.equal(books.pdfPage('MM2',161),null);assert.equal(books.pdfPage('unknown',83),null);});


// Source2 migration admission: the preserved predecessor assertions below exercise the current runtime.
import { test as source2IdentityTest_20261116 } from 'node:test';
import { strict as source2Assert_20261116 } from 'node:assert';
import { assertClassMappingCurrentSourceIdentity as assertSource2Identity_20261116 } from '../tools/class-mapping-current-source-gate-v2.mjs';
source2IdentityTest_20261116('Source2 current source identity is freshly admitted', () => {
  const identity = assertSource2Identity_20261116();
  source2Assert_20261116.equal(identity.summary.stage, 'source2-body-native');
  source2Assert_20261116.equal(identity.summary.sourceCommit, '400f6e9d123d8a654b9b9af48133a2533506e73d');
  source2Assert_20261116.equal(identity.summary.sourceTree, '664c02504efcece25669d2f9c3fdb26437cd5b09');
});
