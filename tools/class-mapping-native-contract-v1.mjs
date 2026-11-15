// Pure research construction/assertion core. A closed fixture is NOT an
// installed source qualification; only the separately pinned native loader can
// qualify physical committed inputs. No old eager reader is imported.
import {createHash} from 'node:crypto';
import {types,TextDecoder} from 'node:util';
import {posix} from 'node:path';
import {FROZEN_PARENT_ARTIFACTS,FROZEN_CALLER_BOUNDARY} from './class-mapping-frozen-parent-artifacts-v1.mjs';

export const STAGE = 's1-body-native';
export const ARTIFACT = 'Closed class mapping native S1 body cohort';
export const MM_SOURCE = '0f2d70a135e3ad486152bf00f21387d60a1a97ef';
export const MM_FIXTURE_PATH = 'tests/fixtures/mm-treasure-current-m1-cohort-v1.json';
export const MM_FIXTURE_SHA = '7456f0269d85df85900332ec535f495c93623c71752fb4d280a9174ca6337550';
export const MM_CANONICAL = Object.freeze({data:'6c011deacbbc9bceeda2027c68a21176b22e82019a9f08095845eec560ca5c07',inventory:'2fa99e2bdd9c492cc92b3567931b04bf7f53b84e501e5d2c59e04d25f1fb6297',manual:'b3951ae14f85a3d67aa445f1b6da82256cbae5a3d3e4a84891869b4008c0dd02',mechanics:'2687b387b4b67e28cca46d62fd75317767fbe50aa3e8cfc12c4608155a2d07c6'});
export const ANCESTOR_PREFIX = Object.freeze(['1f79d909344ebe7d41a432d8673f3eedb491fa3b','bc819621e49788260bb34ea47c1f7a8b35af6edf','5c6a57386af372c7c0d89e342003a7edf68ca0dd',MM_SOURCE]);
export const NEW_RULE_IDS = Object.freeze(['dwarf-languages-vision','elf-languages-vision','gnome-languages-vision','phb-racial-preferences','ua-cavalier-xp-table-i','ua-druid-xp-table-i']);
export const SNAPSHOT_PATHS = Object.freeze({data:'dist/data.json',inventory:'research/price-source-inventory.json',manual:'research/field-evidence-bindings.json',mechanics:'research/mechanics-audit-progress.json'});
export const REQUIRED_SOURCE_PATHS = Object.freeze([
  ...Object.values(SNAPSHOT_PATHS),'rules.json','classes.json','equipment.json','attack-matrices.json',
  'phb-spell-index.json','ua-spell-index.json','phb-spells.json','phb-magic-user-extra.json','ua-spells.json',
  'citation-overrides.json','progression-overrides.json','dist/books.js','dist/app.js','dist/search.js','dist/source-viewer.js',
  'dist/source-continuations.json','research/citation-continuations.json','research/source-visual-reviews.json','research/mechanics-audit-progress.md',
  'tools/build-class-mapping-source-body-v1.mjs','tools/assemble.mjs','tools/price-source-inventory.mjs','tools/mechanics-audit.mjs',
  'tools/mechanics-citation-page-transfer.mjs','research/s1-mechanics-append-review-preservation-v1/source-receipt-v1.json',
  'dist/scans/verified/rules-mm-treasure-type-use.json','dist/scans/verified/rules-mm-treasure-types-table.json',
  'dist/scans/verified/mm-p100-carnivorous-whale-treasure-216dpi.png','dist/scans/verified/mm-p14-centaur-double-treasure-216dpi.png',
  'dist/scans/verified/mm-p31-dragon-treasure-216dpi.png','dist/scans/verified/mm-p5-lair-treasure-type-216dpi.png',
  'dist/scans/verified/mm-p5-number-appearing-216dpi.png','dist/scans/verified/mm-p74-nymph-treasure-context-216dpi-v2.png',
  'dist/scans/verified/mm-treasure-types-p105-complete-table.png',
]);
const fail = message => {throw new Error(`Invalid class mapping native body: ${message}`);};
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
export const canonicalSha = value => sha256(Buffer.from(canonical(value)));
export const objectSha = value => sha256(Buffer.from(JSON.stringify(value)));
export const equal = (left,right) => canonical(left) === canonical(right);
export const check = (condition,message) => {if (!condition) fail(message);};

