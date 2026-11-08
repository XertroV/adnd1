// Read-only identity/pointer census for monetary inputs and their declared copies.
// This inventories structure and hashes only; it does not verify source meaning.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve, relative, dirname, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {monetaryRowIdentityInputs} from './monetary-row-identity-audit.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const defaultOutput='research/source-audit-batch5-monetary-mirror-inventory-before-ua-c001.json';
const inputByPath=new Map(monetaryRowIdentityInputs.map(input=>[input.path,input]));
const idsByValue=new Map();
const identityKeys=new Set(['id','recordId','receiptId','claimId','sourceRowOrClaimId','sourceRowId','sourceRecordId','sourceOccurrenceId','sourceClaimId','pointerClaimId','pointerRecordId']);
const pointerKeys=new Set(['sourceJsonPointer','sourceCensusJsonPointer','jsonPointer','sourcePointer','recordPointer','rowPointer','sourceValueJsonPointer']);
const pathKeys=new Set(['path','sourceArtifact','sourceCensusArtifact','inputPath','inputFile','artifactPath','sourceInventoryFile','existingInventoryFile','inventoryFile','file']);
const pinKeys=new Set(['sha256','sourceArtifactSha256','sourceCensusArtifactSha256','inputSha256','inventoryFileSha256','sourceInventorySha256','sourceFileSha256']);
const payloadKeys=new Set(['typedClaim','typedClaims','normalizedClaim','normalizedClaims','normalizedValue','typedValue','valueRecords','valueSemantics','monetaryClaim','sourceValue','printedValue','amountOrFormula','values','currency','formula','conditions','quantityOrScale','quantityCondition','footnoteMarkers','rawValue']);

function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:stable(value)).digest('hex');
const escapePart=value=>String(value).replace(/~/g,'~0').replace(/\//g,'~1');
const childPointer=(pointer,key)=>`${pointer}/${escapePart(key)}`;
function getPointer(value,pointer){
  if(pointer===''||pointer==='/')return pointer===''?value:undefined;
  if(typeof pointer!=='string'||!pointer.startsWith('/'))return undefined;
  return pointer.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~')).reduce((at,key)=>at&&Object.hasOwn(at,key)?at[key]:undefined,value);
}
function readJson(path){const bytes=readFileSync(resolve(root,path));return {bytes,data:JSON.parse(bytes.toString('utf8')),sha256:digest(bytes)};}
function payloadProjection(object){return Object.fromEntries(Object.entries(object||{}).filter(([key])=>payloadKeys.has(key)));}
function listJsonFiles(folder){
  const base=resolve(root,folder),out=[];
  if(!existsSync(base))return out;
  const visit=dir=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())visit(path);else if(entry.isFile()&&entry.name.endsWith('.json'))out.push(relative(root,path).replaceAll('\\','/'));}};
  visit(base);return out.sort();
}

