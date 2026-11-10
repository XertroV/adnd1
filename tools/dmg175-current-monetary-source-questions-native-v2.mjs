// Proposed file: tools/dmg175-current-monetary-source-questions-native-v2.mjs
// Install only after native-monetary-question-contract-v2.json contains the final
// HIRED source commit/tree/raw pins and finalized cohort contract reference.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMonetaryRowIdentityAudit} from './monetary-row-identity-audit.mjs';
import {createNativeMonetarySourceQuestionSuccessor,currentSourceQuestionRegistryPath as finalContractPath,historicalProjectionBaselinePath as finalBaselinePath,researchContractSha256} from '../research/hirelings-native-h-v1/native-monetary-source-questions-native-v2.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const contractPath = finalContractPath;
const baselinePath = finalBaselinePath;
const contractBytes = readFileSync(resolve(root, contractPath));
const baselineBytes = readFileSync(resolve(root, baselinePath));
const api = createNativeMonetarySourceQuestionSuccessor({
  repoRoot: root,
  contract: JSON.parse(contractBytes),
  contractBytes,
  baseline: JSON.parse(baselineBytes),
  baselineBytes,
  loadAudit: loadMonetaryRowIdentityAudit,
  expectedContractSha256: researchContractSha256,
});

export const currentSourceQuestionRegistryPath = api.currentSourceQuestionRegistryPath;
export const loadCurrentMonetarySourceQuestions = api.loadCurrentMonetarySourceQuestions;
export const validateCurrentMonetarySourceQuestionProjection = api.validateCurrentMonetarySourceQuestionProjection;

export const buildNativeMigrationProof=api.buildNativeMigrationProof;

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.some((arg,index)=>!['--check','--output'].includes(arg)&&args[index-1]!=='--output'))throw Error('Usage: dmg175-current-monetary-source-questions-native-v2.mjs [--check] [--output path]');
  const projection=api.loadCurrentMonetarySourceQuestions();
  api.validateCurrentMonetarySourceQuestionProjection(projection);
  const output=args.indexOf('--output');
  if(output>=0){if(!args[output+1])throw Error('--output requires a path');writeFileSync(resolve(args[output+1]),JSON.stringify(projection,null,2)+'\n');}
  console.log(JSON.stringify({status:'native-source-question-projection-valid-awaiting-review',...projection.questionCounts,semanticPass:projection.semanticPass,generalSourceReviewPending:projection.generalSourceReviewPending}));
}
