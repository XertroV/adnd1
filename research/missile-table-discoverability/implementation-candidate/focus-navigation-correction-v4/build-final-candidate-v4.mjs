import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonical,regionHashes} from '../../../../tools/source-visual-coverage.mjs';
import {validateScanCatalog} from '../../../../tools/scan-catalog.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../');
const require=createRequire(import.meta.url);
const books=require('../../../../dist/books.js');
const OUT='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v4';
const V3='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v3';
const expectedHead='4aa977788085f67a28a24d40965edf987bc7242b';
const expectedV3={
 manifest:'fbcb46cffc723afef4f1006faf029febc079dccbdd60e5a0c67cc9470c30b614',
 phbCatalog:'f836119d3caf264ca54dae5be680317fabd683da654d3822dcc72d0c49fe075d',
 uaCatalog:'b63c78be0e043f24fec5d71a75c3c1867471b26868e0a93f2f32f0e60cfe275f',
 records:'5961a9f50570298b93e943f45d74d5edc4245b84f29662df3056f292622c9b42',
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=relative=>readFileSync(path.join(root,relative));
const read=relative=>JSON.parse(bytes(relative).toString('utf8'));
const write=(filename,value)=>writeFileSync(path.join(here,filename),JSON.stringify(value,null,2)+'\n');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
mkdirSync(path.join(here,'catalogs'),{recursive:true});
const currentHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert(currentHead===expectedHead,`Expected current base ${expectedHead}; got ${currentHead}`);
const v3Manifest=read(`${V3}/production-metadata-manifest.json`);
assert(sha(bytes(`${V3}/production-metadata-manifest.json`))===expectedV3.manifest,'Frozen V3 manifest changed');
const v3Records=read(`${V3}/rules-records-candidate-corrected.json`);
assert(sha(bytes(`${V3}/rules-records-candidate-corrected.json`))===expectedV3.records,'Frozen V3 records changed');
const catalogs={
 'phb-hurled-weapons-and-missiles-table':read(`${V3}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`),
 'ua-hurled-weapons-and-missiles-table':read(`${V3}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`),
};
assert(sha(bytes(`${V3}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`))===expectedV3.phbCatalog,'Frozen V3 PHB catalog changed');
assert(sha(bytes(`${V3}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`))===expectedV3.uaCatalog,'Frozen V3 UA catalog changed');
const v3Catalogs=structuredClone(catalogs);
const records=structuredClone(v3Records);
const v3RecordsClone=structuredClone(v3Records);

const ownerSpecs={
 'phb-hurled-weapons-and-missiles-table':{book:'PHB',page:38,pdf:39,rows:15,notes:2,footnotes:0},
 'ua-hurled-weapons-and-missiles-table':{book:'UA',page:28,pdf:29,rows:24,notes:2,footnotes:1},
};
const contextIds=new Set(['phb38-table-context','ua28-table-context']);
const scopedRegionIds=new Set();
const ownerRegionIds=new Map();
for(const [owner,spec] of Object.entries(ownerSpecs)){
 const catalog=catalogs[owner];
 const pageRegions=catalog.regions.filter(region=>region.book===spec.book&&region.printedPage===spec.page);
 assert(pageRegions.length===spec.rows+spec.notes+spec.footnotes+1,`${owner}: unexpected page region count`);
 ownerRegionIds.set(owner,new Set(pageRegions.map(region=>region.id)));
 for(const region of pageRegions)scopedRegionIds.add(region.id);
 const whole=pageRegions.find(region=>contextIds.has(region.id));
 assert(whole&&whole.focusRects.length===0,`${owner}: complete table must remain unmarked`);
 catalog.scope=owner.startsWith('phb-')
  ?'PHB p. 38 missile table excerpt catalog. The 15 source rows and two printed notes have separate focused regions. The complete table region is unmarked and supports whole-table lookup. Three PHB p. 36 armor-class rows are reused as distinct owner-specific cross-references.'
  :'UA p. 28 missile table excerpt catalog. The 24 source rows, two printed notes, and Aklys footnote have separate focused regions. The complete table region is unmarked and supports whole-table lookup. Three PHB p. 36 armor-class rows are reused as distinct owner-specific cross-references.';
 delete catalog.candidateStatus;
 for(const reuse of catalog.reusedRegions||[]){
  reuse.policy='This owner-specific catalog reuses the listed PHB p. 36 armor-class source region with the same source identity, image bytes, and focus geometry.';
 }
 for(const region of pageRegions){
  delete region.candidateStatus;
  delete region.checkedOn;
  const where=`${spec.book} printed p. ${spec.page} / supplied PDF p. ${spec.pdf}`;
  if(contextIds.has(region.id)){
   region.summary='Complete unmarked table excerpt with the printed heading, all source rows, column labels, and applicable notes.';
   region.checkedFields={
    sourceLocation:`${where}; source image identity and crop bounds are recorded in this catalog.`,
    wholeLookupScope:'The complete table is the whole-table lookup region. Row and note targets use their separate focused regions.',
    focusGeometry:'No highlight rectangles are applied to this complete-table view.',
   };
  }else if(region.role==='row'){
   region.summary=`Complete source-row excerpt for ${region.sourceRowId||region.title||region.id}.`;
   region.checkedFields={
    sourceLocation:`${where}; source row ${region.sourceRowId||region.title||region.id}.`,
    focusGeometry:'Two separate highlight bands follow the printed left and right table sections for this source row.',
    valueBoundary:'The focus identifies the printed row; numeric field and mechanics grades are separate assessments.',
   };
  }else if(region.role==='note'){
   region.summary=`Printed table-note excerpt: ${region.title||region.id}.`;
   region.checkedFields={
    sourceLocation:`${where}; printed note within the missile table.`,
    focusGeometry:'The highlight selects the printed note text.',
    valueBoundary:'The note region does not assign numeric field or mechanics grades.',
   };
  }else if(region.role==='footnote'){
   region.summary='Printed Aklys footnote excerpt, including its asterisk marker and 10-foot-only range qualifier.';
   region.checkedFields={
    sourceLocation:`${where}; Aklys footnote.`,
    focusGeometry:'The highlight selects the printed footnote text and marker.',
    valueBoundary:'The footnote region does not assign numeric field or mechanics grades.',
   };
  }else throw Error(`${owner}/${region.id}: unsupported role ${region.role}`);
 }
}

const regionByOwner=new Map(Object.entries(catalogs).map(([owner,catalog])=>[owner,new Map(catalog.regions.map(region=>[region.id,region]))]));
let bindingChanges=0,contentHashChanges=0;
for(const record of records.records){
 delete record.candidateStatus;
 const allowed=ownerRegionIds.get(record.id);
 assert(allowed,`Unexpected owner ${record.id}`);
 const targets=(record.table.rows||[]).map(row=>row.sourceReference).concat((record.table.sourceNotes||[]).map(note=>note.sourceReference),(record.table.footnotes||[]).map(note=>note.sourceReference));
 for(const ref of targets){
  for(const binding of ref?.evidenceBindings||[]){
   for(const evidence of binding.regionEvidence||[]){
    if(!allowed.has(evidence.regionId))continue;
    const region=regionByOwner.get(record.id).get(evidence.regionId);
    assert(region,`Missing V4 region ${record.id}/${evidence.regionId}`);
    assert(binding.reviewStatus==='field-target-pending','Field-target status changed');
    assert(binding.sourceValueStatus==='not-assessed-by-field-target-review','Source value status changed');
    assert(binding.valuePathStatus==='value-present','Value path status changed');
    binding.contextStatus='field-target-pending';
    binding.contextLimitations=['Target review does not assign numeric, mechanics, or source-value grades.'];
    const old=evidence.contentSha256;
    evidence.contentSha256=regionHashes(region).contentSha256;
    if(old!==evidence.contentSha256)contentHashChanges++;
    bindingChanges++;
   }
  }
 }
}
records.status='Research-only V4 wrapper; not active production data or source-grade registration.';
assert(bindingChanges===44&&contentHashChanges===44,`Expected 44 neutral workflow/hash updates; got ${bindingChanges}/${contentHashChanges}`);

function orderedPageGroup(owner,catalog,spec){
 const ordered=catalog.regions.filter(region=>region.book===spec.book&&region.printedPage===spec.page).sort((a,b)=>Number(a.role==='context')-Number(b.role==='context'));
 const regions=ordered.map(region=>({id:region.id,role:region.role||null,imageSha256:region.sha256,...regionHashes(region)}));
 return {collection:'rules',itemId:owner,binding:'sourceExcerpts',futureCatalogPath:`scans/verified/rules-${owner}.json`,book:spec.book,printedPage:spec.page,pdfPage:spec.pdf,regionCount:regions.length,defaultRegionId:regions[0]?.id,defaultOrderSha256:sha(canonical(regions)),orderedRegions:regions};
}
const groups=Object.entries(ownerSpecs).map(([owner,spec])=>orderedPageGroup(owner,catalogs[owner],spec));
assert(groups[0].defaultRegionId==='phb38-table-context'&&groups[1].defaultRegionId==='ua28-table-context','Whole table must be first default region');
const wholeLookupProposals={schemaVersion:1,artifactType:'whole-table-scope-and-context-default-review-proposals',status:'Research-only review proposals; no approval asserted and no active review ledger written.',implementationLimit:'The two complete-table regions are already unmarked. The separate scope statement documents the whole-table lookup. The review template uses only the existing context/default assessment slots; it adds no highlight exception, assessment kind, or validator behavior.',proposals:groups.map(group=>{
 const catalog=catalogs[group.itemId],record=records.records.find(candidate=>candidate.id===group.itemId),region=catalog.regions.find(candidate=>candidate.id===group.defaultRegionId),spec=ownerSpecs[group.itemId];
 const hashes=regionHashes(region),sourceSha256=catalog.sources[group.book].sha256;
 return {id:`${group.book.toLowerCase()}-${group.printedPage}-whole-table-review`,status:'pending-independent-review',scopeProposal:{lookupScope:'whole-table',unmarked:true,explicitSourceContext:record.table.sourceContext,scopeEvidence:'The owner is the complete missile table lookup. This unmarked table region contains the heading, all rows, columns, and printed notes; row-specific targets continue to select their separate focused regions.'},reviewRecordTemplate:{collection:'rules',itemId:group.itemId,binding:'sourceExcerpts',regionId:region.id,sourceSha256,imageSha256:region.sha256,focusSha256:hashes.focusSha256,contentSha256:hashes.contentSha256,assessments:{context:{status:null,independent:null,evidence:`Context review of the complete unmarked ${group.book} p. ${spec.page} table is pending for these exact V4 hashes.`},default:{status:null,independent:null,evidence:`Review the default selection for the complete ${group.book} p. ${spec.page} page group pinned below.`}},defaultOrderSha256:group.defaultOrderSha256,reviewer:null,reviewedAt:null},exactOrderedPageGroup:group,approval:'No context/default assessment is recorded. Root review must bind any later approval to these exact image, focus, content, and complete ordered page-group hashes.'};
})};

function walkDiff(before,after,base=''){
 if(isDeepStrictEqual(before,after))return [];
 if(Array.isArray(before)&&Array.isArray(after)){const out=[];for(let i=0;i<Math.max(before.length,after.length);i++){const p=`${base}/${i}`;if(i>=before.length)out.push({path:p,before:{missing:true},after:after[i]});else if(i>=after.length)out.push({path:p,before:before[i],after:{missing:true}});else out.push(...walkDiff(before[i],after[i],p));}return out;}
 if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)){const out=[];for(const key of [...new Set([...Object.keys(before),...Object.keys(after)])].sort()){const p=`${base}/${key.replaceAll('~','~0').replaceAll('/','~1')}`;if(!(key in before))out.push({path:p,before:{missing:true},after:after[key]});else if(!(key in after))out.push({path:p,before:before[key],after:{missing:true}});else out.push(...walkDiff(before[key],after[key],p));}return out;}
 return [{path:base||'/',before,after}];
}
const inputFiles={
 v3Manifest:`${V3}/production-metadata-manifest.json`,
 v3PhbCatalog:`${V3}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`,
 v3UaCatalog:`${V3}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`,
 v3Records:`${V3}/rules-records-candidate-corrected.json`,
};
for(const [key,filename] of [['v3Manifest',inputFiles.v3Manifest],['v3PhbCatalog',inputFiles.v3PhbCatalog],['v3UaCatalog',inputFiles.v3UaCatalog],['v3Records',inputFiles.v3Records]])assert(sha(bytes(filename))===expectedV3[key.replace('v3','').replace('Manifest','manifest').replace('PhbCatalog','phbCatalog').replace('UaCatalog','uaCatalog').replace('Records','records')],`V3 exact input changed: ${key}`);
const currentInputs={head:currentHead,distDataSha256:sha(bytes('dist/data.json')),rulesJsonSha256:sha(bytes('rules.json')),booksJsSha256:sha(bytes('dist/books.js'))};
const validations=[];
for(const record of records.records){
 const catalog=catalogs[record.id];
 validateScanCatalog(catalog,{id:record.id},books,{collection:'rules',state:'source-excerpt-checked',catalog:`scans/verified/rules-${record.id}.json`,regionCount:catalog.regions.length});
 for(const region of catalog.regions){assert(books.resolveRegionSourceIdentity(catalog,region)?.valid,`${record.id}/${region.id} invalid source identity`);assert(sha(bytes(`dist/scans/verified/${region.image}`))===region.sha256,`${record.id}/${region.id} image bytes changed`);}
 for(const target of [...record.table.rows.map(row=>row.sourceReference),...(record.table.sourceNotes||[]).map(note=>note.sourceReference),...(record.table.footnotes||[]).map(note=>note.sourceReference)])for(const binding of target?.evidenceBindings||[])for(const evidence of binding.regionEvidence||[]){const region=catalog.regions.find(item=>item.id===evidence.regionId);if(!region)continue;assert(evidence.contentSha256===regionHashes(region).contentSha256,`${record.id}/${region.id} stale content hash`);assert(evidence.focusSha256===regionHashes(region).focusSha256,`${record.id}/${region.id} focus hash changed`);}
 validations.push({itemId:record.id,valid:true,regionCount:catalog.regions.length,sourceImagesMatched:true,validator:'tools/scan-catalog.mjs validateScanCatalog'});
}

