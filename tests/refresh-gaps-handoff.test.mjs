import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {currentQueueMetadata, handoffDate, handoffTemplateSnapshot, reconcileCuratedNotes, validateApprovedTransitions, validateNullPriceTransitions, validateReportDependencies, validateSupplementalMonetaryReport, projectCurrentMonetaryReview, projectUaMeaningReview} from '../tools/refresh-gaps-handoff.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const baselineCommit = '679b15d1c580172e54314829c1c3c86dc78b65f3';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const read = path => readFileSync(resolve(root, path));
const json = path => JSON.parse(read(path));
const historical = path => execFileSync('git', ['show', `${baselineCommit}:${path}`], {cwd: root, maxBuffer: 32 * 1024 * 1024});

test('checking unchanged evidence keeps its snapshot date across later CI runs',()=>{
 const before=json('research/source-audit-batch5-gaps-check-clock-before.json');
 assert.notEqual(before.currentGeneratedOn,before.beforeCandidateGeneratedOn);
 assert.equal(before.beforeCheckExitCode,1);
 const now=new Date(before.checkClock);
 assert.equal(handoffDate({checking:true,existingDate:before.currentGeneratedOn,now}),before.currentGeneratedOn);
 assert.equal(handoffDate({checking:false,existingDate:before.currentGeneratedOn,now}),before.beforeCandidateGeneratedOn);
 assert.throws(()=>handoffDate({checking:true,existingDate:undefined,now}),/invalid snapshot date/);
});

test('all four null-price transitions use the already-reviewed 679 note as their exact preimage',()=>{
 const before=json('research/source-audit-batch5-gaps-null-transition-before.json');
 assert.equal(before.records.length,4);
 assert.ok(before.records.every(record=>record.oldValidatorBaselinePredicate===false&&record.oldValidatorCurrentPredicate===false));
 const args={baselineData:JSON.parse(historical('dist/data.json')),currentData:json('dist/data.json'),receipt:json('research/source-audit-batch5-null-price-notes.json')};
 assert.doesNotThrow(()=>validateNullPriceTransitions(args));
 for(const field of ['baselineData','currentData']){
  const altered=structuredClone(args);
  altered[field].equipment.find(item=>item.id==='phb-bo-stick').priceNote='unreviewed wording';
  assert.throws(()=>validateNullPriceTransitions(altered),/does not match historical\/current data/);
 }
 const altered=structuredClone(args);altered.currentData.equipment.find(item=>item.id==='phb-bo-stick').price={amount:0,currency:'gp'};
 assert.throws(()=>validateNullPriceTransitions(altered),/null-price note differs/);
});

test('captured 679 cache/current-data mismatch is retained and default publication rejects it', () => {
  // Captured from the shared tree before tightening default report requirements.
  const captured = {
    baselineRawDataSha256: '47908c8ddc8b68c09e11f600ed0d0dc24b2a3749f8e3f452e245c7ee6635053b',
    baselineParsedDataSha256: 'b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6',
    currentRawDataSha256: '8ab2a68bdec2e0d5e243d381871685adaddbb731913d8d03f65b6664f1bcb3fd',
    currentParsedDataSha256: '542695cb1a651a35390df9e6d10b490faec2a9874117a24a5af60a923bbff6f3',
    currentExposedRecords: 993,
    systemicReportSha256: 'c9e203afeac06f207165551aa85f1868d4a2c370fbc2e66f7d677e1151529c0d',
    visualReportSha256: 'bad6fb8c1b03091c7c1fb62e7291559dfb84ec6a99d4f75c539f9dca1c052471',
    tableReportMissing: true,
    staleQueue: {emptyRegionTargetBindings:3977,fieldEvidenceBindingsDenominator:4260,fieldTargetsPending:4050,historicalScopesNeedingReview:152,historicalScopeDenominator:154},
  };
  const baselineDataBytes = historical('dist/data.json');
  const baselineData = JSON.parse(baselineDataBytes);
  assert.equal(sha(baselineDataBytes), captured.baselineRawDataSha256);
  assert.equal(sha(Buffer.from(JSON.stringify(baselineData))), captured.baselineParsedDataSha256);
  assert.notEqual(captured.currentRawDataSha256, captured.baselineRawDataSha256);
  assert.notEqual(captured.currentParsedDataSha256, captured.baselineParsedDataSha256);
  assert.equal(captured.currentExposedRecords, 993);

  const handoff = JSON.parse(historical('research/gaps-limitations-next-task.json'));
  const historicalQueue=handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues;
  assert.deepEqual({emptyRegionTargetBindings:historicalQueue.emptyRegionTargetBindings,fieldEvidenceBindingsDenominator:historicalQueue.fieldEvidenceBindingsDenominator,
    fieldTargetsPending:historicalQueue.fieldTargetsPending,historicalScopesNeedingReview:historicalQueue.historicalScopesNeedingReview,
    historicalScopeDenominator:historicalQueue.historicalScopeDenominator},captured.staleQueue);
  const readCached = path => {
    if (path === 'artifacts/citation-systemic-coverage/citation-systemic-current.json') return {
      sha256:captured.systemicReportSha256,json:{input:{sha256:captured.baselineParsedDataSha256,rawFileSha256:captured.baselineRawDataSha256}},
    };
    if (path === 'artifacts/source-visual-coverage/report.json') return {
      sha256:captured.visualReportSha256,json:{inputDataSha256:captured.baselineParsedDataSha256},
    };
    if (path === 'artifacts/source-table-citation-coverage/report.json') throw new Error('captured default table report did not exist');
    throw new Error(`unexpected report ${path}`);
  };
  assert.throws(() => currentQueueMetadata({handoff,dataHash:captured.currentParsedDataSha256,rawDataHash:captured.currentRawDataSha256,
    data:{},reportPaths:{systemic:null,visual:null,table:null},monetaryReports:[],readJson:readCached,hashFile:()=>{throw new Error('not reached');},hashes:{}}),
  /systemic report is stale for current data/);
});

