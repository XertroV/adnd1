#!/usr/bin/env node
// Additive full assembly. The fixed S1 assembler and all2636 body inputs stay
// exact. Reproduce the entire precoverage prefix in memory, then publish only
// the independently committed and reproduced current coverage projection.
import {readFileSync,lstatSync,realpathSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {CORE_OUTPUTS,PUBLIC_COVERAGE_PATH,safeRepoPath,sha256,assertCoreReproduction,buildClosedReader,selectCoverageReports,assertCoverageReproduction} from './class-mapping-assembly-core-v1.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
function physical(path){const absolute=resolve(root,safeRepoPath(path)),stat=lstatSync(absolute);if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(absolute)!==absolute)throw new Error('Physical regular nonsymlink assembly input required');return readFileSync(absolute);}
function atomicCoverage(bytes){const directory=resolve(root,'dist');if(realpathSync(directory)!==directory||!lstatSync(directory).isDirectory())throw new Error('Physical dist directory required');const target=resolve(root,PUBLIC_COVERAGE_PATH);try{const stat=lstatSync(target);if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(target)!==target)throw new Error('Physical coverage output required');}catch(error){if(error.code!=='ENOENT')throw error;}const temporary=resolve(directory,`.class-mapping-coverage-${randomUUID()}.tmp`);try{writeFileSync(temporary,bytes,{flag:'wx',mode:0o644});renameSync(temporary,target);}finally{try{unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}}
export async function assembleClassMapping(...args){
 if(args.length)throw new Error('Installed assembly accepts no caller root, pins or inputs');
 if(realpathSync(process.cwd())!==realpathSync(root))throw new Error('Run assembly from its physical repository root');
 // Defer all S2-dependent imports until invoked; --help is safe preinstallation.
 const [{assertClassMappingCurrentSourceEpoch},{verifyCurrentConsumerMaterializedStageSeal},{verifyCommittedClassMappingReportReceipt},{SOURCE_SCAN_LEGACY_ALIAS,CURRENT_REPORT_LEGACY_ALIASES,REPORT_RECEIPT_PATH},{loadProductionReadOnly},{buildPreCoverageSourceBody}]=await Promise.all([
  import('./class-mapping-current-source-gate-v1.mjs'),import('./class-mapping-current-consumer-seal-verifier-v1.mjs'),import('./bind-class-mapping-source-audit-input-commit-v2.mjs'),import('./class-mapping-report-input-contract-v2.mjs'),import('../research/class-mapping-source-epoch-v1/precoverage-builder-v1/production-readonly.mjs'),import('../research/class-mapping-source-epoch-v1/precoverage-builder-v1/source-body.mjs'),
 ]);
 const seal=verifyCurrentConsumerMaterializedStageSeal(),verified=await verifyCommittedClassMappingReportReceipt(),receipt=verified.receipt;
 const [{qualifyCurrentConsumerStage,assertCurrentBodyValue},{buildCoverageGaps}]=await Promise.all([import('./class-mapping-current-consumer-runtime-v1.mjs'),import('./coverage-gaps-class-mapping-v1.mjs')]);
 if(verified.path!==REPORT_RECEIPT_PATH||verified.sha256!==sha256(physical(REPORT_RECEIPT_PATH))||!receipt)throw new Error('Committed report verification API returned an unbound receipt');
 const stage=qualifyCurrentConsumerStage();assertCurrentBodyValue(stage,stage.inputs.data,'data');
 if(receipt.sourceEpoch?.sourceBody?.commit!==stage.summary.sourceCommit||receipt.sourceEpoch.sourceBody.tree!==stage.summary.sourceTree||receipt.qualifierProducer?.commit!==seal.qualifierCode.commit)throw new Error('Native/sealed consumer/committed report source stages disagree');
 const context=await loadProductionReadOnly(root),constructed=buildPreCoverageSourceBody(context.inputs,context.runtime),core=assertCoreReproduction(constructed.outputBytes,physical);context.assertDirectReadsUnchanged();assertCurrentBodyValue(stage,constructed.data,'data');
 const reports=selectCoverageReports(receipt,SOURCE_SCAN_LEGACY_ALIAS,CURRENT_REPORT_LEGACY_ALIASES),native=assertClassMappingCurrentSourceEpoch();
 const rows=[...Object.entries(native.inputHashes.sourceBody).map(([path,sha256])=>({path,sha256})),...Object.entries(native.inputHashes.protectedHistorical).map(([path,sha256])=>({path,sha256})),...receipt.outputs,...receipt.qualifierProducer.codeClosure,...receipt.qualifierProducer.staticAdapterData,...receipt.qualifierProducer.nativeQualificationMetadata];
 for(const [path,sha256]of Object.entries(stage.consumerPins.contractPins??{}))rows.push({path,sha256});for(const [path,sha256]of Object.entries(stage.consumerPins.receiptPins??{}))rows.push({path,sha256});
 const closed=buildClosedReader(rows,physical),handoff=JSON.parse(closed.read(reports.handoff.path).toString('utf8'));
 const aliases=new Map(CURRENT_REPORT_LEGACY_ALIASES.map(row=>[row.logicalPath,row.physicalPath]));
 const rebuilt=buildCoverageGaps({data:constructed.data,handoff,readFile:path=>closed.read(aliases.get(path)??path)}),coverageBytes=assertCoverageReproduction(rebuilt,closed.read(reports.coverage.path));
 closed.recheck();context.assertDirectReadsUnchanged();assertClassMappingCurrentSourceEpoch();
 const sealAfter=verifyCurrentConsumerMaterializedStageSeal();if(sealAfter.head!==seal.head||sealAfter.seal.sha256!==seal.seal.sha256)throw new Error('Sealed current stage changed during assembly');
 return {coverageBytes,receipt:{schemaVersion:1,status:'complete precoverage and current coverage reproduction passed',sourceEpoch:stage.summary,qualifierCode:seal.qualifierCode,metadataReceipt:{path:REPORT_RECEIPT_PATH,sha256:sha256(physical(REPORT_RECEIPT_PATH))},currentReportPaths:{handoff:reports.handoff.path,sourceScan:reports.scan.path,coverage:reports.coverage.path},coreOutputs:core,coverage:{path:PUBLIC_COVERAGE_PATH,sha256:sha256(coverageBytes),sizeBytes:coverageBytes.length},readInputs:closed.used(),sourceInputsWritten:false,semanticGradesPromoted:false}};
}
async function main(){const args=process.argv.slice(2);if(args.length===1&&args[0]==='--help'){process.stdout.write('Run from physical repository root: node tools/assemble-class-mapping-v1.mjs [--check]. Requires committed qualified S2 reports/current-consumer seals. Reproduces all S1 outputs in memory and writes only dist/coverage-gaps.json; --check writes no file.\n');return;}if(args.length>1||(args.length===1&&args[0]!=='--check'))throw new Error('Use --help');const {coverageBytes,receipt}=await assembleClassMapping();if(args[0]==='--check'){if(!physical(PUBLIC_COVERAGE_PATH).equals(coverageBytes))throw new Error('Committed public coverage output is stale');receipt.publicOutputAction='checked-byte-exact';}else{atomicCoverage(coverageBytes);receipt.publicOutputAction='atomically-published';}process.stdout.write(JSON.stringify(receipt)+'\n');}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
