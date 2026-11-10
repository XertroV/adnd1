import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACKAGE = Path(__file__).resolve().parents[1]
REGISTRY = json.loads((PACKAGE / 'outputs/dmg175-supplement-crop-registry-v2.json').read_text())
_STAGE = Path(tempfile.mkdtemp(prefix='dmg175-supplemental-identity-test-'))
(_STAGE / 'tools').mkdir(parents=True)
(_STAGE / 'research').mkdir()
shutil.copyfile(PACKAGE / 'outputs/continuation-candidates-dmg175-v2.py', _STAGE / 'tools/continuation-candidates.py')
shutil.copyfile(PACKAGE / 'inputs/code/source_frame_coordinate_bridge-before.py', _STAGE / 'research/source_frame_coordinate_bridge.py')
spec = importlib.util.spec_from_file_location('continuation_candidates_d175_test', _STAGE / 'tools/continuation-candidates.py')
continuation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(continuation)
continuation.ROOT = ROOT

CATALOG_DIR = PACKAGE / 'inputs/catalogs'
CATALOG_PATHS = [row['catalogPath'] for row in json.loads((PACKAGE / 'inputs/catalog-source-pins-v1.json').read_text())['catalogs']]
CATALOGS = {}
for relative in CATALOG_PATHS:
    catalog = json.loads((CATALOG_DIR / Path(relative).name).read_text())
    CATALOGS[relative] = catalog

class SupplementalIdentityMapTests(unittest.TestCase):
    def test_all_34_current_regions_are_valid_supplemental_images_not_pdf_pages(self):
        uses = 0
        for catalog in CATALOGS.values():
            for region in catalog['regions']:
                if region.get('printedPage') != 175:
                    continue
                identity = continuation.supplemental_region_identity(catalog, region)
                self.assertIsNotNone(identity)
                self.assertTrue(identity['valid'], region['id'])
                self.assertEqual(identity['sourceKind'], 'supplemental-image')
                uses += 1
        self.assertGreaterEqual(uses, 34)
        self.assertEqual(len(continuation.DMG175_SUPPLEMENT_CROPS), 34)

    def test_final_fd13_stable_id_uses_the_new_crop_tuple(self):
        row = next(row for row in REGISTRY['regions'] if row['regionId'] == 'dmg175-character-level-left-level-of-characters-paragraph-left-column-portion')
        self.assertEqual(row['cropBoundsPx'], [0, 1625, 650, 1760])
        self.assertEqual(row['imageSha256'], 'fd13f5d51d4f527d8887c31627d39ce224c33ccd810a78bd8b01ba204f8aa3fc')
        self.assertEqual(continuation.DMG175_SUPPLEMENT_CROPS[row['regionId']], (row['cropBoundsPx'], row['imageSha256']))

    def test_wrong_crop_hash_page_identity_unknown_id_and_jpeg_source_fail_closed(self):
        catalog = CATALOGS['scans/verified/rules-appendix-c-character-levels.json']
        original = next(region for region in catalog['regions'] if region.get('printedPage') == 175 and region.get('sourceCropBoundsPx') == [0, 1625, 650, 1760])
        def check(mutator):
            changed_catalog = json.loads(json.dumps(catalog))
            changed_region = next(region for region in changed_catalog['regions'] if region['id'] == original['id'])
            mutator(changed_catalog, changed_region)
            self.assertFalse(continuation.supplemental_region_identity(changed_catalog, changed_region)['valid'])
        check(lambda _catalog, region: region.update(sha256='0'*64))
        check(lambda _catalog, region: region.update(sourceCropBoundsPx=[0, 1624, 650, 1760]))
        check(lambda _catalog, region: region.update(id='dmg175-unknown-region'))
        check(lambda _catalog, region: region.update(pdfPage=175))
        check(lambda catalog, _region: catalog['sourceArtifacts']['dmg175-user-confirmed-supplement'].update(sha256='0'*64))
        check(lambda catalog, _region: catalog['sourceArtifacts']['dmg175-user-confirmed-supplement'].update(printingStatus='known'))

    def test_legacy_two_crop_tuples_remain_exact(self):
        expected = {
            'dmg-175-party-table-context-78c4c383c38c7d10': ([0,1145,635,1635], '78c4c383c38c7d100a9e66bec4f36de1fdb9453d6e44d1eec53120e849a36e89'),
            'dmg-175-level-others-context-5aa02e91e35c4c28': ([670,120,1329,492], '5aa02e91e35c4c28152caccd947096943b74889b8596376cb86cb0c7170291b8'),
        }
        for region_id, pair in expected.items():
            self.assertEqual(continuation.DMG175_SUPPLEMENT_CROPS[region_id], pair)

if __name__ == '__main__':
    unittest.main()