const loaded=new Map();
for(const input of monetaryRowIdentityInputs)loaded.set(input.key,{...input,...readJson(input.path)});
function addEntity(inputKey,pointer,idField,id,kind,extra={}){
  const input=loaded.get(inputKey),value=getPointer(input.data,pointer);
  if(value===undefined)return;
  const entity={inputKey,path:input.path,sha256:input.sha256,kind,idField:idField||null,id:id??null,pointer,recordSha256:digest(value),typedPayloadSha256:digest(payloadProjection(value)),typedPayloadFields:Object.keys(payloadProjection(value)),...extra};
  if(id!==null&&id!==undefined){if(!idsByValue.has(id))idsByValue.set(id,[]);idsByValue.get(id).push({inputKey,path:input.path,pointer,idField:idField||null,kind});}
  return entity;
}
function inputEntities(key){
  const d=loaded.get(key).data,rows=[];
  const addArray=(arrayPointer,array,idField,kind,extraFn=()=>({}))=>{if(!Array.isArray(array))return;array.forEach((value,index)=>rows.push(addEntity(key,`${arrayPointer}/${index}`,idField,value?.[idField],kind,extraFn(value,index))));};
  if(key==='canonical'){
    addArray('/sourceInventories',d.sourceInventories,'id','source-inventory');
    for(let i=0;i<(d.sourceInventories||[]).length;i++){const inventory=d.sourceInventories[i];addArray(`/sourceInventories/${i}/sourceRows`,inventory.sourceRows,'id','canonical-source-row',row=>({inventoryId:inventory.id}));}
    addArray('/sourcePageCensuses',d.sourcePageCensuses,'id','embedded-census-source');
  }else if(key==='ua'){
    addArray('/groupReviews',d.groupReviews,'groupId','ua-active-context-group',group=>({activeContextTargets:group.activeContextTargets?.length||0,activeEvidenceIndex:group.sourceEvidenceIndex?.length||0}));
    addArray('/rowRecords',d.rowRecords,'recordId','ua-supplement-row');
  }else if(key==='phbDmg'){
    addArray('/review/groups',d.review?.groups,'recordId','phb-dmg-group',group=>({rowOrClaimIds:group.rowOrClaimIds||[],tableRows:Array.isArray(group.tableRows)?group.tableRows.length:group.tableRows&&typeof group.tableRows==='object'?Object.keys(group.tableRows).length:0,tableRowsHaveExplicitIdentity:Array.isArray(group.tableRows)&&group.tableRows.every(row=>['id','recordId','sourceRowOrClaimId','claimId'].some(k=>typeof row?.[k]==='string'))}));
    addArray('/review/sourceRowsOrClaims',d.review?.sourceRowsOrClaims,'sourceRowOrClaimId','phb-dmg-source-row-or-claim',row=>({groupId:row.groupId}));
  }else if(key==='passages'){
    addArray('/records',d.records,'recordId','phb-dmg-passage',record=>({sourceCensusArtifact:record.sourceCensusArtifact,sourceCensusArtifactSha256:record.sourceCensusArtifactSha256,sourceCensusJsonPointer:record.sourceCensusJsonPointer,valueRecords:record.valueRecords?.length||0}));
  }else if(key==='descriptions'){
    addArray('/newSourceDescriptionRecords',d.newSourceDescriptionRecords,'recordId','source-description',record=>({relatedSourceOccurrenceId:record.relatedSourceOccurrenceId,valueRecords:record.valueRecords?.length||0}));
    addArray('/pointerResolutionLinks',d.pointerResolutionLinks,'pointerClaimId','description-pointer-link',record=>({pointerRecordId:record.pointerRecordId,pointerCellJsonPointer:record.pointerCellJsonPointer,descriptionSourceRecordIds:record.descriptionSourceRecordIds||[]}));
  }else if(key==='receipts'){
    addArray('/claimReceipts',d.claimReceipts,'receiptId','price-discovery-receipt',record=>({sourceCensusArtifact:record.sourceCensusArtifact,sourceJsonPointer:record.sourceJsonPointer,hasInlineTypedClaim:Boolean(record.typedClaim)}));
    addArray('/censusAdjacentUnresolvedAndExclusions',d.censusAdjacentUnresolvedAndExclusions,null,'census-adjacent-receipt',record=>({sourceArtifact:record.sourceArtifact,jsonPointer:record.jsonPointer,kind:record.kind}));
    addArray('/untypedMoneyCandidateAdjudications/records',d.untypedMoneyCandidateAdjudications?.records,'candidateId','untyped-money-candidate',record=>({sourceArtifact:record.sourceArtifact,jsonPointer:record.jsonPointer}));
  }else if(key==='phbDmgCensus'){
    addArray('/records',d.records,'id','phb-dmg-census-record');
    addArray('/tableGroups',d.tableGroups,'recordId','phb-dmg-census-table-group');
  }else if(key==='uaCensus'){
    addArray('/records',d.records,null,'ua-census-record-pointer-only');
    addArray('/tableGroups',d.tableGroups,null,'ua-census-table-group-pointer-only');
  }else if(key==='monsterCensus'){
    addArray('/claims',d.claims,'id','monster-census-claim');
    addArray('/unresolvedCandidates',d.unresolvedCandidates,'id','monster-unresolved-candidate');
  }
  return rows.filter(Boolean);
}
const entities=Object.fromEntries(monetaryRowIdentityInputs.map(input=>[input.key,inputEntities(input.key)]));
const currentShaByPath=new Map([...loaded.values()].map(value=>[value.path,value.sha256]));
function refStatus(path,pin){
  if(!inputByPath.has(path))return {status:'outside-nine-authored-inputs',currentSha256:null};
  const current=currentShaByPath.get(path);
  return {status:pin===current?'matches-current':pin?'hash-mismatch-requires-role-review':'missing-hash-pin',currentSha256:current};
}
function declaredReferences(object,pointer){
  const found=[];
  for(const [key,value] of Object.entries(object||{})){
    if(pathKeys.has(key)&&typeof value==='string'&&inputByPath.has(value)){
      const pin=Object.entries(object).find(([pinKey,pinValue])=>pinKeys.has(pinKey)&&typeof pinValue==='string'&&/^[a-f0-9]{64}$/.test(pinValue))?.[1]||null;
      found.push({field:key,path:value,pinnedSha256:pin,...refStatus(value,pin),objectPointer:pointer});
    }
  }
  return found;
}
function exactIdentityHits(folderFiles,excludeFiles){
  const hits=[],refs=[],errors=[];
  for(const path of folderFiles){
    if(excludeFiles.has(path))continue;
    let data;try{data=JSON.parse(readFileSync(resolve(root,path),'utf8'));}catch(error){errors.push({path,error:String(error)});continue;}
    const fileSha=digest(readFileSync(resolve(root,path)));
    const visit=(value,pointer,parentKey=null)=>{
      if(Array.isArray(value)){value.forEach((item,index)=>visit(item,`${pointer}/${index}`,String(index)));return;}
      if(!value||typeof value!=='object')return;
      const pathRefs=declaredReferences(value,pointer);refs.push(...pathRefs.map(ref=>({file:path,fileSha256:fileSha,...ref,parentKey})));
      for(const [key,id] of Object.entries(value)){
        if(identityKeys.has(key)&&typeof id==='string'&&idsByValue.has(id)){
          const fields=Object.keys(value).filter(k=>payloadKeys.has(k));
          const hasPointer=Object.keys(value).some(k=>pointerKeys.has(k)&&typeof value[k]==='string');
          const copyClass=fields.length?'typed-content-copy':pathRefs.length||hasPointer?'refs-only':'unknown-role';
          hits.push({file:path,fileSha256:fileSha,objectPointer:pointer,idField:key,id,sourceCandidates:idsByValue.get(id),declaredPointers:Object.fromEntries(Object.entries(value).filter(([k,v])=>pointerKeys.has(k)&&typeof v==='string')),declaredInputReferences:pathRefs.map(({field,path,pinnedSha256,status})=>({field,path,pinnedSha256,status})),typedContentFields:fields,typedPayloadSha256:digest(payloadProjection(value)),objectSha256:digest(value),copyClass,parentKey});
        }
      }
      for(const [key,child] of Object.entries(value))visit(child,childPointer(pointer,key),key);
    };
    visit(data,'');
  }
  return {hits,refs,errors};
}
function aggregateIdentityHits(hits){
  const map=new Map();
  for(const hit of hits){
    const key=JSON.stringify([hit.file,hit.idField,hit.id,hit.copyClass,hit.typedContentFields,hit.typedPayloadSha256,hit.declaredPointers]);
    let group=map.get(key);
    if(!group){group={file:hit.file,idField:hit.idField,id:hit.id,copyClass:hit.copyClass,typedContentFields:hit.typedContentFields,typedPayloadSha256:hit.typedPayloadSha256,declaredPointers:hit.declaredPointers,sourceInputKeys:[...new Set(hit.sourceCandidates.map(source=>source.inputKey))],occurrenceCount:0,objectHashVariantCount:0,objectPointers:[],parentKeys:[]};map.set(key,group);}
    group.occurrenceCount++;
    if(!group.objectPointers.includes(hit.objectPointer))group.objectPointers.push(hit.objectPointer);
    if(hit.parentKey&&!group.parentKeys.includes(hit.parentKey))group.parentKeys.push(hit.parentKey);
    const hashSet=group._hashes||(group._hashes=new Set());hashSet.add(hit.objectSha256);group.objectHashVariantCount=hashSet.size;
  }
  return [...map.values()].map(group=>{delete group._hashes;return group;}).sort((a,b)=>a.file.localeCompare(b.file)||a.id.localeCompare(b.id)||a.typedPayloadSha256.localeCompare(b.typedPayloadSha256));
}
function aggregateReferences(refs){
  const map=new Map();
  for(const ref of refs){
    const file=ref.artifactPath||ref.file||null;
    const key=JSON.stringify([file,ref.path,ref.pinnedSha256||null,ref.status,ref.field||null]);
    let group=map.get(key);
    if(!group){group={artifactPath:file,path:ref.path,pinnedSha256:ref.pinnedSha256||null,currentSha256:ref.currentSha256||null,status:ref.status,referenceField:ref.field||null,occurrenceCount:0,objectPointers:[]};map.set(key,group);}
    group.occurrenceCount++;
    const pointer=ref.objectPointer||null;if(pointer&&!group.objectPointers.includes(pointer))group.objectPointers.push(pointer);
  }
  return [...map.values()].sort((a,b)=>String(a.artifactPath).localeCompare(String(b.artifactPath))||a.path.localeCompare(b.path)||String(a.pinnedSha256).localeCompare(String(b.pinnedSha256)));
}

