// Strict single Source2 shard runner. Always selects from the fixed four-shard roster.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSource2Tests} from './class-mapping-source2-test-runner-core-v3.mjs';
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) runSource2Tests({mode:'shard',argv:process.argv.slice(2)}).catch(error=>{process.stderr.write(`${error.stack??error}\n`);process.exitCode=1;});
