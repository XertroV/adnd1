// Historical-MM replay copy of the exact a29 consumer exports; S1 companions remain separate.
// One current-MM adapter surface for refresh-gaps and unit-provenance consumers.
// Historical H adapters remain separate and unchanged.
export {loadJoCurrentSuccessor, joCurrentMmContractPath, joCurrentMmContractSha256} from './dmg175-current-jo-source-gap-mm-v1.mjs';
export {
  loadSourceHandoffTransition,
  sourceHandoffContextMatches,
  isQualifiedSourceHistoricalChange,
  sourceHistoricalCaution,
  sourceHandoffTransitionReference,
  mmSourceHandoffTransitionPath,
  mmSourceHandoffTransitionSha256,
} from './dmg175-current-source-handoff-mm-v1.mjs';
