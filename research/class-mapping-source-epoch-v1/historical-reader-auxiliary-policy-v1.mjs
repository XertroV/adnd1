// Finite, reproducible auxiliary policy. It does not project arbitrary JSON.
// Fixed source paths get exact old stage preimages; other admitted files are
// explicitly closed raw contracts/source assets, never unknown-state no-ops.
import {gunzipSync} from 'node:zlib';import {TextDecoder} from 'node:util';import {createHash} from 'node:crypto';
export const HISTORICAL_AUTHORED_READ_PATHS=Object.freeze(['classes.json','attack-matrices.json','phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json','progression-overrides.json','dist/search.js','research/mechanics-audit-progress.md']);
export const DECLARED_REF_ARRAYS=Object.freeze(['qualificationPins','rootEvidence','proofs','historicalJoReceipts','sourceApprovals']);
export const DECLARED_REF_SINGLE=Object.freeze(['supersedes','beforeData','beforeCaltropCatalog','beforeContinuationManifest','beforeEquipment','beforeSourceContracts','beforeCitationOverrides','sourceMetadataReview','continuationRepairReview','searchSourceReview','searchMetricReview','nativeEndpointReceipt','sourceContract','metadataContract']);
const nativeGroups=Object.freeze(['sourceBody','qualificationMetadata','protectedHistorical','installedCode']);
const freshnessGroups=new Set([...nativeGroups,'nativeInstallation','historicalMapped','metadataReport','historicalAuxiliary']);
export function assertNativeEpochIdentity(native,fixtureEpoch){for(const key of ['sourceCommit','sourceTree','parentCommit','parentTree'])if(!/^[a-f0-9]{40}$/.test(native?.[key]||'')||native[key]!==fixtureEpoch?.[key])throw new Error('Bridge native source/direct-parent identity differs from fixed qualified fixture: '+key);}
// A shared path represents one physical state and one raw SHA. Authority is
// directional and fixed by construction order: native maps own their source
// paths; old22 mapping obligations may refer to those same native bytes; report
// proofs may separately require those bytes from QCC/P. No native-to-native,
// reverse-order, or historicalAuxiliary overlap is permitted.
export function assertTypedFreshnessOverlap(existing,incoming){
 if(!existing||!incoming||typeof existing.path!=='string'||existing.path!==incoming.path||!/^[a-f0-9]{64}$/.test(existing.sha256||'')||existing.sha256!==incoming.sha256||!freshnessGroups.has(existing.group)||!freshnessGroups.has(incoming.group))throw new Error('Contradictory typed freshness overlap');
 if(existing.group===incoming.group)return existing.group;
 if(nativeGroups.includes(existing.group)&&incoming.group==='historicalMapped')return existing.group;
 if([...nativeGroups,'nativeInstallation','historicalMapped'].includes(existing.group)&&incoming.group==='metadataReport')return existing.group;
 throw new Error('Conflicting typed freshness group authority: '+existing.group+' -> '+incoming.group);
}
const valid=path=>typeof path==='string'&&!!path&&!path.startsWith('/')&&!path.includes('\\')&&!/[\x00-\x1f\x7f:]/.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!part.startsWith('-'));
export const IMMUTABLE_MM_MANIFEST_PATH='research/class-mapping-history-v1/mm-test-input-manifest-v6.json';
// Replay modules read these exact old Git states through the closed MM facade.
// They are not physical current-state freshness obligations. Other historical
// readers keep the original physical-input closure rule, including same paths.
export function immutableMmInputPaths(codeFiles){const bytes=codeFiles.get(IMMUTABLE_MM_MANIFEST_PATH);if(!bytes)return new Set();const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));if(manifest.schemaVersion!==6||manifest.historicalHeadCommit!=='a29d72d5147c497addd9e46f54ea3f8222f6e9c2'||manifest.historicalHeadTree!=='da1c64ea25f178a1155a79c4692964e9b17dd645'||!Array.isArray(manifest.files)||!Array.isArray(manifest.absentPaths))throw Error('Exact immutable MM manifest identity required');const paths=new Set();for(const row of manifest.files){if(!valid(row?.path)||paths.has(row.path)||!/^[a-f0-9]{64}$/.test(row.sha256||'')||!Number.isSafeInteger(row.sizeBytes)||row.sizeBytes<0)throw Error('Closed unique immutable MM file pins required');paths.add(row.path);}for(const path of manifest.absentPaths){if(!valid(path)||paths.has(path))throw Error('Closed disjoint immutable MM absences required');paths.add(path);}return paths;}
// These are two reviewed non-reading occurrences, never path-wide exclusions.
// Segment arrays describe role declarations without making this policy's own
// declaration look like a runtime file read to the conservative literal scan.
const NON_READING_CODE_LITERALS=Object.freeze([
 Object.freeze({codePath:'tools/dmg175-availability-projection.mjs',codeSha256:'43d711afd6f086caeef99a907901759ce79fb3123060674426da7a303a6c9689',pathParts:Object.freeze(['research','dmg175-current-ua-native-successor-v2','manifest-v2.json']),prefix:'      targetPlanOriginalPath: ',suffix:',',role:'archival-origin-label'}),
 Object.freeze({codePath:['tests','class-mapping-current-report-phase-interface-v1.test.mjs'].join('/'),codeSha256:'16f6709b0d8e0447fca96d54db83d3267901549d778ab83e6477be9558df2970',pathParts:Object.freeze(['research','undeclared-report-input.json']),prefix:' assert.throws(()=>buildClosedReader(rows,read).read(',suffix:'),/outside the closed/);',role:'expected-closed-reader-rejection'}),
]);
function nonReadingCodeLiteral(codePath,codeSha256,text,match){
 const start=text.lastIndexOf('\n',match.index)+1,ending=text.indexOf('\n',match.index),line=text.slice(start,ending<0?text.length:ending);
 return NON_READING_CODE_LITERALS.some(rule=>rule.codePath===codePath&&rule.codeSha256===codeSha256&&rule.pathParts.join('/')===match[1]&&line===rule.prefix+match[0]+rule.suffix);
}
export function literalHistoricalDataPaths(codeFiles){
 const found=new Set(),immutable=immutableMmInputPaths(codeFiles);
 for(const [path,bytes]of codeFiles){
  if(!/\.(?:mjs|js)$/.test(path))continue;
  const text=bytes.toString('utf8'),codeSha256=createHash('sha256').update(bytes).digest('hex');
  const replay=path.startsWith('research/class-mapping-history-v1/replay-tools/')||path.startsWith('research/class-mapping-history-v1/replay-test-helpers/')||/^research\/class-mapping-history-v1\/mm-replay-[a-z-]+-v1\.mjs$/.test(path)||path.startsWith('research/class-mapping-history-v1/replay-kernels/');
  for(const match of text.matchAll(/['"]((?:research|tests|dist)\/[A-Za-z0-9._/-]+\.(?:json|json\.gz|mjs|js|png))['"]/g)){
   if(replay&&immutable.has(match[1]))continue;
   if(!nonReadingCodeLiteral(path,codeSha256,text,match))found.add(match[1]);
  }
 }
 return [...found].sort();
}
function declaredRefs(value){const refs=[];if(!value||typeof value!=='object'||Array.isArray(value))return refs;for(const key of DECLARED_REF_ARRAYS)for(const ref of Array.isArray(value[key])?value[key]:[])if(valid(ref?.path))refs.push(ref.path);for(const key of DECLARED_REF_SINGLE)if(valid(value[key]?.path))refs.push(value[key].path);if(value.upstreamIntegration)refs.push(...declaredRefs(value.upstreamIntegration));return refs;}
export function declaredHistoricalInputClosure({codeFiles,excludedPaths,read}){const excluded=new Set(excludedPaths),queue=literalHistoricalDataPaths(codeFiles).filter(path=>!excluded.has(path)),seen=new Set();let totalParsed=0;while(queue.length){const path=queue.shift();if(seen.has(path)||excluded.has(path))continue;seen.add(path);const bytes=read(path);if(!/\.json(?:\.gz)?$/.test(path))continue;const decoded=path.endsWith('.gz')?gunzipSync(bytes):bytes;totalParsed+=decoded.length;if(decoded.length>128*1024*1024||totalParsed>512*1024*1024)throw new Error('Historical declared metadata parse budget exceeded');const value=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(decoded));for(const ref of declaredRefs(value))if(!excluded.has(ref))queue.push(ref);}return [...seen].sort();}
// Optional report inputs retain their exact verified presence state. An absent
// path is never admitted through a generic optional-file exception.
export function reportOptionalInputStates(receipt){
 const rows=receipt?.qualifierProducer?.optionalReportData;
 if(!Array.isArray(rows))throw new Error('Verified report optional input states required');
 const seen=new Set();return rows.map(row=>{
  if(!valid(row?.path)||seen.has(row.path)||typeof row.present!=='boolean'||row.stage!=='S2-optional-report-data')throw new Error('Exact unique typed optional input state required');
  seen.add(row.path);
  if(row.present?(!/^[a-f0-9]{64}$/.test(row.sha256||'')||!Number.isSafeInteger(row.sizeBytes)||row.sizeBytes<0):(row.sha256!==null||row.sizeBytes!==null))throw new Error('Exact optional input hash/size or null absence required');
  return {path:row.path,present:row.present,sha256:row.sha256,sizeBytes:row.sizeBytes,stage:row.stage};
 });
}
export function reportAbsentInputPaths(receipt){return reportOptionalInputStates(receipt).filter(row=>!row.present).map(row=>row.path).sort();}
export function reportInputReferences(receipt,receiptRef){
 const rows=[];const add=(path,sha256)=>{if(!valid(path)||!/^[a-f0-9]{64}$/.test(sha256||''))throw new Error('Exact report-stage input reference required');rows.push({path,sha256});};
 for(const row of receipt.outputs)add(row.path,row.rawSha256);add(receiptRef.path,receiptRef.sha256);
 for(const row of [...receipt.sourceEpoch.sourceBody.inputs,...receipt.qualifierProducer.codeClosure,...receipt.qualifierProducer.staticAdapterData,...receipt.qualifierProducer.nativeQualificationMetadata,receipt.qualifierProducer.nativeFixture])add(row.path,row.sha256??row.rawSha256);
 for(const row of receipt.qualifierProducer.reportDataPointers){if(!valid(row.sourcePath)||typeof row.pointer!=='string'||!row.pointer.startsWith('/')||row.stage!=='S2-pointer-resolved-report-data')throw new Error('Exact typed pointer-resolved report input required');add(row.path,row.sha256);}
 for(const row of reportOptionalInputStates(receipt))if(row.present)add(row.path,row.sha256);
 for(const row of [receipt.currentConsumer.codeStageSeal,receipt.currentConsumer.materializedSeal,receipt.currentConsumer.currentConsumerPinModule,receipt.currentConsumer.codeStagePinModule,receipt.currentConsumer.materializedPinModule,receipt.currentConsumer.transitionReceipt])add(row.path,row.sha256);
 const absent=new Set(reportAbsentInputPaths(receipt));if(rows.some(row=>absent.has(row.path)))throw new Error('Report input cannot be both present and absent');
 return rows;
}
// Absences are a closed typed set from the verified receipt. Test all three
// real epochs initially; callers recheck physical absence on every read.
export function assertReportAbsenceClosure(receipt,rows,{freshnessCommit,reportCommit,qualifierCommit,hasPhysical,hasGit}){
 const expected=reportAbsentInputPaths(receipt);
 if(!Array.isArray(rows)||rows.length!==expected.length||rows.some((row,index)=>row?.path!==expected[index]||row.group!=='metadataReport'||row.commit!==freshnessCommit||row.reportCommit!==reportCommit||row.qualifierCommit!==qualifierCommit||row.present!==false||row.sha256!==null||row.sizeBytes!==null))throw new Error('Exact report optional-absence closure required');
 for(const row of rows){if(hasPhysical(row.path))throw new Error('Optional report input became physically present: '+row.path);for(const commit of new Set([qualifierCommit,reportCommit,freshnessCommit]))if(hasGit(commit,row.path))throw new Error('Optional report input unexpectedly committed: '+row.path);}
 return rows;
}
