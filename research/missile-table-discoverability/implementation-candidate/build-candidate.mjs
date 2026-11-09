import {createHash} from 'node:crypto';
import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {sourceVisualRegionHashes} from '../../../tools/price-source-inventory.mjs';

const root=path.resolve(import.meta.dirname,'../../..');
const out=path.join(root,'research/missile-table-discoverability/implementation-candidate');
const catalogDir=path.join(out,'catalogs');
mkdirSync(catalogDir,{recursive:true});
const require=createRequire(import.meta.url);
const json=relative=>JSON.parse(readFileSync(path.join(root,relative),'utf8'));
const read=relative=>readFileSync(path.join(root,relative));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(relative,value)=>writeFileSync(path.join(out,relative),JSON.stringify(value,null,2)+'\n');
const pageImage=(image,book,page,pdf,width,height,sha256,geometry)=>({image,book,printedPage:page,pdfPage:pdf,width,height,sha256,...geometry});
const sources={
 PHB:{title:'Players Handbook',edition:'Sixth printing, January 1980',sha256:'e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095',hashStatus:'computed-local'},
 UA:{title:'Unearthed Arcana',edition:'Original 1985 edition',sha256:'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4',hashStatus:'computed-local'},
 DMG:{title:'Dungeon Masters Guide',edition:'Revised December 1979',sha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',hashStatus:'computed-local'},
};
const privatePhbPdf='/workspace/vault-audit-private/sources/tsr2010-players-handbook.pdf';
if(!existsSync(privatePhbPdf))throw Error(`Private PHB source PDF is unavailable: ${privatePhbPdf}`);
const actualPhbPdfSha=sha(readFileSync(privatePhbPdf));
if(actualPhbPdfSha!==sources.PHB.sha256)throw Error(`PHB source pin does not match the private PDF: ${actualPhbPdfSha}`);
const phbRows=[
 ['Axe, hand','1',['1','2','3'],['-4','-3','-2','-1','-1','0','0','0','+1']],
 ['Bow, composite, long','2',['6','12','21'],['-2','-1','0','0','+1','+2','+2','+3','+3']],
 ['Bow, composite, short','2',['5','10','18'],['-3','-3','-1','0','+1','+2','+2','+2','+3']],
 ['Bow, long','2',['7','14','21'],['-1','0','0','+1','+2','+3','+3','+3','+3']],
 ['Bow, short','2',['5','10','15'],['-5','-4','-1','0','0','+1','+2','+2','+2']],
 ['Club','1',['1','2','3'],['-7','-5','-3','-2','-1','-1','-1','0','0']],
 ['Crossbow, heavy','½',['8','16','24'],['-1','0','+1','+2','+3','+3','+4','+4','+4']],
 ['Crossbow, light','1',['6','12','18'],['-2','-1','0','0','+1','+2','+3','+3','+3']],
 ['Dagger','2',['1','2','3'],['-5','-4','-3','-2','-1','-1','0','0','+1']],
 ['Dart','3',['1½','3','4½'],['-5','-4','-3','-2','-1','0','+1','0','+1']],
 ['Hammer','1',['1','2','3'],['-2','-1','0','0','0','0','0','0','+1']],
 ['Javelin','1',['2','4','6'],['-5','-4','-3','-2','-1','0','+1','0','+1']],
 ['Sling (bullet)','1',['5','10','20'],['-2','-2','-1','0','0','0','+2','+1','+3']],
 ['Sling (stone)','1',['4','8','16'],['-5','-4','-2','-1','0','0','+2','+1','+3']],
 ['Spear','1',['1','2','3'],['-3','-3','-2','-2','-1','0','0','0','0']],
];
const uaRows=[
 ['Aklys (hurled)','1',['1*','—','—'],['-8','-7','-6','-5','-4','-3','-2','-1','0','0','0'],['*']],
 ['Atlatl (javelin)','1',['3','6','9'],['-6','-5','-4','-3','-2','-1','0','0','+1','+1','+2']],
 ['Axe, Hand','1',['1','2','3'],['-6','-5','-4','-3','-2','-1','-1','0','0','0','+1']],
 ['Blowgun Needle','2',['1','2','3'],['-14','-12','-10','-8','-6','-4','-2','-1','-1','+1','+2']],
 ['Bow, Composite, Long','2',['6','12','21'],['-4','-3','-2','-1','0','0','+1','+2','+2','+3','+3']],
 ['Bow, Composite, Short','2',['5','10','18'],['-4','-4','-3','-3','-1','0','+1','+2','+2','+2','+3']],
 ['Bow, Long','2',['7','14','21'],['-2','-1','-1','0','0','+1','+2','+3','+3','+3','+3']],
 ['Bow, Short','2',['5','10','15'],['-7','-6','-5','-4','-1','0','0','+1','+2','+2','+2']],
 ['Club','1',['1','2','3'],['-9','-8','-7','-5','-3','-2','-1','-1','-1','0','0']],
 ['Crossbow, Hand','1',['2','4','6'],['-6','-4','-2','-1','0','0','0','+1','+2','+2','+3']],
 ['Crossbow, Heavy','½',['8','16','24'],['-2','-1','-1','0','+1','+2','+3','+3','+4','+4','+4']],
 ['Crossbow, Light','1',['6','12','18'],['-3','-2','-2','-1','0','0','+1','+2','+3','+3','+3']],
 ['Dagger','2',['1','2','3'],['-7','-6','-5','-4','-3','-2','-1','-1','0','0','+1']],
 ['Dart','3',['1½','3','4½'],['-7','-6','-5','-4','-3','-2','-1','0','+1','0','+1']],
 ['Hammer','1',['1','2','3'],['-4','-3','-2','-1','0','0','0','0','0','0','+1']],
 ['Harpoon','1',['1','2','3'],['-6','-5','-4','-3','-2','-1','0','0','0','0','+1']],
 ['Javelin','1',['2','4','6'],['-7','-6','-5','-4','-3','-2','-1','0','+1','0','+1']],
 ['Knife','2',['1','2','3'],['-8','-7','-6','-5','-4','-3','-2','-1','0','0','+1']],
 ['Lasso','½',['1','2','3'],['+9','+8','+7','+6','+5','+4','+3','+2','+1','0','-1']],
 ['Sling (bullet)','1',['5','10','20'],['-3','-3','-2','-2','-1','0','0','0','+2','+1','+3']],
 ['Sling (stone)','1',['4','8','16'],['-7','-6','-5','-4','-2','-1','0','0','+2','+1','+3']],
 ['Spear','1',['1','2','3'],['-4','-4','-3','-3','-2','-2','-1','0','0','0','0']],
 ['Staff Sling (bullet)','½',['—','3–6','9'],['-5','-4','-3','-2','-1','0','0','0','0','0','0']],
 ['Staff Sling (stone)','½',['—','3–6','9'],['-6','-5','-4','-3','-2','-1','0','0','0','0','0']],
];

const col=(id,label)=>({id,label});
const coords={
 phb:{image:'phb-38-a3662691c2417e55.png',sha:'a3662691c2417e557f8530c84cda1c77df67d7140fd934aa4de7a013bdafad32',width:1656,height:600,page:38,pdf:39,boundsPdfPoints:[8,548,560,748]},
 ua:{image:'ua-28-f9e1d616b1cec48a.png',sha:'f9e1d616b1cec48a76d66507bc7e05e2877b6cf4df520dbdb905a69e9aa17e6b',width:1130,height:726,page:28,pdf:29,boundsPdfPoints:[15,12,580,375]},
 armor:{image:'phb-36-2392f9c30cb7000b.png',sha:'2392f9c30cb7000b34ae7caecf2b7bb873c911283d890069570ddfb02029a300',width:563,height:473,page:36,pdf:37},
};
const phbOwner='phb-hurled-weapons-and-missiles-table';
const uaOwner='ua-hurled-weapons-and-missiles-table';
const phbCatalogPath=`scans/verified/rules-${phbOwner}.json`;
const uaCatalogPath=`scans/verified/rules-${uaOwner}.json`;
const pendingText='Source target and focus object await independent review; this is not a value or mechanics grade.';

const armorCatalog=json('dist/scans/verified/rules-armor-class.json');
const armorRegions=armorCatalog.regions.filter(region=>[
 'batch5-phb36-armor-class-row-003',
 'batch5-phb36-armor-class-row-008',
 'batch5-phb36-armor-class-row-009',
].includes(region.id));
if(armorRegions.length!==3)throw Error('The exact PHB36 leather/plate/plate+shield regions must all exist');
const armorExamples=[
 {label:'Leather or padded armor',text:'AC 8',region:armorRegions.find(region=>region.id==='batch5-phb36-armor-class-row-003')},
 {label:'Plate mail',text:'AC 3',region:armorRegions.find(region=>region.id==='batch5-phb36-armor-class-row-008')},
 {label:'Plate mail with shield',text:'AC 2',region:armorRegions.find(region=>region.id==='batch5-phb36-armor-class-row-009')},
];

function sourceRegion({id,pageSpec,title,alt,summary,role,focusRects=[],sourceTableId,sourceRowId,sourcePointer}){
 return {
  id,book:pageSpec.book,printedPage:pageSpec.printedPage,pdfPage:pageSpec.pdfPage,
  image:pageSpec.image,width:pageSpec.width,height:pageSpec.height,sha256:pageSpec.sha256,
  ...(pageSpec.boundsPdfPoints?{boundsPdfPoints:pageSpec.boundsPdfPoints}:{}),
  ...(pageSpec.normalizedPageRect?{normalizedPageRect:pageSpec.normalizedPageRect}:{}),
  title,alt,summary,focusRects,role,
  ...(sourceTableId?{sourceTableId}:{}),...(sourceRowId?{sourceRowId}:{}),
  verification:'visually-checked-crop',verificationScope:'source-excerpt',checkedOn:'2026-11-09',
  checkedFields:{sourceLocation:'Source excerpt location checked; row meanings and candidate highlight geometry still await independent review.'},
  candidateStatus:'pending-independent-source-object-and-focus-review',
  sourcePointer:sourcePointer||null,
 };
}
const rowIdFromLabel=label=>String(label).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function tableFocusCatalog(recordId,book,rows,tableSpec,notes,footnotes){
 const rawPageSpec=book==='PHB'?coords.phb:coords.ua;
 const pageSpec={...rawPageSpec,book,printedPage:rawPageSpec.page,pdfPage:rawPageSpec.pdf,sha256:rawPageSpec.sha};
 const regions=[];
 regions.push(sourceRegion({id:`${book.toLowerCase()}${pageSpec.page}-table-context`,pageSpec,title:`${book} p. ${pageSpec.page} · Complete missile table context`,alt:`Complete ${book} p. ${pageSpec.page} table with heading, all physical rows, rate and range columns, Armor Class adjustment columns, and printed notes.`,summary:'Neutral full-table context excerpt; no whole-table highlight is proposed.',role:'context',focusRects:[],sourceTableId:`${book.toLowerCase()}-hurled-weapons-missiles`}));
 const rowRegionIds=[];
 rows.forEach((row,index)=>{
  const label=Array.isArray(row)?row[0]:row.label,rowId=rowIdFromLabel(label);
  const id=`${book.toLowerCase()}${pageSpec.page}-row-${rowId}`;
  const focusRects=book==='PHB'
   ?[[0.002415459,(60+28*index)/600,0.995169082,0.038333333]]
   :[[0.011504425,(126.96+19.07*index)/726,0.967256637,0.024242424]];
  rowRegionIds.push(id);
  regions.push(sourceRegion({id,pageSpec,title:`${book} p. ${pageSpec.page} · Hurled weapons and missiles · ${label}`,alt:`Complete ${book} p. ${pageSpec.page} missile table context with the ${label} source row focused across its label, fire rate, range, and Armor Class Adjustment cells.`,summary:`Candidate row focus for ${label}; independent source-object and highlight review pending.`,role:'row',focusRects,sourceTableId:`${book.toLowerCase()}-hurled-weapons-missiles`,sourceRowId:rowId,sourcePointer:`/table/rows/${index}`}));
 });
 const noteRegionIds=[];
 notes.forEach((note,index)=>{
  const id=`${book.toLowerCase()}${pageSpec.page}-note-${note.id}`;
  const focus=book==='PHB'
   ? index===0?[0.003019324,0.82,0.990338164,0.065]:[0.003019324,0.911666667,0.990338164,0.063333333]
   : index===0?[0.031858407,0.870523416,0.844247788,0.038567493]:[0.031858407,0.925619835,0.867256637,0.063360882];
  noteRegionIds.push(id);
  regions.push(sourceRegion({id,pageSpec,title:`${book} p. ${pageSpec.page} · Printed table note · ${note.label}`,alt:`Focused printed ${book} p. ${pageSpec.page} table note: ${note.label}.`,summary:`Candidate focused source-note excerpt; independent source-object and highlight review pending.`,role:'note',focusRects:[focus],sourceTableId:`${book.toLowerCase()}-hurled-weapons-missiles`,sourcePointer:`/table/sourceNotes/${index}`}));
 });
 const footnoteRegionIds=[];
 footnotes.forEach((note,index)=>{
  const id=`${book.toLowerCase()}${pageSpec.page}-footnote-${note.id}`;
  const focus=[[0.033,0.821,0.30,0.026]];
  footnoteRegionIds.push(id);
  regions.push(sourceRegion({id,pageSpec,title:`${book} p. ${pageSpec.page} · Printed footnote ${note.marker}`,alt:`Focused ${book} p. ${pageSpec.page} footnote ${note.marker} associated with ${note.appliesTo||'the table'}.`,summary:'Candidate precise printed-footnote excerpt; independent source-object and highlight review pending.',role:'footnote',focusRects:focus,sourceTableId:`${book.toLowerCase()}-hurled-weapons-missiles`,sourcePointer:`/table/footnotes/${index}`}));
 });
 const rowRegions=regions.filter(region=>region.role==='row');
 if(rowRegions.length!==rows.length||new Set(rowRegions.map(region=>region.id)).size!==rows.length||new Set(rowRegions.map(region=>region.sourceRowId)).size!==rows.length||rowRegions.some((region,index)=>region.sourcePointer!==`/table/rows/${index}`))throw Error(`${recordId}: row region identities/pointers must be complete and unique`);
 armorRegions.forEach(region=>regions.push(region));
 const catalog={schemaVersion:1,collection:'rules',itemId:recordId,candidateStatus:'research-only exact candidate; not registered by sourceExcerpts override',scope:'Candidate owner-scoped excerpt catalog. New table-row and printed-note focus objects await independent source/image/focus review. Three PHB p.36 armor-class row regions are copied byte-for-byte from the existing rules:armor-class catalog for explicit cross-reference; that reuse is not a new value grade.',sources:{[book]:sources[book],PHB:sources.PHB},reusedRegions:armorRegions.map(region=>({id:region.id,sourceCatalog:'scans/verified/rules-armor-class.json',sourceOwner:{collection:'rules',itemId:'armor-class'},regionSha256:sha(JSON.stringify(region)),policy:'Exact region object copied without modification; new owner/catalog reuse awaits independent review.'})),regions};
 return {catalog,pageSpec,rowRegionIds,noteRegionIds,footnoteRegionIds,contextRegionId:`${book.toLowerCase()}${pageSpec.page}-table-context`};
}

function makeRows(rawRows,columns,owner,catalogPath,pageSpec,rowRegionIds){
 if(new Set(columns.map(column=>column.id)).size!==columns.length)throw Error(`${owner}: duplicate table column id`);
 const acIds=columns.filter(column=>column.id.startsWith('ac-')).map(column=>column.id);
 if(rowRegionIds.length!==rawRows.length)throw Error(`${owner}: row region count does not match table row count`);
 const rows=rawRows.map((raw,index)=>{
  const [label,fireRate,ranges,adjustments,markers=[]]=raw;
  if(adjustments.length!==acIds.length)throw Error(`${owner}/${label}: ${adjustments.length} armor values for ${acIds.length} columns`);
  if(ranges.length!==3)throw Error(`${owner}/${label}: exactly S/M/L range cells are required`);
  const rowId=rowIdFromLabel(label);
  const regionId=rowRegionIds[index],focusId=`${owner}-focus-${rowId}`;
  const page=pageSpec.printedPage;
  const fieldPointer=`/table/rows/${index}`;
  const row={id:rowId,label,printedLabel:label,markers,cells:[
   {columnId:'fire-rate',raw:fireRate},
   {columnId:'range-short',raw:ranges[0]},
   {columnId:'range-medium',raw:ranges[1]},
   {columnId:'range-long',raw:ranges[2]},
   ...acIds.map((columnId,cellIndex)=>({columnId,raw:adjustments[cellIndex]})),
  ],sourceRowFocusId:focusId,sourceReference:null};
  row.sourceReference={book:pageSpec.book,pages:[page],sourceFocusId:focusId,verification:{regions:[regionId]},evidenceBindings:[{
   collection:'rules',itemId:owner,fieldPointer,sourceObjectPointer:fieldPointer,sourceOwner:{collection:'rules',itemId:owner},
   sourceObject:`${label} source row`,sourceCategory:'source-table-row',book:pageSpec.book,printedPage:page,pdfPage:pageSpec.pdfPage,pages:[page],sourcePages:[page],catalog:catalogPath,regionIds:[regionId],
   coordinateSpace:'excerpt-image-normalized-top-left-xywh',reviewStatus:'field-target-pending',contextStatus:'pending-independent-review',contextLimitations:[pendingText],
   sourceValueStatus:'not-assessed-by-field-target-review',valuePathStatus:'value-present',sourceSha256:sources[pageSpec.book].sha256,
   cropCoordinates:pageSpec.boundsPdfPoints?[{regionId,coordinateSpace:'catalog-bounds-pdf-points-as-recorded',format:'x0-y0-x1-y1',rect:pageSpec.boundsPdfPoints}]:[],
   highlightCoordinates:[{regionId,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:row.sourceReference?.focusRects||[]}],
   regionEvidence:[],targetReview:null,
  }]};
  const binding=row.sourceReference.evidenceBindings[0];
  const region=activeCatalogs.get(owner).catalog.regions.find(item=>item.id===regionId);
  binding.highlightCoordinates[0].rects=region.focusRects;
  binding.regionEvidence=[{regionId,book:pageSpec.book,printedPage:page,pdfPage:pageSpec.pdfPage,sourceSha256:sources[pageSpec.book].sha256,imageSha256:region.sha256,focusRectsSha256:sha(JSON.stringify(region.focusRects)),...sourceVisualRegionHashes(region)}];
  return row;
 });
 if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error(`${owner}: duplicate row ID`);
 const regions=activeCatalogs.get(owner).catalog.regions;
 rows.forEach((row,index)=>{
  const region=regions.find(candidate=>candidate.id===rowRegionIds[index]);
  if(!region||region.sourceRowId!==row.id||region.sourcePointer!==`/table/rows/${index}`||row.sourceReference.evidenceBindings[0].regionIds[0]!==region.id)throw Error(`${owner}/${row.id}: row catalog source binding mismatch`);
 });
 return rows;
}

const activeCatalogs=new Map();
const phbColumns=[col('fire-rate','Fire Rate'),col('range-short','Range S'),col('range-medium','Range M'),col('range-long','Range L'),...Array.from({length:9},(_,index)=>col(`ac-${index+2}`,`AC ${index+2}`))];
const uaColumns=[col('fire-rate','Fire Rate'),col('range-short','Range S'),col('range-medium','Range M'),col('range-long','Range L'),...Array.from({length:11},(_,index)=>col(`ac-${index}`,`AC ${index}`))];
const phbSourceNotes=[
 {id:'rate-and-range-key',label:'Fire rate and range labels',text:'Rate of fire is based on the turn (for table-top miniatures) or the melee round. Ranges are: S = Short, M = Medium, L = Long.'},
 {id:'range-adjustment',label:'Range adjustment',text:'Armor Class Adjustment is based on the weapon or missile being discharged at short range. Adjust by -2 at all medium ranges, -5 at all long ranges.'},
];
const uaSourceNotes=[
 {id:'rate-and-range-key',label:'Fire rate and range labels',text:'Rate of fire is based on the turn (for table-top miniatures) or the melee round. Ranges are: S = Short, M = Medium, L = Long.'},
 {id:'range-adjustment',label:'Range adjustment',text:'Armor Class Adjustment is based on the weapon or missile being discharged at short range. Adjust by -2 at all medium ranges, by -5 at all long ranges.'},
];
const uaFootnotes=[{id:'aklys-10-foot',marker:'*',text:'10-foot range only, not 10 yards.',appliesTo:'Aklys (hurled) S range'}];
const phbCatalogCandidate=tableFocusCatalog(phbOwner,'PHB',phbRows,{columns:phbColumns},phbSourceNotes,[]);
const uaCatalogCandidate=tableFocusCatalog(uaOwner,'UA',uaRows,{columns:uaColumns},uaSourceNotes,uaFootnotes);
activeCatalogs.set(phbOwner,phbCatalogCandidate);activeCatalogs.set(uaOwner,uaCatalogCandidate);

function referenceEntry(book,page,pdf,focusId,role){return {id:`${book.toLowerCase()}-p${page}-focus-${focusId}`,book,pages:[page],printedPage:page,pdfPage:pdf,focusRects:[{id:focusId,role}],label:`${book} p. ${page}`};}
function noteFact(owner,book,page,pdf,focusId,regionId,catalogPath,fieldPointer,label,text,sourceCategory='source-table-note'){
 const pageSpec=book==='PHB'&&page===36?{...coords.armor,book:'PHB'}:book==='PHB'?{...coords.phb,book:'PHB'}:{...coords.ua,book:'UA'};
 const region=activeCatalogs.get(owner).catalog.regions.find(candidate=>candidate.id===regionId);
 const entry={id:focusId,label,text,sourceReference:{book,pages:[page],sourceFocusId:focusId,verification:{regions:[regionId]},evidenceBindings:[{
  collection:'rules',itemId:owner,fieldPointer,sourceObjectPointer:fieldPointer,sourceOwner:{collection:'rules',itemId:owner},sourceObject:label,sourceCategory,
  book,printedPage:page,pdfPage:pdf,pages:[page],sourcePages:[page],catalog:catalogPath,regionIds:[regionId],coordinateSpace:'excerpt-image-normalized-top-left-xywh',
  reviewStatus:'field-target-pending',contextStatus:'pending-independent-review',contextLimitations:[pendingText],sourceValueStatus:'not-assessed-by-field-target-review',valuePathStatus:'value-present',sourceSha256:sources[book].sha256,
  cropCoordinates:region.boundsPdfPoints?[{regionId,coordinateSpace:'catalog-bounds-pdf-points-as-recorded',format:'x0-y0-x1-y1',rect:region.boundsPdfPoints}]:page===36&&region.normalizedPageRect?[{regionId,coordinateSpace:'catalog-normalized-page-rect-as-recorded',format:'xywh',rect:[region.normalizedPageRect.x,region.normalizedPageRect.y,region.normalizedPageRect.width,region.normalizedPageRect.height]}]:[],
  highlightCoordinates:[{regionId,coordinateSpace:'excerpt-image-normalized-top-left-xywh',origin:'top-left',format:'xywh',rects:region.focusRects}],regionEvidence:[{regionId,book,printedPage:page,pdfPage:pdf,sourceSha256:sources[book].sha256,imageSha256:region.sha256,focusRectsSha256:sha(JSON.stringify(region.focusRects)),...sourceVisualRegionHashes(region)}],targetReview:null,
 }]}};
 entry.sourceReference.evidenceBindings[0].requiresRowEvidence=sourceCategory==='armor-column-key';
 return entry;
}

function buildTableRecord({owner,book,page,pdf,catalogPath,title,sourceTableTitle,rows,columns,notes,footnotes,candidateCatalog,sourceAliases=[]}){
 const pageSpec={book,printedPage:page,pdfPage:pdf};
 const rowFacts=makeRows(rows,columns,owner,catalogPath,pageSpec,candidateCatalog.rowRegionIds);
 const noteFacts=notes.map((note,index)=>noteFact(owner,book,page,pdf,`${owner}-focus-${note.id}`,candidateCatalog.noteRegionIds[index],catalogPath,`/table/sourceNotes/${index}`,note.label,note.text));
 const armorNotes=armorExamples.map((example,index)=>{
  const ref=example.region,focusId=`${owner}-focus-${ref.id}`;
  const regionId=ref.id;
  return noteFact(owner,'PHB',36,37,focusId,regionId,catalogPath,`/table/sourceNotes/${notes.length+index}`,example.label,`${example.label}: ${example.text}`,'armor-column-key');
 });
 const footnoteFacts=footnotes.map((note,index)=>noteFact(owner,book,page,pdf,`${owner}-focus-${note.id}`,candidateCatalog.footnoteRegionIds[index],catalogPath,`/table/footnotes/${index}`,`Footnote ${note.marker}`,note.text,'source-table-footnote'));
 const regionRefs=[
  referenceEntry(book,page,pdf,`${book.toLowerCase()}${page}-table-context`,'table-context'),
  ...rowFacts.map(row=>referenceEntry(book,page,pdf,row.sourceReference.sourceFocusId,'complete-source-row')),
  ...noteFacts.filter((_,index)=>index<notes.length).map(note=>referenceEntry(book,page,pdf,note.sourceReference.sourceFocusId,'printed-table-note')),
  ...footnoteFacts.map(note=>referenceEntry(book,page,pdf,note.sourceReference.sourceFocusId,'printed-footnote')),
  ...armorNotes.map(note=>referenceEntry('PHB',36,37,note.sourceReference.sourceFocusId,'armor-class-column-key')),
 ];
 const sourceNotes=[...noteFacts,...armorNotes];
 return {
  id:owner,title,category:'Combat',book,pages:[page],
  aliases:['hurled weapons','hurled weapon','hurled weapons and missiles','hurled weapon and missile types','missile weapon versus armor','missile weapon versus armour','missile weapon vs armor','missile to hit adjustments','armor class adjustment for missiles','armour class adjustment for missiles',...sourceAliases,'bow','short bow','long bow','leather','plate','shield'],
  tags:['missile','missiles','hurled weapons','bow','short bow','leather','plate','shield','armor','armour','armor class','armor class adjustment','armour class adjustment','to hit','fire rate','range'],
  summary:'A source-specific missile lookup. Its numeric Armor Class columns are explained by the PHB p. 36 Armor Class Table: leather or padded armor is AC 8, plate mail is AC 3, and plate mail with shield is AC 2. Those armor examples identify numeric AC labels; the printed medium- and long-range adjustments remain separate from the armor-class key.',
  table:{
   title:sourceTableTitle,sourceContext:{book,printedPage:page,regionId:`${book.toLowerCase()}${page}-table-context`},rowHeader:{id:'weapon-or-missile',label:'Hurled Weapons and Missiles'},columnGroup:{label:'Fire Rate · Range · Armor Class Adjustment'},columns,
   rows:rowFacts,footnotes:footnoteFacts,
   sourceNotesTitle:'Source notes and Armor Class column key',sourceNotes,
  },
  sourceReferences:regionRefs,
  candidateStatus:'research-only; all 555 source-cell values reconcile to the independent source-cell receipt, while row-owner bindings, focus geometry, notes, and excerpt registration remain pending review',
 };
}

const phbRecord=buildTableRecord({owner:phbOwner,book:'PHB',page:38,pdf:39,catalogPath:phbCatalogPath,title:'PHB p. 38 · Hurled Weapons and Missiles',sourceTableTitle:'Hurled Weapons and Missiles',rows:phbRows,columns:phbColumns,notes:phbSourceNotes,footnotes:[],candidateCatalog:phbCatalogCandidate,sourceAliases:['phb 38 hurled weapons','phb 38 hurled weapons table']});
const uaRecord=buildTableRecord({owner:uaOwner,book:'UA',page:28,pdf:29,catalogPath:uaCatalogPath,title:'UA p. 28 · Hurled Weapon and Missile Types',sourceTableTitle:'Hurled Weapon and Missile Types, General Data, and “To Hit” Adjustments',rows:uaRows,columns:uaColumns,notes:uaSourceNotes,footnotes:uaFootnotes,candidateCatalog:uaCatalogCandidate,sourceAliases:['ua 28 hurled weapons','ua 28 hurled weapons table']});
write('rules-records-candidate.json',{schemaVersion:1,artifactType:'pending-source-table-rules-records',status:'research-only; not inserted into rules.json; source values, pointers, row foci, armor-column-key reuse, and excerpt registration await independent review',records:[phbRecord,uaRecord]});
write(path.relative(out,path.join(catalogDir,`rules-${phbOwner}.json`)),phbCatalogCandidate.catalog);
write(path.relative(out,path.join(catalogDir,`rules-${uaOwner}.json`)),uaCatalogCandidate.catalog);

const baseDmgCatalog=json('dist/scans/verified/rules-weapon-versus-armor-adjustments.json');
const privateDmgImage='/workspace/vault-audit-private/pass8/missile-table-discoverability/dmg-p28-top-right-continuation-candidate.png';
const dmgImage=path.join(catalogDir,'dmg-28-c37135485e89a720.png');
if(!existsSync(privateDmgImage))throw Error(`Private bounded candidate crop is unavailable: ${privateDmgImage}`);
copyFileSync(privateDmgImage,dmgImage);
const dmgImageSha=sha(readFileSync(dmgImage));
if(dmgImageSha!=='c37135485e89a720fb5bf4c410a0cd48e7a3f6ce069cd9f987c221c283ff14cf')throw Error('DMG continuation candidate image hash changed');
const oldDmgRegion=baseDmgCatalog.regions.find(region=>region.id==='dmg-28-8b67aa025e19eddd');
const openingRegion={
 ...oldDmgRegion,id:'dmg-28-opening-8b67aa025e19eddd',
 title:'DMG p. 28 · weapon-type adjustment note · opening (bottom-left)',
 focusRects:[[0.011677,0.101862,0.965649,0.547385]],
 alt:'Opening of the DMG p. 28 weapon-type adjustment note in the bottom-left column; passage continues at the top-right.',
 summary:'Candidate precise focus on the bottom-left opening passage ending “In most cases,”; preserve with the same-page top-right continuation in reading order.',
 role:'opening',candidateStatus:'pending-independent-focus-review',
};
const continuationRegion={
 id:'dmg-28-c37135485e89a720',book:'DMG',printedPage:28,pdfPage:29,
 title:'DMG p. 28 · weapon-type adjustment note · continuation (top-right)',image:'dmg-28-c37135485e89a720.png',width:680,height:185,sha256:dmgImageSha,
 boundsPdfPoints:[288.0,28.0,560.0,102.0],focusRects:[[0.02206,0.10203,0.95669,0.82986]],
 alt:'Continuation of the DMG p. 28 weapon-type adjustment note; top-right column, from the unarmored-monster qualification through the armor-wearing-monster sentence.',
 summary:'Complete top-right continuation segment of the weapon-versus-armor note. Use with the bottom-left opening region in printed reading order.',
 role:'continuation',candidateStatus:'pending-independent-source-object-and-focus-review',
};
const dmgCatalog={...baseDmgCatalog,scope:`${baseDmgCatalog.scope} Candidate append only: preserves the original region and adds a separate opening focus plus the same-page top-right continuation; source/image/focus/default review pending.`,regions:[...baseDmgCatalog.regions,openingRegion,continuationRegion]};
write(path.relative(out,path.join(catalogDir,'rules-weapon-versus-armor-adjustments.json')),dmgCatalog);

const group={
 id:'dmg28-weapon-versus-armor-complete-note',collection:'rules',itemId:'weapon-versus-armor-adjustments',catalog:'scans/verified/rules-weapon-versus-armor-adjustments.json',
 status:'segments-present-pending-deployment',source:{book:'DMG',printedPage:28,sourceSha256:sources.DMG.sha256},
 sourceComparison:{status:'compared-to-verified-original',pages:[{book:'DMG',printedPage:28,pdfPage:29,sourceSha256:sources.DMG.sha256,finding:'The existing bottom-left text ends with “In most cases,”. The top-right passage completes the same note, gives the unarmored-monster and natural-armor qualifications, and ends with the armor-wearing-monster sentence.'}],continuationOrder:'bottom-left-to-top-right, same printed/PDF page'},
 currentCitationPages:[{book:'DMG',printedPage:28,role:'complete weapon-type adjustment note',regionIds:[openingRegion.id,continuationRegion.id]}],
 requiredRegionIds:[openingRegion.id,continuationRegion.id],
 segments:[
  {order:1,role:'opening',book:'DMG',printedPage:28,pdfPage:29,regionId:openingRegion.id,image:openingRegion.image,imageSha256:openingRegion.sha256,sourceSha256:sources.DMG.sha256,state:'present',relevance:'Bottom-left opening fragment, ending at “In most cases,”; crop pixels and stable original image are reused, with a new candidate precise-focus region.'},
  {order:2,role:'continuation',book:'DMG',printedPage:28,pdfPage:29,regionId:continuationRegion.id,image:continuationRegion.image,imageSha256:continuationRegion.sha256,sourceSha256:sources.DMG.sha256,state:'present',relevance:'Top-right continuation that completes the same passage through the armor-wearing-monster sentence.'},
 ],
 checkedAlternativeRegions:[],oldEvidencePolicy:'Original region ID and PNG remain byte-identical. The new opening-focus region and top-right continuation are separate candidate objects; do not replace or reinterpret old evidence. Registration and page-group default selection await independent review.',
};
write('continuation-group-candidate.json',group);

const sourceExcerptsUpdates={
 [`rules:${phbOwner}`]:{collection:'rules',state:'source-excerpt-checked',catalog:phbCatalogPath,regionCount:phbCatalogCandidate.catalog.regions.length,scope:'Complete PHB p.38 missile table excerpt and cited PHB p.36 armor-class rows. Proposed only; hold registration pending independent review of source/image/focus objects and row/value bindings.'},
 [`rules:${uaOwner}`]:{collection:'rules',state:'source-excerpt-checked',catalog:uaCatalogPath,regionCount:uaCatalogCandidate.catalog.regions.length,scope:'Complete UA p.28 missile table excerpt with Aklys footnote and cited PHB p.36 armor-class rows. Proposed only; hold registration pending independent review of source/image/focus objects and row/value bindings.'},
 'rules:weapon-versus-armor-adjustments':{collection:'rules',state:'source-excerpt-checked',catalog:'scans/verified/rules-weapon-versus-armor-adjustments.json',regionCount:dmgCatalog.regions.length,scope:'DMG p.28 bottom-left opening and top-right continuation in reading order. Proposed only; hold registration pending independent crop/focus/page-group review.'},
};
write('citation-overrides-patch-candidate.json',{schemaVersion:1,artifactType:'held-source-excerpts-override-patch',status:'not applied; source excerpt registration is gated on independent source, focus, and owner/catalog review',sourceExcerptsUpdates});

const expectedPhbSourceSha='e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095';
const sourcePinOccurrences=[];
function collectPhbPins(value,pathname,pointer='$'){
 if(Array.isArray(value)){value.forEach((entry,index)=>collectPhbPins(entry,pathname,`${pointer}/${index}`));return;}
 if(!value||typeof value!=='object')return;
 if(typeof value.sourceSha256==='string'&&value.book==='PHB')sourcePinOccurrences.push({path:pathname,pointer:`${pointer}/sourceSha256`,sourceSha256:value.sourceSha256});
 if(value.sources?.PHB?.sha256)sourcePinOccurrences.push({path:pathname,pointer:`${pointer}/sources/PHB/sha256`,sourceSha256:value.sources.PHB.sha256});
 for(const [key,child] of Object.entries(value))collectPhbPins(child,pathname,`${pointer}/${key}`);
}
const candidatePinInputs=[
 ['research/missile-table-discoverability/implementation-candidate/rules-records-candidate.json',json('research/missile-table-discoverability/implementation-candidate/rules-records-candidate.json')],
 ['research/missile-table-discoverability/implementation-candidate/catalogs/rules-phb-hurled-weapons-and-missiles-table.json',json('research/missile-table-discoverability/implementation-candidate/catalogs/rules-phb-hurled-weapons-and-missiles-table.json')],
 ['research/missile-table-discoverability/implementation-candidate/catalogs/rules-ua-hurled-weapons-and-missiles-table.json',json('research/missile-table-discoverability/implementation-candidate/catalogs/rules-ua-hurled-weapons-and-missiles-table.json')],
];
for(const [pathname,value] of candidatePinInputs)collectPhbPins(value,pathname);
if(sourcePinOccurrences.length!==48||sourcePinOccurrences.some(pin=>pin.sourceSha256!==expectedPhbSourceSha))throw Error(`PHB source pins failed exact source-hash audit (${sourcePinOccurrences.length} occurrences)`);
const sourceProducer=readFileSync(import.meta.filename,'utf8');
if((sourceProducer.match(new RegExp(expectedPhbSourceSha,'g'))||[]).length!==2)throw Error('PHB source pin producer must contain the single declared source pin and its independent expected pin');
const sourcePinNegativeControlPath='research/missile-table-discoverability/root-actual-source-pin-and-browser-negative-control-v1.json';
const sourcePinNegativeControlBytes=read(sourcePinNegativeControlPath);
const sourcePinNegativeControlSha='04b0d8939e3b1247a8c37c079e8a2e36604a1a33d315f898afbc112f54c61eeb';
if(sha(sourcePinNegativeControlBytes)!==sourcePinNegativeControlSha)throw Error('Root source-pin and browser negative-control changed');
const sourcePinNegativeControl=JSON.parse(sourcePinNegativeControlBytes);
const sourceNavigationBeforePath='research/missile-table-discoverability/implementation-candidate/table-source-default-before-v1.json';
const sourceNavigationBeforeBytes=read(sourceNavigationBeforePath);
const sourceNavigationBeforeSha='49cc78291647a8143d66aaa4ffbc81114f292357ce6a64f16b9596902c8b0d25';
if(sha(sourceNavigationBeforeBytes)!==sourceNavigationBeforeSha)throw Error('Pre-fix table-source default navigation replay changed');
const sourceFocusPartialPath='research/missile-table-discoverability/root-source-focus-partial-acceptance-v1.json';
const sourceFocusPartialBytes=read(sourceFocusPartialPath);
const sourceFocusPartialSha='01923b45ab676a72a3811b811f9000e20872efa0d662398fab071ca3895bb6ff';
if(sha(sourceFocusPartialBytes)!==sourceFocusPartialSha)throw Error('Root partial source-focus acceptance changed');
const sourcePinAudit={schemaVersion:1,artifactType:'phb-source-pin-audit-candidate',status:'exact PHB source pins match the private PDF; candidate only; no grade or sourceExcerpt registration',scope:'Audits every PHB PDF source pin in the table records, both owner catalogs, and their producer. PNG excerpt hashes and non-PHB source-book hashes are separate values and are not conflated with this PDF pin.',inputs:{privatePhbPdf:{path:'vault-audit-private/sources/tsr2010-players-handbook.pdf',sha256:actualPhbPdfSha},rootBeforeNegativeControl:{path:sourcePinNegativeControlPath,sha256:sourcePinNegativeControlSha}},counts:{recordAndCatalogPins:sourcePinOccurrences.length,producerSourcePins:1,guardExpectedHashLiterals:1,totalSourcePins:sourcePinOccurrences.length+1},negativeControl:{badSourceSha256:sourcePinNegativeControl.sourcePinFailure.paths[0].actual,expectedSourceSha256:expectedPhbSourceSha,badOccurrenceCount:sourcePinNegativeControl.sourcePinFailure.actualOccurrences,actualLength:sourcePinNegativeControl.sourcePinFailure.paths[0].actualLength,finding:'The previous candidate substituted b for f in the 64-character PHB digest; length validation cannot detect it.'},pins:[...sourcePinOccurrences,{path:'research/missile-table-discoverability/implementation-candidate/build-candidate.mjs',pointer:'sources.PHB.sha256',sourceSha256:sources.PHB.sha256}]};
write('phb-source-pin-audit-candidate.json',sourcePinAudit);

const bodyFiles=[];
function add(pathname,bytes){bodyFiles.push({path:pathname,size:bytes.length,sha256:sha(bytes)});}
const beforeSearchSource=require('node:child_process').execFileSync('git',['show','HEAD:dist/search.js'],{cwd:root,encoding:'utf8'});
const beforeSearchStart=beforeSearchSource.indexOf(' const searchableTableText = table => {');
const beforeSearchEnd=beforeSearchSource.indexOf('\n function prepare(item)',beforeSearchStart);
if(beforeSearchStart<0||beforeSearchEnd<0)throw Error('Could not capture the exact pre-change table search function');
write('search-before.json',{schemaVersion:1,sourceCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),file:'dist/search.js',fileSha256:sha(Buffer.from(beforeSearchSource)),functionText:beforeSearchSource.slice(beforeSearchStart,beforeSearchEnd),functionSha256:sha(Buffer.from(beforeSearchSource.slice(beforeSearchStart,beforeSearchEnd))),note:'Before-state exact source function captured from Git HEAD before adding table.sourceNotes indexing.'});
for(const pathname of [
 'README.md',
 'rules-records-candidate.json',
 `catalogs/rules-${phbOwner}.json`,
 `catalogs/rules-${uaOwner}.json`,
 'catalogs/rules-weapon-versus-armor-adjustments.json',
 'catalogs/dmg-28-c37135485e89a720.png',
 'continuation-group-candidate.json',
 'citation-overrides-patch-candidate.json',
 'source-cell-reconciliation-candidate.json',
 'phb-source-pin-audit-candidate.json',
 'renderer-before.json',
 'search-before.json',
 'build-candidate.mjs',
])add(pathname,readFileSync(path.join(out,pathname)));
for(const pathname of ['research/missile-table-discoverability/root-source-cell-review-v1.json','research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json','research/missile-table-discoverability/root-actual-source-pin-and-browser-negative-control-v1.json',sourceNavigationBeforePath,sourceFocusPartialPath,'research/missile-table-discoverability/implementation-candidate/before-ua-column-alignment/rules-records-before.json','research/missile-table-discoverability/implementation-candidate/before-ua-column-alignment/build-candidate-before.mjs','research/missile-table-discoverability/implementation-candidate/before-ua-column-alignment/reproduce-comparison-before.mjs','research/missile-table-discoverability/implementation-candidate/before-ua-column-alignment/comparison-output-before.txt','dist/app.js','dist/search.js','dist/source-viewer.js','tests/rules-source-notes-renderer.test.mjs','tests/missile-table-candidate-search.test.mjs','tests/missile-table-source-reconciliation.test.mjs','tests/missile-table-focus-correction.test.mjs','tests/missile-table-candidate.browser.mjs','tests/search-ranking.browser.mjs','research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v1/build-focus-correction.mjs','research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v1/build-private-focus-overlays.mjs','research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v1/private-review-overlay-manifest.json','research/missile-table-discoverability/implementation-candidate/reconcile-source-cells.mjs'])add(pathname,read(pathname));
const manifest={schemaVersion:1,artifactType:'missile-table-implementation-candidate-manifest',status:'research-only candidate; no sourceExcerpts or continuation group have been registered into active application data',baseCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),inputs:{phbSourcePdfSha256:actualPhbPdfSha,phbTableImageSha256:coords.phb.sha,uaTableImageSha256:coords.ua.sha,phb36ArmorTableImageSha256:coords.armor.sha,dmgSourceSha256:sources.DMG.sha256,dmgContinuationCandidateImageSha256:dmgImageSha,independentSourceCellReviewSha256:sha(read('research/missile-table-discoverability/root-source-cell-review-v1.json')),preFixCandidateNegativeControlSha256:sha(read('research/missile-table-discoverability/root-actual-candidate-cell-negative-control-v1.json')),preFixSourcePinBrowserNegativeControlSha:sourcePinNegativeControlSha,preFixTableSourceDefaultReplaySha:sourceNavigationBeforeSha,rootPartialSourceFocusAcceptanceSha:sourceFocusPartialSha},counts:{phbRows:phbRows.length,uaRows:uaRows.length,phbColumns:phbColumns.length,uaColumns:uaColumns.length,phbCatalogRegions:phbCatalogCandidate.catalog.regions.length,uaCatalogRegions:uaCatalogCandidate.catalog.regions.length,dmgCandidateCatalogRegions:dmgCatalog.regions.length,dmgOrderedSegments:group.segments.length,phbSourcePinCount:sourcePinOccurrences.length+1},files:bodyFiles};
write('candidate-manifest.json',manifest);
console.log(JSON.stringify({status:manifest.status,baseCommit:manifest.baseCommit,counts:manifest.counts,files:bodyFiles.map(file=>({path:file.path,sha256:file.sha256}))},null,2));
