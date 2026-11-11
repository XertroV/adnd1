// Generated after source-media validation; copy together with the exact fixture and factory.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createMmTreasureCurrentSourceCohort} from './mm-treasure-current-m1-cohort-factory-v1.mjs';
const repoRoot = resolve(process.cwd());
const contractBytes = readFileSync(new URL('../fixtures/mm-treasure-current-m1-cohort-v1.json', import.meta.url));
const reviewedFixtureSha256 = '7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550';
const cohort = createMmTreasureCurrentSourceCohort({repoRoot, contractBytes, expectedContractSha256: reviewedFixtureSha256});
export const readMmTreasureCurrentSourceInputs = cohort.readMmTreasureCurrentSourceInputs;
export const assertMmTreasureCurrentSourceCohort = cohort.assertMmTreasureCurrentSourceCohort;
