import {createHash} from 'node:crypto';
import vm from 'node:vm';

// Parse application source as data. The VM evaluates only Node's built-in Acorn
// parser source; it never evaluates the audited application source.
const parserSource=process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'];
if(typeof parserSource!=='string')throw new Error('Node embedded Acorn source is unavailable');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const parserSourceSha256=sha256(parserSource);
const parserModule={exports:{}};
vm.runInNewContext(parserSource,{module:parserModule,exports:parserModule.exports});
const acorn=parserModule.exports;
if(typeof acorn.parse!=='function'||typeof acorn.version!=='string')throw new Error('Node embedded Acorn parser API is unavailable');

export const inlineProducerParserIdentity=Object.freeze({
 parser:'Node embedded Acorn (static source parse only)',
 nodeVersion:process.version,
 acornVersion:acorn.version,
 acornSourceSha256:parserSourceSha256
});

const producerClassByFunction=Object.freeze({
 attributeLayoutHTML:'field-attribute-layout',
 suggestedPriceHTML:'equipment-estimate-comparison',
 equipmentDetailHTML:'equipment-related-reference',
 progressionExplainerHTML:'progression-explainer-reference',
 progressionExplainerDetailHTML:'progression-explainer-detail-reference',
 matrixDetailHTML:'matrix-detail-reference',
 advancementControlsHTML:'class-advancement',
 advancementSummaryHTML:'class-advancement',
 xpTableHTML:'class-xp-table',
 classDetailHTML:'class-progression-reference',
 tableFactSourceChip:'source-table-fact-reference',
 ruleBulletSourceChips:'rule-bullet-field-reference',
 exactPendingPdfHirelingBulletSourceChips:'hireling-pending-pdf-bullet-field-reference',
 calculateXP:'dynamic-xp-result',
 fighterCombatHTML:'fighter-matrix-reference'
});

const identifierName=node=>node?.type==='Identifier'?node.name:null;
const callName=node=>node?.type==='Identifier'?node.name:
 node?.type==='MemberExpression'&&!node.computed&&node.property?.type==='Identifier'?node.property.name:null;
function namedFunction(node,parent,inherited){
 if(node.type==='FunctionDeclaration')return identifierName(node.id)||inherited;
 if(node.type==='FunctionExpression')return identifierName(node.id)||(parent?.type==='VariableDeclarator'?identifierName(parent.id):null)||inherited;
 if(node.type==='ArrowFunctionExpression')return parent?.type==='VariableDeclarator'?identifierName(parent.id)||inherited:inherited;
 return inherited;
}
function classAbilityReferenceContainer(ancestors){
 function referencesOwner(node){
  if(node?.type==='MemberExpression'&&callName(node)==='references')return identifierName(node.object);
  if(node?.type==='LogicalExpression'||node?.type==='ConditionalExpression')return referencesOwner(node.left)||referencesOwner(node.right)||referencesOwner(node.test)||referencesOwner(node.consequent)||referencesOwner(node.alternate);
  return null;
 }
 for(let index=ancestors.length-1;index>=0;index--){
  const arrow=ancestors[index];
  if(arrow.type!=='ArrowFunctionExpression'||!arrow.params.some(parameter=>identifierName(parameter)==='reference'))continue;
  const mapCall=ancestors[index-1];
  if(mapCall?.type!=='CallExpression'||callName(mapCall.callee)!=='map')continue;
  const owner=referencesOwner(mapCall.callee.object);
  if(owner==='ability')return 'classes.classAbilities[].references';
  if(owner==='inheritance')return 'classes.classAbilityInheritance.references';
 }
 return null;
}
function classifyCall(node,functionName,ancestors,source){
 const first=node.arguments[0],firstName=identifierName(first);
 if(functionName==='classAbilitiesHTML'){
  if(firstName==='turningTable')return {producerClass:'class-abilities-table-record',scope:'rules:cleric-turning-table'};
  if(firstName==='reference'){
   const sourceContainer=classAbilityReferenceContainer(ancestors);
   if(sourceContainer)return {producerClass:'class-ability-field-reference',sourceContainer};
  }
  throw new Error(`Unclassified classAbilitiesHTML inlineSourceChip CallExpression at dist/app.js:${node.loc.start.line}:${node.loc.start.column+1}: ${source.slice(node.start,node.end)}`);
 }
 const producerClass=producerClassByFunction[functionName];
 if(!producerClass)throw new Error(`Unclassified citation chip producer CallExpression at dist/app.js:${node.loc.start.line}:${node.loc.start.column+1} in ${functionName||'(top level)'}: ${source.slice(node.start,node.end)}`);
 return {producerClass};
}

export function auditInlineProducerCallExpressions(source){
 if(typeof source!=='string')throw new TypeError('source must be a JavaScript source string');
 const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true,allowHashBang:true});
 const calls=[];
 function walk(node,functionName='(top level)',parent=null,ancestors=[]){
  if(!node||typeof node!=='object')return;
  const activeFunction=namedFunction(node,parent,functionName);
  if(node.type==='CallExpression'&&callName(node.callee)==='inlineSourceChip'){
   const classification=classifyCall(node,activeFunction,ancestors,source);
   calls.push({
    line:node.loc.start.line,
    column:node.loc.start.column+1,
    function:activeFunction,
    firstArgument:node.arguments[0]?source.slice(node.arguments[0].start,node.arguments[0].end):null,
    producerClass:classification.producerClass,
    ...(classification.scope?{scope:classification.scope}:{}),
    ...(classification.sourceContainer?{sourceContainer:classification.sourceContainer}:{})
   });
  }
  const nextAncestors=[...ancestors,node];
  for(const[key,value]of Object.entries(node)){
   if(['start','end','loc'].includes(key))continue;
   if(Array.isArray(value))for(const child of value)walk(child,activeFunction,node,nextAncestors);
   else if(value&&typeof value==='object')walk(value,activeFunction,node,nextAncestors);
  }
 }
 walk(ast);
 const lineKeys=new Set(calls.map(call=>`${call.line}\0${call.function}`));
 return {
  parser:inlineProducerParserIdentity,
  callExpressionCount:calls.length,
  sourceLineSiteCount:lineKeys.size,
  classes:[...new Set(calls.map(call=>call.producerClass))].sort(),
  calls
 };
}
