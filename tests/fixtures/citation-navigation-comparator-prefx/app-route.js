function parseReferenceRoute(hashValue=location.hash) {
 const [path,query=''] = hashValue.slice(1).split('?',2), parts=path.split('/');
 const routeView=views.includes(parts[0])?parts[0]:'spells';
 let id='';try{id=decodeURIComponent(parts.slice(1).join('/'));}catch{}
 const params=new URLSearchParams(query),match=params.get('source')?.match(/^(PHB|UA|DMG|MM|MM2):(\d+)$/),region=params.get('region'),fieldPointer=params.get('field'),pending=params.get('target')==='pending',owner=params.get('owner')?.match(/^(rules|spells|equipment|classes|matrices):([a-z0-9][a-z0-9-]{0,100})$/);
 return {view:routeView,id,owner:owner?{view:owner[1],id:owner[2]}:null,source:match?{book:match[1],page:Number(match[2]),...(region&&region.length<=200?{region}: {}),...(fieldPointer&&fieldPointer.length<=250?{fieldPointer}: {}),...(pending&&!region?{targetStatus:'pending'}:{})}:null};
}
function sourceLinkHash(routeView,id,ref,owner=null,targetStatus='',activeTarget=null) {
 return `#${routeView}/${encodeURIComponent(id)}?source=${encodeURIComponent(`${ref.book}:${ref.page}`)}${ref.region?`&region=${encodeURIComponent(ref.region)}`:''}${targetStatus==='pending'&&!ref.region?'&target=pending':''}${activeTarget?.fieldPointer?`&field=${encodeURIComponent(activeTarget.fieldPointer)}`:''}${owner?`&owner=${encodeURIComponent(`${owner.view}:${owner.id}`)}`:''}`;
}
function syncSelectionRoute(previousId){
 if(previousId===selectedId)return;
 const hash=`#${view}${selectedId?`/${encodeURIComponent(selectedId)}`:''}`;
 if(location.hash!==hash)history.replaceState(null,'',hash);
 renderedRouteHash=location.hash;
}
function routeSourceOwner(target) {
 if(!data[target.view]?.some(entry=>entry.id===target.id))return null;
 if(!target.owner)return data[target.view]?.find(entry=>entry.id===target.id);
 const allowed=[...document.querySelectorAll('[data-source-context]')].some(el=>el.dataset.sourceContext===target.owner.id&&(el.dataset.sourceView||target.view)===target.owner.view);
 if(!allowed)return null;
 if(target.owner.id==='progression-explainer'&&target.owner.view==='classes'&&data.progressionExplainer)return {...data.progressionExplainer,id:target.owner.id};
 return data[target.owner.view]?.find(entry=>entry.id===target.owner.id);
}
function route({force=false}={}) {
 if(!force&&renderedRouteHash===location.hash)return;
 clearTimeout(referenceSearchTimer);
 const target=parseReferenceRoute(), oldView=view;
 view=target.view;
 if(oldView!==view)listLimit=50;
 if(oldView!==view){filter={q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();}
 selectedId=target.id;
 render();
 renderedRouteHash=location.hash;
 const item=routeSourceOwner(target);
 const references=item?FirstEditionCitations.collect(item):[];
 const valid=target.source&&references.some(group=>bookCode(group.book)===target.source.book&&group.pages.includes(target.source.page));
 if(valid){
  const allTargets=FirstEditionCitations.targets(item);
  const activeTarget=target.source.fieldPointer?allTargets.find(candidate=>candidate.book===target.source.book&&candidate.page===target.source.page&&candidate.fieldPointer===target.source.fieldPointer):null;
  const targets=target.source.fieldPointer?allTargets.filter(candidate=>candidate.fieldPointer===target.source.fieldPointer):target.source.region?allTargets.filter(candidate=>candidate.regionIds.includes(target.source.region)):allTargets;
  openScanViewer(item,references,item.id,target.source,{fromRoute:true,owner:target.owner,targetStatus:target.source.targetStatus||(target.source.region?'resolved':''),activeTarget,targets,fieldScoped:!!target.source.fieldPointer});
 }
 else globalThis.FirstEditionSourceViewer?.close?.();
}
