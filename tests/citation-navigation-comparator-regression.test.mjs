import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {attachEvidenceBindings,buildPriceSourceInventory} from '../tools/price-source-inventory.mjs';

const require=createRequire(import.meta.url);
const citations=require('../dist/citations.js'),books=require('../dist/books.js');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const snapshot=JSON.parse(readFileSync(new URL('../research/citation-navigation-coverage.json',import.meta.url)));
globalThis.FirstEditionBooks=books;
const preFixCitations=require('./fixtures/citation-navigation-comparator-prefx/citations.js');
const preFixAppRoute=readFileSync(new URL('./fixtures/citation-navigation-comparator-prefx/app-route.js',import.meta.url),'utf8');

function routeProbe({appSource=app,citationApi=citations,hash='#equipment/phb-bo-stick?source=PHB%3A35&target=pending&field=%2FsuggestedPrice%2Fcomparisons%2F0&owner=equipment%3Aphb-spear',contextOwnerIds=['phb-spear','ua-sap']}={}){
 const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
 const inventory=buildPriceSourceInventory({equipment:data.equipment,data});
 attachEvidenceBindings(data,inventory);
 const routeIndex=data.equipment.map(item=>({...item,_view:'equipment'}));
 const routeSource=appSource===preFixAppRoute?appSource:appSource.slice(appSource.indexOf('function parseReferenceRoute('),appSource.indexOf('\nfunction goTo('));
 let opened;
 const context=vm.createContext({
  data,views:['spells','rules','equipment','classes','notebook','sources'],URLSearchParams,
  view:'equipment',selectedId:'phb-bo-stick',filter:{},selectedSpellLevels:new Set(),listLimit:50,referenceSearchTimer:null,renderedRouteHash:'',index:routeIndex,filteredItems:()=>routeIndex,
  location:{hash},
  document:{querySelectorAll:()=>contextOwnerIds.map(id=>({dataset:{sourceContext:id,sourceView:'equipment'}}))},
  FirstEditionCitations:citationApi,FirstEditionBooks:books,bookCode:books.code,render(){},clearTimeout(){},
  openScanViewer(...args){opened=args;}
 });
 vm.runInContext(routeSource,context);
 context.route();
 return {data,inventory,opened,route:context.parseReferenceRoute(context.location.hash)};
}

test('preserved pre-fix fixture identifies the comparator origin/owner mismatch',()=>{
 const fixture=snapshot.preservedPreFixFailureFixture;
 assert.equal(fixture?.id,'bo-stick-comparator-origin-field-target-reload');
 assert.equal(fixture?.baselineBinding?.routeItemId,'phb-bo-stick');
 assert.equal(fixture?.baselineBinding?.fieldPointer,'/suggestedPrice/comparisons/0');
 assert.equal(fixture?.baselineBinding?.sourceOwner?.itemId,'phb-spear');
 assert.equal(fixture?.targetProjection?.sourceOwnerDropped,true);
 assert.equal(fixture?.reloadResolution?.fieldPointerFoundOnLookupItem,false);
 const fixtureDirectory=new URL('./fixtures/citation-navigation-comparator-prefx/',import.meta.url);
 for(const [name,expected] of Object.entries(fixture?.sourceHashes||{})){
  const bytes=readFileSync(new URL(name,fixtureDirectory));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,`${name} stays the exact pre-fix source`);
 }
});

test('saved pre-fix comparator route function loses its target after resolving the source owner',()=>{
 const {opened,route}=routeProbe({appSource:preFixAppRoute,citationApi:preFixCitations});
 assert.equal(route.id,'phb-bo-stick');
 assert.deepEqual(JSON.parse(JSON.stringify(route.owner)),{view:'equipment',id:'phb-spear'});
 assert.equal(route.source.fieldPointer,'/suggestedPrice/comparisons/0');
 assert.equal(route.source.targetStatus,'pending');
 assert.ok(opened,'the comparator source owner and cited page are valid');
 assert.equal(opened[0].id,'phb-spear','the owner query resolves the page/source item');
 assert.ok(!opened[4].activeTarget,'pre-fix route searches fieldPointer on the source owner and loses the origin target');
 assert.deepEqual(opened[4].targets,[]);
 assert.equal(opened[4].targetStatus,'pending');
});

