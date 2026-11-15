// Numeric containment for explicitly source-reviewed context goldens only.
// Passing this contract never certifies source semantics, crop ink, or values.
const rect=value=>Array.isArray(value)&&value.length===4&&value.every(Number.isInteger)&&value[0]>=0&&value[1]>=0&&value[2]>value[0]&&value[3]>value[1];
const dimensions=value=>Array.isArray(value)&&value.length===2&&value.every(v=>Number.isInteger(v)&&v>0);
const sha=value=>/^[a-f0-9]{64}$/.test(value||'');
const contains=(outer,inner)=>outer[0]<=inner[0]&&outer[1]<=inner[1]&&outer[2]>=inner[2]&&outer[3]>=inner[3];
const orderedVersions=new Set(['ordered-source-context-parts-v1','ordered-source-context-parts-v2']);
const sourceRenderPageSpace='original source-render page pixels; top-left origin; [left,top,right,bottom] half-open';
const sourcePageGlobalSpace='source-page-global source-render pixels; top-left origin; [left,top,right,bottom] half-open';
const result=(status,complete=false,rectResults=[])=>({semanticPass:false,scope:'Calibrated numeric source-frame containment only; independent source pixels and meaning remain required.',complete,status,rectResults});

function canonicalBook(value){
 if(typeof value!=='string'||!value.trim())return null;
 const normalized=value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const aliases={phb:'PHB','player handbook':'PHB','players handbook':'PHB',dmg:'DMG','dungeon master guide':'DMG','dungeon masters guide':'DMG',ua:'UA','unearthed arcana':'UA',mm:'MM','monster manual':'MM',mm2:'MM2','monster manual ii':'MM2'};
 return aliases[normalized]||value.trim();
}

function aliasesAgree(value,source){
 if(!value||typeof value!=='object'||Array.isArray(value))return true;
 const books=[value.bookKey,value.book].filter(item=>item!==undefined&&item!==null);
 const printed=[value.printedPage,value.page].filter(item=>item!==undefined&&item!==null);
 const pages=[value.pdfPage].filter(item=>item!==undefined&&item!==null);
 const hashes=['sourceSha256','sourcePdfSha256','sourceFileSha256','sha256'].map(key=>value[key]).filter(item=>item!==undefined&&item!==null);
 return books.every(item=>canonicalBook(item)===canonicalBook(source.book))&&
  printed.every(item=>Number.isInteger(item)&&item>0&&item===source.printedPage)&&
  pages.every(item=>Number.isInteger(item)&&item>0&&item===source.pdfPage)&&
  hashes.every(item=>sha(item)&&item===source.sourcePdfSha256)&&
  new Set(books.map(canonicalBook)).size<=1&&new Set(printed).size<=1&&new Set(pages).size<=1&&new Set(hashes).size<=1;
}

function declarationsAgree(crop,source){
 const declared=crop.declaredSourceFrame;
 if(declared===undefined||declared===null)return true;
 if(typeof declared!=='object'||Array.isArray(declared))return false;
 return ['partSource','cropTopLevel','cropSource','cropSourceFrame','cropSourceRender'].every(key=>aliasesAgree(declared[key],source));
}

