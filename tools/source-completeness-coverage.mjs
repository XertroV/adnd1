import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import books from '../dist/books.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const codes=['PHB','DMG','UA','MM','MM2'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const dispositionStates=new Set(['present-findable','present-unfindable','incomplete','citation-only','absent','excluded','unassessable']);
const ledgerBookCode=ledger=>books.code(typeof ledger.book==='string'?ledger.book:ledger.book?.sourceLabel);

export function buildSourceCompletenessCoverage({pageBaseline,siteBaseline,ledgers,currentData,repairs=null}){
  if(pageBaseline?.denominators?.physicalPdfPages!==776||pageBaseline.books?.length!==5)throw new Error('Expected the independently captured five-book/776-physical-page baseline.');
  if(siteBaseline?.denominators?.exposedContentOwners!==997)throw new Error('Expected the captured 997-owner site baseline; this is not a source-unit denominator.');
  if(ledgers.length!==5)throw new Error('Every supplied book requires a source-unit ledger.');
  const reports=[];
  for(const code of codes){
    const matches=ledgers.filter(ledger=>ledgerBookCode(ledger)===code);
    if(matches.length!==1)throw new Error(`${code}: missing or duplicate book ledger`);
    const ledger=matches[0],baseline=pageBaseline.books.find(book=>book.book===code);
    if(ledger.schemaVersion!==1||ledger.inputCommit!==pageBaseline.inputCommit)throw new Error(`${code}: source ledger has a different capture lineage`);
    if(ledger.source?.sha256!==baseline.sha256||ledger.source?.pdfPages!==baseline.pdfPages)throw new Error(`${code}: source identity or physical-page denominator changed`);
    const pages=Array.isArray(ledger.pageCoverage)?ledger.pageCoverage:ledger.pageCoverage?.pages;
    if(!Array.isArray(pages)||pages.length!==baseline.pdfPages)throw new Error(`${code}: incomplete physical-page coverage`);
    const pageSet=new Set(pages.map(page=>page.pdfPage));
    if(pageSet.size!==baseline.pdfPages||Array.from({length:baseline.pdfPages},(_,i)=>i+1).some(page=>!pageSet.has(page)))throw new Error(`${code}: physical-page omissions, duplicates or invalid pages`);
    const printedMap=new Map(baseline.declaredMapping.printedPages.filter(page=>page.availability==='available').map(page=>[page.printedPage,page.pdfPage]));
    for(const page of pages){
      if(page.printedPage!==null&&page.printedPage!==undefined&&(!Number.isInteger(page.printedPage)||printedMap.get(page.printedPage)!==page.pdfPage))throw new Error(`${code}: observed printed folio conflicts with declared physical-page map`);
    }
    const unassessed=Array.isArray(ledger.unassessed)?ledger.unassessed:ledger.unassessed&&typeof ledger.unassessed==='object'?Object.entries(ledger.unassessed).map(([scope,detail])=>({scope,detail})):[];
    if(!Array.isArray(ledger.sourceUnits)||!unassessed.length)throw new Error(`${code}: source units or explicit unassessed universe missing`);
    const ids=new Set(),kinds={},dispositions={};
    for(const unit of ledger.sourceUnits){
      if(!unit.id||ids.has(unit.id))throw new Error(`${code}: missing or duplicate source-unit ID`);
      ids.add(unit.id);
      if(!Array.isArray(unit.pdfPages)||unit.pdfPages.some(page=>!Number.isInteger(page)||!pageSet.has(page)))throw new Error(`${code}:${unit.id}: invalid physical source-page locator`);
      if(!Array.isArray(unit.printedPages))throw new Error(`${code}:${unit.id}: printed-page scope is not explicit`);
      if(!unit.printedPages.length&&!unit.pdfPages.length)throw new Error(`${code}:${unit.id}: source unit has no source-page locator`);
      for(const printed of unit.printedPages){
        const supplement=code==='DMG'&&printed===175;
        if(supplement){
          if(unit.pdfPages.length||unit.sourceArtifact?.sha256!==pageBaseline.supplement.sha256)throw new Error(`${code}:${unit.id}: supplemental source identity or physical-page distinction lost`);
        }else if(!Number.isInteger(printed)||!printedMap.has(printed)||!unit.pdfPages.includes(printedMap.get(printed)))throw new Error(`${code}:${unit.id}: printed-unit folio has no matching physical source-page locator`);
      }
      if(!unit.inventoryStatus||!Array.isArray(unit.siteDispositions)||!unit.siteDispositions.length)throw new Error(`${code}:${unit.id}: inventory or site disposition missing`);
      kinds[unit.kind]=(kinds[unit.kind]||0)+1;
      for(const disposition of unit.siteDispositions){
        const value=disposition.disposition||disposition.status||disposition.classification;
        if(!dispositionStates.has(value))throw new Error(`${code}:${unit.id}: unsupported site disposition`);
        const hasEvidence=typeof disposition.evidence==='string'?!!disposition.evidence.trim():Array.isArray(disposition.evidence)?disposition.evidence.length>0:!!disposition.evidence&&typeof disposition.evidence==='object'&&Object.keys(disposition.evidence).length>0;
        if(!hasEvidence&&!(value==='unassessable'&&typeof disposition.reason==='string'&&disposition.reason.trim()))throw new Error(`${code}:${unit.id}: disposition has no evidence or explicit unassessable reason`);
        dispositions[value]=(dispositions[value]||0)+1;
      }
    }
    const unitMap=new Map(ledger.sourceUnits.map(unit=>[unit.id,unit]));
    for(const page of pages)for(const id of page.sourceUnitIds||[]){
      if(!unitMap.has(id)||!unitMap.get(id).pdfPages.includes(page.pdfPage))throw new Error(`${code}: declared page-to-unit cross-link is invalid`);
    }
    const physicalPagesWithoutNamedUnitAssignments=pages.filter(page=>!ledger.sourceUnits.some(unit=>unit.pdfPages.includes(page.pdfPage))).map(page=>({pdfPage:page.pdfPage,printedPage:page.printedPage??null,status:'source-unit-assignment-unassessed'}));
    reports.push({book:code,source:ledger.source,physicalPdfPages:pages.length,
      namedSourceUnits:ledger.sourceUnits.length,sourceUnitsByKind:kinds,
      completeSemanticSourceUnitDenominator:null,
      physicalPagesWithoutNamedUnitAssignments,
      crosslinkScope:'Declared page-to-unit links are checked where supplied. Source-unit span backreferences and missing assignments are structural metadata, not independent visual verification of each source unit.',
      unitCountMeaning:'Named source units/candidates can overlap by section, table, heading, procedure and page. This is not a complete atom, row, stat-profile or prose census.',
      baselineCommit:ledger.inputCommit,
      baselineSiteDispositionOccurrences:dispositions,
      dispositionCountMeaning:'A unit can have different dispositions on different repository, rendered, search and citation surfaces. Counts overlap and are not an error total.',
      baselineFindings:ledger.findings,checkedNegativeScope:ledger.checkedNegativeScope,
      unassessed,mappingHandoff:ledger.mappingHandoff});
  }
  const ownerCollections=['rules','spells','equipment','matrices','classes'];
  const currentOwners=Object.fromEntries(ownerCollections.map(key=>[key,(currentData[key]||[]).length]));
  currentOwners.progressionExplainer=currentData.progressionExplainer?1:0;
  return {schemaVersion:1,artifactType:'source-completeness-coverage-and-unresolved-inventory',
    baselineCommit:pageBaseline.inputCommit,
    scope:'All five supplied books have an explicit physical-page inventory and a source-first named-unit ledger. Actual source-unit semantics, row coverage, qualifiers and unknown continuations remain bounded and explicitly unassessed where not reviewed.',
    denominators:{canonicalPdfs:5,physicalPdfPages:776,supplementalImages:1,
      namedSourceUnits:reports.reduce((sum,book)=>sum+book.namedSourceUnits,0),
      completeSemanticSourceUnitCount:null,semanticallyCompleteBooks:0,
      beforeSiteOwners:997,currentSiteOwners:Object.values(currentOwners).reduce((a,b)=>a+b,0),currentOwnersByCollection:currentOwners},
    supplement:pageBaseline.supplement,
    bookReports:reports,
    siteBaseline:{path:'research/source-completeness-site.json',denominators:siteBaseline.denominators,
      findings:siteBaseline.findings.map(({id,status,title})=>({id,status,title})),
      scope:'Captured before repair. Current dispositions belong to the separate repair register; the historical site/property denominator is not a source denominator.'},
    repairs,
    interpretation:['Physical-page accounting is complete for these exact bytes; source-unit semantic completeness is not established.',
      'Book dispositions and finding records are frozen baseline observations at baselineCommit. Current repair and publication states are recorded separately in repairs; baseline open labels are not current unresolved totals.',
      'A no-candidate OCR/lexical/geometry result is not a source-completeness pass.',
      'Documented product exclusions, internal-index omissions, incomplete summaries, citation-only links and unassessable source meaning remain separate.',
      'Present in data, rendered to users and searchable are independent axes. A parent document can be findable while an exact numeric field is omitted from direct search.',
      'Historical 453 primary-reference occurrences, 2,190 highlight warnings and 3,849 pending/other field-target states are different captured queues, not missing-table or whole-book error counts.'],
  };
}

