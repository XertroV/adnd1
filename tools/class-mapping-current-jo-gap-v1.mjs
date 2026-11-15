// Install-ready successor bytes for the existing next-native Jo adapter path.
// Keep this public entry point zero-argument. Historical and current equipment
// files are deliberately carried in disjoint evidence-reference groups.
import {createHash} from 'node:crypto';
import {constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {
  qualifyCurrentConsumerStage,
  requireQualificationArtifact,
  sourceBodyReference,
  currentConsumerRepoRoot,
} from './class-mapping-current-consumer-runtime-v1.mjs';
import {validateJoUnextractedPriceRegistration} from './jo-unextracted-price-registration.mjs';
import {hash as objectHash} from './monetary-row-identity-audit.mjs';

export const joCurrentNativeContractPath = 'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v2.json';
const semanticParentPath = 'research/mm-current-cli-successors-v1/jo-current-source-gap-mm-v1.json';
const semanticParentSha256 = '81418abaf817005269f87bf000509b04133f3701cd5a4188830119a5a377989b';
const predecessorPath = 'research/class-mapping-current-adapters-v1/jo-current-source-gap-contract-v1.json';
const predecessorSha256 = '88f5fc0fe4e19bbcc171a29f60a465df6c8a7c3b2486a8e56b9277d0d14e96fc';
const expectedBodyRefs = [
  {path:'dist/data.json',sha256:'16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573'},
  {path:'research/price-source-inventory.json',sha256:'b32a8f8126e73b28fd0609fc7e0856990a454402b440735a77627f26fe986564'},
  {path:'research/field-evidence-bindings.json',sha256:'dc8a912cd1054572257e83b654cedb63c8d2d6ff29f327ce0151498b4ad59827'},
  {path:'research/mechanics-audit-progress.json',sha256:'03643330c73dc3fe88f9abeb8a086883a3955d918cba2573e198563631a75785'},
  {path:'equipment.json',sha256:'714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95'},
];
const expectedGapIds = ['phb-bo-stick','phb-club','phb-quarterstaff','phb-sling-stone','ua-jo-stick'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Invalid next-native Jo source-gap adapter: ${message}`); };
const json = bytes => JSON.parse(bytes.toString('utf8'));
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function assertRepoPath(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('\\')
      || path.split('/').some(part => !part || part === '.' || part === '..')) fail(`unsafe evidence path ${path}`);
}
function readFixedFile(path) {
  assertRepoPath(path);
  const absolute = resolve(currentConsumerRepoRoot, path);
  let stat;
  try { stat = lstatSync(absolute); } catch { fail(`required evidence file is missing: ${path}`); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`required evidence path is not a regular file: ${path}`);
  try { if (realpathSync(absolute) !== absolute) fail(`evidence path resolves through a symlink: ${path}`); }
  catch { fail(`evidence path cannot be physically resolved: ${path}`); }
  let fd;
  try { fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW); }
  catch { fail(`evidence path cannot be opened without following a symlink: ${path}`); }
  try {
    if (!fstatSync(fd).isFile()) fail(`opened evidence is not a regular file: ${path}`);
    const bytes = readFileSync(fd);
    if (realpathSync(absolute) !== absolute) fail(`evidence path changed while reading: ${path}`);
    return bytes;
  } finally { closeSync(fd); }
}
function readPinned(ref, label) {
  const bytes = readFixedFile(ref?.path);
  if (sha256(bytes) !== ref?.sha256) fail(`stale ${label}: ${ref?.path}`);
  return bytes;
}
function assertContract(contract, stage) {
  const epoch = contract?.nativeSourceEpochBinding;
  const target = contract?.retainedJoTarget;
  if (contract?.schemaVersion !== 2
      || contract?.artifactType !== 'Next-native class-source Jo unextracted-price successor contract'
      || contract?.status !== 'qualified; Jo null/unextracted gap retained with review pending'
      || contract?.materialized !== true) fail('materialized v2 contract identity');
  if (contract.semanticParent?.path !== semanticParentPath || contract.semanticParent?.sha256 !== semanticParentSha256) {
    fail('frozen MM semantic-parent reference');
  }
  if (contract.predecessor?.path !== predecessorPath || contract.predecessor?.sha256 !== predecessorSha256) {
    fail('frozen native Jo v1 predecessor reference');
  }
  if (epoch?.sourceCommit !== stage.summary.sourceCommit || epoch?.sourceTree !== stage.summary.sourceTree
      || epoch?.fixturePath !== stage.summary.fixture.path || epoch?.fixtureSha256 !== stage.summary.fixture.sha256
      || epoch?.sourceCommit !== '2d35138027f00c0740975e519dbb3a2b6df76d14'
      || epoch?.sourceTree !== '40ecb15130b339658522794db6d9e1bc58f43b50'
      || epoch?.fixturePath !== 'research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json'
      || epoch?.fixtureSha256 !== 'c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10') {
    fail('Jo contract is not bound to the exact qualified S1 source/body fixture');
  }
  if (!same(contract.currentEvidence?.sourceBodyRefs, expectedBodyRefs)
      || contract.currentEvidence?.equipment?.path !== 'equipment.json'
      || contract.currentEvidence?.equipment?.sha256 !== '714d40b9ed9908a069fddc08525d43437c9e974b984572eb1c505c37ee8cae95') {
    fail('exact current S1 source-body ref set / equipment whole-file hash');
  }
  if (target?.collection !== 'equipment' || target?.itemId !== 'ua-jo-stick' || target?.pricePointer !== '/price'
      || target?.registeredCurrentEquipmentRecordSha256 !== '25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b'
      || target?.currentEquipmentRecordSha256 !== target.registeredCurrentEquipmentRecordSha256
      || target?.currentDataRecordSha256 !== '29c21ced8ae35541022b8f11609e7fa89609f0e940825ff78ca89004572524e9'
      || target?.fieldsSha256 !== '9dad9d8be801f4802dc03903980a6353517b111f4edd3c051e38885e69912c6d'
      || target?.fieldCount !== 14
      || target?.currentMechanicsRecordSha256 !== 'f7a6fa1f444cc012f02fe6ee0d92d75ea71ebc3ee1b9e985fdab033cdef01349'
      || target?.currentPriceClaimSha256 !== 'be68e9ff606e5ed998aed58485b4a84eebb8777ddd7638d7f4b89c3190237e85'
      || !same(target?.knownMissingPriceIds, expectedGapIds)
      || target?.requiredState?.price !== null || target?.requiredState?.priceState !== 'unextracted'
      || target?.requiredState?.mechanicsPriceStatus !== 'not-extracted'
      || target?.requiredState?.mechanicsPriceValue !== null
      || target?.requiredState?.mechanicsPriceInspected !== false
      || !same(target?.requiredState?.mechanicsCheckers, [])
      || target?.price !== null || target?.priceState !== 'unextracted'
      || target?.sourcePriceAbsenceReviewed !== false || target?.extractedPriceReviewed !== false
      || target?.unitProvenance !== 'unassessable' || target?.semanticPass !== false) {
    fail('closed Jo target identity, null/unextracted field, or pending grade contract');
  }
}
function readHistoricalWitness(stage, contract) {
  const witness = contract?.historicalWitness;
  const regRef = witness?.legacyRegistration;
  const equipmentRef = witness?.registeredEquipment;
  const beforeRef = witness?.beforeEquipment;
  const receiptRef = witness?.fourNoteReceipt;
  const proofs = witness?.sourceProofs;
  if (!regRef || !equipmentRef?.archive || !beforeRef || !receiptRef || proofs?.length !== 2) fail('complete historical witness refs');
  if (regRef.path !== 'research/source-audit-batch6-jo-unextracted-price.json'
      || regRef.sha256 !== '1e24b97d355cf2502a2f775d093652cf37675907aae8ffdc63d432d8908df5f5'
      || equipmentRef.logicalPath !== 'equipment.json'
      || equipmentRef.sourceCommit !== '386b08a4678ee033d6daabc0ffa2cc17265a7c1f'
      || equipmentRef.sourceTree !== '2611405f3c8ab151936cb0f83ed57334141e1146'
      || equipmentRef.gitBlobSha1 !== '578123f4738abde3331d6eceba51981e948cf31f'
      || equipmentRef.uncompressedSha256 !== '9c831f319a8d58bd3c943c610a89326975f622015b760073217ecf0f7b55e6f7'
      || equipmentRef.archive.path !== 'research/class-mapping-current-adapters-v1/jo-registered-equipment-v1.json.gz'
      || equipmentRef.archive.sha256 !== '06f2f6b02c6a3527644808b2e021e1cd56d18b40ade90a6603a1ace73dd3030b'
      || beforeRef.path !== 'tests/fixtures/equipment-before-jo.json.gz'
      || beforeRef.sha256 !== '0a240c8377fae92b5e811d6218b22ae9cd7d92079b3ca1c6fa47a6d2f8b8ae5e'
      || beforeRef.uncompressedSha256 !== '469c3d6643a209473e1ee5d052ad9e9320d00e69172130b151ada877e3846edf'
      || receiptRef.path !== 'research/source-audit-batch5-null-price-notes.json'
      || receiptRef.sha256 !== 'af5cece0d237b0b70f774ff8254414d4701074121c61f1719487a3f01f96b44b'
      || !same(proofs, [
        {path:'research/source-audit-batch6-jo-mapping-independent-review.json',sha256:'2393845114b9a2b9d29518c8464374b1e7312efd61dfbf68ace17afd4e3ed95c'},
        {path:'research/source-audit-batch6-jo-source-row-proof.json',sha256:'f919798c63d20a69605b7c2ac095acfe7bf9f4ec56ab7b767af3601f93ad2859'},
      ]) || !same(witness.fourHistoricalGapIds, expectedGapIds.slice(0, 4))) fail('fixed historical Jo dependency identities');
  const registrationBytes = readPinned(regRef, 'historical Jo registration');
  const archiveBytes = readPinned(equipmentRef.archive, 'registered historical equipment archive');
  const beforeBytes = readPinned(beforeRef, 'historical before-equipment input');
  const receiptBytes = readPinned(receiptRef, 'four-note receipt');
  const proofBytes = proofs.map(ref => readPinned(ref, 'Jo source proof'));
  const historicalEquipmentBytes = gunzipSync(archiveBytes);
  const beforeEquipmentBytes = gunzipSync(beforeBytes);
  if (sha256(historicalEquipmentBytes) !== equipmentRef.uncompressedSha256
      || historicalEquipmentBytes.length !== equipmentRef.uncompressedBytes
      || sha256(beforeEquipmentBytes) !== beforeRef.uncompressedSha256) fail('historical compressed/uncompressed byte identities');
  const registration = json(registrationBytes);
  const historicalEquipment = json(historicalEquipmentBytes);
  const beforeEquipment = json(beforeEquipmentBytes);
  const receipt = json(receiptBytes);
  const row = historicalEquipment.equipment?.find(item => item.id === 'ua-jo-stick');
  if (registration.currentEquipment?.path !== equipmentRef.logicalPath
      || registration.currentEquipment?.sha256 !== equipmentRef.uncompressedSha256
      || registration.owner?.collection !== 'equipment'
      || registration.owner?.itemId !== 'ua-jo-stick'
      || !row || objectHash(row) !== registration.owner.recordSha256
      || historicalEquipment.equipment.length !== 192
      || beforeEquipment.equipment?.length !== 191
      || beforeEquipment.equipment.some(item => item.id === 'ua-jo-stick')) fail('historical and before-equipment row identities');
  return {
    registration, historicalEquipment, beforeEquipment, receipt,
    historicalEquipmentBytes,
    refs: [
      {path:regRef.path,sha256:regRef.sha256},
      {path:equipmentRef.archive.path,sha256:equipmentRef.archive.sha256},
      {path:beforeRef.path,sha256:beforeRef.sha256},
      {path:receiptRef.path,sha256:receiptRef.sha256},
      ...proofs.map(({path,sha256})=>({path,sha256})),
    ],
    proofRefs: proofs.map(({path,sha256})=>({path,sha256})),
    archivedOriginal: {
      logicalPath:equipmentRef.logicalPath,sourceCommit:equipmentRef.sourceCommit,
      sourceTree:equipmentRef.sourceTree,gitBlobSha1:equipmentRef.gitBlobSha1,
      uncompressedSha256:equipmentRef.uncompressedSha256,
      archivePath:equipmentRef.archive.path,archiveSha256:equipmentRef.archive.sha256,
    },
  };
}

export function loadJoCurrentSuccessor(...args) {
  if (args.length) fail('adapter accepts no caller-selected root, body snapshot, inventory or fixture');
  const stage = qualifyCurrentConsumerStage();
  const contractRef = requireQualificationArtifact(stage, joCurrentNativeContractPath);
  const contract = json(contractRef.bytes);
  assertContract(contract, stage);

  const parentBytes = readFixedFile(semanticParentPath);
  if (sha256(parentBytes) !== semanticParentSha256) fail('frozen MM Jo semantic parent bytes changed');
  const parent = json(parentBytes);
  if (objectHash(contract.historicalEvidence) !== objectHash(parent.historicalEvidence)) {
    fail('v2 historicalEvidence must preserve the parent object byte-semantically');
  }
  const predecessorBytes = readFixedFile(predecessorPath);
  if (sha256(predecessorBytes) !== predecessorSha256) fail('frozen native Jo v1 predecessor bytes changed');

  const historical = readHistoricalWitness(stage, contract);
  const sourceRefs = expectedBodyRefs.map(ref => sourceBodyReference(stage, ref.path));
  if (!same(sourceRefs, expectedBodyRefs)) fail('current S1 source-body refs differ from the closed v2 contract');
  const currentEquipmentBytes = readFixedFile('equipment.json');
  if (sha256(currentEquipmentBytes) !== contract.currentEvidence.equipment.sha256) {
    fail('current equipment whole-file bytes do not match the native S1 reference');
  }
  const currentEquipment = json(currentEquipmentBytes);
  const {data, inventory, mechanics} = stage.inputs;
  const target = contract.retainedJoTarget;
  const inherited = validateJoUnextractedPriceRegistration({
    registration:historical.registration,
    beforeEquipment:historical.beforeEquipment,
    currentEquipment,
    historicalReceipt:historical.receipt,
    data,
    inventory,
  });
  if (inherited.itemId !== target.itemId || inherited.recordSha256 !== target.registeredCurrentEquipmentRecordSha256
      || inherited.sourceAbsence !== false || inherited.valueReviewed !== false) fail('unchanged legacy pure semantic core changed the registered Jo target');

  const rawJo = currentEquipment.equipment?.find(row=>row.id===target.itemId);
  const dataJo = data.equipment?.find(row=>row.id===target.itemId);
  const mechanicsJo = mechanics.records?.find(row=>row.collection==='equipment'&&row.id===target.itemId);
  const priceField = mechanicsJo?.fields?.find(row=>row.path===target.pricePointer);
  const claims = inventory.siteClaims?.filter(row=>row.itemId===target.itemId)||[];
  const allMissing = inventory.siteClaims?.filter(row=>row.missingPrice).map(row=>row.itemId).sort();
  const historicalJo = historical.historicalEquipment.equipment?.find(row=>row.id===target.itemId);
  if (!rawJo || !dataJo || !mechanicsJo || !historicalJo
      || objectHash(historicalJo)!==target.registeredCurrentEquipmentRecordSha256
      || objectHash(rawJo)!==target.currentEquipmentRecordSha256
      || objectHash(dataJo)!==target.currentDataRecordSha256
      || objectHash(historicalJo.fields)!==target.fieldsSha256
      || objectHash(rawJo.fields)!==target.fieldsSha256 || objectHash(dataJo.fields)!==target.fieldsSha256
      || Object.keys(rawJo.fields||{}).length!==target.fieldCount
      || !same(Object.keys(rawJo.fields).sort(),[
        'Approx. weight (PHB p.37)','Approx. weight (UA p.26)',
        'Damage vs Large (PHB p.37)','Damage vs Large (UA p.26)',
        'Damage vs S/M (PHB p.37)','Damage vs S/M (UA p.26)',
        'Hand-held AC adjustments (PHB p.38)','Hand-held AC adjustments (UA p.27)',
        'Length (PHB p.38)','Length (UA p.27)',
        'Space required (PHB p.38)','Space required (UA p.27)',
        'Weapon speed factor (PHB p.38)','Weapon speed factor (UA p.27)',
      ])
      || rawJo.price!==null || dataJo.price!==null
      || rawJo.priceState!=='unextracted' || dataJo.priceState!=='unextracted'
      || Object.hasOwn(rawJo,'suggestedPrice') || Object.hasOwn(dataJo,'suggestedPrice')
      || rawJo.priceNote!==target.priceNote || dataJo.priceNote!==target.priceNote) {
    fail('historical/current Jo authored row, assembled row, and exact fourteen fields');
  }
  if (objectHash(mechanicsJo)!==target.currentMechanicsRecordSha256
      || priceField?.value!==null || priceField?.status!=='not-extracted'
      || priceField?.inspected!==false || !same(priceField?.checkers,[])) fail('current Jo mechanics row remains uninspected and not extracted');
  if (claims.length!==1 || objectHash(claims[0])!==target.currentPriceClaimSha256
      || claims[0].claimType!=='unextracted-price' || claims[0].priceState!=='unextracted'
      || claims[0].printedPrice!==null || claims[0].estimate!==null
      || claims[0].sourcePageReference!==null || claims[0].missingPrice!==true
      || !same(allMissing,expectedGapIds)) fail('one current Jo claim and the exact five-price-gap set');

  const historicalEvidenceRefs = historical.refs;
  const currentSourceRefs = sourceRefs;
  const contractLineageRefs = [
    {path:semanticParentPath,sha256:semanticParentSha256},
    {path:predecessorPath,sha256:predecessorSha256},
  ];
  const registryRef = {path:joCurrentNativeContractPath,sha256:contractRef.sha256};
  const inputRefs = [...historicalEvidenceRefs,...currentSourceRefs,...contractLineageRefs,registryRef]
    .sort((a,b)=>a.path.localeCompare(b.path));
  if (new Set(inputRefs.map(ref=>ref.path)).size!==inputRefs.length) fail('historical/current read paths must remain distinct');
  return {
    ...inherited,
    registryRef,
    inputRefs,
    historicalEvidenceRefs,
    currentSourceRefs,
    contractLineageRefs,
    historicalWitness:historical.archivedOriginal,
    currentSourceEpoch:{sourceCommit:stage.summary.sourceCommit,sourceTree:stage.summary.sourceTree,fixture:stage.summary.fixture},
    sourcePriceAbsenceReviewed:false,
    extractedPriceReviewed:false,
    unitProvenance:'unassessable',
    semanticPass:false,
    payloadProof:{
      itemId:target.itemId,
      currentDataRecordSha256:objectHash(dataJo),
      currentEquipmentRecordSha256:objectHash(rawJo),
      currentMechanicsRecordSha256:objectHash(mechanicsJo),
      sourcePriceAbsenceReviewed:false,
      extractedPriceReviewed:false,
      semanticPass:false,
    },
  };
}