function validOrderedPart(part,index,ids,cropIds){
 if(!part||typeof part!=='object'||typeof part.partId!=='string'||!part.partId||ids.has(part.partId)||!Number.isInteger(part.order)||part.order!==index+1||typeof part.role!=='string'||!part.role||typeof part.cropId!=='string'||!part.cropId||cropIds.has(part.cropId))return false;
 const source=part.source,render=part.sourceRender,crop=part.crop;
 if(!source||typeof source!=='object'||canonicalBook(source.book)!==source.book||!Number.isInteger(source.printedPage)||source.printedPage<1||!Number.isInteger(source.pdfPage)||source.pdfPage<1||!sha(source.sourcePdfSha256))return false;
 if(!render||typeof render!=='object'||typeof render.sourceRenderId!=='string'||!render.sourceRenderId||!sha(render.sourceRenderSha256)||!dimensions(render.sourceRenderDimensionsPx)||render.coordinateSpace!==sourceRenderPageSpace)return false;
 if(!crop||typeof crop!=='object'||crop.sourcePdfSha256!==source.sourcePdfSha256||crop.sourceRenderSha256!==render.sourceRenderSha256||!dimensions(crop.sourceRenderDimensionsPx)||crop.sourceRenderDimensionsPx.some((v,i)=>v!==render.sourceRenderDimensionsPx[i])||!rect(crop.cropBoundsPixelsLTRB)||!dimensions(crop.cropDimensionsPx)||crop.cropDimensionsPx[0]!==crop.cropBoundsPixelsLTRB[2]-crop.cropBoundsPixelsLTRB[0]||crop.cropDimensionsPx[1]!==crop.cropBoundsPixelsLTRB[3]-crop.cropBoundsPixelsLTRB[1]||crop.cropBoundsPixelsLTRB[2]>render.sourceRenderDimensionsPx[0]||crop.cropBoundsPixelsLTRB[3]>render.sourceRenderDimensionsPx[1]||!sha(crop.cropSha256)||crop.coordinateSpace!==sourcePageGlobalSpace||crop.cropBoundsPixelsCoordinateSpace!==sourcePageGlobalSpace)return false;
 if(render.renderDpi!==undefined&&render.renderDpi!==null&&(!Number.isInteger(render.renderDpi)||render.renderDpi<1))return false;
 if(crop.renderDpi!==undefined&&crop.renderDpi!==null&&(!Number.isInteger(crop.renderDpi)||crop.renderDpi<1||crop.renderDpi!==render.renderDpi))return false;
 if(!declarationsAgree(crop,source))return false;
 ids.add(part.partId);cropIds.add(part.cropId);return true;
}

function sameProjection(parts,crops){
 if(!Array.isArray(crops)||crops.length!==parts.length)return false;
 return parts.every((part,index)=>{
  const crop=crops[index];
  return crop&&crop.cropId===part.cropId&&crop.order===part.order&&crop.role===part.role&&
   crop.metadata&&crop.metadata.sourcePdfSha256===part.crop.sourcePdfSha256&&crop.metadata.sourceRenderSha256===part.crop.sourceRenderSha256&&
   crop.metadata.sourceRenderDimensionsPx?.length===part.crop.sourceRenderDimensionsPx.length&&crop.metadata.sourceRenderDimensionsPx.every((v,i)=>v===part.crop.sourceRenderDimensionsPx[i])&&
   crop.metadata.cropBoundsPixelsLTRB?.length===part.crop.cropBoundsPixelsLTRB.length&&crop.metadata.cropBoundsPixelsLTRB.every((v,i)=>v===part.crop.cropBoundsPixelsLTRB[i])&&
   crop.metadata.cropDimensionsPx?.length===part.crop.cropDimensionsPx.length&&crop.metadata.cropDimensionsPx.every((v,i)=>v===part.crop.cropDimensionsPx[i])&&crop.metadata.cropSha256===part.crop.cropSha256&&
   crop.sourceRender?.sourceRenderId===part.sourceRender.sourceRenderId&&crop.sourceRender?.sourceRenderSha256===part.sourceRender.sourceRenderSha256&&
   crop.sourceRender?.sourceRenderDimensionsPx?.length===part.sourceRender.sourceRenderDimensionsPx.length&&crop.sourceRender.sourceRenderDimensionsPx.every((v,i)=>v===part.sourceRender.sourceRenderDimensionsPx[i]);
 });
}

function sameSourceFrame(source,expected){
 return source.book===expected.book&&source.sourcePdfSha256===expected.sourcePdfSha256&&source.pdfPage===expected.pdfPage&&(!Number.isInteger(expected.printedPage)||source.printedPage===expected.printedPage);
}

