import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {buildSourceCompletenessCoverage,markdownSourceCompleteness,loadCurrentSourceRepairRegister} from '../tools/source-completeness-coverage.mjs';

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
  const currentRegister=loadCurrentSourceRepairRegister();
  assert.deepEqual(content,buildSourceCompletenessCoverage({...inputs(),repairs:currentRegister.repairs}));
  for(const pin of currentRegister.inputs)assert.deepEqual(inputPins.find(input=>input.path===pin.path),pin);
  for(const input of inputPins){
    const bytes=readFileSync(new URL('../'+input.path,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),input.sha256,input.path);
  }
  assert.equal(readFileSync(new URL('../research/source-completeness-coverage.md',import.meta.url),'utf8'),markdownSourceCompleteness(committed));
});

test('the preserved PR43 failure distinguishes the frozen register from verified release history',()=>{
  const before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-audit-pass8-pr43-current-register-before.json.gz',import.meta.url))));
  assert.equal(before.commit,'e033a90021cdc8322fc5488acf76386f2fdb7a04');
  assert.deepEqual(before.tests,{registered:924,passed:923,failed:1,skipped:0});
  const files=new Map(before.files.map(file=>{
    assert.equal(createHash('sha256').update(file.utf8).digest('hex'),file.sha256,file.path);
    return [file.path,file.utf8];
  }));
  const frozen=JSON.parse(files.get('research/source-completeness-repairs.json'));
  const current=JSON.parse(files.get('research/source-completeness-repairs-version20.json'));
  const oldCoverage=JSON.parse(files.get('research/source-completeness-coverage.json'));
  assert.notDeepEqual(oldCoverage.repairs,current);
  assert.notDeepEqual(oldCoverage.repairs,frozen);
  const temp=mkdtempSync(join(tmpdir(),'vault-preserved-pr43-register-'));
  try{
    mkdirSync(join(temp,'research'));
    for(const path of ['research/current-source-audit-status.json','research/source-completeness-repairs-version20.json'])writeFileSync(join(temp,path),files.get(path));
    assert.deepEqual(loadCurrentSourceRepairRegister({rootPath:temp}).repairs,current);
  }finally{rmSync(temp,{recursive:true,force:true});}
  assert.deepEqual(read('research/source-completeness-repairs.json'),frozen);
  assert.match(files.get('tools/source-completeness-coverage.mjs'),/repairs:existsSync/);
  const text=markdownSourceCompleteness({...oldCoverage,repairs:current});
  for(const batch of current.batches)if(batch.release)assert.ok(text.includes(batch.release.mergeCommit??batch.release.mergeSha));
  assert.ok(!text.includes('undefined'));
});

test('current register resolution rejects missing, unsafe, malformed and changed inputs',()=>{
  const temp=mkdtempSync(join(tmpdir(),'vault-current-repair-register-'));
  try{
    mkdirSync(join(temp,'research'));
    const pointer=read('research/current-source-audit-status.json');
    const register=readFileSync(new URL('../'+pointer.currentRepairRegister.path,import.meta.url));
    const pointerPath=join(temp,'research/current-source-audit-status.json');
    const put=value=>writeFileSync(pointerPath,JSON.stringify(value));
    assert.throws(()=>loadCurrentSourceRepairRegister({rootPath:temp}),/ENOENT/);
    put(pointer);
    assert.throws(()=>loadCurrentSourceRepairRegister({rootPath:temp}),/ENOENT/);
    writeFileSync(join(temp,pointer.currentRepairRegister.path),register);
    assert.deepEqual(loadCurrentSourceRepairRegister({rootPath:temp}).repairs,JSON.parse(register));
    writeFileSync(join(temp,pointer.currentRepairRegister.path),Buffer.concat([register,Buffer.from(' ')]));
    assert.throws(()=>loadCurrentSourceRepairRegister({rootPath:temp}),/hash mismatch/);
    for(const path of ['../source-completeness-repairs-version20.json','/tmp/source-completeness-repairs-version20.json','research/source-completeness-repairs.json']){
      put({...pointer,currentRepairRegister:{...pointer.currentRepairRegister,path}});
      assert.throws(()=>loadCurrentSourceRepairRegister({rootPath:temp}),/Invalid current/);
    }
    put({...pointer,currentRepairRegister:{...pointer.currentRepairRegister,sha256:'not-a-hash'}});
    assert.throws(()=>loadCurrentSourceRepairRegister({rootPath:temp}),/Invalid current/);
    put({...pointer,schemaVersion:2});
    assert.throws(()=>loadCurrentSourceRepairRegister({rootPath:temp}),/Invalid current/);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
