import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {attachSourceVisualReviewMetadata} from '../tools/price-source-inventory.mjs';

test('the preserved full-ledger missing-owner integration error is rejected before attachment', () => {
  const ledger=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-review-ledger-ua75-missing-owner-before.json.gz',import.meta.url))));
  assert.equal(ledger.reviews.filter(review=>!review.itemId).length,16);
  assert.throws(()=>attachSourceVisualReviewMetadata({equipment:[]},{ledger,catalogs:new Map()}),/requires a collection, item owner, binding and region identity/);
});

test('review identities distinguish owner collection and reject incomplete keys', () => {
  const base={collection:'equipment',itemId:'fixture',binding:'sourceExcerpts',regionId:'fixture-region'};
  for(const bad of [{...base,itemId:''},{...base,collection:'unknown'},{...base,binding:'unknown'},{...base,regionId:null}]){
    assert.throws(()=>attachSourceVisualReviewMetadata({equipment:[]},{ledger:{reviews:[bad]},catalogs:new Map()}),/requires a collection/);
  }
  assert.deepEqual(attachSourceVisualReviewMetadata({equipment:[],rules:[]},{ledger:{reviews:[base,{...base,collection:'rules'}]},catalogs:new Map()}),{equipment:[],rules:[]});
});
