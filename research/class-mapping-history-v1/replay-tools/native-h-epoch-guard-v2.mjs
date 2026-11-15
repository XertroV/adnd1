import {createHash} from 'node:crypto';
import {execFileSync as nodeExecFileSync} from '../mm-replay-child-process-v1.mjs';
import {readFileSync as nodeReadFileSync} from '../mm-replay-fs-v1.mjs';
import {resolve} from 'node:path';

export const nativeSourceRawPaths=Object.freeze([
  'dist/data.json',
  'research/price-source-inventory.json',
  'research/field-evidence-bindings.json',
  'equipment.json',
  'rules.json',
  'dist/books.js',
  'dist/app.js',
  'dist/source-viewer.js',
]);
export const nativeBaselineCommit='1f79d909344ebe7d41a432d8673f3eedb491fa3b';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(`Invalid native HIRED source epoch: ${message}`);};

function sameStringSet(actual,expected){
 return Array.isArray(actual)&&actual.length===expected.length&&new Set(actual).size===actual.length
  &&[...actual].sort().every((value,index)=>value===expected[index]);
}

/**
 * Check the final, closed source contract against both the worktree and Git.
 * Git blob output is deliberately kept as a Buffer: trimming it would erase a
 * real terminal newline and invalidate the raw-source identity check.
 * The injectable command/read functions exist only for bounded guard tests.
 */
export function assertNativeHirelingsSourceEpoch({repoRoot,contract,execFileSync=nodeExecFileSync,readFileSync=nodeReadFileSync}={}){
 const root=resolve(repoRoot||process.cwd());
 if(!contract||contract.baseline?.baselineCommit!==nativeBaselineCommit)fail('Version 29 baseline commit');
 if(!/^[a-f0-9]{40}$/.test(contract.sourceCommit||'')||!/^[a-f0-9]{40}$/.test(contract.sourceTree||''))fail('final source commit/tree pins are absent');
 const pins=contract.sourceRawInputs;
 if(!pins||typeof pins!=='object'||Array.isArray(pins)||!sameStringSet(Object.keys(pins),[...nativeSourceRawPaths].sort()))fail('the exact eight raw source inputs are required');
 for(const path of nativeSourceRawPaths)if(!/^[a-f0-9]{64}$/.test(pins[path]||''))fail(`raw SHA pin is absent for ${path}`);
 const git=(args,options={})=>execFileSync('git',['-C',root,...args],{maxBuffer:64*1024*1024,...options});
 const text=bytes=>{if(!Buffer.isBuffer(bytes)&&typeof bytes!=='string')fail('git rev-parse returned an invalid result');return String(bytes).trim();};
 const resolvedSource=text(git(['rev-parse',`${contract.sourceCommit}^{commit}`],{encoding:'utf8'}));
 const resolvedTree=text(git(['rev-parse',`${contract.sourceCommit}^{tree}`],{encoding:'utf8'}));
 const resolvedBaseline=text(git(['rev-parse',`${nativeBaselineCommit}^{commit}`],{encoding:'utf8'}));
 const head=text(git(['rev-parse','HEAD'],{encoding:'utf8'}));
 if(resolvedSource!==contract.sourceCommit||resolvedTree!==contract.sourceTree||resolvedBaseline!==nativeBaselineCommit)fail('source commit, tree, or baseline Git object identity');
 // Require the actual ancestry chain explicitly; HEAD ancestry alone would
 // also accept an unrelated source commit and baseline branch.
 git(['merge-base','--is-ancestor',nativeBaselineCommit,contract.sourceCommit]);
 git(['merge-base','--is-ancestor',contract.sourceCommit,head]);
 const sourceRawInputs={};
 for(const path of nativeSourceRawPaths){
  const currentBytes=readFileSync(resolve(root,path));
  const currentSha=sha256(currentBytes);
  if(currentSha!==pins[path])fail(`current raw bytes differ from closed contract for ${path}`);
  const blobBytes=git(['show',`${contract.sourceCommit}:${path}`]);
  if(!Buffer.isBuffer(blobBytes))fail(`Git blob reader did not preserve raw Buffer bytes for ${path}`);
  if(sha256(blobBytes)!==pins[path])fail(`source-commit raw bytes differ from closed contract for ${path}`);
  sourceRawInputs[path]=currentSha;
 }
 return {sourceCommit:contract.sourceCommit,sourceTree:contract.sourceTree,baselineCommit:nativeBaselineCommit,
  baselineAncestorOfSource:true,sourceAncestorOfCurrentHead:true,sourceRawInputs};
}

export function assertNativeContractBytes(contractBytes,expectedSha256){
 if(!Buffer.isBuffer(contractBytes)||sha256(contractBytes)!==expectedSha256)fail('final native source contract bytes are not closed');
 let contract;
 try{contract=JSON.parse(contractBytes.toString('utf8'));}catch{fail('native source contract is not JSON');}
 return contract;
}

export const nativeEpochSha256=sha256;
