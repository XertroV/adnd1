// Additive typed-role reader over the immutable MM v1 replay filesystem.
// Only the twelve named metadata/evidence roles gain a read path; all other
// inputs, temp rules, stage checks, and unknown-path failures remain v1.
import * as v1 from './mm-replay-fs-v1.mjs';
import {resolve} from 'node:path';
import {absoluteInput, relativeInside, encodingOption} from './mm-replay-io-contract-v1.mjs';
import {historicalMmRoleSupplementV2Paths, readHistoricalMmRoleSupplementV2} from './mm-test-postsource-supplement-v2.mjs';

const root = v1.historicalMmTestRoot;
const roleByPath = new Map(historicalMmRoleSupplementV2Paths.map(({role, path}) => [path, role]));
if (roleByPath.size !== 12) throw new Error('Exact twelve-role historical-MM supplement required');

export const historicalMmTestRoot = v1.historicalMmTestRoot;
export const assertHistoricalMmTestStage = v1.assertHistoricalMmTestStage;
export const assertHistoricalMmPrivateTempRoot = v1.assertHistoricalMmPrivateTempRoot;
export const authorizeHistoricalMmChildOutputs = v1.authorizeHistoricalMmChildOutputs;
export const existsSync = v1.existsSync;
export const readdirSync = v1.readdirSync;
export const statSync = v1.statSync;
export const lstatSync = v1.lstatSync;
export const realpathSync = v1.realpathSync;
export const mkdtempSync = v1.mkdtempSync;
export const mkdirSync = v1.mkdirSync;
export const writeFileSync = v1.writeFileSync;
export const rmSync = v1.rmSync;
export const unlinkSync = v1.unlinkSync;
export const symlinkSync = v1.symlinkSync;
export const copyFileSync = v1.copyFileSync;
export const renameSync = v1.renameSync;

export function readFileSync(input, options) {
  const absolute = absoluteInput(input);
  const relative = relativeInside(root, absolute);
  const role = relative === null ? undefined : roleByPath.get(relative);
  if (!role) return v1.readFileSync(input, options);
  const encoding = encodingOption(options);
  const bytes = readHistoricalMmRoleSupplementV2(role);
  return encoding && encoding !== 'buffer' ? bytes.toString(encoding) : Buffer.from(bytes);
}

export default Object.freeze({...v1.default, readFileSync});
