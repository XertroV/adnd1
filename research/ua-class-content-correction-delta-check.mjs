import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path);
const json = path => JSON.parse(read(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_key, nested) => nested);
const beforePath = 'research/source-audit-pass8-ua-class-content-correction-before-v1.json';
const before = json(beforePath);
const beforeClassesBytes = Buffer.from(before.frozenBytes.currentClasses.utf8Base64, 'base64');
const beforeCandidateBytes = Buffer.from(before.frozenBytes.originalCandidateAndTablePackage.utf8Base64, 'base64');
const afterClassesBytes = read('classes.json');
const afterCandidateBytes = read('research/source-audit-pass8-ua-class-content-candidates-correction-v1.json');
assert.equal(sha(beforeClassesBytes), 'e663a20ec50a066dae4eb4356ff4ca85e7d344187193410788b96af86f60a4c0');
assert.equal(sha(beforeCandidateBytes), '94f86bc23f9becdb37cda32c5374fe4f5c34c4ea757a49d25d806481cc0f3339');

const oldClasses = JSON.parse(beforeClassesBytes.toString('utf8'));
const newClasses = JSON.parse(afterClassesBytes.toString('utf8'));
const baseClasses = JSON.parse(execFileSync('git', ['show', 'ad57b84226cc89446e60d0b7bbaebb379aedc16a:classes.json'], { encoding: 'utf8' }));
assert.deepEqual(newClasses.classes.map(x => x.id), oldClasses.classes.map(x => x.id));
assert.deepEqual(newClasses.classes.map(x => x.id), baseClasses.classes.map(x => x.id));
const byId = rows => new Map(rows.map(row => [row.id, row]));
const beforeById = byId(oldClasses.classes);
const afterById = byId(newClasses.classes);
const baseById = byId(baseClasses.classes);
const expectedAppendCounts = { fighter: 1, ranger: 2, 'ua-barbarian': 1 };
const correctionLeaves = {};
let appendFromBase = 0;
for (const original of oldClasses.classes) {
  const next = afterById.get(original.id);
  const base = baseById.get(original.id);
  assert(next && base, `Owner resolves: ${original.id}`);
  assert(next.guidance.length >= original.guidance.length, `Guidance is append-only: ${original.id}`);
  assert.deepEqual(next.guidance.slice(0, original.guidance.length), original.guidance, `Exact original guidance prefix: ${original.id}`);
  const appended = next.guidance.length - original.guidance.length;
  if (appended) correctionLeaves[original.id] = appended;
  assert.equal(next.guidance.length - base.guidance.length, original.guidance.length - base.guidance.length + appended, `The prior guidance prefix is retained: ${original.id}`);
  appendFromBase += next.guidance.length - base.guidance.length;
  const oldWithoutGuidance = structuredClone(original);
  const newWithoutGuidance = structuredClone(next);
  delete oldWithoutGuidance.guidance;
  delete newWithoutGuidance.guidance;
  assert.deepEqual(newWithoutGuidance, oldWithoutGuidance, `Only guidance changes for ${original.id}`);
}
assert.deepEqual(correctionLeaves, expectedAppendCounts);
assert.equal(appendFromBase, 21, 'The initial 17 appends and four new clarifiers are the only class guidance delta from base.');
assert.equal(sha(afterClassesBytes), 'cc4c07803496ad99731640a7c6491e0ebeee6c8519c3480159ffb81897698242');

const oldPackage = JSON.parse(beforeCandidateBytes.toString('utf8'));
const newPackage = JSON.parse(afterCandidateBytes.toString('utf8'));
const normalizedOld = structuredClone(oldPackage);
const normalizedNew = structuredClone(newPackage);
delete normalizedOld.status;
delete normalizedNew.status;
for (const key of ['inputHashes', 'proposedGuidanceChanges', 'editBoundary']) {
  delete normalizedOld[key];
  delete normalizedNew[key];
}
for (const key of ['correctionSupersedes', 'independentCorrectionSource', 'correctedSourcePixelReview', 'correctionGuidanceLeaves']) delete normalizedNew[key];
delete normalizedOld.reviewRequest;
delete normalizedNew.reviewRequest;
delete normalizedNew.correctionSupersedes;
delete normalizedNew.independentCorrectionSource;
const oldAcrobat = normalizedOld.researchOnlyContentCandidates.find(x => x.id === 'ua-thief-acrobat-weight-encumbrance-table-iv');
const newAcrobat = normalizedNew.researchOnlyContentCandidates.find(x => x.id === 'ua-thief-acrobat-weight-encumbrance-table-iv');
delete oldAcrobat.procedure;
delete newAcrobat.procedure;
const oldBarbarian = normalizedOld.researchOnlyContentCandidates.find(x => x.id === 'ua-barbarian-skill-taxonomy');
const newBarbarian = normalizedNew.researchOnlyContentCandidates.find(x => x.id === 'ua-barbarian-skill-taxonomy');
for (const key of ['classification', 'proposedGuide']) {
  delete oldBarbarian[key];
  delete newBarbarian[key];
}
for (const key of ['tertiarySkillOptions', 'tertiarySkillScope']) delete newBarbarian[key];
assert.deepEqual(normalizedNew, normalizedOld, 'All research candidate data is unchanged except the named procedure/taxonomy clarifications and correction metadata.');
assert.deepEqual(newPackage.researchOnlyContentCandidates.map(x => x.id), oldPackage.researchOnlyContentCandidates.map(x => x.id));
assert.equal(newPackage.researchOnlyContentCandidates.length, 8, 'All seven typed/table candidates and the taxonomy candidate remain.');
const oldTables = oldPackage.researchOnlyContentCandidates.map(x => [x.id, x.rows || null, x.tables || null]);
const newTables = newPackage.researchOnlyContentCandidates.map(x => [x.id, x.rows || null, x.tables || null]);
assert.deepEqual(newTables, oldTables, 'Every typed table candidate row/value remains byte-equivalent as parsed data.');
assert.equal(sha(afterCandidateBytes), '4dc8bc8eb23e7e30307f842d1925af25a93fe8587f1fc8542ffe095cb8a59437');

