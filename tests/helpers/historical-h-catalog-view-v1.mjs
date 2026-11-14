// Build the historical H source view for the portable source-cohort test.
// Only exact H Git blobs are copied; byte-identical catalogs are read-only
// symlinks inside a physical owned directory tree. No operation writes into
// the active checkout.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmodSync, closeSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';

const repoRoot = resolve(import.meta.dirname,'../..');
const hCatalogManifestPath = 'research/mm-source-history-v1/historical-h-catalog-blobs-v1.json';
const hCatalogManifestSha256 = 'c35dbe28d2d4a96dceac0a78979dcd97972b4c3a776c129976d627993642b28e';
const hImageManifestPath = 'research/mm-source-history-v1/historical-h-continuation-images-v2.json';
const hImageManifestSha256 = '54da91999758bb4d4ad236fcf16196d9d46ace2820fe8a3065837a586762c0fe';
const changedPaths = new Set([
  'dist/scans/verified/classes-paladin.json',
  'dist/scans/verified/classes-ua-paladin.json',
  'dist/scans/verified/rules-appendix-c-party-magic-distribution.json',
  'dist/scans/verified/rules-half-elf-traits.json',
  'dist/scans/verified/rules-halfling-resistance.json',
  'dist/scans/verified/rules-intelligence-learning.json',
  'dist/scans/verified/rules-racial-ability-adjustments.json',
  'dist/scans/verified/rules-strength-exceptional.json',
]);
const hM1Commit = '5c6a57386af372c7c0d89e342003a7edf68ca0dd';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git',args,{cwd:repoRoot,maxBuffer:128*1024*1024});

function assertContainedPath(root,path) {
  const absolute=resolve(root,path);
  assert.equal(absolute===root || absolute.startsWith(`${root}/`),true,`${path}: destination stays inside the owned view`);
  return absolute;
}

function assertPhysicalOwnedParents(root,path) {
  const absolute=assertContainedPath(root,path);
  let parent=resolve(absolute,'..');
  while (parent!==root) {
    const stat=lstatSync(parent);
    assert.equal(stat.isDirectory(),true,`${parent}: physical parent directory`);
    assert.equal(stat.isSymbolicLink(),false,`${parent}: no symlinked write parent`);
    const next=resolve(parent,'..');
    assert.notEqual(next,parent,`${parent}: parent walk terminates`);
    parent=next;
  }
  const rootStat=lstatSync(root);
  assert.equal(rootStat.isDirectory(),true,`${root}: physical owned root`);
  assert.equal(rootStat.isSymbolicLink(),false,`${root}: owned root is not a symlink`);
  return absolute;
}

