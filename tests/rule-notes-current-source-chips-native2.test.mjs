// Executes actual deployed search, app chip/renderer bodies, Books and Citations.
// DOM event transport is unnecessary for these pure render/source-target checks.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {nativeSnapshot,assertNativeBodyUnchanged,readBytes,sha} from './helpers/native2-production-semantic-backend-v1.mjs';
const require=createRequire(import.meta.url),search=require('../dist/search.js'),books=require('../dist/books.js'),citations=require('../dist/citations.js');
const native=nativeSnapshot(),data=native.inputs.data,appBytes=readBytes('dist/app.js'),app=appBytes.toString('utf8');
assert.equal(sha(appBytes),native.inputHashes.sourceBody['dist/app.js']);
const acornModule={exports:{}};runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{module:acornModule,exports:acornModule.exports});
const ast=acornModule.exports.parse(app,{ecmaVersion:'latest'}),iife=ast.body.find(n=>n.type==='ExpressionStatement'&&n.expression.type==='CallExpression'&&n.expression.callee.body?.type==='BlockStatement');
assert.ok(iife,'actual app IIFE exists');const nodes=iife.expression.callee.body.body;
const names=['bookCode','pagesFor','recordsForView','recordForView','routeFieldTargetDisplayLabel','inlineSourceChip','displaySourceValue','tableSourcePointerValue','validRuleTableSourceLocation','supplementalBindingRegionEvidence','sameRect','reviewedPartyMagicRowLocation','exactSupplementalTableFactSourceReference','exactPendingPdfTableFactSourceReference','exactLegacyTableFactSourceReference','exactPendingClassMappingTableFactSourceReference','exactTableFactSourceReference','exactPendingPdfHirelingFieldSourceReferences','exactPendingPdfSourceNoteReferences','tableFactSourceChip','flatSourceTableGrid','ruleTableHTML'];
const selected=names.map(name=>{const node=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(node,'actual production function '+name);return app.slice(node.start,node.end);});
for(const name of ['escapeHTML','esc','PARTY_MAGIC_LOCATION_REVIEW_PATH','PARTY_MAGIC_LOCATION_REVIEW_SHA256']){const node=nodes.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));assert.ok(node,'actual production declaration '+name);selected.push(app.slice(node.start,node.end));}
const ui=new Function('data','FirstEditionBooks','FirstEditionCitations',selected.join('\n')+'\nreturn {ruleTableHTML,tableFactSourceChip,exactTableFactSourceReference};')(data,books,citations);
const expectedNotes=new Map([
 ['appendix-c-character-subtable','c73e3249a9c1454dbfb356063e7e97267611eadcf342a406789c4d820908ce29'],
 ['appendix-c-henchmen','81caa1ea424a2174d76fe061cdd0e111ca2bd1a7f717f7aa70dd72dabba84718'],
 ['appendix-c-party-magic-distribution','4a74926c064ec70e418e8e012ba3acbbd2c3753bd521471130f9df43c0f4eef3'],
 ['appendix-c-magic-table-ii','cf77aa4bb4df10c6c28a9b3994e9a893c5fc44e85dbc7d692b6517caca9ef12b'],
 ['appendix-c-magic-table-iii','cf77aa4bb4df10c6c28a9b3994e9a893c5fc44e85dbc7d692b6517caca9ef12b'],
]);
const docs=data.rules.map(x=>search.prepare({...x,_view:'rules',_title:x.title||''}));
const unescape=s=>s.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
function targets(html){const m=/data-ref-targets="([^"]*)"/.exec(html);assert.ok(m,'actual source chip contains structured targets');return JSON.parse(unescape(m[1]));}
after(()=>assertNativeBodyUnchanged());

