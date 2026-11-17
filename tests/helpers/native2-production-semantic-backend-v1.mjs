// Test-only M/N metadata transport. Real production semantic code executes
// against the genuine Native2 body. This does not prove M/N qualification.
import * as fs from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {types,isDeepStrictEqual} from 'node:util';
import {runInNewContext} from 'node:vm';
import {assertClassMappingCurrentSourceEpoch,assertClassMappingCurrentSourceIdentity} from '../../tools/class-mapping-current-source-gate-v2.mjs';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {auditUa26MarkerReceipt} from '../../tools/ua26-note-marker-audit.mjs';
import {validateJoUnextractedPriceRegistration} from '../../tools/jo-unextracted-price-registration.mjs';
import {hash as objectHash,loadMonetaryRowIdentityAudit} from '../../tools/monetary-row-identity-audit.mjs';
import {uaSourceHistoricalCaution} from '../../tools/ua-source-handoff-transition.mjs';
import * as registry from '../../tools/class-mapping-report-input-contract-v3.mjs';
export const semanticRepoRoot=resolve(fileURLToPath(new URL('../..',import.meta.url)));
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const readBytes=path=>fs.readFileSync(resolve(semanticRepoRoot,path));
export const readJson=path=>JSON.parse(readBytes(path));
export const ISOLATED_REPORT_QCC=Object.freeze({commit:'f'.repeat(40),tree:'e'.repeat(40),parent:'06d5278d28bc346ca9b7bca11622d6c8b4ec5a5a'});
let native=null;
export function nativeSnapshot(){if(native===null)native=assertClassMappingCurrentSourceEpoch();registry.assertSourceBodyInputHashes(native.inputHashes.sourceBody);return native;}
export function assertNativeBodyUnchanged(){const before=nativeSnapshot(),after=assertClassMappingCurrentSourceIdentity();if(!isDeepStrictEqual(after.summary,before.summary)||!isDeepStrictEqual(after.inputHashes,before.inputHashes))throw Error('Native2 body changed during semantic controls');return after;}
const acornModule={exports:{}};runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{module:acornModule,exports:acornModule.exports});
export function productionModuleSource(path){
 const bytes=readBytes(path),text=bytes.toString('utf8'),ast=acornModule.exports.parse(text,{sourceType:'module',ecmaVersion:'latest'}),edits=[],names=[],importNames=[];
 for(const node of ast.body){if(node.type==='ImportDeclaration'){for(const spec of node.specifiers)importNames.push(spec.local.name);edits.push({start:node.start,end:node.end,text:''});}else if(node.type==='ExportNamedDeclaration'){if(!node.declaration){edits.push({start:node.start,end:node.end,text:''});for(const spec of node.specifiers){names.push(spec.exported.name+':'+spec.local.name);if(node.source)importNames.push(spec.local.name);}}else{edits.push({start:node.start,end:node.declaration.start,text:''});if(node.declaration.id)names.push(node.declaration.id.name);else for(const row of node.declaration.declarations)names.push(row.id.name);}}}
 const meta='('+JSON.stringify({url:pathToFileURL(resolve(semanticRepoRoot,path)).href,filename:resolve(semanticRepoRoot,path),dirname:dirname(resolve(semanticRepoRoot,path))})+')';const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='MetaProperty'&&node.meta?.name==='import'){edits.push({start:node.start,end:node.end,text:meta});return;}for(const value of Object.values(node))if(Array.isArray(value))for(const child of value)visit(child);else if(value&&typeof value==='object')visit(value);};visit(ast);
 let body=text;for(const edit of edits.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start)+edit.text+body.slice(edit.end);return {path,sha256:sha(bytes),text,ast,body,names,importNames:[...new Set(importNames)]};
}
function productionPlainJson(){const source=productionModuleSource('tools/class-mapping-current-consumer-runtime-v2.mjs'),node=source.ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='assertPlainJson');if(!node)throw Error('actual runtime JSON guard missing');return new Function('types','fail','"use strict";return ('+source.text.slice(node.declaration.start,node.declaration.end)+');')(types,message=>{throw Error('Isolated metadata JSON boundary: '+message);});}
export function createSemanticBackend({contractOverrides=new Map(),receiptBytes=null}={}){
 const source=nativeSnapshot(),contracts=new Map(registry.CURRENT_CONSUMER_CONTRACT_PATHS.map(path=>[path,Buffer.from(contractOverrides.get(path)??readBytes(path))]));
 const stage={summary:structuredClone(source.summary),inputs:source.inputs,inputHashes:source.inputHashes,reportQcc:{...ISOLATED_REPORT_QCC},consumerPins:{qualifierCodeCommit:ISOLATED_REPORT_QCC.commit,reportQcc:{...ISOLATED_REPORT_QCC},contractPins:Object.fromEntries([...contracts].map(([p,b])=>[p,sha(b)])),receiptPins:{}}};
 const receipts=new Map();if(receiptBytes!==null)receipts.set(registry.TRANSITION_RECEIPT_PATH,Buffer.from(receiptBytes));
 const assertStage=actual=>{if(actual!==stage)throw Error('isolated metadata stage identity differs');};
 const requireQualificationArtifact=(actual,path)=>{assertStage(actual);const bytes=contracts.get(path);if(!bytes)throw Error('undeclared isolated contract '+path);return {bytes:Buffer.from(bytes),sha256:sha(bytes)};};
 const requireConsumerReceipt=(actual,path)=>{assertStage(actual);const bytes=receipts.get(path);if(!bytes)throw Error('isolated generated receipt missing '+path);return {bytes:Buffer.from(bytes),sha256:sha(bytes)};};
 const sourceBodyReference=(actual,path)=>{assertStage(actual);const expected=stage.inputHashes.sourceBody[path];if(!/^[a-f0-9]{64}$/.test(expected??'')||sha(readBytes(path))!==expected)throw Error('actual Native2 source body reference changed '+path);return {path,sha256:expected};};
 const scope=Object.freeze({genuineNative2Body:true,sourceMapCount:Object.keys(stage.inputHashes.sourceBody).length,metadataBackendIsolated:true,actualReportQualification:false,syntheticReportQcc:true});
 const bindings={...Object.fromEntries(Object.entries(fs).filter(([key])=>key!=='default')),createHash,gunzipSync,resolve,fileURLToPath,isDeepStrictEqual,types,auditUa26MarkerReceipt,validateJoUnextractedPriceRegistration,objectHash,loadMonetaryRowIdentityAudit,uaSourceHistoricalCaution,qualifyCurrentConsumerCodeStage:()=>stage,qualifyCurrentConsumerStage:()=>stage,currentConsumerRepoRoot:semanticRepoRoot,requireQualificationArtifact,requireConsumerReceipt,sourceBodyReference,assertPlainJson:productionPlainJson()};
 return {stage,scope,getImports:()=>({...bindings}),evaluate(path,extraImports={}){const source=productionModuleSource(path),imports={...bindings,...extraImports},names=source.importNames;for(const name of names)if(!Object.hasOwn(imports,name))throw Error('Missing actual production import binding '+name+' in '+path);return new Function(...names,'"use strict";'+source.body+'\nreturn {'+source.names.join(',')+'};')(...names.map(name=>imports[name]));},setReceipt(bytes,path=registry.TRANSITION_RECEIPT_PATH){receipts.set(path,Buffer.from(bytes));stage.consumerPins.receiptPins[path]=sha(bytes);},setContractBytes(path,bytes){if(!contracts.has(path))throw Error('undeclared test contract');contracts.set(path,Buffer.from(bytes));stage.consumerPins.contractPins[path]=sha(bytes);},requireQualificationArtifact,requireConsumerReceipt,sourceBodyReference};
}
export function historicalMmCheckpoint(){
 const source=nativeSnapshot(),raw=createRawGitReader(semanticRepoRoot),path='tests/fixtures/mm-treasure-current-m1-cohort-v1.json',bytes=readBytes(path);
 if(sha(bytes)!=='7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550')throw Error('historical MM fixture changed');
 const fixed=JSON.parse(bytes),commit='0f2d70a135e3ad486152bf00f21387d60a1a97ef',tree='08010faf457df22cdb0a5ec35d2dcf79e622ade9',rows={...fixed.rawInputs,...fixed.selectedAdditionalInputs},files=new Map();
 if(fixed.sourceEpoch.sourceCommit!==commit||fixed.sourceEpoch.sourceTree!==tree||raw.git('rev-parse',commit+'^{tree}').toString('utf8').trim()!==tree)throw Error('historical MM commit/tree changed');
 for(const[path,digest]of Object.entries(rows)){const bytes=raw.git('show',commit+':'+path);if(sha(bytes)!==digest)throw Error('historical MM source21 mismatch '+path);files.set(path,bytes);}if(files.size!==21)throw Error('historical MM source21 denominator');
 const names={data:'dist/data.json',inventory:'research/price-source-inventory.json',manual:'research/field-evidence-bindings.json',mechanics:'research/mechanics-audit-progress.json'},inputs={};
 const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
 for(const[key,path]of Object.entries(names)){inputs[key]=JSON.parse(files.get(path));if(sha(Buffer.from(canonical(inputs[key])))!==fixed.actualCurrentCanonicalSha256[key])throw Error('entire historical MM canonical snapshot changed '+key);}
 const owners=['rules','spells','equipment','classes','matrices'].reduce((n,key)=>n+inputs.data[key].length,inputs.data.progressionExplainer?1:0);raw.assertView();
 return {inputs,summary:{sourceCommit:commit,sourceTree:tree,owners,addedCanonicalBindings:fixed.expectedCounts.addedCanonicalBindings,addedManualBindings:fixed.expectedCounts.addedManualBindings},data:{path:'dist/data.json',sha256:sha(files.get('dist/data.json'))},rawInputs:fixed.rawInputs,additionalInputs:fixed.selectedAdditionalInputs,currentNative2Summary:source.summary};
}
export function sourceHandoffContext(){const source=nativeSnapshot(),raw=createRawGitReader(semanticRepoRoot);raw.assertView();return {baselineData:JSON.parse(raw.git('show','679b15d1c580172e54314829c1c3c86dc78b65f3:dist/data.json')),currentData:source.inputs.data,mechanics:source.inputs.mechanics,conflictReceipt:readJson('research/source-audit-batch5-conflict-integration.json')};}
