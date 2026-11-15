// Lazy installed loader: import is safe while the proposal is unmaterialized.
// There is no caller-selectable fixture, hash, root or synthetic runtime path.
import {createClassMappingCurrentSourceCohort} from './class-mapping-current-cohort-factory-v1.mjs';
let runtime=null;
const installed=()=>runtime ??= createClassMappingCurrentSourceCohort();
export function qualifyClassMappingCurrentSourceEpoch(...args) {
  if(args.length)throw new Error('Installed class mapping loader accepts no caller overrides');
  return installed().qualifyClassMappingCurrentSourceEpoch();
}
export function assertClassMappingCurrentSourceIdentity(...args) {
  if(args.length)throw new Error('Installed class mapping identity gate accepts no caller overrides');
  return installed().assertClassMappingCurrentSourceIdentity();
}
export function assertClassMappingCurrentSnapshot(...args) {
  if(args.length!==1)throw new Error('Installed class mapping snapshot assertion requires exactly one snapshot');
  return installed().assertClassMappingCurrentSnapshot(args[0]);
}