test('Appendix C authored notes remain byte-identical, searchable once, and attached to exact rule owners',()=>{
 const rows=data.rules.filter(x=>x.id.startsWith('appendix-c-')&&typeof x.notes==='string'&&x.notes.trim());assert.deepEqual(rows.map(x=>x.id),[...expectedNotes.keys()]);
 for(const x of rows){const d=docs.find(r=>r.id===x.id);assert.equal(sha(Buffer.from(x.notes)),expectedNotes.get(x.id));assert.ok(d._search.includes(search.normalize(x.notes)));assert.ok(Number.isFinite(search.score(d,x.notes)));assert.equal(d._search.split(search.normalize(x.notes)).length-1,1);}
 const shared=data.rules.find(x=>x.id==='appendix-c-magic-table-ii').notes;
 assert.deepEqual(docs.filter(x=>Number.isFinite(search.score(x,shared))).map(x=>x.id),['appendix-c-magic-table-ii','appendix-c-magic-table-iii']);
});

test('MM authored note and public rule-note type/view boundaries retain actual search semantics',()=>{
 assert.equal(native.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');assert.equal(native.summary.owners,1070);
 const x=data.rules.find(x=>x.id==='mm-treasure-types-table'),d=docs.find(r=>r.id===x.id);assert.equal(sha(Buffer.from(x.notes)),'9a6e1cbb057cb332d4a6c297f09dd905de04edda1737df3e02994fff9b8483d7');
 assert.ok(d._search.includes(search.normalize(x.notes)));assert.ok(Number.isFinite(search.score(d,'pieces per individual')));
 const array=search.prepare({_view:'rules',_title:'',notes:['Public rule array canary',{text:'Object note canary'}]});assert.ok(Number.isFinite(search.score(array,'public rule array canary')));assert.equal(search.score(array,'object note canary'),Infinity);
 assert.equal(search.score(search.prepare({_view:'rules',_title:'',reviewNotes:'Future review canary'}),'future review canary'),Infinity);
 assert.equal(search.score(search.prepare({_view:'classes',_title:'',notes:'Class note canary'}),'class note canary'),Infinity);
});

test('actual source-note chips retain structured page/owner/pointer joins and pending grades',()=>{
 const owners=['racial-ability-adjustments','phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table','ua-cavalier-xp-table-i','ua-druid-xp-table-i','dmg-hireling-table-t01','dmg-hireling-table-t06'];
 for(const id of owners){const item=data.rules.find(x=>x.id===id);assert.ok(item);
  for(const[index,note]of item.table.sourceNotes.entries()){
   const before=JSON.stringify(note),html=ui.tableFactSourceChip(item,note,item.title+' source note','table-note-source');assert.match(html,/data-inline-source/,id+' note '+index);
   const actual=targets(html),expected=citations.targets(note.sourceReference,item.title+' source note');assert.ok(actual.length>0);
   for(const target of actual){assert.equal(target.fieldOwner.collection,'rules');assert.equal(target.fieldOwner.itemId,id);assert.equal(target.fieldPointer,'/table/sourceNotes/'+index);assert.equal(target.sourceOwner.itemId,id);assert.ok(expected.some(x=>x.book===target.book&&x.page===target.page&&x.fieldPointer===target.fieldPointer));assert.equal(target.targetStatus,'pending');assert.equal(target.contextStatus,'context-not-assessed');}
   assert.equal(JSON.stringify(note),before,'rendering changes no evidence or grades');
  }
 }
});

test('real source-note renderer preserves distinct headings, authored text and HTML escaping',()=>{
 const item=data.rules.find(x=>x.id==='phb-hurled-weapons-and-missiles-table'),html=ui.ruleTableHTML(item);
 assert.match(html,/<h3>Source notes and Armor Class column key<\/h3>/);assert.match(html,/class="source-table-notes"/);assert.match(html,/table-note-source/);
 for(const note of item.table.sourceNotes)assert.ok(html.includes(String(note.text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));
 const synthetic={id:'test-unbound-note',title:'Test',table:{columns:[],rows:[],sourceNotesTitle:'<unsafe>',sourceNotes:[{text:'<script>note</script>'}]}};
 const escaped=ui.ruleTableHTML(synthetic);assert.match(escaped,/&lt;unsafe&gt;/);assert.match(escaped,/&lt;script&gt;note&lt;\/script&gt;/);assert.doesNotMatch(escaped,/<script>/);assert.match(escaped,/Exact source focus unavailable/);assert.doesNotMatch(escaped,/data-inline-source/);
});

test('PHB page guards and dedicated hireling-note membership joins reject malformed references',()=>{
 const original=data.rules.find(x=>x.id==='racial-ability-adjustments'),hireling=data.rules.find(x=>x.id==='dmg-hireling-table-t01');
 for(const[label,mutate]of [
  ['zero PDF',r=>r.table.sourceNotes[0].sourceReference.evidenceBindings[0].pdfPage=0],
  ['string PDF',r=>r.table.sourceNotes[0].sourceReference.evidenceBindings[0].pdfPage=String(r.table.sourceNotes[0].sourceReference.evidenceBindings[0].pdfPage)],
  ['null PDF',r=>r.table.sourceNotes[0].sourceReference.evidenceBindings[0].pdfPage=null],
  ['wrong field',r=>r.table.sourceNotes[0].sourceReference.evidenceBindings[0].fieldPointer='/table/sourceNotes/1'],
  ['wrong owner',r=>r.table.sourceNotes[0].sourceReference.evidenceBindings[0].sourceOwner.itemId='different-owner'],
  ['invented review',r=>r.table.sourceNotes[0].sourceReference.evidenceBindings[0].reviewStatus='field-target-reviewed'],
  ['duplicate member',r=>r.table.sourceNotes.push(r.table.sourceNotes[0])],
 ]){const item=structuredClone(label.includes('PDF')?original:hireling);mutate(item);const html=ui.tableFactSourceChip(item,item.table.sourceNotes[0],label,'table-note-source');assert.match(html,/Exact source focus unavailable/,label);assert.doesNotMatch(html,/data-inline-source/,label);}
 const detached=structuredClone(hireling.table.sourceNotes[0]);assert.match(ui.tableFactSourceChip(hireling,detached,'detached','table-note-source'),/Exact source focus unavailable/);
});

test('predecessor ordinary table rendering remains byte-identical with actual helpers',()=>{
 const before=JSON.parse(readBytes('research/missile-table-discoverability/implementation-candidate/renderer-before.json'));
 const helpers=selected.filter(source=>!source.startsWith('function ruleTableHTML('));
 const old=new Function('data','FirstEditionBooks','FirstEditionCitations',helpers.join('\n')+'\n'+before.functionText+'\nreturn ruleTableHTML;')(data,books,citations);
 const item={id:'table-fixture',category:'Combat',title:'Table fixture',sourceReferences:[],table:{title:'Table fixture',rowHeader:{label:'Weapon'},columnGroup:{label:'Armor Class'},columns:[{id:'ac-2',label:'2'}],rows:[],symbols:[],procedure:[],footnotes:[],sourceReferences:[]}};
 assert.equal(ui.ruleTableHTML(item),old(item));
});

test('explicit source-note heading and unbound guidance retain predecessor rendering roles',()=>{
 const item=structuredClone(data.rules.find(x=>x.id==='phb-hurled-weapons-and-missiles-table'));
 item.table.rows=[];item.table.symbols=[];item.table.procedure=[];item.table.footnotes=[];item.table.sourceNotesTitle='Armor Class column key';item.table.sourceNotes=[item.table.sourceNotes[0]];item.table.sourceNotes[0].text='Leather or padded armor: AC 8';
 const html=ui.ruleTableHTML(item);assert.match(html,/<section class="source-table-notes"><h3>Armor Class column key<\/h3>/);assert.match(html,/Leather or padded armor: AC 8/);assert.match(html,/data-inline-source/);assert.doesNotMatch(html,/Printed footnotes/);
 const item2={id:'table-fixture',title:'Table fixture',table:{columns:[],rows:[],sourceNotesTitle:'Armor Class column key',sourceNotes:[{label:'PHB p. 36 · Plate',text:'Plate mail: AC 3'}]}};
 const pending=ui.ruleTableHTML(item2);assert.match(pending,/Plate mail: AC 3/);assert.match(pending,/Exact source focus unavailable/);assert.doesNotMatch(pending,/data-inline-source/);
});
