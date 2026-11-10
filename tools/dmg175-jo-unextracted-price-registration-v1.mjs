import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';

import {hash as objectHash} from './monetary-row-identity-audit.mjs';
import {validateJoUnextractedPriceRegistration} from './jo-unextracted-price-registration.mjs';

export const joPriceRegistrationPath = 'research/dmg175-validation-coordinator-v1/jo-current-successor-v1/registration-v1.json';
export const joPayloadProofPath = 'research/dmg175-validation-coordinator-v1/jo-current-successor-v1/equipment-payload-proof-v1.json';
export const joPriceRegistrationSha256 = '5fe2b1764a7a4b236d5360f2009be4dc8228ccc533cd575b686f25dd1f987715';
const SOURCE_COMMIT = '987a25d3ba2dcac0940569a2afab73f775e38028';
const SOURCE_TREE = 'd7ac09ce9abe4ef94ae355a44b8e0c5ca6f74ea3';
const BASELINE_COMMIT = '386b08a4678ee033d6daabc0ffa2cc17265a7c1f';
const BASELINE_EQUIPMENT_SHA = '9c831f319a8d58bd3c943c610a89326975f622015b760073217ecf0f7b55e6f7';
const CURRENT_EQUIPMENT_SHA = '714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95';
const UA_SOURCE_SHA = 'e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4';
const LEGACY_REGISTRATION_PATH = 'research/source-audit-batch6-jo-unextracted-price.json';
const LEGACY_REGISTRATION_SHA = '1e24b97d355cf2502a2f775d093652cf37675907aae8ffdc63d432d8908df5f5';
const EXPECTED_FIELDS = [
  {itemId:'phb-hammer', field:'Hurled or missile weapon AC adjustments at short range (UA p.28)', value:'AC 0 through 10: -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, +1'},
  {itemId:'phb-javelin', field:'Hurled or missile weapon AC adjustments at short range (UA p.28)', value:'AC 0 through 10: -7, -6, -5, -4, -3, -2, -1, 0, +1, 0, +1'},
  {itemId:'ua-harpoon', field:'Hurled or missile weapon AC adjustments at short range (UA p.28)', value:'AC 0 through 10: -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, +1'},
];
const EXPECTED_INPUTS = [
  {path:'dist/data.json',sha256:'fd73ee5f535124883e73081cd02c67360b331591cee17ae5278639230b375e0d',role:'assembled data'},
  {path:'dist/books.js',sha256:'99928f8e954ef213a51c70dc97d8f63b16a7b5eea9f1cba10b76b527ec17f811',role:'book metadata'},
  {path:'research/price-source-inventory.json',sha256:'678e1bd62bedc4523b21958825e4d9a205eaa333521ce28ebc506d3983ba96b8',role:'canonical price claims'},
  {path:'research/monetary-source-inventory.json',sha256:'563058d3fff815621cb00f5c38e6c6c1abde40b83a9148795b8989abfbbd1f53',role:'current monetary index'},
  {path:'research/mechanics-audit-progress.json',sha256:'0fe09edf9fe2b37874f3acb4488b439bf5efca2dd2f355107eadb218373c84c6',role:'mechanics grades'},
];
const EXPECTED_EPOCH_PROOFS = [
  {path:'research/source-audit-input-dmg175-source-987a25d3ba2d.json',sha256:'f3449210a281b3c7604847cea39508b0a48d65d8971e569494cc14db1588565e',role:'source commit/tree receipt'},
  {path:'research/source-audit-pass8-dmg175-metadata-independent-review-v1/review.json',sha256:'74fb868a9c0503e163d7edf5032133f5ede4ed46544fbc6acbf209d1e7d7afde',role:'metadata pointer review'},
  {path:'research/source-audit-pass8-dmg175-handoff-epoch-activation-v1.json',sha256:'3960b64fe2fcc715d1ab8751f025be7278a996890237594fd695f6248881ecdc',role:'handoff epoch activation receipt'},
  {path:'research/source-audit-pass8-dmg175-equipment-field-type-qualification-v1.json',sha256:'63ffb0d210fe8d7aa05b99bc001fbc551a29c448a81ce412dff4797c4fc256b1',role:'formal string-field type qualification'},
];
const EXPECTED_JO_SEMANTICS = {
  itemId:'ua-jo-stick',price:null,priceState:'unextracted',sourcePriceAbsenceReviewed:false,
  extractedPriceReviewed:false,semanticPass:false,unitProvenance:'unassessable',sourceAbsenceProof:false,
};
const fail = message => { throw new Error(`Invalid DMG175 Jo unextracted-price successor: ${message}`); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const esc = value => String(value).replace(/~/g,'~0').replace(/\//g,'~1');
function deepDiff(a,b,path='',out=[]) {
  if (Object.is(a,b)) return out;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a)!==Array.isArray(b)) { out.push(path || '/'); return out; }
  const keys = new Set([...Object.keys(a),...Object.keys(b)]);
  for (const key of keys) deepDiff(a[key],b[key],`${path}/${esc(key)}`,out);
  return out;
}
function objectById(payload) {
  if (!Array.isArray(payload?.equipment)) fail('equipment payload is absent');
  const map = new Map(payload.equipment.map(item => [item.id,item]));
  if (map.size !== payload.equipment.length || [...map.keys()].some(id=>typeof id!=='string')) fail('equipment IDs are missing or duplicated');
  return map;
}
function expectedAllowedChanges() {
  return EXPECTED_FIELDS.flatMap(({itemId,field}) => [
    `/equipment/${itemId}/fields/${esc(field)}`,
    `/equipment/${itemId}/fieldSources/${esc(field)}`,
  ]).sort();
}
function cellsFromFieldValue(value) {
  const m = /^AC 0 through 10: (.+)$/.exec(value ?? '');
  if (!m) fail('UA28 adjustment string does not have the registered AC0–10 form');
  const cells = m[1].split(',').map(value => value.trim());
  if (cells.length !== 11 || cells.some(value=>!/^\+?-?\d+$/.test(value))) fail('UA28 adjustment string is not exactly 11 signed cells');
  return cells.map((value,index)=>({column:`AC ${index}`,printed:value,numeric:Number(value)}));
}
function assertFieldSource(item,field) {
  const source=item?.fieldSources?.[field];
  if (!source || source.book!=='UA' || canonical(source.pages)!=='[28]'
    || source.status!=='Candidate source row transcription; target and source-value review pending.'
    || source.verification?.method!=='bounded-source-row-transcription-proposal'
    || source.verification?.regions?.length!==2
    || source.verification?.regions?.[0]!==`ua28-ac-field-${item.id === 'phb-hammer' ? 'phb-hammer' : item.id === 'phb-javelin' ? 'phb-javelin' : 'ua-harpoon'}-v2`
    || source.verification?.regions?.[1]!==`ua28-ac-range-note-${item.id === 'phb-hammer' ? 'phb-hammer' : item.id === 'phb-javelin' ? 'phb-javelin' : 'ua-harpoon'}-v2`
    || !/complete separate passage defining the short-range baseline/.test(source.verification?.coverage ?? ''))
    fail(`UA28 field-source record is not the exact pending candidate for ${item.id}`);
}
function assertProofRecord(registration,proof,currentEquipmentSha,proofSha) {
  const exactKeys=(value,keys)=>value && canonical(Object.keys(value).sort())===canonical([...keys].sort());
  if (!exactKeys(registration,['schemaVersion','artifactType','status','sourceEpoch','legacyRegistration','baselineEquipment','currentEquipment','currentInputs','payloadProof','semantics','scope'])) fail('unexpected successor registry properties');
  if (!exactKeys(registration.sourceEpoch,['sourceCommit','sourceTree','uaSourceSha256','proofs'])
    || !exactKeys(registration.baselineEquipment,['commit','sha256'])
    || !exactKeys(registration.currentEquipment,['path','sha256'])
    || !exactKeys(registration.legacyRegistration,['path','sha256'])
    || !exactKeys(registration.payloadProof,['path','sha256'])) fail('unexpected successor registry metadata properties');
  if (!exactKeys(proof,['schemaVersion','artifactType','status','sourceEpoch','baseline','current','counts','allowedChangedPaths','ua28Rows','ua28Cells','jo'])
    || !exactKeys(proof.sourceEpoch,['sourceCommit','sourceTree','uaSourceSha256'])
    || !exactKeys(proof.baseline,['commit','equipmentSha256'])
    || !exactKeys(proof.current,['equipmentSha256'])
    || !exactKeys(proof.counts,['renderedUa28StringFields','ua28NumericCells','joObjectDiffs','joMechanicsRecordDiffs','wholeEquipmentChangedPaths'])
    || !exactKeys(proof.jo,['equipmentObjectSha256','mechanicsRecordSha256','price','priceState','mechanicsPriceStatus','sourceAbsenceReviewed','extractedPriceReviewed','semanticPass'])) fail('unexpected payload proof properties');
  if (registration.schemaVersion!==1 || registration.artifactType!=='DMG175 exact-source Jo current-payload successor'
    || registration.status!=='research proposal; Jo purchase price remains unextracted and source absence unreviewed') fail('registry type/status changed');
  if (canonical(registration.semantics)!==canonical(EXPECTED_JO_SEMANTICS)
    || registration.scope!=='Validates only the exact current payload epoch and the existing Jo gap. The three UA28 strings remain candidate transcriptions with source-value review pending; this registry does not approve them or infer a printed price absence.') fail('registered Jo source/grade boundary changed');
  if (registration.sourceEpoch?.sourceCommit!==SOURCE_COMMIT || registration.sourceEpoch?.sourceTree!==SOURCE_TREE
    || registration.sourceEpoch?.uaSourceSha256!==UA_SOURCE_SHA) fail('wrong source SHA or source epoch');
  if (registration.baselineEquipment?.commit!==BASELINE_COMMIT || registration.baselineEquipment?.sha256!==BASELINE_EQUIPMENT_SHA
    || registration.currentEquipment?.path!=='equipment.json' || registration.currentEquipment?.sha256!==CURRENT_EQUIPMENT_SHA
    || currentEquipmentSha!==CURRENT_EQUIPMENT_SHA) fail('wrong whole equipment payload baseline/current identity');
  if (registration.legacyRegistration?.path!==LEGACY_REGISTRATION_PATH || registration.legacyRegistration?.sha256!==LEGACY_REGISTRATION_SHA) fail('legacy registration identity changed');
  if (canonical(registration.currentInputs)!==canonical(EXPECTED_INPUTS)) fail('wrong current data/index/mechanics dependency hashes');
  if (canonical(registration.sourceEpoch?.proofs)!==canonical(EXPECTED_EPOCH_PROOFS)) fail('wrong source epoch/proof references');
  if (registration.payloadProof?.path!==joPayloadProofPath || registration.payloadProof?.sha256!==proofSha
    || proof?.artifactType!=='whole equipment payload comparison against SOURCE REF 386b08a'
    || proof?.baseline?.commit!==BASELINE_COMMIT || proof?.baseline?.equipmentSha256!==BASELINE_EQUIPMENT_SHA
    || proof?.current?.equipmentSha256!==CURRENT_EQUIPMENT_SHA || proof?.sourceEpoch?.sourceCommit!==SOURCE_COMMIT
    || proof?.sourceEpoch?.sourceTree!==SOURCE_TREE || proof?.counts?.renderedUa28StringFields!==3
    || proof?.counts?.ua28NumericCells!==33 || proof?.counts?.joObjectDiffs!==0) fail('payload proof is stale or incomplete');
  if (canonical(proof.allowedChangedPaths)!==canonical(expectedAllowedChanges())) fail('payload proof allowed path set changed');
  const proofFields=proof.ua28Rows?.map(row=>({itemId:row.itemId,field:row.field,value:row.value}));
  if (canonical(proofFields)!==canonical(EXPECTED_FIELDS)) fail('payload proof UA28 field values changed');
}

