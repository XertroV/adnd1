'use strict';
(() => {
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc = escapeHTML;
const normalize = FirstEditionSearch.normalize;
const icons = {
 search:'<circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.5 4.5"/>',
 spark:'<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z"/><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6L20 2Z"/>',
 bag:'<path d="M7 7V6a5 5 0 0 1 10 0v1M4 7h16l2 14H2L4 7Z"/><path d="M8 7v4m8-4v4"/>',
 book:'<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
 shield:'<path d="m12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 pen:'<path d="m15 4 5 5M4 16l-1 5 5-1L21 7a3.5 3.5 0 0 0-5-5L4 16Z"/><path d="m4 16 4 4"/>',
 layers:'<path d="m12 2 10 6-10 6L2 8l10-6Zm-10 11 10 6 10-6M2 18l10 6 10-6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
 target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
 hourglass:'<path d="M6 2h12M6 22h12M7 2v5l5 5-5 5v5m10-20v5l-5 5 5 5v5M8 6h8M8 19h8"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 die:'<path d="m12 2 10 6v10l-10 5L2 18V8l10-6Zm0 0L7 10l5 13 5-13-5-8ZM2 8l5 2h10l5-2M2 18h20"/>',
 area:'<rect x="3" y="3" width="18" height="18" rx="1" stroke-dasharray="2 3"/><path d="M8 12h8m-4-4v8"/>',
 mouth:'<path d="M2 12c4-5 7-7 10-4 3-3 6-1 10 4-4 5-7 7-10 4-3 3-6 1-10-4Zm0 0h20"/>',
 hand:'<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-3 7-7 7-3 0-5-2-7-5l-3-4c-1-2 1-4 3-2l2 2"/>',
 reagent:'<path d="m8 2 2 5-5 7c-3 5 0 8 7 8s10-3 7-8l-5-7 2-5H8Zm1 5h6M7 15c3-2 7 2 10 0"/><path d="m10 12 1 2m3 4 1-1"/>',
 weight:'<path d="M9 7a3 3 0 1 1 6 0M6 8h12l4 13H2L6 8Z"/>',
 coins:'<ellipse cx="9" cy="6" rx="7" ry="3"/><path d="M2 6v5c0 2 3 3 7 3m7-8v4M2 11v5c0 2 3 3 7 3"/><ellipse cx="16" cy="14" rx="6" ry="3"/><path d="M10 14v5c0 2 3 3 6 3s6-1 6-3v-5"/>',
 damage:'<path d="m4 20 5-5m-3-3 6 6M9 15 21 3l-2 7-8 7M3 21l2-2"/>',
 speed:'<path d="M3 7h8M1 12h7m-5 5h8M16 3l-5 10h5l-2 8 8-12h-6l3-6Z"/>'
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
// Original editorial line art. The illustrations do not classify game mechanics.
const illustrations={
 bardiche:'<path d="M23 16v30M21 44h4"/><path d="M24 3c13 0 16 14 4 23l-4-4c8-5 7-11 0-13Z" fill="currentColor" stroke="none"/>',
 'bec-de-corbin':'<path d="M24 6v40M21 44h6M24 2v6M11 12h25M29 9h7v7h-7Z"/><path d="M20 9C12 6 6 10 5 17l14-4" fill="currentColor" stroke="none"/>',
 'bill-guisarme':'<path d="M23 17v29M20 44h6M23 3v14"/><path d="M24 4c6 6 7 11 3 16 9-1 11-5 12-9 4 10-4 16-15 16v-9c4-5 3-9 0-14Z" fill="currentColor" stroke="none"/>',
 partisan:'<path d="M24 23v23M21 44h6"/><path d="m24 2 5 17 8-5-5 11H16l-5-11 8 5Z" fill="currentColor" stroke="none"/>',
 ranseur:'<path d="M24 19v27M21 44h6M12 11v12l12 5 12-5V11M12 11l5 8m19-8-5 8"/><path d="m24 2 4 15-4 6-4-6Z" fill="currentColor" stroke="none"/>',
 sword:'<path d="m13 36 6-6m-5-5 9 9M19 30 39 5l-4 14-13 14M9 40l5-5m-7 3 5 5"/><path d="m23 28 12-16"/>',
 dagger:'<path d="m13 36 7-8m-5-5 11 11M20 28 36 6l-4 17-9 8M9 40l4-4m-6 2 5 5"/>',
 axe:'<path d="m14 44 15-34M19 7l15 7M28 10c10-8 18 1 15 11l-11-4M26 14c-10 4-16-1-16-10l12 5"/>',
 hammer:'<path d="M24 16v28M14 7h23v10H14ZM10 9v6m30-7v8"/>',
 mace:'<path d="M24 21v23M19 10l5-8 5 8 7 4-7 6-5 5-5-5-7-6Z"/>',
 flail:'<path d="m11 44 8-22m0 0 3-8 7-1 5-8M34 5l3-3 3 4 5 1-2 5-2 4-5-2-5-3Z"/>',
 spear:'<path d="M24 19v27"/><path d="m24 2 6 15-6 7-6-7Z" fill="currentColor" stroke="none"/>',
 staff:'<path d="m17 45 12-38q3-7 7-3m-17 34 3 1m2-16 3 1m2-16 3 1"/>',
 bow:'<path d="M12 4c30 10 30 30 0 40L25 24 12 4Zm-6 20h34m-5-5 5 5-5 5"/>',
 crossbow:'<path d="M8 12c12-10 25-10 34 2M8 12l31 6M26 9l-8 34m-3-3 7 2M18 31l10-13m-3-3 5 3-4 3"/>',
 sling:'<path d="M15 4c-5 10 0 19 7 23m12-23c5 10-1 20-8 23M20 25l-1 8 5 5 7-5-3-9M24 38v8"/>',
 armor:'<path d="m15 5 9 4 9-4 10 10-8 7v21H13V22l-8-7L15 5Zm0 0 3 11h12l3-11M17 25h14m-14 7h14"/>',
 shield:'<path d="m24 3 16 6v14c0 10-8 18-16 23-8-5-16-13-16-23V9L24 3Zm0 6v29M14 17h20"/>',
 bag:'<path d="M15 12V9a9 9 0 0 1 18 0v3M10 12h28l5 32H5l5-32Zm7 0v8m14-8v8M15 29h18"/>',
 fighter:'<path d="m8 42 9-9m-6-6 12 12M17 33 40 5l-4 16-14 17M40 42l-8-9m-6 6 12-12M32 33 8 5l4 16 15 17"/>',
 cleric:'<circle cx="24" cy="23" r="12"/><path d="M24 2v6m0 30v8M3 23h6m30 0h6M9 8l4 4m22 23 4 4M9 38l4-4M35 12l4-4M24 14v19m-7-12h14"/>',
 druid:'<path d="M12 34C-1 15 27 8 39 4c-1 16-2 38-27 30Zm-4 10L32 13M18 29l-3-10m6 5 11-1"/>',
 paladin:'<path d="m24 3 16 6v14c0 10-8 18-16 23-8-5-16-13-16-23V9L24 3Z"/><path d="m24 11 3 8 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1Z"/>',
 ranger:'<path d="M11 4c30 10 30 30 0 40L25 24 11 4Zm-6 20h35m-5-5 5 5-5 5M6 8c8 0 8 6 7 10-6-1-9-4-7-10Z"/>',
 wizard:'<path d="m9 43 22-29m-5-3 8 6m1-15 2 5 6 2-6 2-2 6-2-6-6-2 6-2 2-5ZM8 9l1 3 4 1-4 1-1 4-1-4-4-1 4-1Z"/>',
 illusionist:'<path d="M3 24c14-18 28-18 42 0-14 18-28 18-42 0Z"/><circle cx="24" cy="24" r="8"/><path d="M24 2v7M8 8l5 5m27-5-5 5M24 39v7"/>',
 thief:'<circle cx="16" cy="16" r="9"/><path d="m22 22 21 21M30 30l5-5m1 11 5-5M12 12l5 5"/>',
 assassin:'<path d="M35 3C15-1 1 26 20 39c-7-14 2-28 15-36ZM23 37l5-6m-5-4 10 10M28 31 42 8l-3 17-8 9M19 42l4-5"/>',
 monk:'<path d="M16 25V11a3 3 0 0 1 6 0v12-17a3 3 0 0 1 6 0v17-13a3 3 0 0 1 6 0v15-9a3 3 0 0 1 6 0v15c0 8-6 14-14 14-6 0-10-4-14-10L6 27c-2-4 2-8 6-4l4 4"/>',
 bard:'<path d="M11 5c12 5 14 5 26 0l-3 18c-1 11-5 16-10 21-5-5-9-10-10-21L11 5Zm7 4 1 25m5-23v29m6-31-1 25M15 23h18"/>',
 cavalier:'<path d="M15 44c-4-13 4-15 5-26l-8 5-6-6L24 4l9 1 3 10c8 7 8 18 3 29H15ZM25 4l1-3 5 4M27 13h1M19 33h22"/>',
 barbarian:'<path d="m13 44 16-34M19 7l15 7M28 10c10-8 18 1 15 11l-11-4M26 14c-10 4-16-1-16-10l12 5M7 38l7 3"/>',
 acrobat:'<circle cx="24" cy="8" r="4"/><path d="M24 12v15M8 19l16-4 16 4M24 27l-12 15m12-15 12 15M4 45h40"/>'
};
function illustrationKey(item,kind=view){
 const name=String(item.name||item.title||'').toLowerCase();
 if(kind==='classes')return /acrobat/.test(name)?'acrobat':/cavalier/.test(name)?'cavalier':/barbarian/.test(name)?'barbarian':/paladin/.test(name)?'paladin':/ranger/.test(name)?'ranger':/illusionist/.test(name)?'illusionist':/magic.user/.test(name)?'wizard':/assassin/.test(name)?'assassin':/thief/.test(name)?'thief':/monk/.test(name)?'monk':/bard/.test(name)?'bard':/druid/.test(name)?'druid':/cleric/.test(name)?'cleric':'fighter';
 if(kind!=='equipment')return null;
 for(const key of ['bardiche','bec-de-corbin','bill-guisarme','partisan','ranseur'])if(name.replace(/[\s-]+/g,'-').includes(key))return key;
 return /crossbow/.test(name)?'crossbow':/bow|arrow/.test(name)?'bow':/dagger|knife/.test(name)?'dagger':/sword|scimitar/.test(name)?'sword':/axe/.test(name)?'axe':/hammer|military.pick/.test(name)?'hammer':/mace|morning.star|club/.test(name)?'mace':/flail/.test(name)?'flail':/spear|javelin|lance|trident|pike|glaive|guisarme|halberd|fauchard|voulge|fork/.test(name)?'spear':/staff/.test(name)?'staff':/sling/.test(name)?'sling':/shield/.test(name)?'shield':/armor|mail|plate|leather|padded|helmet/.test(name)?'armor':'bag';
}
function illustrationHTML(item,kind=view){const key=illustrations[item.icon]?item.icon:illustrationKey(item,kind);return key?`<svg class="editorial-icon" data-illustration="${key}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${illustrations[key]}</svg>`:'';}
function fieldEntries(item){return Object.entries(item.fields||{}).filter(([,value])=>value!==null&&value!==undefined&&value!=='');}
function fieldValue(value){return Array.isArray(value)?value.map(fieldValue).join(', '):value&&typeof value==='object'?JSON.stringify(value):String(value);}
function componentIcons(value){const tokens=String(value).match(/\b[VSM]\b/g)||[];return [...new Set(tokens)].map(token=>icon({V:'mouth',S:'hand',M:'reagent'}[token])).join('')||icon('spark');}
function attributeRows(item,{equipment=false}={}){
 const glyphs={range:'target',duration:'hourglass',components:'components',castingtime:'clock',savingthrow:'die',area:'area',areaofeffect:'area',material:'reagent',materials:'reagent',m:'reagent'};
 const fields=fieldEntries(item).map(([label,value])=>({label,value,glyph:glyphs[label.toLowerCase().replace(/[^a-z]/g,'')]||(/weight/i.test(label)?'weight':/damage/i.test(label)?'damage':/range/i.test(label)?'target':/armor|shield/i.test(label)?'shield':/speed|rate/i.test(label)?'speed':'info'),reference:item.fieldSources?.[label]}));
 return equipment?[{label:'Purchase price · currency',value:equipmentPriceLabel(item),glyph:'coins',reference:hasKnownPrice(item)?item.price:null},...fields]:fields;
}
function attributeFactHTML({label,value,glyph='info'}){
 return `<div class="attribute-fact" data-field-label="${esc(label)}"><dt><span class="fact-icon">${glyph==='components'?componentIcons(value):icon(glyph)}</span><span class="fact-label">${esc(label)}</span><span aria-hidden="true">:</span></dt> <dd>${esc(fieldValue(value))}</dd></div>`;
}
function attributeLayoutHTML(item,{equipment=false}={}){
 const rows=attributeRows(item,{equipment});
 if(attributeMode==='table')return `<div class="attribute-table-wrap"><table class="attribute-table"><caption class="sr-only">Extracted attributes for ${esc(item.name||item.title||item._title)}</caption><thead><tr><th scope="col">Source field</th><th scope="col">Extracted value</th>${equipment?'<th scope="col">Source</th>':''}</tr></thead><tbody>${rows.map(({label,value,reference})=>`<tr data-field-label="${esc(label)}"><th scope="row">${esc(label)}</th><td>${esc(fieldValue(value))}</td>${equipment?`<td>${reference?inlineSourceChip(reference,`${item.name} · ${label}`):'<span class="small muted">Field citation pending</span>'}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
 const cited=rows.filter(row=>row.reference);
 return `<dl class="compact-facts ${equipment?'equipment-facts':'spell-facts'}">${rows.map(attributeFactHTML).join('')}</dl>${cited.length?`<details class="attribute-citations" data-attribute-citations><summary>Field sources</summary><div class="attribute-citation-list">${cited.map(({label,reference})=>`<div><span>${esc(label)}</span>${inlineSourceChip(reference,`${item.name} · ${label}`)}</div>`).join('')}</div></details>`:''}`;
}
function attributesHTML(item,{equipment=false}={}){
 const rows=attributeRows(item,{equipment});if(!rows.length)return '';
 return `<section class="attribute-section" data-attribute-layout="${attributeMode}" aria-label="${equipment?'Equipment':'Spell'} attributes"><div class="attribute-toolbar"><div class="attribute-view-switch" role="group" aria-label="Attribute layout">${['compact','table'].map(mode=>`<button type="button" data-attribute-view="${mode}" aria-controls="attributeContent" aria-pressed="${attributeMode===mode}">${mode==='compact'?'Compact':'Table'}</button>`).join('')}</div></div><div class="attribute-content" id="attributeContent">${attributeLayoutHTML(item,{equipment})}</div></section>`;
}
function spellAttributesHTML(item){return attributesHTML(item);}

function detailHeaderHTML(item,{eyebrow,status='OCR checked',statusClass='unverified',pending=false,extra='',attributes=''}={}){
 return `<header class="detail-header compact-header"><div class="detail-heading-group">${illustrationHTML(item)}<div class="detail-heading-text"><span class="eyebrow">${esc(eyebrow||'REFERENCE')}</span><h2>${esc(item.name||item._title||item.title)}</h2></div>${noteButton(item)}</div><div class="detail-subtitle">${extra}${sourceChip(item,pending)}<span class="status-chip ${esc(statusClass)}">${esc(status)}</span></div>${attributes}</header>`;
}
$$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const STORAGE_KEY = 'first-edition-notebook-v1';
const views = ['spells','rules','equipment','classes','notebook','sources'];
let data = {spells:[], rules:[], equipment:[], classes:[], sources:[], matrices:[],progressionExplainer:null,release:null};
let view = 'spells';
let selectedId = '';
let filter = {q:'', class:'', book:'', category:'', details:''};
let selectedSpellLevels = new Set();
let notes = [];
let storageAvailable = true;
let pendingNote = null;
let commandRows = [];
let commandIndex = 0;
let selectionContext = null;
let toastTimer;
let paletteOrigin;
let paletteRestoreFocus=true;
let renderedRouteHash=null;
let referenceSearchTimer;
let index = [];
const classTargets = new Map();
let fighterAltOpen=false;
let fighterMatrixOpen=false;
let attributeMode='compact';
let listLimit = 50;
function toast(message) {
 const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
function readNotes() {
 try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); notes = validateNotes(parsed); }
 catch { notes = []; storageAvailable = false; }
 updateCounts();
}
function validateNotes(parsed) {
 if (!Array.isArray(parsed)) throw new Error('A notebook must contain a list of annotations.');
 if (parsed.length > 5000) throw new Error('This notebook exceeds the 5,000 annotation limit.');
 return parsed.map(n => {
  if (!n || typeof n !== 'object' || typeof n.text !== 'string' || !n.text.trim() || n.text.length > 20000) throw new Error('An annotation is missing text or exceeds 20,000 characters.');
  const string = (v, max) => typeof v === 'string' ? v.slice(0,max) : '';
  const safeView = views.includes(n.view) ? n.view : 'rules';
  return {id:string(n.id,100) || newId(), target:string(n.target,300), title:string(n.title,500) || 'Untitled annotation', view:safeView, quote:string(n.quote,5000), text:n.text, created:string(n.created,40) || new Date().toISOString(), updated:string(n.updated,40) || new Date().toISOString()};
 });
}
function newId() { return globalThis.crypto?.randomUUID?.() || `note-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function persistNotes(nextNotes) {
 if(nextNotes.length > 5000){toast('This notebook is limited to 5,000 annotations. Export a backup, then remove an old note before adding another.');return false;}
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes)); notes = nextNotes; storageAvailable = true; updateCounts(); buildIndex(); return true; }
 catch { storageAvailable = false; toast('Browser storage is unavailable or full. Export your notebook before leaving.'); return false; }
}
function updateCounts() {
 $('#spellCount').textContent = data.spells.length.toLocaleString();
 $('#ruleCount').textContent = data.rules.length.toLocaleString();
 $('#equipmentCount').textContent = data.equipment.length.toLocaleString();
 $('#noteCount').textContent = notes.length.toLocaleString();
}
function bookName(book) {return FirstEditionBooks.title(book);}
function bookCode(book) {return FirstEditionBooks.code(book);}
function pagesFor(item) { return (Array.isArray(item.pages) ? item.pages : item.page != null ? [item.page] : []).filter(p => Number.isInteger(Number(p)) && Number(p) > 0).map(Number); }
function pdfPage(book,printed) {return FirstEditionBooks.pdfPage(book,printed);}
function hasDetails(item) { return Object.keys(item.fields || {}).length > 0 || (Array.isArray(item.effect) && item.effect.length > 0); }
function statusLabel(item) {
 if (view === 'spells' && !hasDetails(item)) return 'Details pending';
 return item.status || 'Source extraction in progress';
}
function isVerified(item) { const s = String(item.status || '').toLowerCase(); return s.includes('visually verified') && !s.includes('not visually'); }
function selectedScanVerification(item){const verification=item.scanVerification||item.sourceExcerpts;return ['selected-values-checked','source-excerpt-checked'].includes(verification?.state)&&Number.isInteger(verification.regionCount)&&verification.regionCount>0?verification:null;}
function scanCoverage(){
 const items=[...['spells','rules','equipment','classes','matrices'].flatMap(key=>data[key]),...(data.progressionExplainer?[{...data.progressionExplainer,id:'progression-explainer'}]:[])].filter(selectedScanVerification);
 const excerpts=data.release?.excerpts;
 const listed=Array.isArray(excerpts?.itemIds)?excerpts.itemIds.filter(id=>typeof id==='string').sort():null;
 const matches=listed&&JSON.stringify(listed)===JSON.stringify(items.map(item=>item.id).sort());
 const count=key=>matches&&Number.isInteger(excerpts[key])&&excerpts[key]>0?excerpts[key]:null;
 return {items,selectedValuesItems:items.filter(item=>item.scanVerification?.state==='selected-values-checked').length,sourceExcerptItems:items.filter(item=>item.scanVerification?.state==='source-excerpt-checked'||item.sourceExcerpts?.state==='source-excerpt-checked').length,regions:count('regions'),scopedRegions:count('scopedRegions'),imageFiles:count('imageFiles')};
}
function classesOf(item) { return Array.isArray(item.classes) && item.classes.length ? item.classes : Array.isArray(item.class) ? item.class : item.class ? [item.class] : []; }
function classText(item) { return classesOf(item).join(' / ') || 'Class not yet extracted'; }
function levelText(item) { return item.level === undefined || item.level === null || item.level === '' ? 'Level not yet extracted' : `Level ${item.level}`; }
function sourceChip(item, indexOnly = false) {
 const groups=FirstEditionCitations.collect(item);
 const prefix=indexOnly?(String(item.status||'').toLowerCase().includes('heading')?'Spell heading · ':'Spell index · '):'';
 if(!groups.length)return `<span class="source-chip source-pending">Source page pending</span>`;
 return groups.map(group=>{const text=`${prefix}${bookCode(group.book)} ${group.pages.length===1?'p.':'pp.'} ${compactPageList(group.pages)}`;return `<button class="source-chip" data-source-id="${esc(item.id)}" data-source-view="${esc(item._view||view)}" data-source-book="${esc(group.book)}" aria-label="Open original source reference: ${esc(text)}">${esc(text)}</button>`;}).join('');
}
function compactPageList(pages){const ranges=[];for(const page of pages){const last=ranges.at(-1);if(last&&page===last[1]+1)last[1]=page;else ranges.push([page,page]);}return ranges.map(([start,end])=>start===end?String(start):`${start}–${end}`).join(', ');}
function originalScansButton(item){return `<button class="source-chip view-original-scans" data-view-scans="${esc(item.id)}" data-scan-view="${esc(item._view||view)}">${icon('book')}View original scans</button>`;}
function noteButton(item, target = item.id, title = item.name || item.title) {
 const count = notes.filter(n => n.target === target).length;
 return `<button class="note-button" data-annotate="${esc(target)}" data-note-title="${esc(title)}" data-note-view="${esc(view)}">${icon('pen')}${count ? `${count} note${count === 1 ? '' : 's'}` : 'Annotate'}</button>`;
}
function inlineNotes(target) {
 const matching = notes.filter(n => n.target === target || n.target.startsWith(target + ':level:'));
 if (!matching.length) return '';
 return `<div class="inline-notes">${matching.map(n => `<div class="inline-note"><div class="inline-note-label">YOUR ANNOTATION</div>${n.quote ? `<blockquote>${esc(n.quote)}</blockquote>` : ''}${esc(n.text)}</div>`).join('')}</div>`;
}
function banner() {
 const checked=scanCoverage();
 const verification=checked.items.length?`Mostly OCR-checked references. ${checked.regions===null?'Selected values checked':`${checked.regions} unique scan regions checked`} across ${checked.items.length} reference ${checked.items.length===1?'entry':'entries'}; broader visual verification is pending.`:'OCR-checked references; visual table verification is pending.';
 return `<div class="coverage-banner">${icon('info')}<span><strong>Curated first release · expanding coverage.</strong> ${esc(verification)}</span><a href="#sources">See coverage &amp; known gaps ↗</a></div>`;
}
function pageHeading(eyebrow, title, description, actions = '') {
 return `<div class="page-heading"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${actions || '<div class="heading-flourish" aria-hidden="true">✧</div>'}</div>`;
}
function buildIndex() {
 index = [
  ...data.spells.map(x => ({...x, _view:'spells', _title:x.name || x.title || '', _subtitle:`${classText(x)} · ${levelText(x)} · ${bookCode(x.book)}`})),
  ...data.rules.map(x => ({...x, _view:'rules', _title:x.title || '', _subtitle:`${x.category || 'Rule'} · ${bookCode(x.book)}`})),
  ...data.equipment.map(x => ({...x, _view:'equipment', _title:x.name || '', _subtitle:`${x.category || 'Equipment'} · ${equipmentPriceLabel(x)} · ${bookCode(x.book)}`})),
  ...data.classes.map(x => ({...x, _view:'classes', _title:x.name || '', _subtitle:`Class & advancement · ${bookCode(x.book)}`})),
  ...notes.map(x => ({...x, _view:'notebook', _title:x.title, _subtitle:'Personal annotation'}))
 ].map(x => FirstEditionSearch.prepare({...x,_bookName:bookName(x.book)}));
}
function matchesQuery(item, q) {
 return Number.isFinite(FirstEditionSearch.score(item,q));
}
function route({force=false}={}) {
 if(!force&&renderedRouteHash===location.hash)return;
 clearTimeout(referenceSearchTimer);
 const hash = location.hash.slice(1).split('/');
 const newView = views.includes(hash[0]) ? hash[0] : 'spells';
 const oldView = view;
 view = newView;
 let requested = '';
 try { requested = decodeURIComponent(hash.slice(1).join('/')); } catch { requested = ''; }
 if (oldView !== view) listLimit = 50;
 if (oldView !== view) {filter = {q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();}
 selectedId = requested;
 render();
 renderedRouteHash=location.hash;
}
function goTo(newView, id = '', {reveal=false}={}) {
 const hash = `#${newView}${id ? '/' + encodeURIComponent(id) : ''}`;
 if(location.hash!==hash)history.pushState(null,'',hash);
 route({force:true});
 if(reveal)revealSelectedReference(newView,id);
}
function revealSelectedReference(targetView,targetId) {
 const card=targetView==='notebook'?document.getElementById(`note-${targetId}`):view===targetView&&selectedId===targetId?$('#referenceDetail .detail-card'):null;
 if(!card){$('#main').focus({preventScroll:true});return;}
 const heading=$('h2',card)||card;
 heading.setAttribute('tabindex','-1');
 heading.classList.add('reference-focus-target');
 heading.focus({preventScroll:true});
 card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start',inline:'nearest'});
}
function revealInitialReference(){
 const path=location.hash.slice(1).split('/');if(path.length<2)return;
 let id;try{id=decodeURIComponent(path.slice(1).join('/'));}catch{return;}
 if(!id||selectedId!==id)return;
 const exists=view==='notebook'?notes.some(note=>note.id===id):index.some(item=>item._view===view&&item.id===id);
 if(exists)revealSelectedReference(view,id);
}
function render() {
 $$('[data-view]').forEach(a => { if (a.dataset.view === view) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
 $('#breadcrumbCurrent').textContent = ({spells:'SPELLBOOK',rules:'RULES REFERENCE',equipment:'EQUIPMENT',classes:'CLASSES & ADVANCEMENT',notebook:'MY NOTEBOOK',sources:'SOURCES & COVERAGE'})[view];
 document.title = `${({spells:'Spellbook',rules:'Rules reference',equipment:'Equipment',classes:'Classes & advancement',notebook:'My notebook',sources:'Sources & coverage'})[view]} — First Edition`;
 $('#selectionNote').hidden = true;
 if (view === 'notebook') renderNotebook();
 else if (view === 'sources') renderSources();
 else renderReference();
 bindPage();
}
function options(values, selected, allLabel) {
 return `<option value="">${esc(allLabel)}</option>${[...new Set(values.filter(v => v !== '' && v != null).map(String))].sort((a,b) => a.localeCompare(b,undefined,{numeric:true})).map(v => `<option value="${esc(v)}"${String(selected) === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}`;
}
// Pure selection rules: an empty Set represents All (no level restriction).
function availableSpellLevels(spells, selectedClass = '') {
 return [...new Set(spells.filter(spell=>!selectedClass||classesOf(spell).includes(selectedClass)).map(spell=>spell.level).filter(level=>level!==null&&level!==undefined&&level!==''&&Number.isInteger(Number(level))&&Number(level)>=0).map(String))].sort((a,b)=>Number(a)-Number(b));
}
function reconcileSpellLevelSelection(selected, available) {
 const allowed=new Set(available.map(String));
 const next=new Set([...selected].map(String).filter(level=>allowed.has(level)));
 return next.size===allowed.size?new Set():next;
}
function toggleSpellLevelSelection(selected, choice, available) {
 const current=reconcileSpellLevelSelection(selected,available);
 if(choice==='all')return new Set();
 const level=String(choice);
 if(!available.map(String).includes(level))return current;
 if(current.has(level))current.delete(level);else current.add(level);
 return reconcileSpellLevelSelection(current,available);
}
function spellTogglesHTML() {
 const classes=[...new Set(data.spells.flatMap(classesOf))].sort((a,b)=>a.localeCompare(b));
 const levels=availableSpellLevels(data.spells,filter.class);
 const selectedCount=selectedSpellLevels.size;
 return `<div class="spell-quick-filters"><fieldset class="spell-toggle-group"><legend>Spellcasting class <span>${esc(filter.class||'All classes')}</span></legend><div class="spell-toggle-row" aria-label="Choose a spellcasting class"><button type="button" class="spell-toggle" data-spell-class="" aria-pressed="${!filter.class}" aria-label="All spellcasting classes">All</button>${classes.map(name=>`<button type="button" class="spell-toggle" data-spell-class="${esc(name)}" aria-pressed="${filter.class===name}">${esc(name)}</button>`).join('')}</div></fieldset><fieldset class="spell-toggle-group" aria-describedby="spellLevelHelp"><legend>Spell levels <span>${selectedCount?`${selectedCount} selected`:'All levels'}</span></legend><div class="spell-toggle-row level-toggle-row"><button type="button" class="spell-toggle" data-spell-level="all" aria-pressed="${!selectedCount}" aria-label="All spell levels; clear the level filter">All</button>${levels.map(level=>`<button type="button" class="spell-toggle${level==='0'?' cantrip-toggle':''}" data-spell-level="${esc(level)}" aria-pressed="${selectedSpellLevels.has(level)}" aria-label="${level==='0'?'0 Cantrip, spell level 0':`Spell level ${esc(level)}`}"><span>${esc(level)}</span> ${level==='0'?'<small>Cantrip</small>':''}</button>`).join('')}</div><p id="spellLevelHelp">Choose one or more levels. All clears the level filter.</p></fieldset></div>`;
}
function bindSpellToggles() {
 $$('[data-spell-class]').forEach(button=>button.addEventListener('click',()=>{
  const chosen=button.dataset.spellClass;
  filter.class=filter.class===chosen?'':chosen;
  selectedSpellLevels=reconcileSpellLevelSelection(selectedSpellLevels,availableSpellLevels(data.spells,filter.class));
  selectedId='';listLimit=50;renderReference();bindPage();
  $$('[data-spell-class]').find(el=>el.dataset.spellClass===chosen)?.focus({preventScroll:true});
 }));
 $$('[data-spell-level]').forEach(button=>button.addEventListener('click',()=>{
  const chosen=button.dataset.spellLevel;
  selectedSpellLevels=toggleSpellLevelSelection(selectedSpellLevels,chosen,availableSpellLevels(data.spells,filter.class));
  selectedId='';listLimit=50;renderReference();bindPage();
  $$('[data-spell-level]').find(el=>el.dataset.spellLevel===chosen)?.focus({preventScroll:true});
 }));
}

function hasKnownPrice(item) {return item.price!==null&&typeof item.price==='object'&&typeof item.price.amount==='number'&&Number.isFinite(item.price.amount)&&item.price.amount>=0&&typeof item.price.currency==='string'&&Boolean(item.price.currency.trim());}
function equipmentPriceLabel(item) {
 if(hasKnownPrice(item))return `${['estimate','estimated'].includes(item.priceState)?'Estimate · ':''}${item.price.amount.toLocaleString()} ${item.price.currency}${item.price.unit?` / ${item.price.unit}`:''}`;
 return item.priceState==='not_listed'?'Not listed in source':'Price not extracted';
}
function equipmentBooks(item) {return [...new Set([item.book,item.price?.book,...Object.values(item.fieldSources||{}).map(source=>source.book),...(item.references||[]).map(source=>source.book)].filter(Boolean).map(bookCode))];}
function equipmentDetailHTML(item) {
 const known=hasKnownPrice(item);
 const checked=selectedScanVerification(item);
 const grade=checked?.state==='selected-values-checked'?'Selected values checked':checked?'Source excerpts checked':'Partial extraction · OCR checked';
 const footerGrade=checked?.state==='selected-values-checked'?'Selected values checked against scan crops · partial reference':checked?'Source excerpts checked · extraction remains partial':'Partial extraction · source OCR checked · visual verification pending';
 const priceGapNote=item.priceNote||(item.priceState==='not_listed'?'The recorded source does not list a purchase price for this item.':'A reliable purchase price is not available in this extraction. This is not a statement that the source omits a price.');
 const attributes=attributesHTML(item,{equipment:true});
 return `<article class="detail-card equipment-card" data-annotation-target="${esc(item.id)}" data-annotation-title="${esc(item.name)}">${detailHeaderHTML(item,{eyebrow:item.category||'EQUIPMENT',status:grade,statusClass:checked?'':'unverified',attributes})}<div class="detail-body">${checked?`<p class="small muted scan-verification-scope">${esc(checked.scope||'Selected values were checked against limited source crops. This reference remains partial.')}</p>`:''}${!known?`<p class="price-gap"><strong>${esc(equipmentPriceLabel(item))}.</strong> ${esc(priceGapNote)}</p>`:item.priceNote?`<p class="small muted">${esc(item.priceNote)}</p>`:''}${item.summary?`<h3>At a glance</h3><p>${esc(item.summary)}</p>`:''}${Array.isArray(item.references)&&item.references.length?`<details class="additional-references"><summary>Related source references</summary><div class="equipment-references">${item.references.map(reference=>`<div><span>${esc(reference.label||'Source reference')}</span>${inlineSourceChip(reference,`${item.name} · ${reference.label||'reference'}`)}</div>`).join('')}</div></details>`:''}<div class="callout"><strong>Keep the units separate.</strong> Purchase prices are coin amounts. “gp-weight” is an encumbrance unit, not a price. Missing prices and statistics stay unavailable; none are inferred from weight or similar items. Weapon values retain the source’s numeric ranges.</div></div>${inlineNotes(item.id)}<footer class="detail-footer"><span>${icon('book')}${esc(footerGrade)}</span>${originalScansButton(item)}<button class="source-chip" data-copy-link="${esc(item.id)}">Copy reference link ↗</button></footer></article>`;
}

function filtersHTML() {
 const spells = view === 'spells';
 const items = data[view] || [];
 return `<section class="search-panel" aria-label="Search and filter ${esc(view)}"><div class="reference-search">${icon('search')}<input type="search" id="referenceSearch" aria-label="Search ${esc(view)}" placeholder="${spells ? 'Search a spell, effect, or abbreviation (CLW, MM)…' : view === 'rules' ? 'Search rules, topics, or source references…' : view==='equipment'?'Search equipment, prices, or shorthand (xbow)…': 'Find a class or advancement rule…'}" value="${esc(filter.q)}" autocomplete="off"><span class="search-shortcut">START WITH A NAME OR KEYWORD</span></div>${spells?spellTogglesHTML():''}<div class="filters${view==='equipment'?' equipment-filters':''}">${spells ? `<div class="filter-field class-precision-filter"><label for="classFilter">Class</label><select id="classFilter" data-filter="class" aria-label="Filter by spellcasting class">${options(items.flatMap(classesOf),filter.class,'All classes')}</select></div>` : (view === 'rules'||view==='equipment') ? `<div class="filter-field"><label for="categoryFilter">Topic</label><select id="categoryFilter" data-filter="category" aria-label="Filter by topic">${options(items.map(x=>x.category),filter.category,'All topics')}</select></div>` : ''}<div class="filter-field"><label for="bookFilter">${view==='equipment'?'Cited source':'Source'}</label><select id="bookFilter" data-filter="book" aria-label="Filter by source book">${options(view==='equipment'?items.flatMap(equipmentBooks):items.map(x => bookCode(x.book)),filter.book,view==='equipment'?'All cited books':'All source books')}</select></div>${spells ? `<div class="filter-field"><select id="detailsFilter" data-filter="details" aria-label="Filter by detail availability"><option value=""${!filter.details?' selected':''}>All indexed spells</option><option value="ready"${filter.details==='ready'?' selected':''}>Quick-reference cards</option><option value="pending"${filter.details==='pending'?' selected':''}>Details pending</option></select></div>` : ''}${view==='equipment'?`<div class="filter-field"><label for="priceFilter">Price</label><select id="priceFilter" data-filter="price" aria-label="Filter by purchase-price availability"><option value=""${!filter.price?' selected':''}>All price states</option><option value="known"${filter.price==='known'?' selected':''}>Price transcribed</option><option value="unknown"${filter.price==='unknown'?' selected':''}>Price not transcribed</option></select></div>`:''}<button class="clear-filters" id="clearFilters">Reset filters</button></div></section>`;
}
function filteredItems() {
 let result = index.filter(x => x._view === view && matchesQuery(x, filter.q));
 if (filter.book) result = result.filter(x => view==='equipment'?equipmentBooks(x).includes(filter.book):bookCode(x.book) === filter.book);
 if(view==='equipment'&&filter.price)result=result.filter(x=>filter.price==='known'?hasKnownPrice(x):!hasKnownPrice(x));
 if (filter.class) result = result.filter(x => classesOf(x).includes(filter.class));
 if (view==='spells'&&selectedSpellLevels.size) result = result.filter(x=>selectedSpellLevels.has(String(x.level)));
 if (filter.category) result = result.filter(x => x.category === filter.category);
 if (filter.details) result = result.filter(x => filter.details === 'ready' ? hasDetails(x) : !hasDetails(x));
 return result.sort((a,b) => (filter.q ? FirstEditionSearch.score(a,filter.q)-FirstEditionSearch.score(b,filter.q) : 0) || (view === 'spells' && !filter.q && !filter.details ? Number(hasDetails(b))-Number(hasDetails(a)) : 0) || a._title.localeCompare(b._title));
}
function renderReference() {
 captureCombatDisclosureState();
 const headings = {
  spells:['THE ARCANE & THE DIVINE','The spellbook','Every casting starts with a clear answer. Find a spell, scan the essentials, and follow the source.'],
  rules:['THE ART OF ADVENTURING','Rules, within reach.','A growing reference to first edition: concise guidance, precise page locations, and space for your own rulings.'],
  equipment:['READY FOR THE ROAD','The outfitter’s ledger.','Find equipment, source-listed attributes, and transcribed purchase prices. Missing prices stay unknown; gp-weight stays separate.'],
  classes:['FROM FIRST LEVEL ONWARD','The road to the next level.','Find your class, check its experience thresholds, and prepare your next advancement with the source at hand.']
 };
 const heading = headings[view];
 const list = filteredItems();
 let item = list.find(x => x.id === selectedId) || list[0];
 if (selectedId && !item) item = index.find(x => x._view === view && x.id === selectedId);
 selectedId = item?.id || '';
 const detailed = view === 'spells' ? list.filter(hasDetails).length : 0;
 $('#main').innerHTML = pageHeading(...heading) + banner() + filtersHTML() + (view==='classes'?progressionExplainerHTML():'') + `<div class="result-toolbar"><span><strong>${list.length.toLocaleString()}</strong> ${view === 'spells' ? 'indexed spell entries' : view === 'classes' ? 'class guides' : view==='equipment'?'equipment entries':'references'}${view === 'spells' ? ` <span class="highlight-count">· ${detailed} matching quick-reference cards</span>` : ''}</span><span class="sort-label">${view === 'spells' && !filter.q && !filter.details ? 'Quick-reference cards first' : 'Alphabetical reference'}</span></div><div class="reference-layout"><section class="result-list" aria-label="${esc(view)} results">${list.length ? list.slice(0,listLimit).map(x => resultHTML(x,x.id === selectedId)).join('') + (list.length > listLimit ? `<button class="button secondary" id="loadMore">Show ${Math.min(50,list.length-listLimit)} more · ${list.length-listLimit} remaining</button>` : '') : `<div class="no-results">No matching ${esc(view)}.<br>Try a shorter search or reset the filters.</div>`}</section><section id="referenceDetail" aria-label="Selected reference">${item ? detailHTML(item) : `<div class="empty-state"><h2>A little unexplored territory.</h2><p>${data[view].length ? 'No reference matches these filters. Broaden your search to find another path.' : 'Source extraction for this section is in progress. The coverage page shows what is available today.'}</p><a class="button secondary" href="#sources">View source coverage ${icon('arrow')}</a></div>`}</section></div>`;
 $('#filterStatus').textContent = `${list.length} ${view === 'spells' ? 'spell entries' : view === 'classes' ? 'class guides' : view==='equipment'?'equipment entries':'rule references'} match your search${view === 'spells' ? `; ${detailed} quick-reference cards` : ''}.`;
}
function resultHTML(x, selected) {
 const sub = view==='equipment'?`${equipmentPriceLabel(x)} · ${bookCode(x.book)}`:view === 'spells' ? `${classText(x)} · ${levelText(x)}` : view === 'classes' ? `${x.hitDie ? `Hit die ${x.hitDie} · ` : ''}${bookCode(x.book)}` : x.category || 'Rules reference';
 const top = view==='equipment'?x.category||'EQUIPMENT':view === 'spells' ? hasDetails(x) ? 'QUICK REFERENCE' : 'SPELL INDEX' : view === 'classes' ? x.variant || 'CLASS GUIDE' : bookCode(x.book);
 return `<button class="result-item${selected?' selected':''}" data-select="${esc(x.id)}" aria-pressed="${selected}"><div class="result-topline">${esc(top)}</div><div class="result-name">${illustrationHTML(x)}<span>${esc(x._title)}</span></div><div class="result-meta">${esc(sub)}</div>${view === 'rules' && x.summary ? `<p class="result-preview">${esc(x.summary)}</p>` : ''}</button>`;
}
function progressionExplainerHTML(){
 const explainer=data.progressionExplainer;if(!explainer||typeof explainer!=='object')return '';
 return `<details class="progression-explainer" data-source-context="progression-explainer" data-full-attributes><summary>${esc(explainer.title||'Class progression paths')}<small>Class tracks, concurrent combinations, and sequential changes</small></summary><div class="progression-explainer-body"><p>${esc(explainer.description||'')}</p>${(explainer.sections||[]).map(section=>`<section><h3>${esc(section.label)}</h3><p>${esc(section.description)}</p><div class="progression-source-list">${(section.references||[]).map(reference=>inlineSourceChip(reference,section.label)).join('')}</div></section>`).join('')}${Array.isArray(explainer.terminologyNotes)&&explainer.terminologyNotes.length?`<h3>Terminology &amp; source qualifications</h3><ul>${explainer.terminologyNotes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`:''}</div></details>`;
}
function detailHTML(x) {
 if(view==='equipment')return equipmentDetailHTML(x);
 if (view === 'classes') return classDetailHTML(x);
 const spell = view === 'spells';
 const pending = spell && !hasDetails(x);
 const label = spell ? `${classText(x)} · ${levelText(x)}` : x.category || 'RULES REFERENCE';
 const fields = Object.entries(x.fields || {}).filter(([,v]) => v !== null && v !== undefined && v !== '');
 const footer = pending ? 'Indexed source reference · quick-reference details pending' : x.incomplete ? 'Partial extraction · source OCR checked · visual verification pending' : isVerified(x) ? 'Important source details visually checked' : 'Source OCR checked · visual verification pending';
 const listBlock = (heading, items) => Array.isArray(items) && items.length ? `<h3>${heading}</h3><ul>${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>` : '';
 return `<article class="detail-card" data-annotation-target="${esc(x.id)}" data-annotation-title="${esc(x._title)}">${detailHeaderHTML(x,{eyebrow:label,status:pending?'Details pending':x.incomplete?'Partial extraction':isVerified(x)?'Visually checked':'OCR checked',statusClass:isVerified(x)?'':'unverified',pending,attributes:spell?spellAttributesHTML(x):''})}<div class="detail-body">${!spell && fields.length ? `<div class="stats-grid">${fields.map(([k,v])=>`<div class="stat"><div class="stat-label">${esc(k)}</div><div class="stat-value">${esc(Array.isArray(v)?v.join(', '):v)}</div></div>`).join('')}</div>` : ''}${pending ? `<div class="empty-state"><h2>The spell is indexed.</h2><p>The spell’s name, class, and level are indexed. Casting attributes, effects, conditions, and exceptions have not yet been extracted into a quick-reference card.</p><p>The cited source heading locates the spell in your own book. Quick-reference extraction and visual verification are still pending.</p></div>` : ''}${x.summary ? `<h3>At a glance</h3><p>${esc(x.summary)}</p>` : ''}${listBlock(spell?'Effect & resolution':'In practice',spell?x.effect:x.bullets)}${listBlock('Conditions & requirements',x.conditions)}${listBlock('Exceptions & limitations',x.exceptions)}${x.notes ? `<div class="callout">${esc(Array.isArray(x.notes)?x.notes.join(' '):x.notes)}</div>` : ''}${!pending && !isVerified(x) ? '<div class="callout">This card is a concise study aid from source OCR. Check the cited printing when a detail determines a ruling; visual verification is still pending.</div>' : ''}</div>${inlineNotes(x.id)}<footer class="detail-footer"><span>${icon('book')}${esc(footer)}</span>${originalScansButton(x)}<button class="source-chip" data-copy-link="${esc(x.id)}">Copy reference link ↗</button></footer></article>`;
}
function xpThresholds(x) {
 const input = Array.isArray(x.xpRows) ? x.xpRows : Array.isArray(x.xp) ? x.xp : [];
 return input.map((v,i) => {
  if (v === null || v === undefined || v === '') return null;
  const row = typeof v === 'object' ? {...v} : {level:i+1,xp:v};
  const value = row.xp ?? row.minimum ?? row.threshold;
  if (value === null || value === undefined || value === '') return null;
  return {...row,level:Number(row.level ?? i+1),xp:Number(value),book:row.book||x.book,pages:row.pages||x.pages,track:row.track||x.xpTrack||'',status:row.status||x.status||'Source extraction pending'};
 }).filter(v=>v&&Number.isInteger(v.xp)&&v.xp>=0&&Number.isInteger(v.level)&&v.level>=1).sort((a,b)=>a.level-b.level);
}
function xpTrackLabel(x,track) {return typeof x.xpTrack==='string'&&x.xpTrack?x.xpTrack:track&&track!=='main'?track.charAt(0).toUpperCase()+track.slice(1):'Standard class XP';}
function continuationFor(x, track = null) {
 const c=x.xpContinuation;
 if(!c||c.anchorXp===null||c.anchorXp===undefined||c.anchorXp===''||c.increment===null||c.increment===undefined||c.increment==='')return null;
 const row={...c,afterLevel:Number(c.afterLevel),anchorLevel:Number(c.anchorLevel??c.afterLevel),anchorXp:Number(c.anchorXp),increment:Number(c.increment),book:c.book||x.book,pages:c.pages||x.pages,track:c.track||x.xpTrack||''};
 if(!Number.isInteger(row.afterLevel)||row.afterLevel<1||row.anchorLevel!==row.afterLevel||!Number.isInteger(row.anchorXp)||row.anchorXp<0||!Number.isInteger(row.increment)||row.increment<=0)return null;
 if(track!==null&&row.track!==track)return null;
 return row;
}
function thresholdForLevel(x, level) {
 if(Number.isInteger(Number(x.maxLevel))&&level>Number(x.maxLevel))return null;
 const exact=xpThresholds(x).find(row=>row.level===level);
 if(exact)return {...exact,derived:false};
 const c=continuationFor(x);
 if(!c||level<=c.afterLevel)return null;
 return {level,xp:c.anchorXp+(level-c.anchorLevel)*c.increment,book:c.book,pages:c.pages,track:c.track,derived:true,status:`Derived from the explicit continuation rule. ${c.status||'Source OCR checked; visual review pending.'}`,increment:c.increment,anchorLevel:c.anchorLevel};
}
function inlineSourceChip(reference,title, prefix='') {
 const pages=pagesFor(reference);
 return `<button class="source-chip" data-inline-source data-ref-book="${esc(reference.book)}" data-ref-pages="${esc(pages.join(','))}" data-ref-title="${esc(title)}" data-ref-status="${esc(reference.status||'Source extraction pending')}">${esc(prefix)}${esc(bookCode(reference.book))} ${pages.length?`${pages.length===1?'p.':'pp.'} ${pages.join(', ')}`:'page pending'}</button>`;
}
function classTarget(x) {
 const limit=classTargetLimit(x);
 return Math.max(classTargetMinimum(x),Math.min(limit,classTargets.get(x.id)||classTargetMinimum(x)));
}
function classTargetMinimum(x) {return Number.isInteger(Number(x.minLevel))&&Number(x.minLevel)>=2?Number(x.minLevel):2;}
function classTargetLimit(x) {
 if(Number.isInteger(Number(x.maxLevel))&&Number(x.maxLevel)>=2)return Number(x.maxLevel);
 const known=[...xpThresholds(x).map(row=>row.level),...(x.levelChanges||[]).map(row=>Number(row.level)).filter(Number.isFinite)];
 return Math.max(20,...known);
}
function advancementControlsHTML(x) {
 const target=classTarget(x);const limit=classTargetLimit(x);
 return `<section class="advancement-planner" aria-labelledby="advancementTitle"><div class="planner-heading"><span class="eyebrow">PLAN AN ADVANCEMENT</span><span class="status-chip unverified">Partial extraction</span></div><div class="planner-controls"><div><label for="advancementClass">Class &amp; rules variant</label><select id="advancementClass">${[...data.classes].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${esc(c.id)}"${c.id===x.id?' selected':''}>${esc(c.name)} · ${esc(bookCode(c.book))}</option>`).join('')}</select></div><div><label for="targetLevel">Target level</label><select id="targetLevel">${Array.from({length:limit-classTargetMinimum(x)+1},(_,i)=>i+classTargetMinimum(x)).map(level=>`<option value="${level}"${level===target?' selected':''}>Level ${level}</option>`).join('')}</select></div></div><div id="advancementAnnouncement" class="sr-only" role="status" aria-live="polite"></div><div id="advancementSummary">${advancementSummaryHTML(x,target)}</div><p class="planner-range">${x.maxLevel?`This source track has a stated level limit of ${esc(x.maxLevel)}. ${x.levelLimit?inlineSourceChip(x.levelLimit,`${x.name} · level limit`):''}`:'The selector’s upper bound is a display range, not a class-level cap.'} Class eligibility and special rank requirements still apply.</p></section>`;
}
function advancementSummaryHTML(x,target) {
 const previous=target-1;const from=thresholdForLevel(x,previous);const to=thresholdForLevel(x,target);
 const sameTrack=from&&to&&from.track===to.track;
 const entries=(Array.isArray(x.levelChanges)?x.levelChanges:[]).filter(e=>Number(e.level)===target);
 const changes=entries.flatMap(e=>Array.isArray(e.changes)?e.changes:[]);
 const incomplete=!entries.length||entries.some(e=>e.incomplete!==false);
 return `<div class="advancement-transition"><h3 id="advancementTitle">Level ${previous} <span aria-hidden="true">→</span><span class="sr-only">to</span> ${target}</h3>${noteButton(x,`${x.id}:level:${target}`,`${x.name} · Level ${previous} → ${target}`)}</div><div class="advancement-xp"><div><span>Target threshold${to?.derived?' · derived':''}</span><strong>${to?`${to.xp.toLocaleString()} XP`:'Not yet extracted'}</strong>${to?inlineSourceChip(to,`${x.name} · Level ${target} XP`,to.derived?'Rule · ':''):''}</div><div><span>From level ${previous} threshold</span><strong>${sameTrack?`${(to.xp-from.xp).toLocaleString()} XP`:'Comparison unavailable'}</strong><small>${sameTrack?'Difference between consecutive level thresholds':from&&to?'These levels use different XP tracks.':'One or both level thresholds are missing.'}</small></div></div>${to?.track?`<p class="track-label">XP track: ${esc(xpTrackLabel(x,to.track))}</p>`:''}${to?.derived?`<p class="derived-explanation">Derived from the cited rule: +${to.increment.toLocaleString()} XP per level after level ${to.anchorLevel}, using its explicit XP anchor.</p>`:''}${fighterCombatHTML(x,target)}<h4>Changes at this level</h4>${changes.length?entries.map(entry=>`<div class="level-change-group">${entry.option?`<div class="level-change-option">Optional rule · ${esc(entry.option)}</div>`:''}<ul>${(entry.changes||[]).map(change=>`<li>${esc(change)}</li>`).join('')}</ul><div class="level-change-sources">${inlineSourceChip(entry,`${x.name} · Level ${target} changes`)}${(Array.isArray(entry.additionalSources)?entry.additionalSources:[]).map(source=>inlineSourceChip({...source,status:source.status||entry.status},`${x.name} · Level ${target} related source`)).join('')}</div></div>`).join(''):'<p class="pending-mechanics">Level-specific changes for this transition have not yet been extracted. Consult the class and relevant ability tables in the cited source.</p>'}${incomplete?'<div class="advancement-gap"><strong>Incomplete level-up guide.</strong> Attack, saving throw, spell-slot, and skill-table changes have not been exhaustively extracted. Other class mechanics may still be missing; use the source before finalizing the character sheet.</div>':''}`;
}
function xpTableHTML(x) {
 const rows=xpThresholds(x);
 if(!rows.length)return '<div class="callout">XP thresholds for this guide have not yet been extracted. Target-level XP remains unavailable until a source row or an explicit anchored continuation rule is available.</div>';
 let html='';
 rows.forEach((row,i)=>{
  const previous=rows[i-1];
  if(previous&&previous.track===row.track&&row.level>previous.level+1)html+=`<tr class="xp-gap"><td colspan="5">Levels ${previous.level+1}${row.level>previous.level+2?`–${row.level-1}`:''}: XP rows not yet extracted</td></tr>`;
  const next=thresholdForLevel(x,row.level+1);const comparable=next&&next.track===row.track;
  html+=`<tr data-xp-level="${row.level}"><td>${row.level}${row.label?` · ${esc(row.label)}`:''}${row.track&&row.track!=='main'?`<small class="row-track">${esc(xpTrackLabel(x,row.track))}</small>`:''}</td><td>${row.xp.toLocaleString()}</td><td>${comparable?`${(next.xp-row.xp).toLocaleString()}${next.derived?' (derived)':''}`:next?'Different XP track':'Not yet extracted'}</td><td>${inlineSourceChip(row,`${x.name} · Level ${row.level} XP`)}</td><td><button class="table-note" data-annotate="${esc(x.id)}:level:${row.level}" data-note-title="${esc(x.name)} · Level ${row.level}" data-note-view="classes" aria-label="Annotate ${esc(x.name)} level ${row.level}">${icon('pen')}</button></td></tr>`;
 });
 return `<h3>Known experience thresholds</h3><p class="small muted">Source-listed rows only. Missing levels stay unavailable. XP is cumulative within the labeled track; eligibility and training also apply.</p><div class="table-scroll"><table><thead><tr><th scope="col">Level</th><th scope="col">Minimum XP</th><th scope="col">Next-level increase</th><th scope="col">Source</th><th scope="col"><span class="sr-only">Annotate level</span></th></tr></thead><tbody>${html}</tbody></table></div>${x.xpNote||typeof x.progression==='string'?`<div class="callout">${esc(x.xpNote||(typeof x.progression==='string'?x.progression:''))}</div>`:''}${x.xpContinuation?`<p class="small muted" style="margin-top:12px">${continuationFor(x)?'Higher thresholds may be derived only from the cited continuation rule and its explicit XP anchor.':'The continuation rule is recorded, but its XP anchor is missing or unverified; higher thresholds are not calculated.'} ${inlineSourceChip(x.xpContinuation,`${x.name} · XP continuation rule`)}</p>`:''}`;
}
function xpCalculatorHTML(x) {
 const rows=xpThresholds(x);if(!rows.length)return '';
 const tracks=[...new Set(rows.map(row=>row.track))];const activeTrack=thresholdForLevel(x,classTarget(x))?.track||tracks[0];
 return `<div class="calculator"><label for="xpInput">Your cumulative XP within this track</label>${tracks.length>1?`<label for="xpTrack">XP track</label><select id="xpTrack">${tracks.map(track=>`<option value="${esc(track)}"${track===activeTrack?' selected':''}>${esc(xpTrackLabel(x,track))}</option>`).join('')}</select>`:tracks[0]&&tracks[0]!=='main'?`<p class="small track-label">${esc(xpTrackLabel(x,tracks[0]))}</p>`:''}<div class="xp-input-row"><input id="xpInput" type="number" min="0" max="1000000000" step="1" value="0" inputmode="numeric" aria-describedby="xpOutput" aria-label="Cumulative experience points"><button id="calculateXP" class="button primary">Check progress</button></div><div id="xpOutput" class="xp-output" aria-live="polite"></div><div class="xp-meter" aria-hidden="true"><span id="xpMeter"></span></div></div>`;
}
function classDetailHTML(x) {
 return `<article class="detail-card" data-annotation-target="${esc(x.id)}" data-annotation-title="${esc(x.name)}">${detailHeaderHTML(x,{eyebrow:x.variant||`${bookCode(x.book)} CLASS GUIDE`,extra:`${x.hitDie?`<span class="class-header-stat">${icon('die')}Hit die ${esc(x.hitDie)}</span>`:''}${x.progression&&typeof x.progression==='object'&&x.progression.label?`<span class="progression-label">${esc(x.progression.label)}</span>`:''}`})}<div class="detail-body">${x.description?`<p>${esc(x.description)}</p>`:''}${x.progression&&typeof x.progression==='object'&&x.progression.description?`<div class="progression-context"><strong>${esc(x.progression.label||'Progression track')}</strong><p>${esc(x.progression.description)}</p><div>${(x.progression.references||[]).map(reference=>inlineSourceChip(reference,`${x.name} · progression`)).join('')}</div></div>`:''}${advancementControlsHTML(x)}${xpCalculatorHTML(x)}${xpTableHTML(x)}${Array.isArray(x.guidance)&&x.guidance.length?`<h3>General class checklist</h3><p class="small muted">These are general class reminders, separate from the selected level’s changes.</p><ul>${x.guidance.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<h3>General class checklist</h3><p>Class-wide advancement reminders are still being extracted. Check the class section, relevant ability tables, and DMG training guidance in your own books.</p>'}${x.errata?`<h3>Errata — separate from the printing</h3><div class="callout">${esc(Array.isArray(x.errata)?x.errata.join(' '):x.errata)}</div>`:''}<div class="callout">XP indicates a threshold, not automatic advancement. Class prerequisites, campaign eligibility, rank limits, and the Dungeon Master’s training procedure can affect advancement.</div></div>${inlineNotes(x.id)}<footer class="detail-footer"><span>${icon('book')}Partial level-up extraction · visual table verification pending</span>${originalScansButton(x)}<button class="source-chip" data-copy-link="${esc(x.id)}">Copy reference link ↗</button></footer></article>`;
}
function calculateXP() {
 const input=$('#xpInput');if(!input)return;
 const value=Number(input.value);const output=$('#xpOutput');const meter=$('#xpMeter');meter.style.width='0%';
 if(input.value===''||!Number.isInteger(value)||value<0||value>1000000000){output.textContent='Enter a whole number from 0 to 1,000,000,000.';return;}
 const x=data.classes.find(item=>item.id===selectedId);if(!x)return;
 const allRows=xpThresholds(x);const track=$('#xpTrack')?.value??allRows[0]?.track??'';const rows=allRows.filter(row=>row.track===track);const continuation=continuationFor(x,track);
 $$('[data-xp-level]').forEach(el=>el.classList.remove('current'));
 const cap=Number.isInteger(Number(x.maxLevel))?thresholdForLevel(x,Number(x.maxLevel)):null;
 if(cap&&cap.track===track&&value>=cap.xp){output.innerHTML=`${cap.derived?'Derived':'Highest listed'} threshold reached: <strong>level ${cap.level}</strong>. This source track has a stated level limit of ${cap.level}; additional XP does not establish a higher level here. ${inlineSourceChip(x.levelLimit||cap,`${x.name} · source level limit`)}`;$$('[data-xp-level]').filter(el=>Number(el.dataset.xpLevel)===cap.level).forEach(el=>el.classList.add('current'));meter.style.width='100%';bindInlineSources(output);return;}
 if(continuation&&value>=continuation.anchorXp){
  const level=continuation.anchorLevel+Math.floor((value-continuation.anchorXp)/continuation.increment);const next=continuation.anchorXp+(level+1-continuation.anchorLevel)*continuation.increment;
  output.innerHTML=`<strong>Derived threshold reached: level ${level}.</strong> ${(next-value).toLocaleString()} XP to the next derived threshold. Uses +${continuation.increment.toLocaleString()} XP per level after level ${continuation.afterLevel}; class eligibility and rank limits still apply. ${inlineSourceChip(continuation,`${x.name} · XP continuation`)}`;
  meter.style.width=`${Math.min(100,(value-(next-continuation.increment))/continuation.increment*100)}%`;
  $$('[data-xp-level]').filter(el=>Number(el.dataset.xpLevel)===level).forEach(el=>el.classList.add('current'));
  bindInlineSources(output);return;
 }
 const current=[...rows].filter(row=>row.xp<=value).sort((a,b)=>b.xp-a.xp)[0];const next=[...rows].filter(row=>row.xp>value).sort((a,b)=>a.xp-b.xp)[0];
 if(!current){output.textContent=`Below the earliest listed threshold${next?` (level ${next.level})`:''}. Earlier level requirements may be missing from this partial table.`;return;}
 $$('[data-xp-level]').filter(el=>Number(el.dataset.xpLevel)===current.level).forEach(el=>el.classList.add('current'));
 const gap=next&&next.level>current.level+1;
 output.innerHTML=`Highest listed threshold reached: <strong>level ${current.level}</strong>. ${next?`${(next.xp-value).toLocaleString()} XP to ${gap?'the next listed threshold, ':''}level ${next.level}.`: 'No higher threshold can be determined from the current extraction.'}${gap?' Intermediate XP rows are missing, so your exact current level cannot be determined from this table.':''}${!next?' Higher levels may have missing XP rows; this is not a class-level cap.':''} ${inlineSourceChip(current,`${x.name} · Level ${current.level} XP`)}`;
 if(next&&!gap)meter.style.width=`${Math.max(0,Math.min(100,(value-current.xp)/(next.xp-current.xp)*100))}%`;
 bindInlineSources(output);
}
function bindInlineSources(root=document) {
 const defaultView=view;
 $$('[data-inline-source]',root).forEach(el=>{
  const context=el.closest('[data-source-context]');
  const contextView=context?.dataset.sourceView||defaultView;
  const contextItemId=context?.dataset.sourceContext||el.closest('.detail-card[data-annotation-target]')?.dataset.annotationTarget||selectedId;
  el.onclick=()=>showSource(contextView,contextItemId,{name:el.dataset.refTitle,book:el.dataset.refBook,pages:el.dataset.refPages.split(',').filter(Boolean).map(Number),status:el.dataset.refStatus});
 });
}
function bindAdvancement() {
 const item=data.classes.find(x=>x.id===selectedId);if(!item||view!=='classes')return;
 $('#targetLevel')?.addEventListener('change',e=>{classTargets.set(item.id,Number(e.target.value));captureCombatDisclosureState();$('#advancementSummary').innerHTML=advancementSummaryHTML(item,Number(e.target.value));const xpTrack=$('#xpTrack');const targetTrack=thresholdForLevel(item,Number(e.target.value))?.track;if(xpTrack&&targetTrack){xpTrack.value=targetTrack;calculateXP();}$('#advancementAnnouncement').textContent=`${item.name}, level ${Number(e.target.value)-1} to ${Number(e.target.value)}. Partial guide; review extracted changes and remaining gaps.`;bindInlineSources($('#advancementSummary'));bindCombatDisclosures($('#advancementSummary'));$$('[data-annotate]',$('#advancementSummary')).forEach(el=>{el.onclick=()=>openNote({target:el.dataset.annotate,title:el.dataset.noteTitle,view:'classes'});});});
 $('#advancementClass')?.addEventListener('change',e=>{filter={q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();goTo('classes',e.target.value);setTimeout(()=>$('#advancementClass')?.focus({preventScroll:true}),0);});
 $('#xpTrack')?.addEventListener('change',calculateXP);
 bindInlineSources();bindCombatDisclosures();
}

function fighterMatrix() {return (data.matrices||[]).find(matrix=>matrix.id==='dmg-original-fighter-attack-matrix')||null;}
function combatTargetLabel(value) {return value===null||value===undefined?'Not transcribed':String(value);}
function fighterCombatHTML(item,target) {
 if(item.id!=='fighter')return '';
 const matrix=fighterMatrix();
 if(!matrix)return '<section class="fighter-combat"><h4>Standard · original AC0 matrix</h4><p>The original matrix data has not loaded. No attack target is inferred.</p></section>';
 const previous=target-1,standard=FirstEditionCombat.standardTransition(matrix,previous,target,0),alt=FirstEditionCombat.fighterAltTransition(matrix,previous,target),coverage=FirstEditionCombat.coverage(matrix);
 const naturalOption=(matrix.ruleNotes||[]).find(note=>note.id==='dmg-repeated-twenties');
 return `<section class="fighter-combat" data-source-context="dmg-original-fighter-attack-matrix" data-source-view="matrices" aria-label="Fighter attack target comparison"><div class="standard-attack"><h4>Standard · original AC0 matrix</h4><strong>${esc(combatTargetLabel(standard.from))} <span aria-hidden="true">→</span><span class="sr-only">to</span> ${esc(combatTargetLabel(standard.to))}</strong><p>Unmodified d20 target against AC 0, level ${previous} → ${target}. ${standard.fromBand===standard.toBand?'Both levels share the same printed matrix band; the standard target is unchanged.':'Uses the source-listed cell for each level band.'} This is an AC0 comparison, not a universal attack bonus.</p>${inlineSourceChip(matrix,`Fighter level ${previous} to ${target} · standard AC0 matrix`)}</div><details class="combat-disclosure fighter-alt" data-fighter-alt${fighterAltOpen?' open':''}><summary>Alt · fighter house rule</summary><div class="disclosure-body"><h4>Alt · AC0 target</h4><strong class="alt-attack-target">${esc(combatTargetLabel(alt.from))} <span aria-hidden="true">→</span><span class="sr-only">to</span> ${esc(combatTargetLabel(alt.to))}</strong><p>Informational house-rule comparison: +1 to hit for each fighter level above 1st. Anchor: fighter level 1 has an AC0 target of ${esc(combatTargetLabel(alt.anchorTarget))} in the original matrix.</p><p class="combat-formula">Alt AC0 target = ${esc(combatTargetLabel(alt.anchorTarget))} − (fighter level − 1)</p><p>This comparison does not change the standard reference, fill unread matrix cells, or apply to other classes. It does not decide natural-20 or other attack-resolution rules.</p>${inlineSourceChip(matrix,'Fighter house-rule comparison · source level1 AC0 anchor','Anchor · ')}</div></details><details class="combat-disclosure matrix-disclosure" data-fighter-matrix${fighterMatrixOpen?' open':''}><summary>Original fighter matrix · ${coverage.known}/${coverage.total} cells transcribed</summary><div class="disclosure-body"><p><strong>Partial source table:</strong> ${coverage.known} known cells; ${coverage.missing} not transcribed. Every cell awaits visual verification. “Not transcribed” is an extraction gap, never zero or an automatic miss.</p>${inlineSourceChip(matrix,'Original fighter attack matrix')}${matrixTableHTML(matrix)}<h4>Why simple subtraction can disagree</h4><p>The original matrix repeats 20 in some AC columns. These illustrations use only source-listed cells; the linear calculation is a comparison, not a replacement rule.</p><div class="table-scroll" tabindex="0" role="region" aria-label="Repeated-20 source examples, horizontally scrollable"><table class="matrix-examples"><caption class="sr-only">Source-listed repeated20 examples</caption><thead><tr><th scope="col">Fighter level</th><th scope="col">Defender AC</th><th scope="col">Printed target</th><th scope="col">AC0 − AC</th></tr></thead><tbody>${(matrix.comparisonExamples||[]).map(example=>`<tr><th scope="row">${example.levelMin}${example.levelMax!==example.levelMin?`–${example.levelMax}`:''}</th><td>${example.armorClass}</td><td>${example.matrixTarget}</td><td>${example.simpleSubtractionTarget}</td></tr>`).join('')}</tbody></table></div>${naturalOption?`<section class="natural-twenty-option"><h4>Separate optional amendment · natural 20</h4><p>${esc(naturalOption.text)}</p>${inlineSourceChip(naturalOption,'Optional natural20 amendment')}</section>`:''}<p class="small muted">${esc((matrix.notes||[]).find(note=>note.includes('paladins'))||'See the source for other attacker groups and adjustments.')}</p></div></details></section>`;
}
function matrixTableHTML(matrix) {
 return `<div class="table-scroll matrix-scroll" tabindex="0" role="region" aria-label="Partial original fighter matrix, horizontally scrollable"><table class="matrix-table"><caption>Original matrix · unmodified d20 targets · ${esc(bookCode(matrix.book))} p. ${esc(pagesFor(matrix).join(', '))}</caption><thead><tr><th scope="col">Fighter level</th>${matrix.armorClasses.map(ac=>`<th scope="col">AC ${ac}</th>`).join('')}</tr></thead><tbody>${matrix.rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th>${matrix.armorClasses.map((ac,i)=>`<td>${row.targets[i]===null||row.targets[i]===undefined?'<span class="matrix-gap">Not transcribed</span>':esc(row.targets[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function captureCombatDisclosureState() {const alt=$('[data-fighter-alt]'),matrix=$('[data-fighter-matrix]');if(alt)fighterAltOpen=alt.open;if(matrix)fighterMatrixOpen=matrix.open;}
function bindCombatDisclosures(root=document) {
 $$('[data-fighter-alt]',root).forEach(element=>element.addEventListener('toggle',()=>{fighterAltOpen=element.open;}));
 $$('[data-fighter-matrix]',root).forEach(element=>element.addEventListener('toggle',()=>{fighterMatrixOpen=element.open;}));
}

function renderSources() {
 const checked=scanCoverage();
 const countsCopy=checked.regions===null?'':`${checked.regions} unique checked regions${checked.imageFiles===null?'':` in ${checked.imageFiles} source images`}. ${checked.scopedRegions===null?'':`The item catalogs contain ${checked.scopedRegions} item-specific region entries${checked.scopedRegions>checked.regions?', including reused regions':''}. `}`;
 const verificationCopy=checked.items.length?`${checked.selectedValuesItems} entries have selected values checked; ${checked.sourceExcerptItems} entries have source excerpts checked. ${countsCopy}These references remain partial: verification applies only to the fields and limits stated on each card. Other values, secondary references and tables retain their source-specific grades and may still be OCR-only or unverified.`:'Important tables still require visual verification against the scan.';
 const sourceSharingCopy=checked.items.length?'The full source PDFs and wholesale book text are never published here. Only the approved limited excerpts are included for the checked references; their provenance is recorded in the excerpt catalogs.':'The source PDFs and wholesale book text are never published here.';
 const xpCount = data.classes.filter(x=>xpThresholds(x).length>0).length;
 const detailed = data.spells.filter(hasDetails).length;
 const sources = data.sources.length ? data.sources : [{id:'PHB',title:'Players Handbook',edition:'Sixth printing · January 1980',mapping:'Printed page N = PDF page N + 1',gaps:[],coverage:'Extraction in progress.'},{id:'UA',title:'Unearthed Arcana',edition:'Original 1985 edition',mapping:'Printed page N = PDF page N + 1',gaps:[],coverage:'Extraction in progress.'},{id:'DMG',title:'Dungeon Masters Guide',edition:'Revised December 1979',mapping:FirstEditionBooks.mapping('DMG'),gaps:[175],unverified:[239,240],coverage:'Missing and unverified pages are excluded.'}];
 $('#main').innerHTML = pageHeading('KNOW WHAT YOU’RE READING','A reference you can trace.','The original printings are the authority. This companion provides selected, reformatted study aids and exact page locations.') + `<div class="coverage-grid"><div class="coverage-stat"><strong>${data.spells.length.toLocaleString()}</strong><span>Class-specific spell entries indexed · ${detailed} detailed cards</span></div><div class="coverage-stat"><strong>${data.rules.length.toLocaleString()}</strong><span>Curated rules references</span></div><div class="coverage-stat"><strong>${data.classes.length.toLocaleString()}</strong><span>Class &amp; advancement guides · ${xpCount} with partial XP tables</span></div><div class="coverage-stat"><strong>${data.equipment.length.toLocaleString()}</strong><span>Equipment entries · ${data.equipment.filter(hasKnownPrice).length} transcribed prices</span></div></div><section class="source-cards" aria-label="Source printings">${sources.map((s,i) => { const code = bookCode(s.id || s.book || ['PHB','UA','DMG'][i]); const count = data.rules.filter(x=>bookCode(x.book)===code).length; const spells = data.spells.filter(x=>bookCode(x.book)===code); return `<article class="source-card" data-annotation-target="source:${esc(code)}" data-annotation-title="${esc(s.title)}"><div class="source-bookmark" aria-hidden="true"><span>AD&amp;D</span><strong>${esc(code)}</strong></div><span class="eyebrow">SOURCE ${String(i+1).padStart(2,'0')}</span><h2>${esc(s.title)}</h2><p>${esc(s.edition || '')}</p><h3>Current coverage</h3><p>${esc(typeof s.coverage === 'string' ? s.coverage : JSON.stringify(s.coverage || 'Source extraction in progress.'))}</p><p>${count} rule references · ${spells.length} spell entries · ${spells.filter(hasDetails).length} detailed cards</p>${Array.isArray(s.gaps)&&s.gaps.length ? `<div class="gap-badge">Missing printed pages: ${s.gaps.map(esc).join(', ')}. These pages are not reconstructed.</div>` : ''}${Array.isArray(s.unverified)&&s.unverified.length ? `<div class="gap-badge">Unverified printed pages: ${s.unverified.map(esc).join(', ')}. No PDF page is assigned.</div>` : ''}<p class="source-map">${esc(s.mapping || FirstEditionBooks.mapping(code))}</p><div>${noteButton({id:`source:${code}`,name:s.title})}</div></article>`; }).join('')}</section><section class="coverage-copy" data-annotation-target="coverage" data-annotation-title="Coverage & editorial standards"><h2>Clear boundaries. Better rulings.</h2><p>This is a growing, curated reference, not a complete reproduction of the books. ${xpCount<data.classes.length?`Only ${xpCount} of ${data.classes.length} class/variant guides currently include partial XP tables; other progressions are pending.`:`All ${data.classes.length} class/variant guides include source XP rows, but individual tables may still have gaps and level-up mechanics remain partially extracted.`} An indexed entry records a class-specific spell heading and level; the same spell name may appear in several classes. A detailed card separately extracts selected casting attributes and a concise paraphrase. Missing fields are not inferred.</p><p>Most content has been checked against source OCR. ${esc(verificationCopy)} Page chips identify the printed page and its corresponding page in the supplied PDF. ${esc(sourceSharingCopy)}</p><p>Players Handbook and original Unearthed Arcana rules are identified separately. Later editions, modified scans, house rules, and errata are not silently substituted. Any errata supplied in a guide is explicitly labeled. Equipment prices are source-listed coin amounts; gp-weight is separately labeled encumbrance. The original fighter matrix remains a partial transcription, and its Alt comparison is an explicitly optional house-rule illustration.</p>${noteButton({id:'coverage',name:'Coverage & editorial standards'})}</section>`;
}
function renderNotebook() {
 let shown = [...notes].sort((a,b) => String(b.updated).localeCompare(String(a.updated)));
 if (selectedId) { const found = shown.find(n=>n.id===selectedId); if (found) shown = [found,...shown.filter(n=>n.id!==selectedId)]; }
 const actions = `<div class="notebook-actions"><button class="button secondary" id="importNotebook">${icon('upload')}Import</button><button class="button secondary" id="exportNotebook">${icon('download')}Export backup</button><button class="button primary" data-annotate="notebook" data-note-title="Campaign note" data-note-view="notebook">${icon('pen')}New note</button></div>`;
 $('#main').innerHTML = pageHeading('YOUR RULINGS, YOUR REMINDERS','Notes in the margins.','A house rule worth remembering. A spell worth trying. Everything you annotate stays here, in this browser.',actions) + `<div class="coverage-banner">${icon('lock')}<span>${storageAvailable ? 'Your notebook is saved locally on this device. Export a backup before clearing browser data or changing devices.' : 'Browser storage could not be read. Export a backup of any notes you create before leaving.'}</span></div><div class="result-toolbar"><span><strong>${notes.length}</strong> personal annotation${notes.length===1?'':'s'}</span><span class="sort-label">Most recently edited</span></div>${shown.length ? `<section class="notebook-list" aria-label="Your annotations">${shown.map(n=>`<article class="notebook-card" id="note-${esc(n.id)}"><span class="note-source">${esc(n.view === 'notebook' ? 'CAMPAIGN NOTE' : ({spells:'SPELL',rules:'RULE',equipment:'EQUIPMENT',classes:'CLASS',sources:'SOURCE'})[n.view]+' REFERENCE')}</span><h2>${n.view !== 'notebook' ? `<a href="#${esc(n.view)}/${encodeURIComponent(n.target.split(':level:')[0])}">${esc(n.title)}</a>` : esc(n.title)}</h2>${n.quote ? `<blockquote>${esc(n.quote)}</blockquote>` : ''}<div class="note-content">${esc(n.text)}</div><div class="note-card-footer"><time datetime="${esc(n.updated)}">${esc(formatDate(n.updated))}</time><button data-edit-note="${esc(n.id)}">Edit</button><button class="delete-note" data-delete-note="${esc(n.id)}">Delete</button></div></article>`).join('')}</section>` : `<div class="empty-state"><h2>Your next great ruling starts here.</h2><p>Use “Annotate” on any reference, or select a passage to attach a note.<br>Keep a general campaign note with the button above.</p><button class="button secondary" data-annotate="notebook" data-note-title="Campaign note" data-note-view="notebook">${icon('pen')}Write your first note</button></div>`}`;
}
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Saved locally' : date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function bindPage() {
 bindSpellToggles();
 $('#loadMore')?.addEventListener('click',()=>{const top=$('.result-list').scrollTop;listLimit+=50;renderReference();bindPage();$('.result-list').scrollTop=top;($('#loadMore')||$$('[data-select]').at(-1))?.focus({preventScroll:true});});
 $('#referenceSearch')?.addEventListener('input',e=>{const inputElement=e.target;const searchView=view;filter.q=inputElement.value;clearTimeout(referenceSearchTimer);referenceSearchTimer=setTimeout(()=>{if(!inputElement.isConnected||view!==searchView)return;const start=inputElement.selectionStart;listLimit=50;renderReference();bindPage();const input=$('#referenceSearch');input.focus();if(start!==null)input.setSelectionRange(start,start);},100);});
 $$('[data-filter]').forEach(el=>el.addEventListener('change',()=>{filter[el.dataset.filter]=el.value;if(el.dataset.filter==='class')selectedSpellLevels=reconcileSpellLevelSelection(selectedSpellLevels,availableSpellLevels(data.spells,filter.class)); listLimit=50; selectedId=''; const focusedId=el.id; renderReference(); bindPage(); $('#'+focusedId)?.focus({preventScroll:true});}));
 $('#clearFilters')?.addEventListener('click',()=>{filter={q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();selectedId='';renderReference();bindPage();$('#referenceSearch').focus();});
 $$('[data-select]').forEach(el=>el.addEventListener('click',()=>{
  selectedId=el.dataset.select; const item=index.find(x=>x._view===view&&x.id===selectedId); if(!item)return;
  $$('[data-select]').forEach(b=>{b.classList.toggle('selected',b.dataset.select===selectedId);b.setAttribute('aria-pressed',String(b.dataset.select===selectedId));});
  $('#referenceDetail').innerHTML=detailHTML(item); bindDetail();
  history.replaceState(null,'',`#${view}/${encodeURIComponent(selectedId)}`);
  renderedRouteHash=location.hash;
  if(window.innerWidth<=760)$('#referenceDetail').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }));
 bindDetail();
 $('#exportNotebook')?.addEventListener('click',exportNotebook);
 $('#importNotebook')?.addEventListener('click',()=>$('#importFile').click());
 $$('[data-edit-note]').forEach(el=>el.addEventListener('click',()=>openNote({existing:notes.find(n=>n.id===el.dataset.editNote)})));
 $$('[data-delete-note]').forEach(el=>el.addEventListener('click',()=>{
  const n=notes.find(n=>n.id===el.dataset.deleteNote); if(!n)return;
  if(confirm(`Delete the annotation for “${n.title}”? This removes it from this browser.`) && persistNotes(notes.filter(existing=>existing.id!==n.id))) {renderNotebook();bindPage();$('#main').focus({preventScroll:true});toast('Annotation deleted.');}
 }));
}
function bindDetail() {
 bindAttributeDisclosures();
 bindAttributeViews();
 $$('[data-source-id]').forEach(el=>{el.onclick=()=>showSource(el.dataset.sourceView,el.dataset.sourceId,null,el.dataset.sourceBook);});
 $$('[data-view-scans]').forEach(el=>{el.onclick=()=>{const item=data[el.dataset.scanView]?.find(entry=>entry.id===el.dataset.viewScans);if(item)openScanViewer(item,FirstEditionCitations.collect(item));};});
 $$('[data-annotate]').forEach(el=>{el.onclick=()=>openNote({target:el.dataset.annotate,title:el.dataset.noteTitle,view:el.dataset.noteView||view});});
 $$('[data-copy-link]').forEach(el=>{el.onclick=async()=>{
  const url=new URL(location.href);url.hash=`${view}/${encodeURIComponent(el.dataset.copyLink)}`;
  try {await navigator.clipboard.writeText(url.href);toast('Reference link copied.');} catch {toast('Use your browser’s address bar to copy this reference link.');}
 };});
 bindInlineSources();
 bindAdvancement();
 $('#calculateXP')?.addEventListener('click',calculateXP);
 $('#xpInput')?.addEventListener('input',calculateXP);
 $('#xpInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')calculateXP();});
 calculateXP();
}
function bindAttributeViews(){
 $$('[data-attribute-view]').forEach(button=>{button.onclick=()=>{
  const mode=button.dataset.attributeView;if(mode===attributeMode)return;
  const item=index.find(entry=>entry._view===view&&entry.id===selectedId);if(!item)return;
  attributeMode=mode;
  const section=button.closest('[data-attribute-layout]');section.dataset.attributeLayout=mode;
  $$('[data-attribute-view]',section).forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.attributeView===mode)));
  $('.attribute-content',section).innerHTML=attributeLayoutHTML(item,{equipment:view==='equipment'});
  bindInlineSources(section);bindAttributeDisclosures(section);
 };});
}
function bindAttributeDisclosures(root=document){
 $$('[data-full-attributes],.additional-references,[data-attribute-citations]',root).forEach(disclosure=>{disclosure.onkeydown=event=>{if(event.key==='Escape'&&disclosure.open){event.preventDefault();event.stopPropagation();disclosure.open=false;$('summary',disclosure)?.focus({preventScroll:true});}};});
}

function showSource(sourceView,id,reference=null,sourceBook='') {
 const contextItem=id==='progression-explainer'&&data.progressionExplainer?{...data.progressionExplainer,id}:data[sourceView]?.find(x=>x.id===id);
 const item=contextItem||reference;if(!item)return;
 const references=FirstEditionCitations.collect(item);
 const clicked=reference?FirstEditionCitations.collect(reference)[0]:references.find(group=>bookCode(group.book)===bookCode(sourceBook));
 const initialReference=clicked?.pages?.length?{book:clicked.book,page:clicked.pages[0]}:undefined;
 openScanViewer(item,references,contextItem?.id||'',initialReference);
}
function openScanViewer(item,references,contextItemId=item.id||'',initialReference){
 if(globalThis.FirstEditionSourceViewer?.open){FirstEditionSourceViewer.open({item,references,contextItemId,initialReference});return;}
 const heading=references.length===1?bookName(references[0].book):'Original source references';
 $('#sourceBody').innerHTML=`<h2 id="sourceTitle">${esc(heading)}</h2><p class="muted">${esc(item.name||item.title||'Source reference')}</p><div class="source-reference-table"><table><thead><tr><th>Book</th><th>Printed page</th><th>Supplied PDF page</th></tr></thead><tbody>${references.length?references.flatMap(group=>group.pages.map(page=>`<tr><td>${esc(bookCode(group.book))}</td><td>${page}</td><td>${pdfPage(group.book,page)===null?'Unavailable':pdfPage(group.book,page)}</td></tr>`)).join(''):'<tr><td colspan="3">Page location is not yet extracted.</td></tr>'}</tbody></table></div>${references.map(group=>`<p class="small muted">${esc(bookCode(group.book))}: ${esc(FirstEditionBooks.mapping(group.book))} PDF page numbers count from 1.</p>`).join('')}<p class="small muted">The local scan viewer is unavailable. These references still locate the rule in your own copy. Source PDFs are not hosted by this reference. Visual verification remains pending unless explicitly stated for a cited page.</p>`;
 $('#sourceDialog').showModal();
}

function openNote(context) {
 const existing=context.existing;
 pendingNote=existing?{...existing}:{id:newId(),target:context.target||'notebook',title:context.title||'Campaign note',view:context.view||view,quote:context.quote||'',text:'',created:new Date().toISOString()};
 $('#noteTitle').textContent=existing?'Edit your annotation':'Leave a note';
 $('#noteTarget').textContent=pendingNote.title;
 $('#noteQuote').hidden=!pendingNote.quote;$('#noteQuote').textContent=pendingNote.quote;
 $('#noteText').value=pendingNote.text;$('#selectionNote').hidden=true;
 $('#noteDialog').showModal();setTimeout(()=>$('#noteText').focus(),0);
}
$('#noteForm').addEventListener('submit',e=>{
 e.preventDefault(); const text=$('#noteText').value.trim();if(!text||!pendingNote)return;
 const updated={...pendingNote,text,updated:new Date().toISOString()};const next=[...notes.filter(n=>n.id!==updated.id),updated];
 if(persistNotes(next)){ $('#noteDialog').close();render();const focusTarget=$$('[data-annotate]').find(el=>el.dataset.annotate===updated.target)||$$('[data-edit-note]').find(el=>el.dataset.editNote===updated.id)||$('#main');focusTarget.focus({preventScroll:true});toast('Annotation saved in this browser.'); }
});
function exportNotebook() {
 const blob=new Blob([JSON.stringify({format:'first-edition-notebook',version:1,exported:new Date().toISOString(),notes},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`first-edition-notebook-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Notebook backup exported.');
}
$('#importFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(file.size>10*1024*1024){toast('Please select a notebook backup smaller than 10 MB.');return;}
 try {
  const parsed=JSON.parse(await file.text());
  if(!parsed||parsed.format!=='first-edition-notebook'||parsed.version!==1)throw new Error('This is not a supported First Edition notebook backup.');
  const incoming=validateNotes(parsed.notes);const merged=new Map(notes.map(n=>[n.id,n]));
  incoming.forEach(n=>{if(!merged.has(n.id)||n.updated>merged.get(n.id).updated)merged.set(n.id,n);});
  if(merged.size>5000)throw new Error('The combined notebook exceeds 5,000 annotations.');
  if(persistNotes([...merged.values()])){render();($('#importNotebook')||$('#main')).focus({preventScroll:true});toast(`${incoming.length} annotation${incoming.length===1?'':'s'} imported; existing notes retained.`);}
 }catch(error){toast(error.message||'The notebook could not be imported.');}
});
function openPalette() {
 paletteOrigin=document.activeElement;paletteRestoreFocus=true;$('#commandInput').value='';commandIndex=0;renderCommands('');$('#palette').showModal();$('#commandInput').focus();
}
function renderCommands(query) {
 commandRows=index.filter(x=>matchesQuery(x,query)).sort((a,b)=>{
  const q=normalize(query);const score=x=>q?FirstEditionSearch.score(x,query):(x._view==='spells'&&hasDetails(x)?0:1);
  return score(a)-score(b)||Number(hasDetails(b))-Number(hasDetails(a))||a._title.localeCompare(b._title);
 }).slice(0,18);
 commandIndex=Math.max(0,Math.min(commandIndex,commandRows.length-1));
 $('#commandResults').innerHTML=commandRows.length?commandRows.map((x,i)=>`<div class="palette-result" role="option" id="command-${i}" aria-selected="${i===commandIndex}" data-command-index="${i}"><span>${icon(x._view==='spells'?'spark':x._view==='equipment'?'bag':x._view==='classes'?'shield':x._view==='notebook'?'pen':'book')}</span><div class="result-title">${esc(x._title)}<small>${esc(x._subtitle)}</small></div><span class="result-type">${esc(x._view==='spells'?'SPELL':x._view==='rules'?'RULE':x._view==='equipment'?'GEAR':x._view==='classes'?'CLASS':'NOTE')}</span></div>`).join(''):'<div class="palette-empty">No matches. Try a shorter spell name, class, or rules keyword.</div>';
 $('#commandInput').setAttribute('aria-activedescendant',commandRows.length?`command-${commandIndex}`:'');
 $$('[data-command-index]').forEach(el=>{el.addEventListener('click',()=>chooseCommand(Number(el.dataset.commandIndex)));el.addEventListener('mousemove',()=>setCommandIndex(Number(el.dataset.commandIndex),false));});
}
function setCommandIndex(i,scroll=true) {
 if(!commandRows.length)return;commandIndex=(i+commandRows.length)%commandRows.length;
 $$('[data-command-index]').forEach((el,n)=>el.setAttribute('aria-selected',String(n===commandIndex)));
 $('#commandInput').setAttribute('aria-activedescendant',`command-${commandIndex}`);
 if(scroll)$(`#command-${commandIndex}`)?.scrollIntoView({block:'nearest'});
}
function chooseCommand(i) {
 const x=commandRows[i];if(!x)return;paletteRestoreFocus=false;$('#palette').close();filter={q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();goTo(x._view,x.id,{reveal:true});
}
$('#paletteOpen').addEventListener('click',openPalette);
$('#commandInput').addEventListener('input',e=>{commandIndex=0;renderCommands(e.target.value);});
$('#commandInput').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();setCommandIndex(commandIndex+1);}else if(e.key==='ArrowUp'){e.preventDefault();setCommandIndex(commandIndex-1);}else if(e.key==='Enter'){e.preventDefault();chooseCommand(commandIndex);}});
$('#palette').addEventListener('close',()=>{if(!$('#palette').open&&paletteRestoreFocus&&paletteOrigin?.isConnected)paletteOrigin.focus({preventScroll:true});});
$$('[data-close]').forEach(el=>el.addEventListener('click',()=>$('#'+el.dataset.close).close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if($('#palette').open)$('#palette').close();else openPalette();}if(e.key==='Escape'){ $('#selectionNote').hidden=true; if($('#palette').open){e.preventDefault();$('#palette').close();} }});
document.addEventListener('selectionchange',()=>{
 const selection=window.getSelection();const text=selection?.toString().trim();
 if(!text||text.length>5000||selection.isCollapsed||!$('#main').contains(selection.anchorNode)||!$('#main').contains(selection.focusNode)){if(document.activeElement!==$('#selectionNote'))$('#selectionNote').hidden=true;return;}
 const anchor=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;
 const article=anchor.closest('[data-annotation-target]');
 if(!article){$('#selectionNote').hidden=true;return;}
 selectionContext={target:article.dataset.annotationTarget,title:article.dataset.annotationTitle,view,quote:text};
 const rect=selection.getRangeAt(0).getBoundingClientRect();const button=$('#selectionNote');button.hidden=false;button.style.left=`${Math.max(8,Math.min(window.innerWidth-170,rect.left))}px`;button.style.top=`${Math.max(8,Math.min(window.innerHeight-45,rect.bottom+7))}px`;
});
$('#selectionNote').addEventListener('pointerdown',e=>e.preventDefault());
$('#selectionNote').addEventListener('click',()=>{if(selectionContext)openNote(selectionContext);});
window.addEventListener('hashchange',route);
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){readNotes();buildIndex();render();}});
async function initialize() {
 readNotes();
 try {
  const response=await fetch('data.json');if(!response.ok)throw new Error(`Reference data returned HTTP ${response.status}.`);
  const incoming=await response.json();
  for(const key of ['spells','rules','equipment','classes','sources','matrices'])data[key]=Array.isArray(incoming[key])?incoming[key]:[];
  data.progressionExplainer=incoming.progressionExplainer&&typeof incoming.progressionExplainer==='object'?incoming.progressionExplainer:null;
  data.release=incoming.release&&typeof incoming.release==='object'&&!Array.isArray(incoming.release)?incoming.release:null;
  buildIndex();updateCounts();route({force:true});revealInitialReference();
 }catch(error){$('#main').innerHTML=pageHeading('A MOMENT AT THE LIBRARY','The reference could not open.','Your annotations are safe in this browser. The rule data could not be loaded.')+`<div class="empty-state load-error"><p>${esc(error.message)}</p><button class="button primary" id="retryLoad">Try again</button> <a href="#notebook" class="button secondary" id="offlineNotes">Open my notebook</a></div>`;$('#retryLoad').onclick=initialize;$('#offlineNotes').onclick=()=>{view='notebook';render();};}
}
initialize();
})();
