#!/usr/bin/env python3
"""Read-only replay of the exact citation/crop input phase from Git.

The optional source directory is private. This diagnostic reports identities;
it changes no registry, source, review, producer mode or current CI policy.
"""
from pathlib import Path
import argparse, collections, hashlib, importlib.util, json, re, struct
import subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
BEFORE = '4aa977788085f67a28a24d40965edf987bc7242b'
DATA_SHA = 'cf6dd7ff912b91fd4525e1d48355e8c21e766e73f2118820e926a96b62f5216f'
BOOKS_SHA = '804deee6fffd2852bc6326e33046e888c10f8f5224835b29dceb42195a571a4f'
REGISTRY = 'research/source-frame-coordinate-bridge-phb-source-v1.json'
REGISTRY_SHA = 'a756ac336f14491aa6785615c869a6a9ed8b1cc1632773e468c72e327fa8b1bd'
GUARD = 'research/source_frame_coordinate_bridge.py'
GUARD_SHA = '09c4f801e00ff5b0c110d0fbdbaba2adef89c941bd7b0ac937cce3bcce58becc'
PRICE_GUARD_SHA = '109fe4d7d33226bf541cfca1894c298fc928de4399aea2c977565c290e8f5b9d'

def sha(raw): return hashlib.sha256(raw).hexdigest()
def canonical(value): return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)
def git(ref, name): return subprocess.check_output(['git', 'show', f'{ref}:{name}'], cwd=ROOT)
def owner(data, row):
    return data['progressionExplainer'] if row['collection'] == 'progressionExplainer' else next(x for x in data[row['collection']] if x['id'] == row['itemId'])

