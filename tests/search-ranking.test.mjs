import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const require=createRequire(import.meta.url);
const search=require('../dist/search.js');
const citations=require('../dist/citations.js');
const bytes=readFileSync(new URL('../dist/data.json',import.meta.url));
const data=JSON.parse(bytes);
const missingPagesBefore=JSON.parse(readFileSync(new URL('./fixtures/cleric-turning-citation-schema-before.json',import.meta.url),'utf8'));
const before=JSON.parse(readFileSync(new URL('./fixtures/search-ranking-before-ae5195a.json',import.meta.url),'utf8'));
const records=[
 ...data.spells.map(x=>({...x,_view:'spells',_title:x.name||x.title||'',_subtitle:`${(x.classes||[x.class]).filter(Boolean).join(' / ')} · Level ${x.level} · ${x.book}`})),
 ...data.rules.map(x=>({...x,_view:'rules',_title:x.title||'',_subtitle:`${x.category||'Rule'} · ${x.book}`})),
 ...data.equipment.map(x=>({...x,_view:'equipment',_title:x.name||'',_subtitle:`${x.category||'Equipment'} · ${x.book}`})),
 ...data.classes.map(x=>({...x,_view:'classes',_title:x.name||'',_subtitle:`Class & advancement · ${x.book}`})),
].map(search.prepare);
const ranked=query=>records.filter(item=>Number.isFinite(search.score(item,query))).sort((a,b)=>search.compare(a,b,query));

test('pre-change search rankings, index scope and visible cutoffs are preserved as a frozen baseline',()=>{
 assert.equal(before.schemaVersion,1);
 assert.equal(before.sourceCommit,'ae5195a2efe56f25fe9903f788a3c4c98b4e2064');
 assert.equal(before.dataSha256,'2b803d29cccd83ffd8418818abddf04b66204c82cebb8afba13f7a8226c6583c');
 assert.equal(data.spells.length,638);
 assert.ok(data.rules.length>=148,'source-verified additions may extend the current catalog');
 assert.deepEqual(Object.fromEntries(['equipment','classes'].map(key=>[key,data[key].length])),{equipment:191,classes:16});
 assert.equal(before.exposed.searchableCatalogRecords,993);
 assert.equal(before.exposed.searchableIncludingInlineProgression,995);
 assert.deepEqual(before.notIndexedExposedRecords,{matrices:1,progressionExplainer:1});
 assert.equal(before.queries['turn undead'].total,14);
 assert.equal(before.queries['turn undead'].first18[0].id,'ua-magic-user-alarm');
 assert.equal(before.queries['turn undead'].first18[0].routeHash,'#spells/ua-magic-user-alarm');
 assert.equal(before.queries['turn undead'].first18.at(-1).id,'turning-undead');
 assert.ok(before.queries.cure.total>18);
 assert.equal(before.queries.cure.first18.length,18);
});

test('turn undead ranks the current mixed-groups rule and Cleric guide ahead of incidental spell matches',()=>{
 const results=ranked('turn undead');
 const table=records.find(item=>item.id==='cleric-turning-table');
 assert.equal(results[0].id,table?'cleric-turning-table':'turning-undead');
 assert.equal(results[0]._view,'rules');
 assert.ok(results.some(item=>item.id==='cleric'));
 assert.ok(results.findIndex(item=>item.id==='turning-undead')<results.findIndex(item=>item.id==='ua-magic-user-alarm'));
 if(table)assert.equal(search.score(table,'turn undead'),1,'the explicit exact search alias must lead');
});

test('exact names and exact phrases outrank token-only and body-only matches',()=>{
 const fireball=ranked('fireball');
 assert.equal(fireball[0].id,'phb-magic-user-fireball');
 const missile=ranked('magic missile');
 assert.equal(missile[0].id,'phb-magic-user-magic-missile');
 assert.ok(missile[0]._name==='magic missile');
 assert.ok(missile.findIndex(item=>item._view==='rules')>0);
});

test('every query token must match a whole normalized word or a word prefix',()=>{
 const unrelated=search.prepare({_view:'rules',_title:'A return from the underworld',summary:'The dead wait nearby.'});
 assert.equal(search.score(unrelated,'turn undead'),Infinity);
 const matching=search.prepare({_view:'rules',_title:'Turning Undead'});
 assert.ok(Number.isFinite(search.score(matching,'turn undead')));
});

