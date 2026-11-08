#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const app=readFileSync(resolve(root,'dist/app.js'),'utf8');
const citationsSource=readFileSync(resolve(root,'dist/citations.js'),'utf8');
const dataBytes=readFileSync(resolve(root,'dist/data.json'));
const data=JSON.parse(dataBytes);
const citations=require('../dist/citations.js');
const {buildPriceSourceInventory,validatePriceSourceInventory}=await import('./price-source-inventory.mjs');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const lineOf=(source,needle)=>source.slice(0,source.indexOf(needle)).split('\n').length;
const lines=app.split('\n');
const inlineProducerSites=lines.flatMap((line,index)=>line.includes('inlineSourceChip(')&&!line.includes('function inlineSourceChip(')?[{line:index+1,producerClass:(line.match(/inlineSourceChip\([^,]*/)||['inlineSourceChip'])[0].slice(0,100)}]:[]);
const producerClassByFunction={
 attributeLayoutHTML:'field-attribute-layout',
 suggestedPriceHTML:'equipment-estimate-comparison',
 equipmentDetailHTML:'equipment-related-reference',
 progressionExplainerHTML:'progression-explainer-reference',
 advancementControlsHTML:'class-advancement',
 advancementSummaryHTML:'class-advancement',
 xpTableHTML:'class-xp-table',
 classDetailHTML:'class-progression-reference',
 classAbilitiesHTML:'class-abilities-table-record',
 tableFactSourceChip:'cleric-turning-table-fact',
 calculateXP:'dynamic-xp-result',
 fighterCombatHTML:'fighter-matrix-reference'
};
export function auditInlineProducerSites(source){
 const sourceLines=source.split('\n'),sites=[];let currentFunction='';
 for(let index=0;index<sourceLines.length;index++){
  const line=sourceLines[index],declaration=line.match(/function\s+([A-Za-z0-9_$]+)\s*\(/);
  if(declaration)currentFunction=declaration[1];
  if(!line.includes('inlineSourceChip(')||line.includes('function inlineSourceChip('))continue;
  const producerClass=producerClassByFunction[currentFunction];
  if(!producerClass)throw new Error(`Unclassified citation chip producer at dist/app.js:${index+1} in ${currentFunction||'(top level)'}`);
  sites.push({line:index+1,function:currentFunction,producerClass});
 }
 return {sites,classes:[...new Set(sites.map(site=>site.producerClass))].sort()};
}
const routeQueryNames=['source','region','field','fieldOwner','target','owner'];
export function auditRouteQueryContract(source){
 const start=source.indexOf('function parseReferenceRoute('),end=source.indexOf('\nfunction routeSourceOwner(',start);
 const parser=source.slice(start,end),builderStart=source.indexOf('function sourceLinkHash('),builderEnd=source.indexOf('\nfunction syncSelectionRoute(',builderStart);
 const builder=source.slice(builderStart,builderEnd);
 const parsed=[...new Set([...parser.matchAll(/params\.get\(['"]([^'"]+)['"]\)/g)].map(match=>match[1]))].sort();
 const serialized=routeQueryNames.filter(name=>new RegExp(`(?:\\?|&)${name}=`).test(builder)).sort();
 const unknown=parsed.filter(name=>!routeQueryNames.includes(name)),missing=routeQueryNames.filter(name=>!parsed.includes(name)||!serialized.includes(name));
 if(unknown.length||missing.length)throw new Error(`Citation route query contract drift: unknown=${unknown.join(',')||'(none)'} missing=${missing.join(',')||'(none)'}`);
 return {parsed,serialized};
}
const sourceAttributes=['data-copy-link','data-inline-source','data-scan-view','data-source-book','data-source-context','data-source-id','data-source-view','data-view-scans'];
const refAttributes=['data-ref-book','data-ref-pages','data-ref-title','data-ref-status','data-ref-targets'];
export function auditSourceNavigationAttributes(source){
 const observed=[...new Set(source.match(/data-(?:copy-link|inline-source|scan-view|view-scans|source-[a-z0-9-]+|ref-[a-z0-9-]+)/g)||[])].sort();
 const allowed=new Set([...sourceAttributes,...refAttributes]);
 const unknown=observed.filter(name=>!allowed.has(name));
 if(unknown.length)throw new Error(`Unclassified citation navigation attribute(s): ${unknown.join(', ')}`);
 return {observed,missing:[...allowed].filter(name=>!observed.includes(name)).sort()};
}
const producerInventory=auditInlineProducerSites(app);
const routeContract=auditRouteQueryContract(app);
const sourceAttributeContract=auditSourceNavigationAttributes(app);
const testFiles=[
 'tests/citation-navigation.test.mjs','tests/citations.test.mjs','tests/source-viewer-permalink.browser.mjs',
 'tests/source-viewer-field-targets.browser.mjs','tests/source-viewer-header.browser.mjs',
 'tests/source-viewer.browser.mjs','tests/general-source-viewer.browser.mjs','tests/advancement-browser.mjs',
 'tests/browser.mjs','tests/accessibility.mjs'
];
const testInventory=testFiles.map(path=>{
 const source=readFileSync(resolve(root,path),'utf8');
 const titles=[...source.matchAll(/test\(['"`]([^'"`]+)['"`]/g)].map(match=>match[1]);
 return {path,nodeTestCases:titles.length?titles:undefined,titleSamples:titles.length?titles:undefined,
  execution:path==='tests/citation-navigation.test.mjs'||path==='tests/citations.test.mjs'?'passed in this capture':
   ['tests/source-viewer-permalink.browser.mjs','tests/source-viewer-field-targets.browser.mjs','tests/general-source-viewer.browser.mjs'].includes(path)?'passed in this capture':
   'not run in this capture'};
});
const collectionNames=['spells','rules','equipment','classes','matrices'];
const collections=Object.fromEntries(collectionNames.map(name=>{
 const items=Array.isArray(data[name])?data[name]:[];
 let citedEntries=0,pageGroups=0,printedPageOccurrences=0,targets=0,fieldSourceObjects=0,relatedReferences=0,fieldScopedTargets=0,resolvedTargets=0,pendingTargets=0;
 for(const item of items){
  const groups=citations.collect(item);
  if(groups.length)citedEntries++;
  pageGroups+=groups.length;
  printedPageOccurrences+=groups.reduce((sum,group)=>sum+group.pages.length,0);
  const itemTargets=citations.targets(item);
  targets+=itemTargets.length;
  fieldScopedTargets+=itemTargets.filter(target=>target.fieldPointer).length;
  resolvedTargets+=itemTargets.filter(target=>target.targetStatus==='resolved').length;
  pendingTargets+=itemTargets.filter(target=>target.targetStatus==='pending').length;
  fieldSourceObjects+=Object.keys(item.fieldSources||{}).length;
  relatedReferences+=(item.references||[]).length;
 }
 return [name,{entries:items.length,citedEntries,pageGroups,printedPageOccurrences,targets,fieldScopedTargets,resolvedTargets,pendingTargets,fieldSourceObjects,relatedReferences}];
}));
const inventory=buildPriceSourceInventory({equipment:data.equipment,data});
const validation=validatePriceSourceInventory(inventory,{equipment:data.equipment,data});
const comparisonBindings=inventory.fieldEvidenceBindings.filter(binding=>binding.fieldPointer.startsWith('/suggestedPrice/comparisons/'));
const comparisonBinding=comparisonBindings.find(binding=>binding.itemId==='phb-bo-stick'&&binding.fieldPointer==='/suggestedPrice/comparisons/0');
const comparisonOrigin=data.equipment.find(item=>item.id==='phb-bo-stick');
const comparisonRef={...comparisonOrigin.suggestedPrice.comparisons[0],evidenceBindings:[comparisonBinding]};
const projectedComparisonTarget=citations.targets(comparisonRef)[0];
const comparisonSourceItem=data.equipment.find(item=>item.id==='phb-spear');
const comparisonSourceTargets=citations.targets(comparisonSourceItem);
const preFixFixtureDirectory=resolve(root,'tests/fixtures/citation-navigation-comparator-prefx');
const preFixFixtureSources=Object.fromEntries(['app-route.js','citations.js','viewer-target-state.js'].map(name=>[name,sha256(readFileSync(resolve(preFixFixtureDirectory,name)))]));
const explainer=data.progressionExplainer;
const historyEvidence={
 tests:{
  directSourcePage:'tests/source-viewer-permalink.browser.mjs',
  copyCloseBackForward:'tests/source-viewer-permalink.browser.mjs',
  exactRegionAndStaleRegion:'tests/source-viewer-permalink.browser.mjs',
  directViewerFieldPending:'tests/source-viewer-field-targets.browser.mjs',
  nestedOwnerReload:'tests/source-viewer-permalink.browser.mjs'
 },
 caveat:'Nested owner reload currently asserts displayed source item only. The comparison fixture has no attached field target in dist/data.json at capture time; it does not test origin field identity on reload.'
};
const report={
 schemaVersion:1,
 purpose:'Static route/control coverage baseline for citation navigation. This file records the dirty working-tree snapshot and currently implemented test coverage; it is not a claim that every click path passed.',
 snapshot:{gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),workingTreeDirty:true,files:{'dist/app.js':sha256(app),'dist/citations.js':sha256(citationsSource),'dist/data.json':sha256(dataBytes)}},
 rootViews:['spells','rules','equipment','classes','notebook','sources'],
 additionalCollections:[
  {name:'matrices',entries:(data.matrices||[]).length,route:'not a root view; opened through source-owner context in matrix citations'},
  {name:'progressionExplainer',exists:!!explainer,sections:(explainer?.sections||[]).length,route:'synthetic owner id progression-explainer within classes view'}
 ],
 counts:{collections,progressionExplainer:explainer?{pageGroups:citations.collect(explainer).length,targets:citations.targets(explainer).length,sections:(explainer.sections||[]).length,referenceObjects:(explainer.sections||[]).reduce((n,s)=>n+(s.references||[]).length,0)}:null,
  assembledReleaseInventory:data.release?.priceInventory??null,
  currentInMemoryInventory:{validation:'passed',fieldEvidenceBindings:inventory.counts.fieldEvidenceBindings,regionBoundBindings:inventory.counts.regionBoundBindings,pendingRegionBindings:inventory.counts.pendingRegionBindings,comparisonBindings:comparisonBindings.length,comparisonBindingsWithSourceOwner:comparisonBindings.filter(binding=>binding.sourceOwner).length}},
 urlContract:{
  parserLine:lineOf(app,'function parseReferenceRoute('),
  sourceOwnerResolverLine:lineOf(app,'function routeSourceOwner('),
  routeDispatcherLine:lineOf(app,'function route('),
  serializedParameters:['source=BOOK:printedPage','region=exact-region-id','field=JSON-Pointer','target=pending','owner=collection:item-id'],
  sourceControls:['data-source-id','data-view-scans','data-inline-source','data-copy-link'],
  path: 'The path view/id identifies the route entry. owner=collection:id selects the contextual item used to render the cited source. This creates two identities for comparator citations: estimate owner in the path, comparator source item in owner query.'
 },
 producerScanner:{classes:producerInventory.classes,siteCount:producerInventory.sites.length,sites:producerInventory.sites,routeQueryContract:routeContract,sourceAttributeContract},
 citationControlClasses:[
  {id:'entry-book-page-chip',producer:'sourceChip(item)',line:lineOf(app,'function sourceChip('),selector:'data-source-id',scope:['spells','rules','equipment','classes'],identity:'page-level; caller chooses the clicked book group'},
  {id:'view-all-original-scans',producer:'originalScansButton(item)',line:lineOf(app,'function originalScansButton('),selector:'data-view-scans',scope:['spells','rules','equipment','classes'],identity:'page-list viewer; no clicked field target'},
  {id:'inline-source-chip',producer:'inlineSourceChip(reference,title)',line:lineOf(app,'function inlineSourceChip('),selector:'data-inline-source',scope:['spells','rules','equipment','classes','matrices','progressionExplainer'],identity:'passes target metadata serialized by FirstEditionCitations.targets(reference)'},
  {id:'equipment-field-source',producer:'attributeLayoutHTML / attributeRows',lines:[93,95],scope:['equipment','spell fieldSources when compact layout is used'],identity:'fieldSources values create chips; equipment table mode has a source column'},
  {id:'equipment-comparator',producer:'suggestedPriceHTML',line:359,selector:'data-source-context',scope:['equipment'],identity:'origin estimate path + comparator source-owner context; reload field-target identity gap reported'},
  {id:'equipment-related-reference',producer:'equipment detail references',line:368,scope:['equipment'],identity:'nested reference chip under equipment owner'},
  {id:'class-progression-and-level',producer:'progression/XP/level-limit/level-change chips',lines:[410,467,475,485,495,505,508,517],scope:['classes'],identity:'some are dynamically regenerated by advancement controls and re-bound'},
  {id:'class-abilities-table-record',producer:'classAbilitiesHTML',line:lineOf(app,'function classAbilitiesHTML('),scope:['classes'],identity:'record-level citation for the Cleric turning table; its enclosing source context is explicitly rules:cleric-turning-table. This is a page/group reference, not an individual fact target.'},
  {id:'cleric-turning-table-fact',producer:'tableFactSourceChip',line:lineOf(app,'function tableFactSourceChip('),scope:['rules:cleric-turning-table'],identity:'renders one of 32 reviewed table facts across row, symbol, procedure, footnote and progression kinds only when a unique matching focus and exact rules owner, printed/PDF page, field pointer, source object, catalog, region and verification region are present; otherwise it fails closed to a pending placeholder. This bounded table check does not classify generic inline chips as reviewed.'},
  {id:'fighter-matrix-context',producer:'fighterCombatHTML',line:549,scope:['classes','matrices'],identity:'source context changes to matrix owner'},
  {id:'copy-reference-address',producer:'detail footer data-copy-link handler',line:606,selector:'data-copy-link',scope:['spells','rules','equipment','classes'],identity:'copies entry route without source query'}
 ],
 inlineProducerSites,
 urlStateCoverage:[
  {state:'generic page route',implemented:true,test:'citation-navigation.test.mjs; source-viewer-permalink.browser.mjs'},
  {state:'field target resolved to explicit region',implemented:true,test:'citation-navigation.test.mjs; source-viewer-field-targets.browser.mjs'},
  {state:'field target pending without region',implemented:true,test:'citation-navigation.test.mjs; source-viewer-field-targets.browser.mjs'},
  {state:'explicit valid region permalink',implemented:true,test:'source-viewer-permalink.browser.mjs'},
  {state:'stale region ID retained as unavailable',implemented:true,test:'source-viewer-permalink.browser.mjs'},
  {state:'manual selection clears stale/pending route state',implemented:true,test:'source-viewer-permalink.browser.mjs; source-viewer-field-targets.browser.mjs'},
  {state:'owner query validation and standard owner reload',implemented:true,test:'source-viewer-permalink.browser.mjs'},
  {state:'comparison owner reload preserves origin field identity',implemented:false,knownGap:true,detail:'Inventory target fieldPointer belongs to estimate entry in route path while owner query resolves the comparator. Citations target projection drops sourceOwner; route searches target only on the owner item, so active field target is not restored.'},
  {state:'browser copy/close/back/forward',implemented:true,test:'source-viewer-permalink.browser.mjs'},
  {state:'keyboard focus close/reopen and mobile layout',implemented:true,test:'source-viewer-permalink.browser.mjs; source-viewer.browser.mjs; source-viewer-header.browser.mjs'}
 ],
 existingTestClasses:testInventory,
 observedGaps:[
  {id:'comparison-origin-owner-roundtrip',severity:'high',repro:'Build and attach price inventory in-memory; `phb-bo-stick` comparison 0 produces `/suggestedPrice/comparisons/0` with `sourceOwner=equipment:phb-spear`. `FirstEditionCitations.targets(comparison)` omits sourceOwner. The direct click is contextualized to phb-spear, and on reload app route searches that field pointer only in phb-spear targets, where it is absent. Current served dist/data.json has 662 field bindings while the current inventory builder validates 668, including six new comparator bindings; therefore the exact field-target round trip is not exercised by the current browser fixture. Existing browser assertion checks only that the reloaded viewer title is Spear; it does not assert field target identity/label, pending notice or exact target list.'},
  {id:'field-navigation-integration-surface',severity:'medium',repro:'Current viewer field-target browser test invokes FirstEditionSourceViewer.open() directly. Current app-level citation navigation unit test uses synthetic refs and source-function extraction; no browser test clicks an assembled equipment field target and then reloads that exact field URL.'},
  {id:'detail-copy-link',severity:'low',repro:'The `Copy reference link` footer button copies only `#view/id`; no test asserts it or clarifies that it intentionally copies item-level rather than active source location.'},
  {id:'source-layout-coverage',severity:'low',repro:'Compact equipment/spell field-source layout emits inline chips, but spell table layout omits the source column (`attributeLayoutHTML` conditionally emits it only for equipment). No test verifies citations remain discoverable across compact/table toggles for spells.'},
  {id:'collection-route-matrix',severity:'low',repro:'Matrices are source-owner targets rather than root views. Existing tests cover fighter matrix context/reload, but no general page-only matrix route exists by design; sources/notebook pages have no source-navigation chip path tested beyond general app/accessibility tests.'}
 ],
 preservedPreFixFailureFixture:{
  id:'bo-stick-comparator-origin-field-target-reload',
  captureSnapshot:{gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),appSha256:sha256(app),citationsSha256:sha256(citationsSource),assembledDataSha256:sha256(dataBytes)},
  baselineBinding:comparisonBinding?{routeCollection:comparisonBinding.collection,routeItemId:comparisonBinding.itemId,fieldPointer:comparisonBinding.fieldPointer,sourceOwner:comparisonBinding.sourceOwner,book:comparisonBinding.book,printedPage:comparisonBinding.printedPage,regionIds:comparisonBinding.regionIds,reviewStatus:comparisonBinding.reviewStatus}:null,
  targetProjection:{fieldPointer:projectedComparisonTarget?.fieldPointer??null,sourceOwner:projectedComparisonTarget?.sourceOwner??null,sourceOwnerDropped:!projectedComparisonTarget?.sourceOwner},
  preFixPermalink:'#equipment/phb-bo-stick?source=PHB%3A35&target=pending&field=%2FsuggestedPrice%2Fcomparisons%2F0&owner=equipment%3Aphb-spear',
  sourceHashes:preFixFixtureSources,
  reloadResolution:{routeEntryItemId:'phb-bo-stick',validatedSourceContextOwner:'phb-spear',fieldLookupCollection:'equipment',fieldLookupItemId:'phb-spear',fieldPointerFoundOnLookupItem:comparisonSourceTargets.some(target=>target.fieldPointer==='/suggestedPrice/comparisons/0'),activeTargetResolved:comparisonSourceTargets.some(target=>target.fieldPointer==='/suggestedPrice/comparisons/0'),pendingNoticeGuard:'source-viewer.js preserves targetStatus=pending only when normalized activeTarget has a fieldPointer; a lost target can clear the pending state',exactCrops:'not assessed by this failure fixture; no region geometry is introduced or inferred'}
 },
 verification:{
  passed:[
   {command:'node --test tests/citation-navigation.test.mjs tests/citations.test.mjs',tests:18},
   {command:'NODE_PATH=/workspace/adnd1-devtools/node_modules node tests/source-viewer-permalink.browser.mjs',viewports:[1440,390]},
   {command:'NODE_PATH=/workspace/adnd1-devtools/node_modules node tests/source-viewer-field-targets.browser.mjs'},
   {command:'NODE_PATH=/workspace/adnd1-devtools/node_modules node tests/general-source-viewer.browser.mjs'},
   {command:'node --input-type=module -e "import fs from \\\"node:fs\\\"; import {buildPriceSourceInventory,validatePriceSourceInventory} from \\\"./tools/price-source-inventory.mjs\\\"; const data=JSON.parse(fs.readFileSync(\\\"dist/data.json\\\",\\\"utf8\\\")); const inventory=buildPriceSourceInventory({equipment:data.equipment,data}); console.log(validatePriceSourceInventory(inventory,{equipment:data.equipment,data}).counts)"',result:'inventory-wide validation passed; 668 current generated field bindings, 93 region-bound and 575 pending'}
  ],
  notRunInThisCapture:['tests/accessibility.mjs','tests/browser.mjs','tests/advancement-browser.mjs','tests/source-viewer.browser.mjs','tests/source-viewer-header.browser.mjs'],
  notAssessable:['source-only field mappings have no automatic proof of exact source passage; citation navigation state can be tested independently from source adequacy']
 },
 historicalBaseline:{
  note:'This working-tree capture includes uncommitted navigation/citation changes. Git HEAD is the pre-feature baseline; do not interpret current working-tree passes as old behavior.',
  gitDerivedViewerCalibration:'research/citation-regression-calibration.json',
  genericPagePromotion:'Earlier pre-fix implementation promoted generic page-only equipment chips to same-page field targets; regression test now asserts page-level route with no field pointer. The earlier dirty implementation is not preserved as a Git commit in this capture.'
 },
 reproduction:{scanner:'node tools/citation-navigation-coverage.mjs',output:'JSON to stdout; deterministic except git HEAD / working-tree file hashes',testCommands:'See verification.passed and verification.notRunInThisCapture'}
};
const output=JSON.stringify(report,null,2)+'\n';
const isMain=process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url));
if(isMain){
 if(process.argv.includes('--write')){
  const outputIndex=process.argv.indexOf('--output');
  if(outputIndex<0||!process.argv[outputIndex+1])throw new Error('Use --write --output <new-path>; the captured baseline artifact is not overwritten by default.');
  const target=resolve(root,process.argv[outputIndex+1]);
  if(existsSync(target)&&!process.argv.includes('--replace'))throw new Error(`Refusing to overwrite ${target}; use --replace only for a deliberate baseline refresh.`);
  writeFileSync(target,output);
 }else process.stdout.write(output);
}
