import * as sync from './mm-replay-fs-v1.mjs';
export async function readFile(path,options){return sync.readFileSync(path,options);}
export async function mkdir(path,options){return sync.mkdirSync(path,options);}
export async function writeFile(path,bytes,options){return sync.writeFileSync(path,bytes,options);}
