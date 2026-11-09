import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {canonical,regionHashes} from '../../../tools/source-visual-coverage.mjs';
import {validateScanCatalog} from '../../../tools/scan-catalog.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../..');
const require=createRequire(import.meta.url),books=require('../../../dist/books.js');
const OUT='research/missile-table-discoverability/authored-activation-cc950-v1';
const V4='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=p=>readFileSync(path.join(root,p));
const readJson=p=>JSON.parse(read(p));
const write=(p,b)=>writeFileSync(path.join(root,p),b);
const assertSha=(p,want)=>assert.equal(sha(read(p)),want,`unexpected preimage ${p}`);
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(commit,'cc9509047746d5e27a71cb5b1e0cfcb739a688c9','activation must be on the reviewed cc950 base');

const expected={
 'rules.json':'93d3455015fbd482f16a83bad2d54501053ed1214050536078f395cc06d48ab9',
 'citation-overrides.json':'75a2393b8d8ad5cd0558df99366814a1c039c7760247124083f166fb256d77c9',
 'research/citation-continuations.json':'26817acfa52af9541fce229665f986a54927f08bd62027d945b83c0a869fec45',
 'research/source-visual-reviews.json':'0fefb3809fcc77c7488c5109fcb3007b269a0346967d886aec4b43ab10985505',
 'dist/scans/verified/rules-weapon-versus-armor-adjustments.json':'a525c887c3a7ae5cfc3665e4ba7f2ce7a8d422b94ecb3d2baa71d29d3aebae2d',
 'dist/app.js':'ed4ccaa3f98e4161bda41f897198a5d4f3f8a8a7d8d300a180ced4568f64532f',
 'dist/search.js':'dc14ed3bbe5da1307c8d2c0dce56547b0d737ff878d7a6578bc5ebd3b3945d39',
 'dist/source-viewer.js':'5b2643af83799cc3597cec8170b8040cd13045e7d1850ac72a02075ccfecd9c6',
 'tests/search-ranking.browser.mjs':'e806a7433687c114a23bd7c1b174d265a6e6b7f29c95f26481db751aa05e9724',
 'dist/data.json':'cf6dd7ff912b91fd4525e1d48355e8c21e766e73f2118820e926a96b62f5216f',
 'dist/source-continuations.json':'0cb374469be54ca703b009c3f5e0545f6948fdbf3b7ff8858fd0625f2e17ff87',
 'research/missile-table-discoverability/final-combined-candidate-independent-review-v1.json':'eae2cdf994c07c9bc3a1706254452dffbc09fa0ac0fd9a29378592713cafa1ad',
 [`${V4}/proposed-generic-source-context-routing-v2.patch`]:'e98333a02eeb7cb521301603c27a29f59a270ef73599aa5934aca37abe84eecb',
 [`${V4}/production-metadata-v4-manifest.json`]:'01461c3690bbc15918729ea9b72524c4aeb1ddcab49c5fcd490eec6e14f24735',
 [`${V4}/rules-records-candidate-final-v4.json`]:'d8d481d3995cab8f41118cecb181fe93ceb16ecad1997c96d04844acc7787528',
 [`${V4}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`]:'7cf0a857d46411635941aa882ceeea117549d0c72f48b23aab0000abaa33d0af',
 [`${V4}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`]:'218815d637e6d597a7476a7a7b434521c07eb77aeb36150f724c257a6492f435',
 [`${V4}/catalogs/rules-weapon-versus-armor-adjustments-v2.json`]:'726bfde8c339c1c98b59d406de7448f3d716718d08aa2e4387512452db5f0d57',
 'research/missile-table-discoverability/implementation-candidate/continuation-group-candidate.json':'6019025df4de3d3d091340e0ee5e03be8972d9809c66223b14607c673b665aeb',
};
for(const [p,h] of Object.entries(expected))assertSha(p,h);
for(const p of ['dist/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json','dist/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json','dist/scans/verified/dmg-28-c37135485e89a720.png'])assert(!existsSync(path.join(root,p)),`refusing to overwrite ${p}`);

