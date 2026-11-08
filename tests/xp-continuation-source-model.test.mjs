import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {assertPrimaryRowEvidence} from '../tools/citation-region-role.mjs';
import {validateContinuationManifest} from '../tools/continuation-contract.mjs';
import {buildPublishedContinuations} from '../tools/published-continuations.mjs';

const json=p=>JSON.parse(readFileSync(p)),clone=x=>structuredClone(x),sha=b=>createHash('sha256').update(b).digest('hex');
const before=json('research/source-audit-pass8-xp-continuation-author-proposal.json');
test('the actual preserved eleven proposal-role failures replay before support and pass after support',async()=>{
  const bytes=readFileSync('tests/fixtures/pass8-xp-continuation-model-before.json.gz');
  assert.equal(sha(bytes),'413803d8b68fdc3573daecfd4e1214c546f394d6aeca2b3b7dcfb893f7773c8a');
  const archive=JSON.parse(gunzipSync(bytes)),old=archive.code.find(r=>r.path==='tools/citation-region-role.mjs');
  const prior=await import('data:text/javascript;base64,'+old.base64);
  assert.equal(archive.plan.structuralGateOutcomesBeforeModelSupport.roles.filter(r=>r.status==='rejected').length,11);
  for(const c of before.cases){const binding={itemId:c.itemId,fieldPointer:'/xpContinuation',reviewStatus:'field-target-reviewed',requiresPassageEvidence:true,regionIds:[c.proposedRegion.id]},catalog={regions:[c.proposedRegion]};
    assert.throws(()=>prior.assertPrimaryRowEvidence(binding,catalog),/declared passage target/);
    assert.doesNotThrow(()=>assertPrimaryRowEvidence(binding,catalog));
  }
  assert.match(archive.plan.structuralGateOutcomesBeforeModelSupport.groups.find(g=>g.id.includes('ua-paladin')).error,/source hash disagrees/);
});
test('passage support still rejects heading-only, whole-image and conflicting primary evidence',()=>{
  const c=before.cases[0],binding={itemId:c.itemId,fieldPointer:'/xpContinuation',reviewStatus:'field-target-reviewed',requiresPassageEvidence:true,regionIds:[c.proposedRegion.id]};
  const region=clone(c.proposedRegion);region.focusRects=[[0,0,1,1]];assert.throws(()=>assertPrimaryRowEvidence(binding,{regions:[region]}),/unresolved primary highlight/);
  region.focusRects=c.proposedRegion.focusRects;region.role='heading-only';assert.throws(()=>assertPrimaryRowEvidence(binding,{regions:[region]}),/declared passage target/);
  assert.throws(()=>assertPrimaryRowEvidence({...binding,requiresRowEvidence:true},{regions:[c.proposedRegion]}),/Conflicting primary/);
});

