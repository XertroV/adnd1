import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,unlinkSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {loadRasterSnapshotInput} from '../tools/source-raster-coverage.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const repoRoot=mkdtempSync(join(tmpdir(),'raster-current-pointer-'));
 mkdirSync(join(repoRoot,'research'));
 const geometry=Buffer.from('{"scope":"numeric source geometry"}\n');
 const snapshot=gzipSync(JSON.stringify({inputs:{sourceUsageMapSha256:sha(geometry)}}));
 const pointer={schemaVersion:1,snapshot:{path:'research/current.json.gz',sha256:sha(snapshot)},sourceGeometry:{path:'research/geometry.json',sha256:sha(geometry)}};
 const save=()=>writeFileSync(join(repoRoot,'research/current-source-raster-snapshot.json'),JSON.stringify(pointer));
 writeFileSync(join(repoRoot,'research/current.json.gz'),snapshot);
 writeFileSync(join(repoRoot,'research/geometry.json'),geometry);
 writeFileSync(join(repoRoot,'research/source-audit-batch5-raster-boundary-before-source-repairs.json.gz'),snapshot);
 save();return {repoRoot,geometry,snapshot,pointer,save,close:()=>rmSync(repoRoot,{recursive:true,force:true})};
}
test('active pointer loads exact raster and geometry bytes, with no historical fallback after activation',()=>{
 const f=fixture();try{
  const result=loadRasterSnapshotInput({repoRoot:f.repoRoot});
  assert.equal(result.selection,'active-pointer');assert.deepEqual(result.bytes,f.snapshot);assert.deepEqual(result.geometry.bytes,f.geometry);
  unlinkSync(join(f.repoRoot,'research/current-source-raster-snapshot.json'));
  assert.throws(()=>loadRasterSnapshotInput({repoRoot:f.repoRoot}),/Current raster pointer is missing/);
 }finally{f.close();}
});
test('bad active paths, hashes, missing files and disconnected geometry fail closed',()=>{
 const mutations=[
  f=>{f.pointer.snapshot.path='../outside.json.gz';f.save();},
  f=>{f.pointer.sourceGeometry.path='/tmp/outside.json';f.save();},
  f=>{f.pointer.snapshot.sha256='0'.repeat(64);f.save();},
  f=>writeFileSync(join(f.repoRoot,'research/geometry.json'),'changed'),
  f=>unlinkSync(join(f.repoRoot,'research/current.json.gz')),
  f=>{const bytes=gzipSync(JSON.stringify({inputs:{sourceUsageMapSha256:'0'.repeat(64)}}));writeFileSync(join(f.repoRoot,'research/current.json.gz'),bytes);f.pointer.snapshot.sha256=sha(bytes);f.save();},
  f=>writeFileSync(join(f.repoRoot,'research/current-source-raster-snapshot.json'),'{malformed'),
  f=>{f.pointer.schemaVersion=2;f.save();},
 ];
 for(const mutate of mutations){const f=fixture();try{mutate(f);assert.throws(()=>loadRasterSnapshotInput({repoRoot:f.repoRoot}));}finally{f.close();}}
});
test('active repository paths cannot escape through a symlink',()=>{
 const f=fixture(),outside=mkdtempSync(join(tmpdir(),'raster-outside-'));try{
  writeFileSync(join(outside,'geometry.json'),f.geometry);
  unlinkSync(join(f.repoRoot,'research/geometry.json'));
  symlinkSync(join(outside,'geometry.json'),join(f.repoRoot,'research/geometry.json'));
  assert.throws(()=>loadRasterSnapshotInput({repoRoot:f.repoRoot}),/escapes/);
 }finally{f.close();rmSync(outside,{recursive:true,force:true});}
});
