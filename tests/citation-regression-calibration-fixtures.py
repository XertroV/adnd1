"""Numeric calibration for recorded crop word-box and omitted-context cases."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'research'))
from crop_geometry import crosses

MANIFEST = json.loads((ROOT / 'research/citation-regression-calibration.json').read_text())


def points_from_normalized_xywh(rect, page_size):
    x, y, width, height = rect
    page_width, page_height = page_size
    return [x * page_width, y * page_height,
            (x + width) * page_width, (y + height) * page_height]


class CitationRegressionCalibration(unittest.TestCase):
    def test_recorded_clipped_words_are_detected_before_and_clear_after_repairs(self):
        for case in MANIFEST['clippingCases']:
            with self.subTest(case=case['id']):
                page = case['sourcePage']
                page_size = [page['widthPt'], page['heightPt']]
                old = case['oldCrop'].get('values')
                if old is None:
                    old = points_from_normalized_xywh(case['oldCrop']['normalizedXywh'], page_size)
                new = case['correctedCrop'].get('values')
                if new is None:
                    new = points_from_normalized_xywh(case['correctedCrop']['normalizedXywh'], page_size)
                self.assertEqual(len(case['sourceTextWordBoxes']),
                                 case.get('expectedOldCrossingCount', len(case['sourceTextWordBoxes'])))
                for box in case['sourceTextWordBoxes']:
                    self.assertEqual(crosses(box, old), case['expectedOldCrossingEdges'])
                    self.assertEqual(crosses(box, new), case['expectedCorrectedCrossingEdges'])

    def test_wholly_omitted_notes_are_invisible_to_edge_crossing_but_recorded_context_fails(self):
        for case in MANIFEST['wholeNoteOmissionCases']:
            with self.subTest(case=case['id']):
                page = case['sourcePage']
                page_size = [page['widthPt'], page['heightPt']]
                note = case['edgeDetectorCalibration'].get('omittedBoxPoints')
                if note is None:
                    note = case['requiredContext']['values']
                baseline = case['baselineArtifactId']
                artifact = next(a for a in MANIFEST['gitBaselineArtifacts'] if a['id'] == baseline)
                r = artifact['normalizedPageRectXywh']
                old = points_from_normalized_xywh([r['x'], r['y'], r['width'], r['height']], page_size)
                self.assertEqual(crosses(note, old), [])
                if case['edgeDetectorCalibration'].get('omittedBoxIsWhollyOutsideBaseline'):
                    separated = (note[2] <= old[0] or note[0] >= old[2]
                                 or note[3] <= old[1] or note[1] >= old[3])
                    self.assertTrue(separated)


if __name__ == '__main__':
    unittest.main()
