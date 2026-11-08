import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadSourceTableCitationCoverage} from '../tools/source-table-citation-coverage.mjs';
import {reverseBatch5ReferenceAdditions} from './helpers/batch5-semantic-history.mjs';

const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const before=read('research/source-audit-batch5-ua75-secondary-occurrence-before.json');
const receipt=read('research/source-audit-batch5-ua75-secondary-occurrence-integration.json');
const data=read('dist/data.json');
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`:JSON.stringify(value);
const sha=value=>createHash('sha256').update(stable(value)).digest('hex');

test('the full before detector found sixteen missing price-row regions despite existing UA75 field pages',()=>{
  assert.equal(before.denominator.owners,995);
  assert.equal(before.knownMissingPriceRowRegions.length,16);
  assert.ok(before.knownMissingPriceRowRegions.every(row=>row.status==='required-table-region-absent'));
  assert.equal(before.sourcePageCitationsBefore.length,16);
  assert.ok(before.sourcePageCitationsBefore.every(row=>row.referencePresent));
  assert.equal(before.availabilityOnlyRow.targets.length,0);
  assert.match(before.availabilityOnlyRow.sourceRowDisposition,/unavailable/);
});

test('all sixteen current secondary references select their cost rows without changing prices or primary bindings',()=>{
  const current=loadSourceTableCitationCoverage();
  const rows=current.rows.filter(row=>row.tableId===receipt.tableContract.id);
  assert.equal(rows.length,17);
  assert.equal(rows.flatMap(row=>row.targets).length,16);
  assert.ok(rows.flatMap(row=>row.targets).every(target=>target.status==='reference-and-source-page-excerpt-present'));
  for(const addition of receipt.referenceAppends){
    const item=data.equipment.find(item=>item.id===addition.itemId);
    assert.equal(sha(item.price),receipt.pricePreservation.allItemPriceObjectsUnchanged[item.id]);
    assert.equal(sha(item.price.evidenceBindings[0]),receipt.pricePreservation.existingCanonicalPriceBindingHashes[item.id]);
    const ref=item.references[addition.resolvedReferenceIndex];
    assert.equal(ref.book,'UA');assert.deepEqual(ref.pages,[75]);
    const binding=ref.evidenceBindings.find(binding=>binding.fieldPointer===addition.fieldPointer);
    assert.equal(binding.reviewStatus,'field-target-reviewed');
    assert.deepEqual(binding.regionIds,addition.appendReference.verification.regions);
    const regionReview=item.sourceExcerpts.regionReviews.find(review=>review.regionId===binding.regionIds[0]);
    assert.equal(regionReview.status,'current-reviewed');assert.equal(regionReview.sentinel,false);
  }
});

test('history removes only the exact reviewed added reference and retains unexpected changes',()=>{
  const addition=receipt.referenceAppends[0], item={id:addition.itemId,references:[structuredClone(addition.appendReference)]};
  assert.equal(reverseBatch5ReferenceAdditions([item])[0].references,undefined);
  item.references[0].label+=' altered';
  assert.equal(reverseBatch5ReferenceAdditions([item])[0].references.length,1);
});
