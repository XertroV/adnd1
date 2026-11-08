// This audit reads recorded identities/geometry. It never proves source pixels,
// values, qualifiers, or the absence of an undiscovered source row.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {checkRequiredContextExtent} from './monetary-context-extent-contract.mjs';
import {resolveMonetarySourceRenderFrame,monetarySourceRenderFrameRegistry} from './monetary-source-render-frames.mjs';

const root=resolve(import.meta.dirname,'..');
export const monetaryRowIdentityInputs=[
 ['canonical','research/price-source-inventory.json'],
 ['ua','research/source-audit-batch5-ua-additional-prices.json'],
 ['phbDmg','research/source-audit-batch5-phb-dmg-additional-prices.json'],
 ['passages','research/source-audit-batch5-phb-dmg-price-passage-records.json'],
 ['descriptions','research/source-audit-batch5-price-description-records.json'],
 ['receipts','research/source-audit-batch5-price-discovery-reconciliation.json'],
 ['phbDmgCensus','research/price-source-inventory-phb-dmg-other.json'],
 ['uaCensus','research/price-source-inventory-ua-other.json'],
 ['monsterCensus','research/price-source-inventory-monster-books.json'],
].map(([key,path])=>({key,path,stage:key==='passages'?'draft-independent-review-pending':'recorded-input-not-certified-by-this-audit'}));
export const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`:JSON.stringify(value);
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:canonical(value)).digest('hex');
const finiteRect=value=>Array.isArray(value)&&value.length===4&&value.every(Number.isFinite);
const normalizeLabel=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const escapePointer=value=>String(value).replace(/~/g,'~0').replace(/\//g,'~1');
const bookKey=value=>({'players handbook':'PHB',"player's handbook":'PHB','player’s handbook':'PHB','dungeon masters guide':'DMG','dungeon master’s guide':'DMG','unearthed arcana':'UA','monster manual':'MM','monster manual ii':'MM2','mmii':'MM2'}[normalizeLabel(value)]||(['PHB','DMG','UA','MM','MM2'].includes(value)?value:null));
const rectXYWH=r=>[r[0],r[1],r[0]+r[2],r[1]+r[3]];
const pathJoin=(a,b)=>`${a}/${escapePointer(b)}`;
const sourceKeys=['sourceSha256','sourcePdfSha256','sourceFileSha256','sha256'];
const rawSourceRecordByAuditRecord=new WeakMap();
const rawOrderedContextPartsByRecord=new WeakMap();
function sourceIdentity(value={},fallback={}){
 const source=Array.isArray(value)?value[0]||{}:value||{},base=Array.isArray(fallback)?fallback[0]||{}:fallback||{};
 return {book:bookKey(source.bookKey||source.book||base.bookKey||base.book),printedPage:source.printedPage??source.page??(source.printedPages||source.pages||[])[0]??base.printedPage??base.page??null,pdfPage:source.pdfPage??(source.pdfPages||[])[0]??base.pdfPage??null,sourceSha256:sourceKeys.map(k=>source[k]).find(v=>/^[a-f0-9]{64}$/.test(v||''))||sourceKeys.map(k=>base[k]).find(v=>/^[a-f0-9]{64}$/.test(v||''))||null};
}
export const monetaryContextFingerprintVersion='declared-source-crop-context-v1';
export const monetaryContextPartsFingerprintV1Version='ordered-source-context-parts-v1';
export const monetaryContextPartsFingerprintVersion='ordered-source-context-parts-v2';
export const uaContextFingerprintVersion='ua-group-active-context-targets-v1';
export const monetaryContextPhysicalFingerprintVersion='source-context-physical-window-v2';
export const monetaryFocusPhysicalFingerprintVersion='source-focus-physical-window-v1';
export function monetaryContextEvidenceFingerprint(evidence){
 if([monetaryContextPartsFingerprintV1Version,monetaryContextPartsFingerprintVersion].includes(evidence?.fingerprintVersion)){
  const sourceContextParts=(evidence.sourceContextParts||[]).map(part=>{const projected={partId:part.partId,order:part.order,role:part.role,factPointers:part.factPointers,source:part.source,sourceRender:part.sourceRender,crop:part.crop,focusBoundsCropPixelsLTRB:part.focusBoundsCropPixelsLTRB,pixelReview:part.pixelReview||null};if(evidence.fingerprintVersion===monetaryContextPartsFingerprintVersion)projected.focusCoordinateSpace=part.focusCoordinateSpace??null;return projected;});
  return hash({fingerprintVersion:evidence.fingerprintVersion,status:evidence.status,sourceFrame:evidence.sourceFrame||null,primaryPartIdByFact:evidence.primaryPartIdByFact||null,declaredLinks:(evidence.declaredLinks||[]).map(link=>({field:link.field||null,cropId:link.cropId||null,order:link.order??null})),sourceContextParts,supplementalContextCrops:(evidence.supplementalContextCrops||[]).map(crop=>({cropId:crop.cropId,role:crop.role,source:crop.source,sourceRender:crop.sourceRender,metadata:crop.metadata,physicalWindow:crop.physicalWindow}))});
 }
 if(evidence?.fingerprintVersion===uaContextFingerprintVersion){
  const legacy=evidence.legacyProjection||{},segments=new Set([legacy.rowContext?.segmentId,...(evidence.declaredLinks||[]).map(link=>link.segmentId)].filter(Boolean));
  return hash({fingerprintVersion:evidence.fingerprintVersion,status:evidence.status,activeTargetStatus:evidence.activeTargetStatus||null,legacyProjection:{groupId:legacy.groupId||null,groupSourcePdfSha256:legacy.groupSourcePdfSha256||null,sourceEvidenceIndex:(legacy.sourceEvidenceIndex||[]).filter(entry=>segments.has(entry.segmentId)),rowContext:legacy.rowContext||null},declaredLinks:(evidence.declaredLinks||[]).map(link=>({targetId:link.targetId||null,targetOrder:link.targetOrder??null,role:link.role||null,segmentId:link.segmentId||null})),crops:(evidence.crops||[]).map(crop=>({cropId:crop.cropId,targetOrder:crop.targetOrder??null,role:crop.role||null,segmentId:crop.segmentId||null,source:crop.source||null,sourceRender:crop.sourceRender||null,metadata:crop.metadata||null}))});
 }
 return hash({fingerprintVersion:evidence?.fingerprintVersion||null,status:evidence?.status||null,sourceFrame:evidence?.sourceFrame||null,declaredLinks:(evidence?.declaredLinks||[]).map(link=>({field:link.field||null,cropId:link.cropId||null})),crops:(evidence?.crops||[]).map(crop=>({cropId:crop.cropId,metadata:crop.metadata||null}))});
}
function roundedRatio(value,total){return Number((value/total).toFixed(6));}
function normalizedSourceWindow(source,metadata){
 const pixels=metadata?.cropBoundsPixelsLTRB||metadata?.renderedPagePixels||metadata?.physicalWindow?.cropBoundsPixelsLTRB,dims=metadata?.sourceRenderDimensionsPx||metadata?.physicalWindow?.sourceRenderDimensionsPx;
 if(finiteRect(pixels)&&positiveIntegerPair(dims)&&pixels.every(Number.isFinite)&&pixels[0]>=0&&pixels[1]>=0&&pixels[2]>pixels[0]&&pixels[3]>pixels[1]&&pixels[2]<=dims[0]&&pixels[3]<=dims[1])return {source:{book:source?.book||null,printedPage:source?.printedPage??null,pdfPage:source?.pdfPage??null,sourcePdfSha256:source?.sourcePdfSha256||source?.sourceSha256||null},space:'normalized-source-render-page',bounds:[roundedRatio(pixels[0],dims[0]),roundedRatio(pixels[1],dims[1]),roundedRatio(pixels[2],dims[0]),roundedRatio(pixels[3],dims[1])]};
 const bounds=metadata?.cropBoundsPdfPagePointsTopLeftLTRB||metadata?.cropBoundsPdfPagePointsTopLeft||metadata?.pdfPagePoints||metadata?.physicalWindow?.boundsPdfPagePointsLTRB;
 if(validPositiveRect(bounds))return {source:{book:source?.book||null,printedPage:source?.printedPage??null,pdfPage:source?.pdfPage??null,sourcePdfSha256:source?.sourcePdfSha256||source?.sourceSha256||null},space:'pdf-page-points',bounds:[...bounds]};
 return null;
}
function physicalCropProjection(evidence,crop){
 const metadata=crop?.metadata||crop?.crop||{},source=crop?.source||evidence?.sourceFrame||{};
 return normalizedSourceWindow(source,metadata);
}
function physicalLegacyWindows(evidence){
 if(evidence?.fingerprintVersion!==uaContextFingerprintVersion)return [];
 const legacy=evidence.legacyProjection||{},segments=new Set([legacy.rowContext?.segmentId,...(evidence.declaredLinks||[]).map(link=>link.segmentId)].filter(Boolean)),sourceFor=entry=>({book:'UA',printedPage:entry.printedPage??legacy.rowContext?.printedPage??evidence.sourceFrame?.printedPage??null,pdfPage:entry.pdfPage??legacy.rowContext?.pdfPage??evidence.sourceFrame?.pdfPage??null,sourcePdfSha256:entry.sourcePdfSha256||legacy.groupSourcePdfSha256||legacy.rowContext?.sourcePdfSha256||evidence.sourceFrame?.sourcePdfSha256||null}),windows=[];
 for(const entry of (legacy.sourceEvidenceIndex||[]).filter(item=>segments.has(item.segmentId))){const window=normalizedSourceWindow(sourceFor(entry),{...(entry.tableCropBounds||{}),sourceRenderDimensionsPx:entry.pageDimensionsPx});if(window)windows.push(window);}
 if(legacy.rowContext?.tableCropBounds){const bounds=legacy.rowContext.tableCropBounds,entry=(legacy.sourceEvidenceIndex||[]).find(item=>item.segmentId===legacy.rowContext.segmentId),window=normalizedSourceWindow(sourceFor(entry||{}),{...bounds,sourceRenderDimensionsPx:entry?.pageDimensionsPx});if(window)windows.push(window);}
 return windows;
}
function canonicalPhysicalWindows(windows){const unique=new Map();for(const window of windows.filter(Boolean))unique.set(canonical(window),window);return [...unique.values()].sort((a,b)=>canonical(a).localeCompare(canonical(b)));}
export function monetaryContextPhysicalEvidenceFingerprint(evidence){
 if(!evidence||typeof evidence!=='object')return null;
 const frame=evidence.sourceFrame||{},base={book:frame.book||null,printedPage:frame.printedPage??null,pdfPage:frame.pdfPage??null,sourcePdfSha256:frame.sourcePdfSha256||null};
 const sortPhysical=items=>items.sort((a,b)=>canonical(a).localeCompare(canonical(b)));
 let projection;
 if([monetaryContextPartsFingerprintV1Version,monetaryContextPartsFingerprintVersion].includes(evidence.fingerprintVersion)){projection={version:monetaryContextPhysicalFingerprintVersion,sourceFrame:base,physicalWindows:canonicalPhysicalWindows([...(evidence.sourceContextParts||[]).map(part=>physicalCropProjection(evidence,{source:part.source,sourceRender:part.sourceRender,metadata:part.crop})),...(evidence.supplementalContextCrops||[]).map(crop=>physicalCropProjection(evidence,crop))]) };}
 else if(evidence.fingerprintVersion===uaContextFingerprintVersion){projection={version:monetaryContextPhysicalFingerprintVersion,sourceFrame:base,physicalWindows:canonicalPhysicalWindows([...physicalLegacyWindows(evidence),...(evidence.crops||[]).map(crop=>physicalCropProjection(evidence,crop))])};}
 else {projection={version:monetaryContextPhysicalFingerprintVersion,sourceFrame:base,physicalWindows:canonicalPhysicalWindows((evidence.crops||[]).map(crop=>physicalCropProjection(evidence,crop)))};}
 return hash(projection);
}
export function monetaryContextPhysicalCropFingerprint(evidence,cropId){
 if(!evidence||typeof cropId!=='string'||!cropId)return null;
 const frame=evidence.sourceFrame||{};
 if([monetaryContextPartsFingerprintV1Version,monetaryContextPartsFingerprintVersion].includes(evidence.fingerprintVersion)){const part=(evidence.sourceContextParts||[]).find(candidate=>candidate.cropId===cropId);if(part)return hash({version:monetaryContextPhysicalFingerprintVersion,window:physicalCropProjection(evidence,{source:part.source,sourceRender:part.sourceRender,metadata:part.crop})});const supplemental=(evidence.supplementalContextCrops||[]).find(candidate=>candidate.cropId===cropId);return supplemental?hash({version:monetaryContextPhysicalFingerprintVersion,window:physicalCropProjection(evidence,supplemental)}):null;}
 const crop=(evidence.crops||[]).find(candidate=>candidate.cropId===cropId);return crop?hash({version:monetaryContextPhysicalFingerprintVersion,window:physicalCropProjection(evidence,crop)}):null;
}
function positiveIntegerPair(value){return Array.isArray(value)&&value.length===2&&value.every(n=>Number.isInteger(n)&&n>0);}
function validContextPixelCrop(metadata){
 const b=metadata?.cropBoundsPixelsLTRB,d=metadata?.cropDimensionsPx,render=metadata?.sourceRenderDimensionsPx;
 return Boolean(/^[a-f0-9]{64}$/.test(metadata?.cropSha256||'')&&/^[a-f0-9]{64}$/.test(metadata?.sourceRenderSha256||'')&&positiveIntegerPair(d)&&positiveIntegerPair(render)&&finiteRect(b)&&b.every(Number.isInteger)&&b[0]>=0&&b[1]>=0&&b[2]>b[0]&&b[3]>b[1]&&b[2]<=render[0]&&b[3]<=render[1]&&d[0]===b[2]-b[0]&&d[1]===b[3]-b[1]);
}
function validPositiveRect(rect){return finiteRect(rect)&&rect.every(Number.isFinite)&&rect[0]>=0&&rect[1]>=0&&rect[2]>rect[0]&&rect[3]>rect[1];}
function coordinateSpaceDpis(value){return typeof value==='string'?[...value.matchAll(/([+-]?\d+(?:\.\d+)?)\s*-?\s*dpi/gi)].map(match=>Number(match[1])):[];}
function coordinateSpaceDpi(value){return coordinateSpaceDpis(value)[0]??null;}
const sourceRenderPageCoordinateSpace='original source-render page pixels; top-left origin; [left,top,right,bottom] half-open';
const sourcePageGlobalCoordinateSpace='source-page-global source-render pixels; top-left origin; [left,top,right,bottom] half-open';
const cropLocalFocusCoordinateSpace=dpi=>`crop-local ${dpi}-dpi source-render pixels; left,top,right,bottom; half-open`;
function resolveOrderedPartRenderFrame(part,crop,row){
 const numeric=[part?.renderDpi,part?.sourceRenderDpi,part?.focus?.renderDpi,part?.focus?.sourceRenderDpi,part?.crop?.renderDpi,part?.crop?.sourceRenderDpi,part?.sourceRender?.renderDpi,part?.sourceRender?.sourceRenderDpi,crop?.renderDpi,crop?.sourceRenderDpi,crop?.sourceRender?.renderDpi,crop?.sourceRender?.sourceRenderDpi].filter(value=>value!==undefined),rawCoordinateSpaces=[part?.coordinateSpace,part?.focus?.coordinateSpace,part?.crop?.coordinateSpace,part?.sourceRender?.coordinateSpace,crop?.coordinateSpace,crop?.sourceRenderCoordinateSpace,crop?.sourceRender?.coordinateSpace].filter(value=>value!==undefined),rawFrameSpaces=[part?.sourceCropFrame,part?.focus?.sourceCropFrame,part?.crop?.sourceCropFrame,part?.sourceRender?.sourceCropFrame,crop?.sourceCropFrame,crop?.sourceRender?.sourceCropFrame].filter(value=>value!==undefined),coordinateSpaces=rawCoordinateSpaces.filter(value=>typeof value==='string'&&value.trim()),frameSpaces=rawFrameSpaces.filter(value=>typeof value==='string'&&value.trim()),dpiSpaces=[...coordinateSpaces,...frameSpaces],values=[],source=sourceIdentity(part?.source),registryResolution=resolveMonetarySourceRenderFrame({book:source.book,printedPage:source.printedPage,pdfPage:source.pdfPage,sourcePdfSha256:source.sourceSha256,sourceRenderSha256:crop?.sourceRenderSha256,sourceRenderDimensionsPx:crop?.sourceRenderDimensionsPx}),registryDpi=registryResolution.status==='matched'?registryResolution.frame?.renderDpi:null,rowFocusCropId=row?.focus?.contextCropId||row?.contextCropId,rowFocusCoordinateSpace=row?.focus?.coordinateSpace,sameAsRowFocus=Boolean(part?.contextCropId&&part.contextCropId===rowFocusCropId),rowFocusDpis=sameAsRowFocus?coordinateSpaceDpis(rowFocusCoordinateSpace):[];let invalid=numeric.some(value=>!Number.isInteger(value)||value<=0)||[...rawCoordinateSpaces,...rawFrameSpaces].some(value=>typeof value!=='string'||!value.trim())||coordinateSpaces.some(value=>coordinateSpaceDpis(value).length===0)||frameSpaces.some(value=>/\bdpi\b/i.test(value)&&coordinateSpaceDpis(value).length===0)||registryResolution.status==='conflicting-render-identity'||registryResolution.status==='matched'&&(!Number.isInteger(registryDpi)||registryDpi<1)||sameAsRowFocus&&(typeof rowFocusCoordinateSpace!=='string'||!rowFocusCoordinateSpace.trim()||rowFocusDpis.length!==1||rowFocusDpis.some(value=>!Number.isInteger(value)||value<1));
 for(const value of numeric)if(Number.isInteger(value)&&value>0)values.push(value);
 for(const space of dpiSpaces)for(const dpi of coordinateSpaceDpis(space)){if(!Number.isInteger(dpi)||dpi<=0)invalid=true;else values.push(dpi);}
 if(sameAsRowFocus)for(const dpi of rowFocusDpis)if(Number.isInteger(dpi)&&dpi>0)values.push(dpi);
 if(registryDpi!==null)values.push(registryDpi);
 const distinctDpis=new Set(values),consistent=!invalid&&distinctDpis.size<=1,dpi=consistent?(registryDpi??values[0]??null):null;
 const coordinateSpace=Number.isInteger(dpi)&&dpi>0?cropLocalFocusCoordinateSpace(dpi):null;
 const frameDpiResolution={status:registryResolution.status,registry:registryResolution.registry??monetarySourceRenderFrameRegistry,frameId:registryResolution.frame?.id??null,renderDpi:registryResolution.frame?.renderDpi??null};
 return {renderDpi:dpi,coordinateSpace,consistent,registryResolution,frameDpiResolution};
}
function orderedPartDeclaredRenderDpi(part,crop){return {partRenderDpi:part?.renderDpi??null,partSourceRenderDpi:part?.sourceRenderDpi??null,partFocusRenderDpi:part?.focus?.renderDpi??null,partFocusSourceRenderDpi:part?.focus?.sourceRenderDpi??null,partCropRenderDpi:part?.crop?.renderDpi??null,partCropSourceRenderDpi:part?.crop?.sourceRenderDpi??null,partSourceRenderRenderDpi:part?.sourceRender?.renderDpi??null,partSourceRenderSourceRenderDpi:part?.sourceRender?.sourceRenderDpi??null,cropRenderDpi:crop?.renderDpi??null,cropSourceRenderDpi:crop?.sourceRenderDpi??null,cropSourceRenderRenderDpi:crop?.sourceRender?.renderDpi??null,cropSourceRenderSourceRenderDpi:crop?.sourceRender?.sourceRenderDpi??null};}
function orderedPartDeclaredCoordinateSpaces(part,crop){return {part:part?.coordinateSpace??null,partFocus:part?.focus?.coordinateSpace??null,partFocusSourceCropFrame:part?.focus?.sourceCropFrame??null,partSourceCropFrame:part?.sourceCropFrame??null,partSourceRender:part?.sourceRender?.coordinateSpace??null,partSourceRenderSourceCropFrame:part?.sourceRender?.sourceCropFrame??null,partCrop:part?.crop?.coordinateSpace??null,partCropSourceCropFrame:part?.crop?.sourceCropFrame??null,crop:crop?.coordinateSpace??null,cropSourceRender:crop?.sourceRenderCoordinateSpace??null,cropSourceRenderFrame:crop?.sourceRender?.coordinateSpace??null,cropSourceRenderSourceCropFrame:crop?.sourceRender?.sourceCropFrame??null,cropSourceCropFrame:crop?.sourceCropFrame??null};}
function orderedPartDeclaredSourceFrame(part,crop){return {partSource:part?.source??null,cropTopLevel:{bookKey:crop?.bookKey??null,book:crop?.book??null,printedPage:crop?.printedPage??null,page:crop?.page??null,pdfPage:crop?.pdfPage??null,sourceSha256:crop?.sourceSha256??null,sourcePdfSha256:crop?.sourcePdfSha256??null,sourceFileSha256:crop?.sourceFileSha256??null,sha256:crop?.sha256??null},cropSource:crop?.source??null,cropSourceFrame:crop?.sourceFrame??null,cropSourceRender:crop?.sourceRender??null};}
function sourceAliasDeclarationsAgree(value,expected,{requireComplete=false}={}){
 if(!value||typeof value!=='object'||Array.isArray(value))return !requireComplete;
 const books=[value.bookKey,value.book].filter(item=>item!==undefined),hashes=sourceKeys.map(key=>value[key]).filter(item=>item!==undefined),printed=[value.printedPage,value.page].filter(item=>item!==undefined),pdf=[value.pdfPage].filter(item=>item!==undefined);
 if(requireComplete&&(!books.length||!hashes.length||!printed.length||!pdf.length))return false;
 return books.every(item=>typeof item==='string'&&item.length>0&&bookKey(item)===expected.book)&&hashes.every(item=>typeof item==='string'&&/^[a-f0-9]{64}$/.test(item)&&item===expected.sourceSha256)&&printed.every(item=>Number.isInteger(item)&&item>0&&item===expected.printedPage)&&pdf.every(item=>Number.isInteger(item)&&item>0&&item===expected.pdfPage)&&(!printed.length||new Set(printed).size===1)&&(!pdf.length||new Set(pdf).size===1)&&(!hashes.length||new Set(hashes).size===1)&&(!books.length||new Set(books.map(bookKey)).size===1);
}
function rawOrderedContextPartDeclarationsAgree(record,evidence){
 const captured=rawOrderedContextPartsByRecord.get(record);if(!captured)return false;
 const rawParts=captured.row?.sourceContextParts,parts=evidence?.sourceContextParts;if(!Array.isArray(rawParts)||!Array.isArray(parts)||rawParts.length!==parts.length||!Array.isArray(evidence.crops)||evidence.crops.length!==parts.length)return false;
 return rawParts.every((rawPart,index)=>{
  const part=parts[index],crop=captured.crops.get(rawPart?.contextCropId);if(!crop||!part||part.cropId!==rawPart.contextCropId||part.partId!==rawPart.partId||part.order!==rawPart.order||part.role!==rawPart.role||canonical(part.factPointers)!==canonical(rawPart.factPointers||[]))return false;
  const source=sourceIdentity(rawPart.source),frame=resolveOrderedPartRenderFrame(rawPart,crop,captured.row),cropPdfBounds=rawPart.cropBoundsPdfPagePointsTopLeftLTRB||crop.cropBoundsPdfPagePointsTopLeftLTRB||crop.cropBoundsPdfPagePointsTopLeft||null,sourceAliasOk=sourceAliasDeclarationsAgree(rawPart.source,source,{requireComplete:true})&&source.book===part.source?.book&&source.printedPage===part.source?.printedPage&&source.pdfPage===part.source?.pdfPage&&source.sourceSha256===part.source?.sourcePdfSha256&&source.book===evidence.sourceFrame?.book&&source.sourceSha256===evidence.sourceFrame?.sourcePdfSha256;
  const cropSourceObjects=[crop.source,crop.sourceFrame,crop.sourceRender].filter(value=>value&&typeof value==='object');const cropAliasOk=sourceAliasDeclarationsAgree(crop,source)&&cropSourceObjects.every(value=>sourceAliasDeclarationsAgree(value,source));
  const metadata=part.crop,render=part.sourceRender,expectedFocusSpace=part.focusBoundsCropPixelsLTRB!==null&&part.focusBoundsCropPixelsLTRB!==undefined?cropLocalFocusCoordinateSpace(frame.renderDpi):null;if(!sourceAliasOk||!cropAliasOk||!frame.consistent||!Number.isInteger(frame.renderDpi)||frame.renderDpi<1||metadata?.renderDpi!==frame.renderDpi||render?.renderDpi!==frame.renderDpi||metadata?.coordinateSpace!==sourcePageGlobalCoordinateSpace||metadata?.cropBoundsPixelsCoordinateSpace!==sourcePageGlobalCoordinateSpace||render?.coordinateSpace!==sourceRenderPageCoordinateSpace||part.focusCoordinateSpace!==expectedFocusSpace)return false;
  return canonical(render.declaredDpi)===canonical(orderedPartDeclaredRenderDpi(rawPart,crop))&&canonical(render.declaredCoordinateSpaces)===canonical(orderedPartDeclaredCoordinateSpaces(rawPart,crop))&&canonical(render.dpiRegistryResolution)===canonical(frame.registryResolution)&&canonical(render.frameDpiResolution)===canonical(frame.frameDpiResolution)&&canonical(metadata.frameDpiResolution)===canonical(frame.frameDpiResolution)&&canonical(metadata.declaredSourceFrame)===canonical(orderedPartDeclaredSourceFrame(rawPart,crop))&&render.sourceRenderId===(crop.sourceRender||null)&&render.sourceRenderSha256===(crop.sourceRenderSha256||null)&&canonical(render.sourceRenderDimensionsPx)==canonical(crop.sourceRenderDimensionsPx||null)&&metadata.sourcePdfSha256===source.sourceSha256&&metadata.sourceRenderSha256===(crop.sourceRenderSha256||null)&&canonical(metadata.sourceRenderDimensionsPx)==canonical(crop.sourceRenderDimensionsPx||null)&&canonical(metadata.cropBoundsPdfPagePointsTopLeftLTRB)==canonical(cropPdfBounds)&&canonical(metadata.cropBoundsPixelsLTRB)==canonical(crop.cropBoundsPixelsLTRB||null)&&canonical(metadata.cropDimensionsPx)==canonical(crop.cropDimensionsPx||null)&&metadata.cropSha256===(crop.cropSha256||null);
 });
}
function validSourceContextParts(evidence){
 const parts=evidence?.sourceContextParts;if(evidence?.status!=='declared-source-context-parts-linked'||!Array.isArray(parts)||parts.length<2)return false;
 const ids=new Set(),cropIds=new Set();let previousOrder=0;
 for(const part of parts){
  const hasFocus=part?.focusBoundsCropPixelsLTRB!==null&&part?.focusBoundsCropPixelsLTRB!==undefined,focusSpace=hasFocus?cropLocalFocusCoordinateSpace(part?.sourceRender?.renderDpi):null,registry=part?.sourceRender?.dpiRegistryResolution?.registry,frameDpi=part?.sourceRender?.frameDpiResolution;
  if(!part||typeof part.partId!=='string'||!part.partId||ids.has(part.partId)||!Number.isInteger(part.order)||part.order!==previousOrder+1||typeof part.role!=='string'||!part.role||!Array.isArray(part.factPointers)||part.factPointers.some(p=>typeof p!=='string'||!p.startsWith('/')||p==='/'||/(?:~(?![01]))/.test(p))||new Set(part.factPointers).size!==part.factPointers.length||typeof part.cropId!=='string'||!part.cropId||cropIds.has(part.cropId)||!part.source||!part.source.book||!Number.isInteger(part.source.printedPage)||part.source.printedPage<1||!Number.isInteger(part.source.pdfPage)||part.source.pdfPage<1||!/^[a-f0-9]{64}$/.test(part.source.sourcePdfSha256||'')||!part.sourceRender||typeof part.sourceRender.sourceRenderId!=='string'||!part.sourceRender.sourceRenderId||!/^[a-f0-9]{64}$/.test(part.sourceRender.sourceRenderSha256||'')||!positiveIntegerPair(part.sourceRender.sourceRenderDimensionsPx)||!Number.isInteger(part.sourceRender.renderDpi)||part.sourceRender.renderDpi<1||part.sourceRender.coordinateSpace!==sourceRenderPageCoordinateSpace||!part.sourceRender.declaredDpi||typeof part.sourceRender.declaredDpi!=='object'||!part.sourceRender.declaredCoordinateSpaces||typeof part.sourceRender.declaredCoordinateSpaces!=='object'||!part.sourceRender.dpiRegistryResolution||!['matched','unknown-render'].includes(part.sourceRender.dpiRegistryResolution.status)||registry?.path!==monetarySourceRenderFrameRegistry.path||registry?.sha256!==monetarySourceRenderFrameRegistry.sha256||!frameDpi||frameDpi.status!==part.sourceRender.dpiRegistryResolution.status||frameDpi.registry?.path!==registry.path||frameDpi.registry?.sha256!==registry.sha256||!part.crop||!part.crop.declaredSourceFrame||typeof part.crop.declaredSourceFrame!=='object'||!validContextPixelCrop(part.crop)||part.crop.coordinateSpace!==sourcePageGlobalCoordinateSpace||part.crop.cropBoundsPixelsCoordinateSpace!==sourcePageGlobalCoordinateSpace||part.crop.sourcePdfSha256!==part.source.sourcePdfSha256||part.crop.sourceRenderSha256!==part.sourceRender.sourceRenderSha256||canonical(part.crop.sourceRenderDimensionsPx)!==canonical(part.sourceRender.sourceRenderDimensionsPx)||part.crop.renderDpi!==part.sourceRender.renderDpi||part.focusCoordinateSpace!==focusSpace||part.crop.cropBoundsPdfPagePointsTopLeftLTRB&&!validPositiveRect(part.crop.cropBoundsPdfPagePointsTopLeftLTRB)||part.factPointers.length>0&&(!finiteRect(part.focusBoundsCropPixelsLTRB)||part.focusBoundsCropPixelsLTRB.some(n=>!Number.isInteger(n)||n<0)||part.focusBoundsCropPixelsLTRB[2]<=part.focusBoundsCropPixelsLTRB[0]||part.focusBoundsCropPixelsLTRB[3]<=part.focusBoundsCropPixelsLTRB[1]||part.focusBoundsCropPixelsLTRB[2]>part.crop.cropDimensionsPx[0]||part.focusBoundsCropPixelsLTRB[3]>part.crop.cropDimensionsPx[1])||!part.factPointers.length&&part.focusBoundsCropPixelsLTRB!==null&&part.focusBoundsCropPixelsLTRB!==undefined)return false;
  ids.add(part.partId);cropIds.add(part.cropId);previousOrder=part.order;
 }
 const primary=evidence.primaryPartIdByFact,factPointers=[...new Set(parts.flatMap(part=>part.factPointers))];
 if(factPointers.length&&(!primary||typeof primary!=='object'||Array.isArray(primary)||canonical(Object.keys(primary).sort())!==canonical([...factPointers].sort())||Object.entries(primary).some(([fact,id])=>!ids.has(id)||!parts.find(part=>part.partId===id)?.factPointers.includes(fact))))return false;
 if(!factPointers.length&&primary!==undefined&&(!primary||typeof primary!=='object'||Array.isArray(primary)||Object.keys(primary).length))return false;
 const supplemental=evidence.supplementalContextCrops||[];
 return Array.isArray(supplemental)&&supplemental.every(crop=>{const registry=crop?.sourceRender?.dpiRegistryResolution?.registry,frameDpi=crop?.sourceRender?.frameDpiResolution;return crop&&crop.role==='supplemental-row-context'&&crop.sourceRender?.coordinateSpace===sourceRenderPageCoordinateSpace&&crop.metadata?.coordinateSpace===sourcePageGlobalCoordinateSpace&&crop.metadata?.cropBoundsPixelsCoordinateSpace===sourcePageGlobalCoordinateSpace&&Number.isInteger(crop.sourceRender.renderDpi)&&crop.sourceRender.renderDpi>0&&crop.metadata.renderDpi===crop.sourceRender.renderDpi&&registry?.path===monetarySourceRenderFrameRegistry.path&&registry?.sha256===monetarySourceRenderFrameRegistry.sha256&&frameDpi?.registry?.path===registry.path&&frameDpi?.registry?.sha256===registry.sha256&&validContextPixelCrop(crop.metadata)&&canonical(crop.physicalWindow)===canonical(normalizedSourceWindow(crop.source,crop.metadata));});
}
function uniqueResolvedLinks(links,crops,{ua=false}={}){
 if(!Array.isArray(links)||!Array.isArray(crops)||!links.length||!crops.length)return false;
 const seenLinks=new Set(),seenCrops=new Set(),seenFields=new Set();
 for(let i=0;i<links.length;i++){
  const link=links[i],id=ua?link?.targetId:link?.cropId;
  if(typeof id!=='string'||!id||ua&&seenLinks.has(id)||!ua&&(typeof link?.field!=='string'||!link.field||seenFields.has(link.field)))return false;
  if(!ua)seenFields.add(link.field);
  seenLinks.add(id);
  if(ua&&(!Number.isInteger(link.targetOrder)||link.targetOrder<1||typeof link.role!=='string'||typeof link.segmentId!=='string'||i>0&&link.targetOrder<=links[i-1].targetOrder))return false;
 }
 for(const crop of crops){const id=crop?.cropId;if(typeof id!=='string'||!id||seenCrops.has(id))return false;seenCrops.add(id);if(ua&&(!Number.isInteger(crop.targetOrder)||crop.targetOrder<1||typeof crop.role!=='string'||typeof crop.segmentId!=='string'))return false;}
 if(ua)return seenLinks.size===seenCrops.size&&links.every((link,i)=>{const crop=crops.find(c=>c.cropId===link.targetId);return crop&&crop.targetOrder===link.targetOrder&&crop.role===link.role&&crop.segmentId===link.segmentId&&crops.indexOf(crop)===i;});
 const linkedIds=new Set(links.map(link=>link.cropId));return links.every(link=>typeof link.cropId==='string'&&link.cropId)&&linkedIds.size===seenCrops.size&&[...linkedIds].every(id=>seenCrops.has(id));
}
function hasValidDeclaredContextEvidence(record){
 const e=record?.contextEvidence,s=e?.sourceFrame;
 if(!e||!s||!s.book||!Number.isInteger(s.pdfPage)||s.pdfPage<1||!/^[a-f0-9]{64}$/.test(s.sourcePdfSha256||''))return false;
 if(e.fingerprintVersion===monetaryContextFingerprintVersion){
  const links=e.declaredLinks,crops=e.crops;
  return e.status==='declared-context-crop-metadata-linked'&&uniqueResolvedLinks(links,crops)&&links.every(link=>typeof link.field==='string'&&link.field)&&crops.every(c=>validContextPixelCrop(c.metadata)&&c.physicalWindow&&canonical(c.physicalWindow)===canonical(normalizedSourceWindow(s,c.metadata)));
 }
 if(e.fingerprintVersion===monetaryContextPartsFingerprintVersion){
  if(!validSourceContextParts(e)||!rawOrderedContextPartDeclarationsAgree(record,e))return false;
  const parts=e.sourceContextParts,links=e.declaredLinks||[],partByCrop=new Map(parts.map(part=>[part.cropId,part]));
  if(links.length!==parts.length||links.some((link,i)=>link?.field!==`sourceContextParts/${i}`||link.cropId!==parts[i].cropId||link.order!==parts[i].order))return false;
  if(!Array.isArray(e.crops)||e.crops.length!==parts.length)return false;
  const supplemental=e.supplementalContextCrops||[];
  return parts.every((part,i)=>{const crop=e.crops[i],meta=crop?.metadata;return crop?.cropId===part.cropId&&crop.order===part.order&&crop.role===part.role&&canonical(crop.sourceRender)===canonical(part.sourceRender)&&canonical(crop.metadata)===canonical(part.crop)&&part.source.sourcePdfSha256===s.sourcePdfSha256&&part.source.book===s.book&&validContextPixelCrop(meta);})&&partByCrop.size===parts.length&&Array.isArray(supplemental)&&supplemental.every(crop=>crop&&typeof crop.cropId==='string'&&!partByCrop.has(crop.cropId)&&crop.role==='supplemental-row-context'&&crop.source?.book===s.book&&crop.source?.sourcePdfSha256===s.sourcePdfSha256&&Number.isInteger(crop.source.printedPage)&&crop.source.printedPage>0&&Number.isInteger(crop.source.pdfPage)&&crop.source.pdfPage>0&&crop.sourceRender?.sourceRenderId&&crop.sourceRender.coordinateSpace===sourceRenderPageCoordinateSpace&&crop.metadata?.coordinateSpace===sourcePageGlobalCoordinateSpace&&crop.metadata?.cropBoundsPixelsCoordinateSpace===sourcePageGlobalCoordinateSpace&&crop.sourceRender.sourceRenderSha256===crop.metadata?.sourceRenderSha256&&canonical(crop.sourceRender.sourceRenderDimensionsPx)===canonical(crop.metadata?.sourceRenderDimensionsPx)&&crop.sourceRender.renderDpi===crop.metadata?.renderDpi&&validContextPixelCrop(crop.metadata)&&canonical(crop.physicalWindow)===canonical(normalizedSourceWindow(crop.source,crop.metadata)));
 }
 if(e.fingerprintVersion===uaContextFingerprintVersion){
  const links=e.declaredLinks,crops=e.crops;
  return e.status==='declared-active-context-targets-linked'&&e.legacyProjection?.sourceEvidenceIndex&&Array.isArray(e.legacyProjection.sourceEvidenceIndex)&&e.legacyProjection.sourceEvidenceIndex.length>0&&uniqueResolvedLinks(links,crops,{ua:true})&&crops.every(c=>c.source?.book==='UA'&&Number.isInteger(c.source.printedPage)&&c.source.printedPage>0&&Number.isInteger(c.source.pdfPage)&&c.source.pdfPage>0&&/^[a-f0-9]{64}$/.test(c.source.sourcePdfSha256||'')&&c.source.sourcePdfSha256===s.sourcePdfSha256&&c.sourceRender?.sourceRenderId&&/^[a-f0-9]{64}$/.test(c.sourceRender.sourceRenderSha256||'')&&positiveIntegerPair(c.sourceRender.sourceRenderDimensionsPx)&&Number.isInteger(c.sourceRender.renderDpi)&&c.sourceRender.renderDpi>0&&c.metadata?.cropBoundsPdfPagePointsTopLeft&&validPositiveRect(c.metadata.cropBoundsPdfPagePointsTopLeft)&&c.metadata.sourcePdfSha256===c.source.sourcePdfSha256&&c.metadata.sourceRenderSha256===c.sourceRender.sourceRenderSha256&&canonical(c.metadata.sourceRenderDimensionsPx)===canonical(c.sourceRender.sourceRenderDimensionsPx)&&c.metadata.renderDpi===c.sourceRender.renderDpi&&validContextPixelCrop(c.metadata));
 }
 return false;
}
function hasValidLegacyContextGeometry(record){
 return record.geometry.some(g=>contextRoles.has(g.role)&&g.validShape&&Boolean(g.frame)&&g.source?.book&&Number.isInteger(g.source.pdfPage)&&g.source.pdfPage>0&&/^[a-f0-9]{64}$/.test(g.source.sourceSha256||''));
}
function attachDeclaredContextEvidence(record,{doc,cropById,cropIndexById,cropRefsById,links,source}){
 const normalizedSource=sourceIdentity(source,record.source),cropIds=[...new Set(links.map(link=>link.cropId).filter(Boolean))].sort();
 const contextCrops=cropIds.map(cropId=>{
  const crop=cropById.get(cropId),index=cropIndexById.get(cropId);
  return {cropId,cropPointer:Number.isInteger(index)?`/review/evidenceCrops/${index}`:null,metadata:crop?{
   groupId:crop.groupId||null,label:crop.label||null,sourceRender:crop.sourceRender||null,sourceRenderSha256:crop.sourceRenderSha256||null,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx||null,
   cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB||null,cropDimensionsPx:crop.cropDimensionsPx||null,cropSha256:crop.cropSha256||null
  }:null,physicalWindow:crop?normalizedSourceWindow(normalizedSource,{cropBoundsPdfPagePointsTopLeftLTRB:crop.cropBoundsPdfPagePointsTopLeftLTRB||crop.cropBoundsPdfPagePointsTopLeft,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx}):null,sharedReferenceRecordIds:(cropRefsById.get(cropId)||[]).map(ref=>ref.uid).sort()};
 });
 const cropResolved=contextCrops.length>0&&contextCrops.every(item=>item.metadata!==null&&validContextPixelCrop(item.metadata));
 const sourceFrameComplete=Boolean(normalizedSource.book&&Number.isInteger(normalizedSource.pdfPage)&&normalizedSource.pdfPage>0&&/^[a-f0-9]{64}$/.test(normalizedSource.sourceSha256||''));
 let status;
 if(cropIds.length===0)status='no-declared-context-crop';
 else if(cropIds.length>1)status='conflicting-declared-context-crop-links';
 else if(contextCrops.some(item=>!item.metadata))status='declared-context-crop-unresolved';
 else if(!cropResolved||!sourceFrameComplete)status='unassessable-incomplete-context-frame-metadata';
 else status='declared-context-crop-metadata-linked';
 record.contextFingerprintVersion=monetaryContextFingerprintVersion;
 record.contextEvidence={schemaVersion:1,fingerprintVersion:monetaryContextFingerprintVersion,status,sourceInput:{path:doc.path,sha256:doc.sha256},sourceRecordPointer:record.pointer,sourceFrame:{book:normalizedSource.book,printedPage:normalizedSource.printedPage,pdfPage:normalizedSource.pdfPage,sourcePdfSha256:normalizedSource.sourceSha256,coordinateSpace:'crop-local-pixels plus source-render pixel frame'},declaredLinks:links.map(link=>({...link})),crops:contextCrops};
 record.contextEvidenceSha256=monetaryContextEvidenceFingerprint(record.contextEvidence);
}
function attachOrderedSourceContextParts(record,{doc,row,cropById,cropIndexById,cropRefsById}){
 const rawParts=row.sourceContextParts,normalizedSource=sourceIdentity(row.source,record.source),parts=Array.isArray(rawParts)?rawParts:[],normalizedParts=[],cropIds=new Set(),dpiFrameAgreement=[],sourceFrameAgreement=[];
 const resolveFocusBounds=part=>part?.focusBoundsCropPixelsLTRB||part?.focus?.focusBoundsCropPixelsLTRB||(part?.contextCropId&&(part.contextCropId===row.focus?.contextCropId||part.contextCropId===row.contextCropId)?row.focus?.focusBoundsCropPixelsLTRB:null)||null;
 for(const [i,part]of parts.entries()){
  const cropId=part?.contextCropId,crop=cropById.get(cropId),partSource=sourceIdentity(part?.source,normalizedSource),dpiFrame=resolveOrderedPartRenderFrame(part,crop,row),dpi=dpiFrame.renderDpi,focusBounds=resolveFocusBounds(part),focusCoordinateSpace=focusBounds?cropLocalFocusCoordinateSpace(dpi):null;
  dpiFrameAgreement.push(dpiFrame.consistent);sourceFrameAgreement.push(Boolean(sourceAliasDeclarationsAgree(part?.source,partSource,{requireComplete:true})&&partSource.book===normalizedSource.book&&partSource.sourceSha256===normalizedSource.sourceSha256&&crop&&sourceAliasDeclarationsAgree(crop,partSource)&&[crop.source,crop.sourceFrame,crop.sourceRender].filter(value=>value&&typeof value==='object').every(value=>sourceAliasDeclarationsAgree(value,partSource))));
  const declaredDpi=orderedPartDeclaredRenderDpi(part,crop),declaredCoordinateSpaces=orderedPartDeclaredCoordinateSpaces(part,crop),declaredSourceFrame=orderedPartDeclaredSourceFrame(part,crop),cropPdfBounds=part?.cropBoundsPdfPagePointsTopLeftLTRB||part?.crop?.cropBoundsPdfPagePointsTopLeftLTRB||crop?.cropBoundsPdfPagePointsTopLeftLTRB||crop?.cropBoundsPdfPagePointsTopLeft||null;
  const cropMetadata=crop?{sourcePdfSha256:partSource.sourceSha256,sourceRenderSha256:crop.sourceRenderSha256||null,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx||null,cropBoundsPdfPagePointsTopLeftLTRB:cropPdfBounds,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB||null,cropBoundsPixelsCoordinateSpace:sourcePageGlobalCoordinateSpace,cropDimensionsPx:crop.cropDimensionsPx||null,cropSha256:crop.cropSha256||null,renderDpi:dpi,coordinateSpace:sourcePageGlobalCoordinateSpace,frameDpiResolution:dpiFrame.frameDpiResolution,declaredSourceFrame}:null;
  const sourceRender={sourceRenderId:crop?.sourceRender||null,sourceRenderSha256:crop?.sourceRenderSha256||null,sourceRenderDimensionsPx:crop?.sourceRenderDimensionsPx||null,renderDpi:dpi,coordinateSpace:sourceRenderPageCoordinateSpace,pageBoundsPdfPagePointsTopLeftLTRB:crop?.pageBoundsPdfPagePointsTopLeftLTRB||null,declaredDpi,declaredCoordinateSpaces,dpiRegistryResolution:dpiFrame.registryResolution,frameDpiResolution:dpiFrame.frameDpiResolution};
  const normalized={partId:part?.partId||null,order:part?.order??null,role:part?.role||null,factPointers:Array.isArray(part?.factPointers)?part.factPointers:[],cropId:cropId||null,source:{book:partSource.book,printedPage:partSource.printedPage,pdfPage:partSource.pdfPage,sourcePdfSha256:partSource.sourceSha256},sourceRender,crop:cropMetadata,focusBoundsCropPixelsLTRB:focusBounds,focusCoordinateSpace,pixelReview:part?.pixelReview||null};
  normalizedParts.push(normalized);if(cropId)cropIds.add(cropId);
  if(crop&&normalized.focusBoundsCropPixelsLTRB)geometry(record,{path:`/sourceContextParts/${i}/focusBoundsCropPixelsLTRB`,rect:normalized.focusBoundsCropPixelsLTRB,space:'crop-local-pixels',frame:crop.cropSha256,role:'source-context-part-focus',status:part?.pixelReview?.status||'recorded-unverified',source:partSource,derivation:{kind:'ordered-source-context-part-focus',cropId,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx}});
 }
 const links=normalizedParts.map(part=>({field:`sourceContextParts/${Math.max(0,(part.order||1)-1)}`,cropId:part.cropId,order:part.order}));
 const crops=normalizedParts.map(part=>{const crop=cropById.get(part.cropId);return {cropId:part.cropId,order:part.order,role:part.role,metadata:part.crop,sourceRender:part.sourceRender,cropPointer:Number.isInteger(cropIndexById.get(part.cropId))?`/review/evidenceCrops/${cropIndexById.get(part.cropId)}`:null,sharedReferenceRecordIds:(cropRefsById.get(part.cropId)||[]).map(ref=>ref.uid).sort()};});
 const partCropIds=new Set(normalizedParts.map(part=>part.cropId)),rowContextCropIds=[...new Set([row.contextCropId,row.focus?.contextCropId].filter(id=>typeof id==='string'&&id&&!partCropIds.has(id)))],supplementalFrameAgreement=[],supplementalContextCrops=rowContextCropIds.map(cropId=>{const crop=cropById.get(cropId),source={book:normalizedSource.book,printedPage:normalizedSource.printedPage,pdfPage:normalizedSource.pdfPage,sourcePdfSha256:normalizedSource.sourceSha256},dpiFrame=resolveOrderedPartRenderFrame({contextCropId:cropId,source:row.source},crop,row),dpi=dpiFrame.renderDpi,sourceAliasesAgree=Boolean(crop&&sourceAliasDeclarationsAgree(crop,source)&&[crop.source,crop.sourceFrame,crop.sourceRender].filter(value=>value&&typeof value==='object').every(value=>sourceAliasDeclarationsAgree(value,source)));supplementalFrameAgreement.push(Boolean(dpiFrame.consistent&&Number.isInteger(dpi)&&dpi>0&&sourceAliasesAgree));const metadata=crop?{sourcePdfSha256:normalizedSource.sourceSha256,sourceRenderSha256:crop.sourceRenderSha256||null,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx||null,cropBoundsPdfPagePointsTopLeftLTRB:crop.cropBoundsPdfPagePointsTopLeftLTRB||crop.cropBoundsPdfPagePointsTopLeft||null,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB||null,cropBoundsPixelsCoordinateSpace:sourcePageGlobalCoordinateSpace,cropDimensionsPx:crop.cropDimensionsPx||null,cropSha256:crop.cropSha256||null,renderDpi:dpi,coordinateSpace:sourcePageGlobalCoordinateSpace,frameDpiResolution:dpiFrame.frameDpiResolution}:null;return {cropId,role:'supplemental-row-context',source,sourceRender:crop?{sourceRenderId:crop.sourceRender||null,sourceRenderSha256:crop.sourceRenderSha256||null,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx||null,renderDpi:dpi,coordinateSpace:sourceRenderPageCoordinateSpace,dpiRegistryResolution:dpiFrame.registryResolution,frameDpiResolution:dpiFrame.frameDpiResolution}:null,metadata,physicalWindow:crop?normalizedSourceWindow(source,metadata):null,cropPointer:Number.isInteger(cropIndexById.get(cropId))?`/review/evidenceCrops/${cropIndexById.get(cropId)}`:null};});
 const factPointers=[...new Set(normalizedParts.flatMap(part=>part.factPointers))],primary=row.primaryPartIdByFact||row.primary,primaryOk=factPointers.length?Boolean(primary&&typeof primary==='object'&&!Array.isArray(primary)&&canonical(Object.keys(primary).sort())===canonical([...factPointers].sort())&&Object.entries(primary).every(([pointer,partId])=>normalizedParts.some(part=>part.partId===partId&&part.factPointers.includes(pointer)))):primary===undefined||primary&&typeof primary==='object'&&!Array.isArray(primary)&&Object.keys(primary).length===0,focusCropId=row.focus?.contextCropId||row.contextCropId,mainFocusPartOk=!focusCropId||normalizedParts.some(part=>part.cropId===focusCropId)||cropById.has(focusCropId);
 const allResolved=parts.length>=2&&primaryOk&&mainFocusPartOk&&supplementalContextCrops.every((crop,i)=>supplementalFrameAgreement[i]&&crop.metadata&&validContextPixelCrop(crop.metadata)&&crop.source.book===normalizedSource.book&&crop.source.sourcePdfSha256===normalizedSource.sourceSha256&&crop.sourceRender.coordinateSpace===sourceRenderPageCoordinateSpace&&crop.metadata.coordinateSpace===sourcePageGlobalCoordinateSpace&&crop.metadata.cropBoundsPixelsCoordinateSpace===sourcePageGlobalCoordinateSpace&&normalizedSourceWindow(crop.source,crop.metadata))&&parts.every((part,i)=>{const normalized=normalizedParts[i],explicitSource=part?.source&&sourceAliasDeclarationsAgree(part.source,sourceIdentity(part.source),{requireComplete:true})&&sourceIdentity(part.source).sourceSha256===normalizedSource.sourceSha256&&sourceIdentity(part.source).book===normalizedSource.book&&Number.isInteger(part.source.printedPage??part.source.page)&&Number.isInteger(part.source.pdfPage),focus=normalized.focusBoundsCropPixelsLTRB,focusOk=!normalized.factPointers.length||Boolean(focus&&validPositiveRect(focus)&&focus.every(Number.isInteger)&&focus[0]>=0&&focus[1]>=0&&focus[2]<=normalized.crop?.cropDimensionsPx?.[0]&&focus[3]<=normalized.crop?.cropDimensionsPx?.[1]),declaredRender=part?.sourceRender,renderAgreement=!declaredRender||(declaredRender.sourceRenderId===normalized.sourceRender.sourceRenderId&&declaredRender.sourceRenderSha256===normalized.sourceRender.sourceRenderSha256&&canonical(declaredRender.sourceRenderDimensionsPx)===canonical(normalized.sourceRender.sourceRenderDimensionsPx)&&declaredRender.renderDpi===normalized.sourceRender.renderDpi&&(!declaredRender.pageBoundsPdfPagePointsTopLeftLTRB||canonical(declaredRender.pageBoundsPdfPagePointsTopLeftLTRB)===canonical(normalized.sourceRender.pageBoundsPdfPagePointsTopLeftLTRB)));return Boolean(explicitSource&&sourceFrameAgreement[i]&&dpiFrameAgreement[i]&&Number.isInteger(normalized.sourceRender.renderDpi)&&normalized.sourceRender.renderDpi>0&&typeof normalized.sourceRender.sourceRenderId==='string'&&normalized.sourceRender.sourceRenderId&&normalized.partId&&normalized.order===i+1&&normalized.role&&normalized.factPointers.every(pointer=>resolveJsonPointer(row,pointer).found)&&cropById.has(normalized.cropId)&&normalized.source.book===normalizedSource.book&&normalized.source.sourcePdfSha256===normalizedSource.sourceSha256&&normalized.source.printedPage>0&&normalized.source.pdfPage>0&&validContextPixelCrop(normalized.crop)&&focusOk&&renderAgreement&&normalized.crop.renderDpi===normalized.sourceRender.renderDpi&&normalized.sourceRender.coordinateSpace===sourceRenderPageCoordinateSpace&&normalized.crop.coordinateSpace===sourcePageGlobalCoordinateSpace&&normalized.crop.cropBoundsPixelsCoordinateSpace===sourcePageGlobalCoordinateSpace&&normalized.crop.sourceRenderSha256===normalized.sourceRender.sourceRenderSha256&&canonical(normalized.crop.sourceRenderDimensionsPx)===canonical(normalized.sourceRender.sourceRenderDimensionsPx));});
 const evidence={schemaVersion:1,fingerprintVersion:monetaryContextPartsFingerprintVersion,status:allResolved?'declared-source-context-parts-linked':'declared-source-context-parts-unassessable',sourceInput:{path:doc.path,sha256:doc.sha256},sourceRecordPointer:record.pointer,sourceFrame:{book:normalizedSource.book,printedPage:normalizedSource.printedPage,pdfPage:normalizedSource.pdfPage,sourcePdfSha256:normalizedSource.sourceSha256,coordinateSpace:'ordered source context parts on source-render page frames'},primaryPartIdByFact:primary||null,declaredLinks:links,sourceContextParts:normalizedParts,crops,supplementalContextCrops};
 rawOrderedContextPartsByRecord.set(record,{row,crops:new Map(parts.filter(part=>typeof part?.contextCropId==='string').map(part=>[part.contextCropId,cropById.get(part.contextCropId)]))});
 record.contextFingerprintVersion=monetaryContextPartsFingerprintVersion;record.contextEvidence=evidence;record.contextEvidenceSha256=monetaryContextEvidenceFingerprint(evidence);
}
function attachUaActiveContextEvidence(record,{doc,row,group}){
 const s=row.sourceRowIdentity||{},e=row.evidence||{},rowSegment=s.segmentId||e.tableSegmentId||null,rawTargets=group?.activeContextTargets,declared=Array.isArray(e.activeContextTargetLinks)?e.activeContextTargetLinks:null;
 const targets=Array.isArray(rawTargets)?rawTargets:[],targetIds=new Set(),targetOrders=new Set(),groupArrayValid=Array.isArray(rawTargets)&&targets.every((target,i)=>target&&typeof target.targetId==='string'&&target.targetId&&!targetIds.has(target.targetId)&&Number.isInteger(target.targetOrder)&&target.targetOrder===i+1&&!targetOrders.has(target.targetOrder)&&(targetIds.add(target.targetId),targetOrders.add(target.targetOrder),true));
 const allGroupTargets=new Map(targets.map(target=>[target?.targetId,target]));
 const legacyProjection={groupId:group?.groupId||record.identity.groupId||null,groupSourcePdfSha256:group?.sourcePdfSha256||null,sourceEvidenceIndex:Array.isArray(group?.sourceEvidenceIndex)?group.sourceEvidenceIndex:[],rowContext:{segmentId:rowSegment,sourcePdfSha256:e.sourcePdfSha256||null,pageImageSha256:e.pageImageSha256||null,tableCropBounds:e.tableCropBounds||null}};
 const links=declared||[],resolved=[];let linksResolve=Boolean(declared)&&groupArrayValid;
 if(declared){
  const seenIds=new Set(),seenOrders=new Set();let previousOrder=0;
  for(const link of declared){
   const target=allGroupTargets.get(link?.targetId),order=link?.targetOrder;
   if(!target||seenIds.has(link.targetId)||!Number.isInteger(order)||order<1||seenOrders.has(order)||order<=previousOrder||target.targetOrder!==order||target.role!==link.role||target.segmentId!==link.segmentId){linksResolve=false;continue;}
   seenIds.add(link.targetId);seenOrders.add(order);previousOrder=order;
   const ownsRow=Array.isArray(target.rowRecordIds)?target.rowRecordIds.includes(row.recordId):Boolean(rowSegment&&target.segmentId===rowSegment);
   if(!ownsRow){linksResolve=false;continue;}
   const source=target.source||{},render=target.sourceRender||{},crop=target.crop||{},pixel=target.pixelReview||{};
   const metadata={sourcePdfSha256:source.sourcePdfSha256||null,sourceRenderSha256:render.sourceRenderSha256||null,sourceRenderDimensionsPx:render.sourceRenderDimensionsPx||null,cropBoundsPdfPagePointsTopLeft:crop.cropBoundsPdfPagePointsTopLeftLTRB||null,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB||null,cropDimensionsPx:crop.cropDimensionsPx||null,cropSha256:crop.cropSha256||null,renderDpi:crop.renderDpi??render.renderDpi??null,coordinateSpace:crop.coordinateSpace||render.coordinateSpace||null,sourceCrop:{...crop},pixelReview:{...pixel}};
   const sourceOk=source.book==='UA'&&Number.isInteger(source.printedPage)&&source.printedPage>0&&Number.isInteger(source.pdfPage)&&source.pdfPage>0&&source.sourcePdfSha256===doc.data.source?.sha256&&render.sourceRenderId&&/^[a-f0-9]{64}$/.test(render.sourceRenderSha256||'')&&positiveIntegerPair(render.sourceRenderDimensionsPx)&&Number.isInteger(render.renderDpi)&&render.renderDpi>0&&metadata.renderDpi===render.renderDpi;
   if(!sourceOk||!validPositiveRect(metadata.cropBoundsPdfPagePointsTopLeft)||!validContextPixelCrop(metadata)){linksResolve=false;}
   resolved.push({cropId:target.targetId,targetOrder:target.targetOrder,role:target.role,segmentId:target.segmentId,source:{...source,book:source.book||null,sourcePdfSha256:source.sourcePdfSha256||null,printedPage:source.printedPage??null,pdfPage:source.pdfPage??null},sourceRender:{...render},metadata,sourcePointers:{groupTargetId:target.targetId},sharedReferenceRecordIds:Array.isArray(target.rowRecordIds)?[...target.rowRecordIds].sort():[]});
  }
 }
 const allResolved=linksResolve&&declared?.length>0&&resolved.length===declared.length&&resolved.every(c=>validContextPixelCrop(c.metadata)&&validPositiveRect(c.metadata.cropBoundsPdfPagePointsTopLeft));
 let activeTargetStatus,status;
 if(!Array.isArray(rawTargets))activeTargetStatus='active-context-target-array-missing';
 else if(!groupArrayValid)activeTargetStatus='active-context-target-array-malformed';
 else if(!declared)activeTargetStatus='active-context-target-links-missing';
 else if(declared.length===0)activeTargetStatus='no-active-context-target-links';
 else if(!allResolved)activeTargetStatus='active-context-target-link-unresolved-or-invalid';
 else activeTargetStatus='declared-active-context-targets-linked';
 if(activeTargetStatus==='active-context-target-array-missing'&&!declared)status='legacy-declared-context-metadata;active-targets-unassessed';
 else status=activeTargetStatus;
 record.contextFingerprintVersion=uaContextFingerprintVersion;
 record.contextEvidence={schemaVersion:2,fingerprintVersion:uaContextFingerprintVersion,status,activeTargetStatus,sourceInput:{path:doc.path,sha256:doc.sha256},sourceRecordPointer:record.pointer,sourceFrame:{book:'UA',printedPage:record.source.printedPage,pdfPage:record.source.pdfPage,sourcePdfSha256:record.source.sourceSha256,coordinateSpace:'active target crop-local rendered pixels plus source PDF page points'},legacyProjection,declaredLinks:links.map(link=>({...link})),crops:resolved};
 record.contextEvidenceSha256=monetaryContextEvidenceFingerprint(record.contextEvidence);
 const focus=e.rowHighlightBounds?.pdfPagePoints,primaryRoles=new Set(['primary-table-context','primary-source-passage-context']),primaryTargets=resolved.filter(target=>primaryRoles.has(target.role));
 let containmentStatus='legacy-active-targets-unassessed',selectedTarget=null;
 if(Array.isArray(rawTargets)){
  if(!allResolved)containmentStatus='active-context-targets-unassessable';
  else if(!finiteRect(focus)||!validPositiveRect(focus))containmentStatus='primary-focus-source-points-missing';
  else if(primaryTargets.length===0)containmentStatus='linked-primary-focus-target-missing';
  else if(primaryTargets.length!==1)containmentStatus='multiple-linked-primary-focus-targets';
  else{
   selectedTarget=primaryTargets[0];const bounds=selectedTarget.metadata.cropBoundsPdfPagePointsTopLeft,source=selectedTarget.source;
   if(source.pdfPage!==record.source.pdfPage||source.printedPage!==record.source.printedPage||source.sourcePdfSha256!==record.source.sourceSha256)containmentStatus='linked-primary-focus-target-frame-mismatch';
   else if(focus[0]>=bounds[0]&&focus[1]>=bounds[1]&&focus[2]<=bounds[2]&&focus[3]<=bounds[3])containmentStatus='row-focus-contained-in-primary-context-window';
   else containmentStatus='row-focus-exceeds-primary-context-window';
  }
 }
 record.uaPrimaryContextContainment={scope:'geometric-only comparison of rowHighlightBounds.pdfPagePoints with the single linked primary table/passage crop bounds; this does not establish source-pixel or semantic correctness',focusBoundsPdfPagePoints:finiteRect(focus)?[...focus]:null,primaryTargetIds:primaryTargets.map(target=>target.cropId),selectedPrimaryTargetId:selectedTarget?.cropId||null,status:containmentStatus};
}
function uaActiveContextTargetInventory(ua){
 const rows=ua.data.rowRecords||[],groups=ua.data.groupReviews||[],rowsByGroup=new Map();
 for(const row of rows){const groupId=String(row.recordId).match(/^(ua-other-\d+)/)?.[1]||null;if(!rowsByGroup.has(groupId))rowsByGroup.set(groupId,[]);rowsByGroup.get(groupId).push(row);}
 const groupResults=groups.map(group=>{
  const groupRows=rowsByGroup.get(group.groupId)||[],raw=group.activeContextTargets,targets=Array.isArray(raw)?raw:[],seenIds=new Set(),seenOrders=new Set();
  const knownTargetIds=new Set(targets.map(target=>target?.targetId).filter(id=>typeof id==='string'&&id)),rowLinksWithoutTarget=[];
  for(const row of groupRows){const rowLinks=row.evidence?.activeContextTargetLinks;if(!Array.isArray(rowLinks))continue;for(const link of rowLinks)if(!knownTargetIds.has(link?.targetId))rowLinksWithoutTarget.push({recordId:row.recordId,link:{...link},status:'row-link-target-definition-missing'});}
  const targetEntries=targets.map((target,index)=>{
   const duplicateId=seenIds.has(target?.targetId),duplicateOrder=seenOrders.has(target?.targetOrder);if(target?.targetId)seenIds.add(target.targetId);if(Number.isInteger(target?.targetOrder))seenOrders.add(target.targetOrder);
   const links=[];
   for(const row of groupRows){const rowLinks=row.evidence?.activeContextTargetLinks;if(!Array.isArray(rowLinks))continue;for(const link of rowLinks)if(link?.targetId===target?.targetId)links.push({recordId:row.recordId,segmentId:row.sourceRowIdentity?.segmentId||row.evidence?.tableSegmentId||null,link:{...link}});}
   const orderOk=Number.isInteger(target?.targetOrder)&&target.targetOrder===index+1,shapeOk=Boolean(target&&typeof target.targetId==='string'&&target.targetId&&typeof target.role==='string'&&typeof target.segmentId==='string');
   const joins=links.map(ref=>{const link=ref.link,owns=Array.isArray(target.rowRecordIds)?target.rowRecordIds.includes(ref.recordId):Boolean(ref.segmentId&&ref.segmentId===target.segmentId);return {recordId:ref.recordId,valid:Boolean(owns&&link.targetOrder===target.targetOrder&&link.role===target.role&&link.segmentId===target.segmentId),declaredOrder:link.targetOrder??null,declaredRole:link.role||null,declaredSegmentId:link.segmentId||null};});
   const declaredOwners=Array.isArray(target?.rowRecordIds)?target.rowRecordIds:[],ownerMismatch=Array.isArray(target?.rowRecordIds)&&(new Set(declaredOwners).size!==declaredOwners.length||declaredOwners.some(id=>!groupRows.some(row=>row.recordId===id))||declaredOwners.length!==new Set(links.map(link=>link.recordId)).size||declaredOwners.some(id=>!links.some(link=>link.recordId===id)));
   let status=!shapeOk?'malformed-target-definition':duplicateId?'duplicate-target-id':duplicateOrder?'duplicate-target-order':!orderOk?'target-order-invalid':!links.length?'unreferenced-active-target':ownerMismatch?'row-target-owner-list-mismatch':joins.some(join=>!join.valid)?'row-target-join-mismatch':'declared-target-row-joins-recorded';
   return {groupId:group.groupId,targetIndex:index,targetId:target?.targetId??null,targetOrder:target?.targetOrder??null,role:target?.role??null,segmentId:target?.segmentId??null,source:target?.source||null,sourceRender:target?.sourceRender||null,crop:target?.crop||null,pixelReview:target?.pixelReview||null,rowRecordIds:Array.isArray(target?.rowRecordIds)?target.rowRecordIds:[],rowLinks:joins,ownerListStatus:ownerMismatch?'declared-owner-links-incomplete':'owners-match-row-links',status};
  });
  const status=!Array.isArray(raw)?'active-context-target-array-missing':targetEntries.some(t=>!['declared-target-row-joins-recorded','unreferenced-active-target'].includes(t.status))?'active-context-target-array-malformed':targetEntries.length?'declared-active-context-target-array':'empty-active-context-target-array';
  const rowsWithLinks=groupRows.filter(row=>Array.isArray(row.evidence?.activeContextTargetLinks)),rowsWithoutLinks=groupRows.filter(row=>!Array.isArray(row.evidence?.activeContextTargetLinks)||!row.evidence.activeContextTargetLinks.length).map(row=>({recordId:row.recordId,status:Array.isArray(row.evidence?.activeContextTargetLinks)?'explicitly-empty-target-links':'active-context-target-links-missing'}));
  return {groupId:group.groupId,status,groupRowRecords:groupRows.length,rowsWithActiveTargetArray:rowsWithLinks.length,rowsWithoutActiveTargetLinks:rowsWithoutLinks,targetDefinitions:targetEntries.length,targets:targetEntries,rowLinksWithoutTarget};
 });
 const all=groupResults.flatMap(g=>g.targets),countStatuses=rows=>rows.reduce((out,row)=>(out[row.status]=(out[row.status]||0)+1,out),{});
 return {schemaVersion:1,scope:'Every activeContextTargets definition in every UA group review, plus exact row-link joins observed in rowRecords. Definitions without row joins remain explicit; this is structural inventory, not source-pixel review.',groups:groupResults,counts:{groups:groups.length,groupsByStatus:countStatuses(groupResults),targetDefinitions:all.length,targetDefinitionsByStatus:countStatuses(all),rowJoins:all.reduce((n,target)=>n+target.rowLinks.length,0),rowLinksWithoutTargetDefinitions:groupResults.reduce((n,group)=>n+group.rowLinksWithoutTarget.length,0),rowsWithoutActiveTargetLinks:groupResults.reduce((n,group)=>n+group.rowsWithoutActiveTargetLinks.length,0),malformedOrUnreferenced:all.filter(target=>!['declared-target-row-joins-recorded'].includes(target.status)).length}};
}
function sourceFrame(source,space,extra=''){
 if(space==='pdf-page-points'||space==='source-page-normalized')return source.sourceSha256&&source.book&&Number.isInteger(source.pdfPage)?`${source.sourceSha256}|${source.book}|pdf:${source.pdfPage}|${space}`:null;
 return extra?`${source.sourceSha256||'unknown-source'}|${source.book||'unknown-book'}|pdf:${source.pdfPage??'unknown-page'}|${space}|${extra}`:null;
}
function geometry(record,{path,rect,format='ltrb',space='pdf-page-points',role='row-focus',source=record.source,frame='',derivation=null,status='recorded-unverified'}){
 if(!finiteRect(rect))return;
 const bounds=format==='xywh'?rectXYWH(rect):[...rect];
 const value={path,role,space,format:'ltrb',bounds,source,frame:sourceFrame(source,space,frame),derivation,status};
 value.geometrySha256=hash({space,bounds,source,frame:value.frame,role});
 value.validShape=bounds[2]>bounds[0]&&bounds[3]>bounds[1];
 record.geometry.push(value);
}
function annotationInventory(raw){
 const selected={};
 function visit(value,path=''){
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){
   const p=pathJoin(path,key);
   if(/footnote|marker|qualifier|condition|variant|quantity|unit|exclusion/i.test(key)&&!/(?:sha256|coordinate|image|hash)/i.test(key))selected[p]=child;
   if(child&&typeof child==='object')visit(child,p);
  }
 }
 visit(raw);return selected;
}
function sourceValueSha256ByPointer(raw){
 const out={},relevant=/(?:typedValue|quantityOrScale|conditions?|qualifier|amount|currency|unit|rate|value|price|purpose|scale|formula|derivation|adjustment|qualification|discount|outcome|success|valueOrigin)/i;
 function visit(value,path=''){
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)visit(value[i],`${path}/${i}`);return;}
  if(value&&typeof value==='object'){for(const [key,child]of Object.entries(value))visit(child,`${path}/${escapePointer(key)}`);return;}
  const top=path.split('/')[1]||'';if(path&&relevant.test(top))out[path]=hash(value);
 }
 visit(raw);return out;
}
function baseRecord(doc,surface,pointer,id,label,raw,{source={},group=null,ordinal=null,diceRoll=null,kind='row-or-passage-unclassified',notApplicable=null,sourceRowIds=[]}={}){
 const identity={label:label??null,group,ordinal,diceRoll,variant:raw.variant??raw.variantConditions??raw.additionalVariantQualifier??null,kind,sourceRowIds};
 const record={uid:`${surface}:${id}`,surface,id,input:doc.path,inputSha256:doc.sha256,inputStage:doc.stage,pointer,recordSha256:hash(raw),sourceValueSha256ByPointer:sourceValueSha256ByPointer(raw),label:label??null,source:sourceIdentity(source),identity,identityStatus:'recorded-unverified',notApplicable,geometry:[],annotations:annotationInventory(raw),unhandledGeometry:[]};rawSourceRecordByAuditRecord.set(record,raw);
 record.rowIdentitySha256=hash({source:record.source,identity});return record;
}
function addCatalogHighlights(record,raw,path=''){
 const crops=raw.cropCoordinates||[];
 for(const [i,crop]of crops.entries())geometry(record,{path:`${path}/cropCoordinates/${i}/rect`,rect:crop.rect,format:crop.format==='xywh'?'xywh':'ltrb',role:'context-crop',space:crop.coordinateSpace==='catalog-bounds-pdf-points-as-recorded'?'pdf-page-points':'unclassified-recorded-crop'});
 for(const [i,highlight]of (raw.highlightCoordinates||[]).entries()){
  const crop=crops.find(c=>c.regionId===highlight.regionId),bounds=crop?.rect;
  const image=raw.regionEvidence?.find(e=>e.regionId===highlight.regionId)?.imageSha256||raw.expectedRegionEvidence?.find(e=>e.regionId===highlight.regionId)?.imageSha256;
  for(const [j,rect]of (highlight.rects||[]).entries()){
   const p=`${path}/highlightCoordinates/${i}/rects/${j}`;
   geometry(record,{path:p,rect,format:'xywh',space:'excerpt-image-normalized',frame:image||'',role:'catalog-highlight'});
   if(finiteRect(bounds)&&crop.format==='x0-y0-x1-y1'&&finiteRect(rect))geometry(record,{path:p,rect:[bounds[0]+rect[0]*(bounds[2]-bounds[0]),bounds[1]+rect[1]*(bounds[3]-bounds[1]),bounds[0]+(rect[0]+rect[2])*(bounds[2]-bounds[0]),bounds[1]+(rect[1]+rect[3])*(bounds[3]-bounds[1])],role:'catalog-highlight',derivation:{kind:'recorded-crop-plus-normalized-focus',cropPath:`${path}/cropCoordinates/${crops.indexOf(crop)}`,cropBounds:bounds}});
  }
 }
}
function passageGeometry(record,passages,path){
 for(const [i,passage]of passages.entries()){
  const source=sourceIdentity(passage.source,record.source),e=passage.evidence||{};
  geometry(record,{path:`${path}/${i}/evidence/contextCropBoundsPdfPagePointsTopLeft`,rect:e.contextCropBoundsPdfPagePointsTopLeft,role:'context-crop',source});
  for(const [j,h]of (e.highlightRectanglesPdfPagePointsTopLeft||[]).entries())geometry(record,{path:`${path}/${i}/evidence/highlightRectanglesPdfPagePointsTopLeft/${j}/bounds`,rect:h.bounds,role:'passage-focus',source,status:e.pixelReview?.independentGeometryReview||'recorded-unverified'});
 }
}
function censusGeometry(record,raw,prefix=''){
 const pages=raw.sourcePages&&Array.isArray(raw.sourcePages)?raw.sourcePages:[raw.source||{}];
 for(const [i,page]of pages.entries()){
  const source=sourceIdentity(page,record.source),bounds=page.sourcePageBounds||page.bounds;
  const parent=Array.isArray(raw.sourcePages)?`${prefix}/sourcePages/${i}`:`${prefix}/source`;
  for(const [j,r]of (bounds?.rects||[]).entries())geometry(record,{path:`${parent}/sourcePageBounds/rects/${j}`,rect:r,source,role:'passage-locator',status:bounds.status});
  geometry(record,{path:`${parent}/bounds/normalizedPageBounds`,rect:bounds?.normalizedPageBounds,format:'xywh',space:'source-page-normalized',source,role:'page-context',status:bounds?.status});
 }
}
function findUnhandledGeometry(record,raw){
 const handled=new Set(record.geometry.map(g=>g.path));
 function visit(value,path=''){
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){
   const p=pathJoin(path,key);
   if(finiteRect(child)&&/(?:bound|rect|focus)/i.test(p)&&!handled.has(p)&&!/(?:range|amounts|sourceText)/i.test(p))record.unhandledGeometry.push({path:p,bounds:child,status:'not-normalized-requires-adapter-or-source-review'});
   else if(child&&typeof child==='object')visit(child,p);
  }
 }
 visit(raw);
}

// Explicit adapters retain each source surface and JSON pointer. Repeated table
// occurrences and pointer links are not silently collapsed into source rows.
export function collectMonetaryRowIdentityRecords(documents){
 const docs=documents instanceof Map?documents:new Map(Object.entries(documents));
 for(const config of monetaryRowIdentityInputs)if(!docs.has(config.key))throw Error(`Missing monetary row-identity input: ${config.key}`);
 const records=[],adapterCounts={},finish=(record,raw)=>{findUnhandledGeometry(record,raw);records.push(record);adapterCounts[record.surface]=(adapterCounts[record.surface]||0)+1;};
 const canonicalDoc=docs.get('canonical'),canonicalData=canonicalDoc.data;
 for(const [i,inventory]of canonicalData.sourceInventories.entries())for(const [j,row]of inventory.sourceRows.entries()){
  const r=baseRecord(canonicalDoc,'canonical-source-row',`/sourceInventories/${i}/sourceRows/${j}`,row.id,row.sourceObject,row,{source:row.source,group:inventory.id,ordinal:row.sourceRecordIndex,kind:row.sourceCategory,sourceRowIds:[row.id]});
  geometry(r,{path:'/sourceRowCoordinates/rect',rect:row.sourceRowCoordinates?.rect,format:'xywh',space:'source-page-normalized',role:'row-locator',status:row.sourceRowCoordinates?.status});
  geometry(r,{path:'/sourceRecord/normalizedPageRect',rect:row.sourceRecord?.normalizedPageRect,format:'xywh',space:'source-page-normalized',role:'recorded-source-locator'});
  geometry(r,{path:'/sourceRecord/source/normalizedPageBounds',rect:row.sourceRecord?.source?.normalizedPageBounds,format:'xywh',space:'source-page-normalized',role:'recorded-source-locator'});
  addCatalogHighlights(r,row);finish(r,row);
 }
 for(const [i,claim]of canonicalData.siteClaims.entries()){
  const r=baseRecord(canonicalDoc,'site-price-claim',`/siteClaims/${i}`,claim.itemId,claim.name,claim,{source:claim.printedPrice,kind:claim.claimType,sourceRowIds:claim.sourceRowIds||[],notApplicable:claim.printedPrice?null:'Canonical null price: no printed-price row is asserted.'});
  for(const [j,binding]of (claim.evidenceBindings||[]).entries()){
   const proxy={...r,source:sourceIdentity(binding,r.source),geometry:[]};addCatalogHighlights(proxy,binding,`/evidenceBindings/${j}`);r.geometry.push(...proxy.geometry);
  }
  for(const [j,binding]of (claim.estimate?.comparatorEvidenceBindings||[]).entries()){
   const proxy={...r,source:sourceIdentity(binding,r.source),geometry:[]};addCatalogHighlights(proxy,binding,`/estimate/comparatorEvidenceBindings/${j}`);r.geometry.push(...proxy.geometry.map(g=>{const value={...g,role:'editorial-comparator-context'};value.geometrySha256=hash({space:value.space,bounds:value.bounds,source:value.source,frame:value.frame,role:value.role});return value;}));
  }
  finish(r,claim);
 }
 const ua=docs.get('ua');
 const uaGroups=new Map((ua.data.groupReviews||[]).map(group=>[group.groupId,group]));
 for(const [i,row]of ua.data.rowRecords.entries()){
  const s=row.sourceRowIdentity||{},e=row.evidence||{},group=String(row.recordId).match(/^(ua-other-\d+)/)?.[1]||null;
  const r=baseRecord(ua,'ua-supplement-row',`/rowRecords/${i}`,row.recordId,s.rowLabel||row.object,row,{source:{...s,book:'UA',sourceSha256:e.sourcePdfSha256||ua.data.source.sha256},group:s.table||group,ordinal:s.rowIndexWithinGroup,diceRoll:s.diceRoll??null,kind:row.classification});
  r.identity.segment=s.segmentId||e.tableSegmentId||null;r.identity.groupId=group;r.rowIdentitySha256=hash({source:r.source,identity:r.identity});
  attachUaActiveContextEvidence(r,{doc:ua,row,group:uaGroups.get(group)});
  geometry(r,{path:'/evidence/rowHighlightBounds/pdfPagePoints',rect:e.rowHighlightBounds?.pdfPagePoints,role:'row-focus',status:e.rowHighlightBounds?.status});
  geometry(r,{path:'/evidence/rowHighlightBounds/renderedPagePixels',rect:e.rowHighlightBounds?.renderedPagePixels,space:'rendered-page-pixels',frame:e.pageImageSha256,role:'row-focus',status:e.rowHighlightBounds?.status});
  geometry(r,{path:'/evidence/tableCropBounds/pdfPagePoints',rect:e.tableCropBounds?.pdfPagePoints,role:'context-crop'});
  geometry(r,{path:'/evidence/tableCropBounds/renderedPagePixels',rect:e.tableCropBounds?.renderedPagePixels,space:'rendered-page-pixels',frame:e.pageImageSha256,role:'context-crop'});finish(r,row);
 }
 const pd=docs.get('phbDmg'),pdCrops=pd.data.review.evidenceCrops,cropById=new Map(pdCrops.map(c=>[c.cropId,c])),cropIndexById=new Map(pdCrops.map((c,i)=>[c.cropId,i])),cropRefsById=new Map();
 const addCropRef=(cropId,ref)=>{if(!cropId)return;if(!cropRefsById.has(cropId))cropRefsById.set(cropId,[]);cropRefsById.get(cropId).push(ref);};
 for(const [i,row]of pd.data.review.sourceRowsOrClaims.entries())for(const cropId of new Set([row.contextCropId,row.focus?.contextCropId,...(Array.isArray(row.sourceContextParts)?row.sourceContextParts.map(part=>part?.contextCropId):[])].filter(Boolean)))addCropRef(cropId,{uid:`phb-dmg-supplement-row:${row.sourceRowOrClaimId}`,recordId:row.sourceRowOrClaimId,pointer:`/review/sourceRowsOrClaims/${i}`});
 for(const [i,row]of (pd.data.additionalReferenceSheetReview?.rowComparisons||[]).entries())addCropRef(row.p123ContextCropId,{uid:`phb-reference-row-comparison:phb123-comparison-${i}`,recordId:`phb123-comparison-${i}`,pointer:`/additionalReferenceSheetReview/rowComparisons/${i}`});
 for(const [i,row]of pd.data.review.sourceRowsOrClaims.entries()){
  const r=baseRecord(pd,'phb-dmg-supplement-row',`/review/sourceRowsOrClaims/${i}`,row.sourceRowOrClaimId,row.objectOrSubject,row,{source:row.source,group:row.groupId,ordinal:row.sourceRowOrClaimId.match(/(?:row|r)-(\d+)$/)?.[1]??null,kind:row.sourceKind});
  const contextLinks=[['contextCropId',row.contextCropId],['focus.contextCropId',row.focus?.contextCropId]].filter(([,cropId])=>cropId!==undefined).map(([field,cropId])=>({field,cropId:cropId??null}));
  if(Object.hasOwn(row,'sourceContextParts'))attachOrderedSourceContextParts(r,{doc:pd,row,cropById,cropIndexById,cropRefsById});
  else attachDeclaredContextEvidence(r,{doc:pd,cropById,cropIndexById,cropRefsById,links:contextLinks,source:row.source});
  const focus=row.focus||{},single=Object.hasOwn(focus,'focusBoundsCropPixelsLTRB'),multi=Object.hasOwn(focus,'focusRectsCropPixelsLTRB');
  if(single&&multi)throw Error(`Ambiguous single and multiple monetary focus declarations: ${row.sourceRowOrClaimId}`);
  if(single&&!finiteRect(focus.focusBoundsCropPixelsLTRB))throw Error(`Invalid single monetary focus: ${row.sourceRowOrClaimId}`);
  if(multi&&(!Array.isArray(focus.focusRectsCropPixelsLTRB)||focus.focusRectsCropPixelsLTRB.length<2||focus.focusRectsCropPixelsLTRB.some(r=>!finiteRect(r)||r[2]<=r[0]||r[3]<=r[1])))throw Error(`Invalid multiple monetary foci: ${row.sourceRowOrClaimId}`);
  if(focus.contextCropId&&row.contextCropId&&focus.contextCropId!==row.contextCropId)throw Error(`Conflicting monetary context crop IDs: ${row.sourceRowOrClaimId}`);
  const crop=cropById.get(focus.contextCropId||row.contextCropId),foci=multi?focus.focusRectsCropPixelsLTRB:single?[focus.focusBoundsCropPixelsLTRB]:[];
  if(multi){if(!crop||!Array.isArray(crop.cropDimensionsPx))throw Error(`Missing monetary multi-focus crop metadata: ${row.sourceRowOrClaimId}`);for(const [i,a]of foci.entries()){if(a[0]<0||a[1]<0||a[2]>crop.cropDimensionsPx[0]||a[3]>crop.cropDimensionsPx[1])throw Error(`Monetary multi-focus outside crop: ${row.sourceRowOrClaimId}`);for(const b of foci.slice(i+1))if(Math.min(a[2],b[2])>Math.max(a[0],b[0])&&Math.min(a[3],b[3])>Math.max(a[1],b[1]))throw Error(`Overlapping monetary multi-focus rectangles: ${row.sourceRowOrClaimId}`);}}
  for(const [j,f]of foci.entries()){
   const path=multi?`/focus/focusRectsCropPixelsLTRB/${j}`:'/focus/focusBoundsCropPixelsLTRB';
   geometry(r,{path,rect:f,space:'crop-local-pixels',frame:crop?.cropSha256||row.contextCropId,role:'row-or-passage-focus',status:focus.status,derivation:{kind:'crop-local-focus',contextCropId:focus.contextCropId||row.contextCropId||null}});
   if(finiteRect(crop?.cropBoundsPixelsLTRB))geometry(r,{path,rect:[f[0]+crop.cropBoundsPixelsLTRB[0],f[1]+crop.cropBoundsPixelsLTRB[1],f[2]+crop.cropBoundsPixelsLTRB[0],f[3]+crop.cropBoundsPixelsLTRB[1]],space:'rendered-page-pixels',frame:crop.sourceRenderSha256,role:'row-or-passage-focus',derivation:{kind:'crop-local-plus-recorded-source-render-offset',cropId:crop.cropId,contextCropId:crop.cropId,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx,renderDpi:coordinateSpaceDpi(focus.coordinateSpace)}});
  }
  finish(r,row);
 }
 const reference=pd.data.additionalReferenceSheetReview;
 for(const [i,row]of (reference?.rowComparisons||[]).entries()){
  const source={book:'PHB',printedPage:row.p123PrintedPage,pdfPage:row.p123PdfPage,sourceSha256:row.p123SourceFileSha256},r=baseRecord(pd,'phb-reference-row-comparison',`/additionalReferenceSheetReview/rowComparisons/${i}`,`phb123-comparison-${i}`,row.existingSourceObject,row,{source,group:row.section,ordinal:row.inventorySourceRowIndex,kind:'repeated-source-table-row',sourceRowIds:[]});r.contextOnlyLocator=row.p123ContextCropId;
  attachDeclaredContextEvidence(r,{doc:pd,cropById,cropIndexById,cropRefsById,links:[{field:'p123ContextCropId',cropId:row.p123ContextCropId??null}],source});finish(r,row);
 }
 for(const [kind,rows]of Object.entries(reference?.separateExcludedMoneyContent||{}))if(Array.isArray(rows))for(const [i,row]of rows.entries()){
  const r=baseRecord(pd,'reference-financial-context',`/additionalReferenceSheetReview/separateExcludedMoneyContent/${kind}/${i}`,`${kind}-${i}`,row.class||`${row.from?.currency||kind} conversion`,row,{source:reference.source,group:kind,ordinal:i,kind:'financial-context-excluded-from-purchase-row-count'});finish(r,row);
 }
 const passages=docs.get('passages');
 for(const [i,row]of passages.data.records.entries()){
  const r=baseRecord(passages,'typed-passage',`/records/${i}`,row.recordId,row.sourceObjectOrPassage,row,{source:row.source,group:row.receiptId,kind:row.claimType,sourceRowIds:row.relatedSourceRowIds||[]});passageGeometry(r,row.sourcePassages||[],'/sourcePassages');finish(r,row);
  for(const [j,comparison]of (row.duplicateRowComparisons||[]).entries()){
   const c=baseRecord(passages,'passage-row-comparison',`/records/${i}/duplicateRowComparisons/${j}`,`${row.recordId}-${j}`,comparison.itemOrOccupation,comparison,{source:row.source,group:comparison.removableSheetTable,ordinal:j,kind:'repeated-source-table-row',sourceRowIds:[]});c.relatedOriginalSourceRowId=comparison.originalTypedSourceRowId;c.parentContextRecord=r.uid;finish(c,comparison);
  }
 }
 const descriptions=docs.get('descriptions');
 for(const [i,row]of descriptions.data.newSourceDescriptionRecords.entries()){
  const r=baseRecord(descriptions,'typed-description',`/newSourceDescriptionRecords/${i}`,row.recordId,row.sourceObject,row,{source:row.source,group:row.source.sourcePassageIdentity,kind:row.classification});
  const context=row.source.evidence?.contextCrop||{},pageHash=context.pageImageSha256At150Dpi;
  geometry(r,{path:'/source/evidence/contextCrop/pdfPagePointsTopLeft',rect:context.pdfPagePointsTopLeft,role:'context-crop'});
  geometry(r,{path:'/source/evidence/contextCrop/renderedPagePixels150DpiTopLeft',rect:context.renderedPagePixels150DpiTopLeft,space:'rendered-page-pixels',frame:pageHash,role:'context-crop'});
  for(const [j,h]of (row.source.evidence?.highlight?.rectangles||[]).entries()){
   geometry(r,{path:`/source/evidence/highlight/rectangles/${j}/pdfPagePointsTopLeft`,rect:h.pdfPagePointsTopLeft,role:'passage-focus'});
   geometry(r,{path:`/source/evidence/highlight/rectangles/${j}/renderedPagePixels150DpiTopLeft`,rect:h.renderedPagePixels150DpiTopLeft,space:'rendered-page-pixels',frame:pageHash,role:'passage-focus'});
   geometry(r,{path:`/source/evidence/highlight/rectangles/${j}/cropLocalNormalizedTopLeft`,rect:h.cropLocalNormalizedTopLeft,space:'crop-local-normalized',frame:pageHash&&context.pdfPagePointsTopLeft?hash([pageHash,context.pdfPagePointsTopLeft]):'',role:'passage-focus'});
  }
  finish(r,row);
  for(const [j,variant]of (row.variantConditions?.rows||[]).entries()){
   const v=baseRecord(descriptions,'description-variant-row',`/newSourceDescriptionRecords/${i}/variantConditions/rows/${j}`,`${row.recordId}-variant-${j}`,`${row.sourceObject}: ${variant.roll}`,variant,{source:row.source,group:row.variantConditions.bonusTableIdentity,ordinal:j+1,diceRoll:variant.roll,kind:'nonmonetary-variant-table-supporting-formula'});v.parentContextRecord=r.uid;finish(v,variant);
  }
 }
 for(const [i,row]of descriptions.data.pointerResolutionLinks.entries()){
  const r=baseRecord(descriptions,'description-pointer-link',`/pointerResolutionLinks/${i}`,row.pointerClaimId,row.pointerRecordId,row,{source:row.sourceTableIdentity,group:row.sourceTableIdentity?.table,ordinal:row.sourceTableIdentity?.rowIndexWithinGroup,diceRoll:row.sourceTableIdentity?.diceRoll,kind:'reference-link',notApplicable:'Link projection has no separate physical highlight; table occurrence and linked description records are inventoried separately.'});r.links={sourceOccurrenceId:row.sourceOccurrenceId,descriptionSourceRecordIds:row.descriptionSourceRecordIds||[]};finish(r,row);
 }
 const receipts=docs.get('receipts'),receiptByPointer=new Map(),receiptIds=new Set(),usedReceiptPointers=new Set();
 for(const receipt of receipts.data.claimReceipts){
  if(typeof receipt.receiptId!=='string'||!receipt.receiptId||receiptIds.has(receipt.receiptId))throw Error('Duplicate or missing monetary census receipt ID');
  receiptIds.add(receipt.receiptId);const key=`${receipt.sourceCensusArtifact}#${receipt.sourceJsonPointer}`;
  if(receiptByPointer.has(key))throw Error(`Duplicate monetary census receipt target: ${key}`);receiptByPointer.set(key,receipt);
 }
 for(const key of ['phbDmgCensus','uaCensus','monsterCensus']){
  const doc=docs.get(key),collection=doc.data.records?'records':'claims';
  for(const [i,row]of doc.data[collection].entries()){
   const pointer=`/${collection}/${i}`,receipt=receiptByPointer.get(`${doc.path}#${pointer}`),s=Array.isArray(row.sourcePages)?row.sourcePages[0]:row.source||row.sourcePages||{};
   if(!receipt)throw Error(`Missing exact monetary census receipt: ${doc.path}#${pointer}`);usedReceiptPointers.add(`${doc.path}#${pointer}`);
   const r=baseRecord(doc,'source-census-claim',pointer,row.id||receipt?.receiptId||`${key}-${i}`,row.sourceObjectOrPassage||row.sourceObject,row,{source:{...s,book:s.bookKey||s.book||row.bookKey||row.book},group:row.passageIdentity||row.sourcePassage||null,kind:row.claimType});censusGeometry(r,row);r.receiptJoin=receipt?{receiptId:receipt.receiptId,receiptStatus:receipt.receiptStatus,sourcePassageIdentity:receipt.sourcePassageIdentity,linkedTypedSourceRecords:receipt.linkedTypedSourceRecords||[]}:null;finish(r,row);
  }
 }
 if(usedReceiptPointers.size!==receiptByPointer.size)throw Error('Monetary census receipts include an unmatched source target');
 for(const [i,issue]of (receipts.data.censusAdjacentUnresolvedAndExclusions||[]).entries()){
  const raw=issue.record||issue,r=baseRecord(receipts,'census-adjacent-review-issue',`/censusAdjacentUnresolvedAndExclusions/${i}`,`${issue.sourceInventory}-${i}`,raw.sourceObjectOrPassage||raw.sourceObject||issue.kind,issue,{source:raw.source||{},group:issue.kind,kind:'unresolved-or-excluded-context'});censusGeometry(r,raw,issue.record?'/record':'');finish(r,issue);
 }
 const coverage={adapters:adapterCounts,canonicalCensusClaims:canonicalData.sourcePageCensuses.reduce((n,c)=>n+c.claims.length,0),rawCensusClaims:adapterCounts['source-census-claim']||0,receiptClaims:receipts.data.claimReceipts.length,printedSitePrices:canonicalData.siteClaims.filter(r=>r.printedPrice!=null).length,canonicalSitePriceGaps:canonicalData.siteClaims.filter(r=>r.printedPrice==null).length};
 if(coverage.canonicalCensusClaims!==coverage.rawCensusClaims||coverage.receiptClaims!==coverage.rawCensusClaims)throw Error('Monetary census/receipt denominator differs; reconcile explicit inputs before auditing');
 return {records,coverage,uaActiveContextTargetInventory:uaActiveContextTargetInventory(ua)};
}