const capturedActualDependencyState = Object.freeze({
  dataParsedSha256:'79858e351d2c0ed1af7de9d3c1959b450abb35bc8b0497ab31d1c809b0557387',
  dataRawSha256:'db9edc75e84e7f4327fbadbe064ac74b94c210f32e9cb018fa6a59de8ab4e43d',
  systemic:{reportSha256:'d6193cdae76dd3cb41235daeaacb99a6af1bb17425a0da93490884cf751a10c4',inputMapSha256:'62e56681dedbdb065b55e0936e841e4287ee60bf02009988b21e3057d66c04c9',inputCount:998,mismatchCount:75,mismatchMapSha256:'2840110d9bba6ca48f71007d6342d88fa7147a142028951f229917701940677d',example:{path:'dist/scans/verified/equipment-phb-banded-mail.json',report:'0d9e8fecfb7faf6cad9252c08c4c30c97aff9cebe10299542a0d80830725c748',current:'8e8ed4fd7f7b2fc790c91ce455bd3f2462e1b7b4cdf91d74ca927087f7ad1a2b'}},
  visual:{reportSha256:'ad4c239351a9104ec09ebd1eed24f0cd519e1f126c3ce665f57f79461d6ac522',inputMapSha256:'168f34fd9f0f79008c56fe9b4ba7a6351fd1ce146dd4f3eb0d8ff8648199d5e8',inputCount:14,mismatchCount:1,mismatchMapSha256:'5b601bc8a62c797004fda38ed67ea817180303eeed40e5d1ae6cdd7ae4af3aba',example:{path:'research/source-visual-reviews.json',report:'b8bc5132cca701c25478c1dce520504501d3397b4eb0f5d039660f148d89d5bd',current:'2da6dcdac53035d93c059435e2030b91c66b900d5b9a6378749a2374422ea7c3'}},
  table:{reportSha256:'fb19cd05d5b7bdb02eac5c2fdd1b257eba5a7ac7f75eff97f996658e5e0ab127',inputMapSha256:'48a953685cf2dce3c40421bdcf314da6adaff5b718e75bddf7d4522109a3e636',inputCount:1018,mismatchCount:76,mismatchMapSha256:'8d0fc71a7b0437a1f771cd87c32e53ec95636f3d089fddea9ef1d7c13d0254c2',example:{path:'research/source-table-citation-contracts.json',report:'3a52544daf62ac830d4fe141cfa3ba3a5f7f89ac53b64c1f13b2573ef0902bec',current:'541eacd30a267a19286c3c299598605b242f36e1fd03afb9a8a58387393bdf5b'}},
});

test('captured current reports had unchanged data identities but stale dependency maps', () => {
  const captured=capturedActualDependencyState;
  assert.equal(captured.systemic.inputCount,998); assert.equal(captured.systemic.mismatchCount,75);
  assert.equal(captured.visual.inputCount,14); assert.equal(captured.visual.mismatchCount,1);
  assert.equal(captured.table.inputCount,1018); assert.equal(captured.table.mismatchCount,76);
  assert.equal(captured.systemic.example.path,'dist/scans/verified/equipment-phb-banded-mail.json');
  assert.equal(captured.visual.example.path,'research/source-visual-reviews.json');
  assert.equal(captured.table.example.path,'research/source-table-citation-contracts.json');
  assert.equal(captured.dataParsedSha256,'79858e351d2c0ed1af7de9d3c1959b450abb35bc8b0497ab31d1c809b0557387');
  assert.equal(captured.dataRawSha256,'db9edc75e84e7f4327fbadbe064ac74b94c210f32e9cb018fa6a59de8ab4e43d');
});

