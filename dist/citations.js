'use strict';
((root)=>{
 const books=root.FirstEditionBooks||(typeof require==='function'?require('./books.js'):null);
 const order=['PHB','UA','DMG','MM','MM2'];
 // Only structured references are collected. Prose is never parsed into inferred citations.
 function collect(item){
  const groups=new Map(),seen=new WeakSet();
  function walk(value,context='Source reference'){
   if(!value||typeof value!=='object'||seen.has(value))return;
   seen.add(value);
   if(Array.isArray(value)){value.forEach(entry=>walk(entry,context));return;}
   const key=books.code(value.book),info=books.books[key];
   if(info&&Array.isArray(value.pages)){
    const valid=value.pages.filter(p=>Number.isInteger(p)&&p>=1&&p<=info.lastPage);
    if(valid.length){
     if(!groups.has(key))groups.set(key,{book:key,pages:[],labels:[],contexts:[],statuses:[]});
     const group=groups.get(key),label=value.label||context;
     for(const page of valid){
      if(!group.pages.includes(page))group.pages.push(page);
      if(label&&!group.contexts.some(c=>c.page===page&&c.label===label&&c.status===value.status))group.contexts.push({page,label,...(value.status?{status:value.status}:{})});
     }
     if(label&&!group.labels.includes(label))group.labels.push(label);
     if(value.status&&!group.statuses.includes(value.status))group.statuses.push(value.status);
    }
   }
   for(const [name,child] of Object.entries(value)){
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
  }
  walk(item,item?.name||item?.title||'Source reference');
  return [...groups.values()].sort((a,b)=>order.indexOf(a.book)-order.indexOf(b.book)).map(g=>({...g,pages:g.pages.sort((a,b)=>a-b)}));
 }
 function pages(item){return collect(item).flatMap(g=>g.pages.map(page=>({book:g.book,page,pdfPage:books.pdfPage(g.book,page),missing:books.availability(g.book,page)==='missing',availability:books.availability(g.book,page),labels:[...new Set(g.contexts.filter(c=>c.page===page).map(c=>c.label))],statuses:[...new Set(g.contexts.filter(c=>c.page===page&&c.status).map(c=>c.status))]})));}
 const api=Object.freeze({collect,pages});
 root.FirstEditionCitations=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
