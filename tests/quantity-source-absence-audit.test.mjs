import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
 beforeBaselinePath,calibrationsPath,quantitySourceAbsenceInputs,
 buildQuantitySourceAbsenceReport,classifyQuantityText,loadFrozenCalibrations,
 lexicalAbsencePattern,quantityUncertaintyPattern,
} from '../tools/quantity-source-absence-audit.mjs';

const root=resolve(import.meta.dirname,'..');
const sha=value=>createHash('sha256').update(value).digest('hex');
function syntheticDocuments(dist){
 return quantitySourceAbsenceInputs.map(config=>{
  const data=config.key==='dist'?dist:{};const bytes=Buffer.from(JSON.stringify(data));
  return {...config,bytes,sha256:sha(bytes),data};
 });
}

test('frozen before baseline preserves the known Deck Gem positive even if current data later changes',()=>{
 const {before,calibrations,beforeHash,calibrationHash}=loadFrozenCalibrations();
 assert.equal(beforeHash,beforeBaselinePath==='research/quantity-source-absence-detector-baseline.json'?'17e3c215c7d3b0becae642d906ba179f4510e32d766d084761e6c553a9ad676a':null);
 assert.equal(calibrationHash,'5ffbc3fe90b0cac46b736115ea946639a2fc73636c04275212b4c80c69fff709');
 assert.equal(calibrations.caseCount,20);
 assert.equal(calibrations.sourceAbsenceAssertionTextCount,17);
 assert.equal(calibrations.contextOrWorkflowNonAssertionCount,3);
 const deck=calibrations.cases.filter(row=>row.deckGemCalibration);
 assert.equal(deck.length,6);
 assert.ok(deck.every(row=>row.baselineClassification==='source-absence-assertion-in-text-unverified'&&/^[a-f0-9]{64}$/.test(row.valueSha256)));
 assert.ok(deck.every(row=>row.owner.identity.sourceRowOrClaimId==='dmg-deck-gem-card'));
 assert.ok(lexicalAbsencePattern.test('gem count unspecified')&&quantityUncertaintyPattern.test('gem count unspecified'));
 const syntheticCurrent=syntheticDocuments({rules:[],spells:[],equipment:[],matrices:[],classes:[],sources:[]});
 const report=buildQuantitySourceAbsenceReport({documents:syntheticCurrent,frozen:{before,calibrations,beforeHash,calibrationHash}});
 assert.equal(report.preservedKnownDeckGem.baselineCaseCount,6);
 assert.ok(report.preservedKnownDeckGem.cases.every(row=>row.liveRelation==='current-pointer-missing'));
 assert.ok(report.preservedKnownDeckGem.noLongerMatchingIsNotAPass);
});

test('three frozen lexical scope/workflow cases remain non-assertions',()=>{
 const {calibrations}=loadFrozenCalibrations();
 const cases=calibrations.cases.filter(row=>row.baselineClassification==='context-or-workflow-uncertainty-not-source-absence');
 assert.equal(cases.length,3);
 const text='quantity unspecified for review scope';
 for(const row of cases){
  const calibrated={...row,valueSha256:sha(text)};
  assert.equal(classifyQuantityText(text,row.jsonPointer,calibrated),'context-or-workflow-uncertainty-not-source-absence',row.inputKey+row.jsonPointer);
 }
 assert.equal(classifyQuantityText('no-cue pages remain unknown, not a pass','/scope/coverageRule',null),'not-assessable-or-evidence-unavailable');
});

test('null quantity metadata is catalogued separately and never treated as absence',()=>{
 const {frozen}=loadFrozenCalibrations();
 const dist={rules:[{id:'fixture',quantity:null,status:'quantity unclear'}],spells:[],equipment:[],matrices:[],classes:[],sources:[],progressionExplainer:{}};
 const report=buildQuantitySourceAbsenceReport({documents:syntheticDocuments(dist),frozen});
 assert.equal(report.denominators.allScalarLeaves,3);
 assert.equal(report.denominators.nullQuantityLikeMetadataLeaves,1);
 assert.equal(report.nullQuantityLikeMetadata[0].jsonPointer,'/rules/0/quantity');
 assert.equal(report.denominators.currentLexicalAbsenceCandidateLeaves,0);
 assert.ok(!report.candidates.some(row=>row.jsonPointer==='/rules/0/quantity'));
 assert.equal(report.candidates.find(row=>row.jsonPointer==='/rules/0/status').primaryCategory,'semantic-question-or-identity-unresolved');
});

test('a newly added record changes the complete scalar-leaf inventory and remains pending review',()=>{
 const {frozen}=loadFrozenCalibrations();
 const base={rules:[{id:'fixture'}],spells:[],equipment:[],matrices:[],classes:[],sources:[],progressionExplainer:{}};
 const changed=structuredClone(base);changed.equipment.push({id:'new-record',quantity:null,status:'quantity not stated'});
 const before=buildQuantitySourceAbsenceReport({documents:syntheticDocuments(base),frozen});
 const after=buildQuantitySourceAbsenceReport({documents:syntheticDocuments(changed),frozen});
 assert.equal(before.denominators.allScalarLeaves,1);
 assert.equal(after.denominators.allScalarLeaves,4);
 assert.equal(after.inputs.find(row=>row.key==='dist').scalarLeaves,4);
 const candidate=after.candidates.find(row=>row.jsonPointer==='/equipment/0/status');
 assert.ok(candidate);
 assert.equal(candidate.primaryCategory,'unreviewed-lexical-source-absence-candidate');
 assert.equal(candidate.reviewState,'pending-human-classification-and-source-review');
 assert.equal(after.nullQuantityLikeMetadata.length,1);
 assert.ok(after.historicalBeforeCalibrations.every(row=>row.liveRelation==='current-pointer-missing'));
});

test('frozen catalog scope distinguishes content records from source metadata records',()=>{
 const baseline=JSON.parse(readFileSync(resolve(root,beforeBaselinePath),'utf8'));
 assert.equal(baseline.scope.catalogContentRecordDenominator,995);
 assert.match(baseline.scope.catalogRecordCountMethod,/994 array-backed catalog entries, plus one progressionExplainer object = 995 content records/);
 assert.match(baseline.scope.catalogRecordCountMethod,/Separate source metadata array has 3 entries/);
 assert.match(baseline.scope.catalogRecordCountMethod,/all top-level arrays sum to 997/);
 assert.equal(quantitySourceAbsenceInputs.length,10);
 assert.deepEqual(quantitySourceAbsenceInputs.slice(1).map(row=>row.key),['canonical','ua','phbDmg','passages','descriptions','receipts','phbDmgCensus','uaCensus','monsterCensus']);
 const calibrations=JSON.parse(readFileSync(resolve(root,calibrationsPath),'utf8'));
 assert.equal(calibrations.baselineArtifactSha256,'17e3c215c7d3b0becae642d906ba179f4510e32d766d084761e6c553a9ad676a');
});
