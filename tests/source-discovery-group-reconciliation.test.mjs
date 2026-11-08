import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {buildSourceDiscoveryGroupReconciliation, loadSourceDiscoveryGroupReconciliation} from '../tools/source-discovery-group-reconciliation.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const baselineCommit = '679b15d1c580172e54314829c1c3c86dc78b65f3';
const baselineInventorySha256 = 'f2a02d1e990cf9bd30135f7dc2fcd2f10f9e1f2e172ee594e396677c32fb3852';
const uaCensusSha256 = 'f1f797d9e8664589af5308737d9bc9d5e5dd536339349609fbeec5dc2a58c4b9';
const phbDmgCensusSha256 = 'a6e653a0ee4854e2d28b2cbc8049c60f038d4e8eabbcc822b10b730ef496ae79';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(resolve(root, path));
const json = path => JSON.parse(read(path));
const historical = path => execFileSync('git', ['show', `${baselineCommit}:${path}`], {cwd: root, maxBuffer: 32 * 1024 * 1024});
function sourceInputs() {
  const priceInventory = json('research/price-source-inventory.json');
  const uaSupplement = json('research/source-audit-batch5-ua-additional-prices.json');
  const phbDmgSupplement = json('research/source-audit-batch5-phb-dmg-additional-prices.json');
  const sourceCensusFileHashes = {}, sourceCensusArtifacts = {};
  for (const path of ['research/price-source-inventory-ua-other.json', 'research/price-source-inventory-phb-dmg-other.json']) {
    const bytes = read(path);
    sourceCensusFileHashes[path] = sha(bytes);
    sourceCensusArtifacts[path] = JSON.parse(bytes);
  }
  return {priceInventory,uaSupplement,phbDmgSupplement,sourceCensusFileHashes,sourceCensusArtifacts};
}
const build = changes => buildSourceDiscoveryGroupReconciliation({...sourceInputs(),...changes});

test('the actual 679b15d canonical inventory preserves all 33 groups as untranscribed baseline', () => {
  const bytes = historical('research/price-source-inventory.json');
  const inventory = JSON.parse(bytes);
  assert.equal(sha(bytes), baselineInventorySha256);
  const expected = [];
  for (const census of inventory.sourcePageCensuses.filter(item => ['phb-dmg-other','ua-other'].includes(item.id))) {
    census.sourceArtifact.tableGroups.forEach((group,index) => expected.push({
      groupId: census.id === 'ua-other' ? `ua-other-${String(index + 1).padStart(3,'0')}` : group.recordId,
      censusId: census.id,
      censusSha256: census.sourceFileSha256,
      rowTranscriptionComplete: group.rowTranscriptionComplete,
    }));
  }
  assert.equal(expected.length, 33);
  assert.ok(expected.every(group => group.rowTranscriptionComplete === false));
  const report = loadSourceDiscoveryGroupReconciliation();
  assert.equal(report.baselineReceipt.priceInventorySha256, baselineInventorySha256);
  assert.equal(report.baselineReceipt.censusGroupDenominator, 33);
  assert.equal(report.baselineReceipt.groupsInitiallyUntranscribed, 33);
  assert.deepEqual(report.baselineReceipt.groups.map(group => ({groupId:group.groupId,censusId:group.censusId,censusSha256:group.censusSha256,baselineRowTranscriptionComplete:group.baselineRowTranscriptionComplete})),
    expected.map(({rowTranscriptionComplete,...group})=>({...group,baselineRowTranscriptionComplete:rowTranscriptionComplete})));
});

test('UA15 and PHB/DMG18 supplements join all 33 groups by census hash and stable group ID', () => {
  const report = loadSourceDiscoveryGroupReconciliation();
  assert.equal(report.validation.valid, true, JSON.stringify(report.validation.issues));
  assert.equal(report.reconciliation.identityKey, 'census SHA-256 + stable group ID');
  assert.equal(report.reconciliation.baselineGroups, 33);
  assert.equal(report.reconciliation.exactTypedGroups, 33);
  assert.equal(report.reconciliation.status, 'all-33-baseline-groups-exactly-joined-to-typed-supplements');
  assert.deepEqual(report.reconciliation.unmatchedBaselineGroups, []);
  assert.deepEqual(report.reconciliation.unmatchedSupplementGroups, []);
  assert.deepEqual(report.sourceReports.ua.groupDenominators,{baselineGroups:15,supplementaryGroupReviews:15,exactTypedGroups:15});
  assert.deepEqual(report.sourceReports.phbDmg.groupDenominators,{baselineGroups:18,supplementaryGroupReviews:18,exactTypedGroups:18});
  assert.equal(report.baselineReceipt.censusArtifactMatches['ua-other'],true);
  assert.equal(report.baselineReceipt.censusArtifactMatches['phb-dmg-other'],true);
  assert.equal(report.sourceReports.ua.censusSha256,uaCensusSha256);
  assert.equal(report.sourceReports.phbDmg.censusSha256,phbDmgCensusSha256);
});