write('catalogs/rules-phb-hurled-weapons-and-missiles-table.json',catalogs['phb-hurled-weapons-and-missiles-table']);
write('catalogs/rules-ua-hurled-weapons-and-missiles-table.json',catalogs['ua-hurled-weapons-and-missiles-table']);
write('rules-records-candidate-final-v4.json',records);
write('whole-table-scope-and-context-default-proposals.json',wholeLookupProposals);
const changed={records:walkDiff(v3RecordsClone,records),phbCatalog:walkDiff(v3Catalogs['phb-hurled-weapons-and-missiles-table'],catalogs['phb-hurled-weapons-and-missiles-table']),uaCatalog:walkDiff(v3Catalogs['ua-hurled-weapons-and-missiles-table'],catalogs['ua-hurled-weapons-and-missiles-table'])};
const diff={schemaVersion:1,artifactType:'exact-neutral-metadata-delta-v3-to-v4',status:'V3 bytes remain unchanged; this V4 delta replaces workflow status text with neutral source/geometry descriptions.',inputs:Object.fromEntries(Object.entries(inputFiles).map(([key,filename])=>[key,{path:filename,sha256:sha(bytes(filename))}])),changes:changed,counts:{records:changed.records.length,phbCatalog:changed.phbCatalog.length,uaCatalog:changed.uaCatalog.length,total:Object.values(changed).reduce((sum,rows)=>sum+rows.length,0)}};
write('exact-leaf-diff-v3-to-v4.json',diff);
const proposal={schemaVersion:1,artifactType:'missile-table-final-production-metadata-v4-candidate',status:'Research-only candidate wrapper; owner/catalog payload text is neutral and suitable for later root-approved activation.',base:currentInputs,inputs:{v3Manifest:{path:inputFiles.v3Manifest,sha256:sha(bytes(inputFiles.v3Manifest))},v3Records:{path:inputFiles.v3Records,sha256:sha(bytes(inputFiles.v3Records))},v3PhbCatalog:{path:inputFiles.v3PhbCatalog,sha256:sha(bytes(inputFiles.v3PhbCatalog))},v3UaCatalog:{path:inputFiles.v3UaCatalog,sha256:sha(bytes(inputFiles.v3UaCatalog))}},changes:{removedWorkflowCandidateStatuses:{catalogs:2,pageRegions:46,owners:2},removedRegionReviewDates:46,normalizedBindingWorkflowMetadata:{bindings:bindingChanges,contextStatus:'field-target-pending',contextLimitations:['Target review does not assign numeric, mechanics, or source-value grades.']},derivedContentHashesUpdated:contentHashChanges,tableRoles:[{owner:'phb-hurled-weapons-and-missiles-table',regionId:'phb38-table-context',role:'table'},{owner:'ua-hurled-weapons-and-missiles-table',regionId:'ua28-table-context',role:'table'}]},preservation:{rowAndNoteValuesUnchanged:true,sourceCellLiterals:555,sourceValueStatus:'50 × not-assessed-by-field-target-review',reviewStatus:'50 × field-target-pending',valuePathStatus:'preserved exactly',rowIdsAliasesExplicitSourceContextAndRegionIds:'preserved exactly',focusRectanglesAndImageBytes:'preserved exactly',phb36ReuseRegionObjects:'preserved exactly',activeDataAndReviews:'untouched'},groups,wholeTableReviewProposals:'Separate pending context/default review templates are in whole-table-scope-and-context-default-proposals.json. The owner/catalog records themselves make no approval or review-history claim.'};
write('production-metadata-v4-proposal.json',proposal);
const readme=`# Missile table metadata V4\n\nV4 is a neutral-metadata candidate derived from frozen V3. It removes workflow-only candidateStatus and checkedOn fields from owner catalogs and the two record payloads, replaces review-version summaries with neutral source-location and focus descriptions, and updates 44 derived evidence-binding context/content fields. The research wrapper remains labeled as a candidate.\n\nAll 555 literal cells, 50 field-target-pending review statuses, 50 not-assessed source-value statuses, values, row identities, aliases, page references, PHB p.36 reuse regions, focus rectangles, and image bytes are preserved. The two table regions remain unmarked and keep role=table.\n\nReproduce with the build-final-candidate-v4.mjs script in this directory; validate with the validate-final-candidate-v4.mjs script. V4 remains research-only until root reviews its exact catalog/content/default hashes.\n`;
writeFileSync(path.join(here,'README.md'),readme);
const manifest={schemaVersion:1,artifactType:'missile-table-neutral-metadata-v4-manifest',status:'research-only candidate; no activation/assembly/grade change',base:currentInputs,inputs:Object.fromEntries(Object.entries(inputFiles).map(([key,filename])=>[key,{path:filename,sha256:sha(bytes(filename))}])),counts:{owners:2,catalogs:2,PHBRows:15,UARows:24,literalCells:555,evidenceBindings:50,fieldTargetPending:50,sourceValuesNotAssessed:50,contextWorkflowBindingsNormalized:bindingChanges,regionEvidenceContentHashesUpdated:contentHashChanges,removedRegionCandidateStatuses:46,removedRegionReviewDates:46,wholeTableDefaultGroups:groups.length,exactCurrentCatalogRegionRows:52},pageGroups:groups,validation:validations,outputs:[]};
for(const filename of ['catalogs/rules-phb-hurled-weapons-and-missiles-table.json','catalogs/rules-ua-hurled-weapons-and-missiles-table.json','rules-records-candidate-final-v4.json','whole-table-scope-and-context-default-proposals.json','exact-leaf-diff-v3-to-v4.json','production-metadata-v4-proposal.json','README.md']){const fileBytes=readFileSync(path.join(here,filename));manifest.outputs.push({path:`${OUT}/${filename}`,size:fileBytes.length,sha256:sha(fileBytes)});}
manifest.implementationFiles=['build-final-candidate-v4.mjs','validate-final-candidate-v4.mjs'].map(filename=>{const fileBytes=readFileSync(path.join(here,filename));return {path:`${OUT}/${filename}`,size:fileBytes.length,sha256:sha(fileBytes)};});
write('production-metadata-v4-manifest.json',manifest);
console.log(JSON.stringify({output:OUT,manifestSha256:sha(readFileSync(path.join(here,'production-metadata-v4-manifest.json'))),counts:manifest.counts,pageGroups:groups.map(group=>({itemId:group.itemId,regionCount:group.regionCount,defaultRegionId:group.defaultRegionId,defaultOrderSha256:group.defaultOrderSha256})),validation:validations},null,2));