export function validateJoCurrentSuccessor({registration,proof,proofSha,baselineEquipment,currentEquipment,currentEquipmentSha,legacyRegistration,legacyBeforeEquipment,historicalReceipt,data,inventory,baselineMechanicsJo,currentMechanicsJo}) {
  assertProofRecord(registration,proof,currentEquipmentSha,proofSha);
  const before=objectById(baselineEquipment),current=objectById(currentEquipment);
  if (before.size!==current.size || [...before.keys()].some(id=>!current.has(id))) fail('equipment owner universe changed');
  const byId = payload => Object.fromEntries(payload.equipment.map(item=>[item.id,item]));
  const beforePayload={equipment:byId(baselineEquipment)},currentPayload={equipment:byId(currentEquipment)};
  const actualDiff=deepDiff(beforePayload,currentPayload).sort();
  if (canonical(actualDiff)!==canonical(expectedAllowedChanges())) fail('whole equipment payload has an extra or missing changed path');
  const cellRows=[];
  for (const expected of EXPECTED_FIELDS) {
    const item=current.get(expected.itemId),old=before.get(expected.itemId);
    if (old?.fields?.[expected.field]!==undefined || item?.fields?.[expected.field]!==expected.value) fail(`UA28 string field changed outside the exact allowlist: ${expected.itemId}`);
    assertFieldSource(item,expected.field);
    const cells=cellsFromFieldValue(item.fields[expected.field]);
    for (const cell of cells) cellRows.push({itemId:expected.itemId,field:expected.field,...cell});
  }
  if (cellRows.length!==33 || canonical(cellRows)!==canonical(proof.ua28Cells)) fail('separate 33-cell UA28 transcription proof mismatch');
  const oldJo=before.get('ua-jo-stick'),currentJo=current.get('ua-jo-stick');
  if (!oldJo || !currentJo || objectHash(oldJo)!==objectHash(currentJo) || objectHash(currentJo)!==legacyRegistration.owner?.recordSha256)
    fail('Jo equipment value/unit/grade record differs from SOURCE REF 386b08a or the legacy registration');
  if (objectHash(baselineMechanicsJo)!==objectHash(currentMechanicsJo)) fail('Jo mechanics grade changed from SOURCE REF 386b08a');
  if (proof.jo.equipmentObjectSha256!==objectHash(currentJo) || proof.jo.mechanicsRecordSha256!==objectHash(currentMechanicsJo)
    || proof.jo.price!==null || proof.jo.priceState!=='unextracted' || proof.jo.mechanicsPriceStatus!=='not-extracted'
    || proof.jo.sourceAbsenceReviewed!==false || proof.jo.extractedPriceReviewed!==false || proof.jo.semanticPass!==false)
    fail('Jo before/current value or grade proof changed');
  if (data?.equipment?.length!==currentEquipment.equipment.length) fail('dist data equipment denominator differs from equipment.json');
  const dataById=objectById(data);
  const joValueKeys=['id','name','category','book','pages','aliases','price','priceState','priceNote','fields','summary','status','incomplete'];
  const rawJo=current.get('ua-jo-stick'),assembledJo=dataById.get('ua-jo-stick');
  if (!assembledJo || joValueKeys.some(key=>canonical(assembledJo[key])!==canonical(rawJo[key]))) fail('assembled Jo value/unit/grade fields differ from equipment.json');
  for (const expected of EXPECTED_FIELDS) {
    const assembled=dataById.get(expected.itemId);
    if (assembled.fields?.[expected.field]!==expected.value) fail(`assembled UA28 field differs from exact current field for ${expected.itemId}`);
    assertFieldSource(assembled,expected.field);
  }
  const addition=validateJoUnextractedPriceRegistration({registration:legacyRegistration,beforeEquipment:legacyBeforeEquipment,currentEquipment,historicalReceipt,data,inventory});
  return {...addition,registryRef:{path:joPriceRegistrationPath,sha256:registration.registrySha256 ?? null},inputRefs:[],payloadProof:{path:joPayloadProofPath,sha256:registration.payloadProof.sha256,changedPaths:actualDiff,renderedUa28StringFields:3,ua28NumericCells:33,joObjectSha256:objectHash(currentJo),joMechanicsGradeSha256:objectHash(currentMechanicsJo)}};
}

