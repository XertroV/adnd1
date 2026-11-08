#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DEFAULT_RECEIPT='research/source-audit-batch5-ua26-marker-correction.json';
const DEFAULT_CURRENT_APPEND='research/source-audit-batch5-ua26-current-row-append.json';

const readJson=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value!==null&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
const digest=value=>sha256(Buffer.from(canonical(value)));

export function markerTokensFor(raw) {
  if(raw===null) return [];
  if(raw==='*') return ['*'];
  if(/^[1-6]$/.test(raw)) return [raw];
  if(/^[1-6]\*$/.test(raw)) return [raw[0],'*'];
  throw new Error(`Unsupported UA26 printed marker token: ${JSON.stringify(raw)}`);
}

export function noteIdsForTokens(tokens) {
  return tokens.map(token=>token==='*'?'asterisk':`note-${token}`);
}

export function auditUa26MarkerReceipt(root=repoRoot,receiptPath=DEFAULT_RECEIPT) {
  const receipt=readJson(root,receiptPath);
  const failures=[];
  const fail=message=>failures.push(message);
  if(receipt.schemaVersion!==1) fail('unsupported correction receipt schema');
  if(receipt.status!=='applied-awaiting-independent-review') fail(`unexpected receipt status: ${receipt.status}`);
  if(receipt.source?.sourcePdfSha256!=='e06818cbcce7e4605837ad767e9930c126f43b08d3ce358e14746c7b73eed4f4') fail('source PDF hash differs from the reviewed original');

  const proposal=readJson(root,receipt.frozenInputs?.contextProposal?.path||'research/source-audit-batch5-ua26-context-proposal.json');
  const oldSnapshot=readJson(root,receipt.frozenInputs?.beforeAssociationSnapshot?.path||'research/source-audit-batch5-ua26-note-associations-before-correction.json');
  if(sha256(fs.readFileSync(path.join(root,receipt.frozenInputs?.contextProposal?.path||'research/source-audit-batch5-ua26-context-proposal.json')))!==receipt.frozenInputs?.contextProposal?.sha256) fail('frozen context proposal bytes changed');
  if(sha256(fs.readFileSync(path.join(root,receipt.frozenInputs?.beforeAssociationSnapshot?.path||'research/source-audit-batch5-ua26-note-associations-before-correction.json')))!==receipt.frozenInputs?.beforeAssociationSnapshot?.sha256) fail('frozen before-correction association snapshot bytes changed');

  const sourceRows=proposal.rowContracts.slice(0,68);
  if(sourceRows.length!==68||receipt.sourceMarkerCensus?.length!==68) fail(`expected 68 source rows and marker records; got ${sourceRows.length}/${receipt.sourceMarkerCensus?.length}`);
  const sourceById=new Map(sourceRows.map(row=>[row.sourceRowId,row]));
  const aliasesByRow=new Map(oldSnapshot.currentAppliedAssociations.map(alias=>[alias.sourceRowId,alias]));
  if(aliasesByRow.size!==66) fail(`expected 66 alias rows; got ${aliasesByRow.size}`);
  const tokenCounts={marked:0,unmarked:0};
  const expectedByRow=new Map();
  for(const [index,record] of (receipt.sourceMarkerCensus||[]).entries()){
    const source=sourceRows[index];
    if(!source||record.sourceRowId!==source.sourceRowId||record.ordinal!==source.ordinal||record.label!==source.printedLabel) fail(`marker census row ${index+1} does not match the frozen ordered source rows`);
    let tokens=[];
    try { tokens=markerTokensFor(record.sourceMarkerRaw); } catch(error) { fail(error.message); }
    if(JSON.stringify(tokens)!==JSON.stringify(record.sourceMarkerTokens)) fail(`${record.sourceRowId}: token parts do not preserve the literal marker`);
    if(tokens.join('')!==(record.sourceMarkerRaw??'')) fail(`${record.sourceRowId}: token parts do not reconstruct the literal marker`);
    const expected=noteIdsForTokens(tokens);
    if(JSON.stringify(expected)!==JSON.stringify(record.expectedSpecificNoteIds)) fail(`${record.sourceRowId}: note IDs do not exactly correspond to marker tokens`);
    expectedByRow.set(record.sourceRowId,expected);
    if(tokens.length) tokenCounts.marked++; else tokenCounts.unmarked++;
  }
  if(tokenCounts.marked!==17||tokenCounts.unmarked!==51) fail(`expected 17 marked and 51 unmarked rows; got ${tokenCounts.marked}/${tokenCounts.unmarked}`);

  const noteRects=new Map((receipt.noteDefinitions||[]).filter(note=>note.id!=='general-note').map(note=>[note.id,note.focusRect]));
  const generalRect=(receipt.noteDefinitions||[]).find(note=>note.id==='general-note')?.focusRect;
  let checkedAliases=0;
  for(const source of sourceRows){
    const alias=aliasesByRow.get(source.sourceRowId);
    const expected=expectedByRow.get(source.sourceRowId)||[];
    if(!alias){
      if(source.sourceRowId!=='ua26-weight-damage-31-jo-stick'&&source.sourceRowId!=='ua26-weight-damage-45-quarrel-or-bolt-hand') fail(`${source.sourceRowId}: missing catalog note alias`);
      continue;
    }
    checkedAliases++;
    const catalogPath=alias.catalog;
    const catalogBytes=fs.readFileSync(path.join(root,catalogPath));
    const catalogSha=sha256(catalogBytes);
    const expectedCatalogSha=receipt.currentCatalogHashes?.[catalogPath];
    if(!expectedCatalogSha||catalogSha!==expectedCatalogSha) fail(`${catalogPath}: current catalog hash differs from correction receipt`);
    const catalog=JSON.parse(catalogBytes.toString('utf8'));
    if(catalog.sources?.UA?.sha256!==receipt.source.sourcePdfSha256) fail(`${catalogPath}: source PDF metadata mismatch`);
    const region=catalog.regions.find(candidate=>candidate.id===alias.noteContextRegionId);
    if(!region) {fail(`${catalogPath}#${alias.noteContextRegionId}: missing note alias region`); continue;}
    if(region.sourceRowId!==source.sourceRowId||region.role!=='context') fail(`${catalogPath}#${region.id}: row/context identity mismatch`);
    const association=region.noteAssociation||{};
    const actual=association.specificNoteIds??(association.specificNoteId?[association.specificNoteId]:[]);
    if(association.marker!==(receipt.sourceMarkerCensus.find(row=>row.sourceRowId===source.sourceRowId)?.sourceMarkerRaw??null)) fail(`${source.sourceRowId}: note association marker differs from original source marker`);
    if(JSON.stringify(actual)!==JSON.stringify(expected)) fail(`${source.sourceRowId}: expected specific notes ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    if(association.generalNoteId!=='general-note') fail(`${source.sourceRowId}: missing General Note association`);
    const expectedRects=[...expected.map(id=>noteRects.get(id)),generalRect];
    if(expectedRects.some(rect=>!rect)||JSON.stringify(region.focusRects)!==JSON.stringify(expectedRects)) fail(`${source.sourceRowId}: focused note lines do not exactly match marker tokens plus General Note`);
  }
  if(checkedAliases!==66) fail(`expected 66 current alias regions, checked ${checkedAliases}`);

  // A later current-catalog target is an explicit append after the frozen
  // 66-alias correction universe. Keep those denominators separate so a new
  // owner never rewrites what the correction receipt actually reviewed.
  let appendedTargetAliases=0;
  const appendPath=path.join(root,DEFAULT_CURRENT_APPEND);
  if(fs.existsSync(appendPath)){
    const append=JSON.parse(fs.readFileSync(appendPath,'utf8'));
    const rowId='ua26-weight-damage-45-quarrel-or-bolt-hand';
    const markerRecord=receipt.sourceMarkerCensus.find(row=>row.sourceRowId===rowId);
    if(!markerRecord||markerRecord.sourceMarkerRaw!==null||markerRecord.sourceMarkerTokens.length!==0||markerRecord.expectedSpecificNoteIds.length!==0) fail('current append row does not match the frozen 68-row source-marker census');
    if(append.status!=='current-catalog-context-applied-awaiting-independent-review-of-implemented-hashes') fail(`unexpected current target append status: ${append.status}`);
    if(append.row?.sourceRowId!==rowId||append.currentDataSnapshot?.itemId!=='ua-quarrels-for-same'||append.row?.sourceMarkerRaw!==null||append.row?.sourceMarkerTokens?.length!==0||append.row?.specificNoteIds?.length!==0) fail('current append is not the explicit hand-quarrel row 45 context-only mapping');
    const catalogPath=append.row?.catalog?.path;
    const catalogBytes=fs.readFileSync(path.join(root,catalogPath));
    if(sha256(catalogBytes)!==append.row?.catalog?.afterSha256) fail(`${catalogPath}: current append catalog hash mismatch`);
    const catalog=JSON.parse(catalogBytes.toString('utf8'));
    if(catalog.collection!=='equipment'||catalog.itemId!=='ua-quarrels-for-same'||catalog.sources?.UA?.sha256!==receipt.source.sourcePdfSha256) fail(`${catalogPath}: current append source or owner mismatch`);
    if(catalog.regions.length!==append.row?.catalog?.afterRegionCount) fail(`${catalogPath}: current append region count mismatch`);
    const priceRegion=catalog.regions[0];
    if(priceRegion?.id!==append.row?.catalog?.existingPriceRegion?.id||digest(priceRegion)!==append.row?.catalog?.existingPriceRegion?.canonicalSha256||sha256(Buffer.from(JSON.stringify(priceRegion)))!==append.row?.catalog?.existingPriceRegion?.serializedObjectSha256) fail(`${catalogPath}: pre-existing price region prefix changed`);
    if(JSON.stringify(catalog.sources)!==JSON.stringify(append.row?.catalog?.sourceMetadataAfter)) fail(`${catalogPath}: current append changed source metadata`);
    const rowRegion=catalog.regions.find(region=>region.id===append.row?.rowRegion?.id);
    const noteRegion=catalog.regions.find(region=>region.id===append.row?.noteRegion?.id);
    if(!rowRegion||digest(rowRegion)!==append.row?.rowRegion?.regionObjectSha256||digest(rowRegion.focusRects)!==append.row?.rowRegion?.focusSha256||rowRegion.sourceRowId!==rowId||rowRegion.role!=='row'||rowRegion.sha256!==proposal.imageSources.weightDamageTable.sha256) fail(`${catalogPath}: appended p.26 row region does not match its receipt`);
    if(!noteRegion||digest(noteRegion)!==append.row?.noteRegion?.regionObjectSha256||digest(noteRegion.focusRects)!==append.row?.noteRegion?.focusSha256||noteRegion.sourceRowId!==rowId||noteRegion.contextForRegionId!==rowRegion.id||noteRegion.role!=='context') fail(`${catalogPath}: appended p.27 note alias does not match its receipt`);
    const noteAssociation=noteRegion?.noteAssociation||{};
    if(noteAssociation.marker!==null||noteAssociation.generalNoteId!=='general-note'||(noteAssociation.specificNoteIds||[]).length!==0||noteRegion?.focusRects?.length!==1) fail(`${catalogPath}: unmarked row must focus only General Note and have no specific footnote`);
    if(append.row?.sourceCells?.approximateWeightGoldPieces!=='1'||append.row?.sourceCells?.damageVsSizeSOrM!=='1-3'||append.row?.sourceCells?.damageVsSizeL!=='1-2') fail('current append source-cell census differs from frozen row 45');
    if(append.row?.continuationGroupProposal?.sourceValueScope?.fieldsPromoted!==0||append.row?.continuationGroupProposal?.sourceValueScope?.priceOrQuantityChanged!==false||append.row?.continuationGroupProposal?.sourceValueScope?.perQuarrelPriceInferred!==false||append.row?.continuationGroupProposal?.sourceValueScope?.launcherStatisticsAssigned!==false) fail('current append must remain source context only without value or quantity inference');
    appendedTargetAliases=1;
  }

  const beforeMatches=receipt.beforeCorrection?.specificAssociationMismatches||[];
  const wrongExisting=beforeMatches.filter(row=>row.kind==='wrong-specific-note').length;
  const oldUnresolved=beforeMatches.filter(row=>row.kind==='previously-unresolved').length;
  if(wrongExisting!==2||oldUnresolved!==3||beforeMatches.length!==5) fail(`baseline correction census mismatch: wrong-existing=${wrongExisting}, previously-unresolved=${oldUnresolved}`);
  if(sha256(Buffer.from(canonical(receipt.sourceMarkerCensus)))!==receipt.sourceMarkerCensusSha256) fail('source marker census hash mismatch');
  if(failures.length) return {ok:false,failures,counts:{physicalRows:sourceRows.length,marked:tokenCounts.marked,unmarked:tokenCounts.unmarked,aliases:checkedAliases}};
  return {ok:true,receiptPath,counts:{physicalRows:sourceRows.length,marked:tokenCounts.marked,unmarked:tokenCounts.unmarked,corrective66Aliases:checkedAliases,currentTargetAppends:appendedTargetAliases,currentWDAliases:checkedAliases+appendedTargetAliases,explicitMarkerRows:tokenCounts.marked,baselineWrongSpecificAssignments:wrongExisting,previouslyUnresolvedNowSourceAdjudicated:oldUnresolved,correctedCatalogs:(receipt.affectedCatalogs||[]).length,checkedCatalogs:Object.keys(receipt.currentCatalogHashes||{}).length+(appendedTargetAliases?1:0)},sourceMarkerCensusSha256:receipt.sourceMarkerCensusSha256};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const result=auditUa26MarkerReceipt(repoRoot,DEFAULT_RECEIPT);
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    if(!result.ok) process.exitCode=1;
  }catch(error){
    process.stderr.write(`${error.stack||error}\n`);
    process.exitCode=1;
  }
}
