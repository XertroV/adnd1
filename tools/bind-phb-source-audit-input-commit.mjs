#!/usr/bin/env node
// Add verified input provenance to new PHB geometry/raster artifacts. This does
// not alter measurements, frame validation or current/historical run policy.
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SOURCE_FRAME_BRIDGE_PATH,SOURCE_FRAME_BRIDGE_SHA256} from './source-frame-coordinate-bridge.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [mode,inputCommit]=process.argv.slice(2);
assert.ok(['--geometry','--raster'].includes(mode)&&process.argv.length===4,'usage: --geometry|--raster FULL_INPUT_COMMIT');
assert.match(inputCommit||'',/^[a-f0-9]{40}$/);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=file=>execFileSync('git',['show',`${inputCommit}:${file}`],{cwd:root,maxBuffer:40*1024*1024});
assert.equal(execFileSync('git',['rev-parse','--verify',`${inputCommit}^{commit}`],{cwd:root,encoding:'utf8'}).trim(),inputCommit);
const sourcePaths=['dist/data.json','dist/books.js','dist/scans','research/citation-continuations.json',SOURCE_FRAME_BRIDGE_PATH,'research/source_frame_coordinate_bridge.py','research/source-visual-audit.py','research/source-raster-boundary-audit.py','tools/continuation-candidates.py','tools/continuation-candidates-validate.mjs','tools/source-frame-coordinate-bridge.mjs','tools/source-raster-coverage.mjs','tools/source-visual-coverage.mjs','tools/mechanics-audit.mjs','tools/bind-phb-source-audit-input-commit.mjs'];
assert.equal(spawnSync('git',['diff','--quiet',inputCommit,'--',...sourcePaths],{cwd:root}).status,0,'source inputs/code differ from the named Git input commit');
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=all','--',...sourcePaths],{cwd:root,encoding:'utf8'}),'','source inputs/code must be committed');
const dataSha=sha(git('dist/data.json')),booksSha=sha(git('dist/books.js'));
assert.equal(dataSha,'416ebc32862105042904e40280034772a51640d1ccbba298b9b8bf5ccbf709fe');
assert.equal(booksSha,'804deee6fffd2852bc6326e33046e888c10f8f5224835b29dceb42195a571a4f');
assert.equal(sha(git(SOURCE_FRAME_BRIDGE_PATH)),SOURCE_FRAME_BRIDGE_SHA256);
const relative=mode==='--geometry'?'research/source-visual-audit-phb-source-v1.json':'research/source-raster-boundary-phb-source-v1.json.gz';
const manifest=JSON.parse(readFileSync(path.join(root,'research/citation-evidence-seals.json')));assert.ok(!manifest.seals.some(row=>row.path===relative),'sealed artifacts are immutable; generate a separately named successor');
const target=path.join(root,relative),zipped=relative.endsWith('.gz'),raw=readFileSync(target),report=JSON.parse(zipped?gunzipSync(raw):raw);
assert.equal(mode==='--geometry'?report.inputDataSha256:report.inputs.distDataSha256,dataSha);
assert.equal(report.sourceFrameCoordinateBridge?.path,SOURCE_FRAME_BRIDGE_PATH);assert.equal(report.sourceFrameCoordinateBridge?.sha256,SOURCE_FRAME_BRIDGE_SHA256);
const provenance={status:'exact-committed-source-inputs',commit:inputCommit,scope:'Source data, books, catalogs/images and producer/frame code are present in this Git commit. Derived usage-map bytes are separately recorded by path/SHA in the raster artifact.',dataSha256:dataSha,booksJsSha256:booksSha,frameRegistry:{path:SOURCE_FRAME_BRIDGE_PATH,sha256:SOURCE_FRAME_BRIDGE_SHA256},sourceCodeSha256:Object.fromEntries(sourcePaths.filter(file=>file.endsWith('.py')||file.endsWith('.mjs')).map(file=>[file,sha(git(file))]))};
const container=mode==='--geometry'?report:report.inputs;
if(container.sourceInputTree)assert.deepEqual(container.sourceInputTree,provenance,'an existing provenance binding cannot be silently replaced');else container.sourceInputTree=provenance;
const output=Buffer.from(JSON.stringify(report,null,2)+'\n');writeFileSync(target,zipped?gzipSync(output,{level:9,mtime:0}):output);
console.log(JSON.stringify({path:relative,inputCommit,sha256:sha(readFileSync(target)),measurementsOrValidationPolicyChanged:false}));
