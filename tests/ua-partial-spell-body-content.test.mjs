import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {auditUaPartialSpellBodies} from '../tools/ua-partial-spell-body-content-audit.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const current=read('ua-spells.json');
const baselineBytes=execFileSync('git',['show','a46eddc41ac6f712d5ad1498195df6a49810aae1:ua-spells.json'],{cwd:new URL('..',import.meta.url)});
const baseline=JSON.parse(baselineBytes);
const before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/source-audit-pass8-ua-five-partial-spell-bodies-before-a46-v1.json.gz',import.meta.url))));
const selected=new Set(before.owners.map(owner=>owner.id));

test('the actual before fixture is the exact five-owner a46 snapshot',()=>{
 assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),before.inputFileSha256);
 assert.equal(before.inputCommit,'a46eddc41ac6f712d5ad1498195df6a49810aae1');
 assert.equal(before.owners.length,5);
 for(const owner of before.owners)assert.deepEqual(owner.record,baseline.spells.find(spell=>spell.id===owner.id));
});

test('five bounded source-body probes fail on the preserved records and pass after repair',()=>{
 const old=auditUaPartialSpellBodies(before.owners.map(owner=>owner.record));
 assert.equal(old.filter(row=>row.missingProbeIndexes.length).length,5);
 assert.ok(auditUaPartialSpellBodies(current.spells).every(row=>row.missingProbeIndexes.length===0));
 assert.throws(()=>auditUaPartialSpellBodies(current.spells.filter(spell=>spell.id!=='ua-magic-user-bind')),/exactly one owner/);
 assert.throws(()=>auditUaPartialSpellBodies([...current.spells,current.spells.find(spell=>spell.id==='ua-magic-user-bind')]),/exactly one owner/);
});

test('only five owners and the declared body fields change; identities, fields and prior grades remain exact',()=>{
 assert.equal(current.spells.length,224);
 assert.deepEqual(current.spells.map(spell=>spell.id),baseline.spells.map(spell=>spell.id));
 const changed=[];
 for(const [index,spell] of current.spells.entries()){
  const prior=baseline.spells[index];
  if(!selected.has(spell.id)){assert.deepEqual(spell,prior);continue;}
  const fixedFields=['effect','conditions','exceptions'];
  const strip=record=>Object.fromEntries(Object.entries(record).filter(([key])=>!fixedFields.includes(key)));
  assert.deepEqual(strip(spell),strip(prior),spell.id);
  assert.notDeepEqual(spell,prior);
  changed.push(spell.id);
 }
 assert.equal(changed.length,5);
 assert.deepEqual(current.sources,baseline.sources);
 const druid=current.spells.find(spell=>spell.id==='ua-druid-ceremony');
 assert.match(druid.effect[0],/indicated or lower level/);
 assert.match(druid.conditions[1],/7th or higher level/);
 assert.match(druid.effect[4],/^Special vows operate like the clerical ceremony/);
 assert.match(druid.effect[4],/ensorcelling its trees/);
});
