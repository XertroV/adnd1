#!/usr/bin/env node
// Actual current-MM Jo adapter for refresh-gaps and monetary unit provenance.
// It runs the complete current-MM guard before the narrower frozen Jo semantic
// core, then binds the Jo owner and pending mechanics grade to current bytes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {assertCurrentMmSourceEpoch} from './mm-current-source-gate-v1.mjs';
import {assertCurrentMmPlainJson} from './mm-current-safe-json-v1.mjs';
import {validateJoUnextractedPriceRegistration} from './jo-unextracted-price-registration.mjs';
import {hash as objectHash} from './monetary-row-identity-audit.mjs';
import {assertNativeCurrentMonetaryIndexDependencies} from '../research/mm-current-cli-successors-v1/native-monetary-source-questions-kernel-mm-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const joCurrentMmContractPath = 'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json';
export const joCurrentMmContractSha256 = '81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid current-MM Jo source-gap successor: ${message}`); };
const readBytes = (repoRoot, rel) => fs.readFileSync(path.resolve(repoRoot, rel));
const readJson = (repoRoot, rel) => JSON.parse(readBytes(repoRoot, rel).toString('utf8'));

function loadContract(repoRoot) {
  const bytes = readBytes(repoRoot, joCurrentMmContractPath);
  if (sha256(bytes) !== joCurrentMmContractSha256) fail('current-MM Jo contract bytes changed');
  return JSON.parse(bytes.toString('utf8'));
}

export function loadJoCurrentSuccessor({repoRoot = root, data, inventory} = {}) {
  const currentRoot = path.resolve(repoRoot);
  const {inputs, summary} = assertCurrentMmSourceEpoch(currentRoot);
  try {
    assertCurrentMmPlainJson(data, 'caller data');
    assertCurrentMmPlainJson(inventory, 'caller inventory');
  } catch {
    fail('passed data and inventory must be ordinary JSON before object hashing');
  }
  const contract = loadContract(currentRoot);
  if (summary.sourceCommit !== contract.sourceEpoch.sourceCommit || summary.sourceTree !== contract.sourceEpoch.sourceTree
      || JSON.stringify(inputs.rawInputs) !== JSON.stringify(contract.sourceEpoch.sourceRawInputs)
      || !data || !inventory || objectHash(data) !== objectHash(inputs.data)
      || objectHash(inventory) !== objectHash(inputs.inventory)) fail('passed data/inventory do not equal actual current-MM source bytes');
  const mechanics = inputs.mechanics;
  const joMechanics = mechanics.records?.find(row => row.collection === 'equipment' && row.id === contract.retainedJoTarget.itemId);
  if (!joMechanics || objectHash(joMechanics) !== contract.retainedJoTarget.mechanicsRecordSha256
      || joMechanics.fields?.find(row => row.path === '/price')?.status !== 'not-extracted'
      || joMechanics.fields?.find(row => row.path === '/price')?.value !== null
      || joMechanics.fields?.find(row => row.path === '/price')?.inspected !== false) fail('Jo current mechanics record or still-unextracted price state changed');
  const index = readJson(currentRoot, 'research/monetary-source-inventory.json');
  assertNativeCurrentMonetaryIndexDependencies(currentRoot, index);
  const legacyRef = contract.historicalEvidence.legacyJoRegistration;
  const legacyBytes = readBytes(currentRoot, legacyRef.path);
  if (sha256(legacyBytes) !== legacyRef.sha256) fail('historical Jo registration bytes changed');
  const registration = JSON.parse(legacyBytes.toString('utf8'));
  const bindHistorical = ref => {
    const bytes = readBytes(currentRoot, ref.path);
    if (sha256(bytes) !== ref.sha256) fail(`stale historical Jo evidence ${ref.path}`);
    return bytes;
  };
  const beforeCompressed = bindHistorical(registration.beforeEquipment);
  const beforeBytes = gunzipSync(beforeCompressed);
  if (sha256(beforeBytes) !== registration.beforeEquipment.uncompressedSha256) fail('historical Jo before-equipment bytes changed');
  const beforeEquipment = JSON.parse(beforeBytes.toString('utf8'));
  const historicalReceipt = JSON.parse(bindHistorical(registration.historicalFourNoteReceipt).toString('utf8'));
  const sourceProofs = (registration.sourceProofs || []).map(ref => {
    bindHistorical(ref);
    return {path: ref.path, sha256: ref.sha256};
  });
  const currentEquipment = readJson(currentRoot, 'equipment.json');
  const core = validateJoUnextractedPriceRegistration({registration, beforeEquipment, currentEquipment, historicalReceipt, data, inventory});
  if (core.itemId !== contract.retainedJoTarget.itemId || core.recordSha256 !== contract.retainedJoTarget.equipmentPayloadRecordSha256
      || core.sourceAbsence !== false || core.valueReviewed !== false) fail('inherited Jo semantic core changed its exact target or pending grade');
  const claim = inventory.siteClaims?.[191];
  if (!claim || claim.itemId !== contract.retainedJoTarget.itemId
      || objectHash(claim) !== contract.retainedJoTarget.priceInventoryClaim.recordSha256) fail('exact Jo canonical price claim record changed');
  const refs = [
    {path: joCurrentMmContractPath, sha256: joCurrentMmContractSha256},
    {path: contract.sourceEpoch.cohortFixture.path, sha256: contract.sourceEpoch.cohortFixture.sha256},
    ...Object.entries(inputs.rawInputs).map(([refPath, sha256Value]) => ({path: refPath, sha256: sha256Value})),
    {path: 'research/monetary-source-inventory.json', sha256: sha256(readBytes(currentRoot, 'research/monetary-source-inventory.json'))},
    {path: legacyRef.path, sha256: legacyRef.sha256},
    {path: registration.beforeEquipment.path, sha256: registration.beforeEquipment.sha256},
    {path: registration.historicalFourNoteReceipt.path, sha256: registration.historicalFourNoteReceipt.sha256},
    ...sourceProofs,
    ...core.inputRefs || [],
  ];
  const inputRefs = [...new Map(refs.map(ref => [ref.path, ref])).values()].sort((a,b) => a.path.localeCompare(b.path));
  return {
    ...core,
    registryRef: {path: joCurrentMmContractPath, sha256: joCurrentMmContractSha256},
    inputRefs,
    currentSourceEpoch: {sourceCommit: summary.sourceCommit, sourceTree: summary.sourceTree, cohortSummary: summary},
    payloadProof: {
      path: joCurrentMmContractPath,
      sha256: joCurrentMmContractSha256,
      joDataRecordSha256: contract.retainedJoTarget.dataRecordSha256,
      joEquipmentRecordSha256: contract.retainedJoTarget.equipmentPayloadRecordSha256,
      joMechanicsRecordSha256: contract.retainedJoTarget.mechanicsRecordSha256,
      sourcePriceAbsenceReviewed: false,
      extractedPriceReviewed: false,
      semanticPass: false,
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {inputs, summary} = assertCurrentMmSourceEpoch(root);
  const result = loadJoCurrentSuccessor({repoRoot: root, data: inputs.data, inventory: inputs.inventory});
  process.stdout.write(`${JSON.stringify({status: 'current-MM-Jo-gap-preserved', sourceCommit: summary.sourceCommit, sourceTree: summary.sourceTree, itemId: result.itemId, priceState: 'unextracted', price: null, sourceAbsenceReviewed: false, valueReviewed: false, inputRefs: result.inputRefs.length})}\n`);
}
