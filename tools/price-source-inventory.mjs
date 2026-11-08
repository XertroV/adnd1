import {createHash} from 'node:crypto';
import {assertPrimaryRowEvidence} from './citation-region-role.mjs';
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {basename,resolve} from 'node:path';
import {ambiguousItemOverrideIds, appendOverrideReferences, classProgressionOverride, cloneOverrideJson, collectionOverride, collectionReferenceOverrides, equipmentPriceStateOverride} from './citation-override-identity.mjs';

const root = resolve(import.meta.dirname, '..');
const books = createRequire(import.meta.url)('../dist/books.js');
// Optional frozen review overlay schema: {schemaVersion:1, bindings:[{sourceInventoryFile,sourceInventorySha256,sourceRecordIndex,sourceObject,sourceSha256,itemId,independentReviewFile,independentReviewFileSha256,independentReviewRecordIndex}]}.
const EQUIPMENT_SOURCE_ROW_BINDINGS_FILE = 'research/equipment-source-row-bindings.json';
const hashFile = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const BOOKS_JS_SHA256 = hashFile('dist/books.js');
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
function regionSourceIdentity(catalog,region){
  const identity=books.resolveRegionSourceIdentity(catalog,region);
  return identity?.valid?identity:null;
}
function regionSourceSha256(catalog,region){return regionSourceIdentity(catalog,region)?.sourceSha256??null;}
const jsonPointer = path => `/${path.map(part => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
const sha = value => createHash('sha256').update(value).digest('hex');
function canonical(value){
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value!==null&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function semanticValueSnapshot(value){
  if(Array.isArray(value))return value.map(semanticValueSnapshot);
  if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value)
    .filter(([key])=>key!=='evidenceBindings'&&key!=='regionReviews')
    .map(([key,child])=>[key,semanticValueSnapshot(child)]));
  return value;
}

export function sourceVisualRegionHashes(region){
  const {focusRects,...content}=region;
  return {focusSha256:sha(canonical(focusRects)),contentSha256:sha(canonical(content))};
}

export function attachSourceVisualReviewMetadata(data,{ledger=readJson('research/source-visual-reviews.json'),catalogs=catalogMap()}={}){
  const records=['rules','spells','equipment','matrices','classes'].flatMap(collection=>(data[collection]||[]).map(item=>({collection,item})));
  if(data.progressionExplainer){if(!data.progressionExplainer.id)data.progressionExplainer.id='progression-explainer';records.push({collection:'progressionExplainer',item:data.progressionExplainer});}
  const reviews=new Map();
  for(const review of ledger.reviews||[]){
    if(!review||!['rules','spells','equipment','matrices','classes','progressionExplainer'].includes(review.collection)
      ||typeof review.itemId!=='string'||!review.itemId.trim()
      ||!['sourceExcerpts','scanVerification'].includes(review.binding)
      ||typeof review.regionId!=='string'||!review.regionId.trim())throw new Error('Source visual review requires a collection, item owner, binding and region identity');
    const key=[review.collection,review.itemId,review.binding,review.regionId].join('|');
    if(reviews.has(key))throw new Error(`Duplicate source visual review ${key}`);
    reviews.set(key,review);
  }
  for(const {collection,item} of records) for(const bindingName of ['sourceExcerpts','scanVerification']){
    const binding=item[bindingName];
    if(!binding?.catalog)continue;
    const catalog=catalogs.get(binding.catalog);
    if(!catalog)throw new Error(`Source visual review catalog missing for ${collection}:${item.id}/${bindingName}: ${binding.catalog}`);
    binding.regionReviews=(catalog.regions||[]).map(region=>{
      const key=[collection,item.id,bindingName,region.id].join('|');
      const recorded=reviews.get(key)||null;
      const sourceSha256=regionSourceSha256(catalog,region);
      const {focusSha256,contentSha256}=sourceVisualRegionHashes(region);
      const hashes={sourceSha256,imageSha256:region.sha256,focusSha256,contentSha256};
      const matches=!!recorded&&recorded.sourceSha256===sourceSha256&&recorded.imageSha256===region.sha256&&recorded.focusSha256===focusSha256&&recorded.contentSha256===contentSha256;
      const assessment=recorded?.assessments?.highlight??null;
      const sentinel=(region.focusRects||[]).some(rect=>Array.isArray(rect)&&rect.length===4&&rect[0]===0&&rect[1]===0&&rect[2]===1&&rect[3]===1);
      const accepted=matches&&assessment?.independent===true&&typeof assessment.evidence==='string'&&!!assessment.evidence.trim()&&['confirmed','defect','exception'].includes(assessment.status)&&!(sentinel&&assessment.status==='confirmed');
      const status=accepted?'current-reviewed':recorded&&!matches?'stale':sentinel?'unreviewed-full-image-sentinel':'unreviewed';
      const review=accepted?{
        status:assessment.status,independent:true,evidence:assessment.evidence,
        ...(assessment.scope!==undefined?{scope:assessment.scope}:recorded.scope!==undefined?{scope:recorded.scope}:{}),
        ...(assessment.kind!==undefined?{kind:assessment.kind}:recorded.kind!==undefined?{kind:recorded.kind}:{}),
      }:null;
      return {
        regionId:region.id,status,sentinel,...hashes,review,
        recordedReview:recorded?{
          status:assessment?.status??null,independent:assessment?.independent===true,
          evidence:assessment?.evidence??null,hashesMatch:matches,
          ...(assessment?.scope!==undefined?{scope:assessment.scope}:recorded.scope!==undefined?{scope:recorded.scope}:{}),
          ...(assessment?.kind!==undefined?{kind:assessment.kind}:recorded.kind!==undefined?{kind:recorded.kind}:{}),
        }:null,
      };
    });
  }
  return data;
}

const sources = [
  {id:'phb35-equipment-purchase', file:'research/price-source-inventory-phb35.json', reviewFile:'research/price-source-inventory-phb35-independent-review.json', category:'equipment-purchase-price', denominatorKind:'source-table-row'},
  {id:'phb36-equipment-supplies', file:'research/price-source-inventory-phb36.json', category:'equipment-purchase-price', denominatorKind:'source-table-row'},
  {id:'ua26-equipment-supplies', file:'research/price-source-inventory-ua26.json', category:'equipment-purchase-price', denominatorKind:'source-table-row'},
  {id:'dmg28-standard-hireling-rates', file:'research/price-source-inventory-dmg28.json', category:'hireling-wage', denominatorKind:'source-occupation-row', cellDenominatorKind:'printed-rate-cell'},
  {id:'dmg29-expert-hireling-rates', file:'research/price-source-inventory-dmg29.json', category:'hireling-wage', denominatorKind:'source-occupation-row'},
  {id:'dmg-services-construction', file:'research/price-source-inventory-dmg-services-construction.json', reviewFile:'research/price-source-inventory-dmg-services-independent-review.json', category:'service-fee-construction-cost-suggested-material-cost', denominatorKind:'source-table-row'},
  {id:'dmg-magic-item-sale-values', file:'research/price-source-inventory-dmg-magic-partial.json', reviewFile:'research/price-source-inventory-dmg-magic-independent-review.json', category:'magic-item-sale-value', denominatorKind:'source-table-row'},
  {id:'dmg-post125-screening', file:'research/price-source-inventory-dmg-post125-survey.json', category:'market-valuation-or-screening-finding', denominatorKind:'recorded-screening-finding'},
];

const auxiliarySources = [
  'research/price-source-inventory-dmg-scope.json',
  'research/price-source-inventory-dmg-post125-survey.json',
  'research/price-source-inventory-unmatched-semantic-review.json',
  'research/price-source-inventory-index.json',
  'research/price-source-inventory-phb-other-survey.md',
  'research/price-source-inventory-phb-dmg-other.json',
  'research/price-source-inventory-ua-other.json',
  'research/price-source-inventory-monster-books.json',
];

const sourceCensusFiles=[
  'research/price-source-inventory-phb-dmg-other.json',
  'research/price-source-inventory-ua-other.json',
  'research/price-source-inventory-monster-books.json',
];

const categoryFor = source => source.category;
const rawSourceFor = record => record.source || record.snapshot || {
  book:record.book,
  page:record.printedPage ?? record.page,
  pdfPage:record.pdfPage,
  sourceSha256:record.sourceSha256,
};
const pageFor = source => source.page ?? source.printedPage;
const valueFor = record => record.price ?? record.printedPrice ?? record.printedSaleValue ?? record.rate ?? record.printedValue ?? null;
const displaySourceObject = record => record.sourceObject ?? record.name ?? record.subject ?? record.topic ?? null;
const textMatchId = value => typeof value === 'string' ? value : value?.id ?? null;
const viewerCatalogFor = item => item?.sourceExcerpts?.catalog ?? item?.scanVerification?.catalog ?? null;

function canonicalBook(book) {
  const text=String(book??'').trim().toUpperCase();
  if(text==='PHB'||text.includes('PLAYER'))return 'PHB';
  if(text==='UA'||text.includes('ARCANA'))return 'UA';
  if(text==='DMG'||text.includes('DUNGEON'))return 'DMG';
  if(text==='MM'||text==='MONSTER MANUAL')return 'MM';
  if(text==='MM2'||text==='MMII'||text.includes('MONSTER MANUAL II'))return 'MM2';
  return null;
}

function sourcePdfPage(book,page) {
  const code=canonicalBook(book);
  if(!Number.isInteger(page)||page<1)return null;
  if(code==='PHB'||code==='UA'||code==='MM')return page+1;
  if(code==='DMG')return page<=174?page+1:page>=176&&page<=238?page:null;
  if(code==='MM2')return page===83?92:page>=84&&page<=91?page:page+1;
  return null;
}

function derivePrintedPageFromPdf(book,pdfPage) {
  const code=canonicalBook(book);
  const bookInfo=books.books?.[code];
  if(!code||!bookInfo||!Number.isInteger(pdfPage))return null;
  const matches=[];
  for(let printedPage=1;printedPage<=bookInfo.lastPage;printedPage++){
    if(books.availability(code,printedPage)==='available'&&books.pdfPage(code,printedPage)===pdfPage)matches.push(printedPage);
  }
  if(matches.length!==1)return null;
  return {
    printedPage:matches[0],
    mappingBasis:{kind:'inverse-books-js-page-map',file:'dist/books.js',fileSha256:BOOKS_JS_SHA256,book:code,rule:bookInfo.mapping,uniqueMatch:true},
  };
}

function censusPageWithMapping(page,bookFallback) {
  const book=canonicalBook(page.bookKey??page.book??bookFallback);
  if(Number.isInteger(page.printedPage)){
    const result=pageMappingResult(book,page.printedPage,page.pdfPage);
    return {...page,printedPageMappingStatus:result.status,mappingBasis:{kind:'observed-printed-page',book,file:page.sourceFile??null}};
  }
  const derived=derivePrintedPageFromPdf(book,page.pdfPage);
  if(derived)return {...page,derivedPrintedPage:derived.printedPage,mappingBasis:derived.mappingBasis,printedPageMappingStatus:'mapping-derivable-not-visually-read'};
  const reason=book==='DMG'&&(page.pdfPage===239||page.pdfPage===240)?'unverified-dmg-terminal-page':
    'outside-verified-printed-page-map';
  return {...page,printedPageMappingStatus:'unresolved-boundary-or-unverified',mappingBasis:{kind:'no-unique-printed-page-from-books-js-map',book,file:'dist/books.js',fileSha256:BOOKS_JS_SHA256,reason}};
}

function censusPages(artifact) {
  if(Array.isArray(artifact?.pageCensus))return artifact.pageCensus;
  if(Array.isArray(artifact?.pageCensus?.pages))return artifact.pageCensus.pages;
  return [];
}

function normalizeCensusClaim(record) {
  const source=record?.sourcePassage??record?.source??record?.sourceReference??{};
  const sourcePages=Array.isArray(record?.sourcePages)?record.sourcePages:[];
  const book=record?.book??record?.bookKey??source?.book??source?.bookKey??sourcePages[0]?.bookKey??sourcePages[0]?.book??null;
  const pages=record?.printedPages??record?.pages??source?.printedPages??source?.pages??(sourcePages.length?sourcePages.map(page=>page.printedPage).filter(Number.isInteger):Number.isInteger(record?.printedPage)?[record.printedPage]:Number.isInteger(source?.printedPage)?[source.printedPage]:[]);
  return {
    sourceObject:record?.subject??record?.sourceObjectOrPassage??record?.sourceObject??record?.name??record?.title??record?.label??null,
    amountOrFormula:record?.amountOrFormula??record?.printedValue??record?.value??record?.formula??record?.locatorAmountCue??record?.discoverySummary??null,
    currency:record?.currency??record?.currencyLabel??null,
    unit:record?.unit??record?.unitQualifier??record?.qualification??null,
    sourceCategory:record?.claimType??record?.category??record?.classification??null,
    sourcePages:{book,pages:Array.isArray(pages)?pages:[],pdfPages:record?.pdfPages??source?.pdfPages??(sourcePages.length?sourcePages.map(page=>page.pdfPage).filter(Number.isInteger):Number.isInteger(record?.pdfPage)?[record.pdfPage]:Number.isInteger(source?.pdfPage)?[source.pdfPage]:[])},
    reviewStatus:record?.reviewStatus??record?.sourceReviewStatus??record?.visualReviewStatus??record?.status??record?.disposition??'discovery-only-not-source-value-reviewed',
  };
}

function buildSourcePageCensuses() {
  return sourceCensusFiles.filter(existsSync).map(sourceFile=>{
    const artifact=readJson(sourceFile);
    const pages=censusPages(artifact);
    const sources=artifact.sources??(artifact.source?[artifact.source]:[]);
    const rawClaims=artifact.claims??artifact.records??[];
    const pageDenominator=artifact.denominators?.sourcePdfPages??artifact.denominators?.pdfPages??pages.length;
    const bookCounts={};
    for(const page of pages){const book=canonicalBook(page.bookKey??page.book??sources[0]?.book??'');const key=book??String(page.book??page.bookKey??'unknown');bookCounts[key]=(bookCounts[key]||0)+1;}
    return {
      id:basename(sourceFile,'.json').replace('price-source-inventory-',''),
      sourceFiles:[sourceFile],
      sourceFileSha256:hashFile(sourceFile),
      sourceIdentity:sources.map(source=>({book:canonicalBook(source.book??source.bookKey??source.title),title:source.title??source.book??null,sourceSha256:source.sha256??source.sourceSha256??null,pdfPages:source.pdfPages??source.pdfPageCount??null})),
      scope:artifact.scope??null,
      screening:artifact.screening??artifact.screeningMethod??null,
      reportedDenominators:artifact.denominators??null,
      denominator:[{kind:'PDF-page',count:pageDenominator}],
      pageCensus:{denominator:{kind:'PDF-page',count:pageDenominator},pages:pages.map(page=>censusPageWithMapping(page,page.bookKey??page.book??sources[0]?.book??sources[0]?.title)),perBook:artifact.denominators?.perBook??bookCounts},
      claims:rawClaims.map(normalizeCensusClaim),
      tableGroups:artifact.tableGroups??artifact.monetaryGroups??[],
      exclusions:artifact.exclusions??artifact.excluded??[],
      unresolved:artifact.unresolved??artifact.unresolvedCandidates??[],
      limitations:artifact.limitations??[],
      relatedInventories:artifact.relatedInventories??artifact.relatedInventory??[],
      supplementalPageCensus:artifact.supplementalImagePageCensus??[],
      sourceArtifact:artifact,
    };
  });
}

function pageMappingResult(book,printedPage,pdfPage) {
  const code=canonicalBook(book);
  if(!code||!Number.isInteger(printedPage)||!Number.isInteger(pdfPage))return {status:'unassessable-missing-identity'};
  const expected=sourcePdfPage(code,printedPage);
  if(expected===null)return {status:code==='DMG'&&printedPage===175?'unassessable-known-missing-page':'unassessable-book-mapping'};
  return {status:expected===pdfPage?'mapping-consistent':'mapping-inconsistent',expectedPdfPage:expected};
}

function buildSourcePageMappingAudit(sourceInventories,sourceCensuses) {
  const bounded={total:0,assessable:0,consistent:0,inconsistent:0,unassessable:0,issues:[]};
  for(const inventory of sourceInventories)for(const row of inventory.sourceRows){
    bounded.total++;
    const book=row.source?.book,printedPage=row.source?.page??row.source?.printedPage,pdfPage=row.source?.pdfPage;
    const result=pageMappingResult(book,printedPage,pdfPage);
    if(result.status==='mapping-consistent'){bounded.assessable++;bounded.consistent++;}
    else if(result.status==='mapping-inconsistent'){bounded.assessable++;bounded.inconsistent++;bounded.issues.push({sourceFile:inventory.sourceFiles[0],recordId:row.id,sourceObject:row.sourceObject,book,printedPage,pdfPage,...result});}
    else bounded.unassessable++;
  }
  const pageCensus={total:0,assessable:0,consistent:0,inconsistent:0,derivable:0,unassessable:0,byBook:{},issues:[]};
  for(const census of sourceCensuses)for(const page of census.pageCensus.pages){
    pageCensus.total++;
    const book=canonicalBook(page.bookKey??page.book??census.sourceIdentity[0]?.book);
    const bookCounts=pageCensus.byBook[book]??={total:0,observedPrintedPage:0,consistent:0,inconsistent:0,derivableNotVisuallyRead:0,unresolvedBoundaryOrUnverified:0};
    bookCounts.total++;
    if(Number.isInteger(page.printedPage)){
      const result=pageMappingResult(book,page.printedPage,page.pdfPage);
      bookCounts.observedPrintedPage++;
      if(result.status==='mapping-consistent'){pageCensus.assessable++;pageCensus.consistent++;bookCounts.consistent++;}
      else if(result.status==='mapping-inconsistent'){pageCensus.assessable++;pageCensus.inconsistent++;bookCounts.inconsistent++;pageCensus.issues.push({sourceFile:census.sourceFiles[0],book,printedPage:page.printedPage,pdfPage:page.pdfPage,...result});}
      else {pageCensus.unassessable++;bookCounts.unresolvedBoundaryOrUnverified++;}
    } else if(page.printedPageMappingStatus==='mapping-derivable-not-visually-read'&&Number.isInteger(page.derivedPrintedPage)){
      pageCensus.derivable++;
      bookCounts.derivableNotVisuallyRead++;
    } else {
      pageCensus.unassessable++;
      bookCounts.unresolvedBoundaryOrUnverified++;
    }
  }
  const excludedOrUnresolved=[];
  for(const census of sourceCensuses){
    for(const [listName,list] of [['exclusions',census.exclusions],['unresolved',census.unresolved]])for(const record of Array.isArray(list)?list:[]){
      const book=record.book??record.bookKey??record.source?.book??record.source?.bookKey;
      const printedPage=record.printedPage??record.source?.printedPage;
      const pdfPage=record.pdfPage??record.source?.pdfPage;
      if(!Number.isInteger(printedPage)||!Number.isInteger(pdfPage))continue;
      const result=pageMappingResult(book,printedPage,pdfPage);
      if(result.status==='mapping-inconsistent')excludedOrUnresolved.push({sourceFile:census.sourceFiles[0],recordType:listName,subject:record.subject??record.sourceObject??record.name??null,book:canonicalBook(book),printedPage,pdfPage,...result});
    }
  }
  const auxiliary={total:0,assessable:0,consistent:0,inconsistent:0,unassessable:0,issues:[]};
  for(const file of auxiliarySources.filter(file=>file.endsWith('.json')&&!sourceCensusFiles.includes(file)&&existsSync(resolve(root,file)))){
    const document=readJson(file);
    const bookHint=/dmg/i.test(file)?'DMG':null;
    const walk=(value,pointer='')=>{
      if(!value||typeof value!=='object')return;
      if(Array.isArray(value)){value.forEach((child,index)=>walk(child,`${pointer}/${index}`));return;}
      const printedPage=value.printedPage??value.source?.printedPage;
      const pdfPage=value.pdfPage??value.source?.pdfPage;
      if(Number.isInteger(printedPage)&&Number.isInteger(pdfPage)){
        auxiliary.total++;
        const book=value.book??value.bookKey??value.source?.book??value.source?.bookKey??bookHint;
        const result=pageMappingResult(book,printedPage,pdfPage);
        if(result.status==='mapping-consistent'){auxiliary.assessable++;auxiliary.consistent++;}
        else if(result.status==='mapping-inconsistent'){auxiliary.assessable++;auxiliary.inconsistent++;auxiliary.issues.push({sourceFile:file,pointer: pointer||'/',subject:value.subject??value.sourceObject??value.sourceObjectOrPassage??null,book:canonicalBook(book),printedPage,pdfPage,...result});}
        else auxiliary.unassessable++;
      }
      for(const [key,child] of Object.entries(value))walk(child,`${pointer}/${key}`);
    };
    walk(document);
  }
  return {scope:'Book mapping consistency only; no printed page is inferred when page identity is missing or the book mapping is unverified.',boundedSourceRows:bounded,pageCensusPages:pageCensus,auxiliaryPageRecords:auxiliary,unresolvedOrExcludedIssues:excludedOrUnresolved};
}

function rectValues(value) {
  const values=Array.isArray(value)?value:value&&typeof value==='object'?[value.x,value.y,value.width??value.w,value.height??value.h]:null;
  return Array.isArray(values)&&values.length===4&&values.every(Number.isFinite)?values:null;
}

function regionCropCoordinate(region) {
  if(region.sourceArtifactId){
    return {regionId:region.id,coordinateSpace:region.sourceCoordinateSpace??'supplement-image-pixels',format:'LTRB-half-open',rect:rectValues(region.sourceCropBoundsPx)};
  }
  if(region.boundsPdfPoints){
    return {regionId:region.id,coordinateSpace:'catalog-bounds-pdf-points-as-recorded',format:'x0-y0-x1-y1',rect:rectValues(region.boundsPdfPoints)};
  }
  const rect=rectValues(region.normalizedPageRect);
  if(rect) return {regionId:region.id,coordinateSpace:'rendered-source-page-normalized-top-left-xywh',format:'xywh',rect};
  return {regionId:region.id,coordinateSpace:null,format:null,rect:null};
}

function assemblyIdentityData(equipment) {
  const data={
    rules:readJson('rules.json').rules||[],
    classes:readJson('classes.json').classes||[],
    equipment,
    matrices:readJson('attack-matrices.json').matrices||[],
    spells:[],
  };
  for(const file of ['phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json'])data.spells.push(...(readJson(file).spells||[]));
  const progression=readJson('progression-overrides.json');
  if(progression.explainer)data.progressionExplainer={...progression.explainer,id:progression.explainer.id||'progression-explainer'};
  return data;
}

function applyAssemblyMetadata(equipment) {
  const citations=readJson('citation-overrides.json');
  const ambiguousIds=ambiguousItemOverrideIds(assemblyIdentityData(equipment));
  for(let index=0;index<equipment.length;index++){
    const item=equipment[index]={...equipment[index]};
    const referenceOverrides=collectionReferenceOverrides(citations.items,'equipment',item.id,ambiguousIds);
    appendOverrideReferences(item,referenceOverrides);
    const sourceExcerpts=collectionOverride(citations.sourceExcerpts,'equipment',item.id,ambiguousIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
    if(sourceExcerpts)item.sourceExcerpts=cloneOverrideJson(sourceExcerpts);
    const scanVerification=collectionOverride(citations.scanVerification,'equipment',item.id,ambiguousIds);
    if(scanVerification)item.scanVerification=cloneOverrideJson(scanVerification);
    const priceState=equipmentPriceStateOverride(citations.priceStates,'equipment',item.id);
    if(priceState)item.priceState=priceState;
  }
  return equipment;
}

function defaultBindingData(equipment) {
  const fileCollections={
    rules:'rules.json',classes:'classes.json',matrices:'attack-matrices.json',
    equipment:'equipment.json',
  };
  const data={};
  for(const [collection,file] of Object.entries(fileCollections)) data[collection]=collection==='equipment'?equipment:(readJson(file)[collection]||[]);
  const spellFiles=['phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json'];
  const spellMap=new Map();
  for(const file of spellFiles) for(const spell of readJson(file).spells||[]){
    const key=[spell.book,spell.class,spell.name.toLowerCase().replace(/[^a-z0-9]/g,'')].join(':');
    const prior=spellMap.get(key),detailed=Object.keys(spell.fields||{}).length>0||(spell.effect||[]).length>0;
    if(!prior||detailed){
      const merged={...prior,...spell};
      const aliases=[...new Set([...(prior?.aliases||[]),...(spell.aliases||[])])];
      if(aliases.length)merged.aliases=aliases;
      const shared=spell.classes||prior?.classes;
      if(shared?.length){merged.classes=shared;if(shared.length>1)merged.pages=[...new Set([...(spell.pages||[]),...(prior?.pages||[])])];}
      spellMap.set(key,merged);
    }
  }
  data.spells=[...spellMap.values()];
  const citations=readJson('citation-overrides.json'),progression=readJson('progression-overrides.json');
  const ambiguousIds=ambiguousItemOverrideIds(data,progression.explainer);
  for(const [collection,items] of Object.entries({rules:data.rules,spells:data.spells,classes:data.classes,equipment:data.equipment,matrices:data.matrices})) for(const item of items){
    const referenceOverrides=collectionReferenceOverrides(citations.items,collection,item.id,ambiguousIds);
    appendOverrideReferences(item,referenceOverrides);
    const excerpts=collectionOverride(citations.sourceExcerpts,collection,item.id,ambiguousIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
    if(excerpts)item.sourceExcerpts=cloneOverrideJson(excerpts);
    const scanVerification=collectionOverride(citations.scanVerification,collection,item.id,ambiguousIds);
    if(scanVerification)item.scanVerification=cloneOverrideJson(scanVerification);
    const priceState=equipmentPriceStateOverride(citations.priceStates,collection,item.id);
    if(priceState)item.priceState=priceState;
    const classOverride=classProgressionOverride(progression.classes,collection,item.id);
    if(classOverride)Object.assign(item,cloneOverrideJson(classOverride));
  }
  if(progression.explainer){
    data.progressionExplainer=progression.explainer;
    const explainerId='progression-explainer';
    const scanVerification=collectionOverride(citations.scanVerification,'progressionExplainer',explainerId,ambiguousIds);
    if(scanVerification)data.progressionExplainer.scanVerification=cloneOverrideJson(scanVerification);
    const excerpts=collectionOverride(citations.sourceExcerpts,'progressionExplainer',explainerId,ambiguousIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
    if(excerpts)data.progressionExplainer.sourceExcerpts=excerpts;
  }
  return data;
}

function geometryFrom(record, source) {
  const bounds = source.normalizedPageBounds ?? record.normalizedPageBounds ?? record.normalizedPageRect ?? record.originalBounds ?? null;
  if (!bounds) return null;
  const rect = Array.isArray(bounds) ? bounds : [bounds.x, bounds.y, bounds.width, bounds.height];
  return {
    coordinateSpace: 'rendered-source-page-normalized-top-left-xywh',
    rect,
    status: source.boundsStatus ?? record.boundsStatus ?? record.boundsVerdict ?? record.boundsStatus ?? 'provisional',
  };
}

function inventoryReviewFor(config, raw, index, review, sourceFresh, reviewFileFresh) {
  const reviewed = review?.records?.[index];
  const reviewData = reviewed ? {
    file: config.reviewFile,
    expectedInventorySha256: review.inventorySha256 ?? review.inventory,
    inventoryFresh: reviewFileFresh,
    verdict: reviewed.verdict ?? reviewed.valueVerdict ?? reviewed.siteVerdict ?? null,
    boundsVerdict: reviewed.boundsVerdict ?? null,
    siteVerdict: reviewed.siteVerdict ?? null,
    changes: reviewed.changes ?? [],
  } : null;
  const hasVisualTranscription = /visual|confirmed/i.test(raw.reviewStatus ?? raw.boundsVerdict ?? raw.siteMatch?.status ?? '');
  return {
    sourceValues: reviewed?.valueVerdict === 'confirmed' || reviewed?.verdict === 'confirmed'
      ? (reviewFileFresh ? 'independently-confirmed' : 'previously-confirmed-review-stale')
      : (hasVisualTranscription ? 'source-visually-transcribed' : 'source-review-pending'),
    sourceRowBounds: reviewed?.boundsVerdict === 'confirmed'
      ? (reviewFileFresh ? 'independently-confirmed' : 'previously-confirmed-review-stale')
      : (raw.source?.boundsStatus ?? raw.boundsStatus ?? 'provisional'),
    sourceInventoryFresh: sourceFresh,
    review: reviewData,
  };
}

function independentReviewMap(config) {
  if (!config.reviewFile || !existsSync(resolve(root, config.reviewFile))) return {review:null, fresh:false};
  const review = readJson(config.reviewFile);
  const inputHash = hashFile(config.file);
  const inventoryRef = typeof review.inventory==='string'
    ? (review.inventory.startsWith('research/') ? review.inventory : `research/${review.inventory}`)
    : null;
  const expected = review.inventorySha256;
  if (inventoryRef && expected) return {review, fresh:hashFile(inventoryRef)===expected};
  const fresh = typeof expected === 'string' && expected === inputHash;
  return {review, fresh};
}

function boundTargetReview(review){
  return review?{...review}:null;
}

function makeSourceRows(config, inventory, review, reviewFresh) {
  const rawRows = inventory.records || [];
  const arrayIndex = new Map();
  const rows = [];
  for (let i=0; i<rawRows.length; i++) {
    const record = rawRows[i];
    const source = rawSourceFor(record);
    const rowId = `${config.id}-${String(i+1).padStart(3,'0')}`;
    const rawSiteMatch = record.siteMatch || null;
    const targetId = textMatchId(rawSiteMatch);
    const sourceValue = valueFor(record);
    const rawMatchStatus = rawSiteMatch?.status ?? null;
    const row = {
      id: rowId,
      sourceFile: config.file,
      sourceRecordIndex: i,
      sourceObject: displaySourceObject(record),
      section: record.section ?? record.category ?? null,
      sourceCategory: categoryFor(config),
      sourceValue,
      source: {
        book: source.book ?? record.book ?? null,
        printedPage: pageFor(source) ?? record.printedPage ?? record.page ?? null,
        pdfPage: source.pdfPage ?? record.pdfPage ?? null,
        sourceSha256: source.sourceSha256 ?? record.sourceSha256 ?? source.sha256 ?? null,
        passage: record.section ?? record.category ?? inventory.title ?? null,
      },
      sourceRowCoordinates: geometryFrom(record, source),
      cropCoordinates: null,
      highlightCoordinates: null,
      siteMatch: targetId ? {
        collection: rawSiteMatch.collection ?? (config.category==='equipment-purchase-price' ? 'equipment' : null),
        itemId: targetId,
        fieldPointer: config.category==='equipment-purchase-price' ? '/price' : null,
        status: rawMatchStatus,
      } : rawSiteMatch ? {
        collection: rawSiteMatch.collection ?? null,
        itemId: null,
        fieldPointer: null,
        status: rawMatchStatus,
      } : null,
      reviewStatus: inventoryReviewFor(config, record, i, review, true, reviewFresh),
      sourceRecord: record,
    };
    arrayIndex.set(record, i);
    rows.push(row);
  }
  return {rows, arrayIndex};
}

function rowMatchesSitePrice(row, item) {
  // A legacy source row may have an explicit manual overlay that resolves its
  // item identity even when the original row mapping was null/unrepresented.
  // Preserve an explicit, conflicting legacy item ID as a hard failure; the
  // reviewed overlay identity is checked separately before this value match.
  if ((row.siteMatch?.itemId && row.siteMatch.itemId !== item.id) || !item.price) return false;
  const src = row.sourceValue;
  const sourcePrice = Array.isArray(src) ? null : src;
  if (!sourcePrice || typeof sourcePrice !== 'object') return false;
  return String(sourcePrice.amount) === String(item.price.amount)
    && sourcePrice.currency === item.price.currency
    && row.source.book === item.price.book
    && row.source.printedPage === item.price.pages?.[0];
}

function reviewRecordMatchesRowBinding(reviewRecord,binding) {
  return reviewRecord?.sourceInventoryFile===binding.sourceInventoryFile
    &&reviewRecord?.sourceInventorySha256===binding.sourceInventorySha256
    &&reviewRecord?.sourceRecordIndex===binding.sourceRecordIndex
    &&reviewRecord?.sourceObject===binding.sourceObject
    &&reviewRecord?.sourceSha256===binding.sourceSha256
    &&reviewRecord?.itemId===binding.itemId
    &&reviewRecord?.verdict==='confirmed';
}

function attachEquipmentSourceRowBindings({rows,config,equipment,overlay,reviewFileCache=new Map()}) {
  const bindings=Array.isArray(overlay?.bindings)?overlay.bindings:[];
  const matching=bindings.map((binding,index)=>({binding,index})).filter(({binding})=>binding.sourceInventoryFile===config.file);
  const targetCounts=new Map();
  for(const {binding} of matching)if(Number.isInteger(binding.sourceRecordIndex))targetCounts.set(binding.sourceRecordIndex,(targetCounts.get(binding.sourceRecordIndex)||0)+1);
  const currentInventorySha256=hashFile(config.file);
  const rowBindings=[];
  for(const {binding,index} of matching){
    const row=Number.isInteger(binding.sourceRecordIndex)?rows[binding.sourceRecordIndex]:null;
    const item=equipment.find(candidate=>candidate.id===binding.itemId);
    let status='pending-invalid-binding';
    let reviewRecord=null;
    if((targetCounts.get(binding.sourceRecordIndex)||0)>1)status='conflict-duplicate-overlay-source-row';
    else if(!row)status='stale-source-row-index';
    else if(binding.sourceInventorySha256!==currentInventorySha256)status='stale-source-inventory-hash';
    else if(binding.sourceObject!==row.sourceObject||binding.sourceSha256!==row.source.sourceSha256)status='stale-source-row-identity';
    else if(typeof binding.independentReviewFile!=='string'||typeof binding.independentReviewFileSha256!=='string'||!Number.isInteger(binding.independentReviewRecordIndex))status='pending-independent-review-reference';
    else {
      let reviewDoc=reviewFileCache.get(binding.independentReviewFile);
      if(reviewDoc===undefined){
        const filePath=resolve(root,binding.independentReviewFile);
        reviewDoc=existsSync(filePath)?{document:readJson(binding.independentReviewFile),sha256:hashFile(binding.independentReviewFile)}:null;
        reviewFileCache.set(binding.independentReviewFile,reviewDoc);
      }
      if(!reviewDoc)status='stale-independent-review-file-missing';
      else if(reviewDoc.sha256!==binding.independentReviewFileSha256)status='stale-independent-review-hash';
      else {
        reviewRecord=reviewDoc.document?.records?.[binding.independentReviewRecordIndex]??null;
        if(!reviewRecordMatchesRowBinding(reviewRecord,binding))status='pending-independent-review-does-not-confirm-binding';
        else if(!item)status='stale-site-item-missing';
        else if(row.siteMatch?.itemId&&row.siteMatch.itemId!==binding.itemId)status='conflict-source-inventory-site-match';
        else if(!item.price)status='site-item-price-missing';
        else if(!rowMatchesSitePrice(row,item))status='source-site-price-conflict';
        else status='reviewed-source-row-binding-current';
      }
    }
    const audit={
      overlayIndex:index,status,sourceInventoryFile:binding.sourceInventoryFile??null,
      sourceInventorySha256:binding.sourceInventorySha256??null,sourceRecordIndex:binding.sourceRecordIndex??null,
      sourceObject:binding.sourceObject??null,sourceSha256:binding.sourceSha256??null,
      itemId:binding.itemId??null,independentReviewFile:binding.independentReviewFile??null,
      independentReviewFileSha256:binding.independentReviewFileSha256??null,
      independentReviewRecordIndex:binding.independentReviewRecordIndex??null,
      sourceRowPresent:!!row,reviewRecordConfirmed:!!reviewRecordMatchesRowBinding(reviewRecord,binding),
      sitePriceCheck:row&&item?(rowMatchesSitePrice(row,item)?'exact-amount-currency-book-page':'conflict'):null,
    };
    rowBindings.push(audit);
    if(row){
      row.sourceRowBinding=audit;
      if(status==='reviewed-source-row-binding-current'&&!row.siteMatch?.itemId){
        row.siteMatch={
          collection:'equipment',itemId:binding.itemId,fieldPointer:'/price',
          status:'reviewed-source-row-binding',
          ...(row.siteMatch?.status?{legacyStatus:row.siteMatch.status}:{}),
        };
      }
    }
  }
  return rowBindings;
}

function sourceRowBindingSummary(records,overlayFileSha256=null) {
  const counts={};
  for(const record of records)counts[record.status]=(counts[record.status]||0)+1;
  return {sourceFile:EQUIPMENT_SOURCE_ROW_BINDINGS_FILE,sourceFileSha256:overlayFileSha256,total:records.length,counts,records};
}

function inventoryDenominator(config, inventory) {
  const count = inventory.sourceRows ?? inventory.records?.length ?? 0;
  const denominators = [{kind:config.denominatorKind, count}];
  if (inventory.priceCells != null) denominators.push({kind:config.cellDenominatorKind, count:inventory.priceCells});
  if (config.id==='dmg29-expert-hireling-rates') {
    denominators.push({kind:'numeric-source-row', count:inventory.printedNumericRows});
    denominators.push({kind:'special-fee-source-row', count:inventory.specialRows});
  }
  if (inventory.conditions) denominators.push({kind:'contextual-condition-group', count:inventory.conditions.length});
  if (inventory.formulas) denominators.push({kind:'printed-formula', count:inventory.formulas.length});
  if (inventory.qualifiers) denominators.push({kind:'source-qualifier', count:inventory.qualifiers.length});
  return denominators;
}

function matchSourceRows(siteItems, rowLists) {
  const byId = new Map(siteItems.map(item=>[item.id,item]));
  const allRows = rowLists.flatMap(({config,rows})=>rows.map(row=>({config,row})));
  const byItemId = new Map();
  for (const pair of allRows) {
    const itemId = pair.row.siteMatch?.itemId;
    if (!itemId) continue;
    const item = byId.get(itemId);
    pair.row.siteMatch.currentPriceCheck = item?.price ? rowMatchesSitePrice(pair.row, item) ? 'exact-amount-currency-page' : 'conflict' : 'site-item-price-missing';
    if (!byItemId.has(itemId)) byItemId.set(itemId, []);
    byItemId.get(itemId).push(pair.row);
  }
  return {allRows, byItemId};
}

const CONFIRMED_PRICE_VALUE_STATUS='source-value-independently-confirmed';

function priceValueSnapshot(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  return {amount:value.amount??null,currency:value.currency??null,unit:typeof value.unit==='string'?value.unit:null};
}

function derivePriceValueStatus({collection,itemId,fieldPointer,sourceObjectPointer,target,valueReview,claimedStatus}) {
  if(!valueReview){
    if(claimedStatus===CONFIRMED_PRICE_VALUE_STATUS)throw new Error(`${collection}:${itemId}${fieldPointer}: independent price value status lacks a frozen valueReview`);
    return claimedStatus??'not-assessed-by-field-target-review';
  }
  if(collection!=='equipment'||fieldPointer!=='/price'||sourceObjectPointer!=='/price'||valueReview.scope!=='equipment-printed-price')throw new Error(`${collection}:${itemId}${fieldPointer}: valueReview is only supported for the equipment /price source object`);
  if(valueReview.independent!==true)throw new Error(`${collection}:${itemId}${fieldPointer}: price valueReview is not marked independent`);
  const expected=valueReview.expectedValue;
  const validAmount=typeof expected?.amount==='number'?Number.isFinite(expected.amount):typeof expected?.amount==='string'&&!!expected.amount.trim();
  if(!expected||typeof expected!=='object'||Array.isArray(expected)||!Object.hasOwn(expected,'amount')||!Object.hasOwn(expected,'currency')||!Object.hasOwn(expected,'unit')
      ||!validAmount
      ||typeof expected.currency!=='string'||!(expected.unit===null||typeof expected.unit==='string'))throw new Error(`${collection}:${itemId}/price: price valueReview requires expectedValue {amount,currency,unit}`);
  if(typeof valueReview.evidence!=='string'||!valueReview.evidence.startsWith('research/')||valueReview.evidence.split('/').includes('..')||!existsSync(resolve(root,valueReview.evidence)))throw new Error(`${collection}:${itemId}/price: price valueReview evidence file is missing or outside research`);
  if(typeof valueReview.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(valueReview.evidenceSha256)||valueReview.evidenceSha256!==hashFile(valueReview.evidence))throw new Error(`${collection}:${itemId}/price: price valueReview evidence file is stale or lacks its recorded hash`);
  const actual=priceValueSnapshot(target);
  if(!actual||actual.amount!==expected.amount||actual.currency!==expected.currency||actual.unit!==expected.unit)throw new Error(`${collection}:${itemId}/price: price valueReview snapshot does not match current amount, currency, and unit`);
  return CONFIRMED_PRICE_VALUE_STATUS;
}

function itemBinding(item, {rootBindings, catalogs}) {
  const manual = (rootBindings.bindings || []).filter(binding=>binding.collection==='equipment'&&binding.itemId===item.id);
  const pageCatalog = item.sourceExcerpts?.catalog ?? item.scanVerification?.catalog ?? null;
  const make = (ref, pointer, sourceObject, category, sourceObjectPointer=pointer) => {
    const directIds = ref?.verification?.regions || [];
    const manualRef = manual.find(binding=>binding.fieldPointer===pointer);
    const catalog=pageCatalog;
    if(manualRef?.reviewStatus==='field-target-reviewed'&&manualRef.catalog!==catalog)throw new Error(`Reviewed target ${item.id}${pointer} catalog ${manualRef.catalog??'(missing)'} is not the viewer-selected catalog ${catalog??'(none)'}`);
    const candidateIds=[...new Set(Array.isArray(manualRef?.regionIds)?manualRef.regionIds:directIds)];
    const catalogRegions=catalog&&catalogs.get(catalog)?catalogs.get(catalog).regions:[];
    const regionIds=candidateIds.filter(id=>catalogRegions.some(region=>region.id===id));
    const unmappedRegionIds=candidateIds.filter(id=>!regionIds.includes(id));
    const refPage = (ref?.pages || item.price?.pages || item.pages || [])[0] ?? null;
    const book = ref?.book ?? item.price?.book ?? item.book ?? null;
    const matchedRegions = regionIds.map(id=>catalogRegions.find(region=>region.id===id)).filter(Boolean);
    const valuePathMissing=valueAtPointer(item,pointer)===undefined&&isPairedFieldSourcePointer(pointer,sourceObjectPointer);
    let reviewStatus = manualRef?.reviewStatus;
    if (!reviewStatus) {
      if (directIds.length && directIds.every(id=>regionIds.includes(id))) reviewStatus='region-verified';
      else if (/Selected purchase-price row visually checked/i.test(ref?.status||'')) reviewStatus='source-row-value-verified-region-pending';
      else if (/Visually checked/i.test(ref?.status||'')) reviewStatus=directIds.length&&directIds.every(id=>regionIds.includes(id)) ? 'region-verified' : 'source-row-value-verified-region-pending';
      else if (/OCR checked/i.test(ref?.status||'')) reviewStatus='source-row-transcribed-bounds-provisional';
      else if (pageCatalog) reviewStatus='source-excerpt-only';
      else reviewStatus='discovery-unreviewed';
    }
    if(valuePathMissing&&reviewStatus==='field-target-reviewed')throw new Error(`Reviewed target ${item.id}${pointer} has no current value at the cited field path`);
    if(valuePathMissing)reviewStatus='field-target-pending';
    const sourcePages = ref?.pages || item.price?.pages || item.pages || [];
    const binding={
      fieldPointer:pointer,
      sourceObjectPointer,
      sourceOwner:{collection:'equipment',itemId:item.id},
      sourceObject,
      sourceCategory:category,
      book,
      printedPage:refPage,
      pdfPage:matchedRegions.length ? matchedRegions[0].pdfPage : (book && refPage ? sourcePdfPage(book, refPage) : null),
      catalog,
      regionIds,
      ...(unmappedRegionIds.length?{unmappedRegionIds}:{}),
      coordinateSpace:regionIds.length ? 'excerpt-image-normalized-top-left-xywh' : null,
      reviewStatus,
      valuePathStatus:valuePathMissing?'value-path-missing':'value-present',
      contextStatus:manualRef?.contextStatus ?? 'context-not-assessed',
      contextLimitations:manualRef?.contextLimitations ?? (valuePathMissing?['The source reference is retained, but no value is currently present at its semantic field path.']:regionIds.length ? ['Field-to-region selection does not by itself establish complete table or passage context.'] : []),
      sourcePages,
      sourceSha256:matchedRegions.length ? regionSourceSha256(catalogs.get(catalog),matchedRegions[0]) : null,
      cropCoordinates:matchedRegions.map(regionCropCoordinate),
      highlightCoordinates:matchedRegions.map(region=>({regionId:region.id, coordinateSpace:'excerpt-image-normalized-top-left-xywh', origin:'top-left', format:'xywh', rects:region.focusRects||[]})),
      regionEvidence:matchedRegions.map(region=>({
        regionId:region.id,
        book:region.book,
        printedPage:region.printedPage,
        pdfPage:region.pdfPage,
        sourceSha256:regionSourceSha256(catalogs.get(catalog),region),
        imageSha256:region.sha256,
        focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),
        ...sourceVisualRegionHashes(region),
      })),
    };
    if (manualRef) {
      const currentRegionEvidence=binding.regionEvidence;
      const expectedRegionEvidence=manualRef.expectedRegionEvidence??manualRef.regionEvidence??[];
      Object.assign(binding,manualRef);
      binding.targetReview=boundTargetReview(manualRef.targetReview);
      binding.expectedRegionEvidence=expectedRegionEvidence;
      binding.regionEvidence=currentRegionEvidence;
      if(manualRef.valueReview||manualRef.sourceValueStatus===CONFIRMED_PRICE_VALUE_STATUS){
        binding.sourceValueStatus=derivePriceValueStatus({collection:'equipment',itemId:item.id,fieldPointer:pointer,sourceObjectPointer,target:valueAtPointer(item,pointer),valueReview:manualRef.valueReview,claimedStatus:manualRef.sourceValueStatus});
        binding.valueReview=manualRef.valueReview?{...manualRef.valueReview,expectedValue:{...manualRef.valueReview.expectedValue}}:undefined;
      }
    }
    return binding;
  };
  const bindings=[];
  if (item.price && typeof item.price==='object') bindings.push(make(item.price,'/price',item.name,'equipment-purchase-price'));
  for (const [label,ref] of Object.entries(item.fieldSources||{})) {
    if (!ref || typeof ref!=='object') continue;
    bindings.push(make(ref,jsonPointer(['fields',label]),`${item.name}: ${label}`,'equipment-field',jsonPointer(['fieldSources',label])));
  }
  for (let i=0;i<(item.references||[]).length;i++) {
    const ref=item.references[i];
    if (!ref || typeof ref!=='object') continue;
    if (!ref.verification?.regions?.length && !ref.book) continue;
    bindings.push(make(ref,jsonPointer(['references',i]),`${item.name}: source reference ${i+1}`,'record-reference'));
  }
  return bindings;
}

function comparatorBinding(owner, index, comparison, comparatorItem, {rootBindings,catalogs,sourceRowsByItem}) {
  if(!comparatorItem) return null;
  const fieldPointer=jsonPointer(['suggestedPrice','comparisons',index]);
  const manual=(rootBindings.bindings||[]).find(binding=>binding.collection==='equipment'&&binding.itemId===owner.id&&binding.fieldPointer===fieldPointer);
  const directIds=comparatorItem.price?.verification?.regions||[];
  const selectedCatalog=viewerCatalogFor(comparatorItem);
  if(manual?.reviewStatus==='field-target-reviewed'&&manual.catalog!==selectedCatalog)throw new Error(`Reviewed comparator target ${owner.id}${fieldPointer} catalog ${manual.catalog??'(missing)'} is not the viewer-selected catalog ${selectedCatalog??'(none)'}`);
  const catalog=selectedCatalog;
  const candidateIds=[...new Set(Array.isArray(manual?.regionIds)?manual.regionIds:directIds)];
  const catalogRegions=catalog&&catalogs.get(catalog)?catalogs.get(catalog).regions:[];
  const regionIds=candidateIds.filter(id=>catalogRegions.some(region=>region.id===id));
  const unmappedRegionIds=candidateIds.filter(id=>!regionIds.includes(id));
  const refs=regionIds.map(id=>catalogRegions.find(region=>region.id===id)).filter(Boolean);
  const sourceStatus=comparatorItem.price?.status||comparison.status||'';
  const reviewStatus=manual?.reviewStatus??(directIds.length&&directIds.every(id=>regionIds.includes(id))?'region-verified':/visually checked/i.test(sourceStatus)?'source-row-value-verified-region-pending':/OCR checked/i.test(sourceStatus)?'source-row-transcribed-bounds-provisional':'source-excerpt-only');
  const pages=comparison.pages||comparatorItem.price?.pages||[];
  const book=comparison.book||comparatorItem.price?.book||null;
  return {
    collection:'equipment',
    itemId:owner.id,
    fieldPointer,
    sourceObjectPointer:manual?.sourceObjectPointer??fieldPointer,
    sourceObject:comparison.label||comparatorItem.name,
    sourceCategory:'printed-price-comparator',
    sourceOwner:{collection:'equipment',itemId:comparatorItem.id},
    book,
    printedPage:pages[0]??null,
    pdfPage:refs.length?refs[0].pdfPage:(book&&pages[0]?sourcePdfPage(book,pages[0]):null),
    catalog,
    regionIds,
    ...(unmappedRegionIds.length?{unmappedRegionIds}:{}),
    coordinateSpace:regionIds.length?'excerpt-image-normalized-top-left-xywh':null,
    reviewStatus,
    targetReview:boundTargetReview(manual?.targetReview),
    expectedRegionEvidence:manual?.expectedRegionEvidence??[],
    contextStatus:manual?.contextStatus??'context-not-assessed',
    contextLimitations:manual?.contextLimitations??(regionIds.length?['Comparator region selection does not verify the estimate itself or complete table context.']:[]),
    sourcePages:pages,
    sourceSha256:refs.length?regionSourceSha256(catalogs.get(catalog),refs[0]):null,
    cropCoordinates:refs.map(regionCropCoordinate),
    highlightCoordinates:refs.map(region=>({regionId:region.id,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:region.focusRects||[]})),
    regionEvidence:refs.map(region=>({regionId:region.id,book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,sourceSha256:regionSourceSha256(catalogs.get(catalog),region),imageSha256:region.sha256,focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),...sourceVisualRegionHashes(region)})),
    sourceRowIds:(sourceRowsByItem.get(comparatorItem.id)||[]).filter(row=>rowMatchesSitePrice(row,comparatorItem)).map(row=>row.id),
  };
}

function buildEvidenceBindings(items, {rootBindings,catalogs,sourceRowsByItem}) {
  const claims=[];
  const byId=new Map(items.map(item=>[item.id,item]));
  for (const item of items) {
    const bindings=itemBinding(item,{rootBindings,catalogs});
    for (const binding of bindings) {
      if (binding.fieldPointer==='/price') {
        binding.sourceRowIds=(sourceRowsByItem.get(item.id)||[]).filter(row=>rowMatchesSitePrice(row,item)).map(row=>row.id);
      }
      claims.push({collection:'equipment',itemId:item.id,...binding});
    }
    for(let index=0;index<(item.suggestedPrice?.comparisons||[]).length;index++){
      const comparison=item.suggestedPrice.comparisons[index];
      const binding=comparatorBinding(item,index,comparison,byId.get(comparison.itemId),{rootBindings,catalogs,sourceRowsByItem});
      if(binding)claims.push(binding);
    }
  }
  return claims;
}

function catalogMap() {
  const map=new Map();
  const folder=resolve(root,'dist/scans');
  const scan=(dir,prefix='scans')=>{
    if(!existsSync(dir)) return;
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const full=resolve(dir,entry.name);
      if (entry.isDirectory()) scan(full,`${prefix}/${entry.name}`);
      else if (entry.isFile()&&entry.name.endsWith('.json')) {
        try {const catalog=JSON.parse(readFileSync(full,'utf8'));map.set(`${prefix}/${entry.name}`,catalog);} catch {}
      }
    }
  };
  scan(folder);
  return map;
}

function sourceIntegrity(config, reviewResult) {
  const inventory=readJson(config.file);
  const expected=reviewResult.review?.inventorySha256 ?? null;
  return {
    sourceFile:config.file,
    sourceFileSha256:hashFile(config.file),
    sourceSha256:inventory.sourceSha256 ?? inventory.source?.sourceSha256 ?? null,
    sourceReviewFile:config.reviewFile ?? null,
    expectedInventorySha256:expected,
    reviewFresh:reviewResult.review ? reviewResult.fresh : null,
    reviewStatus:reviewResult.review ? (reviewResult.fresh?'current':'stale-hash') : 'no-separate-independent-review',
  };
}

function auxiliaryIntegrity(file, equipmentHash, inventoryHashes) {
  if (!existsSync(resolve(root,file))) return {file,status:'missing'};
  if (!file.endsWith('.json')) return {file,status:'narrative-source',sha256:hashFile(file)};
  const contents=readJson(file);
  const checks=[];
  if (contents.equipmentSha256) checks.push({kind:'equipment-data',expected:contents.equipmentSha256,actual:equipmentHash,status:contents.equipmentSha256===equipmentHash?'current':'stale-hash'});
  for (const [referenced,expected] of Object.entries(contents.inventorySha256||{})) {
    const normalized=referenced.startsWith('research/')?referenced:`research/${referenced}`;
    const actual=inventoryHashes.get(normalized)??(existsSync(resolve(root,normalized))?hashFile(normalized):null);
    checks.push({kind:'source-inventory',file:normalized,expected,actual,status:expected===actual?'current':'stale-hash'});
  }
  return {file,status:checks.some(check=>check.status==='stale-hash')?'stale-reference':'recorded',checks};
}

function sourceRowResultStatus(record, sourceFile) {
  const review=record.reviewStatus;
  if (record.siteMatch?.currentPriceCheck==='exact-amount-currency-page') return 'site-price-exactly-matched';
  if (record.siteMatch?.currentPriceCheck==='conflict') return 'site-price-conflict';
  if (record.siteMatch?.status) return record.siteMatch.status;
  if (review?.sourceValues==='independently-confirmed') return 'source-value-independently-confirmed';
  if (review?.sourceValues==='previously-confirmed-review-stale') return 'source-value-confirmation-review-stale';
  return 'source-row-transcribed-bounds-provisional';
}

function projectCollections(data={}) {
  const result=new Map();
  for(const collection of ['rules','spells','classes','equipment','matrices']) result.set(collection,data[collection]||[]);
  if(data.progressionExplainer){
    if(!data.progressionExplainer.id)data.progressionExplainer.id='progression-explainer';
    result.set('progressionExplainer',[data.progressionExplainer]);
  }
  return result;
}

function collectionItem(collections, collection, itemId) {
  const items=collections.get(collection);
  if(!items) return null;
  return items.find(item=>item.id===itemId)??null;
}

const citationMetadataKeys=new Set(['sourceExcerpts','scanVerification','evidenceBindings','regionReviews','regionEvidence','expectedRegionEvidence','targetReview','recordedReview','verification']);

function citationPages(value) {
  const pages=Array.isArray(value?.pages)?value.pages:Number.isInteger(value?.printedPage)?[value.printedPage]:Number.isInteger(value?.page)?[value.page]:[];
  return [...new Set(pages.filter(page=>Number.isInteger(page)&&page>0))];
}

function sourceCategoryFor(collection,parts) {
  if(parts[0]==='fieldSources')return 'field-source-reference';
  if(parts[0]==='references')return 'record-reference';
  if(collection==='classes'&&parts[0]==='xpRows')return 'class-xp-row';
  if(collection==='classes'&&parts[0]==='levelChanges')return 'class-level-change';
  if(collection==='classes'&&parts[0]==='xpContinuation')return 'class-xp-continuation';
  if(collection==='classes'&&parts[0]==='levelLimit')return 'class-level-limit';
  if(collection==='matrices')return 'matrix-reference';
  if(collection==='progressionExplainer')return 'progression-reference';
  return parts.length?'structured-source-reference':'record-page-reference';
}

function citationFieldPointer(collection,item,parts,sourceObjectPointer) {
  if(!parts.length)return '';
  if(parts.length>=2&&parts[0]==='fieldSources'){
    const candidate=jsonPointer(['fields',parts[1]]);
    if(valueAtPointer(item,candidate)!==undefined)return candidate;
  }
  return sourceObjectPointer;
}

function collectStructuredCitations(collections) {
  const candidates=[];
  for(const [collection,items] of collections){
    for(const item of items){
      const seen=new WeakSet();
      const walk=(value,parts=[])=>{
        if(!value||typeof value!=='object'||seen.has(value))return;
        seen.add(value);
        if(Array.isArray(value)){value.forEach((child,index)=>walk(child,[...parts,String(index)]));return;}
        const pages=citationPages(value);
        if(value.book&&pages.length){
          const sourceObjectPointer=parts.length?jsonPointer(parts):'';
          candidates.push({collection,item,value,parts,sourceObjectPointer,fieldPointer:citationFieldPointer(collection,item,parts,sourceObjectPointer),pages});
        }
        for(const [key,child] of Object.entries(value))if(!citationMetadataKeys.has(key))walk(child,[...parts,key]);
      };
      walk(item);
    }
  }
  return candidates;
}

function verifiedLegacyRegionIds(value,{book,printedPage,sourcePages,catalog}) {
  const ids=value.verification?.regions||[];
  if(!ids.length)return {regionIds:[],unmappedRegionIds:[],regions:[],hasLegacyTargets:false};
  const allRegions=catalog?.regions||[];
  const regions=ids.map(id=>allRegions.find(region=>region.id===id)).filter(region=>region&&region.book===book&&region.printedPage===printedPage);
  const matchedIds=new Set(regions.map(region=>region.id));
  const noCatalogMatch=ids.filter(id=>!allRegions.some(region=>region.id===id));
  const outsideCitedPages=ids.filter(id=>{
    const region=allRegions.find(candidate=>candidate.id===id);
    return region&&!(region.book===book&&sourcePages.includes(region.printedPage));
  });
  return {
    regionIds:[...new Set(regions.map(region=>region.id))],
    unmappedRegionIds:[...new Set([...noCatalogMatch,...outsideCitedPages])],
    regions,
    hasLegacyTargets:true,
  };
}

function structuredCitationBindings(collections,{knownBindings,catalogs}) {
  const covered=new Map();
  for(const binding of knownBindings){
    const key=`${binding.collection}\0${binding.itemId}\0${binding.sourceObjectPointer??binding.fieldPointer??''}`;
    if(!covered.has(key))covered.set(key,new Set());
    const pages=binding.pages??(Number.isInteger(binding.printedPage)?[binding.printedPage]:binding.sourcePages??[]);
    for(const page of pages)if(Number.isInteger(page))covered.get(key).add(page);
  }
  const generated=[];
  for(const candidate of collectStructuredCitations(collections)){
    const {collection,item,value,parts,sourceObjectPointer,pages}=candidate;
    const key=`${collection}\0${item.id}\0${sourceObjectPointer}`;
    const already=covered.get(key)||new Set();
    const book=value.book;
    const selectedCatalog=viewerCatalogFor(item);
    const catalog=selectedCatalog?catalogs.get(selectedCatalog):null;
    if(selectedCatalog&&!catalog)throw new Error(`Viewer-selected catalog ${selectedCatalog} is missing for ${collection}:${item.id}`);
    const missingValue=valueAtPointer(item,candidate.fieldPointer)===undefined;
    const valuePathMissing=missingValue&&isPairedFieldSourcePointer(candidate.fieldPointer,sourceObjectPointer);
    const valuePathStatus=valuePathMissing?'value-path-missing':'value-present';
    const pendingLabel=value.label??value.title??value.name??(parts.length?parts.at(-1):item.name??item.title??item.id);
    const rawLegacyIds=value.verification?.regions||[];
    for(const printedPage of pages){
      if(already.has(printedPage))continue;
      const {regionIds,unmappedRegionIds,regions,hasLegacyTargets}=verifiedLegacyRegionIds(value,{book,printedPage,sourcePages:pages,catalog});
      const sourceRowCurrent=hasLegacyTargets&&regionIds.length>0&&unmappedRegionIds.length===0;
      const reviewStatus=sourceRowCurrent?'region-verified':'field-target-pending';
      const sourceObjectPointerParts=pointerParts(sourceObjectPointer);
      const binding={
        collection,itemId:item.id,
        fieldPointer:candidate.fieldPointer,
        sourceObjectPointer,
        sourceOwner:{collection,itemId:item.id},
        sourceObject:pendingLabel,
        sourceCategory:sourceCategoryFor(collection,parts),
        book,printedPage,pdfPage:regions.length?regions[0].pdfPage:sourcePdfPage(book,printedPage),
        pages:[printedPage],sourcePages:pages,
        catalog:selectedCatalog,regionIds,...(unmappedRegionIds.length?{unmappedRegionIds}:{}),
        coordinateSpace:regionIds.length?'excerpt-image-normalized-top-left-xywh':null,
        reviewStatus,
        contextStatus:'context-not-assessed',
        contextLimitations:regionIds.length?['Legacy region IDs match this cited source page; contextual adequacy is not certified.']:['No independently reviewed field-to-region binding is recorded.'],
        sourceValueStatus:'not-assessed-by-field-target-review',
        valuePathStatus,
        sourceSha256:regions.length?regionSourceSha256(catalog,regions[0]):null,
        cropCoordinates:regions.map(regionCropCoordinate),
        highlightCoordinates:regions.map(region=>({regionId:region.id,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:region.focusRects||[]})),
        regionEvidence:regions.map(region=>({regionId:region.id,book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,sourceSha256:regionSourceSha256(catalog,region),imageSha256:region.sha256,focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),...sourceVisualRegionHashes(region)})),
        targetReview:null,
        ...(rawLegacyIds.length&&!regionIds.length?{legacyRegionStatus:'unmapped-or-source-page-mismatch'}:{}),
      };
      generated.push(binding);
      if(!covered.has(key))covered.set(key,new Set());
      covered.get(key).add(printedPage);
    }
  }
  return generated;
}

function manualBindingFor(binding,{collections,catalogs}) {
  const item=collectionItem(collections,binding.collection,binding.itemId);
  if(!item) throw new Error(`Manual field evidence target ${binding.collection}:${binding.itemId} is missing`);
  const target=valueAtPointer(item,binding.fieldPointer);
  const sourceObjectPointer=binding.sourceObjectPointer??binding.fieldPointer;
  const sourceObject=valueAtPointer(item,sourceObjectPointer);
  const valuePathMissing=target===undefined&&isPairedFieldSourcePointer(binding.fieldPointer,sourceObjectPointer);
  if(target===undefined&&!valuePathMissing) throw new Error(`Manual field evidence target ${binding.collection}:${binding.itemId}${binding.fieldPointer} does not resolve`);
  if(valuePathMissing&&binding.reviewStatus==='field-target-reviewed')throw new Error(`Reviewed target ${binding.collection}:${binding.itemId}${binding.fieldPointer} has no current value at the cited field path`);
  if(sourceObject===undefined||sourceObject===null||typeof sourceObject!=='object'||Array.isArray(sourceObject)) throw new Error(`Manual field evidence source object ${binding.collection}:${binding.itemId}${sourceObjectPointer} must resolve to a non-array source object`);
  const sourceOwner=binding.sourceOwner??{collection:binding.collection,itemId:binding.itemId};
  const owner=collectionItem(collections,sourceOwner.collection,sourceOwner.itemId);
  if(!owner) throw new Error(`Manual field evidence source owner ${sourceOwner.collection}:${sourceOwner.itemId} is missing`);
  const selectedCatalog=viewerCatalogFor(owner);
  if(binding.reviewStatus==='field-target-reviewed'&&binding.catalog!==selectedCatalog)throw new Error(`Reviewed target ${binding.collection}:${binding.itemId}${binding.fieldPointer} catalog ${binding.catalog??'(missing)'} is not the viewer-selected catalog ${selectedCatalog??'(none)'}`);
  const catalog=selectedCatalog?catalogs.get(selectedCatalog):null;
  if(selectedCatalog&&!catalog) throw new Error(`Viewer-selected catalog ${selectedCatalog} is missing`);
  const candidateIds=[...new Set(binding.regionIds||[])];
  const catalogRegions=catalog?.regions||[];
  const regionIds=candidateIds.filter(id=>catalogRegions.some(region=>region.id===id));
  const unmappedRegionIds=candidateIds.filter(id=>!regionIds.includes(id));
  const regions=regionIds.map(id=>catalogRegions.find(region=>region.id===id));
  const book=binding.book??sourceObject.book??target?.book??null;
  const printedPage=binding.printedPage??sourceObject.printedPage??sourceObject.pages?.[0]??sourceObject.page??target?.printedPage??target?.pages?.[0]??target?.page??null;
  const pdfPage=binding.pdfPage??(regions.length?regions[0].pdfPage:(book&&printedPage?sourcePdfPage(book,printedPage):null));
  const bindingSourceSha=binding.sourceSha256??(regions.length?regionSourceSha256(catalog,regions[0]):null);
  const reviewStatus=valuePathMissing?'field-target-pending':binding.reviewStatus??'field-target-pending';
  const targetReview=boundTargetReview(binding.targetReview);
  const evidence=regions.map(region=>({
    regionId:region.id,book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,
    sourceSha256:regionSourceSha256(catalog,region),imageSha256:region.sha256,
    focusRectsSha256:createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex'),
    ...sourceVisualRegionHashes(region),
  }));
  let sourceValueStatus=valuePathMissing?'source-field-value-missing':binding.sourceValueStatus??'not-assessed-by-field-target-review';
  if(!valuePathMissing&&(binding.valueReview||binding.sourceValueStatus===CONFIRMED_PRICE_VALUE_STATUS)){
    sourceValueStatus=derivePriceValueStatus({collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,sourceObjectPointer,target,valueReview:binding.valueReview,claimedStatus:binding.sourceValueStatus});
  }
  return {
    collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,
    sourceObject:binding.sourceObject??sourceObject.label??sourceObject.name??sourceObject.title??null,
    sourceCategory:binding.sourceCategory??'record-reference',book,printedPage,pdfPage,
    ...(binding.requiresRowEvidence===true?{requiresRowEvidence:true}:{}),
    ...(binding.requiresPassageEvidence===true?{requiresPassageEvidence:true}:{}),
    catalog:selectedCatalog,regionIds,...(unmappedRegionIds.length?{unmappedRegionIds}:{}),coordinateSpace:regionIds.length?'excerpt-image-normalized-top-left-xywh':null,
    reviewStatus,contextStatus:binding.contextStatus??'context-not-assessed',
    contextLimitations:binding.contextLimitations??[],sourcePages:binding.sourcePages??sourceObject.pages??target.pages??(printedPage?[printedPage]:[]),
    sourceValueStatus,
    valuePathStatus:valuePathMissing?'value-path-missing':'value-present',
    sourceSha256:bindingSourceSha,cropCoordinates:regions.map(regionCropCoordinate),
    highlightCoordinates:regions.map(region=>({regionId:region.id,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:region.focusRects||[]})),
    regionEvidence:evidence,expectedRegionEvidence:binding.expectedRegionEvidence??[],targetReview,
    sourceOwner,
    sourceObjectPointer,
  };
}

export function buildPriceSourceInventory({equipment=applyAssemblyMetadata(readJson('equipment.json').equipment), data=null, manualBindings=readJson('research/field-evidence-bindings.json'), catalogs=catalogMap(),sourceRowBindings=existsSync(resolve(root,EQUIPMENT_SOURCE_ROW_BINDINGS_FILE))?readJson(EQUIPMENT_SOURCE_ROW_BINDINGS_FILE):{schemaVersion:1,bindings:[]},sourceRowReviewFiles=new Map()}={}) {
  if(sourceRowBindings?.schemaVersion!==1||!Array.isArray(sourceRowBindings.bindings))throw new Error('Unsupported equipment source-row binding overlay; expected schemaVersion 1 with a bindings array');
  const sourceInventories=[];
  const rowLists=[];
  const sourceRowBindingRecords=[];
  const reviewFileCache=new Map(sourceRowReviewFiles);
  const sourceRowBindingsSha256=existsSync(resolve(root,EQUIPMENT_SOURCE_ROW_BINDINGS_FILE))?hashFile(EQUIPMENT_SOURCE_ROW_BINDINGS_FILE):null;
  const inventoryHashes=new Map();
  for (const config of sources) {
    const inventory=readJson(config.file);
    const reviewResult=independentReviewMap(config);
    const {rows}=makeSourceRows(config,inventory,reviewResult.review,reviewResult.fresh);
    sourceRowBindingRecords.push(...attachEquipmentSourceRowBindings({rows,config,equipment,overlay:sourceRowBindings,reviewFileCache}));
    inventoryHashes.set(config.file,hashFile(config.file));
    for (const row of rows) row.reviewStatus.final=sourceRowResultStatus(row,config.file);
    const denominators=inventoryDenominator(config,inventory);
    sourceInventories.push({
      id:config.id,
      category:config.category,
      sourceFiles:[config.file,...(config.reviewFile?[config.reviewFile]:[])],
      sourceIdentity:{book:inventory.source?.book??null,sourceSha256:inventory.sourceSha256??null},
      scope:inventory.scope,
      denominator:denominators,
      rowCount:rows.length,
      sourceRows:rows,
      formulas:(inventory.formulas??[]).map(formula=>({...formula,sourceCategory:'magic-item-sale-formula'})),
      qualifiers:(inventory.qualifiers??[]).map(qualifier=>({...qualifier,sourceCategory:'source-value-qualification'})),
      conditions:(inventory.conditions??[]).map(condition=>({...condition,sourceCategory:'price-or-fee-condition'})),
      exclusions:inventory.excluded??[],
      unresolved:inventory.unresolved??[],
      screening:inventory.screening??null,
      integrity:sourceIntegrity(config,reviewResult),
    });
    rowLists.push({config,rows});
  }
  for(const [overlayIndex,binding] of sourceRowBindings.bindings.entries())if(!sources.some(config=>config.file===binding.sourceInventoryFile)){
    sourceRowBindingRecords.push({overlayIndex,status:'pending-unknown-source-inventory',sourceInventoryFile:binding.sourceInventoryFile??null,sourceInventorySha256:binding.sourceInventorySha256??null,sourceRecordIndex:binding.sourceRecordIndex??null,sourceObject:binding.sourceObject??null,sourceSha256:binding.sourceSha256??null,itemId:binding.itemId??null,independentReviewFile:binding.independentReviewFile??null,independentReviewFileSha256:binding.independentReviewFileSha256??null,independentReviewRecordIndex:binding.independentReviewRecordIndex??null,sourceRowPresent:false,reviewRecordConfirmed:false,sitePriceCheck:null});
  }
  const sourceCensuses=buildSourcePageCensuses();
  const sourcePageMappingAudit=buildSourcePageMappingAudit(sourceInventories,sourceCensuses);
  const sourceRowBindingAudit=sourceRowBindingSummary(sourceRowBindingRecords,sourceRowBindingsSha256);
  const {allRows,byItemId}=matchSourceRows(equipment,rowLists);
  const equipmentHash=hashFile('equipment.json');
  const equipmentBindings=buildEvidenceBindings(equipment,{rootBindings:manualBindings,catalogs,sourceRowsByItem:byItemId});
  const assembledData=data??defaultBindingData(equipment);
  if(!assembledData.equipment) assembledData.equipment=equipment;
  const collections=projectCollections(assembledData);
  const genericBindings=(manualBindings.bindings||[]).filter(binding=>binding.collection!=='equipment').map(binding=>manualBindingFor(binding,{collections,catalogs}));
  const explicitBindings=[...equipmentBindings,...genericBindings];
  const generatedCitationBindings=structuredCitationBindings(collections,{knownBindings:explicitBindings,catalogs});
  const evidenceBindings=[...explicitBindings,...generatedCitationBindings];
  for (const {row} of allRows) {
    const itemId=row.siteMatch?.itemId;
    if (!itemId) continue;
    const itemBindings=evidenceBindings.filter(binding=>binding.itemId===itemId&&binding.fieldPointer==='/price');
    const rowBinding=itemBindings.find(binding=>binding.sourceRowIds?.includes(row.id))??itemBindings[0];
    if (rowBinding) {
      row.catalog=rowBinding.catalog;
      row.regionIds=rowBinding.regionIds;
      row.cropCoordinates=rowBinding.cropCoordinates;
      row.highlightCoordinates=rowBinding.highlightCoordinates;
      row.reviewStatus.binding=rowBinding.reviewStatus;
      row.reviewStatus.context=rowBinding.contextStatus;
    }
  }
  const bindingsByItem=new Map();
  for (const binding of evidenceBindings) {
    if(!bindingsByItem.has(binding.itemId))bindingsByItem.set(binding.itemId,[]);
    bindingsByItem.get(binding.itemId).push(binding);
  }
  const siteClaims=equipment.map(item=>{
    const bindings=bindingsByItem.get(item.id)||[];
    const priceBinding=bindings.find(binding=>binding.fieldPointer==='/price')??null;
    const rowRefs=byItemId.get(item.id)||[];
    const matchedRows=rowRefs.filter(row=>rowMatchesSitePrice(row,item));
    const proposedRows=rowRefs.filter(row=>row.siteMatch?.currentPriceCheck==='conflict');
    const claimType=item.price?'printed-price':'unextracted-price';
    return {
      itemId:item.id,
      name:item.name,
      fieldPointer:'/price',
      claimType,
      printedPrice:item.price?semanticValueSnapshot(item.price):null,
      priceState:item.priceState??null,
      priceNote:item.priceNote??null,
      reviewStatus:priceBinding?.reviewStatus??(item.price?'source-excerpt-only':'unextracted-gap'),
      evidenceBindings:priceBinding?[priceBinding]:[],
      sourceRowIds:matchedRows.map(row=>row.id),
      conflictingSourceRowIds:proposedRows.map(row=>row.id),
      sourcePageReference:item.price?{book:item.price.book??null,printedPages:item.price.pages??[],pdfPages:(item.price.pages||[]).map(page=>sourcePdfPage(item.price.book,page))}:null,
      estimate:item.suggestedPrice?{
        fieldPointer:'/suggestedPrice',
        classification:'editorial-estimate',
        value:semanticValueSnapshot(item.suggestedPrice),
        reviewStatus:'editorial-estimate',
        comparatorPointers:(item.suggestedPrice.comparisons||[]).map((_,index)=>jsonPointer(['suggestedPrice','comparisons',index])),
        comparatorEvidenceBindings:bindings.filter(binding=>binding.fieldPointer.startsWith('/suggestedPrice/comparisons/')),
      }:null,
      missingPrice:item.price==null,
    };
  });
  const auxiliary=auxiliarySources.map(file=>auxiliaryIntegrity(file,equipmentHash,inventoryHashes));
  const discoveries=readJson('research/price-source-inventory-index.json');
  const currentHashes=Object.fromEntries([...inventoryHashes.entries()].map(([file,sha256])=>[file,sha256]));
  const sourceRowCount=sourceInventories.reduce((sum,inventory)=>sum+inventory.rowCount,0);
  const categories={};
  for(const inventory of sourceInventories){
    categories[inventory.category]??={sourceInventories:0,sourceRows:0};
    categories[inventory.category].sourceInventories++;
    categories[inventory.category].sourceRows+=inventory.rowCount;
  }
  const allEvidenceBindings=evidenceBindings;
  return {
    schemaVersion:1,
    generatedBy:'tools/price-source-inventory.mjs',
    scope:'Bounded source-first inventory assembled from named reviewed tables, surveys and current site equipment claims. It is not an exhaustive inventory of price-bearing content in any book and does not certify whole-book coverage.',
    sourceInventories,
    sourcePageCensuses:sourceCensuses,
    sourcePageMappingAudit,
    sourceRowBindings:sourceRowBindingAudit,
    siteClaims,
    fieldEvidenceBindings:allEvidenceBindings,
    sourcePageDiscovery:{
      sourceFile:'research/price-source-inventory-index.json',
      scope:discoveries.scope,
      books:discoveries.books.map(book=>({book:book.book,sourceSha256:book.sourceSha256,pdfPages:book.pdfPages,candidatePages:book.candidatePages,reviewStatus:'discovery-unreviewed',candidates:book.candidates})),
      exhaustive:false,
    },
    auxiliaryRecords:auxiliary,
    counts:{
      siteEquipmentObjects:equipment.length,
      sitePrintedPrices:siteClaims.filter(claim=>claim.printedPrice).length,
      sitePriceGaps:siteClaims.filter(claim=>claim.missingPrice).length,
      editorialEstimates:siteClaims.filter(claim=>claim.estimate).length,
      sourceInventories:sourceInventories.length,
      sourceRows:sourceRowCount,
      sourceRowsByCategory:categories,
      fieldEvidenceBindings:evidenceBindings.length,
      fieldEvidenceBindingsByCollection:Object.fromEntries([...new Set(evidenceBindings.map(binding=>binding.collection))].sort().map(collection=>[collection,evidenceBindings.filter(binding=>binding.collection===collection).length])),
      regionBoundBindings:evidenceBindings.filter(binding=>binding.regionIds.length).length,
      pendingRegionBindings:evidenceBindings.filter(binding=>!binding.regionIds.length).length,
      sourcePageCensuses:sourceCensuses.length,
      sourceCensusPdfPages:sourceCensuses.reduce((sum,census)=>sum+census.pageCensus.denominator.count,0),
      sourceCensusClaims:sourceCensuses.reduce((sum,census)=>sum+census.claims.length,0),
      sourceCensusTableGroups:sourceCensuses.reduce((sum,census)=>sum+census.tableGroups.length,0),
      sourceRowBindings:sourceRowBindingAudit.total,
      currentReviewedSourceRowBindings:sourceRowBindingAudit.counts['reviewed-source-row-binding-current']??0,
      staleAuxiliaryReferences:auxiliary.reduce((sum,entry)=>sum+(entry.checks||[]).filter(check=>check.status==='stale-hash').length,0),
    },
    integrity:{
      equipmentSourceSha256:equipmentHash,
      sourceInventoryHashes:currentHashes,
      sourceCensusHashes:Object.fromEntries(sourceCensuses.map(census=>[census.sourceFiles[0],census.sourceFileSha256])),
      sourceRowBindingsSha256:sourceRowBindingsSha256,
      manualBindingsSha256:hashFile('research/field-evidence-bindings.json'),
    },
  };
}

function pointerParts(pointer) {
  if(pointer==='') return [];
  if (typeof pointer!=='string'||!pointer.startsWith('/')) return null;
  return pointer.slice(1).split('/').map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
}

function valueAtPointer(object,pointer) {
  const parts=pointerParts(pointer);
  if (!parts) return undefined;
  let current=object;
  for(const part of parts){
    if(current==null) return undefined;
    current=current[part];
  }
  return current;
}

function isPairedFieldSourcePointer(fieldPointer,sourceObjectPointer) {
  const field=pointerParts(fieldPointer),source=pointerParts(sourceObjectPointer);
  return field?.length===2&&source?.length>=2&&field[0]==='fields'&&source[0]==='fieldSources'&&field[1]===source[1];
}

export function validatePriceSourceInventory(inventory, {equipment=applyAssemblyMetadata(readJson('equipment.json').equipment),data=null,catalogs=catalogMap()}={}) {
  const fail=(message)=>{throw new Error(`Invalid price source inventory: ${message}`);};
  if(inventory?.schemaVersion!==1||!Array.isArray(inventory.sourceInventories)||!Array.isArray(inventory.siteClaims)||!Array.isArray(inventory.fieldEvidenceBindings)) fail('missing schema or collections');
  if(inventory.sourcePageCensuses!==undefined&&!Array.isArray(inventory.sourcePageCensuses))fail('source-page census section must be an array');
  if(inventory.siteClaims.length!==equipment.length) fail(`site-claim denominator ${inventory.siteClaims.length} != equipment records ${equipment.length}`);
  if(inventory.siteClaims.some((claim,index)=>claim.itemId!==equipment[index].id)) fail('site claim order or IDs do not match authored equipment');
  const validationData=data??defaultBindingData(equipment);
  if(!validationData.equipment)validationData.equipment=equipment;
  const collections=projectCollections(validationData);
  for(const source of inventory.sourceInventories){
    if(source.rowCount!==source.sourceRows.length) fail(`${source.id}: source row count mismatch`);
    if(source.denominator.some(d=>!Number.isInteger(d.count)||d.count<0)) fail(`${source.id}: invalid denominator`);
    if(source.integrity?.sourceFile && source.integrity.sourceFileSha256!==hashFile(source.integrity.sourceFile)) fail(`${source.id}: stale source inventory hash; regenerate report`);
    for(const row of source.sourceRows){
      if(row.sourceRowCoordinates && (row.sourceRowCoordinates.coordinateSpace!=='rendered-source-page-normalized-top-left-xywh'||row.sourceRowCoordinates.rect.length!==4||row.sourceRowCoordinates.rect.some(n=>!Number.isFinite(n)))) fail(`${row.id}: untyped source-row geometry`);
      if(row.source.sourceSha256 && !/^[a-f0-9]{64}$/.test(row.source.sourceSha256)) fail(`${row.id}: invalid source hash`);
    }
  }
  for(const census of inventory.sourcePageCensuses||[]){
    if(census.sourceFiles?.[0]&&census.sourceFileSha256!==hashFile(census.sourceFiles[0]))fail(`${census.sourceFiles[0]}: stale source-page census hash; regenerate report`);
    if(census.pageCensus?.denominator?.count!==census.pageCensus?.pages?.length)fail(`${census.id}: source-page census denominator does not match complete per-page records`);
  }
  if(inventory.sourceRowBindings){
    const overlayExists=existsSync(resolve(root,EQUIPMENT_SOURCE_ROW_BINDINGS_FILE));
    const currentOverlayHash=overlayExists?hashFile(EQUIPMENT_SOURCE_ROW_BINDINGS_FILE):null;
    if(inventory.sourceRowBindings.sourceFile!==EQUIPMENT_SOURCE_ROW_BINDINGS_FILE||inventory.sourceRowBindings.sourceFileSha256!==currentOverlayHash)fail('equipment source-row binding overlay is stale; regenerate report');
    if(inventory.integrity?.sourceRowBindingsSha256!==currentOverlayHash)fail('equipment source-row binding overlay integrity hash is stale; regenerate report');
    if(!Array.isArray(inventory.sourceRowBindings.records)||inventory.sourceRowBindings.total!==inventory.sourceRowBindings.records.length)fail('equipment source-row binding overlay denominator does not match records');
    for(const record of inventory.sourceRowBindings.records){
      if(record.status==='reviewed-source-row-binding-current'){
        const row=inventory.sourceInventories.find(source=>source.sourceFiles?.[0]===record.sourceInventoryFile)?.sourceRows?.[record.sourceRecordIndex];
        if(!row||row.sourceObject!==record.sourceObject||row.source.sourceSha256!==record.sourceSha256)fail(`${record.sourceInventoryFile}[${record.sourceRecordIndex}]: reviewed overlay does not resolve to its source row`);
        if(row.siteMatch?.itemId!==record.itemId||row.siteMatch.currentPriceCheck!=='exact-amount-currency-page')fail(`${record.sourceInventoryFile}[${record.sourceRecordIndex}]: reviewed overlay does not match current site price exactly`);
        if(record.reviewRecordConfirmed!==true||record.sitePriceCheck!=='exact-amount-currency-book-page')fail(`${record.sourceInventoryFile}[${record.sourceRecordIndex}]: reviewed overlay lacks independent identity/value confirmation`);
      }
    }
  }
  if(inventory.sourcePageMappingAudit){
    const currentAudit=buildSourcePageMappingAudit(inventory.sourceInventories,inventory.sourcePageCensuses||[]);
    if(JSON.stringify(inventory.sourcePageMappingAudit)!==JSON.stringify(currentAudit))fail('source-page mapping audit is stale; regenerate report');
  }
  const items=new Map(equipment.map(item=>[item.id,item]));
  for(const binding of inventory.fieldEvidenceBindings){
    const item=collectionItem(collections,binding.collection||'equipment',binding.itemId);
    if(!item) fail(`${binding.itemId}: unknown evidence binding target`);
    const sourceOwner=binding.sourceOwner??{collection:binding.collection||'equipment',itemId:binding.itemId};
    const owner=collectionItem(collections,sourceOwner.collection,sourceOwner.itemId);
    if(!owner) fail(`${binding.itemId}${binding.fieldPointer}: source owner ${sourceOwner.collection}:${sourceOwner.itemId} is missing`);
    const selectedCatalog=viewerCatalogFor(owner);
    if((binding.catalog??null)!==(selectedCatalog??null)) fail(`${binding.itemId}${binding.fieldPointer}: binding catalog ${binding.catalog??'(none)'} is not the viewer-selected catalog ${selectedCatalog??'(none)'} for ${sourceOwner.collection}:${sourceOwner.itemId}`);
    if(binding.reviewStatus==='field-target-reviewed'&&binding.unmappedRegionIds?.length) fail(`${binding.itemId}${binding.fieldPointer}: reviewed target contains region IDs outside its viewer-selected catalog`);
    const target=valueAtPointer(item,binding.fieldPointer??'');
    const sourceObjectPointer=binding.sourceObjectPointer??binding.fieldPointer??'';
    let sourceObject=valueAtPointer(item,sourceObjectPointer);
    let effectiveSourceObjectPointer=sourceObjectPointer;
    const fieldParts=pointerParts(binding.fieldPointer);
    const derivedFieldSource=fieldParts?.length===2&&fieldParts[0]==='fields'?jsonPointer(['fieldSources',fieldParts[1]]):null;
    if((sourceObject===undefined||sourceObject===null||typeof sourceObject!=='object')&&!binding.sourceObjectPointer&&binding.sourceCategory==='equipment-field'&&derivedFieldSource&&isPairedFieldSourcePointer(binding.fieldPointer,derivedFieldSource)){
      const derived=derivedFieldSource;
      const candidate=valueAtPointer(item,derived);
      if(candidate&&typeof candidate==='object'){effectiveSourceObjectPointer=derived;sourceObject=candidate;}
    }
    const valuePathMissing=target===undefined&&isPairedFieldSourcePointer(binding.fieldPointer,effectiveSourceObjectPointer);
    if(target===undefined&&(!valuePathMissing||binding.valuePathStatus!=='value-path-missing')) fail(`${binding.itemId}${binding.fieldPointer}: JSON Pointer does not resolve and is not explicitly recorded as a missing field value`);
    if(target!==undefined&&binding.valuePathStatus==='value-path-missing') fail(`${binding.itemId}${binding.fieldPointer}: value path is marked missing but resolves`);
    if(sourceObject===undefined||sourceObject===null||typeof sourceObject!=='object') fail(`${binding.itemId}${sourceObjectPointer}: cited source object does not resolve to an object`);
    if(binding.valueReview||binding.sourceValueStatus===CONFIRMED_PRICE_VALUE_STATUS){
      let derivedStatus;
      try{derivedStatus=derivePriceValueStatus({collection:binding.collection||'equipment',itemId:binding.itemId,fieldPointer:binding.fieldPointer??'',sourceObjectPointer:effectiveSourceObjectPointer,target,valueReview:binding.valueReview,claimedStatus:binding.sourceValueStatus});}
      catch(error){fail(error.message);}
      if(binding.sourceValueStatus!==derivedStatus)fail(`${binding.itemId}${binding.fieldPointer}: sourceValueStatus is not derived from its current frozen valueReview snapshot`);
    }
    if(sourceOwner.collection!==(binding.collection||'equipment')) fail(`${binding.itemId}${binding.fieldPointer}: source owner collection does not match route collection`);
    if(binding.sourceCategory==='printed-price-comparator'&&sourceObject.itemId!==sourceOwner.itemId) fail(`${binding.itemId}${binding.fieldPointer}: source owner does not match the cited comparator item`);
    if(binding.sourceCategory!=='printed-price-comparator'&&sourceOwner.itemId!==binding.itemId) fail(`${binding.itemId}${binding.fieldPointer}: non-comparator source owner must be the routed item`);
    if(!binding.book||!Number.isInteger(binding.printedPage)||!Array.isArray(binding.regionIds)||typeof binding.reviewStatus!=='string') fail(`${binding.itemId}${binding.fieldPointer}: incomplete binding`);
    for(const key of ['regionEvidence','cropCoordinates','highlightCoordinates']){
      if(!Array.isArray(binding[key])||JSON.stringify(binding[key].map(region=>region.regionId))!==JSON.stringify(binding.regionIds)) fail(`${binding.itemId}${binding.fieldPointer}: region selection alignment differs in ${key}`);
    }
    const targetBook=sourceObject.book??sourceObject.source?.book??null;
    const targetPages=sourceObject.pages??(Number.isInteger(sourceObject.printedPage)?[sourceObject.printedPage]:Number.isInteger(sourceObject.page)?[sourceObject.page]:null);
    if(targetBook&&targetBook!==binding.book) fail(`${binding.collection||'equipment'}:${binding.itemId}${binding.fieldPointer}: bound book does not match cited source object`);
    if(targetPages&&!targetPages.includes(binding.printedPage)) fail(`${binding.collection||'equipment'}:${binding.itemId}${binding.fieldPointer}: bound printed page does not match cited source object`);
    if(binding.regionIds.length){
      if(!binding.catalog) fail(`${binding.itemId}${binding.fieldPointer}: region target has no catalog`);
      const catalog=catalogs.get(binding.catalog);
      if(!catalog) fail(`${binding.catalog}: bound catalog missing`);
      try{assertPrimaryRowEvidence(binding,catalog);}catch(error){fail(error.message);}
      for(const id of binding.regionIds){
        const region=catalog.regions?.find(candidate=>candidate.id===id);
        if(!region) fail(`${binding.itemId}${binding.fieldPointer}: region ${id} missing from ${binding.catalog}`);
        if(region.book!==binding.book||region.printedPage!==binding.printedPage||region.pdfPage!==(binding.pdfPage??null)) fail(`${binding.itemId}${binding.fieldPointer}: ${id} does not match cited source page`);
        if(region.boundsPdfPoints||region.normalizedPageRect){
          const expectedCrop=regionCropCoordinate(region);
          const actualCrop=binding.cropCoordinates?.find(candidate=>candidate.regionId===id);
          if(!Array.isArray(expectedCrop.rect)||expectedCrop.rect.length!==4||expectedCrop.rect.some(value=>!Number.isFinite(value))) fail(`${binding.itemId}${binding.fieldPointer}: catalog crop geometry is malformed for ${id}`);
          if(!actualCrop||JSON.stringify(actualCrop)!==JSON.stringify(expectedCrop)) fail(`${binding.itemId}${binding.fieldPointer}: exported crop geometry is missing, lossy, or stale for ${id}`);
        }
        const evidence=binding.regionEvidence?.find(candidate=>candidate.regionId===id);
        if(evidence){
          const actualHashes=sourceVisualRegionHashes(region);
          if(evidence.sourceSha256!==regionSourceSha256(catalog,region)) fail(`${binding.itemId}${binding.fieldPointer}: source hash is stale for ${id}`);
          if(evidence.imageSha256!==region.sha256) fail(`${binding.itemId}${binding.fieldPointer}: image hash is stale for ${id}`);
          if(evidence.focusRectsSha256!==createHash('sha256').update(JSON.stringify(region.focusRects||[])).digest('hex')) fail(`${binding.itemId}${binding.fieldPointer}: highlight geometry is stale for ${id}`);
          if(evidence.focusSha256!==actualHashes.focusSha256) fail(`${binding.itemId}${binding.fieldPointer}: canonical highlight geometry is stale for ${id}`);
          if(evidence.contentSha256!==actualHashes.contentSha256) fail(`${binding.itemId}${binding.fieldPointer}: region content hash is stale for ${id}`);
        }
        const expectedEvidence=binding.expectedRegionEvidence?.find(candidate=>candidate.regionId===id);
        if(expectedEvidence){
          const actualHashes=sourceVisualRegionHashes(region);
          if(expectedEvidence.sourceSha256!==regionSourceSha256(catalog,region)) fail(`${binding.itemId}${binding.fieldPointer}: recorded source hash is stale for ${id}`);
          if(expectedEvidence.imageSha256!==region.sha256) fail(`${binding.itemId}${binding.fieldPointer}: recorded image hash is stale for ${id}`);
          if(expectedEvidence.focusSha256!==actualHashes.focusSha256) fail(`${binding.itemId}${binding.fieldPointer}: recorded canonical highlight geometry is stale for ${id}`);
          if(expectedEvidence.contentSha256!==actualHashes.contentSha256) fail(`${binding.itemId}${binding.fieldPointer}: recorded region content hash is stale for ${id}`);
        }
    if(binding.reviewStatus==='field-target-reviewed'){
          const expectedReview=binding.expectedRegionEvidence||[];
          const reviewed=expectedReview.find(candidate=>candidate.regionId===id);
          if(!binding.targetReview||binding.targetReview.status!=='confirmed'||binding.targetReview.independent!==true||typeof binding.targetReview.evidence!=='string'||!reviewed) fail(`${binding.itemId}${binding.fieldPointer}: reviewed target ${id} lacks independent hash-bound target review`);
          if(!reviewed.sourceSha256||!reviewed.imageSha256||!reviewed.focusSha256||!reviewed.contentSha256) fail(`${binding.itemId}${binding.fieldPointer}: reviewed target ${id} lacks complete source/image/focus/content hashes`);
          if(!binding.targetReview.evidence.startsWith('research/')||binding.targetReview.evidence.split('/').includes('..')||!existsSync(resolve(root,binding.targetReview.evidence))) fail(`${binding.itemId}${binding.fieldPointer}: target review evidence file is missing or outside research`);
          if(typeof binding.targetReview.evidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(binding.targetReview.evidenceSha256)||binding.targetReview.evidenceSha256!==hashFile(binding.targetReview.evidence)) fail(`${binding.itemId}${binding.fieldPointer}: target review evidence file is stale or lacks its recorded hash`);
        }
      }
      if(binding.coordinateSpace!=='excerpt-image-normalized-top-left-xywh') fail(`${binding.itemId}${binding.fieldPointer}: region target coordinate space missing`);
    } else if(binding.reviewStatus==='field-target-reviewed') fail(`${binding.itemId}${binding.fieldPointer}: reviewed target has no region IDs`);
    if(binding.sourceSha256&&binding.catalog){const sourceRegion=(catalogs.get(binding.catalog)?.regions||[]).find(region=>region.book===binding.book&&region.printedPage===binding.printedPage);if(!sourceRegion||binding.sourceSha256!==regionSourceSha256(catalogs.get(binding.catalog),sourceRegion))fail(`${binding.itemId}${binding.fieldPointer}: cited source hash is stale`);}
  }
  for(const claim of inventory.siteClaims){
    const item=items.get(claim.itemId);
    if(Boolean(claim.printedPrice)!==Boolean(item.price)) fail(`${claim.itemId}: printed-price classification mismatch`);
    if(claim.printedPrice&&JSON.stringify(semanticValueSnapshot(claim.printedPrice))!==JSON.stringify(semanticValueSnapshot(item.price))) fail(`${claim.itemId}: source claim drift`);
    if(Boolean(claim.estimate)!==Boolean(item.suggestedPrice)) fail(`${claim.itemId}: estimate classification mismatch`);
    if(claim.estimate&&JSON.stringify(semanticValueSnapshot(claim.estimate.value))!==JSON.stringify(semanticValueSnapshot(item.suggestedPrice))) fail(`${claim.itemId}: editorial estimate snapshot drift`);
    if(claim.missingPrice!==(item.price==null)) fail(`${claim.itemId}: gap classification mismatch`);
  }
  return inventory;
}

export function attachEvidenceBindings(data, inventory) {
  const collections=projectCollections(data);
  const seen=new WeakSet();
  const clearGeneratedEvidenceBindings=value=>{
    if(!value||typeof value!=='object'||seen.has(value))return;
    seen.add(value);
    if(!Array.isArray(value))delete value.evidenceBindings;
    for(const [key,child] of Object.entries(value))if(key!=='evidenceBindings')clearGeneratedEvidenceBindings(child);
  };
  clearGeneratedEvidenceBindings(data);
  const bindingsBySourceObject=new Map();
  for(const binding of inventory.fieldEvidenceBindings){
    const item=collectionItem(collections,binding.collection||'equipment',binding.itemId);
    if(!item)throw new Error(`Cannot attach field evidence to missing ${binding.collection||'equipment'}:${binding.itemId}`);
    const target=valueAtPointer(item,binding.sourceObjectPointer??binding.fieldPointer);
    if(!target||typeof target!=='object'||Array.isArray(target))throw new Error(`Cannot attach field evidence without a non-array source object: ${binding.collection||'equipment'}:${binding.itemId}${binding.fieldPointer}`);
    if(!bindingsBySourceObject.has(target))bindingsBySourceObject.set(target,[]);
    bindingsBySourceObject.get(target).push(binding);
  }
  for(const [target,bindings] of bindingsBySourceObject)target.evidenceBindings=bindings;
  return data;
}

export function writePriceSourceInventory(inventory, output='research/price-source-inventory.json') {
  writeFileSync(resolve(root,output),`${JSON.stringify(inventory,null,2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1])===resolve(import.meta.filename)) {
  const inventory=buildPriceSourceInventory();
  validatePriceSourceInventory(inventory);
  writePriceSourceInventory(inventory);
  console.log(JSON.stringify(inventory.counts));
}

