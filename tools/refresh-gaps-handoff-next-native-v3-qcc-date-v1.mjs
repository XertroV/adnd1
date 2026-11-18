// Additive Native2 successor for the frozen v3 current-handoff producer.
// It derives generatedOn from the exact qualified M committer epoch, then
// projects that one field over the unchanged v3 builder bytes. The producer
// API below accepts no caller date, path, root, hash, or source override.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createRawGitReader, verifyRawCommit} from './class-mapping-raw-git-v1.mjs';
import {qualifyCurrentConsumerStage, currentConsumerRepoRoot} from './class-mapping-current-consumer-runtime-v2.mjs';
import {buildCurrentClassMappingGapsHandoff as buildFrozenNative2Handoff} from './refresh-gaps-handoff-next-native-v3.mjs';

const root=currentConsumerRepoRoot;
const rawGit=createRawGitReader(root);
const HANDOFF_PATH='research/class-mapping-source-epoch-v2/reports/next-native-v3/current/gaps-handoff.json';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(`Cannot build deterministic Native2 handoff: ${message}`);};
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);

// Pure validation/derivation component. This function does not confer QCC
// authority: the zero-argument builder below obtains its identity from the
// installed, fully qualified Native2 stage before calling it.
export function deriveQccUtcDateFromRawCommit(rawCommitBytes,qccIdentity){
  if(!Buffer.isBuffer(rawCommitBytes)&&!(rawCommitBytes instanceof Uint8Array))fail('raw QCC commit bytes are required');
  if(!qccIdentity||typeof qccIdentity!=='object'||Array.isArray(qccIdentity)
      ||(Object.getPrototypeOf(qccIdentity)!==Object.prototype&&Object.getPrototypeOf(qccIdentity)!==null)
      ||Reflect.ownKeys(qccIdentity).length!==3||Reflect.ownKeys(qccIdentity).some(key=>typeof key!=='string')||Object.keys(qccIdentity).sort().join(',')!=='commit,parent,tree')fail('exact raw QCC commit/tree/direct-parent identity is required');
  if(!oid(qccIdentity.commit)||!oid(qccIdentity.tree)||!oid(qccIdentity.parent))fail('qualified QCC identity must contain exact lowercase Git object IDs');
  const bytes=Buffer.from(rawCommitBytes);
  try{verifyRawCommit(bytes,qccIdentity.commit,qccIdentity.tree,qccIdentity.parent);}
  catch{fail('raw QCC object hash, tree, or single direct parent does not match the qualified M identity');}
  const header=bytes.toString('utf8').split('\n\n',1)[0].split('\n');
  const committerRows=header.filter(line=>line.startsWith('committer '));
  const match=committerRows.length===1?/^committer .+ <[^>\r\n]+> (-?[0-9]+) ([+-][0-9]{4})$/.exec(committerRows[0]):null;
  if(!match)fail('raw M must contain exactly one valid committer timestamp');
  const seconds=Number(match[1]);
  if(!Number.isSafeInteger(seconds))fail('raw M committer timestamp is outside the exact integer range');
  let date;
  try{date=new Date(seconds*1000).toISOString().slice(0,10);}
  catch{fail('raw M committer timestamp is outside the valid UTC calendar range');}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))fail('raw M timestamp did not produce a valid UTC calendar date');
  return Object.freeze({
    utcDate:date,
    committerSeconds:match[1],
    committerTimezoneOffset:match[2],
    qccIdentity:Object.freeze({commit:qccIdentity.commit,tree:qccIdentity.tree,parent:qccIdentity.parent}),
    rawCommitSha256:sha256(bytes),
  });
}

