#!/usr/bin/env node
// Strict read-only S2 report binder. It is a successor proposal; the historical
// citation binder and v1 proposal are left byte-for-byte alone.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync, writeFileSync, mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {assertClassMappingCurrentSourceEpoch} from './class-mapping-current-source-gate-v1.mjs';
import {createRawGitReader, verifyRawCommit} from './class-mapping-raw-git-v1.mjs';
import {verifyCurrentConsumerCodeStageSeal,verifyCurrentConsumerMaterializedStageSeal} from './class-mapping-current-consumer-seal-verifier-v1.mjs';
import {assertRasterSnapshotMatchesGeometry,matchesTypedInlineNodeMechanicsEdge,validateCurrentMonetaryIndexDependencyClosure} from './class-mapping-report-runtime-guards-v1.mjs';
import {
  SOURCE_BODY_COMMIT, SOURCE_BODY_TREE, SOURCE_BODY_PARENT, SOURCE_BODY_PARENT_TREE,
  NATIVE_INSTALLED_CODE_PATHS, NATIVE_PIN_MODULE_PATH, NATIVE_RAW_GIT_HELPER_SHA256, REPORT_CODE_PATHS, REPORT_DATA_PATHS,
  PYTHON_DYNAMIC_LOCAL_EDGES, ASSEMBLY_DYNAMIC_LOCAL_EDGES, REPORT_OUTPUTS, REPORT_RECEIPT_PATH, readQualifierOptions,
  REPORT_OPTIONAL_DATA_PATHS,CURRENT_REPORT_LEGACY_ALIASES,
  REPORT_DATA_POINTER_EDGES,
  FIXED_DYNAMIC_IMPORT_GROUPS,
  HISTORICAL_RAW_GIT_READS,
  S2_CURRENT_ADAPTER_CODE_PATHS,S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES,S2_CURRENT_ADAPTER_MANIFEST_SHA256,S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE,
  CURRENT_MONETARY_SOURCE_INDEX_PATH,REPORT_DATA_EXPECTED_SHA256,
  CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,CURRENT_CONSUMER_FINAL_SEAL_PATH,
  CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,CURRENT_CONSUMER_PINS_PATH,
  POST_QCC_AUXILIARY_PATHS,
  SOURCE_SCAN_FRESH_OUTPUT_PATH,SOURCE_SCAN_LEGACY_ALIAS,
} from './class-mapping-report-input-contract-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Class-mapping report binder v2: ${message}`); };
const rawGit = createRawGitReader(root);
const git = (...args) => rawGit.git(...args);

