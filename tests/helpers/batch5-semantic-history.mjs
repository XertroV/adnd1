import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';

const read=path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
const conflicts=read('research/source-audit-batch5-conflict-integration.json');
const priceNotes=read('research/source-audit-batch5-null-price-notes.json');
const unextracted=read('research/source-audit-batch5-unextracted.json');
const retirement=read('research/source-audit-batch5-class-progression-retirement.json');
const priceStateScope=read('research/source-owner-identity-migration.json').equipmentOnlyPriceStateScopeCorrection;
const referenceAdditions=[
 ...read('research/source-audit-batch5-table-reference-integration.json').references,
 ...read('research/source-audit-batch5-ua27-reference-integration.json').references,
 ...read('research/source-audit-batch5-ua26-central-integration.json').addedReferences,
 ...read('research/source-audit-batch5-ua75-secondary-occurrence-integration.json').referenceAppends.map(addition=>({itemId:addition.itemId,reference:addition.appendReference})),
];
const stripGenerated=value=>Array.isArray(value)?value.map(stripGenerated):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['evidenceBindings','regionReviews'].includes(key)).map(([key,child])=>[key,stripGenerated(child)])):value;

export function reverseBatch5ReferenceAdditions(items){
 const copy=structuredClone(items);
 for(const addition of [...referenceAdditions].reverse()){
  const item=copy.find(item=>item.id===addition.itemId);
  if(!item?.references)continue;
  const index=item.references.findIndex(reference=>isDeepStrictEqual(stripGenerated(reference),addition.reference));
  if(index!==-1)item.references.splice(index,1);
  if(item.references.length===0)delete item.references;
 }
 return copy;
}

// These are explicit reviewed successors of older fixture values. The old
// fixture remains authoritative for its original checkpoint, and arbitrary
// changes still reach its original assertion unchanged.
export const batch5SemanticSuccessors=[
 ...conflicts.changes.map(change=>({...change,path:change.pointer})),
 ...priceNotes.records.map(record=>({collection:'equipment',itemId:record.itemId,path:'/priceNote',oldValue:record.supersededEvidence[0].change.newValue,newValue:record.currentValue})),
 ...unextracted.fieldReviews.filter(review=>review.proposedDataChange).map(review=>({collection:review.collection,itemId:review.itemId,path:review.fieldPointer,oldValue:review.valueBefore,newValue:review.valueAfter})),
];

export function priorReviewedBatch5Value(collection,itemId,path,actual,expected){
 const successor=batch5SemanticSuccessors.find(change=>change.collection===collection&&change.itemId===itemId&&change.path===path&&isDeepStrictEqual(change.oldValue,expected)&&isDeepStrictEqual(change.newValue,actual));
 return successor?structuredClone(successor.oldValue):actual;
}

export function reverseBatch5SemanticSuccessors(items,collection){
 const copy=structuredClone(items);
 for(const change of batch5SemanticSuccessors.filter(change=>change.collection===collection)){
  const item=copy.find(item=>item.id===change.itemId);
  if(!item)continue;
  const parts=change.path.split('/').slice(1).map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
  let parent=item;
  for(const part of parts.slice(0,-1))parent=parent?.[part];
  const key=parts.at(-1);
  if(parent&&isDeepStrictEqual(parent[key],change.newValue)){
   if(collection==='classes'&&change.itemId==='ua-paladin'&&change.path==='/guidance/4'&&change.oldValue===null){
    if(!Array.isArray(parent)||parent.length!==5)throw Error('UA Paladin reviewed appended guidance shape changed');
    parent.splice(4,1);
   }else parent[key]=structuredClone(change.oldValue);
  }
 }
 if(collection==='classes'){
  const assassin=copy.find(item=>item.id==='assassin');
  if(assassin?.levelChanges.length===50)assassin.levelChanges.push(structuredClone(retirement.retired.event));
 }
 if(collection==='rules')for(const correction of priceStateScope.entries){
  const item=copy.find(item=>item.id===correction.itemId);
  // Restore the old assembled metadata only for a historical hash comparison.
  // Authored rule JSON never carried this equipment-only state.
  if(item?.sourceExcerpts?.catalog===`scans/verified/rules-${correction.itemId}.json`&&!Object.hasOwn(item,'priceState')){
   if(correction.after.rulesHasPriceStateProperty!==false||correction.before.rulesPriceState!=='source_listed')throw Error('Unexpected source-owner price-state correction receipt');
   item.priceState=correction.before.rulesPriceState;
  }
 }
 return copy;
}