function currentReportFixtures(dataHash,rawDataHash,hashFile) {
  return {
    systemic:{schemaVersion:1,input:{path:'dist/data.json',sha256:dataHash,rawFileSha256:rawDataHash},companionInventories:['research/citation-binding-scope-audit.json','research/equipment-price-context-baseline.json','research/citation-navigation-coverage.json'].map(path=>({path,sha256:hashFile(path)})),selectedOwnerCatalogs:{denominator:0,usages:[]},evidenceBindings:{targetStatusCounts:{'empty-region-target':7},denominator:21,reviewStatusCounts:{'field-target-reviewed':15}},citationObjects:{objects:[{collection:'classes',reviewStatus:'field-target-pending'}]}},
    visual:{schemaVersion:2,inputDataSha256:dataHash,inputs:{data:rawDataHash,independentReviewLedger:hashFile('research/source-visual-reviews.json'),triage:{'research/triage.json':hashFile('research/triage.json')},geometry:{file:'research/geometry.json',sha256:hashFile('research/geometry.json')},priceInventory:{file:'research/price-source-inventory.json',sha256:hashFile('research/price-source-inventory.json')},continuationManifest:{file:'research/citation-continuations.json',sha256:hashFile('research/citation-continuations.json')},contextContractManifest:{file:'research/citation-context-contracts.json',sha256:hashFile('research/citation-context-contracts.json')}},usages:[],sentinelPolicy:{historicalExceptionsNeedingScopeReview:4,historicalHighlightExceptionDenominator:5}},
    table:{schemaVersion:1,generatedBy:'tools/source-table-citation-coverage.mjs',inputHashes:{'dist/data.json':rawDataHash,'research/price-source-inventory.json':hashFile('research/price-source-inventory.json'),'research/source-table-citation-contracts.json':hashFile('research/source-table-citation-contracts.json')},rows:[{targets:[{applicability:'uncertain'}]},{}],counts:{sourceRows:2,targetStatus:{'confirmed-missing-reference':3}}},
  };
}
function queueHandoff() {
  return {reviewQueuesNotSourceAbsences:{fieldBindingAndHistoricalScopeQueues:{inputDataSha256:'old-data-hash',reportHashes:{systemic:'old-systemic',visual:'old-visual'}},classPrecisionProposals:{},sourceTableCitationReview:{reportPath:'old-table'}}};
}
function reportReader(files,extraFiles={}) {
  return path => {
    const source=Object.hasOwn(files,path)?files:Object.hasOwn(extraFiles,path)?extraFiles:null;
    if (!source) throw new Error(`ENOENT ${path}`);
    const json = source[path];
    const bytes = Buffer.from(JSON.stringify(json));
    return {json,bytes,sha256:sha(bytes)};
  };
}
const freshParsedHash=sha(Buffer.from('{"fresh":true}'));
const freshRawHash=sha(Buffer.from('{ "fresh": true }'));
const fixtureHashFile=path=>path==='dist/data.json'?freshRawHash:sha(Buffer.from(`fixture-current:${path}`));
const currentMetadataArgs=extra=>({handoff:queueHandoff(),data:{},dataHash:freshParsedHash,rawDataHash:freshRawHash,reportPaths:{systemic:null,visual:null,table:null},monetaryReports:[],hashFile:fixtureHashFile,hashes:{},...extra});

test('a current systemic report cannot mask a stale default visual report', () => {
  const dataHash=freshParsedHash;
  const reports=currentReportFixtures(dataHash,freshRawHash,fixtureHashFile);
  reports.visual.inputDataSha256='cached-679-hash';
  const files={
    'artifacts/citation-systemic-coverage/citation-systemic-current.json':reports.systemic,
    'artifacts/source-visual-coverage/report.json':reports.visual,
    'artifacts/source-table-citation-coverage/report.json':reports.table,
  };
  assert.throws(()=>currentQueueMetadata(currentMetadataArgs({readJson:reportReader(files)})),/visual report is stale for current data/);
});

test('all default current reports are required; a missing table report blocks publication', () => {
  const dataHash=freshParsedHash;
  const reports=currentReportFixtures(dataHash,freshRawHash,fixtureHashFile);
  const files={
    'artifacts/citation-systemic-coverage/citation-systemic-current.json':reports.systemic,
    'artifacts/source-visual-coverage/report.json':reports.visual,
  };
  assert.throws(()=>currentQueueMetadata(currentMetadataArgs({readJson:reportReader(files)})),/table report unavailable at artifacts\/source-table-citation-coverage\/report.json/);
});

test('a stale default table citation report blocks publication even when other defaults are current', () => {
  const dataHash=freshParsedHash;
  const reports=currentReportFixtures(dataHash,freshRawHash,fixtureHashFile);
  reports.table.inputHashes['dist/data.json']='0'.repeat(64);
  const files={
    'artifacts/citation-systemic-coverage/citation-systemic-current.json':reports.systemic,
    'artifacts/source-visual-coverage/report.json':reports.visual,
    'artifacts/source-table-citation-coverage/report.json':reports.table,
  };
  assert.throws(()=>currentQueueMetadata(currentMetadataArgs({readJson:reportReader(files)})),/table report is stale for current data/);
});

test('fresh explicit report overrides permit publication when defaults are absent', () => {
  const dataHash=freshParsedHash;
  const reports=currentReportFixtures(dataHash,freshRawHash,fixtureHashFile);
  const paths={systemic:'overrides/systemic.json',visual:'overrides/visual.json',table:'overrides/table.json'};
  const files={[paths.systemic]:reports.systemic,[paths.visual]:reports.visual,[paths.table]:reports.table};
  const hashes={};
  const queues=currentQueueMetadata(currentMetadataArgs({reportPaths:paths,readJson:reportReader(files),hashes}));
  assert.equal(queues.fieldBindingAndHistoricalScopeQueues.refreshBeforeFinalReport,false);
  assert.equal(queues.fieldBindingAndHistoricalScopeQueues.inputDataSha256,dataHash);
  assert.equal(queues.fieldBindingAndHistoricalScopeQueues.emptyRegionTargetBindings,7);
  assert.equal(queues.fieldBindingAndHistoricalScopeQueues.fieldEvidenceBindingsDenominator,21);
  assert.equal(queues.fieldBindingAndHistoricalScopeQueues.fieldTargetsPending,6);
  assert.equal(queues.fieldBindingAndHistoricalScopeQueues.historicalScopesNeedingReview,4);
  assert.equal(queues.sourceTableCitationReview.reportPath,paths.table);
  assert.deepEqual(Object.keys(hashes).sort(),Object.values(paths).sort());
});

