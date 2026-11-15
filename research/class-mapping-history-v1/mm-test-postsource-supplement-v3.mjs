// Nine exact a29 test-evidence roles that are not in V6/V2. This does not
// expand the MM source capsule or expose a generic path reader.
import {readFileSync as nodeReadFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {assertHistoricalMmTestStage,historicalMmTestRoot} from './mm-replay-fs-v2.mjs';

export const mmTestRoleSupplementV3Path='research/class-mapping-history-v1/mm-test-role-supplement-v3.json';
export const mmTestRoleSupplementV3Sha256='27856ec212c1e0d9326572e8fd44b1c261f18db6ca838c6277cd6c42face8235';
const root=realpathSync(resolve(import.meta.dirname,'../..'));
if(root!==historicalMmTestRoot)throw new Error('Fixed historical-MM repository root required');
const raw=createRawGitReader(root),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const A29='a29d72d5147c497addd9e46f54ea3f8222f6e9c2',A29_TREE='da1c64ea25f178a1155a79c4692964e9b17dd645';
const V2_MANIFEST_PATH='research/class-mapping-history-v1/mm-test-role-supplement-v2.json';
const V2_MANIFEST_SHA256='b8c887c3f75a2ac128c635d7016549df47a372ddc74b7f78d3ab045c3effca12';
const V6_MANIFEST_PATH='research/class-mapping-history-v1/mm-test-input-manifest-v6.json';
const V6_MANIFEST_SHA256='a063dd1910847d94e363f1cee502dfa34fd283ccf2c79f1370bcffe00f886070';
const CAPSULE_PATH='research/class-mapping-history-v1/mm-native-capsule-manifest-v1.json';
const CAPSULE_SHA256='5798f30b425f3a908682dfd860226036fe3a88d017b27d37c9c30bd8afd25003';
const expected=new Map([["historical-test-evidence-pass8-character-reference-integration-failure-before",{"path":"research/source-audit-pass8-character-reference-integration-failure-before.json","sha256":"ce38738af2f1790bc301cf9f834e82e3100ad0df6fe2e3bd9c409b10ffa38450","sizeBytes":2255}],["historical-test-evidence-pass8-character-reference-first-full-node-log",{"path":"tests/fixtures/source-audit-pass8-character-reference-first-full-node-failure.log.gz","sha256":"2ee351497b47b9cd26aec350ab0837d3e21912614a4260ca41f22d0b48aa2430","sizeBytes":234720}],["historical-test-evidence-pass8-character-reference-mechanics-before",{"path":"research/source-audit-pass8-character-reference-mechanics-before.json.gz","sha256":"03664a04fee21f044cfead002add9102fe1efdd7559b695aa4dd1c6b8ede9df6","sizeBytes":682690}],["historical-test-evidence-pass8-xp-continuation-metadata-before",{"path":"tests/fixtures/pass8-xp-continuation-metadata-before.json.gz","sha256":"e25351e6f59a1524997a34e2eef91ab4c40f237417fd6c334e064910403164d1","sizeBytes":4967210}],["historical-test-evidence-pass8-xp-continuation-guard-review",{"path":"research/source-audit-pass8-xp-continuation-guard-independent-review.json","sha256":"9d1bb4345449433db4ef61c20135a96b70830f9245b7e02112c052a70bca1ff1","sizeBytes":11250}],["historical-test-evidence-pass8-xp-continuation-model-order-review",{"path":"research/source-audit-pass8-xp-continuation-model-order-independent-review.json","sha256":"0941b937783c66e1886b126cf93f115227940d1f483f0997cc04dd219c9d516f","sizeBytes":40144}],["historical-test-evidence-pass8-xp-continuation-browser-review",{"path":"research/source-audit-pass8-xp-continuation-browser-independent-review.json","sha256":"52c82dbb3a72956c4295ee559993e3764ea9b6a2891ab174850bcb41005d6a3a","sizeBytes":48239}],["historical-test-evidence-pass8-xp-continuation-first-full-node-inputs",{"path":"tests/fixtures/pass8-xp-continuation-first-full-node-inputs.json.gz","sha256":"3edca076a27cce3ae3debac80b9844bfefc06fb570434a391155eea9a2860475","sizeBytes":82542}],["historical-test-evidence-pass8-xp-continuation-first-full-node-log",{"path":"tests/fixtures/pass8-xp-continuation-first-full-node.log.gz","sha256":"7192eca199a7f099bb6d85fa882a22e731b3496c8e3803b183f78f2eef483010","sizeBytes":101451}]]);
export const historicalMmTestRoleSupplementV3Paths=Object.freeze([...expected].map(([role,pin])=>Object.freeze({role,path:pin.path})));
let loaded=null;
const fail=message=>{throw new Error(`Historical-MM test-evidence supplement V3: ${message}`);};
function readPinnedPhysical(path,expectedSha){
 const absolute=resolve(root,path),stat=lstatSync(absolute);
 if(!stat.isFile()||stat.isSymbolicLink())fail(`pinned manifest must be a regular physical file: ${path}`);
 const bytes=nodeReadFileSync(absolute);if(hash(bytes)!==expectedSha)fail(`pinned manifest bytes changed: ${path}`);return bytes;
}
function initialize(){
 if(loaded)return;
 assertHistoricalMmTestStage();raw.assertView();
 const ownBytes=readPinnedPhysical(mmTestRoleSupplementV3Path,mmTestRoleSupplementV3Sha256);
 let doc;try{doc=JSON.parse(ownBytes.toString('utf8'));}catch{fail('V3 role manifest is not JSON');}
 if(doc.schemaVersion!==3||doc.artifactType!=='typed supplemental a29 historical test-evidence roles; not an expansion of the 25/21 source capsule'
   ||doc.sourceSemanticsCertified!==false||doc.numericOrGradeApproval!==false||doc.nativeQualification!==false
   ||doc.predecessorSupplement?.path!==V2_MANIFEST_PATH||doc.predecessorSupplement?.sha256!==V2_MANIFEST_SHA256||doc.predecessorSupplement?.roleCount!==12
   ||doc.preservedCapsule?.path!==CAPSULE_PATH||doc.preservedCapsule?.sha256!==CAPSULE_SHA256||doc.preservedCapsule?.fileCount!==25||doc.preservedCapsule?.sourceInputCount!==21
   ||doc.preservedReplayManifest?.path!==V6_MANIFEST_PATH||doc.preservedReplayManifest?.sha256!==V6_MANIFEST_SHA256||doc.preservedReplayManifest?.fileCount!==2932
   ||doc.a29ReplayHead?.commit!==A29||doc.a29ReplayHead?.tree!==A29_TREE||!Array.isArray(doc.roles)||doc.roles.length!==9)fail('role lineage, scope, or exact nine-role manifest changed');
 const expectedRows=[...expected].map(([role,pin])=>({role,path:pin.path,originCommit:A29,originTree:A29_TREE,sha256:pin.sha256,sizeBytes:pin.sizeBytes,classification:'historical-test-evidence; outside source capsule'}));
 if(JSON.stringify(doc.roles)!==JSON.stringify(expectedRows))fail('unknown, duplicate, reordered, or altered role pins');
 const v2Bytes=readPinnedPhysical(V2_MANIFEST_PATH,V2_MANIFEST_SHA256);
 const v6Bytes=readPinnedPhysical(V6_MANIFEST_PATH,V6_MANIFEST_SHA256);
 readPinnedPhysical(CAPSULE_PATH,CAPSULE_SHA256);
 let v2Doc,v6Doc;try{v2Doc=JSON.parse(v2Bytes.toString('utf8'));v6Doc=JSON.parse(v6Bytes.toString('utf8'));}catch{fail('pinned predecessor manifests are not JSON');}
 if(!Array.isArray(v2Doc.files)||v2Doc.files.length!==12||!Array.isArray(v6Doc.files)||v6Doc.files.length!==2932)fail('pinned predecessor role/file roster changed');
 const predecessorPaths=new Set([...v2Doc.files.map(row=>row.path),...v6Doc.files.map(row=>row.path)]);
 if([...expected.values()].some(pin=>predecessorPaths.has(pin.path)))fail('a V3 evidence role duplicates a V6 or V2 path');
 if(raw.git('rev-parse',`${A29}^{tree}`).toString('utf8').trim()!==A29_TREE)fail('fixed a29 tree changed');
 const bytesByRole=new Map();
 for(const [role,pin] of expected){
  const bytes=raw.git('show',`${A29}:${pin.path}`);
  if(bytes.length!==pin.sizeBytes||hash(bytes)!==pin.sha256)fail(`a29 role bytes differ: ${role}`);
  bytesByRole.set(role,Buffer.from(bytes));
 }
 raw.assertView();loaded=bytesByRole;
}
export function assertHistoricalMmRoleSupplementV3(){
 initialize();return Object.freeze({status:'verified nine exact a29 historical test-evidence roles; V2 roles and 25/21 capsule unchanged',roles:[...expected.keys()],a29ReplayHead:A29,sourceSemanticsCertified:false,numericOrGradeApproval:false,nativeQualification:false});
}
export function readHistoricalMmRoleSupplementV3(role){
 if(typeof role!=='string'||!expected.has(role))fail('unknown role');initialize();return Buffer.from(loaded.get(role));
}
