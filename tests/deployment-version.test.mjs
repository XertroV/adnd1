import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateVersion, branch, statePath} from '../tools/allocate-version.mjs';

function fakeStore(initial = 0) {
  let seq = 0, head = 'c0', refMissing = false, deny = false, race = false;
  const trees = new Map([['t0', JSON.stringify({version:initial})]]), commits = new Map([['c0',{tree:'t0'}]]);
  const request = async (method,path,body) => {
    if (method==='GET' && path===`/git/ref/heads/${branch}`) return refMissing ? {status:404} : {status:200,data:{object:{sha:head}}};
    if (method==='GET' && path.startsWith('/git/commits/')) return {status:200,data:{tree:{sha:commits.get(path.split('/').at(-1)).tree}}};
    if (method==='GET' && path.startsWith(`/contents/${statePath}?`)) {const id=decodeURIComponent(path.split('ref=')[1]);return {status:200,data:{encoding:'base64',content:Buffer.from(trees.get(commits.get(id).tree)).toString('base64')}};}
    if (method==='POST' && path==='/git/trees') {const id=`t${++seq}`;trees.set(id,body.tree[0].content);return {status:201,data:{sha:id}};}
    if (method==='POST' && path==='/git/commits') {const id=`c${++seq}`;commits.set(id,{tree:body.tree,parent:body.parents[0]});return {status:201,data:{sha:id}};}
    if (method==='PATCH') {
      if (deny) return {status:403};
      if (race) { race=false; const id=`r${++seq}`,tree=`t${++seq}`;trees.set(tree,JSON.stringify({version:1}));commits.set(id,{tree,parent:head});head=id;return {status:422}; }
      if (commits.get(body.sha).parent!==head) return {status:422};
      head=body.sha;return {status:200};
    }
    throw Error(`Unexpected ${method} ${path}`);
  };
  return {request, missing:()=>{refMissing=true}, deny:()=>{deny=true}, race:()=>{race=true}, current:()=>JSON.parse(trees.get(commits.get(head).tree)).version};
}
const meta={runId:'987',attempt:'1',sha:'a'.repeat(40)};
test('reserves strictly increasing versions including retries', async () => {
  const s=fakeStore();assert.equal(await allocateVersion(s.request,meta),1);assert.equal(await allocateVersion(s.request,{...meta,attempt:'2'}),2);assert.equal(s.current(),2);
});
test('retries concurrent update without reusing a version', async () => {
  const s=fakeStore();s.race();assert.equal(await allocateVersion(s.request,meta),2);assert.equal(s.current(),2);
});
test('fails closed on missing branch, invalid counter, or permission denial', async () => {
  const missing=fakeStore();missing.missing();await assert.rejects(allocateVersion(missing.request,meta),/unavailable/);
  const invalid=fakeStore(Number.MAX_SAFE_INTEGER);await assert.rejects(allocateVersion(invalid.request,meta),/Invalid version counter/);
  const denied=fakeStore();denied.deny();await assert.rejects(allocateVersion(denied.request,meta),/HTTP 403/);assert.equal(denied.current(),0);
});

test('accepts a confirmed reservation when update response reports an error', async () => {
  const s=fakeStore();let changed=false;
  const request=async (method,path,body)=>{const result=await s.request(method,path,body);if(method==='PATCH'&&!changed){changed=true;return {status:500}}return result;};
  assert.equal(await allocateVersion(request,meta),1);assert.equal(s.current(),1);
});
test('fails safely on a lost connection or corrupt state', async () => {
  const s=fakeStore();const lost=async (method,path,body)=>{if(method==='PATCH')throw Error('network unavailable');return s.request(method,path,body)};
  await assert.rejects(allocateVersion(lost,meta),/network unavailable/);assert.equal(s.current(),0);
  const corrupt=async (method,path,body)=>path.startsWith('/contents/') ? {status:200,data:{encoding:'base64',content:Buffer.from('invalid').toString('base64')}} : s.request(method,path,body);
  await assert.rejects(allocateVersion(corrupt,meta),/Invalid version state/);
});
test('stops after bounded contention', async () => {
  const s=fakeStore();const request=async (method,path,body)=>{if(method==='PATCH')s.race();return s.request(method,path,body)};
  await assert.rejects(allocateVersion(request,meta,2),/contention/);
});