test('case, accents and punctuation normalize consistently with deterministic ties',()=>{
 const one=search.prepare({_view:'rules',id:'one',_title:'Café—Turn Undead'});
 const two=search.prepare({_view:'rules',id:'two',_title:'Cafe: Turn Undead'});
 assert.equal(search.score(one,'CAFE turn-undead'),search.score(two,'café turn undead'));
 assert.deepEqual([one,two].sort((a,b)=>search.compare(a,b,'cafe turn undead')).map(item=>item.id),['one','two']);
});

test('structured table values are searchable while citation and audit metadata remain excluded',()=>{
 const table=search.prepare({_view:'rules',id:'table',_title:'Cleric matrix',aliases:['turn undead','cleric table'],table:{columns:[{id:'turn',label:'Turn result'},{id:'type',label:'Undead type'}],rows:[{label:'Skeleton',sourceReference:{book:'DMG',pages:[75],sourceFocusId:'private-focus-a',evidenceBindings:[{collection:'rules',itemId:'table',catalog:'private-focus-clone.json',regionIds:['private-focus-clone']}]},cells:[{columnId:'turn',raw:'T',sourceFocusId:'private-focus-a'},{columnId:'type',raw:'Undead'}]}],symbols:[{symbol:'T',text:'turn result'}],sourceReferences:[{label:'hidden provenance phrase',imageSha256:'hidden-private-hash'}]}});
 assert.ok(Number.isFinite(search.score(table,'skeleton undead')));
 assert.ok(Number.isFinite(search.score(table,'turn result')));
 assert.equal(search.score(table,'cleric table'),1);
 assert.equal(search.score(table,'private focus'),Infinity);
 assert.equal(search.score(table,'private clone'),Infinity);
 assert.equal(search.score(table,'hidden provenance'),Infinity);
 const metadata=search.prepare({_view:'rules',id:'metadata',_title:'A rule',references:[{label:'hidden provenance phrase'}],evidenceBindings:{sha256:'privateprovenancephrase'}});
 assert.equal(search.score(metadata,'provenance phrase'),Infinity);
});

test('human field labels and values are searchable without indexing nested provenance',()=>{
 const attributes=search.prepare({_view:'spells',_title:'Attribute canary',fields:{'Saving throw':{value:'Negates','sourceSha256':'private-field-hash-canary',pages:[222],status:'private-field-status-canary',regionReviews:['private-field-review-canary'],privateProvenance:'private-provenance-canary',evidence:'private-evidence-canary'},'Damage':'1d6'}});
 assert.ok(Number.isFinite(search.score(attributes,'saving throw')),'the displayed Saving throw label is searchable');
 assert.ok(Number.isFinite(search.score(attributes,'negates')),'the displayed field value is searchable');
 assert.ok(Number.isFinite(search.score(attributes,'damage')),'other displayed field labels are searchable');
 for(const privateToken of ['private field hash canary','private field status canary','private field review canary','private provenance canary','private evidence canary','222'])assert.equal(search.score(attributes,privateToken),Infinity,`${privateToken} stays out of the searchable field text`);
});

test('authored class level-change text is indexed without nested citation metadata',()=>{
 const bard=data.classes.find(item=>item.id==='bard');
 assert.ok(bard);
 const prepared=search.prepare({...bard,_view:'classes',_title:bard.name,_subtitle:`Class & advancement · ${bard.book}`});
 assert.ok(Number.isFinite(search.score(prepared,'druidic tutelage')),'visible bard advancement guidance is discoverable from the class page');
 const isolated=search.prepare({_view:'classes',_title:'Change metadata canary',levelChanges:[{changes:['Silver ferret speaks softly.'],option:'Rare option',book:'PHB',pages:[222],status:'private-change-status-canary',privateProvenance:'private-change-provenance-canary',evidenceBindings:[{sourceObject:'private-change-evidence-canary',regionIds:['private-change-region-canary'],imageSha256:'private-change-hash-canary'}]}]});
 assert.ok(Number.isFinite(search.score(isolated,'silver ferret speaks')));
 assert.ok(Number.isFinite(search.score(isolated,'rare option')));
 for(const privateToken of ['private change status canary','private change provenance canary','private change evidence canary','private change region canary','private change hash canary','222'])assert.equal(search.score(isolated,privateToken),Infinity,`${privateToken} is not indexed from a nested level-change record`);
 const unrenderedNotes=search.prepare({_view:'classes',_title:'Notes are not rendered canary',attackTableNote:'unrendered attack note canary',retainedSkillsNote:'unrendered retained note canary'});
 assert.equal(search.score(unrenderedNotes,'unrendered attack note'),Infinity);
 assert.equal(search.score(unrenderedNotes,'unrendered retained note'),Infinity);
});

