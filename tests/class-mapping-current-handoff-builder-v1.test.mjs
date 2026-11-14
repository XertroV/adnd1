// Exact production builder→loader with mocked qualification/file transport and
// actual immutable S1 body context. This test does not assert a native positive.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {runInNewContext} from 'node:vm';
import {createRawGitReader} from '../tools/class-mapping-raw-git-v1.mjs';
import {assertPlainJson} from '../tools/class-mapping-current-consumer-runtime-v1.mjs';

const root = resolve(import.meta.dirname, '..');
const sourcePath = 'tools/class-mapping-current-source-handoff-v1.mjs';
const failedPath = 'tests/fixtures/class-mapping-source-handoff-before-mechanics-input-v1.json';
const text = readFileSync(resolve(root, sourcePath), 'utf8');
const beforeBytes = readFileSync(resolve(root, failedPath));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => sha(Buffer.from(JSON.stringify(value)));
assert.equal(sha(beforeBytes), '8f79a9b023f86a158857feed6b089cc39435384702403b4c7f8eb81e5c975c92');
const module = {exports:{}};
runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'], {module,exports:module.exports});
const ast = module.exports.parse(text, {sourceType:'module',ecmaVersion:'latest'});
const edits=[];
for(const node of ast.body){
  if(node.type==='ImportDeclaration')edits.push({start:node.start,end:node.end,text:''});
  else if(node.type==='ExportNamedDeclaration')edits.push({start:node.start,end:node.declaration.start,text:''});
}
let executable=text;
for(const edit of edits.sort((a,b)=>b.start-a.start))executable=executable.slice(0,edit.start)+edit.text+executable.slice(edit.end);
const exported=ast.body.filter(n=>n.type==='ExportNamedDeclaration').map(n=>n.declaration.id?.name||n.declaration.declarations[0].id.name);
const read = path => readFileSync(resolve(root,path));
const data=JSON.parse(read('dist/data.json')), mechanics=JSON.parse(read('research/mechanics-audit-progress.json'));
assert.equal(sha(read('dist/data.json')),'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573');
assert.equal(sha(read('research/mechanics-audit-progress.json')),'03643330c73dc3fe88f9abeb8a086883a3955d918cba2573e198563631a75785');
const raw=createRawGitReader(root);raw.assertView();
const baselineBytes=raw.git('show','679b15d1c580172e54314829c1c3c86dc78b65f3:dist/data.json');
const baselineData=JSON.parse(baselineBytes),conflictReceipt=JSON.parse(read('research/source-audit-batch5-conflict-integration.json'));
assert.equal(hashJson(baselineData),'b617db17b85a468b36ceda4e570bc5c8b4d85557c2b67f42e567ba1780e4bae6');
assert.equal(hashJson(conflictReceipt),'7a61d692cd1cfe6bb08ab337d113c35041a5b47d0c97a18219eb25ead40ecc9e');
const sourceCommit='2d35138027f00c0740975e519dbb3a2b6df76d14';
for(const path of ['dist/data.json','research/mechanics-audit-progress.json'])assert.deepEqual(raw.git('show',`${sourceCommit}:${path}`),read(path));
raw.assertView();
const stage={summary:{sourceCommit,sourceTree:'40ecb15130b339658522794db6d9e1bc58f43b50',fixture:{path:'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json',sha256:'c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10'}},inputs:{data,mechanics},consumerPins:{qualifierCodeCommit:'70f9153bc176c1ff13a8e95b3c773fa4dd7ba191'}};
const receiptPath='research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.json';
const artifacts=new Map([
 ['research/class-mapping-current-adapters-v1/source-handoff-current-contract-v1.json','ec9b805b59f0b87a846e179a564c7db51114441fd985a6e6f2c3f9d412ca1374'],
 ['research/class-mapping-current-adapters-v1/source-body-handoff-transition-v1.template.json','1bbb0d85c59212b4be9385b5c1cb6f4d414848afd4c298497cac4d3272dcb159'],
]);
function apiWith(receiptBytes){
 const imports={createHash,readFileSync,isDeepStrictEqual,resolve,
   uaSourceHistoricalCaution:()=>{throw Error('Unexercised historical caution transport');},
   qualifyCurrentConsumerCodeStage:()=>stage,qualifyCurrentConsumerStage:()=>stage,currentConsumerRepoRoot:root,
   requireQualificationArtifact:(actual,path)=>{assert.equal(actual,stage);assert.ok(artifacts.has(path));const bytes=read(path);assert.equal(sha(bytes),artifacts.get(path));return {bytes,sha256:sha(bytes)};},
   requireConsumerReceipt:(actual,path)=>{assert.equal(actual,stage);assert.equal(path,receiptPath);return {bytes:receiptBytes,sha256:sha(receiptBytes)};},
   sourceBodyReference:(actual,path)=>{assert.equal(actual,stage);assert.ok(['dist/data.json','research/mechanics-audit-progress.json'].includes(path));return {path,sha256:sha(read(path))};},
   assertPlainJson,
 };
 return new Function(...Object.keys(imports),executable+'\nreturn {'+exported.join(',')+'};')(...Object.values(imports));
}
const context=()=>({baselineData,currentData:data,mechanics,conflictReceipt});
function produced(){return apiWith(beforeBytes).buildNextNativeSourceHandoffTransitionReceipt();}
function load(bytes){return apiWith(bytes).loadSourceHandoffTransition(context());}