const focusRoles=new Set(['row-focus','row-or-passage-focus','passage-focus','catalog-highlight','source-context-part-focus','row-locator','passage-locator']);
const actualFocusRoles=new Set(['row-focus','row-or-passage-focus','passage-focus','catalog-highlight','source-context-part-focus']);
const locatorRoles=new Set(['row-locator','passage-locator']);
const contextRoles=new Set(['context-crop','page-context','editorial-comparator-context']);
const contextFindingKinds=new Set(['source-note-context-defect','source-context-crop-defect']);
const knownFindingKinds=new Set(['duplicate-wrong-row-focus','wrong-row-focus-independent-source-review','missing-source-marker','source-marker-association-mismatch','source-note-context-defect','source-context-crop-defect','typed-content-mismatch','unresolved-source-scope','source-provenance-metadata-mismatch']);
const allowedLegacyUaContextMigrationFindingIds=new Set(['ua-misc-note-context-ua-other-005-E2-r063','ua-misc-note-context-ua-other-005-E3-cont-r089','ua-misc-note-context-ua-other-005-E3-cont-r090','ua-misc-note-context-ua-other-005-E4-main-r120','ua-misc-note-context-ua-other-005-E4-main-r121']);
const uaContextMigrationAdapterDependencies=[
 {path:'tools/monetary-source-render-frames.mjs',sha256:'44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39'},
 {path:'research/monetary-source-render-frames.json',sha256:'29e0ee3ae3cdaf304b67ca99fe7c51a391e7a1b44b63f12aa9258ce02fed3af7'},
 {path:'research/source-audit-batch5-pd179-v5-fresh-frame-replay-independent-review.json',sha256:'931ecd38e8dc2660e200e1d4fb5a8f8e3721801e5d4f67020aaee329da8e9106'},
 {path:'research/source-audit-batch5-pd179-v5-crop-frame-bindings-independent-review.json',sha256:'e04274a0aa8e04ee0a09962c24ed2290c6e3e5e5d92ef79aad38caf625147eee'},
];
function validateUaContextMigrationBridge({bridge,bridgeBytes,bridgeRef,findingManifest,repoRoot,knownFindings}){
 const fail=message=>{throw Error(`Invalid UA context migration bridge: ${message}`);};
 if(!bridgeRef||typeof bridgeRef.path!=='string'||typeof bridgeRef.sha256!=='string'||hash(bridgeBytes)!==bridgeRef.sha256)fail('manifest bridge hash mismatch');
 if(bridge.schemaVersion!==2||bridge.artifactType!=='ua-legacy-context-to-active-target-migration-bridge-v2'||!Array.isArray(bridge.migrations))fail('unsupported schema');
 const originalPath='research/source-audit-batch5-ua-additional-prices.json',originalSha='8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a';
 if(bridge.originalSourceInput?.path!==originalPath||bridge.originalSourceInput?.sha256!==originalSha)fail('original UA source identity mismatch');
 const archive=bridge.originalSourceArchive;if(archive?.path!=='tests/fixtures/monetary-source-ua-583-before.json.gz')fail('original UA archive path mismatch');
 const archiveBytes=readFileSync(resolve(repoRoot,archive.path));if(hash(archiveBytes)!==archive.sha256||hash(gunzipSync(archiveBytes))!==archive.uncompressedSha256||archive.uncompressedSha256!==originalSha)fail('original UA archive hash mismatch');
 const adapter=bridge.sourceAdapter;if(adapter?.path!=='tools/monetary-row-identity-audit.mjs'||hash(readFileSync(resolve(repoRoot,adapter.path)))!==adapter.sha256)fail('source adapter hash mismatch');
 if(!Array.isArray(adapter.dependencies)||canonical(adapter.dependencies)!==canonical(uaContextMigrationAdapterDependencies))fail('source adapter dependency set mismatch');
 const dependencyBytes=new Map();for(const dependency of uaContextMigrationAdapterDependencies){const bytes=readFileSync(resolve(repoRoot,dependency.path));if(hash(bytes)!==dependency.sha256)fail(`source adapter dependency hash mismatch: ${dependency.path}`);dependencyBytes.set(dependency.path,bytes);}
 const frameRegistry=JSON.parse(dependencyBytes.get('research/monetary-source-render-frames.json').toString('utf8'));
 if(!Array.isArray(frameRegistry.sourceEvidence)||canonical(frameRegistry.sourceEvidence)!==canonical(uaContextMigrationAdapterDependencies.slice(2)))fail('source-frame registry evidence dependencies mismatch');
 const snapshotRef=bridge.sourceSnapshot;if(typeof snapshotRef?.path!=='string'||snapshotRef.path.startsWith('/')||snapshotRef.path.split('/').includes('..')||typeof snapshotRef.sha256!=='string')fail('missing or unsafe full migration snapshot reference');
 const snapshotBytes=readFileSync(resolve(repoRoot,snapshotRef.path));if(hash(snapshotBytes)!==snapshotRef.sha256)fail('full migration snapshot hash mismatch');
 const snapshot=JSON.parse(snapshotBytes.toString('utf8')),snapshotRecords=snapshot.records;
 if(!Array.isArray(snapshotRecords)||snapshotRecords.length!==2161||snapshotRef.recordCount!==2161||snapshot.contextEvidenceCoverage?.records!==927)fail('migration snapshot denominator mismatch');
 const snapshotByUid=new Map();for(const row of snapshotRecords){if(typeof row.uid!=='string'||snapshotByUid.has(row.uid))fail('duplicate migration snapshot UID');snapshotByUid.set(row.uid,row);}
 const snapshotContextStatus=row=>row.contextEvidenceStatus??row.contextEvidence?.status??null,snapshotContextVersion=row=>row.contextFingerprintVersion??row.contextEvidence?.fingerprintVersion??null;
 const projected=snapshotRecords.filter(row=>row.contextEvidenceSha256&&snapshotContextVersion(row)&&snapshotContextStatus(row)),bySurface=projected.reduce((out,row)=>(out[row.surface]=(out[row.surface]||0)+1,out),{});
 if(projected.length!==927||bySurface['ua-supplement-row']!==583||bySurface['phb-dmg-supplement-row']!==179||bySurface['phb-reference-row-comparison']!==165||projected.some(row=>!row.contextEvidence||!/^[a-f0-9]{64}$/.test(row.contextEvidenceSha256)||snapshotContextVersion(row)!==(row.surface==='ua-supplement-row'?uaContextFingerprintVersion:[monetaryContextFingerprintVersion,monetaryContextPartsFingerprintVersion].includes(snapshotContextVersion(row))?snapshotContextVersion(row):null)||row.contextEvidence.fingerprintVersion!==snapshotContextVersion(row)||row.contextEvidence.status!==snapshotContextStatus(row)||monetaryContextEvidenceFingerprint(row.contextEvidence)!==row.contextEvidenceSha256||row.contextPhysicalFingerprintVersion!==monetaryContextPhysicalFingerprintVersion||!/^[a-f0-9]{64}$/.test(row.contextPhysicalEvidenceSha256||'')||monetaryContextPhysicalEvidenceFingerprint(row.contextEvidence)!==row.contextPhysicalEvidenceSha256||row.surface==='ua-supplement-row'&&snapshotContextStatus(row)!=='legacy-declared-context-metadata;active-targets-unassessed'))fail('migration snapshot does not contain 927 complete, recomputed context and physical-evidence objects');
 for(const row of projected){
  const frozen=frozenContextEvidenceForUid(row.uid),expected=frozen?monetaryContextPhysicalEvidenceFingerprint(frozen):null;
  if(!expected||expected!==row.contextPhysicalEvidenceSha256)fail(`migration snapshot physical context for ${row.uid} differs from immutable original source archives`);
 }
 const inputRef=snapshot.inputManifest?.find(input=>input.key==='ua');
 if(!inputRef||inputRef.path!==originalPath||inputRef.sha256!==originalSha||inputRef.sha256!==snapshotRef.currentSourcePreimage?.sha256||snapshotRef.currentSourcePreimage?.path!==originalPath)fail('current UA source preimage does not match unchanged original input');
 const extensionRef=findingManifest.extensions.find(ref=>ref.path===bridge.migrations[0]?.originalFindingArtifact?.path);
 if(!extensionRef||bridge.migrations.some(m=>m.originalFindingArtifact?.path!==extensionRef.path||m.originalFindingArtifact?.sha256!==extensionRef.sha256))fail('migration findings do not share one registered original artifact');
 const extensionBytes=readFileSync(resolve(repoRoot,extensionRef.path));if(hash(extensionBytes)!==extensionRef.sha256)fail('original finding artifact hash mismatch');
 const extension=JSON.parse(extensionBytes.toString('utf8')),recordMap=new Map(),bridgeEntries=new Map();
 if(bridge.migrations.length!==5)fail('legacy UA bridge must contain exactly five findings');
 for(const migration of bridge.migrations){
  const id=migration.originalFindingArtifact.findingId;
  if(!allowedLegacyUaContextMigrationFindingIds.has(id)||recordMap.has(id)||!Array.isArray(migration.records)||migration.records.length!==1)fail('unexpected legacy finding or record cardinality');
  const original=extension.knownFindings.find(f=>f.id===id),loaded=knownFindings.find(f=>f.id===id),registered=findingManifest.extensions.find(ref=>ref.path===migration.originalFindingArtifact.path);
  if(!original||!loaded||original.kind!=='source-note-context-defect'||registered?.sha256!==migration.originalFindingArtifact.sha256)fail('legacy finding does not match its immutable registered artifact');
  const ref=migration.records[0],old=original.records.find(r=>r.uid===ref.uid),snapshotRow=snapshotByUid.get(ref.uid);
  if(!old||original.records.length!==1||!snapshotRow||recordMap.has(ref.uid))fail('legacy finding UID missing or duplicate');
  if(ref.uid!==old.uid||ref.oldRowIdentitySha256!==old.rowIdentitySha256||ref.oldFocusGeometrySha256!==old.focusGeometrySha256||ref.oldContextGeometrySha256!==old.contextGeometrySha256)fail('old immutable finding reference mismatch');
  if(snapshotRow.rowIdentitySha256!==ref.oldRowIdentitySha256||snapshotRow.focusGeometrySha256!==ref.oldFocusGeometrySha256||snapshotRow.contextGeometrySha256!==ref.oldContextGeometrySha256)fail('legacy geometry changed during adapter-only migration');
  if(snapshotRow.input!==originalPath||snapshotRow.inputSha256!==inputRef.sha256||snapshotRow.contextEvidenceSha256!==ref.newContextEvidenceSha256||snapshotRow.contextPhysicalEvidenceSha256!==ref.newContextPhysicalEvidenceSha256||snapshotContextVersion(snapshotRow)!==ref.newContextFingerprintVersion||snapshotContextStatus(snapshotRow)!=='legacy-declared-context-metadata;active-targets-unassessed'||ref.newContextFingerprintVersion!==uaContextFingerprintVersion||!/^[a-f0-9]{64}$/.test(ref.newContextEvidenceSha256||'')||ref.newContextPhysicalFingerprintVersion!==monetaryContextPhysicalFingerprintVersion||!/^[a-f0-9]{64}$/.test(ref.newContextPhysicalEvidenceSha256||''))fail('new UA pre-fingerprint is missing, invalid, or unbound to source snapshot');
  recordMap.set(id,ref);bridgeEntries.set(`${id}:${ref.uid}`,{...ref,findingId:id});
 }
 if(recordMap.size!==allowedLegacyUaContextMigrationFindingIds.size||[...allowedLegacyUaContextMigrationFindingIds].some(id=>!recordMap.has(id)))fail('bridge omitted a frozen legacy UA context finding');
 return {schemaVersion:2,bridgePath:bridgeRef.path,bridgeSha256:bridgeRef.sha256,snapshotPath:snapshotRef.path,snapshotSha256:snapshotRef.sha256,entries:bridgeEntries};
}
function resolveJsonPointer(value,pointer){
 if(typeof pointer!=='string'||(pointer!==''&&!pointer.startsWith('/'))||/(?:~(?![01]))/.test(pointer))return {found:false};
 let current=value;
 if(pointer==='')return {found:true,value:current};
 for(const raw of pointer.slice(1).split('/')){
  const key=raw.replace(/~1/g,'/').replace(/~0/g,'~');
  if(Array.isArray(current)){if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=current.length)return {found:false};current=current[Number(key)];}
  else if(current&&typeof current==='object'&&Object.hasOwn(current,key))current=current[key];
  else return {found:false};
 }
 return {found:true,value:current};
}
function provenanceArtifactValue(reference,provenanceArtifacts){
 if(!reference||typeof reference.path!=='string'||typeof reference.sha256!=='string'||typeof reference.pointer!=='string')return {status:'provenance-artifact-reference-missing'};
 const bytes=provenanceArtifacts.get(reference.path);if(bytes===undefined)return {status:'provenance-artifact-unavailable'};
 const actualSha256=hash(bytes);if(actualSha256!==reference.sha256)return {status:'provenance-artifact-hash-mismatch',actualSha256};
 let document;try{document=JSON.parse(bytes.toString('utf8'));}catch{return {status:'provenance-artifact-invalid-json',actualSha256};}
 const resolved=resolveJsonPointer(document,reference.pointer);return resolved.found?{status:'hash-matched',actualSha256,value:resolved.value}:{status:'provenance-artifact-pointer-missing',actualSha256};
}
function provenanceReviewMatchesFinding(review,f,provenanceArtifacts,recordsByUid){
 const target=review.provenanceArtifact;if(!target)return false;
 const state=provenanceArtifactValue(target,provenanceArtifacts);
 if(state.status!=='hash-matched'||canonical(state.value)!==canonical(target.value)||canonical(state.value)!==canonical(f.expectedValue))return false;
 return review.records.every(ref=>{
  const current=recordsByUid.get(ref.uid);
  if(!current||!ref.recordSha256||ref.recordSha256!==current.recordSha256||!ref.rowIdentitySha256||ref.rowIdentitySha256!==current.rowIdentitySha256||!ref.focusGeometrySha256||ref.focusGeometrySha256!==current.focusGeometrySha256)return false;
  if(current.contextEvidenceSha256&&ref.contextEvidenceSha256!==current.contextEvidenceSha256)return false;
  if(ref.contextEvidenceSha256&&ref.contextEvidenceSha256!==current.contextEvidenceSha256)return false;
  if(ref.contextGeometrySha256&&ref.contextGeometrySha256!==current.contextGeometrySha256)return false;
  return true;
 });
}
const duplicateEvidenceKind=roles=>roles.every(role=>actualFocusRoles.has(role))?'actual-focus-pair':roles.every(role=>role==='row-locator')?'row-locator-pair':roles.every(role=>role==='passage-locator')?'passage-locator-pair':roles.every(role=>locatorRoles.has(role))?'mixed-locator-pair':'mixed-focus-and-locator-pair';
function focusFingerprint(record){return hash(record.geometry.filter(g=>focusRoles.has(g.role)).map(({space,bounds,source,frame,role})=>({space,bounds,source,frame,role})));}
function sourcePageKey(source){return canonical({book:source?.book||null,printedPage:source?.printedPage??null,pdfPage:source?.pdfPage??null,sourcePdfSha256:source?.sourceSha256||source?.sourcePdfSha256||null});}
function dimensionsForFocusGeometry(record,g){
 const hinted=g.derivation?.sourceRenderDimensionsPx;if(positiveIntegerPair(hinted))return hinted;
 const evidence=record.contextEvidence;
 const legacy=evidence?.legacyProjection,entry=(legacy?.sourceEvidenceIndex||[]).find(item=>item.pdfPage===g.source?.pdfPage&&(item.sourcePdfSha256===g.source?.sourceSha256||!g.source?.sourceSha256));
 return positiveIntegerPair(entry?.pageDimensionsPx)?entry.pageDimensionsPx:null;
}
function recordFocusPhysicalWindows(record){
 const byPage=new Map(),add=(source,space,bounds)=>{if(!source?.book||!Number.isInteger(source.pdfPage)||source.pdfPage<1||!/^[a-f0-9]{64}$/.test(source.sourceSha256||'')||!validPositiveRect(bounds))return;const key=sourcePageKey(source);if(!byPage.has(key))byPage.set(key,{source:{book:source.book,printedPage:source.printedPage??null,pdfPage:source.pdfPage,sourcePdfSha256:source.sourceSha256},pdf:[],pixels:[]});const target=byPage.get(key);(space==='pdf-page-points'?target.pdf:target.pixels).push([...bounds]);};
 for(const g of (record.geometry||[]).filter(item=>actualFocusRoles.has(item.role)&&item.validShape)){
  if(g.space==='pdf-page-points'){add(g.source,'pdf-page-points',g.bounds);continue;}
  if(g.space==='rendered-page-pixels'){
   const dims=dimensionsForFocusGeometry(record,g);if(dims)add(g.source,'normalized-source-render-page',g.bounds.map((n,i)=>roundedRatio(n,dims[i%2])));continue;
  }
  if(g.space==='crop-local-pixels'){
   const cropId=g.derivation?.contextCropId||g.derivation?.cropId,evidence=record.contextEvidence,crop=evidence?.sourceContextParts?.find(p=>p.cropId===cropId)?.crop||evidence?.crops?.find(c=>c.cropId===cropId)?.metadata||{},offset=crop.cropBoundsPixelsLTRB,dims=crop.sourceRenderDimensionsPx;
   if(cropId&&finiteRect(offset)&&positiveIntegerPair(dims))add(g.source,'normalized-source-render-page',[g.bounds[0]+offset[0],g.bounds[1]+offset[1],g.bounds[2]+offset[0],g.bounds[3]+offset[1]].map((n,i)=>roundedRatio(n,dims[i%2])));
  }
 }
 const windows=[];for(const page of byPage.values()){const list=page.pdf.length?page.pdf:page.pixels;for(const bounds of list)windows.push({source:page.source,space:page.pdf.length?'pdf-page-points':'normalized-source-render-page',bounds});}
 return canonicalPhysicalWindows(windows);
}
export function monetaryFocusPhysicalEvidenceFingerprint(record){const windows=recordFocusPhysicalWindows(record);return windows.length?hash({version:monetaryFocusPhysicalFingerprintVersion,windows}):null;}
let frozenUaFocusData,frozenPhbdmgFocusData;
function frozenFocusPhysicalWindows(uid){
 const uaMatch=String(uid).match(/^ua-supplement-row:(.+)$/),pdMatch=String(uid).match(/^phb-dmg-supplement-row:(.+)$/);
 if(uaMatch){
  if(!frozenUaFocusData){const raw=gunzipSync(readFileSync(resolve(root,'tests/fixtures/monetary-source-ua-583-before.json.gz')));if(hash(raw)!=='8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a')throw Error('Frozen UA focus baseline hash mismatch');frozenUaFocusData=JSON.parse(raw.toString('utf8'));}
  const row=frozenUaFocusData.rowRecords.find(candidate=>candidate.recordId===uaMatch[1]);if(!row)return null;const e=row.evidence||{},s=row.sourceRowIdentity||{},source=sourceIdentity({...s,book:'UA',sourceSha256:e.sourcePdfSha256||frozenUaFocusData.source?.sha256}),bounds=e.rowHighlightBounds?.pdfPagePoints;
  if(!finiteRect(bounds))return null;
  return [{source:{book:source.book,printedPage:source.printedPage??null,pdfPage:source.pdfPage,sourcePdfSha256:source.sourceSha256},space:'pdf-page-points',bounds}];
 }
 if(pdMatch){
  if(!frozenPhbdmgFocusData){const raw=gunzipSync(readFileSync(resolve(root,'tests/fixtures/monetary-source-phbdmg-179-before.json.gz')));if(hash(raw)!=='b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9')throw Error('Frozen PHB/DMG focus baseline hash mismatch');frozenPhbdmgFocusData=JSON.parse(raw.toString('utf8'));}
  const row=frozenPhbdmgFocusData.review.sourceRowsOrClaims.find(candidate=>candidate.sourceRowOrClaimId===pdMatch[1]);if(!row)return null;const source=sourceIdentity(row.source),focus=row.focus||{},cropId=focus.contextCropId||row.contextCropId,crop=frozenPhbdmgFocusData.review.evidenceCrops.find(candidate=>candidate.cropId===cropId),dims=crop?.sourceRenderDimensionsPx,offset=crop?.cropBoundsPixelsLTRB,rects=Array.isArray(focus.focusRectsCropPixelsLTRB)?focus.focusRectsCropPixelsLTRB:[focus.focusBoundsCropPixelsLTRB].filter(finiteRect);
  if(!crop||!positiveIntegerPair(dims)||!finiteRect(offset)||!rects.length)return null;
  return canonicalPhysicalWindows(rects.map(rect=>{const pageBounds=[rect[0]+offset[0],rect[1]+offset[1],rect[2]+offset[0],rect[3]+offset[1]];return {source:{book:source.book,printedPage:source.printedPage??null,pdfPage:source.pdfPage,sourcePdfSha256:source.sourceSha256},space:'normalized-source-render-page',bounds:pageBounds.map((n,i)=>roundedRatio(n,dims[i%2]))};}));
 }
 return null;
}
const legacyPrimaryFocusRoles=new Set(['row-focus','row-or-passage-focus','passage-focus','catalog-highlight']);
function primaryFocusPhysicalWindows(record){
 const primaryGeometry=(record?.geometry||[]).filter(g=>legacyPrimaryFocusRoles.has(g.role)&&g.validShape);
 return primaryGeometry.length?recordFocusPhysicalWindows({...record,geometry:primaryGeometry}):[];
}
function primaryFocusRetainsOriginalFrames(uid,record,after=primaryFocusPhysicalWindows(record)){
 const before=frozenFocusPhysicalWindows(uid);if(!before.length||!after.length)return false;
 const key=window=>canonical({source:window.source,space:window.space}),afterFrames=new Set(after.map(key));
 return [...new Set(before.map(key))].every(frame=>afterFrames.has(frame));
}
function focusPhysicalWindowsChanged(uid,record){
 const before=frozenFocusPhysicalWindows(uid);if(!before.length||!record)return false;
 const after=primaryFocusPhysicalWindows(record);if(!after.length||!primaryFocusRetainsOriginalFrames(uid,record,after))return false;
 const key=window=>canonical({source:window.source,space:window.space}),beforeFrames=[...new Set(before.map(key))],afterFrameSet=new Set(after.map(key));
 // Preserve every original frame. New ordered note/context focus frames remain
 // bound by the full review fingerprint, but cannot make a primary-focus change.
 const beforeFrameSet=new Set(beforeFrames),group=windows=>{const out={};for(const window of windows.filter(item=>beforeFrameSet.has(key(item))))(out[key(window)]||=([])).push(window.bounds);for(const bounds of Object.values(out))bounds.sort((a,b)=>canonical(a).localeCompare(canonical(b)));return out;};
 return canonical(group(before))!==canonical(group(after));
}
function focusChangedSinceFinding(f,current){
 const changed=current.map((record,index)=>Boolean(record&&focusPhysicalWindowsChanged(f.records[index].uid,record)));
 if(f.kind==='duplicate-wrong-row-focus')return changed.some(Boolean)&&current.length===2&&current.every(Boolean)&&current.every((record,index)=>primaryFocusRetainsOriginalFrames(f.records[index].uid,record))&&canonical(primaryFocusPhysicalWindows(current[0]))!==canonical(primaryFocusPhysicalWindows(current[1]));
 return changed.length>0&&changed.every(Boolean);
}
let frozenPhbdmgSourceRows,frozenWhaleUnitBaseline;
function whaleUnitBeforeBaseline(){
 if(frozenWhaleUnitBaseline)return frozenWhaleUnitBaseline;
 const path='research/source-audit-batch5-whale-unit-before-v2.json',bytes=readFileSync(resolve(root,path));
 if(hash(bytes)!=='e0933aa556034bc48aa60d7cf9dba1c44b0d35fa71c4a04dbf15562586578b81')throw Error('Frozen Whale unit before-baseline hash mismatch');
 const baseline=JSON.parse(bytes.toString('utf8')),row=baseline.typedRecord,source=baseline.sourceInputs?.find(input=>input.key==='monsterCensus');
 if(baseline.capturedBeforeSourceCorrections!==true||baseline.sourceDataEdited!==false||source?.path!=='research/price-source-inventory-monster-books.json'||source.sha256!=='87ea54c296d9a6b4697a997b5da1ee38b9c844668fc4fb54d5a8794d6aaef106'||row?.uid!=='source-census-claim:mm-whale-ambergris'||row.inputPath!==source.path||row.inputSha256!==source.sha256||row.recordPointer!=='/claims/36'||row.recordSha256!=='3139b0ac614ebedaa3417024b874c0af9fae464863467676bcfc95319babd507'||row.typedFieldPointer!=='/unit'||hash(row.currentFieldValue)!==row.currentFieldValueSha256||row.expectedUnit!==null||row.expectedUnitSha256!==hash(null)||row.expectedEditorialUnit!==null||row.editorialHistory?.value!==row.currentFieldValue||row.editorialHistory?.valueSha256!==row.currentFieldValueSha256)throw Error('Frozen Whale unit before-baseline contents are inconsistent');
 if(!Array.isArray(baseline.mirrorFields)||baseline.mirrorFields.length!==4||baseline.mirrorFields.some(field=>field.collectorUid!==row.uid||field.collectorInputPath!==row.inputPath||field.collectorInputSha256!==row.inputSha256||field.collectorRecordPointer!==row.recordPointer||field.collectorTypedFieldPointer!==row.typedFieldPointer||field.collectorRecordSha256!==row.recordSha256||field.currentValueSha256!==row.currentFieldValueSha256||field.expectedTypedValue!==null||field.expectedTypedValueSha256!==hash(null)||field.expectedEditorialUnit!==null))throw Error('Frozen Whale unit mirror-field baseline is inconsistent');
 frozenWhaleUnitBaseline=baseline;return baseline;
}
function frozenTypedSourceRow(uid){
 const match=String(uid).match(/^phb-dmg-supplement-row:(.+)$/);if(!match)return null;
 if(!frozenPhbdmgSourceRows){const bytes=readFileSync(resolve(root,'tests/fixtures/monetary-source-phbdmg-179-before.json.gz')),raw=gunzipSync(bytes);if(hash(raw)!=='b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9')throw Error('Frozen PHB/DMG content baseline hash mismatch');const doc=JSON.parse(raw.toString('utf8'));frozenPhbdmgSourceRows=new Map((doc.review?.sourceRowsOrClaims||[]).map(row=>[row.sourceRowOrClaimId,row]));}
 return frozenPhbdmgSourceRows.get(match[1])||null;
}
function frozenTypedSourceHashes(uid){
 if(uid==='source-census-claim:mm-whale-ambergris'){const baseline=whaleUnitBeforeBaseline();return {[baseline.typedRecord.typedFieldPointer]:baseline.typedRecord.currentFieldValueSha256};}
 const row=frozenTypedSourceRow(uid);return row?sourceValueSha256ByPointer(row):null;
}
function frozenTypedExpectation(uid){
 if(uid!=='source-census-claim:mm-whale-ambergris')return null;
 const baseline=whaleUnitBeforeBaseline(),row=baseline.typedRecord;
 return {input:row.inputPath,inputSha256:row.inputSha256,pointer:row.recordPointer,recordSha256:row.recordSha256,typedFieldPointer:row.typedFieldPointer,beforeValueSha256:row.currentFieldValueSha256,expectedValue:row.expectedUnit,expectedValueSha256:row.expectedUnitSha256,expectedEditorialUnit:row.expectedEditorialUnit};
}
const typedSemanticValueRoots=new Set(['typedValue','quantityOrScale','conditions','condition','purpose','unit','amount','currency','rate','value','price','formula','scale','sourceQualifier','qualifier','derivation','adjustment','qualification','discount','outcome','success','valueOrigin']);
const typedSemanticRootChangeContracts=new Map([
 ['unqualified-derived-research-threshold-6000',new Map([['phb-dmg-supplement-row:dmg-spell-research-success-expenditure-3',['/typedValue']]])],
 ['dmg-p33-information-discovery-note-conditions',new Map([
  ['phb-dmg-supplement-row:dmg-info-discovery-row-01',['/conditions']],
  ['phb-dmg-supplement-row:dmg-info-discovery-row-02',['/conditions']],
  ['phb-dmg-supplement-row:dmg-info-discovery-row-03',['/conditions']],
  ['phb-dmg-supplement-row:dmg-info-discovery-row-04',['/conditions']],
 ])],
 ['phb-dmg-alchemist-discount-scope',new Map([['phb-dmg-supplement-row:dmg-potion-alchemist-discount',['/conditions','/typedValue']]])],
]);
function semanticRootValue(raw,pointer){
 const key=pointer.startsWith('/')?pointer.slice(1):'';if(!key||key.includes('/')||key.includes('~'))return {present:false,value:undefined};
 return raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.hasOwn(raw,key)?{present:true,value:raw[key]}:{present:false,value:undefined};
}
function typedSemanticRootRepairMatches(f,ref,current,old){
 const expectedRoots=typedSemanticRootChangeContracts.get(f?.id)?.get(ref?.uid);
 if(!expectedRoots||f.kind!=='typed-content-mismatch'&&f.kind!=='unresolved-source-scope'||!current||current.uid!==ref?.uid||current.surface!=='phb-dmg-supplement-row'||current.input!=='research/source-audit-batch5-phb-dmg-additional-prices.json'||ref.sourceInput?.path!==current.input||ref.sourceInput?.sha256!==current.inputSha256||ref.sourcePointer!==current.pointer)return false;
 const before=frozenTypedSourceRow(ref.uid),after=rawSourceRecordByAuditRecord.get(current),rowId=ref.uid.slice('phb-dmg-supplement-row:'.length),sourceValueHashes=current.sourceValueSha256ByPointer||{};
 if(!before||!after||before.sourceRowOrClaimId!==rowId||after.sourceRowOrClaimId!==rowId||!old||old.recordSha256!==hash(before)||current.recordSha256!==hash(after)||ref.recordSha256!==current.recordSha256)return false;
 const changedRoots=[...typedSemanticValueRoots].map(root=>`/${root}`).filter(pointer=>{const b=semanticRootValue(before,pointer),a=semanticRootValue(after,pointer);return b.present!==a.present||b.present&&canonical(b.value)!==canonical(a.value);}).sort();
 if(canonical(changedRoots)!==canonical([...expectedRoots].sort()))return false;
 const expectedChanges=changedRoots.map(pointer=>{const b=semanticRootValue(before,pointer),a=semanticRootValue(after,pointer);return {pointer,beforePresent:b.present,beforeSha256:b.present?hash(b.value):null,afterPresent:a.present,afterSha256:a.present?hash(a.value):null};});
 const changes=ref.confirmedSemanticFieldChanges;if(!Array.isArray(changes)||canonical([...changes].sort((a,b)=>String(a?.pointer).localeCompare(String(b?.pointer))))!==canonical(expectedChanges))return false;
 const pointerHashes=ref.confirmedPointerSha256;if(!pointerHashes||typeof pointerHashes!=='object'||Array.isArray(pointerHashes)||Object.entries(pointerHashes).some(([pointer,value])=>sourceValueHashes[pointer]!==value))return false;
 return true;
}
let frozenUaContextData,frozenPhbdmgContextData;
function frozenContextEvidenceForUid(uid){
 const uaMatch=String(uid).match(/^ua-supplement-row:(.+)$/),pdMatch=String(uid).match(/^phb-dmg-supplement-row:(.+)$/),comparisonMatch=String(uid).match(/^phb-reference-row-comparison:phb123-comparison-(\d+)$/);
 if(uaMatch){
  if(!frozenUaContextData){const bytes=readFileSync(resolve(root,'tests/fixtures/monetary-source-ua-583-before.json.gz')),raw=gunzipSync(bytes);if(hash(raw)!=='8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a')throw Error('Frozen UA context baseline hash mismatch');frozenUaContextData=JSON.parse(raw.toString('utf8'));}
  const row=frozenUaContextData.rowRecords.find(candidate=>candidate.recordId===uaMatch[1]),groupId=uaMatch[1].match(/^(ua-other-\d+)/)?.[1],group=frozenUaContextData.groupReviews.find(candidate=>candidate.groupId===groupId);if(!row)return null;
  const s=row.sourceRowIdentity||{},e=row.evidence||{},source=sourceIdentity({...s,book:'UA',sourceSha256:e.sourcePdfSha256||frozenUaContextData.source?.sha256}),segment=s.segmentId||e.tableSegmentId||null;
  return {fingerprintVersion:uaContextFingerprintVersion,status:'legacy-declared-context-metadata;active-targets-unassessed',sourceFrame:{book:source.book,printedPage:source.printedPage,pdfPage:source.pdfPage,sourcePdfSha256:source.sourceSha256,coordinateSpace:'active target crop-local rendered pixels plus source PDF page points'},legacyProjection:{groupId:group?.groupId||null,groupSourcePdfSha256:group?.sourcePdfSha256||null,sourceEvidenceIndex:Array.isArray(group?.sourceEvidenceIndex)?group.sourceEvidenceIndex:[],rowContext:{segmentId:segment,sourcePdfSha256:e.sourcePdfSha256||null,pageImageSha256:e.pageImageSha256||null,tableCropBounds:e.tableCropBounds||null}},declaredLinks:[],crops:[]};
 }
 if(pdMatch||comparisonMatch){
  if(!frozenPhbdmgContextData){const bytes=readFileSync(resolve(root,'tests/fixtures/monetary-source-phbdmg-179-before.json.gz')),raw=gunzipSync(bytes);if(hash(raw)!=='b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9')throw Error('Frozen PHB/DMG context baseline hash mismatch');frozenPhbdmgContextData=JSON.parse(raw.toString('utf8'));}
  let row,source,links;
  if(pdMatch){row=frozenPhbdmgContextData.review.sourceRowsOrClaims.find(candidate=>candidate.sourceRowOrClaimId===pdMatch[1]);if(!row)return null;source=sourceIdentity(row.source);links=[['contextCropId',row.contextCropId],['focus.contextCropId',row.focus?.contextCropId]].filter(([,cropId])=>cropId!==undefined).map(([field,cropId])=>({field,cropId:cropId??null}));}
  else{const index=Number(comparisonMatch[1]);row=frozenPhbdmgContextData.additionalReferenceSheetReview?.rowComparisons?.[index];if(!row)return null;source=sourceIdentity({book:'PHB',printedPage:row.p123PrintedPage,pdfPage:row.p123PdfPage,sourceSha256:row.p123SourceFileSha256});links=[{field:'p123ContextCropId',cropId:row.p123ContextCropId??null}];}
  const cropIds=[...new Set(links.map(link=>link.cropId).filter(Boolean))].sort(),crops=cropIds.map(cropId=>{const crop=frozenPhbdmgContextData.review.evidenceCrops.find(candidate=>candidate.cropId===cropId),metadata=crop?{sourceRenderSha256:crop.sourceRenderSha256||null,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx||null,cropBoundsPdfPagePointsTopLeftLTRB:crop.cropBoundsPdfPagePointsTopLeftLTRB||null,cropBoundsPdfPagePointsTopLeft:crop.cropBoundsPdfPagePointsTopLeft||null,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB||null,cropDimensionsPx:crop.cropDimensionsPx||null,cropSha256:crop.cropSha256||null,renderDpi:crop.renderDpi??null}:null;return {cropId,metadata,physicalWindow:crop?normalizedSourceWindow(source,{cropBoundsPdfPagePointsTopLeftLTRB:crop.cropBoundsPdfPagePointsTopLeftLTRB||crop.cropBoundsPdfPagePointsTopLeft,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx}):null};});
  return {fingerprintVersion:monetaryContextFingerprintVersion,status:'declared-context-crop-metadata-linked',sourceFrame:{book:source.book,printedPage:source.printedPage,pdfPage:source.pdfPage,sourcePdfSha256:source.sourceSha256,coordinateSpace:'crop-local-pixels plus source-render pixel frame'},declaredLinks:links,crops};
 }
 return null;
}
function frozenContextPhysicalFingerprint(uid){const evidence=frozenContextEvidenceForUid(uid);return evidence?monetaryContextPhysicalEvidenceFingerprint(evidence):null;}
const uaDoubleStarFindingId='ua-potion-double-star-exact-marker-array-tokenization',uaDoubleStarExtensionPath='research/source-audit-batch5-ua-double-star-tokenization-extension.json',uaDoubleStarExtensionSha256='d88bc09449c2add149815cf317573b3317df9403816d43b8d247633f3446eed9',uaFrozenSourceSha256='8ec8fcb1c937f1e5fdc86af87029a8defd1a4e9ee27c44ef9d0d84eef7e4577a';
let frozenUaDoubleStarContractData;
function frozenUaDoubleStarContract(){
 if(frozenUaDoubleStarContractData)return frozenUaDoubleStarContractData;
 const extensionBytes=readFileSync(resolve(root,uaDoubleStarExtensionPath));if(hash(extensionBytes)!==uaDoubleStarExtensionSha256)throw Error('Frozen UA double-star tokenization contract hash mismatch');
 const extension=JSON.parse(extensionBytes.toString('utf8')),finding=extension.knownFindings?.find(candidate=>candidate.id===uaDoubleStarFindingId);
 if(extension.schemaVersion!==1||extension.sourceInput?.path!=='research/source-audit-batch5-ua-additional-prices.json'||extension.sourceInput?.sha256!==uaFrozenSourceSha256||extension.capturedBeforeSourceCorrections!==true||extension.knownFindings?.length!==1||finding?.kind!=='typed-content-mismatch'||finding.records?.length!==2||finding.confirmedPointers?.length!==2)throw Error('Frozen UA double-star tokenization contract contents are inconsistent');
 const sourceBytes=gunzipSync(readFileSync(resolve(root,'tests/fixtures/monetary-source-ua-583-before.json.gz')));if(hash(sourceBytes)!==uaFrozenSourceSha256)throw Error('Frozen UA double-star source archive hash mismatch');
 const source=JSON.parse(sourceBytes.toString('utf8')),beforeRowsByUid=new Map(),contractRecordsByUid=new Map();
 for(const entry of finding.records){
  const pointerMatch=String(entry.sourceRecordPointer||'').match(/^\/rowRecords\/(0|[1-9]\d*)$/),row=pointerMatch?source.rowRecords[Number(pointerMatch[1])]:null,pointer=finding.confirmedPointers.find(candidate=>candidate.uid===entry.uid);
  if(!row||row.recordId!==entry.recordId||entry.uid!==`ua-supplement-row:${entry.recordId}`||entry.sourceInput?.path!==extension.sourceInput.path||entry.sourceInput?.sha256!==extension.sourceInput.sha256||entry.originalRecordSha256!==hash(row)||entry.markerPointer!==`${entry.sourceRecordPointer}/footnoteMarkers`||canonical(row.footnoteMarkers)!==canonical(['*','*'])||canonical(entry.originalRowAnnotationValue)!==canonical(['*','*'])||canonical(entry.exactExpectedPointerValue)!==canonical(['**'])||!pointer||pointer.pointer!==entry.markerPointer||canonical(pointer.before)!==canonical(['*','*'])||canonical(pointer.sourceCorrection)!==canonical(['**'])||canonical(pointer.expectedValue)!==canonical(['**']))throw Error('Frozen UA double-star tokenization row contract is inconsistent');
  beforeRowsByUid.set(entry.uid,row);contractRecordsByUid.set(entry.uid,entry);
 }
 frozenUaDoubleStarContractData={extension,finding,source,beforeRowsByUid,contractRecordsByUid};return frozenUaDoubleStarContractData;
}
function uaDoubleStarTypedRepairMatches(f,ref,current){
 const contract=frozenUaDoubleStarContract();if(!f||canonical(f)!==canonical(contract.finding)||!ref||!current)return false;
 const entry=contract.contractRecordsByUid.get(ref.uid),before=contract.beforeRowsByUid.get(ref.uid),raw=rawSourceRecordByAuditRecord.get(current);if(!entry||!before||!raw||current.uid!==entry.uid||current.surface!=='ua-supplement-row'||current.id!==entry.recordId||current.input!==entry.sourceInput.path||current.inputSha256===entry.sourceInput.sha256||current.pointer!==entry.sourceRecordPointer||current.recordSha256!==hash(raw)||ref.recordSha256!==current.recordSha256)return false;
 const expectedMarkers=entry.exactExpectedPointerValue,confirmedPointers=ref.confirmedPointerSha256||{};if(canonical(raw.footnoteMarkers)!==canonical(expectedMarkers)||canonical(current.annotations['/footnoteMarkers'])!==canonical(expectedMarkers)||confirmedPointers[entry.markerPointer]!==hash(expectedMarkers))return false;
 const normalization=raw.footnoteMarkerNormalizationV3,expectedNormalization={status:'exact token normalization proposal; pending source review',before:entry.originalRowAnnotationValue,after:entry.exactExpectedPointerValue,sourcePdfSha256:entry.sourceFrame?.sourcePdfSha256,sourceDefinitionId:entry.sourceDefinitionId,sourceDefinitionAdjudicationPath:contract.extension.independentPixelAdjudication?.path,sourceDefinitionAdjudicationSha256:contract.extension.independentPixelAdjudication?.sha256,reason:'These two original rows visibly carry a double-star glyph; exact-array correction is separate from marker meaning/applicability.'};
 if(normalization!==undefined&&canonical(normalization)!==canonical(expectedNormalization))return false;
 const beforeMeaning=structuredClone(before),currentMeaning=structuredClone(raw);delete beforeMeaning.evidence;delete currentMeaning.evidence;delete currentMeaning.footnoteMarkerNormalizationV3;beforeMeaning.footnoteMarkers=[...entry.originalRowAnnotationValue];currentMeaning.footnoteMarkers=[...entry.originalRowAnnotationValue];
 const old=f.records.find(candidate=>candidate.uid===entry.uid);return Boolean(old&&old.rowIdentitySha256===entry.rowIdentitySha256&&current.rowIdentitySha256===entry.rowIdentitySha256&&old.focusGeometrySha256===entry.focusGeometrySha256&&old.contextGeometrySha256===entry.contextGeometrySha256&&old.contextEvidenceSha256===entry.contextEvidenceSha256&&canonical(beforeMeaning)===canonical(currentMeaning));
}
function exactUaDoubleStarReviewMatches(review,f,byUid){
 const contract=frozenUaDoubleStarContract();if(!f||canonical(f)!==canonical(contract.finding)||!review||!Array.isArray(review.records)||review.records.length!==contract.finding.records.length)return false;
 const expectedUids=new Set(contract.finding.records.map(record=>record.uid));if(new Set(review.records.map(ref=>ref?.uid)).size!==expectedUids.size||review.records.some(ref=>!expectedUids.has(ref?.uid)))return false;
 return contract.finding.records.every(entry=>{const ref=review.records.find(candidate=>candidate.uid===entry.uid),current=byUid.get(entry.uid),pointerKeys=Object.keys(ref?.confirmedPointerSha256||{});return current&&ref&&pointerKeys.length===1&&pointerKeys[0]===entry.markerPointer&&uaDoubleStarTypedRepairMatches(f,ref,current);});
}
const pdHenchmanCropFindingId='active-context-crop-partial-glyph-crop-dmg-henchman-prospect-search-table-03',pdHenchmanContextExtensionPath='research/source-audit-batch5-monetary-context-crop-findings-extension.json',pdHenchmanContextExtensionSha256='0e78bf1f08b9af7072c545292d9706688d6f7ef489d6b9297a02a55793868795',pdHenchmanBeforeSha256='b0d46959c44e0d156ef5d40326af48c1f1ce9ee5b282a870c06c41010b94dcc9';
let frozenPdHenchmanCropContractData;
function frozenPdHenchmanCropContract(f){
 if(!f||f.id!==pdHenchmanCropFindingId||f.kind!=='source-context-crop-defect')return null;
 if(!frozenPdHenchmanCropContractData){const bytes=readFileSync(resolve(root,pdHenchmanContextExtensionPath));if(hash(bytes)!==pdHenchmanContextExtensionSha256)throw Error('Frozen PHB/DMG henchman crop finding contract hash mismatch');const extension=JSON.parse(bytes.toString('utf8')),finding=extension.knownFindings?.find(candidate=>candidate.id===pdHenchmanCropFindingId);if(extension.sourceInputSha256!==pdHenchmanBeforeSha256||finding?.kind!=='source-context-crop-defect'||finding.records?.length!==4||finding.contextAsset?.cropId!=='crop-dmg-henchman-prospect-search-table-03')throw Error('Frozen PHB/DMG henchman crop finding contract contents are inconsistent');frozenPdHenchmanCropContractData={extension,finding};}
 const contract=frozenPdHenchmanCropContractData;return canonical(f)===canonical(contract.finding)?contract:null;
}
function currentContextCropAsset(record,cropId){
 const evidence=record?.contextEvidence;if(!evidence||typeof cropId!=='string')return null;
 const crop=(evidence.crops||[]).find(candidate=>candidate.cropId===cropId);if(!crop)return null;
 const metadata=crop.metadata||{};return {crop,metadata,sourceFrame:evidence.sourceFrame||null};
}
function replacementContextAssetEntryMatches(f,old,current,review){
 const contract=frozenPdHenchmanCropContract(f);if(!contract||!old||!current||!review||!Array.isArray(review.contextAssetReplacements))return false;
 const missing=[];for(const ref of f.records){const row=current.find(candidate=>candidate?.uid===ref.uid),asset=currentContextCropAsset(row,f.contextAsset.cropId);if(!asset)missing.push(ref.uid);}
 if(!missing.includes(old.uid))return false;
 const mappings=review.contextAssetReplacements;if(mappings.length!==missing.length||new Set(mappings.map(item=>item?.uid)).size!==mappings.length||mappings.some(item=>!missing.includes(item?.uid)))return false;
 const mapping=mappings.find(item=>item.uid===old.uid),assetId=mapping?.currentCropId,asset=currentContextCropAsset(current.find(candidate=>candidate?.uid===old.uid),assetId),row=current.find(candidate=>candidate?.uid===old.uid),evidence=row?.contextEvidence,metadata=asset?.metadata,sourceFrame=evidence?.sourceFrame;
 if(!mapping||!asset||!metadata||!sourceFrame||mapping.oldCropId!==f.contextAsset.cropId||assetId===f.contextAsset.cropId||!(evidence.declaredLinks||[]).some(link=>link.cropId===assetId)||!sameSourcePdf(frozenContextEvidenceForUid(old.uid),evidence)||!hasValidDeclaredContextEvidence(row))return false;
 const cropFingerprint=monetaryContextPhysicalCropFingerprint(evidence,assetId),beforeFingerprint=monetaryContextPhysicalCropFingerprint(frozenContextEvidenceForUid(old.uid),f.contextAsset.cropId),sourceFrameSha256=hash(sourceFrame);
 return Boolean(beforeFingerprint&&cropFingerprint&&cropFingerprint!==beforeFingerprint&&mapping.sourceFrameSha256===sourceFrameSha256&&mapping.sourcePdfSha256===sourceFrame.sourcePdfSha256&&mapping.sourceBook===sourceFrame.book&&mapping.printedPage===sourceFrame.printedPage&&mapping.pdfPage===sourceFrame.pdfPage&&mapping.sourceRender===metadata.sourceRender&&mapping.sourceRenderSha256===metadata.sourceRenderSha256&&canonical(mapping.sourceRenderDimensionsPx)===canonical(metadata.sourceRenderDimensionsPx)&&canonical(mapping.cropBoundsPixelsLTRB)===canonical(metadata.cropBoundsPixelsLTRB)&&canonical(mapping.cropDimensionsPx)===canonical(metadata.cropDimensionsPx)&&mapping.cropSha256===metadata.cropSha256&&mapping.physicalCropFingerprintSha256===cropFingerprint&&mapping.contextEvidenceSha256===row.contextEvidenceSha256&&mapping.contextPhysicalFingerprintVersion===row.contextPhysicalFingerprintVersion&&mapping.contextPhysicalEvidenceSha256===row.contextPhysicalEvidenceSha256);
}
function typedContentRepairMatches(f,ref,current){
 if(f?.id===uaDoubleStarFindingId)return uaDoubleStarTypedRepairMatches(f,ref,current);
 const old=f.records.find(record=>record.uid===ref.uid);if(!old||!current||!ref.recordSha256||ref.recordSha256!==current.recordSha256||current.recordSha256===old.recordSha256)return false;
 const pinnedExpectation=frozenTypedExpectation(ref.uid),currentHashes=current.sourceValueSha256ByPointer||{},frozenHashes=frozenTypedSourceHashes(ref.uid),beforeHashes=frozenHashes||old.sourceValueSha256ByPointer||null,declared=f.confirmedPointers||[];
 if(beforeHashes===null)return false;
 if(pinnedExpectation){const declaredBefore=declared.find(entry=>entry?.pointer===pinnedExpectation.typedFieldPointer),expectation=(f.typedFieldExpectations||[]).find(item=>item?.pointer===pinnedExpectation.typedFieldPointer);if(f.id!=='mm-whale-ambergris-per-lump-unit-editorial'||old.recordSha256!==pinnedExpectation.recordSha256||old.sourceValueSha256ByPointer?.[pinnedExpectation.typedFieldPointer]!==pinnedExpectation.beforeValueSha256||!declaredBefore||declaredBefore.beforeValueSha256!==pinnedExpectation.beforeValueSha256||!expectation||expectation.expectedValue!==pinnedExpectation.expectedValue||expectation.expectedValueSha256!==pinnedExpectation.expectedValueSha256||expectation.expectedEditorialUnit!==pinnedExpectation.expectedEditorialUnit)return false;}
 if(typedSemanticRootChangeContracts.has(f.id))return typedSemanticRootRepairMatches(f,ref,current,old);
 const isAuthoredPointer=pointer=>typeof pointer==='string'&&pointer.startsWith('/')&&typedSemanticValueRoots.has(pointer.split('/')[1]||''),pointers=declared.length?declared.map(entry=>typeof entry==='string'?entry:entry?.pointer).filter(isAuthoredPointer):Object.keys({...beforeHashes,...currentHashes}).filter(pointer=>isAuthoredPointer(pointer)&&beforeHashes[pointer]!==currentHashes[pointer]);if(!pointers.length)return typedSemanticRootRepairMatches(f,ref,current,old);
 const changed=[],expectations=new Map((f.typedFieldExpectations||[]).map(item=>[item.pointer,item]));
 for(const pointer of pointers){const currentHash=currentHashes[pointer],item=declared.find(entry=>(typeof entry==='string'?entry:entry?.pointer)===pointer),beforeHash=item&&typeof item==='object'?(item.beforeValueSha256||(Object.hasOwn(item,'before')?hash(item.before):null))||beforeHashes[pointer]:beforeHashes[pointer],expectation=expectations.get(pointer);if(!/^[a-f0-9]{64}$/.test(currentHash||'')||!/^[a-f0-9]{64}$/.test(beforeHash||'')||beforeHashes[pointer]&&beforeHashes[pointer]!==beforeHash||currentHash===beforeHash)return false;if(expectation&&(expectation.expectedValueSha256!==hash(expectation.expectedValue)||Object.hasOwn(expectation,'expectedEditorialUnit')&&expectation.expectedEditorialUnit!==null||currentHash!==expectation.expectedValueSha256))return false;changed.push(pointer);}
 if(changed.every(pointer=>ref.confirmedPointerSha256?.[pointer]===currentHashes[pointer]))return true;
 return typedSemanticRootRepairMatches(f,ref,current,old);
}
function sameSourcePdf(before,after){return Boolean(before?.sourceFrame?.book&&before.sourceFrame.book===after?.sourceFrame?.book&&before.sourceFrame.sourcePdfSha256&&before.sourceFrame.sourcePdfSha256===after?.sourceFrame?.sourcePdfSha256);}
function contextChangedSinceFinding(f,current,bridgeEntries,replacementReview=null){
 return f.records.every((old,i)=>{const now=current[i],bridge=bridgeEntries.get(`${f.id}:${now?.uid}`);if(!now?.contextEvidence||!now.contextPhysicalEvidenceSha256)return false;
  if(f.kind==='source-context-crop-defect'&&f.contextAsset?.cropId){const frozen=frozenContextEvidenceForUid(old.uid),before=monetaryContextPhysicalCropFingerprint(frozen,f.contextAsset.cropId),after=monetaryContextPhysicalCropFingerprint(now.contextEvidence,f.contextAsset.cropId);return after?Boolean(before&&sameSourcePdf(frozen,now.contextEvidence)&&before!==after):replacementContextAssetEntryMatches(f,old,current,replacementReview);}
  const frozen=frozenContextEvidenceForUid(old.uid),before=old.contextPhysicalFingerprintVersion===monetaryContextPhysicalFingerprintVersion?old.contextPhysicalEvidenceSha256:bridge?.newContextPhysicalFingerprintVersion===monetaryContextPhysicalFingerprintVersion?bridge.newContextPhysicalEvidenceSha256:frozenContextPhysicalFingerprint(old.uid);return Boolean(before&&now.contextPhysicalFingerprintVersion===monetaryContextPhysicalFingerprintVersion&&sameSourcePdf(frozen,now.contextEvidence)&&now.contextPhysicalEvidenceSha256!==before);
 });
}
function contextCropDefectNeedsReview(f,current){
 if(f.kind!=='source-context-crop-defect'||!f.contextAsset?.cropId)return false;
 return f.records.some((old,i)=>{const now=current[i],frozen=frozenContextEvidenceForUid(old.uid);if(!now?.contextEvidence||!frozen||!sameSourcePdf(frozen,now.contextEvidence))return true;const before=monetaryContextPhysicalCropFingerprint(frozen,f.contextAsset.cropId),after=monetaryContextPhysicalCropFingerprint(now.contextEvidence,f.contextAsset.cropId);return !before||!after||before!==after;});
}
function sameDeclaredRow(a,b){return a.identity.sourceRowIds.some(id=>b.identity.sourceRowIds.includes(id));}
export function auditMonetaryRowIdentity(records,{knownFindings=[],reviews=[],reviewEvidence=new Map(),provenanceArtifacts=new Map(),retainedUncertainties=[],includeOverlaps=false,uaActiveContextTargetInventory=null,contextMigrationBridgeEntries=new Map()}={}){
 const errors=[],ids=new Set();
 for(const r of records){
  if(ids.has(r.uid))errors.push(`Duplicate audit record identity ${r.uid}`);ids.add(r.uid);
  if(r.identity.label!==r.label)errors.push(`Conflicting normalized row label ${r.uid}`);
  r.rowIdentitySha256=hash({source:r.source,identity:{...r.identity,label:r.label}});
  if(r.uaPrimaryContextContainment&&['primary-focus-source-points-missing','linked-primary-focus-target-missing','multiple-linked-primary-focus-targets','linked-primary-focus-target-frame-mismatch','row-focus-exceeds-primary-context-window'].includes(r.uaPrimaryContextContainment.status))errors.push(`UA row focus does not fit its declared primary context crop ${r.uid}: ${r.uaPrimaryContextContainment.status}`);
  for(const g of r.geometry){g.validShape=finiteRect(g.bounds)&&g.bounds[2]>g.bounds[0]&&g.bounds[3]>g.bounds[1];const computed=hash({space:g.space,bounds:g.bounds,source:g.source,frame:g.frame,role:g.role});if(g.geometrySha256&&g.geometrySha256!==computed)g.supersededComputedGeometrySha256=g.geometrySha256;g.geometrySha256=computed;if(!g.validShape)errors.push(`Invalid geometry ${r.uid}${g.path}`);}
  r.focusGeometrySha256=focusFingerprint(r);r.focusPhysicalFingerprintVersion=monetaryFocusPhysicalFingerprintVersion;r.focusPhysicalGeometrySha256=monetaryFocusPhysicalEvidenceFingerprint(r);r.contextGeometrySha256=hash(r.geometry.filter(g=>contextRoles.has(g.role)).map(({space,bounds,source,frame,role})=>({space,bounds,source,frame,role})));if(r.contextEvidence){const supported=(r.contextEvidence.fingerprintVersion===monetaryContextFingerprintVersion&&r.contextFingerprintVersion===monetaryContextFingerprintVersion)||(r.contextEvidence.fingerprintVersion===monetaryContextPartsFingerprintVersion&&r.contextFingerprintVersion===monetaryContextPartsFingerprintVersion)||(r.contextEvidence.fingerprintVersion===uaContextFingerprintVersion&&r.contextFingerprintVersion===uaContextFingerprintVersion);if(!supported)errors.push(`Unsupported contextual evidence fingerprint version ${r.uid}`);r.contextEvidenceSha256=monetaryContextEvidenceFingerprint(r.contextEvidence);r.contextPhysicalFingerprintVersion=monetaryContextPhysicalFingerprintVersion;r.contextPhysicalEvidenceSha256=monetaryContextPhysicalEvidenceFingerprint(r.contextEvidence);if(r.contextEvidence.fingerprintVersion===monetaryContextPartsFingerprintVersion&&(!hasValidDeclaredContextEvidence(r)||r.contextEvidence.status!=='declared-source-context-parts-linked'))errors.push(`Invalid or unresolved ordered source context parts ${r.uid}`);if(r.contextEvidence.fingerprintVersion===uaContextFingerprintVersion&&!['declared-active-context-targets-linked','legacy-declared-context-metadata;active-targets-unassessed'].includes(r.contextEvidence.status))errors.push(`Unresolved active UA context targets ${r.uid}: ${r.contextEvidence.status}`);if(r.contextEvidence.status==='declared-context-crop-metadata-linked'&&!hasValidDeclaredContextEvidence(r))errors.push(`Invalid declared monetary context links ${r.uid}`);if(r.contextEvidence.status==='declared-active-context-targets-linked'&&!hasValidDeclaredContextEvidence(r))errors.push(`Invalid declared active UA context links ${r.uid}`);}else if(r.contextEvidenceSha256||r.contextFingerprintVersion){errors.push(`Context evidence fingerprint lacks current context evidence ${r.uid}`);delete r.contextEvidenceSha256;delete r.contextFingerprintVersion;delete r.contextPhysicalFingerprintVersion;delete r.contextPhysicalEvidenceSha256;}r.annotationSha256=hash(r.annotations);r.identityCompleteness={label:Boolean(r.label),group:Boolean(r.identity.group),ordinalOrDice:r.identity.ordinal!==null||Boolean(r.identity.diceRoll),sourceHash:/^[a-f0-9]{64}$/.test(r.source.sourceSha256||''),sourceBook:Boolean(r.source.book),sourcePdfPage:Number.isInteger(r.source.pdfPage)};r.geometryStatus=r.notApplicable?'explicitly-not-applicable':r.geometry.some(g=>focusRoles.has(g.role))?'focus-or-row-locator-recorded':r.geometry.length?'context-only-no-row-focus':'no-recorded-focus-geometry';r.physicalRowIdentityReview='unassessed-by-programmatic-inventory';
 }
 const knownIds=new Set();for(const f of knownFindings){if(typeof f.id!=='string'||!f.id||knownIds.has(f.id)||!knownFindingKinds.has(f.kind)||!Array.isArray(f.records)||!f.records.length)throw Error('Duplicate or invalid known monetary finding');if(f.kind==='source-provenance-metadata-mismatch'&&(!f.provenanceArtifact||typeof f.provenanceArtifact.path!=='string'||typeof f.provenanceArtifact.sha256!=='string'||typeof f.provenanceArtifact.pointer!=='string'||!Object.hasOwn(f.provenanceArtifact,'observedValue')||!Object.hasOwn(f,'expectedValue')))throw Error('Invalid provenance metadata finding contract');knownIds.add(f.id);}
 const reviewIds=new Set();for(const r of reviews){if(typeof r.id!=='string'||!r.id||reviewIds.has(r.id))throw Error('Duplicate or missing monetary review ID');reviewIds.add(r.id);}
 const buckets=new Map();
 for(const r of records)for(const g of r.geometry.filter(g=>focusRoles.has(g.role)&&g.frame&&g.validShape)){
  const key=canonical([g.frame,g.bounds]);if(!buckets.has(key))buckets.set(key,[]);const b=buckets.get(key);if(!b.some(v=>v.record.uid===r.uid&&v.geometry.role===g.role))b.push({record:r,geometry:g});
 }
 const pairMap=new Map(),echoes=[];
 for(const matches of buckets.values())for(let i=0;i<matches.length;i++)for(let j=i+1;j<matches.length;j++){
  const a=matches[i],b=matches[j];if(a.record.uid===b.record.uid)continue;
  const labelDiff=normalizeLabel(a.record.label)!==normalizeLabel(b.record.label),ordinalDiff=a.record.identity.ordinal!==null&&b.record.identity.ordinal!==null&&String(a.record.identity.ordinal)!==String(b.record.identity.ordinal),diceDiff=a.record.identity.diceRoll&&b.record.identity.diceRoll&&a.record.identity.diceRoll!==b.record.identity.diceRoll;
  const key=[a.record.uid,b.record.uid].sort().join('|');
  const evidence={space:a.geometry.space,frame:a.geometry.frame,bounds:a.geometry.bounds,paths:[a.geometry.path,b.geometry.path],roles:[a.geometry.role,b.geometry.role],kind:duplicateEvidenceKind([a.geometry.role,b.geometry.role])};
  if(!labelDiff&&!ordinalDiff&&!diceDiff){echoes.push({records:[a.record.uid,b.record.uid],evidence,status:'same-declared-label-ordinal-repeat-unassessed'});continue;}
  if(!pairMap.has(key))pairMap.set(key,{id:`duplicate-focus-${hash(key).slice(0,20)}`,records:[a.record.uid,b.record.uid].sort(),labels:[a.record.label,b.record.label],ordinals:[a.record.identity.ordinal,b.record.identity.ordinal],diceRolls:[a.record.identity.diceRoll,b.record.identity.diceRoll],sameInput:a.record.input===b.record.input,sameGroup:a.record.identity.group!==null&&a.record.identity.group===b.record.identity.group,declaredSharedSourceRowLink:sameDeclaredRow(a.record,b.record),status:'candidate-requires-source-review',evidence:[]});
  pairMap.get(key).evidence.push(evidence);
 }
 const candidates=[...pairMap.values()].sort((a,b)=>a.id.localeCompare(b.id)),byUid=new Map(records.map(r=>[r.uid,r]));
 const uncertaintyIds=new Set();const currentUncertainties=retainedUncertainties.map(u=>{if(!u.id||uncertaintyIds.has(u.id))throw Error('Invalid or duplicate retained monetary uncertainty');uncertaintyIds.add(u.id);const r=byUid.get(u.uid);return {...u,status:!r?'record-unavailable-needs-source-review':r.rowIdentitySha256!==u.rowIdentitySha256||(u.annotationSha256&&r.annotationSha256!==u.annotationSha256)||(u.recordSha256&&r.recordSha256!==u.recordSha256)?'record-changed-question-remains-unresolved':'retained-unresolved-source-question',semanticPass:false};});
 for(const candidate of candidates){const kinds=[...new Set(candidate.evidence.map(e=>e.kind))];candidate.geometryEvidenceKind=kinds.includes('actual-focus-pair')?'contains-actual-focus-pair':kinds.includes('mixed-focus-and-locator-pair')?'contains-mixed-focus-and-locator-pair':kinds.length===1?`only-${kinds[0]}`:'mixed-locator-evidence';}
 const reviewResults=reviews.map((review,index)=>{
  const provenanceFinding=knownFindings.find(f=>f.kind==='source-provenance-metadata-mismatch'&&f.id===review.supersedes),typedFinding=knownFindings.find(f=>f.kind==='typed-content-mismatch'&&f.id===review.supersedes),provenanceState=provenanceFinding?provenanceArtifactValue(review.provenanceArtifact,provenanceArtifacts):null;
  const match=Array.isArray(review.records)&&review.records.length>0&&review.records.every(ref=>{const r=byUid.get(ref.uid),focusFinding=knownFindings.find(f=>['duplicate-wrong-row-focus','wrong-row-focus-independent-source-review'].includes(f.kind)&&f.id===review.supersedes&&f.records.some(fr=>fr.uid===ref.uid)),contextFinding=knownFindings.find(f=>contextFindingKinds.has(f.kind)&&f.id===review.supersedes&&f.records.some(fr=>fr.uid===ref.uid)),frozenContextRef=contextFinding?.records.find(fr=>fr.uid===ref.uid),requiresEvidence=Boolean(frozenContextRef?.contextEvidenceSha256||r?.contextEvidenceSha256);return r&&r.rowIdentitySha256===ref.rowIdentitySha256&&r.focusGeometrySha256===ref.focusGeometrySha256&&(!focusFinding||(ref.focusPhysicalFingerprintVersion===r.focusPhysicalFingerprintVersion&&ref.focusPhysicalGeometrySha256===r.focusPhysicalGeometrySha256))&&(!ref.annotationSha256||ref.annotationSha256===r.annotationSha256)&&(!ref.contextGeometrySha256||ref.contextGeometrySha256===r.contextGeometrySha256)&&(!ref.recordSha256||ref.recordSha256===r.recordSha256)&&(!ref.contextEvidenceSha256||ref.contextEvidenceSha256===r.contextEvidenceSha256)&&(!contextFinding||!requiresEvidence||(Boolean(r.contextEvidenceSha256)&&Boolean(ref.contextEvidenceSha256)&&ref.contextEvidenceSha256===r.contextEvidenceSha256&&Boolean(r.contextPhysicalEvidenceSha256)&&ref.contextPhysicalFingerprintVersion===r.contextPhysicalFingerprintVersion&&ref.contextPhysicalFingerprintVersion===r.contextPhysicalFingerprintVersion&&ref.contextPhysicalEvidenceSha256===r.contextPhysicalEvidenceSha256))&&(!typedFinding||typedContentRepairMatches(typedFinding,ref,r))&&(!provenanceFinding||provenanceReviewMatchesFinding(review,provenanceFinding,provenanceArtifacts,byUid));});
  const bytes=reviewEvidence.get(review.evidence?.path),evidenceStatus=bytes===undefined?'unavailable':hash(bytes)===review.evidence?.sha256?'hash-matched':'hash-mismatch',typedContractMatch=!typedFinding||typedFinding.id!==uaDoubleStarFindingId||exactUaDoubleStarReviewMatches(review,typedFinding,byUid);
  const accepted=match&&typedContractMatch&&new Set(review.records.map(r=>r.uid)).size===review.records.length&&review.independent===true&&evidenceStatus==='hash-matched'&&['legitimate-shared-row-alias','legitimate-shared-passage','source-reviewed-repair','source-reviewed-qualified-representation'].includes(review.disposition);
  if(accepted)for(const c of candidates)if((['legitimate-shared-row-alias','legitimate-shared-passage'].includes(review.disposition)||(review.disposition==='source-reviewed-repair'&&review.adjudicatesDuplicateCandidateIds?.includes(c.id)))&&c.records.length===review.records.length&&c.records.every(uid=>review.records.some(r=>r.uid===uid))){c.status=review.disposition;c.reviewId=review.id;}
  return {id:review.id,index,status:accepted?'current-explicit-review':'stale-or-incomplete-review',disposition:review.disposition,evidenceStatus,...(provenanceState?{provenanceArtifactStatus:provenanceState.status}: {})};
 });
 const known=knownFindings.map(f=>{
  const current=f.records.map(ref=>byUid.get(ref.uid)),sameIdentity=current.every((r,i)=>r&&r.rowIdentitySha256===f.records[i].rowIdentitySha256),sameFocus=sameIdentity&&current.every((r,i)=>{const before=frozenFocusPhysicalWindows(f.records[i].uid),after=r?recordFocusPhysicalWindows(r):[];return before?.length&&after.length?canonical(before)===canonical(after):r?.focusGeometrySha256===f.records[i].focusGeometrySha256;});
  const markerKind=['missing-source-marker','source-marker-association-mismatch'].includes(f.kind),contextKind=contextFindingKinds.has(f.kind),contentKind=['typed-content-mismatch','unresolved-source-scope'].includes(f.kind),provenanceKind=f.kind==='source-provenance-metadata-mismatch',focusKind=['duplicate-wrong-row-focus','wrong-row-focus-independent-source-review'].includes(f.kind),focusChangedForRepair=focusKind&&focusChangedSinceFinding(f,current);
  const correctMarkers=r=>f.kind==='source-marker-association-mismatch'?canonical([...(r.annotations['/footnoteMarkers']||[])].sort())===canonical([...f.expectedMarkers].sort()):(r.annotations['/footnoteMarkers']||[]).includes(f.expectedMarker);
  const acceptedRepair=reviews.some((review,index)=>review.disposition==='source-reviewed-repair'&&review.supersedes===f.id&&reviewResults[index]?.status==='current-explicit-review'&&f.records.every(ref=>review.records.some(r=>r.uid===ref.uid))&&(!focusKind||(focusChangedForRepair&&current.every(r=>r&&recordFocusPhysicalWindows(r).length>0)))&&(!contextKind||contextChangedSinceFinding(f,current,contextMigrationBridgeEntries,review))&&current.every((r,i)=>{if(!r)return false;const ref=review.records.find(ref=>ref.uid===r.uid);if(!ref)return false;const old=f.records[i],frozenContextEvidence=Boolean(old.contextEvidenceSha256),currentContextEvidence=Boolean(r.contextEvidenceSha256),migration=contextMigrationBridgeEntries.get(`${f.id}:${r.uid}`),contextBound=frozenContextEvidence?(hasValidDeclaredContextEvidence(r)&&currentContextEvidence&&ref.contextEvidenceSha256===r.contextEvidenceSha256&&r.contextPhysicalEvidenceSha256&&ref.contextPhysicalEvidenceSha256===r.contextPhysicalEvidenceSha256):currentContextEvidence?Boolean(migration&&hasValidDeclaredContextEvidence(r)&&migration.newContextPhysicalFingerprintVersion===r.contextPhysicalFingerprintVersion&&migration.newContextFingerprintVersion===r.contextFingerprintVersion&&migration.oldRowIdentitySha256===old.rowIdentitySha256&&migration.oldFocusGeometrySha256===old.focusGeometrySha256&&migration.oldContextGeometrySha256===old.contextGeometrySha256&&r.rowIdentitySha256===old.rowIdentitySha256&&r.contextPhysicalEvidenceSha256!==migration.newContextPhysicalEvidenceSha256&&ref.contextEvidenceSha256===r.contextEvidenceSha256&&ref.contextPhysicalFingerprintVersion===r.contextPhysicalFingerprintVersion&&ref.contextPhysicalEvidenceSha256===r.contextPhysicalEvidenceSha256&&ref.contextGeometrySha256===r.contextGeometrySha256):hasValidLegacyContextGeometry(r)&&ref.contextGeometrySha256===r.contextGeometrySha256,requiredExtentBound=!f.requiredContextExtent||(r.contextEvidence&&checkRequiredContextExtent(r.contextEvidence,f.requiredContextExtent).complete);return (!markerKind||(correctMarkers(r)&&ref.annotationSha256===r.annotationSha256))&&(!contextKind||contextBound&&requiredExtentBound)&&(!(f.kind==='typed-content-mismatch')||typedContentRepairMatches(f,ref,r))&&(!contentKind||ref.recordSha256===r.recordSha256); }));
  const acceptedProvenanceRepair=provenanceKind&&reviews.some((review,index)=>review.disposition==='source-reviewed-repair'&&review.supersedes===f.id&&review.independent===true&&reviewResults[index]?.status==='current-explicit-review'&&review.records.length===f.records.length&&f.records.every(ref=>review.records.some(r=>r.uid===ref.uid))&&provenanceReviewMatchesFinding(review,f,provenanceArtifacts,byUid));
  const qualifiedRepresentation=f.kind==='unresolved-source-scope'&&reviews.some((review,index)=>review.disposition==='source-reviewed-qualified-representation'&&review.supersedes===f.id&&reviewResults[index]?.status==='current-explicit-review'&&review.underlyingSourceQuestion?.status==='unresolved'&&review.semanticPass===false&&f.records.every(ref=>review.records.some(r=>r.uid===ref.uid))&&current.every((r,i)=>r&&typedContentRepairMatches(f,review.records.find(ref=>ref.uid===r.uid),r)));
  const metadataMatch=f.kind==='missing-source-marker'&&sameIdentity&&current[0]&&!(current[0].annotations['/footnoteMarkers']||[]).includes(f.expectedMarker);
  const provenanceState=provenanceKind?provenanceArtifactValue(f.provenanceArtifact,provenanceArtifacts):null;
  const sameProvenanceRecord=sameIdentity&&sameFocus&&current.every((r,i)=>r&&f.records[i].recordSha256&&r.recordSha256===f.records[i].recordSha256);
  const provenanceStatus=()=>{
   if(!sameIdentity)return 'record-identity-changed-needs-source-review';
   if(!sameFocus)return 'focus-changed-needs-source-review';
   if(!sameProvenanceRecord)return 'record-content-reference-missing-or-changed-needs-source-review';
   if(provenanceState?.status==='provenance-artifact-unavailable')return 'provenance-artifact-unavailable-needs-source-review';
   if(provenanceState?.status!=='hash-matched')return `provenance-${provenanceState?.status||'artifact-reference-invalid'}-needs-source-review`;
   const target=f.provenanceArtifact;
   if(canonical(provenanceState.value)===canonical(target.observedValue)&&canonical(provenanceState.value)!==canonical(f.expectedValue))return 'confirmed-source-provenance-metadata-mismatch';
   return 'provenance-target-value-changed-needs-source-review';
  };
  const contextStatus=()=>{
   if(f.records.some((ref,i)=>ref.contextEvidenceSha256&&!current[i]?.contextEvidenceSha256))return 'current-context-evidence-missing-needs-source-review';
   if(current.some((r,i)=>contextMigrationBridgeEntries.has(`${f.id}:${r?.uid}`)&&!r?.contextEvidenceSha256))return 'current-context-evidence-missing-needs-source-review';
   if(current.some(r=>r?.contextEvidenceSha256)){
    if(f.records.some((ref,i)=>current[i]?.contextEvidenceSha256&&!ref.contextEvidenceSha256)){
     const migrations=f.records.map((ref,i)=>contextMigrationBridgeEntries.get(`${f.id}:${current[i]?.uid}`));
     if(migrations.some((migration,i)=>!migration||migration.oldRowIdentitySha256!==f.records[i].rowIdentitySha256||migration.oldFocusGeometrySha256!==f.records[i].focusGeometrySha256||migration.oldContextGeometrySha256!==f.records[i].contextGeometrySha256))return 'context-evidence-reference-missing-needs-source-review';
     if(current.every((r,i)=>r.contextPhysicalEvidenceSha256===migrations[i].newContextPhysicalEvidenceSha256&&r.contextEvidence.status==='legacy-declared-context-metadata;active-targets-unassessed'))return 'legacy-context-migration-baseline-pending-source-repair';
     if(current.some(r=>r?.contextEvidenceSha256&&!hasValidDeclaredContextEvidence(r)))return 'current-context-evidence-unassessable-needs-source-review';
     return 'context-changed-needs-source-review';
    }
    if(current.some(r=>r?.contextEvidenceSha256&&!hasValidDeclaredContextEvidence(r)))return 'current-context-evidence-unassessable-needs-source-review';
    return contextCropDefectNeedsReview(f,current)||contextChangedSinceFinding(f,current,contextMigrationBridgeEntries)?'context-changed-needs-source-review':(f.kind==='source-context-crop-defect'?'confirmed-source-context-crop-defect':'confirmed-source-note-context-defect');
   }
   if(!current.every(hasValidLegacyContextGeometry))return 'current-context-geometry-missing-needs-source-review';
   return current.every((r,i)=>r.contextGeometrySha256===f.records[i].contextGeometrySha256)?(f.kind==='source-context-crop-defect'?'confirmed-source-context-crop-defect':'confirmed-source-note-context-defect'):'context-changed-needs-source-review';
  };
  const status=qualifiedRepresentation?'explicit-source-reviewed-qualified-representation':acceptedProvenanceRepair?'explicit-source-reviewed-provenance-repair':acceptedRepair&&f.kind!=='unresolved-source-scope'?'explicit-source-reviewed-repair':provenanceKind?provenanceStatus():!sameIdentity?'record-identity-changed-needs-source-review':f.kind==='source-marker-association-mismatch'?(current.every(r=>!correctMarkers(r))?'confirmed-source-marker-association-mismatch':'annotation-changed-needs-source-review'):f.kind==='missing-source-marker'?(metadataMatch?'confirmed-source-marker-omission':'annotation-changed-needs-source-review'):contextKind?contextStatus():contentKind?(current.every((r,i)=>r.recordSha256===f.records[i].recordSha256)?(f.kind==='unresolved-source-scope'?'unresolved-source-scope':'confirmed-typed-content-mismatch'):'content-changed-needs-source-review'):sameFocus?'confirmed-wrong-row-focus':'focus-changed-needs-source-review';
  if(status==='confirmed-wrong-row-focus')for(const c of candidates)if(c.records.length===f.records.length&&c.records.every(uid=>f.records.some(ref=>ref.uid===uid))){c.status='confirmed-wrong-row-focus';c.knownFindingId=f.id;}
  return {...f,status,...(f.kind==='unresolved-source-scope'?{extractionRepresentation:qualifiedRepresentation?'independently-reviewed-qualified-representation':'pending',underlyingSourceQuestion:{status:'unresolved'},semanticPass:false}:{}),...(provenanceState?{currentProvenanceArtifactStatus:provenanceState.status,currentProvenanceValue:provenanceState.value}:{}),currentRecords:current.map(r=>r?{uid:r.uid,rowIdentitySha256:r.rowIdentitySha256,focusGeometrySha256:r.focusGeometrySha256,contextGeometrySha256:r.contextGeometrySha256,...(r.contextEvidenceSha256?{contextEvidenceSha256:r.contextEvidenceSha256,contextFingerprintVersion:r.contextFingerprintVersion,contextPhysicalFingerprintVersion:r.contextPhysicalFingerprintVersion,contextPhysicalEvidenceSha256:r.contextPhysicalEvidenceSha256}:{}),annotationSha256:r.annotationSha256,recordSha256:r.recordSha256}:null)};
 });
 const overlaps=[];
 if(includeOverlaps){
  const frames=new Map();for(const r of records)for(const g of r.geometry.filter(g=>focusRoles.has(g.role)&&g.frame&&g.validShape)){if(!frames.has(g.frame))frames.set(g.frame,[]);frames.get(g.frame).push({r,g});}
  const seen=new Set();for(const list of frames.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const {r:a,g:x}=list[i],{r:b,g:y}=list[j];if(a.uid===b.uid||canonical(x.bounds)===canonical(y.bounds))continue;const width=Math.min(x.bounds[2],y.bounds[2])-Math.max(x.bounds[0],y.bounds[0]),height=Math.min(x.bounds[3],y.bounds[3])-Math.max(x.bounds[1],y.bounds[1]);if(width<=0||height<=0)continue;const key=[a.uid,b.uid].sort().join('|')+'|'+x.frame;if(seen.has(key))continue;seen.add(key);overlaps.push({records:[a.uid,b.uid],space:x.space,frame:x.frame,intersectionArea:width*height,status:'optional-overlap-candidate-not-row-identity-proof'});}
 }
 const countBy=(rows,key)=>rows.reduce((c,r)=>(c[r[key]]=(c[r[key]]||0)+1,c),{}),unresolvedKnown=known.filter(f=>!['explicit-source-reviewed-repair','explicit-source-reviewed-qualified-representation','explicit-source-reviewed-provenance-repair'].includes(f.status));
 const identityCompleteness=Object.fromEntries(['label','group','ordinalOrDice','sourceHash','sourceBook','sourcePdfPage'].map(key=>[key,{recorded:records.filter(r=>r.identityCompleteness[key]).length,missing:records.filter(r=>!r.identityCompleteness[key]).length}]));
 const contextEvidenceRecords=records.filter(r=>r.contextEvidence),uaContextRecords=contextEvidenceRecords.filter(r=>r.contextEvidence.fingerprintVersion===uaContextFingerprintVersion);
 const contextAssets=e=>[...(e.crops||[]),...(e.sourceContextParts||[]),...(e.supplementalContextCrops||[])];
 const sourceForContextAsset=(e,asset)=>asset.source??e.sourceContextParts?.find(part=>part.cropId===asset.cropId)?.source??e.supplementalContextCrops?.find(crop=>crop.cropId===asset.cropId)?.source??e.sourceFrame;
 const sourcePageIdentity=source=>source?.book&&/^[a-f0-9]{64}$/.test(source.sourcePdfSha256||'')&&Number.isInteger(source.printedPage)&&source.printedPage>0&&Number.isInteger(source.pdfPage)&&source.pdfPage>0?{book:source.book,sourcePdfSha256:source.sourcePdfSha256,printedPage:source.printedPage,pdfPage:source.pdfPage}:null;
 const contextEvidenceCoverage={fingerprintVersion:monetaryContextFingerprintVersion,records:contextEvidenceRecords.length,recordsBySurface:countBy(contextEvidenceRecords,'surface'),recordsByFingerprintVersion:countBy(contextEvidenceRecords.map(r=>({version:r.contextEvidence.fingerprintVersion})),'version'),status:countBy(contextEvidenceRecords.map(r=>({status:r.contextEvidence.status})),'status'),statusBySurface:Object.fromEntries([...new Set(contextEvidenceRecords.map(r=>r.surface))].map(surface=>[surface,countBy(contextEvidenceRecords.filter(r=>r.surface===surface).map(r=>({status:r.contextEvidence.status})),'status')])),uniqueCropIds:new Set(contextEvidenceRecords.flatMap(r=>contextAssets(r.contextEvidence).map(c=>c.cropId).filter(id=>typeof id==='string'&&id))).size,uniqueSourcePdfPageFrames:new Set(contextEvidenceRecords.flatMap(r=>{const e=r.contextEvidence;return [e.sourceFrame,...contextAssets(e).map(asset=>sourceForContextAsset(e,asset))].map(sourcePageIdentity).filter(Boolean).map(canonical);})).size,uaActiveTargetProjection:{records:uaContextRecords.length,status:countBy(uaContextRecords.map(r=>({status:r.contextEvidence.status})),'status'),activeTargetStatus:countBy(uaContextRecords.map(r=>({status:r.contextEvidence.activeTargetStatus||'not-recorded'})),'status'),declaredLinks:uaContextRecords.reduce((n,r)=>n+r.contextEvidence.declaredLinks.length,0),resolvedTargets:uaContextRecords.reduce((n,r)=>n+r.contextEvidence.crops.length,0),uniqueSourcePdfPageFrames:new Set(uaContextRecords.flatMap(r=>r.contextEvidence.crops.map(c=>canonical(c.source)))).size}};
 return {schemaVersion:1,generatedBy:'tools/monetary-row-identity-audit.mjs',scope:'Complete recorded monetary source surfaces named by the input manifest. Exact duplicate foci across different declared labels/ordinals are review candidates. Numeric in-bounds geometry and a negative duplicate result never prove the physical source row, variant, value or qualifier.',contextEvidenceCoverage,uaActiveContextTargetInventory,counts:{records:records.length,recordsBySurface:countBy(records,'surface'),geometry:records.reduce((n,r)=>n+r.geometry.length,0),geometryByStatus:countBy(records,'geometryStatus'),duplicateCandidates:candidates.length,duplicateGeometryEvidenceKind:countBy(candidates,'geometryEvidenceKind'),identityCompleteness,duplicateStatus:countBy(candidates,'status'),sameDeclaredIdentityEchoes:echoes.length,unhandledGeometry:records.reduce((n,r)=>n+r.unhandledGeometry.length,0),knownFindings:known.length,knownFindingStatus:countBy(known,'status'),optionalOverlapCandidates:overlaps.length,annotationRecords:records.filter(r=>Object.keys(r.annotations).length).length,retainedSourceUncertainties:currentUncertainties.length},validation:{valid:errors.length===0&&unresolvedKnown.length===0,structuralErrors:errors,unresolvedKnownFindingIds:unresolvedKnown.map(f=>f.id),unresolvedSourceScopeFindingIds:known.filter(f=>f.kind==='unresolved-source-scope').map(f=>f.id),retainedUnresolvedSourceQuestionIds:currentUncertainties.map(u=>u.id),semanticRowIdentityComplete:false,policy:'Only current explicit source reviews adjudicate candidates or supersede known defects. Changed/missing recipes do not automatically resolve a known finding. No finding-free semantic pass is inferred.'},records,duplicateCandidates:candidates,sameDeclaredIdentityEchoes:echoes,knownFindings:known,retainedUncertainties:currentUncertainties,reviewResults,optionalOverlapCandidates:overlaps,limitations:['No automatic pass for row identity, absence of source markers, quantities, monetary meaning or source-value correctness.','All default duplicate candidates and repeated identities remain unassessed unless an exact independent disposition is supplied.','Coordinates in different source/render/image frames are never compared as if they were the same space.','Context crops and whole-page discovery bounds are not promoted to precise physical-row highlights.','PHB/DMG contextEvidence hashes declared crop metadata and source frames separately from legacy contextGeometrySha256; they do not certify source pixels or semantic focus.','UA group active context targets have a separate versioned crop/source/render inventory and do not alter legacy row-highlight geometry or hashes.','The before-adapter PHB/DMG hash([]) contextGeometrySha256 values reflect omitted crop metadata, not absent or complete source context.','Duplicate candidates explicitly separate actual focus pairs from row and passage locators; locator duplicates are not highlight defects.','Source occurrences, table rows, pointer links, comparison uses and site price claims retain separate denominators.']};
}

