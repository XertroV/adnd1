#!/usr/bin/env node
// Post-commit CI verifier for the fixed Native2 report closure. It re-runs
// current adapters and projects the current monetary questions; it never runs
// private-PDF producers or promotes source grades.
import {readFileSync,lstatSync,mkdirSync,realpathSync,writeFileSync,existsSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {resolve,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=resolve(import.meta.dirname,'..');
export function ensurePhysicalOutputDirectory(relative,repositoryRoot=root){
  if(typeof relative!=='string'||relative.startsWith('/')||relative.includes('\\')||relative.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Unsafe output directory path');
  const fixedRoot=path.resolve(repositoryRoot);
  if(fixedRoot!==repositoryRoot||realpathSync(fixedRoot)!==fixedRoot)throw new Error('Physical repository root required for output');
  let current=fixedRoot;
  for(const part of relative.split('/')){
    current=path.resolve(current,part);
    try{
      const stat=lstatSync(current);
      if(!stat.isDirectory()||stat.isSymbolicLink()||realpathSync(current)!==current)throw new Error('Output directory component must be a physical non-symlink directory');
    }catch(error){
      if(error.code!=='ENOENT')throw error;
      mkdirSync(current);
      const stat=lstatSync(current);
      if(!stat.isDirectory()||stat.isSymbolicLink()||realpathSync(current)!==current)throw new Error('Output directory component must be a physical non-symlink directory');
    }
  }
  return current;
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const kinds=new Set(['all','handoff','unit','consistency','ua26','systemic','continuation','source-scan','monetary-questions']);

function artifactOutput(value,bytes){
  if(typeof value!=='string'||!/^artifacts\/[A-Za-z0-9._/-]+\.(?:json|md)$/.test(value)||value.split('/').some(p=>p==='..'||p==='.'||!p))throw Error('Output must be an explicit artifacts JSON/Markdown path');
  const target=resolve(root,value),dir=dirname(target),relativeDir=value.split('/').slice(0,-1).join('/');
  ensurePhysicalOutputDirectory(relativeDir);
  try{const stat=lstatSync(target);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Artifact output must be a regular nonsymlink file');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const temporary=resolve(dir,'.current-report-'+randomUUID()+'.tmp');
  try{writeFileSync(temporary,bytes,{flag:'wx'});renameSync(temporary,target);}
  finally{try{unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}
}

export async function verifyCurrentClassMappingReports(kind='all'){
  if(!kinds.has(kind))throw Error('Closed current report kind required');
  const {verifyCommittedClassMappingReportReceipt}=await import('./bind-class-mapping-source-audit-input-commit-v3.mjs');
  const verified=await verifyCommittedClassMappingReportReceipt();
  const pins=new Map(verified.receipt.outputs.map(row=>[row.path,row]));
  const results=[];
  const builders={
    handoff:()=>import('./refresh-gaps-handoff-next-native-v3.mjs').then(({buildCurrentClassMappingGapsHandoff})=>buildCurrentClassMappingGapsHandoff()),
    unit:()=>import('./monetary-unit-provenance-audit-next-native-v3.mjs').then(({buildCurrentClassMappingMonetaryUnitProvenance})=>buildCurrentClassMappingMonetaryUnitProvenance()),
    consistency:()=>import('./source-report-consistency-audit-next-native-v3.mjs').then(({buildCurrentClassMappingReportConsistency})=>buildCurrentClassMappingReportConsistency()),
  };
  const buildKinds=kind==='all'?Object.keys(builders):Object.hasOwn(builders,kind)?[kind]:[];
  for(const name of buildKinds){
    const built=await builders[name]();
    const pin=pins.get(built.path);
    if(name==='consistency'&&built.report?.validation?.valid!==true)throw Error('Current report consistency has unresolved structural findings');
    if(!pin||sha(built.bytes)!==pin.rawSha256||!readFileSync(resolve(root,built.path)).equals(built.bytes))throw Error('Current '+name+' report differs from its committed exact Native2 output');
    results.push({kind:name,path:built.path,sha256:sha(built.bytes),byteExactReproduction:true});
  }
  let ua26Audit=null;
  if(kind==='all'||kind==='ua26'){
    const {auditUa26MarkerReceiptWithCurrentSourceEpoch}=await import('./class-mapping-current-ua26-marker-v2.mjs');
    ua26Audit=auditUa26MarkerReceiptWithCurrentSourceEpoch();
    if(ua26Audit.ok!==true||ua26Audit.semanticPass!==false)throw Error('UA26 pending marker scope failed');
    results.push({kind:'ua26',audit:ua26Audit});
  }
  let monetaryQuestions=null;
  if(kind==='all'||kind==='monetary-questions'){
    const {loadCurrentMonetarySourceQuestions,validateCurrentMonetarySourceQuestionProjection}=await import('./class-mapping-current-monetary-questions-v2.mjs');
    const {qualifyCurrentConsumerStage}=await import('./class-mapping-current-consumer-runtime-v2.mjs');
    const stage=qualifyCurrentConsumerStage(),projection=loadCurrentMonetarySourceQuestions();
    validateCurrentMonetarySourceQuestionProjection(projection);
    monetaryQuestions={
      schemaVersion:1,
      status:'Source2 body binding is current; general source review remains pending',
      sourceEpoch:{sourceCommit:stage.summary.sourceCommit,sourceTree:stage.summary.sourceTree},
      projection,
      semanticPass:false,
      generalSourceReviewPending:true,
    };
    results.push({kind:'monetary-questions',questionCounts:projection.questionCounts,recordCount:projection.records.length,
      unresolvedQuestionIds:projection.sourceQuestions.map(row=>row.id),semanticPass:false,generalSourceReviewPending:true});
  }
  const selectedKinds={
    handoff:'current-gaps-handoff-snapshot',unit:'current-monetary-unit-provenance-report',
    consistency:'current-report-consistency-audit',systemic:'current-systemic-coverage-report',
    continuation:'current-continuation-summary','source-scan':'current-source-scan-inventory',
  };
  const selected=selectedKinds[kind]?verified.receipt.outputs.filter(row=>row.kind===selectedKinds[kind]):[];
  if(selectedKinds[kind]&&selected.length!==1)throw Error('Exactly one committed current report selected by fixed kind required');
  return {
    schemaVersion:1,
    status:'committed Native2 report closure, selected adapter reproductions, and pending-grade projections verified',
    sourceCommit:verified.sourceCommit,sourceTree:verified.sourceTree,reportQccCommit:verified.reportQccCommit,
    metadataReceipt:{path:verified.path,sha256:verified.sha256},committedOutputCount:pins.size,
    selectedReport:selected[0]??null,results,ua26Audit,monetaryQuestions,sourceGradesPromoted:false,
  };
}

async function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--help'){
    console.log('node tools/verify-class-mapping-current-reports-v3.mjs [--kind all|handoff|unit|consistency|ua26|systemic|continuation|source-scan|monetary-questions] [--output artifacts/name.json] [--summary artifacts/name.md]');
    return;
  }
  let kind='all',output=null,summary=null;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--kind'&&args[i+1])kind=args[++i];
    else if(args[i]==='--output'&&args[i+1]&&output===null)output=args[++i];
    else if(args[i]==='--summary'&&args[i+1]&&summary===null)summary=args[++i];
    else throw Error('Use --help');
  }
  const result=await verifyCurrentClassMappingReports(kind),bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
  if(output){
    if(!output.endsWith('.json'))throw Error('JSON artifact output required');
    let payload=bytes;
    if(kind==='monetary-questions'&&result.monetaryQuestions)payload=Buffer.from(JSON.stringify(result.monetaryQuestions,null,2)+'\n');
    else if(result.selectedReport){payload=readFileSync(resolve(root,result.selectedReport.path));if(sha(payload)!==result.selectedReport.rawSha256)throw Error('Selected committed report changed before artifact emission');}
    artifactOutput(output,payload);
  }
  if(summary){
    if(!summary.endsWith('.md'))throw Error('Markdown summary artifact required');
    artifactOutput(summary,Buffer.from('# Qualified current '+kind+' check\n\nThe complete committed report closure was verified against Source2 '+result.sourceCommit+' and report QCC '+result.reportQccCommit+'.\n\n'+(result.selectedReport?'Exact selected report: `'+result.selectedReport.path+'` (`'+result.selectedReport.rawSha256+'`).\n\n':'')+'This structural check does not promote source values, context, qualifiers or review grades.\n'));
  }
  process.stdout.write(bytes);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.stack);process.exitCode=1;});
