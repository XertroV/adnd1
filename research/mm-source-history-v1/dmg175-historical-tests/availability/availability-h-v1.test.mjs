import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadHistoricalHAvailabilityInputs} from '../../../../tests/helpers/mm-current-historical-test-inputs-v1.mjs';

const repo = path.resolve(import.meta.dirname, '../../../..');
// Historical pre-D175 projection comparator. Positive inputs are exact full-M1 H blobs;
// the separate v2 proof first validates the actual current-MM cohort.
const frozenCommit = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const productionModulePath = path.join(repo, 'tools/dmg175-availability-projection.mjs');
const sealedFixtureDir = path.join(repo, 'research/dmg175-current-content-projection-v5-production-test/fixtures');
const v1FixturePath = path.join(sealedFixtureDir, 'dmg175-availability-projection-v1-f005.mjs');
const v2FixturePath = path.join(sealedFixtureDir, 'dmg175-availability-projection-v2-cfdf.mjs');
const planPath = path.join(repo, 'research/dmg175-current-content-projection-v1/inputs/target-plan-manifest-v2.json');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const readBytes = p => readFileSync(p);
const readJson = p => JSON.parse(readBytes(p));
function assertExactHistoricalH(){
  const proof=hInputs.proof;
  const summary=proof.historicalHSummary;
  assert.deepEqual(summary,{sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',owners:1062,canonicalBindings:5655,priorWholeBindings:4931,addedBindings:724,manualAdditions:321,newRules:48,sourceTableRows:244,sourceCells:343,historicalMechanicsReviews:1215},'exact historical H source cohort');
  return summary;
}

function gitShow(relativePath) {
  return execFileSync('git', ['show', `${frozenCommit}:${relativePath}`], {
    cwd: repo,
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function reorderObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reorderObjectKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).reverse().map(key => [key, reorderObjectKeys(value[key])]));
}

async function importHistoricalFixture(fixturePath, expectedSha256, booksAdapter) {
  let source = readBytes(fixturePath);
  assert.equal(sha256(source), expectedSha256, `historical fixture bytes are preserved: ${path.basename(fixturePath)}`);
  source = source.toString('utf8');
  const booksImport = "from '../dist/books.js'";
  const matches = source.split(booksImport).length - 1;
  if (matches) {
    assert.equal(matches, 1, 'historical adapter only recognizes the single Books import');
    assert.ok(booksAdapter, 'Books adapter must be explicitly provided for the historical module');
    source = source.replace(booksImport, `from ${JSON.stringify(booksAdapter)}`);
  }
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const production = await import(pathToFileURL(productionModulePath).href);
const hInputs = loadHistoricalHAvailabilityInputs(Object.values(production.DMG175_OWNER_CATALOGS));
const baselineDataBytes = gitShow('dist/data.json');
const baselineData = JSON.parse(baselineDataBytes);
const handoffBytes = hInputs.handoffBytes;
const handoff = hInputs.handoff;
const currentDataBytes = hInputs.dataBytes;
const data = hInputs.data;
const targetPlanBytes = readBytes(planPath);
const targetPlan = JSON.parse(targetPlanBytes);
const booksPath = path.join(repo, 'dist/books.js');
const booksUrl = pathToFileURL(booksPath).href;

const allowedCatalogPaths = new Set([
  handoff.missingReferencedContent.missingCitedPages[0].currentReference.catalog,
  ...Object.values(production.DMG175_OWNER_CATALOGS),
]);
const catalogTemplates = new Map();
const sourceCatalogSha256 = {};
for (const catalogPath of allowedCatalogPaths) {
  const relative = path.join('dist', catalogPath);
  const template = hInputs.catalogs.get(catalogPath);
  assert.ok(template, `catalog is in the closed full-M1 H blob manifest: ${catalogPath}`);
  catalogTemplates.set(relative, template);
  sourceCatalogSha256[catalogPath] = hInputs.catalogHashes[catalogPath];
}

function loadCatalog(relative) {
  assert.ok(relative.startsWith('dist/'), 'production loader requests stay within dist/');
  const template = catalogTemplates.get(relative);
  assert.ok(template, `catalog is allow-listed: ${relative}`);
  return structuredClone(template);
}

function derive(module = production, mutateCatalog = undefined) {
  return module.deriveDmg175Availability({
    data,
    baselineData,
    handoff,
    targetPlan,
    loadCatalog: relative => {
      const catalog = loadCatalog(relative);
      mutateCatalog?.(relative, catalog);
      return catalog;
    },
  });
}

const currentDataSha256 = sha256(currentDataBytes);
const positiveResult = derive();
const evidence = {
  ...positiveResult,
  evidence: {
    ...positiveResult.evidence,
    currentDataSha256,
    sourceCatalogSha256,
  },
};
const projectedHandoff = production.projectDmg175Handoff({handoff, evidence});

function coverageEntry(candidateEvidence = evidence) {
  const candidateHandoff = candidateEvidence === evidence
    ? projectedHandoff
    : production.projectDmg175Handoff({handoff, evidence: candidateEvidence});
  return production.buildDmg175CoverageEntry({data, handoff: candidateHandoff, evidence: candidateEvidence});
}

function regionMutation(mutator) {
  return (relative, catalog) => {
    if (relative.endsWith('rules-appendix-c-character-levels.json')) mutator(catalog.regions[0]);
  };
}

test('historical H availability projection preserves legacy controls and closed negatives after strict current-MM proof', async t => {
  await t.test('loads exact production module, immutable baseline inputs, and explicit historical H preimage', () => {
    assert.deepEqual(assertExactHistoricalH(),{sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',owners:1062,canonicalBindings:5655,priorWholeBindings:4931,addedBindings:724,manualAdditions:321,newRules:48,sourceTableRows:244,sourceCells:343,historicalMechanicsReviews:1215},'exact H preimage, after actual current-MM proof');
    assert.equal(sha256(readBytes(productionModulePath)), '4636fba4200aae83353a70e77d31762300244cc1128f956e845b194116eee1cb');
    assert.equal(sha256(baselineDataBytes), 'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3');
    assert.equal(sha256(handoffBytes), '54cb148c3c9e5cfaf4a1a4e55509cd6e93f6f8ce45fedc17e9460ddd81698d77');
    assert.equal(sha256(targetPlanBytes), '1f7ab9d2c84fafd62231b9fbd6fc58933a0179cba97dc51fd728ad1cafc6458f');
    assert.equal(currentDataSha256, '2cddb11a82ecc3b9d77cb3fa2ae49eef5623a5470ac85a540d1baf483e096a95');
    assert.equal(Object.keys(production.DMG175_OWNER_CATALOGS).length, 11);
  });

  await t.test('positive output is 8 supplemental crops, 34 regions, and 120 pending targets', () => {
    assert.equal(positiveResult.availability.distinctSupplementalCropImages, 8);
    assert.equal(positiveResult.availability.distinctP175RegionIds, 34);
    assert.equal(positiveResult.availability.previouslyReviewedContextRegions, 2);
    assert.equal(positiveResult.availability.newlyCatalogedSupplementalImages, 6);
    assert.equal(positiveResult.availability.catalogImagesAcrossP175P176AndPHB103, 15);
    assert.equal(positiveResult.content.currentRuleOwners, 11);
    assert.equal(positiveResult.content.tableOwners, 6);
    assert.equal(positiveResult.content.structuredTableRows, 87);
    assert.equal(positiveResult.content.rowsPrinted175Supplement, 22);
    assert.equal(positiveResult.content.rowsPrinted176Pdf, 65);
    assert.equal(positiveResult.content.proseTargets, 33);
    assert.equal(positiveResult.content.plannedFieldTargets, 120);
    assert.equal(positiveResult.content.pendingFieldTargets, 120);
    assert.equal(positiveResult.content.sourceValuesAssessed, false);
    assert.equal(positiveResult.content.mechanicsGradesPromoted, false);
    assert.equal(positiveResult.content.contextReviewExpanded, false);
  });

  await t.test('historical acceptance controls are preserved and the V5 guards reject them', async () => {
    const v1 = await importHistoricalFixture(v1FixturePath, 'f0059c68e300bf0214779c9f622fb14f263b5c173474be38ae71eaa1b694d49d', null);
    const v2 = await importHistoricalFixture(v2FixturePath, 'cfdf387c257975042080cd1f9c657c497c38e1940846a956705e9c21eeac77a4', booksUrl);
    const forgedId = (relative, catalog) => {
      if (relative.endsWith('rules-appendix-c-party-size.json')) catalog.regions[0].id = 'dmg175-fabricated-but-valid-prefix';
    };
    assert.equal(derive(v1, forgedId).availability.distinctP175RegionIds, 34, 'the exact V1 forged-ID acceptance remains reproducible');
    assert.throws(() => derive(production, forgedId), /catalog content changed|unregistered supplemental/);

    const levelsPath = 'dist/scans/verified/rules-appendix-c-character-levels.json';
    const sizePath = 'dist/scans/verified/rules-appendix-c-party-size.json';
    const levelsRegion = catalogTemplates.get(levelsPath).regions[0];
    const sizeRegion = catalogTemplates.get(sizePath).regions[0];
    const swapOwners = (relative, catalog) => {
      if (relative === levelsPath) catalog.regions[0] = structuredClone(sizeRegion);
      if (relative === sizePath) catalog.regions[0] = structuredClone(levelsRegion);
    };
    assert.equal(derive(v2, swapOwners).availability.distinctP175RegionIds, 34, 'the exact V2 registered-region owner-swap acceptance remains reproducible');
    assert.throws(() => derive(production, swapOwners), /catalog content changed/);
  });

  await t.test('six altered native tuples fail closed', () => {
    const negatives = [
      ['unregistered source image hash', region => { region.sha256 = '0'.repeat(64); }],
      ['stale pre-repair image tuple', region => Object.assign(region, {
        image: 'dmg-175-dmg175-character-level-left-07fd3a11c0cc61f1.png',
        sha256: '07fd3a11c0cc61f10ecf3bc812e8c91b34731c81855a72aec0ce3786f1242c3d',
        height: 171,
        sourceCropBoundsPx: [0, 1625, 650, 1796],
      })],
      ['wrong native crop bounds', region => { region.sourceCropBoundsPx[0] = 1; }],
      ['wrong output dimensions', region => { region.width = 649; }],
      ['fabricated PDF page', region => { region.pdfPage = 176; }],
      ['wrong source coordinate space', region => { region.sourceCoordinateSpace = 'pdf-normalized'; }],
    ];
    for (const [label, mutate] of negatives) {
      assert.throws(() => derive(production, regionMutation(mutate)), undefined, label);
    }
    assert.equal(negatives.length, 6);
  });

  await t.test('canonical object-key reordering remains accepted', () => {
    const reordered = derive(production, (relative, catalog) => {
      if (relative.endsWith('rules-appendix-c-character-levels.json')) {
        const reorderedCopy = reorderObjectKeys(catalog);
        for (const key of Object.keys(catalog)) delete catalog[key];
        Object.assign(catalog, reorderedCopy);
      }
    });
    assert.deepEqual(reordered, positiveResult);
  });

  await t.test('three published-evidence corruptions fail and monetary screens are preserved', () => {
    const forgedRegion = structuredClone(evidence);
    forgedRegion.availability.p175RegionIds[0] = 'dmg175-fabricated-but-valid-prefix';
    assert.throws(() => coverageEntry(forgedRegion), /region identity set/);

    const forgedImage = structuredClone(evidence);
    forgedImage.availability.supplementalCropImageSha256s[0] = '0'.repeat(64);
    assert.throws(() => coverageEntry(forgedImage), /image hash set/);

    const forgedCatalog = structuredClone(evidence);
    forgedCatalog.evidence.sourceCatalogSha256['scans/verified/rules-appendix-c-party-size.json'] = '0'.repeat(64);
    assert.throws(() => coverageEntry(forgedCatalog), /source-catalog file hashes changed/);

    assert.deepEqual(projectedHandoff.sourcePriceDiscoveryCensuses.supplementalPageScreens,
      handoff.sourcePriceDiscoveryCensuses.supplementalPageScreens);
    assert.equal(evidence.handoffPreservation.monetarySourceScreenCropCount, 2);
    assert.equal(evidence.handoffPreservation.monetarySourceScreenUnchanged, true);
    assert.equal(projectedHandoff.summary.currentSupplementalSourcePage.reviewedCropCount, 2);
    assert.match(projectedHandoff.summary.currentSupplementalSourcePage.reviewedCropCountScope, /legacy/);
    assert.equal(coverageEntry().status, 'physical-gap-in-supplied-pdf; limited-supplemental-excerpts-available');
  });
});
