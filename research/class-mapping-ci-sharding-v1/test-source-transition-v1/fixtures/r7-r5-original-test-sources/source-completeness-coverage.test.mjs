// Historical MM replay: preserved a29 assertions run against the fixed historical stage.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,historicalMmTestRoot,assertHistoricalMmTestStage} from '../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from '../research/class-mapping-history-v1/mm-replay-child-process-v1.mjs';
import {assertCurrentMmSourceEpoch} from './helpers/class-mapping-historical-mm-test-inputs-v1.mjs';
import {assertHistoricalHPreimage} from '../research/class-mapping-history-v1/closed-version29-reader-class-mapping-v1.mjs';
import {buildSourceCompletenessCoverage,markdownSourceCompleteness,loadCurrentSourceRepairRegister} from '../research/class-mapping-history-v1/replay-tools/source-completeness-coverage.mjs';

assertHistoricalMmTestStage();
const root=historicalMmTestRoot;
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const currentMm=assertCurrentMmSourceEpoch(root);
const historicalH=assertHistoricalHPreimage();
const historicalHPreimageCommit='5c6a57386af372c7c0d89e342003a7edf68ca0dd';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hGitBytes=rel=>execFileSync('git',['show',`${historicalHPreimageCommit}:${rel}`],{cwd:root,maxBuffer:64*1024*1024});
const hBytes=rel=>hGitBytes(rel);
const hRead=rel=>JSON.parse(hBytes(rel).toString('utf8'));
function inputs(){return {pageBaseline:read('research/source-completeness-page-baseline.json'),siteBaseline:read('research/source-completeness-site.json'),ledgers:['phb','dmg','ua','mm','mm2'].map(code=>read(`research/source-completeness-${code}.json`)),currentData:currentMm.inputs.data};}

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

test('committed coverage remains the exact H preimage while the current MM report uses its strict epoch',()=>{
  assert.equal(currentMm.summary.sourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(currentMm.summary.owners,1064);
  assert.equal(historicalH.historicalHPreimageCommit,historicalHPreimageCommit);
  const committedBytes=readFileSync(new URL('../research/source-completeness-coverage.json',import.meta.url));
  const exactHBytes=hGitBytes('research/source-completeness-coverage.json');
  assert.deepEqual(committedBytes,exactHBytes,'the committed artifact remains its exact H preimage');
  const committed=JSON.parse(exactHBytes.toString('utf8'));
  const {inputs:inputPins,...content}=committed;
  assert.equal(committed.denominators.currentSiteOwners,1062,'the frozen report keeps the H owner denominator');
  assert.equal(committed.inputs.find(input=>input.path==='dist/data.json').sha256,'2cddb11a82ecc3b9d77cb3fa2ae49eef5623a5470ac85a540d1baf483e096a95');
  const historicalPointer=hRead('research/current-source-audit-status.json');
  const historicalRepairs=hRead(historicalPointer.currentRepairRegister.path);
  const historicalReport=buildSourceCompletenessCoverage({
    pageBaseline:hRead('research/source-completeness-page-baseline.json'),
    siteBaseline:hRead('research/source-completeness-site.json'),
    ledgers:['phb','dmg','ua','mm','mm2'].map(code=>hRead(`research/source-completeness-${code}.json`)),
    currentData:hRead('dist/data.json'),
    repairs:historicalRepairs
  });
  assert.deepEqual(content,historicalReport,'all report content reproduces from exact H-preimage inputs');
  for(const input of inputPins)assert.equal(sha(hBytes(input.path)),input.sha256,`${input.path}: exact H-preimage input hash`);
  const markdownBytes=readFileSync(new URL('../research/source-completeness-coverage.md',import.meta.url));
  assert.deepEqual(markdownBytes,hGitBytes('research/source-completeness-coverage.md'),'the Markdown remains the exact H Git blob');
  assert.equal(markdownBytes.toString('utf8'),markdownSourceCompleteness(committed));

  const currentRegister=loadCurrentSourceRepairRegister();
  const currentReport=buildSourceCompletenessCoverage({...inputs(),repairs:currentRegister.repairs});
  assert.equal(currentReport.denominators.currentSiteOwners,currentMm.summary.owners,'the live report uses the strict current MM owner denominator');
  assert.equal(currentReport.denominators.currentSiteOwners,1064);
  assert.equal(currentReport.denominators.namedSourceUnits,559);
  assert.equal(currentReport.denominators.completeSemanticSourceUnitCount,null);
  assert.equal(currentReport.denominators.semanticallyCompleteBooks,0);
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
