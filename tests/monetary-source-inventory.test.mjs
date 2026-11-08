import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {before, test} from 'node:test';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CURRENT_DENOMINATORS,
  assessUaPrimaryFocusContainment,
  buildMonetarySourceIndex,
  runMonetarySourceInventoryCli,
} from '../tools/monetary-source-inventory.mjs';
import {validatePriceSourceInventory} from '../tools/price-source-inventory.mjs';
import {validateSourceGeometry} from '../tools/monetary-source-geometry.mjs';
import {validateCropLocalSourceGeometry} from '../tools/monetary-source-inventory.mjs';
import {collectMonetaryRowIdentityRecords} from '../tools/monetary-row-identity-audit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_CANONICAL_SHA256 = 'f2a02d1e990cf9bd30135f7dc2fcd2f10f9e1f2e172ee594e396677c32fb3852';
const UA_SUPPLEMENT_SHA256 = '8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a';
const UA_DESCRIPTION_SUPPLEMENT_SHA256 = '88c5456626a47f5a47a6cce514cb8ea2ce5338e4a9a9b13e93eedfcd265e3c8d';
const PHB_DMG_SUPPLEMENT_SHA256 = 'b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9';
const PRICE_DISCOVERY_SHA256 = 'd94f8e59dd34955292ab2d9d85ebc29c9ff634d4f70b38a20a91bdd4084f588e';
const PHB_DMG_V3_CANDIDATE_SHA256 = 'def5f2857a92336391bfce5bf5664958a902db9d17b1ac9392252f173aa2ca83';
const PHB_DMG_V3_FIXTURE_GZIP_SHA256 = '641db71e88edf5e52597ee2fa91c9e00de57b69b25c304e0314ef740d629144a';
const PHB_DMG_PASSAGE_SHA256 = '2f73f635aa04c2d55c3fe4e71cc5db6a3c55779e6db9f9e5adfe71c08ae5b707';
const HISTORICAL_V4_INPUTS_FIXTURE_GZIP_SHA256 = '16bb1770b8befbd4c9978443774eda0a64bd92a73f20498b7bfdff3e385ac51e';
const HISTORICAL_V4_INPUTS_FIXTURE_SHA256 = 'f7de007ca471f5f0c1b9e09e1de5ca352b3bd62807417ae42e6a6303ae99b026';
const HISTORICAL_V4_OTHER_INPUT_SHA256 = {
  phbDmgCensus: 'a6e653a0ee4854e2d28b2cbc8049c60f038d4e8eabbcc822b10b730ef496ae79',
  uaCensus: 'f1f797d9e8664589af5308737d9bc9d5e5dd536339349609fbeec5dc2a58c4b9',
  monsterCensus: '5b18323c4817c7c99a38cd058015f862bbc588237b655ec6c7e8375f60f8248f',
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function valueAtJsonPointer(value, pointer) {
  assert.ok(pointer.startsWith('/'));
  return pointer.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~')).reduce((current, part) => current?.[part], value);
}

function readArtifact(path) {
  const bytes = readFileSync(resolve(root, path));
  return {path, sha256: sha256(bytes), data: JSON.parse(bytes.toString('utf8'))};
}

function v3CandidateArtifact() {
  const gzipBytes = readFileSync(resolve(root, 'tests/fixtures/monetary-phbdmg-v3-index-candidate.json.gz'));
  assert.equal(sha256(gzipBytes), PHB_DMG_V3_FIXTURE_GZIP_SHA256);
  const bytes = gunzipSync(gzipBytes);
  assert.equal(sha256(bytes), PHB_DMG_V3_CANDIDATE_SHA256);
  return {
    path: 'tests/fixtures/monetary-phbdmg-v3-index-candidate.json.gz#decompressed-candidate-payload',
    sha256: sha256(bytes),
    data: JSON.parse(bytes.toString('utf8')),
  };
}

function dpiGuardCandidateArtifact() {
  const candidate = v3CandidateArtifact();
  const data = structuredClone(candidate.data);
  const row = data.review.sourceRowsOrClaims.find(item => item.sourceRowOrClaimId === 'dmg-poison-ingestive-c');
  const primaryCropId = row.contextCropId;
  const primaryCrop = data.review.evidenceCrops.find(crop => crop.cropId === primaryCropId);
  assert.ok(row && primaryCrop, 'the pinned V3 fixture supplies the p.20 primary frame');
  row.sourceContextParts = [
    {
      partId: 'dmg-poison-ingestive-c-p20-test',
      order: 1,
      role: 'primary-table-context',
      factPointers: ['/typedValue'],
      contextCropId: primaryCropId,
      source: structuredClone(row.source),
      focusBoundsCropPixelsLTRB: structuredClone(row.focus.focusBoundsCropPixelsLTRB),
    },
    {
      partId: 'poison-marker-note-3-p21',
      order: 2,
      role: 'supporting-note-definition',
      factPointers: ['/conditions/footnoteMarker'],
      contextCropId: 'crop-dmg-poison-dose-and-manufacture-04',
      source: {...structuredClone(row.source), printedPage: 21, pdfPage: 22},
      focusBoundsCropPixelsLTRB: [49, 54, 100, 80],
    },
  ];
  row.primaryPartIdByFact = {
    '/typedValue': 'dmg-poison-ingestive-c-p20-test',
    '/conditions/footnoteMarker': 'poison-marker-note-3-p21',
  };
  data.review.evidenceCrops.push({
    groupId: row.groupId,
    cropId: 'crop-dmg-poison-dose-and-manufacture-04',
    label: 'Poison marker note continuation (context only)',
    sourceRender: 'dmg-full-pdf-22-300.png',
    sourceRenderSha256: 'a176aeff2eec447e92ce1a0ea93e34b9b134276e7af3b307528b88869812839b',
    sourceRenderDimensionsPx: [2440, 3194],
    sourceRenderDpi: 300,
    sourceCropFrame: 'PyMuPDF CropBox-relative PageRect rendered at 300dpi; integer crop/focus bounds remain in this source-render pixel frame; MediaBox/CropBox geometry and offset are recorded separately.',
    sourcePdfSha256: '7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',
    printedPage: 21,
    pdfPage: 22,
    cropBoundsPixelsLTRB: [91, 908, 1230, 1105],
    cropDimensionsPx: [1139, 197],
    cropSha256: '15a6ade0d1ea135f5c77b11be6802a5c3ea754513ac1958476d6a4233e116805',
  });
  const bytes = Buffer.from(JSON.stringify(data));
  return {
    path: `${candidate.path}#dpi-sourceframe-regression-copy`,
    sha256: sha256(bytes),
    data,
  };
}

function historicalV4InputsFixture() {
  const compressed = readFileSync(resolve(root, 'tests/fixtures/monetary-source-inventory-historical-inputs-v4.json.gz'));
  assert.equal(sha256(compressed), HISTORICAL_V4_INPUTS_FIXTURE_GZIP_SHA256, 'the compact V4 before-input fixture is immutable');
  const bytes = gunzipSync(compressed);
  assert.equal(sha256(bytes), HISTORICAL_V4_INPUTS_FIXTURE_SHA256, 'the decompressed V4 before-input fixture is immutable');
  const fixture = JSON.parse(bytes.toString('utf8'));
  assert.equal(fixture.artifactType, 'historical-monetary-source-inventory-inputs-v4');
  const expected = new Map([
    ['ua', ['research/source-audit-batch5-ua-additional-prices.json', UA_SUPPLEMENT_SHA256]],
    ['uaDescriptionSupplement', ['research/source-audit-batch5-price-description-records.json', UA_DESCRIPTION_SUPPLEMENT_SHA256]],
    ['phbDmg', ['research/source-audit-batch5-phb-dmg-additional-prices.json', PHB_DMG_SUPPLEMENT_SHA256]],
    ['priceDiscovery', ['research/source-audit-batch5-price-discovery-reconciliation.json', PRICE_DISCOVERY_SHA256]],
    ['phbDmgPricePassageSupplement', ['research/source-audit-batch5-phb-dmg-price-passage-records.json', PHB_DMG_PASSAGE_SHA256]],
  ]);
  assert.equal(fixture.inputs.length, expected.size, 'the archive contains exactly the five changed raw inputs');
  const artifacts = new Map();
  for (const entry of fixture.inputs) {
    const pin = expected.get(entry.key);
    assert.ok(pin, `unexpected historical input ${entry.key}`);
    assert.equal(entry.path, pin[0], `${entry.key} preserves its original repository path`);
    assert.equal(entry.sha256, pin[1], `${entry.key} preserves the historical V4 pin`);
    const rawBytes = Buffer.from(entry.utf8, 'utf8');
    assert.equal(sha256(rawBytes), entry.sha256, `${entry.key} raw UTF-8 matches its individual pin`);
    assert.equal(artifacts.has(entry.key), false, `${entry.key} appears only once`);
    artifacts.set(entry.key, {path: entry.path, sha256: entry.sha256, data: JSON.parse(entry.utf8)});
  }
  assert.equal(artifacts.size, expected.size);
  return artifacts;
}

function pinnedCurrentArtifact(path, expectedSha256) {
  const artifact = readArtifact(path);
  assert.equal(artifact.sha256, expectedSha256, `${path} remains an unchanged V4 input`);
  return artifact;
}

function canonicalBeforeJoArtifact() {
  const compressed = readFileSync(resolve(root, 'tests/fixtures/price-source-inventory-before-jo.json.gz'));
  assert.equal(sha256(compressed), 'bce088a9d7d88de32b39d0ca5e5af6aa123c75aa13d4761ddc51a59ef87b99c6');
  const bytes = gunzipSync(compressed);
  assert.equal(sha256(bytes), '71b9ce72027624dd6af658616129b6fc475ea4e43c689758ceb1e165436204ea');
  return {path:'research/price-source-inventory.json',sha256:sha256(bytes),data:JSON.parse(bytes)};
}

function historicalMonsterCensusArtifact() {
  const compressed = readFileSync(resolve(root, 'tests/fixtures/monetary-monster-census-before-mammoth-derived.json.gz'));
  assert.equal(sha256(compressed), 'a805c0dcb149b42e0f720c1218605fa1bb257a81ac3e57d9ce1de373408b7173');
  const bytes = gunzipSync(compressed);
  assert.equal(sha256(bytes), HISTORICAL_V4_OTHER_INPUT_SHA256.monsterCensus);
  return {path:'research/price-source-inventory-monster-books.json',sha256:sha256(bytes),data:JSON.parse(bytes)};
}

function historicalBeforeInputs() {
  const baselineBytes = gunzipSync(readFileSync(resolve(root, 'tests/fixtures/price-source-inventory-baseline-679.json.gz')));
  const historical = historicalV4InputsFixture();
  return {
    canonical: {
      path: 'research/price-source-inventory.json@679b15d1c580172e54314829c1c3c86dc78b65f3',
      sha256: sha256(baselineBytes),
      data: JSON.parse(baselineBytes.toString('utf8')),
    },
    equipment: readArtifact('equipment.json'),
    equipmentBindings: readArtifact('research/equipment-source-row-bindings.json'),
    uaSupplement: historical.get('ua'),
    uaDescriptionSupplement: historical.get('uaDescriptionSupplement'),
    phbDmgSupplement: historical.get('phbDmg'),
    priceDiscoverySupplement: historical.get('priceDiscovery'),
    phbDmgPricePassageSupplement: historical.get('phbDmgPricePassageSupplement'),
    phbDmgCensus: pinnedCurrentArtifact('research/price-source-inventory-phb-dmg-other.json', HISTORICAL_V4_OTHER_INPUT_SHA256.phbDmgCensus),
    uaCensus: pinnedCurrentArtifact('research/price-source-inventory-ua-other.json', HISTORICAL_V4_OTHER_INPUT_SHA256.uaCensus),
    monsterCensus: historicalMonsterCensusArtifact(),
  };
}

let input;
let index;
before(() => {
  // These tests exercise the immutable V4 historical before-model. The current CLI smoke test below reads live defaults separately.
  input = historicalBeforeInputs();
  assert.equal(input.canonical.sha256, BASELINE_CANONICAL_SHA256);
  assert.equal(input.uaSupplement.sha256, UA_SUPPLEMENT_SHA256);
  assert.equal(input.uaDescriptionSupplement.sha256, UA_DESCRIPTION_SUPPLEMENT_SHA256);
  assert.equal(input.phbDmgSupplement.sha256, PHB_DMG_SUPPLEMENT_SHA256);
  assert.equal(input.priceDiscoverySupplement.sha256, PRICE_DISCOVERY_SHA256);
  assert.equal(input.phbDmgPricePassageSupplement.sha256, PHB_DMG_PASSAGE_SHA256);
  index = buildMonetarySourceIndex(input);
});

test('historical V4 before inputs produce complete, occurrence-preserving denominators and stable IDs', () => {
  assert.deepEqual(index.denominators, {
    canonicalSourceRows: 710,
    currentEquipmentPriceClaims: 187,
    uaSupplementRows: 583,
    uaDescriptionRecords: 2,
    phbDmgTypedRowsOrClaims: 179,
    phb123RepeatedEquipmentRows: 165,
    priceDiscoveryCensusReceipts: 180,
    phbDmgPricePassageRecords: 34,
    canonicalEquipmentSourceRowBindings: 187,
    sourceOccurrences: 1871,
    sourceValueClaims: 2318,
    phb123AuxiliaryStartingMoneyAndCurrencyRows: 9,
    phb123StartingMoneyRows: 5,
    phb123CurrencyEquivalenceRows: 4,
    boundedPriceDiscoveryCensusReceipts: 180,
    phbDmgDuplicateReferenceRows: 43,
  });

  const occurrenceIds = index.sourceOccurrences.map(row => row.sourceOccurrenceId);
  const claimIds = index.claims.map(claim => claim.claimId);
  assert.equal(new Set(occurrenceIds).size, occurrenceIds.length);
  assert.equal(new Set(claimIds).size, claimIds.length);
  const occurrences = new Map(index.sourceOccurrences.map(row => [row.sourceOccurrenceId, row]));
  const claims = new Map(index.claims.map(claim => [claim.claimId, claim]));
  const inputArtifacts = new Map(Object.values(input).filter(artifact => artifact?.path && artifact?.data).map(artifact => [artifact.path, artifact.data]));
  for (const occurrence of index.sourceOccurrences) {
    assert.ok(occurrence.valueClaimIds.length > 0, occurrence.sourceOccurrenceId);
    for (const id of occurrence.valueClaimIds) assert.equal(claims.get(id)?.sourceOccurrenceId, occurrence.sourceOccurrenceId, id);
    assert.match(occurrence.source.sourcePdfSha256, /^[a-f0-9]{64}$/i, occurrence.sourceOccurrenceId);
    assert.ok(occurrence.source.printedPage == null || Number.isInteger(occurrence.source.printedPage), occurrence.sourceOccurrenceId);
    assert.ok(Number.isInteger(occurrence.source.pdfPage), occurrence.sourceOccurrenceId);
    assert.ok(occurrence.provenance.inputArtifact.jsonPointer.startsWith('/'), occurrence.sourceOccurrenceId);
    assert.match(occurrence.provenance.inputArtifact.sha256, /^[a-f0-9]{64}$/i, occurrence.sourceOccurrenceId);
  }
  for (const claim of index.claims) {
    assert.ok(occurrences.has(claim.sourceOccurrenceId), claim.claimId);
    assert.ok(claim.provenance.sourceValueJsonPointer.startsWith('/'), claim.claimId);
    assert.match(claim.provenance.inputArtifact.sha256, /^[a-f0-9]{64}$/i, claim.claimId);
    assert.ok(claim.siteMapping?.status, claim.claimId);
    const sourceArtifact = inputArtifacts.get(claim.provenance.inputArtifact.path);
    assert.ok(sourceArtifact, claim.claimId);
    assert.notEqual(valueAtJsonPointer(sourceArtifact, claim.provenance.sourceValueJsonPointer), undefined, claim.claimId);
  }
  assert.equal(index.currentInputValidation.status, 'not-run-by-pure-builder');
  assert.equal(index.currentInputValidation.validator, null);
  assert.equal(index.inputArtifacts[0].sha256, BASELINE_CANONICAL_SHA256);
  assert.equal(index.counts.monetaryAmountClaims, 2169);
  assert.equal(index.counts.monetaryClaimRecords, 2246);
  assert.equal(index.counts.unassessableClaimRecords, 11);
  assert.equal(index.sourceGroupDenominators.canonical.reduce((sum, group) => sum + group.sourceRowCount, 0), 710);
  assert.equal(index.sourceGroupDenominators.uaSupplement.length, 15);
  assert.equal(index.sourceGroupDenominators.uaSupplement.reduce((sum, group) => sum + group.sourceRowCount, 0), 583);
  assert.equal(index.sourceGroupDenominators.phbDmgSupplement.length, 18);
  assert.equal(index.sourceGroupDenominators.phbDmgSupplement.reduce((sum, group) => sum + group.sourceRowCount, 0), 179);
  assert.equal(index.sourceGroupDenominators.phb123RepeatedEquipmentRows.sourceRowCount, 165);
  assert.deepEqual(index.sourceGroupDenominators.uaDescriptionSupplement, {sourceDescriptionRecords: 2, pointerResolutionLinks: 8});
});

test('equipment fields and repeated PHB 123 offers retain explicit bindings and variants', () => {
  const equipmentClaims = index.claims.filter(claim => claim.claimId.startsWith('site:equipment:'));
  assert.equal(equipmentClaims.length, 187);
  for (const claim of equipmentClaims) {
    assert.equal(claim.siteMapping.collection, 'equipment');
    assert.equal(claim.siteMapping.itemId, claim.sourceIdentity.equipmentItemId);
    assert.equal(claim.siteMapping.fieldPointer, '/price');
    assert.equal(claim.sourceIdentity.fieldPointer, '/price');
    assert.ok(claim.sourceOccurrenceId, claim.claimId);
  }

  const repeated = index.sourceOccurrences.filter(row => row.occurrenceKind === 'phb123-repeated-equipment-purchase-row');
  assert.equal(repeated.length, 165);
  for (const row of repeated) {
    assert.ok(row.sourceIdentity.linkedSourceOccurrenceId, row.sourceOccurrenceId);
    assert.ok(index.sourceOccurrences.some(candidate => candidate.sourceOccurrenceId === row.sourceIdentity.linkedSourceOccurrenceId), row.sourceOccurrenceId);
    assert.equal(index.claims.find(claim => claim.claimId === row.valueClaimIds[0])?.monetaryAmount, true, row.sourceOccurrenceId);
  }

  const qualifiedWater = repeated.filter(row => row.qualifiers.includes('unholy water'));
  assert.equal(qualifiedWater.length, 1);
  assert.ok(qualifiedWater[0].qualifiers.includes('holy water'));
  assert.equal(qualifiedWater[0].sourceIdentity.linkedSourceOccurrenceId, 'canonical:phb36-equipment-supplies-066');
  const waterClaim = index.claims.find(claim => claim.claimId === qualifiedWater[0].valueClaimIds[0]);
  assert.equal(waterClaim.valueSemantics.amount, qualifiedWater[0].sourceRecord.printedAmount.amount);
  assert.equal(waterClaim.valueSemantics.currency, qualifiedWater[0].sourceRecord.printedAmount.currency);
  assert.equal(qualifiedWater[0].evidence.geometryAssessment.status, 'contained');
});

test('amount, rate, formula, approximate, unknown, and XP semantics stay distinct', () => {
  assert.equal(index.counts.purposeCounts.other ?? 0, 0);
  assert.equal(index.counts.xpExcludedFromMonetaryAmountCount, true);
  assert.equal(index.counts.uaXpAdjacentReferenceCellCount, 566);
  assert.ok(index.counts.valueKindCounts.approximate >= 1);
  assert.ok(index.counts.valueKindCounts.rate >= 18);
  assert.ok(index.counts.valueKindCounts.formula >= 10);

  const byId = new Map(index.claims.map(claim => [claim.claimId, claim]));
  assert.equal(byId.get('phb-dmg:dmg-town-fee-duty-normal#/typedValue/ratePct')?.valueSemantics.kind, 'rate');
  assert.equal(byId.get('phb-dmg:dmg-town-fee-duty-normal#/typedValue/ratePct')?.valueSemantics.amount, 1);
  assert.equal(byId.get('phb-dmg:dmg-henchman-initial-payment#/typedValue/minimumPerApplicantLevel')?.valueSemantics.per, 'applicant level');
  assert.equal(byId.get('phb-dmg:dmg-placement-goods-2000-nobles#/typedValue/amount')?.valueSemantics.kind, 'lower-bound');
  assert.equal(byId.get('phb-dmg:dmg-placement-food-100-nobles#/typedValue/amount')?.valueSemantics.kind, 'approximate');
  assert.equal(byId.get('phb-dmg:dmg-potion-upkeep#/typedValue/percentOfPlaceCostPerMonth')?.valueSemantics.per, 'place cost per month');
  assert.equal(byId.get('phb-dmg:dmg-combined-hoard-01-20#/typedValue/monetaryTreasureFormula')?.valueSemantics.kind, 'formula');
  assert.equal(byId.get('phb-dmg:dmg-placement-sword-3x#/typedValue/multiplier')?.valueSemantics.kind, 'formula');
  assert.equal(byId.get('phb-dmg:dmg-sage-unknown-half#/typedValue/chargeFraction')?.valueSemantics.kind, 'formula');
  assert.equal(byId.get('phb-dmg:dmg-sage-rest-no-fee#/typedValue')?.valueSemantics.kind, 'unknown');
  assert.equal(byId.get('phb-dmg:dmg-town-fee-foreign-silver-threshold-fine#/typedValue/threshold')?.valueSemantics.currency, 'silver nobbles');
  assert.equal(byId.get('phb-dmg:dmg-town-fee-foreign-silver-threshold-fine#/typedValue/finePctOfTotalForeignCoinValue')?.valueSemantics.amount, 50);
  assert.equal(byId.get('phb-dmg:dmg-potion-alchemist-discount#/typedValue/moneyReductionPct')?.valueSemantics.amount, 50);

  const assassinationRow = index.sourceOccurrences.find(row => row.sourceOccurrenceId === 'phb-dmg:phb-assassination-fees-row-01');
  assert.equal(assassinationRow.valueClaimIds.length, 8, 'each printed victim-level fee cell has its own claim');
  const assassinationAmounts = assassinationRow.valueClaimIds.map(id => byId.get(id).valueSemantics.amount ?? null);
  assert.deepEqual(assassinationAmounts, [50, 100, 150, 200, 250, null, null, null]);

  const coinTreasureRanges = index.claims.filter(claim => claim.sourceOccurrenceId === 'phb-dmg:dmg-monetary-treasure-d100-1-2');
  assert.deepEqual(coinTreasureRanges.map(claim => [claim.valueSemantics.currency, claim.valueSemantics.minimumAmount, claim.valueSemantics.maximumAmount, claim.valueSemantics.formula]), [
    ['cp', 20000, 80000, '2d4'],
    ['sp', 20000, 50000, 'd4+1'],
  ]);
  const gemQuantity = byId.get('phb-dmg:dmg-monetary-treasure-d100-13-15#/typedValue/outcomes/0');
  assert.equal(gemQuantity.valueSemantics.kind, 'treasure-quantity');
  assert.deepEqual([gemQuantity.valueSemantics.minimumCount, gemQuantity.valueSemantics.maximumCount], [10, 100]);
  assert.equal(gemQuantity.monetaryAmount, false);
  const furAdjustments = index.claims.filter(claim => claim.sourceOccurrenceId === 'phb-dmg:dmg-fur-value-d10-adjustment');
  assert.equal(furAdjustments.length, 7);
  assert.deepEqual(furAdjustments.filter(claim => claim.valueSemantics.kind === 'rate').map(claim => claim.valueSemantics.amount), [-10, -20, -30, -40, 10, 20]);
  assert.ok(furAdjustments.some(claim => claim.valueSemantics.kind === 'formula' && claim.valueSemantics.formula === 'as shown'));

  const gemValues = index.claims.filter(claim => claim.claimId.startsWith('phb-dmg:dmg-gem-increase-ladder#'));
  assert.deepEqual(gemValues.map(claim => claim.valueSemantics.amount), [10000, 25000, 50000, 100000, 250000, 500000, 1000000]);
  assert.ok(gemValues.every(claim => claim.claimId.includes('/orderedValues/')));

  const xp = index.claims.flatMap(claim => Object.values(claim.adjacentReferences ?? {}));
  assert.ok(xp.length > 0);
  assert.ok(xp.some(value => value?.currency === 'xp'), 'XP stays in adjacent references');
  assert.ok(index.claims.every(claim => claim.valueSemantics?.currency !== 'xp'), 'XP does not become a monetary claim');
  const treasureQuantities = index.claims.filter(claim => claim.valueSemantics.kind === 'treasure-quantity');
  assert.equal(treasureQuantities.length, 13);
  assert.ok(treasureQuantities.every(claim => claim.monetaryAmount === false && claim.monetaryClaim === false));
  const purseCoins = treasureQuantities.filter(claim => claim.sourceOccurrenceId.startsWith('phb-dmg:dmg-everfull-purse-'));
  assert.equal(purseCoins.length, 9);
});

test('all source rows preserve separate crop/focus evidence and honest geometry states', () => {
  assert.deepEqual(index.geometryValidation.ua.counts, {contained: 583});
  assert.deepEqual(index.geometryValidation.phbDmgCropLocal.counts, {contained: 179, outsideCrop: 0, notAssessable: 0, invalid: 0});
  assert.deepEqual(index.geometryValidation.phb123CropLocal.counts, {contained: 1, outsideCrop: 0, notAssessable: 164, invalid: 0});
  assert.equal(index.geometryValidation.canonicalDifferentCoordinateSpaces.count, 710);

  const uaArtifact = input.uaSupplement.data;
  for (const row of uaArtifact.rowRecords) assert.equal(validateSourceGeometry(row).status, 'contained', row.recordId);
  const uaOccurrences = index.sourceOccurrences.filter(row => row.occurrenceKind === 'ua-supplement-source-row');
  assert.equal(uaOccurrences.length, 583);
  assert.ok(uaOccurrences.every(row => row.evidence.tableCropBounds?.pdfPagePoints && row.evidence.rowHighlightBounds?.pdfPagePoints));
  assert.ok(uaOccurrences.every(row => row.evidence.geometryAssessment.status === 'contained'));
  assert.ok(uaOccurrences.every(row => row.evidence.excerptPublication.status.startsWith('source-only')));

  const phbDmgOccurrences = index.sourceOccurrences.filter(row => row.occurrenceKind === 'phb-dmg-typed-source-row-or-passage');
  assert.equal(phbDmgOccurrences.length, 179);
  assert.ok(phbDmgOccurrences.every(row => row.evidence.tableCropBounds?.bounds && row.evidence.rowHighlightBounds?.bounds));
  assert.ok(phbDmgOccurrences.every(row => row.evidence.geometryAssessment.status === 'contained'));
  assert.ok(phbDmgOccurrences.every(row => row.reviewStatus.independentOverlayReview === 'pending-independent-review'));

  const canonicalOccurrences = index.sourceOccurrences.filter(row => row.occurrenceKind === 'canonical-source-row');
  assert.equal(canonicalOccurrences.length, 710);
  assert.ok(canonicalOccurrences.every(row => row.evidence.geometryAssessment.status === 'not-assessable'));
  assert.ok(canonicalOccurrences.every(row => /coordinate space|rectangle pair|dimensions|transform/i.test(row.evidence.geometryAssessment.reason)));
});

test('UA active contexts are consumed in explicit target order while row focus remains separate', () => {
  const uaData = structuredClone(input.uaSupplement.data);
  const group = uaData.groupReviews.find(candidate => candidate.groupId === 'ua-other-001');
  const groupRows = uaData.rowRecords.filter(row => row.recordId.startsWith('ua-other-001-'));
  const firstRow = groupRows[0];
  const secondRow = groupRows[1];
  const pdfSha = uaData.source.sha256;
  const target = ({targetId, targetOrder, role, rowRecordIds}) => ({
    targetId,
    targetOrder,
    role,
    segmentId: 'armor-costs',
    ...(rowRecordIds ? {rowRecordIds} : {}),
    source: {book: 'UA', sourcePdfSha256: pdfSha, printedPage: 75, pdfPage: 76},
    sourceRender: {
      sourceRenderId: 'ua-pdf-76-native-render',
      sourceRenderSha256: 'a'.repeat(64),
      sourceRenderDimensionsPx: [1488, 1930],
      renderDpi: 180,
      coordinateSpace: 'original rendered PDF page pixels; top-left origin; LTRB half-open',
    },
    crop: {
      cropBoundsPdfPagePointsTopLeftLTRB: [300, 45, 590, 305],
      cropBoundsPixelsLTRB: [750, 113, 1475, 763],
      cropDimensionsPx: [725, 650],
      cropSha256: targetOrder === 1 ? 'b'.repeat(64) : 'c'.repeat(64),
      renderDpi: 180,
      coordinateSpace: 'source-render pixels; top-left origin; LTRB half-open',
    },
    pixelReview: {
      status: 'independently-reviewed-context-complete',
      reviewer: 'synthetic adapter fixture',
      scope: 'complete armor table context',
      reviewArtifactPath: 'tests/fixtures/ua-active-context-example.json',
      reviewArtifactSha256: 'd'.repeat(64),
      disposition: 'accepted-for-adapter-fixture',
      findings: [],
    },
  });
  group.activeContextTargets = [
    target({targetId: 'ua-other-001:armor-costs:primary', targetOrder: 1, role: 'primary-table-context'}),
    target({targetId: 'ua-other-001:armor-costs:row-note', targetOrder: 2, role: 'row-specific-note-context', rowRecordIds: [firstRow.recordId]}),
  ];
  for (const row of groupRows) {
    row.evidence.activeContextTargetLinks = [{
      targetId: 'ua-other-001:armor-costs:primary',
      targetOrder: 1,
      role: 'primary-table-context',
      segmentId: 'armor-costs',
    }];
  }
  firstRow.evidence.activeContextTargetLinks.push({
    targetId: 'ua-other-001:armor-costs:row-note',
    targetOrder: 2,
    role: 'row-specific-note-context',
    segmentId: 'armor-costs',
  });

  const uaBytes = Buffer.from(JSON.stringify(uaData));
  const uaSha = sha256(uaBytes);
  const uaSupplement = {path: '/tmp/ua-v2-active-context-fixture.json', sha256: uaSha, data: uaData};
  const descriptionData = structuredClone(input.uaDescriptionSupplement.data);
  descriptionData.inputSupplement.sha256 = uaSha;
  const fixtureIndex = buildMonetarySourceIndex({
    ...input,
    uaSupplement,
    uaDescriptionSupplement: {...input.uaDescriptionSupplement, data: descriptionData},
  });
  const firstOccurrence = fixtureIndex.sourceOccurrences.find(row => row.sourceOccurrenceId === `ua:${firstRow.recordId}`);
  const secondOccurrence = fixtureIndex.sourceOccurrences.find(row => row.sourceOccurrenceId === `ua:${secondRow.recordId}`);
  assert.deepEqual(firstOccurrence.evidence.activeContextTargetOrder, [
    {targetId: 'ua-other-001:armor-costs:primary', targetOrder: 1, role: 'primary-table-context', segmentId: 'armor-costs'},
    {targetId: 'ua-other-001:armor-costs:row-note', targetOrder: 2, role: 'row-specific-note-context', segmentId: 'armor-costs'},
  ]);
  assert.deepEqual(secondOccurrence.evidence.activeContextTargetOrder, [
    {targetId: 'ua-other-001:armor-costs:primary', targetOrder: 1, role: 'primary-table-context', segmentId: 'armor-costs'},
  ]);
  assert.deepEqual(firstOccurrence.evidence.rowHighlightBounds, firstRow.evidence.rowHighlightBounds);
  const firstClaim = fixtureIndex.claims.find(claim => claim.sourceOccurrenceId === firstOccurrence.sourceOccurrenceId);
  assert.deepEqual(firstClaim.evidence.activeContextTargets.map(context => context.targetId), [
    'ua-other-001:armor-costs:primary',
    'ua-other-001:armor-costs:row-note',
  ]);
  assert.equal(fixtureIndex.uaActiveContextCoverage.status, 'all-declared-active-context-targets-consumed-in-source-rows');
  assert.equal(fixtureIndex.uaActiveContextCoverage.declaredTargetCount, 2);
  assert.equal(fixtureIndex.uaActiveContextCoverage.referencedTargetCount, 2);
  assert.equal(fixtureIndex.sourceGroupDenominators.uaSupplement[0].activeContextTargetCount, 2);

  const makeIndexInput = data => {
    const bytes = Buffer.from(JSON.stringify(data));
    const digest = sha256(bytes);
    const uaDescriptionData = structuredClone(input.uaDescriptionSupplement.data);
    uaDescriptionData.inputSupplement.sha256 = digest;
    return {
      ...input,
      uaSupplement: {path: '/tmp/ua-v2-active-context-fixture.json', sha256: digest, data},
      uaDescriptionSupplement: {...input.uaDescriptionSupplement, data: uaDescriptionData},
    };
  };
  const rejectMutation = (mutate, expected) => {
    const brokenData = structuredClone(uaData);
    mutate(brokenData);
    assert.throws(() => buildMonetarySourceIndex(makeIndexInput(brokenData)), expected);
  };

  rejectMutation(data => { data.rowRecords[0].evidence.activeContextTargetLinks[0].role = 'unrelated-context'; }, /must carry the target's exact role/);
  rejectMutation(data => { delete data.rowRecords[0].evidence.activeContextTargetLinks[0].role; }, /must carry the target's exact role/);
  rejectMutation(data => { delete data.groupReviews[0].activeContextTargets[0].role; }, /lacks source\/page\/render\/crop hashes/);
  rejectMutation(data => { data.groupReviews[0].activeContextTargets[0].source.sourcePdfSha256 = 'e'.repeat(64); }, /lacks source\/page\/render\/crop hashes/);
  rejectMutation(data => { data.groupReviews[0].activeContextTargets[0].source.pdfPage = 0; }, /lacks source\/page\/render\/crop hashes/);
  rejectMutation(data => { data.groupReviews[0].activeContextTargets[0].crop.cropBoundsPixelsLTRB[0] = -1; }, /lacks source\/page\/render\/crop hashes/);
  rejectMutation(data => { data.groupReviews[0].activeContextTargets[0].crop.cropBoundsPixelsLTRB[2] = 9999; }, /lacks source\/page\/render\/crop hashes/);
  rejectMutation(data => { data.groupReviews[0].activeContextTargets[0].crop.cropDimensionsPx[0]++; }, /lacks source\/page\/render\/crop hashes/);
  rejectMutation(data => { data.rowRecords[0].evidence.activeContextTargetLinks = []; }, /does not link every applicable active context target/);
  rejectMutation(data => { delete data.rowRecords[0].evidence.activeContextTargetLinks[0].segmentId; }, /changes its declared segment identity/);
  rejectMutation(data => { data.rowRecords[0].evidence.activeContextTargetLinks[0].segmentId = 'wrong-segment'; }, /changes its declared segment identity/);
  rejectMutation(data => { delete data.groupReviews[0].activeContextTargets[0].sourceRender.sourceRenderId; }, /lacks source\/page\/render\/crop hashes/);
  rejectMutation(data => { delete data.groupReviews[0].activeContextTargets[0].targetId; }, /lacks a stable targetId/);
  rejectMutation(data => { data.rowRecords[0].evidence.activeContextTargetLinks.reverse(); }, /preserve linked target order exactly/);

  const crossPageData = structuredClone(uaData);
  crossPageData.groupReviews[0].activeContextTargets[0].source.printedPage = 76;
  crossPageData.groupReviews[0].activeContextTargets[0].source.pdfPage = 77;
  assert.equal(makeIndexInput(crossPageData).uaSupplement.data.groupReviews[0].activeContextTargets[0].source.pdfPage, 77);
  assert.equal(buildMonetarySourceIndex(makeIndexInput(crossPageData)).uaActiveContextCoverage.status, 'all-declared-active-context-targets-consumed-in-source-rows');
});

test('UA primary-focus containment retains the six V2 crop-overflow regressions without treating geometry as pixel approval', () => {
  const fixture = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/ua-primary-focus-crop-containment-v2-before.json'), 'utf8'));
  const sourcePdfSha256 = fixture.sourcePdfSha256;
  const beforeStatuses = [];
  const proposedStatuses = [];
  for (const item of fixture.cases) {
    const target = {
      targetId: item.primaryContextTargetId,
      role: item.recordId.startsWith('ua-other-010-') ? 'primary-source-passage-context' : 'primary-table-context',
      source: {sourcePdfSha256, printedPage: item.printedPage, pdfPage: item.pdfPage},
      crop: {cropBoundsPdfPagePointsTopLeftLTRB: item.cropBoundsPdfPagePointsTopLeftLTRB},
    };
    const row = {
      recordId: item.recordId,
      sourceRowIdentity: {printedPage: item.printedPage, pdfPage: item.pdfPage},
      evidence: {sourcePdfSha256, rowHighlightBounds: {pdfPagePoints: item.beforeFocusBoundsPdfPagePointsTopLeftLTRB}},
    };
    const before = assessUaPrimaryFocusContainment(row, [target]);
    beforeStatuses.push(before.status);
    assert.equal(before.status, item.expectedBeforeStatus, item.recordId);
    assert.deepEqual(before.outsideEdges, ['right'], item.recordId);
    assert.equal(before.structuralOnly, true);
    assert.equal(before.sourcePixelOrSemanticPass, false);

    row.evidence.rowHighlightBounds.pdfPagePoints = item.measuredFocusProposalPdfPagePointsTopLeftLTRB;
    const proposed = assessUaPrimaryFocusContainment(row, [target]);
    proposedStatuses.push(proposed.status);
    assert.equal(proposed.status, item.expectedProposedStatus, item.recordId);
    assert.equal(proposed.structuralOnly, true);
    assert.equal(proposed.sourcePixelOrSemanticPass, false);
  }
  assert.equal(beforeStatuses.filter(status => status === 'outside-primary-crop').length, 6);
  assert.equal(proposedStatuses.filter(status => status === 'contained').length, 6);
});

test('crop-local multi-rectangle focus validates every disjoint rectangle and rejects ambiguous declarations', () => {
  const crop = {cropDimensionsPx: [100, 50]};
  const coordinateSpace = 'crop-local 150-dpi source-render pixels; left,top,right,bottom; half-open';
  const validMulti = {
    contextCropId: 'test-crop',
    coordinateSpace,
    focusRectsCropPixelsLTRB: [[2, 3, 20, 18], [20, 3, 40, 18]],
  };
  assert.deepEqual(validateCropLocalSourceGeometry(crop, validMulti), {
    status: 'contained',
    reason: '2 crop-local focus rectangle(s) are contained in the recorded crop dimensions.',
    rectangleCount: 2,
  });
  assert.equal(validateCropLocalSourceGeometry(crop, {...validMulti, focusRectsCropPixelsLTRB: [[2, 3, 20, 18], [19, 3, 40, 18]]}).status, 'invalid-geometry');
  assert.equal(validateCropLocalSourceGeometry(crop, {...validMulti, focusRectsCropPixelsLTRB: []}).status, 'invalid-geometry');
  assert.equal(validateCropLocalSourceGeometry(crop, {...validMulti, focusRectsCropPixelsLTRB: [[2, 3, 20, 18]]}).status, 'invalid-geometry');
  assert.equal(validateCropLocalSourceGeometry(crop, {...validMulti, focusBoundsCropPixelsLTRB: [2, 3, 20, 18]}).status, 'invalid-geometry');
  assert.equal(validateCropLocalSourceGeometry(crop, {contextCropId: 'test-crop', coordinateSpace}).status, 'invalid-geometry');
  assert.equal(validateCropLocalSourceGeometry(crop, {...validMulti, focusRectsCropPixelsLTRB: [[-2, 3, 20, 18], [25, 3, 40, 18]]}).status, 'outside-crop');
});

test('PHB/DMG adapter serializes all multi-rectangle targets with crop identity and hashes', () => {
  const changedInput = structuredClone(input);
  const supplement = changedInput.phbDmgSupplement;
  const targetRow = supplement.data.review.sourceRowsOrClaims[0];
  const oldFocus = targetRow.focus;
  const [left, top, right, bottom] = oldFocus.focusBoundsCropPixelsLTRB;
  const split = left + Math.floor((right - left) / 2);
  const rectangles = [[left, top, split - 1, bottom], [split + 1, top, right, bottom]];
  targetRow.focus = {
    contextCropId: oldFocus.contextCropId,
    coordinateSpace: 'crop-local 150-dpi source-render pixels; left,top,right,bottom; half-open',
    focusRectsCropPixelsLTRB: rectangles,
    status: oldFocus.status,
  };
  supplement.sha256 = sha256(Buffer.from(JSON.stringify(supplement.data)));

  const built = buildMonetarySourceIndex(changedInput);
  const occurrence = built.sourceOccurrences.find(row => row.sourceOccurrenceId === `phb-dmg:${targetRow.sourceRowOrClaimId}`);
  assert.ok(occurrence);
  assert.equal(occurrence.evidence.geometryAssessment.status, 'contained');
  assert.equal(occurrence.evidence.geometryAssessment.rectangleCount, 2);
  assert.deepEqual(occurrence.evidence.rowHighlightBounds.rectangles, rectangles);
  assert.equal(occurrence.evidence.rowHighlightBounds.bounds, null, 'multi-focus does not silently degrade to its first rectangle');
  assert.equal(occurrence.evidence.rowHighlightBounds.contextCropId, oldFocus.contextCropId);
  assert.equal(occurrence.evidence.rowHighlightBounds.coordinateSpace, targetRow.focus.coordinateSpace);
  assert.equal(occurrence.evidence.rowHighlightBounds.cropSha256, occurrence.evidence.tableCropBounds.cropSha256);
  assert.equal(occurrence.evidence.rowHighlightBounds.sourceRenderSha256, occurrence.evidence.tableCropBounds.sourceRenderSha256);
  assert.equal(occurrence.evidence.rowHighlightBounds.contextCropId, occurrence.evidence.tableCropBounds.cropId);
  assert.equal(occurrence.evidence.rowHighlightBounds.pageRenderSha256, occurrence.evidence.tableCropBounds.pageRenderSha256);
  assert.equal(occurrence.evidence.rowHighlightBounds.pageNumber, occurrence.source.pdfPage);
  assert.deepEqual(occurrence.evidence.rowHighlightBounds.sourceRenderDimensionsPx, occurrence.evidence.tableCropBounds.sourceRenderDimensionsPx);
  assert.deepEqual(occurrence.evidence.rowHighlightBounds.cropBoundsSourcePagePixelsLTRB, occurrence.evidence.tableCropBounds.cropBoundsSourcePagePixelsLTRB);
  assert.equal(occurrence.evidence.rowHighlightBounds.cropImageSha256, occurrence.evidence.tableCropBounds.cropImageSha256);

  const contradictoryInput = structuredClone(changedInput);
  const contradictoryRow = contradictoryInput.phbDmgSupplement.data.review.sourceRowsOrClaims[0];
  contradictoryRow.focus.focusBoundsCropPixelsLTRB = oldFocus.focusBoundsCropPixelsLTRB;
  contradictoryInput.phbDmgSupplement.sha256 = sha256(Buffer.from(JSON.stringify(contradictoryInput.phbDmgSupplement.data)));
  const contradictoryIndex = buildMonetarySourceIndex(contradictoryInput);
  const contradictoryOccurrence = contradictoryIndex.sourceOccurrences.find(row => row.sourceOccurrenceId === `phb-dmg:${targetRow.sourceRowOrClaimId}`);
  assert.equal(contradictoryOccurrence.evidence.geometryAssessment.status, 'invalid-geometry');
  assert.match(contradictoryOccurrence.evidence.geometryAssessment.reason, /both single-rectangle and multi-rectangle/);
  assert.deepEqual(contradictoryOccurrence.evidence.rowHighlightBounds.rectangles, rectangles);
  assert.equal(contradictoryOccurrence.evidence.rowHighlightBounds.bounds, null);

  const mismatchedContextInput = structuredClone(changedInput);
  const mismatchedContextRow = mismatchedContextInput.phbDmgSupplement.data.review.sourceRowsOrClaims[0];
  mismatchedContextRow.focus.contextCropId = 'different-crop';
  mismatchedContextInput.phbDmgSupplement.sha256 = sha256(Buffer.from(JSON.stringify(mismatchedContextInput.phbDmgSupplement.data)));
  const mismatchedContextIndex = buildMonetarySourceIndex(mismatchedContextInput);
  const mismatchedContextOccurrence = mismatchedContextIndex.sourceOccurrences.find(row => row.sourceOccurrenceId === `phb-dmg:${targetRow.sourceRowOrClaimId}`);
  assert.equal(mismatchedContextOccurrence.evidence.geometryAssessment.status, 'invalid-geometry');
  assert.match(mismatchedContextOccurrence.evidence.geometryAssessment.reason, /does not match the selected crop/);
});

test('sealed PHB/DMG adapter failure stays reproducible while V3 preserves derived money and all ordered source contexts', () => {
  const beforeBytes = readFileSync(resolve(root, 'research/source-audit-batch5-phbdmg-index-adapter-before.json'));
  assert.equal(sha256(beforeBytes), '32e0926c5ce3a42521a812ec9b7354508f98bf2e2755fedcf06215a12127eea8');
  const before = JSON.parse(beforeBytes.toString('utf8'));
  assert.equal(before.codeSha256, 'dffe921d84b7f851b7c9d9aaf27d6c507db9ad6076a79cd9e045809f0a1269c2');
  assert.equal(before.candidateSha256, 'e4b6e39315ae1a0615364e0ad6d1f9ced6109067a9601f3d92603b8ff6931b0a');
  const oldDerivedCase = before.cases.find(item => item.id === 'dmg-spell-research-success-expenditure-3');
  assert.equal(oldDerivedCase.claims.length, 6, 'frozen pre-fix run emitted six claims from one derived row');
  assert.deepEqual(oldDerivedCase.claims.map(claim => claim.valueSemantics.amount ?? null), [6000, 2000, 4000, 8000, 6000, 2000]);
  assert.equal(oldDerivedCase.claims.filter(claim => /\/derivation\/sourceBasis\//.test(claim.provenance.sourceValuePointerWithinRow)).length, 3);
  assert.equal(oldDerivedCase.claims.filter(claim => /\/derivation\/inferredPoint\//.test(claim.provenance.sourceValuePointerWithinRow)).length, 1);
  assert.equal(oldDerivedCase.claims.filter(claim => /\/derivation\/method$/.test(claim.provenance.sourceValuePointerWithinRow)).length, 1);

  const oldDeckCase = before.cases.find(item => item.id === 'dmg-deck-gem-card');
  const oldWandCase = before.cases.find(item => item.id === 'dmg-wand-of-wonder-gems-88-90');
  assert.ok(oldDeckCase && oldWandCase);
  assert.ok(!Object.hasOwn(oldDeckCase.occurrences[0].evidence, 'sourceContextParts'));
  assert.ok(!Object.hasOwn(oldWandCase.occurrences[0].evidence, 'sourceContextParts'));

  const candidate = v3CandidateArtifact();
  const candidateIndex = buildMonetarySourceIndex({...input, phbDmgSupplement: candidate});
  assert.deepEqual(candidateIndex.denominators, {
    ...index.denominators,
    sourceValueClaims: 2317,
  });
  assert.equal(candidate.data.review.sourceRowsOrClaims.length, 179);
  const pdOccurrences = candidateIndex.sourceOccurrences.filter(row => row.occurrenceKind === 'phb-dmg-typed-source-row-or-passage');
  assert.equal(pdOccurrences.length, 179);
  assert.ok(pdOccurrences.every(row => row.reviewStatus.independentSemanticReview === 'pending-independent-review'));
  assert.ok(pdOccurrences.every(row => row.reviewStatus.independentOverlayReview === 'pending-independent-review'));

  const rowClaims = (sourceIndex, occurrenceId) => sourceIndex.claims
    .filter(claim => claim.sourceOccurrenceId === occurrenceId)
    .sort((left, right) => left.claimId.localeCompare(right.claimId))
    .map(claim => ({
      claimId: claim.claimId,
      valueSemantics: claim.valueSemantics,
      monetaryAmount: claim.monetaryAmount,
      monetaryClaim: claim.monetaryClaim,
    }));
  const semanticChanges = [...new Set([
    ...index.claims.filter(claim => claim.sourceOccurrenceId.startsWith('phb-dmg:')).map(claim => claim.sourceOccurrenceId),
    ...candidateIndex.claims.filter(claim => claim.sourceOccurrenceId.startsWith('phb-dmg:')).map(claim => claim.sourceOccurrenceId),
  ])].filter(occurrenceId => JSON.stringify(rowClaims(index, occurrenceId)) !== JSON.stringify(rowClaims(candidateIndex, occurrenceId))).sort();
  assert.deepEqual(semanticChanges, [
    'phb-dmg:dmg-commodity-01',
    'phb-dmg:dmg-commodity-02',
    'phb-dmg:dmg-commodity-03',
    'phb-dmg:dmg-commodity-04',
    'phb-dmg:dmg-commodity-05',
    'phb-dmg:dmg-commodity-06',
    'phb-dmg:dmg-commodity-07',
    'phb-dmg:dmg-commodity-08',
    'phb-dmg:dmg-deck-gem-card',
    'phb-dmg:dmg-henchman-initial-payment',
    'phb-dmg:dmg-placement-not-gem-1000',
    'phb-dmg:dmg-potion-alchemist-discount',
    'phb-dmg:dmg-spell-research-success-expenditure-3',
    'phb-dmg:dmg-town-fee-foreign-silver-threshold-fine',
  ], 'the V3 candidate’s monetary-meaning changes stay confined to its reviewed row set');
  assert.equal(179 - semanticChanges.length, 165, 'all other source rows preserve their existing claim identities and monetary meanings');

  const byOccurrence = new Map(candidateIndex.sourceOccurrences.map(row => [row.sourceOccurrenceId, row]));
  const byClaimId = new Map(candidateIndex.claims.map(claim => [claim.claimId, claim]));
  const derivedOccurrence = byOccurrence.get('phb-dmg:dmg-spell-research-success-expenditure-3');
  assert.deepEqual(derivedOccurrence.valueClaimIds, ['phb-dmg:dmg-spell-research-success-expenditure-3#/typedValue/additionalPerLevel']);
  const derivedClaim = byClaimId.get(derivedOccurrence.valueClaimIds[0]);
  assert.equal(derivedClaim.valueSemantics.kind, 'derived-amount');
  assert.equal(derivedClaim.valueSemantics.amount, 6000);
  assert.equal(derivedClaim.valueSemantics.currency, 'gp');
  assert.equal(derivedClaim.valueSemantics.derivationStatus, 'derived-not-printed');
  assert.equal(derivedClaim.valueSemantics.isSourcePrinted, false);
  assert.equal(derivedClaim.monetaryAmount, true);
  assert.equal(derivedClaim.monetaryClaim, true);
  assert.equal(derivedClaim.valueSemantics.derivation.sourceBasis.length, 3);
  assert.equal(derivedClaim.valueSemantics.derivation.inferredPoint.additionalGpPerLevel, 6000);
  assert.match(derivedClaim.valueSemantics.derivation.method, /No intermediate row is claimed to be printed/);
  assert.ok(!candidateIndex.claims.some(claim => claim.sourceOccurrenceId === derivedOccurrence.sourceOccurrenceId && /\/derivation\//.test(claim.provenance.sourceValuePointerWithinRow)));

  const metadataPathPattern = /(?:^|\/)(?:derivation|method|sourceBasis|unit|conditions?|quantity)(?:\/|$)/i;
  const metadataPathClaims = candidateIndex.claims.filter(claim => metadataPathPattern.test(claim.provenance.sourceValuePointerWithinRow));
  assert.deepEqual(metadataPathClaims.map(claim => claim.claimId), [], 'no source adapter may recursively mint explanatory derivation, method, basis, unit, condition, or quantity metadata into money claims');
  const v3MetadataPathCensus = {
    sourceRows: candidate.data.review.sourceRowsOrClaims.length,
    monetaryIndexOccurrences: candidateIndex.denominators.sourceOccurrences,
    valueClaims: candidateIndex.denominators.sourceValueClaims,
    phbDmgOccurrences: pdOccurrences.length,
    phbDmgClaims: candidateIndex.claims.filter(claim => claim.sourceOccurrenceId.startsWith('phb-dmg:')).length,
    derivationOrExplanatoryMetadataClaimPaths: metadataPathClaims.length,
  };
  assert.deepEqual(v3MetadataPathCensus, {
    sourceRows: 179,
    monetaryIndexOccurrences: 1871,
    valueClaims: 2317,
    phbDmgOccurrences: 179,
    phbDmgClaims: 389,
    derivationOrExplanatoryMetadataClaimPaths: 0,
  });

  const silverNobles = byClaimId.get('phb-dmg:dmg-town-fee-foreign-silver-threshold-fine#/typedValue/threshold');
  assert.equal(silverNobles.valueSemantics.kind, 'exact');
  assert.equal(silverNobles.valueSemantics.amount, 100);
  assert.equal(silverNobles.valueSemantics.currency, 'silver nobles', 'the named currency remains literal and is not converted to sp or gp');

  const partRows = pdOccurrences.filter(row => row.evidence.sourceContextPartsStatus !== undefined);
  assert.equal(partRows.length, 8);
  assert.ok(partRows.every(row => row.evidence.sourceContextPartsStatus === 'declared-source-context-parts-linked'));
  const partIds = new Set(partRows.map(row => row.sourceIdentity.sourceRowOrClaimId));
  assert.deepEqual([...partIds].sort(), [
    'dmg-deck-gem-card',
    'dmg-info-discovery-row-01',
    'dmg-info-discovery-row-02',
    'dmg-info-discovery-row-03',
    'dmg-info-discovery-row-04',
    'dmg-sage-specific-unsolved',
    'dmg-sage-unknown-half',
    'dmg-wand-of-wonder-gems-88-90',
  ]);
  for (const occurrence of partRows) {
    const contextParts = occurrence.evidence.sourceContextParts;
    assert.ok(contextParts.length >= 2, occurrence.sourceOccurrenceId);
    assert.deepEqual(contextParts.map(part => part.order), contextParts.map((_, partIndex) => partIndex + 1), occurrence.sourceOccurrenceId);
    assert.ok(contextParts.every(part => part.source.sourcePdfSha256 === occurrence.source.sourcePdfSha256), occurrence.sourceOccurrenceId);
    assert.ok(contextParts.every(part => part.crop?.cropSha256 && part.sourceRender?.sourceRenderSha256 && part.cropPointer), occurrence.sourceOccurrenceId);
    assert.deepEqual(occurrence.evidence.sourceContextPartLinks.map(link => link.cropId), contextParts.map(part => part.cropId));
    const ownClaims = occurrence.valueClaimIds.map(id => byClaimId.get(id));
    assert.ok(ownClaims.every(claim => claim.evidence.sourceContextPartsStatus === 'declared-source-context-parts-linked'), occurrence.sourceOccurrenceId);
  }

  const deck = byOccurrence.get('phb-dmg:dmg-deck-gem-card');
  assert.deepEqual(deck.evidence.sourceContextParts.map(part => [part.partId, part.source.printedPage, part.source.pdfPage]), [
    ['deck-owner-table', 142, 143],
    ['deck-value-paragraph', 143, 144],
  ]);
  assert.deepEqual(deck.evidence.primaryPartIdByFact, candidate.data.review.sourceRowsOrClaims.find(row => row.sourceRowOrClaimId === 'dmg-deck-gem-card').primaryPartIdByFact);
  assert.deepEqual(deck.evidence.sourceContextParts.map(part => part.focusBoundsCropPixelsLTRB), [[22, 482, 462, 503], [2, 2, 537, 90]]);

  const infoRow = byOccurrence.get('phb-dmg:dmg-info-discovery-row-01');
  assert.equal(infoRow.evidence.sourceContextParts[1].factPointers.length, 0);
  assert.equal(infoRow.evidence.sourceContextParts[1].focusBoundsCropPixelsLTRB, null, 'support-only Note crop remains context-only');
  const sageNote = byOccurrence.get('phb-dmg:dmg-sage-unknown-half');
  assert.equal(sageNote.evidence.sourceContextParts[0].factPointers.length, 0);
  assert.equal(sageNote.evidence.sourceContextParts[0].focusBoundsCropPixelsLTRB, null);
  assert.ok(sageNote.evidence.sourceContextParts[1].factPointers.includes('/typedValue'));

  const wand = byOccurrence.get('phb-dmg:dmg-wand-of-wonder-gems-88-90');
  assert.deepEqual(wand.evidence.sourceContextParts.map(part => part.partId), ['wand-table-opening-left', 'wand-table-continuation-right']);
  assert.equal(wand.evidence.sourceContextParts[0].focusBoundsCropPixelsLTRB, null);
  assert.ok(wand.evidence.sourceContextParts[1].focusBoundsCropPixelsLTRB);
  assert.deepEqual(wand.evidence.supplementalContextCrops.map(crop => crop.cropId), ['crop-dmg-gem-and-magic-treasure-valuations-01']);
  assert.equal(wand.evidence.rowHighlightBounds.contextCropId, 'crop-dmg-gem-and-magic-treasure-valuations-01');

  const rejectAsUnassessable = mutate => {
    const data = structuredClone(candidate.data);
    const target = data.review.sourceRowsOrClaims.find(row => row.sourceRowOrClaimId === 'dmg-deck-gem-card');
    mutate(target);
    const bytes = Buffer.from(JSON.stringify(data));
    const changed = buildMonetarySourceIndex({...input, phbDmgSupplement: {
      path: 'tests/fixtures/monetary-phbdmg-v3-index-candidate.json.gz#malformed-test-copy',
      sha256: sha256(bytes),
      data,
    }});
    const occurrence = changed.sourceOccurrences.find(row => row.sourceOccurrenceId === 'phb-dmg:dmg-deck-gem-card');
    assert.equal(occurrence.evidence.sourceContextPartsStatus, 'declared-source-context-parts-unassessable');
    assert.ok(occurrence.evidence.sourceContextPartsReason.length > 0);
    assert.ok(occurrence.valueClaimIds.length > 0, 'malformed context metadata does not silently remove the monetary row');
  };
  rejectAsUnassessable(row => { row.primaryPartIdByFact['/typedValue/choice'] = 'deck-value-paragraph'; });
  rejectAsUnassessable(row => { row.sourceContextParts[0].source.sourceFileSha256 = 'e'.repeat(64); });
  rejectAsUnassessable(row => { row.sourceContextParts[0].factPointers[0] = '/typedValue/notAField'; });
  rejectAsUnassessable(row => {
    row.sourceContextParts[0].factPointers = [];
    row.sourceContextParts[0].focusBoundsCropPixelsLTRB = [0, 0, 10, 10];
  });

  const identityDocs = {
    canonical: canonicalBeforeJoArtifact(),
    ua: input.uaSupplement,
    phbDmg: candidate,
    passages: input.phbDmgPricePassageSupplement,
    descriptions: input.uaDescriptionSupplement,
    receipts: input.priceDiscoverySupplement,
    phbDmgCensus: input.phbDmgCensus,
    uaCensus: input.uaCensus,
    monsterCensus: input.monsterCensus,
  };
  const identityScope = collectMonetaryRowIdentityRecords(identityDocs);
  assert.equal(identityScope.records.length, 2161);
  assert.equal(identityScope.records.filter(row => row.contextEvidenceSha256).length, 927);
  assert.equal(identityScope.records.filter(row => row.contextEvidence?.fingerprintVersion === 'ordered-source-context-parts-v2').length, 8);
  assert.ok(identityScope.records.every(row => row.identityStatus === 'recorded-unverified'), 'the full row inventory remains an identity inventory, not a source-semantic review');
});

test('supplemental crop frames must be valid before their ordered source context is marked linked', () => {
  const beforeBytes = readFileSync(resolve(root, 'research/source-audit-batch5-monetary-index-supplemental-guard-before.json'));
  assert.equal(sha256(beforeBytes), '089ff19d4c15f78b6a2cb7160b75e56f5e78013b3d0a3b7b290b84ba0f276f0f');
  const before = JSON.parse(beforeBytes.toString('utf8'));
  assert.equal(before.code.sha256, '4330ecfa8414f1f0772d4aeb791d6804d878b1816b8ab40bf4355ca24f3a2d72');
  assert.equal(before.candidate.uncompressedSha256, PHB_DMG_V3_CANDIDATE_SHA256);
  assert.deepEqual(before.controls.filter(control => control.id !== 'nominal').map(control => control.sourceContextPartsStatus), [
    'declared-source-context-parts-linked',
    'declared-source-context-parts-linked',
    'declared-source-context-parts-linked',
    'declared-source-context-parts-linked',
  ], 'the sealed pre-fix receipt retains all four linked false passes');

  const candidate = v3CandidateArtifact();
  const build = data => buildMonetarySourceIndex({...input, phbDmgSupplement: {
    path: 'tests/fixtures/monetary-phbdmg-v3-index-candidate.json.gz#supplemental-frame-guard-copy',
    sha256: sha256(Buffer.from(JSON.stringify(data))),
    data,
  }});
  const rowId = 'dmg-wand-of-wonder-gems-88-90';
  const cropId = 'crop-dmg-gem-and-magic-treasure-valuations-01';
  const occurrenceFor = index => index.sourceOccurrences.find(row => row.sourceOccurrenceId === `phb-dmg:${rowId}`);
  const pristine = build(structuredClone(candidate.data));
  const pristineOccurrence = occurrenceFor(pristine);
  assert.equal(pristineOccurrence.evidence.sourceContextPartsStatus, 'declared-source-context-parts-linked');

  const cases = [
    ['missing source-render hash', crop => { delete crop.sourceRenderSha256; }],
    ['render dimensions exclude the declared crop', crop => { crop.sourceRenderDimensionsPx = [1, 1]; }],
    ['crop dimensions disagree with raster bounds', crop => { crop.cropDimensionsPx = [1, 1]; }],
    ['declared source PDF differs from row source', crop => { crop.sourcePdfSha256 = 'f'.repeat(64); }],
    ['declared PDF page differs from row source', crop => { crop.pdfPage = 138; }],
    ['nested and top-level source frames conflict', crop => { crop.source = {book: 'DMG', sourcePdfSha256: 'f'.repeat(64), printedPage: 136, pdfPage: 137}; }],
    ['declared DPI differs from the row coordinate space', crop => { crop.renderDpi = 300; }],
  ];
  for (const [label, mutate] of cases) {
    const data = structuredClone(candidate.data);
    mutate(data.review.evidenceCrops.find(crop => crop.cropId === cropId));
    const index = build(data);
    const occurrence = occurrenceFor(index);
    assert.equal(occurrence.evidence.sourceContextPartsStatus, 'declared-source-context-parts-unassessable', label);
    assert.match(occurrence.evidence.sourceContextPartsReason, /supplemental crop/i, label);
    assert.deepEqual(occurrence.valueClaimIds, pristineOccurrence.valueClaimIds, `${label}: malformed context does not drop money claims`);
    assert.deepEqual(occurrence.evidence.sourceContextParts.map(part => part.cropId), pristineOccurrence.evidence.sourceContextParts.map(part => part.cropId), `${label}: ordered parts remain inventoried`);
    assert.equal(occurrence.evidence.supplementalContextCrops[0].cropId, cropId, `${label}: supplemental crop remains visible`);
  }
  const wrongPdf = structuredClone(candidate.data);
  wrongPdf.review.evidenceCrops.find(crop => crop.cropId === cropId).sourcePdfSha256 = 'f'.repeat(64);
  const wrongPdfOccurrence = occurrenceFor(build(wrongPdf));
  assert.equal(wrongPdfOccurrence.evidence.supplementalContextCrops[0].metadata.sourcePdfSha256, 'f'.repeat(64), 'the conflicting authored PDF hash remains visible in normalized evidence');
});

test('ordered part DPI and source-frame declarations resolve only through exact evidence', () => {
  const candidate = dpiGuardCandidateArtifact();
  const rowId = 'dmg-poison-ingestive-c';
  const cropId = 'crop-dmg-poison-dose-and-manufacture-04';
  const build = data => {
    const bytes = Buffer.from(JSON.stringify(data));
    return buildMonetarySourceIndex({...input, phbDmgSupplement: {
      path: `${candidate.path}#mutated-source-frame-case`,
      sha256: sha256(bytes),
      data,
    }});
  };
  const occurrenceFor = result => result.sourceOccurrences.find(row => row.sourceOccurrenceId === `phb-dmg:${rowId}`);
  const base = build(structuredClone(candidate.data));
  const baseOccurrence = occurrenceFor(base);
  assert.equal(baseOccurrence.evidence.sourceContextPartsStatus, 'declared-source-context-parts-linked');
  assert.equal(baseOccurrence.evidence.sourceContextParts[0].sourceRender.renderDpi, 150, 'the known primary page frame resolves through the reviewed registry');
  assert.equal(baseOccurrence.evidence.sourceContextParts[1].sourceRender.renderDpi, 300, 'the p.21 note frame resolves from its explicit crop and registry declarations');
  assert.equal(baseOccurrence.evidence.sourceContextParts[1].sourceRender.coordinateSpace, 'original source-render page pixels; top-left origin; [left,top,right,bottom] half-open');
  assert.equal(baseOccurrence.evidence.sourceContextParts[1].sourceRender.frameDpiResolution.frameId, 'monetary-frame-a176aeff2eec447e');
  assert.equal(baseOccurrence.evidence.sourceContextParts[1].declaredFrame.linkedCrop.sourceRenderDpi, 300);
  assert.deepEqual(Object.keys(baseOccurrence.evidence.sourceContextParts[1].sourceRender.declaredDpi).sort(), [
    'cropRenderDpi', 'cropSourceRenderDpi', 'cropSourceRenderRenderDpi', 'cropSourceRenderSourceRenderDpi',
    'partCropRenderDpi', 'partCropSourceRenderDpi', 'partFocusRenderDpi', 'partFocusSourceRenderDpi',
    'partRenderDpi', 'partSourceRenderDpi', 'partSourceRenderRenderDpi', 'partSourceRenderSourceRenderDpi',
  ].sort());
  assert.deepEqual(Object.keys(baseOccurrence.evidence.sourceContextParts[1].sourceRender.declaredCoordinateSpaces).sort(), [
    'crop', 'cropSourceCropFrame', 'cropSourceRender', 'cropSourceRenderFrame', 'cropSourceRenderSourceCropFrame',
    'part', 'partCrop', 'partCropSourceCropFrame', 'partFocus', 'partFocusSourceCropFrame', 'partSourceCropFrame',
    'partSourceRender', 'partSourceRenderSourceCropFrame',
  ].sort());
  assert.equal(baseOccurrence.evidence.sourceContextParts[1].crop.coordinateSpace, 'source-page-global source-render pixels; top-left origin; [left,top,right,bottom] half-open');
  assert.equal(baseOccurrence.evidence.sourceContextParts[1].crop.cropBoundsPixelsCoordinateSpace, baseOccurrence.evidence.sourceContextParts[1].crop.coordinateSpace);
  assert.equal(baseOccurrence.evidence.sourceContextParts[1].focusCoordinateSpace, 'crop-local 300-dpi source-render pixels; left,top,right,bottom; half-open');

  const cases = [
    ['part source absent', x => { delete x.part.source; }],
    ['part source empty', x => { x.part.source = {}; }],
    ['part source missing book', x => { delete x.part.source.book; delete x.part.source.bookKey; }],
    ['part source missing PDF hash', x => { delete x.part.source.sourceFileSha256; }],
    ['part source missing printed page', x => { delete x.part.source.printedPage; }],
    ['part source missing PDF page', x => { delete x.part.source.pdfPage; }],
    ['part source conflicting book aliases', x => { x.part.source.book = 'PHB'; }],
    ['part source conflicting hash aliases', x => { x.part.source.sourcePdfSha256 = 'f'.repeat(64); }],
    ['part source conflicting printed page aliases', x => { x.part.source.page = 20; }],
    ['part source null PDF page', x => { x.part.source.pdfPage = null; }],
    ['part source null hash alias alongside valid hash', x => { x.part.source.sourcePdfSha256 = null; }],
    ['part source null printed page alias alongside valid page', x => { x.part.source.page = null; }],
    ['part source empty book alias alongside valid book', x => { x.part.source.book = ''; }],
    ['crop source mismatched PDF page', x => { x.crop.pdfPage = 21; }],
    ['crop source mismatched printed page', x => { x.crop.printedPage = 20; }],
    ['crop source mismatched book', x => { x.crop.book = 'PHB'; }],
    ['crop source conflicting hash aliases', x => { x.crop.sourceFileSha256 = 'f'.repeat(64); }],
    ['crop nested source conflicting page', x => { x.crop.source = {...x.part.source, pdfPage: 21}; }],
    ['crop renderDpi conflicts with sourceRenderDpi', x => { x.crop.renderDpi = 150; }],
    ['crop sourceRenderDpi zero', x => { x.crop.sourceRenderDpi = 0; }],
    ['crop sourceRenderDpi string', x => { x.crop.sourceRenderDpi = '300'; }],
    ['crop sourceRenderDpi null', x => { x.crop.sourceRenderDpi = null; }],
    ['crop own DPI/frame omitted', x => { delete x.crop.sourceRenderDpi; delete x.crop.sourceCropFrame; }],
    ['unknown secondary frame without own DPI must not borrow row', x => { delete x.crop.sourceRenderDpi; delete x.crop.sourceCropFrame; x.crop.sourceRenderSha256 = 'e'.repeat(64); }],
    ['known render hash wrong dimensions without own DPI', x => { delete x.crop.sourceRenderDpi; delete x.crop.sourceCropFrame; x.crop.sourceRenderDimensionsPx = [2441, 3194]; }],
    ['known render hash wrong source page without own DPI', x => {
      delete x.crop.sourceRenderDpi;
      delete x.crop.sourceCropFrame;
      x.part.source.printedPage = 22;
      x.part.source.pdfPage = 23;
      x.crop.printedPage = 22;
      x.crop.pdfPage = 23;
    }],
    ['part coordinate DPI conflicts', x => { x.part.coordinateSpace = 'crop-local 150-dpi source-render pixels'; }],
    ['part focus coordinate DPI conflicts', x => { x.part.focus = {coordinateSpace: 'crop-local 150-dpi source-render pixels'}; }],
    ['part crop renderDpi conflicts', x => { x.part.crop = {renderDpi: 150}; }],
    ['part crop sourceRenderDpi conflicts', x => { x.part.crop = {sourceRenderDpi: 150}; }],
    ['part sourceRender renderDpi conflicts', x => { x.part.sourceRender = {sourceRenderId: x.crop.sourceRender, sourceRenderSha256: x.crop.sourceRenderSha256, sourceRenderDimensionsPx: x.crop.sourceRenderDimensionsPx, renderDpi: 150}; }],
    ['crop coordinate DPI conflicts', x => { x.crop.coordinateSpace = 'crop-local 150-dpi source-render pixels'; }],
    ['crop source frame DPI conflicts', x => { x.crop.sourceCropFrame = 'PyMuPDF CropBox-relative PageRect rendered at 150dpi'; }],
    ['primary row focus DPI conflicts with its own registered crop', x => { x.row.focus.coordinateSpace = 'crop-local 300-dpi source-render pixels; left,top,right,bottom; half-open'; }],
    ['primary row focus declares incompatible units without DPI', x => { x.row.focus.coordinateSpace = 'pdf-page points'; }],
    ['primary row focus has malformed DPI text', x => { x.row.focus.coordinateSpace = 'crop-local banana-dpi source-render pixels'; }],
    ['single source frame string has contradictory DPI values', x => { x.crop.sourceCropFrame = 'PyMuPDF CropBox-relative PageRect rendered at 300dpi; other explicit frame declaration 150dpi'; }],
    ['declared coordinate space has malformed DPI text', x => { x.part.coordinateSpace = 'crop-local banana-dpi source-render pixels'; }],
    ['declared coordinate space uses incompatible units without DPI', x => { x.part.coordinateSpace = 'pdf-page points'; }],
    ['sourceCropFrame has malformed DPI text', x => { x.crop.sourceCropFrame = 'PyMuPDF render recipe banana-dpi'; }],
    ['part sourceRender sourceRenderDpi conflicts', x => { x.part.sourceRender = {sourceRenderId: x.crop.sourceRender, sourceRenderSha256: x.crop.sourceRenderSha256, sourceRenderDimensionsPx: x.crop.sourceRenderDimensionsPx, sourceRenderDpi: 150}; }],
    ['crop sourceRenderCoordinateSpace conflicts', x => { x.crop.sourceRenderCoordinateSpace = 'crop-local 150-dpi source-render pixels'; }],
  ];
  const declarationNodes = [
    ['part', x => x.part],
    ['part.focus', x => (x.part.focus ??= {})],
    ['part.crop', x => (x.part.crop ??= {renderDpi: 300})],
    ['part.sourceRender', x => (x.part.sourceRender ??= {renderDpi: 300})],
    ['crop', x => x.crop],
  ];
  for (const [node, getObject] of declarationNodes) {
    cases.push(
      [`${node} negative coordinate-space DPI`, x => { getObject(x).coordinateSpace = 'crop-local -300-dpi source-render pixels'; }],
      [`${node} negative source-frame DPI`, x => { getObject(x).sourceCropFrame = 'source render recipe at -300dpi'; }],
      [`${node} empty source-frame declaration`, x => { getObject(x).sourceCropFrame = ''; }],
    );
  }
  for (const [label, mutate] of cases) {
    const data = structuredClone(candidate.data);
    const row = data.review.sourceRowsOrClaims.find(item => item.sourceRowOrClaimId === rowId);
    const part = row.sourceContextParts[1];
    const crop = data.review.evidenceCrops.find(item => item.cropId === cropId);
    mutate({row, part, crop});
    const occurrence = occurrenceFor(build(data));
    if (label === 'crop own DPI/frame omitted') {
      assert.equal(occurrence.evidence.sourceContextPartsStatus, 'declared-source-context-parts-linked', label);
      assert.equal(occurrence.evidence.sourceContextParts[1].sourceRender.renderDpi, 300, 'the exact registered source/page/render frame supplies DPI when crop declarations are absent');
    } else {
      assert.equal(occurrence.evidence.sourceContextPartsStatus, 'declared-source-context-parts-unassessable', label);
    }
    assert.deepEqual(occurrence.valueClaimIds, baseOccurrence.valueClaimIds, `${label}: context errors do not remove the source row or its claims`);
  }

  const renderLabelChange = structuredClone(candidate.data);
  const renamedCrop = renderLabelChange.review.evidenceCrops.find(item => item.cropId === cropId);
  renamedCrop.sourceRender = 'opaque-render-label.png';
  const renamedOccurrence = occurrenceFor(build(renderLabelChange));
  assert.equal(renamedOccurrence.evidence.sourceContextPartsStatus, 'declared-source-context-parts-linked', 'render filenames do not supply or alter DPI');
  assert.equal(renamedOccurrence.evidence.sourceContextParts[1].sourceRender.renderDpi, 300);
});

test('unresolved normalized claims retain exact description pointers and source-only disclosures', () => {
  const unassessable = index.claims.filter(claim => claim.descriptionResolution);
  assert.equal(unassessable.length, 8);
  assert.deepEqual(unassessable.map(claim => claim.claimId), [
    'ua:ua-other-005-E6-r187#/values/gpSaleValue',
    'ua:ua-other-005-E7-r213#/values/gpSaleValue',
    'ua:ua-other-008-H2-r039#/values/gpSaleValue',
    'ua:ua-other-008-H2-r052#/values/gpSaleValue',
    'ua:ua-other-008-H2-r059#/values/gpSaleValue',
    'ua:ua-other-008-H2-r064#/values/gpSaleValue',
    'ua:ua-other-008-H2-r069#/values/gpSaleValue',
    'ua:ua-other-008-H2-r072#/values/gpSaleValue',
  ]);
  assert.ok(unassessable.every(claim => claim.source.book === 'Unearthed Arcana'));
  assert.ok(unassessable.every(claim => claim.valueSemantics.kind === 'unassessable' && claim.valueSemantics.reference && claim.valueSemantics.rawStructuredValue));
  assert.ok(unassessable.every(claim => claim.evidence.excerptPublication.status.startsWith('source-only')));
  const remainingRelative = index.claims.filter(claim => claim.valueSemantics.kind === 'unassessable' && !claim.descriptionResolution);
  assert.deepEqual(remainingRelative.map(claim => claim.claimId), [
    'price-discovery:ua-census-record-006#/typedClaim',
    'price-discovery:ua-census-record-038#/typedClaim',
    'price-discovery:mm-mammoth-tusks-relative#/typedClaim',
  ]);
  assert.ok(index.claims.every(claim => claim.reviewStatus.indexReview === 'inventory-only; no semantic or overlay approval performed'));
  assert.ok(index.claims.filter(claim => claim.claimId.startsWith('ua:') || claim.claimId.startsWith('phb-dmg:') || claim.claimId.startsWith('phb123:')).every(claim => claim.reviewStatus.independentSemanticReview === 'pending-independent-review'));
});

test('eight UA GP pointer cells link to exact description rows or passages while table values stay unresolved', () => {
  assert.deepEqual(index.uaDescriptionResolution, {
    boundedPointerLinks: 8,
    newDescriptionPassages: 2,
    tablePointerAmountsStillUnresolved: 8,
    xpValuesKeptSeparate: true,
    links: [
      {pointerClaimId: 'ua:ua-other-005-E6-r187#/values/gpSaleValue', sourceDescriptionOccurrences: 5, gpSourceValueClaims: 5, xpValuesSeparate: 5},
      {pointerClaimId: 'ua:ua-other-005-E7-r213#/values/gpSaleValue', sourceDescriptionOccurrences: 6, gpSourceValueClaims: 6, xpValuesSeparate: 6},
      {pointerClaimId: 'ua:ua-other-008-H2-r039#/values/gpSaleValue', sourceDescriptionOccurrences: 1, gpSourceValueClaims: 1, xpValuesSeparate: 1},
      {pointerClaimId: 'ua:ua-other-008-H2-r052#/values/gpSaleValue', sourceDescriptionOccurrences: 1, gpSourceValueClaims: 1, xpValuesSeparate: 1},
      {pointerClaimId: 'ua:ua-other-008-H2-r059#/values/gpSaleValue', sourceDescriptionOccurrences: 6, gpSourceValueClaims: 6, xpValuesSeparate: 6},
      {pointerClaimId: 'ua:ua-other-008-H2-r064#/values/gpSaleValue', sourceDescriptionOccurrences: 4, gpSourceValueClaims: 4, xpValuesSeparate: 4},
      {pointerClaimId: 'ua:ua-other-008-H2-r069#/values/gpSaleValue', sourceDescriptionOccurrences: 5, gpSourceValueClaims: 5, xpValuesSeparate: 5},
      {pointerClaimId: 'ua:ua-other-008-H2-r072#/values/gpSaleValue', sourceDescriptionOccurrences: 5, gpSourceValueClaims: 5, xpValuesSeparate: 5},
    ],
  });
  const pointerClaims = index.claims.filter(claim => claim.descriptionResolution);
  assert.equal(pointerClaims.length, 8);
  assert.ok(pointerClaims.every(claim => claim.valueSemantics.kind === 'unassessable'));
  assert.ok(pointerClaims.every(claim => claim.descriptionResolution.tableValueStatus === 'amount unresolved by table'));
  assert.ok(pointerClaims.every(claim => claim.descriptionResolution.gpSourceValueClaimIds.length > 0));
  assert.ok(pointerClaims.every(claim => claim.descriptionResolution.xpDescriptionValuesKeptSeparate.every(value => value.value.currency === 'xp')));

  const axe = index.claims.find(claim => claim.claimId === 'ua-description:ua-description-axe-of-hurling-values#/valueRecords/gpSaleValue');
  const axeRange = index.claims.find(claim => claim.claimId === 'ua-description:ua-description-axe-of-hurling-values#/valueRecords/derivedBonusRange');
  const dagger = index.claims.find(claim => claim.claimId === 'ua-description:ua-description-dagger-of-throwing-values#/valueRecords/gpSaleValue');
  const daggerRange = index.claims.find(claim => claim.claimId === 'ua-description:ua-description-dagger-of-throwing-values#/valueRecords/derivedBonusRange');
  assert.deepEqual([axe.valueSemantics.kind, axe.valueSemantics.amount, axe.valueSemantics.currency, axe.valueSemantics.denominator], ['rate', 15000, 'gp', 'per magical-bonus point']);
  assert.deepEqual([axeRange.valueSemantics.minimumAmount, axeRange.valueSemantics.maximumAmount, axeRange.valueSemantics.printedAsRange, axeRange.valueSemantics.derivationStatus], [15000, 75000, false, 'derived-from-printed-formula-and-adjacent-variant-table']);
  assert.deepEqual([dagger.valueSemantics.kind, dagger.valueSemantics.base, dagger.valueSemantics.increment, dagger.valueSemantics.currency], ['formula', 1500, 1000, 'gp']);
  assert.deepEqual([daggerRange.valueSemantics.minimumAmount, daggerRange.valueSemantics.maximumAmount, daggerRange.valueSemantics.printedAsRange], [2500, 5500, false]);
  assert.equal(axe.adjacentReferences.xpValue.currency, 'xp');
  assert.equal(dagger.adjacentReferences.xpValue.currency, 'xp');
  assert.ok(index.claims.every(claim => claim.valueSemantics?.currency !== 'xp'));
});

test('all 180 bounded census receipts retain their pre-fix disposition and link by exact identity', () => {
  const source = input.priceDiscoverySupplement.data;
  const receipts = source.claimReceipts;
  const censusByPath = new Map([input.phbDmgCensus, input.uaCensus, input.monsterCensus].map(artifact => [artifact.path, artifact]));
  const censusManifestByPath = new Map(Object.values(source.inputArtifacts).map(entry => [entry.path, entry]));
  assert.equal(receipts.length, 180);
  assert.equal(index.priceDiscoveryReceiptReconciliation.boundedDenominator, 180);
  assert.equal(source.baselineReceiptArtifact.sha256BeforePostRemediationAnnotations, '79ee82182518ce03ba113a163356f44aa2c594b730e92d22d2148a79f8f014b3');
  assert.deepEqual(index.priceDiscoveryReceiptReconciliation.directReceiptDispositionCounts, {
    directTyped: 140,
    linked: 40,
    unresolved: 0,
    nonPrice: 6,
    duplicates: 1,
  });
  const occurrences = new Map(index.sourceOccurrences.map(row => [row.sourceOccurrenceId, row]));
  const links = index.priceDiscoveryReceiptReconciliation.rowOrPassageLinks;
  for (const [index, receipt] of receipts.entries()) {
    const occurrence = occurrences.get(`price-discovery:${receipt.receiptId}`);
    assert.ok(occurrence, receipt.receiptId);
    assert.equal(occurrence.provenance.sourceCensusArtifact, receipt.sourceCensusArtifact ?? null, receipt.receiptId);
    assert.equal(occurrence.provenance.sourceCensusJsonPointer, receipt.sourceJsonPointer ?? null, receipt.receiptId);
    assert.equal(occurrence.sourceIdentity.discoveryStatus, receipt.receiptStatus, receipt.receiptId);
    assert.equal(receipt.baselineReceiptStatus, receipt.receiptStatus, receipt.receiptId);
    assert.equal(receipt.postRemediation.receiptOccurrenceId, occurrence.sourceOccurrenceId, receipt.receiptId);
    assert.deepEqual(receipt.postRemediation.indexedClaimIds, occurrence.valueClaimIds, receipt.receiptId);
    assert.ok(receipt.postRemediation.disposition.length > 0, receipt.receiptId);
    const censusArtifact = censusByPath.get(receipt.sourceCensusArtifact);
    const censusManifest = censusManifestByPath.get(receipt.sourceCensusArtifact);
    assert.ok(censusArtifact, receipt.receiptId);
    assert.ok(censusManifest, receipt.receiptId);
    assert.equal(censusArtifact.sha256, censusManifest.sha256, receipt.receiptId);
    assert.notEqual(valueAtJsonPointer(censusArtifact.data, receipt.sourceJsonPointer), undefined, receipt.receiptId);
    assert.ok(occurrence.valueClaimIds.length > 0, receipt.receiptId);
    assert.ok(Array.isArray(links[receipt.receiptId]) && links[receipt.receiptId].length > 0, receipt.receiptId);
    for (const relatedId of occurrence.relatedSourceOccurrenceIds) assert.ok(occurrences.has(relatedId), `${receipt.receiptId}: ${relatedId}`);
    if (receipt.linkedTypedSourceRecords?.length) {
      for (const row of receipt.linkedTypedSourceRecords) {
        assert.ok(occurrence.relatedSourceOccurrenceIds.includes(`ua:${row.sourceRowId ?? row.sourceRowOrClaimId ?? row.recordId}`)
          || occurrence.relatedSourceOccurrenceIds.includes(`phb-dmg:${row.sourceRowId ?? row.sourceRowOrClaimId ?? row.recordId}`)
          || occurrence.relatedSourceOccurrenceIds.includes(`canonical:${row.sourceRowId ?? row.sourceRowOrClaimId ?? row.recordId}`), receipt.receiptId);
      }
    }
    assert.equal(receipt.receiptId, receipts[index].receiptId);
  }
  const duration = index.claims.find(claim => claim.claimId === 'price-discovery:ua-census-record-031#/typedClaim');
  assert.equal(duration.valueSemantics.kind, 'non-monetary-reference');
  assert.equal(duration.monetaryAmount, false);
  const duplicateReceipt = occurrences.get('price-discovery:dmg-removable-hireling-reference');
  assert.equal(duplicateReceipt.sourceIdentity.discoveryStatus, 'duplicate-occurrence-unassessable-source-printing');
  assert.equal(duplicateReceipt.sourceIdentity.linkedSourceOccurrenceIds.length, 43);
  assert.equal(duplicateReceipt.source.printedPage, null);
  assert.equal(source.postRemediationDenominators.boundedCensusReceipts, 180);
  assert.equal(source.postRemediationDenominators.indexedReceiptOccurrences, 180);
  assert.equal(source.postRemediationDenominators.newPHBDMGPassageRecords, 34);
  assert.equal(source.postRemediationDenominators.priceDiscoveryValueClaimRecords, 199);
  assert.deepEqual(source.postRemediationDenominators.unassessableRelativeReadings, [
    'price-discovery:ua-census-record-006#/typedClaim',
    'price-discovery:ua-census-record-038#/typedClaim',
    'price-discovery:mm-mammoth-tusks-relative#/typedClaim',
  ]);
});

test('new passage claims use per-value exact source-row links where the record provides them', () => {
  const byId = new Map(index.claims.map(claim => [claim.claimId, claim]));
  const expected = [
    ['price-discovery:dmg-hireling-leadership-and-profession-fees#/valueRecords/0', 'canonical:dmg29-expert-hireling-rates-011'],
    ['price-discovery:dmg-hireling-leadership-and-profession-fees#/valueRecords/1', 'canonical:dmg29-expert-hireling-rates-023'],
    ['price-discovery:dmg-hireling-leadership-and-profession-fees#/valueRecords/2', 'canonical:dmg29-expert-hireling-rates-025'],
    ['price-discovery:dmg-artifact-market-values#/valueRecords/0', 'canonical:dmg-post125-screening-001'],
    ['price-discovery:dmg-artifact-market-values#/valueRecords/1', 'canonical:dmg-post125-screening-002'],
    ['price-discovery:dmg-artifact-market-values#/valueRecords/2', 'canonical:dmg-post125-screening-003'],
  ];
  for (const [claimId, occurrenceId] of expected) {
    const claim = byId.get(claimId);
    assert.ok(claim, claimId);
    assert.deepEqual(claim.relatedSourceOccurrenceIds, [occurrenceId], claimId);
    assert.ok(claim.relatedSourceClaimIds.length > 0, claimId);
  }
  for (const claim of index.claims.filter(candidate => candidate.relatedSourceOccurrenceIds?.length)) {
    assert.ok(claim.relatedSourceOccurrenceIds.every(id => index.sourceOccurrences.some(occurrence => occurrence.sourceOccurrenceId === id)), claim.claimId);
    assert.ok(claim.relatedSourceClaimIds.every(id => index.claims.some(linked => linked.claimId === id)), claim.claimId);
  }
});

test('historical fixture stays pinned, current inventory validation rejects its stale site denominator, and shape mismatches fail closed', async () => {
  const compressed = readFileSync(resolve(root, 'tests/fixtures/price-source-inventory-baseline-679.json.gz'));
  const baselineBytes = gunzipSync(compressed);
  assert.equal(sha256(baselineBytes), BASELINE_CANONICAL_SHA256);
  assert.throws(() => validatePriceSourceInventory(input.canonical.data), /site-claim denominator .* != equipment records/);
  assert.throws(() => buildMonetarySourceIndex(input, {expectedDenominators: {...CURRENT_DENOMINATORS, uaSupplementRows: 584}}), /Monetary-source input shape mismatch/);
  assert.deepEqual(await runMonetarySourceInventoryCli(['--help']), {
    status: 'usage',
    text: 'Usage: node tools/monetary-source-inventory.mjs --output <path> [--source-inventory <path> --equipment <path> --equipment-bindings <path> --ua-supplement <path> --ua-description-supplement <path> --phb-dmg-supplement <path> --price-discovery-supplement <path> --phb-dmg-price-passage-supplement <path>] | --check [path] [--allow-historical]',
  });
  await assert.rejects(
    runMonetarySourceInventoryCli(['--output', 'research/monetary-source-inventory.json', '--allow-historical']),
    /restricted to output\/check paths under tests\/fixtures/,
  );
});

test('current committed index CLI check passes with the corrected Deck and alchemist representations', async () => {
  const check = await runMonetarySourceInventoryCli(['--check', 'research/monetary-source-inventory.json']);
  assert.deepEqual(check, {
    status: 'ok',
    output: 'research/monetary-source-inventory.json',
    sourceOccurrences: 1871,
    claims: 2317,
  });
  const committed = JSON.parse(readFileSync(resolve(root, 'research/monetary-source-inventory.json'), 'utf8'));
  assert.equal(committed.denominators.sourceOccurrences, 1871);
  assert.equal(committed.denominators.sourceValueClaims, 2317);

  const deckClaims = committed.claims.filter(claim => claim.sourceOccurrenceId === 'phb-dmg:dmg-deck-gem-card');
  assert.equal(deckClaims.length, 1, 'the Deck row has no derived total claim');
  assert.equal(deckClaims[0].claimId, 'phb-dmg:dmg-deck-gem-card#/typedValue/gemsBaseValueGpEach');
  assert.equal(deckClaims[0].valueSemantics.amount, 1000);
  assert.match(deckClaims[0].valueSemantics.unit, /each gem has a 1,000 gp base value/);
  assert.match(deckClaims[0].valueSemantics.unit, /source prints no total/);

  const alchemistClaims = committed.claims.filter(claim => claim.sourceOccurrenceId === 'phb-dmg:dmg-potion-alchemist-discount');
  assert.equal(alchemistClaims.length, 1);
  assert.equal(alchemistClaims[0].valueSemantics.kind, 'non-monetary-reference');
  assert.deepEqual(alchemistClaims[0].valueSemantics.rawStructuredValue, {timeReductionPct: 50});
  assert.equal(alchemistClaims[0].monetaryAmount, false);
  assert.equal(alchemistClaims[0].monetaryClaim, false);
  assert.match(alchemistClaims[0].conditions, /monetary reduction percentage and the exact components covered remain unclear/);
});
