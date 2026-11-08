import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {containsContext} from '../tools/citation-context-contract.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url))),fixture=read('tests/fixtures/ua28-header-focus-before.json');
test('the actual nineteen prior header boxes cut the second line',()=>{
 assert.equal(fixture.cases.length,19);
 for(const row of fixture.cases)assert.equal(row.focusRects.some(rect=>containsContext(rect,fixture.sourcePixelEvidence.requiredNormalizedBounds)),false,row.catalog);
});
test('every current reviewed UA28 header focus contains all its visible text and stops above Aklys',()=>{
 for(const row of fixture.cases){
  const current=read(row.catalog).regions.find(r=>r.id===row.regionId);
  assert.equal(current.sha256,row.imageSha256);
  assert.ok(current.focusRects.some(rect=>containsContext(rect,fixture.sourcePixelEvidence.requiredNormalizedBounds)),row.catalog);
  assert.ok(current.focusRects.every(rect=>(rect[1]+rect[3])*current.height<fixture.sourcePixelEvidence.nextRowGlyphStartsAtImageY));
 }
});
