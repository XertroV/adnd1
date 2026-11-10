// Installed as tests/helpers/hirelings-source-current-cohort.mjs only after
// the reviewed final fixture and kernel have been copied to their fixed paths.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {createHirelingsNativeCohort} from './hirelings-source-current-cohort-kernel-v1.mjs';
const root=resolve(import.meta.dirname,'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixtureBytes=readFileSync(new URL('../fixtures/hirelings-source-current-cohort-v1.json',import.meta.url));
const reviewedFixtureSha256='62fc72e77be34bff2757ea6d8e69f766d53441c66a9ce61ff2101df413ceda9f';
assert.equal(sha(fixtureBytes),reviewedFixtureSha256,'exact independently reviewed current HIRED fixture bytes');
const fixture=JSON.parse(fixtureBytes);
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:128*1024*1024});
git('merge-base','--is-ancestor',fixture.baseline.baselineCommit,fixture.sourceCommit);
git('merge-base','--is-ancestor',fixture.sourceCommit,'HEAD');
assert.equal(git('rev-parse',fixture.sourceCommit+'^{tree}').toString().trim(),fixture.sourceTree,'actual source Git tree matches its closed native fixture');
for(const[path,wanted]of Object.entries(fixture.sourceRawInputs)){
 assert.equal(sha(git('show',`${fixture.sourceCommit}:${path}`)),wanted,path+': exact committed source bytes');
}
const native=createHirelingsNativeCohort(fixtureBytes,reviewedFixtureSha256);
export function readHirelingsCurrentSourceInputs(repoRoot=root){
 assert.equal(resolve(repoRoot),root,'the current native reader consumes this checkout directly');
 return native.readHirelingsCurrentSourceInputs(root);
}
export const assertHirelingsCurrentSourceCohort=native.assertHirelingsCurrentSourceCohort;
