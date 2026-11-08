import {withoutBatch6JoCanonicalArtifact} from './helpers/batch6-jo-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {auditMonetaryRowIdentity,collectMonetaryRowIdentityRecords,loadMonetaryRowIdentityAudit,monetaryRowIdentityInputs,hash,uaContextFingerprintVersion,monetaryContextEvidenceFingerprint,monetaryContextPhysicalEvidenceFingerprint,monetaryContextPhysicalFingerprintVersion} from '../tools/monetary-row-identity-audit.mjs';

const oldUaSha='8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a';
const adapterDependencies=[
 {path:'tools/monetary-source-render-frames.mjs',sha256:'44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39'},
 {path:'research/monetary-source-render-frames.json',sha256:'29e0ee3ae3cdaf304b67ca99fe7c51a391e7a1b44b63f12aa9258ce02fed3af7'},
 {path:'research/source-audit-batch5-pd179-v5-fresh-frame-replay-independent-review.json',sha256:'931ecd38e8dc2660e200e1d4fb5a8f8e3721801e5d4f67020aaee329da8e9106'},
 {path:'research/source-audit-batch5-pd179-v5-crop-frame-bindings-independent-review.json',sha256:'e04274a0aa8e04ee0a09962c24ed2290c6e3e5e5d92ef79aad38caf625147eee'},
];
const legacyIds=['ua-misc-note-context-ua-other-005-E2-r063','ua-misc-note-context-ua-other-005-E3-cont-r089','ua-misc-note-context-ua-other-005-E3-cont-r090','ua-misc-note-context-ua-other-005-E4-main-r120','ua-misc-note-context-ua-other-005-E4-main-r121'];
const rootUrl=new URL('../',import.meta.url),pathBytes=path=>readFileSync(new URL('../'+path,import.meta.url));
function frozenDocuments(){
 const docs=new Map(monetaryRowIdentityInputs.map(config=>{const bytes=pathBytes(config.path);return [config.key,{...config,sha256:hash(bytes),data:JSON.parse(bytes)}];}));
 docs.set('canonical',withoutBatch6JoCanonicalArtifact(docs.get('canonical')));
 const uaBytes=gunzipSync(pathBytes('tests/fixtures/monetary-source-ua-583-before.json.gz')),pdBytes=gunzipSync(pathBytes('tests/fixtures/monetary-source-phbdmg-179-before.json.gz'));
 docs.set('ua',{...docs.get('ua'),sha256:hash(uaBytes),data:JSON.parse(uaBytes.toString('utf8'))});docs.set('phbDmg',{...docs.get('phbDmg'),sha256:hash(pdBytes),data:JSON.parse(pdBytes.toString('utf8'))});return docs;
}
function tempRepo(){const repo=mkdtempSync(join(tmpdir(),'ua-context-bridge-'));for(const dir of ['research','tests/fixtures','tools'])mkdirSync(join(repo,dir),{recursive:true});return repo;}
function writePath(repo,path,bytes){const full=join(repo,path);mkdirSync(join(full,'..'),{recursive:true});writeFileSync(full,bytes);return hash(bytes);}
function buildBridgeRepo(){
 const repo=tempRepo(),docs=frozenDocuments();for(const config of monetaryRowIdentityInputs)writePath(repo,config.path,Buffer.from(JSON.stringify(docs.get(config.key).data)));
 const rawArchive=pathBytes('tests/fixtures/monetary-source-ua-583-before.json.gz');writePath(repo,'tests/fixtures/monetary-source-ua-583-before.json.gz',rawArchive);
 const code=pathBytes('tools/monetary-row-identity-audit.mjs');writePath(repo,'tools/monetary-row-identity-audit.mjs',code);
 for(const dependency of adapterDependencies)writePath(repo,dependency.path,pathBytes(dependency.path));
 const baselineBytes=pathBytes('research/source-audit-batch5-monetary-row-identity-baseline.json'),extensionBytes=pathBytes('research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json');
 writePath(repo,'research/source-audit-batch5-monetary-row-identity-baseline.json',baselineBytes);writePath(repo,'research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json',extensionBytes);
 const extension=JSON.parse(extensionBytes),known=legacyIds.map(id=>extension.knownFindings.find(f=>f.id===id));assert.ok(known.every(Boolean));
 const collected=collectMonetaryRowIdentityRecords(docs),report=auditMonetaryRowIdentity(collected.records,{uaActiveContextTargetInventory:collected.uaActiveContextTargetInventory});
 const snapshot={schemaVersion:2,contextEvidenceCoverage:report.contextEvidenceCoverage,inputManifest:[...docs.values()].map(({data,...meta})=>meta),records:report.records.map(r=>({uid:r.uid,surface:r.surface,input:r.input,inputSha256:r.inputSha256,rowIdentitySha256:r.rowIdentitySha256,focusGeometrySha256:r.focusGeometrySha256,contextGeometrySha256:r.contextGeometrySha256,contextEvidenceSha256:r.contextEvidenceSha256||null,contextFingerprintVersion:r.contextFingerprintVersion||null,contextEvidenceStatus:r.contextEvidence?.status||null,contextEvidence:r.contextEvidence||null,contextPhysicalFingerprintVersion:r.contextPhysicalFingerprintVersion||null,contextPhysicalEvidenceSha256:r.contextPhysicalEvidenceSha256||null}))};
 assert.equal(snapshot.records.length,2161);assert.equal(snapshot.contextEvidenceCoverage.records,927);const snapshotBytes=Buffer.from(JSON.stringify(snapshot));writePath(repo,'research/ua-context-prefingerprint-snapshot.json',snapshotBytes);
 const archiveSha=hash(rawArchive),baseline=JSON.parse(baselineBytes),manifest={schemaVersion:1,baseline:{path:'research/source-audit-batch5-monetary-row-identity-baseline.json',sha256:hash(baselineBytes)},extensions:[{path:'research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json',sha256:hash(extensionBytes)}]};
 const migrations=known.map(f=>{const old=f.records[0],snap=snapshot.records.find(r=>r.uid===old.uid);return {originalFindingArtifact:{path:'research/source-audit-batch5-monetary-row-identity-complete-qa-extension.json',sha256:hash(extensionBytes),findingId:f.id},records:[{uid:old.uid,oldRowIdentitySha256:old.rowIdentitySha256,oldFocusGeometrySha256:old.focusGeometrySha256,oldContextGeometrySha256:old.contextGeometrySha256,newContextEvidenceSha256:snap.contextEvidenceSha256,newContextFingerprintVersion:uaContextFingerprintVersion,newContextPhysicalEvidenceSha256:snap.contextPhysicalEvidenceSha256,newContextPhysicalFingerprintVersion:monetaryContextPhysicalFingerprintVersion}]};});
 const bridge={schemaVersion:2,artifactType:'ua-legacy-context-to-active-target-migration-bridge-v2',originalSourceInput:{path:'research/source-audit-batch5-ua-additional-prices.json',sha256:oldUaSha},originalSourceArchive:{path:'tests/fixtures/monetary-source-ua-583-before.json.gz',sha256:archiveSha,uncompressedSha256:oldUaSha},sourceSnapshot:{path:'research/ua-context-prefingerprint-snapshot.json',sha256:hash(snapshotBytes),recordCount:2161,currentSourcePreimage:{path:'research/source-audit-batch5-ua-additional-prices.json',sha256:oldUaSha}},sourceAdapter:{path:'tools/monetary-row-identity-audit.mjs',sha256:hash(code),dependencies:adapterDependencies},migrations};
 const bridgeBytes=Buffer.from(JSON.stringify(bridge));writePath(repo,'research/ua-context-migration-bridge.json',bridgeBytes);manifest.contextMigrationBridge={path:'research/ua-context-migration-bridge.json',sha256:hash(bridgeBytes)};writePath(repo,'research/monetary-row-identity-findings.json',Buffer.from(JSON.stringify(manifest)));
 writePath(repo,'research/reviews.json',Buffer.from(JSON.stringify({reviews:[]})));
 return {repo,bridge,manifest,snapshot,snapshotBytes,extension,known};
}

