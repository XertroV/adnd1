// Explicit finite Source2 current suite runner; no tests/*.mjs wildcard.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSource2Tests} from './class-mapping-source2-test-runner-core-v1.mjs';
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) runSource2Tests({mode:'full',argv:process.argv.slice(2),entrypointPath:'tools/run-class-mapping-tests-source2-full-v1.mjs'}).catch(error=>{process.stderr.write(`${error.stack??error}\n`);process.exitCode=1;});
