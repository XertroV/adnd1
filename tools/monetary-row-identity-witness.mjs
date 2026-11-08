// Optional, offline source-text witnesses. Private PDF word text never leaves this
// process in the report. A witness is a candidate signal, never a source grade.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {loadMonetaryRowIdentityAudit,monetaryRowIdentityInputs,hash} from './monetary-row-identity-audit.mjs';

const root=resolve(import.meta.dirname,'..');
const books={
 PHB:['tsr2010-players-handbook.pdf','e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095'],
 UA:['Unearthed Arcana.pdf','e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4'],
 DMG:['DMG_1stEd.pdf','7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'],
 MM:['Monster_Manual.pdf','c586009f2e5231bf022cf9f593b0ee42fcb5bded3c957d90efc6cb8d1e54bd81'],
 MM2:['Monster Manual II.pdf','b49b64590a1e2d61aa4ded3af6c9abd598bd8fc142f1caa8f5d7bef4abc5ff24'],
};
const eligibleRoles=new Set(['row-focus','row-or-passage-focus','passage-focus','catalog-highlight','row-locator','passage-locator']);
const normalize=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const pointer=(data,p)=>p.split('/').slice(1).reduce((v,k)=>v?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],data);
const numbers=text=>(String(text).replace(/(?<=\d),(?=\d)/g,'').match(/\d+(?:\.\d+)?/g)||[]).map(Number);

export function expectedMoneyValues(raw,surface){
 const roots=surface==='canonical-source-row'?[raw.sourceValue]:surface==='site-price-claim'?[raw.printedPrice]:surface==='ua-supplement-row'?[raw.values]:surface==='phb-dmg-supplement-row'?[raw.typedValue]:['typed-passage','typed-description'].includes(surface)?raw.valueRecords||[]:surface==='phb-reference-row-comparison'?[raw.printedAmount]:surface==='passage-row-comparison'?[raw.printedValues]:[];
 const result=[];
 function visit(value,currency=null,inAmounts=false){
  if(!value||typeof value!=='object')return;
  if(value.printedAsRange===false)return;
  const curr=/^(?:gp|xp|sp|cp|ep|pp)$/i.test(value.currency||'')?value.currency.toLowerCase():currency;
  for(const [key,child]of Object.entries(value)){
   if(/damage|onset|capacity|duration|percent|percentage|ratePct|level(?:s)?$|sourceText|unit|quantity|derived|derivation/i.test(key))continue;
   const amountBranch=inAmounts||/^(?:amounts?|prices?|costs?|gpPurchaseCost|gpSaleValue|xpValue|amountsByVictimLevelBand)$/i.test(key);
   const currForKey=/^(gp|xp|sp|cp|ep|pp)(?:PurchaseCost|SaleValue|Value|Cost|Price)$/i.exec(key)?.[1]?.toLowerCase()||curr;
   if(typeof child==='number'&&Number.isFinite(child)&&currForKey&&(amountBranch||/^(?:amount\w*|cost\w*|price\w*|min|max|minimum|maximum|base|increment|baseAmount|flatAmount)$/i.test(key)))result.push({amount:child,currency:currForKey});
   else if(child&&typeof child==='object')visit(child,currForKey,amountBranch);
  }
 }
 (Array.isArray(roots)?roots:[roots]).forEach(v=>visit(v));return [...new Map(result.map(v=>[`${v.currency}:${v.amount}`,v])).values()];
}