test('systemic catalog dependency mismatch is rejected while data hashes remain current', () => {
  const catalog='scans/verified/rules-fixture.json', path=`dist/${catalog}`;
  const data={rules:[{id:'fixture',sourceExcerpts:{catalog}}]};
  const reports=currentReportFixtures(freshParsedHash,freshRawHash,fixtureHashFile);
  reports.systemic.selectedOwnerCatalogs={denominator:1,usages:[{collection:'rules',itemId:'fixture',selectedBinding:'sourceExcerpts',selectedCatalog:catalog,catalogBytesSha256:'0'.repeat(64)}]};
  assert.equal(reports.systemic.input.sha256,freshParsedHash);
  assert.equal(reports.systemic.input.rawFileSha256,freshRawHash);
  assert.throws(()=>validateReportDependencies({report:reports.systemic,type:'systemic',data,dataHash:freshParsedHash,rawDataHash:freshRawHash,hashFile:fixtureHashFile}),/systemic report dependency is stale at dist\/scans\/verified\/rules-fixture.json/);
});

test('visual manifest dependency mismatch is rejected despite unchanged parsed and raw data hashes', () => {
  const reports=currentReportFixtures(freshParsedHash,freshRawHash,fixtureHashFile);
  reports.visual.inputs.triage['research/triage.json']='0'.repeat(64);
  assert.equal(reports.visual.inputDataSha256,freshParsedHash);
  assert.equal(reports.visual.inputs.data,freshRawHash);
  assert.throws(()=>validateReportDependencies({report:reports.visual,type:'visual',data:{},dataHash:freshParsedHash,rawDataHash:freshRawHash,readJson:reportReader({}),hashFile:fixtureHashFile}),/visual report dependency is stale at research\/triage.json/);
});

test('table catalog dependency mismatch is rejected with unchanged dist data hash', () => {
  const catalog='scans/verified/rules-fixture.json', path=`dist/${catalog}`;
  const reports=currentReportFixtures(freshParsedHash,freshRawHash,fixtureHashFile);
  reports.table.inputHashes[path]=fixtureHashFile(path);
  reports.table.inputHashes[path]='0'.repeat(64);
  assert.equal(reports.table.inputHashes['dist/data.json'],freshRawHash);
  assert.throws(()=>validateReportDependencies({report:reports.table,type:'table',data:{rules:[{id:'fixture',sourceExcerpts:{catalog}}]},dataHash:freshParsedHash,rawDataHash:freshRawHash,readJson:reportReader({}),hashFile:fixtureHashFile}),/table report dependency is stale at dist\/scans\/verified\/rules-fixture.json/);
});

test('visual catalog-region focus hash is checked against current region data', () => {
  const catalogPath='scans/verified/rules-fixture.json', sourcePath=`dist/${catalogPath}`;
  const imageBytes=Buffer.from('current fixture pixels'), imageHash=sha(imageBytes);
  const region={id:'fixture-p10',book:'PHB',printedPage:10,pdfPage:11,image:'p10.png',sha256:imageHash,width:100,height:50,title:'Fixture passage',focusRects:[[0.1,0.2,0.3,0.4]],normalizedPageRect:{x:0.05,y:0.1,width:0.9,height:0.8},role:'row'};
  const catalog={sources:{PHB:{sha256:'a'.repeat(64)}},regions:[region]};
  const catalogBytes=Buffer.from(JSON.stringify(catalog));
  const data={rules:[{id:'fixture',sourceExcerpts:{catalog:catalogPath}}]};
  const hashFile=path=>path==='dist/data.json'?freshRawHash:path===sourcePath?sha(catalogBytes):path==='dist/scans/verified/p10.png'?imageHash:fixtureHashFile(path);
  const loaded=reportReader({}, {[sourcePath]:catalog});
  const reports=currentReportFixtures(freshParsedHash,freshRawHash,hashFile);
  const focusHash=sha(Buffer.from(stable(region.focusRects)));
  const {focusRects,...content}=region;
  const contentHash=sha(Buffer.from(stable(content)));
  const defaultOrderHash=sha(Buffer.from(stable([{id:region.id,role:'row',imageSha256:imageHash,focusSha256:focusHash,contentSha256:contentHash}])));
  reports.visual.usages=[{collection:'rules',itemId:'fixture',binding:'sourceExcerpts',catalog:catalogPath,regionId:region.id,book:'PHB',page:10,printedPage:10,pdfPage:11,image:'p10.png',imageSha256:imageHash,width:100,height:50,title:region.title,focusRects:region.focusRects,cropBounds:region.normalizedPageRect,focusSha256:focusHash,contentSha256:contentHash,viewerSelected:true,default:true,defaultOrderSha256:defaultOrderHash,sourceSha256:'a'.repeat(64),role:'row',reviewGate:{imageBytesMatch:true}}];
  reports.visual.usages[0].focusSha256='b'.repeat(64);
  assert.throws(()=>validateReportDependencies({report:reports.visual,type:'visual',data,dataHash:freshParsedHash,rawDataHash:freshRawHash,readJson:loaded,hashFile}),/visual report has stale focusSha256 for rules\|fixture\|sourceExcerpts\|scans\/verified\/rules-fixture.json\|fixture-p10/);
});

