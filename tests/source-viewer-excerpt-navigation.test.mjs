import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const baseline=read('research/source-viewer-navigation-baseline.json');
const data=read('dist/data.json');
const published=read('dist/source-continuations.json');
const require=createRequire(import.meta.url);
const citations=require('../dist/citations.js');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalized=value=>JSON.parse(JSON.stringify(value));

function viewerVM(){
  const source=readFileSync('dist/source-viewer.js','utf8');
  const marker='  root.FirstEditionSourceViewer = Object.freeze({ open, close });';
  assert.ok(source.includes(marker),'source viewer test hook insertion point exists');
  const hooks=`  root.__sourceViewerTestHooks = {
    setState(state = {}) {
      if ('refs' in state) refs = state.refs;
      if ('current' in state) current = state.current;
      if ('regionIndex' in state) regionIndex = state.regionIndex;
      if ('requestedMode' in state) requestedMode = state.requestedMode;
      if ('excerptSource' in state) excerptSource = state.excerptSource;
      if ('excerptCatalog' in state) excerptCatalog = state.excerptCatalog;
      if ('targets' in state) targets = state.targets;
      if ('activeTarget' in state) activeTarget = state.activeTarget;
      if ('targetStatus' in state) targetStatus = state.targetStatus;
      if ('pendingTargetPage' in state) pendingTargetPage = state.pendingTargetPage;
      if ('requestedInitialRegion' in state) requestedInitialRegion = state.requestedInitialRegion;
      if ('targetDismissed' in state) targetDismissed = state.targetDismissed;
      if ('continuations' in state) root.FirstEditionSourceContinuations = state.continuations;
    },
    matchingRegions: typeof matchingRegions === 'function' ? matchingRegions : null,
    navigationDestination: typeof navigationDestination === 'function' ? navigationDestination : null,
    validatedContinuationParts: typeof validatedContinuationParts === 'function' ? validatedContinuationParts : null,
    dismissMismatchedFieldTarget: typeof dismissMismatchedFieldTarget === 'function' ? dismissMismatchedFieldTarget : null,
    sourceChangeMeta: typeof sourceChangeMeta === 'function' ? sourceChangeMeta : null,
    state() { return {current, regionIndex, requestedMode, activeTarget, targetStatus, pendingTargetPage, targetDismissed}; }
  };\n`;
  const instrumented=source.replace(marker,hooks+marker);
  const context={
    document:{currentScript:{src:'https://unit.test/dist/source-viewer.js'},baseURI:'https://unit.test/dist/'},
    location:{origin:'https://unit.test'},
    URL,
    FirstEditionBooks:{
      books:{PHB:{lastPage:238},UA:{lastPage:160},DMG:{lastPage:240},MM:{lastPage:112},MM2:{lastPage:160}},
      code:value=>value,
      pdfPage:(book,page)=>book==='MM'&&page===112?113:book==='MM2'&&page===83?92:page+1,
      privateEvidence:()=>null,
      title:book=>book,
      mapping:()=>'',
    },
    FirstEditionSourceContinuations:published,
  };
  vm.createContext(context);
  vm.runInContext(instrumented,context,{filename:'dist/source-viewer.js (instrumented test VM)'});
  return {context,hooks:context.__sourceViewerTestHooks};
}

function fixtureCatalog(){
  return {
    schemaVersion:1,itemId:'navigation-fixture',collection:'equipment',scope:'Synthetic unit-test catalog.',
    sources:{PHB:{sha256:'a'.repeat(64),hashStatus:'computed-local'},UA:{sha256:'b'.repeat(64),hashStatus:'computed-local'}},
    regions:[
      {id:'phb-35-row-one',book:'PHB',printedPage:35,pdfPage:36,role:'source',image:'phb-35-row-one.png',sha256:'1'.repeat(64),focusRects:[[.1,.1,.2,.1]]},
      {id:'phb-35-row-two',book:'PHB',printedPage:35,pdfPage:36,role:'source',image:'phb-35-row-two.png',sha256:'2'.repeat(64),focusRects:[[.4,.2,.2,.1]]},
      {id:'phb-35-context',book:'PHB',printedPage:35,pdfPage:36,role:'context',image:'phb-35-context.png',sha256:'3'.repeat(64),focusRects:[]},
      {id:'phb-37-row',book:'PHB',printedPage:37,pdfPage:38,role:'source',image:'phb-37-row.png',sha256:'4'.repeat(64),focusRects:[[.2,.2,.2,.1]]},
      {id:'ua-28-row',book:'UA',printedPage:28,pdfPage:29,role:'source',image:'ua-28-row.png',sha256:'5'.repeat(64),focusRects:[[.3,.3,.2,.1]]},
    ],
  };
}

