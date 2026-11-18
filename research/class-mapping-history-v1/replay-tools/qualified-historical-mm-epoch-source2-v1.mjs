// Qualified admission for the fixed historical-MM checkpoint under genuine current Source2.
// Historical inputs/summary remain historical; currentSource2Summary is separate.
// This is a root-admission adapter, not an alias that passes arguments to the noarg helper.
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {assertCurrentMmSourceEpochSource2} from '../../../tests/helpers/class-mapping-historical-mm-test-inputs-source2-v2.mjs';
const root=realpathSync(resolve(import.meta.dirname,'../../..'));
export function assertQualifiedHistoricalMmSourceEpochSource2(...args){
  if(args.length>1 || (args.length===1 && (typeof args[0]!=='string' || resolve(args[0])!==root || realpathSync(args[0])!==root))) {
    throw new Error('Qualified historical-MM admission requires the fixed physical current Source2 repository root');
  }
  return assertCurrentMmSourceEpochSource2();
}
