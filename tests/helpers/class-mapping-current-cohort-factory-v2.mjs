// Proposed Native2 installed runtime. Fixed module-relative physical root;
// no caller-selected root, fixture, digest, filesystem, Git, counts or runtime.
import {readFileSync,lstatSync,realpathSync,readdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as n from '../../tools/class-mapping-native-contract-v2.mjs';
import * as v1 from '../../tools/class-mapping-native-contract-v1.mjs';
import {createRawGitReader,verifyRawCommit,inspectGitLayout,controlledGitEnvironment} from '../../tools/class-mapping-raw-git-v1.mjs';
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const {check,sha256,canonicalSha,equal,parseBytes,repoPath}=n;
export function createClassMappingCurrentSourceCohort(...args){
 check(args.length===0,'installed factory accepts no caller overrides');
 const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
 function readPhysical(path){
  const absolute=resolve(root,repoPath(path)),stat=lstatSync(absolute);
  check(stat.isFile()&&!stat.isSymbolicLink()&&realpathSync(absolute)===absolute,path+': physical regular non-symlink path');
  return readFileSync(absolute);
 }
 check(realpathSync(root)===root,'fixed physical Native2 root');
 const pinBytes=readPhysical(n.PIN_PATH),pinSha=sha256(pinBytes);
 // Parse the exact declarative codec as data. Never import or evaluate this file.
 const pins=n.parsePinModuleBytes(pinBytes,'current installation pins');
 check(pins.materialized===true,'installation remains unmaterialized; genuine code stage and independent certificates required');
 const fixtureBytes=readPhysical(n.FIXTURE_PATH);check(fixtureBytes.length===pins.fixtureSizeBytes&&sha256(fixtureBytes)===pins.fixtureSha256,'installed fixed Native2 fixture bytes');
 const basis=n.parseBasis(readPhysical(n.BASIS_PATH)),contract=parseBytes(fixtureBytes,'Native2 fixture');
 n.assertFixture(contract,basis);n.assertInstallationPins(pins,contract);
 const raw=createRawGitReader(root),git=raw.git;
 let proof=null,immutableRawProof=null;
 const snapshots=Object.entries(n.SNAPSHOT_PATHS);
 const sourceByPath=new Map(contract.sourceInputs.map(row=>[row.path,row]));
 function assertRootAndSource(){
  n.assertPlainJson({},'native entry global prototypes');check(realpathSync(root)===root,'fixed physical root');raw.assertView();
  check(resolve(git('rev-parse','--show-toplevel').toString('utf8').trim())===root,'fixed raw Git worktree');
  verifyRawCommit(git('cat-file','commit',n.SOURCE_COMMIT),n.SOURCE_COMMIT,n.SOURCE_TREE,n.PARENT_COMMIT);
  v1.assertDirectParentGitOutput(git('rev-list','--parents','-n','1',n.SOURCE_COMMIT),contract.sourceEpoch);
  check(git('rev-parse',n.SOURCE_COMMIT+'^{tree}').toString('utf8').trim()===n.SOURCE_TREE,'fixed Source2 raw tree');
  check(git('rev-parse',n.PARENT_COMMIT+'^{tree}').toString('utf8').trim()===n.PARENT_TREE,'fixed actual6502 parent tree');
  for(const id of contract.sourceEpoch.requiredAncestry)check(git('rev-parse',id+'^{commit}').toString('utf8').trim()===id,'exact inherited committed ancestor');
  for(let i=1;i<contract.sourceEpoch.requiredAncestry.length;i++)git('merge-base','--is-ancestor',contract.sourceEpoch.requiredAncestry[i-1],contract.sourceEpoch.requiredAncestry[i]);
  git('merge-base','--is-ancestor',n.SOURCE_COMMIT,'HEAD');
  const stage=contract.codeStage;
  verifyRawCommit(git('cat-file','commit',stage.commit),stage.commit,stage.tree,n.SOURCE_COMMIT);
  check(git('rev-parse',stage.commit+'^{tree}').toString('utf8').trim()===stage.tree,'actual reviewed Native2 code-stage tree');
  git('merge-base','--is-ancestor',stage.commit,'HEAD');
 }
 function assertDirectories(){
  for(const row of contract.catalogDirectories){
   const absolute=resolve(root,row.path),stat=lstatSync(absolute);
   check(stat.isDirectory()&&!stat.isSymbolicLink()&&realpathSync(absolute)===absolute,row.path+': fixed physical catalog directory');
   const actual=readdirSync(absolute,{withFileTypes:true}).map(entry=>{
    check(!entry.isSymbolicLink(),row.path+'/'+entry.name+': catalog symlink');
    return {name:entry.name,type:entry.isDirectory()?'directory':entry.isFile()?'file':'other'};
   }).sort((a,b)=>a.name.localeCompare(b.name));
   check(equal(actual,[...row.entries].sort((a,b)=>a.name.localeCompare(b.name))),row.path+': exact full directory membership');
  }
 }
 function freshPhysicalInputs(){
  assertRootAndSource();
  check(sha256(readPhysical(n.PIN_PATH))===pinSha,'Native2 pin module changed after load');
  const currentFixture=readPhysical(n.FIXTURE_PATH);
  check(currentFixture.length===pins.fixtureSizeBytes&&sha256(currentFixture)===pins.fixtureSha256,'Native2 fixture changed after load');
  for(const path of contract.absentInputs)check(!existsSync(resolve(root,path)),path+': observed absent input appeared');
  assertDirectories();
  const retain=new Set([...Object.values(n.SNAPSHOT_PATHS),...contract.catalogJsonPaths,...contract.sourceInputs.filter(row=>row.kind==='code').map(row=>row.path),...contract.protectedHistorical.filter(row=>row.kind==='json').map(row=>row.path),...contract.qualificationInputs.map(row=>row.path)]);
  const files=new Map(),observed=new Map(),dimensions=new Map();
  for(const row of [...contract.sourceInputs,...contract.protectedHistorical,...contract.installedCode,...contract.qualificationInputs]){
   const bytes=readPhysical(row.path);check(bytes.length===row.sizeBytes&&sha256(bytes)===row.sha256,row.path+': fresh physical SHA/size differs from closed pin');
   const old=observed.get(row.path);check(!old||(old.sha256===row.sha256&&old.sizeBytes===row.sizeBytes),row.path+': conflicting repeated byte obligation');observed.set(row.path,row);
   if(row.kind==='png'){
    check(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),row.path+': PNG signature');
    dimensions.set(row.path,[bytes.readUInt32BE(16),bytes.readUInt32BE(20)]);
   }
   if(retain.has(row.path))files.set(row.path,bytes);
  }
  check(dimensions.size===1844,'all1844 physical PNG pins checked');
  for(const path of contract.catalogJsonPaths){
   const catalog=parseBytes(files.get(path),path);
   for(const region of Array.isArray(catalog.regions)?catalog.regions:[]){
    const image=repoPath(path.slice(0,path.lastIndexOf('/')+1)+region.image),pin=sourceByPath.get(image),shape=dimensions.get(image);
    check(pin?.kind==='png'&&pin.sha256===region.sha256,image+': exact complete catalog-to-image hash join');
    check(shape&&shape[0]===region.width&&shape[1]===region.height,image+': exact catalog dimensions');
   }
  }
  return files;
 }
 const snapshotFrom=files=>Object.fromEntries(snapshots.map(([key,path])=>[key,parseBytes(files.get(path),key)]));
 function rawBlob(commit,path,expected,size){
  const bytes=git('show',commit+':'+repoPath(path));
  check(Buffer.isBuffer(bytes)&&sha256(bytes)===expected&&(size===undefined||bytes.length===size),commit+':'+path+': exact raw Git blob');
  return bytes;
 }
 function fixedRawAppDiff(){
  // This single fixed tuple is local to the Native2 factory, not an expanded
  // public raw-Git grammar or caller-selected command. The old helper is exact.
  raw.assertView();const layout=inspectGitLayout(root),env=controlledGitEnvironment();
  const bytes=execFileSync('/usr/bin/git',['--no-replace-objects','--git-dir='+layout.gitDir,'--work-tree='+layout.root,'-c','core.commitGraph=false','-c','protocol.allow=never','diff-tree','--no-commit-id','--raw','--no-abbrev','--no-renames','-r','-z',n.PARENT_COMMIT,n.SOURCE_COMMIT,'--'],{env,maxBuffer:1024*1024});
  raw.assertView();n.assertOnlyAppDiffBytes(bytes);
 }
 function qualifyCold(files){
  const candidate={source:n.SOURCE_COMMIT,tree:n.SOURCE_TREE,codeStage:contract.codeStage.commit};
  for(const row of [...contract.sourceInputs,...contract.protectedHistorical])rawBlob(n.SOURCE_COMMIT,row.path,row.sha256,row.sizeBytes);
  for(const row of contract.installedCode)rawBlob(contract.codeStage.commit,row.path,row.sha256,row.sizeBytes);
  const stubRef=pins.codeStagePinPreimage,stubBytes=rawBlob(contract.codeStage.commit,n.PIN_PATH,stubRef.sha256,stubRef.sizeBytes);
  const stub=n.parsePinModuleBytes(stubBytes,'raw code-stage pin stub');
  const pendingFixtureBytes=rawBlob(contract.codeStage.commit,n.FIXTURE_PATH,stub.fixtureSha256,stub.fixtureSizeBytes);
  n.assertCodeStagePinStub(stubBytes,contract,pendingFixtureBytes,basis);
  fixedRawAppDiff();
  const before=rawBlob(n.PARENT_COMMIT,n.APP_PATH,n.APP_BEFORE.sha256,n.APP_BEFORE.sizeBytes),after=rawBlob(n.SOURCE_COMMIT,n.APP_PATH,n.APP_AFTER.sha256,n.APP_AFTER.sizeBytes);
  n.assertUiDelta(before,after);
  check(files.get(n.APP_PATH).equals(after),'physical current app equals actual Source2 raw blob');
  const snapshot=snapshotFrom(files);n.assertSnapshot(contract,snapshot,basis);
  const official=createRequire(import.meta.url)(resolve(root,'tools/mechanics-audit.mjs')).buildLedger(structuredClone(snapshot.data),structuredClone(snapshot.mechanics.reviewRecords),{alreadyNormalized:true});
  v1.assertOfficialMechanicsProjection(snapshot,official);
  const producerFiles=new Map(contract.sourceInputs.filter(row=>row.kind==='code').map(row=>[row.path,files.get(row.path)]));
  check(equal(v1.assertProducerImportClosure(producerFiles),contract.producerImportEdges),'inherited complete static body-producer closure unchanged');
  const mmBytes=files.get(v1.MM_FIXTURE_PATH);check(mmBytes&&sha256(mmBytes)===v1.MM_FIXTURE_SHA,'immutable MM fixture retained');
  const mm=parseBytes(mmBytes,'historical MM fixture');
  check(mm.sourceEpoch.sourceCommit===v1.MM_SOURCE&&mm.sourceEpoch.sourceTree==='08010faf457df22cdb0a5ec35d2dcf79e622ade9','frozen MM source identity');
  for(const [path,expected] of Object.entries({...mm.rawInputs,...mm.selectedAdditionalInputs})){
   check(sourceByPath.has(path),path+': inherited raw9/selected12 freshness obligation missing');rawBlob(v1.MM_SOURCE,path,expected);
  }
  const prior=Object.fromEntries(snapshots.map(([key,path])=>[key,parseBytes(rawBlob(v1.MM_SOURCE,path,mm.rawInputs[path]??mm.selectedAdditionalInputs[path]),'historical MM '+key)]));
  for(const[key,value]of Object.entries(prior))check(canonicalSha(value)===mm.actualCurrentCanonicalSha256[key],key+': entire immutable MM canonical preimage');
  check(equal(v1.derivePreservation(prior,snapshot),basis.preservation),'all original Native1/MM owner/canonical/manual/mechanics preservation guards');
  const certs=Object.fromEntries(Object.entries(contract.certificates).map(([kind,ref])=>[kind,parseBytes(files.get(ref.path),kind+' certificate')]));
  n.assertCertificates(contract,certs);
  freshPhysicalInputs();
  immutableRawProof=freeze(candidate);
  proof=freeze({stage:n.STAGE,sourceCommit:n.SOURCE_COMMIT,sourceTree:n.SOURCE_TREE,fixture:{path:n.FIXTURE_PATH,sha256:pins.fixtureSha256},...structuredClone(contract.expected)});
 }
 function checked(){
  const files=freshPhysicalInputs();if(proof===null)qualifyCold(files);else check(immutableRawProof?.source===n.SOURCE_COMMIT&&immutableRawProof.codeStage===contract.codeStage.commit,'private raw proof cache exists only after full qualification');return files;
 }
 function identityResult(){
  return {summary:structuredClone(proof),inputHashes:{
   sourceBody:Object.fromEntries(contract.sourceInputs.map(row=>[row.path,row.sha256])),
   qualificationMetadata:{...Object.fromEntries(contract.qualificationInputs.map(row=>[row.path,row.sha256])),[n.FIXTURE_PATH]:pins.fixtureSha256,[n.PIN_PATH]:pinSha},
   protectedHistorical:Object.fromEntries(contract.protectedHistorical.map(row=>[row.path,row.sha256])),
   installedCode:Object.fromEntries(contract.installedCode.map(row=>[row.path,row.sha256])),
  }};
 }
 function assertClassMappingCurrentSourceIdentity(...args){check(args.length===0,'identity gate accepts no caller overrides');checked();return identityResult();}
 function qualifyClassMappingCurrentSourceEpoch(...args){check(args.length===0,'epoch gate accepts no caller overrides');const files=checked();return {inputs:snapshotFrom(files),...identityResult()};}
 function assertClassMappingCurrentSnapshot(...args){check(args.length===1,'snapshot assertion requires exactly one snapshot');n.assertPlainJson(args[0],'caller snapshot');const files=checked();n.assertSnapshot(contract,args[0],basis);check(equal(args[0],snapshotFrom(files)),'caller snapshot equals freshly read actual Source2 body');return structuredClone(proof);}
 return Object.freeze({assertClassMappingCurrentSourceIdentity,qualifyClassMappingCurrentSourceEpoch,assertClassMappingCurrentSnapshot});
}
