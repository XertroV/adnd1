'use strict';
((root)=>{
 const books={
  PHB:{title:'Players Handbook',lastPage:128,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  UA:{title:'Unearthed Arcana',lastPage:128,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  DMG:{title:'Dungeon Masters Guide',lastPage:240,mapping:'Printed pp.1–174 correspond to PDF page N+1; pp.176–238 correspond to PDF page N. Printed p.175 is missing. The identity of pp.239–240 is unverified: PDF p.239 is an unnumbered sheet and PDF p.240 is the back cover.',gaps:[175],unverified:[239,240]},
  MM:{title:'Monster Manual',lastPage:112,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  MM2:{title:'Monster Manual II',lastPage:160,mapping:'Printed pp.1–82 correspond to PDF page N+1; printed p.83 is PDF page92; pp.84–91 correspond to PDF page N; pp.92–160 correspond to PDF page N+1. Printed p.83 is misplaced after p.91.',gaps:[]},
 };
 function code(value){
  const text=String(value||'').toUpperCase().replace(/[’']/g,'').trim();
  if(['MM2','MMII'].includes(text)||text.includes('MONSTER MANUAL II')||text.includes('MONSTER MANUAL 2'))return'MM2';
  if(text==='MM'||text.includes('MONSTER MANUAL'))return'MM';
  if(text==='PHB'||text.includes('PLAYER'))return'PHB';
  if(text==='UA'||text.includes('UNEARTHED'))return'UA';
  if(text==='DMG'||text.includes('DUNGEON'))return'DMG';
  return text;
 }
 function availability(book,printed){
  const info=books[code(book)],p=Number(printed);
  if(!info||!Number.isInteger(p)||p<1||p>info.lastPage)return 'invalid';
  if(info.gaps.includes(p))return 'missing';
  if(info.unverified?.includes(p))return 'unverified';
  return 'available';
 }
 function pdfPage(book,printed){
  const key=code(book),info=books[key],p=Number(printed);
  if(availability(key,p)!=='available')return null;
  if(key==='DMG')return p<=174?p+1:p;
  if(key==='MM2')return p===83?92:p>=84&&p<=91?p:p+1;
  return p+1;
 }
 const api=Object.freeze({books,code,pdfPage,availability,title:book=>books[code(book)]?.title||String(book||'Source pending'),mapping:book=>books[code(book)]?.mapping||'Page mapping has not been verified.'});
 root.FirstEditionBooks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
