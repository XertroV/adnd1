import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import search from '../dist/search.js';
import {auditPhbSpellGuidanceContent,reviewedPhbSpellGuidanceIds,druidComponentCells} from '../tools/phb-spell-guidance-content-audit.mjs';
const root=new URL('../',import.meta.url),bytes=path=>readFileSync(new URL(path,root));
const json=path=>JSON.parse(bytes(path)),sha=b=>createHash('sha256').update(b).digest('hex');
const zipped=bytes('tests/fixtures/pass8-phb-spell-guidance-content-before-a46-v1.json.gz');
assert.equal(sha(zipped),'5fd4b57b42fe14607f7ce3126b75c22d44589de1fe02697f72685066f3e65e6c');
const fixture=JSON.parse(gunzipSync(zipped));
const current={...json('phb-spells.json'),...json('rules.json')};
const before={spells:Object.values(fixture.rawAuthoredRecordsBefore.phbSpellOwners),rules:[]};

test('the real a46 before inputs and owners are preserved against immutable Git objects',()=>{
 assert.equal(fixture.inputCommit,'a46eddc41ac6f712d5ad1498195df6a49810aae1');
 for(const [path,saved] of Object.entries(fixture.inputFiles)){
  const git=execFileSync('git',['show',`${fixture.inputCommit}:${path}`],{cwd:root,maxBuffer:40*1024*1024});
  assert.equal(sha(git),saved.sha256,path);assert.equal(git.length,saved.byteLength,path);
  if(saved.bytesBase64)assert.deepEqual(git,Buffer.from(saved.bytesBase64,'base64'),path);
 }
 const authored=JSON.parse(execFileSync('git',['show',`${fixture.inputCommit}:phb-spells.json`],{cwd:root}));
 for(const owner of before.spells)assert.deepEqual(owner,authored.spells.find(row=>row.id===owner.id));
});
test('the bounded detector catches all ten actual incomplete spell records and absent Druid unit',()=>{
 const report=auditPhbSpellGuidanceContent(before);assert.equal(report.denominator,11);assert.equal(report.missing.length,11);
 assert.deepEqual(report.missing.map(row=>row.itemId),[...reviewedPhbSpellGuidanceIds,'phb-druid-mistletoe-spell-components']);
});
test('authored current content passes the finite eleven-unit source contract',()=>{
 assert.deepEqual(auditPhbSpellGuidanceContent(current).missing,[]);
});
for(const id of reviewedPhbSpellGuidanceIds)test(`${id}: restoring its actual incomplete predecessor is detected independently`,()=>{
 const candidate=structuredClone(current);candidate.spells[candidate.spells.findIndex(owner=>owner.id===id)]=structuredClone(before.spells.find(owner=>owner.id===id));
 assert.deepEqual(auditPhbSpellGuidanceContent(candidate).missing.map(row=>row.itemId),[id]);
});
test('all twelve Druid percentage/marker cells and the two footnotes remain distinct source evidence',()=>{
 const rule=current.rules.find(owner=>owner.id==='phb-druid-mistletoe-spell-components');
 assert.deepEqual(rule.table.rows.map(row=>row.cells.map(cell=>cell.raw)),druidComponentCells);
 let rejected=0;
 for(let row=0;row<4;row++)for(let column=0;column<3;column++){
  const candidate=structuredClone(current);candidate.rules.find(owner=>owner.id===rule.id).table.rows[row].cells[column].raw='unapproved';
  assert.deepEqual(auditPhbSpellGuidanceContent(candidate).missing.map(row=>row.itemId),[rule.id]);rejected++;
 }
 assert.equal(rejected,12);
 for(const edit of [owner=>owner.table.footnotes.pop(),owner=>owner.bullets.splice(1,1),owner=>owner.bullets.splice(3,1)]){
  const candidate=structuredClone(current);edit(candidate.rules.find(owner=>owner.id===rule.id));assert.equal(auditPhbSpellGuidanceContent(candidate).missing.length,1);
 }
});
test('owner duplication and loss cannot borrow another owner’s source-content disposition',()=>{
 for(const id of [...reviewedPhbSpellGuidanceIds,'phb-druid-mistletoe-spell-components']){
  const collection=id==='phb-druid-mistletoe-spell-components'?'rules':'spells';
  const candidate=structuredClone(current);candidate[collection].push(structuredClone(candidate[collection].find(owner=>owner.id===id)));
  assert.deepEqual(auditPhbSpellGuidanceContent(candidate).missing.map(row=>row.itemId),[id]);
  const missing=structuredClone(current);missing[collection]=missing[collection].filter(owner=>owner.id!==id);assert.deepEqual(auditPhbSpellGuidanceContent(missing).missing.map(row=>row.itemId),[id]);
 }
});
test('Word of Recall and existing source review grades remain unchanged',()=>{
 const saved=before.spells.find(owner=>owner.id==='phb-cleric-word-of-recall');assert.ok(saved);
 assert.deepEqual(current.spells.find(owner=>owner.id===saved.id),saved);
 for(const id of reviewedPhbSpellGuidanceIds){const old=before.spells.find(owner=>owner.id===id),now=current.spells.find(owner=>owner.id===id);assert.equal(now.status,old.status);assert.equal(now.incomplete,old.incomplete);}
 const recap=JSON.stringify(saved);assert.match(recap,/250 gp weight per caster level/);
});
test('Druid material rows, gathering method and note qualifiers are searchable as reader content',()=>{
 const owner=current.rules.find(owner=>owner.id==='phb-druid-mistletoe-spell-components');const document=search.prepare({...owner,_view:'rules'});
 for(const query of ['borrowed mistletoe','oak leaves','saving throw category','silver sickle','spell duration'])assert.ok(Number.isFinite(search.score(document,query)),query);
});
