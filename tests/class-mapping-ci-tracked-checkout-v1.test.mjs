import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {assertTrackedCheckoutClean} from '../tools/class-mapping-ci-tracked-checkout-v1.mjs';

function fixture(t) {
  const ciFixtureRoot=mkdtempSync(join(tmpdir(),'ci-tracked-integrity-unit-'));
  t.after(()=>rmSync(ciFixtureRoot,{recursive:true,force:true}));
  const command=args=>execFileSync('git',['-C',ciFixtureRoot,...args],{stdio:['ignore','pipe','pipe']});
  command(['init','-q']);
  mkdirSync(join(ciFixtureRoot,'tools'));
  writeFileSync(join(ciFixtureRoot,'tools','example.mjs'),'export const value = 1;\n');
  writeFileSync(join(ciFixtureRoot,'audit.json'),'{"syntheticFixture":true}\n');
  command(['add','tools/example.mjs','audit.json']);
  command(['-c','user.name=CI unit fixture','-c','user.email=ci-fixture@example.invalid',
    '-c','commit.gpgsign=false','commit','-qm','Synthetic CI integrity fixture']);
  return {ciFixtureRoot,command};
}

test('clean actual Git fixture passes and untracked owned CI output remains separate',t=>{
  const {ciFixtureRoot}=fixture(t);
  const before=assertTrackedCheckoutClean(ciFixtureRoot);
  writeFileSync(join(ciFixtureRoot,'untracked-owned-output.tap'),'synthetic output\n');
  assert.deepEqual(assertTrackedCheckoutClean(ciFixtureRoot),before);
  assert.equal(before.trackedTreeClean,true);
  assert.equal(before.nativeOrSourceQualification,false);
  assert.equal(before.untrackedOutputFilesIncluded,false);
});

test('tracked code, staged changes and removed metadata each fail',t=>{
  const {ciFixtureRoot,command}=fixture(t);
  writeFileSync(join(ciFixtureRoot,'tools','example.mjs'),'export const value = 2;\n');
  assert.throws(()=>assertTrackedCheckoutClean(ciFixtureRoot),/differs from HEAD/);
  command(['add','tools/example.mjs']);
  assert.throws(()=>assertTrackedCheckoutClean(ciFixtureRoot),/differs from HEAD/);
  command(['restore','--source=HEAD','--staged','--worktree','tools/example.mjs']);
  rmSync(join(ciFixtureRoot,'audit.json'));
  assert.throws(()=>assertTrackedCheckoutClean(ciFixtureRoot),/differs from HEAD/);
  command(['restore','--source=HEAD','--worktree','audit.json']);
  assert.equal(assertTrackedCheckoutClean(ciFixtureRoot).trackedTreeClean,true);
});

test('root selectors do not accept nonstrings, extra arguments or a Git subdirectory',t=>{
  const {ciFixtureRoot}=fixture(t);
  assert.throws(()=>assertTrackedCheckoutClean({root:ciFixtureRoot}),/one fixed checkout root/);
  assert.throws(()=>assertTrackedCheckoutClean(ciFixtureRoot,{}),/one fixed checkout root/);
  assert.throws(()=>assertTrackedCheckoutClean(join(ciFixtureRoot,'tools')),/Git root differs/);
});

test('a staged change cannot be hidden by restoring only the working-tree bytes',t=>{
  const {ciFixtureRoot,command}=fixture(t);
  writeFileSync(join(ciFixtureRoot,'tools','example.mjs'),'export const value = 2;\n');
  command(['add','tools/example.mjs']);
  writeFileSync(join(ciFixtureRoot,'tools','example.mjs'),'export const value = 1;\n');
  assert.throws(()=>assertTrackedCheckoutClean(ciFixtureRoot),/differs from HEAD/);
});

for(const flag of ['--assume-unchanged','--skip-worktree']) {
  test('index '+flag+' cannot hide a changed tracked file',t=>{
    const {ciFixtureRoot,command}=fixture(t);
    command(['update-index',flag,'tools/example.mjs']);
    writeFileSync(join(ciFixtureRoot,'tools','example.mjs'),'export const value = 2;\n');
    assert.throws(()=>assertTrackedCheckoutClean(ciFixtureRoot),/unsafe tracked index flags/);
  });
}
