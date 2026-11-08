import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildSourceCompletenessCoverage,markdownSourceCompleteness} from '../tools/source-completeness-coverage.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
function inputs(){return {pageBaseline:read('research/source-completeness-page-baseline.json'),siteBaseline:read('research/source-completeness-site.json'),ledgers:['phb','dmg','ua','mm','mm2'].map(code=>read(`research/source-completeness-${code}.json`)),currentData:read('dist/data.json')};}

test('frozen baseline findings cannot be mistaken for current repair publication state',()=>{
 const source=inputs(),repairs=read('research/source-completeness-repairs.json');
 const report=buildSourceCompletenessCoverage({...source,repairs});
 for(const [index,book] of report.bookReports.entries()){
  assert.equal(book.baselineCommit,report.baselineCommit);
  assert.deepEqual(book.baselineFindings,source.ledgers[index].findings);
  assert.equal(Object.hasOwn(book,'findings'),false);
  assert.equal(Object.hasOwn(book,'siteDispositionOccurrences'),false);
 }
 const text=markdownSourceCompleteness(report);
 assert.match(text,/Current repair batches/);
 assert.match(text,/following book findings and disposition counts describe the frozen baseline/);
 for(const batch of repairs.batches)assert.ok(text.includes(batch.status));
});

test('all five original-source ledgers account for physical pages without claiming whole-book semantics',()=>{
  const report=buildSourceCompletenessCoverage(inputs());
  assert.equal(report.denominators.physicalPdfPages,776);
  assert.equal(report.denominators.supplementalImages,1);
  assert.equal(report.supplement.pdfPage,null);
  assert.equal(report.supplement.canonicalPdfPhysicallyContainsPage,false);
  assert.equal(report.denominators.completeSemanticSourceUnitCount,null);
  assert.equal(report.denominators.semanticallyCompleteBooks,0);
  assert.equal(report.bookReports.reduce((sum,book)=>sum+book.physicalPdfPages,0),776);
  assert.ok(report.bookReports.every(book=>book.unassessed.length>0));
});

test('removing a book or physical page cannot shrink the coverage denominator silently',()=>{
  const missingBook=inputs();missingBook.ledgers.pop();
  assert.throws(()=>buildSourceCompletenessCoverage(missingBook),/Every supplied book/);
  const missingPage=inputs();missingPage.ledgers[0].pageCoverage.pop();
  assert.throws(()=>buildSourceCompletenessCoverage(missingPage),/incomplete physical-page/);
  const duplicate=inputs();duplicate.ledgers[0].pageCoverage[1].pdfPage=duplicate.ledgers[0].pageCoverage[0].pdfPage;
  assert.throws(()=>buildSourceCompletenessCoverage(duplicate),/omissions, duplicates/);
});

test('source identity and capture lineage are required independently of labels and counts',()=>{
  const wrongSource=inputs();wrongSource.ledgers[0].source.sha256='a'.repeat(64);
  assert.throws(()=>buildSourceCompletenessCoverage(wrongSource),/source identity/);
  const stale=inputs();stale.ledgers[0].inputCommit='a'.repeat(40);
  assert.throws(()=>buildSourceCompletenessCoverage(stale),/capture lineage/);
});

test('unit identity, actual page locators and unassessed scope cannot disappear',()=>{
  const duplicate=inputs();duplicate.ledgers[0].sourceUnits.push(duplicate.ledgers[0].sourceUnits[0]);
  assert.throws(()=>buildSourceCompletenessCoverage(duplicate),/duplicate source-unit/);
  const wrongPage=inputs();wrongPage.ledgers[0].sourceUnits[0].pdfPages=[999];
  assert.throws(()=>buildSourceCompletenessCoverage(wrongPage),/invalid physical source-page/);
  const hiddenUnknown=inputs();hiddenUnknown.ledgers[0].unassessed=[];
  assert.throws(()=>buildSourceCompletenessCoverage(hiddenUnknown),/unassessed universe/);
});

test('invalid printed folios, invented disposition labels and unsupported evidence cannot pass',()=>{
  const printed=inputs();printed.ledgers[0].pageCoverage[1].printedPage=999;
  assert.throws(()=>buildSourceCompletenessCoverage(printed),/printed folio/);
  const unitPrinted=inputs();unitPrinted.ledgers[0].sourceUnits[0].printedPages=[999];
  assert.throws(()=>buildSourceCompletenessCoverage(unitPrinted),/printed-unit folio/);
  const invented=inputs();invented.ledgers[0].sourceUnits[0].siteDispositions[0].status='not-real';
  assert.throws(()=>buildSourceCompletenessCoverage(invented),/unsupported site disposition/);
  const noEvidence=inputs();noEvidence.ledgers[0].sourceUnits[0].siteDispositions[0].evidence=[];
  assert.throws(()=>buildSourceCompletenessCoverage(noEvidence),/no evidence/);
});

test('declared page links and separate supplemental-image provenance remain checked',()=>{
  const link=inputs();link.ledgers[0].pageCoverage[0].sourceUnitIds=['nonexistent-unit'];
  assert.throws(()=>buildSourceCompletenessCoverage(link),/page-to-unit cross-link/);
  const supplement=inputs();const unit=supplement.ledgers.find(book=>book.book==='DMG').sourceUnits.find(unit=>unit.sourceArtifact?.fileName==='dmg175.jpg');
  unit.pdfPages=[175];
  assert.throws(()=>buildSourceCompletenessCoverage(supplement),/supplemental source identity/);
});

test('named source units require a locator rather than an unsupported label alone',()=>{
  const empty=inputs();empty.ledgers[0].sourceUnits[0].printedPages=[];empty.ledgers[0].sourceUnits[0].pdfPages=[];
  assert.throws(()=>buildSourceCompletenessCoverage(empty),/no source-page locator/);
});

test('committed coverage JSON, Markdown and input hashes match the complete current inputs',()=>{
  const committed=read('research/source-completeness-coverage.json');
  const {inputs:inputPins,...content}=committed;
  assert.deepEqual(content,buildSourceCompletenessCoverage({...inputs(),repairs:read('research/source-completeness-repairs.json')}));
  for(const input of inputPins){
    const bytes=readFileSync(new URL('../'+input.path,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),input.sha256,input.path);
  }
  assert.equal(readFileSync(new URL('../research/source-completeness-coverage.md',import.meta.url),'utf8'),markdownSourceCompleteness(committed));
});