const v4Records=readJson(`${V4}/rules-records-candidate-final-v4.json`).records;
assert.equal(v4Records.length,2);
const phbCatalog=readJson(`${V4}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`);
const uaCatalog=readJson(`${V4}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`);
const dmgCatalog=readJson(`${V4}/catalogs/rules-weapon-versus-armor-adjustments-v2.json`);
for(const [catalog,id] of [[phbCatalog,'phb-hurled-weapons-and-missiles-table'],[uaCatalog,'ua-hurled-weapons-and-missiles-table'],[dmgCatalog,'weapon-versus-armor-adjustments']])
 validateScanCatalog(catalog,{id},{...books},{collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${id}.json`,regionCount:catalog.regions.length});

function matchingClose(text,start){
 const open=text[start];const close=open==='{'?'}':open==='['?']':null;assert(close,`not a JSON container at ${start}`);
 let depth=0,inString=false,escaped=false;
 for(let i=start;i<text.length;i++){
  const ch=text[i];
  if(inString){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')inString=false;continue;}
  if(ch==='"'){inString=true;continue;}
  if(ch===open)depth++;
  else if(ch===close&&--depth===0)return i;
 }
 throw Error('unterminated JSON container');
}
function findNamedContainer(text,key,kind){
 const needle=`${JSON.stringify(key)}:`;const i=text.indexOf(needle);assert(i>=0,`missing property ${key}`);
 let start=i+needle.length;while(/\s/.test(text[start]||''))start++;
 assert.equal(text[start],kind==='array'?'[':'{',`${key} has wrong JSON type`);
 return {propertyStart:i,valueStart:start,close:matchingClose(text,start)};
}
function insertArrayItems(text,key,items,indent=4){
 const c=findNamedContainer(text,key,'array');
 const lineStart=text.lastIndexOf('\n',c.close-1);assert(lineStart>=0);
 const before=text.slice(0,lineStart).trimEnd();
 assert(before.endsWith('}')||before.endsWith(']'),'expected a nonempty JSON array');
 const added=items.map(value=>JSON.stringify(value,null,2).split('\n').map(line=>' '.repeat(indent)+line).join('\n')).join(',\n');
 return `${before},\n${added}${text.slice(lineStart,c.close)}${text.slice(c.close)}`;
}
function insertObjectProps(text,key,entries,indent=4){
 const c=findNamedContainer(text,key,'object');
 const lineStart=text.lastIndexOf('\n',c.close-1);assert(lineStart>=0);
 const before=text.slice(0,lineStart).trimEnd();
 assert(before.endsWith('}')||before.endsWith(']'),'expected an object');
 const added=entries.map(([name,value])=>{
  const rendered=JSON.stringify(value,null,2).split('\n');
  return `${' '.repeat(indent)}${JSON.stringify(name)}: ${rendered[0]}${rendered.slice(1).map(line=>`\n${' '.repeat(indent)}${line}`).join('')}`;
 }).join(',\n');
 return `${before},\n${added}${text.slice(lineStart,c.close)}${text.slice(c.close)}`;
}
function replaceNamedObject(text,key,mutate){
 const needle=`${JSON.stringify(key)}:`;const at=text.indexOf(needle);assert(at>=0,`missing ${key}`);
 let start=at+needle.length;while(/\s/.test(text[start]||''))start++;
 assert.equal(text[start],'{');const end=matchingClose(text,start)+1;
 const old=JSON.parse(text.slice(start,end));const next=mutate(structuredClone(old));
 const indent=text.slice(text.lastIndexOf('\n',at)+1,at).length;
 const rendered=JSON.stringify(next,null,2).split('\n').map((line,i)=>i?`${' '.repeat(indent+2)}${line}`:`${' '.repeat(indent)}${line}`).join('\n');
 return text.slice(0,start)+rendered+text.slice(end);
}
function addSourceContextToRules(text){
 const itemId='weapon-versus-armor-adjustments';
 const start=text.indexOf(`"id": "${itemId}"`);assert(start>=0);
 const end=text.indexOf('\n      }',start);assert(end>start);
 const itemText=text.slice(start,end);
 const needle='"pages": [\n        28\n      ],\n      "summary": "If the campaign uses weapon-type attack adjustments';
  assert.equal(itemText.split(needle).length,2,'DMG rule page/summary anchor changed');
 const replacement='"pages": [\n        28\n      ],\n      "sourceContext": {\n        "book": "DMG",\n        "printedPage": 28,\n        "regionId": "dmg-28-opening-8b67aa025e19eddd"\n      },\n      "summary": "If the campaign uses weapon-type attack adjustments';
 return text.slice(0,start)+itemText.replace(needle,replacement)+text.slice(end);
}
function roleOrder(catalog,book,page){
 return catalog.regions.filter(r=>r.book===book&&r.printedPage===page).sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
}
const pageGroupHash=(catalog,book,page)=>sha(Buffer.from(canonical(roleOrder(catalog,book,page).map(region=>({id:region.id,role:region.role||null,imageSha256:region.sha256,...regionHashes(region)})))));
const sourceHash=(catalog,region)=>books.resolveRegionSourceIdentity(catalog,region)?.sourceSha256;
const reviewRef='research/missile-table-discoverability/final-combined-candidate-independent-review-v1.json';
const reviewEvidence=(fragment,description)=>`${reviewRef}#${fragment}; ${description}`;
function visualReview({itemId,catalog,region,book,page,assessmentNames,groupHash=null,evidenceFragment,description}){
 const source=sourceHash(catalog,region), hashes=regionHashes(region);
 assert(source&&/^[a-f0-9]{64}$/.test(source));
 const assessments={};
 for(const name of assessmentNames)assessments[name]={status:'confirmed',independent:true,evidence:reviewEvidence(evidenceFragment,description)};
 return {collection:'rules',itemId,binding:'sourceExcerpts',regionId:region.id,sourceSha256:source,imageSha256:region.sha256,focusSha256:hashes.focusSha256,contentSha256:hashes.contentSha256,book,printedPage:page,pdfPage:region.pdfPage,normalizedPageRect:region.normalizedPageRect??null,focusRects:region.focusRects||[],assessments,...(groupHash?{defaultOrderSha256:groupHash}:{})};
}
const phbContext=phbCatalog.regions.find(r=>r.id==='phb38-table-context');
const uaContext=uaCatalog.regions.find(r=>r.id==='ua28-table-context');
const dmgOpening=dmgCatalog.regions.find(r=>r.id==='dmg-28-opening-8b67aa025e19eddd');
const dmgContinuation=dmgCatalog.regions.find(r=>r.id==='dmg-28-c37135485e89a720');
assert(phbContext&&uaContext&&dmgOpening&&dmgContinuation);
const phbOrder=pageGroupHash(phbCatalog,'PHB',38),uaOrder=pageGroupHash(uaCatalog,'UA',28),dmgOrder=pageGroupHash(dmgCatalog,'DMG',28);
assert.equal(phbOrder,'e75630c36f1f9791abea5f81c40ce1b9987f3cf14ae1253ddad66abe5c0189dd');
assert.equal(uaOrder,'aafed16541a0f764d86de6350db2cfa3d7d3c2cc254e78b465a7d6984508b130');
assert.equal(dmgOrder,'7b1592f03196e6ef2dbad7c9ff3937b119b03a6c873ceb4a0d0765168341cbb9');
const newReviews=[
 visualReview({itemId:v4Records[0].id,catalog:phbCatalog,region:phbContext,book:'PHB',page:38,assessmentNames:['context','default'],groupHash:phbOrder,evidenceFragment:'objectReview.phbTable',description:'Complete unmarked PHB p. 38 table lookup context and its exact 18-region ordered page-group default were independently reviewed; row-level source targets remain separate.'}),
 visualReview({itemId:v4Records[1].id,catalog:uaCatalog,region:uaContext,book:'UA',page:28,assessmentNames:['context','default'],groupHash:uaOrder,evidenceFragment:'objectReview.uaTable',description:'Complete unmarked UA p. 28 table lookup context and its exact 28-region ordered page-group default were independently reviewed; row/note targets remain separate.'}),
 visualReview({itemId:'weapon-versus-armor-adjustments',catalog:dmgCatalog,region:dmgOpening,book:'DMG',page:28,assessmentNames:['crop','context','highlight','default'],groupHash:dmgOrder,evidenceFragment:'objectReview.dmgNote',description:'The complete DMG p. 28 note was reviewed in bottom-left opening then top-right continuation order. This default assessment is specifically bound to the rule’s primary sourceContext route and full three-row catalog order; the old legacy region remains a separate singleton route.'}),
 visualReview({itemId:'weapon-versus-armor-adjustments',catalog:dmgCatalog,region:dmgContinuation,book:'DMG',page:28,assessmentNames:['crop','context','highlight'],evidenceFragment:'objectReview.dmgNote.visualReview',description:'The top-right continuation crop, source pixels, and focus overlay were independently reviewed as the continuation of the same DMG p. 28 passage.'}),
];

// Build every text delta in memory before touching tracked inputs.
let rulesText=read('rules.json').toString('utf8');
const currentRules=JSON.parse(rulesText);assert.equal(currentRules.rules.length,150);
assert(!currentRules.rules.some(r=>v4Records.some(n=>n.id===r.id)),'new table owner already exists');
const dmgBefore=currentRules.rules.find(r=>r.id==='weapon-versus-armor-adjustments');assert(dmgBefore);
assert(!Object.hasOwn(dmgBefore,'sourceContext'));
rulesText=addSourceContextToRules(rulesText);
rulesText=insertArrayItems(rulesText,'rules',v4Records,4);
const rulesAfter=JSON.parse(rulesText);
assert.equal(rulesAfter.rules.length,152);
for(const r of v4Records)assert.deepEqual(rulesAfter.rules.find(x=>x.id===r.id),r);
const dmgAfter=rulesAfter.rules.find(r=>r.id==='weapon-versus-armor-adjustments');
assert.deepEqual(dmgAfter.sourceContext,{book:'DMG',printedPage:28,regionId:'dmg-28-opening-8b67aa025e19eddd'});
const dmgOnly={...dmgAfter};delete dmgOnly.sourceContext;assert.deepEqual(dmgOnly,dmgBefore,'DMG rule content/status changed outside sourceContext');

let overridesText=read('citation-overrides.json').toString('utf8');
const phbExcerpt={collection:'rules',state:'source-excerpt-checked',catalog:'scans/verified/rules-phb-hurled-weapons-and-missiles-table.json',regionCount:phbCatalog.regions.length,scope:'The complete PHB p. 38 missile lookup context and printed source locations are checked. Row field targets remain pending and source values are not assessed by field-target review.'};
const uaExcerpt={collection:'rules',state:'source-excerpt-checked',catalog:'scans/verified/rules-ua-hurled-weapons-and-missiles-table.json',regionCount:uaCatalog.regions.length,scope:'The complete UA p. 28 missile lookup context and printed source locations are checked. Row/note field targets remain pending and source values are not assessed by field-target review.'};
const dmgScope='The DMG p. 28 weapon-versus-armor note is presented as the ordered bottom-left opening and top-right continuation. The existing legacy region remains unchanged as a separate historical singleton route. This source-excerpt scope does not verify field mappings or source values.';
const dmgKey='rules:weapon-versus-armor-adjustments';
const overridesAt=overridesText.indexOf(`${JSON.stringify(dmgKey)}:`);assert(overridesAt>=0);
const overrideRange=(()=>{const colon=overridesAt+JSON.stringify(dmgKey).length;let start=colon+1;while(/\s/.test(overridesText[start]||''))start++;const end=matchingClose(overridesText,start)+1;return {start,end};})();
let dmgOverride=JSON.parse(overridesText.slice(overrideRange.start,overrideRange.end));
assert.equal(dmgOverride.regionCount,1);assert.equal(dmgOverride.catalog,'scans/verified/rules-weapon-versus-armor-adjustments.json');
let dmgOverrideText=overridesText.slice(overrideRange.start,overrideRange.end);
const oldScope=JSON.stringify(dmgOverride.scope);
assert.equal(dmgOverrideText.split('"regionCount": 1').length,2);dmgOverrideText=dmgOverrideText.replace('"regionCount": 1','"regionCount": 3');
assert.equal(dmgOverrideText.split(`"scope": ${oldScope}`).length,2);dmgOverrideText=dmgOverrideText.replace(`"scope": ${oldScope}`,`"scope": ${JSON.stringify(dmgScope)}`);
overridesText=overridesText.slice(0,overrideRange.start)+dmgOverrideText+overridesText.slice(overrideRange.end);
const sourceMapStart=overridesText.indexOf('"sourceExcerpts": {');assert(sourceMapStart>=0);
const newOverrideEntries=[
 ['rules:phb-hurled-weapons-and-missiles-table',phbExcerpt],
 ['rules:ua-hurled-weapons-and-missiles-table',uaExcerpt],
];
for(const [key] of newOverrideEntries)assert(!overridesText.includes(`${JSON.stringify(key)}:`),`override already exists for ${key}`);
// insertObjectProps locates the sole root sourceExcerpts map before values are parsed.
const sourceMapValueStart=sourceMapStart+'"sourceExcerpts":'.length;
let sm=sourceMapValueStart;while(/\s/.test(overridesText[sm]||''))sm++;const smClose=matchingClose(overridesText,sm);
const sourceMapCloseLine=overridesText.lastIndexOf('\n',smClose-1);const sourceMapBefore=overridesText.slice(0,sourceMapCloseLine).trimEnd();
const addedOverrides=newOverrideEntries.map(([key,value])=>{
 const lines=JSON.stringify(value,null,2).split('\n');
 return `    ${JSON.stringify(key)}: ${lines[0]}${lines.slice(1).map(line=>`\n    ${line}`).join('')}`;
}).join(',\n');
overridesText=`${sourceMapBefore},\n${addedOverrides}${overridesText.slice(sourceMapCloseLine)}`;
const overridesAfter=JSON.parse(overridesText);
assert.equal(overridesAfter.sourceExcerpts['rules:weapon-versus-armor-adjustments'].regionCount,3);
assert.equal(overridesAfter.sourceExcerpts['rules:weapon-versus-armor-adjustments'].scope,dmgScope);
assert.deepEqual(overridesAfter.sourceExcerpts['rules:phb-hurled-weapons-and-missiles-table'],phbExcerpt);
assert.deepEqual(overridesAfter.sourceExcerpts['rules:ua-hurled-weapons-and-missiles-table'],uaExcerpt);

const continuationText=read('research/citation-continuations.json').toString('utf8');
const continuation=readJson('research/missile-table-discoverability/implementation-candidate/continuation-group-candidate.json');
const groups=JSON.parse(continuationText).groups;assert(!groups.some(g=>g.id===continuation.id));
const continuationAfter=insertArrayItems(continuationText,'groups',[continuation],4);
assert.equal(JSON.parse(continuationAfter).groups.length,groups.length+1);
assert.deepEqual(JSON.parse(continuationAfter).groups.at(-1),continuation);

const ledgerText=read('research/source-visual-reviews.json').toString('utf8');
const ledger=JSON.parse(ledgerText);const ids=new Set(ledger.reviews.map(r=>`${r.collection}:${r.itemId}:${r.binding}:${r.regionId}`));
for(const review of newReviews)assert(!ids.has(`${review.collection}:${review.itemId}:${review.binding}:${review.regionId}`),'visual review already exists');
const ledgerAfter=insertArrayItems(ledgerText,'reviews',newReviews,4);
assert.equal(JSON.parse(ledgerAfter).reviews.length,ledger.reviews.length+newReviews.length);
for(const review of newReviews)assert.deepEqual(JSON.parse(ledgerAfter).reviews.find(r=>r.itemId===review.itemId&&r.regionId===review.regionId),review);

const catalogs=[
 {source:`${V4}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`,target:'dist/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json'},
 {source:`${V4}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`,target:'dist/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json'},
 {source:`${V4}/catalogs/rules-weapon-versus-armor-adjustments-v2.json`,target:'dist/scans/verified/rules-weapon-versus-armor-adjustments.json'},
];
for(const row of catalogs){const b=read(row.source);const cat=JSON.parse(b);assert.equal(sha(b),expected[row.source]);assert.equal(sha(b),sha(Buffer.from(JSON.stringify(cat,null,2)+'\n')),'candidate catalog is expected canonical pretty JSON');row.bytes=b;}
const imageSource='research/missile-table-discoverability/implementation-candidate/catalogs/dmg-28-c37135485e89a720.png';
const imageBytes=read(imageSource);assert.equal(sha(imageBytes),'c37135485e89a720fb5bf4c410a0cd48e7a3f6ce069cd9f987c221c283ff14cf');
const allRegions=[...phbCatalog.regions,...uaCatalog.regions,...dmgCatalog.regions];
for(const region of allRegions){
 const existing=path.join(root,'dist/scans/verified',region.image);
 const bytes=region.image==='dmg-28-c37135485e89a720.png'?imageBytes:read(`dist/scans/verified/${region.image}`);
 assert.equal(sha(bytes),region.sha256,`image bytes mismatch ${region.id}`);
 if(region.image==='dmg-28-c37135485e89a720.png')assert(!existsSync(existing));
}

// Validate the exact patched application text before applying the source payload.
const patchPath=`${V4}/proposed-generic-source-context-routing-v2.patch`;
const appBefore=read('dist/app.js').toString('utf8');
const appAfter=execFileSync('patch',['--dry-run','--forward','-p1'],{cwd:root,input:read(patchPath),encoding:'utf8'});
assert.match(appAfter,/checking file dist\/app\.js/);

// All checks are complete. Copy only the approved source excerpt assets/catalogs and write authored sources.
for(const row of catalogs)write(row.target,row.bytes);
write('dist/scans/verified/dmg-28-c37135485e89a720.png',imageBytes);
write('rules.json',rulesText);
write('citation-overrides.json',overridesText);
write('research/citation-continuations.json',continuationAfter);
write('research/source-visual-reviews.json',ledgerAfter);
execFileSync('patch',['--forward','-p1'],{cwd:root,input:read(patchPath),stdio:['pipe','ignore','pipe']});
const appCurrent=read('dist/app.js').toString('utf8');
assert.notEqual(appCurrent,appBefore);
assert(appCurrent.includes('const tableContext=item.table?.sourceContext||item.sourceContext;'));
assert(appCurrent.includes('if(!fieldScoped&&!initialReference.region&&primarySourceContext'));
for(const p of ['dist/data.json','dist/source-continuations.json','dist/search.js','dist/source-viewer.js','tests/search-ranking.browser.mjs'])assertSha(p,expected[p]);

const after={
 'rules.json':sha(read('rules.json')),'citation-overrides.json':sha(read('citation-overrides.json')),
 'research/citation-continuations.json':sha(read('research/citation-continuations.json')),
 'research/source-visual-reviews.json':sha(read('research/source-visual-reviews.json')),
 'dist/app.js':sha(read('dist/app.js')),
 'dist/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json':sha(read('dist/scans/verified/rules-phb-hurled-weapons-and-missiles-table.json')),
 'dist/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json':sha(read('dist/scans/verified/rules-ua-hurled-weapons-and-missiles-table.json')),
 'dist/scans/verified/rules-weapon-versus-armor-adjustments.json':sha(read('dist/scans/verified/rules-weapon-versus-armor-adjustments.json')),
 'dist/scans/verified/dmg-28-c37135485e89a720.png':sha(read('dist/scans/verified/dmg-28-c37135485e89a720.png')),
 'dist/data.json':sha(read('dist/data.json')),'dist/source-continuations.json':sha(read('dist/source-continuations.json')),
};
const receipt={
 schemaVersion:1,artifactType:'missile-table-authored-source-activation-v1',status:'Authored source, excerpt, review, continuation source, and UI transport activation only. No assembly, compiled data/projection, grade promotion, commit, or push.',
 base:{commit,branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),preActivationHashes:expected},
 authority:{combinedIndependentReview:{path:reviewRef,sha256:sha(read(reviewRef))},v4Manifest:{path:`${V4}/production-metadata-v4-manifest.json`,sha256:sha(read(`${V4}/production-metadata-v4-manifest.json`))},routingPatch:{path:patchPath,sha256:sha(read(patchPath))}},
 activation:{newRuleOwners:v4Records.map(r=>({id:r.id,tableRows:r.table.rows.length,tableSourceContext:r.table.sourceContext})),existingDmgSourceContext:rulesAfter.rules.find(r=>r.id==='weapon-versus-armor-adjustments').sourceContext,catalogs:catalogs.map(row=>({path:row.target,sha256:sha(row.bytes),regionCount:JSON.parse(row.bytes).regions.length})),newLimitedImage:{path:'dist/scans/verified/dmg-28-c37135485e89a720.png',sha256:sha(imageBytes),bytes:imageBytes.length},continuationGroup:{id:continuation.id,path:'research/citation-continuations.json',sha256:sha(Buffer.from(JSON.stringify(continuation))),orderedRegionIds:continuation.requiredRegionIds},sourceExcerptOverrides:{newOwners:2,dmgLegacyRegionRetained:true,dmgRegionCount:3},visualReviewLedgerAdditions:newReviews.map(r=>({itemId:r.itemId,regionId:r.regionId,assessments:Object.keys(r.assessments),defaultOrderSha256:r.defaultOrderSha256||null,sourceSha256:r.sourceSha256,imageSha256:r.imageSha256,focusSha256:r.focusSha256,contentSha256:r.contentSha256})),groups:{phb38DefaultOrderSha256:phbOrder,ua28DefaultOrderSha256:uaOrder,dmg28PrimaryRouteOrderSha256:dmgOrder}},
 preservation:{rulesBeforeRecordCount:150,rulesAfterRecordCount:152,existingRulesDeepEqualExceptDmgSourceContext:true,dmgPriorRecordDeepEqualExceptAddedSourceContext:true,sourceRowsAndCells:555,evidenceBindings:50,fieldTargetPending:50,sourceValuesNotAssessed:50,allExistingDMGRegionObjectBytesPreserved:true,distDataSha256Before:expected['dist/data.json'],distDataSha256After:after['dist/data.json'],distSourceContinuationsSha256Before:expected['dist/source-continuations.json'],distSourceContinuationsSha256After:after['dist/source-continuations.json'],pr47AuthoredFourFileDeltaPreserved:{'dist/search.js':after['dist/search.js'],'dist/source-viewer.js':after['dist/source-viewer.js'],'tests/search-ranking.browser.mjs':after['tests/search-ranking.browser.mjs']}},
 afterHashes:after,
 validation:{candidateOfficialValidator:'passed before activation on cc950; V4 candidate: 52 catalog regions, 555 literal cells, 50 pending bindings, 50 unassessed source values',officialDmgCatalogSchema:'passed; exact accepted 3-property V2 DMG region metadata',sourcePageGroupHashes:{phb38:phbOrder,ua28:uaOrder,dmg28:dmgOrder},allCatalogImageBytesMatch:true,appPatchApplied:'exact V2 patch only, on top of preserved 4-file PR47-compatible UI/search delta'},
 deferred:{canonicalSemanticPointerTransport:'Pending root review of strict structured-fact constructor; do not assemble until that integration is ready.',compiledRuntimeProjection:'Not changed by authorization; dist/data.json and dist/source-continuations.json remain byte-identical to cc950.',fieldTargetMapping:'50 pending; no generated pointer prefill; no source-value/mechanics grades assigned.'}
};
write(`${OUT}/authored-activation-receipt-v1.json`,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({receipt:`${OUT}/authored-activation-receipt-v1.json`,afterHashes:after,owners:v4Records.map(r=>r.id),newReviews:newReviews.length,assets:catalogs.map(r=>r.target).concat(['dist/scans/verified/dmg-28-c37135485e89a720.png'])},null,2));
