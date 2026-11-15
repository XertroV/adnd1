// Pure bounded assembly assertions. Installed wrapper supplies only previously
// qualified native/sealed-report rows; this is not a runtime override surface.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
const fail=message=>{throw new Error(`Class-mapping assembly: ${message}`);};
export const CORE_OUTPUTS=Object.freeze({data:'dist/data.json',priceInventory:'research/price-source-inventory.json',publishedContinuations:'dist/source-continuations.json'});
export const PUBLIC_COVERAGE_PATH='dist/coverage-gaps.json';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function safeRepoPath(value){if(typeof value!=='string'||!value||value.startsWith('/')||value.includes('\\')||/[\x00-\x1f\x7f:]/.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'||part.startsWith('-')))fail('unsafe repository path');return value;}
function byteCopy(value){if(!value||types.isProxy(value)||(Object.getPrototypeOf(value)!==Buffer.prototype&&Object.getPrototypeOf(value)!==Uint8Array.prototype))fail('native byte view required');const size=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'byteLength').get.call(value),out=new Uint8Array(size);Uint8Array.prototype.set.call(out,value);return Buffer.from(out.buffer);}
export function assertCoreReproduction(produced,readInstalled){const result=[];for(const [key,path]of Object.entries(CORE_OUTPUTS)){const candidate=byteCopy(produced[key]),actual=byteCopy(readInstalled(path));if(!candidate.equals(actual))fail(`${path}: complete precoverage serialized output differs from frozen S1`);result.push({path,sha256:sha256(candidate),sizeBytes:candidate.length,byteExact:true});}return result;}
export function buildClosedReader(rows,readPhysical){
 if(!Array.isArray(rows)||types.isProxy(rows)||typeof readPhysical!=='function')fail('closed row list and reader required');const expected=new Map(),used=new Map();
 for(const row of rows){const path=safeRepoPath(row.path),digest=row.sha256??row.rawSha256;if(!/^[a-f0-9]{64}$/.test(digest||''))fail(`${path}: missing exact raw SHA`);if(expected.has(path)&&expected.get(path).sha256!==digest)fail(`${path}: stage hash obligations disagree`);expected.set(path,{path,sha256:digest,sizeBytes:row.sizeBytes});}
 function read(path){const pin=expected.get(safeRepoPath(path));if(!pin)fail(`${path}: coverage dependency is outside the closed native/report/QCC manifests`);const bytes=byteCopy(readPhysical(path));if(sha256(bytes)!==pin.sha256||(pin.sizeBytes!==undefined&&bytes.length!==pin.sizeBytes))fail(`${path}: qualified physical bytes changed`);used.set(path,pin);return bytes;}
 return Object.freeze({read,recheck(){for(const path of used.keys())read(path);},used(){return [...used.values()].map(row=>({...row})).sort((a,b)=>a.path.localeCompare(b.path));}});
}
export function selectCoverageReports(receipt,scanAlias,legacyAliases){
 if(!receipt||!Array.isArray(receipt.outputs))fail('verified report receipt required');const pick=kind=>{const rows=receipt.outputs.filter(row=>row.kind===kind);if(rows.length!==1)fail(`exact one ${kind} output required`);safeRepoPath(rows[0].path);return rows[0];};
 const handoff=pick('current-gaps-handoff-snapshot'),coverage=pick('current-coverage-gaps-snapshot'),scan=pick('current-source-scan-inventory');
 if(scanAlias.logicalPath!=='tests/fixtures/source-scan-inventory.json'||scanAlias.physicalPath!==scan.path||receipt.sourceScanLegacyAlias?.logicalPath!==scanAlias.logicalPath||receipt.sourceScanLegacyAlias?.physicalPath!==scan.path||receipt.sourceScanLegacyAlias?.rawSha256!==scan.rawSha256)fail('closed fresh source-scan alias differs from verified receipt');
 const expectedAliases=[{logicalPath:'research/gaps-limitations-next-task.json',physicalPath:handoff.path,rawSha256:handoff.rawSha256},{logicalPath:scanAlias.logicalPath,physicalPath:scan.path,rawSha256:scan.rawSha256}];
 if(!isDeepStrictEqual(receipt.currentReportLegacyAliases,expectedAliases)||!isDeepStrictEqual(legacyAliases,expectedAliases.map(({logicalPath,physicalPath})=>({logicalPath,physicalPath}))))fail('closed handoff/source-scan logical aliases differ from verified receipt');
 if(handoff.path==='research/gaps-limitations-next-task.json'||coverage.path===PUBLIC_COVERAGE_PATH||scan.path===scanAlias.logicalPath)fail('fresh report namespace must preserve old snapshots');return {handoff,coverage,scan};
}
export function assertCoverageReproduction(rebuilt,bytes){const expected=JSON.parse(byteCopy(bytes).toString('utf8'));if(!isDeepStrictEqual(rebuilt,expected))fail('coverage findings/metadata differ from committed qualified fresh report');return byteCopy(bytes);}
