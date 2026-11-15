// Additive current-source monetary-question entrypoint. It exposes only the
// zero-argument, installed-root successor bound inside the kernel.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {qualifyCurrentConsumerStage} from './class-mapping-current-consumer-runtime-v1.mjs';
import {createCurrentNativeMonetaryQuestionSuccessor} from './class-mapping-current-monetary-question-kernel-v1.mjs';

const api = createCurrentNativeMonetaryQuestionSuccessor();
export const loadCurrentMonetarySourceQuestions = api.loadCurrentMonetarySourceQuestions;
export const validateCurrentMonetarySourceQuestionProjection = api.validateCurrentMonetarySourceQuestionProjection;
export const buildNextNativeMonetaryQuestionProof = api.buildNextNativeMigrationProof;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {summary} = qualifyCurrentConsumerStage();
  const projection = loadCurrentMonetarySourceQuestions();
  validateCurrentMonetarySourceQuestionProjection(projection);
  process.stdout.write(`${JSON.stringify({
    status: 'next-native-source-question-projection-valid-awaiting-general-source-review',
    sourceEpoch: {sourceCommit: summary.sourceCommit, sourceTree: summary.sourceTree},
    questionCounts: projection.questionCounts,
    recordIds: projection.records.map(row => row.id),
    unresolvedQuestionIds: projection.sourceQuestions.map(row => row.id),
    semanticPass: projection.semanticPass,
    generalSourceReviewPending: projection.generalSourceReviewPending,
  })}\n`);
}
