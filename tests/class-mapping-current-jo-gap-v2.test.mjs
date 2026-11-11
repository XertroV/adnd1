import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import * as reportPins from '../tools/class-mapping-report-input-contract-v2.mjs';

const root = new URL('../', import.meta.url);
const adapterText = fs.readFileSync(new URL('tools/class-mapping-current-jo-gap-v1.mjs', root), 'utf8');
const runtimeText = fs.readFileSync(new URL('tools/class-mapping-current-consumer-runtime-v1.mjs', root), 'utf8');
const sealVerifierText = fs.readFileSync(new URL('tools/class-mapping-current-consumer-seal-verifier-v1.mjs', root), 'utf8');
const reportContractText = fs.readFileSync(new URL('tools/class-mapping-report-input-contract-v2.mjs', root), 'utf8');
const reportConsumerText = fs.readFileSync(new URL('tools/monetary-unit-provenance-audit-next-native-v2.mjs', root), 'utf8');
const contract = JSON.parse(fs.readFileSync(new URL('research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json', root), 'utf8'));
const parent = JSON.parse(fs.readFileSync(new URL('research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json', root), 'utf8'));
const predecessor = JSON.parse(fs.readFileSync(new URL('research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json', root), 'utf8'));
const archive = fs.readFileSync(new URL('research/class-mapping-current-adapters-v1/jo-registered-equipment-v1.json.gz', root));
const codeStageStub = fs.readFileSync(new URL('research/class-mapping-current-adapters-v1/current-consumer-code-stage-pins-v1.qcc-stub.mjs', root));
const finalStub = fs.readFileSync(new URL('research/class-mapping-current-adapters-v1/current-consumer-pins-v1.qcc-stub.mjs', root));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceEpoch = {
  sourceCommit:'2d35138027f00c0740975e519dbb3a2b6df76d14',
  sourceTree:'40ecb15130b339658522794db6d9e1bc58f43b50',
  fixture:{path:'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',sha256:'c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10'},
};
const expectedBodyRefs = [
  {path:'dist/data.json',sha256:'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573'},
  {path:'research/price-source-inventory.json',sha256:'b32a8f8126e73b28fd0609fc7e0856990a454402b440735a77627f26fe986564'},
  {path:'research/field-evidence-bindings.json',sha256:'dc8a912cd1054572257e83b654cedb63c8d2d6ff29f327ce0151498b4ad59827'},
  {path:'research/mechanics-audit-progress.json',sha256:'03643330c73dc3fe88f9abeb8a086883a3955d918cba2573e198563631a75785'},
  {path:'equipment.json',sha256:'714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95'},
];
const expectedGapIds = ['phb-bo-stick','phb-club','phb-quarterstaff','phb-sling-stone','ua-jo-stick'];
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

function extractAssertContract() {
  const marker = 'function assertContract(contract, stage) {';
  const start = adapterText.indexOf(marker);
  assert.notEqual(start, -1, 'candidate retains its closed assertContract guard');
  const open = adapterText.indexOf('{', start);
  let depth = 1, end = open + 1;
  for (; end < adapterText.length && depth; end++) {
    if (adapterText[end] === '{') depth++;
    if (adapterText[end] === '}') depth--;
  }
  assert.equal(depth, 0, 'candidate contract guard has balanced braces');
  const body = adapterText.slice(open + 1, end - 1);
  const fail = message => { throw new Error(message); };
  return new Function('expectedBodyRefs','expectedGapIds','same','fail','semanticParentPath','semanticParentSha256','predecessorPath','predecessorSha256', `return function assertContract(contract,stage){${body}}`)(
    expectedBodyRefs,expectedGapIds,same,fail,
    'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json','81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b',
    'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json','88f5fc0fe4e19bbcc171a29f60a465df6c8a7c3b2486a8e56b9277d0d14e96fc',
  );
}

