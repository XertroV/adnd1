import {fieldsFor} from './mechanics-audit.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Lexical candidates inventory the review universe; only declared contracts can
// establish a specific missing qualifier. A negative lexical result is not proof.
export function sourceQualifierCoverage(data) {
  const rows=[];
  for (const collection of ['rules','spells','classes','equipment','matrices','progressionExplainer']) {
    const items=collection==='progressionExplainer'?[data[collection]].filter(Boolean):data[collection]||[];
    for (const item of items) for (const field of fieldsFor(collection,item)) rows.push({collection,itemId:item.id||'progression-explainer',...field});
  }
  const candidates=rows.filter(r=>typeof r.value==='string'&&/familiar/i.test(r.value)&&/dies|death|killed|hit.points|\bhp\b/i.test(r.value));
  const fact=rows.find(r=>r.collection==='spells'&&r.itemId==='phb-magic-user-find-familiar'&&r.path==='/exceptions/0');
  return {schemaVersion:1,scope:'Every exposed mechanics field is enumerated. Familiar death/HP lexical matches are candidates; semantic qualifier completeness outside the one declared contract is unassessed.',counts:{fields:rows.length,candidates:candidates.length,declaredContracts:1},candidates,contracts:[{collection:'spells',itemId:'phb-magic-user-find-familiar',fieldPointer:'/exceptions/0',requiredQualifier:'normal familiar',status:!fact?'not-assessable':/normal familiar/i.test(fact.value)?'present':'missing-required-qualifier',value:fact?.value??null,source:{book:'PHB',printedPage:66}}]};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),input=args.includes('--input')?args[args.indexOf('--input')+1]:'dist/data.json';
  const report=sourceQualifierCoverage(JSON.parse(readFileSync(input)));
  const output=args.includes('--output')?args[args.indexOf('--output')+1]:null;
  if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify({counts:report.counts,contracts:report.contracts.map(({value,...c})=>c)}));
  if(args.includes('--check')&&report.contracts.some(c=>c.status!=='present'))process.exitCode=1;
}