test('typed claims, physical source rows, value cells and item citations retain separate denominators', () => {
  const report = loadSourceDiscoveryGroupReconciliation();
  assert.deepEqual(report.structuredRecords,{uaRowsOrClaims:583,phbDmgRowsOrClaims:179,totalTypedSourceRowsOrClaims:762,interpretation:'Typed source records/claims; this is not a count of app item citations or mapped site items.'});
  assert.deepEqual(report.sourceReports.ua.physicalRows,{physicalTableRows:578,nonTableProseListEntries:5,sourceRowDenominator:583,method:'Only explicitly labeled prose-value-list source evidence is excluded from physical table rows; remaining row units follow the supplement’s source-row denominator.'});
  assert.deepEqual(report.sourceReports.ua.structuredCells,{allValueCells:1149,gpMonetaryCells:583,xpReferenceCells:566,sourceDeclaredAllValueCells:1149});
  assert.equal(report.sourceReports.phbDmg.physicalRows.tableRowsOrOutcomesReviewed,201);
  assert.equal(report.sourceReports.phbDmg.structuredRecords.sourceMonetaryRowsOrClaims,179);
  assert.equal(report.sourceReports.phbDmg.structuredCells.count,null);
  assert.equal(report.itemCitationMappings.count,null);
  assert.equal(report.itemCitationMappings.status,'not-measured-by-typed-supplements');
});

test('a page/title match cannot replace a mismatched exact UA group ID', () => {
  const inputs = sourceInputs();
  inputs.uaSupplement.groupReviews[0].groupId = 'ua-other-999';
  const report = build(inputs);
  assert.equal(report.validation.valid,false);
  assert.equal(report.reconciliation.exactTypedGroups,32);
  assert.ok(report.reconciliation.unmatchedBaselineGroups.some(group=>group.groupId==='ua-other-001'&&group.censusId==='ua-other'));
  assert.ok(report.reconciliation.unmatchedSupplementGroups.some(group=>group.groupId==='ua-other-999'));
  assert.equal(report.structuredRecords.uaRowsOrClaims,566);
});

test('a mismatched census SHA leaves all same-page UA groups explicitly unmatched', () => {
  const inputs = sourceInputs();
  inputs.uaSupplement.scope.inventorySha256 = '0'.repeat(64);
  const report = build(inputs);
  assert.equal(report.validation.valid,false);
  assert.equal(report.sourceReports.ua.sourceHashVerified,false);
  assert.equal(report.sourceReports.ua.groupDenominators.exactTypedGroups,0);
  assert.equal(report.reconciliation.exactTypedGroups,18);
  assert.equal(report.reconciliation.unmatchedBaselineGroups.filter(group=>group.censusId==='ua-other').length,15);
  assert.equal(report.reconciliation.unmatchedSupplementGroups.filter(group=>group.censusId==='ua-other'&&group.reason==='census-sha-mismatch').length,15);
  assert.equal(report.structuredRecords.uaRowsOrClaims,0);
});

test('a group-copy mismatch or aggregate cell mismatch blocks typed coverage for that cohort', () => {
  const staleCopy = sourceInputs();
  staleCopy.priceInventory.sourcePageCensuses.find(census=>census.id==='phb-dmg-other').sourceArtifact.tableGroups[0].title='edited copy';
  const copyResult = build(staleCopy);
  assert.equal(copyResult.sourceReports.phbDmg.sourceHashVerified,false);
  assert.equal(copyResult.sourceReports.phbDmg.groupDenominators.exactTypedGroups,0);
  assert.ok(copyResult.validation.issues.some(issue=>issue.code==='embedded-census-group-copy-mismatch'));

  const wrongCellTotal = sourceInputs();
  wrongCellTotal.uaSupplement.aggregate.structuredValueCellCount++;
  const cellResult = build(wrongCellTotal);
  assert.equal(cellResult.sourceReports.ua.integrityValid,false);
  assert.equal(cellResult.sourceReports.ua.groupDenominators.exactTypedGroups,0);
  assert.equal(cellResult.reconciliation.exactTypedGroups,18);
});
