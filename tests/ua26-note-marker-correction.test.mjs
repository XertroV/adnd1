import {readBeforeJoFile} from './helpers/ua-source-batch6-jo-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditUa26MarkerReceipt,markerTokensFor,noteIdsForTokens} from '../tools/ua26-note-marker-audit.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(readBeforeJoFile(path.join(root,rel),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

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
  const result=auditUa26MarkerReceipt(root);
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

