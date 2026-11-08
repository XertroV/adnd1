// Exact source/image/crop/focus aliases of declared passage parts only.
// This does not discover passages or prove their source meaning.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {sourceRect} from './citation-context-contract.mjs';
const root=resolve(import.meta.dirname,'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`:JSON.stringify(value);
const collections=['rules','spells','equipment','matrices','classes','progressionExplainer'];
function records(data){return collections.flatMap(collection=>(Array.isArray(data[collection])?data[collection]:data[collection]?[data[collection]]:[]).map(item=>({collection,item})));}
function identity(catalog,region){
 const bounds=sourceRect(region.normalizedPageRect),source=catalog.sources?.[region.book]?.sha256;
 if(!bounds||!/^[a-f0-9]{64}$/.test(source||'')||!/^[a-f0-9]{64}$/.test(region.sha256||''))return null;
 return canonical({book:region.book,printedPage:region.printedPage,pdfPage:region.pdfPage,sourceSha256:source,imageSha256:region.sha256,sourceCropBounds:bounds,focusRects:region.focusRects||[]});
}
export function buildContinuationAliasReport({data,manifest,catalogs,inputHashes={}}){
 const exposed=records(data),owners=new Map(exposed.map(({collection,item})=>[`${collection}:${item.id||'progression-explainer'}`,item]));
 const declared=new Map(),invalidGroups=[],unassessableParts=[],matches=[];
 const groupKey=g=>`${g.collection}:${g.itemId}|${g.catalog}`;
 for(const group of manifest.groups||[]){
  const owner=owners.get(`${group.collection}:${group.itemId}`),catalog=catalogs.get(group.catalog);
  if(!owner||owner.sourceExcerpts?.catalog!==group.catalog||!catalog||catalog.collection!==group.collection||catalog.itemId!==group.itemId){invalidGroups.push({groupId:group.id,reason:'missing-or-rebound-owner/catalog'});continue;}
  const key=groupKey(group),ids=declared.get(key)||new Set();
  for(const segment of group.segments||[])if(segment.state==='present'&&segment.regionId)ids.add(segment.regionId);
  declared.set(key,ids);
 }
 for(const group of manifest.groups||[]){
  if(invalidGroups.some(x=>x.groupId===group.id))continue;
  const catalog=catalogs.get(group.catalog),linked=declared.get(groupKey(group));
  for(const segment of group.segments||[]){
   const region=catalog.regions.find(r=>r.id===segment.regionId),key=region&&identity(catalog,region);
   if(segment.state!=='present'||!key){unassessableParts.push({groupId:group.id,regionId:segment.regionId||null,reason:segment.state==='present'?'missing-source/image/crop-identity':'blocked-part'});continue;}
   for(const alias of catalog.regions){
    if(alias.id===region.id||identity(catalog,alias)!==key)continue;
    matches.push({groupId:group.id,collection:group.collection,itemId:group.itemId,catalog:group.catalog,role:segment.role,segmentRegionId:region.id,aliasRegionId:alias.id,sourceSha256:catalog.sources[region.book].sha256,imageSha256:region.sha256,sourceCropBounds:sourceRect(region.normalizedPageRect),focusSha256:hash(canonical(region.focusRects||[])),status:linked.has(alias.id)?'alias-participates-in-declared-group':'exact-alias-has-no-declared-linked-group'});
   }
  }
 }
 const referenced=new Set(exposed.flatMap(({item})=>['sourceExcerpts','scanVerification'].map(k=>item[k]?.catalog).filter(Boolean)));
 const missingAliases=matches.filter(x=>x.status==='exact-alias-has-no-declared-linked-group');
 return {schemaVersion:1,artifactType:'declared-continuation exact-region-alias inventory',scope:'All exposed records and referenced catalogs are inventoried; exact aliases are checked only for parts of declared continuation groups. Matching pixels, source frame and focus establish an alias identity, not passage completeness or mechanics. A linked alias retains its own group review scope.',inputHashes,denominators:{exposedRecords:exposed.length,referencedCatalogs:referenced.size,catalogRegionRows:[...referenced].reduce((n,p)=>n+(catalogs.get(p)?.regions?.length||0),0),declaredGroups:(manifest.groups||[]).length,declaredParts:(manifest.groups||[]).reduce((n,g)=>n+(g.segments?.length||0),0),exactAliasMatches:matches.length,missingAliasLinks:missingAliases.length,unassessableDeclaredParts:unassessableParts.length},matches,missingAliases,unassessableParts,invalidGroups,structuralCheck:{valid:invalidGroups.length===0&&missingAliases.length===0,sourceSemanticsCertified:false}};
}
export function loadContinuationAliasReport({repoRoot=root}={}){
 const read=p=>JSON.parse(readFileSync(resolve(repoRoot,p))),bytes=p=>readFileSync(resolve(repoRoot,p)),data=read('dist/data.json'),manifest=read('research/citation-continuations.json'),catalogs=new Map();
 for(const {item}of records(data))for(const key of ['sourceExcerpts','scanVerification']){const p=item[key]?.catalog;if(p&&!catalogs.has(p))catalogs.set(p,read('dist/'+p));}
 return buildContinuationAliasReport({data,manifest,catalogs,inputHashes:{data:{path:'dist/data.json',sha256:hash(bytes('dist/data.json'))},manifest:{path:'research/citation-continuations.json',sha256:hash(bytes('research/citation-continuations.json'))},catalogs:Object.fromEntries([...catalogs.keys()].sort().map(p=>[p,hash(bytes('dist/'+p))]))}});
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
 const args=process.argv.slice(2),outputIndex=args.indexOf('--output'),report=loadContinuationAliasReport();
 if(outputIndex>=0){const output=resolve(args[outputIndex+1]);mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({denominators:report.denominators,structuralCheck:report.structuralCheck}));
 if(args.includes('--check')&&!report.structuralCheck.valid)process.exitCode=1;
}