test('frozen pre-feature fixture records page-only navigation and dropdown-only same-page excerpts',()=>{
  assert.equal(baseline.commit,'93cd2bf3645842792c6a1bcb3858915c42aab0c3');
  assert.equal(baseline.sourceViewer.previousNextMeaning,'cited pages only');
  assert.equal(baseline.sourceViewer.samePageExcerptSelection,'dropdown');
  assert.equal(baseline.sourceViewer.linkedPartsShownTogether,false);
  assert.equal(baseline.sourceViewer.compiledContinuationAssetPresent,false);
  assert.equal(baseline.exposedData.knownContinuationGroups,14);
  assert.equal(baseline.exposedData.knownRequiredSegments,28);
});

test('navigation destination walks every ordered excerpt then the next cited page and reverses exactly',()=>{
  const {hooks}=viewerVM();
  assert.equal(typeof hooks.navigationDestination,'function','navigationDestination(direction) is required for excerpt-level arrow stepping');
  assert.equal(typeof hooks.matchingRegions,'function','navigation uses the same filtered and context-sorted excerpt list as the viewer');
  const refs=[{book:'PHB',page:35,labels:[]},{book:'PHB',page:37,labels:[]},{book:'UA',page:28,labels:[]}];
  const catalog=fixtureCatalog();
  hooks.setState({refs,current:0,regionIndex:0,requestedMode:'excerpts',excerptSource:{itemId:catalog.itemId,collection:catalog.collection,catalog:'scans/verified/navigation-fixture.json',url:'https://unit.test/dist/scans/verified/navigation-fixture.json'},excerptCatalog:catalog,targets:[],activeTarget:null,targetStatus:'',targetDismissed:false});
  const rows=normalized(hooks.matchingRegions());
  assert.deepEqual(rows.map(region=>region.id),['phb-35-row-one','phb-35-row-two','phb-35-context'],'context region stays after the selected fact excerpts');
  const stops=[
    {referenceIndex:0,regionIndex:0},{referenceIndex:0,regionIndex:1},{referenceIndex:0,regionIndex:2},
    {referenceIndex:1,regionIndex:0},{referenceIndex:2,regionIndex:0},
  ];
  for(let index=0;index<stops.length;index++){
    hooks.setState({current:stops[index].referenceIndex,regionIndex:stops[index].regionIndex,requestedMode:'excerpts'});
    const next=hooks.navigationDestination(1);
    assert.deepEqual(normalized(next),stops[index+1]||null,`next stop after ${JSON.stringify(stops[index])}`);
    if(index<stops.length-1){
      hooks.setState({current:stops[index+1].referenceIndex,regionIndex:stops[index+1].regionIndex,requestedMode:'excerpts'});
      assert.deepEqual(normalized(hooks.navigationDestination(-1)),stops[index],`previous from ${JSON.stringify(stops[index+1])}`);
    }
  }
});

test('a pending field target or cited page without excerpts remains crop-free while page stepping continues',()=>{
  const {hooks}=viewerVM();
  assert.equal(typeof hooks.navigationDestination,'function','excerpt navigation helper is required');
  const catalog=fixtureCatalog();
  const refs=[{book:'PHB',page:35,labels:[]},{book:'PHB',page:37,labels:[]},{book:'DMG',page:175,labels:[]}];
  const pending={book:'PHB',page:37,regionIds:[],fieldPointer:'/fields/weight',targetStatus:'pending',reviewStatus:'field-target-pending'};
  hooks.setState({refs,current:0,regionIndex:2,requestedMode:'excerpts',excerptSource:{itemId:catalog.itemId,collection:catalog.collection,catalog:'scans/verified/navigation-fixture.json',url:'https://unit.test/dist/scans/verified/navigation-fixture.json'},excerptCatalog:catalog,targets:[pending],activeTarget:pending,targetStatus:'pending',pendingTargetPage:{book:'PHB',page:37},targetDismissed:false});
  assert.deepEqual(normalized(hooks.navigationDestination(1)),{referenceIndex:1,regionIndex:-1},'pending page has no auto-selected excerpt');
  assert.equal(hooks.state().activeTarget,pending,'stepping does not drop the field target');
  assert.equal(hooks.state().targetStatus,'pending');
  hooks.setState({current:1,regionIndex:-1,requestedMode:'pdf'});
  assert.deepEqual(normalized(hooks.navigationDestination(1)),{referenceIndex:2,regionIndex:-1},'the next cited page remains reachable even when it has no published excerpt');
  hooks.setState({current:2,regionIndex:-1,requestedMode:'pdf'});
  assert.deepEqual(normalized(hooks.navigationDestination(-1)),{referenceIndex:1,regionIndex:-1});
});

