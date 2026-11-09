import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {sourceVisualRegionHashes} from '../../../../tools/price-source-inventory.mjs';

const root=path.resolve(import.meta.dirname,'../../../..');
const out=import.meta.dirname;
mkdirSync(path.join(out,'catalogs'),{recursive:true});
const read=relative=>readFileSync(path.join(root,relative));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=relative=>JSON.parse(read(relative));
const write=(relative,value)=>writeFileSync(path.join(out,relative),JSON.stringify(value,null,2)+'\n');
const baseDir='research/missile-table-discoverability/implementation-candidate';
const inputRecordsPath=`${baseDir}/rules-records-candidate.json`;
const inputPhbCatalogPath=`${baseDir}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`;
const inputUaCatalogPath=`${baseDir}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`;
const records=json(inputRecordsPath).records;
const catalogs=new Map([
 ['PHB',json(inputPhbCatalogPath)],
 ['UA',json(inputUaCatalogPath)],
]);
const regionReview=json('research/missile-table-discoverability/root-actual-PHB-row-focus-negative-review-v1.json');
const acceptedFocus=json('research/missile-table-discoverability/root-source-focus-partial-acceptance-v1.json');
const cellReview=json('research/missile-table-discoverability/root-source-cell-review-v1.json');
const baselineManifestBytes=read(`${baseDir}/candidate-manifest.json`);
const rootsNegativeBytes=read('research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json');
const rootsCellNegative=json('research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json');
const sourceNavigationBeforePath='research/missile-table-discoverability/implementation-candidate/table-source-default-before-v1.json';
const sourceNavigationBeforeBytes=read(sourceNavigationBeforePath);
if(sha(read(inputRecordsPath))!=='02179dc482a13564182ae7d76c538ca4f77cc167e1827165c2414128a4d4de6c')throw Error('Input candidate records changed; re-review the baseline before applying corrections.');
if(sha(read(inputPhbCatalogPath))!=='ff5775e3fd5fd0b821106d1e544a33fd0e201e174846b630ce34b4234f0e6d95')throw Error('Input PHB catalog changed; re-review the baseline before applying corrections.');
if(sha(read(inputUaCatalogPath))!=='9ea1849053928fe2bbf1644c1ec316ca35d574126b335d49243c2c26b742956d')throw Error('Input UA catalog changed; re-review the baseline before applying corrections.');
if(sha(read('research/missile-table-discoverability/root-source-cell-review-v1.json'))!=='7a9866ca04dbc71138b260ede3936ae4c99a8db10b685435c7ac424f1517f7c3')throw Error('Independent 555-cell receipt changed.');
if(sha(rootsNegativeBytes)!=='fda09edec63001ee80bda4f06f25429c2189034a2fff5b29b3bb7dc64ae9e10c')throw Error('Actual bad-candidate negative control changed.');
if(sha(read('research/missile-table-discoverability/root-actual-PHB-row-focus-negative-review-v1.json'))!=='9445b12ad8d7053586f41b3c13d2ff47c162bcd7d570d2c5a1292e09c37b86cd')throw Error('Root PHB focus defect review changed.');
if(sha(read('research/missile-table-discoverability/root-source-focus-partial-acceptance-v1.json'))!=='01923b45ab676a72a3811b811f9000e20872efa0d662398fab071ca3895bb6ff')throw Error('Root partial focus acceptance changed.');
if(sha(sourceNavigationBeforeBytes)!=='49cc78291647a8143d66aaa4ffbc81114f292357ce6a64f16b9596902c8b0d25')throw Error('Pre-fix table-source default navigation replay changed.');

