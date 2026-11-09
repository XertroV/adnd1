#!/usr/bin/env node
// Research-only reproduction of dist/app.js buildIndex() plus its actual search core.
// It loads the immutable assembled baseline and applies only synthetic candidate
// records in memory; no production file is changed.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const require=createRequire(import.meta.url);
const search=require(resolve(root,'dist/search.js'));
const books=require(resolve(root,'dist/books.js'));
const dataBytes=readFileSync(resolve(root,'dist/data.json'));
const data=JSON.parse(dataBytes);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePins={
  dataSha256:sha(dataBytes),
  searchCoreSha256:sha(readFileSync(resolve(root,'dist/search.js'))),
  appBuildIndexSha256:sha(readFileSync(resolve(root,'dist/app.js'))),
  candidateScriptSha256:sha(readFileSync(fileURLToPath(import.meta.url))),
};

// Keep this collection order and projection aligned with buildIndex() in dist/app.js.
const classText=item=>(Array.isArray(item.classes)&&item.classes.length?item.classes:Array.isArray(item.class)?item.class:item.class?[item.class]:[]).join(' / ')||'Class not yet extracted';
const levelText=item=>item.level===undefined||item.level===null||item.level===''?'Level not yet extracted':`Level ${item.level}`;
const knownPrice=item=>item.price!==null&&typeof item.price==='object'&&typeof item.price.amount==='number'&&Number.isFinite(item.price.amount)&&item.price.amount>=0&&typeof item.price.currency==='string'&&Boolean(item.price.currency.trim());
const suggestedPrice=item=>{const p=item.suggestedPrice;return !knownPrice(item)&&!!p&&typeof p.amount==='number'&&Number.isFinite(p.amount)&&p.amount>=0&&typeof p.currency==='string'&&!!p.currency.trim()&&typeof p.unit==='string'&&!!p.unit.trim();};
const priceLabel=item=>{if(knownPrice(item))return `${['estimate','estimated'].includes(item.priceState)?'Estimate · ':''}${item.price.amount.toLocaleString()} ${item.price.currency}${item.price.unit?` / ${item.price.unit}`:''}`;if(suggestedPrice(item)){const p=item.suggestedPrice;return `Suggested (estimate): ${p.amount.toLocaleString()} ${p.currency} / ${p.unit}`;}return item.priceState==='not_listed'?'Not listed in source':'Price not extracted';};
function buildGlobalIndex(extraRules=[]){
  const matrixConflictGuideLabel=matrix=>{
    const guideId=matrix?.sourceConflict?.relatedClassGuideId;
    if(typeof guideId!=='string')return '';
    const guide=(data.classes||[]).find(item=>item?.id===guideId);
    const name=guide?.name||guide?.title||guide?.id;
    return typeof name==='string'&&name.trim()?`Open ${name} class guide`:'';
  };
  return [
    ...data.spells.map(x=>({...x,_view:'spells',_title:x.name||x.title||'',_subtitle:`${classText(x)} · ${levelText(x)} · ${books.code(x.book)}`})),
    ...[...data.rules,...extraRules].map(x=>({...x,_view:'rules',_title:x.title||'',_subtitle:`${x.category||'Rule'} · ${books.code(x.book)}`})),
    ...data.equipment.map(x=>({...x,_view:'equipment',_title:x.name||'',_subtitle:`${x.category||'Equipment'} · ${priceLabel(x)} · ${books.code(x.book)}`})),
    ...data.classes.map(x=>({...x,_view:'classes',_title:x.name||'',_subtitle:`Class & advancement · ${books.code(x.book)}`})),
    ...data.matrices.map(x=>({...x,_view:'matrices',_title:x.title||x.name||'',_subtitle:`${books.code(x.book)} · Combat matrix`,_sourceConflictClassGuideLabel:matrixConflictGuideLabel(x)})),
    ...(data.progressionExplainer?[{...data.progressionExplainer,_view:'progressionExplainer',_title:data.progressionExplainer.title||'Class progression paths',_subtitle:'Class progression reference'}]:[]),
  ].map(x=>search.prepare({...x,_bookName:books.title(x.book)}));
}
const queries=[
  'hurled weapons',
  'hurled weapons and missiles',
  'missile weapon versus armor',
  'missile weapon versus armour',
  'bow leather plate',
  'short bow leather plate',
];
function resultSet(index,query,view=null){
  return index.filter(x=>(view===null||x._view===view)&&Number.isFinite(search.score(x,query)))
    .sort((a,b)=>search.compare(a,b,query))
    .map(x=>({id:x.id,title:x._title,view:x._view,score:search.score(x,query)}));
}
const baselineIndex=buildGlobalIndex();
const current=Object.fromEntries(queries.map(q=>[q,{
  global:resultSet(baselineIndex,q),
  rules:resultSet(baselineIndex,q,'rules'),
  equipment:resultSet(baselineIndex,q,'equipment'),
}]));

// Synthetic ranking check only: no source values/table cells are invented or added.
// These records stand for the proposed searchable PHB and UA table documents.
const searchOnlyCandidate=(id,title,book,page)=>({
  id,title,category:'Combat',book,pages:[page],
  aliases:['hurled weapons','hurled weapons and missiles','missile weapon versus armor','missile weapon versus armour'],
  summary:'Source-specific hurled-weapon and missile table with bow, short-bow, leather, plate, shield, armor-class adjustment, and armour-class adjustment lookup terms. Table values are not duplicated in this search fixture.',
  bullets:['Open the complete cited table and its own printed range notes. Keep PHB p.38 and UA p.28 distinct.'],
  tags:['hurled weapons','missiles','hurled weapons and missiles','missile weapon versus armor','missile weapon versus armour','bow','short bow','leather','plate','shield','armor class adjustment','armour class adjustment','to hit'],
});
const candidates=[
  searchOnlyCandidate('phb-hurled-weapons-and-missiles-table','PHB p. 38 · Hurled Weapons and Missiles','PHB',38),
  searchOnlyCandidate('ua-hurled-weapons-and-missiles-table','UA p. 28 · Hurled Weapon and Missile Types','UA',28),
];
const candidateIndex=buildGlobalIndex(candidates);
const proposed=Object.fromEntries(queries.map(q=>[q,{
  global:resultSet(candidateIndex,q),
  rules:resultSet(candidateIndex,q,'rules'),
  candidatesFirstTwo:resultSet(candidateIndex,q).filter(x=>candidates.some(candidate=>candidate.id===x.id)).map(x=>({id:x.id,score:x.score})),
}]));
const output={
  schemaVersion:1,
  artifactType:'missile-table-global-search-regression',
  scope:'Exact current assembled-data and search-core baseline plus an explicitly synthetic, search-only ranking control. This is not a UI integration test, citation validation, source-value grade, or production edit.',
  baseline:{commit:'236818f2026f61eb0cb696ffb0ea9ff166a491ff',pins:sourcePins,collectionCounts:Object.fromEntries(['spells','rules','equipment','classes','matrices'].map(k=>[k,data[k].length])),queries:current},
  syntheticCandidate:{candidateType:'search-only records; no table cells or source values',records:candidates.map(({id,title,book,pages,aliases,tags})=>({id,title,book,pages,aliases,tags})),queries:proposed},
};
const out=resolve(here,'global-search-regression.json');
writeFileSync(out,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({output:out,sha256:sha(readFileSync(out)),pins:sourcePins,baseline:Object.fromEntries(queries.map(q=>[q,current[q].global.length])),candidate:Object.fromEntries(queries.map(q=>[q,proposed[q].candidatesFirstTwo]))},null,2));