// Mapping uses the declared full-render dimensions/DPI, not a guessed CropBox.
// PDF-point declarations have no producer frame marker, so a nonzero CropBox
// origin remains ambiguous and is deliberately not adjudicated here.
export function geometryInPdfTextFrame(geometry,page){
 if(!page)return {status:'source-page-unavailable'};
 const crop=page.cropBox,media=page.mediaBox,offset=page.cropPosition;
 if(geometry.space==='pdf-page-points')return offset.some(v=>Math.abs(v)>0.01)?{status:'ambiguous-pdf-point-frame'}:{status:'mapped',bounds:geometry.bounds,method:'zero-origin-pdf-points'};
 if(geometry.space==='source-page-normalized')return offset.some(v=>Math.abs(v)>0.01)?{status:'ambiguous-normalized-page-frame'}:{status:'mapped',bounds:[geometry.bounds[0]*page.width,geometry.bounds[1]*page.height,geometry.bounds[2]*page.width,geometry.bounds[3]*page.height],method:'zero-origin-normalized-page'};
 if(geometry.space!=='rendered-page-pixels')return {status:'unsupported-coordinate-space'};
 const dimensions=geometry.derivation?.sourceRenderDimensionsPx,dpi=geometry.derivation?.renderDpi;
 if(!dimensions||!dpi)return {status:'render-frame-metadata-unavailable'};
 const expected=box=>[(box[2]-box[0])*dpi/72,(box[3]-box[1])*dpi/72],matches=box=>expected(box).every((v,i)=>Math.abs(v-dimensions[i])<=2);
 const mediaMatch=matches(media),cropMatch=matches(crop);
 if(!mediaMatch&&!cropMatch)return {status:'render-frame-size-mismatch'};
 if(mediaMatch&&cropMatch&&offset.some(v=>Math.abs(v)>0.01))return {status:'ambiguous-render-frame'};
 const [x,y]=mediaMatch?offset:[0,0],bounds=geometry.bounds.map((v,i)=>v*72/dpi-(i%2?y:x));
 return {status:'mapped',bounds,method:mediaMatch?'declared-dpi-media-render-minus-crop-origin':'declared-dpi-crop-render'};
}

const inside=(word,b)=>word[0]>=b[0]-0.01&&word[1]>=b[1]-0.01&&word[2]<=b[2]+0.01&&word[3]<=b[3]+0.01;
const intersects=(word,b)=>Math.min(word[2],b[2])>Math.max(word[0],b[0])&&Math.min(word[3],b[3])>Math.max(word[1],b[1]);
function labelMatches(words,label){
 const target=normalize(label).split(' ').filter(Boolean);if(!target.length)return [];
 const tokens=words.flatMap((w,index)=>normalize(w[4]).split(' ').filter(Boolean).map(token=>({token,index})));
 const hits=[];for(let i=0;i<=tokens.length-target.length;i++)if(target.every((t,j)=>tokens[i+j].token===t)){const ids=[...new Set(tokens.slice(i,i+target.length).map(t=>t.index))];hits.push({wordIndices:ids,tokenLength:target.length});}return hits;
}

