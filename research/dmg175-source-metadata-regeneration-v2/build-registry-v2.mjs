import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildClosedSupplementalCropRegistry,
  asContinuationCropMap,
  makeBridgeSuccessor,
  sha256,
} from './implementation/source-registry-v2.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const BASE = '/workspace/adnd1-next-source-native';
const NEW_BRIDGE_PATH = 'research/source-frame-coordinate-bridge-dmg175-source-v1.json';
const OLD_BRIDGE_PATH = 'research/source-frame-coordinate-bridge-ua-source-v1.json';
const OLD_BRIDGE_SHA = '1013eb540a2bc9034963472b3b48a9a1ea61af224392806386db1091c5b35a65';
const EXPECTED_CODE_HASHES = {
  'tools/continuation-candidates.py': '6c9edb53439576bbd3633033b94bb6600adf37cd6829afed5f9e0e6d93c38638',
  'research/source-visual-audit.py': 'a9e389c5a0de3be48a6f52407ce78e500af1adde1455388e194284be3868609e',
  'research/source_frame_coordinate_bridge.py': 'b4963ab620cc6034f4eb9772cf0456dd47c307afffebf71f924a783080465526',
  'tools/source-frame-coordinate-bridge.mjs': 'd4093ae9c107a0f21a7908a401c5744387fc176309c34d3ac30cd5deb65920f6',
};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFileSync(path.join(OUT, relative));
const writeJson = (relative, value) => fs.writeFileSync(path.join(OUT, relative), `${JSON.stringify(value, null, 2)}\n`);
const fail = message => { throw new Error(`D175 metadata regeneration candidate: ${message}`); };

for (const [relative, expected] of Object.entries(EXPECTED_CODE_HASHES)) {
  const inputPath = `inputs/code/${path.basename(relative).replace('.py','-before.py').replace('.mjs','-before.mjs')}`;
  if (sha(read(inputPath)) !== expected) fail(`captured code preimage changed: ${relative}`);
}
const oldBridgeBytes = fs.readFileSync(path.join(BASE, OLD_BRIDGE_PATH));
const {next: bridge, oldBooksJsSha256} = makeBridgeSuccessor(oldBridgeBytes, OLD_BRIDGE_SHA,
  JSON.parse(read('inputs/books-source-pin-v1.json').toString('utf8')).sha256);
const sourcePins = JSON.parse(read('inputs/catalog-source-pins-v1.json').toString('utf8'));
const bridgeBytes = Buffer.from(`${JSON.stringify(bridge, null, 2)}\n`);
const bridgeSha = sha(bridgeBytes);
const cropRegistry = buildClosedSupplementalCropRegistry(OUT);
const cropBytes = Buffer.from(`${JSON.stringify(cropRegistry, null, 2)}\n`);
const cropSha = sha(cropBytes);
const cropMap = asContinuationCropMap(cropRegistry);

const pythonMap = `DMG175_SUPPLEMENT_CROPS = {\n${Object.entries(cropMap).sort(([a],[b])=>a.localeCompare(b)).map(([regionId,row])=>
  `    ${JSON.stringify(regionId)}: (${JSON.stringify(row.cropBoundsPx)}, ${JSON.stringify(row.imageSha256)}),`).join('\n')}\n}`;

function unifiedDiff(oldText, newText, oldPath, newPath) {
  const oldLines = oldText.split(/(?<=\n)/), newLines = newText.split(/(?<=\n)/);
  const diff = [];
  // Small source files here need only a single compact hunk around the replacement.
  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) start++;
  let oldEnd = oldLines.length - 1, newEnd = newLines.length - 1;
  while (oldEnd >= start && newEnd >= start && oldLines[oldEnd] === newLines[newEnd]) { oldEnd--; newEnd--; }
  const contextStart = Math.max(0, start - 3), contextEndOld = Math.min(oldLines.length - 1, oldEnd + 3), contextEndNew = Math.min(newLines.length - 1, newEnd + 3);
  diff.push(`--- a/${oldPath}\n`, `+++ b/${newPath}\n`);
  const oldCount = contextEndOld - contextStart + 1, newCount = contextEndNew - contextStart + 1;
  diff.push(`@@ -${contextStart+1},${oldCount} +${contextStart+1},${newCount} @@\n`);
  for (let i=contextStart;i<start;i++) diff.push(` ${oldLines[i]}`);
  for (let i=start;i<=oldEnd;i++) diff.push(`-${oldLines[i]}`);
  for (let i=start;i<=newEnd;i++) diff.push(`+${newLines[i]}`);
  for (let i=oldEnd+1;i<=contextEndOld;i++) diff.push(` ${oldLines[i]}`);
  return diff.join('');
}

