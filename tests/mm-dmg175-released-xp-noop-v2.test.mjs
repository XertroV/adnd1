import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {withoutBatch6XpSourceMetadata, xpA65HistoryProjection} from '../research/mm-source-history-v1/source-postmetadata-facade-v2/ua-source-batch6-jo-fixture-v2.proposed.mjs';

const repoRoot=resolve(import.meta.dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const objectSha=value=>sha(Buffer.from(JSON.stringify(value)));
const current=JSON.parse(readFileSync(resolve(repoRoot,'dist/data.json'),'utf8'));
const expectedReleasedObjectSha256='fac1edee2865650e938833bf1c30a6b456bb8122fe3ae0a79fe6c9ff8d4840d9';

test('the exact A65 released XP data is a same-instance no-op; source mutations still reject',()=>{
  const releasedMaster='a65cb9931919a18a50591a206e6e4ea09064fc29';
  assert.equal(xpA65HistoryProjection.releasedMaster,releasedMaster);
  const releasedBytes=execFileSync('git',['show',`${releasedMaster}:dist/data.json`],{cwd:repoRoot,maxBuffer:32*1024*1024});
  assert.equal(sha(releasedBytes),xpA65HistoryProjection.releasedDataSha256,'the closed XP fixture pins the exact A65 released Git blob');
  const releasedGit=JSON.parse(releasedBytes.toString('utf8'));
  assert.equal(objectSha(releasedGit),expectedReleasedObjectSha256,'the complete parsed A65 data object has the fixed no-op fingerprint');

  const released=withoutBatch6XpSourceMetadata(current);
  assert.deepEqual(released,releasedGit,'the unchanged XP transfer kernel restores the complete A65 released data object');
  assert.equal(objectSha(released),expectedReleasedObjectSha256);
  assert.deepEqual(released.classes.find(row=>row.id==='ua-druid').xpRows[0].pages,[16]);
  assert.equal(withoutBatch6XpSourceMetadata(released),released,'the exact released A65 owner state remains an identity no-op');

  const reject=mutate=>{const changed=structuredClone(current);mutate(changed);assert.throws(()=>withoutBatch6XpSourceMetadata(changed));};
  reject(copy=>copy.classes.find(row=>row.id==='cleric').xpRows[0].xp=99);
  reject(copy=>copy.classes.find(row=>row.id==='cleric').pendingMechanics.push('unapproved mechanic'));
  reject(copy=>copy.classes.find(row=>row.id==='cleric').xpRows[0].evidenceBindings[0].reviewStatus='pending');
  reject(copy=>copy.classes.find(row=>row.id==='cleric').sourceExcerpts.regionCount++);
  reject(copy=>copy.classes.find(row=>row.id==='ua-druid').xpRows[0].pages=[16,18]);
  reject(copy=>copy.release.priceInventory.fieldEvidenceBindings++);
  reject(copy=>{const ref=xpA65HistoryProjection.recordTransfers.find(row=>row.itemId==='cleric');copy.classes[copy.classes.findIndex(row=>row.id==='cleric')]=structuredClone(ref.releasedRecord);});
});
