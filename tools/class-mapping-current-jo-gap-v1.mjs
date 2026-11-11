// Next-native Jo adapter. Retains the exact null/unextracted semantics and
// historical registration evidence; it proves neither source absence nor a
// purchase price. The current stage is always obtained from the fixed native gate.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {qualifyCurrentConsumerStage, requireQualificationArtifact, sourceBodyReference, currentConsumerRepoRoot} from './class-mapping-current-consumer-runtime-v1.mjs';
import {loadJoUnextractedPriceRegistration} from './jo-unextracted-price-registration.mjs';
import {hash as objectHash} from './monetary-row-identity-audit.mjs';

export const joCurrentNativeContractPath = 'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json';
const fail = message => { throw new Error(`Invalid next-native Jo source-gap adapter: ${message}`); };
const json = bytes => JSON.parse(bytes.toString('utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function loadClosedContract(stage) {
  const {bytes, sha256} = requireQualificationArtifact(stage, joCurrentNativeContractPath);
  const contract = json(bytes);
  const pin = contract.nativeSourceEpochBinding;
  if (contract.schemaVersion !== 1 || contract.artifactType !== 'Next-native class-source Jo unextracted-price successor contract'
      || contract.status !== 'qualified; Jo null/unextracted gap retained with review pending'
      || contract.materialized !== true || contract.semanticParent?.path !== 'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json'
      || contract.semanticParent?.sha256 !== '81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b'
      || pin?.sourceCommit !== stage.summary.sourceCommit
      || pin?.sourceTree !== stage.summary.sourceTree || pin?.fixturePath !== stage.summary.fixture.path
      || pin?.fixtureSha256 !== stage.summary.fixture.sha256) fail('Jo qualification contract is not pinned to the exact native S1 body');
  return {contract, ref: {path: joCurrentNativeContractPath, sha256}};
}

export function loadJoCurrentSuccessor(...args) {
  if (args.length) fail('adapter accepts no caller-selected root, body snapshot, inventory or fixture');
  const stage = qualifyCurrentConsumerStage();
  const {contract, ref} = loadClosedContract(stage);
  const parentPath = 'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json';
  const parentBytes = readFileSync(resolve(currentConsumerRepoRoot, parentPath));
  if (sha256(parentBytes) !== '81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b') fail('frozen MM Jo semantic parent bytes changed');
  const parent = json(parentBytes);
  if (JSON.stringify(contract.historicalEvidence) !== JSON.stringify(parent.historicalEvidence)) fail('historical Jo registration evidence changed');
  const {data, inventory, mechanics} = stage.inputs;
  const target = contract.retainedJoTarget;
  if (!target || target.collection !== 'equipment' || target.itemId !== 'ua-jo-stick'
      || !target.requiredState || target.requiredState.price !== null || target.requiredState.priceState !== 'unextracted'
      || target.requiredState.mechanicsPriceStatus !== 'not-extracted' || target.requiredState.mechanicsPriceValue !== null
      || target.requiredState.mechanicsPriceInspected !== false || target.sourcePriceAbsenceReviewed !== false
      || target.extractedPriceReviewed !== false || target.unitProvenance !== 'unassessable' || target.semanticPass !== false) fail('closed Jo target identity and pending-grade contract');
  const owner = data.equipment?.find(row => row.id === target.itemId);
  const mechanicsRecord = mechanics.records?.find(row => row.collection === 'equipment' && row.id === target.itemId);
  const priceField = mechanicsRecord?.fields?.find(row => row.path === target.pricePointer);
  const siteClaims = inventory.siteClaims?.filter(row => row.itemId === target.itemId) || [];
  if (!owner || owner.price !== null || owner.priceState !== 'unextracted'
      || priceField?.status !== 'not-extracted' || priceField.value !== null || priceField.inspected !== false
      || siteClaims.length !== 1 || siteClaims[0].claimType !== 'unextracted-price'
      || siteClaims[0].priceState !== 'unextracted' || siteClaims[0].printedPrice !== null
      || siteClaims[0].estimate !== null || siteClaims[0].sourcePageReference !== null) {
    fail('Jo remains a null unextracted price with an uninspected mechanics field and one matching site gap');
  }
  const inherited = loadJoUnextractedPriceRegistration({repoRoot: currentConsumerRepoRoot, data, inventory});
  if (inherited.itemId !== target.itemId || inherited.sourceAbsence !== false || inherited.valueReviewed !== false) {
    fail('historical four-note registration plus Jo gap semantics changed');
  }
  const sourceRefs = [
    sourceBodyReference(stage, 'dist/data.json'),
    sourceBodyReference(stage, 'research/price-source-inventory.json'),
    sourceBodyReference(stage, 'research/field-evidence-bindings.json'),
    sourceBodyReference(stage, 'research/mechanics-audit-progress.json'),
    sourceBodyReference(stage, 'equipment.json'),
  ];
  return {
    ...inherited,
    registryRef: ref,
    inputRefs: [...new Map([...inherited.inputRefs, ...sourceRefs, ref].map(row => [row.path, row])).values()].sort((a,b) => a.path.localeCompare(b.path)),
    currentSourceEpoch: {sourceCommit: stage.summary.sourceCommit, sourceTree: stage.summary.sourceTree, fixture: stage.summary.fixture},
    sourcePriceAbsenceReviewed: false,
    extractedPriceReviewed: false,
    unitProvenance: 'unassessable',
    semanticPass: false,
    payloadProof: {
      itemId: target.itemId,
      currentDataRecordSha256: objectHash(owner),
      currentMechanicsRecordSha256: objectHash(mechanicsRecord),
      sourcePriceAbsenceReviewed: false,
      extractedPriceReviewed: false,
      semanticPass: false,
    },
  };
}
