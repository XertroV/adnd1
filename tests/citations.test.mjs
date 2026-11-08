import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),citations=require('../dist/citations.js');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url)));
test('dagger combines primary, individual fields and cross-book references',()=>{
 const groups=citations.collect(data.equipment.find(x=>x.id==='phb-dagger'));
 assert.deepEqual(groups.map(g=>[g.book,g.pages]),[['PHB',[35,37,38,39]],['UA',[26,27,28]]]);
 assert.ok(groups[1].contexts.some(c=>c.label==='Thrown rate (UA p.28)'));
 assert.ok(groups[1].contexts.some(c=>c.label==='Hand-held AC adjustments (UA p.27)'));
 assert.equal(citations.pages(data.equipment.find(x=>x.id==='phb-dagger')).length,7);
 const receipt=JSON.parse(readFileSync(new URL('../research/source-audit-batch5-ua26-central-integration.json',import.meta.url)));
 const added=receipt.addedReferences.find(reference=>reference.itemId==='phb-dagger'&&reference.reference.book==='UA'&&reference.reference.pages.includes(26));
 assert.ok(added,'the additional page is an explicitly reviewed UA26 row citation');
});
test('reviewed override citations retain the actual secondary source identity',()=>{
 const expected={'phb-partisan':['UA',26],'ua-druid-know-alignment':['PHB',45],'ua-magic-user-know-alignment':['PHB',45],'ua-magic-user-detect-illusion':['PHB',94],'ua-magic-user-dispel-illusion':['PHB',96],'ua-magic-user-shine':['DMG',26]};
 for(const [id,[book,page]] of Object.entries(expected)){
  const item=[...data.spells,...data.equipment].find(x=>x.id===id);
  assert.ok(citations.pages(item).some(r=>r.book===book&&r.page===page),id);
 }
});
test('no inferred references, invalid pages, or accidental visual upgrades',()=>{
 const item={book:'PHB',pages:[35,35,0,129,'37'],summary:'UA p.28',references:[{book:'UA',pages:[28],status:'OCR only'},{book:'Unknown',pages:[4]}]};item.cycle=item;
 assert.deepEqual(citations.collect(item).map(g=>[g.book,g.pages]),[['PHB',[35]],['UA',[28]]]);
 assert.deepEqual(citations.collect(item)[1].statuses,['OCR only']);
 assert.equal(citations.collect({summary:'PHB p.35'}).length,0);
});
test('missing DMG pages remain a visible gap and MM2 uses its exact displaced mapping',()=>{
 const rows=citations.pages({references:[{book:'DMG',pages:[174,175,176,239,240]},{book:'MM2',pages:[83,84,92]}]});
 assert.deepEqual(rows.map(r=>r.pdfPage),[175,null,176,null,null,92,84,93]);
 assert.deepEqual(rows.filter(r=>r.missing).map(r=>r.page),[175]);assert.deepEqual(rows.filter(r=>r.availability==='unverified').map(r=>r.page),[239,240]);
});
test('class citations include source-backed XP and changes without cross-book relabeling',()=>{
 const groups=citations.collect(data.classes.find(x=>x.id==='fighter'));
 assert.ok(groups.some(g=>g.book==='UA'&&g.pages.includes(18)));
 assert.ok(groups.some(g=>g.book==='DMG'&&g.pages.includes(74)));
 assert.ok(groups.find(g=>g.book==='PHB').contexts.some(c=>c.label==='Level 5 XP'));
});
test('per-page verification status never leaks from a different page of the same book',()=>{
 const rows=citations.pages({book:'PHB',pages:[35],status:'OCR pending',references:[{book:'PHB',pages:[37],status:'Visually verified'}]});
 assert.deepEqual(rows.find(r=>r.page===35).statuses,['OCR pending']);
 assert.deepEqual(rows.find(r=>r.page===37).statuses,['Visually verified']);
});
