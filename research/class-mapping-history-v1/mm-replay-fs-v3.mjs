// V3 is a finite overlay on the frozen V2 test filesystem: only nine exact
// a29 test-evidence paths are added. All other paths retain V2 behavior.
import * as v2 from './mm-replay-fs-v2.mjs';
import {absoluteInput,relativeInside,encodingOption} from './mm-replay-io-contract-v1.mjs';
import {historicalMmTestRoleSupplementV3Paths,readHistoricalMmRoleSupplementV3} from './mm-test-postsource-supplement-v3.mjs';
const root=v2.historicalMmTestRoot;
const roleByPath=new Map(historicalMmTestRoleSupplementV3Paths.map(({role,path})=>[path,role]));
if(roleByPath.size!==9)throw new Error('Exact nine-role a29 evidence supplement required');
export * from './mm-replay-fs-v2.mjs';
export const historicalMmTestRoot=v2.historicalMmTestRoot;
export const assertHistoricalMmTestStage=v2.assertHistoricalMmTestStage;
export function readFileSync(input,options){
 const absolute=absoluteInput(input),relative=relativeInside(root,absolute),role=relative===null?undefined:roleByPath.get(relative);
 if(!role)return v2.readFileSync(input,options);
 const encoding=encodingOption(options),bytes=readHistoricalMmRoleSupplementV3(role);
 return encoding&&encoding!=='buffer'?bytes.toString(encoding):Buffer.from(bytes);
}
export default Object.freeze({...v2.default,readFileSync});