export function assertPlainJson(value,label='value',active=new Set()) {
  check(Object.getPrototypeOf(Object.prototype) === null && Object.getPrototypeOf(Array.prototype) === Object.prototype,'plain global prototype chains');
  check(!Object.hasOwn(Object.prototype,'toJSON') && !Object.hasOwn(Array.prototype,'toJSON'),'inherited serialization hooks');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {check(Number.isFinite(value) && !Object.is(value,-0),`${label}: non-JSON number`);return;}
  check(typeof value === 'object' && !types.isProxy(value),`${label}: non-JSON value or proxy`);
  check(!active.has(value),`${label}: cycle`);
  const array=Array.isArray(value),keys=Reflect.ownKeys(value);
  check(Object.getPrototypeOf(value) === (array ? Array.prototype : Object.prototype),`${label}: non-plain prototype`);
  if (array) {
    const length=Object.getOwnPropertyDescriptor(value,'length');
    check(length && Object.hasOwn(length,'value') && length.value === value.length && length.writable && !length.enumerable && !length.configurable && keys.length === value.length+1,`${label}: sparse/extra/decorated array`);
  }
  active.add(value);
  for (const key of keys) {
    if (array && key === 'length') continue;
    check(typeof key === 'string',`${label}: symbol property`);
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    check(descriptor && Object.hasOwn(descriptor,'value') && descriptor.enumerable && descriptor.writable && descriptor.configurable,`${label}: hidden/frozen/accessor property`);
    if (array) check(/^(0|[1-9]\d*)$/.test(key) && Number(key)<value.length,`${label}: non-index array property`);
    assertPlainJson(descriptor.value,`${label}/${key}`,active);
  }
  active.delete(value);
}
export function copyNativeBytes(value,label='bytes') {
  check(value && typeof value === 'object' && !types.isProxy(value),`${label}: raw byte view required`);
  check(Object.getPrototypeOf(value) === Buffer.prototype || Object.getPrototypeOf(value) === Uint8Array.prototype,`${label}: Buffer/plain Uint8Array required`);
  const prototype=Object.getPrototypeOf(Uint8Array.prototype),getter=Object.getOwnPropertyDescriptor(prototype,'byteLength').get;
  let length;try {length=getter.call(value);} catch {fail(`${label}: invalid/detached view`);}
  const copy=new Uint8Array(length);try {Uint8Array.prototype.set.call(copy,value);} catch {fail(`${label}: detached view`);}
  return Buffer.from(copy.buffer,copy.byteOffset,copy.byteLength);
}
export function parseBytes(value,label) {const bytes=copyNativeBytes(value,label);let result;try {result=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));} catch {fail(`${label}: invalid UTF-8/JSON`);}assertPlainJson(result,label);return result;}
export function exactKeys(value,keys,label) {check(value && !Array.isArray(value) && equal(Object.keys(value).sort(),[...keys].sort()),`${label}: exact closed key set`);}
export function assertDataRecord(value,label) {
  check(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype,`${label}: plain data record`);
  for(const key of Reflect.ownKeys(value)){check(typeof key==='string',`${label}: symbol key`);const descriptor=Object.getOwnPropertyDescriptor(value,key);check(descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.enumerable&&descriptor.writable&&descriptor.configurable,`${label}: accessor/hidden/frozen property`);}
}
export function repoPath(path) {check(typeof path === 'string' && !!path && !path.startsWith('/') && !path.includes('\\') && path.split('/').every(part => part && part !== '.' && part !== '..'),`unsafe repository path ${String(path)}`);return path;}
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
export function assertFileRows(rows,label) {
  check(Array.isArray(rows) && rows.length>0,`${label}: nonempty closed manifest`);
  const seen=new Set();
  for (const row of rows) {
    exactKeys(row,['path','sha256','sizeBytes','kind'],label);repoPath(row.path);
    check(!seen.has(row.path),`${label}: duplicate path`);seen.add(row.path);
    check(digest(row.sha256) && integer(row.sizeBytes) && ['json','png','code','metadata'].includes(row.kind),`${label}: hash/size/type`);
    check(!/\.(?:pdf|jpe?g)$/i.test(row.path) && !(row.kind==='png' && /full[-_ ]?page/i.test(row.path)),`${label}: unauthorized full source asset`);
  }
  check(equal(rows.map(row => row.path),rows.map(row => row.path).sort()),`${label}: deterministic sorted order`);
  return seen;
}
export function assertSourceEpoch(epoch) {
  exactKeys(epoch,['stage','sourceCommit','sourceTree','parentCommit','parentTree','requiredAncestry'],'sourceEpoch');
  check(epoch.stage===STAGE && [epoch.sourceCommit,epoch.sourceTree,epoch.parentCommit,epoch.parentTree].every(commit),'actual S1 commit/tree and parent identities required');
  check(epoch.sourceCommit!==MM_SOURCE && epoch.sourceCommit!==epoch.parentCommit,'source must be a new real body commit');
  check(Array.isArray(epoch.requiredAncestry) && epoch.requiredAncestry.length>=6 && equal(epoch.requiredAncestry.slice(0,4),ANCESTOR_PREFIX),'fixed MM/H/V29 ancestor prefix');
  check(epoch.requiredAncestry.every(commit) && new Set(epoch.requiredAncestry).size===epoch.requiredAncestry.length,'unique real ancestry identities');
  check(epoch.requiredAncestry.at(-2)===epoch.parentCommit && epoch.requiredAncestry.at(-1)===epoch.sourceCommit,'actual parent/source ancestry suffix');
}
export const BODY_PRODUCER_ROOTS = Object.freeze(['tools/build-class-mapping-source-body-v1.mjs','tools/price-source-inventory.mjs','tools/published-continuations.mjs','tools/scan-catalog.mjs','tools/citation-override-identity.mjs','tools/mechanics-audit.mjs','tools/dmg175-availability-projection.mjs','dist/books.js']);
// Static local-import membership, not arbitrary I/O tracing. The monolithic
// assembler is hashed as prefix input, never imported by the body builder, so
// its post-coverage imports are deliberately not traversal roots.
export function assertProducerImportClosure(files) {
  const pending=[...BODY_PRODUCER_ROOTS],seen=new Set(),edges=[];
  while(pending.length){const path=pending.shift();if(seen.has(path))continue;seen.add(path);check(files.has(path),`${path}: missing body producer source pin`);const bytes=copyNativeBytes(files.get(path),path),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)){const target=repoPath(posix.normalize(posix.join(posix.dirname(path),match[1])));check(files.has(target),`${path} -> ${target}: unpinned static local producer import`);edges.push({from:path,to:target});if(/\.(?:mjs|js)$/.test(target))pending.push(target);}}
  return edges.sort((a,b)=>(a.from+'\0'+a.to).localeCompare(b.from+'\0'+b.to));
}
export function assertDirectParentGitOutput(output,epoch) {
  const text=typeof output==='string'?output:new TextDecoder('utf-8',{fatal:true}).decode(copyNativeBytes(output,'Git parent stdout'));
  const tokens=text.trim().split(/\s+/);
  check(tokens.length===2 && tokens[0]===epoch.sourceCommit && tokens[1]===epoch.parentCommit,'S1 must have exactly one direct Git parent equal to parentCommit');
}
const stripTransport = value => Array.isArray(value) ? value.map(stripTransport) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => !['evidenceBindings','regionReviews'].includes(key)).map(([key,child]) => [key,stripTransport(child)])) : value;
export const mechanicsDataSha = data => objectSha(stripTransport(data));
const ownerArrays = data => Object.fromEntries(['rules','spells','equipment','classes','matrices'].map(key => [key,data[key]]).concat([['progressionExplainer',data.progressionExplainer ? [data.progressionExplainer] : []]]));
const countsBy = values => Object.fromEntries([...values.reduce((map,value) => map.set(value,(map.get(value)||0)+1),new Map())].sort(([a],[b]) => a.localeCompare(b)));
export function assertMechanicsStructure(mechanics) {
  assertPlainJson(mechanics,'mechanics');
  check(Array.isArray(mechanics.records) && mechanics.counts && Array.isArray(mechanics.reviewRecords),'mechanics record/count/review arrays');
  const owners=new Set(),fields=new Set();let total=0,unchecked=0;
  for(const owner of mechanics.records){check(['rules','spells','equipment','classes','matrices','progressionExplainer'].includes(owner.collection)&&typeof owner.id==='string'&&!!owner.id.trim(),'typed mechanics collection and owner ID');const ownerKey=canonical([owner.collection,owner.id]);check(!owners.has(ownerKey)&&Array.isArray(owner.fields),'unique mechanics owner');owners.add(ownerKey);for(const field of owner.fields){check(typeof field.path==='string'&&field.path.startsWith('/')&&!/~(?![01])/u.test(field.path),'mechanics JSON pointer');const key=canonical([owner.collection,owner.id,field.path]);check(!fields.has(key),'duplicate mechanics field identity');fields.add(key);total++;if(field.status==='unchecked')unchecked++;}}
  check(mechanics.counts.records===mechanics.records.length && mechanics.counts.totalFields===total && mechanics.counts.uncheckedFields===unchecked,'mechanics actual cardinalities match reported counts');
  return {owners:owners.size,fields:fields.size};
}
export function assertOfficialMechanicsProjection(snapshot,official) {
  assertPlainJson(snapshot,'mechanics snapshot');assertPlainJson(official,'official mechanics projection');
  check(snapshot.mechanics&&equal(snapshot.mechanics,official),'entire current ledger equals pinned official buildLedger projection, including all owner/path/value/status arrays and order');
  check(official.input.sha256===mechanicsDataSha(snapshot.data)&&official.counts.staleProposalFields===0&&official.validation.staleChanges.length===0&&official.validation.orphanReviews.length===0,'official whole-body mechanics input/zero-stale/orphan check');
  return canonicalSha(official);
}
export function measureBody(snapshot) {
  assertPlainJson(snapshot,'snapshot');exactKeys(snapshot,['data','inventory','manual','mechanics'],'snapshot');
  const {data,inventory,manual,mechanics}=snapshot,arrays=ownerArrays(data);
  check(Object.values(arrays).every(Array.isArray),'all owner collections are arrays');
  const ownersByCollection=Object.fromEntries(Object.entries(arrays).map(([key,values]) => [key,values.length]));
  check(Array.isArray(inventory.fieldEvidenceBindings) && Array.isArray(manual.bindings),'canonical/manual arrays required');
  const canonicalBindings=inventory.fieldEvidenceBindings;
  if(mechanics)assertMechanicsStructure(mechanics);
  return {
    ownersByCollection,owners:Object.values(ownersByCollection).reduce((a,b)=>a+b,0),canonicalBindings:canonicalBindings.length,manualBindings:manual.bindings.length,
    canonicalReviewStatuses:countsBy(canonicalBindings.map(binding=>binding.reviewStatus)),manualReviewStatuses:countsBy(manual.bindings.map(binding=>binding.reviewStatus)),
    mechanics:mechanics ? {records:mechanics.records.length,totalFields:mechanics.counts.totalFields,uncheckedFields:mechanics.counts.uncheckedFields,reviewRecords:mechanics.reviewRecords.length,inputMatchesCurrentData:mechanics.input.sha256===mechanicsDataSha(data)} : null,
  };
}
export const canonicalTargetKey = binding => canonical({collection:binding.collection,itemId:binding.itemId,fieldPointer:binding.fieldPointer,sourceObjectPointer:binding.sourceObjectPointer,sourceCategory:binding.sourceCategory,book:binding.book,printedPage:binding.printedPage,pdfPage:binding.pdfPage,catalog:binding.catalog,regionIds:binding.regionIds||[]});
const party = binding => binding.collection==='rules' && binding.itemId==='appendix-c-party-magic-distribution' && /^\/table\/rows\/(?:[0-9]|1[0-2])$/.test(binding.fieldPointer) && binding.sourceObjectPointer===`${binding.fieldPointer}/sourceReference`;
const omit = (value,keys) => Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));
export function assertRetainedCanonicalPair(old,now) {
  assertPlainJson(old,'old canonical');assertPlainJson(now,'current canonical');
  if(equal(old,now))return null;
  if(party(old)) {
    check(party(now)&&equal(omit(old,['reviewStatus','regionEvidence','expectedRegionEvidence','targetReview']),omit(now,['reviewStatus','regionEvidence','expectedRegionEvidence','targetReview'])),'Party canonical four-property whitelist');
    check(old.reviewStatus==='field-target-pending'&&now.reviewStatus==='field-target-reviewed','exact Party canonical location transition');
    check(old.regionEvidence.length===1&&now.regionEvidence.length===1&&equal(omit(old.regionEvidence[0],['contentSha256']),omit(now.regionEvidence[0],['contentSha256'])),'Party region source/image/focus unchanged; content rebind only');
    const expected=Object.fromEntries(['regionId','sourceSha256','imageSha256','focusSha256','contentSha256'].map(key=>[key,now.regionEvidence[0][key]]));
    check(equal(now.expectedRegionEvidence,[expected]),'Party expected evidence equals current exact region');
    check(equal(now.targetReview,{status:'confirmed',independent:true,scope:'party-magic-exact-row-location-only',evidence:'research/dmg175-party-magic-current-h-readiness-v2/current-location-review-v2.json',evidenceSha256:'1b5cf48445b65f80dbf411bac7e80a2bf0b5ff0cd1df246068409b65c06ee374'}),'exact accepted Party location receipt');
    return 'party-location-only-content-rebind';
  }
  check(old.collection==='rules'&&old.itemId==='racial-ability-adjustments'&&old.fieldPointer===''&&old.sourceCategory==='record-page-reference'&&old.printedPage===15&&equal(omit(old,['sourcePages']),omit(now,['sourcePages']))&&equal(old.sourcePages,[15])&&equal(now.sourcePages,[14,15,16,17]),'only the exact racial source-page transport exception may change another retained canonical object');
  return 'racial-source-page-scope';
}
export function assertPendingManual(binding) {
  assertPlainJson(binding,'pending manual');
  check(binding.reviewStatus==='field-target-pending' && (!Object.hasOwn(binding,'targetReview') || binding.targetReview===null) && binding.sourceValueStatus==='not-assessed-by-field-target-review' && binding.contextStatus==='context-not-assessed','new manual target pending on all axes; raw null/absent review retained');
}
export function deriveOldOwnerPreservation(beforeData,afterData) {
  assertPlainJson(beforeData,'before data');assertPlainJson(afterData,'after data');
  const regionCounts=new Map([
    ['rules:strength-exceptional',[4,25]],['rules:intelligence-learning',[3,5]],['rules:racial-ability-adjustments',[4,13]],
    ['rules:half-elf-traits',[1,2]],['rules:halfling-resistance',[1,2]],['classes:paladin',[24,29]],['classes:ua-paladin',[26,31]],
  ]);
  const additions=new Set([
    'rules:strength-exceptional/table','rules:strength-exceptional/sourceReferences',
    'rules:intelligence-learning/references','rules:intelligence-learning/sourceReferences',
    'rules:racial-ability-adjustments/table','rules:racial-ability-adjustments/sourceReferences',
    'rules:half-elf-traits/references','rules:half-elf-traits/sourceReferences',
    'rules:halfling-resistance/references','rules:halfling-resistance/sourceReferences',
    'classes:paladin/classAbilities','classes:ua-paladin/classAbilities','classes:ua-paladin/classAbilityInheritance',
    'classes:ua-cavalier/sourceTableLinks','classes:ua-druid/sourceTableLinks',
  ]);
  const appends=new Map([['rules:intelligence-learning/bullets',2],['rules:half-elf-traits/bullets',1],['rules:halfling-resistance/bullets',1]]);
  const exceptions=[],projection=[];
  const record=(owner,path,kind,old,now)=>exceptions.push({owner,path,kind,beforeSha256:old===undefined?null:canonicalSha(old),afterSha256:canonicalSha(now)});
  function compare(old,now,owner,path='') {
    if(equal(old,now))return;
    const key=owner+path;
    if(path==='/sourceExcerpts/regionCount' && regionCounts.has(owner)){check(equal([old,now],regionCounts.get(owner)),`${key}: exact reviewed region-count successor`);record(owner,path,'explicit-source-region-count',old,now);return;}
    if(key==='rules:racial-ability-adjustments/pages'){check(equal(old,[15])&&equal(now,[14,15,16,17]),'exact PHB14/15/16/17 source-scope expansion');record(owner,path,'explicit-source-page-scope',old,now);return;}
    if(appends.has(key)){check(Array.isArray(old)&&Array.isArray(now)&&now.length===old.length+appends.get(key)&&equal(now.slice(0,old.length),old),`${key}: retain exact old ordered bullets`);record(owner,path,'authorized-append',old,now);return;}
    check(old!==null&&now!==null&&typeof old==='object'&&typeof now==='object'&&Array.isArray(old)===Array.isArray(now),`${key}: unauthorized old scalar/source value change`);
    if(Array.isArray(old)){check(old.length===now.length,`${key}: unauthorized array length`);for(let i=0;i<old.length;i++)compare(old[i],now[i],owner,`${path}/${i}`);return;}
    for(const child of Object.keys(old)){check(Object.hasOwn(now,child),`${key}/${child}: old source field removed`);compare(old[child],now[child],owner,`${path}/${child}`);}
    for(const child of Object.keys(now))if(!Object.hasOwn(old,child)){const at=`${path}/${child}`;check(additions.has(owner+at),`${owner}${at}: unauthorized new field on old owner`);record(owner,at,'authorized-new-source-field',undefined,now[child]);}
  }
  for(const [collection,oldOwners]of Object.entries(ownerArrays(beforeData))) {
    const byId=new Map(ownerArrays(afterData)[collection].map(owner=>[owner.id,owner]));
    for(const old of oldOwners){const now=byId.get(old.id);check(!!now,'old owner exists');const a=stripTransport(old),b=stripTransport(now),owner=`${collection}:${old.id}`;compare(a,b,owner);projection.push([owner,canonicalSha(a),canonicalSha(b)]);}
  }
  check(projection.length===1064,'complete1064 old-owner denominator');
  check(equal(beforeData.sources,afterData.sources),'all old source metadata retained');
  for(const key of ['date','coverage','sourceFilesDeployed'])check(equal(beforeData.release[key],afterData.release[key]),`release ${key}: prior scope retained`);
  check(exceptions.length===26,'exact26 bounded source-field/append/count exceptions');
  return {oldOwners:projection.length,ownerProjectionSha256:canonicalSha(projection),sourceFieldExceptions:exceptions};
}
function uniqueBindings(bindings,label) {const map=new Map();for(const binding of bindings){const key=canonicalTargetKey(binding);check(!map.has(key),`${label}: duplicate complete target key`);map.set(key,binding);}return map;}
export function derivePreservation(before,after,{requireMechanics=true}={}) {
  assertPlainJson(before,'before');assertPlainJson(after,'after');
  for(const [key,digest]of Object.entries(MM_CANONICAL))check(canonicalSha(before[key])===digest,`${key}: exact frozen MM parent required, not caller-authored preimage`);
  const oldManual=before.manual.bindings,newManual=after.manual.bindings;
  check(oldManual.length===1293 && newManual.length===1391,'manual1293 plus exactly98');
  const changedManual=[];
  for(let index=0;index<oldManual.length;index++) {
    const old=oldManual[index],now=newManual[index];
    if(equal(old,now))continue;
    check(party(old) && party(now),'only Party13 manual prefix records may change');
    check(equal(omit(old,['reviewStatus','expectedRegionEvidence','targetReview']),omit(now,['reviewStatus','expectedRegionEvidence','targetReview'])),'manual prefix three-property whitelist');
    check(now.reviewStatus==='field-target-reviewed' && now.targetReview?.status==='confirmed' && now.targetReview.independent===true && now.targetReview.scope==='party-magic-exact-row-location-only','Party location-only review state');
    check(now.sourceValueStatus==='not-assessed-by-field-target-review' && now.contextStatus==='context-not-assessed','Party value/context unchanged');
    check(now.printedPage===(index>=0 && Number(now.fieldPointer.split('/').at(-1))===12 ? 176 : 175) && now.pdfPage===(Number(now.fieldPointer.split('/').at(-1))===12 ? 176 : null),'Party typed medium/page');
    changedManual.push({index,key:canonicalTargetKey(now),beforeSha256:canonicalSha(old),afterSha256:canonicalSha(now)});
  }
  check(changedManual.length===13 && new Set(changedManual.map(row=>row.key)).size===13,'exactly13 changed Party manual targets');
  const suffix=newManual.slice(1293);
  for(const binding of suffix)assertPendingManual(binding);
  check(equal(countsBy(suffix.map(binding=>Object.hasOwn(binding,'targetReview')?'explicit-null':'absent-raw-field')),{'absent-raw-field':39,'explicit-null':59}),'exact59 explicit-null and39 absent raw review states retained');
  const oldCanonical=before.inventory.fieldEvidenceBindings,current=uniqueBindings(after.inventory.fieldEvidenceBindings,'current canonical'),oldKeys=uniqueBindings(oldCanonical,'old canonical');
  check(oldCanonical.length===5731,'frozen5731 canonical denominator');
  const retained=[],reviewed=[],mm=[],canonicalExceptions=[];
  for(const old of oldCanonical) {
    const now=current.get(canonicalTargetKey(old));check(!!now,'every old canonical tuple retained');
    const exception=assertRetainedCanonicalPair(old,now);if(exception)canonicalExceptions.push({key:canonicalTargetKey(old),kind:exception,beforeSha256:canonicalSha(old),afterSha256:canonicalSha(now)});
    for(const key of ['reviewStatus','sourceValueStatus','contextStatus','targetReview']) if(!party(old)) check(equal(old[key]??null,now[key]??null),`old canonical ${key} unchanged`);
    if(old.reviewStatus==='field-target-reviewed'){check(equal(old,now),'all760 old reviewed whole canonical objects exact');reviewed.push(canonicalSha(now));}
    if(old.collection==='rules' && ['mm-treasure-types-table','mm-treasure-type-use'].includes(old.itemId)){check(equal(old,now),'MM76 canonical whole objects exact');mm.push(canonicalSha(now));}
    retained.push({key:canonicalTargetKey(old),beforeSha256:canonicalSha(old),afterSha256:canonicalSha(now)});
  }
  check(reviewed.length===760 && mm.length===76,'760 reviewed and76 MM canonical retained');
  check(canonicalExceptions.length===14&&canonicalExceptions.filter(row=>row.kind==='party-location-only-content-rebind').length===13,'exact13 Party plus1 racial canonical transport exceptions');
  for(const binding of suffix){const match=current.get(canonicalTargetKey(binding));check(!!match && match.reviewStatus==='field-target-pending' && match.targetReview===null,'each new manual target joins one pending canonical record with normalized null review');}
  for(const [collection,oldOwners] of Object.entries(ownerArrays(before.data))) {
    const newOwners=ownerArrays(after.data)[collection],ids=new Set(oldOwners.map(owner=>owner.id));
    check(equal(newOwners.filter(owner=>ids.has(owner.id)).map(owner=>owner.id),oldOwners.map(owner=>owner.id)),`${collection}: old owner order`);
    if(collection==='rules')check(equal(newOwners.filter(owner=>!ids.has(owner.id)).map(owner=>owner.id),NEW_RULE_IDS),'exact six new rule owner order');
    else check(newOwners.length===oldOwners.length,`${collection}: no extra owner`);
  }
  let mechanicsProjection=null;
  if(requireMechanics) {
    assertMechanicsStructure(after.mechanics);
    check(after.mechanics && after.mechanics.input.sha256===mechanicsDataSha(after.data),'mechanics must be regenerated for current data');
    check(equal(before.mechanics.reviewRecords,after.mechanics.reviewRecords) && before.mechanics.reviewRecords.length===1215,'all1215 mechanics reviews exact');
    const currentFields=new Map(after.mechanics.records.flatMap(owner=>owner.fields.map(field=>[canonical([owner.collection,owner.id,field.path]),field]))),retainedFields=[];
    const oldKeys=new Set(before.mechanics.records.flatMap(owner=>owner.fields.map(field=>canonical([owner.collection,owner.id,field.path]))));
    const oldOwners=new Set(before.mechanics.records.map(owner=>canonical([owner.collection,owner.id])));
    check(equal(after.mechanics.records.filter(owner=>oldOwners.has(canonical([owner.collection,owner.id]))).map(owner=>[owner.collection,owner.id]),before.mechanics.records.map(owner=>[owner.collection,owner.id])),'old mechanics owner array order retained');
    const byOwner=new Map(after.mechanics.records.map(owner=>[canonical([owner.collection,owner.id]),owner]));
    for(const owner of before.mechanics.records){const current=byOwner.get(canonical([owner.collection,owner.id])),paths=new Set(owner.fields.map(field=>field.path));check(equal(current.fields.filter(field=>paths.has(field.path)).map(field=>field.path),owner.fields.map(field=>field.path)),'old mechanics field array relative order retained');}
    for(const owner of before.mechanics.records)for(const field of owner.fields){const key=canonical([owner.collection,owner.id,field.path]),now=currentFields.get(key);check(equal(field,now),`old mechanics whole field unchanged ${key}`);retainedFields.push([key,canonicalSha(now)]);}
    check(retainedFields.length===14201,'old14201 mechanics fields retained');
    const addedFields=after.mechanics.records.flatMap(owner=>owner.fields.filter(field=>!oldKeys.has(canonical([owner.collection,owner.id,field.path]))).map(field=>({collection:owner.collection,id:owner.id,field})));
    check(addedFields.length===40&&addedFields.every(row=>row.field.status==='unchecked'&&row.field.inspected===false),'exact40 new mechanics fields remain unchecked and uninspected');
    mechanicsProjection={oldFields:retainedFields.length,retainedFieldsSha256:canonicalSha(retainedFields),oldReviewRecordsSha256:canonicalSha(after.mechanics.reviewRecords),newFields:40,newFieldsSha256:canonicalSha(addedFields),officialLedgerProjectionSha256:canonicalSha(after.mechanics)};
  }
  return {sourceOwners:deriveOldOwnerPreservation(before.data,after.data),changedManual,manualSuffixSha256:canonicalSha(suffix),manualSuffixCount:98,manualSuffixTargetReviewStates:countsBy(suffix.map(binding=>Object.hasOwn(binding,'targetReview')?'explicit-null':'absent-raw-field')),retainedCanonicalCount:oldKeys.size,retainedCanonicalProjectionSha256:canonicalSha(retained),retainedCanonicalExceptions:canonicalExceptions,reviewed760Sha256:canonicalSha(reviewed),mm76Sha256:canonicalSha(mm),mechanics:mechanicsProjection};
}
export function assertAssetClosure(closure,sourceRows,catalogs) {
  exactKeys(closure,['catalogPaths','imagePaths'],'assetClosure');
  const source=new Map(sourceRows.map(row=>[row.path,row]));
  check(Array.isArray(closure.catalogPaths) && closure.catalogPaths.length===14 && new Set(closure.catalogPaths).size===14,'exact14 touched catalogs');
  check(Array.isArray(closure.imagePaths) && closure.imagePaths.length===54 && new Set(closure.imagePaths).size===54,'exact54 touched-catalog images');
  const images=new Set();
  for(const path of closure.catalogPaths){repoPath(path);check(source.get(path)?.kind==='json','selected catalog source pin');const catalog=catalogs.get(path);check(catalog && Array.isArray(catalog.regions),'selected catalog object');for(const region of catalog.regions){const prefix=path.slice(0,path.lastIndexOf('/')+1),image=repoPath(prefix+region.image);images.add(image);check(source.get(image)?.kind==='png' && source.get(image).sha256===region.sha256,'every selected region image is hash-pinned');}}
  check(equal([...images].sort(),[...closure.imagePaths].sort()),'complete selected image closure, including old prefixes');
}
export function assertClosedFixture(contract) {
  assertPlainJson(contract,'contract');
  exactKeys(contract,['schemaVersion','artifactType','stage','status','sourceEpoch','sourceInputs','constructionInputs','observedInputs','targetSpecificInputs','constructionReceiptSha256','observedInputUnionSha256','absentInputs','catalogDirectories','catalogJsonPaths','producerImportEdges','qualificationInputs','protectedArtifacts','assetClosure','snapshots','expected','preservation','certificates'],'contract');
  check(contract.schemaVersion===1 && contract.artifactType===ARTIFACT && contract.stage===STAGE && contract.status==='closed-source-committed-body-awaiting-installed-qualification','closed native body stage');
  assertSourceEpoch(contract.sourceEpoch);
  const source=assertFileRows(contract.sourceInputs,'sourceInputs');
  assertFileRows(contract.constructionInputs,'full construction inputs');assertFileRows(contract.observedInputs,'actual observed input union');assertFileRows(contract.targetSpecificInputs,'target-specific inputs');
  for(const row of [...contract.constructionInputs,...contract.observedInputs,...contract.targetSpecificInputs])check(contract.sourceInputs.some(actual=>equal(actual,row)),'full construction/observed/target-specific manifests are exact subsets of closed source inputs');
  check(contract.constructionInputs.length===2522,'all2522 actual adapter construction inputs retained');
  check(contract.observedInputs.length===2621&&digest(contract.constructionReceiptSha256)&&digest(contract.observedInputUnionSha256),'all2621 actual producer/official-mechanics input union and original receipt identities');
  check(Array.isArray(contract.absentInputs)&&new Set(contract.absentInputs).size===contract.absentInputs.length&&contract.absentInputs.every(path=>repoPath(path)&&!source.has(path)),'closed observed absence predicates');
  check(Array.isArray(contract.catalogJsonPaths)&&new Set(contract.catalogJsonPaths).size===contract.catalogJsonPaths.length&&contract.catalogJsonPaths.every(path=>source.has(repoPath(path))),'complete catalog directory membership paths');
  check(Array.isArray(contract.catalogDirectories)&&contract.catalogDirectories.length===3&&contract.catalogDirectories.every(row=>repoPath(row.path)&&Array.isArray(row.entries)),'exact three observed catalog directory memberships');
  check(Array.isArray(contract.producerImportEdges)&&contract.producerImportEdges.every(edge=>source.has(repoPath(edge.from))&&source.has(repoPath(edge.to))),'closed static producer edges');
  const qualification=assertFileRows(contract.qualificationInputs,'qualificationInputs');assertFileRows(contract.protectedArtifacts,'protectedArtifacts');
  check(equal(contract.protectedArtifacts,FROZEN_PARENT_ARTIFACTS),'all19 known frozen MM/H code/native fixtures/contracts remain exact; no caller-repinned historical artifacts');
  for(const path of REQUIRED_SOURCE_PATHS)check(source.has(path),`mandatory source path ${path}`);
  check(!contract.sourceInputs.some(row=>contract.qualificationInputs.some(other=>other.path===row.path)),'source/metadata stage inputs disjoint');
  check(!contract.protectedArtifacts.some(row=>qualification.has(row.path)),'protected/source and qualification stages disjoint');
  check(contract.protectedArtifacts.some(row=>row.path===MM_FIXTURE_PATH&&row.sha256===MM_FIXTURE_SHA),'fixed frozen MM native fixture is protected');
  exactKeys(contract.snapshots,Object.keys(SNAPSHOT_PATHS),'snapshot pins');
  for(const [key,path]of Object.entries(SNAPSHOT_PATHS)){const pin=contract.snapshots[key];exactKeys(pin,['path','rawSha256','objectSha256','canonicalSha256'],`snapshot ${key}`);check(pin.path===path && [pin.rawSha256,pin.objectSha256,pin.canonicalSha256].every(digest),'three typed snapshot hash domains');check(contract.sourceInputs.some(row=>row.path===path&&row.sha256===pin.rawSha256),'snapshot raw hash joins source path');}
  check(contract.expected.mechanics?.inputMatchesCurrentData===true,'final mechanics readiness required');
  check(contract.preservation.mechanics!==null,'complete mechanics preservation projection required');
  exactKeys(contract.certificates,['preservation','closure'],'certificates');
  for(const [kind,ref]of Object.entries(contract.certificates)){exactKeys(ref,['path','sha256','sizeBytes'],`${kind} certificate`);repoPath(ref.path);check(digest(ref.sha256)&&integer(ref.sizeBytes)&&contract.qualificationInputs.some(row=>row.path===ref.path&&row.sha256===ref.sha256&&row.sizeBytes===ref.sizeBytes),`${kind} exact qualification-stage reference`);}
  check(contract.qualificationInputs.length===2 && new Set(Object.values(contract.certificates).map(ref=>ref.path)).size===2,'only the two independently reviewed certificate files are qualification inputs; no extra arbitrary rows');
  return true;
}
export function constructClosedFixture(input) {
  assertDataRecord(input,'construction argument');
  exactKeys(input,['sourceEpoch','sourceInputs','constructionInputs','observedInputs','targetSpecificInputs','constructionReceiptSha256','observedInputUnionSha256','absentInputs','catalogDirectories','catalogJsonPaths','qualificationInputs','protectedArtifacts','assetClosure','catalogObjects','producerBytes','snapshotBytes','before','snapshot','officialMechanicsProjection','certificateBytes','certificateObjects','certificates'],'construction argument');
  const {sourceEpoch,sourceInputs,constructionInputs,observedInputs,targetSpecificInputs,constructionReceiptSha256,observedInputUnionSha256,absentInputs,catalogDirectories,catalogJsonPaths,qualificationInputs,protectedArtifacts,assetClosure,catalogObjects,producerBytes,snapshotBytes,before,snapshot,officialMechanicsProjection,certificateBytes,certificateObjects,certificates}=input;
  for(const [label,record]of Object.entries({producerBytes,snapshotBytes,certificateBytes}))assertDataRecord(record,label);
  assertPlainJson({sourceEpoch,sourceInputs,constructionInputs,observedInputs,targetSpecificInputs,constructionReceiptSha256,observedInputUnionSha256,absentInputs,catalogDirectories,catalogJsonPaths,qualificationInputs,protectedArtifacts,assetClosure,catalogObjects,before,snapshot,officialMechanicsProjection,certificateObjects,certificates},'construction inputs');
  assertSourceEpoch(sourceEpoch);
  const expected=measureBody(snapshot);check(expected.mechanics?.inputMatchesCurrentData===true,'cannot close before actual mechanics regeneration');
  assertOfficialMechanicsProjection(snapshot,officialMechanicsProjection);
  const preservation=derivePreservation(before,snapshot),snapshots={};
  for(const [key,path]of Object.entries(SNAPSHOT_PATHS)){const bytes=copyNativeBytes(snapshotBytes[key],key),parsed=parseBytes(bytes,key);check(equal(parsed,snapshot[key]),`${key}: byte/object input equality`);snapshots[key]={path,rawSha256:sha256(bytes),objectSha256:objectSha(parsed),canonicalSha256:canonicalSha(parsed)};}
  for(const [kind,ref]of Object.entries(certificates)){const bytes=copyNativeBytes(certificateBytes[kind],`${kind} certificate bytes`);check(sha256(bytes)===ref.sha256&&bytes.length===ref.sizeBytes&&equal(parseBytes(bytes,kind),certificateObjects[kind]),`${kind}: actual certificate bytes/ref/object equality`);}
  const producerFiles=new Map();for(const row of sourceInputs.filter(row=>row.kind==='code')){const bytes=copyNativeBytes(producerBytes[row.path],row.path);check(bytes.length===row.sizeBytes&&sha256(bytes)===row.sha256,'actual producer bytes match manifest');producerFiles.set(row.path,bytes);}
  const producerImportEdges=assertProducerImportClosure(producerFiles);
  const contract={schemaVersion:1,artifactType:ARTIFACT,stage:STAGE,status:'closed-source-committed-body-awaiting-installed-qualification',sourceEpoch,sourceInputs,constructionInputs,observedInputs,targetSpecificInputs,constructionReceiptSha256,observedInputUnionSha256,absentInputs,catalogDirectories,catalogJsonPaths,producerImportEdges,qualificationInputs,protectedArtifacts,assetClosure,snapshots,expected,preservation,certificates};
  assertClosedFixture(contract);assertProducerImportClosure(producerFiles);assertAssetClosure(assetClosure,sourceInputs,new Map(Object.entries(catalogObjects)));assertCertificates(contract,certificateObjects);return contract;
}
export function assertCertificates(contract,objects) {
  assertPlainJson(contract,'certificate contract');assertPlainJson(objects,'certificates');exactKeys(objects,['preservation','closure'],'certificate objects');
  const preservation=objects.preservation,closure=objects.closure;
  check(preservation.schemaVersion===1 && preservation.kind==='independent-native-body-preservation' && preservation.independent===true && preservation.accepted===true,'independent preservation certificate');
  check(equal(preservation.projections,contract.preservation) && equal(preservation.snapshots,contract.snapshots),'preservation binds entire actual projection and snapshot states');
  check(equal(preservation.sourceEpoch,contract.sourceEpoch)&&equal(closure.sourceEpoch,contract.sourceEpoch),'both certificates bind actual source commit/tree/parent stage');
  check(closure.schemaVersion===1 && closure.kind==='independent-native-input-closure' && closure.independent===true && closure.accepted===true && closure.dynamicReadsReviewed===true,'independent complete input closure certificate');
  check(closure.sourceInputsSha256===canonicalSha(contract.sourceInputs) && closure.assetClosureSha256===canonicalSha(contract.assetClosure),'closure binds actual full inputs/assets');
  check(closure.protectedArtifactsSha256===canonicalSha(contract.protectedArtifacts),'closure independently binds the exact frozen parent artifact manifest');
  check(closure.constructionInputsSha256===canonicalSha(contract.constructionInputs)&&closure.observedInputsSha256===canonicalSha(contract.observedInputs)&&closure.targetSpecificInputsSha256===canonicalSha(contract.targetSpecificInputs)&&closure.absentInputsSha256===canonicalSha(contract.absentInputs)&&closure.catalogDirectoriesSha256===canonicalSha(contract.catalogDirectories)&&closure.catalogJsonPathsSha256===canonicalSha(contract.catalogJsonPaths)&&closure.producerImportEdgesSha256===canonicalSha(contract.producerImportEdges)&&closure.constructionReceiptSha256===contract.constructionReceiptSha256&&closure.observedInputUnionSha256===contract.observedInputUnionSha256,'full construction/observed/target/absence/directory/static-edge closure and receipt identities are attested');
  check(closure.callerStage==='native-body-only; current-and-historical-migrations-are-separate-S2' && closure.callerInventoryEdges===41 && closure.callerInventorySha256===FROZEN_CALLER_BOUNDARY.inventorySha256&&closure.callerEdgeProjectionSha256===FROZEN_CALLER_BOUNDARY.edgeProjectionSha256,'exact frozen41 caller boundary, not a free syntactic hash');
  return true;
}
export function assertSnapshot(contract,snapshot) {
  assertPlainJson(snapshot,'caller/current snapshot');
  check(equal(measureBody(snapshot),contract.expected),'complete current measured denominators');
  for(const key of Object.keys(SNAPSHOT_PATHS))check(objectSha(snapshot[key])===contract.snapshots[key].objectSha256 && canonicalSha(snapshot[key])===contract.snapshots[key].canonicalSha256,`${key}: exact whole current JSON state`);
  return true;
}
