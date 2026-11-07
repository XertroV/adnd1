import {resolve, sep} from 'node:path';

const routeCollections = ['spells','rules','equipment','classes','matrices'];
const jsonPointerParts = pointer => {
 if(typeof pointer!=='string'||!pointer.startsWith('/'))return null;
 return pointer.slice(1).split('/').map(part=>{
  if(/~(?![01])/.test(part))return null;
  return part.replace(/~1/g,'/').replace(/~0/g,'~');
 });
};
export function readJsonPointer(value,pointer){
 const parts=jsonPointerParts(pointer);if(!parts)return undefined;
 return parts.reduce((current,key)=>current==null?undefined:current[key],value);
}
export function selectedCatalog(item){
 return item?.sourceExcerpts?.catalog||item?.scanVerification?.catalog||'';
}
export function makeCitationBrowserIndex({data,bindings=[],catalogs={},books={}}={}){
 const records=new Map();
 for(const collection of routeCollections){
  for(const item of Array.isArray(data?.[collection])?data[collection]:[])records.set(`${collection}:${item.id}`,item);
 }
 if(data?.progressionExplainer&&typeof data.progressionExplainer==='object')records.set(`progressionExplainer:${data.progressionExplainer.id||'progression-explainer'}`,data.progressionExplainer);
 const catalogByPath=new Map(Object.entries(catalogs));
 const bindingsBySignature=new Map();
 for(const binding of bindings){
  const key=bindingKey(binding);
  const values=bindingsBySignature.get(key)||[];values.push(binding);bindingsBySignature.set(key,values);
 }
 return {records,catalogByPath,bindingsBySignature,books};
}
function bindingKey(binding){
 return JSON.stringify({
  book:binding.book||'',page:Number(binding.printedPage??binding.page)||0,
  fieldPointer:binding.fieldPointer||'',catalog:binding.catalog||'',
  regionIds:Array.isArray(binding.regionIds)?binding.regionIds:[]
 });
}
function canonicalOwner(owner,index){
 if(!owner)return null;
 if(owner.collection==='classes'&&owner.itemId==='progression-explainer'&&index.records.has('progressionExplainer:progression-explainer'))return {collection:'progressionExplainer',itemId:'progression-explainer'};
 return owner;
}
function sameOwner(left,right,index){
 const a=canonicalOwner(left,index),b=canonicalOwner(right,index);
 return !!a&&!!b&&a.collection===b.collection&&a.itemId===b.itemId;
}
export function targetKey(target){
 return JSON.stringify({
  book:target?.book||'',page:Number(target?.page)||0,
  fieldPointer:target?.fieldPointer||'',catalog:target?.catalog||'',
  regionIds:Array.isArray(target?.regionIds)?target.regionIds:[],
  reviewStatus:target?.reviewStatus||'',
  fieldOwner:target?.fieldOwner||null,
  sourceOwner:target?.sourceOwner||null
 });
}
export function validateTargetPayload(rawPayload,control,index){
 const issues=[];let targets;
 try{targets=typeof rawPayload==='string'?JSON.parse(rawPayload):rawPayload;}catch(error){
  return [{code:'invalid-target-json',detail:String(error.message||error)}];
 }
 if(!Array.isArray(targets))return [{code:'target-payload-not-array',detail:`Expected array, received ${typeof targets}`}];
 if(!targets.length)issues.push({code:'empty-target-payload',detail:'Inline citation has no serialized targets'});
 for(let position=0;position<targets.length;position++){
  const target=targets[position],prefix=`targets[${position}]`;
  if(!target||typeof target!=='object'||Array.isArray(target)){
   issues.push({code:'target-not-object',detail:`${prefix} is not an object`});continue;
  }
  const book=target.book;
  if(typeof book!=='string'||!index.books?.[book])issues.push({code:'unknown-book',detail:`${prefix} has unsupported book ${String(book)}`});
  const page=Number(target.page);
  if(!Number.isInteger(page)||page<1||page>Number(index.books?.[book]?.lastPage))issues.push({code:'invalid-printed-page',detail:`${prefix} has invalid ${String(book)} page ${String(target.page)}`});
  const regionIds=target.regionIds;
  if(!Array.isArray(regionIds)||regionIds.some(id=>typeof id!=='string'||!id.trim())){
   issues.push({code:'invalid-region-ids',detail:`${prefix}.regionIds must be an array of nonempty IDs`});
  }
  if(target.targetStatus==='resolved'&&Array.isArray(regionIds)&&!regionIds.length)issues.push({code:'resolved-without-region',detail:`${prefix} is resolved with no region IDs`});
  const explicitOwner=target.sourceOwner;
  if(explicitOwner!==undefined&&(!explicitOwner||typeof explicitOwner!=='object'||Array.isArray(explicitOwner)||typeof explicitOwner.collection!=='string'||typeof explicitOwner.itemId!=='string')){
   issues.push({code:'invalid-source-owner',detail:`${prefix} has malformed sourceOwner`});
  }
  const explicitFieldOwner=target.fieldOwner;
  if(explicitFieldOwner!==undefined&&(!explicitFieldOwner||typeof explicitFieldOwner!=='object'||Array.isArray(explicitFieldOwner)||typeof explicitFieldOwner.collection!=='string'||typeof explicitFieldOwner.itemId!=='string')){
   issues.push({code:'invalid-field-owner',detail:`${prefix} has malformed fieldOwner`});
  }
  const catalogPath=target.catalog||'';
  let catalog=catalogPath?index.catalogByPath.get(catalogPath):null;
  if(catalogPath&&!catalog)issues.push({code:'catalog-not-found',detail:`${prefix} catalog ${catalogPath} is not loaded`});
  const catalogOwner=catalog?.itemId?{collection:catalog.collection||control?.contextOwner?.collection||control?.routeRecord?.collection,itemId:catalog.itemId}:null;
  const owner=explicitOwner||(catalogOwner?.collection?catalogOwner:null)||control?.contextOwner||control?.routeRecord||null;
  const canonical=canonicalOwner(owner,index);
  const ownerItem=canonical&&index.records.get(`${canonical.collection}:${canonical.itemId}`);
  if(owner&&!ownerItem)issues.push({code:'source-owner-not-found',detail:`${prefix} owner ${owner.collection}:${owner.itemId} is not in attached data`});
  if(catalog&&owner&&((catalog.itemId&&catalog.itemId!==owner.itemId)||(catalog.collection&&!sameOwner({collection:catalog.collection,itemId:catalog.itemId},owner,index)))){
   issues.push({code:'catalog-owner-mismatch',detail:`${prefix} catalog identifies ${catalog.collection}:${catalog.itemId}, target owner is ${owner.collection}:${owner.itemId}`});
  }
  if(target.catalog&&ownerItem){
   const expectedCatalog=selectedCatalog(ownerItem);
   if(expectedCatalog&&expectedCatalog!==target.catalog)issues.push({code:'nonselected-catalog',detail:`${prefix} uses ${target.catalog}; ${owner.collection}:${owner.itemId} selects ${expectedCatalog}`});
  }
  if(Array.isArray(regionIds)&&regionIds.length){
   if(!catalog){
    const selected=selectedCatalog(ownerItem);
    catalog=selected?index.catalogByPath.get(selected):null;
    if(!catalog)issues.push({code:'region-without-catalog',detail:`${prefix} lists regions but owner has no loaded selected catalog`});
   }
   if(catalog){
    for(const id of regionIds){
     const region=(catalog.regions||[]).find(candidate=>candidate.id===id);
     if(!region){issues.push({code:'region-not-found',detail:`${prefix} region ${id} is absent from ${target.catalog||selectedCatalog(ownerItem)}`});continue;}
     if(region.book!==book||Number(region.printedPage)!==page)issues.push({code:'region-page-mismatch',detail:`${prefix} ${id} is ${region.book}:${region.printedPage}, payload says ${book}:${page}`});
    }
   }
  }
  if(control?.contextOwner&&owner&&!sameOwner(control.contextOwner,owner,index))issues.push({code:'source-context-owner-mismatch',detail:`${prefix} UI source context is ${control.contextOwner.collection}:${control.contextOwner.itemId}, target catalog owner is ${owner.collection}:${owner.itemId}`});
  if(target.fieldPointer){
   const bindingMatches=index.bindingsBySignature.get(bindingKey({...target,page}))||[];
   if(!bindingMatches.length)issues.push({code:'field-binding-not-found',detail:`${prefix} ${target.fieldPointer} has no matching current evidence binding`});
   else{
    const bindingOrigins=bindingMatches.map(binding=>({collection:binding.collection,itemId:binding.itemId}));
    if(explicitFieldOwner&&typeof explicitFieldOwner==='object'&&!bindingOrigins.some(origin=>sameOwner(origin,explicitFieldOwner,index)))issues.push({code:'field-origin-owner-mismatch',detail:`${prefix} fieldOwner ${explicitFieldOwner.collection}:${explicitFieldOwner.itemId} differs from its current binding origin(s) ${bindingOrigins.map(origin=>`${origin.collection}:${origin.itemId}`).join(', ')}`});
    if(!explicitFieldOwner)issues.push({code:'field-origin-owner-missing',detail:`${prefix} omits fieldOwner for its current evidence binding origin(s) ${bindingOrigins.map(origin=>`${origin.collection}:${origin.itemId}`).join(', ')}`});
    const routedOwners=[control?.routeRecord,control?.contextOwner].filter(Boolean);
    let matchedControlOrigin=false;
    for(const binding of bindingMatches){
     const originOwner={collection:binding.collection,itemId:binding.itemId};
     const origin=index.records.get(`${binding.collection}:${binding.itemId}`);
     if(!origin){issues.push({code:'field-origin-not-found',detail:`${prefix} binding origin ${binding.collection}:${binding.itemId} is absent`});continue;}
     if(routedOwners.some(candidate=>sameOwner(candidate,originOwner,index)))matchedControlOrigin=true;
     if(readJsonPointer(origin,binding.fieldPointer)===undefined)issues.push({code:'field-pointer-unresolved',detail:`${prefix} pointer ${binding.fieldPointer} does not resolve on ${binding.collection}:${binding.itemId}`});
     if(binding.sourceObjectPointer&&readJsonPointer(origin,binding.sourceObjectPointer)===undefined)issues.push({code:'source-object-pointer-unresolved',detail:`${prefix} source object ${binding.sourceObjectPointer} does not resolve on ${binding.collection}:${binding.itemId}`});
    }
    if(routedOwners.length&&!matchedControlOrigin)issues.push({code:'field-origin-control-mismatch',detail:`${prefix} target field has no origin matching the route entry or UI source context`});
    const approved=new Set(['field-target-reviewed','region-verified']);
    if(approved.has(target.reviewStatus)&&!bindingMatches.some(binding=>approved.has(binding.reviewStatus)))issues.push({code:'target-review-status-exceeds-binding',detail:`${prefix} claims ${target.reviewStatus}, but no matching current binding has an approved field-target status`});
   }
   if(explicitOwner&&catalog&&target.catalog&&catalog.collection!==explicitOwner.collection)issues.push({code:'field-source-owner-collection-mismatch',detail:`${prefix} field owner collection differs from catalog collection`});
  }
 }
 return issues;
}
export function inventoryCatalogPaths(data){
 const paths=new Set();
 const addItem=item=>{
  const path=selectedCatalog(item);if(path)paths.add(path);
 };
 for(const collection of routeCollections)for(const item of Array.isArray(data?.[collection])?data[collection]:[])addItem(item);
 if(data?.progressionExplainer)addItem(data.progressionExplainer);
 return [...paths].sort();
}
export function safeCatalogPath(distRoot,catalogPath){
 const root=resolve(distRoot),path=resolve(root,catalogPath);
 return path===root||path.startsWith(root+sep)?path:null;
}
