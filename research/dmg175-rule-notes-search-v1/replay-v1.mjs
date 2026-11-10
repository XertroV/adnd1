#!/usr/bin/env node
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {resolve} from 'node:path';

const repo=resolve(process.argv[2]||'/workspace/adnd1-next-source-native');
const require=createRequire(import.meta.url);
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=path=>readFileSync(resolve(repo,path));
const actualSearch=require(resolve(repo,'dist/search.js'));
const dataBytes=read('dist/data.json');
const data=JSON.parse(dataBytes);
const dataValueHashBefore=sha(JSON.stringify(data));
const beforeSearchBytes=readFileSync(resolve(repo,'research/dmg175-notes-searchability-before-v1/search-before-v1.js.gz'));
const candidateBytes=readFileSync(resolve(repo,'research/dmg175-notes-searchability-before-v1/search-with-public-rule-notes-candidate-v1.js'));
const candidateRecord=JSON.parse(read('research/dmg175-notes-searchability-before-v1/candidate-replay-v1.json'));
const inventory=JSON.parse(read('research/dmg175-notes-searchability-before-v1/inventory-v1.json'));
const qualification=JSON.parse(read('research/source-audit-pass8-dmg175-excluded-note-field-count-qualification-v1.json'));
const historicalQueryFixture=JSON.parse(read('tests/fixtures/search-ranking-before-ae5195a.json'));
const books=require(resolve(repo,'dist/books.js'));
const candidateContext={module:{exports:{}},globalThis:null};
candidateContext.globalThis=candidateContext;
runInNewContext(candidateBytes.toString('utf8'),candidateContext,{filename:'search-with-public-rule-notes-candidate-v1.js'});
const candidateSearch=candidateContext.module.exports;
const coreHashes={
 currentSearch:sha(read('dist/search.js')),
 app:sha(read('dist/app.js')),
 beforeSearch:sha(beforeSearchBytes),
 candidateSearch:sha(candidateBytes),
 data:sha(dataBytes),
 inventory:sha(read('research/dmg175-notes-searchability-before-v1/inventory-v1.json')),
};

