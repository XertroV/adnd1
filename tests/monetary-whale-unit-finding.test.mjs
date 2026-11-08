import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditMonetaryRowIdentity,hash} from '../tools/monetary-row-identity-audit.mjs';

const extension=JSON.parse(readFileSync(new URL('../research/source-audit-batch5-monetary-whale-unit-finding-extension-v2.json',import.meta.url)));
const finding=extension.knownFindings[0],oldRecord=extension.records[0];
const reviewBytes=Buffer.from('Synthetic contract test only; not a real source review.');
const reviewEvidence=new Map([['fixture-only',reviewBytes]]),evidence={path:'fixture-only',sha256:hash(reviewBytes)};

test('Whale unit finding binds all mirrored source paths to one typed collector field',()=>{
 assert.equal(finding.id,'mm-whale-ambergris-per-lump-unit-editorial');
 assert.equal(finding.kind,'typed-content-mismatch');
 assert.equal(oldRecord.uid,'source-census-claim:mm-whale-ambergris');
 assert.equal(extension.mirrorInputs.length,3);
 assert.equal(finding.mirrorFieldBindings.length,4);
 assert.ok(finding.mirrorFieldBindings.every(ref=>ref.collectorUid===oldRecord.uid&&ref.collectorTypedFieldPointer==='/unit'));
 assert.ok(finding.mirrorFieldBindings.every(ref=>ref.expectedTypedValue===null&&ref.expectedEditorialUnit===null));
 assert.ok(finding.mirrorFieldBindings.every(ref=>ref.currentValueSha256===hash('per ambergris lump (size unspecified)')));
 assert.ok(finding.mirrorFieldBindings.every(ref=>ref.historicalEditorialUnit.retainInFindingHistory));
 assert.equal(finding.records[0].sourceValueSha256ByPointer['/unit'],hash('per ambergris lump (size unspecified)'));
 assert.equal(extension.positiveFixture.uid,'source-census-claim:mm-whale-carcass');
 assert.equal(extension.positiveFixture.classification,'explicit-printed-unit-retained-unchanged');
});

function makeReview(current){
 return {id:'synthetic-whale-null-unit-repair',independent:true,disposition:'source-reviewed-repair',supersedes:finding.id,evidence,records:[{uid:current.uid,rowIdentitySha256:current.rowIdentitySha256,focusGeometrySha256:current.focusGeometrySha256,contextGeometrySha256:current.contextGeometrySha256,contextEvidenceSha256:current.contextEvidenceSha256,recordSha256:current.recordSha256,confirmedPointerSha256:{'/unit':current.sourceValueSha256ByPointer['/unit']}}]};
}
function syntheticCurrent(expectedValue){
 const current=structuredClone(oldRecord),valueHash=hash(expectedValue);
 current.sourceValueSha256ByPointer['/unit']=valueHash;current.annotations['/unit']=expectedValue;
 current.recordSha256=hash({previous:oldRecord.recordSha256,unit:valueHash});
 return current;
}

test('typed-content repair accepts the exact expected null while preserving old editorial text in history',()=>{
 const current=syntheticCurrent(null),review=makeReview(current),result=auditMonetaryRowIdentity([current],{knownFindings:[finding],reviews:[review],reviewEvidence});
 assert.equal(result.knownFindings[0].status,'explicit-source-reviewed-repair');
 assert.equal(finding.typedFieldExpectations[0].expectedValue,null);
 assert.equal(finding.typedFieldExpectations[0].expectedEditorialUnit,null);
 assert.equal(finding.typedFieldExpectations[0].editorialHistory.priorValue,'per ambergris lump (size unspecified)');
});

test('typed-content repair rejects a guessed per-lump unit and rejects altered before hashes',()=>{
 const nonNull=syntheticCurrent('per ambergris lump'),badReview=makeReview(nonNull),badResult=auditMonetaryRowIdentity([nonNull],{knownFindings:[finding],reviews:[badReview],reviewEvidence});
 assert.notEqual(badResult.knownFindings[0].status,'explicit-source-reviewed-repair');
 const nullCurrent=syntheticCurrent(null),badBefore=structuredClone(finding);badBefore.confirmedPointers[0].beforeValueSha256='0'.repeat(64);
 const changedReview=makeReview(nullCurrent),mismatch=auditMonetaryRowIdentity([nullCurrent],{knownFindings:[badBefore],reviews:[changedReview],reviewEvidence});
 assert.notEqual(mismatch.knownFindings[0].status,'explicit-source-reviewed-repair');
 const selfCertified=structuredClone(finding);selfCertified.records[0].sourceValueSha256ByPointer['/unit']='0'.repeat(64);
 const selfCertifiedMismatch=auditMonetaryRowIdentity([nullCurrent],{knownFindings:[selfCertified],reviews:[makeReview(nullCurrent)],reviewEvidence});
 assert.notEqual(selfCertifiedMismatch.knownFindings[0].status,'explicit-source-reviewed-repair');
 const changedExpected=structuredClone(finding);changedExpected.typedFieldExpectations[0].expectedValue='per ambergris lump';changedExpected.typedFieldExpectations[0].expectedValueSha256=hash('per ambergris lump');
 const expectedMismatch=auditMonetaryRowIdentity([nullCurrent],{knownFindings:[changedExpected],reviews:[makeReview(nullCurrent)],reviewEvidence});
 assert.notEqual(expectedMismatch.knownFindings[0].status,'explicit-source-reviewed-repair');
});
