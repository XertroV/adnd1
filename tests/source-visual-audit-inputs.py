"""Geometry input contract without requiring PDFs or PyMuPDF in CI."""
import importlib.util
from pathlib import Path
import sys
import tempfile
import types
import unittest
import hashlib
import json
from unittest import mock

research = Path(__file__).resolve().parent.parent / 'research'
sys.path.insert(0, str(research))
sys.modules['fitz'] = types.SimpleNamespace()
spec = importlib.util.spec_from_file_location('visual_audit', research / 'source-visual-audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
page = types.SimpleNamespace(width=600, height=800)


class AuditInputTests(unittest.TestCase):
    def test_coordinate_aliases_and_formats(self):
        expected = [60, 160, 240, 480]
        for value in ([.1, .2, .3, .4], [[.1, .2, .3, .4]],
                      {'x': .1, 'y': .2, 'w': .3, 'h': .4},
                      {'x': .1, 'y': .2, 'width': .3, 'height': .4}):
            actual, shape = audit.rect_for({'normalizedPageRect': value}, page)
            for a, b in zip(actual, expected):
                self.assertAlmostEqual(a, b)
            self.assertNotEqual(shape, 'invalid')
        self.assertEqual(audit.rect_for({'boundsPdfPoints': expected}, page), (expected, 'boundsPdfPoints'))

    def test_invalid_geometry_stays_unassessable(self):
        for value in ({'x': .1, 'w': .3, 'h': .4}, [.1, .2, None, .4], [0, 0, float('nan'), 1],
                      [0, 0, 0, 1], [.9, 0, .2, 1], [-.1, 0, 1, 1]):
            self.assertEqual(audit.rect_for({'normalizedPageRect': value}, page), (None, 'invalid'))
        for value in ([0, 0, 601, 800], [0, 0, 600, 0], [0, 0, float('inf'), 800]):
            self.assertEqual(audit.rect_for({'boundsPdfPoints': value}, page), (None, 'invalid'))

    def test_supplemental_image_coordinates_and_source_hashes_are_separate(self):
        source_bytes = b'authorized supplemental source bytes'
        crop_bytes = b'published crop bytes'
        source_sha = hashlib.sha256(source_bytes).hexdigest()
        crop_sha = hashlib.sha256(crop_bytes).hexdigest()
        canonical_pdf_sha = 'a' * 64
        region = {
            'id': 'synthetic-supplement-region', 'book': 'DMG', 'printedPage': 175, 'pdfPage': None,
            'sourceArtifactId': 'dmg175-user-confirmed-supplement',
            'sourceCropBoundsPx': [10, 20, 40, 60],
            'sourceCoordinateSpace': 'supplement-image pixels; top-left origin; LTRB half-open',
            'width': 30, 'height': 40, 'sha256': crop_sha,
            'normalizedPageRect': {'x': .1, 'y': .2, 'width': .3, 'height': .4},
        }
        catalog = {'sources': {'DMG': {'sha256': canonical_pdf_sha}}}
        identity = {
            'valid': True, 'sourceKind': 'supplemental-image',
            'sourceArtifactId': region['sourceArtifactId'], 'sourceSha256': source_sha,
            'canonicalPdfSha256': canonical_pdf_sha, 'sourceDimensionsPx': [100, 100],
            'sourceCropBoundsPx': region['sourceCropBoundsPx'],
            'sourceCoordinateSpace': region['sourceCoordinateSpace'],
        }
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source_dir = root / 'source'; source_dir.mkdir()
            source_path = source_dir / 'dmg175.jpg'; source_path.write_bytes(source_bytes)
            image_path = root / 'crop.png'; image_path.write_bytes(crop_bytes)
            with mock.patch.object(audit, 'supplemental_region_identity', return_value=identity):
                checked = audit.validate_supplemental_region(catalog, region, source_dir, image_path, canonical_pdf_sha)
                self.assertTrue(checked['valid'])
                self.assertTrue(checked['normalizedImageRectMatches'])
                self.assertTrue(checked['sourceArtifactHashMatches'])
                self.assertTrue(checked['imageHashMatches'])
                self.assertEqual(checked['sourcePdfSha256'], canonical_pdf_sha)
                self.assertEqual(checked['sourceSha256'], source_sha)
            region['normalizedPageRect']['y'] = .21
            with mock.patch.object(audit, 'supplemental_region_identity', return_value=identity):
                self.assertFalse(audit.validate_supplemental_region(catalog, region, source_dir, image_path, canonical_pdf_sha)['valid'])
            region['normalizedPageRect']['y'] = .2
            source_path.write_bytes(b'changed source bytes')
            with mock.patch.object(audit, 'supplemental_region_identity', return_value=identity):
                self.assertFalse(audit.validate_supplemental_region(catalog, region, source_dir, image_path, canonical_pdf_sha)['valid'])
            source_path.write_bytes(source_bytes)
            image_path.write_bytes(b'changed crop bytes')
            with mock.patch.object(audit, 'supplemental_region_identity', return_value=identity):
                self.assertFalse(audit.validate_supplemental_region(catalog, region, source_dir, image_path, canonical_pdf_sha)['valid'])

    def test_unknown_supplemental_artifact_is_not_assessable(self):
        catalog = {'sources': {'DMG': {'sha256': 'a' * 64}}, 'sourceArtifacts': {}}
        region = {'sourceArtifactId': 'unrecognized-image', 'book': 'DMG', 'printedPage': 175, 'pdfPage': None}
        identity = audit.supplemental_region_identity(catalog, region)
        self.assertIsNotNone(identity)
        self.assertFalse(identity['valid'])
        self.assertEqual(identity['sourceKind'], 'invalid-source-identity')


if __name__ == '__main__':
    unittest.main()
