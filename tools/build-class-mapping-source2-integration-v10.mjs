// Development materializer. The final manifest comes only from a closed literal pin.
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {SOURCE2_V10_REPO_ROOT as root,SOURCE2_V10_ACCEPTANCE_PIN,SOURCE2_V10_MANIFEST_PIN,readFixedV10Pin} from './class-mapping-source2-v10-accepted-manifest-v1.mjs';
import {validateSource2V10OverlayDocument} from './class-mapping-source2-test-roster-v3.mjs';
const check=(ok,m)=>{if(!ok)throw Error('Source2 v10 builder: '+m);},sha=b=>createHash('sha256').update(b).digest('hex');
function create(name,text){const path=resolve(root,'artifacts/source2-v10-integration',name);check(!existsSync(path),'append-only output already exists');mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,text,{flag:'wx',mode:0o600});}
export function buildClosedSource2V10Integration(...args){
 check(args.length===0&&process.argv.length===2,'zero arguments; no caller root/hash/count/manifest override');
 const accepted=JSON.parse(readFixedV10Pin(SOURCE2_V10_ACCEPTANCE_PIN));
 check(accepted.status==='ROOT_ACCEPTED_CLOSED_V10_INTEGRATION'&&Array.isArray(accepted.pending)&&accepted.pending.length===0,'no provisional target or code');
 // This input is already closed, independently reviewed, and hash-pinned.
 // An arbitrary developer parameter file never becomes runtime trust.
 const doc=accepted.migration,checked=validateSource2V10OverlayDocument(doc);
 const text=JSON.stringify(doc,null,2)+'\n',pin={path:SOURCE2_V10_MANIFEST_PIN.path,sha256:sha(Buffer.from(text)),sizeBytes:Buffer.byteLength(text),status:'SEALED_CLOSED_ACCEPTANCE'};
 const source=readFileSync(resolve(root,'tools/class-mapping-source2-v10-accepted-manifest-v1.mjs'),'utf8'),lines=source.split('\n'),matches=lines.map((line,i)=>line.startsWith('export const SOURCE2_V10_MANIFEST_PIN=Object.freeze(')?i:-1).filter(i=>i>=0);
 check(matches.length===1,'one fixed named manifest-pin declaration');lines[matches[0]]='export const SOURCE2_V10_MANIFEST_PIN=Object.freeze('+JSON.stringify(pin)+');';
 create('finite-225-family-migration-v10.json',text);create('class-mapping-source2-v10-accepted-manifest-v1.mjs',lines.join('\n'));create('closed-build-receipt-v1.json',JSON.stringify({status:'CLOSED_OUTPUTS_MATERIALIZED_NOT_RUNTIME_QUALIFIED',manifestPin:pin,acceptancePin:SOURCE2_V10_ACCEPTANCE_PIN,counts:checked.expected,source3063AndOld104175Unchanged:true},null,2)+'\n');
 return {manifestPin:pin,counts:checked.expected};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))try{process.stdout.write(JSON.stringify(buildClosedSource2V10Integration())+'\n');}catch(error){process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;}
