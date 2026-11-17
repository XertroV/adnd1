import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const data=JSON.parse(readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
const beforeLayout=readFileSync(new URL('./fixtures/attribute-layout-before-a15.js',import.meta.url),'utf8').trimEnd();
assert.equal(createHash('sha256').update(beforeLayout).digest('hex'),'b6eca6ebd144ca95dd531de03378107da79a773e837abc9b7d38b6a30a1d9580','frozen a15 renderer fixture changed');
const extract=name=>{const start=app.indexOf(`function ${name}(`);assert.ok(start>=0,`missing production ${name}`);const end=app.indexOf('\nfunction ',start+9);assert.ok(end>start,`could not bound production ${name}`);return app.slice(start,end);};
const escapeDeclaration=app.match(/const escapeHTML = .*;/)?.[0];
assert.ok(escapeDeclaration,'production HTML escaping helper is present');
const helpers=['fieldEntries','fieldValue','componentIcons','attributeRows','attributeFactHTML','hasKnownPrice','hasSuggestedPrice','equipmentPriceLabel'].map(extract).join('\n');
const candidateLayout=extract('attributeLayoutHTML');
const marker='<button data-inline-source';
const escapeAttr=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function engine(layoutText){
 const calls=[];
 const context=vm.createContext({attributeMode:'compact',calls,icon:()=>'',inlineSourceChip:(reference,title)=>{calls.push({reference,title});const pages=Array.isArray(reference.pages)?reference.pages.join(','):'';return `<button data-inline-source data-probe-book="${escapeAttr(reference.book)}" data-probe-pages="${escapeAttr(pages)}" data-probe-title="${escapeAttr(title)}">SOURCE</button>`;}});
 vm.runInContext(`${escapeDeclaration}\nconst esc=escapeHTML;\n${helpers}\n${layoutText}`,context);
 return context;
}
const before=engine(beforeLayout),after=engine(candidateLayout);
const coreRows=html=>[...html.matchAll(/<tr data-field-label="[^"]*"><th scope="row">[\s\S]*?<\/th><td>[\s\S]*?<\/td>/g)].map(match=>match[0]);

test('spell tables expose source controls only for existing field citations',()=>{
 let owners=0,fieldRefs=0,uncited=0,tableButtons=0;
 for(const item of data.spells){
  after.attributeMode='table';after.calls.length=0;
  const rows=after.attributeRows(item),references=rows.filter(row=>Boolean(row.reference));
  const html=after.attributeLayoutHTML(item);
  assert.equal(html.includes('<th scope="col">Source</th>'),references.length>0,item.id);
  assert.equal(after.calls.length,references.length,item.id);
  assert.equal((html.match(/data-inline-source/g)||[]).length,references.length,item.id);
  assert.deepEqual(Array.from(after.calls,call=>call.title),Array.from(references,row=>`${item.name} · ${row.label}`),item.id);
  if(references.length){owners++;fieldRefs+=references.length;tableButtons+=after.calls.length;}
  else uncited++;
 }
 assert.equal(owners,14);assert.equal(fieldRefs,16);assert.equal(uncited,624);assert.equal(tableButtons,16);
});

test('spell compact output and table label/value cells stay unchanged across all 638 entries',()=>{
 for(const item of data.spells){
  before.attributeMode=after.attributeMode='compact';before.calls.length=after.calls.length=0;
  assert.equal(after.attributeLayoutHTML(item),before.attributeLayoutHTML(item),`compact ${item.id}`);
  before.attributeMode=after.attributeMode='table';before.calls.length=after.calls.length=0;
  const oldHtml=before.attributeLayoutHTML(item),newHtml=after.attributeLayoutHTML(item);
  assert.deepEqual(coreRows(newHtml),coreRows(oldHtml),`label/value cells ${item.id}`);
  const hasReference=after.attributeRows(item).some(row=>Boolean(row.reference));
  if(!hasReference)assert.equal(newHtml,oldHtml,`uncited table ${item.id}`);
 }
});

test('equipment compact and table output remain byte-identical across all 192 entries',()=>{
 assert.equal(data.equipment.length,192);
 for(const item of data.equipment)for(const mode of ['compact','table']){
  before.attributeMode=after.attributeMode=mode;before.calls.length=after.calls.length=0;
  assert.equal(after.attributeLayoutHTML(item,{equipment:true}),before.attributeLayoutHTML(item,{equipment:true}),`${mode} ${item.id}`);
 }
});
