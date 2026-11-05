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
 function prepare(item) {
  const name=normalize(item._title || item.name || item.title);
  const spell=item._view==='spells';
  const aliases=spell ? [...(item.aliases||[]),...(common[name]||[])] : [...(item.aliases||[])];
  const exact=new Set(aliases.map(normalize).filter(Boolean));
  const acronyms=new Set();
  if(spell) for(const title of [name,...aliases]) {const a=initials(title);if(a.length>=2)acronyms.add(a);}
  if(spell)exact.add(name.replaceAll(' ',''));
  const body=normalize([item._title,item._subtitle,item.summary,item.description,item.text,JSON.stringify(item.fields||{}),item.book,item._bookName,...(item.pages||[]),...(item.tags||[]),...(item.effect||[]),...(item.conditions||[]),...(item.exceptions||[]),...aliases].join(' '));
  return {...item,_name:name,_search:body,_aliases:exact,_acronyms:acronyms,_nameWords:name.split(' '),_bodyWords:new Set(body.split(' '))};
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
  return item._search.includes(word);
 }
 function score(item,query) {
  const q=parseQuery(query);if(!q.tokens.length)return 5;
  if(item._name===q.text)return 0;
  if(item._aliases.has(q.text))return 1;
  if(item._acronyms.has(q.text))return 2;
  if(!q.tokens.every(t=>tokenMatches(item,t)))return Infinity;
  if(q.tokens.some(t=>item._aliases.has(t)||item._acronyms.has(t)))return 2;
  return item._name.startsWith(q.text)?3:4;
 }
 const api=Object.freeze({normalize,initials,prepare,score});
 root.FirstEditionSearch=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