test('focused table source references retain the exact owner and clone region',()=>{
 const reference={book:'DMG',pages:[75],sourceFocusId:'skeleton-row-focus',evidenceBindings:[{collection:'rules',itemId:'cleric-turning-table',fieldPointer:'/table/rows/0',sourceObjectPointer:'/table/rows/0/sourceReference',sourceOwner:{collection:'rules',itemId:'cleric-turning-table'},book:'DMG',printedPage:75,pdfPage:76,sourcePages:[75],regionIds:['dmg-75-turning-skeleton-row'],catalog:'scans/verified/rules-cleric-turning-table.json',reviewStatus:'field-target-reviewed'}]};
 const targets=citations.targets(reference,'Skeleton row');
 assert.equal(targets.length,1);
 assert.equal(targets[0].book,'DMG');
 assert.equal(targets[0].page,75);
 assert.deepEqual(targets[0].regionIds,['dmg-75-turning-skeleton-row']);
 assert.deepEqual(targets[0].fieldOwner,{collection:'rules',itemId:'cleric-turning-table'});
 assert.deepEqual(targets[0].sourceOwner,{collection:'rules',itemId:'cleric-turning-table'});
 assert.equal(targets[0].fieldPointer,'/table/rows/0');
 assert.deepEqual(targets[0].sourcePages,[75]);
 const pageOnly={...reference,evidenceBindings:[]};
 assert.equal(citations.targets(pageOnly).some(target=>target.fieldPointer),false,'a page-only reference cannot become a fact-level binding');
});

test('assembled turning-table facts use the real printedPage/sourcePages binding schema',()=>{
 const table=records.find(item=>item.id==='cleric-turning-table');
 assert.ok(table,'the approved table is present in the assembled source data');
 assert.match(missingPagesBefore.capturedFrom.dataSha256,/^[a-f0-9]{64}$/,'the fixture keeps the exact historical input identity');
 assert.equal(missingPagesBefore.preFixHelper.legacyRequirement,'binding.pages must be an array of one page matching reference page');
 const facts=[...table.table.rows,...table.table.symbols,...table.table.procedure,...table.table.footnotes,table.table.progressionNote];
 assert.equal(facts.length,32);
 for(const fact of facts){
  const reference=fact.sourceReference;
  assert.ok(reference?.sourceFocusId,'every displayed fact carries one precise source-focus id');
  assert.equal(reference.evidenceBindings.length,1);
  const binding=reference.evidenceBindings[0];
  assert.equal(Object.hasOwn(binding,'pages'),false,'the actual schema does not require a binding.pages property');
  assert.ok(Array.isArray(binding.sourcePages)&&binding.sourcePages.includes(binding.printedPage));
  assert.deepEqual(reference.pages,[binding.printedPage]);
  assert.deepEqual(binding.sourceOwner,{collection:'rules',itemId:table.id});
  const [target]=citations.targets(reference);
  assert.ok(target,'the current citation API resolves the real binding shape');
  assert.equal(target.book,'DMG');
  assert.equal(target.page,binding.printedPage);
  assert.equal(target.pdfPage,binding.pdfPage);
  assert.equal(target.fieldOwner?.collection,'rules');
  assert.equal(target.fieldOwner?.itemId,table.id);
  assert.equal(target.sourceOwner?.collection,'rules');
  assert.equal(target.sourceOwner?.itemId,table.id);
  assert.deepEqual(target.regionIds,binding.regionIds);
  assert.equal(target.fieldPointer,binding.fieldPointer);
 }
 const actualFirstBinding=table.table.rows[0].sourceReference.evidenceBindings[0];
 const targetProjection=binding=>({book:binding.book,printedPage:binding.printedPage,pdfPage:binding.pdfPage,sourcePages:binding.sourcePages,regionIds:binding.regionIds,collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,sourceOwner:binding.sourceOwner});
 assert.deepEqual(targetProjection(actualFirstBinding),missingPagesBefore.expectedNormalizedTarget,'the current real row remains linked to the same exact page, owner, pointer, and region from the historical fixture');
 assert.equal(Object.hasOwn(actualFirstBinding,'pages'),false);
 assert.deepEqual(missingPagesBefore.expectedNormalizedTarget.sourcePages,[75]);
 assert.equal(missingPagesBefore.actualBinding.pages,undefined,'the preserved historical binding has no binding.pages property');
});
