#!/usr/bin/env python3
"""Build only the exact PHB content input successor of the nine-frame registry."""
from pathlib import Path
import argparse, copy, hashlib, json, struct, subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = 'ae7f02c6a5aac9ac8da1f7bc5cf5152e422fcd58'
PARENT = 'research/source-frame-coordinate-bridge.json'
PARENT_SHA = '2899f53a9cfa1741d9fd9aed3c47ada0eb3a80fc842352c8c64deb3869986318'
OUTPUT = 'research/source-frame-coordinate-bridge-phb-source-v1.json'
PROOF = 'research/source-frame-input-migration-phb-source-v1.json'
PROOF_SHA = '4c141187e0c68e1fd363b5a75230cac3ee42669f69b05d4bf3781877819e92dd'
DATA_SHA = '416ebc32862105042904e40280034772a51640d1ccbba298b9b8bf5ccbf709fe'
BOOKS_SHA = '804deee6fffd2852bc6326e33046e888c10f8f5224835b29dceb42195a571a4f'
OVERVIEW_REVIEW = 'research/source-audit-pass8-source-overview-root-independent-review.json'
OVERVIEW_SHA = 'ced08d4124b098979153f77df4941f4e3ad6fb8bbe18338d2440f3fc945e9813'

def sha(raw): return hashlib.sha256(raw).hexdigest()
def read(path): return (ROOT / path).read_bytes()
def git(path): return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=ROOT)
def canonical(value): return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)
def owner(data, key):
    if key['collection'] == 'progressionExplainer': return data['progressionExplainer']
    return next(item for item in data[key['collection']] if item['id'] == key['itemId'])

def build():
    parent_raw = read(PARENT)
    assert sha(parent_raw) == PARENT_SHA and parent_raw == git(PARENT)
    assert sha(read(PROOF)) == PROOF_SHA
    assert sha(read(OVERVIEW_REVIEW)) == OVERVIEW_SHA
    assert sha(read('dist/data.json')) == DATA_SHA
    assert sha(read('dist/books.js')) == BOOKS_SHA
    parent = json.loads(parent_raw)
    assert parent['counts'] == {'frameGroups': 9, 'physicalPdfPages': 7, 'regionBindings': 102, 'ownerBindings': 102}
    before, after = json.loads(git('dist/data.json')), json.loads(read('dist/data.json'))
    proof = json.loads(read(PROOF))
    assert proof['baseCommit'] == BASE and proof['afterDataSha256'] == DATA_SHA and proof['afterBooksSha256'] == BOOKS_SHA
    assert proof['oldStrictGuardResult']['mismatches'] == [{'frameId': None, 'fields': ['booksJsSha256']}]
    assert len(proof['ownerRows']) == 102 and proof['newThiefFrameOr103rdJoin'] is False
    for path, expected in parent['provenance']['catalogHashes'].items():
        raw = read('dist/' + path)
        assert raw == git('dist/' + path) and sha(raw) == expected, path
    cases = []
    for frame in parent['frames']:
        for row in frame['regions']:
            old_link, new_link = owner(before, row['owner'])[row['owner']['binding']], owner(after, row['owner'])[row['owner']['binding']]
            assert old_link == new_link and sha(canonical(new_link).encode()) == row['ownerSourceLinkSha256']
            raw = read('dist/' + row['catalog'])
            assert sha(raw) == row['catalogSha256']
            catalog = json.loads(raw)
            region = next(item for item in catalog['regions'] if item['id'] == row['regionId'])
            image = read(str(Path('dist') / Path(row['catalog']).parent / row['image']))
            assert sha(image) == row['imageSha256'] and list(struct.unpack('>II', image[16:24])) == row['imageDimensionsPx']
            cases.append({'catalog': catalog, 'region': region})
    assert len(cases) == 102
    # Run the exact old/new resolver code in separate contexts. Only known,
    # hash-pinned book modules are evaluated; no caller policy/root is accepted.
    program = """const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const x=JSON.parse(readFileSync(0,'utf8'));function load(src){const m={exports:{}};vm.runInNewContext(src,{module:m});return m.exports;}const a=load(x.before),b=load(x.after);for(const c of x.cases){const old=a.resolveRegionSourceIdentity(c.catalog,c.region),now=b.resolveRegionSourceIdentity(c.catalog,c.region);assert.equal(old.valid,true);assert.deepEqual(JSON.parse(JSON.stringify(now)),JSON.parse(JSON.stringify(old)));}assert.equal(b.evidenceAvailability('DMG',175),'supplemental');assert.equal(b.availability('DMG',175),'missing');assert.equal(b.pdfPage('DMG',175),null);console.log(x.cases.length);"""
    result = subprocess.check_output(['node', '-e', program], input=json.dumps({'before': git('dist/books.js').decode(), 'after': read('dist/books.js').decode(), 'cases': cases}).encode(), cwd=ROOT)
    assert result.strip() == b'102'
    successor = copy.deepcopy(parent)
    successor['provenance']['implementationBaseCommit'] = BASE
    successor['provenance']['dataSha256AtRegistryBuild'] = DATA_SHA
    successor['provenance']['booksJsSha256'] = BOOKS_SHA
    successor['provenance']['phbSourceInputMigration'] = {
        'parentRegistry': {'path': PARENT, 'sha256': PARENT_SHA},
        'proof': {'path': PROOF, 'sha256': PROOF_SHA},
        'sourceOverviewReview': {'path': OVERVIEW_REVIEW, 'sha256': OVERVIEW_SHA},
        'changedExistingFields': ['implementationBaseCommit', 'dataSha256AtRegistryBuild', 'booksJsSha256'],
        'allFrameDefinitionsAnd102RowsExact': True,
        'geometrySourceImagesAndOwnerLinksChanged': False,
        'newFrameOrOwnerJoinApproval': False,
        'scope': 'Current input identity migration only. Original nine-frame geometry, source, image, focus, review and owner-link evidence remains exact; no semantic or field-target grade is promoted.'
    }
    assert successor['frames'] == parent['frames'] and successor['counts'] == parent['counts']
    restored = copy.deepcopy(successor)
    restored['provenance'].pop('phbSourceInputMigration')
    for key in ('implementationBaseCommit', 'dataSha256AtRegistryBuild', 'booksJsSha256'):
        restored['provenance'][key] = parent['provenance'][key]
    assert restored == parent
    return (json.dumps(successor, ensure_ascii=False, indent=2) + '\n').encode()

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--write', action='store_true')
    p.add_argument('--check', action='store_true')
    a = p.parse_args()
    if a.write == a.check: p.error('choose exactly one of --write or --check')
    raw = build()
    output = ROOT / OUTPUT
    if a.write:
        if output.exists(): assert output.read_bytes() == raw, 'immutable successor already exists with different bytes'
        else: output.write_bytes(raw)
    else: assert output.read_bytes() == raw, 'successor differs from its exact deterministic input migration'
    print(json.dumps({'path': OUTPUT, 'sha256': sha(raw), 'sizeBytes': len(raw), 'frameGroups': 9, 'ownerJoins': 102, 'all17RecordedCatalogHashesExact': True, 'all102ResolverIdentitiesExact': True}))

if __name__ == '__main__': main()
