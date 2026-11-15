#!/usr/bin/env node
// Build only the pre-coverage source body into a new outside directory.
// This does not run the full assembler or qualify a new source epoch.
import {readFileSync, writeFileSync, mkdirSync, realpathSync, existsSync, statSync} from 'node:fs';
import {basename, dirname, resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPreCoverageSourceBody, sha256} from '../research/class-mapping-source-epoch-v1/precoverage-builder-v1/source-body.mjs';
import {loadProductionReadOnly} from '../research/class-mapping-source-epoch-v1/precoverage-builder-v1/production-readonly.mjs';

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--repo-root' || args[2] !== '--output-dir') {
  throw new Error('Usage: node build-class-mapping-source-body-v1.mjs --repo-root <physical-checkout> --output-dir <new-outside-directory>');
}
const root = realpathSync(resolve(args[1]));
const requestedOutput = resolve(args[3]);
const inside = (base, target) => {
  const rel = relative(base, target);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
};
// Resolve the parent before creating anything so a symlink cannot redirect
// an apparently outside destination into the checkout.
const parent = realpathSync(dirname(requestedOutput));
const output = resolve(parent, basename(requestedOutput));
if (inside(root, output) || inside(root, parent)) throw new Error('Source-body output must be outside the checkout');
if (existsSync(output)) throw new Error('Output directory already exists; preserved attempts must not be overwritten');
if (realpathSync(process.cwd()) !== root) throw new Error('Run from the physical checkout root');
if (!process.permission) throw new Error('Use Node permissions with checkout writes and child processes denied');
if (process.permission.has('fs.write', root)) throw new Error('Deny checkout writes for the source-body producer');
if (process.permission.has('child')) throw new Error('Deny child processes for the source-body producer');

const producerPath = fileURLToPath(import.meta.url);
const producerBytes = readFileSync(producerPath);
const producerInputs = [
  relative(root,producerPath).split(sep).join('/'),
  'research/class-mapping-source-epoch-v1/precoverage-builder-v1/source-body.mjs',
  'research/class-mapping-source-epoch-v1/precoverage-builder-v1/production-readonly.mjs',
  'research/class-mapping-source-epoch-v1/precoverage-builder-v1/verify-current.mjs',
].map(path => {
  const bytes = readFileSync(resolve(root,path));
  return {path,sha256:sha256(bytes),sizeBytes:bytes.length};
});
const started = performance.now();
const production = await loadProductionReadOnly(root);
const body = buildPreCoverageSourceBody(production.inputs, production.runtime);
production.assertDirectReadsUnchanged();
if (sha256(readFileSync(producerPath)) !== sha256(producerBytes)) throw new Error('Producer changed during source-body construction');
const producerInputsAfter = producerInputs.map(row => {
  const bytes = readFileSync(resolve(root,row.path));
  if (sha256(bytes) !== row.sha256 || bytes.length !== row.sizeBytes) throw new Error(`Producer input changed: ${row.path}`);
  return {path:row.path,sha256:sha256(bytes),sizeBytes:bytes.length,matchesBefore:true};
});
const files = [
  ['data.json', body.outputBytes.data, 'dist/data.json'],
  ['price-source-inventory.json', body.outputBytes.priceInventory, 'research/price-source-inventory.json'],
  ['source-continuations.json', body.outputBytes.publishedContinuations, 'dist/source-continuations.json'],
];
mkdirSync(output, {mode:0o700});
const outputs = files.map(([name, bytes, target]) => {
  const file = resolve(output, name);
  writeFileSync(file, bytes, {flag:'wx', mode:0o600});
  if (!readFileSync(file).equals(bytes) || !statSync(file).isFile()) throw new Error(`Source-body write failed: ${name}`);
  return {file:name, target, sha256:sha256(bytes), sizeBytes:bytes.length};
});
const receipt = {
  schemaVersion:1,
  artifactType:'Pre-coverage source-body construction only',
  status:'body-built; full assembly and native source-epoch qualification not performed',
  repoRoot:root,
  producer:{path:relative(root,producerPath).split(sep).join('/'),sha256:sha256(producerBytes),sizeBytes:producerBytes.length},
  producerInputs,
  producerInputsAfter,
  allProducerInputsUnchanged:true,
  permissionModel:{enabled:!!process.permission,checkoutWriteAllowed:process.permission ? process.permission.has('fs.write',root) : null,childProcessAllowed:process.permission ? process.permission.has('child') : null},
  production:production.provenance,
  explicitInputs:production.snapshotDirectReads(),
  explicitInputScope:'Adapter reads and static production module closure; production internals retain module-relative reads, so this is not an exhaustive I/O trace',
  outputs,
  sourceBodyCommit:null,
  sourceBodyTree:null,
  sourceEpochQualified:false,
  fullAssemblerRun:false,
  coverageGapsWritten:false,
  checkoutFilesWritten:false,
  automaticGradePromotionByProducer:false,
  inputManualReviewStatusesRetained:true,
  elapsedMs:Math.round(performance.now()-started),
};
writeFileSync(resolve(output,'construction-receipt-v1.json'),`${JSON.stringify(receipt,null,2)}\n`,{flag:'wx',mode:0o600});
process.stdout.write(`${JSON.stringify({status:receipt.status,output,outputs,elapsedMs:receipt.elapsedMs})}\n`);
