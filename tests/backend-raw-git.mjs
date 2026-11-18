// Test-only deterministic backend; no real installation/Git proof is claimed.
import {readFileSync,appendFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
export {verifyRawCommit} from './real-raw-git-v1.mjs';
export function createRawGitReader(root){
 let cached=null,stamp='';const read=()=>{const path=resolve(root,'test-state.json'),stat=statSync(path,{bigint:true}),next=stat.mtimeNs+':'+stat.ctimeNs+':'+stat.size;if(next!==stamp){cached=JSON.parse(readFileSync(path));stamp=next;}return cached;};
 return {assertView(){if(read().badView)throw Error('fixture raw view rejected');},git(...args){
  const s=read();appendFileSync(resolve(root,'calls.jsonl'),JSON.stringify({kind:'git',args})+'\n');
  if(args[0]==='rev-parse'){
   const ref=args.at(-1);if(ref==='HEAD^{commit}')return Buffer.from(s.head+'\n');
   const match=/^([a-f0-9]{40})\^\{(commit|tree)\}$/.exec(ref);
   if(match&&s.commits[match[1]])return Buffer.from((match[2]==='commit'?match[1]:s.commits[match[1]].tree)+'\n');
  }
  if(args[0]==='cat-file'&&args[1]==='commit'&&s.commits[args[2]])return Buffer.from(s.commits[args[2]].raw,'base64');
  if(args[0]==='show'&&Object.hasOwn(s.blobs,args[1])){const blob=s.blobs[args[1]];return typeof blob==='string'?Buffer.from(blob,'base64'):readFileSync(resolve(root,blob.file));}
  if(args[0]==='merge-base'&&args[1]==='--is-ancestor'){
   let cursor=args[3];const seen=new Set();while(cursor&&!seen.has(cursor)){if(cursor===args[2])return Buffer.alloc(0);seen.add(cursor);cursor=s.commits[cursor]?.parents[0];}
   throw Error('fixture ancestry rejected');
  }
  throw Error('unmapped test backend command '+JSON.stringify(args));
 }};
}
