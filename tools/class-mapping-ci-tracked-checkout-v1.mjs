// CI checkout integrity only. This does not qualify source content or a Native epoch.
import {realpathSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

function gitEnvironment() {
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
  return {...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',
    GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',
    GIT_NO_LAZY_FETCH:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'};
}
function git(root,args) {
  return spawnSync('git',['-C',root,'-c','core.fsmonitor=false',
    '-c','core.untrackedCache=false',...args],
    {env:gitEnvironment(),encoding:'utf8',stdio:['ignore','pipe','pipe']});
}
function fail(message) {throw new Error('CI tracked checkout integrity: '+message);}
function output(root,args,label) {
  const result=git(root,args);
  if(result.error||result.status!==0)fail(label+' failed');
  return result.stdout.trim();
}

// Production callers must pass their module-derived checkout root; there is
// no CLI root/fixture selector. A root argument here permits isolated unit Git
// fixtures without overriding the production source or Native gate.
export function assertTrackedCheckoutClean(repositoryRoot) {
  if(arguments.length!==1||typeof repositoryRoot!=='string'||!repositoryRoot)fail('one fixed checkout root required');
  const root=resolve(repositoryRoot),stat=lstatSync(root);
  if(!stat.isDirectory()||stat.isSymbolicLink()||realpathSync(root)!==root)fail('physical checkout root required');
  if(resolve(output(root,['rev-parse','--show-toplevel'],'top-level read'))!==root)fail('Git root differs from checkout');
  const head=output(root,['rev-parse','--verify','HEAD^{commit}'],'HEAD read');
  const tree=output(root,['rev-parse','--verify','HEAD^{tree}'],'tree read');
  if(!/^[a-f0-9]{40}$/.test(head)||!/^[a-f0-9]{40}$/.test(tree))fail('actual Git object identity required');
  const index=git(root,['ls-files','-v','-z']);
  if(index.error||index.status!==0)fail('tracked index read failed');
  const entries=index.stdout.split('\0').filter(Boolean);
  if(!entries.length||entries.some(entry=>!entry.startsWith('H ')))fail('unsafe tracked index flags');
  for(const args of [
    ['diff','--quiet','--cached','--no-ext-diff','--no-textconv','--ignore-submodules=none','HEAD','--'],
    ['diff','--quiet','--no-ext-diff','--no-textconv','--ignore-submodules=none','--'],
  ]) {
    const diff=git(root,args);
    if(diff.error||diff.status!==0)fail('tracked source, code, test, or metadata differs from HEAD');
  }
  return {kind:'whole-tracked-checkout-integrity-v1',headCommit:head,headTree:tree,
    trackedTreeClean:true,trackedIndexEntries:entries.length,indexFlags:'all H; no assume-unchanged or skip-worktree',
    comparison:'HEAD versus index and working tree; all tracked paths',
    untrackedOutputFilesIncluded:false,nativeOrSourceQualification:false};
}
