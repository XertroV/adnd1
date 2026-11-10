import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadAuditInputs} from './quantity-source-absence-audit.mjs';
import {
 canonical,inputPins,dependencyPins,whaleUnitDeltas,expectedCurrentJoRecord,
 validatePinnedCurrentDocuments,createWhalePerPoundDocuments,
} from '../research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v5/whale-counterfactual-context-v5.mjs';

const actualSourceRoot=__ACTUAL_SOURCE_ROOT__;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const equal=(left,right)=>canonical(left)===canonical(right);
const fail=message=>{throw new Error(`Closed H-native Whale test Jo adapter rejected input: ${message}`);};
const proofPath=repoRoot=>resolve(repoRoot,'whale-counterfactual-context-v5.json');
const actualNative=await import(pathToFileURL(resolve(actualSourceRoot,'tools/dmg175-hired-native-successors-v2.mjs')).href);

export const joPriceRegistrationPath=actualNative.joPriceRegistrationPath;
export const joPriceRegistrationSha256=actualNative.joPriceRegistrationSha256;

function assertNativeJoOutput(result){
 if(result?.itemId!=='ua-jo-stick'||result.sourceAbsence!==false||result.valueReviewed!==false
  ||result.recordSha256!=='25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b'
  ||result.registryRef?.path!=='research/hirelings-native-h-v1/jo-current-successor-v1/registration-v1.json'
  ||result.registryRef?.sha256!=='48ca91aaa230ce4d09c896a225c464969b91adc12d621548c7d9369369f6e509'
  ||result.payloadProof?.path!=='research/hirelings-native-h-v1/jo-current-successor-v1/equipment-payload-proof-v1.json'
  ||result.payloadProof?.sha256!=='1c5bcf697bba373b70d0337c509b44e990a4e92222550651f2e5b3f4db6dc187'
  ||result.payloadProof?.renderedUa28StringFields!==3||result.payloadProof?.ua28NumericCells!==33
  ||result.payloadProof?.joObjectSha256!=='25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b'
  ||result.payloadProof?.joMechanicsGradeSha256!=='f7a6fa1f444cc012f02fe6ee0d92d75ea71ebc3ee1b9e985fdab033cdef01349')
  fail('actual native H Jo registration, grade, or unresolved source state changed');
 return result;
}

export function loadJoCurrentSuccessor({repoRoot=process.cwd(),data,inventory}={}){
 const proof=JSON.parse(readFileSync(proofPath(repoRoot),'utf8'));
 if(proof.schemaVersion!==1||proof.artifactType!=='closed H-native Whale per-pound test context V5; not current input evidence'
  ||!['baseline-positive','whale-per-pound-counterfactual'].includes(proof.mode)
  ||resolve(proof.sourceRoot)!==resolve(actualSourceRoot)
  ||!equal(proof.currentInputPins,inputPins.map(({key,path,sha256})=>({key,path,sha256})))
  ||!equal(proof.dependencyPins,dependencyPins)||!equal(proof.joContextPolicy.joSourceState,{priceState:'unextracted',sourceValueStatus:'not-assessed',unitProvenance:'unassessable',sourcePriceAbsenceReviewed:false,extractedPriceReviewed:false,semanticPass:false,sourceAbsenceProof:false}))
  fail('sidecar source pins, mode, or Jo-state policy changed');
 const baselineDocuments=loadAuditInputs({repoRoot:actualSourceRoot});
 validatePinnedCurrentDocuments(baselineDocuments,{sourceRoot:actualSourceRoot});
 const expectedDocuments=proof.mode==='baseline-positive'?baselineDocuments:createWhalePerPoundDocuments(baselineDocuments);
 const expectedHashes=expectedDocuments.map(({key,path,stage,sha256})=>({key,path,stage,sha256}));
 if(!equal(proof.effectiveInputHashes,expectedHashes)
  ||!equal(proof.exactDeltas,proof.mode==='baseline-positive'?[]:whaleUnitDeltas))fail('effective ten-input set differs from its exact closed mode');
 const baselineData=baselineDocuments.find(doc=>doc.key==='dist').data;
 const baselineInventory=baselineDocuments.find(doc=>doc.key==='canonical').data;
 const expectedAuditInventory=expectedDocuments.find(doc=>doc.key==='canonical').data;
 if(!equal(data,baselineData))fail('only the actual unmodified H distribution data is accepted');
 if(!equal(inventory,expectedAuditInventory))fail('monetary audit inventory differs from the exact input mode');
 // The genuine H loader sees only real source-root files and receives the actual unmutated canonical inventory.
 const actualRegistration=actualNative.loadJoCurrentSuccessor({repoRoot:actualSourceRoot,data:baselineData,inventory:baselineInventory});
 return assertNativeJoOutput(actualRegistration);
}