function orderedExtent(contextEvidence,expected,required){
 if(!orderedVersions.has(contextEvidence?.fingerprintVersion)||contextEvidence.status!=='declared-source-context-parts-linked')return result('context-metadata-unavailable-or-unresolved');
 const parts=contextEvidence.sourceContextParts;
 if(!Array.isArray(parts)||parts.length===0||!Array.isArray(contextEvidence.declaredLinks)||contextEvidence.declaredLinks.length!==parts.length)return result('invalid-ordered-context-part-list');
 const v2=contextEvidence.fingerprintVersion==='ordered-source-context-parts-v2';
 if(v2&&!Array.isArray(contextEvidence.crops))return result('invalid-ordered-context-part-list');
 if(contextEvidence.crops!==undefined&&(!Array.isArray(contextEvidence.crops)||!sameProjection(parts,contextEvidence.crops)))return result('invalid-ordered-context-part-list');
 const ids=new Set(),cropIds=new Set();
 for(let i=0;i<parts.length;i++){
  const part=parts[i],link=contextEvidence.declaredLinks[i];
  if(!validOrderedPart(part,i,ids,cropIds)||!link||link.field!==`sourceContextParts/${i}`||link.cropId!==part.cropId||link.order!==part.order)return result('invalid-ordered-context-part-list');
 }
 const eligible=[];
 for(const part of parts){
  if(!sameSourceFrame(part.source,expected))continue;
  if(part.sourceRender.sourceRenderSha256!==expected.sourceRenderSha256||part.sourceRender.sourceRenderDimensionsPx.some((v,i)=>v!==expected.sourceRenderDimensionsPx[i]))return result('invalid-matching-source-crop-frame');
  eligible.push({cropId:part.cropId,bounds:part.crop.cropBoundsPixelsLTRB});
 }
 const rectResults=required.map(r=>({id:r.id,requiredBounds:r.bounds,coveredByCropIds:eligible.filter(c=>contains(c.bounds,r.bounds)).map(c=>c.cropId)})),complete=rectResults.every(r=>r.coveredByCropIds.length>0);
 return result(complete?'required-context-extent-contained':'required-context-extent-missing',complete,rectResults);
}

export function checkRequiredContextExtent(contextEvidence,contract){
 const expected=contract?.sourceFrame,required=contract?.requiredRects;
 if(!expected||typeof expected.book!=='string'||!expected.book.trim()||!sha(expected.sourcePdfSha256)||!sha(expected.sourceRenderSha256)||!Number.isInteger(expected.pdfPage)||expected.pdfPage<1||!dimensions(expected.sourceRenderDimensionsPx)||!Array.isArray(required)||required.length===0||required.some(r=>!r||typeof r.id!=='string'||!r.id||!rect(r.bounds)||r.bounds[2]>expected.sourceRenderDimensionsPx[0]||r.bounds[3]>expected.sourceRenderDimensionsPx[1])||new Set(required.map(r=>r.id)).size!==required.length)return result('invalid-required-context-contract');
 if(contextEvidence?.status==='declared-source-context-parts-linked')return orderedExtent(contextEvidence,expected,required);
 if(contextEvidence?.status!=='declared-context-crop-metadata-linked')return result('context-metadata-unavailable-or-unresolved');
 const frame=contextEvidence.sourceFrame;
 if(!frame||frame.book!==expected.book||frame.pdfPage!==expected.pdfPage||frame.sourcePdfSha256!==expected.sourcePdfSha256||(Number.isInteger(expected.printedPage)&&frame.printedPage!==expected.printedPage))return result('source-frame-mismatch');
 const crops=[];
 if(!Array.isArray(contextEvidence.crops))return result('invalid-context-crop-list');
 for(const c of contextEvidence.crops){
  if(!c||typeof c!=='object')return result('invalid-context-crop-list');
  const m=c.metadata;if(!m||m.sourceRenderSha256!==expected.sourceRenderSha256)continue;
  if(!dimensions(m.sourceRenderDimensionsPx)||m.sourceRenderDimensionsPx.some((v,i)=>v!==expected.sourceRenderDimensionsPx[i])||!rect(m.cropBoundsPixelsLTRB)||!dimensions(m.cropDimensionsPx)||m.cropDimensionsPx[0]!==m.cropBoundsPixelsLTRB[2]-m.cropBoundsPixelsLTRB[0]||m.cropDimensionsPx[1]!==m.cropBoundsPixelsLTRB[3]-m.cropBoundsPixelsLTRB[1]||m.cropBoundsPixelsLTRB[2]>m.sourceRenderDimensionsPx[0]||m.cropBoundsPixelsLTRB[3]>m.sourceRenderDimensionsPx[1]||!sha(m.cropSha256))return result('invalid-matching-source-crop-frame');
  crops.push(c);
 }
 const rectResults=required.map(r=>({id:r.id,requiredBounds:r.bounds,coveredByCropIds:crops.filter(c=>contains(c.metadata.cropBoundsPixelsLTRB,r.bounds)).map(c=>c.cropId)})),complete=rectResults.every(r=>r.coveredByCropIds.length>0);
 return result(complete?'required-context-extent-contained':'required-context-extent-missing',complete,rectResults);
}
