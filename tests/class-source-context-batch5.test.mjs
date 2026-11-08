import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {containsContext} from '../tools/citation-context-contract.mjs';
import {sourceVisualRegionHashes} from '../tools/price-source-inventory.mjs';
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
test('49 valid class facts have exact independently reviewed page targets; Assassin17 is excluded',()=>{
 const bindings=read('research/field-evidence-bindings.json').bindings.filter(b=>b.collection==='classes');
 assert.equal(bindings.length,51);assert.equal(new Set(bindings.map(b=>b.itemId+b.fieldPointer)).size,49);
 assert.equal(bindings.some(b=>b.itemId==='assassin'&&b.fieldPointer==='/levelChanges/50'),false);
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