test('the sealed bridge validates five exact legacy UA refs against original bytes and all2161/927 snapshot',()=>{
 const t=buildBridgeRepo();try{
  const report=loadMonetaryRowIdentityAudit({repoRoot:t.repo,findingsPath:'research/monetary-row-identity-findings.json',reviewsPath:'research/reviews.json'});
  assert.equal(report.contextMigrationBridgeStatus.validatedEntries,5);for(const id of legacyIds)assert.equal(report.knownFindings.find(f=>f.id===id).status,'legacy-context-migration-baseline-pending-source-repair');assert.equal(report.contextMigrationBridgeStatus.snapshot.sha256,t.bridge.sourceSnapshot.sha256);
 }finally{rmSync(t.repo,{recursive:true,force:true});}
});

test('bridge validation rejects tampered, incomplete, or unsafe migration snapshots',()=>{
 const t=buildBridgeRepo();try{
  let bridge=t.bridge,manifest=t.manifest;
  const rewrite=()=>{const bytes=Buffer.from(JSON.stringify(bridge));writePath(t.repo,'research/ua-context-migration-bridge.json',bytes);manifest.contextMigrationBridge.sha256=hash(bytes);writePath(t.repo,'research/monetary-row-identity-findings.json',Buffer.from(JSON.stringify(manifest)));};
  bridge={...t.bridge,sourceSnapshot:{...t.bridge.sourceSnapshot,path:'../escape.json'}};rewrite();assert.throws(()=>loadMonetaryRowIdentityAudit({repoRoot:t.repo,findingsPath:'research/monetary-row-identity-findings.json',reviewsPath:'research/reviews.json'}),/unsafe full migration snapshot/);
  bridge=structuredClone(t.bridge);bridge.migrations[0].records[0].oldContextGeometrySha256='f'.repeat(64);rewrite();assert.throws(()=>loadMonetaryRowIdentityAudit({repoRoot:t.repo,findingsPath:'research/monetary-row-identity-findings.json',reviewsPath:'research/reviews.json'}),/old immutable finding reference mismatch/);
  bridge=structuredClone(t.bridge);const altered=structuredClone(t.snapshot);const ua=altered.records.find(r=>r.surface==='ua-supplement-row');delete ua.contextEvidence;const snapshotBytes=Buffer.from(JSON.stringify(altered));writePath(t.repo,'research/ua-context-prefingerprint-snapshot.json',snapshotBytes);bridge.sourceSnapshot.sha256=hash(snapshotBytes);rewrite();assert.throws(()=>loadMonetaryRowIdentityAudit({repoRoot:t.repo,findingsPath:'research/monetary-row-identity-findings.json',reviewsPath:'research/reviews.json'}),/927 complete, recomputed context and physical-evidence objects/);
  writePath(t.repo,'research/ua-context-prefingerprint-snapshot.json',t.snapshotBytes);
  bridge=structuredClone(t.bridge);bridge.sourceSnapshot.currentSourcePreimage.sha256='f'.repeat(64);rewrite();assert.throws(()=>loadMonetaryRowIdentityAudit({repoRoot:t.repo,findingsPath:'research/monetary-row-identity-findings.json',reviewsPath:'research/reviews.json'}),/unchanged original input/);
 }finally{rmSync(t.repo,{recursive:true,force:true});}
});

