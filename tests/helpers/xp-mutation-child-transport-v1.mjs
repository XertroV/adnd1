// Child-only transport for the preserved a29/MM mutation test. The mutation
// harness creates the one temp root; all repository paths still go through the
// unchanged closed MM reader and fixed Git grammar.
import * as fs from 'node:fs';
import {resolve,relative,isAbsolute,join,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {readFileSync as mmReadFileSync} from '../../research/class-mapping-history-v1/mm-replay-fs-v1.mjs';
import {execFileSync as mmExecFileSync,spawnSync as mmSpawnSync} from '../../research/class-mapping-history-v1/mm-replay-child-process-v1.mjs';
import {encodingOption} from '../../research/class-mapping-history-v1/mm-replay-io-contract-v1.mjs';
import {readMmTreasureCurrentSourceInputs as readMmInputs,assertMmTreasureCurrentSourceCohort} from './class-mapping-historical-mm-test-inputs-v1.mjs';
import {readVersion29HistoricalSourceInputs as readVersion29Inputs} from './version29-native-source-context.mjs';

const real=fs.realpathSync;
const repoRoot=real(resolve(dirname(real(import.meta.filename)),'../..'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function relativeInside(base,target){const rel=relative(base,target);return rel===''?null:rel==='..'||rel.startsWith(`..${sep}`)||isAbsolute(rel)?null:rel.split(sep).join('/');}
function fail(message){throw new Error(`XP mutation child transport: ${message}`);}
function initialize(){
  const requestedRepo=process.env.ADND1_XP_MUTATION_REPO_ROOT;
  if(typeof requestedRepo!=='string'||resolve(requestedRepo)!==repoRoot)fail('parent-pinned physical repository root required');
  const requestedRoot=process.env.ADND1_XP_MUTATION_CHILD_ROOT;
  if(typeof requestedRoot!=='string')fail('parent-owned child root required');
  const childRoot=resolve(requestedRoot);
  if(childRoot!==requestedRoot||real(childRoot)!==childRoot||relativeInside(real('/tmp'),childRoot)===null||relativeInside(repoRoot,childRoot)!==null)fail('child root must be a physical private /tmp directory outside the source checkout');
  const rootStat=fs.lstatSync(childRoot);
  if(!rootStat.isDirectory()||rootStat.isSymbolicLink())fail('child root must be a regular physical directory');
  const expectedDataSha=process.env.ADND1_XP_MUTATION_DATA_SHA256;
  if(typeof expectedDataSha!=='string'||!/^[a-f0-9]{64}$/.test(expectedDataSha))fail('exact parent-pinned child data digest required');
  return Object.freeze({childRoot,expectedDataSha});
}
const capability=initialize();
function pathValue(input){
  if(typeof input==='string')return resolve(input);
  if(types.isProxy(input))fail('proxy read paths are forbidden');
  if(input&&Object.getPrototypeOf(input)===URL.prototype&&Reflect.ownKeys(input).length===0&&input.protocol==='file:')return fileURLToPath(input);
  fail('only plain paths and ordinary file URLs are supported');
}
function checkedDataPath(path,options){
  const dist=join(capability.childRoot,'dist'),target=join(dist,'data.json');
  const distStat=fs.lstatSync(dist),dataStat=fs.lstatSync(target);
  if(!distStat.isDirectory()||distStat.isSymbolicLink()||!dataStat.isFile()||dataStat.isSymbolicLink()||dataStat.nlink!==1||real(target)!==target)fail('mutated MM data must be one parent-created regular child file');
  const bytes=fs.readFileSync(target);
  if(sha(bytes)!==capability.expectedDataSha)fail('child MM data bytes differ from the exact parent-pinned mutation input');
  const encoding=encodingOption(options),copy=Buffer.from(bytes);
  return encoding&&encoding!=='buffer'?copy.toString(encoding):copy;
}
export function readFileSync(input,options){
  const absolute=pathValue(input),local=relativeInside(capability.childRoot,absolute);
  if(local===null)fail('read path is outside the parent-owned child root');
  if(local==='dist/data.json')return checkedDataPath(absolute,options);
  if(local.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('-')||part.includes('\\')))fail('closed repository-relative source path required');
  // The mapped repo path enters the original immutable a29/MM reader. It does
  // not read the live S1 byte at the symlink target.
  return mmReadFileSync(resolve(repoRoot,...local.split('/')),options);
}
function checkedChildCwd(options){
  if(options?.cwd!==undefined&&resolve(options.cwd)!==capability.childRoot)fail('child Git cwd must equal the exact sandbox capability');
  return {...options,cwd:repoRoot};
}
function checkedGit(file){if(file!=='git'&&file!=='/usr/bin/git')fail('only fixed read-only Git commands are allowed');return file;}
export function execFileSync(file,args,options={}){return mmExecFileSync(checkedGit(file),args,checkedChildCwd(options));}
export function spawnSync(file,args,options={}){return mmSpawnSync(checkedGit(file),args,checkedChildCwd(options));}
function checkChildRoot(inputRoot){
  if(typeof inputRoot!=='string'||resolve(inputRoot)!==capability.childRoot)fail('historical input helper must receive the exact child-root capability');
}
export function readMmTreasureCurrentSourceInputs(inputRoot){checkChildRoot(inputRoot);return readMmInputs();}
export {assertMmTreasureCurrentSourceCohort};
export function readVersion29HistoricalSourceInputs(inputRoot){checkChildRoot(inputRoot);return readVersion29Inputs(repoRoot);}
