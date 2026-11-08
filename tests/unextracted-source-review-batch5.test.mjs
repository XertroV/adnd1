import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const report=read('research/source-audit-batch5-unextracted.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('complete pre-repair field universe retains all11 gaps and the falsely classified already extracted material',()=>{
  const compressed=readFileSync(new URL('../research/source-audit-batch5-unextracted-field-baseline.json.gz',import.meta.url));
  assert.equal(sha(compressed),report.baseline.fieldStatusInventoryGzipSha256);
  const bytes=gunzipSync(compressed);assert.equal(sha(bytes),report.baseline.fieldStatusInventorySha256);
  const baseline=JSON.parse(bytes);assert.equal(baseline.fieldRows.length,13418);assert.equal(baseline.notExtractedTargets.length,11);
  const data=JSON.parse(execFileSync('git',['show','679b15d1c580172e54314829c1c3c86dc78b65f3:dist/data.json'],{maxBuffer:32*1024*1024}));
  const before=data.spells.find(spell=>spell.id==='phb-magic-user-animal-growth');
  assert.equal(before.fields.Material,'Pinch of powdered bone');assert.match(before.exceptions[2],/^Gap:/);
  assert.equal(report.fieldReviews.length,7);assert.equal(report.fieldReviews.filter(field=>field.retainOpenStatus).length,6);
});

test('Animal Growth retains the printed component difference while the other six source questions stay open',()=>{
  const spells=read('phb-magic-user-extra.json').spells;
  for(const field of report.fieldReviews){
    const spell=spells.find(spell=>spell.id===field.itemId);assert.ok(spell,field.itemId);
    const index=Number(field.fieldPointer.split('/').at(-1));
    assert.equal(spell.exceptions[index],field.valueAfter);
    if(field.retainOpenStatus){assert.equal(field.valueBefore,field.valueAfter);assert.match(spell.exceptions[index],/^Gap:/);}
  }
  const animal=spells.find(spell=>spell.id==='phb-magic-user-animal-growth');
  assert.equal(animal.fields.Material,'Pinch of powdered bone');assert.match(animal.fields.Components,/V, S; material also specified/);
  assert.match(animal.exceptions[2],/Components V, S.*pinch of powdered bone/);
});

test('all nine precise source targets retain the reviewed source pixels and avoid a whole-image sentinel',()=>{
  let regions=0;
  for(const field of report.fieldReviews)for(const target of field.evidenceTargets){
    const catalog=read(target.catalogPath),region=catalog.regions.find(region=>region.id===target.regionId);
    assert.ok(region);assert.equal(catalog.sources[target.book].sha256,target.sourceSha256);
    assert.equal(region.sha256,target.imageSha256);assert.equal(sha(readFileSync(new URL('../dist/scans/verified/'+region.image,import.meta.url))),region.sha256);
    assert.deepEqual(region.focusRects,target.proposedFocusRects);assert.equal(sourceVisualRegionHashes(region).focusSha256,target.proposedFocusSha256);
    assert.equal(region.focusRects.some(rect=>JSON.stringify(rect)==='[0,0,1,1]'),false);
    regions++;
  }
  assert.equal(regions,9);
});