const pointerFields=[...pointerKeys];
function topArtifactRefs(data,artifactPath){
  const refs=[];
  const visit=(value,pointer)=>{
    if(Array.isArray(value)){value.forEach((item,i)=>visit(item,`${pointer}/${i}`));return;}
    if(!value||typeof value!=='object')return;
    for(const ref of declaredReferences(value,pointer))refs.push({artifactPath,...ref});
    for(const [key,child]of Object.entries(value))visit(child,childPointer(pointer,key));
  };
  visit(data,'');return refs;
}
function receiptMirrorComparisons(){
  const receipts=loaded.get('receipts').data.claimReceipts||[],comparisons=[];
  const typedFields={ua:['printedValue','formula','currency','unit','conditions','notes'],monster:['amountOrFormula','currency','unit','conditions']};
  for(const receipt of receipts){
    if(!receipt.typedClaim)continue;
    const input=monetaryRowIdentityInputs.find(candidate=>candidate.path===receipt.sourceCensusArtifact);
    const loadedInput=input&&loaded.get(input.key),source=getPointer(loadedInput?.data,receipt.sourceJsonPointer);
    const fields=input?.key==='uaCensus'?typedFields.ua:input?.key==='monsterCensus'?typedFields.monster:null;
    const sourceProjection=fields&&source?Object.fromEntries(fields.map(field=>[field,source[field]??null])):null;
    const inlineProjection=receipt.typedClaim;
    comparisons.push({artifactPath:loaded.get('receipts').path,recordId:receipt.receiptId,sourcePath:receipt.sourceCensusArtifact,sourcePinSha256:loadedInput?.sha256||null,sourceJsonPointer:receipt.sourceJsonPointer,typedClaimPointer:'/claimReceipts/'+(receipts.indexOf(receipt))+'/typedClaim',classification:sourceProjection&&stable(sourceProjection)===stable(inlineProjection)?'typed-content-copy-current-exact':'typed-content-copy-requires-review',currentSourceRecordSha256:source?digest(source):null,inlineTypedClaimSha256:digest(inlineProjection),sourceTypedProjectionSha256:sourceProjection?digest(sourceProjection):null,typedFields:fields||Object.keys(inlineProjection)});
  }
  return comparisons;
}
function censusAdjacentComparisons(){
  const records=loaded.get('receipts').data.censusAdjacentUnresolvedAndExclusions||[];
  return records.map((record,index)=>{
    const path=record.sourceArtifact,sourceInput=monetaryRowIdentityInputs.find(input=>input.path===path),source=sourceInput?getPointer(loaded.get(sourceInput.key).data,record.jsonPointer):undefined;
    return {recordPointer:`/censusAdjacentUnresolvedAndExclusions/${index}`,sourceArtifact:path,sourceJsonPointer:record.jsonPointer,sourcePinSha256:record.sourceArtifactSha256||null,recordSha256:digest(record.record),sourcePointerValueSha256:source===undefined?null:digest(source),exactCopy:source!==undefined&&stable(record.record)===stable(source),classification:source===undefined?'reference-target-not-in-nine-inputs':'typed-or-structured-content-copy'};
  });
}
function inputManifestRefs(){
  const refs=[];
  for(const input of monetaryRowIdentityInputs){const data=loaded.get(input.key).data;refs.push(...topArtifactRefs(data,input.path));}
  const receipt=loaded.get('receipts').data;refs.push(...topArtifactRefs(receipt,loaded.get('receipts').path));
  return refs;
}
function currentIndexSummary(){
  const indexPath='artifacts/monetary-source-inventory-before-source-corrections/index.json';
  if(!existsSync(resolve(root,indexPath)))return {status:'current-index-cache-not-present-at-census'};
  const {data,sha256}=readJson(indexPath);
  const byInput={};
  const summarize=(rows,kind)=>{
    const all=[];
    for(const record of rows||[]){
      const artifact=record.provenance?.inputArtifact||record.provenance?.inputArtifactRef||null;
      const path=artifact?.path;
      if(!inputByPath.has(path))continue;
      const pointer=artifact?.jsonPointer||record.provenance?.sourceValueJsonPointer||record.provenance?.sourceJsonPointer||null;
      const key=`${kind}:${path}`;byInput[key]??=[];
      const id=kind==='occurrence'?record.sourceOccurrenceId:record.claimId;
      const payload=kind==='occurrence'?record.sourceRecord||record.sourceIdentity||record:record.valueSemantics||record.monetaryClaim||record;
      const item={id,path,pinnedSha256:artifact.sha256||null,currentSha256:currentShaByPath.get(path)||null,pinStatus:refStatus(path,artifact.sha256||null).status,jsonPointer:pointer,contentSha256:digest(payload)};
      byInput[key].push(item);all.push(item);
    }
    return all;
  };
  const occurrences=summarize(data.sourceOccurrences,'occurrence'),claims=summarize(data.claims,'claim');
  return {status:'present',path:indexPath,sha256,artifactType:data.artifactType,inputArtifacts:(data.inputArtifacts||[]).map(ref=>({path:ref.path,pinnedSha256:ref.sha256,...refStatus(ref.path,ref.sha256)})),counts:data.counts,denominators:data.denominators,sourceOccurrencesByInput:Object.fromEntries(Object.entries(byInput).filter(([key])=>key.startsWith('occurrence:')).map(([key,value])=>[key.slice('occurrence:'.length),value.length])),claimsByInput:Object.fromEntries(Object.entries(byInput).filter(([key])=>key.startsWith('claim:')).map(([key,value])=>[key.slice('claim:'.length),value.length])),cachedRecordBindings:[...occurrences,...claims],unresolvedReceiptJoins:data.priceDiscoveryReceiptReconciliation?.counts||null};
}
function canonicalEmbeddedCopies(){
  const canonical=loaded.get('canonical').data,sourceIds={'phb-dmg-other':'phbDmgCensus','ua-other':'uaCensus','monster-books':'monsterCensus'};
  return Object.entries(sourceIds).map(([id,key])=>{
    const embedded=(canonical.sourcePageCensuses||[]).find(item=>item.id===id),external=loaded.get(key);
    if(!embedded)return {id,sourcePath:external.path,status:'embedded-copy-missing'};
    const {sourceArtifact,...directBody}=embedded;
    return {id,sourcePath:external.path,currentSourceSha256:external.sha256,embeddedBodySha256:digest(embedded),embeddedWithoutSourceArtifactSha256:digest(directBody),externalBodySha256:digest(external.data),embeddedSourceArtifactSha256:sourceArtifact?digest(sourceArtifact):null,embeddedSourceArtifactPath:sourceArtifact?.path||sourceArtifact?.artifactPath||null,embeddedSourceArtifactPin:sourceArtifact?.sha256||sourceArtifact?.sourceSha256||null,directBodyExact:stable(directBody)===stable(external.data),sourceArtifactBodyExact:sourceArtifact?stable(sourceArtifact)===stable(external.data):false,classification:'nested-structured-census-copy'};
  });
}
function pdGroupDuplicateInventory(){
  const groups=loaded.get('phbDmg').data.review?.groups||[];
  return groups.map((group,index)=>{const tableRows=Array.isArray(group.tableRows)?group.tableRows:[],count=Array.isArray(group.tableRows)?tableRows.length:group.tableRows&&typeof group.tableRows==='object'?Object.keys(group.tableRows).length:0;return {groupId:group.recordId,groupPointer:`/review/groups/${index}`,declaredSourceRowOrClaimIds:group.rowOrClaimIds||[],tableRowsPointer:`/review/groups/${index}/tableRows`,tableRowsShape:Array.isArray(group.tableRows)?'array':typeof group.tableRows,tableRowsCount:count,tableRowsHaveExplicitRecordIds:Array.isArray(group.tableRows)&&tableRows.every(row=>['id','recordId','sourceRowOrClaimId','claimId'].some(key=>typeof row?.[key]==='string')),groupValueSha256:digest(group.tableRows||[]),rowLevelJoinStatus:count===0?'no-duplicated-tableRows':'group-only IDs exist; tableRows have no per-row explicit ID or declared pointer; no row-wise join inferred'};});
}

