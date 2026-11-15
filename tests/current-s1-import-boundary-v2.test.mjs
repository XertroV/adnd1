import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve(import.meta.dirname,'..');
const gatePath = 'tools/class-mapping-current-source-gate-v1.mjs';
const currentCohortPath = 'tests/helpers/class-mapping-current-cohort-v1.mjs';
const nativeContractPath = 'tools/class-mapping-native-contract-v1.mjs';
const frozenManifestPath = 'tools/class-mapping-frozen-parent-artifacts-v1.mjs';
const historicalReaderPath = 'research/class-mapping-source-epoch-v1/closed-historical-reader-v1.mjs';
const url = relative => pathToFileURL(realpathSync(resolve(root, relative))).href;
const graph = new Map();
registerHooks({resolve(specifier, context, nextResolve) {
  const result = nextResolve(specifier, context);
  if (context.parentURL) {
    if (!graph.has(context.parentURL)) graph.set(context.parentURL, new Set());
    graph.get(context.parentURL).add(result.url);
  }
  return result;
}});

const currentGate = await import(url(gatePath));
const currentContract = await import(url(nativeContractPath));
const frozenManifest = await import(url(frozenManifestPath));
function reachable(rootUrl) {
  const pending = [rootUrl], seen = new Set();
  while (pending.length) {
    const node = pending.pop();
    if (seen.has(node)) continue;
    seen.add(node);
    for (const child of graph.get(node) || []) pending.push(child);
  }
  return seen;
}

// Importing the actual historical reader resolves its dependencies and runs
// the already-installed read-only native guard during module initialization.
// Any guard failure is fatal; this test does not create a new source epoch.
await import(url(historicalReaderPath));

const gateGraph = reachable(url(gatePath));
const contractGraph = reachable(url(nativeContractPath));
const historicalReaderGraph = reachable(url(historicalReaderPath));
const gateImports = [...(graph.get(url(gatePath)) || [])].sort();
const contractImports = [...(graph.get(url(nativeContractPath)) || [])].sort();

test('actual current S1 ESM edges keep native and historical transports separate', () => {
  assert.equal(typeof currentGate.assertClassMappingCurrentSourceIdentity, 'function');
  assert.equal(currentContract.STAGE, 's1-body-native');
  assert.ok(frozenManifest.FROZEN_PARENT_ARTIFACTS.length > 0);

  assert.ok(gateImports.includes(url(currentCohortPath)), 'current source gate resolves its current cohort helper');
  assert.ok(contractImports.includes(url(frozenManifestPath)), 'native S1 contract resolves the frozen parent data module');
  assert.ok(gateGraph.has(url(nativeContractPath)), 'actual current source gate reaches the native S1 contract through its cohort factory');
  assert.ok(gateGraph.has(url(frozenManifestPath)), 'actual current source gate reaches the frozen parent manifest through its native contract');
  assert.ok(![...gateGraph].some(node=>node.includes('/research/class-mapping-history-v1/')),
    'actual current source-gate ESM graph has no historical replay module');
  assert.ok(![...contractGraph].some(node=>node.includes('/research/class-mapping-history-v1/')),
    'actual native-contract ESM graph has no historical replay module');

  assert.ok(historicalReaderGraph.has(url(nativeContractPath)),
    'actual historical-reader ESM graph reaches its required current native-contract guard');

  const historicalReaderBytes = readFileSync(resolve(root,historicalReaderPath),'utf8');
  assert.match(historicalReaderBytes,/from ['"]\.\.\/\.\.\/tools\/class-mapping-native-contract-v1\.mjs['"]/,
    'historical reader retains its required direct current-native-guard import');
});
