import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {assertDmg175CurrentSourceCohort as assertVersion29HistoricalDmg175SourceCohort} from './helpers/dmg175-source-current-cohort.mjs';
import {readVersion29HistoricalSourceInputs} from './helpers/version29-native-source-context.mjs';

const root=resolve(import.meta.dirname,'..');
const load=()=>readVersion29HistoricalSourceInputs(root);
test('historical Version29 DMG175 source cohort protects its owners, rows, strings, bindings and unchanged review records',()=>{
 assert.deepEqual(assertVersion29HistoricalDmg175SourceCohort(load()),{sourceCommit:'987a25d3ba2dcac0940569a2afab73f775e38028',owners:1014,canonicalBindings:4931,priorWholeBindings:4705,addedBindings:226,manualAdditions:123,nonmanualAdditions:103,newRules:11,sourceTableRows:87,renderedEquipmentFields:3,sourceCells:33,historicalMechanicsReviews:1215});
});

const findField=input=>input.mechanics.records.find(record=>record.id==='phb-hammer').fields.find(field=>field.path.includes('Hurled or missile weapon AC'));
const cases=[
 ['changed class source value',input=>input.data.classes[0].name+=' canary',/classes: every prior whole object/],
 ['changed prior spell source value',input=>input.data.spells[0].fields.canary='canary',/spells: every prior whole object/],
 ['changed matrix value',input=>input.data.matrices[0].title+=' canary',/matrices: every prior whole object/],
 ['changed progression field',input=>input.data.progressionExplainer.canary=true,/progressionExplainer: every prior whole object/],
 ['changed new structured row cell',input=>input.data.rules.find(rule=>rule.id==='appendix-c-character-subtable').table.rows[0].cells[0].raw='CANARY',/exact whole current source card/],
 ['dropped new row',input=>input.data.rules.find(rule=>rule.id==='appendix-c-character-subtable').table.rows.pop(),/87 source table rows/],
 ['promoted structured source value',input=>input.data.rules.find(rule=>rule.id==='appendix-c-character-subtable').table.rows[0].sourceReference.sourceValueStatus='confirmed',/table source value stays unassessed/],
 ['changed rendered equipment numerical cell',input=>input.data.equipment.find(item=>item.id==='phb-hammer').fields['Hurled or missile weapon AC adjustments at short range (UA p.28)']='AC 0 through 10: 99',/exact ordered short-range source-cell rendering/],
 ['changed equipment string type',input=>input.data.equipment.find(item=>item.id==='phb-hammer').fields['Hurled or missile weapon AC adjustments at short range (UA p.28)']=[99],/rendered UA28 field is a string/],
 ['promoted equipment mechanics grade',input=>findField(input).status='source-checked',/source-value grade remains unchecked/],
 ['lost prior whole binding',input=>input.inventory.fieldEvidenceBindings.splice(0,1,input.inventory.fieldEvidenceBindings[1]),/all 4705 prior whole canonical bindings/],
 ['reordered prior whole bindings',input=>{const bindings=input.inventory.fieldEvidenceBindings;[bindings[0],bindings[1]]=[bindings[1],bindings[0]];},/all 4705 prior whole canonical bindings/],
 ['changed pending addition to field review',input=>input.inventory.fieldEvidenceBindings.find(binding=>binding.itemId==='appendix-c-character-subtable').reviewStatus='field-target-reviewed',/added source category census|reference-level region flags/],
 ['changed region reference flag to value review',input=>input.inventory.fieldEvidenceBindings.find(binding=>binding.reviewStatus==='region-verified'&&binding.itemId.startsWith('appendix-c')).reviewStatus='field-target-reviewed',/reference-level region flags/],
 ['changed one new whole binding source identity',input=>input.inventory.fieldEvidenceBindings.find(binding=>binding.itemId==='appendix-c-character-subtable').sourceSha256='0'.repeat(64),/every new whole canonical binding is exact/],
 ['changed old manual prefix',input=>input.manual.bindings[0].sourceObject+=' canary',/807 old whole manual declarations/],
 ['promoted DMG175 manual value grade',input=>input.manual.bindings[810].sourceValueStatus='confirmed',/manual source values remain unassessed/],
 ['removed a DMG175 prose manual target',input=>input.manual.bindings.splice(810,1),/current manual declaration denominator/],
 ['promoted UA28 location-only value grade',input=>input.manual.bindings[807].sourceValueStatus='confirmed',/UA numerical values remain unassessed/],
 ['changed historical mechanics review record',input=>input.mechanics.reviewRecords[0].canary=true,/historical mechanics review records remain exact/],
 ['stale source input hash',input=>input.sourceRawInputs['dist/data.json']='0'.repeat(64),/exact closed current source input bytes/],
 ['changed source coverage metadata',input=>input.data.sources[0].coverage+=' canary',/complete current data object, sources and release metadata exact/],
 ['changed release counter',input=>input.data.release.excerpts.regions+=1,/complete current data object, sources and release metadata exact/],
 ['unknown top-level data field',input=>input.data.unapproved=true,/complete current data object, sources and release metadata exact/],
 ['hidden data field',input=>Object.defineProperty(input.data,'hidden',{value:true}),/native cohort rejects hidden properties/],
 ['accessor field',input=>Object.defineProperty(input.data,'accessor',{enumerable:true,get(){throw new Error('accessor executed');}}),/native cohort rejects accessors/],
 ['proxy data object',input=>{input.data=new Proxy(input.data,{});},/native cohort rejects proxies/],
 ['cyclic data object',input=>{input.data.cycle=input.data;},/native cohort rejects cycles/],
 ['non-finite data value',input=>{input.data.canary=Infinity;},/native cohort requires finite JSON numbers/],
 ['negative zero data value',input=>{input.data.canary=-0;},/native cohort requires finite JSON numbers/],
 ['sparse data array',input=>{delete input.data.rules[0];},/native cohort rejects sparse arrays/],
 ['symbol data property',input=>{input.data[Symbol('hidden')]=true;},/native cohort rejects symbol properties/],
 ['unknown inventory metadata',input=>{input.inventory.auditBypassCanary={};},/inventory: complete current input object exact/],
 ['unknown manual metadata',input=>{input.manual.auditBypassCanary={};},/manual: complete current input object exact/],
 ['unknown mechanics metadata',input=>{input.mechanics.auditBypassCanary={};},/mechanics: complete current input object exact/],
 ['promoted new rule formal field grade',input=>{input.mechanics.records.find(record=>record.id==='appendix-c-character-subtable').fields.find(field=>field.path==='/summary').status='source-checked';},/mechanics: complete current input object exact/],
];
for(const [name,mutate,error]of cases)test(`historical Version29 source rejects ${name}`,()=>{const input=load();mutate(input);assert.throws(()=>assertVersion29HistoricalDmg175SourceCohort(input),error);});
