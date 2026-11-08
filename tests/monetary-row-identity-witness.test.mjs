import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {hash} from '../tools/monetary-row-identity-audit.mjs';
import {expectedMoneyValues,geometryInPdfTextFrame,witnessGeometry} from '../tools/monetary-row-identity-witness.mjs';
const page={width:600,height:800,cropBox:[0,0,600,800],mediaBox:[0,0,600,800],cropPosition:[0,0],words:[]};
const geometry={space:'pdf-page-points',bounds:[0,0,200,100]};
const word=(text,x=1,y=1)=>[x,y,x+10,y+10,text,0,0,0];

test('monetary expected values exclude poison damage, onset, capacity and level keys',()=>{
 assert.deepEqual(expectedMoneyValues({typedValue:{currency:'gp',amountPerDose:5,damageIfSave:'10 hp',damageIfNoSave:20,onset:'2-8 rounds',capacity:40,level:9}},'phb-dmg-supplement-row'),[{amount:5,currency:'gp'}]);
 assert.deepEqual(expectedMoneyValues({values:{gpSaleValue:{kind:'exact',amount:1000,currency:'gp'},xpValue:{amount:200,currency:'xp'}}},'ua-supplement-row'),[{amount:1000,currency:'gp'},{amount:200,currency:'xp'}]);
 assert.deepEqual(expectedMoneyValues({typedValue:{currency:'gp',amountsByVictimLevelBand:{'1-2':100,'3-4':150}}},'phb-dmg-supplement-row'),[{amount:100,currency:'gp'},{amount:150,currency:'gp'}]);
});

test('DMG media-render conversion accounts for CropBox origin and ambiguous point claims stay unknown',()=>{
 const dmg={...page,width:580.56,height:770.4,cropBox:[1.44,3.6,582,774],mediaBox:[0,0,591.36,792],cropPosition:[1.44,3.6]};
 assert.equal(geometryInPdfTextFrame(geometry,dmg).status,'ambiguous-pdf-point-frame');
 const mapped=geometryInPdfTextFrame({space:'rendered-page-pixels',bounds:[600,1170,1210,1580],derivation:{renderDpi:150,sourceRenderDimensionsPx:[1232,1650]}},dmg);
 assert.equal(mapped.method,'declared-dpi-media-render-minus-crop-origin');assert.ok(mapped.bounds.every((v,i)=>Math.abs(v-[286.56,558,579.36,754.8][i])<1e-8));
 assert.equal(geometryInPdfTextFrame({space:'rendered-page-pixels',bounds:[1,2,3,4]},dmg).status,'render-frame-metadata-unavailable');
});

test('own amount and label inside an overbroad band never grant a semantic pass',()=>{
 const words=[word('Bronze',1,1),word('Plate',20,1),word('Mail',40,1),word('400',60,1),word('Chain',1,30),word('Mail',20,30),word('75',40,30)];
 const result=witnessGeometry({geometry,page:{...page,words},printedLabel:'Bronze Plate Mail',expectedValues:[{currency:'gp',amount:400}],foreignRows:[{uid:'chain',label:'Chain Mail',expectedValues:[{currency:'gp',amount:75}]}]});
 assert.equal(result.printedLabelPresent,true);assert.equal(result.expectedValues[0].presentAsNumberSomewhere,true);assert.equal(result.semanticPass,false);assert.equal(result.foreignRowMatches[0].uid,'chain');
 assert.ok(result.candidates.includes('other-declared-row-label-present-candidate'));
});

test('short row names inside longer row names do not create false foreign rows',()=>{
 const words=[word('Bronze',1),word('Plate',20),word('Mail',40),word('1,000,000',60)];
 const result=witnessGeometry({geometry,page:{...page,words},printedLabel:'Bronze Plate Mail',expectedValues:[{amount:1000000,currency:'gp'}],foreignRows:[{uid:'plate',label:'Plate Mail'}]});
 assert.equal(result.foreignRowMatches.length,0);assert.equal(result.expectedValues[0].presentAsNumberSomewhere,true);assert.equal(result.semanticPass,false);
 const wrong=witnessGeometry({geometry,page:{...page,words},printedLabel:'Plate Mail',foreignRows:[{uid:'bronze',label:'Bronze Plate Mail'}]});assert.equal(wrong.foreignRowMatches[0].uid,'bronze');assert.equal(wrong.printedLabelPresent,false);assert.ok(wrong.candidates.includes('declared-printed-label-absent-candidate'));assert.equal(wrong.semanticPass,false);
});

test('missing amounts and text-box crossings are candidates and sanitized output contains no word text',()=>{
 const result=witnessGeometry({geometry,page:{...page,words:[word('PRIVATE_SENTINEL',199,95)]},expectedValues:[{amount:5,currency:'gp'}]});
 assert.ok(result.candidates.includes('expected-number-absent-candidate'));assert.ok(result.candidates.includes('text-box-crossing-candidate'));assert.equal(result.crossingWordBoxCount,1);assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL'));
});

test('offline sanitized whole-body snapshot is hash-bound and catches known wrong foci without private PDF CI access',()=>{
 const meta=JSON.parse(readFileSync(new URL('../research/source-audit-batch5-monetary-row-identity-witness-before.json',import.meta.url))),compressed=readFileSync(new URL('../'+meta.snapshot.path,import.meta.url)),bytes=gunzipSync(compressed),report=JSON.parse(bytes);assert.equal(hash(compressed),meta.snapshot.sha256);assert.equal(hash(bytes),meta.snapshot.uncompressedSha256);assert.equal(report.counts.records,2161);assert.equal(report.counts.geometries,3097);assert.equal(report.counts.geometryMapping.mapped,1522);assert.equal(report.counts.witnessStatus.unassessed,1575);assert.equal(report.semanticRowIdentityComplete,false);assert.ok(report.records.every(r=>r.semanticPass===false&&r.geometry.every(g=>g.semanticPass===false)));
 const poison=report.records.filter(r=>/^phb-dmg-supplement-row:dmg-poison-(?:ingestive|insinuative)-/.test(r.uid));assert.equal(poison.length,9);assert.ok(poison.every(r=>r.geometry.some(g=>g.candidates?.includes('expected-number-absent-candidate'))));
 const armor=report.records.filter(r=>/^ua-supplement-row:ua-other-001-armor-r(?:0[1-9]|1[0-6])$/.test(r.uid));assert.equal(armor.length,16);assert.ok(armor.every(r=>r.geometry.some(g=>g.candidates?.includes('other-declared-row-label-present-candidate'))));assert.ok(!report.records.find(r=>r.uid==='ua-supplement-row:ua-other-001-armor-r17').geometry.some(g=>g.candidates?.includes('other-declared-row-label-present-candidate')));
 assert.ok(report.records.every(r=>r.geometry.every(g=>!Object.hasOwn(g,'words'))));
});
