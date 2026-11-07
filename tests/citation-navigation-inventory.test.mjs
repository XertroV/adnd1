import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditInlineProducerSites,auditRouteQueryContract,auditSourceNavigationAttributes} from '../tools/citation-navigation-coverage.mjs';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');

test('citation navigation inventory captures all current chip producer classes and sites',()=>{
 const inventory=auditInlineProducerSites(app);
 assert.equal(inventory.sites.length,14);
 assert.equal(inventory.classes.length,9);
 assert.deepEqual(inventory.classes,[
  'class-advancement','class-progression-reference','class-xp-table','dynamic-xp-result',
  'equipment-estimate-comparison','equipment-related-reference','field-attribute-layout',
  'fighter-matrix-reference','progression-explainer-reference'
 ]);
});

test('an unclassified new source-chip producer fails closed',()=>{
 assert.throws(()=>auditInlineProducerSites(`${app}\nfunction futureCitationControl(){return inlineSourceChip(ref,'Future')}`),/Unclassified citation chip producer/);
});

test('route parser and permalink builder agree on every source query parameter',()=>{
 assert.deepEqual(auditRouteQueryContract(app),{
  parsed:['field','fieldOwner','owner','region','source','target'],
  serialized:['field','fieldOwner','owner','region','source','target']
 });
 assert.throws(()=>auditRouteQueryContract(app.replace("params.get('owner')", "params.get('owner'),unused=params.get('future')")),/unknown=future/);
});

test('citation navigation HTML attributes have an explicit inventory',()=>{
 const inventory=auditSourceNavigationAttributes(app);
 assert.deepEqual(inventory.missing,[]);
 assert.ok(inventory.observed.includes('data-source-context'));
 assert.ok(inventory.observed.includes('data-ref-targets'));
 assert.throws(()=>auditSourceNavigationAttributes(`${app} <button data-source-unreviewed>`),/Unclassified citation navigation attribute/);
});