// Mirror the production buildIndex projection and the production search API.
function classesOf(item){return Array.isArray(item.classes)&&item.classes.length?item.classes:Array.isArray(item.class)?item.class:item.class?[item.class]:[];}
function classText(item){return classesOf(item).join(' / ')||'Class not yet extracted';}
function levelText(item){return item.level===undefined||item.level===null||item.level===''?'Level not yet extracted':`Level ${item.level}`;}
function knownPrice(item){const p=item.price;return p!==null&&typeof p==='object'&&typeof p.amount==='number'&&Number.isFinite(p.amount)&&p.amount>=0&&typeof p.currency==='string'&&Boolean(p.currency.trim());}
function suggestedPrice(item){const p=item.suggestedPrice;return !knownPrice(item)&&!!p&&typeof p.amount==='number'&&Number.isFinite(p.amount)&&p.amount>=0&&typeof p.currency==='string'&&!!p.currency.trim()&&typeof p.unit==='string'&&!!p.unit.trim();}
function equipmentPriceLabel(item){
 if(knownPrice(item))return `${['estimate','estimated'].includes(item.priceState)?'Estimate · ':''}${item.price.amount.toLocaleString()} ${item.price.currency}${item.price.unit?` / ${item.price.unit}`:''}`;
 if(suggestedPrice(item)){const p=item.suggestedPrice;return `Suggested (estimate): ${p.amount.toLocaleString()} ${p.currency} / ${p.unit}`;}
 return item.priceState==='not_listed'?'Not listed in source':'Price not extracted';
}
function makeAppIndex(search){
 const matrixConflictGuideLabel=matrix=>{
  const guideId=matrix?.sourceConflict?.relatedClassGuideId;
  if(typeof guideId!=='string')return '';
  const guide=(data.classes||[]).find(item=>item?.id===guideId);
  const name=guide?.name||guide?.title||guide?.id;
  return typeof name==='string'&&name.trim()?`Open ${name} class guide`:'';
 };
 return [
  ...data.spells.map(x=>({...x,_view:'spells',_title:x.name||x.title||'',_subtitle:`${classText(x)} · ${levelText(x)} · ${books.code(x.book)}`})),
  ...data.rules.map(x=>({...x,_view:'rules',_title:x.title||'',_subtitle:`${x.category||'Rule'} · ${books.code(x.book)}`})),
  ...data.equipment.map(x=>({...x,_view:'equipment',_title:x.name||'',_subtitle:`${x.category||'Equipment'} · ${equipmentPriceLabel(x)} · ${books.code(x.book)}`})),
  ...data.classes.map(x=>({...x,_view:'classes',_title:x.name||'',_subtitle:`Class & advancement · ${books.code(x.book)}`})),
  ...data.matrices.map(x=>({...x,_view:'matrices',_title:x.title||x.name||'',_subtitle:`${books.code(x.book)} · Combat matrix`,_sourceConflictClassGuideLabel:matrixConflictGuideLabel(x)})),
  ...(data.progressionExplainer?[{...data.progressionExplainer,_view:'progressionExplainer',_title:data.progressionExplainer.title||'Class progression paths',_subtitle:'Class progression reference'}]:[]),
 ].map(x=>search.prepare({...x,_bookName:books.title(x.book)}));
}
const actualDocs=makeAppIndex(actualSearch),candidateDocs=makeAppIndex(candidateSearch);
const ownerKey=x=>`${x._view}:${x.id}`;
const actualById=new Map(actualDocs.map(x=>[ownerKey(x),x]));
const candidateById=new Map(candidateDocs.map(x=>[ownerKey(x),x]));
function hasDetails(item){return Object.keys(item.fields||{}).length>0||(Array.isArray(item.effect)&&item.effect.length>0);}
function ranked(docs,search,query){
 return docs.filter(item=>Number.isFinite(search.score(item,query))).sort((a,b)=>{
  const q=search.normalize(query),score=item=>q?search.score(item,query):(item._view==='spells'&&hasDetails(item)?0:1);
  return score(a)-score(b)||Number(hasDetails(b))-Number(hasDetails(a))||search.compare(a,b,query);
 });
}
const countSummary={
 owners:Object.fromEntries(['spells','rules','equipment','classes','matrices'].map(k=>[k,data[k].length]).concat([['progressionExplainer',data.progressionExplainer?1:0]])),
 totalOwners:actualDocs.length,
 uniqueOwnerKeys:new Set(actualDocs.map(ownerKey)).size,
 nonemptyNotesOwners:[...['spells','rules','equipment','classes','matrices'].flatMap(collection=>data[collection].filter(item=>typeof item.notes==='string'?Boolean(item.notes.trim()):Array.isArray(item.notes)&&item.notes.some(v=>typeof v==='string'&&v.trim())).map(item=>`${collection}:${item.id}`)),...(data.progressionExplainer&&Array.isArray(data.progressionExplainer.notes)&&data.progressionExplainer.notes.some(v=>typeof v==='string'&&v.trim())?[`progressionExplainer:${data.progressionExplainer.id}`]:[])],
 stringNotesCount:[...['spells','rules','equipment','classes','matrices'].flatMap(collection=>data[collection].flatMap(item=>typeof item.notes==='string'&&item.notes.trim()?[{collection,id:item.id,text:item.notes}]:Array.isArray(item.notes)?item.notes.filter(v=>typeof v==='string'&&v.trim()).map(text=>({collection,id:item.id,text})):[])),...(data.progressionExplainer&&Array.isArray(data.progressionExplainer.notes)?data.progressionExplainer.notes.filter(v=>typeof v==='string'&&v.trim()).map(text=>({collection:'progressionExplainer',id:data.progressionExplainer.id,text})):[])].length,
 topLevelRuleNoteOwners:data.rules.filter(item=>typeof item.notes==='string'&&item.notes.trim()).map(item=>item.id),
};
const excludedNotes=JSON.parse(read('research/source-audit-pass8-dmg175-excluded-note-field-count-qualification-v1.json'));
const expectedRuleNotes=excludedNotes.currentNewRuleOwnersWithTopLevelNotes;
const actualInventoryRows=[...['spells','rules','equipment','classes','matrices'].flatMap(collection=>data[collection].flatMap(item=>typeof item.notes==='string'&&item.notes.trim()?[{collection,itemId:item.id,fieldPointer:'/notes',text:item.notes}]:Array.isArray(item.notes)?item.notes.flatMap((text,index)=>typeof text==='string'&&text.trim()?[{collection,itemId:item.id,fieldPointer:`/notes/${index}`,text}]:[]):[])),...(data.progressionExplainer&&typeof data.progressionExplainer.notes==='string'&&data.progressionExplainer.notes.trim()?[{collection:'progressionExplainer',itemId:data.progressionExplainer.id,fieldPointer:'/notes',text:data.progressionExplainer.notes}]:[])].map(row=>{
 const doc=actualById.get(`${row.collection}:${row.itemId}`),normalized=actualSearch.normalize(row.text);
 const score=actualSearch.score(doc,row.text);
 return {...row,textSha256:sha(row.text),normalizedLength:normalized.length,normalizedPhraseInOwnDocument:doc._search.includes(normalized),fullNoteSearchFinite:Number.isFinite(score),fullNoteSearchScore:Number.isFinite(score)?score:null};
});
const inventoryRowKey=row=>`${row.collection}:${row.itemId}:${row.fieldPointer}`;
const archivedInventoryRows=new Map(inventory.rows.map(row=>[inventoryRowKey(row),row]));
const observedInventoryRows=new Map(actualInventoryRows.map(row=>[inventoryRowKey(row),row]));
const inventoryMismatches=[...new Set([...archivedInventoryRows.keys(),...observedInventoryRows.keys()])].flatMap(key=>{
 const a=archivedInventoryRows.get(key),b=observedInventoryRows.get(key);
 if(!a||!b)return [{key,missingFromArchived:!a,missingFromObserved:!b}];
 const fields=['textSha256','normalizedLength','normalizedPhraseInOwnDocument','fullNoteSearchFinite','fullNoteSearchScore'];
 const changes=fields.filter(field=>a[field]!==b[field]).map(field=>({field,archived:a[field],observed:b[field]}));
 return changes.length?[{key,changes}]:[];
});
const inventoryParity={archivedRows:inventory.rows.length,observedRows:actualInventoryRows.length,archivedOwners:inventory.counts.ownersWithTopLevelNotes,observedOwners:new Set(actualInventoryRows.map(row=>`${row.collection}:${row.itemId}`)).size,exactParity:inventoryMismatches.length===0,mismatches:inventoryMismatches};
const actualRuleNotes=data.rules.filter(item=>typeof item.notes==='string'&&item.notes.trim()).map(item=>item.id);
const noteRows=expectedRuleNotes.map(id=>{
 const raw=data.rules.find(item=>item.id===id);
 const actual=actualById.get(`rules:${id}`),candidate=candidateById.get(`rules:${id}`);
 const noteSha=sha(raw.notes);
 return {
  itemId:id,noteSha256:noteSha,
  beforePhrasePresent:actual._search.includes(actualSearch.normalize(raw.notes)),
  afterPhrasePresent:candidate._search.includes(candidateSearch.normalize(raw.notes)),
  beforeScore:actualSearch.score(actual,raw.notes),afterScore:candidateSearch.score(candidate,raw.notes),
  beforeFinite:Number.isFinite(actualSearch.score(actual,raw.notes)),afterFinite:Number.isFinite(candidateSearch.score(candidate,raw.notes)),
  beforeQueryMatches:ranked(actualDocs,actualSearch,raw.notes).map(ownerKey),afterQueryMatches:ranked(candidateDocs,candidateSearch,raw.notes).map(ownerKey),
  candidatePhraseOccurrenceCount:candidate._search.split(candidateSearch.normalize(raw.notes)).length-1,
 };
});
const actualGoldenRows=Object.entries(historicalQueryFixture.queries).map(([query,historical])=>{
 const before=ranked(actualDocs,actualSearch,query),after=ranked(candidateDocs,candidateSearch,query);
 const beforeKeys=before.map(ownerKey),afterKeys=after.map(ownerKey);
 const beforeMap=new Map(before.map(item=>[ownerKey(item),actualSearch.score(item,query)]));
 const afterMap=new Map(after.map(item=>[ownerKey(item),candidateSearch.score(item,query)]));
 const union=[...new Set([...beforeKeys,...afterKeys])];
 return {
  query,historicalBaselineTotal:historical.total,
  currentBeforeTotal:before.length,candidateAfterTotal:after.length,
  added:afterKeys.filter(k=>!beforeMap.has(k)),removed:beforeKeys.filter(k=>!afterMap.has(k)),
  commonScoreChanges:union.filter(k=>beforeMap.has(k)&&afterMap.has(k)&&beforeMap.get(k)!==afterMap.get(k)).map(k=>({owner:k,before:beforeMap.get(k),after:afterMap.get(k)})),
  top18Before:beforeKeys.slice(0,18),top18After:afterKeys.slice(0,18),top18Changed:JSON.stringify(beforeKeys.slice(0,18))!==JSON.stringify(afterKeys.slice(0,18)),
 };
});
const controls=[
 {id:'public-rule-string',item:{_view:'rules',id:'control-rule-string',_title:'',notes:'Public rule note string sentinel amber'},query:'public rule note string sentinel',expectedFinite:true},
 {id:'public-rule-array',item:{_view:'rules',id:'control-rule-array',_title:'',notes:['Public rule note array sentinel cobalt']},query:'public rule note array sentinel',expectedFinite:true},
 {id:'object-notes-not-extracted',item:{_view:'rules',id:'control-object-note',_title:'',notes:[{text:'private object note sentinel'}]},query:'private object note sentinel',expectedFinite:false},
 {id:'future-review-field-not-extracted',item:{_view:'rules',id:'control-future-review',_title:'',reviewNotes:'future review field sentinel'},query:'future review field sentinel',expectedFinite:false},
 {id:'other-view-notes-not-extracted',item:{_view:'classes',id:'control-other-view',_title:'',notes:'unobserved class notes sentinel'},query:'unobserved class notes sentinel',expectedFinite:false},
].map(c=>{
 const before=actualSearch.score(actualSearch.prepare(c.item),c.query),after=candidateSearch.score(candidateSearch.prepare(c.item),c.query);
 return {id:c.id,expectedFinite:c.expectedFinite,beforeFinite:Number.isFinite(before),afterFinite:Number.isFinite(after),passed:Number.isFinite(after)===c.expectedFinite};
});
const sourceMatrices=data.matrices.filter(item=>Array.isArray(item.notes));
const matrixIbn=data.matrices.find(item=>item.id==='dmg-original-fighter-attack-matrix');
const matrixActual=actualById.get(`matrices:${matrixIbn.id}`),matrixCandidate=candidateById.get(`matrices:${matrixIbn.id}`);
const ibQuery=matrixIbn.notes[0];
const ibDiagnostic={itemId:matrixIbn.id,query:ibQuery,actualFinite:Number.isFinite(actualSearch.score(matrixActual,ibQuery)),candidateFinite:Number.isFinite(candidateSearch.score(matrixCandidate,ibQuery)),actualScore:actualSearch.score(matrixActual,ibQuery),candidateScore:candidateSearch.score(matrixCandidate,ibQuery),normalization:actualSearch.normalize(ibQuery)};
const identityUnchanged=actualDocs.length===candidateDocs.length&&actualDocs.every((item,i)=>ownerKey(item)===ownerKey(candidateDocs[i]))&&new Set(candidateDocs.map(ownerKey)).size===candidateDocs.length;
const changedSearchBodies=actualDocs.filter(item=>item._search!==candidateById.get(ownerKey(item))._search).map(item=>ownerKey(item));
const expectedChangedBodies=expectedRuleNotes.map(id=>`rules:${id}`).sort();
const unexpectedChangedBodies=changedSearchBodies.filter(id=>!expectedChangedBodies.includes(id));
const missingChangedBodies=expectedChangedBodies.filter(id=>!changedSearchBodies.includes(id));
const evidence={
 schemaVersion:1,artifactType:'read-only independent production search replay',worktreeHead:'987a25d3ba2dcac0940569a2afab73f775e38028',
 sourceHashes:{...coreHashes,expectedCandidate:candidateRecord.candidateSha256,expectedSourceData:candidateRecord.sourceDataSha256,expectedSearchBefore:candidateRecord.beforeSearchSha256},
 hashMatches:{actualSearchIsRecordedBefore:coreHashes.currentSearch===candidateRecord.beforeSearchSha256,sourceDataMatches:coreHashes.data===candidateRecord.sourceDataSha256,candidateMatchesRecord:coreHashes.candidateSearch===candidateRecord.candidateSha256,inventoryMatchesParentReported:coreHashes.inventory==='dd550c1adb5312444c205b3d064e5581f39f74682531cc321f308b7d3468708a',inventoryDataMatches:coreHashes.data===inventory.dataSha256,inventorySearchMatches:coreHashes.currentSearch===inventory.searchSha256,inventoryAppMatches:coreHashes.app===inventory.appSha256},
 counts:countSummary,inventoryParity,qualifiedNoteCount:{fieldCount:qualification.topLevelNoteFields,formalMechanicsEnumerator:qualification.formalMechanicsEnumerator,formalFieldDeltaUnchanged:qualification.formalFieldDeltaUnchanged,qualification:qualification.qualification},
 expectedNewRuleNoteIds:expectedRuleNotes,actualNewRuleNoteIds:actualRuleNotes,fullNewRuleNoteChecks:noteRows,
 frozenGoldenQueryCorpus:{fixture:'tests/fixtures/search-ranking-before-ae5195a.json',sourceCommit:historicalQueryFixture.sourceCommit,queryCount:actualGoldenRows.length,currentBeforeVsCandidate:actualGoldenRows},
 controls,identityUnchanged,changedSearchBodies,expectedChangedBodies,unexpectedChangedBodies,missingChangedBodies,
 matrixIBSeparateDiagnostic:ibDiagnostic,
 exclusions:{candidateTouchesSourceData:false,sourceGradeChanges:qualification.sourceValueGradeChanges,extraOwnerRecords:false,notesOnlyRulesView:true,structuredNoteObjectsExcluded:true,futureReviewFieldExcluded:true},
};
const dataValueHashAfter=sha(JSON.stringify(data));
evidence.dataValueHashBefore=dataValueHashBefore;evidence.dataValueHashAfter=dataValueHashAfter;evidence.dataValueHashUnchanged=dataValueHashBefore===dataValueHashAfter;
const output=resolve('/workspace/research/dmg175-notes-search-next-review-v1/production-replay-v1.json');
writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({output,hashMatches:evidence.hashMatches,counts:evidence.counts,inventoryParity:evidence.inventoryParity,notes:noteRows,queryDeltas:actualGoldenRows.map(({query,currentBeforeTotal,candidateAfterTotal,added,removed,commonScoreChanges,top18Changed})=>({query,currentBeforeTotal,candidateAfterTotal,added,removed,commonScoreChanges,top18Changed})),controls,identityUnchanged,changedSearchBodies,expectedChangedBodies,unexpectedChangedBodies,missingChangedBodies,matrixIBSeparateDiagnostic:ibDiagnostic},null,2));