test('explicit initial region is one-time and does not override the first excerpt on a later page stop',()=>{
  const {hooks}=viewerVM();
  assert.equal(typeof hooks.navigationDestination,'function');
  const catalog=fixtureCatalog();
  const refs=[{book:'PHB',page:37,labels:[]},{book:'PHB',page:35,labels:[]}];
  hooks.setState({refs,current:0,regionIndex:0,requestedMode:'excerpts',excerptSource:{itemId:catalog.itemId,collection:catalog.collection,catalog:'scans/verified/navigation-fixture.json',url:'https://unit.test/dist/scans/verified/navigation-fixture.json'},excerptCatalog:catalog,targets:[],activeTarget:null,targetStatus:'',targetDismissed:false,requestedInitialRegion:{book:'PHB',page:35,id:'phb-35-row-two'}});
  const destination=normalized(hooks.navigationDestination(1));
  assert.deepEqual(destination,{referenceIndex:1,regionIndex:0},'a prior explicit deep-link preference must not select a later page’s nondefault excerpt');
  assert.equal(normalized(hooks.matchingRegions(refs[1]))[destination.regionIndex].id,'phb-35-row-one','the first excerpt in page order is the default stop');
});

test('bounded full-data selected-catalog navigation has no missing stops, cycles, or non-invertible edges',()=>{
  const {hooks}=viewerVM();
  assert.equal(typeof hooks.navigationDestination,'function','navigationDestination(direction) is required');
  const names=['rules','spells','equipment','classes','matrices'];
  const catalogCache=new Map();
  let recordsInspected=0,catalogItems=0,selectedCatalogPageStops=0,selectedCatalogExcerptStops=0,totalStops=0;
  const refsFor=item=>citations.collect(item).flatMap(group=>group.pages.map(page=>({book:group.book,page,labels:[]})));
  const owners=names.flatMap(collection=>(data[collection]||[]).map(item=>({collection,item}))).concat([{collection:'progressionExplainer',item:data.progressionExplainer}]);
  for(const {collection,item} of owners){
      recordsInspected++;
      const verification=item.sourceExcerpts||item.scanVerification;
      if(!verification?.catalog)continue;
      let catalog=catalogCache.get(verification.catalog);
      if(!catalog){catalog=read(`dist/${verification.catalog}`);catalogCache.set(verification.catalog,catalog);}
      if(catalog.itemId!==item.id)continue;
      const refs=refsFor(item);
      if(!refs.length)continue;
      catalogItems++;
      const source={itemId:item.id,collection:catalog.collection,catalog:verification.catalog,url:`https://unit.test/dist/${verification.catalog}`,state:verification.state};
      hooks.setState({refs,current:0,regionIndex:0,requestedMode:'excerpts',excerptSource:source,excerptCatalog:catalog,targets:[],activeTarget:null,targetStatus:'',pendingTargetPage:null,targetDismissed:false});
      const expected=[];
      refs.forEach((ref,referenceIndex)=>{
        const pageRegions=catalog.regions.filter(region=>region.book===ref.book&&region.printedPage===ref.page).sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
        selectedCatalogPageStops++;
        if(pageRegions.length){
          pageRegions.forEach((_,regionIndex)=>expected.push({referenceIndex,regionIndex}));
          selectedCatalogExcerptStops+=pageRegions.length;
        }else expected.push({referenceIndex,regionIndex:-1});
      });
      assert.ok(expected.length,`${collection}:${item.id} has at least one citation stop`);
      totalStops+=expected.length;
      const visited=new Set();
      for(let index=0;index<expected.length;index++){
        const stop=expected[index],key=`${stop.referenceIndex}:${stop.regionIndex}`;
        assert.equal(visited.has(key),false,`${collection}:${item.id} has no expected-stop cycle`);visited.add(key);
        hooks.setState({current:stop.referenceIndex,regionIndex:stop.regionIndex,requestedMode:'excerpts'});
        assert.deepEqual(normalized(hooks.navigationDestination(1)),expected[index+1]||null,`${collection}:${item.id} next from ${key}`);
        if(index>0){
          hooks.setState({current:stop.referenceIndex,regionIndex:stop.regionIndex,requestedMode:'excerpts'});
          assert.deepEqual(normalized(hooks.navigationDestination(-1)),expected[index-1],`${collection}:${item.id} previous from ${key}`);
        }
      }
      assert.equal(visited.size,expected.length,`${collection}:${item.id} every stop is reachable exactly once`);
  }
  assert.equal(recordsInspected,993,'the denominator covers every current core exposed record');
  assert.equal(catalogItems,993,'all current owners have one selected catalog');
  assert.equal(selectedCatalogPageStops,1959,'the denominator covers every current cited book/page group');
  assert.equal(selectedCatalogExcerptStops,2666,'the denominator covers every region node on those cited pages');
  assert.equal(totalStops,2667,'one cited page with no published crop remains an explicit page-level stop');
});

