// Physical, minimal V28 read context for the unchanged Jo price-registration
// loader. Only the registry and its recursively declared sealed inputs are
// copied; the current data/inventory arguments remain the caller's exact
// historical projections. The temporary root has no Git directory or links.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {readVersion29HistoricalFile, normalizeVersion29HistoricalBytes, normalizeVersion29HistoricalJson} from '../closed-version29-reader-v2.proposed.mjs';
const readFileSync=readVersion29HistoricalFile;
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadJoUnextractedPriceRegistration} from '../../../tools/jo-unextracted-price-registration.mjs';
import {readV28Dmg175EquipmentFile} from '../history-recovery-v1/dmg175-equipment-epoch-outer-v2.proposed.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const safeRepoPath = path => {
  assert.ok(typeof path === 'string' && path && !path.startsWith('/') && !path.includes('\\'), 'repo-relative input path required');
  const parts = path.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'), 'input path cannot escape the temporary root');
  return path;
};

function declaredFileReferences(value, found = new Map(), ancestors = new Set()) {
  if (!value || typeof value !== 'object') return found;
  assert.ok(!ancestors.has(value), 'registration references reject cycles');
  ancestors.add(value);
  if (typeof value.path === 'string' && typeof value.sha256 === 'string') {
    const path = safeRepoPath(value.path);
    const prior = found.get(path);
    if (prior) assert.equal(prior.sha256, value.sha256, `${path}: repeated reference hashes agree`);
    else found.set(path, {path, sha256: value.sha256});
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) declaredFileReferences(child, found, ancestors);
  ancestors.delete(value);
  return found;
}

export function loadJoUnextractedPriceRegistrationForV28Context({repoRoot = root, data, inventory}) {
  const originalRoot = resolve(repoRoot);
  const registryPath = 'research/source-audit-batch6-jo-unextracted-price.json';
  const registryBytes = readFileSync(resolve(originalRoot, registryPath));
  const registration = JSON.parse(registryBytes);
  const refs = [...declaredFileReferences(registration).values()];
  assert.equal(refs.filter(ref => ref.path === 'equipment.json').length, 1, 'one exact equipment input is declared');
  assert.equal(refs.length, 5, 'the registry closes exactly five file inputs');

  const scratchRoot = mkdtempSync(join(tmpdir(), 'dmg175-jo-price-v28-'));
  try {
    mkdirSync(dirname(resolve(scratchRoot, registryPath)), {recursive: true});
    writeFileSync(resolve(scratchRoot, registryPath), registryBytes);
    for (const ref of refs) {
      const bytes = ref.path === 'equipment.json'
        ? readV28Dmg175EquipmentFile(resolve(originalRoot, ref.path))
        : readFileSync(resolve(originalRoot, ref.path));
      assert.equal(sha(bytes), ref.sha256, `${ref.path}: exact registered input before copy`);
      const destination = resolve(scratchRoot, ref.path);
      assert.ok(relative(scratchRoot, destination) && !relative(scratchRoot, destination).startsWith('..'), `${ref.path}: destination stays inside owned root`);
      mkdirSync(dirname(destination), {recursive: true});
      writeFileSync(destination, bytes);
    }
    assert.ok(!readdirSync(scratchRoot).includes('.git'), 'the temporary historical input root has no Git directory');
    return loadJoUnextractedPriceRegistration({repoRoot: scratchRoot, data, inventory});
  } finally {
    rmSync(scratchRoot, {recursive: true, force: true});
  }
}
