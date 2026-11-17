// Exact Source2 B -> gate K -> accepted metadata L -> report QCC M ancestry.
// This is intentionally separate from the historical Native1 trust boundary.
import {createRawGitReader, verifyRawCommit} from './class-mapping-raw-git-v1.mjs';
import {SOURCE_BODY_COMMIT,SOURCE_BODY_TREE,SOURCE_BODY_PARENT,SOURCE_BODY_PARENT_TREE,CORE_CODE_IDENTITY,METADATA_IDENTITY,REPORT_QCC_PARENT} from './class-mapping-report-input-contract-v3.mjs';
import {createHash} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=realpathSync(resolve(fileURLToPath(new URL('..',import.meta.url))));
const raw=createRawGitReader(root);
const fail=message=>{throw new Error(`Invalid Native2 report lineage: ${message}`);};
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
function commitRow(row,label,expectedParent){
 if(!row||!oid(row.commit)||!oid(row.tree)||!oid(row.parent)||row.parent!==expectedParent)fail(`${label}: exact commit/tree/direct parent required`);
 if(raw.git('rev-parse','--verify',`${row.commit}^{commit}`).toString('utf8').trim()!==row.commit
    ||raw.git('rev-parse','--verify',`${row.commit}^{tree}`).toString('utf8').trim()!==row.tree)fail(`${label}: raw commit or tree identity`);
 verifyRawCommit(raw.git('cat-file','commit',row.commit),row.commit,row.tree,expectedParent);
 return Object.freeze({commit:row.commit,tree:row.tree,parent:row.parent});
}
export function assertNative2Lineage({sourceEpoch,coreCode,metadata,reportQcc}){
 raw.assertView();
 if(sourceEpoch?.sourceCommit!==SOURCE_BODY_COMMIT||sourceEpoch?.sourceTree!==SOURCE_BODY_TREE||sourceEpoch?.parentCommit!==SOURCE_BODY_PARENT)fail('fixed Source2 B identity and parent');
 if(raw.git('rev-parse','--verify',`${sourceEpoch.sourceCommit}^{commit}`).toString('utf8').trim()!==sourceEpoch.sourceCommit
    ||raw.git('rev-parse','--verify',`${sourceEpoch.sourceCommit}^{tree}`).toString('utf8').trim()!==sourceEpoch.sourceTree)fail('Source2 B raw commit/tree identity');
 if(raw.git('rev-parse','--verify',`${SOURCE_BODY_PARENT}^{tree}`).toString('utf8').trim()!==SOURCE_BODY_PARENT_TREE)fail('Source2 B parent tree identity');
 verifyRawCommit(raw.git('cat-file','commit',sourceEpoch.sourceCommit),sourceEpoch.sourceCommit,sourceEpoch.sourceTree,sourceEpoch.parentCommit);
 if(!coreCode||coreCode.commit!==CORE_CODE_IDENTITY.commit||coreCode.tree!==CORE_CODE_IDENTITY.tree||coreCode.parent!==CORE_CODE_IDENTITY.parent)fail('fixed actual core K identity');
 if(!metadata||metadata.commit!==METADATA_IDENTITY.commit||metadata.tree!==METADATA_IDENTITY.tree||metadata.parent!==METADATA_IDENTITY.parent)fail('fixed actual metadata L identity');
 const k=commitRow(coreCode,'Native2 core code K',sourceEpoch.sourceCommit);
 const l=commitRow(metadata,'Native2 accepted metadata L',k.commit);
 if(reportQcc?.parent!==REPORT_QCC_PARENT)fail('M must directly parent from accepted metadata L');
 const m=commitRow(reportQcc,'Native2 report QCC M',l.commit);
 raw.assertView();
 return Object.freeze({sourceEpoch:Object.freeze({...sourceEpoch}),coreCode:k,metadata:l,reportQcc:m,ancestry:'B->K->L->M; each exact single direct parent'});
}
export function assertRawBlobSha256(commit,path,expected,readRawBlob){
 if(typeof readRawBlob!=='function'||typeof path!=='string'||!/^[a-f0-9]{64}$/.test(expected||''))fail(`invalid blob proof request for ${String(path)}`);
 const bytes=Buffer.from(readRawBlob(commit,path));
 const actual=createHash('sha256').update(bytes).digest('hex');
 if(actual!==expected)fail(`${path}: raw ${commit} blob SHA-256 differs`);
 return Object.freeze({commit,path,sha256:actual,sizeBytes:bytes.length});
}