test('installable contract preserves the parent evidence object and byte-binds separate witness/current inputs', () => {
  assert.deepEqual(contract.historicalEvidence, parent.historicalEvidence);
  assert.deepEqual(contract.historicalEvidence, predecessor.historicalEvidence);
  assert.deepEqual(contract.semanticParent, {path:'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json',sha256:'81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b'});
  assert.equal(contract.predecessor.path, 'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json');
  assert.equal(contract.predecessor.sha256, '88f5fc0fe4e19bbcc171a29f60a465df6c8a7c3b2486a8e56b9277d0d14e96fc');
  assert.equal(contract.nativeSourceEpochBinding.qualifierCodeCommit, null);
  assert.equal(contract.currentEvidence.equipment.sha256, '714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95');
  assert.equal(contract.historicalWitness.registeredEquipment.uncompressedSha256, '9c831f319a8d58bd3c943c610a89326975f622015b760073217ecf0f7b55e6f7');
  assert.equal(sha(gunzipSync(archive)), contract.historicalWitness.registeredEquipment.uncompressedSha256);
  assert.equal(sha(codeStageStub), '8549e478c6ef762a49145420c610d12d8ed767b34648bdaa894b82ec09b08bb5');
  assert.equal(sha(finalStub), '53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385');
  const contractList = runtimeText.match(/const requiredContracts = \[([\s\S]*?)\];/)?.[1] || '';
  assert.equal([...contractList.matchAll(/'research\/class-mapping-current-adapters-v1\/[^']+\.json'/g)].length, 6);
  assert.match(codeStageStub.toString('utf8'), /jo-current-source-gap-contract-v2\.json': null/);
  assert.match(finalStub.toString('utf8'), /jo-current-source-gap-contract-v2\.json': null/);
  assert.match(runtimeText, /53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385/);
  assert.match(runtimeText, /jo-current-source-gap-contract-v2\.json/);
  assert.match(sealVerifierText, /53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385/);
  assert.match(reportContractText, /53023f4f607223b96a012ef855671b5e2bda6d0c684b62a98dc6f9d054b8e385/);
  assert.match(adapterText, /const historicalEvidenceRefs = historical\.refs/);
  assert.match(adapterText, /const currentSourceRefs = sourceRefs/);
  assert.match(reportConsumerText, /historicalEvidenceRefs:registration\.historicalEvidenceRefs/);
  assert.match(reportConsumerText, /currentSourceRefs:registration\.currentSourceRefs/);
});

test('the existing adapter stays zero-argument and the private contract guard rejects target/grade rewrites', () => {
  const publicStart = adapterText.indexOf('export function loadJoCurrentSuccessor(...args)');
  const publicBody = adapterText.slice(publicStart);
  assert.notEqual(publicStart, -1);
  assert.ok(publicBody.indexOf("if (args.length)") < publicBody.indexOf('qualifyCurrentConsumerStage()'));
  assert.doesNotMatch(publicBody, /repoRoot\s*=/);
  assert.match(adapterText, /validateJoUnextractedPriceRegistration\(/);
  assert.doesNotMatch(adapterText, /loadJoUnextractedPriceRegistration\(/);

  const validate = extractAssertContract();
  validate(contract, {summary:sourceEpoch});
  const mutants = [
    value => { value.retainedJoTarget.collection = 'spells'; },
    value => { value.retainedJoTarget.itemId = 'phb-bo-stick'; },
    value => { value.retainedJoTarget.pricePointer = '/fields/other'; },
    value => { value.retainedJoTarget.requiredState.price = 1; },
    value => { value.retainedJoTarget.requiredState.priceState = 'estimated'; },
    value => { value.retainedJoTarget.requiredState.mechanicsPriceInspected = true; },
    value => { value.retainedJoTarget.sourcePriceAbsenceReviewed = true; },
    value => { value.retainedJoTarget.unitProvenance = 'price-per-item'; },
  ];
  for (const mutate of mutants) {
    const changed = structuredClone(contract);
    mutate(changed);
    assert.throws(() => validate(changed, {summary:sourceEpoch}));
  }
});

test('report/QCC dependency closure includes all Jo reads and preserves the exact 19-path set', () => {
  const newDataPaths = [
    'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json',
    'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json',
    'research/source-audit-batch6-jo-unextracted-price.json',
    'research/class-mapping-current-adapters-v1/jo-registered-equipment-v1.json.gz',
    'tests/fixtures/equipment-before-jo.json.gz',
    'research/source-audit-batch6-jo-mapping-independent-review.json',
    'research/source-audit-batch6-jo-source-row-proof.json',
  ];
  for (const path of newDataPaths) assert.ok(reportPins.REPORT_DATA_PATHS.includes(path), `missing report data path ${path}`);
  for (const edge of reportPins.REPORT_DATA_POINTER_EDGES.filter(row => row.sourcePath === newDataPaths[0])) {
    assert.ok(reportPins.REPORT_DATA_PATHS.includes(edge.sourcePath));
    assert.ok(reportPins.REPORT_DATA_PATHS.includes(edge.targetPath));
  }
  assert.equal(reportPins.REPORT_DATA_POINTER_EDGES.filter(row => row.sourcePath === newDataPaths[0]).length, 8);
  assert.equal(reportPins.S2_CURRENT_ADAPTER_CODE_PATHS.length, 19);
  assert.equal(Object.keys(reportPins.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES).length, 19);
  assert.equal(reportPins.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES['tools/class-mapping-current-jo-gap-v1.mjs'], '1a36b58c8e6da6bc281d46b3028372feb6e5c26014cb79ff4ef01cf004d44199');
  assert.equal(reportPins.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES['tools/class-mapping-current-consumer-runtime-v1.mjs'], 'eddac05f87eb17876f70fc93952a0be04f3139a2f8815c38c47668b9d5e38a5b');
  assert.equal(reportPins.S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES['tools/class-mapping-current-consumer-seal-verifier-v1.mjs'], '2024a67b10faf01292838f4c1f69f70b634ee6cdbab063cdaa04b72e36902678');
  assert.equal(reportPins.REPORT_CODE_PATHS.includes('tools/monetary-unit-provenance-audit-next-native-v2.mjs'), true);
  assert.equal(reportPins.REPORT_DATA_EXPECTED_SHA256[newDataPaths[0]], sha(fs.readFileSync(new URL('research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json', root))));
});
