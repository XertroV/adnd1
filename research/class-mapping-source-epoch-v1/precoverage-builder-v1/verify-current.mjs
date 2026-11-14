#!/usr/bin/env node
// Minimal parity CLI: no output body files, no assembly, no source writes.
import {readFileSync, writeFileSync, realpathSync, statSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {buildPreCoverageSourceBody, sha256} from './source-body.mjs';
import {loadProductionReadOnly} from './production-readonly.mjs';

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--repo-root' || args[2] !== '--receipt') {
  throw new Error('Usage: node verify-current.mjs --repo-root <physical-current-checkout> --receipt <outside-small-json>');
}
const root = realpathSync(resolve(args[1])), receiptPath = resolve(args[3]);
const receiptDirectory = realpathSync(dirname(receiptPath));
const isInside = (base, target) => {
  const rel = relative(base,target);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
};
if (isInside(root,receiptPath) || isInside(root,receiptDirectory)) throw new Error('Receipt must be outside the checkout');
if (process.permission && !process.permission.has('fs.write',receiptPath)) throw new Error('Receipt path is not permitted');
const expectedPaths = ['dist/data.json','research/price-source-inventory.json','dist/source-continuations.json'];
const before = new Map(expectedPaths.map(path => {
  const file = resolve(root,path), bytes = readFileSync(file), stat = statSync(file);
  return [path,{sha256:sha256(bytes),sizeBytes:bytes.length,device:stat.dev,inode:stat.ino}];
}));
const builderCode = ['source-body.mjs','production-readonly.mjs','verify-current.mjs'].map(path => {
  const bytes = readFileSync(new URL(`./${path}`,import.meta.url));
  return {path,sha256:sha256(bytes),sizeBytes:bytes.length};
});
const started = performance.now();
const production = await loadProductionReadOnly(root);
const body = buildPreCoverageSourceBody(production.inputs, production.runtime);
const values = [body.outputBytes.data, body.outputBytes.priceInventory, body.outputBytes.publishedContinuations];
const parity = expectedPaths.map((path,index) => {
  const built = values[index], current = readFileSync(resolve(root,path)), stat = statSync(resolve(root,path)), old = before.get(path);
  const row = {path,generatedSha256:sha256(built),currentSha256:sha256(current),generatedSizeBytes:built.length,currentSizeBytes:current.length,exactBytesEqual:built.equals(current),currentBytesAndInodeUnchanged:sha256(current) === old.sha256 && current.length === old.sizeBytes && stat.dev === old.device && stat.ino === old.inode};
  if (!row.exactBytesEqual || !row.currentBytesAndInodeUnchanged) throw new Error(`Production pre-coverage parity failed for ${path}: ${JSON.stringify(row)}`);
  return row;
});
production.assertDirectReadsUnchanged();
for (const row of builderCode) {
  const bytes = readFileSync(new URL(`./${row.path}`,import.meta.url));
  if (sha256(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) throw new Error(`Outside builder code changed during proof: ${row.path}`);
}
const directInputs = production.snapshotDirectReads();
const receipt = {
  schemaVersion:1,artifactType:'Read-only frozen-current production pre-coverage source-body parity proof',status:'pass',repoRoot:root,
  generatedOutputsWritten:false,sourceWrites:false,gitCommandsRun:false,fullAssemblerRun:false,newSourceEpochQualified:false,
  productionCallBoundary:'Direct unchanged production functions; no tools/assemble.mjs import/evaluation, no coverage-gaps or eager MM reader import',
  permissionModel:{enabled:!!process.permission,childProcessAllowed:process.permission ? process.permission.has('child') : null,checkoutWriteAllowed:process.permission ? process.permission.has('fs.write',root) : null},
  provenance:production.provenance,parity,
  proposalVersion:2,builderCode,
  outputSnapshotBoundaries:['inventory after binding/review attachment, before release.priceInventory','data after release.priceInventory, before publisher','continuations after publisher'],
  denominators:{owners:['rules','spells','equipment','classes','matrices'].reduce((sum,key) => sum + body.data[key].length, body.data.progressionExplainer ? 1 : 0),rules:body.data.rules.length,manualBindings:production.inputs.manualBindings.bindings.length,canonicalBindings:body.priceInventory.fieldEvidenceBindings.length,publishedContinuationGroups:body.publishedContinuations.counts.groups},
  diagnostics:body.diagnostics,
  explicitReadInputs:{files:directInputs.length,sortedPathHash:sha256(JSON.stringify(directInputs.map(row => [row.path,row.sha256,row.sizeBytes]))),allBytesAndInodesStable:true,scope:'Explicit adapter input/catalog/image reads and static module closure; production internals also read fixed evidence, so this is not an exhaustive IO trace'},
  elapsedMs:Math.round(performance.now()-started),peakRssBytes:process.resourceUsage().maxRSS*1024,
  limits:['No final PHB70 v3, UA28 or Party13 composition performed','No actual next source commit/hash/canonical count inferred','No full assembly, native gate, browser, CI or source-semantic approval','Future production-native composition requires matching materialized module-relative inputs and approved producer code, or a separately reviewed complete read-injection refactor'],
};
writeFileSync(receiptPath,`${JSON.stringify(receipt,null,2)}\n`,{flag:'wx'});
process.stdout.write(`${JSON.stringify({status:'pass',receipt:receiptPath,parity:parity.map(row => ({path:row.path,sha256:row.generatedSha256,exactBytesEqual:row.exactBytesEqual})),elapsedMs:receipt.elapsedMs,permissionModel:receipt.permissionModel})}\n`);
