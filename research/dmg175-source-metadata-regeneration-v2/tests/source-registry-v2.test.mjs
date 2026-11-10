import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildSupplementalCropRegistryFromCatalogs,
  buildClosedSupplementalCropRegistry,
  makeBridgeSuccessor,
  validateBridgeSuccessor,
  LEGACY_CROP_TUPLES,
  FD13_STABLE_REGION,
} from '../implementation/source-registry-v2.mjs';

const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const readJson=relative=>JSON.parse(fs.readFileSync(path.join(ROOT,relative),'utf8'));
const pinDoc=readJson('inputs/catalog-source-pins-v1.json');
const catalogRows=new Map();
for(const pin of pinDoc.catalogs){
  catalogRows.set(pin.catalogPath,readJson(`inputs/catalogs/${path.basename(pin.catalogPath)}`));
}
const catalogPins=Object.fromEntries(pinDoc.catalogs.map(row=>[row.catalogPath,row.sha256]));
const cloneCatalogs=()=>new Map([...catalogRows].map(([key,value])=>[key,structuredClone(value)]));
const levelsPath='scans/verified/rules-appendix-c-character-levels.json';
const region=(catalogs,id)=>[...catalogs.values()].flatMap(c=>c.regions.map(r=>({c,r}))).find(x=>x.r.id===id);

test('closed p.175 registry keeps the two legacy tuples and the final fd13 stable-ID mapping',()=>{
  const registry=buildClosedSupplementalCropRegistry(ROOT);
  assert.deepEqual(registry.counts,{catalogs:12,uniqueRegionIds:34,distinctCropImageHashes:8,legacyTuplesPreserved:2});
  for(const [id,tuple] of Object.entries(LEGACY_CROP_TUPLES)){
    const row=registry.regions.find(r=>r.regionId===id);
    assert.deepEqual(row.cropBoundsPx,tuple.cropBoundsPx);
    assert.equal(row.imageSha256,tuple.imageSha256);
  }
  const fd13=registry.regions.find(r=>r.regionId===FD13_STABLE_REGION.id);
  assert.deepEqual(fd13.cropBoundsPx,FD13_STABLE_REGION.cropBoundsPx);
  assert.equal(fd13.imageSha256,FD13_STABLE_REGION.imageSha256);
  assert.equal(registry.sourceIdentity.pdfPage,null);
  assert.equal(registry.sourceIdentity.originalPdfContainsPrintedPage,false);
  assert.equal(registry.sourceIdentity.printingStatus,'not-specified');
  assert.equal(Object.hasOwn(registry,'semanticReview'),false);
});

test('catalog mutation negatives reject wrong crop, normalized rectangle, PDF identity, and JPEG source identity',()=>{
  let catalogs=cloneCatalogs();
  region(catalogs,FD13_STABLE_REGION.id).r.sourceCropBoundsPx=[0,1624,650,1760];
  assert.throws(()=>buildSupplementalCropRegistryFromCatalogs(catalogs,catalogPins),/dimensions disagree|normalized image rectangle/);

  catalogs=cloneCatalogs();
  region(catalogs,FD13_STABLE_REGION.id).r.normalizedPageRect.y+=0.01;
  assert.throws(()=>buildSupplementalCropRegistryFromCatalogs(catalogs,catalogPins),/normalized image rectangle/);

  catalogs=cloneCatalogs();
  region(catalogs,FD13_STABLE_REGION.id).r.pdfPage=175;
  assert.throws(()=>buildSupplementalCropRegistryFromCatalogs(catalogs,catalogPins),/separate supplemental-image frame/);

  catalogs=cloneCatalogs();
  catalogs.get(levelsPath).sourceArtifacts['dmg175-user-confirmed-supplement'].sha256='0'.repeat(64);
  assert.throws(()=>buildSupplementalCropRegistryFromCatalogs(catalogs,catalogPins),/source artifact sha256 changed/);
});

test('catalog-universe negatives reject unknown IDs, missing regions, and conflicting repeated identities',()=>{
  let catalogs=cloneCatalogs();
  catalogs.get(levelsPath).regions.find(r=>r.id===FD13_STABLE_REGION.id).id='dmg175-unknown-current-region';
  assert.throws(()=>buildSupplementalCropRegistryFromCatalogs(catalogs,catalogPins),/fd13 crop must be attached/);

  catalogs=cloneCatalogs();
  catalogs.get(levelsPath).regions=catalogs.get(levelsPath).regions.filter(r=>r.id!==FD13_STABLE_REGION.id);
  assert.throws(()=>buildSupplementalCropRegistryFromCatalogs(catalogs,catalogPins),/unexpected p\.175 crop universe|fd13 crop/);

  catalogs=cloneCatalogs();
  const other=catalogs.get('scans/verified/rules-appendix-c-party-size.json');
  const duplicate=structuredClone(region(catalogs,FD13_STABLE_REGION.id).r);
  duplicate.sha256='0'.repeat(64);
  other.regions.push(duplicate);
  assert.throws(()=>buildSupplementalCropRegistryFromCatalogs(catalogs,catalogPins),/conflicting crop identity/);
});

