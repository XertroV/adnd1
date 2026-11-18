// Exact old-loader code, healthy pins followed by one canonical-input mutation.
// Assembly and execution occur only when the test callback invokes this function.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {lstatSync as physicalLstat,readFileSync as physicalRead,realpathSync as physicalRealpath} from 'node:fs';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {assertClassMappingCurrentSourceIdentity} from '../../tools/class-mapping-current-source-gate-v2.mjs';
import {historicalMmTestRoot,mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from '../../research/class-mapping-history-v1/mm-replay-fs-source2-v3.mjs';
import {spawnSync} from '../../research/class-mapping-history-v1/mm-replay-child-process-historical-v2-source2-v1.mjs';
const ROOT=physicalRealpath(resolve(import.meta.dirname,'../..'));
const PIN_PATH=resolve(import.meta.dirname,'../fixtures/phb-monetary-old-loader-healthy-source2-v1.json');
const PIN_SHA='515665fef999309382a02ee9c7d75851d83e802fb399dbcf40e9d1a5f7deaab0';
const SOURCE='ae7f02c6a5aac9ac8da1f7bc5cf5152e422fcd58';
const TREE='330c3fcec14ba5e1b923db22a6a4bbe6872e687a';
const LOADER='tools/monetary-current-source-questions.mjs';
const LOADER_SHA='3e81d85e3ae0f6989ecca05655af780ecc8d2a4347f3e0cdfdd7a328ffe17a5c';
const CANONICAL='research/price-source-inventory.json';
const MUTANT_COMMIT='65991ec94579a2f9fc587118e15622313216fa14';
const MUTANT_SHA='367ab54fa3d98c8fff7d082f68e107e54016a4cb85dfd2f4d23cd9456c0ebc94';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function currentProof(){
  const proof=assertClassMappingCurrentSourceIdentity();
  assert.equal(proof.summary.stage,'source2-body-native','paired control current Source2 stage');
  assert.equal(proof.summary.sourceCommit,'400f6e9d123d8a654b9b9af48133a2533506e73d');
  assert.equal(proof.summary.sourceTree,'664c02504efcece25669d2f9c3fdb26437cd5b09');
  return proof;
}
function safePath(path){
  assert.equal(typeof path,'string');
  assert.match(path,/^(?:research|tests|tools)\//);
  assert.ok(!path.includes('\\')&&!/[:\x00-\x1f\x7f]/.test(path));
  assert.ok(path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!part.startsWith('-')));
}
export function runOrdinal10PairedControlsSource2(...args){
  assert.equal(args.length,0,'paired control takes no root or input override');
  assert.equal(ROOT,historicalMmTestRoot,'fixed physical repository root');
  const before=currentProof();
  const pinStat=physicalLstat(PIN_PATH);
  assert.ok(pinStat.isFile()&&!pinStat.isSymbolicLink());
  assert.equal(physicalRealpath(PIN_PATH),PIN_PATH);
  const pinBytes=physicalRead(PIN_PATH);
  assert.equal(pinBytes.length,17915);assert.equal(sha(pinBytes),PIN_SHA);
  const pins=JSON.parse(pinBytes);
  assert.equal(pins.schema,'private-ordinal10-same-old-loader-healthy-inputs-v1');
  assert.equal(pins.sourceCommit,SOURCE);assert.equal(pins.sourceTree,TREE);
  assert.equal(pins.loaderSha256,LOADER_SHA);
  assert.equal(pins.registrySha256,'df352f9a51cb0486e4f9294cd7d749338486b1d1aa9adf608f5cf64aadb2d412');
  assert.equal(pins.fileCount,60);assert.equal(pins.totalBytes,93514755);
  assert.equal(pins.files.length,pins.fileCount);assert.deepEqual(pins.optionalAbsentPaths,[]);
  assert.equal(new Set(pins.files.map(row=>row.path)).size,pins.fileCount);
  assert.equal(pins.files.reduce((sum,row)=>sum+row.bytes,0),pins.totalBytes);
  assert.deepEqual(pins.entrypoint.argv,[LOADER,'--check']);
  const raw=createRawGitReader(ROOT);raw.assertView();
  assert.equal(raw.git('rev-parse',SOURCE+'^{tree}').toString('utf8').trim(),TREE);
  const temp=mkdtempSync(join(tmpdir(),'phb-monetary-before-'));
  try{
    for(const row of pins.files){
      safePath(row.path);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0);
      assert.match(row.sha256,/^[a-f0-9]{64}$/);
      const bytes=raw.git('show',SOURCE+':'+row.path);
      assert.equal(bytes.length,row.bytes,'healthy Git blob size: '+row.path);
      assert.equal(sha(bytes),row.sha256,'healthy Git blob hash: '+row.path);
      const target=join(temp,row.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);
      const stat=physicalLstat(target);
      assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'independent regular capsule file: '+row.path);
      assert.equal(physicalRealpath(target),target);
      assert.equal(sha(readFileSync(target)),row.sha256,'healthy copied blob: '+row.path);
    }
    assert.equal(sha(readFileSync(join(temp,LOADER))),LOADER_SHA);
    const healthy=spawnSync(process.execPath,[LOADER,'--check'],{cwd:temp,encoding:'utf8'});
    assert.equal(healthy.status,0,'same old-loader healthy control: '+healthy.stderr);
    assert.equal(healthy.signal,null);assert.equal(healthy.stderr,'');
    assert.deepEqual(JSON.parse(healthy.stdout),pins.predictedHealthyOutput);
    const mutant=raw.git('show',MUTANT_COMMIT+':'+CANONICAL);
    assert.equal(mutant.length,12787645);assert.equal(sha(mutant),MUTANT_SHA);
    writeFileSync(join(temp,CANONICAL),mutant);
    for(const row of pins.files)assert.equal(sha(readFileSync(join(temp,row.path))),row.path===CANONICAL?MUTANT_SHA:row.sha256,'only canonical input changed: '+row.path);
    assert.equal(sha(readFileSync(join(temp,LOADER))),LOADER_SHA);
    const stale=spawnSync(process.execPath,[LOADER,'--check'],{cwd:temp,encoding:'utf8'});
    assert.equal(stale.status,1,'canonical-only stale-input rejection');assert.equal(stale.signal,null);
    assert.match(stale.stderr,/Invalid current monetary source questions: stale input research\/price-source-inventory\.json/);
    assert.doesNotMatch(stale.stderr,/Invalid (?:current MM|historical MM)|native source epoch|fresh physical SHA\/size|Native1|closed pin/i,'no early epoch failure');
    raw.assertView();const after=currentProof();
    assert.deepEqual(after.summary,before.summary,'separate current Source2 role stays stable');
    return Object.freeze({healthyStatus:healthy.status,staleStatus:stale.status,loaderSha256:LOADER_SHA,mutatedPath:CANONICAL});
  }finally{rmSync(temp,{recursive:true,force:true});}
}