// Source-pixel crop census from the reviewed PHB p.38 image. Each row uses two disjoint
// horizontal regions because the printed labels/ranges and Armor Class figures sit on
// different vertical baselines. Bounds include four pixels of local margin and leave
// a gap before the adjacent row; these are still candidate foci awaiting root review.
const phbLeftInk=[[71,84],[94,112],[126,138],[152,165],[180,192],[202,219],[234,247],[259,273],[288,300],[315,328],[343,355],[370,381],[394,409],[420,439],[447,463]];
const phbAcInk=[[72,87],[99,116],[129,142],[158,168],[184,194],[212,225],[236,251],[261,279],[288,306],[317,330],[347,360],[371,385],[396,413],[423,438],[449,466]];
const phbLeftX=[2,719],phbAcX=[731,893];
const toRect=([x,width],[top,bottom])=>[x/1656,(top-4)/600,width/1656,(bottom-top+8)/600];
const phb=records.find(record=>record.book==='PHB');
const ua=records.find(record=>record.book==='UA');
const phbCatalog=catalogs.get('PHB');
const uaCatalog=catalogs.get('UA');
if(phb.table.rows.length!==15||ua.table.rows.length!==24)throw Error('Expected exactly 15 PHB and 24 UA source rows.');
const phbChanges=[];
for(let index=0;index<phb.table.rows.length;index++){
 const row=phb.table.rows[index];
 const regionId=row.sourceReference?.evidenceBindings?.[0]?.regionIds?.[0];
 const region=phbCatalog.regions.find(candidate=>candidate.id===regionId);
 if(!region||region.sourceRowId!==row.id||region.sourcePointer!==`/table/rows/${index}`)throw Error(`PHB row owner/pointer mismatch for ${row.id}`);
 const rects=[toRect(phbLeftX,phbLeftInk[index]),toRect(phbAcX,phbAcInk[index])];
 region.focusRects=rects;
 region.alt=`Complete PHB p. 38 missile-table row for ${row.label}; two disjoint horizontal focus regions cover the weapon label, rate, and ranges, then the Armor Class Adjustment values.`;
 region.summary='Candidate split row focus follows the source image’s offset text baselines. The exact crop/focus mapping remains pending independent review.';
 region.candidateStatus='pending-independent-source-focus-review';
 updateBindingFocus(row.sourceReference,region);
 phbChanges.push({rowId:row.id,regionId,focusRects:rects});
}
const aklysRegionId='ua28-footnote-aklys-10-foot';
const aklysRegion=uaCatalog.regions.find(region=>region.id===aklysRegionId);
const aklysFootnote=ua.table.footnotes.find(note=>note.id==='ua-hurled-weapons-and-missiles-table-focus-aklys-10-foot');
if(!aklysRegion||!aklysFootnote)throw Error('UA Aklys footnote candidate is missing.');
const aklysFocus=[[35/1130,601/726,265/1130,23/726]];
aklysRegion.focusRects=aklysFocus;
aklysRegion.alt='UA p. 28 Aklys footnote, including the asterisk and the complete 10-foot-only clarification.';
aklysRegion.summary='Candidate vertical expansion keeps the full footnote glyphs and descenders; a margin remains before the rate-and-range note below.';
aklysRegion.candidateStatus='pending-independent-source-focus-review';
aklysFootnote.marker='*';
updateBindingFocus(aklysFootnote.sourceReference,aklysRegion);

function updateBindingFocus(reference,region){
 const bindings=reference?.evidenceBindings||[];
 const binding=bindings.find(entry=>entry.regionIds?.includes(region.id));
 if(!binding)throw Error(`No candidate evidence binding points to ${region.id}`);
 const coordinate=binding.highlightCoordinates?.find(entry=>entry.regionId===region.id);
 if(!coordinate)throw Error(`No highlight coordinate entry points to ${region.id}`);
 coordinate.rects=structuredClone(region.focusRects);
 binding.regionEvidence=(binding.regionEvidence||[]).map(evidence=>evidence.regionId===region.id?{
  ...evidence,
  focusRectsSha256:sha(Buffer.from(JSON.stringify(region.focusRects))),
  ...sourceVisualRegionHashes(region),
 }:evidence);
 if(binding.regionEvidence.filter(evidence=>evidence.regionId===region.id).length!==1)throw Error(`Expected exactly one region evidence hash for ${region.id}`);
}

