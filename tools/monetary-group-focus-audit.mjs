// Duplicate authored table-row recipes must agree. Agreement is not source proof.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const sha=value=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
const escape=value=>String(value).replaceAll('~','~0').replaceAll('/','~1');
function differences(a,b,path='') {
 if(canonical(a)===canonical(b))return [];
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b))return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>differences(a[key],b[key],`${path}/${escape(key)}`));
 return [{path,before:a===undefined?null:a,after:b===undefined?null:b,beforePresent:a!==undefined,afterPresent:b!==undefined}];
}
const sourceIdentity=source=>({book:source?.bookKey??source?.book??null,sha256:source?.sourceFileSha256??source?.sourcePdfSha256??null,printedPage:source?.printedPage??null,pdfPage:source?.pdfPage??null});
function declarationSlots(data){
 const slots=new Map(),groupFocusPaths=new Set();
 const keys=container=>container&&typeof container==='object'&&!Array.isArray(container)?['focusBoundsCropPixelsLTRB','focusRectsCropPixelsLTRB'].filter(key=>Object.hasOwn(container,key)):[];
 const register=(container,pointer,scope)=>{
  const fields=keys(container);if(fields.length!==1)return;
  slots.set(`${pointer}/${fields[0]}`,{scope,containerPointer:pointer});
 };
 for(const[gi,group]of data.review.groups.entries())if(Array.isArray(group.tableRows))for(const[ti,row]of group.tableRows.entries()){
  const pointer=`/review/groups/${gi}/tableRows/${ti}/focus`;groupFocusPaths.add(pointer);register(row?.focus,pointer,'grouped-row');
 }
 for(const[ri,row]of data.review.sourceRowsOrClaims.entries()){
  const pointer=`/review/sourceRowsOrClaims/${ri}`;register(row.focus,`${pointer}/focus`,'primary-row');
  if(Array.isArray(row.sourceContextParts))for(const[pi,part]of row.sourceContextParts.entries()){
   const partPointer=`${pointer}/sourceContextParts/${pi}`;
   if(keys(part).length&&keys(part?.focus).length)continue;
   register(part,partPointer,'ordered-part');register(part?.focus,`${partPointer}/focus`,'ordered-part');
  }
 }
 register(data.additionalReferenceSheetReview?.unholyWaterVariantOfferReview?.focus,'/additionalReferenceSheetReview/unholyWaterVariantOfferReview/focus','reference-comparator');
 return {slots,groupFocusPaths};
}
function declarations(value,slots,path='',out=[]) {
 if(Array.isArray(value))value.forEach((child,index)=>declarations(child,slots,`${path}/${index}`,out));
 else if(value&&typeof value==='object')for(const[key,child]of Object.entries(value)){
  const pointer=`${path}/${escape(key)}`;
  if(['focusBoundsCropPixelsLTRB','focusRectsCropPixelsLTRB'].includes(key)){
   const slot=slots.get(pointer);out.push({pointer,kind:key,value:structuredClone(child),sha256:sha(child),scope:slot?.scope??'other-declaration-needs-classification',containerPointer:slot?.containerPointer??null,mappingStatus:slot?'recognized-declaration-slot':'unmapped-declaration-slot',...(!slot?{reason:'Geometry is outside the exact supported group-row, primary-focus, ordered-part or comparator focus containers.'}:{})});
  }
  declarations(child,slots,pointer,out);
 }
 return out;
}
function groupFoci(value,path='',out=[]) {
 if(Array.isArray(value))value.forEach((child,index)=>groupFoci(child,`${path}/${index}`,out));
 else if(value&&typeof value==='object')for(const[key,child]of Object.entries(value)){
  if(key==='focus')out.push({pointer:`${path}/focus`,parent:value,focus:child});
  else groupFoci(child,`${path}/${escape(key)}`,out);
 }
 return out;
}
function primaryFor(group,parent,rows){
 const cohort=rows.filter(row=>row.groupId===group.recordId);
 if(group.recordId==='phb-assassination-fees'&&Number.isInteger(parent.assassinLevel))return cohort.filter(row=>row.sourceKind==='fee-matrix-row'&&row.objectOrSubject===`assassin level ${parent.assassinLevel} fee row`);
 if(group.recordId==='dmg-poison-dose-and-manufacture'&&typeof parent.route==='string'&&typeof parent.poisonClass==='string')return cohort.filter(row=>row.sourceKind==='poison-price-row'&&row.objectOrSubject===`${parent.route} poison class ${parent.poisonClass}`&&row.conditions?.route===parent.route);
 return [];
}
function target(focus,source,crops){
 if(!focus||typeof focus!=='object'||Array.isArray(focus))return null;
 const single=Object.hasOwn(focus,'focusBoundsCropPixelsLTRB'),multiple=Object.hasOwn(focus,'focusRectsCropPixelsLTRB');
 if(single===multiple)return null;
 const crop=crops.get(focus.contextCropId),rectangles=single?[focus.focusBoundsCropPixelsLTRB]:focus.focusRectsCropPixelsLTRB;
 const pair=value=>Array.isArray(value)&&value.length===2&&value.every(n=>Number.isInteger(n)&&n>0),bounds=crop?.cropBoundsPixelsLTRB;
 if(!crop||!pair(crop.sourceRenderDimensionsPx)||!pair(crop.cropDimensionsPx)||!/^[a-f0-9]{64}$/.test(crop.sourceRenderSha256||'')||!/^[a-f0-9]{64}$/.test(crop.cropSha256||'')||!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isInteger)||bounds[0]<0||bounds[1]<0||bounds[2]>crop.sourceRenderDimensionsPx[0]||bounds[3]>crop.sourceRenderDimensionsPx[1]||bounds[2]-bounds[0]!==crop.cropDimensionsPx[0]||bounds[3]-bounds[1]!==crop.cropDimensionsPx[1]||typeof focus.coordinateSpace!=='string'||!focus.coordinateSpace)return null;
 if(!Array.isArray(rectangles)||rectangles.length<(multiple?2:1)||rectangles.some(rect=>!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite)||rect[0]<0||rect[1]<0||rect[2]<=rect[0]||rect[3]<=rect[1]||rect[2]>crop.cropDimensionsPx[0]||rect[3]>crop.cropDimensionsPx[1]))return null;
 const s=sourceIdentity(source);if(!s.book||!/^[a-f0-9]{64}$/.test(s.sha256||'')||!Number.isInteger(s.pdfPage)||s.pdfPage<1||!Number.isInteger(s.printedPage)||s.printedPage<1)return null;
 return {source:s,cropId:focus.contextCropId,sourceRenderSha256:crop.sourceRenderSha256??null,sourceRenderDimensionsPx:crop.sourceRenderDimensionsPx??null,cropBoundsPixelsLTRB:crop.cropBoundsPixelsLTRB??null,cropDimensionsPx:crop.cropDimensionsPx??null,cropSha256:crop.cropSha256??null,coordinateSpace:focus.coordinateSpace??null,rectangles};
}
export function auditMonetaryGroupFocus(data){
 const rows=data?.review?.sourceRowsOrClaims,groups=data?.review?.groups,cropRows=data?.review?.evidenceCrops;
 if(!Array.isArray(rows)||!Array.isArray(groups)||!Array.isArray(cropRows))throw Error('Monetary group focus audit requires source rows, groups and evidence crops.');
 if(new Set(rows.map(row=>row.sourceRowOrClaimId)).size!==rows.length||rows.some(row=>typeof row.sourceRowOrClaimId!=='string'||!row.sourceRowOrClaimId))throw Error('Duplicate or missing primary monetary row identity.');
 if(new Set(groups.map(group=>group.recordId)).size!==groups.length||groups.some(group=>typeof group.recordId!=='string'||!group.recordId))throw Error('Duplicate or missing monetary group identity.');
 if(new Set(cropRows.map(row=>row.cropId)).size!==cropRows.length)throw Error('Duplicate monetary evidence crop identity.');
 const crops=new Map(cropRows.map(c=>[c.cropId,c])),{slots,groupFocusPaths}=declarationSlots(data),inventory=declarations(data,slots),duplicates=[];
 for(const[gi,group]of groups.entries())for(const declared of groupFoci(group,`/review/groups/${gi}`)){
  const supportedPath=groupFocusPaths.has(declared.pointer),matches=primaryFor(group,declared.parent,rows),row=matches.length===1?matches[0]:null,ri=row?rows.indexOf(row):null,a=target(declared.focus,group.source,crops),b=row?target(row.focus,row.source,crops):null,aligned=Boolean(supportedPath&&row&&a&&b),geometryEqual=aligned&&canonical(a)===canonical(b),fieldDiffs=row?differences(declared.focus,row.focus):[];
  duplicates.push({groupId:group.recordId,groupFocusPointer:declared.pointer,mainRowId:row?.sourceRowOrClaimId??null,mainFocusPointer:row?`/review/sourceRowsOrClaims/${ri}/focus`:null,alignment:!supportedPath?'unsupported-group-focus-container':matches.length!==1?(matches.length?'multiple-primary-row-matches':'no-supported-exact-source-row-match'):!a||!b?'source-or-focus-frame-unassessable':'exact-printed-row-identity-match',category:!aligned?'cannot-align':geometryEqual&&fieldDiffs.length===0?'matching':'differing',sourceGeometryCategory:!aligned?'cannot-align':geometryEqual?'matching':'differing',fullFocusObjectEqual:aligned&&fieldDiffs.length===0,allAuthoredFocusFieldDifferences:fieldDiffs,sourceTargetDifferences:aligned?differences(a,b):[],groupFocus:structuredClone(declared.focus),mainFocus:row?structuredClone(row.focus):null,groupTarget:a,mainTarget:b,sourcePixelCorrectness:'unassessed-by-duplicate-consistency-audit'});
 }
 const byPrimary=new Map();for(const duplicate of duplicates)if(duplicate.mainRowId&&groupFocusPaths.has(duplicate.groupFocusPointer)){
  const key=`${duplicate.groupId}:${duplicate.mainRowId}`;if(!byPrimary.has(key))byPrimary.set(key,[]);byPrimary.get(key).push(duplicate);
 }
 for(const entries of byPrimary.values())if(entries.length>1)for(const entry of entries){entry.category='cannot-align';entry.sourceGeometryCategory='cannot-align';entry.alignment='multiple-grouped-declarations-for-primary-row';entry.competingGroupedFocusPointers=entries.map(row=>row.groupFocusPointer);}
 const countBy=(items,key)=>items.reduce((out,item)=>(out[item[key]]=(out[item[key]]||0)+1,out),{}),unclassified=inventory.filter(row=>row.scope==='other-declaration-needs-classification');
 return {schemaVersion:1,artifactType:'monetary-group-focus-consistency-audit',scope:'Every authored focus rectangle declaration in this input, with every grouped focus aligned to an exact printed-row identity or left explicitly unassessable. Status and other focus fields are compared separately from physical source-target geometry. No source correctness, field value or grade is inferred.',counts:{primaryRows:rows.length,groups:groups.length,declaredFocusGeometryFields:inventory.length,declarationsByScope:countBy(inventory,'scope'),groupedFocusDuplicates:duplicates.length,byCategory:countBy(duplicates,'category'),bySourceGeometryCategory:countBy(duplicates,'sourceGeometryCategory'),metadataOnlyDifferences:duplicates.filter(d=>d.category==='differing'&&d.sourceGeometryCategory==='matching').length,unclassifiedDeclarations:unclassified.length},inventory,duplicates,validation:{consistent:duplicates.every(row=>row.category==='matching')&&unclassified.length===0,semanticCompleteness:false},limitations:['Matching duplicated recipes can both point at the wrong source row; mandatory source-reviewed primary-row findings remain separate.','Grouped-to-primary alignment uses exact semantic labels and qualifiers, never a first substring or array position. Unknown row schemas stay cannot-align.','Ordered multi-part support may legitimately use distinct passages; those declarations are inventoried but are not mistaken for duplicate grouped rows.']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];},input=value('--input')||'research/source-audit-batch5-phb-dmg-additional-prices.json',bytes=readFileSync(input),report={...auditMonetaryGroupFocus(JSON.parse(bytes)),input:{path:input,sha256:createHash('sha256').update(bytes).digest('hex')}};const output=value('--output');if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');else console.log(JSON.stringify(report,null,2));if(args.includes('--check')&&!report.validation.consistent)process.exitCode=1;
}
