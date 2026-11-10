import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

const require=createRequire(import.meta.url);
const search=require('../dist/search.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const expectedNotes=new Map([
 ['appendix-c-character-subtable','c73e3249a9c1454dbfb356063e7e97267611eadcf342a406789c4d820908ce29'],
 ['appendix-c-henchmen','81caa1ea424a2174d76fe061cdd0e111ca2bd1a7f717f7aa70dd72dabba84718'],
 ['appendix-c-party-magic-distribution','4a74926c064ec70e418e8e012ba3acbbd2c3753bd521471130f9df43c0f4eef3'],
 ['appendix-c-magic-table-ii','cf77aa4bb4df10c6c28a9b3994e9a893c5fc44e85dbc7d692b6517caca9ef12b'],
 ['appendix-c-magic-table-iii','cf77aa4bb4df10c6c28a9b3994e9a893c5fc44e85dbc7d692b6517caca9ef12b'],
]);
const ruleDocs=data.rules.map(item=>search.prepare({...item,_view:'rules',_title:item.title||''}));
const byRule=id=>ruleDocs.find(item=>item.id===id);
const sha=value=>createHash('sha256').update(value).digest('hex');

test('the five Appendix C top-level rule notes are searchable from their existing owners',()=>{
 const noteRows=data.rules.filter(item=>typeof item.notes==='string'&&item.notes.trim());
 assert.deepEqual(noteRows.map(item=>item.id),[...expectedNotes.keys()]);
 for(const item of noteRows){
  assert.equal(sha(item.notes),expectedNotes.get(item.id),`${item.id} retains the reviewed note text`);
  const prepared=byRule(item.id);
  assert.ok(prepared._search.includes(search.normalize(item.notes)),`${item.id} indexes its rendered note`);
  assert.ok(Number.isFinite(search.score(prepared,item.notes)),`${item.id} is found by its full note text`);
  assert.equal(prepared._search.split(search.normalize(item.notes)).length-1,1,`${item.id} does not duplicate its note text`);
 }
 const sharedTableNote=data.rules.find(item=>item.id==='appendix-c-magic-table-ii').notes;
 assert.deepEqual(ruleDocs.filter(item=>Number.isFinite(search.score(item,sharedTableNote))).map(item=>item.id),['appendix-c-magic-table-ii','appendix-c-magic-table-iii'],'the identical authored note stays attached to its two distinct table owners');
});

test('rule-note projection stays view-scoped and indexes only string note values',()=>{
 const arrayNote=search.prepare({_view:'rules',_title:'',notes:['Public rule array canary',{text:'Object note canary'}]});
 assert.ok(Number.isFinite(search.score(arrayNote,'public rule array canary')));
 assert.equal(search.score(arrayNote,'object note canary'),Infinity);
 assert.equal(search.score(search.prepare({_view:'rules',_title:'',reviewNotes:'Future review field canary'}),'future review field canary'),Infinity);
 assert.equal(search.score(search.prepare({_view:'classes',_title:'',notes:'Class note canary'}),'class note canary'),Infinity);
});
