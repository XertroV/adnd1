import test from 'node:test';import assert from 'node:assert/strict';
import {readBeforePass8XpContinuationFile as readFileSync} from './helpers/pass8-phb-source-history.mjs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {containsContext} from '../tools/citation-context-contract.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';
// Retain the exact released777 class-target census; active XP-continuation
// bindings and current validators are checked separately without this reader.
const root=new URL('..',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root)));
const report=read('research/source-audit-batch5-class-integration.json');
test('the actual previous proficiency table crop omits required definition context',()=>{
 const catalog=JSON.parse(execFileSync('git',['show','679b15d:dist/scans/verified/classes-cleric.json'],{cwd:root,maxBuffer:4*1024*1024}));
 const contract=read('research/citation-context-contracts.json').requirements.find(r=>r.id==='classes:cleric:/levelChanges/9:proficiency-context');
 assert.ok(contract);const old=catalog.regions.find(r=>r.id===contract.regionId);
 assert.equal(containsContext(old.normalizedPageRect,contract.requiredBounds.values),false);
 const current=read('dist/'+contract.catalog).regions.find(r=>r.id===contract.regionId);
 assert.equal(containsContext(current.normalizedPageRect,contract.requiredBounds.values),true);
});
test('the released777 49-fact class baseline and206 XP-row targets remain separately counted',()=>{
 const bindings=read('research/field-evidence-bindings.json').bindings.filter(b=>b.collection==='classes');
 const legacyBindings=bindings.filter(b=>['class-weapon-proficiency-progression','assassin-scroll-reading-ability'].includes(b.sourceCategory));
 const xpBindings=bindings.filter(b=>b.sourceCategory==='class-xp-row');
 const cavalierHpBindings=bindings.filter(b=>b.sourceCategory==='class-level-change'&&b.itemId==='ua-cavalier');
 assert.equal(bindings.length,267);
 assert.equal(legacyBindings.length,51);assert.equal(new Set(legacyBindings.map(b=>b.itemId+b.fieldPointer)).size,49);
 assert.equal(legacyBindings.some(b=>b.itemId==='assassin'&&b.fieldPointer==='/levelChanges/50'),false);
 assert.equal(xpBindings.length,206);
 assert.equal(new Set(xpBindings.map(b=>`${b.itemId}:${b.fieldPointer}`)).size,206);
 assert.ok(xpBindings.every(b=>/^\/xpRows\/\d+$/.test(b.fieldPointer)&&b.reviewStatus==='field-target-reviewed'&&b.targetReview?.status==='confirmed'&&b.targetReview.independent===true&&b.sourceValueStatus==='not-assessed-by-field-target-review'));
 const cavalierHpFields=['/levelChanges/45','/levelChanges/51','/levelChanges/56','/levelChanges/60','/levelChanges/64','/levelChanges/69','/levelChanges/74','/levelChanges/77','/levelChanges/80','/levelChanges/83'];
 assert.equal(cavalierHpBindings.length,10);
 assert.deepEqual(cavalierHpBindings.map(b=>b.fieldPointer),cavalierHpFields);
 const continuationManifest=read('research/citation-continuations.json');
 const cavalierHpGroups=continuationManifest.groups.filter(group=>group.id.startsWith('batch6-ua-cavalier-hp-source-level-'));
 assert.equal(cavalierHpGroups.length,10);
 assert.deepEqual(cavalierHpGroups.map(group=>group.id),Array.from({length:10},(_,index)=>`batch6-ua-cavalier-hp-source-level-${index+11}`));
 const cavalier=read('classes.json').classes.find(item=>item.id==='ua-cavalier');
 const rootHpReviewPath='research/source-audit-batch6-cavalier-hp-root-independent-review.json';
 const rootHpReviewSha256='31d5ceeb53c9a42a1832de05b677e336eda50e3ca71d463c29df592b056004b4';
 for(const [index,binding] of cavalierHpBindings.entries()){
  const level=index+11,fieldIndex=Number(binding.fieldPointer.split('/').at(-1));
  const regionId=`ua-15-cavalier-level-${level}-hp-gain-passage`;
  assert.equal(binding.sourceObjectPointer,binding.fieldPointer);
  assert.deepEqual([binding.book,binding.printedPage,binding.pdfPage,binding.catalog,binding.regionIds],[
   'UA',15,16,'scans/verified/classes-ua-cavalier.json',[regionId],
  ]);
  assert.equal(binding.reviewStatus,'field-target-reviewed');
  assert.equal(binding.sourceValueStatus,'not-assessed-by-field-target-review');
  assert.equal(binding.contextStatus,'complete-table-and-relevant-passage-independently-reviewed');
  assert.equal(binding.targetReview?.evidence,rootHpReviewPath);
  assert.equal(binding.targetReview?.evidenceSha256,rootHpReviewSha256);
  assert.equal(createHash('sha256').update(readFileSync(new URL(rootHpReviewPath,root))).digest('hex'),rootHpReviewSha256);
  assert.deepEqual(binding.targetReview.expectedTargetIdentity,{
   kind:'class-level-change',collection:'classes',itemId:'ua-cavalier',fieldPointer:binding.fieldPointer,sourceObjectPointer:binding.fieldPointer,
   value:{level,book:'UA',pages:[15],changes:['Add 3 fixed hit points instead of another hit die; the source places fixed gains after level 10.'],status:'OCR checked · visual review pending',incomplete:true},
  });
  const authored=cavalier.levelChanges[fieldIndex];
  assert.deepEqual({level:authored.level,book:authored.book,pages:authored.pages,changes:authored.changes,status:authored.status,incomplete:authored.incomplete},binding.targetReview.expectedTargetIdentity.value);
  const catalog=read(`dist/${binding.catalog}`),region=catalog.regions.find(candidate=>candidate.id===regionId),expected=binding.expectedRegionEvidence[0];
  assert.equal(region.sha256,expected.imageSha256);
  assert.equal(catalog.sources[binding.book].sha256,expected.sourceSha256);
  const regionHashes=sourceVisualRegionHashes(region);
  assert.equal(regionHashes.focusSha256,expected.focusSha256);
  assert.equal(regionHashes.contentSha256,expected.contentSha256);
  const group=cavalierHpGroups[index];
  assert.equal(group.collection,'classes');assert.equal(group.itemId,'ua-cavalier');
  assert.deepEqual(group.requiredRegionIds,[`ua-15-cavalier-full-table-context-hp-level-${level}`,regionId]);
  assert.deepEqual(group.segments.map(segment=>[segment.order,segment.role,segment.regionId]),[
   [1,'opening',`ua-15-cavalier-full-table-context-hp-level-${level}`],[2,'continuation',regionId],
  ]);
  assert.equal(group.sourceComparison.evidence,rootHpReviewPath);
  assert.equal(group.sourceComparison.evidenceSha256,rootHpReviewSha256);
  assert.equal(group.highlightStatus,'precise-fact-highlight-reviewed-table-context-sentinel-unresolved');
  assert.match(group.scope,/HP values, grades, prerequisites and defaults are unchanged/);
 }
 for(const b of bindings){
  const catalog=read('dist/'+b.catalog),region=catalog.regions.find(r=>r.id===b.regionIds[0]),expected=b.expectedRegionEvidence[0];
  assert.equal(region.sha256,expected.imageSha256);assert.equal(catalog.sources[b.book].sha256,expected.sourceSha256);
  const hashes=sourceVisualRegionHashes(region);assert.equal(hashes.focusSha256,expected.focusSha256);assert.equal(hashes.contentSha256,expected.contentSha256);
  assert.equal(createHash('sha256').update(readFileSync(new URL(b.targetReview.evidence,root))).digest('hex'),b.targetReview.evidenceSha256);
 }
 assert.equal(report.originalProposals,50);assert.equal(report.promotedSemanticFields,49);
 const authored=read('classes.json').classes,review=read(report.independentReview.path);
 for(const target of [...review.targetChecks.filter(t=>!(t.itemId==='assassin'&&t.fieldPointer==='/levelChanges/50')),review.assassinCompoundTarget]){
  const item=authored.find(c=>c.id===target.itemId),index=Number(target.fieldPointer.split('/').at(-1));
  assert.deepEqual(item.levelChanges[index],target.authoredField,`${target.itemId}${target.fieldPointer} differs from reviewed fact`);
 }
});
test('Assassin12 scroll evidence retains the trigger, eligibility and inherited-level dependencies',()=>{
 const bindings=read('research/field-evidence-bindings.json').bindings.filter(b=>b.collection==='classes'&&b.itemId==='assassin'&&b.fieldPointer==='/levelChanges/35');
 assert.deepEqual(bindings.map(b=>b.printedPage),[19,27,29]);assert.ok(bindings.every(b=>b.contextLimitations.length));
});