export function loadMonetaryRowIdentityAudit({repoRoot=root,snapshotDir=null,findingsPath='research/monetary-row-identity-findings.json',baselinePath=undefined,reviewsPath='research/monetary-row-identity-reviews.json',includeOverlaps=false}={}){
 const documents=new Map(monetaryRowIdentityInputs.map(config=>{const bytes=snapshotDir?gunzipSync(readFileSync(resolve(snapshotDir,'inputs',basename(config.path)+'.gz'))):readFileSync(resolve(repoRoot,config.path));return [config.key,{...config,sha256:hash(bytes),data:JSON.parse(bytes)}];}));
 const {records,coverage,uaActiveContextTargetInventory}=collectMonetaryRowIdentityRecords(documents),relativePath=path=>{if(typeof path!=='string'||path.startsWith('/')||path.split('/').includes('..'))throw Error('Invalid monetary finding/evidence path');return path;};
 let baseline={},extensions=[],findingManifest=null,retainedUncertainties=[],contextMigrationBridge=null,contextMigrationBridgeEntries=new Map();
 if(findingsPath===null){if(baselinePath!==null)throw Error('Initial/historical capture must explicitly omit both finding manifest and baseline');}
 else{
  findingManifest=JSON.parse(readFileSync(resolve(repoRoot,findingsPath)));
  if(findingManifest.schemaVersion!==1||!findingManifest.baseline||!Array.isArray(findingManifest.extensions))throw Error('Invalid mandatory monetary findings manifest');
  relativePath(findingManifest.baseline.path);
  const bytes=readFileSync(resolve(repoRoot,baselinePath??findingManifest.baseline.path));if(hash(bytes)!==findingManifest.baseline.sha256)throw Error('Immutable monetary baseline hash mismatch');baseline=JSON.parse(bytes);
  if(!Array.isArray(baseline.reviewDispositions?.knownFindings)||!baseline.reviewDispositions.knownFindings.length)throw Error('Missing immutable known monetary row-identity findings');
  extensions=findingManifest.extensions.map(ref=>{
   relativePath(ref.path);const bytes=readFileSync(resolve(repoRoot,ref.path));if(hash(bytes)!==ref.sha256)throw Error(`Stale monetary source-finding extension: ${ref.path}`);
   const extension=JSON.parse(bytes);if(!Array.isArray(extension.knownFindings))throw Error(`Missing monetary source findings: ${ref.path}`);
   if(extension.baseline?.path!==findingManifest.baseline.path||extension.baseline?.sha256!==findingManifest.baseline.sha256)throw Error(`Monetary extension baseline identity mismatch: ${ref.path}`);
   return {...ref,knownFindings:extension.knownFindings};
  });
  if(findingManifest.retainedUncertainties){const ref=findingManifest.retainedUncertainties;relativePath(ref.path);const bytes=readFileSync(resolve(repoRoot,ref.path));if(hash(bytes)!==ref.sha256)throw Error('Retained monetary uncertainty register hash mismatch');const register=JSON.parse(bytes);if(register.baseline?.path!==findingManifest.baseline.path||register.baseline?.sha256!==findingManifest.baseline.sha256||!Array.isArray(register.uncertainties))throw Error('Retained monetary uncertainty baseline/schema mismatch');retainedUncertainties=register.uncertainties;}
 }
 const reviews=reviewsPath===null?{reviews:[]}:JSON.parse(readFileSync(resolve(repoRoot,reviewsPath)));
 if(!Array.isArray(reviews.reviews))throw Error('Invalid monetary row-identity review manifest');
 const reviewEvidence=new Map();for(const review of reviews.reviews){relativePath(review.evidence?.path);const bytes=readFileSync(resolve(repoRoot,review.evidence.path));if(hash(bytes)!==review.evidence.sha256)throw Error(`Stale monetary review evidence: ${review.id}`);reviewEvidence.set(review.evidence.path,bytes);}
 const knownFindings=[...(baseline.reviewDispositions?.knownFindings||[]),...extensions.flatMap(e=>e.knownFindings)],knownIds=new Set();for(const f of knownFindings){if(knownIds.has(f.id))throw Error(`Duplicate known monetary source finding: ${f.id}`);knownIds.add(f.id);}
 if(findingManifest?.contextMigrationBridge){const ref=findingManifest.contextMigrationBridge;relativePath(ref.path);const bytes=readFileSync(resolve(repoRoot,ref.path));contextMigrationBridge=validateUaContextMigrationBridge({bridge:JSON.parse(bytes.toString('utf8')),bridgeBytes:bytes,bridgeRef:ref,findingManifest,repoRoot,knownFindings});contextMigrationBridgeEntries=contextMigrationBridge.entries;}
 const provenanceArtifacts=new Map(),provenancePaths=new Set([...knownFindings.filter(f=>f.kind==='source-provenance-metadata-mismatch').map(f=>f.provenanceArtifact?.path),...reviews.reviews.map(r=>r.provenanceArtifact?.path)].filter(Boolean));
 for(const rel of provenancePaths){relativePath(rel);try{provenanceArtifacts.set(rel,readFileSync(resolve(repoRoot,rel)));}catch(error){if(error?.code!=='ENOENT')throw error;}}
 const report=auditMonetaryRowIdentity(records,{knownFindings,reviews:reviews.reviews,reviewEvidence,provenanceArtifacts,retainedUncertainties,includeOverlaps,uaActiveContextTargetInventory,contextMigrationBridgeEntries});
 return {...report,inputManifest:[...documents.values()].map(({data,...meta})=>meta),coverage,contextMigrationBridgeStatus:contextMigrationBridge?{path:contextMigrationBridge.bridgePath,sha256:contextMigrationBridge.bridgeSha256,validatedEntries:contextMigrationBridge.entries.size,snapshot:{path:contextMigrationBridge.snapshotPath,sha256:contextMigrationBridge.snapshotSha256}}:'not-provided; legacy UA findings remain pending without a versioned context reference',knownFindingInputStatus:findingsPath===null?'explicitly-unavailable-for-initial-or-historical-capture':'immutable-baseline-and-mandatory-extensions-loaded',mandatoryFindings:findingsPath===null?null:{path:findingsPath,sha256:hash(readFileSync(resolve(repoRoot,findingsPath))),baseline:findingManifest.baseline},findingExtensions:extensions.map(({knownFindings,...meta})=>meta)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];},snapshotDir=value('--snapshot-dir'),output=resolve(value('--output')||'/tmp/monetary-row-identity-audit.json');
 const report=loadMonetaryRowIdentityAudit({snapshotDir,reviewsPath:value('--reviews')||'research/monetary-row-identity-reviews.json',includeOverlaps:args.includes('--overlaps')});mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,counts:report.counts,coverage:report.coverage,validation:report.validation}));if(args.includes('--check')&&!report.validation.valid)process.exitCode=1;
}
