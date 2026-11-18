// Add v10 roster binding; every exact raw O/v9 guard remains active.
import {isDeepStrictEqual} from 'node:util';
import {realpathSync} from 'node:fs';
import {loadSource2MigrationDocument as loadFrozenV9} from './class-mapping-source2-test-roster-v2.mjs';
import {verifySource2OReceiptJoin as verifyFrozenO,assertVerifiedSource2OJoinProof as assertFrozenO,SOURCE2_O_JOIN_PINS} from './class-mapping-source2-o-receipt-join-v1.mjs';
import {readAcceptedSource2V10Manifest,SOURCE2_V10_REPO_ROOT} from './class-mapping-source2-v10-accepted-manifest-v1.mjs';
export {SOURCE2_O_JOIN_PINS};
const verified=new WeakSet(),check=(ok,message)=>{if(!ok)throw Error('Source2 v10 O join: '+message);};
export function verifySource2OReceiptJoin(repositoryRoot,manifestJoin,reportReceipt,manifestSha256){
 check(realpathSync(repositoryRoot)===SOURCE2_V10_REPO_ROOT,'no caller-selected root');
 const closed=readAcceptedSource2V10Manifest(),baseline=loadFrozenV9(SOURCE2_V10_REPO_ROOT);
 check(closed.sha256===manifestSha256,'exact closed v10 manifest');
 check(closed.document.v10Integration?.status==='CLOSED_ACCEPTED_FOR_RUNTIME_QUALIFICATION'&&Array.isArray(closed.document.v10Integration.pending)&&closed.document.v10Integration.pending.length===0,'no pending v10 targets');
 check(isDeepStrictEqual(manifestJoin,closed.document.currentSuiteSemantics.reportOutputJoin)&&isDeepStrictEqual(manifestJoin,baseline.document.currentSuiteSemantics.reportOutputJoin),'unchanged immutable O pins/188 assertions');
 const legacyProof=verifyFrozenO(SOURCE2_V10_REPO_ROOT,baseline.document.currentSuiteSemantics.reportOutputJoin,reportReceipt,baseline.sha256);assertFrozenO(legacyProof);
 const proof=Object.freeze({...legacyProof,manifestSha256:closed.sha256,integrationVersion:10,legacyManifestSha256:baseline.sha256,legacyProof});verified.add(proof);return proof;
}
export function assertVerifiedSource2OJoinProof(proof){check(verified.has(proof),'fresh actual raw-O/v9/v10 proof required');assertFrozenO(proof.legacyProof);return proof;}
export function legacySource2V9OJoinProof(proof){return assertVerifiedSource2OJoinProof(proof).legacyProof;}
