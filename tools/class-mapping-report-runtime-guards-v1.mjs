import {accessSync,constants,lstatSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {controlledGitEnvironment} from './class-mapping-raw-git-v1.mjs';
import {isDeepStrictEqual,types} from 'node:util';
import {
  CURRENT_MONETARY_INDEX_DEPENDENCY_ARRAYS,CURRENT_MONETARY_INDEX_DEPENDENCY_COUNTS,
  CURRENT_MONETARY_SOURCE_INDEX_PATH,CURRENT_MONETARY_SOURCE_INDEX_SHA256,
  CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH,CURRENT_MONETARY_SOURCE_RENDER_FRAMES_SHA256,
  REPORT_CODE_PATHS,REPORT_DATA_PATHS,REPORT_DATA_EXPECTED_SHA256,
  S2_CURRENT_ADAPTER_CODE_PATHS,S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES,
} from './class-mapping-report-input-contract-v2.mjs';

const INLINE_SCRIPT_DECLARATION=/^[ \t]*script[ \t]*=[ \t]*"""([\s\S]*?)"""[ \t]*$/gm;
const INLINE_NODE_INVOCATION=/subprocess\.run\s*\(\s*\[\s*"node"\s*,\s*"--input-type=module"\s*,\s*"-e"\s*,\s*script\s*\]\s*,\s*cwd\s*=\s*root\s*,\s*capture_output\s*=\s*True\s*,\s*text\s*=\s*True\s*\)/g;
const NODE_COMMAND_PREFIX=/subprocess\.run\s*\(\s*\[\s*["']node["']/g;
const MECHANICS_IMPORT=/^[ \t]*import\s*\{\s*fieldsFor\s*\}\s*from\s*['"]\.\/tools\/mechanics-audit\.mjs['"][ \t]*;[ \t]*$/m;
const REPORT_SUBPROCESS_ENV_KEYS=Object.freeze([
  'GIT_CONFIG_GLOBAL','GIT_CONFIG_NOSYSTEM','GIT_CONFIG_SYSTEM','GIT_NO_LAZY_FETCH',
  'GIT_NO_REPLACE_OBJECTS','GIT_OPTIONAL_LOCKS','GIT_TERMINAL_PROMPT','LANG','LC_ALL','PATH',
]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Admit only the actual typed Python edge: a triple-quoted inline Node module,
// imported with the exact argv vector used by continuation-candidates.
export function matchesTypedInlineNodeMechanicsEdge(source) {
  if(typeof source!=='string')return false;
  const declarations=[...source.matchAll(INLINE_SCRIPT_DECLARATION)];
  const assignments=[...source.matchAll(/^[ \t]*script[ \t]*(?:\+=|=(?!=))/gm)];
  const nodeCommands=[...source.matchAll(NODE_COMMAND_PREFIX)];
  const invocations=[...source.matchAll(INLINE_NODE_INVOCATION)];
  if(declarations.length!==1||assignments.length!==1||nodeCommands.length!==1||invocations.length!==1)return false;
  return MECHANICS_IMPORT.test(declarations[0][1]);
}

// The continuation CLI labels the tree it reads by requiring --commit to
// match repository HEAD. The report runner separately proves S1 and QCC
// source-body equality, so this selector must return the sealed current HEAD.
export function selectContinuationSnapshotHead(sourceCommit,qualifierCodeCommit,headCommit) {
  const identities=[sourceCommit,qualifierCodeCommit,headCommit];
  if(arguments.length!==3||identities.some(commit=>typeof commit!=='string'||!/^[a-f0-9]{40}$/.test(commit))) {
    throw new TypeError('continuation source, QCC and sealed HEAD must be full lowercase SHA-1 commits');
  }
  if(new Set(identities).size!==3)throw new TypeError('continuation source, QCC and sealed HEAD identities must remain distinct');
  return headCommit;
}

// The next-native raster boundary producer nests its five source PDF digests
// under `inputs`; bind that exact producer schema to the geometry snapshot.
export function assertRasterSnapshotMatchesGeometry(rasterSnapshot,geometryHashes) {
  if(!rasterSnapshot||typeof rasterSnapshot!=='object'||Array.isArray(rasterSnapshot)
      ||!rasterSnapshot.inputs||typeof rasterSnapshot.inputs!=='object'||Array.isArray(rasterSnapshot.inputs)
      ||!geometryHashes||typeof geometryHashes!=='object'||Array.isArray(geometryHashes)
      ||!isDeepStrictEqual(rasterSnapshot.inputs.sourcePdfSha256,geometryHashes)) {
    throw new TypeError('raster inputs.sourcePdfSha256 must exactly match geometry sourcePdfSha256');
  }
  return true;
}

// source-scan-inventory already supplies a repo-relative path prefixed by
// `dist/`; validate and read that one path without adding another prefix.
export function loadSourceScanCatalogFromProducerPath(relative,readJson,repoPath) {
  if(typeof readJson!=='function'||typeof repoPath!=='function')throw new TypeError('source scan catalog reader requires the fixed JSON reader and repo-path validator');
  return readJson(repoPath(relative));
}

function dependencyRepoPath(value){
  if(typeof value!=='string'||!value||value.startsWith('/')||value.includes('\\')
      ||!/^[A-Za-z0-9._/-]+$/.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..')) {
    throw new TypeError(`monetary-index dependency path is unsafe: ${String(value)}`);
  }
  return value;
}

function sourceBodyPinMap(rows){
  if(!Array.isArray(rows)||types.isProxy(rows))throw new TypeError('native sourceBody path/hash rows are required');
  const pins=new Map();
  for(const row of rows){
    if(!row||typeof row!=='object'||Array.isArray(row)||types.isProxy(row)||Object.getPrototypeOf(row)!==Object.prototype)throw new TypeError('sourceBody pins must be plain rows');
    const file=dependencyRepoPath(row.path),digest=row.sha256;
    if(!/^[a-f0-9]{64}$/.test(digest||'')||pins.has(file))throw new TypeError(`sourceBody pin is malformed or duplicated: ${file}`);
    pins.set(file,digest);
  }
  return pins;
}

// Pure structural validator for the two fixed pointer arrays. The caller
// cannot choose pointers, expected lengths, or the declared code/data sets.
export function inspectCurrentMonetaryIndexDependencyArrays(index,sourceBodyRows){
  if(arguments.length!==2||!index||typeof index!=='object'||Array.isArray(index)||types.isProxy(index)||Object.getPrototypeOf(index)!==Object.prototype)throw new TypeError('plain current monetary index JSON object required');
  const bodyPins=sourceBodyPinMap(sourceBodyRows),codePaths=new Set(REPORT_CODE_PATHS),dataPaths=new Set(REPORT_DATA_PATHS);
  const rows=[],unique=new Map(),arraySummaries=[],roleRefCounts={'source-body':0,'report-code':0,'report-data':0};
  for(const spec of CURRENT_MONETARY_INDEX_DEPENDENCY_ARRAYS){
    const parts=spec.pointer.slice(1).split('/');let list=index;
    for(const part of parts)list=list&&typeof list==='object'?list[part]:undefined;
    if(!Array.isArray(list)||types.isProxy(list)||list.length!==spec.expectedLength)throw new TypeError(`${spec.pointer} must contain exactly ${spec.expectedLength} dependency rows`);
    const start=rows.length;
    for(let indexInArray=0;indexInArray<list.length;indexInArray++){
      const ref=list[indexInArray];
      if(!ref||typeof ref!=='object'||Array.isArray(ref)||types.isProxy(ref)||Object.getPrototypeOf(ref)!==Object.prototype)throw new TypeError(`${spec.pointer}[${indexInArray}] must be a plain row`);
      const keys=Object.keys(ref).sort();if(JSON.stringify(keys)!==JSON.stringify(['path','sha256']))throw new TypeError(`${spec.pointer}[${indexInArray}] must have exactly path and sha256`);
      const file=dependencyRepoPath(ref.path),digest=ref.sha256;
      if(!/^[a-f0-9]{64}$/.test(digest||''))throw new TypeError(`${spec.pointer}[${indexInArray}] has a malformed SHA-256`);
      if(file===CURRENT_MONETARY_SOURCE_INDEX_PATH)throw new TypeError('current monetary index cannot declare itself as an input');
      const roles=[];
      if(bodyPins.has(file))roles.push('source-body');
      if(codePaths.has(file))roles.push('report-code');
      if(dataPaths.has(file))roles.push('report-data');
      if(roles.length===0)throw new TypeError(`${spec.pointer}[${indexInArray}] path is outside the declared source-body/report-code/report-data union: ${file}`);
      if(bodyPins.has(file)&&bodyPins.get(file)!==digest)throw new TypeError(`${file}: monetary-index hash differs from the exact native sourceBody pin`);
      if(S2_CURRENT_ADAPTER_CODE_PATHS.includes(file)&&(!S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES[file]||digest!==S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES[file]))throw new TypeError(`${file}: monetary-index hash differs from the reviewed exact current-adapter code pin`);
      const expectedDataHash=REPORT_DATA_EXPECTED_SHA256[file];
      if(expectedDataHash&&digest!==expectedDataHash)throw new TypeError(`${file}: monetary-index hash differs from its fixed current report-data pin`);
      const previous=unique.get(file);
      if(previous&&previous.sha256!==digest)throw new TypeError(`${file}: duplicate monetary-index dependency rows disagree on SHA-256`);
      if(!previous)unique.set(file,{sha256:digest,roles:[...roles].sort()});
      else if(JSON.stringify(previous.roles)!==JSON.stringify([...roles].sort()))throw new TypeError(`${file}: duplicate monetary-index dependency rows disagree on declared pin roles`);
      for(const role of roles)roleRefCounts[role]++;
      rows.push({pointer:spec.pointer,arrayRole:spec.role,index:indexInArray,path:file,sha256:digest,declaredRoles:[...roles].sort()});
    }
    const arrayRows=rows.slice(start);
    arraySummaries.push({pointer:spec.pointer,role:spec.role,referenceCount:arrayRows.length,referenceSha256:sha(Buffer.from(JSON.stringify(arrayRows)))});
  }
  const duplicatePathReferences=rows.length-unique.size;
  if(rows.length!==CURRENT_MONETARY_INDEX_DEPENDENCY_COUNTS.references||unique.size!==CURRENT_MONETARY_INDEX_DEPENDENCY_COUNTS.uniquePaths
      ||duplicatePathReferences!==CURRENT_MONETARY_INDEX_DEPENDENCY_COUNTS.duplicatePathReferences)throw new TypeError('current monetary index dependency reference/unique/duplicate counts differ from the fixed candidate');
  if(!unique.has(CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH))throw new TypeError('current monetary index does not bind the pinned source-render-frame data');
  return {
    schemaVersion:1,artifactType:'fixed current monetary-index dependency-array closure',
    indexPath:CURRENT_MONETARY_SOURCE_INDEX_PATH,indexSha256:CURRENT_MONETARY_SOURCE_INDEX_SHA256,
    arrays:arraySummaries,referenceCount:rows.length,uniquePathCount:unique.size,duplicatePathReferences,
    referenceRoles:roleRefCounts,
    uniquePathRoles:Object.fromEntries(['source-body','report-code','report-data'].map(role=>[role,[...unique.values()].filter(value=>value.roles.includes(role)).length])),
    dependencyRowsSha256:sha(Buffer.from(JSON.stringify(rows))),
    sourceRenderFrames:{path:CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH,sha256:CURRENT_MONETARY_SOURCE_RENDER_FRAMES_SHA256,referenced:true},
  };
}

// The same fixed traversal is called from the binder and runner. It proves
// the index itself and every referenced dependency against both physical
// bytes and the exact raw-QCC blob, while retaining each declaration role.
export function validateCurrentMonetaryIndexDependencyClosure(indexBytes,qualifierCodeCommit,sourceBodyRows,readPhysical,readRawQcc){
  if(arguments.length!==5||!Buffer.isBuffer(indexBytes)||!/^[a-f0-9]{40}$/.test(qualifierCodeCommit||'')
      ||typeof readPhysical!=='function'||types.isProxy(readPhysical)||typeof readRawQcc!=='function'||types.isProxy(readRawQcc)) {
    throw new TypeError('fixed monetary-index closure requires bytes, exact QCC, native sourceBody pins, and read-only readers');
  }
  const indexPhysical=Buffer.from(readPhysical(CURRENT_MONETARY_SOURCE_INDEX_PATH));
  const indexRawQcc=Buffer.from(readRawQcc(CURRENT_MONETARY_SOURCE_INDEX_PATH,qualifierCodeCommit));
  if(!indexBytes.equals(indexPhysical)||!indexBytes.equals(indexRawQcc)||sha(indexBytes)!==CURRENT_MONETARY_SOURCE_INDEX_SHA256)throw new TypeError('current monetary index differs from its fixed candidate SHA, physical bytes, or raw QCC blob');
  let index;try{index=JSON.parse(indexBytes.toString('utf8'));}catch{throw new TypeError('current monetary index is invalid JSON');}
  const summary=inspectCurrentMonetaryIndexDependencyArrays(index,sourceBodyRows),checked=new Map();
  for(const pointerArray of CURRENT_MONETARY_INDEX_DEPENDENCY_ARRAYS){
    let list=index;for(const part of pointerArray.pointer.slice(1).split('/'))list=list[part];
    for(const ref of list){
      if(checked.has(ref.path))continue;
      const live=Buffer.from(readPhysical(ref.path)),raw=Buffer.from(readRawQcc(ref.path,qualifierCodeCommit));
      if(!live.equals(raw)||sha(live)!==ref.sha256)throw new TypeError(`${ref.path}: dependency SHA differs from physical bytes or raw QCC blob`);
      checked.set(ref.path,sha(live));
    }
  }
  if(checked.size!==summary.uniquePathCount)throw new TypeError('current monetary index dependency traversal omitted a unique path');
  return Object.freeze({...summary,rawQccCommit:qualifierCodeCommit,checkedUniquePathCount:checked.size,rawQccAndPhysicalEquality:true});
}

export function validateReportPythonExecutable(value) {
  if(typeof value!=='string'||!path.isAbsolute(value)||path.resolve(value)!==value) {
    throw new TypeError('report Python executable must be an absolute normalized path');
  }
  let physicalPath,stat;
  try { physicalPath=realpathSync(value);stat=lstatSync(physicalPath); }
  catch { throw new TypeError('report Python executable must resolve to an existing regular executable file'); }
  if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(physicalPath)!==physicalPath) {
    throw new TypeError('report Python executable must resolve to a physical regular file');
  }
  try { accessSync(physicalPath,constants.X_OK); }
  catch { throw new TypeError('report Python executable is not executable'); }
  return physicalPath;
}

export function buildReportSubprocessEnvironment(pythonExecutable) {
  const python=validateReportPythonExecutable(pythonExecutable);
  const controlled=controlledGitEnvironment();
  const keys=Object.keys(controlled).sort();
  if(JSON.stringify(keys)!==JSON.stringify(REPORT_SUBPROCESS_ENV_KEYS.filter(key=>key!=='PATH').sort().concat('PATH').sort())) {
    throw new Error('controlled Git environment keys differ from the fixed report subprocess whitelist');
  }
  const nodeDirectory=path.dirname(process.execPath),nodeCommand=path.join(nodeDirectory,'node');
  let parentNodeTarget,childNodeTarget;
  try { parentNodeTarget=realpathSync(process.execPath);childNodeTarget=realpathSync(nodeCommand);accessSync(childNodeTarget,constants.X_OK); }
  catch { throw new Error('continuation child Node command is unavailable beside the parent Node runtime'); }
  if(parentNodeTarget!==childNodeTarget)throw new Error('continuation child `node` would not resolve to the parent Node runtime');
  const searchPath=[...new Set([
    nodeDirectory,
    path.dirname(python),
    '/usr/bin',
    '/bin',
  ])].join(path.delimiter);
  return {...controlled,PATH:searchPath};
}
