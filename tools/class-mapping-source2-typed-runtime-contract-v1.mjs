// Pure byte/source contract: no execution, source gate or branded runtime proof.
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as equal} from 'node:util';
import {posix,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const fail=m=>{throw Error('Source2 typed runtime: '+m);},check=(v,m)=>{if(!v)fail(m);};
const sha=b=>createHash('sha256').update(b).digest('hex'),oid=(kind,b)=>createHash('sha1').update(`${kind} ${b.length}\0`).update(b).digest('hex');
const hash=/^[a-f0-9]{64}$/,gitHash=/^[a-f0-9]{40}$/,MAX_CODE=16*1024*1024,MAX_ARTIFACT=128*1024*1024;
const NODE_NATIVE_ACORN=Object.freeze({id:'node-native:node24-acorn-v1',nativeKey:'internal/deps/acorn/acorn/dist/acorn',nodeMajor:24,sha256:'fc3ed7b81e58464715d0291402892f22c3d86ea75302645a330390f85d8015c9',sizeBytes:245232});
const arrays=['physicalHeadCodeRows','rawGitCodeRows','artifactRows','fixedContractBindings','decodedFixtureCodeRows','deterministicGeneratedCodeRows','parameterizedProducerContracts','contextEdges','rootCodeIds','emittedInstanceReceipts','unresolved'];
const unique=(xs,label)=>{check(Array.isArray(xs)&&new Set(xs).size===xs.length,'unique '+label);return xs;};
function safePath(p){check(typeof p==='string'&&p&&!p.startsWith('/')&&!/[\\:\x00-\x1f\x7f]/.test(p)&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'&&!x.startsWith('-')),'safe context path');return p;}
function pin(row,bytes,limit=MAX_CODE){check(Buffer.isBuffer(bytes)&&hash.test(row.sha256??'')&&Number.isSafeInteger(row.sizeBytes)&&row.sizeBytes>0&&row.sizeBytes<=limit,'bounded exact byte pin');check(bytes.length===row.sizeBytes&&sha(bytes)===row.sha256,'exact typed source bytes '+row.id);return bytes;}
function accepted(row){check(row?.acceptance==='ACCEPTED_AFTER_INDEPENDENT_REVIEW','independently accepted typed row');}
function pointer(value,path){check(typeof path==='string'&&(path===''||path.startsWith('/')),'finite JSON pointer');for(const token of path===''?[]:path.slice(1).split('/')){check(!/~(?![01])/u.test(token),'valid JSON pointer escape');const key=token.replaceAll('~1','/').replaceAll('~0','~');check(value!==null&&typeof value==='object'&&Object.hasOwn(value,key),'own JSON member '+path);value=value[key];}return value;}
const identity=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
export function verifyTypedSource2RuntimeAuthorityContract(a,io){
 check(a?.schema==='source2-typed-loaded-code-authority-v1'&&a.status==='CLOSED_ACCEPTED_TYPED_SOURCE_AND_RECIPE_AUTHORITY','typed accepted source/recipe schema required');
 check(!Object.hasOwn(a,'codeRows')&&!Object.hasOwn(a,'typedRuntimeEdges'),'legacy pathname-only authority is not a typed proof');
 for(const key of arrays)check(Array.isArray(a[key]),'explicit typed array '+key);
 check(a.physicalHeadCodeRows.length>0&&a.unresolved.length===0&&a.allLoadedTemplatesClassified===true,'complete finite typed source classification');
 check(a.emittedInstanceReceipts.length===0,'per-job emitted observations cannot be fabricated by a static authority manifest');
 check(gitHash.test(io.headCommit??'')&&gitHash.test(io.headTree??'')&&typeof io.rootPhysical==='string'&&io.rootPhysical.startsWith('/'),'physical checked root and HEAD supplied by installed verifier');
 const nodes=new Map(),bindings=new Map(),commitCache=new Map(),codeIds=new Set(),artifactIds=new Set();
 const add=(row,kind,bytes)=>{check(typeof row.id==='string'&&row.id.length>0&&!/[\x00-\x1f\x7f]/.test(row.id)&&!nodes.has(row.id),'unique contextual source ID');nodes.set(row.id,{row,kind,bytes});if(kind==='artifact')artifactIds.add(row.id);else codeIds.add(row.id);};
 const rawBytes=row=>{
  safePath(row.path);check(gitHash.test(row.commit??'')&&gitHash.test(row.tree??'')&&gitHash.test(row.blobOid??''),'raw Git commit/tree/blob identities');
  let commit=commitCache.get(row.commit);if(!commit){const bytes=io.readCommit(row.commit);check(Buffer.isBuffer(bytes)&&oid('commit',bytes)===row.commit,'authenticated raw commit object');const header=bytes.toString('utf8').split('\n\n',1)[0].split('\n'),trees=header.filter(x=>x.startsWith('tree '));check(trees.length===1&&/^tree [a-f0-9]{40}$/.test(trees[0]),'one raw commit tree');commit={tree:trees[0].slice(5)};commitCache.set(row.commit,commit);}check(commit.tree===row.tree,'raw code tree equals authenticated commit tree');
  const bytes=io.readRawGit(row.commit,row.path);check(Buffer.isBuffer(bytes)&&oid('blob',bytes)===row.blobOid,'raw code blob OID');return bytes;
 };
 for(const row of a.physicalHeadCodeRows){accepted(row);safePath(row.path);check(row.id==='head:'+row.path,'physical HEAD context ID');add(row,'head',pin(row,io.readHead(row.path)));}
 for(const row of a.rawGitCodeRows){accepted(row);check(row.id===`git:${row.commit}:${row.path}`,'raw Git context ID');add(row,'raw-git',pin(row,rawBytes(row)));}
 for(const row of a.artifactRows){accepted(row);safePath(row.path);check(row.storage==='physical-head'||row.storage==='raw-git','typed artifact storage');add(row,'artifact',pin(row,row.storage==='physical-head'?io.readHead(row.path):rawBytes(row),MAX_ARTIFACT));}
 const bootstrapPins=[];for(const path of io.bootstrapPaths??[]){safePath(path);const bytes=io.readHead(path),row={id:'head:'+path,path,sha256:sha(bytes),sizeBytes:bytes.length};check(bytes.length>0&&bytes.length<=MAX_CODE,'bounded bootstrap code');bootstrapPins.push({path,sha256:row.sha256,sizeBytes:row.sizeBytes});if(nodes.has(row.id)){check(nodes.get(row.id).kind==='head'&&nodes.get(row.id).bytes.equals(bytes),'bootstrap agrees with reviewed physical HEAD source');}else add(row,'bootstrap',bytes);}
 const node=id=>{const value=nodes.get(id);check(value,'resolved contextual source '+id);return value;};
 const code=id=>{const value=node(id);check(codeIds.has(id),'executable context cannot be replaced by artifact/recipe '+id);return value;};
 const isolatedOwner=row=>{const owner=code(row.generatorCodeId);check(row.proofScope==='ISOLATED_TEST_FIXTURE_ONLY'&&owner.kind==='head'&&owner.row.path.startsWith('tests/'),'isolated test-only generator scope');return owner;};
 for(const binding of a.fixedContractBindings){accepted(binding);check(typeof binding.id==='string'&&!bindings.has(binding.id),'unique fixed contract binding');const source=node(binding.artifactId);check(source.kind==='artifact','fixed binding uses an authenticated artifact');check(binding.selector?.kind==='json-pointer','fixed binding uses a finite own-member JSON selector');const value=pointer(JSON.parse(source.bytes.toString('utf8')),binding.selector.pointer);check(equal(value,binding.expectedValue),'actual fixed contract artifact value');unique(binding.producerCodeIds,'fixed producer code IDs');check(binding.producerCodeIds.length>0,'fixed contract binds actual producer code');bindings.set(binding.id,{binding,value});}
 const bound=(row,expected)=>{const b=bindings.get(row.contractBindingId);check(b&&equal(b.value,expected),'exact authenticated fixed contract binding '+row.id);return b;};
 for(const row of a.rawGitCodeRows)bound(row,{kind:'raw-git-code',...identity(row,['id','commit','tree','blobOid','path','sha256','sizeBytes'])});
 for(const row of a.artifactRows.filter(x=>x.storage==='raw-git'))bound(row,{kind:'raw-git-artifact',...identity(row,['id','commit','tree','blobOid','path','sha256','sizeBytes'])});
 function expression(value,parameters,used,depth=0){check(depth<=8,'finite recipe expression depth');if(typeof value==='string'){check(Buffer.byteLength(value)<=MAX_CODE,'bounded recipe literal');return value;}if(value&&typeof value==='object'&&Array.isArray(value.concat)){check(value.concat.length<=128,'finite recipe concat');const chunks=value.concat.map(x=>expression(x,parameters,used,depth+1));check(chunks.reduce((n,x)=>n+Buffer.byteLength(x),0)<=MAX_CODE,'bounded recipe concat output');return chunks.join('');}check(value&&typeof value.parameter==='string'&&Object.hasOwn(parameters,value.parameter),'declared guarded recipe parameter');used.add(value.parameter);const s=parameters[value.parameter];check(value.encoding==='json'||value.encoding==='utf8','finite parameter encoding');return value.encoding==='json'?JSON.stringify(s):s;}
 // ECMAScript replacement-token byte size; generated code is never executed.
 function substitutionBytes(replacement,text,from,index){let total=0,start=0;for(let i=0;i<replacement.length-1;i++){if(replacement[i]!=='$'||!['$','&','`',"'"].includes(replacement[i+1]))continue;total+=Buffer.byteLength(replacement.slice(start,i));const token=replacement[++i];total+=token==='$'?1:token==='&'?Buffer.byteLength(from):token==='`'?Buffer.byteLength(text.slice(0,index)):Buffer.byteLength(text.slice(index+from.length));start=i+1;}return total+Buffer.byteLength(replacement.slice(start));}
 function validatePinData(pin){check(pin&&typeof pin==='object'&&!Array.isArray(pin)&&equal(Object.keys(pin).sort(),['path','sha256','sizeBytes','status']),'four fixed pin data fields');safePath(pin.path);check((pin.status==='UNSEALED_PENDING_CLOSED_ACCEPTANCE'&&pin.sha256===null&&pin.sizeBytes===null)||(pin.status==='SEALED_CLOSED_ACCEPTANCE'&&hash.test(pin.sha256??'')&&Number.isSafeInteger(pin.sizeBytes)&&pin.sizeBytes>0&&pin.sizeBytes<=MAX_ARTIFACT),'fixed pin data grammar');return pin;}
 function installedPinArgument(text){let value;try{value=JSON.parse(text);}catch{const match=/^\{path:'([^']+)',sha256:(null|'[a-f0-9]{64}'),sizeBytes:(null|[1-9][0-9]*),status:'(UNSEALED_PENDING_CLOSED_ACCEPTANCE|SEALED_CLOSED_ACCEPTANCE)'\}$/.exec(text);check(match,'literal installed pin object only');value={path:match[1],sha256:match[2]==='null'?null:match[2].slice(1,-1),sizeBytes:match[3]==='null'?null:Number(match[3]),status:match[4]};}return validatePinData(value);}
 function replacementPin(value){return validatePinData(value);}

 function derive(row,parameters={},allowParameters=false){
  unique(row.inputIds,'finite recipe inputs');check(row.inputIds.length>0&&row.inputIds.length<=128,'nonempty bounded recipe inputs');const recipe=row.recipe;check(recipe&&Array.isArray(recipe.steps)&&recipe.steps.length<=128&&Number.isSafeInteger(recipe.maxOutputBytes)&&recipe.maxOutputBytes>0&&recipe.maxOutputBytes<=MAX_CODE,'finite bounded recipe');check(row.inputIds.includes(recipe.baseInputId),'recipe base is declared input');
  const intermediate=recipe.maxIntermediateBytes??recipe.maxOutputBytes;check(Number.isSafeInteger(intermediate)&&intermediate>=recipe.maxOutputBytes&&intermediate<=MAX_ARTIFACT,'bounded recipe intermediate bytes');
  const usedInputs=new Set([recipe.baseInputId]),usedParameters=new Set();let bytes=Buffer.from(node(recipe.baseInputId).bytes),value=null;
  const limit=()=>check(Buffer.isBuffer(bytes)&&bytes.length<=intermediate,'derived intermediate byte bound');limit();
  for(const step of recipe.steps){
   check(step&&typeof step.op==='string','typed finite recipe operation');
   if(step.op==='gunzip'){check(Number.isSafeInteger(step.maxOutputBytes)&&step.maxOutputBytes>0&&step.maxOutputBytes<=intermediate,'bounded gzip decode');bytes=gunzipSync(bytes,{maxOutputLength:step.maxOutputBytes});}
   else if(step.op==='jsonUtf8Member'){value=pointer(JSON.parse(bytes.toString('utf8')),step.pointer);check(typeof value==='string','decoded member is exact UTF8 source');bytes=Buffer.from(value,'utf8');}
   else if(step.op==='base64'){const text=bytes.toString('utf8');check(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text),'canonical finite base64');bytes=Buffer.from(text,'base64');check(bytes.toString('base64')===text,'exact base64 representation');}
   else if(step.op==='replaceFixedPinDeclaration'||step.op==='replaceSyntheticControlDeclaration'){
    isolatedOwner(row);const input=node(recipe.baseInputId);check(['head','bootstrap'].includes(input.kind),'isolated declaration recipe uses actual HEAD/bootstrap source');const text=bytes.toString('utf8');check(Buffer.from(text).equals(bytes),'exact UTF8 declaration source');let pattern,replacement;
    if(step.op==='replaceFixedPinDeclaration'){
     check(input.row.path==='tools/class-mapping-source2-v10-accepted-manifest-v1.mjs'&&['SOURCE2_V10_MANIFEST_PIN','SOURCE2_V10_ACCEPTANCE_PIN'].includes(step.name),'only two installed V10 pin declarations may be masked');
     pattern=new RegExp(`^export const ${step.name}=Object\\.freeze\\(([^\\n]+)\\);$`,'gm');const matches=[...text.matchAll(pattern)];check(matches.length===1,'one fixed named pin declaration');installedPinArgument(matches[0][1]);const pin=replacementPin(step.pin);check(['json','legacy-unsealed-literal'].includes(step.serialization),'actual fixed pin serialization');if(step.serialization==='legacy-unsealed-literal'){check(equal(pin,{path:'absent.json',sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'}),'one literal unsealed fixture pin');replacement='export const '+step.name+"=Object.freeze({path:'absent.json',sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'});";}else replacement='export const '+step.name+'=Object.freeze('+JSON.stringify(pin)+');';
    }else{
     const constants={TEST_SOURCE_MIGRATIONS_SHA256:['hash','synthetic-child-json'],TEST_SOURCE_MIGRATIONS_SIZE_BYTES:['size','synthetic-child-json'],R7_PARENT_MIGRATIONS_SHA256:['hash','synthetic-parent-json'],R7_PARENT_MIGRATIONS_SIZE_BYTES:['size','synthetic-parent-json']},spec=Object.hasOwn(constants,step.name)?constants[step.name]:null;
     check(input.row.path==='tools/class-mapping-test-sharding-core-v2.mjs'&&spec,'only four synthetic test migration constants may be repinned');check(allowParameters||typeof step.value==='string','fixed synthetic declaration cannot accept parameters');
     if(typeof step.value!=='string'){check(step.value&&typeof step.value.parameter==='string'&&step.value.encoding==='utf8'&&!Object.hasOwn(step.value,'concat'),'direct test-control scalar only');const control=row.parameters?.[step.value.parameter];check(control?.kind===(spec[0]==='hash'?'test-control-lowerhex64':'test-control-byte-size')&&control.sourceRole===spec[1],'synthetic constant uses its exact generator-derived control domain');}
     const value=expression(step.value,parameters,usedParameters);check(spec[0]==='hash'?hash.test(value):/^[1-9][0-9]*$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)<=MAX_ARTIFACT,'bounded synthetic hash/decimal replacement');
     pattern=new RegExp('export const '+step.name+(spec[0]==='hash'?" = '[a-f0-9]{64}';":' = [0-9]+;'),'g');check([...text.matchAll(pattern)].length===1,'one exact synthetic control declaration');replacement='export const '+step.name+(spec[0]==='hash'?" = '"+value+"';":' = '+value+';');
    }
    const match=[...text.matchAll(pattern)][0],predicted=bytes.length-Buffer.byteLength(match[0])+substitutionBytes(replacement,text,match[0],match.index);check(predicted<=intermediate,'bounded declaration replacement intermediate');bytes=Buffer.from(text.replace(new RegExp(pattern.source,pattern.flags.replace('g','')),replacement));check(bytes.length===predicted,'exact native declaration replacement bytes');
   }
   else if(step.op==='sliceBytes'){check(Number.isSafeInteger(step.start)&&Number.isSafeInteger(step.end)&&step.start>=0&&step.end>step.start&&step.end<=bytes.length,'fixed bounded source byte slice');bytes=Buffer.from(bytes.subarray(step.start,step.end));check(Buffer.from(bytes.toString('utf8')).equals(bytes),'slice preserves exact UTF8 source bytes');}
   else if(step.op==='appendInput'){check(row.inputIds.includes(step.inputId),'declared concat input');usedInputs.add(step.inputId);const next=node(step.inputId).bytes;check(bytes.length+next.length<=intermediate,'bounded concat intermediate');bytes=Buffer.concat([bytes,next]);}
   else if(['replaceStringAll','replaceLiteralAll','appendUtf8','prependUtf8'].includes(step.op)){
    check(allowParameters||typeof (['replaceStringAll','replaceLiteralAll'].includes(step.op)?step.to:step.value)==='string','fixed derived recipe cannot accept parameters');const text=bytes.toString('utf8');check(Buffer.from(text,'utf8').equals(bytes),'exact UTF8 recipe input');const replacement=expression(['replaceStringAll','replaceLiteralAll'].includes(step.op)?step.to:step.value,parameters,usedParameters);
    if(['replaceStringAll','replaceLiteralAll'].includes(step.op)){check(typeof step.from==='string'&&step.from.length>0&&Number.isSafeInteger(step.occurrences)&&step.occurrences>0&&step.occurrences<=100000&&Buffer.from(step.from).toString('utf8')===step.from&&Buffer.from(replacement).toString('utf8')===replacement,'bounded exact UTF8 string replacement');let offset=0,at;const positions=[];while((at=text.indexOf(step.from,offset))>=0){check(positions.push(at)<=step.occurrences,'exact literal recipe replacement count');offset=at+step.from.length;}check(positions.length===step.occurrences,'exact literal recipe replacement count');let predicted=bytes.length-positions.length*Buffer.byteLength(step.from);for(const index of positions){predicted+=step.op==='replaceLiteralAll'?Buffer.byteLength(replacement):substitutionBytes(replacement,text,step.from,index);check(predicted<=intermediate,step.op==='replaceLiteralAll'?'bounded literal replacement intermediate':'bounded ECMAScript replacement intermediate');}bytes=Buffer.from(step.op==='replaceLiteralAll'?text.split(step.from).join(replacement):text.replaceAll(step.from,replacement));check(bytes.length===predicted,'exact replacement byte calculation');}
    else{check(bytes.length+Buffer.byteLength(replacement)<=intermediate,'bounded UTF8 append intermediate');bytes=Buffer.from(step.op==='appendUtf8'?text+replacement:replacement+text);}
   }else fail('unsupported executable recipe operation '+step.op);
   limit();
  }
  check(equal([...usedInputs].sort(),[...row.inputIds].sort()),'every declared recipe input is actually used');check(bytes.length<=recipe.maxOutputBytes,'derived final code byte bound');return {bytes,usedParameters};
 }
 for(const row of a.decodedFixtureCodeRows){accepted(row);safePath(row.logicalPath);check(row.id.startsWith('decoded:'),'decoded context ID');check(row.inputIds.every(id=>artifactIds.has(id)),'decoded source uses sealed fixture artifacts');check(row.recipe.steps.every(s=>['gunzip','jsonUtf8Member','base64'].includes(s.op)),'decoded source has only finite decode operations');bound(row,{kind:'decoded-fixture-code',...identity(row,['id','logicalPath','inputIds','recipe','sha256','sizeBytes'])});const result=derive(row);add(row,'decoded',pin(row,result.bytes));}
 for(const row of a.deterministicGeneratedCodeRows){accepted(row);safePath(row.logicalPath);check(row.id.startsWith('derived:'),'derived code context ID');code(row.generatorCodeId);unique(row.dependencyIds,'resolved generated dependencies');const binding=bound(row,{kind:'deterministic-generated-code',...identity(row,['id','logicalPath','generatorCodeId','inputIds','recipe','dependencyIds','sha256','sizeBytes']),...(Object.hasOwn(row,'proofScope')?{proofScope:row.proofScope}:{})});check(binding.binding.producerCodeIds.includes(row.generatorCodeId),'binding authenticates actual deterministic generator');const result=derive(row);add(row,'derived',pin(row,result.bytes));}
 // Fixed producer provenance may name a concrete copied/decoded module registered above.
 // Resolve every ID before any producer contract can qualify; artifacts and recipes stay excluded.
 for(const {binding} of bindings.values())for(const id of binding.producerCodeIds)code(id);
 // Platform source has a separate fixed-key authority. It is never a repository,
 // artifact, generator, recipe input, or per-job emitted-instance code row.
 const nodeNativeRows=a.nodeNativeSourceRows??[],nodeNativeSources=new Map(),nodeNativeSourcePins=[];
 check(Array.isArray(nodeNativeRows)&&nodeNativeRows.length<=1,'one finite Node native source class');
 if(nodeNativeRows.length){
  check(typeof io.readNodeAcornPlatformSource==='function','actual installed zero-argument Node native source IO required');
  const observed=io.readNodeAcornPlatformSource();
  check(observed&&typeof observed.nodeVersion==='string'&&/^24\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(observed.nodeVersion)&&observed.processVersion==='v'+observed.nodeVersion&&observed.releaseName==='node','actual Node major 24 runtime identity required');
  check(typeof observed.platform==='string'&&/^[a-z0-9_-]{1,64}$/.test(observed.platform)&&typeof observed.arch==='string'&&/^[a-z0-9_-]{1,64}$/.test(observed.arch),'actual bounded Node platform and architecture identity');
  for(const row of nodeNativeRows){
   accepted(row);check(equal(identity(row,['id','nativeKey','nodeMajor','sha256','sizeBytes']),NODE_NATIVE_ACORN)&&!nodes.has(row.id),'only fixed Node 24 embedded Acorn source may qualify');
   const provider=code(row.providerCodeId);check(provider.kind==='head'&&provider.row.path==='tools/class-mapping-source2-runtime-code-authority-v10.mjs','native provider is the actual installed runtime module');
   const binding=bound(row,{kind:'node-native-source',...identity(row,['id','nativeKey','nodeMajor','sha256','sizeBytes','providerCodeId'])});check(binding.binding.producerCodeIds.includes(row.providerCodeId),'native source binding authenticates actual installed provider');
   pin(row,observed.sourceBytes);check(observed.nativeKey===row.nativeKey,'actual fixed native key identity');nodeNativeSources.set(row.id,row);
   nodeNativeSourcePins.push({...identity(row,['id','nativeKey','nodeMajor','sha256','sizeBytes','providerCodeId']),observedRuntime:identity(observed,['nodeVersion','processVersion','releaseName','platform','arch']),scope:'ACTUAL_FIXED_KEY_PLATFORM_SOURCE;NOT_REPOSITORY_OR_EMITTED_INSTANCE'});
  }
 }
 const producerContracts=new Map(),rootDerivedRecipePins=[],parameterDomainCounts={};

 for(const row of a.parameterizedProducerContracts){
  accepted(row);safePath(row.logicalPath);check(typeof row.id==='string'&&row.id.startsWith('producer:')&&!producerContracts.has(row.id)&&!nodes.has(row.id),'distinct parameterized producer contract ID');code(row.generatorCodeId);unique(row.dependencyIds,'resolved parameterized dependencies');
  check(row.parameters&&typeof row.parameters==='object'&&!Array.isArray(row.parameters)&&Object.keys(row.parameters).length>0&&Object.keys(row.parameters).length<=16,'finite parameter schema');
  check(row.outputBounds&&Number.isSafeInteger(row.outputBounds.maxBytes)&&row.outputBounds.maxBytes>0&&row.outputBounds.maxBytes<=MAX_CODE&&Number.isSafeInteger(row.outputBounds.minBytes)&&row.outputBounds.minBytes>=0&&row.outputBounds.minBytes<=row.outputBounds.maxBytes,'finite expected output bounds');
  const b=bound(row,{kind:'parameterized-producer-contract',...identity(row,['id','logicalPath','generatorCodeId','inputIds','recipe','dependencyIds','parameters','outputBounds']),...(Object.hasOwn(row,'proofScope')?{proofScope:row.proofScope}:{})});check(b.binding.producerCodeIds.includes(row.generatorCodeId),'binding authenticates actual parameterized generator');
  const parameters={};let allValuesKnown=true;
  for(const [name,spec] of Object.entries(row.parameters)){
   check(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name)&&Number.isSafeInteger(spec.maxUtf8Bytes)&&spec.maxUtf8Bytes>0&&spec.maxUtf8Bytes<=4096,'bounded named parameter');
   if(['authenticated-head-module-file-url','authenticated-head-module-path','authenticated-head-module-dirname'].includes(spec.kind)){const target=code(spec.targetId);check(['head','bootstrap'].includes(target.kind),'root-derived URL uses authenticated current HEAD code');parameters[name]=spec.kind==='authenticated-head-module-file-url'?pathToFileURL(resolve(io.rootPhysical,target.row.path)).href:spec.kind==='authenticated-head-module-dirname'?posix.dirname(resolve(io.rootPhysical,target.row.path)):resolve(io.rootPhysical,target.row.path);check(Buffer.byteLength(parameters[name])<=spec.maxUtf8Bytes,'actual root-derived module URL bound');}
   else if(spec.kind==='authenticated-checkout-root'){parameters[name]=io.rootPhysical;check(Buffer.byteLength(parameters[name])<=spec.maxUtf8Bytes,'actual authenticated checkout root bound');}
   else if(spec.kind==='owned-historical-layout-root'){
    check(gitHash.test(spec.commit??'')&&gitHash.test(spec.tree??''),'fixed historical parameter context');unique(spec.layoutNodeIds,'finite historical layout nodes');check(spec.layoutNodeIds.length>0,'nonempty authenticated historical layout');
    for(const id of spec.layoutNodeIds){const target=node(id);check((target.kind==='raw-git'||(target.kind==='artifact'&&target.row.storage==='raw-git'))&&target.row.commit===spec.commit&&target.row.tree===spec.tree,'historical layout uses exact raw context');}
    const fixed=bindings.get(spec.contractBindingId);check(fixed&&equal(fixed.value,{kind:'historical-layout-contract',commit:spec.commit,tree:spec.tree,layoutNodeIds:spec.layoutNodeIds}),'authenticated owned historical layout contract');
    parameters[name]='/UNOBSERVED_OWNED_HISTORICAL_ROOT';allValuesKnown=false;
   }else if(spec.kind==='owned-private-fixture-root'){
    isolatedOwner(row);check(spec.ownerCodeId===row.generatorCodeId&&spec.rootPolicy==='OWNED_MKDTEMP_OUTSIDE_CHECKOUT'&&!Object.hasOwn(spec,'commit')&&!Object.hasOwn(spec,'tree'),'actual private fixture owner/root policy');unique(spec.sourceNodeIds,'fixed private fixture input sources');check(spec.sourceNodeIds.length>0,'nonempty private fixture source contract');
    const allowed=new Set([row.generatorCodeId,...row.inputIds,...row.dependencyIds]);for(const id of spec.sourceNodeIds){node(id);check(allowed.has(id),'private fixture root binds its actual generator/input/dependency sources');}
    const fixed=bindings.get(spec.contractBindingId);check(fixed&&fixed.binding.producerCodeIds.includes(row.generatorCodeId)&&equal(fixed.value,{kind:'private-fixture-layout-contract',ownerCodeId:spec.ownerCodeId,sourceNodeIds:spec.sourceNodeIds,rootPolicy:spec.rootPolicy,proofScope:row.proofScope}),'authenticated isolated private fixture root contract');
    parameters[name]='/UNOBSERVED_OWNED_PRIVATE_FIXTURE_ROOT';check(Buffer.byteLength(parameters[name])<=spec.maxUtf8Bytes,'private fixture root schema sample bound');allValuesKnown=false;
   }else if(spec.kind==='test-control-lowerhex64'||spec.kind==='test-control-byte-size'){
    isolatedOwner(row);check(spec.generatorCodeId===row.generatorCodeId&&['synthetic-parent-json','synthetic-child-json'].includes(spec.sourceRole),'fixed synthetic JSON control generator/role');
    const lowerhex=spec.kind==='test-control-lowerhex64';check(lowerhex?spec.maxUtf8Bytes===64:Number.isSafeInteger(spec.minimumBytes)&&spec.minimumBytes>=1&&Number.isSafeInteger(spec.maximumBytes)&&spec.maximumBytes>=spec.minimumBytes&&spec.maximumBytes<=MAX_ARTIFACT&&spec.maxUtf8Bytes===String(spec.maximumBytes).length,'narrow lowerhex64 or decimal byte-size domain');
    const expected={kind:'isolated-test-control-contract',generatorCodeId:row.generatorCodeId,controlKind:spec.kind,sourceRole:spec.sourceRole,...(lowerhex?{}:{minimumBytes:spec.minimumBytes,maximumBytes:spec.maximumBytes}),...(Object.hasOwn(spec,'sourceArtifactId')?{sourceArtifactId:spec.sourceArtifactId}:{}),proofScope:row.proofScope};
    const fixed=bindings.get(spec.contractBindingId);check(fixed&&fixed.binding.producerCodeIds.includes(row.generatorCodeId)&&equal(fixed.value,expected),'authenticated synthetic JSON control contract');
    if(Object.hasOwn(spec,'sourceArtifactId')){const source=node(spec.sourceArtifactId);check(source.kind==='artifact','synthetic JSON control uses authenticated data artifact');const doc=JSON.parse(source.bytes.toString('utf8'));check(Buffer.from(JSON.stringify(doc,null,2)+'\n').equals(source.bytes),'exact synthetic JSON serializer bytes');check(doc.artifactType===(spec.sourceRole==='synthetic-parent-json'?'finite R7 test-source transitions for immutable R5 roster':'finite R8 test-source transitions for immutable R5 roster'),'actual synthetic parent/child JSON domain');parameters[name]=lowerhex?sha(source.bytes):String(source.bytes.length);if(!lowerhex)check(source.bytes.length>=spec.minimumBytes&&source.bytes.length<=spec.maximumBytes,'actual synthetic byte-size domain');}
    else{parameters[name]=lowerhex?'0'.repeat(64):String(spec.minimumBytes);allValuesKnown=false;}
   }else fail('unsupported/untyped runtime parameter '+name);
   parameterDomainCounts[spec.kind]=(parameterDomainCounts[spec.kind]??0)+1;
  }
  const result=derive(row,parameters,true);check(equal([...result.usedParameters].sort(),Object.keys(parameters).sort()),'every guarded parameter is used by the exact recipe');check(result.bytes.length>=row.outputBounds.minBytes&&result.bytes.length<=row.outputBounds.maxBytes,'expected recipe output bound');
  if(allValuesKnown)rootDerivedRecipePins.push({producerContractId:row.id,sha256:sha(result.bytes),sizeBytes:result.bytes.length,scope:'expected-bytes-from-authenticated-preflight-inputs;NOT_EMITTED_INSTANCE'});
  producerContracts.set(row.id,row);
 }
 // Producer contracts carry source/recipe authority, never concrete input bytes.
 // Resolve forward dependencies only after every producer and fixed binding is verified.
 const executableContext=id=>{if(producerContracts.has(id))return {row:producerContracts.get(id),kind:'producer'};return code(id);};
 for(const row of [...a.deterministicGeneratedCodeRows,...a.parameterizedProducerContracts])for(const id of row.dependencyIds)executableContext(id);
 const seenEdges=new Set(),parameterizedLoads=[],producerModuleEdges=[];
 for(const edge of a.contextEdges){
  const from=executableContext(edge.fromId);check(['static-import','dynamic-import','require','vm','child-module','decoded-load','derived-load','parameterized-emission','producer-module-dependency','function-constructor','vm-native'].includes(edge.kind),'finite contextual edge kind');check(from.kind!=='producer'||edge.kind==='producer-module-dependency','producer source edges use the finite producer dependency contract');
  const edgeKey=JSON.stringify([edge.fromId,edge.toId,edge.kind,edge.specifier??null]);check(!seenEdges.has(edgeKey),'unique context edge');seenEdges.add(edgeKey);
  if(edge.kind==='parameterized-emission'){check(producerContracts.has(edge.toId),'parameterized load resolves to a verified guarded producer contract');parameterizedLoads.push(edge);}
  else if(edge.kind==='vm-native'){check(from.kind==='head'&&nodeNativeSources.has(edge.toId),'native VM edge uses actual HEAD caller and fixed verified platform source');}
  else if(edge.kind==='function-constructor'){const target=executableContext(edge.toId);check(['derived','producer'].includes(target.kind)&&target.row.generatorCodeId===edge.fromId,'Function edge resolves to its authenticated generated body');}
  else if(edge.kind==='producer-module-dependency'){
   check(from.kind==='producer','producer dependency starts at an authenticated producer contract');const target=executableContext(edge.toId);check(from.row.dependencyIds.includes(edge.toId),'producer dependency is declared by its actual source contract');
   check(typeof edge.specifier==='string'&&edge.specifier.length>0,'finite producer dependency specifier');
   if(edge.specifier.startsWith('.')){
    check(!edge.specifier.includes('\\'),'literal relative producer import');const path=posix.normalize(posix.join(posix.dirname(from.row.logicalPath),edge.specifier));safePath(path);check(path===(target.row.logicalPath??target.row.path),'relative producer import resolves in the actual source namespace');
   }else{
    const match=/^parameter:([A-Za-z_][A-Za-z0-9_]{0,63})(?:\/(.+))?$/.exec(edge.specifier);check(match,'finite producer parameter dependency');const spec=from.row.parameters[match[1]];check(spec,'declared producer dependency parameter');
    if(match[2]!==undefined){
     safePath(match[2]);check(spec.kind==='owned-historical-layout-root'&&target.kind==='raw-git'&&target.row.commit===spec.commit&&target.row.tree===spec.tree&&target.row.path===match[2]&&spec.layoutNodeIds.includes(edge.toId),'producer historical-root import uses its exact authenticated layout member');
    }else check(['authenticated-head-module-file-url','authenticated-head-module-path','authenticated-head-module-dirname'].includes(spec.kind)&&spec.targetId===edge.toId&&['head','bootstrap'].includes(target.kind),'producer module parameter resolves to its authenticated HEAD target');
   }
   producerModuleEdges.push(edge);
  }else code(edge.toId);
  const to=nodes.get(edge.toId);
  if(edge.kind==='static-import'&&['head','bootstrap','raw-git'].includes(from.kind)){
   check(typeof edge.specifier==='string'&&edge.specifier.startsWith('.')&&!edge.specifier.includes('\\'),'literal relative context import');const path=posix.normalize(posix.join(posix.dirname(from.row.path),edge.specifier));safePath(path);
   check(edge.toId===(from.kind==='raw-git'?`git:${from.row.commit}:`:'head:')+path,'relative import resolves in the actual code context');
  }else{
   const b=bindings.get(edge.contractBindingId);check(b&&equal(b.value,{kind:'context-edge',...identity(edge,['fromId','toId','kind','specifier'])}),'computed/cross-context edge has exact authenticated binding');
  }
 }
 for(const row of [...a.deterministicGeneratedCodeRows,...a.parameterizedProducerContracts])for(const dependency of row.dependencyIds){
  const ownEdge=a.contextEdges.some(e=>e.fromId===row.id&&e.toId===dependency&&(row.id.startsWith('producer:')?e.kind==='producer-module-dependency':true));
  // Retain reviewed concrete-generator obligations. A producer target always needs its own source edge.
  const legacyConcreteEdge=row.id.startsWith('producer:')&&!producerContracts.has(dependency)&&a.contextEdges.some(e=>e.fromId===row.generatorCodeId&&e.toId===dependency);
  check(ownEdge||legacyConcreteEdge,'every generated/producer dependency has a resolved context edge');
 }
 // Function bodies and injected namespaces are separately authenticated finite authority.
 const functionContracts=a.functionConstructorContracts??[];check(Array.isArray(functionContracts),'explicit finite Function constructor contracts');const functionIds=new Set();
 for(const row of functionContracts){
  accepted(row);check(typeof row.id==='string'&&row.id.startsWith('function:')&&!functionIds.has(row.id)&&!nodes.has(row.id)&&!producerContracts.has(row.id),'unique Function constructor contract ID');functionIds.add(row.id);const generator=code(row.generatorCodeId),body=executableContext(row.bodyCodeId);
  check(['derived','producer'].includes(body.kind)&&body.row.generatorCodeId===row.generatorCodeId,'Function body uses its authenticated generator recipe');
  check(Array.isArray(row.formalParameterStrings)&&row.formalParameterStrings.length<=64,'finite ordered Function formal strings');const formals=[];for(const text of row.formalParameterStrings){check(typeof text==='string'&&text.length>0&&Buffer.byteLength(text)<=4096,'bounded Function formal string');for(const token of text.split(',')){const name=token.trim();check(/^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/.test(name),'simple finite Function formal identifier');formals.push(name);}}
  unique(formals,'Function formal identifiers');check(formals.length<=128&&Array.isArray(row.namespaceBindings)&&equal(row.namespaceBindings.map(x=>x.formalName),formals),'ordered Function namespace covers every formal');
  for(const injected of row.namespaceBindings){check(['node-builtin','carrier-defined-callback-or-data','repository-code'].includes(injected.kind),'finite injected Function namespace kind');unique(injected.sourceCodeIds,'Function namespace concrete source IDs');check(injected.sourceCodeIds.length>0,'Function namespace has concrete source provenance');for(const id of injected.sourceCodeIds)code(id);if(injected.kind==='carrier-defined-callback-or-data')check(injected.sourceCodeIds.includes(row.generatorCodeId),'carrier-defined Function namespace binds actual generator');if(Object.hasOwn(injected,'sourceProducerContractIds')){unique(injected.sourceProducerContractIds,'Function namespace guarded producer IDs');check(injected.kind==='repository-code'&&injected.sourceProducerContractIds.length>0&&injected.sourceProducerContractIds.length<=128,'only repository Function namespace may use finite guarded producer contracts');for(const id of injected.sourceProducerContractIds){check(producerContracts.has(id),'Function namespace uses authenticated producer source contract');check(a.contextEdges.some(edge=>[row.generatorCodeId,row.bodyCodeId].includes(edge.fromId)&&edge.toId===id&&edge.kind==='parameterized-emission'),'Function namespace producer has an explicit authenticated source context edge');}}}
  const site=row.actualCallSite;check(site&&Number.isSafeInteger(site.startByte)&&Number.isSafeInteger(site.endByte)&&site.startByte>=0&&site.endByte>site.startByte&&site.endByte<=generator.bytes.length&&typeof site.source==='string'&&Buffer.byteLength(site.source)<=MAX_CODE&&hash.test(site.sha256??''),'bounded actual Function callsite');const source=generator.bytes.subarray(site.startByte,site.endByte);check(Buffer.from(site.source).equals(source)&&sha(source)===site.sha256&&Number.isSafeInteger(site.line)&&site.line===generator.bytes.subarray(0,site.startByte).toString('utf8').split('\n').length,'exact actual Function callsite source bytes/line');
  const binding=bound(row,{kind:'function-constructor-contract',...identity(row,['id','generatorCodeId','bodyCodeId','formalParameterStrings','namespaceBindings','actualCallSite'])});check(binding.binding.producerCodeIds.includes(row.generatorCodeId),'Function binding authenticates actual caller');check(a.contextEdges.some(edge=>edge.fromId===row.generatorCodeId&&edge.toId===row.bodyCodeId&&edge.kind==='function-constructor'),'Function constructor has an explicit authenticated body context edge');
 }
 const functionEdges=a.contextEdges.filter(edge=>edge.kind==='function-constructor'),requiredFunctionCensus=io.requiredFunctionConstructorCensus,census=a.functionConstructorCensus;
 if(requiredFunctionCensus!==undefined)check(census&&equal(census,requiredFunctionCensus),'installed production requires its exact sealed selected Function constructor census');
 if(functionContracts.length||functionEdges.length||requiredFunctionCensus!==undefined){
  check(census?.status==='INDEPENDENTLY_REVIEWED_COMPLETE_SELECTED_FUNCTION_CONSTRUCTOR_CENSUS','authenticated complete selected Function constructor census required');unique(census.generatorCodeIds,'selected Function census generators');check(census.generatorCodeIds.length>0&&Array.isArray(census.sites)&&census.sites.length>0,'nonempty selected Function constructor census');for(const id of census.generatorCodeIds)code(id);
  const censusBinding=bound(census,{kind:'function-constructor-census',...identity(census,['status','generatorCodeIds','sites'])});for(const id of census.generatorCodeIds)check(censusBinding.binding.producerCodeIds.includes(id),'Function census binds every actual generator');
  const siteKeys=new Set(),coveredContracts=new Set(),coveredGenerators=new Set();
  for(const site of census.sites){check(census.generatorCodeIds.includes(site.generatorCodeId),'Function census site uses admitted generator');const key=JSON.stringify([site.generatorCodeId,site.actualCallSite?.startByte,site.actualCallSite?.endByte]);check(!siteKeys.has(key),'unique actual Function constructor census site');siteKeys.add(key);coveredGenerators.add(site.generatorCodeId);unique(site.constructorContractIds,'Function census body variants');check(site.constructorContractIds.length>0,'Function census site has actual body variants');for(const id of site.constructorContractIds){const contract=functionContracts.find(row=>row.id===id);check(contract&&!coveredContracts.has(id)&&contract.generatorCodeId===site.generatorCodeId&&equal(contract.actualCallSite,site.actualCallSite),'Function census exactly joins actual callsite and body variant');coveredContracts.add(id);}}
  check(equal([...coveredContracts].sort(),[...functionIds].sort())&&equal([...coveredGenerators].sort(),[...census.generatorCodeIds].sort()),'Function census covers every selected constructor contract and generator');
 }
 for(const edge of functionEdges)check(functionContracts.some(row=>row.generatorCodeId===edge.fromId&&row.bodyCodeId===edge.toId),'every typed Function edge has its actual formal and namespace contract');
 // Every admitted native VM call binds the real native getter, imported VM API,
 // shared CommonJS module/exports namespace, and exact selected caller bytes.
 const nativeVmContracts=a.nodeNativeVmContracts??[],nativeVmEdges=a.contextEdges.filter(edge=>edge.kind==='vm-native'),requiredNativeCensus=io.requiredNodeNativeVmCensus,nativeCensus=a.nodeNativeVmCensus;
 check(Array.isArray(nativeVmContracts),'explicit finite Node native VM contracts');const nativeVmIds=new Set();
 function nativeWitness(generator,w,label){
  check(w&&Number.isSafeInteger(w.startByte)&&Number.isSafeInteger(w.endByte)&&w.startByte>=0&&w.endByte>w.startByte&&w.endByte<=generator.bytes.length&&typeof w.source==='string'&&Buffer.byteLength(w.source)<=65536&&hash.test(w.sha256??''),'bounded actual native '+label+' witness');
  const bytes=generator.bytes.subarray(w.startByte,w.endByte);check(Buffer.from(w.source).equals(bytes)&&sha(bytes)===w.sha256&&Number.isSafeInteger(w.line)&&w.line===generator.bytes.subarray(0,w.startByte).toString('utf8').split('\n').length,'exact actual native '+label+' source bytes/line');return w.source;
 }
 for(const row of nativeVmContracts){
  accepted(row);check(typeof row.id==='string'&&row.id.startsWith('native-vm:')&&!nativeVmIds.has(row.id)&&!nodes.has(row.id)&&!producerContracts.has(row.id),'unique Node native VM contract ID');nativeVmIds.add(row.id);
  const generator=code(row.generatorCodeId);check(generator.kind==='head'&&nodeNativeSources.has(row.nativeSourceId),'native VM uses exact HEAD caller and verified platform source');
  const call=nativeWitness(generator,row.actualCallSite,'VM callsite'),importSource=nativeWitness(generator,row.vmBinding?.importWitness,'VM import'),declaration=nativeWitness(generator,row.moduleDeclaration,'module declaration'),acquisition=nativeWitness(generator,row.sourceAcquisition?.witness,'source acquisition');
  let callee;check(row.vmBinding.importWitness.endByte<=row.actualCallSite.startByte,'native VM import precedes actual call');
  if(row.vmBinding.kind==='named-runInNewContext'){check(importSource==="import {runInNewContext} from 'node:vm';",'exact named Node VM import');callee='runInNewContext';}
  else{check(row.vmBinding.kind==='default-vm'&&importSource==="import vm from 'node:vm';",'exact default Node VM import');callee='vm.runInNewContext';}
  const namespace=row.namespace,name=namespace?.moduleIdentifier;check(namespace?.kind==='COMMONJS_SHARED_MODULE_EXPORTS'&&['module','acornModule','parserModule'].includes(name),'finite shared CommonJS native VM namespace');
  const compact=x=>x.replace(/\s+/g,'');check([`const${name}={exports:{}};`,`${name}={exports:{}}`].includes(compact(declaration))&&row.moduleDeclaration.endByte<=row.actualCallSite.startByte,'actual empty CommonJS module declaration precedes native VM');
  const getter="process.binding('natives')['internal/deps/acorn/acorn/dist/acorn']";let expression;
  if(row.sourceAcquisition.kind==='direct-native-member'){check(acquisition===getter&&row.sourceAcquisition.witness.startByte>=row.actualCallSite.startByte&&row.sourceAcquisition.witness.endByte<=row.actualCallSite.endByte,'actual direct fixed-key native source expression');expression=getter;}
  else{const id=row.sourceAcquisition.identifier;check(row.sourceAcquisition.kind==='local-const-native-member'&&id==='parserSource'&&acquisition===`const ${id}=${getter};`&&row.sourceAcquisition.witness.endByte<=row.actualCallSite.startByte,'actual fixed native source const alias');expression=id;}
  const sandbox=name==='module'?'{module,exports:module.exports}':`{module:${name},exports:${name}.exports}`;check(compact(call)===`${callee}(${expression},${sandbox})`,'actual native VM source and shared module/exports sandbox shape');
  const binding=bound(row,{kind:'node-native-vm-contract',...identity(row,['id','generatorCodeId','nativeSourceId','actualCallSite','vmBinding','sourceAcquisition','moduleDeclaration','namespace'])});check(binding.binding.producerCodeIds.includes(row.generatorCodeId),'native VM contract authenticates actual caller');
  check(nativeVmEdges.some(edge=>edge.fromId===row.generatorCodeId&&edge.toId===row.nativeSourceId&&edge.specifier===row.id),'native VM contract has its exact platform context edge');
 }
 if(requiredNativeCensus!==undefined)check(nativeCensus&&equal(nativeCensus,requiredNativeCensus),'installed production requires its exact sealed selected Node native VM census');
 if(nodeNativeRows.length||nativeVmContracts.length||nativeVmEdges.length||requiredNativeCensus!==undefined){
  check(nodeNativeRows.length===1&&nativeCensus?.status==='INDEPENDENTLY_REVIEWED_COMPLETE_SELECTED_NODE_NATIVE_VM_CENSUS','authenticated complete selected Node native VM census required');unique(nativeCensus.generatorCodeIds,'selected native VM census generators');check(nativeCensus.generatorCodeIds.length>0&&Array.isArray(nativeCensus.sites)&&nativeCensus.sites.length>0,'nonempty selected native VM census');
  const binding=bound(nativeCensus,{kind:'node-native-vm-census',...identity(nativeCensus,['status','generatorCodeIds','sites'])});const covered=new Set(),generators=new Set(),sites=new Set();
  for(const id of nativeCensus.generatorCodeIds){code(id);check(binding.binding.producerCodeIds.includes(id),'native VM census binds every actual generator');}
  for(const site of nativeCensus.sites){const row=nativeVmContracts.find(x=>x.id===site.nativeVmContractId),key=JSON.stringify([site.generatorCodeId,site.actualCallSite?.startByte,site.actualCallSite?.endByte]);check(row&&!covered.has(row.id)&&!sites.has(key)&&nativeCensus.generatorCodeIds.includes(site.generatorCodeId)&&row.generatorCodeId===site.generatorCodeId&&equal(row.actualCallSite,site.actualCallSite),'native VM census exactly joins actual caller site and platform contract');covered.add(row.id);sites.add(key);generators.add(row.generatorCodeId);}
  check(equal([...covered].sort(),[...nativeVmIds].sort())&&equal([...generators].sort(),[...nativeCensus.generatorCodeIds].sort()),'native VM census covers every selected native contract and generator');
 }
 for(const edge of nativeVmEdges)check(nativeVmContracts.some(row=>row.generatorCodeId===edge.fromId&&row.nativeSourceId===edge.toId&&row.id===edge.specifier),'every typed native VM edge has its exact source and namespace contract');
 const producerGraph=new Map([...producerContracts.keys()].map(id=>[id,[]]));
 for(const row of a.parameterizedProducerContracts)for(const dependency of row.dependencyIds)if(producerContracts.has(dependency))producerGraph.get(row.id).push(dependency);
 const visiting=new Set(),visited=new Set();function visitProducer(id){check(!visiting.has(id),'acyclic authenticated producer dependency graph');if(visited.has(id))return;visiting.add(id);for(const next of producerGraph.get(id))visitProducer(next);visiting.delete(id);visited.add(id);}for(const id of producerGraph.keys())visitProducer(id);
 unique(a.rootCodeIds,'finite reviewed root IDs');check(a.rootCodeIds.length>0,'nonempty actual selected roots');for(const id of a.rootCodeIds)code(id);
 // Only the production accepted-manifest module needs a structural bootstrap pin:
 // its two final artifact declarations cannot also occur inside their own manifest hash.
 const acceptedManifestPath='tools/class-mapping-source2-v10-accepted-manifest-v1.mjs',acceptedManifestBodySha256='7dc390fbf614ae525e63deaec0b390b9729da9f9ca84b52c357a8c8dfe75fe88';let acceptedManifestBootstrapJoin=null;
 function verifyAcceptedManifestBootstrap(source){
  let text=source.bytes.toString('utf8');check(Buffer.from(text).equals(source.bytes),'exact UTF8 production manifest bootstrap source');const pins={};
  for(const [name,path] of [['SOURCE2_V10_MANIFEST_PIN','research/class-mapping-ci-sharding-v1/source2-test-transition-v1/finite-225-family-migration-v10.json'],['SOURCE2_V10_ACCEPTANCE_PIN','research/class-mapping-ci-sharding-v1/source2-test-transition-v1/closed-v10-integration-acceptance-v1.json']]){
   const pattern=new RegExp(`^export const ${name}=Object\\.freeze\\(([^\\n]+)\\);$`,'gm'),matches=[...text.matchAll(pattern)];check(matches.length===1,'one exact production named pin declaration');const actual=installedPinArgument(matches[0][1]);check(actual.status==='SEALED_CLOSED_ACCEPTANCE'&&actual.path===path,'production bootstrap uses its exact sealed artifact pin');pins[name]=actual;
   text=text.replace(new RegExp(pattern.source,'m'),()=>`export const ${name}=Object.freeze({path:'absent.json',sha256:null,sizeBytes:null,status:'UNSEALED_PENDING_CLOSED_ACCEPTANCE'});`);
  }
  const normalized=Buffer.from(text);check(normalized.length===3104&&sha(normalized)===acceptedManifestBodySha256,'exact reviewed production manifest structural body');
  const manifestPin=pins.SOURCE2_V10_MANIFEST_PIN,acceptancePin=pins.SOURCE2_V10_ACCEPTANCE_PIN,manifestBytes=pin({...manifestPin,id:'production-manifest'},io.readHead(manifestPin.path),MAX_ARTIFACT),acceptanceBytes=pin({...acceptancePin,id:'production-acceptance'},io.readHead(acceptancePin.path),MAX_ARTIFACT),document=JSON.parse(manifestBytes.toString('utf8')),acceptance=JSON.parse(acceptanceBytes.toString('utf8'));
  check(acceptance?.status==='ROOT_ACCEPTED_CLOSED_V10_INTEGRATION'&&Array.isArray(acceptance.pending)&&acceptance.pending.length===0&&equal(acceptance.migration,document),'actual sealed root acceptance joins exact bootstrap manifest');check(equal(document?.v10Integration?.runtimeCodeAuthority,a),'bootstrap pinned manifest equals the actual typed authority');
  return {path:acceptedManifestPath,normalizedBodySha256:acceptedManifestBodySha256,normalizedBodySizeBytes:3104,manifestPin,acceptancePin,actualHeadArtifactPinsVerified:true,scope:'STRUCTURAL_BOOTSTRAP_PLUS_ACTUAL_SEALED_ARTIFACTS;INSTALLED_ZERO_ARGUMENT_READER_REMAINS_REQUIRED'};
 }
 for(const path of io.requiredHeadPaths??[]){const source=nodes.get('head:'+path);if(path===acceptedManifestPath&&source?.kind==='bootstrap')acceptedManifestBootstrapJoin=verifyAcceptedManifestBootstrap(source);else check(source?.kind==='head','required transitive old-verifier/rawGit/helper code omitted: '+path);}

 const reachable=new Set(a.rootCodeIds),pending=[...a.rootCodeIds];while(pending.length){const id=pending.pop();for(const edge of a.contextEdges)if(edge.fromId===id&&!reachable.has(edge.toId)){reachable.add(edge.toId);pending.push(edge.toId);}}
 for(const row of nativeVmContracts)check(reachable.has(row.generatorCodeId)&&reachable.has(row.nativeSourceId),'native VM source and actual selected caller are root reachable');
 const producerContextGraphRequired=producerModuleEdges.length>0||[...producerGraph.values()].some(ids=>ids.length>0);
 if(producerContextGraphRequired)for(const id of producerContracts.keys())check(reachable.has(id),'producer context is reachable from an authenticated concrete root: '+id);


 return {
  schema:'verified-source2-typed-source-and-recipe-authority-v1',qualifiedForRuntimePreflight:true,
  physicalHeadCodePins:a.physicalHeadCodeRows.map(r=>identity(r,['id','path','sha256','sizeBytes'])),
  nodeNativeSourcePins,allDeclaredNodeNativeSourceBytesVerified:nodeNativeRows.length>0,
  rawGitCodePins:a.rawGitCodeRows.map(r=>identity(r,['id','commit','tree','blobOid','path','sha256','sizeBytes'])),
  decodedFixtureCodePins:a.decodedFixtureCodeRows.map(r=>identity(r,['id','logicalPath','sha256','sizeBytes'])),
  deterministicGeneratedCodePins:a.deterministicGeneratedCodeRows.map(r=>identity(r,['id','logicalPath','sha256','sizeBytes'])),bootstrapCodePins:bootstrapPins,
  denominators:{nodeNativeSourceRows:nodeNativeRows.length,nodeNativeVmContracts:nativeVmContracts.length,nodeNativeVmSites:nativeCensus?.sites?.length??0,physicalHeadCodeRows:a.physicalHeadCodeRows.length,rawGitCodeRows:a.rawGitCodeRows.length,decodedFixtureCodeRows:a.decodedFixtureCodeRows.length,deterministicGeneratedCodeRows:a.deterministicGeneratedCodeRows.length,parameterizedProducerContracts:a.parameterizedProducerContracts.length,authenticatedArtifactRows:a.artifactRows.length,fixedContractBindings:a.fixedContractBindings.length,contextEdges:a.contextEdges.length,parameterizedLoadEdges:parameterizedLoads.length,producerModuleDependencyEdges:producerModuleEdges.length,functionConstructorContracts:functionContracts.length,functionConstructorSites:census?.sites?.length??0,rootReachableProducerContracts:[...producerContracts.keys()].filter(id=>reachable.has(id)).length,bootstrapCodePins:bootstrapPins.length,distinctFixedCodeContexts:codeIds.size,actualEmittedInstancesObserved:0},
  rootDerivedExpectedRecipePins:rootDerivedRecipePins,parameterDomainCounts,acceptedManifestBootstrapJoin,producerContextGraphPolicy:'ROOT_REACHABILITY_REQUIRED_FOR_EXPLICIT_PRODUCER_DEPENDENCIES',producerContextGraphRequired,allFixedCodeBytesVerified:true,allGuardedProducerContractsVerified:true,allLoadedHelpersAndTemplatesClassified:true,
  allExecutedCodeBytesVerified:false,emittedInstanceObservation:'NOT_COLLECTED_BY_STATIC_SOURCE_CONTRACT_VERIFIER',runtimeObservationLimits:['Expected deterministic/checkout-root derivations are not observed emitted instances.','Owned temporary-root recipes verify source, finite parameters, bindings and declared bounds; actual generated bytes remain per-job observations.']
 };
}
