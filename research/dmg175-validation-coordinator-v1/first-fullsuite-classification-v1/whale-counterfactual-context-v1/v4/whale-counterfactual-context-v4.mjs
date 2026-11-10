import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

export const version='v4';
export const joShimTemplateSha256='44f325ae767e9f343d393c95252b75c91984d41d8a90e51216c06feea9fe3c58';
export const inputPins=[
 {key:'dist',path:'dist/data.json',stage:'current-distribution-catalog',sha256:'2cddb11a82ecc3b9d77cb3fa2ae49eef5623a5470ac85a540d1baf483e096a95'},
 {key:'canonical',path:'research/price-source-inventory.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'3073ce4f92e772b91ede42cf111d118acaf4a66e636ebbab064b8085708ff3e6'},
 {key:'ua',path:'research/source-audit-batch5-ua-additional-prices.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'c0012f83c1652ff76e8bee5dbed33a6a663b1a8d6e921251a2be6757f0fe100e'},
 {key:'phbDmg',path:'research/source-audit-batch5-phb-dmg-additional-prices.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'e4cf124385a7e199672ab9268987d5ebf08f64d4cc08819e9e721596bce8c5e6'},
 {key:'passages',path:'research/source-audit-batch5-phb-dmg-price-passage-records.json',stage:'draft-independent-review-pending',sha256:'aab6b6e515179a5773f569aa9a2156522dcce7e10e6fa5a217a1c76a4a158e0d'},
 {key:'descriptions',path:'research/source-audit-batch5-price-description-records.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'d156779ea7184b6d878e52c12ecad52b2ab6bd3c1cf55a8a580771f5cec422ab'},
 {key:'receipts',path:'research/source-audit-batch5-price-discovery-reconciliation.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'4b17762a3a9744af2776802a9913caad4106322e49989ba19b3c13a50adb2e5d'},
 {key:'phbDmgCensus',path:'research/price-source-inventory-phb-dmg-other.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'a6e653a0ee4854e2d28b2cbc8049c60f038d4e8eabbcc822b10b730ef496ae79'},
 {key:'uaCensus',path:'research/price-source-inventory-ua-other.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'f1f797d9e8664589af5308737d9bc9d5e5dd536339349609fbeec5dc2a58c4b9'},
 {key:'monsterCensus',path:'research/price-source-inventory-monster-books.json',stage:'recorded-input-not-certified-by-this-audit',sha256:'c390fdf3343adf55f3827b0e2a7b6dd2b811acae90bfdb57744e84c1a61e2a05'},
];

// These are the complete copied production surface and the relevant source-root H owner chain.
// The actual H loader still validates its own current inputs, contract, registry, proof and ancestry.
export const dependencyPins={
 'tools/monetary-unit-provenance-audit.mjs':'101e1d2faa252132bbeeff42248eff4255603ac0c4a503b31ae3e5f23bb9b47a',
 'tools/quantity-source-absence-audit.mjs':'77bf676538e5b64beb8046f921feebef5451376be67c9ad9e635fa1531625b97',
 'tools/monetary-row-identity-audit.mjs':'75dd1b6b1177c848c85b148bb806e6653ab6517979d3c7a3a1946f1021b63276',
 'tools/jo-unextracted-price-registration.mjs':'dc939de98ff9f796f6a1ec910aa8f0fc287508d6fbe5729c824af1ed4046f7c2',
 'tools/monetary-context-extent-contract.mjs':'64838c56e5303a6a63f4ff0e33c3ee2bb15cd445c4fca50c276dc2906af3074d',
 'tools/monetary-source-render-frames.mjs':'44dc5c4d5233fdf2a8b1a36742712f1b36f69ebcc8d2b6d8208303cdb9b41a39',
 'tools/dmg175-hired-native-successors-v2.mjs':'2e505ec86d6ca30714eed1f6a88b23442f9d4a3808e8402edaccb28624682d65',
 'tools/dmg175-hired-native-jo-successor-v2.mjs':'d813f1196814104e7ec32bdde484f28f036b64f7e750b82a75a32a81156d1dd5',
 'tools/dmg175-hired-native-source-handoff-v2.mjs':'bb138cca91364191b9e5ce9df9f00b3079f800d1ee9a8a1aac2778378b6a7ed8',
 'tools/native-h-epoch-guard-v2.mjs':'88f2232e141dbf7e39786201dcb0e8d59cbd28a3d06b0af4dfe542809ef3f762',
 'tools/dmg175-source-handoff-transition-v1.mjs':'8f246f4fb0e9ed2d970819140c7881f2ccc2e1384219fab0af2a98e4bb81b8be',
 'tools/ua-source-handoff-transition.mjs':'3adfe83ac23945e103c00c0c860d4d741b2ee0af4015db3bb91925d34e544cc2',
 'tools/dmg175-jo-unextracted-price-registration-v1.mjs':'d55a94d26be04a7beec2f0e30372daedc293477ff4ad430d6cef067db9527567',
 'tools/dmg175-current-monetary-source-questions-v1.mjs':'b234e164e14218be1e130554016e51d36dd685bccb18ae40f5bc5c01e7ee0139',
 'tools/dmg175-current-monetary-source-questions-native-v2.mjs':'a34e241f2f61a88f71da403351d46ab893212061b3d958477bbc7f95d97cf86f',
 'tools/monetary-current-source-questions.mjs':'72c9d2b1992ac0960cea8c3e8855a141339142b0ed32bfe194c933491948bc9e',
 'tools/monetary-source-inventory.mjs':'b092d34304d71d145101c559e7a889d9963aa5fb152f5c713f63833076d3457c',
 'tools/monetary-source-geometry.mjs':'a89f9681bf5e9ea24537a444ff5f3cdde0659eef90bd78ac4163b2b2ec2b8274',
 'tests/fixtures/hirelings-source-current-cohort-v1.json':'62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f',
 'research/hirelings-native-h-v1/jo-current-successor-v1/registration-v1.json':'48ca91aaa230ce4d09c896a225c464969b91adc12d621548c7d9369369f6e509',
 'research/hirelings-native-h-v1/jo-current-successor-v1/equipment-payload-proof-v1.json':'1c5bcf697bba373b70d0337c509b44e990a4e92222550651f2e5b3f4db6dc187',
 'research/hirelings-native-h-v1/native-monetary-source-questions-native-v2.mjs':'956b7cb522286d131c7db537acf6c7dccefd19fb9fbb84482f2c9b3478e25d75',
 'research/hirelings-native-h-v1/native-monetary-question-contract-v2.json':'3524eb99e7721b0df2638765da7eaaabd7fe12e496b3c779082b19476ab0629a',
 'research/hirelings-native-h-v1/native-monetary-question-projection-v2.json':'71e4c2f6533f569000486f29962c2a0d6e00201be23a8356f47c9de6fb0e3afc',
 'research/hirelings-current-next-batch-v1/native-monetary-successor-v2/version29-monetary-questions-actual-projection-baseline-v2.json':'c220e9a5d4ef6d53d671df0ecf947fc7f8150a0c71b2dafc610f590e70b3eda6',
 'tools/dmg175-hired-native-jo-successor-v3.mjs':'cd1d28eb8785635e92f39f880064ab347cdeeeb74515b3af9136877108e0e437',
};

export const whaleUnitDeltas=[
 {inputKey:'canonical',pointer:'/sourcePageCensuses/2/claims/36/unit'},
 {inputKey:'canonical',pointer:'/sourcePageCensuses/2/sourceArtifact/claims/36/unit'},
 {inputKey:'receipts',pointer:'/claimReceipts/153/typedClaim/unit'},
 {inputKey:'monsterCensus',pointer:'/claims/36/unit'},
].map(row=>({...row,before:null,after:'per pound'}));

export const expectedCurrentJoRecord={
 uid:'site-price-claim:ua-jo-stick',input:'research/price-source-inventory.json',pointer:'/siteClaims/191',
 recordSha256:'be68e9ff606e5ed998aed58485b4a84eebb8777ddd7638d7f4b89c3190237e85',
 rowIdentitySha256:'4fb44a000bbd0378c43d7d1a5be03610b2364a95b4f0e8502d5c7a19e4ac0547',
 sourceValueSha256ByPointer:{
  '/printedPrice':'74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
  '/priceState':'184fac4333b3e186799bef0a7805b436595ad687589175af9bca713497adfacf',
  '/priceNote':'284d1fa330d65dd42d867350b5053a2b4be3affd18bd19f60eb2e7207f3a0c7c',
  '/missingPrice':'b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b',
 },
};

const copiedFiles=[
 'tools/monetary-unit-provenance-audit.mjs',
 'tools/quantity-source-absence-audit.mjs',
 'tools/monetary-row-identity-audit.mjs',
 'tools/jo-unextracted-price-registration.mjs',
 'tools/monetary-context-extent-contract.mjs',
 'tools/monetary-source-render-frames.mjs',
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function assertPrototypeRoot(){
 if(Object.getPrototypeOf(Array.prototype)!==Object.prototype||Object.getPrototypeOf(Object.prototype)!==null
  ||Object.hasOwn(Array.prototype,'toJSON')||Object.hasOwn(Object.prototype,'toJSON'))
  fail('unexpected Array/Object prototype chain or toJSON hook before canonicalization');
}
export function assertOrdinaryJsonTree(value,label='JSON value'){
 assertPrototypeRoot();
 const visit=(node,pointer)=>{
  if(Array.isArray(node)){
   if(Object.getPrototypeOf(node)!==Array.prototype)fail(`non-standard array prototype before hashing at ${label}${pointer}`);
   for(let index=0;index<node.length;index++)visit(node[index],`${pointer}/${index}`);
   return;
  }
  if(node!==null&&typeof node==='object'){
   const prototype=Object.getPrototypeOf(node);
   if(prototype!==Object.prototype&&prototype!==null)fail(`non-standard object prototype before hashing at ${label}${pointer}`);
   for(const key of Object.keys(node))visit(node[key],`${pointer}/${key.replaceAll('~','~0').replaceAll('/','~1')}`);
  }
 };
 visit(value,'');
 return true;
}
export const canonical=value=>{
 assertPrototypeRoot();
 if(Array.isArray(value)){
  if(Object.getPrototypeOf(value)!==Array.prototype)fail('non-standard array prototype before canonicalization');
  const rows=[];for(let index=0;index<value.length;index++)rows.push(canonical(value[index]));
  return `[${rows.join(',')}]`;
 }
 if(value!==null&&typeof value==='object'){
  const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==null)fail('non-standard object prototype before canonicalization');
  const rows=[];for(const key of Object.keys(value).sort())rows.push(`${JSON.stringify(key)}:${canonical(value[key])}`);
  return `{${rows.join(',')}}`;
 }
 return JSON.stringify(value);
};
const equal=(left,right)=>canonical(left)===canonical(right);
const clone=value=>structuredClone(value);
const fail=message=>{throw new Error(`Whale per-pound counterfactual V4 rejected: ${message}`);};

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
function recalculate(doc){doc.bytes=Buffer.from(JSON.stringify(doc.data,null,2)+'\n');doc.sha256=hash(doc.bytes);}

export function validatePinnedCurrentDocuments(documents,{sourceRoot}={}){
 assertPrototypeRoot();
 if(!Array.isArray(documents)||documents.length!==inputPins.length)fail('expected the ten exact current H inputs');
 if(Object.getPrototypeOf(documents)!==Array.prototype)fail('non-standard document-list prototype before input pin validation');
 for(let index=0;index<documents.length;index++)assertOrdinaryJsonTree(documents[index]?.data,`document:${documents[index]?.key||index}`);
 const root=resolve(sourceRoot||process.env.DMG175_WHALE_CONTEXT_SOURCE_ROOT||process.cwd());
 const byKey=new Map(documents.map(doc=>[doc.key,doc]));
 if(byKey.size!==inputPins.length||inputPins.some(pin=>!byKey.has(pin.key)))fail('current input key universe changed');
 for(const pin of inputPins){
  const doc=byKey.get(pin.key),raw=readFileSync(resolve(root,pin.path));
  if(doc.path!==pin.path||doc.stage!==pin.stage||doc.sha256!==pin.sha256||hash(doc.bytes)!==pin.sha256||hash(raw)!==pin.sha256
   ||!Buffer.from(doc.bytes).equals(raw)||!equal(doc.data,JSON.parse(raw.toString('utf8'))))fail(`actual current H input pin mismatch: ${pin.path}`);
 }
 for(const [path,expected]of Object.entries(dependencyPins))if(hash(readFileSync(resolve(root,path)))!==expected)fail(`production/H dependency byte pin mismatch: ${path}`);
 return {sourceRoot:root,inputCount:documents.length,inputPins:inputPins.map(({key,path,sha256})=>({key,path,sha256})),dependencyPins};
}

export function createWhalePerPoundDocuments(baselineDocuments){
 assertPrototypeRoot();
 if(!Array.isArray(baselineDocuments)||Object.getPrototypeOf(baselineDocuments)!==Array.prototype)fail('non-standard baseline document-list prototype');
 for(let index=0;index<baselineDocuments.length;index++)assertOrdinaryJsonTree(baselineDocuments[index]?.data,`baseline:${baselineDocuments[index]?.key||index}`);
 const documents=baselineDocuments.map(doc=>({...doc,bytes:Buffer.from(doc.bytes),data:clone(doc.data)}));
 const byKey=new Map(documents.map(doc=>[doc.key,doc]));
 for(const row of whaleUnitDeltas){
  const doc=byKey.get(row.inputKey),current=doc&&valueAt(doc.data,row.pointer);
  if(!current?.found||current.value!==row.before)fail(`expected exact H preimage null at ${row.inputKey}${row.pointer}`);
  setAt(doc.data,row.pointer,row.after);
 }
 for(const key of new Set(whaleUnitDeltas.map(row=>row.inputKey)))recalculate(byKey.get(key));
 return documents;
}

function assertDocumentBytesAndData(actual,expected){
 if(!Array.isArray(actual)||actual.length!==expected.length)fail('counterfactual input count changed');
 for(let index=0;index<expected.length;index++){
  const got=actual[index],want=expected[index];
  if(!equal(Object.keys(got).sort(),Object.keys(want).sort())||got.key!==want.key||got.path!==want.path||got.stage!==want.stage
   ||got.sha256!==want.sha256||!Buffer.from(got.bytes).equals(Buffer.from(want.bytes))||!equal(got.data,want.data))
   fail(`counterfactual includes a missing, extra, or wrong-pointer/value change in ${want.key}`);
 }
}
function assertJoRecord(records,canonicalSha256){
 const rows=records.filter(row=>row.uid===expectedCurrentJoRecord.uid);
 if(rows.length!==1)fail('exactly one current Jo monetary record is required');
 const jo=rows[0];
 if(jo.input!==expectedCurrentJoRecord.input||jo.pointer!==expectedCurrentJoRecord.pointer||jo.inputSha256!==canonicalSha256
  ||jo.recordSha256!==expectedCurrentJoRecord.recordSha256||jo.rowIdentitySha256!==expectedCurrentJoRecord.rowIdentitySha256
  ||!equal(jo.sourceValueSha256ByPointer,expectedCurrentJoRecord.sourceValueSha256ByPointer)
  ||jo.identityStatus!=='recorded-unverified'||jo.identity?.kind!=='unextracted-price'||jo.identity?.sourceRowIds?.length!==0
  ||jo.source?.book!==null||jo.source?.printedPage!==null||jo.source?.pdfPage!==null||jo.source?.sourceSha256!==null)
  fail('Jo monetary record or source-unknown identity changed');
}

export function validateWhaleCounterfactualDocuments({baselineDocuments,documents,records,recordsBuilder,sourceRoot}={}){
 const pins=validatePinnedCurrentDocuments(baselineDocuments,{sourceRoot});
 const expectedDocuments=createWhalePerPoundDocuments(baselineDocuments);
 assertDocumentBytesAndData(documents,expectedDocuments);
 if(typeof recordsBuilder!=='function'||!Array.isArray(records))fail('actual current row-identity collector and records are required');
 const expectedRecords=recordsBuilder(new Map(expectedDocuments.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records;
 if(!equal(records,expectedRecords))fail('monetary row records differ from the exact four-pointer counterfactual');
 assertJoRecord(records,expectedDocuments.find(doc=>doc.key==='canonical').sha256);
 return {pins,documents:expectedDocuments,records:expectedRecords};
}

export function validateCurrentBaselineDocuments({documents,records,recordsBuilder,sourceRoot}={}){
 const pins=validatePinnedCurrentDocuments(documents,{sourceRoot});
 if(typeof recordsBuilder!=='function'||!Array.isArray(records))fail('actual current row-identity collector and records are required');
 const expectedRecords=recordsBuilder(new Map(documents.filter(doc=>doc.key!=='dist').map(doc=>[doc.key,doc]))).records;
 if(!equal(records,expectedRecords))fail('current baseline row records differ from the exact current H collection');
 assertJoRecord(records,documents.find(doc=>doc.key==='canonical').sha256);
 return {pins,documents,records:expectedRecords};
}

function reportJoState(report){
 const jo=report?.joUnitAdmission;
 if(!jo||jo.record?.uid!==expectedCurrentJoRecord.uid||jo.record?.recordSha256!==expectedCurrentJoRecord.recordSha256
  ||jo.record?.rowIdentitySha256!==expectedCurrentJoRecord.rowIdentitySha256||jo.record?.inputPath!==expectedCurrentJoRecord.input
  ||jo.record?.jsonPointer!==expectedCurrentJoRecord.pointer||jo.record?.matchedUnitQuantityFields?.length!==0
  ||jo.sourceState?.priceState!=='unextracted'||jo.sourceState?.sourceValueStatus!=='not-assessed'
  ||jo.sourceState?.unitProvenance!=='unassessable'||jo.sourceState?.sourcePriceAbsenceReviewed!==false
  ||jo.sourceState?.extractedPriceReviewed!==false||jo.sourceState?.semanticPass!==false||jo.sourceState?.sourceAbsenceProof!==false
  ||jo.registration?.path!=='research/hirelings-native-h-v1/jo-current-successor-v1/registration-v1.json'
  ||jo.registration?.sha256!=='48ca91aaa230ce4d09c896a225c464969b91adc12d621548c7d9369369f6e509')
  fail('Jo state was promoted or no longer matches native H');
 return jo;
}
function normalizedJo(jo){
 const {inputSha256,...stableRecord}=jo.record;
 return {status:jo.status,historicalRecordCount:jo.historicalRecordCount,currentRecordCount:jo.currentRecordCount,
  additionalRecordUids:jo.additionalRecordUids,record:stableRecord,registration:jo.registration,sourceState:jo.sourceState,beforeCapture:jo.beforeCapture};
}
function assertCounterfactualReport(report,{documents,records,baselineReport}={}){
 const ambergris=report?.sourceWitnesses?.whaleAmbergris;
 if(ambergris?.currentState?.currentState!=='unrecognized-current-value'||ambergris.currentState.sourceAbsenceProof!==false
  ||ambergris.classification!=='editorial'||ambergris.proposedCorrection?.sourceAbsenceProof!==false)
  fail('Whale counterfactual state or source-absence boundary changed');
 if(ambergris.pointerValues.length!==4||ambergris.pointerValues.some(row=>row.valueSha256!=='41c5c233324cd9ffb757fe16ae635712afaa00c6721fd333a0c632a7d0a919b4'))
  fail('all four Whale witness pointers must contain exactly “per pound”');
 for(const ref of whaleUnitDeltas){
  const field=report.fieldRows.find(row=>row.inputKey===ref.inputKey&&row.jsonPointer===ref.pointer);
  if(!field||field.classification!=='missing-provenance'||field.curatedCaseId!==null)
   fail(`changed Whale unit was auto-curated or not classified missing-provenance at ${ref.inputKey}${ref.pointer}`);
 }
 if(report.scope?.monetaryRowIdentityRecordCount!==2162||report.monetaryRecordInventory?.length!==2162
  ||new Set(records.map(row=>row.uid)).size!==2162)fail('the complete current 2,162-record universe was not retained');
 const jo=reportJoState(report);
 if(jo.record.inputSha256!==documents.find(doc=>doc.key==='canonical').sha256)fail('Jo record does not bind the actual counterfactual canonical input hash');
 if(baselineReport){
  const baselineJo=reportJoState(baselineReport);
  if(!equal(normalizedJo(jo),normalizedJo(baselineJo)))fail('Jo output changed beyond the expected canonical-input hash binding');
  if(jo.record.inputSha256===baselineJo.record.inputSha256)fail('counterfactual canonical input hash was not reflected in the Jo record binding');
 }
 return jo;
}

function proofFor({mode,pins,documents,shimTemplateHash,sourceRoot}){
 return {
  schemaVersion:1,artifactType:'closed H-native Whale per-pound test context V4; not current input evidence',mode,
  sourceRoot,sourceEpoch:{sourceCommit:'bc819621e49788260bb34ea47c1f7a8b35af6edf',sourceTree:'e6bc420f70656825a926297b959bc6d98758bfcd'},
  currentInputPins:pins.inputPins,dependencyPins:pins.dependencyPins,
  exactDeltas:mode==='whale-per-pound-counterfactual'?whaleUnitDeltas:[],
  effectiveInputHashes:documents.map(({key,path,stage,sha256})=>({key,path,stage,sha256})),
  joContextPolicy:{
   actualHLoader:'production tools/dmg175-hired-native-successors-v2.mjs loaded from sourceRoot at its final pinned SHA; exact source-root H guards remain active',
   actualJoGuard:'production tools/dmg175-hired-native-jo-successor-v3.mjs loaded through the pinned production adapter',
   sourceData:'actual unmodified dist/data.json',
   sourceCanonicalInventory:'actual unmodified research/price-source-inventory.json',
   counterfactualCanonicalUse:'synthetic canonical inventory is passed only to the real monetary audit; the native Jo loader receives the pinned current baseline inventory',
   joSourceState:{priceState:'unextracted',sourceValueStatus:'not-assessed',unitProvenance:'unassessable',sourcePriceAbsenceReviewed:false,extractedPriceReviewed:false,semanticPass:false,sourceAbsenceProof:false},
  },
  joShimTemplateSha256:shimTemplateHash,
  temporaryContext:{gitDirectoryPresentOrLinked:false,proofExistsOnlyDuringBuild:true,cleanup:'rmSync in finally; existence checked before return'},
 };
}

function materializeLayout({sourceRoot,outputRoot,proof}){
 const layoutRoot=resolve(outputRoot,'installed');
 mkdirSync(resolve(layoutRoot,'tools'),{recursive:true});mkdirSync(resolve(layoutRoot,'tests'),{recursive:true});
 symlinkSync(resolve(sourceRoot,'research'),resolve(layoutRoot,'research'),'dir');
 symlinkSync(resolve(sourceRoot,'dist'),resolve(layoutRoot,'dist'),'dir');
 symlinkSync(resolve(sourceRoot,'tests/fixtures'),resolve(layoutRoot,'tests/fixtures'),'dir');
 for(const relative of copiedFiles){
  const raw=readFileSync(resolve(sourceRoot,relative)),expected=dependencyPins[relative];
  if(hash(raw)!==expected)fail(`refusing to copy changed production module ${relative}`);
  writeFileSync(resolve(layoutRoot,relative),raw,{flag:'wx'});
 }
 const templatePath=resolve(dirname(fileURLToPath(import.meta.url)),'dmg175-h-native-jo-test-context-shim-v4.mjs');
 const templateBytes=readFileSync(templatePath),templateHash=hash(templateBytes);
 if(templateHash!==joShimTemplateSha256)fail('raw H-native Jo shim template bytes changed');
 const template=templateBytes.toString('utf8'),materialized=template.replaceAll('__ACTUAL_SOURCE_ROOT__',JSON.stringify(sourceRoot));
 if(materialized===template)fail('actual H source root was not bound into the temp-only shim');
 writeFileSync(resolve(layoutRoot,'tools/dmg175-hired-native-successors-v2.mjs'),materialized,{flag:'wx'});
 writeFileSync(resolve(layoutRoot,'whale-counterfactual-context-v4.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
 if(existsSync(resolve(outputRoot,'.git'))||existsSync(resolve(layoutRoot,'.git')))fail('temporary context must not contain or link a .git directory');
 return {layoutRoot,shimTemplateSha256:templateHash,materializedShimSha256:hash(Buffer.from(materialized))};
}

async function buildInTemporaryLayout({mode,documents,records,recordsBuilder,sourceRoot,pins}){
 const temporaryRoot=mkdtempSync(resolve(tmpdir(),'dmg175-whale-counterfactual-v4-'));
 let result;
 try{
  if(existsSync(resolve(temporaryRoot,'.git')))fail('fresh temporary root unexpectedly contains .git');
  const expected=mode==='baseline-positive'
   ?validateCurrentBaselineDocuments({documents,records,recordsBuilder,sourceRoot})
   :validateWhaleCounterfactualDocuments({baselineDocuments:pins.baselineDocuments,documents,records,recordsBuilder,sourceRoot});
  const templatePath=resolve(dirname(fileURLToPath(import.meta.url)),'dmg175-h-native-jo-test-context-shim-v4.mjs');
  const proof=proofFor({mode,pins:expected.pins,documents:expected.documents,shimTemplateHash:hash(readFileSync(templatePath)),sourceRoot});
  const materialized=materializeLayout({sourceRoot,outputRoot:temporaryRoot,proof});
  const production=await import(pathToFileURL(resolve(materialized.layoutRoot,'tools/monetary-unit-provenance-audit.mjs')).href);
  const report=production.buildMonetaryUnitProvenanceReport({documents:expected.documents,monetaryRecords:expected.records,repoRoot:materialized.layoutRoot});
  production.validateMonetaryUnitProvenanceReport(report,{documents:expected.documents,records:expected.records,repoRoot:materialized.layoutRoot});
  if(existsSync(resolve(materialized.layoutRoot,'whale-counterfactual-context-v4.json'))===false)fail('temp Jo adapter did not consume its closed proof context');
  result={report,proof,layout:{temporaryRootCreated:true,temporaryRootRemoved:null,temporaryRootContainsGit:false,
   productionToolSha256:dependencyPins['tools/monetary-unit-provenance-audit.mjs'],shimTemplateSha256:materialized.shimTemplateSha256,
   materializedShimSha256:materialized.materializedShimSha256}};
 }finally{rmSync(temporaryRoot,{recursive:true,force:true});}
 result.layout.temporaryRootRemoved=!existsSync(temporaryRoot);
 if(!result.layout.temporaryRootRemoved)fail('temporary test context remained after report construction');
 return result;
}

export async function buildCurrentBaselineContextReport({documents,records,recordsBuilder,sourceRoot}={}){
 if(typeof recordsBuilder!=='function')fail('current row-identity collector is required');
 const root=resolve(sourceRoot||process.env.DMG175_WHALE_CONTEXT_SOURCE_ROOT||process.cwd());
 const baseline=validateCurrentBaselineDocuments({documents,records,recordsBuilder,sourceRoot:root});
 return buildInTemporaryLayout({mode:'baseline-positive',documents:baseline.documents,records:baseline.records,recordsBuilder,sourceRoot:root,pins:{...baseline,baselineDocuments:baseline.documents}});
}

export async function buildWhalePerPoundCounterfactualReport({documents,records,recordsBuilder,repoRoot,sourceRepoRoot}={}){
 const sourceRoot=resolve(sourceRepoRoot||process.env.DMG175_WHALE_CONTEXT_SOURCE_ROOT||repoRoot||process.cwd());
 const baselineModule=await import(pathToFileURL(resolve(sourceRoot,'tools/quantity-source-absence-audit.mjs')).href);
 const rowIdentity=recordsBuilder?null:await import(pathToFileURL(resolve(sourceRoot,'tools/monetary-row-identity-audit.mjs')).href);
 const rowBuilder=recordsBuilder||rowIdentity.collectMonetaryRowIdentityRecords;
 if(typeof rowBuilder!=='function')fail('current row-identity collector is required');
 const baselineDocuments=baselineModule.loadAuditInputs({repoRoot:sourceRoot});
 const expected=validateWhaleCounterfactualDocuments({baselineDocuments,documents,records,recordsBuilder:rowBuilder,sourceRoot});
 const built=await buildInTemporaryLayout({mode:'whale-per-pound-counterfactual',documents:expected.documents,records:expected.records,recordsBuilder:rowBuilder,
  sourceRoot,pins:{...expected,baselineDocuments}});
 assertCounterfactualReport(built.report,{documents:expected.documents,records:expected.records});
 return {...built,documents:expected.documents,records:expected.records};
}

export function validateCounterfactualReport(report,{documents,records,baselineReport}={}){
 assertCounterfactualReport(report,{documents,records,baselineReport});
 return true;
}

export {assertCounterfactualReport as assertWhaleCounterfactualReport};