test('curated baseline uses the actual immutable 679b15d files and retains all 78 original caution candidates', () => {
  const dataBytes = historical('dist/data.json');
  const handoffBytes = historical('research/gaps-limitations-next-task.json');
  const data = JSON.parse(dataBytes), handoff = JSON.parse(handoffBytes);
  assert.equal(sha(dataBytes), handoff.snapshot.rawDistDataFileSha256);
  assert.equal(sha(Buffer.from(JSON.stringify(data))), handoff.snapshot.parsedDataSha256);
  assert.equal(handoff.mechanicsAudit.specificReviewNoteCandidates.notes.length, 78);
  assert.ok(handoff.mechanicsAudit.specificReviewNoteCandidates.notes.some(note => note.itemId === 'phb-magic-user-massmorph'));
});

test('refresh template hash inputs exclude generated counts while retaining handoff-specific evidence scope', () => {
  const handoff = JSON.parse(historical('research/gaps-limitations-next-task.json'));
  const before = handoffTemplateSnapshot(handoff);
  handoff.generatedOn = '2099-01-01';
  handoff.snapshot.parsedDataSha256 = 'changed-generated-snapshot';
  handoff.summary.formalMechanicsFieldStatuses.notExtracted++;
  handoff.mechanicsAudit.specificReviewNoteCandidates.notes.pop();
  handoff.equipmentOffers.records[1].itemId = 'generated-item-link';
  handoff.reviewQueuesNotSourceAbsences.fieldBindingAndHistoricalScopeQueues.fieldTargetsPending++;
  handoff.reviewQueuesNotSourceAbsences.rowNormalizedMonetaryReview = {reports: [{currentReview: {knownFindings: 195, retainedUncertainties: 8}}]};
  assert.deepEqual(handoffTemplateSnapshot(handoff), before);
  handoff.missingReferencedContent.missingCitedPages[0].status = 'changed source scope';
  assert.notDeepEqual(handoffTemplateSnapshot(handoff), before);
});

test('reviewed source transitions must match exact historical/current data and preserve Animal Growth caution', () => {
  const baselineData = JSON.parse(historical('dist/data.json'));
  const currentData = json('dist/data.json');
  const conflictReceipt = json('research/source-audit-batch5-conflict-integration.json');
  const animalReceipt = json('research/source-audit-batch5-unextracted.json');
  const retirement = json('research/source-audit-batch5-class-retired-ledger.json');
  const complete = conflictReceipt.changes.every(change => {
    let item = baselineData[change.collection]?.find(row => row.id === change.itemId);
    if (!item) return false;
    const pointer = value => {
      for (const part of change.pointer.slice(1).split('/')) value = value?.[part.replaceAll('~1', '/').replaceAll('~0', '~')];
      return value;
    };
    const oldValue = pointer(item);
    const currentValue = pointer(currentData[change.collection]?.find(row => row.id === change.itemId));
    return (oldValue === undefined ? change.oldValue === null : JSON.stringify(oldValue) === JSON.stringify(change.oldValue))
      && JSON.stringify(currentValue) === JSON.stringify(change.newValue);
  });
  if (complete) {
    const transitions = validateApprovedTransitions({baselineData, currentData, conflictReceipt, animalReceipt, classRetirementReceipt: retirement});
    assert.equal(transitions.length, conflictReceipt.changes.length + 1);
    assert.ok(transitions.some(record => record.itemId === 'phb-magic-user-animal-growth'));
  } else {
    // During assembly the current catalog may still precede approved edits. The detector must block this state.
    assert.throws(() => validateApprovedTransitions({baselineData, currentData, conflictReceipt, animalReceipt, classRetirementReceipt: retirement}), /conflict receipt no longer exactly matches historical\/current data/);
  }

  const mutated = structuredClone(conflictReceipt);
  mutated.changes[0].newValue = 'unreviewed replacement';
  assert.throws(() => validateApprovedTransitions({baselineData, currentData, conflictReceipt: mutated, animalReceipt, classRetirementReceipt: retirement}), /conflict receipt no longer exactly matches historical\/current data/);
});

test('curated notes refresh only through exact current ledger candidates and reviewed transitions', () => {
  const baselineHandoff = JSON.parse(historical('research/gaps-limitations-next-task.json'));
  const baselineData = JSON.parse(historical('dist/data.json'));
  const currentData = json('dist/data.json');
  const mechanics = json('research/mechanics-audit-progress.json');
  const conflictReceipt = json('research/source-audit-batch5-conflict-integration.json');
  const animalReceipt = json('research/source-audit-batch5-unextracted.json');
  const classRetirementReceipt = json('research/source-audit-batch5-class-retired-ledger.json');
  const transitionsCurrent = conflictReceipt.changes.every(change => {
    const oldItem = baselineData[change.collection]?.find(row => row.id === change.itemId);
    const currentItem = currentData[change.collection]?.find(row => row.id === change.itemId);
    if (!oldItem || !currentItem) return false;
    const get = item => change.pointer.slice(1).split('/').reduce((value, part) => value?.[part.replaceAll('~1', '/').replaceAll('~0', '~')], item);
    const oldValue = get(oldItem);
    return (oldValue === undefined ? change.oldValue === null : JSON.stringify(oldValue) === JSON.stringify(change.oldValue)) && JSON.stringify(get(currentItem)) === JSON.stringify(change.newValue);
  });
  if (!transitionsCurrent) {
    assert.throws(() => reconcileCuratedNotes({
      curatedNotes: baselineHandoff.mechanicsAudit.specificReviewNoteCandidates.notes,
      currentHandoff: baselineHandoff, baselineData, currentData, mechanics, conflictReceipt,
      conflictReceiptSha256: sha(read('research/source-audit-batch5-conflict-integration.json')),
      animalReceipt, animalReceiptSha256: sha(read('research/source-audit-batch5-unextracted.json')),
      classRetirementReceipt, classRetirementReceiptSha256: sha(read('research/source-audit-batch5-class-retired-ledger.json')),
    }), /unreceipted caution transition requires review/);
    return;
  }
  const result = reconcileCuratedNotes({
    curatedNotes: baselineHandoff.mechanicsAudit.specificReviewNoteCandidates.notes,
    currentHandoff: baselineHandoff, baselineData, currentData, mechanics, conflictReceipt,
    conflictReceiptSha256: sha(read('research/source-audit-batch5-conflict-integration.json')),
    animalReceipt, animalReceiptSha256: sha(read('research/source-audit-batch5-unextracted.json')),
    classRetirementReceipt, classRetirementReceiptSha256: sha(read('research/source-audit-batch5-class-retired-ledger.json')),
  });
  assert.equal(result.curatedBaselineDenominator, 78);
  assert.equal(result.denominator, result.active.length);
  assert.ok(result.history.every(note => note.disposition && note.receiptSha256));
  assert.ok(result.active.some(note => note.itemId === 'phb-magic-user-animal-growth'));
});

