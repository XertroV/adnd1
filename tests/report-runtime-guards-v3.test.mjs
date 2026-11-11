import test from 'node:test';
import assert from 'node:assert/strict';
import {chmodSync,mkdtempSync,readFileSync,realpathSync,symlinkSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {REPORT_CODE_PATHS,PYTHON_DYNAMIC_LOCAL_EDGES} from '../tools/class-mapping-report-input-contract-v2.mjs';
import {buildReportSubprocessEnvironment,matchesTypedInlineNodeMechanicsEdge,validateReportPythonExecutable} from '../tools/class-mapping-report-runtime-guards-v1.mjs';

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
