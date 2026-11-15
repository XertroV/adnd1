import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('the actual historical monetary reader retains fixed cached roles and fresh bytes after caller mutation attempts', {timeout:300_000}, async()=>{
  // Import inside the test: the ordinary source/protocol guard stays independent
  // of the historical reader's full real source-gate/role initialization.
  const {
    historicalMmTestRoleSupplementV5Manifest:manifest,
    assertHistoricalMmRoleSupplementV5,
    readHistoricalMmRoleSupplementV5,
  }=await import('../research/class-mapping-history-v1/mm-test-postsource-supplement-v5.mjs');
  assert.equal(manifest.roles.length,31);
  const roles=[...manifest.roles].sort((a,b)=>a.sizeBytes-b.sizeBytes);
  const [first,second]=roles;
  assert.notEqual(first.role,second.role);
  assert.notEqual(first.sha256,second.sha256);
  const expected={role:first.role,path:first.path,sha256:first.sha256,sizeBytes:first.sizeBytes};
  const alternate={role:second.role,path:second.path,sha256:second.sha256,sizeBytes:second.sizeBytes};
  const manifestIdentity=JSON.stringify(manifest);
  const summary=assertHistoricalMmRoleSupplementV5();
  assert.equal(summary.roles.length,31);
  assert.equal(summary.a29ReplayHead,'a29d72d5147c497addd9e46f54ea3f8222f6e9c2');
  assert.equal(summary.currentMmSourceCommit,'0f2d70a135e3ad486152bf00f21387d60a1a97ef');
  assert.equal(summary.postSourceRegistryCommit,'ac60970626fd5e0421fc4b99c141cc11f53ffff3');
  assert.equal(summary.sourceSemanticsCertified,false);
  assert.equal(summary.numericOrGradeApproval,false);
  assert.equal(summary.nativeQualification,false);

  const original=readHistoricalMmRoleSupplementV5(expected.role);
  const originalCopy=Buffer.from(original);
  assert.equal(original.length,expected.sizeBytes);
  assert.equal(sha(original),expected.sha256);
  assert.equal(sha(readHistoricalMmRoleSupplementV5(alternate.role)),alternate.sha256);

  // This is the real cache-retarget regression: initialize first, then try to
  // replace a small verified role with another genuine role's path/hash/size.
  const mutations=[
    ()=>{first.path=alternate.path;first.sha256=alternate.sha256;first.sizeBytes=alternate.sizeBytes;},
    ()=>{first.sha256=alternate.sha256;},
    ()=>{first.sizeBytes=alternate.sizeBytes;},
    ()=>{first.role=alternate.role;},
    ()=>{manifest.roles.splice(0,1,second);},
    ()=>{manifest.roles=[];},
    ()=>{first.dependencyEvidence[0]='caller-replaced-dependency';},
  ];
  for(const mutate of mutations){
    try{mutate();}catch{}
    assert.equal(JSON.stringify(manifest),manifestIdentity,'exported historical role identity remains unchanged');
    const current=readHistoricalMmRoleSupplementV5(expected.role);
    assert.equal(current.length,expected.sizeBytes);
    assert.equal(sha(current),expected.sha256,'caller state cannot retarget a cached role');
    assert.deepEqual(current,originalCopy);
    assert.equal(sha(readHistoricalMmRoleSupplementV5(alternate.role)),alternate.sha256,'the other genuine role is preserved independently');
  }

  original.fill(0);
  const next=readHistoricalMmRoleSupplementV5(expected.role);
  assert.notEqual(next,original);
  assert.deepEqual(next,originalCopy,'each result is fresh bytes independent of caller buffer mutation');
  next.fill(255);
  assert.deepEqual(readHistoricalMmRoleSupplementV5(expected.role),originalCopy);
  const originalRoleNames=[...summary.roles];
  try{summary.roles[0]='caller-retargeted-summary';}catch{}
  assert.deepEqual(assertHistoricalMmRoleSupplementV5().roles,originalRoleNames,'summary role arrays cannot poison the verified cache');
  assert.throws(()=>readHistoricalMmRoleSupplementV5('caller-unlisted-role'),/unknown role/);
});
