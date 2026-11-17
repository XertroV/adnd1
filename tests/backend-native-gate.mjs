// Test-only core identity substitute; never an installed qualification.
import {readFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
export function assertClassMappingCurrentSourceIdentity(...args){if(args.length)throw Error('test core takes no args');appendFileSync(resolve(root,'calls.jsonl'),JSON.stringify({kind:'core'})+'\n');return JSON.parse(readFileSync(resolve(root,'test-state.json'))).proof;}