// This is a transport fixture with existing public limited images. It makes no
// source-semantic or field-approval claim for these synthetic group identities.
function withCrossBookFixture(fn){
  const root=mkdtempSync(join(tmpdir(),'xp-related-source-'));
  try{
    const catalogPath='scans/verified/classes-ua-paladin.json';
    const original=json('dist/'+catalogPath),first=clone(original.regions.find(r=>r.book==='PHB'&&r.printedPage===24)),second=clone(original.regions.find(r=>r.book==='UA'&&r.printedPage===16));
    first.id='synthetic-phb-rule';second.id='synthetic-ua-related-rule';const regions=[first,second];
    const catalog={...original,regions};mkdirSync(join(root,dirname(catalogPath)),{recursive:true});
    for(const r of regions)copyFileSync('dist/scans/verified/'+r.image,join(root,'scans/verified',r.image));
    writeFileSync(join(root,catalogPath),JSON.stringify(catalog));
    const data={classes:[{id:'ua-paladin',sourceExcerpts:{catalog:catalogPath},references:[{book:'PHB',pages:[24]},{book:'UA',pages:[16]}]}]};
    const group={id:'synthetic-related-books',collection:'classes',itemId:'ua-paladin',catalog:catalogPath,status:'segments-present-pending-deployment',
      source:{book:'PHB',printedPage:24,sourceSha256:catalog.sources.PHB.sha256},relationship:{kind:'related-source-rules',label:'Related advancement rules',reason:'Synthetic relationship transport fixture only.',ownerPage:{book:'UA',printedPage:16}},
      sourceComparison:{status:'compared-to-verified-original',pages:regions.map(r=>({book:r.book,printedPage:r.printedPage,pdfPage:r.pdfPage,sourceSha256:catalog.sources[r.book].sha256}))},
      requiredRegionIds:regions.map(r=>r.id),currentCitationPages:regions.map(r=>({book:r.book,printedPage:r.printedPage,regionIds:[r.id],role:'Synthetic source identity fixture'})),
      segments:regions.map((r,i)=>({order:i+1,role:i?'continuation':'opening',book:r.book,printedPage:r.printedPage,pdfPage:r.pdfPage,regionId:r.id,image:r.image,imageSha256:r.sha256,sourceSha256:catalog.sources[r.book].sha256,state:'present',relevance:'Synthetic related-rule identity fixture'}))};
    return fn({manifest:{schemaVersion:1,groups:[group],regressions:[]},group,data,catalogRoot:root,catalog,catalogPath});
  }finally{rmSync(root,{recursive:true,force:true});}
}
test('explicit related rules publish two distinct source identities without private review metadata',()=>withCrossBookFixture(f=>{
  assert.equal(validateContinuationManifest(f.manifest,f).presentSegments,2);
  const published=buildPublishedContinuations(f),g=published.groups[0];
  assert.deepEqual(g.segments.map(r=>r.book),['PHB','UA']);assert.notEqual(g.segments[0].sourceSha256,g.segments[1].sourceSha256);
  assert.deepEqual(g.relationship,f.group.relationship);assert.equal('sourceComparison' in g,false);
}));
test('cross-book linkage requires an explicit cited relationship and a comparison for each exact part',()=>{
  for(const mutate of [f=>delete f.group.relationship,f=>f.group.relationship.kind='similarity',f=>f.group.relationship.reason='',f=>f.group.relationship.ownerPage.printedPage=99,
    f=>f.group.sourceComparison.pages.pop(),f=>f.group.sourceComparison.pages[1].pdfPage=99,f=>f.group.sourceComparison.pages[1].sourceSha256='e'.repeat(64),
    f=>f.group.segments[1].sourceSha256='f'.repeat(64),f=>{f.group.source.book='DMG';f.group.source.sourceSha256=f.catalog.sources.DMG.sha256;},
    f=>f.group.source.printedPage=99,f=>f.group.source.printedPage='unreviewed',f=>f.group.source.printedPage=0,f=>delete f.group.source.printedPage]){
    withCrossBookFixture(f=>{mutate(f);assert.throws(()=>validateContinuationManifest(f.manifest,f),/cross-book|source hash|source identity|compared page/);});
  }
});
test('related-rule wording cannot waive a same-book source mismatch',()=>withCrossBookFixture(f=>{
  const second=f.catalog.regions[1];second.book='PHB';second.printedPage=24;second.pdfPage=f.catalog.regions[0].pdfPage;
  f.group.segments[1]={...f.group.segments[1],book:'PHB',printedPage:24,pdfPage:second.pdfPage,sourceSha256:'e'.repeat(64)};
  f.group.currentCitationPages[1]={book:'PHB',printedPage:24,regionIds:[second.id],role:'Synthetic same-book corruption'};
  f.group.sourceComparison.pages=[f.group.sourceComparison.pages[0]];
  writeFileSync(join(f.catalogRoot,f.catalogPath),JSON.stringify(f.catalog));
  assert.throws(()=>validateContinuationManifest(f.manifest,f),/source hash disagrees/);
}));
test('all pre-existing declared groups retain their current source checks',()=>{
  const manifest=json('research/citation-continuations.json'),data=json('dist/data.json');
  const result=validateContinuationManifest(manifest,{data,catalogRoot:'dist'});assert.equal(result.groups,manifest.groups.length);assert.equal(result.blockedSegments,0);
});
