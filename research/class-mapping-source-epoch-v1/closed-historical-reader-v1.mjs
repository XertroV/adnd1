// Eager, source-specific transport target. This file is intended to be
// installed in research/class-mapping-source-epoch-v1 after root closes S1/S2.
// All future native and mapped-path pins are deliberately null today, so
// importing it currently rejects before any native-current claim is possible.
import {readFileSync, realpathSync, lstatSync} from 'node:fs';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {parseBytes} from '../../tools/class-mapping-native-contract-v1.mjs';
import {HISTORICAL_AUTHORED_READ_PATHS,declaredHistoricalInputClosure,reportInputReferences,reportAbsentInputPaths,assertReportAbsenceClosure,assertTypedFreshnessOverlap,assertNativeEpochIdentity} from './historical-reader-auxiliary-policy-v1.mjs';
import {HISTORICAL_CODE_ROOTS,HISTORICAL_FIXED_DATA_PATHS,assertExactHistoricalCodeClosure} from './historical-reader-code-roots-v1.mjs';
import {historicalReaderInstallationPins as installPins} from './historical-reader-installation-pins-v1.mjs';
import {createHash} from 'node:crypto';
import {isAbsolute, relative, resolve, sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {createHistoricalProjectionKernel, assertPlainJson, copyRawBytes, objectSha256, LEGACY_FACADE_LITERAL_STATES} from './historical-projection-kernel-v2.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const BRIDGE_PATH = 'research/class-mapping-source-epoch-v1/class-mapping-historical-bridge-v1.json';
// This external code pin is intentionally unset until the final bridge is
// written. The bridge must not contain its own digest or this reader's digest.
const EXPECTED_BRIDGE_SHA256 = installPins.bridgeSha256;
const INSTALL_PINS_PATH = 'research/class-mapping-source-epoch-v1/historical-reader-installation-pins-v1.mjs';
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
  if (hash(readClosedFile(bridge.historicalEpochs.historicalH.contractPath)) !== EXPECTED_H_CONTRACT_SHA256) {
    fail('preserved H/V29 contract bytes changed');
  }

  // Native current qualification has its own API and stage name. This import
  // is intentionally separate from every frozen MM/H/V29 preimage source.
  const {assertClassMappingCurrentSourceIdentity: assertNative} = await import('../../tools/class-mapping-current-source-gate-v1.mjs');
  const rawGit=createRawGitReader(root),git=(...args)=>rawGit.git(...args);
  rawGit.assertView();
  const codeRows=Object.entries(installPins.codePins).map(([path,pin])=>({path:safeRepoPath(path),...pin}));
  for(const required of [...HISTORICAL_CODE_ROOTS,...HISTORICAL_FIXED_DATA_PATHS,'tools/class-mapping-raw-git-v1.mjs'])if(!codeRows.some(row=>row.path===required))fail('historical installed code closure missing '+required);
  if(codeRows.some(row=>row.path===INSTALL_PINS_PATH))fail('historical install pin module cannot hash itself');
  for(const row of codeRows)checkDigestRow(row,row.path+' historical installation code');
  let codeGitQualified=false;
  let auxiliaryPolicyChecked=false;
  const auxiliarySources=new Map((bridge.auxiliarySourcePreimages||[]).map(row=>[row.path,row]));
  const freshByPath=new Map(bridge.nextFreshnessInputs.rows.map(row=>[row.path,row]));
  function installationFreshness(){
    rawGit.assertView();
    const head=git('rev-parse','--verify','HEAD^{commit}').toString('utf8').trim();
    if(!commitId(head)||hash(readClosedFile(INSTALL_PINS_PATH))!==loadedInstallPinsSha256||!git('show',`${head}:${INSTALL_PINS_PATH}`).equals(readClosedFile(INSTALL_PINS_PATH)))fail('historical installation pin module differs from its loaded/raw HEAD bytes');
    if(git('rev-parse',`${installPins.bridgeCommit}^{tree}`).toString('utf8').trim()!==installPins.bridgeTree || git('rev-parse',`${installPins.codeCommit}^{tree}`).toString('utf8').trim()!==installPins.codeTree)fail('historical bridge/code tree identity');
    git('merge-base','--is-ancestor',bridge.nativeSourceEpoch.finalS2Commit,installPins.bridgeCommit);
    git('merge-base','--is-ancestor',bridge.nativeSourceEpoch.qualifierCodeCommit,installPins.codeCommit);
    for(const commit of [installPins.bridgeCommit,installPins.codeCommit])git('merge-base','--is-ancestor',commit,'HEAD');
    if(!git('show',`${installPins.bridgeCommit}:${BRIDGE_PATH}`).equals(readClosedFile(BRIDGE_PATH)))fail('historical bridge differs from its actual committed antecedent blob');
    const codeMap=new Map();
    for(const row of codeRows){const bytes=readClosedFile(row.path);if(hash(bytes)!==row.sha256||bytes.length!==row.sizeBytes)fail(row.path+': historical code physical bytes changed');if(!codeGitQualified&&!git('show',`${installPins.codeCommit}:${row.path}`).equals(bytes))fail(row.path+': historical code differs from fixed code commit');codeMap.set(row.path,bytes);}
    assertExactHistoricalCodeClosure(codeMap);
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
    const ref=bridge.metadataReceiptRef;if(ref?.path!=='research/class-mapping-source-epoch-v1/metadata-stage-v2.json'||!digest(ref.sha256)||!integer(ref.sizeBytes)||!commitId(ref.commit)||!commitId(ref.tree))fail('fixed committed metadata receipt reference');if(git('rev-parse',`${ref.commit}^{tree}`).toString('utf8').trim()!==ref.tree)fail('report P tree identity');git('merge-base','--is-ancestor',bridge.nativeSourceEpoch.qualifierCodeCommit,ref.commit);git('merge-base','--is-ancestor',ref.commit,bridge.nativeSourceEpoch.finalS2Commit);const receiptBytes=readClosedFile(ref.path);if(hash(receiptBytes)!==ref.sha256||receiptBytes.length!==ref.sizeBytes)fail('metadata receipt auxiliary content changed');const receipt=parseBytes(receiptBytes,'bound metadata receipt');if(receipt.sourceEpoch?.sourceBody?.commit!==bridge.nativeSourceEpoch.sourceCommit||receipt.qualifierProducer?.commit!==bridge.nativeSourceEpoch.qualifierCodeCommit)fail('metadata receipt source/QCC stages differ');for(const row of reportInputReferences(receipt,ref)){const current=readClosedFile(row.path);if(hash(current)!==row.sha256||!git('show',`${ref.commit}:${safeRepoPath(row.path)}`).equals(current))fail(row.path+': report P role differs from current/freshness bytes');add(row.path,row.sha256,'metadataReport');}assertReportAbsenceClosure(receipt,bridge.nextFreshnessInputs.absentRows,{freshnessCommit:bridge.nativeSourceEpoch.finalS2Commit,reportCommit:ref.commit,qualifierCommit:bridge.nativeSourceEpoch.qualifierCodeCommit,hasPhysical:hasPhysicalPath,hasGit:hasGitPath});for(const path of reportAbsentInputPaths(receipt))if(freshByPath.has(path)||codeMap.has(path))fail(path+': optional absence overlaps present/code closure');
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
    if (!row) fail('path is outside the exact 22-path bridge');
    return row;
  };
  function mapReaderPath(path) {
    let absolute;
    if (typeof path === 'string') absolute = isAbsolute(path) ? resolve(path) : resolve(root, safeRepoPath(path));
    else if (!types.isProxy(path) && path && typeof path === 'object'
        && Object.getPrototypeOf(path) === URL.prototype && Reflect.ownKeys(path).length === 0) absolute = resolve(fileURLToPath(path));
    else fail('reader path must be an exact repository path or plain file URL');
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

  function freshlyHashCurrentInputs() {
    for(const row of bridge.nextFreshnessInputs.absentRows)if(hasPhysicalPath(row.path))fail(row.path+': report optional input became present');
    const rows = bridge.nextFreshnessInputs.rows;
    for (const row of rows) {
      const path = safeRepoPath(row.path), absolute = resolve(root, path);
      if(blobCacheSealed && ['sourceBody','qualificationMetadata','protectedHistorical','installedCode'].includes(row.group))continue;
      let stat;
      try { stat = lstatSync(absolute); } catch { fail(path + ': fresh current input is missing'); }
      if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(absolute) !== absolute) fail(path + ': current input must be a regular non-symlink file');
      const bytes = readClosedFile(path);
      if (hash(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) fail(path + ': fresh current input SHA/size mismatch');
      const committed = pinnedBlob(row.commit, path, row, path + ' current input Git blob',!NATIVE_GROUPS.includes(row.group));
      if (hash(committed) !== hash(bytes)) fail(path + ': worktree bytes differ from pinned current Git blob');
      if (row.objectSha256) {
        let parsed; try { parsed = parseBytes(bytes,'closed JSON input'); } catch { fail(path + ': current JSON input is invalid'); }
        if (objectSha256(parsed) !== row.objectSha256) fail(path + ': current JSON object fingerprint mismatch');
      }
    }
    for (const row of bridge.runtimeCodePins.rows) {
      const bytes = readClosedFile(row.path);
      if (hash(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) fail(row.path + ': current native transport code changed');
      pinnedBlob(row.commit, row.path, row, row.path + ' native transport code Git blob');
    }
  }

  function nativeCurrentProof() {
    const checked = assertNative();
    const summary = checked?.summary;
    const native = bridge.nativeSourceEpoch;
    if (summary?.stage !== 's1-body-native' || summary.sourceCommit !== native.sourceCommit
        || summary.sourceTree !== native.sourceTree
        || summary.fixture?.path !== native.fixturePath || summary.fixture?.sha256 !== native.fixtureSha256) {
      fail('native current gate returned a different S1 body stage or fixture');
    }
    assertPlainJson(checked.inputHashes, 'native current input hashes');
    if(!bridge.nativeInputHashes || canonical(checked.inputHashes)!==canonical(bridge.nativeInputHashes))fail('native current input hashes differ from exact independently closed full native map');
    return detachedFrozenJson(checked, 'native current proof');
  }

  function currentGuard(path = null) {
    assertRoot();
    const codeMap=installationFreshness();
    if (hash(readClosedFile(BRIDGE_PATH)) !== EXPECTED_BRIDGE_SHA256) fail('current bridge bytes changed');
    verifyOldContracts();
    freshlyHashCurrentInputs();
    assertCommitChain();
    if(!blobCacheSealed)verifyHistoricalGitPreimages();
    const proof = nativeCurrentProof();
    verifyAuxiliaryPolicy(codeMap);
    if (path !== null) {
      const row = byPathRow(path), pin = row.nextCurrent;
      const physical = readClosedFile(row.path);
      const committed = blobCacheSealed ? physical : pinnedBlob(pin.commit, row.path, pin, row.path + ' next-current mapped path',false);
      if (hash(physical) !== pin.sha256 || physical.length !== pin.sizeBytes || hash(committed) !== pin.sha256) {
        fail(row.path + ': fresh mapped current path differs from exact final-S2 state');
      }
      if (row.json) {
        let parsed; try { parsed = parseBytes(physical,'mapped current JSON'); } catch { fail(row.path + ': mapped current JSON is invalid'); }
        if (objectSha256(parsed) !== pin.objectSha256) fail(row.path + ': mapped current object fingerprint mismatch');
      }
    }
    return proof;
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
    const row = byPathRow(path); currentGuard(row.path);
    return kernel.normalizeBytes(row.path, value, row.nextCurrent);
  }
  function normalizeHistoricalMmBytes(path, value) {
    const row = byPathRow(path); currentGuard(row.path);
    return kernel.normalizeMmBytes(row.path, value, row.nextCurrent);
  }
  function normalizeVersion29HistoricalJson(path, value) {
    const row = byPathRow(path); currentGuard(row.path);
    return kernel.normalizeJson(row.path, value, row.nextCurrent);
  }
  function normalizeHistoricalMmJson(path, value) {
    const row = byPathRow(path); currentGuard(row.path);
    return kernel.normalizeMmJson(row.path, value, row.nextCurrent);
  }
  function isExactLegacyFacadeLiteral(path, value) {
    const row = byPathRow(path); currentGuard(row.path);
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
  function assertHistoricalHPreimage() {
    const proof = currentGuard();
    if(!blobCacheSealed)verifyHistoricalGitPreimages();
    return Object.freeze({status: 'verified-exact-next-to-MM-to-H-to-V29-bridge; historical data is never native current',
      s1SourceCommit: bridge.nativeSourceEpoch.sourceCommit,
      s2Commit: bridge.nativeSourceEpoch.finalS2Commit,
      currentS1Summary: detachedFrozenJson(proof.summary, 'native S1 summary'),
      historicalMMCommit: bridge.historicalEpochs.mm.snapshotCommit,
      historicalHCommit: bridge.historicalEpochs.historicalH.fullM1PreimageCommit,
      version29Commit: bridge.historicalEpochs.version29.baselineCommit,
      historicalPaths: bridge.exact22Rows.length,
      mmChangedPathsRestored: bridge.exact22Rows.filter(row => row.currentMm.sha256 !== row.historicalH.sha256).length});
  }
  return {normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson,
    normalizeHistoricalMmBytes, normalizeHistoricalMmJson,
    readVersion29HistoricalFile, readExactHistoricalMmPreimageFile, readExactHistoricalHPreimageFile,
    isVersion29HistoricalPath, isExactLegacyFacadeLiteral, assertHistoricalHPreimage, nativeCurrentProof: () => currentGuard()};
}

// The standalone native API remains explicitly current-stage and does not
// expose old Git preimages. Calling it has the same strict fresh qualification.
const reader = await createClosedReader();
export function assertCurrentClassMappingSourceEpoch() { return reader.nativeCurrentProof(); }
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
  assertHistoricalHPreimage,
} = reader;