export function witnessGeometry({geometry,page,expectedValues=[],printedLabel=null,foreignRows=[]}){
 const mapping=geometryInPdfTextFrame(geometry,page);
 if(mapping.status!=='mapped')return {mapping,status:'unassessed',semanticPass:false};
 const wholly=page.words.filter(w=>inside(w,mapping.bounds)),crossing=page.words.filter(w=>intersects(w,mapping.bounds)&&!inside(w,mapping.bounds));
 const numeric=new Set(wholly.flatMap(w=>numbers(w[4]))),ownHits=printedLabel?labelMatches(wholly,printedLabel):[];
 const allLabels=[...(printedLabel?[{uid:null,label:printedLabel}]:[]),...foreignRows].map(r=>({...r,hits:labelMatches(wholly,r.label)}));
 // A shorter label contained at the same word positions as a longer row label
 // is not a second physical row (Plate Mail inside Bronze Plate Mail).
 const foreign=allLabels.filter(r=>r.uid!==null&&r.hits.some(hit=>!allLabels.some(other=>other.uid!==r.uid&&other.hits.some(h=>h.tokenLength>hit.tokenLength&&hit.wordIndices.every(i=>h.wordIndices.includes(i))))));
 const expected=expectedValues.map(v=>({...v,presentAsNumberSomewhere:numeric.has(v.amount)}));
 const ownPresent=printedLabel?ownHits.some(hit=>!allLabels.some(other=>other.uid!==null&&other.hits.some(h=>h.tokenLength>hit.tokenLength&&hit.wordIndices.every(i=>h.wordIndices.includes(i))))):null;
 const candidates=[];if(expected.length&&expected.some(v=>!v.presentAsNumberSomewhere))candidates.push('expected-number-absent-candidate');if(printedLabel&&!ownPresent)candidates.push('declared-printed-label-absent-candidate');if(foreign.length)candidates.push('other-declared-row-label-present-candidate');if(crossing.length)candidates.push('text-box-crossing-candidate');
 return {mapping,status:candidates.length?'witness-candidates':'witness-observed-no-semantic-pass',semanticPass:false,wholeWordCount:wholly.length,crossingWordBoxCount:crossing.length,expectedValues:expected,printedLabelAvailable:Boolean(printedLabel),printedLabelPresent:ownPresent,foreignRowMatches:foreign.map(r=>({uid:r.uid,labelSha256:hash(r.label),declaredNumericValues:r.expectedValues||[],matchingNumericValues:(r.expectedValues||[]).filter(v=>numeric.has(v.amount)),completeLabelOccurrences:r.hits.length})),candidates};
}

function privatePages(requests,sourceDir){
 const python=`import fitz,json,sys,hashlib,os\nq=json.load(sys.stdin); out={}\nfor book,config in q['books'].items():\n path=os.path.join(q['sourceDir'],config[0]); actual=hashlib.sha256(open(path,'rb').read()).hexdigest()\n if actual!=config[1]: raise ValueError('Private original PDF hash mismatch: '+book)\n doc=fitz.open(path)\n for n in q['requests'].get(book,[]):\n  p=doc[n-1]; out[book+':'+str(n)]={'width':p.rect.width,'height':p.rect.height,'cropBox':list(p.cropbox),'mediaBox':list(p.mediabox),'cropPosition':list(p.cropbox_position),'words':p.get_text('words',sort=True)}\nprint(json.dumps(out))`;
 const r=spawnSync('python3',['-c',python],{input:JSON.stringify({requests,books,sourceDir}),encoding:'utf8',maxBuffer:128*1024*1024});
 if(r.status!==0)throw Error(`Private PDF extraction failed: ${r.stderr.trim()}`);return JSON.parse(r.stdout);
}

