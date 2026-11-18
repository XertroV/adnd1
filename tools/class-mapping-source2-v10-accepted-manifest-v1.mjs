// The final artifact is closed/pinned, never supplied by a caller.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {lstatSync,readFileSync,realpathSync} from 'node:fs';
import {resolve,relative} from 'node:path';
export const SOURCE2_V10_REPO_ROOT=realpathSync(resolve(import.meta.dirname,'..'));
export const SOURCE2_V10_MANIFEST_PIN=Object.freeze({"path":"research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v10.json","sha256":"19788578c1f17188f0eb1bf6524572cbb6efa02382dcba5a03ae090fe43e12f3","sizeBytes":3486041,"status":"SEALED_CLOSED_ACCEPTANCE"});
export const SOURCE2_V10_ACCEPTANCE_PIN=Object.freeze({"path":"research/class-mapping-ci-sharding-v1/source2-test-transition-v1/closed-v10-integration-acceptance-v1.json","sha256":"2cfb560c0c36fcf10fe0a124904091691d6efed54b83a3751680bf4036a86c0f","sizeBytes":3486116,"status":"SEALED_CLOSED_ACCEPTANCE"});
export const SOURCE2_V10_BOOTSTRAP_CODE_PATHS=Object.freeze(['tools/class-mapping-source2-v10-accepted-manifest-v1.mjs','tools/class-mapping-source2-test-roster-v3.mjs','tools/class-mapping-source2-o-receipt-join-v2.mjs','tools/class-mapping-source2-runtime-code-authority-v10.mjs','tools/class-mapping-source2-typed-runtime-contract-v1.mjs','tools/class-mapping-source2-test-receipt-core-v3.mjs','tools/class-mapping-source2-test-runner-core-v3.mjs','tools/run-class-mapping-tests-source2-shard-v2.mjs','tools/run-class-mapping-tests-source2-full-v2.mjs','tools/run-historical-mm-replay-source2-receipt-v2.mjs','tools/replay-historical-mm-native-tests-source2-v2.mjs','tools/reduce-class-mapping-test-source2-shards-v2.mjs','tools/class-mapping-source2-test-roster-v2.mjs','tools/class-mapping-source2-o-receipt-join-v1.mjs']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function readFixedV10Pin(pin){
 if(![SOURCE2_V10_MANIFEST_PIN,SOURCE2_V10_ACCEPTANCE_PIN].includes(pin))throw Error('Source2 v10: only installed closed pins accepted');
 if(pin.status!=='SEALED_CLOSED_ACCEPTANCE'||!/^[a-f0-9]{64}$/.test(pin.sha256??'')||!Number.isSafeInteger(pin.sizeBytes)||pin.sizeBytes<1)throw Error('Source2 v10: unsealed acceptance; reject before roster/shard selection');
 const path=resolve(SOURCE2_V10_REPO_ROOT,pin.path),stat=lstatSync(path);if(relative(SOURCE2_V10_REPO_ROOT,path)!==pin.path||!stat.isFile()||stat.isSymbolicLink()||realpathSync(path)!==path)throw Error('Source2 v10: fixed regular nonsymlink artifact required');
 const bytes=readFileSync(path);if(bytes.length!==pin.sizeBytes||sha(bytes)!==pin.sha256)throw Error('Source2 v10: closed artifact bytes differ');return bytes;
}
export function readAcceptedSource2V10Manifest(...args){
 if(args.length)throw Error('Source2 v10: no caller root/path/hash/fixture');
 const accepted=JSON.parse(readFixedV10Pin(SOURCE2_V10_ACCEPTANCE_PIN));
 if(accepted?.status!=='ROOT_ACCEPTED_CLOSED_V10_INTEGRATION'||!Array.isArray(accepted.pending)||accepted.pending.length!==0)throw Error('Source2 v10: closed root acceptance with no pending inputs required');
 const bytes=readFixedV10Pin(SOURCE2_V10_MANIFEST_PIN),document=JSON.parse(bytes);
 if(!accepted.migration||!isDeepStrictEqual(accepted.migration,document))throw Error('Source2 v10: root acceptance migration must equal the exact installed manifest');
 return Object.freeze({document,sha256:sha(bytes),sizeBytes:bytes.length});
}
