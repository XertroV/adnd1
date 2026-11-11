// Controlled, read-only Git view. No inherited Git/loader environment, grafts,
// replacement refs, commit-graph parent substitution or caller command writes.
import {readFileSync,lstatSync,realpathSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {TextDecoder} from 'node:util';
const check=(ok,message)=>{if(!ok)throw new Error(`Invalid raw Git view: ${message}`);};
const text=bytes=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
export function controlledGitEnvironment() {
  return {PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1',GIT_OPTIONAL_LOCKS:'0'};
}
export function inspectGitLayout(root) {
  const dot=resolve(root,'.git'),stat=lstatSync(dot);check(!stat.isSymbolicLink(),'symlink .git entry');
  let gitDir;
  if(stat.isDirectory())gitDir=realpathSync(dot);
  else {check(stat.isFile(),'regular .git file/directory');const match=/^gitdir: ([^\r\n]+)\r?\n?$/.exec(text(readFileSync(dot)));check(!!match,'exact gitdir file');gitDir=realpathSync(resolve(root,match[1]));}
  const commonFile=resolve(gitDir,'commondir'),commonDir=existsSync(commonFile)?realpathSync(resolve(gitDir,text(readFileSync(commonFile)).trim())):gitDir;
  return {root:realpathSync(root),gitDir,commonDir};
}
export function assertNoGitViewOverlays(layout) {
  for(const dir of new Set([layout.gitDir,layout.commonDir])) {
    check(!existsSync(resolve(dir,'info/grafts')),'grafts file is not permitted');
    for(const name of ['shallow','objects/info/alternates','objects/info/http-alternates'])check(!existsSync(resolve(dir,name)),`${name}: alternate/shallow object view is not permitted`);
    const replacements=resolve(dir,'refs/replace');check(!existsSync(replacements)||readdirSync(replacements).length===0,'loose replacement refs are not permitted');
    const packed=resolve(dir,'packed-refs');check(!existsSync(packed)||!/(?:^|\n)[^\n]* refs\/replace(?:\/|\s|$)/.test(text(readFileSync(packed))),'packed replacement refs are not permitted');
  }
}
export function verifyRawCommit(bytes,expectedCommit,expectedTree,expectedParent) {
  const hash=createHash('sha1').update(`commit ${bytes.length}\0`).update(bytes).digest('hex');check(hash===expectedCommit,'raw commit object hash');
  const header=text(bytes).split('\n\n',1)[0].split('\n'),trees=header.filter(line=>line.startsWith('tree ')),parents=header.filter(line=>line.startsWith('parent '));
  check(trees.length===1&&trees[0]===`tree ${expectedTree}`,'raw commit tree');
  check(parents.length===1&&parents[0]===`parent ${expectedParent}`,'raw single direct parent');
}
// Exact call grammar. The helper is shared with S2; command names alone do
// not make arbitrary Git options read-only. Validate BEFORE filesystem/spawn.
export function assertReadOnlyGitArgs(...args) {
  check(args.every(value=>typeof value==='string'),'Git arguments must be primitive strings');
  const oid=value=>/^[a-f0-9]{40}$/.test(value||''),ref=value=>value==='HEAD'||oid(value);
  const safePath=value=>typeof value==='string'&&!!value&&!value.startsWith('/')&&!value.includes('\\')&&!/[:\x00-\x1f\x7f]/.test(value)&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!part.startsWith('-'));
  const blob=value=>{const match=/^([a-f0-9]{40}):(.+)$/.exec(value||'');return !!match&&safePath(match[2]);};
  const object=value=>/^[a-f0-9]{40}\^\{(?:commit|tree)\}$/.test(value||'');
  let valid=false;
  if(args[0]==='rev-parse')valid=(args.length===2&&(['--show-toplevel','--git-dir','--absolute-git-dir','--show-object-format','--is-shallow-repository'].includes(args[1])||object(args[1])))||(args.length===3&&args[1]==='--verify'&&(object(args[2])||args[2]==='HEAD^{commit}'));
  if(args[0]==='rev-list')valid=args.length===5&&args[1]==='--parents'&&args[2]==='-n'&&args[3]==='1'&&oid(args[4]);
  if(args[0]==='merge-base')valid=args.length===4&&args[1]==='--is-ancestor'&&ref(args[2])&&ref(args[3]);
  if(args[0]==='show')valid=args.length===2&&blob(args[1]);
  if(args[0]==='cat-file')valid=args.length===3&&((args[1]==='commit'&&oid(args[2]))||(args[1]==='-e'&&blob(args[2])));
  if(args[0]==='for-each-ref')valid=args.length===3&&args[1]==='--format=%(refname)'&&args[2]==='refs/replace';
  check(valid,'exact read-only Git argument grammar');
  return true;
}
export function createRawGitReader(root) {
  const initial=inspectGitLayout(root);assertNoGitViewOverlays(initial);
  const env=controlledGitEnvironment();
  const git=(...args)=>{
    assertReadOnlyGitArgs(...args);
    const current=inspectGitLayout(root);check(current.gitDir===initial.gitDir&&current.commonDir===initial.commonDir&&current.root===initial.root,'fixed Git layout');assertNoGitViewOverlays(current);
    return execFileSync('/usr/bin/git',['--no-replace-objects',`--git-dir=${current.gitDir}`,`--work-tree=${current.root}`,'-c','core.commitGraph=false','-c','protocol.allow=never',...args],{env,maxBuffer:128*1024*1024});
  };
  const assertView=()=>{check(git('for-each-ref','--format=%(refname)','refs/replace').toString('utf8').trim()==='','replacement refs in any ref backend are not permitted');};
  return Object.freeze({git,assertView});
}
