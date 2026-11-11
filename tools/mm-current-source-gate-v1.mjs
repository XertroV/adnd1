// Additive gate for current-MM workflows. The strict reader validates the
// closed source fixture, actual worktree bytes, committed Git blobs, ancestry,
// and whole-cohort object/delta invariants before a caller reads current data.
import {
  readMmTreasureCurrentSourceInputs,
  assertMmTreasureCurrentSourceCohort,
} from '../tests/helpers/mm-treasure-current-m1-cohort-v2.mjs';

export const currentMmSourceCommit = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
export const currentMmSourceTree = '08010faf457df22cdb0a5ec35d2dcf79e622ade9';
export const currentMmCohortFixtureSha256 = '7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550';

export function assertCurrentMmSourceEpoch(repoRoot) {
  const inputs = readMmTreasureCurrentSourceInputs(repoRoot);
  const summary = assertMmTreasureCurrentSourceCohort(inputs);
  if (summary.sourceCommit !== currentMmSourceCommit || summary.sourceTree !== currentMmSourceTree) {
    throw new Error('Current MM source cohort differs from its closed final source commit/tree.');
  }
  return {inputs, summary};
}