const phbOut=`${out}/catalogs/rules-phb-hurled-weapons-and-missiles-table.json`;
const uaOut=`${out}/catalogs/rules-ua-hurled-weapons-and-missiles-table.json`;
const recordsOut=`${out}/rules-records-candidate-corrected.json`;
write('catalogs/rules-phb-hurled-weapons-and-missiles-table.json',phbCatalog);
write('catalogs/rules-ua-hurled-weapons-and-missiles-table.json',uaCatalog);
write('rules-records-candidate-corrected.json',{schemaVersion:1,artifactType:'pending-source-table-rules-records-corrected-focus-candidate',status:'research-only; no active catalog registration, source grades, mechanics grade, or page-group approval',records});
const overlayManifestPath='research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v1/private-review-overlay-manifest.json';
const codeFiles=['dist/app.js','dist/search.js','dist/source-viewer.js','tests/missile-table-candidate.browser.mjs','tests/missile-table-focus-correction.test.mjs','tests/missile-table-source-reconciliation.test.mjs','research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v1/build-focus-correction.mjs','research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v1/build-private-focus-overlays.mjs'];
const implementationFiles=codeFiles.map(file=>({path:file,sha256:sha(read(file))}));
const privateReviewOverlayManifest=existsSync(path.join(root,overlayManifestPath))?{path:overlayManifestPath,sha256:sha(read(overlayManifestPath))}:null;
const correction={schemaVersion:1,artifactType:'source-focus-navigation-correction-candidate',status:'candidate geometry/metadata only; PHB row focus and UA Aklys marker/focus await independent review; no active excerpt registration or source-value promotion',scope:{phbRowFoci:'15 PHB p.38 rows only; two disjoint focus rectangles per row',uaFootnote:'UA p.28 Aklys footnote focus only; preserve printed text and add its visible asterisk marker',sourceValues:'all source values retain the existing literal source-cell transcription; only source focus rectangles and the omitted visible footnote marker change'},inputs:{records:{path:inputRecordsPath,sha256:sha(read(inputRecordsPath))},phbCatalog:{path:inputPhbCatalogPath,sha256:sha(read(inputPhbCatalogPath))},uaCatalog:{path:inputUaCatalogPath,sha256:sha(read(inputUaCatalogPath))},sourceCellReview:{path:'research/missile-table-discoverability/root-source-cell-review-v1.json',sha256:'7a9866ca04dbc71138b260ede3936ae4c99a8db10b685435c7ac424f1517f7c3'},actualBadCandidateNegative:{path:'research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json',sha256:'fda09edec63001ee80bda4f06f25429c2189034a2fff5b29b3bb7dc64ae9e10c'},rootPhbFocusDefectReview:{path:'research/missile-table-discoverability/root-actual-PHB-row-focus-negative-review-v1.json',sha256:'9445b12ad8d7053586f41b3c13d2ff47c162bcd7d570d2c5a1292e09c37b86cd'},rootPartialFocusAcceptance:{path:'research/missile-table-discoverability/root-source-focus-partial-acceptance-v1.json',sha256:'01923b45ab676a72a3811b811f9000e20872efa0d662398fab071ca3895bb6ff'},preFixSourceNavigation:{path:sourceNavigationBeforePath,sha256:sha(sourceNavigationBeforeBytes)}},counts:{phbRowsUpdated:phbChanges.length,phbRectsPerRow:2,uaAklysFootnoteFociUpdated:1,uaAklysMarkerAdded:1,sourceValueChanges:0,activeRegistrations:0},phbRows:phbChanges,uaAklysFootnote:{regionId:aklysRegionId,focusRects:aklysFocus,marker:'*',text:aklysFootnote.text},implementationFiles,pendingReview:'The root partial acceptance covers the previously reviewed 36 owner-region uses only. It does not approve PHB rows, this UA footnote, either table’s group default, or source-value grades.'};
write('focus-correction-proposal.json',correction);
const outputs=[recordsOut,phbOut,uaOut,`${out}/focus-correction-proposal.json`].map(file=>({path:path.relative(root,file),size:readFileSync(file).length,sha256:sha(readFileSync(file))}));
const receipt={schemaVersion:1,artifactType:'source-focus-navigation-correction-candidate-manifest',status:correction.status,inputs:{...correction.inputs,candidateManifest:{path:`${baseDir}/candidate-manifest.json`,sha256:sha(baselineManifestBytes)}},counts:correction.counts,outputs,implementationFiles,privateReviewOverlayManifest,sourceContexts:{phb:{book:'PHB',printedPage:38,pdfPage:39,regionId:'phb38-table-context',status:'pending-group-default-and-source-context-review'},ua:{book:'UA',printedPage:28,pdfPage:29,regionId:'ua28-table-context',status:'pending-group-default-and-source-context-review'}},validation:{sourceRowsReviewedAgainst:cellReview.denominators,rootNegativeControlCounts:{valueCellsCompared:rootsCellNegative.valueCellsCompared,numericErrors:rootsCellNegative.candidateValueErrors,affectedRows:rootsCellNegative.affectedRows}}};
write('focus-correction-manifest.json',receipt);
console.log(JSON.stringify(receipt,null,2));
