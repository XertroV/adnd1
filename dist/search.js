'use strict';
// Shared browser/Node search core. Abbreviations describe editorial lookup aids,
// never additional rules or spell effects.
((root) => {
 const normalize = v => String(v ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const common = {
  'fireball':['fb'],
  'invisibility':['invis','inv'],
  'improved invisibility':['imp invis','improved invis'],
  'protection from evil':['prot evil','prot from evil','pro evil'],
  'protection from evil 10 radius':['pfe10','pfe 10','prot evil 10'],
  'invisibility 10 radius':['invis10','invis 10'],
  'cure light wounds':['cure light','cure lt wounds'],
  'cure serious wounds':['cure serious','cure ser wounds'],
  'cure critical wounds':['cure critical','cure crit wounds'],
  'magic missile':['magic missiles'],
 };
 const shorthand = {prot:'protection',lt:'light',wds:'wounds',ser:'serious',crit:'critical',invis:'invisibility',inv:'invisibility',imp:'improved',det:'detect',mag:'magic'};
 function initials(name) {
  const words=normalize(name).split(' ').filter(Boolean);
  return words.length>1 ? words.map(w=>/^\d+$/.test(w)?w:w[0]).join('') : '';
 }
 const privateSearchKeys = new Set(['book','bookkey','page','pages','printedpage','pdfpage','status','reviewstatus','contextstatus','contextlimitations','evidencebindings','regionreviews','regionids','sourceowner','sourceobject','sourceobjectpointer','fieldpointer','sourcecategory','sourcepages','sourcevaluestatus','valuepathstatus','targetreview','regionreview','regionevidence','expectedregionevidence','coordinateSpace','coordinatespace','cropcoordinates','highlightcoordinates','sourcehash','sourcepdfhash','sourcepdfsha256','sourcesha256','imagesha256','contentsha256','focussha256','focusrectssha256','hash','sha256','catalog','verification','reviewevidence','evidence','proof','audit','privateevidence','privateprovenance','sourceprovenance','provenance','independentreview','sourceartifact','sourceartifactsha256','sourcefile','sourcefilename','sourcepath','imagepath','renderpath']);
 const isPrivateSearchKey = key => {
  const compact=normalize(key).replaceAll(' ','');
  return privateSearchKeys.has(compact)||/(?:hash|sha256)$/.test(compact);
 };
 const searchableObjectText = value => {
  if(typeof value==='string'||typeof value==='number')return String(value);
  if(Array.isArray(value))return value.map(searchableObjectText).filter(Boolean).join(' ');
  if(value&&typeof value==='object')return Object.entries(value).filter(([key])=>!isPrivateSearchKey(key)).map(([,child])=>searchableObjectText(child)).filter(Boolean).join(' ');
  return '';
 };
 const searchableFieldsText = fields => fields&&typeof fields==='object'&&!Array.isArray(fields)
  ? Object.entries(fields).filter(([label])=>!isPrivateSearchKey(label)).flatMap(([label,value])=>[label,searchableObjectText(value)]).filter(Boolean).join(' ')
  : '';
 const searchableClassChangeText = item => item._view==='classes'&&Array.isArray(item.levelChanges)
  ? item.levelChanges.flatMap(entry=>[entry?.option,...(Array.isArray(entry?.changes)?entry.changes:[])]).filter(value=>typeof value==='string'&&value.trim()).join(' ')
  : '';
 const searchableClassXpText = item => item._view==='classes'
  ? [...(Array.isArray(item.xpRows)?item.xpRows:Array.isArray(item.xp)?item.xp:[])].flatMap((entry,index)=>{
    if(entry===null||entry===undefined||entry==='')return [];
    const row=typeof entry==='object'?entry:{level:index+1,xp:entry};
    return [row.level??index+1,row.xp??row.minimum??row.threshold,row.label,row.track].filter(value=>value!==undefined&&value!==null&&value!=='').flatMap(value=>typeof value==='number'?[value,value.toLocaleString('en-US')]:[value]);
   }).concat(item.xpTrack||[]).join(' ')
  : '';
 const authoredNoteFields=new Set(['attackTableNote','retainedSkillsNote','priceNote']);
 const searchableAuthoredNotesText = item => item&&typeof item==='object'
  ? Object.entries(item).filter(([key,value])=>authoredNoteFields.has(key)&&typeof value==='string'&&!isPrivateSearchKey(key)).map(([,value])=>value).join(' ')
  : '';
 const searchableMatrixText = item => item?._view==='matrices'
  ? [item.title,item.attackerLabel,item.rowHeader?.label,...(item.armorClasses||[]),...(item.rows||[]).flatMap(row=>[row?.label,...(row?.targets||[])]),...(item.notes||[]),...(item.ruleNotes||[]).flatMap(note=>[note?.title,note?.text]),...(item.comparisonExamples||[]).flatMap(example=>[example?.levelMin,example?.levelMax,example?.armorClass,example?.acZeroTarget,example?.simpleSubtractionTarget,example?.matrixTarget,example?.explanation])].filter(value=>value!==undefined&&value!==null).join(' ')
  : '';
 const searchableProgressionExplainerText = item => item?._view==='progressionExplainer'
  ? [item.title,item.description,...(item.sections||[]).flatMap(section=>[section?.label,section?.description]),...(item.terminologyNotes||[])].filter(value=>value!==undefined&&value!==null).join(' ')
  : '';
 const searchableTableText = table => {
  if(!table||typeof table!=='object')return '';
  return [table.title,table.rowHeader?.label,table.columnGroup?.label,
   ...(Array.isArray(table.columns)?table.columns.map(column=>column?.label):[]),
   ...(Array.isArray(table.rows)?table.rows.flatMap(row=>[row?.label,...(Array.isArray(row?.cells)?row.cells.map(cell=>cell?.raw):[])]):[]),
   ...(Array.isArray(table.symbols)?table.symbols.flatMap(symbol=>[symbol?.symbol,symbol?.text,symbol?.meaning]):[]),
   ...(Array.isArray(table.procedure)?table.procedure.map(step=>step?.text):[]),
   ...(Array.isArray(table.footnotes)?table.footnotes.flatMap(note=>[note?.marker,note?.text,note?.appliesTo]):[]),
   table.progressionNote?.text
  ].filter(value=>value!==undefined&&value!==null).join(' ');
 };
 function prepare(item) {
  const name=normalize(item._title || item.name || item.title);
  const spell=item._view==='spells';
  const aliases=spell ? [...(item.aliases||[]),...(common[name]||[])] : [...(item.aliases||[])];
  const exact=new Set(aliases.map(normalize).filter(Boolean));
  const acronyms=new Set();
  if(spell) for(const title of [name,...aliases]) {const a=initials(title);if(a.length>=2)acronyms.add(a);}
  if(spell)exact.add(name.replaceAll(' ',''));
  // Index authored rule text and structured tables, but leave source/audit metadata,
  // private provenance, and serialized citation objects out of search.
  const body=normalize([
   item._title,item._subtitle,item.summary,item.description,item.text,item.category,
   searchableFieldsText(item.fields),item.book,item._bookName,...(item.pages||[]),
   ...(item.tags||[]),...(item.effect||[]),...(item.conditions||[]),...(item.exceptions||[]),
   ...(item.bullets||[]),...(item.pendingMechanics||[]),...(item.guidance||[]),
   item.xpNote, item.progression?.label, item.progression?.description,searchableClassChangeText(item),searchableClassXpText(item),
   searchableAuthoredNotesText(item),searchableMatrixText(item),searchableProgressionExplainerText(item),
   searchableTableText(item.table),...aliases
  ].filter(value=>value!==undefined&&value!==null).join(' '));
  const bodyWords=body.split(' ').filter(Boolean);
  return {...item,_name:name,_search:body,_aliases:exact,_acronyms:acronyms,_nameWords:name.split(' ').filter(Boolean),_bodyWords:new Set(bodyWords),_bodyWordList:bodyWords};
 }
 let previousQuery=null, previousParsed;
 function parseQuery(query) {
  const raw=String(query??'');if(raw===previousQuery)return previousParsed;
  const input=normalize(raw).split(' ').filter(Boolean),tokens=[];
  for(let i=0;i<input.length;i++) {
   if(/^[a-z]$/.test(input[i])) {
    let j=i;while(j<input.length&&/^[a-z]$/.test(input[j]))j++;
    if(j-i>=2){tokens.push(input.slice(i,j).join(''));i=j-1;continue;}
   }
   tokens.push(input[i]);
  }
  previousQuery=raw;return previousParsed={text:tokens.join(' '),tokens};
 }
 function tokenMatches(item,token) {
  if(item._aliases.has(token)||item._acronyms.has(token))return true;
  if(item._view==='spells'&&['cleric','druid','illusionist'].includes(token))return (item.classes||[item.class]).some(c=>normalize(c)===token);
  const word=shorthand[token]||token;
  if(word.length<=3)return item._bodyWords.has(word)||item._nameWords.some(w=>w.startsWith(word));
  return item._bodyWordList.some(candidate=>candidate===word||candidate.startsWith(word));
 }
 function phraseInWords(words,phrase) {
  const target=phrase.split(' ').filter(Boolean);if(!target.length||target.length>words.length)return false;
  outer:for(let i=0;i<=words.length-target.length;i++){
   for(let j=0;j<target.length;j++)if(words[i+j]!==target[j])continue outer;
   return true;
  }
  return false;
 }
 function titleTokenCoverage(item,tokens) {
  return tokens.every(token=>item._nameWords.some(word=>word===token||word.startsWith(token)));
 }
 function score(item,query) {
  const q=parseQuery(query);if(!q.tokens.length)return 5;
  if(item._name===q.text)return 0;
  if(item._aliases.has(q.text))return 1;
  if(item._acronyms.has(q.text))return 2;
  if(!q.tokens.every(t=>tokenMatches(item,t)))return Infinity;
  if(q.tokens.every(t=>item._aliases.has(t)||item._acronyms.has(t)))return 2;
  if(phraseInWords(item._nameWords,q.tokens.join(' ')))return 3;
  if(titleTokenCoverage(item,q.tokens))return 4;
  if(phraseInWords(item._bodyWordList,q.tokens.join(' ')))return 5;
  return 6;
 }
 function compare(a,b,query='') {
  const aScore=score(a,query),bScore=score(b,query);
  return aScore-bScore||normalize(a._title||a.name||a.title).localeCompare(normalize(b._title||b.name||b.title),'en',{sensitivity:'base',numeric:true})||String(a._view||'').localeCompare(String(b._view||''),'en',{sensitivity:'base'})||String(a.id||'').localeCompare(String(b.id||''),'en',{sensitivity:'base'});
 }
 const api=Object.freeze({normalize,initials,prepare,score,compare});
 root.FirstEditionSearch=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