test('a target-promoted region keeps its captured ID when selecting another region clears field semantics',()=>{
  const {hooks}=viewerVM();
  assert.equal(typeof hooks.navigationDestination,'function');
  assert.equal(typeof hooks.dismissMismatchedFieldTarget,'function');
  assert.equal(typeof hooks.sourceChangeMeta,'function');
  const catalog=fixtureCatalog(),refs=[{book:'PHB',page:35,labels:[]}];
  const target={book:'PHB',page:35,regionIds:['phb-35-row-two'],label:'Purchase price',fieldPointer:'/price',targetStatus:'resolved',reviewStatus:'field-target-reviewed'};
  hooks.setState({refs,current:0,regionIndex:0,requestedMode:'excerpts',excerptSource:{itemId:catalog.itemId,collection:catalog.collection,catalog:'scans/verified/navigation-fixture.json',url:'https://unit.test/dist/scans/verified/navigation-fixture.json'},excerptCatalog:catalog,targets:[target],activeTarget:target,targetStatus:'',targetDismissed:false});
  const promoted=normalized(hooks.matchingRegions());
  assert.deepEqual(promoted.map(region=>region.id),['phb-35-row-two','phb-35-row-one','phb-35-context'],'the resolved target is promoted from its natural catalog index 1');
  const selectedRegion=promoted[1];
  assert.equal(selectedRegion.id,'phb-35-row-one','the user selects a different part from the reordered list');
  hooks.dismissMismatchedFieldTarget(refs[0],selectedRegion);
  const natural=normalized(hooks.matchingRegions());
  assert.deepEqual(natural.map(region=>region.id),['phb-35-row-one','phb-35-row-two','phb-35-context'],'clearing field semantics restores natural catalog order');
  const stableRegionIndex=natural.findIndex(region=>region.id===selectedRegion.id);
  assert.equal(stableRegionIndex,0,'the selected region is recovered by ID after order changes');
  hooks.setState({regionIndex:stableRegionIndex});
  assert.equal(normalized(hooks.matchingRegions())[hooks.state().regionIndex].id,selectedRegion.id,'the selected exact region remains displayed');
  assert.deepEqual(normalized(hooks.sourceChangeMeta(refs[0],selectedRegion.id)),{activeTarget:false},'a non-target excerpt drops the active field semantics');
  const next=hooks.navigationDestination(1);
  assert.deepEqual(normalized(next),{referenceIndex:0,regionIndex:1});
  assert.equal(normalized(hooks.matchingRegions())[next.regionIndex].id,'phb-35-row-two','the next stop follows natural order from the captured selected ID, not the stale old index');
});

