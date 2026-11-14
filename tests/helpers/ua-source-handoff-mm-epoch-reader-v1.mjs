// Proposed finite callback transport for the current-MM UA handoff test.
// Source-body inputs are read at M1. Post-source transition metadata is read
// from its exact direct-child commit and checked against the immutable A29
// replay mirror consumed by the frozen adapter. No physical-file fallback.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {assertCurrentMmSourceEpoch} from './class-mapping-historical-mm-test-inputs-v1.mjs';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import * as historicalFs from '../../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';

const SOURCE_COMMIT = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
const SOURCE_TREE = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
const S1_COMMIT = '2d35138027f00c0740975e519dbb3a2b6df76d14';
const S1_TREE = '40ecb15130b339658522794db6d9e1bc58f43b50';
const REPLAY_COMMIT = 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2';
const METADATA_COMMIT = 'ac60970626fd5e0421fc4b99c141cc11f53ffff3';
const METADATA_TREE = '617b73d3d6db32d9406309dececcaa2eeb708568';
const TRANSITION_PATH = 'research/mm-current-cli-successors-v1/source-body-handoff-transition-mm-v1.json';
const TRANSITION_SHA256 = '66d18297f999a12b76c47e0a66e2758be902a6d4eb1d65d5031d7a97e93a1be7';
const COHORT_PATH = 'tests/fixtures/mm-treasure-current-m1-cohort-v1.json';
const COHORT_SHA256 = '7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550';
const HANDOFF_PATH = 'research/gaps-limitations-next-task.json';
const HANDOFF_SHA256 = 'e8a634f9d46ed09e6b7555dfe1ecdaf4ca3edec73681f84c5a7a6248bffbbb70';
const H_RECEIPT_PATH = 'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json';
const H_RECEIPT_SHA256 = '644992717168c73584a4d30084237aa253fcc5f9143b288a41f1ca6ba8bc4575';
const EXPECTED_EVIDENCE = Object.freeze([
  {path: COHORT_PATH, sha256: COHORT_SHA256},
  {path: 'research/mechanics-audit-progress.json', sha256: '02de76c6c9ec73b639ea3d06c2d75105ca9abd463cebd0570d6be1af784aeced'},
  {path: 'research/source-audit-batch5-conflict-integration.json', sha256: '365581fbce32f52dd6c370c3ce32b20605ed02e6a58b33e555135385622eccfd'},
  {path: H_RECEIPT_PATH, sha256: H_RECEIPT_SHA256},
]);
const M1_CONTEXT = Object.freeze([
  {path: HANDOFF_PATH, sha256: HANDOFF_SHA256, role: 'historical-MM current handoff', transport: 'M1'},
  {path: 'research/source-audit-batch5-conflict-integration.json', sha256: '365581fbce32f52dd6c370c3ce32b20605ed02e6a58b33e555135385622eccfd', role: 'M1 conflict receipt', transport: 'A29'},
  {path: 'research/source-audit-batch5-unextracted.json', sha256: 'a32669c74e35c84df7d902a2671308b4551c9c783b1b025550dbf4ac9c46c5de', role: 'M1 animal receipt', transport: 'A29'},
  {path: 'research/source-audit-batch5-class-retired-ledger.json', sha256: '0ac5848b89af3bf4683c0f346f49c23fb6d64c4eb32080d4488d27c9c1f8ee47', role: 'M1 class-retirement receipt', transport: 'A29'},
  {path: H_RECEIPT_PATH, sha256: H_RECEIPT_SHA256, role: 'prior H transition receipt', transport: 'A29'},
]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid UA handoff callback epoch: ${message}`); };

function sameBytes(left, right, label) {
  if (!Buffer.from(left).equals(Buffer.from(right))) fail(`transport mirror differs: ${label}`);
}

export function createUaSourceHandoffMmEpochCallbacks(inputRoot) {
  const root = historicalFs.historicalMmTestRoot;
  if (inputRoot !== undefined && realpathSync(resolve(inputRoot)) !== root) {
    fail('fixed current-MM test root required');
  }

  const gate = assertCurrentMmSourceEpoch(root);
  const {inputs, summary, currentS1Identity} = gate;
  if (summary.sourceCommit !== SOURCE_COMMIT || summary.sourceTree !== SOURCE_TREE
      || currentS1Identity?.stage !== 's1-body-native'
      || currentS1Identity?.sourceCommit !== S1_COMMIT || currentS1Identity?.sourceTree !== S1_TREE) {
    fail('M1 source epoch and independently qualified S1 identity required');
  }

  const rawGit = createRawGitReader(root);
  historicalFs.assertHistoricalMmTestStage();
  if (rawGit.git('rev-parse', `${REPLAY_COMMIT}^{tree}`).toString('utf8').trim() !== 'da1c64ea25f178a1155a79c4692964e9b17dd645'
      || rawGit.git('rev-parse', `${METADATA_COMMIT}^{tree}`).toString('utf8').trim() !== METADATA_TREE) {
    fail('fixed A29 replay and post-source metadata trees required');
  }
  const metadataParents = rawGit.git('rev-list', '--parents', '-n', '1', METADATA_COMMIT).toString('utf8').trim().split(/\s+/);
  if (!isDeepStrictEqual(metadataParents, [METADATA_COMMIT, SOURCE_COMMIT])) fail('post-source metadata must be a direct child of M1');

  const rows = new Map();
  function register(path, originCommit, expectedSha256, transportCommit, role) {
    if (typeof path !== 'string' || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..')) {
      fail(`unsafe fixed path: ${path}`);
    }
    const origin = rawGit.git('show', `${originCommit}:${path}`);
    if (sha256(origin) !== expectedSha256) fail(`origin bytes changed: ${path}`);
    const transport = transportCommit === 'A29'
      ? Buffer.from(historicalFs.readFileSync(resolve(root, path)))
      : Buffer.from(origin);
    if (sha256(transport) !== expectedSha256) fail(`transport bytes changed: ${path}`);
    sameBytes(origin, transport, path);
    const previous = rows.get(path);
    if (previous && (!previous.bytes.equals(transport) || previous.sha256 !== expectedSha256)) {
      fail(`ambiguous fixed path role: ${path}`);
    }
    rows.set(path, {bytes: Buffer.from(transport), sha256: expectedSha256, role, originCommit, transportCommit});
  }
  const currentInputs = {...inputs.rawInputs, ...inputs.additionalInputs};
  if (Object.keys(currentInputs).length !== 21 || Object.keys(inputs.rawInputs).length + Object.keys(inputs.additionalInputs).length !== 21) {
    fail('exact 21-input M1 cohort required');
  }
  for (const [path, expectedSha256] of Object.entries(currentInputs)) {
    register(path, SOURCE_COMMIT, expectedSha256, 'A29', 'M1 source input mirrored by A29');
  }
  for (const row of M1_CONTEXT) {
    register(row.path, SOURCE_COMMIT, row.sha256, row.transport, row.role);
  }

  const metadataBytes = rawGit.git('show', `${METADATA_COMMIT}:${TRANSITION_PATH}`);
  const cohortBytes = rawGit.git('show', `${METADATA_COMMIT}:${COHORT_PATH}`);
  if (sha256(metadataBytes) !== TRANSITION_SHA256 || sha256(cohortBytes) !== COHORT_SHA256) {
    fail('fixed post-source transition receipt or cohort fixture changed');
  }
  const metadataReceipt = JSON.parse(metadataBytes.toString('utf8'));
  if (!isDeepStrictEqual(metadataReceipt.evidence, EXPECTED_EVIDENCE)
      || !isDeepStrictEqual(metadataReceipt.sourceEpoch.contract, {path: COHORT_PATH, sha256: COHORT_SHA256})) {
    fail('finite post-source evidence roles changed');
  }
  register(TRANSITION_PATH, METADATA_COMMIT, TRANSITION_SHA256, 'A29', 'current-MM transition metadata');
  register(COHORT_PATH, METADATA_COMMIT, COHORT_SHA256, 'A29', 'current-MM cohort metadata');

  const readBytes = path => {
    const row = rows.get(path);
    if (!row) fail(`path is outside exact M1/A29 callback roles: ${path}`);
    return Buffer.from(row.bytes);
  };
  const readJson = path => {
    const bytes = readBytes(path);
    try { return JSON.parse(bytes.toString('utf8')); }
    catch (error) { fail(`invalid JSON at fixed callback path ${path}: ${error.message}`); }
  };
  const hashFile = path => sha256(readBytes(path));
  return Object.freeze({
    inputs,
    summary,
    currentS1Identity,
    readBytes,
    readJson,
    hashFile,
    sourceEpoch: Object.freeze({
      sourceCommit: SOURCE_COMMIT,
      sourceTree: SOURCE_TREE,
      replayCommit: REPLAY_COMMIT,
      metadataCommit: METADATA_COMMIT,
      metadataTree: METADATA_TREE,
      registeredPathCount: rows.size,
      m1SourceInputCount: Object.keys(currentInputs).length,
    }),
  });
}
