import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadAuditInputs} from './quantity-source-absence-audit.mjs';
import {
 createWhalePerPoundDocuments,
 validatePinnedCurrentDocuments,
 inputPins,
 whaleUnitDeltas,
 expectedCurrentJoRecord,
} from '../research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/whale-counterfactual-context-v1/v2/whale-counterfactual-context-v2.mjs';

const actualRoot=__ACTUAL_SOURCE_ROOT__;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const equal=(a,b)=>canonical(a)===canonical(b);
const fail=message=>{throw new Error(`Closed Whale counterfactual Jo shim rejected input: ${message}`);};
const proofPath=repoRoot=>resolve(repoRoot,'whale-counterfactual-context-v2.json');
const actualJoModule=await import(pathToFileURL(resolve(actualRoot,'tools/dmg175-jo-unextracted-price-registration-v1.mjs')).href);

export const joPriceRegistrationPath=actualJoModule.joPriceRegistrationPath;
export const joPriceRegistrationSha256=actualJoModule.joPriceRegistrationSha256;

export function loadJoCurrentSuccessor({repoRoot=process.cwd(),data,inventory}={}){
 const proof=JSON.parse(readFileSync(proofPath(repoRoot),'utf8'));
 if(proof.schemaVersion!==1||proof.artifactType!=='closed Whale per-pound test counterfactual; not current input evidence'
  ||resolve(proof.sourceRoot)!==resolve(actualRoot)||!equal(proof.currentInputPins,inputPins.map(({key,path,sha256})=>({key,path,sha256})))
  ||!equal(proof.exactDeltas,whaleUnitDeltas))fail('sidecar provenance or exact four-pointer whitelist changed');
 const baselineDocuments=loadAuditInputs({repoRoot:actualRoot});
 validatePinnedCurrentDocuments(baselineDocuments,{sourceRoot:actualRoot});
 const hypotheticalDocuments=createWhalePerPoundDocuments(baselineDocuments);
 const expectedHashes=hypotheticalDocuments.map(({key,path,stage,sha256})=>({key,path,stage,sha256}));
 if(!equal(proof.hypotheticalInputHashes,expectedHashes))fail('hypothetical hashes do not match exactly the four Whale-unit deltas');
 const canonicalDoc=baselineDocuments.find(doc=>doc.key==='canonical');
 const dataDoc=baselineDocuments.find(doc=>doc.key==='dist');
 const hypotheticalCanonical=hypotheticalDocuments.find(doc=>doc.key==='canonical');
 if(!equal(proof.joRecord,{...expectedCurrentJoRecord,inputSha256:hypotheticalCanonical.sha256})
  ||!equal(proof.joActualLoad,{source:'the actual current Jo successor loader is invoked with original dist/data.json and original price-source-inventory.json',semanticPass:false,sourceAbsence:false,valueReviewed:false}))fail('Jo record/value/grade sidecar changed');
 if(!equal(data,dataDoc.data))fail('Jo grade or source data differs from the actual pinned dist/data.json');
 if(!equal(inventory,hypotheticalCanonical.data))fail('canonical inventory differs from the exact Whale-only counterfactual');
 const actualRegistration=actualJoModule.loadJoCurrentSuccessor({repoRoot:actualRoot,data:dataDoc.data,inventory:canonicalDoc.data});
 if(actualRegistration.itemId!=='ua-jo-stick'||actualRegistration.recordSha256!=='25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b'
  ||actualRegistration.sourceAbsence!==false||actualRegistration.valueReviewed!==false
  ||actualRegistration.registryRef?.path!==joPriceRegistrationPath||actualRegistration.registryRef?.sha256!==joPriceRegistrationSha256
  ||actualRegistration.payloadProof?.sha256!=='c86304b4d91062b2d2fd8d90d7219c540d5e30bc24c77ba416647f20a4677ed8'
  ||actualRegistration.payloadProof?.renderedUa28StringFields!==3||actualRegistration.payloadProof?.ua28NumericCells!==33
  ||actualRegistration.payloadProof?.joObjectSha256!=='25c8c40eab79b1b1dc44fa701e200bbd63b9594596878a82dd8325479451153b'
  ||actualRegistration.payloadProof?.joMechanicsGradeSha256!=='f7a6fa1f444cc012f02fe6ee0d92d75ea71ebc3ee1b9e985fdab033cdef01349')fail('actual Jo registration identity or pending grade changed');
 if(expectedCurrentJoRecord.recordSha256!=='be68e9ff606e5ed998aed58485b4a84eebb8777ddd7638d7f4b89c3190237e85')fail('pinned Jo row identity constant changed');
 return actualRegistration;
}
