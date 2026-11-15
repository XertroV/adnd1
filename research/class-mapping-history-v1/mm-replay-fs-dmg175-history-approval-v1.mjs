// Exact test-only route for the two fixture-declared DMG175 approval references.
// Every other repository read continues through the unchanged V5 -> V1 guards.
import * as v5 from './mm-replay-fs-v5.mjs';
import {absoluteInput, relativeInside, encodingOption} from './mm-replay-io-contract-v1.mjs';
import {historicalDmg175HistoryApprovalPaths, readHistoricalDmg175HistoryApproval} from './mm-test-dmg175-history-approval-v1.mjs';

const root = v5.historicalMmTestRoot;
const roleByPath = new Map(historicalDmg175HistoryApprovalPaths.map(({role, path}) => [path, role]));
if (roleByPath.size !== 2) throw new Error('Exact two-role DMG175 history-approval supplement required');

export * from './mm-replay-fs-v5.mjs';
export const historicalMmTestRoot = v5.historicalMmTestRoot;
export const assertHistoricalMmTestStage = v5.assertHistoricalMmTestStage;

export function readFileSync(input, options) {
  const absolute = absoluteInput(input);
  const relative = relativeInside(root, absolute);
  const role = relative === null ? undefined : roleByPath.get(relative);
  if (!role) return v5.readFileSync(input, options);
  const encoding = encodingOption(options);
  const bytes = readHistoricalDmg175HistoryApproval(role);
  return encoding && encoding !== 'buffer' ? bytes.toString(encoding) : Buffer.from(bytes);
}

export default Object.freeze({...v5.default, readFileSync});
