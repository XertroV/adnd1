"""Numeric geometry regression; no PDFs, OCR strings, or semantic claims."""
import sys
import unittest
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'research'))
from crop_geometry import crosses


class CropGeometry(unittest.TestCase):
    def test_all_five_ua10_preserved_crop_failures_and_proposals(self):
        fixture = Path(__file__).resolve().parent / 'fixtures/ua10-wordbox-edge-calibration-before.json'
        data = json.loads(fixture.read_text())
        self.assertEqual(len(data['cases']), 5)
        self.assertEqual([len(c['oldWordIntersections']) for c in data['cases']],
                         [26, 18, 26, 14, 45])
        for case in data['cases']:
            def intersections(bounds):
                return [{'wordIndex': i, 'edges': crosses(word, bounds)}
                        for i, word in enumerate(data['wordBoxes']) if crosses(word, bounds)]
            self.assertEqual(intersections(case['oldBoundsPdfPointsTopLeftLTRB']),
                             case['oldWordIntersections'])
            self.assertEqual(intersections(case['proposedBoundsPdfPointsTopLeftLTRB']), [])
        # The zero geometric candidates do not clear source-inherent loss.
        self.assertEqual(sum('fold' in c['sourceInherentDefect'] for c in data['cases']), 2)

    def test_phb51_confirmed_crop_repair_calibration(self):
        # Coordinates from the supplied PHB p.51 PDF text layer and published
        # old/repaired crop bounds. These are a regression sample, not proof of
        # the correctness of the whole excerpt or any other word on the page.
        # Source PDF SHA256: e43e667bad1c2cb093bb28b47f78ec663623b367ae817895bd188bdc3dd4f095
        # Old public image: phb-51-5f5f86d3cf71f766.png
        # Repaired public image: phb-51-a1fa4dbc69e703f9.png
        old = [5.7672, 166.0, 282.5928, 542.0]
        repaired = [5.7672, 166.0, 300.5928, 542.0]
        words = [[276.8, 234.76, 283.31, 243.03],
                 [246.5, 270.76, 283.84, 279.03],
                 [260.6, 342.46, 284.17, 350.73]]
        for word in words:
            self.assertEqual(crosses(word, old), ['right'])
            self.assertEqual(crosses(word, repaired), [])

    def test_all_edges_and_strict_touch(self):
        rect = [10, 20, 30, 40]
        for word, edge in [([9, 25, 11, 27], 'left'),
                           ([29, 25, 31, 27], 'right'),
                           ([15, 19, 17, 21], 'top'),
                           ([15, 39, 17, 41], 'bottom')]:
            self.assertEqual(crosses(word, rect), [edge])
        for word in ([8, 25, 10, 27], [30, 25, 32, 27],
                     [15, 18, 17, 20], [15, 40, 17, 42]):
            self.assertEqual(crosses(word, rect), [])
        self.assertEqual(crosses([9, 19, 11, 21], rect), ['left', 'top'])
        self.assertEqual(crosses([9, 0, 11, 10], rect), [])

    def test_neighbor_and_missing_text_are_not_semantic_verdicts(self):
        rect = [10, 20, 30, 40]
        # An unrelated neighboring label crossing a boundary is still flagged.
        self.assertEqual(crosses([29, 25, 32, 27], rect), ['right'])
        # With no text-layer boxes there can be no candidates, including when
        # visible image text is clipped: absence of candidates proves nothing.
        self.assertEqual([w for w in [] if crosses(w, rect)], [])


if __name__ == '__main__':
    unittest.main()
