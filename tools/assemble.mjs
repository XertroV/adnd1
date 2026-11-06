import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const load = name => existsSync(resolve(root,name)) ? JSON.parse(readFileSync(resolve(root,name),'utf8')) : {};
const parts = ['rules.json','classes.json','phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json','equipment.json','attack-matrices.json'].map(load);
const data = {rules:[],spells:[],equipment:[],matrices:[],classes:[],sources:[],release:{date:'2026-11-06',coverage:'Local research batch with partial extraction. Most entries are OCR checked; selected equipment values have scoped image evidence. Full source PDFs are not deployed.',sourceFilesDeployed:false}};
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
for(const item of [...data.rules,...data.spells,...data.classes,...data.equipment,...data.matrices]){
  const override=citations.items?.[item.id];
  if(override?.references){
    const refs=[...(item.references||[]),...override.references];
    item.references=refs.filter((ref,index)=>refs.findIndex(other=>JSON.stringify(other)===JSON.stringify(ref))===index);
  }
  if(citations.priceStates?.[item.id])item.priceState=citations.priceStates[item.id];
  if(progression.classes?.[item.id])Object.assign(item,progression.classes[item.id]);
}
if(progression.explainer)data.progressionExplainer=progression.explainer;
const excerptItems=data.equipment.filter(item=>item.scanVerification?.state==='selected-values-checked');
const uniqueRegions=new Set(),imageFiles=new Set();let scopedRegions=0;
for(const item of excerptItems){
  const path=item.scanVerification.catalog;
  if(!/^scans\/dagger\/(?:manifest|(?:phb|ua)-[a-z0-9-]+)\.json$/.test(path||''))throw new Error(`Invalid scan catalog path for ${item.id}`);
  const catalog=load('dist/'+path);
  if(catalog.schemaVersion!==1||catalog.itemId!==item.id||!Array.isArray(catalog.regions)||catalog.regions.length!==item.scanVerification.regionCount)throw new Error(`Scan catalog does not match ${item.id}`);
  for(const region of catalog.regions){
    uniqueRegions.add(JSON.stringify([region.book,region.printedPage,region.sha256,region.focusRects]));
    imageFiles.add(region.sha256);scopedRegions++;
  }
}
data.release.excerpts={itemIds:excerptItems.map(item=>item.id),regions:uniqueRegions.size,scopedRegions,imageFiles:imageFiles.size};
writeFileSync(resolve(root,'dist/data.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({rules:data.rules.length,spells:data.spells.length,detailedSpells:data.spells.filter(s=>s.effect?.length).length,equipment:data.equipment.length,matrices:data.matrices.length,classes:data.classes.length,sources:data.sources.length}));