export function loadJoCurrentSuccessor({repoRoot=process.cwd(),data,inventory}={}) {
  const root=resolve(repoRoot),inputRefs=[];
  const readPinned=(ref,compressed=false)=>{
    if (!ref || typeof ref.path!=='string' || ref.path.startsWith('/') || ref.path.includes('\\') || ref.path.split('/').some(part=>!part||part==='.'||part==='..')) fail('non-repository evidence path');
    const bytes=readFileSync(resolve(root,ref.path));
    if (sha(bytes)!==ref.sha256) fail(`stale evidence ${ref.path}`);
    inputRefs.push({path:ref.path,sha256:ref.sha256});
    return compressed?bytes:JSON.parse(bytes);
  };
  const registryBytes=readFileSync(resolve(root,joPriceRegistrationPath)),registration=JSON.parse(registryBytes);
  const registrySha256=sha(registryBytes);
  if (registrySha256!==joPriceRegistrationSha256) fail('successor registry bytes changed');
  const proofBytes=readPinned(registration.payloadProof,true),proofSha=sha(proofBytes),proof=JSON.parse(proofBytes);
  const legacyBytes=readFileSync(resolve(root,LEGACY_REGISTRATION_PATH));
  if (sha(legacyBytes)!==LEGACY_REGISTRATION_SHA) fail('legacy Jo registry bytes changed');
  const legacyRegistration=JSON.parse(legacyBytes);
  const currentBytes=readPinned(registration.currentEquipment,true);
  if (sha(currentBytes)!==CURRENT_EQUIPMENT_SHA) fail('stale evidence equipment.json');
  const currentEquipment=JSON.parse(currentBytes);
  const baselineBytes=execFileSync('git',['-C',root,'show',`${BASELINE_COMMIT}:equipment.json`]);
  if (sha(baselineBytes)!==BASELINE_EQUIPMENT_SHA) fail('SOURCE REF 386b08a equipment payload hash changed');
  const baselineEquipment=JSON.parse(baselineBytes);
  const oldBeforeBytes=readPinned(legacyRegistration.beforeEquipment,true),legacyBeforeEquipment=JSON.parse(gunzipSync(oldBeforeBytes));
  const historicalReceipt=readPinned(legacyRegistration.historicalFourNoteReceipt);
  for (const ref of legacyRegistration.sourceProofs ?? []) readPinned(ref);
  const loadedInputs=new Map();
  for (const ref of EXPECTED_INPUTS) {
    const bytes=readPinned(ref,true);
    loadedInputs.set(ref.path,ref.path.endsWith('.json')?JSON.parse(bytes):bytes);
  }
  const loadedEpochProofs=EXPECTED_EPOCH_PROOFS.map(ref=>readPinned(ref));
  if (loadedEpochProofs[0]?.sourceInput?.commit!==SOURCE_COMMIT || loadedEpochProofs[0]?.sourceInput?.tree!==SOURCE_TREE
    || loadedEpochProofs[1]?.reviewScope?.sourceCommit!==SOURCE_COMMIT || loadedEpochProofs[1]?.reviewScope?.sourceTree!==SOURCE_TREE
    || loadedEpochProofs[1]?.evidence?.sourceData?.privateSourceHashesCheckedWithoutCopyingOrRendering?.find(row=>row.filename==='Unearthed Arcana.pdf')?.sha256!==UA_SOURCE_SHA)
    fail('source epoch receipts do not name the exact source commit and tree');
  const sourceReceipt=loadedEpochProofs[0];
  const mechanicsBeforeBytes=execFileSync('git',['-C',root,'show',`${BASELINE_COMMIT}:research/mechanics-audit-progress.json`],{maxBuffer:12*1024*1024});
  const mechanicsBefore=JSON.parse(mechanicsBeforeBytes),mechanicsCurrent=loadedInputs.get('research/mechanics-audit-progress.json');
  const findJoMechanics=ledger=>ledger.records?.find(record=>record.collection==='equipment'&&record.id==='ua-jo-stick');
  const baselineMechanicsJo=findJoMechanics(mechanicsBefore),currentMechanicsJo=findJoMechanics(mechanicsCurrent);
  if (!baselineMechanicsJo || !currentMechanicsJo) fail('Jo mechanics record is missing');
  const dataBytes=readFileSync(resolve(root,'dist/data.json'));
  if (sha(dataBytes)!==EXPECTED_INPUTS[0].sha256 || !data || objectHash(JSON.parse(dataBytes))!==objectHash(data)) fail('supplied dist data is stale');
  const inventoryBytes=readFileSync(resolve(root,'research/price-source-inventory.json'));
  if (sha(inventoryBytes)!==EXPECTED_INPUTS[2].sha256 || !inventory || objectHash(JSON.parse(inventoryBytes))!==objectHash(inventory)) fail('supplied canonical price inventory is stale');
  const result=validateJoCurrentSuccessor({registration,proof,proofSha,baselineEquipment,currentEquipment,currentEquipmentSha:sha(currentBytes),legacyRegistration,legacyBeforeEquipment,historicalReceipt,data,inventory,baselineMechanicsJo,currentMechanicsJo});
  const refs=[
    {path:joPriceRegistrationPath,sha256:registrySha256},
    {path:LEGACY_REGISTRATION_PATH,sha256:LEGACY_REGISTRATION_SHA},
    ...inputRefs,
    {path:'dist/data.json',sha256:EXPECTED_INPUTS[0].sha256},
    {path:'research/price-source-inventory.json',sha256:EXPECTED_INPUTS[2].sha256},
  ];
  const uniqueRefs=[...new Map(refs.map(ref=>[ref.path,ref])).values()];
  return {...result,registryRef:{path:joPriceRegistrationPath,sha256:registrySha256},inputRefs:uniqueRefs};
}
