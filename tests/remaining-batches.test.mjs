import {readBeforeJoFile as readFileSync} from '../research/class-mapping-history-v1/source-postmetadata-facade-v1/ua-source-batch6-jo-fixture-v1.proposed.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {withoutBatch5OfferEquipment,withoutPriceCompletionEquipment,withoutSourceFirstEquipment} from './equipment-source-first-fixture.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const data=read('../dist/data.json');
const nextFixture=read('./fixtures/mechanics-next-corrections.json');
const nextReferences=nextFixture.citationOverrides.flatMap(c=>(c.newValue?.references||[]).filter(ref=>!(c.oldValue?.references||[]).some(old=>JSON.stringify(old)===JSON.stringify(ref))).map(ref=>({id:c.id,...ref})));
for(const ref of nextReferences){
 const record=nextFixture.records.find(r=>r.id===ref.id);assert.ok(record,ref.id);
 const sources=record.changes.flatMap(c=>{const v=c.independentReview;return v?[...(v.source?[v.source]:[]),...(v.sources||[])]:[]});
 assert.ok(ref.pages.every(page=>sources.some(source=>source.book===ref.book&&source.page===page)),`${ref.id}: reference bound to independent source`);
}

const closureFixture=read('./fixtures/mechanics-closure-corrections.json');
const closureReferences=closureFixture.citationOverrides.flatMap(c=>(c.newValue?.references||[]).filter(ref=>!(c.oldValue?.references||[]).some(old=>JSON.stringify(old)===JSON.stringify(ref))).map(ref=>({id:c.id,...ref}))).filter(ref=>data.spells.some(spell=>spell.id===ref.id));
for(const ref of closureReferences){
 const record=closureFixture.records.find(r=>r.id===ref.id);assert.ok(record,ref.id);
 const sources=record.changes.flatMap(c=>c.independentReview?.sources||[]);
 assert.ok(ref.pages.every(page=>sources.some(source=>source.book===ref.book&&source.page===page)),`${ref.id}: reference bound to independent source`);
}

const dependencyFixture=read('./fixtures/mechanics-dependency-corrections.json');
const dependencyReferences=dependencyFixture.citationOverrides.flatMap(c=>(c.newValue?.references||[]).filter(ref=>!(c.oldValue?.references||[]).some(old=>JSON.stringify(old)===JSON.stringify(ref))).map(ref=>({id:c.id,...ref}))).filter(ref=>data.spells.some(spell=>spell.id===ref.id));
for(const ref of dependencyReferences){
 const record=dependencyFixture.records.find(r=>r.id===ref.id);assert.ok(record,ref.id);
 const sources=record.changes.flatMap(c=>c.independentReview?.sources||[]);
 assert.ok(ref.pages.every(page=>sources.some(source=>source.book===ref.book&&source.page===page)),`${ref.id}: reference bound to independent source`);
}