export function markdownSourceCompleteness(report){
  let text='# Source completeness inventory\n\n'+report.scope+'\n\n';
  text+=`Baseline: \`${report.baselineCommit}\`. The denominator is **776 physical PDF pages plus one separate supplemental image**. **No whole book is certified semantically complete.**\n\n`;
  text+='| Book | Physical PDF pages | Named units/candidates | Complete semantic unit denominator |\n|---|---:|---:|---|\n';
  for(const book of report.bookReports)text+=`| ${book.book} | ${book.physicalPdfPages} | ${book.namedSourceUnits} | Not established |\n`;
  text+='\nNamed units overlap by section, table, heading and procedure; they are not additive rule atoms. See the JSON and individual source ledgers for every page, scope, source identity, site disposition, checked-negative boundary, and remaining review item.\n\n';
  text+='## Current repair batches\n\n';
  for(const batch of report.repairs?.batches||[]){
    const release=batch.release;
    text+=`- **${batch.id}**: ${batch.status}${release?` — [PR](${release.pullRequest}), Version ${release.version}, merge \`${release.mergeCommit}\``:''}.\n`;
  }
  text+='\nThe following book findings and disposition counts describe the frozen baseline. They preserve before evidence; use the repair batches above for current publication status.\n\n';
  for(const book of report.bookReports){
    text+=`## ${book.book}\n\n`;
    for(const finding of book.baselineFindings||[])text+=`- **${finding.id}** (baseline): ${finding.summary||finding.title||finding.finding||finding.description||finding.status||'See source ledger for exact evidence.'}\n`;
    text+='\n';
  }
  text+='## Interpretation\n\n'+report.interpretation.map(line=>'- '+line).join('\n')+'\n';
  return text;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
  const ledgers=codes.map(code=>read(`research/source-completeness-${code.toLowerCase()}.json`));
  const report=buildSourceCompletenessCoverage({pageBaseline:read('research/source-completeness-page-baseline.json'),siteBaseline:read('research/source-completeness-site.json'),ledgers,currentData:read('dist/data.json'),repairs:existsSync(resolve(root,'research/source-completeness-repairs.json'))?read('research/source-completeness-repairs.json'):null});
  report.inputs=['research/source-completeness-page-baseline.json','research/source-completeness-site.json',...codes.map(code=>`research/source-completeness-${code.toLowerCase()}.json`),'dist/data.json',...(report.repairs?['research/source-completeness-repairs.json']:[])].map(path=>({path,sha256:digest(readFileSync(resolve(root,path)))}));
  const output=resolve(root,process.argv[2]||'research/source-completeness-coverage.json');
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  writeFileSync(output.replace(/\.json$/,'.md'),markdownSourceCompleteness(report));
  console.log(JSON.stringify({output,denominators:report.denominators}));
}
