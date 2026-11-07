import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPriceSourceInventory,attachEvidenceBindings} from '../tools/price-source-inventory.mjs';
import citations from '../dist/citations.js';
import books from '../dist/books.js';
import {inventoryCatalogPaths,makeCitationBrowserIndex,readJsonPointer,safeCatalogPath,targetKey,validateTargetPayload} from '../tools/citation-browser-inventory.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const data=JSON.parse(readFileSync(path.join(dist,'data.json'),'utf8'));
const inventory=buildPriceSourceInventory({equipment:data.equipment,data});
attachEvidenceBindings(data,inventory);
const catalogs=Object.fromEntries(inventoryCatalogPaths(data).map(catalogPath=>[
 catalogPath,JSON.parse(readFileSync(safeCatalogPath(dist,catalogPath),'utf8'))
]));
const index=makeCitationBrowserIndex({data,bindings:inventory.fieldEvidenceBindings,catalogs,books:books.books});

test('browser sweep validator resolves a current bound target through its selected source owner',()=>{
 const origin=data.equipment.find(item=>item.id==='phb-bo-stick');
 const target=citations.targets(origin).find(candidate=>candidate.fieldPointer==='/fields/Approx. weight'&&candidate.regionIds.length);
 assert.ok(target,'fixture includes a reviewed Bo Stick field target');
 assert.match(readJsonPointer(origin,target.fieldPointer),/^15 gp-weight/);
 const control={routeRecord:{collection:'equipment',itemId:origin.id},contextOwner:{collection:'equipment',itemId:origin.id}};
 assert.deepEqual(validateTargetPayload([target],control,index),[]);
});

test('browser sweep validator detects malformed ownership, page, region and field-pointer targets',()=>{
 const origin=data.equipment.find(item=>item.id==='phb-bo-stick');
 const valid=citations.targets(origin).find(candidate=>candidate.fieldPointer==='/fields/Approx. weight'&&candidate.regionIds.length);
 assert.ok(valid);
 const control={routeRecord:{collection:'equipment',itemId:origin.id},contextOwner:{collection:'equipment',itemId:origin.id}};

 const wrongOwner=structuredClone(valid);wrongOwner.sourceOwner={collection:'equipment',itemId:'phb-banded-mail'};
 const ownerCodes=validateTargetPayload([wrongOwner],control,index).map(issue=>issue.code);
 assert.ok(ownerCodes.includes('catalog-owner-mismatch'));
 assert.ok(ownerCodes.includes('source-context-owner-mismatch'));

 const wrongPage=structuredClone(valid);wrongPage.page=999;
 const pageCodes=validateTargetPayload([wrongPage],control,index).map(issue=>issue.code);
 assert.ok(pageCodes.includes('invalid-printed-page'));
 assert.ok(pageCodes.includes('region-page-mismatch'));

 const wrongRegion=structuredClone(valid);wrongRegion.regionIds=['not-in-selected-catalog'];
 const regionCodes=validateTargetPayload([wrongRegion],control,index).map(issue=>issue.code);
 assert.ok(regionCodes.includes('region-not-found'));
 assert.ok(regionCodes.includes('field-binding-not-found'));

 const wrongPointer=structuredClone(valid);wrongPointer.fieldPointer='/fields/not-a-real-field';
 const pointerCodes=validateTargetPayload([wrongPointer],control,index).map(issue=>issue.code);
 assert.ok(pointerCodes.includes('field-binding-not-found'));

 const wrongFieldOwner=structuredClone(valid);wrongFieldOwner.fieldOwner={collection:'equipment',itemId:'phb-banded-mail'};
 const fieldOwnerCodes=validateTargetPayload([wrongFieldOwner],control,index).map(issue=>issue.code);
 assert.ok(fieldOwnerCodes.includes('field-origin-owner-mismatch'));
 assert.notEqual(targetKey(valid),targetKey(wrongFieldOwner),'field-owner identity remains in the unique-target denominator');
});

test('invalid or empty serialized target payloads fail closed',()=>{
 const control={routeRecord:{collection:'rules',itemId:'character-creation'},contextOwner:{collection:'rules',itemId:'character-creation'}};
 assert.equal(validateTargetPayload('{bad json',control,index)[0].code,'invalid-target-json');
 assert.equal(validateTargetPayload('[]',control,index)[0].code,'empty-target-payload');
});
