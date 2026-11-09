'use strict';
((root)=>{
 const books={
  PHB:{title:'Players Handbook',lastPage:128,pdfPages:130,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  UA:{title:'Unearthed Arcana',lastPage:128,pdfPages:130,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  DMG:{title:'Dungeon Masters Guide',lastPage:238,pdfPages:240,mapping:'Printed pp.1–174 correspond to PDF page N+1; printed pp.176–238 correspond to PDF page N. Printed p.175 is absent from the supplied PDF; a separate private image is user-confirmed as the correct edition, but its exact printing is not established. Limited excerpts are available as source evidence; the full image is not published. PDF p.239 is an unnumbered interior reference leaf and PDF p.240 is the unnumbered rear cover; neither has an established printed folio or printed-page mapping.',gaps:[175],unnumberedPdfLeaves:[{pdfPage:239,printedPage:null,kind:'interior-reference-leaf',label:'Interior reference leaf; repeated encumbrance, armor and hireling tables; no printed folio established.'},{pdfPage:240,printedPage:null,kind:'rear-cover',label:'Rear cover; no printed folio established.'}]},
  MM:{title:'Monster Manual',lastPage:112,pdfPages:114,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  MM2:{title:'Monster Manual II',lastPage:160,pdfPages:162,mapping:'Printed pp.1–82 correspond to PDF page N+1; printed p.83 is PDF page 92; printed pp.84–91 correspond to PDF page N; printed pp.92–160 correspond to PDF page N+1. Printed p.83 is displaced after p.91 in the supplied scan.',gaps:[]},
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
 function evidenceAvailability(book,printed){
  const status=availability(book,printed);
  return status==='missing'&&supplementalEvidence(book,printed)?'supplemental':status;
 }
 function pdfPage(book,printed){
  const key=code(book),info=books[key],p=Number(printed);
  if(availability(key,p)!=='available')return null;
  if(key==='DMG')return p<=174?p+1:p;
  if(key==='MM2')return p===83?92:p>=84&&p<=91?p:p+1;
  return p+1;
 }
 function supplementalEvidence(book,printed){
  return code(book)==='DMG'&&Number(printed)===175?{
   available:true,
   medium:'supplemental-image',
   editionStatus:'user-confirmed-correct-edition',
   printingStatus:'not-specified',
   originalPdfContainsPrintedPage:false,
   originalPdfSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',
   imageSha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',
   imageDimensionsPx:[1329,1796],
   published:false,
  }:null;
 }
 const sourceArtifacts=Object.freeze({
  'dmg175-user-confirmed-supplement':Object.freeze({
   id:'dmg175-user-confirmed-supplement',
   type:'supplemental-page-image',
   book:'DMG',
   printedPage:175,
   sha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',
   mediaType:'image/jpeg',
   dimensionsPx:Object.freeze([1329,1796]),
   canonicalPdfSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669',
   originalPdfContainsPrintedPage:false,
   editionStatus:'user-confirmed-correct-edition',
   printingStatus:'not-specified',
  }),
 });
 const approvedDmg175Crops=Object.freeze({
  'dmg-175-party-table-context-78c4c383c38c7d10':Object.freeze({image:'dmg-175-party-table-context-78c4c383c38c7d10.png',sha256:'78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89',width:635,height:490,bounds:Object.freeze([0,1145,635,1635])}),
  'dmg-175-level-others-context-5aa02e91e35c4c28':Object.freeze({image:'dmg-175-level-others-context-5aa02e91e35c4c28.png',sha256:'5aa02e91e35c4c28152caccd947096943b74889b8596376cb86cb0c7170291b8',width:659,height:372,bounds:Object.freeze([670,120,1329,492])}),
  'dmg175-level-others-abilities-guidance-character-and-henchman-abilities-alignment-paragraph':Object.freeze({image:"dmg-175-dmg175-level-others-abilities-guidance-b71ff06cac3fecd6.png",sha256:"b71ff06cac3fecd606cb6d6e42b5be8eb23faf5e03594fba9902ef8f3ea86a0b",width:669,height:863,bounds:Object.freeze([660,115,1329,978])}),
  'dmg175-level-others-abilities-guidance-character-and-henchman-equipment-paragraph':Object.freeze({image:"dmg-175-dmg175-level-others-abilities-guidance-b71ff06cac3fecd6.png",sha256:"b71ff06cac3fecd606cb6d6e42b5be8eb23faf5e03594fba9902ef8f3ea86a0b",width:669,height:863,bounds:Object.freeze([660,115,1329,978])}),
  'dmg175-level-others-abilities-guidance-character-spells-paragraph':Object.freeze({image:"dmg-175-dmg175-level-others-abilities-guidance-b71ff06cac3fecd6.png",sha256:"b71ff06cac3fecd606cb6d6e42b5be8eb23faf5e03594fba9902ef8f3ea86a0b",width:669,height:863,bounds:Object.freeze([660,115,1329,978])}),
  'dmg175-character-level-left-level-of-characters-paragraph-left-column-portion':Object.freeze({image:"dmg-175-dmg175-character-level-left-fd13f5d51d4f527d.png",sha256:"fd13f5d51d4f527d8887c31627d39ce224c33ccd810a78bd8b01ba204f8aa3fc",width:650,height:135,bounds:Object.freeze([0,1625,650,1760])}),
  'dmg175-character-level-right-level-of-characters-paragraph-right-column-continuation':Object.freeze({image:"dmg-175-dmg175-character-level-right-559d4fbdf082168c.png",sha256:"559d4fbdf082168cf66bd5249127ceed62dde39fec6feb57738cfd1b4c613c77",width:664,height:125,bounds:Object.freeze([665,0,1329,125])}),
  'dmg175-character-subtable-complete-character-subtable-heading-column-labels-and-all-rows':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-01-17':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-18-20':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-21-60':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-61-62':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-63-65':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-66-86':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-87-88':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-89-98':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-99':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-character-subtable-character-subtable-row-00':Object.freeze({image:"dmg-175-dmg175-character-subtable-d04058b90644212a.png",sha256:"d04058b90644212aff6d74606720833c96084bfb1dd836fc2525b7a2c03ec142",width:650,height:301,bounds:Object.freeze([0,1144,650,1445])}),
  'dmg175-party-size-separate-party-procedure-clause-incompatible-profession-and-class-maximum-results':Object.freeze({image:"dmg-175-dmg175-party-size-15cef5c40c9874f7.png",sha256:"15cef5c40c9874f77299346be8030c81d5304e252576bc949bd2bae9d7a237cd",width:650,height:203,bounds:Object.freeze([0,1432,650,1635])}),
  'dmg175-level-others-abilities-guidance-complete-level-of-others-with-characters-paragraph':Object.freeze({image:"dmg-175-dmg175-level-others-abilities-guidance-b71ff06cac3fecd6.png",sha256:"b71ff06cac3fecd606cb6d6e42b5be8eb23faf5e03594fba9902ef8f3ea86a0b",width:669,height:863,bounds:Object.freeze([660,115,1329,978])}),
  'dmg175-party-magic-items-party-magic-items-complete-introductory-paragraph':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-1st-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-2nd-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-3rd-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-4th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-5th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-6th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-7th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-8th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-9th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-10th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-11th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-magic-items-party-magic-items-distribution-12th-level':Object.freeze({image:"dmg-175-dmg175-party-magic-items-81e4e0a51df9ed17.png",sha256:"81e4e0a51df9ed17963832bfec79edf4d2bc1ccef7322676e74b82bbdac8dd1f",width:699,height:806,bounds:Object.freeze([630,990,1329,1796])}),
  'dmg175-party-size-number-of-characters-in-party-procedure':Object.freeze({image:"dmg-175-dmg175-party-size-15cef5c40c9874f7.png",sha256:"15cef5c40c9874f77299346be8030c81d5304e252576bc949bd2bae9d7a237cd",width:650,height:203,bounds:Object.freeze([0,1432,650,1635])}),
 });
 const HASH=/^[a-f0-9]{64}$/;
 function supplementalCrop(book,printed,regionId){
  if(code(book)!=='DMG'||printed!==175||typeof regionId!=='string')return null;
  const crop=approvedDmg175Crops[regionId];
  if(!crop)return null;
  return Object.freeze({id:regionId,...crop,sourceArtifactId:'dmg175-user-confirmed-supplement',sourceIdentityKind:'supplemental-image',book:'DMG',printedPage:175,pdfPage:null,sourceSha256:'e4acdde4a9fed34ae4c60945db53a37e9e7d1b3682f967bc83ccc481e63e5ba7',canonicalPdfSha256:'7052949697a009497e5a828d5cf67998df034e30569584110781be46c6de8669'});
 }
 function resolveRegionSourceIdentity(catalog,region){
  const invalid=reason=>({valid:false,reason});
  if(!catalog||typeof catalog!=='object'||!region||typeof region!=='object')return invalid('missing-catalog-or-region');
  if(Object.hasOwn(region,'sourceArtifactId')){
   const id=region.sourceArtifactId;
   if(id!=='dmg175-user-confirmed-supplement')return invalid('unknown-or-invalid-source-artifact-id');
   const approvedCrop=approvedDmg175Crops[region.id];
   if(!approvedCrop)return invalid('unreviewed-supplement-crop');
   const artifact=catalog.sourceArtifacts?.[id],expected=sourceArtifacts[id];
   if(!artifact||typeof artifact!=='object')return invalid('missing-source-artifact');
   if(artifact.id!==expected.id||artifact.type!==expected.type||artifact.book!==expected.book||artifact.printedPage!==expected.printedPage||artifact.sha256!==expected.sha256||artifact.mediaType!==expected.mediaType||!Array.isArray(artifact.dimensionsPx)||artifact.dimensionsPx.length!==2||artifact.dimensionsPx[0]!==expected.dimensionsPx[0]||artifact.dimensionsPx[1]!==expected.dimensionsPx[1]||artifact.canonicalPdfSha256!==expected.canonicalPdfSha256||artifact.originalPdfContainsPrintedPage!==false||artifact.editionStatus!==expected.editionStatus||artifact.printingStatus!==expected.printingStatus)return invalid('source-artifact-identity-mismatch');
   if(region.book!=='DMG'||region.printedPage!==175||region.pdfPage!==null)return invalid('supplement-region-page-mismatch');
   const canonicalPdf=catalog.sources?.DMG;
   if(!canonicalPdf||canonicalPdf.sha256!==expected.canonicalPdfSha256||!['supplied-handoff','computed-local'].includes(canonicalPdf.hashStatus))return invalid('canonical-pdf-identity-mismatch');
   const bounds=region.sourceCropBoundsPx;
   if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isInteger)||bounds[0]<0||bounds[1]<0||bounds[2]<=bounds[0]||bounds[3]<=bounds[1]||bounds[2]>expected.dimensionsPx[0]||bounds[3]>expected.dimensionsPx[1])return invalid('invalid-source-image-crop-bounds');
   if(bounds.some((value,index)=>value!==approvedCrop.bounds[index])||region.image!==approvedCrop.image||region.sha256!==approvedCrop.sha256||region.width!==approvedCrop.width||region.height!==approvedCrop.height)return invalid('supplement-crop-not-in-approved-native-crop-registry');
   if(region.sourceCoordinateSpace!=='supplement-image pixels; top-left origin; LTRB half-open')return invalid('invalid-source-image-coordinate-space');
   if(region.width!==bounds[2]-bounds[0]||region.height!==bounds[3]-bounds[1])return invalid('crop-output-dimensions-do-not-match-source-bounds');
   if(!HASH.test(region.sha256||''))return invalid('invalid-published-crop-hash');
   return {valid:true,sourceKind:'supplemental-image',sourceArtifactId:id,sourceSha256:artifact.sha256,canonicalPdfSha256:canonicalPdf.sha256,book:'DMG',printedPage:175,pdfPage:null,sourceDimensionsPx:[...expected.dimensionsPx],sourceCropBoundsPx:[...bounds],sourceCoordinateSpace:region.sourceCoordinateSpace};
  }
  if(Object.hasOwn(region,'sourceCropBoundsPx')||Object.hasOwn(region,'sourceCoordinateSpace'))return invalid('supplement-frame-without-source-artifact');
  if(!Object.hasOwn(region,'book')||region.book!==code(region.book)||!Number.isInteger(region.printedPage))return invalid('non-canonical-pdf-source-reference');
  const key=region.book,mapped=pdfPage(key,region.printedPage),source=catalog.sources?.[key];
  if(!Object.hasOwn(books,key)||mapped===null||region.pdfPage!==mapped)return invalid('pdf-page-mapping-mismatch');
  if(!source||!HASH.test(source.sha256||'')||!['supplied-handoff','computed-local'].includes(source.hashStatus))return invalid('missing-or-invalid-pdf-source-identity');
  return {valid:true,sourceKind:'pdf',sourceSha256:source.sha256,canonicalPdfSha256:source.sha256,book:key,printedPage:region.printedPage,pdfPage:mapped};
 }
 function privateEvidence(book,printed){return supplementalEvidence(book,printed);}
 function missingPageNotice(book,printed){
  if(supplementalEvidence(book,printed))return 'Printed p. 175 is absent from the supplied DMG PDF. The user confirmed the separate image is from the correct edition; Limited excerpts are available as source evidence; the full image is not published.';
  return `Printed p. ${printed} is unavailable in the provided ${code(book)} scan.`;
 }
 const api=Object.freeze({books,code,pdfPage,availability,evidenceAvailability,supplementalEvidence,sourceArtifacts,supplementalCrop,resolveRegionSourceIdentity,privateEvidence,missingPageNotice,title:book=>books[code(book)]?.title||String(book||'Source pending'),mapping:book=>books[code(book)]?.mapping||'Page mapping has not been verified.'});
 root.FirstEditionBooks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
