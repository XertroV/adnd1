'use strict';
((root)=>{
 const books=root.FirstEditionBooks||(typeof require==='function'?require('./books.js'):null);
 const order=['PHB','UA','DMG','MM','MM2'];
 const stringIds=value=>Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&id.trim()).map(id=>id.trim()))]:[];
 function targetState(regionIds,reviewStatus){
  return regionIds.length&&['field-target-reviewed','region-verified'].includes(reviewStatus)?'resolved':'pending';
 }
 // Only structured references are collected. Prose is never parsed into inferred citations.
 function collect(item,rootContext=''){
  const groups=new Map(),seen=new WeakSet();
  function validPages(book,pages){
   const info=books.books[book];
   if(!info)return [];
   return (Array.isArray(pages)?pages:[]).filter(page=>Number.isInteger(page)&&page>=1&&page<=info.lastPage);
  }
  function addTarget(value,context,options={}){
   const book=books.code(options.book||value.book);
   const info=books.books[book];
   if(!info)return [];
   const sourcePages=options.pages??(Number.isInteger(options.printedPage)?[options.printedPage]:value.pages);
   const pages=validPages(book,sourcePages);
   if(!pages.length)return [];
   const regionIds=stringIds(options.regionIds??options.regions);
   const label=options.label||value.label||context;
   const targetLabel=options.label||value.label||(options.sourceCategory==='equipment-purchase-price'?'Purchase price':options.sourceObject)||context;
   const status=options.status||value.status;
   const reviewStatus=options.reviewStatus||(options.explicitVerification?'region-verified':'pending');
   if(!groups.has(book))groups.set(book,{book,pages:[],labels:[],contexts:[],statuses:[],targets:[]});
   const group=groups.get(book);
   for(const page of pages){
    if(!group.pages.includes(page))group.pages.push(page);
    if(label&&!group.contexts.some(c=>c.page===page&&c.label===label&&c.status===status))group.contexts.push({page,label,...(status?{status}:{})});
   }
   if(label&&!group.labels.includes(label))group.labels.push(label);
   if(status&&!group.statuses.includes(status))group.statuses.push(status);
   for(const page of pages){
    const target={book,page,regionIds:[...regionIds],label:targetLabel||'',labels:targetLabel?[targetLabel]:[],...(status?{status}:{}),reviewStatus,targetStatus:targetState(regionIds,reviewStatus)};
    for(const key of ['fieldPointer','sourceObject','sourceCategory','catalog','pdfPage','coordinateSpace','contextStatus','contextLimitations','sourcePages','sourceSha256','cropCoordinates','highlightCoordinates','sourceRowIds'])if(options[key]!==undefined)target[key]=options[key];
    if(typeof options.collection==='string'&&typeof options.itemId==='string')target.fieldOwner={collection:options.collection,itemId:options.itemId};
    const sourceOwner=options.sourceOwner;
    if(sourceOwner&&typeof sourceOwner==='object'&&!Array.isArray(sourceOwner)&&typeof sourceOwner.collection==='string'&&typeof sourceOwner.itemId==='string')target.sourceOwner={collection:sourceOwner.collection,itemId:sourceOwner.itemId};
    if(options.unmappedRegionIds?.length)target.unmappedRegionIds=stringIds(options.unmappedRegionIds);
    const existing=group.targets.find(candidate=>candidate.book===target.book&&candidate.page===target.page&&candidate.fieldPointer===target.fieldPointer&&JSON.stringify(candidate.regionIds)===JSON.stringify(target.regionIds)&&JSON.stringify(candidate.fieldOwner??null)===JSON.stringify(target.fieldOwner??null)&&JSON.stringify(candidate.sourceOwner??null)===JSON.stringify(target.sourceOwner??null));
    if(existing){
     if(label&&!existing.labels.includes(label))existing.labels.push(label);
     if(options.fieldPointer){existing.fieldPointers||=[];if(!existing.fieldPointers.includes(options.fieldPointer))existing.fieldPointers.push(options.fieldPointer);}
     if(options.sourceCategory){existing.sourceCategories||=[];if(!existing.sourceCategories.includes(options.sourceCategory))existing.sourceCategories.push(options.sourceCategory);}
     if(['field-target-reviewed','region-verified'].includes(options.reviewStatus)){existing.reviewStatus=options.reviewStatus;existing.targetStatus=targetState(existing.regionIds,existing.reviewStatus);}
     if(status&&!existing.status)existing.status=status;
     if(options.contextStatus&&!existing.contextStatus)existing.contextStatus=options.contextStatus;
     if(options.contextLimitations&&!existing.contextLimitations)existing.contextLimitations=options.contextLimitations;
    }else group.targets.push(target);
   }
   return pages;
  }
  function walk(value,context='Source reference'){
   if(!value||typeof value!=='object'||seen.has(value))return;
   seen.add(value);
   if(Array.isArray(value)){value.forEach(entry=>walk(entry,context));return;}
   const key=books.code(value.book),info=books.books[key];
   let citationPages=[];
   if(info&&Array.isArray(value.pages)){
    citationPages=validPages(key,value.pages);
    if(citationPages.length){
     const bindings=Array.isArray(value.evidenceBindings)?value.evidenceBindings:[];
     const boundPages=new Set();
     for(const binding of bindings){
      if(!binding||typeof binding!=='object')continue;
      const bindingBook=books.code(binding.book||key);
      const pages=validPages(bindingBook,Array.isArray(binding.pages)?binding.pages:Number.isInteger(binding.printedPage)?[binding.printedPage]:citationPages);
      pages.forEach(page=>boundPages.add(`${bindingBook}:${page}`));
      addTarget(binding,binding.label||context,{...binding,book:bindingBook,pages,regionIds:binding.regionIds});
     }
     const regions=stringIds(value.verification?.regions);
     for(const page of citationPages){
      if(bindings.length&&boundPages.has(`${key}:${page}`))continue;
      const pageRegions=citationPages.length===1?regions:[];
      addTarget(value,context,{book:key,pages:[page],regionIds:pageRegions,...(regions.length&&citationPages.length>1?{unmappedRegionIds:regions}:{}),reviewStatus:pageRegions.length?'region-verified':'pending'});
     }
    }
   }
   for(const [name,child] of Object.entries(value)){
    if(name==='evidenceBindings'&&Array.isArray(child))continue;
    if(name==='fieldSources'&&child&&typeof child==='object'){
     Object.entries(child).forEach(([field,reference])=>walk(reference,field));
    }else if(name==='price')walk(child,'Purchase price');
    else if(name==='xpRows'&&Array.isArray(child))child.forEach(row=>walk(row,`Level ${row.level} XP`));
    else if(name==='levelChanges'&&Array.isArray(child))child.forEach(row=>walk(row,`Level ${row.level} changes`));
    else if(name==='xpContinuation')walk(child,'XP continuation');
    else if(name==='levelLimit')walk(child,'Level limit');
    else if(name==='progression')walk(child,'Progression');
    else if(child&&typeof child==='object')walk(child,context);
   }
   if(Array.isArray(value.evidenceBindings)&&!citationPages.length){
    for(const binding of value.evidenceBindings)if(binding&&typeof binding==='object')addTarget(binding,binding.label||context,binding);
   }
  }
  walk(item,rootContext||item?.name||item?.title||'Source reference');
  return [...groups.values()].sort((a,b)=>order.indexOf(a.book)-order.indexOf(b.book)).map(g=>({...g,pages:g.pages.sort((a,b)=>a-b)}));
 }
 function targets(item,rootContext=''){return collect(item,rootContext).flatMap(group=>group.targets);}
 function pages(item){return collect(item).flatMap(g=>g.pages.map(page=>({book:g.book,page,pdfPage:books.pdfPage(g.book,page),missing:books.availability(g.book,page)==='missing',availability:books.availability(g.book,page),evidenceAvailability:books.evidenceAvailability(g.book,page),labels:[...new Set(g.contexts.filter(c=>c.page===page).map(c=>c.label))],statuses:[...new Set(g.contexts.filter(c=>c.page===page&&c.status).map(c=>c.status))],targets:g.targets.filter(target=>target.page===page)})));}
 const api=Object.freeze({collect,pages,targets});
 root.FirstEditionCitations=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
