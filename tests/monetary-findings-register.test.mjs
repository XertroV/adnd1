import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateMonetaryFindingRegister} from '../tools/monetary-findings-register.mjs';

function fixture() {
  const repoRoot = mkdtempSync(join(tmpdir(), 'monetary-register-'));
  mkdirSync(join(repoRoot, 'research'));
  const seals = [], save = (path, value) => {
    const bytes = Buffer.from(JSON.stringify(value)); writeFileSync(join(repoRoot, path), bytes);
    const ref = {path, sha256: createHash('sha256').update(bytes).digest('hex')};
    seals.push({id: path.replaceAll('/', '--'), ...ref, sizeBytes: bytes.length}); return ref;
  };
  const baseline = save('research/baseline.json', {generatedBy: 'tools/monetary-row-identity-audit.mjs', reviewDispositions: {knownFindings: [{id: 'old-focus-defect'}]}});
  const extension = save('research/extension.json', {baseline, knownFindings: [{id: 'old-context-defect'}]});
  const uncertainty = save('research/uncertainty.json', {baseline, uncertainties: [{id: 'unknown-source-scope'}]});
  const manifest = {schemaVersion: 1, baseline, extensions: [extension], retainedUncertainties: uncertainty};
  const saveManifest = value => writeFileSync(join(repoRoot, 'research/monetary-row-identity-findings.json'), JSON.stringify(value));
  saveManifest(manifest);
  writeFileSync(join(repoRoot, 'research/citation-evidence-seals.json'), JSON.stringify({schemaVersion: 1, artifactType: 'append-only-citation-evidence-seals', seals}));
  return {repoRoot, manifest, saveManifest, cleanup: () => rmSync(repoRoot, {recursive: true, force: true})};
}

test('sealed membership rejects removing a finding extension while retaining its evidence bytes', () => {
  const f = fixture(); try {
    const report = validateMonetaryFindingRegister(f); assert.equal(report.knownFindings, 2); assert.equal(report.sourceSemanticsCertified, false);
    f.saveManifest({...f.manifest, extensions: []});
    assert.throws(() => validateMonetaryFindingRegister(f), /omits sealed source findings/);
  } finally { f.cleanup(); }
});

test('sealed baseline and uncertainty questions cannot be replaced or dropped', () => {
  const f = fixture(); try {
    f.saveManifest({...f.manifest, baseline: {...f.manifest.baseline, sha256: 'f'.repeat(64)}});
    assert.throws(() => validateMonetaryFindingRegister(f), /sealed finding baseline/);
    const {retainedUncertainties, ...withoutQuestions} = f.manifest; f.saveManifest(withoutQuestions);
    assert.throws(() => validateMonetaryFindingRegister(f), /omits sealed source uncertainties/);
    f.saveManifest({...f.manifest, extensions: [...f.manifest.extensions, ...f.manifest.extensions]});
    assert.throws(() => validateMonetaryFindingRegister(f), /Duplicate active/);
  } finally { f.cleanup(); }
});

test('the preserved real omission removed sixteen findings without erasing the baseline', () => {
  const before = JSON.parse(readFileSync(new URL('../research/source-audit-batch5-monetary-finding-register-omission-before.json', import.meta.url)));
  assert.equal(before.observed.loaderReturnedNormally, true);
  assert.equal(before.observed.missingKnownFindingCount, 16);
  assert.equal(before.mutation.removedKnownFindingIds.length, 16);
  assert.equal(before.observed.remainingValidationPass, false, 'the old loader did not pass the other unresolved findings');
  const f = fixture(); try {
    f.saveManifest({...f.manifest, extensions: []});
    assert.throws(() => validateMonetaryFindingRegister(f), /omits sealed source findings/);
  } finally { f.cleanup(); }
});

test('source extension bytes and their active reference cannot be silently substituted', () => {
  const f = fixture(); try {
    f.saveManifest({...f.manifest, extensions: [{...f.manifest.extensions[0], sha256: 'e'.repeat(64)}]});
    assert.throws(() => validateMonetaryFindingRegister(f), /unsealed or differs/);
    f.saveManifest(f.manifest);
    writeFileSync(join(f.repoRoot, f.manifest.extensions[0].path), JSON.stringify({knownFindings: []}));
    assert.throws(() => validateMonetaryFindingRegister(f), /mismatch/);
  } finally { f.cleanup(); }
});
