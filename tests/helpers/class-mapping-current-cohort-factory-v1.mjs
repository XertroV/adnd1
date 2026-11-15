// Proposed closed installed runtime. It accepts NO runtime fixture, expected
// digest, root, filesystem, Git or count overrides. No historical eager module
// is imported. The null installation pin intentionally prevents qualification.
import {readFileSync,lstatSync,realpathSync,existsSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeQualificationPins as pins} from '../../research/class-mapping-source-epoch-v1/native-qualification-pins-v1.mjs';
import {
  STAGE,MM_SOURCE,MM_FIXTURE_PATH,MM_FIXTURE_SHA,SNAPSHOT_PATHS,check,repoPath,
  sha256,canonicalSha,equal,assertPlainJson,parseBytes,assertClosedFixture,
  assertAssetClosure,assertCertificates,assertSnapshot,derivePreservation,assertDirectParentGitOutput,assertProducerImportClosure,assertOfficialMechanicsProjection,
} from '../../tools/class-mapping-native-contract-v1.mjs';
import {createRawGitReader,verifyRawCommit} from '../../tools/class-mapping-raw-git-v1.mjs';

export function createClassMappingCurrentSourceCohort(...arguments_) {
  check(arguments_.length===0,'installed factory accepts no caller overrides');
  check(pins.materialized===true && /^[a-f0-9]{64}$/.test(pins.fixtureSha256||''),'installation is unmaterialized; actual S1 identity and reviewed fixture digest are required');
  const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
  const pinsPath=fileURLToPath(new URL('../../research/class-mapping-source-epoch-v1/native-qualification-pins-v1.mjs',import.meta.url));
  check(lstatSync(pinsPath).isFile() && !lstatSync(pinsPath).isSymbolicLink() && realpathSync(pinsPath)===pinsPath,'physical installed pin module');
  const loadedPinsSha=sha256(readFileSync(pinsPath));
  const fixturePath=repoPath(pins.fixturePath),fixtureBytes=readFileSync(resolve(root,fixturePath));
  check(sha256(fixtureBytes)===pins.fixtureSha256,'installed fixed fixture bytes');
  const contract=parseBytes(fixtureBytes,'closed native fixture');assertClosedFixture(contract);
  const sourceRows=new Map(contract.sourceInputs.map(row=>[row.path,row]));
  const snapshotKeys=Object.keys(SNAPSHOT_PATHS);
  const codeRows=Object.entries(pins.codePins).map(([path,pin])=>({path:repoPath(path),...pin}));
  const requiredCode=[
    'tools/class-mapping-native-contract-v1.mjs','tools/class-mapping-frozen-parent-artifacts-v1.mjs','tools/class-mapping-raw-git-v1.mjs','tools/class-mapping-current-source-gate-v1.mjs',
    'tests/helpers/class-mapping-current-cohort-factory-v1.mjs','tests/helpers/class-mapping-current-cohort-v1.mjs',
  ];
  check(requiredCode.every(path=>codeRows.some(row=>row.path===path)) && codeRows.length===requiredCode.length,'exact installed code closure');
  for(const row of codeRows)check(/^[a-f0-9]{64}$/.test(row.sha256||'') && Number.isSafeInteger(row.sizeBytes) && row.sizeBytes>0,'installed code hash/size');
  let proof=null,immutableGitCache=null;
  const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
  function readPhysical(path) {
    const absolute=resolve(root,repoPath(path)),stat=lstatSync(absolute);
    check(stat.isFile() && !stat.isSymbolicLink() && realpathSync(absolute)===absolute,`${path}: physical regular non-symlink path`);
    return readFileSync(absolute);
  }
  const rawGit=createRawGitReader(root),git=rawGit.git;
  function assertRootAndAncestry() {
    check(realpathSync(root)===root,'fixed physical root');
    rawGit.assertView();
    check(resolve(git('rev-parse','--show-toplevel').toString('utf8').trim())===root,'fixed Git worktree root');
    assertDirectParentGitOutput(git('rev-list','--parents','-n','1',contract.sourceEpoch.sourceCommit),contract.sourceEpoch);
    verifyRawCommit(git('cat-file','commit',contract.sourceEpoch.sourceCommit),contract.sourceEpoch.sourceCommit,contract.sourceEpoch.sourceTree,contract.sourceEpoch.parentCommit);
    for(const value of contract.sourceEpoch.requiredAncestry)check(git('rev-parse',`${value}^{commit}`).toString('utf8').trim()===value,'exact committed ancestor object');
    for(let index=1;index<contract.sourceEpoch.requiredAncestry.length;index++)git('merge-base','--is-ancestor',contract.sourceEpoch.requiredAncestry[index-1],contract.sourceEpoch.requiredAncestry[index]);
    git('merge-base','--is-ancestor',contract.sourceEpoch.sourceCommit,'HEAD');
    check(git('rev-parse',`${contract.sourceEpoch.sourceCommit}^{tree}`).toString('utf8').trim()===contract.sourceEpoch.sourceTree,'exact source body tree');
    check(git('rev-parse',`${contract.sourceEpoch.parentCommit}^{tree}`).toString('utf8').trim()===contract.sourceEpoch.parentTree,'exact parent tree');
  }
  function freshPhysicalInputs() {
    assertPlainJson({},'public native call');assertRootAndAncestry();
    check(sha256(readPhysical('research/class-mapping-source-epoch-v1/native-qualification-pins-v1.mjs'))===loadedPinsSha,'installation pin code changed after load');
    check(sha256(readPhysical(fixturePath))===pins.fixtureSha256,'native fixture changed after load');
    for(const path of contract.absentInputs)check(!existsSync(resolve(root,repoPath(path))),`${path}: observed absent input appeared`);
    for(const row of contract.catalogDirectories){const absolute=resolve(root,repoPath(row.path)),stat=lstatSync(absolute);check(stat.isDirectory()&&!stat.isSymbolicLink()&&realpathSync(absolute)===absolute,'physical catalog directory');const actual=readdirSync(absolute,{withFileTypes:true}).map(entry=>{check(!entry.isSymbolicLink(),'catalog directory symlink');return {name:entry.name,type:entry.isDirectory()?'directory':entry.isFile()?'file':'other'};}).sort((a,b)=>a.name.localeCompare(b.name));check(equal(actual,[...row.entries].sort((a,b)=>a.name.localeCompare(b.name))),`${row.path}: catalog directory membership changed`);}
    const retain=new Set([...Object.values(SNAPSHOT_PATHS),MM_FIXTURE_PATH,...contract.assetClosure.catalogPaths,...contract.assetClosure.imagePaths,...Object.values(contract.certificates).map(ref=>ref.path),...contract.sourceInputs.filter(row=>row.kind==='code').map(row=>row.path)]);
    const all=new Map();
    for(const row of [...contract.sourceInputs,...contract.qualificationInputs,...contract.protectedArtifacts,...codeRows]) {
      const bytes=readPhysical(row.path);
      check(bytes.length===row.sizeBytes && sha256(bytes)===row.sha256,`${row.path}: fresh physical SHA/size differs from closed pin`);
      if(all.has(row.path))check(all.get(row.path).equals(bytes),`${row.path}: inconsistent duplicate manifest obligation`);
      if(retain.has(row.path))all.set(row.path,bytes);
    }
    return all;
  }
  function snapshotFrom(files) {return Object.fromEntries(snapshotKeys.map(key=>[key,parseBytes(files.get(SNAPSHOT_PATHS[key]),key)]));}
  function readCertificates(files) {return Object.fromEntries(Object.entries(contract.certificates).map(([key,ref])=>[key,parseBytes(files.get(ref.path),`${key} certificate`)]));}
  function qualifyCold(files) {
    // This temporary map is not published/cached until EVERY native/body,
    // parent-preimage, certificate and asset assertion below has succeeded.
    const candidate=new Map();
    const blob=(commit,path,sha,size,cache=true)=>{
      const bytes=git('show',`${commit}:${repoPath(path)}`);
      check(Buffer.isBuffer(bytes) && sha256(bytes)===sha && (size===undefined||bytes.length===size),`${commit}:${path}: exact raw Git blob`);
      if(cache)candidate.set(`${commit}\0${path}`,Buffer.from(bytes));return bytes;
    };
    for(const row of [...contract.sourceInputs,...contract.protectedArtifacts])blob(contract.sourceEpoch.sourceCommit,row.path,row.sha256,row.sizeBytes,false);
    check(files.has(MM_FIXTURE_PATH) && sha256(files.get(MM_FIXTURE_PATH))===MM_FIXTURE_SHA,'frozen MM fixture physical identity');
    const mm=parseBytes(files.get(MM_FIXTURE_PATH),'frozen MM fixture');
    check(mm.sourceEpoch.sourceCommit===MM_SOURCE && mm.sourceEpoch.sourceTree==='08010faf457df22cdb0a5ec35d2dcf79e622ade9','frozen MM source identity');
    for(const [path,expected]of Object.entries({...mm.rawInputs,...mm.selectedAdditionalInputs})) {
      check(sourceRows.has(path),`${path}: inherited raw9/selected12 freshness obligation missing`);
      blob(MM_SOURCE,path,expected);
    }
    const before=Object.fromEntries(snapshotKeys.map(key=>[key,parseBytes(candidate.get(`${MM_SOURCE}\0${SNAPSHOT_PATHS[key]}`),`historical MM ${key}`)]));
    for(const key of snapshotKeys)check(canonicalSha(before[key])===mm.actualCurrentCanonicalSha256[key],`${key}: full immutable MM preimage canonical identity`);
    const snapshot=snapshotFrom(files);assertSnapshot(contract,snapshot);
    const official=createRequire(import.meta.url)(resolve(root,'tools/mechanics-audit.mjs')).buildLedger(structuredClone(snapshot.data),structuredClone(snapshot.mechanics.reviewRecords),{alreadyNormalized:true});
    assertOfficialMechanicsProjection(snapshot,official);
    assertProducerImportClosure(new Map(contract.sourceInputs.filter(row=>row.kind==='code').map(row=>[row.path,files.get(row.path)])));
    check(equal(derivePreservation(before,snapshot),contract.preservation),'complete recomputed immutable-parent preservation projection');
    const catalogs=new Map(contract.assetClosure.catalogPaths.map(path=>[path,parseBytes(files.get(path),path)]));
    assertAssetClosure(contract.assetClosure,contract.sourceInputs,catalogs);
    for(const path of contract.assetClosure.imagePaths) {
      const bytes=files.get(path);check(bytes.length>=24 && bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),`${path}: PNG signature`);
      for(const catalog of catalogs.values())for(const region of catalog.regions)if(path.endsWith(`/${region.image}`))check(bytes.readUInt32BE(16)===region.width && bytes.readUInt32BE(20)===region.height,`${path}: exact catalog dimensions`);
    }
    assertCertificates(contract,readCertificates(files));
    const summary={stage:STAGE,sourceCommit:contract.sourceEpoch.sourceCommit,sourceTree:contract.sourceEpoch.sourceTree,fixture:{path:fixturePath,sha256:pins.fixtureSha256},...contract.expected};
    freshPhysicalInputs();
    immutableGitCache=candidate;
    proof=freeze(structuredClone(summary));
  }
  function checked() {
    const files=freshPhysicalInputs();
    if(proof===null)qualifyCold(files);
    else check(immutableGitCache instanceof Map && immutableGitCache.size>0,'private immutable Git cache exists only after complete qualification');
    return files;
  }
  function identityResult() {
    return {summary:structuredClone(proof),inputHashes:{
      sourceBody:Object.fromEntries(contract.sourceInputs.map(row=>[row.path,row.sha256])),
      qualificationMetadata:Object.fromEntries(contract.qualificationInputs.map(row=>[row.path,row.sha256])),
      protectedHistorical:Object.fromEntries(contract.protectedArtifacts.map(row=>[row.path,row.sha256])),
      installedCode:Object.fromEntries(codeRows.map(row=>[row.path,row.sha256])),
    }};
  }
  function assertClassMappingCurrentSourceIdentity(...args) {
    check(args.length===0,'native identity gate accepts no caller overrides');checked();return identityResult();
  }
  function qualifyClassMappingCurrentSourceEpoch(...args) {
    check(args.length===0,'native gate accepts no root/count/input override');
    const files=checked();return {inputs:snapshotFrom(files),...identityResult()};
  }
  function assertClassMappingCurrentSnapshot(...args) {
    check(args.length===1,'snapshot assertion requires exactly one snapshot');const [snapshot]=args;
    // Validate descriptors BEFORE accessing any caller property or hashing.
    assertPlainJson(snapshot,'caller snapshot');const files=checked();assertSnapshot(contract,snapshot);
    check(equal(snapshot,snapshotFrom(files)),'caller JSON equals freshly read actual body state');return structuredClone(proof);
  }
  return Object.freeze({qualifyClassMappingCurrentSourceEpoch,assertClassMappingCurrentSourceIdentity,assertClassMappingCurrentSnapshot});
}
