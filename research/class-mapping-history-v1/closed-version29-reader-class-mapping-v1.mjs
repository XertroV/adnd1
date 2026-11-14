// Additive historical contract compatibility surface. The MM-named summary
// below is an exact immutable historical-MM replay, never current S1 data.
// The underlying typed reader must be fully materialized before import succeeds.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import * as typed from '../class-mapping-source-epoch-v1/closed-historical-reader-v1.mjs';
export {normalizeVersion29HistoricalBytes,normalizeVersion29HistoricalJson,readVersion29HistoricalFile,readExactHistoricalHPreimageFile,isVersion29HistoricalPath} from '../class-mapping-source-epoch-v1/closed-historical-reader-v1.mjs';
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
export function assertHistoricalHPreimage(...args){
 if(args.length)throw new Error('Historical contract proof accepts no caller overrides');const qualified=typed.assertHistoricalHPreimage();if(qualified.currentS1Summary?.stage!=='s1-body-native'||qualified.currentS1Summary?.sourceCommit!=='2d35138027f00c0740975e519dbb3a2b6df76d14')throw new Error('Qualified current S1 proof must remain separate from historical MM/H summaries');const closed=exactHistoricalMmSummary();
 return freeze({status:'verified-exact-historical-H-preimage; not current-MM data',stage:'historical-MM/H-contract-replay-under-qualified-current-S1',currentS1Summary:structuredClone(qualified.currentS1Summary),currentMmSnapshotCommit:'ac60970626fd5e0421fc4b99c141cc11f53ffff3',mmSourceCommit:closed.summary.sourceCommit,historicalHPreimageCommit:closed.historicalH.fullM1PreimageCommit,historicalHSourceTree:closed.historicalH.sourceTree,historicalHPreimageTree:closed.historicalH.fullM1PreimageTree,currentMmSummary:closed.summary,historicalHSummary:closed.historicalH.historicalSummary,historicalPaths:qualified.historicalPaths,mmChangedPathsRestored:qualified.mmChangedPathsRestored,sourcePdfsCopied:false});
}
