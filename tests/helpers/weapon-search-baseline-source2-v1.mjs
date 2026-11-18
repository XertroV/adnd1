// Closed historical weapon baseline for the site-search successor.
// Preserve both original Git preimage SHA assertions through the Source2 child boundary.
import assert from 'node:assert/strict';
import {execFileSync} from '../../research/class-mapping-history-v1/mm-replay-child-process-source2-v5.mjs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const beforeBytes=execFileSync('git',['show','cc9509047746d5e27a71cb5b1e0cfcb739a688c9:dist/data.json'],{cwd:root,maxBuffer:40*1024*1024});
assert.equal(sha(beforeBytes),'cf6dd7ff912b91fd4525e1d48355e8c21e766e73f2118820e926a96b62f5216f');
export const beforeWeaponData=JSON.parse(beforeBytes);
const sourcePhaseBytes=execFileSync('git',['show','9ee2550e9793e6aae9a7ac8fd71525704894950f:dist/data.json'],{cwd:root,maxBuffer:40*1024*1024});
assert.equal(sha(sourcePhaseBytes),'6643d7b58c90d982244f1d8f03b6f03a7587446ba25c402be8f9a81a8b701f8f');
export const weaponOwnerIds=['phb-hurled-weapons-and-missiles-table','ua-hurled-weapons-and-missiles-table'];
