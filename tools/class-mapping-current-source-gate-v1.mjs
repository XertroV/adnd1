// Native body API only. Historical MM/H/V29 transport and current metadata
// consumer migration are separate S2 work; no eager legacy reader import.
export {qualifyClassMappingCurrentSourceEpoch as assertClassMappingCurrentSourceEpoch,
  assertClassMappingCurrentSourceIdentity,assertClassMappingCurrentSnapshot} from '../tests/helpers/class-mapping-current-cohort-v1.mjs';