test('supplemental monetary reports retain distinct source, row, money and XP denominators', () => {
  const hashes = {};
  const uaBytes = read('research/source-audit-batch5-ua-additional-prices.json');
  const ua = validateSupplementalMonetaryReport({path: 'research/source-audit-batch5-ua-additional-prices.json', json: JSON.parse(uaBytes), bytes: uaBytes, repoRoot: root, hashes});
  assert.deepEqual([ua.groups, ua.rows, ua.monetaryCells, ua.xpReferenceCells], [15, 583, 583, 566]);
  assert.equal(ua.upstreamIndependentOverlayReviewPending, true);

  const phbBytes = read('research/source-audit-batch5-phb-dmg-additional-prices.json');
  const phb = validateSupplementalMonetaryReport({path: 'research/source-audit-batch5-phb-dmg-additional-prices.json', json: JSON.parse(phbBytes), bytes: phbBytes, repoRoot: root, hashes});
  assert.deepEqual([phb.groups, phb.rows, phb.monetaryRowsOrClaims, phb.referencePriceRows, phb.referencePriceMatches], [18, 179, 179, 165, 165]);
  assert.equal(phb.upstreamIndependentOverlayReviewPending, true);
  assert.equal(hashes['research/source-audit-batch5-ua-additional-prices.json'], sha(uaBytes));
});

test('--check is read-only even when the current input receipts block a refresh', () => {
  const before = read('research/gaps-limitations-next-task.json');
  const result = spawnSync(process.execPath, ['tools/refresh-gaps-handoff.mjs', '--check'], {cwd: root, encoding: 'utf8'});
  assert.ok(result.status === 0 || result.status === 1);
  assert.equal(sha(read('research/gaps-limitations-next-task.json')), sha(before));
  assert.doesNotMatch(result.stdout || '', /^Refreshed /m);
});



function currentMonetaryFixture(rows = 583) {
  const metadata = {path: 'source.json', sha256: 'a'.repeat(64), rows};
  const audit = {generatedBy: 'tools/monetary-row-identity-audit.mjs', inputManifest: [{path: metadata.path, sha256: metadata.sha256}],
    records: Array.from({length: rows}, (_, index) => ({uid: `row-${index}`, input: metadata.path, inputSha256: metadata.sha256})),
    knownFindings: [], reviewResults: [], retainedUncertainties: Array.from({length: 8}, (_, index) => ({id: `question-${index}`, uid: `row-${index}`, status: 'retained-unresolved-source-question', semanticPass: false})),
    validation: {semanticRowIdentityComplete: false, structuralErrors: []}};
  const reviewManifest = {reviews: []};
  for (let index = 0; index < 195; index++) {
    const records = [{uid: `row-${index % rows}`}];
    audit.knownFindings.push({id: `finding-${index}`, kind: 'wrong-row-focus-independent-source-review', records, status: 'explicit-source-reviewed-repair'});
    reviewManifest.reviews.push({id: `review-${index}`, supersedes: `finding-${index}`, records, disposition: 'source-reviewed-repair', independent: true});
    audit.reviewResults.push({id: `review-${index}`, index, disposition: 'source-reviewed-repair', status: 'current-explicit-review', evidenceStatus: 'hash-matched'});
  }
  return {metadata, audit, reviewManifest, sourceReport: {}};
}

test('qualifying an extraction retains every underlying source interpretation question', () => {
  const bytes = read('tests/fixtures/gaps-qualified-source-scope-before.json.gz');
  assert.equal(sha(bytes), '63fe593d90057f691c46734c15c59fa533b2d9e73b170fde3fa5886b522571f7');
  const before = JSON.parse(gunzipSync(bytes));
  assert.deepEqual([before.fullFindingCensus.findings, before.fullFindingCensus.sourceScopeQuestions, before.fullFindingCensus.sourceRows], [195, 2, 9]);
  assert.equal(before.actualBeforeProjection.retainedUncertainties.length, 0);
  assert.equal(before.actualBeforeProjection.underlyingSourceQuestions, undefined);
  const fixture = before.projectionFixture;
  const result = projectCurrentMonetaryReview({...fixture, sourceReport: {}});
  assert.equal(result.unresolvedKnownFindingIds.length, 0, 'the extraction representation has its own reviewed disposition');
  assert.equal(result.underlyingSourceQuestions.length, 2);
  assert.equal(result.underlyingSourceQuestionRows, 9);
  assert.ok(result.underlyingSourceQuestions.every(question => question.status === 'unresolved' && question.semanticPass === false));
  assert.equal(result.globalAudit.retainedUncertainties, 8, 'the separate uncertainty register is not merged with these two questions');
  assert.equal(result.globalAudit.underlyingSourceQuestions, 2);
  assert.doesNotMatch(JSON.stringify(result.underlyingSourceQuestions), /50% money and time/);
  for (const finding of fixture.audit.knownFindings) { finding.underlyingSourceQuestion = {status: 'resolved'}; finding.semanticPass = true; }
  const relabeled = projectCurrentMonetaryReview({...fixture, sourceReport: {}});
  assert.equal(relabeled.underlyingSourceQuestions.length, 2);
  assert.ok(relabeled.underlyingSourceQuestions.every(question => question.status === 'unresolved' && question.semanticPass === false));
});

