#!/usr/bin/env node
// Fixed test-only boundary over the actual merged V27, UA source and metadata commits.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url);
const beforeCommit='6717c6f22bbf2f2b421327e4c8561b1d81df00d4';
const sourceCommit='6b3cfc8cb421a2c1fc2379c38abebe2075634981';
const metadataCommit='7314165d4e5b09772d2e4dee9a17e000ebc96c5b';
const sourcePaths=['citation-overrides.json','classes.json','dist/data.json','dist/scans/verified/classes-fighter.json','dist/scans/verified/classes-ranger.json','dist/scans/verified/classes-ua-barbarian.json','dist/scans/verified/classes-ua-cavalier.json','dist/scans/verified/classes-ua-druid.json','dist/scans/verified/classes-ua-paladin.json','dist/scans/verified/classes-ua-thief-acrobat.json','dist/scans/verified/spells-ua-illusionist-chromatic-orb.json','dist/source-continuations.json','research/citation-continuations.json','research/mechanics-audit-progress.json','research/price-source-inventory.json','research/source-visual-reviews.json','ua-spells.json'];
const metadataPaths=['dist/coverage-gaps.json','research/current-continuation-candidate-snapshot.json','research/current-source-audit-status.json','research/current-source-raster-snapshot.json','research/gaps-limitations-next-task.json','research/monetary-source-inventory.json','research/source-completeness-coverage.json','tests/fixtures/source-scan-inventory.json'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(ref,path)=>execFileSync('git',['show',`${ref}:${path}`],{cwd:root,maxBuffer:100*1024*1024});
const files=Object.fromEntries([...sourcePaths,...metadataPaths].map(path=>{
 const afterCommit=sourcePaths.includes(path)?sourceCommit:metadataCommit;
 const before=git(beforeCommit,path),after=git(afterCommit,path);
 assert.notEqual(sha(before),sha(after),`${path}: a changed existing path is required`);
 return[path,{afterCommit,beforeRawSha256:sha(before),afterRawSha256:sha(after),beforeObjectSha256:sha(JSON.stringify(JSON.parse(before))),afterObjectSha256:sha(JSON.stringify(JSON.parse(after))),beforeSizeBytes:before.length,afterSizeBytes:after.length}];
}));
assert.equal(files['dist/data.json'].afterRawSha256,'c076e0f6bb898eb52650fd886630089f17edc86cbc8e3c4ac349b817bceba0d3');
const proofPaths=['tests/fixtures/pass8-ua-source-first-full-failure-v1.json.gz','tests/fixtures/pass8-ua-source-history-callers-before-v1.json.gz','research/ua-source-history-integration-v1/first-full-failure-classification-v1.json','research/ua-source-history-integration-v1/old-kernel-preservation-manifest-v1.json','research/ua-source-postmerge-activation-v1/source-activation-manifest-v1.json','research/ua-source-metadata-v1/metadata-phase-manifest-v1.json','research/source-audit-pass8-ua-source-native-integration-independent-review-v1.json','research/source-audit-pass8-ua-mechanics-withdrawal-monetary-independent-review-v1.json','research/source-audit-pass8-ua-metadata-independent-review-v1.json'];
const proofs=proofPaths.map(path=>{const bytes=readFileSync(new URL(path,root));return{path,sha256:sha(bytes),sizeBytes:bytes.length};});
const document={schemaVersion:1,artifactType:'exact-pass8-ua-source-historical-projection',beforeCommit,sourceCommit,metadataCommit,sourcePaths,metadataPaths,rawPaths:[],files,proofs,firstFullFailure:{registered:936,passed:878,failed:58,skipped:0,inputManifestSha256:'d4c4f2a6a3e604a1d349ad84162b56ebcd12209182662cd9d7176fff18a94cb3',actualLogSha256:'17268ee088878dea5cde63f6bc8dfb76daf32cc0e9616a44a02ba4ef2c6ac8cc',registrationLimit:'File-level early failures reduce registration; two generic long-running file failures remain causally unclassified.'},scope:{spellBodies:5,classGuidanceOwners:7,newGuidanceLeaves:21,newFieldContextBindings:24,newVisualReviews:32,newContinuationGroups:10,withdrawnReviewPointerPairs:25,activeMechanicsReviewRecords:1215,newValueOrMechanicsApprovals:0},policy:'Only complete declared JSON before/after objects or exact raw bytes may restore the complete actual merged V27 predecessor. Then enter unchanged earlier closed adapters. No field stripping, arbitrary roots, catch-and-fallback, broad metadata removal, new-path fabricated predecessor or current-audit projection.'};
const bytes=gzipSync(Buffer.from(JSON.stringify(document,null,2)+'\n'),{mtime:0});
const output=new URL('../tests/fixtures/pass8-ua-source-history-v1.json.gz',import.meta.url);
if(process.argv.slice(2).join(' ')==='--write')writeFileSync(output,bytes);
else{assert.deepEqual(process.argv.slice(2),['--check']);assert.deepEqual(readFileSync(output),bytes);}
console.log(JSON.stringify({path:'tests/fixtures/pass8-ua-source-history-v1.json.gz',sha256:sha(bytes),jsonFiles:Object.keys(files).length,rawFiles:0}));
