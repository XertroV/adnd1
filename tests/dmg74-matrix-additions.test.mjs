import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const root=new URL('../',import.meta.url);
const search=createRequire(import.meta.url)('../dist/search.js');
const readJson=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const ids=[
 'dmg-cleric-druid-monk-attack-matrix',
 'dmg-magic-user-illusionist-attack-matrix',
 'dmg-thief-assassin-attack-matrix',
];
const cellCounts={
 'dmg-cleric-druid-monk-attack-matrix':147,
 'dmg-magic-user-illusionist-attack-matrix':105,
 'dmg-thief-assassin-attack-matrix':126,
};
const proofHashes={
 author:'9219fd5362be85035aaeff18b0240fbebad28327705b800400b258f2eef602e9',
 blind:'e6047f6c8a4cf48c5de9a9c3d4f574292b352c5988d3ef812a954b7cecb37562',
 review:'5938216513809579bba61c40d5a1901b9cb738d74cc1d53649ab01932da0a32c',
};
const authorPath='research/source-completeness-matrices-source-transcription.json';
const blindPath='research/source-completeness-matrices-independent-transcription.json';
const reviewPath='research/source-completeness-matrices-independent-review-v2.json';
const author=readJson(authorPath),blind=readJson(blindPath),review=readJson(reviewPath);
const authored=readJson('attack-matrices.json').matrices;
const assembled=readJson('dist/data.json').matrices;

test('the frozen pre-addition fixture has none of the three newly inventoried DMG p. 74 matrices',()=>{
 const before=readJson('tests/fixtures/matrix-before-cell-review.json').matrices;
 assert.deepEqual(before.map(matrix=>matrix.id),['dmg-original-fighter-attack-matrix']);
 for(const id of ids)assert.equal(before.some(matrix=>matrix.id===id),false,`${id} is absent from the frozen pre-addition matrix fixture`);
});

test('378 DMG p. 74 target cells match the author and blind literal transcriptions',()=>{
 for(const [name,path,key] of [['author',authorPath,'author'],['blind',blindPath,'blind'],['independent comparison',reviewPath,'review']])
  assert.equal(sha(readFileSync(new URL(path,root))),proofHashes[key],`${name} proof bytes`);
 assert.equal(review.authorComparison.totalCellsCompared,378);
 assert.deepEqual(review.authorComparison.mismatches,[]);
 assert.equal(review.authorComparison.tables.reduce((sum,row)=>sum+row.cellsCompared,0),378);
 for(const records of [authored,assembled]){
  let compared=0;
  for(const id of ids){
   const source=author.tables.find(matrix=>matrix.id===id);
   const blindUnit=blind.sourceUnits.find(unit=>unit.rootId===id);
   const matrix=records.find(candidate=>candidate.id===id);
   assert.ok(source&&blindUnit&&matrix,id);
   assert.equal(source.cellCount,cellCounts[id]);
   assert.equal(matrix.book,'DMG');
   assert.deepEqual(matrix.pages,[74]);
   assert.deepEqual(matrix.armorClasses,Array.from({length:21},(_,index)=>10-index));
   assert.deepEqual(matrix.rows,source.rows,`${id}: stored rows preserve source labels, markers, and target values`);
   const blindByLabel=new Map(blindUnit.rows.map(row=>[row.attackerLevelBand.label,row]));
   assert.equal(matrix.rows.length,blindUnit.rows.length);
   for(const row of source.rows){
    const blindRow=blindByLabel.get(row.label);
    assert.ok(blindRow,`${id}/${row.label}: matching blind band`);
    assert.equal(row.targets.length,21);
    assert.equal(blindRow.targets21.length,21);
    for(let column=0;column<21;column++){
     assert.equal(row.targets[column],blindRow.targets21[column],`${id}/${row.label}/AC ${source.armorClasses[column]} author/blind`);
     assert.equal(matrix.rows.find(candidate=>candidate.label===row.label).targets[column],row.targets[column],`${id}/${row.label}/AC ${source.armorClasses[column]} stored/source`);
     compared++;
    }
   }
   assert.equal(matrix.coverage.knownCells,cellCounts[id]);
   assert.equal(matrix.coverage.totalCells,cellCounts[id]);
   assert.equal(matrix.coverage.missingCells,0);
   assert.equal(matrix.cellVerification.cellCount,cellCounts[id]);
   assert.match(matrix.cellVerification.scope,/covers only the \d+ numeric target cells/i);
   assert.equal(matrix.incomplete,true,'other combat/class mechanics remain partial');
  }
  assert.equal(compared,378,`${records===authored?'authored':'assembled'} source-cell denominator`);
 }
});