test('exact before-policy formatter reproduces blanket pending despite current scoped reviews', () => {
  const bytes = read('research/source-audit-batch5-gaps-monetary-projection-before.json');
  assert.equal(sha(bytes), 'c74daaabe8b9c7e7881c8499e1742076976f44a989a3c0b58138d08e59219955');
  const before = JSON.parse(bytes);
  assert.equal(before.entries.length, 2);
  assert.ok(before.entries.every(entry => entry.status === 'transcribed-independent-review-pending'));
  const oldValidator = vm.runInNewContext(`(${before.beforeValidatorSource.replace('export ', '')})`, {
    root, sha256: sha, readFileSync, resolve, execFileSync, containsXpKey: () => false,
    fail: message => {throw Error(message);},
  });
  const path = 'research/source-audit-batch5-ua-additional-prices.json', sourceBytes = read(path);
  const old = oldValidator({path, json: JSON.parse(sourceBytes), bytes: sourceBytes, repoRoot: root, currentReview: currentMonetaryFixture().audit});
  assert.equal(old.independentOverlayReviewPending, true);
  assert.match(old.status, /independent overlay review pending/);
  const projected = projectCurrentMonetaryReview(currentMonetaryFixture());
  assert.equal(projected.status, 'current-scoped-finding-reviews-recorded');
  assert.equal(projected.semanticPass, false);
});

test('full 583 and 179 source scopes derive current 195 finding dispositions while retaining eight questions', () => {
  for (const rows of [583, 179]) {
    const fixture = currentMonetaryFixture(rows), result = projectCurrentMonetaryReview(fixture);
    assert.equal(result.sourceRows, rows);
    assert.equal(result.exactAuditRows, rows);
    assert.equal(result.knownFindingStatuses['explicit-source-reviewed-repair'], 195);
    assert.equal(result.explicitReviewStatuses['current-explicit-review'], 195);
    assert.equal(result.globalAudit.retainedUncertainties, 8);
    assert.equal(result.retainedUncertainties.length, 8);
    assert.equal(result.sourceAbsence, false);
    assert.equal(result.semanticPass, false);
    assert.ok(result.recordsTouchedByCurrentExplicitReview <= rows);
  }
});

test('a changed input, omitted row, stale review or status waiver cannot borrow a current monetary disposition', () => {
  for (const mutate of [
    fixture => {fixture.audit.inputManifest[0].path = 'other.json';},
    fixture => {fixture.audit.inputManifest[0].sha256 = 'b'.repeat(64);},
    fixture => {fixture.audit.records[0].inputSha256 = 'b'.repeat(64);},
    fixture => {fixture.audit.records.pop();},
    fixture => {fixture.audit.reviewResults[0].status = 'stale-or-incomplete-review';},
    fixture => {fixture.audit.knownFindings[0].status = 'resolved';},
    fixture => {fixture.audit.retainedUncertainties[0].status = 'resolved';},
    fixture => {fixture.audit.validation.semanticRowIdentityComplete = true;},
  ]) {
    const fixture = currentMonetaryFixture(); mutate(fixture);
    assert.throws(() => projectCurrentMonetaryReview(fixture), /mismatch|current explicit review|unsupported|cannot be waived|semantic clearance/);
  }
  const pending = currentMonetaryFixture();
  pending.audit.reviewResults[0].status = 'stale-or-incomplete-review';
  pending.audit.knownFindings[0].status = 'focus-changed-needs-source-review';
  const result = projectCurrentMonetaryReview(pending);
  assert.equal(result.status, 'current-scoped-review-queue');
  assert.deepEqual(result.unresolvedKnownFindingIds, ['finding-0']);
  assert.equal(result.explicitReviewStatuses['stale-or-incomplete-review'], 1);
});

function sourceForMeaningReview(review) {
  const sourceReport = structuredClone(json('research/source-audit-batch5-ua-additional-prices.json'));
  const rows = new Map(sourceReport.rowRecords.map(row => [row.recordId, row]));
  for (const row of rows.values()) row.evidence.sourceNoteDefinitionLinks = [];
  for (const record of review.records) {
    const row = rows.get(record.row.recordId);
    row.footnoteMarkers = structuredClone(record.row.footnoteMarkers);
    row.evidence.rowHighlightBounds.pdfPagePoints = structuredClone(record.row.candidateRowAnchorBoundsPdfPagePointsTopLeftLTRB);
    row.evidence.sourceNoteDefinitionLinks.push({definitionId: record.note.definitionId,
      sourcePage: {sourcePdfSha256: record.note.sourcePdfSha256, sourcePageImageSha256: record.note.sourcePageImageSha256},
      definitionBoundsPdfPagePointsTopLeftLTRB: structuredClone(record.note.definitionBoundsPdfPagePointsTopLeftLTRB),
      definitionCrop: {sha256: record.note.definitionCrop.sha256}});
  }
  return sourceReport;
}