// Canonical byte projection used by the qualified builder and the preserved
// red-report replay test. It proves that only the top-level generatedOn JSON
// value changes; exact report pins remain the verifier's responsibility.
export function projectHandoffGeneratedOn(built,utcDate){
  if(!built||built.path!==HANDOFF_PATH||!Buffer.isBuffer(built.bytes))fail('the exact Native2 handoff builder output is required');
  if(typeof utcDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(utcDate))fail('qualified UTC generation date is required');
  const source=built.bytes.toString('utf8');
  let report;
  try{report=JSON.parse(source);}
  catch{fail('Native2 handoff builder did not return valid JSON');}
  const originalDate=report?.generatedOn;
  if(typeof originalDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(originalDate))fail('Native2 handoff generatedOn field must be one ISO date');
  const canonicalOriginal=Buffer.from(JSON.stringify(report,null,2)+'\n','utf8');
  if(!canonicalOriginal.equals(built.bytes))fail('Native2 handoff bytes are not the fixed canonical JSON serialization');
  const occurrences=source.match(/"generatedOn"\s*:/g)||[];
  if(occurrences.length!==1||!Object.hasOwn(report,'generatedOn'))fail('Native2 handoff must contain exactly one top-level generatedOn field');
  report.generatedOn=utcDate;
  const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n','utf8');
  const before=`"generatedOn": "${originalDate}"`;
  const after=`"generatedOn": "${utcDate}"`;
  const first=source.indexOf(before);
  if(first<0||source.indexOf(before,first+before.length)>=0)fail('cannot isolate the single generatedOn value in canonical handoff bytes');
  const expected=Buffer.from(source.slice(0,first)+after+source.slice(first+before.length),'utf8');
  if(!expected.equals(bytes))fail('date projection changed bytes outside generatedOn');
  return Object.freeze({path:built.path,bytes,report:Object.freeze(report),previousGeneratedOn:originalDate,generatedOn:utcDate,rawSha256:sha256(bytes)});
}

function sameStageIdentity(a,b){
  return isDeepStrictEqual(a?.sourceEpoch,b?.sourceEpoch)
    &&isDeepStrictEqual(a?.coreCode,b?.coreCode)
    &&isDeepStrictEqual(a?.metadata,b?.metadata)
    &&isDeepStrictEqual(a?.reportQcc,b?.reportQcc);
}
function qualifiedMDate(stage){
  const qcc=stage?.reportQcc;
  if(!qcc||!isDeepStrictEqual(qcc,stage.consumerPins?.reportQcc)
      ||qcc.parent!==stage.metadata?.commit||!oid(qcc.commit)||!oid(qcc.tree)||!oid(qcc.parent))fail('qualified stage must bind raw M as the exact single-parent child of L');
  let raw;
  try{raw=rawGit.git('cat-file','commit',qcc.commit);}
  catch{fail('cannot read the exact qualified Native2 report QCC M object');}
  return deriveQccUtcDateFromRawCommit(raw,{commit:qcc.commit,tree:qcc.tree,parent:qcc.parent});
}

export function buildCurrentClassMappingGapsHandoff(...args){
  if(args.length)fail('Native2 QCC-date handoff producer accepts no caller overrides');
  rawGit.assertView();
  const stageBefore=qualifyCurrentConsumerStage();
  const dateEvidence=qualifiedMDate(stageBefore);
  const built=buildFrozenNative2Handoff();
  if(built.path!==HANDOFF_PATH)fail('frozen Native2 handoff builder returned an unexpected output path');
  const projected=projectHandoffGeneratedOn(built,dateEvidence.utcDate);
  const stageAfter=qualifyCurrentConsumerStage();
  if(!sameStageIdentity(stageBefore,stageAfter))fail('Native2 B/K/L/M identity changed during deterministic handoff build');
  rawGit.assertView();
  return Object.freeze({
    path:projected.path,
    bytes:projected.bytes,
    report:projected.report,
    qccDateEvidence:Object.freeze({
      policy:'qualified-raw-native2-report-qcc-committer-utc-day-v1',
      sourceStage:'Native2 report QCC M',
      ...dateEvidence,
      previousGeneratedOn:projected.previousGeneratedOn,
      generatedOn:projected.generatedOn,
      sourceEpoch:Object.freeze({sourceCommit:stageBefore.sourceEpoch.sourceCommit,sourceTree:stageBefore.sourceEpoch.sourceTree,parentCommit:stageBefore.sourceEpoch.parentCommit}),
      coreCode:Object.freeze({...stageBefore.coreCode}),
      metadata:Object.freeze({...stageBefore.metadata}),
    }),
  });
}