const guidanceManifest = newPackage.proposedGuidanceChanges;
assert.equal(guidanceManifest.afterSha256, sha(afterClassesBytes));
assert.equal(guidanceManifest.originalAppendCount, 17);
assert.equal(guidanceManifest.correctionAppendCount, 4);
assert.equal(guidanceManifest.appendCount, 21);
assert.equal(guidanceManifest.owners.length, 7);
for (const owner of guidanceManifest.owners) {
  const current = afterById.get(owner.ownerId);
  assert.deepEqual(owner.appendedGuidance, current.guidance.slice(owner.beforeGuidanceCount), `The correction proposal records the exact appended values for ${owner.ownerId}`);
}
assert.equal(newPackage.editBoundary.candidateFile, 'research/source-audit-pass8-ua-class-content-candidates-correction-v1.json');
assert(newPackage.editBoundary.onlyDataEdit.includes('21 append-only strings'));

const typedTableCandidateIds = newPackage.researchOnlyContentCandidates.slice(0, 7).map(x => x.id);
assert.deepEqual(typedTableCandidateIds, [
  'ua-class-permission-table-ii',
  'ua-thieves-table-ii',
  'ua-thief-acrobat-adjustment-tables-ii-iii',
  'ua-thief-acrobat-weight-encumbrance-table-iv',
  'ua-cavalier-starting-equipment-packages',
  'ua-weapon-proficiency-table',
  'ua-ranger-tracking-modifiers-and-movement'
]);
assert.equal(newPackage.researchOnlyContentCandidates.at(-1).id, 'ua-barbarian-skill-taxonomy');
assert(newPackage.researchOnlyContentCandidates.find(x => x.id === 'ua-thief-acrobat-weight-encumbrance-table-iv').procedure.includes('extra 100-pound load'));
assert(newPackage.researchOnlyContentCandidates.find(x => x.id === 'ua-thief-acrobat-weight-encumbrance-table-iv').procedure.includes('vaulting, jumping, or tumbling'));
assert.deepEqual(newPackage.researchOnlyContentCandidates.find(x => x.id === 'ua-barbarian-skill-taxonomy').tertiarySkillOptions, [
  'Animal handling', 'Horsemanship', 'Long distance signalling', 'Running', 'Small craft, paddled', 'Small craft, rowed', 'Sound imitation', 'Snare building'
]);
for (const [bookPath, expected] of Object.entries(json('research/source-audit-pass8-ua-class-content-author-receipt.json').unchangedHashes)) {
  assert.equal(sha(read(bookPath)), expected, `Compiled and non-class source files remain unchanged: ${bookPath}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  baseCommit: 'ad57b84226cc89446e60d0b7bbaebb379aedc16a',
  beforeSnapshotSha256: sha(read(beforePath)),
  beforeClassesSha256: sha(beforeClassesBytes),
  afterClassesSha256: sha(afterClassesBytes),
  preCorrectionCandidatePackageSha256: sha(beforeCandidateBytes),
  correctedCandidatePackageSha256: sha(afterCandidateBytes),
  original17AppendedGuidanceLeavesRemainAsExactPrefixes: true,
  newGuidanceLeaves: correctionLeaves,
  totalAppendLeavesFromBase: appendFromBase,
  otherClassPropertiesDeepEqual: true,
  xpRowsAndProgressionsUnchanged: true,
  candidateCount: newPackage.researchOnlyContentCandidates.length,
  typedTableCandidateCount: typedTableCandidateIds.length,
  allTableRowsAndValuesUnchanged: true,
  onlyNamedCandidateProcedureAndTaxonomyClarificationsChanged: true,
  correctionProposalGuidanceManifestMatchesClasses: true,
  compiledAndNonClassSourceHashesUnchanged: true
}, null, 2));
