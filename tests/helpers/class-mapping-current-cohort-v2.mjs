// Installed Native2 API only. No runtime root/fixture/hash overrides.
import {createClassMappingCurrentSourceCohort} from './class-mapping-current-cohort-factory-v2.mjs';
let runtime=null;
const installed=()=>runtime??=createClassMappingCurrentSourceCohort();
export function qualifyClassMappingCurrentSourceEpoch(...args){if(args.length)throw Error('Installed Native2 loader accepts no caller overrides');return installed().qualifyClassMappingCurrentSourceEpoch();}
export function assertClassMappingCurrentSourceIdentity(...args){if(args.length)throw Error('Installed Native2 identity gate accepts no caller overrides');return installed().assertClassMappingCurrentSourceIdentity();}
export function assertClassMappingCurrentSnapshot(...args){if(args.length!==1)throw Error('Installed Native2 snapshot assertion requires exactly one snapshot');return installed().assertClassMappingCurrentSnapshot(args[0]);}
