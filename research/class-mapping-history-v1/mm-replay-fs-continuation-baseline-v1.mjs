// Finite overlay for the sole missing orthogonal report. All other reads and
// temp/output rules keep the immutable V3 -> V2 -> V1 behavior.
import * as v3 from './mm-replay-fs-v3.mjs';
import {absoluteInput, relativeInside, encodingOption} from './mm-replay-io-contract-v1.mjs';
import {historicalMmContinuationBaselineRoleV1Paths, readHistoricalMmContinuationBaselineRoleV1} from './mm-test-postsource-supplement-continuation-baseline-v1.mjs';

const root = v3.historicalMmTestRoot;
const roleByPath = new Map(historicalMmContinuationBaselineRoleV1Paths().map(({role, path}) => [path, role]));
if (roleByPath.size !== 1) throw new Error('Exact one-role continuation-baseline supplement required');

export * from './mm-replay-fs-v3.mjs';
export const historicalMmTestRoot = v3.historicalMmTestRoot;
export const assertHistoricalMmTestStage = v3.assertHistoricalMmTestStage;

export function readFileSync(input, options) {
  const absolute = absoluteInput(input);
  const relative = relativeInside(root, absolute);
  const role = relative === null ? undefined : roleByPath.get(relative);
  if (!role) return v3.readFileSync(input, options);
  const encoding = encodingOption(options);
  const bytes = readHistoricalMmContinuationBaselineRoleV1(role);
  return encoding && encoding !== 'buffer' ? bytes.toString(encoding) : Buffer.from(bytes);
}

export default Object.freeze({...v3.default, readFileSync});
