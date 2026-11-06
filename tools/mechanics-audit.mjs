import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allow = {
  spells: ['class','level','classes','fields','effect','conditions','exceptions'],
  equipment: ['price','fields','summary','priceNote'],
  rules: ['summary','bullets'],
  classes: ['hitDie','description','xpRows','levelChanges','guidance','xpContinuation','levelLimit','maxLevel','minLevel','xpNote','attackTableNote','errata','retainedSkillsNote','progression','pendingMechanics'],
  matrices: ['armorClasses','rows','notes','ruleNotes','comparisonExamples'],
  progressionExplainer: ['description','sections','terminologyNotes'],
};
const excluded = new Set(['book','pages','page','pdfPage','status','incomplete','id','label','references','reference','source','sources','sourceExcerpts','sourceSha256','verification','checkedOn','additionalSources']);
const priceKeys = new Set(['amount','currency','unit']);
const esc = s => String(s).replaceAll('~','~0').replaceAll('/','~1');
const unesc = s => s.replaceAll('~1','/').replaceAll('~0','~');
const containsPath = (parent, child) => parent === '' || parent === '/' || child === parent || child.startsWith(parent + '/');
export const dataHash = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
export function getPointer(object, pointer) {
  if (pointer === '' || pointer === '/') return object;
  let value = object;
  for (const part of pointer.split('/').slice(1).map(unesc)) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined;
    value = value[part];
  }
  return value;
}
function flatten(value, pointer, out, collection) {
  if (value === null || typeof value !== 'object') { out.push({path:pointer,value}); return; }
  if (Array.isArray(value)) {
    if (!value.length) out.push({path:pointer,value:[]});
    else value.forEach((v,i) => flatten(v, `${pointer}/${i}`, out, collection));
    return;
  }
  const keys = Object.keys(value).filter(k => !excluded.has(k) && (collection !== 'equipment' || pointer !== '/price' || priceKeys.has(k)));
  if (!keys.length) return;
  for (const key of keys) flatten(value[key], `${pointer}/${esc(key)}`, out, collection);
}
export function fieldsFor(collection, item) {
  const result = [];
  for (const key of allow[collection]) if (Object.hasOwn(item,key)) flatten(item[key], `/${esc(key)}`, result, collection);
  return result;
}
const blank = v => v === null || v === undefined || (typeof v === 'string' && (v.trim() === '' || /^(?:gap:|unextracted\b|not (?:yet )?extracted\b)/i.test(v.trim())));
const conflict = reason => /(?:source|print(?:ed)?|edition|table|rule).{0,80}(?:conflict|contradict|disagree|ambigu)|(?:conflict|contradict|disagree).{0,80}(?:source|print(?:ed)?|edition|table|rule)/i.test(reason || '') && !/not yet|pending|not (?:yet )?(?:checked|reviewed|compared)|requires (?:visual|further|separate) (?:review|comparison)/i.test(reason || '');
function sanitized(value) {
  if (Array.isArray(value)) return value.map(sanitized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !/^(?:crop|crops|image|localPath|filePath)$/i.test(k)).map(([k,v]) => [k,sanitized(v)]));
  if (typeof value === 'string') return value.replace(/\/workspace\/private-source-pdfs\/[\w./ -]+/g, '[private source path omitted]');
  return value;
}
function normalizeReviews(proposals,data,previousReviews=[]) {
  return proposals.flatMap(({checker,records}) => records.map(r => {
    const prior=previousReviews.find(p=>p.checker===checker&&p.collection===r.collection&&p.id===r.id);
    const item=r.collection==='progressionExplainer'?data.progressionExplainer:data[r.collection]?.find(x=>x.id===r.id);
    const checkedPaths=r.checkedPaths||[];
    const checkedValues=Object.fromEntries((item?fieldsFor(r.collection,item):[]).filter(f=>checkedPaths.some(p=>containsPath(p,f.path))).map(f=>[f.path,prior?.checkedValues&&Object.hasOwn(prior.checkedValues,f.path)?prior.checkedValues[f.path]:f.value]));
    return {checker,collection:r.collection,id:r.id,checkedPaths,checkedValues,reviewedPaths:sanitized(r.reviewedPaths||[]),sources:sanitized(r.sources || []),unresolved:sanitized(r.unresolved || []),changes:sanitized(r.changes || [])};
  }));
}
export function buildLedger(data, proposals, {alreadyNormalized=false,previousReviews=[]} = {}) {
  const reviews = alreadyNormalized ? proposals : normalizeReviews(proposals,data,previousReviews);
  const byKey = new Map();
  for (const review of reviews) { const key=`${review.collection}\0${review.id}`; if (!byKey.has(key)) byKey.set(key,[]); byKey.get(key).push(review); }
  const records=[]; const staleChanges=[]; const orphanReviews=[];
  const collections = Object.keys(allow);
  for (const collection of collections) {
    const values = collection === 'progressionExplainer' ? [data[collection]] : data[collection];
    for (const item of values || []) {
      const id = collection === 'progressionExplainer' ? 'progression-explainer' : item.id;
      const key = `${collection}\0${id}`; const matching = byKey.get(key) || []; byKey.delete(key);
      const evaluated=[];
      for (const review of matching) for (const change of review.changes) {
        const actual=getPointer(item,change.path); const current=actual === undefined ? null : actual;
        let state=isDeepStrictEqual(current,change.newValue) ? 'corrected-and-checked' : isDeepStrictEqual(current,change.oldValue) ? 'correction-proposed' : 'stale-proposal';
        if(state==='stale-proposal') staleChanges.push({collection,id,checker:review.checker,path:change.path,currentValue:current,oldValue:change.oldValue,newValue:change.newValue});
        evaluated.push({checker:review.checker,...change,state});
      }
      const fields=fieldsFor(collection,item).map(field => {
        const related=evaluated.filter(c=>containsPath(c.path,field.path)||containsPath(field.path,c.path));
        const unresolved=matching.flatMap(r=>r.unresolved.filter(u=>u && typeof u==='object' && typeof u.path==='string' && (containsPath(u.path,field.path)||containsPath(field.path,u.path))).map(u=>({checker:r.checker,...u})));
        const checkers=matching.filter(r=>r.checkedPaths.some(p=>typeof p==='string' && containsPath(p,field.path))).map(r=>r.checker);
        const staleCheck=matching.some(r=>r.checkedValues&&Object.hasOwn(r.checkedValues,field.path)&&!isDeepStrictEqual(r.checkedValues[field.path],field.value));
        const editorial=matching.some(r=>(r.reviewedPaths||[]).some(p=>containsPath(p.path,field.path)&&/editorial|advice/i.test(p.result||'')));
        let status;
        if (related.some(c=>c.state==='stale-proposal')) status='stale-proposal';
        else if (related.some(c=>c.state==='correction-proposed')) status='correction-proposed';
        else if (staleCheck && !related.some(c=>c.state==='corrected-and-checked')) status='stale-proposal';
        else if (unresolved.some(u=>conflict(u.reason))) status='source-conflict';
        else if (editorial && related.some(c=>c.state==='corrected-and-checked')) status='editorial-reviewed';
        else if (related.some(c=>c.state==='corrected-and-checked')) status='corrected-and-checked';
        else if (staleCheck) status='stale-proposal';
        else if (blank(field.value)) status='not-extracted';
        else if (unresolved.some(u=>/not yet|not (?:checked|reviewed|compared)|pending|requires? (?:visual|further|separate)|not visually/i.test(u.reason||''))) status='unchecked';
        else if (checkers.length) status='source-checked';
        else if (editorial) status='editorial-reviewed';
        else status='unchecked';
        return {...field,status,inspected:checkers.length>0 || related.length>0 || status==='source-conflict'||editorial,checkers:[...new Set([...checkers,...related.map(c=>c.checker),...unresolved.map(u=>u.checker)])],...(unresolved.length?{unresolved}:{}),...(related.length?{changePaths:[...new Set(related.map(c=>c.path))]}:{})};
      });
      records.push({collection,id,fields,sources:[...new Map(matching.flatMap(r=>r.sources).map(s=>[JSON.stringify(s),s])).values()],reviewers:[...new Set(matching.map(r=>r.checker))],unresolvedNotes:matching.flatMap(r=>r.unresolved.filter(u=>typeof u==='string' && !u.startsWith('/')).map(note=>({checker:r.checker,note}))),proposedChanges:evaluated});
    }
  }
  for (const [key,rs] of byKey) for (const r of rs) orphanReviews.push({collection:r.collection,id:r.id,checker:r.checker});
  const counts={records:records.length,totalFields:0,inspectedFields:0,sourceCheckedFields:0,unchangedSourceCheckedFields:0,correctedAndCheckedFields:0,correctionPendingFields:0,notExtractedFields:0,sourceConflictFields:0,editorialReviewedFields:0,staleProposalFields:0,uncheckedFields:0};
  const keys={'source-checked':'unchangedSourceCheckedFields','corrected-and-checked':'correctedAndCheckedFields','correction-proposed':'correctionPendingFields','not-extracted':'notExtractedFields','source-conflict':'sourceConflictFields','editorial-reviewed':'editorialReviewedFields','stale-proposal':'staleProposalFields','unchecked':'uncheckedFields'};
  for (const r of records) for (const f of r.fields) {counts.totalFields++;counts[keys[f.status]]++;if(f.status==='source-checked'||f.status==='corrected-and-checked')counts.sourceCheckedFields++;if(f.inspected)counts.inspectedFields++;}
  const pct=n=>counts.totalFields ? Number((100*n/counts.totalFields).toFixed(2)) : 0;
  return {schemaVersion:1,input:{path:'dist/data.json',sha256:dataHash(data),hashFormat:'SHA-256 of JSON.stringify(parsed data)',denominator:'Existing mechanics leaves under explicitly included paths; empty arrays and nulls are leaves. Nested source provenance and labels excluded.',countSemantics:'Source-checked includes corrected-and-checked. Inspected includes any explicitly checked field or proposed correction, including checked nulls; percentages may overlap.'},counts,percentages:{inspectedFields:pct(counts.inspectedFields),sourceCheckedFields:pct(counts.sourceCheckedFields),unchangedSourceCheckedFields:pct(counts.unchangedSourceCheckedFields),correctedAndCheckedFields:pct(counts.correctedAndCheckedFields),correctionPendingFields:pct(counts.correctionPendingFields),notExtractedFields:pct(counts.notExtractedFields),uncheckedFields:pct(counts.uncheckedFields)},records,reviewRecords:reviews,validation:{staleChanges,orphanReviews}};
}
export function validateLedger(ledger,data) {
  const errors=[];
  if(ledger.input.sha256!==dataHash(data))errors.push('Current data hash differs from ledger input hash.');
  const rebuilt=buildLedger(data,ledger.reviewRecords,{alreadyNormalized:true});
  if(rebuilt.validation.staleChanges.length)errors.push(`${rebuilt.validation.staleChanges.length} proposed changes do not match either current oldValue or newValue.`);
  if(!isDeepStrictEqual(ledger.counts,rebuilt.counts))errors.push('Ledger counts do not match regenerated counts.');
  if(!isDeepStrictEqual(ledger.records,rebuilt.records))errors.push('Ledger field values, evidence or statuses do not match regenerated records.');
  if(!isDeepStrictEqual(ledger.percentages,rebuilt.percentages))errors.push('Ledger percentages do not match regenerated percentages.');
  if(rebuilt.validation.orphanReviews.length)errors.push('Ledger contains reviews for unknown records.');
  if(rebuilt.counts.staleProposalFields)errors.push('Ledger contains checked values that changed without a matching reviewed correction.');
  return errors;
}
export function renderSummary(ledger) {
  const c=ledger.counts;
  const lines=['# Mechanics audit progress','',`Snapshot of **${c.records} records / ${c.totalFields.toLocaleString('en-US')} tracked mechanics fields**.`, '',`**${ledger.percentages.sourceCheckedFields}% source-checked**; **${ledger.percentages.inspectedFields}% inspected**. Inspection includes pending corrections and editorial review. Neither percentage measures whole-book coverage or implies every rule is complete.`, '', '| Collection | Fields | Source-checked | Corrections pending | Unchecked |','| --- | ---: | ---: | ---: | ---: |'];
  for(const collection of Object.keys(allow)){
    const fields=ledger.records.filter(r=>r.collection===collection).flatMap(r=>r.fields);
    const n=status=>fields.filter(f=>status.includes(f.status)).length;
    lines.push(`| ${collection} | ${fields.length} | ${n(['source-checked','corrected-and-checked'])} | ${n(['correction-proposed'])} | ${n(['unchecked'])} |`);
  }
  lines.push('',`Other dispositions: ${c.notExtractedFields} unextracted fields; ${c.sourceConflictFields} explicit field-level source conflicts; ${c.editorialReviewedFields} editorial/advisory fields reviewed separately. Additional unresolved qualifications are retained in the per-record notes.`, '', 'The [full field log](mechanics-audit-progress.json) preserves values, checkers, source pages/file hashes, pending old/new corrections and unchecked work. See the [log guide](README.md) for definitions and regeneration.', '', `Assembled-data SHA-256: \`${ledger.input.sha256}\`.`, '', 'This is a saved checkpoint, not a live estimate. Run `node tools/mechanics-audit.mjs --check` to verify it.');
  return lines.join('\n')+'\n';
}
function main() {
  const data=JSON.parse(fs.readFileSync(path.join(root,'dist/data.json'),'utf8'));const output=path.join(root,'research/mechanics-audit-progress.json');
  if(process.argv.includes('--check')) {const ledger=JSON.parse(fs.readFileSync(output,'utf8'));const errors=validateLedger(ledger,data); if(errors.length){console.error(errors.join('\n'));process.exitCode=1;} else console.log('Ledger data hash, counts, and proposed values validate.');return;}
  const files=fs.readdirSync(path.join(root,'research')).filter(x=>/^mechanics-.*\.json$/.test(x)&&x!=='mechanics-audit-progress.json').sort();
  const proposals=files.map(name=>({checker:name.replace(/\.json$/,''),records:JSON.parse(fs.readFileSync(path.join(root,'research',name),'utf8')).records||[]}));
  const saved=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):null;
  const ledger=process.argv.includes('--from-log')||!proposals.length&&saved ? buildLedger(data,saved?.reviewRecords||[],{alreadyNormalized:true}) : buildLedger(data,proposals,{previousReviews:saved?.reviewRecords||[]});
  fs.writeFileSync(output,JSON.stringify(ledger,null,2)+'\n');fs.writeFileSync(path.join(root,'research/mechanics-audit-progress.md'),renderSummary(ledger));console.log(JSON.stringify({counts:ledger.counts,percentages:ledger.percentages,validation:{staleChanges:ledger.validation.staleChanges.length,orphanReviews:ledger.validation.orphanReviews.length}},null,2));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main();
