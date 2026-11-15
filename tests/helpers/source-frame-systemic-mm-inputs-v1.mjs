// Test-only finite post-source evidence seam. The old MM source manifest and
// all existing historical code/physical-freshness pins remain unchanged.
import {resolve} from 'node:path';
import {readFileSync as readMmFileSync,historicalMmTestRoot,assertHistoricalMmTestStage} from '../../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {absoluteInput,encodingOption} from '../../research/class-mapping-history-v1/mm-replay-io-contract-v1.mjs';
import {readHistoricalMmRoleSupplementV2} from '../../research/class-mapping-history-v1/mm-test-postsource-supplement-v2.mjs';
export {assertHistoricalMmTestStage};
const beforeFixturePath=resolve(historicalMmTestRoot,'tests/fixtures/source-frame-systemic-visual-caller-before.json.gz');
const BEFORE_ROLE='historical-test-evidence-source-frame-systemic-before';
export function readFileSync(input,options){
 const encoding=encodingOption(options),absolute=absoluteInput(input);
 if(absolute!==beforeFixturePath)return readMmFileSync(input,options);
 const bytes=readHistoricalMmRoleSupplementV2(BEFORE_ROLE);
 return encoding&&encoding!=='buffer'?bytes.toString(encoding):Buffer.from(bytes);
}
