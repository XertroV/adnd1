// Source2-aware historical reader. It retains the fixed S1/MM/H/V29 roles
// and exposes a separate genuine zero-argument Source2 current identity.
// Shared historical policy, projection kernel, and installation pins remain
// sourced from epoch-v1; those historical roles are not relabeled as Source2.
import {readFileSync, realpathSync, lstatSync} from 'node:fs';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {parseBytes} from '../../tools/class-mapping-native-contract-v1.mjs';
import {HISTORICAL_AUTHORED_READ_PATHS,declaredHistoricalInputClosure,reportInputReferences,reportAbsentInputPaths,assertReportAbsenceClosure,assertTypedFreshnessOverlap,assertNativeEpochIdentity} from '../class-mapping-source-epoch-v1/historical-reader-auxiliary-policy-v1.mjs';
import {HISTORICAL_CODE_ROOTS,HISTORICAL_FIXED_DATA_PATHS,assertExactHistoricalCodeClosure} from '../class-mapping-source-epoch-v1/historical-reader-code-roots-v1.mjs';
import {historicalReaderInstallationPins as installPins} from '../class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs';
import {createHash} from 'node:crypto';
import {isAbsolute, relative, resolve, sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {createHistoricalProjectionKernel, assertPlainJson, copyRawBytes, objectSha256, LEGACY_FACADE_LITERAL_STATES} from '../class-mapping-source-epoch-v1/historical-projection-kernel-v2.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const BRIDGE_PATH = 'research/class-mapping-source-epoch-v1/class-mapping-historical-bridge-v1.json';
// The bridge digest is pinned externally in the epoch-v1 installation pins.
// Keeping it outside the bridge avoids a recursive self-digest.
const EXPECTED_BRIDGE_SHA256 = installPins.bridgeSha256;
const INSTALL_PINS_PATH = 'research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs';
const SOURCE2_COMPANION_PATH = 'research/class-mapping-source-epoch-v2/historical-reader-source2-companion-v1.json';
const EXPECTED_SOURCE2_COMPANION_SHA256 = '075888aae1bec7fac6475e12593ab954cc915c911b1ac00a936629ba54955416';
const SOURCE2_IDENTITY = Object.freeze({stage:'source2-body-native',sourceCommit:'400f6e9d123d8a654b9b9af48133a2533506e73d',sourceTree:'664c02504efcece25669d2f9c3fdb26437cd5b09',fixturePath:'research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json',fixtureSha256:'a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2',sourceBodyRows:3063});
const HISTORICAL_P_APP_ROLE=Object.freeze({path:'dist/app.js',commit:'0e4cddd40b6ab78a9fe182fa967f0bd43b36070d',tree:'53b3cbe61d77ba16f460fc398f02fb133a3dd899',sha256:'876df077e57041e77732ea56cc47123dc1f459ba6badac0ce98d3254345106d6',sizeBytes:197475});
const SOURCE2_COMPATIBILITY_CODE = Object.freeze([
  {path:'research/class-mapping-history-v1/replay-tools/continuation-candidates-validate-mm-v2.mjs',sha256:'6bf41296b428080816c4eeab1e553e6eab21f7ce0222b513035c42605a97b536',sizeBytes:40618},
  {path:'research/class-mapping-history-v1/replay-tools/dmg175-current-jo-source-gap-mm-v2.mjs',sha256:'6b936625d7eff8ae2c65891caa83cba7d2c77daa28b48d88841d251cdbe1cf41',sizeBytes:7562},
  {path:'research/class-mapping-history-v1/replay-tools/dmg175-current-monetary-source-questions-mm-v2.mjs',sha256:'3b992d9af7c3dece4d6e7d7494584b61e3ade0045a3eacf284ac1e2e766132aa',sizeBytes:3117},
  {path:'research/class-mapping-history-v1/replay-tools/refresh-gaps-handoff-mm-v2.mjs',sha256:'990290e73ec19aaedd1ed4563d574306e2cfc77363c1a26d40c464ab29a71608',sizeBytes:86963},
  {path:'research/class-mapping-history-v1/replay-tools/ua26-note-marker-audit-mm-s1-v1.mjs',sha256:'a87ac338c9bd931161b481ff04e37fbc0a1ddddf85395f349d238ff0134f8a45',sizeBytes:9010},
  {path:'research/source_frame_coordinate_bridge.py',sha256:'4ae397c11a6d5a0ed91da2653da815ed5cee7225f9d018641e8a19c4f01d4c80',sizeBytes:20643},
  {path:'tools/continuation-candidates.py',sha256:'9255716a1f5dd30b55b02151f8cd4b56083f3094063f1870829e82d52de96ad5',sizeBytes:95558},
]);
const EXPECTED_H_CONTRACT_SHA256 = '3a4f78b7c2fb26a3384b4acb705fa645ec6ae7c0547544f28744d624cb7c3b93';
const FAIL_PREFIX = 'Invalid class-mapping historical reader: ';
const fail = message => { throw new Error(FAIL_PREFIX + message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  : JSON.stringify(value);
const commitId = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const NATIVE_GROUPS=['sourceBody','qualificationMetadata','protectedHistorical','installedCode'];

function safeRepoPath(path) {
  if (typeof path !== 'string') fail('expected a string repository path');
  if (!path || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe repository path');
  return path;
}

function readEncoding(options) {
  if (options === undefined) return undefined;
  if (typeof options === 'string') return options;
  if (types.isProxy(options) || !options || typeof options !== 'object'
      || Object.getPrototypeOf(options) !== Object.prototype) fail('reader options must be a string or plain options object');
  const keys = Reflect.ownKeys(options);
  if (keys.some(key => key !== 'encoding')) fail('reader options only accept an own data encoding property');
  if (!keys.length) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(options, 'encoding');
  if (!descriptor || typeof descriptor.value !== 'string' || !descriptor.enumerable
      || !descriptor.writable || !descriptor.configurable) fail('reader encoding must be an own enumerable data string');
  return descriptor.value;
}

function checkDigestRow(row, label, {commit = false} = {}) {
  if (!row || typeof row !== 'object' || !digest(row.sha256) || !integer(row.sizeBytes)
      || (commit && !commitId(row.commit))) fail(label + ': closed hash/size/commit pin required');
}

function detachedFrozenJson(value, label) {
  assertPlainJson(value, label);
  const copy = structuredClone(value);
  function freezeTree(node) {
    if (node === null || typeof node !== 'object' || Object.isFrozen(node)) return node;
    for (const key of Object.keys(node)) freezeTree(node[key]);
    return Object.freeze(node);
  }
  return freezeTree(copy);
}

// Only the internally qualified proof reaches this projection. Its data may
// already be deeply frozen; caller JSON still uses the unchanged strict guard.
function assertBridgeReady(bridge, bridgeBytes) {
  if (installPins.materialized !== true || !digest(EXPECTED_BRIDGE_SHA256)) fail('final bridge digest is not installed; S1/S2 reader pins remain pending');
  if (hash(bridgeBytes) !== EXPECTED_BRIDGE_SHA256) fail('final bridge bytes changed');
  if (bridge.schemaVersion !== 2 || bridge.artifactType !== 'Closed class-mapping S1-to-MM-to-H-to-V29 historical transport') {
    fail('closed bridge schema identity');
  }
  if (canonical(bridge.legacyFacadeLiteralExceptions) !== canonical(LEGACY_FACADE_LITERAL_STATES)) fail('path-specific legacy facade literal states changed');
  const native = bridge.nativeSourceEpoch;
  if (native?.status !== 'qualified-S1-and-antecedent-S2-closed'
      || !commitId(native.sourceCommit) || !commitId(native.sourceTree)
      || !commitId(native.parentCommit) || !commitId(native.parentTree)
      || !commitId(native.qualifierCodeCommit) || !commitId(native.qualifierCodeTree)
      || !commitId(native.finalS2Commit) || !commitId(native.finalS2Tree)
      || !digest(native.fixtureSha256) || !digest(native.guardSha256)
      || !digest(native.factorySha256) || !digest(native.loaderSha256)
      || typeof native.fixturePath !== 'string') fail('native S1/S2 source, tree, fixture, and code pins are not installed');
  if (native.finalS2Role!=='actual post-S2 public-coverage and H-code freshness antecedent; verified report P is separately pinned') fail('explicit report P versus freshness-antecedent role required');
  if (bridge.exact22Rows?.length !== 22 || bridge.hContractRows?.length !== 22) fail('exact 22-path historical bridge required');
  checkDigestRow(bridge.historicalEpochs?.historicalH?.fixture, 'historical H fixture');
  const seen = new Set();
  for (const row of bridge.exact22Rows) {
    safeRepoPath(row.path);
    if (seen.has(row.path)) fail('duplicate mapped path');
    seen.add(row.path);
    if (row.nextCurrent?.status !== 'closed-antecedent-physical-state') fail(row.path + ': next-current mapped path pin is unset');
    checkDigestRow(row.nextCurrent, row.path + ' next-current path', {commit: true});
    if (!commitId(row.nextCurrent.tree) || row.nextCurrent.commit !== native.finalS2Commit
        || row.nextCurrent.tree !== native.finalS2Tree || (row.json && !digest(row.nextCurrent.objectSha256))) {
      fail(row.path + ': mapped next-current commit/tree/object pin mismatch');
    }
    for (const stage of ['currentMm', 'historicalH', 'version29Baseline']) {
      checkDigestRow(row[stage], row.path + ' ' + stage);
      if (row.json && !digest(row[stage].objectSha256)) fail(row.path + ': parsed-object state hash missing for ' + stage);
    }
  }
  if (!Array.isArray(bridge.nextFreshnessInputs?.absentRows)) fail('explicit report optional-absence rows required');
  if (bridge.nextFreshnessInputs?.status !== 'closed-S2-input-closure-reviewed'
      || !Array.isArray(bridge.nextFreshnessInputs.rows) || bridge.nextFreshnessInputs.rows.length < 22) {
    fail('expanded per-call native/source/code/asset freshness closure is not installed');
  }
  const inputPaths = new Set();
  for (const row of bridge.nextFreshnessInputs.rows) {
    safeRepoPath(row.path); checkDigestRow(row, row.path + ' freshness input', {commit: true});
    if (!['sourceBody', 'qualificationMetadata', 'protectedHistorical', 'installedCode','nativeInstallation','historicalMapped','metadataReport','historicalAuxiliary'].includes(row.group)) fail(row.path + ': typed freshness group required');
    if (inputPaths.has(row.path)) fail('duplicate freshness input path');
    inputPaths.add(row.path);
  }
  const freshnessByPath = new Map(bridge.nextFreshnessInputs.rows.map(row => [row.path, row]));
  if(!bridge.nativeInputHashes || canonical(Object.keys(bridge.nativeInputHashes).sort())!==canonical([...NATIVE_GROUPS].sort()))fail('exact four native hash-map groups required');
  for(const group of NATIVE_GROUPS){const expected=bridge.nativeInputHashes[group];if(!expected||Array.isArray(expected)||!Object.keys(expected).length)fail('nonempty native input map '+group);for(const [path,digest_]of Object.entries(expected)){safeRepoPath(path);if(!digest(digest_))fail('native exact input digest');}const represented=Object.fromEntries(bridge.nextFreshnessInputs.rows.filter(row=>row.group===group).map(row=>[row.path,row.sha256]));if(canonical(represented)!==canonical(expected))fail('full native source/code/metadata map differs from typed freshness rows');}

  for (const row of bridge.exact22Rows) {
    const current = freshnessByPath.get(row.path);
    if (!current || current.sha256 !== row.nextCurrent.sha256 || current.sizeBytes !== row.nextCurrent.sizeBytes
        || current.commit !== row.nextCurrent.commit) fail(row.path + ': mapped and expanded freshness pins disagree');
  }
  if (!inputPaths.has('dist/data.json') || !inputPaths.has('research/price-source-inventory.json')
      || !inputPaths.has('research/field-evidence-bindings.json') || !inputPaths.has('research/mechanics-audit-progress.json')) {
    fail('native body snapshot files are absent from freshness closure');
  }
  for (const path of [native.fixturePath, native.guardPath, native.factoryPath, native.loaderPath]) {
    if (!inputPaths.has(path)) fail(path + ': native fixture/guard/factory/loader must be part of the freshness closure');
  }
  if (bridge.runtimeCodePins?.status !== 'closed-S2-code-commit-reviewed'
      || !Array.isArray(bridge.runtimeCodePins.rows) || !bridge.runtimeCodePins.rows.length) {
    fail('native gate/factory/loader/bridge dependencies are not code-pinned');
  }
  for (const row of bridge.runtimeCodePins.rows) { safeRepoPath(row.path); checkDigestRow(row, row.path + ' code', {commit: true}); }
  const codeByPath = new Map(bridge.runtimeCodePins.rows.map(row => [row.path, row]));
  for (const [path, sha] of [[native.guardPath, native.guardSha256], [native.factoryPath, native.factorySha256], [native.loaderPath, native.loaderSha256]]) {
    if (codeByPath.get(path)?.sha256 !== sha || codeByPath.get(path)?.commit !== native.qualifierCodeCommit) fail(path + ': native runtime code pin disagrees with source epoch');
  }
  const fixturePin = freshnessByPath.get(native.fixturePath);
  if (fixturePin?.sha256 !== native.fixtureSha256) fail('native fixture pin disagrees with expanded freshness closure');
  for (const group of ['sourceBody', 'qualificationMetadata', 'protectedHistorical', 'installedCode']) {
    if (!bridge.nextFreshnessInputs.rows.some(row => row.group === group)) fail('missing typed freshness group ' + group);
  }
}

function assertSource2CompanionReady(companion, bytes, bridge, bridgeBytes) {
  if (hash(bytes) !== EXPECTED_SOURCE2_COMPANION_SHA256) fail('Source2 companion bytes changed');
  if (companion.schemaVersion !== 1 || companion.artifactType !== 'Source2-qualified current reader companion for immutable historical bridge') fail('Source2 reader companion schema');
  const old = companion.historicalBridge;
  if (old?.path !== BRIDGE_PATH || old.sha256 !== EXPECTED_BRIDGE_SHA256
      || old.bridgeCommit !== installPins.bridgeCommit || old.bridgeTree !== installPins.bridgeTree
      || old.historicalS1SourceCommit !== bridge.nativeSourceEpoch.sourceCommit
      || old.historicalS1SourceTree !== bridge.nativeSourceEpoch.sourceTree
      || old.oldBridgeEndpointS2Commit !== bridge.nativeSourceEpoch.finalS2Commit
      || old.oldBridgeEndpointS2Tree !== bridge.nativeSourceEpoch.finalS2Tree
      || old.mapped22Rows !== 22 || old.nextFreshnessRows !== 3004) fail('immutable historical bridge identity in Source2 companion');
  const s2 = companion.currentSource2;
  if (s2?.stage !== SOURCE2_IDENTITY.stage || s2.sourceCommit !== SOURCE2_IDENTITY.sourceCommit
      || s2.sourceTree !== SOURCE2_IDENTITY.sourceTree || s2.fixture?.path !== SOURCE2_IDENTITY.fixturePath
      || s2.fixture?.sha256 !== SOURCE2_IDENTITY.fixtureSha256 || s2.fixture?.sizeBytes !== 1111074
      || s2.sourceBodyRows !== SOURCE2_IDENTITY.sourceBodyRows
      || s2.qualifierApi !== 'assertClassMappingCurrentSourceIdentity() from tests/helpers/class-mapping-current-cohort-v2.mjs; call with zero args') fail('exact zero-argument Source2 identity contract required');
  const overrides = companion.currentPhysicalOverrides;
  if (!Array.isArray(overrides) || overrides.length !== 2) fail('exactly two separately typed current physical overrides required');
  const app = overrides.find(row => row.path === 'dist/app.js');
  const coverage = overrides.find(row => row.path === 'dist/coverage-gaps.json');
  if (app?.sha256 !== '57eae6b440f2b75294ca6021adbcd9e29a43646a7a6177cc6800973b94f0b8c1'
      || app.sizeBytes !== 197876 || app.authority !== 'currentSource2.sourceInputs sourceBody map; must be revalidated by the actual zero-argument gate'
      || coverage?.sha256 !== '84ac2248c41c49db8d34725725806d94492c61af5256b903c20ba2d4b767b263'
      || coverage.sizeBytes !== 179737 || coverage.commit !== '343ab90610a224786b4ce64c3e9e2ba928a3d6c8'
      || coverage.tree !== 'af9f440cd871dc4285c2660149de39da87385b26'
      || coverage.authority !== 'exact current-coverage-gaps-snapshot row in raw O metadata-stage-v3, with internal bytes and current physical/internal/dist alias equality; frozen T blob is an additional alias check') fail('fixed app sourceBody and O-authenticated coverage output pins required');
  if (overrides.some(row => !['dist/app.js','dist/coverage-gaps.json'].includes(row.path))) fail('unclassified current physical override');
  const coverageSource = companion.currentCoverageOutput;
  const expectedCoverageOutput = {format:'json',kind:'current-coverage-gaps-snapshot',parsedObjectSha256:'13b270ebdca1af822bf85aae11e99a88af7ea9c1a0b00a64fb6b7f3627fff7fa',path:'research/class-mapping-source-epoch-v2/reports/next-native-v3/current/coverage-gaps.json',producerPath:'tools/coverage-gaps-class-mapping-v2.mjs',rawSha256:'84ac2248c41c49db8d34725725806d94492c61af5256b903c20ba2d4b767b263',sizeBytes:179737,stage:'post-QCC-metadata'};
  if (coverageSource?.metadataReceipt?.commit !== '9664548c18a09492bef2565edf2b3038a35592ef'
      || coverageSource.metadataReceipt.tree !== '915761577a5e56abcb07f39f01939be306dd9e44'
      || coverageSource.metadataReceipt.path !== 'research/class-mapping-source-epoch-v2/metadata-stage-v3.json'
      || coverageSource.metadataReceipt.sha256 !== '67ea87e735328b630324458937eb019a2973c6b390b429fb2c76a62f718af606'
      || coverageSource.metadataReceipt.sizeBytes !== 1442910
      || coverageSource.metadataReceipt.directParent !== '295f865d214e766df20a9ac925210810857d9a8e'
      || coverageSource.metadataReceipt.directParentTree !== 'd55a0ae5129d0dfe94dd1a836a0b58233296b3bd'
      || coverageSource.sourceBody?.stage !== SOURCE2_IDENTITY.stage || coverageSource.sourceBody.commit !== SOURCE2_IDENTITY.sourceCommit
      || coverageSource.sourceBody.tree !== SOURCE2_IDENTITY.sourceTree
      || coverageSource.sourceBody.directParent !== '6502b19620e092ced9f3e233f2dc3d5ffc8bd3ec'
      || coverageSource.sourceBody.directParentTree !== '2d64093489afd63223ccc94c07446d03fa80f72e'
      || coverageSource.qualifierProducer?.stage !== 'Native2 report QCC M'
      || coverageSource.qualifierProducer.commit !== '93386845e8492a3b064bdc74c794f676b667594b'
      || coverageSource.qualifierProducer.tree !== '2a9639694d817b02a7be762a275507e159a96d06'
      || coverageSource.qualifierProducer.directParent !== '06d5278d28bc346ca9b7bca11622d6c8b4ec5a5a'
      || coverageSource.qualifierProducer.directParentTree !== '3d9f4953dfd8a62674e81cefdec89cf1cc2320f9'
      || canonical(coverageSource.outputRow) !== canonical(expectedCoverageOutput)
      || coverageSource.producerCode?.path !== expectedCoverageOutput.producerPath
      || coverageSource.producerCode.commit !== coverageSource.qualifierProducer.commit
      || coverageSource.producerCode.tree !== coverageSource.qualifierProducer.tree
      || coverageSource.producerCode.sha256 !== '510c1dc56ac7f54216b369c1ee4d2e9e62147af0ccddbadaac597c3ffbfd02ec'
      || coverageSource.producerCode.sizeBytes !== 64185
      || coverageSource.publishedAlias?.commit !== coverage.commit || coverageSource.publishedAlias.tree !== coverage.tree
      || coverageSource.publishedAlias.path !== coverage.path || coverageSource.publishedAlias.sha256 !== coverage.sha256
      || coverageSource.publishedAlias.sizeBytes !== coverage.sizeBytes) fail('exact O metadata receipt, producer, output row, and T alias contract required');
  const search = companion.historicalSearchRole;
  if (search?.path !== 'dist/search.js' || search.historicalA29Commit !== 'a29d72d5147c497addd9e46f54ea3f8222f6e9c2'
      || search.historicalS1Commit !== bridge.nativeSourceEpoch.sourceCommit
      || search.historicalS1Tree !== bridge.nativeSourceEpoch.sourceTree
      || search.source2Sha256 !== 'b9de11c725edbffaf069282a48930052a78b238e925c8acdb6c8db97b764052f'
      || search.source2Bytes !== 11218) fail('three distinct historical and Source2 search roles required');
  const code = companion.compatibilityCodePredecessorAuthority;
  if (code?.commit !== SOURCE2_IDENTITY.sourceCommit || code.tree !== SOURCE2_IDENTITY.sourceTree
      || !Array.isArray(code.paths) || code.paths.length !== SOURCE2_COMPATIBILITY_CODE.length) fail('separate compatibility-code predecessor authority required');
  for (const pin of SOURCE2_COMPATIBILITY_CODE) {
    const row = code.paths.find(candidate => candidate.path === pin.path);
    if (!row || row.authorityCommit !== SOURCE2_IDENTITY.sourceCommit || row.authorityTree !== SOURCE2_IDENTITY.sourceTree
        || row.sha256 !== pin.sha256 || row.sizeBytes !== pin.sizeBytes
        || !String(row.role).includes('not Source2 body/installedCode/F1/104')) fail(pin.path + ': compatibility code must remain separately typed from F1/104');
  }
  return {app, coverage, bytes: Buffer.from(bytes)};
}

async function createClosedReader() {
  if(installPins.materialized!==true || installPins.bridgePath!==BRIDGE_PATH || !digest(installPins.bridgeSha256) || !commitId(installPins.bridgeCommit) || !commitId(installPins.bridgeTree) || !commitId(installPins.codeCommit) || !commitId(installPins.codeTree)) fail('historical installation is unmaterialized; real antecedent bridge/code pins required');
  let root;
  try { root = realpathSync(ROOT); }
  catch { fail('fixed source repository root is unavailable'); }
  if (root !== ROOT) fail('fixed source repository root identity changed');
  function readClosedFile(path, label = path) {
    const absolute = resolve(root, safeRepoPath(path));
    let stat;
    try { stat = lstatSync(absolute); } catch { fail(label + ': pinned physical file is missing'); }
    if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(absolute) !== absolute) fail(label + ': pinned path must be a regular non-symlink file');
    return readFileSync(absolute);
  }
  const loadedInstallPinsSha256=hash(readClosedFile(INSTALL_PINS_PATH));
  const bridgeBytes = readClosedFile(BRIDGE_PATH, 'historical bridge');
  let bridge;
  try { bridge = parseBytes(bridgeBytes,'historical bridge'); }
  catch { fail('historical bridge JSON is invalid'); }
  assertPlainJson(bridge, 'historical bridge');
  assertBridgeReady(bridge, bridgeBytes);
  const companionBytes = readClosedFile(SOURCE2_COMPANION_PATH, 'Source2 reader companion');
  let companion;
  try { companion = parseBytes(companionBytes, 'Source2 reader companion'); } catch { fail('Source2 reader companion JSON is invalid'); }
  assertPlainJson(companion, 'Source2 reader companion');
  const source2Authorities = assertSource2CompanionReady(companion, companionBytes, bridge, bridgeBytes);
  if (hash(readClosedFile(bridge.historicalEpochs.historicalH.contractPath)) !== EXPECTED_H_CONTRACT_SHA256) {
    fail('preserved H/V29 contract bytes changed');
  }

  // Source2 current qualification has its own API and stage name. This import
  // is intentionally separate from every frozen S1/MM/H/V29 preimage source.
  const {assertClassMappingCurrentSourceIdentity: assertSource2} = await import('../../tests/helpers/class-mapping-current-cohort-v2.mjs');
  const rawGit=createRawGitReader(root),git=(...args)=>rawGit.git(...args);
  rawGit.assertView();
  const codeRows=Object.entries(installPins.codePins).map(([path,pin])=>({path:safeRepoPath(path),...pin}));
  for(const required of [...HISTORICAL_CODE_ROOTS,...HISTORICAL_FIXED_DATA_PATHS,'tools/class-mapping-raw-git-v1.mjs'])if(!codeRows.some(row=>row.path===required))fail('historical installed code closure missing '+required);
  if(codeRows.some(row=>row.path===INSTALL_PINS_PATH))fail('historical install pin module cannot hash itself');
  for(const row of codeRows)checkDigestRow(row,row.path+' historical installation code');
  let codeGitQualified=false;
  let auxiliaryPolicyChecked=false;
  let source2CoverageAuthority=null;
  const auxiliarySources=new Map((bridge.auxiliarySourcePreimages||[]).map(row=>[row.path,row]));
  const freshByPath=new Map(bridge.nextFreshnessInputs.rows.map(row=>[row.path,row]));
  function installationFreshness(){
    rawGit.assertView();
    const head=git('rev-parse','--verify','HEAD^{commit}').toString('utf8').trim();
    if(!commitId(head)||hash(readClosedFile(INSTALL_PINS_PATH))!==loadedInstallPinsSha256||!git('show',`${head}:${INSTALL_PINS_PATH}`).equals(readClosedFile(INSTALL_PINS_PATH)))fail('historical installation pin module differs from its loaded/raw HEAD bytes');
    if(!git('show',`${head}:${SOURCE2_COMPANION_PATH}`).equals(source2Authorities.bytes))fail('Source2 companion differs from its exact raw HEAD blob');
    if(git('rev-parse',`${SOURCE2_IDENTITY.sourceCommit}^{tree}`).toString('utf8').trim()!==SOURCE2_IDENTITY.sourceTree)fail('fixed Source2 raw tree identity');
    git('merge-base','--is-ancestor',SOURCE2_IDENTITY.sourceCommit,head);
    verifyCurrentCoverageOutputAuthority();
    for(const pin of SOURCE2_COMPATIBILITY_CODE){const bytes=readClosedFile(pin.path);if(hash(bytes)!==pin.sha256||bytes.length!==pin.sizeBytes)fail(pin.path+': separate compatibility-code physical bytes changed');const predecessor=pinnedBlob(SOURCE2_IDENTITY.sourceCommit,pin.path,pin,pin.path+' Source2 compatibility predecessor',false);if(!predecessor.equals(bytes))fail(pin.path+': compatibility code differs from fixed Source2 predecessor');}
    if(git('rev-parse',`${installPins.bridgeCommit}^{tree}`).toString('utf8').trim()!==installPins.bridgeTree || git('rev-parse',`${installPins.codeCommit}^{tree}`).toString('utf8').trim()!==installPins.codeTree)fail('historical bridge/code tree identity');
    git('merge-base','--is-ancestor',bridge.nativeSourceEpoch.finalS2Commit,installPins.bridgeCommit);
    git('merge-base','--is-ancestor',bridge.nativeSourceEpoch.qualifierCodeCommit,installPins.codeCommit);
    for(const commit of [installPins.bridgeCommit,installPins.codeCommit])git('merge-base','--is-ancestor',commit,'HEAD');
    if(!git('show',`${installPins.bridgeCommit}:${BRIDGE_PATH}`).equals(readClosedFile(BRIDGE_PATH)))fail('historical bridge differs from its actual committed antecedent blob');
    const codeMap=new Map();
    for(const row of codeRows){const bytes=readClosedFile(row.path);if(hash(bytes)!==row.sha256||bytes.length!==row.sizeBytes)fail(row.path+': historical code physical bytes changed');if(!codeGitQualified&&!git('show',`${installPins.codeCommit}:${row.path}`).equals(bytes))fail(row.path+': historical code differs from fixed code commit');codeMap.set(row.path,bytes);}
    if(!codeGitQualified)assertExactHistoricalCodeClosure(codeMap);
    return codeMap;
  }
  function hasPhysicalPath(path){
    const parts=safeRepoPath(path).split('/');let absolute=root;
    for(let index=0;index<parts.length;index++){absolute=resolve(absolute,parts[index]);let stat;try{stat=lstatSync(absolute);}catch(error){if(error?.code==='ENOENT')return false;throw error;}if(stat.isSymbolicLink()||realpathSync(absolute)!==absolute)fail(path+': optional absence cannot traverse a symlink');if(index<parts.length-1&&!stat.isDirectory())fail(path+': optional absence parent must be a directory');}
    return true;
  }
  function hasGitPath(commit,path){git('cat-file','commit',commit);try{git('cat-file','-e',`${commit}:${safeRepoPath(path)}`);return true;}catch(error){const stderr=Buffer.isBuffer(error?.stderr)?error.stderr.toString('utf8'):String(error?.stderr||'');if(error?.status===128&&[`fatal: path '${path}' does not exist in '${commit}'\n`,`fatal: path '${path}' exists on disk, but not in '${commit}'\n`].includes(stderr))return false;throw error;}}
  function verifyAuxiliaryPolicy(codeMap){
    if(auxiliaryPolicyChecked)return;
    const nativeFixture=parseBytes(readClosedFile(bridge.nativeSourceEpoch.fixturePath),'native S1 fixture');
    assertNativeEpochIdentity(bridge.nativeSourceEpoch,nativeFixture.sourceEpoch);
    const candidatePaths=[...new Set([...HISTORICAL_AUTHORED_READ_PATHS,...nativeFixture.assetClosure.catalogPaths])].filter(path=>!bridge.exact22Rows.some(row=>row.path===path)).sort();
    if(canonical([...auxiliarySources.keys()].sort())!==canonical(candidatePaths)||auxiliarySources.size!==bridge.auxiliarySourcePreimages?.length)fail('exact finite authored/catalog auxiliary source set required');
    const stages={mm:bridge.historicalEpochs.mm.snapshotCommit,h:bridge.historicalEpochs.historicalH.fullM1PreimageCommit,v29:bridge.historicalEpochs.version29.baselineCommit};
    for(const [path,row]of auxiliarySources){const current=freshByPath.get(path);if(!current||row.current?.sha256!==current.sha256||row.current?.sizeBytes!==current.sizeBytes)fail(path+': auxiliary current source pin differs');for(const [stage,commit]of Object.entries(stages)){const pin=row.stages?.[stage];if(pin===null){if(hasGitPath(commit,path))fail(path+': falsely absent historical source stage');}else{checkDigestRow(pin,path+' auxiliary '+stage,{commit:true});if(pin.commit!==commit)fail('fixed auxiliary historical epoch');pinnedBlob(commit,path,pin,path+' auxiliary immutable '+stage);}}}
    const expected=new Map();const add=(path,sha,group)=>{safeRepoPath(path);if(!digest(sha))fail('auxiliary base content pin');if(expected.has(path)){assertTypedFreshnessOverlap({path,...expected.get(path)},{path,sha256:sha,group});return;}expected.set(path,{sha256:sha,group});};
    for(const [group,values]of Object.entries(bridge.nativeInputHashes))for(const [path,sha]of Object.entries(values))add(path,sha,group);
    for(const row of bridge.exact22Rows)add(row.path,row.nextCurrent.sha256,'historicalMapped');
    const installs=bridge.nativeInstallationPins;if(!Array.isArray(installs)||installs.length!==2||!installs.some(row=>row.path===bridge.nativeSourceEpoch.fixturePath&&row.sha256===bridge.nativeSourceEpoch.fixtureSha256)||!installs.some(row=>row.path==='research/class-mapping-source-epoch-v1/native-qualification-pins-v1.mjs'&&codeRows.some(code=>code.path===row.path&&code.sha256===row.sha256)))fail('exact native fixture/pin-module auxiliary installation set');for(const row of installs)add(row.path,row.sha256,'nativeInstallation');
    const ref=bridge.metadataReceiptRef;if(ref?.path!=='research/class-mapping-source-epoch-v1/metadata-stage-v2.json'||!digest(ref.sha256)||!integer(ref.sizeBytes)||!commitId(ref.commit)||!commitId(ref.tree))fail('fixed committed metadata receipt reference');if(git('rev-parse',`${ref.commit}^{tree}`).toString('utf8').trim()!==ref.tree)fail('report P tree identity');git('merge-base','--is-ancestor',bridge.nativeSourceEpoch.qualifierCodeCommit,ref.commit);git('merge-base','--is-ancestor',ref.commit,bridge.nativeSourceEpoch.finalS2Commit);const receiptBytes=readClosedFile(ref.path);if(hash(receiptBytes)!==ref.sha256||receiptBytes.length!==ref.sizeBytes)fail('metadata receipt auxiliary content changed');const receipt=parseBytes(receiptBytes,'bound metadata receipt');if(receipt.sourceEpoch?.sourceBody?.commit!==bridge.nativeSourceEpoch.sourceCommit||receipt.qualifierProducer?.commit!==bridge.nativeSourceEpoch.qualifierCodeCommit)fail('metadata receipt source/QCC stages differ');for(const row of reportInputReferences(receipt,ref)){
      if(row.path===HISTORICAL_P_APP_ROLE.path){
        const oldApp=HISTORICAL_P_APP_ROLE;
        if(ref.commit!==oldApp.commit||ref.tree!==oldApp.tree||row.sha256!==oldApp.sha256)fail('fixed P-stage S1 dist/app.js report input role changed');
        const oldPBlob=pinnedBlob(ref.commit,row.path,oldApp,'P-stage historical S1 app report input');
        if(oldPBlob.length!==oldApp.sizeBytes||hash(oldPBlob)!==oldApp.sha256)fail('P-stage historical S1 app raw blob mismatch');
        const currentApp=source2Authorities.app,physicalApp=readClosedFile(row.path);
        if(currentApp?.path!==oldApp.path||currentApp.sha256!=='57eae6b440f2b75294ca6021adbcd9e29a43646a7a6177cc6800973b94f0b8c1'||currentApp.sizeBytes!==197876)fail('fixed current Source2 app role required beside historical P input');
        const currentBBlob=pinnedBlob(SOURCE2_IDENTITY.sourceCommit,row.path,currentApp,'Source2 B current body app');
        if(!physicalApp.equals(currentBBlob)||hash(physicalApp)!==currentApp.sha256||physicalApp.length!==currentApp.sizeBytes)fail('current physical app must match exact Source2 B body role');
        // Keep the pinned P hash in its old report/freshness role; the actual
        // current app was independently authenticated against Source2 B above.
        add(row.path,row.sha256,'metadataReport');
        continue;
      }
      const current=readClosedFile(row.path);
      if(hash(current)!==row.sha256||!git('show',`${ref.commit}:${safeRepoPath(row.path)}`).equals(current))fail(row.path+': report P role differs from current/freshness bytes');
      add(row.path,row.sha256,'metadataReport');
    }assertReportAbsenceClosure(receipt,bridge.nextFreshnessInputs.absentRows,{freshnessCommit:bridge.nativeSourceEpoch.finalS2Commit,reportCommit:ref.commit,qualifierCommit:bridge.nativeSourceEpoch.qualifierCodeCommit,hasPhysical:hasPhysicalPath,hasGit:hasGitPath});for(const path of reportAbsentInputPaths(receipt))if(freshByPath.has(path)||codeMap.has(path))fail(path+': optional absence overlaps present/code closure');
    const coverageRows=receipt.outputs.filter(row=>row.kind==='current-coverage-gaps-snapshot');if(coverageRows.length!==1||coverageRows[0].path==='dist/coverage-gaps.json'||freshByPath.get('dist/coverage-gaps.json')?.sha256!==coverageRows[0].rawSha256)fail('public coverage must be captured after exact fresh-report reproduction');const coverageRef=bridge.publicCoverageRef;checkDigestRow(coverageRef,'public coverage',{commit:true});if(coverageRef.path!=='dist/coverage-gaps.json'||coverageRef.sha256!==coverageRows[0].rawSha256||!commitId(coverageRef.tree)||coverageRef.commit===ref.commit||git('rev-parse',`${coverageRef.commit}^{tree}`).toString('utf8').trim()!==coverageRef.tree)fail('separate post-P public coverage commit identity');git('merge-base','--is-ancestor',ref.commit,coverageRef.commit);git('merge-base','--is-ancestor',coverageRef.commit,bridge.nativeSourceEpoch.finalS2Commit);pinnedBlob(coverageRef.commit,coverageRef.path,coverageRef,'public coverage committed reproduction');
    const excluded=new Set([...expected.keys(),...codeMap.keys(),...reportAbsentInputPaths(receipt),BRIDGE_PATH,INSTALL_PINS_PATH]);const required=declaredHistoricalInputClosure({codeFiles:codeMap,excludedPaths:excluded,read:path=>{const pin=freshByPath.get(path);if(!pin)fail(path+': declared historical I/O path missing from exact closure');const bytes=readClosedFile(path);if(hash(bytes)!==pin.sha256||bytes.length!==pin.sizeBytes)fail(path+': declared historical I/O bytes differ');return bytes;}});
    if(canonical(bridge.nextFreshnessInputs.reviewedExtraHistoricalInputPaths)!==canonical(required))fail('reviewed auxiliary path list differs from dynamically derived exact closure');
    for(const path of required){const row=freshByPath.get(path);if(row.group!=='historicalAuxiliary')fail(path+': exact historical auxiliary group required');add(path,row.sha256,'historicalAuxiliary');}
    if(expected.size!==freshByPath.size)fail('extra or omitted auxiliary freshness paths');for(const [path,pin]of expected){const actual=freshByPath.get(path);if(!actual||actual.sha256!==pin.sha256||actual.group!==pin.group||actual.commit!==bridge.nativeSourceEpoch.finalS2Commit)fail(path+': finite exact auxiliary/native stage closure mismatch');}
    auxiliaryPolicyChecked=true;
  }
  const blobCache = new Map();
  let blobCacheSealed = false;
  function pinnedBlob(commit, path, expected, label, cache=true) {
    const key = `${commit}\0${path}`;
    const cached = blobCache.get(key);
    if (cached) {
      if (cached.sha256 !== expected.sha256 || cached.sizeBytes !== expected.sizeBytes) fail(label + ': immutable Git cache manifest mismatch');
      return Buffer.from(cached.bytes);
    }
    if (blobCacheSealed && cache) fail(label + ': immutable Git cache is closed');
    const bytes = git('show', `${commit}:${safeRepoPath(path)}`);
    if (hash(bytes) !== expected.sha256 || bytes.length !== expected.sizeBytes) fail(label + ': immutable Git blob SHA/size mismatch');
    if(cache)blobCache.set(key, {sha256: expected.sha256, sizeBytes: bytes.length, bytes: Buffer.from(bytes)});
    return Buffer.from(bytes);
  }
  const byPath = new Map(bridge.exact22Rows.map(row => [row.path, row]));
  const hRows = new Map(bridge.hContractRows.map(row => [row.path, row]));
  const oldMmRows = new Map(bridge.exact22Rows.map(row => [row.path, row]));
  const byPathRow = path => {
    const row = byPath.get(safeRepoPath(path));
    if (!row) fail('path is outside the closed 22-path bridge');
    return row;
  };
  function mapReaderPath(path) {
    let absolute;
    if (typeof path === 'string') absolute = isAbsolute(path) ? resolve(path) : resolve(root, safeRepoPath(path));
    else if (!types.isProxy(path) && path && typeof path === 'object'
        && Object.getPrototypeOf(path) === URL.prototype && Reflect.ownKeys(path).length === 0) absolute = resolve(fileURLToPath(path));
    else fail('reader path must be an exact repository path or plain file URL; expected a string or plain file URL');
    const local = relative(root, absolute).split(sep).join('/');
    if (local === '..' || local.startsWith('../') || isAbsolute(local)) fail('reader path escapes fixed source repository root');
    return safeRepoPath(local);
  }
  const assertRoot = () => {
    if (realpathSync(root) !== root || resolve(git('rev-parse', '--show-toplevel').toString('utf8').trim()) !== root) {
      fail('reader root differs from the actual Git worktree root');
    }
  };

  function assertCommitChain() {
    const ep = bridge.historicalEpochs, n = bridge.nativeSourceEpoch;
    const pairs = [
      [ep.version29.baselineCommit, ep.historicalH.sourceCommit],
      [ep.historicalH.sourceCommit, ep.historicalH.fullM1PreimageCommit],
      [ep.historicalH.fullM1PreimageCommit, ep.mm.sourceCommit],
      [ep.mm.sourceCommit, ep.mm.snapshotCommit],
      [ep.mm.snapshotCommit, ep.mm.protectedCodeCommit],
      [ep.mm.protectedCodeCommit, n.sourceCommit],
      [n.sourceCommit, n.qualifierCodeCommit],
      [n.qualifierCodeCommit, n.finalS2Commit],
      [n.finalS2Commit, 'HEAD'],
    ];
    for (const [ancestor, descendant] of pairs) git('merge-base', '--is-ancestor', ancestor, descendant);
    const treePins = [[ep.version29.baselineCommit, ep.version29.baselineTree],
      [ep.historicalH.sourceCommit, ep.historicalH.sourceTree],
      [ep.historicalH.fullM1PreimageCommit, ep.historicalH.fullM1PreimageTree],
      [ep.mm.sourceCommit, ep.mm.sourceTree], [ep.mm.snapshotCommit, ep.mm.snapshotTree],
      [ep.mm.protectedCodeCommit, ep.mm.protectedCodeTree],
      [n.sourceCommit, n.sourceTree], [n.parentCommit, n.parentTree],
      [n.qualifierCodeCommit, n.qualifierCodeTree], [n.finalS2Commit, n.finalS2Tree]];
    for (const [commit, tree] of treePins) {
      if (git('rev-parse', `${commit}^{tree}`).toString('utf8').trim() !== tree) fail('pinned Git tree identity changed');
    }
  }

  function verifyOldContracts() {
    const contracts = bridge.preservedContracts;
    const contractBytes = new Map();
    for (const row of Object.values(contracts)) {
      const bytes = readClosedFile(row.path);
      if (hash(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) fail(row.path + ': preserved historical contract/code changed');
      pinnedBlob(row.commit, row.path, row, row.path + ' frozen historical code preimage');
      contractBytes.set(row.path, bytes);
    }
    const oldBridge = parseBytes(contractBytes.get(contracts.mmToHBridge.path),'frozen MM bridge');
    const oldHContract = parseBytes(contractBytes.get(contracts.hToV29Contract.path),'frozen H contract');
    const projectedRows = bridge.exact22Rows.map(({nextCurrent, ...oldColumns}) => oldColumns);
    if (canonical(projectedRows) !== canonical(oldBridge.mappingPolicy.orderedFiles)
        || canonical(bridge.hContractRows) !== canonical(oldHContract.files)) fail('MM/H/V29 bridge rows differ from unchanged parent contracts');
    const strictHashes = {...oldBridge.sourceEpoch.strictGuard.rawInputs, ...oldBridge.sourceEpoch.strictGuard.selectedAdditionalInputs};
    const parentRows = bridge.frozenMmParentInputs.rows;
    if (parentRows.length !== 21 || canonical(parentRows.map(row => [row.path, row.sha256]).sort(([a], [b]) => a.localeCompare(b)))
        !== canonical(Object.entries(strictHashes).sort(([a], [b]) => a.localeCompare(b)))) fail('frozen 21-file MM source input map differs from old strict fixture');
    if (oldBridge.sourceEpoch.currentSnapshotCommit !== bridge.historicalEpochs.mm.snapshotCommit
        || oldBridge.sourceEpoch.currentSnapshotTree !== bridge.historicalEpochs.mm.snapshotTree
        || oldBridge.sourceEpoch.mmSourceCommit !== bridge.historicalEpochs.mm.sourceCommit
        || oldBridge.historicalH.sourceCommit !== bridge.historicalEpochs.historicalH.sourceCommit
        || oldBridge.historicalH.fullM1PreimageCommit !== bridge.historicalEpochs.historicalH.fullM1PreimageCommit
        || oldBridge.version29.baselineCommit !== bridge.historicalEpochs.version29.baselineCommit) fail('immutable MM/H/V29 epoch pins differ from old bridge');
    const oldGate = bridge.frozenMmGuard;
    const fixture = readClosedFile(oldGate.fixturePath);
    if (hash(fixture) !== oldGate.fixtureSha256) fail('frozen MM current-source fixture changed');
    pinnedBlob(oldGate.fixture.commit, oldGate.fixture.path, oldGate.fixture, 'frozen MM native fixture');
    for (const row of oldGate.guardCodeFiles) {
      const bytes = readClosedFile(row.path);
      if (hash(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) fail(row.path + ': frozen MM guard code changed');
      pinnedBlob(row.commit, row.path, row, row.path + ' frozen MM guard Git preimage');
    }
    const hFixture = bridge.historicalEpochs.historicalH.fixture;
    const fixtureBytes = readClosedFile(hFixture.path);
    if (hash(fixtureBytes) !== hFixture.sha256 || fixtureBytes.length !== hFixture.sizeBytes) fail('historical H fixture worktree bytes changed');
    pinnedBlob(bridge.historicalEpochs.historicalH.fullM1PreimageCommit, hFixture.path, hFixture, 'historical H native fixture');
  }

  function verifyHistoricalGitPreimages() {
    const ep = bridge.historicalEpochs;
    for (const row of bridge.exact22Rows) {
      const mm = pinnedBlob(ep.mm.snapshotCommit, row.path, row.currentMm, row.path + ' MM snapshot');
      const h = pinnedBlob(ep.historicalH.fullM1PreimageCommit, row.path, row.historicalH, row.path + ' H preimage');
      const v29 = pinnedBlob(ep.version29.baselineCommit, row.path, row.version29Baseline, row.path + ' V29 baseline');
      if (row.json) {
        if (objectSha256(parseBytes(mm,'MM preimage')) !== row.currentMm.objectSha256
            || objectSha256(parseBytes(h,'H preimage')) !== row.historicalH.objectSha256
            || objectSha256(parseBytes(v29,'V29 preimage')) !== row.version29Baseline.objectSha256) fail(row.path + ': historical object fingerprint changed');
      }
      const hRow = hRows.get(row.path);
      if (!hRow || hRow.current.sha256 !== row.historicalH.sha256 || hRow.current.sizeBytes !== row.historicalH.sizeBytes
          || hRow.baseline.sha256 !== row.version29Baseline.sha256 || hRow.baseline.sizeBytes !== row.version29Baseline.sizeBytes
          || (row.json && (hRow.currentObjectSha256 !== row.historicalH.objectSha256
            || hRow.baselineObjectSha256 !== row.version29Baseline.objectSha256))) {
        fail(row.path + ': old H/V29 path contract mismatch');
      }
    }
    for (const row of bridge.frozenMmParentInputs.rows) {
      const bytes = pinnedBlob(bridge.frozenMmParentInputs.commit, row.path, row, row.path + ' old parent input');
      if (row.objectSha256 && objectSha256(parseBytes(bytes,'closed JSON input')) !== row.objectSha256) fail(row.path + ': frozen MM parent object fingerprint changed');
    }
  }

  // Facts below are functions only of verified physical bytes and fixed pins.
  // They never cache a physical read/hash or any caller-supplied object.
  const verifiedObjectFingerprints = new Set();
  function verifyCurrentCoverageOutputAuthority() {
    const authority=companion.currentCoverageOutput,receiptPin=authority.metadataReceipt;
    const output=authority.outputRow,producer=authority.producerCode,alias=authority.publishedAlias,qcc=authority.qualifierProducer,source=authority.sourceBody;
    if(git('rev-parse',`${receiptPin.commit}^{tree}`).toString('utf8').trim()!==receiptPin.tree
        ||git('rev-parse',`${qcc.commit}^{tree}`).toString('utf8').trim()!==qcc.tree
        ||git('rev-parse',`${alias.commit}^{tree}`).toString('utf8').trim()!==alias.tree)fail('fixed O/QCC/T coverage authority tree identities');
    const oParents=git('rev-list','--parents','-n','1',receiptPin.commit).toString('utf8').trim().split(/\s+/);
    if(canonical(oParents)!==canonical([receiptPin.commit,receiptPin.directParent])
        ||git('rev-parse',`${receiptPin.directParent}^{tree}`).toString('utf8').trim()!==receiptPin.directParentTree)fail('O metadata receipt must remain the exact direct child of its pinned N3 parent');
    const head=git('rev-parse','--verify','HEAD^{commit}').toString('utf8').trim();
    for(const [ancestor,descendant] of [[source.commit,qcc.commit],[qcc.commit,receiptPin.commit],[receiptPin.commit,alias.commit],[alias.commit,head]])git('merge-base','--is-ancestor',ancestor,descendant);
    const qccParents=git('rev-list','--parents','-n','1',qcc.commit).toString('utf8').trim().split(/\s+/);
    if(canonical(qccParents)!==canonical([qcc.commit,qcc.directParent]))fail('QCC must remain the exact direct child of metadata L');
    if(!source2CoverageAuthority){
      const receiptBytes=pinnedBlob(receiptPin.commit,receiptPin.path,receiptPin,'raw O metadata-stage-v3 receipt');
      const receipt=parseBytes(receiptBytes,'raw O metadata-stage-v3 receipt');
      const sourceRecord=receipt.sourceEpoch?.sourceBody,producerRecord=receipt.qualifierProducer;
      if(sourceRecord?.stage!==source.stage||sourceRecord.commit!==source.commit||sourceRecord.tree!==source.tree
          ||sourceRecord.directParent!==source.directParent||sourceRecord.directParentTree!==source.directParentTree
          ||producerRecord?.stage!==qcc.stage||producerRecord.commit!==qcc.commit||producerRecord.tree!==qcc.tree
          ||producerRecord.ancestry?.sourceBodyCommit!==source.commit||producerRecord.ancestry?.metadataL!==qcc.directParent
          ||producerRecord.ancestry?.isReportQccDirectChildOfMetadata!==true||producerRecord.ancestry?.isAncestorOfReportQcc!==true
          ||producerRecord.ancestry?.reportQccMIsAncestorOfCurrentHead!==true)fail('O receipt source-body and QCC lineage fields changed');
      const rows=receipt.outputs.filter(row=>row.kind==='current-coverage-gaps-snapshot');
      if(rows.length!==1||canonical(rows[0])!==canonical(output)||receipt.outputs.some(row=>row.path===output.path&&row.kind!==output.kind))fail('O receipt must contain exactly the fixed current coverage output row');
      const outputBlobPin={sha256:output.rawSha256,sizeBytes:output.sizeBytes};
      const internal=pinnedBlob(receiptPin.commit,output.path,outputBlobPin,'raw O internal coverage output');
      const parsed=parseBytes(internal,'raw O internal coverage output');
      if(objectSha256(parsed)!==output.parsedObjectSha256)fail('raw O coverage parsed-object fingerprint mismatch');
      const qccProducer=pinnedBlob(qcc.commit,producer.path,producer,'QCC coverage producer code');
      const oProducer=pinnedBlob(receiptPin.commit,producer.path,producer,'O coverage producer code');
      const tProducer=pinnedBlob(alias.commit,producer.path,producer,'T coverage producer code');
      if(!qccProducer.equals(oProducer)||!qccProducer.equals(tProducer))fail('O/QCC/T coverage producer code bytes differ');
      const tInternal=pinnedBlob(alias.commit,output.path,outputBlobPin,'T internal coverage alias');
      const tPublished=pinnedBlob(alias.commit,alias.path,outputBlobPin,'T public coverage alias');
      if(!internal.equals(tInternal)||!internal.equals(tPublished))fail('raw O internal coverage and T internal/dist aliases differ');
      source2CoverageAuthority={receiptBytes:Buffer.from(receiptBytes),internalBytes:Buffer.from(internal),producerBytes:Buffer.from(qccProducer)};
    }
    const physicalReceipt=readClosedFile(receiptPin.path),physicalInternal=readClosedFile(output.path),physicalPublished=readClosedFile(alias.path),physicalProducer=readClosedFile(producer.path);
    if(!physicalReceipt.equals(source2CoverageAuthority.receiptBytes)||hash(physicalReceipt)!==receiptPin.sha256||physicalReceipt.length!==receiptPin.sizeBytes)fail('physical current O metadata receipt differs from raw O');
    if(!physicalInternal.equals(source2CoverageAuthority.internalBytes)||!physicalPublished.equals(source2CoverageAuthority.internalBytes)
        ||hash(physicalInternal)!==output.rawSha256||physicalInternal.length!==output.sizeBytes)fail('physical internal/output coverage aliases differ from raw O producer output');
    if(!physicalProducer.equals(source2CoverageAuthority.producerBytes)||hash(physicalProducer)!==producer.sha256||physicalProducer.length!==producer.sizeBytes)fail('physical current coverage producer differs from QCC code pin');
  }

  function assertVerifiedObjectFingerprint(bytes, pin, parseLabel, invalidMessage, mismatchMessage) {
    // Preserve prototype/serializer rejection on EVERY call, including hits.
    try { assertPlainJson({}, parseLabel); } catch { fail(invalidMessage); }
    const key = `${pin.sha256}\0${pin.sizeBytes}\0${pin.objectSha256}`;
    if (verifiedObjectFingerprints.has(key)) return;
    let parsed;
    try { parsed = parseBytes(bytes, parseLabel); } catch { fail(invalidMessage); }
    if (objectSha256(parsed) !== pin.objectSha256) fail(mismatchMessage);
    verifiedObjectFingerprints.add(key);
  }

  function freshlyHashCurrentInputs(currentProof) {
    for (const row of bridge.nextFreshnessInputs.absentRows) if (hasPhysicalPath(row.path)) fail(row.path+': report optional input became present');
    const proofHashes = currentProof.inputHashes;
    const proofByPath = new Map();
    const proofGroups = ['sourceBody','qualificationMetadata','protectedHistorical','installedCode'];
    if (canonical(Object.keys(proofHashes).sort()) !== canonical([...proofGroups].sort())) fail('exact four Source2 proof groups required');
    for (const group of proofGroups) {
      const records = proofHashes[group];
      if (!records || Array.isArray(records) || typeof records !== 'object') fail('exact Source2 proof group required: '+group);
      for (const [path, sha] of Object.entries(records)) {
        safeRepoPath(path); if (!digest(sha)) fail(path+': Source2 proof digest');
        const previous = proofByPath.get(path); if (previous !== undefined && previous !== sha) fail(path+': conflicting Source2 proof group pins');
        proofByPath.set(path, sha);
      }
    }
    for (const row of bridge.nextFreshnessInputs.rows) {
      const path = safeRepoPath(row.path), absolute = resolve(root, path);
      const override = path === 'dist/app.js' ? source2Authorities.app
        : path === 'dist/coverage-gaps.json' ? source2Authorities.coverage : null;
      const proofSha = proofByPath.get(path);
      if (path === 'dist/app.js') {
        if (row.group !== 'sourceBody' || proofSha !== override.sha256) fail(path+': explicit Source2 body override does not match the genuine proof map');
      } else if (path === 'dist/coverage-gaps.json') {
        if (row.group !== 'historicalMapped' || Object.hasOwn(currentProof.inputHashes.sourceBody, path)
            || override.authority !== 'exact current-coverage-gaps-snapshot row in raw O metadata-stage-v3, with internal bytes and current physical/internal/dist alias equality; frozen T blob is an additional alias check') fail(path+': coverage output must stay outside Source2 body authority');
      } else if (proofSha !== undefined && proofSha !== row.sha256) {
        fail(path+': old bridge physical role differs from exact Source2 proof map');
      }
      if (blobCacheSealed && proofSha !== undefined && path !== 'dist/coverage-gaps.json') continue;
      const oldBlob = pinnedBlob(row.commit, path, row, path+' immutable old bridge Git blob', !NATIVE_GROUPS.includes(row.group));
      if (row.objectSha256) assertVerifiedObjectFingerprint(oldBlob, row, 'closed historical JSON input', path+': old Git JSON invalid', path+': old Git object fingerprint mismatch');
      let stat;
      try { stat = lstatSync(absolute); } catch { fail(path + ': fresh current input is missing'); }
      if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(absolute) !== absolute) fail(path + ': current input must be a regular non-symlink file');
      const bytes = readClosedFile(path);
      if (override?.path === 'dist/app.js') {
        if (hash(bytes) !== override.sha256 || bytes.length !== override.sizeBytes) fail(path+': explicit Source2 app bytes changed');
        const sourceBlob = pinnedBlob(SOURCE2_IDENTITY.sourceCommit, path, override, path+' raw Source2 body blob', false);
        if (!sourceBlob.equals(bytes)) fail(path+': Source2 app physical bytes differ from raw Source2 blob');
      } else if (override?.path === 'dist/coverage-gaps.json') {
        if (hash(bytes) !== override.sha256 || bytes.length !== override.sizeBytes) fail(path+': separate current coverage output bytes changed');
        const outputBlob = pinnedBlob(override.commit, path, override, path+' exact frozen-T output blob', false);
        if (!outputBlob.equals(bytes)) fail(path+': current coverage output differs from raw frozen-T blob');
      } else if (hash(bytes) !== row.sha256 || bytes.length !== row.sizeBytes || !oldBlob.equals(bytes)) {
        fail(path + ': historical physical input differs from its exact old bridge raw Git pin');
      }
      if (proofSha !== undefined && path !== 'dist/app.js' && proofSha !== row.sha256) fail(path+': Source2 proof/current role mismatch');
    }
    for (const row of bridge.runtimeCodePins.rows) {
      const bytes = readClosedFile(row.path);
      if (hash(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) fail(row.path + ': current native transport code changed');
      pinnedBlob(row.commit, row.path, row, row.path + ' native transport code Git blob');
    }
  }

  function source2CurrentProof() {
    const checked = assertSource2();
    const summary = checked?.summary;
    if (summary?.stage !== SOURCE2_IDENTITY.stage || summary.sourceCommit !== SOURCE2_IDENTITY.sourceCommit
        || summary.sourceTree !== SOURCE2_IDENTITY.sourceTree
        || summary.fixture?.path !== SOURCE2_IDENTITY.fixturePath || summary.fixture?.sha256 !== SOURCE2_IDENTITY.fixtureSha256) {
      fail('genuine zero-argument gate returned a different Source2 body stage, source, tree, or fixture');
    }
    assertPlainJson(checked.inputHashes, 'genuine Source2 input hashes');
    const proofGroups = ['sourceBody','qualificationMetadata','protectedHistorical','installedCode'];
    if (canonical(Object.keys(checked.inputHashes).sort()) !== canonical([...proofGroups].sort())) fail('exact four Source2 proof groups required');
    const body = checked.inputHashes.sourceBody;
    if (!body || Array.isArray(body) || Object.keys(body).length !== SOURCE2_IDENTITY.sourceBodyRows) fail('exact 3063-row Source2 body map required');
    const proofByPath = new Map();
    for (const group of proofGroups) {
      const records = checked.inputHashes[group];
      if (!records || Array.isArray(records) || typeof records !== 'object') fail('exact Source2 proof group required: '+group);
      for (const [path, sha] of Object.entries(records)) {
        safeRepoPath(path); if (!digest(sha)) fail(path+': Source2 proof digest');
        const previous = proofByPath.get(path); if (previous !== undefined && previous !== sha) fail(path+': conflicting Source2 proof group pins');
        proofByPath.set(path, sha);
      }
    }
    if (body['dist/app.js'] !== source2Authorities.app.sha256
        || body['dist/search.js'] !== companion.historicalSearchRole.source2Sha256
        || Object.hasOwn(body, 'dist/coverage-gaps.json')) fail('Source2 body map/app/search pins and separately typed coverage output required');
    for (const row of bridge.nextFreshnessInputs.rows) {
      const current = proofByPath.get(row.path);
      if (current !== undefined && row.path !== 'dist/app.js' && row.path !== 'dist/coverage-gaps.json' && current !== row.sha256) {
        fail(row.path+': old bridge input overlaps a different current Source2 proof pin');
      }
    }
    return detachedFrozenJson(checked, 'genuine Source2 current proof');
  }

  function currentGuard(path = null) {
    assertRoot();
    const codeMap=installationFreshness();
    if (hash(readClosedFile(BRIDGE_PATH)) !== EXPECTED_BRIDGE_SHA256) fail('current bridge bytes changed');
    verifyOldContracts();
    assertCommitChain();
    if(!blobCacheSealed)verifyHistoricalGitPreimages();
    const proof = source2CurrentProof();
    freshlyHashCurrentInputs(proof);
    verifyAuxiliaryPolicy(codeMap);
    if (path !== null) {
      const row = byPathRow(path), pin = row.nextCurrent;
      const physical = readClosedFile(row.path);
      const committed = blobCacheSealed ? physical : pinnedBlob(pin.commit, row.path, pin, row.path + ' next-current mapped path',false);
      if (hash(physical) !== pin.sha256 || physical.length !== pin.sizeBytes || hash(committed) !== pin.sha256) {
        fail(row.path + ': fresh mapped current path differs from exact final-S2 state');
      }
      if (row.json) assertVerifiedObjectFingerprint(physical, pin, 'mapped current JSON',
        row.path + ': mapped current JSON is invalid', row.path + ': mapped current object fingerprint mismatch');
    }
    return proof;
  }

  function guardHistoricalProjectionInput(row) {
    const hasTypedSource2CurrentOverride = row.path === source2Authorities.app.path
      || row.path === source2Authorities.coverage.path;
    // The zero-argument guard authenticates the actual Source2 physical app and
    // O-bound coverage output. The kernel below still accepts only the exact
    // old mapped candidate/MM bytes; it cannot project either new physical value.
    currentGuard(hasTypedSource2CurrentOverride ? null : row.path);
  }

  const kernel = createHistoricalProjectionKernel({
    rows: bridge.exact22Rows,
    hRows,
    mmBlobFor: row => pinnedBlob(bridge.historicalEpochs.mm.snapshotCommit, row.path, row.currentMm, row.path + ' MM snapshot'),
    hBlobFor: row => pinnedBlob(bridge.historicalEpochs.historicalH.fullM1PreimageCommit, row.path, row.historicalH, row.path + ' H preimage'),
    v29BlobFor: row => pinnedBlob(bridge.historicalEpochs.version29.baselineCommit, row.path, row.version29Baseline, row.path + ' V29 baseline'),
  });
  // Eager native-current qualification at construction, followed by mandatory
  // per-call physical freshness and source-stage checks.
  currentGuard();
  // A second complete current/native/code check precedes cache publication.
  currentGuard();
  codeGitQualified = true;
  blobCacheSealed = true;

  function normalizeVersion29HistoricalBytes(path, value) {
    const row = byPathRow(path); guardHistoricalProjectionInput(row);
    return kernel.normalizeBytes(row.path, value, row.nextCurrent);
  }
  function normalizeHistoricalMmBytes(path, value) {
    const row = byPathRow(path); guardHistoricalProjectionInput(row);
    return kernel.normalizeMmBytes(row.path, value, row.nextCurrent);
  }
  function normalizeVersion29HistoricalJson(path, value) {
    const row = byPathRow(path); guardHistoricalProjectionInput(row);
    return kernel.normalizeJson(row.path, value, row.nextCurrent);
  }
  function normalizeHistoricalMmJson(path, value) {
    const row = byPathRow(path); guardHistoricalProjectionInput(row);
    return kernel.normalizeMmJson(row.path, value, row.nextCurrent);
  }
  function isExactLegacyFacadeLiteral(path, value) {
    const row = byPathRow(path); guardHistoricalProjectionInput(row);
    try {
      kernel.normalizeJson(row.path, value, row.nextCurrent);
      return false;
    } catch (error) {
      if (!String(error?.message).includes(row.path + ': unknown MM/H/Version29 object state')) throw error;
      const fingerprint = objectSha256(value);
      return bridge.legacyFacadeLiteralExceptions.some(state => state.path === row.path && state.objectSha256 === fingerprint);
    }
  }
  function readStage(path, stage, options) {
    const local=mapReaderPath(path),encoding=readEncoding(options);currentGuard();
    let bytes;
    if(byPath.has(local))bytes=kernel.exactStageBytes(local,stage);
    else if(auxiliarySources.has(local)){const source=auxiliarySources.get(local),pin=source.stages[stage];if(pin===null)fail(local+': no exact historical '+stage+' source preimage');bytes=pinnedBlob(pin.commit,local,pin,local+' exact auxiliary '+stage);}
    else if(stage==='v29'){const pin=freshByPath.get(local)||codeRows.find(row=>row.path===local);if(!pin)fail('reader path is outside the closed mapped/source/auxiliary sets');bytes=readClosedFile(local);if(hash(bytes)!==pin.sha256||bytes.length!==pin.sizeBytes)fail(local+': closed raw auxiliary bytes changed');}
    else fail('exact historical stage path is outside the closed historical map');
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }
  function readVersion29HistoricalFile(path, options) { return readStage(path, 'v29', options); }
  function readExactHistoricalMmPreimageFile(path, options) { return readStage(path, 'mm', options); }
  function readExactHistoricalHPreimageFile(path, options) { return readStage(path, 'h', options); }
  function isVersion29HistoricalPath(path) { return typeof path === 'string' && kernel.isMappedPath(path); }
  function assertHistoricalHPreimageSource2() {
    const proof = currentGuard();
    if(!blobCacheSealed)verifyHistoricalGitPreimages();
    return Object.freeze({status: 'verified immutable S1-to-MM-to-H-to-V29 preimages with a separate genuine Source2 current identity',
      historicalS1SourceCommit: bridge.nativeSourceEpoch.sourceCommit,
      historicalS1SourceTree: bridge.nativeSourceEpoch.sourceTree,
      bridgeEndpointS2Commit: bridge.nativeSourceEpoch.finalS2Commit,
      bridgeEndpointS2Tree: bridge.nativeSourceEpoch.finalS2Tree,
      currentSource2Summary: proof.summary,
      historicalMMCommit: bridge.historicalEpochs.mm.snapshotCommit,
      historicalHCommit: bridge.historicalEpochs.historicalH.fullM1PreimageCommit,
      version29Commit: bridge.historicalEpochs.version29.baselineCommit,
      historicalPaths: bridge.exact22Rows.length,
      mmChangedPathsRestored: bridge.exact22Rows.filter(row => row.currentMm.sha256 !== row.historicalH.sha256).length});
  }
  return {normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson,
    normalizeHistoricalMmBytes, normalizeHistoricalMmJson,
    readVersion29HistoricalFile, readExactHistoricalMmPreimageFile, readExactHistoricalHPreimageFile,
    isVersion29HistoricalPath, isExactLegacyFacadeLiteral, assertHistoricalHPreimageSource2, source2CurrentProof: () => currentGuard()};
}

// The standalone Source2 API exposes only the genuine current proof.
// Historical S1/MM/H/V29 preimages remain on separate named APIs.
const reader = await createClosedReader();
export function assertCurrentClassMappingSource2Identity() { return reader.source2CurrentProof(); }
export const {
  normalizeHistoricalMmBytes,
  normalizeHistoricalMmJson,
  isExactLegacyFacadeLiteral,
  normalizeVersion29HistoricalBytes,
  normalizeVersion29HistoricalJson,
  readVersion29HistoricalFile,
  readExactHistoricalMmPreimageFile,
  readExactHistoricalHPreimageFile,
  isVersion29HistoricalPath,
  assertHistoricalHPreimageSource2,
} = reader;

