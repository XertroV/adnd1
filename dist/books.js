'use strict';
((root)=>{
 const books={
  PHB:{title:'Players Handbook',lastPage:128,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  UA:{title:'Unearthed Arcana',lastPage:128,mapping:'Printed page N corresponds to PDF page N+1.',gaps:[]},
  DMG:{title:'Dungeon Masters Guide',lastPage:240,mapping:'Printed pp.1–174 correspond to PDF page N+1; pp.176–238 correspond to PDF page N. Printed p.175 is absent from the supplied PDF; a separate image is confirmed by the user as the correct edition and is usable as source evidence through two limited excerpts. The full image is not part of the PDF and is not published. The identity of pp.239–240 is unverified: PDF p.239 is an unnumbered sheet and PDF p.240 is the back cover.',gaps:[175],unverified:[239,240]},
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
 });
 const HASH=/^[a-f0-9]{64}$/;
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
  if(supplementalEvidence(book,printed))return 'Printed p. 175 is absent from the supplied DMG PDF. The user confirmed the separate image is from the correct edition; two limited excerpts are available as source evidence. The full image is separate from the PDF and is not published.';
  return `Printed p. ${printed} is unavailable in the provided ${code(book)} scan.`;
 }
 const api=Object.freeze({books,code,pdfPage,availability,evidenceAvailability,supplementalEvidence,sourceArtifacts,resolveRegionSourceIdentity,privateEvidence,missingPageNotice,title:book=>books[code(book)]?.title||String(book||'Source pending'),mapping:book=>books[code(book)]?.mapping||'Page mapping has not been verified.'});
 root.FirstEditionBooks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
