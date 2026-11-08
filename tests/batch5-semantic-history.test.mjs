import assert from 'node:assert/strict';
import test from 'node:test';
import {batch5SemanticSuccessors,priorReviewedBatch5Value} from './helpers/batch5-semantic-history.mjs';

test('historical value guards accept only each exact documented successor',()=>{
 assert.equal(batch5SemanticSuccessors.length,16);
 for(const change of batch5SemanticSuccessors){
  assert.deepEqual(priorReviewedBatch5Value(change.collection,change.itemId,change.path,change.newValue,change.oldValue),change.oldValue);
  assert.deepEqual(priorReviewedBatch5Value(change.collection,change.itemId,change.path,change.oldValue,change.oldValue),change.oldValue);
  const tampered={unapproved:'changed value'};
  assert.deepEqual(priorReviewedBatch5Value(change.collection,change.itemId,change.path,tampered,change.oldValue),tampered);
  assert.deepEqual(priorReviewedBatch5Value('other-collection',change.itemId,change.path,change.newValue,change.oldValue),change.newValue);
  assert.deepEqual(priorReviewedBatch5Value(change.collection,'other-owner',change.path,change.newValue,change.oldValue),change.newValue);
 }
});
