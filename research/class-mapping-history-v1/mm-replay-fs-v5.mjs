// Finite V5 overlay on the unchanged V4 historical-MM reader.
// Exactly 31 inventory-pinned historical reads gain access; all other
// filesystem behavior and unknown-path denials remain in V4/V3/V2/V1.
import * as v4 from './mm-replay-fs-v4.mjs';
import {absoluteInput, relativeInside, encodingOption} from './mm-replay-io-contract-v1.mjs';
import {historicalMmTestRoleSupplementV5Paths, readHistoricalMmRoleSupplementV5} from './mm-test-postsource-supplement-v5.mjs';

const root = v4.historicalMmTestRoot;
const roleByPath = new Map(historicalMmTestRoleSupplementV5Paths.map(({role, path}) => [path, role]));
if (roleByPath.size !== 31) throw new Error('Exact 31-role historical-MM consumer supplement required');

export * from './mm-replay-fs-v4.mjs';
export const historicalMmTestRoot = v4.historicalMmTestRoot;
export const assertHistoricalMmTestStage = v4.assertHistoricalMmTestStage;

export function readFileSync(input, options) {
  const absolute = absoluteInput(input);
  const relative = relativeInside(root, absolute);
  const role = relative === null ? undefined : roleByPath.get(relative);
  if (!role) return v4.readFileSync(input, options);
  const encoding = encodingOption(options);
  const bytes = readHistoricalMmRoleSupplementV5(role);
  return encoding && encoding !== 'buffer' ? bytes.toString(encoding) : Buffer.from(bytes);
}

export default Object.freeze({...v4.default, readFileSync});
