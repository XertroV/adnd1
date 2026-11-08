import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validateContinuationManifest} from '../tools/continuation-contract.mjs';

const read=path=>JSON.parse(readFileSync(path));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const receipt=read('research/source-audit-batch5-ua10-crop-integration.json');
const before=JSON.parse(gunzipSync(readFileSync('tests/fixtures/ua10-five-crops-and-drow-order-before.json.gz')));
const inputs=JSON.parse(gunzipSync(readFileSync(receipt.before.additionalExactInputs.path)));
const originalManifest=JSON.parse(inputs.files['research/citation-continuations.json'].utf8);
const manifest=read('research/citation-continuations.json');
const ledger=read('research/source-visual-reviews.json');

test('five preserved UA10 crop failures have source-bound replacements with unchanged precise-focus status',()=>{
  assert.equal(receipt.updates.filter(update=>update.candidateId).length,5);
  assert.equal(before.currentUa10Usages.length,9);
  assert.equal(receipt.sourcePixelReplay.length,4);
  for(const update of receipt.updates){
    const old=before.catalogs[update.catalog].regions.find(region=>region.id===update.regionId);
    const current=read(`dist/${update.catalog}`).regions.find(region=>region.id===update.regionId);
    assert.deepEqual(old,update.previous);
    assert.deepEqual(current,update.newRegion);
    assert.deepEqual(current.focusRects,old.focusRects);
    assert.deepEqual(current.focusRects,[[0,0,1,1]],'crop review must not clear the sentinel');
    assert.equal(sha(readFileSync(`dist/scans/verified/${old.image}`)),old.sha256);
    assert.equal(sha(readFileSync(`dist/scans/verified/${current.image}`)),current.sha256);
    const review=ledger.reviews.find(review=>review.collection==='rules'&&review.itemId===update.itemId&&review.binding==='sourceExcerpts'&&review.regionId===update.regionId);
    assert.equal(review.assessments.highlight,undefined);
    assert.equal(review.assessments.default,undefined);
    assert.equal(review.assessments.crop.status,update.sourceInherentDefect?'defect':'confirmed');
    if(update.candidateId){
      assert.notEqual(current.sha256,old.sha256);
      assert.equal(current.cropProvenance.renderDpi,600);
      assert.deepEqual(current.cropProvenance.imageDimensionsPx,[current.width,current.height]);
    }else assert.equal(current.sha256,old.sha256,'page11 pixels were already complete');
  }
  assert.equal(receipt.updates.filter(update=>update.sourceInherentDefect).length,2);
});

test('Drow continuation links preserve every prior group and exact variant order across pages',()=>{
  const pairs=JSON.parse(gunzipSync(readFileSync('tests/fixtures/source-audit-batch5-cross-page-pairs-before-drow.json.gz'))).pairs.filter(pair=>pair.itemId==='ua-drow-pc-exceptions');
  assert.equal(pairs.length,4);
  assert.ok(pairs.every(pair=>pair.declaredGroups.length===0));
  assert.deepEqual(manifest.groups.slice(0,originalManifest.groups.length),originalManifest.groups);
  assert.equal(receipt.addedGroups.length,2);
  for(const added of receipt.addedGroups){
    const current=manifest.groups.find(group=>group.id===added.id);
    assert.deepEqual(current,added);
    assert.deepEqual(current.segments.map(segment=>[segment.order,segment.printedPage,segment.pdfPage]),[[1,10,11],[2,11,12]]);
    assert.equal(current.highlightStatus,'unreviewed-full-image-sentinel');
    assert.ok(pairs.some(pair=>JSON.stringify(pair.regionIds)===JSON.stringify(current.requiredRegionIds)));
  }
  const context={data:read('dist/data.json'),catalogRoot:'dist'};
  assert.equal(validateContinuationManifest(manifest,context).groups,manifest.groups.length);
  const reversed=structuredClone(receipt.addedGroups[0]);
  reversed.segments.reverse().forEach((segment,index)=>segment.order=index+1);
  assert.throws(()=>validateContinuationManifest({schemaVersion:1,groups:[reversed]},context),/order disagrees/);
});