test('103 note-meaning joins retain 4 applicable, 98 qualified, 1 uncertain and five glyph holds separately', () => {
  const bytes = read('research/source-audit-batch5-ua-context-meaning-independent-review.json'), review = JSON.parse(bytes);
  const sourceReport = sourceForMeaningReview(review);
  const args = {sourceReport, sourceSha256: 'a'.repeat(64), review, reviewSha256: sha(bytes)};
  const result = projectUaMeaningReview(args);
  assert.deepEqual(result.dispositions, {'source-applicable': 4, qualified: 98, uncertain: 1});
  assert.equal(result.rowDefinitionLinks, 103);
  assert.equal(result.unresolvedApplicability.length, 1);
  assert.equal(result.unresolvedGlyphAssociations.length, 5);
  assert.equal(result.semanticPass, false);
  assert.throws(() => projectUaMeaningReview({...args, reviewSha256: 'b'.repeat(64)}), /identity is stale/);
  const changed = structuredClone(sourceReport);
  changed.rowRecords.find(row => row.recordId === review.records[0].row.recordId).footnoteMarkers = [];
  assert.throws(() => projectUaMeaningReview({...args, sourceReport: changed}), /join is stale/);
  const waived = structuredClone(review);
  waived.records[0].disposition = 'resolved';
  assert.throws(() => projectUaMeaningReview({...args, review: waived}), /join is stale/);
  const hiddenGlyphs = structuredClone(review);
  hiddenGlyphs.findings.unresolvedGlyphAssociations = [];
  assert.throws(() => projectUaMeaningReview({...args, review: hiddenGlyphs}), /cannot be waived/);
});


test('PHB/DMG 179 normalized rows stay distinct from 165 reference rows and nine financial contexts', () => {
  const fixture = currentMonetaryFixture(179);
  fixture.metadata.sourceIdentities = {PHB: 'c'.repeat(64), DMG: 'd'.repeat(64)};
  fixture.audit.records.forEach((row, index) => {row.pointer = `/review/sourceRowsOrClaims/${index}`;});
  fixture.audit.records.push(...Array.from({length: 174}, (_, index) => ({uid: `aux-${index}`, input: fixture.metadata.path, inputSha256: fixture.metadata.sha256, pointer: `/additionalReferenceSheetReview/${index}`})));
  const result = projectCurrentMonetaryReview(fixture);
  assert.deepEqual([result.sourceRows, result.exactAuditRows, result.inputAuditRecords, result.auxiliaryInputAuditRecords], [179, 179, 353, 174]);
  fixture.audit.records[0].pointer = '/additionalReferenceSheetReview/misbound';
  assert.throws(() => projectCurrentMonetaryReview(fixture), /denominator\/hash mismatch/);
});


test('actual V5 workflow-status regression retains structural/source guards without granting a source grade', () => {
  const fixtureBytes = read('research/source-audit-batch5-gaps-pdv5-workflow-status-before.json');
  assert.equal(sha(fixtureBytes), '7ba7b5154138c807a171ed33de2efd100897530411a6feac4a0baf78b59a128a');
  const fixture = JSON.parse(fixtureBytes);
  assert.equal(fixture.sourceArtifact.sha256, 'e4cf124385a7e199672ab9268987d5ebf08f64d4cc08819e9e721596bce8c5e6');
  assert.equal(fixture.beforeOutcome.accepted, false);
  const path = fixture.sourceArtifact.intendedPublicPath;
  const report = structuredClone(json(path));
  report.status = fixture.sourceArtifact.workflowStatus;
  const validate = value => {const bytes = Buffer.from(JSON.stringify(value)); return validateSupplementalMonetaryReport({path, bytes, json: value, repoRoot: root, hashes: {}});};
  const oldValidator = vm.runInNewContext(`(${fixture.validatorSource.replace('export ', '')})`, {
    root, sha256: sha, readFileSync, resolve, execFileSync, containsXpKey: () => false,
    fail: message => {throw Error(message);},
  });
  assert.throws(() => oldValidator({path, bytes: Buffer.from(JSON.stringify(report)), json: report, repoRoot: root}), /denominators are incomplete or schema changed/);
  const current = validate(report);
  assert.deepEqual([current.groups, current.rows, current.referencePriceRows], [18, 179, 165]);
  assert.equal(current.upstreamReviewStatus, fixture.sourceArtifact.workflowStatus);
  assert.equal(current.status, 'bounded-source-transcription');
  assert.equal(current.currentReview, undefined);
  for (const mutate of [
    value => {value.review.sourceRowsOrClaims.pop();},
    value => {value.review.denominators.groupsWithTypedOutput = 17;},
    value => {value.baseline.censusFileSha256 = '0'.repeat(64);},
    value => {value.baseline.priceInventoryFileSha256 = '0'.repeat(64);},
    value => {value.baseline.sources.PHB.sourceFileSha256 = '0'.repeat(64);},
  ]) {
    const bad = structuredClone(report); mutate(bad);
    assert.throws(() => validate(bad), /denominators|identity|hash|incomplete/);
  }
});
