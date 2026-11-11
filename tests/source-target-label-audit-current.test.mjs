import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {weaponOwnerIds} from './helpers/weapon-source-current-cohort.mjs';
import {assertUaSourceContextBindingCohort} from './helpers/ua-source-closed-v28-context.mjs';
import {readMmTreasureCurrentSourceInputs,assertMmTreasureCurrentSourceCohort} from './helpers/mm-treasure-current-m1-cohort-v2.mjs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');

test('current label mode audits the present collector without claiming a fresh rendered sweep', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'source-target-label-audit-'));
  try {
    const currentCohortSummary=assertMmTreasureCurrentSourceCohort(readMmTreasureCurrentSourceInputs(root));
    execFileSync(process.execPath, ['tools/source-target-label-audit.mjs', '--current', '--output-dir', outputDir, '--check'], {stdio: 'pipe'});
    const summary = JSON.parse(readFileSync(join(outputDir, 'current-summary.json'), 'utf8'));
    const compressed = readFileSync(join(outputDir, 'current.json.gz'));
    const hash = createHash('sha256').update(compressed).digest('hex');
    assert.equal(hash, summary.fullReport.sha256);
    const report = JSON.parse(gunzipSync(compressed).toString('utf8'));
    assert.equal(report.denominator.contentRecords, 1064);
    assert.equal(report.denominator.routeRecords, 1064);
    assert.equal(report.denominator.primaryRouteRecords, 1059);
    assert.equal(report.denominator.auxiliaryRouteRecords, 5);
    assert.ok(report.entries.some(row=>row.owner?.collection==='rules'&&row.owner?.itemId==='phb-druid-mistletoe-spell-components'),'current collector includes the exact new Druid owner');
    assert.ok(report.entries.some(row=>row.owner?.collection==='rules'&&row.owner?.itemId==='mm-treasure-types-table'),'current collector includes the MM Treasure Types table owner');
    assert.ok(report.entries.some(row=>row.owner?.collection==='rules'&&row.owner?.itemId==='mm-treasure-type-use'),'current collector includes the MM treasure procedure owner');
    assert.equal(report.denominator.collections.matrices, 4);
    assert.equal(report.denominator.collections.progressionExplainer, 1);
    assert.equal(report.denominator.collectorTargets, report.entries.length);
    const bindings=JSON.parse(readFileSync('research/price-source-inventory.json')).fieldEvidenceBindings;
    const uaContexts=assertUaSourceContextBindingCohort(bindings);
    assert.equal(uaContexts.length,24);assert.equal(report.denominator.collectorTargets,currentCohortSummary.canonicalBindings,'the collector target count equals the pinned actual current canonical inventory');
    const targetIdentity=row=>JSON.stringify([row.collection,row.itemId,row.fieldPointer]);
    const expectedTargets=bindings.filter(row=>row.collection==='classes'&&row.fieldPointer.startsWith('/references/')).map(targetIdentity).sort();
    assert.equal(expectedTargets.length,25,'one old class reference and24 new context references');
    const currentTargets=report.entries.filter(row=>row.owner?.collection==='classes'&&row.fieldPointer?.startsWith('/references/')).map(row=>targetIdentity({...row.owner,fieldPointer:row.fieldPointer})).sort();
    assert.deepEqual(currentTargets,expectedTargets,'the old reference and all24 new region-context references have distinct correctly owned native collector targets');
    for(const [index,itemId]of weaponOwnerIds.entries())assert.equal(report.entries.filter(row=>row.owner?.collection==='rules'&&row.owner.itemId===itemId).length,[43,63][index]);
    for (const itemId of [
      'dmg-cleric-druid-monk-attack-matrix',
      'dmg-magic-user-illusionist-attack-matrix',
      'dmg-thief-assassin-attack-matrix',
    ]) {
      assert.ok(report.entries.some(row => row.owner?.collection === 'matrices' && row.owner?.itemId === itemId), `current collector omits ${itemId}`);
    }
    assert.ok(report.entries.filter(row=>row.owner?.collection==='equipment'&&row.owner?.itemId==='ua-jo-stick').length>=14,'current captions include all distinct Jo fields');
    assert.equal(report.denominator.currentBrowserRenderedControls, 'not-run');
    assert.equal(report.denominator.currentDistinctRenderedPayloads, 'not-assessed');
    assert.equal(report.categories.afterNumericOnlyCandidates, 0);
    assert.ok(report.entries.every(row => row.owner?.collection && row.owner?.itemId && row.sourceName));
    assert.ok(report.entries.every(row => row.afterLabel && (!row.fieldPointer || !/^\d+$/.test(row.afterLabel))));
  } finally {
    rmSync(outputDir, {recursive: true, force: true});
  }
});
