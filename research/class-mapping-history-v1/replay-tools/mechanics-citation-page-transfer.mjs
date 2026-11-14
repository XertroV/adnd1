import {readFileSync} from '../mm-replay-fs-v1.mjs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';

const root = resolve(import.meta.dirname, '../../..');
const transferPath = 'research/source-audit-batch6-grand-druid-mechanics-citation-page-transfer.json';
const transferSha256 = 'ce34f1206624f1122e4f55d8b4ceda5598eb221ff6520201ff28f798680d4f9b';
const originalReviewSha256 = 'b861099772793d5ee3b5438ad02d54e4de50f4227ff6c3b3c7450d3201b9716a';
const originalChangeSha256 = 'af1413f9b8123ed4f8be4a57102f146535e62d5ce22ae5aec058c53ddd31cc4c';
const sha = value => createHash('sha256').update(value).digest('hex');
const valueHash = value => sha(JSON.stringify(value));
const fail = message => { throw new Error(`Invalid mechanics citation-page transfer: ${message}`); };

// This does not change the original review or its proposed correction. It only
// supplies that original comparison value for one separately approved page join.
export function resolveMechanicsCitationPageTransfer({collection, id, review, change, currentValue}, {repoRoot = root, readFile = readFileSync} = {}) {
  if (collection !== 'classes' || id !== 'ua-druid' || review.checker !== 'mechanics-illusionist-classes' || change.path !== '/xpRows'
      || valueHash(review) !== originalReviewSha256 || valueHash(change) !== originalChangeSha256) return null;
  const readRef = ref => {
    if (typeof ref?.path !== 'string' || ref.path.startsWith('/') || ref.path.includes('\\') || ref.path.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe evidence path');
    const bytes = readFile(resolve(repoRoot, ref.path));
    if (sha(bytes) !== ref.sha256) fail(`stale evidence ${ref.path}`);
    return bytes;
  };
  const document = JSON.parse(readRef({path: transferPath, sha256: transferSha256}));
  if (document.schemaVersion !== 1 || document.artifactType !== 'mechanics-citation-page-only-effective-comparison-transfer'
      || document.sourceValueGrade !== 'NOT PROMOTED' || document.transfers?.length !== 1) fail('invalid transfer document');
  const transfer = document.transfers[0];
  if (transfer.collection !== collection || transfer.itemId !== id || transfer.checker !== review.checker || transfer.changePath !== change.path
      || transfer.sourceMetadataPointer !== '/xpRows/0/pages' || transfer.expectedOriginalReviewSha256 !== originalReviewSha256
      || transfer.expectedOriginalChangeSha256 !== originalChangeSha256) fail('original review/change identity');
  if (!isDeepStrictEqual(transfer.beforeWholeXpRows, change.newValue)) fail('original complete XP array');
  const expectedAfter = structuredClone(transfer.beforeWholeXpRows);
  if (expectedAfter.length !== 9 || !isDeepStrictEqual(expectedAfter[0].pages, [16])) fail('original Grand Druid page');
  expectedAfter[0].pages = [16, 17];
  if (!isDeepStrictEqual(transfer.afterWholeXpRows, expectedAfter)) fail('transfer changes more than the single approved source page');
  if (!isDeepStrictEqual(currentValue, expectedAfter)) return null;
  const fixture = JSON.parse(gunzipSync(readRef(transfer.beforeFixture)));
  if (fixture.artifactType !== 'exact-current-GrandDruid-approved-page-augmentation-stales-historical-mechanics-array-review-before'
      || sha(fixture.ledgerRawUtf8) !== fixture.ledgerSha256) fail('original before-ledger bytes');
  const original = JSON.parse(fixture.ledgerRawUtf8).reviewRecords[transfer.beforeFixture.reviewRecordIndex];
  if (valueHash(original) !== originalReviewSha256 || !isDeepStrictEqual(original, review)) fail('before review evidence');
  if (transfer.independentSourcePageReview.path !== 'research/source-audit-batch6-grand-druid-root-independent-review.json'
      || transfer.independentSourcePageReview.sha256 !== '7d61523b3f34c6e99fd22c5fa3eabb4773fc3a24fd7c91284f97d3969a2a664d') fail('independent page proof identity');
  const proof = JSON.parse(readRef(transfer.independentSourcePageReview));
  const pageReview = proof.sourcePageCorrection;
  const core = row => Object.fromEntries(['level', 'xp', 'book', 'pages', 'track'].map(key => [key, row[key]]));
  if (proof.independentOfAuthor !== true || pageReview?.collection !== collection || pageReview.itemId !== id || pageReview.fieldPointer !== '/xpRows/0'
      || pageReview.fieldGradeChanged !== false || !isDeepStrictEqual(pageReview.before, core(transfer.beforeWholeXpRows[0]))
      || !isDeepStrictEqual(pageReview.after, core(expectedAfter[0]))) fail('independent source-page transition');
  return {
    comparisonValue: transfer.beforeWholeXpRows,
    annotation: {kind: 'citation-page-only-effective-comparison', collection, itemId: id, checker: review.checker, changePath: change.path,
      evidence: {path: transferPath, sha256: transferSha256}, independentSourcePageReview: transfer.independentSourcePageReview,
      originalReviewSha256, originalChangeSha256, sourceMetadataPointer: transfer.sourceMetadataPointer,
      beforePages: [16], afterPages: [16, 17], originalReviewPreserved: true, sourceValueGrade: 'NOT PROMOTED'},
  };
}
