import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

export const currentToolSha256='ffa7581f9fd6d2c5596880d8f00904dbf93ca504a6a8705965abd3d1f9d8c4a8';
export const currentJoLoaderSha256='d55a94d26be04a7beec2f0e30372daedc293477ff4ad430d6cef067db9527567';
export const joShimTemplateSha256='23094dd833c7879d732d9135826a8d0fe8145f36ba5b543e04516365e1962e27';
export const expectedCurrentJoRecord={
 uid:'site-price-claim:ua-jo-stick',
 input:'research/price-source-inventory.json',
 pointer:'/siteClaims/191',
 recordSha256:'be68e9ff606e5ed998aed58485b4a84eebb8777ddd7638d7f4b89c3190237e85',
 rowIdentitySha256:'4fb44a000bbd0378c43d7d1a5be03610b2364a95b4f0e8502d5c7a19e4ac0547',
 sourceValueSha256ByPointer:{
  '/printedPrice':'74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
  '/priceState':'184fac4333b3e186799bef0a7805b436595ad687589175af9bca713497adfacf',
  '/priceNote':'284d1fa330d65dd42d867350b5053a2b4be3affd18bd19f60eb2e7207f3a0c7c',
  '/missingPrice':'b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b',
 },
};

export const inputPins=[
 {key:'dist',path:'dist/data.json',stage:'current-distribution-catalog',sha256:'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d'},
 {key:'canonical',path:'research/price-source-inventory.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'678e1bd62bedc4523b21958825e4d9a205eaa333521ce28ebc506d3983ba96b8'},
 {key:'ua',path:'research/source-audit-batch5-ua-additional-prices.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'c0012f83c1652ff76e8bee5dbed33a6a663b1a8d6e921251a2be6757f0fe100e'},
 {key:'phbDmg',path:'research/source-audit-batch5-phb-dmg-additional-prices.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'e4cf124385a7e199672ab9268987d5ebf08f64d4cc08819e9e721596bce8c5e6'},
 {key:'passages',path:'research/source-audit-batch5-phb-dmg-price-passage-records.json',stage:'draft-independent-review-pending',sha256:'aab6b6e515179a5773f569aa9a2156522dcce7e10e6fa5a217a1c76a4a158e0d'},
 {key:'descriptions',path:'research/source-audit-batch5-price-description-records.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'d156779ea7184b6d878e52c12ecad52b2ab6bd3c1cf55a8a580771f5cec422ab'},
 {key:'receipts',path:'research/source-audit-batch5-price-discovery-reconciliation.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'4b17762a3a9744af2776802a9913caad4106322e49989ba19b3c13a50adb2e5d'},
 {key:'phbDmgCensus',path:'research/price-source-inventory-phb-dmg-other.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'a6e653a0ee4854e2d28b2cbc8049c60f038d4e8eabbcc822b10b730ef496ae79'},
 {key:'uaCensus',path:'research/price-source-inventory-ua-other.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'f1f797d9e8664589af5308737d9bc9d5e5dd536339349609fbeec5dc2a58c4b9'},
 {key:'monsterCensus',path:'research/price-source-inventory-monster-books.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'c390fdf3343adf55f3827b0e2a7b6dd2b811acae90bfdb57744e84c1a61e2a05'},
];

export const whaleUnitDeltas=[
 {inputKey:'canonical',pointer:'/sourcePageCensuses/2/claims/36/unit'},
 {inputKey:'canonical',pointer:'/sourcePageCensuses/2/sourceArtifact/claims/36/unit'},
 {inputKey:'receipts',pointer:'/claimReceipts/153/typedClaim/unit'},
 {inputKey:'monsterCensus',pointer:'/claims/36/unit'},
].map(row=>({...row,before:null,after:'per pound'}));

const dependencyPins={
 'tools/monetary-unit-provenance-audit.mjs':currentToolSha256,
 'tools/dmg175-jo-unextracted-price-registration-v1.mjs':currentJoLoaderSha256,
 'tools/quantity-source-absence-audit.mjs':'77bf676538e5b64beb8046f921feebef5451376be67c9ad9e635fa1531625b97',
 'tools/monetary-row-identity-audit.mjs':'75dd1b6b1177c848c85b148bb806e6653ab6517979d3c7a3a1946f1021b63276',
 'tools/jo-unextracted-price-registration.mjs':'dc939de98ff9f796f6a1ec910aa8f0fc287508d6fbe5729c824af1ed4046f7c2',
 'tools/monetary-context-extent-contract.mjs':'64838c56e5303a6a63f4ff0e33c3ee2bb15cd445c4fca50c276dc2906af3074d',
 'tools/monetary-source-render-frames.mjs':'44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39',
};

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const clone=value=>structuredClone(value);
const fail=message=>{throw new Error(`Whale per-pound counterfactual rejected: ${message}`);};
const equal=(a,b)=>canonical(a)===canonical(b);

function valueAt(data,pointer){
 let value=data;
 for(const part of pointer.slice(1).split('/').map(item=>item.replace(/~1/g,'/').replace(/~0/g,'~'))){
  if(Array.isArray(value)){if(!/^\d+$/.test(part)||Number(part)>=value.length)return {found:false};value=value[Number(part)];}
  else if(value&&typeof value==='object'&&Object.hasOwn(value,part))value=value[part];
  else return {found:false};
 }
 return {found:true,value};
}
function setAt(data,pointer,value){
 const parts=pointer.slice(1).split('/').map(item=>item.replace(/~1/g,'/').replace(/~0/g,'~'));
 let target=data;
 for(const part of parts.slice(0,-1))target=Array.isArray(target)?target[Number(part)]:target[part];
 target[parts.at(-1)]=value;
}
export function validatePinnedCurrentDocuments(documents,{sourceRoot}={}){
 if(!Array.isArray(documents)||documents.length!==inputPins.length)fail('expected the ten exact current inputs');
 const root=resolve(sourceRoot||process.env.DMG175_WHALE_CONTEXT_SOURCE_ROOT||process.cwd());
 const byKey=new Map(documents.map(doc=>[doc.key,doc]));
 if(byKey.size!==inputPins.length||inputPins.some(pin=>!byKey.has(pin.key)))fail('current input key universe changed');
 for(const pin of inputPins){
  const doc=byKey.get(pin.key),actualBytes=readFileSync(resolve(root,pin.path));
  if(doc.path!==pin.path||doc.stage!==pin.stage||doc.sha256!==pin.sha256||hash(doc.bytes)!==pin.sha256||hash(actualBytes)!==pin.sha256
   ||!Buffer.from(doc.bytes).equals(actualBytes)||!equal(doc.data,JSON.parse(actualBytes.toString('utf8'))))fail(`actual current input pin mismatch: ${pin.path}`);
 }
 for(const [path,expected]of Object.entries(dependencyPins)){
  if(hash(readFileSync(resolve(root,path)))!==expected)fail(`production/dependency byte pin mismatch: ${path}`);
 }
 return {sourceRoot:root,inputCount:documents.length,inputPins:inputPins.map(({key,path,sha256})=>({key,path,sha256})),dependencyPins};
}

export function createWhalePerPoundDocuments(baselineDocuments){
 const documents=baselineDocuments.map(doc=>({...doc,data:clone(doc.data)}));
 const byKey=new Map(documents.map(doc=>[doc.key,doc]));
 for(const row of whaleUnitDeltas){
  const doc=byKey.get(row.inputKey),current=doc&&valueAt(doc.data,row.pointer);
  if(!current?.found||current.value!==null)fail(`expected the actual null baseline at ${row.inputKey}${row.pointer}`);
  setAt(doc.data,row.pointer,row.after);
 }
 for(const key of new Set(whaleUnitDeltas.map(row=>row.inputKey))){
  const doc=byKey.get(key);doc.bytes=Buffer.from(JSON.stringify(doc.data,null,2)+'\n');doc.sha256=hash(doc.bytes);
 }
 return documents;
}

function assertDocumentBytesAndData(actual,expected){
 if(!Array.isArray(actual)||actual.length!==expected.length)fail('counterfactual input count changed');
 for(let index=0;index<expected.length;index++){
  const got=actual[index],want=expected[index];
  if(!equal(Object.keys(got).sort(),Object.keys(want).sort())||got.key!==want.key||got.path!==want.path||got.stage!==want.stage
   ||got.sha256!==want.sha256||!Buffer.from(got.bytes).equals(Buffer.from(want.bytes))||!equal(got.data,want.data))
   fail(`counterfactual contains an extra, missing, or wrong-pointer change at input ${want.key}`);
 }
}

function assertJoRecord(records,expectedCanonicalSha){
 const rows=records.filter(row=>row.uid===expectedCurrentJoRecord.uid);
 if(rows.length!==1)fail('exactly one Jo monetary record is required');
 const jo=rows[0];
 if(jo.input!==expectedCurrentJoRecord.input||jo.pointer!==expectedCurrentJoRecord.pointer
  ||jo.inputSha256!==expectedCanonicalSha||jo.recordSha256!==expectedCurrentJoRecord.recordSha256
  ||jo.rowIdentitySha256!==expectedCurrentJoRecord.rowIdentitySha256
  ||!equal(jo.sourceValueSha256ByPointer,expectedCurrentJoRecord.sourceValueSha256ByPointer)
  ||jo.identityStatus!=='recorded-unverified'||jo.identity?.kind!=='unextracted-price'
  ||jo.identity?.sourceRowIds?.length!==0||jo.source?.book!==null||jo.source?.printedPage!==null
  ||jo.source?.pdfPage!==null||jo.source?.sourceSha256!==null)fail('Jo record identity, value hashes, or unextracted grade changed');
}

export function validateWhaleCounterfactualDocuments({baselineDocuments,documents,records,recordsBuilder,sourceRoot}={}){
 const pins=validatePinnedCurrentDocuments(baselineDocuments,{sourceRoot});
 const expectedDocuments=createWhalePerPoundDocuments(baselineDocuments);
 assertDocumentBytesAndData(documents,expectedDocuments);
 if(typeof recordsBuilder!=='function'||!Array.isArray(records))fail('actual row-identity collector and records are required');
 const expectedCollection=recordsBuilder(new Map(expectedDocuments.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc])));
 const expectedRecords=expectedCollection.records;
 if(!equal(records,expectedRecords))fail('monetary row records differ from the exact four-pointer counterfactual');
 const canonicalDoc=expectedDocuments.find(doc=>doc.key==='canonical');
 assertJoRecord(records,canonicalDoc.sha256);
 return {pins,documents:expectedDocuments,records:expectedRecords};
}

function writeCounterfactualProof(path,validated){
 const proof={
  schemaVersion:1,
  artifactType:'closed Whale per-pound test counterfactual; not current input evidence',
  sourceRoot:validated.pins.sourceRoot,
  currentInputPins:validated.pins.inputPins,
  dependencyPins:validated.pins.dependencyPins,
  exactDeltas:whaleUnitDeltas,
  hypotheticalInputHashes:validated.documents.map(({key,path,stage,sha256})=>({key,path,stage,sha256})),
  joRecord:{...expectedCurrentJoRecord,inputSha256:validated.documents.find(doc=>doc.key==='canonical').sha256},
  joActualLoad:{source:'the actual current Jo successor loader is invoked with original dist/data.json and original price-source-inventory.json',semanticPass:false,sourceAbsence:false,valueReviewed:false},
 };
 writeFileSync(path,JSON.stringify(proof,null,2)+'\n');
 return proof;
}

function materializeLayout({sourceRoot,outputRoot,proofPath}){
 const layoutRoot=resolve(outputRoot,'installed-counterfactual');
 mkdirSync(resolve(layoutRoot,'tools'),{recursive:true});
 mkdirSync(resolve(layoutRoot,'tests'),{recursive:true});
 symlinkSync(resolve(sourceRoot,'research'),resolve(layoutRoot,'research'),'dir');
 symlinkSync(resolve(sourceRoot,'dist'),resolve(layoutRoot,'dist'),'dir');
 symlinkSync(resolve(sourceRoot,'tests/fixtures'),resolve(layoutRoot,'tests/fixtures'),'dir');
 const files=[
  'tools/monetary-unit-provenance-audit.mjs',
  'tools/quantity-source-absence-audit.mjs',
  'tools/monetary-row-identity-audit.mjs',
  'tools/jo-unextracted-price-registration.mjs',
  'tools/monetary-context-extent-contract.mjs',
  'tools/monetary-source-render-frames.mjs',
 ];
 for(const relative of files){
  const bytes=readFileSync(resolve(sourceRoot,relative)),expected=dependencyPins[relative];
  if(hash(bytes)!==expected)fail(`refusing to materialize changed production dependency: ${relative}`);
  writeFileSync(resolve(layoutRoot,relative),bytes);
 }
 const shimTemplateBytes=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'dmg175-jo-test-context-shim-v2.mjs'));
 if(hash(shimTemplateBytes)!==joShimTemplateSha256)fail('test-only Jo shim template bytes changed');
 const shim=shimTemplateBytes.toString('utf8').replaceAll('__ACTUAL_SOURCE_ROOT__',JSON.stringify(sourceRoot));
 if(shim===shimTemplateBytes.toString('utf8'))fail('test-only Jo shim source-root binding was not materialized');
 const materializedShimBytes=Buffer.from(shim);
 writeFileSync(resolve(layoutRoot,'tools/dmg175-jo-unextracted-price-registration-v1.mjs'),materializedShimBytes);
 writeFileSync(resolve(layoutRoot,'whale-counterfactual-context-v2.json'),readFileSync(proofPath));
 if(existsSync(resolve(outputRoot,'.git'))||existsSync(resolve(layoutRoot,'.git')))fail('temporary context must not contain or link a .git directory');
 return {layoutRoot,shimTemplateSha256:hash(shimTemplateBytes),materializedShimSha256:hash(materializedShimBytes)};
}

export async function buildWhalePerPoundCounterfactualReport({documents,records,repoRoot,sourceRepoRoot,onMaterializedContext}={}){
 const sourceRoot=resolve(sourceRepoRoot||process.env.DMG175_WHALE_CONTEXT_SOURCE_ROOT||repoRoot||process.cwd());
 const sourceLoader=await import(pathToFileURL(resolve(sourceRoot,'tools/quantity-source-absence-audit.mjs')).href);
 const rowIdentity=await import(pathToFileURL(resolve(sourceRoot,'tools/monetary-row-identity-audit.mjs')).href);
 const baselineDocuments=sourceLoader.loadAuditInputs({repoRoot:sourceRoot});
 const validated=validateWhaleCounterfactualDocuments({baselineDocuments,documents,records,recordsBuilder:rowIdentity.collectMonetaryRowIdentityRecords,sourceRoot});
 const tempRoot=mkdtempSync(resolve(tmpdir(),'dmg175-whale-counterfactual-v2-'));
 let output;
 try{
  if(existsSync(resolve(tempRoot,'.git')))fail('fresh temporary root unexpectedly contains .git');
  const proofPath=resolve(tempRoot,'whale-counterfactual-context-v2.json');
  const proof=writeCounterfactualProof(proofPath,validated);
  const materialized=materializeLayout({sourceRoot,outputRoot:tempRoot,proofPath});
  const layoutRoot=materialized.layoutRoot;
  const toolBytes=readFileSync(resolve(layoutRoot,'tools/monetary-unit-provenance-audit.mjs'));
  if(hash(toolBytes)!==currentToolSha256)fail('materialized monetary-unit production module is not byte-exact');
  const production=await import(pathToFileURL(resolve(layoutRoot,'tools/monetary-unit-provenance-audit.mjs')).href);
  const report=production.buildMonetaryUnitProvenanceReport({documents:validated.documents,monetaryRecords:validated.records,repoRoot:layoutRoot});
  if(typeof onMaterializedContext==='function')await onMaterializedContext({layoutRoot,joShimPath:resolve(layoutRoot,'tools/dmg175-jo-unextracted-price-registration-v1.mjs'),proof});
  const shimBytes=readFileSync(resolve(layoutRoot,'tools/dmg175-jo-unextracted-price-registration-v1.mjs'));
  output={documents:validated.documents,records:validated.records,report,replay:{temporaryRootCreated:true,temporaryRootRemoved:null,temporaryRootContainsGit:false,productionToolSha256:hash(toolBytes),proofSha256:hash(readFileSync(proofPath)),joShimTemplateSha256:materialized.shimTemplateSha256,materializedJoShimSha256:hash(shimBytes)}};
 }finally{
  rmSync(tempRoot,{recursive:true,force:true});
 }
 output.replay.temporaryRootRemoved=!existsSync(tempRoot);
 if(!output.replay.temporaryRootRemoved)fail('temporary context root remained after report construction');
 return output;
}
