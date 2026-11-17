// Strict raw-Git join from the committed O report receipt to the current Source2 target.
// This verifies O's immutable commit identity and outputs; the report verifier is
// still called separately, with zero arguments, by every production runner path.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {lstatSync,readFileSync,realpathSync} from 'node:fs';
import {relative,resolve,sep} from 'node:path';
import {createRawGitReader,verifyRawCommit} from './class-mapping-raw-git-v1.mjs';

export const SOURCE2_O_JOIN_PINS=Object.freeze({
  outputCommit:'9664548c18a09492bef2565edf2b3038a35592ef',
  outputTree:'915761577a5e56abcb07f39f01939be306dd9e44',
  outputParentCommit:'295f865d214e766df20a9ac925210810857d9a8e',
  bodyCommit:'400f6e9d123d8a654b9b9af48133a2533506e73d',
  bodyTree:'664c02504efcece25669d2f9c3fdb26437cd5b09',
  reportQccCommit:'93386845e8492a3b064bdc74c794f676b667594b',
  metadataReceiptPath:'research/class-mapping-source-epoch-v2/metadata-stage-v3.json',
  metadataReceiptSha256:'67ea87e735328b630324458937eb019a2973c6b390b429fb2c76a62f718af606',
  metadataReceiptSizeBytes:1442910,
  reportOutputContractCount:26,
  newOFileCount:26,
  newOFileBytes:183170305,
  transitionPath:'research/class-mapping-current-adapters-v2/source-body-handoff-transition-v2.json',
  transitionSha256:'64441c9a983a4b0fd3b8253c0bace30826a73e6dee5754f19af3a7218f93bc22',
  transitionSizeBytes:7993,
  migrationManifestPath:'research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v8.json',
  migrationManifestSha256:'f2635d94004f59c1bb9db6a1056533b1e90cc4d9a1a67e8884dc238cbd8d42af',
  migrationManifestSizeBytes:385096,
});
const check=(ok,message)=>{if(!ok)throw new Error(`Source2 O receipt join: ${message}`);};
const verifiedProofs=new WeakSet();
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const sha1Object=(kind,bytes)=>createHash('sha1').update(`${kind} ${bytes.length}\0`).update(bytes).digest('hex');
const isSha1=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const isSha256=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const isSize=n=>Number.isSafeInteger(n)&&n>=0;
function safeRepoPath(value){
  check(typeof value==='string'&&/^[A-Za-z0-9._/-]+$/.test(value)&&!value.startsWith('/')&&!value.includes('\\')&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'),`unsafe repository path ${String(value)}`);
  return value;
}
function physical(root,relativePath){
  const path=safeRepoPath(relativePath),absolute=resolve(root,path),rel=relative(root,absolute),stat=lstatSync(absolute);
  check(rel!=='..'&&!rel.startsWith(`..${sep}`),'physical file remains inside repository');
  check(stat.isFile()&&!stat.isSymbolicLink()&&realpathSync(absolute)===absolute,`physical regular non-symlink file ${path}`);
  return readFileSync(absolute);
}
function parsedCommit(bytes,commit,label){
  check(sha1Object('commit',bytes)===commit,`${label} raw commit object hash`);
  const header=bytes.toString('utf8').split('\n\n',1)[0].split('\n');
  const trees=header.filter(row=>row.startsWith('tree ')),parents=header.filter(row=>row.startsWith('parent '));
  check(trees.length===1&&/^[a-f0-9]{40}$/.test(trees[0].slice(5)),`${label} exact tree header`);
  check(parents.every(row=>/^parent [a-f0-9]{40}$/.test(row)),`${label} valid parent headers`);
  return {tree:trees[0].slice(5),parents:parents.map(row=>row.slice(7))};
}
export function assertOutputCommitAncestor(rawGit,outputCommit,currentHeadCommit){
  check(rawGit&&typeof rawGit.git==='function','controlled raw-Git reader');
  check(isSha1(outputCommit)&&isSha1(currentHeadCommit),'full lowercase O and current HEAD commit IDs');
  try{rawGit.git('merge-base','--is-ancestor',outputCommit,currentHeadCommit);}
  catch{throw new Error('Source2 O receipt join: pinned O commit is not an ancestor of the verified current HEAD');}
  return true;
}
export function verifySource2OReceiptJoin(repositoryRoot,manifestJoin,verifiedReportReceipt,manifestSha256){
  const root=realpathSync(repositoryRoot);
  check(manifestJoin&&typeof manifestJoin==='object'&&!Array.isArray(manifestJoin),'manifest reportOutputJoin object');
  const manifestBytes=physical(root,SOURCE2_O_JOIN_PINS.migrationManifestPath);
  const actualManifestSha256=sha256(manifestBytes);
  check(manifestBytes.length===SOURCE2_O_JOIN_PINS.migrationManifestSizeBytes&&actualManifestSha256===SOURCE2_O_JOIN_PINS.migrationManifestSha256&&manifestSha256===actualManifestSha256,'exact pinned v8 manifest digest');
  let pinnedManifest;try{pinnedManifest=JSON.parse(manifestBytes.toString('utf8'));}catch{throw new Error('Source2 O receipt join: pinned v8 migration manifest is invalid JSON');}
  check(manifestJoin.status==='O_COMMITTED_RECEIPT_VERIFIED','v8 manifest status is receipt-verified');
  for(const key of ['outputCommit','outputTree','outputParentCommit','bodyCommit','bodyTree','reportQccCommit','metadataReceiptPath','metadataReceiptSha256','metadataReceiptSizeBytes','reportOutputContractCount','newOFileCount','newOFileBytes']){
    check(manifestJoin[key]===SOURCE2_O_JOIN_PINS[key],`exact v8 O pin ${key}`);
  }
  check(manifestJoin.separateAlreadyCommittedTransitionPath===SOURCE2_O_JOIN_PINS.transitionPath,'transition remains the already-committed prerequisite');
  check(isDeepStrictEqual(manifestJoin,pinnedManifest.currentSuiteSemantics?.reportOutputJoin),'report-output join equals the exact pinned v8 manifest field');
  check(verifiedReportReceipt&&typeof verifiedReportReceipt==='object'&&!Array.isArray(verifiedReportReceipt),'zero-argument verifier result object');
  check(verifiedReportReceipt.path===SOURCE2_O_JOIN_PINS.metadataReceiptPath,'verifier receipt path');
  check(verifiedReportReceipt.sha256===SOURCE2_O_JOIN_PINS.metadataReceiptSha256,'verifier receipt raw SHA256');
  check(verifiedReportReceipt.sourceCommit===SOURCE2_O_JOIN_PINS.bodyCommit&&verifiedReportReceipt.sourceTree===SOURCE2_O_JOIN_PINS.bodyTree,'verifier source-body B identity');
  check(verifiedReportReceipt.reportQccCommit===SOURCE2_O_JOIN_PINS.reportQccCommit&&verifiedReportReceipt.qualifierCodeCommit===SOURCE2_O_JOIN_PINS.reportQccCommit,'verifier M identity');
  check(isSha1(verifiedReportReceipt.headCommit),'verifier current descendant HEAD identity');

  const rawGit=createRawGitReader(root);rawGit.assertView();
  const currentHead=rawGit.git('rev-parse','--verify','HEAD^{commit}').toString('utf8').trim();
  check(currentHead===verifiedReportReceipt.headCommit,'verifier headCommit equals raw current HEAD');
  const currentHeadBytes=rawGit.git('cat-file','commit',currentHead);
  const currentHeadHeader=parsedCommit(currentHeadBytes,currentHead,'current HEAD');
  const actualHeadTree=rawGit.git('rev-parse','--verify',`${currentHead}^{tree}`).toString('utf8').trim();
  check(currentHeadHeader.tree===actualHeadTree,'raw current HEAD tree identity');
  // HEAD may be O itself or any later descendant (including the later v8 commit).
  // We prove ancestry; we never require headCommit === outputCommit.
  assertOutputCommitAncestor(rawGit,SOURCE2_O_JOIN_PINS.outputCommit,currentHead);

  const oBytes=rawGit.git('cat-file','commit',SOURCE2_O_JOIN_PINS.outputCommit);
  verifyRawCommit(oBytes,SOURCE2_O_JOIN_PINS.outputCommit,SOURCE2_O_JOIN_PINS.outputTree,SOURCE2_O_JOIN_PINS.outputParentCommit);
  const oTree=rawGit.git('rev-parse','--verify',`${SOURCE2_O_JOIN_PINS.outputCommit}^{tree}`).toString('utf8').trim();
  check(oTree===SOURCE2_O_JOIN_PINS.outputTree,'pinned O raw tree');

  const rawReceipt=rawGit.git('show',`${SOURCE2_O_JOIN_PINS.outputCommit}:${SOURCE2_O_JOIN_PINS.metadataReceiptPath}`);
  check(rawReceipt.length===SOURCE2_O_JOIN_PINS.metadataReceiptSizeBytes,'raw O metadata receipt size');
  check(sha256(rawReceipt)===SOURCE2_O_JOIN_PINS.metadataReceiptSha256,'raw O metadata receipt hash');
  const currentPhysicalReceipt=physical(root,SOURCE2_O_JOIN_PINS.metadataReceiptPath);
  check(currentPhysicalReceipt.equals(rawReceipt),'physical metadata receipt remains byte-identical to O');
  let metadata;try{metadata=JSON.parse(rawReceipt.toString('utf8'));}catch{throw new Error('Source2 O receipt join: raw O metadata receipt is invalid UTF-8 JSON');}
  check(Buffer.from(JSON.stringify(metadata,null,2)+'\n').equals(rawReceipt),'canonical raw O metadata receipt bytes');
  check(isDeepStrictEqual(metadata,verifiedReportReceipt.receipt),'returned verified receipt object equals raw O metadata receipt');
  check(metadata.sourceEpoch?.sourceBody?.commit===SOURCE2_O_JOIN_PINS.bodyCommit&&metadata.sourceEpoch?.sourceBody?.tree===SOURCE2_O_JOIN_PINS.bodyTree,'raw O receipt exact B source-body identity');
  check(metadata.qualifierProducer?.commit===SOURCE2_O_JOIN_PINS.reportQccCommit&&metadata.qualifierProducer?.tree==='2a9639694d817b02a7be762a275507e159a96d06','raw O receipt exact M report-QCC identity');
  check(metadata.semantics?.semanticPass===false&&metadata.semantics?.sourceCompletenessCertified===false&&metadata.semantics?.visualReviewPromoted===false,'receipt retains semantic/source-grade boundaries');

  const outputs=metadata.outputs;
  check(Array.isArray(outputs)&&outputs.length===SOURCE2_O_JOIN_PINS.reportOutputContractCount,'exact 26 report-output contract rows');
  const seen=new Set();let freshRows=0;let freshBytes=SOURCE2_O_JOIN_PINS.metadataReceiptSizeBytes;let transitionSeen=false;
  for(const row of outputs){
    check(row&&typeof row==='object'&&!Array.isArray(row),'typed report output row');
    const path=safeRepoPath(row.path);check(path.startsWith('research/'),`report output under research/: ${path}`);
    check(!seen.has(path),`unique report output path ${path}`);seen.add(path);
    check(isSha256(row.rawSha256)&&isSize(row.sizeBytes),'output raw hash and byte size');
    check(['json','gzip-json','markdown'].includes(row.format),`known output format ${path}`);
    const blob=rawGit.git('show',`${SOURCE2_O_JOIN_PINS.outputCommit}:${path}`);
    check(blob.length===row.sizeBytes&&sha256(blob)===row.rawSha256,`raw O output blob matches verified receipt pin ${path}`);
    check(physical(root,path).equals(blob),`current physical report output remains byte-identical to raw O ${path}`);
    if(path===SOURCE2_O_JOIN_PINS.transitionPath){transitionSeen=true;check(row.rawSha256===SOURCE2_O_JOIN_PINS.transitionSha256&&row.sizeBytes===SOURCE2_O_JOIN_PINS.transitionSizeBytes,'transition receipt exact prior-commit pin');}
    else{check(path.startsWith('research/class-mapping-source-epoch-v2/reports/'),`fresh report path ${path}`);freshRows++;freshBytes+=blob.length;}
  }
  check(transitionSeen&&freshRows===25,'one committed transition plus exactly 25 fresh report output rows');
  check(freshRows+1===SOURCE2_O_JOIN_PINS.newOFileCount,'25 fresh reports plus the metadata receipt are exactly 26 new O files');
  check(freshBytes===SOURCE2_O_JOIN_PINS.newOFileBytes,'exact 26-file O byte total from raw O blobs');
  rawGit.assertView();
  const proof=Object.freeze({
    manifestSha256,reportReceiptSha256:verifiedReportReceipt.sha256,
    outputCommit:SOURCE2_O_JOIN_PINS.outputCommit,outputTree:SOURCE2_O_JOIN_PINS.outputTree,
    outputParentCommit:SOURCE2_O_JOIN_PINS.outputParentCommit,currentHeadCommit:currentHead,currentHeadTree:currentHeadHeader.tree,
    metadataReceiptPath:SOURCE2_O_JOIN_PINS.metadataReceiptPath,metadataReceiptSha256:SOURCE2_O_JOIN_PINS.metadataReceiptSha256,
    reportQccCommit:SOURCE2_O_JOIN_PINS.reportQccCommit,bodyCommit:SOURCE2_O_JOIN_PINS.bodyCommit,
    reportOutputContractCount:outputs.length,newOFileCount:freshRows+1,newOFileBytes:freshBytes,
  });
  verifiedProofs.add(proof);
  return proof;
}
export function assertVerifiedSource2OJoinProof(proof){
  check(proof&&typeof proof==='object'&&verifiedProofs.has(proof),'join proof must come from the raw-Git O verifier in this process');
  return proof;
}