test('saved pre-fix citation target projection contains the origin pointer but drops structured sourceOwner',()=>{
 const {data}=routeProbe({appSource:preFixAppRoute,citationApi:preFixCitations});
 const origin=data.equipment.find(item=>item.id==='phb-bo-stick');
 const comparison=origin.suggestedPrice.comparisons[0];
 const target=preFixCitations.targets(comparison)[0];
 assert.equal(target.fieldPointer,'/suggestedPrice/comparisons/0');
 assert.equal(target.sourceOwner,undefined);
});

test('current comparator permalink restores origin field target and sourceOwner after reload',()=>{
 const {opened,route}=routeProbe();
 assert.equal(route.id,'phb-bo-stick');
 assert.equal(route.source.fieldPointer,'/suggestedPrice/comparisons/0');
 assert.equal(route.source.targetStatus,'pending');
 assert.equal(opened[0].id,'phb-spear','page display and excerpt catalog remain owned by the comparator');
 assert.equal(opened[4].activeTarget.fieldPointer,'/suggestedPrice/comparisons/0');
 assert.deepEqual(JSON.parse(JSON.stringify(opened[4].activeTarget.sourceOwner)),{collection:'equipment',itemId:'phb-spear'});
 assert.deepEqual(opened[4].targets.map(target=>target.fieldPointer),['/suggestedPrice/comparisons/0']);
});

test('current citation target projection preserves the structured sourceOwner',()=>{
 const {data}=routeProbe();
 const origin=data.equipment.find(item=>item.id==='phb-bo-stick');
 const target=citations.targets(origin.suggestedPrice.comparisons[0])[0];
 assert.equal(target.fieldPointer,'/suggestedPrice/comparisons/0');
 assert.deepEqual(JSON.parse(JSON.stringify(target.sourceOwner)),{collection:'equipment',itemId:'phb-spear'});
 assert.equal(target.label,'Comparison: Spear (not this item price)','field target label comes from the cited comparison object, not a generic root context');
});

test('mismatched but valid source-owner query fails closed to a pending field target',()=>{
 const hash='#equipment/phb-bo-stick?source=PHB%3A35&target=pending&field=%2FsuggestedPrice%2Fcomparisons%2F0&owner=equipment%3Aphb-dagger';
 const {opened}=routeProbe({hash,contextOwnerIds:['phb-spear','phb-dagger']});
 assert.ok(opened,'a separately cited page can still be displayed');
 assert.equal(opened[0].id,'phb-dagger');
 assert.equal(opened[4].targetStatus,'pending');
 assert.equal(opened[4].activeTarget.fieldPointer,'/suggestedPrice/comparisons/0');
 assert.deepEqual(JSON.parse(JSON.stringify(opened[4].activeTarget.regionIds)),[],'mismatched owner cannot auto-select a crop from the origin target');
 assert.equal(opened[4].activeTarget.reviewStatus,'field-target-pending');
});

test('copy and history URLs derive a missing distinct sourceOwner from the active target',()=>{
 const source=app.slice(app.indexOf('function sourceLinkHash('),app.indexOf('\nfunction syncSelectionRoute('));
 const context=vm.createContext({encodeURIComponent});vm.runInContext(source,context);
 const target={fieldPointer:'/suggestedPrice/comparisons/0',sourceOwner:{collection:'equipment',itemId:'phb-spear'}};
 assert.equal(context.sourceLinkHash('equipment','phb-bo-stick',{book:'PHB',page:35},null,'pending',target),'#equipment/phb-bo-stick?source=PHB%3A35&target=pending&field=%2FsuggestedPrice%2Fcomparisons%2F0&owner=equipment%3Aphb-spear');
});
