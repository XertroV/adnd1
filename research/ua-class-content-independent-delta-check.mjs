import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const baseCommit = 'ad57b84226cc89446e60d0b7bbaebb379aedc16a';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const currentBytes = readFileSync('classes.json');
const baseBytes = execFileSync('git', ['show', `${baseCommit}:classes.json`]);
const base = JSON.parse(baseBytes.toString('utf8'));
const current = JSON.parse(currentBytes.toString('utf8'));
const candidates = JSON.parse(readFileSync('research/source-audit-pass8-ua-class-content-candidates.json', 'utf8'));
const baseline = JSON.parse(readFileSync('research/source-audit-pass8-ua-class-content-baseline-v3.json', 'utf8'));
const receipt = JSON.parse(readFileSync('research/source-audit-pass8-ua-class-content-author-receipt.json', 'utf8'));
const expectedOwners = new Map(candidates.proposedGuidanceChanges.owners.map(owner => [owner.ownerId, owner]));
const classById = classes => new Map(classes.classes.map(record => [record.id, record]));
const oldById = classById(base);
const currentById = classById(current);
const issues = [];
const ownerAppendCounts = {};
let appendCount = 0;
for (const [id, old] of oldById) {
  const now = currentById.get(id);
  assert(now, `Class owner missing after author edit: ${id}`);
  const oldOther = { ...old };
  const newOther = { ...now };
  delete oldOther.guidance;
  delete newOther.guidance;
  if (JSON.stringify(oldOther) !== JSON.stringify(newOther)) issues.push({ id, kind: 'non-guidance-property-changed' });
  const oldGuidance = old.guidance || [];
  const newGuidance = now.guidance || [];
  if (JSON.stringify(newGuidance.slice(0, oldGuidance.length)) !== JSON.stringify(oldGuidance)) issues.push({ id, kind: 'guidance-prefix-changed' });
  const ownerProposal = expectedOwners.get(id);
  const suffix = newGuidance.slice(oldGuidance.length);
  if (!ownerProposal && suffix.length) issues.push({ id, kind: 'unexpected-guidance-append', count: suffix.length });
  if (ownerProposal) {
    if (JSON.stringify(suffix) !== JSON.stringify(ownerProposal.appendedGuidance)) issues.push({ id, kind: 'proposal-suffix-mismatch' });
    ownerAppendCounts[id] = suffix.length;
    appendCount += suffix.length;
  }
}
for (const owner of expectedOwners.keys()) assert(oldById.has(owner) && currentById.has(owner), `Candidate owner does not resolve: ${owner}`);
assert.equal(base.classes.length, current.classes.length, 'Class collection size changed');
assert.equal(sha(baseBytes), baseline.inputs.classesSha256, 'Git base and pinned classes hash match');
assert.equal(sha(currentBytes), candidates.proposedGuidanceChanges.afterSha256, 'Current classes and candidate after hash match');
assert.equal(sha(baseBytes), candidates.proposedGuidanceChanges.beforeSha256, 'Current base classes and candidate before hash match');
assert.equal(appendCount, 17);
assert.equal(expectedOwners.size, 7);
assert.deepEqual(issues, [], 'no unapproved class record or property changes');
for (const [file, expectedHash] of Object.entries(receipt.unchangedHashes)) {
  assert.equal(sha(readFileSync(file)), expectedHash, `Unaffected compiled/source file remains pinned: ${file}`);
}
assert.equal(receipt.editScope.guidanceAppends, 17);
assert.equal(receipt.editScope.otherClassPropertiesChanged, false);
assert.equal(receipt.editScope.xpRowsValuesOrProgressionChanged, false);

const output = {
  schemaVersion: 1,
  artifactType: 'Independent structure and ownership check for UA class guidance batch',
  baseCommit,
  classesBeforeSha256: sha(baseBytes),
  classesAfterSha256: sha(currentBytes),
  classCountBeforeAndAfter: base.classes.length,
  ownerCount: expectedOwners.size,
  appendCount,
  ownerAppendCounts,
  oldGuidancePrefixesExact: true,
  allOtherClassPropertiesDeeplyUnchanged: true,
  xpRowsValuesAndProgressionsUnchanged: true,
  compiledAndOtherSourceFilesStillMatchAuthorBeforeHashes: true,
  compiledBuildOrAssemblyRun: false,
  issues,
  result: 'PASS'
};
writeFileSync('research/source-audit-pass8-ua-class-content-independent-delta-check.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
