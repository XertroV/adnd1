import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {citationRegionRole} from './citation-region-role.mjs';
import {validScanCatalogPath,scanStates} from './scan-catalog.mjs';
import {loadSourceDiscoveryGroupReconciliation} from './source-discovery-group-reconciliation.mjs';

const root=resolve(import.meta.dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const records=data=>['rules','spells','equipment','classes','matrices'].flatMap(collection=>(data[collection]||[]).map(item=>({collection,item}))).concat(data.progressionExplainer?[{collection:'progressionExplainer',item:data.progressionExplainer}]:[]);

// Names suggest review candidates only. A source row is an expected citation only
// after an explicit mapping review; differently packaged offers remain distinct.
export function citationPages(item){
  const pages=new Set();
  function visit(value){
    if(!value||typeof value!=='object')return;
    if(value.book){
      for(const page of value.pages||[value.page??value.printedPage].filter(Number.isInteger))pages.add(`${value.book}:${page}`);
    }
    for(const [key,child] of Object.entries(value))if(!['evidenceBindings','regionReviews','sourceExcerpts','scanVerification'].includes(key))visit(child);
  }
  visit(item);
  return pages;
}

export function buildSourceTableCitationCoverage({data,priceInventory,contracts={schemaVersion:1,tables:[]},catalogs=new Map(),inputHashes={},strictViewerMetadata=false,discoveryReconciliation=null}){
  if(contracts.schemaVersion!==1||!Array.isArray(contracts.tables))throw Error('Invalid source-table contract schema');
  const owners=records(data), byOwner=new Map(owners.map(({collection,item})=>[`${collection}:${item.id}`,item]));
  const viewerCatalogEligibility=owners.map(({collection,item})=>{
    const binding=item.sourceExcerpts?'sourceExcerpts':'scanVerification',metadata=item[binding],catalog=catalogs.get(metadata?.catalog),reasons=[];
    if(!metadata)reasons.push('catalog-metadata-absent');
    else{
      if(!scanStates.has(metadata.state))reasons.push('state-ineligible');
      if(!validScanCatalogPath(item.id,metadata.catalog,metadata))reasons.push('owner-path-ineligible');
      if(metadata.collection!=null&&metadata.collection!==collection)reasons.push('owner-collection-mismatch');
      if(!catalog)reasons.push('catalog-absent');
      else{
        if(catalog.itemId!==item.id||(metadata.collection!=null&&catalog.collection!==metadata.collection))reasons.push('catalog-owner-mismatch');
        if(!Number.isInteger(metadata.regionCount)||metadata.regionCount!==catalog.regions?.length)reasons.push('region-count-mismatch');
      }
    }
    return {owner:`${collection}:${item.id}`,binding,catalog:metadata?.catalog??null,status:reasons.length?'viewer-catalog-metadata-invalid':'viewer-catalog-metadata-eligible',reasons};
  });
  const eligibilityByOwner=new Map(viewerCatalogEligibility.map(entry=>[entry.owner,entry]));
  const nameIndex=new Map();
  for(const {collection,item} of owners)for(const label of [item.name,item.title,...(item.aliases||[])]){
    const key=normalize(label);if(!key)continue;
    if(!nameIndex.has(key))nameIndex.set(key,[]);
    const owner=`${collection}:${item.id}`;if(!nameIndex.get(key).includes(owner))nameIndex.get(key).push(owner);
  }
  const rows=[];
  function inspectTarget(target,source){
    const owner=`${target.collection}:${target.itemId}`,item=byOwner.get(owner);
    if(!['confirmed','inapplicable','uncertain'].includes(target.applicability))throw Error(`Unknown source-row applicability: ${owner}`);
    if(target.applicability!=='confirmed')return {...target,owner,status:target.applicability==='inapplicable'?'explicitly-inapplicable':'mapping-review-required'};
    if(!target.evidence?.trim())throw Error(`Confirmed source-row mapping lacks evidence: ${owner}`);
    if(!item)return {...target,owner,status:'mapped-item-absent'};
    const viewerEligibility=eligibilityByOwner.get(owner);
    if(strictViewerMetadata&&viewerEligibility.status!=='viewer-catalog-metadata-eligible')return {...target,owner,status:'viewer-catalog-metadata-invalid',viewerEligibility};
    const key=`${source.book}:${source.printedPage}`,referencePresent=citationPages(item).has(key);
    const bindings=['sourceExcerpts','scanVerification'].flatMap(binding=>{
      const catalogPath=item[binding]?.catalog;
      return (catalogs.get(catalogPath)?.regions||[]).filter(region=>region.book===source.book&&region.printedPage===source.printedPage).map(region=>({binding,catalog:catalogPath,regionId:region.id,imageSha256:region.sha256,sourceSha256:catalogs.get(catalogPath)?.sources?.[region.book]?.sha256??null,declaredRegionRole:citationRegionRole(region)}));
    });
    // Match the viewer's sourceExcerpts-before-scanVerification selection. The
    // secondary catalog remains in the inventory, but cannot satisfy (or
    // invalidate) the region that a citation actually opens.
    const preferredBinding=item.sourceExcerpts?'sourceExcerpts':'scanVerification';
    const preferredSourceBindings=bindings.filter(binding=>binding.binding===preferredBinding);
    const currentSourceBindings=preferredSourceBindings.filter(binding=>binding.sourceSha256===source.sourceSha256);
    const missingRequiredRegionIds=(target.requiredRegionIds||[]).filter(id=>!currentSourceBindings.some(binding=>binding.regionId===id));
    if(target.requiredTableImageSha256&&(!/^[a-f0-9]{64}$/.test(target.requiredTableImageSha256)||!target.requiredRegionIds?.length))throw Error(`Invalid reviewed table-image contract: ${owner}`);
    const mismatchedTableImages=target.requiredTableImageSha256?currentSourceBindings.filter(binding=>target.requiredRegionIds.includes(binding.regionId)&&binding.imageSha256!==target.requiredTableImageSha256):[];
    if(target.requiredEvidenceRole!==undefined&&target.requiredEvidenceRole!=='row')throw Error('Unsupported table-row evidence role');
    if(target.requiredEvidenceRole==='row'&&!target.requiredRegionIds?.length)throw Error('A required row role needs explicit region IDs');
    const mismatchedRowRoles=target.requiredEvidenceRole==='row'?currentSourceBindings.filter(binding=>target.requiredRegionIds?.includes(binding.regionId)&&binding.declaredRegionRole!=='declared-row'):[];
    const supersededCatalogConflicts=bindings.filter(binding=>binding.binding!==preferredBinding&&target.requiredRegionIds?.includes(binding.regionId)&&((target.requiredTableImageSha256&&binding.imageSha256!==target.requiredTableImageSha256)||(target.requiredEvidenceRole==='row'&&binding.declaredRegionRole!=='declared-row'))).map(binding=>({...binding,status:'superseded-catalog-review-candidate'}));
    return {...target,owner,referencePresent,preferredBinding,sourcePageExcerpts:bindings,supersededCatalogConflicts,currentSourceExcerpts:currentSourceBindings.length,missingRequiredRegionIds,mismatchedTableImages,mismatchedRowRoles,status:!referencePresent?'confirmed-missing-reference':!preferredSourceBindings.length?'reference-without-source-excerpt':!currentSourceBindings.length?'source-identity-review-required':missingRequiredRegionIds.length?'required-table-region-absent':mismatchedTableImages.length?'required-table-image-mismatch':mismatchedRowRoles.length?'required-table-row-role-mismatch':'reference-and-source-page-excerpt-present',semanticTableContext:target.requiredTableImageSha256?'only-declared-table-image-and-role-identity-checked; row-focus-and-qualifiers-require-review':'not-proved-by-page-presence'};
  }
  for(const inventory of priceInventory.sourceInventories||[])for(const row of inventory.sourceRows||[]){
    const mapping=row.sourceRowBinding?.status==='reviewed-source-row-binding-current'&&row.siteMatch?.itemId?{
      collection:row.siteMatch.collection||'equipment',itemId:row.siteMatch.itemId,applicability:'confirmed',evidence:`Pinned source-row mapping: ${row.sourceRowBinding.review?.file||row.sourceRowBinding.independentReviewFile||'research/equipment-source-row-bindings.json'}; source value review remains separate.`,fieldPointer:row.siteMatch.fieldPointer||null,requiredRegionIds:[...new Set((row.highlightCoordinates||[]).map(region=>region.regionId))],
    }:null;
    const targets=mapping?[inspectTarget(mapping,row.source)]:[];
    rows.push({id:row.id,tableId:inventory.id,label:row.sourceObject,source:row.source,sourceFile:row.sourceFile,sourceRecordIndex:row.sourceRecordIndex,sourceValueReview:row.reviewStatus,targets,nameCandidates:nameIndex.get(normalize(row.sourceObject))||[],status:targets.length?'reviewed-row-item-mapping':'row-item-mapping-unreviewed',mappingLimitation:targets.length?null:'No omission inferred from an unreviewed name match or an unmatched row.'});
  }
  const seen=new Set(rows.map(row=>row.id));
  const tableIds=new Set();
  for(const table of contracts.tables){
    if(!table.id||!table.book||!Number.isInteger(table.printedPage)||!/^[a-f0-9]{64}$/.test(table.sourceSha256||''))throw Error('Invalid source-table contract identity');
    if(tableIds.has(table.id))throw Error(`Duplicate source-table contract: ${table.id}`);tableIds.add(table.id);
    if(!Array.isArray(table.rows)||!Number.isInteger(table.rowCount)||table.rowCount!==table.rows.length||table.rowCount<1)throw Error(`Source-table row denominator changed: ${table.id}`);
    for(const row of table.rows){
      if(!row.id||seen.has(row.id))throw Error(`Duplicate or empty source row: ${row.id}`);seen.add(row.id);
      const source={book:table.book,printedPage:table.printedPage,pdfPage:table.pdfPage??null,sourceSha256:table.sourceSha256};
      rows.push({id:row.id,tableId:table.id,label:row.label,source,targets:(row.targets||[]).map(target=>inspectTarget(target,source)),nameCandidates:nameIndex.get(normalize(row.label))||[],status:(row.targets||[]).length?'explicit-row-item-dispositions':'source-row-without-item-target',evidence:row.evidence||table.evidence||null,exclusions:row.exclusions||[],sourceRowDisposition:row.sourceRowDisposition??'explicitly-enumerated-source-row',rowMappingDisposition:row.rowMappingDisposition??null,rowMappingReason:row.rowMappingReason??row.unmappedOrVariantReason??null,sourceConditions:row.sourceConditions??null,printedCells:row.printedCells??null,scope:table.scope??table.sourceCategory??'non-price-table-row-reconciliation'});
    }
  }
  if(discoveryReconciliation&&!discoveryReconciliation.validation?.valid)throw Error('Discovery-group source reconciliation is invalid');
  const discoveryGroups=(priceInventory.sourcePageCensuses||[]).flatMap(census=>(census.sourceArtifact?.tableGroups||[]).map((table,index)=>{
    const groupId=table.recordId??`${census.id}-${String(index+1).padStart(3,'0')}`;
    const joined=discoveryReconciliation?.baselineReceipt.groups.find(group=>group.censusId===census.id&&group.groupId===groupId);
    const typed=joined?.supplement?.typedOutputPresent===true;
    const sourceReportedCount=joined?.supplement?.declaredPhysicalTableRows??joined?.supplement?.groupSummary?.sourceRowDenominator??null;
    return {censusId:census.id,...table,groupId,baselineRowTranscriptionComplete:table.rowTranscriptionComplete===true,coverageStatus:typed?'exact-typed-supplement-joined; item-citation-mapping-unreviewed':table.rowTranscriptionComplete?'row-transcribed-reconciliation-unverified':'row-denominator-unknown-not-transcribed',typedSupplement:joined?.supplement??null,sourceReportedDenominator:sourceReportedCount==null?null:{count:sourceReportedCount,unit:joined.supplement.source==='ua-additional-prices'?'source rows or prose-list entries':'source-reported physical table rows or outcomes',independentlyConfirmed:false},itemCitationMappingStatus:'not-assessed-by-typed-source-join'};
  }));
  const catalogRegions=owners.flatMap(({collection,item})=>['sourceExcerpts','scanVerification'].flatMap(binding=>{
    const path=item[binding]?.catalog;return (catalogs.get(path)?.regions||[]).map(region=>({owner:`${collection}:${item.id}`,binding,catalog:path,regionId:region.id,book:region.book,printedPage:region.printedPage,tableCandidate:/table/i.test([region.kind,region.title,region.label,region.caption,region.description,region.notes,region.summary,region.alt].filter(Boolean).join(' ')),status:'row-denominator-not-derived-from-crop'}));
  }));
  const counts={owners:owners.length,sourceRows:rows.length,priceInventoryRows:(priceInventory.sourceInventories||[]).reduce((n,table)=>n+(table.sourceRows||[]).length,0),explicitContractRows:rows.length-(priceInventory.sourceInventories||[]).reduce((n,table)=>n+(table.sourceRows||[]).length,0),rowStatus:{},targetStatus:{},catalogUsages:catalogRegions.length,catalogTableCandidates:catalogRegions.filter(row=>row.tableCandidate).length,discoveryTableGroups:discoveryGroups.length,baselineUnknownDiscoveryRowDenominators:discoveryGroups.filter(row=>!row.baselineRowTranscriptionComplete).length,unknownDiscoveryRowDenominators:discoveryGroups.filter(row=>!row.sourceReportedDenominator&&!row.rowTranscriptionComplete).length,discoveryGroupsWithTypedOutput:discoveryGroups.filter(row=>row.typedSupplement?.typedOutputPresent).length};
  counts.supersededCatalogConflictBindings=0;
  for(const row of rows){counts.rowStatus[row.status]=(counts.rowStatus[row.status]||0)+1;for(const target of row.targets){counts.targetStatus[target.status]=(counts.targetStatus[target.status]||0)+1;counts.supersededCatalogConflictBindings+=target.supersededCatalogConflicts?.length||0;}}
  counts.viewerMetadataInvalidOwners=viewerCatalogEligibility.filter(entry=>entry.status==='viewer-catalog-metadata-invalid').length;
  const failures=rows.flatMap(row=>row.targets.filter(target=>['confirmed-missing-reference','mapped-item-absent','required-table-region-absent','required-table-image-mismatch','required-table-row-role-mismatch','reference-without-source-excerpt','source-identity-review-required','viewer-catalog-metadata-invalid'].includes(target.status)).map(target=>({rowId:row.id,tableId:row.tableId,owner:target.owner,status:target.status})));
  return {schemaVersion:1,generatedBy:'tools/source-table-citation-coverage.mjs',scope:'All exposed owners and catalog usages; all rows in the bounded source-price inventories plus explicit non-price source-table contracts. Page/excerpt presence does not prove that the correct table, row, qualifiers or field highlighting is present. Unknown source rows remain unassessed.',inputHashes,counts,validation:{valid:failures.length===0,failures,viewerMetadataGate:strictViewerMetadata?'enforced':'model-only-not-enforced',policy:'Explicitly mapped source-row items require the recorded source-page citation, current source identity and excerpt, plus any declared region IDs. Unreviewed mappings and semantic image/context questions remain review work, not passes.'},viewerCatalogEligibility,rows,discoveryGroups,discoverySupplementSummary:discoveryReconciliation?{reconciliation:discoveryReconciliation.reconciliation,sourceReports:discoveryReconciliation.sourceReports,itemCitationMappings:discoveryReconciliation.itemCitationMappings}:null,catalogRegions,limitations:['Name and alias matches are review candidates only; no automatic citation insertion.','Explicit variants and inapplicable mappings retain individual dispositions.','Source-row mapping approval is separate from price-value and highlight review.','Untranscribed tables and uncensused tables cannot support a completeness claim.']};
}

export function loadSourceTableCitationCoverage({repoRoot=root,dataPath='dist/data.json',contractsPath='research/source-table-citation-contracts.json'}={}){
  const hashes={},load=path=>{const bytes=readFileSync(resolve(repoRoot,path));hashes[path]=sha(bytes);return JSON.parse(bytes);};
  const data=load(dataPath),priceInventory=load('research/price-source-inventory.json');
  // Historical snapshots can explicitly declare that this contract did not yet
  // exist. Production/CI must never silently drop its full row denominator.
  const contracts=contractsPath===null?{schemaVersion:1,tables:[]}:load(contractsPath);
  const catalogs=new Map();for(const {item} of records(data))for(const binding of ['sourceExcerpts','scanVerification']){
    const path=item[binding]?.catalog;if(path&&!catalogs.has(path))catalogs.set(path,load(`dist/${path}`));
  }
  const discoveryReconciliation=contractsPath===null?null:loadSourceDiscoveryGroupReconciliation({repoRoot});
  if(discoveryReconciliation)Object.assign(hashes,discoveryReconciliation.inputHashes);
  return {...buildSourceTableCitationCoverage({data,priceInventory,contracts,catalogs,inputHashes:hashes,strictViewerMetadata:true,discoveryReconciliation}),contractInputStatus:contractsPath===null?'explicitly-unavailable-historical-input':'loaded'};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),check=args.includes('--check');
  const output=resolve(args.find(arg=>arg!=='--check')||'/tmp/source-table-citation-coverage.json');
  const report=loadSourceTableCitationCoverage();mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  const markdown=['# Source-table citation reconciliation','',report.scope,'',`Owners: ${report.counts.owners}; catalog usages: ${report.counts.catalogUsages}; table-label candidates: ${report.counts.catalogTableCandidates}.`,`Bounded source rows: ${report.counts.sourceRows}; row dispositions: ${JSON.stringify(report.counts.rowStatus)}.`,`Mapped item citation outcomes: ${JSON.stringify(report.counts.targetStatus)}.`,`Discovery table groups: ${report.counts.discoveryTableGroups}; exact typed supplements: ${report.counts.discoveryGroupsWithTypedOutput}; groups without a harmonized source-reported row denominator: ${report.counts.unknownDiscoveryRowDenominators}. Typed records, physical rows, amount cells and item-citation mappings remain separate.`,`Required citation gate: ${report.validation.valid?'PASS':'FAIL'}. Semantic context, highlighting and source completeness remain separate reviews.`,'',...report.limitations.map(note=>`- ${note}`),''].join('\n');
  writeFileSync(output.replace(/\.json$/,'')+'.md',markdown);
  console.log(JSON.stringify({output,counts:report.counts,validation:report.validation}));
  if(check&&!report.validation.valid)process.exitCode=1;
}
