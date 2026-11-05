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
 book:'<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
 shield:'<path d="m12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 pen:'<path d="m15 4 5 5M4 16l-1 5 5-1L21 7a3.5 3.5 0 0 0-5-5L4 16Z"/><path d="m4 16 4 4"/>',
 layers:'<path d="m12 2 10 6-10 6L2 8l10-6Zm-10 11 10 6 10-6M2 18l10 6 10-6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
$$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const STORAGE_KEY = 'first-edition-notebook-v1';
const views = ['spells','rules','classes','notebook','sources'];
let data = {spells:[], rules:[], classes:[], sources:[]};
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
let index = [];
const classTargets = new Map();
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
 $('#noteCount').textContent = notes.length.toLocaleString();
}
function bookName(book) {
 const b = String(book || '').toUpperCase();
 return ({PHB:'Players Handbook',UA:'Unearthed Arcana',DMG:'Dungeon Masters Guide'})[b] || String(book || 'Source pending');
}
function bookCode(book) {
 const b = String(book || '').toUpperCase();
 if (b.includes('PLAYER') || b === 'PHB') return 'PHB';
 if (b.includes('UNEARTHED') || b === 'UA') return 'UA';
 if (b.includes('DUNGEON') || b === 'DMG') return 'DMG';
 return b;
}
function pagesFor(item) { return (Array.isArray(item.pages) ? item.pages : item.page != null ? [item.page] : []).filter(p => Number.isInteger(Number(p)) && Number(p) > 0).map(Number); }
function pdfPage(book, printed) {
 const code = bookCode(book);
 if (code === 'DMG') return [175,240].includes(printed) ? null : printed <= 174 ? printed + 1 : printed;
 if (code === 'PHB' || code === 'UA') return printed + 1;
 return null;
}
function hasDetails(item) { return Object.keys(item.fields || {}).length > 0 || (Array.isArray(item.effect) && item.effect.length > 0); }
function statusLabel(item) {
 if (view === 'spells' && !hasDetails(item)) return 'Details pending';
 return item.status || 'Source extraction in progress';
}
function isVerified(item) { const s = String(item.status || '').toLowerCase(); return s.includes('visually verified') && !s.includes('not visually'); }
function classesOf(item) { return Array.isArray(item.classes) && item.classes.length ? item.classes : Array.isArray(item.class) ? item.class : item.class ? [item.class] : []; }
function classText(item) { return classesOf(item).join(' / ') || 'Class not yet extracted'; }
function levelText(item) { return item.level === undefined || item.level === null || item.level === '' ? 'Level not yet extracted' : `Level ${item.level}`; }
function sourceChip(item, indexOnly = false) {
 const pages = pagesFor(item);
 const text = `${indexOnly ? (String(item.status||'').toLowerCase().includes('heading') ? 'Spell heading · ' : 'Spell index · ') : ''}${bookCode(item.book) || 'Source'} ${pages.length ? `${pages.length === 1 ? 'p.' : 'pp.'} ${pages.join(', ')}` : 'page pending'}`;
 return `<button class="source-chip" data-source-id="${esc(item.id)}" data-source-view="${esc(item._view || view)}" aria-label="Source reference: ${esc(text)}">${esc(text)}</button>`;
}
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
 return `<div class="coverage-banner">${icon('info')}<span><strong>Curated first release · expanding coverage.</strong> OCR-checked references; visual table verification is pending.</span><a href="#sources">See coverage &amp; known gaps ↗</a></div>`;
}
function pageHeading(eyebrow, title, description, actions = '') {
 return `<div class="page-heading"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${actions || '<div class="heading-flourish" aria-hidden="true">✧</div>'}</div>`;
}
function buildIndex() {
 index = [
  ...data.spells.map(x => ({...x, _view:'spells', _title:x.name || x.title || '', _subtitle:`${classText(x)} · ${levelText(x)} · ${bookCode(x.book)}`})),
  ...data.rules.map(x => ({...x, _view:'rules', _title:x.title || '', _subtitle:`${x.category || 'Rule'} · ${bookCode(x.book)}`})),
  ...data.classes.map(x => ({...x, _view:'classes', _title:x.name || '', _subtitle:`Class & advancement · ${bookCode(x.book)}`})),
  ...notes.map(x => ({...x, _view:'notebook', _title:x.title, _subtitle:'Personal annotation'}))
 ].map(x => FirstEditionSearch.prepare({...x,_bookName:bookName(x.book)}));
}
function matchesQuery(item, q) {
 return Number.isFinite(FirstEditionSearch.score(item,q));
}
function route() {
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
}
function goTo(newView, id = '') {
 const hash = `#${newView}${id ? '/' + encodeURIComponent(id) : ''}`;
 if (location.hash === hash) { view = newView; selectedId = id; render(); }
 else location.hash = hash;
}
function render() {
 $$('[data-view]').forEach(a => { if (a.dataset.view === view) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
 $('#breadcrumbCurrent').textContent = ({spells:'SPELLBOOK',rules:'RULES REFERENCE',classes:'CLASSES & ADVANCEMENT',notebook:'MY NOTEBOOK',sources:'SOURCES & COVERAGE'})[view];
 document.title = `${({spells:'Spellbook',rules:'Rules reference',classes:'Classes & advancement',notebook:'My notebook',sources:'Sources & coverage'})[view]} — First Edition`;
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

function filtersHTML() {
 const spells = view === 'spells';
 const items = data[view] || [];
 return `<section class="search-panel" aria-label="Search and filter ${esc(view)}"><div class="reference-search">${icon('search')}<input type="search" id="referenceSearch" aria-label="Search ${esc(view)}" placeholder="${spells ? 'Search a spell, effect, or abbreviation (CLW, MM)…' : view === 'rules' ? 'Search rules, topics, or source references…' : 'Find a class or advancement rule…'}" value="${esc(filter.q)}" autocomplete="off"><span class="search-shortcut">START WITH A NAME OR KEYWORD</span></div>${spells?spellTogglesHTML():''}<div class="filters">${spells ? `<div class="filter-field class-precision-filter"><label for="classFilter">Class</label><select id="classFilter" data-filter="class" aria-label="Filter by spellcasting class">${options(items.flatMap(classesOf),filter.class,'All classes')}</select></div>` : view === 'rules' ? `<div class="filter-field"><label for="categoryFilter">Topic</label><select id="categoryFilter" data-filter="category" aria-label="Filter by topic">${options(items.map(x=>x.category),filter.category,'All topics')}</select></div>` : ''}<div class="filter-field"><label for="bookFilter">Source</label><select id="bookFilter" data-filter="book" aria-label="Filter by source book">${options(items.map(x => bookCode(x.book)),filter.book,'All source books')}</select></div>${spells ? `<div class="filter-field"><select id="detailsFilter" data-filter="details" aria-label="Filter by detail availability"><option value=""${!filter.details?' selected':''}>All indexed spells</option><option value="ready"${filter.details==='ready'?' selected':''}>Quick-reference cards</option><option value="pending"${filter.details==='pending'?' selected':''}>Details pending</option></select></div>` : ''}<button class="clear-filters" id="clearFilters">Reset filters</button></div></section>`;
}
function filteredItems() {
 let result = index.filter(x => x._view === view && matchesQuery(x, filter.q));
 if (filter.book) result = result.filter(x => bookCode(x.book) === filter.book);
 if (filter.class) result = result.filter(x => classesOf(x).includes(filter.class));
 if (view==='spells'&&selectedSpellLevels.size) result = result.filter(x=>selectedSpellLevels.has(String(x.level)));
 if (filter.category) result = result.filter(x => x.category === filter.category);
 if (filter.details) result = result.filter(x => filter.details === 'ready' ? hasDetails(x) : !hasDetails(x));
 return result.sort((a,b) => (filter.q ? FirstEditionSearch.score(a,filter.q)-FirstEditionSearch.score(b,filter.q) : 0) || (view === 'spells' && !filter.q && !filter.details ? Number(hasDetails(b))-Number(hasDetails(a)) : 0) || a._title.localeCompare(b._title));
}
function renderReference() {
 const headings = {
  spells:['THE ARCANE & THE DIVINE','The spellbook','Every casting starts with a clear answer. Find a spell, scan the essentials, and follow the source.'],
  rules:['THE ART OF ADVENTURING','Rules, within reach.','A growing reference to first edition: concise guidance, precise page locations, and space for your own rulings.'],
  classes:['FROM FIRST LEVEL ONWARD','The road to the next level.','Find your class, check its experience thresholds, and prepare your next advancement with the source at hand.']
 };
 const heading = headings[view];
 const list = filteredItems();
 let item = list.find(x => x.id === selectedId) || list[0];
 if (selectedId && !item) item = index.find(x => x._view === view && x.id === selectedId);
 selectedId = item?.id || '';
 const detailed = view === 'spells' ? list.filter(hasDetails).length : 0;
 $('#main').innerHTML = pageHeading(...heading) + banner() + filtersHTML() + `<div class="result-toolbar"><span><strong>${list.length.toLocaleString()}</strong> ${view === 'spells' ? 'indexed spell entries' : view === 'classes' ? 'class guides' : 'references'}${view === 'spells' ? ` <span class="highlight-count">· ${detailed} matching quick-reference cards</span>` : ''}</span><span class="sort-label">${view === 'spells' && !filter.q && !filter.details ? 'Quick-reference cards first' : 'Alphabetical reference'}</span></div><div class="reference-layout"><section class="result-list" aria-label="${esc(view)} results">${list.length ? list.slice(0,listLimit).map(x => resultHTML(x,x.id === selectedId)).join('') + (list.length > listLimit ? `<button class="button secondary" id="loadMore">Show ${Math.min(50,list.length-listLimit)} more · ${list.length-listLimit} remaining</button>` : '') : `<div class="no-results">No matching ${esc(view)}.<br>Try a shorter search or reset the filters.</div>`}</section><section id="referenceDetail" aria-label="Selected reference">${item ? detailHTML(item) : `<div class="empty-state"><h2>A little unexplored territory.</h2><p>${data[view].length ? 'No reference matches these filters. Broaden your search to find another path.' : 'Source extraction for this section is in progress. The coverage page shows what is available today.'}</p><a class="button secondary" href="#sources">View source coverage ${icon('arrow')}</a></div>`}</section></div>`;
 $('#filterStatus').textContent = `${list.length} ${view === 'spells' ? 'spell entries' : view === 'classes' ? 'class guides' : 'rule references'} match your search${view === 'spells' ? `; ${detailed} quick-reference cards` : ''}.`;
}
function resultHTML(x, selected) {
 const sub = view === 'spells' ? `${classText(x)} · ${levelText(x)}` : view === 'classes' ? `${x.hitDie ? `Hit die ${x.hitDie} · ` : ''}${bookCode(x.book)}` : x.category || 'Rules reference';
 const top = view === 'spells' ? hasDetails(x) ? 'QUICK REFERENCE' : 'SPELL INDEX' : view === 'classes' ? x.variant || 'CLASS GUIDE' : bookCode(x.book);
 return `<button class="result-item${selected?' selected':''}" data-select="${esc(x.id)}" aria-pressed="${selected}"><div class="result-topline">${esc(top)}</div><div class="result-name">${esc(x._title)}</div><div class="result-meta">${esc(sub)}</div>${view === 'rules' && x.summary ? `<p class="result-preview">${esc(x.summary)}</p>` : ''}</button>`;
}
function detailHTML(x) {
 if (view === 'classes') return classDetailHTML(x);
 const spell = view === 'spells';
 const pending = spell && !hasDetails(x);
 const label = spell ? `${classText(x)} · ${levelText(x)}` : x.category || 'RULES REFERENCE';
 const fields = Object.entries(x.fields || {}).filter(([,v]) => v !== null && v !== undefined && v !== '');
 const footer = pending ? 'Indexed source reference · quick-reference details pending' : x.incomplete ? 'Partial extraction · source OCR checked · visual verification pending' : isVerified(x) ? 'Important source details visually checked' : 'Source OCR checked · visual verification pending';
 const listBlock = (heading, items) => Array.isArray(items) && items.length ? `<h3>${heading}</h3><ul>${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>` : '';
 return `<article class="detail-card" data-annotation-target="${esc(x.id)}" data-annotation-title="${esc(x._title)}"><header class="detail-header"><div class="detail-topline"><span class="eyebrow">${esc(label)}</span>${noteButton(x)}</div><h2>${esc(x._title)}</h2><div class="detail-subtitle">${sourceChip(x,pending)}<span class="status-chip${isVerified(x)?'':' unverified'}">${esc(pending?'Details pending':x.incomplete?'Partial extraction':isVerified(x)?'Visually checked':'OCR checked')}</span></div></header><div class="detail-body">${fields.length ? `<div class="stats-grid">${fields.map(([k,v])=>`<div class="stat"><div class="stat-label">${esc(k)}</div><div class="stat-value">${esc(Array.isArray(v)?v.join(', '):v)}</div></div>`).join('')}</div>` : ''}${pending ? `<div class="empty-state"><h2>The spell is indexed.</h2><p>The spell’s name, class, and level are indexed. Casting attributes, effects, conditions, and exceptions have not yet been extracted into a quick-reference card.</p><p>The cited source heading locates the spell in your own book. Quick-reference extraction and visual verification are still pending.</p></div>` : ''}${x.summary ? `<h3>At a glance</h3><p>${esc(x.summary)}</p>` : ''}${listBlock(spell?'Effect & resolution':'In practice',spell?x.effect:x.bullets)}${listBlock('Conditions & requirements',x.conditions)}${listBlock('Exceptions & limitations',x.exceptions)}${x.notes ? `<div class="callout">${esc(Array.isArray(x.notes)?x.notes.join(' '):x.notes)}</div>` : ''}${!pending && !isVerified(x) ? '<div class="callout">This card is a concise study aid from source OCR. Check the cited printing when a detail determines a ruling; visual verification is still pending.</div>' : ''}</div>${inlineNotes(x.id)}<footer class="detail-footer"><span>${icon('book')}${esc(footer)}</span><button class="source-chip" data-copy-link="${esc(x.id)}">Copy reference link ↗</button></footer></article>`;
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
 return `<div class="advancement-transition"><h3 id="advancementTitle">Level ${previous} <span aria-hidden="true">→</span><span class="sr-only">to</span> ${target}</h3>${noteButton(x,`${x.id}:level:${target}`,`${x.name} · Level ${previous} → ${target}`)}</div><div class="advancement-xp"><div><span>Target threshold${to?.derived?' · derived':''}</span><strong>${to?`${to.xp.toLocaleString()} XP`:'Not yet extracted'}</strong>${to?inlineSourceChip(to,`${x.name} · Level ${target} XP`,to.derived?'Rule · ':''):''}</div><div><span>From level ${previous} threshold</span><strong>${sameTrack?`${(to.xp-from.xp).toLocaleString()} XP`:'Comparison unavailable'}</strong><small>${sameTrack?'Difference between consecutive level thresholds':from&&to?'These levels use different XP tracks.':'One or both level thresholds are missing.'}</small></div></div>${to?.track?`<p class="track-label">XP track: ${esc(xpTrackLabel(x,to.track))}</p>`:''}${to?.derived?`<p class="derived-explanation">Derived from the cited rule: +${to.increment.toLocaleString()} XP per level after level ${to.anchorLevel}, using its explicit XP anchor.</p>`:''}<h4>Changes at this level</h4>${changes.length?entries.map(entry=>`<div class="level-change-group">${entry.option?`<div class="level-change-option">Optional rule · ${esc(entry.option)}</div>`:''}<ul>${(entry.changes||[]).map(change=>`<li>${esc(change)}</li>`).join('')}</ul>${inlineSourceChip(entry,`${x.name} · Level ${target} changes`)}</div>`).join(''):'<p class="pending-mechanics">Level-specific changes for this transition have not yet been extracted. Consult the class and relevant ability tables in the cited source.</p>'}${incomplete?'<div class="advancement-gap"><strong>Incomplete level-up guide.</strong> Attack, saving throw, spell-slot, and skill-table changes have not been exhaustively extracted. Other class mechanics may still be missing; use the source before finalizing the character sheet.</div>':''}`;
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
 return `<h3>Known experience thresholds</h3><p class="small muted">Source-listed rows only. Missing levels stay unavailable. XP is cumulative within the labeled track; eligibility and training also apply.</p><div class="table-scroll"><table><thead><tr><th scope="col">Level</th><th scope="col">Minimum XP</th><th scope="col">Next-level increase</th><th scope="col">Source</th><th scope="col"><span class="sr-only">Annotate level</span></th></tr></thead><tbody>${html}</tbody></table></div>${x.xpNote||x.progression?`<div class="callout">${esc(x.xpNote||x.progression)}</div>`:''}${x.xpContinuation?`<p class="small muted" style="margin-top:12px">${continuationFor(x)?'Higher thresholds may be derived only from the cited continuation rule and its explicit XP anchor.':'The continuation rule is recorded, but its XP anchor is missing or unverified; higher thresholds are not calculated.'} ${inlineSourceChip(x.xpContinuation,`${x.name} · XP continuation rule`)}</p>`:''}`;
}
function xpCalculatorHTML(x) {
 const rows=xpThresholds(x);if(!rows.length)return '';
 const tracks=[...new Set(rows.map(row=>row.track))];const activeTrack=thresholdForLevel(x,classTarget(x))?.track||tracks[0];
 return `<div class="calculator"><label for="xpInput">Your cumulative XP within this track</label>${tracks.length>1?`<label for="xpTrack">XP track</label><select id="xpTrack">${tracks.map(track=>`<option value="${esc(track)}"${track===activeTrack?' selected':''}>${esc(xpTrackLabel(x,track))}</option>`).join('')}</select>`:tracks[0]&&tracks[0]!=='main'?`<p class="small track-label">${esc(xpTrackLabel(x,tracks[0]))}</p>`:''}<div class="xp-input-row"><input id="xpInput" type="number" min="0" max="1000000000" step="1" value="0" inputmode="numeric" aria-describedby="xpOutput" aria-label="Cumulative experience points"><button id="calculateXP" class="button primary">Check progress</button></div><div id="xpOutput" class="xp-output" aria-live="polite"></div><div class="xp-meter" aria-hidden="true"><span id="xpMeter"></span></div></div>`;
}
function classDetailHTML(x) {
 return `<article class="detail-card" data-annotation-target="${esc(x.id)}" data-annotation-title="${esc(x.name)}"><header class="detail-header"><div class="detail-topline"><span class="eyebrow">${esc(x.variant||`${bookCode(x.book)} CLASS GUIDE`)}</span>${noteButton(x)}</div><h2>${esc(x.name)}</h2><div class="detail-subtitle">${x.hitDie?`<span>Hit die ${esc(x.hitDie)}</span><span>·</span>`:''}${sourceChip(x)}<span class="status-chip unverified">OCR checked</span></div></header><div class="detail-body">${x.description?`<p>${esc(x.description)}</p>`:''}${advancementControlsHTML(x)}${xpCalculatorHTML(x)}${xpTableHTML(x)}${Array.isArray(x.guidance)&&x.guidance.length?`<h3>General class checklist</h3><p class="small muted">These are general class reminders, separate from the selected level’s changes.</p><ul>${x.guidance.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:'<h3>General class checklist</h3><p>Class-wide advancement reminders are still being extracted. Check the class section, relevant ability tables, and DMG training guidance in your own books.</p>'}${x.errata?`<h3>Errata — separate from the printing</h3><div class="callout">${esc(Array.isArray(x.errata)?x.errata.join(' '):x.errata)}</div>`:''}<div class="callout">XP indicates a threshold, not automatic advancement. Class prerequisites, campaign eligibility, rank limits, and the Dungeon Master’s training procedure can affect advancement.</div></div>${inlineNotes(x.id)}<footer class="detail-footer"><span>${icon('book')}Partial level-up extraction · visual table verification pending</span><button class="source-chip" data-copy-link="${esc(x.id)}">Copy reference link ↗</button></footer></article>`;
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
 $$('[data-inline-source]',root).forEach(el=>{el.onclick=()=>showSource('classes','',{name:el.dataset.refTitle,book:el.dataset.refBook,pages:el.dataset.refPages.split(',').filter(Boolean).map(Number),status:el.dataset.refStatus});});
}
function bindAdvancement() {
 const item=data.classes.find(x=>x.id===selectedId);if(!item||view!=='classes')return;
 $('#targetLevel')?.addEventListener('change',e=>{classTargets.set(item.id,Number(e.target.value));$('#advancementSummary').innerHTML=advancementSummaryHTML(item,Number(e.target.value));const xpTrack=$('#xpTrack');const targetTrack=thresholdForLevel(item,Number(e.target.value))?.track;if(xpTrack&&targetTrack){xpTrack.value=targetTrack;calculateXP();}$('#advancementAnnouncement').textContent=`${item.name}, level ${Number(e.target.value)-1} to ${Number(e.target.value)}. Partial guide; review extracted changes and remaining gaps.`;bindInlineSources($('#advancementSummary'));$$('[data-annotate]',$('#advancementSummary')).forEach(el=>{el.onclick=()=>openNote({target:el.dataset.annotate,title:el.dataset.noteTitle,view:'classes'});});});
 $('#advancementClass')?.addEventListener('change',e=>{filter={q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();goTo('classes',e.target.value);setTimeout(()=>$('#advancementClass')?.focus({preventScroll:true}),0);});
 $('#xpTrack')?.addEventListener('change',calculateXP);
 bindInlineSources();
}

function renderSources() {
 const xpCount = data.classes.filter(x=>xpThresholds(x).length>0).length;
 const detailed = data.spells.filter(hasDetails).length;
 const sources = data.sources.length ? data.sources : [{id:'PHB',title:'Players Handbook',edition:'Sixth printing · January 1980',mapping:'Printed page N = PDF page N + 1',gaps:[],coverage:'Extraction in progress.'},{id:'UA',title:'Unearthed Arcana',edition:'Original 1985 edition',mapping:'Printed page N = PDF page N + 1',gaps:[],coverage:'Extraction in progress.'},{id:'DMG',title:'Dungeon Masters Guide',edition:'Revised December 1979',mapping:'Printed 1–174: PDF N+1. Printed 176–239: PDF N.',gaps:[175,240],coverage:'Missing pages are excluded.'}];
 $('#main').innerHTML = pageHeading('KNOW WHAT YOU’RE READING','A reference you can trace.','The original printings are the authority. This companion provides selected, reformatted study aids and exact page locations.') + `<div class="coverage-grid"><div class="coverage-stat"><strong>${data.spells.length.toLocaleString()}</strong><span>Class-specific spell entries indexed · ${detailed} detailed cards</span></div><div class="coverage-stat"><strong>${data.rules.length.toLocaleString()}</strong><span>Curated rules references</span></div><div class="coverage-stat"><strong>${data.classes.length.toLocaleString()}</strong><span>Class &amp; advancement guides · ${xpCount} with partial XP tables</span></div></div><section class="source-cards" aria-label="Source printings">${sources.map((s,i) => { const code = bookCode(s.id || s.book || ['PHB','UA','DMG'][i]); const count = data.rules.filter(x=>bookCode(x.book)===code).length; const spells = data.spells.filter(x=>bookCode(x.book)===code); return `<article class="source-card" data-annotation-target="source:${esc(code)}" data-annotation-title="${esc(s.title)}"><div class="source-bookmark" aria-hidden="true"><span>AD&amp;D</span><strong>${esc(code)}</strong></div><span class="eyebrow">SOURCE ${String(i+1).padStart(2,'0')}</span><h2>${esc(s.title)}</h2><p>${esc(s.edition || '')}</p><h3>Current coverage</h3><p>${esc(typeof s.coverage === 'string' ? s.coverage : JSON.stringify(s.coverage || 'Source extraction in progress.'))}</p><p>${count} rule references · ${spells.length} spell entries · ${spells.filter(hasDetails).length} detailed cards</p>${Array.isArray(s.gaps)&&s.gaps.length ? `<div class="gap-badge">Missing printed pages: ${s.gaps.map(esc).join(', ')}. These pages are not reconstructed.</div>` : ''}<p class="source-map">${esc(s.mapping || (code==='DMG'?'Printed 1–174 → PDF +1; printed 176–239 → PDF same.':'Printed page N → PDF page N + 1.'))}</p><div>${noteButton({id:`source:${code}`,name:s.title})}</div></article>`; }).join('')}</section><section class="coverage-copy" data-annotation-target="coverage" data-annotation-title="Coverage & editorial standards"><h2>Clear boundaries. Better rulings.</h2><p>This is a growing, curated reference, not a complete reproduction of the books. ${xpCount<data.classes.length?`Only ${xpCount} of ${data.classes.length} class/variant guides currently include partial XP tables; other progressions are pending.`:`All ${data.classes.length} class/variant guides include source XP rows, but individual tables may still have gaps and level-up mechanics remain partially extracted.`} An indexed entry records a class-specific spell heading and level; the same spell name may appear in several classes. A detailed card separately extracts selected casting attributes and a concise paraphrase. Missing fields are not inferred.</p><p>Current content has been checked against source OCR. Important tables still require visual verification against the scan. Page chips identify the printed page and its corresponding page in the supplied PDF. The source PDFs and wholesale book text are never published here.</p><p>Players Handbook and original Unearthed Arcana rules are identified separately. Later editions, modified scans, house rules, and errata are not silently substituted. Any errata supplied in a guide is explicitly labeled.</p>${noteButton({id:'coverage',name:'Coverage & editorial standards'})}</section>`;
}
function renderNotebook() {
 let shown = [...notes].sort((a,b) => String(b.updated).localeCompare(String(a.updated)));
 if (selectedId) { const found = shown.find(n=>n.id===selectedId); if (found) shown = [found,...shown.filter(n=>n.id!==selectedId)]; }
 const actions = `<div class="notebook-actions"><button class="button secondary" id="importNotebook">${icon('upload')}Import</button><button class="button secondary" id="exportNotebook">${icon('download')}Export backup</button><button class="button primary" data-annotate="notebook" data-note-title="Campaign note" data-note-view="notebook">${icon('pen')}New note</button></div>`;
 $('#main').innerHTML = pageHeading('YOUR RULINGS, YOUR REMINDERS','Notes in the margins.','A house rule worth remembering. A spell worth trying. Everything you annotate stays here, in this browser.',actions) + `<div class="coverage-banner">${icon('lock')}<span>${storageAvailable ? 'Your notebook is saved locally on this device. Export a backup before clearing browser data or changing devices.' : 'Browser storage could not be read. Export a backup of any notes you create before leaving.'}</span></div><div class="result-toolbar"><span><strong>${notes.length}</strong> personal annotation${notes.length===1?'':'s'}</span><span class="sort-label">Most recently edited</span></div>${shown.length ? `<section class="notebook-list" aria-label="Your annotations">${shown.map(n=>`<article class="notebook-card" id="note-${esc(n.id)}"><span class="note-source">${esc(n.view === 'notebook' ? 'CAMPAIGN NOTE' : ({spells:'SPELL',rules:'RULE',classes:'CLASS',sources:'SOURCE'})[n.view]+' REFERENCE')}</span><h2>${n.view !== 'notebook' ? `<a href="#${esc(n.view)}/${encodeURIComponent(n.target.split(':level:')[0])}">${esc(n.title)}</a>` : esc(n.title)}</h2>${n.quote ? `<blockquote>${esc(n.quote)}</blockquote>` : ''}<div class="note-content">${esc(n.text)}</div><div class="note-card-footer"><time datetime="${esc(n.updated)}">${esc(formatDate(n.updated))}</time><button data-edit-note="${esc(n.id)}">Edit</button><button class="delete-note" data-delete-note="${esc(n.id)}">Delete</button></div></article>`).join('')}</section>` : `<div class="empty-state"><h2>Your next great ruling starts here.</h2><p>Use “Annotate” on any reference, or select a passage to attach a note.<br>Keep a general campaign note with the button above.</p><button class="button secondary" data-annotate="notebook" data-note-title="Campaign note" data-note-view="notebook">${icon('pen')}Write your first note</button></div>`}`;
}
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Saved locally' : date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function bindPage() {
 bindSpellToggles();
 $('#loadMore')?.addEventListener('click',()=>{const top=$('.result-list').scrollTop;listLimit+=50;renderReference();bindPage();$('.result-list').scrollTop=top;($('#loadMore')||$$('[data-select]').at(-1))?.focus({preventScroll:true});});
 let searchTimer;
 $('#referenceSearch')?.addEventListener('input',e=>{ const value=e.target.value; clearTimeout(searchTimer); searchTimer=setTimeout(()=>{const start=e.target.selectionStart; filter.q=value; listLimit=50; renderReference(); bindPage(); const input=$('#referenceSearch'); input.focus(); if(start!==null)input.setSelectionRange(start,start);},100); });
 $$('[data-filter]').forEach(el=>el.addEventListener('change',()=>{filter[el.dataset.filter]=el.value;if(el.dataset.filter==='class')selectedSpellLevels=reconcileSpellLevelSelection(selectedSpellLevels,availableSpellLevels(data.spells,filter.class)); listLimit=50; selectedId=''; const focusedId=el.id; renderReference(); bindPage(); $('#'+focusedId)?.focus({preventScroll:true});}));
 $('#clearFilters')?.addEventListener('click',()=>{filter={q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();selectedId='';renderReference();bindPage();$('#referenceSearch').focus();});
 $$('[data-select]').forEach(el=>el.addEventListener('click',()=>{
  selectedId=el.dataset.select; const item=index.find(x=>x._view===view&&x.id===selectedId); if(!item)return;
  $$('[data-select]').forEach(b=>{b.classList.toggle('selected',b.dataset.select===selectedId);b.setAttribute('aria-pressed',String(b.dataset.select===selectedId));});
  $('#referenceDetail').innerHTML=detailHTML(item); bindDetail();
  history.replaceState(null,'',`#${view}/${encodeURIComponent(selectedId)}`);
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
 $$('[data-source-id]').forEach(el=>{el.onclick=()=>showSource(el.dataset.sourceView,el.dataset.sourceId);});
 $$('[data-annotate]').forEach(el=>{el.onclick=()=>openNote({target:el.dataset.annotate,title:el.dataset.noteTitle,view:el.dataset.noteView||view});});
 $$('[data-copy-link]').forEach(el=>{el.onclick=async()=>{
  const url=new URL(location.href);url.hash=`${view}/${encodeURIComponent(el.dataset.copyLink)}`;
  try {await navigator.clipboard.writeText(url.href);toast('Reference link copied.');} catch {toast('Use your browser’s address bar to copy this reference link.');}
 };});
 bindAdvancement();
 $('#calculateXP')?.addEventListener('click',calculateXP);
 $('#xpInput')?.addEventListener('input',calculateXP);
 $('#xpInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')calculateXP();});
 calculateXP();
}
function showSource(sourceView,id,reference=null) {
 const item=reference||data[sourceView]?.find(x=>x.id===id);if(!item)return;
 const pages=pagesFor(item);const code=bookCode(item.book);const source=data.sources.find(s=>bookCode(s.id||s.book)===code);
 $('#sourceBody').innerHTML=`<h2 id="sourceTitle">${esc(bookName(item.book))}</h2><p class="muted">${esc(source?.edition||'User-supplied first edition source')}</p>${sourceView==='spells'&&!hasDetails(item)?'<div class="callout">This citation locates an indexed spell in the source. Quick-reference details have not yet been extracted; consult the cited source heading in your own book.</div>':''}<div class="source-reference-table"><table><thead><tr><th>Printed page</th><th>Supplied PDF page</th><th>Reference</th></tr></thead><tbody>${pages.length?pages.map(p=>`<tr><td>${p}</td><td>${pdfPage(code,p)===null?'Unavailable':pdfPage(code,p)}</td><td>${esc(item.name||item.title)}</td></tr>`).join(''):'<tr><td colspan="3">Page location is not yet extracted.</td></tr>'}</tbody></table></div><p class="small muted">${esc(code==='DMG'?'DMG printed pp. 1–174 are PDF page N+1. Printed pp. 176–239 are PDF page N. Printed pp. 175 and 240 are missing.':'In this supplied scan, printed page N is PDF page N+1.')} PDF page numbers count from 1.</p><p class="small muted">Verification: ${esc(item.status||'Source OCR checked; visual verification pending')}. The source PDF is kept private and is not hosted by this reference.</p>`;
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
 paletteOrigin=document.activeElement;$('#commandInput').value='';commandIndex=0;renderCommands('');$('#palette').showModal();$('#commandInput').focus();
}
function renderCommands(query) {
 commandRows=index.filter(x=>matchesQuery(x,query)).sort((a,b)=>{
  const q=normalize(query);const score=x=>q?FirstEditionSearch.score(x,query):(x._view==='spells'&&hasDetails(x)?0:1);
  return score(a)-score(b)||Number(hasDetails(b))-Number(hasDetails(a))||a._title.localeCompare(b._title);
 }).slice(0,18);
 commandIndex=Math.max(0,Math.min(commandIndex,commandRows.length-1));
 $('#commandResults').innerHTML=commandRows.length?commandRows.map((x,i)=>`<div class="palette-result" role="option" id="command-${i}" aria-selected="${i===commandIndex}" data-command-index="${i}"><span>${icon(x._view==='spells'?'spark':x._view==='classes'?'shield':x._view==='notebook'?'pen':'book')}</span><div class="result-title">${esc(x._title)}<small>${esc(x._subtitle)}</small></div><span class="result-type">${esc(x._view==='spells'?'SPELL':x._view==='rules'?'RULE':x._view==='classes'?'CLASS':'NOTE')}</span></div>`).join(''):'<div class="palette-empty">No matches. Try a shorter spell name, class, or rules keyword.</div>';
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
 const x=commandRows[i];if(!x)return;$('#palette').close();filter={q:'',class:'',book:'',category:'',details:''};selectedSpellLevels=new Set();goTo(x._view,x.id);setTimeout(()=>$('#main').focus({preventScroll:true}),0);
}
$('#paletteOpen').addEventListener('click',openPalette);
$('#commandInput').addEventListener('input',e=>{commandIndex=0;renderCommands(e.target.value);});
$('#commandInput').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();setCommandIndex(commandIndex+1);}else if(e.key==='ArrowUp'){e.preventDefault();setCommandIndex(commandIndex-1);}else if(e.key==='Enter'){e.preventDefault();chooseCommand(commandIndex);}});
$('#palette').addEventListener('close',()=>{if(paletteOrigin?.isConnected)paletteOrigin.focus({preventScroll:true});});
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
  for(const key of ['spells','rules','classes','sources'])data[key]=Array.isArray(incoming[key])?incoming[key]:[];
  buildIndex();updateCounts();route();
 }catch(error){$('#main').innerHTML=pageHeading('A MOMENT AT THE LIBRARY','The reference could not open.','Your annotations are safe in this browser. The rule data could not be loaded.')+`<div class="empty-state load-error"><p>${esc(error.message)}</p><button class="button primary" id="retryLoad">Try again</button> <a href="#notebook" class="button secondary" id="offlineNotes">Open my notebook</a></div>`;$('#retryLoad').onclick=initialize;$('#offlineNotes').onclick=()=>{view='notebook';render();};}
}
initialize();
})();