export function buildMonetaryMirrorInventory(){
  const inputSnapshot=monetaryRowIdentityInputs.map(input=>{
    const current=loaded.get(input.key);
    return {key:input.key,path:input.path,stage:input.stage,sha256:current.sha256,bytes:current.bytes.length,entityCount:entities[input.key].length,entities:entities[input.key]};
  });
  const outputPath=process.argv.find(arg=>arg.startsWith('--output='))?.slice('--output='.length)||defaultOutput;
  const excluded=new Set([...inputByPath.keys(),outputPath,'tools/monetary-mirror-inventory.mjs']);
  const files=[...listJsonFiles('research'),...listJsonFiles('artifacts'),...listJsonFiles('tests/fixtures')].sort();
  const scanned=exactIdentityHits(files,excluded);
  const allRefs=[...inputManifestRefs(),...scanned.refs];
  const mismatches=allRefs.filter(ref=>ref.status==='hash-mismatch-requires-role-review');
  const knownHistoricalCanonicalRef={artifactPath:'research/source-audit-batch5-price-discovery-reconciliation.json',referenceKey:'inputArtifacts.originalSourceInventory710',path:'research/price-source-inventory.json',pinnedSha256:'f2a02d1e990cf9bd30135f7dc2fcd2f10f9e1f2e172ee594e396677c32fb3852',currentSha256:loaded.get('canonical').sha256,classification:'explicitly-historical',preservationInstruction:'Parent checkpoint explicitly identifies this 710-row snapshot as historical for 43 DMG p.239 duplicate references; preserve its pin and do not repoint it to the current canonical inventory.'};
  const unclassifiedHashMismatches=mismatches.filter(ref=>!(ref.artifactPath===knownHistoricalCanonicalRef.artifactPath&&ref.field==='sha256'&&ref.path===knownHistoricalCanonicalRef.path&&ref.pinnedSha256===knownHistoricalCanonicalRef.pinnedSha256));
  const report={schemaVersion:1,artifactType:'explicit-id monetary mirror inventory',scope:{purpose:'Capture the before-state of exact-ID monetary inputs, declared pointer links, typed-content copies, current generated-index cache bindings, and hash pins before applying UA/PHB-DMG source changes.',inputsSource:'tools/monetary-row-identity-audit.mjs exports the nine authored monetary inputs.',joinPolicy:'Exact source IDs, declared input paths, hashes, and declared JSON Pointers only. No labels, object names, page coincidence, or inferred row order are used to match records.',limits:'This is structural/provenance inventory only. It does not prove source text, value correctness, completeness, historical role, or that a cache is safe to retain. Any mismatched pin without an explicit declared historical role remains unresolved.'},inputCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),inputSnapshots:inputSnapshot,mirrorChecks:{canonicalEmbeddedCensusCopies:canonicalEmbeddedCopies(),priceDiscoveryTypedClaimComparisons:receiptMirrorComparisons(),censusAdjacentRecordCopies:censusAdjacentComparisons(),pd179GroupDuplicateFields:pdGroupDuplicateInventory(),currentIndexCache:currentIndexSummary(),exactIdStructuredHits:aggregateIdentityHits(scanned.hits),exactIdStructuredHitGroupCount:aggregateIdentityHits(scanned.hits).length,declaredInputReferenceInventory:aggregateReferences(allRefs),unclassifiedHashMismatches:aggregateReferences(unclassifiedHashMismatches),explicitHistoricalReferences:[knownHistoricalCanonicalRef],scanErrors:scanned.errors},counts:{authoredInputs:inputSnapshot.length,primaryEntities:inputSnapshot.reduce((n,input)=>n+input.entityCount,0),exactIdStructuredHits:scanned.hits.length,exactIdStructuredHitGroups:aggregateIdentityHits(scanned.hits).length,declaredPathReferences:allRefs.length,hashMismatches:mismatches.length,unclassifiedHashMismatches:unclassifiedHashMismatches.length,typedClaimCopies:receiptMirrorComparisons().length,typedClaimCopiesExact:receiptMirrorComparisons().filter(item=>item.classification==='typed-content-copy-current-exact').length,censusAdjacentCopies:censusAdjacentComparisons().length,censusAdjacentExactCopies:censusAdjacentComparisons().filter(item=>item.exactCopy).length}};
  return {report,outputPath};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {report,outputPath}=buildMonetaryMirrorInventory();
  writeFileSync(resolve(root,outputPath),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({output:outputPath,counts:report.counts,sha256:digest(readFileSync(resolve(root,outputPath)))}));
}