export function runMonetaryRowIdentityWitness({repoRoot=root,snapshotDir=null,sourceDir='/workspace/private-adnd1-sources'}={}){
 const audit=loadMonetaryRowIdentityAudit({repoRoot,snapshotDir}),documents=new Map(monetaryRowIdentityInputs.map(c=>[c.path,JSON.parse(snapshotDir?gunzipSync(readFileSync(resolve(snapshotDir,'inputs',basename(c.path)+'.gz'))):readFileSync(resolve(repoRoot,c.path)))]));
 const requests={};for(const r of audit.records)for(const g of r.geometry.filter(g=>eligibleRoles.has(g.role))){const s=g.source;if(books[s.book]&&s.sourceSha256===books[s.book][1]&&Number.isInteger(s.pdfPage)){requests[s.book]??=new Set();requests[s.book].add(s.pdfPage);}}
 const pageRequests=Object.fromEntries(Object.entries(requests).map(([book,pages])=>[book,[...pages].sort((a,b)=>a-b)])),pages=privatePages(pageRequests,sourceDir),prepared=audit.records.map(r=>{const raw=pointer(documents.get(r.input),r.pointer);return {record:r,printedLabel:r.surface==='ua-supplement-row'?raw.sourceRowIdentity?.rowLabel||null:r.surface==='canonical-source-row'?raw.sourceObject||null:null,expectedValues:expectedMoneyValues(raw,r.surface)};});
 const records=prepared.map(({record:r,printedLabel,expectedValues})=>{
  const targets=r.geometry.filter(g=>eligibleRoles.has(g.role));
  const foreign=prepared.filter(p=>p.record.uid!==r.uid&&p.record.surface===r.surface&&p.record.identity.group===r.identity.group&&p.printedLabel).map(p=>({uid:p.record.uid,label:p.printedLabel,expectedValues:p.expectedValues}));
  return {uid:r.uid,input:r.input,inputSha256:r.inputSha256,pointer:r.pointer,rowIdentitySha256:r.rowIdentitySha256,focusGeometrySha256:r.focusGeometrySha256,annotationSha256:r.annotationSha256,surface:r.surface,notApplicable:r.notApplicable,expectedValues,expectedValueExtractionStatus:expectedValues.length?'supported-explicit-numeric-fields-extracted':'no-supported-explicit-numeric-field-unknown-or-not-applicable',geometry:targets.map(g=>({path:g.path,role:g.role,space:g.space,geometrySha256:g.geometrySha256,source:g.source,...(g.source.sourceSha256!==books[g.source.book]?.[1]?{mapping:{status:'source-identity-unavailable-or-mismatched'},status:'unassessed',semanticPass:false}:witnessGeometry({geometry:g,page:pages[`${g.source.book}:${g.source.pdfPage}`],printedLabel,expectedValues,foreignRows:foreign}))})),status:r.notApplicable?'explicitly-not-applicable':targets.length?'recorded-targets-inventoried':'no-recorded-row-focus-or-locator',semanticPass:false};
 });
 const geometries=records.flatMap(r=>r.geometry),countBy=(rows,key)=>rows.reduce((out,row)=>(out[row[key]]=(out[row[key]]||0)+1,out),{});
 return {schemaVersion:1,generatedBy:'tools/monetary-row-identity-witness.mjs',inputManifest:audit.inputManifest,sourcePdfs:Object.entries(books).map(([book,[,sha256]])=>({book,sha256})),pageRequests,counts:{records:records.length,recordsBySurface:countBy(records,'surface'),geometries:geometries.length,geometryMapping:countBy(geometries.map(g=>g.mapping),'status'),witnessStatus:countBy(geometries,'status'),expectedValueRecords:records.filter(r=>r.expectedValues.length).length,expectedValueExtractionStatus:countBy(records,'expectedValueExtractionStatus'),candidates:geometries.reduce((n,g)=>n+(g.candidates?.length||0),0)},semanticRowIdentityComplete:false,knownSourceFindingIds:audit.validation.unresolvedKnownFindingIds,records,limitations:['All signals are candidates. Numeric matches can be hit points, dice, other columns, or neighboring rows. A matching label and amount never approves precision, variants, values, currency columns, markers, or qualifiers.','Text boxes crossing a boundary require pixel adjudication; font padding can cross without clipped ink.','Literal label witnesses are limited to declared UA row labels and canonical sourceObject labels; other logical owner labels remain unavailable.','Nonzero CropBox PDF-point declarations remain ambiguous without a producer frame contract. Render conversions require recorded dimensions and DPI.','No private source word text, full OCR, or original PDF path is included. Public tests use synthetic word boxes; original PDFs are optional offline inputs.','Expected values use an explicit partial field allowlist; missing extraction is unknown or not applicable, never proof of no monetary amount. Fields such as minimumPerApplicantLevel/basinCostGp/fontCostGp and source fraction glyphs require further adapters.','New discovery corpora outside the exact input manifest remain unassessed and are not covered by this report.']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];},output=resolve(get('--output')||'/tmp/monetary-row-identity-witness.json');
 const report=runMonetaryRowIdentityWitness({snapshotDir:get('--snapshot-dir'),sourceDir:get('--source-dir')});mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,sha256:hash(readFileSync(output)),counts:report.counts,semanticRowIdentityComplete:report.semanticRowIdentityComplete}));
}
