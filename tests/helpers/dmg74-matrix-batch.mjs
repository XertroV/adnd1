import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reverseMatrixCellReview as reverseOriginalMatrixCellReview} from '../fixtures/matrix-baseline.mjs';
import {projectPass8CharacterReferenceJson} from './pass8-citation-target-crop-history.mjs';
// These three DMG p. 74 matrix records are a separately reviewed additive batch.
export const addedDmg74MatrixIds = Object.freeze([
 'dmg-cleric-druid-monk-attack-matrix',
 'dmg-magic-user-illusionist-attack-matrix',
 'dmg-thief-assassin-attack-matrix',
]);
export function reverseSupplementalPdfNoticeViewer(bytes) {
 const proofBytes=readFileSync(new URL('../../research/source-completeness-matrix-viewer-notice-adapter.json',import.meta.url));
 const hash=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(hash(proofBytes),'f19c1ebd44b716b6f84f4505ee6b41a0b67d40bb39f75dd4620ba8c19b396896');
 const proof=JSON.parse(proofBytes),current=bytes.toString();
 assert.equal(hash(bytes),proof.currentViewerSha256,'only the reviewed current notice viewer is eligible for historical projection');
 assert.equal(current.split(proof.afterBlock).length,2,'one exact reviewed notice branch');
 const historical=Buffer.from(current.replace(proof.afterBlock,proof.beforeBlock));
 assert.equal(hash(historical),proof.previousViewerSha256,'the entire previous viewer is restored exactly');
 return historical;
}
export function withoutDmg74MatrixAdditions(matrices) {
 const additions=new Set(addedDmg74MatrixIds);
 return matrices.filter(matrix=>!additions.has(matrix.id));
}
export function withoutDmg74MatrixSourceExcerptOverrides(value) {
 const copy=structuredClone(value);
 for(const id of addedDmg74MatrixIds){
  const key=`matrices:${id}`,binding=copy.sourceExcerpts?.[key];
  assert.ok(binding,`${key}: exact reviewed matrix batch override exists`);
  assert.equal(binding.collection,'matrices');
  assert.equal(binding.catalog,`scans/verified/matrices-${id}.json`);
  assert.equal(binding.regionCount,1);
  delete copy.sourceExcerpts[key];
 }
 return copy;
}
export function reverseDmg74MatrixBatchFromData(data, expectedCurrent) {
 const copy=projectPass8CharacterReferenceJson('dist/data.json',data),matches=copy.matrices.filter(matrix=>addedDmg74MatrixIds.includes(matrix.id));
 assert.deepEqual(matches.map(matrix=>matrix.id),addedDmg74MatrixIds,'reverse only the exact three approved DMG p. 74 matrix records');
 assert.deepEqual(matches.map(matrix=>matrix.cellVerification?.cellCount),[147,105,126]);
 copy.matrices=withoutDmg74MatrixAdditions(copy.matrices);
 assert.deepEqual(copy.matrices,expectedCurrent.matrices,'all prior matrix objects remain byte-equivalent after reversing this batch');
 const excerptFields=['regions','scopedRegions','imageFiles','sourceExcerptItems'];
 assert.deepEqual(copy.release.excerpts.itemIds.filter(id=>addedDmg74MatrixIds.includes(id)),addedDmg74MatrixIds,'each new excerpt owner occurs exactly once in source order');
 assert.deepEqual(copy.release.excerpts.itemIds.filter(id=>!addedDmg74MatrixIds.includes(id)),expectedCurrent.release.excerpts.itemIds);
 for(const field of excerptFields){assert.equal(copy.release.excerpts[field],expectedCurrent.release.excerpts[field]+3,`reverse only three new source-excerpt ${field}`);copy.release.excerpts[field]-=3;}
 copy.release.excerpts.itemIds=copy.release.excerpts.itemIds.filter(id=>!addedDmg74MatrixIds.includes(id));
 assert.deepEqual(copy.release.excerpts,expectedCurrent.release.excerpts,'every unrelated excerpt field, count and owner remains exact');
 const currentInventory=copy.release.priceInventory,priorInventory=expectedCurrent.release.priceInventory;
 assert.equal(currentInventory.fieldEvidenceBindings,priorInventory.fieldEvidenceBindings+6,'three matrix source excerpts add six matrix evidence bindings');
 assert.equal(currentInventory.fieldEvidenceBindingsByCollection.matrices,priorInventory.fieldEvidenceBindingsByCollection.matrices+6,'reverse only the six new matrix evidence bindings');
 assert.equal(currentInventory.pendingRegionBindings,priorInventory.pendingRegionBindings+6,'reverse only the six new pending matrix region bindings');
 for(const key of Object.keys(currentInventory).filter(key=>!['fieldEvidenceBindings','fieldEvidenceBindingsByCollection','pendingRegionBindings'].includes(key)))assert.deepEqual(currentInventory[key],priorInventory[key],`unrelated price-inventory summary ${key}`);
 for(const [collection,count] of Object.entries(currentInventory.fieldEvidenceBindingsByCollection))if(collection!=='matrices')assert.equal(count,priorInventory.fieldEvidenceBindingsByCollection[collection],`unrelated price-inventory collection ${collection}`);
 currentInventory.fieldEvidenceBindings=priorInventory.fieldEvidenceBindings;
 currentInventory.fieldEvidenceBindingsByCollection.matrices-=6;
 assert.deepEqual(currentInventory.fieldEvidenceBindingsByCollection,priorInventory.fieldEvidenceBindingsByCollection,'all unrelated collection keys and counts remain exact');
 currentInventory.pendingRegionBindings=priorInventory.pendingRegionBindings;
 assert.deepEqual(copy,expectedCurrent,'the exact frozen pre-addition distribution is restored');
 return copy;
}
export function reverseDmg74MatrixBatchFromInventory(inventory, expectedCurrent) {
 const copy=projectPass8CharacterReferenceJson('research/price-source-inventory.json',inventory);
 const added=copy.fieldEvidenceBindings.filter(binding=>binding.collection==='matrices'&&addedDmg74MatrixIds.includes(binding.itemId));
 assert.equal(added.length,6,'only two generated matrix-reference bindings per approved DMG p. 74 owner are reversed');
 for(const id of addedDmg74MatrixIds){
  const rows=added.filter(binding=>binding.itemId===id).sort((a,b)=>a.fieldPointer.localeCompare(b.fieldPointer));
  assert.deepEqual(rows.map(binding=>binding.fieldPointer),['','/cellVerification']);
  assert.ok(rows.every(binding=>binding.sourceCategory==='matrix-reference'&&binding.book==='DMG'&&binding.printedPage===74&&binding.pdfPage===75&&binding.catalog===`scans/verified/matrices-${id}.json`));
 }
 copy.fieldEvidenceBindings=copy.fieldEvidenceBindings.filter(binding=>!(binding.collection==='matrices'&&addedDmg74MatrixIds.includes(binding.itemId)));
 assert.deepEqual(copy.fieldEvidenceBindings,expectedCurrent.fieldEvidenceBindings,'all non-batch field bindings and the exact frozen prior universe remain intact');
 const current=copy.counts,prior=expectedCurrent.counts;
 assert.equal(current.fieldEvidenceBindings,prior.fieldEvidenceBindings+6);
 assert.equal(current.fieldEvidenceBindingsByCollection.matrices,prior.fieldEvidenceBindingsByCollection.matrices+6);
 assert.equal(current.pendingRegionBindings,prior.pendingRegionBindings+6);
 for(const key of Object.keys(current).filter(key=>!['fieldEvidenceBindings','fieldEvidenceBindingsByCollection','pendingRegionBindings'].includes(key)))assert.deepEqual(current[key],prior[key],`unrelated inventory count ${key}`);
 for(const [collection,count] of Object.entries(current.fieldEvidenceBindingsByCollection))if(collection!=='matrices')assert.equal(count,prior.fieldEvidenceBindingsByCollection[collection],`unrelated inventory collection ${collection}`);
 current.fieldEvidenceBindings=prior.fieldEvidenceBindings;
 current.fieldEvidenceBindingsByCollection.matrices-=6;
 assert.deepEqual(current.fieldEvidenceBindingsByCollection,prior.fieldEvidenceBindingsByCollection,'all unrelated collection keys and counts remain exact');
 current.pendingRegionBindings=prior.pendingRegionBindings;
 assert.deepEqual(copy,expectedCurrent,'only the exact three-owner matrix reference rows and their generated counts are reversed');
 return copy;
}
// Preserve the original sealed cell-review projection, then remove only this additive batch.
export function reverseMatrixCellReview(matrices) {
 return reverseOriginalMatrixCellReview(withoutDmg74MatrixAdditions(matrices));
}
