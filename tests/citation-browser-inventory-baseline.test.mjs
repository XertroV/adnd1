import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const compressed=readFileSync(new URL('../research/citation-browser-inventory-prefx-attach.json.gz',import.meta.url));
const original=gunzipSync(compressed);
const originalSha256=createHash('sha256').update(original).digest('hex');
const baseline=JSON.parse(original.toString('utf8'));

test('frozen pre-attach-fix browser inventory retains every stale target finding byte-for-byte',()=>{
 assert.equal(originalSha256,'6f0a781b47b2bc96105f92f660fb497300edb6ce3c76206699e5f6d05a50e5ab');
 assert.equal(baseline.denominator.contentRecords,920);
 assert.equal(baseline.sweep.desktopRoutedRecords,918);
 assert.equal(baseline.sweep.renderedInlineControls,4991);
 assert.equal(baseline.payloadAudit.issueCounts['nonselected-catalog'],296);
 assert.equal(baseline.payloadAudit.issueCounts['field-binding-not-found'],296);
 const stale=baseline.payloadAudit.issues.filter(issue=>issue.code==='nonselected-catalog');
 assert.equal(new Set(stale.map(issue=>`${issue.routeRecord.collection}:${issue.routeRecord.itemId}`)).size,18);
});