test('validated continuation parts preserve independent focus metadata and reject changed source or image hashes',()=>{
  const {hooks}=viewerVM();
  assert.equal(typeof hooks.validatedContinuationParts,'function','validatedContinuationParts(ref, selectedRegion) is required');
  const item=data.spells.find(record=>record.id==='ua-cleric-abjure');
  const verification=item.sourceExcerpts||item.scanVerification;
  const catalog=read(`dist/${verification.catalog}`);
  const group=published.groups.find(candidate=>candidate.id==='ua-cleric-abjure-ua-37');
  assert.ok(group,'Abjure is an explicit current continuation group');
  const opening=catalog.regions.find(region=>region.id==='ua-37-e35d106ad24ba65c');
  const continuation=catalog.regions.find(region=>region.id==='ua-37-47646031f5b262d9');
  assert.deepEqual(opening.focusRects,[[0,0,1,1]]);
  assert.deepEqual(continuation.focusRects,[[0,0,1,1]]);
  hooks.setState({refs:[{book:'UA',page:37,labels:[]}],current:0,regionIndex:1,requestedMode:'excerpts',excerptSource:{itemId:item.id,collection:'spells',catalog:verification.catalog,url:'https://unit.test/dist/'+verification.catalog},excerptCatalog:catalog,continuations:published,targets:[],activeTarget:null});
  const linked=hooks.validatedContinuationParts({book:'UA',page:37},continuation);
  assert.ok(linked,'exact owner/catalog/source/image bindings produce a linked passage');
  assert.equal(linked.group.id,group.id);
  assert.deepEqual(normalized(linked.parts.map(part=>({regionId:part.region.id,order:part.segment.order,role:part.segment.role,selected:part.selected}))),[
    {regionId:'ua-37-e35d106ad24ba65c',order:1,role:'opening',selected:false},
    {regionId:'ua-37-47646031f5b262d9',order:2,role:'continuation',selected:true},
  ]);
  assert.deepEqual(normalized(linked.parts.map(part=>part.region.focusRects)),[[[0,0,1,1]],[[0,0,1,1]]],'each part retains its own focus rectangles; no focus is borrowed from the other region');
  const stale=structuredClone(published);
  stale.groups.find(candidate=>candidate.id===group.id).segments[1].imageSha256='0'.repeat(64);
  hooks.setState({continuations:stale});
  assert.equal(hooks.validatedContinuationParts({book:'UA',page:37},continuation),null,'changed segment image hash suppresses the linked continuation');
  assert.equal(hooks.validatedContinuationParts({book:'UA',page:36},continuation),null,'a wrong selected page cannot activate the pair');
});

test('the cross-page continuation mechanism accepts only a clearly synthetic test pair',()=>{
  const {hooks}=viewerVM();
  assert.equal(typeof hooks.validatedContinuationParts,'function','linked-parts validator is required');
  const item=data.equipment.find(record=>record.id==='phb-arrow');
  const verification=item.sourceExcerpts||item.scanVerification;
  const catalog=read(`dist/${verification.catalog}`);
  const first=catalog.regions.find(region=>region.id==='phb-arrow-phb35-1');
  const second=catalog.regions.find(region=>region.id==='phb-arrow-phb37-3');
  assert.ok(first&&second,'two actual catalog regions can exercise ordering without asserting they form a real passage');
  const synthetic={...structuredClone(published),scope:'Synthetic test fixture only; this pairing is not a source claim.',groups:[{
    id:'synthetic-only-cross-page-navigation-test',collection:'equipment',itemId:'phb-arrow',catalog:verification.catalog,
    segments:[
      {order:1,role:'opening',book:'PHB',printedPage:first.printedPage,pdfPage:first.pdfPage,regionId:first.id,image:first.image,imageSha256:first.sha256,sourceSha256:catalog.sources.PHB.sha256,state:'present'},
      {order:2,role:'continuation',book:'PHB',printedPage:second.printedPage,pdfPage:second.pdfPage,regionId:second.id,image:second.image,imageSha256:second.sha256,sourceSha256:catalog.sources.PHB.sha256,state:'present'},
    ],
  }]};
  hooks.setState({refs:[{book:'PHB',page:first.printedPage},{book:'PHB',page:second.printedPage}],current:1,regionIndex:0,requestedMode:'excerpts',excerptSource:{itemId:item.id,collection:'equipment',catalog:verification.catalog,url:'https://unit.test/dist/'+verification.catalog},excerptCatalog:catalog,continuations:synthetic,targets:[],activeTarget:null});
  const linked=hooks.validatedContinuationParts({book:'PHB',page:second.printedPage},second);
  assert.ok(linked,'synthetic page crossing exercises the mechanism only');
  assert.match(linked.group.id,/^synthetic-only-/);
  assert.deepEqual(normalized(linked.parts.map(part=>[part.segment.printedPage,part.region.id,part.selected])),[[first.printedPage,first.id,false],[second.printedPage,second.id,true]]);
  assert.match(synthetic.scope,/not a source claim/);
});
