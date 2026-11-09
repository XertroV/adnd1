import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../../..');
const proposalDir=import.meta.dirname;
const privateOut='/workspace/vault-audit-private/pass8/missile-table-discoverability/focus-correction-v2';
mkdirSync(privateOut,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=relative=>JSON.parse(readFileSync(path.join(root,relative),'utf8'));
const records=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v2/rules-records-candidate-corrected.json').records;
const phbCatalog=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v2/catalogs/rules-phb-hurled-weapons-and-missiles-table.json');
const uaCatalog=json('research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v2/catalogs/rules-ua-hurled-weapons-and-missiles-table.json');
const inputs=[
 {book:'PHB',catalog:phbCatalog,source:'dist/scans/verified/phb-38-a3662691c2417e55.png',rows:records.find(record=>record.book==='PHB').table.rows},
 {book:'UA',catalog:uaCatalog,source:'dist/scans/verified/ua-28-f9e1d616b1cec48a.png',rows:[]},
];
const entries=[];
for(const input of inputs){
 const sourceBytes=readFileSync(path.join(root,input.source));
 const regions=input.book==='PHB'
  ?input.rows.map(row=>input.catalog.regions.find(region=>region.id===row.sourceReference.evidenceBindings[0].regionIds[0]))
  :[input.catalog.regions.find(region=>region.id==='ua28-footnote-aklys-10-foot')];
 for(const region of regions){
  if(!region||!Array.isArray(region.focusRects)||!region.focusRects.length)throw Error(`Missing corrected region for ${input.book}`);
  const safe=region.id.replace(/[^a-z0-9-]/gi,'-');
  const output=path.join(privateOut,`${input.book.toLowerCase()}-${safe}.png`);
  const draw=region.focusRects.map(rect=>{
   const [x,y,width,height]=rect;
   const x0=Math.round(x*(input.book==='PHB'?1656:1130)),y0=Math.round(y*(input.book==='PHB'?600:726));
   const x1=Math.round((x+width)*(input.book==='PHB'?1656:1130)),y1=Math.round((y+height)*(input.book==='PHB'?600:726));
   return `rectangle ${x0},${y0} ${x1},${y1}`;
  }).join(' ');
  execFileSync('magick',[path.join(root,input.source),'-stroke','#f00000','-strokewidth','3','-fill','none','-draw',draw,output]);
  const bytes=readFileSync(output);
  entries.push({book:input.book,regionId:region.id,source:{path:input.source,sha256:sha(sourceBytes)},focusRects:region.focusRects,focusRectsSha256:sha(Buffer.from(JSON.stringify(region.focusRects))),privateOverlay:{path:output,sha256:sha(bytes),width:input.book==='PHB'?1656:1130,height:input.book==='PHB'?600:726},status:'for independent visual inspection only; no focus acceptance or source grade'});
 }
}
const manifest={schemaVersion:1,artifactType:'missile-table-focus-correction-private-review-overlays',status:'private overlay previews only; not evidence of focus acceptance',proposal:{path:'research/missile-table-discoverability/implementation-candidate/focus-navigation-correction-v2/focus-correction-proposal.json',sha256:sha(readFileSync(path.join(proposalDir,'focus-correction-proposal.json')))},entries};
const manifestPath=path.join(proposalDir,'private-review-overlay-manifest.json');
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({manifestPath:path.relative(root,manifestPath),manifestSha256:sha(readFileSync(manifestPath)),privateOut,entries:entries.map(entry=>({book:entry.book,regionId:entry.regionId,path:entry.privateOverlay.path,sha256:entry.privateOverlay.sha256}))},null,2));
