// Additive historical contract compatibility surface. The MM-named summary
// below is an exact immutable historical-MM replay, never current S1 data.
// The underlying typed reader must be fully materialized before import succeeds.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as typed from "../class-mapping-source-epoch-v2/closed-historical-reader-source2-v2.mjs";
export {normalizeVersion29HistoricalBytes,normalizeVersion29HistoricalJson,readVersion29HistoricalFile,readExactHistoricalHPreimageFile,isVersion29HistoricalPath} from "../class-mapping-source-epoch-v2/closed-historical-reader-source2-v2.mjs";
const root=resolve(import.meta.dirname,'../..'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
let historicalSummary=null;
function exactHistoricalMmSummary(){
 if(historicalSummary)return structuredClone(historicalSummary);
 const bytes=readFileSync(resolve(root,'tests/fixtures/mm-treasure-current-m1-cohort-v1.json'));if(sha(bytes)!=='7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550')throw new Error('Frozen MM native fixture changed');const fixture=JSON.parse(bytes);
 const snapshots=Object.fromEntries(Object.entries({data:'dist/data.json',inventory:'research/price-source-inventory.json',manual:'research/field-evidence-bindings.json',mechanics:'research/mechanics-audit-progress.json'}).map(([key,path])=>{const value=JSON.parse(typed.readExactHistoricalMmPreimageFile(path));if(sha(Buffer.from(canonical(value)))!==fixture.actualCurrentCanonicalSha256[key])throw new Error('Exact immutable historical-MM whole-state mismatch');return [key,value];}));
 const {data,inventory,manual,mechanics}=snapshots,table=data.rules.find(row=>row.id==='mm-treasure-types-table').table;
 const count=['rules','spells','equipment','classes','matrices'].reduce((n,key)=>n+data[key].length,data.progressionExplainer?1:0);
 const summary={sourceCommit:fixture.sourceEpoch.sourceCommit,sourceTree:fixture.sourceEpoch.sourceTree,owners:count,addedOwners:fixture.mmSource.addedRuleIds.length,canonicalBindings:inventory.fieldEvidenceBindings.length,retainedCanonicalBindings:fixture.expectedCounts.priorCanonicalBindings,addedCanonicalBindings:fixture.expectedCounts.addedCanonicalBindings,manualBindings:manual.bindings.length,addedManualBindings:fixture.expectedCounts.addedManualBindings,tableRows:table.rows.length,tableCells:table.rows.reduce((n,row)=>n+row.cells.length,0),historicalMechanicsReviewRecords:mechanics.reviewRecords.length,mechanicsOwnerRecords:mechanics.records.length,mechanicsFormalFields:mechanics.counts.totalFields,mechanicsUncheckedFields:mechanics.counts.uncheckedFields};
 historicalSummary=freeze({summary,historicalH:fixture.historicalH});return structuredClone(historicalSummary);
}
export function assertHistoricalHPreimageSource2(...args){
 if(args.length)throw new Error('Historical contract proof accepts no caller overrides');
 const qualified=typed.assertHistoricalHPreimageSource2(),summary=qualified.currentSource2Summary;
 if(summary?.stage!=='source2-body-native'||summary.sourceCommit!=='400f6e9d123d8a654b9b9af48133a2533506e73d'||summary.sourceTree!=='664c02504efcece25669d2f9c3fdb26437cd5b09'||Object.hasOwn(summary,'currentS1Summary')||Object.hasOwn(summary,'s1SourceCommit')||Object.hasOwn(summary,'parentCommit'))throw new Error('Genuine current Source2 identity must remain separate from immutable historical S1/MM/H/V29 roles');
 if(qualified.historicalS1SourceCommit!=='2d35138027f00c0740975e519dbb3a2b6df76d14'||qualified.historicalS1SourceTree!=='40ecb15130b339658522794db6d9e1bc58f43b50')throw new Error('Exact historical S1 source identity required separately from current Source2');
 const closed=exactHistoricalMmSummary();
 if(qualified.historicalHCommit!==closed.historicalH.fullM1PreimageCommit)throw new Error('Exact full-M1 historical H identity changed');
 return freeze({status:'verified-exact-historical-H-preimage; not current-MM data',stage:'historical-MM/H-contract-replay-under-qualified-current-Source2',historicalS1Identity:{stage:'immutable-historical-S1-source-identity',sourceCommit:qualified.historicalS1SourceCommit,sourceTree:qualified.historicalS1SourceTree},currentSource2Summary:structuredClone(summary),currentMmSnapshotCommit:'ac60970626fd5e0421fc4b99c141cc11f53ffff3',mmSourceCommit:closed.summary.sourceCommit,historicalHPreimageCommit:closed.historicalH.fullM1PreimageCommit,historicalHSourceTree:closed.historicalH.sourceTree,historicalHPreimageTree:closed.historicalH.fullM1PreimageTree,currentMmSummary:closed.summary,historicalHSummary:closed.historicalH.historicalSummary,historicalPaths:qualified.historicalPaths,mmChangedPathsRestored:qualified.mmChangedPathsRestored,sourcePdfsCopied:false});
}
// Legacy assertion call sites retain the API name with an explicitly Source2 current proof.
export const assertHistoricalHPreimage = assertHistoricalHPreimageSource2;