def replay(after_ref, source_dir=None):
    assert re.fullmatch('[0-9a-f]{40}', after_ref), 'full exact Git input commit required'
    assert subprocess.check_output(['git', 'rev-parse', f'{after_ref}^{{commit}}'], cwd=ROOT).decode().strip() == after_ref
    before = json.loads(git(BEFORE, 'dist/data.json'))
    after_raw = git(after_ref, 'dist/data.json'); assert sha(after_raw) == DATA_SHA
    after = json.loads(after_raw)
    registry_raw = git(after_ref, REGISTRY)
    assert registry_raw == git(BEFORE, REGISTRY) and sha(registry_raw) == REGISTRY_SHA
    registry = json.loads(registry_raw)
    assert registry['counts'] == {'frameGroups':9, 'physicalPdfPages':7, 'regionBindings':102, 'ownerBindings':102}
    books = git(after_ref, 'dist/books.js'); assert books == git(BEFORE, 'dist/books.js') and sha(books) == BOOKS_SHA
    guard = git(after_ref, GUARD); assert guard == git(BEFORE, GUARD) and sha(guard) == GUARD_SHA
    assert sha(git(after_ref, 'tools/price-source-inventory.mjs')) == PRICE_GUARD_SHA
    raw_source_paths = ['classes.json','phb-spells.json','phb-magic-user-extra.json','phb-spell-index.json','ua-spells.json','rules.json','equipment.json','progression-overrides.json','dist/app.js']
    assert all(git(after_ref, p) == git(BEFORE, p) for p in raw_source_paths)
    checked_rows = 0; image_paths = set(); sources = []; pdfs = {}
    with tempfile.TemporaryDirectory(prefix='citation-input-replay-') as temporary:
        temp = Path(temporary)
        def stage(name, raw):
            target = temp / name; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(raw)
        stage(REGISTRY, registry_raw); stage(GUARD, guard); stage('dist/books.js', books); stage('dist/data.json', after_raw)
        for name, expected in registry['provenance']['catalogHashes'].items():
            raw = git(after_ref, 'dist/' + name)
            assert raw == git(BEFORE, 'dist/' + name) and sha(raw) == expected
            stage('dist/' + name, raw)
        for frame in registry['frames']:
            for row in frame['regions']:
                old_link = owner(before, row['owner'])[row['owner']['binding']]
                new_link = owner(after, row['owner'])[row['owner']['binding']]
                assert old_link == new_link and sha(canonical(new_link).encode()) == row['ownerSourceLinkSha256']
                image_path = str(Path('dist') / Path(row['catalog']).parent / row['image'])
                image = git(after_ref, image_path)
                assert image == git(BEFORE, image_path) and sha(image) == row['imageSha256']
                assert list(struct.unpack('>II', image[16:24])) == row['imageDimensionsPx']
                stage(image_path, image); image_paths.add(image_path); checked_rows += 1
        if source_dir is not None:
            import fitz
            for book, source in registry['provenance']['sourcePdfs'].items():
                path = Path(source_dir) / source['fileName']; assert sha(path.read_bytes()) == source['sha256']
                sources.append({'book':book, 'sha256':source['sha256'], 'actualPrivatePdfBytesMatch':True})
                pdfs[book] = fitz.open(path)
        try:
            spec = importlib.util.spec_from_file_location('frozen_citation_frame_guard', temp / GUARD)
            module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
            validated = module.validate_live_registry(after, temp/'dist',
                {x['book']:x['sha256'] for x in sources} if source_dir is not None else None,
                pdfs if source_dir is not None else None)
            assert validated['status'] == 'current-pins-match' and validated['mismatchCount'] == 0
        finally:
            for pdf in pdfs.values(): pdf.close()
    assert checked_rows == 102 and len(image_paths) == 9
    old_mechanics = json.loads(git(BEFORE, 'research/mechanics-audit-progress.json'))
    new_mechanics = json.loads(git(after_ref, 'research/mechanics-audit-progress.json'))
    assert len(new_mechanics['reviewRecords']) == 1210
    new_mechanics['input']['sha256'] = old_mechanics['input']['sha256']; assert new_mechanics == old_mechanics
    old_inventory = json.loads(git(BEFORE, 'research/price-source-inventory.json'))
    new_inventory = json.loads(git(after_ref, 'research/price-source-inventory.json'))
    key = lambda b: tuple(b.get(k) for k in ['collection','itemId','fieldPointer','sourceObjectPointer','sourceCategory','book','printedPage'])
    old_map = collections.defaultdict(list); new_map = collections.defaultdict(list)
    for binding in old_inventory['fieldEvidenceBindings']: old_map[key(binding)].append(binding)
    for binding in new_inventory['fieldEvidenceBindings']: new_map[key(binding)].append(binding)
    assert len(old_inventory['fieldEvidenceBindings']) == len(new_inventory['fieldEvidenceBindings']) == 4574
    assert old_map.keys() == new_map.keys()
    changed = {k for k in old_map if old_map[k] != new_map[k]}
    assert len(changed) == 29 and all(k[0]=='equipment' and k[4:] == ('equipment-field','DMG',225) for k in changed)
    assert [b for b in old_inventory['fieldEvidenceBindings'] if key(b) not in changed] == [b for b in new_inventory['fieldEvidenceBindings'] if key(b) not in changed]
    assert all(new_map[k][0]['sourceValueStatus'] == 'not-assessed-by-field-target-review' for k in changed)
    return {'schemaVersion':1,'artifactType':'portable-frozen-citation-source-input-replay','beforeCommit':BEFORE,'afterInputCommit':after_ref,
        'afterDataSha256':DATA_SHA,'registrySha256':REGISTRY_SHA,'frozenGuardSha256':GUARD_SHA,'frameGroups':9,'physicalFramePages':7,
        'ownerJoinsValidated':checked_rows,'recordedCatalogs':17,'registeredPngs':len(image_paths),'liveFrameValidation':validated,
        'privateSourcePdfsReplayed':sources,'sourcePdfsNotReplayed':source_dir is None,'registryOrFrameProducerChanged':False,
        'mechanicsReviewsExact':1210,'mechanicsCountsAndGradesExact':True,'canonicalFieldReferences':4574,
        'exactDmg225LocationTargetsChanged':29,'otherFullBindingObjectsAndRelativeOrderExact':4545,
        'numericOrMechanicsGradePromoted':False,'newFrameOr103rdJoin':False,
        'meaning':'Read-only identity replay from exact Git bytes. Does not substitute for current coverage/CI/source review or recover six unknown historical crop recipes.'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--after-ref', required=True); parser.add_argument('--source-dir'); parser.add_argument('--output', required=True)
    args = parser.parse_args(); report = replay(args.after_ref, args.source_dir)
    output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, sort_keys=True, indent=2) + '\n')
    print(json.dumps({'output':str(output),'sha256':sha(output.read_bytes()),'frameGroups':9,'ownerJoins':102,'canonicalTargets':29}))
