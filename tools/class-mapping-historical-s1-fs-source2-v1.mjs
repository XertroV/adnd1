// Read-only authenticated historical S1 evidence; no physical-file read fallback.
import {readHistoricalS1FileSync} from './class-mapping-historical-s1-evidence-source2-v1.mjs';
import {realpathSync as nativeRealpathSync} from 'node:fs';
export const readFileSync=readHistoricalS1FileSync;
export const realpathSync=nativeRealpathSync;
const rejectWrite=()=>{throw new Error('Authenticated historical S1 filesystem is read-only');};
export const mkdirSync=rejectWrite;
export const writeFileSync=rejectWrite;
