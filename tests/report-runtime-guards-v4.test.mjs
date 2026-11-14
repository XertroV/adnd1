import test from 'node:test';
import assert from 'node:assert/strict';
import {chmodSync,existsSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {
  REPORT_CODE_PATHS,PYTHON_DYNAMIC_LOCAL_EDGES,REPORT_DATA_PATHS,REPORT_DATA_EXPECTED_SHA256,
  S2_CURRENT_ADAPTER_CODE_PATHS,S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES,S2_CURRENT_ADAPTER_MANIFEST_SHA256,
  S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE,CURRENT_MONETARY_INDEX_DEPENDENCY_ARRAYS,
  CURRENT_MONETARY_SOURCE_INDEX_PATH,CURRENT_MONETARY_SOURCE_INDEX_SHA256,
  CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH,CURRENT_MONETARY_SOURCE_RENDER_FRAMES_SHA256,
  CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_PATH,CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_SHA256,
  CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_PATH,CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_SHA256,
} from '../tools/class-mapping-report-input-contract-v2.mjs';
import {
  assertRasterSnapshotMatchesGeometry,buildReportSubprocessEnvironment,inspectCurrentMonetaryIndexDependencyArrays,
  loadSourceScanCatalogFromProducerPath,matchesTypedInlineNodeMechanicsEdge,selectContinuationSnapshotHead,
  validateCurrentMonetaryIndexDependencyClosure,validateReportPythonExecutable,
} from '../tools/class-mapping-report-runtime-guards-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const continuationPath=path.join(root,'tools/continuation-candidates-next-native-v2.py');
const realContinuation=readFileSync(continuationPath,'utf8');

test('typed Python-to-Node edge accepts the real exact argv/import form',()=>{
  const edge=PYTHON_DYNAMIC_LOCAL_EDGES.find(row=>row.from==='tools/continuation-candidates-next-native-v2.py'&&row.mechanism.includes('inline Node import'));
  assert.ok(edge);
  assert.equal(edge.to,'tools/mechanics-audit.mjs');
  assert.equal(REPORT_CODE_PATHS.includes('tools/class-mapping-report-runtime-guards-v1.mjs'),true);
  assert.equal(REPORT_CODE_PATHS.length,67);
  assert.equal(matchesTypedInlineNodeMechanicsEdge(realContinuation),true);
});

test('typed Python-to-Node edge rejects alternate argv, import, and untyped launch forms',()=>{
  assert.equal(matchesTypedInlineNodeMechanicsEdge(realContinuation.replace('"--input-type=module"','"--input-type=commonjs"')),false);
  assert.equal(matchesTypedInlineNodeMechanicsEdge(realContinuation.replace("from './tools/mechanics-audit.mjs'","from './tools/unpinned.mjs'")),false);
  assert.equal(matchesTypedInlineNodeMechanicsEdge(realContinuation.replace('["node", "--input-type=module", "-e", script]','["node", "-e", script]')),false);
  assert.equal(matchesTypedInlineNodeMechanicsEdge('node --input-type=module -e script'),false);
  assert.equal(matchesTypedInlineNodeMechanicsEdge(realContinuation+'\nsubprocess.run(["node", "--input-type=module", "-e", script])\n'),false);
  assert.equal(matchesTypedInlineNodeMechanicsEdge(realContinuation+'\nscript = "unreviewed replacement"\n'),false);
  assert.equal(matchesTypedInlineNodeMechanicsEdge(realContinuation.replace('script = """','script = \'\'\'')),false);
});

test('Python executable option must be an absolute physical executable file',()=>{
  const temp=mkdtempSync(path.join(os.tmpdir(),'class-mapping-report-python-'));
  const executable=path.join(temp,'python');
  writeFileSync(executable,'#!/bin/sh\nexit 0\n');
  chmodSync(executable,0o755);
  assert.equal(validateReportPythonExecutable(executable),executable);
  assert.throws(()=>validateReportPythonExecutable('python3'),/absolute normalized path/);
  assert.throws(()=>validateReportPythonExecutable(temp),/physical regular file/);
  const symlink=path.join(temp,'python-link');
  symlinkSync(executable,symlink);
  assert.equal(validateReportPythonExecutable(symlink),executable,'execute the canonical physical target rather than the path alias');
});

test('report subprocess environment is fixed, Git-controlled, and selects this Node and Python runtime first',()=>{
  const temp=mkdtempSync(path.join(os.tmpdir(),'class-mapping-report-python-env-'));
  const executable=path.join(temp,'python');
  writeFileSync(executable,'#!/bin/sh\nexit 0\n');
  chmodSync(executable,0o755);
  const alias=path.join(temp,'python-alias');
  symlinkSync(executable,alias);
  const env=buildReportSubprocessEnvironment(alias);
  assert.deepEqual(Object.keys(env).sort(),[
    'GIT_CONFIG_GLOBAL','GIT_CONFIG_NOSYSTEM','GIT_CONFIG_SYSTEM','GIT_NO_LAZY_FETCH',
    'GIT_NO_REPLACE_OBJECTS','GIT_OPTIONAL_LOCKS','GIT_TERMINAL_PROMPT','LANG','LC_ALL','PATH',
  ].sort());
  assert.equal(env.GIT_NO_REPLACE_OBJECTS,'1');
  assert.equal(env.GIT_CONFIG_NOSYSTEM,'1');
  const entries=env.PATH.split(path.delimiter);
  assert.deepEqual(entries,[...new Set([path.dirname(process.execPath),temp,'/usr/bin','/bin'])]);
  assert.equal(realpathSync(path.join(entries[0],'node')),realpathSync(process.execPath));
  for(const forbidden of ['HOME','NODE_OPTIONS','PYTHONPATH','GIT_DIR','GIT_WORK_TREE'])assert.equal(Object.hasOwn(env,forbidden),false,forbidden);
});

test('continuation CLI is anchored to sealed actual HEAD while S1 and QCC stay distinct',()=>{
  const runner=readFileSync(path.join(root,'tools/class-mapping-report-producers-v2.mjs'),'utf8');
  assert.match(runner,/const head=finalStage\.head/);
  assert.match(runner,/selectContinuationSnapshotHead\(sourceCommit,qcc,head\)/);
  assert.match(runner,/['"]--commit['"]\s*,\s*continuationCommit/);
  assert.doesNotMatch(runner,/['"]--commit['"]\s*,\s*qcc/);
  const source='2d35138027f00c0740975e519dbb3a2b6df76d14';
  const qcc='53a21c78af0342fa393341ee599778a44fdaea93';
  const head='3ea3e3a48062ecb57db3fd2e97f42919fa661e31';
  assert.equal(selectContinuationSnapshotHead(source,qcc,head),head);
  assert.throws(()=>selectContinuationSnapshotHead(source,qcc,qcc),/identities must remain distinct/);
  assert.throws(()=>selectContinuationSnapshotHead(source,'not-a-full-commit',head),/full lowercase SHA-1/);
});

test('actual continuation CLI rejects QCC as the HEAD label and accepts sealed HEAD before work',()=>{
  const repoRoot=root;
  const scriptPath=path.join(repoRoot,'tools/continuation-candidates-next-native-v2.py');
  const sealPath=path.join(repoRoot,'research/class-mapping-current-adapters-v1/current-consumer-s2-seal-v1.json');
  assert.ok(existsSync(scriptPath),'installed continuation producer is required');
  assert.ok(existsSync(sealPath),'materialized current-consumer seal is required');
  const seal=JSON.parse(readFileSync(sealPath,'utf8'));
  const qcc=seal.qualifierCode?.commit;
  const headResult=spawnSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'});
  assert.equal(headResult.status,0,headResult.stderr);
  const head=headResult.stdout.trim();
  assert.match(qcc,/^[a-f0-9]{40}$/);
  assert.match(head,/^[a-f0-9]{40}$/);
  assert.notEqual(qcc,head);
  const harness=String.raw`
import importlib.util, subprocess, sys
module_path, root, source, commit, expected = sys.argv[1:]
spec = importlib.util.spec_from_file_location("continuation_under_test", module_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
real_run = subprocess.run
def guarded_run(args, **kwargs):
    if args == ["git", "rev-parse", "HEAD"]:
        return real_run(args, **kwargs)
    if args[:2] == ["git", "status"]:
        raise RuntimeError("TEST_REACHED_AFTER_HEAD_GUARD")
    return real_run(args, **kwargs)
module.subprocess.run = guarded_run
try:
    module.main(["--root", root, "--source-dir", source,
                 "--output", "/tmp/class-mapping-head-guard-full.gz",
                 "--summary", "/tmp/class-mapping-head-guard-summary.json",
                 "--markdown", "/tmp/class-mapping-head-guard.md",
                 "--commit", commit])
except RuntimeError as error:
    message = str(error)
    if expected == "mismatch" and "does not match repo-root HEAD" in message:
        print("EXPECTED_COMMIT_MISMATCH")
    elif expected == "head-accepted" and message == "TEST_REACHED_AFTER_HEAD_GUARD":
        print("EXPECTED_HEAD_GUARD_REACHED")
    else:
        raise
else:
    raise AssertionError("continuation main unexpectedly ran beyond its HEAD guard")
`;
  const invoke=(commit,expected)=>{
    const result=spawnSync('/usr/bin/python3',['-c',harness,scriptPath,repoRoot,repoRoot,commit,expected],{cwd:repoRoot,encoding:'utf8'});
    assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
    return result.stdout.trim();
  };
  assert.equal(invoke(qcc,'mismatch'),'EXPECTED_COMMIT_MISMATCH');
  assert.equal(invoke(head,'head-accepted'),'EXPECTED_HEAD_GUARD_REACHED');
});

test('raster source PDF digest binding follows the producer nested inputs schema',()=>{
  const runner=readFileSync(path.join(root,'tools/class-mapping-report-producers-v2.mjs'),'utf8');
  const hashes={DMG:'a'.repeat(64),MM:'b'.repeat(64),MM2:'c'.repeat(64),PHB:'d'.repeat(64),UA:'e'.repeat(64)};
  assert.equal(assertRasterSnapshotMatchesGeometry({inputs:{sourcePdfSha256:hashes}},hashes),true);
  assert.throws(()=>assertRasterSnapshotMatchesGeometry({sourcePdfSha256:hashes},hashes),/inputs\.sourcePdfSha256/);
  assert.throws(()=>assertRasterSnapshotMatchesGeometry({inputs:{}},hashes),/inputs\.sourcePdfSha256/);
  assert.throws(()=>assertRasterSnapshotMatchesGeometry({inputs:{sourcePdfSha256:{...hashes,UA:'f'.repeat(64)}}},hashes),/inputs\.sourcePdfSha256/);
  assert.match(runner,/assertRasterSnapshotMatchesGeometry\(rasterSnapshot,geometry\.sourcePdfSha256\)/);
  assert.doesNotMatch(runner,/rasterSnapshot\.sourcePdfSha256/);
});

test('producer invokes the pinned disposition exports from their actual module',async t=>{
  const runner=readFileSync(path.join(root,'tools/class-mapping-report-producers-v2.mjs'),'utf8');
  assert.match(runner,/await import\('\.\/source-visual-dispositions\.mjs'\)/);
  assert.match(runner,/dispositionsModule\.buildDispositionManifest\(visualReport\)/);
  assert.match(runner,/dispositionsModule\.renderDispositionMarkdown\(dispositions\)/);
  assert.doesNotMatch(runner,/visual\.buildDispositionManifest|visual\.renderDispositionMarkdown/);
  const modulePath=path.join(root,'tools/source-visual-dispositions.mjs');
  assert.ok(existsSync(modulePath),'QCC-pinned disposition module is required');
  const actualModule=await import(pathToFileURL(modulePath));
  assert.equal(typeof actualModule.buildDispositionManifest,'function');
  assert.equal(typeof actualModule.renderDispositionMarkdown,'function');
  const manifest=actualModule.buildDispositionManifest({usages:[],findingDispositions:[],totals:{},sentinelPolicy:{}});
  assert.equal(manifest.structuralValidation.valid,true);
  assert.match(actualModule.renderDispositionMarkdown(manifest),/^# Source visual dispositions\n/);
});

test('source-scan producer path is read exactly once without a second dist prefix',async()=>{
  const runner=readFileSync(path.join(root,'tools/class-mapping-report-producers-v2.mjs'),'utf8');
  assert.match(runner,/scan\.buildInventory\(data,relative=>loadSourceScanCatalogFromProducerPath\(relative,readJson,repoPath\)\)/);
  assert.doesNotMatch(runner,/readJson\(`dist\/\$\{repoPath\(relative\)\}`\)/);
  const producerPath=path.join(root,'tools/source-scan-inventory.mjs');
  const dataPath=path.join(root,'dist/data.json');
  assert.ok(existsSync(producerPath),'QCC-pinned source-scan producer is required');
  assert.ok(existsSync(dataPath),'current native data is required');
  const scan=await import(pathToFileURL(producerPath));
  const data=JSON.parse(readFileSync(dataPath,'utf8'));
  let requestedPath=null;const sentinel=Error('stop after observing the first catalog path');
  assert.throws(()=>scan.buildInventory(data,relative=>{requestedPath=relative;throw sentinel;}),error=>error===sentinel);
  assert.equal(typeof requestedPath,'string');
  assert.match(requestedPath,/^dist\/scans\//);
  const checked=loadSourceScanCatalogFromProducerPath(requestedPath,value=>value,value=>value);
  assert.equal(checked,requestedPath);
  assert.doesNotMatch(checked,/^dist\/dist\//);
});

test('current monetary kernel correction and its three static data proofs are fixed report pins',()=>{
  const kernelPath=path.join(root,'tools/class-mapping-current-monetary-question-kernel-v1.mjs');
  const dataHashes=new Map([
    [CURRENT_MONETARY_SOURCE_INDEX_PATH,CURRENT_MONETARY_SOURCE_INDEX_SHA256],
    [CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH,CURRENT_MONETARY_SOURCE_RENDER_FRAMES_SHA256],
    [CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_PATH,CURRENT_MONETARY_SOURCE_QUESTION_CONTRACT_SHA256],
    [CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_PATH,CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_SHA256],
  ]);
  assert.equal(S2_CURRENT_ADAPTER_MANIFEST_SHA256,'53c8735a206f3d454e1319b0a343052abb34d5bb52db33e373e625f26b5b490b');
  assert.equal(S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES['tools/class-mapping-current-monetary-question-kernel-v1.mjs'],S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE.newSha256);
  assert.equal(S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE.independentReviewPath,CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_PATH);
  assert.equal(S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE.independentReviewSha256,CURRENT_MONETARY_KERNEL_CORRECTION_REVIEW_SHA256);
  assert.equal(REPORT_DATA_PATHS.length,122);
  for(const [file,digest] of dataHashes){
    assert.ok(REPORT_DATA_PATHS.includes(file),`${file} is QCC report data`);
    assert.equal(REPORT_DATA_EXPECTED_SHA256[file],digest);
    const bytes=readFileSync(path.join(root,file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,file);
  }
  assert.equal(createHash('sha256').update(readFileSync(kernelPath)).digest('hex'),S2_CURRENT_ADAPTER_KERNEL_CORRECTION_EVIDENCE.newSha256);
  const runner=readFileSync(path.join(root,'tools/class-mapping-report-producers-v2.mjs'),'utf8');
  const binder=readFileSync(path.join(root,'tools/bind-class-mapping-source-audit-input-commit-v2.mjs'),'utf8');
  assert.match(runner,/validateCurrentMonetaryIndexDependencyClosure\(/);
  assert.match(binder,/validateCurrentMonetaryIndexDependencyClosure\(/);
});

test('fixed 8/1098 monetary-index pointer arrays retain declared roles and reject open paths',()=>{
  const digestFor=file=>REPORT_DATA_EXPECTED_SHA256[file]||S2_CURRENT_ADAPTER_EXPECTED_CODE_HASHES[file]||createHash('sha256').update(file).digest('hex');
  const kernel='tools/class-mapping-current-monetary-question-kernel-v1.mjs';
  const books='dist/books.js';
  const frames=CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH;
  const generated=Array.from({length:1101},(_,index)=>`research/synthetic-current-money-inputs/dependency-${String(index).padStart(4,'0')}.json`);
  const uniquePaths=[kernel,books,frames,...generated];
  assert.equal(uniquePaths.length,1104);
  const sourceBodyRows=uniquePaths.filter(file=>file!==frames).map(file=>({path:file,sha256:digestFor(file)}));
  const uniqueRows=uniquePaths.map(file=>({path:file,sha256:digestFor(file)}));
  const references=[...uniqueRows,uniqueRows[0],uniqueRows[1]];
  const index={inputArtifacts:references.slice(0,8),currentInputValidation:{validationArtifacts:references.slice(8)}};
  assert.deepEqual(CURRENT_MONETARY_INDEX_DEPENDENCY_ARRAYS.map(row=>row.expectedLength),[8,1098]);
  const closure=inspectCurrentMonetaryIndexDependencyArrays(index,sourceBodyRows);
  assert.equal(closure.referenceCount,1106);
  assert.equal(closure.uniquePathCount,1104);
  assert.equal(closure.duplicatePathReferences,2);
  assert.equal(closure.uniquePathRoles['source-body'],1103);
  assert.equal(closure.uniquePathRoles['report-code'],2);
  assert.equal(closure.uniquePathRoles['report-data'],1);
  assert.match(closure.dependencyRowsSha256,/^[a-f0-9]{64}$/);

  const short=structuredClone(index);short.inputArtifacts.pop();
  assert.throws(()=>inspectCurrentMonetaryIndexDependencyArrays(short,sourceBodyRows),/exactly 8 dependency rows/);
  const open=structuredClone(index);open.currentInputValidation.validationArtifacts[100].path='research/unlisted/dependency.json';
  assert.throws(()=>inspectCurrentMonetaryIndexDependencyArrays(open,sourceBodyRows),/outside the declared source-body\/report-code\/report-data union/);
  const stale=structuredClone(index);stale.inputArtifacts[3].sha256='f'.repeat(64);
  assert.throws(()=>inspectCurrentMonetaryIndexDependencyArrays(stale,sourceBodyRows),/exact native sourceBody pin/);
  assert.throws(()=>validateCurrentMonetaryIndexDependencyClosure(Buffer.from('{}'),'0'.repeat(40),[],()=>Buffer.from('{}'),()=>Buffer.from('{}')),/fixed candidate SHA/);
});

test('actual native stage exposes the 2636-path body map used by monetary dependency closure',async()=>{
  const runtimePath=pathToFileURL(path.join(root,'tools/class-mapping-current-consumer-runtime-v1.mjs'));
  const runtime=await import(runtimePath);
  const current=runtime.qualifyCurrentConsumerStage();
  const body=current.inputHashes?.sourceBody;
  assert.ok(body&&typeof body==='object'&&!Array.isArray(body));
  const sourceBodyRows=Object.entries(body).map(([file,digest])=>({path:file,sha256:digest}));
  assert.equal(sourceBodyRows.length,2636);
  const index=JSON.parse(readFileSync(path.join(root,CURRENT_MONETARY_SOURCE_INDEX_PATH),'utf8'));
  const closure=inspectCurrentMonetaryIndexDependencyArrays(index,sourceBodyRows);
  assert.equal(closure.referenceCount,1106);
  assert.equal(closure.uniquePathCount,1104);
  assert.equal(closure.sourceRenderFrames.path,CURRENT_MONETARY_SOURCE_RENDER_FRAMES_PATH);
  const runner=readFileSync(path.join(root,'tools/class-mapping-report-producers-v2.mjs'),'utf8');
  assert.match(runner,/current\.inputHashes\?\.sourceBody/);
  assert.doesNotMatch(runner,/current\.summary\.inputHashes\?\.sourceBody/);
});


// Execute the private production function verbatim without importing or running
// the binder's native/sealed qualification entrypoints.
function binderGitPathProbe(git) {
  const source=readFileSync(path.join(root,'tools/bind-class-mapping-source-audit-input-commit-v2.mjs'),'utf8');
  const safeStart=source.indexOf('function safeRepoPath('),safeEnd=source.indexOf('\nfunction physical(',safeStart);
  const headerStart=source.indexOf('function commitHeader('),headerEnd=source.indexOf('\nfunction exactCommit(',headerStart);
  const start=source.indexOf('function gitPathExists('),end=source.indexOf('\nfunction pathHashMap(',start);
  assert.ok(safeStart>=0&&safeEnd>safeStart&&headerStart>=0&&headerEnd>headerStart&&start>=0&&end>start,'exact private binder function boundaries');
  return new Function('git','Buffer','fail','createHash',source.slice(safeStart,safeEnd)+'\n'+source.slice(headerStart,headerEnd)+'\n'+source.slice(start,end)+'\nreturn gitPathExists;')(git,Buffer,message=>{throw new Error(message);},createHash);
}

test('binder tree absence accepts real Git with either physically absent or new untracked output',async()=>{
  const {createRawGitReader,controlledGitEnvironment}=await import('../tools/class-mapping-raw-git-v1.mjs');
  const previousCwd=process.cwd(),temp=mkdtempSync(path.join(realpathSync(os.tmpdir()),'class-mapping-binder-absence-'));
  const env=controlledGitEnvironment();
  const fixtureGit=(...args)=>execFileSync('/usr/bin/git',['-C',temp,'-c','core.hooksPath=/dev/null',...args],{env});
  try {
    fixtureGit('init','--quiet');
    writeFileSync(path.join(temp,'present.json'),'{}\n');mkdirSync(path.join(temp,'research/reports'),{recursive:true});writeFileSync(path.join(temp,'research/reports/committed-sibling.json'),'{}\n');fixtureGit('add','--','present.json','research/reports/committed-sibling.json');
    fixtureGit('-c','user.name=Binder absence regression','-c','user.email=binder-absence@example.invalid','commit','--quiet','-m','owned fixture');
    const commit=fixtureGit('rev-parse','HEAD').toString('utf8').trim();process.chdir(temp);
    const raw=createRawGitReader(temp),probe=binderGitPathProbe((...args)=>raw.git(...args));
    const absent='research/reports/absent.json',output='research/reports/new-current.json';
    assert.equal(probe(commit,absent),false,'missing tree path with no physical file');
    mkdirSync(path.join(temp,'research/reports'),{recursive:true});writeFileSync(path.join(temp,output),'new untracked output\n');
    assert.equal(probe(commit,output),false,'new output on disk remains absent from the source commit');
    assert.equal(probe(commit,'present.json'),true,'actual committed path remains present');
    assert.throws(()=>probe('0'.repeat(40),output),error=>error.status===128,'unknown commit is fatal');
    assert.throws(()=>probe('0'.repeat(40),absent),error=>error.status===128,'unknown commit with a physically absent path is fatal');
    assert.throws(()=>probe('not-a-commit',output),/full lowercase SHA-1 commit required/,'invalid commit grammar is fatal');
    assert.throws(()=>probe(commit,'../outside.json'),/unsafe repository path/);
    raw.assertView();
  } finally {process.chdir(previousCwd);rmSync(temp,{recursive:true,force:true});}
});

test('binder Git absence recognizes only two complete canonical status128 diagnostics',()=>{
  const commitBytes=Buffer.from('tree '+ 'b'.repeat(40)+'\n\nowned diagnostic fixture\n'),commit=createHash('sha1').update('commit '+commitBytes.length+'\0').update(commitBytes).digest('hex'),file='research/reports/new-current.json';
  const throwingGit=error=>(...args)=>{if(args.length===3&&args[0]==='cat-file'&&args[1]==='commit'&&args[2]===commit)return commitBytes;throw error;};
  const canonical=[`fatal: path '${file}' does not exist in '${commit}'\n`,`fatal: path '${file}' exists on disk, but not in '${commit}'\n`];
  for(const stderr of canonical)for(const payload of [stderr,Buffer.from(stderr)]){
    const probe=binderGitPathProbe(throwingGit({status:128,stderr:payload}));
    assert.equal(probe(commit,file),false);
  }
  const invalid=[
    ...canonical.flatMap(message=>[message.replace(file,'research/reports/wrong.json'),message.replace(commit,'b'.repeat(40)),message+message,'permission denied: '+message,message+'permission denied\n',message.trimEnd(),message+'\n']),
    'fatal: not a valid object name\n','fatal: unable to read object: Permission denied\n',Buffer.from([0xff]),'',null,
  ];
  for(const stderr of invalid){const probe=binderGitPathProbe(throwingGit({status:128,stderr}));assert.throws(()=>probe(commit,file),/could not establish exact tree-path presence/);}
  for(const status of [0,1,127,129,null,undefined,'128']){
    const probe=binderGitPathProbe(throwingGit({status,stderr:Buffer.from(canonical[0])}));
    assert.throws(()=>probe(commit,file),/could not establish exact tree-path presence/);
  }
});


test('binder external source PDF pins use only the strict nested raster inputs schema',()=>{
  const source=readFileSync(path.join(root,'tools/bind-class-mapping-source-audit-input-commit-v2.mjs'),'utf8');
  const start=source.indexOf('function externalSourcePdfPins('),end=source.indexOf('\nfunction sealedPathSet(',start);
  const parsedStart=source.indexOf('function parsedJson('),parsedEnd=source.indexOf('\nfunction parsedHash(',parsedStart);
  assert.ok(start>=0&&end>start&&parsedStart>=0&&parsedEnd>parsedStart);
  const hashes={DMG:'a'.repeat(64),MM:'b'.repeat(64),MM2:'c'.repeat(64),PHB:'d'.repeat(64),UA:'e'.repeat(64)};
  const geometryPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/geometry/source-visual-audit-next-native-v2.json';
  const rasterPath='research/class-mapping-source-epoch-v1/reports/next-native-v2/raster/source-raster-boundary.json.gz';
  const gzip=value=>gzipSync(Buffer.from(JSON.stringify(value)));
  const inspect=(geometry,rasterBytes)=>{
    const physical=p=>{if(p===geometryPath)return Buffer.from(JSON.stringify(geometry));if(p===rasterPath)return rasterBytes;throw Error('Unexpected binder external-source read '+p);};
    return new Function('physical','gunzipSync','fail','assertRasterSnapshotMatchesGeometry',source.slice(parsedStart,parsedEnd)+'\n'+source.slice(start,end)+'\nreturn externalSourcePdfPins();')(physical,gunzipSync,message=>{throw Error(message);},assertRasterSnapshotMatchesGeometry);
  };
  const result=inspect({sourcePdfSha256:hashes},gzip({inputs:{sourcePdfSha256:hashes}}));
  assert.deepEqual(result.sourcePdfSha256,hashes);assert.equal(result.sourceDirectoryPath,null);assert.equal(result.sourceDirectoryRecorded,false);
  assert.deepEqual(inspect({sourcePdfSha256:hashes},gzip({inputs:{sourcePdfSha256:hashes},sourcePdfSha256:{...hashes,UA:'f'.repeat(64)}})),result,'a top-level decoy is never used as the nested identity proof');
  assert.throws(()=>inspect({sourcePdfSha256:hashes},gzip({sourcePdfSha256:hashes})),/inputs\.sourcePdfSha256/,'top-level-only legacy shape cannot be a fallback');
  assert.throws(()=>inspect({sourcePdfSha256:hashes},gzip({inputs:{sourcePdfSha256:{...hashes,UA:'f'.repeat(64)}},sourcePdfSha256:hashes})),/inputs\.sourcePdfSha256/,'a matching decoy cannot conceal a wrong nested digest');
  assert.throws(()=>inspect({sourcePdfSha256:hashes},gzip({inputs:{}})),/inputs\.sourcePdfSha256/);
  const missing={...hashes};delete missing.MM2;
  assert.throws(()=>inspect({sourcePdfSha256:missing},gzip({inputs:{sourcePdfSha256:hashes}})),/all five external source PDFs/);
  assert.throws(()=>inspect({sourcePdfSha256:{...hashes,OTHER:'f'.repeat(64)}},gzip({inputs:{sourcePdfSha256:hashes}})),/all five external source PDFs/);
  assert.throws(()=>inspect({sourcePdfSha256:{...hashes,MM2:'bad'}},gzip({inputs:{sourcePdfSha256:hashes}})),/all five external source PDFs/);
  assert.throws(()=>inspect({sourcePdfSha256:hashes},Buffer.from('not gzip')),/must be gzip JSON/);
  assert.match(source,/assertRasterSnapshotMatchesGeometry\(raster,pins\)/);
});