test('DMG source qualifiers and the monk conflict retain their exact limited scope',()=>{
 for(const records of [authored,assembled]){
  const cleric=records.find(matrix=>matrix.id===ids[0]);
  const magic=records.find(matrix=>matrix.id===ids[1]);
  const thief=records.find(matrix=>matrix.id===ids[2]);
  assert.match(cleric.sourceConflict.disposition,/unresolved/i);
  assert.match(cleric.sourceConflict.references.join(' '),/PHB printed p\. 30/);
  assert.equal(cleric.sourceConflict.relatedClassGuideId,'monk');
  assert.deepEqual(magic.rows.map(row=>row.superscriptMarker??null),[null,null,null,null,null]);
  assert.deepEqual(magic.sourceNotes.map(note=>[note.literalText,note.marker]),[
   ['Missiles: * -5 at long range, -2 at medium range.','*'],
   ['*Normal, not magical.','*'],
  ]);
  assert.match(magic.sourceQualifierScope,/missile adjustment only/i);
  assert.match(magic.sourceQualifierScope,/does not mark or qualify the matrix cells/i);
  assert.deepEqual(thief.rows.map(row=>row.superscriptMarker),['a','b','c','d','d','d']);
  assert.deepEqual(thief.aliases,['backstab'],'editorial lookup aid is separate from literal source prose');
  assert.equal(search.score(search.prepare({...thief,_view:'matrices',_title:thief.title}),'backstab'),1,'the one-word editorial alias matches as a search alias');
  assert.deepEqual(thief.bandToNoteLinks.map(link=>[link.band,link.marker,link.note]),[
   ['1-4','a','a'],['5-8','b','b'],['9-12','c','c'],['13-16','d','d'],['17-20','d','d'],['21+','d','d'],
  ]);
  assert.deepEqual(thief.sourceNotes.slice(1).map(note=>[note.marker,note.bandLabels]),[
   ['a',['1-4ᵃ']],['b',['5-8ᵇ']],['c',['9-12ᶜ']],['d',['13-16ᵈ','17-20ᵈ','21+ᵈ']],
  ]);
  assert.deepEqual(thief.notes.slice(1).map(note=>note.slice(0,3)),['a. ','b. ','c. ','d. '],'visible display notes identify source markers a–d');
  assert.deepEqual(thief.notes.slice(1).map(note=>note.slice(3)),thief.sourceNotes.slice(1).map(note=>note.literalText),'visible prefixes preserve each literal source note');
  assert.deepEqual(thief.bandToNoteLinks.filter(link=>link.marker==='d').map(link=>link.band),['13-16','17-20','21+'],'d visibly corresponds to the final three attacker bands');
  assert.ok(records.every(matrix=>matrix.incomplete===true));
 }
});

test('each new matrix owner has one exact limited crop and pending hash-bound owner review',()=>{
 const overrides=readJson('citation-overrides.json');
 const visual=readJson('research/source-visual-reviews.json');
 const regionHashes={
  [ids[0]]:['089185837cda315595cef5d4edccfe58cf7e83d00911531f91a289a020648d50','2438904197b6a555cc7152c1e31678fe3a9fcd0b6af911f31ecaf50e5a2f2a48'],
  [ids[1]]:['34094120de6c10747964f0180a62ec038b50cef46285957183fe5d60f67abd57','d307af1cf600da65313127324984952f94c02e8fe755abb8f5829ebad9078c7f'],
  [ids[2]]:['c49364f9cbc79e99f20a7d50162fa6473f5c85534072ea90617b744ec71fa5b5','e7379bf8048c3ea53b5006015686c2ee22d03991de4c735217211c3a07c36cca'],
 };
 const sourceBounds={
  [ids[0]]:[0,27,274,298],
  [ids[1]]:[286,27,572.6396484375,312],
  [ids[2]]:[286,416,572.6396484375,751],
 };
 for(const [index,id] of ids.entries()){
  const key=`matrices:${id}`,override=overrides.sourceExcerpts[key];
  assert.ok(override,`${key}: source excerpt owner`);
  assert.equal(override.collection,'matrices');
  assert.equal(override.state,'source-excerpt-checked');
  assert.equal(override.regionCount,1);
  const catalog=readJson(`dist/${override.catalog}`),region=catalog.regions[0];
  assert.equal(catalog.collection,'matrices');
  assert.equal(catalog.itemId,id);
  assert.equal(catalog.regions.length,1);
  assert.deepEqual([region.book,region.printedPage,region.pdfPage],['DMG',74,75]);
  assert.deepEqual(region.sourcePdfPointsLTRB,sourceBounds[id]);
  assert.deepEqual(region.renderFrame.cropBoxPoints,[0,9.3599853515625,572.6396484375,776.638916015625]);
  assert.deepEqual(region.renderFrame.pageRectPoints,[0,0,572.6396484375,767.2789306640625]);
  assert.equal(region.renderFrame.renderDpi,216);
  assert.deepEqual(region.renderFrame.renderMatrix,[3,3]);
  assert.equal(region.approvedCropProposal.version,4);
  assert.equal(region.approvedCropProposal.sha256,'858e478343de9b1d348be843f7d982caedbf88b3e10cedb01bedb46823bd784e');
  assert.equal(region.approvedCropProposal.independentCropReviewSha256,proofHashes.review);
  assert.equal(sha(readFileSync(new URL(`dist/scans/verified/${region.image}`,root))),region.sha256);
  assert.deepEqual([region.width,region.height],index===0?[822,813]:index===1?[860,855]:[860,1005]);
  const [expectedFocus,expectedContent]=regionHashes[id];
  const {focusRects,...content}=region;
  assert.equal(sha(canonical(focusRects)),expectedFocus,`${id}: approved focus geometry`);
  assert.equal(sha(canonical(content)),expectedContent,`${id}: exact catalog content`);
  assert.equal(region.focusRoles[0],'table');
  assert.equal(focusRects.length,index===0?2:index===1?3:6);
  assert.ok(focusRects.every(rect=>rect[0]!==0||rect[1]!==0||rect[2]!==1||rect[3]!==1),'precise focus contains no full-image sentinel');
  const record=visual.reviews.find(r=>r.collection==='matrices'&&r.itemId===id&&r.binding==='sourceExcerpts'&&r.regionId===region.id);
  assert.ok(record,`${id}: exact owner/catalog region review record`);
  assert.deepEqual([record.sourceSha256,record.imageSha256],['7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',region.sha256]);
  assert.equal(record.focusSha256,expectedFocus);
  assert.equal(record.contentSha256,expectedContent);
  assert.equal(record.ownerBindingReviewPending.status,'pending-independent-review');
  assert.deepEqual(record.assessments,{},'no final owner-binding assessment is claimed');
 }
});
