import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const python='/usr/bin/python3';
const modulePath='research/source-frame-coordinate-bridge-next-native-v2.py';
const contractPath='research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-contract-v2.json';
const registryPath='research/class-mapping-source-epoch-v1/next-native-source-frame-bridge-v2.json';
const fixturePath='tests/fixtures/source-frame-coordinate-bridge-next-native-v2-before-repair.py.gz';
const fixtureSha256='0853b0183bc06b6bab64f494d8651fa6754f89b4d6bf765cc67404531e99abf9';
const beforeSourceSha256='1ea6efee8afe75c4f82fdb8c103d65982fc6fa02e93f16abcd6f3cef45f339b3';
const beforeSourceGitBlob='d2c0e930767853d89bce6d4c8bb062b457629a95';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitBlobSha1=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0','ascii')).update(bytes).digest('hex');

test('current source-frame bridge validates all 102 live owner joins without PDF or source-grade claims',()=>{
 const script=[
  'import json, pathlib, runpy, sys',
  'root=pathlib.Path(sys.argv[1]).resolve()',
  `bridge=runpy.run_path(str(root/${JSON.stringify(modulePath)}))`,
  `loaded=bridge['load_registry']()`,
  `data=json.loads((root/'dist/data.json').read_text())`,
  `live=bridge['validate_live_registry'](data,root/'dist',source_hashes=None,pdfs=None)`,
  `print(json.dumps({'python':sys.version.split()[0],'frameGroups':loaded['registry']['counts']['frameGroups'],'physicalPdfPages':loaded['registry']['counts']['physicalPdfPages'],'regionBindings':loaded['registry']['counts']['regionBindings'],'loadedOwnerJoins':len(loaded['owners']),'live':live,'pdfsSupplied':False,'sourceGradeClaim':False}))`,
 ].join('\n');
 const result=spawnSync(python,['-c',script,root],{encoding:'utf8',maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stderr||result.stdout);
 const report=JSON.parse(result.stdout.trim());
 assert.equal(report.frameGroups,9);
 assert.equal(report.physicalPdfPages,7);
 assert.equal(report.regionBindings,102);
 assert.equal(report.loadedOwnerJoins,102);
 assert.equal(report.live.status,'current-pins-match');
 assert.equal(report.live.ownerJoinsValidated,102);
 assert.equal(report.live.mismatchCount,0);
 assert.equal(report.pdfsSupplied,false);
 assert.equal(report.sourceGradeClaim,false);
});

test('sealed exact pre-fix module rejects the same current registry with its original artifact-type ValueError',()=>{
 const fixture=readFileSync(join(root,fixturePath));
 assert.equal(sha256(fixture),fixtureSha256);
 const oldSource=gunzipSync(fixture);
 assert.equal(sha256(oldSource),beforeSourceSha256);
 assert.equal(gitBlobSha1(oldSource),beforeSourceGitBlob);
 const sandbox=mkdtempSync(join(tmpdir(),'source-frame-bridge-before-'));
 try{
  const research=join(sandbox,'research');
  mkdirSync(join(research,'class-mapping-source-epoch-v1'),{recursive:true});
  writeFileSync(join(research,'source-frame-coordinate-bridge-next-native-v2.py'),oldSource);
  copyFileSync(join(root,contractPath),join(research,'class-mapping-source-epoch-v1','next-native-source-frame-bridge-contract-v2.json'));
  copyFileSync(join(root,registryPath),join(research,'class-mapping-source-epoch-v1','next-native-source-frame-bridge-v2.json'));
  const script=[
   'import json, runpy, sys',
   'bridge=runpy.run_path(sys.argv[1])',
   'try:',
   "    bridge['load_registry']()",
   'except ValueError as error:',
   "    print(json.dumps({'type':'ValueError','message':str(error)}))",
   'else:',
   "    raise SystemExit('pre-fix source unexpectedly accepted the current registry')",
  ].join('\n');
  const result=spawnSync(python,['-c',script,join(research,'source-frame-coordinate-bridge-next-native-v2.py')],{encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.deepEqual(JSON.parse(result.stdout.trim()),{type:'ValueError',message:'invalid bounded source-frame coordinate bridge registry'});
 }finally{rmSync(sandbox,{recursive:true,force:true});}
});
