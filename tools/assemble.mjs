import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validScanCatalogPath, scanStates, validateScanCatalog} from './scan-catalog.mjs';
import {attachEvidenceBindings, attachSourceVisualReviewMetadata, buildPriceSourceInventory, validatePriceSourceInventory, writePriceSourceInventory} from './price-source-inventory.mjs';
import {buildCoverageGaps} from './coverage-gaps.mjs';
import {buildPublishedContinuations} from './published-continuations.mjs';
import {ambiguousItemOverrideIds, appendOverrideReferences, classProgressionOverride, cloneOverrideJson, collectionOverride, collectionReferenceOverrides, equipmentPriceStateOverride} from './citation-override-identity.mjs';
const root = resolve(import.meta.dirname, '..');
const {default: books} = await import('../dist/books.js');
const load = name => existsSync(resolve(root,name)) ? JSON.parse(readFileSync(resolve(root,name),'utf8')) : {};
const parts = ['rules.json','classes.json','phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json','equipment.json','attack-matrices.json'].map(load);
const data = {rules:[],spells:[],equipment:[],matrices:[],classes:[],sources:[],release:{date:'2026-11-07',coverage:'Partial extraction with checked source excerpt locations. Extracted values retain their individual review grades; selected equipment values have narrower checked-field evidence. Full source PDFs are not deployed.',sourceFilesDeployed:false}};
for (const key of ['rules','classes','sources','equipment','matrices']) data[key] = parts.flatMap(p=>p[key]||[]);
const spellMap = new Map();
for (const p of parts) for (const spell of p.spells||[]) {
  const key = [spell.book,spell.class,spell.name.toLowerCase().replace(/[^a-z0-9]/g,'')].join(':');
  const prior = spellMap.get(key);
  const detailed = Object.keys(spell.fields||{}).length>0 || (spell.effect||[]).length>0;
  if (!prior || detailed) {
    const merged={...prior,...spell};
    const aliases=[...new Set([...(prior?.aliases||[]),...(spell.aliases||[])])];
    if(aliases.length) merged.aliases=aliases;
    const shared=spell.classes||prior?.classes;
    if(shared?.length){merged.classes=shared;if(shared.length>1)merged.pages=[...new Set([...(spell.pages||[]),...(prior?.pages||[])])];}
    spellMap.set(key,merged);
  }
}
data.spells=[...spellMap.values()];
// Keep reviewed cross-book references and provenance separate from original extraction files.
const citations=load('citation-overrides.json');
const progression=load('progression-overrides.json');
const ambiguousCitationIds=ambiguousItemOverrideIds(data,progression.explainer);
for(const [collection,items] of Object.entries({rules:data.rules,spells:data.spells,classes:data.classes,equipment:data.equipment,matrices:data.matrices}))for(const item of items){
  const referenceOverrides=collectionReferenceOverrides(citations.items,collection,item.id,ambiguousCitationIds);
  appendOverrideReferences(item,referenceOverrides);
  const sourceExcerpts=collectionOverride(citations.sourceExcerpts,collection,item.id,ambiguousCitationIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
  if(sourceExcerpts){if(sourceExcerpts.collection && sourceExcerpts.collection!==collection)throw new Error(`Wrong scan collection for ${collection}:${item.id}`);item.sourceExcerpts=cloneOverrideJson(sourceExcerpts);}
  const scanVerification=collectionOverride(citations.scanVerification,collection,item.id,ambiguousCitationIds);
  if(scanVerification)item.scanVerification=cloneOverrideJson(scanVerification);
  const priceState=equipmentPriceStateOverride(citations.priceStates,collection,item.id);
  if(priceState)item.priceState=priceState;
  const classOverride=classProgressionOverride(progression.classes,collection,item.id);
  if(classOverride)Object.assign(item,cloneOverrideJson(classOverride));
}
if(progression.explainer){data.progressionExplainer=progression.explainer;
  const scanVerification=collectionOverride(citations.scanVerification,'progressionExplainer','progression-explainer',ambiguousCitationIds);
  if(scanVerification)data.progressionExplainer.scanVerification=cloneOverrideJson(scanVerification);
  const sourceExcerpts=collectionOverride(citations.sourceExcerpts,'progressionExplainer','progression-explainer',ambiguousCitationIds,{allowDeclaredCollection:true,mapName:'sourceExcerpts'});
  if(sourceExcerpts){if(sourceExcerpts.collection&&sourceExcerpts.collection!=='progressionExplainer')throw new Error('Wrong scan collection for progression explainer');data.progressionExplainer.sourceExcerpts=cloneOverrideJson(sourceExcerpts);}
}
const excerptItems=[...data.rules,...data.spells,...data.classes,...data.equipment,...data.matrices,...(data.progressionExplainer?[{...data.progressionExplainer,id:'progression-explainer'}]:[])].filter(item=>scanStates.has(item.scanVerification?.state)||item.sourceExcerpts?.state==='source-excerpt-checked');
const uniqueRegions=new Set(),imageFiles=new Set(),imageMetadata=new Map();let scopedRegions=0;
for(const item of excerptItems){
  for (const verification of [item.scanVerification,item.sourceExcerpts].filter(v=>scanStates.has(v?.state))) {
  const path=verification.catalog;
  if(!validScanCatalogPath(item.id,path,verification))throw new Error(`Invalid scan catalog path for ${item.id}`);
  const catalog=load('dist/'+path);
  validateScanCatalog(catalog,item,books,verification);
  for (const region of catalog.regions) {
    const filename=resolve(root,'dist',dirname(path),region.image);
    if(!imageMetadata.has(filename)){const bytes=readFileSync(filename);if(bytes.length<24 || !bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw new Error(`Invalid scan PNG for ${item.id}: ${region.image}`);imageMetadata.set(filename,{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:createHash('sha256').update(bytes).digest('hex')});}
    const meta=imageMetadata.get(filename);
    if(meta.width!==region.width || meta.height!==region.height || meta.sha256!==region.sha256)throw new Error(`Scan image mismatch for ${item.id}: ${region.image}`);
  }
  if(verification === item.scanVerification && item.sourceExcerpts) continue;
  for(const region of catalog.regions){
    uniqueRegions.add(JSON.stringify([region.book,region.printedPage,region.sha256,region.focusRects]));
    imageFiles.add(region.sha256);scopedRegions++;
  }
  }
}
data.release.excerpts={itemIds:excerptItems.map(item=>item.id),regions:uniqueRegions.size,scopedRegions,imageFiles:imageFiles.size,selectedValuesItems:excerptItems.filter(item=>item.scanVerification?.state==='selected-values-checked').length,sourceExcerptItems:excerptItems.filter(item=>item.scanVerification?.state==='source-excerpt-checked'||item.sourceExcerpts?.state==='source-excerpt-checked').length};
const priceInventory=buildPriceSourceInventory({equipment:data.equipment,data});
validatePriceSourceInventory(priceInventory,{equipment:data.equipment,data});
attachEvidenceBindings(data,priceInventory);
attachSourceVisualReviewMetadata(data);
writePriceSourceInventory(priceInventory);
data.release.priceInventory={path:'research/price-source-inventory.json',siteEquipmentObjects:priceInventory.counts.siteEquipmentObjects,sitePrintedPrices:priceInventory.counts.sitePrintedPrices,sitePriceGaps:priceInventory.counts.sitePriceGaps,editorialEstimates:priceInventory.counts.editorialEstimates,sourceRows:priceInventory.counts.sourceRows,fieldEvidenceBindings:priceInventory.counts.fieldEvidenceBindings,fieldEvidenceBindingsByCollection:priceInventory.counts.fieldEvidenceBindingsByCollection,regionBoundBindings:priceInventory.counts.regionBoundBindings,pendingRegionBindings:priceInventory.counts.pendingRegionBindings};
writeFileSync(resolve(root,'dist/data.json'),JSON.stringify(data,null,2)+'\n');
const linkedPassages=buildPublishedContinuations({manifest:load('research/citation-continuations.json'),data,catalogRoot:resolve(root,'dist')});
writeFileSync(resolve(root,'dist/source-continuations.json'),JSON.stringify(linkedPassages,null,2)+'\n');
// Keep the limitations projection separate from the hash-bound core catalog.
const coverageGaps=buildCoverageGaps({data,handoff:load('research/gaps-limitations-next-task.json'),readFile:name=>readFileSync(resolve(root,name))});
writeFileSync(resolve(root,'dist/coverage-gaps.json'),JSON.stringify(coverageGaps,null,2)+'\n');
console.log(JSON.stringify({rules:data.rules.length,spells:data.spells.length,detailedSpells:data.spells.filter(s=>s.effect?.length).length,equipment:data.equipment.length,matrices:data.matrices.length,classes:data.classes.length,sources:data.sources.length}));
