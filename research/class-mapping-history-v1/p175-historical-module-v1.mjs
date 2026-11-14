// Historical test transport only. Actual current source qualification is kept
// separate; no current module, source data, report or contract is projected.
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRawGitReader} from '../../tools/class-mapping-raw-git-v1.mjs';
import {assertClassMappingCurrentSourceIdentity} from '../../tools/class-mapping-current-source-gate-v1.mjs';
import {P175_HISTORICAL_MODULE,assertHistoricalP175ModuleInputs} from './p175-historical-module-contract-v1.mjs';

const root=realpathSync(resolve(import.meta.dirname,'../..'));
const git=createRawGitReader(root),pin=P175_HISTORICAL_MODULE;
let immutableInputs=null,modulePromise=null;

function qualifiedInputs(){
  const current=assertClassMappingCurrentSourceIdentity();
  git.assertView();
  git.git('merge-base','--is-ancestor',pin.commit,'HEAD');
  const historicalTree=git.git('rev-parse',`${pin.commit}^{tree}`).toString('utf8').trim();
  if(immutableInputs===null)immutableInputs={
    moduleBytes:git.git('show',`${pin.commit}:${pin.path}`),
    historicalBooksBytes:git.git('show',`${pin.commit}:${pin.booksPath}`),
  };
  const booksPath=resolve(root,pin.booksPath),stat=lstatSync(booksPath);
  if(!stat.isFile()||stat.isSymbolicLink()||realpathSync(booksPath)!==booksPath)
    throw new Error('Historical p175 transport requires physical current Books bytes');
  const proof=assertHistoricalP175ModuleInputs({currentSummary:current.summary,historicalTree,...immutableInputs,currentBooksBytes:readFileSync(booksPath)});
  return {proof,booksPath};
}

export async function loadHistoricalP175AvailabilityModule(...args){
  if(args.length)throw new Error('Historical p175 module loader accepts no caller overrides');
  const {proof,booksPath}=qualifiedInputs();
  if(modulePromise===null){
    const source=immutableInputs.moduleBytes.toString('utf8');
    const adjusted=source.replace(['from', "'../dist/books.js'"].join(' '),`from ${JSON.stringify(pathToFileURL(booksPath).href)}`);
    modulePromise=import(`data:text/javascript;base64,${Buffer.from(adjusted).toString('base64')}`);
  }
  const production=await modulePromise;
  return Object.freeze({production,moduleBytes:Buffer.from(immutableInputs.moduleBytes),proof});
}
