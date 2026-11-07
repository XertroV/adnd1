import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const compressed=readFileSync(new URL('../research/citation-browser-inventory.json.gz',import.meta.url));
const bytes=gunzipSync(compressed);
const report=JSON.parse(bytes);

test('frozen current rendered-control inventory retains field ownership and the full denominator',()=>{
 assert.equal(createHash('sha256').update(compressed).digest('hex'),'e42be371437923895f0b08a6af4458f7e48a7fc812e46770db5ec3ff249ea1e1');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'ce2fcab1ba081b76b8d67bf7e1994500cfd746b2c0693ef75daaf0325b0819e7');
 assert.equal(report.provenance.sourceDataSha256,'47908c8ddc8b68c09e11f600ed0d0dc24b2a3749f8e3f452e245c7ee6635053b');
 assert.equal(report.provenance.distFilesUnmodified,true);
 assert.equal(report.denominator.contentRecords,993);
 assert.equal(report.denominator.routeRecords,991);
 assert.equal(report.staticProducerDenominator.classCount,9);
 assert.equal(report.staticProducerDenominator.siteCount,14);
 assert.equal(report.evidenceInventory.fieldEvidenceBindings,4260);
 assert.equal(report.evidenceInventory.regionBoundBindings,283);
 assert.equal(report.sweep.desktopRenderStates,2334);
 assert.equal(report.sweep.mobileRepresentativeRecords,3);
 assert.equal(report.sweep.renderStates,2338);
 assert.equal(report.sweep.renderedInlineControls,5212);
 assert.equal(report.sweep.controlObservations,10736);
 assert.equal(report.sweep.hiddenObservations,2144);
 assert.equal(report.payloadAudit.valid,true);
 assert.equal(report.payloadAudit.issueCount,0);
 assert.equal(report.payloadAudit.expectedFieldTargets,2712);
 assert.equal(report.payloadAudit.uniqueTargetsFromRenderedControls,2541);
 assert.equal(report.payloadAudit.uniqueTargetsFromCollector,4260);
 assert.equal(report.payloadAudit.unrenderedExpectedFieldTargets,181);
 assert.ok(report.targetPayloads.some(target=>target.fieldPointer&&target.fieldOwner?.collection==='progressionExplainer'));
 assert.deepEqual(report.sweep.routeFailures,[]);
 assert.deepEqual(report.failures.browserErrors,[]);
});
