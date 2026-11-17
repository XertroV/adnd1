import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const repoRoot=process.env.NATIVE2_SOURCE_REPO_ROOT||resolve(import.meta.dirname,'../..');
const path='tools/class-mapping-current-source-gate-v2.mjs';
const cohort='tests/helpers/class-mapping-current-cohort-v2.mjs';
const nativeContract='tools/class-mapping-native-contract-v2.mjs';
const native1Contract='tools/class-mapping-native-contract-v1.mjs';
const frozen='tools/class-mapping-frozen-parent-artifacts-v1.mjs';
const historyReader='research/class-mapping-history-v1/closed-version29-reader-class-mapping-v1.mjs';
const url=relative=>pathToFileURL(realpathSync(resolve(repoRoot,relative))).href;
const graph=new Map();
registerHooks({resolve(specifier,context,nextResolve){
 const result=nextResolve(specifier,context);
 if(context.parentURL){if(!graph.has(context.parentURL))graph.set(context.parentURL,new Set());graph.get(context.parentURL).add(result.url);}
 return result;
}});
const currentGate=await import(url(path));
const currentNativeContract=await import(url(nativeContract));
const native1=await import(url(native1Contract));
const frozenManifest=await import(url(frozen));
// This historical facade is intentionally stale on the Source2-updated checkout.
// Import it and capture its real ESM edges, while asserting its native v1 guard
// rejects the changed app instead of allowing historical replay to qualify.
let historyFailure=null;
try { await import(url(historyReader)); } catch (error) { historyFailure=error; }
function reachable(rootUrl){
 const pending=[rootUrl],seen=new Set();
 while(pending.length){const node=pending.pop();if(seen.has(node))continue;seen.add(node);for(const child of graph.get(node)||[])pending.push(child);}
 return seen;
}
const gateGraph=reachable(url(path));
const contractGraph=reachable(url(nativeContract));
const historyGraph=reachable(url(historyReader));
const gateImports=[...(graph.get(url(path))||[])].sort();
const contractImports=[...(graph.get(url(nativeContract))||[])].sort();

test('actual Source2 ESM edges keep current native qualification and historical replay separate',()=>{
 assert.equal(typeof currentGate.assertClassMappingCurrentSourceIdentity,'function');
 assert.equal(currentNativeContract.STAGE,'source2-body-native');
 assert.equal(currentNativeContract.SOURCE_COMMIT,'400f6e9d123d8a654b9b9af48133a2533506e73d');
 assert.equal(native1.STAGE,'s1-body-native');
 assert.ok(frozenManifest.FROZEN_PARENT_ARTIFACTS.length>0);
 assert.ok(gateImports.includes(url(cohort)),'Source2 source gate resolves the Native2 cohort helper');
 assert.ok(contractImports.includes(url(native1Contract)),'Native2 contract preserves its versioned Native1 kernel dependency');
 assert.ok(gateGraph.has(url(nativeContract)),'current Source2 gate reaches its versioned native contract');
 assert.ok(gateGraph.has(url(frozen)),'current Source2 gate reaches frozen Native1 parent artifacts through the cohort');
 assert.ok(![...gateGraph].some(node=>node.includes('/research/class-mapping-history-v1/')),'current Source2 gate has no historical replay module');
 assert.ok(![...contractGraph].some(node=>node.includes('/research/class-mapping-history-v1/')),'Native2 contract has no historical replay module');
 assert.ok(historyGraph.has(url(native1Contract)),'historical reader still reaches the required Native1 native guard');
 assert.ok(historyFailure instanceof Error,'historical v1 reader fails closed against the Source2-updated physical body');
 assert.match(historyFailure.message,/fresh current input SHA\/size mismatch/,'historical failure is the retained exact current-input freshness guard');
 assert.ok(!historyGraph.has(url(nativeContract)),'historical Native1 reader does not silently switch to the Source2 contract');
 const historicalBytes=readFileSync(resolve(repoRoot,historyReader),'utf8');
 assert.match(historicalBytes,/from ['"]\.\.\/class-mapping-source-epoch-v1\/closed-historical-reader-v1\.mjs['"]/,
  'historical facade retains its exact v1 reader');
});
