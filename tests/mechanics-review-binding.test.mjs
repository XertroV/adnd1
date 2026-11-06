import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateIndependentReviews} from './mechanics-batch-two-fixture.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/mechanics-batch-two-corrections.json',import.meta.url),'utf8'));
test('independent reviews bind accepted values and exact parent-array deletions',()=>{
 validateIndependentReviews();
 const changed=structuredClone(fixture.records);
 const reviewed=changed.find(r=>r.independentReview?.proposedValueSha256 && r.changes.some(c=>c.path===r.independentReview.path));
 reviewed.changes.find(c=>c.path===reviewed.independentReview.path).newValue='tampered';
 assert.throws(()=>validateIndependentReviews(changed),/independently reviewed hash/);
 const deleted=structuredClone(fixture.records);
 const parent=deleted.find(r=>r.independentReview?.path==='/exceptions/0' && r.changes.some(c=>c.path==='/exceptions'));
 parent.changes.find(c=>c.path==='/exceptions').newValue.push('unreviewed addition');
 assert.throws(()=>validateIndependentReviews(deleted),/exactly one reviewed deletion/);
 const stripped=structuredClone(fixture.records); delete stripped.find(r=>r.independentReview).independentReview;
 assert.throws(()=>validateIndependentReviews(stripped),/independent review coverage/);
});