export function createHistoricalHCatalogView() {
  const fixturePath = 'tests/fixtures/hirelings-source-current-cohort-v1.json';
  const fixtureBytes = readFileSync(resolve(repoRoot,fixturePath));
  assert.equal(sha256(fixtureBytes),'62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f','exact historical H source cohort fixture');
  const fixture = JSON.parse(fixtureBytes);
  const fixtureRoot = resolve(repoRoot,'research/source-cohort-ci');
  const portableFixtureBytes = readFileSync(resolve(fixtureRoot,'s2-native-source-cohort-fixture.json'));
  const targetManifestBytes = readFileSync(resolve(fixtureRoot,'s2-target-asset-manifest-v1.json'));
  assert.equal(sha256(targetManifestBytes),'653835d642d422609632b6f202d47e8c7b11eea85475201a810b3cd5af33bc67','exact portable asset target manifest');
  const portableFixture = JSON.parse(portableFixtureBytes);
  const targetManifest = JSON.parse(targetManifestBytes);
  const targetFilesByPath = new Map(targetManifest.files.map(file=>[file.targetPath,file]));
  assert.equal(targetFilesByPath.size,103,'fixed target asset denominator');
  for (const path of targetFilesByPath.keys()) {
    assert.equal(typeof path,'string');
    assert.equal(path.startsWith('/'),false,`${path}: target path is relative`);
    assert.equal(path.split('/').includes('..'),false,`${path}: target path has no traversal component`);
  }
  const hCatalogManifestBytes = readFileSync(resolve(repoRoot,hCatalogManifestPath));
  assert.equal(sha256(hCatalogManifestBytes),hCatalogManifestSha256,'fixed 1082-path H catalog manifest');
  const hCatalogRows = JSON.parse(hCatalogManifestBytes).files;
  const hImageManifestBytes = readFileSync(resolve(repoRoot,hImageManifestPath));
  assert.equal(sha256(hImageManifestBytes),hImageManifestSha256,'fixed H continuation-image input closure');
  const hImageRows = JSON.parse(hImageManifestBytes).files;
  assert.equal(hImageRows.length,343,'fixed historical H continuation-image denominator');
  assert.equal(hCatalogRows.length,1082,'fixed H catalog denominator');
  assert.equal(changedPaths.size,8,'exact eight changed H catalog paths');
  assert.equal(hCatalogRows.filter(row=>!changedPaths.has(row.path)).length,1074,'1,074 byte-identical H catalog paths');
  const targetCatalogRows=hCatalogRows.filter(row=>targetFilesByPath.has(row.path));
  assert.equal(targetCatalogRows.length,48,'48 target catalog files overlap the historical H closure');
  assert.equal(targetCatalogRows.some(row=>changedPaths.has(row.path)),false,'all target catalog copies are in the H/S1-identical partition');
  assert.equal(hCatalogRows.length-changedPaths.size-targetCatalogRows.length,1026,
    '1,026 unchanged H catalogs remain symlinked to exact active S1 bytes');
  assert.equal(targetManifest.files.filter(file=>file.fileKind==='catalog-json').length,48,'48 target physical catalog copies');
  assert.equal(targetManifest.files.filter(file=>file.fileKind==='bounded-png').length,55,'55 target physical image copies');

  const activeHashes = new Map(hCatalogRows.map(row=>[row.path,sha256(readFileSync(resolve(repoRoot,row.path)))]));
  for (const row of hCatalogRows) {
    if (changedPaths.has(row.path)) assert.notEqual(activeHashes.get(row.path),row.sha256,`${row.path}: current S1 path is expected to differ`);
    else assert.equal(activeHashes.get(row.path),row.sha256,`${row.path}: exact unchanged H/S1 raw hash`);
  }

  const viewRoot = mkdtempSync(join(tmpdir(),`hirelings-m1-view-${process.pid}-`));
  try {
    const writeGitFile = path => {
      const target = assertContainedPath(viewRoot,path);
      mkdirSync(resolve(target,'..'),{recursive:true});
      assertPhysicalOwnedParents(viewRoot,path);
      writeFileSync(target,git('show',`${fixture.sourceCommit}:${path}`));
    };
    for (const path of [
      'rules.json','citation-overrides.json','dist/data.json','dist/source-continuations.json',
      'research/citation-continuations.json','research/citation-evidence-seals.json',
      'research/field-evidence-bindings.json','research/mechanics-audit-progress.json',
      'research/price-source-inventory.json',
      ...portableFixture.baseline.unchangedSourceFiles.map(file=>file.path),
    ]) writeGitFile(path);

    symlinkSync(resolve(repoRoot,'tools'),resolve(viewRoot,'tools'),'dir');
    const viewScans = resolve(viewRoot,'dist/scans');
    const viewVerified = resolve(viewScans,'verified');
    const viewDagger = resolve(viewScans,'dagger');
    mkdirSync(viewVerified,{recursive:true});
    mkdirSync(viewDagger,{recursive:true});

    for (const row of hCatalogRows) {
      const destination = assertContainedPath(viewRoot,row.path);
      const source = resolve(repoRoot,row.path);
      mkdirSync(resolve(destination,'..'),{recursive:true});
      assertPhysicalOwnedParents(viewRoot,row.path);
      if (changedPaths.has(row.path)) {
        const bytes = git('show',`${hM1Commit}:${row.path}`);
        assert.equal(sha256(bytes),row.sha256,`${row.path}: exact H Git blob`);
        assert.equal(bytes.length,row.sizeBytes,`${row.path}: exact H Git blob size`);
        writeFileSync(destination,bytes,{mode:0o444});
        chmodSync(destination,0o444);
        const stat = lstatSync(destination);
        assert.equal(stat.isFile(),true,`${row.path}: owned regular file`);
        assert.equal(stat.isSymbolicLink(),false,`${row.path}: no write through live symlink`);
        assert.equal(stat.nlink,1,`${row.path}: no hard-link alias`);
        assert.equal(sha256(readFileSync(destination)),row.sha256,`${row.path}: exact H bytes in view`);
      } else if (targetFilesByPath.has(row.path)) {
        const targetRow=targetFilesByPath.get(row.path);
        const bytes=git('show',`${hM1Commit}:${row.path}`);
        assert.equal(sha256(bytes),row.sha256,`${row.path}: exact H target-copy blob`);
        assert.equal(targetRow.sha256,row.sha256,`${row.path}: target manifest and H source byte pins agree`);
        assert.equal(targetRow.sizeBytes,row.sizeBytes,`${row.path}: target manifest and H source size pins agree`);
        writeFileSync(destination,bytes);
        chmodSync(destination,0o444);
        assert.equal(lstatSync(destination).isFile(),true,`${row.path}: S2 asset verifier requires an owned physical target copy`);
        assert.equal(lstatSync(destination).isSymbolicLink(),false,`${row.path}: no write through a live symlink`);
        assert.equal(lstatSync(destination).nlink,1,`${row.path}: target copy has no hard-link alias`);
        assert.equal(sha256(readFileSync(destination)),targetRow.sha256,`${row.path}: copied target catalog bytes exact`);
      } else {
        symlinkSync(source,destination,'file');
        assert.equal(lstatSync(destination).isSymbolicLink(),true,`${row.path}: explicit unchanged-file symlink`);
      }
    }
    for (const file of targetManifest.files) {
      const source=resolve(repoRoot,file.targetPath),destination = assertContainedPath(viewRoot,file.targetPath);
      const bytes=readFileSync(source);
      assert.equal(bytes.length,file.sizeBytes,`${file.targetPath}: exact target asset size`);
      assert.equal(sha256(bytes),file.sha256,`${file.targetPath}: exact target asset hash`);
      if (existsSync(destination)) {
        const stat=lstatSync(destination);
        assert.equal(stat.isSymbolicLink(),false,`${file.targetPath}: never write through a symlink`);
        assert.equal(sha256(readFileSync(destination)),file.sha256,`${file.targetPath}: existing owned target asset bytes`);
        continue;
      }
      mkdirSync(resolve(destination,'..'),{recursive:true});
      assertPhysicalOwnedParents(viewRoot,file.targetPath);
      copyFileSync(source,destination);
      chmodSync(destination,0o444);
      const stat=lstatSync(destination);
      assert.equal(stat.isFile(),true,`${file.targetPath}: target assets are physical regular files`);
      assert.equal(stat.isSymbolicLink(),false,`${file.targetPath}: copied target asset is not a symlink`);
      assert.equal(stat.nlink,1,`${file.targetPath}: target asset has no hard-link alias`);
      assert.equal(sha256(readFileSync(destination)),file.sha256,`${file.targetPath}: copied target asset bytes exact`);
    }
    for (const row of hImageRows) {
      const source=resolve(repoRoot,row.path),destination=assertContainedPath(viewRoot,row.path);
      const bytes=readFileSync(source);
      assert.equal(bytes.length,row.sizeBytes,`${row.path}: exact H continuation-image size`);
      assert.equal(sha256(bytes),row.sha256,`${row.path}: exact H continuation-image bytes`);
      if (existsSync(destination)) {
        assert.equal(sha256(readFileSync(destination)),row.sha256,`${row.path}: existing asset copy is exact`);
        continue;
      }
      mkdirSync(resolve(destination,'..'),{recursive:true});
      assertPhysicalOwnedParents(viewRoot,row.path);
      symlinkSync(source,destination,'file');
      assert.equal(lstatSync(destination).isSymbolicLink(),true,`${row.path}: explicit unchanged H image link`);
    }
    for (const parent of [viewRoot,resolve(viewRoot,'dist'),viewScans,viewVerified,viewDagger]) {
      const stat = lstatSync(parent);
      assert.equal(stat.isDirectory(),true,`${parent}: physical owned directory`);
      assert.equal(stat.isSymbolicLink(),false,`${parent}: no symlinked parent component`);
    }

    const readOnlyOverlay = resolve(viewRoot,'dist/scans/verified/rules-strength-exceptional.json');
    const fd = openSync(readOnlyOverlay,'r'); closeSync(fd);
    assert.throws(()=>openSync(readOnlyOverlay,'r+'),error=>['EACCES','EPERM','EROFS'].includes(error.code),
      'read-only negative rejects modifying the private H overlay');
    const strengthRow = hCatalogRows.find(row=>row.path==='dist/scans/verified/rules-strength-exceptional.json');
    assert.equal(sha256(readFileSync(readOnlyOverlay)),strengthRow.sha256,'failed write-open leaves the H blob exact');
    for (const row of hCatalogRows) {
      const stat=lstatSync(resolve(viewRoot,row.path));
      if (changedPaths.has(row.path)) {
        assert.equal(stat.isFile(),true); assert.equal(stat.isSymbolicLink(),false); assert.equal(stat.nlink,1);
      } else if (targetFilesByPath.has(row.path)) {
        assert.equal(stat.isFile(),true); assert.equal(stat.isSymbolicLink(),false);
      } else assert.equal(stat.isSymbolicLink(),true,`${row.path}: no extra catalog copies`);
    }

    const researchRoot=resolve(viewRoot,'research');
    mkdirSync(researchRoot,{recursive:true});
    symlinkSync(resolve(repoRoot,'research/source-cohort-ci'),resolve(researchRoot,'source-cohort-ci'),'dir');
    const outputDirectory=resolve(viewRoot,'artifacts/hirelings-source-cohort');
    mkdirSync(outputDirectory,{recursive:true});
    assertPhysicalOwnedParents(viewRoot,'artifacts/hirelings-source-cohort/verification-output.json');
    for (const row of hCatalogRows) {
      assert.equal(sha256(readFileSync(resolve(repoRoot,row.path))),activeHashes.get(row.path),
        `${row.path}: active S1 source remained byte-exact during view construction`);
    }
    const actualViewCounts={
      hCatalogTotal:hCatalogRows.length,
      hChangedPhysical:hCatalogRows.filter(row=>changedPaths.has(row.path)).length,
      hTargetCatalogPhysical:targetCatalogRows.length,
      hUnchangedSymlinked:hCatalogRows.filter(row=>!changedPaths.has(row.path)&&!targetFilesByPath.has(row.path)).length,
      targetCatalogPhysical:targetManifest.files.filter(file=>file.fileKind==='catalog-json').length,
      targetImagePhysical:targetManifest.files.filter(file=>file.fileKind==='bounded-png').length,
      hContinuationImages:hImageRows.length,
      hImagesSharedWithTarget:hImageRows.filter(row=>targetFilesByPath.has(row.path)).length,
    };
    assert.deepEqual(actualViewCounts,{
      hCatalogTotal:1082,hChangedPhysical:8,hTargetCatalogPhysical:48,hUnchangedSymlinked:1026,
      targetCatalogPhysical:48,targetImagePhysical:55,hContinuationImages:343,
      hImagesSharedWithTarget:hImageRows.filter(row=>targetFilesByPath.has(row.path)).length,
    },'closed historical view and caller target closure counts');
    return {
      root:viewRoot,
      counts:actualViewCounts,
      ownedRoot:viewRoot,
      assertActiveCatalogsUnchanged:()=>hCatalogRows.every(row=>sha256(readFileSync(resolve(repoRoot,row.path)))===activeHashes.get(row.path)),
      dispose:()=>rmSync(viewRoot,{recursive:true,force:true}),
    };
  } catch (error) {
    rmSync(viewRoot,{recursive:true,force:true});
    throw error;
  }
}