test('bridge pins the exact resolver, registry, and both measured-frame proofs',()=>{
 const t=buildBridgeRepo();try{
  assert.deepEqual(t.bridge.sourceAdapter.dependencies,adapterDependencies);
  const manifest=t.manifest,writeBridge=bridge=>{const bytes=Buffer.from(JSON.stringify(bridge));writePath(t.repo,'research/ua-context-migration-bridge.json',bytes);manifest.contextMigrationBridge.sha256=hash(bytes);writePath(t.repo,'research/monetary-row-identity-findings.json',Buffer.from(JSON.stringify(manifest)));},validate=()=>loadMonetaryRowIdentityAudit({repoRoot:t.repo,findingsPath:'research/monetary-row-identity-findings.json',reviewsPath:'research/reviews.json'});
  let bridge=structuredClone(t.bridge);delete bridge.sourceAdapter.dependencies;writeBridge(bridge);assert.throws(validate,/source adapter dependency set mismatch/);
  bridge=structuredClone(t.bridge);bridge.sourceAdapter.dependencies.push({...adapterDependencies[0]});writeBridge(bridge);assert.throws(validate,/source adapter dependency set mismatch/);
  bridge=structuredClone(t.bridge);bridge.sourceAdapter.dependencies.push({path:'research/unregistered-frame-proof.json',sha256:'f'.repeat(64)});writeBridge(bridge);assert.throws(validate,/source adapter dependency set mismatch/);
  bridge=structuredClone(t.bridge);bridge.sourceAdapter.dependencies[0].sha256='f'.repeat(64);writeBridge(bridge);assert.throws(validate,/source adapter dependency set mismatch/);
  writeBridge(t.bridge);
  for(const dependency of adapterDependencies){
   writePath(t.repo,dependency.path,Buffer.from(`tampered ${dependency.path}`));
   assert.throws(validate,new RegExp(`source adapter dependency hash mismatch: ${dependency.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
   writePath(t.repo,dependency.path,pathBytes(dependency.path));
  }
 }finally{rmSync(t.repo,{recursive:true,force:true});}
});

test('sealed 4d9 raw-before false pass is preserved and self-consistent substituted physical windows are rejected',()=>{
 const archivedCode=pathBytes('tests/fixtures/monetary-row-identity-audit-4d9e-bridge-before.mjs.gz');
 const archivedBytes=gunzipSync(archivedCode);
 assert.equal(hash(archivedCode),'9d91ef230089ff7c2caa394298220c8b01983c85c4e2d038cfce5e5475db0ec1');
 assert.equal(hash(archivedBytes),'4d9ea07edd641e172b39e9bbf4116416473220e414a711d2a326a6121c5218f4');
 const falsePass=pathBytes('research/source-audit-batch5-bridge-raw-before-derivation-protocol-before.json');
 assert.equal(hash(falsePass),'a476015ee1455288c92119fb82dd8ff4fd4a0b3b3ee0b8163f8fc29782f884a2');
 const calibration=JSON.parse(falsePass.toString('utf8'));
 assert.equal(calibration.codeSha256,hash(archivedBytes));
 assert.equal(calibration.honestBefore.valid,false);
 assert.equal(calibration.forgedBefore.valid,true);

 const t=buildBridgeRepo();try{
  const row=t.snapshot.records.find(record=>record.uid==='ua-supplement-row:ua-other-005-E2-r063');
  assert.ok(row);
  const beforePhysical=row.contextPhysicalEvidenceSha256;
  const context=row.contextEvidence, segment=context.legacyProjection.rowContext.segmentId;
  const sourceEntry=context.legacyProjection.sourceEvidenceIndex.find(entry=>entry.segmentId===segment);
  assert.ok(sourceEntry);
  const move=(crop)=>{
   crop.pdfPagePoints[0]=306;
   crop.renderedPagePixels[0]=765;
  };
  move(context.legacyProjection.rowContext.tableCropBounds);
  move(sourceEntry.tableCropBounds);
  const affected=t.snapshot.records.filter(record=>record.surface==='ua-supplement-row'
   &&record.contextEvidence?.legacyProjection?.groupId==='ua-other-005'
   &&record.contextEvidence?.legacyProjection?.rowContext?.segmentId==='E2');
  assert.ok(affected.length>0);
  for(const record of affected){
   record.contextEvidenceSha256=monetaryContextEvidenceFingerprint(record.contextEvidence);
   record.contextPhysicalEvidenceSha256=monetaryContextPhysicalEvidenceFingerprint(record.contextEvidence);
  }
  assert.notEqual(row.contextPhysicalEvidenceSha256,beforePhysical);
  assert.notEqual(row.contextPhysicalEvidenceSha256,beforePhysical);
  const snapshotBytes=Buffer.from(JSON.stringify(t.snapshot));
  writePath(t.repo,'research/ua-context-prefingerprint-snapshot.json',snapshotBytes);
  t.bridge.sourceSnapshot.sha256=hash(snapshotBytes);
  const migration=t.bridge.migrations.find(item=>item.records[0].uid===row.uid);
  assert.ok(migration);
  migration.records[0].newContextEvidenceSha256=row.contextEvidenceSha256;
  migration.records[0].newContextPhysicalEvidenceSha256=row.contextPhysicalEvidenceSha256;
  const bridgeBytes=Buffer.from(JSON.stringify(t.bridge));
  writePath(t.repo,'research/ua-context-migration-bridge.json',bridgeBytes);
  t.manifest.contextMigrationBridge.sha256=hash(bridgeBytes);
  writePath(t.repo,'research/monetary-row-identity-findings.json',Buffer.from(JSON.stringify(t.manifest)));
  assert.throws(
   ()=>loadMonetaryRowIdentityAudit({repoRoot:t.repo,findingsPath:'research/monetary-row-identity-findings.json',reviewsPath:'research/reviews.json'}),
   /differs from immutable original source archives/,
  );
 }finally{rmSync(t.repo,{recursive:true,force:true});}
});