test('source-frame successor changes only the books.js provenance hash and preserves all 9 frames/102 joins',()=>{
  const oldBytes=fs.readFileSync('/workspace/adnd1-next-source-native/research/source-frame-coordinate-bridge-ua-source-v1.json');
  const pins=readJson('inputs/books-source-pin-v1.json');
  const {oldRegistry,next,oldBooksJsSha256}=makeBridgeSuccessor(oldBytes,'1013eb540a2bc9034963472b3b48a9a1ea61af224392806386db1091c5b35a65',pins.sha256);
  assert.equal(oldBooksJsSha256,'804deee6fffd2852bc6326e33046e888c10f8f5224835b29dceb42195a571a4f');
  assert.equal(validateBridgeSuccessor(oldRegistry,next,pins.sha256),true);
  const wrongBooks=structuredClone(next);wrongBooks.provenance.booksJsSha256='0'.repeat(64);
  assert.throws(()=>validateBridgeSuccessor(oldRegistry,wrongBooks,pins.sha256),/books.js pin/);
  const wrongCrop=structuredClone(next);wrongCrop.frames[0].regions[0].imageSha256='0'.repeat(64);
  assert.throws(()=>validateBridgeSuccessor(oldRegistry,wrongCrop,pins.sha256),/beyond books.js/);
  const droppedJoin=structuredClone(next);droppedJoin.frames[0].regions.pop();
  assert.throws(()=>validateBridgeSuccessor(oldRegistry,droppedJoin,pins.sha256),/beyond books.js|denominator/);
});

test('published registry and generated patch are stable identity-only artifacts',()=>{
  const registryBytes=fs.readFileSync(path.join(ROOT,'outputs/dmg175-supplement-crop-registry-v2.json'));
  const registry=JSON.parse(registryBytes);
  assert.equal(sha(registryBytes),sha(Buffer.from(`${JSON.stringify(buildClosedSupplementalCropRegistry(ROOT),null,2)}\n`)));
  assert.equal(registry.regions.length,34);
  const cropMap=fs.readFileSync(path.join(ROOT,'outputs/generated-supplemental-crop-map-v2.py.txt'),'utf8');
  assert.equal((cropMap.match(/"dmg/g)||[]).length,34);
  assert.match(cropMap,new RegExp(FD13_STABLE_REGION.imageSha256));
  assert.doesNotMatch(cropMap,/old07/i);
});

test('V2 manifest excludes runtime bytecode and preserves the frozen V1 cache limitation',()=>{
  const manifest=readJson('manifest-v2.json');
  const v1Bytes=fs.readFileSync(path.join(ROOT,'inputs/v1-manifest-cache-limitation.json'));
  const cacheEvidence=readJson('inputs/v1-cache-limitation-evidence-v1.json');
  assert.equal(sha(v1Bytes),manifest.v1CacheLimitation.manifestSha256);
  assert.equal(manifest.files.length,35);
  assert.equal(manifest.v1CacheLimitation.declaredFiles,37);
  assert.equal(manifest.v1CacheLimitation.excludedRuntimeCacheFiles,2);
  assert.equal(cacheEvidence.runtimeCacheEntryCount,2);
  assert.ok(cacheEvidence.runtimeCacheEntries.every(row=>row.matchesManifest===false));
  assert.ok(manifest.files.every(row=>!row.path.includes('__pycache__')&&!row.path.endsWith('.pyc')));
  const py=fs.readFileSync(path.join(ROOT,'outputs/source_frame_coordinate_bridge-dmg175-v2.py'),'utf8');
  const js=fs.readFileSync(path.join(ROOT,'outputs/source-frame-coordinate-bridge-dmg175-v2.mjs'),'utf8');
  assert.match(py,/REGISTRY_RELATIVE_PATH = 'research\/source-frame-coordinate-bridge-dmg175-source-v1\.json'/);
  assert.match(js,/SOURCE_FRAME_BRIDGE_PATH = 'research\/source-frame-coordinate-bridge-dmg175-source-v1\.json'/);
});
