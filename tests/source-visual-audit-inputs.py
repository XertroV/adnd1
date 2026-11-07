"""Geometry input contract without requiring PDFs or PyMuPDF in CI."""
import importlib.util
from pathlib import Path
import sys
import types
import unittest

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


if __name__ == '__main__':
    unittest.main()
