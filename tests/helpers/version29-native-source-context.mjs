// Explicit historical Version29 inputs for the unchanged DMG175 native kernel.
// This is deliberately separate from the actual-current HIRED source reader.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const baselineCommit='1f79d909344ebe7d41a432d8673f3eedb491fa3b';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const rawPaths=['dist/data.json','research/price-source-inventory.json','research/field-evidence-bindings.json','equipment.json','rules.json','dist/books.js'];
export function readVersion29HistoricalSourceInputs(repoRoot){
 const root=resolve(repoRoot),fixtureBytes=readFileSync(resolve(root,'tests/fixtures/dmg175-source-current-cohort-v1.json'));
 assert.equal(sha(fixtureBytes),'b1a39cd6379d1fc34f906781982f9fc049d94089459fd0f7b0243aaeb8476685','original closed Version29 native source fixture unchanged');
 const fixture=JSON.parse(fixtureBytes),read=path=>execFileSync('git',['show',`${baselineCommit}:${path}`],{cwd:root,maxBuffer:128*1024*1024});
 assert.deepEqual(Object.keys(fixture.sourceRawInputs),rawPaths,'only original six raw source paths enter this historical context');
 const buffers=Object.fromEntries(rawPaths.map(path=>{const bytes=read(path);assert.equal(sha(bytes),fixture.sourceRawInputs[path],path+': complete Version29 blob matches original native guard fixture');return[path,bytes];}));
 const mechanics=read('research/mechanics-audit-progress.json');
 assert.equal(sha(mechanics),fixture.actualMechanicsRawSha256,'complete Version29 mechanics metadata matches original native fixture');
 return{data:JSON.parse(buffers['dist/data.json']),inventory:JSON.parse(buffers['research/price-source-inventory.json']),manual:JSON.parse(buffers['research/field-evidence-bindings.json']),mechanics:JSON.parse(mechanics),sourceRawInputs:Object.fromEntries(rawPaths.map(path=>[path,sha(buffers[path])]))};
}
