import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const compressed=readFileSync(new URL('../research/citation-context-field-owner.json.gz',import.meta.url));
const bytes=gunzipSync(compressed);
const report=JSON.parse(bytes);

test('current contextual citation route, copy, replay and reload probe is complete',()=>{
 assert.equal(createHash('sha256').update(compressed).digest('hex'),'7f26e44ce00e5180c79bcc1dd5a0e012fa5bfdffc0046a382e5a5f6e57ea0241');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'f6f5de141ce0e1a518f4b2c9326cb9a002a72fb3007e9da5fdaedee13ca1cdb4');
 assert.equal(report.provenance.sourceDataSha256,'94c40a0350dc32162642eab196176962d0ce28547ecc5829ab7fbb9008690537');
 assert.equal(report.provenance.inventoryBindings,4260);
 assert.equal(report.summary.observations,146);
 assert.equal(report.summary.byScenario['progression-explainer'],64);
 assert.equal(Object.entries(report.summary.byScenario).filter(([name])=>name.startsWith('fighter-matrix')).reduce((sum,[,count])=>sum+count,0),76);
 assert.equal(report.summary.byScenario['equipment-comparison'],6);
 assert.equal(report.summary.urlMissingFieldPointer,0);
 assert.equal(report.summary.fieldOwnerMismatch,0);
 assert.equal(report.summary.sourceOwnerMismatch,0);
 assert.equal(report.summary.ownerNamespaceNotRouteable,0);
 assert.equal(report.summary.roundTripMisses,0);
 assert.equal(report.summary.copyMismatch,0);
 assert.equal(report.summary.actualReloadChecks,3);
 assert.equal(report.summary.actualReloadMisses,0);
 assert.deepEqual(report.summary.browserErrors,[]);
});