const reviewed=read('./fixtures/remaining-reviewed-rows.json').rows;
const ua28HistoricalFixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/ua28-dagger-baseline-679.json.gz',import.meta.url))).toString('utf8'));
const ua28Recipes=new Map(ua28HistoricalFixture.recipes.map(recipe=>[`${recipe.catalogPath}|${recipe.regionId}`,recipe]));
const sourceOwnerIdentity=read('../research/source-owner-identity-baseline.json');
const dir=new URL('../dist/scans/dagger/',import.meta.url);
const catalogs=readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read('../dist/scans/dagger/'+f));
const sourceQuestionReferences=[
 {id:'phb-illusionist-emotion',book:'PHB',pages:[53],label:'Candidate comparison: cleric Symbol of Hopelessness',status:'Source excerpt checked; Emotion does not identify the intended Symbol class'},
 {id:'phb-illusionist-emotion',book:'PHB',pages:[91],label:'Candidate comparison: magic-user Symbol of Hopelessness',status:'Source excerpt checked; Emotion does not identify the intended Symbol class'},
 {id:'phb-illusionist-first-level-magic-user-spells',book:'PHB',pages:[94],label:'Conflicting illusionist spell-list introduction',status:'Source excerpt checked'}
];
const newIds=['phb-composite-long-bow','phb-composite-short-bow','phb-long-bow','phb-short-bow','phb-silver-arrow','ua-aklys-hurled','ua-atlatl-javelin','ua-blowgun-needle'];
const sourceQualifierReferences=[
 {id:'phb-magic-user-esp',book:'PHB',pages:[70],label:'ESP probe timing wording',status:'Literal source wording independently reviewed; interpretation or omission remains unresolved'},
 {id:'phb-magic-user-enchanted-weapon',book:'PHB',pages:[76],label:'Enchanted Weapon reverse wording',status:'Literal source wording independently reviewed; interpretation or omission remains unresolved'},
 {id:'phb-magic-user-animal-growth',book:'PHB',pages:[79],label:'Animal Growth component wording',status:'Header and material passage independently reviewed; printed difference retained'},
 {id:'phb-magic-user-repulsion',book:'PHB',pages:[86],label:'Repulsion movement-rate wording',status:'Literal source wording independently reviewed; interpretation or omission remains unresolved'},
 {id:'phb-magic-user-mass-invisibility',book:'PHB',pages:[70,88],label:'Mass Invisibility ending behavior sources',status:'Literal source wording independently reviewed; interpretation or omission remains unresolved'},
 {id:'phb-magic-user-reverse-gravity',book:'PHB',pages:[88],label:'Reverse Gravity duration wording',status:'Literal source wording independently reviewed; interpretation or omission remains unresolved'},
 {id:'phb-magic-user-permanency',book:'PHB',pages:[91],label:'Permanency material component wording',status:'Literal source wording independently reviewed; interpretation or omission remains unresolved'},
];
function canonical(value){
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value!==null&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
 return JSON.stringify(value);
}
const hashValue=value=>createHash('sha256').update(canonical(value)).digest('hex');
const item=id=>{const v=data.equipment.find(x=>x.id===id);assert.ok(v,id);return v};
const catalog=id=>{const c=catalogs.find(x=>x.itemId===id);assert.ok(c,id);return c};
test('all 29 newly reviewed rows preserve exact image, focus, numeric values and source binding',()=>{
 assert.equal(reviewed.length,29);assert.equal(new Set(reviewed.map(r=>r.id)).size,29);
 for(const row of reviewed){
  const ownerCatalog=catalog(row.itemId),region=ownerCatalog.regions.find(r=>r.id===row.id);assert.ok(region,row.id);
  if(row.book==='UA'&&row.printedPage===28){
   const catalogPath=`dist/scans/dagger/${row.itemId}.json`,recipe=ua28Recipes.get(`${catalogPath}|${row.id}`);
   assert.ok(recipe,`${row.id}: frozen 679 fixture contains the before and current recipe`);
   const historicalBytes=ua28HistoricalFixture.baselineCatalogs[catalogPath];assert.ok(historicalBytes,catalogPath);
   const historicalCatalog=JSON.parse(Buffer.from(historicalBytes.contentBase64,'base64').toString('utf8'));
   const historicalRegion=historicalCatalog.regions.find(r=>r.id===row.id);assert.ok(historicalRegion,row.id+' frozen679 source region');
   for(const key of ['book','printedPage','pdfPage','image','sha256','width','height','focusRects','checkedFields'])
    assert.deepEqual(historicalRegion[key],row[key],row.id+' frozen679 '+key);
   for(const [key,expected] of Object.entries(recipe.expectedRegion))assert.deepEqual(region[key],expected,row.id+' current '+key);
   const table=ua28HistoricalFixture.fullTableAsset;
   assert.equal(recipe.expectedRegion.image,table.filename,row.id+' current table image');
   assert.equal(recipe.expectedRegion.sha256,table.sha256,row.id+' current table image hash');
   assert.deepEqual([recipe.expectedRegion.width,recipe.expectedRegion.height],[table.width,table.height],row.id+' current table dimensions');
   const tableBytes=readFileSync(new URL(`../dist/scans/dagger/${table.filename}`,import.meta.url));
   assert.equal(createHash('sha256').update(tableBytes).digest('hex'),table.sha256,row.id+' current table PNG bytes');
   assert.equal(region.book,'UA',row.id);assert.equal(region.printedPage,28,row.id);assert.equal(region.pdfPage,29,row.id);
   assert.deepEqual(region.checkedFields,row.checkedFields,row.id+' current numeric review inputs remain unchanged');
  }else{
   for(const key of ['book','printedPage','pdfPage','image','sha256','width','height','focusRects','checkedFields'])assert.deepEqual(region[key],row[key],row.id+' '+key);
  }
  assert.equal(region.verification,'visually-checked-crop');
  assert.equal(region.pdfPage,region.printedPage+1);
  const gear=item(row.itemId);assert.equal(gear.incomplete,true);
  const refs=[gear.price,...Object.values(gear.fieldSources||{}),...(gear.references||[])].filter(Boolean);
  assert.ok(refs.some(ref=>ref.book===row.book&&ref.pages.includes(row.printedPage)&&ref.verification?.regions?.includes(row.id)),row.id+' binds a selected value to this row');
  if(row.checkedFields.fireRate){
   const page=`${row.book} p.${row.printedPage}`;
   const rateKey=Object.keys(gear.fields).find(k=>/^(Rate of fire|Fire rate)/.test(k)&&k.includes(page)) || Object.keys(gear.fields).find(k=>/^(Rate of fire|Fire rate)/.test(k));
   const rangeKey=Object.keys(gear.fields).find(k=>k.startsWith('Range S / M / L')&&k.includes(page)) || Object.keys(gear.fields).find(k=>k.startsWith('Range S / M / L'));
   assert.ok(rateKey,row.id);assert.ok(rangeKey,row.id);
   assert.equal(gear.fields[rateKey],`${row.checkedFields.fireRate} (tabletop-miniatures turn or melee round)`);
   if (gear.id==='ua-aklys-hurled') assert.match(gear.fields[rangeKey], /^1\* \/ — \/ — \(\* 10-foot range only, not 10 yards\)$/);
   else assert.ok(gear.fields[rangeKey].startsWith(`${row.checkedFields.rangeShortMediumLong} (numeric bands`),row.id);
   for(const key of [rateKey,rangeKey]) {
    const source=gear.fieldSources[key];assert.ok(source?.verification?.regions?.length,`${row.id}: canonical ${key}`);
    if(key.includes(page)) assert.ok(source.verification.regions.includes(row.id),`${row.id}: ${key}`);
    else assert.ok(gear.references?.some(ref=>ref.book===row.book&&ref.pages.includes(row.printedPage)&&ref.verification?.regions?.includes(row.id)),`${row.id}: corroborating reference`);
   }
   assert.equal(gear.fieldSources[rangeKey].verification.coverage,'numeric-bands-only');
  }
 }
});
test('reviewed inventory adds eight distinct items and preserves price quantities',()=>{
 const previousEquipment=withoutSourceFirstEquipment(data.equipment);
 const preOfferCheckpoint=withoutBatch5OfferEquipment(data.equipment);
 assert.equal(withoutPriceCompletionEquipment(data.equipment).length,116);
 assert.equal(previousEquipment.length,88);
 assert.equal(new Set(preOfferCheckpoint.map(i=>i.id)).size,189);
 assert.equal(preOfferCheckpoint.filter(i=>i.price!==null).length,185);
 assert.equal(new Set(data.equipment.map(i=>i.id)).size,191);
 assert.equal(data.equipment.filter(i=>i.price!==null).length,187);
 assert.equal(withoutPriceCompletionEquipment(data.equipment).filter(i=>i.price!==null).length,112);
 assert.equal(catalogs.length,20);assert.equal(previousEquipment.filter(i=>i.price!==null).length,84);assert.equal(data.equipment.filter(i=>i.price===null).length,4);
 for(const id of newIds){assert.equal(data.equipment.filter(i=>i.id===id).length,1);catalog(id)}
 for(const [id,amount,currency] of [['phb-heavy-crossbow',20,'gp'],['phb-light-crossbow',12,'gp'],['phb-composite-long-bow',100,'gp'],['phb-composite-short-bow',75,'gp'],['phb-long-bow',60,'gp'],['phb-short-bow',15,'gp'],['phb-silver-arrow',1,'gp'],['phb-arrow',2,'sp']]){
  const p=item(id).price;assert.deepEqual([p.amount,p.currency,p.book,p.pages],[amount,currency,'PHB',[35]],id);
 }
 const arrow=item('phb-arrow'),silver=item('phb-silver-arrow');
 assert.equal(arrow.price.unit,'single normal arrow');assert.equal(arrow.fields['Normal arrows, dozen price'],'1 gp per dozen');
 assert.ok(arrow.fieldSources['Normal arrows, dozen price'].verification.regions.includes('phb-arrow-phb35-2'));
 assert.equal(silver.price.unit,'single silver arrow');assert.deepEqual(silver.fields,{});assert.deepEqual(silver.fieldSources,{});
 for(const id of ['phb-bo-stick','phb-club','phb-quarterstaff','phb-sling-stone'])assert.equal(item(id).price,null,id);
 for(const [id,amount,currency] of [['ua-aklys-hurled',2,'gp'],['ua-atlatl-javelin',1,'gp'],['ua-blowgun-needle',1,'sp'],['ua-hand-crossbow',300,'gp']]) assert.deepEqual([item(id).price.amount,item(id).price.currency,item(id).price.book,item(id).price.pages],[amount,currency,'UA',[26]],id);
 assert.match(item('ua-atlatl-javelin').name,/Atlatl \(javelin\)/);
 assert.match(item('ua-aklys-hurled').fields['Range S / M / L (UA p.28)'],/^1\* \/ — \/ —/);
 assert.doesNotMatch(item('ua-aklys-hurled').scanVerification.scope,/asterisk.*unavailable/i);
 assert.match(item('ua-aklys-hurled').fields['Range S / M / L (UA p.28)'],/10-foot range only, not 10 yards/);
});
test('unreviewed scale and UA axe damage retain their OCR pending grade',()=>{
 for(const id of ['phb-light-crossbow','phb-heavy-crossbow','ua-hand-crossbow']){
  const s=item(id).fieldSources['Range scale (PHB p.39)'];assert.equal(s.book,'PHB');assert.deepEqual(s.pages,[39]);assert.match(s.status,/OCR checked.*visual.*pending/i);assert.equal(s.verification,undefined);
 }
 for(const id of ['phb-hand-axe','phb-battle-axe'])for(const key of ['Damage vs S/M (UA p.26)','Damage vs Large (UA p.26)']){
  const s=item(id).fieldSources[key];assert.deepEqual([s.book,s.pages],['UA',[26]]);assert.match(s.status,/OCR checked.*visual.*pending/i);assert.equal(s.verification,undefined);
 }
});
test('spell references retain OCR-pending grades except the exact source-reviewed qualifier citations',()=>{
 for(const expected of sourceQualifierReferences){
  const spell=data.spells.find(entry=>entry.id===expected.id);assert.ok(spell,expected.id);
  const ref=spell.references.find(candidate=>candidate.book===expected.book&&candidate.label===expected.label&&JSON.stringify(candidate.pages)===JSON.stringify(expected.pages));
  assert.ok(ref,`${expected.id}: exact source qualifier reference remains present`);
  assert.equal(ref.status,expected.status,`${expected.id}: only the exact source-reviewed status is permitted`);
  const owner=sourceOwnerIdentity.report.overrideApplications.items.entries.find(entry=>entry.key===expected.id);
  assert.ok(owner,`${expected.id}: source-owner identity record`);
  const pinned=owner.references.find(candidate=>candidate.label===expected.label&&JSON.stringify(candidate.pages)===JSON.stringify(expected.pages));
  assert.ok(pinned,`${expected.id}: reference hash appears in the source-owner identity receipt`);
  const displayReference={...ref};delete displayReference.evidenceBindings;
  assert.equal(hashValue(displayReference),pinned.referenceSha256,`${expected.id}: current citation matches exact pinned source qualifier object`);
 }
 for(const spell of data.spells){
  const seen=new Set();
  for(const ref of spell.references||[]){
   const limits={PHB:128,UA:128,DMG:240,MM:112,MM2:160};assert.ok(Object.hasOwn(limits,ref.book),spell.id);
   assert.ok(ref.pages?.length,spell.id);
   const reviewed=[...sourceQuestionReferences,...nextReferences,...closureReferences,...dependencyReferences,...sourceQualifierReferences].find(known=>known.id===spell.id&&known.book===ref.book&&known.label===ref.label&&JSON.stringify(known.pages)===JSON.stringify(ref.pages));
   if(reviewed){assert.deepEqual(ref.pages,reviewed.pages);assert.equal(ref.status,reviewed.status);}
   else assert.match(ref.status,/OCR checked.*visual review pending/,spell.id);
   assert.equal(ref.verification,undefined,spell.id);
   for(const page of ref.pages){
    assert.ok(Number.isInteger(page)&&page>0&&page<=limits[ref.book],spell.id);
    assert.ok(!(ref.book==='DMG'&&[175,239,240].includes(page)),spell.id);
    const exactSelfPageQualifier=sourceQualifierReferences.some(known=>known.id===spell.id&&known.book===ref.book&&known.pages.includes(page)&&known.label===ref.label);
    assert.ok(exactSelfPageQualifier||!(ref.book===spell.book&&spell.pages.includes(page)),`${spell.id}: primary page duplicated outside an exact source-reviewed qualifier`);
    const key=ref.book+':'+page;assert.ok(!seen.has(key),`${spell.id}: repeated reference ${key}`);seen.add(key);
   }
  }
 }
});
test('matching missile rows use one canonical pair and retain separately sourced corroboration',()=>{
 for(const [id,book,page,otherBook,otherPage] of [
  ['phb-hand-axe','UA',28,'PHB',38],['phb-club','UA',28,'PHB',38],['phb-light-crossbow','UA',28,'PHB',38],['phb-heavy-crossbow','UA',28,'PHB',38],
  ['phb-composite-long-bow','PHB',38,'UA',28],['phb-composite-short-bow','PHB',38,'UA',28],['phb-long-bow','PHB',38,'UA',28],['phb-short-bow','PHB',38,'UA',28],
 ]){
  const gear=item(id),rates=Object.keys(gear.fields).filter(k=>/^(Rate of fire|Fire rate)/.test(k)),ranges=Object.keys(gear.fields).filter(k=>k.startsWith('Range S / M / L'));
  assert.equal(rates.length,1,id);assert.equal(ranges.length,1,id);
  for(const key of [...rates,...ranges])assert.deepEqual([gear.fieldSources[key].book,gear.fieldSources[key].pages],[book,[page]],id+' '+key);
  const corroboration=gear.references.find(r=>r.book===otherBook&&r.pages.includes(otherPage)&&r.verification?.method==='supplied-scan-crop');
  assert.ok(corroboration,id+' corroboration');
  assert.ok(corroboration.verification.regions.some(id=>reviewed.some(row=>row.id===id&&row.itemId===gear.id)),id+' row-specific corroboration');
 }
});
test('assembled spell citations exactly match the baseline plus independently approved additions',()=>{
 const fixture=read('./fixtures/remaining-approved-references.json');
 const baseline=read('./fixtures/spell-reference-baseline.json').references;
 const uploaded=read('./fixtures/uploaded-source-references.json');
 assert.equal(uploaded.length,2);
 assert.deepEqual(uploaded.map(ref=>[ref.id,ref.book,ref.pages]),[['ua-illusionist-mirage-arcane','UA',[69]],['ua-illusionist-mirage-arcane','UA',[66]]]);
 assert.equal(fixture.cards,80);assert.equal(fixture.referenceObjects,102);assert.equal(fixture.bookPagePairs,113);
 assert.equal(fixture.additions.length,102);assert.equal(new Set(fixture.additions.map(r=>r.id)).size,80);
 assert.equal(fixture.additions.reduce((n,r)=>n+r.pages.length,0),113);assert.equal(baseline.length,25);
 const key=x=>JSON.stringify([x.id,x.book,x.pages,x.label,x.status]);
 const corrections=read('./fixtures/uploaded-source-reference-corrections.json');
 assert.deepEqual(corrections,[{id:'ua-magic-user-eyebite',book:'PHB',label:'Magic-user charm person procedure',oldPages:[65,66],pages:[65]}]);
 const reviewed=[...baseline,...fixture.additions,...uploaded,...sourceQuestionReferences,...nextReferences,...closureReferences,...dependencyReferences,...sourceQualifierReferences].map(ref=>({...ref}));
 for(const correction of corrections) {
  const matches=reviewed.filter(ref=>ref.id===correction.id&&ref.book===correction.book&&ref.label===correction.label);
  assert.equal(matches.length,1);
  assert.deepEqual(matches[0].pages,correction.oldPages);
  matches[0].pages=correction.pages;
 }
 const expected=reviewed.map(key).sort();
 const eyebite=data.spells.find(spell=>spell.id==='ua-magic-user-eyebite');
 const charm=eyebite.references.filter(ref=>ref.book==='PHB'&&ref.label==='Magic-user charm person procedure');
 assert.equal(charm.length,1);
 assert.deepEqual(charm[0].pages,[65]);
 assert.equal(charm[0].status,'OCR checked · visual review pending');
 const actual=data.spells.flatMap(spell=>(spell.references||[]).map(ref=>({id:spell.id,...ref}))).map(key).sort();
 assert.deepEqual(actual,expected,'all references must be the unchanged baseline or an explicitly reviewed addition');
 for(const ref of [...fixture.additions,...uploaded]){assert.equal(ref.status,'OCR checked · visual review pending');assert.ok(ref.label);}
 const spell=data.spells.find(spell=>spell.id==='ua-illusionist-mirage-arcane');
 const catalog=read('../dist/'+spell.sourceExcerpts.catalog);
 for(const ref of uploaded) assert.ok(catalog.regions.some(region=>region.book===ref.book&&ref.pages.includes(region.printedPage)), `missing source excerpt for ${ref.label}`);
});
