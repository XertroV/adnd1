// Small current-test adapter over the installed Native2 gate. It accepts no root,
// fixture, hash, count, filesystem, or Git overrides and has no historical fallback.
import {qualifyClassMappingCurrentSourceEpoch} from './class-mapping-current-cohort-v2.mjs';

const SOURCE2_STAGE='source2-body-native';
const SOURCE2_COMMIT='400f6e9d123d8a654b9b9af48133a2533506e73d';
const SOURCE2_TREE='664c02504efcece25669d2f9c3fdb26437cd5b09';
const SOURCE2_FIXTURE_PATH='research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json';
const SOURCE2_FIXTURE_SHA256='a333c3920f5ec5d3dbdca4b32673dd22ba94c77807794103af3eb21af71b14c2';
const SOURCE2_DATA_SHA256='16ddcc0ef49ea5ee9ca32b26353edb632d10db160e83bbd464458f5b73c1b573';
function fail(message){throw new Error('Native2 current test cohort: '+message);}
function freezeTree(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;}

export function readCurrentSource2TestCohort(...args){
 if(args.length!==0)fail('installed Source2 adapter accepts no caller overrides');
 const proof=qualifyClassMappingCurrentSourceEpoch(),summary=proof?.summary,hashes=proof?.inputHashes,inputs=proof?.inputs;
 if(!summary||summary.stage!==SOURCE2_STAGE||summary.sourceCommit!==SOURCE2_COMMIT||summary.sourceTree!==SOURCE2_TREE)fail('genuine exact Source2 body identity required');
 if(summary.fixture?.path!==SOURCE2_FIXTURE_PATH||summary.fixture?.sha256!==SOURCE2_FIXTURE_SHA256)fail('fixed Source2 fixture identity required');
 if(Object.hasOwn(summary,'parentCommit')||Object.hasOwn(summary,'s1SourceCommit')||Object.hasOwn(summary,'currentS1Summary'))fail('Source2 identity must retain its own stage semantics');
 if(!inputs?.data||!hashes?.sourceBody||hashes.sourceBody['dist/data.json']!==SOURCE2_DATA_SHA256)fail('current test data must be the exact Source2 source-body snapshot');
 const ownerCount=['rules','spells','equipment','classes','matrices'].reduce((n,key)=>n+(inputs.data[key]||[]).length,inputs.data.progressionExplainer?1:0);
 if(ownerCount!==summary.owners||ownerCount!==1070)fail('fresh Source2 data owner count matches its fixed identity');
 return freezeTree({inputs:structuredClone(inputs),currentSource2Identity:structuredClone(summary),inputHashes:structuredClone(hashes)});
}
