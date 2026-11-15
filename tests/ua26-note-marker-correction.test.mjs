import {readBeforeJoFile} from './helpers/ua-source-batch6-jo-fixture.mjs';
import {after,test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {markerTokensFor,noteIdsForTokens} from '../tools/ua26-note-marker-audit.mjs';
import {auditUa26MarkerReceiptWithHCurrentSourceEpoch} from '../tools/ua26-note-marker-audit-h-v2.mjs';
import {assertHistoricalHPreimage} from '../research/class-mapping-history-v1/closed-version29-reader-class-mapping-v1.mjs';

const root=path.resolve(process.cwd());
const read=rel=>JSON.parse(readBeforeJoFile(path.join(root,rel),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const markerHPreimageCommit='5c6a57386af372c7c0d89e342003a7edf68ca0dd';
const markerTransitionRegistryPath='research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/ua26-marker-dmg175-transition-h-v1.json';
const markerReceiptPath='research/source-audit-batch5-ua26-marker-correction.json';
const markerJoAppendPath='research/source-audit-batch6-jo-ua26-alias-append.json';
const markerCurrentAppendPath='research/source-audit-batch5-ua26-current-row-append.json';
const add=(set,rel)=>{if(typeof rel==='string'&&rel.length&&!path.isAbsolute(rel))set.add(rel);};
const rootJson=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const markerHPreimageRoot=(()=>{
  const proof=assertHistoricalHPreimage();
  assert.equal(proof.historicalHPreimageCommit,markerHPreimageCommit,'strict MM guard verifies the exact pinned H preimage');
  assert.equal(proof.historicalHPreimageTree,'391026a96811e7bcf0dfcb61c3753ff708308fe1');
  const receipt=rootJson(markerReceiptPath);
  const joAppend=rootJson(markerJoAppendPath);
  const currentAppend=rootJson(markerCurrentAppendPath);
  const nativeHFixture=rootJson('tests/fixtures/hirelings-source-current-cohort-v1.json');
  const historicalHInputHashes={...nativeHFixture.sourceRawInputs,'research/mechanics-audit-progress.json':'5627488c038354a15e4cc3ab1871dab02eb1f3eec9fa84a5ff3666cf253bcc43'};
  const required=new Set([
    markerReceiptPath,markerJoAppendPath,markerCurrentAppendPath,'dist/data.json','dist/books.js',
    'research/price-source-inventory.json','research/source-audit-input-dmg175-source-987a25d3ba2d.json',
    'research/source-audit-pass8-dmg175-source-body-handoff-transition-v1.json',
    'research/ua28-field-target-review-v1/independent-review-evidence-v1.json',
    'research/source-audit-pass8-ua28-caption-metadata-independent-review-v1.json',
    'research/source-audit-pass8-ua28-v7-row-caption-independent-review-v1.json',
    'research/dmg175-validation-coordinator-v1/first-fullsuite-classification-v1/ua26-current-h-successor-v1/validation/ua26-marker-full-catalog-diff-h-v1.json',
    'tools/ua26-note-marker-audit.mjs',markerTransitionRegistryPath
  ]);
  for(const ref of Object.values(receipt.frozenInputs||{}))add(required,ref?.path);
  for(const rel of Object.keys(receipt.currentCatalogHashes||{}))add(required,rel);
  for(const ref of [joAppend.sourcePeer,joAppend.frameDerivation,joAppend.catalog,
    joAppend.caltropCatalogExtension?.before,joAppend.caltropCatalogExtension?.after])add(required,ref?.path);
  add(required,currentAppend.row?.catalog?.path);
  add(required,'tests/helpers/ua-source-batch6-jo-fixture.mjs');
  add(required,'tests/fixtures/hirelings-source-current-cohort-v1.json');
  add(required,'tests/helpers/hirelings-source-current-cohort.mjs');
  add(required,'tests/helpers/hirelings-source-current-cohort-kernel-v1.mjs');
  add(required,'research/hirelings-native-h-v1/source-body-handoff-transition-v1.json');
  add(required,'research/mechanics-audit-progress.json');
  add(required,'tools/ua26-note-marker-audit-h-v2.mjs');
  for(const rel of Object.keys(nativeHFixture.sourceRawInputs||{}))add(required,rel);
  const copiedPaths=new Set([
    'dist/scans/verified/equipment-ua-harpoon.json','dist/scans/verified/equipment-phb-hammer.json',
    'dist/scans/verified/equipment-phb-javelin.json','dist/scans/verified/equipment-ua-aklys-hurled.json',
    'tests/fixtures/hirelings-source-current-cohort-v1.json','tests/helpers/hirelings-source-current-cohort.mjs',
    'tests/helpers/hirelings-source-current-cohort-kernel-v1.mjs','tools/ua26-note-marker-audit-h-v2.mjs'
  ]);
  const result=fs.mkdtempSync(path.join(os.tmpdir(),'ua26-marker-h-preimage-'));
  try{
    for(const rel of required){
      const source=path.join(root,rel),destination=path.join(result,rel);
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      if(Object.hasOwn(historicalHInputHashes,rel)){
        const bytes=execFileSync('git',['show',`${markerHPreimageCommit}:${rel}`],{cwd:root,maxBuffer:64*1024*1024});
        assert.equal(sha(bytes),historicalHInputHashes[rel],`${rel}: exact H M1 Git blob`);
        fs.writeFileSync(destination,bytes);
      }else if(copiedPaths.has(rel))fs.copyFileSync(source,destination);
      else fs.symlinkSync(source,destination);
    }
    fs.symlinkSync(path.join(root,'.git'),path.join(result,'.git'),'file');
    return result;
  }catch(error){fs.rmSync(result,{recursive:true,force:true});throw error;}
})();
after(()=>fs.rmSync(markerHPreimageRoot,{recursive:true,force:true}));

test('post-application, pre-correction all-66 note-association snapshot preserves the five source-marker divergences',()=>{
  const receipt=read('research/source-audit-batch5-ua26-marker-correction.json');
  const before=read(receipt.beforeCorrection.associationSnapshot.path);
  assert.equal(sha(readBeforeJoFile(path.join(root,receipt.beforeCorrection.associationSnapshot.path))),receipt.beforeCorrection.associationSnapshot.sha256);
  // 679 is the historical source/page baseline. The 66 linked aliases did not
  // exist there: they were introduced by this branch's catalog application
  // and were captured in the working tree immediately before marker correction.
  assert.equal(before.inputs.baselineCommit,'679b15d1c580172e54314829c1c3c86dc78b65f3');
  assert.equal(before.census.physicalWeightDamageRows,68);
  assert.equal(before.census.activeConfirmedTargetAliases,66);
  assert.equal(before.currentAppliedAssociations.length,66,'the full alias universe is preserved, not just the exceptions');
  const byLabel=new Map(receipt.beforeCorrection.specificAssociationMismatches.map(row=>[row.label,row]));
  assert.deepEqual([...byLabel.values()].map(row=>[row.ordinal,row.label,row.kind,row.actualSpecificNoteIds,row.expectedSpecificNoteIds]),[
    [8,'Bill-Guisarme','wrong-specific-note',['asterisk'],['note-6']],
    [21,'Glaive','previously-unresolved',[],['note-6','asterisk']],
    [23,'Guisarme','previously-unresolved',[],['note-6']],
    [24,'Guisarme-Voulge','previously-unresolved',[],['note-6']],
    [53,'Spear','wrong-specific-note',['double-asterisk'],['note-2','asterisk']],
  ]);
  assert.equal(receipt.census.totalBeforeCorrectionDivergences,5);
  assert.equal(receipt.census.previouslyWrongSpecificAssignments,2);
  assert.equal(receipt.census.previouslyUnresolvedRowsNowSourceAdjudicated,3);
});

test('literal marker tokenization keeps 2* and 6* distinct from asterisk-pair notes',()=>{
  assert.deepEqual(markerTokensFor(null),[]);
  assert.deepEqual(markerTokensFor('*'),['*']);
  assert.deepEqual(markerTokensFor('6'),['6']);
  assert.deepEqual(markerTokensFor('6*'),['6','*']);
  assert.deepEqual(markerTokensFor('2*'),['2','*']);
  assert.deepEqual(noteIdsForTokens(['2','*']),['note-2','asterisk']);
  assert.deepEqual(noteIdsForTokens(['6','*']),['note-6','asterisk']);
  assert.throws(()=>markerTokensFor('**'),/Unsupported/);
});

test('all 68 source markers, corrective66 aliases and registered current appends retain exact note associations',()=>{
  const result=auditUa26MarkerReceiptWithHCurrentSourceEpoch(markerHPreimageRoot);
  assert.equal(result.ok,true,JSON.stringify(result.failures));
  assert.deepEqual(result.counts,{physicalRows:68,marked:17,unmarked:51,corrective66Aliases:66,currentTargetAppends:2,currentWDAliases:68,explicitMarkerRows:17,baselineWrongSpecificAssignments:2,previouslyUnresolvedNowSourceAdjudicated:3,correctedCatalogs:5,checkedCatalogs:65});
  assert.equal(result.sourceMarkerCensusSha256,'28573d886140523dafd6b2a21060932751a72b090773371ecbb4807942ecc2b0');
  const receipt=read('research/source-audit-batch5-ua26-marker-correction.json');
  const sourceMarkers=receipt.sourceMarkerCensus.filter(row=>row.sourceMarkerRaw!==null);
  assert.deepEqual(sourceMarkers.map(row=>[row.ordinal,row.label,row.sourceMarkerRaw,row.sourceMarkerTokens,row.expectedSpecificNoteIds]),[
    [8,'Bill-Guisarme','6',['6'],['note-6']],
    [19,'Fork, Military','*',['*'],['asterisk']],
    [21,'Glaive','6*',['6','*'],['note-6','asterisk']],
    [22,'Glaive-Guisarme','*',['*'],['asterisk']],
    [23,'Guisarme','6',['6'],['note-6']],
    [24,'Guisarme-Voulge','6',['6'],['note-6']],
    [30,'Javelin','*',['*'],['asterisk']],
    [33,'Lance (light horse)','1',['1'],['note-1']],
    [34,'Lance (medium horse)','1',['1'],['note-1']],
    [35,'Lance (heavy horse)','1',['1'],['note-1']],
    [40,'Morning Star','6',['6'],['note-6']],
    [41,'Partisan','6',['6'],['note-6']],
    [48,'Ranseur','6',['6'],['note-6']],
    [50,'Scimitar','6',['6'],['note-6']],
    [53,'Spear','2*',['2','*'],['note-2','asterisk']],
    [54,'Spetum','6',['6'],['note-6']],
    [64,'Sword, Short','3',['3'],['note-3']],
  ]);
  assert.equal(receipt.sourceMarkerCensus.filter(row=>row.sourceMarkerRaw===null).length,51);
  assert.equal(receipt.sourceReview.sourceMarkerCensusRows,68);
  assert.equal(receipt.sourceReview.additionalOriginalPdfVisualRecheck.all68TokensCompared,true);
  const asterisk=receipt.noteDefinitions.find(note=>note.id==='asterisk');
  const double=receipt.noteDefinitions.find(note=>note.id==='double-asterisk');
  assert.equal(asterisk.marker,'*');
  assert.match(asterisk.printedText,/^\* These weapons/,'corrected literal text for the one-star line');
  assert.match(double.printedText,/^\*\* These weapons/,'the separate dismount line begins with two stars');
  const markerReview=read('research/source-audit-batch5-ua26-marker-independent-review.json');
  assert.equal(markerReview.correctionReceipt.sha256,sha(readBeforeJoFile('research/source-audit-batch5-ua26-marker-correction.json')));
  assert.equal(markerReview.summary.independentlyRecheckedOriginalMarkerRows,68);
  assert.equal(markerReview.summary.remainingNoteAssociationBlockers,0);
  assert.equal(markerReview.summary.fieldValuesPromoted,0);
});

test('current hand-quarrel owner is an explicit post-correction append with its original price proof intact',()=>{
  const append=read('research/source-audit-batch5-ua26-current-row-append.json');
  const catalog=read('dist/scans/verified/equipment-ua-quarrels-for-same.json');
  assert.equal(append.delta.originalAliasUniverseBefore,66);
  assert.equal(append.delta.originalAliasUniversePreserved,true);
  assert.equal(append.delta.currentWeightDamageTargetAliasesAfter,67);
  assert.equal(append.delta.physicalSourceRowsBefore,68);
  assert.equal(append.delta.physicalSourceRowsAfter,68);
  assert.equal(append.row.previousBaselineDisposition,'confirmed-source-row-no-equipment-target');
  assert.equal(append.row.currentDisposition,'confirmed-context-owner-current-only');
  assert.equal(append.currentDataSnapshot.itemId,'ua-quarrels-for-same');
  assert.equal(append.currentDataSnapshot.quantityField,'Not stated in the UA p.26 Arms table');
  assert.equal(append.row.catalog.beforeRegionCount,1);
  assert.equal(append.row.catalog.afterRegionCount,3);
  assert.equal(append.row.catalog.existingPriceRegion.exactObjectPreserved,true);
  assert.deepEqual(catalog.regions.map(region=>region.id),[
    'ua26-quarrels-for-same-price',
    'ua-26-wd-row-1a39b6171f135317',
    'ua26-notes-45-ua-quarrels-for-same',
  ]);
  const row=catalog.regions[1],notes=catalog.regions[2];
  assert.equal(row.sourceRowId,append.row.sourceRowId);
  assert.equal(row.role,'row');
  assert.equal(row.sha256,'9e9c6750d95af0181d01d52138e1f773f951b46fae6d75a719b7f0caa1cb3162');
  assert.equal(notes.sourceRowId,row.sourceRowId);
  assert.equal(notes.contextForRegionId,row.id);
  assert.deepEqual(notes.noteAssociation,{marker:null,assignmentStatus:'no-printed-row-marker',specificNoteId:null,specificNoteText:null,generalNoteId:'general-note',specificNoteIds:[],specificNoteTexts:[]});
  assert.equal(append.row.continuationGroupProposal.sourceValueScope.fieldsPromoted,0);
  assert.equal(append.row.continuationGroupProposal.sourceValueScope.priceOrQuantityChanged,false);
  assert.equal(append.row.continuationGroupProposal.sourceValueScope.perQuarrelPriceInferred,false);
  assert.equal(append.row.continuationGroupProposal.sourceValueScope.launcherStatisticsAssigned,false);
  const review=read('research/source-audit-batch5-ua26-hand-quarrel-independent-review.json');
  assert.equal(review.receipt.sha256,sha(readBeforeJoFile('research/source-audit-batch5-ua26-current-row-append.json')));
  assert.equal(review.summary.oldPriceCatalogPrefixPreserved,true);
  assert.equal(review.summary.fieldValuesPromoted,0);
  assert.equal(review.summary.quantityInferred,false);
});

