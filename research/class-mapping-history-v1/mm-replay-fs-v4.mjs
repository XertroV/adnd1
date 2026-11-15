// Finite V4 overlay: add one exact historical test-code role over immutable V3.
// All other reads, temp rules, stage checks, and unknown-path failures stay V3.
import * as v3 from './mm-replay-fs-v3.mjs';
import {absoluteInput, relativeInside, encodingOption} from './mm-replay-io-contract-v1.mjs';
import {historicalMmTestRoleSupplementV4Paths, readHistoricalMmRoleSupplementV4} from './mm-test-postsource-supplement-v4.mjs';

const root = v3.historicalMmTestRoot;
const roleByPath = new Map(historicalMmTestRoleSupplementV4Paths.map(({role, path}) => [path, role]));
if (roleByPath.size !== 1) throw new Error('Exact one-role historical-MM test-code supplement required');

export * from './mm-replay-fs-v3.mjs';
export const historicalMmTestRoot = v3.historicalMmTestRoot;
export const assertHistoricalMmTestStage = v3.assertHistoricalMmTestStage;

export function readFileSync(input, options) {
  const absolute = absoluteInput(input);
  const relative = relativeInside(root, absolute);
  const role = relative === null ? undefined : roleByPath.get(relative);
  if (!role) return v3.readFileSync(input, options);
  const encoding = encodingOption(options);
  const bytes = readHistoricalMmRoleSupplementV4(role);
  return encoding && encoding !== 'buffer' ? bytes.toString(encoding) : Buffer.from(bytes);
}

export default Object.freeze({...v3.default, readFileSync});