let continuation = read('inputs/code/continuation-candidates-before.py').toString('utf8');
const mapStart = continuation.indexOf('DMG175_SUPPLEMENT_CROPS = {');
const mapClose = continuation.indexOf('\n}', mapStart);
if (mapStart < 0 || mapClose < 0) fail('expected closed legacy supplemental crop map was not found');
const mapEnd = mapClose + 2;
const oldMap = continuation.slice(mapStart, mapEnd);
if (!oldMap.includes('dmg-175-party-table-context-78c4c383c38c7d10')
    || !oldMap.includes('dmg-175-level-others-context-5aa02e91e35c4c28')
    || (oldMap.match(/"dmg-/g) || []).length !== 2) fail('legacy two-crop preimage is not the expected closed map');
continuation = continuation.slice(0,mapStart) + pythonMap + continuation.slice(mapEnd);

let visual = read('inputs/code/source-visual-audit-before.py').toString('utf8');
const stale = 'its two published limited excerpts retain a separate source-artifact identity and have no canonical-PDF page ordinal. PDF-only word-box analysis cannot assess their source geometry.';
const replacement = 'its cataloged limited crops retain a separate source-artifact identity and have no canonical-PDF page ordinal. PDF-only word-box analysis cannot assess their source geometry or semantic completeness.';
if (visual.split(stale).length !== 2) fail('expected one stale two-excerpt source-visual statement');
visual = visual.replace(stale,replacement);

const bridgePyPath = 'research/source_frame_coordinate_bridge.py';
let bridgePy = read('inputs/code/source_frame_coordinate_bridge-before.py').toString('utf8');
bridgePy = bridgePy.replace("REGISTRY_RELATIVE_PATH = 'research/source-frame-coordinate-bridge-ua-source-v1.json'", `REGISTRY_RELATIVE_PATH = '${NEW_BRIDGE_PATH}'`);
bridgePy = bridgePy.replace("REGISTRY_SHA256 = '1013eb540a2bc9034963472b3b48a9a1ea61af224392806386db1091c5b35a65'", `REGISTRY_SHA256 = '${bridgeSha}'`);
if (!bridgePy.includes(NEW_BRIDGE_PATH) || !bridgePy.includes(bridgeSha)) fail('Python bridge constants did not bind the new registry');
let bridgeJs = read('inputs/code/source-frame-coordinate-bridge-before.mjs').toString('utf8');
bridgeJs = bridgeJs.replace("export const SOURCE_FRAME_BRIDGE_PATH = 'research/source-frame-coordinate-bridge-ua-source-v1.json';", `export const SOURCE_FRAME_BRIDGE_PATH = '${NEW_BRIDGE_PATH}';`);
bridgeJs = bridgeJs.replace("export const SOURCE_FRAME_BRIDGE_SHA256 = '1013eb540a2bc9034963472b3b48a9a1ea61af224392806386db1091c5b35a65';", `export const SOURCE_FRAME_BRIDGE_SHA256 = '${bridgeSha}';`);
if (!bridgeJs.includes(NEW_BRIDGE_PATH) || !bridgeJs.includes(bridgeSha)) fail('JavaScript bridge constants did not bind the new registry');

fs.mkdirSync(path.join(OUT,'outputs'),{recursive:true});
fs.mkdirSync(path.join(OUT,'patches'),{recursive:true});
fs.writeFileSync(path.join(OUT,'outputs/dmg175-supplement-crop-registry-v2.json'),cropBytes);
fs.writeFileSync(path.join(OUT,'outputs/source-frame-coordinate-bridge-dmg175-v2-preview.json'),bridgeBytes);
fs.writeFileSync(path.join(OUT,'outputs/generated-supplemental-crop-map-v2.py.txt'),`${pythonMap}\n`);
fs.writeFileSync(path.join(OUT,'outputs/continuation-candidates-dmg175-v2.py'),continuation);
fs.writeFileSync(path.join(OUT,'outputs/source-visual-audit-dmg175-v2.py'),visual);
fs.writeFileSync(path.join(OUT,'outputs/source_frame_coordinate_bridge-dmg175-v2.py'),bridgePy);
fs.writeFileSync(path.join(OUT,'outputs/source-frame-coordinate-bridge-dmg175-v2.mjs'),bridgeJs);
fs.writeFileSync(path.join(OUT,'patches/continuation-candidates-supplemental-map-v2.patch'),unifiedDiff(read('inputs/code/continuation-candidates-before.py').toString('utf8'),continuation,'tools/continuation-candidates.py','tools/continuation-candidates.py'));
fs.writeFileSync(path.join(OUT,'patches/source-visual-audit-supplemental-wording-v2.patch'),unifiedDiff(read('inputs/code/source-visual-audit-before.py').toString('utf8'),visual,'research/source-visual-audit.py','research/source-visual-audit.py'));
fs.writeFileSync(path.join(OUT,'patches/source-frame-coordinate-bridge-dmg175-v2.patch'),
  unifiedDiff(read('inputs/code/source_frame_coordinate_bridge-before.py').toString('utf8'),bridgePy,bridgePyPath,bridgePyPath)
  + unifiedDiff(read('inputs/code/source-frame-coordinate-bridge-before.mjs').toString('utf8'),bridgeJs,'tools/source-frame-coordinate-bridge.mjs','tools/source-frame-coordinate-bridge.mjs'));

const files=[];
function walk(dir) {
  for (const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const absolute=path.join(dir,item.name), relative=path.relative(OUT,absolute).split(path.sep).join('/');
    if (item.isDirectory()) {
      if (item.name !== '__pycache__') walk(absolute);
    }
    else if (relative !== 'manifest-v2.json'
        && !relative.endsWith('.pyc')
        && relative !== 'inputs/v1-manifest-cache-limitation.json'
        && relative !== 'inputs/v1-cache-limitation-evidence-v1.json') {
      files.push({path:relative,sha256:sha(fs.readFileSync(absolute)),bytes:fs.statSync(absolute).size});
    }
  }
}
walk(OUT);
if (files.length !== 35) fail(`source/artifact file denominator changed: expected 35, received ${files.length}`);
const v1ManifestBytes=read('inputs/v1-manifest-cache-limitation.json');
const v1CacheEvidence=JSON.parse(read('inputs/v1-cache-limitation-evidence-v1.json').toString('utf8'));
if (sha(v1ManifestBytes)!==v1CacheEvidence.v1ManifestSha256
    || v1CacheEvidence.v1ManifestDeclaredFileCount!==37
    || v1CacheEvidence.runtimeCacheEntryCount!==2
    || v1CacheEvidence.runtimeCacheEntries.some(row=>row.matchesManifest)) {
  fail('the preserved V1 cache limitation evidence changed');
}
const historicalInputs=[
  {path:'inputs/v1-manifest-cache-limitation.json',sha256:sha(v1ManifestBytes),bytes:v1ManifestBytes.length},
  {path:'inputs/v1-cache-limitation-evidence-v1.json',sha256:sha(read('inputs/v1-cache-limitation-evidence-v1.json')),bytes:fs.statSync(path.join(OUT,'inputs/v1-cache-limitation-evidence-v1.json')).size},
];
const manifest={
  schemaVersion:1,
  artifactType:'D175 supplemental identity and source-frame bridge research-only V2 successor',
  status:'Precommit candidate; no active source tools, registry, pointers, source metadata, or sealed artifact was changed.',
  inputState:{provisionalSourceTree:sourcePins.provisionalSourceTree,sourcePhaseDraft:sourcePins.sourcePhaseDraft,finalSourceCommit:null,finalSourceCommitRequired:true},
  v1CacheLimitation:{manifestPath:'inputs/v1-manifest-cache-limitation.json',manifestSha256:sha(v1ManifestBytes),declaredFiles:37,sourceAndArtifactFiles:35,excludedRuntimeCacheFiles:2,evidencePath:'inputs/v1-cache-limitation-evidence-v1.json',evidenceSha256:historicalInputs[1].sha256},
  supplementalIdentity:{path:'outputs/dmg175-supplement-crop-registry-v2.json',sha256:cropSha,counts:cropRegistry.counts,sourceIdentity:cropRegistry.sourceIdentity,scope:'Closed crop-source identity and pixel-coordinate registry only; not source completeness, contextual adequacy, source-value or mechanics review.'},
  sourceFrameBridge:{oldPath:OLD_BRIDGE_PATH,oldSha256:OLD_BRIDGE_SHA,newPath:NEW_BRIDGE_PATH,newSha256:bridgeSha,oldBooksJsSha256,newBooksJsSha256:bridge.provenance.booksJsSha256,counts:bridge.counts,delta:['provenance.booksJsSha256 only'],framesAnd102OwnerJoinsPreserved:true},
  prerequisites:{booksCandidatePath:'inputs/books-proposed-v2.cjs',booksCandidateSha256:bridge.provenance.booksJsSha256,sourcePdfsPrivatePath:'/workspace/vault-audit-private/sources',dmg175JpegSha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',noAuditGenerationYet:true},
  historicalArtifacts:{visual:{path:'research/source-visual-audit-ua-source-v1.json',sha256:'90a62727d0c4892b007c121ea79b32a027b0ac25e7725afe27f98a90daa6fccd',hardlinksAtCapture:2},raster:{path:'research/source-raster-boundary-ua-source-v1.json.gz',sha256:'61f1bb1124d25aeb4906333425fcddacf62a07539b3cd93578d942d1a35b3945',hardlinksAtCapture:2},historicalAssessmentMetricsUnchanged:true},
  noSemanticPromotion:{newVisualReviews:0,newMechanicsGrades:0,geometryZeroIsPass:false,sourceValuesReviewed:false},
  historicalInputs,
  files,
};
writeJson('manifest-v2.json',manifest);
console.log(JSON.stringify({manifestSha256:sha(fs.readFileSync(path.join(OUT,'manifest-v2.json'))),sourceArtifactFileCount:files.length,v1RuntimeCacheFilesExcluded:2,cropRegistrySha256:cropSha,cropCounts:cropRegistry.counts,bridgeRegistrySha256:bridgeSha,bridgePath:NEW_BRIDGE_PATH,bridgeDelta:['provenance.booksJsSha256'],patches:3},null,2));
