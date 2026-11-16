// Pure controls over actual Source2 inputs. These are not installed Native2
// qualification. The actual zero-argument gate has its separate current test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as n from '../tools/class-mapping-native-contract-v2.mjs';
import {createClassMappingCurrentSourceCohort} from './helpers/class-mapping-current-cohort-factory-v2.mjs';
import * as loader from './helpers/class-mapping-current-cohort-v2.mjs';
import * as gate from '../tools/class-mapping-current-source-gate-v2.mjs';
import {createRawGitReader,verifyRawCommit,inspectGitLayout,controlledGitEnvironment,assertReadOnlyGitArgs} from '../tools/class-mapping-raw-git-v1.mjs';
const sourceRoot=resolve(process.cwd()),fixtureRoot=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(sourceRoot,path));
const basis=n.parseBasis(read(n.BASIS_PATH));
const pendingFixtureBytes=readFileSync(resolve(fixtureRoot,n.FIXTURE_PATH));
const original=n.parseBytes(pendingFixtureBytes,'actual proposed pending fixture');
const fixture=structuredClone(original);
fixture.status='body-closed-awaiting-code-stage-and-independent-certificates';fixture.codeStage=null;fixture.qualificationInputs=[];fixture.certificates={preservation:null,closure:null};
const clone=()=>structuredClone(fixture);
const raw=createRawGitReader(sourceRoot);
const before=raw.git('show',n.PARENT_COMMIT+':'+n.APP_PATH),after=read(n.APP_PATH);
const snapshot=Object.fromEntries(Object.entries(n.SNAPSHOT_PATHS).map(([key,path])=>[key,n.parseBytes(read(path),key)]));
const rowsSort=rows=>rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
test('actual Source2 detached fixture and exact two UI transforms validate without qualification',()=>{
 n.assertFixture(fixture,basis,{allowPending:true});n.assertSnapshot(fixture,snapshot,basis);n.assertUiDelta(before,after);
 assert.equal(fixture.sourceInputs.length,3063);assert.equal(fixture.sourceInputs.filter(x=>x.kind==='png').length,1844);
 assert.deepEqual(fixture.gradePromotions,{fieldTargets:0,sourceValues:0,context:0,defaults:0,numeric:0,mechanics:0});
});
for(const [label,path]of [['dagger','dist/scans/dagger/ua28-dagger-thrown.png'],['verified','dist/scans/verified/dmg-11-4ab7c142a0c28bd9.png']]){
 test('omitting '+label+' formerly directory-only PNG is rejected',()=>{
  const f=clone();f.additionalPngInputs=f.additionalPngInputs.filter(x=>x.path!==path);
  assert.throws(()=>n.assertExtraPngRows(f.additionalPngInputs,basis),/exact427/);
 });
}
test('balanced extra PNG path substitution preserves counts but rejects exact membership',()=>{
 const f=clone();f.additionalPngInputs[0].path='dist/scans/verified/zz-unadmitted.png';rowsSort(f.additionalPngInputs);
 const rebound=n.certificateSubject(f,'closure');assert.equal(rebound.extraPngInputsSha256,n.EXTRA_PNG_SHA);
 assert.throws(()=>n.assertExtraPngRows(f.additionalPngInputs,basis),/exact427/);
});
test('known extra PNG byte substitution with rehashed subject rejects independent pin digest',()=>{
 const f=clone();f.additionalPngInputs[0].sha256='0'.repeat(64);
 n.certificateSubject(f,'closure');
 assert.throws(()=>n.assertExtraPngRows(f.additionalPngInputs,basis),/independently derived427/);
});
test('inherited Native1 source row cannot be silently repinned',()=>{
 const f=clone();f.sourceInputs.find(x=>x.path!=='dist/app.js').sha256='0'.repeat(64);
 n.certificateSubject(f,'closure');
 assert.throws(()=>n.assertSourceRows(f.sourceInputs,basis,f.additionalPngInputs),/exact inherited2636/);
});
test('balanced source row replacement cannot hide behind3063 counts',()=>{
 const f=clone();f.sourceInputs[0].path='aa-unadmitted.json';rowsSort(f.sourceInputs);
 assert.throws(()=>n.assertSourceRows(f.sourceInputs,basis,f.additionalPngInputs),/exact inherited2636/);
});
test('catalog name and type substitutions preserve counts but reject exact directory universe',()=>{
 const a=clone();a.catalogDirectories[1].entries[0].name='zz-unadmitted.png';
 assert.throws(()=>n.assertDirectories(a.catalogDirectories,basis),/exact original three/);
 const b=clone();b.catalogDirectories[1].entries[0].type='directory';
 assert.throws(()=>n.assertDirectories(b.catalogDirectories,basis),/exact original three/);
 const c=clone();c.catalogDirectories.push({path:'dist/scans/unadmitted',entries:[]});
 assert.throws(()=>n.assertDirectories(c.catalogDirectories,basis),/exact original three/);
});
test('Native1 frozen code/certificate artifact cannot be replaced by another row',()=>{
 const f=clone();f.protectedHistorical[0].path='aa-unadmitted-history.json';rowsSort(f.protectedHistorical);
 n.certificateSubject(f,'preservation');
 assert.throws(()=>n.assertProtected(f.protectedHistorical),/all29/);
});
test('Native2 installed code cannot omit or replace raw Git helper',()=>{
 const f=clone();f.installedCode=f.installedCode.filter(x=>x.path!=='tools/class-mapping-raw-git-v1.mjs');
 assert.throws(()=>n.assertCodeRows(f.installedCode),/exact seven-module/);
 const g=clone();g.installedCode[g.installedCode.length-1].path='tools/zz-unadmitted.mjs';rowsSort(g.installedCode);
 assert.throws(()=>n.assertCodeRows(g.installedCode),/exact seven-module/);
});
test('Source2 identity rejects stale parent/tree/source and ancestry contraction',()=>{
 for(const edit of [f=>f.sourceEpoch.sourceCommit=n.PARENT_COMMIT,f=>f.sourceEpoch.parentTree=n.SOURCE_TREE,f=>f.sourceEpoch.requiredAncestry.splice(0,1)]){
  const f=clone();edit(f);assert.throws(()=>n.assertSourceEpoch(f.sourceEpoch,basis),/fixed genuine|exact inherited ancestry/);
 }
});
function attributeFunction(text){const a=text.indexOf('function attributeLayoutHTML('),b=text.indexOf('\nfunction attributesHTML(',a);assert.ok(a>=0&&b>a);return text.slice(a,b);}
test('reverting either approved app hunk is rejected',()=>{
 const a=after.toString().replace(attributeFunction(after.toString()),attributeFunction(before.toString()));
 assert.throws(()=>n.assertUiDelta(before,Buffer.from(a)),/only exact two/);
 const old=before.toString().split('\n').find(x=>x.includes('const firstCitedPage=')),now=after.toString().split('\n').find(x=>x.includes('const firstCitedPage='));
 assert.throws(()=>n.assertUiDelta(before,Buffer.from(after.toString().replace(now,old))),/only exact two/);
});
test('third app byte change or edited accepted literal is rejected',()=>{
 assert.throws(()=>n.assertUiDelta(before,Buffer.concat([after,Buffer.from('\n// unrelated third change\n')])),/only exact two/);
 assert.throws(()=>n.assertUiDelta(before,Buffer.from(after.toString().replace('equipment||rows.some','equipment&&rows.some'))),/only exact two/);
 assert.throws(()=>n.assertUiDelta(after,before),/exact6502 app preimage/);
});
test('actual fixed raw tree delta is only100644 app and exact old/new Git blobs',()=>{
 raw.assertView();const layout=inspectGitLayout(sourceRoot),env=controlledGitEnvironment();
 const bytes=execFileSync('/usr/bin/git',['--no-replace-objects','--git-dir='+layout.gitDir,'--work-tree='+layout.root,'-c','core.commitGraph=false','-c','protocol.allow=never','diff-tree','--no-commit-id','--raw','--no-abbrev','--no-renames','-r','-z',n.PARENT_COMMIT,n.SOURCE_COMMIT,'--'],{env,maxBuffer:1024*1024});
 n.assertOnlyAppDiffBytes(bytes);raw.assertView();
 assert.throws(()=>n.assertOnlyAppDiffBytes(Buffer.concat([bytes,bytes])),/exact single100644/);
 assert.throws(()=>n.assertOnlyAppDiffBytes(Buffer.from(bytes.toString().replace(':100644 100644',':100644 100755'))),/exact single100644/);
 assert.throws(()=>n.assertOnlyAppDiffBytes(Buffer.from(bytes.toString().replace(' M\0',' R100\0'))),/exact single100644/);
});
const commitOid=bytes=>createHash('sha1').update('commit '+bytes.length+'\0').update(bytes).digest('hex');
test('raw commit parser rejects rehashed zero/two-parent and wrong-parent/tree evidence',()=>{
 const actual=raw.git('cat-file','commit',n.SOURCE_COMMIT);verifyRawCommit(actual,n.SOURCE_COMMIT,n.SOURCE_TREE,n.PARENT_COMMIT);
 for(const text of [actual.toString().replace(/^parent .+\n/m,''),actual.toString().replace(/^parent .+\n/m,'parent '+n.PARENT_COMMIT+'\nparent '+'1'.repeat(40)+'\n'),actual.toString().replace(/^parent .+\n/m,'parent '+'1'.repeat(40)+'\n')]){
  const b=Buffer.from(text);assert.throws(()=>verifyRawCommit(b,commitOid(b),n.SOURCE_TREE,n.PARENT_COMMIT),/raw single direct parent/);
 }
 const bad=Buffer.from(actual.toString().replace(/^tree .+\n/m,'tree '+'2'.repeat(40)+'\n'));
 assert.throws(()=>verifyRawCommit(bad,commitOid(bad),n.SOURCE_TREE,n.PARENT_COMMIT),/raw commit tree/);
 assert.throws(()=>assertReadOnlyGitArgs('diff-tree','--output=/tmp/unadmitted'),/exact read-only/);
});
test('canonical review swap cannot preserve counts and acquire a current grade',()=>{
 const s={...snapshot,inventory:structuredClone(snapshot.inventory)},rows=s.inventory.fieldEvidenceBindings;
 const a=rows.find(x=>x.reviewStatus==='field-target-pending'),b=rows.find(x=>x.reviewStatus==='field-target-reviewed');
 assert.ok(a&&b);[a.reviewStatus,b.reviewStatus]=[b.reviewStatus,a.reviewStatus];
 assert.throws(()=>n.assertSnapshot(fixture,s,basis),/exact whole current JSON state/);
});
test('manual context/value assertions remain exact despite unchanged target-status counts',()=>{
 const s={...snapshot,manual:structuredClone(snapshot.manual)},a=s.manual.bindings.find(x=>x.reviewStatus==='field-target-pending');assert.ok(a);
 a.contextStatus='assessed-by-unadmitted-review';a.sourceValueStatus='verified-by-unadmitted-review';
 assert.throws(()=>n.assertSnapshot(fixture,s,basis),/exact whole current JSON state/);
 const f=clone();f.snapshots.manual.objectSha256=n.objectSha(s.manual);f.snapshots.manual.canonicalSha256=n.canonicalSha(s.manual);
 assert.throws(()=>n.assertSnapshot(f,s,basis),/unchanged complete Native1 snapshot pins/);
});
test('balanced mechanics status change cannot alter any previously unchecked field',()=>{
 const s={...snapshot,mechanics:structuredClone(snapshot.mechanics)},fields=s.mechanics.records.flatMap(x=>x.fields);
 const a=fields.find(x=>x.status==='unchecked'),b=fields.find(x=>x.status!=='unchecked');assert.ok(a&&b);
 [a.status,b.status]=[b.status,a.status];
 assert.throws(()=>n.assertSnapshot(fixture,s,basis),/exact whole current JSON state/);
});
test('snapshot accessors/proxies/symbols reject without evaluation',()=>{
 let getters=0,traps=0;const a={...snapshot};Object.defineProperty(a,'data',{enumerable:true,configurable:true,get(){getters++;return snapshot.data;}});
 assert.throws(()=>n.assertSnapshot(fixture,a,basis),/accessor/);
 const p=new Proxy(snapshot,{get(){traps++;throw Error('trap');},ownKeys(){traps++;throw Error('trap');},getOwnPropertyDescriptor(){traps++;throw Error('trap');}});
 assert.throws(()=>n.assertSnapshot(fixture,p,basis),/proxy/);
 const s={...snapshot,[Symbol('extra')]:true};assert.throws(()=>n.assertSnapshot(fixture,s,basis),/symbol/);
 assert.equal(getters,0);assert.equal(traps,0);
});
function syntheticClosedForRejection(){
 // Metadata-only rejection fixture; these OIDs/certificate bytes are never
 // asserted to exist or used for installation/qualification.
 const f=clone();f.status='closed-source-committed-body-awaiting-installed-qualification';
 f.codeStage={commit:'1'.repeat(40),tree:'2'.repeat(40),parentCommit:n.SOURCE_COMMIT};
 f.certificates=Object.fromEntries(Object.entries(n.CERTIFICATE_PATHS).map(([k,path])=>[k,{path,sha256:'0'.repeat(64),sizeBytes:1}]));
 f.qualificationInputs=Object.values(f.certificates).map(x=>({...x,kind:'json'})).sort((a,b)=>a.path<b.path?-1:1);return f;
}
test('pending fixture and unmaterialized/null-code-stage installation cannot qualify',()=>{
 assert.throws(()=>n.assertFixture(fixture,basis),/pending fixture cannot qualify/);
 const pins={schemaVersion:2,materialized:false,fixturePath:n.FIXTURE_PATH,fixtureSha256:n.sha256(pendingFixtureBytes),fixtureSizeBytes:pendingFixtureBytes.length,codeStage:null,codeStagePinPreimage:null,codePins:fixture.installedCode};
 assert.throws(()=>n.assertInstallationPins(pins,fixture),/remains unmaterialized/);
 pins.materialized=true;assert.throws(()=>n.assertInstallationPins(pins,fixture),/actual code-stage/);
});
test('self-issued accepted flags and old Native1 certificates cannot authorize Native2',()=>{
 const f=syntheticClosedForRejection(),self={...n.certificateSubject(f,'preservation'),status:'accepted',independent:true,accepted:true,reviewerId:n.AUTHOR_ID};
 assert.throws(()=>n.assertCertificate(f,'preservation',self),/cannot self-review/);
 const old=n.parseBytes(read(basis.certificates.preservation.path),'old Native1 certificate');
 assert.throws(()=>n.assertCertificate(f,'preservation',old),/exact key set/);
});
test('arbitrary third certificate and source/qualification collisions reject',()=>{
 const f=syntheticClosedForRejection();f.qualificationInputs.push({path:'research/unadmitted-certificate.json',sha256:'0'.repeat(64),sizeBytes:1,kind:'json'});rowsSort(f.qualificationInputs);
 assert.throws(()=>n.assertFixture(f,basis),/only two independent certificates/);
 const g=syntheticClosedForRejection();g.certificates.preservation.path='dist/app.js';g.qualificationInputs=Object.values(g.certificates).map(x=>({...x,kind:'json'}));rowsSort(g.qualificationInputs);
 assert.throws(()=>n.assertFixture(g,basis),/exact fixed independently reviewed certificate/);
});
function pendingPins(bytes=pendingFixtureBytes){
 return {schemaVersion:2,materialized:false,fixturePath:n.FIXTURE_PATH,fixtureSha256:n.sha256(bytes),fixtureSizeBytes:bytes.length,codeStage:null,codeStagePinPreimage:null,codePins:fixture.installedCode};
}
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
test('current pin source is parsed as exact data and extra JavaScript never executes',()=>{
 const pins=pendingPins(),bytes=n.pinModuleBytes(pins);
 assert.deepEqual(n.parsePinModuleBytes(bytes,'current pins'),pins);
 const marker='__native2_unadmitted_pin_execution__';
 assert.equal(Object.hasOwn(globalThis,marker),false);
 const extra=Buffer.from('globalThis.'+marker+'=true;\n');
 for(const edited of [Buffer.concat([extra,bytes]),Buffer.concat([bytes,extra]),Buffer.from(bytes.toString().replace('export const nativeQualificationPins=freeze(','export const nativeQualificationPins=(globalThis.'+marker+'=true,freeze('))]){
  assert.throws(()=>n.parsePinModuleBytes(edited,'current pins'),/fixed pin module source codec|exact pin module codec with no additional code|invalid UTF-8\/JSON/);
  assert.equal(Object.hasOwn(globalThis,marker),false);
 }
 assert.throws(()=>n.parsePinModuleBytes(Buffer.from(bytes.toString().replace('"schemaVersion": 2','"schemaVersion":2')),'current pins'),/exact pin module codec with no additional code/);
});
test('raw code-stage stub must stay unmaterialized and join actual pending fixture bytes',()=>{
 const f=syntheticClosedForRejection(),p=pendingPins(),bytes=n.pinModuleBytes(p);
 n.assertCodeStagePinStub(bytes,f,pendingFixtureBytes,basis);
 assert.throws(()=>n.assertCodeStagePinStub(Buffer.concat([bytes,Buffer.from('console.log("extra");\n')]),f,pendingFixtureBytes,basis),/fixed pin module source codec|invalid UTF-8\/JSON/);
 const active={...p,materialized:true};
 assert.throws(()=>n.assertCodeStagePinStub(n.pinModuleBytes(active),f,pendingFixtureBytes,basis),/kept unmaterialized stub/);
 for(const incorrect of [{...p,fixtureSha256:'0'.repeat(64)},{...p,fixtureSizeBytes:p.fixtureSizeBytes+1}]){
  assert.throws(()=>n.assertCodeStagePinStub(n.pinModuleBytes(incorrect),f,pendingFixtureBytes,basis),/raw code-stage pending fixture SHA\/size/);
 }
 assert.throws(()=>n.assertCodeStagePinStub(bytes,f,Buffer.concat([pendingFixtureBytes,Buffer.from('\n')]),basis),/raw code-stage pending fixture SHA\/size/);
});
test('code-stage fixture must be pending and its full nonmaterialization projection is immutable',()=>{
 const f=syntheticClosedForRejection();
 const closedRaw=jsonBytes(f),closedPins=pendingPins(closedRaw);
 assert.throws(()=>n.assertCodeStagePinStub(n.pinModuleBytes(closedPins),f,closedRaw,basis),/actual raw code-stage fixture remains pending/);
 // Metadata-only rejection controls; no actual K/L commit or certificate exists.
 const changed=syntheticClosedForRejection();
 changed.installedCode.find(row=>row.path==='tests/helpers/class-mapping-current-cohort-factory-v2.mjs').sha256='a'.repeat(64);
 assert.throws(()=>n.assertCodeStagePinStub(n.pinModuleBytes({...pendingPins(),codePins:changed.installedCode}),changed,pendingFixtureBytes,basis),/only qualification materialization fields may differ/);
 const changedPending=clone();
 changedPending.installedCode.find(row=>row.path==='tests/helpers/class-mapping-current-cohort-factory-v2.mjs').sha256='b'.repeat(64);
 const changedBytes=jsonBytes(changedPending),changedPins=pendingPins(changedBytes);
 assert.throws(()=>n.assertCodeStagePinStub(n.pinModuleBytes(changedPins),f,changedBytes,basis),/only qualification materialization fields may differ/);
});
test('installation pin codec binds fixture size and rejects missing or extra fields',()=>{
 const f=syntheticClosedForRejection(),pins={...pendingPins(),materialized:true,codeStage:f.codeStage,codeStagePinPreimage:{path:n.PIN_PATH,sha256:'0'.repeat(64),sizeBytes:1}};
 n.assertInstallationPins(pins,f);
 for(const size of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>n.assertInstallationPins({...pins,fixtureSizeBytes:size},f),/fixed Native2 installed fixture/);
 const missing={...pins};delete missing.fixtureSizeBytes;
 assert.throws(()=>n.assertInstallationPins(missing,f),/exact key set/);
 assert.throws(()=>n.assertInstallationPins({...pins,unadmitted:true},f),/exact key set/);
});
test('installed factory, loader and public gate reject overrides and the pending zero-argument installation',()=>{
 for(const args of [[{}],[sourceRoot],[],[undefined]]){
  if(args.length)assert.throws(()=>createClassMappingCurrentSourceCohort(...args),/accepts no caller overrides/);
  else assert.throws(()=>createClassMappingCurrentSourceCohort(),/installation remains unmaterialized/);
 }
 for(const api of [loader.qualifyClassMappingCurrentSourceEpoch,loader.assertClassMappingCurrentSourceIdentity,gate.assertClassMappingCurrentSourceEpoch,gate.assertClassMappingCurrentSourceIdentity]){
  assert.throws(()=>api({root:sourceRoot,fixture:clone(),fresh:true}),/accepts no caller overrides/);
  assert.throws(()=>api(),/installation remains unmaterialized/);
 }
 for(const api of [loader.assertClassMappingCurrentSnapshot,gate.assertClassMappingCurrentSnapshot]){
  assert.throws(()=>api(),/exactly one snapshot/);
  assert.throws(()=>api(snapshot,{}),/exactly one snapshot/);
  assert.throws(()=>api(snapshot),/installation remains unmaterialized/);
 }
});
function assertDeepFrozen(value){
 if(value===null||typeof value!=='object')return;
 assert.equal(Object.isFrozen(value),true);
 for(const child of Object.values(value))assertDeepFrozen(child);
}
test('only authenticated deeply immutable basis can reuse validation; mutable clones remain checked',()=>{
 assertDeepFrozen(basis);
 assert.equal(n.assertBasis(basis),basis);
 assert.throws(()=>{basis.sourceInputs[0].sha256='0'.repeat(64);},TypeError);
 const copy=structuredClone(basis);
 assert.equal(Object.isFrozen(copy),false);
 n.assertBasis(copy);
 copy.sourceInputs[0].sha256='0'.repeat(64);
 assert.throws(()=>n.assertBasis(copy),/immutable Native1 basis object/);
 const wrong=read(n.BASIS_PATH);wrong[wrong.length-2]^=1;
 assert.throws(()=>n.parseBasis(wrong),/immutable Native1 basis raw bytes/);
});
test('authenticated basis reuse still rejects inherited serialization hooks without invoking them',()=>{
 let calls=0;
 for(const prototype of [Object.prototype,Array.prototype]){
  assert.equal(Object.hasOwn(prototype,'toJSON'),false);
  Object.defineProperty(prototype,'toJSON',{value(){calls++;return 'unadmitted';},configurable:true});
  try{
   assert.throws(()=>n.assertBasis(basis),/inherited serialization hooks/);
   assert.throws(()=>n.assertSourceEpoch(fixture.sourceEpoch,basis),/inherited serialization hooks/);
  }finally{delete prototype.toJSON;}
 }
 assert.equal(calls,0);
 assert.equal(n.assertBasis(basis),basis);
});
test('full-image sentinel cannot be cosmetically inset while preserving snapshot or grade counts',()=>{
 const s={...snapshot,inventory:structuredClone(snapshot.inventory)};
 function find(value){
  if(Array.isArray(value)&&value.length===4&&value.every((v,i)=>v===[0,0,1,1][i]))return value;
  if(value&&typeof value==='object')for(const child of Object.values(value)){const found=find(child);if(found)return found;}
  return null;
 }
 const sentinel=find(s.inventory);assert.ok(sentinel,'actual current inventory contains a full-image sentinel');
 sentinel[0]=0.001;
 assert.throws(()=>n.assertSnapshot(fixture,s,basis),/exact whole current JSON state/);
 assert.deepEqual(fixture.gradePromotions,{fieldTargets:0,sourceValues:0,context:0,defaults:0,numeric:0,mechanics:0});
});
test('actual factory rejects extra JavaScript in current pin source before any execution',async()=>{
 // This is a small isolated module tree, not a Git checkout or qualification.
 // The valid export values remain unchanged; only an executable tail is added.
 const root=mkdtempSync(resolve(tmpdir(),'native2-pin-codec-'));
 for(const path of n.CODE_PATHS){const target=resolve(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(resolve(fixtureRoot,path)));}
 const marker='__native2_factory_pin_execution__';
 assert.equal(Object.hasOwn(globalThis,marker),false);
 const pin=resolve(root,n.PIN_PATH);mkdirSync(dirname(pin),{recursive:true});
 writeFileSync(pin,Buffer.concat([n.pinModuleBytes(pendingPins()),Buffer.from('globalThis.'+marker+'=true;\n')]));
 try{
  const isolated=await import(pathToFileURL(resolve(root,'tests/helpers/class-mapping-current-cohort-factory-v2.mjs')).href);
  assert.equal(Object.hasOwn(globalThis,marker),false,'factory import cannot execute current pin source');
  assert.throws(()=>isolated.createClassMappingCurrentSourceCohort(),/fixed pin module source codec/);
  assert.equal(Object.hasOwn(globalThis,marker),false,'factory validation cannot execute current pin source');
 }finally{delete globalThis[marker];}
});
