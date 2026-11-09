"""Calibration tests for v10 scale intervals and Page.rect/MediaBox frames."""
import importlib.util
import unittest
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "source_frame_candidate_resolver_v10",
    ROOT / "tools/source-frame-candidate-resolver-v10.py",
)
V10 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V10)


class SourceFrameCandidateResolverV10Tests(unittest.TestCase):
    def test_axis_interval_records_open_lower_and_closed_upper_two_pixel_window(self):
        result = V10.axis_scale_interval(100, 50)
        self.assertEqual(result["status"], "nonempty")
        self.assertEqual(result["lowerExclusive"], 1.96)
        self.assertEqual(result["upperInclusive"], 2.0)
        self.assertEqual(V10.axis_scale_interval(1, 0)["status"], "invalid-zero-length")

    def test_width_height_intersection_and_finite_rational_candidates(self):
        clip = fitz.Rect(0, 0, 267.5, 113)
        interval = V10.scale_interval(536, 226, clip)
        self.assertEqual(interval["status"], "nonempty-width-height-intersection")
        candidates = V10.rational_candidates(interval)
        scales = [row["scale"] for row in candidates]
        self.assertIn(2.0, scales)
        self.assertTrue(all(interval["lowerExclusive"] < x <= interval["upperInclusive"] for x in scales))
        self.assertTrue(all(row["denominator"] <= 1000 for row in candidates))

    def test_thousandth_step_is_included_only_when_inside_derived_interval(self):
        interval = V10.scale_interval(536, 226, fitz.Rect(0, 0, 267.50132084, 113.00030518))
        scales = {row["fraction"] for row in V10.rational_candidates(interval)}
        self.assertIn("1999/1000", scales)
        self.assertNotIn("2/1", scales)

    def test_empty_width_height_intersection_is_preserved(self):
        result = V10.scale_interval(100, 20, fitz.Rect(0, 0, 50, 20))
        self.assertEqual(result["status"], "empty-width-height-intersection")
        self.assertEqual(V10.rational_candidates(result), [])

    def test_distinct_mediabox_hypothesis_maps_through_cropbox(self):
        doc = fitz.open("/workspace/vault-audit-private/sources/tsr2010-players-handbook.pdf")
        page = doc[99]
        norm = (0.015, 0.809456, 0.475, 0.14635)
        frames = V10.frame_hypotheses(page, norm)
        self.assertEqual(len(frames), 2)
        self.assertEqual(frames[0]["frameName"], "Page.rect/CropBox")
        media = frames[1]
        self.assertGreater(media["sourceFrameBounds"][1], 0)
        self.assertLess(media["sourceFrameBounds"][1], media["sourceFrameBounds"][3])
        self.assertAlmostEqual(media["pageCoordinateBounds"][0], 3.365, places=2)
        self.assertAlmostEqual(media["pageCoordinateBounds"][1], 625.4, places=1)
        self.assertLess(media["pageCoordinateBounds"][0], page.rect.width)
        doc.close()

    def test_equal_boxes_do_not_duplicate_media_hypothesis(self):
        doc = fitz.open("/workspace/vault-audit-private/sources/Unearthed Arcana.pdf")
        page = doc[46]
        frames = V10.frame_hypotheses(page, (0.00836, 0.03445, 0.48662, 0.04871))
        self.assertEqual(len(frames), 1)
        doc.close()

    def test_actual_v9_mm_calibration_recipe_still_replays_exact_pixels(self):
        doc = fitz.open("/workspace/vault-audit-private/sources/Monster_Manual.pdf")
        page = doc[54]
        norm = (0.01, 0.46, 0.98, 0.52)
        clip = V10.frame_hypotheses(page, norm)[0]["pageCoordinateBounds"]
        pix = V10.render_candidate(page, fitz.Rect(*clip), 2.2)
        target = Image.open("/workspace/adnd1-semantic-audit/dist/scans/verified/mm-54-e646ad924b9182a5.png").convert("RGB")
        self.assertEqual((pix.width, pix.height), target.size)
        self.assertEqual(pix.samples, target.tobytes())
        doc.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
