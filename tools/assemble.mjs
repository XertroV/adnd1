import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root = resolve(import.meta.dirname, '..');
const load = name => existsSync(resolve(root,name)) ? JSON.parse(readFileSync(resolve(root,name),'utf8')) : {};
const parts = ['rules.json','classes.json','phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json'].map(load);
const data = {rules:[],spells:[],classes:[],sources:[],release:{date:'2026-11-04',coverage:'Curated first release. Spell names and detailed cards have separate coverage; all OCR-derived content awaits visual verification.',sourceFilesDeployed:false}};
for (const key of ['rules','classes','sources']) data[key] = parts.flatMap(p=>p[key]||[]);
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
writeFileSync(resolve(root,'dist/data.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({rules:data.rules.length,spells:data.spells.length,detailedSpells:data.spells.filter(s=>s.effect?.length).length,classes:data.classes.length,sources:data.sources.length}));
