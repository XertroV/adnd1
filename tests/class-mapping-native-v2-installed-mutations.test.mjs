// Installed Source2 controls. Each mutation is restored in finally; every
// post-restore call must freshly qualify. No source/numeric grades are granted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdtempSync,mkdirSync,unlinkSync,renameSync,symlinkSync,lstatSync,rmdirSync,readlinkSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import * as n from '../tools/class-mapping-native-contract-v2.mjs';
import * as gate from '../tools/class-mapping-current-source-gate-v2.mjs';
import {createRawGitReader,verifyRawCommit,inspectGitLayout,controlledGitEnvironment} from '../tools/class-mapping-raw-git-v1.mjs';
const root=resolve(import.meta.dirname,'..');
const K='3da6f9f59fcca6b5ce7e3b55be15357182591edf';
const L='06d5278d28bc346ca9b7bca11622d6c8b4ec5a5a';
const LTREE='3d9f4953dfd8a62674e81cefdec89cf1cc2320f9';
test('materialized Native2 rejects physical, Git-view and caller mutations without losing freshness',{concurrency:false},async t=>{
 const started=Date.now(),out=mkdtempSync(join(tmpdir(),'adnd1-native2-installed-mutations-'));
 const raw=createRawGitReader(root),layout=inspectGitLayout(root),git=raw.git;
 verifyRawCommit(git('cat-file','commit',L),L,LTREE,K);git('merge-base','--is-ancestor',L,'HEAD');
 const gitStatus=()=>execFileSync('/usr/bin/git',['--no-replace-objects','-C',root,'status','--porcelain','--untracked-files=all'],{env:controlledGitEnvironment(),maxBuffer:1024*1024}).toString();
 const initialStatus=gitStatus(),headPath=resolve(layout.gitDir,'HEAD'),initialHead=readFileSync(headPath);
 const read=p=>readFileSync(resolve(root,p));
 const f=n.parseBytes(read(n.FIXTURE_PATH),'materialized fixture');
 const obligations=[...f.sourceInputs,...f.protectedHistorical,...f.installedCode,...f.qualificationInputs,{path:n.FIXTURE_PATH},{path:n.PIN_PATH}];
 const fullPhysicalDigest=()=>Object.fromEntries(obligations.map(r=>{const b=read(r.path);return[r.path,{sizeBytes:b.length,sha256:n.sha256(b)}]}));
 const before=fullPhysicalDigest(),q=gate.assertClassMappingCurrentSourceEpoch();
 assert.equal(q.summary.stage,n.STAGE);assert.equal(q.summary.sourceCommit,n.SOURCE_COMMIT);
 assert.deepEqual(gate.assertClassMappingCurrentSourceIdentity().summary,q.summary);
 assert.deepEqual(gate.assertClassMappingCurrentSnapshot(q.inputs),q.summary);
 const receipt={schemaVersion:1,kind:'actual-materialized-native2-mutation-replay',startedUtc:new Date().toISOString(),metadataCommit:L,metadataTree:LTREE,metadataDirectParent:K,rawLLineageVerified:true,sourceCommit:n.SOURCE_COMMIT,sourceTree:n.SOURCE_TREE,fixtureSha256:n.sha256(read(n.FIXTURE_PATH)),initialGitStatus:initialStatus,physicalObligationPaths:Object.keys(before).length,controls:[],scope:'Actual warm installed gate; fixed immutable Git blobs remain cached, physical and Git-view freshness remain mandatory.',restorationScope:'Bytes, paths, physical file types, modes checked for file-control cases, full Git status and only our newly created empty Git directories; timestamps are not asserted.',gradePromotions:{...n.ZERO_GRADES}};
 const save=()=>writeFileSync(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');save();
 async function control(name,change,restore,pattern,invoke=()=>gate.assertClassMappingCurrentSourceIdentity()){
  await t.test(name,()=>{
   const row={name,status:'RUNNING'},index=receipt.controls.length;receipt.controls.push(row);save();
   let failure;
   try{
    change(row,index);let actual;
    try{invoke();}catch(e){actual=e;}
    assert.ok(actual,'mutated installed state must be rejected');row.rejection=String(actual.message);assert.match(row.rejection,pattern);row.rejected=true;
   }catch(e){failure=e;row.failure=String(e.stack||e);}
   finally{
    try{restore(row,index);row.restored=true;assert.deepEqual(gate.assertClassMappingCurrentSourceIdentity().summary,q.summary);row.postRestoreFreshIdentity='PASS';if(row.unexpectedOccupantPath)throw new Error('Unexpected app occupant was preserved and original restored: '+row.unexpectedOccupantPath);}
    catch(e){row.restoreFailure=String(e.stack||e);failure??=e;}
    row.status=failure?'FAIL':'PASS';save();
   }
   if(failure)throw failure;
  });
 }
 async function fileControl(name,path,mutate,pattern=/fresh physical SHA\/size differs/){
  const absolute=resolve(root,path);assert.ok(existsSync(absolute));const original=readFileSync(absolute),mode=lstatSync(absolute).mode;
  await control(name,(row,index)=>{const changed=mutate(Buffer.from(original));writeFileSync(join(out,'before-'+index+'.bin'),original);writeFileSync(join(out,'mutant-'+index+'.bin'),changed);row.path=path;row.beforeSha256=n.sha256(original);row.mutantSha256=n.sha256(changed);writeFileSync(absolute,changed);},row=>{writeFileSync(absolute,original);assert.ok(readFileSync(absolute).equals(original));assert.equal(lstatSync(absolute).mode,mode);row.afterSha256=n.sha256(readFileSync(absolute));},pattern);
 }
 const append=b=>Buffer.concat([b,Buffer.from('\n ')]);
 await fileControl('current app byte edit',n.APP_PATH,append);
 const extraPng=f.additionalPngInputs.find(r=>r.path==='dist/scans/dagger/ua28-dagger-thrown.png');assert.ok(extraPng);
 await fileControl('formerly directory-only PNG byte and width edit',extraPng.path,b=>{b[19]^=1;return b;});
 for(const [key,path]of Object.entries(n.SNAPSHOT_PATHS))await fileControl('entire '+key+' JSON physical bytes remain pinned',path,append);
 await fileControl('protected historical fixture byte edit',n.BASIS_PATH,append);
 await fileControl('installed contract module byte edit','tools/class-mapping-native-contract-v2.mjs',append);
 await fileControl('current installation pin source byte edit',n.PIN_PATH,append,/Native2 pin module changed after load/);
 await fileControl('current fixture byte edit',n.FIXTURE_PATH,append,/Native2 fixture changed after load/);
 await fileControl('accepted closure certificate byte edit',n.CERTIFICATE_PATHS.closure,append);
 await fileControl('catalog physical byte edit',f.catalogJsonPaths[0],append);
 const newPng=resolve(root,'dist/scans/verified/__native2_control_unlisted.png');assert.ok(!existsSync(newPng));
 await control('unlisted PNG directory membership',()=>writeFileSync(newPng,Buffer.from('control')),()=>{if(existsSync(newPng))unlinkSync(newPng);assert.ok(!existsSync(newPng));},/exact full directory membership/);
 const app=resolve(root,n.APP_PATH),backup=join(out,'app-symlink-original.bin');
 await control('same-byte app symlink is rejected',()=>{renameSync(app,backup);symlinkSync(backup,app);},row=>{if(existsSync(backup)){let st;try{st=lstatSync(app);}catch(e){if(e.code!=='ENOENT')throw e;}if(st){if(st.isSymbolicLink()&&readlinkSync(app)===backup)unlinkSync(app);else{const preserved=join(out,'unexpected-app-occupant');assert.ok(!existsSync(preserved));renameSync(app,preserved);row.unexpectedOccupantPath=preserved;}}renameSync(backup,app);}assert.ok(!lstatSync(app).isSymbolicLink());assert.equal(n.sha256(readFileSync(app)),before[n.APP_PATH].sha256);},/physical regular non-symlink path/);
 for(const [relative,pattern]of [['info/grafts',/grafts file is not permitted/],['shallow',/alternate\/shallow object view is not permitted/],['objects/info/alternates',/alternate\/shallow object view is not permitted/],['objects/info/http-alternates',/alternate\/shallow object view is not permitted/],['refs/replace/'+K,/loose replacement refs are not permitted/]]){
  const absolute=resolve(layout.gitDir,relative);assert.ok(!existsSync(absolute),relative+' preimage must be absent');
  const newParents=[];for(let p=dirname(absolute);p!==layout.gitDir&&!existsSync(p);p=dirname(p))newParents.push(p);
  await control('Git view rejects '+relative,row=>{row.initiallyAbsentParentDirs=[...newParents];mkdirSync(dirname(absolute),{recursive:true});writeFileSync(absolute,n.PARENT_COMMIT+'\n');},row=>{if(existsSync(absolute))unlinkSync(absolute);assert.ok(!existsSync(absolute));for(const p of newParents){if(existsSync(p))rmdirSync(p);assert.ok(!existsSync(p));}row.ownedEmptyParentDirsRemoved=true;},pattern);
 }
 const packed=resolve(layout.gitDir,'packed-refs'),packedHad=existsSync(packed),packedBefore=packedHad?readFileSync(packed):Buffer.alloc(0);
 await control('packed replacement ref is rejected',()=>writeFileSync(packed,Buffer.concat([packedBefore,Buffer.from(n.PARENT_COMMIT+' refs/replace/'+K+'\n')])),()=>{if(packedHad)writeFileSync(packed,packedBefore);else if(existsSync(packed))unlinkSync(packed);},/packed replacement refs are not permitted/);
 await control('HEAD before the Source2 source commit is rejected',()=>writeFileSync(headPath,n.PARENT_COMMIT+'\n'),()=>{writeFileSync(headPath,initialHead);assert.ok(readFileSync(headPath).equals(initialHead));},/merge-base --is-ancestor 400f6e9d123d8a654b9b9af48133a2533506e73d HEAD/);
 for(const [name,invoke,pattern]of [
  ['identity rejects caller root override',()=>gate.assertClassMappingCurrentSourceIdentity({root}),/no caller overrides/],
  ['epoch rejects even an explicit undefined argument',()=>gate.assertClassMappingCurrentSourceEpoch(undefined),/no caller overrides/],
  ['snapshot rejects missing argument',()=>gate.assertClassMappingCurrentSnapshot(),/exactly one snapshot/],
  ['snapshot rejects extra argument',()=>gate.assertClassMappingCurrentSnapshot(q.inputs,undefined),/exactly one snapshot/],
 ])await control(name,()=>{},()=>{},pattern,invoke);
 let getters=0,traps=0;const accessor={...q.inputs};Object.defineProperty(accessor,'data',{enumerable:true,get(){getters++;return q.inputs.data;}});
 await control('snapshot accessor rejected before getter invocation',()=>{},()=>assert.equal(getters,0),/accessor/,()=>gate.assertClassMappingCurrentSnapshot(accessor));
 const proxy=new Proxy(q.inputs,{get(){traps++;throw Error('unexpected proxy get');},ownKeys(){traps++;throw Error('unexpected proxy ownKeys');}});
 await control('snapshot proxy rejected before traps',()=>{},()=>assert.equal(traps,0),/proxy/,()=>gate.assertClassMappingCurrentSnapshot(proxy));
 const swapped={...q.inputs,inventory:structuredClone(q.inputs.inventory)},rows=swapped.inventory.fieldEvidenceBindings;
 const a=rows.find(r=>r.reviewStatus==='field-target-pending'),b=rows.find(r=>r.reviewStatus==='field-target-reviewed');assert.ok(a&&b);[a.reviewStatus,b.reviewStatus]=[b.reviewStatus,a.reviewStatus];
 await control('balanced target status swap does not acquire a grade',()=>{},()=>{},/exact whole current JSON state/,()=>gate.assertClassMappingCurrentSnapshot(swapped));
 assert.deepEqual(fullPhysicalDigest(),before,'all physical obligations exactly restored');assert.equal(gitStatus(),initialStatus);assert.ok(readFileSync(headPath).equals(initialHead));raw.assertView();
 receipt.finishedUtc=new Date().toISOString();receipt.durationMs=Date.now()-started;receipt.allPhysicalObligationsRestored=true;receipt.allGitViewControlsRemoved=true;receipt.finalGitStatus=gitStatus();receipt.status=receipt.controls.every(r=>r.status==='PASS')?'PASS':'FAIL';save();
 t.diagnostic('Exact materialized control receipt: '+join(out,'receipt.json'));
 assert.equal(receipt.controls.length,28);assert.equal(receipt.status,'PASS');
});
