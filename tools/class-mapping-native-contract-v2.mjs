// Pure UI-only Source2 contract. This module performs no I/O or qualification.
// Native1 remains immutable; production uses a separately installed zero-arg gate.
import * as v1 from './class-mapping-native-contract-v1.mjs';
export const {sha256,canonical,canonicalSha,objectSha,equal,assertPlainJson,parseBytes,copyNativeBytes,repoPath}=v1;
export const STAGE='source2-body-native';
export const SOURCE_COMMIT='400f6e9d123d8a654b9b9af48133a2533506e73d';
export const SOURCE_TREE='664c02504efcece25669d2f9c3fdb26437cd5b09';
export const PARENT_COMMIT='6502b19620e092ced9f3e233f2dc3d5ffc8bd3ec';
export const PARENT_TREE='2d64093489afd63223ccc94c07446d03fa80f72e';
export const BASIS_PATH='research/class-mapping-source-epoch-v1/closed-native-body-cohort-v1.json';
export const BASIS_RAW_SHA='c534a9c7e925f8630cdcc53dfb41b248b3abb6209ae5e92b3e255db92e0aba10';
export const BASIS_RAW_SIZE=2087176;
export const BASIS_CANONICAL_SHA='6d51b0ad57d86985f211e1432e83a60d4b55fb51558a7a47a55da18ce4cb09c3';
export const EXTRA_PNG_SHA='f9eff6a80bb7f80c25484cfc452986b39bfec97c485c0cf8b8f13ee66c59d0e2';
export const PROTECTED_SHA='fd2486b2570b316e5fb35f55e4bc881440cb4ce3cf2b43849fc7348976c00c7c';
export const APP_PATH='dist/app.js';
export const APP_BEFORE=Object.freeze({sha256:'876df077e57041e77732ea56cc47123dc1f459ba6badac0ce98d3254345106d6',sizeBytes:197475,blobSha1:'a26be56eafb2fec1bcd7b241b26bfcbfbd309d77'});
export const APP_AFTER=Object.freeze({sha256:'57eae6b440f2b75294ca6021adbcd9e29a43646a7a6177cc6800973b94f0b8c1',sizeBytes:197876,blobSha1:'2c15603a324873743996993e5cbec7ecdc25d061'});
export const FIXTURE_PATH='research/class-mapping-source-epoch-v2/closed-native-body-cohort-v2.json';
export const PIN_PATH='research/class-mapping-source-epoch-v2/native-qualification-pins-v2.mjs';
export const SNAPSHOT_PATHS=v1.SNAPSHOT_PATHS;
export const CODE_PATHS=Object.freeze([
 'tests/helpers/class-mapping-current-cohort-factory-v2.mjs',
 'tests/helpers/class-mapping-current-cohort-v2.mjs',
 'tools/class-mapping-current-source-gate-v2.mjs',
 'tools/class-mapping-frozen-parent-artifacts-v1.mjs',
 'tools/class-mapping-native-contract-v1.mjs',
 'tools/class-mapping-native-contract-v2.mjs',
 'tools/class-mapping-raw-git-v1.mjs',
]);
export const CERTIFICATE_PATHS=Object.freeze({
 preservation:'research/class-mapping-source-epoch-v2/independent-preservation-certificate-v2.json',
 closure:'research/class-mapping-source-epoch-v2/independent-input-closure-certificate-v2.json',
});
export const AUTHOR_ID='codex-native2-ui-only-gate-author';
export const REVIEWER_IDS=Object.freeze({preservation:'codex-root-independent-native2-preservation-review',closure:'codex-root-independent-native2-input-closure-review'});
export const ZERO_GRADES=Object.freeze({fieldTargets:0,sourceValues:0,context:0,defaults:0,numeric:0,mechanics:0});
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const HISTORY=freeze({"physicalHead":"6502b19620e092ced9f3e233f2dc3d5ffc8bd3ec","physicalTree":"2d64093489afd63223ccc94c07446d03fa80f72e","appSha256":"876df077e57041e77732ea56cc47123dc1f459ba6badac0ce98d3254345106d6","testSha256":"deb9279ad54ccf98ee0a94b9f92e22488338e2ab43672242a3a7cdc23aee99fb","failure":{"exitCode":1,"tests":1,"pass":0,"fail":1,"reason":"active objects/info/alternates rejected before qualification","metadataSha256":"7d888adf8d00e4ad2046d312a9ca48ae33ed21513e75e8b17932cee242afcc15","tapSha256":"7d0a79150360758998d56d3693b4b7a0bfeb7549f8a35486f5cc7021611d0f55"},"independentObjectPass":{"exitCode":0,"tests":6,"pass":6,"fail":0,"cancelled":0,"skipped":0,"todo":0,"metadataSha256":"5e73b8cab1c82f339796865c7d05887030d54504da38c49f4c24210c3118f1f0","tapSha256":"e0667709238e9319baef408a86f69b2b5e989b7235b98df97474a16935b75b69"},"meaning":"Historical Native1 execution in genuine6502; not new Source2/Native2 qualification."});
const TRANSFORMS=Object.freeze({"attributeBefore":"function attributeLayoutHTML(item,{equipment=false}={}){\n const rows=attributeRows(item,{equipment});\n if(attributeMode==='table')return `<div class=\"attribute-table-wrap\"><table class=\"attribute-table\"><caption class=\"sr-only\">Extracted attributes for ${esc(item.name||item.title||item._title)}</caption><thead><tr><th scope=\"col\">Source field</th><th scope=\"col\">Extracted value</th>${equipment?'<th scope=\"col\">Source</th>':''}</tr></thead><tbody>${rows.map(({label,value,reference,estimated})=>`<tr data-field-label=\"${esc(label)}\"><th scope=\"row\">${esc(label)}</th><td>${esc(fieldValue(value))}</td>${equipment?`<td>${reference?inlineSourceChip(reference,`${item.name} · ${label}`):estimated?'<span class=\"small muted\">Estimate; no printed price citation</span>':'<span class=\"small muted\">Field citation pending</span>'}</td>`:''}</tr>`).join('')}</tbody></table></div>`;\n const cited=rows.filter(row=>row.reference);\n return `<dl class=\"compact-facts ${equipment?'equipment-facts':'spell-facts'}\">${rows.map(attributeFactHTML).join('')}</dl>${cited.length?`<details class=\"attribute-citations\" data-attribute-citations><summary>Field sources</summary><div class=\"attribute-citation-list\">${cited.map(({label,reference})=>`<div><span>${esc(label)}</span>${inlineSourceChip(reference,`${item.name} · ${label}`)}</div>`).join('')}</div></details>`:''}`;\n}","attributeAfter":"function attributeLayoutHTML(item,{equipment=false}={}){\n const rows=attributeRows(item,{equipment});\n const showSourceColumn=equipment||rows.some(row=>Boolean(row.reference));\n const sourceCell=({label,reference,estimated})=>{if(!showSourceColumn)return '';if(reference)return `<td>${inlineSourceChip(reference,`${item.name} · ${label}`)}</td>`;if(!equipment)return '<td></td>';return `<td>${estimated?'<span class=\"small muted\">Estimate; no printed price citation</span>':'<span class=\"small muted\">Field citation pending</span>'}</td>`;};\n if(attributeMode==='table')return `<div class=\"attribute-table-wrap\"><table class=\"attribute-table\"><caption class=\"sr-only\">Extracted attributes for ${esc(item.name||item.title||item._title)}</caption><thead><tr><th scope=\"col\">Source field</th><th scope=\"col\">Extracted value</th>${showSourceColumn?'<th scope=\"col\">Source</th>':''}</tr></thead><tbody>${rows.map(({label,value,reference,estimated})=>`<tr data-field-label=\"${esc(label)}\"><th scope=\"row\">${esc(label)}</th><td>${esc(fieldValue(value))}</td>${sourceCell({label,reference,estimated})}</tr>`).join('')}</tbody></table></div>`;\n const cited=rows.filter(row=>row.reference);\n return `<dl class=\"compact-facts ${equipment?'equipment-facts':'spell-facts'}\">${rows.map(attributeFactHTML).join('')}</dl>${cited.length?`<details class=\"attribute-citations\" data-attribute-citations><summary>Field sources</summary><div class=\"attribute-citation-list\">${cited.map(({label,reference})=>`<div><span>${esc(label)}</span>${inlineSourceChip(reference,`${item.name} · ${label}`)}</div>`).join('')}</div></details>`:''}`;\n}","footerBefore":"const firstCitedPage=firstCitedGroup?{book:bookCode(firstCitedGroup.book),page:Number(firstCitedGroup.pages[0])}:selection.initialReference;","footerAfter":"const firstCitedPage=firstCitedGroup?sourceTargetSelection(targets.filter(target=>bookCode(target?.book)===bookCode(firstCitedGroup.book)&&firstCitedGroup.pages.includes(Number(target?.page))),firstCitedGroup.book,firstCitedGroup.pages[0]).initialReference:selection.initialReference;"});
export const check=(ok,message)=>{if(!ok)throw new Error('Invalid Native2 body: '+message);};
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function exactKeys(value,keys,label){v1.assertPlainJson(value,label);check(value&&!Array.isArray(value)&&equal(Object.keys(value).sort(),[...keys].sort()),label+': exact key set');}
// This cache contains only a recursively immutable object parsed from the fixed
// raw Native1 bytes. It never caches a caller-selected fixture or physical input.
// Mutable/untrusted clones must pass the complete old validation each time.
const authenticatedBases=new WeakSet();
let parsedBasis=null;
export function assertBasis(basis){
 assertPlainJson({},'Native1 basis global prototypes');
 if(basis&&typeof basis==='object'&&authenticatedBases.has(basis))return basis;
 assertPlainJson(basis,'Native1 basis');
 check(canonicalSha(basis)===BASIS_CANONICAL_SHA,'immutable Native1 basis object');
 v1.assertClosedFixture(basis);return basis;
}
export function parseBasis(bytes){
 const b=copyNativeBytes(bytes,'Native1 basis bytes');
 check(b.length===BASIS_RAW_SIZE&&sha256(b)===BASIS_RAW_SHA,'immutable Native1 basis raw bytes');
 assertPlainJson({},'Native1 basis global prototypes');
 if(parsedBasis===null){
  const basis=assertBasis(parseBytes(b,'Native1 basis'));
  freeze(basis);authenticatedBases.add(basis);parsedBasis=basis;
 }
 return assertBasis(parsedBasis);
}
export function assertSourceEpoch(epoch,basis){
 assertBasis(basis);exactKeys(epoch,['stage','sourceCommit','sourceTree','parentCommit','parentTree','requiredAncestry'],'sourceEpoch');
 check(epoch.stage===STAGE&&epoch.sourceCommit===SOURCE_COMMIT&&epoch.sourceTree===SOURCE_TREE&&epoch.parentCommit===PARENT_COMMIT&&epoch.parentTree===PARENT_TREE,'fixed genuine Source2/source parent identities');
 check(equal(epoch.requiredAncestry,[...basis.sourceEpoch.requiredAncestry,PARENT_COMMIT,SOURCE_COMMIT]),'exact inherited ancestry plus actual6502/Source2 suffix');
}
function assertRows(rows,label){v1.assertFileRows(rows,label);return new Map(rows.map(row=>[row.path,row]));}
export function assertExtraPngRows(rows,basis){
 assertBasis(basis);const map=assertRows(rows,'extra PNG inputs');
 const old=new Set(basis.sourceInputs.map(row=>row.path));
 const pngNames=basis.catalogDirectories.flatMap(dir=>dir.entries.filter(e=>e.type==='file'&&e.name.endsWith('.png')).map(e=>dir.path+'/'+e.name));
 const expected=pngNames.filter(path=>!old.has(path)).sort();
 check(rows.length===427&&rows.every(row=>row.kind==='png')&&equal(rows.map(row=>row.path),expected),'exact427 formerly directory-only PNG paths');
 check(canonicalSha(rows)===EXTRA_PNG_SHA,'independently derived427 PNG byte pins');
 return map;
}
export function deriveSourceRows(basis,extras){
 assertExtraPngRows(extras,basis);
 return [...basis.sourceInputs.map(row=>row.path===APP_PATH?{...row,sha256:APP_AFTER.sha256,sizeBytes:APP_AFTER.sizeBytes}:{...row}),...extras.map(row=>({...row}))].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export function assertSourceRows(rows,basis,extras){
 assertRows(rows,'Source2 inputs');check(equal(rows,deriveSourceRows(basis,extras)),'exact inherited2636 plus427 rows and only app substitution');
 const png=rows.filter(row=>row.kind==='png');check(rows.length===3063&&png.length===1844,'full3063 source/1844 PNG denominator');
}
export function assertDirectories(rows,basis){assertPlainJson(rows,'directories');assertBasis(basis);check(equal(rows,basis.catalogDirectories),'exact original three full catalog-directory memberships');}
export function assertProtected(rows){
 assertRows(rows,'protected historical');check(rows.length===29&&canonicalSha(rows)===PROTECTED_SHA,'all29 Native1 historical/source/code/certificate pins remain exact');
}
export function assertCodeRows(rows){
 assertRows(rows,'installed Native2 code');check(equal(rows.map(row=>row.path),CODE_PATHS)&&rows.every(row=>row.kind==='code'&&row.sizeBytes>0),'exact seven-module installed code closure');
}
export function applyReviewedUiDelta(beforeBytes){
 const before=copyNativeBytes(beforeBytes,'before app');
 check(before.length===APP_BEFORE.sizeBytes&&sha256(before)===APP_BEFORE.sha256,'exact6502 app preimage');
 let text=before.toString('utf8');
 for(const [name,old_,new_]of [['attributeLayoutHTML',TRANSFORMS.attributeBefore,TRANSFORMS.attributeAfter],['openScanViewer firstCitedPage',TRANSFORMS.footerBefore,TRANSFORMS.footerAfter]]){
  check(text.split(old_).length===2,name+': exactly one old transform anchor');text=text.replace(old_,new_);
 }
 const after=Buffer.from(text);check(after.length===APP_AFTER.sizeBytes&&sha256(after)===APP_AFTER.sha256,'exact reviewed two-transform app postimage');return after;
}
export function assertUiDelta(before,after){const expected=applyReviewedUiDelta(before),actual=copyNativeBytes(after,'after app');check(actual.equals(expected),'only exact two app transformations; no third change');return true;}
export function assertOnlyAppDiffBytes(value){
 const bytes=copyNativeBytes(value,'raw app diff');
 const expected=Buffer.from(':100644 100644 '+APP_BEFORE.blobSha1+' '+APP_AFTER.blobSha1+' M\0dist/app.js\0');
 check(bytes.equals(expected),'exact single100644 app path/blob delta; no rename/mode/extra path');return true;
}
export function assertSnapshot(fixture,snapshot,basis){
 assertBasis(basis);assertPlainJson(snapshot,'Native2 snapshot');check(equal(fixture.snapshots,basis.snapshots)&&equal(fixture.expected,basis.expected),'unchanged complete Native1 snapshot pins and statuses');
 v1.assertSnapshot(basis,snapshot);return true;
}
export function assertFixture(fixture,basis,{allowPending=false}={}){
 assertBasis(basis);exactKeys(fixture,['schemaVersion','artifactType','stage','status','sourceEpoch','native1Basis','sourceInputs','additionalPngInputs','catalogDirectories','catalogJsonPaths','absentInputs','producerImportEdges','snapshots','expected','protectedHistorical','installedCode','codeStage','qualificationInputs','certificates','historicalNative1Evidence','gradePromotions'],'Native2 fixture');
 check(fixture.schemaVersion===2&&fixture.artifactType==='UI-only Source2 native body cohort'&&fixture.stage===STAGE,'Native2 typed stage');
 assertSourceEpoch(fixture.sourceEpoch,basis);
 check(equal(fixture.native1Basis,{path:BASIS_PATH,sha256:BASIS_RAW_SHA,sizeBytes:BASIS_RAW_SIZE}),'fixed original Native1 basis reference');
 assertSourceRows(fixture.sourceInputs,basis,fixture.additionalPngInputs);assertDirectories(fixture.catalogDirectories,basis);assertProtected(fixture.protectedHistorical);assertCodeRows(fixture.installedCode);
 const repeated=new Map();for(const row of [...fixture.sourceInputs,...fixture.protectedHistorical,...fixture.installedCode]){const old=repeated.get(row.path);check(!old||(old.sha256===row.sha256&&old.sizeBytes===row.sizeBytes),'duplicate source/code/history obligations must match bytes: '+row.path);repeated.set(row.path,row);}
 check(equal(fixture.catalogJsonPaths,basis.catalogJsonPaths)&&equal(fixture.absentInputs,basis.absentInputs)&&equal(fixture.producerImportEdges,basis.producerImportEdges),'all inherited catalog JSON/absence/static producer-edge guards');
 check(equal(fixture.snapshots,basis.snapshots)&&equal(fixture.expected,basis.expected),'all four raw/object/canonical snapshots and review counts unchanged');
 check(equal(fixture.historicalNative1Evidence,HISTORY)&&equal(fixture.gradePromotions,ZERO_GRADES),'historical actual evidence retained with zero grade promotions');
 if(fixture.status==='body-closed-awaiting-code-stage-and-independent-certificates'){
  check(allowPending&&fixture.codeStage===null&&equal(fixture.qualificationInputs,[])&&equal(fixture.certificates,{preservation:null,closure:null}),'pending fixture cannot qualify');return true;
 }
 check(fixture.status==='closed-source-committed-body-awaiting-installed-qualification','closed accepted fixture status');
 exactKeys(fixture.codeStage,['commit','tree','parentCommit'],'code stage');check(oid(fixture.codeStage.commit)&&oid(fixture.codeStage.tree)&&fixture.codeStage.parentCommit===SOURCE_COMMIT,'actual single-parent code stage required');
 const qual=assertRows(fixture.qualificationInputs,'qualification inputs');
 exactKeys(fixture.certificates,['preservation','closure'],'certificates');
 for(const kind of ['preservation','closure']){
  const ref=fixture.certificates[kind];exactKeys(ref,['path','sha256','sizeBytes'],kind+' certificate');
  check(ref.path===CERTIFICATE_PATHS[kind]&&digest(ref.sha256)&&Number.isSafeInteger(ref.sizeBytes)&&ref.sizeBytes>0,kind+': exact fixed independently reviewed certificate reference');
  check(equal(qual.get(ref.path),{...ref,kind:'json'}),kind+': certificate reference joins exact qualification row');
 }
 check(qual.size===2,'only two independent certificates; no arbitrary third qualification input');
 for(const path of qual.keys())check(!fixture.sourceInputs.some(row=>row.path===path)&&!fixture.protectedHistorical.some(row=>row.path===path)&&!fixture.installedCode.some(row=>row.path===path),'qualification/source/code/history stages disjoint');
 return true;
}
export function certificateSubject(fixture,kind){
 check(kind==='preservation'||kind==='closure','fixed certificate kind');
 return {schemaVersion:2,kind:kind==='preservation'?'independent-native2-body-preservation':'independent-native2-input-closure',status:'PENDING_INDEPENDENT_ROOT_REVIEW',independent:false,accepted:false,authorId:AUTHOR_ID,reviewerId:null,sourceEpoch:structuredClone(fixture.sourceEpoch),native1BasisSha256:BASIS_RAW_SHA,sourceInputsSha256:canonicalSha(fixture.sourceInputs),extraPngInputsSha256:EXTRA_PNG_SHA,catalogDirectoriesSha256:canonicalSha(fixture.catalogDirectories),snapshotsSha256:canonicalSha(fixture.snapshots),expectedSha256:canonicalSha(fixture.expected),protectedHistoricalSha256:canonicalSha(fixture.protectedHistorical),installedCodeSha256:canonicalSha(fixture.installedCode),codeStage:structuredClone(fixture.codeStage),gradePromotions:{...ZERO_GRADES},historicalNative1Evidence:structuredClone(HISTORY),reviewScope:kind==='preservation'?'ui-only-delta-and-unchanged-source-state-only':'current-source2-physical-input-code-directory-and-byte-closure-only',unchangedBodyProducerClosure:true};
}
export function assertCertificate(fixture,kind,certificate){
 assertPlainJson(certificate,kind+' certificate');
 const subject=certificateSubject(fixture,kind);
 exactKeys(certificate,Object.keys(subject),kind+' certificate');
 const expected={...subject,status:'accepted',independent:true,accepted:true,reviewerId:REVIEWER_IDS[kind]};
 check(certificate.authorId!==certificate.reviewerId,'certificate cannot self-review');
 check(equal(certificate,expected),kind+': exact independent root acceptance, source/code stage and complete subject required');
 return true;
}
export function assertCertificates(fixture,objects){
 exactKeys(objects,['preservation','closure'],'certificate objects');
 for(const kind of ['preservation','closure'])assertCertificate(fixture,kind,objects[kind]);
 return true;
}

export const PIN_MODULE_PREFIX='// Separately reviewed Native2 installation pins; no runtime overrides.\nconst freeze=value=>{if(value&&typeof value===\'object\'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};\nexport const nativeQualificationPins=freeze(';
export function pinModuleBytes(pins){assertPlainJson(pins,'pin module values');return Buffer.from(PIN_MODULE_PREFIX+JSON.stringify(pins,null,2)+');\n');}
const PIN_KEYS=Object.freeze(['schemaVersion','materialized','fixturePath','fixtureSha256','fixtureSizeBytes','codeStage','codeStagePinPreimage','codePins']);
// Read executable-shaped pin source solely as data. The exact source codec
// admits only the known declarative wrapper plus canonical JSON; it is never
// imported, evaluated or compiled, even before its values have been validated.
export function parsePinModuleBytes(value,label='pin module'){
 const bytes=copyNativeBytes(value,label),prefix=Buffer.from(PIN_MODULE_PREFIX),suffix=Buffer.from(');\n');
 check(bytes.length>=prefix.length+suffix.length&&bytes.subarray(0,prefix.length).equals(prefix)&&bytes.subarray(-suffix.length).equals(suffix),'fixed pin module source codec');
 const pins=parseBytes(bytes.subarray(prefix.length,-suffix.length),label+' values');
 exactKeys(pins,PIN_KEYS,label+' values');
 check(bytes.equals(pinModuleBytes(pins)),'exact pin module codec with no additional code');
 return pins;
}
export function assertCodeStagePinStub(value,fixture,pendingFixtureBytes,basis){
 const stub=parsePinModuleBytes(value,'raw code-stage stub');
 check(stub.schemaVersion===2&&stub.materialized===false&&stub.fixturePath===FIXTURE_PATH&&digest(stub.fixtureSha256)&&Number.isSafeInteger(stub.fixtureSizeBytes)&&stub.fixtureSizeBytes>0&&stub.codeStage===null&&stub.codeStagePinPreimage===null&&equal(stub.codePins,fixture.installedCode),'actual raw code stage kept unmaterialized stub; no source/code hash cycle');
 const bytes=copyNativeBytes(pendingFixtureBytes,'raw code-stage pending fixture');
 check(bytes.length===stub.fixtureSizeBytes&&sha256(bytes)===stub.fixtureSha256,'raw code-stage pending fixture SHA/size');
 const pending=parseBytes(bytes,'raw code-stage pending fixture');
 assertFixture(pending,basis,{allowPending:true});
 check(pending.status==='body-closed-awaiting-code-stage-and-independent-certificates','actual raw code-stage fixture remains pending');
 assertFixture(fixture,basis);
 const materializationKeys=new Set(['status','codeStage','qualificationInputs','certificates']);
 const projection=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!materializationKeys.has(key)));
 check(equal(projection(pending),projection(fixture)),'only qualification materialization fields may differ from raw code-stage pending fixture');
 return true;
}

export function assertInstallationPins(pins,fixture){
 assertPlainJson(pins,'installation pins');
 exactKeys(pins,PIN_KEYS,'installation pins');
 check(pins.schemaVersion===2&&pins.materialized===true,'installation remains unmaterialized');
 check(pins.fixturePath===FIXTURE_PATH&&digest(pins.fixtureSha256)&&Number.isSafeInteger(pins.fixtureSizeBytes)&&pins.fixtureSizeBytes>0,'fixed Native2 installed fixture SHA/size');
 check(equal(pins.codeStage,fixture.codeStage)&&fixture.codeStage!==null,'actual code-stage commit/tree required');
 check(equal(pins.codePins,fixture.installedCode),'installed code pins equal complete accepted code closure');
 exactKeys(pins.codeStagePinPreimage,['path','sha256','sizeBytes'],'code-stage pin preimage');
 check(pins.codeStagePinPreimage.path===PIN_PATH&&digest(pins.codeStagePinPreimage.sha256)&&Number.isSafeInteger(pins.codeStagePinPreimage.sizeBytes)&&pins.codeStagePinPreimage.sizeBytes>0,'fixed raw unmaterialized code-stage pin preimage');
 return true;
}