test('the exact production builder measures the mechanics subset hash and its exact loader accepts the receipt',()=>{
 const result=produced();assert.equal(result.receipt.currentMechanics.mechanicsInputSha256,mechanics.input.sha256);
 assert.equal(mechanics.input.sha256,'abb0be1209951d4610bdc663f77ee36107ce6c2fb50333c7ded0aa3937c292ac');
 assert.equal(result.semanticPass,false);assert.equal(result.currentSourceValueGrade,'NOT PROMOTED');
 const api=apiWith(result.bytes),accepted=api.loadSourceHandoffTransition(context());
 assert.equal(accepted.qualifiedTarget.currentMechanicsField.status,'unchecked');assert.equal(accepted.qualifiedTarget.currentMechanicsField.inspected,false);
 assert.equal(api.sourceHandoffContextMatches(accepted,{baselineData,currentData:data,conflictReceipt}),true);
 assert.equal(api.isQualifiedSourceHistoricalChange(accepted,accepted.originalConflictReceipt.change),true);
 assert.deepEqual(api.sourceHandoffTransitionReference(accepted),{path:receiptPath,sha256:sha(result.bytes)});
});
test('the actual previously generated 8f79 receipt missing the measured field remains rejected',()=>{
 const failed=JSON.parse(beforeBytes);assert.equal(Object.hasOwn(failed.currentMechanics,'mechanicsInputSha256'),false);
 assert.throws(()=>load(beforeBytes),/preserve exact H conflict\/caution lineage/);
});
test('wrong, null, raw-data and parsed-data hashes cannot replace the measured mechanics subset hash',()=>{
 for(const replacement of ['0'.repeat(64),null,sha(read('dist/data.json')),hashJson(data)]){
  const changed=structuredClone(produced().receipt);changed.currentMechanics.mechanicsInputSha256=replacement;
  assert.throws(()=>load(Buffer.from(JSON.stringify(changed))),/preserve exact H conflict\/caution lineage/);
 }
});
test('strict target, historical lineage and unpromoted grades retain their negative controls',()=>{
 const mutants=[r=>{r.qualifiedTarget.itemId='different';},r=>{r.qualifiedTarget.currentValue='changed';},r=>{r.qualifiedTarget.currentMechanicsField.status='checked';},r=>{r.qualifiedTarget.currentMechanicsField.inspected=true;},r=>{r.currentSourceValueGrade='APPROVED';},r=>{r.semanticPass=true;},r=>{r.originalConflictReceipt.change.newValue='changed';},r=>{r.curatedHistoricalCaution.baselineIndex=0;},r=>{r.priorTransition.sha256='0'.repeat(64);}];
 const result=produced();for(const mutate of mutants){const changed=structuredClone(result.receipt);mutate(changed);assert.throws(()=>load(Buffer.from(JSON.stringify(changed))),/preserve exact H conflict\/caution lineage/);}
});
test('the producer and loader keep their existing argument boundaries',()=>{
 const api=apiWith(beforeBytes);assert.throws(()=>api.buildNextNativeSourceHandoffTransitionReceipt({repoRoot:root}),/no caller overrides/);
 assert.throws(()=>api.loadSourceHandoffTransition(),/exactly one/);assert.throws(()=>api.loadSourceHandoffTransition(context(),{}),/exactly one/);
});