function safeRepoPath(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(value) || value.startsWith('/')
      || value.split('/').some(part => !part || part === '.' || part === '..')) fail(`unsafe repository path ${String(value)}`);
  return value;
}
function physical(relativePath) {
  const file = safeRepoPath(relativePath), absolute = path.resolve(root, file), stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(absolute) !== absolute) fail(`${file}: expected regular non-symlink file`);
  return readFileSync(absolute);
}
function physicalOptional(relativePath){
  const file=safeRepoPath(relativePath),absolute=path.resolve(root,file);
  try{const stat=lstatSync(absolute);if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(absolute)!==absolute)fail(`${file}: expected regular non-symlink file`);return readFileSync(absolute);}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
}
function commitHeader(commit) {
  if (!/^[a-f0-9]{40}$/.test(commit || '')) fail('full lowercase SHA-1 commit required');
  const bytes = git('cat-file', 'commit', commit);
  const actual = createHash('sha1').update(`commit ${bytes.length}\0`).update(bytes).digest('hex');
  if (actual !== commit) fail(`${commit}: raw commit-object identity mismatch`);
  const head = bytes.toString('utf8').split('\n\n', 1)[0].split('\n');
  const trees = head.filter(row => row.startsWith('tree ')), parents = head.filter(row => row.startsWith('parent '));
  if (trees.length !== 1 || !/^[a-f0-9]{40}$/.test(trees[0].slice(5))) fail(`${commit}: malformed raw commit tree header`);
  if (!parents.every(row => /^parent [a-f0-9]{40}$/.test(row))) fail(`${commit}: malformed raw commit parent header`);
  return {tree:trees[0].slice(5),parents:parents.map(row => row.slice(7)),bytes};
}
function exactCommit(commit, expectedTree, label) {
  const header = commitHeader(commit);
  if (expectedTree && header.tree !== expectedTree) fail(`${label}: raw commit tree differs`);
  const resolved = git('rev-parse', '--verify', `${commit}^{commit}`).toString('utf8').trim();
  if (resolved !== commit) fail(`${label}: controlled Git view resolved a different commit`);
  return header;
}
const blobCache = new Map();
function gitBlob(commit, relativePath) {
  const file = safeRepoPath(relativePath), key = `${commit}\0${file}`;
  if (!blobCache.has(key)) blobCache.set(key, Buffer.from(git('show', `${commit}:${file}`)));
  return Buffer.from(blobCache.get(key));
}
function gitPathExists(commit, relativePath) {
  const file=safeRepoPath(relativePath),spec=`${commit}:${file}`;
  commitHeader(commit);
  try { git('cat-file','-e',spec); return true; }
  catch (error) {
    const stderr=Buffer.isBuffer(error?.stderr)?error.stderr.toString('utf8'):String(error?.stderr||'');
    if(error?.status===128 && [`fatal: path '${file}' does not exist in '${commit}'\n`,`fatal: path '${file}' exists on disk, but not in '${commit}'\n`].includes(stderr)) return false;
    fail(`${spec}: controlled Git could not establish exact tree-path presence (${stderr.trim()||error?.message||'unknown Git failure'})`);
  }
}
function assertRawAncestry(ancestor, descendant, label) {
  try { git('merge-base', '--is-ancestor', ancestor, descendant); }
  catch { fail(`${label}: raw controlled Git view does not prove ancestry`); }
}
function pathHashMap(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label}: plain path/hash map required`);
  const rows = [];
  for (const key of Object.keys(value).sort()) {
    const file = safeRepoPath(key), digest = value[key];
    if (!/^[a-f0-9]{64}$/.test(digest || '')) fail(`${file}: malformed ${label} digest`);
    rows.push({path:file,sha256:digest});
  }
  return rows;
}
function parsedJson(bytes, label) {
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail(`${label}: invalid UTF-8 JSON`); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${label}: expected JSON object`);
  return value;
}
function parsedHash(value) { return sha(Buffer.from(JSON.stringify(value))); }
function oneRelativeSpecifierResolution(importer, specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return null;
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (resolved === '..' || resolved.startsWith('../') || resolved.startsWith('/')) fail(`${importer}: relative import escapes repository: ${specifier}`);
  return safeRepoPath(resolved);
}
function staticRelativeImports(source, importer) {
  const found = new Set(), re = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  for (const match of source.matchAll(re)) {
    const resolved = oneRelativeSpecifierResolution(importer, match[1]);
    if (!resolved) continue;
    if (!path.posix.extname(resolved)) {
      const candidates = ['.mjs','.js','.json','.py'].map(ext => resolved + ext);
      // Extensionless local imports must have a single listed resolution.
      const inClosure = candidates.filter(candidate => closurePathSet.has(candidate) || bodyPathSet.has(candidate));
      if (inClosure.length !== 1) fail(`${importer}: extensionless import ${match[1]} does not resolve uniquely in the closed manifest`);
      found.add(inClosure[0]);
    } else found.add(resolved);
  }
  // The production pre-coverage adapter imports one fixed, reviewed module
  // array via file URLs. Admit only that exact importer, array and call form.
  if (/\bimport\s*\(\s*(?!['"])/.test(source)) {
    const edge=FIXED_DYNAMIC_IMPORT_GROUPS.find(row=>row.from===importer);
    if(!edge)fail(`${importer}: nonliteral dynamic import needs a typed closure edge`);
    const array=source.match(/const\s+modulePaths\s*=\s*\[([\s\S]*?)\]\s*;/);
    const paths=array?[...array[1].matchAll(/['"]([^'"]+)['"]/g)].map(match=>match[1]):[];
    const expectedCall=['modulePaths.map(path => import','pathToFileURL(inside(root, path)).href))'].join('(');
    if(!isDeepStrictEqual(paths,edge.paths)||!source.includes(expectedCall))fail(`${importer}: dynamic import differs from the exact typed modulePaths group`);
    for(const file of edge.paths)found.add(file);
  }
  return [...found].sort();
}
const closurePathSet = new Set(REPORT_CODE_PATHS);
const postQccPathSet=new Set(POST_QCC_AUXILIARY_PATHS);
let bodyPathSet = new Set();
function assertProducerClosure(codeBlobs, sourceBodyRows) {
  bodyPathSet = new Set(sourceBodyRows.map(row => row.path));
  for (const file of REPORT_CODE_PATHS) {
    if (!codeBlobs.has(file)) fail(`${file}: absent from raw QCC closure`);
    if (!/\.(?:mjs|js)$/.test(file)) continue;
    const source = codeBlobs.get(file).toString('utf8');
    for (const imported of staticRelativeImports(source, file)) {
      if (!closurePathSet.has(imported) && !bodyPathSet.has(imported) && !postQccPathSet.has(imported)) fail(`${file}: unpinned local import ${imported}`);
      if (!codeBlobs.has(imported) && !bodyPathSet.has(imported) && !postQccPathSet.has(imported)) fail(`${file}: import ${imported} has no blob in the typed closure`);
    }
  }
  for (const edge of PYTHON_DYNAMIC_LOCAL_EDGES) {
    if (!closurePathSet.has(edge.from) || !closurePathSet.has(edge.to)) fail(`Python/local edge not closed: ${edge.from} -> ${edge.to}`);
    const source = codeBlobs.get(edge.from)?.toString('utf8');
    if (!source) fail(`${edge.from}: typed Python producer path has no raw QCC blob`);
    if (edge.mechanism.includes('spec_from_file_location') && (!source.includes('spec_from_file_location') || !source.includes(path.posix.basename(edge.to)))) fail(`${edge.from}: declared dynamic module edge is absent from its source`);
    if (edge.mechanism.includes('Python import') && !source.includes('from crop_geometry import')) fail(`${edge.from}: declared crop_geometry import is absent`);
    if (edge.mechanism.includes('inline Node import') && !matchesTypedInlineNodeMechanicsEdge(source)) fail(`${edge.from}: declared inline Node mechanics edge is absent or differs from its fixed argv/import form`);
  }
  for(const edge of ASSEMBLY_DYNAMIC_LOCAL_EDGES){
    if(!closurePathSet.has(edge.from)||!closurePathSet.has(edge.to))fail(`assembly dynamic edge not closed: ${edge.from} -> ${edge.to}`);
    const source=codeBlobs.get(edge.from)?.toString('utf8');
    if(!source||!source.includes(path.posix.basename(edge.to))||!source.includes('import('))fail(`${edge.from}: declared assembly dynamic import is absent`);
  }
}
function assertFreshOutputPath(file, seals, sourceCommit, codeCommit, headCommit, allowHeadOutput=false) {
  const p = safeRepoPath(file);
  if (seals.has(p)) fail(`${p}: protected by a citation-evidence seal`);
  if (gitPathExists(sourceCommit,p) || gitPathExists(codeCommit,p)) fail(`${p}: output path already exists in S1 or QCC`);
  if(!allowHeadOutput&&gitPathExists(headCommit,p))fail(`${p}: output path already exists in the sealed current-consumer HEAD`);
}
function collectOutput(output, binding, seals, sourceCommit, codeCommit, headCommit, consumerSeal, allowHeadOutputs=false) {
  const file = safeRepoPath(output.path);
  if (file === REPORT_RECEIPT_PATH) fail('metadata receipt may not be included in its own output list');
  const transition=output.stage==='post-QCC-metadata-prerequisite';
  assertFreshOutputPath(file,seals,sourceCommit,codeCommit,headCommit,transition||allowHeadOutputs);
  const bytes = physical(file);
  if(allowHeadOutputs&&!gitBlob(headCommit,file).equals(bytes))fail(`${file}: committed report output differs from actual raw HEAD blob`);
  if(transition&&(consumerSeal.transitionReceipt.path!==file||consumerSeal.transitionReceipt.sha256!==sha(bytes)||!gitBlob(headCommit,file).equals(bytes)))fail(`${file}: transition receipt differs from the fixed final-seal receipt pin`);
  const row = {path:file,kind:output.kind,format:output.format,producerPath:output.producerPath,stage:output.stage,rawSha256:sha(bytes),sizeBytes:bytes.length};
  if (!binding.producerPaths.has(output.producerPath)) fail(`${file}: producer is outside the complete producer closure`);
  if (output.format === 'json') {
    const value = parsedJson(bytes,file);
    row.parsedObjectSha256 = parsedHash(value);
  } else if (output.format === 'gzip-json') {
    let inflated;
    try { inflated = gunzipSync(bytes); } catch { fail(`${file}: invalid gzip JSON`); }
    const value = parsedJson(inflated,`${file} decompressed JSON`);
    row.uncompressedSha256 = sha(inflated);
    row.parsedObjectSha256 = parsedHash(value);
  } else if (output.format !== 'markdown') fail(`${file}: unsupported output format ${output.format}`);
  return row;
}
function externalSourcePdfPins() {
  const geometryPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/geometry/source-visual-audit-next-native-v2.json';
  const rasterPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/raster/source-raster-boundary.json.gz';
  const geometry=parsedJson(physical(geometryPath),geometryPath);
  let raster;try{raster=parsedJson(gunzipSync(physical(rasterPath)),`${rasterPath} decompressed JSON`);}catch{fail('fresh raster boundary must be gzip JSON');}
  const expectedBooks=['DMG','MM','MM2','PHB','UA'];
  const pins=geometry.sourcePdfSha256;
  if(!pins||typeof pins!=='object'||Array.isArray(pins)||Object.getPrototypeOf(pins)!==Object.prototype
      ||JSON.stringify(Object.keys(pins).sort())!==JSON.stringify(expectedBooks)
      ||expectedBooks.some(book=>!/^[a-f0-9]{64}$/.test(pins[book]||'')))fail('geometry report must identify all five external source PDFs by SHA-256');
  assertRasterSnapshotMatchesGeometry(raster,pins);
  return {sourcePdfSha256:Object.fromEntries(expectedBooks.map(book=>[book,pins[book]])),sourceDirectoryPath:null,sourceDirectoryRecorded:false,identityBasis:'fresh geometry and raster output bytes; private source files are not copied into the repository'};
}
function sealedPathSet() {
  const sealDoc = parsedJson(physical('research/citation-evidence-seals.json'),'citation evidence seal ledger');
  if (!Array.isArray(sealDoc.seals)) fail('citation evidence seal ledger has no seals array');
  const paths = new Set();
  for (const row of sealDoc.seals) {
    const file = safeRepoPath(row?.path);
    if (paths.has(file)) fail(`duplicate evidence seal path ${file}`);
    paths.add(file);
  }
  return paths;
}
function qualifiedCounts(native) {
  const inputs = native?.inputs;
  if (!inputs?.data || !inputs?.inventory || !inputs?.manual || !inputs?.mechanics) fail('native gate did not return its complete qualified snapshot');
  const data=inputs.data,inventory=inputs.inventory,manual=inputs.manual,mechanics=inputs.mechanics;
  const collections=['rules','spells','equipment','classes','matrices'];
  const ownersByCollection=Object.fromEntries(collections.map(key=>{
    if (!Array.isArray(data[key])) fail(`qualified source snapshot lacks ${key}`);
    return [key,data[key].length];
  }));
  ownersByCollection.progressionExplainer=data.progressionExplainer?1:0;
  if (!Array.isArray(inventory.fieldEvidenceBindings)||!Array.isArray(manual.bindings)||!Array.isArray(mechanics.records)||!Array.isArray(mechanics.reviewRecords)) fail('qualified source arrays are incomplete');
  const counts=values=>{const out={};for(const value of values){if(typeof value!=='string')fail('non-string qualified status');out[value]=(out[value]||0)+1;}return Object.fromEntries(Object.entries(out).sort(([a],[b])=>a.localeCompare(b)));};
  let total=0,unchecked=0;
  for(const record of mechanics.records){if(!Array.isArray(record.fields))fail('mechanics record lacks fields');total+=record.fields.length;unchecked+=record.fields.filter(field=>field.status==='unchecked').length;}
  return {ownersByCollection,owners:Object.values(ownersByCollection).reduce((a,b)=>a+b,0),canonicalBindings:inventory.fieldEvidenceBindings.length,canonicalReviewStatuses:counts(inventory.fieldEvidenceBindings.map(row=>row.reviewStatus)),manualBindings:manual.bindings.length,manualReviewStatuses:counts(manual.bindings.map(row=>row.reviewStatus)),mechanics:{records:mechanics.records.length,totalFields:total,uncheckedFields:unchecked,reviewRecords:mechanics.reviewRecords.length}};
}
function assertBodyClosure(native, sourceCommit, sourceTree) {
  const rows=pathHashMap(native?.inputHashes?.sourceBody,'native sourceBody'),required={
    'dist/data.json':'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573',
    'research/price-source-inventory.json':'b32a8f8126e73b28fd0609fc7e0856990a454402b440735a77627f26fe986564',
    'research/field-evidence-bindings.json':'dc8a912cd1054572257e83b654cedb63c8d2d6ff29f327ce0151498b4ad59827',
    'research/mechanics-audit-progress.json':'03643330c73dc3fe88f9abeb8a086883a3955d918cba2573e198563631a75785',
  };
  if (native?.summary?.sourceCommit!==SOURCE_BODY_COMMIT || sourceCommit!==SOURCE_BODY_COMMIT || native?.summary?.sourceTree!==SOURCE_BODY_TREE || sourceTree!==SOURCE_BODY_TREE) fail('qualified S1 identity differs from the actual root-verified body commit/tree');
  if (Object.keys(required).some(file=>!rows.some(row=>row.path===file&&row.sha256===required[file]))) fail('known S1 core output pins differ from the measured sourceBody map');
  const result=[];
  for(const row of rows){
    const blob=gitBlob(sourceCommit,row.path),live=physical(row.path);
    if(sha(blob)!==row.sha256||!blob.equals(live))fail(`${row.path}: native sourceBody pin, actual S1 Git blob and physical bytes do not match`);
    result.push({...row,sizeBytes:blob.length,gitBlobSha256:sha(blob),physicalSha256:sha(live)});
  }
  return result;
}

async function buildReceiptCore(options,{allowHeadOutputs=false}={}) {
  // This is intentionally the first operation on the public argument. No
  // destructuring, spread, property read or native gate call precedes it.
  const qualifierCodeCommit=readQualifierOptions(options);
  const codeStageSeal=verifyCurrentConsumerCodeStageSeal();
  const consumerSeal=verifyCurrentConsumerMaterializedStageSeal();
  if(consumerSeal.qualifierCode.commit!==qualifierCodeCommit||codeStageSeal.qualifierCode.commit!==qualifierCodeCommit)fail('caller QCC does not equal the actual-HEAD code-stage and materialized seals');
  // Verify the materialized pin module through the owner runtime only after
  // the fixed no-argument trust verifier has accepted both seals.
  const currentRuntime=await import('./class-mapping-current-consumer-runtime-v1.mjs');
  const currentStage=currentRuntime.qualifyCurrentConsumerStage();
  if(currentStage.consumerPins?.qualifierCodeCommit!==qualifierCodeCommit
      ||currentStage.summary?.sourceCommit!==consumerSeal.sourceEpoch.sourceCommit
      ||currentStage.summary?.sourceTree!==consumerSeal.sourceEpoch.sourceTree)fail('current adapter runtime did not qualify the exact materialized S1/QCC pins');
  const headCommit=consumerSeal.head;
  rawGit.assertView();
  if (realpathSync(root)!==root || path.resolve(git('rev-parse','--show-toplevel').toString('utf8').trim())!==root) fail('fixed physical repository root required');
  const native=assertClassMappingCurrentSourceEpoch();
  const sourceCommit=native?.summary?.sourceCommit, sourceTree=native?.summary?.sourceTree;
  const s1Header=exactCommit(sourceCommit,SOURCE_BODY_TREE,'S1 source body');
  const parentHeader=exactCommit(SOURCE_BODY_PARENT,SOURCE_BODY_PARENT_TREE,'S1 direct parent');
  verifyRawCommit(s1Header.bytes,sourceCommit,SOURCE_BODY_TREE,SOURCE_BODY_PARENT);
  if(s1Header.parents.length!==1 || s1Header.parents[0]!==SOURCE_BODY_PARENT) fail('S1 direct parent differs from recorded parent');
  if(parentHeader.tree!==SOURCE_BODY_PARENT_TREE) fail('raw S1 direct parent tree differs from recorded parent tree');
  if(sourceCommit!==SOURCE_BODY_COMMIT||sourceTree!==SOURCE_BODY_TREE) fail('native current source identity does not equal actual S1');
  if(native?.summary?.sourceCommit!==consumerSeal.sourceEpoch.sourceCommit||native?.summary?.sourceTree!==consumerSeal.sourceEpoch.sourceTree
      ||native?.summary?.fixture?.path!==consumerSeal.sourceEpoch.fixture.path||native?.summary?.fixture?.sha256!==consumerSeal.sourceEpoch.fixture.sha256)fail('final seals do not match the per-call native S1 fixture identity');
  const qccHeader=exactCommit(qualifierCodeCommit,null,'S2 QUALIFIER_CODE_COMMIT');
  if(qualifierCodeCommit===sourceCommit) fail('QUALIFIER_CODE_COMMIT must be distinct from S1');
  if(qccHeader.parents.length!==1||qccHeader.parents[0]!==sourceCommit)fail('QCC must be a raw single-parent child of the exact S1 body commit');
  if(qccHeader.tree!==consumerSeal.qualifierCode.tree)fail('QCC raw tree differs from both current-consumer stage seals');
  const qualifierTree=qccHeader.tree;
  assertRawAncestry(sourceCommit,qualifierCodeCommit,'S1 -> S2');
  assertRawAncestry(qualifierCodeCommit,'HEAD','S2 -> current HEAD');

  const sourceBody=assertBodyClosure(native,sourceCommit,sourceTree);
  const sourceBodyPathMap=new Map(sourceBody.map(row=>[row.path,row]));
  const installed=pathHashMap(native?.inputHashes?.installedCode,'native installedCode');
  if(JSON.stringify(installed.map(row=>row.path).sort())!==JSON.stringify([...NATIVE_INSTALLED_CODE_PATHS].sort())) fail('native installedCode closure differs from its exact six-path contract');
  const codePaths=[...new Set(REPORT_CODE_PATHS)];
  if(codePaths.length!==REPORT_CODE_PATHS.length) fail('producer code closure has duplicate paths');
  const codeBlobs=new Map(),codeRows=[];
  for(const file of codePaths){
    safeRepoPath(file);
    const blob=gitBlob(qualifierCodeCommit,file),live=physical(file);
    if(!blob.equals(live))fail(`${file}: QCC code blob differs from current physical bytes`);
    const nativePin=installed.find(row=>row.path===file);
    if(nativePin&&nativePin.sha256!==sha(blob))fail(`${file}: QCC code differs from native installedCode pin`);
    if(file==='tools/class-mapping-raw-git-v1.mjs'&&sha(blob)!==NATIVE_RAW_GIT_HELPER_SHA256)fail('shared controlled raw-Git helper bytes differ from the reviewed helper SHA');
    if(file===S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE.path&&sha(blob)!==S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE.newSha256)fail('current monetary kernel bytes differ from the independently reviewed exact-literal correction');
    if(S2_CURRENT_ADAPTER_CODE_PATHS.includes(file)&&sha(blob)!==S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES[file])fail(`${file}: QCC bytes differ from the frozen v7 19-path adapter review pins plus exact reviewed kernel-literal correction (${S2_CURRENT_ADAPTER_MANIFEST_SHA256})`);
    const s1Pin=sourceBodyPathMap.get(file);
    if(s1Pin&&s1Pin.sha256!==sha(blob))fail(`${file}: overlapping S1/QCC path has unequal blobs; re-stage or restructure`);
    codeBlobs.set(file,blob);
    codeRows.push({path:file,role:nativePin?'native-installed-code-and-report-runtime':file===NATIVE_PIN_MODULE_PATH?'native-pin-module-external-self-pin':'S2-report-producer-code',sha256:sha(blob),sizeBytes:blob.length,...(nativePin?{nativeInstalledCodeSha256:nativePin.sha256}:{}),...(s1Pin?{s1BodySha256:s1Pin.sha256,s1QccPhysicalEquality:true}:{})});
  }
  if(installed.some(row=>!codeBlobs.has(row.path))) fail('native installedCode omitted from the QCC report closure');
  if(JSON.stringify([...S2_CURRENT_ADAPTER_CODE_PATHS].sort())!==JSON.stringify(Object.keys(S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES).sort()))fail('frozen v7 adapter review hash map does not exactly cover the 19-path code set');
  assertProducerClosure(codeBlobs,sourceBody);

  const adapterDataRows=[];
  for(const file of REPORT_DATA_PATHS){
    const blob=gitBlob(qualifierCodeCommit,file),live=physical(file);
    if(!blob.equals(live))fail(`${file}: QCC adapter contract/baseline differs from current bytes`);
    if(REPORT_DATA_EXPECTED_SHA256[file]&&sha(blob)!==REPORT_DATA_EXPECTED_SHA256[file])fail(`${file}: fixed monetary-index, frame, question-contract, or kernel-review data pin differs from the reviewed artifact`);
    adapterDataRows.push({path:file,sha256:sha(blob),sizeBytes:blob.length,stage:'S2-static-adapter-data'});
  }
  const monetaryIndexDependencyClosure=validateCurrentMonetaryIndexDependencyClosure(
    physical(CURRENT_MONETARY_SOURCE_INDEX_PATH),qualifierCodeCommit,sourceBody,
    physical,(file,commit)=>gitBlob(commit,file),
  );
  const reportDataPointerRows=[];
  for(const edge of REPORT_DATA_POINTER_EDGES){
    if(!REPORT_DATA_PATHS.includes(edge.sourcePath)||!REPORT_DATA_PATHS.includes(edge.targetPath))fail(`typed report-data pointer is not closed: ${edge.sourcePath} ${edge.pointer} -> ${edge.targetPath}`);
    const source=parsedJson(physical(edge.sourcePath),edge.sourcePath),parts=edge.pointer.slice(1).split('/');let value=source;
    for(const part of parts){if(!value||typeof value!=='object'||!Object.hasOwn(value,part)){value=null;break;}value=value[part];}
    if(!value||value.path!==edge.targetPath||!/^[a-f0-9]{64}$/.test(value.sha256||''))fail(`${edge.sourcePath}${edge.pointer}: unexpected exact report-data target or digest`);
    const bytes=physical(edge.targetPath),blob=gitBlob(qualifierCodeCommit,edge.targetPath);
    if(!blob.equals(bytes)||sha(bytes)!==value.sha256)fail(`${edge.targetPath}: typed report-data pointer target differs from declared/current QCC bytes`);
    reportDataPointerRows.push({sourcePath:edge.sourcePath,pointer:edge.pointer,path:edge.targetPath,sha256:sha(bytes),sizeBytes:bytes.length,stage:'S2-pointer-resolved-report-data'});
  }
  const historicalCommits=[...new Set(HISTORICAL_RAW_GIT_READS.map(row=>row.commit))];
  if(historicalCommits.length!==1)fail('historical raw-Git input set must bind one fixed baseline commit');
  const historicalCommit=historicalCommits[0],historicalHeader=commitHeader(historicalCommit),historicalRows=[];
  for(const row of HISTORICAL_RAW_GIT_READS){
    const bytes=gitBlob(historicalCommit,row.path);let pointerBinding=null;
    if(row.sourcePath){
      if(!REPORT_DATA_PATHS.includes(row.sourcePath))fail(`${row.sourcePath}: historical raw-Git pointer source is not statically QCC-pinned`);
      const source=parsedJson(physical(row.sourcePath),row.sourcePath),readPointer=pointer=>{let value=source;for(const part of pointer.slice(1).split('/')){if(!value||typeof value!=='object'||!Object.hasOwn(value,part))return undefined;value=value[part];}return value;};
      const commitValue=readPointer(row.commitPointer),pathValue=readPointer(row.pathPointer),digestValue=readPointer(row.shaPointer);
      if(commitValue!==historicalCommit||pathValue!==row.path||!/^[a-f0-9]{64}$/.test(digestValue||'')||sha(bytes)!==digestValue)fail(`${row.sourcePath}: historical raw-Git commit/path/hash pointer differs from the exact typed baseline`);
      pointerBinding={sourcePath:row.sourcePath,commitPointer:row.commitPointer,pathPointer:row.pathPointer,shaPointer:row.shaPointer};
    }
    historicalRows.push({path:row.path,role:row.role,sha256:sha(bytes),sizeBytes:bytes.length,...(pointerBinding?{pointerBinding}:{})});
  }
  const historicalData=parsedJson(gitBlob(historicalCommit,'dist/data.json'),'historical baseline dist/data.json');
  const historicalHandoff=parsedJson(gitBlob(historicalCommit,'research/gaps-limitations-next-task.json'),'historical baseline gaps handoff');
  if(historicalHandoff.snapshot?.rawDistDataFileSha256!==historicalRows.find(row=>row.path==='dist/data.json')?.sha256
      ||historicalHandoff.snapshot?.parsedDataSha256!==parsedHash(historicalData))fail('fixed historical handoff baseline does not bind the exact historical data blob');
  const repairPointerPath='research/current-source-audit-status.json';
  const repairPointer=parsedJson(physical(repairPointerPath),repairPointerPath);
  const repairRef=repairPointer.currentRepairRegister;
  if(repairPointer.schemaVersion!==1||repairPointer.artifactType!=='current-vault-source-audit-status'
      ||!/^research\/source-completeness-repairs-version[1-9]\d*\.json$/.test(repairRef?.path||'')
      ||!/^[a-f0-9]{64}$/.test(repairRef?.sha256||''))fail('current repair-register pointer has an invalid exact path or SHA-256');
  const repairBytes=physical(repairRef.path),repairBlob=gitBlob(qualifierCodeCommit,repairRef.path);
  if(!repairBlob.equals(repairBytes)||sha(repairBytes)!==repairRef.sha256)fail('current repair-register pointer target differs from its raw QCC blob or declared digest');
  adapterDataRows.push({path:repairRef.path,sha256:sha(repairBytes),sizeBytes:repairBytes.length,stage:'S2-dynamic-current-repair-register'});
  const optionalDataRows=[];
  for(const file of REPORT_OPTIONAL_DATA_PATHS){
    const live=physicalOptional(file),present=gitPathExists(qualifierCodeCommit,file);
    if((live!==null)!==present)fail(`${file}: optional QCC/physical presence differs`);
    if(present){const blob=gitBlob(qualifierCodeCommit,file);if(!blob.equals(live))fail(`${file}: optional QCC input differs from physical bytes`);optionalDataRows.push({path:file,present:true,sha256:sha(live),sizeBytes:live.length,stage:'S2-optional-report-data'});}
    else optionalDataRows.push({path:file,present:false,sha256:null,sizeBytes:null,stage:'S2-optional-report-data'});
  }
  const qualificationMetadata=pathHashMap(native?.inputHashes?.qualificationMetadata||{},'native qualificationMetadata');
  const qualificationRows=[];
  for(const row of qualificationMetadata){
    const blob=gitBlob(qualifierCodeCommit,row.path),live=physical(row.path);
    if(sha(blob)!==row.sha256||!blob.equals(live))fail(`${row.path}: native qualification metadata must be present, QCC-committed and physically fresh`);
    qualificationRows.push({...row,sizeBytes:blob.length,stage:'native-qualification-metadata'});
  }
  const nativeFixturePath=safeRepoPath(native?.summary?.fixture?.path);
  const nativeFixtureBytes=physical(nativeFixturePath);
  if(sha(nativeFixtureBytes)!==native?.summary?.fixture?.sha256||!gitBlob(qualifierCodeCommit,nativeFixturePath).equals(nativeFixtureBytes)) fail('native body fixture is not byte-pinned in the actual S2 commit');

  const seals=sealedPathSet();
  const receiptPath=safeRepoPath(REPORT_RECEIPT_PATH);
  assertFreshOutputPath(receiptPath,seals,sourceCommit,qualifierCodeCommit,headCommit,allowHeadOutputs);
  if(REPORT_OUTPUTS.some(row=>row.path===receiptPath)) fail('receipt path is listed as its own report output');
  const producerPaths=new Set(codePaths);
  const outputs=[];
  for(const output of REPORT_OUTPUTS){
    if(sourceBodyPathMap.has(output.path)||codePaths.includes(output.path)||REPORT_DATA_PATHS.includes(output.path)) fail(`${output.path}: output overlaps an S1 or S2 input (cycle)`);
    outputs.push(collectOutput(output,{producerPaths},seals,sourceCommit,qualifierCodeCommit,headCommit,consumerSeal,allowHeadOutputs));
  }
  for(const row of outputs){
    if(seals.has(row.path))fail(`${row.path}: protected output`);
  }
  const externalSources=externalSourcePdfPins();
  const after=assertClassMappingCurrentSourceEpoch();
  const sealAfter=verifyCurrentConsumerMaterializedStageSeal();
  if(sealAfter.head!==headCommit||sealAfter.qualifierCode.commit!==qualifierCodeCommit||sealAfter.seal.sha256!==consumerSeal.seal.sha256)fail('fixed final consumer seal or HEAD changed during report receipt construction');
  if(after?.summary?.sourceCommit!==sourceCommit||after?.summary?.sourceTree!==sourceTree)fail('native S1 identity changed during receipt construction');
  for(const row of sourceBody){if(!physical(row.path).equals(gitBlob(sourceCommit,row.path)))fail(`${row.path}: changed during report receipt collection`);}
  for(const row of codeRows){if(!physical(row.path).equals(gitBlob(qualifierCodeCommit,row.path)))fail(`${row.path}: QCC producer changed during receipt collection`);}
  for(const row of adapterDataRows){if(!physical(row.path).equals(gitBlob(qualifierCodeCommit,row.path)))fail(`${row.path}: QCC adapter data changed during receipt collection`);}
  for(const row of reportDataPointerRows){const bytes=physical(row.path);if(!bytes.equals(gitBlob(qualifierCodeCommit,row.path))||sha(bytes)!==row.sha256)fail(`${row.path}: pointer-resolved report data changed during receipt collection`);}
  for(const row of optionalDataRows){const live=physicalOptional(row.path);if(row.present?(!live||sha(live)!==row.sha256||!live.equals(gitBlob(qualifierCodeCommit,row.path))):(live!==null||gitPathExists(qualifierCodeCommit,row.path)))fail(`${row.path}: optional report-data state changed during receipt collection`);}
  for(const row of outputs){const bytes=physical(row.path);if(sha(bytes)!==row.rawSha256||bytes.length!==row.sizeBytes)fail(`${row.path}: report output changed during receipt collection`);}

  return {
    schemaVersion:2,
    artifactType:'Typed class-mapping S2 report-input and current-snapshot receipt',
    status:'candidate; actual output pins only; semantic review and native positive remain independent gates',
    sourceEpoch:{sourceBody:{stage:'S1-body',commit:sourceCommit,tree:sourceTree,directParent:SOURCE_BODY_PARENT,directParentTree:SOURCE_BODY_PARENT_TREE,sourceDataRawSha256:sourceBodyPathMap.get('dist/data.json')?.sha256,inputs:sourceBody},qualifiedCounts:qualifiedCounts(native)},
    qualifierProducer:{stage:'S2-QUALIFIER_CODE_COMMIT',commit:qualifierCodeCommit,tree:qualifierTree,ancestry:{sourceBodyCommit:sourceCommit,isDirectParentOfQcc:true,isAncestorOfQcc:true,qccIsAncestorOfCurrentHead:true,headMayBeSingleParentOrTwoParentMerge:true},codeClosure:codeRows,staticAdapterData:adapterDataRows,adapterKernelCorrection:S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE,monetaryIndexDependencyClosure,reportDataPointers:reportDataPointerRows,historicalRawGitReads:{commit:historicalCommit,tree:historicalHeader.tree,parents:historicalHeader.parents,paths:historicalRows},optionalReportData:optionalDataRows,nativeQualificationMetadata:qualificationRows,nativeFixture:{path:nativeFixturePath,sha256:sha(nativeFixtureBytes),sizeBytes:nativeFixtureBytes.length}},
    currentConsumer:{stage:'materialized current-consumer seal',sourceEpoch:consumerSeal.sourceEpoch,qualifierCode:consumerSeal.qualifierCode,
      codeStageSeal:{path:CURRENT_CONSUMER_CODE_STAGE_SEAL_PATH,sha256:codeStageSeal.codeStageSeal.sha256},
      materializedSeal:{path:CURRENT_CONSUMER_FINAL_SEAL_PATH,sha256:consumerSeal.seal.sha256},
      currentConsumerPinModule:consumerSeal.currentConsumerPinModule,codeStagePinModule:{path:CURRENT_CONSUMER_CODE_STAGE_PINS_PATH,sha256:sha(physical(CURRENT_CONSUMER_CODE_STAGE_PINS_PATH))},
      materializedPinModule:{path:CURRENT_CONSUMER_PINS_PATH,sha256:consumerSeal.currentConsumerPinModule.sha256},transitionReceipt:consumerSeal.transitionReceipt},
    sourceScanLegacyAlias:{...SOURCE_SCAN_LEGACY_ALIAS,rawSha256:outputs.find(row=>row.path===SOURCE_SCAN_FRESH_OUTPUT_PATH)?.rawSha256||null},
    currentReportLegacyAliases:CURRENT_REPORT_LEGACY_ALIASES.map(alias=>({...alias,rawSha256:outputs.find(row=>row.path===alias.physicalPath)?.rawSha256||null})),
    outputs,
    externalSources,
    hashDomains:{raw:'SHA-256 over exact file bytes',parsedObject:'SHA-256 over UTF-8 JSON.stringify(JSON.parse(raw bytes))',gzipJson:'record raw gzip SHA-256, uncompressed JSON SHA-256 and parsed-object SHA-256; raw SHA is the transport pin',canonicalInvariant:'not inferred or substituted for raw/parsed-object hashes'},
    semantics:{semanticPass:false,sourceCompletenessCertified:false,visualReviewPromoted:false,unresolvedFindingsPreserved:true},
    cycleGuards:{receiptSelfHashExcluded:receiptPath,outputsAbsentFromS1AndQcc:true,transitionReceiptMatchesFinalSeal:true,reportArtifactsNotInSourceBody:true,qualifierCodeCommitDistinctFromS1:true,outputRowsDoNotSelfAssertTheirBinderReceipt:true,currentHeadSealMayBeOneOrTwoParentMergeCommit:true},
    history:{legacyCitationBinderChanged:false,v1ProposalChanged:false,frozenMmFixturesOrReadersChanged:false,sealedEvidenceRewritten:false},
    unknownUntilQualified:{nextCanonicalCounts:null,sourceSemanticCounts:null,wholeBookCertification:null},
  };
}

export async function buildClassMappingReportReceipt(options) {
  return await buildReceiptCore(options,{allowHeadOutputs:false});
}

export async function verifyCommittedClassMappingReportReceipt(...args) {
  if(args.length)fail('committed report verifier accepts no caller inputs');
  rawGit.assertView();
  const consumerSeal=verifyCurrentConsumerMaterializedStageSeal();
  const receiptBytes=physical(REPORT_RECEIPT_PATH),committedReceiptBytes=gitBlob(consumerSeal.head,REPORT_RECEIPT_PATH);
  if(!receiptBytes.equals(committedReceiptBytes))fail('physical metadata receipt differs from the exact raw HEAD blob');
  let committed;
  try{committed=JSON.parse(receiptBytes.toString('utf8'));}catch{fail('committed metadata receipt is invalid JSON');}
  if(!committed?.qualifierProducer?.commit)fail('committed report receipt lacks its actual QCC identity');
  const expected=await buildReceiptCore({qualifierCodeCommit:committed.qualifierProducer.commit},{allowHeadOutputs:true});
  if(!isDeepStrictEqual(committed,expected))fail('committed metadata receipt does not exactly match the rederived current S1/QCC/seal/report closure');
  const canonical=Buffer.from(JSON.stringify(committed,null,2)+'\n');
  if(!canonical.equals(receiptBytes))fail('committed metadata receipt is not the exact canonical pretty-JSON artifact');
  rawGit.assertView();
  return Object.freeze({path:REPORT_RECEIPT_PATH,sha256:sha(receiptBytes),sourceCommit:expected.sourceEpoch.sourceBody.commit,
    sourceTree:expected.sourceEpoch.sourceBody.tree,qualifierCodeCommit:expected.qualifierProducer.commit,
    headCommit:consumerSeal.head,sourceScanAlias:expected.sourceScanLegacyAlias,receipt:committed});
}

async function main(){
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--qualifier-code-commit')fail('usage: node tools/bind-class-mapping-source-audit-input-commit-v2.mjs --qualifier-code-commit <40-hex-commit>');
  const receipt=await buildClassMappingReportReceipt({qualifierCodeCommit:argv[1]});
  const target=path.resolve(root,safeRepoPath(REPORT_RECEIPT_PATH));
  mkdirSync(path.dirname(target),{recursive:true});
  const bytes=Buffer.from(JSON.stringify(receipt,null,2)+'\n');
  writeFileSync(target,bytes,{flag:'wx'});
  console.log(JSON.stringify({path:REPORT_RECEIPT_PATH,sha256:sha(bytes),s1Commit:receipt.sourceEpoch.sourceBody.commit,qccCommit:receipt.qualifierProducer.commit,outputCount:receipt.outputs.length,semanticPass:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
