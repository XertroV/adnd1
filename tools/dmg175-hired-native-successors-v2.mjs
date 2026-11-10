// Static actual-H adapter; install only with its pinned artifacts below.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createNativeHirelingsJoSuccessor} from './dmg175-hired-native-jo-successor-v2.mjs';
import {createNativeHirelingsSourceHandoffTransition} from './dmg175-hired-native-source-handoff-v2.mjs';

const repoRoot=resolve(import.meta.dirname,'..');
const contractPath='tests/fixtures/hirelings-source-current-cohort-v1.json';
const contractBytes=readFileSync(resolve(repoRoot,contractPath));
const jo=createNativeHirelingsJoSuccessor({contractBytes,contractSha256:'62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f',contractPath,registryPath:'research/hirelings-native-h-v1/jo-current-successor-v1/registration-v1.json',registrySha256:'48ca91aaa230ce4d09c896a225c464969b91adc12d621548c7d9369369f6e509',proofPath:'research/hirelings-native-h-v1/jo-current-successor-v1/equipment-payload-proof-v1.json',proofSha256:'1c5bcf697bba373b70d0337c509b44e990a4e92222550651f2e5b3f4db6dc187',repoRoot});
const handoff=createNativeHirelingsSourceHandoffTransition({contractBytes,contractSha256:'62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f',contractPath,receiptPath:'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json',receiptSha256:'644992717168c73584a4d30084237aa253fcc5f9143b288a41f1ca6ba8bc4575',repoRoot});

export const joPriceRegistrationPath=jo.joPriceRegistrationPath;
export const joPriceRegistrationSha256=jo.joPriceRegistrationSha256;
export const joPayloadProofPath=jo.joPayloadProofPath;
export const joPayloadProofSha256=jo.joPayloadProofSha256;
export const loadJoCurrentSuccessor=jo.loadJoCurrentSuccessor;
export const sourceHandoffTransitionPath=handoff.sourceHandoffTransitionPath;
export const sourceHandoffTransitionSha256=handoff.sourceHandoffTransitionSha256;
export const loadSourceHandoffTransition=handoff.loadSourceHandoffTransition;
export const sourceHandoffContextMatches=handoff.sourceHandoffContextMatches;
export const isQualifiedSourceHistoricalChange=handoff.isQualifiedSourceHistoricalChange;
export const sourceHistoricalCaution=handoff.sourceHistoricalCaution;
export const sourceHandoffTransitionReference=handoff.sourceHandoffTransitionReference;
