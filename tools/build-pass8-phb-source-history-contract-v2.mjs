#!/usr/bin/env node
// Test-only, closed PHB application boundary. The earlier V1 scaffold and all
// earlier adapters remain immutable. No runtime policy or arbitrary ref input.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const root = new URL('../', import.meta.url);
const beforeCommit = 'ae7f02c6a5aac9ac8da1f7bc5cf5152e422fcd58';
const sourceCommit = '65991ec94579a2f9fc587118e15622313216fa14';
const metadataCommit = 'b46c4c222bdb32c71a48201d54f3bde19a06b2af';
const output = new URL('../tests/fixtures/pass8-phb-source-history-v2.json.gz', import.meta.url);
const sourcePaths = ['phb-spells.json','classes.json','rules.json','dist/data.json','citation-overrides.json','research/citation-continuations.json','dist/source-continuations.json','research/source-visual-reviews.json','research/price-source-inventory.json','research/mechanics-audit-progress.json'];
const metadataPaths = ['research/current-source-raster-snapshot.json','research/current-continuation-candidate-snapshot.json','research/gaps-limitations-next-task.json','dist/coverage-gaps.json','research/monetary-source-inventory.json'];
const rawPaths = ['dist/books.js'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (commit, path) => execFileSync('git', ['show', `${commit}:${path}`], {cwd:root,maxBuffer:100*1024*1024});
const objectSha = bytes => sha(JSON.stringify(JSON.parse(bytes)));
const files = {};
for (const path of [...sourcePaths, ...metadataPaths]) {
  const afterCommit = sourcePaths.includes(path) ? sourceCommit : metadataCommit;
  const before = git(beforeCommit, path), after = git(afterCommit, path);
  assert.notEqual(sha(before), sha(after), `${path}: an explicit changed boundary`);
  files[path] = {afterCommit,beforeRawSha256:sha(before),afterRawSha256:sha(after),beforeObjectSha256:objectSha(before),afterObjectSha256:objectSha(after),beforeSizeBytes:before.length,afterSizeBytes:after.length};
}
const rawFiles = {};
for (const path of rawPaths) {const before=git(beforeCommit,path),after=git(sourceCommit,path);rawFiles[path]={afterCommit:sourceCommit,beforeRawSha256:sha(before),afterRawSha256:sha(after),beforeSizeBytes:before.length,afterSizeBytes:after.length};}
assert.equal(files['dist/data.json'].afterRawSha256, '416ebc32862105042904e40280034772a51640d1ccbba298b9b8bf5ccbf709fe');
assert.equal(files['classes.json'].afterRawSha256, 'f5fd30a69b028489a22b70aa972d92dfffbe75c27bb2d09c4cc1c54a3a1497fb');
const proofPaths = ['tests/fixtures/pass8-phb-history-callers-before-v2.json.gz','tools/build-pass8-phb-spell-guidance-history-contract.mjs','tests/fixtures/pass8-phb-spell-guidance-current-test-expectations-before-a46.json.gz','research/source-audit-pass8-phb-class-content-independent-correction-review-v2.json','research/source-audit-pass8-phb-spell-guidance-seven-leaf-independent-review.json','research/source-frame-input-migration-phb-root-independent-review-v1.json'];
// Proof paths are intentionally literal; a missing review must stop rebuilding.
const proofs = proofPaths.map(path => {const bytes=readFileSync(new URL(path,root));return {path,sha256:sha(bytes),sizeBytes:bytes.length};});
const document = {schemaVersion:2,artifactType:'exact-pass8-phb-source-historical-projection',beforeCommit,sourceCommit,metadataCommit,sourcePaths,metadataPaths,rawPaths,
  scope:{spellOwners:10,classGuidanceAppends:24,classOwners:10,newDruidRules:1,newLimitedCrops:2,mechanicsReviewRecordsBefore:1205,mechanicsReviewRecordsAfter:1210,correctedMechanicsLeaves:7,frameGroups:9,frameJoins:102,sourceValuesRemainCurrentOutsideExplicitHistoricalTests:true},
  preservation:{initialFailedFullRun:{registered:840,passed:775,failed:65,inputsSha256:'ea8b656cd5933c20bc8ac1e9138d1a4976c9ae9e9e01ea887741e56068d904c7',logSha256:'1c8389405fdfcd5eb4a568fb4005b1444f39a79ab922db17b6e772b82083a4a3'},oldXpHelperSha256:'cc8a0ff5ad473026c71c6353b224903eabac8e960b4945df88e5da8191c4e9e7',oldXpContractSha256:'80b01d52c5a80dc98f09a506555e224c1cbf1da94b83b082e9fa9a6260e9b83c',oldCharacterHelperSha256:'67ebc08c45e088b41c3b208c1f01cffa6965c36ed8f9875a9d603f84ff5840b9'},
  policy:'Each scoped input must equal one whole captured state. Restore the complete ae7 Git object/bytes only after exact fingerprint checks; do not strip fields, infer approvals, or accept caller policy.',proofs,files,rawFiles};
const bytes = gzipSync(Buffer.from(JSON.stringify(document,null,2)+'\n'),{mtime:0});
if (process.argv.slice(2).join(' ') === '--write') writeFileSync(output,bytes);
else {assert.deepEqual(process.argv.slice(2),['--check']);assert.deepEqual(readFileSync(output),bytes,'closed PHB contract reproduces exactly');}
console.log(JSON.stringify({path:'tests/fixtures/pass8-phb-source-history-v2.json.gz',sha256:sha(bytes),jsonFiles:Object.keys(files).length,rawFiles:Object.keys(rawFiles).length}));
